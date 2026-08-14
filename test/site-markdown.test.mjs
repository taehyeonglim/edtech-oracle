import test from "node:test";
import assert from "node:assert/strict";
import { createMarkdown, plainText } from "../scripts/site/markdown.mjs";

/** 최소 렌더 컨텍스트. `resolve`는 실제 빌드와 같은 계약을 흉내낸다. */
function mk({ titles = {}, tiers = {} } = {}) {
  return createMarkdown({
    resolve: (target) => ({
      url: `${target}.html`,
      title: titles[target] ?? "",
      exists: Object.prototype.hasOwnProperty.call(titles, target),
    }),
    tierOf: (label) => tiers[label] ?? null,
  });
}

test("위키링크가 실제 링크가 되고 대상 제목으로 표시된다", () => {
  const md = mk({ titles: { "pioneers/robert-gagne": "로버트 가녜" } });
  const html = md.render("앞 [[pioneers/robert-gagne]] 뒤", {});
  assert.match(html, /<a href="pioneers\/robert-gagne\.html" class="wikilink">로버트 가녜<\/a>/);
});

test("별칭이 있으면 별칭을 쓴다 — 현재 코퍼스에 0건이라 회귀 방어선이 이 테스트뿐이다", () => {
  const md = mk({ titles: { "pioneers/robert-gagne": "로버트 가녜" } });
  const html = md.render("[[pioneers/robert-gagne|가녜]]", {});
  assert.match(html, />가녜<\/a>/);
  assert.doesNotMatch(html, />로버트 가녜</);
});

test("코드스팬 안의 위키링크는 링크가 되지 않는다", () => {
  const md = mk({ titles: { "pioneers/x": "엑스" } });
  const html = md.render("`[[pioneers/x]]`", {});
  assert.doesNotMatch(html, /class="wikilink"/);
  assert.match(html, /<code>/);
});

test("이스케이프한 위키링크는 링크가 되지 않는다", () => {
  const md = mk({ titles: { "pioneers/x": "엑스" } });
  const html = md.render("\\[\\[pioneers/x]]", {});
  assert.doesNotMatch(html, /class="wikilink"/);
});

test("대상이 없으면 깨진 링크로 표시하되 예외를 던지지 않는다", () => {
  const md = mk();
  const html = md.render("[[없는/페이지]]", {});
  assert.match(html, /wikilink--broken/);
});

test("각주 참조와 정의가 label 기반 앵커로 이어진다", () => {
  const md = mk({ tiers: { "gagne-1965": "A" } });
  const html = md.render("주장.[^gagne-1965]\n\n[^gagne-1965]: 서지.", {});
  assert.match(html, /id="fnref-gagne-1965-0" href="#fn-gagne-1965"/);
  assert.match(html, /<li id="fn-gagne-1965" class="fn fn--A"/);
});

test("같은 각주를 세 번 참조하면 되돌아가기가 셋 생기고 각각 다른 앵커를 가리킨다", () => {
  // seymour-papert의 papert-1980은 한 페이지에서 18회 참조된다.
  // footnote_anchor를 오버라이드하지 않으면 기본 구현이 숫자 id(#fnref1:1)를 뱉어
  // label 기반 id와 어긋나고, 역참조가 전량 죽는다. 조용히 깨지는 종류라 못 박는다.
  const md = mk({ tiers: { a: "B" } });
  const html = md.render("하나[^a] 둘[^a] 셋[^a]\n\n[^a]: 서지.", {});
  for (const i of [0, 1, 2]) {
    assert.match(html, new RegExp(`id="fnref-a-${i}"`), `참조 앵커 ${i}`);
    assert.match(html, new RegExp(`href="#fnref-a-${i}"`), `되돌아가기 ${i}`);
  }
  assert.equal([...html.matchAll(/class="fn__back"/g)].length, 3);
});

test("티어 뱃지가 참조와 정의 양쪽에 붙는다", () => {
  const md = mk({ tiers: { a: "C" } });
  const html = md.render("주장[^a]\n\n[^a]: 서지.", {});
  assert.match(html, /data-tier="C"/);
  assert.match(html, /class="tier tier--C"/);
});

test("각주 정의 안의 위키링크도 링크가 된다 — 출처 추적의 마지막 고리다", () => {
  const md = mk({ titles: { "sources/gagne-1965": "gagne-1965" }, tiers: { "gagne-1965": "A" } });
  const html = md.render(
    "주장[^gagne-1965]\n\n[^gagne-1965]: 서지. — tier A · [[sources/gagne-1965]]",
    {}
  );
  assert.match(html, /<a href="sources\/gagne-1965\.html" class="wikilink">/);
});

test("DOI의 밑줄이 강조로 변하지 않는다", () => {
  // 코퍼스의 `_강조_` 매칭 49건은 전부 DOI다(s15327809jls0303_3).
  // markdown-it은 CommonMark를 따라 단어 내부 `_`를 강조로 보지 않으므로 별도 방어가
  // 필요 없지만, 렌더러를 바꿀 때 깨질 수 있어 고정한다.
  const md = mk();
  const html = md.render("DOI: 10.1207/s15327809jls0303_3", {});
  assert.doesNotMatch(html, /<em>/);
  assert.match(html, /s15327809jls0303_3/);
});

test("헤딩에 앵커 id가 붙고 § 링크는 제목 뒤에 온다", () => {
  const md = mk();
  const html = md.render("## 핵심 명제", {});
  assert.match(html, /<h2 id="s-핵심-명제"/);
  assert.match(html, /핵심 명제<a class="h-anchor"/);
});

test("외부 링크는 새 탭으로 열리고 rel이 붙는다", () => {
  const md = mk();
  const html = md.render("<https://example.org/a>", {});
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("원시 HTML은 이스케이프된다", () => {
  const md = mk();
  const html = md.render("<script>alert(1)</script>", {});
  assert.doesNotMatch(html, /<script>/);
});

test("검색 평문에서 각주 정의와 참조 마커가 모두 사라진다", () => {
  // 정의만 지우면 markdown-it이 참조를 인식하지 못해 `[^a]`가 리터럴로 남고
  // 스니펫이 각주 마커 범벅이 된다. 둘은 세트다.
  const md = mk({ tiers: { a: "A" } });
  const text = plainText(md, "본문 주장[^a] 이어짐.\n\n[^a]: 아주긴서지문자열.");
  assert.match(text, /본문 주장/);
  assert.doesNotMatch(text, /\[\^a\]/);
  assert.doesNotMatch(text, /아주긴서지문자열/);
});

test("검색 평문에서 위키링크가 표시명으로 바뀐다", () => {
  const md = mk({ titles: { "pioneers/x": "로버트 가녜" } });
  const text = plainText(md, "그는 [[pioneers/x]]와 논쟁했다.");
  assert.match(text, /로버트 가녜/);
});
