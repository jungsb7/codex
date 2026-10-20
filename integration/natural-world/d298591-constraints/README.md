# D298591 적설·에너지·출구 범위 — 후속25

[화면](index.html) · [결과](REPORT.md) · [요약 JSON](output/summary.json)

사용자의 다음 단계 진행 요청에 따라 같은 유역의 지속 적설 원인, 에너지 자료의 사용 범위, 문턱 위 수위에서의 원본 지형 연결을 구현·검증했다. 기존 세계와 기후를 고치지 않는다. **실제 저류·침투·방류 해결0구간,23,022구간 미정 유지.**

## 세 가지 계산

**적설:** 원본619격자×12기간의 기온·강수를 사용한다. 원본은 `T<0`일 때 강수를 눈으로 넣고, 양의 기온에 `45mm/(℃·기간)`을 곱한 양과 보유 눈 중 작은 양을 녹인다. 반복 기후의 장기 연간 누적은 `max(0, 연 강설−연 잠재 융설)`이다. 원본 여섯 번째 주기 장부와619곳 모두 일치하며, 독립200년 반복으로12민감도 조건을 확인했다.

31격자가 누적하며18곳은 양의 기온이 없고13곳은 양의 기온이 있어도 융설 능력이 부족하다. 이31곳은 모두 기존121수면 기둥 밖이다. 기온+0/1/2/5℃와 융설 계수0.5/1/2배의12조건은 진단이며 실제 기후·유량에 반영하지 않는다. 온도 상승 경계도 원본 수식의 수학적 경계이며 실제 온난화 예측이나 조정 권고가 아니다. 눈 단위는 물당량(SWE)이며 실제 눈 깊이·밀도·빙하가 아니다.

**에너지:** 후속24의12조건 각각에서100년 말의 가정 수면 마스크를 고정한다. 원본 궤도식(1361W/m²,기울기23.4°,이상적인365일 원궤도)을 공전 기간마다64중점 적분하고256중점과 비교한다. 원본 육지 기온은 기간 시작 위상의 표본이며 일사 기간 평균과 구분한다. 고정 수면 진단을 움직이는 수면의 열수지로 읽지 않는다.

`가정 증발 잠열 요구 W/m² = 증발 m/년 × 1000kg/m³ × 2.45MJ/kg ÷ 365일의 초`

0.5/1/2m·년의 일정 증발 요구를 대기권 상단(TOA) 단파와 비교한다. TOA는 지표 순복사가 아니며 대기·반사 손실,장파·현열·이류·저장열을 계산하지 않는다. TOA를 넘는 경우 지역 단파만으로 부족하다는 뜻이지 증발 불가능을 뜻하지 않는다. 넘지 않아도 실제 증발률의 타당성을 증명하지 않는다.

원본 바람은4도 격자의 진단 수평 성분을 원본 방식으로 보간했다. 측정 높이가 없어2m 바람으로 변환하지 않는다. 습도·수증기압·지표 순복사·수온·물 열저장·빙설 열역학은 이 유역의 채택 sample에서 제공되지 않는다. 다른 북부 수원 모듈의 값을 대입하지 않는다. [원본 코드 감사](inputs/source-audit.json)는 고정 아카이브 app.js의 해시와 관련 발췌를 담고 있다.

**출구:** 원본 전역 격자에서 낮은 지형의 D8 연결을 탐색한다. 기존 해양/호수 마스크는 경계로 처리하고 그 안으로 탐색하지 않는다. 출구 연결 `303194↔301657`을 양방향에서 하나만 제거하는 가정과 열린 상태를 비교한다. 이는 실제 댐·단면·유량 계산이 아니다.

우회 해양 연결의 최소 문턱은 이진 탐색과 독립 고도순 union-find로 검산한다. 바로 아래의 후보132격자(기존121+추가11)는 모두 기존619격자 장부에 포함된다. `outlet.candidateDomain`에 원본 기둥·격자와 배타적 수위 상한을 제공해 다음 동적 모델의 입력으로 사용할 수 있게 했다. 아직 채택된 저수지·실제 저류 용량은 아니다.

수위 상승0/0.05/0.1/0.5/1m와 문턱 기준 하류 수위−1/0/+0.05/+0.5/+1m의25조합은 연결 범위·잠김 보정 필요 여부를 반환한다. 원본 해양 기준0m를 출구 바로 아래 하류 수위로 대체하지 않는다. 수위와 에너지 수두는 다르며 접근 유속을 무시할 때만 같다는 가정이다. 실제 폭·방류량은null이고 `coupledRoutingReady:false`다.

## 재현·AI

전체 구 시뮬레이터를 다시 복원하지 않아도 현재 main에 포함된 입력으로 재현된다.

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/d298591-constraints/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-constraints/test.cjs
node integration/natural-world/d298591-constraints/query.cjs 274035 2 90 E2-G0.25-I0 .5 0
node integration/natural-world/d298591-constraints/browser-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

CLI 인자는 **격자ID / 기온 증가℃ / 융설 계수mm/(℃·기간) / 이전 실험ID / 수위 상승m / 문턱 기준 하류 수위m**다. UI는 동일한 조회 결과를 JSON으로 저장하고 공유 주소·뒤로 가기·재시도를 지원한다. 지도는619원본 격자와 출구 주변 일부만 그리며 전역 계절·지형 배열을 읽지 않는다. 연결 격자 수는 전역 탐색 결과다.

`output/review.json.gz`는 `d298591-constraints-review/1`이다. `cells`는619원본 표본, `sensitivity`는12적설 진단, `energy`는12고정 마스크×12기간, `outlet`은 출구 탐색·증인 경로·132후보 기둥·25보류 조건이다. `summary`는 출처·분류·한계다. `query.cjs`는 `d298591-constraints-selection/1`을 반환한다.

`sourceSnowChangeMm`와 `annualSnowIncreaseM3`는 원본/가정 모델의 눈 물당량 증가다. `gateHeld.cells`와 `open.cells`는 연결 탐색이며 실제 침수 범위가 아니다. 해양으로 열린 연결을 닫힌 저장 체적으로 합산하지 않는다. 실제값은 `actual*` 또는 선택 JSON의 `actual`에null로 보존한다. `automaticAdoption:false`, `appliedToClimate:false`, `appliedToHydrology:false`를 유지한다.

기준 main `5bcce093daca1bc9cf4687fbb9d3f7ffd0fe8078`. 종료된9곳의 검토를 재개하지 않았으며, 기존 공통 수학 함수를 재사용했다. 새 생성기는 이 단계 output만 쓴다. 검증·배포는 `validation/`에 기록한다.

## 방법 근거

잠열 환산에는 [FAO의 물1kg당2.45MJ 설명](https://www.fao.org/4/x0490e/x0490e04.htm)을 참고했다. [FAO의 기상 입력 설명](https://www.fao.org/4/X0490E/x0490e07.htm)은 복사·습도·측정 높이가 정해진 바람의 필요성을 보여준다. 이 작업은 작물 기준증발산식을 호수에 적용한 구현이 아니다.

[USACE의 눈 질량·에너지 회계](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/snow-accumulation-and-melt/snowpack-mass-and-energy-accounting)는 온도 지수와 개별 열전달 계산을 구분한다. 원본 온도식은 HEC-HMS 구현 또는 검증된 에너지 모델이라고 주장하지 않는다. 출구의 에너지 수두·하류 잠김 구분은 [USACE의 월류식 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations)을 참고했다.
