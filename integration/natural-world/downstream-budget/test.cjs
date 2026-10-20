'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),zlib=require('node:zlib'),crypto=require('node:crypto'),path=require('node:path'),cp=require('node:child_process');
const B=require('./core.js'),Codec=require('../stage5/codec.js'),root=path.resolve(__dirname,'../../..');
const read=p=>JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(p)):fs.readFileSync(p));
const d=read(path.join(__dirname,'output/review.json.gz')),water=read(path.join(__dirname,'../stage3/output/waterways.json')),prior=read(path.join(__dirname,'../retention-priority/output/atlas.json.gz')),atlas=read(path.join(__dirname,'../unified-atlas/output/atlas.json.gz'));
test('all source hashes bind to exact main inputs and closed review stays excluded',()=>{
  for(const [file,expected]of Object.entries(d.provenance.inputs))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'..',file))).digest('hex'),expected);
  const closed=read(path.resolve(__dirname,'../pond-decision-review/output/register.json')),ids=new Set(closed.cells.map(r=>r[0]));
  assert(d.representatives.every(g=>g.catchmentCellIds.every(c=>!ids.has(c))));
});
test('23022 unique reaches independently follow receiver graph to the same unresolved terminal',()=>{
  const n=1536*768,receiver=Codec.decode(water.fields.receiver.data,n,'i32'),canonical=Codec.decode(water.fields.canonical.data,n,'i32'),source=new Map(water.reaches.map(r=>[r.id,r]));
  assert.equal(d.reaches.length,23022);assert.equal(new Set(d.reaches.map(r=>r.id)).size,23022);
  for(const r of d.reaches){
    let i=canonical[r.end];const seen=new Set();while(receiver[i]>=0){assert(!seen.has(i));seen.add(i);i=receiver[i];}
    assert.equal(i,r.endpointNode);assert.equal(source.get(r.id).endpointKind,'unresolved-depression');
    assert.equal(source.get(r.id).downstreamReach,r.downstreamReach);
  }
});
test('exclusive categories cover every boundary and reach without duplicate inflow aggregation',()=>{
  assert.equal(d.groups.length,1184);
  assert.deepEqual(d.summary.categories.map(c=>[c.key,c.boundaries,c.reaches]),[['hot-and-polar',0,0],['hot',177,1400],['polar',54,1250],['coupled',2,12],['chain',741,15439],['ocean',210,4921]]);
  let total=0;for(const g of d.groups){
    const source=water.depressions.find(s=>s.node===g.node);assert.deepEqual(g.periodInflowM3,source.monthlyInflowM3);
    assert(Math.abs(g.periodInflowM3.reduce((a,b)=>a+b,0)-g.annualInflowM3)<.01);
    assert.equal(g.reachCount,d.reaches.filter(r=>r.endpointNode===g.node).length);
    assert.deepEqual(g.directInletReachIds,source.inletReaches);
    assert.equal(g.category,B.category(prior.groups.find(r=>r.id===g.id)));total+=g.annualInflowM3;
  }
  assert(Math.abs(total-5786402190777.903)<.01);assert.equal(d.groups.reduce((s,g)=>s+g.catchmentCells,0),168576);
});
test('native geometry independently integrates spherical cell areas and is connected below the crest',()=>{
  const cells=Codec.decode(atlas.fields.cells.data,atlas.count,'i32'),elev=Codec.decode(atlas.fields.elevation.data,atlas.count,'f32'),map=new Map(Array.from(cells,(v,j)=>[v,elev[j]]));
  for(const g of d.representatives){
    let volume=0,area=0;const domain=new Map(g.columns.map(c=>[c.cell,c]));
    for(const c of g.columns){
      assert.equal(c.elevationM,map.get(c.cell));
      const y=Math.floor(c.cell/1536),sphereArea=6371000**2*(2*Math.PI/1536)*(Math.sin((90-y*180/768)*Math.PI/180)-Math.sin((90-(y+1)*180/768)*Math.PI/180));
      assert(Math.abs(sphereArea-c.areaM2)/sphereArea<1e-12);
      if(c.elevationM<g.outletLevelM){area+=sphereArea;volume+=sphereArea*(g.outletLevelM-c.elevationM);}
    }
    assert(Math.abs(volume-g.geometry.volumeM3)/volume<1e-12);assert(Math.abs(area-g.geometry.areaM2)/area<1e-12);
    const visited=new Set([g.node]),queue=[g.node];
    for(let k=0;k<queue.length;k++){const i=queue[k],x=i%1536,y=Math.floor(i/1536);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(y+dy<0||y+dy>=768)continue;const j=(y+dy)*1536+(x+dx+1536)%1536;if(domain.has(j)&&!visited.has(j)&&domain.get(j).elevationM<=g.outletLevelM+1e-7){visited.add(j);queue.push(j);}}}
    assert.equal(visited.size,domain.size);
  }
});
test('zero loss exactly matches the closed-form inventory envelope and each period conserves water',()=>{
  for(const g of d.representatives)for(const initialFraction of [0,.5,1]){
    const e=B.experiment(g,{years:100,initialFraction});let cumulative=e.initialStorageM3,first=null;
    for(const r of e.periods){cumulative+=r.inflowM3;if(cumulative>e.capacityM3&&!first)first={year:r.year,period:r.period};assert(Math.abs(r.residualM3)<.001);assert.equal(r.appliedDebitM3,0);}
    assert.deepEqual(e.firstExcess,first);assert(Math.abs(e.finalInventoryM3-Math.min(e.capacityM3,cumulative))<1);
    assert(Math.abs(e.totalCapacityExcessM3-Math.max(0,cumulative-e.capacityM3))<Math.max(1,cumulative*1e-12));
  }
});
test('60 saved experiments match runtime, preserve null allocations, and clamp loss to available water',()=>{
  for(const g of d.representatives)for(const saved of g.scenarios){
    const e=B.experiment(g,saved);
    for(const key of ['finalInventoryM3','totalDebitM3','totalCapacityExcessM3','necessaryAverageLossMPerYear'])assert.equal(e[key],saved[key]);
    for(const r of e.periods){assert(r.endInventoryM3>=0&&r.endInventoryM3<=e.capacityM3);assert(r.appliedDebitM3<=r.startInventoryM3+r.inflowM3);assert(Math.abs(r.residualM3)<.01);}
    assert(Math.abs(e.cumulativeResidualM3)<Math.max(1,e.totalInflowM3*1e-11));
    for(const k of ['actualStorageM3','actualEvaporationM3','actualInfiltrationM3','actualOverflowM3'])assert.equal(e[k],null);
  }
  const tiny={id:'fixture',geometry:{volumeM3:10,areaM2:120},periodInflowM3:Array(12).fill(1)},e=B.experiment(tiny,{years:1,lossMPerYear:20});
  assert.equal(e.finalInventoryM3,0);assert.equal(e.totalDebitM3,12);assert.equal(e.totalCapacityExcessM3,0);
});
test('necessary loss bound is a total-volume condition, not an overflow guarantee',()=>{
  const g={id:'fixture',geometry:{volumeM3:10,areaM2:12},periodInflowM3:[24,...Array(11).fill(0)]};
  const e=B.experiment(g,{years:1,lossMPerYear:2});
  assert.equal(e.necessaryAverageLossMPerYear,14/12);
  assert(e.lossMPerYear>e.necessaryAverageLossMPerYear);assert(e.totalCapacityExcessM3>0);
});
test('invalid inputs and non-unresolved queries fail without fabricating a boundary',()=>{
  assert.equal(B.query(d,'0'),null);assert.equal(B.query(d,'D0'),null);assert.equal(B.query(d,'23x'),null);
  const r=d.reaches[0];assert.equal(B.query(d,String(r.id)).group.node,r.endpointNode);
  assert.equal(B.query(d,'D298591').id,'D298591');
  for(const bad of [{years:0},{years:NaN},{years:501},{years:1.5},{lossMPerYear:-1},{lossMPerYear:NaN},{initialFraction:2}])assert.throws(()=>B.experiment(d.representatives[0],bad));
  assert.throws(()=>B.validate({...d,schema:'wrong'}));
  assert.throws(()=>B.geometry([{cell:1,elevationM:NaN,areaM2:2}],3));
});
test('CLI returns original boundary evidence and a source-linked reproducible experiment',()=>{
  const q=JSON.parse(cp.execFileSync(process.execPath,[path.join(__dirname,'query.cjs'),'D298591','.5','10','.5'],{cwd:root,encoding:'utf8'}));
  assert.equal(q.review.id,'D298591');assert.equal(q.experiment.years,10);assert.equal(q.experiment.lossMPerYear,.5);assert.deepEqual(q.provenance,d.provenance);
});
