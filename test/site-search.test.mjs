import test from "node:test";
import assert from "node:assert/strict";
import { normalize, tokenize, scoreDoc, buildSearchIndex } from "../scripts/site/search.mjs";
import { createMarkdown } from "../scripts/site/markdown.mjs";
import { collect } from "../scripts/site/collect.mjs";

const doc = (over = {}) => ({
  u: "pioneers/x.html",
  t: "로버트 가녜",
  y: "pioneer",
  s: "교육심리학자",
  h: ["핵심 명제", "한계"],
  b: "학습 결과의 종류에 따라 조건이 달라진다. 구성주의적 관점과 대비된다.",
  ...over,
});

test("정규화는 NFC로 통일한다", () => {
  // macOS는 파일과 문자열을 NFD로 만들 수 있다. 정규화를 빠뜨리면 조합형과 완성형이
  // 눈으로는 같은데 includes()가 조용히 실패한다.
  const nfd = "가녜".normalize("NFD");
  const nfc = "가녜".normalize("NFC");
  assert.notEqual(nfd, nfc, "전제: 두 표현의 바이트가 다르다");
  assert.equal(normalize(nfd), normalize(nfc));
});

test("교착어 부분 문자열이 잡힌다", () => {
  // "구성주의"로 검색해 "구성주의적"이 안 잡히면 한국어 검색이 아니다.
  assert.ok(scoreDoc(doc(), tokenize("구성주의")) > 0);
  assert.ok(scoreDoc(doc(), tokenize("학습 결과")) > 0);
});

test("여러 토큰은 AND로 묶인다", () => {
  assert.ok(scoreDoc(doc(), tokenize("가녜 구성주의")) > 0);
  assert.equal(scoreDoc(doc(), tokenize("가녜 없는단어")), 0);
});

test("제목 일치가 헤딩보다, 헤딩이 본문보다 높다", () => {
  const titleHit = scoreDoc(doc({ t: "인지부하" }), tokenize("인지부하"));
  const headingHit = scoreDoc(doc({ h: ["인지부하"], b: "무관" }), tokenize("인지부하"));
  const bodyHit = scoreDoc(doc({ b: "인지부하가 나온다" }), tokenize("인지부하"));
  assert.ok(titleHit > headingHit, `${titleHit} > ${headingHit}`);
  assert.ok(headingHit > bodyHit, `${headingHit} > ${bodyHit}`);
});

test("빈 질의는 0점이다", () => {
  assert.equal(scoreDoc(doc(), tokenize("")), 0);
});

test("실제 위키 색인이 페이지 수만큼 나오고 각주 서지가 섞이지 않는다", () => {
  const model = collect({ wikiDir: "wiki", sourcesPath: "sources.json" });
  const md = createMarkdown({
    resolve: (t) => ({ url: `${t}.html`, title: model.byId.get(t)?.fm?.title ?? "", exists: true }),
    tierOf: (l) => model.sourceById.get(l)?.tier ?? null,
  });
  const index = buildSearchIndex(model, md);

  assert.equal(index.docs.length, model.pages.length);

  const gagne = index.docs.find((d) => d.u === "pioneers/robert-gagne.html");
  assert.ok(gagne, "가녜 문서가 있다");
  assert.match(gagne.b, /학습/);
  assert.doesNotMatch(gagne.b, /\[\^/, "각주 참조 마커가 남으면 안 된다");
  assert.doesNotMatch(gagne.b, /Holt, Rinehart/, "각주 서지가 색인에 들어가면 안 된다");
  assert.equal(gagne.b, gagne.b.normalize("NFC"), "색인은 NFC여야 한다");
});
