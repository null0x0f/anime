// ===== Jikan API v4 =====
App.api = {
  base: 'https://api.jikan.moe/v4',
  _lastCall: 0,
  chineseAliases: [
    { titleChinese: '航海王', query: 'One Piece', aliases: ['海贼王', '航海王'], malIds: [21] },
    { titleChinese: '火影忍者', query: 'Naruto', aliases: ['火影', '火影忍者'], malIds: [20] },
    { titleChinese: '火影忍者疾风传', query: 'Naruto Shippuden', aliases: ['疾风传', '火影疾风传', '火影忍者疾风传'], malIds: [1735] },
    { titleChinese: '死神', query: 'Bleach', aliases: ['死神', '境界'], malIds: [269] },
    { titleChinese: '龙珠', query: 'Dragon Ball', aliases: ['龙珠', '七龙珠'], malIds: [223] },
    { titleChinese: '龙珠Z', query: 'Dragon Ball Z', aliases: ['龙珠z', '七龙珠z'], malIds: [813] },
    { titleChinese: '银魂', query: 'Gintama', aliases: ['银魂'], malIds: [918] },
    { titleChinese: '全职猎人', query: 'Hunter x Hunter', aliases: ['猎人', '全职猎人'], malIds: [11061, 136] },
    { titleChinese: '咒术回战', query: 'Jujutsu Kaisen', aliases: ['咒术', '咒术回战'], malIds: [40748] },
    { titleChinese: '鬼灭之刃', query: 'Kimetsu no Yaiba', aliases: ['鬼灭', '鬼灭之刃'], malIds: [38000] },
    { titleChinese: '我的英雄学院', query: 'Boku no Hero Academia', aliases: ['我英', '我的英雄学院', '英雄学院'], malIds: [31964] },
    { titleChinese: '黑色五叶草', query: 'Black Clover', aliases: ['黑色五叶草', '黑色四叶草'], malIds: [34572] },
    { titleChinese: '电锯人', query: 'Chainsaw Man', aliases: ['电锯人'], malIds: [44511] },
    { titleChinese: '间谍过家家', query: 'Spy x Family', aliases: ['间谍家家酒', '间谍过家家'], malIds: [50265] },
    { titleChinese: '排球少年', query: 'Haikyuu', aliases: ['排球', '排球少年'], malIds: [20583] },
    { titleChinese: '灌篮高手', query: 'Slam Dunk', aliases: ['灌篮高手', '篮球飞人'], malIds: [170] },
    { titleChinese: '死亡笔记', query: 'Death Note', aliases: ['死亡笔记'], malIds: [1535] },
    { titleChinese: '约定的梦幻岛', query: 'Yakusoku no Neverland', aliases: ['约定的梦幻岛'], malIds: [37779] },
    { titleChinese: '石纪元', query: 'Dr. Stone', aliases: ['石纪元', '新石纪'], malIds: [38691] },
    { titleChinese: '食戟之灵', query: 'Shokugeki no Souma', aliases: ['食戟', '食戟之灵'], malIds: [28171] },
    { titleChinese: '网球王子', query: 'Prince of Tennis', aliases: ['网球王子'], malIds: [22] },
    { titleChinese: '家庭教师', query: 'Katekyo Hitman Reborn', aliases: ['家教', '家庭教师'], malIds: [1604] },
    { titleChinese: '灵能百分百', query: 'Mob Psycho 100', aliases: ['灵能', '灵能百分百'], malIds: [32182] },
    { titleChinese: '进击的巨人', query: 'Shingeki no Kyojin', aliases: ['巨人', '进击的巨人'], malIds: [16498] },
    { titleChinese: '钢之炼金术师', query: 'Fullmetal Alchemist', aliases: ['钢炼', '钢之炼金术师'], malIds: [5114, 121] },
    { titleChinese: '名侦探柯南', query: 'Detective Conan', aliases: ['柯南', '名侦探柯南'], malIds: [235] },
    { titleChinese: '新世纪福音战士', query: 'Neon Genesis Evangelion', aliases: ['eva', '福音战士', '新世纪福音战士'], malIds: [30] },
    { titleChinese: '你的名字', query: 'Kimi no Na wa', aliases: ['你的名字'], malIds: [32281] },
    { titleChinese: '葬送的芙莉莲', query: 'Sousou no Frieren', aliases: ['芙莉莲', '葬送的芙莉莲'], malIds: [52991] }
  ],

  async _fetch(url) {
    // Rate limit: min 350ms between calls
    const now = Date.now(), wait = 350 - (now - this._lastCall);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    this._lastCall = Date.now();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  _normalize(text) {
    return String(text || '').trim().toLowerCase().replace(/\s+/g, '');
  },

  _hasChinese(text) {
    return /[\u3400-\u9fff]/.test(text);
  },

  findChineseMatches(query) {
    const q = this._normalize(query);
    if (!q) return [];
    return this.chineseAliases.filter(item =>
      item.aliases.some(alias => {
        const a = this._normalize(alias);
        return a.includes(q) || q.includes(a);
      })
    );
  },

  getChineseTitle(anime, fallbackMatches = []) {
    if (anime.title_chinese || anime.matched_chinese_title) return anime.title_chinese || anime.matched_chinese_title;
    const id = Number(anime.mal_id);
    const exact = this.chineseAliases.find(item => (item.malIds || []).includes(id));
    if (exact) return exact.titleChinese;
    const titleText = [
      anime.title,
      anime.title_english,
      anime.title_japanese,
      ...(anime.title_synonyms || []),
      ...((anime.titles || []).map(t => t.title))
    ].map(v => String(v || '').toLowerCase()).join(' ');
    const byTitle = this.chineseAliases.find(item => titleText.includes(item.query.toLowerCase()));
    if (byTitle) return byTitle.titleChinese;
    return fallbackMatches[0]?.titleChinese || '';
  },

  _withChineseTitles(items, fallbackMatches = []) {
    return (items || []).map(item => ({
      ...item,
      title_chinese: this.getChineseTitle(item, fallbackMatches)
    }));
  },

  async search(query, page = 1) {
    if (!query || query.trim().length < 2) return { data: [], pagination: {} };
    const trimmed = query.trim();
    const matches = this.findChineseMatches(trimmed);
    const primaryQuery = matches[0]?.query || trimmed;
    const queries = page === 1 && matches.length && this._hasChinese(trimmed)
      ? [trimmed, ...matches.map(m => m.query)]
      : [primaryQuery];
    const uniqueQueries = [...new Set(queries)];
    const all = [];
    let primaryPagination = {};

    for (const qText of uniqueQueries) {
      const q = encodeURIComponent(qText);
      const res = await this._fetch(`${this.base}/anime?q=${q}&page=${page}&limit=24&sfw=true`);
      if (qText === primaryQuery || !primaryPagination.current_page) primaryPagination = res.pagination || {};
      all.push(...this._withChineseTitles(res.data || [], matches));
    }

    const seen = new Set();
    const data = all.filter(item => {
      if (seen.has(item.mal_id)) return false;
      seen.add(item.mal_id);
      return true;
    });
    return { data, pagination: primaryPagination, effectiveQuery: primaryQuery };
  },

  async getById(id) {
    const res = await this._fetch(`${this.base}/anime/${id}`);
    return this._withChineseTitles([res.data || {}])[0];
  },

  async getTopAnime(page = 1) {
    const res = await this._fetch(`${this.base}/top/anime?page=${page}&limit=24`);
    return { ...res, data: this._withChineseTitles(res.data || []) };
  }
};
