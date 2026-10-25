'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),root=__dirname,filename=root+'/output/manifest.json',manifest=JSON.parse(fs.readFileSync(filename)),limit=9000000,sha=b=>crypto.createHash('sha256').update(b).digest('hex'),records=[];
for(const spec of manifest.periods){
 const chunks=spec.parts?spec.parts.map(p=>{const b=fs.readFileSync(root+'/'+p.path);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);return b;}):[fs.readFileSync(root+'/'+spec.path)],whole=Buffer.concat(chunks);
 assert.equal(whole.length,spec.bytes);assert.equal(sha(whole),spec.sha256);
 if(!spec.parts&&whole.length>limit){const original=spec.path;spec.parts=[];for(let offset=0;offset<whole.length;offset+=limit){const b=whole.subarray(offset,offset+limit),path=original+'.part'+String(spec.parts.length+1).padStart(2,'0');fs.writeFileSync(root+'/'+path,b);spec.parts.push({path,bytes:b.length,sha256:sha(b)});}assert(Buffer.concat(spec.parts.map(p=>fs.readFileSync(root+'/'+p.path))).equals(whole));delete spec.path;fs.unlinkSync(root+'/'+original);}
 records.push({sha256:spec.sha256,bytes:spec.bytes,parts:spec.parts?.length||1,originalCompressedBytesExactlyPreserved:true});
}
fs.writeFileSync(filename,JSON.stringify(manifest,null,2)+'\n');
const packageFile=root+'/validation/package.json',p=JSON.parse(fs.readFileSync(packageFile));p.largestPayloadBytes=p.largestPayloadBytes??p.largestFileBytes;p.largestFileBytes=Math.max(...[manifest.meta,manifest.summary,manifest.connectivity,manifest.finalState,...manifest.periods].flatMap(s=>s.parts||[s]).map(s=>s.bytes));fs.writeFileSync(packageFile,JSON.stringify(p,null,2)+'\n');
fs.writeFileSync(root+'/validation/transport-packaging.json',JSON.stringify({status:'passed',reason:'Connector request body limit 16MiB including base64; not repository size',maximumPartBytes:limit,numericalRunsRepeated:false,records},null,2)+'\n');console.log({status:'passed',periods:records.length,largestFileBytes:p.largestFileBytes});
