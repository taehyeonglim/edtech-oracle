너는 edtech-oracle 저장소에서 구현 계획의 **과제 2만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-tier-semantics.md` — **실행할 계획서.
   "### 과제 2: 위키 각주와 source 페이지의 tier 표기를 레지스트리에 묶는다" 절만 수행한다.
   전역 제약 절도 반드시 읽어라 — 지금이 어떤 중간 상태인지 적혀 있다**
2. `scripts/lint-wiki.mjs` — 과제 1에서 규칙 10이 이미 들어갔다. 규칙 11·12를 여기 붙인다
3. `test/lint-wiki.test.mjs` — 과제 1에서 이미 고쳤다. 이어서 붙인다
4. `scripts/wiki-parse.mjs` — `footnoteBlocks`, `sections` 시그니처 확인

## 수정해도 되는 파일 — 이 둘뿐이다

- `scripts/lint-wiki.mjs`
- `test/lint-wiki.test.mjs`

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `bot/`,
`scripts/`의 다른 파일, `docs/` 전체, `test/`의 다른 파일, `.codex-tasks/`.

**`sources.json`과 `wiki/`는 특히 건드리지 마라.** 레지스트리 판정은 과제 3,
표기 전파는 과제 4다. 지금 고치면 과제 순서가 무너진다.

## 수행할 것

계획서 과제 2의 **1~5단계**를 순서대로 수행한다.
**마지막 커밋 단계는 하지 마라.** `git add`도 `git commit`도 실행하지 않는다.
검토 후 사람이 커밋한다.

## 지금의 중간 상태 — 반드시 이해하고 시작하라

과제 1이 규칙 10을 세웠고, 현재 저장소는 **의도적으로** 다음 상태다.

- `npm run lint:strict` → **166건 실패**
  (`tier_review` 누락 142 + 티어 기본값 불일치 24)
- `npm test` → **162개 중 161개 통과, 1개 실패**
  실패하는 것은 `test/build-site.test.mjs`의
  `하위 디렉터리 자산도 산출물로 복사된다` 하나뿐이다.
  이 테스트는 실제 위키를 빌드하는데 `buildSite`가 strict lint를 선행하므로
  `sources.json`이 고쳐지는 과제 3까지 초록이 될 수 없다.

**이 둘을 고치려 하지 마라.** 규칙을 느슨하게 만들거나 테스트를 지우거나
`sources.json`을 미리 고치는 것은 전부 이 작업 전체를 무의미하게 만든다.

## 끝난 뒤의 기대 상태

- `node --test "test/lint-wiki.test.mjs"` → **통과** (규칙 11·12 신규 테스트 포함)
- `npm test` → **161 통과 / 1 실패.** 실패는 위의 그 한 건**뿐**이어야 한다.
  다른 테스트가 새로 깨졌다면 **원인을 보고하고 멈춰라**
- `npm run lint:strict` → 실패한다. 규칙 11·12가 새로 잡는 건수가 **늘어날 수 있다**.
  현재 위키 각주 꼬리와 레지스트리 tier가 어긋난 곳이 있기 때문이다.
  이것도 과제 4가 고칠 목록이므로 정상이다

마지막에 다음을 보고하라.

- `npm test` 결과 (통과/실패 수와 실패한 테스트 이름)
- `npm run lint:strict`의 규칙별 건수 — 규칙 10 / 11 / 12 각각 몇 건인지
- 수정한 파일과 무엇을 바꿨는지

## 규칙

- 계획서에 있는 테스트 코드와 구현 코드를 **그대로** 옮겨라. 지어내지 마라
- 규칙 11·12 구현은 기존 규칙 1~10의 코드 스타일과 `Finding` 형식을 따른다
- 한국어로 보고하라
