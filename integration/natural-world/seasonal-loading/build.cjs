'use strict';
// Repackage verified inputs only: no physical model is recalculated.
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(__dirname,'output'),read=f=>fs.readFileSync(path.join(root,f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sources=JSON.parse(read('atlas-experience/output/sources.json'));
for(const id of ['climate','water']){const p=sources.parts.find(p=>p.id===id);if(sha(read(p.source))!==p.sourceSha256)throw Error(id+' source hash mismatch');}
const atlasBytes=read('unified-atlas/output/atlas.json.gz'),d=JSON.parse(z.gunzipSync(atlasBytes)),U=require('../unified-atlas/core.js'),E=require('../atlas-experience/core.js'),m=U.create(d),cl=JSON.parse(read('stage2/output/diagnostics.json')),w=JSON.parse(read('stage3/output/waterways.json')),c=E.climate(m,cl),monthly=Buffer.from(w.monthly,'base64');
E.water(m,w);fs.mkdirSync(out,{recursive:true});
function emit(name,raw){const bytes=z.gzipSync(raw,{level:9}),hash=sha(bytes),file=`${name}-${hash.slice(0,12)}.gz`;fs.writeFileSync(path.join(out,file),bytes);return {file,bytes:bytes.length,rawBytes:raw.length,sha256:hash};}
function floats(...arrays){const b=Buffer.alloc(arrays.reduce((n,a)=>n+a.length*4,0));let offset=0;for(const a of arrays)for(const v of a){b.writeFloatLE(v,offset);offset+=4;}return b;}
const stats=emit('rain-range',floats(c.min,c.max));
const reaches=w.reaches.map((r,i)=>Object.fromEntries([...['id','start','end','nextNode','endpointNode','endpointKind','downstreamReach','upstreamReaches','lengthKm','catchmentAreaKm2','nodeIndex'].map(k=>[k,r[k]]),['flowIndex',i]]));
const metadata=emit('water-metadata',Buffer.from(JSON.stringify({provenance:w.provenance,reaches,trunks:w.trunks,lake:w.lake})));
const periods=[];
for(let k=0;k<12;k++){const t=new Float32Array(d.count),p=new Float32Array(d.count);for(let j=0;j<d.count;j++){t[j]=c.t[j*12+k];p[j]=c.p[j*12+k];}const q=Buffer.alloc(w.reaches.length*2);w.reaches.forEach((r,i)=>q.writeUInt16LE(monthly.readUInt16LE((r.nodeIndex*12+k)*2),i*2));periods.push({period:k+1,...emit('period-'+String(k+1).padStart(2,'0'),Buffer.concat([floats(t,p),q]))});}
// A chart reads only its selected cell block, independently from the map cache.
const chartBlockCells=2048,charts=[];for(let start=0;start<d.count;start+=chartBlockCells){const count=Math.min(chartBlockCells,d.count-start);charts.push({start,count,...emit('chart-'+String(charts.length).padStart(3,'0'),floats(c.p.subarray(start*12,(start+count)*12)))});}
const manifest={schema:'atlas-season-stream/1',baselineCommit:'c3e35086a1cbdde37424225d117eb412d56fec83',atlasSHA256:sha(atlasBytes),worldHash:d.provenance.worldHash,geometryHash:d.provenance.geometryHash,cellCount:d.count,reachCount:d.reaches.length,cellsSHA256:sha(Buffer.from(m.a.cells.buffer,m.a.cells.byteOffset,m.a.cells.byteLength)),provenance:c.provenance,meaning:c.meaning,sourceHashes:Object.fromEntries(sources.parts.filter(p=>['climate','water'].includes(p.id)).map(p=>[p.source,p.sourceSha256])),layout:'little-endian: count f32 temperatures, count f32 precipitation, reachCount u16 log-flow in metadata reach order; expm1(code/2048) rounded to f32',cachePeriods:3,chartBlockCells,stats,metadata,periods,charts};
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const first=fs.statSync(path.join(out,'manifest.json')).size+stats.bytes+metadata.bytes+Math.max(...periods.map(p=>p.bytes))+Math.max(...charts.map(p=>p.bytes));
if(first>10_000_000)throw Error('first-selection transfer budget exceeded');
console.log(JSON.stringify({firstSelectionWorstCaseBytes:first,withTwoAdjacentPeriods:first+periods.map(p=>p.bytes).sort((a,b)=>b-a).slice(0,2).reduce((a,b)=>a+b,0),statsBytes:stats.bytes,metadataBytes:metadata.bytes,periodBytes:periods.map(p=>p.bytes),chartMaxBytes:Math.max(...charts.map(p=>p.bytes))},null,2));
