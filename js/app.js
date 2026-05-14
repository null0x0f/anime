// ===== App Router & Init =====
App.router = {
  routes: {
    '/': { render: () => App.dashboard.render(), bind: () => {} },
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
    } catch (e) {
      console.error(e);
      app.innerHTML = `<div class="empty-state"><h3>加载出错</h3><p>${e.message}</p></div>`;
      app.classList.remove('loading');
    }
  }
};

App.toggleSidebar = () => document.querySelector('.sidebar')?.classList.toggle('open');

window.addEventListener('DOMContentLoaded', async () => {
  window.addEventListener('hashchange', () => App.router.refresh());
  // Auto redirect
  if (!App.db.isLoggedIn() && !location.hash.includes('/login')) location.hash = '/login';
  App.router.refresh();
  document.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', () => {
    document.querySelector('.sidebar')?.classList.remove('open');
  }));
});
