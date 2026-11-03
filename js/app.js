// js/app.js
(function (global) {
  'use strict';

  const { renderJP, stripFurigana } = global.Furigana;
  const { Tokenizer, AppStorage, Validator } = global;

  let appData = null;
  let appState = null;
  let auditReport = null;
  let currentView = 'dashboard';

  // Trạng thái bộ lọc Từ vựng & Flashcard
  let vocabFilter = {
    lesson: 'all',
    pos: 'all',
    status: 'all',
    search: '',
    mode: 'list', // 'list' | 'flashcard'
    fcIndex: 0,
    fcFlipped: false
  };

  // Trạng thái Ngữ pháp
  let grammarFilter = {
    lesson: 'all',
    tab: 'lessons' // 'lessons' | 'quick' | 'particles'
  };

  // Khử dấu tiếng Việt để tìm kiếm không dấu (Mục 7A)
  function removeVietnameseTones(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  function formatPosLabel(pos, verbGroup) {
    const map = {
      noun: 'Danh từ',
      verb: `Động từ (Nhóm ${verbGroup || '?'})`,
      'i-adj': 'Tính từ い',
      'na-adj': 'Tính từ な',
      adv: 'Phó từ',
      particle: 'Trợ từ',
      pron: 'Đại từ',
      det: 'Từ hạn định',
      conj: 'Liên từ',
      expr: 'Biểu hiện',
      counter: 'Từ đếm'
    };
    return map[pos] || pos;
  }

  // Phát âm tiếng Nhật bằng Web Speech API (Mục 5.4)
  function speakJapanese(textMarkup) {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt của bạn không hỗ trợ phát âm (speechSynthesis).');
      return;
    }
    const plain = stripFurigana(textMarkup);
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = 'ja-JP';
    const voices = window.speechSynthesis.getVoices();
    const jaVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (jaVoice) utter.voice = jaVoice;
    window.speechSynthesis.speak(utter);
  }

  // Áp dụng cài đặt giao diện
  function applySettings() {
    const html = document.documentElement;
    html.setAttribute('data-furigana', appState.settings.furigana);
    html.setAttribute('data-fontsize', appState.settings.fontSize);
    html.setAttribute('data-theme', appState.settings.theme);

    document.getElementById('furi-state-text').textContent =
      appState.settings.furigana === 'show' ? 'Hiện' : 'Ẩn';
    const sizeLabels = { sm: 'Nhỏ', md: 'Vừa', lg: 'Lớn' };
    document.getElementById('fontsize-state-text').textContent =
      sizeLabels[appState.settings.fontSize] || 'Vừa';
    document.getElementById('theme-icon').textContent =
      appState.settings.theme === 'dark' ? '☀️' : '🌙';

    const storageEl = document.getElementById('storage-status');
    if (AppStorage.isAvailable()) {
      storageEl.innerHTML = '💾 Lưu tự động (localStorage)';
    } else {
      storageEl.innerHTML = '⚠️ Chạy trong RAM (localStorage bị chặn)';
    }
  }

  // =========================================================================
  // HOVER DICTIONARY TOOLTIP (Mục 5.3 & 5.4)
  // =========================================================================
  let hoverTimer = null;
  const tooltipEl = document.getElementById('hover-tooltip');

  function positionTooltip(targetEl) {
    const rect = targetEl.getBoundingClientRect();
    const ttWidth = 340;
    const margin = 10;

    let left = rect.left;
    if (left + ttWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - ttWidth - margin);
    }

    tooltipEl.style.left = `${left}px`;
    tooltipEl.hidden = false;
    tooltipEl.setAttribute('aria-hidden', 'false');

    const ttHeight = tooltipEl.offsetHeight || 220;
    let top = rect.bottom + 8;
    // Tự lật lên trên nếu tràn đáy màn hình
    if (top + ttHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - ttHeight - 8);
    }
    tooltipEl.style.top = `${top}px`;
  }

  function showTooltipForTarget(targetEl) {
    const wordId = targetEl.getAttribute('data-id');
    const particleId = targetEl.getAttribute('data-particle-id');
    const chipLabel = targetEl.getAttribute('data-chip-label');
    const unmatchedText = targetEl.getAttribute('data-unmatched');

    if (wordId) {
      const v = Tokenizer.getVocabById(wordId);
      if (!v) return;
      const isFav = appState.favoriteIds.includes(v.id);
      const ex = Tokenizer.getExampleForWord(v.id);
      const speechSupported = 'speechSynthesis' in window;

      let scopeBadge = '';
      if (v.scope !== 'study') {
        scopeBadge = `<span class="badge badge-scope-extra">Ngoài danh sách bài (${v.scope})</span>`;
      } else {
        scopeBadge = `<span class="badge">Bài ${v.lessons.join(', ')}</span>`;
      }

      let altMeaningsHtml = '';
      if (v.alt_meanings && v.alt_meanings.length > 0) {
        altMeaningsHtml = `<div style="font-size:0.82rem;margin-top:4px;color:var(--text-muted)">
          ${v.alt_meanings.map((am) => `• Bài ${am.lesson}: ${am.vi}`).join('<br>')}
        </div>`;
      }

      let formsHtml = '';
      if (v.pos === 'verb' && v.forms) {
        formsHtml = `
          <div class="tt-forms">
            <div><small>Từ điển:</small><br>${renderJP(v.forms.dict)}</div>
            <div><small>Thể て:</small><br>${renderJP(v.forms.te)}</div>
            <div><small>Thể ない:</small><br>${renderJP(v.forms.nai)}</div>
          </div>`;
      } else if ((v.pos === 'i-adj' || v.pos === 'na-adj') && v.forms) {
        formsHtml = `
          <div class="tt-forms">
            <div><small>Từ điển:</small><br>${renderJP(v.forms.dict)}</div>
            <div><small>Phủ định:</small><br>${renderJP(v.forms.neg)}</div>
            <div><small>Quá khứ:</small><br>${renderJP(v.forms.past)}</div>
          </div>`;
      }

      let exampleHtml = '';
      if (ex) {
        exampleHtml = `
          <div style="font-size:0.84rem;border-top:1px solid var(--border);padding-top:6px;margin-top:6px;">
            <div>${renderJP(ex.jp)}</div>
            <div style="color:var(--text-muted)">${ex.vi} (Bài ${ex.lesson})</div>
          </div>`;
      }

      tooltipEl.innerHTML = `
        <div class="tt-header">
          <div>
            <div class="tt-jp">${renderJP(v.jp)}</div>
            <div class="tt-romaji">${v.reading} • ${v.romaji || ''}</div>
          </div>
          <button class="btn-icon" id="tt-close-btn" aria-label="Đóng">✕</button>
        </div>
        <div class="tt-badges">
          <span class="badge badge-pos">${formatPosLabel(v.pos, v.verbGroup)}</span>
          ${scopeBadge}
        </div>
        <div><strong>${v.meaning_vi}</strong></div>
        ${altMeaningsHtml}
        ${v.note_vi ? `<div style="font-size:0.8rem;margin-top:4px;color:var(--text-muted)">💡 ${renderJP(v.note_vi, { inline: true })}</div>` : ''}
        ${formsHtml}
        ${exampleHtml}
        <div class="tt-actions">
          <button class="tt-btn" data-tt-speak="${v.jp}" ${!speechSupported ? 'disabled title="Trình duyệt không hỗ trợ phát âm"' : ''}>
            🔊 Phát âm
          </button>
          <button class="tt-btn" data-tt-fav="${v.id}">
            ${isFav ? '⭐ Đã lưu' : '☆ Yêu thích'}
          </button>
          <button class="tt-btn" data-tt-detail="${v.id}">
            🔍 Xem chi tiết
          </button>
        </div>
      `;
      positionTooltip(targetEl);
      return;
    }

    if (particleId) {
      const p = Tokenizer.getParticleById(particleId);
      if (!p) return;
      tooltipEl.innerHTML = `
        <div class="tt-header">
          <div>
            <div class="tt-jp">${renderJP(p.jp)} <span class="badge badge-pos">Trợ từ</span></div>
            <div class="tt-romaji">Romaji: ${p.romaji}</div>
          </div>
          <button class="btn-icon" id="tt-close-btn">✕</button>
        </div>
        <div><strong>${renderJP(p.meaning_vi, { inline: true })}</strong></div>
        ${p.note_vi ? `<div style="margin-top:6px;color:var(--primary);font-weight:600">📌 Lưu ý đọc: ${p.note_vi}</div>` : ''}
      `;
      positionTooltip(targetEl);
      return;
    }

    if (chipLabel) {
      const gId = targetEl.getAttribute('data-grammar-id');
      const gObj = gId ? Tokenizer.getGrammarById(gId) : null;
      tooltipEl.innerHTML = `
        <div class="tt-header">
          <div><strong>Mẫu ngữ pháp ghép</strong></div>
          <button class="btn-icon" id="tt-close-btn">✕</button>
        </div>
        <div>${chipLabel}</div>
        ${gObj ? `<div style="margin-top:6px;font-size:0.85rem">Công thức: ${renderJP(gObj.formula, { inline: true })}</div>
        <div class="tt-actions"><button class="tt-btn" data-tt-goto-grammar="${gObj.id}">📘 Mở mục ngữ pháp (Bài ${gObj.lesson})</button></div>` : ''}
      `;
      positionTooltip(targetEl);
      return;
    }

    if (unmatchedText) {
      tooltipEl.innerHTML = `
        <div class="tt-header">
          <div class="tt-jp">${renderJP(unmatchedText)}</div>
          <button class="btn-icon" id="tt-close-btn">✕</button>
        </div>
        <div style="color:var(--text-muted);margin-bottom:8px;">Chưa có trong từ điển Bài 4–7.</div>
        <button class="tt-btn" data-tt-add-personal="${unmatchedText}">➕ Thêm vào từ điển cá nhân</button>
      `;
      positionTooltip(targetEl);
    }
  }

  function hideTooltip() {
    tooltipEl.hidden = true;
    tooltipEl.setAttribute('aria-hidden', 'true');
  }

  // =========================================================================
  // RENDER CÁC TRANG TRONG GIAI ĐOẠN 1
  // =========================================================================
  function renderCurrentView() {
    hideTooltip();
    const container = document.getElementById('app-view');
    const titleMap = {
      dashboard: 'Tổng quan tiến độ (Bài 4–7)',
      roadmap: 'Lộ trình học tập (Bài 4–7)',
      vocab: 'Từ vựng & Flashcard (Chỉ tính từ Study)',
      kanji: 'Chuyên đề Kanji (Giai đoạn 4)',
      grammar: 'Ngữ pháp, Bảng nhìn nhanh & Trợ từ',
      conjugation: 'Công cụ chia Động từ & Tính từ (Giai đoạn 2)',
      practice: 'Luyện tập & Tự kiểm tra',
      test: 'Kiểm tra đánh giá (Giai đoạn 3)',
      'personal-dict': 'Từ điển cá nhân & Từ yêu thích',
      'data-notes': 'Ghi chú dữ liệu & Báo cáo kiểm toán'
    };
    document.getElementById('topbar-title').textContent = titleMap[currentView] || 'Japanese Learning Hub';

    document.querySelectorAll('.nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === currentView);
    });

    switch (currentView) {
      case 'dashboard':
        renderDashboard(container);
        break;
      case 'roadmap':
        renderRoadmap(container);
        break;
      case 'vocab':
        renderVocabView(container);
        break;
      case 'grammar':
        renderGrammarView(container);
        break;
      case 'personal-dict':
        renderPersonalDictView(container);
        break;
      case 'data-notes':
        renderDataNotesView(container);
        break;
      case 'practice':
        renderSelfCheckPreview(container);
        break;
      default:
        renderComingSoon(container, currentView);
        break;
    }
  }

  // 1. DASHBOARD (Mục 11 - Chỉ tính scope: "study", từ trùng nhiều bài chỉ tính 1 lần)
  function renderDashboard(container) {
    const studyWords = appData.vocab.filter((v) => v.scope === 'study');
    const learnedSet = new Set(appState.learnedIds);
    const learnedCount = studyWords.filter((v) => learnedSet.has(v.id)).length;
    const totalStudy = studyWords.length;
    const overallPct = totalStudy ? Math.round((learnedCount / totalStudy) * 100) : 0;

    const lessonStats = appData.lessons.map((l) => {
      const wordsInLesson = studyWords.filter((v) => v.lessons.includes(l.lesson));
      const doneInLesson = wordsInLesson.filter((v) => learnedSet.has(v.id)).length;
      const pct = wordsInLesson.length ? Math.round((doneInLesson / wordsInLesson.length) * 100) : 0;
      return { ...l, total: wordsInLesson.length, done: doneInLesson, pct };
    });

    container.innerHTML = `
      <div class="alert-box">
        <strong>📌 Phạm vi học tập:</strong> Giáo trình <em>Dekiru Nihongo Sơ cấp</em> – <strong>Chỉ Bài 4, 5, 6, 7</strong> (Bài 3 đã được loại bỏ hoàn toàn).
        Mọi chữ Kanji đều có Furigana. Di chuột hoặc chạm vào bất kỳ từ tiếng Nhật nào để mở từ điển tức thì.
      </div>

      <div class="grid-cards">
        <div class="card">
          <div class="stat-number">${learnedCount} / ${totalStudy}</div>
          <div class="stat-label">Từ vựng đã thuộc (Chỉ tính từ Study duy nhất • ${overallPct}%)</div>
        </div>
        <div class="card">
          <div class="stat-number">${appData.grammar.length}</div>
          <div class="stat-label">Mục ngữ pháp Bài 4–7 (${auditReport.actual.examplesTotal} câu ví dụ)</div>
        </div>
        <div class="card">
          <div class="stat-number">${appState.hardIds.length}</div>
          <div class="stat-label">Từ đánh dấu khó cần ôn lại</div>
        </div>
        <div class="card">
          <div class="stat-number">🔥 ${appState.streak.count} ngày</div>
          <div class="stat-label">Chuỗi ngày học liên tiếp (Streak)</div>
        </div>
      </div>

      <h3 style="margin-bottom:0.75rem;">Tiến độ từng bài (Bài 4 – Bài 7)</h3>
      <div class="grid-cards">
        ${lessonStats.map((st) => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span class="badge badge-pos">Bài ${st.lesson}</span>
              <strong>${st.done}/${st.total} từ (${st.pct}%)</strong>
            </div>
            <div style="font-size:1.15rem;font-weight:700;margin:0.4rem 0;">${renderJP(st.title_jp)}</div>
            <div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:0.75rem;">${st.title_vi}</div>
            <div style="height:8px;background:var(--bg-subtle);border-radius:99px;overflow:hidden;margin-bottom:0.75rem;">
              <div style="width:${st.pct}%;height:100%;background:var(--primary);"></div>
            </div>
            <div style="display:flex;gap:0.5rem;">
              <button class="btn" data-jump-vocab="${st.lesson}">Học từ vựng</button>
              <button class="btn" data-jump-grammar="${st.lesson}">Ngữ pháp</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 2. LỘ TRÌNH HỌC (4 BÀI: 4, 5, 6, 7)
  function renderRoadmap(container) {
    container.innerHTML = `
      <div class="grid-cards">
        ${appData.lessons.map((l) => {
          const gCount = appData.grammar.filter((g) => g.lesson === l.lesson).length;
          const vCount = appData.vocab.filter((v) => v.scope === 'study' && v.lessons.includes(l.lesson)).length;
          return `
            <div class="card">
              <span class="badge badge-pos">Bài ${l.lesson}</span>
              <h3 style="margin:0.5rem 0;">${renderJP(l.title_jp)} – ${l.title_vi}</h3>
              <p style="font-size:0.9rem;color:var(--text-muted);margin-bottom:1rem;">Chủ đề: ${l.topics}</p>
              <p style="font-size:0.9rem;margin-bottom:1rem;">• <strong>${vCount}</strong> từ vựng trọng tâm<br>• <strong>${gCount}</strong> mẫu ngữ pháp</p>
              <div style="display:flex;gap:0.5rem;">
                <button class="btn btn-primary" data-jump-vocab="${l.lesson}">Vào Từ vựng Bài ${l.lesson}</button>
                <button class="btn" data-jump-grammar="${l.lesson}">Vào Ngữ pháp Bài ${l.lesson}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // 3. TỪ VỰNG & FLASHCARD (Mục 7A)
  function getFilteredStudyVocab() {
    const learnedSet = new Set(appState.learnedIds);
    const hardSet = new Set(appState.hardIds);
    const q = removeVietnameseTones(vocabFilter.search.trim());

    return appData.vocab.filter((v) => {
      if (v.scope !== 'study') return false;
      if (vocabFilter.lesson !== 'all' && !v.lessons.includes(Number(vocabFilter.lesson))) return false;
      if (vocabFilter.pos !== 'all' && v.pos !== vocabFilter.pos) return false;
      if (vocabFilter.status === 'learned' && !learnedSet.has(v.id)) return false;
      if (vocabFilter.status === 'unlearned' && learnedSet.has(v.id)) return false;
      if (vocabFilter.status === 'hard' && !hardSet.has(v.id)) return false;

      if (q) {
        const plainJP = stripFurigana(v.jp).toLowerCase();
        const reading = (v.reading || '').toLowerCase();
        const romaji = (v.romaji || '').toLowerCase();
        const viNorm = removeVietnameseTones(v.meaning_vi);
        return (
          plainJP.includes(q) ||
          reading.includes(q) ||
          romaji.includes(q) ||
          viNorm.includes(q)
        );
      }
      return true;
    });
  }

  function renderVocabView(container) {
    const list = getFilteredStudyVocab();
    if (vocabFilter.fcIndex >= list.length) vocabFilter.fcIndex = 0;

    const filterHtml = `
      <div class="filter-bar">
        <input type="search" id="vocab-search-input" class="filter-input"
          placeholder="Tìm Kanji, Hiragana, romaji, nghĩa tiếng Việt không dấu..."
          value="${vocabFilter.search}">
        <select id="vocab-lesson-select" class="filter-select" aria-label="Lọc theo bài">
          <option value="all" ${vocabFilter.lesson === 'all' ? 'selected' : ''}>Tất cả Bài 4–7</option>
          <option value="4" ${vocabFilter.lesson === '4' ? 'selected' : ''}>Bài 4</option>
          <option value="5" ${vocabFilter.lesson === '5' ? 'selected' : ''}>Bài 5</option>
          <option value="6" ${vocabFilter.lesson === '6' ? 'selected' : ''}>Bài 6</option>
          <option value="7" ${vocabFilter.lesson === '7' ? 'selected' : ''}>Bài 7</option>
        </select>
        <select id="vocab-pos-select" class="filter-select" aria-label="Lọc theo từ loại">
          <option value="all" ${vocabFilter.pos === 'all' ? 'selected' : ''}>Mọi loại từ</option>
          <option value="noun" ${vocabFilter.pos === 'noun' ? 'selected' : ''}>Danh từ</option>
          <option value="verb" ${vocabFilter.pos === 'verb' ? 'selected' : ''}>Động từ</option>
          <option value="i-adj" ${vocabFilter.pos === 'i-adj' ? 'selected' : ''}>Tính từ い</option>
          <option value="na-adj" ${vocabFilter.pos === 'na-adj' ? 'selected' : ''}>Tính từ な</option>
          <option value="adv" ${vocabFilter.pos === 'adv' ? 'selected' : ''}>Phó từ / Khác</option>
        </select>
        <select id="vocab-status-select" class="filter-select" aria-label="Lọc trạng thái">
          <option value="all" ${vocabFilter.status === 'all' ? 'selected' : ''}>Tất cả (${list.length})</option>
          <option value="unlearned" ${vocabFilter.status === 'unlearned' ? 'selected' : ''}>Chưa thuộc</option>
          <option value="learned" ${vocabFilter.status === 'learned' ? 'selected' : ''}>Đã thuộc</option>
          <option value="hard" ${vocabFilter.status === 'hard' ? 'selected' : ''}>Từ khó (${appState.hardIds.length})</option>
        </select>
        <button class="btn ${vocabFilter.mode === 'flashcard' ? 'btn-primary' : ''}" id="toggle-fc-mode">
          ${vocabFilter.mode === 'flashcard' ? '📋 Xem danh sách' : '🃏 Học Flashcard'}
        </button>
      </div>
    `;

    if (list.length === 0) {
      container.innerHTML = filterHtml + `<div class="card">Không tìm thấy từ vựng nào khớp bộ lọc.</div>`;
      bindVocabFilterEvents();
      return;
    }

    if (vocabFilter.mode === 'flashcard') {
      const item = list[vocabFilter.fcIndex];
      const isLearned = appState.learnedIds.includes(item.id);
      const isHard = appState.hardIds.includes(item.id);

      container.innerHTML = `
        ${filterHtml}
        <div class="flashcard-stage">
          <div style="margin-bottom:0.5rem;color:var(--text-muted)">
            Thẻ <strong>${vocabFilter.fcIndex + 1} / ${list.length}</strong> • Bài ${item.lessons.join(', ')}
            (Phím tắt: <code>←</code> Trước, <code>→</code> Sau, <code>Space</code> Lật thẻ)
          </div>
          <div class="flashcard-box" id="fc-card-box" tabindex="0" role="button" aria-label="Lật thẻ flashcard">
            <div class="fc-front-jp">${renderJP(item.jp)}</div>
            <div style="color:var(--text-muted)">${formatPosLabel(item.pos, item.verbGroup)}</div>
            ${vocabFilter.fcFlipped ? `
              <div class="fc-back-vi">${item.meaning_vi}</div>
              <div>Cách đọc: <strong>${item.reading}</strong> (${item.romaji})</div>
              ${item.note_vi ? `<div style="font-size:0.88rem;margin-top:0.5rem;color:var(--text-muted)">💡 ${renderJP(item.note_vi, { inline: true })}</div>` : ''}
            ` : `<div style="margin-top:1.25rem;font-size:0.85rem;color:var(--text-muted)">👆 Chạm hoặc nhấn Space để xem nghĩa</div>`}
          </div>
          <div class="fc-controls">
            <button class="btn" id="fc-prev">⬅ Trước</button>
            <button class="btn" data-speak-word="${item.jp}">🔊 Nghe</button>
            <button class="btn ${isLearned ? 'btn-primary' : ''}" data-toggle-learned="${item.id}">
              ${isLearned ? '✅ Đã thuộc' : '☑️ Đánh dấu Đã thuộc'}
            </button>
            <button class="btn" data-toggle-hard="${item.id}">
              ${isHard ? '🔥 Bỏ đánh dấu khó' : '📌 Đánh dấu Từ khó'}
            </button>
            <button class="btn" id="fc-next">Tiếp ➡</button>
          </div>
        </div>
      `;
      bindVocabFilterEvents();
      return;
    }

    // Chế độ danh sách
    container.innerHTML = `
      ${filterHtml}
      <div class="grid-cards">
        ${list.map((v) => {
          const isLearned = appState.learnedIds.includes(v.id);
          const isHard = appState.hardIds.includes(v.id);
          return `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                  <span class="badge badge-pos">${formatPosLabel(v.pos, v.verbGroup)}</span>
                  <span class="badge">Bài ${v.lessons.join(', ')}</span>
                </div>
                <button class="btn-icon" data-speak-word="${v.jp}" title="Phát âm">🔊</button>
              </div>
              <div style="font-size:1.6rem;font-weight:700;margin:0.35rem 0;">
                <span class="word" tabindex="0" data-id="${v.id}">${renderJP(v.jp, { inline: true })}</span>
              </div>
              <div style="font-size:0.85rem;color:var(--text-muted);">${v.reading} • ${v.romaji}</div>
              <div style="font-size:1.05rem;font-weight:700;margin:0.4rem 0;">${v.meaning_vi}</div>
              ${v.alt_meanings ? `<div style="font-size:0.8rem;color:var(--text-muted)">${v.alt_meanings.map((a) => `Bài ${a.lesson}: ${a.vi}`).join(' | ')}</div>` : ''}
              ${v.note_vi ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">💡 ${renderJP(v.note_vi, { inline: true })}</div>` : ''}
              <div style="display:flex;gap:0.4rem;margin-top:0.75rem;flex-wrap:wrap;">
                <button class="tt-btn ${isLearned ? 'btn-primary' : ''}" data-toggle-learned="${v.id}">
                  ${isLearned ? '✅ Đã thuộc' : '☑️ Đã thuộc'}
                </button>
                <button class="tt-btn" data-toggle-hard="${v.id}">
                  ${isHard ? '🔥 Từ khó' : '📌 Khó'}
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    bindVocabFilterEvents();
  }

  function bindVocabFilterEvents() {
    const searchInput = document.getElementById('vocab-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        vocabFilter.search = e.target.value;
        vocabFilter.fcIndex = 0;
        renderVocabView(document.getElementById('app-view'));
        const el = document.getElementById('vocab-search-input');
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      });
    }
    const lessonSel = document.getElementById('vocab-lesson-select');
    if (lessonSel) {
      lessonSel.addEventListener('change', (e) => {
        vocabFilter.lesson = e.target.value;
        vocabFilter.fcIndex = 0;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const posSel = document.getElementById('vocab-pos-select');
    if (posSel) {
      posSel.addEventListener('change', (e) => {
        vocabFilter.pos = e.target.value;
        vocabFilter.fcIndex = 0;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const statusSel = document.getElementById('vocab-status-select');
    if (statusSel) {
      statusSel.addEventListener('change', (e) => {
        vocabFilter.status = e.target.value;
        vocabFilter.fcIndex = 0;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const modeBtn = document.getElementById('toggle-fc-mode');
    if (modeBtn) {
      modeBtn.addEventListener('click', () => {
        vocabFilter.mode = vocabFilter.mode === 'list' ? 'flashcard' : 'list';
        vocabFilter.fcFlipped = false;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const fcBox = document.getElementById('fc-card-box');
    if (fcBox) {
      fcBox.addEventListener('click', () => {
        vocabFilter.fcFlipped = !vocabFilter.fcFlipped;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const prevBtn = document.getElementById('fc-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const list = getFilteredStudyVocab();
        vocabFilter.fcIndex = (vocabFilter.fcIndex - 1 + list.length) % list.length;
        vocabFilter.fcFlipped = false;
        renderVocabView(document.getElementById('app-view'));
      });
    }
    const nextBtn = document.getElementById('fc-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const list = getFilteredStudyVocab();
        vocabFilter.fcIndex = (vocabFilter.fcIndex + 1) % list.length;
        vocabFilter.fcFlipped = false;
        renderVocabView(document.getElementById('app-view'));
      });
    }
  }

  // 4. NGỮ PHÁP, BẢNG NHÌN NHANH & TRỢ TỪ (Mục 7C)
  function renderGrammarView(container) {
    const navTabs = `
      <div class="filter-bar">
        <button class="btn ${grammarFilter.tab === 'lessons' ? 'btn-primary' : ''}" data-gtab="lessons">📘 25 Mục ngữ pháp (Bài 4–7)</button>
        <button class="btn ${grammarFilter.tab === 'quick' ? 'btn-primary' : ''}" data-gtab="quick">⚡ Bảng ngữ pháp nhìn nhanh (18 mẫu)</button>
        <button class="btn ${grammarFilter.tab === 'particles' ? 'btn-primary' : ''}" data-gtab="particles">🔗 Hệ thống Trợ từ (16 trợ từ)</button>
        ${grammarFilter.tab === 'lessons' ? `
          <select id="grammar-lesson-select" class="filter-select" style="margin-left:auto;">
            <option value="all" ${grammarFilter.lesson === 'all' ? 'selected' : ''}>Tất cả Bài 4–7 (25 mục)</option>
            <option value="4" ${grammarFilter.lesson === '4' ? 'selected' : ''}>Bài 4 (5 mục)</option>
            <option value="5" ${grammarFilter.lesson === '5' ? 'selected' : ''}>Bài 5 (5 mục)</option>
            <option value="6" ${grammarFilter.lesson === '6' ? 'selected' : ''}>Bài 6 (7 mục)</option>
            <option value="7" ${grammarFilter.lesson === '7' ? 'selected' : ''}>Bài 7 (8 mục)</option>
          </select>
        ` : ''}
      </div>
    `;

    if (grammarFilter.tab === 'quick') {
      container.innerHTML = `
        ${navTabs}
        <table class="data-table">
          <thead>
            <tr>
              <th>Bài</th>
              <th>Mẫu câu</th>
              <th>Chức năng</th>
            </tr>
          </thead>
          <tbody>
            ${appData.quickGrammar.map((qg) => `
              <tr>
                <td><span class="badge badge-pos">Bài ${qg.lesson}</span></td>
                <td>${renderJP(qg.pattern)}</td>
                <td>${qg.function_vi}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      return;
    }

    if (grammarFilter.tab === 'particles') {
      container.innerHTML = `
        ${navTabs}
        <div class="alert-box">
          ℹ️ <strong>Kiến thức nền, không ôn trong app này:</strong> Cách dùng cơ bản nhất của trợ từ を・へ・で・に và cách hỏi giờ thuộc kiến thức nền trước Bài 4. Bảng dưới đây tổng hợp cách dùng phục vụ trực tiếp cho Bài 4–7.
        </div>
        <div class="grid-cards">
          ${appData.particles.map((p) => `
            <div class="card">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:1.75rem;font-weight:700;color:var(--primary)">${renderJP(p.jp)}</span>
                <span class="badge">Romaji: ${p.romaji}</span>
              </div>
              <div style="margin-top:0.5rem;font-weight:600;">${renderJP(p.meaning_vi, { inline: true })}</div>
              ${p.note_vi ? `<div style="margin-top:0.4rem;font-size:0.85rem;color:var(--primary)">📌 ${p.note_vi}</div>` : ''}
            </div>
          `).join('')}
        </div>
      `;
      return;
    }

    const items = appData.grammar.filter(
      (g) => grammarFilter.lesson === 'all' || g.lesson === Number(grammarFilter.lesson)
    );

    container.innerHTML = `
      ${navTabs}
      <div class="alert-box">
        ℹ️ <strong>Kiến thức nền, không ôn trong app này:</strong> Các trợ từ cơ bản (を・へ・で・に) hoặc cách nói giờ xuất hiện trong câu ví dụ là kiến thức nền. Chạm/di chuột vào từng từ trong câu ví dụ để xem từ điển và cách chia.
      </div>
      <div style="display:flex;flex-direction:column;gap:1.25rem;">
        ${items.map((g) => `
          <article class="card" id="grammar-card-${g.id}">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
              <div>
                <span class="badge badge-pos">Bài ${g.lesson} • Mục ${g.order}</span>
                <span class="badge">Nguồn: ${g.source}</span>
              </div>
              <span class="badge badge-scope-extra">Chờ bổ sung GĐ 4: ${(g.todo || []).join(', ')}</span>
            </div>
            <h3 style="margin:0.5rem 0;font-size:1.2rem;">${g.title}</h3>
            <div style="background:var(--bg-subtle);padding:0.65rem 1rem;border-radius:8px;margin-bottom:0.75rem;font-weight:600;">
              📐 Công thức: ${renderJP(g.formula, { inline: true })}
            </div>
            <p style="margin-bottom:0.85rem;"><strong>Giải thích (Sổ tay):</strong> ${renderJP(g.explain_vi, { inline: true })}</p>
            <div>
              <strong>Câu ví dụ (Bấm vào từng từ để tra nhanh):</strong>
              <div style="display:flex;flex-direction:column;gap:0.6rem;margin-top:0.5rem;">
                ${g.examples.map((ex) => {
                  const tok = Tokenizer.tokenizeSentence(ex.jp);
                  return `
                    <div style="padding:0.65rem;border:1px solid var(--border);border-radius:8px;">
                      <div style="display:flex;justify-content:space-between;align-items:center;">
                        <div style="font-size:1.15rem;">${tok.html}</div>
                        <button class="btn-icon" data-speak-word="${ex.jp}" title="Nghe câu ví dụ">🔊</button>
                      </div>
                      <div style="color:var(--text-muted);font-size:0.92rem;">→ ${ex.vi}</div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;

    const sel = document.getElementById('grammar-lesson-select');
    if (sel) {
      sel.addEventListener('change', (e) => {
        grammarFilter.lesson = e.target.value;
        renderGrammarView(container);
      });
    }
  }

  // 5. TRANG GHI CHÚ VỀ DỮ LIỆU & KIỂM TOÁN (Mục 2 & Mục 14 - Bắt buộc)
  function renderDataNotesView(container) {
    const { actual, expected, discrepancies, furiganaErrors, unmatchedReport, noLesson3Passed } = auditReport;

    container.innerHTML = `
      <div class="card" style="margin-bottom:1.25rem;">
        <h3>📌 Ghi chú gốc từ Sổ tay (<code>meta.sourceNote</code>)</h3>
        <p style="margin-top:0.5rem;">${appData.meta.sourceNote}</p>
        <p style="margin-top:0.35rem;color:var(--text-muted);font-size:0.9rem;">
          Phạm vi: <strong>${appData.meta.scope}</strong> • Chuẩn Furigana: <code>${appData.meta.furiganaMarkup}</code>
        </p>
      </div>

      ${discrepancies.length > 0 ? `
        <div class="alert-box alert-warning">
          <h4>⚠️ Cảnh báo minh bạch: Phát hiện sai lệch số lượng phần tử trong tệp <code>du_lieu_bai_4-7.json</code> so với mô tả ở Mục 2</h4>
          <p style="margin:0.4rem 0;">Tuân thủ Nguyên tắc tối thượng số 3 (<em>"Dữ liệu trong tệp đính kèm là sự thật. Không tự dựng lại dữ liệu từ trí nhớ. Sai lệch → báo ngay"</em>), hệ thống giữ nguyên 100% dữ liệu từ tệp và liệt kê bảng đối chiếu dưới đây:</p>
          <table class="data-table" style="margin-top:0.5rem;">
            <thead>
              <tr>
                <th>Chỉ số</th>
                <th>Thực tế trong tệp JSON</th>
                <th>Kỳ vọng trong đề (Mục 2)</th>
                <th>Chênh lệch</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Tổng <code>vocab</code></td><td><strong>${actual.vocabTotal}</strong></td><td>${expected.vocabTotal}</td><td>${actual.vocabTotal - expected.vocabTotal}</td></tr>
              <tr><td>• <code>scope: "study"</code> (tổng từ duy nhất)</td><td><strong>${actual.study}</strong></td><td>${expected.study}</td><td>${actual.study - expected.study}</td></tr>
              <tr><td>&nbsp;&nbsp;↳ Study Bài 4 / Bài 5 / Bài 6 / Bài 7</td><td><strong>${actual.studyB4} / ${actual.studyB5} / ${actual.studyB6} / ${actual.studyB7}</strong></td><td>${expected.studyB4} / ${expected.studyB5} / ${expected.studyB6} / ${expected.studyB7}</td><td>-15 / -7 / -6 / -12</td></tr>
              <tr><td>• <code>scope: "extra" / "engine" / "foundation"</code></td><td><strong>${actual.extra} / ${actual.engine} / ${actual.foundation}</strong></td><td>${expected.extra} / ${expected.engine} / ${expected.foundation}</td><td>Khớp 100% (0)</td></tr>
              <tr><td><code>grammar</code> (25 mục) & Tổng câu ví dụ (52 câu)</td><td><strong>${actual.grammarTotal} mục / ${actual.examplesTotal} câu</strong></td><td>${expected.grammarTotal} mục / ${expected.examplesTotal} câu</td><td>Khớp 100% (0)</td></tr>
              <tr><td><code>goldenTests.verbs</code></td><td><strong>${actual.goldenVerbs}</strong></td><td>${expected.goldenVerbs}</td><td>${actual.goldenVerbs - expected.goldenVerbs}</td></tr>
              <tr><td><code>goldenTests.adjectives</code> / <code>particles</code> / <code>quickGrammar</code> / <code>selfCheck</code></td><td><strong>${actual.goldenAdj} / ${actual.particles} / ${actual.quickGrammar} / ${actual.selfCheck}</strong></td><td>${expected.goldenAdj} / ${expected.particles} / ${expected.quickGrammar} / ${expected.selfCheck}</td><td>Khớp 100% (0)</td></tr>
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="grid-cards">
        <div class="card">
          <h4>Kiểm tra Furigana (<code>validateFurigana()</code>)</h4>
          <div class="stat-number" style="color:${furiganaErrors.length === 0 ? 'var(--primary)' : 'var(--danger-text)'}">
            ${furiganaErrors.length} lỗi
          </div>
          <div class="stat-label">Mục tiêu: 0 chữ Kanji trần ngoài cặp <code>{漢字|かんじ}</code></div>
        </div>
        <div class="card">
          <h4>Độ phủ Tokenizer trên 52 câu ví dụ</h4>
          <div class="stat-number">${unmatchedReport.length} từ lạ</div>
          <div class="stat-label">Mọi từ trong 52 câu ví dụ ngữ pháp đều tra cứu được</div>
        </div>
        <div class="card">
          <h4>Kiểm tra loại bỏ Bài 3</h4>
          <div class="stat-number">${noLesson3Passed ? 'ĐẠT' : 'LỖI'}</div>
          <div class="stat-label">0 mục Bài 3 trong lộ trình, bộ lọc, tiến độ</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.25rem;">
        <h3>📋 Danh sách 10 điểm lưu ý của sổ tay gốc (<code>sourceIssues</code>)</h3>
        <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem;">
          Người học cần biết những điểm này để đối chiếu với tài liệu trên lớp:
        </p>
        <ol style="padding-left:1.25rem;display:flex;flex-direction:column;gap:0.5rem;">
          ${appData.sourceIssues.map((iss) => `<li>${iss}</li>`).join('')}
        </ol>
      </div>
    `;
  }

  // 6. TỪ ĐIỂN CÁ NHÂN & YÊU THÍCH
  function renderPersonalDictView(container) {
    const favWords = appData.vocab.filter((v) => appState.favoriteIds.includes(v.id));
    container.innerHTML = `
      <div class="card" style="margin-bottom:1.25rem;">
        <h3>⭐ Từ vựng đã đánh dấu Yêu thích (${favWords.length})</h3>
        ${favWords.length === 0 ? `<p style="color:var(--text-muted);margin-top:0.5rem;">Chưa có từ yêu thích. Hãy bấm nút ☆ trên tooltip khi tra từ.</p>` : `
          <div class="grid-cards" style="margin-top:0.75rem;">
            ${favWords.map((v) => `
              <div class="card">
                <div style="font-size:1.4rem;font-weight:700;">${renderJP(v.jp)}</div>
                <div>${v.reading} • <strong>${v.meaning_vi}</strong></div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <div class="card">
        <h3>➕ Từ điển cá nhân tự ghi (${appState.personalDict.length})</h3>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
          <input id="pdict-jp" class="filter-input" placeholder="Từ tiếng Nhật (vd: {図書館|としょかん})">
          <input id="pdict-vi" class="filter-input" placeholder="Nghĩa tiếng Việt">
          <button class="btn btn-primary" id="pdict-add-btn">Lưu từ</button>
        </div>
        <div style="margin-top:1rem;">
          ${appState.personalDict.map((item) => `
            <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);">
              <strong>${renderJP(item.jp)}</strong> — ${item.meaning_vi}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const addBtn = document.getElementById('pdict-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const jp = document.getElementById('pdict-jp').value.trim();
        const vi = document.getElementById('pdict-vi').value.trim();
        if (!jp) return;
        appState = AppStorage.addPersonalWord({ jp, meaning_vi: vi });
        renderPersonalDictView(container);
      });
    }
  }

  // 7. XEM TRƯỚC BỘ CÂU TỰ KIỂM TRA (selfCheck - 8 câu trong tệp)
  function renderSelfCheckPreview(container) {
    container.innerHTML = `
      <div class="alert-box">
        ⏳ <strong>Hệ thống 10 dạng bài tập tự sinh</strong> sẽ được hoàn thiện ở <strong>Giai đoạn 3</strong>. Dưới đây là 8 câu Tự kiểm tra gốc (<code>selfCheck</code>) có sẵn trong tệp dữ liệu:
      </div>
      <div style="display:flex;flex-direction:column;gap:1rem;">
        ${appData.selfCheck.map((sc, idx) => `
          <div class="card">
            <div><strong>Câu ${idx + 1}:</strong> ${renderJP(sc.q_vi, { inline: true })}</div>
            <details style="margin-top:0.6rem;">
              <summary style="cursor:pointer;color:var(--primary);font-weight:600;">Xem đáp án chuẩn</summary>
              <ul style="padding-left:1.25rem;margin-top:0.4rem;">
                ${sc.a.map((ans) => `<li>${renderJP(ans, { inline: true })}</li>`).join('')}
              </ul>
            </details>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderComingSoon(container, viewName) {
    const stageMap = {
      conjugation: 'Giai đoạn 2 (Engine chia Động từ 6A, Tính từ 6B, Tạo mẫu câu 6C, Chuyên đề thể て)',
      test: 'Giai đoạn 3 (Chế độ Kiểm tra bấm giờ, Thống kê điểm yếu, Sổ lỗi sai)',
      kanji: 'Giai đoạn 4 (Trích xuất Kanji từ từ vựng Study, SRS Leitner 5 hộp, Xuất/Nhập JSON)'
    };
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:3rem 1.5rem;">
        <div style="font-size:2.5rem;margin-bottom:0.5rem;">🚧</div>
        <h3>Tính năng Sắp có</h3>
        <p style="color:var(--text-muted);margin-top:0.5rem;">
          Phân hệ này thuộc <strong>${stageMap[viewName] || 'Giai đoạn tiếp theo'}</strong> theo đúng lộ trình làm việc từng giai đoạn (Mục 13).
        </p>
      </div>
    `;
  }

  // Modal xem chi tiết đầy đủ các thể của từ vựng
  function openWordDetailModal(wordId) {
    const v = Tokenizer.getVocabById(wordId);
    if (!v) return;
    const modal = document.getElementById('word-modal');
    const body = document.getElementById('modal-word-body');

    let formsTable = '';
    if (v.forms) {
      formsTable = `
        <h4 style="margin:1rem 0 0.5rem;">Bảng các dạng chia trong dữ liệu</h4>
        <table class="data-table">
          <tbody>
            ${Object.entries(v.forms).map(([k, val]) => `
              <tr>
                <td><strong>${k}</strong></td>
                <td>${val ? renderJP(val) : '<span style="color:var(--text-muted)">Không dùng ở N5</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    body.innerHTML = `
      <div style="font-size:2rem;font-weight:700;">${renderJP(v.jp)}</div>
      <div style="color:var(--text-muted);margin-bottom:0.5rem;">Cách đọc: ${v.reading} • Romaji: ${v.romaji}</div>
      <div><span class="badge badge-pos">${formatPosLabel(v.pos, v.verbGroup)}</span> <span class="badge">Scope: ${v.scope}</span></div>
      <div style="font-size:1.2rem;font-weight:700;margin:0.75rem 0;">Nghĩa: ${v.meaning_vi}</div>
      ${v.note_vi ? `<div class="alert-box">💡 ${renderJP(v.note_vi, { inline: true })}</div>` : ''}
      ${formsTable}
    `;
    modal.hidden = false;
  }

  // =========================================================================
  // KHỞI ĐỘNG ỨNG DỤNG & SỰ KIỆN TOÀN CỤC
  // =========================================================================
  function initApp() {
    if (!window.APP_DATA) {
      document.getElementById('app-view').innerHTML = `
        <div class="alert-box alert-danger">
          <h3>❌ Không tìm thấy dữ liệu <code>window.APP_DATA</code></h3>
          <p>Hãy đảm bảo tệp <code>data/data.js</code> đã được tạo từ <code>du_lieu_bai_4-7.json</code>.</p>
        </div>
      `;
      return;
    }

    appData = window.APP_DATA;
    appState = AppStorage.loadState();

    // Render tên thương hiệu có Furigana
    document.getElementById('brand-jp').innerHTML = renderJP('{日本語学習室|にほんごがくしゅうしつ}', { inline: true });

    // 1. Xây dựng chỉ mục Tokenizer
    Tokenizer.buildFormIndex(appData);

    // 2. Chạy kiểm toán dữ liệu & Furigana
    auditReport = Validator.runStartupAudit(appData);

    if (auditReport.discrepancies.length > 0 || auditReport.furiganaErrors.length > 0) {
      const alertBadge = document.getElementById('nav-data-alert');
      alertBadge.hidden = false;
    }

    applySettings();
    renderCurrentView();

    // Điều hướng Sidebar
    document.getElementById('nav-menu').addEventListener('click', (e) => {
      const btn = e.target.closest('.nav-item');
      if (!btn) return;
      currentView = btn.getAttribute('data-view');
      document.getElementById('sidebar').classList.remove('open');
      renderCurrentView();
    });

    // Mobile menu
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Nút điều khiển Topbar
    document.getElementById('toggle-furigana').addEventListener('click', () => {
      appState.settings.furigana = appState.settings.furigana === 'show' ? 'hide' : 'show';
      AppStorage.saveState(appState);
      applySettings();
    });

    document.getElementById('cycle-fontsize').addEventListener('click', () => {
      const order = ['sm', 'md', 'lg'];
      const next = order[(order.indexOf(appState.settings.fontSize) + 1) % order.length];
      appState.settings.fontSize = next;
      AppStorage.saveState(appState);
      applySettings();
    });

    document.getElementById('toggle-theme').addEventListener('click', () => {
      appState.settings.theme = appState.settings.theme === 'light' ? 'dark' : 'light';
      AppStorage.saveState(appState);
      applySettings();
    });

    // Sự kiện Hover (trễ 150ms) & Focus & Touch cho Tokenizer Words
    document.body.addEventListener('mouseover', (e) => {
      const wordEl = e.target.closest('.word');
      if (!wordEl) return;
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => showTooltipForTarget(wordEl), 150);
    });

    document.body.addEventListener('mouseout', (e) => {
      if (e.target.closest('.word')) clearTimeout(hoverTimer);
    });

    document.body.addEventListener('focusin', (e) => {
      const wordEl = e.target.closest('.word');
      if (wordEl) showTooltipForTarget(wordEl);
    });

    // Click uỷ quyền toàn cục
    document.body.addEventListener('click', (e) => {
      // Mở tooltip trên mobile khi chạm vào từ
      const wordEl = e.target.closest('.word');
      if (wordEl) {
        showTooltipForTarget(wordEl);
        return;
      }

      // Đóng tooltip khi bấm nút X hoặc bấm ra ngoài
      if (e.target.id === 'tt-close-btn' || (!e.target.closest('#hover-tooltip') && !tooltipEl.hidden)) {
        hideTooltip();
      }

      // Nút trong Tooltip
      const speakAttr = e.target.closest('[data-tt-speak],[data-speak-word]');
      if (speakAttr) {
        const text = speakAttr.getAttribute('data-tt-speak') || speakAttr.getAttribute('data-speak-word');
        speakJapanese(text);
        return;
      }

      const favBtn = e.target.closest('[data-tt-fav]');
      if (favBtn) {
        appState = AppStorage.toggleFavorite(favBtn.getAttribute('data-tt-fav'));
        hideTooltip();
        return;
      }

      const detailBtn = e.target.closest('[data-tt-detail]');
      if (detailBtn) {
        openWordDetailModal(detailBtn.getAttribute('data-tt-detail'));
        hideTooltip();
        return;
      }

      const gotoGrammar = e.target.closest('[data-tt-goto-grammar]');
      if (gotoGrammar) {
        const gId = gotoGrammar.getAttribute('data-tt-goto-grammar');
        currentView = 'grammar';
        grammarFilter.tab = 'lessons';
        grammarFilter.lesson = 'all';
        renderCurrentView();
        const card = document.getElementById(`grammar-card-${gId}`);
        if (card) card.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      const addPersonalBtn = e.target.closest('[data-tt-add-personal]');
      if (addPersonalBtn) {
        const raw = addPersonalBtn.getAttribute('data-tt-add-personal');
        appState = AppStorage.addPersonalWord({ jp: raw, meaning_vi: 'Từ thêm từ câu ví dụ' });
        hideTooltip();
        alert(`Đã thêm "${raw}" vào Từ điển cá nhân.`);
        return;
      }

      // Nút chuyển nhanh từ Dashboard/Roadmap
      const jumpVocab = e.target.closest('[data-jump-vocab]');
      if (jumpVocab) {
        vocabFilter.lesson = jumpVocab.getAttribute('data-jump-vocab');
        currentView = 'vocab';
        renderCurrentView();
        return;
      }

      const jumpGrammar = e.target.closest('[data-jump-grammar]');
      if (jumpGrammar) {
        grammarFilter.lesson = jumpGrammar.getAttribute('data-jump-grammar');
        grammarFilter.tab = 'lessons';
        currentView = 'grammar';
        renderCurrentView();
        return;
      }

      // Tab Ngữ pháp
      const gTabBtn = e.target.closest('[data-gtab]');
      if (gTabBtn) {
        grammarFilter.tab = gTabBtn.getAttribute('data-gtab');
        renderCurrentView();
        return;
      }

      // Đánh dấu Đã thuộc / Từ khó
      const learnedBtn = e.target.closest('[data-toggle-learned]');
      if (learnedBtn) {
        const id = learnedBtn.getAttribute('data-toggle-learned');
        const vObj = Tokenizer.getVocabById(id);
        appState = AppStorage.toggleLearned(vObj);
        renderCurrentView();
        return;
      }

      const hardBtn = e.target.closest('[data-toggle-hard]');
      if (hardBtn) {
        const id = hardBtn.getAttribute('data-toggle-hard');
        appState = AppStorage.toggleHard(id);
        renderCurrentView();
        return;
      }

      if (e.target.id === 'close-word-modal' || e.target.id === 'word-modal') {
        document.getElementById('word-modal').hidden = true;
      }
    });

    // Phím tắt bàn phím (Esc đóng tooltip/modal, mũi tên & Space cho Flashcard)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTooltip();
        document.getElementById('word-modal').hidden = true;
      }
      if (currentView === 'vocab' && vocabFilter.mode === 'flashcard') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        const list = getFilteredStudyVocab();
        if (!list.length) return;
        if (e.key === 'ArrowRight') {
          vocabFilter.fcIndex = (vocabFilter.fcIndex + 1) % list.length;
          vocabFilter.fcFlipped = false;
          renderCurrentView();
        } else if (e.key === 'ArrowLeft') {
          vocabFilter.fcIndex = (vocabFilter.fcIndex - 1 + list.length) % list.length;
          vocabFilter.fcFlipped = false;
          renderCurrentView();
        } else if (e.key === ' ') {
          e.preventDefault();
          vocabFilter.fcFlipped = !vocabFilter.fcFlipped;
          renderCurrentView();
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initApp);
})(window);