# Planet 전체 원본 보관 · 2026-10-20

제공된 `planet-full-handoff-v0.107` 작업 폴더의 **3,044개 파일, 2,480,165,475바이트 전체**입니다. 세계관 원문·국가 초안, v0.107 원본 행성 시뮬레이터 실행 HTML·개발 소스, 과거 버전별 인계 기록, 검증 결과·경제 자료, 현재 전 대륙 자연지도 개발 자료와 캐시를 포함합니다. 현재 제공된 폴더의 완전한 보관본이며, 이 폴더에 없던 과거 버전까지 소급 수집했다는 뜻은 아닙니다.

현재 작업 시작점은 [main/NEXT_SESSION_PROMPT.txt](https://github.com/jungsb7/codex/blob/main/NEXT_SESSION_PROMPT.txt)입니다. 보관본 안의 옛 지시문은 당시 기록이며 현재 사용자의 요청보다 우선하지 않습니다. 현재 공개 지도와 최신 인계 문서는 main에서 계속 관리합니다.

## 복원

Python 3.9 이상과 `zstd` CLI를 준비합니다(예: Debian/Ubuntu `sudo apt-get install zstd`).

```sh
git clone --depth 1 --single-branch --branch archive/full-handoff-20261020 https://github.com/jungsb7/codex.git planet-archive
cd planet-archive
python3 restore.py ../restored
```

결과: `../restored/planet-full-handoff-v0.107/`. 구 행성 시뮬레이터는 그 안의 `application/planet-observatory.html`, 개발 소스는 `application/source/`, 세계관은 `worldbuilding/WORLD_HANDOFF.md`에 있습니다. 브라우저에서 원본 HTML을 열거나 복원 폴더에서 로컬 HTTP 서버를 실행할 수 있습니다.

```sh
python3 restore.py ../restored --verify-only
```

검증만 실행하면 추출하지 않고 압축 내부의 모든 파일을 확인합니다. 복원 도구는 48개 조각, 결합 압축본, 원본 3,044개 파일의 SHA-256을 모두 검사합니다. 이미 동일한 파일은 재사용하며 내용이 다른 파일은 덮어쓰지 않습니다. 압축본은 약402MB, 복원 원본은 약2.48GB이므로 작업 공간을 넉넉히 확보하세요. 원본에는 민감한 추가 설정을 자동 확정하지 않는 기존 구분과 미정값이 그대로 있습니다.

- `ARCHIVE.json`: 조각별 크기·SHA-256·Git blob SHA와 전체 압축본 SHA-256.
- `SOURCE_MANIFEST.json`: 원본 전체 경로·크기·SHA-256.
- `verification.json`: 업로드 전 압축 내부 전 파일 검증 결과.
- `parts/`: 8MiB 이하 조각. 일반 Git 파일이며 Git LFS나 외부 저장소에 의존하지 않습니다.

이 브랜치를 main에 병합하지 마세요. 별도 보관 브랜치로 유지하여 기본 지도 작업의 shallow clone과 Pages 배포에 전체 보관본이 들어가지 않게 합니다.
