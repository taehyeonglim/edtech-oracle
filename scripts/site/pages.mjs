import { sections, asDateString } from "../wiki-parse.mjs";
import { anchorId, linkTo } from "./urls.mjs";
import { esc, layout, typeLabel, confidenceBadge, pageMeta } from "./layout.mjs";
import { roleAtoms, unwrapWikilink } from "./collect.mjs";

/**
 * 목차. `sections()`는 첫 `##` 앞 내용을 버리므로(lint 규칙 6 전용 설계) 목차에만 쓴다.
 * 본문 렌더는 반드시 `page.body` 전체를 쓴다 — `KNOWN-ISSUES.md`가 첫 `##` 앞에 두 문단을 갖는다.
 */
export const tocOf = (body) =>
  sections(body).map((s) => ({ id: anchorId(s.title), text: s.title }));

const chip = (text, cls = "") => `<span class="chip${cls ? ` ${cls}` : ""}">${esc(text)}</span>`;

const pageLink = (fromId, id, title) =>
  `<a href="${esc(linkTo(fromId, id))}">${esc(title ?? id)}</a>`;

/** 서지 한 줄. `year`가 43건 없으므로 전부 옵셔널로 조립한다. */
export function biblio(src) {
  if (!src) return "";
  const bits = [];
  if (src.authors) bits.push(esc(src.authors));
  if (src.year) bits.push(`(${esc(src.year)})`);
  if (src.title) bits.push(`<i>${esc(src.title)}</i>`);
  if (src.publisher) bits.push(esc(src.publisher));
  if (src.details) bits.push(esc(src.details));
  let out = bits.join(". ");
  if (src.doi) out += `. DOI: ${esc(src.doi)}`;
  return out;
}

/** 이 출처를 인용한 페이지 목록. 출처 페이지의 유일한 나가는 길이다. */
function citedBySection(model, fromId, sourceId) {
  const list = model.citations.get(sourceId) ?? [];
  if (!list.length) {
    return `<section class="citedby">
<h2>이 출처를 인용한 페이지</h2>
<p class="empty">아직 없다.</p>
</section>`;
  }
  const items = list
    .map(
      (c) =>
        `<li><span class="badge badge--${esc(c.type)}">${esc(typeLabel(c.type))}</span> ` +
        `${pageLink(fromId, c.pageId, c.title)}` +
        (c.count > 1 ? ` <span class="count" title="이 페이지에서 ${c.count}회 인용">×${c.count}</span>` : "") +
        `</li>`
    )
    .join("\n");
  return `<section class="citedby">
<h2>이 출처를 인용한 페이지 <span class="count-total">${list.length}</span></h2>
<ul class="citedby__list">
${items}
</ul>
</section>`;
}

/** 본문 산문에서 이 페이지를 가리킨 페이지들. */
function backlinkSection(model, fromId, pageId) {
  const list = (model.backlinks.get(pageId) ?? []).filter((b) => b.type !== "source");
  if (!list.length) return "";
  const items = list
    .map(
      (b) =>
        `<li><span class="badge badge--${esc(b.type)}">${esc(typeLabel(b.type))}</span> ` +
        `${pageLink(fromId, b.from, b.title)}</li>`
    )
    .join("\n");
  return `<section class="backlinks">
<h2>여기를 가리키는 페이지 <span class="count-total">${list.length}</span></h2>
<ul class="backlinks__list">
${items}
</ul>
</section>`;
}

function pioneerHead(model, p) {
  const concepts = (p.fm.concepts ?? []).map((c) => chip(c, "chip--concept")).join("");
  const roles = roleAtoms(p.fm.role).map((r) => chip(r, "chip--role")).join("");
  const conceptPages = (model.conceptLinks.get(p.id) ?? [])
    .map((c) => `<a class="chip chip--conceptpage" href="${esc(linkTo(p.id, c.id))}">${esc(c.title)}</a>`)
    .join("");

  return `<header class="page-head">
<p class="kicker">${esc(typeLabel("pioneer"))}</p>
<h1>${esc(p.fm.title)}</h1>
${pageMeta([
  p.fm.life ? `<span class="life">${esc(p.fm.life)}</span>` : "",
  p.fm.role ? esc(p.fm.role) : "",
  confidenceBadge(p.fm.confidence),
])}
${roles ? `<div class="chips" aria-label="역할">${roles}</div>` : ""}
${concepts ? `<div class="chips" aria-label="개념">${concepts}</div>` : ""}
${conceptPages ? `<div class="chips" aria-label="개념 페이지">${conceptPages}</div>` : ""}
</header>`;
}

function debateHead(model, p) {
  const ends = (p.fm.related ?? []).map(unwrapWikilink);
  const sides = ends
    .map((id) => {
      const t = model.byId.get(id);
      return `<a class="side" href="${esc(linkTo(p.id, id))}">${esc(t?.fm?.title ?? id)}</a>`;
    })
    .join('<span class="vs">↔</span>');
  return `<header class="page-head">
<p class="kicker">${esc(typeLabel("debate"))}</p>
<h1>${esc(p.fm.title)}</h1>
${sides ? `<div class="sides">${sides}</div>` : ""}
${pageMeta([confidenceBadge(p.fm.confidence)])}
</header>`;
}

function sourceHead(model, p) {
  const sid = p.id.replace(/^sources\//, "");
  const src = model.sourceById.get(sid);
  const tier = src?.tier ?? "?";
  return `<header class="page-head">
<p class="kicker">${esc(typeLabel("source"))}</p>
<h1><span class="tier tier--${esc(tier)}">${esc(tier)}</span> ${esc(p.fm.title)}</h1>
${src ? `<p class="biblio">${biblio(src)}</p>` : ""}
${pageMeta([
  src?.type ? esc(src.type) : "",
  src?.url
    ? `<a class="extlink" href="${esc(src.url)}" target="_blank" rel="noopener noreferrer">원문</a>`
    : "",
  src?.accessed ? `접근일 ${esc(src.accessed)}` : "",
  confidenceBadge(p.fm.confidence),
])}
</header>`;
}

function plainHead(p) {
  return `<header class="page-head">
<p class="kicker">${esc(typeLabel(p.fm.type))}</p>
<h1>${esc(p.fm.title)}</h1>
${pageMeta([confidenceBadge(p.fm.confidence)])}
</header>`;
}

/**
 * 위키 페이지 하나를 HTML로.
 * @param {object} model  SiteModel
 * @param {object} page   `{id, fm, body}`
 * @param {import("markdown-it")} md  이 페이지 기준으로 링크를 해석하도록 만들어진 인스턴스
 */
export function renderPage(model, page, md, nav) {
  const type = page.fm.type ?? "meta";
  const head =
    type === "pioneer"
      ? pioneerHead(model, page)
      : type === "debate"
        ? debateHead(model, page)
        : type === "source"
          ? sourceHead(model, page)
          : plainHead(page);

  const bodyHtml = md.render(page.body, {});

  const tail =
    type === "source"
      ? citedBySection(model, page.id, page.id.replace(/^sources\//, ""))
      : backlinkSection(model, page.id, page.id);

  const updated = asDateString(page.fm.updated);

  return layout({
    fromId: page.id,
    title: page.fm.title ?? page.id,
    subtitle: page.fm.role ?? "",
    nav,
    toc: tocOf(page.body),
    body: `<article class="page page--${esc(type)}">
${head}
<div class="prose">
${bodyHtml}
</div>
${tail}
${updated ? `<p class="updated">갱신 ${esc(updated)}</p>` : ""}
</article>`,
  });
}
