(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ConfluenceCandidate=factory();})(globalThis,function(){
'use strict';
const schema='rectangular-tree-assumption/1';
const rules={maxStepM:50,maxSteps:100000,froudeLimit:.98,maxBedGradient:.01,maxHalfWidthGradient:.05,maxDepthGradient:.05,rootToleranceM:1e-10};
const actual=()=>({waterLevelM:null,depthM:null,riverWidthM:null,dischargeM3S:null,floodExtentM2:null,storageM3:null,infiltrationM3S:null,snowDepthM:null,iceExtentM2:null});
const numeric=(x,lo,hi)=>typeof x==='number'&&Number.isFinite(x)&&x>=lo&&x<=hi;
function validate(p){
 const e=[];if(!p||typeof p!=='object')return ['가정 입력이 필요합니다.'];
 if(p.schema!==schema||p.kind!=='explicit-design-assumption')e.push('명시적 설계 가정 형식이 필요합니다.');
 if(p.alpha!==1||p.junctionModel!=='prescribed-loss-energy'||p.momentumAssumption!=='angle-effects-excluded-not-solved')e.push('alpha=1, prescribed-loss-energy, 운동량 미계산 가정을 명시하세요.');
 if(!numeric(p.gravityMPerS2,1,30))e.push('gravityMPerS2: 1~30 숫자가 필요합니다.');
 if(!p.downstream||!numeric(p.downstream.depthM,.001,200))e.push('하류 경계 수심이 필요합니다.');
 if(!Array.isArray(p.reaches)||p.reaches.length<1||p.reaches.length>31)return [...e,'구간은 1~31개여야 합니다.'];
 const ids=new Set(),map=new Map();
 for(const r of p.reaches){
  if(!r||typeof r!=='object'){e.push('구간 객체가 필요합니다.');continue;}
  if(typeof r.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(r.id)||ids.has(r.id))e.push('구간 ID는 고유한 영문/숫자 식별자여야 합니다.');
  ids.add(r.id);map.set(r.id,r);
  for(const k of ['contractionCoefficient','expansionCoefficient'])if(!numeric(r[k],0,1))e.push(`${r.id}.${k}: 0~1 숫자가 필요합니다.`);
  if(r.downstreamId===null){if(r.junctionLossM!==null||r.junctionAngleDeg!==null)e.push('말단 구간의 합류 손실/각도는 명시적 null이어야 합니다.');}
  else{
   if(typeof r.downstreamId!=='string')e.push('하류 ID 또는 명시적 null이 필요합니다.');
   if(!numeric(r.junctionLossM,0,20)||!numeric(r.junctionAngleDeg,-180,180))e.push(`${r.id}: 합류 손실 0~20m와 각도가 필요합니다.`);
  }
  if(!Array.isArray(r.sections)||r.sections.length<2||r.sections.length>64){e.push(`${r.id}: 단면 2~64개가 필요합니다.`);continue;}
  for(let i=0;i<r.sections.length;i++){
   const s=r.sections[i];
   if(!s||!numeric(s.xM,0,1e6)||!numeric(s.bedM,-10000,10000)||!numeric(s.widthM,1,10000)||!numeric(s.bankDepthM,.1,200)||!numeric(s.manningN,.005,.2)){e.push(`${r.id}: 단면 거리/바닥/폭/둑/조도의 숫자 범위를 확인하세요.`);continue;}
   if(i===0&&s.xM!==0)e.push(`${r.id}: 상류 단면 거리는 0에서 시작합니다.`);
   if(i>0&&s.xM-r.sections[i-1]?.xM<1)e.push(`${r.id}: 하류 방향 단면 간격은 최소 1m입니다.`);
  }
 }
 if(e.length)return e;
 const roots=p.reaches.filter(r=>r.downstreamId===null);
 if(roots.length!==1||roots[0].id!==p.downstream?.reachId)e.push('유일한 말단과 하류 경계 ID가 일치해야 합니다.');
 for(const r of p.reaches){
  if(r.downstreamId!==null&&!map.has(r.downstreamId))e.push(`${r.id}: 없는 하류 구간입니다.`);
  const children=p.reaches.filter(c=>c.downstreamId===r.id);
  if(children.length===0){if(!numeric(r.inflowM3S,.001,1e6))e.push(`${r.id}: 최상류 유량이 필요합니다.`);}
  else if(r.inflowM3S!==null)e.push(`${r.id}: 합류 뒤 유량은 null이어야 합니다. 지류 유량만 합산합니다.`);
  const seen=new Set();let at=r;
  while(at){if(seen.has(at.id)){e.push('순환/자기 연결은 지원하지 않습니다.');break;}seen.add(at.id);at=map.get(at.downstreamId);}
 }
 return e;
}
function properties(s,q,g,y){
 const areaM2=s.widthM*y,hydraulicRadiusM=areaM2/(s.widthM+2*y),velocityMPerS=q/areaM2,velocityHeadM=velocityMPerS**2/(2*g);
 return {depthM:y,areaM2,hydraulicRadiusM,velocityMPerS,velocityHeadM,froude:Math.sqrt(2*velocityHeadM/y),frictionSlope:(s.manningN*q/(areaM2*hydraulicRadiusM**(2/3)))**2,waterM:s.bedM+y,energyM:s.bedM+y+velocityHeadM};
}
function frLimit(c){return Math.min(rules.froudeLimit,Math.sqrt(.99/(1+c)));}
function guard(s,q,g,y,c=0){
 if(!Number.isFinite(y)||y<=0)return 'invalid-depth';
 if(y>=s.bankDepthM)return 'bank-limit';
 if(properties(s,q,g,y).froude>=frLimit(c))return 'critical-or-coefficient-limit';
 return null;
}
function bracket(s,q,g,c,fn){
 // On this restricted branch F'(y) >= 1-(1+c)Fr² >= .01.
 let lo=Math.cbrt((q/s.widthM)**2/(g*frLimit(c)**2))*(1+1e-10),hi=s.bankDepthM*(1-1e-10);
 if(lo>=hi)return {reason:'no-subcritical-bank-domain'};
 const a=fn(lo),b=fn(hi);
 if(!Number.isFinite(a)||!Number.isFinite(b))return {reason:'nonfinite-energy'};
 if(a>0)return {reason:'critical-or-coefficient-limit'};
 if(b<0)return {reason:'bank-limit'};
 for(let i=0;i<80&&hi-lo>rules.rootToleranceM;i++){const m=(lo+hi)/2;if(fn(m)>0)hi=m;else lo=m;}
 const depthM=(lo+hi)/2,residualM=fn(depthM);
 if(Math.abs(residualM)>1e-7)return {reason:'energy-residual'};
 return {depthM,residualM};
}
function interpolate(a,b,t){return Object.fromEntries(['xM','bedM','widthM','bankDepthM','manningN'].map(k=>[k,a[k]+(b[k]-a[k])*t]));}
function sectionStep(up,down,q,g,yd,r){
 const L=down.xM-up.xM,d=properties(down,q,g,yd);
 const terms=y=>{
  const u=properties(up,q,g,y),dv=d.velocityHeadM-u.velocityHeadM;
  const coefficient=dv>=0?r.contractionCoefficient:r.expansionCoefficient;
  const frictionLossM=L*(u.frictionSlope+d.frictionSlope)/2,localLossM=coefficient*Math.abs(dv);
  return {u,frictionLossM,localLossM,residualM:u.energyM-d.energyM-frictionLossM-localLossM};
 };
 const c=Math.max(r.contractionCoefficient,r.expansionCoefficient);
 const root=bracket(up,q,g,c,y=>terms(y).residualM);
 if(root.reason)return root;
 if(Math.abs(root.depthM-yd)/L>rules.maxDepthGradient)return {reason:'rapid-depth-change'};
 return {...root,...terms(root.depthM)};
}
function solve(input,options={}){
 const inputErrors=validate(input),maxStepM=options.maxStepM??rules.maxStepM;
 const out={schema:'rectangular-tree-candidate/1',input:input??null,status:'invalid-input',inputErrors,flowLedger:[],reaches:[],junctions:[],summary:null,method:{...rules,maxStepM,name:'upstream standard step; prescribed junction head losses',alpha:1,momentumSolved:false},actual:actual(),physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false,coupledRoutingReady:false,priorTailwaterHeldCases:108,priorAlternateLimitCases:14};
 if(inputErrors.length)return out;
 if(!numeric(maxStepM,1,200))throw Error('maxStepM must be 1..200 m');
 const p=input,g=p.gravityMPerS2,map=new Map(p.reaches.map(r=>[r.id,r])),children=id=>p.reaches.filter(r=>r.downstreamId===id),flows=new Map();
 function flow(id){const r=map.get(id),cs=children(id),leafIds=cs.length?cs.flatMap(c=>flow(c.id).leafIds):[id],q=cs.length?cs.reduce((v,c)=>v+flows.get(c.id).flowM3S,0):r.inflowM3S;const row={reachId:id,leafIds,flowM3S:q,source:'assumed-leaf-inflows-once'};flows.set(id,row);out.flowLedger.push(row);return row;}
 flow(p.downstream.reachId);let steps=0;
 function block(id,reason){out.reaches.push({id,flowM3S:flows.get(id).flowM3S,status:'blocked',stop:{reason},profile:[],upstreamDepthM:null,totalLossM:null});for(const c of children(id))block(c.id,'downstream-incomplete');}
 function reach(id,yd){
  const r=map.get(id),q=flows.get(id).flowM3S,last=r.sections.at(-1),cmax=Math.max(r.contractionCoefficient,r.expansionCoefficient),result={id,flowM3S:q,status:'completed',stop:null,profile:[],upstreamDepthM:null,totalLossM:null};
  out.reaches.push(result);let loss=0,y=yd,why=guard(last,q,g,y,cmax);
  const add=s=>result.profile.push({...s,...properties(s,q,g,y),flowM3S:q,upstreamDistanceM:last.xM-s.xM,cumulativeLossM:loss});
  if(why){result.status='held-boundary';result.stop={reason:why};}
  else{
   add(last);
   outer:for(let i=r.sections.length-2;i>=0;i--){
    const a=r.sections[i],b=r.sections[i+1],length=b.xM-a.xM;
    const geometryReason=Math.abs(b.bedM-a.bedM)/length>rules.maxBedGradient?'steep-bed':Math.abs(b.widthM-a.widthM)/(2*length)>rules.maxHalfWidthGradient?'rapid-width-change':null;
    if(geometryReason){result.status='stopped';result.stop={reason:geometryReason,intervalXM:[a.xM,b.xM]};break;}
    const count=Math.ceil(length/maxStepM);let down=b;
    for(let k=count-1;k>=0;k--){
     const up=interpolate(a,b,k/count);
     if(++steps>rules.maxSteps){result.status='stopped';result.stop={reason:'step-limit',intervalXM:[up.xM,down.xM]};break outer;}
     const step=sectionStep(up,down,q,g,y,r);
     if(step.reason){result.status='stopped';result.stop={reason:step.reason,intervalXM:[up.xM,down.xM]};break outer;}
     y=step.depthM;loss+=step.frictionLossM+step.localLossM;add(up);
     Object.assign(result.profile.at(-1),{stepFrictionLossM:step.frictionLossM,stepLocalLossM:step.localLossM,stepEnergyResidualM:step.residualM});
     down=up;
    }
   }
  }
  if(result.status==='completed'){result.upstreamDepthM=y;result.totalLossM=loss;}
  const cs=children(id);if(!cs.length)return;
  if(result.status!=='completed'){for(const c of cs)block(c.id,'downstream-incomplete');return;}
  const state=result.profile.at(-1),junction={downstreamReachId:id,status:'completed',branches:[],flowInM3S:cs.reduce((sum,c)=>sum+flows.get(c.id).flowM3S,0),flowOutM3S:q,massResidualM3S:null,energyResidualM4S:null,lossFluxM4S:null,momentumResidual:null,momentumSolved:false};
  for(const c of cs){
   const cq=flows.get(c.id).flowM3S,s=c.sections.at(-1),target=state.energyM+c.junctionLossM;
   const root=c.junctionAngleDeg!==0?{reason:'angle-momentum-unsupported'}:bracket(s,cq,g,Math.max(c.contractionCoefficient,c.expansionCoefficient),depth=>properties(s,cq,g,depth).energyM-target);
   junction.branches.push({reachId:c.id,flowM3S:cq,assumedLossM:c.junctionLossM,targetEnergyM:target,depthM:root.depthM??null,energyM:root.depthM===undefined?null:properties(s,cq,g,root.depthM).energyM,headResidualM:root.residualM??null,reason:root.reason??null});
  }
  junction.massResidualM3S=junction.flowInM3S-q;
  if(junction.branches.some(b=>b.reason)){junction.status='held';for(const c of cs)block(c.id,'junction-incomplete');}
  else{
   junction.lossFluxM4S=junction.branches.reduce((v,b)=>v+b.flowM3S*b.assumedLossM,0);
   junction.energyResidualM4S=junction.branches.reduce((v,b)=>v+b.flowM3S*b.energyM,0)-q*state.energyM-junction.lossFluxM4S;
  }
  out.junctions.push(junction);
  if(junction.status==='completed')for(const b of junction.branches)reach(b.reachId,b.depthM);
 }
 reach(p.downstream.reachId,p.downstream.depthM);
 out.status=out.reaches.every(r=>r.status==='completed')?'completed':out.reaches[0].status==='held-boundary'?'held-boundary':'stopped';
 const root=out.reaches[0],leaves=out.reaches.filter(r=>!children(r.id).length);
 out.summary={outflowM3S:flows.get(p.downstream.reachId).flowM3S,leafCount:leaves.length,completedReaches:out.reaches.filter(r=>r.status==='completed').length,totalReaches:p.reaches.length,computedSteps:steps,maxStepEnergyResidualM:Math.max(0,...out.reaches.flatMap(r=>r.profile.map(s=>Math.abs(s.stepEnergyResidualM??0)))),globalEnergyResidualM4S:null,totalLossFluxM4S:null};
 if(out.status==='completed'){
  const losses=out.reaches.reduce((v,r)=>v+r.flowM3S*r.totalLossM,0)+out.junctions.reduce((v,j)=>v+j.lossFluxM4S,0);
  out.summary.totalLossFluxM4S=losses;
  out.summary.globalEnergyResidualM4S=leaves.reduce((v,r)=>v+r.flowM3S*r.profile.at(-1).energyM,0)-root.flowM3S*root.profile[0].energyM-losses;
 }
 return out;
}
return {schema,rules,validate,properties,frLimit,solve};
});
