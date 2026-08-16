import { test } from "node:test";
import assert from "node:assert/strict";
import {
  auditExpansionWatchpoints,
  bibliographicFallbackKey,
  findCSoloSections,
  findSourceDuplicates,
  normalizePersistentIdentifier,
  validateCompletionReview,
  validateSourceReview,
  verifyPioneerTransaction,
  verifySourceExpansion,
} from "../scripts/verify-source-expansion.mjs";
import { loadPages } from "../scripts/wiki-parse.mjs";
import { makeWiki } from "./helpers.mjs";

const verifiedSource = ({
  pioneer,
  identity_signals,
  kind = "authored_by",
  id = "fixture-source",
  tier = "A",
}) => ({
  id,
  tier,
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

function fixtureWiki({ slug, startIds, newIds }) {
  const allIds = [...startIds, ...newIds];
  const claims = newIds.map((id, index) => `새 주장 ${index + 1}[^${id}]`).join("\n\n");
  const definitions = allIds.map((id) => (
    `[^${id}]: ${id} 서지 — tier ${newIds.includes(id) ? "A" : "B"} · [[sources/${id}]]`
  )).join("\n");
  const sourcePages = Object.fromEntries(newIds.map((id) => [
    `sources/${id}.md`,
    `---\ntitle: ${id}\ntype: source\nupdated: 2026-08-16\nsources: [${id}]\n---\n\n## 서지\n\n${id}[^${id}]\n\n## 티어\n\n**A**[^${id}]\n\n[^${id}]: ${id} 서지 — tier A · [[sources/${id}]]\n`,
  ]));
  const { wikiDir } = makeWiki({
    "index.md": `---\ntitle: Fixture Index\ntype: meta\nupdated: 2026-08-16\n---\n\n[[pioneers/${slug}]]\n`,
    [`pioneers/${slug}.md`]: `---\ntitle: Fixture Pioneer\ntype: pioneer\nslug: ${slug}\nupdated: 2026-08-16\nsources: [${allIds.join(", ")}]\nconfidence: high\n---\n\n## 핵심 명제\n\n${claims}\n\n${definitions}\n`,
    ...sourcePages,
  });
  return loadPages(wikiDir);
}

function expansionFixture({ requiredAdditions = 1 } = {}) {
  const slug = "fixture-pioneer";
  const startIds = Array.from(
    { length: 10 - requiredAdditions },
    (_, index) => `existing-${index + 1}`,
  );
  const newIds = Array.from({ length: requiredAdditions }, (_, index) => (
    index === 0 ? "new-source" : `new-source-${index + 1}`
  ));
  const baselineSources = startIds.map((id) => ({
    id,
    tier: "B",
    title: id,
    authors: "Existing Author",
    year: "1999",
  }));
  const newSources = newIds.map((id) => verifiedSource({
    id,
    pioneer: slug,
    identity_signals: [
      { kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" },
    ],
  }));
  const baseline = {
    source_ids: startIds,
    source_count: startIds.length,
    pioneers: {
      [slug]: {
        source_ids: startIds,
        initial_count: startIds.length,
        required_additions: requiredAdditions,
      },
    },
    citation_year_keys: { candidates: [], incomparable: [] },
    completion: {
      new_sources: requiredAdditions,
      final_sources: 10,
      minimum_sources_per_pioneer: 10,
    },
  };
  const audit = {
    slug,
    initial_source_ids: startIds,
    required_additions: requiredAdditions,
    candidates: newIds.map((sourceId) => ({ decision: "approved", source_id: sourceId })),
    approved_ids: newIds,
    claim_map: newIds.map((sourceId, index) => ({
      source_id: sourceId,
      section: "핵심 명제",
      claim: `새 주장 ${index + 1}`,
      evidence_locator: `p. ${index + 1}`,
    })),
    citation_year_review: { candidates: [], incomparable: [] },
  };
  return {
    slug,
    sources: [...baselineSources, ...newSources],
    pages: fixtureWiki({ slug, startIds, newIds }),
    baseline,
    audit,
    audits: [audit],
    changedPaths: [
      "sources.json",
      `wiki/pioneers/${slug}.md`,
      ...newIds.map((id) => `wiki/sources/${id}.md`),
      `docs/superpowers/audits/source-expansion/${slug}.json`,
    ],
    citationYears: { candidates: [], incomparable: [] },
  };
}

function baselineFixture() {
  const fixture = expansionFixture();
  fixture.sources = fixture.sources.filter((source) => fixture.baseline.source_ids.includes(source.id));
  fixture.pages = fixtureWiki({
    slug: fixture.slug,
    startIds: fixture.baseline.source_ids,
    newIds: [],
  });
  fixture.audits = [];
  delete fixture.audit;
  fixture.changedPaths = [];
  return fixture;
}

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

test("완결된 위인 트랜잭션은 승인·본문·source 페이지·감사를 함께 통과한다", () => {
  assert.deepEqual(verifyPioneerTransaction(expansionFixture()), []);
});

test("승인·프론트매터·각주 정의·claim map은 같은 새 id 집합이어야 한다", () => {
  const fixture = expansionFixture();
  fixture.audit.approved_ids = ["new-source"];
  fixture.audit.claim_map[0].source_id = "different-source";
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("승인 id와 claim map")));
});

test("새 각주 정의가 있어도 본문에서 참조하지 않으면 실패한다", () => {
  const fixture = expansionFixture();
  const page = fixture.pages.find((item) => item.fm.slug === fixture.slug);
  page.body = page.body.replace("새 주장 1[^new-source]", "새 주장 1");
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("본문 각주 참조")));
});

test("claim 문자열과 같은 id 각주는 지정 section에 함께 있어야 한다", () => {
  const fixture = expansionFixture();
  fixture.audit.claim_map[0].claim = "본문에 없는 주장";
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("claim 문자열과 각주가 같은 section")));
});

test("두 승인 id는 같은 claim 문자열을 공유할 수 없다", () => {
  const fixture = expansionFixture({ requiredAdditions: 2 });
  fixture.audit.claim_map[1].claim = fixture.audit.claim_map[0].claim;
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("새 주장 문자열은 출처별로 달라야")));
});

test("baseline 프론트매터 id나 기존 각주 정의를 삭제하면 실패한다", () => {
  const frontmatter = expansionFixture();
  const frontmatterPage = frontmatter.pages.find((item) => item.fm.slug === frontmatter.slug);
  frontmatterPage.fm.sources = frontmatterPage.fm.sources.filter((id) => id !== "existing-1");
  assert.ok(verifyPioneerTransaction(frontmatter)
    .some((message) => message.includes("기존 출처 id가 삭제")));

  const definition = expansionFixture();
  const definitionPage = definition.pages.find((item) => item.fm.slug === definition.slug);
  definitionPage.body = definitionPage.body.replace(/^\[\^existing-1\]:.*\n/m, "");
  assert.ok(verifyPioneerTransaction(definition)
    .some((message) => message.includes("기존 각주 정의가 삭제")));
});

test("시작 9건·부족분 1건이면 최종 sources 길이가 정확히 10이어야 한다", () => {
  const fixture = expansionFixture();
  const page = fixture.pages.find((item) => item.fm.slug === fixture.slug);
  page.fm.sources = page.fm.sources.slice(0, 9);
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("최종 sources 길이는 10")));
});

test("승인하지 않은 새 id와 다른 감사 기록이 소유한 id 사용을 거부한다", () => {
  const unapproved = expansionFixture();
  const page = unapproved.pages.find((item) => item.fm.slug === unapproved.slug);
  page.fm.sources.push("unapproved-extra");
  assert.ok(verifyPioneerTransaction(unapproved)
    .some((message) => message.includes("승인 id와 새 프론트매터")));

  const otherOwner = expansionFixture();
  otherOwner.audits.push({ slug: "other-pioneer", approved_ids: ["new-source"] });
  assert.ok(verifyPioneerTransaction(otherOwner)
    .some((message) => message.includes("다른 감사 기록도 소유")));
});

test("source 페이지 누락과 감사 밖 새 레지스트리 행을 거부한다", () => {
  const missingPage = expansionFixture();
  missingPage.pages = missingPage.pages.filter((page) => page.id !== "sources/new-source");
  assert.ok(verifyPioneerTransaction(missingPage)
    .some((message) => message.includes("source 페이지 누락")));

  const orphanRow = expansionFixture();
  orphanRow.sources.push(verifiedSource({
    id: "orphan-source",
    pioneer: orphanRow.slug,
    identity_signals: [
      { kind: "coauthor", value: "Fixture", evidence_url: "https://example.org/paper" },
    ],
  }));
  assert.ok(verifySourceExpansion({ ...orphanRow, mode: "progress" })
    .some((message) => message.includes("감사 기록에 없는 새 레지스트리 행")));
});

test("대상 위인 파일에서 새로 생긴 연도 key는 감사 판정이 필요하다", () => {
  const fixture = expansionFixture();
  fixture.citationYears.candidates.push({
    key: "wiki/pioneers/fixture-pioneer.md:12|new-source|2002|2001",
    file: "wiki/pioneers/fixture-pioneer.md",
    line: 12,
    claimYear: 2002,
    sourceId: "new-source",
    sourceYear: 2001,
  });
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("연도 key 판정 누락")));
});

test("위인 트랜잭션의 허용 업무 파일 밖 변경은 실패한다", () => {
  const fixture = expansionFixture();
  fixture.changedPaths.push("wiki/concepts/not-allowed.md");
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("허용 업무 파일 밖 변경")));
});

test("기본 진행 모드는 신규 행이 0개인 baseline에서 green이다", () => {
  const fixture = baselineFixture();
  assert.deepEqual(verifySourceExpansion({ ...fixture, mode: "progress" }), []);
});

test("완료 모드는 최종 건수·새 id·미완료 위인·review 누락을 모두 진단한다", () => {
  const fixture = baselineFixture();
  fixture.baseline.completion = {
    new_sources: 116,
    final_sources: 258,
    minimum_sources_per_pioneer: 10,
  };
  const errors = verifySourceExpansion({
    ...fixture,
    mode: "complete",
    completionReview: null,
  });
  assert.ok(errors.some((message) => message.includes("새 id 0/116")));
  assert.ok(errors.some((message) => message.includes("레지스트리 9/258")));
  assert.ok(errors.some((message) => message.includes("1명 미완료")));
  assert.ok(errors.some((message) => message.includes("completion review 누락")));
});

test("C 단독 section과 완료 감시 후보를 구조적으로 찾는다", () => {
  const pages = [{
    id: "pioneers/fixture-pioneer",
    fm: { type: "pioneer", slug: "fixture-pioneer" },
    body: "## C만\n\n주장[^c-source]\n\n## 병행\n\n주장[^c-source][^a-source]",
  }];
  const sourceById = new Map([
    ["c-source", { id: "c-source", tier: "C" }],
    ["a-source", { id: "a-source", tier: "A" }],
  ]);
  assert.deepEqual(findCSoloSections(pages, sourceById), [{
    page: "pioneers/fixture-pioneer",
    section: "C만",
    source_ids: ["c-source"],
  }]);

  const fixture = expansionFixture();
  const report = auditExpansionWatchpoints(fixture);
  assert.deepEqual(report.c_solo_sections, []);
  assert.deepEqual(validateCompletionReview(null, report), ["completion review 누락"]);
});
