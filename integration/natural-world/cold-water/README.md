# 남는 눈, 스며드는 물 — 후속 검토5

[비교 화면](index.html) · [결과 보고서](REPORT.md) · [최종 검증](validation/final-checks.json)

기존 D126467·D147845 두 집수권의6,850격자에서 장기 눈 축적을 진단하고,52개 웅덩이의 지하 교환을4개 가정으로 비교합니다. 실제 빙하·호수 얼음·대수층을 확정하지 않습니다.

## 계산의 의미

**눈:** 원본12기간 기온·강수에서 강설 총량과 원본 융설 능력(양의 기온×45mm/기간)을 비교합니다. 장기 잔여는 `max(0,강설−잠재 융설)`입니다. 이 값은 계절 눈 저장 자체와 다릅니다. 원본500년 결과의250→500년 변화와 대조합니다. 기온 민감도0/0.5/1/2/3/5°C는 강수를 고정하며, 축적 해소 임계는 원본 강설 임계0°C의 불연속도 포함합니다. 기후 예측이 아닙니다.

**에너지:** 원본 `application/source/app.js:solarAt`의 태양상수1361W/m²·기울기23.4°와 동일한 일평균 대기권 상단 일사를 사용합니다. 각30° 기간에서64점으로 평균합니다. 기준 수면안500년차 말의 눈에서 다음1년을 계산해, 해당 칸을 수면으로 가정했을 때의 융설/수요 증발 잠열을 합산합니다. 서로 다른 화면 시점·지하 교환안의 실제 에너지 장부로 표시하지 않습니다. 구름·알베도·장파·열 저장·이류를 모르면 상단 일사를 지표 순에너지로 바꿀 수 없습니다. 수요/일사가1보다 작아도 실제 융설·증발 가능성을 인증하지 않습니다.

**얼음:** 연간 동결 도일을 이상화된 Stefan 열전도 식에 넣고, 고정 눈 두께0/10/30cm를 비교합니다. 얼음 열전도율2.2W/m/K, 밀도917kg/m³, 융해 잠열334kJ/kg, 눈 열전도율0.3W/m/K는 명시적 물성 가정입니다. 공기=얼음 표면 기온, 바닥 열0, 고정 눈을 전제하며 융해·수온·바람·적설 변화·잠열의 전체 수지는 계산하지 않습니다. 실제 얼음이나 보편적 상한이 아닙니다. 고정 눈 두께는 원본 물 환산 적설량을 실제 눈 깊이로 변환한 값이 아닙니다.

**지하 저장:** 이전 검토4의 동일한 강수·눈·얕은 저장·수면 전환 식에 웅덩이별 가정 지하 저장을 추가했습니다. 비교안은 교환0, 수면에서0.05m/년 누출 후 보유, 같은 누출 후 평균5년 지연 환류,0.2m/년 누출 후 보유입니다. 누출은 해당 시점의 수면 면적에만 적용하고 연결된 물로 제한합니다. 원본 토양/얕은 저장을 다시 지하 저장으로 넣지 않습니다.

환류는 지하 저장에서 같은 웅덩이로 지수 감쇠 방출합니다. 소단계의 절반 환류→기존 증발/유입→누출→절반 환류→지표 전환 순서입니다. 연간 `강수+상류유입−증발−경계유출 = 눈+얕은저장+수면+지하저장 변화`가 맞아야 합니다. 누출−환류는 지하 저장 변화와 같습니다. 물을 미확인 샘·해양으로 사라지게 하지 않습니다.

누출률은 투수계수·Darcy 계산·관측값이 아닙니다. 지하 수두가 없으므로 실제 교환 방향도 모릅니다. 보유안은500년 동안 환류를 허용하지 않는 비교로 저장 한도가 무한한 계산 상자이며 실제 용량을 인증하지 않습니다. 결과를 유역 전체 면적과 가정 유효 공극률5%/20%로 나눠 **필요한 포화 두께**를 보여 줍니다. 실제 대수층 형상·공극률·수두는 `null`입니다.

교환0은 앞선 수면안500년 결과를 재현합니다.2소단계/기간으로 실행하고 보유/환류 두 경우를4소단계로 재검산합니다. 다음 D144758 경계 이후와25m 절하·역수위 문제는 그대로 보류합니다.

## 화면·CLI

프로젝트 루트에서 `python3 -m http.server 8000 --bind 127.0.0.1`을 실행하고 `http://127.0.0.1:8000/integration/natural-world/cold-water/index.html`을 엽니다. HTML은 자료를gzip으로 담고, 브라우저의 DecompressionStream으로 풉니다. app.js/query.js/style.css가 함께 필요합니다.

4개안,1/10/50/100/250/500년차,55개 눈 축적 격자·52개 웅덩이, 외부 집수 격자를 조회할 수 있습니다. 연간 축적·가정 수면·열전도 결빙 참조 지도, 잠열 수요 표, 지하 저장 용량, JSON 저장과 주소 복원, 모바일 화면을 제공합니다.

```sh
node integration/natural-world/cold-water/query.cjs store-005 500 124875 0.1
node integration/natural-world/cold-water/query.cjs return-005 100 155640 0.3
```

마지막 인자는 결빙 참조에만 쓰는 고정 눈 두께(m)0/0.1/0.3입니다. 수면 모형이나 원본 기후를 바꾸지 않습니다. 조회되는 웅덩이별 지하 저장은 해당 칸 자체의 실제 지하수량이 아닙니다.

## 재현

입력은 pond-budget의 fluxes/topology와 surface-water의 geometry/scenarios입니다. 원본 일사 소스·입력·코드 해시는 output/summary.json에 기록합니다. 이전 결과를 재생성하거나 덮어쓰지 않습니다.

```sh
node integration/natural-world/cold-water/build.cjs > integration/natural-world/cold-water/validation/build-summary.txt
node integration/natural-world/cold-water/view.cjs
node --test --test-isolation=none integration/natural-world/cold-water/core.test.cjs integration/natural-world/cold-water/audit.test.cjs integration/natural-world/surface-water/core.test.cjs > integration/natural-world/cold-water/validation/model-tests.txt
node integration/natural-world/cold-water/browser-check.cjs
node integration/natural-world/cold-water/verify.cjs
```

Node24·Playwright·Chromium을 사용했습니다. 원본·경제·기존 지도와 검토1~4는 유지합니다. 실제 자연물 자동 채택·원격 배포는 하지 않습니다.

다음 단계는 새로운 미확인 물리 값을 늘리는 대신, 이번 근거와 보류 조건을 전 대륙 지도에서 구분되는 검토 표식·채택 목록으로 연결하는 작업입니다. 이번 두 유역의 결과를 전 대륙의 사실로 일반화하지 않습니다.
