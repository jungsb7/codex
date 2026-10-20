'use strict';
function trace(start,graph){const byCell=new Map(graph.map(r=>[r.cell,r])),route=[],seen=new Set();let c=start;while(c>=0){if(seen.has(c)||!byCell.has(c))throw Error('Missing or cyclic route');seen.add(c);route.push(c);c=byCell.get(c).receiver;}return route;}
function reconstruct(graph,forcing){
 const byCell=new Map(graph.map(r=>[r.cell,r])),incoming=new Map(graph.map(r=>[r.cell,[]])),pending=new Map(graph.map(r=>[r.cell,0])),flows=new Map(graph.map(r=>[r.cell,Array(12).fill(0)])),local=new Map(graph.map(r=>[r.cell,Array(12).fill(0)]));
 if(byCell.size!==graph.length)throw Error('Duplicate node');
 for(const r of graph)if(r.receiver>=0){if(!incoming.has(r.receiver))throw Error('Receiver outside collected domain');incoming.get(r.receiver).push(r.cell);pending.set(r.receiver,pending.get(r.receiver)+1);}
 for(const r of forcing){if(!local.has(r.canonical)||r.rawLocalM3S.length!==12||!r.rawLocalM3S.every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid source');for(let k=0;k<12;k++)local.get(r.canonical)[k]+=(r.rawLocalM3S[k]+r.rawLocalM3S[(k+1)%12])/2;}
 for(const [cell,q]of local)flows.set(cell,[...q]);const queue=graph.filter(r=>pending.get(r.cell)===0).map(r=>r.cell);
 for(let k=0;k<queue.length;k++){const c=queue[k],j=byCell.get(c).receiver;if(j<0)continue;for(let p=0;p<12;p++)flows.get(j)[p]+=flows.get(c)[p];pending.set(j,pending.get(j)-1);if(pending.get(j)===0)queue.push(j);}
 if(queue.length!==graph.length)throw Error('Cyclic catchment');return {flows,local,incoming};
}
function profile(rows,distance){
 if(rows.length<2||rows.some(r=>!Number.isFinite(r.elevationM)))throw Error('Invalid profile');let km=0;
 return rows.map((r,j)=>{const segmentKm=j?distance(rows[j-1].location,r.location):0;if(j&&!(segmentKm>0))throw Error('Zero-length segment');km+=segmentKm;const drop=j?rows[j-1].elevationM-r.elevationM:null;return {...r,index:j,distanceKm:km,segmentKm,dropM:drop,geometricSlope:drop===null?null:drop/(segmentKm*1000)};});
}
function shallowPrefix(rows){let end=0;for(let j=1;j<rows.length;j++){if(Math.abs(rows[j].dropM-.05)>2e-5)break;end=j;}return {startCell:rows[0].cell,endCell:rows[end].cell,edges:end,dropM:rows[0].elevationM-rows[end].elevationM,lengthKm:rows[end].distanceKm,meanGeometricSlope:end?(rows[0].elevationM-rows[end].elevationM)/(rows[end].distanceKm*1000):null,meaning:'Native centerline height pattern; not measured bed or hydraulic friction slope.'};}
module.exports={trace,reconstruct,profile,shallowPrefix};
