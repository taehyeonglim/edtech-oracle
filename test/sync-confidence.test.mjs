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
  assert.deepEqual(syncConfidence({ wikiDir, sourcesPath }), { updated: [], removed: [] });
});
