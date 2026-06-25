// ============================================================
//  Practice Module — 出题 / 批改 / 打印 / 已保存练习
// ============================================================
App.Practice = {
  _currentPractice: null,
  _savedPracticesKey: 'kanpinyin_saved_practices',

  /** 百分比三级出题算法
   *  按题数比例分配：错词巩固 ≤20% + 低频新词 ≤30% + 加权随机补足
   */
  generate(student, totalWords = 50) {
    const allWords = this.getFilteredWords();
    if (allWords.length === 0) return [];
    if (allWords.length <= totalWords) {
      return App.UI.shuffle(allWords.map(w => ({ wordId: w.id, chars: w.chars, pinyin: w.pinyin })));
    }

    const result = [];
    const pickedIdSet = new Set();
    const wordStats = student.wordStats || {};

    // ---- Tier 1: 错词巩固 (max 20%) ----
    const errorPool = student.errorWordIds || [];
    // 按错误次数加权：错得越多越优先
    const errorWords = errorPool
      .map(id => ({ id, w: Store.data.words.find(x => x.id === id) }))
      .filter(x => x.w && !pickedIdSet.has(x.id));
    const maxErrorCount = Math.min(
      Math.max(1, Math.round(totalWords * 0.2)),
      errorWords.length
    );
    // 按错误次数从高到低排序（如果有 wordStats）
    errorWords.sort((a, b) => {
      const aWrong = wordStats[a.id]?.wrong || 0;
      const bWrong = wordStats[b.id]?.wrong || 0;
      return bWrong - aWrong; // 错得多的优先
    });
    for (let i = 0; i < maxErrorCount; i++) {
      const { id, w } = errorWords[i];
      result.push({ wordId: id, chars: w.chars, pinyin: w.pinyin });
      pickedIdSet.add(id);
    }

    // ---- Tier 2: 低频新词 (max 30%) ----
    const remaining1 = allWords.filter(w => !pickedIdSet.has(w.id));
    const lowFreqWords = remaining1.filter(w => {
      const stats = wordStats[w.id];
      return !stats || stats.total < 3; // 练习次数少于3次视为低频
    });
    const maxLowFreqCount = Math.min(
      Math.max(1, Math.round(totalWords * 0.3)),
      lowFreqWords.length
    );
    const lowFreqPool = App.UI.shuffle(lowFreqWords);
    for (let i = 0; i < maxLowFreqCount; i++) {
      const w = lowFreqPool[i];
      result.push({ wordId: w.id, chars: w.chars, pinyin: w.pinyin });
      pickedIdSet.add(w.id);
    }

    // ---- Tier 3: 加权随机补足 ----
    const remaining2 = allWords.filter(w => !pickedIdSet.has(w.id));
    const needed = totalWords - result.length;
    const pool = [...remaining2];
    for (let i = 0; i < needed && pool.length > 0; i++) {
      const idx = App.UI.weightedRandomIndex(pool, w => {
        const stats = wordStats[w.id];
        const total = stats ? stats.total : 0;
        return 1 / (total + 1);
      });
      if (idx < 0) break;
      const picked = pool.splice(idx, 1)[0];
      result.push({ wordId: picked.id, chars: picked.chars, pinyin: picked.pinyin });
    }

    return App.UI.shuffle(result);
  },

  /** 按分类筛选词库 */
  getFilteredWords() {
    if (!window._selectedCategoryIds || window._selectedCategoryIds.length === 0) {
      return Store.data.words;
    }
    const expandedIds = new Set();
    window._selectedCategoryIds.forEach(catId => {
      Store.getCategoryAndDescendantIds(catId).forEach(id => expandedIds.add(id));
    });
    return Store.data.words.filter(w => {
      return w.chars.every(ch => {
        const info = Store.data.dict[ch];
        return info && info.categoryId && expandedIds.has(info.categoryId);
      });
    });
  },

  /** 更新今日挑战 */
  updateChallenge() {
    const el = document.getElementById('dailyChallenge');
    const textEl = document.getElementById('challengeText');
    const progressEl = document.getElementById('challengeProgress');
    const barFill = document.getElementById('challengeBarFill');
    if (!el || !textEl) return;

    const student = Store.getCurrentStudent();
    const errorWords = student.errorWordIds || [];
    const today = new Date().toISOString().slice(0, 10);
    const todayLog = (student.practiceLog || []).find(l => l.date === today);

    // 今日已消灭的错词数
    let slainToday = 0;
    let totalTarget = Math.min(errorWords.length, 5);
    if (totalTarget === 0) { el.style.display = 'none'; return; }

    if (todayLog) {
      todayLog.words.forEach(w => {
        if (errorWords.includes(w.wordId) && (!w.wrongIndices || w.wrongIndices.length === 0)) {
          slainToday++;
        }
      });
    }

    const past = Math.min(slainToday, totalTarget);
    const pct = Math.round(past / totalTarget * 100);
    el.style.display = 'block';
    textEl.innerHTML = `消灭 <strong>${totalTarget}</strong> 个错词 <span style="color:#e53e3e;">✅ ${past}/${totalTarget}</span>`;
    if (progressEl) progressEl.textContent = `${pct}%`;
    if (barFill) barFill.style.width = pct + '%';
    if (past >= totalTarget) {
      el.style.background = 'linear-gradient(135deg,#f0fff4,#ebf8ff)';
      el.style.borderColor = '#48bb78';
      textEl.innerHTML += ' 🎉 挑战完成！';
    }
  },

  /** 刷新出题面板 */
  refresh() {
    Store._data = Store._load(); // 从 localStorage 重新加载
    const student = Store.getCurrentStudent();
    const today = new Date().toISOString().slice(0, 10);

    const statusEl = document.getElementById('practiceStatus');
    const contentEl = document.getElementById('practiceContent');

    this.renderCategoryFilter();
    const filteredCount = this.getFilteredWords().length;
    const hasEnoughWords = Store.data.words.length > 0;

    if (!hasEnoughWords) {
      statusEl.style.display = 'block'; contentEl.style.display = 'none';
      statusEl.innerHTML = '<p class="empty-msg">📭 词库为空。请先在「字库管理」中添加字和词语。</p>';
      return;
    }
    statusEl.style.display = 'none'; contentEl.style.display = 'block';

    if (window._selectedCategoryIds.length > 0 && filteredCount === 0) {
      statusEl.style.display = 'block'; contentEl.style.display = 'none';
      statusEl.innerHTML = '<p class="empty-msg">📭 当前分类下没有可用词语。请调整分类筛选或在「字库管理」中添加词。</p>';
      return;
    }

    const summaryEl = document.getElementById('practiceSummary');
    const actionsEl = document.getElementById('practiceActions');
    const previewEl = document.getElementById('practicePreview');
    const correctEl = document.getElementById('correctionSection');

    const wcInput = document.getElementById('wordCountInput');
    if (wcInput) wcInput.value = window._wordCountSetting;

    const existingLog = (student.practiceLog || []).find(log => log.date === today);

    if (this._currentPractice && this._currentPractice.length > 0) {
      const words = this._currentPractice;
      summaryEl.innerHTML = `
        <span class="stat-badge">📅 ${today}</span>
        <span class="stat-badge">📝 共 <strong>${words.length}</strong> 词</span>`;
      actionsEl.innerHTML = `
        <button class="btn btn-primary" onclick="App.Practice.print()">🖨️ 打印</button>
        <button class="btn btn-warning" onclick="App.Practice.showCorrection()">✏️ 批改</button>
        <button class="btn btn-success" onclick="App.Practice.showSaveModal()">💾 保存练习</button>
        <button class="btn btn-outline" onclick="App.Practice.regenerate()">🔄 重新出题</button>`;
      previewEl.innerHTML = this.renderPreview(words);
      correctEl.style.display = 'none';
    } else if (existingLog) {
      const words = existingLog.words.map(w => {
        const wordObj = Store.data.words.find(x => x.id === w.wordId);
        if (w.wrongIndices) return { wordId: w.wordId, chars: w.chars || (wordObj ? wordObj.chars : []), pinyin: w.pinyin || (wordObj ? wordObj.pinyin : ''), wrongIndices: w.wrongIndices, wrongTypes: w.wrongTypes || {} };
        return wordObj ? { wordId: w.wordId, chars: wordObj.chars, pinyin: wordObj.pinyin, wrongIndices: w.correct === false ? [0] : [] } : null;
      }).filter(Boolean);
      this._currentPractice = words;
      summaryEl.innerHTML = `
        <span class="stat-badge">📅 ${today}</span>
        <span class="stat-badge">📝 共 <strong>${words.length}</strong> 词</span>`;
      actionsEl.innerHTML = `
        <button class="btn btn-primary" onclick="App.Practice.print()">🖨️ 打印</button>
        <button class="btn btn-warning" onclick="App.Practice.showCorrection()">✏️ 批改</button>
        <button class="btn btn-success" onclick="App.Practice.showSaveModal()">💾 保存练习</button>
        <button class="btn btn-outline" onclick="App.Practice.regenerate()">🔄 重新出题</button>`;
      previewEl.innerHTML = this.renderPreview(words);
      correctEl.style.display = 'none';
    } else {
      summaryEl.innerHTML = `
        <span class="stat-badge">📅 ${today}</span>
        <span class="stat-badge">词库共 <strong>${Store.data.words.length}</strong> 词</span>
        ${window._selectedCategoryIds.length > 0 ? `<span class="stat-badge">📂 筛选后 <strong>${this.getFilteredWords().length}</strong> 词</span>` : ''}`;
      actionsEl.innerHTML = `<button class="btn btn-success" onclick="App.Practice.generateToday()">🎲 生成今日练习</button>`;
      previewEl.innerHTML = '<p class="empty-msg">点击「生成今日练习」开始。</p>';
      correctEl.style.display = 'none';
    }
    this.renderSavedPractices();
    this.updateChallenge();
  },

  /** 生成今日练习 */
  generateToday() {
    const student = Store.getCurrentStudent();
    const wcInput = document.getElementById('wordCountInput');
    const desiredCount = wcInput ? Math.max(1, parseInt(wcInput.value) || 50) : 50;
    window._wordCountSetting = desiredCount;
    this._saveSettings();
    const practice = this.generate(student, desiredCount);
    if (practice.length === 0) { App.UI.toast('词库不足，无法生成练习', 'error'); return; }
    this._currentPractice = practice;
    App.UI.toast(`已生成 ${practice.length} 道练习（打印后将自动记录）`);
    this.refresh();
    if (App.Pet) App.Pet.onPracticeReady();
  },

  /** 重新出题 */
  regenerate() {
    const student = Store.getCurrentStudent();
    const wcInput = document.getElementById('wordCountInput');
    const desiredCount = wcInput ? Math.max(1, parseInt(wcInput.value) || 50) : 50;
    window._wordCountSetting = desiredCount;
    this._saveSettings();
    const practice = this.generate(student, desiredCount);
    if (practice.length === 0) { App.UI.toast('词库不足，无法生成练习', 'error'); return; }
    this._currentPractice = practice;
    App.UI.toast(`🔄 已重新出题，共 ${practice.length} 道`);
    this.refresh();
  },

  /** 构建田字格 HTML */
  buildTzgWordHtml(word) {
    const chars = word.chars || [];
    const pyParts = (word.pinyin || '').split(/\s+/);
    let html = '<div class="tzg-word">';
    chars.forEach((ch, ci) => {
      const py = pyParts[ci] || '';
      html += `<div class="tzg-char"><span class="pinyin-label">${py}</span><span class="tzg-box"></span></div>`;
    });
    html += '</div>';
    return html;
  },

  /** 渲染练习预览 */
  renderPreview(words) {
    if (words.length === 0) return '<p class="empty-msg">暂无练习。</p>';
    let html = '<div style="display:flex; flex-wrap:wrap; gap:12px 16px; justify-content:center; padding:12px 0;">';
    words.forEach((w, i) => {
      html += `<div style="display:flex; align-items:center; gap:6px; background:#f7fafc; border-radius:10px; padding:6px 10px;">
        <span style="color:#a0aec0; font-size:13px; min-width:20px;">${i + 1}.</span>
        ${this.buildTzgWordHtml(w)}
      </div>`;
    });
    html += '</div>';
    return html;
  },

  // ---- 批改 ----

  showCorrection() {
    const words = this._currentPractice;
    if (!words || words.length === 0) { App.UI.toast('没有练习可批改，请先生成', 'error'); return; }
    words.forEach(w => {
      if (!w.wrongIndices) w.wrongIndices = [];
      if (!w.wrongTypes) w.wrongTypes = {};
    });
    const previewEl = document.getElementById('practicePreview');
    const wordContainers = previewEl.querySelectorAll('[style*="display:flex"] > .tzg-word');
    words.forEach((w, wi) => {
      const container = wordContainers[wi]; if (!container) return;
      const boxes = container.querySelectorAll('.tzg-box');
      w.chars.forEach((ch, ci) => {
        const box = boxes[ci]; if (!box) return;
        const charText = document.createElement('span');
        charText.className = 'tzg-char-text';
        charText.textContent = ch;
        box.appendChild(charText);
        box.classList.add('with-answer');
        if (w.wrongIndices.includes(ci)) {
          const errType = w.wrongTypes && w.wrongTypes[ci] ? w.wrongTypes[ci] : 'wrong_char';
          box.classList.add(errType === 'blank_char' ? 'blank-char' : 'wrong-char');
        }
        box.onclick = function() { App.Practice.showErrorTypePopup(wi, ci, box); };
      });
    });
    document.getElementById('correctionSection').style.display = 'block';
  },

  showErrorTypePopup(wordIndex, charIndex, boxElement) {
    const words = this._currentPractice;
    if (!words || !words[wordIndex]) return;
    const w = words[wordIndex];
    if (!w.wrongTypes) w.wrongTypes = {};
    if (!w.wrongIndices) w.wrongIndices = [];
    document.querySelectorAll('.error-type-selector').forEach(el => el.remove());

    const isCurrentlyWrong = w.wrongIndices.includes(charIndex);
    const currentType = w.wrongTypes[charIndex] || 'wrong_char';

    const sel = document.createElement('div');
    sel.className = 'error-type-selector';
    sel.onclick = function(e) { e.stopPropagation(); };

    const options = [
      { value: '', label: '✅ 正确', cls: '' },
      { value: 'wrong_char', label: '❌ 错别字', cls: 'wrong-char' },
      { value: 'blank_char', label: '⬜ 留空字', cls: 'blank-char' },
    ];
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'error-type-btn';
      if ((isCurrentlyWrong && opt.value === currentType) || (!isCurrentlyWrong && opt.value === '')) {
        btn.classList.add('selected');
      }
      btn.textContent = opt.label;
      btn.onclick = function(e) {
        e.stopPropagation();
        App.Practice.setCharErrorType(wordIndex, charIndex, opt.value);
        sel.remove();
      };
      sel.appendChild(btn);
    });
    boxElement.style.position = 'relative';
    boxElement.appendChild(sel);
    setTimeout(() => {
      document.addEventListener('click', function closePopup() {
        if (sel.parentNode) sel.remove();
        document.removeEventListener('click', closePopup);
      }, { once: true });
    }, 10);
  },

  setCharErrorType(wordIndex, charIndex, type) {
    const words = this._currentPractice;
    if (!words || !words[wordIndex]) return;
    const w = words[wordIndex];
    if (!w.wrongTypes) w.wrongTypes = {};
    if (!w.wrongIndices) w.wrongIndices = [];
    const idx = w.wrongIndices.indexOf(charIndex);
    if (type === '') {
      if (idx >= 0) w.wrongIndices.splice(idx, 1);
      delete w.wrongTypes[charIndex];
    } else {
      w.wrongTypes[charIndex] = type;
      if (idx < 0) w.wrongIndices.push(charIndex);
    }
    const previewEl = document.getElementById('practicePreview');
    const wordContainers = previewEl.querySelectorAll('[style*="display:flex"] > .tzg-word');
    const container = wordContainers[wordIndex];
    if (container) {
      const boxes = container.querySelectorAll('.with-answer');
      if (boxes && boxes[charIndex]) {
        const box = boxes[charIndex];
        box.classList.remove('wrong', 'wrong-char', 'blank-char');
        if (type === 'wrong_char') box.classList.add('wrong-char');
        else if (type === 'blank_char') box.classList.add('blank-char');
      }
    }
  },

  cancelCorrection() {
    const previewEl = document.getElementById('practicePreview');
    previewEl.querySelectorAll('.with-answer').forEach(box => {
      box.classList.remove('with-answer', 'wrong');
      const text = box.querySelector('.tzg-char-text');
      if (text) text.remove();
      box.onclick = null;
    });
    document.getElementById('correctionSection').style.display = 'none';
  },

  submitCorrection() {
    const student = Store.getCurrentStudent();
    const today = new Date().toISOString().slice(0, 10);
    if (this._currentPractice) {
      if (student.practiceLog) {
        student.practiceLog = student.practiceLog.filter(log => log.date !== today);
      }
      const logEntry = {
        date: today,
        words: this._currentPractice.map(w => ({
          wordId: w.wordId, chars: w.chars, pinyin: w.pinyin,
          wrongIndices: w.wrongIndices || [], wrongTypes: w.wrongTypes || {}
        }))
      };
      if (!student.practiceLog) student.practiceLog = [];
      student.practiceLog.push(logEntry);
      Store.save();
    }
    const log = (student.practiceLog || []).find(l => l.date === today);
    if (!log) { App.UI.toast('没有找到今日练习', 'error'); return; }

    log.words.forEach(w => {
      const isCorrect = !w.wrongIndices || w.wrongIndices.length === 0;
      const stats = student.wordStats[w.wordId] || { total: 0, wrong: 0, lastDate: '' };
      stats.total = (stats.total || 0) + 1;
      if (!isCorrect) stats.wrong = (stats.wrong || 0) + 1;
      stats.lastDate = today;
      student.wordStats[w.wordId] = stats;
      if (!isCorrect) {
        if (!student.errorCharIds) student.errorCharIds = {};
        w.wrongIndices.forEach(ci => {
          const ch = w.chars[ci];
          if (!student.errorCharIds[ch]) student.errorCharIds[ch] = 0;
          student.errorCharIds[ch]++;
        });
        if (!student.errorWordIds) student.errorWordIds = [];
        if (!student.errorWordIds.includes(w.wordId)) student.errorWordIds.push(w.wordId);
      } else {
        student.errorWordIds = (student.errorWordIds || []).filter(id => id !== w.wordId);
      }
    });
    Store.save();
    App.UI.toast('✅ 批改结果已保存！');
    document.getElementById('correctionSection').style.display = 'none';
    this.refresh();

    // 触发精灵交互
    if (App.Pet) {
      const isPerfect = log.words.every(w => !w.wrongIndices || w.wrongIndices.length === 0);
      const beforeCount = student.errorWordIds.length;
      // 重新计算错误词数（提交后可能已移除）
      const afterCount = (student.errorWordIds || []).length;
      const slainErrors = Math.max(0, beforeCount - afterCount);
      App.Pet.onPracticeSubmitted({ isPerfect, slainErrors, total: log.words.length });
    }
  },

  // ---- 打印 ----

  print() {
    const words = this._currentPractice;
    if (!words || words.length === 0) { App.UI.toast('没有练习可打印', 'error'); return; }
    const COLS = 5, AVAIL_WIDTH = 186, COL_GAP = 2, CHAR_GAP = 1.5, IDX_W = 4, CELL_PAD_H = 4;
    const colContent = (AVAIL_WIDTH - (COLS - 1) * COL_GAP) / COLS - CELL_PAD_H;
    let boxSize = (colContent - IDX_W - 1.4 - CHAR_GAP) / 2;
    boxSize = Math.max(12, Math.min(22, Math.round(boxSize * 2) / 2));
    const scaleVal = boxSize / 18;
    const scale = scaleVal.toFixed(3);
    const rowH = (3 + 1 * scaleVal + boxSize) + 3;
    const ROW_GAP = 2.5, AVAIL_HEIGHT = 273;
    const ROWS = Math.max(3, Math.floor((AVAIL_HEIGHT + ROW_GAP) / (rowH + ROW_GAP)));
    const PER_PAGE = COLS * ROWS;

    let fullHtml = '';
    for (let pageStart = 0; pageStart < words.length; pageStart += PER_PAGE) {
      const pageWords = words.slice(pageStart, pageStart + PER_PAGE);
      const needBreak = pageStart + PER_PAGE < words.length;
      fullHtml += `<div class="print-page" style="${needBreak ? 'page-break-after:always;' : ''} --box:${boxSize}mm; --scale:${scale};">
        <div class="print-grid" style="grid-template-rows:repeat(${ROWS}, auto);">`;
      pageWords.forEach((w, wi) => {
        const idx = pageStart + wi + 1;
        fullHtml += `<div class="print-word-cell"><span class="print-word-index">${idx}.</span>${this.buildTzgWordHtml(w)}</div>`;
      });
      for (let j = pageWords.length; j < PER_PAGE; j++) {
        fullHtml += '<div class="print-word-cell" style="visibility:hidden;"></div>';
      }
      fullHtml += '</div></div>';
    }
    document.getElementById('printArea').innerHTML = fullHtml;
    setTimeout(() => window.print(), 200);
  },

  // ---- 已保存练习 ----

  getSavedPractices() {
    try {
      const raw = localStorage.getItem(this._savedPracticesKey);
      if (raw) { const d = JSON.parse(raw); if (Array.isArray(d)) return d; }
    } catch (e) { /* ignore */ }
    return [];
  },

  savePracticesToStorage(practices) {
    try { localStorage.setItem(this._savedPracticesKey, JSON.stringify(practices)); }
    catch (e) { App.UI.toast('保存失败：存储空间不足', 'error'); }
  },

  showSaveModal() {
    const words = this._currentPractice;
    if (!words || words.length === 0) { App.UI.toast('没有练习可保存，请先生成练习', 'error'); return; }
    const input = document.getElementById('savePracticeNameInput');
    const today = new Date().toISOString().slice(0, 10);
    input.value = `练习 ${today}（${words.length}词）`;
    document.getElementById('savePracticeModal').classList.add('show');
    setTimeout(() => input.focus(), 100);
  },

  confirmSave() {
    const input = document.getElementById('savePracticeNameInput');
    const name = input.value.trim();
    if (!name) { App.UI.toast('请输入练习名称', 'error'); return; }
    const words = this._currentPractice;
    if (!words || words.length === 0) { App.UI.toast('没有练习可保存', 'error'); return; }
    const practices = this.getSavedPractices();
    if (practices.find(p => p.name === name)) {
      App.UI.toast(`已存在同名练习「${name}」`, 'info');
      document.getElementById('savePracticeModal').classList.remove('show');
      return;
    }
    const newPractice = {
      id: 'sp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name,
      createdAt: new Date().toISOString(),
      words: words.map(w => ({ wordId: w.wordId, chars: [...w.chars], pinyin: w.pinyin }))
    };
    practices.push(newPractice);
    this.savePracticesToStorage(practices);
    document.getElementById('savePracticeModal').classList.remove('show');
    App.UI.toast(`✅ 已保存练习「${name}」`);
    this.renderSavedPractices();
  },

  async loadSaved(id) {
    const practices = this.getSavedPractices();
    const saved = practices.find(p => p.id === id);
    if (!saved) { App.UI.toast('未找到该练习', 'error'); return; }
    const confirmed = await App.UI.showConfirm(`确定加载保存的练习「${saved.name}」吗？\n当前未保存的练习将被替换。`);
    if (!confirmed) return;
    this._currentPractice = saved.words.map(w => ({ wordId: w.wordId, chars: [...w.chars], pinyin: w.pinyin }));
    App.UI.toast(`📂 已加载练习「${saved.name}」`);
    this.refresh();
  },

  async deleteSaved(id) {
    const practices = this.getSavedPractices();
    const saved = practices.find(p => p.id === id);
    if (!saved) return;
    const confirmed = await App.UI.showConfirm(`确定删除保存的练习「${saved.name}」吗？`);
    if (!confirmed) return;
    this.savePracticesToStorage(practices.filter(p => p.id !== id));
    App.UI.toast(`已删除练习「${saved.name}」`);
    this.renderSavedPractices();
  },

  renderSavedPractices() {
    const container = document.getElementById('savedPracticesList');
    if (!container) return;
    const practices = this.getSavedPractices();
    if (practices.length === 0) {
      container.innerHTML = '<p class="empty-msg">暂无保存的练习。生成练习后点击「💾 保存练习」即可保存。</p>';
      return;
    }
    practices.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    practices.forEach(p => {
      const date = p.createdAt.slice(0, 10);
      html += `<div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f7fafc;border-radius:10px;flex-wrap:wrap;border:1px solid #e2e8f0;">
        <span style="font-weight:600;flex:1;min-width:120px;">📄 ${p.name}</span>
        <span style="font-size:12px;color:#a0aec0;">📅 ${date}</span>
        <span style="font-size:12px;color:#a0aec0;">📝 ${p.words.length} 词</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-primary btn-sm" onclick="App.Practice.loadSaved('${p.id}')">📂 加载</button>
          <button class="btn btn-danger btn-sm" onclick="App.Practice.deleteSaved('${p.id}')">🗑️ 删除</button>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  },

  // ---- 出题面板分类筛选 ----

  renderCategoryFilter() {
    const container = document.getElementById('categoryFilterList');
    if (!container) return;
    const flat = App.Library.getAllCategoriesFlat(Store.data.categories || []);
    if (flat.length === 0) {
      container.innerHTML = '<span style="font-size:13px;color:#a0aec0;">暂无分类</span>';
      return;
    }
    let html = '';
    flat.forEach(c => {
      const selected = window._selectedCategoryIds.includes(c.id);
      html += `<span onclick="App.Practice.toggleCategoryFilter('${c.id}')"
        style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:16px;cursor:pointer;font-size:13px;
               border:2px solid ${selected ? '#667eea' : '#e2e8f0'};background:${selected ? '#ebf4ff' : '#fff'};
               color:${selected ? '#667eea' : '#718096'};font-weight:${selected ? '600' : '400'};user-select:none;">
        ${selected ? '✓' : ''} ${c.name}</span>`;
    });
    container.innerHTML = html;
  },

  toggleCategoryFilter(catId) {
    const idx = window._selectedCategoryIds.indexOf(catId);
    if (idx >= 0) window._selectedCategoryIds.splice(idx, 1);
    else window._selectedCategoryIds.push(catId);
    this._saveSettings();
    this.renderCategoryFilter();
  },

  clearCategoryFilter() {
    window._selectedCategoryIds = [];
    this._saveSettings();
    this.renderCategoryFilter();
  },

  _saveSettings() {
    try {
      localStorage.setItem('kanpinyin_settings', JSON.stringify({
        wordCount: window._wordCountSetting,
        categoryIds: window._selectedCategoryIds
      }));
    } catch (e) { /* ignore */ }
  },

  _loadSettings() {
    try {
      const raw = localStorage.getItem('kanpinyin_settings');
      if (raw) {
        const s = JSON.parse(raw);
        if (s.wordCount && s.wordCount > 0) window._wordCountSetting = s.wordCount;
        if (s.categoryIds && Array.isArray(s.categoryIds)) window._selectedCategoryIds = s.categoryIds;
      }
    } catch (e) { /* ignore */ }
  },
};

// 兼容旧版 onclick
window._currentPractice = new Proxy({}, {
  get() { return App.Practice._currentPractice; },
  set(v) { App.Practice._currentPractice = v; return true; }
});
window.generateTodayPractice = () => App.Practice.generateToday();
window.regeneratePractice = () => App.Practice.regenerate();
window.printPractice = () => App.Practice.print();
window.showCorrection = () => App.Practice.showCorrection();
window.cancelCorrection = () => App.Practice.cancelCorrection();
window.submitCorrection = () => App.Practice.submitCorrection();
window.showSavePracticeModal = () => App.Practice.showSaveModal();
window.confirmSavePractice = () => App.Practice.confirmSave();
window.loadSavedPractice = (id) => App.Practice.loadSaved(id);
window.deleteSavedPractice = (id) => App.Practice.deleteSaved(id);
window.toggleCategoryFilter = (id) => App.Practice.toggleCategoryFilter(id);
window.clearCategoryFilter = () => App.Practice.clearCategoryFilter();
window.renderSavedPractices = () => App.Practice.renderSavedPractices();
