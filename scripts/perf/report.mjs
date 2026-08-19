#!/usr/bin/env node
/**
 * 프로브 결과를 기준선과 나란히 놓고 읽는다.
 *
 * 출처 수와 confidence를 같은 줄에 두는 이유는 **지식 수준과 답변 성능의 상관을 보기
 * 위해서**다. 출처 10건인 위인이 18건인 위인보다 게이트를 잘 통과한다면 그것은 출처를
 * 더 넣으라는 뜻이 아니라 프롬프트나 페이지 구조 쪽 문제라는 신호다.
 *
 *   node scripts/perf/report.mjs perf-runs/2026-08-20
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("사용법: node scripts/perf/report.mjs <perf-runs/날짜>");
  process.exit(2);
}

const run = JSON.parse(readFileSync(join(dir, "result.json"), "utf8"));
const R = run.results;
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const sec = (ms) => `${Math.round(ms / 1000)}s`;
const by = (kind) => R.filter((r) => r.kind === kind);

const common = by("common");
const halluc = by("halluc");
const ambig = by("ambig");
const router = by("router");

const isolationBroken = R.filter((r) => r.kind !== "router" && !r.via_subagent);
const failed = R.filter((r) => !r.ok);
const durations = R.map((r) => r.duration_ms).sort((a, b) => a - b);
const median = durations.length ? durations[Math.floor(durations.length / 2)] : 0;

const lines = [];
const w = (s = "") => lines.push(s);

w(`# 위인 성능 프로브 — ${run.ran_at.slice(0, 10)}`);
w();
w(`기준선 \`${run.baseline}\` · 앵커 \`${(run.baseline_commit ?? "").slice(0, 7)}\` · ` +
  `프로브 ${R.length}건 · 동시 ${run.concurrency} · 벽시계 ${sec(run.wall_ms)}`);
w();

w(`## 요약`);
w();
w(`| 프로브 | 대상 | 통과 | 비고 |`);
w(`|---|---|---|---|`);
w(`| A 공통질문 | ${common.length}명 | ${common.filter((r) => r.pass).length} (${pct(common.filter((r) => r.pass).length, common.length)}) | 위조급 0이 합격선 |`);
w(`| B 환각 저항 | ${halluc.length}명 | ${halluc.filter((r) => r.pass).length} (${pct(halluc.filter((r) => r.pass).length, halluc.length)}) | 없는 문헌에 [근거없음]을 내는가 |`);
w(`| C 되묻기 | ${ambig.length}명 | ${ambig.filter((r) => r.pass).length} (${pct(ambig.filter((r) => r.pass).length, ambig.length)}) | NEEDS_CLARIFICATION |`);
w(`| D 라우터 | ${router.length}문항 | ${router.filter((r) => r.pass).length} (${pct(router.filter((r) => r.pass).length, router.length)}) | 기대 위인 포함 여부 |`);
w();

const forgeTotal = R.reduce((s, r) => s + (r.forge ?? 0), 0);
const formTotal = R.reduce((s, r) => s + (r.form ?? 0), 0);
w(`**위조급 ${forgeTotal}건 · 형식급 ${formTotal}건** · 중앙 지연 ${sec(median)} · ` +
  `실행 실패 ${failed.length}건 · 위인 격리 깨짐 ${isolationBroken.length}건` +
  (run.answers_leaked?.length ? ` · ⚠ answers/ 오염 ${run.answers_leaked.length}건` : ""));
w();

if (isolationBroken.length) {
  w(`> ⚠ **위인 격리가 깨진 호출이 있다.** 답변이 Agent 도구를 거치지 않고 왔다는 뜻이며,`);
  w(`> 그러면 인용 범위 검사(규칙 3)가 기대는 전제가 무너진다: ${isolationBroken.map((r) => r.id).join(", ")}`);
  w();
}

w(`## A. 공통질문 — 36명`);
w();
w(`> ${run.question ?? "온라인 강의 이탈 문제를 자기 이론으로 진단하고 무엇을 먼저 바꾸겠는가"}`);
w();
w(`| 위인 | 출처 | conf | 위조 | 형식 | 근거/적용/없음 | 지연 |`);
w(`|---|---:|---|---:|---:|---|---:|`);
for (const r of [...common].sort((a, b) => (b.form ?? 0) - (a.form ?? 0) || a.slug.localeCompare(b.slug))) {
  const k = run.knowledge[r.slug] ?? {};
  const m = r.markers ?? {};
  w(`| ${r.slug}${r.via_subagent ? "" : " ⚠"} | ${k.sources ?? "—"} | ${k.confidence ?? "—"} | ` +
    `${r.forge ?? 0} | ${r.form ?? 0} | ${m.근거 ?? 0}/${m.적용 ?? 0}/${m.근거없음 ?? 0} | ${sec(r.duration_ms)} |`);
}
w();

// 지식 수준과 성능의 상관. 이것을 보려고 두 값을 같은 줄에 둔다.
const groups = {};
for (const r of common) {
  const k = run.knowledge[r.slug];
  if (!k) continue;
  const key = k.confidence ?? "?";
  (groups[key] ??= []).push(r);
}
w(`### confidence별 형식급 평균`);
w();
w(`| confidence | 위인 | 형식급 평균 | 위조급 합 |`);
w(`|---|---:|---:|---:|`);
for (const [key, rs] of Object.entries(groups)) {
  const avg = rs.reduce((s, r) => s + (r.form ?? 0), 0) / rs.length;
  w(`| ${key} | ${rs.length} | ${avg.toFixed(1)} | ${rs.reduce((s, r) => s + (r.forge ?? 0), 0)} |`);
}
w();

if (halluc.length) {
  w(`## B. 환각 저항 — 없는 문헌을 물었다`);
  w();
  w(`| 위인 | 결과 | [근거없음] | [근거] | 위조급 |`);
  w(`|---|---|---:|---:|---:|`);
  for (const r of halluc) {
    w(`| ${r.slug} | ${r.pass ? "**통과**" : "**실패**"} | ${r.judge?.marker_none ?? 0} | ${r.judge?.marker_grounded ?? 0} | ${r.forge ?? 0} |`);
  }
  w();
}

if (ambig.length) {
  w(`## C. 되묻기 — 지시 대상이 없는 질문`);
  w();
  for (const r of ambig) {
    w(`- ${r.slug}: ${r.pass ? "NEEDS_CLARIFICATION 반환 — 통과" : "**답을 만들어 냈다 — 실패**"}`);
  }
  w();
}

if (router.length) {
  w(`## D. 라우터`);
  w();
  w(`| 문항 | 기대 | 선택 | 결과 |`);
  w(`|---|---|---|---|`);
  for (const r of router) {
    w(`| ${r.id} | ${(r.judge?.expected_any ?? []).join(" / ")} | ${(r.judge?.picked ?? []).join(", ") || "—"} | ${r.pass ? "통과" : "**실패**"} |`);
  }
  w();
}

// 규칙별 집계 — 어디를 고쳐야 하는지는 개수가 아니라 규칙이 알려준다.
const ruleCount = {};
for (const r of R) for (const f of r.findings ?? []) {
  const m = /\[규칙 (\d+)\]/.exec(f);
  if (m) ruleCount[m[1]] = (ruleCount[m[1]] ?? 0) + 1;
}
w(`## 규칙별 위반`);
w();
w(`| 규칙 | 건수 | 내용 |`);
w(`|---:|---:|---|`);
const RULE_NAME = {
  1: "정의되지 않은 각주 참조", 2: "sources.json에 없는 출처", 3: "페이지에 없는 출처 인용(범위 이탈)",
  4: "티어 표기 불일치", 5: "위인 slug 아님", 6: "화자 귀속 불일치", 7: "사회자가 각주 사용",
  8: "각주 정의가 tier·출처 링크로 끝나지 않음", 9: "마커 없는 문단", 10: "[근거]인데 각주 없음",
  11: "[근거없음]인데 각주 있음", 12: "서지가 sources.json과 다름",
};
for (const [rule, n] of Object.entries(ruleCount).sort((a, b) => b[1] - a[1])) {
  w(`| ${rule} | ${n} | ${RULE_NAME[rule] ?? "?"} |`);
}
w();

if (failed.length) {
  w(`## 실행 실패`);
  w();
  for (const r of failed) w(`- ${r.id}: ${r.error}`);
  w();
}

writeFileSync(join(dir, "report.md"), lines.join("\n") + "\n");
console.log(`리포트: ${join(dir, "report.md")}`);
console.log(`  A ${common.filter((r) => r.pass).length}/${common.length} · B ${halluc.filter((r) => r.pass).length}/${halluc.length} · C ${ambig.filter((r) => r.pass).length}/${ambig.length} · D ${router.filter((r) => r.pass).length}/${router.length}`);
console.log(`  위조급 ${forgeTotal} · 형식급 ${formTotal} · 격리 깨짐 ${isolationBroken.length}`);
