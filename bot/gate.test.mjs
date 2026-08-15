import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadAnswerContext } from "../scripts/check-answer.mjs";
import { gateSection, sectionMarkdown, sameText } from "./gate.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const ctx = loadAnswerContext({ wikiDir: join(ROOT, "wiki"), sourcesPath: join(ROOT, "sources.json") });
const pioneers = new Set(["john-dewey", "edward-thorndike"]);
const dir = mkdtempSync(join(tmpdir(), "oracle-gate-test-"));
const gate = (slug, text) => gateSection({ slug, text, ctx, dir, pioneers });

const DEWEY =
  "[근거] 교육은 경험의 재구성이다.[^dewey-1916]\n\n" +
  "[^dewey-1916]: John Dewey. (1916). Democracy and Education. Macmillan. — tier A · [[sources/dewey-1916]]";

test("깨끗한 발언은 통과한다", () => {
  const r = gate("john-dewey", DEWEY);
  assert.equal(r.skip, null);
  assert.deepEqual(r.forge, []);
  assert.match(r.md, /^## john-dewey$/m);
});

test("인용 범위를 벗어난 각주는 막힌다 — 게이트의 핵심 규칙", () => {
  // 듀이 페이지의 sources에 없는 출처. 첫 실전 실행에서 실제로 위조급 5건이 이렇게 잡혔다.
  const r = gate(
    "john-dewey",
    "[근거] 인지부하가 어쩌고.[^sweller-1988]\n\n" +
      "[^sweller-1988]: John Sweller. (1988). Cognitive Load. — tier B · [[sources/sweller-1988]]",
  );
  assert.ok(r.forge.length > 0, "범위 밖 인용이 통과했다");
  assert.match(r.skip, /위조급/);
});

test("sources.json에 없는 출처도 막힌다", () => {
  const r = gate(
    "john-dewey",
    "[근거] 주장.[^t-dewey-1916]\n\n[^t-dewey-1916]: John Dewey. (1916). — tier A · [[sources/t-dewey-1916]]",
  );
  assert.ok(r.forge.length > 0);
});

test("되묻기 신호는 발언이 아니므로 올리지 않는다", () => {
  const r = gate("john-dewey", "NEEDS_CLARIFICATION: 어떤 맥락의 학습을 말하는가?");
  assert.equal(r.skip, "되묻기 신호");
  assert.deepEqual(r.forge, []);
});

test("위인이 아닌 화자는 올리지 않는다", () => {
  assert.equal(gate("router", "PIONEERS: john-dewey").skip, "위인이 아니다");
  assert.equal(gate("john-dewey", "   ").skip, "발언이 비어 있다");
});

test("형식급 위반만으로는 막지 않는다", () => {
  // 마커 없는 문단(규칙 9)은 형식급이다. 기록만 하고 답변은 그대로 나간다.
  const r = gate("john-dewey", DEWEY.replace("[근거] ", ""));
  assert.equal(r.skip, null, "형식급이 게시를 막았다");
});

test("공백 차이는 정정으로 세지 않는다", () => {
  assert.ok(sameText("가 나  다", "가\n나 다"));
  assert.ok(!sameText("가 나 다", "가 나 라"));
});

test("화자 하나짜리 파일은 게이트가 요구하는 프론트매터를 갖춘다", () => {
  const md = sectionMarkdown("john-dewey", "말.");
  assert.match(md, /type: answer/);
  assert.match(md, /speakers:\n {2}- john-dewey/);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
