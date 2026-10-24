# 전체 연결망의 물수분 후보 계산 · 후속39

후속38에서 공개한 946경계·20,065구간·117,320격자의 입력을 재사용해 207개 연결망을 구성한다. 204개 연결망, 831경계·18,984구간에 동적 계산을 실행한다. **실행한 구간 수와 100년까지 완료한 구간 수는 다르다.** 결과는 [화면](index.html), [보고서](REPORT.md), [요약](output/summary.json)에 있다.

원본 세계·경제·기후·지형·수계·마스크·구지도와 기존 연구 결과를 바꾸지 않는다. 원본 보류 235경계·2,767구간 및 D298591 연결망 3경계·190구간을 재계산하지 않는다. `actual:null`, `automaticAdoption:false`를 유지한다. 전체 23,022구간의 실제 저류·침투·넘침을 확정한 결과가 아니다.

## 연결망과 중단

원본 하류 연결과 원본 격자에서 발견한 추가 출구를 함께 묶는다. 같은 물리 면은 한 번만 계산한다. 후속38의 검증된 양쪽 최종 수위 동시 풀이, 유한 토양/지하수 저장, 원본 지형의 면적·체적 곡선, 내부 웅덩이 구조를 재사용한다. 원본 기준 문턱보다 낮은 출구라도 양 끝의 내부 웅덩이 연결 높이 이상이면 계산할 수 있다. 반대로 내부 연결 높이 아래의 출구에는 전체 저장 수위를 적용하지 않는다.

- D688499, D730812: 일부 출구가 내부 웅덩이 연결 높이보다 낮아 별도 웅덩이 배수가 필요하다.
- D567047: 기준 문턱 이하에서 다른 지형 영역과 접촉한다.
- 위 세 경계가 포함된 3개 연결망, 115경계·1,081구간은 동적 계산을 보류한다. 연결된 상류를 임의로 잘라 계산하지 않는다.
- 원본 보류 유역으로 나가는 면은 바다나 무한 배수구로 취급하지 않는다. 해당 면의 가장 낮은 접촉 높이를 계산 상한으로 삼아 물을 보존한다. 그 높이를 넘는 순간 연결망 전체를 멈춘다. 보류 유역의 저류·역수위나 미래 수신량을 만들어내지 않는다.
- 출구 총 설계 폭은 원래 발견한 전체 면 수로 나눈다. 보류 면을 제거했다고 남은 면의 폭을 키우지 않는다.
- 다른 원본 지형 영역 접촉과 기준 문턱 위 5m 탐색 상한도 그대로 적용한다. 마지막 초과 소단계는 진단 장부이며 이후의 강수는 계산하지 않는다.

추가 연결 때문에 이전 57경계가 더 큰 연결망에 포함된다. 따라서 이전 57경계만의 100년 결과를 확대된 연결망의 완료 결과로 승계하지 않는다. 이전 코드·결과 파일은 보존한다.

## 북부의 네 저장

북부는 원본 눈·토양·지하수·이동 저장을 그대로 초기화한다. 원본 35% 혼합 저장이나 기존 후보의 200/1000mm 버킷으로 치환하지 않는다. `north-source.cjs`는 별도 공개 아카이브 `application/source/water-tower-core.js` 본문을 보존한 사본이다. 원본 기온 12위상, 격자 위도, 원본 기울기 23.4도로 PET를 다시 계산한다.

원본 토양 용량 150mm, 침투 분율 0.8, 눈/비 혼합, 융설·승화, 지하수·이동 저장의 지수 방출을 유지한다. 소단계 수 n에 대해 강수·PET·융설·승화 수요를 n으로 나누며, 배수·방출은 `1-exp(-rate/n)`으로 적용한다. 건조 격자에서 n=1이면 원본 한 해 방정식과 부동소수점 허용 오차 안에서 일치한다. 소단계로 나누었을 때는 별도 후보이며 원본 월별 출력과 같다고 주장하지 않는다.

침수 격자의 액체 입력은 표면 저류에 직접 보낸다. 기존 눈의 융설·승화와 지하수/이동 저장 방출은 유지하고, 침수 토양의 증발·신규 침투는 중복 계산하지 않는다. 수면 증발은 별도로 처리한다. 이동 저장에서 실제 방출된 양만 표면에 전달하여 지하수 복귀를 두 번 더하지 않는다. 승화는 육지 손실에 포함되며 별도 진단 열은 그 부분집합이다.

저침투 조건은 기존 후보의 침투 능력과 북부 침투 분율을 모두 1/4로 바꾼다. 느린 복귀 조건은 기존 후보와 북부 지하수의 복귀 시간을 모두 4배로 늘린다. 북부 토양 배수와 이동 저장 방출 시간은 유지한다. 원본 북부에 없는 1000mm 지하수 용량을 추가하지 않는다. 눈은 물 환산량이며 눈 두께·결빙·열수지를 계산하지 않는다.

## 재현과 AI 조회

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/network-water-model/prepare.cjs
node integration/natural-world/network-water-model/build.cjs
node --test --test-isolation=none integration/natural-world/network-water-model/test-kernel.cjs integration/natural-world/network-water-model/test.cjs
node integration/natural-world/network-water-model/query.cjs reference D186192
node integration/natural-world/network-water-model/browser-check.cjs
```

입력은 `../coupled-water-model/inputs/forcing-00.bin` 등 40조각을 해시 검증해 읽으며 복제하지 않는다. 전체 재수집이나 아카이브 복원은 필요하지 않다. 표준 Node.js 자바스크립트 경로가 기본이다. 선택적으로 공식 Node.js 헤더와 g++로 같은 격자 식을 가속할 수 있다. 생성된 바이너리는 저장소에 넣지 않는다.

```sh
node integration/natural-world/network-water-model/compile-native.cjs /path/to/node/include/node /tmp/network-water-kernel.node
WATER_NATIVE=/tmp/network-water-kernel.node node --test --test-isolation=none integration/natural-world/network-water-model/test-kernel.cjs
WATER_NATIVE=/tmp/network-water-kernel.node node integration/natural-world/network-water-model/build.cjs
```

가속 경로는 상태·손실·방출을 JS 참조와 대조한다. `-ffast-math`를 쓰지 않는다. 실행은 4개 작업 스레드로 연결망·조건별로 나누며 코드/입력 해시별 임시 캐시를 사용한다. 오래 걸리는 계산의 재시작에 사용할 수 있고 게시 자료에는 포함하지 않는다.

브라우저와 CLI는 같은 `view.js.query(data, scenarioId, boundaryId)`를 사용한다. `computed`는 동적 실행 여부, `completedHorizon`은 해당 후보의 100년 기간 완료 여부다. 중단 경계·허용 시간 하한/상한·초과량을 반환한다. 지형 대기는 지역 저장·시간을 null로 반환한다. 원본 보류/D298591은 새 조회 대상에 포함하지 않는다. 모든 사례·경계 2,838조합을 검사한다.

`output/review.json.gz`는 연도별 이력을 제외한 화면/AI 자료다. `history-reference.json.gz`, `history-low-infiltration.json.gz`, `history-slow-return.json.gz`, `history-reference-fine.json.gz`에 전체 연도별 장부와 출구 기록이 있다. `manifest.json`은 크기와 SHA-256을 제공한다. 시간 간격 검사는 연결망별 기준 조건에만 적용하며, 100년 완료망은 누적 해양 전달량 1%, 중단망은 같은 최초 중단 경계와 두 기본 소단계 이내 시점을 검사한다. 전체 합계로 지역 오차를 상쇄하지 않는다. 모든 저장·순간 유량이나 다른 조건의 수렴 검사는 아니다.

60/120단계 비교에 실패한 중단망 10개만 `node integration/natural-world/network-water-model/refine.cjs`로 240단계까지 추가 진단한다. [추가 검사](validation/refinement-extended.json)와 `output/history-reference-extended.json.gz`에 기록한다. 이 검사는 원래 60단계 표시값을 바꾸거나 중단망을 완료로 승격하지 않는다.
