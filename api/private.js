const fs=require('node:fs');const path=require('node:path');const S=require('../server/session.cjs');
const roots={doga:['doga','doğa'],'gonul-pusulasi':['gonul-pusulasi','gönül pusulası'],duygusal:['duygusal']};
const exts={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif','.avif':'image/avif'};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isSymbolicLink()?[]:d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]);}
module.exports=async function(req,res){
 S.noStore(res);
 if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
 if(!S.configured())return res.status(503).json({error:'Not configured'});
 if(!S.authorized(req))return res.status(401).json({error:'Unauthorized'});
 const collection=req.query.collection;if(!Object.hasOwn(roots,collection))return res.status(404).json({error:'Not found'});
 const imageRoot=path.join(process.cwd(),'private-web');
 const directories=fs.readdirSync(imageRoot,{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.isSymbolicLink()&&roots[collection].includes(d.name.toLocaleLowerCase('tr-TR'))).map(d=>path.join(imageRoot,d.name));
 if(req.query.file!==undefined){
  const requested=String(req.query.file);const file=path.resolve(imageRoot,requested);
  if(!directories.some(dir=>file.startsWith(path.resolve(dir)+path.sep))||!exts[path.extname(file).toLowerCase()]||!fs.existsSync(file)||!fs.statSync(file).isFile())return res.status(404).json({error:'Not found'});
  const real=fs.realpathSync(file);if(!directories.some(dir=>real.startsWith(fs.realpathSync(dir)+path.sep)))return res.status(404).json({error:'Not found'});
  res.setHeader('Content-Type',exts[path.extname(file).toLowerCase()]);return fs.createReadStream(file).pipe(res);
 }
 const label=collection==='doga'?'Doğa':collection==='duygusal'?'Duygusal':'Gönül Pusulası';
 const items=directories.flatMap(walk).filter(p=>exts[path.extname(p).toLowerCase()]).sort().map(file=>{
  const rel=path.relative(imageRoot,file).split(path.sep).join('/');const parts=rel.split('/');return {name:path.basename(file),collection,category:label,detail:parts.slice(1,-1).join(' / '),label:path.basename(file),tags:[label,...parts.slice(1,-1)],path:'/api/private?collection='+encodeURIComponent(collection)+'&file='+encodeURIComponent(rel)};
 });
 return res.status(200).json(items);
};
