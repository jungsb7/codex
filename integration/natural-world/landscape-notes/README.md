# 대표 30경관 설명·계절 모습 — 후속21

[지도 열기](../unified-atlas/index.html#cell=290975&lon=-22.6171875&lat=45.5859375&zoom=12&draftFamily=forest) · [30곳의 설명·수치](CATALOG.md) · [AI용 구조화 JSON](output/catalog.json)

후속18의 대표 30연속군을 그대로 사용해 개별 설명 초안을 만들었다. 대표점·분류·우선 판정·연속군 크기는 바꾸지 않았다. 기존 권역명과 후보 분류명을 표제로 유지하고, 정식 지명은 새로 붙이지 않았다. 실제 피복 채택은 0건이다.

## 지도에서 읽기

왼쪽 **대표 경관 30곳**에서 선택하면 원본 대표 격자로 이동한다. 오른쪽 정보창에서 기존 입력, 계산 후보, 창작 설명, 계절 대비, 수계·보류 근거를 구분해 읽는다. 기간 선택은 지도 주소의 `period`와 동기화된다. **이 기간의 계절 지도 보기**는 그 기간의 기존 지연 로딩을 켠다.

설명은 정확히 대표 격자에서만 나타난다. 연속군의 다른 격자·해양·기존 호수에 이 설명을 옮겨 붙이지 않는다. 대표점의 고도·12기간 표본을 연속군 전체의 균일한 환경으로 해석하지 않는다. ‘기존 세계 설정만’ 보기에서도 설명의 후보 성격을 명시하며 지도 후보 레이어는 숨긴다.

**설명·근거 JSON**은 현재 대표점의 설명, 선택 기간, 전체 12표본과 출처를 저장한다. 기존 **좌표 자료 JSON 저장**에도 `landscapeDescription`이 포함된다. 비대표점·설명 오류에서는 `null`이다. `landscapeDescription.selectedSeason`은 검증된 작은 설명 자료의 표본이다. 별도 지도 계절 자료의 `season`은 기존 로딩 상태를 따르므로, 계절 기능을 끄면 null이고 로딩 실패 시 수치도 null이다.

## 내용과 출처

- 기존 입력: 원본 격자·경위도·고도. 원래부터 설계 세계 입력이며 실측 지형이라는 뜻은 아니다.
- 계산 후보: 지형·식생·습윤 분류, 기존 대표 연속군과 경고 수, 대표점에 연결된 표시 물길의 상·하류와 종착 상태.
- 창작 초안: `prose.json`의 30개별 문단과 360표본에 대응하는 색조·장면 제안. 물리 출력이나 설정 채택이 아니다.
- 계절 근거: 후속20의 해시 검증된 기간 자료에서 대표점만 추출한다. 기온·강수는 Float32 원본값, 유량은 기존 로그 양자화값을 같은 방식으로 복호화한다. 12기간은 공전 위상이며 지구 달력 월이 아니다.
- 계절 대비는 정확한 최소·최대와 동률 기간 전부를 기록한다. 색조 제안의 상대 강수 구분은 해당 점 범위의 하위/상위 25%이며 우기·건기의 물리 분류가 아니다. 강수 차이 1mm 이하는 표현 차이를 크게 두지 않는다. 영하 표본은 차가운 색조 제안에만 쓰며 실제 눈·얼음 존재를 확정하지 않는다.
- 미정: 실제 숲·습지 면적, 강폭, 침수, 적설 경계, 얼음 두께, 정치·서사 역할은 null이다. 표시 물길 ID가 없는 6대표점은 유량도 null이며, 인접 강의 수치를 가져오지 않는다.

고도 약4549m의 냉대림 후보, 사막 식생과 겹친 습지 후보, 하류 미정 연속군, 습지 후보지만 표시 물길 ID가 없는 대표점도 원본대로 설명했다. 남반구는 실제 표본의 따뜻한 위상을 사용한다. 기존 국가·문화·종교·레온하르트의 출신·역사 배역을 새로 정하지 않았다.

## 로딩·보존

설명 catalog는 224,307바이트(약224KB)이며 작은 manifest로 크기·SHA-256·원본 atlas 버전을 검사한다. 30곳을 모두 둘러봐도 전 대륙의 계절 배열을 요청하지 않는다. 설명 실패는 지도 기능에 영향을 주지 않으며 재시도할 수 있다. 계절 지도의 3기간 캐시·미리 읽기·오류 처리는 그대로다.

기준 main은 `9df7ff0cd9205342f0ee8449c7807a965acaab51`이다. 원본 자연자료·경제·세계관·호수/해안 마스크·수계 연결, 미정1184경계·168576집수격자·23022물길, 원본 약26km와 설계 표시 약3.26km의 구분을 유지했다. 전체 보관 브랜치와 종료한9곳 검토는 변경하지 않았다.

## 재현·검증

저장소 루트에서 실행한다. 생성에는 커밋된 기간 조각만 필요하고, 독립 원본 대조 검사에는 입력 복원이 필요하다.

```sh
node integration/natural-world/landscape-notes/build.cjs
node handoff/restore-inputs.cjs
node --test --test-isolation=none integration/natural-world/landscape-notes/test.cjs integration/natural-world/atlas-experience/test.cjs integration/natural-world/seasonal-loading/test.cjs
node integration/natural-world/landscape-notes/browser-check.cjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright node handoff/browser-check.cjs "$PWD"
node integration/natural-world/seasonal-loading/browser-check.cjs
node integration/natural-world/landscape-notes/package-check.cjs
```

브라우저 도구의 Playwright·Chromium 경로는 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 지정한다. 검증 기록은 이 단계 `validation/`에 둔다. 이전 단계 브라우저 도구 실행 결과는 이 디렉터리에 복사해 회귀검사 시점을 구분한다.

- `model-tests.txt`: 새6검사 + 기존18검사. 30원본 연속군·360표본·정확한 수계·좌표 링크·동률 극값·null을 검증한다.
- `browser-checks.json`: 30선택·360기간 조회·12기간 선택 조작·60실제 JSON 다운로드, 주소 복원, 실제 계절값 일치, 비대표점 해제, HTTP/해시/버전 오류와 재시도, 320/390px 화면을 검사한다.
- `package-checks.json`: 기준 main의 모든 파일을 대조해 허용된 런타임2파일·인계문서3파일 이외의 기존 파일 보존을 검사한다.
- `regression-browser-checks.json`, `seasonal-browser-checks.json`: 기존 지도12검사와 지연 로딩13검사의 이번 회귀 결과. 새10개와 합계35개다.
- `content-review.json`: 30개별 설명의 내용 검토와 모바일6장·데스크톱 상하2장 시각 확인. 수치 검증과 시각 확인을 구분한다. 데스크톱 캡처만 재생성하려면 브라우저 도구에 `--desktop-only`를 전달한다.

기능 커밋 `25525ca79f9de4b807e9b177f945867df845a066`은 [초안 PR #1](https://github.com/jungsb7/codex/pull/1)에 있다. main 직접 갱신은 자동 승인 검토에서 명시적 승인 부족으로 거절됐으며 공개 Pages에는 아직 반영하지 않았다. 위 지도 상대 링크는 해당 브랜치를 로컬 실행할 때 새 기능을 보여 준다. 정확한 반영 상태는 `validation/deployment.json`과 루트 인계 문서를 따른다.
