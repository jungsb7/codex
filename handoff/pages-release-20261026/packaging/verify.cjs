'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),candidate=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const queries=JSON.parse(fs.readFileSync(path.join(root,'handoff/local-deployment-audit/snapshot/deep/query-checks.json'))).checks,checks=[];
for(const q of queries){const r=cp.spawnSync(process.execPath,[q.path,...q.args],{cwd:candidate,maxBuffer:64e6,timeout:120000}),sha=hash(r.stdout);checks.push({module:q.module,args:q.args,exitCode:r.status,sha256:sha,expected:q.original.sha256,passed:r.status===0&&sha===q.original.sha256,stderr:r.stderr.toString()});console.log(q.module+': '+checks.at(-1).passed);}
write('ai-regression.json',{status:checks.every(x=>x.passed)?'passed':'failed',checks});assert(checks.every(x=>x.passed));
const periods=[];
for(const mod of ['subgrid-hydrology','storm-event-model','internal-pond-model']){
 const oldQ=require(path.join(root,'integration/natural-world',mod,'query.cjs')),newQ=require(path.join(candidate,'integration/natural-world',mod,'query.cjs'));
 const oldModel=oldQ.model(),newModel=newQ.model();
 for(let k=1;k<=12;k++){
  const oldP=oldQ.period(k),newP=newQ.period(k);assert.deepEqual(Object.keys(oldP.a),Object.keys(newP.a));let values=0;
  for(const [key,a]of Object.entries(oldP.a)){const b=newP.a[key];assert.equal(a.constructor.name,b.constructor.name);assert(Buffer.from(a.buffer,a.byteOffset,a.byteLength).equals(Buffer.from(b.buffer,b.byteOffset,b.byteLength)),mod+' '+k+' '+key);values+=a.length;}
  assert.deepEqual(oldP.summary,newP.summary);assert.deepEqual(oldQ.budget('world',k),newQ.budget('world',k));
  periods.push({module:mod,period:k,fields:Object.keys(oldP.a).length,values,allFloat64BitsEqual:true,worldBudgetIdentical:true});
 }
 console.log(mod+': all 12 decoded periods and budgets match exactly');
}
write('decoded-period-regression.json',{status:'passed',periods});
