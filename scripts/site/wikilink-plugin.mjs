/**
 * `[[대상]]` / `[[대상|별칭]]` 위키링크를 markdown-it 인라인 규칙으로 처리한다.
 *
 * 정규식 후처리가 아니라 인라인 ruler에 등록하는 이유는 위치 때문이다. markdown-it의
 * 기본 체인은
 *
 *   text → linkify → newline → escape → backticks → strikethrough → emphasis → link → …
 *
 * 이고 `before("link", …)`로 넣으면 `escape`·`backticks` **뒤**, `link` **앞**에 놓인다.
 * 그 결과 세 가지가 공짜로 따라온다.
 *
 *   - `` `[[x]]` `` 는 코드스팬이라 링크가 되지 않는다
 *   - `\[\[x]]` 는 이스케이프된다
 *   - `[[a]]` 가 `[` + `[a]` 링크로 오파싱되지 않는다
 *
 * 정규식 후처리로는 셋 다 직접 방어해야 한다.
 *
 * `wiki-parse.mjs`의 `wikilinks()`를 쓰지 않는 이유: 그 함수는 lint 규칙 5·7 전용이라
 * `[[a|b]]`에서 별칭 b를 버린다. 렌더러는 별칭이 필요하므로 원문을 직접 판다. 덕분에
 * `wiki-parse.mjs`를 수정할 필요가 없고 lint의 기준선이 무손상으로 남는다.
 */

/**
 * @param {import("markdown-it")} md
 * @param {{ resolve: (target: string) => { url: string, title: string, exists: boolean } }} opts
 *   `resolve`는 현재 렌더 중인 페이지 기준의 **상대** URL을 이미 반영해 돌려준다.
 */
export function wikilinkPlugin(md, { resolve }) {
  md.inline.ruler.before("link", "wikilink", (state, silent) => {
    const { src, pos } = state;

    // `[[` 로 시작하지 않으면 즉시 양보한다. `[^각주]`도 여기서 걸러진다.
    if (src.charCodeAt(pos) !== 0x5b /* [ */ || src.charCodeAt(pos + 1) !== 0x5b) return false;

    const end = src.indexOf("]]", pos + 2);
    if (end < 0) return false;

    const inner = src.slice(pos + 2, end);
    // 중첩 대괄호와 개행은 위키링크가 아니다.
    if (inner.includes("[") || inner.includes("\n")) return false;

    const bar = inner.indexOf("|");
    const target = (bar < 0 ? inner : inner.slice(0, bar)).trim();
    const alias = bar < 0 ? "" : inner.slice(bar + 1).trim();
    if (!target) return false;

    if (!silent) {
      const r = resolve(target);
      const open = state.push("link_open", "a", 1);
      open.attrSet("href", r.url);
      open.attrSet("class", r.exists ? "wikilink" : "wikilink wikilink--broken");
      if (!r.exists) open.attrSet("title", "대상 페이지 없음");

      const text = state.push("text", "", 0);
      // 별칭 > 대상 페이지의 제목 > 원문 타깃.
      // 제목으로 치환하는 것이 GitHub 대비 가장 큰 체감 차이다 —
      // `[[pioneers/robert-gagne]]` 가 화면에 "로버트 가녜"로 보인다.
      text.content = alias || r.title || target;

      state.push("link_close", "a", -1);
    }

    state.pos = end + 2;
    return true;
  });
}
