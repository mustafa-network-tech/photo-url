const crypto = require('node:crypto');
const COOKIE='mk_archive_session';
function configured(){return Boolean(process.env.ARCHIVE_PASSWORD && process.env.ARCHIVE_SESSION_SECRET && process.env.ARCHIVE_SESSION_SECRET.length>=32);}
function signature(s){return crypto.createHmac('sha256',process.env.ARCHIVE_SESSION_SECRET||'').update(s).digest('base64url');}
function same(a,b){const x=crypto.createHash('sha256').update(String(a)).digest(),y=crypto.createHash('sha256').update(String(b)).digest();return crypto.timingSafeEqual(x,y);}
function token(){const body=Buffer.from(JSON.stringify({exp:Date.now()+8*60*60*1000,nonce:crypto.randomBytes(16).toString('hex')})).toString('base64url');return body+'.'+signature(body);}
function authorized(req){
 if(!configured())return false;
 const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='));
 if(!cookie)return false;
 try {const [body,sig,extra]=cookie.substring(COOKIE.length+1).split('.');if(extra||!sig||!same(signature(body),sig))return false;const p=JSON.parse(Buffer.from(body,'base64url').toString());return Number.isFinite(p.exp)&&p.exp>Date.now();}catch{return false;}
}
function cookie(req,value,clear=false){const secure=req.headers['x-forwarded-proto']==='https'||process.env.VERCEL?' Secure;':'';return `${COOKIE}=${value}; Path=/; HttpOnly;${secure} SameSite=Strict; Max-Age=${clear?0:28800}`;}
function originAllowed(req){if(!req.headers.origin)return true;try{return new URL(req.headers.origin).host===(req.headers['x-forwarded-host']||req.headers.host);}catch{return false;}}
function noStore(res){res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');}
module.exports={configured,same,token,authorized,cookie,originAllowed,noStore};
