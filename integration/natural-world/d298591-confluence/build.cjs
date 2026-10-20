'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),z=require('node:zlib'),H=require('./core.js'),{examples}=require('./examples.cjs');
const root=path.resolve(__dirname,'..'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const source=JSON.parse(z.gunzipSync(fs.readFileSync(path.join(root,'d298591-tailwater/output/review.json.gz'))));
// A projection of the retained ledger, not hydraulic inputs. The first station is
// included once; subsequent station TOTALS are never added to it.
const sourceLedger={schema:'source-increment-audit/1',hydraulicInputReady:false,geometryAdopted:false,releaseIncluded:false,periods:[]};
for(let k=0;k<12;k++){
 const first=source.rows[0].periods[k],increments=source.rows.slice(1).map(row=>({cell:row.cell,localM3S:row.periods[k].localBaseM3S,sideM3S:row.periods[k].sideInputBaseM3S}));
 const initialM3S=first.sourceBaseM3S,sumM3S=initialM3S+increments.reduce((v,r)=>v+r.localM3S+r.sideM3S,0),mouthM3S=source.rows.at(-1).periods[k].sourceBaseM3S;
 sourceLedger.periods.push({period:first.period,initialM3S,increments,sumM3S,mouthM3S,residualM3S:sumM3S-mouthM3S});
}
const presets=examples.map(p=>{const r=H.solve(p.input);return {...p,expected:{status:r.status,summary:r.summary,junctions:r.junctions,reachStatus:r.reaches.map(s=>({id:s.id,status:s.status,stop:s.stop,upstreamDepthM:s.upstreamDepthM}))}};}),counts={};
for(const p of presets)counts[p.expected.status]=(counts[p.expected.status]??0)+1;
const catalog={schema:'d298591-confluence-catalog/1',provenance:{baseline:'7269a80db5e1cca1fbabe96dc7a634cb012acc00',inputs:{'d298591-tailwater/output/review.json.gz':hash('d298591-tailwater/output/review.json.gz')},code:Object.fromEntries(['core.js','examples.cjs','build.cjs'].map(f=>['d298591-confluence/'+f,hash('d298591-confluence/'+f)]))},context:{geometry:'synthetic explicit sections; no source bed, width, length or flow adopted',junction:'prescribed nonnegative head losses, alpha=1, zero-angle only; momentum not solved',sourceLedgerRole:'separate original-model increment audit, not simultaneous observed inflows or hydraulic scenario',priorTailwaterHeldCases:108,priorAlternateLimitCases:14},presets,counts,sourceLedger,physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false};
const out=path.join(__dirname,'output');fs.mkdirSync(out,{recursive:true});const bytes=Buffer.from(JSON.stringify(catalog));fs.writeFileSync(path.join(out,'catalog.json'),bytes);
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:'d298591-confluence-manifest/1',file:'catalog.json',bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2)+'\n');
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({schema:'d298591-confluence-summary/1',counts,presets:presets.length,sourceLedgerMaxResidualM3S:Math.max(...sourceLedger.periods.map(p=>Math.abs(p.residualM3S))),physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false},null,2)+'\n');
console.log(fs.readFileSync(path.join(out,'summary.json'),'utf8'));
