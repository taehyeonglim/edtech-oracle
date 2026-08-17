너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 7**을 실행한다.
이번 실행의 대상은 **아래 4명**이다. 한 명씩 순서대로, 각각을 하나의 트랜잭션으로 끝낸다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 이번 실행 대상 — 남은 17명, 이 순서대로

**이미 끝난 14명은 건드리지 마라.** `docs/superpowers/audits/source-expansion/`에
감사 기록이 있는 위인이 그들이다.

| 부족분 | slug |
|---|---|
| +4 | `joseph-novak` · `marlene-scardamalia` · `michael-g-moore` · `robert-mager` · `thomas-gilbert` |
| +3 | `albert-bandura` · `david-jonassen` · `edward-thorndike` · `john-dewey` · `robert-kozma` |
| +2 | `jean-lave` · `richard-clark` · `walter-dick` |
| +1 | `bf-skinner` · `jerome-bruner` · `john-keller` · `lev-vygotsky` |

합계 17명 · 45건. 부족분이 큰 순서대로 한 명씩 처리한다.
시작 전 `npm run verify:source-expansion`이 "새 id 71건, 완료 감사 14건"으로
통과하는지 확인하라. 다르면 멈추고 보고하라.

**요청 후보 수는 부족분 n에 대해 `max(2n, n+3)`이다.** 부족분 1이면 4건,
2면 5, 3이면 6, 4면 8건을 요청한다.

**고위험 동명이인 — `richard-clark` · `john-keller`가 이번 대상에 남아 있다.**
이들의 `authored_by` 후보는 정규 이름 외에 **독립 식별 신호 2개**가 필요하고
그중 하나는 공식 소속/CV 또는 ORCID·VIAF·도서관 인명 전거여야 한다.
`allan-collins`에서는 BBN 소속과 공저자망으로 확인해 통과했다. 같은 수준을 요구한다.

부족분이 1~2인 위인은 문헌이 넘치지만 **이미 등재된 것과 중복되지 않는 것**을
찾아야 한다. 중복 색인을 반드시 확인하라.

**한 위인이 끝날 때마다 진행 상황을 stdout에 한 줄로 남겨라.**

## 먼저 읽어라 (반드시)

1. `.codex-tasks/source-expansion/runbook.md` — **실행 절차의 정본. 이대로 한다**
2. `docs/superpowers/specs/2026-08-16-source-expansion-design.md` — D1·D2·D5
3. `docs/superpowers/plans/2026-08-16-source-expansion.md`의 `## 전역 제약`과 `### 과제 7`
4. `docs/superpowers/audits/source-expansion/edgar-dale.json` — **파일럿 산출물. 이 모양을 따른다**
5. `wiki/pioneers/edgar-dale.md` — 확장이 끝난 위인 페이지의 모습
6. `CLAUDE.md` — 티어 판정 순서와 각주 규칙

## 한 위인당 절차

runbook의 1~5단계를 그대로 따른다. 요약하면:

1. 패킷 빌더로 수집 프롬프트를 만들고 `codex --search exec ... -s read-only`로 후보를 받는다
   (요청 후보 수는 `candidateRequestCount(6) = 12`)
2. **후보의 존재와 관계를 각각 판정한다** — 아래 규율을 지켜라
3. 승인 6건을 `sources.json`에 등재하고 `wiki/sources/<id>.md` 6개를 만든다
4. `scripts/source-expansion-audit.mjs`로 감사 기록을 만든다
5. 작성 패킷으로 `codex exec ... -s workspace-write` 본문 서술
6. `sync:confidence` → 게이트 → 커밋

## 판정 규율 — 이것을 어기면 이 작업 전체가 무의미하다

**존재 검증**

- DOI는 `https://api.crossref.org/works/<doi>`로 확인한다. `doi.org` 리다이렉트의
  403·404는 출판사 봇 차단일 수 있으니 부재 판정 근거로 쓰지 마라
- 단행본은 `https://openlibrary.org/books/<edition>.json`으로 확인한다.
  **503이 자주 난다. 6~8초 간격으로 최대 5회 재시도하라.** 한 번의 실패를
  부재로 판정하면 진짜 문헌을 버린다 (파일럿에서 실제로 그럴 뻔했다)
- ERIC은 `https://eric.ed.gov/?id=<ED/EJ번호>`
- **어디에서도 확인하지 못하면 `rejected`가 아니라 `pending_manual`이다.**
  "못 찾았다"와 "없다"는 다르다. 파일럿에서 Dale–Chall 1948이 그랬다 —
  유명한 문헌이지만 JSTOR가 봇 차단만 반환하고 Crossref에도 없어 승인하지 않았다

**관계 검증**

- `authored_by`는 레코드의 저자란이 그 위인임을 확인해야 한다.
  `person_role`은 `author`·`editor`·`interviewee` 중 하나다
- `about`·`criticizes`는 제목·초록·본문에서 그 위인이나 이론을 **직접 다루는 위치**가
  있어야 한다. 참고문헌에 이름이 한 번 나오는 것으로는 부족하다
- `context_only`는 승인하지 않는다
- **동명이인을 조심하라.** 특히 이번 4명 중에는 고위험 이름이 없지만,
  `authored_by`에는 독립 식별 신호가 최소 하나 필요하다
  (`{kind, value, evidence_url}` 형태)

**tier 판정**

- `CLAUDE.md`의 판정 순서를 따른다. 위인 본인의 원저작이면 단행본이든 연구논문이든 A,
  후대의 종합·편집·교재·번역과 타인의 학술 문헌은 B
- **새 행에 tier C는 허용되지 않는다**
- 레지스트리 메타데이터로 tier를 유도하지 마라. Crossref는 원저작인지
  후대 종합서인지 답하지 않는다

**주장 배정**

- 승인 id마다 **서로 다른** 실질 주장 하나씩. 같은 문장에 새 각주를 몰아 달지 마라
- 주장은 그 위인 페이지의 기존 섹션에 들어간다. 없는 섹션을 새로 만들지 마라

## 커밋 규칙

- **한 위인이 한 커밋이다.** 부분 커밋 금지 — 승인 6건 전부가 등재·서술·게이트를
  통과해야 커밋한다. 5건만 되면 그 위인은 커밋하지 말고 다음으로 넘어가라
- 커밋 전 반드시 다음이 전부 통과해야 한다:
  - `npm run lint:strict` 오류 0
  - `npm test` 전부 통과
  - `npm run verify:source-expansion -- --pioneer <slug>` exit 0
  - `npm run sync:confidence -- --dry` 갱신 0 (본문 완료 후 sync를 먼저 돌린 뒤)
  - `npm run lint:answers` exit 0
- `base_commit`은 커밋 **직전** 현재 HEAD로 갱신한다 (감사 생성기가 한다)
- **위인 트랜잭션이 수정할 수 있는 파일은 넷뿐이다**:
  `sources.json` · 그 위인의 새 `wiki/sources/<id>.md` · `wiki/pioneers/<slug>.md` ·
  `docs/superpowers/audits/source-expansion/<slug>.json`
  그 밖의 파일을 고쳐야 하면 **별도 커밋으로 먼저** 처리하라
- 커밋 메시지는 한국어 본문으로, 무엇을 왜 승인/보류했는지 적어라.
  마지막 두 줄은 다음을 그대로 넣어라:

```
Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01QYVCqMux32CsiPvVucqxwc
```

## 절대 금지

- `CLAUDE.md`, `scripts/`, `test/`, `bot/`, `answers/`, `package.json`,
  `docs/superpowers/specs/`, `docs/superpowers/plans/` 수정
- 서지를 지어내는 것. 확인하지 않은 URL을 근거로 적는 것
- 게이트가 빨간 상태로 커밋하는 것
- 승인 수를 채우려고 검증을 느슨하게 하는 것
- `git push` (푸시는 사람이 한다)

## 실패했을 때

한 위인이 10건을 못 채우면 **그 위인은 커밋하지 말고** 작업 트리를 그 위인 시작
시점으로 되돌린 뒤(`git checkout -- .` 및 새로 만든 파일 삭제) 다음 위인으로 넘어가라.
어느 위인이 왜 실패했는지 마지막 보고에 반드시 적어라.

## 마지막에 보고하라

- 위인별 결과: 승인 수 · 커밋 여부 · 커밋 해시 · confidence 변화
- 보류·탈락한 후보와 그 이유 (특히 `pending_manual`)
- 최종 `sources.json` 건수와 `npm run verify:source-expansion` 결과
- 실패한 위인이 있으면 원인

한국어로 보고하라.
