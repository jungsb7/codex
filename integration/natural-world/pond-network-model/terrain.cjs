'use strict';
const assert=require('node:assert/strict');
function neighbours(i,w,h){const x=i%w,y=Math.floor(i/w),out=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dx||dy)&&y+dy>=0&&y+dy<h)out.push((y+dy)*w+(x+dx+w)%w);return out;}
// Split native terrain into monotone drainage leaves within each original owner.
// Equal-height flats receive one deterministic exit and an acyclic BFS tree.
function partition(cells,z,owner,w,h,distance){
 const selected=new Uint8Array(w*h),flat=new Int32Array(w*h).fill(-1),receiver=new Int32Array(w*h).fill(-2),label=new Int32Array(w*h).fill(-1);for(const c of cells)selected[c]=1;
 let flatId=0;for(const start of cells){if(flat[start]>=0)continue;const q=[start];flat[start]=flatId;for(let k=0;k<q.length;k++)for(const j of neighbours(q[k],w,h))if(selected[j]&&flat[j]<0&&owner[j]===owner[start]&&z[j]===z[start]){flat[j]=flatId;q.push(j);}
  let exit=null;for(const i of q)for(const j of neighbours(i,w,h)){if(!selected[j]||owner[j]!==owner[i]||z[j]>=z[i])continue;const slope=(z[i]-z[j])/distance(i,j);if(!exit||slope>exit.slope||slope===exit.slope&&(j<exit.j||j===exit.j&&i<exit.i))exit={i,j,slope};}
  const seed=exit?.i??Math.min(...q),queue=[seed];receiver[seed]=exit?.j??-1;for(let k=0;k<queue.length;k++)for(const j of neighbours(queue[k],w,h))if(flat[j]===flatId&&receiver[j]===-2){receiver[j]=queue[k];queue.push(j);}assert.equal(queue.length,q.length);flatId++;
 }
 for(const start of cells){if(label[start]>=0)continue;let i=start;const route=[];while(label[i]<0&&receiver[i]!==-1){route.push(i);i=receiver[i];assert(route.length<=cells.length);}const sink=label[i]>=0?label[i]:i;label[i]=sink;for(const j of route)label[j]=sink;}
 const groups=new Map();for(const cell of cells){const id=label[cell];if(!groups.has(id))groups.set(id,[]);groups.get(id).push(cell);}return {label,receiver,groups};
}
module.exports={neighbours,partition};
