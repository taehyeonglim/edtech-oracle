import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, posix } from "node:path";
import { pathToFileURL } from "node:url";
import { lintWiki } from "./lint-wiki.mjs";
import { collect, assertSiteInvariants } from "./site/collect.mjs";
import { createMarkdown } from "./site/markdown.mjs";
import { renderPage } from "./site/pages.mjs";
import { renderBrowse } from "./site/browse.mjs";
import { buildSearchIndex, renderSearchPage } from "./site/search.mjs";
import { renderGraphPage, buildGraph, layoutGraph } from "./site/graph.mjs";
import { pageUrl, linkTo, BROWSE } from "./site/urls.mjs";

const WIKI_DIR = "wiki";
const SOURCES = "sources.json";
const ASSET_DIR = join("web", "assets");

const NAV = [
  { key: "index", href: "index.html", label: "홈" },
  { key: "pioneers", href: BROWSE.pioneers, label: "위인" },
  { key: "debates", href: BROWSE.debates, label: "대립축" },
  { key: "concepts", href: BROWSE.concepts, label: "개념" },
  { key: "sources", href: BROWSE.sources, label: "출처" },
  { key: "graph", href: BROWSE.graph, label: "지도" },
  { key: "search", href: BROWSE.search, label: "검색" },
];

const navFor = (key) => NAV.map((n) => ({ ...n, current: n.key === key }));

/**
 * 전 페이지를 렌더한다. **파일시스템에 접근하지 않는다** — `Map<경로, 문자열>`만 돌려준다.
 * 덕분에 220여 페이지 전부를 파일 없이 문자열로 검사할 수 있다.
 */
export function renderAll(model) {
  const files = new Map();

  // 링크 해석은 "지금 렌더 중인 페이지" 기준의 상대경로를 내야 한다.
  // 인스턴스를 페이지마다 새로 만드는 대신 가변 변수를 클로저로 잡는다.
  let currentId = "index";

  const md = createMarkdown({
    resolve(target) {
      const page = model.byId.get(target);
      // 출처 링크 509개는 전부 각주 정의 안에 있고, 그 자리에는 바로 앞에 서지가 이미 있다.
      // 제목을 다시 보여주면 글자 그대로 중복이므로 인용키를 쓴다 — 프론트매터·lint가
      // 쓰는 바로 그 키라 정보량이 있다.
      const isSource = target.startsWith("sources/");
      return {
        url: linkTo(currentId, target),
        title: isSource ? target.slice("sources/".length) : (page?.fm?.title ?? ""),
        exists: Boolean(page),
      };
    },
    tierOf(label) {
      return model.sourceById.get(label)?.tier ?? null;
    },
  });

  for (const page of model.pages) {
    currentId = page.id;
    const navKey =
      page.id === "index"
        ? "index"
        : page.fm.type === "pioneer"
          ? "pioneers"
          : page.fm.type === "debate"
            ? "debates"
            : page.fm.type === "concept"
              ? "concepts"
              : page.fm.type === "source"
                ? "sources"
                : "";
    files.set(pageUrl(page.id), renderPage(model, page, md, navFor(navKey)));
  }

  for (const [name, html] of renderBrowse(model, navFor)) files.set(name, html);

  // plainText는 링크 URL을 버리고 텍스트만 모으므로 렌더 컨텍스트가 필요 없다.
  files.set("search-index.json", JSON.stringify(buildSearchIndex(model, md)));
  files.set(BROWSE.search, renderSearchPage(model, navFor("search")));

  const graph = buildGraph(model);
  const positions = layoutGraph(graph);
  files.set(BROWSE.graph, renderGraphPage(model, graph, positions, navFor("graph")));

  return files;
}

/** 산출물 안의 모든 내부 링크가 실재하는지 검사한다. 사이트판 lint 규칙 5. */
export function findDeadLinks(files, assetNames) {
  const keys = new Set([...files.keys(), ...assetNames.map((n) => `assets/${n}`)]);
  const dead = [];
  const attr = /(?:href|src)="([^"]+)"/g;

  for (const [from, html] of files) {
    if (!from.endsWith(".html")) continue;
    const dir = posix.dirname(from);
    for (const m of html.matchAll(attr)) {
      const raw = m[1];
      if (/^(https?:|mailto:|data:|#)/.test(raw)) continue;
      const target = posix.normalize(posix.join(dir === "." ? "" : dir, raw.split("#")[0]));
      if (!target || target === ".") continue;
      if (!keys.has(target)) dead.push(`${from} → ${raw} (해석: ${target})`);
    }
  }
  return dead;
}

function listAssets() {
  try {
    return readdirSync(ASSET_DIR).filter((n) => !n.startsWith("."));
  } catch {
    return [];
  }
}

function writeAll(outDir, files) {
  rmSync(outDir, { recursive: true, force: true });
  for (const [rel, content] of files) {
    const dest = join(outDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  const assets = listAssets();
  if (assets.length) {
    mkdirSync(join(outDir, "assets"), { recursive: true });
    for (const name of assets) {
      const src = join(ASSET_DIR, name);
      if (statSync(src).isFile()) writeFileSync(join(outDir, "assets", name), readFileSync(src));
    }
  }
  return files.size + assets.length;
}

export function buildSite({ wikiDir = WIKI_DIR, sourcesPath = SOURCES, outDir = "dist" } = {}) {
  // 0. 게이트. lint가 빨간데 사이트를 빌드하면 깨진 근거를 예쁘게 포장해 배포하는 셈이다.
  //    우회 플래그를 두지 않는다.
  const findings = lintWiki({ wikiDir, sourcesPath, strict: true });
  const lintErrors = findings.filter((f) => f.severity === "error");
  if (lintErrors.length) {
    for (const f of lintErrors) console.error(`LINT [${f.rule}] ${f.file}: ${f.message}`);
    throw new Error(`lint 오류 ${lintErrors.length}건 — 빌드 중단`);
  }

  // 1. 수집
  const model = collect({ wikiDir, sourcesPath });

  // 2. 어서션 — lint 8규칙이 보지 못하는 불변식
  const invariantErrors = assertSiteInvariants(model);
  if (invariantErrors.length) {
    for (const e of invariantErrors) console.error(`어서션 ${e}`);
    throw new Error(`사이트 어서션 ${invariantErrors.length}건 — 빌드 중단`);
  }
  for (const w of model.warnings) console.warn(`경고 ${w}`);

  // 3. 렌더 (순수)
  const files = renderAll(model);

  // 4. 링크 검사
  const dead = findDeadLinks(files, listAssets());
  if (dead.length) {
    for (const d of dead.slice(0, 30)) console.error(`깨진 링크 ${d}`);
    throw new Error(`내부 링크 ${dead.length}건이 해석되지 않음 — 빌드 중단`);
  }

  // 5. 쓰기 (유일한 부작용)
  const written = writeAll(outDir, files);
  return { model, files, written, outDir };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const outIdx = process.argv.indexOf("--out");
  const outDir = outIdx > -1 ? process.argv[outIdx + 1] : "dist";
  const t0 = Date.now();
  const { model, files, written } = buildSite({ outDir });
  console.log(
    `${outDir}/ 에 ${written}개 파일 · 페이지 ${model.pages.length} · 출처 ${model.sources.length} · ` +
      `HTML ${[...files.keys()].filter((k) => k.endsWith(".html")).length} · ${Date.now() - t0}ms`
  );
}
