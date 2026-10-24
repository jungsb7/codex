'use strict';
// Independent, intentionally slow small-system reference: direct native-column
// sums and bisection, not the compiled engine's prefix moments or Newton steps.
const assert=require('node:assert/strict');
function curve(bed,area){return {volume:level=>bed.reduce((s,z,i)=>s+Math.max(0,level-z)*area[i],0),level(volume){let lo=Math.min(...bed),hi=Math.max(...bed)+volume/Math.min(...area)+1;for(let k=0;k<80;k++){const mid=(lo+hi)/2,v=this.volume(mid);if(v>volume)hi=mid;else lo=mid;}return (lo+hi)/2;}};}
function step(curves,edges,available,seconds){let v=[...available],levels=v.map((x,i)=>curves[i].level(x));const rating=(e,a,b)=>e.width*e.coefficient*(Math.max(0,a-e.crest)**1.5-Math.max(0,b-e.crest)**1.5);for(let sweep=0;sweep<3000;sweep++){for(let i=0;i<v.length;i++){const adjacent=edges.filter(e=>e.a===i||e.b===i),supply=available[i]+seconds*adjacent.reduce((s,e)=>{const other=e.a===i?e.b:e.a;return s+e.width*e.coefficient*Math.max(0,(other<0?0:levels[other])-e.crest)**1.5;},0);let lo=0,hi=supply;for(let k=0;k<75;k++){const mid=(lo+hi)/2,l=curves[i].level(mid),f=mid+seconds*adjacent.reduce((s,e)=>s+e.width*e.coefficient*Math.max(0,l-e.crest)**1.5,0);if(f>supply)hi=mid;else lo=mid;}v[i]=(lo+hi)/2;levels[i]=curves[i].level(v[i]);}
 const transfer=edges.map(e=>seconds*rating(e,levels[e.a],e.b<0?0:levels[e.b])),balance=[...available];edges.forEach((e,k)=>{balance[e.a]-=transfer[k];if(e.b>=0)balance[e.b]+=transfer[k];});if(balance.every((x,i)=>Math.abs(x-v[i])<Math.max(1e-7,Math.abs(x)*1e-12))){assert(balance.every(x=>x>=-1e-7));return {storage:balance.map(x=>Math.max(0,x)),transfer};}}
 throw Error('Reference failed to converge');}
module.exports={curve,step};
