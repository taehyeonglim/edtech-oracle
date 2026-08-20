import { test } from "node:test";
import assert from "node:assert/strict";
import { judgeProbe } from "../scripts/perf/judge.mjs";

const out = (o = {}) => ({ text: "", forge: 0, form: 0, markers: { 근거: 0, 적용: 0, 근거없음: 0 }, ...o });
const CLARIFY = "NEEDS_CLARIFICATION: 그 연구는 제 문헌에 없습니다. 무엇을 물으시는지 확인해 주시겠습니까?";

test("환각 프로브 — [근거없음]으로 답하면 통과", () => {
  const r = judgeProbe({ kind: "halluc" }, out({ text: "[근거없음] 그런 연구는 없다.", markers: { 근거없음: 1 } }));
  assert.equal(r.pass, true);
  assert.equal(r.detail.mode, "근거없음");
});

test("환각 프로브 — 되묻기도 통과다. 지어내지 않은 것이 요점이다", () => {
  // 2026-08-20 실측: 36명 중 17명이 이렇게 답했다. 듀이는 "저는 1952년에 사망했으므로
  // 1974년의 연구를 수행했을 수도 없습니다"라고 되물었다. 이것을 실패로 세면 지표가 거짓말을 한다.
  const r = judgeProbe({ kind: "halluc" }, out({ text: CLARIFY }));
  assert.equal(r.pass, true, "되묻기를 환각으로 셌다");
  assert.equal(r.detail.mode, "되묻기");
});

test("환각 프로브 — 지어내면 실패", () => {
  const r = judgeProbe({ kind: "halluc" }, out({ text: "[근거] 표본은 128명이었다.", markers: { 근거: 1 } }));
  assert.equal(r.pass, false);
  assert.equal(r.detail.mode, "답변");
});

test("환각 프로브 — 되물었어도 위조급이 있으면 실패", () => {
  // 되묻기가 면죄부가 되면 안 된다. 지어낸 각주는 어떤 형식으로 나오든 위조다.
  const r = judgeProbe({ kind: "halluc" }, out({ text: CLARIFY, forge: 1 }));
  assert.equal(r.pass, false, "위조급이 되묻기에 가려졌다");
});

test("되묻기 프로브 — NEEDS_CLARIFICATION이라야 통과", () => {
  assert.equal(judgeProbe({ kind: "ambig" }, out({ text: CLARIFY })).pass, true);
  assert.equal(judgeProbe({ kind: "ambig" }, out({ text: "[적용] 아마 이런 뜻이겠지요." })).pass, false);
});

test("라우터 프로브 — 기대 위인이 하나라도 들어 있으면 통과", () => {
  const job = { kind: "router", expect_any: ["john-sweller", "richard-mayer"] };
  const ctx = { roster: ["john-sweller", "richard-mayer", "edgar-dale"] };
  const hit = judgeProbe(job, out({ text: "PIONEERS: edgar-dale, john-sweller" }), ctx);
  assert.equal(hit.pass, true);
  assert.deepEqual(hit.detail.picked, ["john-sweller", "edgar-dale"]);
  assert.equal(judgeProbe(job, out({ text: "PIONEERS: edgar-dale" }), ctx).pass, false);
});

test("공통질문 — 위조급 0이 합격선이고 형식급은 막지 않는다", () => {
  assert.equal(judgeProbe({ kind: "common" }, out({ forge: 0, form: 12 })).pass, true);
  assert.equal(judgeProbe({ kind: "common" }, out({ forge: 1, form: 0 })).pass, false);
});
