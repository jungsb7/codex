# 전체 피복 경계와 식생·침투 피드백 — 후속53 로컬 완료

52단계 전체 검증을 마친 뒤105년 계산3종과 자료/브라우저 검증을 완료했다. 공개 게시·PR·배포는 승인 대기로 하지 않는다. [고정 가정](assumptions.json)을 사용하며,기존 출력과 채택판을 덮어쓰지 않는다.

육지의 서로 다른 분류가 만나는53,803개 경계 전체를 다룬다. 기존47의10,654개 내부 경계 표본은 유지하고,나머지43,149개에는 공유17절점의 굴곡을 만든다. 새 굴곡은 변 중앙 절반에만 있고 최대폭은 격자폭의8% 미만이다. 구면 경위도 선분의 해석 면적을 직접 보정하여 각 격자와11개 분류의 채택 면적을 보존한다. 해양·원래 호수 경계는 고정한다. 이전 굴곡의 끝점에서 약1e-14도 차이였던 역삼각함수 반올림을 정확한 원본 격자 꼭짓점으로 통일해 이웃 폴리곤의 공유 변을 완전히 일치시켰다. 이전 자료 자체는 변경하지 않았다.

경계4검사 통과:268,857개 격자의 최대 면적 차이1.677e-10km²,공유 변의 역순 동일,자기 교차 없음,해양/호수 침범 없음,전 클래스 면적 대조. 새 경계는 관측 숲/습지 가장자리가 아닌 별도 면적 보존 가정이다.

식생은168,576개 수문 대상 육지에0~1의 살아 있는 피복 비율로 정의한다. 채택 분류별 초기값과 침수 내성으로 시작하며 토양 수분·기온·침수 비율에 따른 성장/사망을 적분한다. 정확한 logistic 성장과 지수 사망 소단계를 사용하고 매 기간 시작+성장−사망=끝 비율을 검사한다. 탄소나 종별 생물량의 질량 장부가 아니다. 식생에 따라 침투 능력만0.5~1.5배 조정하고,기존 물의 증발·빙설·하천·퇴적물 계산을 유지한다. 식물 물 소비를 기존 증발에 중복으로 더하지 않는다.

52의104년 말 상태에서 고정 기후1년(105년),120/240단계·식생 침투 피드백0 대조를 비교한다. 배경 육지는 경계 세분에 포함하되,관측값 없는 새 배경 생태 동역학을 만들어 전체 계산으로 주장하지 않는다. 기존 시간/공간 수위 민감도와 비평형 한계를 유지한다.

```sh
node integration/natural-world/cover-ecology-coupling/prepare-boundaries.cjs
node --test --test-isolation=none integration/natural-world/cover-ecology-coupling/test-boundaries.cjs
node integration/natural-world/cover-ecology-coupling/compile.cjs /tmp/node-v24.19.0/include/node
node --test --test-isolation=none integration/natural-world/cover-ecology-coupling/test-engine.cjs
# 52 validation/completion.json이 생성된 뒤에만:
node integration/natural-world/cover-ecology-coupling/run.cjs
```

작은 생태 엔진6검사는 통과했다. 경계 검증/작은 검사와 전체 결합 계산 완료를 구분한다. 120/240/피드백0 전체 계산과 자료6·브라우저10검사/4다운로드를 통과했다. [결과](REPORT.md)와 [완료 기록](validation/completion.json)을 확인한다. 식생 비율 시간 차이는 최대0.002078(0.208%p),피드백0차이는0.149398(14.94%p)이며 평형이나 전체 수렴을 주장하지 않는다. 완료된 캐시는 재실행하지 않는다.
