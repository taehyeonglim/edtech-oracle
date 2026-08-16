import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSourceExpansionAudit,
  extractFootnoteClaims,
  validateAuditSchema,
} from "../scripts/source-expansion-audit.mjs";

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const bibliography = (title) => ({
  authors: ["Fixture Author"],
  title,
  year: "2001",
  publisher: "Fixture Press",
  url: "https://example.org/fixture",
  identifiers: {
    doi: null,
    isbn: null,
    eric: null,
    openlibrary_edition: null,
    oclc: null,
  },
});

const candidate = (candidateKey, title = candidateKey) => ({
  candidate_key: candidateKey,
  bibliography: bibliography(title),
  relation_proposal: {
    kind: "authored_by",
    person_role: "author",
    matched_name: "Fixture Author",
    locator: "p. 1",
    evidence_url: "https://example.org/fixture",
    evidence: "후보 관계 제안",
  },
  claim_seed: {
    section: "핵심 명제",
    claim: `${title}의 고유 주장이다.`,
    locator: "p. 1",
    evidence_url: "https://example.org/fixture",
  },
});

const approvedSource = (id) => ({
  id,
  tier: "A",
  tier_review: { rule: "1-original-work", evidence: "fixture 원저작" },
  source_review: {
    existence: {
      status: "verified",
      method: "fixture-record",
      record_id: "fixture-1",
      evidence: "fixture 레코드에서 서지를 확인했다.",
      matched_fields: ["title", "year"],
    },
    relation: {
      status: "verified",
      pioneer: "fixture-pioneer",
      kind: "authored_by",
      person_role: "author",
      evidence_url: "https://example.org/fixture",
      locator: "p. 1",
      evidence: "저자를 확인했다.",
      identity_signals: [{
        kind: "library-authority",
        value: "Fixture Author",
        evidence_url: "https://example.org/fixture",
      }],
    },
  },
});

test("각주 마커별로 같은 문단의 서로 다른 문장을 추출한다", () => {
  const markdown = [
    "## 교사와 영화평론가의 시선",
    "",
    "첫 문장은 영화 비평 교재를 설명한다.[^dale-1933] 또한 둘째 문장은 영화 내용 분석을 설명한다.[^dale-1935]",
    "",
    "[^dale-1933]: 첫 정의",
    "[^dale-1935]: 둘째 정의",
  ].join("\n");
  assert.deepEqual(extractFootnoteClaims(markdown), [
    {
      source_id: "dale-1933",
      section: "교사와 영화평론가의 시선",
      claim: "첫 문장은 영화 비평 교재를 설명한다.",
    },
    {
      source_id: "dale-1935",
      section: "교사와 영화평론가의 시선",
      claim: "또한 둘째 문장은 영화 내용 분석을 설명한다.",
    },
  ]);
});

test("한 문장을 함께 받치는 연속 각주는 같은 문장을 각각 추출한다", () => {
  const claims = extractFootnoteClaims("## 핵심\n\n같은 주장이다.[^first][^second]\n");
  assert.deepEqual(claims.map((item) => item.claim), ["같은 주장이다.", "같은 주장이다."]);
});

test("승인되지 않은 후보도 판정과 사유를 갖고 감사에 남긴다", () => {
  const approved = candidate("candidate-01", "승인 문헌");
  const pending = candidate("candidate-02", "Dale–Chall 1948");
  const schema = readJson(".codex-tasks/source-expansion/audit.schema.json");
  const audit = buildSourceExpansionAudit({
    candidateEnvelope: { slug: "fixture-pioneer", candidates: [approved, pending] },
    slug: "fixture-pioneer",
    approvals: {
      approved: { "candidate-01": "fixture-approved" },
      decisions: {
        "candidate-02": {
          decision: "pending_manual",
          reason: "JSTOR가 봇 차단 페이지만 반환하고 Crossref에도 없어 확인하지 못했다.",
        },
      },
    },
    baseline: {
      pioneers: {
        "fixture-pioneer": {
          source_ids: ["existing-source"],
          required_additions: 1,
        },
      },
    },
    sources: [approvedSource("fixture-approved")],
    wikiText: "## 핵심 명제\n\n승인 문헌의 고유 주장이다.[^fixture-approved]\n",
    baseCommit: "0123456789abcdef",
    schema,
  });

  assert.equal(audit.base_commit, "0123456789abcdef");
  assert.deepEqual(audit.approved_ids, ["fixture-approved"]);
  assert.equal(audit.candidates[1].decision, "pending_manual");
  assert.match(audit.candidates[1].reason, /JSTOR.*Crossref/);
  assert.equal(audit.candidates[1].source_id, null);
  assert.deepEqual(validateAuditSchema(audit, schema), []);
});

test("승인되지 않은 후보의 판정 또는 사유를 추측하지 않는다", () => {
  const pending = candidate("candidate-02", "보류 문헌");
  assert.throws(() => buildSourceExpansionAudit({
    candidateEnvelope: { slug: "fixture-pioneer", candidates: [pending] },
    slug: "fixture-pioneer",
    approvals: {},
    baseline: {
      pioneers: {
        "fixture-pioneer": { source_ids: ["existing-source"], required_additions: 1 },
      },
    },
    sources: [],
    wikiText: "## 핵심 명제\n",
    baseCommit: "0123456789abcdef",
  }), /decision 누락/);
});

function daleCandidateEnvelope(existingAudit) {
  return {
    slug: existingAudit.slug,
    candidates: existingAudit.candidates.map((item) => ({
      candidate_key: item.candidate_key,
      bibliography: item.bibliography,
      relation_proposal: {
        kind: item.source_review.relation.kind,
        person_role: item.source_review.relation.person_role ?? "",
        matched_name: "Edgar Dale",
        locator: item.source_review.relation.locator ?? "",
        evidence_url: item.source_review.relation.evidence_url ?? "",
        evidence: item.source_review.relation.evidence ?? "",
      },
      claim_seed: item.claim_seed ?? {
        section: "보류 후보",
        claim: "승인 전에는 본문에 쓰지 않는다.",
        locator: "확인 전",
        evidence_url: item.bibliography.url,
      },
    })),
  };
}

test("데일 파일럿 감사 기록을 스키마 보정 외에는 그대로 재현한다", () => {
  const existing = readJson("docs/superpowers/audits/source-expansion/edgar-dale.json");
  const schema = readJson(".codex-tasks/source-expansion/audit.schema.json");
  const approvals = {
    candidates: existing.candidates.map((item) => ({
      candidate_key: item.candidate_key,
      decision: item.decision,
      reason: item.reason,
      source_id: item.source_id,
      corrections: item.corrections,
    })),
    citation_year_review: existing.citation_year_review,
  };
  const reproduced = buildSourceExpansionAudit({
    candidateEnvelope: daleCandidateEnvelope(existing),
    slug: "edgar-dale",
    approvals,
    baseline: readJson("docs/superpowers/audits/source-expansion/baseline.json"),
    sources: readJson("sources.json"),
    wikiText: readFileSync("wiki/pioneers/edgar-dale.md", "utf8"),
    baseCommit: existing.base_commit,
    schema,
  });

  const schemaCompliantExisting = structuredClone(existing);
  schemaCompliantExisting.candidates
    .find((item) => item.source_id === "masters-2013")
    .source_review.relation.person_role = null;
  assert.deepEqual(reproduced, schemaCompliantExisting);
  assert.deepEqual(validateAuditSchema(reproduced, schema), []);
});
