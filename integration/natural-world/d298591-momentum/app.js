'use strict';
const M=MomentumCandidate,V=MomentumView,$=id=>document.getElementById(id),clone=p=>JSON.parse(JSON.stringify(p)),fmt=(n,d=3)=>n===null||n===undefined?'null':(n!==0&&Math.abs(n)<10**(-d)?Number(n).toExponential(2):Number(n).toLocaleString('ko-KR',{maximumFractionDigits:d}));
const names={completed:'가정 장부 통과','held-momentum':'운동량 불일치 · 보류','held-energy':'에너지 조건 · 보류','held-boundary':'경계 보류','held-domain':'수면 해 보류'};
const reasons={'bank-limit':'하류 수심이 가정 둑 높이에 도달했습니다.','critical-or-supercritical':'하류 경계가 지원하는 아임계 범위 밖입니다.','critical-domain-limit':'허용 아임계 범위 안에 공통 수면 해가 없습니다.','bank-domain-limit':'가정 둑 범위 안에 공통 수면 해가 없습니다.','no-shared-subcritical-bank-domain':'두 유입의 허용 수면 범위가 겹치지 않습니다.','unbalanced-external-force':'종방향 시험 수면을 구했지만 명시한 외력으로 전체 운동량이 맞지 않습니다. 추가 필요 힘은 진단이며 자동 적용하지 않습니다.','external-work-or-other-assumption-needed':'운동량은 맞지만 에너지 공급이 필요합니다. 외부 기계 일률 0 가정과 양립하지 않아 보류합니다.'};
let data=null,input=null,current=null;window.momentumDebug=null;
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function clearResult(){current=null;window.momentumDebug=null;$('result').hidden=true;}
function field(parent,label,path,value){const l=el('label',label),n=el('input');n.type='number';n.step='any';n.dataset.path=JSON.stringify(path);n.value=value;l.append(n);parent.append(l);n.addEventListener('input',()=>{clearResult();$('run-status').textContent='입력이 바뀌었습니다. 다시 검산하세요.';});}
function edit(p){
 input=clone(p);$('editor').hidden=false;$('fields').replaceChildren();
 const common=el('div',undefined,'fields');$('fields').append(common);field(common,'가정 중력 m/s²',['gravityMPerS2'],p.gravityMPerS2);field(common,'가정 밀도 kg/m³',['densityKgM3'],p.densityKgM3);field(common,'유출 경계 수심 m',['outlet','depthM'],p.outlet.depthM);
 for(const[s,path,label]of [...p.inlets.map((s,i)=>[s,['inlets',i],`유입 ${s.id}`]),[p.outlet,['outlet'],`유출 ${p.outlet.id} · 유량은 두 유입 합산`]]){
  const box=el('details',undefined,'reach-input');box.append(el('summary',label));const row=el('div',undefined,'fields');box.append(row);
  for(const[k,l]of [['widthM','가정 폭 m'],['bedM','가상 바닥 높이 m'],['bankDepthM','바닥 위 둑 높이 m']])field(row,l,[...path,k],s[k]);
  if(path[0]==='inlets')for(const[k,l]of [['flowM3S','가정 유량 m³/s'],['angleDeg','유출 방향 기준 각도 °'],['comparisonLossM','에너지 비교용 손실 m']])field(row,l,[...path,k],s[k]);
  $('fields').append(box);
 }
 const force=el('details',undefined,'reach-input');force.append(el('summary','명시한 외력 · 벽 / 바닥 압력 / 마찰'));
 for(const[k,label]of [['wallN','벽 힘'],['bedPressureN','바닥 압력 힘'],['frictionN','마찰력']]){force.append(el('p',label));const row=el('div',undefined,'fields');for(const axis of ['x','y'])field(row,`${label} ${axis} 방향 N`,['forces',k,axis],p.forces[k][axis]);force.append(row);}
 $('fields').append(force);
}
function values(){const p=clone(input);for(const n of $('fields').querySelectorAll('input')){const keys=JSON.parse(n.dataset.path);let at=p;for(const k of keys.slice(0,-1))at=at[k];at[keys.at(-1)]=n.value.trim()===''?null:Number(n.value);}return p;}
function share(push){const hash='#'+new URLSearchParams({input:JSON.stringify(input)}).toString();$('share-link').href=hash;if(push&&location.hash!==hash)history.pushState(null,'',hash);}
function metric(label,value){const x=el('div',undefined,'metric');x.append(el('span',label),el('strong',value));$('metrics').append(x);}
function forceRow(label,f){const row=el('tr');for(const v of [label,fmt(f.x/1000,3),fmt(f.y/1000,3)])row.append(el('td',v));$('force-rows').append(row);}
function diagram(){
 const svg=$('directions');svg.replaceChildren();const mobile=innerWidth<600,w=mobile?420:600,cx=w/2,cy=120,len=95;svg.setAttribute('viewBox',`0 0 ${w} 240`);
 const node=(name,attrs,text)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;if(name==='text')n.style.fontSize=(mobile?17:13)+'px';svg.append(n);return n;};
 node('text',{x:12,y:20},'+x: 유출 방향 → · +y: 위쪽');
 input.inlets.forEach((s,i)=>{const a=s.angleDeg*Math.PI/180,x=cx-len*Math.cos(a),y=cy+len*Math.sin(a),color=i?'#9264a3':'#168196';node('line',{x1:x,y1:y,x2:cx,y2:cy,stroke:color,'stroke-width':i?3:6});const ax=cx-12*Math.cos(a),ay=cy+12*Math.sin(a);node('polyline',{points:`${ax+5*Math.sin(a)},${ay+5*Math.cos(a)} ${cx},${cy} ${ax-5*Math.sin(a)},${ay-5*Math.cos(a)}`,fill:'none',stroke:color,'stroke-width':2});node('text',{x:12,y:200+i*22,fill:color},`${s.id}: ${fmt(s.flowM3S)} m³/s · ${fmt(s.angleDeg)}°`);});
 node('line',{x1:cx,y1:cy,x2:w-25,y2:cy,stroke:'#c5782f','stroke-width':4});node('polyline',{points:`${w-37},${cy-6} ${w-25},${cy} ${w-37},${cy+6}`,stroke:'#c5782f',fill:'none','stroke-width':3});node('circle',{cx,cy,r:5,fill:'#274b50'});node('text',{x:w-25,y:cy-20,'text-anchor':'end'},'유출 '+fmt(input.inlets.reduce((q,s)=>q+s.flowM3S,0))+' m³/s');
}
function render(){
 const r=current.candidate,t=r.trial;$('result').hidden=false;$('outcome').textContent=names[r.status];$('reason').textContent=r.reason?reasons[r.reason]:'명시한 힘과 근사 조건에서 장부가 수치 허용오차 안에 맞습니다. 실제 합류 형상·손실을 채택한 결과가 아닙니다.';
 $('metrics').replaceChildren();metric(r.accepted?'가정 공통 유입 수면':'미채택 시험 수면',t?fmt(t.commonInletWaterM,6)+' m':'null');metric('검산 판정',r.accepted?'통과 · 실제값 아님':'보류 · 미채택');metric('필요 소산 일률',t?fmt(t.audit.energy.requiredDissipationW/1000,6)+' kW':'null');
 diagram();$('force-rows').replaceChildren();for(const[k,label]of [['wallN','입력: 벽'],['bedPressureN','입력: 바닥 압력'],['frictionN','입력: 마찰']])forceRow(label,input.forces[k]);
 if(t){forceRow('입력한 힘 합계',t.audit.suppliedForceN);forceRow('시험 수면에 필요한 힘',t.audit.requiredForceN);forceRow('추가 필요 힘 · 미적용',t.audit.additionalForceRequiredN);forceRow('운동량 잔차',t.audit.momentumResidualN);}
 $('force-note').textContent=t?`힘 단위는 kN입니다. 질량 잔차 ${fmt(t.audit.massResidualM3S,8)}m³/s · 운동량 허용오차 ${fmt(t.audit.forceToleranceN,6)}N. 추가 필요 힘을 자동으로 채우지 않습니다.`:'공통 수면 시험값이 없어 필요한 힘과 운동량 잔차는 null입니다.';
 $('energy-note').textContent=t?`에너지 허용오차 ${fmt(t.audit.energy.toleranceW,6)}W. 소산이 음수면 외부 공급 등이 필요합니다. 미세한 음수도 0으로 바꾸지 않고 그대로 표시합니다. 비음수는 실제 소산 법칙을 검증한 결과가 아닙니다.`:'에너지 필요조건 검산도 미계산입니다.';
 $('sections').replaceChildren();if(t)for(const s of t.inlets){const box=el('div',undefined,'junction');box.append(el('strong',s.id+' · '+(r.accepted?'가정 단면':'미채택 시험 단면')),el('p',`수심 ${fmt(s.depthM,6)}m · 수면 ${fmt(s.waterM,6)}m · Fr ${fmt(s.froude,6)}`),el('p',`정수압 힘 ${fmt(s.pressureN/1000)}kN · 운동량 유속항 ${fmt(s.momentumFluxN/1000)}kN`));$('sections').append(box);}
 $('comparison').replaceChildren();const c=r.energyComparison;
 if(c?.status==='computed-comparison'){
  for(const s of c.states)$('comparison').append(el('p',`${s.id}: 에너지 가정 수면 ${fmt(s.waterM,6)}m · 운동량 시험 수면 ${t?fmt(t.inlets.find(x=>x.id===s.id).waterM,6):'null'}m`));
  $('comparison').append(el('p',`에너지 가정의 추가 필요 힘: x ${fmt(c.audit.additionalForceRequiredN.x/1000)}kN / y ${fmt(c.audit.additionalForceRequiredN.y/1000)}kN. 이 비교값을 운동량 계산 입력으로 넣지 않습니다.`),el('p',`에너지 가정 상태의 운동량: ${c.audit.momentumPassed?'허용오차 안':'불일치'} · 필요 소산 ${fmt(c.audit.energy.requiredDissipationW/1000)}kW.`));
 }else $('comparison').append(el('p','에너지 비교도 보류 또는 미계산입니다. '+(c?.reason??'')));
 window.momentumDebug={current};share(false);
}
function calculate(p,push=true){clearResult();const errors=M.validate(p);if(errors.length){$('run-status').textContent='계산하지 않았습니다. '+errors.join(' ');return;}input=clone(p);current=V.result(data,input);$('run-status').textContent='명시한 설계 가정의 검산 결과입니다.';render();share(push);}
function restore(){
 clearResult();const params=new URLSearchParams(location.hash.slice(1));if(!params.has('input')){input=null;$('preset').value='';$('editor').hidden=true;$('example-note').textContent='';$('run-status').textContent='예제를 선택하세요. 자동 기본값은 없습니다.';return;}
 try{const p=JSON.parse(params.get('input')),errors=M.validate(p);if(errors.length)throw Error(errors.join(' '));edit(p);const preset=data.presets.find(x=>JSON.stringify(x.input)===JSON.stringify(p));$('preset').value=preset?.id??'';$('example-note').textContent=preset?.note??'공유된 명시적 가정';calculate(p,false);}
 catch(e){input=null;$('editor').hidden=true;$('run-status').textContent='공유 입력을 계산하지 않았습니다. '+e.message;}
}
async function load(){
 clearResult();$('content').hidden=true;$('retry').hidden=true;$('load-status').textContent='자료를 검증하는 중…';
 try{const a=await fetch('output/manifest.json',{cache:'no-store'});if(!a.ok)throw Error('목록 HTTP '+a.status);const m=await a.json();if(m.schema!=='d298591-momentum-manifest/1'||m.file!=='catalog.json'||!Number.isInteger(m.bytes)||!/^[a-f0-9]{64}$/.test(m.sha256))throw Error('목록 형식');const b=await fetch('output/catalog.json',{cache:'no-store'});if(!b.ok)throw Error('자료 HTTP '+b.status);const bytes=await b.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==m.bytes||hash!==m.sha256)throw Error('자료 크기/해시');data=V.validate(JSON.parse(new TextDecoder().decode(bytes)));$('preset').replaceChildren(el('option','선택 안 함 · 자동 기본값 없음'));$('preset').firstChild.value='';for(const p of data.presets){const option=el('option',p.label);option.value=p.id;$('preset').append(option);}$('content').hidden=false;$('load-status').textContent='13개 명시적 가정 자료 검증 완료';restore();}
 catch(e){$('load-status').textContent='불러오지 못했습니다: '+e.message;$('retry').hidden=false;}
}
$('preset').addEventListener('change',()=>{const p=data.presets.find(x=>x.id===$('preset').value);if(!p){$('clear').click();return;}edit(p.input);$('example-note').textContent=p.note;calculate(p.input);});
$('form').addEventListener('submit',e=>{e.preventDefault();calculate(values());});
$('clear').addEventListener('click',()=>{clearResult();input=null;$('editor').hidden=true;$('preset').value='';$('example-note').textContent='';history.pushState(null,'',location.pathname);$('run-status').textContent='예제를 선택하세요. 자동 기본값은 없습니다.';});
$('download').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'})),a=el('a');a.href=url;a.download='d298591-momentum-assumption.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('retry').addEventListener('click',load);addEventListener('popstate',()=>data&&restore());addEventListener('resize',()=>current&&diagram());load();
