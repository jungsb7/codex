# 웅덩이별 흐름과 원본 물수지 — 후속 검토3

[화면](index.html) · [보고서](REPORT.md) · [최종 검증](validation/final-checks.json)

D126467의51개·D147845의1개 국지 지형 웅덩이를 나누고, 각각의 유입·차오름·넘침·합류·재분리를 계산합니다. 원본6,850격자의82,200개 기간별 강수·증발산·눈·얕은 저장 장부를 계측했습니다. 실제 호수52곳을 확정한 것이 아닙니다.

원본 계산식은 서부 유역의 **토양·얕은 지하수 통합 저장**을 사용합니다. 두 항을 독립적인 실제 토양 수분·대수층 저장으로 나눌 근거가 없어 개별 값은 `null`입니다. 새 수면 증발·눈/얼음·지하수 교환과 동적인 육지→수면 전환도 미정입니다.

## 화면과 CLI

프로젝트 루트에서 실행합니다.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/integration/natural-world/pond-budget/index.html`을 엽니다. `index.html`, `app.js`, `style.css`가 함께 필요합니다. HTTP로 검증했습니다. 기존 자연 지도 링크에는 기존4개 gzip 자료도 필요합니다.

- 추가 순손실0/0.25/0.5m·년과 가정1~500년차를 선택합니다.
- 상류/하류/전체 범위에서 가정 수면 또는 웅덩이·집수권을 봅니다. 같은 색의 수면은 해당 시점에 연결된 같은 물그릇입니다.
- 격자·웅덩이 목록·표의 행을 눌러 원본 연간/12기간 장부와 합류 상태를 조회합니다. 외부 집수 칸도 유입 대상 웅덩이로 연결됩니다.
- 원본 장부는 원본 수문식의 마지막 계산연도(6년차)입니다. 저류 실험의1~500년차와 섞지 않습니다.
- 주소 복원, JSON 저장, 모바일 조회를 지원합니다. 토양·얕은 지하수의 작은 저장 변화는0km³로 반올림해 숨기지 않고m³로 표시합니다.

CLI 인자는 `비교안 년차 원본격자ID 원본기간` 순서입니다. 원본기간0은 연간 합계,1~12는 해당 원본 계산기간입니다.

```sh
node integration/natural-world/pond-budget/query.cjs ponds-sink-0.25 500 155640 0
node integration/natural-world/pond-budget/query.cjs ponds-sink-0.5 50 134150 3
node integration/natural-world/pond-budget/query.cjs ponds-sink-0 9 153990 2
```

## 계산과 계측

원본 HTML을 읽어 메모리에서 제공하는 사본에 세 개의 계측 지점을 넣었습니다. 대상 분기 확인, 소단계 이전 눈/얕은 저장 읽기, 원본 결과 읽기만 추가했습니다. 원본 파일이나 계산 산술은 수정하지 않았습니다. 전체268,857격자의12기간 발생 유량이 기존 수집본과 바이트 단위로 같고, 전역 장부·세계·지형 해시도 동일합니다.

원본 격자8방향의 최대 하향 경사로 국지 웅덩이를 나눕니다. 같은 높이의 평탄부를 먼저 묶어 거짓 웅덩이·순환을 방지합니다. 원본 수송 그래프의 외부 유입은 실제 진입 칸까지 추적한 뒤 해당 웅덩이에 한 번 배정합니다. 연결턱의 최소 높이로 합류 트리를 만듭니다. 한쪽이 먼저 차면 이웃 웅덩이로 물을 보내고, 양쪽이 찬 뒤부터 하나의 수위를 갖습니다. 손실로 수위가 내려가면 연결턱에서 다시 나뉩니다.

초기저류0·현재 계절 유입500년 반복·기간당30소단계는 비교 가정입니다. 추가 순손실 깊이를 반 단계 적용하고 유입/넘침을 계산한 뒤 나머지 반 단계를 적용합니다. 같은 알고리즘의 단일 수위 대조군을 별도로 계산해 공간 분할 효과를 구분합니다. 실제 수면 증발·침투량이나 미래 기후 예측이 아닙니다. 이동 시간·하도 저류·수위별 방류 공식은 미정입니다.

수송용12기간은 기존3단계처럼 `현재 원본기간과 다음 기간의 평균`입니다. 강수·증발·저장 변화에도 같은 변환을 적용하지만, 원본 시작/종료 저장량은 원래 시간 순서로 보존합니다. 원본 연말의 눈 축적을0으로 강제하지 않습니다.500년 반복 비교에서 원본 육지 저장을500년 동안 직접 진화시킨 것은 아닙니다.

## 자료와 재현

| 파일 | 내용 |
| --- | --- |
| inputs/fluxes.json |6,850격자×12기간,13개Float64 필드·면적·원본 계측 근거 |
| inputs/collection.json | 원본 전체 유량·전역 장부·세계 해시 동일성 |
| output/topology.json |52개 국지 웅덩이·50개 상류 합류·하향 경로·연결턱 |
| output/budgets.json | 웅덩이/상위유역 원본·수송기간 장부 및 격자별 연간 장부 |
| output/scenarios.json |3개안500년 결과·같은 계산식의 단일 수위 대조·주요 연도 기간 수지 |
| output/surface-replacement.json |500년차 후보 수면 칸에서 제외할 원본 육지 항목, 새 수면 항목 미정 |
| output/geometry.json | 집수격자 배정·지형·지도 자료 |
| output/summary.json, checks.json | 핵심 결과·출처 해시·전용9개 검산 |

기본 재현은 이미 계측한 입력을 사용합니다. Node24, Playwright, Chromium을 사용했습니다.

```sh
node integration/natural-world/pond-budget/build.cjs > integration/natural-world/pond-budget/validation/build-summary.txt
node integration/natural-world/pond-budget/view.cjs
node --test --test-isolation=none integration/natural-world/pond-budget/core.test.cjs integration/natural-world/pond-budget/audit.test.cjs integration/natural-world/retention-review/test.cjs > integration/natural-world/pond-budget/validation/model-tests.txt
node integration/natural-world/pond-budget/browser-check.cjs
node integration/natural-world/pond-budget/verify.cjs
```

원본 계측을 다시 검증해야 할 때만 `node integration/natural-world/pond-budget/collect.cjs`를 실행합니다. 로컬 HTTP 서버로 원본 계산기를 실행하므로 몇 분 걸립니다. 현재 서부 수문 분기가 달라지거나 원본 해시·발생량이 달라지면 수집은 실패하도록 했습니다. 앞 단계 빌드/검증으로 현재 자연지도를 덮어쓰지 않습니다.

신규22개+이전 핵심10개 수치 검사32개, 브라우저10개를 통과했습니다. 이전 전체 검증 증거는 파일 동일성으로 보존하며 재실행했다고 표현하지 않습니다. 원본·경제 장부·현재 지도·1~6단계·검토1/2는 보존했고 자동 채택·원격 배포는 하지 않았습니다.

다음은 **기존 기후에 맞는 수면 증발·눈/얼음 가정의 범위를 정하고, 기존 육지 항목을 대체하는 수면 전환 물수지를 비교**하는 작업입니다.25m 절하안과 D144758 내부 처리의 보류 상태는 유지합니다.
