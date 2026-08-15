import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syncConfidence } from "../scripts/sync-confidence.mjs";
import { makeWiki, page } from "./helpers.mjs";

const SOURCES = [
  { id: "a-src", tier: "A", title: "제목 A" },
  { id: "b-src", tier: "B", title: "제목 B" },
];

const read = (wikiDir, rel) => readFileSync(join(wikiDir, rel), "utf8");

test("계산값으로 confidence를 갱신한다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "pioneers/p1.md": page({
        type: "pioneer",
        title: "위인 1",
        extra: "slug: p1\nsources: [a-src, b-src]\nconfidence: high",
        body: "## 핵심\n주장[^a-src].\n\n## 연표\n생애[^b-src].\n",
      }),
    },
    SOURCES,
  );
  const { updated } = syncConfidence({ wikiDir, sourcesPath });
  assert.deepEqual(updated, [{ id: "pioneers/p1", from: "high", to: "medium" }]);
  assert.match(read(wikiDir, "pioneers/p1.md"), /^confidence: medium$/m);
});

test("source 페이지에서 confidence를 제거한다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "sources/a-src.md": page({
        type: "source",
        title: "제목 A",
        extra: "sources: [a-src]\nconfidence: high",
        body: "## 요약\n요약[^a-src].\n",
      }),
    },
    SOURCES,
  );
  const { removed } = syncConfidence({ wikiDir, sourcesPath });
  assert.deepEqual(removed, [{ id: "sources/a-src", from: "high" }]);
  assert.ok(!read(wikiDir, "sources/a-src.md").includes("confidence:"));
});

test("프론트매터의 나머지 줄을 건드리지 않는다", () => {
  // gray-matter로 다시 써내면 날짜가 ISO로, 인라인 배열이 블록 배열로 바뀐다.
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "pioneers/p1.md": page({
        type: "pioneer",
        title: "위인 1",
        extra: 'slug: p1\nlife: 1900—1980\nsources: [a-src, b-src]\nconfidence: high',
        body: "## 핵심\n주장[^a-src].\n\n## 연표\n생애[^b-src].\n",
      }),
    },
    SOURCES,
  );
  syncConfidence({ wikiDir, sourcesPath });
  const raw = read(wikiDir, "pioneers/p1.md");
  assert.match(raw, /^updated: 2026-08-14$/m);
  assert.match(raw, /^sources: \[a-src, b-src\]$/m);
  assert.match(raw, /^life: 1900—1980$/m);
});

test("--dry는 파일을 쓰지 않는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "pioneers/p1.md": page({
        type: "pioneer",
        title: "위인 1",
        extra: "slug: p1\nsources: [a-src, b-src]\nconfidence: high",
        body: "## 핵심\n주장[^a-src].\n\n## 연표\n생애[^b-src].\n",
      }),
    },
    SOURCES,
  );
  const { updated } = syncConfidence({ wikiDir, sourcesPath, dry: true });
  assert.equal(updated.length, 1);
  assert.match(read(wikiDir, "pioneers/p1.md"), /^confidence: high$/m);
});

/** 프론트매터 원문을 통째로 만들어 한 줄 편집이 나머지를 보존하는지 본다. */
function rawWiki(frontmatter, body = "## 핵심\n주장[^a-src].\n\n## 연표\n생애[^b-src].\n") {
  const { wikiDir, sourcesPath } = makeWiki({ "pioneers/p1.md": `${frontmatter}\n\n${body}` }, SOURCES);
  return { wikiDir, sourcesPath, file: join(wikiDir, "pioneers/p1.md") };
}

test("블록 스칼라 안의 --- 를 프론트매터 끝으로 오인하지 않는다", () => {
  // 들여쓰기를 지우고 비교하면 `  ---`을 종료 구분자로 읽어 값 한가운데에 새 줄을 끼워 넣고
  // 원래 confidence는 남긴 채 YAML을 깨뜨린다.
  const fm = [
    "---",
    "title: T",
    "type: pioneer",
    "slug: p1",
    "note: |",
    "  alpha",
    "  ---",
    "  omega",
    "sources: [a-src, b-src]",
    "confidence: high",
    "---",
  ].join("\n");
  const { wikiDir, sourcesPath, file } = rawWiki(fm);
  syncConfidence({ wikiDir, sourcesPath });
  const out = readFileSync(file, "utf8");
  assert.equal(out.match(/^confidence:/gm).length, 1, "confidence 줄이 중복되면 안 된다");
  assert.match(out, /^confidence: medium$/m);
  assert.match(out, /note: \|\n  alpha\n  ---\n  omega\n/, "블록 스칼라가 그대로여야 한다");
});

test("값이 빈 confidence: 도 교체한다", () => {
  const fm = [
    "---",
    "title: T",
    "type: pioneer",
    "slug: p1",
    "sources: [a-src, b-src]",
    "confidence:",
    "---",
  ].join("\n");
  const { wikiDir, sourcesPath, file } = rawWiki(fm);
  syncConfidence({ wikiDir, sourcesPath });
  const out = readFileSync(file, "utf8");
  assert.equal(out.match(/^confidence:/gm).length, 1);
  assert.match(out, /^confidence: medium$/m);
});

test("CRLF 파일의 줄바꿈을 섞지 않는다", () => {
  const fm = [
    "---",
    "title: T",
    "type: pioneer",
    "slug: p1",
    "sources: [a-src, b-src]",
    "confidence: high",
    "---",
  ].join("\r\n");
  const body = "\r\n## 핵심\r\n주장[^a-src].\r\n\r\n## 연표\r\n생애[^b-src].\r\n";
  const { wikiDir, sourcesPath } = makeWiki({ "pioneers/p1.md": fm + body }, SOURCES);
  const file = join(wikiDir, "pioneers/p1.md");
  syncConfidence({ wikiDir, sourcesPath });
  const out = readFileSync(file, "utf8");
  assert.match(out, /^confidence: medium\r$/m);
  assert.equal(out.split("\n").filter((l) => l !== "" && !l.endsWith("\r")).length, 0);
});

test("닫는 --- 가 없는 파일은 조용히 넘어가지 않고 예외로 멈춘다", () => {
  // 편집하지 못한 파일을 성공으로 세면 조용한 실패가 된다. 실제로는 그 전에
  // gray-matter가 YAML 예외를 던져 실행이 멈춘다 — 어느 쪽이든 성공으로 집계되지 않아야 한다.
  const fm = ["---", "title: T", "type: source", "sources: [a-src]", "confidence: high"].join("\n");
  const { wikiDir, sourcesPath } = rawWiki(fm, "## 요약\n요약[^a-src].\n");
  assert.throws(() => syncConfidence({ wikiDir, sourcesPath }));
});

test("이미 맞는 값은 건드리지 않는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "pioneers/p1.md": page({
        type: "pioneer",
        title: "위인 1",
        extra: "slug: p1\nsources: [a-src]\nconfidence: high",
        body: "## 핵심\n주장[^a-src].\n",
      }),
    },
    SOURCES,
  );
  assert.deepEqual(syncConfidence({ wikiDir, sourcesPath }), {
    updated: [],
    removed: [],
    skipped: [],
  });
});
