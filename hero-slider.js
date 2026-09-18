(() => {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const slides = [
    'https://photo-url-five.vercel.app/images/%C5%9EEH%C4%B0RLER/G%C3%B6k%C3%A7eada/Kalek%C3%B6y/IMG_3789.JPG',
    'https://photo-url-five.vercel.app/images/%C5%9EEH%C4%B0RLER/%C3%87anakkale/%C3%A7anakkale_k%C3%B6pr%C3%BCs%C3%BC.jpg',
    'https://photo-url-five.vercel.app/images/KONULAR/R%C3%BCzg%C3%A2r%20T%C3%BCrbinleri/IMG_5538.JPG',
    'https://photo-url-five.vercel.app/images/KONULAR/G%C3%BCnbat%C4%B1m%C4%B1/IMG_5391.JPG',
    'https://photo-url-five.vercel.app/images/KONULAR/Can%20Dostlar/Kediler/harabe%20ev%20%20ydk.JPG',
    'https://photo-url-five.vercel.app/images/KONULAR/Ku%C5%9Flar/Mart%C4%B1lar/denizz.JPG'
  ];
  const layers = [...hero.querySelectorAll('.hero-slide')];
  const controls = hero.querySelector('.hero-controls');
  const pause = hero.querySelector('#hero-pause');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const prepared = new Map();
  let current = 0;
  let activeLayer = 0;
  let timer;
  let revision = 0;
  let paused = motion.matches;

  // Decode before swapping layers; failed downloads leave the current photo visible.
  function prepare(index) {
    if (!prepared.has(index)) {
      const img = new Image();
      img.decoding = 'async';
      img.fetchPriority = index === 0 ? 'high' : 'low';
      img.src = slides[index];
      prepared.set(index, img.decode().then(() => img).catch(() => null));
    }
    return prepared.get(index);
  }

  const dots = slides.map((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'hero-dot';
    dot.setAttribute('aria-label', `${index + 1}. fotoğrafı göster`);
    dot.setAttribute('aria-pressed', String(index === current));
    dot.addEventListener('click', () => show(index));
    return dot;
  });
  hero.querySelector('.hero-dots').append(...dots);

  function schedule() {
    clearTimeout(timer);
    if (!paused && !document.hidden) timer = setTimeout(() => show(current + 1), 2500);
  }

  async function show(index, direction = 1) {
    clearTimeout(timer);
    const request = ++revision;
    let next = (index + slides.length) % slides.length;
    let img;
    for (let attempt = 0; attempt < slides.length; attempt++) {
      img = await prepare(next);
      if (request !== revision) return;
      if (img) break;
      next = (next + direction + slides.length) % slides.length;
    }
    if (img && next !== current) {
      const incoming = layers[1 - activeLayer];
      incoming.src = img.src;
      await incoming.decode().catch(() => {});
      if (request !== revision) return;
      incoming.classList.add('is-active');
      layers[activeLayer].classList.remove('is-active');
      activeLayer = 1 - activeLayer;
      current = next;
      dots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === current)));
    }
    schedule();
  }

  function updatePause() {
    pause.textContent = paused ? '▶' : 'Ⅱ';
    pause.setAttribute('aria-label', paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi duraklat');
    schedule();
  }
  hero.querySelector('#hero-prev').addEventListener('click', () => show(current - 1, -1));
  hero.querySelector('#hero-next').addEventListener('click', () => show(current + 1));
  pause.addEventListener('click', () => { paused = !paused; revision++; updatePause(); });
  motion.addEventListener('change', () => { paused = motion.matches; revision++; updatePause(); });
  document.addEventListener('visibilitychange', () => { revision++; schedule(); });
  controls.hidden = false;
  pause.textContent = paused ? '▶' : 'Ⅱ';
  pause.setAttribute('aria-label', paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi duraklat');
  prepare(0).then(async () => {
    schedule();
    // Request remaining photos sequentially at low priority after the first is ready.
    for (let index = 1; index < slides.length; index++) await prepare(index);
  });
})();
