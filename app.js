const images = Array.isArray(window.GALLERY_IMAGES) ? window.GALLERY_IMAGES : [];
const gallery = document.querySelector('#gallery');
const filters = document.querySelector('#filters');
const emptyState = document.querySelector('#empty-state');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxCaption = document.querySelector('#lightbox-caption');
const toast = document.querySelector('#toast');
let activeCategory = 'Tümü';
let toastTimer;

const titleCase = (value) => value.charAt(0).toLocaleUpperCase('tr-TR') + value.slice(1);
const absoluteUrl = (path) => new URL(path, document.baseURI).href;

function copyUrl(path, button) {
  const url = absoluteUrl(path);
  const fallback = () => {
    const input = document.createElement('textarea');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  };

  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).catch(fallback);
  else fallback();

  const oldText = button.textContent;
  button.textContent = 'Kopyalandı';
  setTimeout(() => { button.textContent = oldText; }, 1400);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function openLightbox(item) {
  lightboxImage.src = item.path;
  lightboxImage.alt = item.name;
  lightboxCaption.textContent = `${item.name} · ${titleCase(item.category)}`;
  lightbox.showModal();
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'photo-card';

  const imageButton = document.createElement('button');
  imageButton.className = 'image-button';
  imageButton.type = 'button';
  imageButton.setAttribute('aria-label', `${item.name} görselini büyüt`);
  const img = document.createElement('img');
  img.src = item.path;
  img.alt = item.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  imageButton.append(img);
  imageButton.addEventListener('click', () => openLightbox(item));

  const body = document.createElement('div');
  body.className = 'card-body';
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const name = document.createElement('span');
  name.className = 'file-name';
  name.title = item.name;
  name.textContent = item.name;
  const category = document.createElement('span');
  category.className = 'category';
  category.textContent = titleCase(item.category);
  meta.append(name, category);

  const urlRow = document.createElement('div');
  urlRow.className = 'url-row';
  const url = document.createElement('span');
  url.className = 'url-text';
  url.title = absoluteUrl(item.path);
  url.textContent = absoluteUrl(item.path);
  const copy = document.createElement('button');
  copy.className = 'copy-button';
  copy.type = 'button';
  copy.textContent = "URL'yi Kopyala";
  copy.addEventListener('click', () => copyUrl(item.path, copy));
  urlRow.append(url, copy);
  body.append(meta, urlRow);
  article.append(imageButton, body);
  return article;
}

function renderGallery() {
  const visible = activeCategory === 'Tümü' ? images : images.filter((item) => item.category === activeCategory);
  gallery.replaceChildren(...visible.map(createCard));
  emptyState.hidden = visible.length !== 0;
}

function renderFilters() {
  const categories = [...new Set(images.map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'tr'));
  const names = ['Tümü', ...categories];
  filters.replaceChildren(...names.map((item) => {
    const button = document.createElement('button');
    button.className = `filter-button${item === activeCategory ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = item === 'Tümü' ? `Tümü (${images.length})` : titleCase(item);
    button.addEventListener('click', () => {
      activeCategory = item;
      renderFilters();
      renderGallery();
    });
    return button;
  }));
}

document.querySelector('#photo-count').textContent = images.length;
document.querySelector('#category-count').textContent = new Set(images.map((item) => item.category)).size;
document.querySelector('.close-button').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close(); });
renderFilters();
renderGallery();
