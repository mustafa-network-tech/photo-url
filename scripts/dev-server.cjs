const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');process.chdir(root);
const handlers={'/api/auth':require('../api/auth.js'),'/api/private':require('../api/private.js')};
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer(async(req,res)=>{
 res.status=c=>{res.statusCode=c;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return res;};
 try {
  const url=new URL(req.url,'http://localhost');req.query=Object.fromEntries(url.searchParams);
  if(handlers[url.pathname]){let body='';for await(const chunk of req){body+=chunk;if(body.length>4096)return res.status(413).json({error:'Too large'});}req.body=body?JSON.parse(body):{};return await handlers[url.pathname](req,res);}
  if(url.pathname==='/map-config.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.end(require('./map-config.cjs')());}
  const rel=/^\/harita\/?$/.test(url.pathname)?'harita/index.html':decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
  const allowed=['index.html','styles.css','app.js','gallery-model.js','gallery-data.js','hero-slider.js','harita/index.html','harita/map.css','harita/photo-map.js','harita/photo-layer.js','harita/city-photos.js'];
  if(!allowed.includes(rel)&&!/^images\/(KONULAR|ŞEHİRLER)\//.test(rel)&&!/^thumbnails\/(KONULAR|ŞEHİRLER)\//.test(rel))return res.status(404).json({error:'Not found'});
  const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.status(404).json({error:'Not found'});
  res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 }catch{res.status(500).json({error:'Server error'});}
}).listen(Number(process.env.PORT||8767),'127.0.0.1',()=>console.log('Yerel galeri hazır.'));
