'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),network=require('../inland-routing/output/catalog.json'),data=require('./output/summary.json');
const selected=new Set(data.scenarios[0].boundaries.map(b=>b.id));
const boundaries=network.groups.map(g=>({id:g.id,reaches:g.reachCount,candidate:selected.has(g.id)?'finite-soil-aquifer-outlet':'not-applied',originalStatus:g.status,originalReasons:g.reasons,actual:null,automaticAdoption:false}));
assert.equal(boundaries.reduce((s,b)=>s+b.reaches,0),23022);
const applied=boundaries.filter(b=>selected.has(b.id));assert.equal(applied.length,57);assert.equal(applied.reduce((s,b)=>s+b.reaches,0),2637);
fs.writeFileSync(__dirname+'/output/coverage.json',JSON.stringify({schema:'finite-water-coverage/1',appliedBoundaries:57,appliedReaches:2637,notAppliedReaches:20385,worldAdoption:'not-adopted',originalPreservation:'all original holds and closed studies unchanged',criteria:{finiteSoilAndAquifer:'implemented-candidate-57-boundaries',infiltrationAndReturn:'implemented-candidate-57-boundaries',outlet:'designed-one-way-rating-with-finite-surcharge',tailwater:'entry-pond-proxy-no-reverse-flow',hotPolarIceEnergy:'not-implemented',actualFloodingOrAlternativeOutlet:'not-implemented'},boundaries},null,2)+'\n');
