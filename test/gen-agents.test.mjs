import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAgent } from "../scripts/gen-agents.mjs";

const GAGNE = {
  id: "pioneers/robert-gagne",
  fm: {
    title: "로버트 가녜",
    slug: "robert-gagne",
    type: "pioneer",
    role: "교육심리학자 · 교수설계 연구자",
    life: "1916—2002",
    concepts: ["학습 결과", "아홉 가지 수업사태", "내적 조건", "외적 조건"],
    related: ["[[debates/skinner-gagne]]", "[[debates/bloom-gagne]]"],
  },
};

test("위인 페이지 프론트매터로 에이전트 정의를 만든다", () => {
  const md = buildAgent(GAGNE);
  assert.match(md, /^---\n/);
  assert.match(md, /name: robert-gagne/);
  assert.match(md, /model: sonnet/);
  assert.match(md, /tools: Read, Grep, Glob/);
  assert.match(md, /wiki\/pioneers\/robert-gagne\.md/);
});

test("쓰기 도구를 절대 넣지 않는다", () => {
  const md = buildAgent(GAGNE);
  const frontmatter = md.slice(0, md.indexOf("---", 3));
  for (const forbidden of ["Write", "Edit", "Bash", "NotebookEdit"]) {
    assert.ok(!frontmatter.includes(forbidden), `${forbidden}가 도구 목록에 있으면 안 된다`);
  }
});

test("3마커 규칙과 되묻기 규약이 프롬프트에 들어간다", () => {
  const md = buildAgent(GAGNE);
  assert.match(md, /\[근거\]/);
  assert.match(md, /\[적용\]/);
  assert.match(md, /\[근거없음\]/);
  assert.match(md, /NEEDS_CLARIFICATION/);
});

test("description은 한 줄이고 개념을 3개까지만 담는다", () => {
  const md = buildAgent(GAGNE);
  const line = md.split("\n").find((l) => l.startsWith("description:"));
  assert.ok(line, "description 줄이 있어야 한다");
  assert.ok(!line.includes("\n"));
  assert.ok(line.includes("학습 결과"));
  assert.ok(!line.includes("외적 조건"), "네 번째 개념은 잘려야 한다");
});

test("대립축 링크를 읽기 허용 목록에 넣는다", () => {
  const md = buildAgent(GAGNE);
  assert.match(md, /\[\[debates\/skinner-gagne\]\]/);
  assert.match(md, /\[\[debates\/bloom-gagne\]\]/);
});

test("다른 위인 페이지를 읽지 말라는 경계가 명시된다", () => {
  const md = buildAgent(GAGNE);
  assert.match(md, /다른 위인의 페이지는 읽지 않는다/);
});
