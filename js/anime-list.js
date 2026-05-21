// ===== Anime List Page =====
App.animeList = {
  query: '',
  filter: 'all',
  sort: 'newest',
  searchResults: null,
  searchPage: 1,
  searchPagination: null,
  searchEffectiveQuery: '',
  searchLoading: false,
  exploreTab: null, // null | 'top' | 'season'
  exploreData: null,
  selectMode: false,
  selected: new Set(),

  async render() {
    const anime = await App.db.getAllAnime();
    let filtered = anime;
    if (this.filter !== 'all') filtered = anime.filter(a => a.status === this.filter);
    // Sort
    if (this.sort === 'newest') filtered.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    else if (this.sort === 'rating') filtered.sort((a, b) => (b.userRating || 0) - (a.userRating || 0));
    else if (this.sort === 'score') filtered.sort((a, b) => (b.score || 0) - (a.score || 0));
    else if (this.sort === 'year') filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    else if (this.sort === 'name') filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const savedIds = new Set(anime.map(a => a.malId));
    const esc = App.utils.escapeHtml;

    return `
    <div class="page-header"><h1>动漫库</h1><p class="subtitle">搜索、收藏、追踪你的动漫</p></div>
    <div class="search-section">
      <div class="search-box"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="anime-search" class="search-input" placeholder="搜索动漫名称..." value="${esc(this.query)}" autocomplete="off"/></div>
      <div class="toolbar">
        <div class="filter-tabs">
          ${['all','plan','watching','completed','dropped'].map(f => {
            const labels = { all:'全部', plan:'想看', watching:'在看', completed:'已看', dropped:'弃番' };
            return `<button class="filter-tab ${this.filter===f?'active':''}" data-filter="${f}">${labels[f]}</button>`;
          }).join('')}
        </div>
        <div class="toolbar-right">
          <div class="sort-group"><label>排序：</label>
            <select id="anime-sort" class="input input-sm">
              <option value="newest" ${this.sort==='newest'?'selected':''}>最新添加</option>
              <option value="rating" ${this.sort==='rating'?'selected':''}>我的评分</option>
              <option value="score" ${this.sort==='score'?'selected':''}>MAL评分</option>
              <option value="year" ${this.sort==='year'?'selected':''}>年份</option>
              <option value="name" ${this.sort==='name'?'selected':''}>名称</option>
            </select>
          </div>
          <button class="btn btn-ghost btn-sm" id="btn-select-mode">${this.selectMode ? '取消选择' : '批量操作'}</button>
        </div>
      </div>
    </div>
    <div class="explore-section">
      <div class="filter-tabs" style="margin-bottom:16px">
        <button class="filter-tab ${!this.exploreTab?'active':''}" data-explore="">我的收藏</button>
        <button class="filter-tab ${this.exploreTab==='top'?'active':''}" data-explore="top">🔥 热门排行</button>
        <button class="filter-tab ${this.exploreTab==='season'?'active':''}" data-explore="season">🌸 本季新番</button>
      </div>
    </div>
    ${this.exploreTab && this.exploreData ? `<div class="explore-results">
      <h2 class="section-title">${this.exploreTab === 'top' ? '热门排行' : '本季新番'} <span class="count">(${this.exploreData.length})</span></h2>
      <div class="anime-grid">${this.exploreData.map(a => this.searchCard(a, savedIds.has(a.mal_id))).join('')}</div>
    </div>` : ''}
    <div id="search-results" class="${this.searchResults ? '' : 'hidden'}">
      ${this.searchResults ? `<div class="section-header"><h2 class="section-title">搜索结果 <span class="count">(${this.searchResults.length})</span></h2>${this.searchEffectiveQuery && this.searchEffectiveQuery !== this.query ? `<span class="search-alias-note">已按 ${esc(this.searchEffectiveQuery)} 搜索</span>` : ''}</div>
      <div class="anime-grid">${this.searchResults.map(a => this.searchCard(a, savedIds.has(a.mal_id))).join('')}</div>
      ${this.searchPagination?.has_next_page ? `<div class="load-more-row"><button class="btn btn-ghost" id="btn-load-more-search" ${this.searchLoading ? 'disabled' : ''}>${this.searchLoading ? '加载中...' : '加载更多'}</button></div>` : ''}` : ''}
    </div>
    ${!this.exploreTab ? `<div id="my-anime-list">
      <h2 class="section-title">我的收藏 <span class="count">(${filtered.length})</span></h2>
      ${filtered.length ? `<div class="anime-grid">${filtered.map(a => {
        const card = App.dashboard.animeCard(a);
        if (!this.selectMode) return card;
        const checked = this.selected.has(a.malId) ? 'checked' : '';
        return card.replace('class="anime-card"', `class="anime-card selectable"`)
          .replace('<div class="anime-card-img">', `<input type="checkbox" class="card-checkbox" data-mal="${a.malId}" ${checked} onclick="event.stopPropagation();App.animeList.toggleSelect(${a.malId})"/><div class="anime-card-img">`);
      }).join('')}</div>` : `<div class="empty-state"><p>还没有${this.filter === 'all' ? '' : '该分类的'}收藏</p></div>`}
    </div>` : ''}
    ${this.selectMode && this.selected.size ? `<div class="batch-bar">
      <span>已选 ${this.selected.size} 部</span>
      <select id="batch-status" class="input input-sm" style="width:auto">
        <option value="">修改状态...</option>
        <option value="plan">想看</option>
        <option value="watching">在看</option>
        <option value="completed">已看</option>
        <option value="dropped">弃番</option>
      </select>
      <button class="btn btn-primary btn-sm" onclick="App.animeList.batchSetStatus()">应用</button>
      <button class="btn btn-danger btn-sm" onclick="App.animeList.batchDelete()">删除所选</button>
    </div>` : ''}`;
  },

  searchCard(a, saved) {
    const esc = App.utils.escapeHtml;
    const img = a.images?.jpg?.image_url || '';
    const cnTitle = a.title_chinese || '';
    const jpTitle = a.title_japanese || '';
    const enTitle = a.title_english || '';
    return `<div class="anime-card search-result-card">
      <div class="anime-card-img"><img src="${esc(img)}" alt="${esc(a.title)}" loading="lazy"/>
        ${saved ? '<span class="status-badge status-completed">已收藏</span>' : `<button class="btn-add-anime" onclick="event.stopPropagation();App.animeList.addAnime(${a.mal_id})" title="添加到收藏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg></button>`}
      </div>
      <div class="anime-card-body"><h3 class="anime-card-title">${esc(a.title)}</h3>
        ${cnTitle ? `<p class="anime-card-title-cn">${esc(cnTitle)}</p>` : ''}
        ${jpTitle ? `<p class="anime-card-title-jp">${esc(jpTitle)}</p>` : ''}
        ${enTitle ? `<p class="anime-card-title-en">${esc(enTitle)}</p>` : ''}
        ${a.score ? `<div class="anime-card-rating"><span class="star">★</span> ${a.score}</div>` : ''}
      </div></div>`;
  },

  toggleSelect(malId) {
    if (this.selected.has(malId)) this.selected.delete(malId);
    else this.selected.add(malId);
    App.router.refresh();
  },

  async batchSetStatus() {
    const status = document.getElementById('batch-status')?.value;
    if (!status) { App.toast('请选择状态', 'error'); return; }
    for (const malId of this.selected) {
      const a = await App.db.getAnime(malId);
      if (a) { a.status = status; a.updatedAt = new Date().toISOString(); await App.db.saveAnime(a); }
    }
    App.toast(`已将 ${this.selected.size} 部标记为 ${status}`, 'success');
    this.selected.clear();
    this.selectMode = false;
    App.router.refresh();
  },

  async batchDelete() {
    if (!confirm(`确定删除 ${this.selected.size} 部动漫？关联的周边也会被删除。`)) return;
    for (const malId of this.selected) await App.db.deleteAnime(malId);
    App.toast(`已删除 ${this.selected.size} 部`, 'success');
    this.selected.clear();
    this.selectMode = false;
    App.router.refresh();
  },

  async addAnime(malId) {
    try {
      const data = await App.api.getById(malId);
      const searchHit = (this.searchResults || []).find(a => Number(a.mal_id) === Number(malId))
        || (this.exploreData || []).find(a => Number(a.mal_id) === Number(malId));
      const anime = {
        malId: data.mal_id, title: data.title,
        titleJapanese: data.title_japanese || '', titleEnglish: data.title_english || '',
        titleChinese: searchHit?.title_chinese || data.title_chinese || '',
        image: data.images?.jpg?.image_url || '', synopsis: data.synopsis || '',
        score: data.score, episodes: data.episodes, year: data.year,
        genres: (data.genres || []).map(g => g.name),
        status: 'plan', userRating: 0, userNotes: '', currentEpisode: 0,
        addedAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      };
      await App.db.saveAnime(anime);
      App.toast('已添加到收藏！', 'success');
      App.router.refresh();
    } catch (e) { App.toast('添加失败: ' + e.message, 'error'); }
  },

  bindEvents() {
    const input = document.getElementById('anime-search');
    if (input) {
      const doSearch = App.utils.debounce(async (q) => {
        this.query = q;
        if (q.length < 2) {
          this.searchResults = null;
          this.searchPagination = null;
          this.searchEffectiveQuery = '';
          this.searchPage = 1;
          App.router.refresh();
          return;
        }
        try {
          this.searchPage = 1;
          this.searchLoading = true;
          const res = await App.api.search(q, this.searchPage);
          this.searchResults = res.data || [];
          this.searchPagination = res.pagination || null;
          this.searchEffectiveQuery = res.effectiveQuery || q;
          this.searchLoading = false;
          App.router.refresh();
        } catch (e) {
          this.searchLoading = false;
          App.toast('搜索失败', 'error');
        }
      }, 500);
      input.addEventListener('input', e => doSearch(e.target.value));
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    document.querySelectorAll('.filter-tab[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.filter = btn.dataset.filter;
        this.searchResults = null;
        this.searchPagination = null;
        this.searchEffectiveQuery = '';
        this.query = '';
        this.searchPage = 1;
        App.router.refresh();
      });
    });
    document.getElementById('btn-load-more-search')?.addEventListener('click', () => this.loadMoreSearch());
    // Sort
    document.getElementById('anime-sort')?.addEventListener('change', e => {
      this.sort = e.target.value;
      App.router.refresh();
    });
    // Select mode
    document.getElementById('btn-select-mode')?.addEventListener('click', () => {
      this.selectMode = !this.selectMode;
      if (!this.selectMode) this.selected.clear();
      App.router.refresh();
    });
    // Explore tabs
    document.querySelectorAll('[data-explore]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const tab = btn.dataset.explore || null;
        if (tab === this.exploreTab) return;
        this.exploreTab = tab;
        this.exploreData = null;
        if (tab === 'top') {
          try { this.exploreData = (await App.api.getTopAnime()).data; } catch { App.toast('加载失败', 'error'); }
        } else if (tab === 'season') {
          try { this.exploreData = (await App.api.getSeasonNow()).data; } catch { App.toast('加载失败', 'error'); }
        }
        App.router.refresh();
      });
    });
  },

  async loadMoreSearch() {
    if (!this.query || this.searchLoading) return;
    try {
      this.searchLoading = true;
      const nextPage = this.searchPage + 1;
      const res = await App.api.search(this.query, nextPage);
      const existing = new Set((this.searchResults || []).map(a => a.mal_id));
      const next = (res.data || []).filter(a => !existing.has(a.mal_id));
      this.searchResults = [...(this.searchResults || []), ...next];
      this.searchPagination = res.pagination || null;
      this.searchEffectiveQuery = res.effectiveQuery || this.searchEffectiveQuery;
      this.searchPage = nextPage;
      this.searchLoading = false;
      App.router.refresh();
    } catch (e) {
      this.searchLoading = false;
      App.toast('加载更多失败', 'error');
    }
  }
};
