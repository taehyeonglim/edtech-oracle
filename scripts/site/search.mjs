import { sections } from "../wiki-parse.mjs";
import { pageUrl, BROWSE, assetUrl } from "./urls.mjs";
import { esc, layout } from "./layout.mjs";
import { plainText } from "./markdown.mjs";

/**
 * 검색 색인.
 *
 * 인버티드 인덱스를 만들지 않는다. 문서 217개에 각주 정의를 뺀 본문이 수백 KB 규모라
 * 브라우저에서 선형 스캔이 밀리초 단위로 끝나고, 무엇보다 **한국어에서 부분 문자열이 더 정확하다.**
 * 교착어라 "구성주의"로 검색했을 때 "구성주의적"·"구성주의를"이 잡혀야 하는데 공백 토큰
 * 역색인은 이걸 못 잡는다. 형태소 분석기는 런타임 의존성 0 원칙과 정면 충돌한다.
 */

/** 질의·본문 공통 정규화. NFC를 빠뜨리면 macOS가 만든 NFD 문자열과 조용히 안 맞는다. */
export const normalize = (s) => String(s ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();

export const tokenize = (q) => normalize(q).split(" ").filter(Boolean);

export function buildSearchIndex(model, md) {
  const docs = model.pages.map((p) => ({
    u: pageUrl(p.id),
    t: p.fm.title ?? p.id,
    y: p.fm.type ?? "",
    s: p.fm.role ?? "",
    h: sections(p.body).map((x) => x.title),
    b: plainText(md, p.body),
  }));
  return { generated: model.updated, docs };
}

/** 제목 > 헤딩 > 부제 > 본문. 모든 토큰이 어딘가에 있어야 한다(AND). */
export function scoreDoc(doc, terms) {
  if (!terms.length) return 0;
  const t = normalize(doc.t);
  const s = normalize(doc.s);
  const h = normalize((doc.h ?? []).join(" "));
  const b = normalize(doc.b);

  let total = 0;
  for (const term of terms) {
    let score = 0;
    if (t === term) score += 120;
    else if (t.includes(term)) score += 60;
    if (h.includes(term)) score += 25;
    if (s.includes(term)) score += 15;
    if (b.includes(term)) {
      score += 10;
      const occurrences = b.split(term).length - 1;
      score += Math.min(occurrences, 8);
    }
    if (score === 0) return 0; // AND
    total += score;
  }
  return total;
}

export function renderSearchPage(model, nav) {
  return layout({
    fromId: "search-page",
    title: "검색",
    subtitle: "본문 전체에서 찾는다",
    nav,
    extraHead: `<script src="${esc(assetUrl("search-page", "search.js"))}" defer></script>`,
    body: `<header class="page-head">
<p class="kicker">검색</p>
<h1>본문 검색</h1>
<p class="lede">부분 문자열로 찾는다 — "구성주의"가 "구성주의적"도 잡는다.
각주 서지는 색인에서 제외했다.</p>
</header>
<div class="searchbox">
<label for="q">검색어</label>
<input id="q" type="search" placeholder="예: 인지부하, 근접발달영역, 매체" autocomplete="off" autofocus>
</div>
<p class="search-status" id="search-status" role="status">색인을 불러오는 중…</p>
<ol class="search-results" id="search-results"></ol>
<noscript><p class="lede">검색에는 자바스크립트가 필요하다.
<a href="${esc(BROWSE.pioneers)}">위인</a>·<a href="${esc(BROWSE.sources)}">출처</a> 목록으로 대신 훑어볼 수 있다.</p></noscript>`,
  });
}
