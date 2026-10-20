'use strict';
const H=require('./core.js'),copy=x=>JSON.parse(JSON.stringify(x));
const section=(xM,bedM,widthM=100)=>({xM,bedM,widthM,bankDepthM:20,manningN:.03});
const reach=(id,downstreamId,inflowM3S,sections)=>({id,downstreamId,inflowM3S,junctionLossM:downstreamId===null?null:.02,junctionAngleDeg:downstreamId===null?null:0,contractionCoefficient:0,expansionCoefficient:0,sections});
const input=reaches=>({schema:H.schema,kind:'explicit-design-assumption',alpha:1,junctionModel:'prescribed-loss-energy',momentumAssumption:'angle-effects-excluded-not-solved',gravityMPerS2:9.80665,downstream:{reachId:'out',depthM:5},reaches});
const single=input([reach('out',null,100,[section(0,.2),section(20000,0)])]);
const two=input([
 reach('out',null,null,[section(0,.1),section(10000,0)]),
 reach('main','out',60,[section(0,.2,60),section(10000,.1,60)]),
 reach('side','out',40,[section(0,.2,40),section(10000,.1,40)])
]);
const examples=[];
function add(id,label,p){examples.push({id,label,input:p});return p;}
add('constant','일정 단면 · 후속28 대조',single);
const taper=copy(single);Object.assign(taper.reaches[0],{contractionCoefficient:.1,expansionCoefficient:.3,sections:[section(0,.2,80),section(10000,.1,120),section(20000,0,100)]});add('taper','완만한 폭 변화 · 수축/확대 손실',taper);
add('two-branches','두 지류 · 60 + 40 = 100 m³/s',two);
const variable=copy(two);for(const r of variable.reaches){r.contractionCoefficient=.1;r.expansionCoefficient=.3;r.sections[0].widthM*=.8;r.sections[1].manningN=.04;}add('variable-branches','두 지류 · 폭·조도 변화',variable);
const losses=copy(two);losses.reaches[1].junctionLossM=.2;losses.reaches[2].junctionLossM=.5;add('junction-losses','합류 손실 · 지류별 0.2 / 0.5m 가정',losses);
const angle=copy(two);angle.reaches[2].junctionAngleDeg=45;add('angle-held','45° 합류 · 운동량 계산 필요',angle);
const critical=copy(two);critical.reaches[2].sections.at(-1).bedM=5;add('junction-held','합류 에너지 부족 · 상류 보류',critical);
const bank=copy(single);bank.downstream.depthM=21;add('bank-held','하류 수심 21m · 둑 한계 보류',bank);
const narrow=copy(single);narrow.reaches[0].sections[0].widthM=1;narrow.reaches[0].sections[0].bankDepthM=5;add('bank-stop','상류 축소 단면 · 유효 구간만 계산',narrow);
const rapid=copy(single);rapid.reaches[0].sections=[section(0,.2,10),section(100,.1,100)];add('width-stop','급격한 폭 변화 · 중단',rapid);
module.exports={examples,copy,section,reach,input};
