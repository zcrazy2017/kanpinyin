// ============================================================
//  History Module — 历史记录 / 修改 / 详情 / 常错字排行
// ============================================================
App.History = {
  _editingLogIndex: null,
  _dirtyEdit: false,

  /** 刷新历史记录面板 */
  refresh() {
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));

    // 统计
    const totalLogs = logs.length;
    const totalWords = logs.reduce((s, l) => s + (l.words || []).length, 0);
    let totalWrong = 0;
    const charWrongCount = {};
    logs.forEach(l => (l.words || []).forEach(w => {
      if (w.wrongIndices && w.wrongIndices.length > 0) {
        totalWrong++;
        w.wrongIndices.forEach(ci => {
          const ch = w.chars && w.chars[ci];
          if (ch) charWrongCount[ch] = (charWrongCount[ch] || 0) + 1;
        });
      }
    }));

    document.getElementById('historySummary').textContent = `📊 ${student.name} 的历史练习`;
    document.getElementById('historyStats').innerHTML = `
      <span class="stat-badge">📅 共 <strong>${totalLogs}</strong> 天</span>
      <span class="stat-badge">📝 共 <strong>${totalWords}</strong> 词</span>
      <span class="stat-badge" style="${totalWrong > 0 ? 'background:#fed7d7;color:#9b2c2c;' : ''}">❌ 错 <strong>${totalWrong}</strong> 词</span>
      ${totalWords > 0 ? `<span class="stat-badge">✅ 正确率 <strong>${Math.round((totalWords - totalWrong) / totalWords * 100)}%</strong></span>` : ''}`;

    // 历史练习列表
    const listEl = document.getElementById('historyList');
    if (logs.length === 0) {
      listEl.innerHTML = '<p class="empty-msg">暂无历史记录。生成并打印/提交批改后会自动记录。</p>';
    } else {
      let html = '';
      logs.forEach((l, li) => {
        const wCount = (l.words || []).length;
        const wWrong = (l.words || []).filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
        const rate = wCount > 0 ? Math.round((wCount - wWrong) / wCount * 100) : 100;
        html += `<div style="padding:10px 14px;background:#f7fafc;border-radius:10px;margin-bottom:6px;
                  display:flex;align-items:center;gap:8px;flex-wrap:wrap;
                  border-left:4px solid ${rate === 100 ? '#48bb78' : rate >= 80 ? '#ed8936' : '#fc8181'};">
          <span style="font-weight:600;min-width:85px;">📅 ${l.date}</span>
          <span style="font-size:13px;color:#4a5568;">${wCount} 词</span>
          <span style="font-size:13px;color:${wWrong > 0 ? '#e53e3e' : '#48bb78'};">${wWrong > 0 ? `❌ 错 ${wWrong}` : '✅ 全对'}</span>
          <span style="font-size:13px;color:#718096;">${rate}%</span>
          <button class="btn btn-ghost btn-sm" onclick="App.History.showDetail(${li})">📋 详情</button>
          <button class="btn btn-ghost btn-sm" onclick="App.History.editLog(${li})">✏️ 修改</button>
          <button class="btn btn-ghost btn-sm" onclick="App.History.deleteLog(${li}, this)" style="color:#e53e3e;">🗑️ 删除</button>
        </div>`;
      });
      listEl.innerHTML = html;
    }

    // 常错字排行
    const rankEl = document.getElementById('errorCharRanking');
    const sorted = Object.entries(charWrongCount).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      rankEl.innerHTML = '<p class="empty-msg">暂无错字记录，继续保持！🎉</p>';
    } else {
      let html = '<div style="display:flex;flex-wrap:wrap;gap:8px;">';
      sorted.forEach(([ch, count], i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        html += `<span class="tag" style="background:${i < 3 ? '#fed7d7' : '#f7fafc'};font-weight:${i < 3 ? '700' : '400'};">
          ${medal} ${ch} <span style="color:#e53e3e;">(${count} 次)</span></span>`;
      });
      html += '</div>';
      rankEl.innerHTML = html;
    }
  },

  /** 显示详情 */
  showDetail(logIndex) {
    const student = Store.getCurrentStudent();
    const log = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date))[logIndex];
    if (!log) return;

    const words = (log.words || []).map(w => {
      const wordObj = Store.data.words.find(x => x.id === w.wordId);
      return {
        chars: w.chars || (wordObj ? wordObj.chars : []),
        pinyin: w.pinyin || (wordObj ? wordObj.pinyin : ''),
        wrongIndices: w.wrongIndices || [],
        wrongTypes: w.wrongTypes || {}
      };
    });

    this.cancelEdit();
    let detailHtml = `<div style="padding:12px;background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-top:8px;" class="history-detail">
      <div style="font-size:14px;font-weight:600;margin-bottom:8px;">📅 ${log.date} 详情</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    words.forEach((w, i) => {
      const wrongTypes = w.wrongTypes || {};
      const charEls = w.chars.map((ch, ci) => {
        const isWrong = w.wrongIndices.includes(ci);
        const errType = isWrong ? (wrongTypes[ci] || 'wrong_char') : '';
        let bg = '', color = '', label = '';
        if (errType === 'wrong_char') { bg = '#fed7d7'; color = '#c53030'; label = '错别字'; }
        else if (errType === 'blank_char') { bg = '#fefcbf'; color = '#975a16'; label = '留空'; }
        return `<span style="display:inline-block;padding:2px 6px;margin:0 1px;border-radius:4px;${bg ? 'background:' + bg + ';color:' + color + ';font-weight:700;' : ''}">${ch}${label ? '<span class="error-type-badge ' + errType + '" style="margin-left:2px;">' + label + '</span>' : ''}</span>`;
      }).join('');
      detailHtml += `<div style="display:flex;align-items:center;gap:6px;padding:4px 10px;background:#f7fafc;border-radius:8px;font-size:14px;border:1px solid ${w.wrongIndices.length > 0 ? '#fc8181' : '#e2e8f0'};">
        <span style="color:#a0aec0;font-size:12px;">${i + 1}.</span>
        <span style="color:#667eea;font-size:12px;">${w.pinyin}</span>${charEls}</div>`;
    });
    detailHtml += '</div></div>';

    const existing = document.querySelector('.history-detail');
    if (existing) existing.remove();
    const container = document.getElementById('historyList');
    const detailDiv = document.createElement('div');
    detailDiv.className = 'history-detail';
    detailDiv.innerHTML = detailHtml;
    container.appendChild(detailDiv);
  },

  /** 编辑历史记录 */
  editLog(logIndex) {
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));
    const log = logs[logIndex];
    if (!log) return;

    const words = log.words || [];
    let html = `<div style="padding:12px;background:#fff;border-radius:10px;border:2px solid #667eea;margin-top:8px;" class="history-edit">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
        <span style="font-size:14px;font-weight:600;">✏️ 修改 ${log.date} 批改</span>
        <span style="font-size:12px;color:#718096;">点击字选择错误类型（错别字/留空字/正确）</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;">`;
    words.forEach((w, wi) => {
      const wrongSet = new Set(w.wrongIndices || []);
      const wrongTypes = w.wrongTypes || {};
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f7fafc;border-radius:8px;flex-wrap:wrap;">
        <span style="color:#a0aec0;font-size:12px;min-width:20px;">${wi + 1}.</span>
        <span style="color:#667eea;font-size:12px;min-width:60px;">${w.pinyin}</span>`;
      (w.chars || []).forEach((ch, ci) => {
        const isWrong = wrongSet.has(ci);
        const errType = isWrong ? (wrongTypes[ci] || 'wrong_char') : '';
        const editKey = `${logIndex}_${wi}_${ci}`;
        let borderColor = '#e2e8f0', bgColor = '#fff', txtColor = '#2d3748', typeLabel = '';
        if (errType === 'wrong_char') { borderColor = '#fc8181'; bgColor = '#fff5f5'; txtColor = '#c53030'; typeLabel = '<span class="error-type-badge wrong-char">错别字</span>'; }
        else if (errType === 'blank_char') { borderColor = '#ed8936'; bgColor = '#fffaf0'; txtColor = '#975a16'; typeLabel = '<span class="error-type-badge blank-char">留空</span>'; }
        html += `<span class="history-edit-char ${errType}" data-editkey="${editKey}"
          onclick="App.History.showErrorTypePopup('${logIndex}', ${wi}, ${ci}, this)"
          style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;font-size:18px;font-weight:600;border:2px solid ${borderColor};background:${bgColor};color:${txtColor};border-radius:6px;cursor:pointer;">${ch}${typeLabel}</span>`;
      });
      html += `</div>`;
    });
    html += `</div>
      <div style="display:flex;gap:8px;margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="App.History.saveEdit(${logIndex}, this)">💾 保存修改</button>
        <button class="btn btn-ghost btn-sm" onclick="App.History.cancelEdit()">取消</button>
      </div></div>`;

    this.cancelEdit();
    const container = document.getElementById('historyList');
    const editDiv = document.createElement('div');
    editDiv.className = 'history-edit-container';
    editDiv.innerHTML = html;
    container.appendChild(editDiv);
    this._editingLogIndex = logIndex;
  },

  /** 切换历史编辑中某个字的错误状态 */
  toggleChar(logIdx, wi, ci, type) {
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));
    const log = logs[logIdx];
    if (!log || !log.words[wi]) return;
    const w = log.words[wi];
    if (!w.wrongIndices) w.wrongIndices = [];
    if (!w.wrongTypes) w.wrongTypes = {};

    const idx = w.wrongIndices.indexOf(ci);
    if (type === '') {
      if (idx >= 0) w.wrongIndices.splice(idx, 1);
      delete w.wrongTypes[ci];
    } else {
      w.wrongTypes[ci] = type;
      if (idx < 0) w.wrongIndices.push(ci);
    }

    const editKey = `${logIdx}_${wi}_${ci}`;
    const el = document.querySelector(`.history-edit-char[data-editkey="${editKey}"]`);
    if (el) {
      const isWrong = w.wrongIndices.includes(ci);
      const errType = isWrong ? (w.wrongTypes[ci] || 'wrong_char') : '';
      el.className = 'history-edit-char ' + errType;
      if (errType === 'wrong_char') { el.style.borderColor = '#fc8181'; el.style.background = '#fff5f5'; el.style.color = '#c53030'; }
      else if (errType === 'blank_char') { el.style.borderColor = '#ed8936'; el.style.background = '#fffaf0'; el.style.color = '#975a16'; }
      else { el.style.borderColor = '#e2e8f0'; el.style.background = '#fff'; el.style.color = '#2d3748'; }
    }
    this._dirtyEdit = true;
  },

  /** 历史编辑中的错误类型选择弹窗 */
  showErrorTypePopup(logIdx, wi, ci, el) {
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));
    const log = logs[logIdx];
    if (!log || !log.words[wi]) return;
    const w = log.words[wi];
    if (!w.wrongTypes) w.wrongTypes = {};
    if (!w.wrongIndices) w.wrongIndices = [];

    document.querySelectorAll('.error-type-selector').forEach(el2 => el2.remove());

    const isCurrentlyWrong = w.wrongIndices.includes(ci);
    const currentType = w.wrongTypes[ci] || 'wrong_char';

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
      if ((isCurrentlyWrong && opt.value === currentType) || (!isCurrentlyWrong && opt.value === '')) btn.classList.add('selected');
      btn.textContent = opt.label;
      btn.onclick = function(e) {
        e.stopPropagation();
        App.History.toggleChar(logIdx, wi, ci, opt.value);
        sel.remove();
      };
      sel.appendChild(btn);
    });

    el.style.position = 'relative';
    el.appendChild(sel);
    setTimeout(() => {
      document.addEventListener('click', function closePopup() {
        if (sel.parentNode) sel.remove();
        document.removeEventListener('click', closePopup);
      }, { once: true });
    }, 10);
  },

  /** 保存历史编辑 */
  saveEdit(logIdx, btn) {
    if (btn) App.UI.disableBtn(btn, 2000);
    Store.save();
    App.UI.toast('✅ 批改已更新');
    this.cancelEdit();
    this.refresh();
  },

  /** 取消历史编辑 */
  cancelEdit() {
    document.querySelectorAll('.history-edit-container').forEach(el => el.remove());
    this._editingLogIndex = null;
    this._dirtyEdit = false;
  },

  /** 删除历史记录 */
  async deleteLog(logIndex, btn) {
    if (btn) App.UI.disableBtn(btn, 2000);
    const ok = await App.UI.showConfirm('确定要删除这条历史记录吗？此操作不可撤销。');
    if (!ok) return;
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => b.date.localeCompare(a.date));
    const target = logs[logIndex];
    if (!target) return;
    student.practiceLog = student.practiceLog.filter(l => l !== target);
    Store.save();
    App.UI.toast('✅ 已删除历史记录');
    this.refresh();
  },
};

// 兼容旧版 onclick
window.refreshHistory = () => App.History.refresh();
window.showHistoryDetail = (idx) => App.History.showDetail(idx);
window.editHistoryLog = (idx) => App.History.editLog(idx);
window.saveHistoryEdit = (idx, btn) => App.History.saveEdit(idx, btn);
window.cancelHistoryEdit = () => App.History.cancelEdit();
window.deleteHistoryLog = (idx, btn) => App.History.deleteLog(idx, btn);
window.toggleHistoryChar = (idx, wi, ci, type) => App.History.toggleChar(idx, wi, ci, type);
window.showHistoryErrorTypePopup = (idx, wi, ci, el) => App.History.showErrorTypePopup(idx, wi, ci, el);
