// ===== Charts / Statistics Page =====
App.charts = {
  async render() {
    const merch = await App.db.getAllMerch();
    const anime = await App.db.getAllAnime();
    const owned = merch.filter(m => !m.isWishlist);
    const totalCost = owned.reduce((s, m) => s + (m.price || 0), 0);
    const totalValue = owned.filter(m => m.currentValue).reduce((s, m) => s + m.currentValue, 0);
    const countVal = owned.filter(m => m.currentValue).length;

    // Anime stats
    const statusCounts = { plan: 0, watching: 0, completed: 0, dropped: 0 };
    anime.forEach(a => { if (statusCounts[a.status] !== undefined) statusCounts[a.status]++; });
    const ratingDist = new Array(11).fill(0); // 0-10
    anime.forEach(a => { if (a.userRating >= 0 && a.userRating <= 10) ratingDist[a.userRating]++; });
    const yearCounts = {};
    anime.forEach(a => { if (a.year) yearCounts[a.year] = (yearCounts[a.year] || 0) + 1; });

    return `
    <div class="page-header"><h1>统计分析</h1><p class="subtitle">动漫收藏与周边花费数据</p></div>
    <div class="stats-grid">
      <div class="stat-card stat-purple"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div>
        <div class="stat-info"><span class="stat-num">${anime.length}</span><span class="stat-label">收藏动漫</span></div></div>
      <div class="stat-card stat-pink"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
        <div class="stat-info"><span class="stat-num">${owned.length}</span><span class="stat-label">周边总数</span></div></div>
      <div class="stat-card stat-cyan"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
        <div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalCost)}</span><span class="stat-label">总花费</span></div></div>
      ${countVal ? `<div class="stat-card stat-green"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg></div>
        <div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalValue)}</span><span class="stat-label">估值 (${countVal}件)</span></div></div>` : ''}
    </div>
    <div class="charts-grid">
      <div class="chart-container"><h3>观看状态分布</h3><canvas id="chart-status" width="400" height="300"></canvas></div>
      <div class="chart-container"><h3>评分分布</h3><canvas id="chart-rating" width="600" height="300"></canvas></div>
      <div class="chart-container"><h3>年份趋势</h3><canvas id="chart-year" width="600" height="300"></canvas></div>
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
    const anime = await App.db.getAllAnime();
    this.drawStatus(anime);
    this.drawRating(anime);
    this.drawYear(anime);
    this.drawMonthly(merch);
    this.drawCategory(merch);
    this.drawIP(merch);
    this.drawROI(merch);
  },

  drawStatus(anime) {
    const canvas = document.getElementById('chart-status');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = Math.min(400, canvas.parentElement.clientWidth - 40);
    const h = canvas.height = 280;
    const data = [
      { label: '想看', count: anime.filter(a => a.status === 'plan').length, color: '#1868f2' },
      { label: '在看', count: anime.filter(a => a.status === 'watching').length, color: '#14c6cb' },
      { label: '已看', count: anime.filter(a => a.status === 'completed').length, color: '#7b42bc' },
      { label: '弃番', count: anime.filter(a => a.status === 'dropped').length, color: '#b4232c' },
    ].filter(d => d.count > 0);
    if (!data.length) { ctx.fillStyle = '#656a76'; ctx.fillText('暂无数据', w/2-30, h/2); return; }
    const total = data.reduce((s, d) => s + d.count, 0);
    const cx = w * 0.35, cy = h / 2, r = Math.min(cx, cy) - 20;
    let angle = -Math.PI / 2;
    data.forEach(d => {
      const slice = (d.count / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.fillStyle = d.color; ctx.fill();
      angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.querySelector('.chart-container')).backgroundColor || '#fff'; ctx.fill();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-primary') || '#000';
    ctx.font = 'bold 16px Inter'; ctx.textAlign = 'center';
    ctx.fillText(`${total} 部`, cx, cy + 6);
    // Legend
    const lx = w * 0.68;
    data.forEach((d, i) => {
      const y = 40 + i * 32;
      ctx.fillStyle = d.color; ctx.fillRect(lx, y, 12, 12);
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#3b3d45';
      ctx.font = '12px Inter'; ctx.textAlign = 'start';
      ctx.fillText(`${d.label} (${d.count})`, lx + 18, y + 10);
    });
  },

  drawRating(anime) {
    const canvas = document.getElementById('chart-rating');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 280;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const rated = anime.filter(a => a.userRating > 0);
    const dist = new Array(10).fill(0);
    rated.forEach(a => { if (a.userRating >= 1 && a.userRating <= 10) dist[a.userRating - 1]++; });
    const maxVal = Math.max(...dist, 1);
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const barW = Math.min(32, chartW / 10 - 6);

    ctx.clearRect(0, 0, w, h);
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--mds-color-foreground-muted')?.trim() || '#656a76';
    // Grid
    ctx.strokeStyle = 'rgba(178,182,189,0.25)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = fg; ctx.font = '11px Inter'; ctx.textAlign = 'end';
      ctx.fillText(Math.round(maxVal * i / 4), pad.left - 8, y + 4);
    }
    // Bars
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, '#ffcf25');
    gradient.addColorStop(1, '#bb5a00');
    dist.forEach((count, i) => {
      const x = pad.left + (chartW / 10) * i + (chartW / 10 - barW) / 2;
      const barH = (count / maxVal) * chartH;
      const y = pad.top + chartH - barH;
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]); ctx.fill();
      ctx.fillStyle = fg; ctx.font = '11px Inter'; ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}★`, x + barW / 2, h - pad.bottom + 16);
      if (count) { ctx.fillText(count, x + barW / 2, y - 6); }
    });
    ctx.textAlign = 'start';
  },

  drawYear(anime) {
    const canvas = document.getElementById('chart-year');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 280;
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const yearCounts = {};
    anime.forEach(a => { if (a.year) yearCounts[a.year] = (yearCounts[a.year] || 0) + 1; });
    const sorted = Object.entries(yearCounts).sort((a, b) => +a[0] - +b[0]).slice(-15);
    if (!sorted.length) { ctx.fillStyle = '#656a76'; ctx.fillText('暂无数据', w/2-30, h/2); return; }
    const maxVal = Math.max(...sorted.map(s => s[1]));
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--mds-color-foreground-muted')?.trim() || '#656a76';

    ctx.clearRect(0, 0, w, h);
    // Grid
    ctx.strokeStyle = 'rgba(178,182,189,0.25)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = fg; ctx.font = '11px Inter'; ctx.textAlign = 'end';
      ctx.fillText(Math.round(maxVal * i / 4), pad.left - 8, y + 4);
    }
    // Line chart
    ctx.strokeStyle = '#14c6cb'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    sorted.forEach(([year, count], i) => {
      const x = pad.left + (chartW / (sorted.length - 1 || 1)) * i;
      const y = pad.top + chartH - (count / maxVal) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Area fill
    const lastX = pad.left + chartW;
    ctx.lineTo(lastX, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    areaGrad.addColorStop(0, 'rgba(20,198,203,0.18)');
    areaGrad.addColorStop(1, 'rgba(20,198,203,0.02)');
    ctx.fillStyle = areaGrad; ctx.fill();
    // Dots and labels
    sorted.forEach(([year, count], i) => {
      const x = pad.left + (chartW / (sorted.length - 1 || 1)) * i;
      const y = pad.top + chartH - (count / maxVal) * chartH;
      ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#14c6cb'; ctx.fill();
      ctx.fillStyle = fg; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(year, x, h - pad.bottom + 16);
      ctx.fillText(count, x, y - 10);
    });
    ctx.textAlign = 'start';
  },

  drawMonthly(merch) {
    const canvas = document.getElementById('chart-monthly');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.parentElement.clientWidth - 40;
    const h = canvas.height = 280;
    const pad = { top: 20, right: 20, bottom: 40, left: 60 };
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
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--mds-color-foreground-muted')?.trim() || '#656a76';

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(178,182,189,0.25)';
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + chartH * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(w - pad.right, y); ctx.stroke();
      ctx.fillStyle = fg; ctx.font = '11px Inter';
      ctx.fillText('¥' + Math.round(maxVal * i / 4), 4, y + 4);
    }
    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, '#7b42bc');
    gradient.addColorStop(1, '#14c6cb');
    sorted.forEach(([month, val], i) => {
      const x = pad.left + (chartW / sorted.length) * i + (chartW / sorted.length - barW) / 2;
      const barH = (val / maxVal) * chartH;
      const y = pad.top + chartH - barH;
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.roundRect(x, y, barW, barH, [4, 4, 0, 0]); ctx.fill();
      ctx.fillStyle = fg; ctx.font = '10px Inter'; ctx.textAlign = 'center';
      ctx.fillText(month.slice(5), x + barW / 2, h - pad.bottom + 16);
      ctx.fillStyle = fg; ctx.font = '10px Inter';
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
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      angle += slice;
    });
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.querySelector('.chart-container')).backgroundColor || '#fff'; ctx.fill();
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary')?.trim() || '#000';
    ctx.fillStyle = textColor; ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
    ctx.fillText('¥' + Math.round(total), cx, cy + 5);
    const lx = w * 0.68;
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')?.trim() || '#3b3d45';
    sorted.slice(0, 7).forEach(([cat, val], i) => {
      const y = 30 + i * 28;
      ctx.fillStyle = colors[i % colors.length]; ctx.fillRect(lx, y, 12, 12);
      ctx.fillStyle = fg; ctx.font = '12px Inter'; ctx.textAlign = 'start';
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
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--mds-color-foreground-muted')?.trim() || '#656a76';
    sorted.forEach(([name, val], i) => {
      const y = pad.top + ((h - pad.top - pad.bottom) / sorted.length) * i + ((h - pad.top - pad.bottom) / sorted.length - barH) / 2;
      const bw = (val / maxVal) * chartW;
      ctx.fillStyle = fg; ctx.font = '11px Inter'; ctx.textAlign = 'end';
      const shortName = name.length > 12 ? name.slice(0, 12) + '…' : name;
      ctx.fillText(shortName, pad.left - 8, y + barH / 2 + 4);
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath(); ctx.roundRect(pad.left, y, bw, barH, 4); ctx.fill();
      ctx.fillStyle = fg; ctx.font = '10px Inter'; ctx.textAlign = 'start';
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
