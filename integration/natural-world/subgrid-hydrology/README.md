# 세분 지형 수문 연동 — 후속48

후속47의16×16 가정 지형을101년차 시간 계산에 연결한다. 웅덩이 저장량을 고정하여 수면만 재배치하던 계산에서, 새 저장 곡선·출구 높이·침수 비율에 따라 토양 침투, 증발과 웅덩이 간 교환을 다시 계산하는 별도 시나리오로 확장했다. 원본과 `natural-canon-v1`, 후속40의100년 장부 및 후속46·47 결과는 보존한다.

[지도](index.html#cell=310879&period=1) · [결과와 검증](REPORT.md) · [자료 목록](output/manifest.json)

## 계산 범위

- 268,857원본 격자×256 =68,827,392등면적 지형 표본. 원본 평균 고도·해양/호수 마스크와 후속47 피복 경계 가정을 유지한다.
- 기존3,232웅덩이와9,858연결의 소유권·연결·폭·계수는 유지한다. 세분 지형의 정확한 저장 곡선을 사용하며 곡선을 분위수로 축약하지 않는다.
- 같은 후속40 기준100년 끝 수량·토양/눈/지하수/이동 저장을 시작점으로, 원본12기간 기후를 한 해 반복한다. 연평형이나 새로운100년 안정 상태를 주장하지 않는다.
- 원본1×1,8×8,16×16 지형 각각에 침수 재침투를 적용하며,16×16은 기간당120/240회 적분을 비교한다. 본계산은240회, 약3.04시간 간격이다.

## 계산 규칙

각 시간 단계 시작 수위보다 낮은 세부 지형 표본 비율로168,576대상 원본 격자의 잠긴/마른 면적을 구한다. 같은 평균 저장 상태에서 기존 젖은 땅과 마른 땅 계산식을 각각 실행하여 면적 가중한다. 눈·토양·지하수·이동 저장은 **원본 격자 평균**이며 세부 격자마다 독립 토양을 풀지 않는다. 원본 배경 유출은 지정 입력으로 남는다.

이어서 잠긴 면적의 물을 기존 침투율1,200mm/년과 남은 토양 용량으로 제한하여 토양에 넣는다. 요구량을 웅덩이별로 합산하고, 가용 물이 부족하면 모든 요구를 같은 비율로 줄인다. 동일 물량을 수면에서 빼고 토양에 넣는다. `floodInfiltrationM3`는 `infiltrationM3`에 포함된 내부 이동량이며 외부 손실에 더하지 않는다. 지하수 재충전·복귀는 기존 식을 유지한다. 배경 유입과 호수 강수를 더한 뒤 새 저장 곡선으로 수면 증발과 암시적 부호 있는 교환을 계산한다.

출구는 원본 연결의 공유 경계에서 양쪽 지형 높이 중 높은 값의 최솟값으로 정한다. 이 연속 경계 최솟값이 작은 격자 중심의 최소 바닥보다 낮으면, 연결된 양쪽 웅덩이의 이산 최소 바닥 이상으로 올린다. 식은 `max(공유 경계 최솟값, A의 최소 바닥, B의 최소 바닥)`이며 바다가 B이면 B항을 제외한다. 이것은 표본 바닥과 출구의 일관성을 위한 수치 규칙으로 실제 지형 측정이 아니다. 원래 설정된 호수 출구는 보존한다. 보정 전 높이와 보정량은 모든 연결 진단에 남긴다. 엔진은 바닥보다 낮은 출구를 거부하여 빈 웅덩이의 가짜 방류를 막는다.

물수지 외부 항은 강수·배경 유출·다른 집수권 유입·해양 유입·호수 강수와, 육상/수면 증발·다른 집수권 방류·해양 방류다. 내부 침투·재충전·복귀·유출 진단은 중복 가산하지 않는다. 계절마다1,184집수권+배경+호수의 장부를 검사한다.

## 지도·AI 자료

```sh
node integration/natural-world/subgrid-hydrology/query.cjs cell 310879 1
node integration/natural-world/subgrid-hydrology/query.cjs geojson 310879 1
node integration/natural-world/subgrid-hydrology/query.cjs series 310879
node integration/natural-world/subgrid-hydrology/query.cjs budget world 1
node integration/natural-world/subgrid-hydrology/query.cjs budget D298591 1
node integration/natural-world/subgrid-hydrology/query.cjs reach 0 1
node integration/natural-world/subgrid-hydrology/query.cjs exchange 0 1
node integration/natural-world/subgrid-hydrology/query.cjs trace 1535 1
```

기간은1–12다. 작은 격자의 침수 지속은1cm 이상인240개 오른쪽 끝점 수위 표본 비율×365/12일이다. 평균 수심은 같은 수위 표본으로 계산한다. 최소/최대에는 기간 시작도 포함한다. 수위 표본은F64로 보존하며 시간 이력의 건조 상태는 최소 바닥 고도를 내부 수리값으로 쓴다. 지점에서 완전히 마른 웅덩이의 실제 수위는`null`이다. 원본 호수는 육상 침수 면적에서 제외하며 해양에는 육상 계산을 적용하지 않는다.

시간120/240회와 공간8/16비교는 같은 초기 물과 기후를 쓴 수치 민감도다. 양쪽에 물이 있을 때만 수위를 비교하며1m 초과를 지도에 표시한다. 신뢰 구간이나 전체 상태의 수렴 증명이 아니다. 개별23,022물길은 해당 집수권 장부로 연결한다. 개별 물길 유량은 계속`null`이며 웅덩이 교환량을 소하천 유량으로 대체하지 않는다.

브라우저는 시작에 공통 자료와 선택 기간만 읽고SHA-256을 검사한다.12기간 JSON은 요청할 때 순차로 읽는다. 오류 또는 선택 변경 중에는 오래된 값의 내보내기를 막는다. GIS·JSON은 동일한`core.js`를 사용한다. 새 지형 파일은 저장소에 중복 저장하지 않고 결정론적으로 복원한다. 기간별 수위·장부와101년 끝 재시작 상태는 압축하여 저장한다.

## 재현

Node24, C++17 컴파일러, Node헤더가 필요하다. 전체 세부 곡선은 임시 디스크 수GB와 메모리 약8GB를 사용한다. 각 계산은 순차 실행한다.

```sh
node integration/natural-world/subgrid-hydrology/compile.cjs /path/to/node/include/node
node integration/natural-world/subgrid-hydrology/run.cjs
node integration/natural-world/subgrid-hydrology/build.cjs
node --test --test-isolation=none integration/natural-world/subgrid-hydrology/test-engine.cjs integration/natural-world/subgrid-hydrology/test.cjs
node integration/natural-world/subgrid-hydrology/control.cjs
node integration/natural-world/subgrid-hydrology/browser-check.cjs
```

`SUBGRID_HYDRO_CACHE`기본값은`/tmp/subgrid-hydrology-48`, `SUBGRID_HYDRO_NATIVE`는`/tmp/subgrid-hydrology.node`다. 컴파일·입력 코드·원본 자료 해시가 바뀌면 캐시를 다시 계산한다. 과거 빌드/패키징 스크립트를 실행하지 않는다. 대조 검사는기존`/tmp/pond-network.node`가 필요하다.

## 아직 남는 물리

약26km 원본에서 가정으로 세분한 약1.6km 표본이지 관측 해상도가 아니다. 웅덩이마다 단일 수위를 사용하며 내부 장애물을 가르는 연속 유동·운동량을 풀지 않는다. 개별 폭풍, 하천별 유량·침식/퇴적, 식생 변화, 빙하 이동, 지하 통로 압력·손실수두와 모든 계의 결합은 이번 범위 밖이다. 후속47의 최대1,648m 배수 연결용 채움은 이번 실제 저장/교환 지형에 적용하지 않는다. 큰 공간 민감도는 지형 가정의 불확실성으로 공개하며 이름 변경이나 장부 통과를 과학적 검증 완료로 취급하지 않는다.
