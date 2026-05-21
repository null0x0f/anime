// ===== App Router & Init =====
App.router = {
  routes: {
    '/': { render: () => App.dashboard.render(), bind: () => App.dashboard.bindEvents() },
    '/anime': { render: () => App.animeList.render(), bind: () => App.animeList.bindEvents() },
    '/merch': { render: () => App.merch.render(), bind: () => App.merch.bindEvents() },
    '/stats': { render: () => App.charts.render(), bind: () => App.charts.bindEvents() },
    '/timeline': { render: () => App.timeline.render(), bind: () => App.timeline.bindEvents() },
    '/calendar': { render: () => App.calendar.render(), bind: () => App.calendar.bindEvents() },
    '/settings': { render: () => App.settings.render(), bind: () => App.settings.bindEvents() },
    '/invite': { render: () => App.invite.render(), bind: () => App.invite.bindEvents() },
    '/login': { render: () => App.login.render(), bind: () => App.login.bindEvents(), noAuth: true },
  },
  current: null,

  async go(path) { location.hash = path; },

  async refresh() {
    const hash = location.hash.slice(1) || '/';
    this.current = hash;
    const app = document.getElementById('app');
    const sidebar = document.querySelector('.sidebar');
    const mobileHeader = document.querySelector('.mobile-header');
    const main = document.querySelector('.main-content');

    // Check route
    let route = this.routes[hash];
    if (!route) {
      const m = hash.match(/^\/anime\/(\d+)$/);
      if (m) route = { render: () => App.animeDetail.render(m[1]), bind: () => App.animeDetail.bindEvents() };
    }
    if (!route) { app.innerHTML = '<div class="empty-state"><h3>页面不存在</h3><a href="#/" class="link">返回首页</a></div>'; return; }

    // Auth guard
    if (!route.noAuth && !App.db.isLoggedIn()) { this.go('/login'); return; }

    // Toggle sidebar visibility
    const isLogin = hash === '/login';
    sidebar?.classList.toggle('hidden', isLogin);
    mobileHeader?.classList.toggle('hidden', isLogin);
    main?.classList.toggle('no-sidebar', isLogin);

    // Update username display
    const userEl = document.getElementById('sidebar-user');
    const username = localStorage.getItem('av_user') || '';
    if (userEl) userEl.textContent = username;
    document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('hidden', username !== 'admin'));

    // Update theme toggle icon
    App.theme?.updateIcon();

    // Scroll to top on navigation
    window.scrollTo(0, 0);

    // Render
    app.classList.add('loading');
    try {
      const html = typeof route.render === 'function' ? await route.render() : '';
      app.innerHTML = html;
      app.classList.remove('loading');
      app.classList.add('page-enter');
      requestAnimationFrame(() => requestAnimationFrame(() => app.classList.remove('page-enter')));
      route.bind();
      // Active nav
      document.querySelectorAll('.nav-link').forEach(l => {
        const href = l.getAttribute('href')?.slice(1);
        l.classList.toggle('active', href === hash || (hash.startsWith('/anime/') && href === '/anime'));
      });
      // Update nav badges (async, don't block)
      App.updateNavBadges();
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="empty-state"><h3>加载出错</h3><p>${e.message}</p></div>`;
      app.classList.remove('loading');
    }
  }
};

App.toggleSidebar = () => document.querySelector('.sidebar')?.classList.toggle('open');

// ===== Nav Badge Counters =====
App._navBadgeCache = {};
App.updateNavBadges = async () => {
  try {
    if (!App.db.isLoggedIn()) return;
    const anime = await App.db.getAllAnime();
    const merch = await App.db.getAllMerch();
    const watchingCount = anime.filter(a => a.status === 'watching').length;
    const merchCount = merch.length;
    // Anime nav badge
    const animeLink = document.getElementById('nav-anime');
    if (animeLink) {
      let badge = animeLink.querySelector('.nav-badge');
      if (watchingCount > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; animeLink.appendChild(badge); }
        badge.textContent = watchingCount;
      } else if (badge) badge.remove();
    }
    // Merch nav badge
    const merchLink = document.getElementById('nav-merch');
    if (merchLink) {
      let badge = merchLink.querySelector('.nav-badge');
      if (merchCount > 0) {
        if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; merchLink.appendChild(badge); }
        badge.textContent = merchCount;
      } else if (badge) badge.remove();
    }
  } catch {}
};

// ===== Global Keyboard Shortcuts =====
document.addEventListener('keydown', e => {
  // Don't intercept when typing in inputs
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    if (e.key === 'Escape') document.activeElement.blur();
    return;
  }

  if (e.key === '/') {
    e.preventDefault();
    const searchInput = document.getElementById('anime-search') || document.getElementById('merch-search');
    if (searchInput) searchInput.focus();
    else App.router.go('/anime');
  }
  else if (e.key === 'Escape') {
    document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
  }
});

// ===== Scroll to Top button visibility =====
window.addEventListener('scroll', () => {
  const btn = document.getElementById('scroll-top');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

window.addEventListener('DOMContentLoaded', async () => {
  window.addEventListener('hashchange', () => App.router.refresh());
  // Auto redirect
  if (!App.db.isLoggedIn() && !location.hash.includes('/login')) location.hash = '/login';
  App.router.refresh();
  document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('open');
  }));
});
