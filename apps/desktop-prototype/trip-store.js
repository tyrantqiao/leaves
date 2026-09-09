/* Per-account durable outbox. One envelope keeps the base and local changes atomic. */
(function (root) {
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function mergeTrips(base, local, remote) {
    const before = new Map(base.map((trip) => [trip.id, trip]));
    const after = new Map(local.map((trip) => [trip.id, trip]));
    const merged = new Map(remote.map((trip) => [trip.id, trip]));
    for (const id of before.keys()) if (!after.has(id)) merged.delete(id);
    for (const [id, trip] of after) {
      if (!before.has(id) || !same(before.get(id), trip)) merged.set(id, trip);
    }
    return [...merged.values()].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  class TripStore {
    constructor({ storage, key, request, onChange = () => {}, onStatus = () => {}, timeoutMs = 15000 }) {
      Object.assign(this, { storage, key, request, onChange, onStatus, timeoutMs });
      this.controller = new AbortController();
      this.closed = false;
      this.running = null;
      this.revision = 0;
      this.durable = true;
      this.state = { base: [], trips: [], dirty: false };
      try {
        const envelope = JSON.parse(storage.getItem(`${key}.outbox`) || 'null');
        if (envelope && Array.isArray(envelope.trips) && Array.isArray(envelope.base)) {
          this.state = envelope;
        } else {
          const legacy = JSON.parse(storage.getItem(key) || '[]');
          if (Array.isArray(legacy)) this.state = { base: legacy, trips: legacy, dirty: false };
        }
      } catch { this.onStatus('error', '无法读取此设备的缓存，请先导出可见记录。'); }
    }

    get trips() { return clone(this.state.trips); }

    cache() {
      try {
        this.storage.setItem(`${this.key}.outbox`, JSON.stringify(this.state));
        this.durable = true;
        return true;
      } catch {
        this.durable = false;
        this.onStatus('error', '此设备存储空间不足，记录尚未安全保存，请立即导出备份。');
        return false;
      }
    }

    save(trips) {
      this.state.trips = clone(trips);
      this.state.dirty = true;
      this.revision += 1;
      this.cache();
      return this.flush();
    }

    async fetch(method, trips) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      this.controller.signal.addEventListener('abort', abort, { once: true });
      const timer = setTimeout(abort, this.timeoutMs);
      try {
        const response = await this.request({
          method,
          signal: controller.signal,
          ...(method === 'PUT' ? { headers: { 'Content-Type': 'application/json', ...(this.etag ? { 'If-Match': this.etag } : {}) }, body: JSON.stringify(trips) } : {})
        });
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`);
          error.status = response.status;
          throw error;
        }
        const payload = await response.json();
        if (method === 'GET' && !Array.isArray(payload)) throw new Error('Invalid trip response');
        if (method === 'GET') this.etag = response.headers?.get('ETag');
        return payload;
      } finally {
        clearTimeout(timer);
        this.controller.signal.removeEventListener('abort', abort);
      }
    }

    flush() {
      if (this.closed) return Promise.resolve();
      if (this.running) return this.running;
      this.running = this.drain().finally(() => { this.running = null; });
      return this.running;
    }

    async drain() {
      this.onStatus('saving', this.state.dirty ? '正在保存…' : '正在同步…');
      let conflicts = 0;
      try {
        do {
          const remote = await this.fetch('GET');
          if (this.closed) return;
          if (!this.state.dirty) {
            this.state = { base: clone(remote), trips: clone(remote), dirty: false };
            this.cache();
            this.onChange(this.trips);
            break;
          }
          // Refresh may finish after an edit: always merge the latest local snapshot.
          const revision = this.revision;
          const local = clone(this.state.trips);
          const merged = mergeTrips(this.state.base, local, remote);
          // Retain the pre-write remote copy for recovery, including same-record conflicts.
          this.storage.setItem(`${this.key}.beforeSync`, JSON.stringify(remote));
          try { await this.fetch('PUT', merged); }
          catch (error) {
            if (error.status === 412 && conflicts++ < 3) continue;
            throw error;
          }
          if (this.closed) return;
          if (revision === this.revision) {
            this.state = { base: clone(merged), trips: merged, dirty: false };
          } else {
            this.state = { base: clone(merged), trips: mergeTrips(local, this.state.trips, merged), dirty: true };
          }
          this.cache();
          this.onChange(this.trips);
        } while (this.state.dirty && !this.closed);
        if (!this.closed) this.onStatus('saved', '已保存');
      } catch (error) {
        if (this.closed) return;
        if (!this.durable) this.onStatus('error', '此设备缓存和同步均未完成，请立即导出备份，暂勿刷新。');
        else if (error.status === 401) this.onStatus('expired', '登录已过期，本地修改已保留，请重新登录。');
        else this.onStatus('error', this.state.dirty ? '已保留在此设备，尚未同步' : '无法同步，正在显示此设备的记录');
      }
    }

    destroy() {
      this.closed = true;
      this.controller.abort();
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = { TripStore, mergeTrips };
  else root.LeavesTripStore = TripStore;
})(typeof window === 'undefined' ? globalThis : window);
