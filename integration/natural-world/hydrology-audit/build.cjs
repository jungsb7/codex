'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const C=require('../core.js'),Codec=require('../stage5/codec.js'),{inspectGraph,inspectReaches}=require('./audit.cjs');
const base=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(base,p))),sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(base,p))).digest('hex');
const foundation=read('output/foundation.json'),stage=read('stage3/output/waterways.json'),source=read('stage3/inputs/hydrology.json');
const atlas=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(base,'unified-atlas/output/atlas.json.gz')))),w=foundation.width,h=foundation.height,n=w*h;
const decode=(fields,size)=>Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,Codec.decode(v.data,size,v.type)]));
const a=decode(foundation.fields,n),f=decode(stage.fields,n),u=decode(atlas.fields,atlas.count),cells=u.cells,nodes=Codec.decode(stage.nodes,stage.nodeCount,'i32');
assert.equal(source.provenance.worldHash,foundation.provenance.worldHash);assert.equal(atlas.provenance.worldHash,foundation.provenance.worldHash);
const graph={w,h,cells,nodes,...a,...f,depressions:stage.depressions,lakeNode:stage.lake.node,lakeOutlet:stage.lake.outlet};
const audit=inspectGraph(graph),reachAudit=inspectReaches(graph,stage.reaches,f.reach,f.channel,i=>C.ll(w,h,i));
const depByNode=new Map(stage.depressions.map(d=>[d.node,d])),sec=365/12*86400,area=new Float64Array(n);
for(const i of cells)area[f.canonical[i]]+=C.rowArea(w,h,Math.floor(i/w));
for(const i of audit.order)if(f.receiver[i]>=0)area[f.receiver[i]]+=area[i];
let areaMaxRelative=0;for(const i of nodes)areaMaxRelative=Math.max(areaMaxRelative,Math.abs(area[i]-f.area[i])/Math.max(1,area[i]));
const local=Codec.decode(source.localDischarge,source.cellCount*12,'f32'),sourceCells=Codec.decode(source.cells,source.cellCount,'i32'),bytes=fs.readFileSync(path.join(base,'stage3/output/flow-ledger.bin'));
assert.equal(bytes.length,nodes.length*12*8);assert.deepEqual(cells,sourceCells);
const lossFraction=source.hydrologyMeta.water_tower.channelLossFraction,periods=[];let flowMaxAbsolute=0,flowMaxRelative=0;
for(let period=0;period<12;period++){
 const flow=new Float64Array(n);for(let k=0;k<cells.length;k++)if(!a.lake[cells[k]])flow[f.canonical[cells[k]]]+=(local[k*12+period]+local[k*12+(period+1)%12])/2;
 let incomingLake=0,loss=0,ocean=0,unresolved=0;
 for(const i of audit.order){if(i===stage.lake.node){incomingLake=flow[i];flow[i]=source.lake.monthly[period].outflow_m3/sec;}
  const j=f.receiver[i];if(j>=0){let amount=flow[i];if(j===stage.lake.node){loss+=amount*lossFraction;amount*=1-lossFraction;}flow[j]+=amount;}else if(depByNode.has(i))unresolved+=flow[i];else ocean+=flow[i];
 }
 for(let k=0;k<nodes.length;k++){const expected=bytes.readDoubleLE((k*12+period)*8),error=Math.abs(flow[nodes[k]]-expected);flowMaxAbsolute=Math.max(flowMaxAbsolute,error);flowMaxRelative=Math.max(flowMaxRelative,error/Math.max(1,Math.abs(expected)));}
 const old=stage.budgets[period],lm=source.lake.monthly[period],relative=(x,y)=>Math.abs(x-y)/Math.max(1,Math.abs(y));
 periods.push({period:period+1,lakeInflowRelativeError:relative(incomingLake*sec,lm.inflow_m3),oceanRelativeError:relative(ocean*sec,old.oceanExportM3),unresolvedRelativeError:relative(unresolved*sec,old.unresolvedRetentionTransferM3),lossRelativeError:relative(loss*sec,old.channelLossM3),oceanExportM3:ocean*sec,unresolvedBoundaryTransferM3:unresolved*sec});
}
const terminalCounts=new Map(),regions=atlas.regions.map(r=>({id:r.id,name:r.name,cells:0,oceanCells:0,unresolvedCells:0,collapsedCells:0,passesLakeCells:0})),kind=new Uint8Array(cells.length),incoming=new Int32Array(cells.length),flags=new Uint8Array(cells.length);
for(let k=0;k<cells.length;k++){const i=cells[k],node=f.canonical[i],end=audit.computedTerminal[node],unresolved=depByNode.has(end),r=regions.find(r=>r.id===u.region[k]);r.cells++;r[unresolved?'unresolvedCells':'oceanCells']++;r.collapsedCells+=!!f.depression[i];r.passesLakeCells+=audit.passesLake[node];terminalCounts.set(end,(terminalCounts.get(end)||0)+1);kind[k]=f.depression[i]?3:unresolved?2:audit.passesLake[node]?4:1;incoming[k]=audit.incoming[node];flags[k]=audit.flags[node];}
let dividePairs=0,divideInconsistent=0;
for(const i of cells){const x=i%w,y=Math.floor(i/w);for(const j of [y*w+(x+1)%w,y<h-1?i+w:-1])if(j>=0&&(a.land[j]||a.lake[j])&&audit.computedTerminal[f.canonical[i]]!==audit.computedTerminal[f.canonical[j]]){dividePairs++;if(f.receiver[f.canonical[i]]===f.canonical[j]||f.receiver[f.canonical[j]]===f.canonical[i])divideInconsistent++;}}
const checks=[
 {id:'all-cells-covered',passed:cells.length===268857&&regions.every(r=>r.cells>0)},
 {id:'acyclic-adjacent-downhill-graph',passed:audit.issueCount===0,issues:audit.issues},
 {id:'reach-joins-and-exact-geometry',passed:reachAudit.issueCount===0,issues:reachAudit.issues},
 {id:'terminal-catchment-boundaries',passed:divideInconsistent===0,examinedPairs:dividePairs},
 {id:'catchment-area-conservation',passed:areaMaxRelative<1e-7,maxRelativeError:areaMaxRelative},
 {id:'all-node-seasonal-flow-reconstruction',passed:flowMaxRelative<1e-10,maxRelativeError:flowMaxRelative,maxAbsoluteErrorM3s:flowMaxAbsolute,samples:nodes.length*12},
 {id:'lake-inflow-release-loss-and-boundary-accounts',passed:periods.every(p=>p.lakeInflowRelativeError<1e-6&&p.oceanRelativeError<1e-10&&p.unresolvedRelativeError<1e-10&&p.lossRelativeError<1e-10)},
 {id:'unresolved-allocations-still-null',passed:stage.depressions.every(d=>['outflowM3','storageChangeM3','evaporationM3','infiltrationM3','salinity'].every(k=>d[k]===null))},
 {id:'existing-trunk-destinations',passed:stage.trunks.every(r=>r.expectedDestination==='lake'?audit.passesLake[f.canonical[r.startCell]]:!depByNode.has(audit.computedTerminal[f.canonical[r.startCell]]))}
];
const inputs=['output/foundation.json','stage3/output/waterways.json','stage3/inputs/hydrology.json','stage3/output/flow-ledger.bin','unified-atlas/output/atlas.json.gz'];
const provenance={worldHash:foundation.provenance.worldHash,geometryHash:foundation.provenance.geometryHash,inputs:Object.fromEntries(inputs.map(p=>[p,sha(p)])),code:Object.fromEntries(['hydrology-audit/audit.cjs','hydrology-audit/build.cjs'].map(p=>[p,sha(p)]))};
const summary={schema:'world-hydrology-audit/1',status:checks.every(c=>c.passed)?'passed-with-unresolved-boundaries':'failed',provenance,terrestrialCells:cells.length,nodeCount:nodes.length,reaches:stage.reaches.length,unresolvedReaches:stage.reaches.filter(r=>r.endpointKind==='unresolved-depression').length,depressions:stage.depressions.length,depressionCells:cells.reduce((s,i)=>s+!!f.depression[i],0),oceanTerminals:stage.mouths.length,originalLakeCells:cells.reduce((s,i)=>s+!!a.lake[i],0),lakeInletReaches:stage.lake.inletReaches,lakeOutletReach:stage.lake.outletReach,graphIssues:audit.issueCount,reachIssues:reachAudit.issueCount,dividePairs,regions,checks,periods,automaticAdoption:false,terrainChanged:false,climateChanged:false,meaning:'Checks certify internal consistency of the existing candidate graph, not real channels, true divides or resolved depression storage.'};
const fields={};for(const key of ['canonical','receiver','entry','terminal'])fields[key]={type:'i32',data:C.encode(Int32Array.from(cells,i=>f[key][i]))};
fields.incoming={type:'i32',data:C.encode(incoming)};
for(const [key,value]of Object.entries({kind,flags}))fields[key]={type:'u8',data:C.encode(value)};
const terminalInfo=Array.from(terminalCounts,([node,count])=>({node,id:depByNode.get(node)?.id||'O'+node,kind:depByNode.has(node)?'unresolved':'ocean',cells:count,catchmentAreaKm2:area[node],location:C.ll(w,h,node),maxVirtualFillM:depByNode.get(node)?.maxVirtualFillM??null,allocation:null}));
const examples=stage.trunks.map(r=>({id:r.id,name:r.name,cell:r.startCell}));for(const id of ['D126467','D147845','D144758']){const d=stage.depressions.find(d=>d.id===id);if(d)examples.push({id,name:id+' · 미확정 경계',cell:d.node});}
const payload={schema:'world-hydrology-map/1',width:w,height:h,count:cells.length,atlasSHA256:provenance.inputs['unified-atlas/output/atlas.json.gz'],provenance,fields,summary,terminals:terminalInfo,lake:{node:stage.lake.node,outlet:stage.lake.outlet,inletReaches:stage.lake.inletReaches,outletReach:stage.lake.outletReach},examples};
const write=(name,data)=>fs.writeFileSync(path.join(__dirname,'output',name),JSON.stringify(data,null,2)+'\n');
write('summary.json',summary);write('checks.json',checks);fs.writeFileSync(path.join(__dirname,'output/atlas.json.gz'),zlib.gzipSync(JSON.stringify(payload),{level:9,mtime:0}));
console.log(JSON.stringify({status:summary.status,cells:cells.length,nodes:nodes.length,checks,regions,bytes:fs.statSync(path.join(__dirname,'output/atlas.json.gz')).size},null,2));assert(checks.every(c=>c.passed),'Audit findings require review');
