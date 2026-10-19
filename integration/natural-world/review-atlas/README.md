# 전 대륙 자연지리 검토 지도

[지도](index.html) · [결과 보고](REPORT.md) · [18개 채택 조건](output/registry.json) · [최종 검증](validation/final-checks.json)

모든 대륙·섬의 268,857개 육지·기존 호수 격자를 기존 설정, 선별 후보, 조건부 참조, 채택 보류, 미해결로 구분합니다. **새 자연물의 실제 경계를 확정한 지도가 아닙니다.** 원본 자연지도와 검토1~5는 보존했습니다.

## 사용

프로젝트 루트에서 HTTP 서버를 실행합니다. 최신 Chromium 계열 또는 `DecompressionStream`을 지원하는 브라우저로 localhost/HTTPS에서 여세요. `file://` 직접 열기는 지원하지 않습니다.

```sh
python -m http.server 8765 --bind 127.0.0.1
```

주소: `http://127.0.0.1:8765/integration/natural-world/review-atlas/index.html`

- 식생 검토 / 배수 검토 / 잠재 식생 / 지형 후보 / 상세 근거 범위를 전환합니다.
- 자연 검토 11권역과 18개 근거 항목으로 강조할 격자를 고릅니다. 기존 왕국·제국 경제 9권역과 다른 구분입니다.
- 검토 표식은 대표 지점입니다. 선택 조건의 전체 격자는 색으로 강조하고 나머지를 흐리게 표시합니다. 식생과 배수 상태를 하나의 확실성 점수로 합치지 않습니다.
- 클릭 또는 경도·위도 입력으로 조회하고, 좌표 기록 JSON을 내보냅니다. 드래그·휠·확대 버튼으로 이동합니다. 키보드는 방향키, `+`/`-`, `Enter`(지도 중앙 조회)를 지원합니다.
- 보기·좌표·필터·확대·표식 상태를 URL에 저장합니다. 링크 복사와 브라우저 뒤로 가기로 재현할 수 있습니다.
- 좌표별 조건과 출처에서 이전 검토 화면을 열 수 있습니다. 국지 분석 링크는 같은 원본 격자를 선택합니다.

## 근거의 범위

원본 1536×768 중 육지·기존 호수 268,857격자만 조회 자료로 묶었습니다. 고도·기존 호수·산계·주요 강은 세계에 저술된 설정이며 관측 사실이 아닙니다. 잠재 숲·정글·초원, 평야·구릉, 습지, 화산대는 이전 단계의 계산 분류입니다. 신규 숲·습지·빙하·호소·대수층·개별 화산 형상은 `null`로 유지합니다.

D126467·D147845의 6,850격자에는 원본 원수지 내보내기와 국지 검토1~5의 근거가 있습니다. 그 외 262,007격자에는 이 상세 원수지 내보내기가 없습니다. 국지 장기 적설 후보55곳은 모두 함몰부 밖이고,18곳에 극지 수분 자료 공백이 겹칩니다. 후보 밖을 ‘눈 없음’으로 해석하지 않습니다. 결빙과 지하 교환의 가정도 두 집수권 밖에 적용하지 않습니다.

국지 계산을 했어도 실제 배수의 물리 조건은 미해결이므로 전역 배수 검토 상태를 임의 해제하지 않았습니다.25m 절하는 내부 턱·약1.068m 역수위 때문에 보류하고, D144758 이후를 바다로 연결하지 않습니다.

기후 원자료4°/일부 수분 수송2°, 원본 지형0.234375°(남북 약26km),6.5km 타일은 고도 보간/부모 속성 계승입니다. 후보 격자 면적은 실제 자연물 면적이 아닙니다. 경제·농지 장부는 갱신하지 않습니다.

## 재현

아래는 모두 프로젝트 루트 기준입니다. 이전 단계 빌드/검증은 현재 지도를 덮어쓸 수 있으므로 실행하지 않습니다. 새 검토 지도만 아래 명령으로 재생성합니다.

```sh
node integration/natural-world/review-atlas/build.cjs
node --test --test-isolation=none --test-reporter=tap integration/natural-world/review-atlas/core.test.cjs > integration/natural-world/review-atlas/validation/model-tests.txt
node integration/natural-world/review-atlas/browser-check.cjs
node integration/natural-world/review-atlas/record.cjs
node integration/natural-world/review-atlas/verify.cjs
node integration/natural-world/review-atlas/query.cjs -61.7578125 66.2109375
```

브라우저 검사는 로컬 HTTP 서버를 열었다 닫으며 `/opt/codex/cua_node/lib/node_modules/playwright`와 `/usr/bin/chromium`을 사용합니다. 별도 환경에서는 해당 경로를 조정하세요. Node24 환경에서 개별11개 테스트가 보고되도록 `--test-isolation=none`을 지정합니다.

`output/atlas.json.gz`는 약1.90MB이며 새 화면은 원본 자연지도의57MB 자료를 읽지 않습니다. `index.html`, `app.js`, `core.js`, `style.css`, 압축 자료와 `../stage5/codec.js`가 필요합니다. 출처 링크를 유지하려면 이전 검토 폴더도 함께 있어야 합니다. 최초 데이터는 한 번에 읽으며 부분 로딩은 아닙니다.

`build.cjs`는 기존 자료를 읽어 화면용 묶음만 만듭니다. `record.cjs`는 새 보고서와7개 공유 상태/문서만 갱신합니다. `verify.cjs`는 원본1,663개와 이전 통합541개를 대조하고 허용된7개 공유 파일 이외 변경이 있으면 실패합니다. 성공 시 통합 manifest21을 기록합니다. `.cache`는 제외합니다.

다음은 **서부 사막 설정과 식생 후보가 충돌하는2,629격자의 원인과 설정 대안 비교**입니다. 기존 사막 경계·강수 처방·산계의 비그늘을 대조하고, 원본 유지안과 후보 변경안을 나란히 검토합니다. 이 지도 자체는 새로운 물리 가정을 추가하거나 자동 채택/배포하지 않습니다.
