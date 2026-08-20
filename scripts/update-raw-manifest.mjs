#!/usr/bin/env node
/**
 * `raw/fetch-report.json`을 읽어 `raw/MANIFEST.md`의 확보 현황 절을 다시 쓴다.
 *
 * 원문 파일은 저작권 때문에 커밋하지 않으므로 **이 표가 공개되는 유일한 산출물**이다.
 * 원문이 없어도 "무엇을 근거로 삼았는지"와 "확보를 시도했으나 왜 못 얻었는지"는 공개된다.
 *
 *   node scripts/update-raw-manifest.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";

const rep = JSON.parse(readFileSync("raw/fetch-report.json", "utf8"));
const src = new Map(JSON.parse(readFileSync("sources.json", "utf8")).map((r) => [r.id, r]));
const entries = Object.entries(rep.results);
const got = entries.filter(([, v]) => v.state === "확보").sort((a, b) => a[0].localeCompare(b[0]));

const byHow = {};
for (const [, v] of got) byHow[v.how] = (byHow[v.how] ?? 0) + 1;

/** 미확보 사유를 사람이 읽는 범주로 묶는다. 원문 사유는 fetch-report.json에 그대로 남는다. */
function reasonBucket(reason = "") {
  if (/공개 전문 경로가 알려져/.test(reason)) return "공개 경로가 알려져 있지 않다 (유료 저널·상용 출판사)";
  if (/HTTP 404/.test(reason)) return "공개 경로를 시도했으나 전문이 없다 (404)";
  if (/HTTP 40[13]/.test(reason)) return "서버가 접근을 차단했다 (401·403)";
  if (/시간초과/.test(reason)) return "시간초과";
  return "본문으로 보기 어려운 응답 (로그인 페이지·빈약한 내용 등)";
}
const byWhy = {};
for (const [, v] of entries.filter(([, v]) => v.state !== "확보")) {
  const k = reasonBucket(v.reason);
  byWhy[k] = (byWhy[k] ?? 0) + 1;
}

const bib = (id) => {
  const s = src.get(id) ?? {};
  return [s.authors, s.year ? `(${s.year})` : "", s.title].filter(Boolean).join(" ").slice(0, 90);
};

const tick = "`";
const rows = got.map(([id, v]) => `| ${id} | ${src.get(id)?.tier ?? "?"} | ${bib(id)} | ${tick}${v.path}${tick} | ${v.how} |`);

const section = [
  "## 원문 확보 현황 (" + rep.ran_at + ")",
  "",
  "`npm run fetch:raw`이 **공개 경로만** 시도한 결과다. 유료 장벽은 우회하지 않는다.",
  "",
  "| | 건수 |",
  "|---|---:|",
  `| **확보** | **${got.length}** |`,
  `| 미확보 | ${rep.total - got.length} |`,
  `| 합계 | ${rep.total} |`,
  "",
  "확보 경로별: " + Object.entries(byHow).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "),
  "",
  "미확보 사유별:",
  "",
  ...Object.entries(byWhy).sort((a, b) => b[1] - a[1]).map(([k, v]) => `- ${k} — ${v}건`),
  "",
  "**`미확보`는 `없음`이 아니다.** 레지스트리와 아카이브 조회는 자주 실패하고, 한 번의 실패를",
  "부재로 기록하면 실재하는 문헌을 버리게 된다. archive.org 19건 중 17건이 여기 해당한다 —",
  "대출 전용 도서라 전문 텍스트가 공개되지 않을 뿐 자료 자체는 실재한다.",
  "",
  `### 확보한 ${got.length}건`,
  "",
  "| id | tier | 서지 | 보관 위치 | 경로 |",
  "|---|---|---|---|---|",
  ...rows,
  "",
].join("\n");

let m = readFileSync("raw/MANIFEST.md", "utf8");
// 이미 있으면 통째로 갈아 끼운다. 실행마다 절이 쌓이면 어느 것이 최신인지 알 수 없다.
m = m.replace(/## 원문 확보 현황[\s\S]*?(?=\n## )/, "");
m = m.replace("## 등재 규칙", section + "\n## 등재 규칙");
writeFileSync("raw/MANIFEST.md", m);
console.log(`MANIFEST 갱신 — 확보 ${got.length} / ${rep.total}건`);
