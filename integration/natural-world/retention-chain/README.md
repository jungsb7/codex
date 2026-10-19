# 연쇄 함몰부 검토2 — D126467 → D147845

[비교 화면](index.html) · [결과 보고서](REPORT.md) · [최종 검증](validation/final-checks.json)

상·하류 두 함몰부의 원본 출구를 연결한3개 저류 비교안을 제공합니다. 추가 순손실0/0.25/0.5m·년을 선택하고1~500년차의 수위·넘침·저류 변화, 최저점과 연결되거나 분리된 저지 후보를 확인합니다. 하류 단독 비교를 함께 표시해 상류 기여량을 구분합니다.

**이전25m 절하안의166년차 넘침은 단독 출구 가정의 결과입니다.** 이번 지형 검토에서 기존8표본 절하 이후에도 안쪽281.871m 턱이 남는 것을 확인했습니다. 목표260.524m까지 연속 연결하면 하류 출구261.591m가 더 높아집니다. 따라서3개 절하안은 연쇄 계산을 보류하고 결과를 `null`로 제공합니다. 과거 비교 파일은 이력으로 보존했습니다.

## 실행

프로젝트 루트에서 다음을 실행합니다.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/integration/natural-world/retention-chain/index.html`을 엽니다. `index.html`, `app.js`, `style.css`가 함께 필요합니다. HTTP로 검증했으며 file:// 실행은 검증하지 않았습니다. 기존 자연 지도 링크는 기존4개 gzip 자료도 필요합니다.

- 비교안·시점 선택, 전체/연결부 확대, 격자 클릭, 주소 복원, JSON 저장을 지원합니다.
- 파랑/초록은 해당 가정 수위에서 각 최저점과 연결되는 후보 칸입니다. 주황 빗금은 수위 이하이지만 최저점과 분리된 칸입니다. 실제 수면 확정이 아닙니다.
- 보류안은 지도에 원본 지형·경로만 표시하고 수위·유량을 생성하지 않습니다.

CLI 결과는 화면·다운로드와 같습니다.

```sh
node integration/natural-world/retention-chain/query.cjs original-sill-sink-0 273
node integration/natural-world/retention-chain/query.cjs original-sill-sink-0.25 500
node integration/natural-world/retention-chain/query.cjs lowered-sill-sink-0 166
```

마지막 명령은 보류 상태와 `result: null`을 반환합니다. 계산안은 `original-sill-sink-0`, `original-sill-sink-0.25`, `original-sill-sink-0.5`입니다.

## 계산의 범위

1. 원본 경계 유입을 각각 독립 재합산합니다. 상류6,452격자와 하류398격자는 원본 종착 유역 기준으로 겹치지 않습니다.
2. 각 구역의 원본 격자 중심 고도·구면 면적을 기둥체적으로 계산합니다. 초기저류0, 현재12기간 유입500년 반복, 기간당30소단계입니다.
3. 상류 넘침을 같은 소단계의 하류 자체 유입에 한 번 더합니다. 추가 순손실은 사용 가능한 물을 넘지 않습니다. 넘침은 출구 체적 초과분입니다.
4. 하류 단독 비교도 같은 초기저류·손실을 사용합니다. 현재 방류량의 관측 또는 채택값이 아닙니다.
5. 다음 D144758 경계에서 추적을 멈춥니다. 다음 경계의 원본 유입과 신규 전달량을 구분하며 바다로 자동 통과시키지 않습니다.
6. 격자8방향 최소 연결 높이를 별도로 계산합니다. 원본 함몰부와 연결 경로 안의 지형 검토이며, 유하 시간·역류·수위별 방류량이나 전체 지역의 대체 출구를 계산하지 않습니다.

저류 모델은 분리된 웅덩이를 같은 수위로 묶는 근사입니다. 연결 지도는 이 한계를 드러내는 별도 검토이지 모델이 모든 웅덩이를 개별 계산한다는 뜻이 아닙니다. 실제 수면의 강수·증발과 원본 육지 ET·토양·눈 저장을 대체한 물수지는 아직 미정입니다. 경계 발생량에 포함된 강수를 다시 더하지 않습니다.

## 파일과 재현

| 파일 | 내용 |
| --- | --- |
| output/summary.json | 두 구역·다음 경계·결과·보류 이유·출처 해시 |
| output/scenarios.json |3개안의 연500행·연결 상태, 주요 연도의12기간 수지,3개 보류안 |
| output/connection.json | 원본/8표본 절하 후 최소 연결 경로, 안쪽 턱, 잠재 역수위 조건 |
| output/water-budget.json | 두 유역 발생량 재합산·함몰부 안/외부 기여와 원수지 미정 항목 |
| output/geometry.json | 지형 배경·격자·최저점 연결 높이·출구 경로 |
| output/checks.json |10개 전용 검산 |

Node24, Playwright, Chromium으로 검증했습니다.

```sh
node integration/natural-world/retention-chain/build.cjs > integration/natural-world/retention-chain/validation/build-summary.txt
node integration/natural-world/retention-chain/view.cjs
node --test --test-isolation=none integration/natural-world/retention-chain/test.cjs integration/natural-world/retention-review/test.cjs > integration/natural-world/retention-chain/validation/model-tests.txt
node integration/natural-world/retention-chain/browser-check.cjs
node integration/natural-world/retention-chain/verify.cjs
```

신규20개·이전 핵심10개 수치 검사를 실행했습니다. 기존1~6단계와 검토1의 나머지 검증 증거는 파일 해시 동일성으로 유지하며 다시 실행했다고 표현하지 않습니다. 원본·경제 장부·현재 지도·이전 산출물 보존, 자동 채택·원격 배포 없음.

다음은 **이 두 구역의 웅덩이별 유입·합류 구조 및 유역별 강수·ET·눈·토양 저장 추출**입니다. 검토 구역을 계속 하류로 확장하기 전에 수면 채택에 필요한 원수지를 확보합니다.
