const fs=require('node:fs');
// Read-only JPEG APP1 inspection: GPS (IFD 34853) and DateTimeOriginal. Files are never written.
function dms(values,ref,limit,positive,negative){
 if(!values||values.length!==3||(ref!==positive&&ref!==negative))return null;
 const [d,m,s]=values;if(![d,m,s].every(Number.isFinite)||d<0||d>limit||m<0||m>=60||s<0||s>=60)return null;
 const value=d+m/60+s/3600;return value>limit?null:ref===negative?-value:value;
}
function parseTiff(t){
 const le=t.toString('ascii',0,2)==='II';if(!le&&t.toString('ascii',0,2)!=='MM')return {};
 const u16=i=>le?t.readUInt16LE(i):t.readUInt16BE(i),u32=i=>le?t.readUInt32LE(i):t.readUInt32BE(i);
 const ifd=offset=>{const out={};if(!offset||offset+2>t.length)return out;const n=u16(offset);for(let k=0;k<n;k++){const e=offset+2+k*12;if(e+12>t.length)break;out[u16(e)]={type:u16(e+2),count:u32(e+4),at:e+8};}return out;};
 const rationals=x=>{if(!x||x.type!==5)return null;const off=u32(x.at),r=[];for(let i=0;i<x.count;i++){if(off+i*8+8>t.length)return null;const b=u32(off+i*8+4);r.push(b?u32(off+i*8)/b:NaN);}return r;};
 const ascii=x=>{if(!x||x.type!==2)return null;const off=x.count>4?u32(x.at):x.at;return t.toString('latin1',off,off+x.count).replace(/\0+$/,'');};
 const ifd0=ifd(u32(4)),result={};
 const exif=ifd0[0x8769]?ifd(u32(ifd0[0x8769].at)):{};
 const date=ascii(exif[0x9003])||ascii(ifd0[0x0132]);
 const m=date&&date.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
 if(m&&m[1]!=='0000')result.dateTaken=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
 if(ifd0[0x8825]){const g=ifd(u32(ifd0[0x8825].at));
  const lat=dms(rationals(g[2]),ascii(g[1]),90,'N','S'),lng=dms(rationals(g[4]),ascii(g[3]),180,'E','W');
  // Zero/zero is a common placeholder written by devices without a fix; it is never treated as real GPS.
  if(lat!==null&&lng!==null&&!(lat===0&&lng===0)){result.latitude=lat;result.longitude=lng;}
 }
 return result;
}
module.exports=file=>{
 const fd=fs.openSync(file,'r'),b=Buffer.alloc(262144);let n;
 try{n=fs.readSync(fd,b,0,b.length,0);}finally{fs.closeSync(fd);}
 if(b[0]!==255||b[1]!==216)return {};
 let i=2;
 while(i+4<n&&b[i]===255){
  const marker=b[i+1],length=b.readUInt16BE(i+2);if(marker===218||marker===217||length<2)break;
  if(marker===225&&b.toString('latin1',i+4,i+10)==='Exif\0\0'){try{return parseTiff(b.subarray(i+10,Math.min(n,i+2+length)));}catch{return {};}}
  i+=length+2;
 }
 return {};
};
