import { assetUrl, relUrl } from "./urls.mjs";

export const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const TYPE_LABEL = {
  pioneer: "위인",
  debate: "대립축",
  concept: "개념",
  source: "출처",
  meta: "운영 문서",
};

export const typeLabel = (t) => TYPE_LABEL[t] ?? t;

/**
 * 페이지 HTML 셸.
 *
 * 모든 링크가 상대경로다. `fromId`의 깊이만으로 `../`가 결정되므로 base path 설정이 없다.
 */
export function layout({ fromId, title, subtitle = "", nav = [], body, toc = [], extraHead = "" }) {
  const a = (name) => assetUrl(fromId, name);
  const navHtml = nav
    .map(
      (n) =>
        `<a href="${esc(relUrl(fromId, n.href))}"${n.current ? ' aria-current="page"' : ""}>${esc(n.label)}</a>`
    )
    .join("");

  const tocHtml = toc.length
    ? `<nav class="toc" aria-labelledby="toc-title">
<h2 id="toc-title" class="toc__title">이 문서에서</h2>
<ol>${toc.map((t) => `<li><a href="#${esc(t.id)}">${esc(t.text)}</a></li>`).join("")}</ol>
</nav>`
    : "";
  // 2열 그리드는 목차가 있을 때만이다. 없는데 2열을 깔면 유일한 자식인 <main>이
  // 13rem 칸에 배치돼 본문이 208px로 눌리고 오른쪽 47rem이 통째로 빈다.
  const wrapClass = toc.length ? "wrap wrap--doc" : "wrap";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — 에듀테크 오라클</title>
<meta name="description" content="${esc(subtitle || "교육공학 위인들의 근거 위키. 모든 서술이 각주로 출처를 인용한다.")}">
<link rel="stylesheet" href="${esc(a("site.css"))}">
${extraHead}</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="site-head">
  <a class="site-head__brand" href="${esc(relUrl(fromId, "index.html"))}">에듀테크 오라클</a>
  <nav class="site-head__nav" aria-label="주요">${navHtml}</nav>
</header>
<div class="${wrapClass}">
${tocHtml}
<main id="main" tabindex="-1">
${body}
</main>
</div>
<footer class="site-foot">
  <p>모든 서술은 각주로 출처를 인용한다. 티어 <b class="tier tier--A">A</b> 원저작 ·
     <b class="tier tier--B">B</b> 피어리뷰·학회 기록 ·
     <b class="tier tier--C">C</b> 백과사전(단독 근거 금지).</p>
  <p><a href="https://github.com/taehyeonglim/edtech-oracle" class="extlink" target="_blank" rel="noopener noreferrer">GitHub 저장소</a></p>
</footer>
</body>
</html>
`;
}

/** 프론트매터의 확신도 뱃지. */
export const confidenceBadge = (c) =>
  c ? `<span class="conf conf--${esc(c)}">확신도 ${esc(c)}</span>` : "";

/** 페이지 상단 메타 줄. */
export function pageMeta(parts) {
  const items = parts.filter(Boolean);
  return items.length ? `<p class="page-meta">${items.join('<span class="sep">·</span>')}</p>` : "";
}
