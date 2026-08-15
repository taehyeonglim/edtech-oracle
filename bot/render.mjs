/**
 * 답변 마크다운 → 디스코드 웹훅 페이로드.
 *
 * **순수 함수다.** 파일시스템도 디스코드도 모르고 문자열만 다룬다. `index.mjs`가 읽어서
 * 넘긴다. `check-answer.mjs`를 순수 검사기로 만든 것과 같은 이유다 — 2,000자 분할과
 * 각주 변환처럼 틀리기 쉬운 부분을 토큰 없이, 실제 답변 파일로 검사할 수 있다.
 *
 * 화자 경계는 `speakerSections()`를 **게이트에서 그대로 가져다 쓴다.** 복사하면 언젠가
 * 갈라지고, 갈라지는 순간 봇이 다른 위인의 얼굴로 발언을 게시한다. 의존 방향은
 * bot → scripts 한 쪽뿐이라 위키·게이트 도구는 봇의 존재를 모른다.
 */
import matter from "gray-matter";
import { footnoteBlocks, stripFootnoteDefs } from "../scripts/wiki-parse.mjs";
import { speakerSections, ORCHESTRATOR } from "../scripts/check-answer.mjs";

/**
 * 디스코드 본문 한도는 2,000자지만 1,900에서 자른다.
 * 경계에서 디스코드의 글자 세는 방식(이모지·결합문자)과 다투지 않으려는 여유다.
 */
export const DEFAULT_LIMIT = 1900;

/** 사회자의 기본 표시 이름. 위인이 아니므로 아바타를 달지 않는다. */
export const ORCHESTRATOR_NAME = "사회자";

/** 연속된 각주 참조 덩어리. `[^a][^b][^c]`를 한 번에 잡아 사이에 공백을 넣는다. */
const REF_RUN_RE = /(?:\[\^[^\]\s]+\])+/g;
const REF_ONE_RE = /\[\^([^\]\s]+)\]/g;
/** 각주 정의 꼬리에서 티어를 읽는다. 규칙 8은 형식급이라 꼬리가 없을 수도 있다. */
const DEF_TAIL_RE = /—\s*tier\s+([ABC])\s*·\s*\[\[sources\/([^\]|]+?)\s*\]\]\s*$/;
/** 서지에서 지우는 것: 티어 꼬리와 `<원문 URL>`. 링크는 사이트 출처 페이지가 받는다. */
const RAW_URL_RE = /<https?:\/\/[^>]*>/g;
/** 마크다운 링크 한 덩어리. 하드컷이 이 안을 가르면 링크가 깨진다. */
const LINK_SPAN_RE = /\[[^\]\n]*\]\([^)\n]*\)/g;

const trimSlash = (s) => String(s ?? "").replace(/\/+$/, "");

/** 출처 페이지 절대 URL. `scripts/site/urls.mjs`는 의도적으로 상대경로 전용이라 못 쓴다. */
export const sourceUrl = (baseUrl, id) => `${trimSlash(baseUrl)}/sources/${id}.html`;

/**
 * 각주 라벨. 등장 순서 번호에 티어 문자를 앞에 붙인다 — `[A1] [A2] [B3]`.
 *
 * 스펙 초안은 위첨자(`[1ᴬ]`)였으나 유니코드에 **위첨자 대문자 C가 없다.** A·B만
 * 위첨자가 되고 C는 소문자 `ᶜ`로 떨어져 티어 표기가 서로 다른 크기로 렌더된다.
 */
const labelOf = (tier, n) => `${tier ?? ""}${n}`;

/** `footnoteBlocks()`가 돌려주는 정의는 `[^id]:` 접두를 달고 있다. */
const DEF_HEAD_RE = /^\s*\[\^[^\]\s]+\]:\s*/;

/** 서지에서 각주 접두·꼬리와 원문 URL을 떼어 낸다. 남는 것은 저자·연도·제목·발행처. */
function bibliography(defText) {
  return defText
    .replace(DEF_HEAD_RE, "")
    .replace(DEF_TAIL_RE, "")
    .replace(RAW_URL_RE, "")
    .replace(/\s+/g, " ")
    .replace(/[\s.]+$/, "")
    .trim();
}

/** 각주 정의를 **파일 전역**에서 모은다. 게이트는 정의가 어느 섹션에 있는지 강제하지 않는다. */
function defMap(content) {
  const out = new Map();
  for (const { id, text } of footnoteBlocks(content)) {
    if (!out.has(id)) out.set(id, text);
  }
  return out;
}

/**
 * 한 섹션의 각주를 링크로 바꾸고 서지 범례를 만든다.
 *
 * 번호는 그 섹션 안에서 처음 등장한 순서다. 섹션마다 1번부터 다시 센다 —
 * `/debate`는 같은 위인이 라운드마다 다시 등장하므로 파일 전역 번호는 읽는 사람에게
 * 아무 의미가 없다.
 */
function linkFootnotes(text, defs, baseUrl) {
  const order = [];
  const labels = new Map();
  const label = (id) => {
    if (!labels.has(id)) {
      const tier = DEF_TAIL_RE.exec(defs.get(id) ?? "")?.[1] ?? null;
      labels.set(id, labelOf(tier, order.length + 1));
      order.push(id);
    }
    return labels.get(id);
  };

  const body = text.replace(REF_RUN_RE, (run) =>
    [...run.matchAll(REF_ONE_RE)].map((m) => `[${label(m[1])}](${sourceUrl(baseUrl, m[1])})`).join(" "),
  );

  // `-# `는 디스코드의 작은 회색 글씨다. 근거를 붙이되 발언을 덮지 않는다.
  const legend = order
    .map((id) => {
      const bib = bibliography(defs.get(id) ?? "");
      const url = sourceUrl(baseUrl, id);
      return `-# ${labels.get(id)} · ${bib ? `[${bib}](${url})` : url}`;
    })
    .join("\n");

  return { body, legend };
}

/** 하드컷 지점. 링크 안을 가르지 않고, 가능하면 공백 경계에서 자른다. */
function cutPoint(text, limit) {
  const spans = [...text.matchAll(LINK_SPAN_RE)].map((m) => [m.index, m.index + m[0].length]);
  const inside = (i) => spans.find(([a, b]) => i > a && i < b);
  for (let i = limit; i > 0; i -= 1) {
    if (/\s/.test(text[i]) && !inside(i)) return i;
  }
  const span = inside(limit);
  return span && span[0] > 0 ? span[0] : limit;
}

/** 한도를 넘는 한 줄을 조각낸다. */
function hardSplit(line, limit) {
  const out = [];
  let rest = line;
  while (rest.length > limit) {
    const cut = cutPoint(rest, limit);
    out.push(rest.slice(0, cut).trimEnd());
    rest = rest.slice(cut).trimStart();
  }
  if (rest) out.push(rest);
  return out;
}

/**
 * 텍스트를 "각각 한도 안에 들어가는 조각"으로 편다.
 * `sep`은 **앞 조각과 이어 붙일 때 쓸 구분자**다 — 문단 경계는 빈 줄, 문단 안은 줄바꿈.
 */
function blocksOf(text, limit) {
  const out = [];
  for (const para of text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    if (para.length <= limit) {
      out.push({ text: para, sep: "\n\n" });
      continue;
    }
    let first = true;
    for (const line of para.split("\n")) {
      if (!line.trim()) continue;
      for (const piece of line.length <= limit ? [line] : hardSplit(line, limit)) {
        out.push({ text: piece, sep: first ? "\n\n" : "\n" });
        first = false;
      }
    }
  }
  return out;
}

/** 조각을 한도까지 욕심껏 채운다. */
function pack(blocks, limit) {
  const out = [];
  let buf = "";
  for (const b of blocks) {
    const joined = buf ? buf + b.sep + b.text : b.text;
    if (joined.length <= limit) {
      buf = joined;
      continue;
    }
    if (buf) out.push(buf);
    buf = b.text;
  }
  if (buf) out.push(buf);
  return out;
}

/**
 * 본문과 서지 범례를 **한 번에** 나눈다.
 *
 * 범례를 따로 이어 붙이면 마지막 조각이 한도 근처일 때 정확히 경계에서 넘친다.
 * 같은 패커에 통과시키면 넘칠 자리에서 알아서 다음 메시지로 넘어간다.
 */
export function splitContent(body, legend, limit = DEFAULT_LIMIT) {
  const parts = pack(blocksOf(legend ? `${body}\n\n${legend}` : body, limit), limit);
  return parts.length ? parts : [""];
}

/**
 * 답변 마크다운 → 게시할 페이로드 배열.
 *
 * @param {string} markdown  `answers/<파일>.md` 원문
 * @param {object} opts
 * @param {number} opts.since  이미 게시한 **섹션 수**. 이 인덱스부터만 돌려준다.
 *   화자 이름이 아니라 인덱스로 자른다 — `/debate`는 같은 화자가 라운드마다 반복 등장한다.
 * @param {string} opts.baseUrl  배포된 사이트의 base URL
 * @param {Record<string, {name?: string, avatarUrl?: string}>} opts.speakers  slug → 표시 정보
 * @returns {{sectionCount: number, payloads: Array}}  `sectionCount`가 다음 `since`다.
 */
export function render(markdown, { since = 0, baseUrl = "", speakers = {}, limit = DEFAULT_LIMIT } = {}) {
  const { content } = matter(markdown);
  const defs = defMap(content);
  const all = speakerSections(content);
  const payloads = [];

  for (let i = Math.max(0, since); i < all.length; i += 1) {
    const { speaker } = all[i];
    // NFC로 정규화한 뒤 센다. macOS가 넘겨준 NFD 한글은 자모가 분해돼 `.length`가 부풀고,
    // 그러면 한도에 한참 못 미치는 메시지가 잘려 나간다.
    const text = stripFootnoteDefs(all[i].text).normalize("NFC").trim();
    const isOrchestrator = speaker === ORCHESTRATOR;
    // 사회자는 각주를 쓸 수 없다(규칙 7). 변환할 것이 없으므로 통과시킨다.
    const { body, legend } = isOrchestrator
      ? { body: text, legend: "" }
      : linkFootnotes(text, defs, baseUrl);

    const info = speakers[speaker] ?? {};
    const parts = splitContent(body, legend, limit);
    parts.forEach((content, part) => {
      payloads.push({
        section: i,
        speaker,
        part,
        parts: parts.length,
        username: isOrchestrator ? ORCHESTRATOR_NAME : (info.name ?? speaker),
        // 초상 권리(KNOWN-ISSUES #3) 때문에 아바타는 기본값이 없다. 설정이 주면 그때 붙는다.
        ...(isOrchestrator || !info.avatarUrl ? {} : { avatarUrl: info.avatarUrl }),
        content,
      });
    });
  }

  return { sectionCount: all.length, payloads };
}

/** 프론트매터 `check:` 블록 → 게시할 검사 요약 한 줄. */
export function checkSummary(markdown) {
  const { data, content } = matter(markdown);
  const c = data?.check;
  if (!c) return null;
  const m = c.markers ?? {};
  const refs = [...content.matchAll(REF_ONE_RE)].length - footnoteBlocks(content).length;
  return (
    `근거 검사 — 각주 ${Math.max(0, refs)}건 · 위조급 ${c.forge ?? 0} · 형식급 ${c.form ?? 0}` +
    ` · [근거] ${m.근거 ?? 0} [적용] ${m.적용 ?? 0} [근거없음] ${m.근거없음 ?? 0}`
  );
}
