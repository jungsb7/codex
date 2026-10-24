'use strict';
const assert=require('node:assert/strict'),P=require('../pond-budget/core.js'),N=require('../inland-routing/core.js'),S=require('./source.cjs'),North=require('./north-source.cjs'),Geo=require('../core.js');
function plan(network,models){
 const original=N.plan(network),byNode=new Map(models.map(m=>[m.node,m])),by=new Map(models.map(m=>[m.id,m])),roots=new Map(models.map(m=>[m.id,P.hierarchy(m.partition,m.limitM).root]));
 const adj=new Map(models.map(m=>[m.id,new Set()])),issues=new Map(models.map(m=>[m.id,[]])),external=new Map(models.map(m=>[m.id,[]]));
 const join=(a,b)=>{adj.get(a).add(b);adj.get(b).add(a);};
 for(const m of models){const g=original.by.get(m.id);if(m.domainStatus!=='positive-head-domain')issues.get(m.id).push('native-contact-at-or-below-crest');
  if(by.has(g.target.id))join(m.id,g.target.id);
  for(const f of m.outlets){const ocean=g.target.kind==='ocean'&&g.target.node===f.targetNode,t=ocean?null:byNode.get(f.targetNode);
   if(t)join(m.id,t.id);else if(!ocean)external.get(m.id).push(f);
   for(const b of [m,t].filter(Boolean))if(roots.get(b.id).mergeM!==null&&roots.get(b.id).mergeM>f.crestM)issues.get(b.id).push('face-below-internal-merge');
  }
 }
 const seen=new Set(),components=[];
 for(const m of models){if(seen.has(m.id))continue;const ids=[m.id];seen.add(m.id);for(let k=0;k<ids.length;k++)for(const id of adj.get(ids[k]))if(!seen.has(id)){seen.add(id);ids.push(id);}ids.sort();
  const reasons=ids.flatMap(id=>[...new Set(issues.get(id))].map(reason=>({id,reason})));
  components.push({id:ids[0],ids,boundaries:ids.length,reaches:ids.reduce((s,id)=>s+original.by.get(id).reachCount,0),cells:ids.reduce((s,id)=>s+by.get(id).assignments.length,0),status:reasons.length?'geometry-held':'ready',reasons,externalContacts:ids.flatMap(id=>external.get(id).map(f=>({id,...f})))});
 }
 return {components,original,external,byNode};
}
function prepare(network,models,source,fullPlan,tilt){
 const chosen=new Set(models.map(m=>m.id)),flows=new Map(),reference=new Map();
 for(const id of fullPlan.original.order){const g=fullPlan.original.by.get(id),q=g.periodInflowM3.reduce((s,v)=>s+v,0)/(365*86400)+(flows.get(id)||0);reference.set(id,q);if(fullPlan.original.by.get(g.target.id)?.status==='eligible')flows.set(g.target.id,(flows.get(g.target.id)||0)+q);}
 const seen=new Set();const prepared=models.map(original=>{
  const contacts=fullPlan.external.get(original.id),limitM=Math.min(original.limitM,...contacts.map(f=>f.crestM));
  const model={...original,nativeLimitM:original.limitM,limitM,externalContacts:contacts,outlets:original.outlets.filter(f=>!contacts.includes(f))};
  const group=fullPlan.original.by.get(model.id);for(const id of fullPlan.original.active.filter(g=>g.target.id===model.id).map(g=>g.id))assert(chosen.has(id),'Missing upstream');
  const cells=model.assignments.map(a=>a.cell),area=new Float64Array(cells.length),fields={precipitationMm:new Float64Array(cells.length*12),temperatureC:new Float64Array(cells.length*12),pet:new Float64Array(cells.length*12)},initial=[];
  cells.forEach((cell,j)=>{assert(!seen.has(cell));seen.add(cell);const i=source.index.get(cell);assert(i!==undefined);area[j]=source.area[i];fields.precipitationMm.set(source.p.subarray(i*12,i*12+12),j*12);fields.temperatureC.set(source.t.subarray(i*12,i*12+12),j*12);const north=source.north.get(cell);initial.push(north?{north:true,state:[...north]}:{north:false,state:[source.snow[i],source.shallow[i]]});if(north)fields.pet.set(North.potentialET(Array.from(source.t.subarray(i*12,i*12+12)),Geo.ll(model.width,model.height,cell)[1],tilt),j*12);});
  return {model,group,cells,area,fields,initial,referenceRateM3S:reference.get(model.id),originalOutletCount:original.outlets.length};
 });return {network,prepared};
}
module.exports={plan,prepare};
