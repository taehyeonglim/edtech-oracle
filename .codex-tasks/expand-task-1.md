너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 1만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-source-expansion.md` —
   **"### 과제 1: 확장 계약·출력 스키마·142건 baseline을 먼저 고정한다" 절만 수행한다.
   `## 전역 제약` 절도 반드시 읽어라**
2. `docs/superpowers/specs/2026-08-16-source-expansion-design.md` — 근거 명세.
   특히 D2(존재·관계 검증)
3. `CLAUDE.md` — 위키 스키마 정본. 과제 1이 여기를 고친다
4. `scripts/lint-wiki.mjs` · `scripts/audit-citation-years.mjs` — 코드 스타일
5. `test/lint-wiki.test.mjs` · `test/citation-years.test.mjs` · `test/helpers.mjs` — 테스트 관례

## 수정해도 되는 파일 — 이것뿐이다

- 수정: `CLAUDE.md`
- 생성: `scripts/source-expansion-contracts.mjs`
- 생성: `test/source-expansion-contracts.test.mjs`
- 생성: `.codex-tasks/source-expansion/candidate-output.schema.json`
- 생성: `.codex-tasks/source-expansion/writer-output.schema.json`
- 생성: `.codex-tasks/source-expansion/audit.schema.json`
- 생성: `docs/superpowers/audits/source-expansion/baseline.json`

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `bot/`, `package.json`,
`scripts/`의 다른 파일, `test/`의 다른 파일, `docs/`의 다른 파일,
`.codex-tasks/`의 다른 파일.

**`sources.json`과 `wiki/`를 절대 건드리지 마라.** 이 과제는 계약과 검사 도구를
세울 뿐 데이터를 하나도 바꾸지 않는다. 출처 추가는 과제 5 이후다.

## 지금 상태 — 게이트가 전부 초록이다

Phase 1이 끝나 현재 저장소는 다음 상태다.

- `npm run lint:strict` → 오류 0 · 경고 0
- `npm test` → 171/171 전부 통과
- `npm run lint:answers` → exit 0 · 위조급 0
- `npm run sync:confidence -- --dry` → 갱신/제거/건너뜀 0/0/0
- `npm run audit:citation-years` → exit 0 · 후보 48 · 비교 불가 104

**Phase 1과 다르다.** 그때는 검사기를 먼저 세워 의도적으로 빨간 상태를 만들었다.
이번 과제는 데이터를 바꾸지 않으므로 **끝난 뒤에도 위 게이트가 전부 초록이어야 한다.**
TDD 과정에서 새 테스트가 잠시 실패하는 것은 정상이지만, **작업이 끝난 시점에는
`npm test`가 전부 통과해야 한다.**

## `CLAUDE.md` 수정 범위 — 넘지 마라

계획서가 지정한 범위는 각주·tier·confidence 계약 절과 검증 절이다.
**새 확장 계약을 설명하는 내용만 더한다.** Phase 1이 확정한 티어 판정 순서와
`tier_review` 계약은 **그대로 둔다.** 지우거나 고쳐 쓰지 마라.

## 수행할 것

계획서 과제 1의 단계를 순서대로. **마지막 커밋 단계는 하지 마라.**
`git add`·`git commit`을 실행하지 않는다. 검토 후 사람이 커밋한다.

## 주의 — baseline은 지금 저장소에서 계산하라

`docs/superpowers/audits/source-expansion/baseline.json`은 손으로 적은 숫자가 아니라
**실제 계산 결과**여야 한다. 계획서에 적힌 값(142건, 31명, 116건, 후보 48 / 비교불가 104)과
다르면 **맞추려고 조정하지 말고 그대로 두고 보고하라.**

## 끝난 뒤의 기대 상태

- `npm test` → **전부 통과** (기존 171 + 새 테스트)
- `npm run lint:strict` → **오류 0 · 경고 0 유지**
- `npm run lint:answers` → exit 0 유지
- 세 JSON Schema가 유효한 Draft 2020-12 문서
- baseline.json이 실제 계산값

마지막에 보고하라.

- `npm test` 결과 (통과/실패 수)
- `npm run lint:strict` 결과
- baseline.json의 주요 집계값과 계획서 값과 일치하는지
- 만든 파일과 각 export의 역할
- `CLAUDE.md`에 무엇을 더했는지 (지운 것이 있으면 반드시 밝혀라)

## 규칙

- 계획서의 테스트 코드와 구현 코드를 **그대로** 옮겨라. 지어내지 마라
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- 한국어로 보고하라
