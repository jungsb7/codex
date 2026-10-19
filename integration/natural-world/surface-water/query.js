(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SurfaceQuery=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function query(D,scenarioId='water-central',year=500,cell=155640){
 const c=D.scenarios.cases.find(c=>c.id===scenarioId);if(!c)throw Error('Unknown scenario');
 const s=c.snapshots.find(s=>s.year===year),j=D.scenarios.cells.indexOf(cell),point=D.geometry.assignments.find(p=>p.cell===cell);if(!s||j<0||!point)throw Error('Unknown snapshot or cell');
 const k=D.geometry.basins.findIndex(b=>b.id===point.basin),result=c.annual[year-1],pool=result.basins[k].pools.find(p=>p.leaves.includes(point.pond))||null;
 return {scenarioId,year,options:c.options,point,result,cellState:{snowWaterEquivalentMm:s.snowMm[j],combinedShallowMm:s.shallowMm[j],modelSurface:s.wet[j]?'water':'land',shallowStatus:s.wet[j]?'retained-inactive-bed':'active-land-store',potentiallyBelowPool:!!(point.insideDepression&&pool&&point.elevationM<pool.levelM)},pool,climate:D.geometry.climate[j],actualIceVolumeM3:null,actualGroundExchangeM3:null,actualWaterLevelM:null,worldHash:D.summary.provenance.worldHash,geometryHash:D.summary.provenance.geometryHash,baselineApplied:false};
}return {query};});
