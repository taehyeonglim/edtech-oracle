너는 edtech-oracle 저장소에서 구현 계획의 **과제 6만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-tier-semantics.md` —
   **"### 과제 6: 비차단 인용 연도 감사기와 완료 검증기를 구현한다" 절만 수행한다.**
   전역 제약 절도 읽어라
2. `docs/superpowers/specs/2026-08-16-tier-semantics-design.md`의 D3 절 — 왜 비차단인지
3. `scripts/wiki-parse.mjs` — `loadPages`, `footnoteRefs` 시그니처
4. `scripts/lint-wiki.mjs` — 코드 스타일
5. `test/helpers.mjs` · `test/lint-wiki.test.mjs` — 테스트 관례

## 수정해도 되는 파일 — 이 셋뿐이다

- 생성: `scripts/audit-citation-years.mjs`
- 생성: `test/citation-years.test.mjs`
- 수정: `package.json` (스크립트 항목 추가만)

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `scripts/`의 다른 파일,
`test/`의 다른 파일, `bot/`, `docs/`, `.codex-tasks/`.

**`wiki/`를 절대 고치지 마라.** 데일 오귀착 수정과 164쌍 판정은 과제 7이다.
이 과제는 **감사기를 만들 뿐 아무것도 고치지 않는다.**

## 지금 상태 — 과제 5까지 끝났고 게이트는 초록이다

- `npm run lint:strict` → **오류 0 · 경고 0**
- `npm test` → **164/164 전부 통과**
- `npm run lint:answers` → 위조급 0

**이 초록을 깨뜨리지 마라.** 새 감사 명령은 `lint:strict`에 연결하지 않는다.
후보가 있어도 `exit 0`이고, 파싱 실패만 비정상 종료한다. 명세가 그렇게 정했다 —
후보 51쌍 중 상당수가 정상 혼합 인용이라 차단하면 정상 문단이 대량 실패한다.

## 수행할 것

계획서 과제 6의 단계를 순서대로. **마지막 커밋 단계는 하지 마라.**
`git add`·`git commit`을 실행하지 않는다.

## 기준선 — 반드시 확인하고 보고하라

계획서와 명세는 현재 저장소에서 **비교 가능한 후보 51쌍, 비교 불가 113쌍**을
기준선으로 잡았다. 구현이 끝나면 `npm run audit:citation-years`를 돌려 이 수가
나오는지 확인하라.

- 수가 다르면 **고쳐서 맞추지 말고 그대로 보고하라.** 기준선은 과제 4에서
  각주 꼬리 178곳이 바뀌기 전에 잰 값이라 달라질 수 있다. 다만 달라졌다면
  왜 달라졌는지(문단 분리 방식인지, 각주 id의 연도 제거 순서인지, 아니면
  과제 4의 변경 때문인지)를 진단해 보고하라
- `wiki/pioneers/edgar-dale.md`의 `1969 > dale-1946: 1946`이 후보에 **반드시**
  포함돼야 한다. 빠졌으면 추출기가 틀린 것이다

## 끝난 뒤의 기대 상태

- `npm test` → **전부 통과.** 새 테스트 포함. 하나라도 깨지면 원인을 보고하고 멈춰라
- `npm run lint:strict` → **오류 0 · 경고 0 유지**
- `npm run audit:citation-years` → **exit 0.** 후보가 있어도 0이어야 한다

마지막에 보고하라.

- `npm test` 결과
- `npm run lint:strict` 결과
- 감사 결과: 비교 가능 후보 N쌍 · 비교 불가 M쌍, 기준선(51/113)과 같은지
- 데일 `1969 > dale-1946` 포함 여부
- 만든 파일과 각 함수의 역할

## 규칙

- 계획서의 테스트 코드와 구현 코드를 **그대로** 옮겨라. 지어내지 마라
- 접근일을 발행연도로 대신하지 마라. `year`가 없는 출처는 "비교 불가"다
- 한국어로 보고하라
