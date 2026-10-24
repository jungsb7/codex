'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const G=require('../coupled-water-model/geometry.cjs'),K=require('../stage5/codec.js'),P=require('../pond-budget/core.js'),C=require('../core.js');
const base=path.resolve(__dirname,'..'),read=p=>{const b=fs.readFileSync(path.join(base,p));return JSON.parse(p.endsWith('.gz')?z.gunzipSync(b):b);};
const files=['inland-routing/output/catalog.json','retention-priority/output/atlas.json.gz','stage3/output/waterways.json','stage5/output/foundation-fc5d72cbbab3.json.gz','basin-water-budget/inputs/models.json'];
const [network,screen,water,foundation,old]=files.map(read),w=foundation.width,h=foundation.height,n=w*h;
for(const d of [screen,water,foundation,old])for(const k of ['worldHash','geometryHash'])assert.equal(d.provenance[k],network.provenance[k]);
const a=Object.fromEntries(['heights','land','lake'].map(k=>[k,K.decode(foundation.fields[k].data,n,foundation.fields[k].type)]));
const flow=Object.fromEntries(['canonical','receiver','entry','terminal'].map(k=>[k,K.decode(water.fields[k].data,n,water.fields[k].type)]));
a.owner=Int32Array.from({length:n},(_,i)=>flow.terminal[flow.canonical[i]]??-1);
const excluded=new Set(['D298591','D301678','D307820']),active=network.groups.filter(g=>g.status==='eligible'&&!excluded.has(g.id));
const coupledNodes=new Set(active.map(g=>g.node));
const sources=new Map(active.map(g=>[g.node,[]]));for(let i=0;i<n;i++)if(a.land[i]&&!a.lake[i])sources.get(a.owner[i])?.push(i);
const screenBy=new Map(screen.groups.map(g=>[g.id,g])),models=[],checks=[];
for(const g of active){
 const sourceCells=sources.get(g.node),prior=screenBy.get(g.id),gate=[prior.outlet.insideCell,prior.outlet.outsideCell];
 assert(g.columns.every(c=>a.owner[c.cell]===g.node));
 const d=G.domain(a,w,h,{node:g.node,crestM:g.crestM,gate,targetNode:g.target.node,coupledNodes});
 const original=new Set(g.columns.map(c=>c.cell));
 // If another exit is already reachable at the crest, keep the exact original
 // geometry as a bounded diagnostic only. Do not invent a positive outlet head.
 const cells=d.status==='positive-head-domain'?d.cells:[...original].sort((a,b)=>a-b);
 assert([...original].every(i=>cells.includes(i)),g.id+' lost original column');
 assert(cells.every(i=>a.owner[i]===g.node&&!a.lake[i]&&a.land[i]));
 const columns=cells.map(cell=>({cell,elevationM:a.heights[cell],areaM2:C.rowArea(w,h,Math.floor(cell/w))*1e6}));
 const partition=P.partition(columns,w,h,(i,j)=>C.distance(C.ll(w,h,i),C.ll(w,h,j)));
 const assignments=sourceCells.map(cell=>{
  if(partition.labels.has(cell))return {cell,leaf:partition.labels.get(cell),entryCell:cell};
  let i=flow.canonical[cell],entryCell=null;const seen=new Set();
  while(entryCell===null){assert(i>=0&&!seen.has(i));seen.add(i);if(partition.labels.has(i)){entryCell=i;break;}if(partition.labels.has(flow.entry[i])){entryCell=flow.entry[i];break;}i=flow.receiver[i];}
  return {cell,entryCell,leaf:partition.labels.get(entryCell)};
 });
 if(!d.outlets.length)d.outlets=[{from:gate[0],to:gate[1],crestM:g.crestM,kind:g.target.kind,targetNode:g.target.node}];
 const limitM=Math.max(g.crestM,d.limitM),model={id:g.id,node:g.node,width:w,height:h,crestM:g.crestM,limitM,domainStatus:d.status,outlets:d.outlets,columns:columns.map(c=>({...c,leaf:partition.labels.get(c.cell)})),partition:{groups:partition.groups,edges:partition.edges},assignments,initialLeaf:partition.labels.get(g.node)};
 const tree=P.hierarchy(model.partition,limitM),maxMerge=Math.max(...tree.nodes.filter(n=>n.mergeM!==null).map(n=>n.mergeM),-Infinity);
 const row={id:g.id,node:g.node,reachCount:g.reachCount,sourceCells:sourceCells.length,originalColumns:g.columns.length,originalCellIds:g.columns.map(c=>c.cell),columns:columns.length,additionalColumns:columns.length-g.columns.length,
  ...d,cells:undefined,activation:undefined,originalCapacityM3:g.capacityM3,limitCapacityM3:tree.root.capacityM3,maximumMergeM:Number.isFinite(maxMerge)?maxMerge:null,
  outletFaces:d.outlets.length,candidateOutletFaces:d.outlets.filter(e=>e.targetNode!==g.target.node).length,lowerOutletFaces:d.outlets.filter(e=>e.crestM<g.crestM).length,engineCompatibility:d.riseM<=0?'contact-at-or-below-reference-crest':d.outlets.some(e=>e.crestM<g.crestM)?'lower-outlet-needs-pool-drainage':'reference-crest-compatible',sourceLedgerAvailable:old.models.some(m=>m.id===g.id),newClosedPondsAboveCrest:maxMerge>g.crestM};
 checks.push(row);models.push(model);
}
const owners=new Map();for(const m of models)for(const a of m.assignments){assert(!owners.has(a.cell));owners.set(a.cell,m.id);}
const provenance={baseCommit:'f9bde616a76459f74b23bf73a7262dc90750c99d',worldHash:network.provenance.worldHash,geometryHash:network.provenance.geometryHash,sha256:Object.fromEntries(files.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex')]))};
const out=path.join(__dirname,'output');const save=(file,data)=>fs.writeFileSync(path.join(out,file),file.endsWith('.gz')?z.gzipSync(JSON.stringify(data),{level:9}):JSON.stringify(data,null,2)+'\n');
save('models.json.gz',{schema:'coupled-water-models/1',provenance,models});
const coverage=network.groups.map(g=>({id:g.id,reaches:g.reachCount,status:g.status==='held'?'original-hold':excluded.has(g.id)?'previous-study-component-excluded':'geometry-and-source-assignment-prepared',reasons:g.reasons,actual:null}));
save('domains.json',{schema:'terrain-water-domains/1',provenance,boundaries:checks,coverage,summary:{preparedBoundaries:models.length,preparedSourceCells:owners.size,preparedReaches:active.reduce((s,g)=>s+g.reachCount,0),additionalColumns:checks.reduce((s,g)=>s+g.additionalColumns,0),positiveHeadDomains:checks.filter(g=>g.status==='positive-head-domain').length,zeroHeadDomains:checks.filter(g=>g.status!=='positive-head-domain').length,aboveCrestMerges:checks.filter(g=>g.newClosedPondsAboveCrest).map(g=>g.id),lowerOutletBoundaries:checks.filter(g=>g.lowerOutletFaces).map(g=>g.id),forcingAvailableBoundaries:checks.filter(g=>g.sourceLedgerAvailable).length},automaticAdoption:false});
console.log(JSON.stringify({boundaries:models.length,cells:owners.size,lower:checks.filter(c=>c.lowerOutletFaces).map(c=>c.id),noHead:checks.filter(c=>c.riseM<=0).map(c=>c.id)}));
