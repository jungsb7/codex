(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../downstream-routing/core.js'));else root.InlandRouting=factory(root.DownstreamRouting);})(globalThis,function(Previous){
'use strict';
const actual=()=>({storageM3:null,infiltrationM3:null,evaporationM3:null,overflowM3:null,waterLevelM:null});
function plan(d){
 if(d?.schema!=='inland-boundary-routing/1'||!Array.isArray(d.groups)||!Array.isArray(d.reaches))throw Error('자료 형식이 다릅니다.');
 const by=new Map(),edges=new Map(),reachCounts=new Map();
 for(const g of d.groups){if(typeof g.id!=='string'||by.has(g.id)||!Number.isInteger(g.reachCount)||g.reachCount<0)throw Error('중복/잘못된 경계');by.set(g.id,g);reachCounts.set(g.id,0);
  if(g.periodInflowM3?.length!==12||g.periodInflowM3.some(v=>!Number.isFinite(v)||v<0))throw Error('잘못된 원본 유입');
  if(g.status==='eligible'){
   if(!(g.capacityM3>0)||!Number.isFinite(g.capacityM3)||!(g.referenceAreaM2>0)||!Number.isFinite(g.referenceAreaM2))throw Error('잘못된 용량');
   if(!['ocean','unresolved'].includes(g.target?.kind)||!g.route?.length||new Set(g.route).size!==g.route.length||g.route.some(n=>!Number.isInteger(n)||n<0)||g.route.at(-1)!==g.target.entryCell)throw Error('잘못된 전달 경로');
   const terminal=g.target.kind==='ocean'?'O'+g.target.node:g.target.id;
   for(let k=0;k<g.route.length;k++){const n=g.route[k],next=g.route[k+1]??terminal;if(edges.has(n)&&edges.get(n)!==next)throw Error('충돌하는 하류 연결');edges.set(n,next);}
  }else if(g.status!=='held'||!g.reasons?.length)throw Error('보류 근거 없음');
 }
 const reaches=new Set();for(const [id,b]of d.reaches){if(!Number.isInteger(id)||id<0||reaches.has(id)||!by.has(b))throw Error('잘못된 물길 대응');reaches.add(id);reachCounts.set(b,reachCounts.get(b)+1);}for(const g of d.groups)if(reachCounts.get(g.id)!==g.reachCount)throw Error('물길 수 불일치');
 const active=d.groups.filter(g=>g.status==='eligible'),indegree=new Map(active.map(g=>[g.id,0]));
 for(const g of active)if(g.target.kind==='unresolved'){const t=by.get(g.target.id);if(!t||t.node!==g.target.node)throw Error('하류 경계 없음/불일치');if(t.status==='eligible')indegree.set(t.id,indegree.get(t.id)+1);}
 const queue=active.filter(g=>indegree.get(g.id)===0).map(g=>g.id).sort(),order=[];
 for(let k=0;k<queue.length;k++){const id=queue[k],g=by.get(id);order.push(id);if(indegree.has(g.target.id)){const degree=indegree.get(g.target.id)-1;indegree.set(g.target.id,degree);if(degree===0)queue.push(g.target.id);}}
 if(order.length!==active.length)throw Error('순환 경계를 계산할 수 없습니다. 순환 구성원을 보류해야 합니다.');
 const endings=new Map();for(const id of [...order].reverse()){const g=by.get(id);endings.set(id,g.target.kind==='ocean'?{kind:'ocean',id:g.target.id}:by.get(g.target.id).status==='held'?{kind:'held',id:g.target.id}:endings.get(g.target.id));}
 return {by,active,order,endings};
}
function validate(d){plan(d);return d;}
function run(d,input){
 const p=plan(d),o=Previous.options(input),nodes=new Map(),mouths=new Map(),transfers=new Map(),periods=[],rows=new Map();
 for(const g of d.groups){const active=g.status==='eligible';rows.set(g.id,{id:g.id,status:g.status,reachCount:g.reachCount,reasons:g.reasons,ending:active?p.endings.get(g.id):{kind:'held',id:g.id},initialInventoryM3:active?g.capacityM3*o.initialFraction:null,finalInventoryM3:active?g.capacityM3*o.initialFraction:null,totalSourceInflowM3:0,totalReceivedM3:0,totalNetLossM3:active?0:null,totalReleaseM3:active?0:null,totalUnallocatedM3:active?null:0,firstRelease:null,lastYear:[],actual:actual()});
  if(active){for(const cell of g.route)if(!nodes.has(cell))nodes.set(cell,{cell,totalIncrementM3:0,lastYearIncrementM3:Array(12).fill(0)});if(g.target.kind==='unresolved')transfers.set(g.id,{from:g.id,to:g.target.id,totalTransferredM3:0,lastYearTransferredM3:Array(12).fill(0)});else if(!mouths.has(g.target.node))mouths.set(g.target.node,{cell:g.target.node,totalDeliveredM3:0,lastYearDeliveredM3:Array(12).fill(0)});}
 }
 let totalSourceInflowM3=0,totalNetLossM3=0,totalOceanDeliveryM3=0,totalUnallocatedM3=0,maxAbsPeriodResidualM3=0,maxAbsTransferResidualM3=0;
 for(let k=0;k<o.years*12;k++){
  const phase=k%12,last=k>=(o.years-1)*12,incoming=new Map();let start=0,source=0,loss=0,ocean=0,end=0,unallocated=0,sent=0,received=0;
  for(const g of d.groups){const r=rows.get(g.id),v=g.periodInflowM3[phase];r.totalSourceInflowM3+=v;source+=v;}
  for(const id of p.order){const g=p.by.get(id),r=rows.get(id),up=incoming.get(id)||0,own=g.periodInflowM3[phase],s=r.finalInventoryM3,available=s+own+up,debit=Math.min(available,g.referenceAreaM2*o.lossMPerYear/12),q=Math.max(0,available-debit-g.capacityM3),v=Math.min(g.capacityM3,available-debit);
   r.finalInventoryM3=v;r.totalReceivedM3+=up;r.totalNetLossM3+=debit;r.totalReleaseM3+=q;received+=up;
   if(q>0&&!r.firstRelease)r.firstRelease={year:Math.floor(k/12)+1,period:phase+1};
   if(last)r.lastYear.push({period:phase+1,sourceInflowM3:own,receivedM3:up,startInventoryM3:s,additionalNetLossM3:debit,releaseM3:q,endInventoryM3:v,unallocatedM3:null,residualM3:s+own+up-debit-q-v});
   for(const cell of g.route){const n=nodes.get(cell);n.totalIncrementM3+=q;if(last)n.lastYearIncrementM3[phase]+=q;}
   if(g.target.kind==='unresolved'){incoming.set(g.target.id,(incoming.get(g.target.id)||0)+q);const t=transfers.get(id);t.totalTransferredM3+=q;if(last)t.lastYearTransferredM3[phase]+=q;sent+=q;}
   else{const m=mouths.get(g.target.node);m.totalDeliveredM3+=q;if(last)m.lastYearDeliveredM3[phase]+=q;ocean+=q;}
   start+=s;end+=v;loss+=debit;
  }
  for(const g of d.groups.filter(g=>g.status==='held')){const r=rows.get(g.id),up=incoming.get(g.id)||0,own=g.periodInflowM3[phase],pending=own+up;r.totalReceivedM3+=up;r.totalUnallocatedM3+=pending;unallocated+=pending;received+=up;if(last)r.lastYear.push({period:phase+1,sourceInflowM3:own,receivedM3:up,startInventoryM3:null,additionalNetLossM3:null,releaseM3:null,endInventoryM3:null,unallocatedM3:pending,residualM3:own+up-pending});}
  const residual=start+source-loss-ocean-end-unallocated,transferResidual=sent-received,tol=Math.max(.01,(start+source+sent)*1e-11);
  if(Math.abs(residual)>tol||Math.abs(transferResidual)>tol)throw Error('물수지/전달 수신 검사 실패');
  maxAbsPeriodResidualM3=Math.max(maxAbsPeriodResidualM3,Math.abs(residual));maxAbsTransferResidualM3=Math.max(maxAbsTransferResidualM3,Math.abs(transferResidual));totalSourceInflowM3+=source;totalNetLossM3+=loss;totalOceanDeliveryM3+=ocean;totalUnallocatedM3+=unallocated;
  periods.push({year:Math.floor(k/12)+1,period:phase+1,startInventoryM3:start,sourceInflowM3:source,additionalNetLossM3:loss,oceanDeliveryM3:ocean,newUnallocatedM3:unallocated,endInventoryM3:end,internalTransferredM3:sent,internalReceivedM3:received,transferResidualM3:transferResidual,residualM3:residual});
 }
 const boundaries=[...rows.values()],initialInventoryM3=boundaries.filter(r=>r.status==='eligible').reduce((s,r)=>s+r.initialInventoryM3,0),finalInventoryM3=boundaries.filter(r=>r.status==='eligible').reduce((s,r)=>s+r.finalInventoryM3,0),cumulativeResidualM3=initialInventoryM3+totalSourceInflowM3-totalNetLossM3-totalOceanDeliveryM3-totalUnallocatedM3-finalInventoryM3;
 if(Math.abs(cumulativeResidualM3)>Math.max(.1,(initialInventoryM3+totalSourceInflowM3)*1e-10))throw Error('누적 물수지 검사 실패');
 const count=filter=>boundaries.filter(filter).reduce((s,r)=>s+r.reachCount,0);
 return {schema:'conditional-inland-routing-result/1',status:'conditional-model-only',assumptions:{...o,storageModel:'aggregate-capacity',releaseModel:'instantaneous-capacity-excess',transportModel:'same-period-zero-loss-zero-delay',lossBasis:'additional-net-loss-over-fixed-reference-area',forcing:'repeated-source-12-phase-volumes',heldTreatment:'unallocated-receipts-only-no-physical-storage'},provenance:d.provenance,
 summary:{modelledBoundaries:p.active.length,modelledReaches:count(r=>r.status==='eligible'),heldBoundaries:d.groups.length-p.active.length,heldReaches:count(r=>r.status==='held'),reachesWithOceanPath:count(r=>r.ending.kind==='ocean'),modelledReachesEndingHeld:count(r=>r.status==='eligible'&&r.ending.kind==='held'),releasingBoundaries:boundaries.filter(r=>r.totalReleaseM3>0).length,heldBoundariesReceiving:boundaries.filter(r=>r.status==='held'&&r.totalReceivedM3>0).length,internalEdges:transfers.size,oceanMouths:mouths.size,initialInventoryM3,totalSourceInflowM3,totalNetLossM3,totalOceanDeliveryM3,totalUnallocatedM3,finalInventoryM3,cumulativeResidualM3,maxAbsPeriodResidualM3,maxAbsTransferResidualM3,physicalResolvedReaches:0,physicallyUnresolvedReaches:d.reaches.length},boundaries,nodes:[...nodes.values()],transfers:[...transfers.values()],mouths:[...mouths.values()],periods,automaticAdoption:false,sourceGraphChanged:false,actual:actual()};
}
return {validate,plan,options:Previous.options,run,query:Previous.query};
});
