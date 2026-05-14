// ===== Timeline Page =====
App.timeline = {
  async render() {
    const anime = await App.db.getAllAnime();
    // Sort by watchStart or addedAt
    const sorted = anime.filter(a => a.status).sort((a, b) => {
      const da = a.watchStart || a.addedAt || '';
      const db = b.watchStart || b.addedAt || '';
      return db.localeCompare(da);
    });

    // Group by month
    const groups = {};
    sorted.forEach(a => {
      const date = a.watchStart || a.addedAt || '';
      const key = date.slice(0, 7) || '未知日期';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    const esc = App.utils.escapeHtml;
    const statusMap = { plan: '想看', watching: '在看', completed: '已看', dropped: '弃番' };
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

    return `
    <div class="page-header"><h1>观看时间线</h1><p class="subtitle">你的追番历程</p></div>
    ${Object.keys(groups).length ? `<div class="timeline">
      ${Object.entries(groups).map(([month, items]) => {
        const [y, m] = month.split('-');
        const label = m ? `${y}年 ${monthNames[parseInt(m)-1]}` : month;
        return `<div class="timeline-group">
          <div class="timeline-month">${label}</div>
          <div class="timeline-items">${items.map(a => `
            <div class="timeline-item" onclick="App.router.go('/anime/${a.malId}')">
              <div class="timeline-dot status-dot-${a.status}"></div>
              <div class="timeline-poster"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"/></div>
              <div class="timeline-info">
                <h3>${esc(a.title)}</h3>
                ${a.titleJapanese ? `<p class="timeline-jp">${esc(a.titleJapanese)}</p>` : ''}
                <div class="timeline-meta">
                  <span class="status-badge status-${a.status}">${statusMap[a.status]}</span>
                  ${a.userRating ? `<span class="timeline-rating">★ ${a.userRating}/10</span>` : ''}
                  ${a.watchStart && a.watchEnd ? `<span class="timeline-period">${a.watchStart} → ${a.watchEnd}</span>` : ''}
                </div>
              </div>
            </div>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>` : '<div class="empty-state"><h3>还没有观看记录</h3><p>在动漫详情中设置观看状态和日期</p></div>'}`;
  },
  bindEvents() {}
};
