const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../.site');
const mime={'.html':'text/html; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  const legacy=url.pathname.match(/^\/(tr\/)?kategori\/([^/]+)\/?$/);
  if(legacy){
   res.writeHead(301,{Location:(legacy[1]?'/tr/':'/')+'?category='+encodeURIComponent(decodeURIComponent(legacy[2]))});return res.end();
  }
  let file=path.resolve(root,'.'+decodeURIComponent(/^\/tr\/?$/.test(url.pathname)?'/':url.pathname));
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(404);return res.end();}
  if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
  res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');
  if(req.method==='HEAD')return res.end();
  fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400);res.end('Bad request');}
}).listen(Number(process.env.PORT||8768),'127.0.0.1',()=>console.log('Production çıktısı: http://127.0.0.1:'+(process.env.PORT||8768)));
