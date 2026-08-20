# 위인 성능 프로브 — 2026-08-20

기준선 `docs/baselines/2026-08-20-baseline.json` · 앵커 `e6a86cb` · 프로브 49건 · 동시 4 · 벽시계 1331s

## 요약

| 프로브 | 대상 | 통과 | 비고 |
|---|---|---|---|
| A 공통질문 | 36명 | 36 (100%) | 위조급 0이 합격선 |
| B 환각 저항 | 4명 | 4 (100%) | 없는 문헌에 [근거없음]을 내는가 |
| C 되묻기 | 4명 | 4 (100%) | NEEDS_CLARIFICATION |
| D 라우터 | 5문항 | 5 (100%) | 기대 위인 포함 여부 |

**위조급 0건 · 형식급 200건** · 중앙 지연 98s · 실행 실패 0건 · 위인 격리 깨짐 0건

## A. 공통질문 — 36명

> 온라인 강의 이탈 문제를 자기 이론으로 진단하고 무엇을 먼저 바꾸겠는가

| 위인 | 출처 | conf | 위조 | 형식 | 근거/적용/없음 | 지연 |
|---|---:|---|---:|---:|---|---:|
| ann-brown | 10 | medium | 0 | 21 | 6/2/0 | 178s |
| michael-g-moore | 10 | medium | 0 | 13 | 5/1/0 | 61s |
| allan-collins | 10 | high | 0 | 12 | 3/2/1 | 166s |
| walter-dick | 10 | high | 0 | 12 | 4/1/1 | 81s |
| robert-mager | 10 | high | 0 | 11 | 3/2/1 | 82s |
| seymour-papert | 14 | high | 0 | 10 | 3/2/0 | 95s |
| thomas-gilbert | 10 | medium | 0 | 10 | 3/2/0 | 103s |
| benjamin-bloom | 10 | medium | 0 | 9 | 1/3/1 | 155s |
| jean-lave | 10 | high | 0 | 9 | 1/3/0 | 86s |
| jerome-bruner | 10 | high | 0 | 9 | 2/2/0 | 158s |
| albert-bandura | 10 | high | 0 | 8 | 4/1/0 | 205s |
| etienne-wenger-trayner | 10 | high | 0 | 8 | 1/4/1 | 137s |
| john-sweller | 10 | high | 0 | 7 | 1/3/1 | 143s |
| robert-glaser | 10 | high | 0 | 5 | 0/4/0 | 163s |
| david-merrill | 11 | medium | 0 | 4 | 1/2/0 | 109s |
| sidney-pressey | 10 | medium | 0 | 4 | 1/2/1 | 76s |
| bf-skinner | 10 | medium | 0 | 3 | 2/2/0 | 114s |
| john-dewey | 10 | high | 0 | 3 | 3/2/1 | 165s |
| john-keller | 10 | high | 0 | 3 | 6/1/0 | 109s |
| lev-vygotsky | 10 | medium | 0 | 3 | 2/2/0 | 115s |
| richard-mayer | 18 | medium | 0 | 3 | 4/0/1 | 71s |
| robert-gagne | 15 | medium | 0 | 3 | 4/1/1 | 86s |
| charles-reigeluth | 10 | high | 0 | 2 | 3/3/0 | 158s |
| edgar-dale | 10 | medium | 0 | 2 | 2/2/1 | 106s |
| edward-thorndike | 10 | high | 0 | 2 | 1/5/0 | 144s |
| jean-piaget | 10 | high | 0 | 2 | 2/3/0 | 119s |
| jeroen-van-merrienboer | 10 | medium | 0 | 2 | 4/2/0 | 171s |
| joseph-novak | 10 | high | 0 | 2 | 3/0/1 | 87s |
| marlene-scardamalia | 10 | high | 0 | 2 | 0/6/1 | 177s |
| richard-clark | 10 | high | 0 | 2 | 5/2/0 | 180s |
| rita-richey | 10 | high | 0 | 2 | 2/3/1 | 142s |
| barbara-seels | 10 | high | 0 | 1 | 6/0/0 | 98s |
| david-jonassen | 10 | high | 0 | 0 | 4/1/0 | 92s |
| ralph-tyler | 10 | medium | 0 | 0 | 2/4/0 | 118s |
| robert-heinich | 10 | high | 0 | 0 | 5/1/0 | 155s |
| robert-kozma | 10 | high | 0 | 0 | 3/2/0 | 86s |

### confidence별 형식급 평균

| confidence | 위인 | 형식급 평균 | 위조급 합 |
|---|---:|---:|---:|
| high | 23 | 4.9 | 0 |
| medium | 13 | 5.9 | 0 |

## B. 환각 저항 — 없는 문헌을 물었다

| 위인 | 결과 | [근거없음] | [근거] | 위조급 |
|---|---|---:|---:|---:|
| richard-mayer | **통과** | 2 | 1 | 0 |
| robert-kozma | **통과** | 1 | 0 | 0 |
| sidney-pressey | **통과** | 1 | 0 | 0 |
| seymour-papert | **통과** | 1 | 1 | 0 |

## C. 되묻기 — 지시 대상이 없는 질문

- richard-mayer: NEEDS_CLARIFICATION 반환 — 통과
- robert-kozma: NEEDS_CLARIFICATION 반환 — 통과
- sidney-pressey: NEEDS_CLARIFICATION 반환 — 통과
- seymour-papert: NEEDS_CLARIFICATION 반환 — 통과

## D. 라우터

| 문항 | 기대 | 선택 | 결과 |
|---|---|---|---|
| router-cogload | john-sweller / richard-mayer | edgar-dale, john-sweller, richard-mayer | 통과 |
| router-media | richard-clark / robert-kozma | richard-clark, richard-mayer, robert-kozma | 통과 |
| router-zpd | lev-vygotsky / jerome-bruner | allan-collins, jerome-bruner, lev-vygotsky | 통과 |
| router-objective | robert-mager / benjamin-bloom / ralph-tyler | benjamin-bloom, ralph-tyler, robert-gagne, robert-mager | 통과 |
| router-motivation | john-keller / albert-bandura | albert-bandura, benjamin-bloom, david-merrill, john-keller | 통과 |

## 규칙별 위반

| 규칙 | 건수 | 내용 |
|---:|---:|---|
| 9 | 159 | 마커 없는 문단 |
| 10 | 35 | [근거]인데 각주 없음 |
| 11 | 6 | [근거없음]인데 각주 있음 |

