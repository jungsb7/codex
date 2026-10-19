(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.PlanetNavigation=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const W=1536,H=768,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function valid(lon,lat){return Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90;}
 function cell(lon,lat){return Math.min(H-1,Math.floor((90-lat)/180*H))*W+Math.floor((((lon+180)%360+360)%360)/360*W);}
 function center(i){return [(i%W+.5)*360/W-180,90-(Math.floor(i/W)+.5)*180/H];}
 function selected(s){const lon=Number(s.pointLon),lat=Number(s.pointLat);return s.pointLon!=null&&s.pointLat!=null&&valid(lon,lat)&&cell(lon,lat)===s.cell?[lon,lat]:center(s.cell);}
 function restorePoint(s,hash){const p=new URLSearchParams(hash.replace(/^#/,'')),x=Number(p.get('pointLon')),y=Number(p.get('pointLat'));if(p.get('pointLon')?.trim()&&p.get('pointLat')?.trim()&&valid(x,y)&&cell(x,y)===s.cell){s.pointLon=x;s.pointLat=y;}return s;}
 function toNature(s,p){const ll=p&&valid(p.lon,p.lat)?[p.lon,p.lat]:[s.lon,s.lat];return '../natural-world/unified-atlas/index.html#'+new URLSearchParams({mode:s.mode==='terrain'?'terrain':'nature',region:0,lon:s.lon,lat:s.lat,zoom:clamp(s.zoom*3,1,32),cell:cell(...ll),pointLon:ll[0],pointLat:ll[1],relief:s.relief!==false,labels:s.labels!==false,grid:s.grid===true});}
 function toAtlas(s,previous=''){const old=new URLSearchParams(previous.replace(/^#/,'')),q=new URLSearchParams(),allowed=['mode','region','scenario','year','period','temperature','borders','rivers','labels','relief','grid','compare'];for(const k of allowed)if(old.has(k))q.set(k,old.get(k));const ll=selected(s);q.set('pointLon',ll[0]);q.set('pointLat',ll[1]);q.set('lon',s.lon);q.set('lat',s.lat);q.set('zoom',clamp(s.zoom/3,.5,30));if(!q.has('mode'))q.set('mode','terrain');return '../../atlas/index.html#'+q;}
 return {cell,center,selected,restorePoint,toNature,toAtlas};
});
