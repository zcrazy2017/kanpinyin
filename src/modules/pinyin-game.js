// ============================================================
//  拼音大闯关 — 听音拼字小游戏
//  10 关，每关比上一关多一个字，从字库随机出题
//  已出现过的字权重降低，出现过但错误的字权重升高
// ============================================================
App.PinyinGame = {
  TOTAL_LEVELS: 10,
  _state: null, // 当前游戏状态

  /** 重置游戏状态 */
  _initState() {
    this._stopTimer();
    this._state = {
      currentLevel: 0,
      currentWordIdx: 0,
      chars: [],
      fragments: [],
      correctAnswers: [],
      playerAnswers: [],
      usedFragmentIndices: [],
      completedLevels: 0,
      charStats: {},
      isComplete: false,
      timerStart: null,  // 开始时间戳
      timerElapsed: 0,    // 已用秒数
      timerInterval: null,// setInterval 句柄
    };
  },

  /** 汉字的 HTML 模板 */
  PAGE_HTML: `
  <div class="pinyin-game" style="max-width:700px;margin:0 auto;padding:20px;text-align:center;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
      <div style="font-size:18px;font-weight:700;color:#667eea;" id="pinyinGameTitle">🎮 拼音大闯关</div>
      <div style="display:flex;gap:12px;align-items:center;">
        <span style="font-size:14px;color:#4a5568;" id="pinyinGameProgress">第 0/10 关</span>
        <span id="pinyinGameTimer" style="font-size:13px;color:#718096;font-variant-numeric:tabular-nums;">⏱ 00:00</span>
        <span id="pinyinGameStars" style="font-size:16px;"></span>
      </div>
    </div>

    <!-- 进度条 -->
    <div style="width:100%;height:8px;background:#edf2f7;border-radius:4px;overflow:hidden;margin-bottom:20px;">
      <div id="pinyinGameBar" style="height:100%;width:0%;background:linear-gradient(90deg,#667eea,#9f7aea);border-radius:4px;transition:width 0.5s;"></div>
    </div>

    <!-- 游戏主区域 -->
    <div id="pinyinGameArea">
      <div style="padding:40px 20px;background:#f7fafc;border-radius:16px;border:2px dashed #e2e8f0;">
        <p style="font-size:16px;color:#718096;margin-bottom:8px;">🎯 一共 10 关，每关比上一关多一个字</p>
        <p style="font-size:14px;color:#a0aec0;margin-bottom:20px;">选择拼音碎片 → 点击「确认」→ 正确进入下一字，错误从头再来</p>
        <button class="btn btn-success" onclick="App.PinyinGame.startGame()" style="font-size:18px;padding:14px 40px;">🚀 开始闯关</button>
      </div>
    </div>

    <!-- 闯关记录 -->
    <div id="pinyinGameHistory" style="margin-top:20px;"></div>
  </div>
  `,

  /** 渲染页面 */
  renderPage() {
    const container = document.getElementById('app-content-pinyingame');
    if (!container) return;
    container.innerHTML = this.PAGE_HTML;
    this._initState();
    this._updateProgress();
    this._renderHistory();
  },

  /** 开始游戏 */
  startGame() {
    this._initState();
    this._startTimer();
    this._nextLevel();
  },

  /** 启动计时器 */
  _startTimer() {
    this._stopTimer();
    this._state.timerStart = Date.now();
    this._state.timerElapsed = 0;
    this._state.timerInterval = setInterval(() => {
      this._state.timerElapsed = Math.floor((Date.now() - this._state.timerStart) / 1000);
      this._updateTimerDisplay();
    }, 200);
    // 等 timerInterval 赋值后再更新显示
    if (this._state.timerInterval) this._updateTimerDisplay();
  },

  /** 停止计时器 */
  _stopTimer() {
    if (this._state && this._state.timerInterval) {
      clearInterval(this._state.timerInterval);
      this._state.timerInterval = null;
    }
  },

  /** 更新计时器显示 */
  _updateTimerDisplay() {
    const el = document.getElementById('pinyinGameTimer');
    if (!el) return;
    if (!this._state || !this._state.timerInterval) {
      el.textContent = '⏱ --:--';
      return;
    }
    const s = this._state.timerElapsed || 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    el.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  },

  /** 获取格式化时间字符串 */
  _formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}分${String(s).padStart(2, '0')}秒`;
  },

  /** 进入下一关 */
  _nextLevel() {
    if (this._state.currentLevel >= this.TOTAL_LEVELS) {
      this._showVictory();
      return;
    }
    this._state.currentLevel++;
    this._state.currentWordIdx = 0;
    this._state.playerAnswers = [];
    this._state.usedFragmentIndices = [];
    this._generateLevel();
    this._renderLevel();
  },

  /** 生成当前关卡的题目 */
  _generateLevel() {
    const n = this._state.currentLevel; // 第N关有N个字
    const allChars = Object.keys(Store.data.dict);
    if (allChars.length === 0) { App.UI.toast('字库为空，请先添加字', 'error'); return; }

    // 加权随机选 n 个字
    const selected = [];
    const pool = [...allChars];
    for (let i = 0; i < n && pool.length > 0; i++) {
      const idx = this._weightedRandomChar(pool);
      if (idx < 0) break;
      const ch = pool.splice(idx, 1)[0];
      selected.push(ch);
      // 更新 seen 计数
      if (!this._state.charStats[ch]) this._state.charStats[ch] = { seen: 0, wrong: 0 };
      this._state.charStats[ch].seen++;
    }
    this._state.chars = selected;

    // 为每个字生成正确碎片
    this._state.correctAnswers = [];
    const allFragments = [];
    const distractorPool = [];

    selected.forEach(ch => {
      const info = Store.data.dict[ch];
      const py = info ? info.pinyin : '';
      const frags = this._splitPinyin(py);
      this._state.correctAnswers.push({ char: ch, pinyin: py, fragments: frags });
      frags.forEach(f => allFragments.push({ char: ch, text: f, correct: true }));
    });

    // 从其他字收集混淆碎片
    const otherChars = allChars.filter(c => !selected.includes(c));
    const usedDistractors = new Set();
    const distractorCount = Math.min(n * 2, otherChars.length);

    for (let i = 0; i < distractorCount && otherChars.length > 0; i++) {
      const idx = Math.floor(Math.random() * otherChars.length);
      const ch = otherChars[idx];
      const info = Store.data.dict[ch];
      const py = info ? info.pinyin : '';
      const frags = this._splitPinyin(py);
      frags.forEach(f => {
        if (!usedDistractors.has(f) && !allFragments.some(x => x.text === f)) {
          usedDistractors.add(f);
          allFragments.push({ char: null, text: f, correct: false });
        }
      });
    }

    // 打乱所有碎片
    this._state.fragments = App.UI.shuffle(allFragments);
  },

  /** 加权随机选字：已出现的权重低，出错过的权重高 */
  _weightedRandomChar(pool) {
    return App.UI.weightedRandomIndex(pool, ch => {
      const stats = this._state.charStats[ch];
      if (!stats) return 1; // 从未出现，正常权重
      const seen = stats.seen || 0;
      const wrong = stats.wrong || 0;
      // 已出现但没出过错 → 降低权重
      if (wrong === 0) return 1 / (seen + 1);
      // 出过错 → 提高权重
      return wrong * 3 / (seen + 1);
    });
  },

  /** 拆分拼音：声母 + 介母 + 韵母
   *  ui/iu/ie/üe/in/un/ün 视为完整韵母不分拆
   *  ua/uo/ia/iao/ian/iang/uai/uan/uang 拆为介母+韵母
   */
  _splitPinyin(py) {
    if (!py) return ['?'];
    const initials = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l',
                      'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'];

    // 去声调辅助（仅用于判断）
    const _stripTone = s => s.normalize('NFD').replace(/[\u0300-\u0368]/g, '');

    let initial = '';
    let final = py;
    for (const init of initials) {
      if (py.startsWith(init)) {
        initial = init;
        final = py.slice(init.length);
        break;
      }
    }
    // 判断是否应拆分介母：final 以 i/u/ü 开头，且前两个字符不是合法复合韵母
    if (final.length > 1 && /^[iuü]/.test(final)) {
      const plain2 = _stripTone(final.slice(0, 2));
      // 不拆分的合法复合韵母（介母+韵尾构成完整韵母）
      const keepTogether = new Set(['ui', 'iu', 'ie', 'üe', 'ue', 'in', 'un', 'ün']);
      if (keepTogether.has(plain2)) {
        // 保持完整，不拆分
        if (initial) return [initial, final];
        return [final];
      }
      // 需要拆分介母
      const medial = final[0];
      const rest = final.slice(1);
      if (initial) return [initial, medial, rest];
      return [medial, rest];
    }
    if (initial) return [initial, final];
    return [final];
  },

  /** 渲染当前关卡 */
  _renderLevel() {
    const area = document.getElementById('pinyinGameArea');
    if (!area) return;
    const n = this._state.currentLevel;
    if (n === 0) return;

    let html = '';

    // 显示所有字
    html += '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:20px;">';
    this._state.chars.forEach((ch, i) => {
      const answered = this._state.playerAnswers[i];
      const status = answered ? (answered.correct === true ? '✅' : answered.correct === false ? '❌' : '⬜') : '⬜';
      html += `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;
                padding:12px 16px;background:#fff;border-radius:12px;border:2px solid #e2e8f0;
                box-shadow:0 2px 6px rgba(0,0,0,0.04);min-width:60px;">
        <span style="font-size:40px;font-weight:700;color:#2d3748;">${ch}</span>
        <span style="font-size:14px;">${status}</span>
        ${answered ? `<span style="font-size:11px;color:#a0aec0;">${answered.pinyin}</span>` : ''}
      </div>`;
    });
    html += '</div>';

    // 显示当前正在拼的字
    const currentIdx = this._state.currentWordIdx;
    const currentChar = currentIdx < this._state.chars.length ? this._state.chars[currentIdx] : '';
    const correctInfo = currentIdx < this._state.chars.length ? this._state.correctAnswers[currentIdx] : null;
    const playerFrags = currentIdx < this._state.chars.length ? (this._state.playerAnswers[currentIdx]?.fragments || []) : [];

    if (currentIdx < this._state.chars.length) {

      html += `<div style="margin-bottom:16px;">
        <div style="font-size:14px;color:#718096;margin-bottom:8px;">第 ${currentIdx + 1}/${this._state.chars.length} 个字</div>
        <div style="font-size:48px;font-weight:700;color:#667eea;margin-bottom:8px;">${currentChar}</div>
        <div style="font-size:16px;color:#4a5568;margin-bottom:4px;">点击碎片拼出拼音：</div>
        <div style="display:flex;gap:8px;justify-content:center;min-height:40px;padding:10px;background:#ebf4ff;border-radius:10px;border:2px dashed #667eea;">
          ${playerFrags.length > 0 ? playerFrags.map(f => `<span style="padding:6px 14px;background:#667eea;color:#fff;border-radius:8px;font-size:18px;font-weight:600;">${f}</span>`).join('') : '<span style="color:#a0aec0;font-size:14px;">← 点击下方碎片</span>'}
        </div>
      </div>`;
    }

    // 显示所有可选碎片（按索引独立跟踪使用状态）
    const usedIdxSet = new Set(this._state.usedFragmentIndices);
    html += `<div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-bottom:20px;max-width:500px;margin-left:auto;margin-right:auto;">`;
    this._state.fragments.forEach((f, i) => {
      const used = usedIdxSet.has(i);
      html += `<button class="btn ${used ? 'btn-ghost' : 'btn-outline'}" style="font-size:16px;padding:8px 16px;${used ? 'opacity:0.4;' : ''}"
        onclick="App.PinyinGame._clickFragment(${i})" ${used ? 'disabled' : ''}>
        ${f.text}
      </button>`;
    });
    html += '</div>';

    // 撤销和确认按钮
    const canConfirm = currentIdx < this._state.chars.length && playerFrags.length >= correctInfo.fragments.length;
    html += `<div style="display:flex;gap:10px;justify-content:center;">
      <button class="btn btn-ghost btn-sm" onclick="App.PinyinGame._undoFragment()">↩ 撤销</button>
      <button class="btn btn-success btn-sm" onclick="App.PinyinGame._confirmWord()" ${canConfirm ? '' : 'disabled'}
        style="${canConfirm ? '' : 'opacity:0.4;cursor:not-allowed;'}">✅ 确认</button>
    </div>`;

    area.innerHTML = html;
  },

  /** 点击碎片 — 仅记录，不检查，等确认按钮 */
  _clickFragment(index) {
    const frag = this._state.fragments[index];
    if (!frag || this._state.usedFragmentIndices.includes(index)) return;

    const currentIdx = this._state.currentWordIdx;
    if (currentIdx >= this._state.chars.length) return;

    if (!this._state.playerAnswers[currentIdx]) {
      this._state.playerAnswers[currentIdx] = {
        char: this._state.chars[currentIdx],
        fragments: [],
        fragmentIndices: [],
        pinyin: ''
      };
    }
    this._state.playerAnswers[currentIdx].fragments.push(frag.text);
    this._state.playerAnswers[currentIdx].fragmentIndices.push(index);
    this._state.usedFragmentIndices.push(index);

    this._renderLevel();
  },

  /** 确认当前字的答案 */
  _confirmWord() {
    const currentIdx = this._state.currentWordIdx;
    if (currentIdx >= this._state.chars.length || !this._state.playerAnswers[currentIdx]) return;

    const correctInfo = this._state.correctAnswers[currentIdx];
    const playerFrags = this._state.playerAnswers[currentIdx].fragments;
    const isCorrect = playerFrags.length >= correctInfo.fragments.length &&
      playerFrags.every((f, i) => f === correctInfo.fragments[i]);

    this._state.playerAnswers[currentIdx].correct = isCorrect;
    this._state.playerAnswers[currentIdx].pinyin = correctInfo.pinyin;

    if (!isCorrect) {
      // 错误 → 记录并失败
      const ch = this._state.chars[currentIdx];
      if (!this._state.charStats[ch]) this._state.charStats[ch] = { seen: 0, wrong: 0 };
      this._state.charStats[ch].wrong++;
      App.UI.toast(`❌ "${ch}" 的正确拼音是 "${correctInfo.pinyin}"`, 'error');
      this._stopTimer();
      this._recordAttempt({
        char: ch,
        correctPinyin: correctInfo.pinyin,
        playerAnswer: this._state.playerAnswers[currentIdx].fragments.join('')
      });
      this._showGameOver();
      return;
    }

    // 正确 → 进入下一个字
    App.UI.toast(`✅ "${correctInfo.char}" 正确！`, 'success');
    this._state.currentWordIdx++;
    this._renderLevel();

    // 检查是否所有字都完成
    if (this._state.currentWordIdx >= this._state.chars.length) {
      this._onLevelComplete();
    }
  },

  /** 撤销上一个碎片 */
  _undoFragment() {
    const currentIdx = this._state.currentWordIdx;
    if (currentIdx >= this._state.playerAnswers.length) return;
    const ans = this._state.playerAnswers[currentIdx];
    if (ans && ans.fragments.length > 0) {
      const lastIdx = ans.fragmentIndices.pop();
      ans.fragments.pop();
      // 从全局使用列表中移除
      const pos = this._state.usedFragmentIndices.indexOf(lastIdx);
      if (pos >= 0) this._state.usedFragmentIndices.splice(pos, 1);
      this._renderLevel();
    }
  },

  /** 关卡完成 — 全部正确才推进 */
  _onLevelComplete() {
    this._state.completedLevels++;
    App.UI.toast(`🎉 第 ${this._state.currentLevel} 关通过！`, 'success');
    this._updateProgress();
    this._state.currentWordIdx = 0;
    setTimeout(() => this._nextLevel(), 1500);
  },

  /** 记录闯关结果 */
  _recordAttempt(errorInfo) {
    const student = Store.getCurrentStudent();
    if (!student.pinyinGameHistory) student.pinyinGameHistory = [];
    student.pinyinGameHistory.unshift({
      date: new Date().toISOString().slice(0, 10),
      level: this._state.currentLevel,
      cleared: false,
      time: this._state.timerElapsed,
      errorChar: errorInfo?.char || '',
      errorPinyin: errorInfo?.correctPinyin || '',
      playerAnswer: errorInfo?.playerAnswer || ''
    });
    // 只保留最近 10 条
    if (student.pinyinGameHistory.length > 10) {
      student.pinyinGameHistory.length = 10;
    }
    Store.save();
    this._renderHistory();
  },

  /** 闯关失败画面 */
  _showGameOver() {
    const area = document.getElementById('pinyinGameArea');
    const level = this._state.currentLevel;
    const time = this._state.timerElapsed;
    const timeStr = this._formatTime(time);
    area.innerHTML = `
      <div style="padding:40px 20px;text-align:center;background:linear-gradient(135deg,#fff5f5,#fff);border-radius:20px;border:2px solid #fc8181;">
        <div style="font-size:64px;margin-bottom:12px;">💥</div>
        <div style="font-size:28px;font-weight:700;color:#c53030;margin-bottom:8px;">闯关失败！</div>
        <div style="font-size:16px;color:#718096;margin-bottom:20px;">
          在第 <strong style="color:#e53e3e;">${level}</strong> 关拼错了，<br>
          用时 ${timeStr}，不要气馁，再来一次吧！
        </div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-primary" onclick="App.PinyinGame.startGame()" style="font-size:16px;padding:12px 30px;">🔄 重新开始</button>
          <button class="btn btn-ghost" onclick="App.PinyinGame.renderPage()" style="font-size:14px;padding:12px 20px;">🏠 返回首页</button>
        </div>
        <div style="margin-top:20px;font-size:12px;color:#a0aec0;">💡 提示：先选声母，再选韵母，点击「确认」提交答案</div>
      </div>
    `;
    this._updateProgress();
  },

  /** 胜利画面 */
  _showVictory() {
    this._state.isComplete = true;
    const area = document.getElementById('pinyinGameArea');

    // 记录通关（永久）
    const student = Store.getCurrentStudent();
    if (!student.pinyinGameHistory) student.pinyinGameHistory = [];
    const time = this._state.timerElapsed;
    student.pinyinGameHistory.unshift({
      date: new Date().toISOString().slice(0, 10),
      level: 10,
      cleared: true,
      time: time
    });
    Store.save();

    // 记录最佳成绩
    const best = student.pinyinGameBestTime || Infinity;
    if (time < best) {
      student.pinyinGameBestTime = time;
      Store.save();
    }

    // 记录成就
    if (!student.pinyinGameCleared) {
      student.pinyinGameCleared = true;
      student.pinyinGameClearDate = new Date().toISOString().slice(0, 10);
      Store.save();
    }

    const timeStr = this._formatTime(time);
    const isBest = time <= (student.pinyinGameBestTime || Infinity) ? '🏆 新纪录！' : '';

    area.innerHTML = `
      <div style="padding:40px 20px;text-align:center;background:linear-gradient(135deg,#f0fff4,#ebf8ff,#faf5ff);border-radius:20px;border:2px solid #48bb78;">
        <div style="font-size:64px;margin-bottom:12px;">🏆</div>
        <div style="font-size:28px;font-weight:700;color:#2d3748;margin-bottom:8px;">🎉 恭喜通关！</div>
        <div style="font-size:16px;color:#718096;margin-bottom:20px;">你已完成全部 10 关拼音大闯关！</div>
        <div style="font-size:20px;font-weight:700;color:#667eea;margin-bottom:16px;">⏱ 用时 ${timeStr} ${isBest}</div>
        <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:20px;">
          <div style="padding:12px 20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:700;color:#667eea;">10</div>
            <div style="font-size:12px;color:#a0aec0;">总关数</div>
          </div>
          <div style="padding:12px 20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:700;color:#48bb78;">🥇</div>
            <div style="font-size:12px;color:#a0aec0;">全部完成</div>
          </div>
          <div style="padding:12px 20px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size:24px;font-weight:700;color:#9f7aea;">${timeStr}</div>
            <div style="font-size:12px;color:#a0aec0;">用时</div>
          </div>
        </div>
        <button class="btn btn-success" onclick="App.PinyinGame.startGame()" style="font-size:16px;padding:12px 30px;">🔄 再来一次</button>
        <button class="btn btn-ghost" onclick="App.PinyinGame.renderPage()" style="font-size:14px;padding:12px 20px;">🏠 返回</button>
      </div>
    `;
    this._updateProgress();
    if (App.Stats && App.Stats.renderAchievements) App.Stats.renderAchievements();
  },

  /** 更新进度显示 */
  _updateProgress() {
    const progEl = document.getElementById('pinyinGameProgress');
    const barEl = document.getElementById('pinyinGameBar');
    const starEl = document.getElementById('pinyinGameStars');

    if (progEl) progEl.textContent = `第 ${this._state?.currentLevel || 0}/${this.TOTAL_LEVELS} 关`;
    if (barEl) {
      const pct = this._state ? Math.round(this._state.completedLevels / this.TOTAL_LEVELS * 100) : 0;
      barEl.style.width = pct + '%';
    }
    if (starEl) {
      const n = this._state?.completedLevels || 0;
      starEl.textContent = '⭐'.repeat(Math.min(n, 10));
    }
  },

  /** 查看失败记录详情 */
  _showAttemptDetail(historyIndex) {
    const student = Store.getCurrentStudent();
    const history = student.pinyinGameHistory || [];
    const hasCleared = history.some(h => h.cleared);
    const displayHistory = hasCleared ? history.filter(h => h.cleared) : history;
    const h = displayHistory[historyIndex];
    if (!h || h.cleared) return;

    document.getElementById('confirmMsg').innerHTML =
      `📋 失败详情<br><br>` +
      `📅 日期: ${h.date}<br>` +
      `🔢 关卡: 第 ${h.level} 关<br>` +
      `⏱ 用时: ${this._formatTime(h.time || 0)}<br><br>` +
      `❌ 拼错的字: <strong>「${h.errorChar}」</strong><br>` +
      `📖 正确拼音: <strong style="color:#667eea;">${h.errorPinyin}</strong><br>` +
      `✏️ 你的答案: ${h.playerAnswer || '(未填写)'}`;
    document.getElementById('confirmModal').classList.add('show');
  },

  /** 删除失败记录 */
  _deleteAttempt(historyIndex) {
    const student = Store.getCurrentStudent();
    const history = student.pinyinGameHistory || [];
    const hasCleared = history.some(h => h.cleared);
    // 找到实际索引
    let realIndex = -1;
    if (hasCleared) {
      let clearedCount = 0;
      for (let i = 0; i < history.length; i++) {
        if (history[i].cleared) { clearedCount++; if (historyIndex === 0) { realIndex = i; break; } }
      }
    } else {
      realIndex = historyIndex;
    }
    if (realIndex < 0 || realIndex >= history.length) return;
    const h = history[realIndex];
    if (h.cleared) { App.UI.toast('通关记录不可删除', 'info'); return; }

    App.UI.showConfirm(`确定删除 ${h.date} 的失败记录（第 ${h.level} 关）吗？`).then(ok => {
      if (!ok) return;
      student.pinyinGameHistory.splice(realIndex, 1);
      Store.save();
      this._renderHistory();
      App.UI.toast('已删除记录');
    });
  },

  /** 显示最近 10 次闯关记录 */
  _renderHistory() {
    const container = document.getElementById('pinyinGameHistory');
    if (!container) return;
    const student = Store.getCurrentStudent();
    const history = student.pinyinGameHistory || [];
    if (history.length === 0) { container.innerHTML = ''; return; }

    // 检查是否有通关记录（永久保留）
    const hasCleared = history.some(h => h.cleared);

    let html = `<div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:14px;text-align:left;">
      <div style="font-size:14px;font-weight:600;color:#4a5568;margin-bottom:8px;">
        📜 闯关记录 ${hasCleared ? '<span style="color:#48bb78;font-size:12px;font-weight:400;">🏆 已通关！</span>' : ''}
      </div>`;

    // 有通关记录时，只显示通关那一条
    const displayHistory = hasCleared ? history.filter(h => h.cleared).slice(0, 1) : history;

    const detailModalId = 'pinyinGameDetailModal';

    displayHistory.forEach((h, idx) => {
      const icon = h.cleared ? '🏆' : '💥';
      const color = h.cleared ? '#48bb78' : '#e53e3e';
      const label = h.cleared ? '通关' : `第 ${h.level} 关失败`;
      const timeStr = h.time != null ? this._formatTime(h.time) : '';

      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#f7fafc;border-radius:8px;margin-bottom:4px;font-size:13px;flex-wrap:wrap;">
        <span>${icon}</span>
        <span style="color:${color};font-weight:600;">${label}</span>
        ${timeStr ? `<span style="color:#a0aec0;font-size:11px;">⏱ ${timeStr}</span>` : ''}
        <span style="color:#a0aec0;font-size:12px;">${h.date}</span>`;

      if (!h.cleared) {
        html += `
          <button class="btn btn-ghost btn-sm" onclick="App.PinyinGame._showAttemptDetail(${idx})" style="font-size:11px;padding:2px 8px;">📋 详情</button>
          <button class="btn btn-ghost btn-sm" onclick="App.PinyinGame._deleteAttempt(${idx})" style="font-size:11px;padding:2px 8px;color:#e53e3e;">🗑️</button>`;
      }

      html += `</div>`;
    });

    // 显示最佳成绩
    if (student.pinyinGameBestTime != null) {
      html += `<div style="font-size:11px;color:#9f7aea;margin-top:6px;text-align:center;">
        🏆 最佳成绩: ${this._formatTime(student.pinyinGameBestTime)}
      </div>`;
    }

    if (!hasCleared && history.length > 0) {
      html += `<div style="font-size:11px;color:#a0aec0;margin-top:6px;text-align:center;">仅显示最近 ${history.length} 次记录</div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  },
};

// 兼容 onclick
window.startPinyinGame = () => App.PinyinGame.startGame();
