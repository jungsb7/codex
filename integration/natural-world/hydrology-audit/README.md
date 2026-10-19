# 전 대륙 수계 정합성 검사

[수계 검증 지도](../unified-atlas/index.html#mode=drainage) · [검사 보고서](REPORT.md) · [전역 결과](output/summary.json)

통합 자연지도의 **수계 검증** 보기에서 지점을 선택하면 하류 후보를 금색 선으로 표시합니다. 같은 종착점에 속한 전체 집수권을 밝게 표시하며, 3배 이상 확대하면 종착점별 집수 경계가 나타납니다. **경로 전체**, **종착점 보기**, 기존 본류·미확정 경계 바로가기를 사용할 수 있습니다. 좌표 JSON 저장에 수계 검사 결과도 포함됩니다.

미확정 함몰부에서는 추적이 멈춥니다. 함몰부·호수의 대표 노드는 계산용이며, 그 대표점까지 가상의 물길을 긋지 않습니다. 기존 호수의 하류는 원본 출구에서 별도로 이어집니다. 원본 약26km 격자의 연결 후보이고, 실제 소하천·분수계 능선·수면 경계가 아닙니다.

`기존 세계 설정만`을 선택하면 후보 경계·추적·집수권 색도 숨깁니다. 검사 자료 약2MB는 이 보기를 처음 열 때만 추가로 읽으며, 통합지도 자료의 SHA-256과 일치해야 사용합니다.

프로젝트 루트에서 재현합니다. 아래 build는 이 폴더의 output만 갱신합니다. 과거 단계의 build/record/verify는 실행하지 않습니다.

```sh
node integration/natural-world/hydrology-audit/build.cjs
node --test --test-isolation=none --test-reporter=tap integration/natural-world/hydrology-audit/test.cjs integration/natural-world/unified-atlas/core.test.cjs integration/natural-world/pages-release/navigation.test.cjs
node integration/natural-world/hydrology-audit/browser-check.cjs
node integration/natural-world/hydrology-audit/regression-browser.cjs
```

`audit.cjs`는 생성기의 순회·누적 함수를 가져오지 않는 독립 검사입니다. `core.js`는 지도 확장과 브라우저/CLI 공통 조회를 담당합니다. `build.cjs`는 연결·실제 진입 격자·구간 기하·장부를 재검사하고 표시 자료를 만듭니다. 새 물길·호수·습지의 자동 채택, 고도·기후·경제 변경은 없습니다.
