import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

/** 임시 디렉터리에 위키를 만든다. files는 { "pioneers/x.md": "내용" } 형태. */
export function makeWiki(files, sources = []) {
  const root = mkdtempSync(join(tmpdir(), "oracle-test-"));
  const wikiDir = join(root, "wiki");
  mkdirSync(wikiDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(wikiDir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
  const sourcesPath = join(root, "sources.json");
  writeFileSync(sourcesPath, JSON.stringify(sources), "utf8");
  return { root, wikiDir, sourcesPath };
}

/** 유효한 최소 페이지를 만든다. 테스트마다 다르게 할 부분만 인자로 덮어쓴다. */
export function page({ type = "pioneer", title = "테스트", extra = "", body = "" }) {
  const fm = [
    "---",
    `title: ${title}`,
    `type: ${type}`,
    "updated: 2026-08-14",
    extra,
    "---",
  ]
    .filter(Boolean)
    .join("\n");
  return `${fm}\n\n${body}\n`;
}
