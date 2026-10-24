# 채택 기준과 미완료 범위 표시 — 후속45

사용자가 “여전히 미정인 것들이 많은 거 같은데”라고 지적했다. 기존 주소의 `mode=review`는 연구 플래그를 보여 주지만, `natural-canon-v1` 채택 후에도 ‘보류/미정’이 현재 설정과 구분되지 않았다. 또한 기준값을 채택했다고 해서 격자 내부의 상세 경계나 전체 물리 연동까지 구현된 것은 아니다. **이번 변경은 상태 설명과 조회의 정정이며, 남은 물리 계산을 새로 해결한 작업이 아니다.**

[범위 목록 화면](index.html) · [채택 규칙](../../../worldbuilding/NATURAL_CANON_V1.md) · [현재 기준 지도](../unified-atlas/index.html#mode=canon)

## 표시와 조회

- 모든 통합지도 모드의 선택 지점 정보에 현재 채택 피복·격자 면적·적용 가능한 집수권 기준 장부를 표시한다. 기존 연구 플래그·보류 기록은 유지한다.
- ‘현재 기준 v1’ 탭을 첫 번째로 배치한다. 기존 연구 URL을 강제로 전환하지 않는다. 같은 지점의 현재 기준 버튼은 좌표·확대·기간을 보존한다.
- 기준판의 미처리0은1,184집수권·23,022구간100년 장부를 뜻한다. 하도 유량·세부 침수·지형 변화까지 결합해 해결했다는 뜻이 아니다.
- 아직 남은 구현을 항상 별도 카드로 표시한다. 상단 버튼으로 바로 이동할 수 있으며 공유 주소를 바꾸지 않는다.
- 상세 목록은 물길, 피복, 침수, 강폭·빙설, 집수권 결합, 개별 화산의6분야를 구분한다. 48경계의 수치 세분화 한계도 기존 보고서에 근거해 명시한다.
- 기존 canonical base를 SHA-256 검증 후 공유한다. 여러 화면의 요청이 겹쳐도 같은 로딩 작업을 재사용한다. 오류 시 현재 채택값을 꾸며내지 않고 다시 읽기를 제공한다.

```sh
# 전체 범위 목록
node integration/natural-world/natural-status/query.cjs
# 특정 지점의 현재 채택과 원본 연구 플래그 및 남은 범위
node integration/natural-world/natural-status/query.cjs 310879
```

상태 형식은 `natural-scope-status/1`. `worldReferenceAdopted=true`와 `allRequestedDetailImplemented=false`를 함께 제공한다. `selected`는 검증된 기준 자료가 있을 때만 제공한다. 해양·대상 집수권 밖에는 완료 물량0을 임의로 부여하지 않는다. `oldHoldIsCurrentAdoptionStatus=false`는 원본 보류 플래그가 현재 채택 상태가 아니라는 뜻이다.

통합지도 연구/현재 기준 JSON에도 `scopeStatus`를 추가했다. 원래 지점·경로·물수지 값은 변경하지 않는다. `natural-canon-v1/query.cjs`의 기존 계산 조회 API도 그대로다. 새로운 범위·상태 조회는 이 디렉터리의 API를 사용한다.

## 검증·재현

```sh
node --test --test-isolation=none integration/natural-world/natural-status/test.cjs
node integration/natural-world/natural-status/browser-check.cjs
node integration/natural-world/natural-status/canon-regression.cjs
node integration/natural-world/natural-status/atlas-regression.cjs
```

새 조회3검사에서268,857격자 전체의 채택 분류·보류플래그 보존·장부 적용 범위를 비교한다. 새 브라우저8검사와 기존 확정판12·연구 지도12검사를 실시했다. 선택 유지, JSON4다운로드, 오류/재시도, 1440/1024/390/320px를 확인한다. 회귀 실행 결과는 `/tmp/natural-status-canon45`, `/tmp/natural-status-atlas45`에 저장하며 해당JSON을 이 디렉터리 `validation/`에 복사했다.

[화면 검사](validation/browser-checks.json) · [현재 기준 회귀](validation/canon-regression.json) · [원본 지도 회귀](validation/atlas-regression.json) · [조회 검사](validation/query-tests.txt) · [보존 검사](validation/preservation.json). 채택된 수치·경계·형상 및 후속40~44 계산 파일은 바이트 단위로 보존한다.

## 배포

기준main `c9227d58b8cfa4c7ea2997ff1d434301cf954987`. 실제 게시·Pages 결과는 [deployment.json](validation/deployment.json)과 PR 본문에 기록한다. 공개 Pages 호스트에 대한 직접 HTTP 확인은 환경 네트워크 허용목록 밖이며, 로컬 Chromium 검사와 GitHub Pages 작업으로 확인한다.
