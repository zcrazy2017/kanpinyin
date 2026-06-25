// ============================================================
//  Store — 集中状态管理（观察者模式）
//  单数据源 + 变更通知 + localStorage 持久化
// ============================================================
const STORAGE_KEY = 'kanpinyin_data';
const DATA_API = 'http://localhost:5001/api/data';

const Store = {
  _data: null,
  _listeners: new Map(), // Map<key, Set<callback>>

  /** 初始化：从 localStorage 加载数据 */
  init() {
    this._data = this._load();
    return this;
  },

  /** 获取完整数据（引用，直接修改后需调用 save） */
  get data() { return this._data; },

  /** 获取数据的只读快照 */
  getState() {
    return JSON.parse(JSON.stringify(this._data));
  },

  /** 获取默认数据结构 */
  _getDefault() {
    return { categories: [], dict: {}, words: [], students: [] };
  },

  /** 从 localStorage 加载 */
  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (!data.categories) data.categories = [];
        if (!data.dict) data.dict = {};
        if (!data.words) data.words = [];
        if (!data.students) data.students = [];
        return data;
      }
    } catch (e) { /* ignore */ }
    return this._getDefault();
  },

  /** 保存到 localStorage + 通知监听器 */
  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    this._notify('*');
  },

  /** 更新数据块并保存 */
  update(path, updater) {
    updater(this._data);
    this.save();
    if (path) this._notify(path);
  },

  /** 订阅数据变更 */
  subscribe(path, callback) {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    this._listeners.get(path).add(callback);
    return () => this._listeners.get(path)?.delete(callback); // 返回取消订阅函数
  },

  /** 通知指定路径的监听器 */
  _notify(path) {
    const cbs = this._listeners.get(path);
    if (cbs) cbs.forEach(fn => fn(this._data));
  },

  // ---- 便捷访问器 ----

  /** 获取/创建当前学生 */
  getCurrentStudent() {
    let s = this._data.students[0];
    if (!s) {
      s = { id: 'stu1', name: '同学', errorWordIds: [], errorCharIds: {}, wordStats: {}, practiceLog: [] };
      this._data.students.push(s);
      this.save();
    }
    return s;
  },

  /** 获取字库条目 */
  getChar(ch) { return this._data.dict[ch]; },

  /** 获取词语 */
  getWord(id) { return this._data.words.find(w => w.id === id); },

  /** 添加字 */
  addChar(ch, pinyin, categoryId) {
    if (this._data.dict[ch]) return false;
    this._data.dict[ch] = { pinyin, categoryId: categoryId || undefined };
    this.save();
    return true;
  },

  /** 删除字及相关词语 */
  removeChar(ch) {
    const related = this._data.words.filter(w => w.chars.includes(ch));
    related.forEach(w => {
      this._data.students.forEach(s => {
        s.errorWordIds = (s.errorWordIds || []).filter(id => id !== w.id);
        delete (s.wordStats || {})[w.id];
        (s.practiceLog || []).forEach(log => {
          log.words = log.words.filter(ww => ww.wordId !== w.id);
        });
      });
    });
    this._data.words = this._data.words.filter(w => !w.chars.includes(ch));
    delete this._data.dict[ch];
    this.save();
  },

  /** 添加词语 */
  addWord(chars, pinyin) {
    const id = this._data.words.length > 0
      ? Math.max(...this._data.words.map(w => w.id)) + 1 : 0;
    this._data.words.push({ id, chars, pinyin });
    this.save();
    return id;
  },

  /** 删除词语 */
  removeWord(wordId) {
    const idx = this._data.words.findIndex(w => w.id === wordId);
    if (idx < 0) return;
    this._data.students.forEach(s => {
      s.errorWordIds = (s.errorWordIds || []).filter(id => id !== wordId);
      delete (s.wordStats || {})[wordId];
      (s.practiceLog || []).forEach(log => {
        log.words = log.words.filter(ww => ww.wordId !== wordId);
      });
    });
    this._data.words.splice(idx, 1);
    this.save();
  },

  // ---- 文件持久化（通过后端 API） ----

  DATA_FILE_NAMES: {
    dict: '字库', words: '词库', categories: '分类', students: '学生数据',
  },

  async saveFile(dataType) {
    const label = this.DATA_FILE_NAMES[dataType] || dataType;
    try {
      let payload;
      if (dataType === 'dict') payload = this._data.dict;
      else if (dataType === 'words') payload = this._data.words;
      else if (dataType === 'categories') payload = this._data.categories;
      else if (dataType === 'students') payload = this._data.students;
      else throw new Error('未知类型');

      const resp = await fetch(`${DATA_API}/save/${dataType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
      });
      const result = await resp.json();
      if (resp.ok) App.UI.toast(`💾 ${label} 已保存`);
      else App.UI.toast(`保存${label}失败: ${result.error}`, 'error');
    } catch (e) {
      App.UI.toast(`保存${label}失败: ${e.message}`, 'error');
    }
  },

  async loadFile(dataType) {
    const label = this.DATA_FILE_NAMES[dataType] || dataType;
    try {
      const resp = await fetch(`${DATA_API}/load/${dataType}`);
      const result = await resp.json();
      if (resp.ok && result.data !== null && result.data !== undefined) {
        const loaded = result.data;
        if (dataType === 'dict') Object.assign(this._data.dict, loaded);
        else if (dataType === 'words') {
          const existingIds = new Set(this._data.words.map(w => w.id));
          loaded.forEach(w => {
            if (!existingIds.has(w.id)) { this._data.words.push(w); existingIds.add(w.id); }
          });
        } else if (dataType === 'categories') this._data.categories = loaded;
        else if (dataType === 'students') {
          loaded.forEach(ls => {
            if (!this._data.students.find(s => s.id === ls.id)) this._data.students.push(ls);
          });
        }
        this.save();
        App.UI.toast(`📂 ${label} 已加载`);
        App.refreshAll();
        if (App.Dict) App.Dict.render();
      } else {
        App.UI.toast(`加载${label}失败: ${result.message || '文件不存在'}`, 'info');
      }
    } catch (e) {
      App.UI.toast(`加载${label}失败: 后端未连接`, 'error');
    }
  },

  /** 页面打开时静默加载字库、词库、分类 */
  async autoLoadDataFiles() {
    const types = ['dict', 'words', 'categories'];
    for (const type of types) {
      try {
        const resp = await fetch(`${DATA_API}/load/${type}`);
        const result = await resp.json();
        if (resp.ok && result.data !== null && result.data !== undefined) {
          const loaded = result.data;
          if (type === 'dict') {
            Object.entries(loaded).forEach(([ch, info]) => {
              if (!this._data.dict[ch]) this._data.dict[ch] = info;
            });
          } else if (type === 'words') {
            const existingIds = new Set(this._data.words.map(w => w.id));
            loaded.forEach(w => {
              if (!existingIds.has(w.id)) { this._data.words.push(w); existingIds.add(w.id); }
            });
          } else if (type === 'categories') {
            if (!this._data.categories || this._data.categories.length === 0) {
              this._data.categories = loaded;
            }
          }
          this.save();
        }
      } catch (e) { /* 静默失败 */ }
    }
    App.refreshAll();
    if (App.Dict) App.Dict.render();
  },

  /** 静默加载分类数据（从文件） */
  async autoLoadCategoriesSilently() {
    try {
      const resp = await fetch(`${DATA_API}/load/categories`);
      const result = await resp.json();
      if (resp.ok && result.data !== null && result.data !== undefined) {
        this._data.categories = result.data;
        this.save();
        if (App.Library) App.Library.refreshCategoryTreeOnly();
        if (App.Library) App.Library.renderCategoryBrowse();
      }
    } catch (e) { /* 静默失败 */ }
  },

  // ---- 辅助方法 ----

  /** 获取某分类及其所有子分类ID的集合 */
  getCategoryAndDescendantIds(catId) {
    const result = new Set([catId]);
    const collectDescendants = (node) => {
      if (node && node.children) {
        node.children.forEach(child => { result.add(child.id); collectDescendants(child); });
      }
    };
    const findNode = (nodes) => {
      if (!nodes) return false;
      for (const n of nodes) {
        if (n.id === catId) { collectDescendants(n); return true; }
        if (n.children && findNode(n.children)) return true;
      }
      return false;
    };
    findNode(this._data.categories);
    return result;
  },

  // ============================================================
  //  统计助手 — 提升学习能力与动力
  // ============================================================

  /** 计算连续学习天数 */
  computeStreak() {
    const student = this.getCurrentStudent();
    const dates = (student.practiceLog || [])
      .map(l => l.date)
      .sort()
      .reverse();
    if (dates.length === 0) return 0;
    let streak = 1;
    const today = new Date();
    // 检查今天或昨天是否有练习（允许当天未练习时仍计算连续性）
    const latest = new Date(dates[0]);
    const diff = Math.round((today - latest) / (1000 * 60 * 60 * 24));
    if (diff > 1) return 0; // 超过1天没练，连续中断

    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const gap = Math.round((prev - curr) / (1000 * 60 * 60 * 24));
      if (gap === 1) streak++;
      else break;
    }
    return streak;
  },

  /** 计算字的掌握等级
   *  @returns { level: 0|1|2|3, label: string, stars: string }
   */
  getCharMasteryLevel(ch) {
    const student = this.getCurrentStudent();
    const logs = student.practiceLog || [];
    let total = 0, wrong = 0;
    logs.forEach(log => {
      (log.words || []).forEach(w => {
        (w.chars || []).forEach((c, ci) => {
          if (c === ch) { total++; if (w.wrongIndices && w.wrongIndices.includes(ci)) wrong++; }
        });
      });
    });
    const rate = total > 0 ? Math.round((total - wrong) / total * 100) : 0;

    if (total === 0) return { level: 0, label: '未学', stars: '☆' };
    if (total >= 5 && rate >= 95) return { level: 3, label: '掌握', stars: '⭐⭐⭐' };
    if (total >= 3 && rate >= 80) return { level: 2, label: '巩固', stars: '⭐⭐' };
    return { level: 1, label: '初识', stars: '⭐' };
  },

  /** 判断是否为顽固错字（最近3次练习中错误>=2次） */
  isStubbornError(ch) {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));
    const recent = logs.slice(0, 3);
    let errorCount = 0, appearanceCount = 0;
    recent.forEach(log => {
      (log.words || []).forEach(w => {
        (w.chars || []).forEach((c, ci) => {
          if (c === ch) {
            appearanceCount++;
            if (w.wrongIndices && w.wrongIndices.includes(ci)) errorCount++;
          }
        });
      });
    });
    return appearanceCount >= 2 && errorCount >= 2;
  },

  /** 获取各分类的正确率 */
  getCategoryAccuracy() {
    const student = this.getCurrentStudent();
    const logs = student.practiceLog || [];
    const catStats = {}; // { catId: { total, wrong, name } }

    const flatCats = [];
    const flatten = (nodes, parentPath) => {
      (nodes || []).forEach(n => {
        const path = parentPath ? parentPath + ' / ' + n.name : n.name;
        flatCats.push({ id: n.id, name: path });
        if (n.children) flatten(n.children, path);
      });
    };
    flatten(this._data.categories, '');

    flatCats.forEach(cat => {
      const expandedIds = this.getCategoryAndDescendantIds(cat.id);
      let total = 0, wrong = 0;
      logs.forEach(log => {
        (log.words || []).forEach(w => {
          const inCat = w.chars.every(ch => {
            const info = this._data.dict[ch];
            return info && info.categoryId && expandedIds.has(info.categoryId);
          });
          if (inCat) {
            total += w.chars.length;
            if (w.wrongIndices) wrong += w.wrongIndices.length;
          }
        });
      });
      catStats[cat.id] = { name: cat.name, total, wrong, rate: total > 0 ? Math.round((total - wrong) / total * 100) : -1 };
    });

    return catStats;
  },

  /** 检查成就解锁状态 */
  checkAchievements() {
    const student = this.getCurrentStudent();
    const logs = student.practiceLog || [];
    const dates = logs.map(l => l.date).sort();
    const totalDays = dates.length;
    const totalWords = logs.reduce((s, l) => s + (l.words || []).length, 0);
    const streak = this.computeStreak();

    // 统计掌握的字数
    const masteredChars = Object.keys(this._data.dict).filter(ch =>
      this.getCharMasteryLevel(ch).level >= 3
    ).length;

    // 统计总练习字数（不重复）
    const practicedChars = new Set();
    logs.forEach(l => (l.words || []).forEach(w => (w.chars || []).forEach(c => practicedChars.add(c))));

    return [
      { id: 'first', label: '🎯 初次练习', desc: '完成第一次练习', unlocked: totalDays >= 1, icon: '🎯' },
      { id: 'week_streak', label: '🔥 七日打卡', desc: '连续学习7天', unlocked: streak >= 7, icon: '🔥' },
      { id: 'month_streak', label: '💪 月常坚持', desc: '连续学习30天', unlocked: streak >= 30, icon: '💪' },
      { id: 'hundred_words', label: '📝 百词斩', desc: '累计练习100个词语', unlocked: totalWords >= 100, icon: '📝' },
      { id: 'thousand_words', label: '📚 千词达人', desc: '累计练习1000个词语', unlocked: totalWords >= 1000, icon: '📚' },
      { id: 'ten_thousand', label: '🏆 万词王者', desc: '累计练习10000个词语', unlocked: totalWords >= 10000, icon: '🏆' },
      { id: 'perfect_day', label: '💯 全对日', desc: '某次练习正确率100%', unlocked: logs.some(l => {
        const w = l.words || []; return w.length > 0 && w.every(x => !x.wrongIndices || x.wrongIndices.length === 0);
      }), icon: '💯' },
      { id: 'master_ten', label: '⭐ 初露锋芒', desc: '掌握10个字（三星）', unlocked: masteredChars >= 10, icon: '⭐' },
      { id: 'master_fifty', label: '🌟 学识渊博', desc: '掌握50个字（三星）', unlocked: masteredChars >= 50, icon: '🌟' },
      { id: 'master_hundred', label: '👑 汉字大师', desc: '掌握100个字（三星）', unlocked: masteredChars >= 100, icon: '👑' },
      { id: 'persistent', label: '🔁 屡败屡战', desc: '同一个字错3次后终于写对', unlocked: false, icon: '🔁' }, // 特殊逻辑需额外实现
    ];
  },

  // ============================================================
  //  进阶统计助手
  // ============================================================

  /** 计算某个字的进步趋势（近期 vs 远期错误率对比）
   *  @returns { trend: 'up'|'down'|'stable'|'none', change: number, recentRate: number, earlierRate: number }
   */
  getCharProgressTrend(ch) {
    const student = this.getCurrentStudent();
    const allLogs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    if (allLogs.length < 2) return { trend: 'none', change: 0, recentRate: 0, earlierRate: 0 };

    const mid = Math.floor(allLogs.length / 2);
    const earlierLogs = allLogs.slice(0, mid);
    const recentLogs = allLogs.slice(mid);

    const countStats = (logs) => {
      let total = 0, wrong = 0;
      logs.forEach(function(l) {
        (l.words || []).forEach(function(w) {
          (w.chars || []).forEach(function(c, ci) {
            if (c === ch) { total++; if (w.wrongIndices && w.wrongIndices.includes(ci)) wrong++; }
          });
        });
      });
      return { total, wrong, rate: total > 0 ? Math.round((total - wrong) / total * 100) : -1 };
    };

    const earlier = countStats(earlierLogs);
    const recent = countStats(recentLogs);

    let change = 0;
    let trend = 'none';
    if (earlier.rate >= 0 && recent.rate >= 0) {
      change = recent.rate - earlier.rate;
      trend = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
    }

    return { trend, change, recentRate: recent.rate, earlierRate: earlier.rate };
  },

  /** 错误类型占比分析
   *  @returns { totalErrors, wrongCharCount, blankCharCount, wrongCharPct, blankCharPct }
   */
  getErrorTypeStats() {
    const student = this.getCurrentStudent();
    const logs = student.practiceLog || [];
    let totalErrors = 0, wrongCharCount = 0, blankCharCount = 0;

    logs.forEach(function(l) {
      (l.words || []).forEach(function(w) {
        (w.wrongIndices || []).forEach(function(ci) {
          totalErrors++;
          const errType = (w.wrongTypes || {})[ci] || 'wrong_char';
          if (errType === 'blank_char') blankCharCount++;
          else wrongCharCount++;
        });
      });
    });

    return {
      totalErrors,
      wrongCharCount,
      blankCharCount,
      wrongCharPct: totalErrors > 0 ? Math.round(wrongCharCount / totalErrors * 100) : 0,
      blankCharPct: totalErrors > 0 ? Math.round(blankCharCount / totalErrors * 100) : 0,
    };
  },

  /** 复习紧迫度排序
   *  基于最近错误时间 + 错误频率计算复习优先级
   *  @returns { Array<{ char, pinyin, score, daysSinceLastError, errorCount }> } 按紧迫度降序
   */
  getReviewUrgency() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const charStats = {}; // { ch: { lastErrorDate, errorCount, totalCount } }

    logs.forEach(l => {
      (l.words || []).forEach(w => {
        (w.chars || []).forEach((c, ci) => {
          if (!charStats[c]) charStats[c] = { lastErrorDate: null, errorCount: 0, totalCount: 0, lastPracticeDate: l.date };
          charStats[c].totalCount++;
          charStats[c].lastPracticeDate = l.date;
          if (w.wrongIndices && w.wrongIndices.includes(ci)) {
            charStats[c].errorCount++;
            charStats[c].lastErrorDate = l.date;
          }
        });
      });
    });

    const today = new Date();
    const results = Object.entries(charStats)
      .filter(([ch]) => this._data.dict[ch]) // 只保留存在于字库中的字
      .map(([ch, stats]) => {
        const daysSinceLastError = stats.lastErrorDate
          ? Math.round((today - new Date(stats.lastErrorDate)) / (1000 * 60 * 60 * 24))
          : 999;
        const daysSinceLastPractice = Math.round((today - new Date(stats.lastPracticeDate)) / (1000 * 60 * 60 * 24));
        const errorRate = stats.totalCount > 0 ? stats.errorCount / stats.totalCount : 0;
        // 评分公式：错误率 * 20 + (近期错误的加权) + (久未复习的加权)
        let score = errorRate * 50;
        if (daysSinceLastError <= 1) score += 30;   // 昨天还错的 → 紧急
        else if (daysSinceLastError <= 3) score += 20;
        else if (daysSinceLastError <= 7) score += 10;
        if (daysSinceLastPractice >= 7 && errorRate > 0) score += 15; // 很久没复习的老错字
        return {
          char: ch,
          pinyin: this._data.dict[ch]?.pinyin || '',
          score: Math.round(score),
          daysSinceLastError: daysSinceLastError === 999 ? -1 : daysSinceLastError,
          daysSinceLastPractice,
          errorCount: stats.errorCount,
          totalCount: stats.totalCount,
          errorRate: Math.round(errorRate * 100),
        };
      })
      .filter(r => r.errorCount > 0) // 只有犯过错的字才需要复习
      .sort((a, b) => b.score - a.score);

    return results;
  },

  /** 生成进步周报
   *  @returns { { dateRange, totalDays, totalWords, avgRate, improvedChars, declinedChars, weakestChars, newMastered, errorTypeStats } }
   */
  generateWeeklyReport() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekLogs = logs.filter(l => new Date(l.date) >= weekAgo && new Date(l.date) <= now);
    const earlierLogs = logs.filter(l => new Date(l.date) < weekAgo);

    if (weekLogs.length === 0) return null;

    // 本周统计
    const totalDays = weekLogs.length;
    const totalWords = weekLogs.reduce((s, l) => s + (l.words || []).length, 0);
    let totalWrong = 0;
    weekLogs.forEach(function(l) {
      (l.words || []).forEach(function(w) {
        if (w.wrongIndices && w.wrongIndices.length > 0) totalWrong++;
      });
    });
    const avgRate = totalWords > 0 ? Math.round((totalWords - totalWrong) / totalWords * 100) : 0;

    // 进步/退步的字
    const improvedChars = [];
    const declinedChars = [];
    const charChanges = {};

    weekLogs.forEach(function(l) {
      (l.words || []).forEach(function(w) {
        (w.chars || []).forEach(function(c, ci) {
          if (!charChanges[c]) charChanges[c] = { recentTotal: 0, recentWrong: 0, earlierTotal: 0, earlierWrong: 0 };
          charChanges[c].recentTotal++;
          if (w.wrongIndices && w.wrongIndices.includes(ci)) charChanges[c].recentWrong++;
        });
      });
    });

    earlierLogs.forEach(function(l) {
      (l.words || []).forEach(function(w) {
        (w.chars || []).forEach(function(c, ci) {
          if (!charChanges[c]) return;
          charChanges[c].earlierTotal++;
          if (w.wrongIndices && w.wrongIndices.includes(ci)) charChanges[c].earlierWrong++;
        });
      });
    });

    Object.entries(charChanges).forEach(([ch, stats]) => {
      if (stats.recentTotal < 1) return;
      const recentRate = stats.recentTotal > 0 ? Math.round((stats.recentTotal - stats.recentWrong) / stats.recentTotal * 100) : 0;
      const earlierRate = stats.earlierTotal > 0 ? Math.round((stats.earlierTotal - stats.earlierWrong) / stats.earlierTotal * 100) : -1;
      if (earlierRate >= 0 && (recentRate - earlierRate) >= 20) improvedChars.push({ char: ch, change: recentRate - earlierRate });
      if (earlierRate >= 0 && (recentRate - earlierRate) <= -20) declinedChars.push({ char: ch, change: recentRate - earlierRate });
    });

    // 最薄弱单元（本周正确率最低的分类）
    const weakCats = Object.values(this.getCategoryAccuracy())
      .filter(c => c.total > 0 && c.rate >= 0)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 3);

    // 本周新掌握的3星字
    const newMastered = Object.keys(this._data.dict)
      .filter(ch => this.getCharMasteryLevel(ch).level >= 3)
      .filter(ch => {
        // 本周之前不是3星
        return true; // 简化处理
      });

    // 错误类型
    const errTypes = this.getErrorTypeStats();

    return {
      dateRange: `${weekAgo.toISOString().slice(0, 10)} ~ ${now.toISOString().slice(0, 10)}`,
      totalDays, totalWords, totalWrong, avgRate,
      improvedChars: improvedChars.sort((a, b) => b.change - a.change).slice(0, 5),
      declinedChars: declinedChars.sort((a, b) => a.change - b.change).slice(0, 5),
      weakestCats: weakCats,
      newMasteredCount: newMastered.length,
      errorTypeStats: errTypes,
    };
  },
};

// 暴露全局引用
window.Store = Store;
let appData = null;
Object.defineProperty(window, 'appData', {
  get() { return Store.data; },
  set(v) { /* read-only proxy */ },
});
