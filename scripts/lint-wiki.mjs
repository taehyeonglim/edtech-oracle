import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  loadPages,
  footnoteDefs,
  footnoteRefs,
  wikilinks,
  sections,
  asDateString,
  PAGE_TYPES,
  EVIDENCE_TYPES,
} from "./wiki-parse.mjs";
import { computeConfidence } from "./confidence.mjs";

const REQUIRED_BASE = ["title", "type", "updated"];
const REQUIRED_EVIDENCE = ["sources", "confidence"];
const CONFIDENCE = new Set(["high", "medium", "low"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 기본 모드에서 경고로 낮추는 규칙. 작성 중 상태를 허용한다. */
const SOFT_RULES = new Set([6, 7]);

const find = (rule, p, message) => ({ rule, severity: "error", file: p.id, message });
const asSet = (v) => new Set(Array.isArray(v) ? v : []);

function rule1(pages) {
  const out = [];
  for (const p of pages) {
    for (const k of REQUIRED_BASE) {
      if (p.fm[k] === undefined) out.push(find(1, p, `프론트매터 '${k}' 누락`));
    }
    if (p.fm.type !== undefined && !PAGE_TYPES.includes(p.fm.type)) {
      out.push(find(1, p, `알 수 없는 type: ${p.fm.type}`));
    }
    if (p.fm.updated !== undefined && !DATE_RE.test(asDateString(p.fm.updated))) {
      out.push(find(1, p, `updated는 YYYY-MM-DD여야 함: ${p.fm.updated}`));
    }
    if (EVIDENCE_TYPES.has(p.fm.type)) {
      for (const k of REQUIRED_EVIDENCE) {
        if (p.fm[k] === undefined) out.push(find(1, p, `프론트매터 '${k}' 누락`));
      }
      if (p.fm.confidence !== undefined && !CONFIDENCE.has(p.fm.confidence)) {
        out.push(find(1, p, `알 수 없는 confidence: ${p.fm.confidence}`));
      }
    }
    if (p.fm.type === "source") {
      if (p.fm.sources === undefined) out.push(find(1, p, "프론트매터 'sources' 누락"));
      // 출처 페이지는 자기 자신만 인용하므로 confidence가 그 출처 tier의 재진술이 된다.
      if (p.fm.confidence !== undefined) {
        out.push(find(1, p, "source 페이지에는 confidence를 두지 않는다 (tier가 이미 강도다)"));
      }
    }
    if (p.fm.type === "pioneer" && !p.fm.slug) out.push(find(1, p, "pioneer는 slug 필수"));
  }
  return out;
}

function rule2(pages) {
  const out = [];
  for (const p of pages) {
    const defs = new Set(footnoteDefs(p.body));
    for (const ref of new Set(footnoteRefs(p.body))) {
      if (!defs.has(ref)) out.push(find(2, p, `정의되지 않은 각주 참조: [^${ref}]`));
    }
  }
  return out;
}

function rule3(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    for (const id of new Set(footnoteDefs(p.body))) {
      if (!sourceById.has(id)) out.push(find(3, p, `sources.json에 없는 출처: ${id}`));
    }
  }
  return out;
}

function rule4(pages) {
  const out = [];
  for (const p of pages) {
    if (p.fm.sources === undefined) continue;
    const declared = asSet(p.fm.sources);
    const used = new Set(footnoteDefs(p.body));
    for (const id of declared) {
      if (!used.has(id)) {
        out.push(find(4, p, `sources에 선언됐으나 본문에서 인용되지 않음: ${id}`));
      }
    }
    for (const id of used) {
      if (!declared.has(id)) {
        out.push(find(4, p, `본문에서 인용됐으나 sources에 선언되지 않음: ${id}`));
      }
    }
  }
  return out;
}

function rule5(pages) {
  const ids = new Set(pages.map((p) => p.id));
  const out = [];
  for (const p of pages) {
    for (const link of new Set(wikilinks(p.body))) {
      if (!ids.has(link)) out.push(find(5, p, `깨진 링크: [[${link}]]`));
    }
  }
  return out;
}

function rule6(pages) {
  const out = [];
  for (const p of pages) {
    if (!EVIDENCE_TYPES.has(p.fm.type)) continue;
    for (const s of sections(p.body)) {
      if (s.text.trim() === "") continue;
      if (footnoteRefs(s.text).length === 0) {
        out.push(find(6, p, `각주 없는 섹션: '${s.title}'`));
      }
    }
  }
  return out;
}

function rule7(pages) {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const seen = new Set();
  const queue = ["index"];
  while (queue.length > 0) {
    const id = queue.shift();
    if (seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    queue.push(...wikilinks(byId.get(id).body));
  }
  return pages
    .filter((p) => !seen.has(p.id))
    .map((p) => find(7, p, "index.md에서 도달 불가 (고아 페이지)"));
}

/**
 * 선언된 confidence가 섹션 최약 근거로 계산한 값과 같아야 한다.
 * 이전 규칙은 import가 만든 값을 같은 술어로 확인하는 순환이라 실패할 수 없었다.
 */
function rule8(pages, sourceById) {
  const out = [];
  for (const p of pages) {
    if (!EVIDENCE_TYPES.has(p.fm.type)) continue;
    const computed = computeConfidence(p, sourceById);
    if (computed === null) continue; // 근거를 가진 섹션이 없다. 규칙 6이 잡는다
    if (p.fm.confidence !== computed) {
      out.push(find(8, p, `confidence는 ${computed}여야 한다 (선언: ${p.fm.confidence})`));
    }
  }
  return out;
}

export function lintWiki({ wikiDir, sourcesPath, strict = false }) {
  const pages = loadPages(wikiDir);
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const sourceById = new Map(sources.map((s) => [s.id, s]));
  const findings = [
    ...rule1(pages),
    ...rule2(pages),
    ...rule3(pages, sourceById),
    ...rule4(pages),
    ...rule5(pages),
    ...rule6(pages),
    ...rule7(pages),
    ...rule8(pages, sourceById),
  ];
  if (strict) return findings;
  return findings.map((f) => (SOFT_RULES.has(f.rule) ? { ...f, severity: "warn" } : f));
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const findings = lintWiki({
    wikiDir: arg("--wiki", "wiki"),
    sourcesPath: arg("--sources", "sources.json"),
    strict: argv.includes("--strict"),
  });
  for (const f of findings.sort((a, b) => a.rule - b.rule || a.file.localeCompare(b.file))) {
    const tag = f.severity === "error" ? "ERROR" : "WARN ";
    console.log(`${tag} [규칙 ${f.rule}] ${f.file}: ${f.message}`);
  }
  const errors = findings.filter((f) => f.severity === "error").length;
  const warns = findings.length - errors;
  console.log(`\n오류 ${errors}건, 경고 ${warns}건`);
  process.exit(errors > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
