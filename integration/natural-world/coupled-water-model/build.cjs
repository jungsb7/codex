'use strict';
const fs=require('node:fs'),z=require('node:zlib'),crypto=require('node:crypto'),C=require('./core.cjs');
const cfg=require('../finite-water-model/scenarios.json'),domains=require('./output/domains.json'),all=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/models.json.gz'))),ids=new Set(require('../finite-water-model/output/summary.json').scenarios[0].boundaries.map(b=>b.id)),models=all.models.filter(m=>ids.has(m.id));
const {Worker}=require('node:worker_threads');
const calculate=options=>new Promise((resolve,reject)=>{const worker=new Worker(__dirname+'/worker.cjs',{workerData:options});worker.once('message',resolve);worker.once('error',reject);worker.once('exit',code=>{if(code)reject(Error('Worker failed '+code));});});
(async()=>{
const results=await Promise.all([...cfg.scenarios.map(s=>calculate({...cfg.common,...s.changes})),calculate({...cfg.common,substeps:120})]);
const scenarios=cfg.scenarios.map((s,i)=>({id:s.id,label:s.label,...results[i]})),fine=results[3],ref=scenarios[0];
const refinement={coarseSteps:60,fineSteps:120,coarseStop:ref.stop,fineStop:fine.stop,elapsedDifferenceYears:Math.abs(ref.elapsedYears-fine.elapsedYears),oceanRelativeDifference:Math.abs(ref.totals.oceanDeliveryM3-fine.totals.oceanDeliveryM3)/Math.max(1,fine.totals.oceanDeliveryM3),fineResidualM3:fine.totals.residualM3};
refinement.scope='Reference100-year ocean delivery and horizon; not all states or sensitivity cases';refinement.oceanRelativeTolerance=.01;
refinement.status=JSON.stringify(ref.stop?.boundaries)===JSON.stringify(fine.stop?.boundaries)&&refinement.elapsedDifferenceYears<=2/(12*60)&&refinement.oceanRelativeDifference<=refinement.oceanRelativeTolerance?'passed-ocean-and-horizon-check':'needs-refinement';
const source=require('./source.cjs'),raw=source.read(),forcing=source.summarize(all.models,raw);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),payload={schema:'coupled-water-review/1',provenance:{...all.provenance,codeSha256:Object.fromEntries(['core.cjs','geometry.cjs','prepare.cjs','build.cjs','worker.cjs','source.cjs'].map(f=>[f,hash(fs.readFileSync(__dirname+'/'+f))]))},scope:{preparedBoundaries:946,preparedReaches:20065,preparedSourceCells:117320,dynamicBoundaries:57,dynamicReaches:2637,dynamicSourceCells:11355},forcing,sourceCollection:require('./inputs/collection.json'),domains:domains.boundaries,scenarios,refinement,actual:null,automaticAdoption:false};
const b=z.gzipSync(JSON.stringify(payload),{level:9});fs.writeFileSync(__dirname+'/output/review.json.gz',b);fs.writeFileSync(__dirname+'/output/manifest.json',JSON.stringify({file:'review.json.gz',bytes:b.length,sha256:hash(b)},null,2)+'\n');fs.writeFileSync(__dirname+'/output/summary.json',JSON.stringify({...payload,domains:undefined,scenarios:scenarios.map(s=>({...s,boundaries:s.boundaries.map(({annual,...b})=>b)}))},null,2)+'\n');fs.writeFileSync(__dirname+'/validation/refinement.json',JSON.stringify(refinement,null,2)+'\n');console.log(refinement);

})().catch(e=>{console.error(e);process.exitCode=1;});
