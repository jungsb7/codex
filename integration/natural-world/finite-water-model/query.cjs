'use strict';
const fs=require('node:fs'),z=require('node:zlib'),V=require('./view.js');
try{const [id,boundary,year,...extra]=process.argv.slice(2);if(extra.length||!year)throw Error('Usage: node query.cjs reference D186192 100');const d=JSON.parse(z.gunzipSync(fs.readFileSync(__dirname+'/output/review.json.gz')));console.log(JSON.stringify(V.query(d,id,boundary,Number(year)),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
