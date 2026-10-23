(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.DownstreamRouting=factory();})(globalThis,function(){
'use strict';
const actual=()=>({storageM3:null,infiltrationM3:null,evaporationM3:null,overflowM3:null,waterLevelM:null});
function validate(d){
 if(d?.schema!=='ocean-boundary-routing/1'||!Array.isArray(d.groups)||!Array.isArray(d.reaches))throw Error('자료 형식이 다릅니다.');
 const ids=new Set(),edges=new Map();
 for(const g of d.groups){
  if(ids.has(g.id))throw Error('중복 경계');ids.add(g.id);
  if(g.status==='eligible'){
   if(!(g.capacityM3>0)||!Number.isFinite(g.capacityM3)||!(g.referenceAreaM2>0)||!Number.isFinite(g.referenceAreaM2)||g.periodInflowM3?.length!==12||g.periodInflowM3.some(v=>!Number.isFinite(v)||v<0))throw Error('잘못된 경계 입력');
   if(!g.route?.length||new Set(g.route).size!==g.route.length||g.route.some(n=>!Number.isInteger(n)||n<0)||g.route.at(-1)!==g.oceanCell)throw Error('잘못된 해양 경로');
   for(let k=0;k<g.route.length;k++){const n=g.route[k],next=g.route[k+1]??null;if(edges.has(n)&&edges.get(n)!==next)throw Error('충돌하는 하류 연결');edges.set(n,next);}
  }else if(g.status!=='held'||!g.reasons?.length)throw Error('보류 근거 없음');
 }
 const reaches=new Set();for(const [id,boundary]of d.reaches){if(!Number.isInteger(id)||id<0||reaches.has(id)||!ids.has(boundary))throw Error('잘못된 물길 대응');reaches.add(id);}
 return d;
}
function options(o){if(!o||!Number.isInteger(o.years)||o.years<1||o.years>100||!Number.isFinite(o.lossMPerYear)||o.lossMPerYear<0||o.lossMPerYear>20||!Number.isFinite(o.initialFraction)||o.initialFraction<0||o.initialFraction>1)throw Error('반복 년수1~100, 추가 순손실0~20, 초기 재고 비율0~1을 모두 입력하세요.');return o;}
function run(data,input){
 const d=validate(data),o=options(input),eligible=d.groups.filter(g=>g.status==='eligible'),nodes=new Map(),mouths=new Map(),periods=[];
 for(const g of eligible)for(const cell of g.route)if(!nodes.has(cell))nodes.set(cell,{cell,totalIncrementM3:0,lastYearIncrementM3:Array(12).fill(0)});
 const rows=eligible.map(g=>({id:g.id,reachCount:g.reachCount,oceanCell:g.oceanCell,capacityM3:g.capacityM3,initialInventoryM3:g.capacityM3*o.initialFraction,finalInventoryM3:g.capacityM3*o.initialFraction,totalInflowM3:0,totalNetLossM3:0,totalReleaseM3:0,firstRelease:null,lastYear:[],actual:actual()}));
 let totalInflowM3=0,totalNetLossM3=0,totalOceanDeliveryM3=0,maxAbsPeriodResidualM3=0;
 for(let k=0;k<o.years*12;k++){
  const p=k%12,last=k>=(o.years-1)*12;let start=0,inflow=0,loss=0,release=0,end=0;const delivered=new Map();
  for(let j=0;j<eligible.length;j++){
   const g=eligible[j],r=rows[j],s=r.finalInventoryM3,i=g.periodInflowM3[p],debit=Math.min(s+i,g.referenceAreaM2*o.lossMPerYear/12),q=Math.max(0,s+i-debit-g.capacityM3),v=Math.min(g.capacityM3,s+i-debit);
   r.finalInventoryM3=v;r.totalInflowM3+=i;r.totalNetLossM3+=debit;r.totalReleaseM3+=q;
   if(q>0&&!r.firstRelease)r.firstRelease={year:Math.floor(k/12)+1,period:p+1};
   if(last)r.lastYear.push({period:p+1,startInventoryM3:s,inflowM3:i,additionalNetLossM3:debit,releaseM3:q,endInventoryM3:v,residualM3:s+i-debit-q-v});
   // Every source release visits each downstream cell once. Shared paths sum
   // increments; only terminal receipts count towards the global water budget.
   for(const cell of g.route){const n=nodes.get(cell);n.totalIncrementM3+=q;if(last)n.lastYearIncrementM3[p]+=q;}
   delivered.set(g.oceanCell,(delivered.get(g.oceanCell)||0)+q);
   start+=s;inflow+=i;loss+=debit;release+=q;end+=v;
  }
  let ocean=0;for(const[cell,volume]of delivered){ocean+=volume;if(!mouths.has(cell))mouths.set(cell,{cell,totalDeliveredM3:0,lastYearDeliveredM3:Array(12).fill(0)});const m=mouths.get(cell);m.totalDeliveredM3+=volume;if(last)m.lastYearDeliveredM3[p]+=volume;}
  const residual=start+inflow-loss-ocean-end,tolerance=Math.max(.01,(start+inflow)*1e-11);
  if(Math.abs(residual)>tolerance||Math.abs(release-ocean)>tolerance)throw Error('물수지 검사 실패');
  maxAbsPeriodResidualM3=Math.max(maxAbsPeriodResidualM3,Math.abs(residual));totalInflowM3+=inflow;totalNetLossM3+=loss;totalOceanDeliveryM3+=ocean;
  periods.push({year:Math.floor(k/12)+1,period:p+1,startInventoryM3:start,inflowM3:inflow,additionalNetLossM3:loss,oceanDeliveryM3:ocean,endInventoryM3:end,residualM3:residual});
 }
 const initialInventoryM3=rows.reduce((s,r)=>s+r.initialInventoryM3,0),finalInventoryM3=rows.reduce((s,r)=>s+r.finalInventoryM3,0),cumulativeResidualM3=initialInventoryM3+totalInflowM3-totalNetLossM3-totalOceanDeliveryM3-finalInventoryM3;
 if(Math.abs(cumulativeResidualM3)>Math.max(.1,(initialInventoryM3+totalInflowM3)*1e-10))throw Error('누적 물수지 검사 실패');
 return {schema:'conditional-ocean-routing-result/1',status:'conditional-model-only',assumptions:{...o,storageModel:'aggregate-capacity',releaseModel:'instantaneous-capacity-excess',transportModel:'same-period-zero-loss-zero-delay',lossBasis:'additional-net-loss-over-fixed-reference-area',forcing:'repeated-source-12-phase-volumes'},provenance:d.provenance,
 summary:{modelledBoundaries:rows.length,modelledReaches:rows.reduce((s,r)=>s+r.reachCount,0),heldBoundaries:d.groups.length-rows.length,heldReaches:d.reaches.length-rows.reduce((s,r)=>s+r.reachCount,0),releasingBoundaries:rows.filter(r=>r.totalReleaseM3>0).length,oceanMouths:mouths.size,initialInventoryM3,totalInflowM3,totalNetLossM3,totalOceanDeliveryM3,finalInventoryM3,cumulativeResidualM3,maxAbsPeriodResidualM3,physicalResolvedReaches:0,physicallyUnresolvedReaches:d.reaches.length},
 boundaries:rows,nodes:[...nodes.values()],mouths:[...mouths.values()],periods,automaticAdoption:false,sourceGraphChanged:false,actual:actual()};
}
function query(d,term){const q=String(term).trim(),id=/^\d+$/.test(q)?d.reaches.find(r=>r[0]===+q)?.[1]:q;return d.groups.find(g=>g.id===id)||null;}
return {validate,options,run,query};
});
