'use strict';
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict'),I=require('../internal-pond-model/input.cjs'),Q=require('../internal-pond-model/query.cjs'),K=require('../internal-pond-model/codec.js'),S=require('../seasonal-physical-model/query.cjs'),C=require('../core.js'),assumptions=require('./assumptions.json'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function prepare(steps,motion=true){
 const v=I.input(32,steps,true),o=v.input,ns=v.g.unknown.length,np=v.meta.nodes.length,end=Q.verified(Q.manifest.finalState),source=K.decode(end.fields.sources,ns*4);
 assert.deepEqual(end.sourceCells,v.g.unknown);assert.equal(end.modelYear,101);
 for(let j=0;j<ns;j++)for(const [k,name]of ['snow','soil','ground','travel'].entries())o[name][j]=source[j*4+k];o.surface=K.decode(end.fields.surface,np);o.options.years=assumptions.years;
 o.ice=new Float64Array(ns);o.soilTemperature=new Float64Array(ns);o.surfaceIce=new Float64Array(np);o.nodeTemperature=new Float64Array(np*12);o.cryoParameters={...assumptions,motionMultiplier:motion?1:0};
 for(let j=0;j<ns;j++)for(let k=0;k<12;k++)o.soilTemperature[j]+=o.t[j*12+k]/12;
 const sourceIndex=new Map(v.g.unknown.map((c,j)=>[c,j])),climate=S.base(),nodeArea=new Float64Array(np),cellNode=new Map(v.meta.cells.map((c,j)=>[c,v.meta.cellNodes[j]]));
 for(let j=0;j<v.g.cells.length;j++)nodeArea[cellNode.get(v.g.cells[j])]+=v.g.columns.areaM2[j];
 for(let k=0;k<12;k++){const spec=S.manifest.periods[k].forcing,bytes=S.verified(spec);for(let j=0;j<v.g.cells.length;j++){const c=v.g.cells[j],n=cellNode.get(c),si=sourceIndex.get(c),ci=climate.index[c];assert(ci>=0);const temp=si===undefined?bytes.readFloatLE(ci*4):o.t[si*12+k];o.nodeTemperature[n*12+k]+=temp*v.g.columns.areaM2[j]/nodeArea[n];}}
 const a=[],b=[],length=[],width=[],w=1536,h=768,R=6371000;
 for(let j=0;j<ns;j++){const cell=v.g.unknown[j],x=cell%w,y=Math.floor(cell/w);for(const other of [y*w+(x+1)%w,...(y+1<h?[cell+w]:[])]){const receiver=sourceIndex.get(other);if(receiver===undefined)continue;const vertical=other>=cell+w,lat=(90-(y+(vertical?1:.5))*180/h)*Math.PI/180;a.push(j);b.push(receiver);length.push(C.distance(C.ll(w,h,cell),C.ll(w,h,other))*1000);width.push(vertical?R*2*Math.PI/w*Math.cos(lat):R*Math.PI/h);}}
 o.iceEdgeA=Float64Array.from(a);o.iceEdgeB=Float64Array.from(b);o.iceEdgeLength=Float64Array.from(length);o.iceEdgeWidth=Float64Array.from(width);assert(o.iceEdgeLength.every(x=>x>0));
 return {...v,input:o,meta:{...v.meta,sourceCells:v.g.unknown,sourceAreaM2:Array.from(o.sourceArea),sourceOwner:Array.from(o.sourceOwner),iceGraph:{a,b,lengthM:length,widthM:width},nodeAreaM2:Array.from(nodeArea)},provenance:{...v.provenance,phase50FinalState:Q.manifest.finalState,initialModelYear:101,assumptions,sourceForcing:'Existing phase50 exact source temperature/precipitation; original phase43 float32 temperature for background/lake cells',temperatureFiles:S.manifest.periods.map(p=>p.forcing)}};
}
module.exports={prepare,hash};
