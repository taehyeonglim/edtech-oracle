import { pathToFileURL } from "node:url";
import { loadPages } from "./wiki-parse.mjs";

/** 표기 차이를 지운다. `수행 격차`와 `수행격차`는 같은 개념이다. */
const norm = (s) => String(s).replace(/[\s·・‧⋅—–\-]/g, "").toLowerCase();

/** 2자 개념이 긴 문자열에 우연히 포함되는 잡음을 막는 하한. */
const MIN_CONTAINED = 3;
const STRONG_EDIT_RATIO = 0.34;
const WEAK_EDIT_RATIO = 0.5;
const WEAK_PREFIX_RATIO = 0.5;

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

const commonPrefix = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
};

/**
 * 두 개념 이름의 관계를 판정한다. 강한 후보는 판정 이름을, 약한 후보는 `약·`을 붙여 돌려준다.
 *
 * 문자열 유사도로는 진짜와 가짜를 가를 수 없다 — `설계연구↔설계실험`(진짜)과
 * `교수기계↔교수기술`(가짜)은 둘 다 "같은 2자 접두사 + 다른 2자 접미사"다.
 * 가르는 척하지 않고 두 단으로 표시해 사람에게 넘긴다.
 */
export function classifyPair(rawA, rawB) {
  const a = norm(rawA);
  const b = norm(rawB);
  if (!a || !b) return null;
  if (a === b) return "정확";

  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.includes(short) && short.length >= MIN_CONTAINED) return "포함";

  const max = long.length;
  const ratio = levenshtein(a, b) / max;
  if (ratio <= STRONG_EDIT_RATIO) return `편집거리 ${ratio.toFixed(2)}`;
  if (ratio <= WEAK_EDIT_RATIO) return `약·편집거리 ${ratio.toFixed(2)}`;

  const pf = commonPrefix(a, b) / max;
  if (pf >= WEAK_PREFIX_RATIO) return `약·접두사 ${pf.toFixed(2)}`;
  return null;
}

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
    for (const name of p.fm.concepts ?? []) items.push({ slug, name });
    for (const name of p.fm.proposed_concepts ?? []) proposed.push({ slug, name });
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) cli(process.argv.slice(2));
