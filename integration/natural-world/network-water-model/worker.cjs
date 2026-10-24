'use strict';
const fs=require('node:fs'),z=require('node:zlib'),{parentPort,workerData}=require('node:worker_threads'),B=require('./plan.cjs'),S=require('./source.cjs'),C=require('./core.cjs');
const network=require('../inland-routing/output/catalog.json'),all=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/models.json.gz'))),plan=B.plan(network,all.models),source=S.unpack(S.read());
parentPort.on('message',job=>{try{const c=plan.components.find(c=>c.id===job.component),input=B.prepare(network,all.models.filter(m=>c.ids.includes(m.id)),source,plan,workerData.tilt),r=C.run(input,job.options);fs.writeFileSync(job.file,z.gzipSync(JSON.stringify({component:c.id,...r}),{level:6}));parentPort.postMessage({job:job.id,status:r.status,years:r.elapsedYears});}catch(e){parentPort.postMessage({job:job.id,error:e.stack});}});
parentPort.postMessage({ready:true});
