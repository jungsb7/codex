# 지정 통로 압력과 전체 결합 — 후속54 로컬 완료

[유한 완료 기준](../../../handoff/MODEL_COMPLETION_CRITERIA.md)의 마지막 구현 단계를 완료했다. 105년 말 상태를 이어 106년의 120/240단계 계산·통로 교환0 대조와 이전53 전체 수치 회귀를 마쳤다. 엔진10·원본 유입 배분3·자료7·브라우저10/4다운로드, 기존 브라우저32·상태3검사가 통과했고 이전56출력은 정확히 일치한다. [결과](REPORT.md)와 [기계 판독 완료 기록](validation/completion.json)을 확인한다. 공개 승인과 자동 검토 차단은 별개이며 이 단계는 로컬 전용이다.

[고정 가정](assumptions.json)은 기존 채택 통로X0/X1/X2만3개 구획으로 나눈다. 중심 높이에 기존 X2의 역경사 낮춤을 적용한다. 지하 수계를 새로 연결하지 않고 위쪽 교차 물길과 독립성을 유지한다. 단면은 원래 평균 유량으로 정한 폭,채택 최대 수심+여유고를 사용한다. 가득 차기 전에는 자유 수면 저장,천장 위에서는 폭² 면적의 압력 저장 슬롯을 사용한다. 압력파·공동현상·공기·새 지하 열수지는 포함하지 않는다.

흐름은 부호가 있는 Darcy–Weisbach 손실수두 법칙이다. 유효 젖은 단면과 가용 물로 제한하며 구획/기존 연못의 교환을 공통 암시적 해로 반복한다. 마지막 구획은 해당 하류 `nextNode`가 속한 기존 저류칸과 교환한다. `endpointNode`는 더 먼 최종 해양 출구이므로 통로 바로 뒤의 연결로 혼동하지 않는다. 원래 하류 위상과 최종 해양 경로는 기존 저류 모형이 유지한다.

기존 배경 유출 격자의 원본 수신 경로를 따라 처음 만나는 지정 하류 물길을 찾는다. 해당 격자의 원래 localDischarge만 통로 입구로 보내고,원래 저류칸의 외부 유입에서 같은 양을 뺀다. 도달 물길의 유출을 입구에 모으는 공간 집중 가정이며 새로운 강수를 더하지 않는다. 나머지 배경 유입은 유지한다. 통로는 빈 상태로 시작해 새 초기 물을 만들지 않는다. 105년 말의 물·빙설·토양·하도/고체·식생 상태를 이어106년1년120/240단계와 통로 교환0대조를 비교한다. 교환0은 입구 저장 대조이며 현실적인 장기 압력의 예측이 아니다.

새 지하 저장은 일곱 번째 집수권 물 재고다. 기존23,022구간의 고체 장부와 생태 변화 장부도 계속 적분한다. 이3배경 통로에 새 퇴적물 유입이나 침식 법칙을 발명하지 않는다. 기존 원본·정설·출력은 그대로 유지한다.

작은 검사에서 같은 수두의 극소 반올림 유량을 정확히0으로 처리했다. 네트워크 반복 중 이전 유량을 되돌리는 임시 음수 보정량을 자르면 물이 생길 수 있어,구획 쌍의 가용량 구간에서 보정량을 풀도록 수정했다. 또한 새 압력 경로의 증발 깊이0에서는 수위↔수량 왕복 계산을 생략해 큰 저류 면적의 반올림 손실을 없앴다. 압력 입력이 없으면 이전 엔진 경로와 정확히 일치한다. 실패한 개발 검사는 완료 결과에 포함하지 않는다.

지도는 `index.html`, AI 조회는 동일한 `core.js`를 쓰는 아래 명령을 이용한다. 조회에는 같은106년의 선택 격자·물길·통로·전체 물 장부가 포함된다.

```sh
node integration/natural-world/pressure-coupling/query.cjs passage X2 1
node integration/natural-world/pressure-coupling/query.cjs cell 315770 1
node integration/natural-world/pressure-coupling/query.cjs budget world 1
```

완료 캐시는 `/workspace/pressure-cache-54`다. `run.cjs`를 중복 실행하지 않는다. 자료 검사는 `node --test integration/natural-world/pressure-coupling/test-data.cjs`, 완료 근거 확인은 `node integration/natural-world/pressure-coupling/complete.cjs`이며 둘 다 전체 계산을 다시 시작하지 않는다. 재현에 필요한 입력·법칙·초기 상태·네이티브 해시는 완료 기록과 manifest에 남겼다.

120/240 통로 수두 최대 차이는0.376mm지만 기존 저류칸 수위 차이는4.227m다. 전체19,990칸 중32곳에서1m를 초과한다. 이전 공간14.574m·시간4.282m 민감도도 남는다. 본계산의 기간 말 통로는 모두 천장 아래 자유 수면 상태다. 압력/역류 엔진 검사를 통과했다고 실제로 모든 통로가 압력 충전됐다고 해석하지 않는다. 부분 충전 시 손실법칙의 수력 직경을 전체 단면 기준으로 유지하는 근사와 압력 저장 슬롯을 사용하며, 지하 열수지는 포함하지 않는다.

정한50–54 기준에 한해 최신 조회의 `allRequestedDetailImplemented=true`, `finiteModelCriteriaMet=true`다. `actual=null`, `observationalValidationComplete=false`, `fullNumericalConvergence=false`도 함께 유지한다. 계산 전에 고정한 `assumptions.json`과 과거 판의 false 표시는 역사적 입력 상태이므로 변경하지 않았다. 현재 완료 여부는 최신 조회와 `validation/completion.json`을 따른다. 보존 검사는 관측 지형이나 과학적 정확성의 확정이 아니다.

원본 유입 재생성과 대조 검사는 [전체 아카이브 복원](../../../handoff/FULL_ARCHIVE.md)의 `integration/natural-world/stage3/inputs/hydrology.json`을 사용한다. 이 작업의 복원 위치는 `/workspace/planet-restored-24/planet-full-handoff-v0.107`이다. 일반 계속 계산은 커밋된 `inputs/routing.json.gz`를 사용하며 원본359격자의 월별 유입·원래 저류칸·원본 전체 localDischarge의 SHA256을 함께 보존한다. 각 통로에 모은 연간 유입은 원본 물길의 독립적인 meanM3s와도 일치한다.
