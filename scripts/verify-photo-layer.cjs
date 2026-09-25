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
const first = { photoId: 'test-a', latitude: 40, longitude: 25, category: 'Şehirler', locationSource: 'exif', locationAccuracy: 'exact', title: 'Başlık', placeName: '<test>', city: 'Test', district: 'Merkez', dateTaken: '2026-05-29T09:59:22', imageUrl: 'https://example.com/a.jpg', thumbnailUrl: 'https://example.com/a-small.jpg' };
const second = { ...first, photoId: 'test-b', longitude: 25.00001, imageUrl: 'https://example.com/b.jpg', locationSource: 'folder', locationAccuracy: 'city', dateTaken: null };
assert(!api.valid({ ...first, latitude: NaN }));
assert(!api.valid({ ...first, longitude: 181 }));
assert(!api.valid({ ...first, locationSource: 'guess' }));
assert(!api.valid({ ...first, locationAccuracy: 'approximate' }));
assert(!api.valid({ ...first, locationSource: 'folder' }));
assert(api.valid({ ...first, locationSource: 'manual', locationAccuracy: 'city' }));
assert(api.valid({ ...first, category: 'Kuşlar', locationSource: 'filename', locationAccuracy: 'approximate' }));
assert(!api.valid({ ...first, latitude: 0, longitude: 0 }));
const map = { getProjection: () => ({ fromLatLngToPoint: p => ({ x: p.lng, y: p.lat }) }), getZoom: () => 6, addListener: () => ({ remove() {} }) };
const summary = {};
const mounted = api.mount(map, [first, second, { ...first, latitude: null }], summary);
assert.equal(imageLoads, 0);
assert.equal(layer.features.length, 1);
assert.equal(layer.features[0].getProperty('count'), 2);
assert.equal(layer.features[0].getProperty('accuracy'), 'exact');
layer.click({ feature: layer.features[0] });
assert.equal(imageLoads, 1);
const byClass = name => info.content.children.find(x => String(x.className).split(' ').includes(name));
assert.equal(info.content.children[0].src, first.thumbnailUrl);
assert.equal(byClass('map-photo-count').textContent, 'Bu noktada 2 fotoğraf');
assert.equal(byClass('map-photo-title').textContent, '<test>');
assert.equal(byClass('map-photo-area').textContent, 'Merkez / Test');
assert(byClass('map-photo-date').textContent.includes('2026'));
assert.equal(byClass('map-photo-accuracy').textContent, 'Kesin konum (GPS)');
assert.equal(byClass('map-photo-links').children[0].textContent, 'Fotoğrafı Gör');
assert.equal(byClass('map-photo-links').children[0].href, first.imageUrl);
assert.equal(new URL(byClass('map-photo-links').children[1].href).searchParams.get('destination'), '40,25');
byClass('map-photo-pager').children[2].events.click();
assert.equal(byClass('map-photo-links').children[0].href, second.imageUrl);
assert.equal(byClass('map-photo-links').children.length, 1, 'city-level photos get no directions link');
assert.equal(byClass('map-photo-date'), undefined);
assert.equal(byClass('map-photo-accuracy').textContent, 'Şehir / ilçe düzeyinde konum');
assert.equal(api.groupPhotos([first, first], p => ({ x: p.longitude, y: p.latitude })).length, 1);
mounted.destroy();
assert.equal(layer.map, null);
// Published dataset: generated, consistent with the rules, never contains private collections or unresolved photos.
const mapLocations = require('./build-map-locations.cjs');
const fresh = mapLocations.build();
assert.equal(fs.readFileSync('harita/map-photos.js', 'utf8'), mapLocations.dataset(fresh.photos), 'map-photos.js is stale');
const report = JSON.parse(fs.readFileSync('reports/map-locations.json', 'utf8'));
assert.deepEqual(report.summary, fresh.summary, 'reports/map-locations.json is stale');
assert(fresh.photos.every(api.valid));
assert(fresh.photos.every(p => /^images\/(KONULAR|ŞEHİRLER)\//.test(p.photoId)));
assert(fresh.photos.every(p => p.locationAccuracy !== 'exact' || p.locationSource === 'exif'));
const mapped = new Set(fresh.photos.map(p => p.photoId));
assert(report.unresolvedLocations.every(u => !mapped.has(u.photoId) && u.reason));
assert.equal(report.summary.totalPhotos, report.summary.mapped + report.summary.unresolved);
assert.equal(report.summary.mapped, report.summary.exact + report.summary.approximate + report.summary.city);
vm.runInContext(fs.readFileSync('harita/city-photos.js', 'utf8'), context);
const inventory = JSON.parse(fs.readFileSync('reports/city-gps-inventory.json', 'utf8'));
assert.equal(context.window.MAVI_MAP_PHOTOS.length, inventory.summary.validGps);
assert.equal(inventory.files.filter(x => x.status === 'missingGps').length, inventory.summary.missingGps);
assert(inventory.files.every(x => x.path.startsWith('images/ŞEHİRLER/')));
console.log('PASS: location contract, grouping, lazy popup images, popup fields, paging, photo/directions URLs, cleanup, fresh map dataset (' + fresh.summary.mapped + ' mapped / ' + fresh.summary.unresolved + ' unresolved). Maps/DOM mocked.');
