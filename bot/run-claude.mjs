/**
 * 헤드리스 Claude Code 실행기.
 *
 * 오케스트레이터를 새로 쓰지 않는 이유가 여기 있다 — 저장소 안에서 `claude -p`를 돌리면
 * `.claude/commands/*.md`, 36개 위인 에이전트, 위키 접근, 답변 게이트가 전부 그대로 작동한다.
 * 이 모듈이 하는 일은 프로세스를 띄우고 JSON을 해석하고 `session_id`를 건네는 것뿐이다.
 */
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * 권한 모드. **실측으로 정했다.**
 *
 * 스펙 초안은 `dontAsk`였으나 실제로 돌려 보니 Bash는 통과하고 **Write가 거부된다.**
 * 그대로 뒀으면 봇이 답변 파일을 한 건도 저장하지 못한 채 "저장에 실패했습니다"라는
 * 산문만 게시했을 것이다. `acceptEdits`는 Write·Bash 모두 통과한다(2026-08-15 실측).
 * `bypassPermissions`는 전부 허용하지만 무인 실행에 그만한 권한을 줄 이유가 없다.
 */
export const PERMISSION_MODE = "acceptEdits";

/** `/lint`가 212초였다. `/debate` 한 라운드는 더 길 수 있어 넉넉히 잡는다. */
export const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

/**
 * `--disallowedTools`는 가변 인자(`<tools...>`)라 뒤따르는 값을 계속 삼킨다.
 * 질문 원문을 이 뒤에 놓으면 도구 이름으로 먹힌다 — 프롬프트는 언제나 `-p` 바로 뒤다.
 */
const DISALLOWED = ["AskUserQuestion"];

/**
 * `claude -p`를 한 번 실행한다.
 *
 * @param {object} opts
 * @param {string} opts.prompt  슬래시 커맨드를 포함한 프롬프트. `-p` 바로 뒤에 붙는다
 * @param {string} opts.cwd  저장소 경로. 여기가 아니면 커맨드도 에이전트도 위키도 없다
 * @param {string} [opts.resume]  이어 갈 `session_id`. `/debate` 2~3라운드가 쓴다
 * @param {string} [opts.appendSystemPrompt]  라운드 제어 주입. `debate.md`는 고치지 않는다
 * @returns {Promise<{ok: boolean, result: string, sessionId: string|null, turns: number,
 *   durationMs: number, error: string|null}>}  **거부하지 않는다.** 실패도 값으로 돌려준다 —
 *   호출부가 `try`로 감싸는 것을 잊어도 오류가 조용히 사라지지 않아야 한다
 */
export function buildArgs({
  prompt,
  resume = null,
  appendSystemPrompt = null,
  permissionMode = PERMISSION_MODE,
}) {
  const args = ["-p", prompt];
  if (resume) args.push("--resume", resume);
  if (appendSystemPrompt) args.push("--append-system-prompt", appendSystemPrompt);
  args.push("--permission-mode", permissionMode);
  args.push("--disallowedTools", ...DISALLOWED);
  // 가변 인자 뒤에 반드시 다른 플래그가 온다. 이 줄이 마지막이어야 하는 이유다.
  //
  // `stream-json`을 쓰는 이유는 **위인이 끝나는 순간을 알기 위해서**다. `json`은 프로세스가
  // 끝나야 한 덩어리로 나오는데, 위인 셋은 병렬로 돌다가 45초씩 벌어져 끝나고 그 뒤로도
  // 오케스트레이터가 파일을 쓰고 게이트를 도느라 2분 39초가 더 걸린다(실측). 스트림을 보면
  // 각 위인의 `tool_result`가 그 사람이 끝나는 즉시 도착한다.
  //
  // `--forward-subagent-text`는 쓰지 않는다. 서브에이전트 **내부** 메시지를 흘려주는 플래그인데
  // 우리가 필요한 최종 반환값은 그것 없이도 최상위 `tool_result`로 온다.
  args.push("--verbose", "--output-format", "stream-json");
  return args;
}

/**
 * 서브에이전트 반환 텍스트에 하네스가 덧붙이는 꼬리.
 *
 * 실측(2026-08-20 성능 프로브)에서 `tool_result` 텍스트 끝에 `agentId: …(use SendMessage …)`와
 * `<usage>…</usage>`가 붙어 왔다. 이것을 걷어내지 않으면 답변 게이트가 **위인이 쓰지도 않은
 * 문장을 위인의 산문으로 세고** 규칙 9(마커 없는 문단)를 발화시킨다. 형식급 수치가 위인 탓인지
 * 하네스 탓인지 구분되지 않으면 그 지표로는 아무것도 판정할 수 없다.
 *
 * 이 두 패턴만 지운다. 위인이 스스로 쓴 줄은 남긴다 — 그것이 규칙 위반이라면 그건 진짜 위반이고
 * 감춰야 할 것이 아니다.
 */
const META_RE = [
  /agentId:\s*\S+\s*\(use SendMessage[^)]*\)\s*/g,
  /<usage>[\s\S]*?<\/usage>\s*/g,
];

export function stripAgentMetadata(text) {
  let out = String(text ?? "");
  for (const re of META_RE) out = out.replace(re, "");
  return out.trim();
}

/**
 * 스트림에서 **서브에이전트가 끝나는 순간**을 잡아낸다.
 *
 * `tool_use:Agent`가 id와 `subagent_type`(=위인 slug)을 알려주고, 같은 id의 `tool_result`가
 * 그 위인의 최종 발언을 담아 온다. 둘 사이의 간격이 그 위인이 실제로 생각한 시간이다.
 *
 * `parent_tool_use_id`가 있는 이벤트는 서브에이전트 **안에서** 일어난 일이라 무시한다 —
 * 위인이 위키를 읽는 중간 과정이지 발언이 아니다.
 *
 * 순수 함수를 돌려준다. 프로세스도 디스코드도 모른다.
 */
export function makeSpeakerWatcher(onSpeaker) {
  const pending = new Map();
  return (ev) => {
    if (!ev || ev.parent_tool_use_id) return;
    const content = ev.message?.content;
    if (!Array.isArray(content)) return;
    for (const b of content) {
      if (b.type === "tool_use" && b.name === "Agent" && b.id) {
        pending.set(b.id, b.input?.subagent_type ?? null);
      } else if (b.type === "tool_result" && pending.has(b.tool_use_id)) {
        const slug = pending.get(b.tool_use_id);
        pending.delete(b.tool_use_id);
        const text = Array.isArray(b.content)
          ? b.content.map((x) => x?.text ?? "").join("")
          : String(b.content ?? "");
        if (slug) onSpeaker({ slug, text: stripAgentMetadata(text) });
      }
    }
  };
}

export function runClaude({
  prompt,
  cwd,
  resume = null,
  appendSystemPrompt = null,
  bin = "claude",
  timeoutMs = DEFAULT_TIMEOUT_MS,
  permissionMode = PERMISSION_MODE,
  onEvent = null,
} = {}) {
  const args = buildArgs({ prompt, resume, appendSystemPrompt, permissionMode });

  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    let buffer = "";
    let timedOut = false;

    /** NDJSON은 줄 단위지만 청크 경계가 줄 경계와 맞지 않는다. 완성된 줄만 넘긴다. */
    const feed = (chunk) => {
      buffer += chunk;
      let nl;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let ev;
        try {
          ev = JSON.parse(line);
        } catch {
          continue; // JSON이 아닌 줄은 흘려보낸다. 마지막 result만 있으면 된다
        }
        // 마지막 `result` 이벤트가 `--output-format json`의 출력과 같은 모양이라
        // `parseResult()`를 그대로 재사용한다.
        if (ev.type === "result") out = line;
        if (onEvent) {
          try {
            onEvent(ev);
          } catch (e) {
            // 구독자의 예외가 실행을 죽이지 않는다. 게시가 실패해도 답변은 끝까지 간다.
            err += `\n[onEvent] ${e.message}`;
          }
        }
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      feed(String(d));
    });
    child.stderr.on("data", (d) => {
      err += d;
    });

    const fail = (error) =>
      resolve({ ok: false, result: "", sessionId: null, turns: 0, durationMs: 0, error });

    child.on("error", (e) => {
      clearTimeout(timer);
      fail(`claude 실행 실패: ${e.message}`);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      feed("\n"); // 줄바꿈 없이 끝난 마지막 줄을 흘려보내지 않는다
      if (timedOut) return fail(`${Math.round(timeoutMs / 1000)}초 안에 끝나지 않아 중단했다`);
      resolve(parseResult({ out, err, code }));
    });
  });
}

/** `--output-format json`의 출력을 해석한다. 순수 함수라 실패 경로를 테스트할 수 있다. */
export function parseResult({ out, err = "", code = 0 }) {
  let json;
  try {
    json = JSON.parse(out);
  } catch {
    // 표준출력이 JSON이 아니면 무엇이 잘못됐는지 아는 것은 stderr뿐이다. 삼키지 않는다.
    const tail = (err || out).trim().slice(-800);
    return {
      ok: false,
      result: "",
      sessionId: null,
      turns: 0,
      durationMs: 0,
      error: `출력을 JSON으로 읽지 못했다 (종료 코드 ${code})\n${tail}`,
    };
  }
  const result = typeof json.result === "string" ? json.result : "";
  return {
    ok: code === 0 && json.is_error !== true,
    result,
    sessionId: json.session_id ?? null,
    turns: json.num_turns ?? 0,
    durationMs: json.duration_ms ?? 0,
    error: code === 0 && json.is_error !== true ? null : result || `종료 코드 ${code}`,
  };
}

/** `answers/`의 `.md` 파일 이름 집합. 실행 전후를 비교해 새 답변을 찾는다. */
export function snapshotAnswers(dir) {
  try {
    return new Set(readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md"));
  } catch {
    return new Set();
  }
}

/**
 * 이번 실행이 만든 답변 파일.
 *
 * 새 파일이 없으면 `null`이 아니라 **가장 최근에 수정된 파일**을 돌려준다 —
 * `/debate` 2~3라운드는 같은 파일에 이어 쓰므로 새 파일이 생기지 않는다.
 * 그래서 새로 생긴 것인지(`created`) 함께 알려준다.
 */
export function findAnswer(dir, before) {
  const now = [...snapshotAnswers(dir)];
  const created = now.filter((f) => !before.has(f));
  const pick = (list) =>
    list
      .map((f) => ({ f, m: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m)[0]?.f ?? null;

  if (created.length) return { file: pick(created), created: true };
  const latest = pick(now);
  return { file: latest, created: false };
}
