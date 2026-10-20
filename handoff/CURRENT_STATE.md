# GitHub에서 이어가는 Planet Atlas

큰 ZIP 재업로드 대신 **이 저장소의 최신 main과 루트 NEXT_SESSION_PROMPT.txt**를 작업 시작점으로 사용한다. 이 문서는 후속19 완료 상태를 기록한다. 다음 목표는 [NEXT_GOALS.md](NEXT_GOALS.md)에 있으며 미착수 제안이다.

## 현재 완료

- 전 대륙268857개 육지·기존호수 격자, 자연11권역 통합 지도.
- 12기간 기온·강수·상대강수 및 후보유량 표시.
- 기존27개 선형 자연물(산계16·주요강7 포함), 물길후보45824구간 선택 정보창.
- 12배 이상 자연/지형/식생 보기의 보간 음영·등고선·계곡·숲/습지 패치. 명목3.26km 설계 표시이며 원본 약26km 물리자료를 변경하지 않는다.
- 경관 후보6528연속군·대표30곳 초안. 실제 피복 채택0건.

기능 기준 커밋: `376f07e035f771d2ddc4554011ca3e8bba115e83`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39357485994)의 build/deploy 성공. [지도](https://jungsb7.github.io/codex/integration/natural-world/unified-atlas/index.html).

49검사와 원본1663파일 보존은 **당시 검증 기록**이다. [validation/final-checks.json](validation/final-checks.json), [배포 기록](validation/deployment.json)을 보존했다. 현재 원격 main은 이 인계 문서 추가 등으로 위 기능 커밋보다 새로울 수 있다.

## ZIP 없이 재현

```sh
git clone --depth 1 https://github.com/jungsb7/codex.git
cd codex
node handoff/restore-inputs.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

열 주소: `http://127.0.0.1:8000/integration/natural-world/unified-atlas/index.html`. 정적 지도 실행에는 입력 복원이 필요 없다. 복원은 개발·자료 검사에 필요하다.

복원 스크립트는 이미 커밋된 기후4조각·수계2조각을 읽고 합친gzip과 압축해제JSON의 원본SHA-256을 확인한다. 원본 계절 입력도 정확한 직렬화와 해시를 확인한다. 복원 대상5파일은 재생성 가능하므로 Git에서 제외한다. 이미 존재하는 내용이 다르면 중단하며 덮어쓰지 않는다. 원본 계절파일의 뒤에 줄바꿈을 추가하면 원본 바이트 해시가 달라지는 점에 유의한다.

복원 가능한 자료:

| 자료 | 저장소 안 근거 | 개발 시 복원 위치 |
|---|---|---|
| 전체12기간 기온·강수 | climate 분할bin 및 sources.json | stage2/inputs/seasonal.json |
| 기후·지질 진단 | 같은 climate 분할bin | stage2/output/diagnostics.json |
| 수계 연결·구간·12기간 표시유량 | water 분할bin | stage3/output/waterways.json |
| 원본gzip2개 | 동일 조각 합치기 | stage5/output/*.json.gz |

위 표의 상대 경로는 `integration/natural-world/` 기준이다. 원본 고정자료와 계절지도입력을 새로 계산하지 않는다. 다른 기존 공개 패키지도 저장소에 보존되어 있다.

## 브라우저 검사

Playwright 및 Chromium을 준비한 뒤 저장소 루트에서:

```sh
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright CHROMIUM_PATH=/usr/bin/chromium node handoff/browser-check.cjs "$PWD"
```

환경변수를 생략하면 `require('playwright')`, `/usr/bin/chromium`을 사용한다. 이 도구는 `/codex/` 경로로 로컬 서버를 열고 새기능12개 검사를 실행한다. 새 실행 결과는 `handoff/local-validation/`에 남기며 `handoff/validation/`의 과거 기록을 덮어쓰지 않는다. 원본 단계의 build/package/record 스크립트는 별도 전체소스 경로를 전제로 할 수 있으므로 무작정 실행하지 않는다.

## 저장소 범위와 보존 규칙

이 Git 저장소는 **현재 배포본과 다음 계절 경량화·표시 개선에 필요한 자료**를 제공한다. 전체2.4GB 과거 연구·모든 원본 앱 개발파일·모든 경제장부 재계산 입력을 전부 Git에 옮긴 것은 아니다. 전체 인수인계 ZIP은 별도 보관용이며 이번 다음 목표에는 필요 없다. 범위가 옛 경제모형이나 특정 물리연구의 전체 재실행으로 바뀌면 필요한 입력이 저장소에 있는지 먼저 확인한다.

미정 경계1184곳·집수권168576격자·물길23022구간의 실제 저류/침투/넘침은 미정이다. 실제 강폭·피복면적·침수·결빙도 null을 유지한다. 앞선9곳 국지 검토는 종료되어 새 필수 연구로 재개하지 않는다. 기존 설정/계산 후보/추가 설계 표시를 구분한다.

## GitHub 인계 재현 확인

이번 인계 전환에서 저장소 자료만으로 입력5파일의 바이트 일치를 검증하고 자료12검사·브라우저12검사를 다시 통과했다. 결과: [입력 복원](validation/repository-input-restore.json), [자료 검사](validation/repository-model-tests.txt), [브라우저 검사](validation/repository-browser-checks.json). 당시 후속19의49검사 기록과 구분한다.

## 다음 인계 갱신 방식

작업마다 이 문서와 루트 시작 안내에 완료 범위, 새 검증 결과 경로, 관련 커밋·Pages 결과, 미정과 다음 목표를 갱신한다. 새 기능의 source/검사 도구와 필요한 입력의 복원 경로를 함께 커밋한다. 큰 캐시·중복gzip·전체 ZIP을 매번 저장소에 넣지 않는다. 원격 최신 HEAD를 확인하고 변경 목록을 검토한 뒤 갱신한다.
