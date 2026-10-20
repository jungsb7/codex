'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),z=require('node:zlib'),cp=require('node:child_process');
const H=require('./core.js'),Old=require('../d298591-hydraulics/core.js'),V=require('./view.js'),{examples,copy,section,reach,input}=require('./examples.cjs'),d=V.validate(require('./output/catalog.json')),fixture=id=>copy(examples.find(p=>p.id===id).input);
const near=(a,b,tol=1e-7)=>assert(Math.abs(a-b)<=tol,`${a} vs ${b}; tolerance ${tol}`);
test('mandatory typed assumptions, geometry and loss values; no automatic values',()=>{
 const p=fixture('two-branches');
 for(const mutate of [
  x=>delete x.gravityMPerS2,x=>x.alpha=1.1,x=>delete x.momentumAssumption,x=>x.downstream.depthM=null,
  x=>delete x.reaches[1].junctionLossM,x=>delete x.reaches[1].junctionAngleDeg,x=>x.reaches[1].junctionLossM=-.1,
  x=>delete x.reaches[0].expansionCoefficient,x=>x.reaches[1].inflowM3S=0,x=>x.reaches[1].inflowM3S=-10,
  x=>x.reaches[1].inflowM3S='60',x=>x.reaches[1].sections[0].widthM=NaN,
  x=>delete x.reaches[1].sections[1].bankDepthM,x=>x.reaches[0].sections[1].xM=0
 ]){const a=copy(p);mutate(a);const r=H.solve(a);assert.equal(r.status,'invalid-input');assert.deepEqual(r.reaches,[]);assert(Object.values(r.actual).every(v=>v===null));}
});
test('tree topology rejects duplicate IDs, cycles, absent links and station totals',()=>{
 for(const mutate of [
  p=>p.reaches[2].id='main',p=>p.reaches[1].downstreamId='main',p=>p.reaches[1].downstreamId='missing',
  p=>p.reaches[0].downstreamId='side',p=>p.downstream.reachId='main',p=>p.reaches[0].inflowM3S=100
 ]){const p=fixture('two-branches');mutate(p);assert.equal(H.solve(p).status,'invalid-input');}
 const p=fixture('two-branches');p.reaches.reverse();assert.equal(H.solve(p).summary.outflowM3S,100);
});
test('analytic uniform rectangular flow preserves normal depth and bed-drop energy',()=>{
 for(const width of [10,100,1000]){
  const y=2,n=.03,S=.0001,A=width*y,R=A/(width+2*y),Q=A*R**(2/3)*Math.sqrt(S)/n;
  const p=input([reach('out',null,Q,[section(0,2,width),section(20000,0,width)])]);p.downstream.depthM=y;
  const r=H.solve(p);assert.equal(r.status,'completed');near(r.reaches[0].upstreamDepthM,y,1e-8);near(r.reaches[0].totalLossM,2,1e-8);
 }
});
test('constant-section limit agrees with independently integrated phase28 GVF',()=>{
 for(const [width,Q,depth,length]of [[100,100,5,20000],[1000,1000,10,487056.3661590521],[1000,1000,2,20000]]){
  const p=input([reach('out',null,Q,[section(0,length*1e-5,width),section(length,0,width)])]);p.downstream.depthM=depth;
  const n=p.reaches[0].sections[0].manningN=.05;p.reaches[0].sections[1].manningN=n;
  const old=Old.solve({schema:Old.schema,kind:p.kind,section:'rectangular-prismatic',widthM:width,bankDepthM:20,manningN:n,flowM3S:Q,bedSlope:1e-5,downstreamDepthM:depth,lengthM:length,gravityMPerS2:p.gravityMPerS2});
  const r=H.solve(p,{maxStepM:25});assert.equal(r.status,old.status);near(r.reaches[0].upstreamDepthM,old.summary.upstreamEndDepthM,2e-6);
 }
});
// Independent differential energy equation, including changing width and the
// sign-dependent velocity-head loss. No production properties/root functions.
function differentialEnd(p,r,q,stepM=2){
 let y=p.downstream.depthM;const g=p.gravityMPerS2;
 for(let i=r.sections.length-2;i>=0;i--){
  const a=r.sections[i],b=r.sections[i+1],L=b.xM-a.xM,N=Math.ceil(L/stepM),h=L/N;
  const f=(s,y)=>{
   const width=b.widthM+(a.widthM-b.widthM)*s/L,n=b.manningN+(a.manningN-b.manningN)*s/L,bs=(a.widthM-b.widthM)/L,zs=(a.bedM-b.bedM)/L;
   const A=width*y,R=A/(width+2*y),vh=(q/A)**2/(2*g),Sf=(n*q/(A*R**(2/3)))**2,B=-2*vh/y,C=-2*vh*bs/width;
   for(const sign of [-1,1]){const k=sign<0?r.contractionCoefficient:r.expansionCoefficient,dy=(Sf-zs-(1-k*sign)*C)/(1+(1-k*sign)*B);if(sign*(C+B*dy)>=-1e-12)return dy;}
   throw Error('No differential loss branch');
  };
  for(let k=0;k<N;k++){const s=k*h,k1=f(s,y),k2=f(s+h/2,y+h*k1/2),k3=f(s+h/2,y+h*k2/2),k4=f(s+h,y+h*k3);y+=h*(k1+2*k2+2*k3+k4)/6;}
 }
 return y;
}
test('variable geometry and losses converge to independent differential-energy RK4',()=>{
 const p=fixture('taper'),ref=differentialEnd(p,p.reaches[0],100),errors=[];
 for(const maxStepM of [100,50,25]){const r=H.solve(p,{maxStepM});assert.equal(r.status,'completed');errors.push(Math.abs(r.reaches[0].upstreamDepthM-ref));}
 assert(errors[1]<errors[0]/3);assert(errors[2]<errors[1]/3);assert(errors[2]<2e-7);
});
test('two tributaries and nested tributary sum each leaf exactly once',()=>{
 const p=fixture('two-branches'),r=H.solve(p);assert.equal(r.status,'completed');assert.deepEqual(r.flowLedger.map(x=>x.flowM3S),[60,40,100]);near(r.junctions[0].massResidualM3S,0,0);
 p.reaches[1].inflowM3S=null;
 p.reaches.push(reach('upper1','main',15,[section(0,.3,20),section(5000,.2,20)]),reach('upper2','main',45,[section(0,.3,40),section(5000,.2,40)]));
 const nested=H.solve(p);assert.equal(nested.status,'completed');assert.equal(nested.summary.outflowM3S,100);assert.deepEqual(nested.flowLedger.find(x=>x.reachId==='out').leafIds,['upper1','upper2','side']);
 for(const j of nested.junctions)near(j.massResidualM3S,0,0);
 assert(Math.abs(nested.summary.globalEnergyResidualM4S)<1e-5);
});
test('independent energy-flux accounting includes every reach and prescribed junction loss',()=>{
 const p=fixture('junction-losses'),r=H.solve(p),g=p.gravityMPerS2;
 const energy=(s,q)=>s.bedM+s.depthM+(q/(s.widthM*s.depthM))**2/(2*g);
 const sf=(s,q)=>{const a=s.widthM*s.depthM;return (s.manningN*q/(a*(a/(s.widthM+2*s.depthM))**(2/3)))**2;};
 let loss=60*.2+40*.5;
 for(const rr of r.reaches){const def=p.reaches.find(x=>x.id===rr.id),q=rr.flowM3S;
  for(let i=1;i<rr.profile.length;i++){const down=rr.profile[i-1],up=rr.profile[i],friction=(down.xM-up.xM)*(sf(up,q)+sf(down,q))/2,vd=(q/(down.widthM*down.depthM))**2/(2*g),vu=(q/(up.widthM*up.depthM))**2/(2*g),local=(vd>=vu?def.contractionCoefficient:def.expansionCoefficient)*Math.abs(vd-vu);loss+=q*(friction+local);near(energy(up,q)-energy(down,q),friction+local,1e-8);}
 }
 const inlet=r.reaches.filter(x=>x.id!=='out').reduce((v,x)=>v+x.flowM3S*energy(x.profile.at(-1),x.flowM3S),0),outlet=100*energy(r.reaches[0].profile[0],100);
 near(inlet-outlet,loss,1e-5);near(r.junctions[0].lossFluxM4S,32,1e-10);
 for(const b of r.junctions[0].branches){const s=p.reaches.find(x=>x.id===b.reachId).sections.at(-1),y=b.depthM;near(y**3-(b.targetEnergyM-s.bedM)*y*y+b.flowM3S**2/(2*g*s.widthM**2),0,1e-7);}
});
test('four variable/loss networks are stable on halving numerical spacing',()=>{
 for(const id of ['taper','two-branches','variable-branches','junction-losses']){
  const a=H.solve(fixture(id)),b=H.solve(fixture(id),{maxStepM:25});assert.equal(a.status,b.status);
  for(let i=0;i<a.reaches.length;i++)near(a.reaches[i].upstreamDepthM,b.reaches[i].upstreamDepthM,1e-6);
 }
});
test('unmodeled angles and insufficient junction energy atomically block upstream computation',()=>{
 for(const id of ['angle-held','junction-held']){
  const r=H.solve(fixture(id));assert.equal(r.status,'stopped');assert.equal(r.junctions[0].status,'held');assert.equal(r.junctions[0].energyResidualM4S,null);
  for(const rr of r.reaches.slice(1)){assert.equal(rr.status,'blocked');assert.deepEqual(rr.profile,[]);assert.equal(rr.upstreamDepthM,null);}
  assert.equal(r.summary.globalEnergyResidualM4S,null);
 }
});
test('bank, steep geometry, critical and rapid-change guards leave valid prefixes only',()=>{
 const held=H.solve(fixture('bank-held'));assert.equal(held.status,'held-boundary');assert.deepEqual(held.reaches[0].profile,[]);
 for(const id of ['bank-stop','width-stop']){
  const r=H.solve(fixture(id)),rr=r.reaches[0];assert.equal(r.status,'stopped');assert.equal(rr.upstreamDepthM,null);assert.equal(rr.totalLossM,null);
  for(const s of rr.profile){assert(s.depthM<s.bankDepthM);assert(s.froude<.98);}
  assert(rr.profile.at(-1).xM>0);
 }
 const p=fixture('constant');p.reaches[0].sections[0].bedM=500;assert.equal(H.solve(p).reaches[0].stop.reason,'steep-bed');
 p.reaches[0].sections[0].bedM=.2;p.downstream.depthM=.01;assert.equal(H.solve(p).reaches[0].stop.reason,'critical-or-coefficient-limit');
 p.downstream.depthM=1;p.reaches[0].inflowM3S=150;p.reaches[0].sections=[section(0,0),section(1,0)];p.reaches[0].sections.forEach(s=>s.manningN=.2);
 assert.equal(H.solve(p).reaches[0].stop.reason,'rapid-depth-change');
});
test('10 stored scenarios reproduce outputs and retain all actual/prior guards',()=>{
 for(const p of d.presets){const r=V.result(d,p.input).candidate;assert.equal(r.status,p.expected.status);assert.deepEqual(r.summary,p.expected.summary);assert.deepEqual(r.junctions,p.expected.junctions);assert(Object.values(r.actual).every(x=>x===null));assert.equal(r.automaticAdoption,false);assert.equal(r.coupledRoutingReady,false);assert.equal(r.physicalResolvedReaches,0);assert.equal(r.unresolvedReaches,23022);assert.equal(r.priorTailwaterHeldCases,108);assert.equal(r.priorAlternateLimitCases,14);if(r.status==='completed')assert(Math.abs(r.summary.globalEnergyResidualM4S)<1e-5);}
});
test('original 12-phase increment ledger reconstructs mouth without station-total duplication',()=>{
 const src=JSON.parse(z.gunzipSync(fs.readFileSync(path.join(__dirname,'../d298591-tailwater/output/review.json.gz'))));
 for(let k=0;k<12;k++){
  const ledger=d.sourceLedger.periods[k];near(ledger.initialM3S,src.rows[0].periods[k].sourceBaseM3S,0);
  let q=ledger.initialM3S;
  for(let i=1;i<src.rows.length;i++){const p=src.rows[i].periods[k],increment=ledger.increments[i-1];near(increment.localM3S,p.localBaseM3S,0);near(increment.sideM3S,src.rows[i].sideInputs.reduce((v,s)=>v+s.periodFlowM3S[k],0),1e-9);q+=increment.localM3S+increment.sideM3S;near(q,p.sourceBaseM3S,1e-8);assert.equal(p.d298591ReleaseIncluded,false);}
  near(q,ledger.mouthM3S,1e-8);assert.equal(ledger.increments.length,61);
 }
 assert.equal(d.sourceLedger.hydraulicInputReady,false);assert.equal(d.sourceLedger.releaseIncluded,false);
});
test('code/input SHA receipts, manifest integrity, and explicit CLI output agree',()=>{
 for(const [file,hash]of Object.entries({...d.provenance.inputs,...d.provenance.code}))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash);
 const bytes=fs.readFileSync(path.join(__dirname,'output/catalog.json')),m=require('./output/manifest.json');assert.equal(bytes.length,m.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.sha256);
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'query.cjs'),'two-branches'],{encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(run.status,0);assert.deepEqual(JSON.parse(run.stdout),V.result(d,fixture('two-branches')));
 assert.equal(cp.spawnSync(process.execPath,[path.join(__dirname,'query.cjs')]).status,1);
 const dir=fs.mkdtempSync('/tmp/confluence-test-');try{const f=path.join(dir,'invalid.json');fs.writeFileSync(f,JSON.stringify({...fixture('constant'),gravityMPerS2:null}));const bad=cp.spawnSync(process.execPath,[path.join(__dirname,'query.cjs'),'--input',f],{encoding:'utf8'});assert.equal(bad.status,2);assert.equal(JSON.parse(bad.stdout).candidate.status,'invalid-input');}finally{fs.rmSync(dir,{recursive:true});}
});
