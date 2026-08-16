import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { candidateRequestCount } from "./source-expansion-contracts.mjs";
import { loadPages, sections } from "./wiki-parse.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const BASELINE_PATH = resolve(
  REPO_ROOT,
  "docs/superpowers/audits/source-expansion/baseline.json",
);
const CANDIDATE_SCHEMA_PATH = resolve(
  REPO_ROOT,
  ".codex-tasks/source-expansion/candidate-output.schema.json",
);
const PERSISTENT_IDENTIFIER_KINDS = [
  "doi",
  "isbn",
  "eric",
  "openlibrary_edition",
  "oclc",
];

const CANDIDATE_OUTPUT_SCHEMA = readJson(CANDIDATE_SCHEMA_PATH);

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

const normalizeText = (value) => String(value ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

function normalizeIdentifier(kind, value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  let normalized = value.normalize("NFKC").trim();
  if (kind === "doi") normalized = normalized.toLowerCase()
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//, "").replace(/^doi:\s*/, "");
  if (kind === "isbn") normalized = normalized.toUpperCase().replace(/[^0-9X]/g, "");
  if (kind === "eric") normalized = normalized.toUpperCase().match(/(?:ED|EJ)\d+/)?.[0] ?? "";
  if (kind === "openlibrary_edition") {
    normalized = normalized.toUpperCase().match(/OL\d+M/)?.[0] ?? "";
  }
  if (kind === "oclc") normalized = normalized.match(/\d+/g)?.join("") ?? "";
  return normalized || null;
}

function duplicateIndexEntry(source) {
  const authors = (Array.isArray(source.authors)
    ? source.authors
    : String(source.authors ?? "").split(";"))
    .map(normalizeText)
    .filter(Boolean)
    .sort();
  const year = String(source.year ?? "").match(/(?:18|19|20)\d{2}/)?.[0] ?? null;
  const persistentIdentifiers = Object.fromEntries(PERSISTENT_IDENTIFIER_KINDS.map((kind) => [
    kind,
    normalizeIdentifier(kind, source[kind] ?? source.identifiers?.[kind]),
  ]));
  return {
    id: source.id,
    normalized_bibliography: {
      authors,
      title: normalizeText(source.title),
      year,
    },
    persistent_identifiers: persistentIdentifiers,
  };
}

export function buildCollectorPacket({ slug, missing, page, sources }) {
  if (page?.fm?.slug !== slug) throw new Error(`${slug}: 위인 페이지 slug 불일치`);
  if (!Array.isArray(sources)) throw new Error(`${slug}: sources는 배열이어야 한다`);

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const currentIds = [...new Set(page.fm.sources ?? [])].sort();
  const missingRows = currentIds.filter((id) => !sourceById.has(id));
  if (missingRows.length > 0) {
    throw new Error(`${slug}: 기존 출처의 레지스트리 행 누락 (${missingRows.join(", ")})`);
  }

  return {
    slug,
    pioneer: {
      canonical_name: page.fm.title,
      life: page.fm.life,
      role: page.fm.role,
    },
    missing,
    requested_candidates: candidateRequestCount(missing),
    current_sections: sections(page.body)
      .filter((section) => section.text.trim() !== "")
      .map((section) => ({ title: section.title, text: section.text.trim() })),
    existing_sources: currentIds.map((id) => duplicateIndexEntry(sourceById.get(id))),
    duplicate_index: sources
      .map(duplicateIndexEntry)
      .sort((left, right) => left.id.localeCompare(right.id)),
    instructions: {
      priority: ["original_work", "edition_or_followup", "direct_review_or_critique", "official_record"],
      relation_kinds: ["authored_by", "about", "criticizes", "context_only"],
      forbidden_decisions: ["final_id", "tier", "verified"],
      evidence_requirements: {
        relation: ["locator", "evidence_url", "evidence"],
        claim: ["distinct_claim", "locator", "evidence_url"],
      },
    },
    output_schema: CANDIDATE_OUTPUT_SCHEMA,
  };
}

export function buildWriterPacket({ slug, pageText, audit, sources, conceptIds }) {
  const approved = new Set(audit.approved_ids);
  const approvedSources = sources
    .filter((source) => approved.has(source.id))
    .sort((left, right) => left.id.localeCompare(right.id));
  if (approvedSources.length !== approved.size) throw new Error(`${slug}: 승인 id의 레지스트리 행 누락`);
  return {
    slug,
    target_file: `wiki/pioneers/${slug}.md`,
    current_page: pageText,
    approved_sources: approvedSources.map((source) => ({
      id: source.id,
      tier: source.tier,
      type: source.type,
      authors: source.authors,
      title: source.title,
      year: source.year ?? null,
      publisher: source.publisher,
      url: source.url,
      doi: source.doi ?? null,
      source_review: source.source_review,
      approved_claim: audit.candidates.find((item) => item.source_id === source.id)?.claim_review,
    })),
    allowed_concept_links: conceptIds.map((id) => `[[concepts/${id}]]`).sort(),
  };
}

function option(argv, name) {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : null;
}

function requireSlug(argv) {
  const slug = option(argv, "--pioneer");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("--pioneer에는 유효한 slug가 필요하다");
  }
  return slug;
}

function loadPioneer(slug) {
  const page = loadPages(resolve(REPO_ROOT, "wiki"))
    .find((item) => item.fm.type === "pioneer" && item.fm.slug === slug);
  if (!page) throw new Error(`${slug}: 위인 페이지 누락`);
  return page;
}

function collectPacket(argv) {
  const slug = requireSlug(argv);
  const missing = Number(option(argv, "--missing"));
  const baseline = readJson(BASELINE_PATH);
  if (!baseline.pioneers?.[slug]) throw new Error(`${slug}: baseline 위인 기록 누락`);
  return buildCollectorPacket({
    slug,
    missing,
    page: loadPioneer(slug),
    sources: readJson(resolve(REPO_ROOT, "sources.json")),
  });
}

function writerPacket(argv) {
  const slug = requireSlug(argv);
  const auditPath = option(argv, "--audit");
  const sourcesPath = option(argv, "--sources");
  if (!auditPath || !sourcesPath) {
    throw new Error("write에는 --audit path와 --sources path가 필요하다");
  }
  const audit = readJson(resolve(auditPath));
  if (audit.slug !== slug) throw new Error(`${slug}: 감사 기록 slug 불일치`);
  const page = loadPioneer(slug);
  const conceptIds = loadPages(resolve(REPO_ROOT, "wiki"))
    .filter((item) => item.fm.type === "concept")
    .map((item) => item.id.replace(/^concepts\//, ""));
  return buildWriterPacket({
    slug,
    pageText: readFileSync(page.file, "utf8"),
    audit,
    sources: readJson(resolve(sourcesPath)),
    conceptIds,
  });
}

function cli(argv) {
  const command = argv[0];
  if (!new Set(["collect", "write"]).has(command)) {
    throw new Error("사용법: source-expansion-packets.mjs collect|write --pioneer slug ...");
  }
  const packet = command === "collect" ? collectPacket(argv.slice(1)) : writerPacket(argv.slice(1));
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    cli(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
