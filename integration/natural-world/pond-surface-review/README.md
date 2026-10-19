# P237734 수면 가정 비교 · 후속14

[비교 화면](index.html) · [보고서](REPORT.md) · [원본 집수권](../catchment-budget/index.html#cell=237734)

286개 원본 집수 격자와 74개 지형 바닥 격자에서, 최초 이웃 연결 높이까지의 수면 가정을 검토한다. 실제 호수·저류·얼음·지하수 교환·방류는 미정이다. 기존 자연물과 원본 수문 계산은 변경하지 않는다.

- `build.cjs`: 검증된 후속13 장부에서 정확한 Float64 부분집합을 추출하고 원본 고도 D8 최소 연결 높이를 계산한다.
- `core.js`: 연결된 양의 수심 격자의 면적·기하학적 부피, 육지 장부 제거, 수면 항목의 조건 비교. 기간은 원본 12기 또는 연간 합계다.
- `output/atlas.json.gz`: 286격자 × 12기, 21개 눈 증가 격자, 74개 지형 열, 이웃 지형, 입력·코드 해시.
- `output/summary.json`: 전체 수치와 검토 범위. `actual`의 null은 추정치나 0으로 바뀌지 않는다.
- `test.cjs`, `browser-check.cjs`: 독립 범람 연결 검사, 물수지, 원본 보존, 화면/주소/저장 검사.

재현은 이 폴더에서 `node build.cjs`, `node --test --test-isolation=none test.cjs`로 실행한다. 브라우저 검사는 `node browser-check.cjs /workspace/planet-nature-pages`이며 Playwright와 Chromium이 필요하다. UI는 기존 `../catchment-budget/core.js`와 스타일을 함께 제공해야 한다. 전체 원본 집수권 자료는 기존 후속13 산출물에 있다.

`package.py`는 공개할 파일만 기존 배포 체크아웃에 복사한다. `verify.py`는 원본 1,663파일·직전 인계·공개 패키지를 검증한다. `remote-check.py`는 커밋의 모든 변경 파일과 이전 파일의 보존을 검사한다. 이후 단계에서는 이 단계의 record/build를 무작정 실행해 최신 인계를 덮어쓰지 않는다.
