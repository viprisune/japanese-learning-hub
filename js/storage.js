// js/storage.js
(function (global) {
  'use strict';

  const STORAGE_PREFIX = 'jlh_n5_b47_v1_';
  const STATE_KEY = `${STORAGE_PREFIX}state`;

  const DEFAULT_STATE = {
    schemaVersion: 1,
    learnedIds: [],      // Chỉ chứa id của từ scope === "study"
    favoriteIds: [],     // Từ yêu thích (⭐)
    hardIds: [],         // Từ đánh dấu khó
    personalDict: [],    // Từ do người học tự thêm
    wrongAnswers: [],    // Sổ lỗi sai (dùng cho GĐ 3)
    srs: {},             // Dữ liệu Leitner SRS (dùng cho GĐ 4)
    streak: { count: 1, lastDate: new Date().toISOString().slice(0, 10) },
    settings: {
      furigana: 'show',  // 'show' | 'hide'
      fontSize: 'md',    // 'sm' | 'md' | 'lg'
      theme: 'light'     // 'light' | 'dark'
    }
  };

  let memoryFallback = null;
  let isLocalStorageAvailable = true;

  function checkStorage() {
    try {
      const testKey = `${STORAGE_PREFIX}__test__`;
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      return true;
    } catch (err) {
      console.warn('[Storage] localStorage bị chặn hoặc đầy, chuyển sang chạy trong RAM:', err);
      return false;
    }
  }

  isLocalStorageAvailable = checkStorage();

  function loadState() {
    if (!isLocalStorageAvailable) {
      if (!memoryFallback) memoryFallback = JSON.parse(JSON.stringify(DEFAULT_STATE));
      return memoryFallback;
    }
    try {
      const raw = window.localStorage.getItem(STATE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion !== DEFAULT_STATE.schemaVersion) {
        console.warn('[Storage] Phiên bản dữ liệu cũ, hợp nhất về cấu trúc chuẩn.');
      }
      return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), parsed, {
        settings: Object.assign({}, DEFAULT_STATE.settings, parsed.settings || {})
      });
    } catch (err) {
      console.error('[Storage] Lỗi đọc localStorage:', err);
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }

  function saveState(newState) {
    if (!isLocalStorageAvailable) {
      memoryFallback = JSON.parse(JSON.stringify(newState));
      return false;
    }
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(newState));
      return true;
    } catch (err) {
      console.error('[Storage] Không thể ghi localStorage:', err);
      isLocalStorageAvailable = false;
      memoryFallback = JSON.parse(JSON.stringify(newState));
      return false;
    }
  }

  /**
   * Đánh dấu Đã học: CHỈ cho phép từ thuộc scope === "study" (Mục 1 & 7A)
   */
  function toggleLearned(vocabItem) {
    if (!vocabItem || vocabItem.scope !== 'study') return loadState();
    const state = loadState();
    const idx = state.learnedIds.indexOf(vocabItem.id);
    if (idx === -1) state.learnedIds.push(vocabItem.id);
    else state.learnedIds.splice(idx, 1);
    saveState(state);
    return state;
  }

  function toggleFavorite(wordId) {
    const state = loadState();
    const idx = state.favoriteIds.indexOf(wordId);
    if (idx === -1) state.favoriteIds.push(wordId);
    else state.favoriteIds.splice(idx, 1);
    saveState(state);
    return state;
  }

  function toggleHard(wordId) {
    const state = loadState();
    const idx = state.hardIds.indexOf(wordId);
    if (idx === -1) state.hardIds.push(wordId);
    else state.hardIds.splice(idx, 1);
    saveState(state);
    return state;
  }

  function addPersonalWord(entry) {
    const state = loadState();
    state.personalDict.push({
      id: `user_${Date.now()}`,
      jp: entry.jp,
      reading: entry.reading || '',
      meaning_vi: entry.meaning_vi || 'Chưa có nghĩa',
      createdAt: new Date().toISOString()
    });
    saveState(state);
    return state;
  }

  function resetAll() {
    const fresh = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveState(fresh);
    return fresh;
  }

  global.AppStorage = {
    isAvailable: () => isLocalStorageAvailable,
    loadState,
    saveState,
    toggleLearned,
    toggleFavorite,
    toggleHard,
    addPersonalWord,
    resetAll
  };
})(window);