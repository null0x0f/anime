// ===== Timeline Page =====
App.timeline = {
  filterStatus: 'all',
  filterYear: 'all',

  async render() {
    const anime = await App.db.getAllAnime();
    let filtered = anime.filter(a => a.status);
    // Status filter
    if (this.filterStatus !== 'all') filtered = filtered.filter(a => a.status === this.filterStatus);
    // Year filter
    const years = [...new Set(anime.map(a => {
      const d = a.watchStart || a.addedAt || '';
      return d.slice(0, 4);
    }).filter(Boolean))].sort().reverse();
    if (this.filterYear !== 'all') {
      filtered = filtered.filter(a => {
        const d = a.watchStart || a.addedAt || '';
        return d.startsWith(this.filterYear);
      });
    }

    // Sort by watchStart or addedAt
    const sorted = filtered.sort((a, b) => {
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
    <div class="toolbar">
      <div class="filter-tabs">
        ${['all','plan','watching','completed','dropped'].map(f => {
          const labels = { all:`全部(${anime.filter(a=>a.status).length})`, plan:'想看', watching:'在看', completed:'已看', dropped:'弃番' };
          return `<button class="filter-tab ${this.filterStatus===f?'active':''}" data-tl-status="${f}">${labels[f]}</button>`;
        }).join('')}
      </div>
      <div class="sort-group"><label>年份：</label>
        <select id="tl-year-filter" class="input input-sm">
          <option value="all" ${this.filterYear==='all'?'selected':''}>全部</option>
          ${years.map(y => `<option value="${y}" ${this.filterYear===y?'selected':''}>${y}</option>`).join('')}
        </select>
      </div>
    </div>
    ${Object.keys(groups).length ? `<div class="timeline">
      ${Object.entries(groups).map(([month, items]) => {
        const [y, m] = month.split('-');
        const label = m ? `${y}年 ${monthNames[parseInt(m)-1]}` : month;
        return `<div class="timeline-group">
          <div class="timeline-month">${label} <span class="count">(${items.length})</span></div>
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

  bindEvents() {
    document.querySelectorAll('[data-tl-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filterStatus = btn.dataset.tlStatus;
        App.router.refresh();
      });
    });
    document.getElementById('tl-year-filter')?.addEventListener('change', e => {
      this.filterYear = e.target.value;
      App.router.refresh();
    });
  }
};
