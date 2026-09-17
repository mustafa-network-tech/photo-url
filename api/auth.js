const S=require('../server/session.cjs');
module.exports=async function(req,res){
 S.noStore(res);
 if(!S.originAllowed(req))return res.status(403).json({error:'Forbidden'});
 if(req.method==='DELETE'){res.setHeader('Set-Cookie',S.cookie(req,'',true));return res.status(200).json({ok:true});}
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 if(!S.configured())return res.status(503).json({error:'Not configured'});
 let body=req.body;try{if(typeof body==='string')body=JSON.parse(body);}catch{return res.status(400).json({error:'Invalid request'});}
 if(!body||typeof body.password!=='string'||body.password.length>512||!S.same(body.password,process.env.ARCHIVE_PASSWORD))return res.status(401).json({error:'Unauthorized'});
 res.setHeader('Set-Cookie',S.cookie(req,S.token()));return res.status(200).json({ok:true});
};
