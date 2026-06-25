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
    this.setLastMonth();
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
      <span class="stat-badge">📈 平均正确率 <strong>${avgRate}%</strong></span>
      <span class="stat-badge">🏆 最高 <strong>${maxRate}%</strong></span>
      <span class="stat-badge" style="${minRate < 80 ? 'background:#fed7d7;color:#9b2c2c;' : ''}">⬇ 最低 <strong>${minRate}%</strong></span>`;

    const chartDom = document.createElement('div');
    chartDom.style.cssText = 'width:100%;height:400px;';
    container.innerHTML = '';
    container.appendChild(chartDom);

    const myChart = echarts.init(chartDom);
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const p = params[0];
          const day = filtered[p.dataIndex];
          const words = day.words || [];
          const total = words.length;
          const wrong = words.filter(w => w.wrongIndices && w.wrongIndices.length > 0).length;
          return `<strong>${p.axisValue}</strong><br/>✅ 正确 ${total - wrong} / ${total} 词<br/>📊 正确率 ${p.value}%`;
        }
      },
      grid: { left: '50', right: '30', top: '40', bottom: '50' },
      xAxis: {
        type: 'category', data: dates,
        axisLabel: { rotate: 45, fontSize: 11 },
        axisLine: { lineStyle: { color: '#e2e8f0' } }
      },
      yAxis: {
        type: 'value', min: 0, max: 100,
        axisLabel: { formatter: '{value}%', fontSize: 11 },
        splitLine: { lineStyle: { color: '#f0f4f8', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [{
        data: rates, type: 'line', smooth: true,
        symbol: 'circle', symbolSize: 8,
        lineStyle: { width: 3, color: '#667eea' },
        itemStyle: { color: function(params) { return params.value >= 90 ? '#48bb78' : params.value >= 70 ? '#ed8936' : '#fc8181'; } },
        areaStyle: {
          color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(102,126,234,0.3)' },
              { offset: 1, color: 'rgba(102,126,234,0.02)' }
            ] }
        },
        markLine: {
          silent: true,
          data: [
            { yAxis: 90, label: { formatter: '优秀 90%', color: '#48bb78', fontSize: 11 }, lineStyle: { color: '#48bb78', type: 'dashed' } },
            { yAxis: 60, label: { formatter: '及格 60%', color: '#ed8936', fontSize: 11 }, lineStyle: { color: '#ed8936', type: 'dashed' } }
          ]
        }
      }]
    };
    myChart.setOption(option);
    window.addEventListener('resize', () => myChart.resize());
  },
};

// 兼容旧版 onclick
window.renderStatsPage = () => App.Stats.renderPage();
window.setStatsLastMonth = () => App.Stats.setLastMonth();
window.setStatsLastWeek = () => App.Stats.setLastWeek();
window.setStatsAll = () => App.Stats.setAll();
window.renderStatsChart = () => App.Stats.renderChart();
