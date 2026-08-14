import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  loadPages,
  footnoteDefs,
  footnoteRefs,
  stripFootnoteDefs,
  wikilinks,
  asDateString,
} from "../wiki-parse.mjs";
import { WIKI_DIRS } from "./urls.mjs";

/**
 * 위키를 읽어 사이트가 필요로 하는 모든 색인을 만든다.
 *
 * 파싱은 전부 `wiki-parse.mjs`에 위임한다. 사이트가 자체 정규식으로 각주·위키링크를 다시 파면
 * lint와 사이트가 서로 다른 진실을 갖게 되고, lint는 초록인데 사이트만 깨진 상태에서 원인이
 * 어느 쪽인지 알 수 없게 된다.
 */

/** 각주 정의줄의 엄격한 형식. `$` 앵커가 핵심이다 — 서지 제목 안에도 em dash가 있다. */
export const DEF_STRICT_RE =
  /^\[\^([^\]\s]+)\]:\s*(.+?)\s+—\s+tier\s+([ABC])\s+·\s+\[\[sources\/([^\]|]+)\]\]\s*$/;

/** `"[[debates/lave-collins]]"` → `"debates/lave-collins"`. */
export const unwrapWikilink = (s) =>
  String(s)
    .trim()
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .split("|")[0]
    .trim();

/**
 * `role` 문자열을 역할 원자로 쪼갠다.
 *
 * 구분자는 **띄어쓴** ` · `다. `/·/`로 자르면 `교육공학자 · 미디어·ICT 정책 연구자`가
 * `미디어`라는 유령 패싯을 만든다 — 붙은 가운뎃점은 토큰 내부의 접속사다.
 */
export const roleAtoms = (role = "") =>
  String(role)
    .split(/\s+·\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** 위키 디렉터리 구조를 검사한다. 화이트리스트 밖 디렉터리는 즉시 실패시킨다. */
export function assertWikiLayout(wikiDir) {
  const errs = [];
  for (const name of readdirSync(wikiDir)) {
    const p = join(wikiDir, name);
    if (statSync(p).isDirectory()) {
      if (!WIKI_DIRS.includes(name)) {
        // macOS 동기화 잔재(`sources 2/`)가 대표 사례다. 지금은 비어 있어 무해하지만
        // `.md`가 하나 떨어지면 `id: "sources 2/x"` 유령 페이지가 생기고, git이 빈
        // 디렉터리를 추적하지 않으므로 CI는 초록인 채 로컬에서만 터진다.
        errs.push(`위키에 알 수 없는 디렉터리: ${name}/ (허용: ${WIKI_DIRS.join(", ")})`);
      }
    } else if (name.endsWith(".md") && !/^[A-Za-z0-9._-]+\.md$/.test(name)) {
      errs.push(`파일명에 ASCII 밖 문자: ${name}`);
    }
  }
  for (const dir of WIKI_DIRS) {
    const p = join(wikiDir, dir);
    // 네 디렉터리가 전부 있어야 하는 것은 아니다 — 아직 개념 페이지가 없는 위키도 정당하다.
    let names;
    try {
      names = readdirSync(p);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!/^[A-Za-z0-9._-]+\.md$/.test(name)) {
        // CLAUDE.md의 "개념 파일명은 ASCII 슬러그" 규칙을 기계로 강제한다.
        // 한글 파일명은 macOS가 NFD로 저장하고 브라우저는 NFC로 요청해 조용한 404가 된다.
        errs.push(`파일명에 ASCII 밖 문자: ${dir}/${name}`);
      }
    }
  }
  return errs;
}

/**
 * 각주 정의 → `{label, tier, sourceId}`. 형식을 벗어난 줄은 `bad`에 담는다.
 * 여러 줄 정의는 코퍼스에 0건이라 줄 단위로 본다.
 */
export function parseDefLines(body) {
  const ok = [];
  const bad = [];
  for (const line of body.split("\n")) {
    if (!/^\[\^[^\]\s]+\]:/.test(line)) continue;
    const m = DEF_STRICT_RE.exec(line);
    if (m) ok.push({ label: m[1], biblio: m[2], tier: m[3], sourceId: m[4] });
    else bad.push(line.trim());
  }
  return { ok, bad };
}

/**
 * 출처별 인용 색인. 사이트가 `wiki/sources/`의 막다른 골목을 여는 유일한 수단이다 —
 * 출처 페이지 140개는 `related`가 하나도 없어서 이것 없이는 나가는 길이 없다.
 */
export function buildCitations(pages) {
  const m = new Map();
  for (const p of pages) {
    const refs = footnoteRefs(p.body);
    for (const sid of new Set(footnoteDefs(p.body))) {
      // 모든 출처 페이지는 스키마상 자기 자신을 인용한다. 걸러내지 않으면
      // 140개 전부가 "이 출처를 인용한 페이지: 자기 자신"을 보여준다.
      if (p.id === `sources/${sid}`) continue;
      if (!m.has(sid)) m.set(sid, []);
      m.get(sid).push({
        pageId: p.id,
        title: p.fm.title ?? p.id,
        type: p.fm.type ?? "",
        count: refs.filter((r) => r === sid).length,
      });
    }
  }
  for (const list of m.values()) {
    list.sort((a, b) => b.count - a.count || a.pageId.localeCompare(b.pageId));
  }
  return m;
}

/**
 * 본문 산문의 위키링크 역색인. 각주 정의는 제외한다 — 그건 전부 출처를 향하고
 * `buildCitations`가 더 풍부하게(횟수 포함) 다룬다.
 */
export function buildBacklinks(pages) {
  const m = new Map();
  const add = (to, entry) => {
    if (!m.has(to)) m.set(to, []);
    const list = m.get(to);
    if (!list.some((e) => e.from === entry.from)) list.push(entry);
  };
  for (const p of pages) {
    const entry = { from: p.id, title: p.fm.title ?? p.id, type: p.fm.type ?? "" };
    const targets = new Set([
      ...wikilinks(stripFootnoteDefs(p.body)),
      ...(Array.isArray(p.fm.related) ? p.fm.related.map(unwrapWikilink) : []),
    ]);
    for (const t of targets) {
      if (t && t !== p.id) add(t, entry);
    }
  }
  for (const list of m.values()) list.sort((a, b) => a.from.localeCompare(b.from));
  return m;
}

/**
 * 대립축 엣지. 양끝은 `related`에서만 읽는다 — 슬러그 순서가 `related` 순서와 어긋나는
 * 사례가 실재하고(`jonassen-papert`, `moore-dick`, `scardamalia-papert`), 슬러그는 성(姓)이라
 * 페이지 id로 매핑도 필요하다. 슬러그를 파싱하면 조용히 반대로 그린다.
 */
export function buildEdges(pages) {
  return pages
    .filter((p) => p.fm.type === "debate")
    .map((p) => {
      const ends = (p.fm.related ?? []).map(unwrapWikilink);
      return { id: p.id, title: p.fm.title ?? p.id, a: ends[0], b: ends[1], ends };
    })
    .sort((x, y) => x.id.localeCompare(y.id));
}

/** 개념 → 위인은 단방향이다. 위인 페이지에서 개념을 보려면 역색인이 필요하다. */
export function buildConceptLinks(pages) {
  const m = new Map();
  for (const p of pages) {
    if (p.fm.type !== "concept") continue;
    for (const t of (p.fm.related ?? []).map(unwrapWikilink)) {
      if (!m.has(t)) m.set(t, []);
      m.get(t).push({ id: p.id, title: p.fm.title ?? p.id });
    }
  }
  return m;
}

export function collect({ wikiDir, sourcesPath }) {
  const layoutErrors = assertWikiLayout(wikiDir);
  const pages = loadPages(wikiDir).sort((a, b) => a.id.localeCompare(b.id));
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));

  const byId = new Map(pages.map((p) => [p.id, p]));
  const byType = new Map();
  for (const p of pages) {
    const t = p.fm.type ?? "";
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t).push(p);
  }
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const citations = buildCitations(pages);
  const backlinks = buildBacklinks(pages);
  const edges = buildEdges(pages);
  const conceptLinks = buildConceptLinks(pages);

  const roleFacets = new Map();
  for (const p of byType.get("pioneer") ?? []) {
    for (const atom of roleAtoms(p.fm.role)) {
      if (!roleFacets.has(atom)) roleFacets.set(atom, []);
      roleFacets.get(atom).push(p.id);
    }
  }

  const tierCounts = { A: 0, B: 0, C: 0 };
  for (const s of sources) if (tierCounts[s.tier] !== undefined) tierCounts[s.tier] += 1;

  const warnings = [];
  const pageIds = new Set(pages.map((p) => p.id));
  for (const s of sources) {
    if (!pageIds.has(`sources/${s.id}`)) {
      warnings.push(`sources.json에 있으나 위키 페이지 없음: ${s.id}`);
    }
  }

  return {
    pages,
    byId,
    byType,
    sources,
    sourceById,
    citations,
    backlinks,
    edges,
    conceptLinks,
    roleFacets,
    tierCounts,
    warnings,
    layoutErrors,
    updated: asDateString(byId.get("index")?.fm?.updated) || "",
  };
}

/**
 * lint 8규칙이 보지 못하는 불변식. 전부 현재 코퍼스가 통과하는 값이므로
 * 지금 무료로 얻고 영구히 회귀를 막는다.
 */
export function assertSiteInvariants(model) {
  const errors = [...model.layoutErrors];

  for (const p of model.pages) {
    const { ok, bad } = parseDefLines(p.body);

    for (const line of bad) {
      errors.push(`${p.id}: 각주 정의 형식 위반 — ${line.slice(0, 90)}`);
    }
    for (const d of ok) {
      // 각주 label과 꼬리 링크의 출처 id가 다르면 각주가 다른 출처를 가리킨다.
      if (d.label !== d.sourceId) {
        errors.push(`${p.id}: 각주 [^${d.label}]의 링크가 sources/${d.sourceId}를 가리킴`);
      }
      const src = model.sourceById.get(d.label);
      if (!src) {
        errors.push(`${p.id}: 각주 [^${d.label}]가 sources.json에 없음`);
      } else if (src.tier !== d.tier) {
        // 위키 본문의 티어 표기와 레지스트리가 어긋나면 사이트가 거짓말을 하게 된다.
        errors.push(
          `${p.id}: 각주 [^${d.label}]의 티어 불일치 — 본문 ${d.tier} vs sources.json ${src.tier}`
        );
      }
    }
  }

  for (const e of model.edges) {
    if (e.ends.length !== 2) {
      errors.push(`${e.id}: debate의 related가 2개가 아님 (${e.ends.length}개)`);
    }
    for (const end of e.ends) {
      if (!model.byId.has(end)) errors.push(`${e.id}: related 대상 없음 — ${end}`);
    }
  }

  return errors;
}
