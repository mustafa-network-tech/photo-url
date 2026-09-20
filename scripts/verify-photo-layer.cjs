// Synthetic coordinates exist only in isolated tests, never in the published dataset.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; }
  append(...items) { this.children.push(...items); }
  prepend(...items) { this.children.unshift(...items); }
  replaceChildren(...items) { this.children = items; }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
  querySelector(selector) { const buttons = this.children.flatMap(x => x.children || []).filter(x => x.tag === 'button'); return selector.includes('last') ? buttons.at(-1) : buttons[0]; }
  focus() {}
}
let layer, info, imageLoads = 0;
class Data {
  constructor() { layer = this; this.features = []; }
  setStyle(style) { this.style = style; }
  forEach(callback) { [...this.features].forEach(callback); }
  remove(feature) { this.features = this.features.filter(x => x !== feature); }
  add(options) { this.features.push({ getProperty: key => options.properties[key], getGeometry: () => options.geometry }); }
  addListener(name, callback) { this.click = callback; return { remove() {} }; }
  setMap(map) { this.map = map; }
}
Data.Point = class { constructor(position) { this.position = position; } get() { return this.position; } };
const context = { window: {}, document: { createElement: tag => { if (tag === 'img') imageLoads++; return new Element(tag); } }, google: { maps: {
  Data, SymbolPath: { CIRCLE: 0 }, LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng; } },
  InfoWindow: class { constructor() { info = this; } setContent(content) { this.content = content; } setPosition(position) { this.position = position; } open() {} close() {} }
} } };
vm.createContext(context);
vm.runInContext(fs.readFileSync('harita/photo-layer.js', 'utf8'), context);
const api = context.window.PhotoMapLayer;
const first = { id: 'test-a', latitude: 40, longitude: 25, category: 'Şehirler', locationSource: 'exif', exactLocation: true, title: '<test>', location: 'Test', imageUrl: 'https://example.com/a.jpg', thumbnailUrl: 'https://example.com/a-small.jpg', photoUrl: 'https://example.com/a.jpg' };
const second = { ...first, id: 'test-b', longitude: 25.00001, photoUrl: 'https://example.com/b.jpg' };
assert(!api.valid({ ...first, latitude: NaN }));
assert(!api.valid({ ...first, longitude: 181 }));
assert(!api.valid({ ...first, locationSource: 'guess' }));
assert(!api.valid({ ...first, category: 'Konular' }));
assert(!api.valid({ ...first, latitude: 0, longitude: 0 }));
const map = { getProjection: () => ({ fromLatLngToPoint: p => ({ x: p.lng, y: p.lat }) }), getZoom: () => 6, addListener: () => ({ remove() {} }) };
const summary = {};
const mounted = api.mount(map, [first, second, { ...first, latitude: null }], summary);
assert.equal(imageLoads, 0);
assert.equal(layer.features.length, 1);
assert.equal(layer.features[0].getProperty('count'), 2);
layer.click({ feature: layer.features[0] });
assert.equal(imageLoads, 1);
assert.equal(info.content.children[0].src, first.thumbnailUrl);
assert.equal(info.content.children[1].textContent, '<test>');
assert.equal(info.content.children[3].children[0].href, first.photoUrl);
assert.equal(new URL(info.content.children[3].children[1].href).searchParams.get('destination'), '40,25');
info.content.children[4].children[2].events.click();
assert.equal(info.content.children[3].children[0].href, second.photoUrl);
assert.equal(new URL(info.content.children[3].children[1].href).searchParams.get('destination'), '40,25.00001');
assert.equal(api.groupPhotos([first, first], p => ({ x: p.longitude, y: p.latitude })).length, 1);
mounted.destroy();
assert.equal(layer.map, null);
vm.runInContext(fs.readFileSync('harita/city-photos.js', 'utf8'), context);
const inventory = JSON.parse(fs.readFileSync('reports/city-gps-inventory.json', 'utf8'));
assert.equal(context.window.MAVI_MAP_PHOTOS.length, inventory.summary.validGps);
assert.equal(inventory.files.filter(x => x.status === 'missingGps').length, inventory.summary.missingGps);
assert(inventory.files.every(x => x.path.startsWith('images/ŞEHİRLER/')));
console.log('PASS: GPS exclusion, same/near coordinate grouping, lazy popup images, paging, photo/directions URLs, cleanup, real dataset counts. Maps/DOM mocked.');
