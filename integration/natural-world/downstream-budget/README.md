# 미정 하류 분류와 대표 유역 장부 — 후속23

[검토 화면](index.html) · [결과 보고서](REPORT.md) · [전역 요약 JSON](output/summary.json)

사용자가 하류 미정23,022구간의 원인 분류와 대표 유역 물수지 검증 진행을 요청했다. 기존 후속11의 연결 검사·후속12의1,184경계 우선순위를 재사용해 **물길 구간 단위 대응과 대표6유역의 조건부 장부**를 추가했다. 실제 하류 처리의 확정 수는0이며 미정23,022구간을 해결 완료로 표시하지 않는다.

## 범위

- 모든23,022구간의 원본ID·종착 경계·상하류 연결과 직접 진입 여부를 대조한다.
- 1,184종착 경계의 원본12기간 유입을 보존한다. 168,576집수격자를 중복 없이 집계한다. 상하류 물길의 유량들을 합쳐 유입을 부풀리지 않는다.
- 고온·극지 방법 공백, 하류 수위 결합, 다음 미정 경계, 해양 출구 후보를 구분한다. 분류는 검토 순서이며 실제 저류/침투/넘침 유형의 판정이 아니다.
- 대표6유역은 조건별 원본 유입 순위로 선택한다. 종료된9곳이 속한 D193196과 이전 D126467·D147845·D144758 연구를 제외한다.9곳의1,452집수격자와 실제로 겹치지 않는 것도 검사한다.
- 대표별100년×추가 순손실5조건×초기 재고2조건의 총60실험을 기록한다. 화면과 CLI에서는1~500년의 조건부 계산이 가능하다(화면 선택은1/10/100년).

## 장부의 의미

원본 고도와 위도별 격자 면적에서 `V(H)=Σ max(0,H−z) A`를 계산한다. H는 기존 검토의 출구 연결 높이이며, 자료 범위는 해당 함몰부와 출구 접근에 필요한 허용오차 칸이다. H에서 전 영역의 연결 여부를 독립 탐색으로 확인한다. 문턱보다 낮은 수위의 실제 충전 순서·국지 웅덩이 사이 전달·현재 수면 경계를 계산한 것은 아니다.

순손실 가정의 단위는 **문턱 높이 기준 면적당 m/년**이다. 실험 중 고정 면적이며 실제 젖은 면적이나 침투율이 아니다. 기존 육지 유출은 그대로 사용하고 강수를 다시 더하지 않는다. 이는 새 수면 모델로의 변환이 아니라 기존 경계 장부 위의 추가 순손실 민감도다.

각365/12일 기간에서 원본 유입을 더한 후 순손실을 가용 물량 이내로 차감하고 기하 체적을 초과하는 부분을 별도 미배분 항으로 분리한다.

`시작 재고 + 유입 = 적용 순손실 + 체적 초과분 + 종료 재고`

원본 유입12기간을 반복하며 초기 재고는0 또는 문턱 체적의50%를 비교한다. 실제 초기 수위, 강수·유량 관측, 미래 기후, 출구 수리식, 유하 시간, 하류 역수위는 포함하지 않는다. 초과분은 실제 방류로 배정하지 않고 다음 경계에도 다시 더하지 않는다.

`필요 평균 손실 하한 = max(0, S₀ + N×연 유입 − V) / (N×기준 면적)`은 전체 기간의 필요조건이다. 계절별 물이 몰리면 이 값보다 큰 손실 가정에서도 체적을 넘을 수 있다. 별도 반례 검사를 포함한다. `연 유입/기준 면적`은 장기 균형에 필요한 등가 깊이이며 현실적으로 가능한 손실률이라는 뜻이 아니다.

## AI·CLI

```sh
node integration/natural-world/downstream-budget/query.cjs D298591 0.5 100 0
# 경계 ID 또는 물길 ID / 추가 순손실 m·년 / 반복 년수 / 초기 체적 비율
```

경계는 `D...`, 물길은 숫자ID다. 물길 번호는 원본ID이며 순위나 좌표ID가 아니다. 대표 대상 이외는 원본 분류·경계 정보를 반환하고 `experiment:null`이다. 해양 연결 물길, 존재하지 않는 ID, 잘못된 실험 인자는 오류 처리한다. UI에서도 원본 경계/물길 조회와 실제 비교 JSON 다운로드가 가능하다.

`output/review.json.gz`를 gzip 해제하면 `downstream-boundary-review/1` JSON이다. `groups`는1,184경계, `reaches`는23,022구간, `representatives`는6개 원본 기하·집수권·60실험이다. 출처SHA-256은 `provenance`에 있다. 원본필드 `monthlyInflowM3`는 새 결과에서 `periodInflowM3`로 명시하며 값은 그대로다.12기간은 공전 위상이며 지구 달력 월이 아니다.

`capacityExcessM3`와 `totalCapacityExcessM3`는 **체적 초과 미배분량**이다. `actualStorageM3`, `actualInfiltrationM3`, `actualEvaporationM3`, `actualOverflowM3`는null이다. AI는 초과분을 실제 하류 방류로 바꾸거나 원본 과학 방법 공백을 해결됐다고 해석해서는 안 된다.

## 재현

기준 main: `f939f3f28d1e35ace62cabd7442725d63abd9108`. 저장소만으로 실행 가능하며 전체 보관 브랜치 복원은 필요 없다.

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/downstream-budget/build.cjs
node --test --test-isolation=none integration/natural-world/downstream-budget/test.cjs
node integration/natural-world/downstream-budget/browser-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저 검사에는 Playwright·Chromium이 필요하며 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 경로를 바꿀 수 있다. 검토 화면은 `/integration/natural-world/downstream-budget/index.html`이다. 통합지도 수계 검증 사이드바에도 링크를 추가했다. 새 페이지는 지도·전 대륙 계절 배열을 불러오지 않고 약0.55MB 검토 자료만 검증해 읽는다.

새 생성기는 자기 폴더의output만 쓴다. 기존 수계·기후·지형·세계관·경제·아카이브와 과거 검증 결과는 변경하지 않는다. 검증 결과와 배포 상태는 `validation/`에 남긴다.

## 방법 참고

연속방정식에 따라 유입·유출·저장 변화를 분리한다. 실제 저수지 추적은 저장과 방류의 관계, 초기 조건, 출구 및 하류 조건이 추가로 필요하다. [USACE HEC-HMS의 저류·추적식 설명](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/reservoir-modeling/reservoir-modeling-concepts-and-equations)을 참고했다. 이번 코드는 HEC-HMS나 Modified Puls 구현이 아닌 집계 재고 장부 실험이다. 외부 자료에서 이 가상 행성의 침투율·증발률·출구 계수를 가져오지 않았다.

## 검증 결과

- 생성 단계 전역8검사, 새 자료9검사와 기존 자료28검사, 새 브라우저12검사와 기존 지도12검사를 통과했다.
- 모든23,022구간의 종착점을 원본 receiver에서 독립 재추적했다. 대표 기둥체적과 구면 격자 면적·문턱 연결도 별도로 대조했다.
- 60실험×1,200기간의 최대 기간 잔차는1.20×10⁻⁷m³ 미만, 최대100년 누적 잔차0.352m³ 미만, 최대 상대 잔차1.01×10⁻¹⁴ 미만이다. 산술 보존 검사이며 물리적 정확도 인증이 아니다.
- 브라우저60조건·실제 JSON6개 저장·물길/경계 조회·지도 연결·주소 복원·HTTP/해시/스키마 오류와 재시도를 검증했다.1440/390/320px 화면3장을 직접 검토했다.
- 기준 main696파일 중692파일은 바이트 동일하다. 기존 수정4파일은 지도 링크1개와 인계 문서3개다. 원본·기존 구현·종료된 검토 자료는 유지했다.

[배포 기록](validation/deployment.json) · [자료 검사](validation/model-tests.txt) · [기존 자료 회귀](validation/regression-model-tests.txt) · [브라우저 검사](validation/browser-checks.json) · [보존 검사](validation/package-checks.json)
