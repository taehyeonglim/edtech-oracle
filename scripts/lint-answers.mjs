import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { checkAnswer, loadAnswerContext, formatFindings } from "./check-answer.mjs";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out.sort();
}

/**
 * answers/ 전수 검사. 저장된 `check:` 블록은 읽지 않고 본문에서 다시 계산한다 —
 * 기록을 위조해도 게이트는 속지 않는다.
 */
export function lintAnswers({ answersDir = "answers", wikiDir, sourcesPath } = {}) {
  if (!existsSync(answersDir)) return { results: [], forge: 0, form: 0 };
  const ctx = loadAnswerContext({ wikiDir, sourcesPath });
  const results = [];
  for (const file of walk(answersDir)) {
    // answers/README.md 처럼 답변이 아닌 파일은 건너뛴다.
    if (matter(readFileSync(file, "utf8")).data.type !== "answer") continue;
    const { findings, markers } = checkAnswer({ file, ctx });
    results.push({ file: relative(answersDir, file), findings, markers });
  }
  const all = results.flatMap((r) => r.findings);
  const forge = all.filter((f) => f.severity === "forge").length;
  return { results, forge, form: all.length - forge };
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const { results, forge, form } = lintAnswers({
    answersDir: arg("--answers", "answers"),
    wikiDir: arg("--wiki", "wiki"),
    sourcesPath: arg("--sources", "sources.json"),
  });

  const totals = { 근거: 0, 적용: 0, 근거없음: 0 };
  for (const r of results) {
    for (const k of Object.keys(totals)) totals[k] += r.markers[k];
    if (r.findings.length === 0) continue;
    console.log(`\n${r.file}`);
    for (const line of formatFindings(r.findings)) console.log(`  ${line}`);
  }

  const claims = totals.근거 + totals.적용 + totals.근거없음;
  console.log(`\n답변 ${results.length}건 · 주장 ${claims}건`);
  if (claims > 0) {
    const pct = Math.round((totals.적용 / claims) * 100);
    console.log(`[근거] ${totals.근거} · [적용] ${totals.적용} · [근거없음] ${totals.근거없음} · [적용] 비율 ${pct}%`);
  }
  console.log(`위조급 ${forge}건, 형식급 ${form}건`);
  // 형식급은 기록만 한다. 위조 — 지어낸 출처와 인용 범위 이탈 — 만 배포를 막는다.
  process.exit(forge > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
