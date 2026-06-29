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
    dict: '字库', words: '词库', categories: '分类', students: '学生数据', saved_practices: '已保存练习',
  },

  async saveFile(dataType) {
    const label = this.DATA_FILE_NAMES[dataType] || dataType;
    try {
      let payload;
      if (dataType === 'dict') payload = this._data.dict;
      else if (dataType === 'words') payload = this._data.words;
      else if (dataType === 'categories') payload = this._data.categories;
      else if (dataType === 'students') payload = this._data.students;
      else if (dataType === 'saved_practices') {
        payload = App.Practice.getSavedPractices();
      }
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
        } else if (dataType === 'saved_practices') {
          if (Array.isArray(loaded) && loaded.length > 0) {
            App.Practice.savePracticesToStorage(loaded);
          }
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

  /** 启动时静默加载已保存练习 */
  async autoLoadSavedPractices() {
    try {
      const resp = await fetch(`${DATA_API}/load/saved_practices`);
      const result = await resp.json();
      if (resp.ok && Array.isArray(result.data) && result.data.length > 0) {
        App.Practice.savePracticesToStorage(result.data);
      }
    } catch (e) { /* 静默失败 */ }
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
    const unlockDates = student.achievementUnlockDates || {};

    // 统计掌握的字数
    const masteredChars = Object.keys(this._data.dict).filter(ch =>
      this.getCharMasteryLevel(ch).level >= 3
    ).length;

    // 统计总练习字数（不重复）
    const practicedChars = new Set();
    logs.forEach(l => (l.words || []).forEach(w => (w.chars || []).forEach(c => practicedChars.add(c))));

    // 挑战完成次数
    const challengeDates = student.challengeCompleteDates || [];
    const challengeCount = challengeDates.length;

    // 辅助：记录成就解锁日期
    const _recordAndGet = (id, condition, defaultDate) => {
      if (!condition) return null;
      if (unlockDates[id]) return unlockDates[id];
      // 首次解锁，记录日期
      unlockDates[id] = defaultDate || new Date().toISOString().slice(0, 10);
      student.achievementUnlockDates = unlockDates;
      this.save();
      return unlockDates[id];
    };

    const today = new Date().toISOString().slice(0, 10);
    const firstLogDate = dates.length > 0 ? dates[0] : today;
    const perfectLog = logs.find(l => {
      const w = l.words || []; return w.length > 0 && w.every(x => !x.wrongIndices || x.wrongIndices.length === 0);
    });
    const perfectDate = perfectLog ? perfectLog.date : null;

    return [
      { id: 'first', label: '🎯 初次练习', desc: '完成第一次练习', unlocked: totalDays >= 1, icon: '🎯',
        unlockedDate: _recordAndGet('first', totalDays >= 1, firstLogDate) },
      { id: 'week_streak', label: '🔥 七日打卡', desc: '连续学习7天', unlocked: streak >= 7, icon: '🔥',
        unlockedDate: _recordAndGet('week_streak', streak >= 7) },
      { id: 'month_streak', label: '💪 月常坚持', desc: '连续学习30天', unlocked: streak >= 30, icon: '💪',
        unlockedDate: _recordAndGet('month_streak', streak >= 30) },
      { id: 'hundred_words', label: '📝 百词斩', desc: '累计练习100个词语', unlocked: totalWords >= 100, icon: '📝',
        unlockedDate: _recordAndGet('hundred_words', totalWords >= 100) },
      { id: 'thousand_words', label: '📚 千词达人', desc: '累计练习1000个词语', unlocked: totalWords >= 1000, icon: '📚',
        unlockedDate: _recordAndGet('thousand_words', totalWords >= 1000) },
      { id: 'ten_thousand', label: '🏆 万词王者', desc: '累计练习10000个词语', unlocked: totalWords >= 10000, icon: '🏆',
        unlockedDate: _recordAndGet('ten_thousand', totalWords >= 10000) },
      { id: 'perfect_day', label: '💯 全对日', desc: '某次练习正确率100%', unlocked: !!perfectLog, icon: '💯',
        unlockedDate: _recordAndGet('perfect_day', !!perfectLog, perfectDate) },
      { id: 'master_ten', label: '⭐ 初露锋芒', desc: '掌握10个字（三星）', unlocked: masteredChars >= 10, icon: '⭐',
        unlockedDate: _recordAndGet('master_ten', masteredChars >= 10) },
      { id: 'master_fifty', label: '🌟 学识渊博', desc: '掌握50个字（三星）', unlocked: masteredChars >= 50, icon: '🌟',
        unlockedDate: _recordAndGet('master_fifty', masteredChars >= 50) },
      { id: 'master_hundred', label: '👑 汉字大师', desc: '掌握100个字（三星）', unlocked: masteredChars >= 100, icon: '👑',
        unlockedDate: _recordAndGet('master_hundred', masteredChars >= 100) },
      // ── 今日挑战相关成就 ──
      { id: 'challenge_first', label: '🎯 初战告捷', desc: '首次完成今日挑战（消灭错词）', unlocked: challengeCount >= 1, icon: '🎯',
        unlockedDate: _recordAndGet('challenge_first', challengeCount >= 1, challengeDates[0] || null) },
      { id: 'challenge_weekly', label: '📅 挑战达人', desc: '累计完成7次今日挑战', unlocked: challengeCount >= 7, icon: '📅',
        unlockedDate: _recordAndGet('challenge_weekly', challengeCount >= 7) },
      { id: 'challenge_monthly', label: '🏅 挑战大师', desc: '累计完成30次今日挑战', unlocked: challengeCount >= 30, icon: '🏅',
        unlockedDate: _recordAndGet('challenge_monthly', challengeCount >= 30) },
      // ── 拼音大闯关成就 ──
      { id: 'pinyin_game_clear', label: '🎮 拼音大师', desc: '完成拼音大闯关全部10关', unlocked: !!student.pinyinGameCleared, icon: '🎮',
        unlockedDate: _recordAndGet('pinyin_game_clear', !!student.pinyinGameCleared, student.pinyinGameClearDate || null) },
      { id: 'persistent', label: '🔁 屡败屡战', desc: '同一个字错3次后终于写对', unlocked: false, icon: '🔁', unlockedDate: null },
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

  /** 每日练习数据（用于学习日历热力图）
   *  @returns { Array<{ date, count, wrong, rate }> } 按日期排序
   */
  getDailyPracticeData() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    return logs.map(l => {
      const words = l.words || [];
      const total = words.length;
      const wrong = words.filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
      return { date: l.date, count: total, wrong, rate: total > 0 ? Math.round((total - wrong) / total * 100) : 100 };
    });
  },

  /** 声韵母错误统计
   *  @returns { { initials: {name, wrong, total}[], finals: {name, wrong, total}[] } }
   */
  getInitialFinalErrorStats() {
    const student = this.getCurrentStudent();
    const logs = student.practiceLog || [];
    const INITIALS = ['zh','ch','sh','b','p','m','f','d','t','n','l','g','k','h','j','q','x','r','z','c','s','y','w'];
    const stats = { init: {}, fin: {} };
    logs.forEach(l => (l.words || []).forEach(w => {
      (w.chars || []).forEach((c, ci) => {
        const info = this._data.dict[c];
        if (!info || !info.pinyin) return;
        const py = info.pinyin;
        const isWrong = w.wrongIndices && w.wrongIndices.includes(ci);
        // 声母
        let init = '';
        for (const i of INITIALS) { if (py.startsWith(i)) { init = i; break; } }
        if (!init) init = '(零声母)';
        if (!stats.init[init]) stats.init[init] = { total: 0, wrong: 0 };
        stats.init[init].total++;
        if (isWrong) stats.init[init].wrong++;
        // 韵母
        const final = init ? py.slice(init.length) : py;
        if (!stats.fin[final]) stats.fin[final] = { total: 0, wrong: 0 };
        stats.fin[final].total++;
        if (isWrong) stats.fin[final].wrong++;
      });
    }));
    return {
      initials: Object.entries(stats.init).map(([k, v]) => ({ name: k, ...v, rate: v.total > 0 ? Math.round((v.total - v.wrong) / v.total * 100) : 100 })).sort((a, b) => b.wrong - a.wrong),
      finals: Object.entries(stats.fin).map(([k, v]) => ({ name: k, ...v, rate: v.total > 0 ? Math.round((v.total - v.wrong) / v.total * 100) : 100 })).sort((a, b) => b.wrong - a.wrong),
    };
  },

  /** 错词复现率统计
   *  @returns { { rarely, sometimes, often } } 每个词的复现次数
   */
  getWordReErrorStats() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const wordErrors = {}; // wordId -> [{ date, wrong }]
    logs.forEach(l => (l.words || []).forEach(w => {
      if (!wordErrors[w.wordId]) wordErrors[w.wordId] = [];
      wordErrors[w.wordId].push({ date: l.date, wrong: (w.wrongIndices || []).length > 0 });
    }));
    const result = { rarely: 0, sometimes: 0, often: 0, total: 0 };
    Object.values(wordErrors).forEach(entries => {
      const errorCount = entries.filter(e => e.wrong).length;
      if (errorCount === 0) { result.rarely++; }
      else if (errorCount <= 1) { result.sometimes++; }
      else { result.often++; }
      result.total++;
    });
    return result;
  },

  /** 分级掌握进度
   *  @returns { { levels: {level, label, count, stars}[], totalChars } }
   */
  getMasteryDistribution() {
    const levelCounts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    Object.keys(this._data.dict).forEach(ch => {
      const lv = this.getCharMasteryLevel(ch).level;
      levelCounts[lv]++;
    });
    const labels = { 0: '未学', 1: '初识', 2: '巩固', 3: '掌握' };
    const stars = { 0: '☆', 1: '⭐', 2: '⭐⭐', 3: '⭐⭐⭐' };
    return {
      levels: [0, 1, 2, 3].map(lv => ({ level: lv, label: labels[lv], count: levelCounts[lv], stars: stars[lv] })),
      totalChars: Object.keys(this._data.dict).length,
    };
  },

  /** 剩余学习量估算 */
  getRemainingStudyEstimate() {
    const dist = this.getMasteryDistribution();
    const logs = (this.getCurrentStudent().practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const unlearned = dist.levels[0].count;
    const learning = dist.levels[1].count + dist.levels[2].count;
    const mastered = dist.levels[3].count;
    // 估算每日练习量
    let totalDays = logs.length;
    let avgPerDay = 0;
    if (totalDays > 0) {
      const totalWords = logs.reduce((s, l) => s + (l.words || []).length, 0);
      avgPerDay = Math.round(totalWords / totalDays);
    }
    // 假设每天练 avgPerDay 词，每词含约1.5个新字
    const charsPerDay = Math.max(1, Math.round(avgPerDay * 0.3));
    const remainingDays = charsPerDay > 0 ? Math.ceil(unlearned / charsPerDay) : 999;
    return { unlearned, learning, mastered, totalChars: dist.totalChars, avgPerDay, remainingDays, progress: dist.totalChars > 0 ? Math.round(mastered / dist.totalChars * 100) : 0 };
  },

  /** 成绩趋势对比（本周 vs 上周）
   *  @returns { { thisWeek: {days, words, rate}, lastWeek: {days, words, rate}, change } }
   */
  getPeriodComparison() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const now = new Date();
    const calcWeek = (offset) => {
      const start = new Date(now); start.setDate(start.getDate() - start.getDay() - 7 * offset);
      const end = new Date(start); end.setDate(end.getDate() + 7);
      const s = start.toISOString().slice(0, 10), e = end.toISOString().slice(0, 10);
      const weekLogs = logs.filter(l => l.date >= s && l.date < e);
      const words = weekLogs.reduce((sum, l) => sum + (l.words || []).length, 0);
      const wrong = weekLogs.reduce((sum, l) => sum + (l.words || []).filter(w => w.wrongIndices?.length > 0).length, 0);
      return { days: weekLogs.length, words, wrong, rate: words > 0 ? Math.round((words - wrong) / words * 100) : 0 };
    };
    const thisWeek = calcWeek(0);
    const lastWeek = calcWeek(1);
    return { thisWeek, lastWeek, change: thisWeek.rate - lastWeek.rate };
  },

  /** 完美练习统计 */
  getPerfectPracticeStats() {
    const student = this.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    let perfectCount = 0, totalCount = logs.length;
    let currentStreak = 0, maxStreak = 0;
    logs.forEach(l => {
      const isPerfect = (l.words || []).every(w => !w.wrongIndices || w.wrongIndices.length === 0);
      if (isPerfect) {
        perfectCount++;
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });
    const rate = totalCount > 0 ? Math.round(perfectCount / totalCount * 100) : 0;
    return { perfectCount, totalCount, rate, maxStreak, currentStreak: totalCount > 0 && (logs[logs.length - 1]?.words || []).every(w => !w.wrongIndices?.length) ? currentStreak : 0 };
  },
};

// 暴露全局引用
window.Store = Store;
let appData = null;
Object.defineProperty(window, 'appData', {
  get() { return Store.data; },
  set(v) { /* read-only proxy */ },
});
