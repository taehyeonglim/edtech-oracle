import { sections, footnoteRefs } from "./wiki-parse.mjs";

/** A가 가장 강하다. 값이 작을수록 강한 근거다. */
const RANK = { A: 0, B: 1, C: 2 };
const LEVEL = ["high", "medium", "low"];

/**
 * 페이지의 근거 강도 = 모든 `##` 섹션의 "그 섹션 최강 티어" 중 가장 약한 것.
 *
 * 페이지 전체를 한 덩어리로 보면 위인은 자기 대표 저작(tier A)을 반드시 인용하므로
 * 언제나 high가 된다. 섹션 단위로 봐야 "연표만 2차 문헌으로 받쳐져 있다"가 드러난다.
 *
 * 각주가 없는 섹션과 sources.json에 없는 각주 id는 제외한다 — 각각 규칙 6·3이 잡는다.
 * 근거를 가진 섹션이 하나도 없으면 null을 돌려주고 판정하지 않는다.
 */
export function computeConfidence(page, sourceById) {
  let weakest = -1;
  for (const s of sections(page.body)) {
    let strongest = -1;
    for (const id of new Set(footnoteRefs(s.text))) {
      const rank = RANK[sourceById.get(id)?.tier];
      if (rank === undefined) continue;
      if (strongest === -1 || rank < strongest) strongest = rank;
    }
    if (strongest === -1) continue;
    if (strongest > weakest) weakest = strongest;
  }
  return weakest === -1 ? null : LEVEL[weakest];
}
