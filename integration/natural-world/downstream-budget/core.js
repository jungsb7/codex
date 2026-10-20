(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.DownstreamBudget=factory();
})(globalThis,function(){
  'use strict';
  const CLASSES={
    'hot-and-polar':'고온·극지 방법 공백',
    'hot':'고온 PET 방법 공백',
    'polar':'극지 수분 방법 공백',
    'coupled':'하류 수위 결합 검토',
    'chain':'다음 미정 경계로 연결',
    'ocean':'해양 출구 후보 · 물수지 미정'
  };
  function category(g){
    if(g.hotPETGapCells&&g.polarGapCells)return 'hot-and-polar';
    if(g.hotPETGapCells)return 'hot';
    if(g.polarGapCells)return 'polar';
    if(g.flags.includes('coupled-level-review'))return 'coupled';
    return g.outlet.target.kind==='unresolved'?'chain':'ocean';
  }
  function geometry(columns,levelM){
    if(!Number.isFinite(levelM)||!columns.length||new Set(columns.map(c=>c.cell)).size!==columns.length)throw Error('Invalid geometry');
    let volumeM3=0,areaM2=0;
    for(const c of columns){
      if(!Number.isFinite(c.elevationM)||!Number.isFinite(c.areaM2)||c.areaM2<=0)throw Error('Invalid column');
      if(c.elevationM<levelM){areaM2+=c.areaM2;volumeM3+=(levelM-c.elevationM)*c.areaM2;}
    }
    return {levelM,volumeM3,areaM2};
  }
  // An aggregate inventory experiment, NOT a level-pool hydraulic routing solver.
  // Native land-generated inflow is retained. Loss is an EXTRA net debit against
  // a fixed reference footprint. It is neither measured evaporation nor seepage.
  function experiment(g,{years=100,lossMPerYear=0,initialFraction=0}={}){
    if(!Number.isInteger(years)||years<1||years>500||!Number.isFinite(lossMPerYear)||lossMPerYear<0||lossMPerYear>20||!Number.isFinite(initialFraction)||initialFraction<0||initialFraction>1)throw Error('Invalid experiment parameters');
    const capacity=g.geometry.volumeM3,area=g.geometry.areaM2,inflows=g.periodInflowM3;
    if(!Number.isFinite(capacity)||capacity<=0||!Number.isFinite(area)||area<=0||!Array.isArray(inflows)||inflows.length!==12||inflows.some(v=>!Number.isFinite(v)||v<0))throw Error('Invalid boundary inputs');
    const initialStorageM3=capacity*initialFraction,demand=area*lossMPerYear/12,periods=[];
    let storage=initialStorageM3,totalInflowM3=0,totalDebitM3=0,totalCapacityExcessM3=0,firstExcess=null,maxAbsResidualM3=0;
    for(let k=0;k<years*12;k++){
      const start=storage,inflow=inflows[k%12],available=start+inflow,debit=Math.min(available,demand);
      const excess=Math.max(0,available-debit-capacity);
      storage=Math.min(capacity,available-debit);
      const residual=start+inflow-debit-excess-storage;
      maxAbsResidualM3=Math.max(maxAbsResidualM3,Math.abs(residual));
      totalInflowM3+=inflow;totalDebitM3+=debit;totalCapacityExcessM3+=excess;
      if(excess>0&&firstExcess===null)firstExcess={year:Math.floor(k/12)+1,period:k%12+1};
      periods.push({year:Math.floor(k/12)+1,period:k%12+1,startInventoryM3:start,inflowM3:inflow,requestedDebitM3:demand,appliedDebitM3:debit,capacityExcessM3:excess,endInventoryM3:storage,residualM3:residual});
    }
    const annual=inflows.reduce((s,v)=>s+v,0);
    return {schema:'boundary-inventory-experiment/1',groupId:g.id,years,lossMPerYear,initialFraction,referenceAreaM2:area,capacityM3:capacity,initialStorageM3,finalInventoryM3:storage,totalInflowM3,totalDebitM3,totalCapacityExcessM3,firstExcess,maxAbsResidualM3,
      cumulativeResidualM3:initialStorageM3+totalInflowM3-totalDebitM3-totalCapacityExcessM3-storage,
      necessaryAverageLossMPerYear:Math.max(0,initialStorageM3+years*annual-capacity)/(years*area),
      steadyBalanceLossMPerYear:annual/area,periods,automaticAdoption:false,
      actualStorageM3:null,actualInfiltrationM3:null,actualEvaporationM3:null,actualOverflowM3:null,
      meaning:'고정 원본 유입 반복·추가 순손실·기하학적 체적 상한의 장부 실험. 초과분은 미배분이며 실제 방류·수위·침수·증발·침투 예측이 아님.'};
  }
  function query(data,term){
    const q=String(term).trim();
    if(/^D\d+$/.test(q))return data.groups.find(g=>g.id===q)||null;
    if(!/^\d+$/.test(q))return null;
    const r=data.reaches.find(r=>r.id===+q);
    return r?{reach:r,group:data.groups.find(g=>g.node===r.endpointNode)}:null;
  }
  function validate(d){
    if(d?.schema!=='downstream-boundary-review/1'||d.groups?.length!==1184||d.reaches?.length!==23022||d.representatives?.length!==6||d.automaticAdoption!==false)throw Error('검토 자료 형식 또는 범위가 다릅니다.');
    return d;
  }
  return {CLASSES,category,geometry,experiment,query,validate};
});
