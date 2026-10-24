# GitHub에서 이어가는 Planet Atlas

큰 ZIP 재업로드 대신 **이 저장소의 최신 main과 루트 NEXT_SESSION_PROMPT.txt**를 작업 시작점으로 사용한다. 이 문서는 후속41 세부 물길·계곡 단면 후보와 배포 상태를 기록한다. [NEXT_GOALS.md](NEXT_GOALS.md)는 이후 별도 제안이다.

## 후속41 세부 물길·계곡 단면 후보 — 2026-10-25 Asia/Seoul

[방법](../integration/natural-world/channel-valley-model/README.md) · [결과](../integration/natural-world/channel-valley-model/REPORT.md) · [화면](../integration/natural-world/channel-valley-model/index.html). 기준main2016f33e1ee30a62d936aab65ffa7463c66c2d55.

- 원본45,824개 물길 전체에 세부 중심선·내리막 종단·포물선 계곡 단면 후보를 구현했다. 원본126,727공유 지점/119,143연결, 상하류/끝점/격자 경계 통과점을 유지한다.
- 약7,935,008개 표본을 검사했다. 간격 상한500m, 실제 최대466.686325m. 500/250m 비교의 경로 길이 차이 최대0.041390%, 단면 적분 최대0.043821%,0.1%기준 통과. 이는 정해진 형상의 표본 수렴 검사다.
- 새모델9+기존웅덩이회귀22=31검사, 새브라우저14+원본지도12=26검사. AI전체45,824경로 조회와8JSON다운로드 검증.
- 원본 대각선 교차3곳·6구간은 실제합류/분리미정으로 명시했다. 원본 고도보다 올린 지점0, 최대후보절개22.028269m. 실제침식속도/기간/퇴적물/고해상도DEM확정 아님.
- 약12.296MB를90조각+목록으로 나눴다. 새고해상도관측자료수집이 아니라 기존공개자료에 명시한형태가정을 적용했다.
- 이전23,022구간100년·미처리0은 그대로보존했다. 새계곡형상을 반영한 물수분 재계산은 하지않았고, 집수권결과는 reference-only 링크다. actual:null,automaticAdoption:false.

배포는 [기록](../integration/natural-world/channel-valley-model/validation/deployment.json) 확인. 원본세계/경제/구지도/수계/마스크/아카이브와 이전후보·연구기록은 유지한다.

## 후속40 전체23,022구간 후보 계산·배포 완료 — 2026-10-25 Asia/Seoul

[방법](../integration/natural-world/pond-network-model/README.md) · [결과](../integration/natural-world/pond-network-model/REPORT.md) · [화면](../integration/natural-world/pond-network-model/index.html). 기준main c88e27e1daa64795200415f6a7043162a656fb08.

- 세 조건 각각 **1,184경계·23,022구간 전부 100년 완료, 미처리 물량 0m³**. 과거 보류235경계와 D298591관련3경계를 포함한다. 원본 구간→집수권 대응은 그대로다.
- 원본 지형 3,232웅덩이·9,858연결, 대상168,576격자(북부6,525), 배경100,072격자. 과거5m상한/보류수신자 접촉 중단을 새 후보에서 대체했다.
- 기준60/120단계100년 비교: 바다 방류 누계 차이 0.021787%, 유입 0%. 두 값 모두1%기준 통과. 개별 경계 방류/최종저장 중1%초과 48곳은 공개하며 모든 상태 수렴을 주장하지 않는다.
- 새22+기존268=290모델검사, 새11+지도12=23브라우저검사. AI3,552경계조회+69,066물길조회,18JSON다운로드 검증.
- 추가원본관측9,835,947바이트, 기존23,484,677바이트 재사용. 원본 전세계 유출/물수지/세계·지형해시 불변.
- 완료는 명시한 가정 아래 **집수권의 저류·침투·넘침 처리**다. 개별하도 실측유량/미세침수/숲·습지경계/강폭/눈두께·결빙·열수지/세계최종채택은 별도. actual:null,automaticAdoption:false.

사용자가 전체해결 진행을 명시했으므로 과거보류를 새 후보에 포함했다. 과거연구를 수정하거나 세계설정으로 자동채택한 것은 아니다. 이전39의부분완료/중단은 아래 역사기록으로 보존한다. 이번 게시·배포도 기존명시승인 범위에서 진행하며 같은승인을 재질문하지 않는다. 배포결과는 [기록](../integration/natural-world/pond-network-model/validation/deployment.json) 확인.

[PR #20](https://github.com/jungsb7/codex/pull/20) 병합 `4e86a6ffb78076b6297ef74ba9521f95da550b95`. [Pages40117024404](https://github.com/jungsb7/codex/actions/runs/40117024404)의 build/deploy/report 세 작업 모두 성공. 공개 주소의 직접 HTTP 응답은 환경 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

## 후속39 전체 연결망 동적 계산 구현·검증·배포 완료 — 2026-10-25 Asia/Seoul

[방법](../integration/natural-world/network-water-model/README.md) · [결과](../integration/natural-world/network-water-model/REPORT.md) · [화면](../integration/natural-world/network-water-model/index.html). 기준 main `f9bde616a76459f74b23bf73a7262dc90750c99d`.

- 전체 946경계·20,065구간을 207연결망으로 묶고, 204망·831경계·18,984구간에 세 조건 동적 계산 실행. 북부 69경계·2,241격자 네 저장도 모두 포함했다.
- 기준/느린 복귀는 291경계·3,519구간 100년 완료, 540경계·15,465구간 한계 중단. 저침투는 275경계·3,335구간 완료, 556경계·15,649구간 중단.
- D567047·D688499·D730812를 포함한 3망·115경계·1,081구간은 지형 대기. 원본 보류2,767 + D298591별도190 유지. 전체23,022 해결/세계채택 아님.
- 보류 수신 유역을 배수구로 만들지 않고 최초 접촉에서 연결망 중단. 이전57경계는 확대하면256경계·10,299구간망에 포함되며 D154345→보류D126467 접촉으로 약0.172222년에 중단한다. 이전57범위100년과 확대망 완료를 혼동하거나 구간 수를 더하지 않는다.
- 누적 잔차 최대2.464844m³, 강수대비2.015e-12미만. 60/120기준194/204 통과. 100년완료160망의 바다전달량 차이 최대0.760017%, 모두1%통과. 실패10망120/240추가검사는3통과/7시점민감. 원래60단계표시 유지.
- 새20+기존248=268모델검사, 새11+지도12=23브라우저, AI2,838조회/12JSON통과. 기존CLI8개는환경spawnSync차단후동일검사재실행통과.
- 기존23.5MB공개입력재사용·복제없음. [PR #19](https://github.com/jungsb7/codex/pull/19) 병합94b6754be17cdae64e3a4e507cf38b1a6abfacd6, [Pages40111630191](https://github.com/jungsb7/codex/actions/runs/40111630191) build/deploy/report 모두성공. [배포 기록](../integration/natural-world/network-water-model/validation/deployment.json). 공개HTTP직접확인은환경제한으로미실시. 기존 명시 공개·배포 승인은 유효하며 같은 승인을 재질문하지 않는다.

## 후속38 집수권 결합·전체 입력 구현·검증·배포 완료 — 2026-10-25

[방법](../integration/natural-world/coupled-water-model/README.md) · [결과](../integration/natural-world/coupled-water-model/REPORT.md) · [화면](../integration/natural-world/coupled-water-model/index.html). 기준main `d929cb651881554c2e7b573337dd71dd97137c25`.

- 57경계·2,637구간의 원본 지형과 양쪽 최종 수위를 결합. 410고유 출구 면 중 77면·14경계쌍이 추가 후보. 두 기존 중단 경로 D221625→D200167, D258447→D243078도 전달한다.
- 세 조건 모두100년, 미처리0. 전체 잔차 최대17.5m³(강수 대비3e-13미만). 기준60/120단계의 바다 전달량 차이0.666148%,1%기준 통과. 모든 변수/민감도 수렴 검증은 아님.
- 946경계·20,065구간·117,320격자의 원본 강수/기온/초기저장 수집 완료. 기존11,355격자 정확히 일치, 원본 전세계 지역유출/물수지 불변. 북부69경계/2,241격자 네 저장은 별도로 보존.
- 나머지889경계/17,428구간은 입력 확보 완료, 동적 계산 전. 낮은출구9곳+D567047, 북부 저장 결합, 빙설/미세지형은 남음. D298591망190구간 및 기존보류2,767 유지. 전체23,022구간 해결/세계자동채택 아님.
- 새20+기존228=248모델검사, 새11+기존12=23브라우저, AI2,838조회/9다운로드 검증.
- 새23,484,677바이트 입력40조각과후속38결과의공개GitHub jungsb7/codex게시·Pages배포를사용자가2026-10-25에자료명/목적지를포함한문구로명시승인했다.이전자동거절해소,재질문금지. [승인 기록](../integration/natural-world/coupled-water-model/validation/publication-check.json).
- [PR #18](https://github.com/jungsb7/codex/pull/18) 병합 `5199cb34e88a40ba070fad7a48e941c608a74b17`. [Pages40108526074](https://github.com/jungsb7/codex/actions/runs/40108526074)의3작업성공. 새23.5MB입력/결과공개완료. [배포 기록](../integration/natural-world/coupled-water-model/validation/deployment.json). 직접공개HTTP응답은환경제한으로미확인.

## 후속37 원본 지형·여러 출구 구현·검증·배포 완료 — 2026-10-24

946경계·20,065구간·117,320격자의 지형/원본 유입 배정을 일괄 준비하고, 같은 하류의5,274출구 면과4,186추가 원본 기둥을 구성했다. 원본 기후가 있는57경계·2,637구간에는210기둥을 추가해 변수 면적과 여러 출구로 다시 계산한다. [화면](../integration/natural-world/terrain-water-model/index.html) · [방법/AI](../integration/natural-world/terrain-water-model/README.md) · [결과](../integration/natural-world/terrain-water-model/REPORT.md). 기준main `1cc0326686a4cfe63fffddd5ae260a9079e547bc`.

- 이전5m 가상 수직 기둥을 원본 격자 연결 영역으로 교체. 같은 원본 하류로 나가는 면에는 총 설계 폭을 나누며, 다른 집수권/호수/해양 지점 접촉에서57경계 전체를 중단한다. 원본 수계는 그대로다.
- 기준/느린복귀는약2.179/2.181년 D221625→D200167, 저침투는약0.132년 D258447→D243078에서중단. 미래 강수/100년 결과를 만들지 않는다. 이전 ‘미처리0’은 가상 저장의 결과로만 유지한다.
- 기준60/120단계는첫접촉지점/상한시간일치. 중단장부잔차0.061m³미만. 마지막소단계초과량은진단값이며실제넘침량아님.
- 나머지889경계/17,428구간은지형·배정준비만완료,원본기후/초기저장미수집. 낮은출구9곳과문턱이하접촉D567047은현재엔진적용전. D298591망190구간과기존보류2767구간보존.
-새18+기존210=228모델검사,새12+기존12=24브라우저,AI2838조건/경계조회·9JSON검증.
- 전체/실제완료와자동채택아님. 기존원본/경제/기후/수계/마스크/구지도/아카이브/종료대상보존. 최종검증·배포는새REPORT와validation에기록.

[PR #17](https://github.com/jungsb7/codex/pull/17) 병합 `fb29fdf6b7ec390b3c340e5a4e2e6af44927c189`, [Pages 실행40093144618](https://github.com/jungsb7/codex/actions/runs/40093144618)의3작업 성공. [배포 기록](../integration/natural-world/terrain-water-model/validation/deployment.json). 공개 주소 직접 응답은 환경 제한으로 미확인. 최종 인계 문서 커밋은 더 최신일 수 있다.

## 후속36 침투·유한 저장·출구 작동 후보 구현·검증·배포 완료 — 2026-10-24

사용자가 진행을 요청해 D186192의57경계·11,355격자·2,637구간에 **유한 토양/대수층·제한 침투·지하수 복귀·수위별 방류**를 함께 계산하는 별도 후보를 구현했다. [화면](../integration/natural-world/finite-water-model/index.html) · [방법/AI](../integration/natural-world/finite-water-model/README.md) · [결과](../integration/natural-world/finite-water-model/REPORT.md). 기준main `ffddacdf0e9fbc9d34497d3d118696014331b823`.

- 기존35%혼합저장 분배와 외부손실을 실제 침투라고 바꾸지 않았다. 새 토양200mm·대수층1000mm·침투1200mm/년·배수0.25년·복귀2년 가정을 명시하고, 침투1/4·복귀4배 조건도 계산한다.
- 출구 폭은 원본 상류 누적 유량으로 정한 설계값이다. 원본 문턱 위5m까지 가상 수직 저장 기둥과 단방향 수위 함수, 하류 진입 웅덩이 수위 억제를 사용한다. 실제 침수/역류/다른 출구를 확정하지 않는다. 범위 초과는 미처리량과 실패 상태로 남긴다.
- 매 소단계의 송수신과 전달 중 재고까지 보존한다. 원본57경계 집계 장부를 제거한 전체 혼합망 장부도 별도로 계산한다. 기존10.2MB 원본 계측은 재사용하며 복제하지 않는다.
- 나머지20,385구간에는 이 새 모델을 적용하지 않았다. 새 가정은 세계 설정으로 자동 채택하지 않으며 `actual:null`을 유지한다. 기존108보류·14중단·종료대상·원본/경제/기후/수계/구지도/아카이브 보존.
- 새15+기존195=210모델검사, 새12+기존12=24브라우저, AI17,100조회/9JSON 통과. 최초30→60의1.2552%차이로 기본60단계로 높였으며60→120 주요누적 최대0.624582%로 기준 통과. 세 조건100년 미처리0, 실제 설정 채택/전체 완료는 별도.
- 검증과 배포의 최종 상태는 새 REPORT.md와 validation/deployment.json을 확인한다. 고온·극지/빙설 열수지, 실제 범람 및 대체 출구, 일반 역류는 남은 작업이다.

[PR #16](https://github.com/jungsb7/codex/pull/16) 병합 `5dec78fb3299e31bce93d61c0a0d013052c200ce`, [Pages 실행39984782208](https://github.com/jungsb7/codex/actions/runs/39984782208)의3작업 성공. [배포 기록](../integration/natural-world/finite-water-model/validation/deployment.json). 공개 주소 직접 응답은 환경 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

## 후속35 큰 유역 수분 장부 구현·검증·배포 완료 — 2026-10-24

D186192 연결망57경계·2,637구간을 추가해 원본 수분 장부 연결190→2,827구간으로 확대했다. 기존망과 합쳐60경계·12,045격자·144,540원본 계측행이다. [화면](../integration/natural-world/basin-water-budget/index.html) · [결과](../integration/natural-world/basin-water-budget/REPORT.md) · [방법/AI](../integration/natural-world/basin-water-budget/README.md) · [완료 기준](../integration/natural-world/basin-water-budget/COMPLETION.md). 기준main `728952243bf370954deb452940eb3c87ca26d398`.

- 기존 후속34 core·후속33 surface·원본 step을 수정 없이 재사용.2,186기둥·105웅덩이·58내부 송수신 연결. 전268,857원본 유출 비트·전역 물수지·세계/기하 해시 보존, 기존690계측과3경계100년 결과 정확히 재현.
- 원본 수분 장부2,827 / 집계만17,428 / 자체보류2,767 =23,022. 다른889계산 경계·235보류 경계 유지. 실제 물리 채택 완료0과 별도 지표다.
- 새 유역D186192는 증발0.5/손실0조건에서23년차3위상 첫 초과,100년 해양 전달10,033.367235km³.1/0.25와2/0.25조건은100년 내 해양 초과 없음. 실제 방류/폐쇄 판정 아님.
- 새13+기존182자료195검사, 새13+기존12브라우저25검사, AI18,000조회·27JSON·60경계선택·1440/390/320px. 전역100년 잔차13.157m³ 미만. 큰 연결망 전체 시간 간격 수렴 검사는 미수행.
- 실제 침투·출구·역수위·열수지·적설두께·결빙 미정, 기존108보류·14중단과 종료대상 유지. 조건부 연결 증가를 실제 해결로 보고하지 않는다.
- 기존1043파일 중1038보존. 기존 변경은 지도/후속34링크와 인계3개. 원본·경제·구지도·전체아카이브 보존.

[PR #15](https://github.com/jungsb7/codex/pull/15) 병합·배포 완료. 기능 커밋 `b4662f3e5895fbd68f4ab62eeebe43021609dd57`, 병합 커밋 `4bf097024e773a8ad4de3ca97c2af668fef25afe`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39979434913)의 build/deploy/report-build-status 모두 성공. 공개 주소 직접 응답은 환경 도메인 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

계측 자료10.2MB의 최초 게시 시도는 자동 승인 검토에서 거절됐으나, 사용자가2026-10-24 자료별 게시/배포를 명시 승인했고 이후 동일 파일 업로드와 배포를 완료했다. [배포 기록](../integration/natural-world/basin-water-budget/validation/deployment.json).

사용자는 ‘언제 해결되나’, ‘가정이 없어서 대부분 미정인가’를 물었다. 기존 계산 가정은 있으나 미정 물리 입력/모델과 세계 설정 채택이 남았음을 설명했다. 특정 새 가정의 채택 결정은 아직 없다. 다음은 작은 연결망 반복보다 침투·저장·출구의 최소 작동 모델과 완료 판정 조건을 구체화하는 작업이다.

## 후속34 세 경계 수분 장부 연결 구현·검증·배포 완료 — 2026-10-23

상류D301678(16구간)과D307820(3구간)을 추가해 **원본 수분 장부 연결171→190구간**으로 확대했다. [화면](../integration/natural-world/water-budget-chain/index.html) · [결과](../integration/natural-world/water-budget-chain/REPORT.md) · [방법·AI](../integration/natural-world/water-budget-chain/README.md) · [배포 기록](../integration/natural-world/water-budget-chain/validation/deployment.json). 기준 main `90cabecdd84a6239fe24d38a4809d9ca20812319`.

- 두 상류71격자의 원본 자료를 직접 계측했다. 기존619격자와 합쳐690격자·8,280행이며 전268,857격자 원본 유출 비트·전역 물수지·세계/기하 해시 보존, 기존619자료 정확히 재현.
- 세 경계 모두 각자의 원시12위상을 쓴다. 상류 기간 초과량은 원본 진입303208/304744를 통해 하류 같은 기간30단계에 균등 배분한다. 기간 내 균등/지연0/손실0/역수위없음 가정은 남는다.
- 세 경계의 기존 자체 유입/손실/재고와 해양 도착 방류를 제거한 뒤 새 지역 장부를 넣는다. 두 내부 송수신은 전역 외부 유입 또는 해양 방류에 중복 가산하지 않는다.
- 증발1/외부손실0.25m/년 조건에서100년 상류 수신1,026.997564→903.605182km³, 해양 초과 전달4,518.569206→4,396.947441km³. 실제 방류 채택 아님.
- 조건부 네트워크20,255구간 중190구간 원본 수분 장부 연결. 나머지946계산 경계·235보류 경계 유지. 실제 해결0·미정23,022. 실제 침투/열수지/빙설/출구/역수위와 연6.008km³ 눈 누적, 기존108보류·14중단 유지.
- 새14+기존168자료182검사, 새12+기존12브라우저24검사. AI900조회·27JSON·1440/390/320px. 새 상류60→120단계 누적 초과량 상대차0.000407% 미만.
- 기존1007파일 중1002바이트 보존. 기존 수정은 지도/후속33링크 및 인계3개. 세계·경제·원본 입력·구지도·아카이브·종료대상 보존.

[PR #14](https://github.com/jungsb7/codex/pull/14) 병합·배포 완료. 기능 커밋 `982811299fd0049808b566e377732374d692a341`, 병합 커밋 `8f78a46993cc0c508da887b0078213f202b9f162`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39972569620)의 build/deploy/report-build-status 모두 성공. 공개 주소 직접 응답은 환경 도메인 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

## 후속33 원본 수분 장부 연결 구현·검증·배포 완료 — 2026-10-23

D298591 한 경계의619격자·171구간을 후속24 원본 육지/수면 전환 장부로 교체했다. [화면](../integration/natural-world/water-budget-link/index.html) · [결과](../integration/natural-world/water-budget-link/REPORT.md) · [방법·AI](../integration/natural-world/water-budget-link/README.md) · [배포 기록](../integration/natural-world/water-budget-link/validation/deployment.json). 기준 main `110b1b5b7cfc20ddd62c92fdba5e6dcca1c76721`.

- 상류D301678/D307820의1,200기간 수신을 원본 진입점303208/304744로 넣고, 기존 집계 유입/손실/재고/전달을 빼고 새 장부를 넣었다. 상류 수신은 전역 외부 유입에 중복 가산하지 않는다.
- 눈·혼합 얕은 저장·육지 증발산·수면 증발·외부 지하수 손실·수면 재고를 분리했다. 원본35%얕은저장 유입은 내부 이동이며 실제 침투율이 아니다. 토양/대수층 임의 분할 없이 actual.infiltrationM3:null을 유지한다.
- 다른948계산 경계와235보류 경계는 기존 모형 유지. 조건부 네트워크20,255구간 중171구간만 이번 원본 수분 장부를 연결했다. 실제 해결0·미정23,022는 그대로다.
- 원시 지역 위상과 인접 위상 평균 상류 유입의 번호 대응은 혼합 강제력 가정이다. 초과분의 같은 기간 전달은 실제 출구 수리계산이 아니다. 기존108보류·14중단 및 매년 약6.008km³ 눈 누적 문제를 유지한다.
- 수면 증발/외부 손실0.5/0,1/0.25,2/0.25m/년 조건에서 첫 초과는5년차/7년차/100년내없음. 실제값으로 채택하지 않는다.
- 새13+기존155자료168검사, 새11+기존12브라우저23검사. 원본619×12산술·수신0동일성·내부이동·전역교체·62격자차이전달·AI300조회·9JSON·1440/390/320px 확인.
- 기존979파일 중974바이트 보존. 기존 수정은 지도/후속32링크와 인계3개. 원본세계/경제/기후/지형/수계/마스크/구지도/전체아카이브/종료대상을 보존했다.

[PR #13](https://github.com/jungsb7/codex/pull/13) 병합·배포 완료. 기능 커밋 `9f672a20f79a7f2b1981e12fbd44e5965e7a4bff`, 병합 커밋 `fb6f2758057e147a1afc94d303abd5efdffab620`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39970030707)의 build/deploy/report-build-status 모두 성공. 공개 주소 직접 응답은 환경 도메인 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

## 후속32 내륙 경계 전달·수신 구현·검증·배포 완료 — 2026-10-23

사용자가 다음 진행을 요청해 내륙740연결을 추가했다. **949경계·20,255구간의 조건부 전달/수신**을 계산하며 보류 경계의 수신 미배분량도 보존한다. [화면](../integration/natural-world/inland-routing/index.html) · [결과](../integration/natural-world/inland-routing/REPORT.md) · [방법·AI](../integration/natural-world/inland-routing/README.md) · [배포 기록](../integration/natural-world/inland-routing/validation/deployment.json). 기준 main `be7d54ba577d2c93888f3a3aa82371902e07ad84`.

[PR #12](https://github.com/jungsb7/codex/pull/12) 병합·배포 완료. 기능 커밋 `10d29eeec2249d261b89be666f540b65767bf862`, 병합 커밋 `3373d77bc3fef479773793fcb3be09cf5145dd0d`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39961356486)의 build/deploy/report-build-status 모두 성공. 공개 주소 직접 응답은 환경 도메인 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

- 전체23,022구간:가정 해양 경로13,598·계산 후 보류 경계로 이어지는6,657·자체 처리 보류2,767. 조건부 계산 대상은앞두수의합20,255이며실제해결수가아니다.
- 상류부터 계산해 다음 경계의 원본 자체 유입에 수신량을 한 번만 더한다.740내부송신/수신은전역장부에서상쇄하며해양도착/미배분/종료재고/추가순손실을분리한다.
-100년·손실0·초기0에서708경계 초과전달,14보류경계에상류물량도착.보류경계의실제저류/손실/방류null.미배분누계는실제저장량아님.
- 원본순환0,런타임계산경계순환은거부.기존수위결합/고온/극지/종료9곳/D126467/D147845/D144758처리보류유지.수신기록만남기며내부물리계산재개안함.
-새14+기존141자료155검사,새15+기존12브라우저27검사.독립재귀해석해·740송수신·949원본경로·용량층적분·이전209곳재현·내륙이동/보류JSON·1440/390/320px검증.
-실제해결0·미정23,022유지.같은기간내손실/지연없는집계모형이며실제수면전환/침투/증발/출구통수능/역수위미계산.후속24~26의108보류·14중단유지.
-기존952파일중947보존.기존수정은지도와후속31연결링크및인계3개.원본세계/경제/지형/기후/수계/마스크/구지도/전체아카이브보존.

## 후속31 해양 경계 하류 처리 구현·검증·배포 완료 — 2026-10-23

사용자가23,022구간의 실제 하류 처리를 우선하도록 지시했다. 외력 형상 검산 제안을 보류하고 **해양209경계·4,891구간의 조건부 저장/초과 전달을 원본 하류 경로에 연결**했다. [화면](../integration/natural-world/downstream-routing/index.html) · [결과](../integration/natural-world/downstream-routing/REPORT.md) · [방법·AI](../integration/natural-world/downstream-routing/README.md) · [배포 기록](../integration/natural-world/downstream-routing/validation/deployment.json). 기준 main `3cd5fdf286b78e33d214c2f2c6c2695eb5808d24`.

[PR #11](https://github.com/jungsb7/codex/pull/11) 병합·배포 완료. 기능 커밋 `29ee40167649e7a6f631a062230e84e59e7c15b8`, 병합 커밋 `7af0264851cd45bb3265b2626c1ab527500a1abc`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39949616304)의 build/deploy/report-build-status 모두 성공. 공개 주소 직접 접속은 환경 도메인 제한으로 미확인. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

- 기존 해양 후보4,921구간에서 이전 보류D14475830구간을 제외했다. flags 없는209곳/4,891구간만 계산하고975경계/18,131구간은 사유와 함께 보류한다.
- 원본 문턱 기둥체적을 집계 저장 상한으로 사용한다. 명시한 추가 순손실/초기재고/반복기간에 따라 초과분을 원본 receiver 경로로 전달하고151해양 종착점에서 한 번만 집계한다. 경로 합류 중복 없음.
- 100년·손실0·초기0에서154경계 초과 전달. 실제 수리 방류가 아니라 동일 기간·하도 손실0·지연0의 집계 모형이다. 기존 하류 유량을 포함하지 않는 증분 장부다.
- 새13+기존128자료 검사,새13+기존12브라우저 검사. 원본 경로 독립 추적·무손실 해석해·용량 층적분·손실 장부·보존·공유/JSON/보류/오류복구·1440/390/320px 확인.
- **조건부 처리4,891구간은 실제 해결 수가 아니다. 실제 해결0·미정23,022 유지.** 실제 침투/증발/저류/방류null. 수면 전환·열수지·출구 통수능·역수위는 미계산이며D298591의108보류·14중단도 유지.
- 원본927파일 중923보존. 기존 수정은 지도 링크와 인계3개. 종료된9곳·기존 보류·원본세계/경제/지형/기후/수계·구지도·전체보관브랜치 유지.

## 후속30 D298591 합류 운동량 장부 구현·검증·배포 완료 — 2026-10-21

기준 main `29bd0df7145c347c0fc1e07b111d110cbab74a1d`. [화면](../integration/natural-world/d298591-momentum/index.html) · [결과](../integration/natural-world/d298591-momentum/REPORT.md) · [방법·AI](../integration/natural-world/d298591-momentum/README.md). [PR #10](https://github.com/jungsb7/codex/pull/10)을 main에 병합·배포했다. 기능 커밋 `08eb8da78f76419042ece69af38f63678b6ccbef`, 병합 커밋 `eb82590a5113d1a2058e96ff25e73ac0806dff97`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39451834339)의 build/deploy/report-build-status 모두 성공했다. 공개 주소 직접 확인은 기존 환경 프록시403 제한으로 수행하지 못했다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-momentum/validation/deployment.json).

- 두 유입·한 유출의 정수압·유속항·각도·벽/바닥 압력/마찰을 명시하는 수평 운동량 장부다. 공간2차원 흐름이나 실제 외력을 푼 것이 아니다.
- 공통 유입 수면이라는 별도 근사로x방정식을 풀고y운동량과 에너지 필요조건을 검사한다. 부족한 외력을 자동으로 채우지 않는다. 보류 시trial만 남고accepted:null이며 실제값은항상null이다.
- 13가정 중7장부통과·6보류:외력1,에너지1,경계2,공통 해 범위2. 비대칭60+40,±30°는y힘약1.418MN이 부족하며,양의 벽 힘100kN은에너지공급이필요해보류한다.
- 후속29 지류별 에너지 수면은 그대로 비교한다. 가정 손실0.2/0.5m 사례에 필요한 추가x힘약−1.614MN을진단하되적용하지않는다. 원본유량/지형/조건부방류와결합하지않는다.
- 새15+기존113자료 검사,새13+기존12브라우저 검사. 해석적평행흐름·독립3차식·정수압적분·제작해·기준높이/밀도/반사불변량,13JSON·1440/390/320px·모바일외력편집을확인했다.
- **실제 해결0구간·미정23,022구간 유지.** 기존108보류·14중단·적설/열수지공백 유지. 기존897파일 중893파일 바이트 보존. 원본세계·경제·지형·기후·수계·구지도·전체아카이브·종료된9곳검토보존.

## 후속29 D298591 변단면·합류 검산 구현·검증·배포 완료 — 2026-10-20

기준 main `7269a80db5e1cca1fbabe96dc7a634cb012acc00`. [화면](../integration/natural-world/d298591-confluence/index.html) · [결과](../integration/natural-world/d298591-confluence/REPORT.md) · [방법·AI](../integration/natural-world/d298591-confluence/README.md). [PR #9](https://github.com/jungsb7/codex/pull/9)을 main에 병합·배포했다. 기능 커밋 `5384dd34fe73c1718588742169e9866e669866be`, 병합 커밋 `fdbd5ade962e34b9aa5af57fd316965afb2eda6e`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39447838367)의 build/deploy/report-build-status 모두 성공했다. 공개 주소 직접 확인은 환경 프록시403으로 제한됐다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-confluence/validation/deployment.json).

- 구간별 폭·바닥·둑·조도·길이와 수축/확대 손실을 명시하는 직사각형 정상류 후보를 구현했다. 합류 없는 일정 단면은 후속28과 비교하고, 변단면은 별도 미분 에너지식으로 검산했다.
- 두 지류와 중첩 지류의 원천 유량을 한 번씩만 합산한다. 합류에서 일정Q의 미분식을 그대로 잇지 않고, 명시한 지류별 손실수두로 에너지 경계를 푼다. 운동량은 미계산이며 비0° 합류는 보류한다.
- 10가정 중5완료·4중간 중단·1경계 보류. 미완료 구간 끝 수심·전체 에너지잔차는null이다. 완료5조건 최대 에너지잔차5.688e−8m⁴/s미만,50→25m수심차1.120e−7m미만이다.
- 원본12위상 첫지점+이후61지점 자체발생/옆합류로 하구 유량을 중복 없이 복원했다. 원본 장부는 별도이며 수리예제·동시100년수문곡선·D298591방류로 전환하지 않는다.
- 새13+기존100자료 검사, 새13+기존12브라우저 검사. 10예제/JSON·전체구간상태·공유/이력·오류복구·1440/390/320px와단면편집을 확인했다.
- **실제 해결0구간·미정23,022구간 유지.** 기존108하류 보류·14우회 중단·적설/열수지 공백 유지. 기존868파일 중864파일 바이트 보존,원본 세계·경제·지형·기후·수계·구 지도·전체 아카이브·종료된9곳 검토 보존.

## 후속28 D298591 명시적 가정 수로 후보 구현·검증·배포 완료 — 2026-10-20

기준 main `8cef6a3351af308525920dcc997233783fd37f4d`. [화면](../integration/natural-world/d298591-hydraulics/index.html) · [결과](../integration/natural-world/d298591-hydraulics/REPORT.md) · [재현·AI](../integration/natural-world/d298591-hydraulics/README.md). [PR #8](https://github.com/jungsb7/codex/pull/8)을 main에 병합했다. 기능 커밋 `5a22af211a4f6fd382db0d41c0cd700fcbc1b720`, 병합 커밋 `60223e492d58b6e0ab5500ed05688351644735fd`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39441134590)의 build/deploy/report-build-status 모두 성공했다. 공개 주소 직접 접속은 환경 프록시403으로 확인하지 못했다. 후속27의 대기했던 문서 내용도 이번 배포에 포함됐다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-hydraulics/validation/deployment.json).

- 실제 단면이 없는 상황에서 폭·둑·조도·유량·하상 경사·하류 수심·길이·중력을 명시하는 별도 가정 입력 계약을 구현했다. 초기 화면은 빈 값이며 입력을 바꾸면 이전 결과를 지운다.
- 일정한 직사각형 단면의 정상·점변·1차원 후보를 상류 방향으로 적분한다. 수면과 에너지선, 마찰 경사와 하상 경사를 구분한다. Fr≥0.98,급격한 수심 변화,가정 둑 한계에서 보류/중단하고 그 뒤를 계산하지 않는다.
- 원본에서 재사용한 것은 첫21셀의487.056km 길이뿐이다. 가정 경사0.00001·유량1000m³/s·둑20m·중력9.80665와 원본 고도·유량·골짜기 폭을 구별한다. 0m는 가상 하류 바닥으로서 해수면이 아니다.
- 36가정 중17완료·17경계 보류·2구간 중단. 실제 수위·방류·침수는null이며 기존108하류 수위 보류·14우회 상한 중단을 유지한다.
- 새13+기존87자료 검사, 새13+기존12브라우저 검사. 균일 수로 해·독립 수심 적분·별도 에너지 단계법·수치 세분화와36예제/JSON·1440/390/320px를 확인했다.
- **실제 해결0구간·미정23,022구간 유지.** 원본 세계·경제·기후·수계·구 지도·전체 아카이브·종료된9곳 검토를 보존했다.

## 후속27 D298591 출구 하류 근거 구현·검증·배포 완료 — 2026-10-20

기준 main `ac7f9e0a270a50875fc552504f39af8cf0a9f5f4`. [화면](../integration/natural-world/d298591-tailwater/index.html) · [결과](../integration/natural-world/d298591-tailwater/REPORT.md) · [재현·AI](../integration/natural-world/d298591-tailwater/README.md). [PR #7](https://github.com/jungsb7/codex/pull/7)을 main에 병합했다. 기능 커밋 `fe40da3f02d3ed0b985d782ac9471523cec05611`, 병합 커밋 `27360632be2432d2857b3d811be24382fb751c23`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39435159114)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 환경 프록시403으로 확인하지 못했다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-tailwater/validation/deployment.json).

- 출구301657→첫 해양352309,62셀·1473.149790km. 경로 위 호수·미정 저지·오르막0이나 실제 배수·수위 계산의 증거는 아니다.
- 전62셀은기존 설계 하천west-main과 겹친다. 첫20연결487.056km에서1m하강은 원본의0.05m최소 내리막 생성 규칙과 일치한다. 골짜기 폭29.055km도 지형 가공 변수로서 실제 하폭·월류 폭이 아니다.
- 기존 하류 집수621셀과D298591619셀은 서로 겹치지 않는다. 기존 정밀 유량 장부를 독립 복원하고 직전 경로+셀 발생+옆 합류로 표시했다. D298591 방류를 합산한 실제 유량·수위는null이다.
- 단면·조도·국지 수위·동시 수문곡선이 부족해 잠김 결합은 보류했다. 약1473km 떨어진 해양0m를 국지 하류 수위로 대체하지 않는다. 후속26의108보류·14우회 중단을 유지한다.
- 새12+기존75자료 검사, 새11+기존12브라우저 검사.62지점×3기간186조회·62실제JSON저장·744AI조회 상태·1440/390/320px확인.
- **실제 해결0구간·미정23,022구간 유지.** 원본 세계·경제·기후·수계·구 지도·전체 아카이브·종료된9곳 검토 보존.

## 후속26 D298591 132격자 조건부 출구 방류 구현·검증·배포 완료 — 2026-10-20

사용자가 다음 단계 진행을 요청해132기둥 동적 물수지와 제한된 출구 방류를 구현했다. 기준 main `4ba6823884181b0598ac6be86df4ee456c44e0fc`. [화면](../integration/natural-world/d298591-routing/index.html) · [결과](../integration/natural-world/d298591-routing/REPORT.md) · [재현·AI](../integration/natural-world/d298591-routing/README.md). [PR #6](https://github.com/jungsb7/codex/pull/6)를 main에 병합했다. 기능 커밋 `fb0a38e99ae2c26036ca21927a074bfe67c4598e`, 병합 커밋 `8dc0c59f936dd53257bf66da8bce4f98db5b04c7`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39430939458)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 환경 프록시403으로 확인하지 못했다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-routing/validation/deployment.json).

- 기존121+11원본 기둥,619원본 입력과5웅덩이의 진입점을 연결했다. 출구 아래 모든 국지 웅덩이가 합류함을 검사하고 수두 양수에서 조건부 자유 월류를 적분했다. 실제 출구 형상·폭을 채택하지 않았다.
- 증발3×외부 손실2×초기 재고2×가정 폭3의36조건 중22개100년 완료,14개우회 상한 중단. 원래 문턱175.2985076904297m,배타적 상한176.24058532714844m. 하류 수위+0.05/+0.5/+1m의108조합은 시작부터 보류했다.
- 공급 직후 상한에 도달하면 부분 단계로 줄여 수면·눈·얕은 저장·수치 초과분을 보존하고 이후 강제력 처리를 중단한다. 부분 연도 `complete:false`,보류 `annual:[]`,중단 후 순간 방류율null. 조건부 방류는 가정 장부 밖 이동이며 원본 수계·해양 유입에 미적용.
- 기본36조건 최대 누적 독립 잔차0.084m³ 미만.6조건30/60/120단계 비교에서60→120재고차<0.00310%,누적방류차<0.09905%,대표중단시각차약0.117일. 실제 정확도 인증 아님.
- 새13+기존62자료 검사와 새11+기존12브라우저 검사.111조건/시점 조회·39실제 JSON 저장·공유·오류 복구·1440/390/320px 확인. AI payload는 `d298591-routing/output/review.json.gz`이며619최종 눈·얕은 저장을 포함한다.
- **실제 해결0구간·미정23,022구간 유지.** 지속 적설·연2m증발 에너지 공백·미정 열수지/빙설·하류 잠김을 남겼다. 세계·경제·원본 지형/기후/수계·구 지도·전체 아카이브·종료된9곳 검토는 보존했다.

## 후속25 D298591 적설·에너지·출구 범위 구현·검증·배포 완료 — 2026-10-20

사용자가 다음 단계 진행을 요청해 같은 유역의 지속 적설 원인과 에너지·출구 조건을 구현했다. 기준 main `5bcce093daca1bc9cf4687fbb9d3f7ffd0fe8078`. [검토 화면](../integration/natural-world/d298591-constraints/index.html) · [결과](../integration/natural-world/d298591-constraints/REPORT.md) · [재현·AI](../integration/natural-world/d298591-constraints/README.md). [PR #5](https://github.com/jungsb7/codex/pull/5)를 main에 병합했다. 기능 커밋 `efd2e51c828ec2827a5b42d396d928cb1d563d35`, 병합 커밋 `f948a08db538f368735ae3332485d5001b049479`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39426035205)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 환경 프록시403으로 확인하지 못했다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다. [배포 기록](../integration/natural-world/d298591-constraints/validation/deployment.json).

- 지속 적설31격자 중18곳은 양의 기온이 없고13곳은 강설이 잠재 융설을 넘는다. 합계6.007900km³/년이며 모두 기존121수면 기둥 밖이다.619격자와12기온/계수 민감도의 독립200년 반복을 검산했다. 원본 기후·유량에는 적용하지 않았다.
- 이전12조건의 마지막 수면을 고정해144에너지 기간을 진단했다. 연2m 증발 잠열은9·10공전 기간에서 TOA 일사보다 크다. 이류·저장열 등 미정 항이 있어 증발 불가능 판정은 아니다. 실제 순복사·습도·수온·결빙은null이다. 원본4도 바람은 진단값이며2m 측정값이 아니다.
- 기존 출구 연결303194↔301657 하나를 제거하는 가정에서도+0.94207763671875m에서 다른 해양 연결이 열린다. 독립 고도순 union-find와 탐색 결과가 일치한다. 연결 영역은 실제 침수·닫힌 저류량이 아니다.
- 우회 문턱 직전 후보132기둥(추가11)의 원본 기후·저장은 모두 기존619격자 자료에 있다. 다음 동적 모델용 `outlet.candidateDomain`으로 제공하지만 실제 수면·출구는 채택하지 않았다. 하류 수위25조건 모두 실제 방류null·자동 연결false다.
- 새12+기존50자료 검사와 새13+기존12브라우저 검사 통과.36적설 조회·12실제 JSON 저장·25출구 조건·공유·오류 복구 및1440/390/320px 화면을 확인했다.
- **실제 해결0구간·미정23,022구간 유지.** 원본 지형·기후·수계·경제·세계관·구 지도·전체 아카이브·종료된9곳 검토는 보존했다. AI payload는 `d298591-constraints/output/review.json.gz`다.

## 후속24 D298591 동적 수면 전환 구현·검증·배포 완료 — 2026-10-20

사용자가 다음 목표 진행을 요청해 D298591 한 유역의 육지/수면 전환 장부를 구현했다. 기준 main `7f803eb5f3fd17d4ce3edbf887f9deb2646fd675`. [검토 화면](../integration/natural-world/d298591-surface/index.html) · [결과와 한계](../integration/natural-world/d298591-surface/REPORT.md) · [방법·재현·AI](../integration/natural-world/d298591-surface/README.md). [PR #4](https://github.com/jungsb7/codex/pull/4)를 main에 병합했다. 기능 커밋 `ba70c9fa300cc7dee5b00e63bab8390fad1e9e40`, 병합 커밋 `c2e493f7af0f12e95bbe2b7bc87dffd49f18c176`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39421522548)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 환경 프록시403으로 확인하지 못했다. [배포 기록](../integration/natural-world/d298591-surface/validation/deployment.json). 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

- 고정 전체 아카이브3,044파일을 별도 복원·해시 검증하고619격자×12기간 원본 강수·증발산·유출·눈·얕은 저장을 계측했다. 계측 전후 전체268,857격자 유출은 비트 동일하고 세계/지형·전역 물수지도 동일하다.
- 121원본 기둥을5국지 웅덩이로 나누고619물리 진입점을 보존했다. 잠긴 칸의 육지 유출·증발산을 끄고 수면 강수·융설을 한 번 넣는다. 눈·얕은 저장은 잠김/노출 중 보존·진화한다.
- 증발0.5/1/2m·년 × 외부 지하수 순손실0/0.25m·년 × 초기0/50%의12조건·100년을 구현했다. 움직이는 수면·손실과 원본 고도에서의 문턱 초과를 계산하되 실제 하류에는 배분하지 않는다.
- 새13+기존47자료 검사, 새11+기존12브라우저 검사 통과. 기존47 중 과거 초안10검사는 아카이브 이력 manifest를 임시 복원해 검사했다. 4조건30/60/120단계 비교의60→120 최종 재고 차이는0.00639% 미만이다.
- **실제 해결0구간·23,022구간 미정 유지.** 원본 눈이 연간 약6.008km³ 증가하는 한계, 수면 열수지·빙설·지하수·출구 형상/방류식·하류 수위가 남았다. 자유 월류식의 필요 폭은 조건부 민감도이며 실제 강폭이 아니다.
- 연도별 수면 격자·재고 그래프,12조건 비교, 공유·JSON 저장·오류 복구를 추가했다. AI payload는 `d298591-surface/output/review.json.gz`이며 `actual*`는null, `automaticAdoption:false`다. 기존 지도·구 시뮬레이터 보관·원본 물리 입력·경제·종료된9곳 검토는 보존했다.

## 후속23 미정 하류 분류·대표 유역 장부 배포 완료 — 2026-10-20

사용자는 실제 세부 하도·피복·침수·강폭·적설·결빙과23,022구간의 하류 처리가 해결됐는지 물었고, 미해결임을 확인한 뒤 **미정 원인 분류와 대표 유역 물수지 검증**을 지시했다. 이전 경관 검색 제안보다 이 요청을 우선했다. 구현·자료37검사(새9+기존28)·브라우저24검사(새12+기존12)와 배포를 완료했다. [PR #3](https://github.com/jungsb7/codex/pull/3), 기능 커밋 `563e9e94be3426a1e3183135fc736cb00e10060f`, 병합 커밋 `ae427f0700fd9567cb89fc3afdcf084311eef4db`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39417479845)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 환경 프록시403으로 확인하지 못했다. 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

- 23,022물길을1,184종착 경계에 대응하고 직접 진입 구간·원본12기간 유입·168,576집수격자를 대조했다. 상하류 구간 유량을 더하지 않고 경계 장부만 합산한다.
- 상호 배타 분류: 고온 방법 공백1,400구간, 극지 공백1,250, 수위 결합12, 다음 미정 경계15,439, 해양 출구 후보4,921. 중첩flags도 보존한다. 목적지만 세면 해양242경계·다음 경계942개다.
- 대표 D298591/D186192/D200327/D260741/D143595/D774651의 문턱 기하와60개 조건부 재고 실험을 구현했다. 손실0/0.25/0.5/1/2m·년×초기 재고0/50%,100년 반복 비교다.
- **실제 해결0구간·미정23,022구간 유지.** 체적 초과 미배분량은 실제 방류가 아니며 순손실 가정도 실제 침투·증발이 아니다. 실제 저류·침투·증발·넘침·피복·적설·결빙은null이다.
- 종료된9곳의1,452집수격자와 새 대표6유역이 겹치지 않음을 검사했다. 구 지도·전체 아카이브·세계관·경제·원본 기후/수계는 그대로다.

[결과 보고서](../integration/natural-world/downstream-budget/REPORT.md) · [검토 화면](../integration/natural-world/downstream-budget/index.html) · [재현·AI 사용](../integration/natural-world/downstream-budget/README.md) · [분류 JSON](../integration/natural-world/downstream-budget/output/summary.json). 최신 검증·배포는 이 단계 `validation/`에 기록한다. 기준 main `f939f3f28d1e35ace62cabd7442725d63abd9108`.

## 후속22 두 기간 비교 배포 완료 — 2026-10-20

사용자가 다음 목표 진행을 요청해 기존 대표30곳에 두 공전 위상 비교 화면을 추가했다. 구현·자료28검사·브라우저47검사와 main 반영·Pages 배포를 완료했다. [PR #2](https://github.com/jungsb7/codex/pull/2), 기능 커밋 `2d35eb24abffd5a2fa20b41c447873ccf2ffd90f`, 병합 커밋 `3866a998d804a9b9af64b2024d8ba83c89f112fd`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39414495555)의 build/deploy/report-build-status 모두 성공했다. 공개 도메인 직접 접속은 작업 환경 프록시403으로 확인하지 못했으며, 로컬 브라우저 검증과 구분한다. [배포 기록](../integration/natural-world/landscape-compare/validation/deployment.json). 최종 인계 문서 커밋은 기능 병합보다 최신일 수 있다.

- 같은 원본 대표 격자의 A/B 기온·강수·후보유량과 기존 모습 초안을 나란히 표시한다. 차이는 B − A이며 추세나 누적량이 아니다.
- 기간 교환·공유 주소·새로고침·뒤로 가기·클립보드 실패 안내·비교 JSON 저장을 제공한다. 좌표 JSON에도 `landscapeComparison`을 추가했다.
- A는 현재 지도 기간, B는 비교 기간이다. B 지도 보기에서는 A/B를 교환해 두 기간을 보존한다. B만 변경하면 계절 배열을 요청하지 않는다.
- 검증된 기존 catalog를 재사용한다. 새 기후·고도·피복 자료나 세계관 설정을 채택하지 않았으며 원본 표본·null·수계와 3기간 캐시를 유지한다.
- 자료28검사(새4+기존24), 모든4320기간 조합의 원본 일치, 브라우저47검사(새12+기존35), 30비교 JSON 저장을 통과했다. 숲/초원/습지×1500/390/320px 화면9장을 직접 검토했다.

[사용·재현·AI JSON](../integration/natural-world/landscape-compare/README.md) · [새 검증 기록](../integration/natural-world/landscape-compare/validation/). 기준 main은 `27f189f7f7983b4a17191ec48b510c12d7ecfc10`이다. 전체 보관 브랜치와 구 지도 공개 범위는 그대로 유지한다.

## 후속21 배포 완료 — 2026-10-20

기능 커밋: `25525ca79f9de4b807e9b177f945867df845a066`. 사용자 배포 승인 후 [PR #1](https://github.com/jungsb7/codex/pull/1)을 main에 병합했다. 병합 커밋 `c42718db1763650d03cb66250ac570c221c166de`의 [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39405351952)에서 build/deploy/report-build-status 모두 성공했다. 최초 자동 승인 거절은 이후 사용자 명시적 승인으로 해소된 과거 이력이다. [정확한 상태 기록](../integration/natural-world/landscape-notes/validation/deployment.json). 인계 문서 갱신 커밋은 기능 병합 커밋보다 최신일 수 있다.

- 기존 대표30연속군의 개별 설명 초안, 원본 좌표·고도·후보 지형/식생·수계 연결·연속군 보류 근거를 연결했다.
- 30대표점×12기간의 기온·강수·유량 표본과 계절 색조 제안을 제공한다. 대표 한 점의 값과 연속군 전체를 구분한다.
- 지도 **대표 경관 30곳** 선택·정보창·기간 비교·계절 지도 연결·설명/좌표 JSON 저장을 구현했다. 설명만 탐색할 때 전 대륙 계절 배열은 요청하지 않는다.
- 기존 권역/분류명을 표제로 유지하고 새 고유 지명·정치/문화/서사 설정은 정하지 않았다. 실제 피복 채택0건, 실제 면적·강폭·침수·결빙 등은 null이다.
- 설명 자료 약224KB에 크기·해시·지도 버전 검증과 실패 재시도를 적용했다. 기존3기간 캐시·모바일 접근성을 유지한다.

[사용·재현·검증](../integration/natural-world/landscape-notes/README.md) · [30설명](../integration/natural-world/landscape-notes/CATALOG.md) · [AI용 구조화 자료](../integration/natural-world/landscape-notes/output/catalog.json).

검증 기록은 `integration/natural-world/landscape-notes/validation/`에 있다. 자료24검사(새6+기존18), 원본360표본·30연속군·수계·null 대조를 통과했다. 브라우저35검사(새10+기존25), 30선택·360기간 조회·60실제 JSON 저장·320/390px 표시·오류 복구를 통과했다. 30개별 문단과 모바일6장·데스크톱2장을 검토했다. 기능 커밋과 Pages 결과는 이 단계 `validation/deployment.json`에 기록한다.

## 후속20 완료 — 2026-10-20

- 기간별 계절 로딩: 첫 선택 최대5.60MB(기존41.38MB), 인접 두 기간과 그래프 포함 상한9.47MB. 기온·강수·후보유량 전수 일치.
- 3기간 캐시·인접 미리 읽기·취소 및 늦은 응답 방지, HTTP/해시/목록/그래프 오류·재시도·새로고침·뒤로 가기 대응.
- 자연11권역+기존호수의 12대표 경관: 12/24/32배·데스크톱/390px 전후144장, 물길 대비·표시선 클릭·타일 이웃 여백·지명 겹침 개선.
- 자료18검사·브라우저25검사·경관72조건·12곳 JSON 일치. 원본·경제·세계관·미정 상태 유지.

기능 커밋: `3b17bb97ead2457ee811c1db73587856ca7e8533`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39374199800)의 build/deploy 결과와 실제 도메인 접속 제한은 [배포 기록](../integration/natural-world/seasonal-loading/validation/deployment.json)에 구분한다. 인계 문서 커밋은 기능 커밋보다 최신일 수 있다.

[구현·재현·성능](../integration/natural-world/seasonal-loading/README.md) · [12경관 점검표](../integration/natural-world/seasonal-loading/QUALITY.md) · [전후 비교](../integration/natural-world/seasonal-loading/REVIEW.html) · [자료 검사](../integration/natural-world/seasonal-loading/validation/model-tests.txt) · [패키지·보존 검사](../integration/natural-world/seasonal-loading/validation/package-checks.json).

로컬 3회 중앙값의 첫 계절 표시3.60초→1.20초, 추가 JS heap19.00MB→7.93MB, backing storage39.76MB→9.25MB. 전체 프로세스 RSS나 실제망 속도 보장이 아니다. 캐시 밖 전환은 추가 요청 때문에 이전 전체 선로딩보다 느릴 수 있다.

## 후속19까지 완료한 기반 기능

- 전 대륙268857개 육지·기존호수 격자, 자연11권역 통합 지도.
- 12기간 기온·강수·상대강수 및 후보유량 표시.
- 기존27개 선형 자연물(산계16·주요강7 포함), 물길후보45824구간 선택 정보창.
- 12배 이상 자연/지형/식생 보기의 보간 음영·등고선·계곡·숲/습지 패치. 명목3.26km 설계 표시이며 원본 약26km 물리자료를 변경하지 않는다.
- 경관 후보6528연속군·대표30곳 초안. 실제 피복 채택0건.

후속19 당시 기능 기준 커밋: `376f07e035f771d2ddc4554011ca3e8bba115e83`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39357485994)의 build/deploy 성공. [지도](https://jungsb7.github.io/codex/integration/natural-world/unified-atlas/index.html).

49검사와 원본1663파일 보존은 **당시 검증 기록**이다. [validation/final-checks.json](validation/final-checks.json), [배포 기록](validation/deployment.json)을 보존했다. 현재 원격 main은 이 인계 문서 추가 등으로 위 기능 커밋보다 새로울 수 있다.

## ZIP 없이 재현

```sh
git clone --depth 1 https://github.com/jungsb7/codex.git
cd codex
node handoff/restore-inputs.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs integration/natural-world/seasonal-loading/test.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

열 주소: `http://127.0.0.1:8000/integration/natural-world/unified-atlas/index.html`. 정적 지도 실행에는 입력 복원이 필요 없다. 복원은 개발·자료 검사에 필요하다.

복원 스크립트는 이미 커밋된 기후4조각·수계2조각을 읽고 합친gzip과 압축해제JSON의 원본SHA-256을 확인한다. 원본 계절 입력도 정확한 직렬화와 해시를 확인한다. 복원 대상5파일은 재생성 가능하므로 Git에서 제외한다. 이미 존재하는 내용이 다르면 중단하며 덮어쓰지 않는다. 원본 계절파일의 뒤에 줄바꿈을 추가하면 원본 바이트 해시가 달라지는 점에 유의한다.

복원 가능한 자료:

| 자료 | 저장소 안 근거 | 개발 시 복원 위치 |
|---|---|---|
| 전체12기간 기온·강수 | climate 분할bin 및 sources.json | stage2/inputs/seasonal.json |
| 기후·지질 진단 | 같은 climate 분할bin | stage2/output/diagnostics.json |
| 수계 연결·구간·12기간 표시유량 | water 분할bin | stage3/output/waterways.json |
| 원본gzip2개 | 동일 조각 합치기 | stage5/output/*.json.gz |

위 표의 상대 경로는 `integration/natural-world/` 기준이다. 원본 고정자료와 계절지도입력을 새로 계산하지 않는다. 다른 기존 공개 패키지도 저장소에 보존되어 있다.

## 브라우저 검사

Playwright 및 Chromium을 준비한 뒤 저장소 루트에서:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node handoff/browser-check.cjs "$PWD"
```

환경변수를 생략하면 `require('playwright')`, `/usr/bin/chromium`을 사용한다. 이 도구는 `/codex/` 경로로 로컬 서버를 열고 기존 기능12개 회귀검사를 실행한다. 후속20의 지연 로딩13검사와 경관 검사는 해당 단계 README의 명령을 따른다. 새 실행 결과는 `handoff/local-validation/`에 남기며 `handoff/validation/`의 과거 기록을 덮어쓰지 않는다. 원본 단계의 build/package/record 스크립트는 별도 전체소스 경로를 전제로 할 수 있으므로 무작정 실행하지 않는다.

## 저장소 범위와 보존 규칙

현재 main은 배포본·개발 입력·세계관 원문·최신 인계 문서를 제공한다. **제공된 원본 폴더 전체 3,044개 파일, 2,480,165,475바이트**는 별도 `archive/full-handoff-20261020` 브랜치에 보관했다. 구 v0.107 행성 시뮬레이터 실행 HTML·개발 소스·역사 기록·검증 자료와 캐시도 포함한다. [전체 보관 범위와 복원](FULL_ARCHIVE.md)을 참고한다. 원본 폴더에 없던 과거 버전을 추가 수집한 것은 아니다. 큰 ZIP을 채팅에 다시 업로드할 필요 없이 GitHub에서 복원한다.

미정 경계1184곳·집수권168576격자·물길23022구간의 실제 저류/침투/넘침은 미정이다. 실제 강폭·피복면적·침수·결빙도 null을 유지한다. 앞선9곳 국지 검토는 종료되어 새 필수 연구로 재개하지 않는다. 기존 설정/계산 후보/추가 설계 표시를 구분한다.

## GitHub 인계 재현 확인

이번 인계 전환에서 저장소 자료만으로 입력5파일의 바이트 일치를 검증하고 자료12검사·브라우저12검사를 다시 통과했다. 결과: [입력 복원](validation/repository-input-restore.json), [자료 검사](validation/repository-model-tests.txt), [브라우저 검사](validation/repository-browser-checks.json). 당시 후속19의49검사 기록과 구분한다.

## 다음 인계 갱신 방식

작업마다 이 문서와 루트 시작 안내에 완료 범위, 새 검증 결과 경로, 관련 커밋·Pages 결과, 미정과 다음 목표를 갱신한다. 새 기능의 source/검사 도구와 필요한 입력의 복원 경로를 함께 커밋한다. 큰 캐시·중복gzip·전체 ZIP을 매번 저장소에 넣지 않는다. 원격 최신 HEAD를 확인하고 변경 목록을 검토한 뒤 갱신한다.
