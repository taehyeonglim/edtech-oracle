import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadPages } from "../scripts/wiki-parse.mjs";
import { auditCitationYears } from "../scripts/audit-citation-years.mjs";
import {
  buildSourceExpansionBaseline,
  candidateRequestCount,
  deriveSourceReviewStatus,
  validateCandidateEnvelope,
} from "../scripts/source-expansion-contracts.mjs";

test("후보 수는 max(2n, n+3)이다", () => {
  assert.equal(candidateRequestCount(1), 4);
  assert.equal(candidateRequestCount(6), 12);
});

test("존재와 관계가 모두 verified이고 허용 관계일 때만 verified다", () => {
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "verified", kind: "about" },
  }), "verified");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "pending_manual", kind: "about" },
  }), "pending_manual");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "rejected" },
    relation: { status: "verified", kind: "about" },
  }), "rejected");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "verified", kind: "context_only" },
  }), "pending_manual");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "approved" },
    relation: { status: "verified", kind: "about" },
  }), "pending_manual");
});

test("실제 시작 상태를 142/36/31/116/1~6으로 고정한다", () => {
  const sources = JSON.parse(readFileSync("sources.json", "utf8"));
  const pioneers = loadPages("wiki").filter((page) => page.fm.type === "pioneer");
  const baseline = buildSourceExpansionBaseline({
    sources,
    pioneers,
    citationYears: auditCitationYears({ wikiDir: "wiki", sourcesPath: "sources.json" }),
    commit: "9bacde1c0ef8f503a0e92e1de7d5d8e4cd78ab32",
  });
  assert.equal(baseline.source_ids.length, 142);
  assert.equal(Object.keys(baseline.pioneers).length, 36);
  const targets = Object.values(baseline.pioneers).filter((item) => item.required_additions > 0);
  assert.equal(targets.length, 31);
  assert.equal(targets.reduce((sum, item) => sum + item.required_additions, 0), 116);
  assert.deepEqual([...new Set(targets.map((item) => item.required_additions))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(baseline.citation_year_keys.candidates.length, 48);
  assert.equal(baseline.citation_year_keys.incomparable.length, 104);
});
