// ============================================================
//  Pet Module — 辅助精灵「墨小黑」小龙成长系统
// ============================================================
App.Pet = {
  _currentTheme: 'dragon',

  // 升阶所需 EXP（累计）
  STAGE_EXP_THRESHOLDS: [0, 50, 130, 240, 380, 550],

  // 各阶段信息
  STAGES: [
    { name: '沉睡', desc: '等待被唤醒...', expNeeded: 50 },
    { name: '破壳', desc: '刚刚来到这个世界', expNeeded: 80 },
    { name: '幼龙', desc: '开始扑腾小翅膀了', expNeeded: 110 },
    { name: '少年', desc: '能喷小火苗了！', expNeeded: 140 },
    { name: '巨龙', desc: '威猛的空中霸主', expNeeded: 170 },
    { name: '神龙', desc: '传说中的守护神', expNeeded: 0 },
  ],

  // 交互消息
  MESSAGES: {
    greet: ['(^v^) 今天也要加油哦！', '(*^▽^*) 等你来练习！', '(>ω<) 你好呀！'],
    practiceReady: ['📝 来做题啦！', '(｀・ω・´) 准备挑战！', '💪 今天也要努力！'],
    perfect: ['🎉 全对！太厉害了！', 'ヽ(^o^)丅 天才！', '✨ 完美！继续加油！'],
    wrong: ['💪 没关系，下次一定对！', '(´・ω・\') 再试一次！', '😊 错了不怕，学会了就好！'],
    slainError: ['✨ 又消灭了一个错词！', 'ヽ(^◇^)/ 好棒！', '🌟 进步了！'],
    levelUp: ['🎊 进化了！', '🌟 我长大了！', '✨ 新的力量觉醒了！'],
    streak: ['🔥 已经坚持练习了', '👏 每天都在进步！'],
  },

  /** 获取当前主题的精灵数组 */
  _getSprites() {
    const pet = this.getPet();
    const theme = pet.theme || 'dragon';
    return PetThemeRegistry.getSprites(theme);
  },

  /** 获取所有注册的主题 key */
  _getAllThemeKeys() {
    return PetThemeRegistry.keys();
  },

  /** 获取主题数据 */
  _getThemeInfo(key) {
    return PetThemeRegistry.get(key);
  },

  // ---- 初始化 ----

  init() {
    const student = Store.getCurrentStudent();
    if (!student.pet) {
      student.pet = {
        theme: 'dragon',
        stage: 0,
        exp: 0,
        unlockedThemes: ['dragon'],
        milestones: { firstPerfect: false, firstLevelUp: false },
        lastMessageDate: '',
      };
      Store.save();
    }
    // 确保 pet 数据存在
    this._ensurePetData(student);
    // 启动全局漫游 + 可拖拽 + 悬停动画
    this._startGlobalRoam();
    this._makeDraggable();
    this._setupHoverAnimation();
  },

  _ensurePetData(s) {
    if (!s.pet) {
      s.pet = { theme: 'dragon', stage: 0, exp: 0, unlockedThemes: ['dragon'], milestones: { firstPerfect: false, firstLevelUp: false }, lastMessageDate: '' };
    }
    if (!s.pet.milestones) s.pet.milestones = { firstPerfect: false, firstLevelUp: false };
    if (!s.pet.lastMessageDate) s.pet.lastMessageDate = '';
    if (!s.pet.unlockedThemes) s.pet.unlockedThemes = ['dragon'];
  },

  // ---- 获取精灵状态 ----

  getPet() {
    const student = Store.getCurrentStudent();
    this._ensurePetData(student);
    return student.pet;
  },

  getStage() { return this.getPet().stage; },
  getStageInfo(stage) { return this.STAGES[stage] || this.STAGES[0]; },
  getExp() { return this.getPet().exp; },

  getStageExp() {
    const stage = this.getStage();
    return this.STAGE_EXP_THRESHOLDS[stage] || 0;
  },

  getNextStageExp() {
    const stage = this.getStage();
    if (stage >= 5) return this.STAGE_EXP_THRESHOLDS[5];
    return this.STAGE_EXP_THRESHOLDS[stage + 1];
  },

  getExpProgress() {
    const current = this.getStageExp();
    const next = this.getNextStageExp();
    const exp = this.getExp();
    if (next === current) return 100;
    return Math.min(100, Math.round((exp - current) / (next - current) * 100));
  },

  // ---- 核心：渲染全局浮动精灵 ----

  /** 各阶段展示页/全局精灵像素尺寸（随进化递增） */
  SHOWCASE_SIZES: [90, 96, 104, 112, 120, 130],

  render() {
    const container = document.getElementById('globalPetSprite');
    if (!container) return;

    const pet = this.getPet();
    const stage = pet.stage;
    const sprites = this._getSprites();
    const svg = sprites[Math.min(stage, sprites.length - 1)];
    const size = this.SHOWCASE_SIZES[stage] || 90;

    // 渲染 SVG（全局精灵与进化页展示同样尺寸）
    const sizedSvg = svg
      .replace(/width="[^"]*"/, `width="${size}"`)
      .replace(/height="[^"]*"/, `height="${size}"`)
      .replace(/viewBox="0 0 \d+ \d+"/, 'viewBox="0 0 72 72"');
    container.innerHTML = sizedSvg;

    // 更新容器
    container.className = 'global-pet-sprite';
    container.classList.add('stage-' + stage);
    container.style.width = size + 'px';
    container.style.height = size + 'px';

    // 也同步渲染宠物页面上的大精灵
    this._renderShowcase();
  },

  // ---- 经验系统 ----

  addExp(amount, reason) {
    const pet = this.getPet();
    const oldStage = pet.stage;
    pet.exp += amount;
    if (pet.exp < 0) pet.exp = 0;

    // 检测升阶
    let newStage = oldStage;
    for (let i = this.STAGE_EXP_THRESHOLDS.length - 1; i >= 0; i--) {
      if (pet.exp >= this.STAGE_EXP_THRESHOLDS[i]) { newStage = i; break; }
    }

    if (newStage > oldStage) {
      // 破壳（0→1）时随机选择一个主题
      if (oldStage === 0 && newStage >= 1) {
        const allThemes = PetThemeRegistry.keys();
        // 50% 保持原主题, 50% 随机解锁新主题
        if (Math.random() < 0.5) {
          const newTheme = allThemes[Math.floor(Math.random() * allThemes.length)];
          if (!(pet.unlockedThemes || []).includes(newTheme)) {
            pet.unlockedThemes = pet.unlockedThemes || ['dragon'];
            pet.unlockedThemes.push(newTheme);
          }
          pet.theme = newTheme;
          const themeInfo = PetThemeRegistry.get(newTheme);
          setTimeout(() => this.speak(`🎲 孵化出了 ${themeInfo.emoji}${themeInfo.name}！`, 3000), 500);
        }
      }

      pet.stage = newStage;
      Store.save();
      this.render();
      // 升阶庆祝
      const msgs = this.MESSAGES.levelUp;
      const stageInfo = this.getStageInfo(newStage);
      const themeInfo = PetThemeRegistry.get(pet.theme || 'dragon');
      const name = (newStage === 0 ? '🥚 ' : '') + (stageInfo.name || '');
      const msg = msgs[Math.floor(Math.random() * msgs.length)];
      this.speak(msg + ' 现在是' + name + '阶段！', 3000);
      // 添加升阶闪光效果
      this._flashEffect();
      // 首次升级里程碑
      if (!pet.milestones.firstLevelUp) {
        pet.milestones.firstLevelUp = true;
        Store.save();
      }
      return { leveledUp: true, oldStage, newStage };
    }

    Store.save();
    this.render();
    return { leveledUp: false };
  },

  _flashEffect() {
    const container = document.getElementById('globalPetSprite');
    if (!container) return;
    container.style.transition = 'none';
    container.style.transform = 'scale(1.5)';
    container.style.filter = 'brightness(2) drop-shadow(0 0 12px rgba(102,126,234,0.8))';
    setTimeout(() => {
      container.style.transition = 'all 0.6s ease';
      container.style.transform = 'scale(1)';
      container.style.filter = 'brightness(1) drop-shadow(none)';
    }, 400);
    // 触发撒花
    this._confetti();
  },

  _confetti() {
    const colors = ['#667eea', '#48bb78', '#fc8181', '#f6ad55', '#9f7aea', '#ed64a6', '#f6e05e', '#63b3ed'];
    for (let i = 0; i < 20; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `position:fixed;width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 6}px;border-radius:50%;
        background:${colors[i % colors.length]};left:${20 + Math.random() * 60}vw;
        top:${10 + Math.random() * 30}vh;pointer-events:none;z-index:2147483647;
        animation:confettiFall ${0.6 + Math.random() * 0.8}s ease-out forwards;`;
      document.body.appendChild(dot);
      setTimeout(() => dot.remove(), 1500);
    }
  },

  // ---- 全局精灵气泡 ----

  speak(message, duration = 2500) {
    const bubble = document.getElementById('globalPetBubble');
    const text = document.getElementById('globalPetBubbleText');
    const pet = document.getElementById('globalPet');
    if (!bubble || !text || !pet) return;

    text.textContent = message;
    bubble.style.display = 'block';

    // 清除旧的位置 class
    bubble.className = 'global-pet-bubble';

    // 根据精灵所在位置智能调整气泡方向
    const rect = pet.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const bubbleW = Math.min(message.length * 15 + 40, 260);

    // 水平：靠左/右时让气泡不溢出屏幕
    if (cx < bubbleW / 2 + 10) {
      // 靠左边缘 → 气泡左对齐父容器左边缘
      bubble.style.left = '0';
      bubble.style.right = 'auto';
      bubble.style.transform = 'none';
    } else if (cx + bubbleW / 2 > vw - 10) {
      // 靠右边缘 → 气泡右对齐父容器右边缘
      bubble.style.left = 'auto';
      bubble.style.right = '0';
      bubble.style.transform = 'none';
    } else {
      bubble.style.left = '50%';
      bubble.style.right = 'auto';
      bubble.style.transform = 'translateX(-50%)';
    }

    // 垂直：用 top 负值确保气泡始终在精灵上方（不受精灵大小影响）
    // 默认：气泡在精灵上方 8px
    if (cy < 80) {
      // 顶部附近 → 气泡显示在下方
      bubble.style.top = 'calc(100% + 8px)';
      bubble.style.bottom = 'auto';
      bubble.classList.add('bubble-down');
    } else {
      bubble.style.top = '';
      bubble.style.bottom = '';
      bubble.style.top = '-54px';
      bubble.classList.remove('bubble-down');
    }

    clearTimeout(this._speakTimer);
    this._speakTimer = setTimeout(() => {
      bubble.style.display = 'none';
    }, duration);
  },

  /** 点击全局精灵触发 */
  _onGlobalPetClick() {
    const msgs = this.MESSAGES.greet;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.speak(msg, 2500);
    this._bounceOnce();
  },

  _bounceOnce() {
    const el = document.getElementById('globalPet');
    if (!el) return;
    el.style.transition = 'transform 0.15s ease';
    el.style.transform = 'scale(1.2)';
    setTimeout(() => { el.style.transform = 'scale(1)'; }, 200);
  },

  // ---- 交互事件 ----

  /** 打开页面时打招呼 */
  greet() {
    const msgs = this.MESSAGES.greet;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    setTimeout(() => this.speak(msg, 2500), 800);
  },

  /** 生成练习时打气 */
  onPracticeReady() {
    const msgs = this.MESSAGES.practiceReady;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.speak(msg, 2000);
  },

  /** 提交批改后 */
  onPracticeSubmitted(result) {
    const student = Store.getCurrentStudent();
    // 加基础 EXP
    this.addExp(10, 'practice');

    if (result.isPerfect) {
      // 全对奖励
      const msgs = this.MESSAGES.perfect;
      this.speak(msgs[Math.floor(Math.random() * msgs.length)], 2500);
      this.addExp(5, 'perfect');
      // 首次全对
      const pet = this.getPet();
      if (!pet.milestones.firstPerfect) {
        pet.milestones.firstPerfect = true;
        Store.save();
        setTimeout(() => this.speak('🎯 第一次全对！太棒了！', 3000), 1000);
      }
    } else if (result.slainErrors > 0) {
      // 消灭错词
      const msgs = this.MESSAGES.slainError;
      this.speak(msgs[Math.floor(Math.random() * msgs.length)], 2000);
      this.addExp(result.slainErrors * 5, 'slain_errors');
    } else {
      // 有错但没消灭
      const msgs = this.MESSAGES.wrong;
      this.speak(msgs[Math.floor(Math.random() * msgs.length)], 2000);
    }
  },

  // ============================================================
  //  进化之路页面
  // ============================================================

  /** 获取当前主题的阶段名称列表 */
  _getThemeStageNames(themeKey) {
    const map = {
      dragon:    ['🥚 沉睡', '🐣 破壳', '🐲 幼龙', '🐉 少年', '🐉 巨龙', '🌟 神龙'],
      firefox:   ['🥚 火蛋', '🐣 小狐', '🦊 幼狐', '🦊 少年', '🦊 三尾', '🌟 天狐'],
      icerabbit: ['🥚 冰蛋', '🐣 小兔', '🐰 幼兔', '🐰 灵兔', '🐰 月兔', '🌟 玉兔'],
    };
    return map[themeKey] || map.dragon;
  },

  /** 顶部：大精灵展示 */
  _renderShowcase() {
    const pet = this.getPet();
    const stage = pet.stage;
    const sprites = this._getSprites();
    const svg = sprites[Math.min(stage, sprites.length - 1)];
    const size = this.SHOWCASE_SIZES[stage] || 90;

    const showcase = document.getElementById('petShowcaseSprite');
    if (showcase) {
      const sized = svg
        .replace(/width="[^"]*"/, `width="${size}"`)
        .replace(/height="[^"]*"/, `height="${size}"`);
      showcase.innerHTML = sized;
      showcase.style.width = size + 'px';
      showcase.style.height = size + 'px';
    }

    const themeKey = this.getPet().theme || 'dragon';
    const names = this._getThemeStageNames(themeKey);
    const nameEl = document.getElementById('petShowcaseName');
    const descEl = document.getElementById('petShowcaseDesc');
    if (nameEl) nameEl.textContent = names[stage] || names[0];
    if (descEl) descEl.textContent = this.getStageInfo(stage).desc;

    const fillEl = document.getElementById('petShowcaseExpFill');
    const textEl = document.getElementById('petShowcaseExpText');
    if (fillEl) {
      const pct = this.getExpProgress();
      fillEl.style.width = pct + '%';
    }
    if (textEl) {
      const exp = this.getExp();
      const next = this.getNextStageExp();
      textEl.textContent = `${exp} / ${next} EXP（阶段 ${stage + 1}/6）`;
    }
  },

  /** 进化全览缩略条 — 6 阶段横向排列 */
  _renderEvolutionStrip() {
    const container = document.getElementById('petEvolutionStrip');
    if (!container) return;
    const pet = this.getPet();
    const stage = pet.stage;
    const sprites = this._getSprites();
    const names = this._getThemeStageNames(pet.theme || 'dragon');

    let html = '<div class="strip-inner">';
    for (let i = 0; i < 6; i++) {
      const svg = sprites[i] || sprites[0];
      const previewSize = 36 + i * 4;
      const sized = svg
        .replace(/width="[^"]*"/, `width="${previewSize}"`)
        .replace(/height="[^"]*"/, `height="${previewSize}"`);
      const cls = i < stage ? 'strip-done' : (i === stage ? 'strip-current' : 'strip-locked');
      html += `
        <div class="strip-node ${cls}" onclick="App.Pet.speak('${names[i]}：${this.getStageInfo(i).desc}', 2000)">
          <div class="strip-icon">${sized}</div>
          <div class="strip-label">${names[i]}</div>
          <div class="strip-exp">${i < 5 ? this.STAGE_EXP_THRESHOLDS[i + 1] + 'EXP' : 'MAX'}</div>
        </div>`;
      if (i < 5) html += '<div class="strip-connector"></div>';
    }
    html += '</div>';
    container.innerHTML = html;
  },

  /** 右侧：进化之路 — 展示全部 6 个阶段（预览真实大小） */
  _renderRoad() {
    const container = document.getElementById('petRoadList');
    if (!container) return;
    const pet = this.getPet();
    const currentStage = pet.stage;
    const sprites = this._getSprites();
    const themeKey = this.getPet().theme || 'dragon';
    const themeNames = {
      dragon:    ['🥚 沉睡', '🐣 破壳', '🐲 幼龙', '🐉 少年', '🐉 巨龙', '🌟 神龙'],
      firefox:   ['🥚 火蛋', '🐣 小狐', '🦊 幼狐', '🦊 少年', '🦊 三尾', '🌟 天狐'],
      icerabbit: ['🥚 冰蛋', '🐣 小兔', '🐰 幼兔', '🐰 灵兔', '🐰 月兔', '🌟 玉兔'],
    };
    const names = themeNames[themeKey] || themeNames.dragon;

    let html = '';
    this.STAGES.forEach((s, i) => {
      const unlocked = i <= currentStage;
      const isCurrent = i === currentStage;
      const svg = sprites[i] || sprites[0];
      const expNext = i < 5 ? this.STAGE_EXP_THRESHOLDS[i + 1] : 'MAX';
      // 各阶段在列表中统一显示为 32px 小图标
      const previewSize = 32;
      const sized = svg
        .replace(/width="[^"]*"/, `width="${previewSize}"`)
        .replace(/height="[^"]*"/, `height="${previewSize}"`);

      html += `
        <div class="pet-road-item${isCurrent ? ' current' : ''}${!unlocked ? ' locked' : ''}"
             onclick="App.Pet.speak('${s.desc}', 2000)">
          <div class="pet-road-icon" style="width:${previewSize + 8}px;height:${previewSize + 8}px;">${sized}</div>
          <div class="pet-road-info">
            <div class="pet-road-name">${names[i]}</div>
            <div class="pet-road-desc">${s.desc}</div>
            <div class="pet-road-exp">${i < 5 ? '累计 ' + expNext + ' EXP' : '已满级'}</div>
          </div>
          <div class="pet-road-status">${isCurrent ? '👈 当前' : (unlocked ? '✅' : '🔒')}</div>
        </div>`;
    });

    container.innerHTML = html;
  },

  /** 右侧：最近活动 — 里程碑事件 */
  _renderActivity() {
    const container = document.getElementById('petRecentActivity');
    if (!container) return;
    const student = Store.getCurrentStudent();
    const pet = this.getPet();

    const activities = [];

    // 收集里程碑事件
    if (pet.milestones.firstPerfect) {
      activities.push({ icon: '🎯', text: '首次全对', date: '里程碑' });
    }
    if (pet.milestones.firstLevelUp) {
      activities.push({ icon: '🌟', text: '第一次进化', date: '里程碑' });
    }

    // 从练习日志中提取最近事件
    const logs = student.practiceLog || [];
    const recentLogs = logs.slice(-5).reverse();
    const today = new Date().toISOString().slice(0, 10);

    recentLogs.forEach((log, idx) => {
      const total = (log.words || []).length;
      const wrongCount = log.words.filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
      const isToday = log.date === today;
      const label = isToday ? '今天' : log.date;
      if (wrongCount === 0) {
        activities.push({ icon: '🎉', text: `全对完成 ${total} 题`, date: label });
      } else {
        const correct = total - wrongCount;
        activities.push({ icon: '📝', text: `完成 ${total} 题，正确 ${correct} 题`, date: label });
      }
    });

    if (activities.length === 0) {
      container.innerHTML = `<p class="empty-msg">继续练习，解锁更多成就！</p>`;
      return;
    }

    container.innerHTML = activities.map(a => `
      <div class="pet-activity-item">
        <span class="pet-activity-icon">${a.icon}</span>
        <span class="pet-activity-text">${a.text}</span>
        <span class="pet-activity-date">${a.date}</span>
      </div>
    `).join('');
  },

  // ============================================================
  //  全局精灵漫游 — 根据阶段决定行为
  // ============================================================

  /** 全局精灵行为参数（按阶段） */
  ROAM: {
    0: { speed: 0,    wobble: 0,    interval: 0,   label: 'sleep',     desc: '安静地沉睡' },
    1: { speed: 0.2,  wobble: 0.5,  interval: 100, label: 'wobble',     desc: '原地微微晃动' },
    2: { speed: 0.4,  wobble: 0.2,  interval: 80,  label: 'local',      desc: '小范围活动' },
    3: { speed: 0.8,  wobble: 0.3,  interval: 60,  label: 'roam',       desc: '满屏活跃飞舞' },
    4: { speed: 1.1,  wobble: 0.2,  interval: 50,  label: 'sweep',      desc: '霸气巡游' },
    5: { speed: 0.9,  wobble: 0.4,  interval: 50,  label: 'glide',      desc: '飘逸翱翔' },
  },

  /** 使精灵可拖拽 */
  _makeDraggable() {
    const el = document.getElementById('globalPet');
    if (!el) return;

    let dragging = false;
    let startX, startY, origX, origY;

    const onStart = (e) => {
      const ce = e.touches ? e.touches[0] : e;
      dragging = true;
      startX = ce.clientX;
      startY = ce.clientY;
      // 解析当前 left/top
      origX = parseFloat(el.style.left) || 0;
      origY = parseFloat(el.style.top) || 0;
      // 停止漫游
      clearInterval(this._roamTimer);
      clearInterval(this._roamWobbleTimer);
      el.style.cursor = 'grabbing';
      el.style.transition = 'none';
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!dragging) return;
      const ce = e.touches ? e.touches[0] : e;
      const dx = ce.clientX - startX;
      const dy = ce.clientY - startY;
      el.style.left = (origX + dx) + 'px';
      el.style.top = (origY + dy) + 'px';
      e.preventDefault();
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.style.cursor = 'grab';
      // 恢复漫游（非沉睡阶段），从拖拽后的位置继续
      const pet = this.getPet();
      if (pet.stage > 0) {
        this._startGlobalRoam(true);
      }
    };

    el.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    el.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
    el.style.cursor = 'grab';
  },

  /** 启动全局漫游
   *  @param {boolean} keepPosition - true 表示保持当前位置不变（拖拽后使用）
   */
  _startGlobalRoam(keepPosition) {
    clearInterval(this._roamTimer);
    clearInterval(this._roamWobbleTimer);
    const pet = this.getPet();
    const stage = pet.stage;
    const cfg = this.ROAM[stage] || this.ROAM[0];

    const el = document.getElementById('globalPet');
    if (!el) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x, y, dx, dy;

    if (keepPosition) {
      // 从当前位置继续
      x = parseFloat(el.style.left) || 100;
      y = parseFloat(el.style.top) || 100;
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle) * cfg.speed;
      dy = Math.sin(angle) * cfg.speed;
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    } else if (stage === 0) {
      // 沉睡：找页面空白处静静待着
      const sz = this.SHOWCASE_SIZES[0] || 90;
      x = Math.max(20, vw * 0.65 - sz);
      y = Math.max(20, vh * 0.7 - sz);
      dx = 0; dy = 0;
      el.style.opacity = '0.6';
      el.style.transform = 'scale(0.85)';
    } else {
      // 非沉睡：随机位置（留足边距，不卡死角）
      const sz = this.SHOWCASE_SIZES[stage] || 90;
      x = 30 + Math.random() * (vw - sz - 60);
      y = 80 + Math.random() * (vh - sz - 100);
      const angle = Math.random() * Math.PI * 2;
      dx = Math.cos(angle) * cfg.speed;
      dy = Math.sin(angle) * cfg.speed;
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    }

    el.style.left = x + 'px';
    el.style.top = y + 'px';

    // 阶段 0：角落沉睡，不动
    if (stage === 0) return;

    // 阶段 1：原地微微晃动
    if (stage === 1) {
      let wobblePhase = 0;
      this._roamWobbleTimer = setInterval(() => {
        wobblePhase += 0.15;
        const ox = Math.sin(wobblePhase) * 3;
        const oy = Math.cos(wobblePhase * 0.7) * 2;
        el.style.left = (x + ox) + 'px';
        el.style.top = (y + oy) + 'px';
      }, cfg.interval);
      return;
    }

    // 阶段 2: 小范围活动（限定在一个区域）
    if (stage === 2) {
      const originX = x, originY = y;
      const radius = 60;
      let wx = 0, wy = 0;
      this._roamTimer = setInterval(() => {
        wx += dx; wy += dy;
        const dist = Math.sqrt(wx * wx + wy * wy);
        if (dist > radius) { wx *= 0.8; wy *= 0.8; dx = -dx * 0.5; dy = -dy * 0.5; }
        if (Math.random() < 0.03) { dx += (Math.random() - 0.5) * 0.3; dy += (Math.random() - 0.5) * 0.3; }
        el.style.left = (originX + wx) + 'px';
        el.style.top = (originY + wy) + 'px';
        const flip = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
        el.style.transform = flip;
      }, cfg.interval);
      return;
    }

    // 阶段 3-5: 自由漫游全屏
    this._roamTimer = setInterval(() => {
      const maxX = Math.max(100, window.innerWidth - 60);
      const maxY = Math.max(100, window.innerHeight - 80);

      x += dx; y += dy;

      // 边界反弹（带 margin）
      const margin = 10;
      if (x <= margin) { x = margin; dx = Math.abs(dx); }
      if (x >= maxX) { x = maxX; dx = -Math.abs(dx); }
      if (y <= margin + 60) { y = margin + 60; dy = Math.abs(dy); }
      if (y >= maxY) { y = maxY; dy = -Math.abs(dy); }

      // 随机方向变化
      if (Math.random() < 0.025) {
        const angle = (Math.random() - 0.5) * 1.2;
        const s = Math.sqrt(dx * dx + dy * dy);
        const ca = Math.cos(angle), sa = Math.sin(angle);
        dx = dx * ca - dy * sa;
        dy = dx * sa + dy * ca;
        // 保持速度
        const ns = Math.sqrt(dx * dx + dy * dy);
        if (ns > 0) { dx = (dx / ns) * cfg.speed; dy = (dy / ns) * cfg.speed; }
        else { dx = cfg.speed; dy = 0; }
      }

      // 阶段5：飘忽不定的优雅轨迹
      if (stage === 5) {
        dx += Math.sin(Date.now() * 0.001) * 0.03;
        dy += Math.cos(Date.now() * 0.0013) * 0.03;
        const s = Math.sqrt(dx * dx + dy * dy);
        if (s > 0) { dx = (dx / s) * cfg.speed; dy = (dy / s) * cfg.speed; }
      }

      el.style.left = x + 'px';
      el.style.top = y + 'px';

      // 朝向
      const flip = dx < 0 ? 'scaleX(-1)' : 'scaleX(1)';
      el.style.transform = flip;

    }, cfg.interval);
  },

  /** 渲染形象选择器 */
  _renderThemeSelect() {
    const container = document.getElementById('petThemeSelect');
    if (!container) return;
    const pet = this.getPet();
    const currentTheme = pet.theme || 'dragon';
    const unlocked = pet.unlockedThemes || ['dragon'];

    let html = '<div style="font-size:12px;color:#718096;margin-bottom:8px;">点击已解锁形象切换，点击🔒锁定形象预览：</div><div style="display:flex;gap:10px;flex-wrap:wrap;">';

    PetThemeRegistry.keys().forEach(key => {
      const info = PetThemeRegistry.get(key);
      const isUnlocked = unlocked.includes(key);
      const isCurrent = key === currentTheme;
      const gradient = `linear-gradient(135deg, ${info.colors[0]}, ${info.colors[1]})`;

      let clickHandler = '';
      if (isCurrent) clickHandler = '';
      else if (isUnlocked) clickHandler = `App.Pet._switchTheme('${key}')`;
      else clickHandler = `App.Pet._showPreview('${key}')`;

      html += `
        <div class="pet-theme-item${isCurrent ? ' active' : ''}${!isUnlocked ? ' locked' : ''}"
             style="background:${isCurrent ? gradient : '#f7fafc'};${!isUnlocked ? '' : ''}"
             onclick="${clickHandler}">
          <div class="pet-theme-preview">
            ${info.sprites ? `<img src="data:image/svg+xml,${encodeURIComponent(info.sprites[0])}" style="width:32px;height:32px;" alt="${info.name}">` : info.emoji}
          </div>
          <div class="pet-theme-meta">
            <div class="pet-theme-tname" style="color:${isCurrent ? '#fff' : '#4a5568'}">${info.emoji} ${info.name}</div>
            <div class="pet-theme-tdesc" style="color:${isCurrent ? 'rgba(255,255,255,0.7)' : '#a0aec0'}">${info.desc}</div>
          </div>
          <div class="pet-theme-badge-wrap">
            ${isCurrent ? '<span class="pet-theme-badge">✓</span>' : ''}
            ${!isUnlocked ? `<span class="pet-theme-cost">🔒 ${info.cost}</span>` : ''}
          </div>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  /** 弹出主题预览弹窗 */
  _showPreview(themeKey) {
    const info = PetThemeRegistry.get(themeKey);
    if (!info) return;
    const modal = document.getElementById('petPreviewModal');
    const title = document.getElementById('petPreviewTitle');
    const content = document.getElementById('petPreviewContent');
    const unlockBtn = document.getElementById('petPreviewUnlockBtn');
    if (!modal || !content) return;

    title.textContent = `${info.emoji} ${info.name} — ${info.desc}`;

    const names = this._getThemeStageNames(themeKey);
    let html = '';
    (info.sprites || []).forEach((svg, i) => {
      const previewSize = 44 + i * 4;
      const sized = svg
        .replace(/width="[^"]*"/, `width="${previewSize}"`)
        .replace(/height="[^"]*"/, `height="${previewSize}"`);
      html += `
        <div class="preview-stage">
          <div class="preview-sprite">${sized}</div>
          <div class="preview-name">${names[i] || '阶段' + (i + 1)}</div>
          <div class="preview-exp-need">${i < 5 ? this.STAGE_EXP_THRESHOLDS[i + 1] + ' EXP' : 'MAX'}</div>
        </div>`;
    });
    content.innerHTML = html;

    // 设置解锁按钮
    this._previewTargetKey = themeKey;
    const pet = this.getPet();
    const unlocked = pet.unlockedThemes || ['dragon'];
    if (unlocked.includes(themeKey)) {
      unlockBtn.textContent = `✅ 已解锁，点击使用`;
      unlockBtn.onclick = () => { this._switchTheme(themeKey); modal.classList.remove('show'); };
    } else if (pet.exp >= info.cost) {
      unlockBtn.textContent = `🔓 消耗 ${info.cost} EXP 解锁`;
      unlockBtn.onclick = () => { this._switchTheme(themeKey); modal.classList.remove('show'); };
      unlockBtn.disabled = false;
    } else {
      unlockBtn.textContent = `需要 ${info.cost} EXP（当前 ${pet.exp}）`;
      unlockBtn.disabled = true;
    }

    modal.classList.add('show');
  },

  /** 切换形象 */
  _switchTheme(themeKey) {
    const pet = this.getPet();
    const unlocked = pet.unlockedThemes || ['dragon'];
    if (!unlocked.includes(themeKey)) {
      const info = PetThemeRegistry.get(themeKey);
      // 尝试用 EXP 解锁
      if (pet.exp >= info.cost) {
        pet.exp -= info.cost;
        pet.unlockedThemes.push(themeKey);
      } else {
        this.speak(`需要 ${info.cost} EXP 才能解锁 ${info.emoji}${info.name}，继续加油！`, 2500);
        return;
      }
    }
    pet.theme = themeKey;
    Store.save();
    this.render();
    this.renderPage();
    const info = PetThemeRegistry.get(themeKey);
    this.speak(`已切换到 ${info.emoji}${info.name}！`, 2000);
  },

  /** 全局精灵悬停动画（阶段感知） */
  _setupHoverAnimation() {
    const el = document.getElementById('globalPet');
    if (!el) return;

    el.addEventListener('mouseenter', () => {
      const stage = this.getStage();
      const sprite = document.getElementById('globalPetSprite');
      if (!sprite) return;

      // 清除漫游动画对 transform 的干扰
      sprite.style.animation = 'none';
      sprite.style.transition = 'all 0.3s ease';

      if (stage === 0) {
        // 蛋：呼吸缩放
        sprite.style.transform = 'scale(1.08)';
        setTimeout(() => sprite.style.transform = 'scale(0.95)', 150);
        setTimeout(() => sprite.style.transform = 'scale(1.05)', 300);
        setTimeout(() => sprite.style.transform = 'scale(1)', 450);
      } else if (stage === 1) {
        // 破壳：好奇歪头
        sprite.style.transform = 'rotate(-8deg) scale(1.05)';
        setTimeout(() => sprite.style.transform = 'rotate(6deg) scale(1.05)', 200);
        setTimeout(() => sprite.style.transform = 'rotate(0deg) scale(1)', 400);
      } else if (stage === 2) {
        // 幼龙/幼狐/幼兔：快乐蹦跳
        sprite.style.transform = 'translateY(-8px) scale(1.06)';
        setTimeout(() => sprite.style.transform = 'translateY(0) scale(1)', 200);
        setTimeout(() => sprite.style.transform = 'translateY(-5px) scale(1.03)', 350);
        setTimeout(() => sprite.style.transform = 'translateY(0) scale(1)', 500);
      } else if (stage === 3) {
        // 少年：活力转圈
        sprite.style.transform = 'rotate(-5deg) translateY(-4px)';
        setTimeout(() => sprite.style.transform = 'rotate(5deg) translateY(-2px)', 120);
        setTimeout(() => sprite.style.transform = 'rotate(-3deg) translateY(0)', 240);
        setTimeout(() => sprite.style.transform = 'rotate(0deg) scale(1)', 360);
      } else if (stage === 4) {
        // 巨龙/霸主：威压展示
        sprite.style.transform = 'scale(1.12)';
        sprite.style.filter = 'brightness(1.2) drop-shadow(0 0 12px rgba(128,90,213,0.6))';
        setTimeout(() => { sprite.style.transform = 'scale(1)'; sprite.style.filter = ''; }, 500);
      } else {
        // 神级：神圣光辉
        sprite.style.transform = 'scale(1.08)';
        sprite.style.filter = 'brightness(1.3) drop-shadow(0 0 16px rgba(246,224,94,0.8))';
        setTimeout(() => sprite.style.transform = 'scale(0.96)', 200);
        setTimeout(() => { sprite.style.transform = 'scale(1)'; sprite.style.filter = ''; }, 600);
      }
    });
  },

  /** 精灵乐园 HTML 模板 — 静态页面结构 */
  PAGE_HTML: `
<div class="pet-page">
  <div class="pet-hero">
    <div class="pet-hero-bg">
      <div id="petShowcaseSprite" class="pet-hero-sprite"></div>
      <div id="petShowcaseBubble" class="pet-hero-bubble" style="display:none;">
        <span id="petShowcaseBubbleText"></span>
      </div>
    </div>
    <div class="pet-hero-info">
      <div class="pet-hero-name" id="petShowcaseName">&#x1F95A; 沉睡</div>
      <div class="pet-hero-desc" id="petShowcaseDesc">等待被唤醒...</div>
      <div class="pet-hero-exp-bar"><div class="pet-hero-exp-fill" id="petShowcaseExpFill"></div></div>
      <div class="pet-hero-exp-text" id="petShowcaseExpText">0 / 50 EXP</div>
    </div>
  </div>
  <div class="pet-evolution-strip" id="petEvolutionStrip"></div>
  <div class="pet-bottom">
    <div class="card" style="margin-bottom:0;">
      <div class="card-title" style="font-size:16px;">&#x1F31F; 进化之路</div>
      <div class="pet-road-list" id="petRoadList"></div>
    </div>
    <div class="pet-right-col">
      <div class="card">
        <div class="card-title" style="font-size:16px;">&#x1F3A8; 精灵形象</div>
        <div id="petThemeSelect" class="pet-theme-select"></div>
      </div>
      <div class="card" style="margin-bottom:0;">
        <div class="card-title" style="font-size:16px;">&#x1F4DC; 最近成就</div>
        <div id="petRecentActivity"><p class="empty-msg">继续练习，解锁更多成就！</p></div>
      </div>
    </div>
  </div>
</div>
  `,

  /** 渲染精灵乐园页面（HTML 结构 + 动态数据） */
  renderPage() {
    const container = document.getElementById('app-content-pet');
    if (!container) return;
    // 先写入静态结构，再填充动态数据
    container.innerHTML = this.PAGE_HTML;
    this._renderShowcase();
    this._renderEvolutionStrip();
    this._renderRoad();
    this._renderThemeSelect();
    this._renderActivity();
  },

  /** 在精灵页面显示气泡 */
  speakPage(message, duration = 2500) {
    const bubble = document.getElementById('petShowcaseBubble');
    const text = document.getElementById('petShowcaseBubbleText');
    if (!bubble || !text) return;

    text.textContent = message;
    bubble.style.display = 'block';

    clearTimeout(this._speakPageTimer);
    this._speakPageTimer = setTimeout(() => {
      bubble.style.display = 'none';
    }, duration);
  },
};

// 兼容 onclick
window.petSelectTheme = (theme) => { App.Pet._currentTheme = theme; App.Pet.render(); };
