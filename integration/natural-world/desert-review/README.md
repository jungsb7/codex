# 서부 사막 설정·기후 대안 비교

[비교 지도](index.html) · [판단 보고서](REPORT.md) · [집계·출처](output/summary.json) · [검증](validation/final-checks.json)

서부 사막 검토권7,409격자 중 숲 기후 후보2,629격자의 원인을 대조합니다. 현재 선별식에는 사막 분류가0곳이며 반건조 초원3,222·건조 숲초원976·한랭 산지 초지582·온대림183·냉대림2,446곳입니다. 모두 잠재 환경이며 실제 피복이 아닙니다.

## 범위와 해석

기존 자연 검토3권역만 비교합니다. 원본 설계 타원 전체 육지8,932격자 중1,523격자는 우선 분류에 따라 다른 자연 권역입니다. 따라서 기존 ‘타원 면적의36.6% 숲’은 엄밀히 **검토3권역 면적의36.6%**라는 뜻입니다. 지리 이름, 지표 건조 표현 지수, 기후의 건조도, 실제 피복을 구분합니다.

원본 앱을 읽어57개 4° 기후 칸의12기간 수분 역추적·장벽·상승·해양 공급·서부 강수 혼합 항을 저장했습니다. 재구성한 수분 지수는 원본과 정확히 일치합니다.7,409격자×12기간의 원본 기온·강수도 이전 자료와 Float32 값이 같습니다. 실제 대기 수분 보존이나 세밀한 바람을 새로 검증한 것은 아닙니다.

원본 사막 타원은 지형의 고도·건조 표현에 쓰이고, 서부 온대 혼합의 가중치에 간접 반영됩니다. 서부 강수를 직접 낮추는 동방 건조지 배율은 이곳에 적용되지 않습니다. 마지막 서부 강수 혼합만 제거해도 숲 후보2,126곳, 사막0곳이 남습니다. 이 진단은 기온·바람을 고정했으며 서부 기후 설정 전체를 제거한 재실험이 아닙니다.

## 비교안

| 안 | 무엇을 바꾸는가 | 숲 후보 | 사막 후보 |
|---|---|---:|---:|
| A 원본 유지 | 아무것도 변경하지 않음 |2,629|0|
| B 건조 핵심·전이권 해석 | 기후 그대로, 환경별 명명/경계 해석만 제안 |2,629|0|
| C1 강수25% 감소 |12기간 강수×0.75, 기온·PET 고정 |731|74|
| C2 강수50% 감소 |12기간 강수×0.5, 기온·PET 고정 |0|2,412|

B는 현재 기후와 잘 맞는 작은 해석 변경이지만, 실제 사막 핵심이 필요한 설정을 충족하지 못합니다. C는 감소 원인을 설명하지 못하는 민감도입니다. 검토권 밖과의 불연속이 있고 물수지·유출·저장·경제를 재계산하지 않았으므로 세계에 적용할 수 없습니다. 원본 숲 충돌 칸을 AI0.2 경계까지 낮추려면 강수가 약69.2~83.8% 줄어야 합니다. 경계에 정확히 도달한 값과 엄격한 `<0.2` 분류를 구분하고, 고산 한랭 생장 제한도 남깁니다.

## 화면·조회

프로젝트 루트에서:

```sh
python -m http.server 8765 --bind 127.0.0.1
```

`http://127.0.0.1:8765/integration/natural-world/desert-review/index.html`을 엽니다. 최신 브라우저의 localhost/HTTPS와 `DecompressionStream`이 필요합니다. `file://`는 지원하지 않습니다.

좌우 지도는 같은 좌표 범위를 공유합니다. 비교안, 분류/강수/PET 대비 건조도 보기, 원본 충돌 표식을 전환합니다. 클릭·경위도 입력·대표 격자 선택으로 원본/비교12기간과 강수 혼합의 기여, 장벽, AI경계 도달 필요량을 조회합니다. JSON·공유URL·키보드·모바일을 지원합니다. 이전 전 대륙 지도에서 같은 격자로 이동할 수 있습니다. 배포할 때 `../core.js`, `../stage2/core.js`, 이 폴더의 HTML/JS/CSS/gzip자료 및 출처 링크 대상이 필요합니다.

```sh
node integration/natural-world/desert-review/query.cjs rain050 299945
```

## 재현과 보존

```sh
# 저장된 증거가 있으면 수집을 반복할 필요가 없습니다.
node integration/natural-world/desert-review/collect.cjs
node integration/natural-world/desert-review/build.cjs
node --test --test-isolation=none --test-reporter=tap integration/natural-world/desert-review/core.test.cjs > integration/natural-world/desert-review/validation/model-tests.txt
node integration/natural-world/desert-review/browser-check.cjs
node integration/natural-world/desert-review/record.cjs
node integration/natural-world/desert-review/verify.cjs
```

수집/브라우저 검사는 자체 로컬 서버를 열고 닫습니다. Playwright경로 `/opt/codex/cua_node/lib/node_modules/playwright`, Chromium `/usr/bin/chromium`을 사용합니다. 다른 환경에서는 경로를 조정하세요. 원본 앱의 렌더 반복만 멈추고 기후·지형·장부는 수정하지 않습니다.

`inputs/climate-evidence.json`은 원본57칸의12기간14단계 이하 역추적 및7,409격자의 원본 샘플입니다. `output/atlas.json.gz`는 화면용 자료, `summary.json`은 면적 가중 집계·가정·보류·출처 해시입니다. 면적은 구면 셀 면적이며 실제 숲·사막 면적이 아닙니다. 고도·기후·분류·단면은 이전 결과를 재사용했습니다.

원본1,663파일, 이전 통합565파일을 대조합니다.7개 공유 상태/문서 이외에는 기존 결과를 바꾸지 않습니다. 이전 단계의 build/verify를 실행해 최신 지도나 manifest를 덮어쓰지 마세요. 새 자연물·기후·경제 자동 채택과 원격 배포는 하지 않았습니다.
