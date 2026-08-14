/**
 * 페이지 id ↔ URL 변환.
 *
 * 모든 링크는 상대경로다. 사이트가 `https://<user>.github.io/edtech-oracle/` 아래 뜨든
 * 도메인 루트에 뜨든 `file://`로 열리든 동일하게 작동한다 — base path 설정, `<base>` 태그,
 * 빌드 환경변수가 전부 불필요해진다.
 *
 * 페이지 id는 `loadPages()`가 만든 확장자 없는 상대경로다. 깊이는 0(`index`, `log`) 또는
 * 1(`pioneers/robert-gagne`) 뿐이므로 상대경로 계산이 `../` 한 단계로 끝난다.
 */

/** 위키 하위 디렉터리 화이트리스트. 이 밖의 디렉터리는 빌드를 중단시킨다(계획 T12). */
export const WIKI_DIRS = ["pioneers", "debates", "concepts", "sources"];

/** 브라우즈 페이지 — 위키가 아니라 빌드가 생성한다. 전부 깊이 0. */
export const BROWSE = {
  pioneers: "pioneers.html",
  debates: "debates.html",
  concepts: "concepts.html",
  sources: "sources.html",
  search: "search.html",
  graph: "graph.html",
};

/** id 안의 `/` 개수. 0 또는 1. */
export const depthOf = (id) => (id.includes("/") ? 1 : 0);

/** 페이지 id → 사이트 루트 기준 URL. */
export const pageUrl = (id) => `${id}.html`;

/** 깊이 d인 페이지에서 루트로 올라가는 접두사. */
export const rootPrefix = (fromId) => (depthOf(fromId) === 0 ? "" : "../");

/** 루트 기준 URL을 `fromId` 페이지 기준 상대 URL로 바꾼다. */
export const relUrl = (fromId, rootRelative) => rootPrefix(fromId) + rootRelative;

/** `fromId`에서 다른 페이지로 가는 상대 링크. */
export const linkTo = (fromId, toId) => relUrl(fromId, pageUrl(toId));

/** `fromId`에서 `web/assets/<name>`으로 가는 상대 링크. */
export const assetUrl = (fromId, name) => relUrl(fromId, `assets/${name}`);

/**
 * 헤딩 텍스트 → 앵커 id.
 *
 * 본문 헤딩은 100% 한글이라 슬러그도 한글이 된다. NFC로 정규화하는 것이 핵심이다 —
 * macOS 파일시스템은 NFD를 만들 수 있고, 브라우저 주소창은 NFC로 인코딩해 보내므로
 * 정규화하지 않으면 앵커가 조용히 안 잡힌다.
 */
export function anchorId(text) {
  const slug = String(text)
    .normalize("NFC")
    .trim()
    .replace(/[\s]+/g, "-")
    .replace(/["'`<>&/\\?#[\]{}()]/g, "");
  return `s-${slug}`;
}

/** 각주 정의(`<li>`)의 id. 각주 label은 전부 `[a-z0-9-]`라 그대로 안전하다. */
export const fnId = (label) => `fn-${label}`;

/**
 * 각주 참조의 id. 같은 각주가 한 페이지에서 여러 번 참조되므로(최대 18회)
 * 참조 발생마다 고유해야 되돌아가기가 어디서 왔는지 안다(계획 T4).
 */
export const fnRefId = (label, subId = 0) => `fnref-${label}-${subId}`;
