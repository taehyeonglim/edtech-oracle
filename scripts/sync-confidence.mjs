import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadPages, EVIDENCE_TYPES } from "./wiki-parse.mjs";
import { computeConfidence } from "./confidence.mjs";

/**
 * 프론트매터의 한 줄만 건드린다. gray-matter로 다시 써내면 날짜가 ISO로,
 * 인라인 배열이 블록 배열로 바뀌어 213개 파일이 통째로 흔들린다.
 */
function editFrontmatter(raw, mutate) {
  const lines = raw.split("\n");
  if (lines[0]?.trim() !== "---") return null;
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end === -1) return null;
  return [lines[0], ...mutate(lines.slice(1, end)), ...lines.slice(end)].join("\n");
}

/** value가 null이면 confidence 줄을 지운다. */
function setConfidence(raw, value) {
  return editFrontmatter(raw, (fm) => {
    const i = fm.findIndex((l) => /^confidence:\s/.test(l));
    if (value === null) return i === -1 ? fm : fm.filter((_, j) => j !== i);
    if (i === -1) return [...fm, `confidence: ${value}`];
    const out = fm.slice();
    out[i] = `confidence: ${value}`;
    return out;
  });
}

/**
 * 근거 타입의 confidence를 계산값으로 맞추고, source 페이지에서는 필드를 지운다.
 * lint 규칙 8과 같은 함수를 쓰므로 검증과 갱신이 어긋날 수 없다.
 */
export function syncConfidence({ wikiDir = "wiki", sourcesPath = "sources.json", dry = false } = {}) {
  const sourceById = new Map(
    JSON.parse(readFileSync(sourcesPath, "utf8")).map((s) => [s.id, s]),
  );
  const updated = [];
  const removed = [];

  for (const p of loadPages(wikiDir)) {
    const raw = readFileSync(p.file, "utf8");
    let next = null;

    if (EVIDENCE_TYPES.has(p.fm.type)) {
      const computed = computeConfidence(p, sourceById);
      if (computed === null || computed === p.fm.confidence) continue;
      next = setConfidence(raw, computed);
      updated.push({ id: p.id, from: p.fm.confidence, to: computed });
    } else if (p.fm.type === "source" && p.fm.confidence !== undefined) {
      next = setConfidence(raw, null);
      removed.push({ id: p.id, from: p.fm.confidence });
    }

    if (next && !dry) writeFileSync(p.file, next, "utf8");
  }
  return { updated, removed };
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const dry = argv.includes("--dry");
  const { updated, removed } = syncConfidence({
    wikiDir: arg("--wiki", "wiki"),
    sourcesPath: arg("--sources", "sources.json"),
    dry,
  });

  const byMove = {};
  for (const u of updated) {
    const k = `${u.from} → ${u.to}`;
    (byMove[k] ??= []).push(u.id);
  }
  for (const [move, ids] of Object.entries(byMove).sort()) {
    console.log(`\n${move} — ${ids.length}건`);
    for (const id of ids) console.log(`  ${id}`);
  }
  if (removed.length) console.log(`\nsource에서 confidence 제거 — ${removed.length}건`);
  console.log(`\n${dry ? "[--dry] " : ""}갱신 ${updated.length}건, 제거 ${removed.length}건`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
