(function(root){
'use strict';
const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=v=>Number.isFinite(v)?v.toLocaleString('ko-KR',{maximumFractionDigits:1}):'미정';
function mount({model,getState,update}){
  let catalog=null,pending=false,error='';
  $('landscape-notes-tools').innerHTML='<div class="section-label">LANDSCAPE STORIES</div><h2>대표 경관 30곳</h2><label for="landscape-note-select">설명·계절 모습 초안</label><select id="landscape-note-select" disabled><option value="">자료 읽는 중…</option></select><p id="landscape-notes-status" class="hint" role="status"></p><button id="landscape-notes-retry" hidden>경관 설명 다시 읽기</button><a href="../landscape-notes/CATALOG.md">30경관 설명·근거 ↗</a>';
  async function load(){
    if(pending)return;pending=true;error='';refresh();
    try{
      const response=await fetch('../landscape-notes/output/manifest.json');if(!response.ok)throw Error('설명 목록 응답 '+response.status);const mf=await response.json();
      if(mf.schema!=='landscape-description-manifest/1'||mf.atlasSHA256!==model.atlasSHA256||mf.file!=='catalog.json')throw Error('경관 설명과 지도 버전이 다릅니다.');
      const r=await fetch('../landscape-notes/output/catalog.json');if(!r.ok)throw Error('경관 설명 응답 '+r.status);
      const bytes=await r.arrayBuffer();if(bytes.byteLength!==mf.bytes||await SeasonStream.digest(bytes)!==mf.sha256)throw Error('경관 설명 크기·해시가 다릅니다.');
      catalog=LandscapeNotes.validate(JSON.parse(new TextDecoder().decode(bytes)),model);
      $('landscape-note-select').innerHTML='<option value="">대표 지점 선택</option>'+catalog.entries.map(e=>`<option value="${esc(e.id)}">${esc(e.title)}</option>`).join('');
      root.natureDebug.landscapeCatalog=catalog;
    }catch(e){error=e.message;catalog=null;}finally{pending=false;refresh();}
  }
  function refresh(){
    const s=getState(),q=catalog?LandscapeNotes.query(catalog,s.cell,s.draftFamily,s.period):null;
    root.natureDebug.landscapeDescription=q;
    $('landscape-note-select').disabled=!catalog;$('landscape-note-select').value=q?.id||'';
    $('landscape-notes-status').textContent=error?'설명을 읽지 못했습니다: '+error:pending?'대표 지점의 설명을 읽는 중…':'기존 권역·후보 분류를 표제로 사용합니다. 묘사는 미채택 초안이며 정식 지명이 아닙니다.';
    $('landscape-notes-retry').hidden=!error;
    const box=$('landscape-notes-point');box.hidden=!q;box.innerHTML='';if(!q)return;
    const g=q.candidate.group,h=q.candidate.hydrology,v=q.selectedSeason;
    const warnings=Object.entries(g.flagCounts).filter(([,n])=>n).map(([k,n])=>UnifiedNature.REASONS[k]+' '+n+'격자').join(' · ');
    box.innerHTML=`<section class="fact-card landscape-note-card"><div class="fact-heading">경관 설명<small>미채택 창작 초안</small></div><h3>${esc(q.title)}</h3>
      <p class="hint">원본 #${q.cell} · ${esc(q.id)} · 대표 한 격자</p>
      <h4>기존 입력</h4><p>고도 ${fmt(q.existing.elevationM)}m · 원본 약26km 격자. 제목은 기존 권역·후보 분류의 표제이며 정식 지명이 아닙니다.</p>
      <h4>계산 후보</h4><p>${esc(q.candidate.landform.name)} · ${esc(q.candidate.potentialVegetation.name)} · ${esc(q.candidate.wetness.name)}</p>
      <p class="hint">${g.cellCount.toLocaleString('ko-KR')}격자 연속군의 대표점입니다. 전체가 같은 고도·기후·피복이라는 뜻은 아닙니다.${!s.candidates?' 현재 지도에서는 후보를 숨겼습니다.':''}</p>
      <h4>창작 설명 초안</h4><p>${esc(q.creative.overview)}</p>
      <h4>계절 대비 · 대표점</h4><p>${esc(q.seasonal.summary)}</p>
      <label for="landscape-note-period">모습을 비교할 기간 · 공전 위상</label><select id="landscape-note-period">${q.seasonal.samples.map(v=>`<option value="${v.period}" ${v.period===s.period?'selected':''}>${v.period}기간 · ${v.phaseDegrees}°</option>`).join('')}</select>
      <p id="landscape-note-season">${fmt(v.temperatureC)}°C · 강수 ${fmt(v.precipitationMm)}mm · 유량 후보 ${v.flowM3s===null?'미정':fmt(v.flowM3s)+'m³/s'}</p>
      <p>${esc(v.appearanceDraft)}</p><p class="hint">색조·모습은 창작 제안입니다. 실제 적설·식물 생장·침수·결빙 계산이 아닙니다. 12기간은 지구의 달력 월과 다릅니다.</p>
      <button id="landscape-note-season-map">이 기간의 계절 지도 보기</button>
      <details><summary>수계·보류 근거</summary><p>${h?`표시 물길 #${h.id} · 종착 상태 ${esc(h.endpointKind)} · 다음 구간 ${h.downstreamReach===null?'없음 · 종착점 참조':'#'+h.downstreamReach}`:esc(q.candidate.hydrologyMeaning)}</p><p>${esc(warnings||'연속군에 기록된 보류·전이 경고 없음. 실제 피복 채택은 아님.')}</p><p>실제 산림·습지 면적, 강폭, 침수, 적설 경계, 얼음 두께와 서사 역할은 미정입니다.</p></details>
      <div class="feature-actions"><button id="landscape-note-json">설명·근거 JSON ↓</button><a href="${esc(q.mapHref)}">대표점 주소 ↗</a></div></section>`;
    $('landscape-note-period').onchange=e=>update({period:+e.target.value});
    $('landscape-note-season-map').onclick=()=>update({mode:'season',seasonal:true});
    $('landscape-note-json').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(q,null,2)+'\n'],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='landscape-description-'+q.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  }
  $('landscape-note-select').onchange=e=>{const q=catalog?.entries.find(q=>q.id===e.target.value);if(q)update({cell:q.cell,lon:q.center[0],lat:q.center[1],region:q.regionId,draftFamily:q.family,mode:'nature',zoom:12,feature:''});};
  $('landscape-notes-retry').onclick=load;load();return {refresh};
}
root.LandscapeNotesUI={mount};
})(globalThis);
