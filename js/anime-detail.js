// ===== Anime Detail Page =====
App.animeDetail = {
  async render(malId) {
    const id = Number(malId);
    let anime = await App.db.getAnime(id);
    if (!anime) {
      try {
        const data = await App.api.getById(id);
        anime = { malId: data.mal_id, title: data.title,
          titleJapanese: data.title_japanese || '', titleEnglish: data.title_english || '',
          titleChinese: data.title_chinese || '',
          image: data.images?.jpg?.image_url || '', synopsis: data.synopsis || '',
          score: data.score, episodes: data.episodes, year: data.year,
          genres: (data.genres || []).map(g => g.name), status: null, userRating: 0, userNotes: '',
          tags: [], watchStart: null, watchEnd: null, airingDay: null, currentEpisode: 0, _notSaved: true };
      } catch (e) { return '<div class="empty-state"><h3>找不到该动漫</h3><a href="#/" class="link">返回首页</a></div>'; }
    }
    const merchList = anime._notSaved ? [] : await App.db.getMerchByAnime(id);
    const allTags = anime._notSaved ? [] : await App.db.getAllTags();
    const esc = App.utils.escapeHtml;
    const statusMap = { plan:'想看', watching:'在看', completed:'已看', dropped:'弃番' };
    const dayMap = { monday:'周一', tuesday:'周二', wednesday:'周三', thursday:'周四', friday:'周五', saturday:'周六', sunday:'周日' };
    const animeTags = (anime.tags || []).map(tid => allTags.find(t => t.id === tid)).filter(Boolean);
    const ep = anime.currentEpisode || 0;
    const total = anime.episodes || 0;
    const epPct = total ? Math.min(100, Math.round(ep / total * 100)) : 0;

    return `
    <div class="detail-page">
      <a href="#/anime" class="back-link"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M15 19l-7-7 7-7"/></svg> 返回动漫库</a>
      <div class="detail-header">
        <div class="detail-poster"><img src="${esc(anime.image)}" alt="${esc(anime.title)}"/></div>
        <div class="detail-info">
          <h1>${esc(anime.title)}</h1>
          <div class="detail-titles">
            ${anime.titleChinese ? `<p class="detail-cn">${esc(anime.titleChinese)}</p>` : ''}
            ${!anime._notSaved ? `<div class="cn-title-editor">
              <input type="text" id="cn-title-input" class="input" placeholder="自定义中文标题..." value="${esc(anime.titleChinese || '')}" />
              <button class="btn btn-ghost btn-sm" onclick="App.animeDetail.saveCnTitle(${id})">保存</button>
            </div>` : ''}
            ${anime.titleJapanese ? `<p class="detail-jp">${esc(anime.titleJapanese)}</p>` : ''}
            ${anime.titleEnglish ? `<p class="detail-en">${esc(anime.titleEnglish)}</p>` : ''}
          </div>
          <div class="detail-meta">
            ${anime.score ? `<span class="meta-tag"><span class="star">★</span> ${anime.score}</span>` : ''}
            ${anime.episodes ? `<span class="meta-tag">${anime.episodes} 集</span>` : ''}
            ${anime.year ? `<span class="meta-tag">${anime.year}</span>` : ''}
            ${anime.airingDay ? `<span class="meta-tag airing-tag">${dayMap[anime.airingDay]||anime.airingDay}更新</span>` : ''}
            ${(anime.genres||[]).map(g => `<span class="meta-tag genre-tag">${esc(g)}</span>`).join('')}
          </div>
          ${animeTags.length ? `<div class="tag-list">${animeTags.map(t => `<span class="tag" style="--tag-color:${t.color}">${esc(t.name)}</span>`).join('')}</div>` : ''}
          ${anime._notSaved ? `<button class="btn btn-primary" onclick="App.animeDetail.saveNew(${id})">添加到收藏</button>` : `
          <div class="detail-controls">
            <div class="control-group"><label>观看状态</label>
              <div class="status-selector">${Object.entries(statusMap).map(([k,v]) =>
                `<button class="status-btn ${anime.status===k?'active status-'+k:''}" data-status="${k}">${v}</button>`
              ).join('')}</div></div>
            <div class="control-group"><label>观看进度</label>
              <div class="episode-stepper">
                <button class="btn btn-ghost btn-sm" onclick="App.animeDetail.epChange(${id},-1)">−</button>
                <span class="ep-display">${ep} / ${total || '?'}</span>
                <button class="btn btn-primary btn-sm" onclick="App.animeDetail.epChange(${id},1)">+</button>
              </div>
              ${total ? `<div class="progress-bar-container" style="margin-top:6px"><div class="progress-bar-fill" style="width:${epPct}%"></div></div>` : ''}
            </div>
            <div class="control-group"><label>我的评分</label>
              <div class="rating-selector" id="rating-selector">${[...Array(10)].map((_,i) =>
                `<span class="rating-star ${i < (anime.userRating||0) ? 'filled' : ''}" data-val="${i+1}">★</span>`
              ).join('')}</div></div>
            <div class="control-row">
              <div class="control-group"><label>开始观看</label><input type="date" id="watch-start" class="input input-sm" value="${anime.watchStart||''}"/></div>
              <div class="control-group"><label>看完日期</label><input type="date" id="watch-end" class="input input-sm" value="${anime.watchEnd||''}"/></div>
              <div class="control-group"><label>更新日</label><select id="airing-day" class="input input-sm">
                <option value="">—</option>${Object.entries(dayMap).map(([k,v]) => `<option value="${k}" ${anime.airingDay===k?'selected':''}>${v}</option>`).join('')}
              </select></div>
            </div>
            <div class="control-group"><label>标签</label>
              <div class="tag-selector" id="tag-selector">
                ${allTags.map(t => `<button class="tag-btn ${(anime.tags||[]).includes(t.id)?'active':''}" data-tag="${t.id}" style="--tag-color:${t.color}">${esc(t.name)}</button>`).join('')}
                <button class="tag-btn tag-add" onclick="App.animeDetail.showTagModal()">+ 新标签</button>
              </div></div>
            <div class="control-group"><label>备注</label>
              <textarea id="anime-notes" class="input" rows="2" placeholder="写点什么...">${esc(anime.userNotes||'')}</textarea></div>
            <div class="detail-actions">
              <button class="btn btn-danger btn-sm" onclick="App.animeDetail.removeAnime(${id})">删除收藏</button>
            </div>
          </div>`}
          <p class="detail-synopsis">${esc(anime.synopsis)}</p>
        </div>
      </div>
      ${!anime._notSaved ? `
      <section class="section">
        <div class="section-header"><h2 class="section-title">周边收藏 <span class="count">(${merchList.filter(m=>!m.isWishlist).length})</span></h2>
          <div class="section-actions">
            <button class="btn btn-primary btn-sm" onclick="App.animeDetail.showMerchModal(${id}, '${esc(anime.title)}', false)">+ 添加周边</button>
            <button class="btn btn-ghost btn-sm" onclick="App.animeDetail.showMerchModal(${id}, '${esc(anime.title)}', true)">加入愿望</button>
          </div></div>
        ${merchList.filter(m=>!m.isWishlist).length ? `<div class="merch-grid">${merchList.filter(m=>!m.isWishlist).map(m => App.merch.merchCard(m)).join('')}</div>` : '<div class="empty-state small"><p>还没有这部动漫的周边</p></div>'}
        ${merchList.filter(m=>m.isWishlist).length ? `<h3 class="sub-section-title">愿望清单</h3><div class="merch-grid">${merchList.filter(m=>m.isWishlist).map(m => App.merch.merchCard(m)).join('')}</div>` : ''}
      </section>` : ''}
      <section class="section" id="recommendations-section"></section>
    </div>
    <div id="merch-modal" class="modal hidden"></div>
    <div id="tag-modal" class="modal hidden"></div>`;
  },

  async epChange(malId, delta) {
    const anime = await App.db.getAnime(malId);
    if (!anime) return;
    const newEp = Math.max(0, (anime.currentEpisode || 0) + delta);
    anime.currentEpisode = anime.episodes ? Math.min(newEp, anime.episodes) : newEp;
    anime.updatedAt = new Date().toISOString();
    if (anime.episodes && anime.currentEpisode >= anime.episodes && anime.status === 'watching') {
      anime.status = 'completed';
      anime.watchEnd = new Date().toISOString().slice(0, 10);
      App.toast('看完啦！已自动标记为已看', 'success');
    }
    await App.db.saveAnime(anime);
    App.router.refresh();
  },

  async saveNew(malId) {
    try {
      const data = await App.api.getById(malId);
      const anime = { malId: data.mal_id, title: data.title,
        titleJapanese: data.title_japanese || '', titleEnglish: data.title_english || '',
        titleChinese: data.title_chinese || '',
        image: data.images?.jpg?.image_url || '', synopsis: data.synopsis || '',
        score: data.score, episodes: data.episodes, year: data.year,
        genres: (data.genres || []).map(g => g.name), status: 'plan', userRating: 0, userNotes: '',
        tags: [], watchStart: null, watchEnd: null, airingDay: null, currentEpisode: 0,
        addedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await App.db.saveAnime(anime);
      App.toast('已添加到收藏！', 'success');
      App.router.refresh();
    } catch (e) { App.toast('添加失败', 'error'); }
  },

  async saveCnTitle(malId) {
    const input = document.getElementById('cn-title-input');
    if (!input) return;
    const anime = await App.db.getAnime(malId);
    if (!anime) return;
    anime.titleChinese = input.value.trim();
    anime.updatedAt = new Date().toISOString();
    await App.db.saveAnime(anime);
    App.toast('中文标题已更新', 'success');
    App.router.refresh();
  },

  async removeAnime(malId) {
    if (!confirm('确定删除？关联的周边也会被删除。')) return;
    await App.db.deleteAnime(malId);
    App.toast('已删除', 'success');
    App.router.go('/anime');
  },

  showTagModal() {
    const modal = document.getElementById('tag-modal');
    const colors = ['#7b42bc','#14c6cb','#1868f2','#ffcf25','#bb5a00','#731e25','#a737ff','#12805c'];
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-overlay" onclick="this.parentElement.classList.add('hidden')"></div>
      <div class="modal-content">
        <h2>新建标签</h2>
        <div class="form-group"><label>名称</label><input type="text" id="tag-name-input" class="input" placeholder="标签名称" autofocus/></div>
        <div class="form-group"><label>颜色</label>
          <div class="color-picker-row">${colors.map((c, i) => `<div class="color-dot ${i===0?'active':''}" style="background:${c}" data-color="${c}" onclick="document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active'));this.classList.add('active')"></div>`).join('')}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('tag-modal').classList.add('hidden')">取消</button>
          <button class="btn btn-primary" onclick="App.animeDetail.createTag()">创建</button>
        </div>
      </div>`;
  },

  async createTag() {
    const name = document.getElementById('tag-name-input')?.value?.trim();
    if (!name) { App.toast('请输入名称', 'error'); return; }
    const color = document.querySelector('.color-dot.active')?.dataset.color || '#7b42bc';
    await App.db.createTag(name, color);
    document.getElementById('tag-modal').classList.add('hidden');
    App.router.refresh();
  },

  showMerchModal(animeId, animeName, isWishlist = false) {
    const modal = document.getElementById('merch-modal');
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-overlay" onclick="this.parentElement.classList.add('hidden')"></div>
      <div class="modal-content"><h2>${isWishlist ? '添加到愿望清单' : '添加周边'}</h2>
        <form id="merch-form">
          <div class="form-group"><label>名称</label><input type="text" id="m-name" class="input" required placeholder="例: 初音未来 手办"/></div>
          <div class="form-group"><label>分类</label><select id="m-cat" class="input"><option value="手办">手办</option><option value="挂件">挂件</option><option value="服装">服装</option><option value="海报">海报</option><option value="光碟">光碟</option><option value="书籍">书籍</option><option value="其他">其他</option></select></div>
          ${isWishlist ? `<div class="form-group"><label>目标价格 (¥)</label><input type="number" id="m-target" class="input" step="0.01" placeholder="0.00"/></div>` : `
          <div class="form-row">
            <div class="form-group"><label>购入价 (¥)</label><input type="number" id="m-price" class="input" step="0.01" placeholder="0.00"/></div>
            <div class="form-group"><label>当前市价 (¥)</label><input type="number" id="m-value" class="input" step="0.01" placeholder="选填"/></div>
          </div>
          <div class="form-group"><label>购买日期</label><input type="date" id="m-date" class="input"/></div>`}
          <div class="form-group"><label>照片 (可多选)</label><input type="file" id="m-photos" class="input" accept="image/*" multiple/><div id="m-photo-preview" class="photo-preview-grid"></div></div>
          <div class="form-group"><label>备注</label><textarea id="m-notes" class="input" rows="2" placeholder="购买渠道、状态等..."></textarea></div>
          <div class="modal-actions"><button type="button" class="btn btn-ghost" onclick="document.getElementById('merch-modal').classList.add('hidden')">取消</button>
            <button type="submit" class="btn btn-primary">保存</button></div>
        </form></div>`;
    document.getElementById('m-photos').addEventListener('change', e => {
      const preview = document.getElementById('m-photo-preview');
      preview.innerHTML = '';
      preview._files = Array.from(e.target.files);
      for (const f of preview._files) {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f);
        preview.appendChild(img);
      }
    });
    document.getElementById('merch-form').addEventListener('submit', async e => {
      e.preventDefault();
      const merch = {
        animeId, animeName, isWishlist: isWishlist ? '1' : '0',
        name: document.getElementById('m-name').value,
        category: document.getElementById('m-cat').value,
        price: isWishlist ? '0' : (document.getElementById('m-price')?.value || '0'),
        currentValue: isWishlist ? '' : (document.getElementById('m-value')?.value || ''),
        targetPrice: isWishlist ? (document.getElementById('m-target')?.value || '') : '',
        purchaseDate: isWishlist ? '' : (document.getElementById('m-date')?.value || ''),
        photoFiles: document.getElementById('m-photo-preview')._files || [],
        notes: document.getElementById('m-notes').value,
      };
      await App.db.saveMerch(merch);
      modal.classList.add('hidden');
      App.toast(isWishlist ? '已加入愿望清单！' : '周边已添加！', 'success');
      App.router.refresh();
    });
  },

  bindEvents() {
    // Status buttons
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const malId = Number(location.hash.split('/').pop());
        const anime = await App.db.getAnime(malId);
        if (!anime) return;
        anime.status = btn.dataset.status;
        anime.updatedAt = new Date().toISOString();
        await App.db.saveAnime(anime);
        App.router.refresh();
      });
    });
    // Rating
    document.querySelectorAll('.rating-star').forEach(star => {
      star.addEventListener('click', async () => {
        const malId = Number(location.hash.split('/').pop());
        const anime = await App.db.getAnime(malId);
        if (!anime) return;
        anime.userRating = Number(star.dataset.val);
        anime.updatedAt = new Date().toISOString();
        await App.db.saveAnime(anime);
        App.router.refresh();
      });
    });
    // Tags
    document.querySelectorAll('.tag-btn:not(.tag-add)').forEach(btn => {
      btn.addEventListener('click', async () => {
        const malId = Number(location.hash.split('/').pop());
        const anime = await App.db.getAnime(malId);
        if (!anime) return;
        const tid = btn.dataset.tag;
        const tags = anime.tags || [];
        anime.tags = tags.includes(tid) ? tags.filter(t => t !== tid) : [...tags, tid];
        anime.updatedAt = new Date().toISOString();
        await App.db.saveAnime(anime);
        App.router.refresh();
      });
    });
    // Watch dates + airing day auto-save
    const saveField = App.utils.debounce(async () => {
      const malId = Number(location.hash.split('/').pop());
      const anime = await App.db.getAnime(malId);
      if (!anime) return;
      const ws = document.getElementById('watch-start');
      const we = document.getElementById('watch-end');
      const ad = document.getElementById('airing-day');
      if (ws) anime.watchStart = ws.value || null;
      if (we) anime.watchEnd = we.value || null;
      if (ad) anime.airingDay = ad.value || null;
      anime.updatedAt = new Date().toISOString();
      await App.db.saveAnime(anime);
    }, 600);
    ['watch-start','watch-end','airing-day'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', saveField);
    });
    // Notes
    const notes = document.getElementById('anime-notes');
    if (notes) {
      const save = App.utils.debounce(async () => {
        const malId = Number(location.hash.split('/').pop());
        const anime = await App.db.getAnime(malId);
        if (!anime) return;
        anime.userNotes = notes.value;
        anime.updatedAt = new Date().toISOString();
        await App.db.saveAnime(anime);
      }, 800);
      notes.addEventListener('input', save);
    }
    // Load recommendations async
    this.loadRecommendations();
  },

  async loadRecommendations() {
    const malId = Number(location.hash.split('/').pop());
    const section = document.getElementById('recommendations-section');
    if (!section || !malId) return;
    try {
      const recs = await App.api.getRecommendations(malId);
      if (!recs.length) { section.remove(); return; }
      const esc = App.utils.escapeHtml;
      const savedAnime = await App.db.getAllAnime();
      const savedIds = new Set(savedAnime.map(a => a.malId));
      section.innerHTML = `<h2 class="section-title">相关推荐</h2>
        <div class="anime-grid">${recs.map(r => {
          const img = r.images?.jpg?.image_url || '';
          const saved = savedIds.has(r.mal_id);
          return `<div class="anime-card" onclick="App.router.go('/anime/${r.mal_id}')">
            <div class="anime-card-img"><img src="${esc(img)}" alt="${esc(r.title)}" loading="lazy"/>
              ${saved ? '<span class="status-badge status-completed">已收藏</span>' : `<button class="btn-add-anime" onclick="event.stopPropagation();App.animeList.addAnime(${r.mal_id})" title="添加到收藏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg></button>`}
            </div>
            <div class="anime-card-body"><h3 class="anime-card-title">${esc(r.title)}</h3>
              ${r.title_chinese ? `<p class="anime-card-title-cn">${esc(r.title_chinese)}</p>` : ''}
            </div></div>`;
        }).join('')}</div>`;
    } catch { section.remove(); }
  }
};
