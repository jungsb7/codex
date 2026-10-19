# 첫 문턱의 9개 웅덩이 연결 검토 · 후속15

[연결 비교 화면](index.html) · [보고서](REPORT.md) · [한 곳의 이전 비교](../pond-surface-review/index.html#cell=237734) · [전체 집수권](../catchment-budget/index.html#cell=237734)

P237734가 P231591에 닿는 260.231659m에서 연결 가능한 전체 지형 범위는 9곳이다. 직접 이웃이 더 낮은 문턱에서 이미 연결 가능한 7곳을 누락하지 않는다. 공통 가정 수위의 정적 지형 비교이며 실제 동시 수위·연결 시점·유속·방류를 계산한 것이 아니다.

- `build.cjs`: 원본 지형 연결 그래프의 전체 연결 집합과 다음 경계를 추출하고 입력·코드 해시를 기록한다.
- `core.js`: 중복 없는 1,452개 원본 집수 격자, 450개 바닥 격자, 연결 수면의 육지 항목 교체와 증발 민감도 비교.
- `output/atlas.json`: 연결 높이·고도·면적·출처와 이전 한 곳 비교값. 기존 `../catchment-budget/output/atlas.json.gz`의 검증된 원본 장부를 그대로 함께 읽는다. 새 유량 데이터 복사본은 만들지 않는다.
- `output/summary.json`, `output/checks.json`: 첫 연결 및 다음 문턱 직전 한계의 장부와 검사 결과.
- `test.cjs`: 독립 전체 격자 범람, 최초·다음 연결, 원본 격자 합집합·물수지·기존 단일 웅덩이 비교와 null 유지 검사.
- `browser-check.cjs`: 지도·기간·연결 범위·내보내기·모바일·실패 상태 검증. `surface-browser.cjs`, `catchment-browser.cjs`는 이전 두 화면의 회귀 검사다.

전체 인계 폴더에서 재현할 때 이 폴더의 `node build.cjs`, `node --test --test-isolation=none test.cjs`를 실행한다. 브라우저 검사는 `node browser-check.cjs /workspace/planet-nature-pages`로 공개 패키지의 `/codex/` 경로를 검증한다. Playwright와 Chromium이 필요하다. 공개 화면에는 기존 원본 집수권 core·스타일·압축 자료가 함께 있어야 한다.

`package.py`는 공개 파일만 기존 사이트에 복사한다. `verify.py`는 원본 1,663파일과 직전 인계·공개 패키지를 확인한다. `remote-check.py`는 원격 커밋과 변경·이전 파일의 정확한 일치를 검증한다. 이후 단계에서 이전 build/record로 최신 인계를 덮어쓰지 않는다.
