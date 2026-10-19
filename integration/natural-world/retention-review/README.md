# 함몰부 보정 검토1 — D126467

6단계 후속으로 우선12구역의 출구를 조사하고, 첫 구역 D126467의 원본 출구·25m 낮춘 출구와 추가 순손실0/0.25/0.5m·년을 비교했습니다. [비교 화면](index.html), [결과 보고서](REPORT.md), [최종 검증](validation/final-checks.json)을 제공합니다.

**원본 지형·현재 지도·기존1~6단계 결과·경제 장부는 그대로입니다.** 이번 결과는 별도 민감도 비교이며 실제 호수·저류량·증발·침투·새 하천으로 채택하지 않았습니다.

## 실행

프로젝트 루트에서:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/integration/natural-world/retention-review/index.html`을 엽니다. 비교안6개와1~500년차를 선택해 가정 수위·저류·다음 경계 유입을 보고 JSON으로 저장합니다. 원본 자연 지도 링크는 기존5단계 HTML과4개 gzip 자료가 함께 있어야 합니다. file:// 실행은 검증하지 않았습니다.

같은 결과의 CLI 조회:

```sh
node integration/natural-world/retention-review/query.cjs original-sill-sink-0.25 500
node integration/natural-world/retention-review/query.cjs lowered-sill-sink-0 166
```

비교안 ID는 `original-sill-sink-0`, `original-sill-sink-0.25`, `original-sill-sink-0.5`, `lowered-sill-sink-0`, `lowered-sill-sink-0.25`, `lowered-sill-sink-0.5`입니다.

## 방법과 경계

- 원본 D8 배수 후보가 함몰부 밖으로 나가는 연결을 조사하고 다시 같은 구역으로 돌아오는 연결을 제외합니다. 원본 넘침 고도와 일치하는 출구 후보를 찾습니다.
- 원본 격자 중심 고도와 구면 면적으로 수위–체적 관계를 계산합니다. 각 격자를 일정 고도의 기둥으로 보는 근사이며 실제 호소 수심·피복 경계가 아닙니다.
- 원본12기간 경계 유입량을500년 반복합니다. 초기 저류0은 비교 가정이고 현재 저장량은 미정입니다. 기간당30소단계, 연360소단계로 계산합니다.
- 추가 순손실0/0.25/0.5m·년은 비교 가정입니다. 해당 면적의 증발·침투 관측값이나 새 호수의 완전한 물수지가 아닙니다. 수면 전환에 따른 원본 육지 강수·ET·토양 저장을 대체하지 않았습니다. 경계 유입에 이미 포함된 강수도 다시 더하지 않습니다.
- 넘침은 다음 미정 함몰부 D147845까지 추적합니다. 그 구역의 내부를 통과시켜 해양 유출로 배정하지 않습니다.
- 25m 절하안은 원본 배수 경로를 따른 별도 하상 프로파일입니다. 원본 고도·시설·공사량을 변경하거나 확정하지 않습니다. 다음 경계에 도달할 때도 약0.123m 절하가 남아, 하류 연속성 검토가 더 필요합니다.
- 같은 수위를 부여한 낮은 격자가 떨어진 여러 조각일 수 있습니다. 화면의 빗금은 수위 이하 후보 칸이며 실제로 연결된 수면이 아닙니다.500년차에도 저장량이 증가하면 평형으로 해석하지 않습니다.

수지식은 `경계 유입 = 추가 순손실 + 넘침 + 저류 변화`입니다. 매 소단계의 손실은 사용 가능한 물을 넘지 않으며, 저류가 출구 높이의 체적을 넘으면 초과분만 다음 경계로 보냅니다. 소단계 처음·유입 후 면적의 평균으로 손실을 계산합니다. 기간당60소단계와의 민감도도 비교했습니다.

## 자료

| 파일 | 내용 |
| --- | --- |
| output/summary.json | 핵심 결과·6개 대안·권고·소스 해시 |
| output/diagnostics.json | 우선12구역의 출구 후보·되돌아오는 연결·다음 경계 |
| output/scenarios.json | 모든 대안의500개 연간 행,1년차·첫 넘침연도·500년차의 월별 수지 |
| output/geometry.json | 원본 지형 일부,검토 격자,출구·다음 경계 경로 |
| output/lowering-profile.json | 25m 절하 비교 프로파일과 미해결 하류 연속성 |
| output/downstream-impact.json | 500년차의 월별 원본/비교안 다음 경계 유입·장부 차이 |
| output/assumptions.json | 초기 상태·반복 기후·순손실·저류 기하 등 가정 |
| output/checks.json | 9개 전용 검산 항목 |

## 재현

Node24, 브라우저 검사는 Playwright와 Chromium을 사용합니다. 원본 수집·경제 재계산·기존 지도 재빌드는 필요하지 않습니다.

```sh
node integration/natural-world/retention-review/build.cjs > integration/natural-world/retention-review/validation/build-summary.txt
node integration/natural-world/retention-review/view.cjs
node --test --test-isolation=none integration/natural-world/retention-review/test.cjs integration/natural-world/stage6/test.cjs integration/natural-world/stage5/test.cjs integration/natural-world/stage4/test.cjs integration/natural-world/stage3/test.cjs integration/natural-world/stage2/test.cjs integration/natural-world/test.cjs integration/atlas/test.cjs > integration/natural-world/retention-review/validation/model-tests.txt
node integration/natural-world/retention-review/browser-check.cjs
node integration/natural-world/retention-review/verify.cjs
```

다음은 D126467의 출구와 연결되는 **D147845를 포함한 연쇄 함몰부**의 지형·저류 연결 검토입니다. 실제 수면을 채택하기 전 수면 전환에 따른 원수지와 연결된 웅덩이 구조를 확인해야 합니다. 자동 채택·원격 배포는 수행하지 않았습니다.
