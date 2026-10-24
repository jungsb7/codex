'use strict';
const fs=require('fs'),z=require('zlib'),B=require('./plan.cjs'),S=require('./source.cjs'),C=require('./core.cjs');
const network=require('../inland-routing/output/catalog.json'),models=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/models.json.gz'))).models,plan=B.plan(network,models),source=S.unpack(S.read()),cfg=require('../finite-water-model/scenarios.json').common;
fs.writeFileSync(__dirname+'/output/plan.json',JSON.stringify({components:plan.components},null,2)+'\n');
const failures=[];for(const component of plan.components.filter(c=>c.status==='ready')){try{const input=B.prepare(network,models.filter(m=>component.ids.includes(m.id)),source,plan,23.4),r=C.run(input,{...cfg,years:1});console.log(component.id,component.boundaries,r.status,r.elapsedYears);}catch(e){failures.push({id:component.id,error:e.stack});console.error(component.id,e.message);}}
fs.writeFileSync(__dirname+'/validation/smoke.json',JSON.stringify({failures},null,2));if(failures.length)process.exitCode=1;
