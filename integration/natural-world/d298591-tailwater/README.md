# D298591 출구 하류 근거 — 후속27

[화면](index.html) · [결과](REPORT.md) · [요약 JSON](output/summary.json)

출구301657에서 첫 해양352309까지62원본 격자의 경로·고도·기존 유량을 추적한다. **실제 하류 수위·잠김·방류는 결정하지 않았다. 실제 해결0구간·미정23,022구간 유지.** 후속26의108하류 수위 조건 보류와14우회 상한 중단을 그대로 둔다.

## 근거와 해석

원본 지형은 관측 DEM이 아니라 이 세계의 지형 생성 결과다. 경로62셀 전부가 기존 설계 하천 `west-main`과 겹친다. 원본 코드는 하천 중심선을 내리막으로 만들며, 첫20구간의 약0.05m씩 하강하는 패턴은 `previous-.05` 최소 하강 규칙과 일치한다. 487.056km에서1m 하강하므로 실제 하상 경사·마찰 경사로 해석하지 않는다.

원본 `width_km:65`에 지형 축척 `.447`이 적용된29.055km는 주변 지형을 가공하는 골짜기 폭 변수다. 실제 하폭·둑 위치·월류 폭이 아니다. [보존한 코드 발췌·해시](inputs/source-audit.json)는 아카이브의 `app.js`33,74–81행, `geography.js`3,31–33행 및 stage3 생성 코드를 포함한다. 전체 파일은 기존 아카이브에 보존하며 main에 다시 넣지 않는다.

원본 수계의 receiver를 따라가며 호수·미정 저지 노드 없이 첫 바다에 도달한다. 이 연결은 지형 그래프의 경로이지 D298591의 실제 배수 가능성을 증명하지 않는다. 원본 D298591 대표 노드303204의 receiver는 여전히−1이다. 38경로 연결은 기존 하천 중심선 고정 기록을 가진다.

## 기존 유량 장부

해양352309로 현재 연결되는621원본 발생 셀만 수집했다. D298591의619셀과 서로 겹치지 않는다. 원본 지역 유출의 인접 공전 위상 평균 `(q[k]+q[(k+1)%12])/2`를 canonical별로 모아 원본 그래프를 따라 합산한다. 아카이브의 배정밀도 유량 장부와 전 노드·12기간이 일치한다. 지도에 쓰이는 로그 u16 유량은 표시용 양자화 값이므로 정밀 장부와 구별한다.

선택 지점의 장부는 `직전 경로 기본 유량 + 이 셀 발생량 + 다른 상류 경로 합류량 = 현재 기본 유량`이다. 첫 지점은 직전 경로항0이고 모든 기존 상류 입력이 합류항에 들어간다. 전체 경로의 지점 유량을 더하면 같은 물을 여러 번 세므로 합산하지 않는다. 12기간은 공전 위상이며 지구의 달력 월이 아니다. 이 장부를 후속26의100년 조건부 방류와 시간 정렬하거나 실제 결합 유량으로 채택하지 않는다.

## 잠김 보류의 구체적 이유

[USACE HEC-RAS 단면 입력 설명](https://www.hec.usace.army.mil/confluence/rasdocs/rasum/6.5/entering-and-editing-geometric-data/cross-section-data)은 하도·범람원의 위치별 고도, 하도 경계, 구간 길이, 조도 및 수축·확대 손실 등 수리 계산용 형상과 저항 입력을 요구한다. 현재 경로에는 해당 형상·계수와 시간에 맞는 국지 수위 경계가 없다. 좌우3칸의 원본 격자 표본은 그 대체물이 아니다. 약1473km 떨어진 해양 기준0m를 출구 바로 아래 수위로 쓰지 않는다.

[USACE 고수위 계산 설명](https://www.hec.usace.army.mil/confluence/rasdocs/ras1dtechref/6.5/modeling-bridges/hydraulic-computations-through-the-bridge/high-flow-computations)을 참고해 기존 자유 월류 가정과 형상별 잠김 보정의 적용 범위를 구분했다. 실제 하류 수위가 양수라는 이유만으로 방류0을 확정하지 않는다. 이번 작업은 HEC-RAS 실행이나 잠김 보정 구현이 아니다.

## 재현

저장소 루트에서:

```sh
node handoff/restore-inputs.cjs
node integration/natural-world/d298591-tailwater/build.cjs
node --test --test-isolation=none integration/natural-world/d298591-tailwater/test.cjs
node integration/natural-world/d298591-tailwater/query.cjs 301657 1
node integration/natural-world/d298591-tailwater/package-check.cjs
node integration/natural-world/d298591-tailwater/browser-check.cjs
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저 검사는 Playwright와 Chromium을 필요로 한다. 환경변수 `PLAYWRIGHT_MODULE`, `CHROMIUM_PATH`로 설치 경로를 지정할 수 있다. 검토 주소는 `/integration/natural-world/d298591-tailwater/index.html#cell=301657&period=1&scope=full`이다.

일반 재생성에는 전체 아카이브가 필요 없다. 입력 `evidence.json.gz`에는621셀×12유출, 해당 집수 그래프·배정밀도 유량, 원본 하천과 코드 근거를 보존했다. 최초 수집을 다시 감사하려면 [전체 아카이브](../../../handoff/FULL_ARCHIVE.md)의 고정 커밋 `4afae5da3a7730b79ced1d2b9b7a8bc3041689c0`을 별도 디렉터리에 복원한 뒤 다음 명령을 쓴다. 수집기는 읽는5파일의 길이·SHA-256을 원본 manifest와 대조하고 이전 단계의 입력 해시도 확인한다. 원본 생성 스크립트를 실행하지 않는다.

```sh
node integration/natural-world/d298591-tailwater/collect.cjs /path/to/planet-full-handoff-v0.107 /path/to/SOURCE_MANIFEST.json
```

## AI 조회 계약

- 전체: `output/review.json.gz`, 형식 `d298591-tailwater-review/1`. SHA-256과 크기는 `output/manifest.json`에 있다.
- 선택: `query.cjs CELL PERIOD`, 또는 화면의 JSON 저장. 형식 `d298591-tailwater-selection/1`; 선택지점·12기간·선택기간 장부·경로·설계 근거·필요 입력·출처를 포함한다.
- `sourceBaseM3S`는 기존 원본 모델 유량이다. `d298591ReleaseIncluded:false`, `combinedActualFlowM3S:null`, `actualWaterSurfaceM:null`을 보존한다.
- `station.nativeCuts`는 넓은 격자 표본이다. 실제 단면으로 간주하지 않는다. `actual*`와 `actual` 내부 값은null이다.
- `decision.coupledRoutingReady:false`, `automaticAdoption:false`, `physicalResolvedReaches:0`, `unresolvedReaches:23022`를 보존한다.
- 29.055km와0.05m 생성 규칙을 실제 하폭·하상 관측치로 바꾸지 않는다. 원본에서 이미 고정된 설계와 새 물리 채택은 별개다.
