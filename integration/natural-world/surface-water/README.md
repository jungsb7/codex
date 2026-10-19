# 육지가 수면이 될 때 — 후속 검토4

[비교 화면](index.html) · [결과 보고서](REPORT.md) · [검증](validation/final-checks.json)

D126467·D147845의52개 국지 웅덩이에 기존6,850격자의 기온·강수를 적용하고, 육지/수면 전환에 따른 증발과 저장을 비교합니다. 전 대륙의 실제 호수나 빙하를 확정한 결과가 아닙니다.

## 가정과 계산

- 원본6년차 시작의 눈·토양/얕은 지하수 통합 저장을 초기값으로 사용합니다. 수면 저류는0에서 시작합니다. 원본12기간 기후를500년 반복하면서 모든 저장량을 이어서 계산합니다. 수송용 인접기간 평균은 적용하지 않습니다.
- 육지 계산은 원본의 강설 임계0°C, 융설45mm/°C·기간, 증발 지수2×max(T+5,0), 유출/얕은 저장 배분65/35%, 기간당 저장 잔존율75%를 사용합니다. **기존의 기간 말 일괄 계산을 연속 시간 식으로 확장**했습니다. 원본 이산식82,200기간은 별도 참조 함수로 재현합니다. 새 연속식의 결과를 원본 발생량과 동일하다고 표현하지 않습니다.
- 한 기간 안에서 눈이 소진되는 시간을 정확히 나눕니다. 일정 재충전과 얕은 저장의 지수 감쇠를 해석적으로 적분해 시간 간격을 잘게 나누더라도 같은 육지 과정이 유지됩니다.
- 수면 증발 수요는 같은 기온 지수의0.75/1/1.5배입니다. 기온에 의한 수면 개방 비율은 `clamp(T/2,0,1)`이며, 눈이 남아 있는 시간에는 수요를 억제합니다. 별도 비교안은 기온에 의한 억제만 해제합니다. 관측된 증발 범위·실제 얼음 성장/두께/잠열 모형은 아닙니다. 실제 얼음량은 `null`입니다.
- 물에 잠긴 칸의 원래 육지 계산을 중지하고 그 칸의 강수·융설을 수면에 한 번만 넣습니다. 눈은 위치를 유지하며 육지/수면 소속만 바뀝니다. 얕은 저장은 기본안에서 바닥에 보유하고, 드러나면 남아 있는 값으로 재개합니다. 민감도안은 침수 때100%를 저류체로 방출합니다. 저장을 초기화하거나 다시 채우지 않습니다.
- 각 소단계의 시작 지표로 강수/융설/증발 수요를 계산하고, 반 증발→유입/넘침→반 증발→지표 전환 순서로 처리합니다. 증발은 해당 웅덩이에서 연결된 물만 제거합니다. 수위가 연결턱 아래로 내려가면 다시 분리합니다. 침수 저장수 방출로 추가 침수가 생기면 단조롭게 반복 처리합니다.
- 기간당2소단계와4소단계를 비교합니다. 기후는 원본 기간 안에서 일정하며 새 일별 날씨를 생성하지 않습니다. 지하수 교환은 **비교 가정0**, 실제 교환량은 `null`입니다.
- 상류 넘침은 하류의 물리적 진입 칸으로 한 번 전달합니다. 다음 D144758 경계 이후,25m 절하, 역수위, 하도 이동시간은 계산하지 않습니다.

육지 대조군에도 같은 연속식·초기 저장·시간 간격을 적용합니다. 이전 검토의 고정 원본유출·추가 순손실0/0.25/0.5m·년은 별도 실험으로 보존하며 수면 증발 계수와 동일시하지 않습니다.

## 화면과 CLI

프로젝트 루트에서 `python3 -m http.server 8000 --bind 127.0.0.1`을 실행하고 `http://127.0.0.1:8000/integration/natural-world/surface-water/index.html`을 엽니다. HTML과 app.js/query.js/style.css가 함께 필요합니다.

6개안,1/10/50/100/250/500년차,52개 웅덩이 최저점과 외부 집수 격자를 조회합니다. 수면/눈 지도, 연간 물수지, 침수·노출 저장 전환, 비교표, 주소 복원, JSON 저장과 모바일 화면을 제공합니다. 눈 지도는 물 환산 깊이이며 실제 적설 깊이나 빙하 두께가 아닙니다.

```sh
node integration/natural-world/surface-water/query.cjs water-central 500 155640
node integration/natural-world/surface-water/query.cjs water-high 100 153990
```

기간 말 격자 저장을 보존한6개 시점만 CLI에서 선택할 수 있습니다. 연간 결과는500년 모두 출력 자료에 있습니다. ‘제외된 원본 육지 유출’은 변화한 침수 칸에 원본6년차 유출을 적용한 참조값이며, 이미 대체된 현재 유량에서 또 빼지 않습니다.

## 자료와 재현

입력은 이전 검토의 `inputs/fluxes.json`, `output/topology.json`, `output/geometry.json`을 읽습니다. 재계측하거나 이전 파일을 갱신하지 않습니다. 출처·코드 해시는 summary.json에, 원본/이전 통합 보존은 final-checks.json에 기록합니다.

```sh
node integration/natural-world/surface-water/build.cjs > integration/natural-world/surface-water/validation/build-summary.txt
node integration/natural-world/surface-water/view.cjs
node --test --test-isolation=none integration/natural-world/surface-water/core.test.cjs integration/natural-world/surface-water/audit.test.cjs integration/natural-world/pond-budget/core.test.cjs > integration/natural-world/surface-water/validation/model-tests.txt
node integration/natural-world/surface-water/browser-check.cjs
node integration/natural-world/surface-water/verify.cjs
```

Node24·Playwright·Chromium으로 검증합니다. 원본·경제 장부·현재 자연지도·이전 검토는 유지합니다. 원격 배포와 새 수면 자동 채택은 수행하지 않습니다.

다음은 장기간 남는 눈이 실제 빙하로 이어질 조건과 에너지·얼음·지하수 가정을 좁히는 검토입니다. 이 과정을 마치기 전 거대한 수면 후보를 실제 호수로 채택하지 않습니다.
