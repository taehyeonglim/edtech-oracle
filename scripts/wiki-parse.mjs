import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import matter from "gray-matter";

export const PAGE_TYPES = ["pioneer", "concept", "debate", "source", "meta"];
/** 근거를 서술하는 타입. 인용 밀도(규칙 6)와 티어(규칙 8)의 적용 대상. */
export const EVIDENCE_TYPES = new Set(["pioneer", "concept", "debate"]);

/**
 * CommonMark는 들여쓰기 3칸까지 블록으로 인정하고 4칸부터 코드블록으로 본다.
 * 줄 시작만 보면 렌더러는 각주·헤딩으로 그리는데 파서는 산문으로 읽어 검사가 통째로 비켜간다.
 */
const INDENT = " {0,3}";
const DEF_LINE_RE = new RegExp(`^${INDENT}\\[\\^([^\\]\\s]+)\\]:`);
const DEF_RE = new RegExp(`^${INDENT}\\[\\^([^\\]\\s]+)\\]:`, "gm");
const REF_RE = /\[\^([^\]\s]+)\](?!:)/g;
const LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

export function loadPages(wikiDir) {
  return walk(wikiDir).map((file) => {
    const { data, content } = matter(readFileSync(file, "utf8"));
    return {
      id: relative(wikiDir, file).replace(/\.md$/, "").split("\\").join("/"),
      file,
      fm: data,
      body: content,
    };
  });
}

export const footnoteDefs = (body) => [...body.matchAll(DEF_RE)].map((m) => m[1]);
export const footnoteRefs = (body) => [...body.matchAll(REF_RE)].map((m) => m[1]);
export const wikilinks = (body) => [...body.matchAll(LINK_RE)].map((m) => m[1].trim());

/** 각주 정의 블록(정의 줄 + 들여쓴 연속 줄)을 제거한다. 인용 밀도 계산 전처리. */
export function stripFootnoteDefs(body) {
  const out = [];
  let inDef = false;
  for (const line of body.split("\n")) {
    if (DEF_LINE_RE.test(line)) {
      inDef = true;
      continue;
    }
    if (inDef && (/^\s+\S/.test(line) || line.trim() === "")) continue;
    inDef = false;
    out.push(line);
  }
  return out.join("\n");
}

/** 레벨 2(`## `) 섹션만 자른다. 각주 정의는 미리 제거한다. */
export function sections(body) {
  const parts = [];
  let cur = null;
  for (const line of stripFootnoteDefs(body).split("\n")) {
    const m = new RegExp(`^${INDENT}##\\s+(.+)$`).exec(line);
    if (m) {
      cur = { title: m[1].trim(), lines: [] };
      parts.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return parts.map((p) => ({ title: p.title, text: p.lines.join("\n") }));
}

/** YAML은 따옴표 없는 날짜를 Date로 파싱한다. 두 경우를 모두 받는다. */
export function asDateString(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return typeof v === "string" ? v : "";
}
