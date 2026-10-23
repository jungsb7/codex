# 해양 출구 209곳의 조건부 하류 처리 — 후속31

[화면](index.html) · [결과](REPORT.md) · [AI 입력](output/catalog.json) · [예제 요약](output/summary.json)

23,022구간의 하류 처리를 우선하라는 사용자 요청에 따라, 추상 합류 검산을 중단하고 **원본 경계별 재고 → 출구 초과 물량 → 원본 하류 경로 → 해양 도착**을 실행 가능한 계산으로 연결했다. 209경계에 속한4,891구간을 대상으로 한다. 실제 저류·침투·증발·넘침을 해결한 수는 여전히0이다. 조건부 계산 가능 구간을 실제 해결 수에서 빼지 않는다.

## 대상과 보류

기존1,184경계·23,022구간 대응을 재사용한다. 기존 상호 배타 분류의 해양 후보4,921구간에는 이전 보류D144758의30구간이 포함돼 있었다. 이를 제외하고 **flags 없는 해양209경계·4,891구간**만 계산한다. 나머지975경계·18,131구간은 원본별 보류 이유와 함께 조회된다. 종료된D193196 및 D126467/D147845/D144758은 재개하지 않았다.

각 해양 경로는 기존 출구의 외부 격자부터 원본 receiver/entry를 따라 첫 해양까지 추적한다. 호수·다른 미정 함몰부를 통과하지 않으며, 기존 검토 경로와 전수 일치한다. 해양 종착점은151개다. 이는209곳 전부가 항상 방류한다는 뜻이 아니다.

## 구현한 물량 계산

입력3개를 모두 명시해야 한다. UI 초기값은 비어 있으며, 예제 입력 버튼도 계산을 자동 실행하지 않는다.

- `years`: 원본12공전 위상을 반복하는1~100년.
- `lossMPerYear`: 고정 문턱 기준 면적에 적용하는 **추가 순손실**0~20m/년. 기존 육지 모델의 증발산·유출은 그대로이며 실제 침투율이나 수면 증발률이 아니다.
- `initialFraction`: 기하 체적 상한에 대한 초기 재고0~1.

경계별 원본 함몰부와 출구 접근 격자를 합친 영역에서 `C=Σ max(0,H−z)A`를 구한다. H는 원본 검토의 연결 문턱이다. 모든 영역이 H에서 연결되는지 검사하고,209곳의 용량 영역이 겹치지 않는지 검사한다. 기준 면적은z<H인 격자 면적의 합이다.

매 기간의 경계 장부:

```
available = startInventory + sourceBoundaryInflow
netLoss = min(available, referenceArea * lossMPerYear / 12)
release = max(0, available - netLoss - capacity)
endInventory = min(capacity, available - netLoss)
```

이는 **집계 재고 상한 모델**이다. 문턱 아래의 개별 웅덩이 충전 순서·동적 수면·실제 저류량을 계산하지 않는다. 이전 후속23의 미배분 초과량과 달리 이번에는 초과량을 명시적인 모형 가정 아래 출구의 외부 격자에 주입하고 원본 경로의 모든 격자에 전달한다. **같은 기간 내 전달·하도 손실0·하도 저장0·지연0·역수위 없음**을 가정한다. 출구 유량식/통수능이 없는 즉시 초과 전달이며 실제 수리 방류로 채택하지 않는다.

합류하는 경로의 증분은 합산하되 전체 물수지는 해양 종착점에서 한 번만 합산한다. 중간 격자의 전달량을 합쳐 유출량을 부풀리지 않는다. 기존 하류 발생량은 이 증분 장부에 다시 넣지 않는다. `nodes`는 기존 하류 유량에 대응하는 **추가 물량**이며 기존 유량을 포함한 총유량이 아니다. 원본 receiver와 기존 지도 표시는 변경하지 않는다.

```
초기 재고 + 대상209경계의 원본 유입
= 추가 순손실 + 해양 도착 + 종료 재고
```

기간 잔차 한계는`max(0.01m³,(시작재고+유입)*1e-11)`, 누적 한계는`max(0.1m³,(초기재고+누적유입)*1e-10)`다. 한계를 넘으면 결과를 반환하지 않는다. 이는 부동소수점 장부 검증이며 물리적 정확도 보장이 아니다.

## 한계와 기존 모델과의 관계

원본 경계 유입은 이미 육지 조건에서 계산한 값이다. 새 수면으로 바뀌었을 때 강수·증발산·융설 재계산, 물에 잠기는 격자의 육지 발생량 제거, 열수지·눈/얼음·지하수·출구 통수능·하류 수위는 구현하지 않았다. 따라서 이 모델은 후속24~26의 D298591 동적 수면/출구 모델보다 단순하다. 그 단계의108보류·14우회 상한 중단을 해제하거나22조건의 검증된 수리 방류로 대체하지 않는다. D298591도 여기서는 다른209곳과 동일한 집계 모형의 예제로만 포함한다.

실제 침투와 증발은 분리하지 않는다. 이를 분리하려면 저장층·토양/암반 특성·수위 의존 침투식과 기후/수면 열수지 입력이 필요하다. 원본12위상은 지구 달력 월이나 동시 홍수 수문곡선이 아니다. 100년 반복은 가정 실험이며 미래 예측이 아니다.

## AI·CLI·재현

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/downstream-routing/build.cjs
node --test --test-isolation=none integration/natural-world/downstream-routing/test.cjs
node integration/natural-world/downstream-routing/query.cjs D298591
node integration/natural-world/downstream-routing/query.cjs D144758
# 가정.json: {"years":100,"lossMPerYear":0,"initialFraction":0}
node integration/natural-world/downstream-routing/query.cjs --input 가정.json
node integration/natural-world/downstream-routing/query.cjs D298591 --input 가정.json
node integration/natural-world/downstream-routing/browser-check.cjs
```

전체 아카이브 복원 없이 main 입력만으로 재현한다. 생성기는 자기 폴더의output만 변경한다. 브라우저는약1.07MB catalog를 길이/SHA-256/스키마 검사 후 읽는다. Playwright경로는`PLAYWRIGHT_MODULE`, Chromium은`CHROMIUM_PATH`로 지정 가능하다.

`catalog.json`의`groups`는 전체1,184경계이고`reaches`는`[원본구간ID, 경계ID]`23,022쌍이다. eligible경계에만 용량·원본12위상유입·출구하류경로가 있다. held경계를 자동으로 수치0으로 치환하지 않는다.

실행 결과의`boundaries`에는209곳의 누적 재고/손실/방류 장부와 마지막12기간, `nodes`에는 경로별 누적 증분과 마지막12기간 증분, `mouths`에는 종착점의 누적 도착량과 마지막12기간, `periods`에는 전체 기간의 전역 장부가 있다. 단위는m³이며 m³/s가 아니다. `assumptions`와`provenance`를 함께 보존한다. `actual.*=null`, `automaticAdoption:false`, `sourceGraphChanged:false`, `physicalResolvedReaches:0`, `physicallyUnresolvedReaches:23022`다. 보류 조회는`result:null`이다. 잘못된 ID/입력은CLI 종료코드1이다.

## 검증

새13+기존128자료 검사, 새13+기존12지도 브라우저 검사. 경계 전수 매핑·원본 경로 독립 추적·용량의 독립 층적분·209곳 무손실 해석해·공유 경로 합류·추가 손실의 기존 스칼라 장부 대조·순서 불변성·보류/null·오류/재시도·공유/이력·실제 JSON 저장·1440/390/320px를 확인한다. [기록](validation/).
