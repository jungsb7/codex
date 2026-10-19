'use strict';
const R=require('../retention-review/core.js'),T=require('../retention-chain/core.js');
const EPS=1e-6;
// Partition equal-elevation plateaus first, then direct every cell down a finite
// steepest path. Flat ties are deterministic and do not create artificial pits.
function partition(columns,width,height,distance=()=>1){
 const {byCell,neighbours}=T.adjacency(columns,width,height),flat=new Map(),flats=[];
 for(const start of byCell.keys())if(!flat.has(start)){const id=flats.length,q=[start];flat.set(start,id);for(let k=0;k<q.length;k++)for(const j of neighbours(q[k]))if(!flat.has(j)&&byCell.get(j).elevationM===byCell.get(start).elevationM){flat.set(j,id);q.push(j);}flats.push(q);}
 const receiver=new Map();
 for(const cells of flats){let exit=null;for(const i of cells)for(const j of neighbours(i)){const drop=byCell.get(i).elevationM-byCell.get(j).elevationM;if(drop<=0)continue;const slope=drop/distance(i,j);if(!exit||slope>exit.slope||slope===exit.slope&&(j<exit.j||j===exit.j&&i<exit.i))exit={i,j,slope};}
  const seed=exit?.i??Math.min(...cells),queue=[seed],seen=new Set([seed]);receiver.set(seed,exit?.j??-1);for(let k=0;k<queue.length;k++)for(const j of neighbours(queue[k]))if(flat.get(j)===flat.get(seed)&&!seen.has(j)){seen.add(j);queue.push(j);receiver.set(j,queue[k]);}
 }
 const labels=new Map();for(const start of byCell.keys()){if(labels.has(start))continue;let i=start;const route=[],seen=new Set();while(!labels.has(i)&&receiver.get(i)!==-1){if(seen.has(i))throw Error('Partition cycle');seen.add(i);route.push(i);i=receiver.get(i);}const sink=labels.get(i)??i;labels.set(i,sink);for(const j of route)labels.set(j,sink);}
 const groups=[...new Set(labels.values())].sort((a,b)=>a-b).map(id=>({id,columns:columns.filter(c=>labels.get(c.cell)===id)})),edges=new Map();
 for(const i of byCell.keys())for(const j of neighbours(i)){const u=labels.get(i),v=labels.get(j);if(u===v)continue;const [a,b]=u<v?[u,v]:[v,u],edge={a,b,cellA:u===a?i:j,cellB:u===a?j:i,saddleM:Math.max(byCell.get(i).elevationM,byCell.get(j).elevationM)},key=a+':'+b,old=edges.get(key);if(!old||edge.saddleM<old.saddleM||edge.saddleM===old.saddleM&&(edge.cellA<old.cellA||edge.cellA===old.cellA&&edge.cellB<old.cellB))edges.set(key,edge);}
 return {groups,labels,receiver,edges:[...edges.values()].sort((a,b)=>a.saddleM-b.saddleM||a.a-b.a||a.b-b.b)};
}

// Minimum spanning saddle tree: internal heights are the first levels connecting
// their children. Entire native columns remain allocated to exactly one leaf.
function hierarchy(partition,crestM){
 const byLeaf=new Map(),nodes=[],parent=new Map();
 for(const g of partition.groups){const n={id:'P'+g.id,leaf:g.id,leaves:[g.id],columns:g.columns,children:[],mergeM:null};byLeaf.set(g.id,n);parent.set(g.id,g.id);nodes.push(n);}
 const find=i=>{while(parent.get(i)!==i)i=parent.get(i);return i;};const top=new Map(byLeaf),accepted=[];
 for(const edge of partition.edges){let a=find(edge.a),b=find(edge.b);if(a===b)continue;const left=top.get(a),right=top.get(b),node={id:'M'+nodes.length,leaf:null,leaves:[...left.leaves,...right.leaves],columns:[...left.columns,...right.columns],children:[left,right],mergeM:edge.saddleM,edge};nodes.push(node);accepted.push(edge);parent.set(b,a);top.set(a,node);}
 if(!nodes.length)throw Error('Empty hierarchy');const root=top.get(find(partition.groups[0].id));if(root.leaves.length!==partition.groups.length)throw Error('Disconnected domain');
 function prepare(node,parentCrest){node.parentCrestM=parentCrest;node.h=R.hypsometry(node.columns);node.baseM3=node.children.length?node.h.atLevel(node.mergeM).volumeM3:0;node.capacityM3=node.h.atLevel(parentCrest).volumeM3;node.volumeM3=0;if(node.mergeM!==null&&node.mergeM>parentCrest+1e-8)throw Error('Internal saddle above outlet');for(const child of node.children)prepare(child,node.mergeM);}
 prepare(root,crestM);return {root,nodes,byLeaf,acceptedEdges:accepted};
}

function inject(node,leaf,water){
 if(!Number.isFinite(water)||water<0||!node.leaves.includes(leaf))throw Error('Invalid pond inflow');
 if(!node.children.length||node.volumeM3>=node.baseM3-EPS){const accepted=Math.min(water,Math.max(0,node.capacityM3-node.volumeM3));node.volumeM3+=accepted;return water-accepted;}
 const first=node.children.find(c=>c.leaves.includes(leaf)),other=node.children.find(c=>c!==first);let excess=inject(first,leaf,water);
 if(excess>0){const entry=other.leaves.includes(node.edge.a)?node.edge.a:node.edge.b;excess=inject(other,entry,excess);}
 node.volumeM3=node.children[0].volumeM3+node.children[1].volumeM3;
 const accepted=Math.min(excess,Math.max(0,node.capacityM3-node.volumeM3));node.volumeM3+=accepted;return excess-accepted;
}

// Uniform hypothetical net-loss depth lowers each currently connected water body.
// If it crosses a saddle, split there and use the remaining depth in each child.
function removeDepth(node,depthM){
 if(!Number.isFinite(depthM)||depthM<0)throw Error('Invalid net loss');if(depthM===0||node.volumeM3===0)return 0;
 const before=node.volumeM3;
 if(!node.children.length){const level=node.h.atVolume(before).levelM;node.volumeM3=node.h.atLevel(Math.max(node.h.minElevationM,level-depthM)).volumeM3;}
 else if(before>node.baseM3+EPS){const level=node.h.atVolume(before).levelM,difference=level-node.mergeM;if(depthM<=difference){node.volumeM3=node.h.atLevel(level-depthM).volumeM3;}else{const remaining=depthM-Math.max(0,difference);for(const child of node.children)removeDepth(child,remaining);node.volumeM3=node.children.reduce((sum,c)=>sum+c.volumeM3,0);}}
 else{for(const child of node.children)removeDepth(child,depthM);node.volumeM3=node.children.reduce((sum,c)=>sum+c.volumeM3,0);}
 // Inverse geometry can produce a few floating-point ulps above the previous value.
 if(node.volumeM3>before&&node.volumeM3-before<Math.max(EPS,before*1e-12))node.volumeM3=before;
 if(node.volumeM3<0||node.volumeM3>before+Math.max(EPS,before*1e-10))throw Error('Invalid storage after loss');return before-node.volumeM3;
}
function activePools(node,result=[]){if(node.volumeM3<=EPS)return result;if(!node.children.length||node.volumeM3>node.baseM3+EPS){const s=node.h.atVolume(node.volumeM3);result.push({id:node.id,leaves:node.leaves,levelM:s.levelM,storageM3:node.volumeM3,potentialWaterAreaKm2:s.areaM2/1e6});}else for(const child of node.children)activePools(child,result);return result;}
function reset(tree){for(const node of tree.nodes)node.volumeM3=0;}

function simulate(upper,lower,options){
 const {years=500,substeps=30,netSinkMPerYear=0,entryLeaf}=options;
 if(!Number.isInteger(years)||years<1||!Number.isInteger(substeps)||substeps<1||!Number.isFinite(netSinkMPerYear)||netSinkMPerYear<0||lower.tree.root.parentCrestM>=upper.tree.root.parentCrestM)throw Error('Invalid scenario or backwater');
 for(const b of [upper,lower])for(const leaf of b.tree.root.leaves)if(!b.inputs[leaf]||b.inputs[leaf].length!==12||!b.inputs[leaf].every(v=>Number.isFinite(v)&&v>=0))throw Error('Invalid forcing');if(!lower.tree.byLeaf.has(entryLeaf))throw Error('Unknown lower entry');reset(upper.tree);reset(lower.tree);
 const annual=[],months=[],first={upper:null,lower:null},dt=1/(12*substeps),u=upper.tree.root,l=lower.tree.root;let maxResidualM3=0;const totals={inflowM3:0,lossM3:0,outflowM3:0};
 for(let year=1;year<=years;year++){
  const oldU=u.volumeM3,oldL=l.volumeM3,row={year,upperInflowM3:0,lowerOwnInflowM3:0,transferM3:0,upperLossM3:0,lowerLossM3:0,nextBoundaryM3:0};
  for(let period=1;period<=12;period++){
   const startU=u.volumeM3,startL=l.volumeM3,month={year,period,upperInflowM3:0,lowerOwnInflowM3:0,transferM3:0,upperLossM3:0,lowerLossM3:0,nextBoundaryM3:0};
   for(let step=0;step<substeps;step++){
    month.upperLossM3+=removeDepth(u,netSinkMPerYear*dt/2);month.lowerLossM3+=removeDepth(l,netSinkMPerYear*dt/2);
    let transfer=0,outflow=0;for(const leaf of u.leaves){const v=upper.inputs[leaf][period-1]/substeps;month.upperInflowM3+=v;transfer+=inject(u,leaf,v);}for(const leaf of l.leaves){const v=lower.inputs[leaf][period-1]/substeps;month.lowerOwnInflowM3+=v;outflow+=inject(l,leaf,v);}outflow+=inject(l,entryLeaf,transfer);
    month.transferM3+=transfer;month.nextBoundaryM3+=outflow;month.upperLossM3+=removeDepth(u,netSinkMPerYear*dt/2);month.lowerLossM3+=removeDepth(l,netSinkMPerYear*dt/2);
    const stamp={year,period,substep:step+1,elapsedYears:year-1+(period-1+(step+1)/substeps)/12};if(transfer>1&&!first.upper)first.upper=stamp;if(outflow>1&&!first.lower)first.lower=stamp;
   }
   month.upperStorageChangeM3=u.volumeM3-startU;month.lowerStorageChangeM3=l.volumeM3-startL;month.upperResidualM3=month.upperInflowM3-month.upperLossM3-month.transferM3-month.upperStorageChangeM3;month.lowerResidualM3=month.lowerOwnInflowM3+month.transferM3-month.lowerLossM3-month.nextBoundaryM3-month.lowerStorageChangeM3;maxResidualM3=Math.max(maxResidualM3,Math.abs(month.upperResidualM3),Math.abs(month.lowerResidualM3));months.push(month);for(const k of Object.keys(row))if(k!=='year')row[k]+=month[k];
  }
  row.upperStorageChangeM3=u.volumeM3-oldU;row.lowerStorageChangeM3=l.volumeM3-oldL;row.upperStorageM3=u.volumeM3;row.lowerStorageM3=l.volumeM3;row.upperPools=activePools(u);row.lowerPools=activePools(l);row.residualM3=row.upperInflowM3+row.lowerOwnInflowM3-row.upperLossM3-row.lowerLossM3-row.nextBoundaryM3-row.upperStorageChangeM3-row.lowerStorageChangeM3;annual.push(row);totals.inflowM3+=row.upperInflowM3+row.lowerOwnInflowM3;totals.lossM3+=row.upperLossM3+row.lowerLossM3;totals.outflowM3+=row.nextBoundaryM3;
 }
 totals.storageChangeM3=u.volumeM3+l.volumeM3;totals.residualM3=totals.inflowM3-totals.lossM3-totals.outflowM3-totals.storageChangeM3;
 return {options:{years,substeps,netSinkMPerYear,initialStorageM3:0,entryLeaf},first,annual,months,final:annual.at(-1),totals,maxMonthlyResidualM3:maxResidualM3};
}
module.exports={partition,hierarchy,inject,removeDepth,activePools,reset,simulate};
