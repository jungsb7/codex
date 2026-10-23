# 내륙 경계 전달·수신 — 후속32

[화면](index.html) · [결과](REPORT.md) · [AI 입력](output/catalog.json) · [가정별 요약](output/summary.json)

후속31의 해양209경계에 **내륙740경계**를 더해949경계·20,255구간을 조건부로 계산한다. 상류 초과 물량을 하류 경계에 한 번만 넣고, 보류 경계에서 멈춘 물량도 미배분 장부에 보존한다. 실제 물리 해결0·미정23,022는 유지한다.

## 범위와 의미

| 경로 상태 | 원본 물길 수 |
|---|---:|
| 계산 가능한 경계를 거쳐 해양으로 연결 | 13,598 |
| 계산 가능하지만 하류 보류 경계에서 종료 | 6,657 |
| 자체 처리 보류 | 2,767 |
| 합계 | 23,022 |

첫 두 행20,255구간이949계산 경계에 속한다. 마지막 행은235보류 경계다. 해양 경로가 있다는 것은 실제 배수나 방류가 확정됐다는 뜻이 아니다. 저장 상한을 넘지 않으면 해양 경로가 있어도 전달량은0이다.

기존 분류의`next-boundary-unresolved`만 단독으로 있는740경계를 계산 대상으로 확장했다. 고온/극지 방법 공백·수위 결합·기존 종료/보류는 유지한다. D193196 및D126467/D147845/D144758에서는 새 물리 계산을 하지 않는다. 수신 기록만 남기며 종료된9곳의 내부 검토를 재개하지 않는다.

## 계산과 보류 장부

후속31과 같은 명시 입력3개를 사용한다. `years`1~100, `lossMPerYear`0~20, `initialFraction`0~1이다. 누락/null/문자열은 거부한다. 초기 UI는 비어 있고 예제 입력도 자동 실행하지 않는다.

949곳의 용량은 원본 문턱 기둥체적`Σmax(0,H-z)A`다. 각 영역의 문턱 연결, 서로 겹치지 않는16,685기둥을 검사했다. 실제 저수지 수위·수면·충전 순서가 아니라 집계 재고 상한이다. 원본 기후의 육지 유출을 그대로 사용한다.

매 기간 활성 경계를 상류부터 위상 정렬 순서로 계산한다.

```
available = startInventory + ownSourceInflow + upstreamReceived
netLoss = min(available, referenceArea * lossMPerYear / 12)
release = max(0, available - netLoss - capacity)
endInventory = min(capacity, available - netLoss)
```

출구 외부 격자부터 원본 receiver/entry를 추적해 **첫 다음 경계의 물리 진입 격자 또는 첫 해양**에서 해당 전달을 끝낸다. 함몰부 내부를 직선으로 가로지르지 않는다. 목적 경계가 계산 대상이면 수신량을 그 경계의 이번 기간 입력에 더한다. 다음 경계의 원본 발생량은 이미 독립 집수권 유입이므로 따로 한 번만 넣는다. 합류는 각 송신자가 보낸 물량을 정확히 한 번씩 합산한다.

보류 경계에서는:

```
newUnallocated = ownSourceInflow + upstreamReceived
actual storage/loss/release = null
```

`totalUnallocatedM3`는 실행 기간에 처리되지 않은 **물량의 회계상 누계**다. 실제로 그 위치에 전량 저장되거나 침수됐다는 뜻이 아니다. 보류 경계의 초기 재고는알 수 없으므로null이며, 미배분 누계0은 계산 시작 이후 기록이0이라는 뜻뿐이다. 보류 경계에서 수치 방류0을 만들어 다른 경계로 전달하지 않는다.

전체1,184경계의 원본 유입을 한 번씩 포함한다.

```
계산 대상 초기 재고 + 전체 원본 유입
= 추가 순손실 + 해양 도착 + 계산 대상 종료 재고 + 미배분 누계
```

740개 내부 연결의 송신/수신은 전역 물수지에서 상쇄된다. 경로 격자별 증분을 전체 유출로 다시 더하지 않는다. 출력`nodes`의8,867지점은 기존 하류 유량에 추가되는 물량 장부이며 기존 유량을 포함한 총유량이 아니다.

기간 물수지와 내부 송수신 잔차는`max(0.01m³,(시작재고+원본유입+내부전달)*1e-11)` 이하, 전체 기간 잔차는`max(0.1m³,(초기재고+누적원본유입)*1e-10)` 이하인지 검사한다. 초과하면 결과를 반환하지 않는다. 산술 검증이며 물리 정확도 인증은 아니다.

## 순환과 불확실성

원본 검토 자료에 현재 경계 순환은0이다. 런타임은 계산 경계 간 순환을 독립 검출해 거부한다. 순환 구성원이 명시적으로 보류된 경우에는 그 경계에서 전달을 멈추며 재순환시키지 않는다. 출구 대상 누락·경로 순환·서로 충돌하는 격자 연결·원본 물길 수 불일치도 거부한다. 기존 수위 결합2경계는 보류한다.

후속31과 동일하게 **집계 용량·추가 순손실·같은 기간 내 전달·하도 손실0·저장0·지연0·역수위 없음**을 가정한다. 실제 침투와 증발을 분리하지 않았고, 동적 수면으로 바뀌는 육지 발생량·열수지·눈/얼음·지하수·출구 통수능·국지 하류 수위는 미계산이다. 후속24~26 D298591 동적 수면/수리 모델과108보류·14중단을 대체하거나 해제하지 않는다.12공전 위상은 지구 달력 월이나 동시 홍수 수문곡선이 아니다.

## AI·재현

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/inland-routing/build.cjs
node --test --test-isolation=none integration/natural-world/inland-routing/test.cjs
node integration/natural-world/inland-routing/query.cjs D200327
# 가정.json: {"years":100,"lossMPerYear":0,"initialFraction":0}
node integration/natural-world/inland-routing/query.cjs --input 가정.json
node integration/natural-world/inland-routing/query.cjs D126467 --input 가정.json
node integration/natural-world/inland-routing/browser-check.cjs
```

main 입력만으로 재현하며 전체 아카이브 복원이 필요 없다. 생성기는 자기output만 변경한다. 런타임의 입력/조회 계약은 이전`downstream-routing/core.js`를 재사용하며 출처 코드 해시에 포함한다. 브라우저는약2.34MB catalog의 길이·해시·스키마를 검사한다. Playwright와Chromium 경로는`PLAYWRIGHT_MODULE`,`CHROMIUM_PATH`로 지정한다.

`catalog.json`의`groups`1,184개는 모두 원본12기간 유입을 가진다. 계산 대상만 용량·물리 전달경로를 가진다. `reaches`는원본구간ID/경계ID23,022쌍이다. 실행 결과:

- `boundaries`: 모든 경계의 자체 유입·상류 수신·손실·방류·미배분 누계와 마지막12기간. 보류 경계의 재고·손실·방류는null, 미배분량은수치다.
- `transfers`: 송신/수신 경계ID와 내부 전달 누계·마지막12기간.
- `nodes`: 원본 경로 격자의 증분 물량. `mouths`: 해양 종착점 도착량.
- `periods`: 전체 기간 전역 물수지·내부 송수신 잔차. `summary`: 조건부 계산/해양경로/보류 종착/자체 보류 수를 구분한다.

단위는m³이며 m³/s가 아니다. `assumptions`와`provenance`를 함께 보존한다. `actual.*=null`,`automaticAdoption:false`,`sourceGraphChanged:false`,`physicalResolvedReaches:0`,`physicallyUnresolvedReaches:23022`다. 이전 후속31과 달리 유효한 가정이 있으면 보류 경계도 **수신/미배분 장부 result**를 반환한다. 이를 수리 계산 완료로 해석하지 않는다. 가정 없이 조회하면result:null이다. 잘못된 ID/입력은CLI 종료코드1이다.

## 검증

새14+기존141자료 검사(155). 독립 재귀 해석해·740송수신 전수 대조·원본 경로 추적·층적분 용량·전체 원본 유입 보존·순환/보류·순서 불변성·손실 가용량 제한·이전209곳의3조건 동일 결과를 검사했다. 새15+기존12브라우저 검사(27),1440/390/320px 및 보류 수신 화면. 공유/이력·내륙 목적 경계 이동·원본 지도 연계·전체/보류 JSON·오류/재시도를 확인한다. [검증 기록](validation/).
