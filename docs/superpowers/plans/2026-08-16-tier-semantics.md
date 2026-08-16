# 출처 티어 의미론 교정 구현 계획

> **에이전트 작업자에게:** 필수 하위 스킬 — superpowers:subagent-driven-development(권장)
> 또는 superpowers:executing-plans로 과제 단위로 구현하라. 각 단계는 체크박스(`- [ ]`)다.

**목표:** 위인 본인의 원저작을 형식과 무관하게 A로 판정하는 배타적 티어 규칙을 세우고, 기존 142건 전수 감사·표기 전파·confidence 재계산·판본 연도 감사를 완료 상태까지 기계적으로 잠근다.

**접근:** `CLAUDE.md`의 판정 순서를 먼저 정본으로 확정한 뒤 source-tier lint를 세워 현재 데이터가 의도적으로 실패하게 하고, 그 실패 목록을 따라 142행 판정과 모든 파생 표기를 고친다. 의미 판정은 `curator`가 수행하되 `sources.json.tier_review`와 연도 감사 기록에 근거를 구조화하고, lint와 감사 검증기가 누락 없는 완료 상태를 강제한다. `confidence` 공식은 바꾸지 않고 최종 tier를 입력으로 기존 동기화기를 한 번만 실행한다.

**기술 스택:** Node.js 22+ · node:test · 런타임 의존성 0 (루트)

## 전역 제약

- 범위는 토대 교정(Phase 1)만이다. 모든 위인에 최소 10개 출처를 채우는 116건 확장과 258건 재분류는 포함하지 않는다.
- 시작 기준은 `sources.json` 142건(A 47 / B 79 / C 16), 출처 요약 페이지 140개, 출처 연도 필드 99건 있음 / 43건 없음이다.
- A는 위인 본인의 원저작이며 단행본·연구논문 형식을 가리지 않는다. 당사자 직접 기록과 원문 아카이브도 A다.
- B는 후대의 종합서·편집서·교재·번역서, 타인이 쓴 학술 문헌, 학회·대학 등 기관의 공식 기록이다.
- C는 백과사전과 일반 참고 자료이며 단독 근거로 쓸 수 없다.
- `tier_exception`, 예외 승인 절차, 정초 논문 예외 목록을 만들지 않는다. `pressey-1926`, `moore-1973`, `sweller-2016-story`는 기본 규칙으로 A다.
- 다섯 원저작 자료형 `원저서`·`원논문`·`논쟁 원논문`·`원논문·서지`·`원 장`은 A이고, `연구서`는 B다.
- `sources.json` 142행 전부에 판정 경로와 근거를 기록한다. 알려진 변경 24건만 고치고 끝내지 않는다.
- 확정된 23건은 B→A, `sweller-2011`은 A→B다. `bloom-1968`은 원문과 서지 설명을 대조해 `원저서`·A 또는 `연구서`·B 중 하나로 반드시 확정한다.
- lint를 데이터보다 먼저 구현한다. 검사기 도입 뒤 `npm run lint:strict`의 실패는 의도된 중간 상태이고, 데이터 변경 직후에는 영향 파일을 실패 목록으로 드러내야 한다.
- 위키 각주 꼬리, source 페이지 `## 티어`, 저장 답변 각주 꼬리는 `sources.json.tier`와 같아야 한다. 각주 참조 id는 바꾸지 않는다.
- `scripts/check-answer.mjs`에는 새 판정 로직을 넣지 않는다. 기존 규칙 4가 저장 답변의 tier 표기 일치를 맡는다.
- `scripts/confidence.mjs`, `scripts/sync-confidence.mjs`, confidence 매핑은 수정하지 않는다. 저자 불일치 A를 동적으로 B로 내리지 않는다.
- 확정 23건 승격만 격리하면 9건 `medium → high`, high 56 / medium 20이다. `sweller-2011` 강등까지 합친 최종값은 `john-sweller` 1건 `high → medium`, high 55 / medium 21이며 `cognitive-load`는 high를 유지한다.
- `wiki/pioneers/edgar-dale.md`의 1969년 3판 주장에서는 `dale-1946`만 제거한다. `dale-1946` 레코드, 1946년 정상 인용, 프론트매터 `sources`, 각주 정의는 유지한다.
- `npm run audit:citation-years`는 비차단 감사다. 후보가 있어도 exit 0이며 파싱 실패만 비정상 종료한다.
- 연도 감사 기준선은 비교 가능한 후보 쌍 51개, 비교 불가 쌍 113개다. 접근일을 발행연도로 대신하지 않는다.
- `scripts/import-pantheon.mts`의 `TIER_NOTE` 문구만 고치고 임포터는 실행하지 않는다. `--force`도 사용하지 않는다.
- D2 기각 근거는 `wiki/KNOWN-ISSUES.md`에, 변경 id·이유·최종 A/B/C 건수와 연도 감사 결과는 `wiki/log.md` 한 항목에 기록한다.
- 봇, 사이트, 라우터, 답변 형식, 자연어 주장의 범용 인용 검증기는 변경하지 않는다.
- 계획 착수 기준 커밋은 `222e4b5df9c883ead5f5af9f6318e7eb853a036d`다. 완료 시 이 커밋과 비교해 `scripts/confidence.mjs`와 `scripts/sync-confidence.mjs`가 무변경이어야 한다.

---

### 과제 1: 정본 판정 순서와 출처 레지스트리 lint를 먼저 세운다

**파일:**
- 수정: `CLAUDE.md:37-60`
- 수정: `scripts/lint-wiki.mjs:16-24,174-190`
- 테스트: `test/lint-wiki.test.mjs:6-42,193`

**인터페이스:**
- 사용: `lintWiki({ wikiDir: string, sourcesPath: string, strict?: boolean }): Finding[]`, `makeWiki(files, sources): { root, wikiDir, sourcesPath }`
- 제공: `validateSourceTiers(sources: Source[]): Finding[]`; `Source.tier_review = { rule: "1-original-work" | "2-book-or-chapter-role" | "3-other-scholar-or-institution" | "4-general-reference", evidence: string, changed_from?: "A" | "B" | "C", previous_type?: string }`

- [ ] **1단계: 실패하는 레지스트리 테스트를 쓴다**

`SOURCES`가 새 감사 계약을 만족하게 고치고 `run`에 출처 배열 주입점을 추가한 뒤, 여섯 자료형 기본값과 142행 감사 기록 누락을 같은 규칙 10으로 고정한다.

```javascript
const review = (rule, evidence) => ({ rule, evidence });

const SOURCES = [
  {
    id: "a-src",
    tier: "A",
    type: "원저서",
    tier_review: review("1-original-work", "type-default: 원저서"),
    authors: "저자 A",
    title: "제목 A",
    url: "https://example.org/a",
  },
  {
    id: "c-src",
    tier: "C",
    type: "백과사전·탐색용",
    tier_review: review("4-general-reference", "publisher: Wikipedia"),
    authors: "저자 C",
    title: "제목 C",
    url: "https://example.org/c",
  },
];

function run(overrides, { strict = true, sources = SOURCES } = {}) {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": INDEX,
      "pioneers/p1.md": GOOD_PIONEER,
      "sources/a-src.md": SOURCE_PAGE,
      ...overrides,
    },
    sources,
  );
  return lintWiki({ wikiDir, sourcesPath, strict });
}

for (const type of ["원저서", "원논문", "논쟁 원논문", "원논문·서지", "원 장"]) {
  test(`규칙 10 — ${type}은 A가 아니면 실패한다`, () => {
    const bad = [{
      ...SOURCES[0],
      tier: "B",
      type,
      tier_review: review("1-original-work", `type-default: ${type}`),
    }];
    assert.ok(run({}, { sources: bad }).some((f) => f.rule === 10 && f.message.includes(type)));
  });
}

test("규칙 10 — 연구서는 B가 아니면 실패한다", () => {
  const bad = [{
    ...SOURCES[0],
    tier: "A",
    type: "연구서",
    tier_review: review("2-book-or-chapter-role", "bibliography: 누적 연구 종합서"),
  }];
  assert.ok(run({}, { sources: bad }).some((f) => f.rule === 10 && f.message.includes("연구서")));
});

test("규칙 10 — 모든 출처에는 판정 경로와 근거가 있어야 한다", () => {
  const { tier_review, ...withoutReview } = SOURCES[0];
  assert.ok(
    run({}, { sources: [withoutReview] }).some(
      (f) => f.rule === 10 && f.message.includes("tier_review 누락"),
    ),
  );
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/lint-wiki.test.mjs"`

기대: FAIL — 새 fixture는 통과할 구현이 없고, `원논문은 A여야 한다` 또는 `tier_review 누락` assertion이 실패한다.

- [ ] **3단계: `CLAUDE.md`를 먼저 고친 뒤 최소 lint를 구현한다**

`CLAUDE.md:37-60`은 아래 문안으로 교체한다.

````markdown
## 출처 티어

티어는 출처가 인용된 페이지가 아니라 **출처 자체의 성격과 근거 역할**로 정한다.

| 티어 | 정의 | 제약 |
|---|---|---|
| A | 위인 본인의 원저작. 단행본이든 연구논문이든 형식을 가리지 않는다. 당사자가 직접 남긴 기록, 원문 아카이브도 A다 | 없음 |
| B | 후대의 종합서·편집서·교재·번역서, 타인이 쓴 학술 문헌, 학회·대학 등 기관의 공식 기록 | 없음 |
| C | 백과사전, 일반 참고 자료 | **단독 근거 금지** |

**판정 순서**

1. 위인 본인이 자기 데이터·논증·이론·모형을 처음 제시한 저작이면 형식과 관계없이 A다. 원저서와 원논문, 당사자의 회고·자서전·직접 기록, 원문 아카이브가 이 경로에 속한다.
2. 단행본과 수록 장은 실제 근거 역할을 본다. 새 이론·모형을 제시하는 원저작이면 A, 후대의 종합·편집·해설·교재·번역이면 B다. 본인이 공저자나 편집자라는 사실만으로 종합서를 A로 올리지 않는다.
3. 타인이 쓴 학술 문헌과 학회·대학 등 기관의 공식 약력·부고·기록은 B다.
4. 백과사전과 일반 참고 자료는 C이며 단독 근거로 쓰지 않는다.

`sources.json`의 모든 행은 `tier_review` 객체에 판정 완료를 기록한다. `rule`은 판정 순서에 대응하는 `1-original-work`·`2-book-or-chapter-role`·`3-other-scholar-or-institution`·`4-general-reference` 중 하나이고, `evidence`에는 자료형 기본값 또는 확인한 서지와 근거 역할을 적는다.

## confidence

페이지의 `confidence`는 **모든 `##` 섹션의 "그 섹션 최강 티어" 중 가장 약한 것**이다.

```
섹션 최강 티어 = 그 섹션이 참조한 각주들의 tier 중 최강 (A > B > C)
각주 없는 섹션 = 계산에서 제외
페이지 값       = 섹션 최강 티어들 중 최약
매핑            A → high · B → medium · C → low
```

`high`는 “모든 근거 있는 섹션에 tier A 원자료가 적어도 하나 있다”는 뜻이다. A에는 형식과 관계없는 위인 본인의 원저작·당사자 기록·원문 아카이브가 포함된다.

손으로 정하지 않는다. `npm run sync:confidence`가 계산해 채우고 규칙 8이 불일치를 잡는다.

**선언값에 맞추려고 각주를 고치지 마라.** 페이지를 쓸 때는 값을 아무렇게나 두고 `sync:confidence`를 돌린 뒤 나온 값을 받아들인다. 근거가 약하면 `medium`이 맞는 답이다 — `high`를 만들려고 각주를 추가하면 지표가 내용을 움직인다.
````

`scripts/lint-wiki.mjs`에는 아래 레지스트리 검사를 추가하고 `lintWiki`의 finding 배열 첫머리에 `validateSourceTiers(sources)`를 연결한다.

```javascript
const ORIGINAL_SOURCE_TYPES = new Set([
  "원저서",
  "원논문",
  "논쟁 원논문",
  "원논문·서지",
  "원 장",
]);
const REVIEW_TIERS = new Map([
  ["1-original-work", new Set(["A"])],
  ["2-book-or-chapter-role", new Set(["A", "B"])],
  ["3-other-scholar-or-institution", new Set(["B"])],
  ["4-general-reference", new Set(["C"])],
]);
const sourceFinding = (message) => ({
  rule: 10,
  severity: "error",
  file: "sources.json",
  message,
});

export function validateSourceTiers(sources) {
  const out = [];
  for (const source of sources) {
    const label = source.id ?? "(id 없음)";
    if (ORIGINAL_SOURCE_TYPES.has(source.type) && source.tier !== "A") {
      out.push(sourceFinding(`${label}: ${source.type}은 tier A여야 한다`));
    }
    if (source.type === "연구서" && source.tier !== "B") {
      out.push(sourceFinding(`${label}: 연구서는 tier B여야 한다`));
    }

    const audit = source.tier_review;
    if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
      out.push(sourceFinding(`${label}: tier_review 누락`));
      continue;
    }
    const allowedTiers = REVIEW_TIERS.get(audit.rule);
    if (!allowedTiers) {
      out.push(sourceFinding(`${label}: 알 수 없는 tier_review.rule: ${audit.rule}`));
    } else if (!allowedTiers.has(source.tier)) {
      out.push(sourceFinding(`${label}: ${audit.rule} 경로와 tier ${source.tier}가 모순된다`));
    }
    if (typeof audit.evidence !== "string" || audit.evidence.trim() === "") {
      out.push(sourceFinding(`${label}: tier_review.evidence 누락`));
    }
    if (ORIGINAL_SOURCE_TYPES.has(source.type) && audit.rule !== "1-original-work") {
      out.push(sourceFinding(`${label}: ${source.type}의 판정 경로는 1-original-work여야 한다`));
    }
    if (source.type === "연구서" && audit.rule !== "2-book-or-chapter-role") {
      out.push(sourceFinding(`${label}: 연구서의 판정 경로는 2-book-or-chapter-role이어야 한다`));
    }
  }
  return out;
}
```

```javascript
const findings = [
  ...validateSourceTiers(sources),
  ...rule1(pages),
  ...rule2(pages),
  ...rule3(pages, sourceById),
  ...rule4(pages),
  ...rule5(pages),
  ...rule6(pages),
  ...rule7(pages),
  ...rule8(pages, sourceById),
  ...rule9(pages, sourceById),
];
```

- [ ] **4단계: 단위 테스트 통과와 실제 위키의 의도된 실패를 확인한다**

실행: `node --test "test/lint-wiki.test.mjs"`

기대: PASS

실행: `npm run lint:strict`

기대: FAIL — 규칙 10에서 `tier_review` 없는 142건과 기본값이 틀린 원저작 23건·`sweller-2011` 1건이 드러난다. 이 시점에는 데이터를 고치지 않는다.

- [ ] **5단계: 커밋**

```bash
git add CLAUDE.md scripts/lint-wiki.mjs test/lint-wiki.test.mjs
git commit -m "feat: define and lint source tier semantics"
```

---

### 과제 2: 위키 각주와 source 페이지의 tier 표기를 레지스트리에 묶는다

**파일:**
- 수정: `scripts/lint-wiki.mjs:156-190`
- 테스트: `test/lint-wiki.test.mjs:150-192`

**인터페이스:**
- 사용: `footnoteBlocks(text: string): { id: string, text: string }[]`, `sections(body: string): { title: string, text: string }[]`, `sourceById: Map<string, Source>`
- 제공: lint 규칙 11 `rule11(pages, sourceById): Finding[]`, lint 규칙 12 `rule12(pages, sourceById): Finding[]`

- [ ] **1단계: 실패하는 표기 불일치 테스트를 쓴다**

기존 `SOURCE_PAGE` 상수를 다음 코드로 교체하고 두 테스트를 추가한다.

```javascript
const SOURCE_PAGE = page({
  type: "source",
  title: "제목 A",
  extra: "sources: [a-src]",
  body: [
    "## 요약",
    "요약이다[^a-src].",
    "",
    "## 티어",
    "",
    "**A** — 위인 본인의 원저작[^a-src]",
    "",
    "[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]",
    "",
  ].join("\n"),
});

test("규칙 11 — 위키 각주 꼬리 tier가 sources.json과 다르면 실패한다", () => {
  const bad = GOOD_PIONEER.replace("— tier A ·", "— tier B ·");
  const findings = run({ "pioneers/p1.md": bad });
  assert.ok(findings.some((f) => f.rule === 11 && f.message.includes("a-src")));
});

test("규칙 12 — source 페이지의 ## 티어 문자만 오래돼도 실패한다", () => {
  const bad = SOURCE_PAGE.replace("**A** — 위인 본인의 원저작", "**B** — 후대 종합서");
  const findings = run({ "sources/a-src.md": bad });
  assert.ok(findings.some((f) => f.rule === 12 && f.message.includes("A인데 B")));
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/lint-wiki.test.mjs"`

기대: FAIL — 규칙 11·12 finding이 아직 생성되지 않는다.

- [ ] **3단계: 최소 구현**

```javascript
const DEF_TAIL_RE = /—\s*tier\s+([ABC])\s*·\s*\[\[sources\/([^\]|]+?)\s*\]\]$/;

function rule11(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    for (const block of footnoteBlocks(p.body)) {
      const match = DEF_TAIL_RE.exec(block.text);
      if (!match) {
        out.push(find(11, p, `각주 정의가 tier·출처 링크로 끝나지 않는다: [^${block.id}]`));
        continue;
      }
      const [, shownTier, linkedId] = match;
      if (linkedId !== block.id) {
        out.push(find(11, p, `각주 id와 출처 링크가 다르다: [^${block.id}] → ${linkedId}`));
      }
      const expectedTier = sourceById.get(block.id)?.tier;
      if (expectedTier && shownTier !== expectedTier) {
        out.push(
          find(11, p, `티어 표기 불일치: [^${block.id}]는 ${expectedTier}인데 ${shownTier}로 적혔다`),
        );
      }
    }
  }
  return out;
}

function rule12(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    if (p.fm.type !== "source") continue;
    const id = p.id.slice("sources/".length);
    const expectedTier = sourceById.get(id)?.tier;
    if (!expectedTier) continue;
    const tierSection = sections(p.body).find((section) => section.title === "티어");
    const shownTier = /^\*\*([ABC])\*\*/m.exec(tierSection?.text ?? "")?.[1];
    if (!shownTier) {
      out.push(find(12, p, "## 티어에 **A**, **B**, **C** 중 하나가 없다"));
    } else if (shownTier !== expectedTier) {
      out.push(find(12, p, `출처 페이지 tier는 ${expectedTier}인데 ${shownTier}로 적혔다`));
    }
  }
  return out;
}
```

`lintWiki`의 finding 배열에서 규칙 9 다음에 두 규칙을 연결한다.

```javascript
...rule9(pages, sourceById),
...rule11(pages, sourceById),
...rule12(pages, sourceById),
```

- [ ] **4단계: 단위 테스트 통과와 실제 위키의 의도된 실패를 확인한다**

실행: `node --test "test/lint-wiki.test.mjs"`

기대: PASS

실행: `npm run lint:strict`

기대: FAIL — 기존 위키 표기는 아직 기존 `sources.json`과 일치하므로 규칙 11·12는 0건이고, 과제 1에서 의도한 규칙 10 실패만 남는다.

- [ ] **5단계: 커밋**

```bash
git add scripts/lint-wiki.mjs test/lint-wiki.test.mjs
git commit -m "feat: lint rendered source tier labels"
```

---

### 과제 3: `curator`가 `sources.json` 142건을 전수 판정한다

**파일:**
- 수정: `sources.json:1-1409`

**인터페이스:**
- 사용: `validateSourceTiers(sources: Source[]): Finding[]`, `Source.tier_review` 계약
- 제공: 142건 모두에 최종 `type`, `tier`, `tier_review`가 있는 `sources.json`; 과제 4는 이 파일을 표기 동기화의 유일한 입력으로 쓴다

이 과제는 코드 TDD가 아니라 편집 판단이다. 판정 내용은 사람이 책임지고, 기록의 완결성과 새 기본값의 일관성만 규칙 10이 검사한다.

- [ ] **1단계: 기계 기본값 대상과 사람 검토 대상을 먼저 분리한다**

아래 읽기 전용 명령으로 다섯 원저작 자료형과 `연구서`를 먼저 떼고, 나머지 행을 별도 목록으로 출력한다. 현재 메타데이터 기준 기계 기본값 대상은 63건이고 그 밖의 type은 79건이다. `bloom-1968`은 기계 기본값을 임시로 적용하더라도 단행본 역할 판정 목록에 다시 넣는다.

```bash
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
const original = new Set(["원저서", "원논문", "논쟁 원논문", "원논문·서지", "원 장"]);
const mechanical = sources.filter((source) => original.has(source.type) || source.type === "연구서");
const human = sources.filter((source) => !original.has(source.type) && source.type !== "연구서");
const boundary = sources.filter((source) => /서|장|교재|번역/.test(source.type));

console.log(`기계 기본값 ${mechanical.length}건`);
console.log(mechanical.map((source) => `${source.id}\t${source.type}`).join("\n"));
console.log(`\n사람 경로 판정 ${human.length}건`);
console.log(human.map((source) => `${source.id}\t${source.type}`).join("\n"));
console.log(`\n단행본·수록 장 경계 재검토 ${boundary.length}건`);
console.log(boundary.map((source) => `${source.id}\t${source.type}\t${source.title}`).join("\n"));
NODE
```

- [ ] **2단계: 명세의 판정 순서로 142행을 한 번씩 판정한다**

각 행을 다음 순서로만 처리한다.

1. 위인 본인이 자기 데이터·논증·이론·모형을 처음 제시한 원저서·원논문·직접 기록·원문 아카이브면 `1-original-work`와 A다.
2. 단행본·수록 장이면 원문 또는 출판사·기관 서지 설명을 확인한다. 새 이론·모형을 제시하면 `1-original-work`와 A, 종합·편집·해설·교재·번역이면 `2-book-or-chapter-role`과 B다.
3. 타인이 쓴 학술 문헌 또는 기관 공식 약력·부고·기록이면 `3-other-scholar-or-institution`과 B다.
4. 백과사전·일반 참고 자료면 `4-general-reference`와 C다.

논문은 예외 자격을 심사하지 않는다. `원논문`으로 확인된 행은 기본 규칙으로 A다.

- [ ] **3단계: 판정 근거를 각 행에 구조화해 기록한다**

기계 기본값은 type을 근거로 기록한다.

```json
{
  "id": "sweller-1988",
  "tier": "A",
  "type": "원논문",
  "tier_review": {
    "rule": "1-original-work",
    "evidence": "type-default: 원논문",
    "changed_from": "B"
  },
  "authors": "John Sweller",
  "title": "Cognitive Load During Problem Solving: Effects on Learning",
  "year": "1988",
  "publisher": "Cognitive Science, 12(2)",
  "url": "https://doi.org/10.1207/s15516709cog1202_4",
  "doi": "10.1207/s15516709cog1202_4"
}
```

사람이 본 단행본·수록 장은 확인한 URL과 역할을 한 문장으로 남긴다. `bloom-1968`은 다음 둘 중 원문 대조 결과에 맞는 구조 하나만 채택한다.

```json
{
  "id": "bloom-1968",
  "tier": "A",
  "type": "원저서",
  "tier_review": {
    "rule": "1-original-work",
    "evidence": "bibliography: https://eric.ed.gov/?id=ED053419 — 완전학습 모형을 처음 제시한 블룸 본인의 정초 텍스트",
    "changed_from": "B",
    "previous_type": "연구서"
  },
  "authors": "Benjamin S. Bloom",
  "title": "Learning for Mastery",
  "year": "1968",
  "publisher": "UCLA Evaluation Comment",
  "details": "Evaluation Comment, 1(2)",
  "url": "https://eric.ed.gov/?id=ED053419"
}
```

```json
{
  "id": "bloom-1968",
  "tier": "B",
  "type": "연구서",
  "tier_review": {
    "rule": "2-book-or-chapter-role",
    "evidence": "bibliography: https://eric.ed.gov/?id=ED053419 — 누적 연구를 종합하는 연구서 역할로 확인"
  },
  "authors": "Benjamin S. Bloom",
  "title": "Learning for Mastery",
  "year": "1968",
  "publisher": "UCLA Evaluation Comment",
  "details": "Evaluation Comment, 1(2)",
  "url": "https://eric.ed.gov/?id=ED053419"
}
```

`sweller-2011`은 아래처럼 확정한다.

```json
{
  "id": "sweller-2011",
  "tier": "B",
  "type": "연구서",
  "tier_review": {
    "rule": "2-book-or-chapter-role",
    "evidence": "bibliography: https://doi.org/10.1007/978-1-4419-8126-4 — 3인 공저 누적 연구 종합서",
    "changed_from": "A"
  },
  "authors": "John Sweller; Paul Ayres; Slava Kalyuga",
  "title": "Cognitive Load Theory",
  "year": "2011",
  "publisher": "Springer",
  "url": "https://doi.org/10.1007/978-1-4419-8126-4",
  "doi": "10.1007/978-1-4419-8126-4"
}
```

- [ ] **4단계: 판정하지 못한 행을 보수적으로 닫는다**

근거 역할을 확인할 수 없는 행은 A로 추정하지 않는다. 기관·학술 근거임을 확인할 수 있으면 B, 백과·일반 참고 자료임만 확인할 수 있으면 C로 두고 `evidence`에 확인한 발행 주체·서지 URL과 “원저작 역할 확인 불가”를 함께 적는다. 빈 `evidence`, `pending` 상태, 행 누락은 허용하지 않는다.

- [ ] **5단계: 142행 완료와 확정 변경을 기계적으로 확인한다**

```bash
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateSourceTiers } from "./scripts/lint-wiki.mjs";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
assert.equal(sources.length, 142);
assert.equal(new Set(sources.map((source) => source.id)).size, 142);
assert.deepEqual(validateSourceTiers(sources), []);

const promoted = [
  "merrill-2002", "keller-1987", "mayer-1997", "dick-1996", "reigeluth-frick-1999",
  "seels-richey-1994-case", "jonassen-1991", "jonassen-2000", "sweller-1988",
  "heinich-1984", "glaser-1963", "glaser-1984", "novak-2002",
  "brown-palincsar-1984", "brown-1992", "collins-2004", "clark-1983", "clark-1994",
  "kozma-1991", "kozma-1994", "scardamalia-1989", "scardamalia-1994", "merrienboer-2002",
];
const byId = new Map(sources.map((source) => [source.id, source]));
for (const id of promoted) assert.equal(byId.get(id)?.tier, "A", id);
for (const id of promoted) assert.equal(byId.get(id)?.tier_review.changed_from, "B", id);
assert.equal(byId.get("sweller-2011")?.tier, "B");
assert.equal(byId.get("sweller-2011")?.tier_review.changed_from, "A");
const bloom = byId.get("bloom-1968");
assert.ok(
  (bloom.type === "원저서" && bloom.tier === "A") ||
    (bloom.type === "연구서" && bloom.tier === "B"),
);
console.log("142건 판정 기록 완료");
NODE
```

실행: `npm run lint:strict`

기대: FAIL — 규칙 10은 0건이 되고, 변경된 tier를 아직 반영하지 않은 위키에서 규칙 11·12와 규칙 8이 실패한다. 이 실패가 과제 4의 정확한 작업 목록이다.

- [ ] **6단계: 커밋**

```bash
git add sources.json
git commit -m "data: audit all 142 source tiers"
```

---

### 과제 4: 최종 tier를 위키·source 페이지·저장 답변에 전파한다

**파일:**
- 수정: `scripts/import-pantheon.mts:61-65`
- 수정: `wiki/sources/*.md:12-16` — 현재 source 페이지 140개 전부의 짧은 티어 설명과 각주 꼬리
- 수정: `wiki/concepts/cognitive-load.md:22-25`
- 수정: `wiki/concepts/criterion-referenced-assessment.md:19-20`
- 수정: `wiki/concepts/design-research.md:21-23`
- 수정: `wiki/debates/bandura-keller.md:24-24`
- 수정: `wiki/debates/bloom-glaser.md:24-24`
- 수정: `wiki/debates/bloom-keller.md:24-24`
- 수정: `wiki/debates/clark-kozma.md:23-26`
- 수정: `wiki/debates/clark-mayer.md:23-24`
- 수정: `wiki/debates/gagne-glaser.md:24-25`
- 수정: `wiki/debates/jonassen-merrill.md:23-24`
- 수정: `wiki/debates/jonassen-papert.md:23-23`
- 수정: `wiki/debates/kozma-mayer.md:23-24`
- 수정: `wiki/debates/lave-jonassen.md:23-24`
- 수정: `wiki/debates/merrienboer-merrill.md:24-25`
- 수정: `wiki/debates/merrill-keller.md:23-24`
- 수정: `wiki/debates/novak-mayer.md:25-25`
- 수정: `wiki/debates/papert-mayer.md:23-23`
- 수정: `wiki/debates/reigeluth-richey.md:23-23`
- 수정: `wiki/debates/scardamalia-papert.md:24-25`
- 수정: `wiki/debates/wenger-scardamalia.md:23-23`
- 수정: `wiki/pioneers/albert-bandura.md:74-74`
- 수정: `wiki/pioneers/allan-collins.md:73-73`
- 수정: `wiki/pioneers/ann-brown.md:67-69`
- 수정: `wiki/pioneers/barbara-seels.md:66-68`
- 수정: `wiki/pioneers/benjamin-bloom.md:81-82`
- 수정: `wiki/pioneers/charles-reigeluth.md:72-74`
- 수정: `wiki/pioneers/david-jonassen.md:72-76`
- 수정: `wiki/pioneers/david-merrill.md:74-78`
- 수정: `wiki/pioneers/etienne-wenger-trayner.md:73-73`
- 수정: `wiki/pioneers/jean-lave.md:74-75`
- 수정: `wiki/pioneers/jeroen-van-merrienboer.md:71-72`
- 수정: `wiki/pioneers/john-keller.md:76-77`
- 수정: `wiki/pioneers/john-sweller.md:66-69`
- 수정: `wiki/pioneers/joseph-novak.md:75-75`
- 수정: `wiki/pioneers/marlene-scardamalia.md:73-74`
- 수정: `wiki/pioneers/richard-clark.md:73-77`
- 수정: `wiki/pioneers/richard-mayer.md:78-91`
- 수정: `wiki/pioneers/rita-richey.md:70-70`
- 수정: `wiki/pioneers/robert-gagne.md:83-86`
- 수정: `wiki/pioneers/robert-glaser.md:73-74`
- 수정: `wiki/pioneers/robert-heinich.md:66-69`
- 수정: `wiki/pioneers/robert-kozma.md:72-75`
- 수정: `wiki/pioneers/seymour-papert.md:77-86`
- 수정: `wiki/pioneers/walter-dick.md:72-72`
- 수정: `answers/2026-08-15-is-intelligence-innate.md:59-60`
- 수정: `answers/2026-08-15-what-is-learning-2.md:101-101`
- 수정: `answers/2026-08-16-does-media-itself-cause-learning.md:41-172`

위 경로는 확정된 23건 B→A와 `sweller-2011` A→B가 현재 정의된 위치다. 과제 3의 전수 판정에서 추가 tier 변경이 나오면 규칙 11이 출력한 그 정의줄도 같은 기계 전파 명령의 변경 집합에 포함한다.

**인터페이스:**
- 사용: 과제 3의 `sources.json` 142건과 규칙 11·12 finding
- 제공: 모든 위키 각주 꼬리·source 페이지 `## 티어`·저장 답변 각주 꼬리가 `sources.json.tier`와 일치하는 코퍼스

- [ ] **1단계: 전파 전 실패 범위를 저장하지 않고 확인한다**

실행: `npm run lint:strict`

기대: FAIL — 규칙 11·12가 stale 표기를 모두 파일 단위로 열거하고, 규칙 8이 tier 변경으로 달라진 confidence를 열거한다.

- [ ] **2단계: 레지스트리를 유일한 입력으로 표기만 기계적으로 맞춘다**

아래 일회성 명령은 각주 id를 유지한 채 꼬리의 tier 문자만 교체하고, 현재 140개 source 페이지의 `## 티어` 한 줄을 새 짧은 문구로 맞춘다. `sources.json`에만 있고 페이지가 없는 `bio-vygotsky-msu`, `apa-ethics` 페이지는 새로 만들지 않는다.

```bash
node --input-type=module <<'NODE'
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
const byId = new Map(sources.map((source) => [source.id, source]));
const note = {
  A: "위인 본인의 원저작·당사자 기록·원문 아카이브",
  B: "후대의 종합서·편집서·교재·번역서·타인 학술 문헌·기관 공식 기록",
  C: "백과사전·일반 참고 자료 — 단독 근거로 쓰지 않는다",
};
const changed = [];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (name.endsWith(".md")) out.push(path);
  }
  return out;
}

for (const file of [...walk("wiki"), ...walk("answers")]) {
  const raw = readFileSync(file, "utf8");
  let next = raw.replace(
    /^([ ]{0,3}\[\^([^\]\s]+)\]:[^\r\n]*?—\s*tier\s+)([ABC])(\s*·\s*\[\[sources\/\2\]\][ \t]*)$/gm,
    (line, before, id, shown, after) => {
      const tier = byId.get(id)?.tier;
      return tier && tier !== shown ? `${before}${tier}${after}` : line;
    },
  );

  if (file.startsWith("wiki/sources/")) {
    const id = basename(file, ".md");
    const tier = byId.get(id)?.tier;
    if (tier) {
      next = next.replace(
        /(^## 티어\r?\n\r?\n)\*\*[ABC]\*\* — [^\r\n]*(\[\^([^\]\s]+)\][ \t]*$)/m,
        (line, heading, ref, refId) =>
          refId === id ? `${heading}**${tier}** — ${note[tier]}${ref}` : line,
      );
    }
  }

  if (next !== raw) {
    writeFileSync(file, next, "utf8");
    changed.push(file);
  }
}

console.log(changed.join("\n"));
console.log(`변경 ${changed.length}개 파일`);
NODE
```

- [ ] **3단계: 임포터의 재생성 문구를 같은 경계로 고친다**

`scripts/import-pantheon.mts:61-65`를 아래 값으로 바꾸되 스크립트는 실행하지 않는다.

```typescript
const TIER_NOTE: Record<string, string> = {
  A: "위인 본인의 원저작·당사자 기록·원문 아카이브",
  B: "후대의 종합서·편집서·교재·번역서·타인 학술 문헌·기관 공식 기록",
  C: "백과사전·일반 참고 자료 — 단독 근거로 쓰지 않는다",
};
```

- [ ] **4단계: tier 표기는 통과하고 confidence만 의도적으로 실패하는지 확인한다**

실행: `node --test "test/lint-wiki.test.mjs"`

기대: PASS

실행: `npm run lint:answers`

기대: 위조급 0건 — 기존 형식급 경고는 이 과제의 범위가 아니다.

실행: `npm run lint:strict`

기대: FAIL — 규칙 10·11·12는 0건이고 규칙 8의 confidence 불일치만 남는다.

- [ ] **5단계: 커밋**

```bash
git add scripts/import-pantheon.mts wiki answers
git commit -m "data: propagate corrected source tiers"
```

---

### 과제 5: 기존 계산기로 confidence 파생값만 갱신한다

**파일:**
- 수정: `wiki/debates/bloom-keller.md`
- 수정: `wiki/debates/clark-kozma.md`
- 수정: `wiki/debates/clark-mayer.md`
- 수정: `wiki/debates/gagne-glaser.md`
- 수정: `wiki/debates/jonassen-merrill.md`
- 수정: `wiki/debates/kozma-mayer.md`
- 수정: `wiki/debates/merrill-keller.md`
- 수정: `wiki/pioneers/david-jonassen.md`
- 수정: `wiki/pioneers/david-merrill.md`
- 수정: `wiki/pioneers/john-sweller.md`
- 검증만: `scripts/confidence.mjs:1-29`
- 검증만: `scripts/sync-confidence.mjs:47-80`
- 테스트: `test/confidence.test.mjs:1-53`, `test/sync-confidence.test.mjs:1-177`

**인터페이스:**
- 사용: `syncConfidence({ wikiDir?: string, sourcesPath?: string, dry?: boolean }): { updated, removed, skipped }`, `computeConfidence(page, sourceById): "high" | "medium" | "low" | null`
- 제공: 최종 tier를 반영한 confidence high 55 / medium 21과 두 번째 동기화 0건

- [ ] **1단계: 쓰기 전에 dry-run 결과를 확인한다**

실행: `npm run sync:confidence -- --dry`

기대: 9건 `medium → high`는 위 파일 중 `john-sweller`를 제외한 9개이고, `pioneers/john-sweller` 1건만 `high → medium`이다. 제거 0건, 건너뜀 0건이어야 한다. 이 열 건 밖의 이동이 나오면 값을 억지로 맞추지 말고 과제 3의 판정 근거와 각주 전파를 다시 대조한다.

- [ ] **2단계: confidence를 한 번 갱신한다**

실행: `npm run sync:confidence`

기대: 갱신 10건, 제거 0건, 건너뜀 0건

- [ ] **3단계: 분포와 핵심 페이지를 독립 계산으로 확인한다**

```bash
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadPages } from "./scripts/wiki-parse.mjs";
import { computeConfidence } from "./scripts/confidence.mjs";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
const byId = new Map(sources.map((source) => [source.id, source]));
const pages = loadPages("wiki").filter((page) => ["pioneer", "concept", "debate"].includes(page.fm.type));
const distribution = { high: 0, medium: 0, low: 0 };
const computed = new Map();
for (const page of pages) {
  const confidence = computeConfidence(page, byId);
  computed.set(page.id, confidence);
  distribution[confidence] += 1;
}
assert.deepEqual(distribution, { high: 55, medium: 21, low: 0 });
assert.equal(computed.get("pioneers/john-sweller"), "medium");
assert.equal(computed.get("concepts/cognitive-load"), "high");
console.log(distribution);
NODE
```

- [ ] **4단계: 멱등성과 strict lint를 확인한다**

실행: `npm run sync:confidence`

기대: 갱신 0건, 제거 0건, 건너뜀 0건

실행: `node --test "test/confidence.test.mjs" "test/sync-confidence.test.mjs"`

기대: PASS

실행: `npm run lint:strict`

기대: PASS — 이 시점에서 중간 상태의 의도된 실패가 끝난다.

- [ ] **5단계: 커밋**

```bash
git add wiki/debates/bloom-keller.md wiki/debates/clark-kozma.md wiki/debates/clark-mayer.md wiki/debates/gagne-glaser.md wiki/debates/jonassen-merrill.md wiki/debates/kozma-mayer.md wiki/debates/merrill-keller.md wiki/pioneers/david-jonassen.md wiki/pioneers/david-merrill.md wiki/pioneers/john-sweller.md
git commit -m "data: resync confidence after tier correction"
```

---

### 과제 6: 비차단 인용 연도 감사기와 완료 검증기를 구현한다

**파일:**
- 생성: `scripts/audit-citation-years.mjs`
- 생성: `test/citation-years.test.mjs`
- 수정: `package.json:9-22`

**인터페이스:**
- 사용: `loadPages(wikiDir): Page[]`, `footnoteRefs(body: string): string[]`, `sources.json.year?: string`
- 제공: `parseSourceYear(value): number | null`, `auditCitationText({ file, body, bodyStartLine? }, sourceById): { candidates, incomparable }`, `auditCitationYears({ wikiDir?, sourcesPath? }): { candidates, incomparable }`, `validateCitationYearReview(review, expected?): string[]`; CLI `npm run audit:citation-years [-- --json | --review <path>]`

- [ ] **1단계: 실패하는 순수 함수 테스트를 쓴다**

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditCitationText,
  parseSourceYear,
  validateCitationYearReview,
} from "../scripts/audit-citation-years.mjs";

const sources = new Map([
  ["dale-1946", { id: "dale-1946", year: "1946" }],
  ["molenda-2003-cone", { id: "molenda-2003-cone", year: "2003" }],
  ["no-year", { id: "no-year" }],
  ["range", { id: "range", year: "1931–1942" }],
]);
const audit = (body) => auditCitationText(
  { file: "wiki/pioneers/edgar-dale.md", body, bodyStartLine: 1 },
  sources,
);

test("1969 주장과 dale-1946은 후보가 된다", () => {
  const report = audit("1969년에 개정했다.[^dale-1946]");
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0].sourceId, "dale-1946");
});

test("1946 주장과 dale-1946은 후보가 아니다", () => {
  assert.equal(audit("1946년에 처음 냈다.[^dale-1946]").candidates.length, 0);
});

test("각주 id의 숫자는 주장 연도로 세지 않는다", () => {
  assert.deepEqual(audit("원추를 제시했다.[^dale-1946]"), { candidates: [], incomparable: [] });
});

test("한 블록의 오래된 출처 쌍만 후보가 된다", () => {
  const report = audit("1969년에 개정했다.[^dale-1946][^molenda-2003-cone]");
  assert.deepEqual(report.candidates.map((item) => item.sourceId), ["dale-1946"]);
});

test("연도 없는 출처는 비교 불가 목록으로 간다", () => {
  const report = audit("1969년에 개정했다.[^no-year]");
  assert.equal(report.candidates.length, 0);
  assert.equal(report.incomparable[0].sourceId, "no-year");
});

test("기간형 출처는 마지막 연도를 비교 기준으로 쓴다", () => {
  assert.equal(parseSourceYear("1931–1942"), 1942);
  assert.equal(audit("1942년에 끝났다.[^range]").candidates.length, 0);
  assert.equal(audit("1943년에 끝났다.[^range]").candidates.length, 1);
});

test("연도 감사 기록은 51개 후보와 113개 비교 불가를 모두 판정해야 한다", () => {
  const decided = (key) => ({
    key,
    file: "wiki/pioneers/x.md",
    line: 1,
    claimYear: 1969,
    sourceId: key,
    sourceYear: 1946,
    decision: "valid-context",
    reason: "같은 문단의 앞 문장을 받치는 판본으로 원문 대조 완료",
  });
  const review = {
    candidates: Array.from({ length: 51 }, (_, index) => decided(`candidate-${index}`)),
    incomparable: Array.from({ length: 113 }, (_, index) => ({
      ...decided(`incomparable-${index}`),
      sourceYear: null,
    })),
  };
  assert.deepEqual(validateCitationYearReview(review), []);
  delete review.candidates[0].decision;
  assert.ok(validateCitationYearReview(review).some((message) => message.includes("decision")));
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/citation-years.test.mjs"`

기대: FAIL — `scripts/audit-citation-years.mjs` 모듈이 없다.

- [ ] **3단계: 최소 구현**

```javascript
import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { footnoteRefs, loadPages } from "./wiki-parse.mjs";

const PAGE_TYPES = new Set(["pioneer", "concept", "debate"]);
const YEAR_RE = /\b(?:18|19|20)\d{2}\b/g;
const REF_MARKER_RE = /\[\^[^\]\s]+\]/g;
const DEF_LINE_RE = /^ {0,3}\[\^([^\]\s]+)\]:/;
const LIST_RE = /^ {0,3}(?:[-+*]|\d+[.)])\s+/;
const HEADING_RE = /^ {0,3}#{1,6}\s+/;
const DECISIONS = new Set(["remove-citation", "replace-citation", "valid-context", "metadata-corrected"]);

export function parseSourceYear(value) {
  const years = String(value ?? "").match(YEAR_RE);
  return years ? Number(years.at(-1)) : null;
}

function citationBlocks(body) {
  const blocks = [];
  let current = null;
  let inDefinition = false;
  const flush = () => {
    if (current) blocks.push({ line: current.line, text: current.lines.join("\n") });
    current = null;
  };

  for (const [index, line] of body.split(/\r?\n/).entries()) {
    if (DEF_LINE_RE.test(line)) {
      flush();
      inDefinition = true;
      continue;
    }
    if (inDefinition && (/^\s+\S/.test(line) || line.trim() === "")) continue;
    inDefinition = false;

    if (line.trim() === "" || HEADING_RE.test(line)) {
      flush();
      continue;
    }
    if (LIST_RE.test(line)) {
      flush();
      blocks.push({ line: index + 1, text: line });
      continue;
    }
    if (!current) current = { line: index + 1, lines: [] };
    current.lines.push(line);
  }
  flush();
  return blocks;
}

const compare = (a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.sourceId.localeCompare(b.sourceId);

export function auditCitationText({ file, body, bodyStartLine = 1 }, sourceById) {
  const candidates = [];
  const incomparable = [];
  for (const block of citationBlocks(body)) {
    const prose = block.text.replace(REF_MARKER_RE, "");
    const claimYears = (prose.match(YEAR_RE) ?? []).map(Number);
    if (claimYears.length === 0) continue;
    const claimYear = Math.max(...claimYears);
    const line = bodyStartLine + block.line - 1;
    for (const sourceId of new Set(footnoteRefs(block.text))) {
      const source = sourceById.get(sourceId);
      if (!source) continue;
      const sourceYear = parseSourceYear(source.year);
      const item = {
        key: `${file}:${line}|${sourceId}|${claimYear}|${sourceYear ?? "none"}`,
        file,
        line,
        claimYear,
        sourceId,
        sourceYear,
      };
      if (sourceYear === null) incomparable.push(item);
      else if (claimYear > sourceYear) candidates.push(item);
    }
  }
  return { candidates: candidates.sort(compare), incomparable: incomparable.sort(compare) };
}

export function auditCitationYears({ wikiDir = "wiki", sourcesPath = "sources.json" } = {}) {
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const candidates = [];
  const incomparable = [];
  for (const page of loadPages(wikiDir)) {
    if (!PAGE_TYPES.has(page.fm.type)) continue;
    const raw = readFileSync(page.file, "utf8");
    const bodyOffset = raw.indexOf(page.body);
    if (bodyOffset < 0) throw new Error(`${page.file}: 본문 위치를 찾을 수 없다`);
    const bodyStartLine = raw.slice(0, bodyOffset).split(/\r?\n/).length;
    const file = relative(process.cwd(), page.file).split(sep).join("/");
    const report = auditCitationText({ file, body: page.body, bodyStartLine }, sourceById);
    candidates.push(...report.candidates);
    incomparable.push(...report.incomparable);
  }
  return { candidates: candidates.sort(compare), incomparable: incomparable.sort(compare) };
}

export function validateCitationYearReview(
  review,
  { candidateCount = 51, incomparableCount = 113 } = {},
) {
  const errors = [];
  if (!Array.isArray(review.candidates) || review.candidates.length !== candidateCount) {
    errors.push(`candidates는 ${candidateCount}건이어야 한다`);
  }
  if (!Array.isArray(review.incomparable) || review.incomparable.length !== incomparableCount) {
    errors.push(`incomparable은 ${incomparableCount}건이어야 한다`);
  }
  const items = [...(review.candidates ?? []), ...(review.incomparable ?? [])];
  const keys = new Set();
  for (const item of items) {
    if (typeof item.key !== "string" || item.key === "") errors.push("빈 key가 있다");
    else if (keys.has(item.key)) errors.push(`중복 key: ${item.key}`);
    else keys.add(item.key);
    if (!DECISIONS.has(item.decision)) errors.push(`${item.key}: decision 누락 또는 알 수 없는 값`);
    if (typeof item.reason !== "string" || item.reason.trim() === "") {
      errors.push(`${item.key}: reason 누락`);
    }
  }
  return errors;
}

function arg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function cli(argv) {
  const reviewPath = arg(argv, "--review", null);
  if (reviewPath) {
    const review = JSON.parse(readFileSync(reviewPath, "utf8"));
    const errors = validateCitationYearReview(review);
    for (const error of errors) console.error(error);
    console.log(`연도 판정 기록: 후보 ${review.candidates.length}건, 비교 불가 ${review.incomparable.length}건`);
    process.exitCode = errors.length === 0 ? 0 : 1;
    return;
  }

  const report = auditCitationYears({
    wikiDir: arg(argv, "--wiki", "wiki"),
    sourcesPath: arg(argv, "--sources", "sources.json"),
  });
  if (argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  for (const item of report.candidates) {
    console.log(`후보 ${item.file}:${item.line} ${item.claimYear} > ${item.sourceId}:${item.sourceYear}`);
  }
  for (const item of report.incomparable) {
    console.log(`비교 불가 ${item.file}:${item.line} ${item.claimYear} > ${item.sourceId}:연도 없음`);
  }
  console.log(`\n후보 ${report.candidates.length}건, 비교 불가 ${report.incomparable.length}건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli(process.argv.slice(2));
}
```

`package.json`의 scripts에 비차단 명령을 추가한다.

```json
"audit:citation-years": "node scripts/audit-citation-years.mjs"
```

- [ ] **4단계: 테스트와 실제 기준선을 확인한다**

실행: `node --test "test/citation-years.test.mjs"`

기대: PASS

실행: `npm run audit:citation-years`

기대: exit 0, 후보 51건, 비교 불가 113건이며 `wiki/pioneers/edgar-dale.md:25`의 `1969 > dale-1946:1946`이 후보에 포함된다. 수가 다르면 사람 판정을 시작하지 않고 문단·목록 항목 분리와 각주 id 제거 순서를 먼저 고친다.

실행: `npm test`

기대: PASS

- [ ] **5단계: 커밋**

```bash
git add scripts/audit-citation-years.mjs test/citation-years.test.mjs package.json
git commit -m "feat: add non-blocking citation year audit"
```

---

### 과제 7: 데일 오귀착을 고치고 연도 후보 164쌍을 전수 판정한다

**파일:**
- 생성: `docs/superpowers/audits/2026-08-16-citation-years.json`
- 수정: `wiki/pioneers/edgar-dale.md:22-26`
- 수정: `wiki/pioneers/*.md`, `wiki/concepts/*.md`, `wiki/debates/*.md` — 연도 감사에서 실제 오귀착으로 확정한 각주만

**인터페이스:**
- 사용: `auditCitationYears({ wikiDir, sourcesPath }): { candidates, incomparable }`, `validateCitationYearReview(review): string[]`
- 제공: 51개 후보와 113개 비교 불가 항목 각각에 `decision`·`reason`이 있는 감사 기록, 실제 오귀착 수정본

이 과제는 코드 TDD가 아니라 판본·문장 범위 판정이다. 감사기가 후보를 좁히고 완료 기록을 검증하지만, 각 인용의 정오는 `curator`가 원문과 서지로 판정한다.

- [ ] **1단계: 수정 전 감사 결과를 구조화된 기록으로 고정한다**

```bash
node --input-type=module <<'NODE'
import { mkdirSync, writeFileSync } from "node:fs";
import { auditCitationYears } from "./scripts/audit-citation-years.mjs";

const path = "docs/superpowers/audits/2026-08-16-citation-years.json";
const report = auditCitationYears({ wikiDir: "wiki", sourcesPath: "sources.json" });
if (report.candidates.length !== 51 || report.incomparable.length !== 113) {
  throw new Error(`기준선 불일치: 후보 ${report.candidates.length}, 비교 불가 ${report.incomparable.length}`);
}
mkdirSync("docs/superpowers/audits", { recursive: true });
writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(path);
NODE
```

- [ ] **2단계: `edgar-dale.md`의 확정 오귀착 한 건을 고친다**

`wiki/pioneers/edgar-dale.md:24-25`를 아래와 같이 바꾼다. 프론트매터 `sources`, `dale-1946` 정의, 1946년 초판과 원추 주장에 붙은 다른 참조는 그대로 둔다.

```markdown
- **Audio-Visual Methods in Teaching** (1946) — 경험의 원추를 처음 제시하고 다양한 시청각 자료의 교육적 사용을 논의했다.[^dale-1946]
- **Audio-Visual Methods in Teaching, 3rd ed.** (1969) — 브루너의 표상 논의를 반영해 원추를 수정한 판본.[^molenda-2003-cone]
```

- [ ] **3단계: 51개 비교 가능 후보를 파일·줄 순서로 판정한다**

각 기록의 문단·목록 항목에서 각주가 받치는 문장 범위를 읽고 실제 판본을 대조한다. 진짜 오귀착은 각주 제거면 `remove-citation`, 더 맞는 기존 출처로 교체하면 `replace-citation`, 정상 혼합 인용이면 `valid-context`, `sources.json.year` 자체를 고치면 `metadata-corrected`를 기록한다. `reason`에는 비교한 문장 범위와 판본 근거를 한 문장으로 쓴다.

- [ ] **4단계: 113개 비교 불가 항목을 파일·줄 순서로 판정한다**

접근일을 발행연도로 간주하지 않는다. 출처 페이지 또는 기관 서지에서 발행연도를 확인할 수 있고 레지스트리 결함이면 `metadata-corrected`, 문장 범위상 정상인 무연도 기관 기록이면 `valid-context`, 오귀착이면 `remove-citation` 또는 `replace-citation`을 기록한다. 확인 불가 상태를 남기지 않고, 더 강한 판본을 추정하지 않는다.

- [ ] **5단계: 판정 완료를 기계적으로 잠근다**

실행: `npm run audit:citation-years -- --review docs/superpowers/audits/2026-08-16-citation-years.json`

기대: PASS — 후보 51건, 비교 불가 113건의 모든 레코드에 허용된 `decision`과 빈칸이 아닌 `reason`이 있고 key 중복이 없다.

실행: `npm run audit:citation-years`

기대: exit 0 — 남은 후보는 모두 감사 기록에서 `valid-context`로 원문 대조된 항목이다. 후보 수가 0일 필요는 없다.

실행: `npm run sync:confidence -- --dry`

기대: 갱신 0건, 제거 0건, 건너뜀 0건. 데일의 1969년 각주 하나를 빼도 `edgar-dale`은 medium을 유지한다.

실행: `npm run lint:strict`

기대: PASS

- [ ] **6단계: 커밋**

```bash
git add docs/superpowers/audits/2026-08-16-citation-years.json wiki
git commit -m "data: audit citation years and fix Dale attribution"
```

---

### 과제 8: 기각한 저자 상대 tier 안을 알려진 결함 문서에 고정한다

**파일:**
- 수정: `wiki/KNOWN-ISSUES.md:1-55`

**인터페이스:**
- 사용: 명세 D2의 36명 시뮬레이션 결과
- 제공: Phase 2 확장 후에만 재검토할 감시 조건; confidence 계산 변경을 막는 기각 기록

- [ ] **1단계: 문서 변경 전 현재 항목을 확인한다**

실행: `rg -n "타인의 tier A 원저작 사용 위치" wiki/KNOWN-ISSUES.md`

기대: FAIL — 해당 감시 항목이 아직 없다.

- [ ] **2단계: 프론트매터 날짜와 감시 항목을 추가한다**

`updated`를 `2026-08-16`으로 바꾸고 문서 끝에 다음 항목을 추가한다.

```markdown
## 6. 타인의 tier A 원저작 사용 위치 — 현재 결함 아님, 확장 후 감시

현재 전수 확인에서는 다른 위인의 A 원저작이 `당대의 비판`·`대립축`에서 그 위인의 주장 자체를 뒷받침하므로 올바른 1차 자료다. 저자 불일치 A를 일괄 B로 계산하는 안은 36명 시뮬레이션에서 정상 페이지를 강등했고, 하이픈 성씨 오탐도 냈으므로 채택하지 않는다.

Phase 2에서 출처가 늘어난 뒤 다른 위인의 A가 `당대의 비판`·`대립축` 밖에서 페이지 주인의 생애·대표 저작·핵심 명제를 대신 받치는 사례가 생기는지만 다시 감사한다. 이 항목은 현재 오류 수나 confidence를 바꾸지 않는다.
```

- [ ] **3단계: 기각 기록이 있고 계산 파일은 무변경인지 확인한다**

실행: `rg -n "36명 시뮬레이션|하이픈 성씨 오탐|Phase 2" wiki/KNOWN-ISSUES.md`

기대: 세 근거가 모두 출력된다.

실행: `git diff 222e4b5df9c883ead5f5af9f6318e7eb853a036d -- scripts/confidence.mjs scripts/sync-confidence.mjs`

기대: 출력 없음

- [ ] **4단계: strict lint를 확인한다**

실행: `npm run lint:strict`

기대: PASS — meta 문서 추가는 오류 수와 confidence를 바꾸지 않는다.

- [ ] **5단계: 커밋**

```bash
git add wiki/KNOWN-ISSUES.md
git commit -m "docs: record rejected relative-tier model"
```

---

### 과제 9: 감사 결과를 log에 기록하고 전체 게이트를 닫는다

**파일:**
- 수정: `wiki/log.md:1-5,188-206`

**인터페이스:**
- 사용: `Source.tier_review.changed_from`, 최종 `sources.json`, `docs/superpowers/audits/2026-08-16-citation-years.json`, `computeConfidence(page, sourceById)`
- 제공: 변경 id·이유·최종 A/B/C 건수·confidence 파급·D1 번복·D3 연도 감사 결과를 한 항목에 담은 변경 기록과 전체 녹색 게이트

- [ ] **1단계: 로그에 들어갈 집계를 레지스트리와 감사 기록에서 생성한다**

아래 출력은 수작업으로 다시 세지 않고 `wiki/log.md`의 새 항목에 그대로 옮긴다.

```bash
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
const years = JSON.parse(
  readFileSync("docs/superpowers/audits/2026-08-16-citation-years.json", "utf8"),
);
const tiers = Object.fromEntries(["A", "B", "C"].map((tier) => [
  tier,
  sources.filter((source) => source.tier === tier).length,
]));
const moves = new Map();
for (const source of sources) {
  const from = source.tier_review.changed_from;
  if (!from) continue;
  const key = `${from}→${source.tier}`;
  const ids = moves.get(key) ?? [];
  ids.push(source.id);
  moves.set(key, ids);
}
const decisions = new Map();
for (const item of [...years.candidates, ...years.incomparable]) {
  decisions.set(item.decision, (decisions.get(item.decision) ?? 0) + 1);
}

console.log(`최종 출처 분포: A ${tiers.A} / B ${tiers.B} / C ${tiers.C}`);
for (const [move, ids] of [...moves].sort()) {
  console.log(`${move} ${ids.length}건: ${ids.sort().join(", ")}`);
}
console.log(`연도 감사: 후보 ${years.candidates.length}건 / 비교 불가 ${years.incomparable.length}건`);
for (const [decision, count] of [...decisions].sort()) console.log(`${decision}: ${count}건`);
NODE
```

- [ ] **2단계: D1·D2·D3 결과를 하나의 로그 항목으로 쓴다**

`wiki/log.md`의 `updated`를 `2026-08-16`으로 바꾸고, 새 `## 2026-08-16 — 출처 티어 의미론 교정` 항목에 다음 사실을 빠짐없이 쓴다.

- 기존 `wiki/log.md:205`의 “lint 버그가 아닌 스키마 결정” 판단을 번복했으며, 형식이 아니라 원저작/종합·편집·교재 경계로 바꿨다.
- 142건 전부의 판정 기록을 끝냈고, 과제 9 1단계가 출력한 이동 id와 최종 A/B/C 건수를 모두 열거했다.
- `bloom-1968`의 최종 `type`·tier와 확인한 서지 근거를 기록했다.
- 확정 23건 승격만의 격리 실측은 9건 `medium → high`, high 56 / medium 20이었다.
- `sweller-2011` 강등까지 합친 최종 실측은 high 55 / medium 21이고, `john-sweller`만 `high → medium`, `cognitive-load`는 high 유지였다.
- 저자 불일치 A 강등안은 정상 비판 근거와 하이픈 성씨를 오판해 기각했다.
- `dale-1946`은 1946년 레코드로 유지하고 1969년 3판 주장 한 곳에서만 제거했다.
- 연도 후보 51건과 비교 불가 113건을 전수 판정했고, 과제 9 1단계가 출력한 decision별 건수와 실제 수정 id를 기록했다.

- [ ] **3단계: 파생값과 세 게이트를 최종 확인한다**

실행: `npm run sync:confidence`

기대: 갱신 0건, 제거 0건, 건너뜀 0건

실행: `npm run lint:strict`

기대: PASS — 오류 0건, 경고 0건

실행: `npm test`

기대: PASS

실행: `npm run lint:answers`

기대: exit 0, 위조급 0건. 기존 형식급 경고는 이 변경의 범위가 아니다.

- [ ] **4단계: 감사 완료와 범위 제한을 최종 확인한다**

```bash
npm run audit:citation-years -- --review docs/superpowers/audits/2026-08-16-citation-years.json
npm run audit:citation-years
git diff 222e4b5df9c883ead5f5af9f6318e7eb853a036d -- scripts/confidence.mjs scripts/sync-confidence.mjs
git diff --check
```

기대: 연도 판정 기록 검증 PASS, 감사 명령 exit 0, confidence 두 파일 diff 없음, whitespace 오류 없음

실행: `rg -n "tier_exception|정초 논문.*예외|예외 승인" CLAUDE.md sources.json scripts test wiki docs/superpowers/audits`

기대: 출력 없음 — 개정 전에 폐기된 장치가 구현에 되살아나지 않았다.

- [ ] **5단계: 커밋**

```bash
git add wiki/log.md
git commit -m "docs: record completed tier and citation audits"
```

완료 상태에서 `git status --short`는 비어 있어야 하며, 그때만 Phase 2의 116건 출처 확장 명세를 시작할 수 있다.
