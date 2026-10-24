# 숲·습지·침수 경계 후보 — 후속42

[화면](index.html) · [결과](REPORT.md) · [자료 목록](output/manifest.json) · [기존 물수지](../pond-network-model/README.md)

후속40의 완결된 100년 수문 결과와 원본 생태 지도를 같은 원본 격자에 겹쳐, 숲·습지·최종 침수의 후보 면적과 경계를 계산한다. 전체 268,857격자, 1,184개 대상 집수권과 배경 육지·원본 호수, 세 수문 조건을 다룬다. 23,022구간 물수지 계산을 다시 미정으로 돌리지 않는다.

## 무엇을 계산하는가

원본은 1536×768 경위도 격자, 0.234375°이다. 원본 구면 반지름 6,371,000m로 각 격자의 정확한 구면 면적을 합한다. 남북 간격은 약26km이고 동서 간격은 위도에 따라 줄어든다. 원본 한 격자는 한 고도이므로 셀 안의 부분 침수나 미세 숲 경계를 새로 추정하지 않는다. 화면용 잡음이나 후속41의 계곡 절개를 이 계산에 적용하지 않았다.

상호 배타적인 최종 분류의 우선순위:

1. 원본 호수 209격자는 기존 호수 마스크로 유지한다.
2. 원본 육지에서 100년 말 수위가 원본 고도보다 높으면 최종 침수다.
3. 최종 건조 육지의 원본 생태 보류 비트(flags&7)는 보류로 남긴다. 침수된 격자에서도 원본 플래그는 별도 필드로 보존된다.
4. 보류가 없고 원본 wetness=4, 경사≤2°이며, 아래 중 하나에 해당하면 습지 후보: 기록된 침수 이력 / 물이 남은 웅덩이 수위보다 수직으로 2m 이내 높음 / 최종 토양 수분이 용량의80% 이상.
5. 나머지 wetness=4는 수문 근거 부족 습지 분류다. 실제 습지나 건조지로 단정하지 않는다.
6. 나머지 원본 biome6..10은 침수 이력 밖이면 숲 후보, 이력 안이면 수목 생존 미검증이다.
7. 나머지는 그 밖의 육지다.

토양 수분은 후속40 최종4저장 상태의 soilMm를 사용한다. 북부6,525격자의 모델 용량은150mm, 나머지 대상격자는200mm다. 전체168,576대상격자에만 최종 토양 상태가 있다. 배경·호수 영역에는 값이 없어 점 조회에서 `null`을 반환한다(압축 내부 배열의-1은 결측 표식). 결측을0으로 바꾸지 않는다. 높은 최종 토양 수분은 한 시점의 후보 기준이며 지속 침수 기간, 지하수면, 식생 생존을 검증하지 않는다. 강수·기후·침투·증발 가정은 기존 모델을 그대로 따른다.

`peak`는 각 웅덩이의 초기 상태 및 계산 단계 끝에서 기록한 최대 수위를 합친 육지 침수 포락선이다. 웅덩이마다 최대 시점이 다르므로 **동시에 발생하는 홍수, 100년 빈도 홍수, 홍수 확률, 단계 사이 연속시간 최대가 아니다.** 독립 중첩이므로 상호 배타 분류 합계에 더하지 않는다.

습지 민감도는 (수면 위 높이m, 경사°, 토양 수분 비율)의 세 기준 (1,1,.9)/(2,2,.8)/(5,5,.7)을 비교한다. 이 범위는 통계적 신뢰구간이 아니다. 원본 wetness4 밖의 새 습지 발생·숲 성장·고사·퇴적·열수지·수문 주기(hydroperiod)는 모델링하지 않는다. 실측/세계 최종 채택은 모든 결과에서 `actual:null`, `automaticAdoption:false`다.

## 경계와 면적 내보내기

화면은 조건·범위·분류 선택, 격자 조회, 지도 확대/이동, 공유 URL, 범위/지점 JSON, 경계/면적 GeoJSON을 제공한다. 원본 지도와 물수지의 해당 집수권으로 연결한다. 압축 자료는 브라우저와 CLI 양쪽에서 SHA-256/길이를 검사한다.

- 면적 GeoJSON은 선택된 각 원본 셀의 Polygon이다. 맞닿은 셀을 부적절한 MultiPolygon으로 합치지 않는다.
- 경계 GeoJSON은 이웃 셀의 공유 변을 제거한 MultiLineString이다. 원본 경도 이음선도 주기적 이웃으로 처리한다. 수평선은 위도 소원, 수직선은 자오선 길이를 사용한다.
- 범위 바깥에서 같은 분류가 이어지는 잘린 선은 `scope-cut-not-class-edge`, 실제 분류가 바뀌는 선은 `candidate-class-edge`로 분리한다. 집수권 경계를 숲 가장자리로 오인하지 않는다.
- 각 파일에 조건·범위·선택 분류·셀 수·면적·해상도·후보 상태를 명시한다. 빈 선택은 빈 geometry와0면적이며 결측값을 뜻하지 않는다.

## AI/재현

저장소 루트에서 별도 패키지 설치 없이 Node.js24로 실행:

```sh
node integration/natural-world/cover-boundary-model/query.cjs reference world
node integration/natural-world/cover-boundary-model/query.cjs reference D132875
node integration/natural-world/cover-boundary-model/query.cjs reference --cell 135945
node integration/natural-world/cover-boundary-model/query.cjs reference D132875 --geojson wetland boundary
node integration/natural-world/cover-boundary-model/query.cjs reference D132875 --geojson wetland cells
node integration/natural-world/cover-boundary-model/build.cjs
node --test --test-isolation=none integration/natural-world/cover-boundary-model/test.cjs
node integration/natural-world/cover-boundary-model/browser-check.cjs
```

조건: `reference`, `low-infiltration`, `slow-return`. 범위: `world`, `background`, `original-lake`, 또는 원본 D집수권번호. 분류는 `core.js`의 classes와 `peak`. 잘못된 조건·범위·격자는 오류로 처리한다. 원본 바다 지점은 `status:original-ocean`이다. 지도/CLI는 동일한 `core.js`를 사용한다.

`output/base.json.gz`는 원본 칼럼과 생태 속성, `case-*.json.gz`는 수위/토양 상태, `scope-summaries.json.gz`는 전 범위 요약, `summary.json`은 전체 결과·민감도·입력/코드 해시다. baseCommit은9e72677782c305d37af4150950488a29e8b83066. 원본 세계/지형해시와 단계40 manifest/review/geometry 및 원본atlas SHA를 고정한다. 후속40 최종상태는 기존 manifest를 통해 검증하고 재사용한다. 원본/다른 후보의 파일은 변경하지 않는다.

브라우저 검사는 `/usr/bin/chromium`과 Playwright를 사용한다. 환경에 따라 `PLAYWRIGHT_MODULE`을 지정한다. 후속40 회귀 검사는 해당 README의 C++ 컴파일 후 `WATER_NATIVE`로 바이너리를 지정한다. 별도 원본 아카이브 복구나100년 재계산은 이번 결과의 재현에 필요하지 않다.
