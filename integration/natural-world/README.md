# 최신 후속9: 전 대륙 자연지도 통합

[통합 화면](unified-atlas/index.html) · [안내](unified-atlas/README.md) · [보고서](unified-atlas/REPORT.md)

지형·식생·수계·지질·검토 상태를 한 화면에서 전환합니다. 기존 산계16/주요강7/호수209격자와 후보 물길45,824구간·습지9,804·화산대214격자를 구분. 전 대륙·좌표·전문 검토 연결. 실제 피복/자연물은 새로 채택하지 않았습니다. 이전 [자연지도](index.html)·[전역 검토](review-atlas/index.html)·[고온 PET](pet-review/index.html)는 보존했습니다.

이하 문서는 이전 단계 기록입니다. 최신 상태는 위 링크와 STATE.json을 기준으로 읽습니다.

<!-- unified-atlas-latest:end -->

# 최신 후속8: 고온대의 물과 식생

[비교 화면](pet-review/index.html) · [보고서](pet-review/REPORT.md) · [실행 안내](pet-review/README.md)

고온 공백24,448격자의 Oudin 형태 비교와 대안 입력 점검을 완료했습니다. 조건부 식생은 실제 피복이 아니며 기존 보류 유지,검증 해소0입니다. 4개 지도 항목·전 대륙/11권역·좌표12기간 그래프. [이전 전 대륙 검토 지도](review-atlas/index.html)와 [서부 사막 비교](desert-review/index.html)는 보존했습니다.

이하 문서는 이전 단계 기록입니다. 최신 상태는 위 링크와 STATE.json을 기준으로 읽습니다.

<!-- pet-review-latest:end -->

# 최신 후속7: 서부 사막의 설정과 기후

[비교 화면](desert-review/index.html) · [보고서](desert-review/REPORT.md) · [실행 안내](desert-review/README.md)

기존 사막 검토권은 반건조·숲초원·한랭 산지·숲 후보로 나뉘며 사막 분류0격자입니다. 지표 건조색과 기후 건조도를 구분하고4개안을 비교했습니다. 새 기후/피복은 채택하지 않았습니다. 이전 [전 대륙 검토 지도](review-atlas/index.html)는 보존하며 같은 좌표로 연결합니다.

이하 문서는 이전 단계 기록입니다. 최신 상태는 위 링크와 STATE.json을 기준으로 읽습니다.

<!-- desert-review-latest:end -->

# 최신 후속6: 전 대륙 검토 지도

[새 검토 지도](review-atlas/index.html) · [보고서](review-atlas/REPORT.md) · [안내](review-atlas/README.md) · [채택 조건](review-atlas/output/registry.json)

모든 대륙의 후보·보류·미해결과 국지 검토1~5를 연결했습니다. 실제 피복 경계는 미정이며, 두 집수권6,850격자에는 상세 원수지 근거가 있습니다.55개 적설 후보와 조건부 얼음·지하 교환은 해당 범위 밖으로 일반화하지 않았습니다. 원본 자연지도는 보존했습니다.

이하 문서는 이전 단계의 기록입니다. 최신 상태는 위 링크와 STATE.json을 기준으로 읽습니다.

<!-- review-atlas-latest:end -->

# 전 대륙 자연지리 · 기본 구현 및 함몰부 보정 검토

최신 후속은 [웅덩이별 흐름·물수지](pond-budget/index.html)와 [보고서](pond-budget/REPORT.md)입니다. D126467의51개·D147845의1개 국지 웅덩이 유입·합류·재분리와6,850격자 원본 육지 물수지 계측을 완료했습니다. [실행 안내](pond-budget/README.md). 실제 호수52곳을 확정한 결과는 아닙니다. 새 수면 증발·눈/얼음·지하수·토지전환 물수지는 후속이며 원본·현재지도·경제 장부를 유지했습니다. [검토2](retention-chain/REPORT.md)와 [검토1](retention-review/REPORT.md)은 보존합니다.

검토실에서 모든 격자의 층별 채택 후보·보류 이유를 확인합니다. 실제 피복·습지 면적·빙하·개별 화산과 유역별 전체 원수지는 미정입니다. 지도 표현은5단계와 동일하며 원본·경제 장부를 유지했습니다.

[검토실](stage6/index.html) · [6단계 검증 보고서](stage6/REPORT.md) · [현재 지도](index.html) · 실행 안내 (전체 인계 패키지: `stage5/README.md`) · 결과 보고 (전체 인계 패키지: `stage5/REPORT.md`) · 검증 (전체 인계 패키지: `stage5/validation/final-checks.json`) · [설계안](../natural-world-design/PLAN.md)

**자연·지형·수계·식생·지질** 다섯 가지 보기로 전 대륙을 탐색합니다. 분석 지도13개도 유지합니다. 산악 음영, 확대 단계별 나무·초본·습윤 무늬와 지류, 계절 기후 표현을 추가했습니다. 현재 피복은 잠재 식생과 구분하고 자료가 없는 육지는 미정으로 표시합니다.

좌표의 자연환경을 먼저 보여 주고 상세 근거·수계·기후 장부를 접어서 읽을 수 있습니다. 좌표 JSON과6.5km 검토 타일 저장은 유지합니다. 무늬는 후보 환경의 지도 기호이며 실제 숲·습지 경계나 개별 자연물의 새 좌표가 아닙니다.

**HTML과 데이터 파일을 함께 HTTP로 제공해야 합니다.** 기존 거대 단일 HTML을 작은 화면 파일과4개 압축 자료로 분리했습니다. `index.html`만 복사하거나 file://로 열면 실행되지 않습니다. 프로젝트 루트에서:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/integration/natural-world/index.html`을 엽니다. 최신 브라우저의 DecompressionStream·WebCrypto를 사용하며 HTTPS 또는 localhost가 필요합니다. 각 데이터의 SHA-256과 세계 해시를 확인한 뒤 표시합니다. 로딩 오류 시 재시도할 수 있습니다.

최신 빌드는 `node integration/natural-world/stage5/build.cjs`입니다. 이전 단계 빌드로 최신 화면을 덮어쓰지 않습니다. 좌표 CLI는 그대로 `natural-world/query.cjs point 경도 위도`를 사용합니다.

| 단계 | 보존된 결과 |
| --- | --- |
| 1. 기준층 | [보고서](REPORT.md), output/, validation/ |
| 2. 기후·지질 | 보고서 (전체 인계 패키지: `stage2/REPORT.md`), stage2/output/, stage2/validation/ |
| 3. 연결 수계 | 보고서 (전체 인계 패키지: `stage3/REPORT.md`), stage3/output/, stage3/validation/ |
| 4. 생태·지표 | [보고서](stage4/REPORT.md), stage4/output/, stage4/validation/ |
| 5. 지도 표현 | 보고서 (전체 인계 패키지: `stage5/REPORT.md`), stage5/output/, stage5/validation/ |
| 6. 검증·채택 후보 | [보고서](stage6/REPORT.md), [검토실](stage6/index.html), stage6/output/, stage6/validation/ |

세계268,857격자의 기후·지형·수문·생태 자료와 원본1,663파일, 경제·농지·식량 장부는 보존합니다. 1~6단계 기본 구현과 대표 함몰부 출구·저류 비교를 완료했습니다. 다음은 D126467–D147845 연쇄 함몰부 검토입니다. 서부 사막·고온 PET도 후속 목록에 남아 있습니다. 자동 채택과 자연지리 원격 배포는 수행하지 않았습니다.

## 최신 후속 검토4: 육지에서 수면으로

[수면 전환 비교](surface-water/index.html) · [보고서](surface-water/REPORT.md) · [재현 안내](surface-water/README.md)

D126467·D147845의52개 웅덩이에서 기존 기온·강수, 눈·얕은 저장을 이어6개 가정을 비교했습니다. 전 대륙의 실제 호수/빙하 확정은 아닙니다. 기존 자연지도는 유지했습니다. 다음: 장기 눈 축적의 지속 가능성과 수면 에너지·실제 얼음·지하수 교환 가정을 좁힌 뒤 수면 채택 가능성을 검토. 다음 D144758 내부 처리와25m 절하는 계속 별도 보류.

## 최신 후속 검토5: 남는 눈과 지하 교환

[한랭 환경·지하 교환 비교](cold-water/index.html) · [보고서](cold-water/REPORT.md) · [재현 안내](cold-water/README.md)

D126467·D147845 집수권의 장기 적설55곳은 모두 함몰부 밖이며18곳에 극지 강수 공백이 겹칩니다. 지하 교환을 추적하는4개안,조건부 결빙과 잠열 진단을 추가했습니다. 실제 빙하·호수 얼음·대수층으로 확정하지 않았습니다. 다음: 검토1~5의 근거·가정·보류 항목을 전 대륙 지도에서 구분되는 검토 표식과 채택 목록으로 연결. 두 유역의 조건부 결과를 전 대륙의 사실로 일반화하지 않으며 실제 빙하·호소·대수층 경계는 미정 유지.
