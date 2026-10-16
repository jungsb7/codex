# 전 격자 정밀 지형 · 2차

[정밀 지형 조회](index.html) · [결과 보고서](REPORT.md) · [권역별 격자 기록](output/coverage.json) · [이전 지형](../terrain/index.html)

기존 왕국·제국 9개 권역의 육지를 더 상세하게 생성하는 세계관 설계 모형이다. 1차 지형 위에 작은 능선·골짜기와 미세 기복을 추가하고, 경사·방향·거칠기·곡률·상대 높이를 조회한다. 원본 앱과 1차 지형, 식량·수송·기상 장부는 보존된다.

## 화면 사용

1. `index.html`을 연다. 로컬 파일 정책이 차단하면 프로젝트 루트에서 `python -m http.server 8000`을 실행하고 `http://localhost:8000/integration/terrain-v2/index.html`을 연다.
2. 경도·위도 입력, 전체 지도 클릭, 또는 권역 예시 선택으로 이동한다.
3. 확대 수준을 전체 원본 격자/부분 구역/정밀 구역/확대 구역으로 바꾼다. 남북 간격은 각각 약 204/51/25/13m이고 동서 간격은 위도에 따라 더 작다. 선택 좌표의 지형 자체는 확대 수준에 따라 바뀌지 않는다.
4. 2차 세부 고도를 끄면 **같은 좌표의 1차 지형**과 비교한다. 경사·추가 기복·50m 거칠기·곡률·구역 내 유하 기여 면적을 선택할 수 있다. 10m 등고선과 2차 지형의 유하 방향·오목점을 켤 수 있다.
5. 좌표 JSON과 정밀 구역 JSON을 내보낸다. 주소의 경도·위도·division 값으로 같은 위치와 확대 수준을 복원한다. 전 권역 표의 국가/생활권 이름을 누르면 그 권역 **모든 부모 격자의 기록**을 내려받는다.

한 구역은 129×129개 공유 꼭짓점으로 내보낸다. 기본값은 원본 셀을 8×8구역으로 나누고 각 구역을 128분할하여 원본 셀 대비 1024분할에 해당한다. 실제 측량 정확도를 뜻하지 않는다. 모든 미세 격자를 사전 파일화하지 않고 고정 시드로 필요한 위치를 재현한다.

## 재현

프로젝트 루트, Node 24와 Python 3. 계산에는 추가 패키지가 필요 없다.

```sh
node integration/terrain-v2/run.cjs point -45.63515625 48.82734375
node integration/terrain-v2/run.cjs patch -45.63515625 48.82734375 /tmp/detail-patch.json 8
node integration/terrain-v2/tools/coverage.cjs
node --test --test-isolation=none integration/terrain-v2/test.cjs
node integration/terrain-v2/tools/build.cjs
python integration/tools/verify-baseline.py
```

`patch` 마지막 인수는 구역 분할 수 1/2/4/8/16이다. CLI 기본값은 8이다. 공용 모형의 `patch({cell, division, px, py, n})`는 n=32/64/128/256을 지원한다. 같은 좌표의 높이는 언제나 같은 생성 함수에서 나온다.

브라우저 검증은 Playwright와 Chromium이 필요하다.

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright node integration/terrain-v2/tools/browser-check.cjs
python integration/terrain-v2/tools/finalize.py
```

## 수치와 파일

- `core.js`: 고정 기복·좌표 진단·구역 생성·국지 D8 유하 모형. 1차 `../terrain/core.js`를 재사용한다.
- `output/cells-*.json`: 24,481개 부모 격자 전부의 기록. 셀 중심 고도와 내부 16개 시험 좌표의 요약이다. 전체 미세 지형의 정확한 최솟값/최댓값으로 해석하지 않는다.
- `output/example-*.json`: 권역별 25m급 예시 구역 9개. `fields`에 선언된 순서대로 높이·기복·경사·방위·상대 높이·덮개·권역·분류·거칠기·곡률·성분별 기복이 들어간다.
- `drainage.receiver`: 낮은 이웃의 노드 인덱스. −1은 오목점/미해결 경계, −2는 구역 밖 유하, −3은 세부 높이 미평가다. `terminal`이 의미를 구분한다.
- `contributingAreaM2`: **현재 구역 안에서만** 해당 지점으로 모이는 대표 면적. 실제 유량, 전역 유역 면적, 영구 하천 판정이 아니다. `representedAreaM2`와 종단 합계의 보존을 검사한다.
- `validation/`: 계산·브라우저·보존 검증과 화면 캡처.

호수 209개 셀의 세부 하저, 국가 밖 지형, 지질·동굴·식생·새 하천 유량·미기후는 추가하지 않았다. 기존 분지 상세 설계와 이 모형은 아직 별도다. 새 기복을 농지·도로·수문 입력으로 자동 채택하지 않는다.

배포 ZIP의 `integration/`을 원본 `planet-full-handoff-v0.107` 폴더에 병합한다. 이전 통합·계절·1차 지형 결과도 포함한다. 원본 앱 전체 대체 ZIP은 아니다. 계산과 설치 경로는 기존 폴더 구조를 유지한다.
