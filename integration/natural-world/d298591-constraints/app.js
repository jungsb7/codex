'use strict';
(()=>{
 const V=ConstraintReview,$=id=>document.getElementById(id),fmt=(v,d=3)=>v.toLocaleString('ko-KR',{maximumFractionDigits:d}),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const defaults={cell:'274035',warming:'0',factor:'45',energy:'E2-G0.25-I0',rise:'0.1',tailwater:'0'};
 let data=null,current=null;
 function restore(){const p=new URLSearchParams(location.hash.slice(1));for(const [id,fallback]of Object.entries(defaults))$(id).value=[...$(id).options].some(o=>o.value===p.get(id))?p.get(id):fallback;render(false);}
 function grid(columns,color,selected){
  const xs=columns.map(c=>c.cell%1536),ys=columns.map(c=>Math.floor(c.cell/1536)),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(450/(x1-x0+1),285/(y1-y0+1)),ox=(500-(x1-x0+1)*scale)/2,oy=(330-(y1-y0+1)*scale)/2,center=cell=>[ox+(cell%1536-x0+.5)*scale,oy+(Math.floor(cell/1536)-y0+.5)*scale];
  return {center,markup:'<text x="15" y="22">N ↑</text>'+columns.map(c=>{const [x,y]=center(c.cell);return `<rect data-cell="${c.cell}" x="${x-scale/2}" y="${y-scale/2}" width="${scale-.35}" height="${scale-.35}" fill="${color(c)}" stroke="${c.cell===selected?'#fff':'none'}" stroke-width="2"><title>${c.cell} · ${fmt(c.elevationM)}m</title></rect>`;}).join('')};
 }
 function render(push=true){
  current=V.select(data,{cell:+$('cell').value,warmingC:+$('warming').value,meltFactor:+$('factor').value,energyId:$('energy').value,stageRiseM:+$('rise').value,tailwaterDepthM:+$('tailwater').value});window.constraintsDebug={data,current};
  const c=current.cell,s=current.snow,e=current.energy,o=current.outlet,r=o.level,g=o.guard,scenario=data.sensitivity.find(v=>v.id===s.id);
  const metric=(label,value,unit)=>`<div class="metric"><small>${label}</small><strong>${value}</strong><small>${unit}</small></div>`;
  $('snow-metrics').innerHTML=metric('유역 전체 연간 누적',fmt(s.annualSnowIncreaseM3/1e9),'km³ · 가정 온도식')+metric('누적 격자',s.accumulatingCells,'/ 619격자')+metric('선택 칸 연간 누적',fmt(s.selectedCellAccumulationMm),'mm 물당량')+metric('원본 선택 칸 누적',fmt(c.sourceSnowChangeMm),'mm 물당량');
  const snowGrid=grid(data.cells,v=>{const j=data.cells.indexOf(v);if(scenario.cellAccumulationMm[j]<=1e-7)return '#3b555b';return Math.max(...v.temperaturesC)+s.warmingC<=0?'#e9c88c':'#dd9387';},c.cell);$('snow-map').innerHTML=snowGrid.markup;
  $('cell-title').textContent=`원본 격자 ${c.cell}`;$('cell-detail').textContent=`고도 ${fmt(c.elevationM)}m · ${fmt(c.longitude)}°, ${fmt(c.latitude)}°. ${c.insidePriorColumns?'기존121수면 기둥 안':'기존121수면 기둥 밖'}. 원본 계수에서 연간 누적을 없애는 기온 증가의 수학적 경계: ${c.balanceWarmingC===null?'20℃ 이내 없음':fmt(c.balanceWarmingC)+'℃'} · 실제 기후 조정 권고가 아닙니다.`;
  $('cell-periods').innerHTML=c.temperaturesC.map((t,k)=>`<tr><td>${k+1}</td><td>${fmt(t,2)}</td><td>${fmt(c.precipitationMm[k],2)}</td></tr>`).join('');
  $('energy-result').textContent=`고정 가정 수면 ${fmt(e.areaM2/1e6,1)}km² · 잠열 요구 ${fmt(e.requiredLatentWm2,2)}W/m². ${e.shortwaveGapPeriods.length?e.shortwaveGapPeriods.join('·')+'기간에서 대기권 상단 일사보다 큽니다.':'모든 기간에서 대기권 상단 일사보다 작습니다.'} 두 경우 모두 실제 증발률은 미정입니다.`;
  const max=Math.max(...e.periods.map(p=>p.toaWm2),e.requiredLatentWm2)*1.12,x=k=>65+k*72,y=v=>225-190*v/max;
  $('energy-chart').innerHTML=`<title>대기권 상단 일사와 가정 잠열 요구, 실제 열수지 아님</title><path d="M65 225H857" stroke="#31505a"/><polyline points="${e.periods.map((p,k)=>`${x(k)},${y(p.toaWm2)}`).join(' ')}" fill="none" stroke="#79d6d0" stroke-width="3"/><path d="M65 ${y(e.requiredLatentWm2)}H857" stroke="#e9c88c" stroke-width="3" stroke-dasharray="8 5"/>${e.periods.map((p,k)=>`<text x="${x(k)-5}" y="252">${k+1}</text>`).join('')}<text x="8" y="30">W/m²</text><text x="8" y="${y(e.requiredLatentWm2)+4}">${fmt(e.requiredLatentWm2,0)}</text><text x="15" y="229">0</text>`;
  $('energy-periods').innerHTML=e.periods.map(p=>`<tr><td>${p.period}</td><td>${fmt(p.toaWm2,2)}</td><td>${fmt(p.latentToToaRatio,3)}</td><td>${fmt(p.meanDiagnosticWindMps,2)}</td></tr>`).join('');
  $('outlet-metrics').innerHTML=metric('차단 가정에서 연결된 칸',fmt(r.gateHeld.cellCount,0),'원본 격자 · 실제 침수 아님')+metric('기존121칸 밖 추가 연결',fmt(r.gateHeld.extraCells.length,0),'격자')+metric('우회 해양 연결',r.gateHeld.marineContactCount?'열림':'없음','선택 수위의 D8 연결')+metric('첫 우회 연결 수위 상승',fmt(o.bypass.riseM,6),'m · 원본 격자의 문턱');
  $('outlet-result').textContent=`기존 출구를 열어 두면 ${fmt(r.open.cellCount,0)}육지 격자가 해양까지 연결됩니다. 출구 연결 하나를 차단해도 +${fmt(o.bypass.riseM,6)}m부터 다른 경로가 열립니다. 이 수치는 실제 제방 높이나 안전 여유가 아닙니다.`;
  const connected=new Set(r.gateHeld.cells),local=grid(data.outlet.localColumns,v=>connected.has(v.cell)?v.insidePriorColumns?'#79d6d0':'#dd9387':'#3b555b'),p=o.gate.map(local.center);$('outlet-map').innerHTML=local.markup+`<path d="M${p[0].join(' ')}L${p[1].join(' ')}" stroke="#ff7d73" stroke-width="4"/><text x="12" y="338">주변 일부 표시 · 지도 밖 연결도 집계</text>`;
  const flow={'no-positive-head':'양의 수두가 없어 자유 월류식으로 양의 방류를 만들 수 없습니다.','tailwater-correction-required':'하류가 문턱 위이므로 잠김 보정 없이 자유 월류식을 적용할 수 없습니다.','free-flow-assumption-only':'자유 흐름을 가정한 상태입니다. 실제 단면·유효 폭·유속·하류 수위의 근거는 없습니다.'},domain={'alternate-marine-path':'한 출구만으로 막히지 않는 우회 해양 연결이 있습니다.','additional-columns-and-forcing-required':'새로 연결된 격자의 물수지와 주변 지형을 계산 영역에 포함해야 합니다.','native-columns-contained-under-deleted-edge':'연결 하나를 막는 가정에서는 기존 기둥 안에 머뭅니다. 실제 출구 단면이 확보됐다는 뜻은 아닙니다.'};
  $('guard').textContent=domain[g.domainStatus]+' '+flow[g.freeFlowScreen]+' 실제 방류는 미정이며 원본 수계에 자동 연결하지 않습니다.';
  $('availability').innerHTML=data.summary.availability.map(a=>`<tr><td>${esc(a.quantity)}</td><td>${esc(a.status)}</td><td>${esc(a.use)}</td></tr>`).join('');
  const hash='#'+new URLSearchParams(Object.keys(defaults).map(id=>[id,$(id).value]));if(location.hash!==hash)history[push?'pushState':'replaceState'](null,'',hash);$('share-link').href=hash;
  $('map-link').href='../unified-atlas/index.html#'+new URLSearchParams({mode:'terrain',cell:String(c.cell),lon:c.longitude,lat:c.latitude,zoom:8});
 }
 async function load(){
  data=null;current=null;window.constraintsDebug=null;$('content').hidden=true;$('retry').hidden=true;$('status').textContent='검증된 자료를 읽는 중…';
  try{
   const mr=await fetch('output/manifest.json');if(!mr.ok)throw Error('목록 HTTP '+mr.status);const m=await mr.json();if(m.schema!=='d298591-constraints-manifest/1'||m.file!=='review.json.gz')throw Error('목록 형식 불일치');
   const rr=await fetch('output/'+m.file);if(!rr.ok)throw Error('자료 HTTP '+rr.status);const b=await rr.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');if(b.byteLength!==m.bytes||sha!==m.sha256)throw Error('자료 크기·해시 불일치');
   data=V.validate(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).json());
   $('cell').innerHTML=[...data.cells].sort((a,b)=>b.sourceSnowChangeMm*b.areaM2-a.sourceSnowChangeMm*a.areaM2).map(c=>`<option value="${c.cell}">${c.cell} · ${fmt(c.elevationM,0)}m · 누적 ${fmt(c.sourceSnowChangeMm,1)}mm</option>`).join('');
   $('energy').innerHTML=data.energy.map(e=>`<option value="${e.id}">${e.id} · 증발 ${e.evaporationMPerYear}m/년 · 수면 ${e.maskCells.length}격자</option>`).join('');
   restore();$('content').hidden=false;$('status').textContent='원본 적설 원인·에너지 입력·출구 범위 검토 완료 · 실제 물리값은 미정';
  }catch(e){$('status').textContent='자료를 읽지 못했습니다: '+e.message;$('retry').hidden=false;}
 }
 for(const id of Object.keys(defaults))$(id).addEventListener('change',()=>render());
 $('snow-map').addEventListener('click',event=>{const id=event.target.closest('[data-cell]')?.dataset.cell;if(id){$('cell').value=id;render();}});
 addEventListener('popstate',()=>{if(data)restore();});$('retry').addEventListener('click',load);
 $('download').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`D298591-constraints-${current.cell.cell}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 load();
})();
