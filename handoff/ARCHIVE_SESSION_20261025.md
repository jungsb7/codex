# 최신 작업을 PC로 옮기기 위한 보관 브랜치

사용자가 최신 코드·자료를 GitHub의 별도 보관 브랜치에 올리고 다음 세션에서 내려받아 작업하도록 요청했다. 대상은 `archive/model54-session-20261025`다. 사이트 `main`은 그대로 두고 이 브랜치만 보관한다. **이 문서가 있는 브랜치는 최신 작업을 포함하며, 이전 문서 전용 브랜치와 다르다.**

## PC에서 받기

Git과 Node.js24를 준비하고 다음처럼 새 폴더에 받는다. 기존 작업 폴더를 덮어쓰지 않는다.

```sh
git clone --depth 1 --single-branch --branch archive/model54-session-20261025 https://github.com/jungsb7/codex.git codex-local
cd codex-local
node handoff/restore-inputs.cjs
node integration/natural-world/pressure-coupling/query.cjs passage X2 1
```

`codex-local`을 새 Codex 세션의 작업 폴더로 연 뒤 아래 요청으로 시작한다.

> 현재 로컬 codex 저장소의 AGENTS.md와 NEXT_SESSION_PROMPT.txt를 읽고 이어가줘. 파일·입력·계산 결과를 확인하고 사용자 변경을 보존해. 사이트 배포는 보류하고, 완료 계산을 중복 실행하지 말고 다음 목표인 기존 기능과 수치를 보존하는 무손실 용량 최적화를 진행해. 이전 /workspace·/tmp 경로를 내 PC에 있다고 가정하지 마.

Python3가 있다면 로컬 화면은 다음처럼 연다.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

브라우저 주소: `http://127.0.0.1:8000/integration/natural-world/unified-atlas/index.html`.
이것은 PC 안에서 여는 화면이며 공개 사이트 배포가 아니다. Windows에서 Python 명령 이름이 다르면 설치 환경에 맞춰 사용한다.

## 포함 범위

기준 로컬 작업은 `f6663be`이며 모형 완료 기준은 `0a13db0`, 초기 진단 보존 기준은 `ced9891`이다. 이 브랜치의 인수인계 갱신은 그 위에 추가한다.

- 최신51–54단계 소스·고정 가정·입력·계산 결과·최종 계속 상태·검증 기록.
- 기존50단계 이하 화면·원본/정설·과거 출력·경제·Oracle.
- 전체 용량 분석 및 파일별 분류·임시 후보 검사 기록.
- 기존 GitHub 인수인계와 오프라인 백업 안내.

웹 배포 대상에서 제외할 수 있다고 분석한 파일도 저장소에서는 삭제하지 않았다. 이것은 용량 최적화된 Pages 산출물이 아니라 다음 작업을 위한 자료 보관본이다. 최초 보관본 약1.16GB에 54단계 캐시 약287MB를 추가했다. 이 크기는 Pages1GB 문제와 별개이며 사이트에 그대로 배포하지 않는다.

현재 커밋의 모든 추적 파일을 그대로 보관하지만 Git 밖의 수GB 재생성 캐시, 시스템 설치 프로그램, 과거에 받은 일반 ZIP 사본까지 모두 업로드하는 것은 아니다. Linux 네이티브 실행 파일은 다른 OS에서 실행을 보장할 수 없어 소스와 compile.cjs를 보존한다. 일반 지도·AI 조회에는 완료 결과를 사용하므로 native 재컴파일이나 전체 물리 계산이 필요하지 않다.

## 재계산이 필요한 작업의 복원

큰 캐시가 없다는 이유로 run.cjs부터 실행하지 않는다. 먼저 README·input.cjs·prepare.cjs·compile.cjs와 기존 검증 기록을 확인하고 현재 환경의 경로·Node 헤더·C++ 컴파일러·메모리 조건을 점검한다. 일부 구형 스크립트는 /workspace 또는 /tmp를 직접 사용하므로 사용자 PC에서 해당 디렉터리를 임의 생성하거나 기존 경로를 덮어쓰지 않는다. 필요 시 현재 작업 폴더 아래 경로로 조정하고 관련 검사를 한다.

커밋된 입력은 `handoff/restore-inputs.cjs`가 해시 검증 후 복원한다. 전체 구형 v0.107 원본은 [FULL_ARCHIVE.md](FULL_ARCHIVE.md)에 명시한 별도 `archive/full-handoff-20261020`의 고정 커밋 `4afae5da3a7730b79ced1d2b9b7a8bc3041689c0`을 받아 restore.py로 복원한다. 이 아카이브를 main이나 현재 작업에 병합하지 않는다.

54단계 시간 민감32지점 재검증과 통로 폐쇄 대조 캐시는 [캐시 복원 안내](pressure-cache-54-transfer/README.md)를 따른다. 이 디렉터리는 웹 배포에서 제외한다. 채팅 ZIP 다운로드나 전체 보조 백업 없이 GitHub에서 복원할 수 있다.

다른 단계의 기존 보조 캐시가 필요하면 [LOCAL_BACKUP_20261025.md](LOCAL_BACKUP_20261025.md)의 백업이 별도로 보관됐는지 확인한다. 그 파일이 없어도 커밋된 결과의 조회·용량 분석은 가능하다. 전체 재계산은 준비 경로와 입력 확인 뒤에만 수행하며16GiB에서는 native 실행을 하나씩 진행한다.

## 완료와 다음 목표

50–54의 유한 구현·검증을 로컬에서 마쳤다. 과거 미배포 기록은 당시 상태를 설명한다. 현재 결과/검증은 다음에서 확인한다.

- [최종 결합 검증 결과](../integration/natural-world/pressure-coupling/REPORT.md)
- [기계 판독 완료 기록](../integration/natural-world/pressure-coupling/validation/completion.json)
- [용량 분석 보관본](local-deployment-audit/README.md)
- [다음 목표](NEXT_GOALS.md)

구현 완료가 과학적 정확성 확정은 아니다. 시간 수위 차이4.227m, 이전 공간14.574m, 빙설 비평형과 관측 자료 부재를 유지한다. 최초 PC 복원·AI 값 확인 후 무손실 포장, 시간 민감 지점 개선, 제한된 공간 동적 비교 순서다.

사용자의 이번 요청은 최신 자료를 별도 GitHub 브랜치에 보관하는 승인이다. 사이트 배포·main 병합·호스팅 변경을 자동 승인하는 뜻은 아니다. 과거의 대용량 게시 차단 기록은 삭제하지 않고 새 사용자 요청과 실제 게시 결과를 별도로 기록한다.
