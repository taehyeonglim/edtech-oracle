import { deriveSourceReviewStatus } from "./source-expansion-contracts.mjs";
import { validateSourceTiers } from "./lint-wiki.mjs";

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
