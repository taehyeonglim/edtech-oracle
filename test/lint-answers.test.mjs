import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { lintAnswers } from "../scripts/lint-answers.mjs";
import { makeAnswers, answer, page } from "./helpers.mjs";

const SOURCES = [
  { id: "a-src", tier: "A", authors: "저자 A", title: "제목 A", url: "https://example.org/a" },
  { id: "c-src", tier: "C", authors: "저자 C", title: "제목 C", url: "https://example.org/c" },
];

const WIKI = {
  "pioneers/a.md": page({
    type: "pioneer",
    title: "위인 A",
    extra: "slug: a-pioneer\nsources: [a-src]\nconfidence: high",
    body: "## 핵심\n주장[^a-src].\n\n[^a-src]: 저자 A. — tier A · [[sources/a-src]]\n",
  }),
};

const DEF_A = "[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]";

const OK = answer({
  speakers: ["a-pioneer"],
  body: ["## a-pioneer", "", "[근거] 주장이다.[^a-src]", "", DEF_A].join("\n"),
});

const FORGED = answer({
  speakers: ["a-pioneer"],
  body: [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^c-src]",
    "",
    "[^c-src]: 저자 C. 제목 C. — tier C · [[sources/c-src]]",
  ].join("\n"),
});

const run = (files) => {
  const { wikiDir, sourcesPath, answersDir } = makeAnswers(files, { wiki: WIKI, sources: SOURCES });
  return lintAnswers({ answersDir, wikiDir, sourcesPath });
};

test("answers/ 가 없으면 통과한다", () => {
  const { wikiDir, sourcesPath, root } = makeAnswers({}, { wiki: WIKI, sources: SOURCES });
  const out = lintAnswers({ answersDir: join(root, "없는디렉터리"), wikiDir, sourcesPath });
  assert.deepEqual(out, { results: [], forge: 0, form: 0 });
});

test("type: answer 가 아닌 파일은 건너뛴다", () => {
  const out = run({ "README.md": "# 답변 기록\n\n형식 설명이다.\n", "2026-08-15-q.md": OK });
  assert.equal(out.results.length, 1);
  assert.equal(out.forge, 0);
});

test("위조급을 집계한다", () => {
  const out = run({ "2026-08-15-q.md": FORGED });
  assert.equal(out.forge, 1);
  assert.equal(out.results[0].findings[0].rule, 3);
});

test("저장된 check 블록을 믿지 않고 본문에서 다시 센다", () => {
  const lying = answer({
    speakers: ["a-pioneer"],
    extra: "check:\n  status: pass\n  forge: 0\n  form: 0",
    body: [
      "## a-pioneer",
      "",
      "[근거] 주장이다.[^c-src]",
      "",
      "[^c-src]: 저자 C. 제목 C. — tier C · [[sources/c-src]]",
    ].join("\n"),
  });
  const out = run({ "2026-08-15-q.md": lying });
  assert.equal(out.forge, 1);
});

test("여러 답변의 마커를 합산한다", () => {
  const out = run({ "a.md": OK, "b.md": OK });
  assert.equal(out.results.length, 2);
  assert.equal(out.results[0].markers.근거 + out.results[1].markers.근거, 2);
});
