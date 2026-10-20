'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto'),cp=require('node:child_process');
const B=require('./core.cjs'),V=require('./view.js'),K=require('../stage5/codec.js'),D=require('../cold-water/diagnostics.js');
const read=p=>{const b=fs.readFileSync(path.resolve(__dirname,p));return JSON.parse(p.endsWith('.gz')?z.gunzipSync(b):b);},d=read('output/review.json.gz'),prior=read('../d298591-surface/output/review.json.gz'),base=read('../stage5/output/foundation-fc5d72cbbab3.json.gz'),w=base.width,h=base.height,n=w*h,a=Object.fromEntries(['heights','land','lake'].map(k=>[k,K.decode(base.fields[k].data,n,base.fields[k].type)])),near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<=tol,`${a} != ${b} ± ${tol}`);
test('all input/code fingerprints and original world identity match current main and fixed archive evidence',()=>{
 for(const [p,hash]of Object.entries({...d.summary.provenance.inputs,...d.summary.provenance.code}))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',p))).digest('hex'),hash,p);
 assert.equal(d.summary.provenance.worldHash,prior.summary.provenance.worldHash);assert.equal(d.summary.provenance.geometryHash,prior.summary.provenance.geometryHash);
 assert.equal(d.audit.sha256,prior.summary.provenance.sourceProbes.sourceHashes['application/source/app.js']);assert(d.audit.evidence.some(e=>e.text.includes("['temp','pressure','u','v','cu','cv','wet']")));
});
test('all619 snow cells independently reconcile source storage, snowfall/melt and asymptotic imbalance',()=>{
 assert.equal(d.cells.length,619);let total=0;
 for(const c of d.cells){
  near(c.sourceEndSnowMm-c.sourceStartSnowMm,c.sourceSnowChangeMm,1e-8);
  near(c.sourceSnowfallMm-c.sourceMeltMm,c.sourceSnowChangeMm,1e-8);
  let snowfall=0,capacity=0;for(let k=0;k<12;k++){snowfall+=c.temperaturesC[k]<0?c.precipitationMm[k]:0;capacity+=45*Math.max(0,c.temperaturesC[k]);}
  near(c.sourceSnowChangeMm,Math.max(0,snowfall-capacity),1e-6);total+=c.sourceSnowChangeMm*c.areaM2/1000;
  assert.equal(c.elevationM,a.heights[c.cell]);assert.equal(c.actualSnowDepthM,null);
 }
 near(total,prior.summary.sourceEvidence.annual.snowChangeM3,.001);
 assert.deepEqual(d.summary.classes.map(c=>c.cells),[18,13,588]);assert(d.summary.classes.slice(0,2).every(c=>c.insidePriorColumns===0));
});
test('200 independent annual repetitions confirm all12 sensitivity balances instead of a spinup fix',()=>{
 for(const scenario of d.sensitivity)for(const [j,c]of d.cells.entries()){
  let snow=c.sourceStartSnowMm,delta=0;
  for(let year=0;year<200;year++){const start=snow;for(let k=0;k<12;k++){const t=c.temperaturesC[k]+scenario.warmingC;if(t<0)snow+=c.precipitationMm[k];snow=Math.max(0,snow-Math.max(0,t)*scenario.meltFactorMmPerCPerPeriod);}delta=snow-start;}
  near(delta,scenario.cellAccumulationMm[j],1e-6);
 }
});
test('zero/positive-temperature snow switches, finite storage and warming discontinuity preserve water',()=>{
 const t=Array(12).fill(-1),p=Array(12).fill(10);assert.equal(B.snowBalance(t,p).annualAccumulationMm,120);
 assert.equal(B.snowBalance(t,p,{warmingC:1}).annualAccumulationMm,0);near(B.balanceWarming(t,p),1,1e-10);
 const r=B.snowYear([1,...Array(11).fill(-1)],p,0);near(r.changeMm,110);near(r.meltMm,0);
 assert.throws(()=>B.snowBalance([],p));assert.throws(()=>B.snowYear(t,p,-1));assert.throws(()=>B.snowBalance(t,p,{meltFactor:-1}));
});
test('diagnostic wind interpolation reproduces source grid centres and stays distinct from measured 2m wind',()=>{
 const s=read('../stage2/inputs/seasonal.json'),g={...s.wind,months:s.wind.months.map(m=>({u:K.decode(m.u,4050,'f32'),v:K.decode(m.v,4050,'f32')}))};
 for(const [x,y]of [[0,0],[89,44],[35,11]])for(let k=0;k<12;k++){const r=B.interpolateWind(g,-180+(x+.5)*4,90-(y+.5)*4,k);near(r.u,g.months[k].u[y*90+x]);near(r.v,g.months[k].v[y*90+x]);near(r.speed,Math.hypot(r.u,r.v));}
 for(const c of d.cells.filter(c=>c.insidePriorColumns))for(let k=0;k<12;k++)assert.deepEqual(c.wind[k],B.interpolateWind(g,c.longitude,c.latitude,k));
 assert(d.audit.notProvidedBySelectedClimateSample.includes('measured wind height'));
});
test('solar flux agrees with independent hourly insolation quadrature and latent-unit conversion',()=>{
 const radians=Math.PI/180;
 for(const lat of [0,43,48,89])for(const phase of [0,90,180,270]){
  const dec=Math.asin(Math.sin(23.4*radians)*Math.sin(phase*radians)),phi=lat*radians;let sum=0;
  for(let k=0;k<7200;k++){const hourAngle=-Math.PI+(k+.5)/7200*2*Math.PI;sum+=1361*Math.max(0,Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(hourAngle))/7200;}
  near(D.solarAt(lat,phase).toaWm2,sum,.0001);
 }
 near(B.energy([d.cells[0]],1).requiredLatentWm2,1000*2450000/(365*86400));
 assert(d.summary.maxSolarRelativeDifference<.00001);
});
test('all12 fixed surface masks and144 energy periods match prior model and independent area weighting',()=>{
 for(const e of d.energy){
  const p=prior.scenarios.find(c=>c.id===e.id);assert.deepEqual(e.maskCells,p.final.wetCells);near(e.areaM2,p.final.areaM2,.001);assert.equal(e.fullEnergyBalanceClosed,false);assert.equal(e.actualEvaporationMPerYear,null);
  const cells=e.maskCells.map(id=>d.cells.find(c=>c.cell===id));
  for(let k=0;k<12;k++){const expected=cells.reduce((s,c)=>s+c.areaM2*c.temperaturesC[k],0)/e.areaM2;near(e.periods[k].meanAirTemperatureC,expected);assert.equal(e.periods[k].actualIceAreaM2,null);}
  assert.equal(e.belowZeroAirEquivalentDays,0);assert.deepEqual(e.shortwaveGapPeriods,e.evaporationMPerYear===2?[9,10]:[]);
 }
});
test('native connectivity wraps longitude, stops at marine/lake masks and blocks exactly one undirected edge',()=>{
 const toy={land:Uint8Array.from([1,0,0,1]),lake:new Uint8Array(4),heights:Float32Array.from([1,0,0,1])};
 assert.deepEqual(B.component(toy,4,1,0,1).cells,[0,3]);assert.deepEqual(B.component(toy,4,1,0,1,[0,3]).cells,[0]);
 toy.lake[1]=1;const r=B.component(toy,4,1,0,1,[0,3]);assert.deepEqual(r.lakeContacts,[1]);assert.equal(r.marineContacts.length,0);
});
test('all saved open/held components are complete and witness paths respect native elevations and deleted gate',()=>{
 const [g0,g1]=d.outlet.gate;
 for(const row of d.outlet.levels)for(const mode of ['open','gateHeld']){
  const r=row[mode],set=new Set(r.cells),blocked=(i,j)=>mode==='gateHeld'&&((i===g0&&j===g1)||(i===g1&&j===g0));assert.equal(set.size,r.cellCount);
  for(const i of r.cells){assert(a.land[i]&&!a.lake[i]&&a.heights[i]<=row.stageM);for(const j of B.neighbours(i,w,h))if(!blocked(i,j)&&a.land[j]&&!a.lake[j]&&a.heights[j]<=row.stageM)assert(set.has(j));}
  if(r.marineWitness)for(let k=1;k<r.marineWitness.length;k++){const i=r.marineWitness[k-1],j=r.marineWitness[k];assert(B.neighbours(i,w,h).includes(j)&&!blocked(i,j));if(a.land[j])assert(a.heights[j]<=row.stageM);}
  assert.equal(r.actualInundationAreaM2,null);
 }
 assert.deepEqual(d.summary.outletLevels.map(r=>r.gateHeldCells),[121,121,123,129,7686]);
 const candidate=d.outlet.candidateDomain;assert.equal(candidate.cells.length,132);assert.equal(candidate.extraCells.length,11);assert.deepEqual(candidate.missingSourceCells,[]);assert.equal(candidate.marineContactCount,0);assert.equal(candidate.adopted,false);assert.equal(candidate.actualCapacityM3,null);assert(candidate.cells.every(id=>d.cells.some(c=>c.cell===id)));
});
test('independent sorted-height union-find proves the first alternate marine threshold exactly',()=>{
 const active=new Uint8Array(n),parent=Int32Array.from({length:n+1},(_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(i,j)=>{i=find(i);j=find(j);if(i!==j)parent[j]=i;};
 const [g0,g1]=d.outlet.gate,ordered=[];for(let i=0;i<n;i++)if(a.land[i]&&!a.lake[i])ordered.push(i);ordered.sort((i,j)=>a.heights[i]-a.heights[j]||i-j);
 let threshold=null;const seed=prior.model.node;
 for(const i of ordered){
  active[i]=1;const x=i%w,y=Math.floor(i/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||y+dy<0||y+dy>=h)continue;const j=(y+dy)*w+(x+dx+w)%w;if((i===g0&&j===g1)||(i===g1&&j===g0)||a.lake[j])continue;if(!a.land[j])join(i,n);else if(active[j])join(i,j);}
  if(active[seed]&&find(seed)===find(n)){threshold=a.heights[i];break;}
 }
 assert.equal(threshold,d.outlet.bypass.levelM);assert.equal(d.outlet.bypass.riseM,threshold-d.outlet.crestM);
 assert.equal(B.component(a,w,h,seed,threshold-1e-7,d.outlet.gate).marineContacts.length,0);
});
test('all25 outlet guards preserve unknown routing, distinguish stage from energy head and flag tailwater',()=>{
 for(const r of d.outlet.levels)for(const g of r.guard){assert.equal(g.coupledRoutingReady,false);assert.equal(g.actualDischargeM3S,null);assert.equal(g.physicalWidthM,null);assert(g.negligibleApproachVelocityAssumed);if(r.stageRiseM>0&&g.tailwaterDepthM>0)assert.equal(g.freeFlowScreen,'tailwater-correction-required');}
 assert.equal(d.outlet.actualLocalTailwaterM,null);assert.equal(d.outlet.originalSeaDatumM,0);
 assert.throws(()=>B.outletGuard({stageRiseM:NaN,extraCells:0,bypass:false,tailwaterDepthM:0}));
});
test('AI/UI selections bind source, diagnostic assumptions and null values; malformed queries and payloads fail',()=>{
 V.validate(d);for(const s of d.sensitivity)for(const r of d.outlet.levels){const q=V.select(d,{warmingC:s.warmingC,meltFactor:s.meltFactorMmPerCPerPeriod,stageRiseM:r.stageRiseM});assert(Object.values(q.actual).every(v=>v===null));assert.equal(q.snow.appliedToHydrology,false);assert.equal(q.automaticAdoption,false);}
 assert.throws(()=>V.select(d,{cell:0}));assert.throws(()=>V.select(d,{warmingC:3}));assert.throws(()=>V.select(d,{tailwaterDepthM:10}));assert.throws(()=>V.validate({...d,schema:'wrong'}));
 const q=JSON.parse(cp.execFileSync(process.execPath,[path.join(__dirname,'query.cjs'),'274035','2','90','E1-G0-I0','1','.5'],{encoding:'utf8'}));assert.deepEqual(q,V.select(d,{cell:274035,warmingC:2,meltFactor:90,energyId:'E1-G0-I0',stageRiseM:1,tailwaterDepthM:.5}));
});
