'use strict';
const {workerData,parentPort}=require('node:worker_threads'),fs=require('node:fs'),z=require('node:zlib'),C=require('./core.cjs');
const all=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/models.json.gz'))),ids=new Set(require('../finite-water-model/output/summary.json').scenarios[0].boundaries.map(b=>b.id));
const prepared=C.prepare(require('../inland-routing/output/catalog.json'),all.models.filter(m=>ids.has(m.id)),require('../basin-water-budget/source.cjs').read());
parentPort.postMessage(C.run(prepared,workerData));
