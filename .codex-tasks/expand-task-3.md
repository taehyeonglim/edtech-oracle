너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 3만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-source-expansion.md` —
   **"### 과제 3: 위인별·진행·완료 검증기와 npm 게이트를 TDD로 세운다" 절만 수행한다.
   `## 전역 제약` 절도 반드시 읽어라**
2. `docs/superpowers/specs/2026-08-16-source-expansion-design.md`의 **검증 설계** 절 —
   위인별 모드와 전체 모드가 각각 무엇을 검사하는지 목록이 있다
3. `scripts/verify-source-expansion.mjs` — 과제 2가 만든 것. **여기에 이어 붙인다**
4. `scripts/audit-citation-years.mjs` — CLI 인자 처리와 exit code 관례의 본보기
5. `scripts/wiki-parse.mjs` — `loadPages`·`footnoteDefs`·`footnoteRefs`·`sections`
6. `test/helpers.mjs` — 임시 위키 fixture 관례
7. `docs/superpowers/audits/source-expansion/baseline.json`

## 수정해도 되는 파일 — 이 셋뿐이다

- 수정: `scripts/verify-source-expansion.mjs`
- 수정: `test/source-expansion.test.mjs`
- 수정: `package.json` (npm 스크립트 항목 추가만. 다른 필드 건드리지 마라)

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `bot/`,
`scripts/`의 다른 파일, `test/`의 다른 파일, `docs/` 전체, `.codex-tasks/`의 다른 파일.

**`sources.json`과 `wiki/`를 절대 건드리지 마라.** 검증기만 완성한다.

## 지금 상태 — 게이트가 전부 초록이다

- `npm test` → **194/194 전부 통과**
- `npm run lint:strict` → 오류 0 · 경고 0
- `npm run lint:answers` → exit 0 · 위조급 0

**끝난 뒤에도 전부 초록이어야 한다.** 데이터를 바꾸지 않으므로 의도된 빨간불이 없다.

## 이 과제가 닫는 것

`CLAUDE.md`가 이미 `npm run verify:source-expansion`을 문서화했지만 그 스크립트는
아직 실행되지 않는다. 이 과제가 그것을 실체화해 **준비 단계를 닫는다.**

세 모드가 필요하다.

| 모드 | 언제 |
|---|---|
| 기본 (인자 없음) | 진행 중 상태 검사. 지금까지 추가된 새 행·감사·완료 위인을 본다 |
| `--pioneer <slug>` | 위인 한 명의 완료 트랜잭션 검사 |
| `--complete --review <path>` | 전체 확장 완료 검사 |

## 반드시 만족해야 할 조건 — 지금 저장소에서 확인하라

**아직 아무 확장도 하지 않은 현재 상태에서 `npm run verify:source-expansion`은
exit 0이어야 한다.** 새 출처가 0건이므로 검사할 것이 없고, 그것은 실패가 아니다.

이것을 지키지 못하면 준비 커밋이 빨간불로 끝나고, 계획서 전역 제약이 정한
"준비 커밋 자체는 green으로 끝낸다"를 어긴다.

반대로 `--complete`는 **지금 실패해야 정상이다.** 새 116건이 아직 없기 때문이다.
계획서가 "`--complete` 미완료 진단만 의도적으로 red일 수 있다"고 적었다.
이 두 모드의 기대 동작을 혼동하지 마라.

## 수행할 것

계획서 과제 3의 단계를 순서대로. **마지막 커밋 단계는 하지 마라.**
`git add`·`git commit`을 실행하지 않는다.

## 끝난 뒤의 기대 상태

- `npm test` → **전부 통과** (194 + 새 테스트)
- `npm run lint:strict` → 오류 0 · 경고 0 유지
- `npm run verify:source-expansion` → **exit 0** (확장 전 상태에서 정상)
- `npm run verify:source-expansion -- --pioneer edgar-dale` → 아직 트랜잭션이
  없으므로 "미완료"를 진단한다. 이 동작이 무엇인지 보고하라
- `npm run verify:source-expansion -- --complete` → 실패(exit 1)가 정상

마지막에 보고하라.

- `npm test` 결과 · `npm run lint:strict` 결과
- 세 모드 각각의 실제 실행 결과와 exit code
- 다섯 export가 각각 무엇을 검사하는지
- `findCSoloSections`를 현재 위키에 돌린 결과 (데일 1건이 나와야 한다.
  다르면 그대로 보고하라)

## 규칙

- 계획서의 코드를 **그대로** 옮겨라. 지어내지 마라
- 자연어 근거의 진실을 판정하려 들지 마라. 검사기는 구조·상태·대응·중복·누락만 본다
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- 한국어로 보고하라
