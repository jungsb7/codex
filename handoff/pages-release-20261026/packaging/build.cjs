'use strict';
// Only creates a new candidate tree. Never rewrites the restored repository.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),z=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict'),codec=require('./codec.js');
const root=path.resolve(__dirname,'../..'),destination=path.resolve(process.argv[2]||''),reportDir=path.resolve(process.argv[3]||'');
if(!process.argv[2]||!process.argv[3])throw Error('Usage: node build.cjs NEW_CANDIDATE NEW_REPORT_DIRECTORY');
if(fs.existsSync(destination)||fs.existsSync(reportDir))throw Error('Destination exists; refusing to overwrite');
if(destination===root||destination.startsWith(root+path.sep))throw Error('Candidate must be outside the source repository');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),gzip=b=>z.gzipSync(b,{level:9}),json=o=>Buffer.from(JSON.stringify(o));
const list=fs.readFileSync(path.join(root,'handoff/local-deployment-audit/snapshot/deep/publish-files.txt'),'utf8').trim().split(/\r?\n/);
const tree=cp.execFileSync('git',['ls-tree','-rz','HEAD'],{cwd:root,maxBuffer:4e6}).toString().split('\0').filter(Boolean);
let sourceBytes=0;for(const row of tree){const [,sha,p]=row.match(/^\d+ blob ([0-9a-f]+)\t(.+)$/s)||[];if(!p)throw Error('Unexpected Git tree entry');const b=fs.readFileSync(path.join(root,p));const actual=crypto.createHash('sha1').update(Buffer.from('blob '+b.length+'\0')).update(b).digest('hex');assert.equal(actual,sha,'Source changed: '+p);sourceBytes+=b.length;}
fs.mkdirSync(destination,{recursive:true});fs.mkdirSync(reportDir,{recursive:true});
const replacements=new Map(),changedPayloads=[],numericFields=[];
function encode(raw,stride){const count=raw.length/8,out=Buffer.alloc(raw.length);for(let byte=0;byte<8;byte++)for(let i=0;i<count;i++)out[byte*count+i]=raw[i*8+byte]^(i%stride?raw[(i-1)*8+byte]:0);return{type:'f64-xor-byte-planes',count,stride,data:out.toString('base64')};}
function cross(raw,base){const count=raw.length/8,out=Buffer.alloc(raw.length);assert.equal(base.length,raw.length*2);for(let byte=0;byte<8;byte++)for(let i=0;i<count;i++)out[byte*count+i]=raw[i*8+byte]^base[(i*2+1)*8+byte];return{type:'f64-xor-sampled-base-planes',count,base:'trace',baseStride:2,baseOffset:1,data:out.toString('base64')};}
for(const mod of ['subgrid-hydrology','storm-event-model','internal-pond-model']){
 const prefix='integration/natural-world/'+mod+'/',manifest=JSON.parse(fs.readFileSync(path.join(root,prefix+'output/manifest.json')));
 for(const spec of manifest.periods){
  const p=prefix+(spec.path||spec.parts[0].path.replace(/\.part01$/,'')),before=spec.parts?Buffer.concat(spec.parts.map(part=>fs.readFileSync(path.join(root,prefix+part.path)))):fs.readFileSync(path.join(root,p)),original=JSON.parse(z.gunzipSync(before)),packed=structuredClone(original),rawFields=Object.fromEntries(Object.entries(original.fields).map(([k,f])=>[k,Buffer.from(codec.raw(f,Buffer.from(f.data,'base64').length/8))]));
  for(const [key,f]of Object.entries(original.fields)){
   const raw=rawFields[key],count=raw.length/8;let best=f,bestBytes=gzip(json(f)).length;
   const variants=[encode(raw,1),encode(raw,count)];if(key==='coarseTrace'||key==='timeTrace')variants.push(cross(raw,rawFields.trace));
   for(const v of variants){const size=gzip(json(v)).length;if(size<bestBytes){best=v;bestBytes=size;}}
   packed.fields[key]=best;
  }
  for(const [key,f]of Object.entries(packed.fields)){
   const decoded=Buffer.from(codec.raw(f,rawFields[key].length/8,packed.fields));assert(decoded.equals(rawFields[key]),p+' '+key+' bits');
   numericFields.push({path:p,field:key,count:rawFields[key].length/8,encoding:f.type,decodedSha256:hash(decoded),bitExact:true});
  }
  assert.deepEqual({...packed,fields:null},{...original,fields:null});
  const after=gzip(json(packed));assert(after.length<before.length,p+' must shrink');
  if(spec.parts){assert.equal(spec.parts.length,2);assert(after.length>9000000);spec.parts.forEach((part,i)=>{const b=after.subarray(i*9000000,(i+1)*9000000);replacements.set(prefix+part.path,b);part.bytes=b.length;part.sha256=hash(b);});}else replacements.set(p,after);
  changedPayloads.push({path:p,beforeBytes:before.length,afterBytes:after.length,beforeSha256:hash(before),afterSha256:hash(after)});
  spec.bytes=after.length;spec.sha256=hash(after);console.log(mod+' '+original.period+': '+before.length+' -> '+after.length);
 }
 replacements.set(prefix+'output/manifest.json',Buffer.from(JSON.stringify(manifest,null,2)+'\n'));
 const core=fs.readFileSync(path.join(root,prefix+'core.js'),'utf8');
 let next;
 if(mod==='internal-pond-model'){
  const call='fields[key]=K.decode(value,count)';assert(core.includes(call));next=core.replace(call,"fields[key]=value.type==='f64-xor-sampled-base-planes'?(typeof module==='object'&&module.exports?require('../lossless-codec.js'):globalThis.LosslessFloat64).decode(value,count,d.fields):K.decode(value,count)");
 }else{
  const start=core.indexOf('function decode(f,n){'),end=core.indexOf('\nfunction period(',start);assert(start>=0&&end>start,'Decoder signature');
  const decoder="function decode(f,n,fields){return (typeof module==='object'&&module.exports?require('../lossless-codec.js'):globalThis.LosslessFloat64).decode(f,n,fields);}";
  next=core.slice(0,start)+decoder+core.slice(end);assert(next.includes('decode(d.fields[k],n)'),'Period decoder call');next=next.replace('decode(d.fields[k],n)','decode(d.fields[k],n,d.fields)');
 }
 replacements.set(prefix+'core.js',Buffer.from(next));
 const html=fs.readFileSync(path.join(root,prefix+'index.html'),'utf8'),tag='<script src="core.js"></script>';assert(html.includes(tag),'Core script tag');
 replacements.set(prefix+'index.html',Buffer.from(html.replace(tag,'<script src="../lossless-codec.js"></script>'+tag)));
}
replacements.set('integration/natural-world/lossless-codec.js',fs.readFileSync(path.join(__dirname,'codec.js')));
let beforeBytes=0,afterBytes=0;const artifacts=[];
for(const p of [...list,...[...replacements.keys()].filter(p=>!list.includes(p))]){
 if(path.isAbsolute(p)||p.split('/').includes('..'))throw Error('Unsafe candidate path');
 const target=path.join(destination,p),source=path.join(root,p),original=fs.existsSync(source)?fs.readFileSync(source):null,b=replacements.get(p)||original;
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,b,{flag:'wx'});beforeBytes+=original?.length||0;afterBytes+=b.length;
 artifacts.push({path:p,bytes:b.length,sha256:hash(b),changed:replacements.has(p)});
}
const summary={status:'built-and-numeric-bits-verified',sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root}).toString().trim(),sourceFiles:tree.length,sourceBytes,sourceGitBlobsAllMatch:true,candidateFiles:artifacts.length,beforeBytes,afterBytes,savedBytes:beforeBytes-afterBytes,belowOneBillionBytes:afterBytes<1e9,belowNineHundredMillionBytes:afterBytes<=9e8,changedPayloads,numericFieldsChecked:numericFields.length,originalFilesOverwritten:false,deployed:false,excludedFilesPolicy:'Existing reviewed publish-files.txt; excluded source/reproduction files remain in original Git checkout. External direct links to excluded paths are not asserted preserved.'};
for(const [name,value]of Object.entries({'build-summary.json':summary,'numeric-bit-preservation.json':numericFields,'candidate-files.json':artifacts}))fs.writeFileSync(path.join(reportDir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...summary,changedPayloads:changedPayloads.length},null,2));
