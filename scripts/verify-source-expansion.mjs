import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { auditCitationYears } from "./audit-citation-years.mjs";
import { deriveSourceReviewStatus } from "./source-expansion-contracts.mjs";
import { validateSourceTiers } from "./lint-wiki.mjs";
import {
  footnoteBlocks,
  footnoteDefs,
  footnoteRefs,
  loadPages,
  sections,
  wikilinks,
} from "./wiki-parse.mjs";

const HIGH_RISK_PIONEERS = new Set(["john-keller", "richard-clark", "allan-collins"]);
const STRONG_IDENTITY_SIGNALS = new Set([
  "official-affiliation", "official-cv", "orcid", "viaf", "library-authority",
]);
const PERSISTENT_IDENTIFIER_KINDS = [
  "doi", "isbn", "eric", "openlibrary_edition", "oclc",
];
const REVIEW_STATUSES = new Set(["verified", "pending_manual", "rejected"]);
const APPROVABLE_RELATIONS = new Set(["authored_by", "about", "criticizes"]);
const PERSON_ROLES = new Set(["author", "editor", "interviewee"]);
const CITATION_YEAR_DECISIONS = new Set([
  "remove-citation", "replace-citation", "valid-context", "metadata-corrected",
]);
const FOREIGN_TIER_A_DECISIONS = new Set([
  "valid-critique", "valid-analysis", "citation-scope-corrected", "tier-corrected",
]);
const EVIDENCE_PAGE_TYPES = new Set(["pioneer", "concept", "debate"]);

const normalizeText = (value) => String(value ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

export function normalizePersistentIdentifier(kind, value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  let normalized = value.normalize("NFKC").trim();
  if (kind === "doi") normalized = normalized.toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
  if (kind === "isbn") normalized = normalized.toUpperCase().replace(/[^0-9X]/g, "");
  if (kind === "eric") normalized = normalized.toUpperCase().match(/(?:ED|EJ)\d+/)?.[0] ?? "";
  if (kind === "openlibrary_edition") normalized = normalized.toUpperCase().match(/OL\d+M/)?.[0] ?? "";
  if (kind === "oclc") normalized = normalized.match(/\d+/g)?.join("") ?? "";
  return normalized ? `${kind}:${normalized}` : null;
}

export function bibliographicFallbackKey(source) {
  const title = normalizeText(source.title);
  const authors = (Array.isArray(source.authors) ? source.authors : String(source.authors ?? "").split(";"))
    .map(normalizeText).filter(Boolean).sort();
  const year = String(source.year ?? "").match(/(?:18|19|20)\d{2}/)?.[0] ?? "";
  return title && authors.length && year ? `bibliographic:${title}|${authors.join("|")}|${year}` : null;
}

export function findSourceDuplicates(sources) {
  const idsByKey = new Map();
  for (const [index, source] of sources.entries()) {
    const sourceId = String(source.id ?? `(id 없음 ${index + 1})`);
    const keys = new Set();
    for (const kind of PERSISTENT_IDENTIFIER_KINDS) {
      const values = [source[kind], source.identifiers?.[kind]];
      for (const value of values) {
        const key = normalizePersistentIdentifier(kind, value);
        if (key) keys.add(key);
      }
    }
    const fallbackKey = bibliographicFallbackKey(source);
    if (fallbackKey) keys.add(fallbackKey);

    for (const key of keys) {
      if (!idsByKey.has(key)) idsByKey.set(key, new Set());
      idsByKey.get(key).add(sourceId);
    }
  }

  const duplicates = [];
  const seenIdSets = new Set();
  for (const [key, idSet] of idsByKey) {
    if (idSet.size < 2) continue;
    const ids = [...idSet].sort();
    const signature = ids.join("\u0000");
    if (seenIdSets.has(signature)) continue;
    seenIdSets.add(signature);
    duplicates.push({ key, ids });
  }
  return duplicates;
}

function validateRequiredString(object, key, path, errors) {
  if (!isNonEmptyString(object?.[key])) errors.push(`${path}.${key} 누락 또는 빈 값`);
}

function validIdentitySignals(relation, errors) {
  if (!Array.isArray(relation?.identity_signals)) return [];
  const valid = [];
  for (const [index, signal] of relation.identity_signals.entries()) {
    const path = `source_review.relation.identity_signals[${index}]`;
    if (
      !signal ||
      typeof signal !== "object" ||
      Array.isArray(signal) ||
      !isNonEmptyString(signal.kind) ||
      !isNonEmptyString(signal.value) ||
      !isNonEmptyString(signal.evidence_url)
    ) {
      errors.push(`${path}의 kind/value/evidence_url 누락 또는 빈 값`);
      continue;
    }
    valid.push(signal);
  }
  return valid;
}

export function validateSourceReview(source, { baselineIds } = {}) {
  if (baselineIds?.has(source?.id)) return [];

  const label = source?.id ?? "(id 없음)";
  const errors = [];
  const review = source?.source_review;
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return [`${label}: source_review 누락`];
  }

  const existence = review.existence;
  const relation = review.relation;
  for (const [axis, value] of [["existence", existence], ["relation", relation]]) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${label}: source_review.${axis} 누락`);
      continue;
    }
    if (!REVIEW_STATUSES.has(value.status)) {
      errors.push(`${label}: source_review.${axis}.status 허용되지 않은 상태: ${value.status ?? "(누락)"}`);
    }
    if (value.status !== "verified") {
      errors.push(`${label}: 새 행의 source_review.${axis}.status는 verified여야 한다`);
    }
  }
  if (deriveSourceReviewStatus(review) !== "verified") {
    errors.push(`${label}: 파생 source_review 상태는 verified여야 한다`);
  }

  for (const key of ["method", "record_id", "evidence"]) {
    validateRequiredString(existence, key, "source_review.existence", errors);
  }
  if (
    !Array.isArray(existence?.matched_fields) ||
    existence.matched_fields.length === 0 ||
    existence.matched_fields.some((field) => !isNonEmptyString(field))
  ) {
    errors.push("source_review.existence.matched_fields 누락 또는 빈 값");
  }

  for (const key of ["pioneer", "kind", "evidence_url", "locator", "evidence"]) {
    validateRequiredString(relation, key, "source_review.relation", errors);
  }
  if (!APPROVABLE_RELATIONS.has(relation?.kind)) {
    errors.push(`${label}: source_review.relation.kind는 authored_by/about/criticizes 중 하나여야 한다`);
  }

  const identitySignals = validIdentitySignals(relation, errors);
  if (relation?.kind === "authored_by") {
    if (!PERSON_ROLES.has(relation.person_role)) {
      errors.push(`${label}: authored_by의 person_role은 author/editor/interviewee 중 하나여야 한다`);
    }
    if (identitySignals.length === 0) {
      errors.push(`${label}: authored_by에는 독립 식별 신호가 필요하다`);
    }
  }

  if (HIGH_RISK_PIONEERS.has(relation?.pioneer)) {
    const hasStrongSignal = identitySignals.some((signal) => STRONG_IDENTITY_SIGNALS.has(signal.kind));
    if (identitySignals.length < 2 || !hasStrongSignal) {
      errors.push(`${label}: 고위험 동명이인은 식별 신호 2개와 강한 신호 1개가 필요하다`);
    }
  }

  if (source?.tier === "C") errors.push(`${label}: 새 행에는 tier C를 허용하지 않는다`);
  if (!new Set(["A", "B"]).has(source?.tier)) {
    errors.push(`${label}: 새 행의 tier는 A 또는 B여야 한다`);
  }
  errors.push(...validateSourceTiers([source]).map((finding) => finding.message));
  if (Object.hasOwn(source ?? {}, "changed_from") || Object.hasOwn(source?.tier_review ?? {}, "changed_from")) {
    errors.push(`${label}: 새 행에는 changed_from을 허용하지 않는다`);
  }

  return errors;
}

const sameSet = (left, right) =>
  left.size === right.size && [...left].every((value) => right.has(value));

const asArray = (value) => Array.isArray(value) ? value : [];

function auditList(audits) {
  if (Array.isArray(audits)) return audits.filter(Boolean);
  if (audits instanceof Map) return [...audits.values()].filter(Boolean);
  if (audits && typeof audits === "object") return Object.values(audits).filter(Boolean);
  return [];
}

function normalizeRepoPath(file) {
  const normalized = isAbsolute(file) ? relative(process.cwd(), file) : file;
  return normalized.split(sep).join("/").replace(/^\.\//, "");
}

function citationItems(citationYears) {
  return [
    ...asArray(citationYears?.candidates).map((item) => ({ ...item, category: "candidates" })),
    ...asArray(citationYears?.incomparable).map((item) => ({ ...item, category: "incomparable" })),
  ];
}

function baselineCitationKeys(baseline) {
  return new Set([
    ...asArray(baseline?.citation_year_keys?.candidates),
    ...asArray(baseline?.citation_year_keys?.incomparable),
  ]);
}

function pioneerCitationItems(slug, citationYears, baseline) {
  const suffix = `wiki/pioneers/${slug}.md`;
  const baselineKeys = baselineCitationKeys(baseline);
  return citationItems(citationYears).filter((item) => (
    typeof item.key === "string" &&
    !baselineKeys.has(item.key) &&
    normalizeRepoPath(String(item.file ?? "")).endsWith(suffix)
  ));
}

function reviewCitationItems(review) {
  return [
    ...asArray(review?.candidates).map((item) => ({ ...item, category: "candidates" })),
    ...asArray(review?.incomparable).map((item) => ({ ...item, category: "incomparable" })),
  ];
}

function sourceOwnership(audits) {
  const owners = new Map();
  for (const audit of auditList(audits)) {
    for (const id of asArray(audit.approved_ids)) {
      if (!owners.has(id)) owners.set(id, []);
      owners.get(id).push(audit.slug ?? "(slug 없음)");
    }
  }
  return owners;
}

function transactionAllowedPaths(slug, approvedIds) {
  return new Set([
    "sources.json",
    `wiki/pioneers/${slug}.md`,
    ...[...approvedIds].map((id) => `wiki/sources/${id}.md`),
    `docs/superpowers/audits/source-expansion/${slug}.json`,
  ]);
}

function reachablePageIds(pages) {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const reached = new Set();
  const queue = ["index"];
  while (queue.length > 0) {
    const id = queue.shift();
    if (reached.has(id) || !byId.has(id)) continue;
    reached.add(id);
    queue.push(...wikilinks(byId.get(id).body));
  }
  return reached;
}

/**
 * 한 위인의 확장은 승인 id, 레지스트리, 위인 본문, source 페이지, 감사 기록이 모두
 * 맞물릴 때만 완료다. 자연어 근거의 진실은 판정하지 않고 구조와 기록 완결성만 검사한다.
 */
export function verifyPioneerTransaction({
  slug,
  sources,
  pages,
  baseline,
  audit,
  audits = audit ? [audit] : [],
  changedPaths = [],
  citationYears,
}) {
  const errors = [];
  const start = baseline.pioneers[slug];
  const page = pages.find((item) => item.fm.type === "pioneer" && item.fm.slug === slug);
  const baselineIds = new Set(baseline.source_ids);
  const startIds = new Set(start?.source_ids ?? []);
  const pageIds = new Set(page?.fm.sources ?? []);
  const newPageIds = new Set([...pageIds].filter((id) => !startIds.has(id)));
  const approvedIds = new Set(audit?.approved_ids ?? []);
  const definitionIds = new Set(footnoteDefs(page?.body ?? "").filter((id) => !startIds.has(id)));
  const claimIds = new Set((audit?.claim_map ?? []).map((item) => item.source_id));

  if (!start) errors.push(`${slug}: baseline 위인 기록 누락`);
  if (!page) errors.push(`${slug}: 위인 페이지 누락`);
  if (!audit) errors.push(`${slug}: 감사 기록 누락`);
  if (audit && audit.slug !== slug) errors.push(`${slug}: 감사 기록 slug 불일치`);
  if (audit && !sameSet(new Set(audit.initial_source_ids ?? []), startIds)) {
    errors.push(`${slug}: 감사 initial_source_ids와 baseline 불일치`);
  }
  if (audit && audit.required_additions !== start?.required_additions) {
    errors.push(`${slug}: 감사 required_additions와 baseline 불일치`);
  }

  if (!sameSet(newPageIds, approvedIds)) errors.push(`${slug}: 승인 id와 새 프론트매터 id 불일치`);
  if (!sameSet(definitionIds, approvedIds)) errors.push(`${slug}: 승인 id와 새 각주 정의 id 불일치`);
  if (!sameSet(claimIds, approvedIds)) errors.push(`${slug}: 승인 id와 claim map id 불일치`);
  if (![...startIds].every((id) => pageIds.has(id))) errors.push(`${slug}: 기존 출처 id가 삭제됐다`);
  const allDefinitionIds = new Set(footnoteDefs(page?.body ?? ""));
  if (![...startIds].every((id) => allDefinitionIds.has(id))) {
    errors.push(`${slug}: 기존 각주 정의가 삭제됐다`);
  }
  if (asArray(page?.fm.sources).length !== 10 || pageIds.size !== 10) {
    errors.push(`${slug}: 최종 sources 길이는 10이어야 한다`);
  }
  if (approvedIds.size !== start?.required_additions) {
    errors.push(`${slug}: 승인 수는 부족분 ${start?.required_additions}과 같아야 한다`);
  }

  const referenceIds = new Set(footnoteRefs(page?.body ?? "").filter((id) => !startIds.has(id)));
  if (!sameSet(referenceIds, approvedIds)) {
    errors.push(`${slug}: 승인 id와 새 본문 각주 참조 id 불일치`);
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  for (const item of audit?.claim_map ?? []) {
    const section = sections(page?.body ?? "").find((entry) => entry.title === item.section);
    if (!section?.text.includes(item.claim) || !section.text.includes(`[^${item.source_id}]`)) {
      errors.push(`${slug}: ${item.source_id} claim 문자열과 각주가 같은 section에 없다`);
    }
    if (!item.evidence_locator?.trim()) errors.push(`${slug}: ${item.source_id} 근거 위치 누락`);
  }
  if (
    new Set((audit?.claim_map ?? []).map((item) => String(item.claim ?? "").trim())).size !==
    approvedIds.size
  ) {
    errors.push(`${slug}: 새 주장 문자열은 출처별로 달라야 한다`);
  }

  const approvedCandidateIds = new Set(asArray(audit?.candidates)
    .filter((candidate) => candidate?.decision === "approved")
    .map((candidate) => candidate.source_id));
  if (audit && !sameSet(approvedCandidateIds, approvedIds)) {
    errors.push(`${slug}: 승인 id와 candidates의 approved source_id 불일치`);
  }
  if (asArray(audit?.approved_ids).length !== approvedIds.size) {
    errors.push(`${slug}: approved_ids에 중복 id가 있다`);
  }
  if (asArray(audit?.claim_map).length !== claimIds.size) {
    errors.push(`${slug}: claim map에 중복 source_id가 있다`);
  }
  if (footnoteDefs(page?.body ?? "").length !== allDefinitionIds.size) {
    errors.push(`${slug}: 각주 정의 id가 중복됐다`);
  }
  if (
    asArray(audit?.candidates).filter((candidate) => candidate?.decision === "approved").length !==
    approvedCandidateIds.size
  ) {
    errors.push(`${slug}: candidates의 approved source_id가 중복됐다`);
  }

  const definitionById = new Map(footnoteBlocks(page?.body ?? "")
    .map((block) => [block.id, block.text]));
  const reachable = reachablePageIds(pages);
  for (const id of approvedIds) {
    const source = sourceById.get(id);
    if (!source || baselineIds.has(id)) {
      errors.push(`${slug}: 승인 id ${id}가 신규 레지스트리 행이 아니다`);
      continue;
    }
    errors.push(...validateSourceReview(source, { baselineIds }));
    if (source.source_review?.relation?.pioneer !== slug) {
      errors.push(`${slug}: ${id}의 관계 pioneer가 대상 slug와 다르다`);
    }
    const sourcePage = pages.find((item) => item.fm.type === "source" && item.id === `sources/${id}`);
    if (!sourcePage) errors.push(`${slug}: ${id} source 페이지 누락`);
    if (!definitionById.get(id)?.includes(`[[sources/${id}]]`)) {
      errors.push(`${slug}: ${id} 위인 각주에서 source 페이지로 연결되지 않는다`);
    }
    if (sourcePage && !reachable.has(sourcePage.id)) {
      errors.push(`${slug}: ${id} source 페이지가 index에서 도달 불가다`);
    }
  }

  for (const duplicate of findSourceDuplicates(sources)) {
    if (duplicate.ids.some((id) => approvedIds.has(id))) {
      errors.push(`${slug}: 출처 중복 ${duplicate.key} (${duplicate.ids.join(", ")})`);
    }
  }

  const owners = sourceOwnership(audits);
  for (const id of approvedIds) {
    const idOwners = owners.get(id) ?? [];
    if (idOwners.length > 1) {
      errors.push(`${slug}: ${id}는 다른 감사 기록도 소유한다 (${idOwners.join(", ")})`);
    }
  }

  const expectedYearItems = pioneerCitationItems(slug, citationYears, baseline);
  const reviewedYearItems = reviewCitationItems(audit?.citation_year_review);
  const expectedYearKeys = new Set(expectedYearItems.map((item) => item.key));
  const reviewedYearKeys = new Set(reviewedYearItems.map((item) => item.key));
  if (reviewedYearItems.length !== reviewedYearKeys.size) {
    errors.push(`${slug}: 연도 판정 key가 중복됐다`);
  }
  for (const item of reviewedYearItems) {
    if (!CITATION_YEAR_DECISIONS.has(item.decision) || !isNonEmptyString(item.reason)) {
      errors.push(`${slug}: ${item.key ?? "(key 없음)"} 연도 판정 decision/reason 누락`);
    }
  }
  for (const key of expectedYearKeys) {
    if (!reviewedYearKeys.has(key)) errors.push(`${slug}: 연도 key 판정 누락: ${key}`);
  }
  for (const key of reviewedYearKeys) {
    if (!expectedYearKeys.has(key)) errors.push(`${slug}: 현재 감사에 없는 연도 key 판정: ${key}`);
  }

  const allowedPaths = transactionAllowedPaths(slug, approvedIds);
  for (const file of changedPaths.map(normalizeRepoPath)) {
    if (!allowedPaths.has(file)) errors.push(`${slug}: 허용 업무 파일 밖 변경: ${file}`);
  }
  return errors;
}

/** C만 인용한 근거 section을 찾는다. source 페이지 자체는 근거 서술 페이지가 아니므로 제외한다. */
export function findCSoloSections(pages, sourceById) {
  const findings = [];
  for (const page of pages) {
    if (!EVIDENCE_PAGE_TYPES.has(page.fm.type)) continue;
    for (const section of sections(page.body)) {
      const ids = [...new Set(footnoteRefs(section.text))];
      if (ids.length === 0) continue;
      const resolved = ids.map((id) => sourceById.get(id)).filter(Boolean);
      if (resolved.length !== ids.length || !resolved.every((source) => source.tier === "C")) continue;
      findings.push({ page: page.id, section: section.title, source_ids: ids.sort() });
    }
  }
  return findings;
}

function foreignTierACandidates(newSources, audits) {
  const owners = sourceOwnership(audits);
  const auditBySlug = new Map(auditList(audits).map((audit) => [audit.slug, audit]));
  const out = [];
  for (const source of newSources) {
    const relation = source.source_review?.relation;
    const foreign = source.tier === "A" && (
      relation?.kind === "about" ||
      relation?.kind === "criticizes" ||
      (relation?.kind === "authored_by" && relation?.person_role !== "author")
    );
    if (!foreign) continue;
    for (const slug of owners.get(source.id) ?? [relation?.pioneer ?? "(slug 없음)"]) {
      const claims = asArray(auditBySlug.get(slug)?.claim_map)
        .filter((item) => item.source_id === source.id);
      for (const claim of claims.length > 0 ? claims : [{}]) {
        const key = [slug, source.id, claim.section ?? "", claim.claim ?? ""].join("|");
        out.push({
          key,
          slug,
          source_id: source.id,
          relation_kind: relation?.kind ?? null,
          section: claim.section ?? null,
          claim: claim.claim ?? null,
        });
      }
    }
  }
  return out.sort((left, right) => left.key.localeCompare(right.key));
}

/** 전체 완료 뒤 사람이 판정할 C 단독·타인 A·새 연도 후보와 기계 집계를 만든다. */
export function auditExpansionWatchpoints({ sources, pages, baseline, audits = [], citationYears }) {
  const baselineIds = new Set(baseline.source_ids);
  const newSources = sources.filter((source) => !baselineIds.has(source.id));
  const owners = sourceOwnership(audits);
  const targetSlugs = Object.entries(baseline.pioneers)
    .filter(([, start]) => start.required_additions > 0)
    .map(([slug]) => slug);
  const pioneerBySlug = new Map(pages
    .filter((page) => page.fm.type === "pioneer")
    .map((page) => [page.fm.slug, page]));
  const incompleteTargetPioneers = targetSlugs.filter((slug) => (
    new Set(pioneerBySlug.get(slug)?.fm.sources ?? []).size !==
    baseline.completion.minimum_sources_per_pioneer
  ));
  const belowMinimumPioneers = Object.keys(baseline.pioneers).filter((slug) => (
    new Set(pioneerBySlug.get(slug)?.fm.sources ?? []).size <
    baseline.completion.minimum_sources_per_pioneer
  ));
  const incompletePioneers = [...new Set([
    ...incompleteTargetPioneers,
    ...belowMinimumPioneers,
  ])].sort();
  const unownedNewIds = newSources.map((source) => source.id)
    .filter((id) => !owners.has(id));
  const duplicateOwnedIds = [...owners]
    .filter(([, slugs]) => slugs.length !== 1)
    .map(([id]) => id);
  const newCitationItems = citationItems(citationYears)
    .filter((item) => !baselineCitationKeys(baseline).has(item.key))
    .map((item) => ({
      key: item.key,
      category: item.category,
      file: item.file,
      line: item.line,
      claimYear: item.claimYear,
      sourceId: item.sourceId,
      sourceYear: item.sourceYear,
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const reviewedCitationKeys = [...new Set(auditList(audits).flatMap((audit) => (
    reviewCitationItems(audit.citation_year_review).map((item) => item.key)
  )))].sort();

  return {
    summary: {
      new_sources: newSources.length,
      final_sources: sources.length,
      pioneers: pioneerBySlug.size,
      completed_target_pioneers: targetSlugs.length - incompleteTargetPioneers.length,
      target_pioneers: targetSlugs.length,
      audits: auditList(audits).length,
      new_source_pages: newSources.filter((source) => (
        pages.some((page) => page.fm.type === "source" && page.id === `sources/${source.id}`)
      )).length,
      new_tier_c: newSources.filter((source) => source.tier === "C").length,
      context_only: newSources.filter((source) => (
        source.source_review?.relation?.kind === "context_only"
      )).length,
      incomplete_pioneers: incompletePioneers,
      unowned_new_ids: unownedNewIds,
      duplicate_owned_ids: duplicateOwnedIds,
    },
    c_solo_sections: findCSoloSections(pages, new Map(sources.map((source) => [source.id, source]))),
    foreign_tier_a: foreignTierACandidates(newSources, audits),
    citation_year: newCitationItems,
    citation_year_review_keys: reviewedCitationKeys,
  };
}

function validateReviewedCandidates(reviewed, expected, decisions, label, errors) {
  const reviewedItems = asArray(reviewed);
  const expectedKeys = new Set(expected.map((item) => item.key));
  const reviewedKeys = new Set(reviewedItems.map((item) => item.key));
  if (!sameSet(expectedKeys, reviewedKeys)) errors.push(`${label} 후보와 판정 key 불일치`);
  if (reviewedItems.length !== reviewedKeys.size) errors.push(`${label} 판정 key 중복`);
  for (const item of reviewedItems) {
    if (!decisions.has(item.decision)) errors.push(`${label} ${item.key ?? "(key 없음)"}: decision 누락`);
    if (!isNonEmptyString(item.reason)) errors.push(`${label} ${item.key ?? "(key 없음)"}: reason 누락`);
  }
}

/** completion 감사가 기계 보고서의 후보를 빠짐없이 사람이 판정했는지만 확인한다. */
export function validateCompletionReview(review, report) {
  if (!review || typeof review !== "object" || Array.isArray(review)) {
    return ["completion review 누락"];
  }
  const errors = [];
  if (!isDeepStrictEqual(review.summary, report.summary)) {
    errors.push("completion review summary와 현재 집계 불일치");
  }
  if (report.c_solo_sections.length > 0) {
    const dale = report.c_solo_sections.some((item) => (
      item.page === "pioneers/edgar-dale" && item.section === "기억률 피라미드는 데일의 것이 아니다"
    ));
    if (dale) errors.push("edgar-dale: 「기억률 피라미드는 데일의 것이 아니다」가 여전히 C 단독");
    errors.push(`C 단독 section ${report.c_solo_sections.length}건`);
  }
  validateReviewedCandidates(
    review.foreign_tier_a,
    report.foreign_tier_a,
    FOREIGN_TIER_A_DECISIONS,
    "foreign_tier_a",
    errors,
  );
  validateReviewedCandidates(
    review.citation_year,
    report.citation_year,
    CITATION_YEAR_DECISIONS,
    "citation_year",
    errors,
  );
  const expectedCitationKeys = new Set(report.citation_year.map((item) => item.key));
  const auditCitationKeys = new Set(report.citation_year_review_keys);
  if (!sameSet(expectedCitationKeys, auditCitationKeys)) {
    errors.push("위인 감사의 연도 key 판정과 현재 새 연도 key 불일치");
  }
  return errors;
}

/** 진행 모드는 생긴 트랜잭션만, 완료 모드는 거기에 최종 건수와 completion 감사를 더 검사한다. */
export function verifySourceExpansion(input) {
  const {
    sources,
    pages,
    baseline,
    audits = [],
    citationYears = { candidates: [], incomparable: [] },
    mode = "progress",
    completionReview = null,
    changedPaths = [],
    changedPathsBySlug = {},
  } = input;
  const errors = [];
  const normalizedAudits = auditList(audits);
  const baselineIds = new Set(baseline.source_ids);
  const sourceIds = sources.map((source) => source.id);
  const currentIds = new Set(sourceIds);
  const newSources = sources.filter((source) => !baselineIds.has(source.id));
  const newIds = new Set(newSources.map((source) => source.id));
  const owners = sourceOwnership(normalizedAudits);

  for (const id of baselineIds) {
    if (!currentIds.has(id)) errors.push(`baseline 레지스트리 id 삭제: ${id}`);
  }
  for (const id of newIds) {
    if (!owners.has(id)) errors.push(`감사 기록에 없는 새 레지스트리 행: ${id}`);
    else if (owners.get(id).length !== 1) {
      errors.push(`새 id의 감사 소유권 중복: ${id} (${owners.get(id).join(", ")})`);
    }
  }
  for (const [id, slugs] of owners) {
    if (!newIds.has(id)) errors.push(`새 레지스트리 행이 없는 감사 승인 id: ${id} (${slugs.join(", ")})`);
  }
  for (const source of newSources) errors.push(...validateSourceReview(source, { baselineIds }));

  const idCounts = new Map();
  for (const id of sourceIds) idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  for (const [id, count] of idCounts) {
    if (count > 1) errors.push(`sources.json id 중복: ${id} (${count}건)`);
  }
  for (const duplicate of findSourceDuplicates(sources)) {
    if (duplicate.ids.some((id) => newIds.has(id))) {
      errors.push(`새 출처 중복 ${duplicate.key} (${duplicate.ids.join(", ")})`);
    }
  }

  const auditSlugs = new Set();
  for (const audit of normalizedAudits) {
    if (auditSlugs.has(audit.slug)) errors.push(`위인 감사 기록 중복: ${audit.slug}`);
    auditSlugs.add(audit.slug);
    errors.push(...verifyPioneerTransaction({
      ...input,
      audit,
      audits: normalizedAudits,
      slug: audit.slug,
      citationYears,
      changedPaths: changedPathsBySlug[audit.slug] ?? (
        normalizedAudits.length === 1 ? changedPaths : []
      ),
    }));
  }

  if (mode === "complete") {
    const expected = baseline.completion;
    if (newIds.size !== expected.new_sources) {
      errors.push(`새 id ${newIds.size}/${expected.new_sources}`);
    }
    if (sources.length !== expected.final_sources) {
      errors.push(`레지스트리 ${sources.length}/${expected.final_sources}`);
    }
    const pioneerBySlug = new Map(pages
      .filter((page) => page.fm.type === "pioneer")
      .map((page) => [page.fm.slug, page]));
    const incomplete = Object.keys(baseline.pioneers).filter((slug) => (
      new Set(pioneerBySlug.get(slug)?.fm.sources ?? []).size <
      expected.minimum_sources_per_pioneer
    ));
    if (incomplete.length > 0) {
      errors.push(`${incomplete.length}명 미완료 (최소 ${expected.minimum_sources_per_pioneer}건)`);
    }
    const report = auditExpansionWatchpoints({ sources, pages, baseline, audits, citationYears });
    errors.push(...validateCompletionReview(completionReview, report));
  } else if (mode !== "progress") {
    errors.push(`알 수 없는 검증 모드: ${mode}`);
  }
  return errors;
}

function arg(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function loadPioneerAudits(auditsDir) {
  if (!existsSync(auditsDir)) return [];
  return readdirSync(auditsDir)
    .filter((name) => name.endsWith(".json") && !new Set(["baseline.json", "completion.json"]).has(name))
    .sort()
    .map((name) => readJson(resolve(auditsDir, name)));
}

function changedPathsSince(baseCommit) {
  if (!baseCommit) return [];
  const tracked = execFileSync("git", ["diff", "--name-only", baseCommit, "--"], { encoding: "utf8" });
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    encoding: "utf8",
  });
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/).filter(Boolean))];
}

function cli(argv) {
  const wikiDir = arg(argv, "--wiki", "wiki");
  const sourcesPath = arg(argv, "--sources", "sources.json");
  const baselinePath = arg(
    argv,
    "--baseline",
    "docs/superpowers/audits/source-expansion/baseline.json",
  );
  const auditsDir = arg(
    argv,
    "--audits-dir",
    "docs/superpowers/audits/source-expansion",
  );
  const sources = readJson(sourcesPath);
  const pages = loadPages(wikiDir);
  const baseline = readJson(baselinePath);
  const audits = loadPioneerAudits(auditsDir);
  const citationYears = auditCitationYears({ wikiDir, sourcesPath });

  if (argv.includes("--report-json")) {
    console.log(JSON.stringify(
      auditExpansionWatchpoints({ sources, pages, baseline, audits, citationYears }),
      null,
      2,
    ));
    return;
  }

  const pioneer = arg(argv, "--pioneer", null);
  if (argv.includes("--pioneer") && !pioneer) {
    console.error("--pioneer에는 slug가 필요하다");
    process.exitCode = 1;
    return;
  }
  if (pioneer && argv.includes("--complete")) {
    console.error("--pioneer와 --complete는 함께 사용할 수 없다");
    process.exitCode = 1;
    return;
  }

  let errors;
  if (pioneer) {
    const audit = audits.find((item) => item.slug === pioneer);
    errors = verifyPioneerTransaction({
      slug: pioneer,
      sources,
      pages,
      baseline,
      audit,
      audits,
      changedPaths: changedPathsSince(audit?.base_commit),
      citationYears,
    });
  } else {
    const reviewPath = arg(argv, "--review", null);
    let completionReview = null;
    if (reviewPath) {
      if (existsSync(reviewPath)) completionReview = readJson(reviewPath);
      else completionReview = { __missing_path: reviewPath };
    }
    errors = verifySourceExpansion({
      sources,
      pages,
      baseline,
      audits,
      citationYears,
      mode: argv.includes("--complete") ? "complete" : "progress",
      completionReview,
    });
    if (completionReview?.__missing_path) {
      errors.unshift(`completion review 파일 없음: ${completionReview.__missing_path}`);
    }
  }

  for (const error of errors) console.error(error);
  if (errors.length === 0) {
    const newCount = sources.filter((source) => !new Set(baseline.source_ids).has(source.id)).length;
    console.log(`출처 확장 검증 통과: 새 id ${newCount}건, 완료 감사 ${audits.length}건`);
  }
  process.exitCode = errors.length === 0 ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cli(process.argv.slice(2));
}
