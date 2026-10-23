'use strict';
const N=require('../inland-routing/core.js'),S=require('./surface.cjs');
const sum=(a,k)=>a.reduce((s,r)=>s+r[k],0),near=(a,b)=>Math.abs(a-b)<=Math.max(.01,Math.abs(b)*1e-10);
// The selected two donors have no upstream boundaries. Refuse a new network
// shape rather than silently dropping additional upstream transfers.
function schedule(data,model,o){
 const donors=data.groups.filter(g=>g.status==='eligible'&&g.target.id===model.id);
 if(donors.length!==2||donors.some(g=>data.groups.some(up=>up.status==='eligible'&&up.target.id===g.id)))throw Error('Unsupported donor network');
 const assignments=new Map(model.assignments.map(a=>[a.cell,a]));
 for(const g of donors)if(!assignments.has(g.target.entryCell))throw Error('Physical entry outside source domain');
 const inventory=new Map(donors.map(g=>[g.id,g.capacityM3*o.initialFraction])),rows=[];
 for(let k=0;k<o.years*12;k++)rows.push(donors.map(g=>{const available=inventory.get(g.id)+g.periodInflowM3[k%12],loss=Math.min(available,g.referenceAreaM2*o.lossMPerYear/12),volumeM3=Math.max(0,available-loss-g.capacityM3);inventory.set(g.id,Math.min(g.capacityM3,available-loss));return {from:g.id,entryCell:g.target.entryCell,leaf:assignments.get(g.target.entryCell).leaf,volumeM3};}));
 return rows;
}
function run(data,model,source,input){
 if(!input||!input.network||!input.surface)throw Error('Explicit network and surface assumptions required');
 const network=N.options(input.network),o=input.surface;
 for(const k of ['evaporationMPerYear','netGroundLossMPerYear','initialFraction','substeps'])if(!Number.isFinite(o[k]))throw Error('Missing surface assumption '+k);
 if(o.evaporationMPerYear<0||o.evaporationMPerYear>20||o.netGroundLossMPerYear<0||o.netGroundLossMPerYear>20||o.initialFraction<0||o.initialFraction>1||!Number.isInteger(o.substeps)||o.substeps<1||o.substeps>120)throw Error('Invalid surface assumption');
 const target=data.groups.find(g=>g.id===model.id);if(model.id!=='D298591'||target?.status!=='eligible'||target.target.kind!=='ocean')throw Error('Unsupported replacement');
 const original=N.run(data,network),old=original.boundaries.find(b=>b.id===model.id),receipts=schedule(data,model,network),received=sum(receipts.flat(),'volumeM3');
 if(!near(received,old.totalReceivedM3))throw Error('Receipt total differs from original network');
 for(const from of new Set(receipts.flat().map(r=>r.from))){const edge=original.transfers.find(t=>t.from===from&&t.to===model.id);if(!edge||!near(sum(receipts.flat().filter(r=>r.from===from),'volumeM3'),edge.totalTransferredM3))throw Error('Sender mismatch');for(let p=0;p<12;p++)if(!near(receipts[(network.years-1)*12+p].find(r=>r.from===from).volumeM3,edge.lastYearTransferredM3[p]))throw Error('Last-year receipt mismatch');}
 const dynamic=S.simulate(model,source,{years:network.years,...o},receipts),totals=dynamic.totals,initial=dynamic.options,final=dynamic.final;
 const global={initialInventoryM3:original.summary.initialInventoryM3-old.initialInventoryM3+initial.initialPoolM3+initial.initialSnowM3+initial.initialShallowM3,externalInputM3:original.summary.totalSourceInflowM3-old.totalSourceInflowM3+totals.precipitationM3,otherNetworkLossM3:original.summary.totalNetLossM3-old.totalNetLossM3,landEvaporationM3:totals.landEvaporationM3,waterEvaporationM3:totals.waterEvaporationM3,externalGroundLossM3:totals.netGroundLossM3,oceanDeliveryM3:original.summary.totalOceanDeliveryM3-old.totalReleaseM3+totals.boundaryExcessM3,unallocatedM3:original.summary.totalUnallocatedM3,finalInventoryM3:original.summary.finalInventoryM3-old.finalInventoryM3+final.poolM3+final.snowM3+final.shallowM3};
 const residual=g=>g.initialInventoryM3+g.externalInputM3-g.otherNetworkLossM3-g.landEvaporationM3-g.waterEvaporationM3-g.externalGroundLossM3-g.oceanDeliveryM3-g.unallocatedM3-g.finalInventoryM3;
 global.residualM3=residual(global);if(!Number.isFinite(global.residualM3)||Math.abs(global.residualM3)>Math.max(.1,(global.initialInventoryM3+global.externalInputM3)*1e-10))throw Error('Global replacement balance failed');
 // Separate inventory assertion: P+upstream minus external losses/excess equals
 // changes in snow, the mixed shallow store and surface pools. Internal land
 // recharge/baseflow/runoff are deliberately absent from external input.
 if(!near(totals.upstreamReceivedM3,received)||!near(totals.precipitationM3+received,totals.landEvaporationM3+totals.waterEvaporationM3+totals.netGroundLossM3+totals.boundaryExcessM3+totals.snowChangeM3+totals.shallowChangeM3+totals.poolChangeM3))throw Error('Dynamic balance failed');
 const ledger={replacedBoundary:model.id,removed:{sourceInflowM3:old.totalSourceInflowM3,additionalNetLossM3:old.totalNetLossM3,initialPoolM3:old.initialInventoryM3,finalPoolM3:old.finalInventoryM3,oceanDeliveryM3:old.totalReleaseM3},added:{precipitationM3:totals.precipitationM3,initialSnowM3:initial.initialSnowM3,initialShallowM3:initial.initialShallowM3,initialPoolM3:initial.initialPoolM3,finalSnowM3:final.snowM3,finalShallowM3:final.shallowM3,finalPoolM3:final.poolM3,landEvaporationM3:totals.landEvaporationM3,waterEvaporationM3:totals.waterEvaporationM3,externalGroundLossM3:totals.netGroundLossM3,oceanDeliveryM3:totals.boundaryExcessM3},upstreamReceivedM3:received,upstreamCountedAsExternalInput:false};
 // Only a replacement delta visits the existing ocean path. Old release is
 // removed once; negative delta is a reduction, never reverse physical flow.
 const delta=totals.boundaryExcessM3-old.totalReleaseM3;
 const routed=target.route.map(cell=>{const n=original.nodes.find(n=>n.cell===cell);if(!n)throw Error('Missing route');const updated=n.totalIncrementM3+delta;if(updated<-.01)throw Error('Negative total routed increment');return {cell,previousIncrementM3:n.totalIncrementM3,replacementDeltaM3:delta,updatedIncrementM3:updated};});
 return {schema:'dynamic-water-budget-link-result/1',assumptions:{network,surface:o,temporalConvention:'Original network adjacent-phase averaged inflow and raw local source phases are aligned by index as an explicit mixed-forcing experiment; not simultaneous observed hydrographs.',outlet:'Capacity excess routed with same-period zero-loss zero-delay network assumption; no hydraulic adoption.'},provenance:data.provenance,dynamic,receipts,global,replacement:ledger,routed,summary:{dynamicBoundary:'D298591',dynamicReaches:target.reachCount,sourceCells:source.cells.length,donorBoundaries:2,networkModelledReaches:original.summary.modelledReaches,physicalResolvedReaches:0,physicallyUnresolvedReaches:23022},actual:{storageM3:null,infiltrationM3:null,evaporationM3:null,overflowM3:null},automaticAdoption:false,sourceGraphChanged:false};
}
module.exports={run,schedule};
