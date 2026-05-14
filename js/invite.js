// ===== Admin Invite Code Page =====
App.invite = {
  timer: null,

  async render() {
    const username = localStorage.getItem('av_user') || '';
    if (username !== 'admin') {
      return `<div class="empty-state"><h3>无权限</h3><p>只有 admin 用户登录后才能生成注册邀请码。</p></div>`;
    }

    return `
    <div class="page-header"><h1>邀请码</h1><p class="subtitle">生成用于新用户注册的一次性邀请码，有效期 5 分钟。</p></div>
    <div class="settings-grid">
      <div class="settings-card invite-card">
        <h3>当前邀请码</h3>
        <p>把下方代码发给需要注册的用户。过期后页面会自动刷新生成新码。</p>
        <div class="invite-code-box">
          <span id="invite-code-value" class="invite-code-value">生成中...</span>
          <button class="btn btn-ghost btn-sm" id="btn-copy-invite" type="button">复制</button>
        </div>
        <div class="invite-meta">
          <span id="invite-countdown">有效期计算中...</span>
          <span id="invite-expires-at"></span>
        </div>
        <button class="btn btn-primary" id="btn-refresh-invite" type="button">刷新邀请码</button>
      </div>
    </div>`;
  },

  bindEvents() {
    document.getElementById('btn-refresh-invite')?.addEventListener('click', () => this.refreshCode());
    document.getElementById('btn-copy-invite')?.addEventListener('click', () => this.copyCode());
    this.refreshCode();
  },

  async refreshCode() {
    const codeEl = document.getElementById('invite-code-value');
    const btn = document.getElementById('btn-refresh-invite');
    if (!codeEl || !btn) return;
    btn.disabled = true;
    codeEl.textContent = '生成中...';
    try {
      const data = await App.db.generateInviteCode();
      codeEl.textContent = data.code;
      document.getElementById('invite-expires-at').textContent = '过期时间 ' + new Date(data.expiresAt).toLocaleTimeString('zh-CN', { hour12: false });
      this.startCountdown(data.expiresAt);
    } catch (e) {
      codeEl.textContent = '生成失败';
      App.toast(e.message, 'error');
    } finally {
      btn.disabled = false;
    }
  },

  startCountdown(expiresAt) {
    clearInterval(this.timer);
    const countdown = document.getElementById('invite-countdown');
    const tick = () => {
      if (!countdown) return;
      const ms = Date.parse(expiresAt) - Date.now();
      if (ms <= 0) {
        countdown.textContent = '已过期，正在刷新...';
        clearInterval(this.timer);
        if (App.router.current === '/invite') this.refreshCode();
        return;
      }
      const seconds = Math.ceil(ms / 1000);
      const min = Math.floor(seconds / 60);
      const sec = String(seconds % 60).padStart(2, '0');
      countdown.textContent = `剩余 ${min}:${sec}`;
    };
    tick();
    this.timer = setInterval(tick, 1000);
  },

  async copyCode() {
    const code = document.getElementById('invite-code-value')?.textContent || '';
    if (!code || code.includes('生成')) return;
    try {
      await navigator.clipboard.writeText(code);
      App.toast('邀请码已复制', 'success');
    } catch {
      App.toast('复制失败，请手动选择邀请码', 'error');
    }
  }
};
