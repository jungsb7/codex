'use strict';
const fs=require('node:fs'),z=require('node:zlib'),path=require('node:path'),V=require('./view.js');
try{const args=process.argv.slice(2);if(args.length!==2)throw Error('사용: query.cjs E1-G0.25 100');const d=JSON.parse(z.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz'))));console.log(JSON.stringify(V.query(d,args[0],Number(args[1])),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
