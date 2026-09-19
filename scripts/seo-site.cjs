const fs = require('node:fs');
const path = require('node:path');
require('../gallery-model.js');
const origin = 'https://arsiv.mavikadraj.com.tr';
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const url = value => new URL(value, origin + '/').href;
const slug = GalleryModel.categorySlug;
module.exports = function generate(root, out, items) {
  const categories = [...new Map(items.map(x => [x.collection+'|'+x.category, {collection:x.collection,category:x.category,slug:slug(x.category)}])).values()];
  if(new Set(categories.map(x=>x.slug)).size !== categories.length) throw Error('Kategori slug çakışması; otomatik route üretilmedi.');
  const route = category => GalleryModel.archiveUrl(category);
  const template = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const card = item => `<article class="photo-card"><a class="image-button" href="${esc(url(item.path))}" aria-label="${esc(item.name)} görselini büyüt"><img src="${esc(item.thumbnail||item.path)}" alt="${esc(GalleryModel.alt(item))}" loading="lazy" decoding="async"></a><div class="card-body"><div class="card-meta"><span class="file-name" title="${esc(item.name)}">${esc(item.name)}</span><span class="category">${esc(item.category)}</span></div><div class="url-row"><span class="url-text" title="${esc(url(item.path))}">${esc(url(item.path))}</span><button class="copy-button" type="button" data-photo-path="${esc(item.path)}">URL'yi Kopyala</button></div></div></article>`;
  const group = g => `<section class="featured-group"><div class="group-heading"><h3>${esc(g.label)}</h3><a class="view-all" href="${esc(route(g))}">Tümünü gör →</a></div><div class="gallery">${g.items.map(card).join('')}</div></section>`;
  function page() {
    const selected = items;
    const pathname = '/';
    const title = 'Mavi Kadraj Fotoğraf Arşivi | Konular ve Şehirler';
    const description = 'Mavi Kadraj Fotoğraf Arşivi’nde konu ve şehir kategorilerindeki fotoğrafları keşfedin, önizlemeleri inceleyin ve fotoğraf bağlantılarını kopyalayın.';
    const graph = [{'@type':'CollectionPage','@id':origin+pathname,name:title,description,url:origin+pathname,isPartOf:{'@id':origin+'/#website'}}];
    graph.push({'@type':'WebSite','@id':origin+'/#website',name:'Mavi Kadraj Fotoğraf Arşivi',url:origin+'/'});
    const metadata = `<base href="/"><link rel="canonical" href="${origin+pathname}"><meta name="robots" content="index,follow"><meta property="og:type" content="website"><meta property="og:locale" content="tr_TR"><meta property="og:site_name" content="Mavi Kadraj"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${origin+pathname}"><meta property="og:image" content="${esc(url(selected[0].path))}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${esc(url(selected[0].path))}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
    let html = template.replace(/<title>.*?<\/title>/,`<title>${esc(title)}</title>`).replace(/<meta name="description"[^>]*>/,`<meta name="description" content="${esc(description)}">`).replace('</head>',metadata+'</head>');
    html = html.replace('id="photo-count">0','id="photo-count">'+selected.length).replace('id="category-count">0','id="category-count">'+categories.length);
    html = html.replace('<div id="gallery"></div>',`<div id="gallery">${GalleryModel.featured(items).map(group).join('')}</div>`);
    html = html.replace(/<img src="([^"]+)"/g, (tag, src) => {
      const item=items.find(x=>esc(x.thumbnail||x.path)===src);
      return item&&item.width&&item.height ? tag+` width="${item.width}" height="${item.height}"` : tag;
    });
    // All real categories have ordinary crawlable links, including those not featured.
    html = html.replace('</main>',`<nav aria-label="Fotoğraf kategorileri"><p>${categories.map(c=>`<a href="${esc(route(c))}">${esc(c.category)}</a>`).join(' · ')}</p></nav></main>`);
    const dest = path.join(out,'index.html');
    fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,html);
  }
  page();
  // Filter views share the archive canonical; sitemap only lists that canonical URL.
  const sitemaps=[];
  // Keep all image URLs, with at most 1,000 images per URL in each sitemap.
  for(let offset=0;offset<items.length;offset+=1000){
    const name='sitemap-archive-'+(sitemaps.length+1)+'.xml';
    const entry=`<url><loc>${origin}/</loc>${items.slice(offset,offset+1000).map(x=>`<image:image><image:loc>${esc(url(x.path))}</image:loc></image:image>`).join('')}</url>`;
    fs.writeFileSync(path.join(out,name),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'+entry+'</urlset>');
    sitemaps.push(name);
  }
  fs.writeFileSync(path.join(out,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+sitemaps.map(name=>`<sitemap><loc>${origin}/${name}</loc></sitemap>`).join('')+'</sitemapindex>');
  fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nDisallow: /api/\n\nSitemap: '+origin+'/sitemap.xml\n');
  fs.writeFileSync(path.join(out,'seo-inventory.json'),JSON.stringify({photos:items.length,categories},null,2));
};
