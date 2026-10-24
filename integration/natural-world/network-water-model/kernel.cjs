'use strict';
const fluxKeys=['precipitationM3','landEvaporationM3','infiltrationM3','rechargeM3','groundwaterReturnM3','runoffM3','directWaterM3','sublimationM3'];
// Four northern stores remain distinct. Fractional phase rates are exponential;
// one dry substep per phase reproduces the original northern year equation.
function step(p,t,pet,snow,soil,ground,travel,area,wet,north,delivery,inflows,flux,params){
 const [phase,n,soilCap,aquiferCap,infRate,soilYears,groundYears]=params,dt=1/(12*n),gr=-Math.expm1(-dt/groundYears),sr=-Math.expm1(-dt/soilYears),nr=-Math.expm1(-.08/n),ng=-Math.expm1(-1/(6*n*(groundYears/2))),nt=-Math.expm1(-1/(1.5*n));
 for(let j=0;j<snow.length;j++){
  const k=j*12+phase,precip=p[k]/n,temp=t[k],af=area[j]/1000;let s=snow[j],so=soil[j],g=ground[j],tr=travel[j],liquid,ev=0,inf=0,recharge=0,ret=0,runoff=0,direct=0,sub=0,delivered=0;
  if(north[j]){
   const fraction=Math.max(0,Math.min(1,(1-temp)/2));s+=precip*fraction;liquid=precip*(1-fraction);sub=Math.min(s,(3+pet[k]*.05)/n);s-=sub;const melt=Math.min(s,Math.max(0,temp)*3*(365/12)/n);s-=melt;liquid+=melt;
   let fast=0;if(wet[j])direct=liquid;else{inf=liquid*Math.min(1,.8*infRate/1200);fast=liquid-inf;so+=inf;const excess=Math.max(0,so-150);so-=excess;fast+=excess;inf-=excess;ev=Math.min(so,pet[k]/n);so-=ev;}
   recharge=so*nr;so-=recharge;g+=recharge;ret=g*ng;g-=ret;tr+=fast+ret;runoff=tr*nt;tr-=runoff;delivered=runoff+direct;
  }else{
   liquid=temp<0?0:precip;if(temp<0)s+=precip;const melt=Math.min(s,Math.max(0,temp)*540*dt);s-=melt;liquid+=melt;
   ret=g*gr;g-=ret;recharge=Math.min(so*sr,aquiferCap-g);so-=recharge;g+=recharge;
   if(wet[j])direct=liquid;else{const demand=Math.max(temp+5,0)*24*dt,immediate=Math.min(liquid,demand);liquid-=immediate;const fromSoil=Math.min(so,demand-immediate);so-=fromSoil;ev=immediate+fromSoil;inf=Math.min(liquid,infRate*dt,soilCap-so);so+=inf;runoff=liquid-inf;}
   delivered=runoff+direct+ret;
  }
  snow[j]=s;soil[j]=so;ground[j]=g;travel[j]=tr;inflows[delivery[j]]+=delivered*af;
  flux[0]+=precip*af;flux[1]+=(ev+sub)*af;flux[2]+=inf*af;flux[3]+=recharge*af;flux[4]+=ret*af;flux[5]+=runoff*af;flux[6]+=direct*af;flux[7]+=sub*af;
 }
}
module.exports={step,fluxKeys};
