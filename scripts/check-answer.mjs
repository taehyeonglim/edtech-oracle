import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";
import {
  loadPages,
  footnoteRefs,
  footnoteBlocks,
  stripFootnoteDefs,
  asDateString,
} from "./wiki-parse.mjs";

/** 사회자 발언. 위인이 아니므로 인용 범위(규칙 3)와 마커(규칙 9~11)의 대상이 아니다. */
export const ORCHESTRATOR = "_orchestrator";

const MARKERS = ["근거없음", "근거", "적용"];
/**
 * 문단 첫 줄 어디에 있어도 마커로 인정한다. 위인들은 `**소제목** [근거]` 뒤에 본문을 쓰는데,
 * 첫 글자만 보면 마커를 단 문단을 누락으로 세고 [근거] 집계가 0이 된다.
 * 둘째 줄부터는 보지 않는다 — 본문 중간에 마커를 흘려 넣는 것과 구분해야 한다.
 */
const MARKER_RE = new RegExp(`\\[(${MARKERS.join("|")})\\]`);
/** CLAUDE.md의 각주 정의 형식. 이 꼬리가 없으면 출처 페이지가 고아가 된다. */
const DEF_TAIL_RE = /—\s*tier\s+([ABC])\s*·\s*\[\[sources\/([^\]|]+?)\s*\]\]$/;
/**
 * CommonMark는 들여쓰기 3칸까지 블록으로 인정한다. 줄 시작만 보면 `  ## 다른위인`이
 * 헤딩으로 렌더링되는데 검사기는 앞 화자의 산문으로 읽어 귀속이 통째로 어긋난다.
 */
const INDENT = " {0,3}";
/** CRLF에서 `\r`은 줄 종결자라 `.`와 `$`에 걸리지 않는다. 줄을 자를 때 함께 떼어낸다. */
const EOL_RE = /\r?\n/;
const HEADING_RE = new RegExp(`^${INDENT}##\\s+(.+)$`);
/** 마커를 요구하지 않는 블록. 인용문·목록·표와 되묻기 신호. */
const SKIP_PARA_RE = /^(>|[-*]\s|\d+\.\s|\||NEEDS_CLARIFICATION)/;
/**
 * 주장이 아니라 **구조**인 줄. 헤딩과 수평선이다.
 *
 * 실측(2026-08-20 성능 프로브)에서 규칙 9 위반 159건 중 36건이 `# 제목`과 `---`였다.
 * 구조를 산문으로 세면 위인이 쓰지도 않은 주장에 마커를 요구하게 되고, 더 나쁜 것은
 * **진짜 마커 누락 106건이 오탐 36건 속에 묻힌다**는 점이다. 검사기 관할을 좁게 유지한다.
 *
 * `##`는 화자 구분자라 speakerSections()가 이미 걷어 갔고, 여기 남는 것은 `#`과 `###` 이하다.
 */
const STRUCTURE_LINE_RE = /^\s{0,3}(#{1,6}\s|-{3,}\s*$|\*{3,}\s*$|_{3,}\s*$)/;

/**
 * 문단 앞머리의 구조 줄을 걷어내고 **주장이 시작되는 첫 줄**을 돌려준다.
 * 전부 구조면 빈 문자열 — 마커를 요구하지 않는다.
 *
 * 시작 문자만 보고 통째로 건너뛰지 않는 이유는 `# 진단` 다음 줄에 산문이 이어질 수 있기
 * 때문이다. 구조를 봐주는 것이 그 뒤의 주장까지 봐주는 것이 되면 규칙이 뚫린다.
 */
/**
 * `**소제목** [근거]`처럼 **소제목과 마커만** 있는 한 줄짜리 문단.
 *
 * 실측(2026-08-20 `/debate`)에서 형식급 70건 중 69건이 이 한 가지 습관에서 나왔다.
 * 위인이 소제목과 본문 사이에 빈 줄을 넣으면 두 문단이 되어, 앞은 각주가 없다고(규칙 10)
 * 뒤는 마커가 없다고(규칙 9) **짝으로** 걸린다. 위반 하나가 둘로 세어지는 셈이다.
 *
 * 소제목은 주장이 아니라 제목이고 마커는 뒤따르는 본문의 것이다. `#` 헤딩을 산문으로 세지
 * 않는 것과 같은 이유다 — 다만 이쪽은 마커를 달고 있어 "제목이 본문의 마커를 가져간" 형태다.
 */
const SUBHEAD_ONLY_RE =
  /^(?:\[(?:근거없음|근거|적용)\]\s*)?\*\*[^*\n]+\*\*(?:\s*\[(?:근거없음|근거|적용)\])?\s*$/;

const isSubheadOnly = (para) => !para.includes("\n") && SUBHEAD_ONLY_RE.test(para.trim());

export function claimLine(para) {
  for (const line of para.split(EOL_RE)) {
    if (line.trim() === "" || STRUCTURE_LINE_RE.test(line)) continue;
    return line;
  }
  return "";
}

const forge = (rule, speaker, message) => ({ rule, severity: "forge", speaker, message });
const form = (rule, speaker, message) => ({ rule, severity: "form", speaker, message });

/** `## <화자>`로 본문을 자른다. sections()와 달리 각주 정의를 남긴다 — 규칙 4·8이 정의 줄을 본다. */
export function speakerSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split(EOL_RE)) {
    const m = HEADING_RE.exec(line);
    if (m) {
      cur = { speaker: m[1].trim(), lines: [] };
      out.push(cur);
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  return out.map((s) => ({ speaker: s.speaker, text: s.lines.join("\n") }));
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

  // speakerSections()는 첫 `## ` 이전을 버린다. 버려진 자리에 발언을 숨기면 어떤 규칙에도 걸리지 않으므로
  // 여기서 막는다 — 화자에게 귀속되지 않은 본문은 검사할 수 없는 본문이다.
  const firstHeading = body.search(new RegExp(`^${INDENT}##\\s+`, "m"));
  const preamble = (firstHeading === -1 ? body : body.slice(0, firstHeading)).trim();
  if (preamble) {
    findings.push(forge(6, "", `화자 섹션 앞에 귀속되지 않은 본문이 있다: ${preamble.slice(0, 24)}…`));
  }

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

    // id만 대조하면 유효한 id를 유지한 채 저자·제목을 통째로 날조할 수 있다.
    // 렌더된 각주에는 날조된 서지가 그대로 표시된다.
    for (const block of blocks) {
      const title = sourceById.get(block.id)?.title;
      if (title && !block.text.includes(title)) {
        findings.push(forge(12, speaker, `서지가 sources.json과 다르다: [^${block.id}]의 제목은 "${title}"이다`));
      }
    }

    if (isOrchestrator) continue;

    /** 소제목이 넘긴 마커. 뒤따르는 본문 하나가 받아 간다. */
    let carried = null;
    /** 각주 유무는 소제목과 본문을 **합쳐서** 본다 — 마커가 넘어가도 근거는 근거다. */
    const judge = (marker, scope, label) => {
      const hasRef = footnoteRefs(scope).length > 0;
      if (marker === "근거" && !hasRef) {
        findings.push(form(10, speaker, `[근거]인데 각주가 없다: ${label.slice(0, 24)}…`));
      }
      if (marker === "근거없음" && hasRef) {
        findings.push(form(11, speaker, `[근거없음]인데 각주를 달았다: ${label.slice(0, 24)}…`));
      }
    };
    /** 본문을 만나지 못한 소제목은 그 자리에서 판정한다. 넘길 곳이 없다고 빠져나가지 못한다. */
    const flush = () => {
      if (carried) judge(carried.marker, carried.para, carried.para);
      carried = null;
    };

    for (const para of paragraphs(text)) {
      if (SKIP_PARA_RE.test(para)) continue;
      const first = claimLine(para);
      if (!first) continue; // 헤딩·수평선만 있는 문단. 주장이 없으므로 마커도 요구하지 않는다
      const own = MARKER_RE.exec(first);

      if (own && isSubheadOnly(para)) {
        flush(); // 앞 소제목이 본문 없이 또 소제목을 만났다
        markers[own[1]] += 1; // 마커는 여기서 한 번만 센다. 본문이 받아도 다시 세지 않는다
        carried = { marker: own[1], para };
        continue;
      }

      const marker = own ? own[1] : carried?.marker ?? null;
      if (!marker) {
        findings.push(form(9, speaker, `마커 없는 문단: ${para.slice(0, 24)}…`));
        carried = null;
        continue;
      }
      if (own) {
        // 본문이 자기 마커를 가지면 그것을 쓴다. 앞 소제목은 넘길 곳을 잃었으므로 따로 판정한다.
        flush();
        markers[own[1]] += 1;
        judge(own[1], para, para);
      } else {
        judge(marker, `${carried.para}\n${para}`, para);
        carried = null;
      }
    }
    flush();
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
  if (seenSpeakers.size === 0 && declaredSpeakers.size === 0 && !preamble) {
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

// argv[1]은 `node -e`나 워커에서 없다. 가드가 없으면 모듈을 import만 해도 터진다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli(process.argv.slice(2));
}
