'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),V=require('./view.js');
try{const [id,boundary,year,...extra]=process.argv.slice(2);if(extra.length||!id||!boundary||!year)throw Error('Usage: query.cjs E1-G0.25 D301678 7');const d=JSON.parse(z.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))));console.log(JSON.stringify(V.query(d,id,boundary,Number(year)),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
