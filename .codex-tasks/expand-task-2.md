너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 2만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-source-expansion.md` —
   **"### 과제 2: 존재·관계 완결성과 중복 검사를 TDD로 구현한다" 절만 수행한다.
   `## 전역 제약` 절도 반드시 읽어라**
2. `docs/superpowers/specs/2026-08-16-source-expansion-design.md`의 **D2** 절 —
   존재·관계 두 축, 관계 kind, 동명이인 방어
3. `scripts/source-expansion-contracts.mjs` — 과제 1이 만든 계약.
   `deriveSourceReviewStatus`를 여기서 가져다 쓴다
4. `scripts/lint-wiki.mjs`의 `validateSourceTiers` — 재사용 대상
5. `test/source-expansion-contracts.test.mjs` — 과제 1의 테스트. 이어서 붙인다
6. `docs/superpowers/audits/source-expansion/baseline.json` — 142개 baseline id

## 수정해도 되는 파일 — 이 셋뿐이다

- 생성: `scripts/verify-source-expansion.mjs`
- 생성: `test/source-expansion.test.mjs`
- 수정: `test/source-expansion-contracts.test.mjs`

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `bot/`, `package.json`,
`scripts/`의 다른 파일, `test/`의 다른 파일, `docs/` 전체, `.codex-tasks/`의 다른 파일.

**`sources.json`과 `wiki/`를 절대 건드리지 마라.** 이 과제는 검사 로직만 만든다.
데이터 추가는 과제 5 이후다. `package.json`의 npm 스크립트 등록은 **과제 3**이므로
지금 하지 마라.

## 지금 상태 — 게이트가 전부 초록이다

- `npm test` → **174/174 전부 통과**
- `npm run lint:strict` → 오류 0 · 경고 0
- `npm run lint:answers` → exit 0 · 위조급 0

**끝난 뒤에도 전부 초록이어야 한다.** 이 과제는 데이터를 바꾸지 않으므로
의도된 빨간불이 없다. TDD 중 새 테스트가 잠시 실패하는 것은 정상이지만
작업이 끝난 시점에는 `npm test`가 전부 통과해야 한다.

## 수행할 것

계획서 과제 2의 단계를 순서대로. **마지막 커밋 단계는 하지 마라.**
`git add`·`git commit`을 실행하지 않는다.

## 이 과제의 핵심 — 무엇을 검사하고 무엇을 검사하지 못하는가

명세가 못 박았다. **자연어 근거가 참인지는 스크립트가 판결할 수 없다.**
`curator`가 URL과 원문 위치를 대조해 판정하고, 이 검사기는 다음만 잡는다.

- 빈 근거, 허용되지 않은 상태값
- 관계 kind가 `authored_by`·`about`·`criticizes`가 아닌 경우(`context_only` 포함)
- 고위험 동명이인(`John Keller`·`Richard Clark`·`Allan Collins`)의 식별 신호 누락
- 영구 식별자(DOI·ISBN·ERIC·OpenLibrary edition·OCLC) 중복과
  `(제목, 저자 집합, 연도)` fallback 중복
- baseline 142개 id 밖의 행에 `source_review`가 없는 경우

**"URL이 200을 반환한다"를 verified의 근거로 삼는 함수를 만들지 마라.**
그건 존재의 약한 증거일 뿐이고 관계는 전혀 증명하지 못한다. 명세가 그렇게 적었다.

## 끝난 뒤의 기대 상태

- `npm test` → **전부 통과** (174 + 새 테스트)
- `npm run lint:strict` → 오류 0 · 경고 0 유지
- `scripts/verify-source-expansion.mjs`가 네 export를 제공:
  `normalizePersistentIdentifier` · `bibliographicFallbackKey` ·
  `findSourceDuplicates` · `validateSourceReview`
- 현재 `sources.json` 142건은 baseline 안이므로 `validateSourceReview`가
  **오류를 내지 않아야 한다.** 기존 행에 `source_review`를 요구하면 안 된다

마지막에 보고하라.

- `npm test` 결과 (통과/실패 수)
- `npm run lint:strict` 결과
- 네 export 각각이 무엇을 검사하고 무엇을 검사하지 않는지
- 현재 142건에 `findSourceDuplicates`를 돌린 결과 (0이어야 정상이다. 아니면 보고하라)

## 규칙

- 계획서의 테스트 코드와 구현 코드를 **그대로** 옮겨라. 지어내지 마라
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- 한국어로 보고하라
