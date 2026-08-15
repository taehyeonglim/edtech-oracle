import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { checkAnswer, writeCheckBlock } from "../scripts/check-answer.mjs";
import { makeAnswers, answer, page } from "./helpers.mjs";

const SOURCES = [
  { id: "a-src", tier: "A", authors: "저자 A", title: "제목 A", url: "https://example.org/a" },
  { id: "b-src", tier: "B", authors: "저자 B", title: "제목 B", url: "https://example.org/b" },
  { id: "c-src", tier: "C", authors: "저자 C", title: "제목 C", url: "https://example.org/c" },
];

/** a-pioneer는 a-src·b-src만, b-pioneer는 c-src만 인용할 수 있다. 규칙 3의 근거가 된다. */
const WIKI = {
  "pioneers/a.md": page({
    type: "pioneer",
    title: "위인 A",
    extra: "slug: a-pioneer\nsources: [a-src, b-src]\nconfidence: high",
    body: "## 핵심\n주장[^a-src].\n\n[^a-src]: 저자 A. — tier A · [[sources/a-src]]\n",
  }),
  "pioneers/b.md": page({
    type: "pioneer",
    title: "위인 B",
    extra: "slug: b-pioneer\nsources: [c-src]\nconfidence: low",
    body: "## 핵심\n주장[^c-src].\n\n[^c-src]: 저자 C. — tier C · [[sources/c-src]]\n",
  }),
};

const DEF_A = "[^a-src]: 저자 A. 제목 A. — tier A · [[sources/a-src]]";
const DEF_C = "[^c-src]: 저자 C. 제목 C. — tier C · [[sources/c-src]]";

const GOOD_BODY = [
  "## a-pioneer",
  "",
  "[근거] 주장이다.[^a-src]",
  "",
  DEF_A,
  "",
  "## _orchestrator",
  "",
  "이 둘은 출발점에서 갈린다.",
].join("\n");

function run(body, { speakers = ["a-pioneer"], command = "ask" } = {}) {
  const { wikiDir, sourcesPath, answersDir } = makeAnswers(
    { "2026-08-15-q.md": answer({ command, speakers, body }) },
    { wiki: WIKI, sources: SOURCES },
  );
  return checkAnswer({ file: join(answersDir, "2026-08-15-q.md"), wikiDir, sourcesPath });
}

const rulesOf = (findings) => [...new Set(findings.map((f) => f.rule))].sort((a, b) => a - b);
const severityOf = (findings, rule) => findings.find((f) => f.rule === rule)?.severity;

test("정상 답변은 위반이 없다", () => {
  const { findings } = run(GOOD_BODY);
  assert.deepEqual(findings, []);
});

test("규칙 1 — 정의 없는 각주 참조", () => {
  const body = ["## a-pioneer", "", "[근거] 주장이다.[^a-src]"].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(1));
  assert.equal(severityOf(findings, 1), "forge");
});

test("규칙 2 — sources.json에 없는 출처를 인용", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^made-up]",
    "",
    "[^made-up]: 지어낸 출처. — tier A · [[sources/made-up]]",
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(2));
  assert.equal(severityOf(findings, 2), "forge");
});

test("규칙 3 — 자기 페이지에 없는 출처를 인용 (인용 범위 위반)", () => {
  const body = ["## a-pioneer", "", "[근거] 주장이다.[^c-src]", "", DEF_C].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(3));
  assert.equal(severityOf(findings, 3), "forge");
  // c-src는 sources.json에 실재하므로 규칙 2는 걸리지 않는다.
  assert.ok(!rulesOf(findings).includes(2));
});

test("규칙 3 — 같은 출처라도 화자가 다르면 통과한다", () => {
  const body = ["## b-pioneer", "", "[근거] 주장이다.[^c-src]", "", DEF_C].join("\n");
  const { findings } = run(body, { speakers: ["b-pioneer"] });
  assert.deepEqual(findings, []);
});

test("규칙 4 — 각주의 티어 표기가 sources.json과 다르다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    "[^a-src]: 저자 A. 제목 A. — tier B · [[sources/a-src]]",
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(4));
  assert.equal(severityOf(findings, 4), "forge");
});

test("규칙 5 — 알 수 없는 화자", () => {
  const body = ["## nobody", "", "[근거] 주장이다.[^a-src]", "", DEF_A].join("\n");
  const { findings } = run(body, { speakers: ["nobody"] });
  assert.ok(rulesOf(findings).includes(5));
  assert.equal(severityOf(findings, 5), "forge");
});

test("규칙 6 — 프론트매터 speakers와 본문 화자가 다르다", () => {
  const { findings } = run(GOOD_BODY, { speakers: ["a-pioneer", "b-pioneer"] });
  assert.ok(rulesOf(findings).includes(6));
  assert.equal(severityOf(findings, 6), "forge");
});

test("규칙 6 — 화자 섹션이 하나도 없으면 걸린다", () => {
  const { findings } = run("각주도 화자도 없는 본문이다.");
  assert.ok(rulesOf(findings).includes(6));
});

test("규칙 7 — 사회자 섹션에 각주가 있다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    DEF_A,
    "",
    "## _orchestrator",
    "",
    "정리하면 이렇다.[^a-src]",
    "",
    DEF_A,
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(7));
  assert.equal(severityOf(findings, 7), "forge");
});

test("규칙 8 — 각주 정의가 tier·출처 링크로 끝나지 않는다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    "[^a-src]: 저자 A. 제목 A. 출판사.",
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(8));
  assert.equal(severityOf(findings, 8), "form");
});

test("규칙 9 — 마커 없는 문단", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    "마커 없이 덧붙인 문장이다.",
    "",
    DEF_A,
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(9));
  assert.equal(severityOf(findings, 9), "form");
});

test("규칙 10 — [근거]인데 각주가 없다", () => {
  const body = ["## a-pioneer", "", "[근거] 각주 없이 단정한다."].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(10));
  assert.equal(severityOf(findings, 10), "form");
});

test("규칙 11 — [근거없음]인데 각주가 있다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거없음] 내 문헌에 없다.[^a-src]",
    "",
    DEF_A,
  ].join("\n");
  const { findings } = run(body);
  assert.ok(rulesOf(findings).includes(11));
  assert.equal(severityOf(findings, 11), "form");
});

test("사회자 섹션은 마커 검사 대상이 아니다", () => {
  const { findings } = run(GOOD_BODY);
  assert.ok(!rulesOf(findings).includes(9));
});

test("인용문·목록·표는 마커 검사에서 제외된다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    "> 인용한 문장이다.",
    "",
    "- 목록 항목",
    "",
    "| 표 | 머리 |",
    "",
    "NEEDS_CLARIFICATION: 무엇을 묻는가",
    "",
    DEF_A,
  ].join("\n");
  const { findings } = run(body);
  assert.ok(!rulesOf(findings).includes(9));
});

test("debate — 같은 화자가 라운드마다 반복되어도 통과한다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 라운드 1 발언이다.[^a-src]",
    "",
    DEF_A,
    "",
    "## a-pioneer",
    "",
    "[적용] 라운드 2 반박이다.[^b-src]",
    "",
    "[^b-src]: 저자 B. 제목 B. — tier B · [[sources/b-src]]",
  ].join("\n");
  const { findings } = run(body, { command: "debate" });
  assert.deepEqual(findings, []);
});

test("--write는 asked를 YYYY-MM-DD로 유지한다", () => {
  // YAML이 따옴표 없는 날짜를 Date로 파싱하므로, 되쓸 때 ISO 타임스탬프로 흘러가면 안 된다.
  const { wikiDir, sourcesPath, answersDir } = makeAnswers(
    { "2026-08-15-q.md": answer({ speakers: ["a-pioneer"], body: GOOD_BODY }) },
    { wiki: WIKI, sources: SOURCES },
  );
  const file = join(answersDir, "2026-08-15-q.md");
  const result = checkAnswer({ file, wikiDir, sourcesPath });
  writeCheckBlock(file, result);
  const written = readFileSync(file, "utf8");
  assert.match(written, /asked: '?2026-08-15'?\n/);
  assert.ok(!written.includes("T00:00:00"));
  assert.match(written, /status: pass/);
  // 되쓴 파일을 다시 검사해도 통과해야 한다.
  assert.deepEqual(checkAnswer({ file, wikiDir, sourcesPath }).findings, []);
});

test("마커 분포를 센다", () => {
  const body = [
    "## a-pioneer",
    "",
    "[근거] 주장이다.[^a-src]",
    "",
    "[적용] 추론이다.[^a-src]",
    "",
    "[적용] 또 추론이다.[^a-src]",
    "",
    "[근거없음] 문헌에 없다.",
    "",
    DEF_A,
  ].join("\n");
  const { markers, findings } = run(body);
  assert.deepEqual(markers, { 근거: 1, 적용: 2, 근거없음: 1 });
  assert.deepEqual(findings, []);
});
