import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateCandidateEnvelope } from "./source-expansion-contracts.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const DEFAULT_BASELINE_PATH = resolve(
  REPO_ROOT,
  "docs/superpowers/audits/source-expansion/baseline.json",
);
const DEFAULT_SCHEMA_PATH = resolve(
  REPO_ROOT,
  ".codex-tasks/source-expansion/audit.schema.json",
);
const DECISIONS = new Set(["approved", "pending_manual", "rejected"]);
const FOOTNOTE_RE = /\[\^([^\]\s]+)\]/g;
const FOOTNOTE_DEF_RE = /^ {0,3}\[\^([^\]\s]+)\]:/;
const HEADING_RE = /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/;
const LIST_PREFIX_RE = /^ {0,3}(?:[-+*]|\d+[.)])\s+/;
const CLI_USAGE = [
  "사용법: source-expansion-audit.mjs --candidates path --pioneer slug --approvals path [옵션]",
  "옵션: --baseline path --sources path --wiki path --schema path",
].join("\n");

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const clone = (value) => structuredClone(value);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function flushBlock(blocks, current) {
  if (current.lines.length > 0) {
    blocks.push({ section: current.section, text: current.lines.join("\n") });
  }
  current.lines = [];
}

function proseBlocks(markdown) {
  const blocks = [];
  const current = { section: null, lines: [] };
  let frontmatterDelimiterCount = 0;
  let inFrontmatter = String(markdown).startsWith("---\n");
  let inDefinition = false;

  for (const line of String(markdown).split(/\r?\n/)) {
    if (inFrontmatter) {
      if (line === "---") {
        frontmatterDelimiterCount += 1;
        if (frontmatterDelimiterCount === 2) inFrontmatter = false;
      }
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      flushBlock(blocks, current);
      current.section = heading[1].trim();
      inDefinition = false;
      continue;
    }

    if (FOOTNOTE_DEF_RE.test(line)) {
      flushBlock(blocks, current);
      inDefinition = true;
      continue;
    }
    if (inDefinition) {
      if (line.trim() === "" || /^\s+/.test(line)) continue;
      inDefinition = false;
    }

    if (line.trim() === "") {
      flushBlock(blocks, current);
      continue;
    }
    if (LIST_PREFIX_RE.test(line)) {
      flushBlock(blocks, current);
      blocks.push({ section: current.section, text: line });
      continue;
    }
    current.lines.push(line);
  }
  flushBlock(blocks, current);
  return blocks;
}

function claimBeforeMarker(text, markerIndex) {
  let prefix = text.slice(0, markerIndex);
  prefix = prefix.replace(/(?:\s*\[\^[^\]\s]+\])+\s*$/u, "").trimEnd();
  const end = prefix.length;
  const beforeCurrentEnding = /[.!?。！？]$/u.test(prefix) ? prefix.slice(0, -1) : prefix;
  const boundary = /[.!?。！？](?:\s*\[\^[^\]\s]+\])*\s+/gu;
  let start = 0;
  for (const match of beforeCurrentEnding.matchAll(boundary)) {
    start = match.index + match[0].length;
  }
  return prefix
    .slice(start, end)
    .replace(FOOTNOTE_RE, "")
    .replace(LIST_PREFIX_RE, "")
    .trim();
}

/**
 * 각주 마커가 실제로 받치는 문장을 반환한다. 같은 문단의 각 마커를 독립적으로
 * 처리하므로 줄 전체를 두 출처에 복제하지 않는다.
 */
export function extractFootnoteClaims(markdown) {
  const claims = [];
  for (const block of proseBlocks(markdown)) {
    for (const marker of block.text.matchAll(FOOTNOTE_RE)) {
      const claim = claimBeforeMarker(block.text, marker.index);
      if (claim) claims.push({ source_id: marker[1], section: block.section, claim });
    }
  }
  return claims;
}

function normalizeSourceReview(review, { slug, candidate, status }) {
  const existence = review?.existence ?? {};
  const relation = review?.relation ?? {};
  return {
    existence: {
      status: existence.status ?? status,
      method: existence.method ?? null,
      record_id: existence.record_id ?? null,
      evidence: existence.evidence ?? (status === "pending_manual"
        ? "이 라운드에서 존재를 확인하지 못했다."
        : "검토 결과 등재하지 않았다."),
      matched_fields: clone(existence.matched_fields ?? []),
    },
    relation: {
      status: relation.status ?? status,
      pioneer: relation.pioneer ?? slug,
      kind: relation.kind ?? candidate.relation_proposal.kind,
      person_role: relation.person_role ?? null,
      evidence_url: relation.evidence_url ?? null,
      locator: relation.locator ?? null,
      evidence: relation.evidence ?? (status === "pending_manual"
        ? "존재가 확정되지 않아 관계를 판정하지 않았다."
        : "검토 결과 등재 관계를 인정하지 않았다."),
      identity_signals: clone(relation.identity_signals ?? []),
    },
  };
}

function normalizeDecisionLedger(input) {
  const entries = new Map();
  let citationYearReview = input?.citation_year_review ?? null;

  if (Array.isArray(input?.candidates)) {
    for (const item of input.candidates) entries.set(item.candidate_key, clone(item));
    return { entries, citationYearReview };
  }

  const hasEnvelope = isObject(input) && (
    isObject(input.approved) || isObject(input.approvals) || isObject(input.decisions)
  );
  const approved = hasEnvelope ? (input.approved ?? input.approvals ?? {}) : {};
  const decisions = hasEnvelope ? (input.decisions ?? {}) : input;
  const reasons = hasEnvelope ? (input.reasons ?? {}) : {};

  for (const [candidateKey, value] of Object.entries(decisions ?? {})) {
    if (candidateKey === "citation_year_review") continue;
    entries.set(candidateKey, typeof value === "string"
      ? { decision: "approved", source_id: value }
      : clone(value));
  }
  for (const [candidateKey, value] of Object.entries(approved)) {
    const sourceId = typeof value === "string" ? value : value?.source_id;
    entries.set(candidateKey, {
      ...(entries.get(candidateKey) ?? {}),
      ...(isObject(value) ? clone(value) : {}),
      decision: "approved",
      source_id: sourceId,
    });
  }
  for (const [candidateKey, reason] of Object.entries(reasons)) {
    entries.set(candidateKey, { ...(entries.get(candidateKey) ?? {}), reason });
  }
  return { entries, citationYearReview };
}

function approvedReason(source) {
  const evidence = source.source_review?.existence?.evidence;
  return evidence
    ? `존재와 관계를 각각 확인했다. ${evidence}`
    : "존재와 관계를 각각 확인했다.";
}

function candidateAudit(candidate, entry, sourceById, slug) {
  if (!entry || !DECISIONS.has(entry.decision)) {
    throw new Error(`${candidate.candidate_key}: decision 누락 또는 알 수 없는 값`);
  }
  if (entry.decision !== "approved" && !String(entry.reason ?? "").trim()) {
    throw new Error(`${candidate.candidate_key}: 승인되지 않은 후보의 reason 누락`);
  }

  if (entry.decision === "approved") {
    const source = sourceById.get(entry.source_id);
    if (!source) throw new Error(`${candidate.candidate_key}: 승인 source id ${entry.source_id} 누락`);
    if (entry.reason !== undefined && !String(entry.reason).trim()) {
      throw new Error(`${candidate.candidate_key}: reason 누락`);
    }
    return {
      candidate_key: candidate.candidate_key,
      decision: "approved",
      reason: entry.reason ?? approvedReason(source),
      source_id: entry.source_id,
      bibliography: clone(candidate.bibliography),
      source_review: normalizeSourceReview(entry.source_review ?? source.source_review, {
        slug,
        candidate,
        status: "verified",
      }),
      tier: entry.tier ?? source.tier,
      tier_review: clone(entry.tier_review ?? source.tier_review),
      claim_seed: clone(entry.claim_seed ?? candidate.claim_seed),
      corrections: clone(entry.corrections ?? []),
    };
  }

  return {
    candidate_key: candidate.candidate_key,
    decision: entry.decision,
    reason: entry.reason,
    source_id: null,
    bibliography: clone(candidate.bibliography),
    source_review: normalizeSourceReview(entry.source_review, {
      slug,
      candidate,
      status: entry.decision,
    }),
    tier: null,
    tier_review: null,
    corrections: clone(entry.corrections ?? []),
  };
}

function claimMapFor(candidates, wikiText) {
  const extracted = extractFootnoteClaims(wikiText);
  return candidates
    .filter((candidate) => candidate.decision === "approved")
    .map((candidate) => {
      const inSection = extracted.filter((item) => (
        item.source_id === candidate.source_id && item.section === candidate.claim_seed.section
      ));
      const exact = inSection.filter((item) => item.claim === candidate.claim_seed.claim);
      const matches = exact.length > 0 ? exact : inSection;
      if (matches.length !== 1) {
        throw new Error(
          `${candidate.source_id}: ${candidate.claim_seed.section}에서 각주가 받치는 문장을 하나로 확정할 수 없다`,
        );
      }
      return {
        source_id: candidate.source_id,
        section: matches[0].section,
        claim: matches[0].claim,
        evidence_locator: candidate.claim_seed.locator,
      };
    });
}

function schemaTypeMatches(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isObject(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function schemaAtRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`지원하지 않는 JSON Schema 참조: ${ref}`);
  return ref.slice(2).split("/").reduce((value, part) => value[part], root);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateSchemaNode(value, schema, path, root, errors) {
  if (schema.$ref) {
    validateSchemaNode(value, schemaAtRef(root, schema.$ref), path, root, errors);
    return;
  }
  if (schema.anyOf) {
    const matched = schema.anyOf.some((choice) => {
      const choiceErrors = [];
      validateSchemaNode(value, choice, path, root, choiceErrors);
      return choiceErrors.length === 0;
    });
    if (!matched) errors.push(`${path}: anyOf 불일치`);
    return;
  }
  if (schema.allOf) {
    for (const part of schema.allOf) validateSchemaNode(value, part, path, root, errors);
  }
  if (schema.if) {
    const conditionErrors = [];
    validateSchemaNode(value, schema.if, path, root, conditionErrors);
    if (conditionErrors.length === 0 && schema.then) {
      validateSchemaNode(value, schema.then, path, root, errors);
    }
  }
  if (schema.const !== undefined && !sameJson(value, schema.const)) {
    errors.push(`${path}: const 불일치`);
  }
  if (schema.enum && !schema.enum.some((item) => sameJson(value, item))) {
    errors.push(`${path}: enum 불일치`);
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => schemaTypeMatches(value, type))) {
      errors.push(`${path}: type 불일치`);
      return;
    }
  }
  if (typeof value === "number" && schema.minimum !== undefined && value < schema.minimum) {
    errors.push(`${path}: minimum 미달`);
  }
  if (Array.isArray(value)) {
    if (schema.uniqueItems) {
      const values = value.map((item) => JSON.stringify(item));
      if (new Set(values).size !== values.length) errors.push(`${path}: 중복 항목`);
    }
    if (schema.items) {
      value.forEach((item, index) => validateSchemaNode(item, schema.items, `${path}[${index}]`, root, errors));
    }
  }
  if (isObject(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: 필수 필드 누락`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(schema.properties ?? {}, key)) errors.push(`${path}.${key}: 허용되지 않은 필드`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        validateSchemaNode(value[key], childSchema, `${path}.${key}`, root, errors);
      }
    }
  }
}

export function validateAuditSchema(audit, schema) {
  const errors = [];
  validateSchemaNode(audit, schema, "$", schema, errors);
  return errors;
}

/** curator 판정과 현재 저장소 상태를 audit.schema.json 형태로 직렬화한다. */
export function buildSourceExpansionAudit({
  candidateEnvelope,
  slug,
  approvals,
  baseline,
  sources,
  wikiText,
  baseCommit,
  schema,
}) {
  const candidateErrors = validateCandidateEnvelope(candidateEnvelope);
  if (candidateErrors.length > 0) throw new Error(candidateErrors.join("\n"));
  if (candidateEnvelope.slug !== slug) throw new Error(`${slug}: 후보 JSON slug 불일치`);
  const pioneerBaseline = baseline.pioneers?.[slug];
  if (!pioneerBaseline) throw new Error(`${slug}: baseline 위인 기록 누락`);

  const { entries, citationYearReview } = normalizeDecisionLedger(approvals);
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const candidates = candidateEnvelope.candidates.map((candidate) => (
    candidateAudit(candidate, entries.get(candidate.candidate_key), sourceById, slug)
  ));
  const approvedIds = candidates
    .filter((candidate) => candidate.decision === "approved")
    .map((candidate) => candidate.source_id)
    .sort((left, right) => left.localeCompare(right));

  const audit = {
    schema_version: 1,
    slug,
    base_commit: baseCommit,
    initial_source_ids: [...pioneerBaseline.source_ids],
    required_additions: pioneerBaseline.required_additions,
    candidates,
    approved_ids: approvedIds,
    claim_map: claimMapFor(candidates, wikiText),
    citation_year_review: clone(citationYearReview ?? { candidates: [], incomparable: [] }),
  };
  if (schema) {
    const errors = validateAuditSchema(audit, schema);
    if (errors.length > 0) throw new Error(`감사 스키마 불일치:\n${errors.join("\n")}`);
  }
  return audit;
}

function option(argv, name, fallback = null) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function requireOption(argv, name) {
  const value = option(argv, name);
  if (!value) throw new Error(`${name} 값이 필요하다`);
  return value;
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function cli(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(CLI_USAGE);
    return;
  }
  const slug = option(argv, "--pioneer") ?? option(argv, "--slug");
  if (!slug) throw new Error(`--pioneer slug가 필요하다\n${CLI_USAGE}`);
  const candidatesPath = requireOption(argv, "--candidates");
  const approvalsPath = requireOption(argv, "--approvals");
  const baselinePath = option(argv, "--baseline", DEFAULT_BASELINE_PATH);
  const sourcesPath = option(argv, "--sources", resolve(REPO_ROOT, "sources.json"));
  const wikiPath = option(argv, "--wiki", resolve(REPO_ROOT, `wiki/pioneers/${slug}.md`));
  const schemaPath = option(argv, "--schema", DEFAULT_SCHEMA_PATH);
  const audit = buildSourceExpansionAudit({
    candidateEnvelope: readJson(resolve(candidatesPath)),
    slug,
    approvals: readJson(resolve(approvalsPath)),
    baseline: readJson(resolve(baselinePath)),
    sources: readJson(resolve(sourcesPath)),
    wikiText: readFileSync(resolve(wikiPath), "utf8"),
    baseCommit: currentHead(),
    schema: readJson(resolve(schemaPath)),
  });
  process.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    cli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
