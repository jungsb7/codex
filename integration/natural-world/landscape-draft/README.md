# 전 대륙 경관 설정 초안 · 후속18

[설정 초안 지도](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=0) · [선정 기준과 대표 30곳](REPORT.md) · [현황 JSON](output/summary.json).

숲·숲초원, 초원·반건조지, 습지의 기존 후보를 자연 11권역의 연속군으로 정리했다. 전 대륙 원본 격자를 같은 규칙으로 묶어 총 6,528개 연속군과 대표 초안 30곳을 제공한다. 새 대륙이나 자연물 실측 경계를 만들지 않으며 원본 식생·물수지·경제는 유지한다.

이번 작업의 완료 기준은 **권역별 초안과 근거, 지도 필터·선택·저장을 제공하는 것**이다. 현재 초안은 완료됐으며 자동 채택은 0건이다. 앞선 9곳 웅덩이 검토는 필수 잔여 0으로 종료된 상태를 유지한다. 추가 채택이나 기후·미세 경계 수정은 별도 목표다.

- `core.js`: 원본 후보 분류·보류 조건, 4방향 연결군, 위도 면적, 대표 선정, 상태 주소, 지도 강조.
- `build.cjs`, `output/`: 원본 Atlas에서 권역별 합계·대표 초안·입력/코드 해시를 기록한다. 거대 원본 자료를 복제하지 않는다.
- `ui.js`, `style.css`: 기존 전 대륙 지도에 ‘설정 초안’ 모드, 경관·판정 필터와 좌표 설명을 붙인다.
- `test.cjs`, `browser-check.cjs`, `closure-browser.cjs`: 전 격자 분류·연결군·면적·대표·원본 보존, 지도 조작과 이전 종료 기록 회귀 검사.

전체 인계 소스에서 `node build.cjs`, `node --test --test-isolation=none --test-reporter=tap test.cjs`로 재현한다. 공개 패키지 검사는 `node browser-check.cjs /workspace/planet-nature-pages`와 `node closure-browser.cjs /workspace/planet-nature-pages`를 사용한다. 이전 단계 build/record로 최신 인계를 덮어쓰지 않는다.
