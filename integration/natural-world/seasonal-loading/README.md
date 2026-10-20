# 기간별 계절 로딩과 대표 12경관 점검 — 후속20

[지도 열기](../unified-atlas/index.html#mode=season&period=4&cell=351118) · [전후 144장 비교](REVIEW.html) · [대표 지점](samples.json)

기존 전체 기후·수계 41,379,030바이트 대신 선택 기간을 먼저 읽는다. 첫 선택의 최악 조건은 **5,599,964바이트**, 인접 두 기간과 선택 지점의 12기간 그래프까지 포함한 보수적 상한은 **9,471,804바이트**다. 기존 기본 지도 파일은 두 수치에서 제외했다. MB는 1,000,000바이트다.

## 자료와 로딩

- 기준 main: `c3e35086a1cbdde37424225d117eb412d56fec83`. 이전 배포 manifest는 `validation/prior-deployment-manifest.json`에 보존했다.
- 기간 파일 12개: 268,857격자의 기온·강수 Float32 원본 비트와 45,824물길의 기존 UInt16 로그 유량 코드를 저장한다. 기온·강수는 위상 표본, 유량은 기간 평균이며 달력 월이 아니다. 유량 복호화는 이전과 같은 `Float32(expm1(code/2048))`다.
- 공통 강수 최소·최대와 수계 연결 메타데이터는 별도다. 수계 개체 조회만으로는 계절 배열을 읽지 않는다. 생략한 중복 표시 필드는 원본 수계 입력과 기존 지도에 그대로 있다. 모든 하류·상류·종착점·집수면적, 기존 본류와 호수 정보는 유지했다.
- 선택 지점의 연중 강수 그래프는 2,048격자 단위 블록 한 개(최대 89,857바이트)만 읽는다. 지도는 3기간 LRU 캐시, 그래프는 현재 블록 하나를 보관한다. 선택 기간 다음에 인접 두 기간을 순차 미리 읽는다.
- 기간 변경은 이전 요청을 취소하고 선택 번호도 검사한다. 현재 기간 준비 전에는 기존 배경과 대기 안내를 보이고 수치는 `null`이다. 이전 기간 수치가 새 기간 이름으로 나타나지 않는다. 그래프 실패는 지도 성공과 구분한다.
- 모든 압축 자료의 크기·SHA-256, 압축 해제 크기, atlas 원본 해시·격자 순서·세계 버전·수계 대응을 검사한다. HTTP 실패·해시 불일치·자료 목록 실패·버전 불일치를 명시하고 재시도한다. 실패한 사전 로드는 현재 선택을 실패로 바꾸지 않는다.
- 새로고침·뒤로 가기·JSON 저장은 같은 선택 기간과 좌표를 따른다. 아직 읽지 않은 유량을 0이나 연평균값으로 저장하지 않는다.

## 경관 점검과 수정

`samples.json`은 자연 11권역 각 1곳과 기존 호수 1곳의 이름·원본 격자·좌표·선정 이유·실제 후보 분류를 고정한다. 각 지점에서 12/24/32배, 데스크톱 1500px·모바일 390px를 비교했다. `validation/before/`, `validation/after/`의 각 72장은 원래 PNG와 픽셀 일치를 검증한 무손실 WebP다. 비교 화면에서 각 원본을 열 수 있다.

| 발견 사항 | 처리 |
|---|---|
| 미세 지류와 계곡 음영이 초원·숲·해안을 과도하게 채움 | 모든 원본 선·끝점·선별 규칙을 유지하고 5/50m³/s 미만 지류의 대비를 낮춤. 계곡 음영은 50m³/s 이상에 적용 |
| 둥근 표시 물길과 원래 꺾인 경로의 클릭 판정이 다름 | 렌더링·선택 강조·클릭 판정에 같은 표시 경로 사용 |
| 타일 테두리의 등고선 공백과 보간 가장자리 | 1표본의 이웃 여백을 생성하고 내부를 잘라 표시. 경계 양쪽의 동일 세계 좌표를 같은 값으로 계산 |
| 선택 십자선과 지명, 우측 지도 조작부 겹침 | 지명 충돌 검사에 선택점과 조작부 영역 포함 |

산림·습지 패치는 원래 후보와 보류 마스크 안에서 유지한다. 원본 해안·호수의 계단 모양과 일부 수계의 직각 형태, 보류 격자의 보라색 사선은 근거 자료의 표현이다. 이를 매끄러운 새 물리 경계로 바꾸지 않았다. 서부 사막권의 대표점은 원본 분류상 초원 후보이므로 ‘건조 전이’라고 기록하며 사막 피복을 확정하지 않는다.

## 검증과 측정

- `validation/model-tests.txt`: 기존 12개 + 새 자료 6개 검사. 기온·강수 전체 3,226,284개씩, 후보 유량 549,888개, 연중 그래프·강수 범위·수계 연결을 전수 대조.
- `validation/browser-checks.json`: 지연 응답·HTTP/해시/manifest/metadata/그래프 오류·재시도·캐시·주소·모바일 동작 검사.
- `validation/regression-browser-checks.json`: 기존 자연물·계절·표시·JSON·모바일 브라우저 12개 회귀검사.
- `validation/quality-checks.json`: 72화면의 원본 격자·후보 숨기기·실제 표시선 선택, 12곳의 좌표/자연물/계절 JSON 일치, 타일 여백 일치.
- `validation/benchmark.json`: 같은 로컬 HTTP·Chromium·화면 크기·HTTP 캐시 비활성 조건에서 구현별 3회 측정. 최초 준비·연중 그래프·인접 미리 읽기·전환 시간과 GC 후 JS heap/backing storage를 별도 기록한다. 실제 인터넷·모바일 기기의 속도 보장은 아니다. 캐시 밖의 기간 전환은 추가 요청을 하므로 전체를 이미 읽었던 이전 구현보다 느릴 수 있다.
- `validation/package-checks.json`: 현재 변경 목록, 기준 파일 보존, 자료·상대 경로·해시 검사.
- `validation/deployment.json`: 기능 커밋의 main 반영 및 Pages 결과. 실제 공개 도메인 접속 여부는 별도 기록.

## 같은 환경의 측정 결과

| 항목(3회 중앙값) | 이전 | 현재 |
|---|---:|---:|
| 첫 선택 기간 표시 | 3.60초 | 1.20초 |
| 연중 그래프 포함 준비 | 3.60초 | 1.27초 |
| 인접 미리 읽기까지 실제 요청 본문 | 41.38MB | 9.44MB |
| GC 후 JS heap 추가 사용 | 19.00MB | 7.93MB |
| GC 후 backing storage 추가 사용 | 39.76MB | 9.25MB |
| 인접 2기간 전환 | 356ms | 367ms |
| 캐시 밖 7기간 전환 | 354ms | 719ms |
| 2기간으로 재방문 | 43ms | 652ms |

현재의 재방문은 제한 캐시와 인접 미리 읽기로 해당 기간이 제거되었을 수 있다. 첫 로딩·보관 메모리를 줄이는 대신 캐시 밖 전환에서 추가 요청을 한다. 메모리 값은 Chromium의 해당 heap/storage 지표이며 전체 프로세스 RSS가 아니다. 개별 실행 원자료는 [측정 기록](validation/benchmark.json)에 있다.

## 재현

저장소 루트에서:

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/seasonal-loading/build.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs integration/natural-world/seasonal-loading/test.cjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright node handoff/browser-check.cjs "$PWD"
node integration/natural-world/seasonal-loading/browser-check.cjs
node integration/natural-world/seasonal-loading/quality-check.cjs
node integration/natural-world/seasonal-loading/capture.cjs before
node integration/natural-world/seasonal-loading/capture.cjs after
python3 integration/natural-world/seasonal-loading/review.py
node integration/natural-world/seasonal-loading/benchmark.cjs
```

브라우저 도구는 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 실행 위치를 지정할 수 있다. `before` 캡처·벤치마크는 위 기준 커밋의 런타임 파일을 읽으므로 해당 Git 이력이 필요하다. 입력 복원·기간 패키지 생성·자료 검사는 커밋된 입력으로 재현된다. `review.py`는 Pillow가 필요하다. 벤치마크는 다른 브라우저 검사와 동시에 실행하지 않는다.

미정 경계 1,184곳·관련 집수권 168,576격자·하류 미정 23,022구간, 실제 숲/습지 피복·강폭·침수·결빙의 `null`을 유지한다. 새 물리 DEM·경제·세계관 변경 및 앞선 9곳 수문 검토 재개는 없다.
