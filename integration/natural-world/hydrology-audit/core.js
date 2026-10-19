(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../core.js'),require('../stage5/codec.js'));else {root.HydrologyAudit=factory(root.NaturalWorld,root.NaturalMapCodec);root.HydrologyAudit.install(root.UnifiedNature);}})(typeof globalThis!=='undefined'?globalThis:this,function(C,Codec){
 'use strict';
 function create(d,m){
  if(d.schema!=='world-hydrology-map/1'||d.count!==m.d.count||d.width!==m.d.width||d.height!==m.d.height||d.provenance.worldHash!==m.d.provenance.worldHash||d.provenance.geometryHash!==m.d.provenance.geometryHash)throw Error('수계 검사와 지도 기준 세계가 다릅니다.');
  const a=Object.fromEntries(Object.entries(d.fields).map(([k,v])=>[k,Codec.decode(v.data,d.count,v.type)])),terminals=new Map(d.terminals.map(t=>[t.node,t]));
  const value=(key,cell)=>{const j=m.index[cell];return j>=0?a[key][j]:-1;},node=cell=>value('canonical',cell),end=cell=>value('terminal',node(cell));let lastCell=-1,lastQuery=null;
  function query(cell){
   if(!Number.isInteger(cell)||cell<0||cell>=d.width*d.height)throw Error('Invalid cell');
   if(cell===lastCell)return lastQuery;
   const j=m.index[cell];if(j<0)return {cell,status:'ocean',endpoint:null,segments:[],path:[],actualChannelGeometry:null};
   const start=node(cell),terminal=end(cell),endpoint=terminals.get(terminal);if(!endpoint)throw Error('수계 종착점 자료가 없습니다.');
   const path=[],segments=[],seen=new Set();let i=start,passesLake=false,displayEnd=cell;
   while(i>=0){if(seen.has(i))throw Error('수계 순환 감지');seen.add(i);path.push(i);if(i===d.lake.node)passesLake=true;
    const next=value('receiver',i),entry=value('entry',i);if(next<0)break;
    // A collapsed reservoir has no resolved internal channel. Never draw a chord across it.
    if(i!==d.lake.node){segments.push([C.ll(d.width,d.height,i),C.ll(d.width,d.height,entry)]);displayEnd=entry;}
    else displayEnd=entry;
    i=next;
   }
   const collapsed=a.kind[j]===3,lake=!!m.a.lake[j];
   lastCell=cell;lastQuery={schema:'world-hydrology-point/1',cell,node:start,status:collapsed?'unresolved-interior':lake?'existing-lake':endpoint.kind==='unresolved'?'ends-at-unresolved-boundary':'ocean-connected-candidate',endpoint,endpointDisplayCell:displayEnd,passesLake,collapsedInterior:collapsed||lake,internalPathKnown:!(collapsed||lake),incomingConnections:value('incoming',start),graphIssue:!!value('flags',start),segments,path,actualChannelGeometry:null,actualDivideGeometry:null,unresolvedAllocation:null,meaning:'고도·원본 발생량에 따른 후보 연결. 선이 끝나는 검토 경계 이후의 수면·저류·침투·넘침은 미정.'};return lastQuery;
  }
  function pixel(j,s){let rgb=({1:[116,157,145],2:[151,132,166],3:[105,85,126],4:[104,163,185]})[a.kind[j]]||[150,130,130];if(a.flags[j])return [204,104,90];
   if(m.index[s.cell]>=0&&end(m.a.cells[j])===end(s.cell))rgb=rgb.map((v,k)=>Math.round(v*.58+[233,202,124][k]*.42));return rgb;
  }
  let dividePath=null;
  function draw(ctx,cam,s,stats){if(!s.candidates||s.mode!=='drainage')return;
   if(!dividePath){dividePath=new Path2D();const w=d.width,h=d.height,dx=360/w,dy=180/h;
    for(const cell of m.a.cells){const x=cell%w,y=Math.floor(cell/w),t=end(cell),east=y*w+(x+1)%w,south=y<h-1?cell+w:-1,lon=x*dx-180,lat=90-y*dy;
     if(m.index[east]>=0&&end(east)!==t){dividePath.moveTo(lon+dx,lat);dividePath.lineTo(lon+dx,lat-dy);}
     if(south>=0&&m.index[south]>=0&&end(south)!==t){dividePath.moveTo(lon,lat-dy);dividePath.lineTo(lon+dx,lat-dy);}
    }
   }
   ctx.save();ctx.translate(...cam.project(0,0));ctx.scale(cam.scale,-cam.scale);
   if(s.zoom>=3){ctx.strokeStyle='#eee5c36b';ctx.lineWidth=.65/cam.scale;ctx.stroke(dividePath);stats.drainageBoundaries=true;}
   const q=query(s.cell);stats.routeEdges=q.segments.length;ctx.lineWidth=3/cam.scale;ctx.strokeStyle='#ffdc81';ctx.lineJoin='round';ctx.beginPath();for(const segment of q.segments){ctx.moveTo(...segment[0]);ctx.lineTo(...segment[1]);}ctx.stroke();ctx.restore();
   if(q.endpoint){const p=cam.project(...C.ll(d.width,d.height,q.endpointDisplayCell));ctx.beginPath();ctx.arc(...p,5,0,Math.PI*2);ctx.fillStyle=q.endpoint.kind==='unresolved'?'#bd98d4':'#9ce2d3';ctx.fill();ctx.strokeStyle='#243a3c';ctx.lineWidth=2;ctx.stroke();}
  }
  return {d,a,query,pixel,draw,end};
 }
 function install(U){if(U.MODES.drainage)return;U.MODES.drainage={name:'수계 검증',icon:'⑂',note:'종착점별 집수 경계와 선택 지점의 하류 후보. 함몰부 내부 연결은 미정입니다.'};const pixel=U.pixel;U.pixel=(m,j,s)=>{if(s.mode!=='drainage'||!s.candidates||m.a.lake[j])return pixel(m,j,s);if(!m.hydrology)return pixel(m,j,{...s,mode:'water'});let rgb=m.hydrology.pixel(j,s);if(s.relief)rgb=rgb.map(v=>Math.round(C.clamp(v*m.a.shade[j]/160,0,255)));return rgb;};}
 return {create,install};
});
