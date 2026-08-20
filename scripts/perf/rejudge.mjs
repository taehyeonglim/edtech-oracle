#!/usr/bin/env node
/**
 * 저장된 실행을 **모델을 다시 부르지 않고** 다시 판정한다.
 *
 * 판정기는 틀릴 수 있고 실제로 틀렸다 — 2026-08-20 환각 프로브에서 되묻기를 실패로 셌다.
 * 응답 원문은 `sections/`에 그대로 있으므로 판정만 다시 하면 된다. 호출 하나가 수십 초이므로
 * 판정 규칙을 고칠 때마다 다시 돌리는 것은 낭비이고, 무엇보다 **같은 응답에 대한 판정 변화**를
 * 보려면 응답이 고정돼 있어야 한다.
 *
 *   node scripts/perf/rejudge.mjs perf-runs/2026-08-20-halluc
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { judgeProbe } from "./judge.mjs";

const dir = process.argv[2];
if (!dir) {
  console.error("사용법: node scripts/perf/rejudge.mjs <perf-runs/…>");
  process.exit(2);
}

const run = JSON.parse(readFileSync(join(dir, "result.json"), "utf8"));
const roster = run.results.map((r) => r.slug);
let changed = 0;

for (const r of run.results) {
  const ext = r.kind === "router" ? "txt" : "md";
  const file = join(dir, "sections", `${r.id.replace(/\//g, "__")}.${ext}`);
  let text = "";
  try {
    const raw = readFileSync(file, "utf8");
    // 화자 헤딩까지 걷어낸 발언 본문만 판정에 넣는다.
    text = ext === "md" ? matter(raw).content.replace(/^\s*##\s+\S+\s*/m, "") : raw;
  } catch {
    continue; // 섹션 파일이 없으면 판정을 바꾸지 않는다. 없는 것을 추측하지 않는다
  }
  const before = r.pass;
  const j = judgeProbe({ kind: r.kind, expect_any: r.judge?.expected_any }, {
    text,
    forge: r.forge ?? 0,
    form: r.form ?? 0,
    markers: r.markers ?? {},
  }, { roster });
  r.pass = r.ok && j.pass;
  r.judge = j.detail;
  if (before !== r.pass) changed += 1;
}

run.rejudged_at = new Date().toISOString().slice(0, 10);
writeFileSync(join(dir, "result.json"), JSON.stringify(run, null, 2) + "\n");

const pass = run.results.filter((r) => r.pass).length;
const modes = {};
for (const r of run.results) if (r.judge?.mode) modes[r.judge.mode] = (modes[r.judge.mode] ?? 0) + 1;
console.log(`재판정 ${dir} — 통과 ${pass}/${run.results.length} · 판정이 바뀐 건 ${changed}건`);
if (Object.keys(modes).length) console.log(`  응답 방식: ${JSON.stringify(modes)}`);
console.log(`  위조급 합계: ${run.results.reduce((s, r) => s + (r.forge ?? 0), 0)}`);
const bad = run.results.filter((r) => !r.pass);
console.log(bad.length ? `  실패: ${bad.map((r) => `${r.slug}(${r.judge?.mode ?? "?"})`).join(", ")}` : "  실패 없음");
