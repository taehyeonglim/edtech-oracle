import { test } from "node:test";
import assert from "node:assert/strict";
import { computeConfidence } from "../scripts/confidence.mjs";

const TIERS = new Map([
  ["a-src", { tier: "A" }],
  ["b-src", { tier: "B" }],
  ["c-src", { tier: "C" }],
]);

const compute = (body) => computeConfidence({ body }, TIERS);

test("모든 섹션이 A 티어면 high", () => {
  assert.equal(compute("## 하나\n주장[^a-src].\n\n## 둘\n주장[^a-src].\n"), "high");
});

test("한 섹션이 B가 최선이면 medium", () => {
  assert.equal(compute("## 하나\n주장[^a-src].\n\n## 연표\n생애[^b-src].\n"), "medium");
});

test("한 섹션이 C가 최선이면 low", () => {
  assert.equal(compute("## 하나\n주장[^a-src].\n\n## 연표\n생애[^c-src].\n"), "low");
});

test("가장 약한 섹션이 값을 정한다 — B와 C가 함께 있으면 low", () => {
  const body = "## 하나\n주장[^a-src].\n\n## 둘\n[^b-src].\n\n## 셋\n[^c-src].\n";
  assert.equal(compute(body), "low");
});

test("섹션 안에서는 최강 티어를 쓴다 — A와 C가 섞이면 그 섹션은 A", () => {
  assert.equal(compute("## 하나\n주장[^c-src][^a-src].\n"), "high");
});

test("각주 없는 섹션은 계산에서 제외한다", () => {
  assert.equal(compute("## 각주 없음\n서술만 있다.\n\n## 둘\n주장[^a-src].\n"), "high");
});

test("각주 있는 섹션이 하나도 없으면 null", () => {
  assert.equal(compute("## 하나\n서술만 있다.\n"), null);
  assert.equal(compute(""), null);
});

test("sources.json에 없는 각주 id는 제외한다", () => {
  // 규칙 3이 따로 잡는 문제다. 여기서 tier를 추측하지 않는다.
  assert.equal(compute("## 하나\n주장[^모르는것][^b-src].\n"), "medium");
  assert.equal(compute("## 하나\n주장[^모르는것].\n"), null);
});

test("각주 정의 블록의 링크는 계산에 넣지 않는다", () => {
  // 정의는 stripFootnoteDefs로 제거된다. 본문 참조만 근거다.
  const body = "## 하나\n주장[^b-src].\n\n[^a-src]: 저자 A. — tier A · [[sources/a-src]]\n";
  assert.equal(compute(body), "medium");
});
