'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),M=require('./core.js'),V=require('./view.js'),{base,copy}=require('./examples.cjs'),d=V.validate(require('./output/catalog.json')),fixture=id=>copy(d.presets.find(x=>x.id===id).input);
const near=(a,b,t=1e-7)=>assert(Math.abs(a-b)<t,`${a} vs ${b} tolerance ${t}`);
test('all physical assumptions and force components are explicit typed values',()=>{
 for(const change of [p=>delete p.densityKgM3,p=>p.gravityMPerS2=null,p=>p.alpha=2,p=>delete p.closure,p=>p.externalWorkW=1,p=>delete p.forces.frictionN.y,p=>p.forces.wallN.x=NaN,p=>p.inlets[0].flowM3S=0,p=>p.inlets[0].flowM3S=-1,p=>p.inlets[0].flowM3S='50',p=>p.outlet.flowM3S=100,p=>delete p.inlets[0].comparisonLossM,p=>p.inlets[0].angleDeg=90,p=>p.inlets[1].id=p.inlets[0].id]){
  const p=base();change(p);const r=M.solve(p);assert.equal(r.status,'invalid-input');assert.equal(r.trial,null);assert.equal(r.accepted,null);
 }
});
test('parallel equal-speed analytic case has depth5, zero net force and zero loss within tolerance',()=>{
 const r=M.solve(base());assert.equal(r.status,'completed');near(r.accepted.commonInletWaterM,5,1e-9);assert.equal(r.trial.outlet.flowM3S,100);assert.equal(r.trial.audit.massResidualM3S,0);
 near(r.trial.outlet.pressureN,1000*9.80665*100*25/2);near(r.trial.outlet.momentumFluxN,20000);
 assert(Math.abs(r.trial.audit.energy.requiredDissipationW)<r.trial.audit.energy.toleranceW);
});
test('symmetric angled solution agrees with an independent cubic Newton solve',()=>{
 for(const angle of [5,30,60,80]){
  const p=base();p.inlets[0].angleDeg=angle;p.inlets[1].angleDeg=-angle;
  const g=p.gravityMPerS2,B=100,Q=100,y0=5,c=Math.cos(angle*Math.PI/180),a=2*(B*y0*y0/2+Q*Q/(g*B*y0))/(B*c),b=2*Q*Q/(g*B*B);
  let y=y0/Math.sqrt(c);for(let k=0;k<30;k++)y-=(y*y*y-a*y+b)/(3*y*y-a);
  const r=M.solve(p);assert.equal(r.status,'completed');near(r.accepted.commonInletWaterM,y,1e-9);near(r.trial.audit.momentumResidualN.y,0,1e-8);
 }
});
test('integrated hydrostatic pressure and independent vector fluxes balance',()=>{
 const p=fixture('manufactured-force'),r=M.solve(p),states=r.trial.inlets,rho=p.densityKgM3,g=p.gravityMPerS2;
 const pressure=(width,depth)=>{let sum=0,N=1000;for(let k=0;k<N;k++)sum+=rho*g*(depth-(k+.5)*depth/N)*width*depth/N;return sum;};
 let px=0,py=0,ix=0,iy=0;
 for(let i=0;i<2;i++){const s=p.inlets[i],y=states[i].depthM,theta=s.angleDeg*Math.PI/180,P=pressure(s.widthM,y),I=rho*s.flowM3S*s.flowM3S/(s.widthM*y);px+=P*Math.cos(theta);py+=P*Math.sin(theta);ix+=I*Math.cos(theta);iy+=I*Math.sin(theta);near(states[i].pressureN,P,1e-6);}
 const outP=pressure(p.outlet.widthM,p.outlet.depthM),outI=rho*100*100/(p.outlet.widthM*p.outlet.depthM);
 near(px-outP+p.forces.wallN.x,outI-ix,.001);near(py+p.forces.wallN.y,-iy,.001);
});
test('a target-stage manufactured force fixture recovers6m without fitting forces',()=>{
 const p=fixture('manufactured-force'),before=copy(p),r=M.solve(p);near(r.accepted.commonInletWaterM,6,1e-9);assert.deepEqual(p,before);
 near(r.trial.audit.requiredForceN.x,p.forces.wallN.x,.001);near(r.trial.audit.requiredForceN.y,p.forces.wallN.y,.001);
});
test('longitudinal root alone does not pass an unbalanced transverse force',()=>{
 const p=fixture('missing-side-force'),before=copy(p),r=M.solve(p);assert.equal(r.status,'held-momentum');assert.equal(r.accepted,null);assert(r.trial);near(r.trial.audit.momentumResidualN.x,0,.001);assert(r.trial.audit.momentumResidualN.y>1.4e6);assert.equal(r.trial.audit.suppliedForceN.y,0);assert(r.trial.audit.additionalForceRequiredN.y<-1.4e6);assert.deepEqual(p,before);
});
test('energy feasibility is independent of force balance and does not clamp negative dissipation',()=>{
 const r=M.solve(fixture('energy-conflict'));assert.equal(r.status,'held-energy');assert(r.trial.audit.momentumPassed);assert.equal(r.accepted,null);assert(r.trial.audit.energy.requiredDissipationW<-20000);
 const p=fixture('assumed-drag'),a=M.solve(p).trial,expected=p.densityKgM3*p.gravityMPerS2*a.inlets.reduce((v,s)=>v+s.flowM3S*(s.waterM+s.velocityMPerS**2/(2*p.gravityMPerS2)-a.outlet.energyM),0);near(a.audit.energy.requiredDissipationW,expected,1e-7);assert(expected>0);
});
test('horizontal bed pressure, wall and friction are separate signed force components',()=>{
 const a=fixture('manufactured-force'),b=copy(a);b.forces.wallN={x:0,y:0};b.forces.bedPressureN.x=a.forces.wallN.x;b.forces.frictionN.y=a.forces.wallN.y;
 near(M.solve(a).accepted.commonInletWaterM,M.solve(b).accepted.commonInletWaterM,1e-10);assert.notDeepEqual(a.forces,b.forces);
});
test('datum translation changes elevation only; density scaling changes forces and power only',()=>{
 const p=fixture('manufactured-force'),a=M.solve(p),translated=copy(p);translated.inlets.forEach(s=>s.bedM+=100);translated.outlet.bedM+=100;const b=M.solve(translated);assert.equal(a.status,b.status);near(b.accepted.commonInletWaterM-a.accepted.commonInletWaterM,100,1e-8);near(a.trial.audit.energy.requiredDissipationW,b.trial.audit.energy.requiredDissipationW,.001);
 const scaled=copy(p);scaled.densityKgM3*=2;for(const f of Object.values(scaled.forces)){f.x*=2;f.y*=2;}const c=M.solve(scaled);near(a.accepted.commonInletWaterM,c.accepted.commonInletWaterM,1e-9);near(c.trial.audit.energy.requiredDissipationW,2*a.trial.audit.energy.requiredDissipationW,.001);
});
test('reflection and inlet permutation preserve physical results and transverse signs',()=>{
 const p=fixture('manufactured-force'),a=M.solve(p),b=copy(p);b.inlets.forEach(s=>s.angleDeg*=-1);for(const f of Object.values(b.forces))f.y*=-1;const r=M.solve(b);assert.equal(r.status,'completed');near(a.accepted.commonInletWaterM,r.accepted.commonInletWaterM,1e-9);near(a.trial.audit.requiredForceN.y,-r.trial.audit.requiredForceN.y,.001);
 b.inlets.reverse();near(M.solve(b).accepted.commonInletWaterM,r.accepted.commonInletWaterM,1e-9);
});
test('boundary and shared-domain failures leave no trial or accepted water surface',()=>{
 for(const id of ['boundary-bank','boundary-critical','critical-domain','bank-domain']){
  const r=M.solve(fixture(id));assert(r.status.startsWith('held-'));assert.equal(r.trial,null);assert.equal(r.accepted,null);
 }
 const p=base();p.inlets[0].bedM=100;assert.equal(M.solve(p).reason,'no-shared-subcritical-bank-domain');
});
test('different inlet beds share stage under the explicit closure, not depth',()=>{
 const r=M.solve(fixture('different-beds'));assert.equal(r.status,'completed');const[a,b]=r.trial.inlets;near(a.waterM,b.waterM,1e-10);near(b.depthM-a.depthM,.5,1e-10);
});
test('phase29 prescribed energy relation is reproduced without overriding its unequal surfaces',()=>{
 const C=require('../d298591-confluence/core.js'),source=require('../d298591-confluence/output/catalog.json'),p=source.presets.find(x=>x.id==='junction-losses'),old=C.solve(p.input),r=M.solve(fixture('phase29-comparison')),cmp=r.energyComparison;
 for(const s of cmp.states){const b=old.junctions[0].branches.find(x=>x.reachId===s.id);near(s.depthM,b.depthM,2e-9);}
 assert(Math.abs(cmp.states[0].waterM-cmp.states[1].waterM)>.29);assert(!cmp.audit.momentumPassed);assert(Math.abs(cmp.audit.additionalForceRequiredN.x)>1e5);assert.equal(r.status,'completed');assert(r.trial.audit.energy.requiredDissipationW<.01);assert(cmp.audit.energy.requiredDissipationW>3e5);
});
test('13 scenarios preserve actual nulls and prior unresolved states, including comparisons',()=>{
 for(const p of d.presets){const r=M.solve(p.input);assert.deepEqual(r,p.expected);assert(Object.values(r.actual).every(x=>x===null));assert.equal(r.automaticAdoption,false);assert.equal(r.coupledRoutingReady,false);assert.equal(r.unresolvedReaches,23022);assert.equal(r.physicalResolvedReaches,0);assert.equal(r.priorTailwaterHeldCases,108);assert.equal(r.priorAlternateLimitCases,14);if(r.status==='completed'){assert(r.accepted);assert(r.trial.audit.momentumPassed);assert(r.trial.audit.energy.nonnegativeWithinTolerance);}else assert.equal(r.accepted,null);}
});
test('provenance, payload integrity and CLI complete/error states are reproducible',()=>{
 for(const[f,h]of Object.entries({...d.provenance.inputs,...d.provenance.code}))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',f))).digest('hex'),h);
 const bytes=fs.readFileSync(path.join(__dirname,'output/catalog.json')),m=require('./output/manifest.json');assert.equal(bytes.length,m.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),m.sha256);
 const command=path.join(__dirname,'query.cjs'),run=cp.spawnSync(process.execPath,[command,'symmetric-30'],{encoding:'utf8'});assert.equal(run.status,0);assert.deepEqual(JSON.parse(run.stdout),V.result(d,fixture('symmetric-30')));assert.equal(cp.spawnSync(process.execPath,[command]).status,1);
 const dir=fs.mkdtempSync('/tmp/momentum-test-');try{const f=path.join(dir,'bad.json');fs.writeFileSync(f,JSON.stringify({...base(),densityKgM3:null}));const bad=cp.spawnSync(process.execPath,[command,'--input',f],{encoding:'utf8'});assert.equal(bad.status,2);assert.equal(JSON.parse(bad.stdout).candidate.status,'invalid-input');}finally{fs.rmSync(dir,{recursive:true});}
});
