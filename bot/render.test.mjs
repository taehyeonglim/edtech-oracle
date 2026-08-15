import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { render, splitContent, checkSummary, DEFAULT_LIMIT, ORCHESTRATOR_NAME } from "./render.mjs";

const BASE = "https://taehyeonglim.github.io/edtech-oracle";
const url = (id) => `${BASE}/sources/${id}.html`;

const DEWEY_DEF =
  "[^dewey-1916]: John Dewey. (1916). Democracy and Education. Macmillan." +
  " <https://archive.org/details/x> — tier A · [[sources/dewey-1916]]";
const SCHUNK_DEF =
  "[^schunk-2012]: Dale H. Schunk. (2012). Learning Theories. Pearson." +
  " — tier B · [[sources/schunk-2012]]";

/** 프론트매터 + 섹션들로 답변 파일 한 편을 만든다. */
const answer = (sections, fm = "") =>
  `---\ntype: answer\ncommand: ask\nasked: '2026-08-15'\n${fm}---\n\n${sections.join("\n\n")}\n`;

test("화자별로 페이로드가 갈린다", () => {
  const md = answer([
    `## john-dewey\n\n듀이의 말이다.[^dewey-1916]\n\n${DEWEY_DEF}`,
    `## edward-thorndike\n\n손다이크의 말이다.[^schunk-2012]\n\n${SCHUNK_DEF}`,
  ]);
  const { payloads, sectionCount } = render(md, {
    baseUrl: BASE,
    speakers: { "john-dewey": { name: "존 듀이" }, "edward-thorndike": { name: "에드워드 손다이크" } },
  });

  assert.equal(sectionCount, 2);
  assert.deepEqual(
    payloads.map((p) => p.username),
    ["존 듀이", "에드워드 손다이크"],
  );
  assert.match(payloads[0].content, /듀이의 말이다/);
  assert.doesNotMatch(payloads[0].content, /손다이크/);
});

test("각주가 절대 URL 링크로 바뀌고 원문에 `[^` 표기가 남지 않는다", () => {
  const md = answer([`## john-dewey\n\n주장이다.[^dewey-1916]\n\n${DEWEY_DEF}`]);
  const [p] = render(md, { baseUrl: BASE }).payloads;

  assert.match(p.content, new RegExp(`\\[A1\\]\\(${url("dewey-1916").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`));
  assert.doesNotMatch(p.content, /\[\^/);
  // 서지 범례는 등록된 제목을 그대로 담고 원문 URL(<...>)은 걷어낸다.
  assert.match(p.content, /-# A1 · \[John Dewey\. \(1916\)\. Democracy and Education\. Macmillan\]/);
  assert.doesNotMatch(p.content, /<https/);
  assert.doesNotMatch(p.content, /tier A/);
});

test("각주 번호는 등장 순서고 티어 문자를 앞에 단다", () => {
  const md = answer([
    `## john-dewey\n\n뒤의 것.[^schunk-2012] 앞의 것.[^dewey-1916]\n\n${DEWEY_DEF}\n${SCHUNK_DEF}`,
  ]);
  const [p] = render(md, { baseUrl: BASE }).payloads;
  assert.match(p.content, /뒤의 것\.\[B1\]/);
  assert.match(p.content, /앞의 것\.\[A2\]/);
});

test("각주 정의가 다른 섹션에 있어도 티어와 서지를 찾는다", () => {
  // 게이트 규칙 1은 정의가 파일 어딘가에 있기만 하면 통과시킨다. 정의 위치를 가정하면 안 된다.
  const md = answer([
    `## john-dewey\n\n정의는 아래에 있다.[^dewey-1916]`,
    `## edward-thorndike\n\n여기에 정의를 둔다.[^schunk-2012]\n\n${DEWEY_DEF}\n${SCHUNK_DEF}`,
  ]);
  const [first] = render(md, { baseUrl: BASE }).payloads;
  assert.match(first.content, /\[A1\]/);
  assert.match(first.content, /Democracy and Education/);
});

test("연속된 각주 참조 사이에 공백이 들어간다", () => {
  const md = answer([`## john-dewey\n\n주장.[^dewey-1916][^schunk-2012]\n\n${DEWEY_DEF}\n${SCHUNK_DEF}`]);
  const [p] = render(md, { baseUrl: BASE }).payloads;
  assert.match(p.content, /\) \[B2\]\(/);
});

test("한도를 넘으면 잘리고 잘린 조각이 화자를 유지한다", () => {
  const long = Array.from({ length: 12 }, (_, i) => `문단 ${i} ${"가".repeat(400)}`).join("\n\n");
  const md = answer([`## john-dewey\n\n${long}`]);
  const { payloads } = render(md, { baseUrl: BASE, speakers: { "john-dewey": { name: "존 듀이" } } });

  assert.ok(payloads.length > 1, "잘리지 않았다");
  for (const p of payloads) {
    assert.ok(p.content.length <= DEFAULT_LIMIT, `${p.content.length}자`);
    assert.equal(p.username, "존 듀이");
    assert.equal(p.section, 0);
    assert.equal(p.parts, payloads.length);
  }
  assert.deepEqual(
    payloads.map((p) => p.part),
    payloads.map((_, i) => i),
  );
});

test("서지 범례도 한도 계산에 들어간다", () => {
  // 본문만 세고 범례를 나중에 이어 붙이면 정확히 경계에서 넘친다.
  const limit = 200;
  const body = "가".repeat(limit - 20);
  const legend = "-# A1 · [저자. 제목](https://x.test/sources/a.html)";
  const parts = splitContent(body, legend, limit);

  assert.ok(parts.length > 1, "범례가 한도를 넘겼는데 한 조각으로 나왔다");
  for (const part of parts) assert.ok(part.length <= limit, `${part.length}자`);
  assert.match(parts.at(-1), /^-# A1/);
});

test("하드컷이 마크다운 링크를 가르지 않는다", () => {
  const limit = 80;
  const link = "[A1](https://taehyeonglim.github.io/edtech-oracle/sources/dewey-1916.html)";
  const parts = splitContent(`${"가".repeat(40)} ${link}`, "", limit);

  const whole = parts.filter((p) => p.includes(link)).length;
  assert.equal(whole, 1, "링크가 두 메시지로 갈렸다");
  for (const part of parts) {
    assert.equal((part.match(/\]\(https/g) ?? []).length, (part.match(/\.html\)/g) ?? []).length);
  }
});

test("섹션 인덱스 델타 — 이미 올린 수 이후만 나온다", () => {
  const md = answer([
    "## john-dewey\n\n첫째.",
    "## edward-thorndike\n\n둘째.",
    "## _orchestrator\n\n셋째.",
  ]);
  const all = render(md, { baseUrl: BASE });
  assert.equal(all.sectionCount, 3);

  const rest = render(md, { baseUrl: BASE, since: 2 });
  assert.equal(rest.sectionCount, 3, "sectionCount는 언제나 전체 수다");
  assert.deepEqual(
    rest.payloads.map((p) => p.section),
    [2],
  );
  assert.equal(render(md, { baseUrl: BASE, since: 3 }).payloads.length, 0);
});

test("커서가 파일보다 앞서면 빈 배열이 나온다 — 호출부가 이 경우를 실패로 다뤄야 한다", () => {
  // `/debate` 라운드 2에서 claude가 이어 쓰지 않고 새 파일을 만들면 앞 파일의 섹션 수가
  // 새 파일에 적용돼 델타가 통째로 비고, 라운드 전체가 채널에 올라오지 않는다.
  const md = answer(["## john-dewey\n\n새 파일의 첫 발언."]);
  const { payloads, sectionCount } = render(md, { baseUrl: BASE, since: 4 });
  assert.equal(payloads.length, 0);
  assert.equal(sectionCount, 1, "sectionCount는 커서가 아니라 파일의 실제 섹션 수다");
  // 커서를 버리면 되찾는다. index.mjs가 `created`일 때 하는 일이다.
  assert.equal(render(md, { baseUrl: BASE, since: 0 }).payloads.length, 1);
});

test("_orchestrator의 이름은 설정이 덮어쓰지 못한다", () => {
  // 사회자는 위인이 아니라 위키에 페이지가 없다. 이름을 설정에서 받으면 위인처럼
  // 보이게 만들 수 있고, 그러면 각주 없는 종합이 발언으로 읽힌다.
  const md = answer(["## _orchestrator\n\n이 둘은 학습의 소재지에서 갈린다."]);
  const [p] = render(md, {
    baseUrl: BASE,
    speakers: { _orchestrator: { name: "존 듀이", avatarUrl: "https://x.test/o.png" } },
  }).payloads;

  assert.equal(p.username, ORCHESTRATOR_NAME);
  assert.equal(p.avatarUrl, "https://x.test/o.png", "아바타는 호출부가 정한다");
});

test("아바타는 설정이 줄 때만 붙는다", () => {
  const md = answer(["## john-dewey\n\n말.", "## edward-thorndike\n\n말."]);
  const { payloads } = render(md, {
    baseUrl: BASE,
    speakers: { "john-dewey": { name: "존 듀이", avatarUrl: "https://x.test/d.png" } },
  });

  assert.equal(payloads[0].avatarUrl, "https://x.test/d.png");
  assert.ok(!("avatarUrl" in payloads[1]), "초상이 없는 위인에게 아바타가 붙었다");
  assert.equal(payloads[1].username, "edward-thorndike", "이름이 없으면 slug을 쓴다");
});

test("실제 답변 파일 회귀 검사", () => {
  const md = readFileSync(new URL("../answers/2026-08-15-what-is-learning.md", import.meta.url), "utf8");
  const { sectionCount, payloads } = render(md, {
    baseUrl: BASE,
    speakers: {
      "john-dewey": { name: "존 듀이" },
      "edward-thorndike": { name: "에드워드 손다이크" },
      "lev-vygotsky": { name: "레프 비고츠키" },
    },
  });

  assert.equal(sectionCount, 4);
  assert.deepEqual(
    [...new Set(payloads.map((p) => p.speaker))],
    ["john-dewey", "edward-thorndike", "lev-vygotsky", "_orchestrator"],
    "문서 순서가 곧 발언 순서다",
  );
  assert.ok(payloads.length > 4, `분할이 일어나지 않았다: ${payloads.length}`);

  for (const p of payloads) {
    assert.ok(p.content.length <= DEFAULT_LIMIT, `${p.speaker} ${p.part}: ${p.content.length}자`);
    assert.doesNotMatch(p.content, /\[\^/, `${p.speaker}에 미변환 각주`);
    assert.doesNotMatch(p.content, /\[\[/, `${p.speaker}에 미변환 위키링크`);
    assert.doesNotMatch(p.content, /undefined|\[object Object\]/, `${p.speaker}에 미변환 값`);
    for (const m of p.content.matchAll(/\]\((\S+?)\)/g)) {
      assert.match(m[1], /^https:\/\//, `상대 URL이 남았다: ${m[1]}`);
    }
  }

  // 사회자는 각주를 달 수 없다(규칙 7). 범례가 붙으면 안 된다.
  const orch = payloads.filter((p) => p.speaker === "_orchestrator");
  assert.equal(orch.length, 1);
  assert.doesNotMatch(orch[0].content, /^-#/m);
});

test("검사 요약 한 줄", () => {
  const md = readFileSync(new URL("../answers/2026-08-15-what-is-learning.md", import.meta.url), "utf8");
  const line = checkSummary(md);
  assert.match(line, /^근거 검사 — 각주 \d+건 · 위조급 0 · 형식급 15 · \[근거\] 5 \[적용\] 3 \[근거없음\] 0$/);
  assert.equal(checkSummary("---\ntype: answer\n---\n\n## a\n\n말."), null);
});
