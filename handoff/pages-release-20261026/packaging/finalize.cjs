'use strict';
// Recompress PNG IDAT streams without changing a single decoded scanline byte
// or any non-IDAT chunk. Creates a new tree; no original path is overwritten.
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const [inputArg,priorArg,outputArg,reportArg]=process.argv.slice(2);if(!reportArg)throw Error('Usage: finalize.cjs INPUT PRIOR_REPORT NEW_OUTPUT NEW_REPORT');
const input=path.resolve(inputArg),prior=path.resolve(priorArg),output=path.resolve(outputArg),report=path.resolve(reportArg),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
if(fs.existsSync(output)||fs.existsSync(report))throw Error('Destination exists; refusing to overwrite');
const records=JSON.parse(fs.readFileSync(path.join(prior,'candidate-files.json'))),summary=JSON.parse(fs.readFileSync(path.join(prior,'build-summary.json'))),images=[];
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(report,{recursive:true});
function compactPng(b){
 assert(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));const chunks=[];
 for(let o=8;o<b.length;){const n=b.readUInt32BE(o),type=b.toString('ascii',o+4,o+8),whole=b.subarray(o,o+12+n),data=b.subarray(o+8,o+8+n);assert(o+12+n<=b.length);assert.equal(z.crc32(b.subarray(o+4,o+8+n)),b.readUInt32BE(o+8+n));chunks.push({type,whole,data});o+=12+n;}
 const oldData=Buffer.concat(chunks.filter(c=>c.type==='IDAT').map(c=>c.data)),raw=z.inflateSync(oldData);let compressed=oldData;
 for(const memLevel of [8,9]){const trial=z.deflateSync(raw,{level:9,memLevel});if(trial.length<compressed.length)compressed=trial;}
 assert(z.inflateSync(compressed).equals(raw));const chunk=Buffer.alloc(compressed.length+12);chunk.writeUInt32BE(compressed.length);chunk.write('IDAT',4);compressed.copy(chunk,8);chunk.writeUInt32BE(z.crc32(chunk.subarray(4,8+compressed.length)),8+compressed.length);
 let inserted=false;const parts=[b.subarray(0,8)];for(const c of chunks){if(c.type!=='IDAT')parts.push(c.whole);else if(!inserted){parts.push(chunk);inserted=true;}}
 const result=Buffer.concat(parts);return{bytes:result.length<b.length?result:b,scanlineSha256:hash(raw),nonIdatSha256:hash(Buffer.concat(chunks.filter(c=>c.type!=='IDAT').map(c=>c.whole)))};
}
for(const row of records){let b=fs.readFileSync(path.join(input,row.path));assert.equal(hash(b),row.sha256);if(row.path.endsWith('.png')){const p=compactPng(b);images.push({path:row.path,beforeBytes:b.length,afterBytes:p.bytes.length,decodedScanlineSha256:p.scanlineSha256,nonIdatChunksSha256:p.nonIdatSha256,decodedScanlinesIdentical:true,nonIdatChunksIdentical:true});if(p.bytes.length<b.length){b=p.bytes;row.changed=true;row.bytes=b.length;row.sha256=hash(b);}}
 const target=path.join(output,row.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{flag:'wx'});
}
summary.afterBytes=records.reduce((s,r)=>s+r.bytes,0);summary.savedBytes=summary.beforeBytes-summary.afterBytes;summary.belowOneBillionBytes=summary.afterBytes<1e9;summary.belowNineHundredMillionBytes=summary.afterBytes<=9e8;summary.headroomToOneBillionBytes=1e9-summary.afterBytes;summary.pngScanlineBytesPreserved=images.length;summary.status='built-numeric-bits-and-png-scanlines-verified';
for(const [name,value]of Object.entries({'candidate-files.json':records,'build-summary.json':summary,'png-preservation.json':images}))fs.writeFileSync(path.join(report,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
fs.copyFileSync(path.join(prior,'numeric-bit-preservation.json'),path.join(report,'numeric-bit-preservation.json'),fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({files:records.length,bytes:summary.afterBytes,saved:summary.savedBytes,headroom:summary.headroomToOneBillionBytes,pngs:images.length},null,2));
