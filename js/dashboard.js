// ===== Dashboard Page =====
App.dashboard = {
  _randomPick: null,

  async render() {
    const anime = await App.db.getAllAnime();
    const merch = await App.db.getAllMerch();
    const completed = anime.filter(a => a.status === 'completed').length;
    const watching = anime.filter(a => a.status === 'watching');
    const planList = anime.filter(a => a.status === 'plan');
    const totalSpent = merch.reduce((s, m) => s + (Number(m.price) || 0), 0);
    const recentAnime = [...anime].sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || '')).slice(0, 6);
    const recentMerch = [...merch].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 6);

    // Watch time estimation (episodes * avg 24 min)
    const totalEpWatched = anime.reduce((s, a) => s + (a.currentEpisode || 0), 0);
    const totalMinutes = totalEpWatched * 24;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const watchTimeText = totalEpWatched ? `共看了 ${totalEpWatched} 集 ≈ ${hours}小时${mins}分钟` : '';

    // Genre counts for bar chart
    const genreCounts = {};
    anime.forEach(a => (a.genres || []).forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
    const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxGenreCount = topGenres.length ? topGenres[0][1] : 1;
    const esc = App.utils.escapeHtml;

    // Random pick
    const rp = this._randomPick;

    return `
    <div class="page-header"><h1>仪表盘</h1><p class="subtitle">你的动漫世界，尽在掌握${watchTimeText ? ` · ${watchTimeText}` : ''}</p></div>
    <div class="stats-grid">
      <div class="stat-card stat-purple"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></div><div class="stat-info"><span class="stat-num">${anime.length}</span><span class="stat-label">收藏动漫</span></div></div>
      <div class="stat-card stat-green"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${watching.length}</span><span class="stat-label">在看</span></div></div>
      <div class="stat-card stat-cyan"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${completed}</span><span class="stat-label">已看完</span></div></div>
      <div class="stat-card stat-pink"><div class="stat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><div class="stat-info"><span class="stat-num">${App.utils.formatCurrency(totalSpent)}</span><span class="stat-label">周边花费 (${merch.length}件)</span></div></div>
    </div>
    ${planList.length ? `<div class="random-picker">
      <div class="random-picker-text">
        <h3>🎲 今天看什么？</h3>
        <p>你有 ${planList.length} 部想看的动漫${rp ? `，推荐：${esc(rp.titleChinese || rp.title)}` : ''}</p>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-random-pick">随机推荐</button>
    </div>
    ${rp ? `<div class="random-result" onclick="App.router.go('/anime/${rp.malId}')">
      <img src="${esc(rp.image)}" alt="${esc(rp.title)}" loading="lazy"/>
      <div class="random-result-info">
        <h4>${esc(rp.titleChinese || rp.title)}</h4>
        <p>${rp.episodes ? rp.episodes + '集' : ''} ${rp.score ? '· ★ ' + rp.score : ''} ${rp.year ? '· ' + rp.year : ''}</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();App.dashboard.startWatching(${rp.malId})">开始看</button>
    </div>` : ''}` : ''}
    ${watching.length ? `<section class="section"><h2 class="section-title">正在追番</h2>
      <div class="watching-list">${watching.map(a => {
        const ep = a.currentEpisode || 0;
        const total = a.episodes || 0;
        const pct = total ? Math.min(100, Math.round(ep / total * 100)) : 0;
        return `<div class="watching-card" onclick="App.router.go('/anime/${a.malId}')">
          <img class="watching-card-img" src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"/>
          <div class="watching-card-info">
            <div class="watching-card-title">${esc(a.titleChinese || a.title)}</div>
            <div class="watching-card-progress">
              <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
              <span class="progress-text">${ep}/${total || '?'}</span>
            </div>
          </div>
          <button class="btn-ep-plus" onclick="event.stopPropagation();App.dashboard.epPlus(${a.malId})" title="+1集">+1</button>
        </div>`;
      }).join('')}</div>
    </section>` : ''}
    ${topGenres.length ? `<section class="section"><h2 class="section-title">题材偏好</h2>
      <div class="genre-bar-chart">${topGenres.map(([g, c]) => `
        <div class="genre-bar-row">
          <span class="genre-bar-label">${esc(g)}</span>
          <div class="genre-bar-track"><div class="genre-bar-fill" style="width:${Math.round(c/maxGenreCount*100)}%"></div></div>
          <span class="genre-bar-count">${c}</span>
        </div>`).join('')}
      </div>
    </section>` : ''}
    ${recentAnime.length ? `<section class="section"><h2 class="section-title">最近添加的动漫</h2><div class="anime-grid">${recentAnime.map(a => App.dashboard.animeCard(a)).join('')}</div></section>` : ''}
    ${recentMerch.length ? `<section class="section"><h2 class="section-title">最近添加的周边</h2><div class="merch-grid">${recentMerch.map(m => App.merch.merchCard(m)).join('')}</div></section>` : ''}
    ${!anime.length && !merch.length ? `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg></div><h3>还没有收藏</h3><p>前往 <a href="#/anime" class="link">动漫库</a> 搜索并添加你喜欢的动漫吧！</p></div>` : ''}`;
  },

  bindEvents() {
    document.getElementById('btn-random-pick')?.addEventListener('click', async () => {
      const anime = await App.db.getAllAnime();
      const plan = anime.filter(a => a.status === 'plan');
      if (!plan.length) { App.toast('没有想看的动漫了！', 'info'); return; }
      this._randomPick = plan[Math.floor(Math.random() * plan.length)];
      App.router.refresh();
    });
  },

  async startWatching(malId) {
    const anime = await App.db.getAnime(malId);
    if (!anime) return;
    anime.status = 'watching';
    anime.watchStart = new Date().toISOString().slice(0, 10);
    anime.updatedAt = new Date().toISOString();
    await App.db.saveAnime(anime);
    this._randomPick = null;
    App.toast(`开始追 ${anime.titleChinese || anime.title}！`, 'success');
    App.router.refresh();
  },

  async epPlus(malId) {
    const anime = await App.db.getAnime(malId);
    if (!anime) return;
    anime.currentEpisode = (anime.currentEpisode || 0) + 1;
    anime.updatedAt = new Date().toISOString();
    if (anime.episodes && anime.currentEpisode >= anime.episodes && anime.status === 'watching') {
      anime.status = 'completed';
      anime.watchEnd = new Date().toISOString().slice(0, 10);
      App.toast(`${anime.titleChinese || anime.title} 看完啦！已自动标记为已看`, 'success');
    }
    await App.db.saveAnime(anime);
    App.router.refresh();
  },

  animeCard(a) {
    const esc = App.utils.escapeHtml;
    const statusMap = { plan: '想看', watching: '在看', completed: '已看', dropped: '弃番' };
    const ep = a.currentEpisode || 0;
    const total = a.episodes || 0;
    const pct = total ? Math.min(100, Math.round(ep / total * 100)) : 0;
    const showMiniProgress = a.status === 'watching' && total > 0;
    return `<div class="anime-card" onclick="App.router.go('/anime/${a.malId}')">
      <div class="anime-card-img"><img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"/><span class="status-badge status-${a.status}">${statusMap[a.status] || '未分类'}</span></div>
      <div class="anime-card-body"><h3 class="anime-card-title">${esc(a.title)}</h3>
      ${a.titleChinese ? `<p class="anime-card-title-cn">${esc(a.titleChinese)}</p>` : ''}
      ${a.titleJapanese ? `<p class="anime-card-title-jp">${esc(a.titleJapanese)}</p>` : ''}
      ${a.titleEnglish ? `<p class="anime-card-title-en">${esc(a.titleEnglish)}</p>` : ''}
      ${a.userRating ? `<div class="anime-card-rating"><span class="star">★</span> ${a.userRating}/10</div>` : ''}
      ${showMiniProgress ? `<div class="card-progress-mini"><div class="progress-bar-container"><div class="progress-bar-fill" style="width:${pct}%"></div></div><span class="progress-text">${ep}/${total}</span></div>` : ''}
      </div></div>`;
  }
};
