#!/usr/bin/env node
/**
 * 기준선 스냅샷 — "지금 이 저장소의 위인이 몇 명이고 각자 무엇을 알고 있는가"를
 * 기계가 읽는 형태로 고정한다.
 *
 * 위인 에이전트의 지식 경계는 코드가 아니라 데이터로 정해져 있다.
 * `.claude/agents/<slug>.md`가 "너의 페이지 + 그 페이지가 각주로 링크한 출처 페이지"만
 * 읽게 하므로, 한 위인의 지식 수준 = 자기 페이지 + 프론트매터 `sources`가 전부다.
 * 스냅샷은 그 경계를 그대로 센다.
 *
 * 게이트 현재값을 함께 담는 이유는 회귀 판정 때문이다. "형식급 55건"이라는 측정 영점이
 * 없으면 나중의 60건이 회귀인지 답변이 늘어난 결과인지 구분할 수 없다.
 *
 *   node scripts/baseline.mjs                     # stdout으로 출력
 *   node scripts/baseline.mjs --out <path>        # 파일로 저장
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { loadPages, sections, footnoteRefs, asDateString } from "./wiki-parse.mjs";

const WIKI = "wiki";
const SOURCES = "sources.json";

/** git 명령이 실패해도 스냅샷 자체는 만들어져야 한다 — 앵커가 없다는 사실을 값으로 남긴다. */
function git(...args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

/**
 * 게이트를 실제로 실행해 출력에서 수치를 뽑는다. 저장된 값을 옮겨 적지 않는다 —
 * 스냅샷의 신뢰는 "찍을 때 직접 돌렸다"에서 나온다.
 * 게이트가 exit 1로 죽어도 stdout은 읽어야 하므로 상태와 출력을 함께 반환한다.
 */
function runGate(script) {
  try {
    const stdout = execFileSync("node", [script], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { exit: 0, stdout };
  } catch (e) {
    return { exit: e.status ?? null, stdout: e.stdout ?? "" };
  }
}

const pages = loadPages(WIKI);
const byType = {};
for (const p of pages) byType[p.fm.type ?? "(없음)"] = (byType[p.fm.type ?? "(없음)"] ?? 0) + 1;

const pioneers = pages
  .filter((p) => p.fm.type === "pioneer")
  .map((p) => {
    const declared = Array.isArray(p.fm.sources) ? p.fm.sources : [];
    const cited = new Set(footnoteRefs(p.body));
    const secs = sections(p.body);
    return {
      slug: p.fm.slug ?? p.id.split("/").pop(),
      title: p.fm.title ?? null,
      life: p.fm.life ?? null,
      confidence: p.fm.confidence ?? null,
      updated: asDateString(p.fm.updated),
      // 지식 수준 — 인용 가능 집합(선언)과 실제로 본문이 쓴 집합(사용)을 나눠 센다.
      // 답변 게이트 규칙 3이 신뢰하는 것은 선언 쪽이므로 둘을 구분해 둔다.
      sources_declared: declared.length,
      sources_cited_in_body: cited.size,
      sources_unused: declared.filter((id) => !cited.has(id)).length,
      concepts: Array.isArray(p.fm.concepts) ? p.fm.concepts.length : 0,
      sections: secs.length,
      section_titles: secs.map((s) => s.title),
      body_chars: p.body.length,
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const sourceRows = JSON.parse(readFileSync(SOURCES, "utf8"));
const tierCounts = {};
for (const r of sourceRows) tierCounts[r.tier] = (tierCounts[r.tier] ?? 0) + 1;

const confidenceCounts = {};
for (const p of pages) {
  if (p.fm.confidence) confidenceCounts[p.fm.confidence] = (confidenceCounts[p.fm.confidence] ?? 0) + 1;
}

// 게이트 — 측정 영점
const wiki = runGate("scripts/lint-wiki.mjs");
const answers = runGate("scripts/lint-answers.mjs");
const num = (re, text) => {
  const m = re.exec(text);
  return m ? Number(m[1]) : null;
};

const snapshot = {
  schema: "edtech-oracle/baseline@1",
  taken_at: new Date().toISOString().slice(0, 10),
  anchor: {
    // 커밋 해시가 곧 "이 지식 수준"의 불변 주소다. dirty면 앵커가 재현되지 않으므로 표시한다.
    commit: git("rev-parse", "HEAD"),
    branch: git("rev-parse", "--abbrev-ref", "HEAD"),
    // 고정 대상은 지식 베이스이지 도구가 아니다. 스크립트를 고쳤다고 위인의 지식이
    // 움직이지는 않으므로, dirty 판정은 지식을 정의하는 세 경로로 좁힌다.
    knowledge_dirty: git("status", "--porcelain", "--", "wiki", SOURCES, ".claude/agents") !== "",
  },
  roster: {
    pioneers: pioneers.length,
    agent_files: readdirSync(".claude/agents").filter((f) => f.endsWith(".md")).length,
    pages_by_type: byType,
    confidence: confidenceCounts,
  },
  evidence: {
    sources_json_rows: sourceRows.length,
    tier: tierCounts,
    source_pages: byType.source ?? 0,
    // sources.json 행 수와 출처 페이지 수가 다르면 페이지 없는 잔여 행이 있다는 뜻이다.
    rows_without_page: sourceRows
      .map((r) => r.id)
      .filter((id) => !pages.some((p) => p.id === `sources/${id}`)),
  },
  gates: {
    lint_wiki: {
      exit: wiki.exit,
      errors: num(/오류 (\d+)건/, wiki.stdout),
      warnings: num(/경고 (\d+)건/, wiki.stdout),
    },
    lint_answers: {
      exit: answers.exit,
      answers: num(/답변 (\d+)건/, answers.stdout),
      claims: num(/주장 (\d+)건/, answers.stdout),
      marker_grounded: num(/\[근거\] (\d+) ·/, answers.stdout),
      marker_applied: num(/\[적용\] (\d+) ·/, answers.stdout),
      marker_none: num(/\[근거없음\] (\d+)/, answers.stdout),
      forgery: num(/위조급 (\d+)건/, answers.stdout),
      format: num(/형식급 (\d+)건/, answers.stdout),
    },
  },
  pioneers,
};

const outIdx = process.argv.indexOf("--out");
const json = JSON.stringify(snapshot, null, 2) + "\n";
if (outIdx !== -1 && process.argv[outIdx + 1]) {
  writeFileSync(process.argv[outIdx + 1], json);
  const p = snapshot.pioneers;
  const min = Math.min(...p.map((x) => x.sources_declared));
  const max = Math.max(...p.map((x) => x.sources_declared));
  console.log(
    `기준선 저장: ${process.argv[outIdx + 1]}\n` +
      `  앵커 ${snapshot.anchor.commit?.slice(0, 7)}${snapshot.anchor.knowledge_dirty ? " (지식 dirty)" : ""}\n` +
      `  위인 ${p.length}명 · 출처 선언 ${min}~${max}건 · sources.json ${snapshot.evidence.sources_json_rows}행\n` +
      `  게이트 lint ${snapshot.gates.lint_wiki.errors}오류 · 답변 위조급 ${snapshot.gates.lint_answers.forgery} / 형식급 ${snapshot.gates.lint_answers.format}`,
  );
} else {
  process.stdout.write(json);
}
