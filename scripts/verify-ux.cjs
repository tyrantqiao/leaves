const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.LEAVES_PLAYWRIGHT_PATH || 'playwright');
const output = path.resolve('exports/ux-implementation');
fs.mkdirSync(output, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function main() {
  const port = Number(process.env.LEAVES_TEST_PORT || 4173);
  const url = process.env.LEAVES_TEST_URL || `http://127.0.0.1:${port}`;
  const server = process.env.LEAVES_TEST_URL ? null : spawn(process.execPath, ['apps/desktop-prototype/dev-server.js'], { env: { ...process.env, LEAVES_PORT: String(port), LEAVES_DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'leaves-ux-check-')) }, stdio: 'pipe', windowsHide: true });
  process.once('exit', () => { if(server) server.kill(); });
  if (server) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server start timeout')), 15000);
      server.stdout.on('data', data => { if (String(data).includes('prototype running')) { clearTimeout(timer); resolve(); } });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`server exited ${code}`)); });
    });
  }
  const browser = await chromium.launch({ headless: true, channel: process.env.LEAVES_BROWSER || 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  await context.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [], results = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.accept());
  async function check(name, fn) { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  const saved = () => page.waitForFunction(() => document.querySelector('#saveStatus').textContent === '已保存');
  const shot = name => page.screenshot({ path: path.join(output, `${name}.png`) });
  async function add(text, mode = 'auto', date = '2026-09-01') {
    await page.selectOption('#tripMode', mode); await page.fill('#tripDate', date);
    await page.fill('#tripInput', text); await page.click('#quickAddForm button'); await page.locator('#tripEditor[open]').waitFor();
  }
  async function route(from, to) { await page.fill('#previewOrigin', from); await page.fill('#previewDestination', to); }
  async function save() { await page.click('#tripEditForm [data-action="save"]'); await page.locator('#tripEditor').waitFor({ state: 'hidden' }); await saved(); }
  const username = `ux${Date.now().toString().slice(-9)}`, password = 'Review-test-9382';
  try {
    await page.goto(url);
    await check('login gates app and registration opens an empty account', async () => {
      assert(await page.locator('#appShell').isHidden());
      await page.click('#registerTab'); await page.fill('#authUsername', username); await page.fill('#authPassword', password); await page.fill('#authPasswordConfirm', password); await page.click('#authSubmit');
      await page.locator('#appShell').waitFor(); await saved(); assert.equal(await page.locator('.trip-card').count(), 0);
    });
    await check('flight has no invented route and validates required endpoints', async () => {
      await add('CA1234'); assert.equal(await page.inputValue('#previewOrigin'), ''); assert.equal(await page.inputValue('#previewDestination'), '');
      await page.click('[data-action="save"]'); assert.equal(await page.locator('#previewOrigin').getAttribute('aria-invalid'), 'true');
      await route('北京首都国际机场', '上海虹桥国际机场'); await save();
      assert.match(await page.locator('#heroOverlay').innerText(), /已完成/);
      assert.match(await page.locator('#heroOverlay').innerText(), /时间未填/);
    });
    await check('rail can be saved manually without requesting the timetable', async () => {
      let queries = 0; const listener = request => { if(request.url().includes('/train-route')) queries++; }; page.on('request', listener);
      await add('G1234'); await route('上海虹桥', '杭州东'); await save();
      page.off('request', listener); assert.equal(queries, 0);
    });
    await check('city counts merge stations and airports and charts state the units', async () => {
      await page.click('#dashboardTab');
      const cities = page.locator('.metric-card').filter({ hasText: '到访城市' }); assert.equal(await cities.locator('strong').innerText(), '3');
      assert.match(await page.locator('#monthlyTimelineTitle').innerText(), /里程/); await shot('dashboard-desktop'); await page.click('#homeTab');
    });
    await check('empty transport filter clears the selected detail', async () => {
      await page.click('[data-filter="ship"]'); assert.match(await page.locator('#heroOverlay').innerText(), /暂无轮船/);
      assert.equal(await page.locator('[data-action="edit"]').count(), 0); await page.click('[data-filter="all"]');
    });
    await check('paused draft survives page switch and reload and future status stays planned', async () => {
      await add('MU5678', 'flight', '2099-09-09'); await route('广州白云国际机场', '上海虹桥国际机场');
      await page.click('#pauseEditor'); await page.click('#dashboardTab'); await page.reload(); await page.locator('#appShell').waitFor(); await saved();
      await page.click('#resumeDraft'); assert.equal(await page.inputValue('#previewOrigin'), '广州白云国际机场');
      assert.equal(await page.inputValue('#previewStatus'), 'planned');
      await page.click('#editorExtra summary'); await page.fill('#previewDeparture','09:00'); await page.fill('#previewArrival','11:00'); await save();
      assert.match(await page.locator('#heroOverlay').innerText(), /计划/);
    });
    await check('desktop and mobile browsing and form fields are usable', async () => {
      for (const [width, height] of [[1440,900],[1366,768],[1080,740],[360,640],[390,740],[430,740]]) {
        await page.setViewportSize({width,height}); await sleep(100);
        const layout = await page.evaluate(() => {
          const rect = s => { const r=document.querySelector(s).getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}; };
          return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,top:rect('.topbar'),hero:rect('#heroCard'),strip:rect('.bottom-panel')};
        });
        assert.equal(layout.scrollWidth, width); assert(layout.hero.h > 200); assert(layout.strip.bottom <= height + 1);
        if(width===360 || width===1440) await shot(`home-${width}x${height}`);
        await add('G8812'); await route('合肥南', '上海虹桥');
        await page.locator('#previewTitle').scrollIntoViewIfNeeded(); await page.click('#previewTitle');
        const firstField = await page.locator('#previewTitle').boundingBox(); assert(firstField.y > 0 && firstField.y < height);
        await page.click('#editorExtra summary'); await page.fill('#previewNotes','手机表单滚动验证');
        const footer = await page.locator('[data-action="save"]').boundingBox(); assert(footer.y>=0 && footer.y+footer.height<=height);
        await page.locator('#previewOrigin').scrollIntoViewIfNeeded(); await page.click('#previewOrigin');
        if(width===360 || width===1440) await shot(`editor-${width}x${height}`);
        await page.click('[data-action="discard"]'); await page.locator('#tripEditor').waitFor({state:'hidden'});
      }
    });
    await page.setViewportSize({width:1440,height:900});
    await check('rail query failure returns to the same editable draft', async () => {
      await page.route('**/api/12306/train-route',r=>r.fulfill({json:{success:false,error:'测试查询不可用'}}));
      await add('G2468'); await route('合肥南','上海虹桥'); await page.click('[data-action="rail-complete"]');
      await page.locator('#routeFrom').waitFor(); await page.fill('#routeFrom','杭州东'); await page.click('[data-action="skip"]');
      assert.equal(await page.inputValue('#previewOrigin'),'杭州东'); await save(); await page.unroute('**/api/12306/train-route');
    });
    await check('successful station lookup applies the selected interval then saves', async () => {
      await page.route('**/api/12306/train-route',r=>r.fulfill({json:{success:true,stations:[
        {station_name:'上海虹桥',start_time:'09:00',arrive_time:'----'}, {station_name:'杭州东',start_time:'10:05',arrive_time:'10:00'}, {station_name:'宁波',start_time:'----',arrive_time:'11:00'}]}}));
      await add('G9988'); await page.click('[data-action="rail-complete"]'); await page.locator('#pickFrom').waitFor();
      await page.selectOption('#pickTo','1'); await page.click('[data-action="confirm"]');
      assert.equal(await page.inputValue('#previewDestination'),'杭州东'); await save(); await page.unroute('**/api/12306/train-route');
    });
    await check('late railway responses cannot replace a form after returning', async () => {
      await page.route('**/api/12306/train-route',async r => { await sleep(300); await r.fulfill({json:{success:false,error:'delayed'}}); });
      await add('G1010'); await page.click('[data-action="rail-complete"]'); await page.click('[data-action="skip"]');
      await route('北京','上海'); await sleep(400); assert.equal(await page.inputValue('#previewOrigin'),'北京');
      await page.click('[data-action="discard"]'); await page.unroute('**/api/12306/train-route');
    });
    await check('HTTP 500 keeps new records after reload, and retry persists them', async () => {
      await page.route('**/api/data/trips',r=>r.request().method()==='PUT'?r.fulfill({status:500,json:{error:'test'}}):r.continue());
      await add('G9999'); await route('北京','上海'); await page.click('[data-action="save"]');
      await page.locator('#retrySave').waitFor(); await page.reload(); await page.locator('#retrySave').waitFor();
      assert.match(await page.locator('#tripStrip').innerText(), /G9999/); await shot('pending-sync');
      await page.unroute('**/api/data/trips'); await page.click('#retrySave'); await saved();
      const records = await (await context.request.get(`${url}/api/data/trips`)).json(); assert(records.some(r=>r.title==='G9999'));
    });
    await check('record search, month and transport filters find old trips', async () => {
      await page.click('#allRecords'); await page.fill('#recordSearch','CA1234'); await page.fill('#recordMonth','2026-09'); await page.selectOption('#recordMode','flight');
      assert.equal(await page.locator('.record-row').count(),1); await page.click('.record-row');
      assert.match(await page.locator('#heroOverlay').innerText(),/CA1234/);
    });
    await check('CSV picker previews valid, duplicate and invalid rows before applying', async () => {
      await page.click('#moreMenu summary');
      const chooser = page.waitForEvent('filechooser'); await page.click('.import-csv');
      await (await chooser).setFiles({name:'review.csv',mimeType:'text/csv',buffer:Buffer.from('train_no,travel_date,from_station,to_station\nG8801,2026-09-01,合肥南,上海虹桥\nG8801,2026-09-01,合肥南,上海虹桥\n,2026-09-01,,\n')});
      await page.locator('#importDialog[open]').waitFor(); assert.match(await page.locator('#importPreview').innerText(),/重复 1 条 · 无效 1 条/);
      await page.click('#confirmImport'); await saved(); assert.match(await page.locator('#tripStrip').innerText(),/G8801/);
    });
    await check('invalid JSON cannot be restored and a valid replacement is reversible', async () => {
      await page.locator('#importJsonFile').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({trips:[{id:'bad',mode:'rail'}]}))});
      await page.locator('#importDialog[open]').waitFor(); assert(await page.locator('#confirmImport').isDisabled()); await page.click('#importDialog [data-close-dialog]');
      await page.locator('#importJsonFile').setInputFiles({name:'empty.json',mimeType:'application/json',buffer:Buffer.from('{"trips":[]}')});
      await page.locator('#importDialog[open]').waitFor(); await page.click('#confirmImport'); await saved(); assert.equal(await page.locator('.trip-card').count(),0);
      await page.click('#moreMenu summary'); await page.click('#restorePrevious'); await page.click('#confirmImport'); await saved(); assert((await page.locator('.trip-card').count())>0);
    });
    await check('editing legacy notes preserves an existing mileage with unknown source', async () => {
      const legacy = {id:'legacy',mode:'rail',title:'G8008',date:'2026-09-01',origin:'北京',destination:'上海',status:'completed',distanceKm:777,notes:'原有备注'};
      await page.locator('#importJsonFile').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([legacy]))});
      await page.locator('#importDialog[open]').waitFor(); await page.click('#confirmImport'); await saved();
      await page.click('[data-action="edit"]'); await page.click('#editorExtra summary'); await page.fill('#previewNotes','仅更新备注'); await save();
      const records = await (await context.request.get(`${url}/api/data/trips`)).json(); assert.equal(records[0].distanceKm,777); assert.equal(records[0].distanceSource,'unknown');
      await page.click('#moreMenu summary'); await page.click('#restorePrevious'); await page.click('#confirmImport'); await saved();
    });
    await check('300 records stay in a short strip and older selections remain visible', async () => {
      const records = Array.from({length:300},(_,i)=>({id:`archive-${i}`,title:`ARCHIVE-${String(i).padStart(4,'0')}`,mode:'rail',date:`2024-01-${String(i%28+1).padStart(2,'0')}`,origin:'上海虹桥',destination:'杭州东',status:'completed',distanceKm:150,distanceSource:'estimated'}));
      await page.locator('#importJsonFile').setInputFiles({name:'archive.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(records))});
      await page.locator('#importDialog[open]').waitFor(); await page.click('#confirmImport'); await saved();
      assert.equal(await page.locator('.trip-card').count(),20); const strip=await page.locator('.bottom-panel').boundingBox(); assert(strip.height<160);
      await page.click('#allRecords'); await page.click('#clearRecordFilters'); await page.fill('#recordSearch','ARCHIVE-0299'); assert.equal(await page.locator('.record-row').count(),1);
      await page.click('.record-row'); assert.match(await page.locator('.trip-card.active').innerText(),/ARCHIVE-0299/);
      await page.click('#moreMenu summary'); await page.click('#restorePrevious'); await page.click('#confirmImport'); await saved();
    });
    await check('stale API writes are rejected and removed ticket routes stay absent', async () => {
      const original = await context.request.get(`${url}/api/data/trips`); const records = await original.json(); const etag=original.headers().etag; assert(etag);
      const results = await Promise.all([1,2].map(n=>context.request.put(`${url}/api/data/trips`,{headers:{'If-Match':etag},data:records.map((r,i)=>i? r:{...r,notes:`revision-${n}`})})));
      assert.deepEqual(results.map(r=>r.status()).sort(),[200,412]);
      const latest = await context.request.get(`${url}/api/data/trips`); await context.request.put(`${url}/api/data/trips`,{headers:{'If-Match':latest.headers().etag},data:records});
      for(const endpoint of ['query-tickets','query-ticket-price']) assert.equal((await context.request.get(`${url}/api/12306/${endpoint}`)).status(),404);
      await page.reload(); await page.locator('#appShell').waitFor(); await saved();
    });
    await check('account switching does not expose another account draft or trips', async () => {
      await add('G4000'); await route('北京','上海'); await page.click('#pauseEditor');
      await page.click('#moreMenu summary'); await page.click('#logoutButton'); await page.locator('#authGate').waitFor();
      await page.click('#registerTab'); await page.fill('#authUsername',username+'b'); await page.fill('#authPassword',password); await page.fill('#authPasswordConfirm',password); await page.click('#authSubmit');
      await page.locator('#appShell').waitFor(); await saved(); assert.equal(await page.locator('.trip-card').count(),0); assert(await page.locator('#resumeDraft').isHidden());
      await page.click('#moreMenu summary'); await page.click('#logoutButton'); await page.locator('#authGate').waitFor();
      await page.fill('#authUsername',username); await page.fill('#authPassword',password); await page.click('#authSubmit'); await page.locator('#appShell').waitFor(); await saved();
      await page.click('#resumeDraft'); assert.equal(await page.inputValue('#previewTitle'),'G4000'); await page.click('[data-action="discard"]');
    });
    assert.deepEqual(errors, []); console.log(`${results.length} browser checks passed.`);
  } finally {
    await shot('last-state').catch(()=>{});
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,errors},null,2));
    await browser.close(); if(server) server.kill();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
