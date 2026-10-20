(function(root){
'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1}):'미정';
function mount({model,getState,update}){
  const box=$('landscape-comparison');let current=null;
  function refresh(){
    const s=getState(),q=LandscapeCompare.compare(model.landscapeCatalog,s.cell,s.draftFamily,s.period,s.comparePeriod);
    current=q;root.natureDebug.landscapeComparison=q;box.hidden=!q;
    const jump=$('landscape-compare-jump');jump.hidden=!q;
    if(!q){box.innerHTML='';return;}
    const focus=box.contains(document.activeElement)?document.activeElement.id:null;
    const options=selected=>Array.from({length:12},(_,i)=>`<option value="${i+1}" ${selected===i+1?'selected':''}>${i+1}기간 · ${i*30}°</option>`).join('');
    const card=(v,side)=>`<article class="comparison-period"><label for="compare-${side.toLowerCase()}">${side} · 공전 위상</label><select id="compare-${side.toLowerCase()}">${options(v.period)}</select>
      <dl><div><dt>기온</dt><dd>${fmt(v.temperatureC)} <small>°C</small></dd></div><div><dt>기간 강수</dt><dd>${fmt(v.precipitationMm)} <small>mm</small></dd></div><div><dt>유량 후보</dt><dd>${v.flowM3s===null?'미정':fmt(v.flowM3s)+' <small>m³/s</small>'}</dd></div></dl>
      <h4>모습 제안 · 미채택 초안</h4><p>${esc(v.appearanceDraft)}</p><button id="compare-map-${side.toLowerCase()}">${side==='B'?'B를 A로 옮겨 지도 보기':'A 기간 지도 보기'}</button></article>`;
    const delta=(k,unit)=>{const v=q.difference[k];return v===null?'미정':(v>0?'+':'')+fmt(v)+' '+unit;};
    box.innerHTML=`<div class="comparison-heading"><div><div class="section-label">TWO PERIODS · ONE LOCATION</div><h2 id="comparison-title">${esc(q.title)}</h2><p>원본 #${q.cell} · ${q.center[0]}°, ${q.center[1]}° · 대표 한 격자</p></div><button id="compare-swap">A ↔ B 바꾸기</button></div>
      <p class="comparison-note">두 공전 위상의 표본을 비교합니다. 지구의 달력 월이 아니며, 연속군 전체가 같은 환경이라는 뜻은 아닙니다.</p>
      <div class="comparison-columns">${card(q.left,'A')}${card(q.right,'B')}</div>
      <div class="comparison-difference" role="status" aria-live="polite"><b>${q.periodA===q.periodB?'같은 기간 비교':'차이 · B − A'}</b><span>기온 ${delta('temperatureC','°C')}</span><span>강수 ${delta('precipitationMm','mm')}</span><span>유량 후보 ${delta('flowM3s','m³/s')}</span></div>
      <p class="comparison-note">차이는 두 표본의 단순 뺄셈이며 시간 추세나 누적량이 아닙니다. 유량은 기존 기간 평균의 로그 양자화 표시값입니다. 색조 설명은 실제 적설·식생 생장·침수·결빙 계산이 아닙니다.</p>
      <p class="comparison-note">실제 숲·습지 면적, 강폭, 침수, 적설 경계, 얼음 두께와 서사 역할은 미정입니다.${!s.candidates?' 현재 지도에서는 계산 후보를 숨겼습니다.':''}</p>
      <div class="comparison-actions"><button id="compare-json">두 기간 비교 JSON ↓</button><button id="compare-copy">비교 링크 복사</button><a id="compare-link" href="${esc(LandscapeCompare.href(q))}">이 비교 주소 열기 ↗</a><span id="compare-copy-status" role="status"></span></div>`;
    $('compare-a').onchange=e=>update({period:+e.target.value});
    $('compare-b').onchange=e=>update({comparePeriod:+e.target.value});
    $('compare-swap').onclick=()=>update({period:q.periodB,comparePeriod:q.periodA});
    // Opening B leaves the two comparison columns intact: put B on the left (active map period).
    $('compare-map-a').onclick=()=>update({mode:'season',seasonal:true});
    $('compare-map-b').onclick=()=>update({period:q.periodB,comparePeriod:q.periodA,mode:'season',seasonal:true});
    $('compare-json').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`landscape-comparison-${q.id}-${q.periodA}-${q.periodB}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('compare-copy').onclick=async()=>{
      const status=$('compare-copy-status'),url=new URL(LandscapeCompare.href(q),location.href).href;
      try{await navigator.clipboard.writeText(url);status.textContent='비교 링크를 복사했습니다.';}
      catch{status.textContent='복사하지 못했습니다. 옆의 비교 주소 링크를 길게 누르거나 우클릭해 복사하세요.';}
    };
    if(focus)$(focus)?.focus({preventScroll:true});
  }
  $('landscape-compare-jump').onclick=()=>{box.scrollIntoView({behavior:'smooth',block:'start'});$('compare-a')?.focus({preventScroll:true});};
  return {refresh,get current(){return current;}};
}
root.LandscapeCompareUI={mount};
})(globalThis);
