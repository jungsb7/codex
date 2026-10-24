'use strict';
const assert=require('node:assert/strict');
function neighbours(i,w,h){const x=i%w,y=Math.floor(i/w),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&y+dy>=0&&y+dy<h)out.push((y+dy)*w+(x+dx+w)%w);return [...new Set(out)].filter(j=>j!==i);}
class Heap {
 constructor(){this.a=[];}
 push(x){const a=this.a;let i=a.length;a.push(x);while(i){const p=(i-1)>>1;if(a[p][0]<x[0]||a[p][0]===x[0]&&a[p][1]<=x[1])break;a[i]=a[p];i=p;}a[i]=x;}
 pop(){const a=this.a,out=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&(a[c+1][0]<a[c][0]||a[c+1][0]===a[c][0]&&a[c+1][1]<a[c][1]))c++;if(last[0]<a[c][0]||last[0]===a[c][0]&&last[1]<=a[c][1])break;a[i]=a[c];i=c;}a[i]=last;}return out;}
}
// Minimax inundation on the native D8 grid. All faces reaching the SAME native downstream terminal become outlet candidates.
// Other catchment/lake/ocean contact bounds
// this boundary model; it is not a newly adopted dam or closed basin.
function domain(a,w,h,{node,crestM,gate,maximumRiseM=5,targetNode=null,coupledNodes=new Set()}){
 assert(Number.isInteger(node)&&Number.isFinite(crestM)&&maximumRiseM>0&&maximumRiseM<=20);
 assert(a.land[node]&&!a.lake[node]&&a.owner[node]===node);
 assert(gate.length===2&&neighbours(gate[0],w,h).includes(gate[1]),'Invalid D8 gate');
 const cap=crestM+maximumRiseM,cost=new Map([[node,a.heights[node]]]),parent=new Map(),heap=new Heap();heap.push([a.heights[node],node]);
 let crossing=null;const outlets=new Map();
 while(heap.a.length){const [level,i]=heap.pop();if(cost.get(i)!==level)continue;if(level>cap||crossing&&level>crossing.levelM)break;
  for(const j of neighbours(i,w,h)){
   const chosenGate=i===gate[0]&&j===gate[1]||i===gate[1]&&j===gate[0];
   const kind=a.lake[j]?'lake':!a.land[j]?'ocean':a.owner[j]!==node?'foreign-catchment':null;
   // Marine/lake contact is a boundary, not a fabricated submerged elevation.
   const next=kind==='ocean'||kind==='lake'?level:Math.max(level,a.heights[j]);
   if(next>cap)continue;
   if(kind&&(kind==='foreign-catchment'&&coupledNodes.has(a.owner[j])||chosenGate||targetNode!==null&&(kind==='foreign-catchment'&&a.owner[j]===targetNode||kind==='ocean'&&j===targetNode))){outlets.set(i+':'+j,{from:i,to:j,crestM:next,kind,targetNode:kind==='foreign-catchment'?a.owner[j]:targetNode});continue;}
   if(chosenGate)continue;
   if(kind){if(!crossing||next<crossing.levelM||next===crossing.levelM&&(i<crossing.from||i===crossing.from&&j<crossing.to))crossing={levelM:next,from:i,to:j,kind,targetNode:kind==='foreign-catchment'?a.owner[j]:null};continue;}
   if(next<(cost.get(j)??Infinity)){cost.set(j,next);parent.set(j,i);heap.push([next,j]);}
  }
 }
 const limitM=crossing?crossing.levelM:cap;
 const cells=[...cost].filter(([,v])=>crossing?v<limitM:v<=limitM).map(([i])=>i).sort((a,b)=>a-b);
 let witness=[];if(crossing){witness=[crossing.from];while(witness.at(-1)!==node){const prev=parent.get(witness.at(-1));assert(prev!==undefined);witness.push(prev);}witness.reverse();witness.push(crossing.to);}
 return {node,crestM,gate,limitM,riseM:limitM-crestM,limitKind:crossing?'first-external-contact':'search-ceiling',exclusive:!!crossing,crossing,witness,cells,
  outlets:[...outlets.values()].filter(e=>crossing?e.crestM<limitM:e.crestM<=limitM).sort((a,b)=>a.from-b.from||a.to-b.to),activation:cells.map(cell=>[cell,cost.get(cell)]),status:limitM>crestM?'positive-head-domain':'no-positive-head-domain'};
}
module.exports={domain,neighbours,Heap};
