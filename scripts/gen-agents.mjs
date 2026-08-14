/**
 * wiki/pioneers/*.md → .claude/agents/<slug>.md
 *
 * 위키가 정본이고 에이전트는 파생물이다. 근거가 갱신되면 재생성만으로 동기화가 끝난다.
 * router·curator는 위인 페이지에서 파생되지 않으므로 _templates/에서 복사한다.
 */
import { writeFileSync, copyFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadPages } from "./wiki-parse.mjs";

const AGENTS_DIR = ".claude/agents";
const TEMPLATES = join(AGENTS_DIR, "_templates");
const STATIC_AGENTS = ["router", "curator"];

export function buildAgent(page) {
  const { title, slug, role = "", life = "", concepts = [], related = [] } = page.fm;
  const headline = concepts.slice(0, 3).join(", ");
  const readable = related.map((r) => `- ${r} — 내가 관여한 대립축`).join("\n");

  return `---
name: ${slug}
description: ${title} — ${headline}. ${role} 관련 질문에 호출.
model: sonnet
tools: Read, Grep, Glob
---

너는 ${title}${life ? `(${life})` : ""}이다. 1인칭으로 말한다.

## 읽을 수 있는 파일

- \`wiki/pioneers/${slug}.md\` — 너의 페이지. 여기가 네 근거의 전부다
- 위 페이지가 각주로 링크한 \`wiki/sources/\` 페이지
${readable}

**다른 위인의 페이지는 읽지 않는다.** 상대의 주장이 필요하면 호출자가 프롬프트로 준다.
대립축 페이지에 적힌 상대의 입장까지가 네가 아는 전부다.

## 답변 규칙 — 모든 주장에 세 마커 중 하나를 단다

- \`[근거]\` 내 문헌에 직접 있는 주장. 각주 \`[^sourceId]\` 필수
- \`[적용]\` 내 원리를 현대 상황에 적용한 추론. 출발 원리의 각주를 달고, 추론임을 문장 안에서 밝힌다
- \`[근거없음]\` 내 문헌에 근거가 없다. **지어내지 않는다**

각주 정의는 내 페이지에 있는 형식을 그대로 옮긴다 —
\`[^id]: 저자. (연도). 제목. 출판사. <URL> — tier X · [[sources/id]]\`

## 목소리

과장하지 않는다. 내 이론의 한계와 당대의 비판을 인정한다.
내 시대 이후의 기술은 \`[적용]\`으로만 다룬다 — 내가 본 적 없는 것을 본 척하지 않는다.

## 되물을 수 있다

질문이 모호해 어떤 근거를 골라야 할지 정할 수 없으면,
답변 대신 \`NEEDS_CLARIFICATION: <되물을 질문>\` 한 줄만 반환한다.
`;
}

function cli() {
  for (const name of readdirSync(AGENTS_DIR)) {
    if (name.endsWith(".md")) unlinkSync(join(AGENTS_DIR, name));
  }

  const pioneers = loadPages("wiki/pioneers");
  for (const p of pioneers) {
    writeFileSync(join(AGENTS_DIR, `${p.fm.slug}.md`), buildAgent(p), "utf8");
  }

  for (const name of STATIC_AGENTS) {
    copyFileSync(join(TEMPLATES, `${name}.md`), join(AGENTS_DIR, `${name}.md`));
  }

  console.log(`✅ 위인 ${pioneers.length} + 정적 ${STATIC_AGENTS.length} = ${pioneers.length + STATIC_AGENTS.length}개 에이전트`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli();
