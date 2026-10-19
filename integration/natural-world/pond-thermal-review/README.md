# 9곳 수면의 열수지 조건과 전체 남은 범위 · 후속16

[기존 연결 지도에 추가한 비교](../pond-connection-review/index.html#cell=237734&period=0&view=surface) · [분석 보고서](REPORT.md) · [프로젝트 현황](status.html).

새 연구 화면을 따로 만들지 않고 기존 9곳 연결 지도에 기온·영하 표본·대기 상단 일사·증발 잠열 비교를 추가했다. 수위·원본 기간·증발 가정을 바꾸면 함께 갱신된다. 기존 JSON 내보내기에 `thermal` 항목이 추가된다.

- `core.js`: 기존 cold-water/diagnostics.js의 일사 함수만 재사용한다. 얼음 성장·빙하·500년 반복은 적용하지 않는다. 원본 기간 장부를 열량으로 환산하고 TOA와 비교한다.
- `build.cjs`: 첫 연결·다음 문턱 한계 결과와 전 대륙 현황을 저장한다. 기존 과학 데이터는 수정하지 않는다.
- `output/summary.json`, `checks.json`: 열수지 비교와 검사. 실제 순복사·수온·얼음·증발·방류는 null이다.
- `output/project-status.json`, `PROJECT_STATUS.md`, `status.html`: 기본 후보 지도 6단계 완료, 남은 현재 국지 정리 1회와 별도 과제를 구분한다.
- `ui.js`, `style.css`: 기존 연결 화면의 열수지 패널. 전 대륙 지도에서 진행 현황으로 이동할 수 있다.

전체 인계 폴더의 이 디렉터리에서 `node build.cjs`, `node --test --test-isolation=none test.cjs`로 재현한다. 브라우저 검사는 `node browser-check.cjs /workspace/planet-nature-pages`를 사용한다. 공개 패키지 `/codex/` 경로와 Chromium/Playwright가 필요하다.

원본 1,663파일과 직전 인계의 보존은 `verify.py`, 원격 변경·기존 파일 보존은 `remote-check.py`로 확인한다. 이전 단계의 build/record를 실행해 최신 인계를 덮어쓰지 않는다.
