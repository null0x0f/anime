// ===== AnimeVault Database → Backend API =====
App.db = {
  token: localStorage.getItem('av_token'),

  async _fetch(url, opts = {}) {
    const headers = { ...opts.headers };
    if (this.token) headers['Authorization'] = 'Bearer ' + this.token;
    if (opts.body && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401) { this.logout(); throw new Error('未登录'); }
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || '请求失败'); }
    return res.json();
  },

  setToken(t) { this.token = t; t ? localStorage.setItem('av_token', t) : localStorage.removeItem('av_token'); },
  logout() { this.token = null; localStorage.removeItem('av_token'); localStorage.removeItem('av_user'); location.hash = '/login'; },
  isLoggedIn() { return !!this.token; },
  async init() {},
  async getMe() { return this._fetch('/api/auth/me'); },
  async generateInviteCode() { return this._fetch('/api/admin/invite-code', { method: 'POST' }); },
  async changePassword(currentPassword, newPassword) {
    return this._fetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  },

  // Anime
  async getAllAnime() { return this._fetch('/api/anime'); },
  async getAnime(malId) { return this._fetch('/api/anime/' + malId); },
  async saveAnime(data) { return this._fetch('/api/anime/' + data.malId, { method: 'PUT', body: JSON.stringify(data) }); },
  async deleteAnime(malId) { return this._fetch('/api/anime/' + malId, { method: 'DELETE' }); },

  // Merch
  async getAllMerch() { return this._fetch('/api/merch'); },
  async getMerchByAnime(animeId) { return this._fetch('/api/merch/anime/' + animeId); },
  async saveMerch(data) {
    const form = new FormData();
    // Append files
    if (data.photoFiles) {
      for (const f of data.photoFiles) form.append('photos', f);
    } else if (data.photoFile) {
      form.append('photos', data.photoFile);
    }
    ['animeId','animeName','name','category','price','purchaseDate','notes','currentValue','isWishlist','targetPrice','tags'].forEach(k => {
      if (data[k] !== undefined && data[k] !== null) form.append(k, data[k]);
    });
    return this._fetch('/api/merch', { method: 'POST', body: form });
  },
  async addMerchPhotos(merchId, files) {
    const form = new FormData();
    for (const f of files) form.append('photos', f);
    return this._fetch('/api/merch/' + merchId + '/photos', { method: 'POST', body: form });
  },
  async deleteMerch(id) { return this._fetch('/api/merch/' + id, { method: 'DELETE' }); },
  async deleteMerchPhoto(photoId) { return this._fetch('/api/merch-photo/' + photoId, { method: 'DELETE' }); },

  // Tags
  async getAllTags() { return this._fetch('/api/tags'); },
  async createTag(name, color) { return this._fetch('/api/tags', { method: 'POST', body: JSON.stringify({ name, color }) }); },
  async deleteTag(id) { return this._fetch('/api/tags/' + id, { method: 'DELETE' }); },

  // Export / Import / Clear
  async exportAll() { const d = await this._fetch('/api/export'); return JSON.stringify(d); },
  async importAll(json) { return this._fetch('/api/import', { method: 'POST', body: json, headers: { 'Content-Type': 'application/json' } }); },
  async clearAll() { return this._fetch('/api/clear', { method: 'DELETE' }); }
};
