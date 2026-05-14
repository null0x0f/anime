// ===== Dashboard Page =====
App.dashboard = {
  async render() {
    const anime = await App.db.getAllAnime();
    const merch = await App.db.getAllMerch();
    const completed = anime.filter(a => a.status === 'completed').length;
    const watching = anime.filter(a => a.status === 'watching').length;
    const totalSpent = merch.reduce((s, m) => s + (Number(m.price) || 0), 0);
    const recentAnime = [...anime].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '')).slice(0, 6);
    const recentMerch = [...merch].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);

    return `
    <div class="page-header"><h1>仪表盘</h1><p class="subtitle">你的动漫世界，尽在掌握</p></div>
    <div class="stats-grid">
      <div class="stat-card stat-purple"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div><div class="stat-info"><span class="stat-num">${anime.length}</span><span class="stat-label">收藏动漫</span></div></div>
      <div class="stat-card stat-green"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${watching}</span><span class="stat-label">在看</span></div></div>
      <div class="stat-card stat-cyan"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${completed}</span><span class="stat-label">已看完</span></div></div>
      <div class="stat-card stat-pink"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalSpent)}</span><span class="stat-label">周边花费 (${merch.length}件)</span></div></div>
    </div>
    ${recentAnime.length ? `<section class="section"><h2 class="section-title">最近添加的动漫</h2><div class="anime-grid">${recentAnime.map(a => App.dashboard.animeCard(a)).join('')}</div></section>` : ''}
    ${recentMerch.length ? `<section class="section"><h2 class="section-title">最近添加的周边</h2><div class="merch-grid">${recentMerch.map(m => App.merch.merchCard(m)).join('')}</div></section>` : ''}
    ${!anime.length && !merch.length ? `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div><h3>还没有收藏</h3><p>前往 <a href="#/anime" class="link">动漫库</a> 搜索并添加你喜欢的动漫吧！</p></div>` : ''}`;
  },
  animeCard(a) {
    const esc = App.utils.escapeHtml;
    const statusMap = { plan: '想看', watching: '在看', completed: '已看', dropped: '弃番' };
    return `<div class="anime-card" onclick="App.router.go('/anime/${a.malId}')">
      <div class="anime-card-img"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"/><span class="status-badge status-${a.status}">${statusMap[a.status] || '未分类'}</span></div>
      <div class="anime-card-body"><h3 class="anime-card-title">${esc(a.title)}</h3>
      ${a.titleChinese ? `<p class="anime-card-title-cn">${esc(a.titleChinese)}</p>` : ''}
      ${a.titleJapanese ? `<p class="anime-card-title-jp">${esc(a.titleJapanese)}</p>` : ''}
      ${a.titleEnglish ? `<p class="anime-card-title-en">${esc(a.titleEnglish)}</p>` : ''}
      ${a.userRating ? `<div class="anime-card-rating"><span class="star">★</span> ${a.userRating}/10</div>` : ''}
      </div></div>`;
  }
};
