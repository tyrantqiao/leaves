const assert = require('node:assert/strict');
const { TripStore, mergeTrips } = require('../apps/desktop-prototype/trip-store');
const copy = value => JSON.parse(JSON.stringify(value));
const record = (id, title = id) => ({ id, title, date: '2026-09-09', mode: 'rail' });
const storage = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
};
function fixture() {
  const disk = storage(), statuses = [];
  let remote = [], failed = false, beforePut = null;
  const request = async options => {
    if (options.method === 'PUT') {
      if (beforePut) await beforePut();
      if (failed) return { ok: false, status: 500 };
      remote = JSON.parse(options.body);
    }
    return { ok: true, json: async () => options.method === 'GET' ? copy(remote) : { success: true } };
  };
  const make = (key = 'account-a') => new TripStore({ storage: disk, key, request, onStatus: (...args) => statuses.push(args) });
  return { make, disk, statuses, get remote() { return remote; }, set remote(value) { remote = value; }, set failed(value) { failed = value; }, set beforePut(value) { beforePut = value; } };
}
async function main() {
  let passed = 0;
  async function test(name, fn) { await fn(); console.log(`PASS ${name}`); passed++; }
  await test('failed saves survive a new store and refresh, then retry', async () => {
    const f = fixture(); let store = f.make();
    await store.flush(); f.failed = true; await store.save([record('new')]);
    assert.match(f.statuses.at(-1)[1], /尚未同步/);
    store.destroy(); store = f.make(); await store.flush();
    assert.equal(store.trips[0].id, 'new');
    f.failed = false; await store.flush(); assert.equal(f.remote[0].id, 'new');
    assert.equal(f.make().state.dirty, false);
  });
  await test('failed deletions do not resurrect after refresh', async () => {
    const f = fixture(); f.remote = [record('old')]; let store = f.make(); await store.flush();
    f.failed = true; await store.save([]); store.destroy(); store = f.make(); await store.flush();
    assert.deepEqual(store.trips, []); f.failed = false; await store.flush(); assert.deepEqual(f.remote, []);
  });
  await test('refresh preserves unrelated remote additions and local edits', async () => {
    const f = fixture(); f.remote = [record('a')]; const store = f.make(); await store.flush();
    f.remote = [record('a'), record('remote')]; await store.save([record('a', 'edited'), record('local')]);
    assert.equal(f.remote.length, 3); assert.equal(f.remote.find(x => x.id === 'a').title, 'edited');
  });
  await test('edits during a write are serialized and included in the next write', async () => {
    const f = fixture(); const store = f.make(); await store.flush();
    let release, entered; const started = new Promise(resolve => { entered = resolve; });
    f.beforePut = () => { f.beforePut = null; entered(); return new Promise(resolve => { release = resolve; }); };
    const pending = store.save([record('a')]); await started;
    store.save([record('a', 'latest'), record('b')]); release(); await pending;
    assert.equal(f.remote.length, 2); assert.equal(f.remote.find(x => x.id === 'a').title, 'latest');
    assert.equal(store.state.dirty, false);
  });
  await test('account destruction ignores delayed reads and never writes into a new session', async () => {
    const disk = storage(); let release, puts = 0;
    const store = new TripStore({ storage: disk, key: 'a', request: async options => {
      if (options.method === 'PUT') puts++;
      await new Promise(resolve => { release = resolve; });
      return { ok: true, json: async () => [] };
    } });
    const pending = store.save([record('a')]); store.destroy(); release(); await pending;
    assert.equal(puts, 0);
    const other = new TripStore({ storage: disk, key: 'b', request: () => {} });
    assert.deepEqual(other.trips, []);
  });
  await test('invalid responses cannot erase cached records', async () => {
    const f = fixture(); f.remote = [record('a')]; const store = f.make(); await store.flush();
    store.request = async () => ({ ok: true, json: async () => ({ unexpected: true }) });
    await store.flush(); assert.equal(store.trips[0].id, 'a');
  });
  await test('merge handles edits, deletes, and independent remote records', () => {
    assert.deepEqual(mergeTrips([record('a'),record('b')], [record('a','local')], [record('a','remote'),record('b'),record('c')]).map(x => [x.id,x.title]), [['a','local'],['c','c']]);
  });
  await test('a stale server revision is fetched again before retrying a write', async () => {
    const disk = storage(); let remote = [], etag = 'one', writes = 0;
    const store = new TripStore({ storage: disk, key: 'a', request: async options => {
      if (options.method === 'GET') return { ok: true, headers: { get: () => etag }, json: async () => copy(remote) };
      if (++writes === 1) { remote = [record('remote')]; etag = 'two'; return { ok: false, status: 412 }; }
      assert.equal(options.headers['If-Match'], 'two'); remote = JSON.parse(options.body);
      return { ok: true, json: async () => ({ success: true }) };
    } });
    await store.save([record('local')]); assert.equal(remote.length, 2); assert.equal(writes, 2);
  });
  await test('quota failure never claims records are cached', async () => {
    const statuses = [];
    const store = new TripStore({ storage: {getItem: () => null, setItem: () => { throw new Error('quota'); }}, key: 'a', request: async () => { throw new Error('offline'); }, onStatus: (...args) => statuses.push(args) });
    await store.save([record('a')]); assert.match(statuses.at(-1)[1], /暂勿刷新/);
  });
  await test('a stalled request times out and exposes a retryable error', async () => {
    const statuses = [];
    const store = new TripStore({ storage: storage(), key: 'a', timeoutMs: 20, request: options => new Promise((resolve,reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))), onStatus: (...args) => statuses.push(args) });
    await store.save([record('a')]); assert.equal(statuses.at(-1)[0], 'error'); assert.equal(store.trips.length, 1);
  });
  const { readTrips, writeTrips } = require('../apps/desktop-prototype/server/trip-storage');
  const fs = require('node:fs/promises'), os = require('node:os'), path = require('node:path');
  const folder = await fs.mkdtemp(path.join(os.tmpdir(),'leaves-storage-check-'));
  await test('concurrent conditional writes cannot overwrite each other', async () => {
    const file = path.join(folder,'trips.json'); const { etag } = await readTrips(file);
    const outcomes = await Promise.allSettled([writeTrips(file,[record('a')],etag),writeTrips(file,[record('b')],etag)]);
    assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(outcomes.find(x=>x.status==='rejected').reason.status,412);
    assert.equal((await readTrips(file)).trips.length,1);
    assert.deepEqual((await fs.readdir(folder)).filter(name=>name.endsWith('.tmp')),[]);
  });
  await test('a malformed existing file is reported, not silently replaced', async () => {
    const file = path.join(folder,'invalid.json'); await fs.writeFile(file,'not json');
    await assert.rejects(readTrips(file)); await assert.rejects(writeTrips(file,[]));
    assert.equal(await fs.readFile(file,'utf8'),'not json');
  });
  console.log(`${passed} storage regression checks passed.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
