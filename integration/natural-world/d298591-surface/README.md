# D298591 동적 수면 전환 — 후속24

[검토 화면](index.html) · [결과 보고서](REPORT.md) · [구조화 요약](output/summary.json)

후속23의 다음 목표를 진행하라는 사용자 요청에 따라 D298591 한 유역의 원본 육지 장부를 계측하고 동적 수면 전환을 구현했다. 집수권619격자, 함몰부121기둥, 국지 웅덩이5곳을 다룬다. 기존 약26km 원본 지형의 조건부 실험이며 실제 하도·숲·습지·침수·강폭·적설·결빙은 확정하지 않는다. **실제 해결0구간, 미정23,022구간 유지.**

## 원본 계측과 입력 보존

고정 아카이브 `4afae5da3a7730b79ced1d2b9b7a8bc3041689c0`의3,044파일을 별도 복원하고 전체 부품·압축 파일·개별 파일 해시를 검증했다. [복원 기록](validation/archive-restore.json)과 [전체 보관 안내](../../../handoff/FULL_ARCHIVE.md)를 따른다. main에 전체 아카이브를 병합하지 않는다.

`collect.cjs`는 원본HTML을 메모리에서만 계측한다. 원본 `createHydrology`의 여섯 번째 연주기에서 강수·증발산·유출·눈·혼합 얕은 저장·기온을619×12행 추출한다. 원본 산술은 변경하지 않으며 다른 북부 수원 계산 분기에 해당하면 실패한다. 전체268,857격자×12기간 유출 Float32가 원본과 비트 동일하고, 전역 물수지·세계/지형 해시도 동일해야 입력을 저장한다. 출처와 검증은 `inputs/collection.json`에 있다.

원본 `ground`는 토양과 얕은 지하수를 합친 저장이다. 별도 토양/대수층으로 나누거나 빠진 항을0으로 꾸미지 않는다. 원본 유량의 Float32 반올림과 수송용 인접 기간 평균을 새 원시 기간 장부와 구분한다.12기간은 공전 위상이며 지구 달력 월이 아니다.

## 계산 방법과 가정

각 시점의 국지 수위와 원본 고도를 비교해 잠긴 칸을 결정한다. 마른 칸은 눈·얕은 저장을 이어 육지 수지를 계산하고, 잠긴 칸은 육지 발생량·증발산을 끈 뒤 강수·융설을 수면으로 한 번만 보낸다. 눈의 수량 환산 저장은 계속 이어지며, 얕은 저장은 잠긴 동안 그대로 보존하고 드러나면 육지 계산을 재개한다. 이는 얕은 저장과 호수의 교환을0으로 둔 명시적 가정이다.

`전체 강수 = 육지 증발산 + 수면 증발 + 외부 지하수 순손실 + 문턱 체적 초과 미배분 + Δ눈 + Δ얕은 저장 + Δ수면 재고`

육지 유출과 수면 직접 유입은 내부 이동이므로 강수에 다시 더하지 않는다. 눈·얕은 저장의 마지막 값에서 시작값을 빼는 독립 재고 방식으로100년 누적 수지를 검산한다.

- 원본 D8/평탄면 흐름과 물리 진입점을 재추적하고 최소 연결 문턱으로5웅덩이의 합류·분리를 계산한다. 모든619칸을 한 번씩 배정한다. 원본 수계 그래프는 바꾸지 않는다.
- 육지 계산은1단계/기간에서 원본을 재현한다. 세분화 시 강수·융설·증발산 잠재량을 나누고 기저 방출 비율을 `1−0.75^(1/n)`으로 둔다. 이때의 수치는 원본 월단계 산술과 동일하다는 뜻이 아니다.
- 각 하위 단계는 수면 손실 절반 → 젖음 상태 고정 → 모든 격자의 상태 진화 → 웅덩이별 공급·문턱 초과 분리 → 손실 절반 순이다. 손실은 기하 수위를 낮추며 연결 문턱을 지나면 물을 분리한다. 가용 물을 넘는 손실은 적용하지 않는다.
- 증발0.5/1/2m·년 × 외부 지하수 순손실0/0.25m·년 × 초기 수면 재고0/50%로12조건,100년을 계산한다. 손실은 그 시점의 실제 **모델상** 젖은 수면에 적용하며 관측·보정된 값이 아니다.
- 외부 지하수 순손실은 계산 영역 밖 저장으로의 가정 유출이다. 보존 중인 얕은 저장으로 보내는 항이 아니며 실제 침투율·대수층 수위와 무관하다. 증발을 먼저 차감하는 순서도 가정이다.
- 초기 눈·얕은 저장은 원본 여섯 번째 주기의 시작값이다. 초기50% 수면 재고는 가장 낮은 웅덩이에서 채운 이력을 가정한다. 총체적만으로 모든 웅덩이의 초기 수위를 유일하게 정할 수 없다.
- 원본 온도 지수 융설은 수량 장부용이며 호수 결빙·눈 깊이·열수지를 계산하지 않는다. 원본에서 연간 약6.008km³의 눈이 계속 축적된다.100년 반복은 정상 적설·빙하 또는 미래 기후 예측이 아니다.

## 출구 조건의 의미

문턱을 넘는 체적은 미배분 항이다. 실제 하류 유량, 해양 유입, 기존 그래프의 자동 방류로 채택하지 않는다. `Q = C L H^1.5`의 자유 월류식에서 에너지 수두0.1/0.5/1m와 SI 계수1.38–1.71을 가정해 **최대 기간 평균 초과율**을 통과시키는 필요 유효 폭을 역산했다. 이는 실제 하폭도 홍수 첨두도 아니다. 문턱 위 수두0에서는 유량0이므로 즉시 체적 절단 알고리즘을 실제 방류식이라고 볼 수 없다.

식과 계수 범위는 [USACE HEC-RAS의 broad-crested weir 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations)을 참고했다. [HEC-HMS spillway 설명](https://www.hec.usace.army.mil/confluence/hmsdocs/hmstrm/reservoir-modeling/reservoir-modeling-concepts-and-equations/spillways)처럼 실제 방류에는 출구 형상과 하류 잠김 영향이 필요하다. 이 가상 행성의 실제 계수를 외부 문헌에서 가져온 것은 아니다.

## 재현과 AI 사용

일반 재생성에는 전체 구 시뮬레이터가 필요 없다. 작은 계측 입력을 main에 포함했다. Node.js, 브라우저 검사에는 Playwright·Chromium을 사용한다.

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/d298591-surface/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-surface/test.cjs
node integration/natural-world/d298591-surface/query.cjs E1-G0.25-I0 8
node integration/natural-world/d298591-surface/browser-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

원본을 다시 계측하려면 별도 아카이브를 복원하고 `node integration/natural-world/d298591-surface/collect.cjs /복원경로/planet-full-handoff-v0.107`를 실행한다. 결과에는 실행 시각이 들어가므로 collection 파일 해시는 달라질 수 있으며 이후 build로 출처를 갱신한다.

`output/review.json.gz`의 스키마는 `d298591-surface-review/1`이다. `summary`는 출처·가정·원본 장부·세분화 결과, `model`은5웅덩이 기하·619진입점, `scenarios`는12조건×100연말 상태와 첫 해·첫 초과 연도·마지막 해의12기간 상세를 담는다. 원본 f64 계측값은 `inputs/fluxes.json.gz`에 있다.

CLI의 `E1-G0.25-I0 8`은 증발1m·년/외부 순손실0.25m·년/초기0%/8년차다. JSON은 전체 조건과 선택 연도, 출처·가정·미정값을 함께 보존한다. `boundaryExcessM3`, `poolM3`, `wetCells`, `areaM2`는 가정 실험의 결과다. `actual*`와 선택 JSON의 `actual`은null이며 `automaticAdoption:false`다. 모델 수면·체적 초과를 실제 습지·침수·저류·방류로 바꾸어 읽지 않는다.

새 화면은 검증된 gzip만 읽고 전 대륙 기후·구 지도는 로드하지 않는다.12조건·연도 조절, 수면 격자·재고 그래프, 공유·뒤로 가기·JSON 저장·실패 재시도를 제공한다. 기존 하류 검토 화면에서 연결된다.

검증은 새13검사, 기존47검사, 새 브라우저11검사, 기존지도12검사다. 기존47검사 중 과거 경관 초안10검사에는 별도 아카이브의 `landscape-draft/inputs/prior-manifest.json`이 필요하다. 그 파일을 일시 복원해 실행했고 main에 추가하지 않는다. 일반 main 입력만으로 가능한 기존 회귀는 `atlas-experience`, `landscape-notes`, `landscape-compare`, `seasonal-loading`, `downstream-budget`의37검사다.

기준 main: `7f803eb5f3fd17d4ce3edbf887f9deb2646fd675`. 기존 입력·경제·세계관·종료된9곳 검토는 그대로다. [검증 파일](validation/model-tests.txt) · [브라우저 기록](validation/browser-checks.json) · [배포 기록](validation/deployment.json).
