/* Separate Google Maps Data layer: no extra API, marker library or map ID.
 * Nearby photos share a screen-grid point; popup paging preserves access to all.
 * Display points always use a member's real coordinate, never an invented GPS.
 */
(function(root) {
  'use strict';
  function valid(photo) {
    return photo.category === 'Şehirler' && photo.locationSource === 'exif' && photo.exactLocation === true &&
      Number.isFinite(photo.latitude) && Math.abs(photo.latitude) <= 90 &&
      Number.isFinite(photo.longitude) && Math.abs(photo.longitude) <= 180 &&
      !(photo.latitude === 0 && photo.longitude === 0);
  }
  function directions(photo) {
    return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(photo.latitude + ',' + photo.longitude);
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
      const title = document.createElement('h3');
      title.textContent = photo.title || 'Fotoğraf';
      const location = document.createElement('p');
      location.textContent = photo.location || '';
      const links = document.createElement('div');
      links.className = 'map-photo-links';
      for (const [label, href] of [['Fotoğrafı Aç', photo.photoUrl], ['Buraya Git', directions(photo)]]) {
        const link = document.createElement('a');
        link.textContent = label;
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        links.append(link);
      }
      box.replaceChildren(image, title, location, links);
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
      summary.textContent = 'Şehirler arşivinde EXIF GPS bilgisi bulunan fotoğraf yok.';
      return { destroy() {} };
    }
    const layer = new google.maps.Data({ map });
    const info = new google.maps.InfoWindow({ maxWidth: 300 });
    let groups = [];
    layer.setStyle(feature => ({
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 15, fillColor: '#315c45', fillOpacity: 1, strokeColor: '#fffdf8', strokeWeight: 2 },
      label: { text: String(feature.getProperty('count')), color: '#fffdf8', fontSize: '12px' },
      title: feature.getProperty('count') + ' fotoğraf', cursor: 'pointer'
    }));
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
        properties: { index, count: members.length }
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
  root.PhotoMapLayer = { valid, directions, groupPhotos, popup, mount };
})(typeof window === 'undefined' ? globalThis : window);
