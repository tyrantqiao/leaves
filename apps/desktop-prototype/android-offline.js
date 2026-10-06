/* Android local-first workspace. The server is only an optional sync peer. */
(() => {
  if (!window.LeavesAndroid) return;
  const configKey = 'leaves.android.workspace.v1';
  const local = { id: 'android-local', username: '本机记录' };
  const tripKey = id => `leaves.prototype.trips.v2.${id}`;
  let config = JSON.parse(localStorage.getItem(configKey) || 'null') || { profile: local, enabled: false };
  let dialog, busy = false, sequence = 0;
  const pending = new Map();
  const persist = () => localStorage.setItem(configKey, JSON.stringify(config));
  const response = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', ...headers } });
  window.LeavesAndroidNetwork = {
    resolve(id, payload) {
      const operation = pending.get(id);
      if (!operation) return;
      pending.delete(id); operation.cleanup();
      if (payload.error) operation.reject(new Error(payload.error));
      else operation.resolve(new Response(payload.body || '', { status: payload.status, headers: payload.headers }));
    }
  };
  function remote(server, path, options = {}) {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${++sequence}-${Math.random()}`;
      const signal = options.signal;
      const abort = () => {
        pending.delete(id); cleanup();
        window.LeavesAndroid.cancelRequest(id);
        reject(new DOMException('请求已取消', 'AbortError'));
      };
      let timer;
      const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); };
      if (signal?.aborted) { reject(new DOMException('请求已取消', 'AbortError')); return; }
      pending.set(id, { resolve, reject, cleanup });
      timer = setTimeout(abort, 25000);
      signal?.addEventListener('abort', abort, { once: true });
      try { window.LeavesAndroid.request(id, server + path, options.method || 'GET', options.body || '', JSON.stringify(options.headers || {})); }
      catch (error) { pending.delete(id); cleanup(); reject(error); }
    });
  }
  function status(message) {
    if (dialog) dialog.querySelector('#androidSyncStatus').textContent = message;
  }
  function updateButtons() {
    const linked = Boolean(config.binding);
    document.querySelector('#logoutButton').hidden = !linked;
    document.querySelector('#logoutButton').textContent = '退出同步账号';
    document.querySelector('#androidSyncButton').textContent = config.enabled ? '数据同步 · 已启用' : '数据同步 · 仅本机';
    if (dialog) {
      dialog.querySelector('#androidPauseSync').hidden = !linked;
      dialog.querySelector('#androidPauseSync').textContent = config.enabled ? '暂停同步' : '恢复同步';
      dialog.querySelector('#androidSyncNow').hidden = !config.enabled;
      dialog.querySelector('#androidServerBackup').hidden = !localStorage.getItem(`${tripKey(config.profile.id)}.beforeSync`);
    }
  }
  function mount() {
    if (dialog) return;
    const button = document.createElement('button');
    button.id = 'androidSyncButton'; button.className = 'ghost-button'; button.type = 'button'; button.addEventListener('click', openSettings);
    document.querySelector('.more-menu-panel').appendChild(button);
    const updates = document.createElement('button');
    updates.id = 'androidUpdatesButton'; updates.className = 'ghost-button'; updates.type = 'button';
    updates.textContent = '应用更新'; updates.addEventListener('click', () => window.LeavesAndroid.showUpdates?.());
    document.querySelector('.more-menu-panel').appendChild(updates);
    dialog = document.createElement('dialog'); dialog.className = 'workspace-dialog'; dialog.id = 'androidSyncDialog';
    dialog.innerHTML = `<header class="dialog-header"><h2>数据同步（可选）</h2><button id="androidCloseSync" class="ghost-button" type="button">关闭</button></header>
      <form id="androidSyncForm" class="dialog-body auth-form">
        <p>记录始终保存在本机。不连接服务器也可以正常使用；连接后合并两端记录。首次绑定时，本机记录会加入该账号。</p>
        <label class="auth-field"><span>服务器地址</span><input id="androidServer" type="url" placeholder="https://你的服务地址" required></label>
        <label class="auth-field"><span>同步账号</span><input id="androidUsername" autocomplete="username" required></label>
        <label class="auth-field"><span>密码</span><input id="androidPassword" type="password" autocomplete="current-password" required></label>
        <label class="auth-field"><span>账号操作</span><select id="androidAuthMode"><option value="login">登录已有账号</option><option value="register">注册新账号</option></select></label>
        <p id="androidSyncStatus" role="status"></p>
        <button id="androidConnectSync" class="primary-button" type="submit">连接账号并同步</button>
      </form><footer class="dialog-footer"><button id="androidSyncNow" class="ghost-button" type="button">立即同步</button><button id="androidPauseSync" class="ghost-button" type="button">暂停同步</button><button id="androidServerBackup" class="ghost-button" type="button">导出同步前服务器副本</button></footer>`;
    document.body.appendChild(dialog);
    dialog.querySelector('#androidCloseSync').addEventListener('click', () => { if (!busy) dialog.close(); });
    dialog.addEventListener('close', () => { dialog.querySelector('#androidPassword').value = ''; });
    dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    dialog.querySelector('form').addEventListener('submit', connect);
    dialog.querySelector('#androidPauseSync').addEventListener('click', () => {
      if (busy) return;
      pauseTripEditor(); tripStore?.destroy(); config.enabled = !config.enabled; persist(); enterApp(config.profile); updateButtons();
      status(config.enabled ? '正在同步，记录仍可在本机使用。' : '已暂停同步，继续使用此账号的本机记录。');
    });
    dialog.querySelector('#androidSyncNow').addEventListener('click', async () => {
      status('正在同步…'); await tripStore?.flush(); status(document.querySelector('#saveStatus').textContent); updateButtons();
    });
    dialog.querySelector('#androidServerBackup').addEventListener('click', () => {
      const records = JSON.parse(localStorage.getItem(`${tripKey(config.profile.id)}.beforeSync`) || '[]');
      downloadJson({ app: 'leaves', version: 1, exportedAt: new Date().toISOString(), trips: records }, 'leaves-server-before-sync.json');
    });
  }
  function openSettings() {
    mount(); updateButtons();
    dialog.querySelector('#androidServer').value = config.binding?.server || '';
    dialog.querySelector('#androidUsername').value = config.binding?.user.username || '';
    status(config.binding ? `${config.binding.user.username} · ${config.enabled ? '同步已启用' : '同步已暂停'}` : '当前仅保存在本机。');
    dialog.showModal();
  }
  async function connect(event) {
    event.preventDefault(); if (busy) return;
    const server = dialog.querySelector('#androidServer').value.trim().replace(/\/+$/, '');
    try {
      const url = new URL(server);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error();
    } catch { status('请输入服务根地址，不包含路径。'); return; }
    const username = dialog.querySelector('#androidUsername').value.trim();
    const password = dialog.querySelector('#androidPassword').value;
    const mode = dialog.querySelector('#androidAuthMode').value;
    busy = true; dialog.querySelector('#androidConnectSync').disabled = true;
    pauseTripEditor(); tripStore?.destroy();
    status('正在连接同步账号…');
    try {
      const result = await remote(server, `/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const payload = await result.json();
      if (!result.ok || !payload.user?.id) throw new Error(payload.error || '连接失败');
      const profile = { id: `android:${encodeURIComponent(server)}:${payload.user.id}`, username: payload.user.username };
      // Seed only the original unbound workspace. Account A is never copied to B.
      const adoptingLocal = config.profile.id === local.id;
      if (adoptingLocal) {
        const seed = JSON.parse(localStorage.getItem(`${tripKey(local.id)}.outbox`) || 'null');
        if (seed?.trips?.length) {
          const targetKey = `${tripKey(profile.id)}.outbox`;
          const previous = JSON.parse(localStorage.getItem(targetKey) || 'null');
          const combined = new Map((previous?.trips || []).map(t => [t.id, t]));
          seed.trips.forEach(t => combined.set(t.id, t));
          localStorage.setItem(targetKey, JSON.stringify({ base: previous?.base || [], trips: [...combined.values()], dirty: true }));
        }
      }
      const next = { ...config, profile, binding: { server, user: payload.user }, enabled: true, localLinked: true };
      localStorage.setItem(configKey, JSON.stringify(next)); config = next;
      if (adoptingLocal) localStorage.setItem(`${tripKey(local.id)}.outbox`, JSON.stringify({ base: [], trips: [], dirty: false }));
      enterApp(profile); updateButtons();
      await tripStore.flush(); status(document.querySelector('#saveStatus').textContent); updateButtons();
    } catch (error) {
      config.enabled = false; persist(); enterApp(config.profile); updateButtons();
      status(`${error.message}。本机记录可继续使用。`);
    } finally {
      busy = false; dialog.querySelector('#androidConnectSync').disabled = false; dialog.querySelector('#androidPassword').value = '';
    }
  }
  function migrate() {
    const legacy = JSON.parse(window.LeavesAndroid.legacyData?.() || 'null');
    if (!legacy) return;
    const user = legacy['leaves.android.lastUser'];
    const server = window.LeavesAndroid.legacyServer?.();
    if (server) {
      const parsedUser = user ? JSON.parse(user) : null;
      const ids = new Set(parsedUser ? [String(parsedUser.id)] : []);
      Object.keys(legacy).forEach(key => {
        const match = key.match(/^leaves\.prototype\.trips\.v2\.([^.]+)(?:\.outbox)?$/);
        if (match) ids.add(match[1]);
      });
      for (const id of ids) {
        const mapped = `android:${encodeURIComponent(server)}:${id}`;
        for (const [key, value] of Object.entries(legacy)) {
          if (key.startsWith('leaves.prototype.') && key.endsWith(`.${id}`)) {
            localStorage.setItem(key.slice(0, -id.length) + mapped, value);
          } else if (key.startsWith('leaves.prototype.') && key.includes(`.${id}.`)) {
            localStorage.setItem(key.replace(`.${id}.`, `.${mapped}.`), value);
          }
        }
      }
      if (parsedUser) {
        const profile = { id: `android:${encodeURIComponent(server)}:${parsedUser.id}`, username: parsedUser.username };
        config = { profile, binding: { server, user: parsedUser }, enabled: false, localLinked: true }; persist();
      }
    }
    window.LeavesAndroid.finishMigration?.();
  }
  window.LeavesLocalApp = {
    start() {
      try { migrate(); mount(); enterApp(config.profile); updateButtons(); }
      catch { setAuthMessage('本机存储无法读取，请勿清除应用数据。'); }
    },
    syncEnabled: () => Boolean(config.enabled && config.binding),
    async request(path, options = {}) {
      if (!this.syncEnabled()) return response({ error: '当前仅使用本机记录；可在更多菜单启用数据同步。' }, 503);
      const binding = config.binding;
      if (path === '/api/data/trips') {
        const session = await remote(binding.server, '/api/auth/me', { signal: options.signal });
        if (!session.ok) return session;
        const payload = await session.json();
        if (payload.user?.id !== binding.user.id) return response({ error: '同步账号已变化，请重新连接。' }, 401);
        if (config.binding !== binding || !config.enabled) throw new DOMException('同步已暂停', 'AbortError');
      }
      return remote(binding.server, path, options);
    },
    expired() {
      config.enabled = false; persist(); updateButtons();
      document.querySelector('#saveStatus').textContent = '已保留在本机 · 同步账号需重新登录';
      status('同步登录已过期，请重新连接账号；本机使用不受影响。');
    },
    unlink() {
      if (busy) return;
      pauseTripEditor(); tripStore?.destroy(); document.querySelectorAll('dialog[open]').forEach(d => d.close());
      config = { profile: local, enabled: false, localLinked: config.localLinked }; persist();
      enterApp(local); updateButtons(); document.querySelector('#moreMenu').open = false;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !busy) tripStore?.flush();
  });
  setInterval(() => { if (config.enabled && document.visibilityState === 'visible' && !busy) tripStore?.flush(); }, 60000);
})();
