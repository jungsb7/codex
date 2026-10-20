# 명시적 가정 수로의 정상류 후보 — 후속28

[화면](index.html) · [결과·검증](REPORT.md) · [36가정 입력](output/catalog.json)

후속27에서 실제 단면·조도·하류 수위가 없음을 확인했다. 이번에는 사용자가 값을 명시하는 별도 직사각형 수로 후보를 구현했다. **실제 수위·방류·침수는null,자동 채택false,실제 해결0구간·23,022구간 미정**이다. 기존108하류 수위 보류와14우회 상한 중단을 해제하지 않는다.

## 입력 계약

형식 `rectangular-steady-assumption/1`, `kind:explicit-design-assumption`, `section:rectangular-prismatic`. 다음8개 숫자를 모두 요구한다. 누락·null·문자열·NaN·무한대는 계산 불가이며 기본값으로 대체하지 않는다. 범위는 이번 후보의 구현 제한으로서 자연 하천의 보편적 물리 한계가 아니다.

| 필드 | 단위 | 허용 범위 |
|---|---|---|
| widthM | m | 1~10000 |
| bankDepthM | 하상 위 m | 0.1~200 |
| manningN | s/m⅓ | 0.005~0.2 |
| flowM3S | m³/s | 0.001~1000000, 양의 일정 유량 |
| bedSlope | m/m, 하류 방향 하강 | 0~0.01 |
| downstreamDepthM | 가상 하류 바닥 위 m | 0.001~200 |
| lengthM | m | 1~1000000 |
| gravityMPerS2 | m/s² | 1~30 |

초기 화면은 빈 입력으로 시작한다. 사용자가 가정 예제를 선택하거나 값을 입력해 계산한다. 입력을 바꾸면 이전 결과를 지운다. 예제 중력9.80665도 명시적 가정이며 실제 행성 중력을 새로 채택한 값이 아니다. 유량0·음수·역류는 이번 솔버가 지원하지 않으며 실제 유량0으로 출력하지 않는다.

## 방정식과 범위

일정한 직사각형 단면, 일정한 양의 유량Q, 정상·1차원·점변류·정수압 분포를 가정한다. 측방 유입·구조물·폭 변화·수축/확대 손실은 모델에 없다. 속도 보정계수α=1이다. `b`는폭,`y`는수심,`A=by`,`R=A/(b+2y)`,`v=Q/A`다.

[USACE 에너지 방정식](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/equations-for-basic-profile-calculations)의 수두 구분과 [마찰 손실 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/friction-loss-evaluation)을 참고한다. SI단위 Manning식은 `Sf=(nQ/(A R^(2/3)))²`다. [USACE SI식](https://www.hec.usace.army.mil/confluence/rasdocs/rasmuddebris/non-newtonian-technical-reference-manual/non-newtonian-flow-equations/1d-saint-venant-equations)은 SI 계수1을 명시한다. 영미단위 계수1.486을 SI계산에 넣지 않는다.

하류 경계에서 **상류로** 증가하는 거리s를 사용한다. 가상 하류 바닥을0으로 두어 `z=S0 s`다. `E=z+y+v²/(2g)`, `Fr²=v²/(gy)`, `dE/ds=Sf`를 적용하면 다음식이 된다. 이는 위 가정을 놓고 에너지식을 미분해 얻은 이 작업의 유도다.

```
dy/ds = (Sf - S0) / (1 - Fr²)
d(마찰 손실)/ds = Sf
```

수심과 누적 마찰 손실을 함께 적분한다. 수면은`z+y`, 에너지선은`E`로 따로 표시한다. 마찰 경사Sf와 하상 경사S0를 같은 값으로 놓지 않는다. 한계 수심은 `(Q²/(g b²))^(1/3)`, 등류 수심은`Sf(y)=S0`의 이분 탐색 해다. S0=0이면 유한한 등류 수심은null이다. 등류 진단은 직사각형 단면을 수직으로 연장한 해이며 `normalDepthWithinBank:false`이면 둑 안의 유효 수심으로 쓸 수 없다.

[USACE 적용 한계](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/1d-steady-flow-program-limitations)의 정상·점변류·1차원 제한을 따른 좁은 후보다. 도수·한계류 통과·사류·역류·범람원·구조물·비정상 홍수파를 풀지 않는다. HEC-RAS를 실행하거나 그 기능 전체를 재현한 것은 아니다.

## 수치 계산과 보류

RK4한 단계와 두반단계를 비교해 오차를 추정하며 두반단계를 채택한다. 수심·누적손실 증분 차이를15로 나눈 추정오차에 절대1e−9m+상대1e−8허용오차를 적용한다. 최대 단계2000m,최소0.0001m,반복 상한100000이다. 내부 단계에서도 적용 조건을 검사한다.

- `Fr≥0.98`, `|dy/ds|>0.05`, `y≥bankDepthM` 또는 유효하지 않은 수심에서 단계 축소/보류한다. 이 보수적인 기준은 실제 임계 현상을 보정한 결과가 아니다.
- 경계 입력부터 적용 범위 밖이면 `held-boundary`, `profile:[]`,상류 끝 수심null이다.
- 중간에 한계에 접근하면 마지막 유효 지점까지만 `stopped`로 남긴다. 이후 수면을 연장하지 않는다.
- `guardProbeIntervalM`은 마지막 유효 거리와 실패한 최소 수치 단계의 검사 구간이다. 정확한 물리 사건 위치의 보증 구간이 아니다.
- `bank-limit`는 가정 단면의 적용 중단이다. 실제 홍수·범람량·습지·침수 면적을 계산한 것이 아니다.

## 경로 길이와 가정 민감도

후속27의 첫21셀301657→320078 경로 길이487056.3661590521m만 예제 길이로 재사용한다. 원본 고도 하강1m,원본29.055km골짜기 폭,원본 유량은 계산에 채택하지 않는다. 모든 예제는 별도로 경사0.00001,일정유량1000m³/s,둑높이20m,중력9.80665m/s²를 가정한다. 따라서 가상 하상 총상승4.870563662m는 원본의1m하강을 재현한 것이 아니다.

폭100/1000/5000m×n0.025/0.05/0.08×하류 수심0.5/2/10/30m의36예제를 비교한다. 하류 수심은 이487km구간 끝의 **가상 국지 경계**이며 해양0m와 다르다. 12원본 위상 유량은 이 모델의 동시 수문곡선이 아니다. 원본 측방 합류와 D298591의 조건부 방류를 더하지 않는다. 입력에 실제 강폭이나 출구 잠김 여부를 확정할 근거는 여전히 없다.

## 재현·AI

```sh
node integration/natural-world/d298591-hydraulics/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-hydraulics/test.cjs
node integration/natural-world/d298591-hydraulics/query.cjs W1000-N0.05-D10
node integration/natural-world/d298591-hydraulics/query.cjs --input /path/to/assumptions.json
node integration/natural-world/d298591-hydraulics/package-check.cjs
node integration/natural-world/d298591-hydraulics/browser-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

전체 아카이브나 원본 기후 배열 복원은 새후보 계산에 필요 없다. 기존 회귀검사는 `node handoff/restore-inputs.cjs`로 입력을 복원한다. 브라우저검사는 Playwright/Chromium이 필요하며`PLAYWRIGHT_MODULE`,`CHROMIUM_PATH`로 경로를 지정할 수 있다.

AI출력 `d298591-hydraulics-selection/1`은 출처·원본에서 채택한 범위·가정 입력·전체 유효 수면·중단 사유·수치 진단을 포함한다. `candidate.status`가completed여도 실제 물리 해결은0이다. `candidate.summary.upstreamEndDepthM`은완료된 가정만 값이 있고, `actual`내 모든 값은항상null이다. `coupledRoutingReady:false`,`automaticAdoption:false`를 유지한다. `output/catalog.json`은36입력과검증용요약이며 전체계산출력은CLI/화면저장으로 얻는다. 저장JSON과CLI가 동일한 계산핵심을 사용하며, 검증은 별도 방정식으로도 수행했다.
