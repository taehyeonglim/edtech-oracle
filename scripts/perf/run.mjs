#!/usr/bin/env node
/**
 * 위인 성능 프로브 러너.
 *
 * 새 오케스트레이터를 쓰지 않는다. 봇이 실전 검증한 부품을 그대로 쓴다 —
 * `runClaude()`가 헤드리스 실행, `makeSpeakerWatcher()`가 위인이 끝나는 순간과 원문 발언,
 * `checkAnswer()`가 채점이다. 이 파일이 더하는 것은 "무엇을 묻는가"와 "결과를 어떻게 세는가"뿐이다.
 *
 * 산출물은 `answers/`가 아니라 `perf-runs/`에 쓴다. 테스트 답변이 `answers/`에 섞이면
 * `lint:answers` 지표가 오염돼 기준선의 측정 영점이 무의미해진다.
 *
 *   node scripts/perf/run.mjs --out perf-runs/2026-08-20
 *   node scripts/perf/run.mjs --only richard-mayer,seymour-papert --kinds common,halluc
 *   node scripts/perf/run.mjs --kinds router --concurrency 2
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { runClaude, makeSpeakerWatcher, snapshotAnswers } from "../../bot/run-claude.mjs";
import { checkAnswer, loadAnswerContext } from "../check-answer.mjs";
import { sectionMarkdown } from "../../bot/gate.mjs";

const REPO = process.cwd();
const PROBES = JSON.parse(readFileSync("scripts/perf/probes.json", "utf8"));

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const list = (name) => {
  const v = arg(name, "");
  return v ? v.split(",").map((s) => s.trim()).filter(Boolean) : null;
};

const OUT = arg("--out", `perf-runs/${new Date().toISOString().slice(0, 10)}`);
const BASELINE = arg("--baseline", latestBaseline());
const ONLY = list("--only");
const KINDS = new Set(list("--kinds") ?? ["common", "halluc", "ambig", "router"]);
const CONCURRENCY = Number(arg("--concurrency", "3"));
const TIMEOUT_MS = Number(arg("--timeout", String(8 * 60 * 1000)));

function latestBaseline() {
  const files = readdirSync("docs/baselines").filter((f) => f.endsWith(".json")).sort();
  if (!files.length) throw new Error("기준선이 없다. node scripts/baseline.mjs --out … 을 먼저 돌린다");
  return join("docs/baselines", files.at(-1));
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
/** 명단의 정본은 기준선이다. 프로브 파일에 위인을 나열하지 않는 이유 — 두 곳에 있으면 어긋난다. */
const ROSTER = baseline.pioneers.map((p) => p.slug);
const KNOWLEDGE = new Map(baseline.pioneers.map((p) => [p.slug, p]));

/**
 * 위인을 **직접 지명**해 부른다. 라우터를 거치지 않으므로 위인 성능과 라우터 성능이 섞이지 않는다.
 * "요약하지 말라"가 핵심이다 — 오케스트레이터가 손대면 채점 대상이 위인의 발언이 아니게 된다.
 */
const pioneerPrompt = (slug, question) =>
  `Agent 도구로 subagent_type을 "${slug}"으로 지정해 정확히 1회 호출하고, 아래 질문을 그대로 전달하라.\n` +
  `서브에이전트가 돌려준 텍스트를 요약·수정·보완하지 말고 그대로 최종 출력으로 내라.\n` +
  `어떤 파일도 만들거나 고치지 마라. answers/ 에 저장하지 않는다.\n\n질문: ${question}`;

const routerPrompt = (question) =>
  `Agent 도구로 subagent_type을 "router"로 지정해 1회 호출하고 아래 질문을 그대로 전달하라.\n` +
  `router가 돌려준 결과를 요약하지 말고 그대로 출력하라. 위인 에이전트는 호출하지 마라.\n` +
  `어떤 파일도 만들거나 고치지 마라.\n\n질문: ${question}`;

function buildJobs() {
  const jobs = [];
  const targets = ROSTER.filter((s) => !ONLY || ONLY.includes(s));
  const deep = PROBES.deep.filter((d) => !ONLY || ONLY.includes(d.slug));

  if (KINDS.has("common")) {
    for (const slug of targets) {
      jobs.push({ id: `${PROBES.common.id}/${slug}`, kind: "common", slug, question: PROBES.common.question });
    }
  }
  if (KINDS.has("halluc")) {
    for (const d of deep) {
      jobs.push({ id: `${d.hallucination.id}`, kind: "halluc", slug: d.slug, question: d.hallucination.question });
    }
  }
  if (KINDS.has("ambig") && PROBES.ambiguity.applies_to_deep) {
    for (const d of deep) {
      jobs.push({ id: `${PROBES.ambiguity.id}/${d.slug}`, kind: "ambig", slug: d.slug, question: PROBES.ambiguity.question });
    }
  }
  if (KINDS.has("router") && !ONLY) {
    for (const r of PROBES.router) {
      jobs.push({ id: r.id, kind: "router", slug: "router", question: r.question, expect_any: r.expect_any });
    }
  }
  return jobs;
}

const ctx = loadAnswerContext({ wikiDir: "wiki", sourcesPath: "sources.json" });
const CLARIFY_RE = /^\s*NEEDS_CLARIFICATION\s*:/m;

/**
 * 프로브 종류별 합격 판정. **자연어가 참인지는 판정하지 않는다** —
 * 검사기 관할을 좁게 유지한다는 이 저장소의 규율을 따른다.
 */
function judge(job, { text, forge, form, markers }) {
  if (job.kind === "router") {
    const picked = ROSTER.filter((s) => text.includes(s));
    return {
      pass: job.expect_any.some((s) => picked.includes(s)),
      detail: { picked, expected_any: job.expect_any },
    };
  }
  if (job.kind === "ambig") {
    return { pass: CLARIFY_RE.test(text), detail: { clarified: CLARIFY_RE.test(text) } };
  }
  if (job.kind === "halluc") {
    // 없는 문헌을 물었다. 정답은 [근거없음]이고, 각주를 달았다면 지어낸 것이다.
    const said_none = markers.근거없음 > 0;
    return {
      pass: said_none && forge === 0,
      detail: { said_none, marker_none: markers.근거없음, marker_grounded: markers.근거, forge },
    };
  }
  // common — 게이트가 판정한다. 위조급 0이 합격선이고 형식급은 기록만 한다.
  return { pass: forge === 0, detail: { forge, form } };
}

async function runOne(job, outDir) {
  const speakers = [];
  const watch = makeSpeakerWatcher((s) => speakers.push(s));
  const started = Date.now();
  const res = await runClaude({
    prompt: job.kind === "router" ? routerPrompt(job.question) : pioneerPrompt(job.slug, job.question),
    cwd: REPO,
    timeoutMs: TIMEOUT_MS,
    onEvent: watch,
  });

  // 이 값이 이 하네스에서 가장 중요하다. 답변이 Agent 도구를 거치지 않고 왔다면
  // 오케스트레이터가 위인 대신 직접 쓴 것이고, 그러면 인용 범위 검사(규칙 3)의 전제가 무너진다.
  const own = speakers.filter((s) => s.slug === job.slug);
  const via_subagent = own.length > 0;
  const text = (via_subagent ? own.map((s) => s.text).join("\n\n") : res.result) ?? "";

  const record = {
    id: job.id,
    kind: job.kind,
    slug: job.slug,
    ok: res.ok,
    error: res.error,
    via_subagent,
    subagents_called: speakers.map((s) => s.slug),
    duration_ms: res.durationMs || Date.now() - started,
    turns: res.turns,
    chars: text.length,
  };

  if (job.kind !== "router" && text.trim()) {
    // 화자 하나짜리 답변 파일을 만들어 진짜 게이트에 넣는다. 채점기를 새로 쓰지 않는 이유다.
    const file = join(outDir, "sections", `${job.id.replace(/\//g, "__")}.md`);
    writeFileSync(file, sectionMarkdown(job.slug, text));
    const { findings, markers } = checkAnswer({ file, ctx });
    record.forge = findings.filter((f) => f.severity === "forge").length;
    record.form = findings.length - record.forge;
    record.markers = markers;
    record.findings = findings.map((f) => `${f.severity === "forge" ? "위조" : "형식"} [규칙 ${f.rule}] ${f.message}`);
  } else {
    record.forge = 0;
    record.form = 0;
    record.markers = { 근거: 0, 적용: 0, 근거없음: 0 };
    record.findings = [];
    if (job.kind === "router") {
      writeFileSync(join(outDir, "sections", `${job.id}.txt`), text);
    }
  }

  const j = judge(job, { text, forge: record.forge, form: record.form, markers: record.markers });
  record.pass = res.ok && j.pass;
  record.judge = j.detail;
  return record;
}

/** 동시 실행 상한. claude -p는 프로세스 하나를 통째로 띄우므로 무제한으로 풀면 기계가 죽는다. */
async function pool(jobs, n, fn) {
  const out = new Array(jobs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, jobs.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= jobs.length) return;
        out[i] = await fn(jobs[i], i);
      }
    }),
  );
  return out;
}

const jobs = buildJobs();
mkdirSync(join(OUT, "sections"), { recursive: true });
const answersBefore = snapshotAnswers("answers");

console.log(`프로브 ${jobs.length}건 · 동시 ${CONCURRENCY} · 기준선 ${BASELINE}`);
const t0 = Date.now();
let done = 0;
const results = await pool(jobs, CONCURRENCY, async (job) => {
  const r = await runOne(job, OUT);
  done += 1;
  const mark = r.pass ? "통과" : "실패";
  const iso = r.kind === "router" ? "" : r.via_subagent ? "" : " ⚠격리깨짐";
  console.log(
    `  [${String(done).padStart(2)}/${jobs.length}] ${mark} ${r.id} · ${Math.round(r.duration_ms / 1000)}s` +
      (r.forge ? ` · 위조${r.forge}` : "") +
      (r.form ? ` · 형식${r.form}` : "") +
      iso +
      (r.error ? ` · ${r.error.slice(0, 60)}` : ""),
  );
  return r;
});

// 테스트가 answers/ 를 건드리면 기준선의 측정 영점이 오염된다. 건드렸는지 값으로 남긴다.
const answersAfter = snapshotAnswers("answers");
const leaked = [...answersAfter].filter((f) => !answersBefore.has(f));

const run = {
  schema: "edtech-oracle/perf-run@1",
  ran_at: new Date().toISOString(),
  baseline: BASELINE,
  baseline_commit: baseline.anchor.commit,
  wall_ms: Date.now() - t0,
  concurrency: CONCURRENCY,
  answers_leaked: leaked,
  knowledge: Object.fromEntries(
    [...new Set(results.map((r) => r.slug))]
      .filter((s) => KNOWLEDGE.has(s))
      .map((s) => [s, {
        sources: KNOWLEDGE.get(s).sources_declared,
        confidence: KNOWLEDGE.get(s).confidence,
        sections: KNOWLEDGE.get(s).sections,
      }]),
  ),
  results,
};
writeFileSync(join(OUT, "result.json"), JSON.stringify(run, null, 2) + "\n");

const pass = results.filter((r) => r.pass).length;
const broke = results.filter((r) => r.kind !== "router" && !r.via_subagent);
console.log(
  `\n완료 ${pass}/${results.length} 통과 · 벽시계 ${Math.round(run.wall_ms / 1000)}s\n` +
    `  ${join(OUT, "result.json")}` +
    (broke.length ? `\n  ⚠ 위인 격리 깨짐 ${broke.length}건: ${broke.map((r) => r.id).join(", ")}` : "") +
    (leaked.length ? `\n  ⚠ answers/ 오염 ${leaked.length}건: ${leaked.join(", ")}` : ""),
);
