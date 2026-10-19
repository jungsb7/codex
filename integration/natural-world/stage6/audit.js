'use strict';
// Independent audit primitives. These never alter the stage 1–5 model.
const FLAGS={polarGap:1,hotPETGap:2,settingConflict:4,transition:8,unresolvedDrainage:16,largeVirtualFill:32,wetlandCandidate:64,volcanicCorridor:128};
const REASONS={polarGap:'남북위72도 밖 수분 수송 미검증',hotPETGap:'38°C 초과 기간의 PET 방법 공백',settingConflict:'서부 사막 설정과 온대·냉대림 후보 충돌',transition:'식생 선별 임계값 부근 전이',unresolvedDrainage:'하류가 내부 물 배분 미정인 함몰 검토 경계에 도달',largeVirtualFill:'원본 가상 채움100m 초과; 실제 고도 보정 아님',wetlandCandidate:'습지 선별 후보; 실제 침수·면적 미정',volcanicCorridor:'지질 조건을 만족하는 화산대 가설; 개별 화산 미정'};
function decisions(mask,lake=false){return {terrain:'coarse-model-candidate',vegetation:lake?'existing-water':mask&(FLAGS.polarGap|FLAGS.hotPETGap|FLAGS.settingConflict)?'hold':mask&FLAGS.transition?'conditional-candidate':'screening-candidate',drainage:mask&FLAGS.unresolvedDrainage?'review-boundary':'connected-candidate',actualCover:lake?'existing-water':'unknown',volcano:mask&FLAGS.volcanicCorridor?'corridor-hypothesis':'unknown',reasons:Object.keys(FLAGS).filter(k=>mask&FLAGS[k]).map(k=>({id:k,reason:REASONS[k]}))};}
function graph(receiver,nodes){
 const n=receiver.length,active=new Uint8Array(n),indegree=new Int32Array(n),queue=new Int32Array(nodes.length);
 for(const i of nodes){if(!Number.isInteger(i)||i<0||i>=n||active[i])throw Error('Invalid or duplicate node');active[i]=1;}
 for(const i of nodes){const j=receiver[i];if(!Number.isInteger(j)||j< -1||j>=n||j>=0&&!active[j])throw Error('Invalid receiver');if(j>=0)indegree[j]++;}
 let head=0,tail=0;for(const i of nodes)if(!indegree[i])queue[tail++]=i;
 while(head<tail){const j=receiver[queue[head++]];if(j>=0&&!--indegree[j])queue[tail++]=j;}
 if(tail!==nodes.length)throw Error('Drainage cycle');
 const terminal=new Int32Array(n).fill(-1);for(let k=tail-1;k>=0;k--){const i=queue[k];terminal[i]=receiver[i]<0?i:terminal[receiver[i]];}
 return {order:queue,active,terminal};
}
function conservation(input,outputs,scale=Math.abs(input)){if(!Number.isFinite(input)||!Number.isFinite(scale)||scale<0||!outputs.every(Number.isFinite))return {passed:false,absoluteM3:null,relative:null,toleranceM3:null};const residual=input-outputs.reduce((s,v)=>s+v,0),tolerance=Math.max(1,scale*1e-6);return {passed:Math.abs(residual)<=tolerance,residualM3:residual,absoluteM3:Math.abs(residual),relative:Math.abs(residual)/Math.max(1,scale),toleranceM3:tolerance};}
function tropical(t,p,pet,kind){const finite=t.length===12&&p.length===12&&pet.length===12&&[...t,...p,...pet].every(Number.isFinite);if(!finite)return false;const rain=p.reduce((s,v)=>s+v,0),evap=pet.reduce((s,v)=>s+v,0),dry=p.filter((v,i)=>v<pet[i]).length;return Math.min(...t)>=18&&(kind!==8||(rain>=1500&&evap>0&&rain/evap>=1&&dry<=1));}
function wetland({channel,mean,wet,distance,height,relief,slope,climateGap,depression}){return channel>=0&&Number.isFinite(mean)&&mean>=30&&wet===12&&Number.isFinite(distance)&&distance>=0&&distance<=30&&Number.isFinite(height)&&height>=0&&height<=20&&Number.isFinite(relief)&&relief<=60&&Number.isFinite(slope)&&slope<=.15&&!climateGap&&!depression;}
module.exports={FLAGS,REASONS,decisions,graph,conservation,tropical,wetland};
