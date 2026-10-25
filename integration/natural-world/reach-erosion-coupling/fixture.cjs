const F=a=>Float64Array.from(a),cfg=require('../pond-network-model/scenarios.json').common;
function fixture(ns=0){const m={owners:2,lakeNode:0,options:{...cfg,years:1,substeps:12,evaporationMPerYear:0},surface:F([0,0]),start:F([0,1,2]),bed:F([0,0]),area:F([100,100]),nodeOwner:F([0,1]),edgeA:F([0]),edgeB:F([1]),edgeCrest:F([1e9]),edgeWidth:F([.0001]),edgeCoefficient:F([1.5]),background:new Float64Array(24),lakeRain:new Float64Array(12),lakeEvap:new Float64Array(12)};
for(const k of ['p','t','pet'])m[k]=new Float64Array(ns*12);for(const k of ['snow','soil','ground','travel','north','sourceZ'])m[k]=new Float64Array(ns);m.sourceArea=new Float64Array(ns).fill(100);m.sourcePond=F(Array.from({length:ns},(_,j)=>j));m.sourceOwner=m.sourcePond.slice();return m;}

module.exports=fixture;
