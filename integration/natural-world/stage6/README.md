# 6단계 — 자연지리 검증·채택 후보

기존 모든 대륙·섬의268,857격자를 검산하고, 지형·식생·수계별 채택 후보와 보류 사유를 정리했습니다. [검토실](index.html)은 권역 비교, 좌표별 상태 조회, 자연 지도 이동, 검토 요약 JSON 저장을 제공합니다. [결과 보고서](REPORT.md)와 [최종 보존 검사](validation/final-checks.json)를 함께 읽습니다.

**채택 권고 후보를 만든 단계입니다.** 기존 형상·기후·수계·피복·경제 수치를 바꾸거나 원격 배포하지 않았습니다. 계산 검사 통과가 실제 숲·습지·빙하·화산의 확정을 뜻하지 않습니다.

## 실행

프로젝트 루트에서 다음 서버를 실행합니다.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

- 검토실: `http://127.0.0.1:8000/integration/natural-world/stage6/index.html`
- 자연 지도: `http://127.0.0.1:8000/integration/natural-world/index.html`

검토실은 작은 요약과 격자 검토 표를 HTML에 포함합니다. 자연 지도는 기존5단계의4개 gzip 자료도 함께 제공해야 하며, HTTPS 또는 localhost가 필요합니다. file:// 실행은 검증하지 않았습니다. 5단계 실행 안내 (전체 인계 패키지: `../stage5/README.md`)를 참고합니다.

좌표의 검토 상태는 CLI에서도 같습니다.

```sh
node integration/natural-world/stage6/query.cjs -92.6953125 49.8046875
```

이 명령은 채택 후보·보류 이유를 반환합니다. 기존 상세 지형·기후·수계 수치 조회는 `integration/natural-world/query.cjs`를 그대로 사용합니다. 검토 상태와 자연물의 확정 상태를 혼동하지 않습니다.

## 재현

Node24, 브라우저 검사는 Playwright와 Chromium을 사용합니다. 원본 재수집·경제 계산·이전 단계 재빌드는 필요하지 않습니다.

```sh
node integration/natural-world/stage6/build.cjs > integration/natural-world/stage6/validation/build-summary.txt
node integration/natural-world/stage6/view.cjs
node --test --test-isolation=none integration/natural-world/stage6/test.cjs integration/natural-world/stage5/test.cjs integration/natural-world/stage4/test.cjs integration/natural-world/stage3/test.cjs integration/natural-world/stage2/test.cjs integration/natural-world/test.cjs integration/atlas/test.cjs > integration/natural-world/stage6/validation/model-tests.txt
node integration/natural-world/stage6/browser-check.cjs
node integration/natural-world/stage6/verify.cjs
```

`build.cjs`는1~5단계 데이터를 읽고6단계 결과만 씁니다. `view.cjs`는6단계 검토실만 생성합니다. 이전 `build.cjs`로 현재 자연 지도 HTML을 덮어쓰지 않습니다. 원본 보존 비교 기준은 `inputs/prior-integration-manifest.json`에 고정되어 있습니다.

## 자료와 의미

| 파일 | 내용 |
| --- | --- |
| output/summary.json | 전역 검사·후보 수량·물수지 요약·미채택 상태 |
| output/checks.json | 12개 독립 검산 항목과 근거 |
| output/cell-review.json | 모든 육지·호수의 원본 격자 ID,8개 중첩 검토 표지,호수 마스크 |
| output/regions.json | 11개 자연 권역의 식생·수계별 상태 |
| output/issues.json | 보류·미정 사유,대표 좌표,후속 작업 |
| output/setting-review.json | 사막·초원·동부 내륙·수원·남쪽 대륙의 기존 설정 대조 |
| output/water-audit.json | 12기간·연간 독립 물수지,6,088종착점의 집수 면적·경계 유량 |
| output/arid-perennial.json | 건조·반건조지 상시 흐름 후보의 상류 기여량 |
| output/priority-depressions.json | 100m 초과 가상 채움이 있는 구역 중 연간 유입 상위12곳 |
| output/comparison.json, assumptions.json | 기준안/자연지리안 비교와 가정 목록 |
| output/examples.json | 대표19좌표의 검토 상태와 미정 값 |

물수지는 노드별 수송 연결식과 전역·기존 호수 수지를 검증합니다. **유역별 전체 강수·증발산·눈·토양 저장 항은 원본에서 별도로 내보내지 않아 미정입니다.** 종착점별 유량을 완전한 유역 물수지로 표기하지 않습니다.

`cell-review.json`의 `cells`는 정렬된32비트 little-endian 원본 격자 ID, `flags`와 `lake`는8비트 값의 Base64입니다. 같은 인덱스로 대응합니다. `audit.js`의 `decisions`가 식생·수계·실제 피복을 따로 판정합니다. 검토 표지는 중첩되므로 합산하면 중복이며, 후보 격자 면적은 실제 자연물 면적이 아닙니다.

식생 보류는 극지/고온 기후 공백 또는 기존 서부 사막의 온대·냉대림 충돌입니다. 그 외 전이 표지가 있으면 조건부, 나머지는 선별 후보입니다. 기존 호수의 기준 수면은 별도입니다. 이 판정은 모든 생태적 타당성을 인증하는 체계가 아닙니다. 기후 해상도·실제 피복·토질 부족은 모든 후보에 공통으로 남습니다.

## 다음 작업

6단계까지의 기본 구현을 마쳤습니다. 후속 보정은 큰 함몰부의 출구·저류 대안, 서부 사막 핵심 경계와 기후, 고온 PET 대안 순으로 검토합니다.6.5km 미세 수계·피복 경계 생성과 실제 면적 확정은 별도 후속 범위입니다. 자동 채택·경제 반영·원격 배포는 수행하지 않았습니다.
