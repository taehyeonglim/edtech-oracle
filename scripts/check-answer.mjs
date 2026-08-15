import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import { loadPages, footnoteRefs, stripFootnoteDefs, asDateString } from "./wiki-parse.mjs";

/** 사회자 발언. 위인이 아니므로 인용 범위(규칙 3)와 마커(규칙 9~11)의 대상이 아니다. */
export const ORCHESTRATOR = "_orchestrator";

const MARKERS = ["근거없음", "근거", "적용"];
const MARKER_RE = new RegExp(`^\\[(${MARKERS.join("|")})\\]`);
/** CLAUDE.md의 각주 정의 형식. 이 꼬리가 없으면 출처 페이지가 고아가 된다. */
const DEF_TAIL_RE = /—\s*tier\s+([ABC])\s*·\s*\[\[sources\/([^\]|]+?)\s*\]\]$/;
const DEF_LINE_RE = /^\[\^([^\]\s]+)\]:/;
/** 마커를 요구하지 않는 블록. 인용문·목록·표와 되묻기 신호. */
const SKIP_PARA_RE = /^(>|[-*]\s|\d+\.\s|\||NEEDS_CLARIFICATION)/;

const forge = (rule, speaker, message) => ({ rule, severity: "forge", speaker, message });
const form = (rule, speaker, message) => ({ rule, severity: "form", speaker, message });

/** `## <화자>`로 본문을 자른다. sections()와 달리 각주 정의를 남긴다 — 규칙 4·8이 정의 줄을 본다. */
export function speakerSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split("\n")) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      cur = { speaker: m[1].trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return out.map((s) => ({ speaker: s.speaker, text: s.lines.join("\n") }));
}

/** 각주 정의 블록(정의 줄 + 들여쓴 연속 줄)을 id와 함께 통째로 꺼낸다. */
export function footnoteBlocks(text) {
  const out = [];
  let cur = null;
  for (const line of text.split("\n")) {
    const m = DEF_LINE_RE.exec(line);
    if (m) {
      cur = { id: m[1], lines: [line] };
      out.push(cur);
      continue;
    }
    if (cur && (/^\s+\S/.test(line) || line.trim() === "")) {
      cur.lines.push(line);
      continue;
    }
    cur = null;
  }
  return out.map((b) => ({ id: b.id, text: b.lines.join(" ").replace(/\s+/g, " ").trim() }));
}

const paragraphs = (text) =>
  stripFootnoteDefs(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** 위키와 sources.json을 한 번만 읽는다. 러너가 파일마다 다시 읽지 않게 분리했다. */
export function loadAnswerContext({ wikiDir = "wiki", sourcesPath = "sources.json" } = {}) {
  const sources = JSON.parse(readFileSync(sourcesPath, "utf8"));
  const pioneerSources = new Map();
  for (const p of loadPages(wikiDir)) {
    if (p.fm.type !== "pioneer" || !p.fm.slug) continue;
    pioneerSources.set(p.fm.slug, new Set(Array.isArray(p.fm.sources) ? p.fm.sources : []));
  }
  return { sourceById: new Map(sources.map((s) => [s.id, s])), pioneerSources };
}

export function checkAnswer({ file, wikiDir, sourcesPath, ctx }) {
  const { sourceById, pioneerSources } = ctx ?? loadAnswerContext({ wikiDir, sourcesPath });
  const { data: fm, content: body } = matter(readFileSync(file, "utf8"));
  const findings = [];
  const markers = { 근거: 0, 적용: 0, 근거없음: 0 };
  const seenSpeakers = new Set();

  for (const { speaker, text } of speakerSections(body)) {
    const isOrchestrator = speaker === ORCHESTRATOR;
    const known = pioneerSources.has(speaker);
    if (!isOrchestrator) seenSpeakers.add(speaker);
    if (!isOrchestrator && !known) {
      findings.push(forge(5, speaker, `위인 slug이 아니다: ${speaker}`));
    }

    const blocks = footnoteBlocks(text);
    const defIds = new Set(blocks.map((b) => b.id));
    const refIds = new Set(footnoteRefs(text));

    for (const ref of refIds) {
      if (!defIds.has(ref)) findings.push(forge(1, speaker, `정의되지 않은 각주 참조: [^${ref}]`));
    }

    if (isOrchestrator) {
      // 사회자가 각주를 달면 그건 위인 발언의 합성이다. 커맨드의 "요약하지 않는다"를 기계로 강제한다.
      for (const id of new Set([...refIds, ...defIds])) {
        findings.push(forge(7, speaker, `사회자 섹션은 각주를 쓸 수 없다: [^${id}]`));
      }
    }

    for (const id of new Set([...refIds, ...defIds])) {
      if (!sourceById.has(id)) {
        findings.push(forge(2, speaker, `sources.json에 없는 출처: [^${id}]`));
      } else if (!isOrchestrator && known && !pioneerSources.get(speaker).has(id)) {
        findings.push(forge(3, speaker, `${speaker}의 페이지에 없는 출처를 인용했다: [^${id}]`));
      }
    }

    for (const block of blocks) {
      const m = DEF_TAIL_RE.exec(block.text);
      if (!m) {
        findings.push(form(8, speaker, `각주 정의가 tier·출처 링크로 끝나지 않는다: [^${block.id}]`));
        continue;
      }
      const [, tier, linked] = m;
      if (linked !== block.id) {
        findings.push(form(8, speaker, `각주 id와 출처 링크가 다르다: [^${block.id}] → ${linked}`));
      }
      const declared = sourceById.get(block.id)?.tier;
      if (declared && tier !== declared) {
        findings.push(forge(4, speaker, `티어 표기 불일치: [^${block.id}]는 ${declared}인데 ${tier}로 적혔다`));
      }
    }

    if (isOrchestrator) continue;

    for (const para of paragraphs(text)) {
      if (SKIP_PARA_RE.test(para)) continue;
      const m = MARKER_RE.exec(para);
      if (!m) {
        findings.push(form(9, speaker, `마커 없는 문단: ${para.slice(0, 24)}…`));
        continue;
      }
      markers[m[1]] += 1;
      const hasRef = footnoteRefs(para).length > 0;
      if (m[1] === "근거" && !hasRef) {
        findings.push(form(10, speaker, `[근거]인데 각주가 없다: ${para.slice(0, 24)}…`));
      }
      if (m[1] === "근거없음" && hasRef) {
        findings.push(form(11, speaker, `[근거없음]인데 각주를 달았다: ${para.slice(0, 24)}…`));
      }
    }
  }

  const declaredSpeakers = new Set(Array.isArray(fm.speakers) ? fm.speakers : []);
  for (const s of seenSpeakers) {
    if (!declaredSpeakers.has(s)) {
      findings.push(forge(6, s, `본문에 있으나 프론트매터 speakers에 없다: ${s}`));
    }
  }
  for (const s of declaredSpeakers) {
    if (!seenSpeakers.has(s)) {
      findings.push(forge(6, s, `프론트매터 speakers에 있으나 본문에 없다: ${s}`));
    }
  }
  if (seenSpeakers.size === 0 && declaredSpeakers.size === 0) {
    findings.push(forge(6, "", "화자 섹션이 없다. 발언을 위인에게 귀속할 수 없다"));
  }

  return { findings, markers };
}

/** 검사 결과를 프론트매터에 남긴다. 편의 기록일 뿐 게이트는 이 값을 믿지 않고 본문에서 다시 센다. */
export function writeCheckBlock(file, { findings, markers }) {
  const { data, content } = matter(readFileSync(file, "utf8"));
  // YAML이 따옴표 없는 날짜를 Date로 파싱한다. 그대로 되쓰면 asked가 ISO 타임스탬프로 흘러간다.
  if (data.asked !== undefined) data.asked = asDateString(data.asked);
  const forgeCount = findings.filter((f) => f.severity === "forge").length;
  data.check = {
    status: findings.length === 0 ? "pass" : "violations",
    forge: forgeCount,
    form: findings.length - forgeCount,
    markers,
  };
  writeFileSync(file, matter.stringify(content, data), "utf8");
}

export function formatFindings(findings) {
  return findings
    .slice()
    .sort((a, b) => a.rule - b.rule || String(a.speaker).localeCompare(String(b.speaker)))
    .map((f) => {
      const tag = f.severity === "forge" ? "위조" : "형식";
      return `${tag} [규칙 ${f.rule}] ${f.speaker || "-"}: ${f.message}`;
    });
}

function cli(argv) {
  const files = argv.filter((a) => !a.startsWith("--"));
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  if (files.length === 0) {
    console.error("사용법: node scripts/check-answer.mjs <답변파일> [--write]");
    process.exit(2);
  }
  const ctx = loadAnswerContext({
    wikiDir: arg("--wiki", "wiki"),
    sourcesPath: arg("--sources", "sources.json"),
  });
  let forgeTotal = 0;
  for (const file of files) {
    const result = checkAnswer({ file, ctx });
    if (argv.includes("--write")) writeCheckBlock(file, result);
    const { findings, markers } = result;
    forgeTotal += findings.filter((f) => f.severity === "forge").length;
    console.log(`\n${file}`);
    for (const line of formatFindings(findings)) console.log(`  ${line}`);
    console.log(
      `  [근거] ${markers.근거} · [적용] ${markers.적용} · [근거없음] ${markers.근거없음}` +
        (markers.근거 + markers.적용 + markers.근거없음 > 0
          ? ` · [적용] 비율 ${Math.round(
              (markers.적용 / (markers.근거 + markers.적용 + markers.근거없음)) * 100,
            )}%`
          : ""),
    );
  }
  process.exit(forgeTotal > 0 ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
