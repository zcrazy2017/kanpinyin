// ============================================================
//  UI 工具函数 — Toast、Confirm、Button 等
// ============================================================
App.UI = {
  /** Toast 消息提示 */
  toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => { el.remove(); }, 2500);
  },

  /** 通用确认对话框（Promise 形式） */
  _confirmResolve: null,

  showConfirm(msg) {
    return new Promise(resolve => {
      const el = document.getElementById('confirmModal');
      document.getElementById('confirmMsg').textContent = msg;
      el.classList.add('show');
      this._confirmResolve = resolve;
    });
  },

  confirmYes() {
    document.getElementById('confirmModal').classList.remove('show');
    if (App.UI._confirmResolve) { App.UI._confirmResolve(true); App.UI._confirmResolve = null; }
  },

  confirmNo() {
    document.getElementById('confirmModal').classList.remove('show');
    if (App.UI._confirmResolve) { App.UI._confirmResolve(false); App.UI._confirmResolve = null; }
  },

  /** 临时禁用按钮 */
  disableBtn(el, ms = 1500) {
    if (!el || el.disabled) return;
    el.disabled = true;
    el.style.opacity = '0.5';
    el.style.cursor = 'not-allowed';
    setTimeout(() => {
      el.disabled = false;
      el.style.opacity = '';
      el.style.cursor = '';
    }, ms);
  },

  /** 渲染学生姓名 */
  renderStudentName() {
    const s = Store.getCurrentStudent();
    const el = document.getElementById('studentNameDisplay');
    if (el) el.textContent = s.name;
  },

  /** 随机打乱数组 */
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  /** 加权随机抽取（返回索引） */
  weightedRandomIndex(items, weightFunc) {
    const weights = items.map(weightFunc);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    if (totalWeight <= 0) return -1;
    let r = Math.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return items.length - 1;
  },

  /** 获取拼音首字母（去除声调） */
  getPinyinFirstLetter(py) {
    const toneMap = {
      'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
      'ē': 'e', 'é': 'e', 'ě': 'e', 'è': 'e',
      'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
      'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
      'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
      'ǖ': 'v', 'ǘ': 'v', 'ǚ': 'v', 'ǜ': 'v',
      'Ā': 'a', 'Á': 'a', 'Ǎ': 'a', 'À': 'a',
      'Ē': 'e', 'É': 'e', 'Ě': 'e', 'È': 'e',
      'Ī': 'i', 'Í': 'i', 'Ǐ': 'i', 'Ì': 'i',
      'Ō': 'o', 'Ó': 'o', 'Ǒ': 'o', 'Ò': 'o',
      'Ū': 'u', 'Ú': 'u', 'Ǔ': 'u', 'Ù': 'u',
      'Ǖ': 'v', 'Ǘ': 'v', 'Ǚ': 'v', 'Ǜ': 'v',
    };
    if (!py) return '?';
    const first = py.charAt(0);
    const base = toneMap[first] || first;
    return base.toUpperCase();
  },
};

// ===== 兼容旧版 onclick 引用 =====
// 这些函数在 HTML onclick 中被直接引用
window.toast = (...args) => App.UI.toast(...args);
window.showConfirm = (...args) => App.UI.showConfirm(...args);
window.confirmYes = () => App.UI.confirmYes();
window.confirmNo = () => App.UI.confirmNo();
window.disableBtn = (...args) => App.UI.disableBtn(...args);
window.shuffle = (...args) => App.UI.shuffle(...args);
window.weightedRandomIndex = (...args) => App.UI.weightedRandomIndex(...args);
window.getPinyinFirstLetter = (...args) => App.UI.getPinyinFirstLetter(...args);
