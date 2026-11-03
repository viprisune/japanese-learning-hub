// js/furigana.js
(function (global) {
  'use strict';

  // Regex nhận diện chữ Hán (CJK Unified Ideographs + 々)
  const KANJI_REGEX = /[\u4E00-\u9FFF々]/g;
  // Regex nhận diện cặp markup {漢字|かんじ}
  const RUBY_MARKUP_REGEX = /\{([^{}|]+)\|([^{}|]+)\}/g;
  // Regex nhận diện ghi đè tokenizer [[id|{漢字|かんじ}]]
  const OVERRIDE_MARKUP_REGEX = /\[\[([^\]|]+)\|([^\]]+)\]\]/g;

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Chuyển đổi chuỗi có markup {漢字|かんじ} sang HTML <ruby>漢字<rt>かんじ</rt></ruby>
   * Dùng cho MỌI chuỗi tiếng Nhật hiển thị trên giao diện.
   */
  function renderJP(str, options = {}) {
    if (str === null || str === undefined) return '';
    let raw = String(str);

    // Gỡ bỏ cú pháp [[id|...]] nếu chưa qua tokenizer
    raw = raw.replace(OVERRIDE_MARKUP_REGEX, '$2');

    // Escape các ký tự HTML trước rồi mới thay thế {Kanji|Reading}
    const escaped = escapeHTML(raw);
    const html = escaped.replace(RUBY_MARKUP_REGEX, (_, base, rt) => {
      return `<ruby>${base}<rt>${rt}</rt></ruby>`;
    });

    if (options.inline) return html;
    return `<span lang="ja" class="jp-text">${html}</span>`;
  }

  /**
   * Trích xuất chuỗi hiển thị thuần (bỏ Furigana) từ markup {漢字|かんじ} -> 漢字
   */
  function stripFurigana(str) {
    if (!str) return '';
    return String(str)
      .replace(OVERRIDE_MARKUP_REGEX, '$2')
      .replace(RUBY_MARKUP_REGEX, '$1');
  }

  /**
   * Trích xuất chuỗi Hiragana từ markup {漢字|かんじ} -> かんじ
   */
  function toReading(str) {
    if (!str) return '';
    return String(str)
      .replace(OVERRIDE_MARKUP_REGEX, '$2')
      .replace(RUBY_MARKUP_REGEX, '$2');
  }

  /**
   * Kiểm tra một chuỗi markup xem có chữ Kanji nào nằm ngoài cặp {|} hay không.
   * Trả về mảng các ký tự Kanji trần bị lộ.
   */
  function findBareKanjiInMarkup(str) {
    if (!str) return [];
    const withoutOverride = String(str).replace(OVERRIDE_MARKUP_REGEX, '$2');
    // Xóa toàn bộ cụm {漢字|かんじ} hợp lệ
    const strippedValidRuby = withoutOverride.replace(RUBY_MARKUP_REGEX, '');
    const matches = strippedValidRuby.match(KANJI_REGEX);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Quét toàn bộ dữ liệu hiển thị trong APP_DATA để đảm bảo 0 lỗi Kanji trần.
   * (Bỏ qua sourceIssues và goldenTests.plain vì đó là dữ liệu log/test nội bộ).
   */
  function validateFurigana(appData) {
    const errors = [];

    function checkField(path, text) {
      if (!text || typeof text !== 'string') return;
      const bare = findBareKanjiInMarkup(text);
      if (bare.length > 0) {
        errors.push({ path, text, bareKanji: bare });
      }
    }

    if (!appData) return errors;

    // 1. Lessons
    (appData.lessons || []).forEach((l) => {
      checkField(`lessons[B${l.lesson}].title_jp`, l.title_jp);
    });

    // 2. Vocab
    (appData.vocab || []).forEach((v) => {
      checkField(`vocab[${v.id}].jp`, v.jp);
      checkField(`vocab[${v.id}].note_vi`, v.note_vi);
      if (v.forms) {
        Object.entries(v.forms).forEach(([fKey, fVal]) => {
          if (fVal) checkField(`vocab[${v.id}].forms.${fKey}`, fVal);
        });
      }
    });

    // 3. Grammar
    (appData.grammar || []).forEach((g) => {
      checkField(`grammar[${g.id}].formula`, g.formula);
      checkField(`grammar[${g.id}].explain_vi`, g.explain_vi);
      (g.examples || []).forEach((ex, idx) => {
        checkField(`grammar[${g.id}].examples[${idx}].jp`, ex.jp);
      });
    });

    // 4. Particles
    (appData.particles || []).forEach((p) => {
      checkField(`particles[${p.id}].jp`, p.jp);
      checkField(`particles[${p.id}].meaning_vi`, p.meaning_vi);
    });

    // 5. teForm
    if (appData.teForm) {
      (appData.teForm.table || []).forEach((row, i) => {
        checkField(`teForm.table[${i}].masu`, row.masu);
        checkField(`teForm.table[${i}].te`, row.te);
      });
      (appData.teForm.tips || []).forEach((tip, i) => {
        checkField(`teForm.tips[${i}]`, tip);
      });
    }

    // 6. quickGrammar & selfCheck
    (appData.quickGrammar || []).forEach((qg, i) => {
      checkField(`quickGrammar[${i}].pattern`, qg.pattern);
    });
    (appData.selfCheck || []).forEach((sc) => {
      checkField(`selfCheck[${sc.id}].q_vi`, sc.q_vi);
      (sc.a || []).forEach((ans, i) => checkField(`selfCheck[${sc.id}].a[${i}]`, ans));
    });

    return errors;
  }

  global.Furigana = {
    renderJP,
    stripFurigana,
    toReading,
    findBareKanjiInMarkup,
    validateFurigana
  };
})(window);