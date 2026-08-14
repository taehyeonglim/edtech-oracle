import { pageUrl, BROWSE, assetUrl } from "./urls.mjs";
import { esc, layout } from "./layout.mjs";
import { roleAtoms, unwrapWikilink } from "./collect.mjs";
import { biblio } from "./pages.mjs";

/**
 * 브라우즈 페이지. 위키가 아니라 빌드가 생성하며 전부 깊이 0이다.
 *
 * 필터 축은 실측 카디널리티로 골랐다. `concepts`는 141개 distinct 중 2명 이상이 공유하는 것이
 * 단 3개라(CLAUDE.md가 말하는 "통제 어휘 없음") 드롭다운으로 만들면 138개 항목이 결과 1건인
 * 필터가 된다. 그래서 개념은 자유 입력 태그 검색으로 두고, 1차 축은 역할 패싯으로 잡았다.
 */

const filterScript = (from) =>
  `<script src="${esc(assetUrl(from, "filter.js"))}" defer></script>`;

function chipBar({ id, label, items, allLabel = "전체" }) {
  const chips = items
    .map(
      ([value, count]) =>
        `<button type="button" class="fchip" data-facet="${esc(value)}">` +
        `${esc(value)} <span class="fchip__n">${count}</span></button>`
    )
    .join("");
  return `<div class="facets" id="${esc(id)}" role="group" aria-label="${esc(label)}">
<button type="button" class="fchip is-on" data-facet="">${esc(allLabel)}</button>${chips}
</div>`;
}

function pioneerCard(model, p) {
  const roles = roleAtoms(p.fm.role);
  const concepts = p.fm.concepts ?? [];
  const debates = (p.fm.related ?? []).length;
  return `<li class="card" data-roles="${esc(roles.join("|"))}" data-text="${esc(
    [p.fm.title, p.fm.role, ...concepts].join(" ")
  )}">
<a class="card__title" href="${esc(pageUrl(p.id))}">${esc(p.fm.title)}</a>
<p class="card__sub">${esc(p.fm.role ?? "")}</p>
<p class="card__meta"><span class="life">${esc(p.fm.life ?? "")}</span>
<span class="sep">·</span>대립축 ${debates}</p>
<p class="card__chips">${concepts.map((c) => `<span class="chip chip--concept">${esc(c)}</span>`).join("")}</p>
</li>`;
}

function renderPioneers(model, navFor) {
  const list = (model.byType.get("pioneer") ?? []).slice().sort((a, b) =>
    String(a.fm.title).localeCompare(String(b.fm.title), "ko")
  );
  const facets = [...model.roleFacets]
    .map(([k, v]) => [k, v.length])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"))
    .slice(0, 12);

  return layout({
    fromId: "pioneers-browse",
    title: "위인",
    subtitle: "교육공학 위인 36인",
    nav: navFor("pioneers"),
    extraHead: filterScript("pioneers-browse"),
    body: `<header class="page-head">
<p class="kicker">브라우즈</p>
<h1>위인 <span class="count-total">${list.length}</span></h1>
<p class="lede">역할로 추리거나 개념·이름을 입력해 좁힌다.</p>
</header>
${chipBar({ id: "role-facets", label: "역할", items: facets })}
<div class="filterbox">
<label for="q-pioneer">개념·이름 검색</label>
<input id="q-pioneer" type="search" placeholder="예: 인지부하, 자기효능감" autocomplete="off">
<p class="filterbox__count" data-count-for="pioneer-list"></p>
</div>
<ul class="cards" id="pioneer-list" data-filterable>
${list.map((p) => pioneerCard(model, p)).join("\n")}
</ul>`,
  });
}

function renderDebates(model, navFor) {
  const rows = model.edges
    .map((e) => {
      const page = model.byId.get(e.id);
      return {
        ...e,
        aTitle: model.byId.get(e.a)?.fm?.title ?? e.a,
        bTitle: model.byId.get(e.b)?.fm?.title ?? e.b,
        title: page?.fm?.title ?? e.title,
      };
    })
    .sort((x, y) => String(x.title).localeCompare(String(y.title), "ko"));

  const degree = new Map();
  for (const e of model.edges) for (const end of e.ends) degree.set(end, (degree.get(end) ?? 0) + 1);
  const isolated = (model.byType.get("pioneer") ?? []).filter((p) => !degree.has(p.id));

  return layout({
    fromId: "debates-browse",
    title: "대립축",
    subtitle: "교육공학의 미해결 논쟁",
    nav: navFor("debates"),
    extraHead: filterScript("debates-browse"),
    body: `<header class="page-head">
<p class="kicker">브라우즈</p>
<h1>대립축 <span class="count-total">${rows.length}</span></h1>
<p class="lede">양측은 프론트매터의 <code>related</code>에서 읽는다. 슬러그 순서와 다를 수 있다.</p>
</header>
<div class="filterbox">
<label for="q-debate">검색</label>
<input id="q-debate" type="search" placeholder="예: 매체, 동기" autocomplete="off">
<p class="filterbox__count" data-count-for="debate-list"></p>
</div>
<ul class="rows" id="debate-list" data-filterable>
${rows
  .map(
    (r) => `<li class="row" data-text="${esc([r.title, r.aTitle, r.bTitle].join(" "))}">
<a class="row__title" href="${esc(r.id)}.html">${esc(r.title)}</a>
<p class="row__sub"><a href="${esc(r.a)}.html">${esc(r.aTitle)}</a>
<span class="vs">↔</span><a href="${esc(r.b)}.html">${esc(r.bTitle)}</a></p>
</li>`
  )
  .join("\n")}
</ul>
${
  isolated.length
    ? `<section class="isolated">
<h2>대립축이 없는 위인 <span class="count-total">${isolated.length}</span></h2>
<p class="lede">데이터가 아직 관계를 담지 않은 것이지, 논쟁이 없었다는 뜻이 아니다.</p>
<ul class="inline-list">${isolated
        .map((p) => `<li><a href="${esc(p.id)}.html">${esc(p.fm.title)}</a></li>`)
        .join("")}</ul>
</section>`
    : ""
}`,
  });
}

function renderConcepts(model, navFor) {
  const canon = (model.byType.get("concept") ?? []).slice().sort((a, b) =>
    String(a.fm.title).localeCompare(String(b.fm.title), "ko")
  );

  // 위인 프론트매터의 자유 텍스트 개념. 정본 개념 페이지와 별개 어휘다.
  const tags = new Map();
  for (const p of model.byType.get("pioneer") ?? []) {
    for (const c of p.fm.concepts ?? []) {
      if (!tags.has(c)) tags.set(c, []);
      tags.get(c).push(p);
    }
  }
  const sorted = [...tags].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "ko")
  );

  return layout({
    fromId: "concepts-browse",
    title: "개념",
    subtitle: "정본 개념 페이지와 위인별 개념 태그",
    nav: navFor("concepts"),
    extraHead: filterScript("concepts-browse"),
    body: `<header class="page-head">
<p class="kicker">브라우즈</p>
<h1>개념</h1>
</header>
<section>
<h2>정본 개념 페이지 <span class="count-total">${canon.length}</span></h2>
<p class="lede">근거가 있을 때만 만든다. 그래서 셋뿐이다.</p>
<ul class="cards cards--wide">
${canon
  .map(
    (c) => `<li class="card">
<a class="card__title" href="${esc(c.id)}.html">${esc(c.fm.title)}</a>
<p class="card__meta">${(model.conceptLinks.get(c.id) ?? []).length ? "" : ""}${(c.fm.related ?? [])
      .map(unwrapWikilink)
      .map((id) => `<a class="chip chip--role" href="${esc(id)}.html">${esc(model.byId.get(id)?.fm?.title ?? id)}</a>`)
      .join(" ")}</p>
</li>`
  )
  .join("\n")}
</ul>
</section>
<section>
<h2>위인별 개념 태그 <span class="count-total">${sorted.length}</span></h2>
<p class="lede">pantheon에 통제 어휘가 없어 대부분이 한 사람에게만 붙는다 —
둘 이상이 공유하는 것은 ${sorted.filter(([, v]) => v.length > 1).length}개뿐이다.</p>
<div class="filterbox">
<label for="q-concept">태그 검색</label>
<input id="q-concept" type="search" placeholder="예: 전이, 동기" autocomplete="off">
<p class="filterbox__count" data-count-for="concept-tags"></p>
</div>
<ul class="rows" id="concept-tags" data-filterable>
${sorted
  .map(
    ([tag, people]) => `<li class="row" data-text="${esc([tag, ...people.map((p) => p.fm.title)].join(" "))}">
<span class="row__title">${esc(tag)}${people.length > 1 ? ` <span class="count">×${people.length}</span>` : ""}</span>
<p class="row__sub">${people
      .map((p) => `<a href="${esc(p.id)}.html">${esc(p.fm.title)}</a>`)
      .join('<span class="sep">·</span>')}</p>
</li>`
  )
  .join("\n")}
</ul>
</section>`,
  });
}

function renderSources(model, navFor) {
  const pages = model.byType.get("source") ?? [];
  const rows = pages
    .map((p) => {
      const sid = p.id.replace(/^sources\//, "");
      const src = model.sourceById.get(sid);
      const cites = model.citations.get(sid) ?? [];
      return { p, sid, src, tier: src?.tier ?? "?", cites: cites.length };
    })
    .sort((a, b) => b.cites - a.cites || a.sid.localeCompare(b.sid));

  const tierFacets = ["A", "B", "C"].map((t) => [t, rows.filter((r) => r.tier === t).length]);

  return layout({
    fromId: "sources-browse",
    title: "출처",
    subtitle: "근거의 티어와 인용 분포",
    nav: navFor("sources"),
    extraHead: filterScript("sources-browse"),
    body: `<header class="page-head">
<p class="kicker">브라우즈</p>
<h1>출처 <span class="count-total">${rows.length}</span></h1>
<p class="lede">인용이 많은 순. 티어 C는 단독 근거로 쓸 수 없다.</p>
</header>
${chipBar({ id: "tier-facets", label: "티어", items: tierFacets })}
<div class="filterbox">
<label for="q-source">저자·제목 검색</label>
<input id="q-source" type="search" placeholder="예: Mayer, 인지부하" autocomplete="off">
<p class="filterbox__count" data-count-for="source-list"></p>
</div>
<ul class="rows" id="source-list" data-filterable>
${rows
  .map(
    (r) => `<li class="row" data-facet="${esc(r.tier)}" data-text="${esc(
      [r.p.fm.title, r.src?.authors, r.src?.title, r.src?.publisher, r.sid].filter(Boolean).join(" ")
    )}">
<span class="tier tier--${esc(r.tier)}">${esc(r.tier)}</span>
<a class="row__title" href="${esc(r.p.id)}.html">${esc(r.p.fm.title)}</a>
<span class="count" title="인용한 페이지 수">${r.cites}</span>
<p class="row__sub">${biblio(r.src)}</p>
</li>`
  )
  .join("\n")}
</ul>
${
  model.warnings.length
    ? `<section class="warnings">
<h2>레지스트리에만 있는 출처</h2>
<p class="lede">sources.json에는 있으나 위키 페이지가 없다. 숨기지 않고 드러낸다.</p>
<ul class="inline-list">${model.warnings
        .map((w) => `<li>${esc(w.replace("sources.json에 있으나 위키 페이지 없음: ", ""))}</li>`)
        .join("")}</ul>
</section>`
    : ""
}`,
  });
}

export function renderBrowse(model, navFor) {
  return new Map([
    [BROWSE.pioneers, renderPioneers(model, navFor)],
    [BROWSE.debates, renderDebates(model, navFor)],
    [BROWSE.concepts, renderConcepts(model, navFor)],
    [BROWSE.sources, renderSources(model, navFor)],
  ]);
}
