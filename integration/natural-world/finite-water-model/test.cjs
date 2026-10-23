'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib');
const C=require('./core.cjs'),P=require('../pond-budget/core.js'),o=require('./scenarios.json').common;
const near=(a,b,tol=1e-8)=>assert(Math.abs(a-b)<=tol,`${a} != ${b}`);
const volume=s=>s.snow+s.soil+s.groundwater;
function fixture(two=false){
 const one=(id,cell,crest,target)=>({model:{id,crestM:crest,columns:[{cell,elevationM:0,areaM2:1e6,leaf:cell}],partition:{groups:[{id:cell,columns:[{cell,elevationM:0,areaM2:1e6}]}],edges:[]},assignments:[{cell,leaf:cell}],initialLeaf:cell},group:{id,reachCount:1,target},referenceRateM3S:1,cells:[cell],area:Float64Array.of(1e6),fields:{precipitationMm:Float64Array.from({length:12},()=>500),temperatureC:Float64Array.from({length:12},()=>15),snowStartMm:new Float64Array(12),shallowStartMm:Float64Array.from({length:12},()=>250)}});
 const a=one('A',1,1,two?{kind:'inland',id:'B',entryCell:2}:{kind:'ocean',id:'O'}),b=one('B',2,.8,{kind:'ocean',id:'O'});
 return {prepared:two?[a,b]:[a]};
}
test('finite infiltration, saturation runoff and separate recharge conserve a storm',()=>{
 let s={snow:0,soil:195,groundwater:999};const r=C.cellStep(s,100,10,false,1/360,o);
 assert(r.infiltration>0&&r.infiltration<=o.infiltrationMmPerYear/360);assert(r.runoff>90);
 assert(r.soil<=o.soilCapacityMm&&r.groundwater<=o.aquiferCapacityMm);
 near(volume(s)+100,volume(r)+r.evaporation+r.runoff+r.directWater+r.groundwaterReturn);
});
test('random wet/dry/frozen cells preserve water and both finite limits',()=>{
 let seed=36;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 for(let i=0;i<10000;i++){const s={snow:rand()*300,soil:rand()*200,groundwater:rand()*1000},p=rand()*250,t=rand()*100-50,r=C.cellStep(s,p,t,rand()>.5,1/720,o);
 near(volume(s)+p,volume(r)+r.evaporation+r.runoff+r.directWater+r.groundwaterReturn,1e-9);
 assert(r.soil>=0&&r.soil<=200&&r.groundwater>=0&&r.groundwater<=1000&&r.snow>=0);}
});
test('isolated aquifer follows the analytical exponential and returns to surface',()=>{
 let s={snow:0,soil:0,groundwater:1000},out=0;
 for(let i=0;i<720;i++){const r=C.cellStep(s,0,-10,true,1/720,o);s=r;out+=r.groundwaterReturn;}
 near(s.groundwater,1000*Math.exp(-.5),1e-9);near(out+s.groundwater,1000,1e-9);
});
test('saturated aquifer rejects recharge into finite soil instead of losing water',()=>{
 const r=C.cellStep({snow:0,soil:200,groundwater:1000},0,-10,true,1/360,{...o,groundwaterReturnYears:1e100});
 near(r.soil,200);near(r.recharge,0);near(r.groundwater,1000);
});
test('wet precipitation bypasses soil; original snow remains an explicit stock',()=>{
 const s={snow:10,soil:100,groundwater:500},r=C.cellStep(s,20,-5,true,1/360,o);
 assert.equal(r.snow,30);assert.equal(r.infiltration,0);assert.equal(r.evaporation,0);assert.equal(r.directWater,0);
});
test('designed outlet is one-way, stage-dependent and tailwater-suppressed',()=>{
 near(C.rating(3,1,1,10,1.5),15*2**1.5);assert(C.rating(3,1,2,10,1.5)<C.rating(3,1,1,10,1.5));
 assert.equal(C.rating(3,1,4,10,1.5),0);assert.equal(C.rating(0,1,0,10,1.5),0);
});
test('implicit finite outlet converges to independently integrated free drainage',()=>{
 const tree=P.hierarchy(fixture().prepared[0].model.partition,6),area=1e6,crest=1,w=100,c=1.5,seconds=86400,initial=3e6;
 const exact=area*(crest+(1/Math.sqrt(2)+c*w*seconds/(2*area))**-2);
 const solve=n=>{let v=initial;for(let i=0;i<n;i++)v=C.outlet(tree.root,v,crest,crest,w,c,seconds/n).storageM3;return v;};
 const errors=[10,20,40,80].map(n=>Math.abs(solve(n)-exact));for(let i=1;i<errors.length;i++)assert(errors[i]<errors[i-1]*.6);
});
test('finite outlet over-capacity water is unallocated, never silently released',()=>{
 const root=P.hierarchy(fixture().prepared[0].model.partition,6).root,r=C.outlet(root,10e6,1,10,100,1.5,86400);
 near(r.storageM3,6e6);near(r.releaseM3,0);near(r.unresolvedM3,4e6);
});
test('two connected boundaries conserve transit and are independent of iteration order',()=>{
 const f=fixture(true),a=C.run(f,{...o,years:3,substeps:30}),b=C.run({prepared:f.prepared.slice().reverse()},{...o,years:3,substeps:30});
 assert.deepEqual(a.boundaries,b.boundaries.reverse());assert(a.totals.internalSentM3>0);near(a.totals.internalSentM3,a.totals.receivedM3,1e-7);
 assert(a.boundaries[1].final.transitM3>0);near(a.totals.residualM3,0,1e-5);
 assert(a.boundaries.every(b=>b.maxSoilMm<=200&&b.maxGroundwaterMm<=1000));
});
test('original initial mixed storage is conservatively split, with excess to surface',()=>{
 const f=fixture();f.prepared[0].fields.shallowStartMm.fill(1500);const r=C.run(f,{...o,years:1});
 assert.deepEqual(r.boundaries[0].initial,{snowM3:0,soilM3:200000,groundwaterM3:1000000,surfaceM3:300000,transitM3:0});
});
test('a blocked undersized outlet flags an incomplete candidate without mass loss',()=>{
 const f=fixture();f.prepared[0].fields.precipitationMm.fill(100000);const r=C.run(f,{...o,years:1,widthScale:.0001,maxSurchargeM:.1});
 assert.equal(r.status,'domain-exceeded');assert(r.totals.unresolvedM3>0);assert(r.boundaries[0].firstDomainExceeded);near(r.totals.residualM3,0,1e-3);
});
test('invalid and nonfinite parameters are rejected',()=>{
 for(const key of Object.keys(o))assert.throws(()=>C.validate({...o,[key]:NaN}));assert.throws(()=>C.validate({...o,substeps:1.5}));assert.throws(()=>C.validate({...o,soilCapacityMm:0}));
});
test('saved real basin has independent finite stocks, full horizon and balanced global replacement',()=>{
 const d=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/review.json.gz')));
 assert.equal(d.scope.reaches,2637);assert.equal(d.scope.sourceCells,11355);
 for(const s of d.scenarios){assert.equal(s.boundaries.length,57);assert.equal(s.status,'completed-horizon');assert.equal(s.automaticAdoption,false);assert.equal(s.actual.infiltrationM3,null);
 assert(s.totals.infiltrationM3>0&&s.totals.groundwaterReturnM3>0);assert.equal(s.totals.unresolvedM3,0);
 assert(Math.abs(s.totals.residualM3)<s.totals.precipitationM3*1e-10);assert(Math.abs(s.global.residualM3)<s.global.externalInputM3*1e-10);
 for(const b of s.boundaries){assert.equal(b.annual.length,100);assert(b.maxSoilMm<=s.options.soilCapacityMm);assert(b.maxGroundwaterMm<=s.options.aquiferCapacityMm);assert(b.maxSurchargeM<=s.options.maxSurchargeM+1e-8);assert(!['D298591','D126467','D147845','D144758','D193196'].includes(b.id));}}
 assert(d.scenarios[1].totals.infiltrationM3<d.scenarios[0].totals.infiltrationM3);
 assert(d.scenarios[2].boundaries.reduce((v,b)=>v+b.final.groundwaterM3,0)>d.scenarios[0].boundaries.reduce((v,b)=>v+b.final.groundwaterM3,0));
});
test('AI annual/local/global scopes and unadopted values survive every saved selection',()=>{
 const V=require('./view.js'),d=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/review.json.gz')));let count=0;
 for(const s of d.scenarios)for(const b of s.boundaries)for(let year=1;year<=100;year++){
 const q=V.query(d,s.id,b.id,year);assert.equal(q.annual,b.annual[year-1]);assert.equal(q.chain,s.totals);assert.equal(q.global,s.global);assert.equal(q.assumptions,s.options);assert.equal(q.automaticAdoption,false);assert.equal(q.actual.infiltrationM3,null);assert.equal(q.horizonYears,100);count++;}
 assert.equal(count,17100);for(const year of [0,101,NaN,1.5])assert.throws(()=>V.query(d,'reference','D186192',year));assert.throws(()=>V.query(d,'bad','D186192',1));assert.throws(()=>V.query(d,'reference','D298591',1));assert.throws(()=>V.validate({...d,schema:'wrong'}));
});
test('cached affine outlet matches the full column hypsometry equation',()=>{
 const columns=[{cell:1,elevationM:-40,areaM2:2e6},{cell:2,elevationM:-5,areaM2:7e6},{cell:3,elevationM:0,areaM2:1e6}];
 const root=P.hierarchy({groups:[{id:1,columns}],edges:[]},6).root;
 for(const tail of [0,1,2.5,8])for(const head of [.01,.5,2,4]){
 const available=root.h.atLevel(1+head).volumeM3,r=C.outlet(root,available,1,tail,1500,1.5,1000);
 const q=C.rating(root.h.atVolume(r.storageM3).levelM,1,tail,1500,1.5);
 near(r.storageM3+q*1000,available,1e-5);near(r.storageM3+r.releaseM3+r.unresolvedM3,available,1e-7);}
 const invalid=P.hierarchy({groups:[{id:1,columns:[...columns,{cell:4,elevationM:2,areaM2:1e6}]}],edges:[]},6).root;
 assert.throws(()=>C.outlet(invalid,100,1,0,10,1.5,10));
});
