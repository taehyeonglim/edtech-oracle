import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { loadPages, EVIDENCE_TYPES } from "./wiki-parse.mjs";
import { computeConfidence } from "./confidence.mjs";

/**
 * 프론트매터 구분자는 **들여쓰기 없이** 줄 전체가 `---`일 때만이다.
 * 공백을 지우고 비교하면 블록 스칼라(`|`·`>`) 안의 `  ---`을 종료로 오인해
 * 값 한가운데에 새 줄을 끼워 넣고 원래 줄은 남긴 채 YAML을 깨뜨린다.
 */
const FENCE_RE = /^---[ \t]*\r?$/;
/** 값이 비어 있어도(`confidence:`) 같은 키다. 놓치면 줄이 중복 생성된다. */
const CONF_RE = /^confidence:(\s|$)/;

/**
 * 프론트매터의 한 줄만 건드린다. gray-matter로 다시 써내면 날짜가 ISO로,
 * 인라인 배열이 블록 배열로 바뀌어 213개 파일이 통째로 흔들린다.
 * 편집할 수 없으면 null을 돌려준다 — 호출자가 성공으로 집계하면 안 된다.
 */
function editFrontmatter(raw, mutate) {
  const lines = raw.split("\n");
  if (lines.length === 0) return null;
  if (!FENCE_RE.test(lines[0].replace(/^﻿/, ""))) return null;
  const end = lines.findIndex((l, i) => i > 0 && FENCE_RE.test(l));
  if (end === -1) return null;
  return [lines[0], ...mutate(lines.slice(1, end)), ...lines.slice(end)].join("\n");
}

/** value가 null이면 confidence 줄을 지운다. CRLF 파일이면 줄바꿈을 유지한다. */
function setConfidence(raw, value) {
  const cr = raw.includes("\r\n") ? "\r" : "";
  return editFrontmatter(raw, (fm) => {
    const i = fm.findIndex((l) => CONF_RE.test(l));
    if (value === null) return i === -1 ? fm : fm.filter((_, j) => j !== i);
    const line = `confidence: ${value}${cr}`;
    if (i === -1) return [...fm, line];
    const out = fm.slice();
    out[i] = line;
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
  const skipped = [];

  for (const p of loadPages(wikiDir)) {
    const raw = readFileSync(p.file, "utf8");
    let next = null;
    let record = null;

    if (EVIDENCE_TYPES.has(p.fm.type)) {
      const computed = computeConfidence(p, sourceById);
      if (computed === null || computed === p.fm.confidence) continue;
      next = setConfidence(raw, computed);
      record = () => updated.push({ id: p.id, from: p.fm.confidence ?? null, to: computed });
    } else if (p.fm.type === "source" && p.fm.confidence !== undefined) {
      next = setConfidence(raw, null);
      record = () => removed.push({ id: p.id, from: p.fm.confidence });
    } else {
      continue;
    }

    // 편집하지 못한 파일을 성공으로 집계하면 조용한 실패가 된다.
    if (next === null) {
      skipped.push({ id: p.id, reason: "프론트매터를 해석할 수 없다" });
      continue;
    }
    record();
    if (!dry) writeFileSync(p.file, next, "utf8");
  }
  return { updated, removed, skipped };
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const dry = argv.includes("--dry");
  const { updated, removed, skipped } = syncConfidence({
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
  if (skipped.length) {
    console.log(`\n건너뜀 ${skipped.length}건 — 손대지 않았다`);
    for (const s of skipped) console.log(`  ${s.id}: ${s.reason}`);
  }
  console.log(
    `\n${dry ? "[--dry] " : ""}갱신 ${updated.length}건, 제거 ${removed.length}건, 건너뜀 ${skipped.length}건`,
  );
}

// argv[1]은 `node -e`나 워커에서 없다. 가드가 없으면 모듈을 import만 해도 터진다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
