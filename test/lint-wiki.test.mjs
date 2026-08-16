import { test } from "node:test";
import assert from "node:assert/strict";
import { lintWiki } from "../scripts/lint-wiki.mjs";
import { makeWiki, page } from "./helpers.mjs";

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
  extra: "sources: [a-src]",
  body: "## 요약\n요약이다[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
});

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

const rules = (findings) => [...new Set(findings.map((f) => f.rule))].sort((x, y) => x - y);

test("정상 위키는 위반이 없다", () => {
  assert.deepEqual(run({}), []);
});

test("규칙 1 — 프론트매터 필수 필드 누락", () => {
  const bad =
    "---\ntitle: 위인 1\ntype: pioneer\n---\n\n## 절\n주장[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n";
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(1));
});

test("규칙 2 — 정의 없는 각주 참조", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src] 그리고 또[^missing].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
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
    body: "## 절\n주장[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(4));
});

test("규칙 5 — 깨진 wikilink", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src]. [[concepts/nonexistent]]\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(5));
});

test("규칙 6 — 각주 없는 ## 섹션", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 있는 절\n주장[^a-src].\n\n## 근거 없는 절\n그냥 서술이다.\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
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
    body: "## 정의\n정의다[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "concepts/orphan.md": orphan })).includes(7));
});

test("규칙 8 — 선언한 confidence가 계산값과 다르다", () => {
  // C 티어만 있는 섹션이 하나라도 있으면 low여야 한다.
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [c-src]\nconfidence: high",
    body: "## 절\n주장[^c-src].\n\n[^c-src]: C. — tier C · [[sources/c-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(8));
});

test("규칙 8 — 계산값과 같으면 통과한다", () => {
  const ok = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [c-src]\nconfidence: low",
    body: "## 절\n주장[^c-src].\n\n[^c-src]: C. — tier C · [[sources/c-src]]\n",
  });
  assert.ok(!rules(run({ "pioneers/p1.md": ok })).includes(8));
});

test("규칙 9 — 각주 서지가 sources.json과 다르다", () => {
  // id만 대조하면 유효한 id를 유지한 채 저자·제목을 통째로 바꿔 써도 통과한다.
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 절\n주장[^a-src].\n\n[^a-src]: 존재하지 않는 저자. 존재하지 않는 책. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "pioneers/p1.md": bad })).includes(9));
});

test("규칙 9 — sources.json에 없는 id는 서지를 검증하지 않는다", () => {
  // 규칙 3이 이미 잡는다. 여기서 제목을 추측하지 않는다.
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [ghost]\nconfidence: high",
    body: "## 절\n주장[^ghost].\n\n[^ghost]: 아무 서지. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(!rules(run({ "pioneers/p1.md": bad })).includes(9));
});

test("규칙 1 — source 페이지에 confidence가 있으면 잡는다", () => {
  const bad = page({
    type: "source",
    title: "제목 A",
    extra: "sources: [a-src]\nconfidence: high",
    body: "## 요약\n요약이다[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
  });
  assert.ok(rules(run({ "sources/a-src.md": bad })).includes(1));
});

test("기본 모드는 규칙 6·7을 경고로 낮춘다", () => {
  const bad = page({
    type: "pioneer",
    title: "위인 1",
    extra: "slug: p1\nsources: [a-src]\nconfidence: high",
    body: "## 근거 없는 절\n서술.\n\n## 근거 있는 절\n주장[^a-src].\n\n[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]\n",
  });
  const findings = run({ "pioneers/p1.md": bad }, { strict: false });
  assert.ok(findings.some((f) => f.rule === 6 && f.severity === "warn"));
  assert.equal(findings.filter((f) => f.severity === "error").length, 0);
});

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
