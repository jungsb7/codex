# 변단면·합류 가정의 보존 검산 — 후속29

[화면](index.html) · [결과](REPORT.md) · [입력 예제·원본 별도 장부](output/catalog.json)

폭·바닥·조도가 구간마다 달라지는 직사각형 수로와 합류만 있는 나무 구조를 계산한다. 원본 지형·하폭·유량을 채택하지 않은 **명시적 설계 가정**이다. 실제 수위·방류·침수 등은null,실제 해결0구간·23,022구간 미정,자동 채택false다. 기존108하류 수위 보류·14우회 상한 중단을 해제하지 않는다.

## 입력 계약

`rectangular-tree-assumption/1`, `kind:explicit-design-assumption`. 수치 입력에는 기본값이 없다. 예제를 선택하면 모든 가정을 명시하여 불러온다. 원본값이나 과거 계산값으로 빈 입력을 보충하지 않는다.

| 입력 | 의미·제한 |
|---|---|
| alpha | 속도 에너지 보정계수1만 지원 |
| gravityMPerS2 | 가정 중력1~30m/s² |
| junctionModel | `prescribed-loss-energy` |
| momentumAssumption | `angle-effects-excluded-not-solved`를 명시 |
| downstream | 유일한 말단reachId와depthM0.001~200m |
| reaches | 1~31구간,고유영문ID,하류ID또는말단null |
| inflowM3S | 최상류만0.001~1,000,000m³/s. 합류 뒤 구간은 반드시null |
| junctionLossM | 비말단 구간의 합류부 전체 손실 수두 가정0~20m. 말단null |
| junctionAngleDeg | −180~180°를 받지만0°만 계산. 나머지는 합류부 보류. 말단null |
| contractionCoefficient / expansionCoefficient | 구간 내 수축/확대 손실계수 각각0~1 |
| sections | 구간당2~64개,상류부터하류순 |
| xM | 구간 상류0부터 증가,최대1,000,000m,간격최소1m |
| bedM | 가상 공통 기준 높이−10000~10000m |
| widthM / bankDepthM / manningN | 폭1~10000m / 하상 위 둑0.1~200m / SI Manning n0.005~0.2 |

분기·순환·자기 연결·다중 말단·중복ID는 거부한다. ID는유량의 원천 식별자다. 최상류 유량만 한 번 합산하고 각 하류 구간의원천ID목록을 보존한다. **상하류 지점의 총유량을 더하는 입력은 허용하지 않는다.** 분포 측방유입은 지원하지 않으며 별도 지류 구간으로 명시해야 한다. 입력의구간순서는 결과 유량에영향을 주지 않는다.

원본 시공간 좌표와 무관한 가정 단면이다. 같은 구간 내 단면 사이의폭·바닥·둑·조도를 선형 보간한다. 각 구간 안의Q는 일정하고 합류부에서만 유량이 바뀐다. 예제중력9.80665도 실제행성중력 채택이 아니다.

## 방정식과 기술 근거

[USACE 기본 에너지식](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.6/theoretical-basis-for-one-dimensional-and-two-dimensional-hydrodynamic-calculations/1d-steady-flow-water-surface-profiles/equations-for-basic-profile-calculations)은 위치·수심·속도수두와 구간 손실을 구분한다. 이 구현은 단일 직사각형 단면에α=1,평균마찰경사를 적용한 제한된 후보이며 HEC-RAS를 실행한 것이 아니다.

```
A = b y, R = A / (b + 2y), v = Q/A
Vh = v²/(2g), E = z + y + Vh
Sf = (n Q / (A R^(2/3)))²        [SI 계수1]
Eu − Ed = L (Sfu + Sfd)/2 + C |Vhu − Vhd|
```

u는상류,d는하류다. 하류로 속도수두가 증가하면수축계수,감소하면확대계수를 선택한다. 각 수치단계에서 속도수두 변화량에 비례하는 손실을 더한다. 이 가정은 수치단계를 나눌 때마다 고정 손실을 다시 더하는 방식이 아니다. 보간 구간의 속도수두가 비단조이면 각 변화의 절댓값을 누적한다. 원본 합류부나 실제 급확대의 손실을 보정한 모델은 아니다.

[USACE 합류 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/overview-of-optional-capabilities/modeling-stream-junctions)은 에너지법과 각도를 고려하는 운동량법을 구분한다. [아임계 합류의 에너지법](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/overview-of-optional-capabilities/modeling-stream-junctions/energy-based-junction-method)은 하류에서 각 상류로 별도 에너지 계산을 수행한다.

이번 후보는 이를 참고하되, **합류부의 길이·마찰·혼합·국지손실을 따로 추정하지 않고, 사용자가 입력한 총 손실수두hᵢ로 닫는 별도 단순화**다. 합류 손실은 지류 구간의 마찰손실과 별개이며 실제 합류 손실의 예측값이 아니다.

```
Qout = Σ Qi
Ei = Eout + hi
Σ Qi Ei − Qout Eout − Σ Qi hi = 잔차
```

하류 구간의 상류끝 에너지에서 각 지류 하류끝 수심을 구한다. 지류별 수면이 같다는 조건을 강제하지 않는다. 에너지 수두를 유량으로 가중한 수지는m⁴/s이며,밀도×중력으로 나누어 표시한 동력 수지다. 운동량 수지나 합류 실제정확도 검증이 아니다. 모든각도0°는각도영향을제외하는 명시적 가정이고,0°라고 실제혼합·압력·운동량이 해결되는 것은 아니다. 비0°는보류한다. 손실값을 고르면 에너지수지가 성립한다는 사실만으로 물리채택하지 않는다.

## 수치 범위와 중단

하류에서 상류로 표준단계 에너지식을 이분법으로 푼다. 기본 최대간격50m,옵션1~200m,전체시도100000단계까지다. 입력단면 위치를 정확히 지나며 마지막 간격은균등 분할한다. 수심 구간허용오차1e−10m,방정식잔차1e−7m초과시중단한다.

손실계수Cmax가 있을 때 `Fr < min(0.98, sqrt(0.99/(1+Cmax)))`인 보수적 범위만 탐색한다. 이 범위에서 수심에 대한 표준단계 잔차 미분은 `1−(1+Cmax)Fr²`이상이고 마찰항 미분이양의기여를하므로,지원구간의근은단조·유일하다. 실제 한계류조건을새로정한것이아니다. 도수·복수해·사류로전환하지않는다.

- 단면 사이절대하상경사>0.01,반폭변화율>0.05,계산단계절대수심변화율>0.05이면중단한다. 모두구현의보수적제한이다.
- 둑이상수심,허용아임계범위안에근없음,유효하지않은에너지에서중단한다.
- 경계보류는profile빈배열. 중간중단은유효한접두구간만남고 `upstreamDepthM`, `totalLossM`은null이다.
- 하류구간이완료되지않으면그상류전체를blocked로남긴다. 합류한쪽이라도보류되면해당합류상류전체를원자적으로보류한다.
- 보류합류에남은개별수심은미적용경계시험값이다. 상류구간profile은빈배열이고합류/전체에너지잔차는null이다.
- `intervalXM`은실패한수치검사구간이며실제한계의위치보증이아니다. 검사점사이의모든현상을입증하지않는다. 세분화검산과실제단면근거가필요하다.
- 전체에너지수지는모든구간/합류가완료된경우에만계산한다. 부분결과로전체수지통과를표시하지않는다.

## 원본 합류 장부의 별도 대조

후속27의62경로셀×12위상 장부를읽는다. 첫지점총유량을1회넣고이후61지점의자체발생+옆합류만더하면각지점과하구유량을복원한다. 검산은원본sideInputs개별지류와도대조한다. 계절별지점총유량의연속합산,D298591방류추가,12위상의동시100년강제력전환을하지않는다.

`sourceLedger.hydraulicInputReady:false`. 위상이동시정상류를뜻한다는근거와각합류의단면·손실·각도·국지경계가없다. 따라서원본유량을새수리예제로승격하지않았다. 새10예제의길이·폭·고도·유량은원본을사용하지않은별도가정이다.

## 재현·AI

```sh
node integration/natural-world/d298591-confluence/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-confluence/test.cjs
node integration/natural-world/d298591-confluence/query.cjs two-branches
node integration/natural-world/d298591-confluence/query.cjs --input /path/to/assumptions.json
node integration/natural-world/d298591-confluence/browser-check.cjs
node integration/natural-world/d298591-confluence/package-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

새 후보에는 입력 복원이 필요 없다. 기존 회귀용 원본은 `node handoff/restore-inputs.cjs`로 복원한다.

`output/catalog.json`에 10개 입력·기대 결과·별도 원본 장부·SHA 근거가 있다. CLI는 전체 입력·유효 단면·합류 장부·미계산 구간을 출력한다. 인수 없음/JSON 구문 오류는 exit1, 입력 계약 실패는 구조화 오류+exit2다. 완료/보류/중단은 exit0이므로 status를 반드시 확인한다.

브라우저는 같은 core를 사용한다. Node/Chromium의 부동소수점 최하위 차이는 절대1e−8+상대1e−11 범위로 대조한다. 키·문자·null·플래그는 완전히 일치해야 하며, 다운로드 JSON도 화면 내부 결과와 완전 일치를 검사한다. 저장 결과에 실제값을 보충하지 않는다. 공유 URL은 전체 입력·선택 구간·위치를 포함한다.
