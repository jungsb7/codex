# 101년차 기간별 침수 계산

[지도 열기](index.html) · [결과](REPORT.md) · [기계 판독 요약](output/summary.json)

후속46은 후속40의 기준100년 끝 상태에서 한 해를 실제로 이어 계산한다. 268,857개 원본 육지·호수 격자, 3,232웅덩이, 9,858연결의 수위·저류·교환을 매 단계 계산하고 12기간별 수심·침수 지속·면적·물수지를 제공한다. 채택판의 최종 수면을 계절별로 복사한 자료가 아니다. `natural-canon-v1`의 채택값과 원본 연구 기록은 수정하지 않는다.

## 계산과 해석

- 초기값: 후속40 `reference` 시나리오100년 끝의 눈·토양·지하수·이동 저장과 웅덩이별 표면 저장. 초기 상태·기후·지형·배경 유출·코드 SHA-256은 `output/summary.json`에 고정한다.
- 강수·융설·침투·토양 배수·지하수 반환·증발과 웅덩이 교환은 기존 수식 그대로 이어 계산한다. 168,576개 대상 격자의 육상 저장을 갱신하며, 나머지 배경 유출은 기존 지정 부하를 쓴다. 원본 호수와 해양 마스크·연결을 유지한다.
- 한 해는365일,12등분한 기간이다. 기간당240단계, 연간2,880단계, 약3.04시간 간격이다. 원본12기간 기후를 반복하며 새로운 일별 폭풍 자료를 만들지 않는다.
- 수심은 원본 격자 바닥과 해당 웅덩이 수위의 차이다. 수심1cm 이상을 침수로 센다. 저장량 계산에는1cm 미만 물도 포함한다. 이 문턱은 표시·면적 집계 기준이며 기존 물리 수식을 바꾸지 않는다.
- 기간 끝 면적은 같은 시점의 침수다. 최대 수심 포락선은 서로 다른 시점의 최대값을 합친 영역이므로 동시 침수 면적으로 읽지 않는다. 최소·최대는 기간 시작과 모든 단계 끝을 포함하며, 평균 수심과 잠긴 시간 비율은240개 단계 끝 표본을 쓴다.
- 전 세계 육지 면적 집계와 GeoJSON은 원본 호수209격자를 제외한다. 호수 제방34격자는 원래 육지이므로 포함한다. 격자 면적은 위도에 따른 원본 구면 면적을 사용한다.
- 1,184집수권과 배경·원본 호수의 기간 장부를 제공한다. 23,022물길의 링크는 집수권 장부이며 개별 물길 유량을 새로 계산했다는 뜻이 아니다. 개별 유량은 `null`이다. 웅덩이 연결별 양방향 교환은 별도 `exchange` 조회다.
- 출력 상태는 `simulated-continuation`, `modelYear:101`, `worldReferenceModified:false`, `actual:null`이다. 12→1 전환은 이 계산연도의 처음으로 돌아간다. 평형 연주기나102년차 계산을 뜻하지 않는다.

## 지도와 AI 조회

통합지도 **침수 변화** 탭에서 기간 끝 수심, 잠긴 시간 비율, 기준100년 끝 대비 침수·퇴수, 최대 수심 포락선을 선택한다. 지점을 클릭하면12기간 표와 기간 장부를 조회하고 JSON·집수권 GeoJSON을 내려받는다. 120/240단계의 침수 분류가 다른 지점은 황색으로 표시하며 수심·잠긴 비율을 함께 비교한다.

저장소 루트에서:

```sh
node integration/natural-world/seasonal-inundation/query.cjs cell 310879 1
node integration/natural-world/seasonal-inundation/query.cjs series 310879
node integration/natural-world/seasonal-inundation/query.cjs budget D298591 3
node integration/natural-world/seasonal-inundation/query.cjs budget world 3
node integration/natural-world/seasonal-inundation/query.cjs reach 48 3
node integration/natural-world/seasonal-inundation/query.cjs exchange 0 1
node integration/natural-world/seasonal-inundation/query.cjs geojson D298591 3 end
node integration/natural-world/seasonal-inundation/query.cjs geojson D298591 3 envelope
```

브라우저와 CLI는 같은 `core.js`를 쓴다. 매니페스트의 크기와 SHA-256을 검증한 뒤 자료를 읽는다. 잘못된 자료는 오류를 내고 오래된 값의 내보내기를 막는다. 원본 격자 자료는 기존 `cover-boundary-model/output/base.json.gz`를 재사용한다.

## 재현과 검사

Node24 및 같은 버전의 공식 Node 헤더, g++가 필요하다. 아래 `NODE_HEADERS`는 설치된 헤더 디렉터리로 바꾼다. 이전 모델의 build/prepare 스크립트는 실행하지 않는다.

```sh
node integration/natural-world/pond-network-model/compile.cjs NODE_HEADERS /tmp/pond-network.node
node integration/natural-world/seasonal-inundation/compile.cjs NODE_HEADERS /tmp/seasonal-inundation.node
node integration/natural-world/seasonal-inundation/run.cjs
node integration/natural-world/seasonal-inundation/build.cjs
node --test --test-isolation=none integration/natural-world/seasonal-inundation/test.cjs
WATER_NATIVE=/tmp/seasonal-inundation.node node --test --test-isolation=none integration/natural-world/pond-network-model/test-engine.cjs
node integration/natural-world/seasonal-inundation/browser-check.cjs
```

60/120/240단계를 각각 계산한다. 캐시는 `/tmp/inundation-46`이며 코드·입력·실행 파일 지문이 같을 때만 재사용한다. `INUNDATION_CACHE`, `INUNDATION_NATIVE`, `WATER_NATIVE`로 경로를 바꿀 수 있다. 브라우저 검사는 이 환경의 Chromium·Playwright 경로를 사용한다. 원본 지도·정설·상태 UI 회귀 스크립트도 이 폴더에 별도로 두어 이전 검증 기록을 덮어쓰지 않는다.

## 남은 한계

경계 해상도는0.234375°(남북 약26km)다. 격자 내부의 세부 침수 경계나 개별 홍수 사건, 숲·습지·지류의 미세 경계, 빙하 이동, 지형·식생·빙설·하도 유량 전체 피드백과 지하 통로 압력은 아직 구현하지 않았다. 새로운 고해상도 지형을 만든 결과로 해석하지 않는다.

기간당120→240단계 비교는 동일한100년 끝 초기값에서 **다음1년**의 수치 민감도를 확인한다. 초기값 자체의 후속40 수치 한계(48경계의 세분화 차이1% 초과)를 없애지 않는다. 전 세계 침수 면적 차이가 작아도 개별 지점의 잠긴 시간 비율 차이는 최대18.75%p이므로 모든 지점이 수렴했다고 주장하지 않는다. 정설 채택과 원래 요구 전체 완료는 계속 구분한다.
