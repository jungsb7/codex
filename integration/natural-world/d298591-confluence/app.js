'use strict';
const H=ConfluenceCandidate,V=ConfluenceView,$=id=>document.getElementById(id),fmt=(x,d=3)=>x===null||x===undefined?'미정':Number(x).toLocaleString('ko-KR',{maximumFractionDigits:d}),clone=x=>JSON.parse(JSON.stringify(x)),statusText={completed:'가정 계산 완료',stopped:'일부 계산 후 중단','held-boundary':'하류 경계 보류',blocked:'상류 계산 보류'};
const reasons={'bank-limit':'둑 높이 한계','critical-or-coefficient-limit':'한계류 또는 손실계수 적용 한계','no-subcritical-bank-domain':'둑 안에 허용 아임계 범위 없음','rapid-depth-change':'급격한 수심 변화','rapid-width-change':'급격한 폭 변화','steep-bed':'급격한 하상 경사','angle-momentum-unsupported':'합류 각도에 따른 운동량 계산 필요','junction-incomplete':'합류부 계산 보류','downstream-incomplete':'하류 계산 미완료','step-limit':'수치 단계 상한'};
let data=null,input=null,current=null,reachId='',point=0;
window.confluenceDebug=null;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function clearResult(){current=null;window.confluenceDebug=null;$('result').hidden=true;}
function numericField(parent,label,path,value){
 const l=el('label',label),n=el('input');n.type='number';n.step='any';n.dataset.path=JSON.stringify(path);n.value=value;n.setAttribute('aria-label',label);l.append(n);parent.append(l);
 n.addEventListener('input',()=>{clearResult();$('run-status').textContent='입력이 바뀌었습니다. 다시 계산하세요.';});
}
function edit(p){
 input=clone(p);$('editor').hidden=false;$('fields').replaceChildren();
 const common=el('div',undefined,'fields');$('fields').append(common);numericField(common,'가정 중력 m/s²',['gravityMPerS2'],p.gravityMPerS2);numericField(common,'말단 경계 수심 m',['downstream','depthM'],p.downstream.depthM);
 for(let i=0;i<p.reaches.length;i++){
  const r=p.reaches[i],box=el('details',undefined,'reach-input');box.append(el('summary',`${r.id} → ${r.downstreamId??'말단'} · ${r.sections.length}단면 · ${r.inflowM3S===null?'지류 합산':fmt(r.inflowM3S)+' m³/s'}`));
  const fields=el('div',undefined,'fields');box.append(fields);
  if(r.inflowM3S!==null)numericField(fields,'최상류 가정 유량 m³/s',['reaches',i,'inflowM3S'],r.inflowM3S);
  for(const [key,label]of [['contractionCoefficient','수축 손실계수'],['expansionCoefficient','확대 손실계수']])numericField(fields,label,['reaches',i,key],r[key]);
  if(r.downstreamId!==null){numericField(fields,'가정 합류 손실 m',['reaches',i,'junctionLossM'],r.junctionLossM);numericField(fields,'가정 합류 각도 °',['reaches',i,'junctionAngleDeg'],r.junctionAngleDeg);}
  r.sections.forEach((s,j)=>{const item=el('div',undefined,'section-input');item.append(el('p',`단면 ${j+1} · 상류부터 하류 순서`));const row=el('div',undefined,'fields');item.append(row);for(const [key,label]of [['xM','구간 상류부터 거리 m'],['bedM','가상 바닥 높이 m'],['widthM','가정 폭 m'],['bankDepthM','바닥 위 둑 높이 m'],['manningN','Manning n']])numericField(row,label,['reaches',i,'sections',j,key],s[key]);box.append(item);});
  $('fields').append(box);
 }
}
function values(){const p=clone(input);for(const n of $('fields').querySelectorAll('input')){const keys=JSON.parse(n.dataset.path);let at=p;for(const k of keys.slice(0,-1))at=at[k];at[keys.at(-1)]=n.value.trim()===''?null:Number(n.value);}return p;}
function metric(label,value){const m=el('div',undefined,'metric');m.append(el('span',label),el('strong',value));$('metrics').append(m);}
function share(push){
 const hash='#'+new URLSearchParams({input:JSON.stringify(input),reach:reachId,point:String(point)}).toString();
 $('share-link').href=hash;
 if(push&&location.hash!==hash)history.pushState(null,'',hash);
}
function graph(){
 const r=current.candidate.reaches.find(x=>x.id===reachId)||current.candidate.reaches[0];reachId=r.id;$('reach').value=r.id;point=Math.min(Math.max(0,point),Math.max(0,r.profile.length-1));
 $('reach-note').textContent=`${r.id} · 유량 ${fmt(r.flowM3S)} m³/s · ${statusText[r.status]}${r.stop?' · '+(reasons[r.stop.reason]??r.stop.reason):''}. ${r.stop?.intervalXM?'실패한 수치 검사 구간 '+r.stop.intervalXM.map(x=>fmt(x)).join(' ~ ')+'m (구간 상류 기준). 실제 사건 위치 보증이 아닙니다.':''}`;
 $('plot-area').hidden=!r.profile.length;
 if(r.profile.length){
  const svg=$('profile');svg.replaceChildren();const width=innerWidth<600?440:700,height=300,left=48,right=14,top=25,bottom=46;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const total=input.reaches.find(x=>x.id===r.id).sections.at(-1).xM,rows=r.profile,low=Math.min(...rows.map(x=>x.bedM)),high=Math.max(...rows.map(x=>Math.max(x.bedM+x.bankDepthM,x.energyM))),span=high-low||1;
  const x=s=>left+s/total*(width-left-right),y=v=>height-bottom-(v-low)/span*(height-top-bottom);
  function shape(name,attrs,text){const n=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;svg.append(n);return n;}
  if(r.status!=='completed'){const last=rows.at(-1).upstreamDistanceM;shape('rect',{x:x(last),y:top,width:x(total)-x(last),height:height-bottom-top,fill:'#e8eae7'});shape('text',{x:width-right-3,y:top+18,'text-anchor':'end'},'미계산');}
  for(let k=0;k<=4;k++){const v=low+span*k/4;shape('line',{x1:left,x2:width-right,y1:y(v),y2:y(v),stroke:'#dce5df'});shape('text',{x:left-5,y:y(v)+4,'text-anchor':'end'},fmt(v,1));}
  for(const[key,color,dash]of [['bedM','#788786',''],['bank','#9eaba7','5 4'],['waterM','#157c91',''],['energyM','#cb782b','']])shape('polyline',{points:rows.map(s=>`${x(s.upstreamDistanceM)},${y(key==='bank'?s.bedM+s.bankDepthM:s[key])}`).join(' '),fill:'none',stroke:color,'stroke-width':2,'stroke-dasharray':dash});
  shape('text',{x:left,y:height-24},'하류 0');shape('text',{x:width-right,y:height-24,'text-anchor':'end'},`${fmt(total/1000)} km 상류`);
  shape('text',{x:left,y:15},'가상 높이 m');
  const s=rows[point];shape('circle',{cx:x(s.upstreamDistanceM),cy:y(s.waterM),r:4,fill:'#114e64'});
  $('point').max=rows.length-1;$('point').value=point;$('point-note').textContent=`하류에서 ${fmt(s.upstreamDistanceM/1000)}km · 가정 수심 ${fmt(s.depthM)}m · 수면 ${fmt(s.waterM)}m · 에너지 ${fmt(s.energyM)}m · Fr ${fmt(s.froude)}`;
 }
 window.confluenceDebug={current,reachId,point};share(false);
}
function render(){
 const r=current.candidate;$('result').hidden=false;$('outcome').textContent=statusText[r.status];$('metrics').replaceChildren();
 metric('가정 말단 유량',fmt(r.summary.outflowM3S)+' m³/s');metric('완료 구간',`${r.summary.completedReaches} / ${r.summary.totalReaches}`);metric('전체 에너지 잔차',r.summary.globalEnergyResidualM4S===null?'미완료 · null':r.summary.globalEnergyResidualM4S.toExponential(2)+' m⁴/s');
 $('result-note').textContent='에너지 잔차는 유량 × 수두의 수지입니다. 질량 보존과 가정 손실을 검산하며, 운동량 보존을 검증한 값은 아닙니다.';
 $('reach').replaceChildren();for(const rr of r.reaches){const option=el('option',`${rr.id} · ${statusText[rr.status]}`);option.value=rr.id;$('reach').append(option);}
 $('junctions').replaceChildren();if(!r.junctions.length)$('junctions').append(el('p','계산한 합류부가 없습니다.'));
 for(const j of r.junctions){const box=el('div',undefined,'junction');box.append(el('strong',`${j.branches.map(b=>b.reachId).join(' + ')} → ${j.downstreamReachId} · ${j.status==='completed'?'가정 계산 완료':'합류 보류'}`),el('p',`유입 ${fmt(j.flowInM3S)} = 유출 ${fmt(j.flowOutM3S)} m³/s · 유량 잔차 ${fmt(j.massResidualM3S,8)}`),el('p',`에너지 잔차 ${j.energyResidualM4S===null?'null':j.energyResidualM4S.toExponential(2)+' m⁴/s'} · 운동량 미계산`));
  for(const b of j.branches)box.append(el('p',`${b.reachId}: 가정 손실 ${fmt(b.assumedLossM)}m · ${b.reason?(reasons[b.reason]??b.reason):'가정 경계 수심 '+fmt(b.depthM)+'m'}${j.status==='held'?' · 상류 계산 미적용':''}`));$('junctions').append(box);
 }
 graph();
}
function calculate(p,push=true){
 clearResult();const errors=H.validate(p);if(errors.length){$('run-status').textContent='계산하지 않았습니다. '+errors.join(' ');return;}
 input=clone(p);current=V.result(data,input);$('run-status').textContent='명시한 설계 가정의 계산 결과입니다.';render();share(push);
}
function restore(){
 clearResult();const params=new URLSearchParams(location.hash.slice(1));if(!params.has('input')){input=null;$('preset').value='';$('editor').hidden=true;$('run-status').textContent='예제를 선택하세요. 자동 기본값은 없습니다.';return;}
 try{const p=JSON.parse(params.get('input')),errors=H.validate(p);if(errors.length)throw Error(errors.join(' '));edit(p);$('preset').value=data.presets.find(x=>JSON.stringify(x.input)===JSON.stringify(p))?.id??'';reachId=params.get('reach')??'';point=Math.max(0,Number(params.get('point'))||0);point=Math.floor(point);calculate(p,false);}
 catch(e){$('editor').hidden=true;input=null;$('run-status').textContent='공유 입력을 계산하지 않았습니다. '+e.message;}
}
async function load(){
 clearResult();$('content').hidden=true;$('retry').hidden=true;$('load-status').textContent='가정 예제 자료를 검증하는 중…';
 try{
  const response=await fetch('output/manifest.json',{cache:'no-store'});if(!response.ok)throw Error('목록 HTTP '+response.status);const m=await response.json();
  if(m.schema!=='d298591-confluence-manifest/1'||m.file!=='catalog.json'||!Number.isInteger(m.bytes)||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('목록 형식');
  const r=await fetch('output/catalog.json',{cache:'no-store'});if(!r.ok)throw Error('자료 HTTP '+r.status);const bytes=await r.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==m.bytes||sha!==m.sha256)throw Error('자료 크기/해시');data=V.validate(JSON.parse(new TextDecoder().decode(bytes)));
  $('preset').replaceChildren(el('option','선택 안 함 · 자동 기본값 없음'));$('preset').firstChild.value='';
  for(const p of data.presets){const option=el('option',p.label);option.value=p.id;$('preset').append(option);}
  $('source-rows').replaceChildren();for(const p of data.sourceLedger.periods){const row=el('tr');for(const value of [p.period,fmt(p.initialM3S),fmt(p.sumM3S-p.initialM3S),fmt(p.mouthM3S),fmt(p.residualM3S,10)])row.append(el('td',value));$('source-rows').append(row);}
  $('content').hidden=false;$('load-status').textContent='10개 가정 예제와 원본 별도 장부 검증 완료';restore();
 }catch(e){$('load-status').textContent='불러오지 못했습니다: '+e.message;$('retry').hidden=false;}
}
$('preset').addEventListener('change',()=>{const p=data.presets.find(x=>x.id===$('preset').value);if(!p){$('clear').click();return;}edit(p.input);reachId='';point=0;calculate(p.input);});
$('form').addEventListener('submit',e=>{e.preventDefault();reachId='';point=0;calculate(values());});
$('clear').addEventListener('click',()=>{clearResult();input=null;$('editor').hidden=true;$('preset').value='';history.pushState(null,'',location.pathname);$('run-status').textContent='예제를 선택하세요. 자동 기본값은 없습니다.';});
$('reach').addEventListener('change',()=>{reachId=$('reach').value;point=0;graph();share(true);});
$('point').addEventListener('input',()=>{point=Number($('point').value);graph();share(true);});
$('download').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'})),a=el('a');a.href=url;a.download='d298591-confluence-assumption.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('retry').addEventListener('click',load);addEventListener('popstate',()=>data&&restore());addEventListener('resize',()=>current&&graph());load();
