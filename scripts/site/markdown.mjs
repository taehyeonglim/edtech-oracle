import MarkdownIt from "markdown-it";
import footnote from "markdown-it-footnote";
import { wikilinkPlugin } from "./wikilink-plugin.mjs";
import { anchorId, fnId, fnRefId } from "./urls.mjs";
import { stripFootnoteDefs } from "../wiki-parse.mjs";

/**
 * 위키 마크다운 렌더러.
 *
 * 티어는 각주 정의 텍스트를 파싱해서 얻지 않고 `sources.json`을 조회해서 얻는다.
 * 정의줄의 서지 제목 안에도 em dash가 들어 있어서(`Collins — Professor Emeritus`,
 * `Scores—and Teaches`) 텍스트 파싱은 조용히 틀린다. lint 규칙 3이 "각주 label ∈
 * sources.json"을 이미 보장하므로 조회는 항상 성립하고, 둘의 일치는 빌드 어서션이 따로 지킨다.
 *
 * 꼬리의 `— tier A · [[sources/x]]` 텍스트는 **지우지 않는다**. 각주 정의의 축자적 출처 표기가
 * 이 프로젝트의 핵심 주장이고, 뱃지는 덧붙이는 것이지 대체하는 것이 아니다. 잘라냈다가 링크를
 * 복원하지 않으면 전체 위키링크 905개 중 509개(56%)가 통째로 사라지는데, "깨진 링크 0" 검사는
 * 링크가 없으니 통과해버린다.
 */

/**
 * @param {object} ctx
 * @param {(target: string) => {url: string, title: string, exists: boolean}} ctx.resolve
 * @param {(label: string) => ('A'|'B'|'C'|null)} ctx.tierOf
 */
export function createMarkdown(ctx) {
  const md = new MarkdownIt({
    html: false, // 원시 HTML은 이스케이프한다. 현재 코퍼스에 0건이며 향후 방어선이다.
    linkify: false, // `<https://…>` 자동링크만 쓴다. 맨텍스트 URL 자동 변환은 원하지 않는다.
    typographer: false, // `—`·`·`를 건드리지 않는다.
    breaks: false,
  })
    .use(footnote)
    .use(wikilinkPlugin, { resolve: ctx.resolve });

  applyFootnoteRules(md, ctx);
  applyHeadingRules(md);
  applyLinkRules(md);
  return md;
}

const tierBadge = (tier, extraClass = "") =>
  `<span class="tier tier--${tier}${extraClass ? ` ${extraClass}` : ""}" aria-hidden="true">${tier}</span>`;

function applyFootnoteRules(md, ctx) {
  // ① 본문의 각주 참조 → 정의로 가는 앵커 + 티어 표시.
  //    주장이 놓인 자리에서 근거 강도가 바로 보이는 것이 이 위키의 설계 의도다.
  md.renderer.rules.footnote_ref = (tokens, idx) => {
    const { id, subId, label } = tokens[idx].meta;
    const tier = ctx.tierOf(label) ?? "?";
    const n = id + 1;
    return (
      `<sup class="fnref">` +
      `<a id="${fnRefId(label, subId)}" href="#${fnId(label)}"` +
      ` class="fnref__link" data-tier="${tier}"` +
      ` aria-label="각주 ${n}, tier ${tier} 출처">` +
      `${n}${tierBadge(tier, "tier--inline")}` +
      `</a></sup>`
    );
  };

  // ② 각주 정의 <li> → label 기반 id + 티어 뱃지.
  md.renderer.rules.footnote_open = (tokens, idx) => {
    const { label } = tokens[idx].meta;
    const tier = ctx.tierOf(label) ?? "?";
    return `<li id="${fnId(label)}" class="fn fn--${tier}">${tierBadge(tier)} `;
  };

  md.renderer.rules.footnote_close = () => `</li>\n`;

  // ③ 되돌아가기. subId를 반영하지 않으면 label 기반 id로 바꾼 순간 역참조가 전량 죽는다.
  //    기본 구현은 `#fnref1:1` 같은 숫자 id를 뱉기 때문이다. 한 각주가 한 페이지에서
  //    최대 18회 참조되므로(seymour-papert의 papert-1980) 발생마다 하나씩 붙는다.
  md.renderer.rules.footnote_anchor = (tokens, idx) => {
    const { subId, label } = tokens[idx].meta;
    const nth = subId + 1;
    return ` <a href="#${fnRefId(label, subId)}" class="fn__back" aria-label="본문 ${nth}번째 인용으로">↩</a>`;
  };

  md.renderer.rules.footnote_block_open = () =>
    `<hr class="fn__sep">\n` +
    `<section class="footnotes" aria-labelledby="footnotes-title">\n` +
    `<h2 id="footnotes-title" class="footnotes__title">각주 · 출처</h2>\n` +
    `<ol class="footnotes__list">\n`;

  md.renderer.rules.footnote_block_close = () => `</ol>\n</section>\n`;
}

function applyHeadingRules(md) {
  const openOrig =
    md.renderer.rules.heading_open ||
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));
  const closeOrig =
    md.renderer.rules.heading_close ||
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.heading_open = (tokens, idx, opts, env, self) => {
    const inline = tokens[idx + 1];
    if (inline && inline.type === "inline") {
      tokens[idx].attrSet(
        "id",
        anchorId(inline.content.replace(/\[\^[^\]\s]+\](?!:)/g, "").trim())
      );
      tokens[idx].attrJoin("class", "h-anchored");
    }
    return openOrig(tokens, idx, opts, env, self);
  };

  // 앵커는 닫기 태그 직전에 넣는다 — 열기 태그 뒤에 붙이면 제목 텍스트 **앞**에 온다.
  md.renderer.rules.heading_close = (tokens, idx, opts, env, self) => {
    const openTok = tokens[idx - 2];
    const id = openTok?.attrGet?.("id");
    const anchor = id ? `<a class="h-anchor" href="#${id}" aria-label="이 절 링크">§</a>` : "";
    return anchor + closeOrig(tokens, idx, opts, env, self);
  };
}

/** 외부 링크는 새 탭 + rel. 내부 위키링크는 플러그인이 이미 처리했으므로 건드리지 않는다. */
function applyLinkRules(md) {
  const orig =
    md.renderer.rules.link_open ||
    ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const href = tokens[idx].attrGet("href") || "";
    if (/^https?:\/\//.test(href)) {
      tokens[idx].attrSet("target", "_blank");
      tokens[idx].attrSet("rel", "noopener noreferrer");
      tokens[idx].attrJoin("class", "extlink");
    }
    return orig(tokens, idx, opts, env, self);
  };
}

/**
 * 검색 색인용 평문.
 *
 * 각주 **정의**만 지우면 안 된다. 정의를 먼저 제거하면 markdown-it-footnote가 참조를 인식하지
 * 못해 `[^gagne-1965]`가 리터럴 텍스트로 남고, 검색 스니펫이 각주 마커 범벅이 된다.
 * 정의 제거와 참조 마커 제거는 세트다.
 *
 * 위키링크 규칙은 살려 둔다 — `[[pioneers/robert-gagne]]`가 텍스트 "로버트 가녜"로 바뀌어
 * 표시명으로도 검색된다.
 */
export function plainText(md, body) {
  const clean = stripFootnoteDefs(body).replace(/\[\^[^\]\s]+\](?!:)/g, "");
  const out = [];
  for (const tok of md.parse(clean, {})) {
    if (tok.type !== "inline") continue;
    for (const child of tok.children) {
      if (child.type === "text" || child.type === "code_inline") out.push(child.content);
    }
  }
  return out.join(" ").replace(/\s+/g, " ").normalize("NFC").trim();
}
