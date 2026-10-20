# 두 지류 합류의 운동량·에너지 장부 — 후속30

[검토 화면](index.html) · [결과](REPORT.md) · [13개 가정](output/catalog.json)

후속29의 합류는 지류별 손실 수두를 입력하는 에너지 후보였다. 이번에는 단순한 두 유입·한 유출의 **수평 평면 운동량 장부**를 추가했다. 각도·단면·힘을 모두 가정으로 명시한다. 공간 2차원 흐름을 푼 것이 아니며 실제 합류 형상·손실·벽 압력을 예측하지 않는다.

**실제값null,자동 채택false,실제 해결0구간·미정23,022구간 유지.** 기존108하류 보류·14우회 상한 중단·적설/열수지 공백은 그대로다.

## 입력 계약

형식 `two-inlet-momentum-assumption/1`, `kind:explicit-design-assumption`. 입력 없는 값은 자동으로 채우지 않는다. 최종 유출 유량은 두 유입의 합이며 별도 총유량 입력은 거부한다.

| 입력 | 의미와 허용 범위 |
|---|---|
| alpha / beta | 에너지/운동량 속도 보정계수,둘 다 명시적1 |
| gravityMPerS2 / densityKgM3 | 가정 중력1~30m/s² / 밀도100~2000kg/m³ |
| closure | `equal-inlet-water-surface`: 두 유입의 수면 높이가 같다는 별도 근사 |
| controlVolume | `horizontal-plan-static-boundaries`: 수평 평면,정지한 경계 |
| externalWorkW | 외부 기계 일률0만 지원. 압력에 의한 개방 단면 에너지 이동은E에 포함 |
| inlets | 고유ID를 가진 유입 단면 정확히2개 |
| flowM3S / angleDeg | 각 유입0.001~1,000,000m³/s / 유출 방향 기준−85~85° |
| comparisonLossM | 각 유입의 후속29 에너지 비교용 손실0~20m. 운동량 해에 미사용 |
| widthM / bedM / bankDepthM | 모든 단면의 폭1~10000m / 공통 가상 바닥−10000~10000m / 바닥 위 둑0.1~200m |
| outlet | 고유ID,flowM3S:null,angleDeg:0,경계depthM0.001~200m와 위 단면값 |
| forces.wallN | 개방 단면 압력 이외 벽 힘의x/y 성분 |
| forces.bedPressureN | 바닥 압력 힘의x/y 성분 |
| forces.frictionN | 마찰력의x/y 성분 |

각 힘은 N 단위의 명시적 숫자−1e12~1e12다. 0도 사용자가 선택하는 가정이며 누락·null을0으로 바꾸지 않는다. 실제 형상·길이·Manning n이 없으므로 이 힘을 자동 계산하지 않는다. 중력의 수평x/y 성분은0이다. 이는 하상 방향으로 축을 기울여 중력 성분을 쓰는 근사와 다르다.

유출 방향을+x,그 왼쪽 수평 방향을+y로 한다. 각도 양수는 반시계 방향이다. 유입 방향은 합류부로 들어오는 속도 방향이다. 각 단면은 해당 속도 방향에 수직인 직사각형 절단면,정수압 분포,기준 대기압0을 가정한다. 분기·역류·비정상·도수·사류는 지원하지 않는다.

## 식과 기술 근거

[USACE 운동량 적용 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/applications-of-the-momentum-equation)은 정수압·운동량 유속항·외력을 구분한다. [특정력 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/overview-of-optional-capabilities/mixed-flow-regime-calculations)의 단면 수두 단위를 직사각형/β=1에 적용하면 다음과 같다.

```
A = b y
P = ρ g b y² / 2              [정수압 합력 N]
J = ρ Q² / A                 [운동량 유속항 N]
M = (P + J)/(ρg) = b y²/2 + Q²/(g b y)   [m³]
```

[USACE 합류 운동량법](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.1/overview-of-optional-capabilities/modeling-stream-junctions/momentum-based-junction-method)은 유입 각도를 투영하며,상류 두 수면이 같다는 근사를 사용한다. 이 페이지의 방법은종방향 힘만 평가한다. 본 구현은 이를 그대로 재현한 것이 아니라,위 절단면 가정에서 **수평x/y 두 성분을 별도로 장부화한 제한된 확장**이다. HEC-RAS를 실행한 결과가 아니다.

```
Qout = Q1 + Q2
Σ (Pi + Ji) ei + Fsupplied = (Pout + Jout) (1,0)
Frequired = (Pout + Jout) (1,0) − Σ (Pi + Ji) ei
잔차 = Fsupplied − Frequired
추가 필요 힘 = Frequired − Fsupplied
```

`ei=(cosθi,sinθi)`다. 벽·바닥 압력·마찰 입력을 모두 더해Fsupplied로 쓴다. 추가 필요 힘은 진단값일 뿐 입력이나 실제 힘으로 채택하지 않는다. 양쪽 힘이 동시에 맞아야 장부를 통과한다.

공통 유입 수면η를 가정해 `yi=η−zi`로 놓고x방정식에서η를 구한다. 서로 바닥이 다르면 수심도 다르다. **이 공통 수면 가정은 후속29의 에너지 수면을 고친 값이 아니다.** 비교 결과가 다르면 그대로 남긴다. 합류 단면이 가깝다는 근사조차 실제 형상으로 확인한 것이 아니므로 완료는 필요조건 검산에 한정된다.

## 에너지 필요조건

```
E = z + y + v²/(2g)
Drequired = ρg Σ Qi (Ei − Eout)       [W]
```

정지 경계·외부 기계 일률0에서 필요한 소산D가 음수라면 다른 공급/가정이 필요하므로 보류한다. 큰 공통 기준 높이의 차감 오차를 줄이도록 유입별 수두 차이를 먼저 계산한다. 미세한 음수도0으로 잘라내지 않는다.

비음수는 **소산의 필요조건**이며 마찰력과 혼합 손실 사이의 실제 관계를 검증한 결과가 아니다. 지류별 수두 차이가 달라도 전체 에너지 이동이 있을 수 있으므로,각 지류의손실이모두양수라는조건은추가하지않는다. 운동량 외력만으로 실제 소산 법칙·벽 형상·국지 난류·수면 분포가 정해지지 않는다.

## 수치 범위와 출력 상태

각 단면Fr<0.98,수심<둑 높이 범위만 쓴다. 두 유입의 허용η범위 교집합에서x방정식을 이분법으로 푼다. 유입각도의cos가양수이고,`dM/dy = b y (1−Fr²)>0`이므로 이 제한된 가지의근은유일하다. 수면 구간오차1e−10m,최대100회다.

힘 허용오차는 `1e−6N + 1e−8 × 힘 크기 척도`다. 척도는 개별 입력힘·단면(P+J) 중 최대절댓값이다. 에너지 허용오차는 `1e−9 × ρg max(1,Q(y+v²/2g))`로 가상 기준 높이에 의존하지 않는다. 구현의 수치 판정일 뿐 자연 하천의 정확도 기준이 아니다.

| 상태 | 의미 |
|---|---|
| invalid-input | 입력 계약 실패. trial/accepted:null |
| held-boundary | 유출 경계의 둑/Fr 한계. trial/accepted:null |
| held-domain | 공통 허용 수면 해 없음. trial/accepted:null |
| held-momentum | x시험해가 있으나x/y 힘 수지가 허용오차 밖. trial만 남고accepted:null |
| held-energy | 힘이 맞아도 필요한 소산이 음수. trial만 남고accepted:null |
| completed | 힘 수지와 에너지 필요조건 통과. accepted도 명시적 가정 결과이며 actual은null |

`trial`은 미채택 시험값이다. `accepted`는 이 후보의 장부 통과값으로 실제 채택을 뜻하지 않는다. `automaticAdoption:false`, `coupledRoutingReady:false`, `spatial2DSolver:false`를 함께 제공한다. 실제 침수·저류·침투·빙설·물길 해결을 의미하지 않는다.

## 후속29 비교

별도 `energyComparison`은 `Ei=Eout+comparisonLossM`에서 각 유입 수심을 구한 뒤,같은 외력 입력으로 운동량 장부를 검사한다. 서로 다른 수면을 강제로 같게 하지 않는다. 이 비교는 각도가0°가 아닌 경우에도 식의 형식적 비교로만 제공되며,후속29 솔버의 각도 지원 범위를 확대한 결과가 아니다.

`phase29-comparison` 예제는 후속29 `junction-losses`의 **가정 단면·가정 국지 경계**를 읽는다. 원본 지형/합류 장부/12위상 유량을 새 수리 입력으로 가져오지 않는다. 기존 전체 네트워크나D298591조건부방류를 다시 계산하지 않는다.

## 재현·AI

```sh
node integration/natural-world/d298591-momentum/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-momentum/test.cjs
node integration/natural-world/d298591-momentum/query.cjs symmetric-30
node integration/natural-world/d298591-momentum/query.cjs --input /path/to/assumptions.json
node integration/natural-world/d298591-momentum/browser-check.cjs
node integration/natural-world/d298591-momentum/package-check.cjs
```

새 후보는 저장소의 작은 명시적 가정만 필요하다. 기존 회귀 입력은 `node handoff/restore-inputs.cjs`로 복원한다. 브라우저 검사는Playwright/Chromium을 사용하며 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 경로를 지정한다.

AI 출력은 `d298591-momentum-selection/1`이고 전체 입력·시험값·장부 통과값·힘 성분·에너지 비교·null과 보류 이유를 포함한다. CLI 인수/JSON 구문 오류는exit1,입력 계약 실패는구조화 출력+exit2,완료/보류는exit0이므로status를읽어야한다. 브라우저 저장JSON은화면내부결과와완전히일치한다. Node/Chromium간 계산은 절대1e−6+상대1e−10 이내로 대조하며 키/null/플래그는 완전히 일치해야 한다.
