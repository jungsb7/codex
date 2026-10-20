# 전체 세계관·구 행성 시뮬레이터 보관

2026-10-20 현재 제공된 원본 작업 폴더의 **3,044개 파일, 2,480,165,475바이트 전부**를 GitHub에 보관합니다. 원본에 없던 과거 버전까지 추가 수집했다는 뜻은 아닙니다.

- [세계관 기준 원문](../worldbuilding/WORLD_HANDOFF.md), [이전 세계관 발췌](../worldbuilding/sources/previous-lore-source.md), [국가 초안](../worldbuilding/sources/current-country-drafts.json): main에서 바로 읽을 수 있는 원본 그대로의 복사본.
- [전체 보관 브랜치](https://github.com/jungsb7/codex/tree/archive/full-handoff-20261020): 원본 실행 앱·소스·연구 입력·결과·역사 기록·캐시 전체.
- [고정 보관 커밋](https://github.com/jungsb7/codex/tree/4afae5da3a7730b79ced1d2b9b7a8bc3041689c0): `4afae5da3a7730b79ced1d2b9b7a8bc3041689c0`.
- [원본 파일별 목록과 해시](https://github.com/jungsb7/codex/blob/4afae5da3a7730b79ced1d2b9b7a8bc3041689c0/SOURCE_MANIFEST.json).

## 포함 범위

| 경로 | 내용 |
|---|---|
| `worldbuilding/` | 세계관 설명·이전 원문·국가 초안·당시 인계 문서 |
| `application/planet-observatory.html` | v0.107 원본 행성 시뮬레이터 전체 실행 파일 |
| `application/source/`, `application/references/` | 원본 앱 개발 소스·참고자료 |
| `application/history/`, `history/` | 제공된 과거 버전별 기록 |
| `application/validation/` | 구 시뮬레이터의 계산·검증 결과 |
| `integration/` | 왕국·제국 통합, 지형·계절·경제·전 대륙 자연지도 전체 작업 자료 |
| `ai-survey/` 및 루트 파일 | 조사 자료와 원래 인계·목록 파일 |

현재 공개본의 [v0.77 실행 파일](../legacy-v0.77.html)도 main에 유지합니다. 구 v0.107 실행 HTML은 아래 전체 보관본에서 복원합니다. 공개 지도용 안내 페이지와 원본 실행 HTML은 서로 다른 파일입니다.

## 다음 세션에서 복원

평소 지도 작업은 main만 clone합니다. 옛 앱·연구 전체 자료가 필요할 때만 별도 보관 브랜치를 받습니다. 브랜치를 main에 병합하지 않습니다.

```sh
git clone --depth 1 --single-branch --branch archive/full-handoff-20261020 https://github.com/jungsb7/codex.git planet-archive
cd planet-archive
git rev-parse HEAD
# 위 출력이 4afae5da3a7730b79ced1d2b9b7a8bc3041689c0인지 확인
python3 restore.py ../restored
```

Python 3.9 이상과 `zstd` CLI가 필요합니다. Debian/Ubuntu에서는 `sudo apt-get install zstd`로 설치할 수 있습니다. 원본은 `../restored/planet-full-handoff-v0.107/` 아래 복원됩니다. 조각 약402MB와 원본 약2.48GB를 고려해 디스크 공간을 확보합니다.

복원 도구는 조각 48개와 전체 압축본, 내부 원본 3,044개 파일을 SHA-256으로 검사합니다. 동일한 기존 파일은 재사용하고 다른 파일은 덮어쓰지 않습니다. `python3 restore.py ../restored --verify-only`는 추출 없이 전체 압축 내부를 검증합니다. Git clone이 실패하면 clone을 다시 완료한 뒤 복원하며, ZIP을 사용자가 채팅에 업로드할 필요가 없습니다.

복원한 원본 앱 실행 예:

```sh
cd ../restored/planet-full-handoff-v0.107
python3 -m http.server 8000 --bind 127.0.0.1
```

`http://127.0.0.1:8000/application/planet-observatory.html`을 엽니다. 원본의 옛 NEXT_SESSION_PROMPT는 역사 기록입니다. 현재 작업 지시는 main 루트 NEXT_SESSION_PROMPT와 사용자의 요청을 따릅니다.

## 무결성

전체 압축본 SHA-256: `4b5d51a88f0616e0cd695bad69679799babf1b4234593de7b3a260cf3011b3ae`.

원격 보관본 재다운로드·전체 원본 해시 검증 결과는 [validation/full-archive-remote.json](validation/full-archive-remote.json)에 기록합니다. 이는 기능 검사가 아니라 보관본의 바이트 보존 검사입니다. 현재 main의 최신 실행·인계 문서는 별도로 계속 관리하며, 이 보관본은 2026-10-20 원본 스냅샷으로 고정합니다.

## 공개본 간소화의 의미와 당시 사유

초기 공개 패키지의 [deployment-manifest.json](../deployment-manifest.json) `omittedSources`에는 v0.107 `application/planet-observatory.html` 제외 사유가 **당시 자동 공개 승인 검토의 거절**로 기록돼 있다. GitHub 파일 용량 한도 초과로 제외했다고 기록된 것은 아니다. 초기 통합 화면과 1차 지형 화면도 공개 범위를 줄이면서 최신 대체 화면으로 안내했다.

이후 전체 원본을 이 문서의 별도 보관 브랜치에 보존하고 전3044파일의 복원 해시를 검증했다. 따라서 원본 보존과 공개 사이트에서 즉시 실행할 수 있는 기능 범위는 구분해야 한다. v0.107 전체 기능은 보관본을 복원해 실행하며 공개 Pages의 안내 화면 자체가 그 실행 파일은 아니다. v0.77 공개 실행본도 최신 v0.107과 동일하다고 보장하지 않는다.

2026-10-20 후속21 병합 시 main의 추적 파일 합계는 203,875,024바이트(약204MB), 가장 큰 단일 파일은 10,874,995바이트다. 이는 Git 이력·별도 보관 브랜치·개발 시 복원한 입력을 제외한 파일 합계다. GitHub Pages의 [공개 사이트 한도1GB](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) 및 일반 Git 저장소의 [단일 파일100MiB 한도](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github)와 별개로, 공개 범위에서 빠진 기능이 있는지 판단해야 한다. 용량 최적화가 원본 삭제나 계산 모형 축소를 의미하지 않는다.
