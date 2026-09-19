const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8768';
function readData(file,key){const context={window:{}};vm.runInNewContext(fs.readFileSync(file,'utf8'),context);return context.window[key];}
const source=readData('gallery-data.js','GALLERY_IMAGES'),built=readData('.site/gallery-data.js','GALLERY_IMAGES');
const inventory=JSON.parse(fs.readFileSync('.site/seo-inventory.json','utf8'));
const physical=[];function walk(dir){for(const f of fs.readdirSync(dir,{withFileTypes:true})){const p=dir+'/'+f.name;if(f.isDirectory())walk(p);else if(/\.(jpe?g|png|webp|gif|avif)$/i.test(p))physical.push(p);}}walk('images');
async function get(p,type){const r=await fetch(base+p);assert.equal(r.status,200,p);assert(r.headers.get('content-type').includes(type),p);return r.text();}
(async()=>{
 const xml=await get('/sitemap.xml','xml');assert(xml.startsWith('<?xml'));assert(!/<html|localhost|vercel\.app|preview/i.test(xml));
 const maps=await Promise.all([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>get(new URL(x[1]).pathname,'xml')));
 for(const map of maps){assert(!map.includes('/kategori/'));assert((map.match(/<image:image>/g)||[]).length<=1000);}
 const pages=[...new Set(maps.flatMap(map=>[...map.matchAll(/<loc>(.*?)<\/loc>/g)].map(x=>x[1])))];
 const photos=maps.flatMap(map=>[...map.matchAll(/<image:loc>(.*?)<\/image:loc>/g)].map(x=>x[1].replace(/&amp;/g,'&')));
 assert.equal(pages.length,1);assert.equal(new Set(photos).size,built.length);
 const pageResults=[];for(const p of pages){const u=new URL(p);assert.equal(u.origin,'https://arsiv.mavikadraj.com.tr');const h=await get(u.pathname,'text/html');assert.equal((h.match(/<h1[ >]/g)||[]).length,1);assert(h.includes('rel="canonical" href="'+p+'"'));assert(h.includes('application/ld+json'));assert(h.includes('og:url'));assert(!/id="(?:photo|category)-count">0/.test(h));assert(h.includes('class="photo-card"'));for(const m of h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))JSON.parse(m[1]);pageResults.push({url:p,cards:(h.match(/class="photo-card"/g)||[]).length});}
 let accessible=0;const queue=photos.slice();await Promise.all(Array.from({length:8},async()=>{while(queue.length){const p=queue.pop();const r=await fetch(base+new URL(p).pathname,{method:'HEAD'});assert.equal(r.status,200,p);assert(r.headers.get('content-type').startsWith('image/'),p);accessible++;}}));
 let assets=0;for(const x of built){assert(physical.includes(x.path));assert.equal(new URL(x.path,'https://arsiv.mavikadraj.com.tr/').href,new URL(x.path,'https://arsiv.mavikadraj.com.tr/kategori/example/').origin+'/'+x.path.split('/').map(encodeURIComponent).join('/'));if(x.thumbnail){const r=await fetch(base+'/'+x.thumbnail,{method:'HEAD'});assert.equal(r.status,200,x.thumbnail);assets++;}}
 const robots=await get('/robots.txt','text/plain');assert(robots.includes('Sitemap: https://arsiv.mavikadraj.com.tr/sitemap.xml'));assert(!robots.includes('Disallow: /\n'));
 for(const p of ['/styles.css','/app.js','/gallery-data.js','/gallery-model.js','/hero-slider.js'])assert.equal((await fetch(base+p)).status,200,p);
 const heroPaths=[...fs.readFileSync('hero-slider.js','utf8').matchAll(/'(\/images\/[^']+)'/g)].map(x=>x[1]);
 for(const p of heroPaths)assert.equal((await fetch(base+p,{method:'HEAD'})).status,200,p);
 assert.equal((await fetch(base+'/kategori/bulunmayan/',{redirect:'manual'})).status,301);
 const report={sourceRecords:source.length,physical:physical.length,publicPhysical:physical.filter(p=>/^images\/(KONULAR|ŞEHİRLER)\//.test(p)).length,uiTotal:built.length,categories:inventory.categories.length,accessible,thumbnailsChecked:assets,missing:source.filter(x=>!physical.includes(x.path)).map(x=>x.path),orphan:physical.filter(p=>!source.some(x=>x.path===p)),caseMismatch:source.filter(x=>!physical.includes(x.path)&&physical.some(p=>p.toLowerCase()===x.path.toLowerCase())).map(x=>x.path),sitemapPages:pages.length,sitemapImages:photos.length,dimensions:built.filter(x=>x.width&&x.height).length,pageResults,robots:robots.trim()};
 fs.writeFileSync('.site/seo-test-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
