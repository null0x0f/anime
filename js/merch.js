// ===== Merch Page =====
App.merch = {
  sort: 'newest',
  search: '',
  tab: 'owned', // 'owned' | 'wishlist' | 'all'
  catFilter: '', // '' = all, or a specific category

  async render() {
    let merch = await App.db.getAllMerch();
    const allTags = await App.db.getAllTags();
    // Tab filter
    if (this.tab === 'owned') merch = merch.filter(m => !m.isWishlist);
    else if (this.tab === 'wishlist') merch = merch.filter(m => m.isWishlist);
    // Search
    if (this.search) {
      const q = this.search.toLowerCase();
      merch = merch.filter(m => (m.name||'').toLowerCase().includes(q) || (m.animeName||'').toLowerCase().includes(q) || (m.category||'').toLowerCase().includes(q));
    }
    // Category filter
    const allCats = [...new Set(merch.map(m => m.category || '其他'))];
    if (this.catFilter) merch = merch.filter(m => (m.category || '其他') === this.catFilter);
    // Sort
    if (this.sort === 'newest') merch.sort((a, b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    else if (this.sort === 'price-desc') merch.sort((a, b) => (b.price||0) - (a.price||0));
    else if (this.sort === 'price-asc') merch.sort((a, b) => (a.price||0) - (b.price||0));
    else if (this.sort === 'name') merch.sort((a, b) => (a.name||'').localeCompare(b.name||''));
    const totalCost = merch.filter(m => !m.isWishlist).reduce((s, m) => s + (m.price || 0), 0);
    const totalValue = merch.filter(m => !m.isWishlist && m.currentValue).reduce((s, m) => s + m.currentValue, 0);
    const countWithValue = merch.filter(m => !m.isWishlist && m.currentValue).length;

    return `
    <div class="page-header"><h1>周边收藏</h1>
      <p class="subtitle">总计 ${merch.length} 件 · 总花费 ${App.utils.formatCurrency(totalCost)}${countWithValue ? ` · 估值 ${App.utils.formatCurrency(totalValue)}` : ''}</p></div>
    <div class="toolbar">
      <div class="merch-tabs">
        ${[['owned','已购'],['wishlist','愿望清单'],['all','全部']].map(([k,v]) =>
          `<button class="filter-tab ${this.tab===k?'active':''}" data-tab="${k}">${v}</button>`).join('')}
      </div>
      <div class="search-box search-box-sm"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="merch-search" class="search-input" placeholder="搜索周边..." value="${App.utils.escapeHtml(this.search)}"/></div>
      <div class="sort-group"><label>排序：</label>
        <select id="merch-sort" class="input input-sm">
          <option value="newest" ${this.sort==='newest'?'selected':''}>最新添加</option>
          <option value="price-desc" ${this.sort==='price-desc'?'selected':''}>价格↓</option>
          <option value="price-asc" ${this.sort==='price-asc'?'selected':''}>价格↑</option>
          <option value="name" ${this.sort==='name'?'selected':''}>名称</option>
        </select></div>
    </div>
    ${allCats.length > 1 ? `<div class="merch-cat-tabs">
      <button class="filter-tab ${!this.catFilter?'active':''}" data-catf="">全部分类</button>
      ${allCats.map(c => `<button class="filter-tab ${this.catFilter===c?'active':''}" data-catf="${App.utils.escapeHtml(c)}">${App.utils.escapeHtml(c)}</button>`).join('')}
    </div>` : ''}
    ${merch.length ? `<div class="merch-grid">${merch.map(m => this.merchCard(m, true)).join('')}</div>` : `<div class="empty-state"><h3>${this.tab==='wishlist'?'还没有愿望清单':'还没有周边'}</h3><p>在动漫详情页中添加你的周边收藏</p></div>`}
    <div id="merch-detail-modal" class="modal hidden"></div>
    <div id="merch-edit-modal" class="modal hidden"></div>`;
  },

  merchCard(m, showAnime = false) {
    const esc = App.utils.escapeHtml;
    const roi = m.currentValue && m.price ? ((m.currentValue - m.price) / m.price * 100).toFixed(0) : null;
    return `<div class="merch-card ${m.isWishlist?'wishlist-card':''}" onclick="App.merch.showDetail('${m.id}')">
      <div class="merch-card-img">${m.photo ? `<img src="${m.photo}" alt="${esc(m.name)}" loading="lazy"/>` : `<div class="merch-placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg></div>`}
        <span class="merch-cat">${esc(m.category || '')}</span>
        ${m.isWishlist ? '<span class="wishlist-badge">想要</span>' : ''}
        ${m.photos && m.photos.length > 1 ? `<span class="photo-count">${m.photos.length} 图</span>` : ''}
      </div>
      <div class="merch-card-body"><h3 class="merch-card-title">${esc(m.name)}</h3>
        ${showAnime && m.animeName ? `<p class="merch-anime-name">${esc(m.animeName)}</p>` : ''}
        <div class="merch-card-footer">
          ${m.isWishlist ? (m.targetPrice ? `<span class="merch-price target">目标 ${App.utils.formatCurrency(m.targetPrice)}</span>` : '') :
            (m.price ? `<span class="merch-price">${App.utils.formatCurrency(m.price)}</span>` : '')}
          ${roi !== null ? `<span class="merch-roi ${+roi>=0?'up':'down'}">${+roi>=0?'↑':'↓'}${Math.abs(roi)}%</span>` : ''}
          ${!m.isWishlist && m.purchaseDate ? `<span class="merch-date">${App.utils.formatDate(m.purchaseDate)}</span>` : ''}
        </div>
      </div></div>`;
  },

  async showDetail(id) {
    const merch = await App.db.getAllMerch();
    const m = merch.find(x => x.id === id);
    if (!m) return;
    const esc = App.utils.escapeHtml;
    const allTags = await App.db.getAllTags();
    const mTags = (m.tags || []).map(tid => allTags.find(t => t.id === tid)).filter(Boolean);
    const roi = m.currentValue && m.price ? ((m.currentValue - m.price) / m.price * 100).toFixed(1) : null;

    let modal = document.getElementById('merch-detail-modal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'merch-detail-modal'; modal.className = 'modal'; document.body.appendChild(modal); }
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-overlay" onclick="this.parentElement.classList.add('hidden')"></div>
      <div class="modal-content merch-detail">
        ${(m.photos && m.photos.length) ? `<div class="photo-carousel" id="photo-carousel">
          <div class="carousel-track">${m.photos.map((p,i) => `<img src="${p.path}" class="${i===0?'active':''}" data-idx="${i}"/>`).join('')}</div>
          ${m.photos.length > 1 ? `<button class="carousel-btn prev" onclick="App.merch.carouselPrev()">‹</button><button class="carousel-btn next" onclick="App.merch.carouselNext()">›</button>
          <div class="carousel-dots">${m.photos.map((_,i) => `<span class="dot ${i===0?'active':''}" onclick="App.merch.carouselGo(${i})"></span>`).join('')}</div>` : ''}
        </div>` : (m.photo ? `<div class="merch-detail-photo"><img src="${m.photo}" alt="${esc(m.name)}"/></div>` : '')}
        <h2>${esc(m.name)} ${m.isWishlist ? '<span class="wishlist-inline">愿望清单</span>' : ''}</h2>
        <p class="merch-anime-link">所属IP: <a href="#/anime/${m.animeId}" class="link">${esc(m.animeName)}</a></p>
        ${mTags.length ? `<div class="tag-list">${mTags.map(t => `<span class="tag" style="--tag-color:${t.color}">${esc(t.name)}</span>`).join('')}</div>` : ''}
        <div class="merch-detail-info">
          <div class="info-row"><span>分类</span><span>${esc(m.category || '—')}</span></div>
          ${m.isWishlist ? `<div class="info-row"><span>目标价</span><span>${m.targetPrice ? App.utils.formatCurrency(m.targetPrice) : '—'}</span></div>` : `
          <div class="info-row"><span>购入价</span><span>${m.price ? App.utils.formatCurrency(m.price) : '—'}</span></div>
          ${m.currentValue ? `<div class="info-row"><span>当前市价</span><span>${App.utils.formatCurrency(m.currentValue)} ${roi ? `<span class="merch-roi ${+roi>=0?'up':'down'}">(${+roi>=0?'+':''}${roi}%)</span>` : ''}</span></div>` : ''}
          <div class="info-row"><span>购买日期</span><span>${App.utils.formatDate(m.purchaseDate)}</span></div>`}
          ${m.notes ? `<div class="info-row full"><span>备注</span><p>${esc(m.notes)}</p></div>` : ''}
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-sm" onclick="App.merch.showEditModal('${m.id}')">编辑</button>
          <button class="btn btn-ghost btn-sm" onclick="App.merch.addPhotos('${m.id}')">追加照片</button>
          <button class="btn btn-danger btn-sm" onclick="App.merch.deleteMerch('${m.id}')">删除</button>
          <button class="btn btn-ghost" onclick="document.getElementById('merch-detail-modal').classList.add('hidden')">关闭</button>
        </div>
      </div>`;
  },

  async showEditModal(id) {
    const merch = await App.db.getAllMerch();
    const m = merch.find(x => x.id === id);
    if (!m) return;
    const esc = App.utils.escapeHtml;
    document.getElementById('merch-detail-modal')?.classList.add('hidden');
    let modal = document.getElementById('merch-edit-modal');
    if (!modal) { modal = document.createElement('div'); modal.id = 'merch-edit-modal'; modal.className = 'modal'; document.body.appendChild(modal); }
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-overlay" onclick="this.parentElement.classList.add('hidden')"></div>
      <div class="modal-content"><h2>编辑周边</h2>
        <form id="merch-edit-form">
          <div class="form-group"><label>名称</label><input type="text" id="me-name" class="input" required value="${esc(m.name)}"/></div>
          <div class="form-group"><label>分类</label><select id="me-cat" class="input">
            ${['手办','挂件','服装','海报','光碟','书籍','其他'].map(c => `<option value="${c}" ${m.category===c?'selected':''}>${c}</option>`).join('')}
          </select></div>
          <div class="form-row">
            <div class="form-group"><label>价格 (¥)</label><input type="number" id="me-price" class="input" step="0.01" value="${m.price||''}"/></div>
            <div class="form-group"><label>当前市价 (¥)</label><input type="number" id="me-value" class="input" step="0.01" value="${m.currentValue||''}"/></div>
          </div>
          <div class="form-group"><label>备注</label><textarea id="me-notes" class="input" rows="2">${esc(m.notes||'')}</textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('merch-edit-modal').classList.add('hidden')">取消</button>
            <button type="submit" class="btn btn-primary">保存</button>
          </div>
        </form></div>`;
    document.getElementById('merch-edit-form').addEventListener('submit', async e => {
      e.preventDefault();
      await App.db.updateMerch(id, {
        name: document.getElementById('me-name').value,
        category: document.getElementById('me-cat').value,
        price: document.getElementById('me-price').value || 0,
        currentValue: document.getElementById('me-value').value || '',
        notes: document.getElementById('me-notes').value,
        isWishlist: m.isWishlist,
        targetPrice: m.targetPrice || '',
        tags: JSON.stringify(m.tags || []),
      });
      modal.classList.add('hidden');
      App.toast('已保存', 'success');
      App.router.refresh();
    });
  },

  async addPhotos(merchId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async () => {
      if (!input.files.length) return;
      await App.db.addMerchPhotos(merchId, Array.from(input.files));
      App.toast('照片已添加', 'success');
      document.getElementById('merch-detail-modal')?.classList.add('hidden');
      App.router.refresh();
    };
    input.click();
  },

  _carouselIdx: 0,
  carouselGo(i) {
    this._carouselIdx = i;
    const imgs = document.querySelectorAll('#photo-carousel .carousel-track img');
    const dots = document.querySelectorAll('#photo-carousel .dot');
    imgs.forEach((img, j) => img.classList.toggle('active', j === i));
    dots.forEach((d, j) => d.classList.toggle('active', j === i));
  },
  carouselPrev() { const imgs = document.querySelectorAll('#photo-carousel .carousel-track img'); this.carouselGo((this._carouselIdx - 1 + imgs.length) % imgs.length); },
  carouselNext() { const imgs = document.querySelectorAll('#photo-carousel .carousel-track img'); this.carouselGo((this._carouselIdx + 1) % imgs.length); },

  async deleteMerch(id) {
    if (!confirm('确定删除？')) return;
    await App.db.deleteMerch(id);
    document.getElementById('merch-detail-modal')?.classList.add('hidden');
    App.toast('已删除', 'success');
    App.router.refresh();
  },

  bindEvents() {
    const sort = document.getElementById('merch-sort');
    if (sort) sort.addEventListener('change', () => { this.sort = sort.value; App.router.refresh(); });
    const search = document.getElementById('merch-search');
    if (search) {
      const doSearch = App.utils.debounce(v => { this.search = v; App.router.refresh(); }, 300);
      search.addEventListener('input', e => doSearch(e.target.value));
      search.focus(); search.setSelectionRange(search.value.length, search.value.length);
    }
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { this.tab = btn.dataset.tab; this.catFilter = ''; App.router.refresh(); });
    });
    // Category filter
    document.querySelectorAll('[data-catf]').forEach(btn => {
      btn.addEventListener('click', () => { this.catFilter = btn.dataset.catf; App.router.refresh(); });
    });
  }
};
