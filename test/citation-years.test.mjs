import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditCitationText,
  parseSourceYear,
  validateCitationYearReview,
} from "../scripts/audit-citation-years.mjs";

const sources = new Map([
  ["dale-1946", { id: "dale-1946", year: "1946" }],
  ["molenda-2003-cone", { id: "molenda-2003-cone", year: "2003" }],
  ["no-year", { id: "no-year" }],
  ["range", { id: "range", year: "1931–1942" }],
]);
const audit = (body) => auditCitationText(
  { file: "wiki/pioneers/edgar-dale.md", body, bodyStartLine: 1 },
  sources,
);

test("1969 주장과 dale-1946은 후보가 된다", () => {
  const report = audit("1969년에 개정했다.[^dale-1946]");
  assert.equal(report.candidates.length, 1);
  assert.equal(report.candidates[0].sourceId, "dale-1946");
});

test("1946 주장과 dale-1946은 후보가 아니다", () => {
  assert.equal(audit("1946년에 처음 냈다.[^dale-1946]").candidates.length, 0);
});

test("각주 id의 숫자는 주장 연도로 세지 않는다", () => {
  assert.deepEqual(audit("원추를 제시했다.[^dale-1946]"), { candidates: [], incomparable: [] });
});

test("한 블록의 오래된 출처 쌍만 후보가 된다", () => {
  const report = audit("1969년에 개정했다.[^dale-1946][^molenda-2003-cone]");
  assert.deepEqual(report.candidates.map((item) => item.sourceId), ["dale-1946"]);
});

test("연도 없는 출처는 비교 불가 목록으로 간다", () => {
  const report = audit("1969년에 개정했다.[^no-year]");
  assert.equal(report.candidates.length, 0);
  assert.equal(report.incomparable[0].sourceId, "no-year");
});

test("기간형 출처는 마지막 연도를 비교 기준으로 쓴다", () => {
  assert.equal(parseSourceYear("1931–1942"), 1942);
  assert.equal(audit("1942년에 끝났다.[^range]").candidates.length, 0);
  assert.equal(audit("1943년에 끝났다.[^range]").candidates.length, 1);
});

test("연도 감사 기록은 51개 후보와 113개 비교 불가를 모두 판정해야 한다", () => {
  const decided = (key) => ({
    key,
    file: "wiki/pioneers/x.md",
    line: 1,
    claimYear: 1969,
    sourceId: key,
    sourceYear: 1946,
    decision: "valid-context",
    reason: "같은 문단의 앞 문장을 받치는 판본으로 원문 대조 완료",
  });
  const review = {
    candidates: Array.from({ length: 51 }, (_, index) => decided(`candidate-${index}`)),
    incomparable: Array.from({ length: 113 }, (_, index) => ({
      ...decided(`incomparable-${index}`),
      sourceYear: null,
    })),
  };
  assert.deepEqual(validateCitationYearReview(review), []);
  delete review.candidates[0].decision;
  assert.ok(validateCitationYearReview(review).some((message) => message.includes("decision")));
});
