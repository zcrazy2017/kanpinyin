// ============================================================
//  Stats Module — 成绩统计 ECharts 折线图
// ============================================================
App.Stats = {
  /** 渲染统计页面 */
  renderPage() {
    if (typeof echarts === 'undefined') {
      const el = document.getElementById('statsChart');
      if (el) el.innerHTML = '<p class="empty-msg">⏳ 正在加载图表库...</p>';
      return;
    }
    this.renderDashboard();
    this.setLastMonth();
    this.renderAchievements();
    this.renderErrorTypeAnalysis();
    this.renderWeeklyReport();
  },

  /** 渲染顶部概览仪表盘 */
  renderDashboard() {
    const student = Store.getCurrentStudent();
    const logs = student.practiceLog || [];
    const totalDays = logs.length;
    const totalWords = logs.reduce((s, l) => s + (l.words || []).length, 0);
    let totalWrong = 0;
    logs.forEach(l => (l.words || []).forEach(w => {
      if (w.wrongIndices && w.wrongIndices.length > 0) totalWrong++;
    }));
    const avgRate = totalWords > 0 ? Math.round((totalWords - totalWrong) / totalWords * 100) : 0;
    const streak = Store.computeStreak();
    const masteredCount = Object.keys(Store.data.dict).filter(ch => Store.getCharMasteryLevel(ch).level >= 3).length;

    const el = document.getElementById('statsDashboard');
    if (!el) return;

    if (totalDays === 0) { el.style.display = 'none'; return; }
    el.style.display = 'grid';

    document.getElementById('dashDaysValue').textContent = totalDays;
    document.getElementById('dashWordsValue').textContent = totalWords;
    document.getElementById('dashRateValue').textContent = avgRate + '%';
    document.getElementById('dashRateValue').style.color = avgRate >= 90 ? '#38a169' : avgRate >= 70 ? '#ed8936' : '#e53e3e';
    document.getElementById('dashStreakValue').textContent = streak;
    document.getElementById('dashStreakValue').style.color = streak >= 30 ? '#dd6b20' : streak >= 7 ? '#38a169' : '#667eea';
    document.getElementById('dashMasteredValue').textContent = masteredCount;
  },

  /** 设置日期范围：近一月 */
  setLastMonth() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    document.getElementById('statsStartDate').value = start.toISOString().slice(0, 10);
    document.getElementById('statsEndDate').value = end.toISOString().slice(0, 10);
    this.renderChart();
  },

  /** 设置日期范围：近一周 */
  setLastWeek() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    document.getElementById('statsStartDate').value = start.toISOString().slice(0, 10);
    document.getElementById('statsEndDate').value = end.toISOString().slice(0, 10);
    this.renderChart();
  },

  /** 设置日期范围：全部 */
  setAll() {
    const student = Store.getCurrentStudent();
    const logs = student.practiceLog || [];
    if (logs.length === 0) { this.renderChart(); return; }
    const dates = logs.map(l => l.date).sort();
    document.getElementById('statsStartDate').value = dates[0];
    document.getElementById('statsEndDate').value = dates[dates.length - 1];
    this.renderChart();
  },

  /** 渲染图表 */
  renderChart() {
    const student = Store.getCurrentStudent();
    const logs = (student.practiceLog || []).sort((a, b) => a.date.localeCompare(b.date));
    const startDate = document.getElementById('statsStartDate').value;
    const endDate = document.getElementById('statsEndDate').value;
    const filtered = logs.filter(l => (!startDate || l.date >= startDate) && (!endDate || l.date <= endDate));

    const container = document.getElementById('statsChart');
    const summaryEl = document.getElementById('statsSummary');

    if (filtered.length === 0) {
      container.innerHTML = '<p class="empty-msg">所选时间段内暂无练习数据</p>';
      summaryEl.innerHTML = '';
      return;
    }

    const dates = filtered.map(l => l.date);
    const rates = filtered.map(l => {
      const words = l.words || [];
      const total = words.length;
      const wrong = words.filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
      return total > 0 ? Math.round((total - wrong) / total * 100) : 100;
    });

    const avgRate = Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
    const maxRate = Math.max(...rates);
    const minRate = Math.min(...rates);
    const totalWords = filtered.reduce((s, l) => s + (l.words || []).length, 0);
    summaryEl.innerHTML = `
      <span class="stat-badge">📅 共 <strong>${filtered.length}</strong> 天</span>
      <span class="stat-badge">📝 共 <strong>${totalWords}</strong> 词</span>
      <span class="stat-badge">📈 平均 <strong>${avgRate}%</strong></span>
      <span class="stat-badge">🏆 最高 <strong>${maxRate}%</strong></span>
      <span class="stat-badge" style="${minRate < 80 ? 'background:#fed7d7;color:#9b2c2c;' : ''}">⬇ 最低 <strong>${minRate}%</strong></span>`;

    const chartDom = document.createElement('div');
    chartDom.style.cssText = 'width:100%;height:320px;';
    container.innerHTML = '';
    container.appendChild(chartDom);

    const myChart = echarts.init(chartDom);
    const option = {
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderColor: '#667eea',
        borderWidth: 2,
        borderRadius: 10,
        padding: [10, 14],
        formatter: function(params) {
          const p = params[0];
          const day = filtered[p.dataIndex];
          const words = day.words || [];
          const total = words.length;
          const wrong = words.filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
          return `<div style="font-weight:700;color:#2d3748;margin-bottom:4px;">${p.axisValue}</div>
            <div>✅ 正确 <strong style="color:#38a169;">${total - wrong}</strong> / ${total} 词</div>
            <div>📊 正确率 <strong style="color:${p.value >= 90 ? '#38a169' : p.value >= 70 ? '#ed8936' : '#e53e3e'};">${p.value}%</strong></div>`;
        }
      },
      grid: { left: '45', right: '20', top: '30', bottom: '45' },
      xAxis: {
        type: 'category', data: dates,
        axisLabel: { rotate: 40, fontSize: 10, color: '#718096' },
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        axisLabel: { formatter: '{value}%', fontSize: 10, color: '#718096' },
        splitLine: { lineStyle: { color: '#f0f4f8', type: 'dashed' } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        data: rates.map((v, i) => ({
          value: v,
          itemStyle: {
            color: v >= 90 ? '#48bb78' : v >= 70 ? '#ed8936' : '#fc8181',
            borderColor: '#fff',
            borderWidth: 2
          }
        })),
        type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 10,
        lineStyle: { width: 3, color: '#667eea' },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102,126,234,0.35)' },
              { offset: 1, color: 'rgba(102,126,234,0.02)' }
            ] }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          label: { fontSize: 10 },
          data: [
            { yAxis: 90, label: { formatter: '优秀 90%', color: '#48bb78' }, lineStyle: { color: '#48bb78', type: 'dashed', opacity: 0.5 } },
            { yAxis: 60, label: { formatter: '及格 60%', color: '#ed8936' }, lineStyle: { color: '#ed8936', type: 'dashed', opacity: 0.5 } }
          ]
        }
      }]
    };
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
  },

  /** 渲染成就墙 — 卡通风格 */
  renderAchievements() {
    const card = document.getElementById('achievementsCard');
    const list = document.getElementById('achievementsList');
    const progEl = document.getElementById('achievementsProgress');
    if (!card || !list) return;

    const achievements = Store.checkAchievements();
    const unlocked = achievements.filter(a => a.unlocked).length;
    const total = achievements.length;

    if (total === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    // 进度条
    const pct = Math.round(unlocked / total * 100);
    if (progEl) {
      const milestoneMsg = unlocked === total ? '🎉 全部解锁！太棒了！' :
        unlocked >= Math.ceil(total * 0.75) ? '🌟 接近全收集，继续加油！' :
        unlocked >= Math.ceil(total * 0.5) ? '💪 已经过半了！' :
        unlocked >= Math.ceil(total * 0.25) ? '👍 不错的开始！' :
        '🚀 向着第一个成就出发！';
      progEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
          <span style="font-size:14px;font-weight:600;color:#2d3748;">
            🏅 已解锁 <span style="color:#667eea;">${unlocked}</span> / ${total}
          </span>
          <span style="font-size:12px;color:#a0aec0;">${pct}%</span>
        </div>
        <div style="width:100%;height:12px;background:#edf2f7;border-radius:6px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(0,0,0,0.1);">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#667eea,#764ba2,#9f7aea);border-radius:6px;transition:width 0.8s cubic-bezier(0.4,0,0.2,1);position:relative;overflow:hidden;">
            <div style="position:absolute;top:0;left:-20%;width:40%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.3),rgba(255,255,255,0));animation:shimmer 2s infinite;"></div>
          </div>
        </div>
        <div style="text-align:center;margin-top:6px;font-size:12px;color:#718096;">${milestoneMsg}</div>`;
    }

    // 成就卡片多彩颜色映射
    const colorSchemes = [
      { bg: 'linear-gradient(135deg,#fff0f0,#ffe0e0)', border: '#fc8181', text: '#c53030', glow: '0 3px 12px rgba(252,129,129,0.25)' },
      { bg: 'linear-gradient(135deg,#fffaf0,#ffe8cc)', border: '#ed8936', text: '#9b2c2c', glow: '0 3px 12px rgba(237,137,54,0.25)' },
      { bg: 'linear-gradient(135deg,#f0fff4,#c6f6d5)', border: '#48bb78', text: '#22543d', glow: '0 3px 12px rgba(72,187,120,0.25)' },
      { bg: 'linear-gradient(135deg,#ebf8ff,#bee3f8)', border: '#4299e1', text: '#2a4365', glow: '0 3px 12px rgba(66,153,225,0.25)' },
      { bg: 'linear-gradient(135deg,#faf5ff,#e9d8fd)', border: '#9f7aea', text: '#44337a', glow: '0 3px 12px rgba(159,122,234,0.25)' },
      { bg: 'linear-gradient(135deg,#fff5f7,#fed7e2)', border: '#ed64a6', text: '#702459', glow: '0 3px 12px rgba(237,100,166,0.25)' },
    ];

    let html = '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">';
    achievements.forEach((a, idx) => {
      const c = colorSchemes[idx % colorSchemes.length];
      if (a.unlocked) {
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:16px 18px 12px;background:${c.bg};border:2.5px solid ${c.border};border-radius:18px;font-size:12px;min-width:115px;box-shadow:${c.glow},0 1px 3px rgba(0,0,0,0.06);cursor:default;"
          onmouseover="this.style.transform='scale(1.1)translateY(-3px)';this.style.boxShadow='${c.glow},0 6px 20px rgba(0,0,0,0.12)'"
          onmouseout="this.style.transform='scale(1)translateY(0)';this.style.boxShadow='${c.glow},0 1px 3px rgba(0,0,0,0.06)'">
          <span style="font-size:34px;display:block;animation:achBounce 2s infinite;line-height:1;">${a.icon}</span>
          <div style="font-weight:700;color:${c.text};font-size:13px;text-align:center;line-height:1.3;">${a.label}</div>
          <div style="font-size:10px;color:${c.text};opacity:0.65;text-align:center;line-height:1.3;">${a.desc}</div>
          <div style="font-size:9px;color:#48bb78;font-weight:600;margin-top:2px;">✅ 已解锁</div>
        </div>`;
      } else {
        html += `<div style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:16px 18px 12px;background:#f7fafc;border:2.5px dashed #e2e8f0;border-radius:18px;font-size:12px;min-width:115px;opacity:0.7;filter:grayscale(0.5);">
          <span style="font-size:28px;display:block;line-height:1;filter:grayscale(1);">${a.icon}</span>
          <div style="font-weight:600;color:#a0aec0;font-size:13px;text-align:center;line-height:1.3;">${a.label}</div>
          <div style="font-size:10px;color:#cbd5e0;text-align:center;line-height:1.3;">${a.desc}</div>
          <div style="font-size:9px;color:#cbd5e0;margin-top:2px;">🔒 未解锁</div>
        </div>`;
      }
    });
    html += '</div>';

    // 添加 CSS 动画
    if (!document.getElementById('ach-style')) {
      const style = document.createElement('style');
      style.id = 'ach-style';
      style.textContent = `@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
@keyframes achBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
@keyframes shimmer { 0% { left:-20%; } 100% { left:120%; } }`;
      document.head.appendChild(style);
    }
    list.innerHTML = html;
  },

  /** 刷新成就（供其他模块调用） */
  refreshAchievements() {
    this.renderAchievements();
  },

  /** 渲染错误类型分析 */
  renderErrorTypeAnalysis() {
    const card = document.getElementById('errorTypeCard');
    const content = document.getElementById('errorTypeContent');
    if (!card || !content) return;

    const stats = Store.getErrorTypeStats();
    if (stats.totalErrors === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    const wPct = stats.wrongCharPct;
    const bPct = stats.blankCharPct;

    let tipHtml = '';
    if (bPct > 60) tipHtml = '<span style="color:#975a16;">💡 留空字占比高 → 建议先加强认读和背诵</span>';
    else if (wPct > 60) tipHtml = '<span style="color:#c53030;">💡 错别字占比高 → 建议加强相近字辨析练习</span>';
    else tipHtml = '<span style="color:#667eea;">💡 两种错误类型较均衡 → 记忆+辨析双管齐下</span>';

    content.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;gap:4px;height:32px;border-radius:16px;overflow:hidden;background:#edf2f7;">
          <div style="width:${wPct}%;background:linear-gradient(135deg,#fc8181,#f56565);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:700;${wPct < 10 ? 'min-width:28px;' : ''}">${wPct > 0 ? wPct + '%' : ''}</div>
          <div style="width:${bPct}%;background:linear-gradient(135deg,#ed8936,#dd6b20);display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:700;${bPct < 10 ? 'min-width:28px;' : ''}">${bPct > 0 ? bPct + '%' : ''}</div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fff5f5;border-radius:10px;border:1px solid #fed7d7;">
            <span style="font-size:18px;">✏️</span>
            <div><div style="font-size:18px;font-weight:700;color:#c53030;">${stats.wrongCharCount}</div>
            <div style="font-size:11px;color:#718096;">错别字</div></div>
          </div>
          <div style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;background:#fffaf0;border-radius:10px;border:1px solid #feebc8;">
            <span style="font-size:18px;">⬜</span>
            <div><div style="font-size:18px;font-weight:700;color:#975a16;">${stats.blankCharCount}</div>
            <div style="font-size:11px;color:#718096;">留空字</div></div>
          </div>
        </div>
        <div style="font-size:12px;color:#718096;background:#f7fafc;padding:8px 12px;border-radius:8px;border:1px solid #e2e8f0;line-height:1.5;">
          ${tipHtml}
        </div>
      </div>`;
  },

  /** 渲染复习提醒 */
  renderReviewUrgency() {
    const card = document.getElementById('reviewUrgencyCard');
    const list = document.getElementById('reviewUrgencyList');
    if (!card || !list) return;

    const items = Store.getReviewUrgency();
    if (items.length === 0) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    const topItems = items.slice(0, 15);
    let html = '<div style="display:flex;flex-direction:column;gap:6px;">';
    topItems.forEach((item, i) => {
      const urgency = item.score >= 60 ? '紧急' : item.score >= 30 ? '需复习' : '温习';
      const urgencyColor = item.score >= 60 ? '#e53e3e' : item.score >= 30 ? '#ed8936' : '#667eea';
      html += `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:#f7fafc;border-radius:8px;flex-wrap:wrap;">
        <span style="font-size:13px;color:#a0aec0;min-width:20px;">${i + 1}.</span>
        <span style="font-size:18px;font-weight:700;color:#2d3748;min-width:24px;">${item.char}</span>
        <span style="font-size:12px;color:#667eea;min-width:50px;">${item.pinyin}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:8px;background:${urgencyColor}15;color:${urgencyColor};font-weight:600;">${urgency}</span>
        <span style="font-size:11px;color:#718096;">错${item.errorCount}/${item.totalCount}次</span>
        <span style="font-size:11px;color:#a0aec0;">${item.daysSinceLastError >= 0 ? '最近错: ' + item.daysSinceLastError + '天前' : ''}</span>
      </div>`;
    });
    html += '</div>';
    if (items.length > 15) html += `<div style="text-align:center;margin-top:6px;font-size:12px;color:#a0aec0;">还有 ${items.length - 15} 个字...</div>`;
    list.innerHTML = html;
  },

  /** 渲染进步周报 */
  renderWeeklyReport() {
    const card = document.getElementById('weeklyReportCard');
    const content = document.getElementById('weeklyReportContent');
    const dateEl = document.getElementById('weeklyReportDate');
    if (!card || !content) return;

    const report = Store.generateWeeklyReport();
    if (!report) { card.style.display = 'none'; return; }
    card.style.display = 'block';

    if (dateEl) dateEl.textContent = report.dateRange;

    let html = '';

    // 正确率环
    html += `<div style="display:flex;align-items:center;gap:14px;margin-bottom:12px;flex-wrap:wrap;">
      <div style="position:relative;width:64px;height:64px;flex-shrink:0;">
        <svg viewBox="0 0 36 36" style="width:64px;height:64px;">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="#edf2f7" stroke-width="3" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none" stroke="${report.avgRate >= 90 ? '#48bb78' : report.avgRate >= 70 ? '#ed8936' : '#fc8181'}" stroke-width="3"
            stroke-dasharray="${report.avgRate}, 100" />
        </svg>
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:16px;font-weight:700;color:#2d3748;">${report.avgRate}%</div>
      </div>
      <div style="flex:1;min-width:100px;">
        <div style="font-size:13px;font-weight:600;color:#2d3748;margin-bottom:2px;">本周概况</div>
        <div style="font-size:12px;color:#718096;line-height:1.6;">
          练习 <strong>${report.totalDays}</strong> 天 · 共 <strong>${report.totalWords}</strong> 词 · 错 <strong style="color:#e53e3e;">${report.totalWrong}</strong> 词
        </div>
      </div>
    </div>`;

    if (report.improvedChars.length > 0) {
      html += '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:#38a169;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><span>📈</span> 进步明显的字</div><div style="display:flex;flex-wrap:wrap;gap:4px;">';
      report.improvedChars.forEach(c => {
        html += `<span style="padding:3px 10px;background:#f0fff4;border:1px solid #c6f6d5;border-radius:14px;font-size:12px;color:#22543d;display:inline-flex;align-items:center;gap:3px;">${c.char} <span style="color:#38a169;font-weight:600;">↑${c.change}%</span></span>`;
      });
      html += '</div></div>';
    }

    if (report.declinedChars.length > 0) {
      html += '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:#e53e3e;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><span>📉</span> 需要加强的字</div><div style="display:flex;flex-wrap:wrap;gap:4px;">';
      report.declinedChars.forEach(c => {
        html += `<span style="padding:3px 10px;background:#fff5f5;border:1px solid #fed7d7;border-radius:14px;font-size:12px;color:#742a2a;display:inline-flex;align-items:center;gap:3px;">${c.char} <span style="color:#e53e3e;font-weight:600;">↓${Math.abs(c.change)}%</span></span>`;
      });
      html += '</div></div>';
    }

    if (report.weakestCats.length > 0) {
      html += '<div style="margin-bottom:8px;"><div style="font-size:12px;font-weight:600;color:#4a5568;margin-bottom:4px;display:flex;align-items:center;gap:4px;"><span>📂</span> 薄弱单元</div><div style="display:flex;flex-wrap:wrap;gap:4px;">';
      report.weakestCats.forEach(c => {
        const color = c.rate >= 80 ? '#38a169' : c.rate >= 60 ? '#ed8936' : '#e53e3e';
        html += `<span style="padding:3px 10px;background:#f7fafc;border:1px solid #e2e8f0;border-radius:14px;font-size:12px;display:inline-flex;align-items:center;gap:3px;"><span style="color:#4a5568;">${c.name}</span> <span style="color:${color};font-weight:600;">${c.rate}%</span></span>`;
      });
      html += '</div></div>';
    }

    if (report.errorTypeStats.totalErrors > 0) {
      const e = report.errorTypeStats;
      html += `<div style="font-size:12px;color:#718096;padding:6px 10px;background:#f7fafc;border-radius:8px;border:1px solid #e2e8f0;">
        🧩 错误：<span style="color:#c53030;">错别字 ${e.wrongCharCount}次</span> · <span style="color:#975a16;">留空字 ${e.blankCharCount}次</span>
      </div>`;
    }

    content.innerHTML = html;
  },

  /** 刷新周报（供按钮事件调用） */
  refreshWeeklyReport() {
    this.renderWeeklyReport();
  },
};

// 兼容旧版 onclick
window.renderStatsPage = () => App.Stats.renderPage();
window.setStatsLastMonth = () => App.Stats.setLastMonth();
window.setStatsLastWeek = () => App.Stats.setLastWeek();
window.setStatsAll = () => App.Stats.setAll();
window.renderStatsChart = () => App.Stats.renderChart();
