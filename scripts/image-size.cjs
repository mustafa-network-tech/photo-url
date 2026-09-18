const fs=require('node:fs');
// Header inspection only: originals remain untouched.
module.exports=file=>{
 const fd=fs.openSync(file,'r'),b=Buffer.alloc(262144);let n;
 try{n=fs.readSync(fd,b,0,b.length,0);}finally{fs.closeSync(fd);}
 if(b.toString('ascii',1,4)==='PNG')return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
 if(b[0]===255&&b[1]===216){let i=2;while(i+9<n){if(b[i]!==255)break;const m=b[i+1];if(m===255){i++;continue;}if(m===217||m===218)break;const l=b.readUInt16BE(i+2);if(l<2)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(m))return {width:b.readUInt16BE(i+7),height:b.readUInt16BE(i+5)};i+=l+2;}}
 return {};
};
