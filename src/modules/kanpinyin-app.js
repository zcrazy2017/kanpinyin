// ============================================================
//  KanpinyinApp — 「看拼音写汉字」App
//  功能完整独立，包含出题/字库/历史/字典/统计五个子面板
// ============================================================
App.KanpinyinApp = {

  /** HTML 模板 — 整个看拼音写汉字应用的内容 */
  HTML: `
<!-- ==================== Header ==================== -->
<header class="header">
  <h1><span>📖</span> 看拼音写词语 · 智能练习系统</h1>
  <div class="header-controls">
    <span style="display:inline-flex;align-items:center;gap:8px;color:#fff;font-size:14px;">
      👤 <span id="studentNameDisplay" style="font-weight:600;">同学</span>
      <span onclick="renameStudent()" style="cursor:pointer;font-size:12px;opacity:0.7;border-bottom:1px dashed rgba(255,255,255,0.4);">✎ 改名</span>
    </span>
    <span id="streakDisplay" style="display:none;font-size:13px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,0.15);">🔥 <span id="streakCount">0</span> 天</span>
    <span id="backendStatus" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:4px 10px;border-radius:12px;background:rgba(255,255,255,0.15);">
      <span class="status-dot" style="width:8px;height:8px;border-radius:50%;background:#aaa;display:inline-block;"></span>
      <span class="status-text">后端...</span>
    </span>
  </div>
</header>

<!-- ==================== Tab Navigation ==================== -->
<nav class="tab-nav">
  <button class="tab-btn active" data-tab="practice" onclick="switchTab('practice')">📝 出题</button>
  <button class="tab-btn" data-tab="library" onclick="switchTab('library')">📚 字库管理</button>
  <button class="tab-btn" data-tab="history" onclick="switchTab('history')">📊 历史记录</button>
  <button class="tab-btn" data-tab="dict" onclick="switchTab('dict')">📖 字典</button>
  <button class="tab-btn" data-tab="stats" onclick="switchTab('stats')">📈 统计</button>
</nav>

<!-- ==================== Main Content ==================== -->
<div class="main">

  <!-- ===== Practice Panel ===== -->
  <div class="panel active" id="panel-practice">
    <div class="card">
      <div class="card-title">📝 今日练习</div>
      <div class="form-row" style="margin-bottom:8px; gap:8px;">
        <label for="wordCountInput" style="font-size:13px;">📊 题目数量</label>
        <input type="number" id="wordCountInput" class="count-input" value="50" min="1" max="200" style="width:70px;">
        <span style="font-size:12px; color:#a0aec0;">（最多不超过词库总数）</span>
      </div>
      <div style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
          <span style="font-size:13px;font-weight:500;color:#4a5568;">📂 按分类筛选</span>
          <span style="font-size:12px;color:#a0aec0;">（不选则全部出题）</span>
          <button class="btn btn-ghost btn-sm" onclick="clearCategoryFilter()" style="font-size:11px;">清除筛选</button>
        </div>
        <div id="categoryFilterList" style="display:flex;flex-wrap:wrap;gap:6px;min-height:26px;">
          <span style="font-size:13px;color:#a0aec0;">暂无分类</span>
        </div>
      </div>
      <div id="dailyChallenge" style="display:none;margin-bottom:12px;padding:10px 14px;background:linear-gradient(135deg,#fff5f5,#fffaf0);border-radius:12px;border:1px solid #fed7d7;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <span style="font-size:18px;">🎯</span>
          <span style="font-size:14px;font-weight:600;color:#c53030;">今日挑战</span>
          <span id="challengeText" style="font-size:13px;color:#4a5568;"></span>
          <span id="challengeProgress" style="font-size:12px;color:#718096;"></span>
          <div id="challengeBar" style="flex:1;min-width:80px;height:8px;background:#e2e8f0;border-radius:4px;overflow:hidden;">
            <div id="challengeBarFill" style="height:100%;width:0%;background:linear-gradient(90deg,#48bb78,#38a169);border-radius:4px;transition:width 0.5s;"></div>
          </div>
        </div>
      </div>
      <div id="practiceStatus">
        <p class="empty-msg">暂无练习数据。请先在「字库管理」中添加字和词语。</p>
      </div>
      <div id="practiceContent" style="display:none;">
        <div class="practice-summary" id="practiceSummary"></div>
        <div class="practice-actions" id="practiceActions"></div>
        <div id="practicePreview"></div>
        <div id="correctionSection" style="display:none;">
          <hr style="border: none; border-top: 2px dashed #e2e8f0; margin: 20px 0;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
            <span style="font-size:18px; font-weight:600;">✏️ 批改</span>
            <span style="font-size:13px; color:#718096;">田字格中显示正确答案，点击字选择错误类型（红色=错别字，橙色=留空字）</span>
          </div>
          <div style="margin-top:16px;">
            <button class="btn btn-success" onclick="submitCorrection()">📊 提交批改结果</button>
            <button class="btn btn-ghost" onclick="cancelCorrection()" style="margin-left:8px;">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;">
        <span>📦 已保存的练习</span>
        <span style="font-size:12px;color:#a0aec0;font-weight:400;">保存后可随时加载，不受刷新影响</span>
      </div>
      <div id="savedPracticesList">
        <p class="empty-msg">暂无保存的练习。</p>
      </div>
    </div>
  </div>

  <!-- ===== Library Panel ===== -->
  <div class="panel" id="panel-library">
    <div style="display:flex;gap:0;margin-bottom:16px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
      <button class="lib-tab-btn active" data-libtab="cat" onclick="switchLibTab('cat')" style="flex:1;padding:10px;border:none;background:transparent;cursor:pointer;font-size:14px;font-weight:600;transition:all 0.2s;color:#667eea;border-bottom:3px solid #667eea;">📂 分类管理</button>
      <button class="lib-tab-btn" data-libtab="chars" onclick="switchLibTab('chars')" style="flex:1;padding:10px;border:none;background:transparent;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.2s;color:#718096;border-bottom:3px solid transparent;">🔤 字词管理</button>
    </div>

    <div class="lib-panel active" id="libpanel-cat">
      <div class="card">
        <div class="card-title">📂 创建分类</div>
        <div style="font-size:13px; color:#718096; margin-bottom:10px;">创建层级分类，如：年级 → 学期 → 单元 → 课</div>
        <div class="form-row" style="margin-bottom:10px;">
          <label>上级分类</label>
          <select id="categoryParentSelect" style="padding:8px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;">
            <option value="">— 根目录 —</option>
          </select>
          <label>分类名称</label>
          <input type="text" id="categoryNameInput" placeholder="如: 一年级" style="width:100px;font-size:14px;" autocomplete="off">
          <button class="btn btn-success btn-sm" onclick="addCategory()">➕ 添加</button>
        </div>
        <div id="categoryTree" style="font-size:14px; min-height:20px;"><p class="empty-msg">暂无分类</p></div>
        <div id="categoryAddCharsArea" style="display:none;margin-top:12px;padding:12px;background:#f0f5ff;border-radius:10px;border:2px solid #667eea;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <span id="addCharsCatLabel" style="font-weight:600;font-size:14px;color:#667eea;">📁 分类名</span>
            <span style="font-size:12px;color:#a0aec0;">— 将以下字加入此分类</span>
            <button class="btn btn-ghost btn-sm" onclick="toggleAllAddChars()" style="font-size:12px;">☑ 全选</button>
            <button class="btn btn-primary btn-sm" onclick="confirmAddCharsToCategory()">✅ 加入分类</button>
            <button class="btn btn-ghost btn-sm" onclick="closeAddCharsPanel()">✕ 关闭</button>
          </div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="font-size:13px;font-weight:500;color:#667eea;">🔍</span>
            <input type="text" id="catSearchInput" placeholder="输入汉字筛选，如：春天" style="flex:1;padding:5px 10px;border:2px solid #d6e4ff;border-radius:8px;font-size:13px;background:#fff;" autocomplete="off" oninput="onCatSearchInput()">
            <span id="catSearchCount" style="font-size:12px;color:#667eea;"></span>
          </div>
          <div id="categoryAddCharList" style="display:flex;flex-wrap:wrap;gap:6px;min-height:30px;padding:8px;background:#fff;border-radius:8px;border:1px solid #d6e4ff;"><p class="empty-msg" style="padding:0;font-size:13px;">暂无未分类的字</p></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title"><span>📂 分类浏览</span><span style="font-size:12px;color:#a0aec0;font-weight:400;">点击分类树中的分类，查看/管理其中的字</span></div>
        <div id="catBrowseArea"><div id="catBrowseContent" style="padding:10px;background:#f7fafc;border-radius:10px;border:1px solid #e2e8f0;min-height:40px;"><p class="empty-msg" style="padding:4px 0;font-size:13px;">点击左侧分类查看其中的字</p></div></div>
      </div>
    </div>

    <div class="lib-panel" id="libpanel-chars">
      <div class="card">
        <div class="card-title">🔤 添加单字</div>
        <div class="form-row">
          <label>字</label>
          <input type="text" class="char-input" id="charInput" maxlength="2" placeholder="如: 春" autocomplete="off">
          <label>拼音</label>
          <input type="text" class="pinyin-input" id="pinyinInput" placeholder="自动识别或手动输入" autocomplete="off">
          <label>分类</label>
          <select id="charCategorySelect" style="padding:8px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;"><option value="">— 无分类 —</option></select>
          <button class="btn btn-primary" onclick="addChar()">➕ 添加</button>
        </div>
        <div class="pinyin-detect-status" id="pinyinDetectStatus"></div>
        <div style="font-size:13px; color:#718096;">💡 输入汉字后自动识别拼音，多音字可点选；也支持手动输入。分类可选。</div>
      </div>
      <div class="card">
        <div class="card-title">🔗 组词</div>
        <div style="margin-bottom:16px;">
          <h4 style="font-size:14px; color:#4a5568; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#667eea; color:#fff; font-size:12px; font-weight:700;">A</span>选字自动组合</h4>
          <p style="font-size:14px; color:#718096; margin-bottom:10px;">选择一个字，自动列出正确的两字词语。已存在的词不显示。</p>
          <div class="form-row"><label>选字</label>
            <div class="compose-search-wrap">
              <span class="search-icon">🔍</span>
              <input type="text" id="composeSearchInput" placeholder="搜索字..." autocomplete="off" oninput="onComposeSearchInput()">
            </div>
          </div>
          <div id="composeCharList" class="compose-char-list"><p class="empty-msg">— 请先添加字 —</p></div>
          <div id="composeResults"><p class="empty-msg">选择一个字后显示可组成的词语。</p></div>
        </div>
        <div>
          <h4 style="font-size:14px; color:#4a5568; margin-bottom:10px; display:flex; align-items:center; gap:6px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:#48bb78; color:#fff; font-size:12px; font-weight:700;">B</span>手动输入词语</h4>
          <div class="form-row">
            <label>词语</label>
            <input type="text" id="manualWordInput" placeholder="如: 好天" style="width:120px;font-size:18px;text-align:center;" autocomplete="off">
            <button class="btn btn-success btn-sm" onclick="addManualWord()">➕ 添加</button>
          </div>
          <div id="manualWordStatus" style="font-size:13px;min-height:22px;"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">📦 批量导入</div>
        <div style="font-size:13px;color:#718096;margin-bottom:10px;">批量添加字或词语，用逗号、空格或换行分隔。缺字自动补全。</div>
        <div class="form-row" style="gap:8px;margin-bottom:10px;">
          <label style="font-size:13px;font-weight:400;"><input type="radio" name="batchMode" value="chars" checked onchange="toggleBatchMode()">批量添加字</label>
          <label style="font-size:13px;font-weight:400;"><input type="radio" name="batchMode" value="words" onchange="toggleBatchMode()">批量添加词语</label>
          <label style="font-size:13px;font-weight:400;"><input type="radio" name="batchMode" value="mixed" onchange="toggleBatchMode()">智能识别</label>
          <span style="font-size:12px;color:#a0aec0;">（2字及以上视为词）</span>
        </div>
        <textarea id="batchInput" placeholder="例如：春天, 花开, 大山" style="width:100%;min-height:70px;padding:10px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:15px;font-family:inherit;resize:vertical;outline:none;" onfocus="this.style.borderColor='#667eea'" onblur="this.style.borderColor='#e2e8f0'"></textarea>
        <div class="form-row" style="gap:8px;margin-top:8px;">
          <label style="font-size:13px;">分类</label>
          <select id="batchCategorySelect" style="padding:6px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:13px;"><option value="">— 无分类 —</option></select>
          <span style="font-size:12px;color:#a0aec0;">导入的新字将自动归入此分类</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:8px;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="batchImport()">🚀 批量导入</button>
          <span id="batchImportStatus" style="font-size:13px;color:#a0aec0;"></span>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== History Panel ===== -->
  <div class="panel" id="panel-history">
    <div class="card">
      <div class="card-title">📊 历史记录</div>
      <div id="historySummary" style="font-size:14px;color:#718096;margin-bottom:12px;">查看历史练习统计。</div>
      <div id="historyStats" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;"></div>
    </div>
    <div class="card">
      <div class="card-title">📋 历史练习</div>
      <div id="historyList"><p class="empty-msg">暂无历史记录</p></div>
    </div>
    <div class="card">
      <div class="card-title">🔴 常错字排行</div>
      <div id="errorCharRanking"><p class="empty-msg">暂无错字记录</p></div>
    </div>
    <div class="card" id="reviewUrgencyCard" style="display:none;">
      <div class="card-title">🔄 待复习字</div>
      <div style="font-size:13px;color:#718096;margin-bottom:10px;">基于遗忘曲线，以下字需要优先复习</div>
      <div id="reviewUrgencyList"><p class="empty-msg">暂无需要复习的字</p></div>
    </div>
  </div>

  <!-- ===== Dict Panel ===== -->
  <div class="panel" id="panel-dict">
    <div class="card">
      <div class="card-title">📖 字典</div>
      <div style="margin-bottom:12px;font-size:13px;color:#718096;">按拼音首字母浏览汉字，点击字母查看对应汉字及包含该字的词语</div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:500;color:#4a5568;">📂 分类过滤</span>
        <div id="dictCategoryFilter" style="display:flex;flex-wrap:wrap;gap:6px;">
          <span onclick="setDictCategoryFilter('')" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:12px;transition:all 0.15s;user-select:none;border:2px solid #667eea;background:#ebf4ff;color:#667eea;font-weight:600;">全部</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <span style="font-size:13px;font-weight:500;color:#4a5568;">🔧 矫正拼音</span>
        <button class="btn btn-warning btn-sm" onclick="refreshAllPinyin()">🔄 一键矫正所有拼音音调</button>
        <span style="font-size:12px;color:#a0aec0;">通过后端API自动修正所有字的拼音音调标注</span>
      </div>
      <div id="dictLetterBar" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px;padding:8px 0;border-bottom:2px solid #e2e8f0;"></div>
      <div id="dictCharList"><p class="empty-msg">暂无字库，请先在字词管理中导入汉字</p></div>
    </div>
  </div>

  <!-- ===== Stats Panel ===== -->
  <div class="panel" id="panel-stats">
    <div class="stats-dashboard" id="statsDashboard" style="display:none;">
      <div class="stats-dash-item" id="dashDays"><div class="dash-icon">📅</div><div class="dash-value" id="dashDaysValue">0</div><div class="dash-label">练习天数</div></div>
      <div class="stats-dash-item" id="dashWords"><div class="dash-icon">📝</div><div class="dash-value" id="dashWordsValue">0</div><div class="dash-label">总词数</div></div>
      <div class="stats-dash-item" id="dashRate"><div class="dash-icon">📈</div><div class="dash-value" id="dashRateValue">0%</div><div class="dash-label">平均正确率</div></div>
      <div class="stats-dash-item" id="dashStreak"><div class="dash-icon">🔥</div><div class="dash-value" id="dashStreakValue">0</div><div class="dash-label">连续天数</div></div>
      <div class="stats-dash-item" id="dashMastered"><div class="dash-icon">⭐</div><div class="dash-value" id="dashMasteredValue">0</div><div class="dash-label">掌握的字</div></div>
    </div>
    <div class="card">
      <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:20px;">📈</span> 成绩趋势</span>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="App.Stats.setLastWeek()" style="font-size:11px;padding:4px 10px;">近一周</button>
          <button class="btn btn-ghost btn-sm" onclick="App.Stats.setLastMonth()" style="font-size:11px;padding:4px 10px;">近一月</button>
          <button class="btn btn-ghost btn-sm" onclick="App.Stats.setAll()" style="font-size:11px;padding:4px 10px;">全部</button>
        </div>
      </div>
      <div id="statsSummary" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;"></div>
      <div class="form-row" style="margin-bottom:10px;gap:6px;">
        <label for="statsStartDate" style="font-size:12px;">从</label>
        <input type="date" id="statsStartDate" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;width:110px;">
        <label for="statsEndDate" style="font-size:12px;">至</label>
        <input type="date" id="statsEndDate" style="padding:4px 8px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:12px;font-family:inherit;width:110px;">
        <button class="btn btn-primary btn-sm" onclick="App.Stats.renderChart()" style="font-size:11px;padding:4px 10px;">🔄 更新</button>
      </div>
      <div id="statsChart" style="width:100%;height:320px;background:#fafbfc;border-radius:12px;border:1px solid #e2e8f0;"><p class="empty-msg">暂无练习数据</p></div>
    </div>
    <div class="stats-grid-2col">
      <div class="card stats-card-compact" id="errorTypeCard" style="display:none;">
        <div class="card-title" style="font-size:15px;margin-bottom:10px;"><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:18px;">🧩</span> 错误类型</span></div>
        <div id="errorTypeContent" style="min-height:30px;"></div>
      </div>
      <div class="card stats-card-compact" id="weeklyReportCard" style="display:none;">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between;font-size:15px;margin-bottom:10px;">
          <span style="display:flex;align-items:center;gap:6px;"><span style="font-size:18px;">📋</span> 进步周报</span>
          <span style="font-size:11px;font-weight:400;color:#a0aec0;" id="weeklyReportDate"></span>
        </div>
        <div id="weeklyReportContent" style="min-height:30px;"></div>
      </div>
    </div>
    <div class="card" id="achievementsCard" style="display:none;">
      <div class="card-title" style="font-size:15px;margin-bottom:10px;"><span style="display:flex;align-items:center;gap:6px;"><span style="font-size:18px;">🏅</span> 成就墙</span></div>
      <div id="achievementsProgress" style="margin-bottom:14px;"></div>
      <div id="achievementsList" style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;"><p class="empty-msg">暂无数据</p></div>
    </div>
  </div>

</div>

<!-- ===== Kanpinyin-specific Modals ===== -->
<div class="modal-overlay" id="editCharCatModal">
  <div class="modal">
    <h3 id="editCharCatLabel">📂 修改字分类</h3>
    <input type="hidden" id="editCharCatChar">
    <div class="form-row">
      <label>新分类</label>
      <select id="editCharCatSelect" style="flex:1;padding:8px 14px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;"></select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="document.getElementById('editCharCatModal').classList.remove('show')">取消</button>
      <button class="btn btn-primary" onclick="confirmEditCharCategory()">确定</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="renameStudentModal">
  <div class="modal">
    <h3>✎ 修改姓名</h3>
    <div class="form-row">
      <label>姓名</label>
      <input type="text" id="renameStudentInput" placeholder="输入学生姓名" style="flex:1;">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="document.getElementById('renameStudentModal').classList.remove('show')">取消</button>
      <button class="btn btn-primary" onclick="confirmRenameStudent()">确定</button>
    </div>
  </div>
</div>

<div class="modal-overlay" id="savePracticeModal">
  <div class="modal">
    <h3>💾 保存练习</h3>
    <div style="font-size:13px;color:#718096;margin-bottom:12px;">为当前练习命名，保存后可随时加载使用。</div>
    <div class="form-row">
      <label>名称</label>
      <input type="text" id="savePracticeNameInput" placeholder="如：一年级上册复习" style="flex:1;" autocomplete="off">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="document.getElementById('savePracticeModal').classList.remove('show')">取消</button>
      <button class="btn btn-primary" onclick="confirmSavePractice()">💾 保存</button>
    </div>
  </div>
</div>
  `,

  /** 是否已渲染 */
  _rendered: false,

  /** 将看拼音写汉字 App 的 HTML 渲染到容器中 */
  render() {
    const container = document.getElementById('app-content-kanpinyin');
    if (!container) return;
    container.innerHTML = this.HTML;
    this._rendered = true;
  },
};
