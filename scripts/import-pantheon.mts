/**
 * pantheon(TypeScript 데이터) → 오라클 위키(마크다운).
 *
 * 이 스크립트가 정본이다. lint 위반이 나오면 위키를 손으로 고치지 말고
 * 여기를 고친 뒤 다시 실행한다.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PANTHEON = resolve(process.env.PANTHEON_PATH ?? "../edtech-pantheon");
const DATA = join(PANTHEON, "src/data");
const TODAY = "2026-08-14";
const WIKI = "wiki";

const load = (name: string) => import(pathToFileURL(join(DATA, name)).href);

const { pioneers } = await load("pioneers.ts");
const { sources } = await load("sources.ts");
const { relationships } = await load("relationships.ts");
const { biographies } = await load("biographies.ts");

type Source = {
  id: string; tier: "A" | "B" | "C"; authors: string; title: string;
  year?: string; publisher?: string; details?: string; url: string; doi?: string;
};

const sourceById = new Map<string, Source>(sources.map((s: Source) => [s.id, s]));
const slugById = new Map<string, string>(pioneers.map((p: any) => [p.id, p.slug]));
const nameById = new Map<string, string>(pioneers.map((p: any) => [p.id, p.nameKo]));
const thesisById = new Map<string, string>(pioneers.map((p: any) => [p.id, p.thesis]));

/** 위키가 실제로 인용한 출처. 출처 페이지는 이 집합에 든 것만 만든다. */
const cited = new Set<string>();

/*
 * 임포터는 일회성 부트스트랩이다. 이관이 끝나면 위키가 정본이 된다.
 *
 * 파일럿 심화와 33인 확장은 위인 페이지를 직접 고치므로, 가드 없이 재실행하면
 * 그 작업이 통째로 사라진다. 경계를 문서로만 적으면 지켜지지 않으므로 코드로 막는다.
 */
const force = process.argv.includes("--force");
const existingPioneers = existsSync(join(WIKI, "pioneers"))
  ? readdirSync(join(WIKI, "pioneers")).filter((f) => f.endsWith(".md"))
  : [];

if (existingPioneers.length > 0 && !force) {
  console.error(
    `✋ 위인 페이지가 이미 ${existingPioneers.length}개 있다. 임포터는 일회성 부트스트랩이며\n` +
      `   이관 이후에는 위키가 정본이다. 재실행하면 심화·확장 작업이 사라진다.\n` +
      `   정말 처음부터 다시 만들려면 --force를 붙인다.`,
  );
  process.exit(1);
}

// 재실행 시 이름이 바뀐 옛 페이지가 남아 고아가 되지 않게 생성 대상 디렉터리를 비운다.
for (const dir of ["pioneers", "debates", "concepts", "sources"]) {
  rmSync(join(WIKI, dir), { recursive: true, force: true });
}

const TIER_NOTE: Record<string, string> = {
  A: "원저작·당사자 기록·원문 아카이브",
  B: "피어리뷰 논문·학술서·학회·대학 공식 기록",
  C: "백과·일반 참고 자료 — 단독 근거로 쓰지 않는다",
};

/** 개념 파일명은 ASCII로 고정한다. macOS의 NFD/NFC 차이로 git이 한글 파일명을 흔드는 것을 피한다. */
const CONCEPT_SLUGS: Record<string, string> = {
  "교수기계": "teaching-machine",
  "수행 격차": "performance-gap",
  "실천공동체": "community-of-practice",
};

// ── 렌더링 원시 함수 ────────────────────────────────────────────────

/** 각주 참조 마커. 인용한 id를 기록한다. */
function ref(ids: string[], used: Set<string>): string {
  const valid = ids.filter((id) => sourceById.has(id));
  for (const id of valid) {
    used.add(id);
    cited.add(id);
  }
  return valid.map((id) => `[^${id}]`).join("");
}

/** 각주 정의 한 줄. 반드시 `— tier X · [[sources/id]]`로 끝난다. */
function definition(id: string): string {
  const s = sourceById.get(id)!;
  const bits = [s.authors, s.year ? `(${s.year})` : null, s.title, s.publisher, s.details]
    .filter(Boolean)
    .join(". ");
  const doi = s.doi ? ` DOI: ${s.doi}.` : "";
  return `[^${id}]: ${bits}.${doi} <${s.url}> — tier ${s.tier} · [[sources/${id}]]`;
}

function frontmatter(fm: Record<string, unknown>): string {
  const lines = Object.entries(fm)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => (Array.isArray(v) ? `${k}: [${v.join(", ")}]` : `${k}: ${v}`));
  return ["---", ...lines, "---"].join("\n");
}

/** 프론트매터 값에 콜론·대괄호가 있으면 YAML이 깨진다. 인용부호로 감싼다. */
const q = (v: string) => (/[:#[\]{}",]/.test(v) ? `"${v.replace(/"/g, "'")}"` : v);

// confidence는 여기서 정하지 않는다. 섹션 최약 근거로 계산하는 값이라 본문이 완성된 뒤에야
// 알 수 있다. 파이프라인은 import → npm run sync:confidence → npm run lint:strict 순서다.

function write(relPath: string, body: string) {
  const abs = join(WIKI, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, body.endsWith("\n") ? body : `${body}\n`, "utf8");
}

/** 본문 + 사용된 출처 → 각주 정의 블록이 붙은 완성 페이지. */
function page(fm: Record<string, unknown>, sectionText: string, used: Set<string>): string {
  const ids = [...used].sort();
  const defs = ids.map(definition).join("\n");
  return `${frontmatter({ ...fm, sources: ids })}\n\n${sectionText.trim()}\n\n${defs}\n`;
}

// ── 위인 페이지 ─────────────────────────────────────────────────────

const debatesByPioneer = new Map<string, any[]>();
for (const r of relationships.filter((r: any) => r.layer === "comparison")) {
  for (const side of [r.source, r.target]) {
    debatesByPioneer.set(side, [...(debatesByPioneer.get(side) ?? []), r]);
  }
}

for (const p of pioneers) {
  const used = new Set<string>();
  const parts: string[] = [];

  parts.push(
    `## 핵심 명제\n\n${p.thesis}${ref(p.sourceIds, used)}\n\n${p.summary}${ref(p.sourceIds, used)}` +
      (p.quote ? `\n\n> ${p.quote}${ref([p.quoteSourceId].filter(Boolean), used)}` : ""),
  );

  const works = p.works ?? [];
  if (works.length > 0) {
    const items = works
      .map((w: any) => `- **${w.title}** (${w.year}) — ${w.note}${ref(w.sourceIds, used)}`)
      .join("\n");
    parts.push(`## 주요 저작\n\n${items}`);
  }

  for (const s of p.sections ?? []) {
    parts.push(`## ${s.title}\n\n${s.body}${ref(s.sourceIds.length ? s.sourceIds : p.sourceIds, used)}`);
  }

  for (const b of biographies[p.id] ?? []) {
    parts.push(`## ${b.title}\n\n${b.body}${ref(b.sourceIds.length ? b.sourceIds : p.sourceIds, used)}`);
  }

  const timeline = p.timeline ?? [];
  if (timeline.length > 0) {
    const items = timeline
      .map(
        (t: any) =>
          `- **${t.year}** ${t.label} — ${t.description}${ref(t.sourceIds.length ? t.sourceIds : p.sourceIds, used)}`,
      )
      .join("\n");
    parts.push(`## 연표\n\n${items}`);
  }

  const myDebates = debatesByPioneer.get(p.id) ?? [];
  const related: string[] = [];
  if (myDebates.length > 0) {
    const items = myDebates
      .map((r: any) => {
        related.push(`"[[debates/${r.id}]]"`);
        const otherId = r.source === p.id ? r.target : r.source;
        return `- [[debates/${r.id}]] — ${r.label} (상대: ${nameById.get(otherId)})${ref(r.sourceIds, used)}`;
      })
      .join("\n");
    parts.push(`## 대립축\n\n${items}`);
  }

  write(
    `pioneers/${p.slug}.md`,
    page(
      {
        title: q(p.nameKo),
        type: "pioneer",
        slug: p.slug,
        role: q(p.role),
        life: q(p.life),
        concepts: (p.concepts ?? []).map(q),
        related,
        updated: TODAY,
      },
      parts.join("\n\n"),
      used,
    ),
  );
}

// ── 논쟁 페이지 ─────────────────────────────────────────────────────

const sourceIdsById = new Map<string, string[]>(pioneers.map((p: any) => [p.id, p.sourceIds]));

/**
 * 한 위인의 주장에는 그 위인 자신의 출처만 단다.
 * 관계의 sourceIds를 양쪽에 그대로 붙이면 클라크의 주장에 코즈마 논문이 달린다 —
 * 근거 기반 시스템에서 잘못된 귀속은 각주가 없는 것보다 나쁘다.
 */
function ownSources(pioneerId: string, relationSourceIds: string[]): string[] {
  const mine = sourceIdsById.get(pioneerId) ?? [];
  const shared = mine.filter((id) => relationSourceIds.includes(id));
  return shared.length > 0 ? shared : mine;
}

const comparisons = relationships.filter((r: any) => r.layer === "comparison");
for (const r of comparisons) {
  const used = new Set<string>();
  const a = slugById.get(r.source)!;
  const b = slugById.get(r.target)!;
  const body = [
    `## 쟁점\n\n${r.description}${ref(r.sourceIds, used)}`,
    `## 양측\n\n` +
      `- [[pioneers/${a}]] ${nameById.get(r.source)} — ${thesisById.get(r.source)}${ref(ownSources(r.source, r.sourceIds), used)}\n` +
      `- [[pioneers/${b}]] ${nameById.get(r.target)} — ${thesisById.get(r.target)}${ref(ownSources(r.target, r.sourceIds), used)}`,
    `## 근거의 성격\n\n` +
      `pantheon은 이 관계를 \`${r.confidence}\` 수준으로 기록한다. 유형은 ${r.type}이다${ref(r.sourceIds, used)}.`,
  ].join("\n\n");

  write(
    `debates/${r.id}.md`,
    page(
      {
        title: q(r.label),
        type: "debate",
        related: [`"[[pioneers/${a}]]"`, `"[[pioneers/${b}]]"`],
        updated: TODAY,
      },
      body,
      used,
    ),
  );
}

// ── 개념 페이지 (공유되는 것만) ──────────────────────────────────────

const conceptOwners = new Map<string, any[]>();
for (const p of pioneers) {
  for (const c of p.concepts ?? []) {
    conceptOwners.set(c, [...(conceptOwners.get(c) ?? []), p]);
  }
}

const sharedConcepts = [...conceptOwners].filter(([, owners]) => owners.length >= 2);
for (const [name, owners] of sharedConcepts) {
  const slug = CONCEPT_SLUGS[name];
  if (!slug) {
    throw new Error(
      `개념 '${name}'의 ASCII 슬러그가 CONCEPT_SLUGS에 없다. 한글 파일명은 만들지 않는다.`,
    );
  }
  const used = new Set<string>();
  const items = owners
    .map((p: any) => `- [[pioneers/${p.slug}]] ${p.nameKo} — ${p.thesis}${ref(p.sourceIds, used)}`)
    .join("\n");
  const body = [
    `## 이 개념을 공유하는 위인\n\n${items}`,
    `## 상태\n\n정본 정의는 아직 작성되지 않았다. 현재는 이 개념을 공유하는 위인들의 입장만 모아 둔다${ref(
      owners[0].sourceIds,
      used,
    )}.`,
  ].join("\n\n");

  write(
    `concepts/${slug}.md`,
    page(
      {
        title: q(name),
        type: "concept",
        related: owners.map((p: any) => `"[[pioneers/${p.slug}]]"`),
        updated: TODAY,
      },
      body,
      used,
    ),
  );
}

// ── 출처 페이지 (실제 인용된 것만) ───────────────────────────────────

const citedIds = [...cited].sort();
for (const id of citedIds) {
  const s = sourceById.get(id)!;
  const used = new Set<string>();
  const bits = [s.authors, s.year ? `(${s.year})` : null, s.title, s.publisher, s.details]
    .filter(Boolean)
    .join(". ");
  const body = [
    `## 서지\n\n${bits}. <${s.url}>${s.doi ? ` DOI: ${s.doi}.` : ""}${ref([id], used)}`,
    `## 티어\n\n**${s.tier}** — ${TIER_NOTE[s.tier]}${ref([id], used)}`,
  ].join("\n\n");

  write(
    `sources/${id}.md`,
    page({ title: q(s.title), type: "source", updated: TODAY }, body, used),
  );
}

const uncited = sources.filter((s: Source) => !cited.has(s.id));
for (const s of uncited) console.warn(`⚠ 미인용 출처(페이지 생성 안 함): ${s.id} — ${s.title}`);

// ── meta 페이지 ─────────────────────────────────────────────────────

const link = (id: string, label: string) => `- [[${id}]] — ${label}`;

const indexBody = [
  "## 이 위키에 대하여",
  "",
  "교육공학 위인들이 근거를 인용하며 답하기 위한 근거 DB다. 스키마는 `CLAUDE.md`를 따른다.",
  "",
  "## 운영 문서",
  "",
  link("log", "위키 변경 기록"),
  link("router-map", "질문 → 위인 매핑표"),
  link("KNOWN-ISSUES", "pantheon에서 물려받은 알려진 결함"),
  "",
  `## 위인 (${pioneers.length})`,
  "",
  ...pioneers.map((p: any) => link(`pioneers/${p.slug}`, `${p.nameKo} — ${p.role}`)),
  "",
  `## 대립축 (${comparisons.length})`,
  "",
  ...comparisons.map((r: any) => link(`debates/${r.id}`, r.label)),
  "",
  `## 개념 (${sharedConcepts.length})`,
  "",
  ...sharedConcepts.map(([name]) => link(`concepts/${CONCEPT_SLUGS[name]}`, name)),
  "",
  `## 출처 (${citedIds.length})`,
  "",
  "출처 페이지는 각 위인·논쟁 페이지의 각주에서 도달한다. 전체 목록은 `sources.json`에 있다.",
].join("\n");

write("index.md", `${frontmatter({ title: "색인", type: "meta", updated: TODAY })}\n\n${indexBody}\n`);

write(
  "log.md",
  `${frontmatter({ title: "변경 기록", type: "meta", updated: TODAY })}\n\n` +
    `## ${TODAY} — pantheon 이관\n\n` +
    `edtech-pantheon에서 위인 ${pioneers.length}명, 대립축 ${comparisons.length}개, ` +
    `공유 개념 ${sharedConcepts.length}개, 인용 출처 ${citedIds.length}건을 이관했다. ` +
    `출처 레지스트리는 ${sources.length}건 전체를 담았다.\n`,
);

const routerRows = pioneers
  .map((p: any) => `| ${p.nameKo} | \`${p.slug}\` | ${(p.domains ?? []).join(", ")} | ${(p.concepts ?? []).join(", ")} |`)
  .join("\n");

write(
  "router-map.md",
  `${frontmatter({ title: "라우팅 맵", type: "meta", updated: TODAY })}\n\n` +
    `## 위인 → 담당 영역\n\n` +
    `질문의 주제어를 아래 영역·개념과 대조해 위인을 1~3명 고른다.\n\n` +
    `| 위인 | slug | 영역 | 개념 |\n|---|---|---|---|\n${routerRows}\n\n` +
    `## 대립축 → 참가자\n\n` +
    `토론 주제가 아래 대립축에 걸리면 양측을 함께 부른다.\n\n` +
    `| 대립축 | 참가자 |\n|---|---|\n` +
    comparisons
      .map((r: any) => `| [[debates/${r.id}]] ${r.label} | ${nameById.get(r.source)} · ${nameById.get(r.target)} |`)
      .join("\n") +
    "\n",
);

write(
  "KNOWN-ISSUES.md",
  `${frontmatter({ title: "알려진 결함", type: "meta", updated: TODAY })}\n\n` +
    `edtech-pantheon README가 공개한 P1 이슈를 그대로 물려받았다. 데이터는 스펙대로 이관했으나,\n` +
    `근거를 인용해 말하는 시스템에서 알려진 오류를 무표시로 두면 그대로 "근거 있는 주장"이 된다.\n\n` +
    `## 1. Ann L. Brown / John Seely Brown 혼동\n\n` +
    `\`brown-collins\` 관계 서술이 잘못된 저자에 귀속되어 있다. 인지적 도제의 실제 저자는\n` +
    `Allan Collins, John Seely Brown, Susan Newman이다. 관계를 삭제하거나 Ann Brown–Collins의\n` +
    `설계연구 비교로 다시 근거화해야 한다.\n\n` +
    `## 2. 관계 근거의 추적성 부족\n\n` +
    `관계가 내부 출처 ID만 갖고 페이지·DOI·접근일 메타데이터가 불완전하다.\n\n` +
    `## 3. 초상 이미지 권리\n\n` +
    `36장 중 명확한 퍼블릭 도메인·CC 근거가 확인된 것은 14장이다. 디스코드 프로필 이미지가\n` +
    `필요한 단계에서 나머지 22장은 이니셜 대체 이미지를 쓴다.\n\n` +
    `## 4. 서지·연표의 직접 근거 부족\n\n` +
    `일부 연도·제목이 DOI 메타데이터와 불일치한다. Bloom, Gagné, Bruner, Merrill, Keller,\n` +
    `Papert의 일부 연표 사건은 사건보다 오래된 자료만 연결되어 있다.\n\n` +
    `## 5. 전기의 C 티어 의존\n\n` +
    `다수 인물의 생애 서술이 Wikipedia 등 C 티어 자료에 의존한다. 해당 페이지는\n` +
    `\`confidence: low\`로 표시되며 A·B 티어 전거로 교체해야 한다.\n`,
);

// ── 출처 레지스트리 ─────────────────────────────────────────────────

writeFileSync("sources.json", `${JSON.stringify(sources, null, 2)}\n`, "utf8");

console.log(
  `✅ 위인 ${pioneers.length} · 대립축 ${comparisons.length} · 개념 ${sharedConcepts.length} · ` +
    `출처 페이지 ${citedIds.length} · sources.json ${sources.length}`,
);
