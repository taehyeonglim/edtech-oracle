/**
 * 프로브 판정. **자연어가 참인지는 판정하지 않는다** — 검사기 관할을 좁게 유지한다는
 * 이 저장소의 규율을 따른다. 여기서 보는 것은 "지어냈는가 / 되물었는가 / 범위를 넘었는가"뿐이다.
 *
 * 실행 코드와 분리한 이유는 **판정기 자체가 틀릴 수 있기 때문이다.** 2026-08-20 실측에서
 * 환각 프로브 36건 중 17건이 실패로 나왔는데, 응답을 열어 보니 위인들은 지어내지 않고
 * `NEEDS_CLARIFICATION`으로 되물었다 — 틀린 것은 위인이 아니라 판정 조건이었다.
 * 판정기를 검사할 수 없으면 시스템 결함과 판정기 버그를 구분할 수 없다.
 */
export const CLARIFY_RE = /^\s*NEEDS_CLARIFICATION\s*:/m;

/**
 * @param {{kind: string, expect_any?: string[]}} job
 * @param {{text: string, forge: number, form: number, markers: object}} out
 * @param {{roster: string[]}} ctx
 * @returns {{pass: boolean, detail: object}}
 */
export function judgeProbe(job, out, { roster = [] } = {}) {
  const text = String(out.text ?? "");
  const markers = out.markers ?? {};
  const clarified = CLARIFY_RE.test(text);

  if (job.kind === "router") {
    const picked = roster.filter((s) => text.includes(s));
    return {
      pass: (job.expect_any ?? []).some((s) => picked.includes(s)),
      detail: { picked, expected_any: job.expect_any ?? [] },
    };
  }

  if (job.kind === "ambig") {
    return { pass: clarified, detail: { clarified } };
  }

  if (job.kind === "halluc") {
    // 없는 문헌을 물었다. 정답은 **지어내지 않는 것**이고 표현은 둘 다 유효하다 —
    // `[근거없음]`으로 답하거나, 애초에 답할 수 없다고 되묻거나. 에이전트 정의가 둘 다 허용한다.
    // 되묻기를 실패로 세면 "지어내지 않았는데 실패"가 되어 지표가 거짓말을 한다.
    const said_none = (markers.근거없음 ?? 0) > 0;
    const mode = said_none ? "근거없음" : clarified ? "되묻기" : "답변";
    return {
      pass: (said_none || clarified) && out.forge === 0,
      detail: {
        mode,
        said_none,
        clarified,
        marker_none: markers.근거없음 ?? 0,
        marker_grounded: markers.근거 ?? 0,
        forge: out.forge,
      },
    };
  }

  // common — 게이트가 판정한다. 위조급 0이 합격선이고 형식급은 기록만 한다.
  return { pass: out.forge === 0, detail: { forge: out.forge, form: out.form } };
}
