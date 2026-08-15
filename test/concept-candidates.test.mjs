import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptCandidates, classifyPair } from "../scripts/concept-candidates.mjs";
import { makeWiki, page } from "./helpers.mjs";

const pioneer = (slug, concepts, extra = "") =>
  page({
    type: "pioneer",
    title: slug,
    extra: `slug: ${slug}\nconcepts: [${concepts.join(", ")}]\nsources: [a-src]\nconfidence: high${extra}`,
    body: "## 핵심\n주장[^a-src].\n\n[^a-src]: A. — tier A · [[sources/a-src]]\n",
  });

const run = (pioneers) => {
  const files = {};
  for (const [slug, concepts, extra] of pioneers) files[`pioneers/${slug}.md`] = pioneer(slug, concepts, extra);
  const { wikiDir } = makeWiki(files, [{ id: "a-src", tier: "A", title: "제목" }]);
  return conceptCandidates({ wikiDir });
};

test("정확 일치는 강한 후보다", () => {
  assert.equal(classifyPair("실천공동체", "실천공동체"), "정확");
});

test("가운뎃점·공백을 지우고 비교한다", () => {
  assert.equal(classifyPair("수행 격차", "수행격차"), "정확");
});

test("짧은 쪽이 3자 이상이면 포함은 강한 후보다", () => {
  assert.equal(classifyPair("인지부하", "외재적 인지부하"), "포함");
});

test("짧은 쪽이 2자면 포함으로 치지 않는다", () => {
  // `주의`가 `민주주의와 교육`·`연결주의`에 포함되는 잡음을 막는다.
  assert.equal(classifyPair("주의", "민주주의와 교육"), null);
});

test("편집거리 비율 0.34 이하는 강한 후보다", () => {
  assert.match(classifyPair("준거참조평가", "준거지향 평가"), /^편집거리/);
});

test("편집거리 0.5는 약한 후보다", () => {
  assert.match(classifyPair("설계연구", "설계실험"), /^약·/);
});

test("공통 접두사 절반 이상은 약한 후보다", () => {
  assert.match(classifyPair("교수기계", "교수분석"), /^약·/);
});

test("무관한 문자열은 후보가 아니다", () => {
  assert.equal(classifyPair("ARCS", "근접발달영역"), null);
});

test("같은 위인 안의 두 개념은 비교하지 않는다", () => {
  const { strong } = run([["p1", ["인지부하", "외재적 인지부하"]]]);
  assert.deepEqual(strong, []);
});

test("서로 다른 위인의 공유 개념을 강한 후보로 낸다", () => {
  const { strong, weak } = run([
    ["p1", ["준거참조평가"]],
    ["p2", ["준거지향 평가"]],
  ]);
  assert.equal(strong.length, 1);
  assert.equal(weak.length, 0);
  assert.deepEqual(
    [strong[0].a.slug, strong[0].b.slug].sort(),
    ["p1", "p2"],
  );
});

test("proposed_concepts를 수집한다", () => {
  const { proposed } = run([
    ["p1", ["개념가"], "\nproposed_concepts: [전이, 스캐폴딩]"],
    ["p2", ["개념나"]],
  ]);
  assert.deepEqual(proposed, [
    { slug: "p1", name: "전이" },
    { slug: "p1", name: "스캐폴딩" },
  ]);
});

test("proposed_concepts가 없으면 빈 배열이다", () => {
  assert.deepEqual(run([["p1", ["개념가"]]]).proposed, []);
});
