// ============================================================
//  Dict Module — 字典浏览 / 拼音编辑 / 词语管理 / 字统计
// ============================================================
App.Dict = {
  _activeLetter: 'A',
  _categoryFilter: '',

  /** 设置分类过滤 */
  setCategoryFilter(catId) {
    this._categoryFilter = catId;
    this._activeLetter = 'A';
    this.render();
  },

  /** 切换字母 */
  switchLetter(letter) {
    this._activeLetter = letter;
    this.render();
  },

  /** 渲染字典面板 */
  render() {
    this.renderCategoryFilter();
    let entries = Object.entries(Store.data.dict).sort((a, b) => a[0].localeCompare(b[0], 'zh'));
    if (this._categoryFilter) {
      const expandedIds = Store.getCategoryAndDescendantIds(this._categoryFilter);
      entries = entries.filter(([ch, info]) => info.categoryId && expandedIds.has(info.categoryId));
    }
    if (entries.length === 0) {
      document.getElementById('dictCharList').innerHTML = '<p class="empty-msg">暂无字库，请先在字词管理中导入汉字</p>';
      return;
    }

    const groups = {};
    entries.forEach(([ch, info]) => {
      const letter = App.UI.getPinyinFirstLetter(info.pinyin || '?').toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push({ char: ch, pinyin: info.pinyin });
    });

    // 字母导航栏
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const bar = document.getElementById('dictLetterBar');
    let barHtml = '';
    for (const L of allLetters) {
      const count = (groups[L] || []).length;
      const isActive = this._activeLetter === L;
      barHtml += `<span onclick="App.Dict.switchLetter('${L}')"
        style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;border-radius:8px;cursor:pointer;
               font-size:14px;font-weight:${isActive ? '700' : '500'};
               background:${isActive ? '#667eea' : count > 0 ? '#ebf4ff' : '#f7fafc'};
               color:${isActive ? '#fff' : count > 0 ? '#667eea' : '#cbd5e0'};
               border:${isActive ? 'none' : '1px solid ' + (count > 0 ? '#667eea' : '#e2e8f0')};"
        title="${count > 0 ? count + '个字' : '暂无字'}">${L}</span>`;
    }
    bar.innerHTML = barHtml;

    // 汉字列表
    const chars = groups[this._activeLetter] || [];
    const list = document.getElementById('dictCharList');
    if (chars.length === 0) {
      list.innerHTML = `<p class="empty-msg" style="padding:20px;">「${this._activeLetter}」暂无汉字</p>`;
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:12px;">';
    chars.forEach(({ char, pinyin: charPinyin }) => {
      const relatedWords = Store.data.words.filter(w => w.chars.includes(char));
      const stats = this.computeCharStats(char);
      const rateColor = stats.rate >= 90 ? '#38a169' : stats.rate >= 70 ? '#ed8936' : '#e53e3e';
      const mastery = Store.getCharMasteryLevel(char);
      const stubborn = Store.isStubbornError(char);
      const trend = Store.getCharProgressTrend(char);
      const starColor = mastery.level >= 3 ? '#f6ad55' : mastery.level >= 2 ? '#9f7aea' : '#a0aec0';
      let trendHtml = '';
      if (trend.trend === 'up') trendHtml = `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:#f0fff4;color:#38a169;font-size:11px;font-weight:600;">↑${trend.change}%</span>`;
      else if (trend.trend === 'down') trendHtml = `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:#fff5f5;color:#e53e3e;font-size:11px;font-weight:600;">↓${Math.abs(trend.change)}%</span>`;
      html += `<div style="background:#f7fafc;border-radius:10px;padding:12px 16px;border:1px solid ${stubborn ? '#fc8181' : '#e2e8f0'};${stubborn ? 'border-left:4px solid #e53e3e;' : ''}">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span style="font-size:24px;font-weight:700;color:#2d3748;width:36px;text-align:center;">
            ${char}${stubborn ? '<span title="顽固错字（近3次练习中多次出错）">🔴</span>' : ''}
            <span style="font-size:12px;color:${starColor};letter-spacing:2px;display:block;line-height:1;" title="${mastery.label}">${mastery.stars}</span>
          </span>
          <span id="dictCharPinyin_${char}" style="font-size:14px;color:#667eea;font-weight:500;cursor:pointer;border-bottom:1px dashed #667eea;"
               onclick="App.Dict.editCharPinyin('${char}')" title="点击修改拼音">${charPinyin}</span>
          <span class="dict-char-stats">
            ${stats.total > 0 ? `
              <span class="stat-item stat-total">📝 ${stats.total}次</span>
              <span class="stat-item stat-correct">✅ ${stats.correct}</span>
              <span class="stat-item stat-wrong">❌ ${stats.wrong}</span>
              <span class="stat-item stat-rate" style="color:${rateColor};">${stats.rate}%</span>
              ${trendHtml}
            ` : '<span style="font-size:11px;color:#a0aec0;">暂无练习记录</span>'}
          </span>
          <span onclick="App.Dict.deleteChar('${char}')" style="cursor:pointer;font-size:14px;color:#fc8181;" title="删除字">×</span>
        </div>`;
      if (relatedWords.length > 0) {
        html += '<div style="display:flex;flex-wrap:wrap;gap:6px;padding-left:44px;margin-bottom:6px;">';
        relatedWords.forEach(w => {
          const display = w.chars.map(c => c === char ? `<strong style="color:#e53e3e;">${c}</strong>` : c).join('');
          html += `<span style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:3px 10px;font-size:14px;color:#4a5568;">
            ${display}
            <span id="dictWordPy_${w.id}" style="font-size:11px;color:#667eea;cursor:pointer;" onclick="App.Dict.editWordPinyin(${w.id})" title="点击修改拼音">${w.pinyin}</span>
            <span onclick="App.Dict.deleteWord(${w.id})" style="cursor:pointer;font-size:13px;color:#fc8181;margin-left:4px;" title="删除此词">×</span>
          </span>`;
        });
        html += '</div>';
      }
      html += `<div style="display:flex;align-items:center;gap:6px;padding-left:44px;">
        <input type="text" id="dictAddWord_${char}" placeholder="含「${char}」的词"
          style="width:140px;padding:3px 8px;border:1.5px solid #e2e8f0;border-radius:6px;font-size:13px;"
          autocomplete="off" onkeydown="if(event.key==='Enter')App.Dict.addWordForChar('${char}')">
        <span onclick="App.Dict.addWordForChar('${char}')" style="cursor:pointer;font-size:16px;color:#48bb78;font-weight:700;">+</span>
      </div></div>`;
    });
    html += '</div>';
    list.innerHTML = html;
  },

  /** 渲染分类过滤栏 */
  renderCategoryFilter() {
    const container = document.getElementById('dictCategoryFilter');
    if (!container) return;
    const flat = App.Library.getAllCategoriesFlat(Store.data.categories || []);
    let html = `<span onclick="App.Dict.setCategoryFilter('')"
      style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px;
             border:2px solid ${!this._categoryFilter ? '#667eea' : '#e2e8f0'};
             background:${!this._categoryFilter ? '#ebf4ff' : '#fff'};
             color:${!this._categoryFilter ? '#667eea' : '#718096'};
             font-weight:${!this._categoryFilter ? '600' : '400'};">全部 (${Object.keys(Store.data.dict).length})</span>`;
    flat.forEach(c => {
      const count = Object.values(Store.data.dict).filter(d => d.categoryId === c.id).length;
      const isActive = this._categoryFilter === c.id;
      html += `<span onclick="App.Dict.setCategoryFilter('${c.id}')"
        style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px;
               border:2px solid ${isActive ? '#667eea' : '#e2e8f0'};
               background:${isActive ? '#ebf4ff' : '#fff'};
               color:${isActive ? '#667eea' : '#718096'};
               font-weight:${isActive ? '600' : '400'};">${c.name} (${count})</span>`;
    });
    container.innerHTML = html;
  },

  /** 计算某个字在历史中的统计 */
  computeCharStats(ch) {
    const student = Store.getCurrentStudent();
    const logs = student.practiceLog || [];
    let total = 0, wrong = 0;
    logs.forEach(log => {
      (log.words || []).forEach(w => {
        (w.chars || []).forEach((c, ci) => {
          if (c === ch) { total++; if (w.wrongIndices && w.wrongIndices.includes(ci)) wrong++; }
        });
      });
    });
    const correct = total - wrong;
    const rate = total > 0 ? Math.round(correct / total * 100) : 0;
    return { total, correct, wrong, rate };
  },

  /** 编辑字拼音（内联） */
  editCharPinyin(ch) {
    const span = document.getElementById(`dictCharPinyin_${ch}`);
    if (!span) return;
    const info = Store.data.dict[ch];
    if (!info) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = info.pinyin;
    input.style.cssText = 'width:100px;padding:2px 6px;border:2px solid #667eea;border-radius:6px;font-size:13px;';
    input.autocomplete = 'off';
    span.replaceWith(input);
    input.focus(); input.select();
    const save = () => {
      const v = input.value.trim();
      if (v && v !== info.pinyin) {
        info.pinyin = v;
        Store.data.words.forEach(w => {
          if (w.chars.includes(ch)) w.pinyin = w.chars.map(c => Store.data.dict[c]?.pinyin || '?').join(' ');
        });
        Store.save();
        App.UI.toast(`已更新「${ch}」拼音 → ${v}`);
      }
      this.render();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') this.render(); });
  },

  /** 编辑词语拼音（内联） */
  editWordPinyin(wordId) {
    const span = document.getElementById(`dictWordPy_${wordId}`);
    if (!span) return;
    const w = Store.data.words.find(x => x.id === wordId);
    if (!w) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = w.pinyin;
    input.style.cssText = 'width:100px;padding:2px 6px;border:2px solid #667eea;border-radius:6px;font-size:12px;';
    input.autocomplete = 'off';
    span.replaceWith(input);
    input.focus(); input.select();
    const save = () => {
      const v = input.value.trim();
      if (v && v !== w.pinyin) { w.pinyin = v; Store.save(); App.UI.toast(`已更新拼音：${w.chars.join('')} → ${v}`); }
      this.render();
    };
    input.addEventListener('blur', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') this.render(); });
  },

  /** 删除字 */
  async deleteChar(ch) {
    const related = Store.data.words.filter(w => w.chars.includes(ch));
    let msg = `确定从字库中删除「${ch}」吗？`;
    if (related.length > 0) msg += `\n包含该字的 ${related.length} 个词语也会被删除。`;
    const confirmed = await App.UI.showConfirm(msg);
    if (!confirmed) return;
    Store.removeChar(ch);
    App.UI.toast(`已删除「${ch}」`);
    this.render();
  },

  /** 删除词语 */
  async deleteWord(wordId) {
    const w = Store.data.words.find(x => x.id === wordId);
    if (!w) return;
    const confirmed = await App.UI.showConfirm(`确定删除词「${w.chars.join('')}」(${w.pinyin}) 吗？`);
    if (!confirmed) return;
    Store.removeWord(wordId);
    App.UI.toast(`已删除词「${w.chars.join('')}」`);
    this.render();
  },

  /** 为指定字添加词语 */
  async addWordForChar(char) {
    const input = document.getElementById(`dictAddWord_${char}`);
    if (!input) return;
    const raw = input.value.trim();
    if (!raw) return;
    const chars = [...raw];
    if (!chars.includes(char)) { App.UI.toast(`词语必须包含「${char}」`, 'error'); return; }
    const existing = new Set(Store.data.words.map(w => w.chars.join('')));
    if (existing.has(raw)) { App.UI.toast('词语已存在', 'info'); input.value = ''; return; }
    for (const ch of chars) {
      if (!Store.data.dict[ch]) {
        try {
          const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
          if (resp.ok) { const d = await resp.json(); Store.data.dict[ch] = { pinyin: (d.pinyins||[])[0] || '?', categoryId: undefined }; }
          else { Store.data.dict[ch] = { pinyin: '?', categoryId: undefined }; }
        } catch(e) { Store.data.dict[ch] = { pinyin: ch, categoryId: undefined }; }
      }
    }
    const pinyin = chars.map(ch => Store.data.dict[ch]?.pinyin || '?').join(' ');
    Store.addWord(chars, pinyin);
    input.value = '';
    App.UI.toast(`✅ 添加词「${raw}」`);
    this.render();
  },
};

// 兼容旧版 onclick
window.renderDict = () => App.Dict.render();
window.setDictCategoryFilter = (id) => App.Dict.setCategoryFilter(id);
window.switchDictLetter = (l) => App.Dict.switchLetter(l);
window.editCharPinyin = (ch) => App.Dict.editCharPinyin(ch);
window.deleteDictChar = (ch) => App.Dict.deleteChar(ch);
window.editWordPinyin = (id) => App.Dict.editWordPinyin(id);
window.deleteDictWord = (id) => App.Dict.deleteWord(id);
window.addWordForChar = (ch) => App.Dict.addWordForChar(ch);
window.editDictWordPinyin = (id) => App.Dict.editWordPinyin(id);
window.computeCharStats = (ch) => App.Dict.computeCharStats(ch);
window.renderDictCategoryFilter = () => App.Dict.renderCategoryFilter();
