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

test("고정된 baseline 파일이 142/36/31/116/1~6을 담는다", () => {
  // **살아 있는 저장소에서 다시 계산하지 않는다.** baseline은 확장 시작점을 얼려 둔
  // 스냅숏이고, 저장소는 위인 트랜잭션마다 거기서 멀어지는 것이 정상이다. 재계산해
  // 142를 단언하면 첫 트랜잭션이 성공하는 순간 이 테스트가 영구히 깨지고, 고치는
  // 방법은 확장을 멈추거나 숫자를 계속 갈아 끼우는 것뿐이다 — 둘 다 baseline의
  // 존재 이유를 없앤다. 파일럿에서 실제로 드러난 결함이다.
  const baseline = JSON.parse(
    readFileSync("docs/superpowers/audits/source-expansion/baseline.json", "utf8"),
  );
  assert.equal(baseline.source_ids.length, 142);
  assert.equal(Object.keys(baseline.pioneers).length, 36);
  const targets = Object.values(baseline.pioneers).filter((item) => item.required_additions > 0);
  assert.equal(targets.length, 31);
  assert.equal(targets.reduce((sum, item) => sum + item.required_additions, 0), 116);
  assert.deepEqual([...new Set(targets.map((item) => item.required_additions))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(baseline.citation_year_keys.candidates.length, 48);
  assert.equal(baseline.citation_year_keys.incomparable.length, 104);
});

test("baseline 생성기는 지금 저장소에서도 같은 모양을 만든다", () => {
  // 위 테스트가 파일을 읽으므로, 생성기 자체가 죽지 않았는지는 따로 확인한다.
  // 확장이 진행되면 건수는 달라지지만 위인 36명과 구조는 변하지 않는다.
  const sources = JSON.parse(readFileSync("sources.json", "utf8"));
  const pioneers = loadPages("wiki").filter((page) => page.fm.type === "pioneer");
  const live = buildSourceExpansionBaseline({
    sources,
    pioneers,
    citationYears: auditCitationYears({ wikiDir: "wiki", sourcesPath: "sources.json" }),
    commit: "HEAD",
  });
  assert.equal(Object.keys(live.pioneers).length, 36);
  assert.ok(live.source_ids.length >= 142, "확장은 출처를 줄이지 않는다");
  assert.equal(live.completion.minimum_sources_per_pioneer, 10);
});
