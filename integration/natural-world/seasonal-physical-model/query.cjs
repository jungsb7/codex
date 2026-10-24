'use strict';
const fs=require('node:fs'),z=require('node:zlib'),crypto=require('node:crypto'),C=require('./core.js'),manifest=require('./output/manifest.json'),cache=new Map();
function verified(spec){const b=fs.readFileSync(spec.path?__dirname+'/'+spec.path:__dirname+'/output/'+spec.file);if(b.length!==spec.bytes||crypto.createHash('sha256').update(b).digest('hex')!==spec.sha256)throw Error('Data integrity mismatch');const raw=z.gunzipSync(b);if(raw.length!==spec.rawBytes)throw Error('Expanded length mismatch');return raw;}
let model;function base(){if(!model)model=C.decode(JSON.parse(verified(manifest.base)));return model;}
function period(k){if(!Number.isInteger(k)||k<1||k>12)throw Error('Invalid period');if(!cache.has(k)){const spec=manifest.periods[k-1],d=verified(spec),f=verified(spec.forcing),m=base();cache.set(k,{derived:C.period(m,d.buffer.slice(d.byteOffset,d.byteOffset+d.byteLength),k),forcing:C.forcing(m,f.buffer.slice(f.byteOffset,f.byteOffset+f.byteLength),k)});}return cache.get(k);}
function query(type,id,k=1,caseId='reference'){const p=period(k);return C.query(base(),p.derived,p.forcing,type,id,caseId);}
function annual(type,id,caseId='reference',steps=120){return C.annual(base(),Array.from({length:12},(_,k)=>period(k+1).forcing),type,id,caseId,steps);}
if(require.main===module){try{const type=process.argv[2]||'cell',id=Number(process.argv[3]||135945),arg=process.argv[4]||'1',c=process.argv[5]||'reference';console.log(JSON.stringify(arg==='annual'?annual(type,id,c):query(type,id,Number(arg),c),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={verified,base,period,query,annual,manifest};
