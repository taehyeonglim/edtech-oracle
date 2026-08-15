/**
 * 한 화자의 발언만 따로 답변 게이트에 통과시킨다.
 *
 * 위인들은 병렬로 돌다가 45초씩 벌어져 끝나는데, 오케스트레이터는 셋이 **모두** 끝난 뒤에야
 * 제어를 되찾는다. 그래서 오케스트레이터가 한 명씩 파일에 이어 쓰는 경로는 없다.
 * 대신 봇이 스트림에서 발언을 받아 **직접 검사한다.**
 *
 * `check-answer.mjs`가 순수 검사기라 이것이 가능하다 — 파일 하나를 받아 판정만 돌려주므로
 * 화자 한 명짜리 파일을 만들어 넣으면 그 사람 몫만 검사된다. 규칙 3(인용 범위)은 원래
 * 화자별 검사라 쪼개도 의미가 그대로다.
 *
 * **위조급이 남은 발언은 게시하지 않는다.** 오케스트레이터가 그 위인을 1회 재호출해 고치고,
 * 봇은 마지막에 답변 파일에서 고쳐진 판을 읽어 올린다. 검사를 통과하지 않은 인용이
 * 채널에 먼저 나가는 일은 없다.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { checkAnswer } from "../scripts/check-answer.mjs";

/** 되묻기 신호. 발언이 아니라 질문이므로 게시하지 않는다. */
const CLARIFY_RE = /^\s*NEEDS_CLARIFICATION\s*:/m;

/** 화자 하나짜리 답변 파일. 게이트가 요구하는 최소 프론트매터를 갖춘다. */
export function sectionMarkdown(slug, text) {
  return `---\ntype: answer\ncommand: ask\nspeakers:\n  - ${slug}\n---\n\n## ${slug}\n\n${String(text).trim()}\n`;
}

/**
 * @returns {{md: string, forge: Array, skip: string|null}}
 *   `skip`이 있으면 게시하지 않는다. 이유가 담긴다.
 */
export function gateSection({ slug, text, ctx, dir, pioneers }) {
  const body = String(text ?? "").trim();
  if (!body) return { md: "", forge: [], skip: "발언이 비어 있다" };
  if (pioneers && !pioneers.has(slug)) return { md: "", forge: [], skip: "위인이 아니다" };
  if (CLARIFY_RE.test(body)) return { md: "", forge: [], skip: "되묻기 신호" };

  const md = sectionMarkdown(slug, body);
  const file = join(dir, `${slug}.md`);
  writeFileSync(file, md);
  const { findings } = checkAnswer({ file, ctx });
  const forge = findings.filter((f) => f.severity === "forge");
  return { md, forge, skip: forge.length ? `위조급 ${forge.length}건` : null };
}

/** 같은 발언인지 비교한다. 오케스트레이터가 공백만 손대는 경우를 정정으로 세지 않는다. */
export const sameText = (a, b) =>
  String(a ?? "").replace(/\s+/g, " ").trim() === String(b ?? "").replace(/\s+/g, " ").trim();
