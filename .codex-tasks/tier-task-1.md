너는 edtech-oracle 저장소에서 구현 계획의 **과제 1만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-tier-semantics.md` — **실행할 계획서.
   "### 과제 1: 정본 판정 순서와 출처 레지스트리 lint를 먼저 세운다" 절만 수행한다.
   과제 2 이후는 손대지 않는다**
2. `docs/superpowers/specs/2026-08-16-tier-semantics-design.md` — 근거 명세
3. `scripts/lint-wiki.mjs` — 규칙 1~9가 실제로 어떻게 구현돼 있는지. 규칙 10을 여기 붙인다
4. `test/lint-wiki.test.mjs` · `test/helpers.mjs` — 테스트 관례

## 수정해도 되는 파일 — 이 셋뿐이다

- `CLAUDE.md`
- `scripts/lint-wiki.mjs`
- `test/lint-wiki.test.mjs`

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `bot/`, `scripts/`의 다른 파일,
`docs/` 전체, `package.json`, `.codex-tasks/`.

특히 **`sources.json`은 건드리지 마라.** 142행에 `tier_review`를 채우는 것은
과제 3이고, 지금 하면 과제 순서가 무너진다.

## 수행할 것

계획서 과제 1의 **1~4단계**를 순서대로 수행한다.

1. 1단계 — 실패하는 레지스트리 테스트를 쓴다 (계획서의 테스트 코드를 그대로 쓴다)
2. 2단계 — 실패를 확인한다
3. 3단계 — `CLAUDE.md`를 계획서의 문안으로 교체하고 규칙 10을 최소 구현한다
4. 4단계 — 통과를 확인한다

**5단계(커밋)는 하지 마라.** 검토 후 사람이 커밋한다. `git add`도 `git commit`도 실행하지 않는다.

## 끝난 뒤의 기대 상태 — 이대로 되어야 한다

- `node --test "test/lint-wiki.test.mjs"` → **통과**
- `npm test` → **통과**
- `npm run lint:strict` → **실패한다. 이것이 정상이다.**
  규칙 10이 `sources.json` 142행의 `tier_review` 누락을 보고하기 때문이다.
  계획서가 "검사기 도입 뒤 lint:strict의 실패는 의도된 중간 상태"라고 명시했다.
  **이 실패를 없애려고 `sources.json`을 고치거나 규칙을 느슨하게 만들지 마라.**
  그것이 이 과제의 목적이다 — 검사기를 먼저 세워 고칠 대상을 드러내는 것.

마지막에 다음을 보고하라.

- `npm test` 결과 (통과/실패 수)
- `npm run lint:strict`의 규칙 10 보고 건수
- 수정한 파일 목록과 각 파일에서 무엇을 바꿨는지

## 규칙

- `CLAUDE.md` 교체 문안은 계획서 3단계에 그대로 있다. **지어내지 말고 그대로 옮겨라.**
  `## 출처 티어` 절과 `## confidence` 절의 첫 문장까지가 교체 범위다
- 규칙 10 구현은 기존 규칙 1~9의 코드 스타일과 `Finding` 형식을 따른다
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- 한국어로 보고하라
