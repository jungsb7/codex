# 전 대륙 경관 설정 초안 — 대표 30곳

[설정 초안 지도](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=0) · [수치와 근거 JSON](output/summary.json).

기존 후보를 실제 세계 설정으로 검토하기 쉽게 묶었다. 총 **6,528개 연속군** 중 자연 권역·경관별로 초안 우선 판정의 격자 합계 면적이 가장 큰 1곳을 골라 **30개 대표 초안**을 마련했다. 작은 연속군을 삭제한 것이 아니며, 지도에서 어느 후보 좌표든 선택하여 해당 연속군을 확인할 수 있다. 초안 완성이 이번 작업의 종료 기준이며 실제 자연물의 자동 채택은 0건이다.

## 분류와 한계

- 숲·숲초원은 원본 생물군계 6–10이다. 건조 숲초원·계절림/사바나를 포함하므로 전부 울창한 숲이라는 뜻이 아니다. 습윤 열대림은 원본 8번 분류를 유지한다.
- 초원·반건조지는 원본 5번이다. 지형 분류인 평야와는 다르며 구릉·산지의 초원도 포함할 수 있다.
- 습지는 원본 습윤 분류 4번만 사용한다. 기존 상시 연결 유량·저기복·저경사 선별은 그대로다. 새 범람수위·지하수·토성이나 물수지를 계산하지 않았다.
- 식생은 극지 수분/PET 공백·서부 설정 충돌이면 보류, 임계값 전이이면 전이 검토, 그 밖은 초안 우선이다. 하류 미정·큰 가상 채움은 식생의 부가 경고로 보존한다. 식생 후보가 있다는 이유로 함몰부의 물수지가 해결되지는 않는다.
- 습지는 기후/설정 공백 외에도 하류 배분 미정·100m 초과 가상 채움이면 보류한다. 식생 임계값 전이만으로 별도 습지 층을 보류하지 않는다.
- 같은 자연 권역·경관·식생 분류·판정 안에서 변을 공유하는 4방향 격자를 묶는다. 대각선 접촉은 연결하지 않으며 경도는 순환한다. 권역과 생물군계의 경계는 정리를 위한 구분이며 실제 생태 경계가 아니다.
- 면적은 구면 위도별 **원본 격자의 합계**다. 실제 수목 피복률·초지/습지 면적은 null이다. 8,978격자는 식생과 습지 후보가 겹치므로 서로 더하지 않는다.

## 전체 판정

| 경관 | 초안 우선 격자 | 전이 검토 격자 | 보류 격자 | 전체 연속군 |
| --- | ---: | ---: | ---: | ---: |
| 숲·숲초원 | 41,462 | 18,929 | 2,629 | 2,696 |
| 초원·반건조지 | 66,500 | 20,903 | 0 | 1,314 |
| 습지 | 6,992 | 0 | 2,812 | 2,518 |

## 권역별 초안 우선 격자

0은 그 권역에 해당 **우선 판정 후보**가 없다는 뜻이며 실제 자연물이 없다는 뜻은 아니다. 북방 수원 산지와 제국 분지·대호수의 우선 습지, 섬·분리 육지의 초원은 대표 초안을 임의로 채우지 않았다.

| 자연 권역 | 숲·숲초원 | 초원·반건조지 | 습지 |
| --- | ---: | ---: | ---: |
| 북부 설원권 | 3,621 | 8,032 | 249 |
| 북방 내륙·대초원권 | 6,851 | 30,420 | 193 |
| 서부 사막권 | 514 | 3,021 | 39 |
| 서대륙 중남부 | 9,853 | 150 | 1,141 |
| 북방 수원 산지 | 1,394 | 407 | 0 |
| 제국 분지·대호수 | 32 | 44 | 0 |
| 동대륙 내륙·연안 | 3,189 | 3,723 | 435 |
| 남동 연결부 | 563 | 433 | 35 |
| 남동대륙 | 7,822 | 9,179 | 1,921 |
| 남서대륙 | 6,031 | 11,091 | 2,637 |
| 섬·분리 육지 | 1,592 | 0 | 342 |

## 대표 초안

큰 순서는 보기 편하게 정한 검토 순서이며 신뢰도·실제 생태적 중요도 순위가 아니다. 각 링크는 해당 경관의 격자와 필터를 지도에 보존한다.

| 경관 | 자연 권역 | 원본 후보 분류 | 격자 | 격자 합계 km² | 지도 |
| --- | --- | --- | ---: | ---: | --- |
| 숲·숲초원 | 서대륙 중남부 | 온대림 후보 | 5,392 | 2,780,873 | [forest-290975](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=4&cell=290975&lon=-22.6171875&lat=45.5859375&zoom=8) |
| 숲·숲초원 | 북방 내륙·대초원권 | 냉대림 후보 | 2,357 | 994,563 | [forest-240147](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=2&cell=240147&lon=-55.4296875&lat=53.3203125&zoom=8) |
| 숲·숲초원 | 남동대륙 | 냉대림 후보 | 1,369 | 535,631 | [forest-901342](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=9&cell=901342&lon=112.1484375&lat=-47.4609375&zoom=8) |
| 숲·숲초원 | 남서대륙 | 열대 계절림·사바나 후보 | 651 | 438,422 | [forest-513423](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=10&cell=513423&lon=-86.3671875&lat=11.6015625&zoom=8) |
| 숲·숲초원 | 북방 수원 산지 | 냉대림 후보 | 761 | 353,477 | [forest-256182](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=5&cell=256182&lon=102.7734375&lat=50.9765625&zoom=8) |
| 숲·숲초원 | 북부 설원권 | 냉대림 후보 | 1,059 | 259,967 | [forest-123950](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=1&cell=123950&lon=70.8984375&lat=71.1328125&zoom=8) |
| 숲·숲초원 | 동대륙 내륙·연안 | 냉대림 후보 | 461 | 219,259 | [forest-274633](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=7&cell=274633&lon=107.2265625&lat=48.1640625&zoom=8) |
| 숲·숲초원 | 섬·분리 육지 | 열대 계절림·사바나 후보 | 254 | 170,445 | [forest-518102](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=11&cell=518102&lon=-69.7265625&lat=10.8984375&zoom=8) |
| 숲·숲초원 | 남동 연결부 | 온대림 후보 | 254 | 169,027 | [forest-491148](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=8&cell=491148&lon=92.9296875&lat=15.1171875&zoom=8) |
| 숲·숲초원 | 서부 사막권 | 건조 숲초원 후보 | 219 | 103,904 | [forest-263161](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=3&cell=263161&lon=-61.5234375&lat=49.8046875&zoom=8) |
| 숲·숲초원 | 제국 분지·대호수 | 냉대림 후보 | 12 | 6,159 | [forest-317360](../unified-atlas/index.html#mode=draft&draftFamily=forest&draftStatus=priority&region=6&cell=317360&lon=41.3671875&lat=41.6015625&zoom=8) |
| 초원·반건조지 | 북방 내륙·대초원권 | 초원·반건조지 후보 | 23,250 | 8,055,624 | [grass-164753](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=2&cell=164753&lon=-85.8984375&lat=64.8046875&zoom=8) |
| 초원·반건조지 | 남서대륙 | 초원·반건조지 후보 | 4,870 | 3,289,551 | [grass-536431](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=10&cell=536431&lon=-93.8671875&lat=8.0859375&zoom=8) |
| 초원·반건조지 | 북부 설원권 | 초원·반건조지 후보 | 7,901 | 2,139,341 | [grass-128264](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=1&cell=128264&lon=1.9921875&lat=70.4296875&zoom=8) |
| 초원·반건조지 | 남동대륙 | 초원·반건조지 후보 | 3,829 | 1,984,480 | [grass-760022](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=9&cell=760022&lon=110.2734375&lat=-25.8984375&zoom=8) |
| 초원·반건조지 | 서부 사막권 | 초원·반건조지 후보 | 2,973 | 1,385,601 | [grass-263039](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=3&cell=263039&lon=-90.1171875&lat=49.8046875&zoom=8) |
| 초원·반건조지 | 동대륙 내륙·연안 | 초원·반건조지 후보 | 845 | 412,645 | [grass-274203](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=7&cell=274203&lon=6.4453125&lat=48.1640625&zoom=8) |
| 초원·반건조지 | 남동 연결부 | 초원·반건조지 후보 | 260 | 167,245 | [grass-448127](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=8&cell=448127&lon=89.8828125&lat=21.6796875&zoom=8) |
| 초원·반건조지 | 서대륙 중남부 | 초원·반건조지 후보 | 150 | 70,893 | [grass-280312](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=4&cell=280312&lon=-1.7578125&lat=47.2265625&zoom=8) |
| 초원·반건조지 | 북방 수원 산지 | 초원·반건조지 후보 | 40 | 19,817 | [grass-302007](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=5&cell=302007&lon=43.0078125&lat=43.9453125&zoom=8) |
| 초원·반건조지 | 제국 분지·대호수 | 초원·반건조지 후보 | 19 | 9,631 | [grass-314292](../unified-atlas/index.html#mode=draft&draftFamily=grass&draftStatus=priority&region=6&cell=314292&lon=42.3046875&lat=42.0703125&zoom=8) |
| 습지 | 남서대륙 | 수변 습지 후보 | 318 | 211,378 | [wetland-631816](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=10&cell=631816&lon=-58.0078125&lat=-6.4453125&zoom=8) |
| 습지 | 남동대륙 | 수변 습지 후보 | 137 | 91,470 | [wetland-641780](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=9&cell=641780&lon=117.3046875&lat=-7.8515625&zoom=8) |
| 습지 | 서대륙 중남부 | 수변 습지 후보 | 113 | 57,464 | [wetland-298586](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=4&cell=298586&lon=-38.7890625&lat=44.4140625&zoom=8) |
| 습지 | 동대륙 내륙·연안 | 수변 습지 후보 | 44 | 24,707 | [wetland-363292](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=7&cell=363292&lon=6.6796875&lat=34.5703125&zoom=8) |
| 습지 | 섬·분리 육지 | 수변 습지 후보 | 33 | 22,224 | [wetland-632368](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=11&cell=632368&lon=71.3671875&lat=-6.4453125&zoom=8) |
| 습지 | 남동 연결부 | 수변 습지 후보 | 27 | 17,740 | [wetland-489597](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=8&cell=489597&lon=89.4140625&lat=15.3515625&zoom=8) |
| 습지 | 북방 내륙·대초원권 | 수변 습지 후보 | 20 | 8,183 | [wetland-241490](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=2&cell=241490&lon=-100.6640625&lat=53.0859375&zoom=8) |
| 습지 | 북부 설원권 | 수변 습지 후보 | 28 | 7,618 | [wetland-151639](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=1&cell=151639&lon=80.5078125&lat=66.9140625&zoom=8) |
| 습지 | 서부 사막권 | 수변 습지 후보 | 12 | 5,945 | [wetland-306158](../unified-atlas/index.html#mode=draft&draftFamily=wetland&draftStatus=priority&region=3&cell=306158&lon=-64.1015625&lat=43.2421875&zoom=8) |

## 지도와 저장

‘설정 초안’ 탭에서 경관, 판정, 기존 자연 권역 선택을 조합한다. 금색 테두리는 선택한 연속군이며, 실제 숲·습지 경계를 뜻하지 않는다. 판정 필터에서 제외된 선택 격자는 설명을 유지하되 강조하지 않는다. ‘기존 세계 설정만’에서는 후보 색과 경계를 숨긴다. 다른 지도 모드의 기존 자연물은 유지한다.

좌표 JSON의 `landscapeDraft`는 현재 좌표의 초안 여부와 연속군 수치를 담는다. ‘경관 초안 JSON’은 전체 구성 격자와 원본 근거를 저장한다. 선택한 경관이 없는 육지, 해양, 기존 호수는 별도 상태를 반환하며 인접 경관을 끌어다 채우지 않는다.

전 대륙 원본 268,857격자와 원본 호수 209격자, 기존 기후·경제·수계 자료는 변경하지 않았다. 전역 미정 수는 기존 상태 그대로이며, 앞선 9곳 국지 검토도 종료 상태다. 이번 초안은 근거를 갖춘 세계 설정 선택을 위한 결과물이며 실제 자연물 확정을 자동으로 이어서 수행하는 새 필수 단계가 아니다.
