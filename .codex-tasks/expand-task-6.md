너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 6만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-source-expansion.md` —
   **"### 과제 6: 파일럿 결과로 반복 절차를 동결한다" 절만 수행한다.
   `## 전역 제약` 절도 읽어라**
2. `.codex-tasks/source-expansion/runbook.md` — 동결 대상
3. `docs/superpowers/audits/source-expansion/edgar-dale.json` — 파일럿이 실제로 만든 감사 기록.
   **이 모양을 재현할 수 있어야 한다**
4. `.codex-tasks/source-expansion/audit.schema.json` — 감사 스키마
5. `scripts/verify-source-expansion.mjs` · `scripts/source-expansion-packets.mjs`
6. `git log --oneline -6` — 파일럿 커밋 셋의 메시지에 발견 내용이 적혀 있다

## 수정해도 되는 파일

- 수정: `.codex-tasks/source-expansion/runbook.md`
- 생성: `scripts/source-expansion-audit.mjs` (아래 참조)
- 생성: `test/source-expansion-audit.test.mjs`
- 수정: `package.json` (npm 스크립트 항목 추가만)

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `bot/`, `docs/` 전체,
`scripts/`의 다른 파일, `test/`의 다른 파일, `.codex-tasks/`의 다른 파일.

**데이터를 하나도 바꾸지 마라.** 데일 트랜잭션은 이미 커밋됐다.

## 지금 상태 — 전부 초록이다

- `npm test` 214/214 · `npm run lint:strict` 0/0
- `npm run verify:source-expansion` exit 0 ("새 id 6건, 완료 감사 1건")
- `npm run verify:source-expansion -- --pioneer edgar-dale` exit 0

**끝난 뒤에도 전부 초록이어야 한다.**

## 파일럿에서 실제로 드러난 것 — 이것을 동결하라

데일 파일럿을 사람이 손으로 돌리며 나온 문제들이다. 30명을 이대로 돌리면
매번 같은 즉석 작업을 반복하고 매번 다르게 틀린다.

### 1. 감사 JSON을 손으로 만들었다

후보 JSON과 승인 목록에서 스키마에 맞는 감사 기록을 만드는 일이 즉석
파이썬이었다. 이것을 `scripts/source-expansion-audit.mjs`로 굳혀라.

입력: 후보 JSON 경로, slug, 승인 매핑(후보 → source id), baseline
출력: `audit.schema.json`을 만족하는 감사 JSON

승인되지 않은 후보도 **전부** `decision`과 `reason`을 갖고 남아야 한다.
데일에서 6건이 `pending_manual`이었고 그중 Dale–Chall 1948은
"JSTOR가 봇 차단 페이지만 반환하고 Crossref에도 없어 확인 못 했다"였다.
**`rejected`가 아니다.** 못 찾은 것과 없는 것을 구분하는 것이 이 Phase의 원칙이다.

### 2. 주장 추출이 줄 단위여서 틀렸다

`claim_map`의 주장 문자열은 **위키 본문에 실제로 있는 문장**이어야 하고
검증기가 그것을 대조한다. 처음에 줄 단위로 뽑았더니 한 문단에 각주가 둘 있을 때
같은 문자열이 두 출처에 배정됐다.

데일 `## 교사와 영화평론가의 시선`이 그 예다. 한 문단에 두 문장이 있고
각 문장이 자기 각주를 단다(`[^dale-1933]`, `[^dale-1935]`).

**각주 마커를 기준으로 잘라 그 각주가 받치는 문장만** 뽑아야 한다.
이 추출을 함수로 만들고 위 상황을 회귀 테스트로 고정하라.

### 3. `base_commit`이 두 번 어긋났다

감사의 `base_commit`은 검증기가 "허용 업무 파일 밖 변경"을 판정하는 기준이다.
파일럿에서 도구 수정 커밋이 끼는 바람에 두 번 어긋나 두 번 손으로 고쳤다.

**`base_commit`은 위인 커밋 직전에 현재 HEAD로 갱신해야 한다.**
runbook 절차에 이 단계를 명시하고, 가능하면 감사 생성기가 갱신하게 하라.

### 4. 도구 수정은 위인 트랜잭션과 분리 커밋해야 한다

파일럿에서 결함 둘을 고쳤는데 둘 다 위인 허용 파일 밖이었다.
검증기가 정확히 지적했고 커밋을 셋으로 나눴다.
runbook에 "도구 수정이 필요하면 별도 커밋으로 먼저 처리한다"를 명시하라.

## runbook에 추가로 반영할 것

- 위 네 가지
- 데일 실측 소요: 후보 12건 요청 → 존재 확인 9건 → 승인 6건.
  `max(2n, n+3)` 공식이 실제로 여유를 만들었다
- 웹 조회에서 마주친 것: OpenLibrary 503 레이트리밋, JSTOR·Taylor & Francis 봇 차단.
  **한 번의 실패를 부재로 판정하지 말고 재시도·다른 레지스트리를 거칠 것**

## 끝난 뒤의 기대 상태

- `npm test` 전부 통과 (214 + 새 테스트)
- `npm run lint:strict` 0/0 유지
- `npm run verify:source-expansion` exit 0 유지
- 새 스크립트로 **데일 감사 기록을 재현**할 수 있다. 기존
  `edgar-dale.json`과 의미상 같은 구조가 나오는지 확인해 보고하라
  (파일을 덮어쓰지는 마라)

마지막에 보고하라.

- `npm test` · `lint:strict` · `verify` 결과
- 새 스크립트의 export와 CLI 사용법
- 데일 감사 재현 결과와 기존 파일과의 차이
- runbook에 무엇을 더했는지

## 규칙

- 한국어로 쓴다
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- `git add`·`git commit`을 실행하지 마라
