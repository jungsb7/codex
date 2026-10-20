# 계절·자연물·확대 경관 사용 안내

[통합 지도](../unified-atlas/index.html) · [설계·근거·한계](REPORT.md) · [자료와 구현 요약](output/summary.json)

1. 상단 **계절**을 선택한 뒤 기간 슬라이더와 강수/기온/상대 강수 색상을 바꾼다. 다른 지도 보기에서도 왼쪽 ‘12기간 계절 변화’를 켤 수 있다.
2. 지도에서 강·산맥·물길 후보를 클릭한다. 왼쪽 목록은 기존 강·산맥을 찾는 데 쓴다. 오른쪽 자연물 정보창에서 전체 보기·JSON 저장을 사용할 수 있다.
3. 자연환경·지형·식생 보기에서 **12배 이상 확대**한다. ‘확대 경관 상세화’가 켜져 있으면 보간 음영·등고선·계곡·숲과 습지의 설계 패치를 본다. 원본 격자 토글로 근거 격자를 겹쳐 볼 수 있다.

새 세부 형태는 표시 설계이며 물리적 고도·수계·식생 확정 자료가 아니다. 기존 설정/계산 후보/설계 표시를 구분한다. 계절 첫 로딩은 기존 압축자료 약41MB가 추가된다.

재현 (패키지 루트):

```
node integration/natural-world/atlas-experience/build.cjs
node --test --test-isolation=none integration/natural-world/atlas-experience/test.cjs
node integration/natural-world/atlas-experience/browser-check.cjs /workspace/planet-nature-pages
```

검증 도구와 기록은 이 폴더의 `validation/`에 있다. 소스 인계 갱신은 이 단계의 `record.py`로 수행한다. 이전 단계의 기록 도구는 최신 인계를 덮어쓸 수 있으므로 실행하지 않는다.
