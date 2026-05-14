// ===== Login Page =====
App.login = {
  mode: 'login',
  render() {
    return `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <svg viewBox="0 0 32 32" fill="none" width="48" height="48">
            <rect x="2" y="2" width="28" height="28" rx="5" fill="#fff"/>
            <path d="M10.5 9h5l6 14h-4.2l-.9-2.4h-5.5L10 23H6l4.5-14zm1.5 8.3h3.2l-1.6-4.2-1.6 4.2zM23 9h4l-5 14h-4l5-14z" fill="#15181e"/>
          </svg>
          <h1 class="login-title">AnimeVault</h1>
          <p class="login-subtitle">个人动漫收藏追踪</p>
        </div>
        <div class="login-tabs">
          <button class="login-tab ${this.mode==='login'?'active':''}" data-mode="login">登录</button>
          <button class="login-tab ${this.mode==='register'?'active':''}" data-mode="register">注册</button>
        </div>
        <form id="login-form">
          <div class="form-group"><label>用户名</label>
            <input type="text" id="login-user" class="input" required placeholder="输入用户名" autocomplete="username"/></div>
          <div class="form-group"><label>密码</label>
            <input type="password" id="login-pass" class="input" required placeholder="输入密码" minlength="4" autocomplete="current-password"/></div>
          ${this.mode === 'register' ? `<div class="form-group"><label>邀请码</label>
            <input type="text" id="login-invite" class="input invite-input" placeholder="输入 admin 生成的 5 分钟邀请码" autocomplete="off"/></div>` : ''}
          <button type="submit" class="btn btn-primary btn-full" id="login-btn">${this.mode==='login'?'登 录':'注 册'}</button>
        </form>
      </div>
    </div>`;
  },
  bindEvents() {
    document.querySelectorAll('.login-tab').forEach(b => b.addEventListener('click', () => {
      this.mode = b.dataset.mode; App.router.refresh();
    }));
    document.getElementById('login-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = document.getElementById('login-btn');
      btn.disabled = true; btn.textContent = '请稍候...';
      try {
        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;
        const inviteCode = document.getElementById('login-invite')?.value || '';
        const res = await fetch('/api/auth/' + this.mode, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, inviteCode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        App.db.setToken(data.token);
        localStorage.setItem('av_user', data.username);
        App.toast(this.mode === 'login' ? '登录成功！' : '注册成功！', 'success');
        App.router.go('/');
      } catch (err) {
        App.toast(err.message, 'error');
        btn.disabled = false; btn.textContent = this.mode === 'login' ? '登 录' : '注 册';
      }
    });
  }
};
