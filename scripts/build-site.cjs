const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'.site');
const fold=x=>x.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
if(!out.startsWith(root+path.sep))throw Error('Unsafe build path');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const publicItems=[];
function scan(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true})){
 if(d.isSymbolicLink())continue;const file=path.join(dir,d.name);if(d.isDirectory()){scan(file);continue;}
 if(!/\.(jpe?g|png|webp|gif|avif)$/i.test(d.name))continue;
 const rel=path.relative(path.join(root,'images'),file).split(path.sep).join('/'),parts=rel.split('/'),r=fold(parts[0]);
 const collection=r==='konular'?'konular':r==='sehirler'?'sehirler':null;if(!collection)continue;
 const item={name:d.name,collection,category:parts[1]||parts[0],detail:parts.slice(2,-1).join(' / '),label:d.name.replace(/_/g,' '),tags:parts.slice(1,-1),path:'images/'+rel};
 const thumb='thumbnails/'+rel+'.jpg';if(fs.existsSync(path.join(root,thumb)))item.thumbnail=thumb;
 const tagsFile=path.join(root,'photo-tags.json');if(fs.existsSync(tagsFile)){const tags=JSON.parse(fs.readFileSync(tagsFile,'utf8'))[item.path];if(tags){item.tags.push(...(tags.tags||[]));item.label=tags.label||item.label;}}
 Object.assign(item,require('./image-size.cjs')(path.join(root,item.thumbnail||item.path)));
 publicItems.push(item);
 for(const asset of [item.path,item.thumbnail].filter(Boolean)){const dest=path.join(out,asset);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,asset),dest);}
}}
scan(path.join(root,'images'));
for(const name of ['index.html','styles.css','app.js','gallery-model.js','hero-slider.js'])fs.copyFileSync(path.join(root,name),path.join(out,name));
fs.writeFileSync(path.join(out,'gallery-data.js'),'window.GALLERY_IMAGES = '+JSON.stringify(publicItems)+';\n');
require('./seo-site.cjs')(root,out,publicItems);
fs.mkdirSync(path.join(out,'harita'),{recursive:true});
for(const name of ['index.html','map.css','photo-map.js','photo-layer.js'])fs.copyFileSync(path.join(root,'harita',name),path.join(out,'harita',name));
// Map locations are rebuilt from the same public files, so newly added photos are never stale.
const mapLocations=require('./build-map-locations.cjs'),mapData=mapLocations.build();
fs.writeFileSync(path.join(out,'harita','map-photos.js'),mapLocations.dataset(mapData.photos));
fs.writeFileSync(path.join(out,'map-config.js'),require('./map-config.cjs')());
console.log(publicItems.length+' genel görsel; özel klasörler statik çıktıya alınmadı.');
console.log(mapData.summary.mapped+' fotoğraf haritada, '+mapData.summary.unresolved+' fotoğrafın konumu belirlenemedi.');
