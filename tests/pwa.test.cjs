'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');

function worker() {
  const handlers = {}, entries = new Map(), deleted = [];
  const scope = 'https://example.com/FitQuest/';
  let network = false, claimed = false;
  const cache = {
    async addAll(requests) { for (const r of requests) entries.set(r.url, new Response('cached:' + new URL(r.url).pathname)); },
    async match(key) { return entries.get(typeof key === 'string' ? key : key.url)?.clone(); },
  };
  const context = vm.createContext({ URL, Request, Response, Set,
    self: { registration: { scope }, clients: { async claim() { claimed = true; } },
      addEventListener: (name, handler) => { handlers[name] = handler; } },
    caches: { async open() { return cache; }, async keys() { return ['unrelated-cache', 'fitquest-shell-old', 'fitquest-shell-20261015-v23']; },
      async delete(name) { deleted.push(name); } },
    fetch: async () => { if (!network) throw Error('offline'); return new Response('network'); },
  });
  vm.runInContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), context);
  async function lifecycle(name) {
    let promise; handlers[name]({ waitUntil: p => { promise = p; } }); await promise;
  }
  async function fetchFile(relative, options = {}) {
    let response;
    handlers.fetch({ request: { url: new URL(relative, scope).href, method: 'GET', mode: 'cors', ...options },
      respondWith: p => { response = p; } });
    return response ? (await response).text() : null;
  }
  return { lifecycle, fetchFile, entries, deleted, claimed: () => claimed, context };
}

test('manifest supports subpath installation and correctly sized PNG icons', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
  assert.equal(m.start_url, './'); assert.equal(m.scope, './'); assert.equal(m.display, 'standalone');
  for (const icon of m.icons) {
    const png = fs.readFileSync(path.join(root, icon.src));
    const [w,h] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), w); assert.equal(png.readUInt32BE(20), h);
  }
});

test('every precached file exists, including versioned scripts, CSS and all badges', async () => {
  const w = worker(); await w.lifecycle('install');
  for (const url of w.entries.keys()) {
    const file = decodeURIComponent(new URL(url).pathname.slice('/FitQuest/'.length)) || 'index.html';
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  const configContext = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), configContext);
  for (const artwork of Object.values(configContext.FitQuestConfig.themeArtwork)) {
    assert.ok(w.entries.has(new URL(artwork, 'https://example.com/FitQuest/').href), artwork);
  }
  const index = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const refs = [...index.matchAll(/(?:src|href)="([^"#]+)"/g)].map(m => m[1]);
  for (const ref of refs) {
    const url = new URL(ref, 'https://example.com/FitQuest/');
    if (url.pathname.includes('/assets/')) url.search = '';
    assert.ok(w.entries.has(url.href), ref);
  }
  for (const icon of fs.readdirSync(path.join(root,'assets/icons')).filter(f => f.endsWith('.svg')))
    assert.ok(w.entries.has('https://example.com/FitQuest/assets/icons/' + icon));
});

test('cached navigation and versioned badges work with the network unavailable', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.equal(await w.fetchFile('./?dev', { mode: 'navigate' }), 'cached:/FitQuest/index.html');
  assert.equal(await w.fetchFile('assets/icons/rank-gold.svg?v=badge'), 'cached:/FitQuest/assets/icons/rank-gold.svg');
  assert.ok((await w.fetchFile('js/fitville.js?v=20261015-visible-test-tools')).includes('fitville.js'));
});

test('worker leaves other apps, unknown versions and non-GET requests alone', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.equal(await w.fetchFile('https://example.com/MazeGame/', { mode: 'navigate' }), null);
  assert.equal(await w.fetchFile('https://elsewhere.example/icon.svg'), null);
  assert.equal(await w.fetchFile('js/fitville.js?v=unknown'), null);
  assert.equal(await w.fetchFile('./', { method: 'POST' }), null);
});

test('activation removes only old FitQuest caches', async () => {
  const w = worker(); await w.lifecycle('activate');
  assert.deepEqual(w.deleted, ['fitquest-shell-old']);
  assert.equal(w.claimed(), true);
});

test('developer installation has its own identity and launches into Developer Mode', () => {
  const normal=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest')));
  const dev=JSON.parse(fs.readFileSync(path.join(root,'manifest-dev.webmanifest')));
  assert.notEqual(dev.id,normal.id);
  assert.equal(new URL(dev.start_url,'https://example.com/FitQuest/').search,'?dev');
  assert.equal(dev.short_name,'FitQuest Dev');
  for(const icon of dev.icons){
    const png=fs.readFileSync(path.join(root,icon.src));
    const [w,h]=icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);
    assert.ok(!normal.icons.some(other=>other.src===icon.src));
  }
});

test('only explicit developer URLs select developer installation metadata', () => {
  const source=fs.readFileSync(path.join(root,'js/app-metadata.js'),'utf8');
  for(const search of ['', '?dev', '?test=1', '?test=0']){
    const nodes=new Map();
    const context=vm.createContext({URLSearchParams,location:{search},document:{title:'FitQuest',querySelector(selector){
      if(!nodes.has(selector))nodes.set(selector,{href:'normal',content:'normal'});
      return nodes.get(selector);
    }}});
    vm.runInContext(source,context);
    const dev=search==='?dev'||search==='?test=1';
    assert.equal(context.document.title,dev?'FitQuest Dev':'FitQuest');
    if(dev){
      assert.equal(nodes.get('link[rel="manifest"]').href,'manifest-dev.webmanifest');
      assert.equal(nodes.get('link[rel="apple-touch-icon"]').href,'assets/app/icon-dev-180.png');
    }else assert.equal(nodes.size,0);
  }
});
