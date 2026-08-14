import test from "node:test";
import assert from "node:assert/strict";
import { makeWiki, page } from "./helpers.mjs";
import {
  collect,
  assertSiteInvariants,
  roleAtoms,
  unwrapWikilink,
  parseDefLines,
  buildCitations,
} from "../scripts/site/collect.mjs";

const src = (id, tier = "A") => ({
  id,
  tier,
  type: "원저서",
  authors: "저자",
  title: `제목-${id}`,
  url: "https://example.org",
});

const def = (id, tier = "A") => `[^${id}]: 저자. (1965). 제목. 출판사. — tier ${tier} · [[sources/${id}]]`;

test("역할은 띄어쓴 가운뎃점으로만 쪼갠다", () => {
  // `/·/`로 자르면 `미디어·ICT 정책 연구자`가 갈려 `미디어` 유령 패싯이 생긴다.
  assert.deepEqual(roleAtoms("교육공학자 · 미디어·ICT 정책 연구자"), [
    "교육공학자",
    "미디어·ICT 정책 연구자",
  ]);
  assert.deepEqual(roleAtoms("심리학자 · 행동분석가"), ["심리학자", "행동분석가"]);
  assert.deepEqual(roleAtoms(""), []);
});

test("related의 위키링크 껍질을 벗긴다", () => {
  assert.equal(unwrapWikilink("[[debates/lave-collins]]"), "debates/lave-collins");
  assert.equal(unwrapWikilink("[[pioneers/x|별칭]]"), "pioneers/x");
});

test("각주 정의줄에서 티어와 출처 id를 뽑는다", () => {
  const { ok, bad } = parseDefLines(def("gagne-1965", "B"));
  assert.equal(bad.length, 0);
  assert.deepEqual({ label: ok[0].label, tier: ok[0].tier, sourceId: ok[0].sourceId }, {
    label: "gagne-1965",
    tier: "B",
    sourceId: "gagne-1965",
  });
});

test("서지 제목 안의 em dash가 티어 파싱을 깨뜨리지 않는다", () => {
  // `Collins — Professor Emeritus`, `Scores—and Teaches`가 실제 코퍼스에 있다.
  // `$` 앵커 없이 앞에서부터 자르면 즉시 틀린다.
  const line =
    "[^x]: Northwestern. Allan M. Collins — Professor Emeritus. <https://a.b> — tier B · [[sources/x]]";
  const { ok, bad } = parseDefLines(line);
  assert.equal(bad.length, 0);
  assert.equal(ok[0].tier, "B");
  assert.match(ok[0].biblio, /Professor Emeritus/);
});

test("출처 페이지의 자기 인용은 역참조에서 빠진다", () => {
  // 모든 출처 페이지는 스키마상 자기 자신을 각주로 인용한다. 걸러내지 않으면
  // 140개 전부가 "이 출처를 인용한 페이지: 자기 자신"이 된다.
  const pages = [
    { id: "sources/a", fm: { title: "출처 A", type: "source" }, body: `본문[^a]\n\n${def("a")}` },
    { id: "pioneers/p", fm: { title: "위인", type: "pioneer" }, body: `본문[^a]\n\n${def("a")}` },
  ];
  const cites = buildCitations(pages);
  assert.deepEqual(cites.get("a").map((c) => c.pageId), ["pioneers/p"]);
});

test("같은 출처를 여러 번 인용해도 한 줄이고 횟수가 기록된다", () => {
  const pages = [
    {
      id: "pioneers/p",
      fm: { title: "위인", type: "pioneer" },
      body: `하나[^a] 둘[^a] 셋[^a]\n\n${def("a")}`,
    },
  ];
  const cites = buildCitations(pages);
  assert.equal(cites.get("a").length, 1);
  assert.equal(cites.get("a")[0].count, 3);
});

test("본문 티어와 sources.json 티어가 어긋나면 어서션이 잡는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": page({ type: "meta", title: "색인" }),
      "pioneers/p.md": page({
        type: "pioneer",
        title: "위인",
        extra: "sources: [a]\nconfidence: high",
        body: `주장[^a]\n\n${def("a", "A")}`,
      }),
      "sources/a.md": page({ type: "source", title: "출처", extra: "sources: [a]\nconfidence: high", body: `설명[^a]\n\n${def("a", "A")}` }),
    },
    [src("a", "B")] // 레지스트리는 B, 본문은 A
  );
  const errors = assertSiteInvariants(collect({ wikiDir, sourcesPath }));
  assert.ok(errors.some((e) => /티어 불일치/.test(e)), errors.join("\n"));
});

test("각주 label과 꼬리 링크의 출처가 다르면 어서션이 잡는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": page({ type: "meta", title: "색인" }),
      "pioneers/p.md": page({
        type: "pioneer",
        title: "위인",
        extra: "sources: [a]\nconfidence: high",
        body: "주장[^a]\n\n[^a]: 저자. — tier A · [[sources/b]]",
      }),
    },
    [src("a"), src("b")]
  );
  const errors = assertSiteInvariants(collect({ wikiDir, sourcesPath }));
  assert.ok(errors.some((e) => /sources\/b를 가리킴/.test(e)), errors.join("\n"));
});

test("각주 정의 형식을 벗어나면 어서션이 잡는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": page({ type: "meta", title: "색인" }),
      "pioneers/p.md": page({
        type: "pioneer",
        title: "위인",
        extra: "sources: [a]\nconfidence: high",
        body: "주장[^a]\n\n[^a]: 티어 표기가 없는 서지.",
      }),
    },
    [src("a")]
  );
  const errors = assertSiteInvariants(collect({ wikiDir, sourcesPath }));
  assert.ok(errors.some((e) => /형식 위반/.test(e)), errors.join("\n"));
});

test("화이트리스트 밖 디렉터리는 어서션이 잡는다", () => {
  // macOS 동기화가 만드는 `sources 2/`가 대표 사례. git이 빈 디렉터리를 추적하지 않아
  // CI는 초록인 채 로컬에서만 유령 페이지가 생긴다.
  const { wikiDir, sourcesPath } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    "sources 2/x.md": page({ type: "source", title: "유령" }),
  });
  const errors = assertSiteInvariants(collect({ wikiDir, sourcesPath }));
  assert.ok(errors.some((e) => /알 수 없는 디렉터리/.test(e)), errors.join("\n"));
});

test("debate의 related가 2개가 아니면 어서션이 잡는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    {
      "index.md": page({ type: "meta", title: "색인" }),
      "pioneers/a.md": page({ type: "pioneer", title: "가" }),
      "debates/d.md": page({
        type: "debate",
        title: "대립",
        extra: 'related: ["[[pioneers/a]]"]',
      }),
    },
    []
  );
  const errors = assertSiteInvariants(collect({ wikiDir, sourcesPath }));
  assert.ok(errors.some((e) => /related가 2개가 아님/.test(e)), errors.join("\n"));
});

test("대립축 양끝은 슬러그가 아니라 related 순서를 따른다", () => {
  // `jonassen-papert`의 related는 [papert, jonassen] 역순이다. 슬러그를 파싱하면
  // 조용히 반대로 그린다.
  const { wikiDir, sourcesPath } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    "pioneers/seymour-papert.md": page({ type: "pioneer", title: "파퍼트" }),
    "pioneers/david-jonassen.md": page({ type: "pioneer", title: "조나센" }),
    "debates/jonassen-papert.md": page({
      type: "debate",
      title: "만들기",
      extra: 'related: ["[[pioneers/seymour-papert]]", "[[pioneers/david-jonassen]]"]',
    }),
  });
  const model = collect({ wikiDir, sourcesPath });
  assert.equal(model.edges[0].a, "pioneers/seymour-papert");
  assert.equal(model.edges[0].b, "pioneers/david-jonassen");
});

test("개념→위인 단방향 링크의 역색인을 만든다", () => {
  const { wikiDir, sourcesPath } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    "pioneers/a.md": page({ type: "pioneer", title: "가" }),
    "concepts/c.md": page({
      type: "concept",
      title: "개념",
      extra: 'related: ["[[pioneers/a]]"]',
    }),
  });
  const model = collect({ wikiDir, sourcesPath });
  assert.deepEqual(model.conceptLinks.get("pioneers/a")?.map((c) => c.id), ["concepts/c"]);
});

test("sources.json에만 있고 페이지가 없는 출처는 경고로 남는다 — 숨기지 않는다", () => {
  const { wikiDir, sourcesPath } = makeWiki(
    { "index.md": page({ type: "meta", title: "색인" }) },
    [src("고아")]
  );
  const model = collect({ wikiDir, sourcesPath });
  assert.ok(model.warnings.some((w) => /고아/.test(w)));
  assert.equal(assertSiteInvariants(model).length, 0, "경고는 빌드를 막지 않는다");
});
