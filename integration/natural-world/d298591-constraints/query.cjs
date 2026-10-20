'use strict';
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),V=require('./view.js');
try{
 const [cell='274035',warming='0',factor='45',energyId='E2-G0.25-I0',rise='.1',tailwater='0',...extra]=process.argv.slice(2);if(extra.length)throw Error('Too many arguments');
 const d=V.validate(JSON.parse(z.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz')))));
 console.log(JSON.stringify(V.select(d,{cell:+cell,warmingC:+warming,meltFactor:+factor,energyId,stageRiseM:+rise,tailwaterDepthM:+tailwater}),null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
