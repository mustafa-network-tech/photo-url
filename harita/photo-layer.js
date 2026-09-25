/* Separate Google Maps Data layer: no extra API, marker library or map ID.
 * Nearby photos share a screen-grid point; popup paging preserves access to all.
 * Coordinates come only from EXIF GPS (exact) or reviewed place records in
 * harita/location-rules.json (approximate / city); unmatched photos never reach the map.
 */
(function(root) {
  'use strict';
  const SOURCES = ['exif', 'metadata', 'folder', 'filename', 'manual'];
  const ACCURACY = {
    exact: { label: 'Kesin konum (GPS)', color: '#315c45' },
    approximate: { label: 'Yaklaşık konum', color: '#4f7d63' },
    city: { label: 'Şehir / ilçe düzeyinde konum', color: '#b95f3d' }
  };
  function valid(photo) {
    return Boolean(photo) && Object.hasOwn(ACCURACY, photo.locationAccuracy) && SOURCES.includes(photo.locationSource) &&
      (photo.locationAccuracy === 'exact') === (photo.locationSource === 'exif') &&
      Number.isFinite(photo.latitude) && Math.abs(photo.latitude) <= 90 &&
      Number.isFinite(photo.longitude) && Math.abs(photo.longitude) <= 180 &&
      !(photo.latitude === 0 && photo.longitude === 0);
  }
  function directions(photo) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(photo.latitude + ',' + photo.longitude);
  }
  function formatDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  }
  function groupPhotos(photos, project) {
    const groups = new Map();
    for (const photo of photos.filter(valid)) {
      const point = project(photo);
      const key = Math.floor(point.x / 48) + ':' + Math.floor(point.y / 48);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(photo);
    }
    return [...groups.values()];
  }
  // A group is drawn with its most precise member's style.
  function groupAccuracy(members) {
    return Object.keys(ACCURACY).find(level => members.some(photo => photo.locationAccuracy === level)) || 'city';
  }
  function text(tag, className, value) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = value;
    return node;
  }
  function popup(photos) {
    const box = document.createElement('article');
    box.className = 'map-photo-popup';
    let index = 0;
    function render() {
      const photo = photos[index];
      const image = document.createElement('img');
      image.src = photo.thumbnailUrl || photo.imageUrl;
      image.alt = photo.title || 'Arşiv fotoğrafı';
      image.loading = 'lazy';
      image.decoding = 'async';
      const nodes = [image];
      if (photos.length > 1) nodes.push(text('p', 'map-photo-count', 'Bu noktada ' + photos.length + ' fotoğraf'));
      nodes.push(text('h3', 'map-photo-title', photo.placeName || photo.title || 'Fotoğraf'));
      const area = [photo.district, photo.city].filter((value, i, all) => value && all.indexOf(value) === i && value !== photo.placeName).join(' / ');
      if (area) nodes.push(text('p', 'map-photo-area', area));
      if (photo.category) nodes.push(text('p', 'map-photo-category', photo.category));
      const date = formatDate(photo.dateTaken);
      if (date) nodes.push(text('p', 'map-photo-date', 'Çekim tarihi: ' + date));
      nodes.push(text('p', 'map-photo-accuracy map-photo-accuracy--' + photo.locationAccuracy, ACCURACY[photo.locationAccuracy].label));
      const links = document.createElement('div');
      links.className = 'map-photo-links';
      const targets = [['Fotoğrafı Gör', photo.imageUrl]];
      if (photo.locationAccuracy !== 'city') targets.push(['Buraya Git', directions(photo)]);
      for (const [label, href] of targets) {
        const link = document.createElement('a');
        link.textContent = label;
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        links.append(link);
      }
      nodes.push(links);
      box.replaceChildren(...nodes);
      if (photos.length > 1) {
        const pager = document.createElement('div');
        pager.className = 'map-photo-pager';
        const count = document.createElement('span');
        count.textContent = (index + 1) + ' / ' + photos.length;
        count.setAttribute('aria-live', 'polite');
        for (const [label, delta] of [['Önceki', -1], ['Sonraki', 1]]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.addEventListener('click', () => {
            index = (index + delta + photos.length) % photos.length;
            render();
            box.querySelector(delta < 0 ? 'button' : 'button:last-child').focus();
          });
          pager.append(button);
        }
        pager.prepend(count);
        box.append(pager);
      }
    }
    render();
    return box;
  }
  function mount(map, input, summary) {
    const photos = input.filter(valid);
    if (!photos.length) {
      summary.textContent = 'Haritada gösterilecek konumlu fotoğraf yok.';
      return { destroy() {} };
    }
    const layer = new google.maps.Data({ map });
    const info = new google.maps.InfoWindow({ maxWidth: 300 });
    let groups = [];
    layer.setStyle(feature => {
      const count = feature.getProperty('count');
      const level = ACCURACY[feature.getProperty('accuracy')];
      return {
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: count > 99 ? 19 : count > 9 ? 16 : 13, fillColor: level.color, fillOpacity: 1, strokeColor: '#fffdf8', strokeWeight: 2 },
        label: { text: String(count), color: '#fffdf8', fontSize: '12px', fontWeight: '600' },
        title: count + ' fotoğraf · ' + level.label, cursor: 'pointer'
      };
    });
    function redraw() {
      const projection = map.getProjection();
      if (!projection) return;
      const scale = 2 ** map.getZoom();
      groups = groupPhotos(photos, photo => {
        const point = projection.fromLatLngToPoint(new google.maps.LatLng(photo.latitude, photo.longitude));
        return { x: point.x * scale, y: point.y * scale };
      });
      layer.forEach(feature => layer.remove(feature));
      groups.forEach((members, index) => layer.add({
        id: index, geometry: new google.maps.Data.Point({ lat: members[0].latitude, lng: members[0].longitude }),
        properties: { index, count: members.length, accuracy: groupAccuracy(members) }
      }));
      summary.textContent = photos.length + ' fotoğraf · ' + groups.length + ' harita noktası';
    }
    const click = layer.addListener('click', event => {
      const members = groups[event.feature.getProperty('index')];
      info.setContent(popup(members));
      info.setPosition(event.feature.getGeometry().get());
      info.open({ map });
    });
    const idle = map.addListener('idle', redraw);
    redraw();
    return { destroy() { click.remove(); idle.remove(); info.close(); layer.setMap(null); } };
  }
  root.PhotoMapLayer = { valid, directions, groupPhotos, groupAccuracy, popup, mount, ACCURACY };
})(typeof window === 'undefined' ? globalThis : window);
