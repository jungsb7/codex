(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MomentumCandidate=factory();})(globalThis,function(){
'use strict';
const schema='two-inlet-momentum-assumption/1';
const rules={froudeLimit:.98,stageToleranceM:1e-10,relativeForceTolerance:1e-8,absoluteForceToleranceN:1e-6,relativePowerTolerance:1e-9};
const numeric=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
const actual=()=>({waterLevelM:null,depthM:null,riverWidthM:null,dischargeM3S:null,floodExtentM2:null,storageM3:null,infiltrationM3S:null,snowDepthM:null,iceExtentM2:null,junctionForceN:null});
function validate(p){
 const e=[];if(!p||typeof p!=='object')return ['명시적 가정 입력이 필요합니다.'];
 if(p.schema!==schema||p.kind!=='explicit-design-assumption')e.push('지원하는 설계 가정 형식이 아닙니다.');
 if(p.alpha!==1||p.beta!==1)e.push('alpha와 beta는 명시적 1이어야 합니다.');
 if(p.closure!=='equal-inlet-water-surface')e.push('두 유입 수면이 같다는 별도 근사 가정을 명시하세요.');
 if(p.controlVolume!=='horizontal-plan-static-boundaries'||p.externalWorkW!==0)e.push('수평 평면·정지 경계·외부 기계 일률0 가정만 지원합니다.');
 if(!numeric(p.gravityMPerS2,1,30)||!numeric(p.densityKgM3,100,2000))e.push('가정 중력1~30m/s²와 밀도100~2000kg/m³가 필요합니다.');
 if(!Array.isArray(p.inlets)||p.inlets.length!==2)return [...e,'유입 단면은 정확히 두 개여야 합니다.'];
 const ids=new Set();
 for(const [i,s]of [...p.inlets,p.outlet].entries()){
  if(!s||typeof s!=='object'){e.push('단면 객체가 필요합니다.');continue;}
  if(typeof s.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(s.id)||ids.has(s.id))e.push('단면 ID는 고유 영문/숫자 식별자여야 합니다.');
  ids.add(s.id);
  if(!numeric(s.widthM,1,10000)||!numeric(s.bedM,-10000,10000)||!numeric(s.bankDepthM,.1,200))e.push(`${s.id}: 폭·바닥·둑의 숫자 범위를 확인하세요.`);
  if(i<2){if(!numeric(s.flowM3S,.001,1e6)||!numeric(s.angleDeg,-85,85)||!numeric(s.comparisonLossM,0,20))e.push(`${s.id}: 양의 유량·각도±85°·비교 손실0~20m가 필요합니다.`);}
  else if(s.flowM3S!==null||s.angleDeg!==0||!numeric(s.depthM,.001,200))e.push('유출 유량null(합산),방향0°,경계 수심이 필요합니다.');
 }
 for(const k of ['wallN','bedPressureN','frictionN'])for(const axis of ['x','y'])if(!numeric(p.forces?.[k]?.[axis],-1e12,1e12))e.push(`forces.${k}.${axis}: 명시적 힘(N)이 필요합니다.`);
 return e;
}
function state(p,s,q,depthM){
 const areaM2=s.widthM*depthM,v=q/areaM2,g=p.gravityMPerS2,rho=p.densityKgM3,angle=s.angleDeg*Math.PI/180;
 const pressureN=rho*g*s.widthM*depthM**2/2,momentumFluxN=rho*q*v;
 return {id:s.id,flowM3S:q,depthM,waterM:s.bedM+depthM,areaM2,velocityMPerS:v,froude:v/Math.sqrt(g*depthM),energyM:s.bedM+depthM+v*v/(2*g),pressureN,momentumFluxN,specificForceM3:(pressureN+momentumFluxN)/(rho*g),direction:{x:Math.cos(angle),y:Math.sin(angle)}};
}
function minDepth(p,s,q){return Math.cbrt(q*q/(p.gravityMPerS2*s.widthM*s.widthM*rules.froudeLimit**2))*(1+1e-10);}
function guard(p,s,q,y){if(y>=s.bankDepthM)return 'bank-limit';if(y<=0||state(p,s,q,y).froude>=rules.froudeLimit)return 'critical-or-supercritical';return null;}
function supplied(p){return ['wallN','bedPressureN','frictionN'].reduce((v,k)=>({x:v.x+p.forces[k].x,y:v.y+p.forces[k].y}),{x:0,y:0});}
function audit(p,inlets,outlet){
 const f=supplied(p),up={x:0,y:0};
 for(const s of inlets)for(const axis of ['x','y'])up[axis]+=(s.pressureN+s.momentumFluxN)*s.direction[axis];
 const down={x:outlet.pressureN+outlet.momentumFluxN,y:0};
 const required={x:down.x-up.x,y:down.y-up.y},residual={x:f.x-required.x,y:f.y-required.y};
 const scale=Math.max(1,Math.abs(down.x),...inlets.map(s=>s.pressureN+s.momentumFluxN),...Object.values(p.forces).flatMap(v=>[Math.abs(v.x),Math.abs(v.y)]));
 const toleranceN=rules.absoluteForceToleranceN+rules.relativeForceTolerance*scale;
 const powerInW=p.densityKgM3*p.gravityMPerS2*inlets.reduce((v,s)=>v+s.flowM3S*s.energyM,0),powerOutW=p.densityKgM3*p.gravityMPerS2*outlet.flowM3S*outlet.energyM;
 const requiredDissipationW=p.densityKgM3*p.gravityMPerS2*inlets.reduce((v,s)=>v+s.flowM3S*(s.energyM-outlet.energyM),0);
 // Datum-invariant tolerance uses depths and velocity heads, not absolute bed elevations.
 const energyScale=p.densityKgM3*p.gravityMPerS2*Math.max(1,...[...inlets,outlet].map(s=>s.flowM3S*(s.depthM+s.velocityMPerS**2/(2*p.gravityMPerS2))));
 const energyToleranceW=rules.relativePowerTolerance*energyScale;
 return {massResidualM3S:inlets.reduce((v,s)=>v+s.flowM3S,0)-outlet.flowM3S,suppliedForceN:f,requiredForceN:required,additionalForceRequiredN:{x:-residual.x||0,y:-residual.y||0},momentumResidualN:residual,forceToleranceN:toleranceN,momentumPassed:Math.abs(residual.x)<=toleranceN&&Math.abs(residual.y)<=toleranceN,energy:{powerInW,powerOutW,externalWorkW:0,requiredDissipationW,toleranceW:energyToleranceW,nonnegativeWithinTolerance:requiredDissipationW>=-energyToleranceW,branchHeadDifferencesM:inlets.map(s=>({id:s.id,headM:s.energyM-outlet.energyM})),interpretation:'total mechanical energy feasibility only; dissipation is inferred, not a calibrated loss law'}};
}
function root(lo,hi,fn){
 if(lo>=hi)return {reason:'no-shared-subcritical-bank-domain'};
 if(fn(lo)>0)return {reason:'critical-domain-limit'};
 if(fn(hi)<0)return {reason:'bank-domain-limit'};
 let iterations=0;
 while(hi-lo>rules.stageToleranceM&&iterations++<100){const m=(lo+hi)/2;if(fn(m)>0)hi=m;else lo=m;}
 return {value:(lo+hi)/2,iterations,bracketM:[lo,hi]};
}
function energyComparison(p,outlet){
 const states=[];
 for(const s of p.inlets){
  const target=outlet.energyM+s.comparisonLossM,r=root(minDepth(p,s,s.flowM3S),s.bankDepthM*(1-1e-10),y=>state(p,s,s.flowM3S,y).energyM-target);
  if(r.reason)return {status:'held',reason:r.reason,at:s.id,states:[],audit:null,automaticAdoption:false};
  states.push(state(p,s,s.flowM3S,r.value));
 }
 return {status:'computed-comparison',method:'phase29 local relation Ei=Eout+prescribedLoss; no network integration',states,audit:audit(p,states,outlet),automaticAdoption:false};
}
function solve(p){
 const inputErrors=validate(p),r={schema:'two-inlet-momentum-candidate/1',input:p??null,status:'invalid-input',reason:null,inputErrors,method:{...rules,closure:'equal-inlet-water-surface',horizontalVectorAudit:true,spatial2DSolver:false},trial:null,accepted:null,energyComparison:null,actual:actual(),physicalResolvedReaches:0,unresolvedReaches:23022,automaticAdoption:false,coupledRoutingReady:false,priorTailwaterHeldCases:108,priorAlternateLimitCases:14};
 if(inputErrors.length)return r;
 const Q=p.inlets.reduce((v,s)=>v+s.flowM3S,0),outlet=state(p,p.outlet,Q,p.outlet.depthM),why=guard(p,p.outlet,Q,p.outlet.depthM);
 if(why){r.status='held-boundary';r.reason=why;return r;}
 r.energyComparison=energyComparison(p,outlet);
 const low=Math.max(...p.inlets.map(s=>s.bedM+minDepth(p,s,s.flowM3S))),high=Math.min(...p.inlets.map(s=>s.bedM+s.bankDepthM*(1-1e-10))),f=supplied(p),scale=p.densityKgM3*p.gravityMPerS2;
 const fn=eta=>p.inlets.reduce((v,s)=>{const a=state(p,s,s.flowM3S,eta-s.bedM);return v+a.specificForceM3*a.direction.x;},0)+f.x/scale-outlet.specificForceM3;
 const solved=root(low,high,fn);
 if(solved.reason){r.status='held-domain';r.reason=solved.reason;return r;}
 const states=p.inlets.map(s=>state(p,s,s.flowM3S,solved.value-s.bedM)),a=audit(p,states,outlet);
 r.trial={commonInletWaterM:solved.value,root:solved,inlets:states,outlet,audit:a};
 if(!a.momentumPassed){r.status='held-momentum';r.reason='unbalanced-external-force';}
 else if(!a.energy.nonnegativeWithinTolerance){r.status='held-energy';r.reason='external-work-or-other-assumption-needed';}
 else{r.status='completed';r.accepted={commonInletWaterM:solved.value,inlets:states,outlet};}
 return r;
}
return {schema,rules,validate,state,audit,minDepth,solve};
});
