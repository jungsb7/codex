'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),C=require('./core.js');
const catalog=require('../landscape-notes/output/catalog.json'),N=require('../landscape-notes/core.js'),U=require('../unified-atlas/core.js'),E=require('../atlas-experience/core.js');
test('all 4320 representative/period pairs preserve source samples, B-minus-A and unknown flow',()=>{
  const before=JSON.stringify(catalog);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(require.resolve('../landscape-notes/output/catalog.json'))).digest('hex'),'95f7fd1c75b5f39c19d33179cb2dd9e8bb0b7940ce506e2cfbfa0ecd38dbe7c1');
  for(const e of catalog.entries)for(let a=1;a<=12;a++)for(let b=1;b<=12;b++){
    const q=C.compare(catalog,e.cell,e.family,a,b);
    assert.deepEqual(q.left,N.query(catalog,e.cell,e.family,a).selectedSeason);assert.deepEqual(q.right,N.query(catalog,e.cell,e.family,b).selectedSeason);
    for(const key of ['temperatureC','precipitationMm','flowM3s']){
      const av=e.seasonal.samples[a-1][key],bv=e.seasonal.samples[b-1][key];
      assert.equal(q.difference[key],av===null||bv===null?null:bv-av);
    }
    assert.equal(q.scope,'representative-cell-only');assert.equal(q.automaticAdoption,false);
    assert(Object.values(q.unknown).every(v=>v===null));assert.deepEqual(q.candidate,e.candidate);
  }
  assert.equal(JSON.stringify(catalog),before);
});
test('swap reverses finite differences and same-period comparisons retain unknowns',()=>{
  for(const e of catalog.entries){const q=C.compare(catalog,e.cell,e.family,3,11),swapped=C.compare(catalog,e.cell,e.family,11,3),same=C.compare(catalog,e.cell,e.family,3,3);
    for(const k of ['temperatureC','precipitationMm','flowM3s']){if(q.difference[k]===null){assert.equal(swapped.difference[k],null);assert.equal(same.difference[k],null);}else{assert.equal(swapped.difference[k]+q.difference[k],0);assert.equal(same.difference[k],0);}}
  }
});
test('comparison links round-trip both phases, family and exact cell center through real map state parser',()=>{
  E.install(U);C.install(U);const d={width:1536,height:768,regions:[]};
  for(const e of catalog.entries)for(const [a,b]of [[1,12],[12,1],[7,7]]){const q=C.compare(catalog,e.cell,e.family,a,b),s=U.readState(C.href(q),d),p=new URLSearchParams(C.href(q).slice(1));assert.equal(s.cell,e.cell);assert.equal(s.period,a);assert.equal(s.comparePeriod,b);assert.equal(p.get('draftFamily'),e.family);assert.deepEqual([s.lon,s.lat],e.center);assert.equal(s.seasonal,false);}
  for(const [input,expected]of [['',7],['NaN',7],['Infinity',7],['-9',1],['44',12],['3.8',3],['0',1]])assert.equal(U.readState('#comparePeriod='+input,d).comparePeriod,expected);
});
test('missing catalog, non-representative cells and invalid periods never borrow or fabricate samples',()=>{
  assert.equal(C.compare(null,290975,'forest',1,7),null);assert.equal(C.compare(catalog,0,'forest',1,7),null);
  for(const bad of [0,13,NaN,1.5,null,undefined,'2'])assert.equal(C.compare(catalog,290975,'forest',1,bad),null);
});
