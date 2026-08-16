너는 edtech-oracle 저장소에서 Phase 2 구현 계획의 **과제 4만** 실행한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `docs/superpowers/plans/2026-08-16-source-expansion.md` —
   **"### 과제 4: Codex 입력 패킷·추적 가능한 프롬프트·재사용 실행 절차를 만든다" 절만
   수행한다. `## 전역 제약` 절도 반드시 읽어라**
2. `docs/superpowers/specs/2026-08-16-source-expansion-design.md`의 **D1**(3단계 권한 분리)과
   **D2**(존재·관계) 절
3. `.codex-tasks/batch-1.md` — 2026-08-14에 **성공한** 확장 배치 프롬프트.
   `## 먼저 읽어라` / `## 담당 파일` / `## 절대 수정 금지` / `## 절대 규칙` 구조를 참고하라
4. `.codex-tasks/source-expansion/*.schema.json` — 과제 1이 만든 출력 스키마.
   프롬프트가 이 스키마를 따르게 해야 한다
5. `scripts/source-expansion-contracts.mjs` — `candidateRequestCount` 등
6. `scripts/verify-source-expansion.mjs` — 검증기가 무엇을 요구하는지

## 수정해도 되는 파일 — 이 다섯뿐이다

- 생성: `scripts/source-expansion-packets.mjs`
- 생성: `test/source-expansion-packets.test.mjs`
- 생성: `.codex-tasks/source-expansion/collect.md`
- 생성: `.codex-tasks/source-expansion/write.md`
- 생성: `.codex-tasks/source-expansion/runbook.md`

## 절대 수정 금지

`sources.json`, `wiki/` 전체, `answers/`, `CLAUDE.md`, `bot/`, `package.json`,
`scripts/`의 다른 파일, `test/`의 다른 파일, `docs/` 전체,
`.codex-tasks/`의 다른 파일.

**이 과제도 데이터를 하나도 바꾸지 않는다.** 실제 후보 수집과 등재는 과제 5 파일럿부터다.
지금은 패킷 빌더와 정적 프롬프트, 실행 절차 문서만 만든다.

## 지금 상태 — 게이트가 전부 초록이다

- `npm test` → **208/208 전부 통과**
- `npm run lint:strict` → 오류 0 · 경고 0
- `npm run verify:source-expansion` → exit 0

**끝난 뒤에도 전부 초록이어야 한다.**

## 이 과제의 핵심 — 최소 권한

D1이 정한 세 권한을 프롬프트와 패킷이 **구조적으로** 강제해야 한다.

**수집 패킷(`collect.md` + `buildCollectorPacket`)**

- `-s read-only`로 실행된다. **파일을 쓸 수 없다.** 최종 JSON을 stdout으로만 낸다
- 포함: 대상 위인, 부족분, 요청 후보 수(`candidateRequestCount`), 그 위인의 기존 출처
  id·정규화 서지·영구 식별자(**중복 회피용**), 출력 스키마
- **제외: 최종 id·tier·`verified` 결정 권한.** 수집기는 후보를 제안할 뿐 승인하지 않는다.
  프롬프트에 "너는 tier를 정하지 않는다"를 명시하라
- 존재·관계의 **근거 후보**(URL·식별자·본문 위치)를 내되 스스로 `verified`라고 선언하지 않는다

**작성 패킷(`write.md` + `buildWriterPacket`)**

- `-s workspace-write`로 실행된다
- 포함: 현재 위인 페이지, 기존 각주, **그 위인에게 승인된 새 id만**
- **제외: 전체 `sources.json`, 다른 위인의 승인 id, 보류·탈락 후보.**
  2026-08-14 배치의 절대 규칙 1을 그대로 계승하라 —
  "여기 없는 출처는 존재하지 않는다"
- 레지스트리 행이나 source 페이지를 만들지 않는다. 그건 `curator`의 일이다

**`runbook.md`** — 위인 한 명을 처리하는 재사용 절차. `(slug, 부족분)`만 바꿔
31번 실행할 수 있어야 한다. 실제 `codex exec` 명령을 `-s`와 함께 적어라.
전역 설정이 `danger-full-access`이므로 `-s` 생략은 권한 분리를 무너뜨린다.

## 반드시 지켜야 할 것

1. **`confidence` 목표값을 프롬프트에 넣지 마라.** 계획서 전역 제약이다.
   "high를 만들어라"는 지시는 지표가 내용을 움직이게 한다
2. **작성 패킷이 한 문장에 새 각주 여러 개를 몰아 달게 하지 마라.**
   새 출처 하나는 서로 다른 고유 주장 하나를 받쳐야 한다
3. 동적 산출물(후보 JSON·원문 발췌·로그)은 저장소 밖 `mktemp -d` 디렉터리로 간다.
   정적 프롬프트와 절차만 `.codex-tasks/source-expansion/`에 커밋한다

## 끝난 뒤의 기대 상태

- `npm test` → **전부 통과** (208 + 새 테스트)
- `npm run lint:strict` → 오류 0 · 경고 0 유지
- `node scripts/source-expansion-packets.mjs collect --pioneer edgar-dale --missing 6`이
  실제로 돌아 패킷 JSON을 낸다
- 그 패킷에 **데일의 기존 출처 4건이 중복 회피용으로 들어 있고,
  tier 결정 권한이나 다른 위인 정보는 없다**

마지막에 보고하라.

- `npm test` · `npm run lint:strict` 결과
- `collect --pioneer edgar-dale --missing 6` 실행 결과와 패킷에 포함/제외된 것
- 두 프롬프트가 각각 무엇을 금지하는지
- `runbook.md`가 적은 실제 codex 명령

## 규칙

- 계획서의 코드를 **그대로** 옮겨라. 지어내지 마라
- 프롬프트는 한국어로 쓴다
- 기존 테스트를 깨뜨리지 마라. 깨졌으면 원인을 보고하고 멈춰라
- 한국어로 보고하라
