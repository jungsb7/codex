(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ColdDiagnostics=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const C={yearDays:365,periods:12,secondsPerDay:86400,solarConstantWm2:1361,tiltDegrees:23.4,waterDensityKgM3:1000,iceDensityKgM3:917,latentFusionJKg:334000,latentVaporizationJKg:2450000,iceConductivityWmK:2.2,snowConductivityWmK:.3};
// Same ideal circular-orbit daily-mean TOA expression as the original solarAt.
function solarAt(latitude,phase,tilt=C.tiltDegrees){
 if(![latitude,phase,tilt].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(tilt)>90)throw Error('Invalid solar position');
 const d=Math.PI/180,dec=Math.asin(Math.sin(tilt*d)*Math.sin(phase*d)),phi=latitude*d,a=Math.sin(phi)*Math.sin(dec),b=Math.cos(phi)*Math.cos(dec);let h;if(Math.abs(b)<1e-12)h=a>0?Math.PI:a<0?0:Math.PI/2;else h=Math.acos(Math.max(-1,Math.min(1,-a/b)));
 return {daylightHours:24*h/Math.PI,toaWm2:Math.max(0,C.solarConstantWm2/Math.PI*(h*a+b*Math.sin(h)))};
}
function periodSolar(latitude,period,steps=64){if(!Number.isInteger(period)||period<0||period>11||!Number.isInteger(steps)||steps<1)throw Error('Invalid solar period');let sum=0;for(let i=0;i<steps;i++)sum+=solarAt(latitude,period*30+30*(i+.5)/steps).toaWm2;return sum/steps;}
function annualBalance(temperatures,precipitation,warmingC=0){
 if(temperatures.length!==12||precipitation.length!==12||!temperatures.every(Number.isFinite)||!precipitation.every(p=>Number.isFinite(p)&&p>=0)||!Number.isFinite(warmingC))throw Error('Invalid twelve-period forcing');
 let snowfall=0,meltCapacity=0,freezeDegreeDays=0,thawDegreeDays=0;for(let k=0;k<12;k++){const t=temperatures[k]+warmingC;if(t<0)snowfall+=precipitation[k];meltCapacity+=45*Math.max(0,t);freezeDegreeDays+=Math.max(0,-t)*365/12;thawDegreeDays+=Math.max(0,t)*365/12;}
 return {snowfallMm:snowfall,potentialMeltMm:meltCapacity,asymptoticAccumulationMm:Math.max(0,snowfall-meltCapacity),freezeDegreeDays,thawDegreeDays,maximumTemperatureC:Math.max(...temperatures)+warmingC,minimumTemperatureC:Math.min(...temperatures)+warmingC};
}
function balanceWarmingC(t,p){if(annualBalance(t,p).asymptoticAccumulationMm<=1e-10)return 0;let lo=0,hi=20;if(annualBalance(t,p,hi).asymptoticAccumulationMm>1e-10)return null;for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(annualBalance(t,p,mid).asymptoticAccumulationMm>1e-10)lo=mid;else hi=mid;}return hi;}
// Ideal Stefan conductive freezing, no basal heat and a prescribed constant snow
// blanket. It is a conditional material calculation, not actual lake ice.
function idealIceM(freezeDegreeDays,snowDepthM=0){if(![freezeDegreeDays,snowDepthM].every(Number.isFinite)||freezeDegreeDays<0||snowDepthM<0)throw Error('Invalid freezing assumption');const b=C.iceConductivityWmK/C.snowConductivityWmK*snowDepthM,q=2*C.iceConductivityWmK*freezeDegreeDays*C.secondsPerDay/(C.iceDensityKgM3*C.latentFusionJKg);return q===0?0:q/(Math.sqrt(b*b+q)+b);}
function latentFluxWm2(waterEquivalentMm,latent=C.latentFusionJKg,days=365){if(![waterEquivalentMm,latent,days].every(Number.isFinite)||waterEquivalentMm<0||latent<=0||days<=0)throw Error('Invalid energy demand');return waterEquivalentMm*latent/(days*C.secondsPerDay);}
function capacityThicknessM(volumeM3,areaKm2,porosity){if(![volumeM3,areaKm2,porosity].every(Number.isFinite)||volumeM3<0||areaKm2<=0||porosity<=0||porosity>1)throw Error('Invalid receiving-store geometry');return volumeM3/(areaKm2*1e6*porosity);}
return {C,solarAt,periodSolar,annualBalance,balanceWarmingC,idealIceM,latentFluxWm2,capacityThicknessM};
});
