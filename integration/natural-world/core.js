(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.NaturalWorld=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const R=6371,D=Math.PI/180,SCHEMA='natural-world-foundation/1';
 const anchors=[[0,85],[232,60],[480,30],[720,0],[837,-30],[956,-60],[1024,-78]];
 const REGIONS=[
  {id:1,key:'polar',name:'북부 설원권',color:'#ccd8cb',note:'영구설·계절설·툰드라를 구분할 북부 기준권역'},
  {id:2,key:'steppe',name:'북방 내륙·대초원권',color:'#b8b27e',note:'대초원 설정을 유지하며 숲초원·습지 전이를 검토'},
  {id:3,key:'western-dry',name:'서부 사막권',color:'#bc9b77',note:'현행 서부 사막 설계 타원에 해당하는 육지'},
  {id:4,key:'west',name:'서대륙 중남부',color:'#94b09d',note:'왕국 경계 밖까지 포함한 서대륙·중앙해 서안'},
  {id:5,key:'headwaters',name:'북방 수원 산지',color:'#9ca7b2',note:'현행 수원 마스크. 동부 다우 산지와 건조한 중앙·서부를 함께 포함'},
  {id:6,key:'basin',name:'제국 분지·대호수',color:'#bcb77e',note:'현행 분지 산계 경계 안. 호수·산록·분지 바닥 포함'},
  {id:7,key:'east',name:'동대륙 내륙·연안',color:'#c3aa83',note:'건조한 중심부와 해안 전이를 검토할 기준권역'},
  {id:8,key:'bridge',name:'남동 연결부',color:'#7da797',note:'동대륙–남동대륙 사이의 연결 육지'},
  {id:9,key:'southeast',name:'남동대륙',color:'#9aaf8d',note:'북부 저위도에서 남부 온대·고산권으로 이어짐'},
  {id:10,key:'southwest',name:'남서대륙',color:'#b1b887',note:'기존 두 산계와 큰 강을 기준으로 자연환경을 상세화'},
  {id:11,key:'islands',name:'섬·분리 육지',color:'#91b9b4',note:'두 큰 연결 육지 밖의 섬·연안 분리 셀. 무인 여부는 미정'}
 ];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function sourceGeo([x,y]){let lat=-78;for(let i=1;i<anchors.length;i++)if(y<=anchors[i][0]){const a=anchors[i-1],b=anchors[i];lat=a[1]+(y-a[0])/(b[0]-a[0])*(b[1]-a[1]);break;}return [(x/1536-.5)*270,lat];}
 function inside([x,y],poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
 function encode(a){const bytes=new Uint8Array(a.length*a.BYTES_PER_ELEMENT),d=new DataView(bytes.buffer);for(let i=0;i<a.length;i++){if(a instanceof Float32Array)d.setFloat32(i*4,a[i],true);else if(a instanceof Int32Array)d.setInt32(i*4,a[i],true);else bytes[i]=a[i];}if(typeof Buffer!=='undefined')return Buffer.from(bytes).toString('base64');let t='';for(let i=0;i<bytes.length;i+=16384)t+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(t);}
 function decode(text,n,type='u8'){const bytes=typeof Buffer!=='undefined'?Uint8Array.from(Buffer.from(text,'base64')):Uint8Array.from(atob(text),c=>c.charCodeAt(0));if(bytes.length!==n*(type==='u8'?1:4))throw Error('격자 데이터 크기가 맞지 않습니다.');if(type==='u8')return bytes;const d=new DataView(bytes.buffer),a=type==='f32'?new Float32Array(n):new Int32Array(n);for(let i=0;i<n;i++)a[i]=type==='f32'?d.getFloat32(i*4,true):d.getInt32(i*4,true);return a;}
 function cell(w,h,lon,lat){if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>90)throw Error('유효한 경도·위도가 필요합니다.');const x=Math.floor((((lon+180)%360+360)%360)/360*w),y=clamp(Math.floor((90-lat)/180*h),0,h-1);return y*w+x;}
 const ll=(w,h,i)=>[(i%w+.5)/w*360-180,90-(Math.floor(i/w)+.5)/h*180];
 const rowArea=(w,h,y)=>R*R*2*Math.PI/w*(Math.sin((90-y*180/h)*D)-Math.sin((90-(y+1)*180/h)*D));
 function components(mask,w,h){const labels=new Int32Array(mask.length).fill(-1),queue=new Int32Array(mask.length),items=[];for(let start=0;start<mask.length;start++){if(!mask[start]||labels[start]>=0)continue;const id=items.length;let head=0,tail=1,count=0;queue[0]=start;labels[start]=id;while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);count++;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy;if(yy<0||yy>=h||(!dx&&!dy))continue;const j=yy*w+(x+dx+w)%w;if(mask[j]&&labels[j]<0){labels[j]=id;queue[tail++]=j;}}}items.push({id,firstCell:start,cells:count});}return {labels,items};}
 // Stop at the first present lake or marine terminal. This preserves the original
 // routing graph including virtual fills; it is an audit, not a new drainage solver.
 function terminals(receiver,land,lake,w,h){const n=land.length,wet=components(lake,w,h),out=new Int32Array(n).fill(-2),state=new Uint8Array(n);let cycles=0;for(let i=0;i<n;i++){if(lake[i])out[i]=wet.items[wet.labels[i]].firstCell;else if(!land[i])out[i]=i;}
  for(let start=0;start<n;start++){if(out[start]!==-2)continue;const path=[];let i=start,terminal;while(true){if(out[i]!==-2){terminal=out[i];break;}if(state[i]===1){terminal=-1;cycles++;break;}state[i]=1;path.push(i);const j=receiver[i];if(j<0||j>=n){terminal=i;break;}i=j;}for(const j of path){out[j]=terminal;state[j]=2;}}return {terminal:out,cycles,lakeComponents:wet.items.length};
 }
 function create(data){if(data.schema!==SCHEMA||!Number.isInteger(data.width)||!Number.isInteger(data.height)||data.width<1||data.height<1)throw Error('지원하지 않는 자연지리 자료입니다.');const w=data.width,h=data.height,n=w*h,a={};for(const [k,v]of Object.entries(data.fields))a[k]=decode(v.data,n,v.type);
  const regions=Object.fromEntries(data.regions.map(r=>[r.id,r]));
  function sample(lon,lat){const i=cell(w,h,lon,lat),center=ll(w,h,i),water=!!a.lake[i],land=!!a.land[i],terrestrial=water||land;let lo=Infinity,hi=-Infinity;const x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy;if(yy<0||yy>=h)continue;const j=yy*w+(x+dx+w)%w;if(a.land[j]&&!a.lake[j]){lo=Math.min(lo,a.heights[j]);hi=Math.max(hi,a.heights[j]);}}
   const t=terrestrial?a.terminal[i]:null,basin=t!==null&&t>=0?{id:(a.lake[t]?'L':!a.land[t]?'O':'S')+t,kind:a.lake[t]?'lake':!a.land[t]?'ocean':'unresolved-sink',terminalCell:t,terminalLonLat:ll(w,h,t),scope:'기존 가상 채움을 포함한 배수 후보'}:null;
   return {schema:'natural-world-point/1',provenance:data.provenance,lon,lat,cell:i,center,status:water?'lake':land?'land':'ocean',region:terrestrial?regions[a.region[i]]:null,elevationM:terrestrial?a.heights[i]:null,lakeSurfaceM:water?data.context.lakeLevel_m:null,oceanDepthM:terrestrial?null:a.bathymetry[i],cellAreaKm2:rowArea(w,h,y),localReliefM:terrestrial&&Number.isFinite(lo)?hi-lo:null,reliefScope:'육지 3×3 원본 격자 범위의 고도 차이',climate:terrestrial?{coldC:a.cold[i],hotC:a.hot[i],annualRainMm:a.rain[i],rainSource:a.rainSource[i]===2?'moisture-transport':'geographic-prescription',polarGap:Math.abs(center[1])>72,meaning:data.climateMeaning}:null,basin,virtualFillM:terrestrial?Math.max(0,a.filled[i]-a.heights[i]):null,detailAvailable:!!a.detail[i],vegetation:null,vegetationReason:'전 대륙 식생 상세 분류는 후속 단계',volcanicActivity:null,volcanicActivityReason:'개별 화산·분화 이력 미정'};
  }
  return {data,w,h,n,a,regions,sample};
 }
 function camera(s,width,height){const scale=Math.min(width/360,height/180)*s.zoom;return {scale,project:(lon,lat)=>[width/2+(lon-s.lon)*scale,height/2-(lat-s.lat)*scale],inverse:(x,y)=>[s.lon+(x-width/2)/scale,s.lat-(y-height/2)/scale]};}
 function distance(a,b){const p=(b[1]-a[1])*D,l=(b[0]-a[0])*D,q=Math.sin(p/2)**2+Math.cos(a[1]*D)*Math.cos(b[1]*D)*Math.sin(l/2)**2;return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));}
 return {SCHEMA,REGIONS,R,D,clamp,sourceGeo,inside,encode,decode,cell,ll,rowArea,components,terminals,create,camera,distance};
});
