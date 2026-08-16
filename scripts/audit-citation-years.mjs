import { readFileSync } from "node:fs";
import { relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { footnoteRefs, loadPages } from "./wiki-parse.mjs";

const PAGE_TYPES = new Set(["pioneer", "concept", "debate"]);
const YEAR_RE = /\b(?:18|19|20)\d{2}\b/g;
const REF_MARKER_RE = /\[\^[^\]\s]+\]/g;
const DEF_LINE_RE = /^ {0,3}\[\^([^\]\s]+)\]:/;
const LIST_RE = /^ {0,3}(?:[-+*]|\d+[.)])\s+/;
const HEADING_RE = /^ {0,3}#{1,6}\s+/;
const DECISIONS = new Set(["remove-citation", "replace-citation", "valid-context", "metadata-corrected"]);

export function parseSourceYear(value) {
  const years = String(value ?? "").match(YEAR_RE);
  return years ? Number(years.at(-1)) : null;
}

function citationBlocks(body) {
  const blocks = [];
  let current = null;
  let inDefinition = false;
  const flush = () => {
    if (current) blocks.push({ line: current.line, text: current.lines.join("\n") });
    current = null;
  };

  for (const [index, line] of body.split(/\r?\n/).entries()) {
    if (DEF_LINE_RE.test(line)) {
      flush();
      inDefinition = true;
      continue;
    }
    if (inDefinition && (/^\s+\S/.test(line) || line.trim() === "")) continue;
    inDefinition = false;

    if (line.trim() === "" || HEADING_RE.test(line)) {
      flush();
      continue;
    }
    if (LIST_RE.test(line)) {
      flush();
      blocks.push({ line: index + 1, text: line });
      continue;
    }
    if (!current) current = { line: index + 1, lines: [] };
    current.lines.push(line);
  }
  flush();
  return blocks;
}

const compare = (a, b) =>
  a.file.localeCompare(b.file) || a.line - b.line || a.sourceId.localeCompare(b.sourceId);

export function auditCitationText({ file, body, bodyStartLine = 1 }, sourceById) {
  const candidates = [];
  const incomparable = [];
  for (const block of citationBlocks(body)) {
    const prose = block.text.replace(REF_MARKER_RE, "");
    const claimYears = (prose.match(YEAR_RE) ?? []).map(Number);
    if (claimYears.length === 0) continue;
    const claimYear = Math.max(...claimYears);
    const line = bodyStartLine + block.line - 1;
    for (const sourceId of new Set(footnoteRefs(block.text))) {
      const source = sourceById.get(sourceId);
      if (!source) continue;
      const sourceYear = parseSourceYear(source.year);
      const item = {
        key: `${file}:${line}|${sourceId}|${claimYear}|${sourceYear ?? "none"}`,
        file,
        line,
        claimYear,
        sourceId,
        sourceYear,
      };
      if (sourceYear === null) incomparable.push(item);
      else if (claimYear > sourceYear) candidates.push(item);
    }
  }
  return { candidates: candidates.sort(compare), incomparable: incomparable.sort(compare) };
}

export function auditCitationYears({ wikiDir = "wiki", sourcesPath = "sources.json" } = {}) {
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const candidates = [];
  const incomparable = [];
  for (const page of loadPages(wikiDir)) {
    if (!PAGE_TYPES.has(page.fm.type)) continue;
    const raw = readFileSync(page.file, "utf8");
    const bodyOffset = raw.indexOf(page.body);
    if (bodyOffset < 0) throw new Error(`${page.file}: 본문 위치를 찾을 수 없다`);
    const bodyStartLine = raw.slice(0, bodyOffset).split(/\r?\n/).length;
    const file = relative(process.cwd(), page.file).split(sep).join("/");
    const report = auditCitationText({ file, body: page.body, bodyStartLine }, sourceById);
    candidates.push(...report.candidates);
    incomparable.push(...report.incomparable);
  }
  return { candidates: candidates.sort(compare), incomparable: incomparable.sort(compare) };
}

export function validateCitationYearReview(
  review,
  { candidateCount = 51, incomparableCount = 113 } = {},
) {
  const errors = [];
  if (!Array.isArray(review.candidates) || review.candidates.length !== candidateCount) {
    errors.push(`candidates는 ${candidateCount}건이어야 한다`);
  }
  if (!Array.isArray(review.incomparable) || review.incomparable.length !== incomparableCount) {
    errors.push(`incomparable은 ${incomparableCount}건이어야 한다`);
  }
  const items = [...(review.candidates ?? []), ...(review.incomparable ?? [])];
  const keys = new Set();
  for (const item of items) {
    if (typeof item.key !== "string" || item.key === "") errors.push("빈 key가 있다");
    else if (keys.has(item.key)) errors.push(`중복 key: ${item.key}`);
    else keys.add(item.key);
    if (!DECISIONS.has(item.decision)) errors.push(`${item.key}: decision 누락 또는 알 수 없는 값`);
    if (typeof item.reason !== "string" || item.reason.trim() === "") {
      errors.push(`${item.key}: reason 누락`);
    }
  }
  return errors;
}

function arg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function cli(argv) {
  const reviewPath = arg(argv, "--review", null);
  if (reviewPath) {
    const review = JSON.parse(readFileSync(reviewPath, "utf8"));
    const errors = validateCitationYearReview(review);
    for (const error of errors) console.error(error);
    console.log(`연도 판정 기록: 후보 ${review.candidates.length}건, 비교 불가 ${review.incomparable.length}건`);
    process.exitCode = errors.length === 0 ? 0 : 1;
    return;
  }

  const report = auditCitationYears({
    wikiDir: arg(argv, "--wiki", "wiki"),
    sourcesPath: arg(argv, "--sources", "sources.json"),
  });
  if (argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  for (const item of report.candidates) {
    console.log(`후보 ${item.file}:${item.line} ${item.claimYear} > ${item.sourceId}:${item.sourceYear}`);
  }
  for (const item of report.incomparable) {
    console.log(`비교 불가 ${item.file}:${item.line} ${item.claimYear} > ${item.sourceId}:연도 없음`);
  }
  console.log(`\n후보 ${report.candidates.length}건, 비교 불가 ${report.incomparable.length}건`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli(process.argv.slice(2));
}
