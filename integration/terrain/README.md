# 전 권역 좌표별 세부 지형

[지형 조회 화면](index.html) · [결과와 한계](REPORT.md) · [적용 현황](output/coverage.json)

왕국·제국 9개 권역의 모든 기존 격자에 재현 가능한 세부 높이장을 연결했다. 원본 약 26km 고도 기준점 사이에 생성한 설계 지형이며, 실제 측량·지질·수문 자료가 아니다. 기존 세계와 경제 장부를 수정하지 않는다.

## 사용

1. `index.html`을 연다. 로컬 파일이 차단되는 브라우저에서는 프로젝트 루트에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000/integration/terrain/index.html`을 연다.
2. 경도·위도를 입력하거나 전체 지도에서 위치를 클릭한다. 권역 목록은 해당 권역의 예시 좌표로 이동한다.
3. 왼쪽 지도에서 더 세밀한 위치를 클릭한다. 고도·경사·추가 기복 지도를 선택하고 원본 보간면과 세부 고도를 비교한다. 인접 격자로 이동할 수 있다.
4. 좌표 JSON 또는 격자 JSON을 내려받는다. 주소의 `#lon=…&lat=…`는 같은 좌표를 다시 연다.

원본 지형의 기준점 간격은 0.234375°다. 한 격자를 각 축 128등분하며 129×129개 공유 꼭짓점을 내보낸다. 남북 간격 약 203.6m, 이 권역들의 동서 간격 약 131~186m다. 같은 연속 지형장을 32·64·128분할로 읽으므로 분할 수를 바꿔도 같은 좌표의 고도는 바뀌지 않는다. 원본 앱의 좌표 기후나 기존 세부 분지 설계는 그대로 유지되고, 이 새 지형 화면은 기후를 다시 계산하지 않는다.

## CLI와 재현

프로젝트 루트에서 Node 24와 Python 3을 사용한다. 계산 엔진에는 추가 패키지가 필요 없다.

```sh
node integration/terrain/run.cjs point -40.65 46.30
node integration/terrain/run.cjs tile 286290 /tmp/terrain-cell.json 128
node integration/terrain/tools/coverage.cjs
node --test --test-isolation=none integration/terrain/test.cjs
node integration/terrain/tools/build.cjs
python integration/tools/verify-baseline.py
```

`point` 출력에는 해당 원본 셀 ID가 있다. `tile` 명령은 그 ID를 사용한다. 대상 밖 좌표는 상태와 null을 반환하고, 대상 밖 타일이나 잘못된 입력은 오류로 거부한다. 호수·바다는 원본 마스크를 유지하며 세부 하저·해저를 만들지 않는다.

브라우저 검증은 Playwright와 Chromium을 사용한다. 현재 환경의 실행 명령:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright node integration/terrain/tools/browser-check.cjs
```

최종 패키징: `python integration/terrain/tools/finalize.py`. 이전 단계의 finalize 스크립트는 과거 인계 상태를 기록하므로 이번 작업에 사용하지 않는다.

## 파일과 설치

- `core.js`: 브라우저·Node 공용 좌표 지형 함수, 경사·방향·후보 지형 분류, 타일 생성.
- `inputs/model.json`: 원본 고도·수면·기존 권역·하천, 고정 시드와 명시 가정.
- `inputs/manifest.json`: 원본 파일 SHA-256. `inputs/prior-integration-manifest.json`은 이전 통합/계절 결과 보존 확인용이다.
- `output/coverage.json`: 전 부모 격자 중심·내부 시험 좌표 검사. `example-*.json`: 권역별 128분할 예시 타일 9개.
- `validation/`: 계산·브라우저·원본 보존 검증, 화면 캡처.

배포 ZIP의 `integration/`을 기존 `planet-full-handoff-v0.107` 폴더에 덮어쓴다. 이전 통합·계절 비교도 ZIP에 함께 포함한다. 원본 앱 전체를 대체하는 ZIP은 아니다. 단독 `index.html`은 계산 입력과 코드를 내장해 지도 조회·다운로드가 가능하며, 보고서와 원본 앱 링크까지 사용하려면 폴더 구조를 유지한다.
