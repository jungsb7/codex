'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),V=require('./view.js');
try{const d=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz')))));console.log(JSON.stringify(V.select(d,Number(process.argv[2]??301657),Number(process.argv[3]??1)),null,2));}catch(e){console.error(e.message);process.exitCode=1;}
