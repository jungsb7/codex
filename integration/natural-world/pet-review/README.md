# 고온 PET 방법 공백 검토 — 후속8

[비교 화면](index.html) · [판단 보고서](REPORT.md) · [요약](output/summary.json) · 입력 요건 (전체 인계 패키지: `output/methods.json`) · [출처](output/references.json) · [검증](validation/final-checks.json)

전 대륙 육지·기존 호수 268,857격자를 검사하고, 기간 기온이 38°C를 넘는 24,448격자에서 Oudin 형태의 조건부 PET를 비교합니다. 원본 고온 공백·세계·기후·경제는 유지합니다. 일사 표본 규약 두 가지는 같은 방법의 민감도이며 독립된 검증 모형이 아닙니다.

## 보기

프로젝트 루트 `planet-full-handoff-v0.107`에서:

```sh
python -m http.server 8080
```

`http://localhost:8080/integration/natural-world/pet-review/index.html`을 엽니다. HTTPS 또는 localhost에서 gzip 스트림 해제를 지원하는 최신 브라우저가 필요합니다. `file://`로 열 수 없습니다. 지도 HTML·JS·CSS, 약10.9MB의 gzip 자료, 상위 `core.js`, `stage2/core.js`, `stage5/codec.js`가 함께 필요합니다. 최초에 자료 전체를 읽습니다.

지도 4종은 조건부 식생·고온 기간 수·조건부 P/PET·기존 유효 육지의 PET 비율입니다. 전 대륙/11개 자연 권역 이동, 좌우 동시 확대·이동, 좌표 검색, URL 상태, 뒤로 가기, 키보드, JSON 내보내기를 지원합니다. 기존 자연 지도와 전 대륙 검토 지도에 같은 좌표로 연결됩니다. 정치·경제9권역과 자연 검토11권역은 다릅니다.

기존 호수209칸은 호수로 유지합니다. 지도의 회색은 선택한 고온 검토 범위 밖 육지입니다. 고온 공백 밖에서는 연간 대조 지표만 제공하며, 12기간 상세는 고온 범위에 한정합니다. 전체 대조 집계는 **대표 위상** 방식 기준입니다.

## 재현

이 폴더에서 실행합니다. `inputs/prior-integration-manifest.json`은 작업 시작 전594파일의 고정 스냅샷이므로 덮어쓰지 않습니다.

```sh
node build.cjs > validation/build-log.json
node --test --test-isolation=none --test-reporter=tap core.test.cjs > validation/model-tests.txt
node browser-check.cjs
node record.cjs
node verify.cjs
node query.cjs 22.1484375 33.3984375 interval
```

브라우저 검사는 Playwright(`/opt/codex/cua_node/lib/node_modules/playwright`)와 Chromium(`/usr/bin/chromium`)을 사용하며 임시 localhost 서버를 자동 종료합니다. 마지막 두 명령은 최신 공유 기록과 통합 manifest를 갱신하므로 후속 단계가 생긴 뒤 재실행하지 않습니다.

## 근거와 제한

- `core.js`: 원본 `solarAt` 재현, airGR의 Oudin 기온 계수·단위 변환, 기간 집계, 잠재 식생 선별, 공통 좌표 조회.
- `build.cjs`: 원본268,857격자 재대조, 고온24,448격자·대조236,874격자 집계, 입력 점검, 압축자료 생성.
- `inputs/references/`: 읽은 공개 airGR/pyet 원문 스냅샷. 외부 코드를 실행하지 않았으며 URL·SHA-256을 별도로 기록.
- `output/atlas.json.gz`: 전 대륙 연간 지표, 고온 범위 원본12기간 기온·강수, 분리된 두 비교 지표. Float32 NaN은 미정이며0이 아님.
- `output/review-decisions.json`: 원본 유지, 조건부 비교, 미실행 방법과 검증 공백, 다음 단계.

원본 기간 기온을 일평균 대용으로 쓰며 실제 일별 시계열은 없습니다. 기상 공분산, 습도, 지표 순복사, 실제 증발산, 호수 증발, 토양 수분, 유출·저장·관개·농지는 계산하지 않았습니다. PET가 유한하다는 이유로 고온 방법 보류를 해제하지 않습니다. 웹 배포와 세계 설정의 자동 채택은 없습니다.
