'use strict';
// D8 minimax: lowest maximum native elevation connecting a root to a target.
// The domain is explicit. This does not infer sub-grid spillways or discharge.
function minimax(columns,width,height,seed){
 const z=new Map(columns.map(c=>[c.cell,c.elevationM]));if(z.size!==columns.length||!z.has(seed)||columns.some(c=>!Number.isFinite(c.elevationM)))throw Error('Invalid minimax domain');
 const cost=new Map([[seed,z.get(seed)]]),parent=new Map(),heap=[];
 const less=(a,b)=>a[0]<b[0]||a[0]===b[0]&&a[1]<b[1];
 function push(v){heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(!less(v,heap[p]))break;heap[i]=heap[p];i=p;}heap[i]=v;}
 function pop(){const v=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let k=i*2+1;if(k+1<heap.length&&less(heap[k+1],heap[k]))k++;if(!less(heap[k],last))break;heap[i]=heap[k];i=k;}heap[i]=last;}return v;}
 push([z.get(seed),seed]);while(heap.length){const [level,i]=pop();if(level!==cost.get(i))continue;const x=i%width,y=Math.floor(i/width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy||y+dy<0||y+dy>=height)continue;const j=(y+dy)*width+(x+dx+width)%width;if(!z.has(j))continue;const next=Math.max(level,z.get(j));if(next<(cost.get(j)??Infinity)){cost.set(j,next);parent.set(j,i);push([next,j]);}}
 }
 return {cost,pathTo(target){if(!cost.has(target))return [];const path=[target];while(path.at(-1)!==seed){if(path.length>z.size)throw Error('Minimax parent cycle');path.push(parent.get(path.at(-1)));}return path.reverse();}};
}
function trace(start,receiver){const path=[],seen=new Set();let i=start;while(i>=0){if(i>=receiver.length||seen.has(i))throw Error('Invalid source route');seen.add(i);path.push(i);i=receiver[i];}return path;}
// Identify cycles when the independently screened outlets are considered together.
// Do not choose a direction or distribute water through such a cycle.
function cycles(rows){const byId=new Map(rows.map(r=>[r.id,r])),done=new Set(),result=[];
 for(const row of rows){if(done.has(row.id))continue;const path=[],index=new Map();let id=row.id;
  while(byId.has(id)&&!done.has(id)){if(index.has(id)){result.push(path.slice(index.get(id)));break;}index.set(id,path.length);path.push(id);id=byId.get(id).outlet?.target?.id;}
  for(const id of path)done.add(id);
 }
 return result;
}
module.exports={minimax,trace,cycles};
