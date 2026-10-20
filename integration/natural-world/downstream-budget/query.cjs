'use strict';
const fs=require('node:fs'),zlib=require('node:zlib'),path=require('node:path'),B=require('./core.js');
try{
  const d=B.validate(JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'output/review.json.gz')))));
  const q=B.query(d,process.argv[2]||'D298591');if(!q)throw Error('미정 경계 ID(D...) 또는 미정 물길 ID가 필요합니다.');
  const id=q.group?.id||q.id,rep=d.representatives.find(g=>g.id===id);
  const experiment=rep?B.experiment(rep,{lossMPerYear:Number(process.argv[3]??0),years:Number(process.argv[4]??100),initialFraction:Number(process.argv[5]??0)}):null;
  console.log(JSON.stringify({review:q,experiment,provenance:d.provenance},null,2));
}catch(e){console.error(e.message);process.exitCode=1;}
