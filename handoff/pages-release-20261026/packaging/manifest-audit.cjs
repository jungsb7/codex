'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),candidate=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),prior=JSON.parse(fs.readFileSync(path.join(root,'handoff/local-deployment-audit/snapshot/deep/manifest-integrity.json'))),cache=new Map(),checks=[],unhandled=[];
function fields(name){if(cache.has(name))return cache.get(name);const table=new Map(),value=JSON.parse(fs.readFileSync(path.join(candidate,name)));function visit(v,key){table.set(key,v);if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))visit(x,Array.isArray(v)?key+'['+k+']':key+'.'+k);}visit(value,'');cache.set(name,table);return table;}
const hashes=new Map();for(const old of prior.checks.filter(c=>c.manifest.includes('/output/')&&c.passed)){
 const spec=fields(old.manifest).get(old.field);if(!spec||typeof spec!=='object'||typeof spec.sha256!=='string'||typeof spec.bytes!=='number'){unhandled.push({manifest:old.manifest,field:old.field,target:old.target});continue;}
 if(!hashes.has(old.target)){const b=fs.readFileSync(path.join(candidate,old.target));hashes.set(old.target,{bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}
 const actual=hashes.get(old.target),passed=actual.bytes===spec.bytes&&actual.sha256===spec.sha256;checks.push({manifest:old.manifest,field:old.field,target:old.target,passed});
}
const result={status:checks.every(c=>c.passed)&&!unhandled.length?'passed':'failed',checkedDescriptors:checks.length,uniqueFiles:hashes.size,unhandled,failed:checks.filter(c=>!c.passed)};fs.writeFileSync(path.join(out,'runtime-manifest-audit.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result,null,2));assert.equal(result.status,'passed');
