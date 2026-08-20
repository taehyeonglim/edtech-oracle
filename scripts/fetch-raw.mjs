#!/usr/bin/env node
/**
 * 공개된 원문을 `raw/`로 가져온다.
 *
 * **유료 장벽을 우회하지 않는다.** 공개 경로만 시도하고, 열리지 않는 것은 사유와 함께
 * `미확보`로 남긴다. 근거 규율상 "못 가져왔다"와 "없다"는 다르다 — 레지스트리 조회는
 * 자주 실패하므로 한 번의 실패를 부재로 기록하면 실재하는 문헌을 버리게 된다.
 *
 * `raw/`는 저작권 때문에 커밋하지 않는다(`.gitignore`). 공개되는 산출물은
 * `raw/MANIFEST.md`의 확보 상태 표다 — 원문이 없어도 무엇을 근거로 삼았는지는 공개된다.
 *
 *   node scripts/fetch-raw.mjs --dry          # 무엇을 어떻게 시도할지만 출력
 *   node scripts/fetch-raw.mjs                # 실제로 가져온다
 *   node scripts/fetch-raw.mjs --only <id,id>
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const arg = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ONLY = arg("--only", "") ? new Set(arg("--only", "").split(",").map((s) => s.trim())) : null;
const CONCURRENCY = Number(arg("--concurrency", "3"));
const TIMEOUT_MS = Number(arg("--timeout", "45000"));

const RAW = "raw";
const sources = JSON.parse(readFileSync("sources.json", "utf8"));

/** 자료형 → 보관 디렉터리. MANIFEST의 분류와 맞춘다. */
function bucket(type = "") {
  if (/논문|article|paper/i.test(type)) return "papers";
  if (/아카이브|archive|기록/i.test(type)) return "archives";
  return "books";
}

/**
 * 한 출처에 대해 시도할 공개 경로들. 앞에서부터 시도하고 처음 성공한 것을 쓴다.
 * **추측으로 URL을 만드는 것은 ERIC처럼 규칙이 공개된 곳으로 제한한다** —
 * 아무 주소나 찍어 보면 서버에 부담만 주고 근거도 되지 않는다.
 */
function candidates(r) {
  const url = String(r.url ?? "");
  const out = [];
  const push = (u, how, ext) => u && out.push({ url: u, how, ext });

  if (/\.pdf(\?|$)/i.test(url)) push(url, "PDF 직링크", "pdf");

  // ERIC은 전문 PDF 주소 규칙이 공개돼 있다: files.eric.ed.gov/fulltext/<ID>.pdf
  const eric = /(?:^|[?&/])(?:id=)?(E[DJ]\d{6})/i.exec(url);
  if (eric) push(`https://files.eric.ed.gov/fulltext/${eric[1].toUpperCase()}.pdf`, "ERIC 전문", "pdf");

  // archive.org 전문 텍스트. 공개 자료에만 존재한다 — 대출 전용이면 404가 난다.
  const ia = /archive\.org\/details\/([^/?#]+)/i.exec(url);
  if (ia) push(`https://archive.org/download/${ia[1]}/${ia[1]}_djvu.txt`, "archive.org 전문", "txt");

  if (/gutenberg\.org/i.test(url)) {
    const g = /ebooks\/(\d+)/.exec(url);
    if (g) push(`https://www.gutenberg.org/ebooks/${g[1]}.txt.utf-8`, "Gutenberg 전문", "txt");
  }

  // 기관·아카이브의 공개 웹페이지. 원문 자체가 웹페이지인 경우가 있다.
  if (/marxists\.org|nasonline\.org|nationalacademies\.org|escholarship\.org|news\.mit\.edu|si\.edu|apa\.org|psychologicalscience\.org|chronicle\.uchicago\.edu|amphilsoc\.org|psy-msu\.ru|reigeluth\.net|ikit\.org|unige\.ch/i.test(url)) {
    push(url, "기관 공개 페이지", "html");
  }

  return out;
}

async function fetchOnce(url, timeoutMs) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctl.signal,
      redirect: "follow",
      headers: { "user-agent": "edtech-oracle/0.1 (research archive; contact via repo)" },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, buf, type: res.headers.get("content-type") ?? "" };
  } catch (e) {
    return { ok: false, error: e.name === "AbortError" ? "시간초과" : e.message };
  } finally {
    clearTimeout(timer);
  }
}

/** 한 번의 실패를 부재로 판정하지 않는다. 간격을 두고 재시도한다. */
async function fetchWithRetry(url, tries = 3) {
  let last = null;
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise((r) => setTimeout(r, 3000 * i));
    last = await fetchOnce(url, TIMEOUT_MS);
    if (last.ok) return last;
    if (/HTTP 4[0-9][0-9]/.test(last.error ?? "") && last.error !== "HTTP 429") return last; // 404·403은 재시도해도 같다
  }
  return last;
}

/** 받아 온 것이 실제 본문인지 최소한으로 본다. 로그인 안내 페이지를 원문으로 세지 않는다. */
function looksSubstantive(buf, ext, type) {
  if (buf.length < 2048) return { ok: false, why: `너무 작다(${buf.length}B)` };
  if (ext === "pdf" && !buf.subarray(0, 5).toString("latin1").startsWith("%PDF")) {
    return { ok: false, why: "PDF가 아니다(차단 페이지일 수 있다)" };
  }
  if (ext !== "pdf") {
    const s = buf.toString("utf8").slice(0, 4000).toLowerCase();
    if (/sign in|log in to continue|access denied|captcha|robot check/.test(s)) {
      return { ok: false, why: "로그인·차단 페이지" };
    }
  }
  if (ext === "html" && /text\/html/.test(type) && buf.length < 4096) {
    return { ok: false, why: "내용이 빈약하다" };
  }
  return { ok: true };
}

const targets = sources.filter((r) => !ONLY || ONLY.has(r.id));
const plan = targets.map((r) => ({ r, cands: candidates(r) }));
const withPath = plan.filter((p) => p.cands.length);

console.log(`출처 ${targets.length}건 · 공개 경로 후보 있음 ${withPath.length}건 · 없음 ${targets.length - withPath.length}건`);
if (DRY) {
  for (const { r, cands } of withPath.slice(0, 40)) {
    console.log(`  ${r.id.padEnd(34)} ${cands.map((c) => c.how).join(" → ")}`);
  }
  if (withPath.length > 40) console.log(`  … 외 ${withPath.length - 40}건`);
  process.exit(0);
}

for (const d of ["books", "papers", "archives"]) mkdirSync(join(RAW, d), { recursive: true });

const results = new Map();
let done = 0;

async function work({ r, cands }) {
  const dir = join(RAW, bucket(r.type));
  // 이미 받아 둔 것은 다시 받지 않는다. 서버에 부담을 주지 않고 재실행이 싸진다.
  for (const ext of ["pdf", "txt", "html"]) {
    const p = join(dir, `${r.id}.${ext}`);
    if (existsSync(p) && statSync(p).size > 2048) {
      results.set(r.id, { state: "확보", path: p, how: "이미 보관", bytes: statSync(p).size });
      return;
    }
  }
  const tried = [];
  for (const c of cands) {
    const got = await fetchWithRetry(c.url);
    if (!got.ok) {
      tried.push(`${c.how}: ${got.error}`);
      continue;
    }
    const check = looksSubstantive(got.buf, c.ext, got.type);
    if (!check.ok) {
      tried.push(`${c.how}: ${check.why}`);
      continue;
    }
    const p = join(dir, `${r.id}.${c.ext}`);
    writeFileSync(p, got.buf);
    results.set(r.id, { state: "확보", path: p, how: c.how, bytes: got.buf.length });
    return;
  }
  results.set(r.id, { state: "미확보", reason: tried.join(" · ") || "공개 경로 없음" });
}

async function pool(items, n) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        await work(items[i]);
        done += 1;
        const r = results.get(items[i].r.id);
        const mark = r.state === "확보" ? `확보 ${Math.round(r.bytes / 1024)}KB (${r.how})` : `미확보 — ${r.reason.slice(0, 60)}`;
        console.log(`  [${String(done).padStart(3)}/${items.length}] ${items[i].r.id.padEnd(34)} ${mark}`);
        await new Promise((s) => setTimeout(s, 1200)); // 서버에 부담을 주지 않는다
      }
    }),
  );
}

await pool(withPath, CONCURRENCY);
for (const { r } of plan.filter((p) => !p.cands.length)) {
  results.set(r.id, { state: "미확보", reason: "공개 전문 경로가 알려져 있지 않다(유료 저널·상용 출판사 등)" });
}

const got = [...results.values()].filter((v) => v.state === "확보").length;
console.log(`\n확보 ${got} / ${targets.length}건`);
writeFileSync(
  join(RAW, "fetch-report.json"),
  JSON.stringify({ ran_at: new Date().toISOString().slice(0, 10), total: targets.length, obtained: got, results: Object.fromEntries(results) }, null, 2) + "\n",
);
console.log(`기록: ${join(RAW, "fetch-report.json")}`);
