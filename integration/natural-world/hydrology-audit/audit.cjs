'use strict';
// Independent graph checks: do not import the producer's traversal or routing functions.
function inspectGraph(g) {
 const {w,h,cells,nodes,land,lake,heights,canonical,receiver,entry,terminal,depressions,lakeNode,lakeOutlet}=g,n=w*h;
 const active=new Uint8Array(n),incoming=new Uint32Array(n),queue=[],issues={},flags=new Uint8Array(n);
 const mark=(kind,i)=>{(issues[kind]??=[]).push(i);flags[i]=1;};
 for(const i of nodes){if(i<0||i>=n)throw Error('Node outside grid');if(active[i])mark('duplicateNode',i);active[i]=1;}
 const deps=new Set(depressions.map(d=>d.node));
 for(const i of cells)if(canonical[i]<0||!active[canonical[i]]||canonical[canonical[i]]!==canonical[i])mark('canonical',i);
 for(const i of nodes){const j=receiver[i];if(j>=0){if(j>=n||!active[j]){mark('receiver',i);continue;}incoming[j]++;
   const e=entry[i];if(e<0||e>=n||canonical[e]!==j)mark('entryMapping',i);
   if(i!==lakeNode&&e>=0&&e<n){const dx=Math.abs(i%w-e%w),dy=Math.abs(Math.floor(i/w)-Math.floor(e/w));if(i===e||Math.min(dx,w-dx)>1||dy>1)mark('nonAdjacent',i);if(land[e]&&!lake[e]&&heights[e]>heights[i]+.05)mark('uphill',i);}
  }else if(land[i]||lake[i]){if(!deps.has(i))mark('unknownTerminal',i);}
  if(deps.has(i)&&j>=0)mark('unresolvedBoundaryRouted',i);
 }
 if(lakeNode>=0&&(entry[lakeNode]!==lakeOutlet||receiver[lakeNode]!==canonical[lakeOutlet]))mark('lakeOutlet',lakeNode);
 const degrees=incoming.slice();for(const i of nodes)if(!degrees[i])queue.push(i);
 for(let k=0;k<queue.length;k++){const j=receiver[queue[k]];if(j>=0&&active[j]&&!--degrees[j])queue.push(j);}
 if(queue.length!==nodes.length)for(const i of nodes)if(degrees[i])mark('cycleAffected',i);
 const computedTerminal=new Int32Array(n).fill(-1),passesLake=new Uint8Array(n);
 for(let k=queue.length-1;k>=0;k--){const i=queue[k],j=receiver[i];computedTerminal[i]=j<0?i:computedTerminal[j];passesLake[i]=i===lakeNode||j>=0&&passesLake[j];if(terminal[i]!==computedTerminal[i])mark('terminalMismatch',i);}
 return {issues,flags,order:queue,incoming,computedTerminal,passesLake,issueCount:Object.values(issues).reduce((s,v)=>s+v.length,0)};
}
function inspectReaches(g,reaches,reachField,channel,ll) {
 const issues={};const mark=(k,id)=>(issues[k]??=[]).push(id),byId=new Map(reaches.map(r=>[r.id,r])),expectedUp=new Map(reaches.map(r=>[r.id,[]]));
 if(byId.size!==reaches.length)mark('duplicateReach',-1);
 for(const r of reaches){let i=r.start,steps=0;const coords=[];
  while(i>=0&&steps++<=g.nodes.length){coords.push(ll(i));if(!channel[i]||reachField[i]!==r.id)mark('reachMembership',r.id);if(i===r.end)break;i=g.receiver[i];}
  if(i!==r.end){mark('reachPath',r.id);continue;}
  const next=g.receiver[i];if(next!==r.nextNode)mark('reachNext',r.id);
  if(next>=0)coords.push(ll(g.entry[i]));
  if(JSON.stringify(coords)!==JSON.stringify(r.coordinates))mark('reachGeometry',r.id);
  const down=next>=0&&channel[next]?reachField[next]:null;
  if(r.downstreamReach!==down||down!==null&&!byId.has(down))mark('reachJoin',r.id);
  if(expectedUp.has(down))expectedUp.get(down).push(r.id);
  if(r.endpointNode!==g.terminal[i])mark('reachTerminal',r.id);
 }
 for(const r of reaches)if(JSON.stringify([...r.upstreamReaches].sort((a,b)=>a-b))!==JSON.stringify(expectedUp.get(r.id).sort((a,b)=>a-b)))mark('upstreamReciprocity',r.id);
 return {issues,issueCount:Object.values(issues).reduce((s,v)=>s+v.length,0)};
}
module.exports={inspectGraph,inspectReaches};
