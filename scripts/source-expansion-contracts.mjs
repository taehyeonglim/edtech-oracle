export const REVIEW_STATUSES = new Set(["verified", "pending_manual", "rejected"]);
export const APPROVABLE_RELATIONS = new Set(["authored_by", "about", "criticizes"]);

export function candidateRequestCount(missing) {
  if (!Number.isInteger(missing) || missing < 1) throw new Error("missing은 1 이상의 정수여야 한다");
  return Math.max(2 * missing, missing + 3);
}

export function deriveSourceReviewStatus(review) {
  const existence = review?.existence?.status;
  const relation = review?.relation?.status;
  if (existence === "rejected" || relation === "rejected") return "rejected";
  if (
    existence === "verified" &&
    relation === "verified" &&
    APPROVABLE_RELATIONS.has(review?.relation?.kind)
  ) return "verified";
  return "pending_manual";
}

export function buildSourceExpansionBaseline({ sources, pioneers, citationYears, commit }) {
  const pioneerEntries = pioneers
    .map((page) => [page.fm.slug, {
      source_ids: [...page.fm.sources].sort(),
      initial_count: page.fm.sources.length,
      required_additions: Math.max(0, 10 - page.fm.sources.length),
    }])
    .sort(([left], [right]) => left.localeCompare(right));
  return {
    schema_version: 1,
    baseline_commit: commit,
    source_ids: sources.map((source) => source.id).sort(),
    source_count: sources.length,
    pioneers: Object.fromEntries(pioneerEntries),
    citation_year_keys: {
      candidates: citationYears.candidates.map((item) => item.key).sort(),
      incomparable: citationYears.incomparable.map((item) => item.key).sort(),
    },
    completion: { new_sources: 116, final_sources: 258, minimum_sources_per_pioneer: 10 },
  };
}

const CANDIDATE_KEYS = new Set(["candidate_key", "bibliography", "relation_proposal", "claim_seed"]);
const BIBLIOGRAPHY_KEYS = new Set(["authors", "title", "year", "publisher", "url", "identifiers"]);
const IDENTIFIER_KEYS = new Set(["doi", "isbn", "eric", "openlibrary_edition", "oclc"]);
const RELATION_PROPOSAL_KEYS = new Set([
  "kind", "person_role", "matched_name", "locator", "evidence_url", "evidence",
]);
const CLAIM_SEED_KEYS = new Set(["section", "claim", "locator", "evidence_url"]);
const PROPOSED_RELATIONS = new Set([...APPROVABLE_RELATIONS, "context_only"]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

function validateObject(value, path, allowedKeys, requiredKeys, errors) {
  if (!isObject(value)) {
    errors.push(`${path}는 객체여야 한다`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) errors.push(`${path}.${key}는 허용되지 않은 필드다`);
  }
  for (const key of requiredKeys) {
    if (!(key in value)) errors.push(`${path}.${key} 누락`);
  }
  return true;
}

function validateString(value, path, errors) {
  if (typeof value !== "string") errors.push(`${path}는 문자열이어야 한다`);
}

export function validateCandidateEnvelope(value) {
  const errors = [];
  if (!validateObject(value, "$", new Set(["slug", "candidates"]), ["slug", "candidates"], errors)) {
    return errors;
  }
  validateString(value.slug, "$.slug", errors);
  if (!Array.isArray(value.candidates)) {
    errors.push("$.candidates는 배열이어야 한다");
    return errors;
  }
  for (const [index, candidate] of value.candidates.entries()) {
    const path = `$.candidates[${index}]`;
    if (!validateObject(candidate, path, CANDIDATE_KEYS, CANDIDATE_KEYS, errors)) continue;
    validateString(candidate.candidate_key, `${path}.candidate_key`, errors);

    if (validateObject(
      candidate.bibliography,
      `${path}.bibliography`,
      BIBLIOGRAPHY_KEYS,
      BIBLIOGRAPHY_KEYS,
      errors,
    )) {
      if (!Array.isArray(candidate.bibliography.authors)) {
        errors.push(`${path}.bibliography.authors는 배열이어야 한다`);
      } else {
        for (const [authorIndex, author] of candidate.bibliography.authors.entries()) {
          validateString(author, `${path}.bibliography.authors[${authorIndex}]`, errors);
        }
      }
      for (const key of ["title", "year", "publisher", "url"]) {
        validateString(candidate.bibliography[key], `${path}.bibliography.${key}`, errors);
      }
      if (validateObject(
        candidate.bibliography.identifiers,
        `${path}.bibliography.identifiers`,
        IDENTIFIER_KEYS,
        IDENTIFIER_KEYS,
        errors,
      )) {
        for (const key of IDENTIFIER_KEYS) {
          const identifier = candidate.bibliography.identifiers[key];
          if (identifier !== null && typeof identifier !== "string") {
            errors.push(`${path}.bibliography.identifiers.${key}는 문자열 또는 null이어야 한다`);
          }
        }
      }
    }

    if (validateObject(
      candidate.relation_proposal,
      `${path}.relation_proposal`,
      RELATION_PROPOSAL_KEYS,
      RELATION_PROPOSAL_KEYS,
      errors,
    )) {
      for (const key of RELATION_PROPOSAL_KEYS) {
        validateString(candidate.relation_proposal[key], `${path}.relation_proposal.${key}`, errors);
      }
      if (!PROPOSED_RELATIONS.has(candidate.relation_proposal.kind)) {
        errors.push(`${path}.relation_proposal.kind는 허용된 관계여야 한다`);
      }
    }

    if (validateObject(
      candidate.claim_seed,
      `${path}.claim_seed`,
      CLAIM_SEED_KEYS,
      CLAIM_SEED_KEYS,
      errors,
    )) {
      for (const key of CLAIM_SEED_KEYS) {
        validateString(candidate.claim_seed[key], `${path}.claim_seed.${key}`, errors);
      }
    }
  }
  return errors;
}
