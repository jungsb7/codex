# 사건별 강수와 침수 — 후속49

후속48의 세분 지형 수문에 **기간 총강수량이 같은 시간 분배 실험**을 추가했다. 강수의80%는48시간짜리 삼각형 강수3회,20%는 균등 강수로 분배한다. 실제 관측 폭풍이나 확률 재현기간이 아니라, 강수 집중이 침투·저류·물 이동과 침수에 미치는 영향을 비교하는 명시적 가정이다.

[지도](index.html#cell=310879&period=1) · [반응이 큰 예시](index.html#cell=556295&period=7) · [결과·검증](REPORT.md)

## 고정한 것과 바꾼 것

후속48과 같은 기준100년 끝 초기 물,16×16 지형,3,232웅덩이·9,858연결,침투/증발/교환 식을 쓴다. 바꾸는 것은168,576대상 육지 원본 격자의 기간 내 강수 시각이다. 기간별 기온·증발산 요구,배경 지정 유출,원본 호수 강수/증발 시각은 유지한다. 기존 정설과 후속40·46·47·48 수치도 보존한다.

원본 격자48×48(11.25°×11.25°)를 한 강수 지역으로 묶어512지역을 정의한다. 지역 안에서는 같은 강수 배율을 적용하되 각 원본 격자의 기존 기간 총강수량은 그대로다. 기간을 세 구간으로 나누고 각 구간 안에 결정론적 정점 시각을 배치한다. 각각48시간 삼각형 곡선이며 기간 강수량의0.8/3을 차지한다. 기간 경계를 넘거나 서로 겹치지 않는다. 이 지역화는 가정이며 이동하는 실제 강수 전선이나 지형성 강우를 계산한 것이 아니다.

삼각형 누적분포의 구간 차이를 적분하여 각 시간 단계의 **평균 강수 배율**을 구한다. 따라서120회와240회 계산은 같은 연속 강수 곡선을 사용한다. 240회의 인접 두 배율 평균이120회의 한 배율과 일치하며 각 기간 배율 합은 단계 수다. 강수의 눈/비 분리는 기존 기간 기온에 따른 수식을 유지한다.

## 비교와 조회

본계산은16×16지형,기간당240회(약3.04시간)다. 같은 폭풍 가정으로16×16/120회와8×8/240회도 계산한다. 균등 강수 기준은 후속48의16×16/240회 결과다. 지형·시간 민감도와 강수 시각의 영향을 서로 구분한다. 동일한 것은 한 해의 시작 상태이며,각 기간 시작 상태는 이전 기간의 결과를 이어받는다. 균등 강수와의 차이에는 앞선 사건들의 누적 효과도 포함되며 선택한 한 폭풍만의 효과가 아니다.

```sh
node integration/natural-world/storm-event-model/query.cjs cell 556295 7
node integration/natural-world/storm-event-model/query.cjs forcing 556295 7
node integration/natural-world/storm-event-model/query.cjs hydrograph 556295 7 136
node integration/natural-world/storm-event-model/query.cjs geojson 556295 7
node integration/natural-world/storm-event-model/query.cjs series 556295
node integration/natural-world/storm-event-model/query.cjs budget world 7
node integration/natural-world/storm-event-model/query.cjs reach 0 7
node integration/natural-world/storm-event-model/query.cjs exchange 0 7
```

기간은1–12,작은 격자는0–255다. 수심 이력은240개 오른쪽 끝점 표본이며 시작 수심도 따로 제공한다. 지도 그래프의 금색은 단계 평균 강수 배율,파랑은 선택 작은 격자의 수심,점선은 균등 강수 기준의 기간 최대 수심이다. 시작/정점/끝 시각은365/12일 길이의 해당 기간 안에서 센다.

침수 지속은1cm 이상 표본 비율×365/12일,최소/최대는 시작 상태도 포함한다. 원본 호수는 육상 침수 면적에서 제외한다. 강수 분배 대상 밖인 배경/호수에서는 `appliedToTargetLand=false`,강수 그래프 배율은null이며 상류의 사건 반응으로 수위가 달라질 수 있다. 해양에는 육상 수심을 만들지 않는다.

침수 물의 재침투는 수면→토양 내부 이동이다. 집수권 장부의 외부 항에 중복 가산하지 않는다. 원본23,022물길은 집수권 장부와 연결하며 개별 물길 유량은null이다. 전체 물수지 보존은 물량 보존 검사이지 과학적 타당성 전체 검증이 아니다.

## 재현

[후속48 재현](../subgrid-hydrology/README.md)으로 지형 캐시와 기준 계산을 먼저 만든다. 원본에 영향을 주는 옛 빌드/패키징 스크립트를 실행하지 않는다. Node24,C++17,Node헤더와 약8GB 메모리가 필요하다. 전체 계산은 순차 실행한다.

```sh
node integration/natural-world/storm-event-model/compile.cjs /path/to/node/include/node
node --test --test-isolation=none integration/natural-world/storm-event-model/test-forcing.cjs
node integration/natural-world/storm-event-model/control.cjs
node integration/natural-world/storm-event-model/run.cjs
node integration/natural-world/storm-event-model/build.cjs
node --test --test-isolation=none integration/natural-world/storm-event-model/test.cjs
node integration/natural-world/storm-event-model/browser-check.cjs
```

`STORM_EVENT_NATIVE`기본값은`/tmp/storm-event-model.node`, `STORM_EVENT_CACHE`는`/tmp/storm-event-model-49`다. 세부 지형 캐시는 후속48의`SUBGRID_HYDRO_CACHE`를 재사용한다. 입력·코드·원본 해시가 바뀌면 새 계산을 수행한다. `control.cjs`는 사건 입력을 주지 않은16×16/120회 계산의 모든 출력이 후속48과 정확히 일치하는지 확인한다. 새 상태 파일에는101년차 끝 토양/눈/지하수/이동/표면 저장을 남긴다.

## 한계와 다음 일

이번 결과는 `regional-storm-scenario`다. 지역별 지정 강수와 원본 격자 평균 토양·눈·지하수,웅덩이 단일 수위를 사용한다. 강수 전선 이동·실제 공간 구조,웅덩이 내부 장애물/2차원 흐름,빙하 이동·결빙 토양 억제,물길별 유량·침식/퇴적·식생,지하 압력/손실수두의 전체 결합은 구현하지 않았다. 기존 공간8/16 민감도와 후속47의 큰 배수 연결용 채움 한계도 유지한다. 다음 기존 계획은 공간 민감도와 내부 연결의 검토다.
