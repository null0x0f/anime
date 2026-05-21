// ===== Calendar Page =====
App.calendar = {
  async render() {
    const anime = await App.db.getAllAnime();
    const watching = anime.filter(a => a.status === 'watching' && a.airingDay);
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const esc = App.utils.escapeHtml;
    const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

    return `
    <div class="page-header"><h1>追番日历</h1><p class="subtitle">本季在追 ${watching.length} 部</p></div>
    ${watching.length ? `<div class="calendar-week">
      ${days.map((day, i) => {
      const shows = watching.filter(a => a.airingDay === day);
      return `<div class="calendar-day ${day === today ? 'today' : ''}">
          <h3 class="day-label ${day === today ? 'today-label' : ''}">${dayLabels[i]} ${day === today ? '<span class="today-badge">今天</span>' : ''}</h3>
          <div class="day-shows">
            ${shows.length ? shows.map(a => {
        const ep = a.currentEpisode || 0;
        const total = a.episodes || 0;
        return `
              <div class="calendar-show" onclick="App.router.go('/anime/${a.malId}')">
                <img src="${esc(a.image)}" alt="${esc(a.title)}" loading="lazy"/>
                <div class="show-info">
                  <span class="show-title">${esc(a.titleChinese || a.title)}</span>
                  <span class="show-ep">${ep}/${total || '?'} 集</span>
                </div>
                <button class="btn-ep-plus" onclick="event.stopPropagation();App.dashboard.epPlus(${a.malId})" title="+1集">+1</button>
              </div>`;
      }).join('') : '<p class="no-shows">无更新</p>'}
          </div>
        </div>`;
    }).join('')}
    </div>` : `<div class="empty-state"><h3>还没有追番</h3><p>在动漫详情中设置"在看"状态和更新日</p></div>`}`;
  },
  bindEvents() { }
};
