'use strict';
const fs=require('node:fs'),z=require('node:zlib'),crypto=require('node:crypto'),C=require('./core.js'),manifest=require('./output/manifest.json');
function verified(spec){const b=fs.readFileSync(__dirname+'/output/'+spec.file);if(b.length!==spec.bytes||crypto.createHash('sha256').update(b).digest('hex')!==spec.sha256)throw Error('Data integrity mismatch');return JSON.parse(z.gunzipSync(b));}
let model;const cases=new Map();function view(id='reference'){if(!model)model=C.decode(verified(manifest.base));if(!cases.has(id)){const s=manifest.cases.find(s=>s.id===id);if(!s)throw Error('Unknown scenario');cases.set(id,C.create(model,verified(s)));}return cases.get(id);}
const query=(id,scope)=>C.summarize(view(id),scope),point=(id,cell)=>C.point(view(id),cell),geojson=(id,scope,layer,kind)=>C.geojson(view(id),scope,layer,kind);
if(require.main===module){try{const id=process.argv[2]||'reference',scope=process.argv[3]||'world',r=scope==='--cell'?point(id,Number(process.argv[4])):process.argv[4]==='--geojson'?geojson(id,scope,process.argv[5]||'forest',process.argv[6]||'boundary'):query(id,scope);console.log(JSON.stringify(r,null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={verified,view,query,point,geojson,manifest};
