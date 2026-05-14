// ===== Anime List Page =====
App.animeList = {
  query: '',
  filter: 'all',
  searchResults: null,
  searchPage: 1,
  searchPagination: null,
  searchEffectiveQuery: '',
  searchLoading: false,

  async render() {
    const anime = await App.db.getAllAnime();
    let filtered = anime;
    if (this.filter !== 'all') filtered = anime.filter(a => a.status === this.filter);
    filtered.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
    const savedIds = new Set(anime.map(a => a.malId));

    return `
    <div class="page-header"><h1>动漫库</h1><p class="subtitle">搜索、收藏、追踪你的动漫</p></div>
    <div class="search-section">
      <div class="search-box"><svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="anime-search" class="search-input" placeholder="搜索动漫名称..." value="${App.utils.escapeHtml(this.query)}" autocomplete="off"/></div>
      <div class="filter-tabs">
        ${['all','plan','watching','completed','dropped'].map(f => {
          const labels = { all:'全部', plan:'想看', watching:'在看', completed:'已看', dropped:'弃番' };
          return `<button class="filter-tab ${this.filter===f?'active':''}" data-filter="${f}">${labels[f]}</button>`;
        }).join('')}
      </div>
    </div>
    <div id="search-results" class="${this.searchResults ? '' : 'hidden'}">
      ${this.searchResults ? `<div class="section-header"><h2 class="section-title">搜索结果 <span class="count">(${this.searchResults.length})</span></h2>${this.searchEffectiveQuery && this.searchEffectiveQuery !== this.query ? `<span class="search-alias-note">已按 ${App.utils.escapeHtml(this.searchEffectiveQuery)} 搜索</span>` : ''}</div>
      <div class="anime-grid">${this.searchResults.map(a => this.searchCard(a, savedIds.has(a.mal_id))).join('')}</div>
      ${this.searchPagination?.has_next_page ? `<div class="load-more-row"><button class="btn btn-ghost" id="btn-load-more-search" ${this.searchLoading ? 'disabled' : ''}>${this.searchLoading ? '加载中...' : '加载更多'}</button></div>` : ''}` : ''}
    </div>
    <div id="my-anime-list">
      <h2 class="section-title">我的收藏 <span class="count">(${filtered.length})</span></h2>
      ${filtered.length ? `<div class="anime-grid">${filtered.map(a => App.dashboard.animeCard(a)).join('')}</div>` : `<div class="empty-state"><p>还没有${this.filter === 'all' ? '' : '该分类的'}收藏</p></div>`}
    </div>`;
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

  async addAnime(malId) {
    try {
      const data = await App.api.getById(malId);
      const searchHit = (this.searchResults || []).find(a => Number(a.mal_id) === Number(malId));
      const anime = {
        malId: data.mal_id, title: data.title,
        titleJapanese: data.title_japanese || '', titleEnglish: data.title_english || '',
        titleChinese: searchHit?.title_chinese || data.title_chinese || '',
        image: data.images?.jpg?.image_url || '', synopsis: data.synopsis || '',
        score: data.score, episodes: data.episodes, year: data.year,
        genres: (data.genres || []).map(g => g.name),
        status: 'plan', userRating: 0, userNotes: '',
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
      // Keep focus after re-render
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
    document.querySelectorAll('.filter-tab').forEach(btn => {
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
