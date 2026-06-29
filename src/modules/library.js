// ============================================================
//  Library Module — 字库管理 / 分类管理 / 组词 / 批量导入
// ============================================================
App.Library = {
  _composableChars: [],
  _selectedComposeChar: '',
  _activeAddCatId: null,
  _collapsedCats: new Set(),
  _selectedCharSet: new Set(),
  _selectedPinyin: null,
  _pinyinDetectTimer: null,

  // ---- 刷新 ----

  refresh() {
    this.renderCategoryTree();
    this.updateCategorySelects();
    if (this._activeAddCatId) {
      const catName = this.getCategoryNameById(Store.data.categories || [], this._activeAddCatId) || '';
      this.renderCategoryBrowse(this._activeAddCatId, catName);
    } else {
      this.renderCategoryBrowse();
    }
    this.refreshComposeSelect();
  },

  // ---- Tab 切换 ----

  switchLibTab(tab) {
    document.querySelectorAll('.lib-tab-btn').forEach(b => {
      const isActive = b.dataset.libtab === tab;
      b.classList.toggle('active', isActive);
      b.style.color = isActive ? '#667eea' : '#718096';
      b.style.borderBottomColor = isActive ? '#667eea' : 'transparent';
      b.style.fontWeight = isActive ? '600' : '500';
    });
    document.querySelectorAll('.lib-panel').forEach(p => {
      p.classList.toggle('active', p.id === 'libpanel-' + tab);
      p.style.display = p.id === 'libpanel-' + tab ? 'block' : 'none';
    });
    if (tab === 'cat') {
      this.renderCategoryBrowse();
      Store.autoLoadCategoriesSilently();
    }
    if (tab === 'chars') this.refresh();
  },

  // ---- 字符管理 ----

  addChar() {
    const charInput = document.getElementById('charInput');
    const pinyinInput = document.getElementById('pinyinInput');
    const ch = charInput.value.trim();
    let py = pinyinInput.value.trim().toLowerCase();
    if (!py && this._selectedPinyin) py = this._selectedPinyin;
    if (!ch) { App.UI.toast('请输入字', 'error'); return; }
    if (!py) { App.UI.toast('请输入拼音', 'error'); return; }
    if (Store.data.dict[ch]) { App.UI.toast(`字「${ch}」已存在`, 'error'); return; }
    const catSel = document.getElementById('charCategorySelect');
    const categoryId = catSel ? catSel.value : '';
    Store.data.dict[ch] = { pinyin: py, categoryId: categoryId || undefined };
    Store.save();
    charInput.value = ''; pinyinInput.value = '';
    document.getElementById('pinyinDetectStatus').innerHTML = '';
    this._selectedPinyin = null;
    App.UI.toast(`已添加字「${ch}」(${py})`);
    this.refresh();
    charInput.focus();
  },

  removeChar(ch) {
    if (!confirm(`确定删除字「${ch}」吗？相关的词语也会被删除。`)) return;
    Store.removeChar(ch);
    App.UI.toast(`已删除字「${ch}」`);
    this.refresh();
    if (document.getElementById('panel-dict').classList.contains('active') && App.Dict) App.Dict.render();
  },

  removeWord(wordId) {
    const w = Store.data.words.find(x => x.id === wordId);
    if (!w) return;
    if (!confirm(`确定删除词「${w.chars.join('')}」(${w.pinyin}) 吗？`)) return;
    Store.removeWord(wordId);
    App.UI.toast(`已删除词「${w.chars.join('')}」`);
    this.refresh();
  },

  // ---- 拼音检测 ----

  async detectPinyin(ch) {
    const statusEl = document.getElementById('pinyinDetectStatus');
    const pinyinInput = document.getElementById('pinyinInput');
    if (!ch || !/^[\u4e00-\u9fff]$/.test(ch)) {
      statusEl.innerHTML = ''; this._selectedPinyin = null; return;
    }
    try {
      const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const pinyins = data.pinyins || [];
      if (pinyins.length === 0) {
        statusEl.innerHTML = '<span style="color:#a0aec0;">未能识别拼音，请手动输入</span>';
        this._selectedPinyin = null; return;
      }
      if (pinyins.length === 1) {
        pinyinInput.value = pinyins[0];
        this._selectedPinyin = pinyins[0];
        statusEl.innerHTML = `<span style="color:#48bb78;">✅ 已识别：${pinyins[0]}</span>`;
      } else {
        pinyinInput.value = ''; this._selectedPinyin = null;
        let html = '<span style="color:#ed8936;">🔊 多音字，请选择拼音：</span><span class="pinyin-options">';
        pinyins.forEach(py => {
          const safePy = py.replace(/'/g, "\\'");
          html += `<button class="pinyin-option-btn" onclick="App.Library.selectPinyinOption('${safePy}')">${py}</button>`;
        });
        html += '</span>';
        statusEl.innerHTML = html;
      }
    } catch (e) {
      statusEl.innerHTML = '<span style="color:#fc8181;">⚠️ 后端服务未启动，请手动输入拼音</span>';
      this._selectedPinyin = null;
    }
  },

  selectPinyinOption(py) {
    document.getElementById('pinyinInput').value = py;
    this._selectedPinyin = py;
    const btns = document.getElementById('pinyinDetectStatus').querySelectorAll('.pinyin-option-btn');
    btns.forEach(b => b.classList.toggle('selected', b.textContent === py));
  },

  onCharInput() {
    clearTimeout(this._pinyinDetectTimer);
    const ch = document.getElementById('charInput').value.trim();
    if (!ch) { document.getElementById('pinyinDetectStatus').innerHTML = ''; return; }
    document.getElementById('pinyinDetectStatus').innerHTML = '<span class="spinner"></span> 正在识别拼音...';
    this._pinyinDetectTimer = setTimeout(() => this.detectPinyin(ch), 200);
  },

  // ---- 刷新所有拼音（字+词）----

  async refreshAllPinyin() {
    const entries = Object.entries(Store.data.dict);
    if (entries.length === 0) { App.UI.toast('字库为空', 'info'); return; }
    const btn = document.querySelector('button[onclick*="refreshAllPinyin"]');
    if (btn) btn.disabled = true;
    App.UI.toast('⏳ 正在矫正拼音...', 'info');

    // ── Step 1: 矫正所有字的拼音 ──
    let charUpdated = 0;
    for (const [ch, info] of entries) {
      try {
        const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
        if (resp.ok) {
          const data = await resp.json();
          const py = (data.pinyins || [])[0];
          if (py && py !== info.pinyin) { info.pinyin = py; charUpdated++; }
        }
      } catch (e) { /* skip */ }
    }

    // ── Step 2: 矫正词的拼音（跳过已矫正的词）──
    let wordUpdated = 0;
    let wordSkipped = 0;
    for (const w of Store.data.words) {
      // 已标记为已矫正 → 跳过
      if (w.pinyinFixed) { wordSkipped++; continue; }

      const correctPinyin = w.chars.map(ch => Store.data.dict[ch]?.pinyin || '?').join(' ');
      if (correctPinyin !== w.pinyin) {
        w.pinyin = correctPinyin;
        w.pinyinFixed = true; // 标记为已矫正
        wordUpdated++;
      }
    }

    if (charUpdated > 0 || wordUpdated > 0) {
      Store.save();
    }
    if (btn) btn.disabled = false;

    const msg = `✅ 拼音矫正完成：${charUpdated} 个字已更新，${wordUpdated} 个词已更新${wordSkipped > 0 ? `，${wordSkipped} 个词已跳过（已矫正）` : ''}`;
    App.UI.toast(msg);
    this.refresh();
    if (App.Dict) App.Dict.render();
  },

  // ---- 组词 ----

  renderComposeCharList(filterText) {
    const list = document.getElementById('composeCharList');
    const filtered = filterText
      ? this._composableChars.filter(ch => ch.includes(filterText))
      : this._composableChars;
    if (filtered.length === 0) {
      list.innerHTML = `<p class="empty-msg">${filterText ? '没有匹配的字' : '— 暂无字可组词 —'}</p>`;
      return;
    }
    list.innerHTML = filtered.map(ch => {
      const hint = Store.data.dict[ch]?.pinyin || '';
      const selected = ch === this._selectedComposeChar ? ' selected' : '';
      return `<span class="char-opt${selected}" data-ch="${ch}" onclick="App.Library.selectComposeChar('${ch}')">${ch} <span class="pinyin-hint">${hint}</span></span>`;
    }).join('');
  },

  onComposeSearchInput() {
    this.renderComposeCharList(document.getElementById('composeSearchInput').value.trim());
  },

  selectComposeChar(ch) {
    this._selectedComposeChar = ch;
    document.getElementById('composeSearchInput').value = '';
    this.renderComposeCharList('');
    this.onComposeCharChange(ch);
  },

  async refreshComposeSelect() {
    const searchInput = document.getElementById('composeSearchInput');
    const list = document.getElementById('composeCharList');
    searchInput.value = '';
    list.innerHTML = '<p class="empty-msg">⏳ 正在筛选可组词的字...</p>';

    const chars = Object.keys(Store.data.dict).sort();
    if (chars.length < 2) {
      list.innerHTML = '<p class="empty-msg">— 请至少添加2个字 —</p>';
      this._composableChars = []; this._selectedComposeChar = ''; return;
    }
    this._composableChars = chars;
    try {
      const resp = await fetch(`http://localhost:5001/api/composable?chars=${encodeURIComponent(chars.join(','))}`);
      if (resp.ok) { const data = await resp.json(); if (data.composable && data.composable.length > 0) this._composableChars = data.composable; }
    } catch (e) { /* fallback */ }
    if (this._selectedComposeChar && !this._composableChars.includes(this._selectedComposeChar)) this._selectedComposeChar = '';
    this.renderComposeCharList('');
  },

  async onComposeCharChange(ch) {
    const container = document.getElementById('composeResults');
    if (!ch) { container.innerHTML = '<p class="empty-msg">选择一个字后显示可组成的词语。</p>'; return; }
    const others = Object.keys(Store.data.dict).filter(c => c !== ch).sort();
    if (others.length === 0) { container.innerHTML = '<p class="empty-msg">没有其他字可以组词，请先添加更多字。</p>'; return; }

    const existing = new Set(Store.data.words.map(w => w.chars.join('')));
    let validPairs = [];
    try {
      const resp = await fetch(`http://localhost:5001/api/compose?char=${encodeURIComponent(ch)}&with=${encodeURIComponent(others.join(','))}`);
      if (resp.ok) {
        const data = await resp.json();
        validPairs = data.combinations.filter(pair => !existing.has(pair.join('')));
      } else throw new Error('API error');
    } catch (e) {
      others.forEach(other => { if (!existing.has(ch + other)) validPairs.push([ch, other]); });
    }

    if (validPairs.length === 0) {
      container.innerHTML = '<p class="empty-msg">没有可组成的新词语。</p>';
      window._wordCandidates = []; return;
    }
    const candidates = validPairs.map(pair => ({
      chars: pair, display: pair.join(''),
      pinyin: Store.data.dict[pair[0]].pinyin + ' ' + Store.data.dict[pair[1]].pinyin
    }));
    let html = '<div class="word-check-list">';
    candidates.forEach((c, i) => {
      html += `<div class="word-check-item" data-idx="${i}" onclick="toggleWordCheck(${i})">
        <input type="checkbox" class="checkbox" data-idx="${i}">
        <span><strong>${c.display}</strong> <span style="color:#718096;font-size:13px;">${c.pinyin}</span></span></div>`;
    });
    html += '</div><div style="margin-top:12px;"><button class="btn btn-success" onclick="App.Library.confirmWords()">✅ 保存选中的词语</button></div>';
    container.innerHTML = `<div style="font-size:13px;color:#718096;margin-bottom:8px;">可选组合 <strong>${candidates.length}</strong> 个</div>` + html;
    window._wordCandidates = candidates;
  },

  confirmWords() {
    const checked = document.querySelectorAll('.word-check-item.checked');
    if (checked.length === 0) { App.UI.toast('请勾选至少一个词语', 'error'); return; }
    const candidates = window._wordCandidates || [];
    const existingSet = new Set(Store.data.words.map(w => w.chars.join('')));
    const added = [], skipped = [];
    checked.forEach(el => {
      const c = candidates[parseInt(el.dataset.idx)];
      if (!c) return;
      if (existingSet.has(c.display)) { skipped.push(c.display); return; }
      const id = Store.data.words.length > 0 ? Math.max(...Store.data.words.map(w => w.id)) + 1 : 0;
      Store.data.words.push({ id, chars: c.chars, pinyin: c.pinyin });
      existingSet.add(c.display); added.push(c.display);
    });
    Store.save();
    let msg = '';
    if (added.length > 0) msg += `已添加 ${added.length} 个：${added.join('、')}`;
    if (skipped.length > 0) msg += (msg ? '；' : '') + `${skipped.length} 个已存在跳过：${skipped.join('、')}`;
    if (added.length > 0) App.UI.toast(msg); else App.UI.toast('没有新词语可添加', 'info');
    this.refresh();
  },

  toggleWordCheck(idx) {
    const items = document.querySelectorAll('.word-check-item');
    if (items[idx]) {
      items[idx].classList.toggle('checked');
      const cb = items[idx].querySelector('input[type="checkbox"]');
      if (cb) cb.checked = !cb.checked;
    }
  },

  // ---- 手动输入词语 ----

  async addManualWord() {
    const input = document.getElementById('manualWordInput');
    const statusEl = document.getElementById('manualWordStatus');
    const raw = input.value.trim();
    if (!raw) { statusEl.innerHTML = '<span style="color:#fc8181;">请输入词语</span>'; return; }
    const chars = [...raw];
    const existing = new Set(Store.data.words.map(w => w.chars.join('')));
    if (existing.has(raw)) { statusEl.innerHTML = `<span style="color:#ed8936;">⚠️ 「${raw}」已存在</span>`; return; }

    const missing = chars.filter(ch => !Store.data.dict[ch]);
    let autoAddedChars = [];
    if (missing.length > 0) {
      statusEl.innerHTML = '<span class="spinner"></span> 正在自动识别缺字拼音...';
      for (const ch of missing) {
        try {
          const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
          if (resp.ok) {
            const data = await resp.json();
            const py = (data.pinyins || [])[0];
            Store.data.dict[ch] = { pinyin: py || '?', categoryId: undefined };
            autoAddedChars.push(`${ch}(${py || '?'})`);
          } else { Store.data.dict[ch] = { pinyin: '?', categoryId: undefined }; autoAddedChars.push(`${ch}(?)`); }
        } catch (e) { Store.data.dict[ch] = { pinyin: ch, categoryId: undefined }; autoAddedChars.push(`${ch}(${ch})`); }
      }
    }
    const pinyin = chars.map(ch => Store.data.dict[ch]?.pinyin || '?').join(' ');
    Store.addWord(chars, pinyin);
    input.value = '';
    let msg = `✅ 已添加「${raw}」(${pinyin})`;
    if (autoAddedChars.length > 0) msg += `，并自动补全缺字：${autoAddedChars.join('、')}`;
    statusEl.innerHTML = `<span style="color:#48bb78;">${msg}</span>`;
    App.UI.toast(`已添加词语「${raw}」`);
    this.refresh();
    setTimeout(() => { const s = document.getElementById('manualWordStatus'); if (s) s.innerHTML = ''; }, 5000);
  },

  // ---- 批量导入 ----

  toggleBatchMode() {
    const el = document.getElementById('batchInput');
    const mode = document.querySelector('input[name="batchMode"]:checked')?.value;
    if (mode === 'chars') el.placeholder = '例如：春 天 花 开（用逗号、空格或换行分隔）';
    else if (mode === 'words') el.placeholder = '例如：春天, 花开, 大山（用逗号或换行分隔）';
    else el.placeholder = '例如：春, 春天, 花开（2字及以上自动视为词语）';
  },

  async batchImport() {
    const text = document.getElementById('batchInput').value.trim();
    if (!text) { App.UI.toast('请输入要导入的内容', 'error'); return; }
    const mode = document.querySelector('input[name="batchMode"]:checked')?.value || 'chars';
    const statusEl = document.getElementById('batchImportStatus');
    statusEl.innerHTML = '<span class="spinner"></span> 正在导入...';
    const batchCatSelect = document.getElementById('batchCategorySelect');
    const batchCatId = batchCatSelect ? batchCatSelect.value : '';
    const rawItems = text.split(/[,，、\s\n]+/).filter(s => s.trim());
    let addedChars = [], addedWords = [], skippedChars = [], skippedWords = [];

    for (const item of rawItems) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const chars = [...trimmed];
      let isWord = false;
      if (mode === 'words') isWord = true;
      else if (mode === 'mixed') isWord = chars.length >= 2;

      if (isWord) {
        const existingWords = new Set(Store.data.words.map(w => w.chars.join('')));
        if (existingWords.has(trimmed)) { skippedWords.push(trimmed); continue; }
        for (const ch of chars) {
          if (!Store.data.dict[ch]) {
            try {
              const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
              if (resp.ok) {
                const data = await resp.json();
                const py = (data.pinyins || [])[0];
                Store.data.dict[ch] = { pinyin: py || '?', categoryId: batchCatId || undefined };
                addedChars.push(`${ch}(${py || '?'})`);
              } else { Store.data.dict[ch] = { pinyin: '?', categoryId: batchCatId || undefined }; addedChars.push(`${ch}(?)`); }
            } catch (e) { Store.data.dict[ch] = { pinyin: ch, categoryId: batchCatId || undefined }; addedChars.push(`${ch}(${ch})`); }
          }
        }
        const pinyin = chars.map(ch => Store.data.dict[ch]?.pinyin || '?').join(' ');
        Store.addWord(chars, pinyin);
        addedWords.push(trimmed);
      } else {
        for (const ch of chars) {
          if (Store.data.dict[ch]) { skippedChars.push(ch); continue; }
          try {
            const resp = await fetch(`http://localhost:5001/api/pinyin?char=${encodeURIComponent(ch)}`);
            if (resp.ok) {
              const data = await resp.json();
              const py = (data.pinyins || [])[0];
              Store.data.dict[ch] = { pinyin: py || '?', categoryId: batchCatId || undefined };
              addedChars.push(`${ch}(${py || '?'})`);
            } else { Store.data.dict[ch] = { pinyin: '?', categoryId: batchCatId || undefined }; addedChars.push(`${ch}(?)`); }
          } catch (e) { Store.data.dict[ch] = { pinyin: ch, categoryId: batchCatId || undefined }; addedChars.push(`${ch}(${ch})`); }
        }
      }
    }
    Store.save();
    let parts = [];
    if (addedChars.length > 0) parts.push(`添加 ${addedChars.length} 字：${addedChars.join('、')}`);
    if (addedWords.length > 0) parts.push(`添加 ${addedWords.length} 词：${addedWords.join('、')}`);
    if (skippedChars.length > 0) parts.push(`${skippedChars.length} 字已存在：${skippedChars.join('、')}`);
    if (skippedWords.length > 0) parts.push(`${skippedWords.length} 词已存在：${skippedWords.join('、')}`);
    const msg = parts.join('；');
    statusEl.innerHTML = `<span style="color:#48bb78;">${msg}</span>`;
    document.getElementById('batchInput').value = '';
    if (addedChars.length > 0 || addedWords.length > 0) {
      App.UI.toast(msg.length > 60 ? `✅ 导入完成：${addedChars.length + addedWords.length} 项` : msg);
      this.refresh();
    } else if (skippedChars.length > 0 || skippedWords.length > 0) App.UI.toast('全部已存在，无新增', 'info');
    else App.UI.toast('没有可导入的内容', 'info');
    setTimeout(() => { statusEl.innerHTML = ''; }, 5000);
  },

  // ---- 分类管理 ----

  genCategoryId() { return 'cat_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); },

  getAllLeafCategories(nodes, parentPath) {
    let result = [];
    (nodes || []).forEach(n => {
      const path = parentPath ? parentPath + ' / ' + n.name : n.name;
      if (!n.children || n.children.length === 0) result.push({ id: n.id, name: path });
      else result = result.concat(this.getAllLeafCategories(n.children, path));
    });
    return result;
  },

  getAllCategoriesFlat(nodes, parentPath) {
    let result = [];
    (nodes || []).forEach(n => {
      const path = parentPath ? parentPath + ' / ' + n.name : n.name;
      result.push({ id: n.id, name: path });
      if (n.children && n.children.length > 0) result = result.concat(this.getAllCategoriesFlat(n.children, path));
    });
    return result;
  },

  findCategoryNode(nodes, id) {
    for (let n of nodes) {
      if (n.id === id) return n;
      if (n.children) { const found = this.findCategoryNode(n.children, id); if (found) return found; }
    }
    return null;
  },

  removeCategoryNode(nodes, id) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].id === id) { nodes.splice(i, 1); return true; }
      if (nodes[i].children && this.removeCategoryNode(nodes[i].children, id)) return true;
    }
    return false;
  },

  async addCategory() {
    const nameInput = document.getElementById('categoryNameInput');
    const parentSelect = document.getElementById('categoryParentSelect');
    const name = nameInput.value.trim();
    if (!name) { App.UI.toast('请输入分类名称', 'error'); return; }
    if (!Store.data.categories) Store.data.categories = [];
    const parentId = parentSelect.value;
    const newNode = { id: this.genCategoryId(), name, children: [] };
    if (parentId) {
      const parent = this.findCategoryNode(Store.data.categories, parentId);
      if (parent) { if (!parent.children) parent.children = []; parent.children.push(newNode); }
      else Store.data.categories.push(newNode);
    } else Store.data.categories.push(newNode);
    nameInput.value = '';
    Store.save();
    await Store.saveFile('categories');
    App.UI.toast(`已添加分类「${name}」`);
    this.refresh();
    nameInput.focus();
  },

  async removeCategory(id) {
    if (!confirm('确定删除此分类及所有子分类吗？（字和词不受影响）')) return;
    this.removeCategoryNode(Store.data.categories, id);
    Object.keys(Store.data.dict).forEach(ch => { if (Store.data.dict[ch].categoryId === id) Store.data.dict[ch].categoryId = ''; });
    Store.data.words.forEach(w => { if (w.categoryId === id) w.categoryId = ''; });
    Store.save();
    await Store.saveFile('categories');
    await Store.saveFile('dict');
    App.UI.toast('已删除分类');
    this.refresh();
  },

  getCategoryPath(nodes, id) {
    for (let n of nodes) {
      if (n.id === id) return n.name;
      if (n.children) { const sub = this.getCategoryPath(n.children, id); if (sub) return n.name + ' / ' + sub; }
    }
    return '';
  },

  toggleCatCollapse(catId) {
    if (this._collapsedCats.has(catId)) this._collapsedCats.delete(catId);
    else this._collapsedCats.add(catId);
    this.refreshCategoryTreeOnly();
  },

  renderCategoryTreeHtml(nodes, depth) {
    if (!nodes || nodes.length === 0) return '';
    const countCharsInCategory = (cat) => {
      let count = Object.values(Store.data.dict).filter(d => d.categoryId === cat.id).length;
      if (cat.children) cat.children.forEach(child => { count += countCharsInCategory(child); });
      return count;
    };
    let html = '<ul style="list-style:none;padding-left:' + (depth * 18) + 'px;margin:2px 0;">';
    nodes.forEach(n => {
      const charCount = countCharsInCategory(n);
      const isActive = this._activeAddCatId === n.id;
      html += `<li style="padding:4px 6px;margin:2px 0;border-radius:6px;
               background:${isActive ? '#d6e4ff' : '#f7fafc'};
               display:flex;align-items:center;gap:6px;
               border:2px solid ${isActive ? '#667eea' : 'transparent'};
               cursor:pointer;" onclick="App.Library.showAddCharsToCategory('${n.id}','${n.name}')">
        ${n.children && n.children.length > 0
          ? `<span onclick="event.stopPropagation();App.Library.toggleCatCollapse('${n.id}')" style="cursor:pointer;font-size:12px;color:#a0aec0;width:18px;text-align:center;">${this._collapsedCats.has(n.id) ? '▸' : '▾'}</span>`
          : '<span style="width:18px;"></span>'}
        <span style="font-weight:600;">📁 ${n.name}</span>
        <span style="font-size:12px;color:#a0aec0;">(${charCount}字)</span>
        <span class="remove" onclick="event.stopPropagation();App.Library.removeCategory('${n.id}')" style="margin-left:auto;">×</span>
      </li>`;
      if (n.children && n.children.length > 0 && !this._collapsedCats.has(n.id)) {
        html += this.renderCategoryTreeHtml(n.children, depth + 1);
      }
    });
    html += '</ul>';
    return html;
  },

  renderCategoryTree() {
    const treeEl = document.getElementById('categoryTree');
    if (!treeEl) return;
    if (!Store.data.categories || Store.data.categories.length === 0) {
      treeEl.innerHTML = '<p class="empty-msg">暂无分类，可在上方添加</p>';
    } else {
      treeEl.innerHTML = this.renderCategoryTreeHtml(Store.data.categories, 0);
    }
    // 在分类树末尾添加「未分类」虚拟节点
    const uncatCount = Object.values(Store.data.dict).filter(d => !d.categoryId).length;
    const isActive = this._activeAddCatId === '_uncategorized';
    treeEl.innerHTML += `<div style="padding:4px 6px;margin:2px 0;border-radius:6px;
      background:${isActive ? '#d6e4ff' : '#f7fafc'};
      display:flex;align-items:center;gap:6px;
      border:2px solid ${isActive ? '#667eea' : 'transparent'};
      cursor:pointer;" onclick="App.Library.showAddCharsToCategory('_uncategorized','未分类')">
      <span style="width:18px;"></span>
      <span style="font-weight:600;">📂 未分类</span>
      <span style="font-size:12px;color:#a0aec0;">(${uncatCount}字)</span>
    </div>`;
  },

  refreshCategoryTreeOnly() { this.renderCategoryTree(); },

  showAddCharsToCategory(catId, catName) {
    this._activeAddCatId = catId;
    const area = document.getElementById('categoryAddCharsArea');
    const label = document.getElementById('addCharsCatLabel');
    const list = document.getElementById('categoryAddCharList');
    area.style.display = 'block';
    label.textContent = '📁 ' + catName;
    const notInCat = Object.entries(Store.data.dict)
      .filter(([ch, info]) => info.categoryId !== catId)
      .sort((a, b) => a[0].localeCompare(b[0], 'zh'));
    if (notInCat.length === 0) {
      list.innerHTML = '<p class="empty-msg" style="padding:0;font-size:13px;">所有字都已在此分类中</p>';
    } else {
      const limit = 30;
      const showAll = area.dataset.showAll === 'true';
      let html = '';
      notInCat.forEach(([ch, info], idx) => {
        const catPath = info.categoryId ? this.getCategoryPath(Store.data.categories || [], info.categoryId) : '未分类';
        const isHidden = !showAll && idx >= limit;
        html += `<label style="display:${isHidden ? 'none' : 'inline-flex'};align-items:center;gap:6px;padding:5px 12px;border-radius:16px;cursor:pointer;font-size:14px;border:2px solid #e2e8f0;background:#fff;">
          <input type="checkbox" class="add-chars-cb" value="${ch}" data-ch="${ch}" style="accent-color:#667eea;">
          <span>${ch}</span>
          <span style="font-size:11px;color:#a0aec0;">${info.pinyin}</span>
          <span style="font-size:10px;color:#ccc;">${catPath}</span>
        </label>`;
      });
      if (notInCat.length > limit) {
        const moreText = showAll ? `收起（仅显示 ${limit} 个）` : `显示全部（共 ${notInCat.length} 个字）`;
        html += `<div style="width:100%;text-align:center;margin-top:4px;"><span onclick="App.Library.toggleShowAllAddChars()" style="cursor:pointer;font-size:12px;color:#667eea;font-weight:500;">${moreText}</span></div>`;
      }
      list.innerHTML = html;
    }
    this.refreshCategoryTreeOnly();
    this.renderCategoryBrowse(catId, catName);
  },

  async confirmAddCharsToCategory() {
    if (!this._activeAddCatId) { App.UI.toast('请先点击一个分类', 'error'); return; }
    const checkboxes = document.querySelectorAll('#categoryAddCharList .add-chars-cb:checked');
    if (checkboxes.length === 0) { App.UI.toast('请先勾选要加入的字', 'error'); return; }
    const catName = this.getCategoryNameById(Store.data.categories || [], this._activeAddCatId) || '未命名';
    const confirmed = await App.UI.showConfirm(`确认要在「${catName}」下加入 ${checkboxes.length} 个字吗？`);
    if (!confirmed) return;
    checkboxes.forEach(cb => {
      const ch = cb.getAttribute('data-ch');
      if (Store.data.dict[ch]) Store.data.dict[ch].categoryId = this._activeAddCatId;
    });
    Store.save();
    await Store.saveFile('categories');
    await Store.saveFile('dict');
    App.UI.toast(`已将 ${checkboxes.length} 个字加入「${catName}」`);
    const keepCatId = this._activeAddCatId;
    this.refresh();
    if (keepCatId) this.showAddCharsToCategory(keepCatId, catName);
  },

  closeAddCharsPanel() {
    this._activeAddCatId = null;
    document.getElementById('categoryAddCharsArea').style.display = 'none';
    this.refreshCategoryTreeOnly();
  },

  onCatSearchInput() {
    const input = document.getElementById('catSearchInput');
    const list = document.getElementById('categoryAddCharList');
    const countEl = document.getElementById('catSearchCount');
    const area = document.getElementById('categoryAddCharsArea');
    if (area.style.display === 'none') { countEl.textContent = ''; return; }
    const raw = input.value.replace(/\s/g, '');
    const searchChars = [...new Set([...raw].filter(ch => ch >= '\u4e00' && ch <= '\u9fff'))];
    const labels = list.querySelectorAll('label');
    if (searchChars.length === 0) {
      labels.forEach(l => l.style.display = '');
      countEl.textContent = `共 ${labels.length} 个字`; return;
    }
    let visibleCount = 0;
    labels.forEach(label => {
      const cb = label.querySelector('.add-chars-cb');
      if (!cb) return;
      const ch = cb.getAttribute('data-ch');
      const match = searchChars.some(sc => ch.includes(sc) || sc.includes(ch));
      label.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });
    countEl.textContent = `匹配 ${visibleCount} / ${labels.length} 个字`;
  },

  getCategoryNameById(nodes, id) {
    for (let n of nodes) {
      if (n.id === id) return n.name;
      if (n.children) { const sub = this.getCategoryNameById(n.children, id); if (sub) return sub; }
    }
    return null;
  },

  editCharCategory(ch) {
    const info = Store.data.dict[ch];
    if (!info) return;
    const currentCatId = info.categoryId || '';
    const flat = this.getAllCategoriesFlat(Store.data.categories || []);
    let options = '<option value="">— 无分类 —</option>';
    flat.forEach(c => { options += `<option value="${c.id}" ${c.id === currentCatId ? 'selected' : ''}>${c.name}</option>`; });
    document.getElementById('editCharCatLabel').textContent = `修改「${ch}」的分类`;
    document.getElementById('editCharCatSelect').innerHTML = options;
    document.getElementById('editCharCatSelect').value = currentCatId;
    document.getElementById('editCharCatChar').value = ch;
    document.getElementById('editCharCatModal').classList.add('show');
  },

  confirmEditCharCategory() {
    const ch = document.getElementById('editCharCatChar').value;
    const newCatId = document.getElementById('editCharCatSelect').value;
    const info = Store.data.dict[ch];
    if (info) { info.categoryId = newCatId || undefined; Store.save(); Store.saveFile('dict'); App.UI.toast(`已更新「${ch}」的分类`); this.refresh(); }
    document.getElementById('editCharCatModal').classList.remove('show');
  },

  updateCategorySelects() {
    const flat = this.getAllCategoriesFlat(Store.data.categories || []);
    ['categoryParentSelect', 'charCategorySelect', 'batchCategorySelect'].forEach(selId => {
      const sel = document.getElementById(selId);
      if (!sel) return;
      const currentVal = sel.value;
      sel.innerHTML = '<option value="">— ' + (selId === 'categoryParentSelect' ? '根目录' : '无分类') + ' —</option>';
      flat.forEach(c => { const opt = document.createElement('option'); opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt); });
      if (currentVal && flat.some(c => c.id === currentVal)) sel.value = currentVal;
    });
  },

  toggleShowAllAddChars() {
    const area = document.getElementById('categoryAddCharsArea');
    area.dataset.showAll = area.dataset.showAll === 'true' ? 'false' : 'true';
    if (this._activeAddCatId) {
      const catName = this.getCategoryNameById(Store.data.categories || [], this._activeAddCatId) || '';
      this.showAddCharsToCategory(this._activeAddCatId, catName);
    }
  },

  toggleAllAddChars() {
    const labels = document.querySelectorAll('#categoryAddCharList > label');
    const visibleCbs = Array.from(labels).filter(l => l.style.display !== 'none').map(l => l.querySelector('.add-chars-cb')).filter(Boolean);
    if (visibleCbs.length === 0) return;
    const allChecked = visibleCbs.every(cb => cb.checked);
    visibleCbs.forEach(cb => { cb.checked = !allChecked; });
  },

  async resetAllCategoryAssign() {
    const catCount = Object.values(Store.data.dict).filter(d => d.categoryId).length;
    if (catCount === 0) { App.UI.toast('没有已分类的字', 'info'); return; }
    const confirmed = await App.UI.showConfirm(`确定清除全部 ${catCount} 个字的分类吗？`);
    if (!confirmed) return;
    Object.values(Store.data.dict).forEach(d => { d.categoryId = undefined; });
    Store.save();
    await Store.saveFile('dict');
    App.UI.toast(`已清除 ${catCount} 个字的分类`);
    this.refresh();
    if (App.Dict) App.Dict.render();
  },

  // ---- 分类浏览 ----

  renderCategoryBrowse(catId, catName) {
    const container = document.getElementById('catBrowseContent');
    if (!container) return;
    if (!catId) {
      container.innerHTML = '<p class="empty-msg" style="padding:4px 0;font-size:13px;">点击分类树中的分类查看其中的字</p>';
      return;
    }

    let chars;
    if (catId === '_uncategorized') {
      // 未分类：显示所有没有 categoryId 的字
      chars = Object.entries(Store.data.dict)
        .filter(([ch, info]) => !info.categoryId)
        .sort((a, b) => a[0].localeCompare(b[0], 'zh'));
    } else {
      const expandedIds = Store.getCategoryAndDescendantIds(catId);
      chars = Object.entries(Store.data.dict)
        .filter(([ch, info]) => info.categoryId && expandedIds.has(info.categoryId))
        .sort((a, b) => a[0].localeCompare(b[0], 'zh'));
    }
    let html = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <span style="font-size:15px;font-weight:600;color:#2d3748;">📁 ${catName}</span>
      <span style="font-size:13px;color:#a0aec0;">${chars.length} 个字</span></div>`;
    if (chars.length === 0) {
      html += '<p class="empty-msg" style="padding:8px 0;font-size:13px;">该分类下暂无字，可在上方面板中添加</p>';
    } else {
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;">';
      chars.forEach(([ch, info]) => {
        html += `<div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:16px;font-size:14px;background:#fff;border:2px solid #e2e8f0;">
          <span style="font-weight:600;">${ch}</span>
          <span style="font-size:11px;color:#667eea;">${info.pinyin}</span>
          <span onclick="App.Library.editCharCategory('${ch}')" style="cursor:pointer;font-size:12px;color:#a0aec0;">✎</span>
          <span onclick="App.Library.removeCharFromCategory('${ch}')" style="cursor:pointer;font-size:14px;color:#fc8181;">⊘</span>
          <span onclick="App.Library.deleteCharFromDict('${ch}')" style="cursor:pointer;font-size:14px;color:#fc8181;">×</span>
        </div>`;
      });
      html += '</div>';
    }
    container.innerHTML = html;
  },

  async removeCharFromCategory(ch) {
    if (!Store.data.dict[ch]) return;
    const confirmed = await App.UI.showConfirm(`确定将「${ch}」移出此分类吗？`);
    if (!confirmed) return;
    Store.data.dict[ch].categoryId = undefined;
    Store.save();
    await Store.saveFile('dict');
    App.UI.toast(`「${ch}」已移出分类`);
    this.refresh();
    if (this._activeAddCatId) {
      const catName = this.getCategoryNameById(Store.data.categories || [], this._activeAddCatId) || '';
      this.renderCategoryBrowse(this._activeAddCatId, catName);
    }
  },

  async deleteCharFromDict(ch) {
    if (!Store.data.dict[ch]) return;
    const related = Store.data.words.filter(w => w.chars.includes(ch));
    let msg = `确定从字库中删除「${ch}」吗？`;
    if (related.length > 0) msg += `\n包含该字的 ${related.length} 个词语也会被删除。`;
    const confirmed = await App.UI.showConfirm(msg);
    if (!confirmed) return;
    Store.data.words = Store.data.words.filter(w => !w.chars.includes(ch));
    delete Store.data.dict[ch];
    Store.save();
    App.UI.toast(`已删除「${ch}」`);
    this.refresh();
    if (this._activeAddCatId) {
      const catName = this.getCategoryNameById(Store.data.categories || [], this._activeAddCatId) || '';
      this.renderCategoryBrowse(this._activeAddCatId, catName);
    }
  },
};

// 兼容旧版 onclick
window.switchLibTab = (tab) => App.Library.switchLibTab(tab);
window.addChar = () => App.Library.addChar();
window.removeChar = (ch) => App.Library.removeChar(ch);
window.removeWord = (id) => App.Library.removeWord(id);
window.onCharInput = () => App.Library.onCharInput();
window.selectPinyinOption = (py) => App.Library.selectPinyinOption(py);
window.refreshAllPinyin = () => App.Library.refreshAllPinyin();
window.addCategory = () => App.Library.addCategory();
window.removeCategory = (id) => App.Library.removeCategory(id);
window.toggleCatCollapse = (id) => App.Library.toggleCatCollapse(id);
window.showAddCharsToCategory = (id, name) => App.Library.showAddCharsToCategory(id, name);
window.confirmAddCharsToCategory = () => App.Library.confirmAddCharsToCategory();
window.closeAddCharsPanel = () => App.Library.closeAddCharsPanel();
window.onCatSearchInput = () => App.Library.onCatSearchInput();
window.editCharCategory = (ch) => App.Library.editCharCategory(ch);
window.confirmEditCharCategory = () => App.Library.confirmEditCharCategory();
window.onComposeSearchInput = () => App.Library.onComposeSearchInput();
window.selectComposeChar = (ch) => App.Library.selectComposeChar(ch);
window.addManualWord = () => App.Library.addManualWord();
window.toggleWordCheck = (idx) => App.Library.toggleWordCheck(idx);
window.toggleBatchMode = () => App.Library.toggleBatchMode();
window.batchImport = () => App.Library.batchImport();
window.removeCharFromCategory = (ch) => App.Library.removeCharFromCategory(ch);
window.deleteCharFromDict = (ch) => App.Library.deleteCharFromDict(ch);
window.toggleShowAllAddChars = () => App.Library.toggleShowAllAddChars();
window.toggleAllAddChars = () => App.Library.toggleAllAddChars();
window.resetAllCategoryAssign = () => App.Library.resetAllCategoryAssign();
