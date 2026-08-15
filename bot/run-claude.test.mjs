import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, utimesSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildArgs,
  parseResult,
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

  const i = args.indexOf("--disallowedTools");
  assert.ok(i > 0);
  assert.equal(args[i + 1], "AskUserQuestion");
  assert.equal(args[i + 2], "--output-format", "가변 인자 뒤에 플래그가 없으면 안 된다");
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
    stdout: JSON.stringify({ result: "안녕", session_id: "sid-9", num_turns: 1 }),
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
  const bin = fakeClaude(dir, { stdout: "{}", sleep: 5 });
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
