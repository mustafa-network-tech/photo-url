const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const config = require('./map-config.cjs');
const source = fs.readFileSync('harita/photo-map.js', 'utf8');

function boot(apiKey, width = 1200, throws = false) {
  const nodes = new Map();
  const scripts = [];
  const maps = [];
  let timeout;
  const context = {
    window: {}, URLSearchParams,
    document: {
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, { hidden: false, clientWidth: width });
        return nodes.get(id);
      },
      createElement: () => ({}), head: { append: script => scripts.push(script) }
    },
    google: { maps: { Map: function(element, options) {
      if (throws) throw Error('Initialization failed');
      maps.push({ element, options });
    } } },
    setTimeout: callback => { timeout = callback; return 1; },
    clearTimeout: () => { timeout = null; }
  };
  vm.createContext(context);
  vm.runInContext(config({ PUBLIC_GOOGLE_MAPS_API_KEY: apiKey, ARCHIVE_PASSWORD: 'never-export-this' }), context);
  vm.runInContext(source, context);
  return { context, nodes, scripts, maps, expire: () => timeout() };
}

(async () => {
  assert(!config({ ARCHIVE_PASSWORD: 'never-export-this' }).includes('never-export-this'));
  const missing = boot('');
  assert.equal(missing.scripts.length, 0);
  assert(missing.nodes.get('map-status-detail').textContent.includes('PUBLIC_GOOGLE_MAPS_API_KEY'));
  for (const [width, zoom] of [[360, 4], [800, 5], [1440, 6]]) {
    const app = boot('test-only', width);
    assert.equal(app.scripts.length, 1);
    const url = new URL(app.scripts[0].src);
    assert.equal(url.origin, 'https://maps.googleapis.com');
    assert.equal(url.searchParams.get('loading'), 'async');
    assert.equal(url.searchParams.has('libraries'), false);
    app.context.window.initMaviPhotoMap();
    assert.equal(app.maps.length, 1);
    assert.equal(app.maps[0].options.zoom, zoom);
    assert.equal(app.maps[0].options.center.lat, 39);
    assert.equal(app.maps[0].options.center.lng, 35);
    assert.equal(app.nodes.get('map-status').hidden, true);
    app.context.window.gm_authFailure();
    assert.equal(app.nodes.get('map-status').hidden, false);
    assert.equal(app.nodes.get('photo-map').hidden, true);
  }
  const offline = boot('test-only');
  offline.scripts[0].onerror();
  assert(offline.nodes.get('map-status-detail').textContent.includes('Bağlantınızı'));
  const slow = boot('test-only');
  slow.expire();
  slow.context.window.initMaviPhotoMap();
  assert.equal(slow.maps.length, 0);
  const broken = boot('test-only', 1200, true);
  broken.context.window.initMaviPhotoMap();
  assert.equal(broken.nodes.get('map-status').hidden, false);

  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8768';
  for (const route of ['/harita', '/harita/']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes('id="photo-map"'));
    assert(!html.includes('src="/gallery-data.js"'));
    for (const match of html.matchAll(/(?:src|href)="(\/[^\"]+)"/g)) {
      assert.equal((await fetch(base + match[1])).status, 200, match[1]);
    }
  }
  const home = await (await fetch(base + '/')).text();
  assert(home.includes('href="/harita"'));
  assert(!home.includes('maps.googleapis.com/maps/api/js'));
  console.log('PASS: routes/assets/navigation; missing key; desktop/tablet/mobile zoom; async loader; auth/network/timeout/initialization failures; secret isolation. Google API mocked; browser layout not tested.');
})().catch(error => { console.error(error); process.exitCode = 1; });
