'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),V=require('./view.js');
try{const d=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))))),key=process.argv[2]||'E1-G0.25-I0-W1000-C1.5-T0',c=d.scenarios.find(c=>c.id===key),year=process.argv[3]===undefined?c?.annual.length:Number(process.argv[3]);console.log(JSON.stringify(V.select(d,key,year),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
