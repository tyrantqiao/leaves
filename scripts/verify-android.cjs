const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.LEAVES_PLAYWRIGHT_PATH || 'playwright');
async function main() {
  const port = 4188, serverUrl = `http://127.0.0.1:${port}`, appUrl = 'https://leaves.android.local';
  const server = spawn(process.execPath, ['apps/desktop-prototype/dev-server.js'], {env:{...process.env,LEAVES_PORT:String(port), LEAVES_DATA_DIR:fs.mkdtempSync(path.join(os.tmpdir(),'leaves-android-'))},windowsHide:true,stdio:'pipe'});
  let browser;
  try {
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('prototype running')){clearTimeout(timer);resolve();}});server.once('exit',reject);});
    browser = await chromium.launch({headless:true,channel:'msedge'});
    const context = await browser.newContext({viewport:{width:390,height:700}});
    const peer = await browser.newContext();
    let offline = true, calls = 0;
    await context.exposeBinding('nativeRequest', async ({page},id,url,method,body,headers) => {
      calls++;
      let payload;
      try {
        if(offline) throw Error('offline');
        const result = await context.request.fetch(url,{method,headers:JSON.parse(headers),...(body ? {data:body} : {})});
        payload={status:result.status(),headers:result.headers(),body:await result.text()};
      } catch(error) {payload={error:error.message};}
      await page.evaluate(({id,payload})=>window.LeavesAndroidNetwork.resolve(id,payload),{id,payload}).catch(()=>{});
    });
    await context.addInitScript(()=>{
      window.LeavesAndroid={request(...args){window.nativeRequest(...args);},cancelRequest(){},exportJson(text,name){window.exportedBackup={text,name};},legacyData(){return 'null';},showUpdates(){window.updatesOpened=true;}};
    });
    const serveBundled = async route=>{
      const target = new URL(route.request().url());
      if(target.origin!==appUrl) return route.abort();
      const relative=target.pathname==='/' ? 'index.html' : target.pathname.slice(1);
      const file=path.join('apps/desktop-prototype',relative);
      if(!fs.existsSync(file))return route.abort();
      let body=fs.readFileSync(file);
      if(relative==='index.html')body=Buffer.from(body.toString().replace('</head>','<script src="./android-offline.js"></script></head>'));
      const type=relative.endsWith('.html')?'text/html':relative.endsWith('.js')?'application/javascript':relative.endsWith('.css')?'text/css':relative.endsWith('.png')?'image/png':'application/json';
      return route.fulfill({contentType:type,body});
    };
    await context.route('**/*',serveBundled);
    const page=await context.newPage();page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const localSaved = () => page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='已保存到本机');
    const synced = () => page.waitForFunction(()=>document.querySelector('#saveStatus').textContent==='已保存');
    async function add(title,from,to) {
      await page.fill('#tripInput',title);await page.click('#quickAddForm button');await page.fill('#previewOrigin',from);await page.fill('#previewDestination',to);await page.click('[data-action="save"]');
    }
    async function settings() {await page.click('#moreMenu summary');await page.click('#androidSyncButton');}
    async function close() {await page.click('#androidCloseSync');}
    async function login(username,mode='login') {
      await settings();await page.fill('#androidServer',serverUrl);await page.fill('#androidUsername',username);await page.fill('#androidPassword','Android-test-1234');await page.selectOption('#androidAuthMode',mode);await page.click('#androidConnectSync');await page.waitForFunction(name=>currentUser.username===name && !document.querySelector('#androidConnectSync').disabled,username);await synced();
    }
    const getPeer=async()=>await (await peer.request.get(serverUrl+'/api/data/trips')).json();
    async function putPeer(records) {
      const result=await peer.request.get(serverUrl+'/api/data/trips');
      const saved=await peer.request.put(serverUrl+'/api/data/trips',{headers:{'If-Match':result.headers().etag},data:records});assert(saved.ok());
    }
    await page.goto(appUrl+'/#offline');await page.locator('#appShell').waitFor();await localSaved();assert(await page.locator('#authGate').isHidden());assert.equal(calls,0);
    await add('CA1234','北京首都国际机场','上海虹桥国际机场');await localSaved();await add('G1234','上海虹桥','杭州东');await localSaved();
    await page.reload();await page.locator('#appShell').waitFor();await localSaved();assert.equal(await page.locator('.trip-card').count(),2);assert.equal(calls,0);
    await page.waitForFunction(()=>typeof map!=='undefined' && map && window.LEAVES_WORLD_LAND);await page.click('[data-action="overview"]');await page.evaluate(()=>map.setView([20,20],0));
    assert(await page.locator('.route-flow').count()>0);assert(await page.locator('.leaflet-offlineBase-pane path').count()>0);
    for(const [width,height] of [[360,640],[390,700],[430,740]]) {await page.setViewportSize({width,height});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);assert(await page.evaluate(()=>document.querySelector('.bottom-panel').getBoundingClientRect().bottom<=innerHeight+1));}
    fs.mkdirSync('exports/android',{recursive:true});await page.screenshot({path:'exports/android/standalone-world.png'});
    await page.click('#moreMenu summary');await page.click('.export-json');const backup=await page.evaluate(()=>window.exportedBackup);const seed=JSON.parse(backup.text).trips;assert.equal(seed.length,2);
    console.log('PASS fresh install starts without server, offline add/restart/export, mobile layout and world map');
    await page.click('#moreMenu summary');await page.click('#androidUpdatesButton');assert(await page.evaluate(()=>window.updatesOpened));
    assert((await peer.request.post(serverUrl+'/api/auth/register',{data:{username:'androidtest',password:'Android-test-1234'}})).ok());
    await putPeer([{...seed[0],id:'peer-trip',title:'MU9876'}]);offline=false;
    await login('androidtest');await close();assert.equal(await page.locator('.trip-card').count(),3);assert.equal((await getPeer()).length,3);
    await putPeer((await getPeer()).filter(t=>t.id!=='peer-trip'));await settings();await page.click('#androidSyncNow');await synced();await close();assert.equal(await page.locator('.trip-card').count(),2);
    await settings();await page.click('#androidPauseSync');await localSaved();await close();offline=true;
    await add('MU3456','广州白云国际机场','上海虹桥国际机场');await localSaved();
    await page.evaluate(()=>{const updated=trips.filter(t=>t.title!=='G1234').map(t=>({...t,notes:'手机离线修改'}));trips=updated;render();persistTrips();});await localSaved();
    await page.reload();await page.locator('#appShell').waitFor();await localSaved();assert.equal(await page.locator('.trip-card').count(),2);
    const remoteRecords=await getPeer();await putPeer([...remoteRecords.map(t=>({...t,notes:'电脑修改'})),{...seed[0],id:'peer-new',title:'CA9876'}]);offline=false;
    await settings();await page.click('#androidPauseSync');await synced();await close();
    const merged=await getPeer();assert.equal(merged.length,3);assert(merged.some(t=>t.title==='MU3456'));assert(merged.some(t=>t.id==='peer-new'));assert(!merged.some(t=>t.title==='G1234'));assert.equal(merged.find(t=>t.title==='CA1234').notes,'手机离线修改');
    await settings();await page.click('#androidServerBackup');assert(JSON.parse((await page.evaluate(()=>window.exportedBackup)).text).trips.some(t=>t.notes==='电脑修改'));await close();
    console.log('PASS first merge preserves both devices, peer deletion, paused offline edits/deletion, reconnect merge and conflict backup');
    await login('androidother','register');await close();assert.equal(await page.locator('.trip-card').count(),0);
    await add('CA4321','北京首都国际机场','上海虹桥国际机场');await synced();
    await context.request.post(serverUrl+'/api/auth/logout');await settings();await page.click('#androidSyncNow');await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('需重新登录'));await close();
    assert(await page.locator('#appShell').isVisible());assert.equal(await page.locator('.trip-card').count(),1);
    offline=true;await page.reload();await page.locator('#appShell').waitFor();await localSaved();assert.equal(await page.locator('.trip-card').count(),1);
    await add('G4321','上海虹桥','杭州东');await localSaved();assert.equal(await page.locator('.trip-card').count(),2);
    offline=false;await login('androidtest');await close();assert.equal(await page.locator('.trip-card').count(),3);
    assert.deepEqual(errors,[]);
    console.log('PASS account isolation, expired session keeps app usable, offline relaunch and return to previous account');
    const migrated = await browser.newContext({viewport:{width:390,height:700}});
    const legacy = {
      'leaves.android.lastUser':JSON.stringify({id:'legacy-user',username:'旧版账号'}),
      'leaves.prototype.trips.v2.legacy-user.outbox':JSON.stringify({base:[],trips:[seed[0]],dirty:true}),
      'leaves.prototype.trips.v2.legacy-other.outbox':JSON.stringify({base:[],trips:[seed[1]],dirty:true}),
      'leaves.prototype.trips.v2.legacy-user.beforeSync':JSON.stringify([seed[0]]),
      'leaves.prototype.serviceProfiles.legacy-user':JSON.stringify({test:'preserved'})
    };
    await migrated.addInitScript(({legacy,serverUrl})=>{
      window.LeavesAndroid={legacyData(){return localStorage.getItem('migration-done')?'null':JSON.stringify(legacy);},legacyServer(){return serverUrl;},finishMigration(){localStorage.setItem('migration-done','yes');},request(){throw Error('migration must stay offline');},exportJson(){}};
    },{legacy,serverUrl});
    await migrated.route('**/*',serveBundled);
    const migratedPage=await migrated.newPage();await migratedPage.goto(appUrl+'/#offline');await migratedPage.locator('#appShell').waitFor();assert.equal(await migratedPage.locator('.trip-card').count(),1);
    const migratedState=await migratedPage.evaluate(server=>{
      const prefix=`android:${encodeURIComponent(server)}:`;
      return {state:JSON.parse(localStorage.getItem('leaves.android.workspace.v1')),other:JSON.parse(localStorage.getItem(`leaves.prototype.trips.v2.${prefix}legacy-other.outbox`)),memory:JSON.parse(localStorage.getItem(`leaves.prototype.serviceProfiles.${prefix}legacy-user`))};
    },serverUrl);
    assert.equal(migratedState.state.enabled,false);assert.equal(migratedState.other.trips[0].title,seed[1].title);assert.equal(migratedState.memory.test,'preserved');
    await migratedPage.reload();await migratedPage.locator('#appShell').waitFor();assert.equal(await migratedPage.locator('.trip-card').count(),1);
    await migrated.close();console.log('PASS legacy upgrade preserves active and other account caches without contacting server');
    await peer.close();
  } finally {if(browser)await browser.close();server.kill();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
