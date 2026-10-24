'use strict';
const fs=require('node:fs'),z=require('node:zlib'),V=require('./view.js');
try{const d=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/review.json.gz')));console.log(JSON.stringify(V.query(d,process.argv[2]||'reference',process.argv[3]||'D221625',process.argv[4]===undefined?undefined:Number(process.argv[4])),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
