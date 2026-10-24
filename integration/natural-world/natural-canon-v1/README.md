# 자연환경 정설 v1 — 통합지도와 AI의 채택 기준

사용자가 “확정되게 진행해봐.”라고 요청한 네 자연환경 항목을 고정된 세계 설정으로 채택했다. [정설 문서](../../../worldbuilding/NATURAL_CANON_V1.md)가 권한과 범위, [decisions.json](decisions.json)이 기계 판독 규칙이다. [통합지도](../unified-atlas/index.html#mode=canon)는 새로 열 때 확정판을 기본 표시한다. 기존 `mode=review` 등 공유 주소는 당시 연구 보기를 유지하며 확정판 전환 버튼을 제공한다.

## 자료와 조회

268,857격자, 45,824물길, 12기간, 1,184집수권·23,022구간의 채택 물수지를 제공한다. `output/manifest.json`이 base와12기간 파일, 기존90개 경로 조각의 크기·SHA-256을 고정한다. 브라우저와 Node는 같은 `core.js` 함수를 사용한다. 파일 손상·기간 전환 중에는 오래된 값을 현재 확정값으로 내보내지 않는다.

```sh
node integration/natural-world/natural-canon-v1/query.cjs cell 310879 2
node integration/natural-world/natural-canon-v1/query.cjs reach 25130 2
node integration/natural-world/natural-canon-v1/query.cjs boundary D80393
node integration/natural-world/natural-canon-v1/query.cjs geometry 25130
node integration/natural-world/natural-canon-v1/query.cjs geojson wetland
```

Node API: `point(cell,period)`, `reach(id,period)`, `boundary(id)`, `geometry(id)`, `geojson(coverId)`. `point`는 피복·면적·격자 경계·눈/압밀 얼음·수면 결빙과 기준 집수권을 반환한다. `reach`는 강폭·액상 수심·수위·얼음·유량·연결·교차를 반환한다. `geometry`는 세부 경로/계곡 반폭과 지하 구간을 반환한다. `boundary`는 기존 계산의 초기/최종 저장, 침투·넘침 등 전체 누계와 잔차를 반환한다. 이 구조의 `status=adopted-world-definition`은 세계 설정의 채택을 뜻한다. `research.physicalObservation=null`과 `fullyCoupledUnsteadyModel=false`는 연구 한계다.

경로·표층과 지하의 범위는 정설 문서 참조. 해양에는 육상 정보를 임의로0으로 만들지 않고 `not-applicable`을 제공한다. 전체 숲 면적은 `forest`와 `flood-woodland`의 합이다. 물수지는 기준100년 누계이며 선택 기간의 하도 유량과 같은 장부가 아니다.

## 재현

저장소 루트에서 실행한다. 기존 계산 결과를 검증하여 재사용하므로 이전100년 모형을 다시 계산할 필요가 없다.

```sh
node integration/natural-world/natural-canon-v1/build.cjs
node --test --test-isolation=none integration/natural-world/natural-canon-v1/test.cjs integration/natural-world/seasonal-physical-model/test.cjs
node integration/natural-world/natural-canon-v1/browser-check.cjs
node integration/natural-world/natural-canon-v1/atlas-browser.cjs
```

브라우저 검사는 `/usr/bin/chromium`, Playwright `/opt/codex/cua_node/lib/node_modules/playwright`를 사용한다. SHA는 출력 manifest, 전체 출처·코드 해시는 압축 base의 provenance 및 summary에 기록한다. 검사는 `validation/`에 별도로 보관한다. 후속40~43의 연구 파일과 원본은 수정하지 않는다.

브라우저의 전체 물길은 축척에 따라 간략화하고, 선택 물길은 검증된 원래 경로 조각에서500m 이하 표본을 생성한다. 피복 GeoJSON은 원본 격자 경계이며 더 미세한 관측 경계를 제공한다고 주장하지 않는다. [결과·한계](REPORT.md).
