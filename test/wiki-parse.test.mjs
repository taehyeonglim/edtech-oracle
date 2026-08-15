import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadPages,
  footnoteDefs,
  footnoteRefs,
  wikilinks,
  sections,
  stripFootnoteDefs,
  asDateString,
} from "../scripts/wiki-parse.mjs";
import { makeWiki, page } from "./helpers.mjs";

test("loadPages는 하위 디렉터리까지 읽고 id를 확장자 없는 상대경로로 만든다", () => {
  const { wikiDir } = makeWiki({
    "index.md": page({ type: "meta", title: "색인" }),
    "pioneers/robert-gagne.md": page({ title: "로버트 가네", extra: "slug: robert-gagne" }),
  });
  const pages = loadPages(wikiDir);
  assert.deepEqual(pages.map((p) => p.id).sort(), ["index", "pioneers/robert-gagne"]);
  assert.equal(pages.find((p) => p.id === "index").fm.type, "meta");
});

test("각주 정의와 참조를 구분한다", () => {
  const body =
    "주장이다[^a]. 또 다른 주장[^b].\n\n[^a]: 서지 A. [[sources/a]]\n[^b]: 서지 B. [[sources/b]]\n";
  assert.deepEqual(footnoteRefs(body), ["a", "b"]);
  assert.deepEqual(footnoteDefs(body), ["a", "b"]);
});

test("각주 정의 줄은 참조로 세지 않는다", () => {
  const body = "[^only]: 정의뿐이다. [[sources/only]]\n";
  assert.deepEqual(footnoteRefs(body), []);
  assert.deepEqual(footnoteDefs(body), ["only"]);
});

test("wikilinks는 각주 정의 안의 링크도 포함한다", () => {
  const body = "본문[^a].\n\n[^a]: 서지. [[sources/a]]\n\n[[concepts/b]]\n";
  assert.deepEqual(wikilinks(body).sort(), ["concepts/b", "sources/a"]);
});

test("stripFootnoteDefs는 정의와 들여쓴 연속 줄을 제거한다", () => {
  const body =
    "본문[^a].\n\n[^a]: 서지 첫 줄\n    이어지는 줄. [[sources/a]]\n\n## 다음 절\n내용[^a].\n";
  const stripped = stripFootnoteDefs(body);
  assert.ok(!stripped.includes("이어지는 줄"));
  assert.ok(stripped.includes("## 다음 절"));
});

test("sections는 3칸까지 들여쓴 ## 도 자른다", () => {
  // CommonMark·markdown-it이 헤딩으로 렌더링하는 범위다. 놓치면 근거 없는 섹션을
  // 들여쓰기로 숨겨 규칙 6과 confidence 계산을 비켜갈 수 있다.
  assert.deepEqual(
    sections("## 하나\n본문\n\n   ## 둘\n본문\n").map((s) => s.title),
    ["하나", "둘"],
  );
});

test("sections는 4칸 들여쓴 ## 는 코드블록으로 보고 자르지 않는다", () => {
  assert.deepEqual(
    sections("## 하나\n본문\n\n    ## 둘\n본문\n").map((s) => s.title),
    ["하나"],
  );
});

test("footnoteDefs는 3칸까지 들여쓴 정의를 인정한다", () => {
  assert.deepEqual(footnoteDefs("  [^a]: 저자. — tier A · [[sources/a]]\n"), ["a"]);
  assert.deepEqual(footnoteDefs("    [^a]: 코드블록이다\n"), []);
});

test("sections는 ## 만 자르고 ### 는 무시한다", () => {
  const body = "머리말\n\n## 첫 절\n가[^a].\n\n### 하위\n나\n\n## 둘째 절\n다[^a].\n";
  const s = sections(body);
  assert.deepEqual(
    s.map((x) => x.title),
    ["첫 절", "둘째 절"],
  );
  assert.ok(s[0].text.includes("### 하위"));
});

test("asDateString은 YAML이 Date로 파싱한 값도 문자열로 만든다", () => {
  assert.equal(asDateString(new Date("2026-08-14T00:00:00Z")), "2026-08-14");
  assert.equal(asDateString("2026-08-14"), "2026-08-14");
  assert.equal(asDateString(42), "");
});
