import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { makeWiki, page } from "./helpers.mjs";
import { buildSite, renderAll, findDeadLinks } from "../scripts/build-site.mjs";
import { collect } from "../scripts/site/collect.mjs";
import { footnoteDefs, wikilinks } from "../scripts/wiki-parse.mjs";

/** 실제 위키로 한 번만 렌더해 여러 테스트가 공유한다. */
const realModel = collect({ wikiDir: "wiki", sourcesPath: "sources.json" });
const realFiles = renderAll(realModel);
const wikiKeys = new Set(realModel.pages.map((p) => `${p.id}.html`));

test("모든 위키 페이지가 HTML로 나온다", () => {
  for (const p of realModel.pages) {
    assert.ok(realFiles.has(`${p.id}.html`), `${p.id} 누락`);
  }
});

test("renderAll은 파일시스템을 건드리지 않고 Map만 돌려준다", () => {
  const before = existsSync("dist");
  renderAll(realModel);
  assert.equal(existsSync("dist"), before, "렌더 중 dist가 생기면 안 된다");
});

test("모든 내부 링크가 산출물 안에서 해석된다", () => {
  // 220여 페이지 전역의 URL 생성 버그를 한 번에 잡는 검사. 사이트판 lint 규칙 5다.
  const dead = findDeadLinks(realFiles, ["site.css", "filter.js", "search.js", "graph.js"]);
  assert.deepEqual(dead, []);
});

test("각주의 출처 링크가 하나도 사라지지 않는다", () => {
  // 각주 꼬리를 뱃지로 바꾸며 링크 복원을 잊으면 전체 위키링크의 56%가 증발하는데,
  // 위의 '깨진 링크 0' 검사는 링크가 아예 없으니 통과해버린다. 총수를 따로 센다.
  const inMarkdown = realModel.pages.reduce(
    (n, p) => n + wikilinks(p.body).filter((t) => t.startsWith("sources/")).length,
    0
  );
  let inHtml = 0;
  for (const [k, html] of realFiles) {
    if (!wikiKeys.has(k)) continue;
    // 속성 순서를 가정하지 않는다.
    for (const m of html.matchAll(/<a\s([^>]*)>/g)) {
      const attrs = m[1];
      if (/class="wikilink[^"]*"/.test(attrs) && /href="[^"]*sources\/[^"]*\.html"/.test(attrs)) {
        inHtml += 1;
      }
    }
  }
  assert.ok(inMarkdown > 400, `기준선이 너무 작다: ${inMarkdown}`);
  assert.equal(inHtml, inMarkdown);
});

test("각주 정의마다 티어 뱃지가 붙는다", () => {
  const defs = realModel.pages.reduce((n, p) => n + footnoteDefs(p.body).length, 0);
  let rendered = 0;
  for (const [k, html] of realFiles) {
    if (!wikiKeys.has(k)) continue;
    rendered += [...html.matchAll(/<li id="fn-[^"]+" class="fn fn--[ABC]"/g)].length;
  }
  assert.equal(rendered, defs);
});

test("되돌아가기 앵커 수가 각주 참조 수와 정확히 같다", () => {
  let refs = 0;
  let backs = 0;
  for (const [k, html] of realFiles) {
    if (!wikiKeys.has(k)) continue;
    refs += [...html.matchAll(/class="fnref__link"/g)].length;
    backs += [...html.matchAll(/class="fn__back"/g)].length;
  }
  assert.ok(refs > 1000, `기준선이 너무 작다: ${refs}`);
  assert.equal(backs, refs);
});

test("출처 페이지는 자기 자신을 인용처로 표시하지 않는다", () => {
  for (const p of realModel.byType.get("source") ?? []) {
    const html = realFiles.get(`${p.id}.html`);
    const block = /<section class="citedby">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? "";
    assert.doesNotMatch(block, new RegExp(`${p.id.split("/")[1]}\\.html`), `${p.id} 자기인용`);
  }
});

test("렌더 결과에 미변환 마크업이나 undefined가 남지 않는다", () => {
  for (const [k, html] of realFiles) {
    if (!k.endsWith(".html")) continue;
    const body = html.replace(/<pre[\s\S]*?<\/pre>/g, "");
    for (const bad of ["undefined", "[object Object]", "NaN"]) {
      assert.ok(!body.includes(bad), `${k}에 ${bad}`);
    }
    assert.doesNotMatch(body, /\[\[[^\]]+\]\]/, `${k}에 미변환 위키링크`);
  }
});

test("깊이 1 페이지의 자산 링크는 ../assets로 올라간다", () => {
  const html = realFiles.get("pioneers/robert-gagne.html");
  assert.match(html, /href="\.\.\/assets\/site\.css"/);
  const home = realFiles.get("index.html");
  assert.match(home, /href="assets\/site\.css"/);
});

test("lint 오류가 있는 위키는 빌드가 거부한다", () => {
  // 나머지 테스트가 전부 "지금 초록이니 계속 초록"이라, 실패를 만들 수 있는지
  // 확인하지 않으면 아무것도 검사하지 않는 테스트가 된다.
  const { root, wikiDir, sourcesPath } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    // sources 배열과 본문 각주가 어긋난다(lint 규칙 4) + 미등재 출처(규칙 3)
    "pioneers/p.md": page({
      type: "pioneer",
      title: "위인",
      extra: "sources: []\nconfidence: high",
      body: "주장[^없음]\n\n[^없음]: 서지. — tier A · [[sources/없음]]",
    }),
  });
  const out = join(root, "out");
  assert.throws(() => buildSite({ wikiDir, sourcesPath, outDir: out }), /lint 오류/);
  assert.ok(!existsSync(out), "빌드가 막혔는데 산출물이 생기면 안 된다");
  rmSync(root, { recursive: true, force: true });
});

test("사이트 어서션 위반도 빌드를 막는다", () => {
  // lint는 통과하되(그래서 confidence: low) 본문 티어 표기와 레지스트리가 어긋나는 위키.
  // lint 8규칙은 이 불일치를 보지 못한다 — 사이트 어서션이 새로 잡는 지점이다.
  const { root, wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": page({
        type: "meta",
        title: "색인",
        body: "- [[pioneers/p]]\n- [[sources/a]]",
      }),
      "pioneers/p.md": page({
        type: "pioneer",
        title: "위인",
        extra: "slug: p\nrole: 역할\nlife: 1900—2000\nconcepts: [가]\nsources: [a]\nconfidence: low",
        body: "## 절\n\n주장[^a]\n\n[^a]: 저자. 제목. — tier A · [[sources/a]]",
      }),
      "sources/a.md": page({
        type: "source",
        title: "출처",
        extra: "sources: [a]",
        body: "## 절\n\n설명[^a]\n\n[^a]: 저자. 제목. — tier A · [[sources/a]]",
      }),
    },
    // 레지스트리는 C인데 본문은 A라고 말한다 → 사이트가 거짓말을 하게 된다
    [{ id: "a", tier: "C", type: "백과사전", authors: "저자", title: "제목", url: "https://e.org" }]
  );
  const out = join(root, "out");
  assert.throws(() => buildSite({ wikiDir, sourcesPath, outDir: out }), /어서션/);
  rmSync(root, { recursive: true, force: true });
});

test("두 번 렌더해도 결과가 완전히 같다", () => {
  const again = renderAll(collect({ wikiDir: "wiki", sourcesPath: "sources.json" }));
  assert.deepEqual([...again.keys()].sort(), [...realFiles.keys()].sort());
  for (const [k, v] of again) assert.equal(v, realFiles.get(k), `${k} 불일치`);
});
