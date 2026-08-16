너는 edtech-oracle 저장소에서 **연도 감사 164쌍을 전수 판정**한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라

1. `docs/superpowers/plans/2026-08-16-tier-semantics.md`의 **"### 과제 7"** 절
2. `docs/superpowers/specs/2026-08-16-tier-semantics-design.md`의 **D3** 절 —
   왜 이 감사가 비차단인지, 무엇이 거짓 양성인지
3. `scripts/audit-citation-years.mjs` — `validateCitationYearReview`가 무엇을 검사하는지

## 만들 파일

`docs/superpowers/audits/2026-08-16-citation-years.json`

## 고쳐도 되는 파일

- 위 감사 기록 파일 (생성)
- `wiki/pioneers/*.md` · `wiki/concepts/*.md` · `wiki/debates/*.md` —
  **실제 오귀착으로 확정한 각주만.** 판정 없이 손대지 마라
- `sources.json` — **`year` 필드 오류를 확정했을 때만.** `tier`·`type`·`tier_review`는
  절대 건드리지 마라. 그 판정은 이미 끝났다

## 절대 수정 금지

`CLAUDE.md`, `scripts/`, `test/`, `bot/`, `answers/`, `package.json`,
`docs/`의 다른 파일, `.codex-tasks/`.

## 이미 처리된 것 — 기록에는 넣되 다시 고치지 마라

`wiki/pioneers/edgar-dale.md:25`의 `1969 > dale-1946:1946`은 **실제 오귀착이었고
이미 고쳤다.** 1946년 초판 각주가 1969년 3판의 변경을 뒷받침하고 있었다.
`[^dale-1946]`을 그 줄에서 제거했고 `[^molenda-2003-cone]`만 남겼다.

따라서 지금 `npm run audit:citation-years`를 돌리면 **후보 50건**이 나온다.
그러나 감사 기록에는 **수정 전 51건**을 담는다. 검증기 기본값도 51이다.
데일 항목은 `decision: "remove-citation"`으로, 이유에 이미 수정했음을 적는다.

## 판정 방법

각 항목의 `key`는 감사기가 출력하는 식별자와 같아야 한다.
`npm run audit:citation-years -- --json`으로 정확한 key 목록을 얻어라.

`decision`은 넷 중 하나다.

| 값 | 언제 |
|---|---|
| `valid-context` | 거짓 양성. 한 문단에 여러 연도와 여러 출처가 섞여 있을 뿐, 그 출처가 그 연도 주장을 받치는 것이 아니다 |
| `remove-citation` | 실제 오귀착. 그 각주가 그 주장을 받칠 수 없다. 각주를 제거한다 |
| `replace-citation` | 실제 오귀착이지만 받칠 수 있는 다른 등재 출처가 있다. 각주를 교체한다 |
| `metadata-corrected` | 출처의 `year`가 틀렸던 경우. `sources.json`의 `year`를 고친다 |

`reason`은 **왜 그렇게 판정했는지**를 한 문장으로. 무엇을 확인했는지 적어라.

## 주의 — 이 감사의 함정

명세가 이미 진단해 뒀다. 후보 상당수는 **연표나 마지막 문단에서 생애 사건 연도와
그 위인의 옛 저작 인용이 한 문단에 함께 있는** 경우다. 예를 들어
`albert-bandura.md:45 2021 > bandura-1997:1997`의 2021은 반두라의 **사망 연도**이고
1997년 저작이 그 사망을 뒷받침하는 것이 아니다. 이런 것은 `valid-context`다.

**그러나 전부를 `valid-context`로 밀어 버리지 마라.** 데일 건은 진짜였다.
같은 유형이 더 있는지 찾는 것이 이 작업의 목적이다. 특히 다음을 의심하라.

- **판본 문제** — 초판 각주가 개정판의 변경을 받치는 경우 (데일이 그랬다)
- 후대 사건을 그보다 오래된 저작으로 받치는 경우 — 그 저작이 미래를 말할 수 없다
- 주장의 연도가 그 문장의 **핵심**인데 출처가 그보다 오래된 경우

각 항목마다 **해당 파일의 그 줄을 실제로 읽고** 판정하라. 줄 번호는 감사기가 준다.

## 절대 규칙

1. **모르면 고치지 마라.** 확신이 없으면 `valid-context`로 두고 `reason`에
   확인하지 못한 점을 적어라. 근거 없이 각주를 지우면 정상 근거를 잃는다
2. 각주를 제거·교체하면 **프론트매터 `sources` 배열도 함께 맞춰야 한다** —
   CLAUDE.md 규칙: 프론트매터 `sources` = 본문 각주 정의 집합, 정확히 일치.
   각주 정의가 그 파일에서 완전히 사라지면 프론트매터에서도 빼야 한다
3. `git add`·`git commit`을 실행하지 마라

## 끝난 뒤 반드시 확인하라

```bash
npm run audit:citation-years -- --review docs/superpowers/audits/2026-08-16-citation-years.json
npm run lint:strict
npm test
npm run sync:confidence -- --dry
```

- 판정 기록 검증이 **오류 0**이어야 한다 (후보 51 · 비교 불가 113 · 모든 항목에
  decision과 reason)
- `lint:strict`가 **오류 0 · 경고 0**을 유지해야 한다
- `npm test`가 **전부 통과**해야 한다
- 각주를 고쳤다면 `sync:confidence --dry`에 변화가 나올 수 있다. 나오면 보고만 하고
  적용하지 마라

## 보고할 것

- 판정 분포: `valid-context` N건 · `remove-citation` N건 · `replace-citation` N건 ·
  `metadata-corrected` N건
- **실제 오귀착으로 확정한 것 전부**를 파일·줄·이유와 함께 나열하라. 데일 외에
  몇 건이 더 나왔는지가 이 작업의 핵심 결과다
- 위 네 명령의 결과
- 한국어로 보고하라
