# 전 대륙 함몰부 우선 검토

[수계 검증 지도](../unified-atlas/index.html#mode=drainage) · [비교 보고서](REPORT.md) · [전역 요약](output/summary.json)

수계 검증 보기의 왼쪽 **함몰부 우선 검토**에서 1,184곳을 비교합니다. 연간 경계 유입량 또는 최저점부터 출구까지의 상승고로 정렬하고, 다음 함몰부·수위 결합·기후 공백·기존 연구 조건으로 좁힐 수 있습니다. 구역 ID와 권역 검색, 10곳씩 보기, 자연 권역 선택을 지원합니다. 목록의 유입 순위는 항상 전역 기준이며 권역은 대표점 기준입니다.

목록에서 구역을 선택하면 대표점으로 이동합니다. 오른쪽에서 **출구 연결 가설 보기**를 눌러 원본 격자에서 검토한 접근 경로와 다음 경계까지의 가설을 주황색 점선으로 볼 수 있습니다. 현재 채택된 하천이 아니며 기본값은 숨김입니다. 기존 수계 그래프는 그대로 두고, 함몰부 내부의 실제 물길은 여전히 미정입니다.

좌표 JSON 저장은 기존 자연정보·수계 검사와 함께 `retentionReview`를 담습니다. 선택 지점 자체가 아니라 그 지점의 하류 종착 함몰부에 관한 정보임을 `scope`에 표시합니다. 해양 연결 집수권에서는 이 항목이 null입니다.

유입량은 원본 12기간 경계 장부의 합계입니다. 서로 겹치지 않는 기존 종착 집수권을 비교하며, 연결 가설에 따라 하류 유입을 새로 누적하지 않습니다. 1,184곳을 실제 호수로 채택하거나 수면·저류·증발·침투·방류를 확정하지 않습니다. 기존 고온 PET·극지 수분 공백과 국지 연구 보류를 유지합니다.

프로젝트 전체 인계 폴더에서 재현합니다. 이 build는 이 폴더의 output만 갱신하며 과거 단계의 build/record를 호출하지 않습니다.

```sh
node integration/natural-world/retention-priority/build.cjs
node --test --test-isolation=none --test-reporter=tap integration/natural-world/retention-priority/test.cjs integration/natural-world/hydrology-audit/test.cjs integration/natural-world/unified-atlas/core.test.cjs integration/natural-world/pages-release/navigation.test.cjs
node integration/natural-world/retention-priority/browser-check.cjs
node integration/natural-world/retention-priority/audit-browser.cjs
node integration/natural-world/retention-priority/regression-browser.cjs
```

표시 자료는 약0.44MB이며 수계 검증을 열 때 추가로 읽습니다. 생성 입력의 세계·geometry·기존 지도·수계 해시를 기록합니다. 상세 과학 입력은 전체 인계 폴더에 있으며 공개 사이트에는 지도 실행 자료와 검사 요약을 제공합니다.
