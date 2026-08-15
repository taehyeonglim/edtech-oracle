import { test } from "node:test";
import assert from "node:assert/strict";
import { conceptCandidates, classifyPair } from "../scripts/concept-candidates.mjs";
import { makeWiki, page } from "./helpers.mjs";

/** concepts에 null을 주면 그 줄을 넣지 않는다. 잘못된 타입을 extra로 직접 쓰기 위해서다. */
const pioneer = (slug, concepts, extra = "") =>
  page({
    type: "pioneer",
    title: slug,
    extra: [
      `slug: ${slug}`,
      concepts === null ? null : `concepts: [${concepts.join(", ")}]`,
      "sources: [a-src]",
      `confidence: high${extra}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
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

test("같은 2자 접두사 + 다른 2자 접미사는 약한 후보다", () => {
  // 접두사 전용 분기는 두지 않는다. 공통 접두사가 절반 이상이면 편집거리 비율이
  // 반드시 0.5 이하라 약한 편집거리 분기가 먼저 잡는다.
  assert.match(classifyPair("교수기계", "교수분석"), /^약·편집거리/);
});

test("NFD로 분해된 한글을 같은 문자열로 본다", () => {
  // macOS가 같은 한글을 자모 분해로 넘길 때가 있다. CLAUDE.md가 파일명 규칙에서 같은 문제를 다룬다.
  const nfc = "수행격차";
  assert.equal(classifyPair(nfc, nfc.normalize("NFD")), "정확");
});

test("NFD 문자열이 길이 하한을 무력화하지 않는다", () => {
  // 분해하면 `주의`가 4코드포인트가 되어 MIN_CONTAINED(3자)를 넘어버린다.
  assert.equal(
    classifyPair("주의".normalize("NFD"), "민주주의와 교육".normalize("NFD")),
    null,
  );
});

test("전각 문자를 반각과 같게 본다", () => {
  assert.equal(classifyPair("ＡＲＣＳ", "ARCS"), "정확");
});

test("배열이 아닌 concepts는 건너뛴다", () => {
  // 문자열이면 글자별로 순회돼 `인 ↔ 인지` 같은 가짜 후보가 생겼다.
  const { strong, weak } = run([
    ["p1", null, "\nconcepts: 인지부하"],
    ["p2", ["인지"]],
  ]);
  assert.deepEqual([...strong, ...weak], []);
});

test("배열 안의 비문자열은 건너뛴다", () => {
  const { strong, weak } = run([
    ["p1", null, "\nconcepts: [42, 인지부하]"],
    ["p2", ["외재적 인지부하"]],
  ]);
  assert.equal(strong.length, 1);
  assert.equal(weak.length, 0);
  assert.equal(strong[0].a.name, "인지부하");
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
