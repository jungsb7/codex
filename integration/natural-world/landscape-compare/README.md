# 대표 경관 두 기간 비교 — 후속22

[비교 예시 열기](../unified-atlas/index.html#mode=nature&cell=290975&lon=-22.6171875&lat=45.5859375&zoom=12&draftFamily=forest&period=1&comparePeriod=7&seasonal=false) · [기존 30경관 설명](../landscape-notes/CATALOG.md)

기존 대표30경관의 같은 원본 격자에서 두 공전 위상의 기온·강수·후보 유량과 모습 초안을 나란히 읽는다. 기존 설명 자료를 재사용하며 새로운 기후·지형·피복이나 세계관 설정을 생성하지 않는다.

## 사용

1. 왼쪽 **대표 경관 30곳**에서 장소를 선택한다.
2. **두 기간 나란히 비교**를 누르면 지도 아래 비교 화면으로 이동한다. 모바일320/390px에서도 A·B를 두 열로 표시한다.
3. A·B 기간을 선택하거나 **A ↔ B 바꾸기**를 누른다. A는 기존 지도와 설명 정보창의 선택 기간이다. B는 독립적인 비교 기간이다.
4. **A 기간 지도 보기**는 해당 계절 지도를 켠다. **B를 A로 옮겨 지도 보기**는 두 기간의 자리를 교환하고 B였던 기간을 지도에 표시한다.
5. 비교 링크를 복사하거나 비교 JSON을 저장한다. 좌표 JSON에도 `landscapeComparison`이 포함된다.

기존 링크에는 B 기본값7을 적용한다. URL의 `period`와 `comparePeriod`가 두 기간을 보존한다. 같은 기간끼리도 비교할 수 있으며 알려진 수치의 차이는0, 미정 유량의 차이는null이다. 복사 권한이 없으면 수동으로 복사할 수 있는 주소 링크를 안내한다.

## 자료와 해석

- `landscape-notes/output/catalog.json`의 해시·atlas 버전 검증을 통과한 자료만 사용한다. 30대표점, 360표본, 수계 연결·보류 근거·창작 설명·unknown을 원본 그대로 가져온다.
- 차이는 **B − A**이다. 두 표본의 단순 차이이며 시간 추세·기간 사이 누적 강수·실제 하천 방류 변화로 해석하지 않는다. 화면은 소수1자리까지 표시하고 JSON은 원본 정밀도와 차이를 저장한다.
- 기온·강수는 기존 Float32 위상 표본, 유량은 기간 평균을 로그 양자화한 표시값이다. 12기간은 지구 달력 월이 아니다.
- 한 대표 격자의 값이며 연속군 전체가 같은 환경이라는 뜻은 아니다. 색조 설명은 미채택 창작 제안으로 실제 적설·생장·침수·결빙을 계산하지 않는다.
- 표시 물길 ID가 없는6곳의 유량과 차이는null이다. 실제 산림·습지 면적·강폭·침수·얼음 두께·적설 경계·서사 역할도null을 유지한다.
- 해양·기존 호수·다른 육지 격자에서는 비교를 숨기고 JSON에null을 기록한다. 이웃 대표점의 설명을 가져오지 않는다.

## 로딩과 주소

비교 자체는 추가 기후 배열을 요청하지 않는다. B만 바꾸면 비교 DOM과 주소만 갱신하고 지도 렌더링·선택 기간·계절 캐시는 유지한다. A 변경과 지도 보기에서는 기존3기간 캐시·인접 미리 읽기·오류 처리를 사용한다. 설명 catalog 오류 시 비교도 숨기며 기존 다시 읽기 버튼으로 복구한다. 설명의 검증된 표본과 지도 계절 배열의 로딩 상태는 독립적이므로, 지도가 로딩 중이어도 설명 표본을 읽을 수 있다.

## 재현

기준 main: `27f189f7f7983b4a17191ec48b510c12d7ecfc10`. 저장소 루트에서:

```sh
node handoff/restore-inputs.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs integration/natural-world/landscape-notes/test.cjs integration/natural-world/landscape-compare/test.cjs integration/natural-world/seasonal-loading/test.cjs
node integration/natural-world/landscape-compare/browser-check.cjs
node integration/natural-world/landscape-compare/regression.cjs notes
node integration/natural-world/landscape-compare/regression.cjs seasonal
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright node handoff/browser-check.cjs "$PWD"
node integration/natural-world/landscape-compare/package-check.cjs
```

브라우저 경로는 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 지정한다. 이전 브라우저 검사는 출력 경로만 이 단계 `validation/`으로 바꾸고 동일한 검사를 실행한다. 과거 단계 기록을 덮어쓰지 않는다.

`validation/model-tests.txt`는 새4개와 기존24개 자료 검사다. 30곳×12×12의 **4320조합**을 전수 대조한다. `browser-checks.json`은30실제 비교 다운로드, 주소·교환·공유·클립보드 실패·지도 연동·null·오류 복구 검사다. `package-checks.json`은 기준 파일 전체 보존과 허용된 수정 범위, 원본 catalog 해시를 확인한다. 화면 검토와 배포 결과는 같은 디렉터리에 별도로 기록한다.

## 검증 결과

자료28검사와 브라우저47검사(새 비교12 + 기존 설명10 + 계절 로딩13 + 지도12)를 통과했다. 비교4320조합·실제 비교 JSON30개·좌표 JSON·원본 일치·null·오류 복구·링크 복원을 확인했다. `validation/visual-review.json`에는 숲·초원·습지×1500/390/320px의9장 직접 검토 기록이 있다. 이전 기능의 반복 화면 캡처는 중복 저장하지 않고 해당 실행의 검사 JSON만 보존한다.

기준 main의671파일 중665파일이 바이트 동일하며 기존 수정6개는 화면 연동3개와 인계 문서3개다. 원본 catalog SHA-256 `95f7fd1c75b5f39c19d33179cb2dd9e8bb0b7940ce506e2cfbfa0ecd38dbe7c1`은 그대로다. 새 전 대륙 계절 배열은0개다. 커밋·Pages 실행 상태는 [배포 기록](validation/deployment.json)에 기록한다.
