'use strict';
(()=>{
  const B=DownstreamBudget,$=id=>document.getElementById(id),fmt=(n,d=3)=>n.toLocaleString('ko-KR',{maximumFractionDigits:d}),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let data=null,current=null;
  function restore(){
    const p=new URLSearchParams(location.hash.slice(1)),id=p.get('group');
    $('representative').value=data.representatives.some(g=>g.id===id)?id:data.representatives[0].id;
    for(const [id,key,fallback]of [['loss','loss','0'],['years','years','100'],['initial','initial','0']]){
      const value=p.get(key);$(id).value=Array.from($(id).options).some(o=>o.value===value)?value:fallback;
    }
    render(false);
  }
  function lookup(value){
    const q=B.query(data,value),box=$('lookup-result');
    if(!q){box.textContent='해당 미정 경계·물길이 없습니다. 해양 연결 물길은 이 목록에 포함하지 않습니다.';return;}
    const g=q.group||q;
    box.innerHTML=`<h3>${esc(g.id)} · ${esc(g.regionName)}</h3><p>${q.reach?'물길 #'+q.reach.id+' → ':''}${esc(B.CLASSES[g.category])}</p><p>종착 물길 ${fmt(g.reachCount,0)}구간 · 집수 ${fmt(g.catchmentCells,0)}격자 · 원본 경계 유입 ${fmt(g.annualInflowM3/1e9)} km³/년</p><p>출구 후보 → ${esc(g.outletTarget.id)} · 고온 공백 ${g.hotPETGapCells}격자 · 극지 공백 ${g.polarGapCells}격자</p><p>실제 저류·침투·증발·넘침: 미정</p>`;
  }
  function render(push=true){
    const g=data.representatives.find(g=>g.id===$('representative').value);
    const options={years:+$('years').value,lossMPerYear:+$('loss').value,initialFraction:+$('initial').value},e=B.experiment(g,options);
    current={review:g,experiment:e,provenance:data.provenance};window.budgetDebug={data,current};
    const first=e.firstExcess?`${e.firstExcess.year}년차 ${e.firstExcess.period}기간`:`${e.years}년 안에 없음`;
    const metric=(label,value,unit)=>`<div class="metric"><small>${label}</small><strong>${value}</strong><small>${unit}</small></div>`;
    const points=[[75,205-170*e.initialFraction],...e.periods.filter((r,i)=>i%12===11).map(r=>[75+580*r.year/e.years,205-170*r.endInventoryM3/e.capacityM3])].map(p=>p.join(',')).join(' ');
    $('budget').innerHTML=`<h3>${esc(g.id)} · ${esc(g.regionName)}</h3><p>${esc(g.selection)} · 원본 유입 ${fmt(g.annualInflowM3/1e9)} km³/년 · 출구 후보 ${esc(g.outletTarget.id)}</p>
      ${g.category!=='ocean'?`<p class="warning">${esc(B.CLASSES[g.category])}. 이 실험은 해당 공백을 해소하지 않습니다.</p>`:''}
      <div class="metrics">${metric('문턱 높이의 기하학적 체적',fmt(e.capacityM3/1e9),'km³ · 실제 저류량 아님')}${metric('실험 종료 가정 재고',fmt(e.finalInventoryM3/1e9),'km³')}${metric('누적 체적 초과분',fmt(e.totalCapacityExcessM3/1e9),'km³ · 하류 미배분')}${metric('첫 체적 초과',first,'원본 유입 반복 실험의 시점')}${metric('해당 기간의 필요 평균 손실 하한',fmt(e.necessaryAverageLossMPerYear),'m/년 · 고정 기준 면적 환산')}${metric('연 유입과 균형을 이루는 등가 손실',fmt(e.steadyBalanceLossMPerYear),'m/년 · 물리적으로 가능한 값이라는 뜻 아님')}</div>
      <h4>가정 재고 / 문턱 체적</h4><svg class="chart" viewBox="0 0 700 250" role="img" aria-label="${e.years}년간의 조건부 재고 비율, 실제 수위가 아님"><path d="M75 35H655M75 205H655" stroke="#4c6767" stroke-dasharray="4 4"/><polyline points="${points}" fill="none" stroke="#e4c27d" stroke-width="3"/><text x="5" y="39">100%</text><text x="16" y="209">0%</text><text x="75" y="235">시작</text><text x="610" y="235">${e.years}년</text></svg>
      <p class="note">필요 손실 하한은 전체 기간 총량에서 얻은 필요조건입니다. 특정 시기의 넘침 방지나 충분조건을 보장하지 않습니다. 초과분은 즉시 내보낸다고 가정한 재고 장부의 미배분 항이며 실제 방류량이 아닙니다.</p>
      <p class="note">수지: 초기 재고 + 유입 − 적용 순손실 − 체적 초과분 − 최종 재고. 누적 잔차 ${fmt(e.cumulativeResidualM3,6)} m³. 기준 면적 ${fmt(e.referenceAreaM2/1e6)} km²는 실제 침수 범위가 아닙니다.</p>`;
    const hash='#'+new URLSearchParams({group:g.id,loss:$('loss').value,years:$('years').value,initial:$('initial').value});
    if(location.hash!==hash)history[push?'pushState':'replaceState'](null,'',hash);
    $('share-link').href=hash;
    $('map-link').href='../unified-atlas/index.html#'+new URLSearchParams({mode:'drainage',cell:g.node,lon:g.location[0],lat:g.location[1],zoom:8});
  }
  async function load(){
    $('status').textContent='검증된 자료를 읽는 중…';$('retry').hidden=true;$('content').hidden=true;data=null;current=null;window.budgetDebug=null;
    try{
      const mr=await fetch('output/manifest.json');if(!mr.ok)throw Error('목록 HTTP '+mr.status);
      const m=await mr.json();if(m.schema!=='downstream-boundary-manifest/1'||m.file!=='review.json.gz')throw Error('목록 형식 불일치');
      const r=await fetch('output/'+m.file);if(!r.ok)throw Error('자료 HTTP '+r.status);
      const bytes=await r.arrayBuffer(),sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      if(bytes.byteLength!==m.bytes||sha!==m.sha256)throw Error('자료 크기·해시 불일치');
      data=B.validate(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json());
      $('categories').innerHTML=data.summary.categories.filter(c=>c.boundaries).map(c=>`<tr><td>${esc(c.label)}</td><td>${fmt(c.boundaries,0)}</td><td>${fmt(c.reaches,0)}</td></tr>`).join('');
      $('representative').innerHTML=data.representatives.map(g=>`<option value="${g.id}">${g.id} · ${esc(g.regionName)}</option>`).join('');
      $('status').textContent='전 구간 분류·대표6유역 장부 검증 완료 · 실제 물리 해결 0구간';
      $('content').hidden=false;restore();
    }catch(e){$('status').textContent='자료를 읽지 못했습니다: '+e.message;$('retry').hidden=false;}
  }
  $('retry').onclick=load;$('lookup').onsubmit=e=>{e.preventDefault();if(data)lookup($('query').value);};
  for(const id of ['representative','loss','years','initial'])$(id).onchange=()=>render();
  $('download').onclick=()=>{if(!current)return;const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download=`downstream-${current.review.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('popstate',()=>{if(data)restore();});
  load();
})();
