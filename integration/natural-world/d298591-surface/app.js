'use strict';
(()=>{
 const V=SurfaceReview,$=id=>document.getElementById(id),fmt=(n,d=3)=>n.toLocaleString('ko-KR',{maximumFractionDigits:d});
 let data=null,current=null;
 function restore(){
  const p=new URLSearchParams(location.hash.slice(1));
  for(const [key,fallback]of [['evap','1'],['ground','0.25'],['initial','0']])$(key).value=[...$(key).options].some(o=>o.value===p.get(key))?p.get(key):fallback;
  const y=Number(p.get('year'));$('year').value=Number.isInteger(y)&&y>=1&&y<=100?String(y):'100';render(false);
 }
 function render(push=true){
  const id=`E${$('evap').value}-G${$('ground').value}-I${$('initial').value}`,year=+$('year').value;
  current=V.select(data,id,year);window.surfaceDebug={data,current};const c=current.scenario,r=current.selectedYear,s=data.summary;
  $('year-label').textContent=year+'년차';$('ledger-title').textContent=year+'년차의 물수지';
  const metric=(label,value,unit)=>`<div class="metric"><small>${label}</small><strong>${value}</strong><small>${unit}</small></div>`;
  $('metrics').innerHTML=metric('연말 가정 재고',fmt(r.poolM3/1e9),'km³')+metric('연말 가정 수면',fmt(r.areaM2/1e6,0),'km² · '+r.wetCells.length+'격자')+metric('해당 연도 미배분 초과',fmt(r.boundaryExcessM3/1e9),'km³')+metric('최초 체적 초과',c.firstExcess?c.firstExcess.year+'년차':'없음',c.firstExcess?c.firstExcess.period+'공전 기간':'100년 반복 조건 안에서');
  const columns=data.model.columns,wet=new Set(r.wetCells),xs=columns.map(c=>c.cell%1536),ys=columns.map(c=>Math.floor(c.cell/1536)),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(430/(x1-x0+1),250/(y1-y0+1)),ox=(500-(x1-x0+1)*scale)/2,oy=(310-(y1-y0+1)*scale)/2;
  $('map').innerHTML='<title>선택 연도 말 조건부 수면, 실제 침수 범위 아님</title>'+columns.map(c=>`<rect x="${ox+(c.cell%1536-x0)*scale}" y="${oy+(Math.floor(c.cell/1536)-y0)*scale}" width="${scale-.5}" height="${scale-.5}" fill="${wet.has(c.cell)?'#79d6d0':'#9c885b'}"><title>${c.cell} · 원본 ${fmt(c.elevationM)}m · ${wet.has(c.cell)?'가정 수면':'육지 계산'}</title></rect>`).join('')+'<text x="18" y="26">N ↑</text><text x="18" y="315">원본 지형 격자 · 실제 세부 경계 아님</text>';
  const y=v=>275-230*v/s.capacityM3,points=[[55,y(c.options.initialPoolM3)],...c.annual.map(a=>[55+425*a.year/100,y(a.poolM3)])].map(p=>p.join(',')).join(' ');
  $('chart').innerHTML=`<title>100년간의 가정 재고</title><path d="M55 45H480M55 275H480" stroke="#31505a" stroke-dasharray="4 4"/><polyline points="${points}" fill="none" stroke="#e9c88c" stroke-width="3"/><path d="M${55+425*year/100} 45V275" stroke="#79d6d0"/><circle cx="${55+425*year/100}" cy="${y(r.poolM3)}" r="5" fill="#79d6d0"/><text x="5" y="49">100%</text><text x="18" y="279">0%</text><text x="55" y="305">시작</text><text x="430" y="305">100년</text>`;
  const terms=[['precipitationM3','강수','전체 집수권 입력'],['landEvaporationM3','− 육지 증발산','육지 계산 칸만'],['waterEvaporationM3','− 수면 증발','젖은 수면 · 가정 손실'],['netGroundLossM3','− 외부 지하수 순손실','집수권 밖으로 나가는 가정 항'],['boundaryExcessM3','− 체적 초과 미배분','실제 방류가 아님'],['snowChangeM3','= 눈 저장 변화','원본 온도식 · 수량 환산'],['shallowChangeM3','+ 얕은 저장 변화','잠긴 칸의 저장은 보존'],['poolChangeM3','+ 수면 재고 변화','원본 지형의 기둥체적']];
  $('ledger').innerHTML=terms.map(([key,label,meaning])=>`<tr><td>${label}</td><td>${fmt(r[key]/1e9,5)}</td><td>${meaning}</td></tr>`).join('');
  $('closure').textContent=`100년 독립 재고 잔차 ${fmt(c.totals.residualM3,6)} m³ · 최대 기간 잔차 ${fmt(c.maxPeriodResidualM3,6)} m³. 선택 연도 내부 이동: 육지 유출 ${fmt(r.landRunoffM3/1e9)} km³, 수면 직접 강수·융설 ${fmt(r.directWaterM3/1e9)} km³.`;
  $('outlet').innerHTML=`<p>최대 기간 평균 초과율 <strong>${fmt(c.peakPeriodExcess.meanRateM3S,1)} m³/s</strong> · ${c.peakPeriodExcess.year}년차 ${c.peakPeriodExcess.period}기간</p><div class="table-wrap"><table><thead><tr><th>가정 에너지 수두</th><th>필요 유효 폭 범위</th></tr></thead><tbody>${current.outlet.requiredWidths.map(x=>`<tr><td>${x.headM} m</td><td>${fmt(x.minWidthM,1)}–${fmt(x.maxWidthM,1)} m</td></tr>`).join('')}</tbody></table></div>`;
  if(c.peakPeriodExcess.meanRateM3S===0)$('outlet').textContent='이 조건에서는 100년 동안 체적 초과가 없어 필요한 폭의 양의 하한을 얻지 못합니다. 실제 출구 폭·수두·방류량은 여전히 미정입니다.';
  $('source').innerHTML=`<p>원본 육지 강수 <strong>${fmt(s.sourceEvidence.annual.precipitationM3/1e9)} km³/년</strong> · 증발산 ${fmt(s.sourceEvidence.annual.evaporationM3/1e9)} · 유출 ${fmt(s.sourceEvidence.annual.runoffM3/1e9)}. 국지 웅덩이 ${s.localPonds}곳, 출구 연결 높이 ${fmt(s.crestM)}m.</p>`;
  const hash='#'+new URLSearchParams({evap:$('evap').value,ground:$('ground').value,initial:$('initial').value,year:String(year)});if(location.hash!==hash)history[push?'pushState':'replaceState'](null,'',hash);$('share-link').href=hash;
 }
 async function load(){
  data=null;current=null;window.surfaceDebug=null;$('content').hidden=true;$('retry').hidden=true;$('status').textContent='검증된 자료를 읽는 중…';
  try{
   const mr=await fetch('output/manifest.json');if(!mr.ok)throw Error('목록 HTTP '+mr.status);const m=await mr.json();
   if(m.schema!=='d298591-surface-manifest/1'||m.file!=='review.json.gz')throw Error('목록 형식 불일치');
   const rr=await fetch('output/'+m.file);if(!rr.ok)throw Error('자료 HTTP '+rr.status);const b=await rr.arrayBuffer(),sha=[...new Uint8Array(await crypto.subtle.digest('SHA-256',b))].map(v=>v.toString(16).padStart(2,'0')).join('');
   if(b.byteLength!==m.bytes||sha!==m.sha256)throw Error('자료 크기·해시 불일치');
   data=V.validate(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).json());restore();$('content').hidden=false;$('status').textContent='12조건 계산·원본 장부 대조 완료 · 실제 물리값은 미정';
  }catch(e){$('status').textContent='자료를 읽지 못했습니다: '+e.message;$('retry').hidden=false;}
 }
 for(const key of ['evap','ground','initial'])$(key).addEventListener('change',()=>render());
 $('year').addEventListener('input',()=>render(false));$('year').addEventListener('change',()=>render());
 addEventListener('popstate',()=>{if(data)restore();});$('retry').addEventListener('click',load);
 $('download').addEventListener('click',()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`D298591-${current.scenario.id}-year${current.selectedYear.year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 load();
})();
