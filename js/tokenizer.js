// js/tokenizer.js
(function (global) {
  'use strict';

  const { stripFurigana, renderJP } = global.Furigana;

  // Hậu tố ghép trên Vます-stem và Vて kèm liên kết tới mục ngữ pháp (Mục 5.1)
  const STEM_SUFFIXES = [
    { suffix: 'ませんでした', label: 'Phủ định quá khứ (Bài 5)', grammarId: 'g_b5_01' },
    { suffix: 'ましょうか', label: 'Đề nghị giúp đỡ (Bài 7)', grammarId: 'g_b7_07' },
    { suffix: 'ませんか', label: 'Lời mời lịch sự (Bài 6)', grammarId: 'g_b6_01' },
    { suffix: 'ましょう', label: 'Rủ cùng làm (Bài 6)', grammarId: 'g_b6_01' },
    { suffix: 'ました', label: 'Quá khứ lịch sự (Bài 5)', grammarId: 'g_b5_01' },
    { suffix: 'ません', label: 'Phủ định hiện tại', grammarId: 'g_b5_01' },
    { suffix: 'たいです', label: 'Muốn làm V (Bài 5)', grammarId: 'g_b5_04' },
    { suffix: 'ます', label: 'Thể lịch sự hiện tại', grammarId: null },
    { suffix: 'たい', label: 'Muốn làm V (Bài 5)', grammarId: 'g_b5_04' },
    { suffix: '{方|かた}', Plain: '方', label: 'Cách làm ~ (Bài 7)', grammarId: 'g_b7_04' }
  ];

  const TE_SUFFIXES = [
    { suffix: 'ください', label: 'Hãy làm V (Bài 7)', grammarId: 'g_b7_02' },
    { suffix: 'いました', label: 'Đang làm (quá khứ)', grammarId: 'g_b7_06' },
    { suffix: 'います', label: 'Đang làm / trạng thái (Bài 7)', grammarId: 'g_b7_06' }
  ];

  const PUNCTUATION_REGEX = /^[。、！？「」『』（）()・…\s0-9a-zA-Z／＋＝〜～]+/;

  let formIndex = new Map();
  let vocabById = new Map();
  let particleByPlain = new Map();
  let grammarById = new Map();
  let exampleByWordId = new Map();

  function addIndexEntry(surfacePlain, entry) {
    if (!surfacePlain) return;
    if (!formIndex.has(surfacePlain)) {
      formIndex.set(surfacePlain, []);
    }
    const list = formIndex.get(surfacePlain);
    if (!list.some((x) => x.id === entry.id && x.form === entry.form)) {
      list.push(entry);
    }
  }

  /**
   * Xây dựng chỉ mục từ vựng, dạng chia, biến thể và trợ từ (Mục 5.1)
   */
  function buildFormIndex(appData) {
    formIndex.clear();
    vocabById.clear();
    particleByPlain.clear();
    grammarById.clear();
    exampleByWordId.clear();

    (appData.grammar || []).forEach((g) => grammarById.set(g.id, g));

    (appData.particles || []).forEach((p) => {
      particleByPlain.set(stripFurigana(p.jp), p);
    });

    (appData.vocab || []).forEach((v) => {
      vocabById.set(v.id, v);
      const basePlain = stripFurigana(v.jp);
      addIndexEntry(basePlain, { id: v.id, form: 'dict', markup: v.jp });
      if (v.reading && v.reading !== basePlain) {
        addIndexEntry(v.reading, { id: v.id, form: 'reading', markup: v.jp });
      }

      // Readings & Variants (いえ/うち, ふん/ぷん, くらい/ぐらい)
      (v.readings || []).forEach((r) => {
        addIndexEntry(r, { id: v.id, form: 'variant', markup: v.jp });
      });
      (v.variants || []).forEach((vr) => {
        addIndexEntry(vr, { id: v.id, form: 'variant', markup: vr });
      });

      // Mọi dạng trong forms
      if (v.forms) {
        Object.entries(v.forms).forEach(([formName, formMarkup]) => {
          if (!formMarkup) return;
          const fPlain = stripFurigana(formMarkup);
          addIndexEntry(fPlain, { id: v.id, form: formName, markup: formMarkup });
        });

        // Ghép hậu tố động từ trên stem và te
        if (v.pos === 'verb') {
          if (v.forms.stem) {
            const stemPlain = stripFurigana(v.forms.stem);
            STEM_SUFFIXES.forEach((suf) => {
              const sPlain = suf.Plain || stripFurigana(suf.suffix);
              addIndexEntry(stemPlain + sPlain, {
                id: v.id,
                form: `stem+${sPlain}`,
                stemMarkup: v.forms.stem,
                chipSuffix: suf.suffix,
                chipLabel: suf.label,
                grammarId: suf.grammarId
              });
            });
          }
          if (v.forms.te) {
            const tePlain = stripFurigana(v.forms.te);
            TE_SUFFIXES.forEach((suf) => {
              const sPlain = stripFurigana(suf.suffix);
              addIndexEntry(tePlain + sPlain, {
                id: v.id,
                form: `te+${sPlain}`,
                stemMarkup: v.forms.te,
                chipSuffix: suf.suffix,
                chipLabel: suf.label,
                grammarId: suf.grammarId
              });
            });
          }
        }
      }
    });

    // Đặc biệt: 休み (danh từ gốc của 休みの日 xuất hiện độc lập ở Bài 5 g_b5_05)
    if (vocabById.has('n_yasuminohi')) {
      addIndexEntry('休み', { id: 'n_yasuminohi', form: 'short', markup: '{休|やす}み' });
    }

    // Ánh xạ mỗi từ với câu ví dụ đầu tiên trong grammar có chứa từ đó
    (appData.grammar || []).forEach((g) => {
      (g.examples || []).forEach((ex) => {
        const plainEx = stripFurigana(ex.jp);
        vocabById.forEach((v) => {
          if (!exampleByWordId.has(v.id)) {
            const vPlain = stripFurigana(v.jp);
            if (plainEx.includes(vPlain)) {
              exampleByWordId.set(v.id, { jp: ex.jp, vi: ex.vi, lesson: g.lesson, grammarId: g.id });
            }
          }
        });
      });
    });
  }

  /**
   * Tách chuỗi markup {漢字|かんじ} thành mảng các đơn vị ký tự (mỗi đơn vị có plain & raw)
   * giúp thuật toán Greedy Longest-Match khớp trên chuỗi plain nhưng vẫn giữ nguyên Furigana gốc.
   */
  function parseMarkupToUnits(markupStr) {
    const units = [];
    let i = 0;
    const str = String(markupStr || '');

    while (i < str.length) {
      // Kiểm tra ghi đè tay [[id|{漢字|かんじ}]]
      if (str.startsWith('[[', i)) {
        const endIdx = str.indexOf(']]', i + 2);
        if (endIdx !== -1) {
          const content = str.slice(i + 2, endIdx);
          const pipeIdx = content.indexOf('|');
          if (pipeIdx !== -1) {
            const overrideId = content.slice(0, pipeIdx);
            const innerMarkup = content.slice(pipeIdx + 1);
            units.push({
              plain: stripFurigana(innerMarkup),
              raw: innerMarkup,
              overrideId
            });
            i = endIdx + 2;
            continue;
          }
        }
      }

      // Kiểm tra cụm Furigana {漢字|かんじ}
      if (str[i] === '{') {
        const closeIdx = str.indexOf('}', i + 1);
        const pipeIdx = str.indexOf('|', i + 1);
        if (closeIdx !== -1 && pipeIdx !== -1 && pipeIdx < closeIdx) {
          const base = str.slice(i + 1, pipeIdx);
          const rt = str.slice(pipeIdx + 1, closeIdx);
          units.push({
            plain: base,
            raw: `{${base}|${rt}}`
          });
          i = closeIdx + 1;
          continue;
        }
      }

      units.push({ plain: str[i], raw: str[i] });
      i++;
    }
    return units;
  }

  /**
   * Tách câu tiếng Nhật bằng Greedy Longest-Match (Mục 5.2)
   * Trả về { html, unmatched: [] }
   */
  function tokenizeSentence(markupStr) {
    const units = parseMarkupToUnits(markupStr);
    const unmatched = [];
    let htmlParts = [];
    let idx = 0;

    // Đuôi câu phổ biến (copula) không coi là unmatched lỗi
    const COPULA_LIST = ['じゃなかったです', 'じゃないです', '종', 'でした', 'ですか', 'ですね', 'ですよ', 'です'];

    while (idx < units.length) {
      const currentUnit = units[idx];

      // 1. Nếu có ghi đè tay [[id|markup]]
      if (currentUnit.overrideId) {
        htmlParts.push(
          `<span class="word" tabindex="0" data-id="${currentUnit.overrideId}" data-form="override">${renderJP(currentUnit.raw, { inline: true })}</span>`
        );
        idx++;
        continue;
      }

      // 2. Bỏ qua dấu câu / khoảng trắng
      if (PUNCTUATION_REGEX.test(currentUnit.plain)) {
        htmlParts.push(renderJP(currentUnit.raw, { inline: true }));
        idx++;
        continue;
      }

      // 3. Thử khớp chuỗi dài nhất từ vị trí idx đến cuối
      let matched = null;
      let matchedEnd = idx;

      for (let end = units.length; end > idx; end--) {
        const candidatePlain = units.slice(idx, end).map((u) => u.plain).join('');
        if (formIndex.has(candidatePlain)) {
          const entries = formIndex.get(candidatePlain);
          matched = entries[0];
          matchedEnd = end;
          break;
        }
      }

      if (matched) {
        const rawSegment = units.slice(idx, matchedEnd).map((u) => u.raw).join('');
        // Nếu là dạng ghép stem/te + hậu tố ngữ pháp -> tách thành {từ gốc} + {chip ngữ pháp} (Mục 5.1)
        if (matched.chipSuffix) {
          const rootHtml = `<span class="word" tabindex="0" data-id="${matched.id}" data-form="${matched.form}">${renderJP(matched.stemMarkup, { inline: true })}</span>`;
          const chipAttr = matched.grammarId ? `data-grammar-id="${matched.grammarId}"` : '';
          const chipHtml = `<span class="word grammar-chip" tabindex="0" data-chip-label="${matched.chipLabel}" ${chipAttr}>${renderJP(matched.chipSuffix, { inline: true })}</span>`;
          htmlParts.push(rootHtml + chipHtml);
        } else {
          htmlParts.push(
            `<span class="word" tabindex="0" data-id="${matched.id}" data-form="${matched.form}">${renderJP(rawSegment, { inline: true })}</span>`
          );
        }
        idx = matchedEnd;
        continue;
      }

      // 4. Kiểm tra Copula (です, でした...)
      let copulaMatched = false;
      for (const cop of COPULA_LIST) {
        let acc = '';
        let k = idx;
        while (k < units.length && acc.length < cop.length) {
          acc += units[k].plain;
          k++;
        }
        if (acc === cop) {
          const rawCop = units.slice(idx, k).map((u) => u.raw).join('');
          htmlParts.push(`<span class="copula-token">${renderJP(rawCop, { inline: true })}</span>`);
          idx = k;
          copulaMatched = true;
          break;
        }
      }
      if (copulaMatched) continue;

      // 5. Kiểm tra Trợ từ trong particles (1 hoặc 2 ký tự)
      let particleMatched = false;
      for (let pLen = Math.min(2, units.length - idx); pLen >= 1; pLen--) {
        const pPlain = units.slice(idx, idx + pLen).map((u) => u.plain).join('');
        if (particleByPlain.has(pPlain)) {
          const pObj = particleByPlain.get(pPlain);
          const rawP = units.slice(idx, idx + pLen).map((u) => u.raw).join('');
          htmlParts.push(
            `<span class="word particle-token" tabindex="0" data-particle-id="${pObj.id}">${renderJP(rawP, { inline: true })}</span>`
          );
          idx += pLen;
          particleMatched = true;
          break;
        }
      }
      if (particleMatched) continue;

      // 6. Không khớp được -> giữ nguyên và ghi nhận vào unmatchedTokens
      unmatched.push(currentUnit.plain);
      htmlParts.push(
        `<span class="word unmatched-token" tabindex="0" data-unmatched="${currentUnit.plain}">${renderJP(currentUnit.raw, { inline: true })}</span>`
      );
      idx++;
    }

    return {
      html: `<span lang="ja" class="jp-text tokenized-sentence">${htmlParts.join('')}</span>`,
      unmatched
    };
  }

  function scanAllExamplesForUnmatched(appData) {
    const report = [];
    (appData.grammar || []).forEach((g) => {
      (g.examples || []).forEach((ex, i) => {
        const res = tokenizeSentence(ex.jp);
        if (res.unmatched.length > 0) {
          report.push({
            grammarId: g.id,
            lesson: g.lesson,
            sentence: ex.jp,
            unmatched: res.unmatched
          });
        }
      });
    });
    return report;
  }

  global.Tokenizer = {
    buildFormIndex,
    tokenizeSentence,
    scanAllExamplesForUnmatched,
    getVocabById: (id) => vocabById.get(id),
    getParticleById: (id) => (window.APP_DATA.particles || []).find((p) => p.id === id),
    getGrammarById: (id) => grammarById.get(id),
    getExampleForWord: (id) => exampleByWordId.get(id)
  };
})(window);