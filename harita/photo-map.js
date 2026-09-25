(() => {
  'use strict';

  /**
   * Marker contract produced by scripts/build-map-locations.cjs.
   * @typedef {Object} MapPhoto
   * @property {string} photoId
   * @property {string} title
   * @property {string} imageUrl
   * @property {string} thumbnailUrl
   * @property {string} city
   * @property {string} district
   * @property {string} placeName
   * @property {number} latitude
   * @property {number} longitude
   * @property {'exact'|'approximate'|'city'} locationAccuracy
   * @property {'exif'|'metadata'|'folder'|'filename'|'manual'} locationSource
   * @property {string} category
   * @property {string|null} dateTaken
   */

  // The viewport remains separate from the photo/grouping layer.
  function createPhotoMap(element) {
    const width = element.clientWidth;
    return new google.maps.Map(element, {
      center: { lat: 39.0, lng: 35.0 },
      zoom: width < 600 ? 4 : width < 1000 ? 5 : 6,
      fullscreenControl: true,
      zoomControl: true
    });
  }

  const status = document.getElementById('map-status');
  const canvas = document.getElementById('photo-map');
  let failed = false;
  let timer;
  function showError(title, detail) {
    failed = true;
    clearTimeout(timer);
    canvas.hidden = true;
    status.hidden = false;
    document.getElementById('map-status-title').textContent = title;
    document.getElementById('map-status-detail').textContent = detail;
  }
  const apiKey = window.MAVI_MAP_CONFIG?.apiKey;
  if (!apiKey) {
    showError('Harita yapılandırması gerekli', 'PUBLIC_GOOGLE_MAPS_API_KEY ortam değişkeni tanımlanmamış. Değeri ekleyip projeyi yeniden derleyin; yerel geliştirmede sunucuyu yeniden başlatın.');
    return;
  }

  window.gm_authFailure = () => showError('Harita açılamadı', 'Google Maps yetkilendirmesi başarısız. API anahtarını, izin verilen alan adlarını, Maps JavaScript API ve faturalandırma ayarlarını kontrol edin.');
  window.initMaviPhotoMap = () => {
    if (failed) return;
    clearTimeout(timer);
    try {
      const map = createPhotoMap(canvas);
      status.hidden = true;
      const summary = document.getElementById('map-photo-count');
      try {
        if (!Array.isArray(window.MAVI_MAP_PHOTOS) || !window.PhotoMapLayer) throw new Error('Missing photo data');
        window.PhotoMapLayer.mount(map, window.MAVI_MAP_PHOTOS, summary);
      } catch {
        summary.textContent = 'Fotoğraf konumları yüklenemedi. Haritayı kullanmaya devam edebilirsiniz.';
      }
    } catch {
      showError('Harita açılamadı', 'Google Maps başlatılamadı. Lütfen sayfayı yeniden yükleyin.');
    }
  };
  // Official direct script loading: one async load, only on the map page.
  const params = new URLSearchParams({ key: apiKey, loading: 'async', callback: 'initMaviPhotoMap', v: 'weekly', language: 'tr', region: 'TR' });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://maps.googleapis.com/maps/api/js?' + params;
  script.onerror = () => showError('Harita yüklenemedi', 'Bağlantınızı kontrol edip sayfayı yeniden yükleyin.');
  timer = setTimeout(() => showError('Harita yüklenemedi', 'Google Maps zamanında yanıt vermedi. Lütfen sayfayı yeniden yükleyin.'), 20000);
  document.head.append(script);
})();
