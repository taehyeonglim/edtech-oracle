import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, utimesSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildArgs,
  parseResult,
  makeSpeakerWatcher,
  runClaude,
  snapshotAnswers,
  findAnswer,
  PERMISSION_MODE,
} from "./run-claude.mjs";

const tmp = () => mkdtempSync(join(tmpdir(), "oracle-bot-"));

/** `claude` 대신 세울 가짜 실행 파일. 표준출력·종료 코드·지연을 마음대로 정한다. */
function fakeClaude(dir, { stdout = "", stderr = "", code = 0, sleep = 0 }) {
  const bin = join(dir, "fake-claude");
  writeFileSync(
    bin,
    `#!/bin/sh\n[ ${sleep} -gt 0 ] && sleep ${sleep}\n` +
      `cat <<'EOF'\n${stdout}\nEOF\n` +
      (stderr ? `cat >&2 <<'EOF'\n${stderr}\nEOF\n` : "") +
      `exit ${code}\n`,
  );
  chmodSync(bin, 0o755);
  return bin;
}

test("프롬프트는 -p 바로 뒤에 온다 — 가변 인자에 먹히면 안 된다", () => {
  // `--disallowedTools <tools...>`는 뒤따르는 값을 계속 삼킨다. 질문을 이 뒤에 놓으면
  // 도구 이름으로 먹혀 프롬프트가 통째로 사라진다.
  const args = buildArgs({ prompt: "/ask 학습이란 무엇일까?" });
  assert.equal(args[0], "-p");
  assert.equal(args[1], "/ask 학습이란 무엇일까?");
  assert.equal(args.at(-2), "--output-format");
  assert.equal(args.at(-1), "stream-json", "위인이 끝나는 순간을 알려면 스트림이어야 한다");

  const i = args.indexOf("--disallowedTools");
  assert.ok(i > 0);
  assert.equal(args[i + 1], "AskUserQuestion");
  assert.match(args[i + 2], /^--/, "가변 인자 뒤에는 반드시 다른 플래그가 와야 값이 안 먹힌다");
  assert.notEqual(args.at(-1), "AskUserQuestion", "가변 인자가 마지막이면 안 된다");
});

test("권한 모드는 acceptEdits다 — dontAsk는 Write를 막는다", () => {
  assert.equal(PERMISSION_MODE, "acceptEdits");
  assert.ok(buildArgs({ prompt: "x" }).includes("acceptEdits"));
});

test("resume과 append-system-prompt는 줄 때만 붙는다", () => {
  const plain = buildArgs({ prompt: "x" });
  assert.ok(!plain.includes("--resume"));
  assert.ok(!plain.includes("--append-system-prompt"));

  const full = buildArgs({ prompt: "x", resume: "sid-1", appendSystemPrompt: "라운드 1까지만" });
  assert.equal(full[full.indexOf("--resume") + 1], "sid-1");
  assert.equal(full[full.indexOf("--append-system-prompt") + 1], "라운드 1까지만");
});

test("정상 결과에서 session_id를 꺼낸다", () => {
  const r = parseResult({
    out: JSON.stringify({ result: "끝", session_id: "abc", num_turns: 3, duration_ms: 1200 }),
  });
  assert.deepEqual(r, {
    ok: true,
    result: "끝",
    sessionId: "abc",
    turns: 3,
    durationMs: 1200,
    error: null,
  });
});

test("is_error는 종료 코드가 0이어도 실패다", () => {
  const r = parseResult({ out: JSON.stringify({ is_error: true, result: "레이트리밋" }), code: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.error, "레이트리밋");
});

test("JSON이 아니면 stderr를 그대로 담아 돌려준다 — 조용히 죽지 않는다", () => {
  const r = parseResult({ out: "not json", err: "command not found: claude", code: 127 });
  assert.equal(r.ok, false);
  assert.match(r.error, /127/);
  assert.match(r.error, /command not found/);
});

test("실행에 성공하면 값으로 돌려준다", async () => {
  const dir = tmp();
  const bin = fakeClaude(dir, {
    stdout: [
      JSON.stringify({ type: "system", subtype: "init" }),
      JSON.stringify({ type: "result", result: "안녕", session_id: "sid-9", num_turns: 1 }),
    ].join("\n"),
  });
  const r = await runClaude({ prompt: "x", cwd: dir, bin });
  assert.equal(r.ok, true);
  assert.equal(r.sessionId, "sid-9");
  rmSync(dir, { recursive: true, force: true });
});

test("실행 파일이 없어도 예외를 던지지 않는다", async () => {
  const dir = tmp();
  const r = await runClaude({ prompt: "x", cwd: dir, bin: join(dir, "없는파일") });
  assert.equal(r.ok, false);
  assert.match(r.error, /claude 실행 실패/);
  rmSync(dir, { recursive: true, force: true });
});

test("시간을 넘기면 중단하고 그 사실을 남긴다", async () => {
  const dir = tmp();
  const bin = fakeClaude(dir, { stdout: JSON.stringify({ type: "result" }), sleep: 5 });
  const r = await runClaude({ prompt: "x", cwd: dir, bin, timeoutMs: 300 });
  assert.equal(r.ok, false);
  assert.match(r.error, /끝나지 않아 중단/);
  rmSync(dir, { recursive: true, force: true });
});

test("새로 생긴 답변 파일을 찾는다", () => {
  const dir = tmp();
  writeFileSync(join(dir, "README.md"), "");
  writeFileSync(join(dir, "2026-08-14-old.md"), "");
  const before = snapshotAnswers(dir);
  assert.deepEqual([...before], ["2026-08-14-old.md"], "README.md는 답변이 아니다");

  writeFileSync(join(dir, "2026-08-15-new.md"), "");
  assert.deepEqual(findAnswer(dir, before), { file: "2026-08-15-new.md", created: true });
  rmSync(dir, { recursive: true, force: true });
});

test("새 파일이 없으면 가장 최근에 고친 파일을 준다 — /debate는 이어 쓴다", () => {
  // 2~3라운드는 같은 파일에 덧붙이므로 새 파일이 생기지 않는다. 여기서 null을 주면
  // 라운드 2 이후의 발언이 통째로 채널에 안 올라간다.
  const dir = tmp();
  writeFileSync(join(dir, "a.md"), "");
  writeFileSync(join(dir, "b.md"), "");
  const old = Date.now() / 1000 - 600;
  utimesSync(join(dir, "a.md"), old, old);
  const before = snapshotAnswers(dir);

  assert.deepEqual(findAnswer(dir, before), { file: "b.md", created: false });
  rmSync(dir, { recursive: true, force: true });
});

test("답변 디렉터리가 없어도 터지지 않는다", () => {
  assert.deepEqual([...snapshotAnswers("/없는/경로")], []);
  assert.deepEqual(findAnswer("/없는/경로", new Set()), { file: null, created: false });
});

/** 스트림 이벤트 한 줄을 만든다. 실제 `stream-json` 출력에서 뽑은 모양이다. */
const ev = (content, parent = null) => ({
  type: "assistant",
  ...(parent ? { parent_tool_use_id: parent } : {}),
  message: { content },
});

test("서브에이전트가 끝나는 순간을 잡아낸다", () => {
  const got = [];
  const watch = makeSpeakerWatcher((s) => got.push(s));

  watch(ev([{ type: "tool_use", name: "Agent", id: "t1", input: { subagent_type: "john-dewey" } }]));
  watch(ev([{ type: "tool_use", name: "Agent", id: "t2", input: { subagent_type: "lev-vygotsky" } }]));
  // 위인이 위키를 읽는 중간 과정. 발언이 아니므로 무시한다.
  watch(ev([{ type: "tool_use", name: "Read", id: "r1", input: {} }], "t1"));
  // 비고츠키가 먼저 끝난다 — 호출 순서와 완료 순서는 다르다.
  watch(ev([{ type: "tool_result", tool_use_id: "t2", content: [{ type: "text", text: "비고츠키 발언" }] }]));
  watch(ev([{ type: "tool_result", tool_use_id: "t1", content: "듀이 발언" }]));

  assert.deepEqual(got, [
    { slug: "lev-vygotsky", text: "비고츠키 발언" },
    { slug: "john-dewey", text: "듀이 발언" },
  ]);
});

test("서브에이전트 안에서 일어난 일은 발언으로 세지 않는다", () => {
  const got = [];
  const watch = makeSpeakerWatcher((s) => got.push(s));
  // 위인이 자기 안에서 또 다른 Agent를 부르는 경우. parent가 있으면 통째로 무시한다.
  watch(ev([{ type: "tool_use", name: "Agent", id: "inner", input: { subagent_type: "router" } }], "t1"));
  watch(ev([{ type: "tool_result", tool_use_id: "inner", content: "x" }], "t1"));
  assert.deepEqual(got, []);
});

test("스트림이 청크 경계에서 잘려도 이벤트를 잃지 않는다", async () => {
  // NDJSON은 줄 단위지만 파이프 청크는 줄 경계를 지키지 않는다.
  const dir = tmp();
  const bin = join(dir, "chunky");
  const line = JSON.stringify({ type: "result", result: "끝", session_id: "sid-c" });
  writeFileSync(
    bin,
    `#!/bin/sh\nprintf '%s' '${line.slice(0, 20)}'\nsleep 0.2\nprintf '%s\\n' '${line.slice(20)}'\n`,
  );
  chmodSync(bin, 0o755);

  const seen = [];
  const r = await runClaude({ prompt: "x", cwd: dir, bin, onEvent: (e) => seen.push(e.type) });
  assert.equal(r.sessionId, "sid-c", "반쪽 줄을 이어 붙이지 못했다");
  assert.deepEqual(seen, ["result"]);
  rmSync(dir, { recursive: true, force: true });
});

test("구독자가 터져도 실행은 끝까지 간다", async () => {
  const dir = tmp();
  const bin = fakeClaude(dir, {
    stdout: JSON.stringify({ type: "result", result: "끝", session_id: "sid-x" }),
  });
  const r = await runClaude({ prompt: "x", cwd: dir, bin, onEvent: () => { throw new Error("게시 실패"); } });
  assert.equal(r.ok, true, "구독자의 예외가 실행을 죽였다");
  assert.equal(r.sessionId, "sid-x");
  rmSync(dir, { recursive: true, force: true });
});

test("하네스가 덧붙인 메타데이터는 발언에서 걷어낸다", () => {
  // 실측(2026-08-20 성능 프로브)에서 tool_result 텍스트 끝에 `agentId: …`와 `<usage>` 블록이
  // 붙어 왔다. 걷어내지 않으면 답변 게이트가 이것을 위인의 산문으로 세고 규칙 9(마커 없는 문단)를
  // 발화시킨다 — 위인이 쓰지도 않은 문장으로 지표가 깎인다.
  const got = [];
  const watch = makeSpeakerWatcher((s) => got.push(s));
  watch(ev([{ type: "tool_use", name: "Agent", id: "t1", input: { subagent_type: "sidney-pressey" } }]));
  watch(
    ev([
      {
        type: "tool_result",
        tool_use_id: "t1",
        content: [
          {
            type: "text",
            text:
              "[근거] 즉각적 확인이 핵심이다.[^pressey-1926]\n\n" +
              "관련 파일: `/repo/wiki/pioneers/sidney-pressey.md`" +
              "agentId: a3917f2184e541996 (use SendMessage with to: 'a3917f2184e541996', summary: '<5-10 word recap>' to continue this agent)\n" +
              "<usage>subagent_tokens: 18071\ntool_uses: 1\nduration_ms: 42049</usage>",
          },
        ],
      },
    ]),
  );

  assert.equal(got.length, 1);
  assert.ok(!got[0].text.includes("agentId:"), "agentId 꼬리가 발언에 남았다");
  assert.ok(!got[0].text.includes("<usage>"), "usage 블록이 발언에 남았다");
  assert.ok(got[0].text.includes("즉각적 확인이 핵심이다"), "위인의 발언까지 잘라냈다");
  // 위인이 스스로 쓴 줄은 남긴다. 그것은 진짜 규칙 9 위반이고 하네스가 숨길 일이 아니다.
  assert.ok(got[0].text.includes("관련 파일:"), "위인이 쓴 줄까지 걷어냈다");
});

test("메타데이터가 없는 발언은 손대지 않는다", () => {
  const got = [];
  const watch = makeSpeakerWatcher((s) => got.push(s));
  watch(ev([{ type: "tool_use", name: "Agent", id: "t1", input: { subagent_type: "john-dewey" } }]));
  watch(ev([{ type: "tool_result", tool_use_id: "t1", content: "[근거] 경험의 재구성이다.[^dewey-1938]" }]));
  assert.equal(got[0].text, "[근거] 경험의 재구성이다.[^dewey-1938]");
});
