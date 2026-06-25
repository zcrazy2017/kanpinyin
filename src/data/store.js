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
};

// 暴露 appData 引用以兼容旧代码
let appData = null;
Object.defineProperty(window, 'appData', {
  get() { return Store.data; },
  set(v) { /* read-only proxy */ },
});
