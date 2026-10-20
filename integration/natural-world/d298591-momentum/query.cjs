'use strict';
const fs=require('node:fs'),path=require('node:path'),V=require('./view.js'),d=V.validate(require('./output/catalog.json'));
try{const args=process.argv.slice(2);let p;if(args.length===2&&args[0]==='--input')p=JSON.parse(fs.readFileSync(args[1],'utf8'));else if(args.length===1)p=d.presets.find(x=>x.id===args[0])?.input;if(!p)throw Error('Usage: query.cjs PRESET | --input FILE');const r=V.result(d,p);process.stdout.write(JSON.stringify(r,null,2)+'\n');if(r.candidate.status==='invalid-input')process.exitCode=2;}catch(e){console.error(e.message);process.exitCode=1;}
