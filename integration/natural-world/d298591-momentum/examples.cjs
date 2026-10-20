'use strict';
const M=require('./core.js'),copy=p=>JSON.parse(JSON.stringify(p));
const base=()=>({schema:M.schema,kind:'explicit-design-assumption',alpha:1,beta:1,closure:'equal-inlet-water-surface',controlVolume:'horizontal-plan-static-boundaries',externalWorkW:0,gravityMPerS2:9.80665,densityKgM3:1000,inlets:[{id:'left',widthM:50,bedM:0,bankDepthM:20,flowM3S:50,angleDeg:0,comparisonLossM:.02},{id:'right',widthM:50,bedM:0,bankDepthM:20,flowM3S:50,angleDeg:0,comparisonLossM:.02}],outlet:{id:'out',widthM:100,bedM:0,bankDepthM:20,flowM3S:null,angleDeg:0,depthM:5},forces:{wallN:{x:0,y:0},bedPressureN:{x:0,y:0},frictionN:{x:0,y:0}}});
const examples=[],add=(id,label,p,note)=>examples.push({id,label,input:p,note});
add('aligned','평행 유입 · 같은 유속의 해석 사례',base(),'폭과 유량이 각각 절반인 두 유입. 외력0에서 공통 수심5m,순 에너지차0.');
for(const angle of [30,60]){const p=base();p.inlets[0].angleDeg=angle;p.inlets[1].angleDeg=-angle;add('symmetric-'+angle,`대칭 ±${angle}° · 횡방향 상쇄`,p,'벽/바닥/마찰 힘0을 별도로 가정. 합류 실제 형상 예측 아님.');}
const asym=base();Object.assign(asym.inlets[0],{flowM3S:60,widthM:60,angleDeg:30});Object.assign(asym.inlets[1],{flowM3S:40,widthM:40,angleDeg:-30});
add('missing-side-force','비대칭 60 + 40 · 횡방향 외력 부족',asym,'종방향 수심만 구해도 횡방향 힘이 맞지 않으면 보류.');
const known=copy(asym),eta=6,g=known.gravityMPerS2,rho=known.densityKgM3;
// Manufactured verification fixture: evaluate prescribed forces from an
// independently chosen stage, never fill them from the production solver.
const force=(b,q,y)=>rho*q*q/(b*y)+rho*g*b*y*y/2;
known.forces.wallN={x:force(100,100,5)-(force(60,60,eta)+force(40,40,eta))*Math.cos(Math.PI/6),y:-(force(60,60,eta)-force(40,40,eta))*Math.sin(Math.PI/6)};
add('manufactured-force','수면6m 검증 사례 · 명시한 외력',known,'해석 검산을 위해 선택한6m와 독립 식에서 만든 힘. 실제 벽 힘 추정이 아님.');
const drag=base();drag.forces.frictionN.x=-100000;add('assumed-drag','종방향 마찰력 −100kN 가정',drag,'공간 마찰식에서 계산한 힘이 아니라 별도 입력 가정.');
const work=base();work.forces.wallN.x=100000;add('energy-conflict','양의 외력 · 에너지 공급 필요',work,'운동량을 맞춰도 정지 경계/외부 일률0에서 음의 소산이면 보류.');
const bank=base();bank.outlet.depthM=21;add('boundary-bank','하류 수심21m · 둑 한계',bank,'처음부터 수리 경계 보류.');
const critical=base();critical.outlet.depthM=.01;add('boundary-critical','하류 얕은 수심 · 한계류 범위',critical,'도수·사류를 계산하지 않는다.');
const domain=base();domain.forces.wallN.x=2e7;add('critical-domain','외력 가정으로 아임계 해 없음',domain,'허용 영역 밖의 근으로 전환하지 않는다.');
const tall=base();tall.forces.frictionN.x=-2e8;add('bank-domain','큰 저항 · 공통 수면이 둑 범위 밖',tall,'둑을 연장해 해를 만들지 않는다.');
const bed=base();bed.inlets[0].bedM=1;bed.inlets[1].bedM=.5;add('different-beds','다른 바닥 높이 · 횡방향 없는 사례',bed,'같은 수면 가정과 같은 수심 가정을 구분한다.');
module.exports={base,examples,copy};
