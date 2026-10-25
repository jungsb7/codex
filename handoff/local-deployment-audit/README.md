# 로컬 저장 완료

사용자가 사이트 배포 대신 로컬 보존을 요청했다. 최신 코드·계산 자료는 이 저장소에 유지하고, 임시 용량 분석 기록을 이 디렉터리에 복사해 SHA256으로 대조했다. 공개 업로드·배포·정확도 재계산은 하지 않았다. 저장 위치는 현재 실행 환경의 `/workspace/codex`이며 사용자 PC로 자동 다운로드한 것은 아니다.

- [심층 분석 보고서](snapshot/deep/REPORT.md)
- [전체 파일 분류와 근거](snapshot/deep/classification.json)
- [게시 후보 목록](snapshot/deep/publish-files.txt)
- [32개 AI 조회 대조](snapshot/deep/query-checks.json)
- [후보 파일의 원본 해시 대조](snapshot/deep/candidate-preservation.json)
- [복사 파일별 해시](snapshot-manifest.json)
- [모형 완료 보고서](../../integration/natural-world/pressure-coupling/REPORT.md)

모형·분석 기준 커밋은 `0a13db0`이다. 게시 후보는1,959파일/1,065,238,620바이트이며10억바이트 목표보다65,238,620바이트 크다. 이 값은 해당 기준 커밋의 후보에 대한 것으로, 새로 보관한 진단 파일까지 포함한 저장소 전체 크기를 뜻하지 않는다. 후보 목록은 실제 배포 설정이 아니다. 원본이나 제외 후보 파일을 삭제하지 않았다.

snapshot은 당시 기록을 그대로 복사했다. 내부에 등장하는 `/tmp/codex-pages-audit` 경로는 당시 임시 위치이며, 보관된 파일은 이곳의 `snapshot/`에 있다. 임시 `site/` 심볼릭 링크 트리는 복사하지 않았다. 분석 스크립트를 실행하면 임시 파일을 다시 만들 수 있으므로 기록 열람과 재실행을 구분한다.

다음 세션은 루트 NEXT_SESSION_PROMPT.txt를 읽는다. 사용자가 다시 요청하기 전에는 배포·게시 재시도·새 정확도 계산을 시작하지 않는다. 환경이 교체될 때 이 로컬 작업 공간이 자동으로 이전되는지는 이 커밋만으로 보장되지 않으며, 이 기록은 외부 백업이나 PC 다운로드 완료를 뜻하지 않는다.
