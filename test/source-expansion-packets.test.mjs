import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildCollectorPacket,
  buildWriterPacket,
} from "../scripts/source-expansion-packets.mjs";

const source = (id) => ({
  id,
  tier: "B",
  type: "연구 해설",
  authors: "Fixture Author",
  title: `Fixture ${id}`,
  year: "2001",
  publisher: "Fixture Press",
  url: `https://example.org/${id}`,
});

const collectorInput = ({ missing }) => ({
  slug: "edgar-dale",
  missing,
  page: {
    fm: {
      slug: "edgar-dale",
      title: "에드거 데일",
      role: "교육학자",
      life: "1900—1985",
      sources: [],
    },
    body: "## 핵심 명제\n경험의 원추를 설명한다.",
  },
  sources: [source("existing-source")],
});

test("writer 패킷은 그 위인의 승인 id만 포함한다", () => {
  const sources = [source("approved-a"), source("approved-b"), source("other-pioneer")];
  const packet = buildWriterPacket({
    slug: "edgar-dale",
    pageText: "현재 데일 페이지",
    audit: { approved_ids: ["approved-a", "approved-b"], candidates: [] },
    sources,
    conceptIds: ["community-of-practice", "performance-gap", "teaching-machine"],
  });
  assert.deepEqual(packet.approved_sources.map((item) => item.id), ["approved-a", "approved-b"]);
  assert.ok(!JSON.stringify(packet).includes("other-pioneer"));
  assert.equal(Object.hasOwn(packet, "sources"), false);
});

test("collector 패킷은 최종 id·tier·verified를 후보 모델에 맡기지 않는다", () => {
  const packet = buildCollectorPacket(collectorInput({ missing: 6 }));
  assert.equal(packet.requested_candidates, 12);
  assert.ok(packet.instructions.forbidden_decisions.includes("tier"));
  assert.ok(packet.instructions.forbidden_decisions.includes("verified"));
  assert.ok(packet.instructions.forbidden_decisions.includes("final_id"));
});

test("collector 패킷은 현재 출처와 전체 중복 색인에 판정 필드를 넣지 않는다", () => {
  const input = collectorInput({ missing: 1 });
  input.page.fm.sources = ["existing-source"];
  input.sources.push({ ...source("registry-source"), doi: "https://doi.org/10.1000/ABC" });
  const packet = buildCollectorPacket(input);
  assert.deepEqual(packet.existing_sources.map((item) => item.id), ["existing-source"]);
  assert.equal(packet.duplicate_index.length, 2);
  assert.equal(packet.duplicate_index[1].persistent_identifiers.doi, "10.1000/abc");
  assert.equal(Object.hasOwn(packet.existing_sources[0], "tier"), false);
  assert.equal(Object.hasOwn(packet.duplicate_index[0], "verified"), false);
  assert.equal(packet.output_schema.title, "CandidateEnvelope");
});

test("writer 패킷은 승인 id의 레지스트리 행이 빠지면 거부한다", () => {
  assert.throws(() => buildWriterPacket({
    slug: "edgar-dale",
    pageText: "현재 데일 페이지",
    audit: { approved_ids: ["approved-a", "missing-source"], candidates: [] },
    sources: [source("approved-a")],
    conceptIds: [],
  }), /승인 id의 레지스트리 행 누락/);
});
