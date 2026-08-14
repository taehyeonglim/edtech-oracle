/**
 * 확장 배치 지시서 생성기.
 *
 * 지시서를 커밋해 두면 "이 문장은 어떤 지시로 생성됐나"를 나중에 추적할 수 있다.
 * 배치는 대립축 상대가 같은 배치에 들어가지 않게 나눈다 — 한 인스턴스가 양쪽을
 * 쓰면 대립이 뭉개진다.
 */
import { mkdirSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { loadPages } from "./wiki-parse.mjs";

const PILOT = ["robert-gagne", "seymour-papert", "richard-mayer"];
const TASKS_DIR = ".codex-tasks";

const BATCHES = [
  ["albert-bandura", "charles-reigeluth", "jean-lave", "john-sweller", "richard-clark", "sidney-pressey"],
  ["allan-collins", "david-jonassen", "jean-piaget", "joseph-novak", "rita-richey", "thomas-gilbert"],
  ["ann-brown", "barbara-seels", "jeroen-van-merrienboer", "lev-vygotsky", "robert-glaser", "walter-dick"],
  ["david-merrill", "edgar-dale", "jerome-bruner", "marlene-scardamalia", "edward-thorndike"],
  ["benjamin-bloom", "robert-heinich", "john-dewey", "michael-g-moore", "robert-kozma"],
  ["bf-skinner", "etienne-wenger-trayner", "john-keller", "ralph-tyler", "robert-mager"],
];

const pages = loadPages("wiki/pioneers");
const bySlug = new Map(pages.map((p) => [p.fm.slug, p]));
const concepts = readdirSync("wiki/concepts")
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

// ── 무결성 점검: 누락·중복·대립축 충돌 ──────────────────────────────

const assigned = BATCHES.flat();
const expected = pages.map((p) => p.fm.slug).filter((s) => !PILOT.includes(s));
const missing = expected.filter((s) => !assigned.includes(s));
const extra = assigned.filter((s) => !expected.includes(s));
const dupes = assigned.filter((s, i) => assigned.indexOf(s) !== i);

if (missing.length || extra.length || dupes.length) {
  throw new Error(
    `배치 구성 오류 — 누락:[${missing}] 초과:[${extra}] 중복:[${dupes}]`,
  );
}

const debatesOf = (slug) =>
  (bySlug.get(slug).fm.related ?? []).map((r) => r.replace(/[[\]"]/g, "").replace("debates/", ""));

for (const [i, batch] of BATCHES.entries()) {
  const all = batch.flatMap(debatesOf);
  const clash = [...new Set(all.filter((d, j) => all.indexOf(d) !== j))];
  if (clash.length > 0) {
    throw new Error(`batch-${i + 1}에 대립축 양측이 함께 있다: ${clash.join(", ")}`);
  }
}

// ── 지시서 작성 ─────────────────────────────────────────────────────

const instruction = (batch) => `너는 edtech-oracle 저장소에서 교육공학 위인의 위키 페이지를 보강한다.

## 먼저 읽어라 (반드시)

1. \`CLAUDE.md\` — 위키 스키마 정본
2. \`wiki/pioneers/robert-gagne.md\` — 보강 완료본. **"## 당대의 비판"과 "## 한계" 두 섹션의 형식과 각주 밀도를 이대로 따른다**
3. \`sources.json\` — 인용 가능한 출처 전체 목록. 여기 없는 출처는 존재하지 않는다

## 담당 파일 (이 파일들만 수정한다)

${batch.map((s) => `- \`wiki/pioneers/${s}.md\``).join("\n")}

## 절대 수정 금지

\`wiki/index.md\`, \`wiki/log.md\`, \`wiki/router-map.md\`, \`wiki/KNOWN-ISSUES.md\`,
\`sources.json\`, \`wiki/sources/\`, \`wiki/debates/\`, \`wiki/concepts/\`,
다른 배치의 위인 페이지, \`scripts/\`, \`.claude/\`, \`CLAUDE.md\`

## 할 일 — 정확히 두 섹션을 추가한다

각 담당 파일의 \`## 연표\` **바로 앞**에 다음 두 섹션을 삽입한다. 기존 섹션은 건드리지 않는다.

### \`## 당대의 비판\`

이 위인의 이론에 대해 **당대 또는 이후의 다른 연구자가 실제로 제기한 반론**을 2~3문단으로 쓴다.
누가 무엇을 근거로 비판했는지 명시하고, 그 비판자의 출처를 각주로 단다.
이 위인의 \`## 대립축\` 섹션에 이미 나열된 상대들이 좋은 출발점이다.

### \`## 한계\`

이 이론이 **설명하지 못하는 것, 전제하고 있는 것, 오용되는 방식**을 2~3문단으로 쓴다.
비난이 아니라 적용 범위의 경계를 그리는 작업이다. 근거는 이 위인 자신의 저작이나
그 이론을 검토한 문헌에서 가져온다.

## 절대 규칙

1. \`sources.json\`에 **없는** 출처를 인용하지 않는다. 새 출처를 만들지 않는다. 서지를 지어내지 않는다
2. 새 각주를 쓸 때는 \`sources.json\`의 필드를 그대로 옮긴다:
   \`[^id]: authors. (year). title. publisher. DOI: doi. <url> — tier X · [[sources/id]]\`
   각주 정의는 파일 맨 아래 기존 각주 블록에 알파벳 순서로 끼워 넣는다
3. 프론트매터 \`sources\` 배열 = 본문 각주 정의 집합. **정확히 일치**해야 한다.
   새 각주를 추가했으면 프론트매터에도 추가한다 (알파벳 순)
4. 추가한 두 섹션 각각에 각주가 **최소 1개** 있어야 한다
5. 링크 가능한 개념 페이지는 다음이 전부다: ${concepts.map((c) => `\`[[concepts/${c}]]\``).join(", ")}.
   **다른 개념 페이지는 존재하지 않으므로 링크하지 않는다.** 새 개념이 필요하면
   프론트매터에 \`proposed_concepts: [이름1, 이름2]\`로 제안만 하고 링크는 만들지 않는다
6. 한 사람의 주장에는 **그 사람 자신의 출처만** 단다. 비판자의 주장에는 비판자의 출처를 단다.
   잘못된 귀속은 각주가 없는 것보다 나쁘다
7. 문헌에 근거가 없는 주장은 쓰지 않는다. 쓸 말이 없으면 문단을 줄인다.
   분량을 채우려고 추측하지 않는다
8. 한국어로 쓴다. 각주의 서지는 원문 표기를 유지한다

## 완료 기준

\`npm run lint:strict\`가 **오류 0건**으로 통과해야 한다. 직접 실행해 확인하고,
실패하면 원인을 고친 뒤 다시 실행한다. 통과할 때까지 끝내지 않는다.

마지막에 수정한 파일 목록과 각 파일에 새로 추가한 출처 id를 보고한다.
`;

mkdirSync(TASKS_DIR, { recursive: true });
for (const [i, batch] of BATCHES.entries()) {
  writeFileSync(join(TASKS_DIR, `batch-${i + 1}.md`), instruction(batch), "utf8");
}

console.log(
  `✅ 배치 ${BATCHES.length}개 (총 ${assigned.length}인) · 대립축 충돌 없음 · 링크 가능 개념 ${concepts.length}개`,
);
