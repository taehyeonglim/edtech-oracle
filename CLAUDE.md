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

| 티어 | 정의 | 제약 |
|---|---|---|
| A | 원저작, 당사자 기록, 원문 아카이브 | 없음 |
| B | 피어리뷰 논문, 학술서, 학회·대학 공식 기록 | 없음 |
| C | 백과사전, 일반 참고 자료 | **단독 근거 금지** |

## confidence

페이지의 `confidence`는 **모든 `##` 섹션의 "그 섹션 최강 티어" 중 가장 약한 것**이다.

```
섹션 최강 티어 = 그 섹션이 참조한 각주들의 tier 중 최강 (A > B > C)
각주 없는 섹션 = 계산에서 제외
페이지 값       = 섹션 최강 티어들 중 최약
매핑            A → high · B → medium · C → low
```

`high`는 "모든 섹션이 원저작으로 받쳐져 있다"는 뜻이다. 페이지 전체를 한 덩어리로 보면 위인은 자기 대표 저작(tier A)을 반드시 인용하므로 언제나 high가 된다 — 섹션 단위로 봐야 "연표만 2차 문헌으로 받쳐져 있다"가 드러난다.

손으로 정하지 않는다. `npm run sync:confidence`가 계산해 채우고 규칙 8이 불일치를 잡는다.

**선언값에 맞추려고 각주를 고치지 마라.** 페이지를 쓸 때는 값을 아무렇게나 두고 `sync:confidence`를 돌린 뒤 나온 값을 받아들인다. 근거가 약하면 `medium`이 맞는 답이다 — `high`를 만들려고 각주를 추가하면 지표가 내용을 움직인다.

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
npm test              # 파서·lint 단위 테스트
```

## 답변 게이트

위키는 `lint`가, 답변은 `lint:answers`가 검사한다. 답변은 `answers/`에 저장하며 `wiki/` 밖이다 —
안에 두면 lint 규칙 1·7이 깨진다. 규칙과 형식은 [`answers/README.md`](answers/README.md)가 정본이다.

핵심 규칙 하나만 옮기면, **위인은 자기 페이지 프론트매터 `sources`에 있는 출처만 인용할 수 있다.**
위인 격리(아래 "위키 수정 권한") 때문에 인용 가능 집합이 확정되어 있어 성립하는 검사다.

## 위키 수정 권한

`curator` 에이전트만 위키를 쓴다. 위인 에이전트는 `Read, Grep, Glob`만 가진다 — 답변 중 근거 DB를 오염시키지 못하게 한다.
