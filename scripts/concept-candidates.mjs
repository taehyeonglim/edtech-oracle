import { pathToFileURL } from "node:url";
import { loadPages } from "./wiki-parse.mjs";

/**
 * 표기 차이를 지운다. `수행 격차`와 `수행격차`는 같은 개념이다.
 *
 * NFKC를 먼저 거는 이유는 둘이다. macOS는 같은 한글을 NFD(자모 분해)로 넘길 때가 있어
 * 정규화 없이 비교하면 눈에 같은 글자가 다른 개념이 되고, `.length`도 늘어나
 * MIN_CONTAINED 하한이 무력해진다. 전각 `ＡＲＣＳ`도 여기서 `ARCS`가 된다.
 */
const norm = (s) => String(s).normalize("NFKC").replace(/[\s·・‧⋅—–\-]/g, "").toLowerCase();

/** 2자 개념이 긴 문자열에 우연히 포함되는 잡음을 막는 하한. */
const MIN_CONTAINED = 3;
const STRONG_EDIT_RATIO = 0.34;
const WEAK_EDIT_RATIO = 0.5;

function levenshtein(a, b) {
  let prev = [...Array(b.length + 1).keys()];
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/**
 * 두 개념 이름의 관계를 판정한다. 강한 후보는 판정 이름을, 약한 후보는 `약·`을 붙여 돌려준다.
 *
 * 문자열 유사도로는 진짜와 가짜를 가를 수 없다 — `설계연구↔설계실험`(진짜)과
 * `교수기계↔교수기술`(가짜)은 둘 다 "같은 2자 접두사 + 다른 2자 접미사"다.
 * 가르는 척하지 않고 두 단으로 표시해 사람에게 넘긴다.
 *
 * 접두사 규칙은 두지 않는다. 공통 접두사가 절반 이상이면 편집거리 비율은 반드시 0.5 이하라
 * 약한 편집거리 분기가 먼저 잡는다 — 별도 분기를 두면 도달할 수 없는 죽은 코드가 된다.
 */
export function classifyPair(rawA, rawB) {
  const a = norm(rawA);
  const b = norm(rawB);
  if (!a || !b) return null;
  if (a === b) return "정확";

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.includes(short) && short.length >= MIN_CONTAINED) return "포함";

  const ratio = levenshtein(a, b) / long.length;
  // 소수 둘째 자리로 자르면 임계값을 넘은 0.34375가 통과한 0.34와 같아 보인다.
  if (ratio <= STRONG_EDIT_RATIO) return `편집거리 ${ratio.toFixed(3)}`;
  if (ratio <= WEAK_EDIT_RATIO) return `약·편집거리 ${ratio.toFixed(3)}`;
  return null;
}

/** 프론트매터가 배열이 아니거나 항목이 문자열이 아니면 조용한 오판 대신 건너뛴다. */
const conceptNames = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

/**
 * 위인들의 concepts 필드에서 공유 개념 후보를 찾고, proposed_concepts를 모은다.
 * 위키를 읽되 쓰지 않는다.
 */
export function conceptCandidates({ wikiDir = "wiki" } = {}) {
  const pioneers = loadPages(wikiDir).filter((p) => p.fm.type === "pioneer");
  const items = [];
  const proposed = [];

  for (const p of pioneers) {
    const slug = p.fm.slug ?? p.id;
    for (const name of conceptNames(p.fm.concepts)) items.push({ slug, name });
    for (const name of conceptNames(p.fm.proposed_concepts)) proposed.push({ slug, name });
  }

  const strong = [];
  const weak = [];
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      if (a.slug === b.slug) continue; // 공유 개념을 찾는 것이 목적이다
      const why = classifyPair(a.name, b.name);
      if (!why) continue;
      (why.startsWith("약·") ? weak : strong).push({ a, b, why });
    }
  }
  return { strong, weak, proposed };
}

function cli(argv) {
  const arg = (name, fallback) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
  };
  const { strong, weak, proposed } = conceptCandidates({ wikiDir: arg("--wiki", "wiki") });
  const show = (pairs) => {
    for (const { a, b, why } of pairs) {
      console.log(`  [${why}]  ${a.name} (${a.slug})  ↔  ${b.name} (${b.slug})`);
    }
  };

  console.log(`강한 후보 ${strong.length}건 — 먼저 볼 목록`);
  show(strong);
  console.log(`\n약한 후보 ${weak.length}건 — 잡음이 많다. 기계가 가르지 못하는 자리다`);
  if (!argv.includes("--weak")) console.log("  (--weak 로 펼친다)");
  else show(weak);

  console.log(`\nproposed_concepts ${proposed.length}건`);
  for (const { slug, name } of proposed) console.log(`  ${name} (${slug})`);

  console.log(
    "\n승격은 자동이 아니다. 두 개념이 실제로 같은지, 양쪽 위인 페이지가",
  );
  console.log("그 개념에 대해 A·B 티어 근거를 이미 갖는지는 사람이 판정한다.");
}

// argv[1]은 `node -e`나 워커에서 없다. 가드가 없으면 모듈을 import만 해도 터진다.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
