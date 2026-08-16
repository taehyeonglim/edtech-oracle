# 에듀테크 오라클 — 위키 스키마

이 파일이 위키 유지 규칙의 정본이다. 위키를 읽거나 쓰기 전에 이 파일을 따른다.

## 3계층

- `raw/` — 불변 원자료. 저작권 때문에 커밋하지 않는다. 목록은 `raw/MANIFEST.md`
- `wiki/` — 이 파일의 규칙을 따르는 마크다운. 커밋한다
- `CLAUDE.md` — 이 파일. 스키마 정본

## 페이지 타입

`pioneer` · `concept` · `debate` · `source` · `meta` — 다섯 개가 전부다.

## 프론트매터

전 타입 필수: `title`, `type`, `updated`(YYYY-MM-DD)

`pioneer` · `concept` · `debate` · `source` 추가 필수: `sources`(배열)

`pioneer` · `concept` · `debate` 추가 필수: `confidence`(`high` | `medium` | `low`)

**`source`에는 `confidence`를 두지 않는다.** 출처 페이지는 자기 자신만 인용하므로 그 값이 tier의 재진술이 된다.

`pioneer` 추가 필수: `slug`, `role`, `life`, `concepts`

`meta`(`index` · `log` · `router-map` · `KNOWN-ISSUES`)는 인용 규칙에서 면제된다.

## 각주

- 각주 id = `sources.json`의 `id`
- 각주 서지는 `sources.json`에 등록된 **제목을 그대로 담는다**. id만 맞고 저자·제목이 다르면 렌더된 각주가 없는 근거를 있는 것처럼 표시한다
- 정의는 반드시 `— tier <A|B|C> · [[sources/<id>]]`로 끝난다. 이 링크가 없으면 출처 페이지가 전부 고아가 된다
- 프론트매터 `sources` 배열 = 본문 각주 정의 집합 (정확히 일치)
- `##` 섹션마다 각주가 최소 1개 있어야 한다 (`meta` 제외)

## 출처 티어

티어는 출처가 인용된 페이지가 아니라 **출처 자체의 성격과 근거 역할**로 정한다.

| 티어 | 정의 | 제약 |
|---|---|---|
| A | 위인 본인의 원저작. 단행본이든 연구논문이든 형식을 가리지 않는다. 당사자가 직접 남긴 기록, 원문 아카이브도 A다 | 없음 |
| B | 후대의 종합서·편집서·교재·번역서, 타인이 쓴 학술 문헌, 학회·대학 등 기관의 공식 기록 | 없음 |
| C | 백과사전, 일반 참고 자료 | **단독 근거 금지** |

**판정 순서**

1. 위인 본인이 자기 데이터·논증·이론·모형을 처음 제시한 저작이면 형식과 관계없이 A다. 원저서와 원논문, 당사자의 회고·자서전·직접 기록, 원문 아카이브가 이 경로에 속한다.
2. 단행본과 수록 장은 실제 근거 역할을 본다. 새 이론·모형을 제시하는 원저작이면 A, 후대의 종합·편집·해설·교재·번역이면 B다. 본인이 공저자나 편집자라는 사실만으로 종합서를 A로 올리지 않는다.
3. 타인이 쓴 학술 문헌과 학회·대학 등 기관의 공식 약력·부고·기록은 B다.
4. 백과사전과 일반 참고 자료는 C이며 단독 근거로 쓰지 않는다.

`sources.json`의 모든 행은 `tier_review` 객체에 판정 완료를 기록한다. `rule`은 판정 순서에 대응하는 `1-original-work`·`2-book-or-chapter-role`·`3-other-scholar-or-institution`·`4-general-reference` 중 하나이고, `evidence`에는 자료형 기본값 또는 확인한 서지와 근거 역할을 적는다.

## confidence

페이지의 `confidence`는 **모든 `##` 섹션의 "그 섹션 최강 티어" 중 가장 약한 것**이다.

```
섹션 최강 티어 = 그 섹션이 참조한 각주들의 tier 중 최강 (A > B > C)
각주 없는 섹션 = 계산에서 제외
페이지 값       = 섹션 최강 티어들 중 최약
매핑            A → high · B → medium · C → low
```

`high`는 “모든 근거 있는 섹션에 tier A 원자료가 적어도 하나 있다”는 뜻이다. A에는 형식과 관계없는 위인 본인의 원저작·당사자 기록·원문 아카이브가 포함된다.

손으로 정하지 않는다. `npm run sync:confidence`가 계산해 채우고 규칙 8이 불일치를 잡는다.

**선언값에 맞추려고 각주를 고치지 마라.** 페이지를 쓸 때는 값을 아무렇게나 두고 `sync:confidence`를 돌린 뒤 나온 값을 받아들인다. 근거가 약하면 `medium`이 맞는 답이다 — `high`를 만들려고 각주를 추가하면 지표가 내용을 움직인다.

## 출처 확장 검증

기준 감사의 142개 id 밖에 추가되는 모든 출처는 `source_review.existence`와
`source_review.relation`을 각각 기록한다. 두 상태가 모두 `verified`이고 관계가
`authored_by`·`about`·`criticizes`일 때만 등재한다. `pending_manual`·`rejected`,
`context_only`, tier C는 확장 할당량에 넣지 않는다.

이 상태는 자동 진실 판정이 아니다. `curator`가 URL과 원문 위치를 대조해 판정하고,
`npm run verify:source-expansion`은 빈 근거·허용되지 않은 상태·id 불일치·중복·
동명이인 식별 신호 누락·주장 맵 누락을 검사한다.

## 답변 3마커

위인 에이전트의 모든 발언은 셋 중 하나를 단다.

- `[근거]` — 문헌에 직접 있는 주장. 각주 필수
- `[적용]` — 원리로부터의 추론. 출발 원리의 각주 필수 + 추론임을 명시
- `[근거없음]` — 문헌에 근거가 없다. **지어내지 않는다**

## 개념 페이지

`concepts/`는 유기적으로 자란다. pantheon에는 통제 어휘가 없어 기계적으로 공유되는 개념은 3개뿐이다.

새 개념 페이지는 **`sources.json`에 근거가 있을 때만** 만든다. 확장 작업 중에는 이미 존재하는 개념 페이지에만 링크하고, 새 개념은 프론트매터 `proposed_concepts: [...]`로 제안만 한다.

개념 파일명은 ASCII 슬러그를 쓴다 — macOS의 유니코드 정규화(NFD/NFC) 차이로 git이 한글 파일명을 다르게 보는 문제를 피한다.

## 검증

```bash
npm run lint          # 작성 중 — 규칙 6·7은 경고
npm run lint:strict   # 커밋 전·게이트 — 전부 오류
npm run lint:answers  # answers/ 답변 무결성 — 위조급만 exit 1
npm run sync:confidence  # confidence를 섹션 최약 근거로 다시 계산 (--dry로 미리보기)
npm run verify:source-expansion  # 현재까지 추가된 새 행·감사·완료 위인을 검사
npm run verify:source-expansion -- --pioneer <slug>  # 위인 한 명의 완료 트랜잭션을 검사
npm run verify:source-expansion -- --complete --review <path>  # 전체 확장과 완료 감사를 검사
npm test              # 파서·lint 단위 테스트
```

## 답변 게이트

위키는 `lint`가, 답변은 `lint:answers`가 검사한다. 답변은 `answers/`에 저장하며 `wiki/` 밖이다 —
안에 두면 lint 규칙 1·7이 깨진다. 규칙과 형식은 [`answers/README.md`](answers/README.md)가 정본이다.

핵심 규칙 하나만 옮기면, **위인은 자기 페이지 프론트매터 `sources`에 있는 출처만 인용할 수 있다.**
위인 격리(아래 "위키 수정 권한") 때문에 인용 가능 집합이 확정되어 있어 성립하는 검사다.

## 위키 수정 권한

`curator` 에이전트만 위키를 쓴다. 위인 에이전트는 `Read, Grep, Glob`만 가진다 — 답변 중 근거 DB를 오염시키지 못하게 한다.
