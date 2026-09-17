const gallery = document.querySelector('#gallery');
const filters = document.querySelector('#filters');
const emptyState = document.querySelector('#empty-state');
const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
const lightboxCaption = document.querySelector('#lightbox-caption');
const toast = document.querySelector('#toast');
const searchInput = document.querySelector('#search');
const subcategory = document.querySelector('#subcategory');
const detailSelect = document.querySelector('#detail');
const loadMore = document.querySelector('#load-more');
const state = {collection:'',category:'',detail:'',search:''};
const params = new URLSearchParams(location.search);
const privateRoute = params.get('koleksiyon');
const privateCollection = ['doga','gonul-pusulasi','duygusal'].includes(privateRoute) ? privateRoute : null;
let images = GalleryModel.publicItems(window.GALLERY_IMAGES || []);
let limit = 36;
let toastTimer;
const absoluteUrl = path => new URL(path, document.baseURI).href;
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
  lightboxCaption.textContent = `${item.name} · ${[item.category, item.detail].filter(Boolean).join(' · ')}`;
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
  img.src = item.thumbnail || item.path;
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
  category.textContent = item.category;
  category.title = item.detail || item.category;
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


function unique(items, field) { return [...new Set(items.map(x=>x[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr')); }
function setOptions(select, names, placeholder, selected) {
  select.replaceChildren(new Option(placeholder,''),...names.map(n=>new Option(n,n)));
  select.value = names.includes(selected) ? selected : '';
}
function renderOptions() {
  const scope = state.collection ? images.filter(x=>x.collection===state.collection) : images;
  setOptions(subcategory,unique(scope,'category'),'Tüm kategoriler',state.category);
  state.category = subcategory.value;
  const sub = state.category ? scope.filter(x=>x.category===state.category) : scope;
  setOptions(detailSelect,unique(sub,'detail'),'Tüm alt kategoriler',state.detail);
  state.detail = detailSelect.value;
  detailSelect.disabled = !detailSelect.options[1];
}
function renderFilters() {
  const names = privateCollection ? [[privateCollection,privateCollection==='doga'?'Doğa':privateCollection==='duygusal'?'Duygusal':'Gönül Pusulası']] : [['','Tümü'],['konular','Konular'],['sehirler','Şehirler']];
  filters.replaceChildren(...names.map(([key,name])=>{
    const button=document.createElement('button');button.type='button';
    button.className='filter-button'+(key===state.collection?' active':'');
    button.textContent=name;button.setAttribute('aria-pressed',String(key===state.collection));
    button.addEventListener('click',()=>{state.collection=key;state.category='';state.detail='';limit=36;renderFilters();renderOptions();renderGallery();});
    return button;
  }));
}
function selectGroup(group) {
  state.collection=group.collection;state.category=group.category;state.detail=group.detail;state.search='';searchInput.value='';limit=36;
  renderFilters();renderOptions();renderGallery();
  document.querySelector('#search-form').scrollIntoView({block:'start',behavior:'smooth'});
}
function renderGallery() {
  const isHome=!privateCollection&&!state.collection&&!state.category&&!state.detail&&!state.search.trim();
  const visible=GalleryModel.filter(images,state);
  gallery.replaceChildren();
  if(isHome) {
    const groups=GalleryModel.featured(images);
    for(const group of groups) {
      const section=document.createElement('section');section.className='featured-group';
      const header=document.createElement('div');header.className='group-heading';
      const title=document.createElement('h3');title.textContent=group.label;
      const link=document.createElement('button');link.type='button';link.className='view-all';link.textContent='Tümünü gör →';
      link.setAttribute('aria-label',group.label+' fotoğraflarının tümünü gör');link.addEventListener('click',()=>selectGroup(group));
      header.append(title,link);const grid=document.createElement('div');grid.className='gallery';grid.append(...group.items.map(createCard));section.append(header,grid);gallery.append(section);
    }
    document.querySelector('#result-count').textContent=groups.reduce((n,g)=>n+g.items.length,0)+' seçilmiş fotoğraf · Konular ve şehirlerden';
  } else {
    const grid=document.createElement('div');grid.className='gallery';grid.append(...visible.slice(0,limit).map(createCard));gallery.append(grid);
    document.querySelector('#result-count').textContent=visible.length+' fotoğraf bulundu · '+Math.min(limit,visible.length)+' gösteriliyor';
  }
  emptyState.hidden=visible.length!==0;
  loadMore.hidden=isHome||limit>=visible.length;
}
function start() {
  document.querySelector('#photo-count').textContent=images.length;
  document.querySelector('#category-count').textContent=new Set(images.map(x=>x.collection+'|'+x.category)).size;
  if(privateCollection)document.querySelector('#gallery-title').textContent=privateCollection==='doga'?'Doğa':privateCollection==='duygusal'?'Duygusal':'Gönül Pusulası';
  renderFilters();renderOptions();renderGallery();
}
searchInput.addEventListener('input',()=>{state.search=searchInput.value;limit=36;renderGallery();});
subcategory.addEventListener('change',()=>{state.category=subcategory.value;state.detail='';limit=36;renderOptions();renderGallery();});
detailSelect.addEventListener('change',()=>{state.detail=detailSelect.value;limit=36;renderGallery();});
document.querySelector('#search-form').addEventListener('submit',e=>e.preventDefault());
document.querySelector('#reset').addEventListener('click',()=>{Object.assign(state,{collection:privateCollection||'',category:'',detail:'',search:''});searchInput.value='';limit=36;renderFilters();renderOptions();renderGallery();});
loadMore.addEventListener('click',()=>{limit+=36;renderGallery();});
document.querySelector('.close-button').addEventListener('click',()=>lightbox.close());
lightbox.addEventListener('click',event=>{if(event.target===lightbox)lightbox.close();});
async function loadPrivate() {
  const response=await fetch('/api/private?collection='+encodeURIComponent(privateCollection),{credentials:'same-origin',cache:'no-store'});
  if(!response.ok) {
    images=[];start();document.querySelector('#locked-area').hidden=false;
    document.querySelector('#search-form').hidden=true;emptyState.hidden=true;
    document.querySelector('#result-count').textContent='';
    if(response.status===503)document.querySelector('#login-message').textContent='Kilitli alan henüz kullanıma açılmadı.';
    return;
  }
  images=await response.json();document.querySelector('#locked-area').hidden=true;
  document.querySelector('#search-form').hidden=false;document.querySelector('#logout').hidden=false;start();
}
document.querySelector('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const message=document.querySelector('#login-message');message.textContent='Kontrol ediliyor…';
  try {
    const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:document.querySelector('#password').value}),credentials:'same-origin'});
    document.querySelector('#password').value='';
    if(response.ok){message.textContent='';await loadPrivate();}
    else message.textContent=response.status===503?'Kilitli alan henüz kullanıma açılmadı.':'Şifre doğru değil. Tekrar deneyin.';
  } catch {message.textContent='Bağlantı kurulamadı. Tekrar deneyin.';}
});
document.querySelector('#logout').addEventListener('click',async()=>{
  await fetch('/api/auth',{method:'DELETE',credentials:'same-origin'});location.reload();
});
if(privateCollection) {state.collection=privateCollection;loadPrivate().catch(()=>{images=[];start();document.querySelector('#locked-area').hidden=false;document.querySelector('#search-form').hidden=true;document.querySelector('#login-message').textContent='Kilitli alan için bağlantı kurulamadı.';});}
else start();
