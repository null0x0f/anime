// ===== Charts / Statistics Page =====
App.charts = {
  async render() {
    const merch = await App.db.getAllMerch();
    const anime = await App.db.getAllAnime();
    const owned = merch.filter(m => !m.isWishlist);
    const totalCost = owned.reduce((s, m) => s + (m.price || 0), 0);
    const totalValue = owned.filter(m => m.currentValue).reduce((s, m) => s + m.currentValue, 0);
    const countVal = owned.filter(m => m.currentValue).length;

    return `
    <div class="page-header"><h1>统计分析</h1><p class="subtitle">周边花费与收藏数据</p></div>
    <div class="stats-grid">
      <div class="stat-card stat-purple"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
        <div class="stat-info"><span class="stat-num">${owned.length}</span><span class="stat-label">周边总数</span></div></div>
      <div class="stat-card stat-pink"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalCost)}</span><span class="stat-label">总花费</span></div></div>
      ${countVal ? `<div class="stat-card stat-green"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></div>
        <div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalValue)}</span><span class="stat-label">估值总额 (${countVal}件)</span></div></div>` : ''}
      <div class="stat-card stat-cyan"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>
        <div class="stat-info"><span class="stat-num">${anime.length}</span><span class="stat-label">收藏动漫</span></div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-container"><h3>月度花费趋势</h3><canvas id="chart-monthly" width="600" height="300"></canvas></div>
      <div class="chart-container"><h3>分类占比</h3><canvas id="chart-category" width="400" height="300"></canvas></div>
      <div class="chart-container"><h3>IP 花费 TOP 10</h3><canvas id="chart-ip" width="600" height="300"></canvas></div>
      ${countVal ? `<div class="chart-container"><h3>投资回报 TOP 10</h3><div id="chart-roi" class="roi-list"></div></div>` : ''}
    </div>`;
  },

  bindEvents() {
    this.drawCharts();
  },

  async drawCharts() {
    const merch = (await App.db.getAllMerch()).filter(m => !m.isWishlist);
    this.drawMonthly(merch);
    this.drawCategory(merch);
    this.drawIP(merch);
    this.drawROI(merch);
  },

  drawMonthly(merch) {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 280;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };

    // Group by month
    const months = {};
    merch.forEach(m => {
      const date = m.purchaseDate || m.createdAt || '';
      const key = date.slice(0, 7) || '未知';
      if (key !== '未知') months[key] = (months[key] || 0) + (m.price || 0);
    });
    const sorted = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
    if (!sorted.length) { ctx.fillStyle = '#656a76'; ctx.fillText('暂无数据', w/2-30, h/2); return; }

    const maxVal = Math.max(...sorted.map(s => s[1]));
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = Math.min(40, chartW / sorted.length - 8);

    ctx.clearRect(0, 0, w, h);
    // Grid
    ctx.strokeStyle = 'rgba(178,182,189,0.45)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = '#656a76'; ctx.font = '11px Inter';
      ctx.fillText('¥' + Math.round(maxVal * i / 4), 4, y + 4);
    }
    // Bars
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, '#7b42bc');
    gradient.addColorStop(1, '#14c6cb');
    sorted.forEach(([month, val], i) => {
      const x = pad.left + (chartW / sorted.length) * i + (chartW / sorted.length - barW) / 2;
      const barH = (val / maxVal) * chartH;
      const y = pad.top + chartH - barH;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]);
      ctx.fill();
      // Label
      ctx.fillStyle = '#656a76'; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(month.slice(5), x + barW / 2, h - pad.bottom + 16);
      // Value on top
      ctx.fillStyle = '#3b3d45'; ctx.font = '10px Inter';
      ctx.fillText('¥' + Math.round(val), x + barW / 2, y - 6);
    });
    ctx.textAlign = 'start';
  },

  drawCategory(merch) {
    const canvas = document.getElementById('chart-category');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = Math.min(400, canvas.parentElement.clientWidth - 40);
    const h = canvas.height = 280;

    const cats = {};
    merch.forEach(m => { cats[m.category || '其他'] = (cats[m.category || '其他'] || 0) + (m.price || 0); });
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return;

    const total = sorted.reduce((s, c) => s + c[1], 0);
    const colors = ['#7b42bc','#ffcf25','#14c6cb','#1868f2','#bb5a00','#731e25','#a737ff','#101a59'];
    const cx = w * 0.35, cy = h / 2, r = Math.min(cx, cy) - 20;
    let angle = -Math.PI / 2;

    sorted.forEach(([cat, val], i) => {
      const slice = (val / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      angle += slice;
    });
    // Center hole (donut)
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    // Center text
    ctx.fillStyle = '#000000'; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
    ctx.fillText('¥' + Math.round(total), cx, cy + 5);

    // Legend
    const lx = w * 0.68;
    sorted.slice(0, 7).forEach(([cat, val], i) => {
      const y = 30 + i * 28;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(lx, y, 12, 12);
      ctx.fillStyle = '#3b3d45'; ctx.font = '12px Inter'; ctx.textAlign = 'start';
      ctx.fillText(`${cat} (${(val/total*100).toFixed(0)}%)`, lx + 18, y + 10);
    });
  },

  drawIP(merch) {
    const canvas = document.getElementById('chart-ip');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 300;
    const pad = { top: 10, right: 20, bottom: 10, left: 120 };

    const ips = {};
    merch.forEach(m => { ips[m.animeName || '未知'] = (ips[m.animeName || '未知'] || 0) + (m.price || 0); });
    const sorted = Object.entries(ips).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (!sorted.length) return;

    const maxVal = sorted[0][1];
    const chartW = w - pad.left - pad.right;
    const barH = Math.min(24, (h - pad.top - pad.bottom) / sorted.length - 6);
    const colors = ['#7b42bc','#a737ff','#14c6cb','#1868f2','#ffcf25','#bb5a00','#731e25','#101a59','#2b89ff','#12b6bb'];

    sorted.forEach(([name, val], i) => {
      const y = pad.top + ((h - pad.top - pad.bottom) / sorted.length) * i + ((h - pad.top - pad.bottom) / sorted.length - barH) / 2;
      const bw = (val / maxVal) * chartW;
      // Name
      ctx.fillStyle = '#656a76'; ctx.font = '11px Inter'; ctx.textAlign = 'end';
      const shortName = name.length > 12 ? name.slice(0, 12) + '…' : name;
      ctx.fillText(shortName, pad.left - 8, y + barH / 2 + 4);
      // Bar
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.roundRect(pad.left, y, bw, barH, 4); ctx.fill();
      // Value
      ctx.fillStyle = '#3b3d45'; ctx.font = '10px Inter'; ctx.textAlign = 'start';
      ctx.fillText('¥' + Math.round(val), pad.left + bw + 6, y + barH / 2 + 4);
    });
  },

  drawROI(merch) {
    const el = document.getElementById('chart-roi');
    if (!el) return;
    const withValue = merch.filter(m => m.currentValue && m.price);
    if (!withValue.length) return;
    const sorted = withValue.map(m => ({ ...m, roi: ((m.currentValue - m.price) / m.price * 100) }))
      .sort((a, b) => b.roi - a.roi).slice(0, 10);
    el.innerHTML = sorted.map(m => {
      const esc = App.utils.escapeHtml;
      return `<div class="roi-item">
        <span class="roi-name">${esc(m.name)}</span>
        <span class="roi-prices">¥${m.price} → ¥${m.currentValue}</span>
        <span class="merch-roi ${m.roi >= 0 ? 'up' : 'down'}">${m.roi >= 0 ? '+' : ''}${m.roi.toFixed(1)}%</span>
      </div>`;
    }).join('');
  }
};
