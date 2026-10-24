'use strict';
const fs=require('node:fs'),z=require('node:zlib'),V=require('./view.js'),read=p=>JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/'+p)));
try{const [id,boundary,year,...extra]=process.argv.slice(2);if(!id||!boundary||extra.length)throw Error('Usage: node query.cjs reference D221625 [year]');console.log(JSON.stringify(V.query(read('review.json.gz'),read('models.json.gz'),id,boundary,year===undefined?undefined:Number(year)),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
