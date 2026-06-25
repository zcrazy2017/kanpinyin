// ============================================================
//  main.js — 应用初始化与全局兼容层
// ============================================================

// ---- 兼容 window 级别函数（旧版 onclick 引用） ----

// Tab
window.switchTab = (name) => App.switchTab(name);

// Student
window.renameStudent = () => {
  const s = Store.getCurrentStudent();
  const input = document.getElementById('renameStudentInput');
  input.value = s.name;
  document.getElementById('renameStudentModal').classList.add('show');
  setTimeout(() => input.focus(), 100);
};

window.confirmRenameStudent = () => {
  const name = document.getElementById('renameStudentInput').value.trim();
  if (!name) { App.UI.toast('请输入姓名', 'error'); return; }
  const s = Store.getCurrentStudent();
  s.name = name;
  Store.save();
  document.getElementById('renameStudentModal').classList.remove('show');
  App.UI.renderStudentName();
  App.UI.toast(`已改名为「${name}」`);
  App.refreshAll();
};

// refreshAll
window.refreshAll = () => App.refreshAll();

// refreshLibrary
window.refreshLibrary = () => App.Library.refresh();

// ---- 启动设置 ----

// 全局变量（部分代码仍直接引用）
window.SETTINGS_KEY = 'kanpinyin_settings';
window.STORAGE_KEY = 'kanpinyin_data';

if (typeof window._wordCountSetting === 'undefined') window._wordCountSetting = 50;
if (typeof window._selectedCategoryIds === 'undefined') window._selectedCategoryIds = [];
if (typeof window._currentPractice === 'undefined') window._currentPractice = null;
if (typeof window._selectedPinyin === 'undefined') window._selectedPinyin = null;

// 加载设置
try {
  const raw = localStorage.getItem('kanpinyin_settings');
  if (raw) {
    const s = JSON.parse(raw);
    if (s.wordCount && s.wordCount > 0) window._wordCountSetting = s.wordCount;
    if (s.categoryIds && Array.isArray(s.categoryIds)) window._selectedCategoryIds = s.categoryIds;
  }
} catch (e) { /* ignore */ }

// 初始化
Store.init();
Store.getCurrentStudent();
App.UI.renderStudentName();

// ---- 键盘事件绑定 ----
document.getElementById('charInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') App.Library.addChar();
});
document.getElementById('pinyinInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') App.Library.addChar();
});
document.getElementById('manualWordInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') App.Library.addManualWord();
});
document.getElementById('charInput').addEventListener('input', () => App.Library.onCharInput());
document.getElementById('pinyinInput').addEventListener('input', function() {
  if (this.value !== App.Library._selectedPinyin) App.Library._selectedPinyin = null;
});
document.getElementById('renameStudentInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') confirmRenameStudent();
});
document.getElementById('savePracticeNameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') App.Practice.confirmSave();
});

// 初始化精灵
App.Pet.init();
App.Pet.render();
App.Pet.greet();

// 刷新当前面板
const activeTab = document.querySelector('.tab-btn.active');
if (activeTab) App.switchTab(activeTab.dataset.tab);
App.Practice.renderSavedPractices();

// ---- 后端自动连接 ----
const BACKEND_URL = 'http://localhost:5001';
let _backendCheckCount = 0;
const MAX_BACKEND_RETRIES = 10;

function updateBackendStatus(connected, msg) {
  const el = document.getElementById('backendStatus');
  if (!el) return;
  const dot = el.querySelector('.status-dot');
  const text = el.querySelector('.status-text');
  if (connected) {
    dot.style.background = '#48bb78';
    text.textContent = msg || '后端已连接';
    el.style.background = 'rgba(72,187,120,0.25)';
  } else {
    dot.style.background = msg && msg.includes('重试') ? '#ed8936' : '#fc8181';
    text.textContent = msg || '后端未连接';
    el.style.background = msg && msg.includes('重试') ? 'rgba(237,137,54,0.15)' : 'rgba(252,129,129,0.15)';
  }
}

async function checkBackend() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (resp.ok) { updateBackendStatus(true, '后端已连接'); return true; }
    throw new Error('Not OK');
  } catch (e) {
    _backendCheckCount++;
    if (_backendCheckCount < MAX_BACKEND_RETRIES) {
      updateBackendStatus(false, `后端未就绪 (${_backendCheckCount}/${MAX_BACKEND_RETRIES})`);
      return false;
    }
    updateBackendStatus(false, '后端未启动');
    return false;
  }
}

async function autoConnectBackend() {
  updateBackendStatus(false, '连接中...');
  for (let i = 0; i < MAX_BACKEND_RETRIES; i++) {
    if (await checkBackend()) return;
    await new Promise(r => setTimeout(r, 1500));
  }
  updateBackendStatus(false, '❌ 请启动后端');
}

autoConnectBackend().then(() => { Store.autoLoadDataFiles(); });
