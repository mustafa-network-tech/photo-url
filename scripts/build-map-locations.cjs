// Map dataset from public KONULAR/ŞEHİRLER files only. Photos are read, never moved or rewritten.
// Order: EXIF GPS (exact) > ŞEHİRLER folder > filename > manual folder rule. No match → unresolvedLocations.
// Usage: node scripts/build-map-locations.cjs [--check]
const fs=require('node:fs');const path=require('node:path');
const readExif=require('./exif-gps.cjs');
const root=path.resolve(__dirname,'..');
const fold=x=>String(x||'').toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
const encode=rel=>'/'+rel.split('/').map(encodeURIComponent).join('/');
const ACCURACY=['exact','approximate','city'];

function listPhotos(){
 const files=[];
 (function scan(dir){for(const d of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name,'tr'))){
  if(d.isSymbolicLink())continue;const file=path.join(dir,d.name);
  if(d.isDirectory()){scan(file);continue;}
  if(!/\.(jpe?g|png|webp|gif|avif)$/i.test(d.name))continue;
  const rel=path.relative(path.join(root,'images'),file).split(path.sep).join('/'),top=fold(rel.split('/')[0]);
  if(top==='konular'||top==='sehirler')files.push(rel);
 }})(path.join(root,'images'));
 return files;
}

function loadRules(){
 const rules=JSON.parse(fs.readFileSync(path.join(root,'harita','location-rules.json'),'utf8'));
 for(const [id,place] of Object.entries(rules.places)){
  if(!ACCURACY.includes(place.accuracy)||place.accuracy==='exact'||!Number.isFinite(place.latitude)||!Number.isFinite(place.longitude)||Math.abs(place.latitude)>90||Math.abs(place.longitude)>180)throw Error('Invalid place: '+id);
 }
 for(const rule of [...rules.folderRules,...rules.filenameRules,...rules.manualRules])if(!rules.places[rule.place])throw Error('Unknown place: '+rule.place);
 return rules;
}

// The most specific (longest) folder rule wins; a folder rule never crosses a path segment boundary.
const byFolder=(rules,rel)=>rules.filter(r=>('images/'+rel).startsWith('images/'+r.folder+'/')).sort((a,b)=>b.folder.length-a.folder.length)[0];

function build(){
 const rules=loadRules();
 const tagsFile=path.join(root,'photo-tags.json');
 const tags=fs.existsSync(tagsFile)?JSON.parse(fs.readFileSync(tagsFile,'utf8')):{};
 const photos=[],unresolvedLocations=[];
 for(const rel of listPhotos()){
  const parts=rel.split('/'),name=parts.at(-1),isCity=fold(parts[0])==='sehirler';
  const photoPath='images/'+rel,thumb='thumbnails/'+rel+'.jpg';
  const label=tags[photoPath]?.label||name.replace(/_/g,' ');
  const stem=fold(name.replace(/\.[^.]+$/,'')).replace(/[_-]+/g,' ').replace(/\s+/g,' ');
  const exif=readExif(path.join(root,photoPath));
  let place=null,source=null;
  if(Number.isFinite(exif.latitude)){source='exif';}
  else{
   const folderRule=isCity&&byFolder(rules.folderRules,rel);
   const nameRule=!isCity&&rules.filenameRules.find(r=>stem.includes(r.contains));
   const manualRule=byFolder(rules.manualRules,rel);
   const rule=folderRule||nameRule||manualRule;
   if(rule){place=rules.places[rule.place];source=folderRule?'folder':nameRule?'filename':'manual';}
  }
  const base={photoId:photoPath,category:isCity?'Şehirler':parts[1],folder:parts.slice(1,-1).join(' / ')};
  if(!source){
   const hint=rules.unresolvedHints.find(r=>stem.includes(r.contains));
   unresolvedLocations.push({...base,reason:hint?hint.hint:'EXIF GPS yok; klasör, dosya adı veya elle girilmiş konum bilgisi yok.'});
   continue;
  }
  const generic=/^IMG[\s_-]?\d+/i.test(label)||/^[0-9a-f-]{16,}/i.test(label)||/^\d{8}[\s_]\d{6}/.test(label);
  const where=place?place.placeName:'';
  photos.push({
   photoId:photoPath,
   title:generic?[where.replace(/\s*\(.*\)$/,''),isCity?'':parts[1]].filter(Boolean).join(' · ')||label:label.replace(/\.[^.]+$/,''),
   imageUrl:encode(photoPath),
   thumbnailUrl:fs.existsSync(path.join(root,thumb))?encode(thumb):encode(photoPath),
   city:place?place.city:'',district:place?place.district:'',placeName:where,
   latitude:source==='exif'?exif.latitude:place.latitude,
   longitude:source==='exif'?exif.longitude:place.longitude,
   locationAccuracy:source==='exif'?'exact':place.accuracy,
   locationSource:source,
   category:base.category,
   dateTaken:exif.dateTaken||null
  });
 }
 const count=f=>photos.filter(f).length;
 const summary={
  totalPhotos:photos.length+unresolvedLocations.length,
  exact:count(p=>p.locationAccuracy==='exact'),
  approximate:count(p=>p.locationAccuracy==='approximate'),
  city:count(p=>p.locationAccuracy==='city'),
  unresolved:unresolvedLocations.length,
  mapped:photos.length,
  locations:new Set(photos.map(p=>p.latitude+','+p.longitude)).size,
  bySource:Object.fromEntries(['exif','folder','filename','manual'].map(s=>[s,count(p=>p.locationSource===s)]))
 };
 return {photos,summary,unresolvedLocations};
}

const dataset=photos=>'// scripts/build-map-locations.cjs ile üretilir; elle düzenlemeyin. Kurallar: harita/location-rules.json\nwindow.MAVI_MAP_PHOTOS = '+JSON.stringify(photos,null,1).replace(/</g,'\\u003c')+';\n';

// Public data feed for other sites (mavikadraj.com.tr/harita). URLs stay relative to the archive origin.
const json=(photos,summary)=>JSON.stringify({version:1,source:'https://arsiv.mavikadraj.com.tr',summary:{mapped:summary.mapped,locations:summary.locations,exact:summary.exact,approximate:summary.approximate,city:summary.city},photos})+'\n';

module.exports={build,dataset,json,fold};

if(require.main===module){
 const {photos,summary,unresolvedLocations}=build();
 const artifacts={
  [path.join(root,'harita','map-photos.js')]:dataset(photos),
  [path.join(root,'reports','map-locations.json')]:JSON.stringify({summary,unresolvedLocations},null,2)+'\n'
 };
 for(const [file,content] of Object.entries(artifacts)){
  if(process.argv.includes('--check')){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content){console.error('Güncel değil: '+path.relative(root,file)+' — node scripts/build-map-locations.cjs çalıştırın.');process.exit(1);}}
  else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);}
 }
 console.log(JSON.stringify(summary));
}
