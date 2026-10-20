'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),crypto=require('node:crypto');
const base=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p)),json=p=>JSON.parse(read(p)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const C=require('../core.js'),U=require('../unified-atlas/core.js'),L=require('../landscape-draft/core.js'),E=require('../atlas-experience/core.js'),N=require('./core.js');
const m=U.create(JSON.parse(z.gunzipSync(read('unified-atlas/output/atlas.json.gz'))));m.atlasSHA256=sha(read('unified-atlas/output/atlas.json.gz'));m.landscapeDraft=L.create(m);
const catalog=json('landscape-notes/output/catalog.json'),manifest=json('landscape-notes/output/manifest.json'),summary=json('landscape-draft/output/summary.json');
test('catalog hash, atlas identity and all 30 original representative groups match',()=>{
  assert.equal(sha(read('landscape-notes/output/catalog.json')),manifest.sha256);assert.equal(read('landscape-notes/output/catalog.json').length,manifest.bytes);N.validate(catalog,m);
  assert.deepEqual(catalog.entries.map(e=>e.candidate.group),summary.proposals);
  for(const [p,h]of Object.entries(catalog.provenance.inputs))assert.equal(sha(read(p)),h,p);
});
test('360 temperatures, rainfall and quantized flows match restored original inputs, plus exact hydrology',()=>{
  const sources=json('atlas-experience/output/sources.json');
  for(const p of sources.parts.filter(p=>['climate','water'].includes(p.id)))assert.equal(sha(read(p.source)),p.sourceSha256);
  const c=E.climate(m,json('stage2/output/diagnostics.json')),w=E.water(m,json('stage3/output/waterways.json'));m.seasonClimate=c;m.seasonWater=w;
  for(const e of catalog.entries){for(const s of e.seasonal.samples){const q=E.season(m,e.cell,s.period);for(const k of ['temperatureC','precipitationMm','flowM3s'])assert.equal(s[k],q[k],e.id+' '+s.period+' '+k);}
    if(e.candidate.hydrology){const r=w.reaches.get(e.candidate.hydrology.id);for(const [k,v]of Object.entries(e.candidate.hydrology))assert.deepEqual(v,r[k]);}
    else assert.equal(m.a.reach[m.index[e.cell]],-1);
  }
});
test('extrema preserve exact ties, phase identity and representative-point scope',()=>{
  for(const e of catalog.entries){for(const [name,field,fn]of [['coldest','temperatureC',Math.min],['warmest','temperatureC',Math.max],['driest','precipitationMm',Math.min],['wettest','precipitationMm',Math.max]]){const v=fn(...e.seasonal.samples.map(s=>s[field]));assert.deepEqual(e.seasonal.contrast[name],{value:v,periods:e.seasonal.samples.filter(s=>s[field]===v).map(s=>s.period)});}
    assert.equal(e.seasonal.scope,'representative-cell-only');assert.equal(e.seasonal.appearanceStatus,'creative-suggestion-not-physical-output');
  }
});
test('all map links resolve to the original grid and all per-period exports keep evidence and nulls',()=>{
  for(const e of catalog.entries){const url=new URL(e.mapHref,'https://example.test/codex/integration/natural-world/landscape-notes/'),p=new URLSearchParams(url.hash.slice(1));
    assert.equal(url.pathname,'/codex/integration/natural-world/unified-atlas/index.html');assert.equal(+p.get('cell'),e.cell);assert.deepEqual([+p.get('lon'),+p.get('lat')],e.center);assert.equal(C.cell(m.d.width,m.d.height,...e.center),e.cell);
    for(let k=1;k<=12;k++){const q=N.query(catalog,e.cell,e.family,k);assert.equal(q.id,e.id);assert.deepEqual(q.selectedSeason,e.seasonal.samples[k-1]);assert(Object.values(q.unknown).every(v=>v===null));assert.equal(q.properPlaceName,null);assert.equal(q.automaticAdoption,false);assert(q.creative.overview.length>50);}
  }
});
test('non-representative land, ocean and original lakes do not borrow adjacent descriptions',()=>{
  const cells=new Set(catalog.entries.map(e=>e.cell));for(const cell of [0,m.a.cells.find((c,j)=>m.a.lake[j]),m.a.cells.find((c,j)=>!m.a.lake[j]&&!cells.has(c))])assert.equal(N.query(catalog,cell,'forest',1),null);
});
test('wrong atlas, source coordinate, unit and corrupt period data are rejected',()=>{
  for(const mutate of [d=>d.atlasSHA256='bad',d=>d.entries[0].center[0]+=1,d=>d.entries[0].candidate.group.id='wrong',d=>d.entries[0].seasonal.samples[0].period=12,d=>d.entries[0].seasonal.samples[0].temperatureC=null]){
    const d=structuredClone(catalog);mutate(d);assert.throws(()=>N.validate(d,m));
  }
});
