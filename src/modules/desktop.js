// ============================================================
//  Desktop Module — 桌面 + 应用窗口管理器
//  类 Windows 桌面，每个功能作为一个独立 App 打开
// ============================================================
App.Desktop = {
  /** App 注册表 — 所有功能在此注册 */
  APPS: [
    {
      id: 'kanpinyin',
      name: '看拼音写汉字',
      icon: '📝',
      desc: '生成练习、批改、统计',
      color: '#667eea',
    },
    {
      id: 'pet',
      name: '精灵乐园',
      icon: '🐉',
      desc: '养成你的精灵伙伴',
      color: '#48bb78',
    },
  ],

  /** 当前打开的 App id，null 表示桌面 */
  _currentApp: null,

  /** 初始化桌面 */
  init() {
    this._currentApp = null;
    this.renderDesktop();
    this._setupDesktopClickAway();
    this._startClock();
  },

  /** 任务栏时钟 */
  _startClock() {
    const el = document.getElementById('taskbarClock');
    if (!el) return;
    const update = () => {
      const now = new Date();
      el.textContent = now.toLocaleString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };
    update();
    setInterval(update, 30000);
  },

  /** 渲染桌面图标 */
  renderDesktop() {
    const grid = document.getElementById('desktopIconGrid');
    if (!grid) return;

    grid.innerHTML = this.APPS.map(app => `
      <div class="desktop-icon" onclick="App.Desktop.openApp('${app.id}')"
           title="${app.desc}"
           style="--accent:${app.color}">
        <div class="desktop-icon-img" style="background:${app.color}15;border-color:${app.color}33;">
          <span class="desktop-icon-emoji">${app.icon}</span>
        </div>
        <div class="desktop-icon-label">${app.name}</div>
      </div>
    `).join('');
  },

  /** 打开一个 App */
  openApp(appId) {
    const app = this.APPS.find(a => a.id === appId);
    if (!app) { App.UI.toast('未知应用', 'error'); return; }

    // 隐藏桌面，显示应用窗口
    document.getElementById('desktop').classList.remove('active');
    document.getElementById('appWindow').classList.add('active');

    // 设置标题
    const titleEl = document.getElementById('appWindowTitle');
    if (titleEl) titleEl.textContent = `${app.icon} ${app.name}`;

    // 隐藏所有 App 内容区
    document.querySelectorAll('.app-content').forEach(el => el.classList.remove('active'));

    // 显示对应的 App 内容
    const contentEl = document.getElementById('app-content-' + appId);
    if (contentEl) {
      contentEl.classList.add('active');
    }

    this._currentApp = appId;

    // 根据 App 初始化相应面板
    if (appId === 'kanpinyin') {
      this._initKanpinyinApp();
    } else if (appId === 'pet') {
      this._initPetApp();
    }
  },

  /** 关闭当前 App，返回桌面 */
  closeApp() {
    document.getElementById('appWindow').classList.remove('active');
    document.getElementById('desktop').classList.add('active');
    this._currentApp = null;
  },

  // ---- 各 App 初始化逻辑 ----

  _initKanpinyinApp() {
    // 刷新学生显示
    App.UI.renderStudentName();
    // 刷新当前标签页
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) App.switchTab(activeTab.dataset.tab);
    App.Practice.renderSavedPractices();
  },

  _initPetApp() {
    if (App.Pet.renderPage) App.Pet.renderPage();
  },

  /** 点击桌面空白区域取消选中（预留） */
  _setupDesktopClickAway() {
    const desktop = document.getElementById('desktop');
    if (!desktop) return;
    desktop.addEventListener('click', (e) => {
      if (e.target === desktop) {
        // 点击桌面空白，暂不处理
      }
    });
  },
};

// ---- 兼容层 ----
window.openApp = (id) => App.Desktop.openApp(id);
window.closeApp = () => App.Desktop.closeApp();
