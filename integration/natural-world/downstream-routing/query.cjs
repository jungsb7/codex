'use strict';
const fs=require('node:fs'),R=require('./core.js'),d=require('./output/catalog.json');
try{
 const args=process.argv.slice(2);if(!args.length)throw Error('사용: query.cjs 경계ID|물길ID [--input 가정.json] 또는 query.cjs --input 가정.json');
 const at=args.indexOf('--input'),term=at===0?null:args[0];if(at!==-1&&(at!==0&&at!==1||args.length!==at+2))throw Error('잘못된 인자');if(at===-1&&args.length!==1)throw Error('잘못된 인자');
 const g=term?R.query(d,term):null;if(term&&!g)throw Error('미정 경계/물길을 찾을 수 없음');
 const r=at<0?null:R.run(d,JSON.parse(fs.readFileSync(args[at+1],'utf8')));
 console.log(JSON.stringify(term?{schema:'conditional-boundary-query/1',boundary:g,result:r?.boundaries.find(b=>b.id===g.id)??null,assumptions:r?.assumptions??null,provenance:d.provenance,actual:{storageM3:null,infiltrationM3:null,overflowM3:null},automaticAdoption:false}:r,null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
