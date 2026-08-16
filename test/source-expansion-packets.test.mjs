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

test("작성 패킷은 승인 주장을 감사에서 실제로 꺼내 온다", () => {
  // 감사 스키마의 필드 이름은 `claim_seed`다. 패킷 빌더가 `claim_review`로 읽던
  // 동안 approved_claim은 언제나 undefined였고, 서술자는 어떤 주장을 써야 하는지
  // 모른 채 일했다. 파일럿에서 실제로 드러난 결함이라 회귀로 고정한다.
  const seed = {
    section: "주요 저작",
    claim: "1969년 3판은 브루너의 표상 논의를 반영해 원추를 수정했다.",
    locator: "판권지",
    evidence_url: "https://eric.ed.gov/?id=ED043234",
  };
  const packet = buildWriterPacket({
    slug: "edgar-dale",
    pageText: "---\ntitle: 에드거 데일\n---\n",
    audit: {
      approved_ids: ["dale-1969"],
      candidates: [{ source_id: "dale-1969", claim_seed: seed }],
    },
    sources: [{
      id: "dale-1969",
      tier: "A",
      type: "원저서",
      authors: "Edgar Dale",
      title: "Audiovisual Methods in Teaching, Third Edition",
      year: "1969",
      publisher: "Holt, Rinehart & Winston",
      url: "https://eric.ed.gov/?id=ED043234",
      source_review: {},
    }],
    conceptIds: [],
  });
  assert.deepEqual(packet.approved_sources[0].approved_claim, seed);
});
