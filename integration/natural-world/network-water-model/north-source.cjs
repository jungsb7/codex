// Byte-for-byte source body from archived application/source/water-tower-core.js; see README.
// Conservative distributed rain/snow/soil/groundwater screening model.
// Climate, soil and travel-time parameters are authored assumptions, not observations.
const WaterTower=(()=>{
 const days=365/12,parameters={soilCapacityMm:150,infiltration:.8,rechargeFraction:1-Math.exp(-.08),groundRelease:1-Math.exp(-1/6),upstreamRelease:1-Math.exp(-1/1.5),meltMmCday:3,sublimationMmMonth:3,spinupYears:60,channelLossFraction:.2,lakeEvaporationM:2};
 function potentialET(temperatures,latitude,tilt){
  const heat=temperatures.reduce((s,t)=>s+(Math.max(0,t)/5)**1.514,0),a=6.75e-7*heat**3-7.71e-5*heat**2+.01792*heat+.49239,rad=Math.PI/180;
  return temperatures.map((t,m)=>{const dec=Math.asin(Math.sin(tilt*rad)*Math.sin(m*Math.PI/6)),day=24/Math.PI*Math.acos(Math.max(-1,Math.min(1,-Math.tan(latitude*rad)*Math.tan(dec))));return t>0?16*(day/12)*(days/30)*(10*t/Math.max(1e-9,heat))**a:0;});
 }
 function year(p,t,pet,initial=[0,0,0,0],options={}){
  const d={...parameters,...options},state=initial.slice(),monthly=[];
  for(let m=0;m<12;m++){
   const before=state.reduce((a,b)=>a+b,0),fraction=Math.max(0,Math.min(1,(1-t[m])/2)),snowfall=p[m]*fraction;let liquid=p[m]-snowfall;state[0]+=snowfall;
   const sublimation=Math.min(state[0],d.sublimationMmMonth+pet[m]*.05);state[0]-=sublimation;
   const melt=Math.min(state[0],Math.max(0,t[m])*d.meltMmCday*days);state[0]-=melt;liquid+=melt;
   let fast=liquid*(1-d.infiltration);state[1]+=liquid*d.infiltration;const excess=Math.max(0,state[1]-d.soilCapacityMm);state[1]-=excess;fast+=excess;
   const evap=Math.min(state[1],pet[m]);state[1]-=evap;const recharge=state[1]*d.rechargeFraction;state[1]-=recharge;state[2]+=recharge;
   const release=state[2]*d.groundRelease;state[2]-=release;const generated=fast+release;state[3]+=generated;
   const runoff=state[3]*d.upstreamRelease;state[3]-=runoff;const change=state.reduce((a,b)=>a+b,0)-before;
   monthly.push({p:p[m],evap,sublimation,snowfall,melt,runoff,generated,change,error:p[m]-evap-sublimation-runoff-change});
  }
  return {state,monthly};
 }
 function cycle(p,t,lat,tilt,options={}){const pet=potentialET(t,lat,tilt);let r={state:[0,0,0,0]};for(let y=0;y<(options.spinupYears||parameters.spinupYears);y++)r=year(p,t,pet,r.state,options);return {...r,pet};}
 return {parameters,potentialET,year,cycle};
})();
if(typeof module!=='undefined')module.exports=WaterTower;
