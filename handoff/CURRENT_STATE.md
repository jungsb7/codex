# GitHub에서 이어가는 Planet Atlas

큰 ZIP 재업로드 대신 **이 저장소의 최신 main과 루트 NEXT_SESSION_PROMPT.txt**를 작업 시작점으로 사용한다. 이 문서는 후속21 구현·검증 완료와 main 반영 대기 상태를 기록한다., [NEXT_GOALS.md](NEXT_GOALS.md)는 이후 별도 제안이다.

## 후속21 구현·검증 완료 / 반영 대기 — 2026-10-20

기능 커밋: `25525ca79f9de4b807e9b177f945867df845a066`. [초안 PR #1](https://github.com/jungsb7/codex/pull/1), 브랜치 `codex/landscape-notes-30`. main 직접 갱신은 자동 승인 검토에서 명시적 승인 부족을 이유로 거절됐다. main은 후속20 상태이며 후속21의 공개 Pages 배포는 하지 않았다. 사용자 승인 후 반영·배포를 확인해야 한다. [정확한 상태 기록](../integration/natural-world/landscape-notes/validation/deployment.json).

- 기존 대표30연속군의 개별 설명 초안, 원본 좌표·고도·후보 지형/식생·수계 연결·연속군 보류 근거를 연결했다.
- 30대표점×12기간의 기온·강수·유량 표본과 계절 색조 제안을 제공한다. 대표 한 점의 값과 연속군 전체를 구분한다.
- 지도 **대표 경관 30곳** 선택·정보창·기간 비교·계절 지도 연결·설명/좌표 JSON 저장을 구현했다. 설명만 탐색할 때 전 대륙 계절 배열은 요청하지 않는다.
- 기존 권역/분류명을 표제로 유지하고 새 고유 지명·정치/문화/서사 설정은 정하지 않았다. 실제 피복 채택0건, 실제 면적·강폭·침수·결빙 등은 null이다.
- 설명 자료 약224KB에 크기·해시·지도 버전 검증과 실패 재시도를 적용했다. 기존3기간 캐시·모바일 접근성을 유지한다.

[사용·재현·검증](../integration/natural-world/landscape-notes/README.md) · [30설명](../integration/natural-world/landscape-notes/CATALOG.md) · [AI용 구조화 자료](../integration/natural-world/landscape-notes/output/catalog.json).

검증 기록은 `integration/natural-world/landscape-notes/validation/`에 있다. 자료24검사(새6+기존18), 원본360표본·30연속군·수계·null 대조를 통과했다. 브라우저35검사(새10+기존25), 30선택·360기간 조회·60실제 JSON 저장·320/390px 표시·오류 복구를 통과했다. 30개별 문단과 모바일6장·데스크톱2장을 검토했다. 기능 커밋과 Pages 결과는 이 단계 `validation/deployment.json`에 기록한다.

## 후속20 완료 — 2026-10-20

- 기간별 계절 로딩: 첫 선택 최대5.60MB(기존41.38MB), 인접 두 기간과 그래프 포함 상한9.47MB. 기온·강수·후보유량 전수 일치.
- 3기간 캐시·인접 미리 읽기·취소 및 늦은 응답 방지, HTTP/해시/목록/그래프 오류·재시도·새로고침·뒤로 가기 대응.
- 자연11권역+기존호수의 12대표 경관: 12/24/32배·데스크톱/390px 전후144장, 물길 대비·표시선 클릭·타일 이웃 여백·지명 겹침 개선.
- 자료18검사·브라우저25검사·경관72조건·12곳 JSON 일치. 원본·경제·세계관·미정 상태 유지.

기능 커밋: `3b17bb97ead2457ee811c1db73587856ca7e8533`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39374199800)의 build/deploy 결과와 실제 도메인 접속 제한은 [배포 기록](../integration/natural-world/seasonal-loading/validation/deployment.json)에 구분한다. 인계 문서 커밋은 기능 커밋보다 최신일 수 있다.

[구현·재현·성능](../integration/natural-world/seasonal-loading/README.md) · [12경관 점검표](../integration/natural-world/seasonal-loading/QUALITY.md) · [전후 비교](../integration/natural-world/seasonal-loading/REVIEW.html) · [자료 검사](../integration/natural-world/seasonal-loading/validation/model-tests.txt) · [패키지·보존 검사](../integration/natural-world/seasonal-loading/validation/package-checks.json).

로컬 3회 중앙값의 첫 계절 표시3.60초→1.20초, 추가 JS heap19.00MB→7.93MB, backing storage39.76MB→9.25MB. 전체 프로세스 RSS나 실제망 속도 보장이 아니다. 캐시 밖 전환은 추가 요청 때문에 이전 전체 선로딩보다 느릴 수 있다.

## 후속19까지 완료한 기반 기능

- 전 대륙268857개 육지·기존호수 격자, 자연11권역 통합 지도.
- 12기간 기온·강수·상대강수 및 후보유량 표시.
- 기존27개 선형 자연물(산계16·주요강7 포함), 물길후보45824구간 선택 정보창.
- 12배 이상 자연/지형/식생 보기의 보간 음영·등고선·계곡·숲/습지 패치. 명목3.26km 설계 표시이며 원본 약26km 물리자료를 변경하지 않는다.
- 경관 후보6528연속군·대표30곳 초안. 실제 피복 채택0건.

후속19 당시 기능 기준 커밋: `376f07e035f771d2ddc4554011ca3e8bba115e83`. [Pages 실행](https://github.com/jungsb7/codex/actions/runs/39357485994)의 build/deploy 성공. [지도](https://jungsb7.github.io/codex/integration/natural-world/unified-atlas/index.html).

49검사와 원본1663파일 보존은 **당시 검증 기록**이다. [validation/final-checks.json](validation/final-checks.json), [배포 기록](validation/deployment.json)을 보존했다. 현재 원격 main은 이 인계 문서 추가 등으로 위 기능 커밋보다 새로울 수 있다.

## ZIP 없이 재현

```sh
git clone --depth 1 https://github.com/jungsb7/codex.git
cd codex
node handoff/restore-inputs.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs integration/natural-world/seasonal-loading/test.cjs
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

환경변수를 생략하면 `require('playwright')`, `/usr/bin/chromium`을 사용한다. 이 도구는 `/codex/` 경로로 로컬 서버를 열고 기존 기능12개 회귀검사를 실행한다. 후속20의 지연 로딩13검사와 경관 검사는 해당 단계 README의 명령을 따른다. 새 실행 결과는 `handoff/local-validation/`에 남기며 `handoff/validation/`의 과거 기록을 덮어쓰지 않는다. 원본 단계의 build/package/record 스크립트는 별도 전체소스 경로를 전제로 할 수 있으므로 무작정 실행하지 않는다.

## 저장소 범위와 보존 규칙

현재 main은 배포본·개발 입력·세계관 원문·최신 인계 문서를 제공한다. **제공된 원본 폴더 전체 3,044개 파일, 2,480,165,475바이트**는 별도 `archive/full-handoff-20261020` 브랜치에 보관했다. 구 v0.107 행성 시뮬레이터 실행 HTML·개발 소스·역사 기록·검증 자료와 캐시도 포함한다. [전체 보관 범위와 복원](FULL_ARCHIVE.md)을 참고한다. 원본 폴더에 없던 과거 버전을 추가 수집한 것은 아니다. 큰 ZIP을 채팅에 다시 업로드할 필요 없이 GitHub에서 복원한다.

미정 경계1184곳·집수권168576격자·물길23022구간의 실제 저류/침투/넘침은 미정이다. 실제 강폭·피복면적·침수·결빙도 null을 유지한다. 앞선9곳 국지 검토는 종료되어 새 필수 연구로 재개하지 않는다. 기존 설정/계산 후보/추가 설계 표시를 구분한다.

## GitHub 인계 재현 확인

이번 인계 전환에서 저장소 자료만으로 입력5파일의 바이트 일치를 검증하고 자료12검사·브라우저12검사를 다시 통과했다. 결과: [입력 복원](validation/repository-input-restore.json), [자료 검사](validation/repository-model-tests.txt), [브라우저 검사](validation/repository-browser-checks.json). 당시 후속19의49검사 기록과 구분한다.

## 다음 인계 갱신 방식

작업마다 이 문서와 루트 시작 안내에 완료 범위, 새 검증 결과 경로, 관련 커밋·Pages 결과, 미정과 다음 목표를 갱신한다. 새 기능의 source/검사 도구와 필요한 입력의 복원 경로를 함께 커밋한다. 큰 캐시·중복gzip·전체 ZIP을 매번 저장소에 넣지 않는다. 원격 최신 HEAD를 확인하고 변경 목록을 검토한 뒤 갱신한다.
