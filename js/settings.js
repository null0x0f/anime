// ===== Settings Page =====
App.settings = {
  async render() {
    const tags = await App.db.getAllTags();
    const esc = App.utils.escapeHtml;
    return `
    <div class="page-header"><h1>设置</h1><p class="subtitle">数据管理与备份</p></div>
    <div class="settings-grid">
      <div class="settings-card">
        <h3>修改密码</h3>
        <p>更新当前账号的登录密码。修改后当前登录状态会保留。</p>
        <form id="password-form" class="settings-form">
          <div class="form-group"><label>当前密码</label><input type="password" id="current-password" class="input" required autocomplete="current-password"/></div>
          <div class="form-group"><label>新密码</label><input type="password" id="new-password" class="input" required minlength="4" autocomplete="new-password"/></div>
          <div class="form-group"><label>确认新密码</label><input type="password" id="confirm-password" class="input" required minlength="4" autocomplete="new-password"/></div>
          <button class="btn btn-primary" id="btn-change-password" type="submit">保存新密码</button>
        </form>
      </div>
      <div class="settings-card">
        <h3>标签管理</h3>
        <p>编辑或删除已创建的标签。</p>
        ${tags.length ? `<div class="tag-manage-list">${tags.map(t => `
          <div class="tag-manage-item">
            <span class="tag" style="--tag-color:${t.color}">${esc(t.name)}</span>
            <div class="tag-manage-actions">
              <button class="btn btn-ghost btn-sm" onclick="App.settings.editTag('${t.id}','${esc(t.name)}','${t.color}')">编辑</button>
              <button class="btn btn-danger btn-sm" onclick="App.settings.deleteTag('${t.id}')">删除</button>
            </div>
          </div>`).join('')}</div>` : '<p class="text-muted">还没有标签，在动漫详情页中创建</p>'}
      </div>
      <div class="settings-card">
        <h3>导出数据</h3>
        <p>将所有动漫收藏和周边记录导出为 JSON 文件，用于备份或迁移。</p>
        <button class="btn btn-primary" id="btn-export">导出 JSON</button>
      </div>
      <div class="settings-card">
        <h3>导入数据</h3>
        <p>从之前导出的 JSON 文件恢复数据。新数据会合并到现有数据中。</p>
        <input type="file" id="import-file" accept=".json" class="hidden"/>
        <button class="btn btn-primary" id="btn-import">选择文件导入</button>
      </div>
      <div class="settings-card danger">
        <h3>清除所有数据</h3>
        <p>删除所有动漫收藏和周边记录。此操作不可撤销！</p>
        <button class="btn btn-danger" id="btn-clear">清除数据</button>
      </div>
      <div class="settings-card">
        <h3>生成分享卡片</h3>
        <p>生成一张精美的收藏总结图片，可以保存或分享到社交媒体。</p>
        <button class="btn btn-primary" id="btn-share">生成卡片</button>
      </div>
    </div>
    <div id="tag-edit-modal" class="modal hidden"></div>`;
  },

  async editTag(id, name, color) {
    const colors = ['#7b42bc','#14c6cb','#1868f2','#ffcf25','#bb5a00','#731e25','#a737ff','#12805c'];
    const modal = document.getElementById('tag-edit-modal') || document.createElement('div');
    modal.id = 'tag-edit-modal';
    modal.className = 'modal';
    if (!modal.parentElement) document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.innerHTML = `<div class="modal-overlay" onclick="this.parentElement.classList.add('hidden')"></div>
      <div class="modal-content">
        <h2>编辑标签</h2>
        <div class="form-group"><label>名称</label><input type="text" id="tag-edit-name" class="input" value="${App.utils.escapeHtml(name)}"/></div>
        <div class="form-group"><label>颜色</label>
          <div class="color-picker-row">${colors.map(c => `<div class="color-dot ${c===color?'active':''}" style="background:${c}" data-color="${c}" onclick="document.querySelectorAll('#tag-edit-modal .color-dot').forEach(d=>d.classList.remove('active'));this.classList.add('active')"></div>`).join('')}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" onclick="document.getElementById('tag-edit-modal').classList.add('hidden')">取消</button>
          <button class="btn btn-primary" onclick="App.settings.saveTag('${id}')">保存</button>
        </div>
      </div>`;
  },

  async saveTag(id) {
    const name = document.getElementById('tag-edit-name')?.value?.trim();
    if (!name) { App.toast('名称不能为空', 'error'); return; }
    const color = document.querySelector('#tag-edit-modal .color-dot.active')?.dataset.color || '#7b42bc';
    await App.db.updateTag(id, name, color);
    document.getElementById('tag-edit-modal')?.classList.add('hidden');
    App.toast('标签已更新', 'success');
    App.router.refresh();
  },

  async deleteTag(id) {
    if (!confirm('确定删除该标签？')) return;
    await App.db.deleteTag(id);
    App.toast('已删除', 'success');
    App.router.refresh();
  },

  bindEvents() {
    document.getElementById('password-form')?.addEventListener('submit', async e => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-password').value;
      if (newPassword !== confirmPassword) { App.toast('两次输入的新密码不一致', 'error'); return; }
      const btn = document.getElementById('btn-change-password');
      btn.disabled = true; btn.textContent = '保存中...';
      try {
        await App.db.changePassword(currentPassword, newPassword);
        e.target.reset();
        App.toast('密码已修改', 'success');
      } catch (err) {
        App.toast(err.message, 'error');
      } finally {
        btn.disabled = false; btn.textContent = '保存新密码';
      }
    });
    document.getElementById('btn-export')?.addEventListener('click', async () => {
      const json = await App.db.exportAll();
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `animevault_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click(); URL.revokeObjectURL(a.href);
      App.toast('导出成功！', 'success');
    });
    document.getElementById('btn-import')?.addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file')?.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const text = await file.text();
        await App.db.importAll(text);
        App.toast('导入成功！', 'success');
        App.router.refresh();
      } catch (err) { App.toast('导入失败: ' + err.message, 'error'); }
    });
    document.getElementById('btn-clear')?.addEventListener('click', async () => {
      if (!confirm('确定清除所有数据？此操作不可撤销！')) return;
      await App.db.clearAll();
      App.toast('已清除', 'success');
      App.router.go('/');
    });
    document.getElementById('btn-share')?.addEventListener('click', () => App.share.generate());
  }
};
