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
    {
      "index.md": INDEX,
      "pioneers/p1.md": GOOD_PIONEER,
      "sources/a-src.md": SOURCE_PAGE,
      ...overrides,
    },
    SOURCES,
  );
  return lintWiki({ wikiDir, sourcesPath, strict });
}

const rules = (findings) => [...new Set(findings.map((f) => f.rule))].sort((x, y) => x - y);

test("정상 위키는 위반이 없다", () => {
  assert.deepEqual(run({}), []);
});

test("규칙 1 — 프론트매터 필수 필드 누락", () => {
  const bad =
    "---\ntitle: 위인 1\ntype: pioneer\n---\n\n## 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n";
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(1));
});

test("규칙 2 — 정의 없는 각주 참조", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src] 그리고 또[^missing].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(2));
});

test("규칙 3 — sources.json에 없는 출처 인용", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [ghost]\nconfidence: high",
    body: "## 절\n주장[^ghost].\n\n[^ghost]: 유령. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(3));
});

test("규칙 4 — 프론트매터 sources와 본문 각주 불일치", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src, c-src]\nconfidence: high",
    body: "## 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(4));
});

test("규칙 5 — 깨진 wikilink", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src]. [[concepts/nonexistent]]\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(5));
});

test("규칙 6 — 각주 없는 ## 섹션", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 있는 절\n주장[^a-src].\n\n## 근거 없는 절\n그냥 서술이다.\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(6));
});

test("규칙 6 — meta 타입은 각주 없어도 통과", () => {
  const metaPage = page({ type: "meta", title: "기록", body: "## 아무 절\n각주 없는 서술.\n" });
  const findings = run({
    "index.md": page({
      type: "meta",
      title: "색인",
      body: "## 위인\n- [[pioneers/p1]]\n- [[log]]\n",
    }),
    "log.md": metaPage,
  });
  assert.deepEqual(findings, []);
});

test("규칙 7 — index에서 도달 불가한 고아 페이지", () => {
  const orphan = page({
    type: "concept",
    title: "고아",
    extra: "sources: [a-src]\nconfidence: high",
    body: "## 정의\n정의다[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "concepts/orphan.md": orphan })).includes(7));
});

test("규칙 8 — C티어만으로 confidence: high 선언", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [c-src]\nconfidence: high",
    body: "## 절\n주장[^c-src].\n\n[^c-src]: C. — tier C · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(8));
});

test("기본 모드는 규칙 6·7을 경고로 낮춘다", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 없는 절\n서술.\n\n## 근거 있는 절\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });
  const findings = run({ "pioneers/p1.md": bad }, { strict: false });
  assert.ok(findings.some((f) => f.rule === 6 && f.severity === "warn"));
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});
