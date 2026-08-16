import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bibliographicFallbackKey,
  findSourceDuplicates,
  normalizePersistentIdentifier,
  validateSourceReview,
} from "../scripts/verify-source-expansion.mjs";

const verifiedSource = ({ pioneer, identity_signals, kind = "authored_by" }) => ({
  id: "fixture-source",
  tier: "A",
  type: "원논문",
  tier_review: { rule: "1-original-work", evidence: "fixture: 원저작 역할 확인" },
  authors: "Fixture Author",
  title: "Fixture Source",
  year: "2001",
  publisher: "Fixture Journal",
  url: "https://example.org/source",
  source_review: {
    existence: {
      status: "verified",
      method: "doi",
      record_id: "10.1000/fixture",
      evidence: "https://doi.org/10.1000/fixture",
      matched_fields: ["title", "authors", "year", "publisher"],
    },
    relation: {
      status: "verified",
      pioneer,
      kind,
      person_role: kind === "authored_by" ? "author" : undefined,
      evidence_url: "https://example.org/source",
      locator: "p. 1",
      evidence: "fixture 관계 근거",
      identity_signals,
    },
  },
});

test("DOI 표기 차이는 같은 영구 식별자다", () => {
  assert.equal(
    normalizePersistentIdentifier("doi", "https://doi.org/10.1000/ABC"),
    "doi:10.1000/abc",
  );
});

test("ISBN은 구분 기호 없이 정규화한다", () => {
  assert.equal(normalizePersistentIdentifier("isbn", "ISBN 978-1-4419-8126-4"), "isbn:9781441981264");
});

test("ERIC은 ED/EJ 레코드 번호를 정규화한다", () => {
  assert.equal(normalizePersistentIdentifier("eric", "https://eric.ed.gov/?id=EJ123456"), "eric:EJ123456");
});

test("OpenLibrary edition은 판본 id를 정규화한다", () => {
  assert.equal(
    normalizePersistentIdentifier("openlibrary_edition", "https://openlibrary.org/books/OL12345M"),
    "openlibrary_edition:OL12345M",
  );
});

test("OCLC는 숫자 식별자를 정규화한다", () => {
  assert.equal(normalizePersistentIdentifier("oclc", "ocn 123-456-789"), "oclc:123456789");
});

test("제목·저자 집합·연도가 모두 있어야 fallback 키를 만든다", () => {
  assert.equal(
    bibliographicFallbackKey({ title: "Learning, Design!", authors: "B Author; A Author", year: "1994" }),
    "bibliographic:learning design|a author|b author|1994",
  );
  assert.equal(bibliographicFallbackKey({ title: "Learning Design", year: "1994" }), null);
});

test("제목·저자 순서·연도가 같으면 식별자 없는 중복 후보다", () => {
  const duplicates = findSourceDuplicates([
    { id: "first", title: "Learning, Design!", authors: "B Author; A Author", year: "1994" },
    { id: "second", title: "learning design", authors: "A Author; B Author", year: "1994" },
  ]);
  assert.deepEqual(duplicates.map((item) => item.ids), [["first", "second"]]);
});

test("영구 식별자가 같으면 서지가 달라도 중복 후보다", () => {
  const duplicates = findSourceDuplicates([
    { id: "first", doi: "10.1000/ABC", title: "First", authors: "A", year: "2001" },
    {
      id: "second",
      identifiers: { doi: "https://doi.org/10.1000/abc" },
      title: "Second",
      authors: "B",
      year: "2002",
    },
  ]);
  assert.deepEqual(duplicates.map((item) => item.ids), [["first", "second"]]);
});

test("새 행은 두 검토 상태가 verified여야 한다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  source.source_review.existence.status = "pending_manual";
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("verified")));
});

test("허용되지 않은 검토 상태는 오류다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  source.source_review.relation.status = "approved";
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("허용되지 않은 상태")));
});

test("존재 검토의 필수 근거가 비면 오류다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  source.source_review.existence.matched_fields = [];
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("matched_fields")));
});

test("관계 검토의 필수 근거가 비면 오류다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  source.source_review.relation.locator = "";
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("locator")));
});

test("context_only와 허용되지 않은 관계 kind는 오류다", () => {
  for (const kind of ["context_only", "mentions"]) {
    const source = verifiedSource({
      pioneer: "edgar-dale",
      kind,
      identity_signals: [{ kind: "field", value: "education", evidence_url: "https://example.org/paper" }],
    });
    assert.ok(validateSourceReview(source, { baselineIds: new Set() })
      .some((message) => message.includes("relation.kind")));
  }
});

test("authored_by는 허용된 person_role과 독립 식별 신호가 필요하다", () => {
  const source = verifiedSource({ pioneer: "edgar-dale", identity_signals: [] });
  source.source_review.relation.person_role = "reviewer";
  const errors = validateSourceReview(source, { baselineIds: new Set() });
  assert.ok(errors.some((message) => message.includes("person_role")));
  assert.ok(errors.some((message) => message.includes("식별 신호")));
});

test("John Keller authored_by는 두 신호와 강한 신호 하나가 필요하다", () => {
  const source = verifiedSource({
    pioneer: "john-keller",
    identity_signals: [{ kind: "coauthor", value: "Katsuaki Suzuki", evidence_url: "https://example.org/paper" }],
  });
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("고위험 동명이인")));
});

test("고위험 동명이인 검사는 관계 kind와 무관하다", () => {
  const source = verifiedSource({
    pioneer: "richard-clark",
    kind: "about",
    identity_signals: [{ kind: "field", value: "educational technology", evidence_url: "https://example.org/paper" }],
  });
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("고위험 동명이인")));
});

test("새 행은 A/B tier와 tier_review가 필요하고 changed_from을 허용하지 않는다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  source.tier = "C";
  source.tier_review.changed_from = "B";
  const errors = validateSourceReview(source, { baselineIds: new Set() });
  assert.ok(errors.some((message) => message.includes("tier C")));
  assert.ok(errors.some((message) => message.includes("changed_from")));
});

test("새 행에 tier_review가 없으면 기존 tier 검사 결과를 오류로 낸다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" }],
  });
  delete source.tier_review;
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("tier_review 누락")));
});

test("baseline id에는 source_review를 소급 요구하지 않는다", () => {
  assert.deepEqual(validateSourceReview(
    { id: "existing-source" },
    { baselineIds: new Set(["existing-source"]) },
  ), []);
});

test("근거 문장이 그럴듯해도 검증기는 의미의 참을 판결하지 않는다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "library-authority", value: "authority-1", evidence_url: "https://example.org/authority" }],
  });
  assert.deepEqual(validateSourceReview(source, { baselineIds: new Set() }), []);
});
