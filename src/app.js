// ============================================================
//  App — 全局命名空间
//  所有模块挂载到此对象下
// ============================================================
window.App = {
  // 模块占位，由各模块文件填充
  UI: {},
  Practice: {},
  Library: {},
  History: {},
  Dict: {},
  Stats: {},

  /** 刷新所有面板 */
  refreshAll() {
    this.UI.renderStudentName();
    const activeTab = document.querySelector('.tab-btn.active');
    if (activeTab) this.switchTab(activeTab.dataset.tab);
  },

  /** Tab 切换 */
  switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('active', p.id === 'panel-' + name));
    if (name === 'library' && this.Library.refresh) this.Library.refresh();
    if (name === 'practice' && this.Practice.refresh) this.Practice.refresh();
    if (name === 'history' && this.History.refresh) this.History.refresh();
    if (name === 'dict' && this.Dict.render) this.Dict.render();
    if (name === 'stats' && this.Stats.renderPage) this.Stats.renderPage();
  },
};
