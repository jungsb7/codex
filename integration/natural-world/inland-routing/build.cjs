'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const Codec=require('../stage5/codec.js'),C=require('../core.js'),A=require('../retention-priority/analysis.cjs'),R=require('./core.js');
const base=path.resolve(__dirname,'..'),read=p=>{const b=fs.readFileSync(path.join(base,p));return JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(b):b);},hash=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex');
const paths=['downstream-budget/output/review.json.gz','retention-priority/output/atlas.json.gz','stage3/output/waterways.json','unified-atlas/output/atlas.json.gz'];
const [prior,screen,water,atlas]=paths.map(read),n=atlas.width*atlas.height;
for(const d of [prior,screen,water])for(const k of ['worldHash','geometryHash'])assert.equal(d.provenance[k],atlas.provenance[k]);
assert.equal(hash(paths[2]),prior.provenance.inputs[paths[2]]);assert.equal(hash(paths[1]),prior.provenance.inputs[paths[1]]);assert.equal(hash(paths[3]),prior.provenance.inputs[paths[3]]);
const decode=(d,len)=>Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,Codec.decode(v.data,len,v.type)])),u=decode(atlas,atlas.count),a=decode(water,n),index=new Map(Array.from(u.cells,(c,j)=>[c,j]));
const members=new Map(screen.groups.map(g=>[g.node,[]]));for(const c of u.cells)members.get(a.canonical[c])?.push(c);
const exclusions=new Set(prior.summary.excludedPreviousStudyBoundaries),screened=new Map(screen.groups.map(g=>[g.id,g])),geometryChecks=[];
const groups=prior.groups.map(old=>{
 const g=screened.get(old.id),reasons=[];
 if(exclusions.has(g.id))reasons.push('previous-study-held-or-closed');
 if(!['ocean','unresolved'].includes(g.outlet.target.kind))reasons.push('unsupported-target');
 reasons.push(...g.flags.filter(f=>f!=='next-boundary-unresolved'));
 const row={id:g.id,node:g.node,location:g.location,reachCount:old.reachCount,status:reasons.length?'held':'eligible',reasons:[...new Set(reasons)],outletTarget:g.outlet.target.id,target:g.outlet.target,periodInflowM3:old.periodInflowM3};
 if(reasons.length)return row;
 const domain=[...new Set([...members.get(g.node),...g.outlet.pathCells.slice(0,g.outlet.rootPathCells)])];
 const columns=domain.map(cell=>{const j=index.get(cell);assert(j!==undefined&&!u.lake[j]);return {cell,elevationM:u.elevation[j],areaM2:C.rowArea(atlas.width,atlas.height,Math.floor(cell/atlas.width))*1e6};});
 const connected=A.minimax(columns,atlas.width,atlas.height,g.node),crest=g.outlet.connectionLevelM;
 assert(columns.every(c=>connected.cost.get(c.cell)<=crest+1e-7));
 const capacityM3=columns.reduce((s,c)=>s+Math.max(0,crest-c.elevationM)*c.areaM2,0),referenceAreaM2=columns.filter(c=>c.elevationM<crest).reduce((s,c)=>s+c.areaM2,0);
 const route=[],seen=new Set();let cell=g.outlet.outsideCell;
 while(true){assert(!seen.has(cell));seen.add(cell);route.push(cell);const j=index.get(cell);
  if(j===undefined){assert.equal(g.outlet.target.kind,'ocean');assert.equal(cell,g.outlet.target.node);break;}
  assert(!u.lake[j]);
  if(a.depression[cell]){assert.equal(g.outlet.target.kind,'unresolved');assert.equal(a.canonical[cell],g.outlet.target.node);assert.equal(cell,g.outlet.target.entryCell);break;}
  assert.equal(a.canonical[cell],cell);assert(a.receiver[cell]>=0);const next=a.entry[cell];assert(next>=0);assert.equal(a.canonical[next],a.receiver[cell]);cell=next;
 }
 assert.deepEqual(route,g.outlet.pathCells.slice(g.outlet.rootPathCells));
 geometryChecks.push({id:g.id,domainCells:domain.length,crestM:crest,capacityM3,referenceAreaM2,routeCells:route.length});
 return {...row,capacityM3,referenceAreaM2,periodInflowM3:old.periodInflowM3,route,crestM:crest,columns};
});
// Capacity domains must not overlap: otherwise the model would store water twice.
const domainOwner=new Map();for(const g of groups.filter(g=>g.status==='eligible'))for(const c of g.columns){assert(!domainOwner.has(c.cell),'Overlapping capacity domains '+g.id);domainOwner.set(c.cell,g.id);}
const payload={schema:'inland-boundary-routing/1',provenance:{baseline:'be7d54ba577d2c93888f3a3aa82371902e07ad84',worldHash:atlas.provenance.worldHash,geometryHash:atlas.provenance.geometryHash,inputs:Object.fromEntries(paths.map(p=>[p,hash(p)])),code:Object.fromEntries(['inland-routing/core.js','inland-routing/build.cjs','downstream-routing/core.js','retention-priority/analysis.cjs'].map(p=>[p,hash(p)]))},groups,reaches:prior.reaches.map(r=>[r.id,prior.groups.find(g=>g.node===r.endpointNode).id]),automaticAdoption:false};
R.validate(payload);assert.equal(groups.length,1184);assert.equal(payload.reaches.length,23022);
fs.mkdirSync(path.join(__dirname,'output'),{recursive:true});const write=(name,d)=>fs.writeFileSync(path.join(__dirname,'output',name),JSON.stringify(d)+'\n');
write('catalog.json',payload);
const examples=[{years:100,lossMPerYear:0,initialFraction:0},{years:100,lossMPerYear:.5,initialFraction:0},{years:100,lossMPerYear:2,initialFraction:.5}].map(input=>{const r=R.run(payload,input);return {input,summary:r.summary};});
write('summary.json',{schema:'inland-boundary-routing-summary/1',examples,geometryChecks,physicalResolvedReaches:0,physicallyUnresolvedReaches:23022});
const bytes=fs.readFileSync(path.join(__dirname,'output/catalog.json'));write('manifest.json',{file:'catalog.json',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});console.log(JSON.stringify({bytes:bytes.length,examples},null,2));
