# 에듀테크 오라클 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 교육공학 위인 36인이 학술적 근거를 인용하며 답변·토론하는 시스템을 구축한다. 근거 DB는 Karpathy LLM Wiki 방식의 마크다운 위키, 위인은 프로젝트 로컬 Claude Code 서브에이전트다.

**Architecture:** 3계층 — 불변 원자료 `raw/`(gitignore), 에이전트가 유지하는 `wiki/`, 스키마 정본 `CLAUDE.md`. 위키의 모든 주장은 각주(`[^sourceId]`)로 출처에 묶이고 `scripts/lint-wiki.mjs`의 8규칙이 이를 기계적으로 강제한다. 위인 에이전트 36개는 `wiki/pioneers/*.md`에서 스크립트로 생성되며 읽기 전용 도구만 갖는다.

**Tech Stack:** Node.js 26 (ESM, `node:test`), `gray-matter`(프론트매터), `tsx`(pantheon TypeScript 데이터 로드), Claude Code 서브에이전트·슬래시 커맨드, `codex exec -m gpt-5.6-luna`(33인 확장)

**설계 명세:** `docs/superpowers/specs/2026-08-14-edtech-oracle-design.md`

## Global Constraints

- **런타임**: Node.js 26 / npm 11. `package.json`은 `"type": "module"`. 모든 스크립트는 ESM.
- **의존성**: `gray-matter@^4.0.3`, `tsx@^4.19.2` 두 개만. 테스트는 Node 내장 `node:test` + `node:assert/strict` — 테스트 프레임워크를 추가하지 않는다.
- **커밋 금지 경로**: `raw/*` (단 `raw/MANIFEST.md`는 예외). `.gitignore`에 이미 반영됨.
- **페이지 타입**: `pioneer | concept | debate | source | meta` — 이 다섯 개가 전부다.
- **출처 티어**: `A` 원저작·당사자 기록·원문 아카이브 / `B` 피어리뷰 논문·학술서·학회·대학 공식 기록 / `C` 백과·일반 참고(**단독 근거 금지**).
- **각주 형식**: 정의는 반드시 `[[sources/<id>]]` 링크로 끝난다. 각주 id = `sources.json`의 `id`.
- **답변 3마커**: `[근거]` 문헌 직접 주장(각주 필수) / `[적용]` 원리로부터의 추론(출발 원리의 각주 필수 + 추론임을 명시) / `[근거없음]` 문헌에 근거 없음.
- **언어**: 위키 본문·에이전트 답변은 한국어. 각주 서지는 원문 표기 유지.
- **pantheon 경로**: 환경변수 `PANTHEON_PATH`, 기본값 `../edtech-pantheon`.
- **위인 에이전트**: `model: sonnet`, `tools: Read, Grep, Glob` (쓰기 도구 없음). `router`·`curator`는 `model` 필드 생략.
- **커밋**: 각 태스크 끝에서 커밋한다. 메시지 본문 마지막 줄은 `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json` | 스크립트·의존성 |
| `scripts/wiki-parse.mjs` | 위키 페이지 로더와 추출기. 파일시스템 → 구조화된 페이지 객체. **규칙을 모른다** |
| `scripts/lint-wiki.mjs` | 8규칙 + CLI. `wiki-parse.mjs`를 소비 |
| `scripts/import-pantheon.mts` | pantheon TypeScript 데이터 → 위키 마크다운 + `sources.json` |
| `scripts/gen-agents.mjs` | `wiki/pioneers/*.md` → `.claude/agents/*.md` 36개 |
| `scripts/run-expansion.sh` | codex 배치 병렬 실행 |
| `.claude/agents/_templates/` | router · curator 정적 템플릿 |
| `.claude/commands/` | `ask.md` · `debate.md` · `ingest.md` · `lint.md` |
| `test/helpers.mjs` | 임시 위키 생성 헬퍼 |
| `test/wiki-parse.test.mjs` | 파서 단위 테스트 |
| `test/lint-wiki.test.mjs` | 8규칙 각각의 검출 테스트 |
| `CLAUDE.md` | 위키 스키마 정본 — 에이전트가 매 세션 읽는다 |

파싱과 규칙을 분리하는 이유: 규칙 8개가 전부 같은 추출 결과(각주·링크·섹션)를 소비하므로, 추출을 한 곳에 두면 규칙은 순수 함수가 되어 테스트가 단순해진다.

---

## Task 1: 스캐폴드와 위키 파서

**Files:**
- Create: `package.json`, `scripts/wiki-parse.mjs`, `test/helpers.mjs`, `test/wiki-parse.test.mjs`
- Create: 디렉터리 `wiki/{pioneers,concepts,debates,sources}`, `raw/{papers,books,archives}`, `.claude/{agents,commands}`

**Interfaces:**
- Produces: `loadPages(wikiDir) → Page[]` where `Page = {id, file, fm, body}`; `footnoteDefs(body) → string[]`; `footnoteRefs(body) → string[]`; `wikilinks(body) → string[]`; `sections(body) → {title, text}[]`; `stripFootnoteDefs(body) → string`; `asDateString(v) → string`; 상수 `PAGE_TYPES`, `EVIDENCE_TYPES`
- Produces: `makeWiki(files, sources) → {root, wikiDir, sourcesPath}` (테스트 헬퍼)

- [ ] **Step 1: 디렉터리와 package.json 생성**

```bash
mkdir -p wiki/pioneers wiki/concepts wiki/debates wiki/sources \
         raw/papers raw/books raw/archives \
         .claude/agents/_templates .claude/commands \
         scripts test
```

`package.json`:

```json
{
  "name": "edtech-oracle",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/",
    "lint": "node scripts/lint-wiki.mjs",
    "lint:strict": "node scripts/lint-wiki.mjs --strict",
    "import": "tsx scripts/import-pantheon.mts",
    "gen-agents": "node scripts/gen-agents.mjs"
  },
  "devDependencies": {
    "gray-matter": "^4.0.3",
    "tsx": "^4.19.2"
  }
}
```

- [ ] **Step 2: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 오류 없음

- [ ] **Step 3: 테스트 헬퍼 작성**

`test/helpers.mjs`:

```js
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** 임시 디렉터리에 위키를 만든다. files는 { "pioneers/x.md": "내용" } 형태. */
export function makeWiki(files, sources = []) {
  const root = mkdtempSync(join(tmpdir(), "oracle-test-"));
  const wikiDir = join(root, "wiki");
  mkdirSync(wikiDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(wikiDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  const sourcesPath = join(root, "sources.json");
  writeFileSync(sourcesPath, JSON.stringify(sources), "utf8");
  return { root, wikiDir, sourcesPath };
}

/** 유효한 최소 페이지를 만든다. 테스트마다 다르게 할 부분만 인자로 덮어쓴다. */
export function page({ type = "pioneer", title = "테스트", extra = "", body = "" }) {
  const fm = [
    "---",
    `title: ${title}`,
    `type: ${type}`,
    "updated: 2026-08-14",
    extra,
    "---",
  ].filter(Boolean).join("\n");
  return `${fm}\n\n${body}\n`;
}
```

- [ ] **Step 4: 파서 실패 테스트 작성**

`test/wiki-parse.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadPages, footnoteDefs, footnoteRefs, wikilinks,
  sections, stripFootnoteDefs, asDateString,
} from "../scripts/wiki-parse.mjs";
import { makeWiki, page } from "./helpers.mjs";

test("loadPages는 하위 디렉터리까지 읽고 id를 확장자 없는 상대경로로 만든다", () => {
  const { wikiDir } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    "pioneers/robert-gagne.md": page({ title: "로버트 가네", extra: "slug: robert-gagne" }),
  });
  const pages = loadPages(wikiDir);
  assert.deepEqual(pages.map((p) => p.id).sort(), ["index", "pioneers/robert-gagne"]);
  assert.equal(pages.find((p) => p.id === "index").fm.type, "meta");
});

test("각주 정의와 참조를 구분한다", () => {
  const body = "주장이다[^a]. 또 다른 주장[^b].\n\n[^a]: 서지 A. [[sources/a]]\n[^b]: 서지 B. [[sources/b]]\n";
  assert.deepEqual(footnoteRefs(body), ["a", "b"]);
  assert.deepEqual(footnoteDefs(body), ["a", "b"]);
});

test("각주 정의 줄은 참조로 세지 않는다", () => {
  const body = "[^only]: 정의뿐이다. [[sources/only]]\n";
  assert.deepEqual(footnoteRefs(body), []);
  assert.deepEqual(footnoteDefs(body), ["only"]);
});

test("wikilinks는 각주 정의 안의 링크도 포함한다", () => {
  const body = "본문[^a].\n\n[^a]: 서지. [[sources/a]]\n\n[[concepts/b]]\n";
  assert.deepEqual(wikilinks(body).sort(), ["concepts/b", "sources/a"]);
});

test("stripFootnoteDefs는 정의와 들여쓴 연속 줄을 제거한다", () => {
  const body = "본문[^a].\n\n[^a]: 서지 첫 줄\n    이어지는 줄. [[sources/a]]\n\n## 다음 절\n내용[^a].\n";
  const stripped = stripFootnoteDefs(body);
  assert.ok(!stripped.includes("이어지는 줄"));
  assert.ok(stripped.includes("## 다음 절"));
});

test("sections는 ## 만 자르고 ### 는 무시한다", () => {
  const body = "머리말\n\n## 첫 절\n가[^a].\n\n### 하위\n나\n\n## 둘째 절\n다[^a].\n";
  const s = sections(body);
  assert.deepEqual(s.map((x) => x.title), ["첫 절", "둘째 절"]);
  assert.ok(s[0].text.includes("### 하위"));
});

test("asDateString은 YAML이 Date로 파싱한 값도 문자열로 만든다", () => {
  assert.equal(asDateString(new Date("2026-08-14T00:00:00Z")), "2026-08-14");
  assert.equal(asDateString("2026-08-14"), "2026-08-14");
  assert.equal(asDateString(42), "");
});
```

- [ ] **Step 5: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/wiki-parse.mjs'`

- [ ] **Step 6: 파서 구현**

`scripts/wiki-parse.mjs`:

```js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

export const PAGE_TYPES = ["pioneer", "concept", "debate", "source", "meta"];
/** 근거를 서술하는 타입. 인용 밀도(규칙 6)와 티어(규칙 8)의 적용 대상. */
export const EVIDENCE_TYPES = new Set(["pioneer", "concept", "debate"]);

const DEF_LINE_RE = /^\[\^([^\]\s]+)\]:/;
const DEF_RE = /^\[\^([^\]\s]+)\]:/gm;
const REF_RE = /\[\^([^\]\s]+)\](?!:)/g;
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

export function loadPages(wikiDir) {
  return walk(wikiDir).map((file) => {
    const { data, content } = matter(readFileSync(file, "utf8"));
    return {
      id: relative(wikiDir, file).replace(/\.md$/, "").split("\\").join("/"),
      file,
      fm: data,
      body: content,
    };
  });
}

export const footnoteDefs = (body) => [...body.matchAll(DEF_RE)].map((m) => m[1]);
export const footnoteRefs = (body) => [...body.matchAll(REF_RE)].map((m) => m[1]);
export const wikilinks = (body) => [...body.matchAll(LINK_RE)].map((m) => m[1].trim());

/** 각주 정의 블록(정의 줄 + 들여쓴 연속 줄)을 제거한다. 인용 밀도 계산 전처리. */
export function stripFootnoteDefs(body) {
  const out = [];
  let inDef = false;
  for (const line of body.split("\n")) {
    if (DEF_LINE_RE.test(line)) { inDef = true; continue; }
    if (inDef && (/^\s+\S/.test(line) || line.trim() === "")) continue;
    inDef = false;
    out.push(line);
  }
  return out.join("\n");
}

/** 레벨 2(`## `) 섹션만 자른다. 각주 정의는 미리 제거한다. */
export function sections(body) {
  const parts = [];
  let cur = null;
  for (const line of stripFootnoteDefs(body).split("\n")) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) { cur = { title: m[1].trim(), lines: [] }; parts.push(cur); }
    else if (cur) cur.lines.push(line);
  }
  return parts.map((p) => ({ title: p.title, text: p.lines.join("\n") }));
}

/** YAML은 따옴표 없는 날짜를 Date로 파싱한다. 두 경우를 모두 받는다. */
export function asDateString(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === "string" ? v : "";
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 7 tests

- [ ] **Step 8: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add project scaffold and wiki parser

위키 페이지 로더와 추출기(각주·wikilink·섹션). 규칙은 모르고
파싱만 한다 — 8개 규칙이 전부 같은 추출 결과를 소비하므로
분리해야 규칙이 순수 함수가 된다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: lint 8규칙과 CLI

**Files:**
- Create: `scripts/lint-wiki.mjs`, `test/lint-wiki.test.mjs`

**Interfaces:**
- Consumes: `scripts/wiki-parse.mjs`의 전체 export
- Produces: `lintWiki({wikiDir, sourcesPath, strict}) → Finding[]` where `Finding = {rule: number, severity: "error"|"warn", file: string, message: string}`
- Produces: CLI — `node scripts/lint-wiki.mjs [--strict] [--wiki DIR] [--sources FILE]`, 오류 1건 이상이면 exit 1

- [ ] **Step 1: 규칙 테스트 작성 (실패 케이스 8개 + 통과 케이스 1개)**

`test/lint-wiki.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { lintWiki } from "../scripts/lint-wiki.mjs";
import { makeWiki, page } from "./helpers.mjs";

const SOURCES = [
  { id: "a-src", tier: "A", authors: "저자 A", title: "제목 A", url: "https://example.org/a" },
  { id: "c-src", tier: "C", authors: "저자 C", title: "제목 C", url: "https://example.org/c" },
];

const INDEX = page({
  type: "meta",
  title: "색인",
  body: "## 위인\n- [[pioneers/p1]]\n",
});

const GOOD_PIONEER = page({
  type: "pioneer",
  title: "위인 1",
  extra: "slug: p1\nsources: [a-src]\nconfidence: high",
  body: "## 핵심 주장\n주장이다[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
});

const SOURCE_PAGE = page({
  type: "source",
  title: "제목 A",
  extra: "sources: [a-src]\nconfidence: high",
  body: "## 요약\n요약이다[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
});

function run(overrides, { strict = true } = {}) {
  const { wikiDir, sourcesPath } = makeWiki(
    { "index.md": INDEX, "pioneers/p1.md": GOOD_PIONEER, "sources/a-src.md": SOURCE_PAGE, ...overrides },
    SOURCES,
  );
  return lintWiki({ wikiDir, sourcesPath, strict });
}

const rules = (findings) => [...new Set(findings.map((f) => f.rule))].sort((x, y) => x - y);

test("정상 위키는 위반이 없다", () => {
  assert.deepEqual(run({}), []);
});

test("규칙 1 — 프론트매터 필수 필드 누락", () => {
  const bad = "---\ntitle: 위인 1\ntype: pioneer\n---\n\n## 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n";
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(1));
});

test("규칙 2 — 정의 없는 각주 참조", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src] 그리고 또[^missing].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(2));
});

test("규칙 3 — sources.json에 없는 출처 인용", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [ghost]\nconfidence: high",
    body: "## 절\n주장[^ghost].\n\n[^ghost]: 유령. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(3));
});

test("규칙 4 — 프론트매터 sources와 본문 각주 불일치", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [a-src, c-src]\nconfidence: high",
    body: "## 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(4));
});

test("규칙 5 — 깨진 wikilink", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src]. [[concepts/nonexistent]]\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(5));
});

test("규칙 6 — 각주 없는 ## 섹션", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 있는 절\n주장[^a-src].\n\n## 근거 없는 절\n그냥 서술이다.\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(6));
});

test("규칙 6 — meta 타입은 각주 없어도 통과", () => {
  const metaPage = page({ type: "meta", title: "기록", body: "## 아무 절\n각주 없는 서술.\n" });
  const findings = run({
    "index.md": page({ type: "meta", title: "색인", body: "## 위인\n- [[pioneers/p1]]\n- [[log]]\n" }),
    "log.md": metaPage,
  });
  assert.deepEqual(findings, []);
});

test("규칙 7 — index에서 도달 불가한 고아 페이지", () => {
  const orphan = page({
    type: "concept", title: "고아",
    extra: "sources: [a-src]\nconfidence: high",
    body: "## 정의\n정의다[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "concepts/orphan.md": orphan })).includes(7));
});

test("규칙 8 — C티어만으로 confidence: high 선언", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [c-src]\nconfidence: high",
    body: "## 절\n주장[^c-src].\n\n[^c-src]: C. — tier C · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(8));
});

test("기본 모드는 규칙 6·7을 경고로 낮춘다", () => {
  const bad = page({
    type: "pioneer", title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 없는 절\n서술.\n\n## 근거 있는 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  const findings = run({ "pioneers/p1.md": bad }, { strict: false });
  assert.ok(findings.some((f) => f.rule === 6 && f.severity === "warn"));
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/lint-wiki.mjs'`

- [ ] **Step 3: lint 구현**

`scripts/lint-wiki.mjs`:

```js
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  loadPages, footnoteDefs, footnoteRefs, wikilinks, sections,
  asDateString, PAGE_TYPES, EVIDENCE_TYPES,
} from "./wiki-parse.mjs";

const REQUIRED_BASE = ["title", "type", "updated"];
const REQUIRED_EVIDENCE = ["sources", "confidence"];
const CONFIDENCE = new Set(["high", "medium", "low"]);
const STRONG_TIERS = new Set(["A", "B"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 기본 모드에서 경고로 낮추는 규칙. 작성 중 상태를 허용한다. */
const SOFT_RULES = new Set([6, 7]);

const find = (rule, p, message) => ({ rule, severity: "error", file: p.id, message });
const asSet = (v) => new Set(Array.isArray(v) ? v : []);

function rule1(pages) {
  const out = [];
  for (const p of pages) {
    for (const k of REQUIRED_BASE) {
      if (p.fm[k] === undefined) out.push(find(1, p, `프론트매터 '${k}' 누락`));
    }
    if (p.fm.type !== undefined && !PAGE_TYPES.includes(p.fm.type)) {
      out.push(find(1, p, `알 수 없는 type: ${p.fm.type}`));
    }
    if (p.fm.updated !== undefined && !DATE_RE.test(asDateString(p.fm.updated))) {
      out.push(find(1, p, `updated는 YYYY-MM-DD여야 함: ${p.fm.updated}`));
    }
    if (EVIDENCE_TYPES.has(p.fm.type) || p.fm.type === "source") {
      for (const k of REQUIRED_EVIDENCE) {
        if (p.fm[k] === undefined) out.push(find(1, p, `프론트매터 '${k}' 누락`));
      }
      if (p.fm.confidence !== undefined && !CONFIDENCE.has(p.fm.confidence)) {
        out.push(find(1, p, `알 수 없는 confidence: ${p.fm.confidence}`));
      }
    }
    if (p.fm.type === "pioneer" && !p.fm.slug) out.push(find(1, p, "pioneer는 slug 필수"));
  }
  return out;
}

function rule2(pages) {
  const out = [];
  for (const p of pages) {
    const defs = new Set(footnoteDefs(p.body));
    for (const ref of new Set(footnoteRefs(p.body))) {
      if (!defs.has(ref)) out.push(find(2, p, `정의되지 않은 각주 참조: [^${ref}]`));
    }
  }
  return out;
}

function rule3(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    for (const id of new Set(footnoteDefs(p.body))) {
      if (!sourceById.has(id)) out.push(find(3, p, `sources.json에 없는 출처: ${id}`));
    }
  }
  return out;
}

function rule4(pages) {
  const out = [];
  for (const p of pages) {
    if (p.fm.sources === undefined) continue;
    const declared = asSet(p.fm.sources);
    const used = new Set(footnoteDefs(p.body));
    for (const id of declared) {
      if (!used.has(id)) out.push(find(4, p, `sources에 선언됐으나 본문에서 인용되지 않음: ${id}`));
    }
    for (const id of used) {
      if (!declared.has(id)) out.push(find(4, p, `본문에서 인용됐으나 sources에 선언되지 않음: ${id}`));
    }
  }
  return out;
}

function rule5(pages) {
  const ids = new Set(pages.map((p) => p.id));
  const out = [];
  for (const p of pages) {
    for (const link of new Set(wikilinks(p.body))) {
      if (!ids.has(link)) out.push(find(5, p, `깨진 링크: [[${link}]]`));
    }
  }
  return out;
}

function rule6(pages) {
  const out = [];
  for (const p of pages) {
    if (!EVIDENCE_TYPES.has(p.fm.type)) continue;
    for (const s of sections(p.body)) {
      if (s.text.trim() === "") continue;
      if (footnoteRefs(s.text).length === 0) {
        out.push(find(6, p, `각주 없는 섹션: '${s.title}'`));
      }
    }
  }
  return out;
}

function rule7(pages) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const seen = new Set();
  const queue = ["index"];
  while (queue.length > 0) {
    const id = queue.shift();
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    queue.push(...wikilinks(byId.get(id).body));
  }
  return pages
    .filter((p) => !seen.has(p.id))
    .map((p) => find(7, p, "index.md에서 도달 불가 (고아 페이지)"));
}

function rule8(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    if (!EVIDENCE_TYPES.has(p.fm.type) || p.fm.confidence !== "high") continue;
    const strong = [...asSet(p.fm.sources)].some((id) => STRONG_TIERS.has(sourceById.get(id)?.tier));
    if (!strong) out.push(find(8, p, "confidence: high인데 A·B 티어 출처가 없음"));
  }
  return out;
}

export function lintWiki({ wikiDir, sourcesPath, strict = false }) {
  const pages = loadPages(wikiDir);
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const findings = [
    ...rule1(pages), ...rule2(pages), ...rule3(pages, sourceById), ...rule4(pages),
    ...rule5(pages), ...rule6(pages), ...rule7(pages), ...rule8(pages, sourceById),
  ];
  if (strict) return findings;
  return findings.map((f) => (SOFT_RULES.has(f.rule) ? { ...f, severity: "warn" } : f));
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const findings = lintWiki({
    wikiDir: arg("--wiki", "wiki"),
    sourcesPath: arg("--sources", "sources.json"),
    strict: argv.includes("--strict"),
  });
  for (const f of findings.sort((a, b) => a.rule - b.rule || a.file.localeCompare(b.file))) {
    const tag = f.severity === "error" ? "ERROR" : "WARN ";
    console.log(`${tag} [규칙 ${f.rule}] ${f.file}: ${f.message}`);
  }
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.length - errors;
  console.log(`\n오류 ${errors}건, 경고 ${warns}건`);
  process.exit(errors > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 파서 7건 + lint 11건

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add wiki lint with 8 evidence rules

프론트매터·각주 무결성·링크·인용 밀도·고아·티어를 검사한다.
규칙 6·8은 pioneer/concept/debate에만, 규칙 6·7은 기본 모드에서
경고. meta 타입(index·log·router-map)은 인용 규칙에서 면제된다 —
면제하지 않으면 임포터 산출물이 자기 게이트에 걸린다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: pantheon 이관

**Files:**
- Create: `scripts/import-pantheon.mts`, `CLAUDE.md`, `raw/MANIFEST.md`
- Generate: `sources.json`, `wiki/index.md`, `wiki/log.md`, `wiki/router-map.md`, `wiki/KNOWN-ISSUES.md`, `wiki/pioneers/*.md`(36), `wiki/debates/*.md`(34), `wiki/concepts/*.md`(3), `wiki/sources/*.md`

**Interfaces:**
- Consumes: `PANTHEON_PATH`의 `src/data/{pioneers,sources,relationships,biographies,portraits}.ts`
- Produces: 위 파일들. 모든 페이지는 Task 1·2의 스키마를 만족한다.

**실측 데이터** (2026-08-14 검증): `pioneers 36`, `sources 124`, `relationships 54`(comparison 34), `biographies 36`, 공유 개념 3개(`교수기계`·`수행 격차`·`실천공동체`).

- [ ] **Step 1: CLAUDE.md 작성 (위키 스키마 정본)**

`CLAUDE.md`에 다음을 담는다 — 명세 §4·§5·§6를 에이전트가 매 세션 읽을 형태로 압축한다.

```markdown
# 에듀테크 오라클 — 위키 스키마

## 3계층
- `raw/` 불변 원자료 (gitignore). 목록은 `raw/MANIFEST.md`
- `wiki/` 이 파일의 규칙을 따르는 마크다운
- `CLAUDE.md` 이 파일 — 스키마 정본

## 페이지 프론트매터
`title`, `type`(pioneer|concept|debate|source|meta), `updated`(YYYY-MM-DD)는 전 타입 필수.
`pioneer|concept|debate|source`는 `sources`(배열)와 `confidence`(high|medium|low) 추가 필수.
`pioneer`는 `slug` 추가 필수.

## 각주
- 각주 id = `sources.json`의 `id`
- 정의는 반드시 `— tier <A|B|C> · [[sources/<id>]]`로 끝난다
- `##` 섹션마다 각주 1개 이상 (meta 제외)

## 출처 티어
A 원저작·당사자 기록·원문 아카이브 / B 피어리뷰 논문·학술서·기관 공식 기록 /
C 백과·일반 참고 — **단독 근거 금지**

## 답변 3마커
`[근거]` 문헌 직접 주장, 각주 필수
`[적용]` 원리로부터의 추론. 출발 원리의 각주 필수 + 추론임을 명시
`[근거없음]` 문헌에 근거 없음. 지어내지 않는다

## 검증
`npm run lint` (작성 중) / `npm run lint:strict` (커밋 전·게이트)
```

- [ ] **Step 2: 이관 스크립트 작성**

`scripts/import-pantheon.mts`. 핵심 구조:

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PANTHEON = process.env.PANTHEON_PATH ?? "../edtech-pantheon";
const DATA = join(PANTHEON, "src/data");
const TODAY = "2026-08-14";

const { pioneers } = await import(join(process.cwd(), DATA, "pioneers.ts"));
const { sources } = await import(join(process.cwd(), DATA, "sources.ts"));
const { relationships } = await import(join(process.cwd(), DATA, "relationships.ts"));
const { biographies } = await import(join(process.cwd(), DATA, "biographies.ts"));

const sourceById = new Map(sources.map((s) => [s.id, s]));
const cited = new Set<string>();          // 실제 인용된 출처 id
const pioneerSlug = new Map(pioneers.map((p) => [p.id, p.slug]));

/** 각주 정의 한 줄. 명세가 요구하는 형식으로만 만든다. */
function footnote(id: string): string {
  const s = sourceById.get(id);
  if (!s) throw new Error(`알 수 없는 출처 id: ${id}`);
  cited.add(id);
  const bits = [s.authors, s.year ? `(${s.year})` : "", s.title, s.publisher, s.details]
    .filter(Boolean).join(". ");
  const doi = s.doi ? ` DOI: ${s.doi}.` : "";
  return `[^${id}]: ${bits}.${doi} <${s.url}> — tier ${s.tier} · [[sources/${id}]]`;
}

/** 본문 문단 + sourceIds → 각주가 달린 문단. */
function cite(body: string, sourceIds: string[]): string {
  const marks = sourceIds.map((id) => `[^${id}]`).join("");
  return `${body.trimEnd()}${marks}`;
}

function frontmatter(fm: Record<string, unknown>): string {
  const lines = Object.entries(fm).map(([k, v]) =>
    Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`);
  return ["---", ...lines, "---"].join("\n");
}
```

각 산출물의 생성 규칙:

**위인 페이지** `wiki/pioneers/<slug>.md` — `sections[]`와 `biographies[id]`를 `##` 섹션으로, 각 섹션 끝에 해당 `sourceIds` 각주를 단다. `works[]`는 `## 주요 저작` 섹션에 목록으로. `timeline[]`은 `## 연표`에. 관련 `debates/`를 `related`에 넣는다. `confidence`는 프론트매터 `sources`에 A·B 티어가 하나라도 있으면 `high`, 없으면 `low`(규칙 8과 일관).

프론트매터 필드는 정확히 다음 여덟 개다 — **`role`·`life`·`concepts`는 Task 4의 `buildAgent()`가 소비하므로 빠지면 에이전트 description이 비어버린다.**

```yaml
title: 로버트 가네            # pioneer.nameKo
type: pioneer
slug: robert-gagne           # pioneer.slug
role: 교육심리학자 · 수업설계 이론가   # pioneer.role
life: 1916—2002              # pioneer.life
concepts: [학습조건, 9가지 수업사태, 학습위계]   # pioneer.concepts
sources: [gagne-1985, ...]   # 본문 각주 집합과 정확히 일치
related: ["[[debates/skinner-gagne]]", ...]
confidence: high
updated: 2026-08-14
```

**논쟁 페이지** `wiki/debates/<id>.md` — `layer: "comparison"`인 관계 34개. `description`에 `sourceIds` 각주를 달고, 양측 위인을 `[[pioneers/<slug>]]`로 링크한다.

**개념 페이지** `wiki/concepts/<slug>.md` — 2인 이상이 공유하는 개념 3개만. 본문은 "이 개념을 공유하는 위인" 목록 + 각 위인 페이지 링크. 각주는 해당 위인들의 `sourceIds` 교집합, 비면 합집합.

**출처 페이지** `wiki/sources/<id>.md` — `cited` 집합에 든 id만 생성한다. 미인용 id는 `console.warn`으로 출력한다.

**meta 페이지** — `index.md`는 네 디렉터리 전체를 `[[...]]`로 열거하고 `log.md`·`router-map.md`·`KNOWN-ISSUES.md`도 링크한다(규칙 7 도달성). `router-map.md`는 `domains`·`concepts`·`debates` → 위인 매핑표. `KNOWN-ISSUES.md`는 명세 §10의 5개 항목.

- [ ] **Step 3: 이관 실행**

Run: `npm run import`
Expected: 오류 없이 종료. 미인용 출처 경고는 정상.

- [ ] **Step 4: 산출물 개수 검증**

```bash
test "$(ls wiki/pioneers/*.md | wc -l | tr -d ' ')" = "36" && echo "pioneers OK"
test "$(ls wiki/debates/*.md | wc -l | tr -d ' ')" = "34" && echo "debates OK"
test "$(ls wiki/concepts/*.md | wc -l | tr -d ' ')" = "3" && echo "concepts OK"
node -e "console.log('sources.json', JSON.parse(require('fs').readFileSync('sources.json')).length)"
```
Expected: `pioneers OK`, `debates OK`, `concepts OK`, `sources.json 124`

- [ ] **Step 5: lint 게이트 통과 확인**

Run: `npm run lint:strict`
Expected: `오류 0건`. 오류가 나오면 규칙 위반을 임포터에서 고친다 — **위키를 손으로 고치지 않는다.** 임포터가 정본이고 위키는 산출물이다.

- [ ] **Step 6: raw/MANIFEST.md 초기화**

```markdown
# 원자료 목록

`raw/`의 파일은 저작권 때문에 커밋하지 않는다. 이 표가 근거 추적의 공개 지점이다.

| id | tier | 서지 | 원문 위치 | 접근일 |
|---|---|---|---|---|

*(pantheon 이관분은 원자료 파일 없이 서지와 URL만 `sources.json`에 있다.
논문·도서 전문을 `raw/`에 넣을 때 이 표에 등재한다.)*
```

- [ ] **Step 7: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Import pantheon into evidence wiki

위인 36 · 논쟁 34 · 개념 3 · 출처 124를 각주 스키마로 이관한다.
lint:strict 통과. 임포터가 정본이므로 위반은 위키가 아니라
스크립트에서 고친다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: 에이전트 생성기

**Files:**
- Create: `scripts/gen-agents.mjs`, `.claude/agents/_templates/router.md`, `.claude/agents/_templates/curator.md`
- Generate: `.claude/agents/*.md` 36개 + `router.md` + `curator.md` 복사

**Interfaces:**
- Consumes: `loadPages` from `scripts/wiki-parse.mjs`, `wiki/pioneers/*.md` 프론트매터
- Produces: `.claude/agents/<slug>.md` 36개 — frontmatter `{name, description, model: sonnet, tools: "Read, Grep, Glob"}`

- [ ] **Step 1: router·curator 정적 템플릿 작성**

`.claude/agents/_templates/router.md`:

```markdown
---
name: router
description: 사용자 질문을 읽고 답할 교육공학 위인 1~3명을 고른다. /ask가 호출한다.
tools: Read, Grep, Glob
---

`wiki/router-map.md`와 `wiki/index.md`를 읽고 질문에 답할 위인을 고른다.

## 출력 형식
```
PIONEERS: <slug1>, <slug2>
REASON: <각 위인을 고른 한 줄 근거>
```

## 규칙
- 1~3명. 4명 이상 고르지 않는다 — 답변이 길어지면 근거가 묻힌다
- 대립하는 입장이 있으면 양쪽을 함께 고른다. `wiki/debates/`가 대립축 목록이다
- 질문이 특정 위인을 지목하면 그대로 따른다
- 아무도 근거를 갖고 있지 않으면 `PIONEERS: none`을 반환한다
```

`.claude/agents/_templates/curator.md`:

```markdown
---
name: curator
description: raw/의 새 자료를 위키에 편입한다. 위키 쓰기 권한을 가진 유일한 에이전트. /ingest가 호출한다.
tools: Read, Write, Edit, Grep, Glob, Bash
---

`CLAUDE.md`의 스키마를 정본으로 삼는다.

## 절차
1. `raw/`의 대상 자료를 읽고 티어를 판정한다 (A 원저작·당사자 기록 / B 피어리뷰·기관 기록 / C 백과·일반 참고)
2. `sources.json`에 등재한다
3. `wiki/sources/<id>.md` 요약 페이지를 만든다
4. 영향받는 `wiki/pioneers/`·`wiki/concepts/` 페이지를 갱신한다
5. `wiki/index.md`에 새 페이지를 링크하고 `wiki/log.md`에 기록을 덧붙인다
6. `raw/MANIFEST.md`에 등재한다
7. `npm run lint:strict`를 실행한다. 실패하면 변경을 되돌리고 원인을 보고한다

## 금지
- 원자료에 없는 주장을 위키에 쓰지 않는다
- C 티어를 단독 근거로 삼지 않는다
- lint를 통과시키려고 규칙을 우회하지 않는다
```

- [ ] **Step 2: 생성기 실패 테스트 작성**

`test/gen-agents.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgent } from "../scripts/gen-agents.mjs";

test("위인 페이지 프론트매터로 에이전트 정의를 만든다", () => {
  const md = buildAgent({
    id: "pioneers/robert-gagne",
    fm: {
      title: "로버트 가네", slug: "robert-gagne", type: "pioneer",
      role: "교육심리학자 · 수업설계 이론가", life: "1916—2002",
      concepts: ["학습조건", "9가지 수업사태"],
      related: ["[[debates/skinner-gagne]]"],
    },
  });
  assert.match(md, /^---\n/);
  assert.match(md, /name: robert-gagne/);
  assert.match(md, /model: sonnet/);
  assert.match(md, /tools: Read, Grep, Glob/);
  assert.ok(!md.includes("Write"), "쓰기 도구가 들어가면 안 된다");
  assert.match(md, /wiki\/pioneers\/robert-gagne\.md/);
  assert.match(md, /\[근거없음\]/);
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../scripts/gen-agents.mjs'`

- [ ] **Step 4: 생성기 구현**

`scripts/gen-agents.mjs`는 `buildAgent(page)`를 export하고 CLI에서 `wiki/pioneers/*.md`를 순회해 `.claude/agents/<slug>.md`를 쓴다. 시스템 프롬프트 6블록:

```js
export function buildAgent(page) {
  const { title, slug, role, life, concepts = [], related = [] } = page.fm;
  const links = related.map((r) => `- ${r}`).join("\n");
  return `---
name: ${slug}
description: ${title} — ${(concepts).slice(0, 3).join(", ")}. ${role ?? ""} 관련 질문에 호출.
model: sonnet
tools: Read, Grep, Glob
---

너는 ${title}(${life ?? ""})이다. 1인칭으로 말한다.

## 읽을 수 있는 파일
- \`wiki/pioneers/${slug}.md\` — 너의 페이지
- 위 페이지가 \`[[...]]\`로 링크한 \`wiki/concepts/\`·\`wiki/debates/\`·\`wiki/sources/\` 페이지
${links}

**다른 위인의 페이지는 읽지 않는다.** 상대의 발언이 필요하면 호출자가 프롬프트로 준다.

## 답변 규칙 — 모든 문장은 세 마커 중 하나를 단다
- \`[근거]\` 내 문헌에 직접 있는 주장. 각주 \`[^sourceId]\` 필수
- \`[적용]\` 내 원리를 현대 상황에 적용한 추론. 출발 원리의 각주 필수 + 추론임을 명시
- \`[근거없음]\` 내 문헌에 근거가 없다. **지어내지 않는다**

각주 정의는 내 페이지에 있는 형식을 그대로 옮긴다.

## 목소리
과장하지 않는다. 내 이론의 한계와 당대의 비판을 인정한다.
내 시대 이후의 기술은 \`[적용]\`으로만 다룬다.

## 되물을 수 있다
질문이 모호해 근거를 고를 수 없으면 답변 대신 \`NEEDS_CLARIFICATION: <질문>\`만 반환한다.
`;
}
```

- [ ] **Step 5: 테스트 통과 + 36개 생성**

```bash
npm test
npm run gen-agents
cp .claude/agents/_templates/router.md .claude/agents/router.md
cp .claude/agents/_templates/curator.md .claude/agents/curator.md
test "$(ls .claude/agents/*.md | wc -l | tr -d ' ')" = "38" && echo "agents OK"
grep -L "tools: Read, Grep, Glob" .claude/agents/*.md | grep -v curator | grep -v router || echo "권한 OK"
```
Expected: 테스트 PASS, `agents OK`, `권한 OK`

- [ ] **Step 6: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Generate pioneer subagents from wiki

위인 36개는 wiki/pioneers 프론트매터에서 생성하고 router·curator는
정적 템플릿. 위인은 Read/Grep/Glob만 가진다 — 쓰기 권한이 있으면
답변 중 근거 DB를 오염시킨다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 파일럿 3인 심화와 답변 검증

**Files:**
- Modify: `wiki/pioneers/robert-gagne.md`, `wiki/pioneers/seymour-papert.md`, `wiki/pioneers/richard-mayer.md`
- Create: `wiki/concepts/*.md` (파일럿이 실제로 필요로 하는 개념만)
- Create: `docs/pilot-verification.md` (검증 기록)

**Interfaces:**
- Consumes: Task 4가 만든 `.claude/agents/{robert-gagne,seymour-papert,richard-mayer}.md`
- Produces: 확장 단계(Task 6)가 복제할 **심화 페이지 템플릿** — 섹션 구성과 각주 밀도의 본보기

- [ ] **Step 1: 파일럿 3인 페이지 심화**

이관본은 pantheon의 편집 요약이라 얇다. 세 위인 페이지에 다음 섹션을 채운다. 모든 문단에 각주를 단다.

- `## 핵심 명제` — 이 사람이 교육공학에 남긴 한 문장
- `## 주요 저작` — 이관본 유지
- `## 이론의 구조` — 개념 간 관계. 공유 개념은 `[[concepts/...]]`로 링크
- `## 당대의 비판` — 반대 입장. `[[debates/...]]` 링크
- `## 한계` — 이 이론이 설명하지 못하는 것
- `## 연표` — 이관본 유지

새 개념 페이지는 **세 위인이 실제로 링크해야 하는 것만** 만든다. `sources.json`에 근거가 없는 개념은 만들지 않는다.

- [ ] **Step 2: lint 통과 확인**

Run: `npm run lint:strict`
Expected: `오류 0건`

- [ ] **Step 3: 3마커 검증 — 질의 3종**

각 위인 에이전트를 Agent 도구로 호출해 세 유형을 확인한다.

| 유형 | 질문 예 | 기대 |
|---|---|---|
| 문헌 내 | "학습 결과를 어떻게 분류하는가?" (가네) | `[근거]` + 각주 |
| 현대 기술 | "생성형 AI 튜터를 어떻게 설계해야 하는가?" | `[적용]` + 출발 원리 각주 + 추론 명시 |
| 영역 밖 | "학급당 적정 학생 수는?" | `[근거없음]` |

- [ ] **Step 4: 컨텍스트 경계 검증**

파퍼트에게 "메이어의 멀티미디어 원리를 어떻게 보는가?"를 묻는다.
Expected: 파퍼트가 `wiki/pioneers/richard-mayer.md`를 읽지 않고, `[[debates/papert-mayer]]` 페이지의 근거만으로 답하거나 `[근거없음]`을 낸다.

- [ ] **Step 5: 토론 검증**

가네 · 파퍼트 · 메이어에게 "학습자에게 절차를 명시적으로 가르쳐야 하는가?"로 3라운드를 수동 실행한다.
Expected: 라운드 1의 세 발언이 서로를 언급하지 않는다(병렬·독립). 라운드 3이 억지 합의로 끝나지 않고 미해결 쟁점을 남긴다.

- [ ] **Step 6: 검증 기록과 커밋**

Step 3~5의 실제 출력을 `docs/pilot-verification.md`에 붙이고 커밋한다.

```bash
git add -A
git commit -m "$(cat <<'EOF'
Deepen pilot pioneers and verify answer contract

가네·파퍼트·메이어 페이지를 확장 템플릿 수준으로 심화하고
3마커·컨텍스트 경계·토론 독립성을 실측 검증했다.
기록은 docs/pilot-verification.md.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: codex 병렬 확장 33인

**Files:**
- Create: `scripts/run-expansion.sh`, `.codex-tasks/batch-{1..6}.md`
- Modify: `wiki/pioneers/*.md` 33개

**Interfaces:**
- Consumes: Task 5의 파일럿 3인 페이지 (템플릿), `npm run lint:strict` (게이트)
- Produces: 심화된 위인 페이지 33개

**모델:** `gpt-5.6-luna` (2026-08-14 스모크 테스트 통과)

- [ ] **Step 1: 배치 분할**

파일럿 3인을 뺀 33인을 6배치(5~6인)로 나눈다. 같은 배치에 대립하는 위인을 넣지 않는다 — 한 인스턴스가 양쪽을 쓰면 대립이 뭉개진다.

- [ ] **Step 2: 배치 지시서 작성**

`.codex-tasks/batch-N.md` 공통 골격:

```markdown
너는 edtech-oracle 저장소에서 위인 위키 페이지를 심화한다.

## 먼저 읽어라
- CLAUDE.md — 스키마 정본
- wiki/pioneers/robert-gagne.md — 심화 완료본. 섹션 구성과 각주 밀도를 이대로 따른다
- sources.json — 인용 가능한 출처 전체

## 담당 파일 (이 파일들만 수정한다)
- wiki/pioneers/<slug1>.md
- wiki/pioneers/<slug2>.md
...

## 절대 수정 금지
wiki/index.md, wiki/log.md, wiki/router-map.md, sources.json,
다른 배치의 위인 페이지, scripts/, .claude/

## 섹션 구성 (가네 페이지와 동일)
핵심 명제 / 주요 저작 / 이론의 구조 / 당대의 비판 / 한계 / 연표

## 절대 규칙
1. sources.json에 없는 출처를 인용하지 않는다. 새 출처를 만들지 않는다
2. 모든 ## 섹션에 각주가 최소 1개 있어야 한다
3. 각주 정의는 `— tier <A|B|C> · [[sources/<id>]]`로 끝난다
4. 프론트매터 sources 배열 = 본문 각주 집합 (정확히 일치)
5. **이미 존재하는 concepts/ 페이지에만 링크한다.** 새 개념이 필요하면
   프론트매터에 `proposed_concepts: [이름1, 이름2]`로 제안만 하고 링크하지 않는다
6. 원자료에 없는 주장을 쓰지 않는다. 근거가 없으면 그 섹션을 쓰지 않는다

## 완료 기준
`npm run lint:strict`가 오류 0건으로 통과해야 한다. 직접 실행해 확인하라.
```

- [ ] **Step 3: 실행 스크립트 작성**

`scripts/run-expansion.sh`:

```bash
#!/usr/bin/env bash
set -uo pipefail
MODEL="gpt-5.6-luna"
CONCURRENCY=3
mkdir -p .codex-tasks/logs
running=0
for f in .codex-tasks/batch-*.md; do
  name=$(basename "$f" .md)
  echo "▶ $name 시작"
  codex exec -m "$MODEL" --skip-git-repo-check "$(cat "$f")" \
    > ".codex-tasks/logs/$name.log" 2>&1 &
  running=$((running + 1))
  if [ "$running" -ge "$CONCURRENCY" ]; then wait -n; running=$((running - 1)); fi
done
wait
echo "▶ 전체 완료. 게이트 실행"
npm run lint:strict
```

병렬 인스턴스가 서로 다른 파일만 건드리므로 충돌하지 않는다. `index.md` 갱신은 전부 끝난 뒤 Claude가 한다.

- [ ] **Step 4: 실행**

Run: `chmod +x scripts/run-expansion.sh && ./scripts/run-expansion.sh`
Expected: 6배치 완료 후 `오류 0건`

- [ ] **Step 5: 실패 배치 재실행**

lint가 오류를 내면 해당 파일이 속한 배치만 재실행한다. 오류 메시지를 지시서에 덧붙인다.

Run: `npm run lint:strict`
Expected: `오류 0건`

- [ ] **Step 6: 제안 개념 검토**

```bash
grep -h "proposed_concepts" wiki/pioneers/*.md | sort -u
```

제안된 개념 중 **2인 이상이 제안했고 `sources.json`에 근거가 있는 것만** 개념 페이지로 만든다. 만든 뒤 해당 위인 페이지에 링크를 추가하고 `proposed_concepts`에서 뺀다.

- [ ] **Step 7: index·log 갱신 후 커밋**

새 개념 페이지를 `wiki/index.md`에 링크하고 `wiki/log.md`에 확장 기록을 덧붙인다.

```bash
npm run lint:strict
npm run gen-agents
git add -A
git commit -m "$(cat <<'EOF'
Expand remaining 33 pioneer pages via codex

gpt-5.6-luna 6배치 병렬. 각 배치는 담당 위인 페이지만 수정하고
lint:strict를 게이트로 통과했다. 새 개념은 proposed_concepts로
제안만 받아 2인 이상 제안 + 근거 확인된 것만 페이지로 만들었다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: /ask와 /debate 커맨드

**Files:**
- Create: `.claude/commands/ask.md`, `.claude/commands/debate.md`, `.claude/commands/ingest.md`, `.claude/commands/lint.md`

**Interfaces:**
- Consumes: `.claude/agents/` 38개, `wiki/router-map.md`, `wiki/debates/`
- Produces: 사용자 진입점 4개

- [ ] **Step 1: `/ask` 작성**

`.claude/commands/ask.md`:

```markdown
---
description: 교육공학 위인들에게 질문한다
---

질문: $ARGUMENTS

1. `router` 서브에이전트를 호출해 답할 위인을 고른다
2. `PIONEERS: none`이면 "이 질문에 근거를 가진 위인이 없습니다"라고 답하고 멈춘다
3. 고른 위인 서브에이전트를 **단일 메시지에서 병렬로** 호출한다
4. 어느 위인이든 `NEEDS_CLARIFICATION`을 반환하면 AskUserQuestion으로 사용자에게 묻고 다시 호출한다
5. 각 위인의 답변을 **그대로** 출력한다

## 금지
- 위인 발언을 요약하거나 합성하지 않는다. 요약하면 각주가 끊기고 누가 무엇을 근거로 말했는지 사라진다
- 각주를 생략하지 않는다
- 위인이 말하지 않은 결론을 덧붙이지 않는다
```

- [ ] **Step 2: `/debate` 작성**

`.claude/commands/debate.md`:

```markdown
---
description: 위인들이 주제를 놓고 토론한다
---

주제: $ARGUMENTS

`wiki/debates/`에서 관련 대립축을 찾아 참가자 2~4명을 고른다.

## 라운드 1 — 입장 표명
참가자를 **단일 메시지에서 병렬로** 호출한다. 각자에게 주제만 준다.
상대 발언을 주지 않는다 — 순차로 돌리면 뒷사람이 앞사람에 맞춰 조정한다.
출력 후 AskUserQuestion으로 계속할지 묻는다.

## 라운드 2 — 반박
각 위인을 **순차로** 호출하며 상대 발언을 프롬프트에 넣는다.
출력 후 AskUserQuestion으로 계속 / 특정 위인 파고들기 / 종료를 묻는다.

## 라운드 3 — 쟁점 정리
합의점과 **미해결 대립축**을 나눠 정리한다.
억지 합의로 끝내지 않는다. 교육공학의 실제 논쟁은 실제로 미해결이다.

## 금지
- 위인 페이지를 상대에게 파일로 주지 않는다. 발언만 프롬프트로 준다
- 사회자가 판정하지 않는다
```

- [ ] **Step 3: `/ingest`와 `/lint` 작성**

`ingest.md`는 `curator` 서브에이전트를 호출하고 인자로 대상 자료 경로를 넘긴다. `lint.md`는 `npm run lint:strict`를 실행하고 위반을 규칙별로 묶어 보고한다.

- [ ] **Step 4: 시나리오 3종 검증**

| 시나리오 | 명령 | 기대 |
|---|---|---|
| 단일 위인 | `/ask 9가지 수업사태란 무엇인가?` | 가네 1명, `[근거]` + 각주 |
| 복수 위인 | `/ask 멀티미디어 학습에서 매체 자체가 학습을 향상시키는가?` | 클라크·코즈마·메이어, 서로 대립 |
| 토론 | `/debate 학습자에게 절차를 명시적으로 가르쳐야 하는가?` | 3라운드, 라운드 1 독립, 라운드 3 미해결 쟁점 명시 |

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add ask, debate, ingest, lint commands

/ask는 요약을 금지한다 — 요약하면 각주가 끊긴다. /debate는 라운드 1을
병렬로 돌려 anchoring을 막고 라운드 3에서 억지 합의를 금지한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: README와 배포

**Files:**
- Create: `README.md`

- [ ] **Step 1: README 작성**

담을 내용: 프로젝트 목적 / 3계층 구조 다이어그램 / 근거 원칙(티어·각주·3마커) / 사용법(`/ask`·`/debate`·`/ingest`·`/lint`) / 위인 36인 목록 / lint 8규칙 표 / pantheon과의 관계와 계승한 알려진 이슈(§10) / 디스코드 프론트엔드 계획(추후) / 라이선스와 초상 권리 상태(36장 중 14장 확인).

pantheon README처럼 **현재 상태를 정직하게 표시**한다 — 확장 33인은 codex 생성분이며 A·B 티어 보강이 필요하다는 점을 명시한다.

- [ ] **Step 2: 최종 검증**

```bash
npm test
npm run lint:strict
test "$(ls .claude/agents/*.md | wc -l | tr -d ' ')" = "38" && echo "agents OK"
git status --short
```
Expected: 테스트 PASS, `오류 0건`, `agents OK`, 워킹트리 클린

- [ ] **Step 3: 원격 생성과 푸시**

```bash
gh repo create edtech-oracle --public \
  --description "교육공학 위인들이 학술적 근거를 인용하며 답하는 에이전트 시스템" \
  --source . --remote origin --push
gh repo view --json url,visibility
```
Expected: 공개 레포 생성, `raw/`가 원격에 없음

- [ ] **Step 4: raw/ 미유출 확인**

```bash
git ls-files raw/ 
```
Expected: `raw/MANIFEST.md`만 출력

---

## Self-Review

**명세 커버리지**

| 명세 절 | 담당 태스크 |
|---|---|
| §3 3계층 구조 | Task 1(디렉터리) · Task 3(CLAUDE.md, MANIFEST) |
| §4 인용 스키마 · 티어 | Task 2(규칙 1~8) · Task 3(각주 생성) |
| §4.2 lint 8규칙 | Task 2 |
| §5 위키 조직 축 | Task 3 |
| §5.1 concepts 유기적 성장 | Task 3(3개) · Task 5(파일럿) · Task 6 Step 6(제안 검토) |
| §6 3마커 | Task 4(에이전트 프롬프트) · Task 5 Step 3(검증) |
| §7 에이전트 구조 | Task 4 |
| §8 기능 4종 | Task 7 |
| §9 빌드 순서 | Task 1~8 |
| §10 알려진 이슈 | Task 3(KNOWN-ISSUES.md) · Task 8(README 명시) |
| §11 검증 방법 | Task 1·2(단위) · Task 3 Step 4~5 · Task 5 Step 3~5 · Task 7 Step 4 · Task 8 Step 2~4 |

**타입 일관성** — `Page = {id, file, fm, body}`가 Task 1에서 정의되어 Task 2(`lintWiki`)·Task 4(`buildAgent`)에서 동일하게 쓰인다. `Finding = {rule, severity, file, message}`는 Task 2에서만 쓴다. `PAGE_TYPES`·`EVIDENCE_TYPES`는 Task 1에서 export해 Task 2가 소비한다.

**빌드 순서 의존성** — Task 2(lint)가 Task 6(codex 게이트)보다 앞선다. Task 4(에이전트 생성기)가 Task 5(파일럿 검증)보다 앞선다 — 파일럿을 검증하려면 에이전트가 있어야 한다. Task 5(템플릿 확정)가 Task 6(템플릿 복제)보다 앞선다.
