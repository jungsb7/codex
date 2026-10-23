(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.WaterBudgetView=factory();})(globalThis,function(){
'use strict';
function validate(d){if(d?.schema!=='water-budget-link/1'||d.scenarios?.length!==3||d.automaticAdoption!==false)throw Error('자료 형식이 다릅니다.');for(const s of d.scenarios)if(s.dynamic.annual.length!==100||s.receipts.length!==1200||s.summary.physicalResolvedReaches!==0||s.summary.dynamicReaches!==171)throw Error('계산 범위가 다릅니다.');return d;}
function query(d,id,year){validate(d);const s=d.scenarios.find(s=>s.id===id);if(!s||!Number.isInteger(year)||year<1||year>100)throw Error('조건 또는 연도가 잘못됐습니다.');return {schema:'water-budget-link-selection/1',id,selectedYear:year,assumptions:s.assumptions,annual:s.dynamic.annual[year-1],receipts:s.receipts.slice((year-1)*12,year*12),periods:s.dynamic.periods.filter(p=>p.year===year),globalHorizonYears:100,global:s.global,localTotals:s.dynamic.totals,replacement:s.replacement,routed:s.routed,summary:s.summary,provenance:d.provenance,actual:s.actual,automaticAdoption:false};}
return {validate,query};
});
