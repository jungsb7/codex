'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),V=require('./view.js');
try{
 const [id='E1-G0.25-I0',year='100',...extra]=process.argv.slice(2);if(extra.length)throw Error('Usage: query.cjs E1-G0.25-I0 100');
 const d=V.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz')))));
 console.log(JSON.stringify(V.select(d,id,Number(year)),null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
