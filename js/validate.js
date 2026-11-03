// js/validate.js
(function (global) {
  'use strict';

  function runStartupAudit(appData) {
    const vocab = appData.vocab || [];
    const studyVocab = vocab.filter((v) => v.scope === 'study');
    const extraVocab = vocab.filter((v) => v.scope === 'extra');
    const engineVocab = vocab.filter((v) => v.scope === 'engine');
    const foundationVocab = vocab.filter((v) => v.scope === 'foundation');

    // Kiểm tra tuyệt đối không có Bài 3 trong lessons hoặc vocab
    const hasLesson3InLessons = (appData.lessons || []).some((l) => l.lesson === 3);
    const hasLesson3InVocab = vocab.some((v) => (v.lessons || []).includes(3));
    const hasLesson3InGrammar = (appData.grammar || []).some((g) => g.lesson === 3);

    const studyByLesson = {
      4: studyVocab.filter((v) => (v.lessons || []).includes(4)).length,
      5: studyVocab.filter((v) => (v.lessons || []).includes(5)).length,
      6: studyVocab.filter((v) => (v.lessons || []).includes(6)).length,
      7: studyVocab.filter((v) => (v.lessons || []).includes(7)).length
    };

    const grammar = appData.grammar || [];
    const grammarByLesson = {
      4: grammar.filter((g) => g.lesson === 4).length,
      5: grammar.filter((g) => g.lesson === 5).length,
      6: grammar.filter((g) => g.lesson === 6).length,
      7: grammar.filter((g) => g.lesson === 7).length
    };
    const totalExamples = grammar.reduce((sum, g) => sum + (g.examples ? g.examples.length : 0), 0);

    const furiganaErrors = global.Furigana.validateFurigana(appData);
    const unmatchedReport = global.Tokenizer.scanAllExamplesForUnmatched(appData);

    // So sánh với thông số kỳ vọng trong đề bài (Mục 2)
    const expected = {
      vocabTotal: 225,
      study: 173,
      extra: 34,
      engine: 17,
      foundation: 1,
      studyB4: 67,
      studyB5: 44,
      studyB6: 31,
      studyB7: 44,
      grammarTotal: 25,
      examplesTotal: 52,
      goldenVerbs: 52,
      goldenAdj: 32,
      particles: 16,
      quickGrammar: 18,
      selfCheck: 8
    };

    const actual = {
      vocabTotal: vocab.length,
      study: studyVocab.length,
      extra: extraVocab.length,
      engine: engineVocab.length,
      foundation: foundationVocab.length,
      studyB4: studyByLesson[4],
      studyB5: studyByLesson[5],
      studyB6: studyByLesson[6],
      studyB7: studyByLesson[7],
      grammarTotal: grammar.length,
      grammarByLesson,
      examplesTotal: totalExamples,
      goldenVerbs: (appData.goldenTests?.verbs || []).length,
      goldenAdj: (appData.goldenTests?.adjectives || []).length,
      particles: (appData.particles || []).length,
      quickGrammar: (appData.quickGrammar || []).length,
      selfCheck: (appData.selfCheck || []).length
    };

    const discrepancies = [];
    Object.keys(expected).forEach((k) => {
      if (actual[k] !== expected[k]) {
        discrepancies.push({
          metric: k,
          expected: expected[k],
          actual: actual[k],
          diff: actual[k] - expected[k]
        });
      }
    });

    const auditResult = {
      actual,
      expected,
      discrepancies,
      noLesson3Passed: !hasLesson3InLessons && !hasLesson3InVocab && !hasLesson3InGrammar,
      furiganaErrors,
      unmatchedReport
    };

    // In báo cáo chi tiết ra Console ngay khi nạp (Mục 2 & Mục 4)
    console.group('🔍 [Japanese Learning Hub] KIỂM TOÁN DỮ LIỆU ĐẦU VÀO (Giai đoạn 1)');
    console.log('1. Thống kê Vocab thực tế trong tệp:', {
      total: actual.vocabTotal,
      study: actual.study,
      extra: actual.extra,
      engine: actual.engine,
      foundation: actual.foundation,
      studyByLesson
    });
    console.log('2. Thống kê Ngữ pháp & Ví dụ:', {
      grammarTotal: actual.grammarTotal,
      grammarByLesson,
      examplesTotal: actual.examplesTotal
    });
    console.log('3. Thống kê Bộ kiểm thử & Phụ trợ:', {
      goldenVerbs: actual.goldenVerbs,
      goldenAdj: actual.goldenAdj,
      particles: actual.particles,
      quickGrammar: actual.quickGrammar,
      selfCheck: actual.selfCheck
    });
    console.log(`4. validateFurigana(): ${furiganaErrors.length} lỗi Kanji trần.`, furiganaErrors);
    console.log(`5. Tokenizer unmatchedTokens trong 52 câu ví dụ: ${unmatchedReport.length} câu có từ lạ.`, unmatchedReport);
    console.log(`6. Kiểm tra loại bỏ Bài 3: ${auditResult.noLesson3Passed ? 'ĐẠT (0 dấu vết Bài 3)' : 'KHÔNG ĐẠT'}`);
    if (discrepancies.length > 0) {
      console.warn('⚠️ PHÁT HIỆN SAI LỆCH GIỮA TỆP JSON ĐÍNH KÈM VÀ CON SỐ MÔ TẢ Ở MỤC 2:', discrepancies);
    }
    console.groupEnd();

    return auditResult;
  }

  global.Validator = { runStartupAudit };
})(window);