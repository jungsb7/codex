# 9곳 국지 검토 최종 정리 · 후속17

[최종 결정과 전체 현황](../pond-thermal-review/status.html#cell=237734) · [전 대륙 지도](../unified-atlas/index.html#mode=drainage&cell=237734&lon=99.0234375&lat=53.7890625&zoom=8) · [보고서](REPORT.md).

P237734 주변 9곳의 지형·집수·물수지·열수지 검토를 종료했다. 원본 진단과 조건부 비교를 보존하고, 실제 호수·얼음·교환·방류의 보류 이유를 최종 결정 기록에 모았다. **남은 필수 단계는 0이다.** 새 물리 모형이나 다른 함몰부를 필수 작업으로 이어 붙이지 않는다.

- `build.cjs`: 직전 연결·열수지 요약과 원본 집수권 멤버십을 조합한다. 새로운 물리 계산은 하지 않는다.
- `output/register.json`: 8개 결정, 9곳·1,452집수 격자 범위, 가정값, 근거 JSON 경로, 실제 미정값과 재검토 조건.
- `output/project-status.json`: 전 대륙 기본 6단계 완료, 현재 9곳 검토 종료. 기존 전역 공백 수는 유지한다.
- `core.js`, `ui.js`, `style.css`: 기존 전 대륙/연결 지도와 진행 현황 화면의 최종 기록 표시. 좌표 JSON에도 종료 정보가 포함된다.
- `test.cjs`, `browser-check.cjs`, `connection-browser.cjs`: 근거·멤버십·미정 보존과 실제 지도 연결 검증.

원본과 기존 계산은 그대로이며 새로운 호수·숲·화산은 채택하지 않는다. 실제 자연물 확정·기후 수정·해상도 개선은 별도 범위다. 최종 결정 종료를 전 대륙 모든 자연물의 확정률로 해석하지 않는다.

전체 인계 소스에서 `node build.cjs`, `node --test --test-isolation=none --test-reporter=tap test.cjs`로 재현한다. 브라우저 검사는 `node browser-check.cjs /workspace/planet-nature-pages`와 `node connection-browser.cjs /workspace/planet-nature-pages`를 사용한다. 이전 단계 build/record는 최신 인계 이후 실행하지 않는다.
