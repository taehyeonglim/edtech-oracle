# 위인별 출처 10건 확장 구현 계획

> **에이전트 작업자에게:** 이 계획은 후보 수집에 `codex exec -m gpt-5.6-sol -s read-only --skip-git-repo-check`, 본문 서술에 `codex exec -m gpt-5.6-sol -s workspace-write --skip-git-repo-check`를 명시해 과제 순서대로 실행한다. 각 단계는 체크박스(`- [ ]`)이고, 준비 커밋 뒤에는 위인 한 명을 하나의 green 트랜잭션으로 끝낸다.

**목표:** 현재 출처가 10건 미만인 위인 31명을 각각 정확히 10건으로 보강해 새 출처 116건·새 source 페이지 116개·서로 다른 근거 주장 116개를 만들고, 존재·관계·tier·주장·연도 판정의 완료 상태를 감사 기록과 `npm run verify:source-expansion`으로 잠근다.

**접근:** 후보 수집, `curator`의 검증·등재, 본문 서술의 권한을 분리한다. 데이터보다 먼저 후보/감사 스키마, 142건 baseline, 중복·검토 계약, 위인별/진행/완료 검증기를 TDD로 세운다. `edgar-dale`에 전체 트랜잭션을 한 번 파일럿한 뒤 그 결과로 실행 절차를 동결하고, 같은 절차에 `(slug, 부족분)`만 바꿔 나머지 30명을 순차 처리한다. 의미 판정은 `curator`가 URL과 원문 위치를 직접 대조하고, 코드는 판정의 빈칸·상태·id 대응·동명이인 신호·완료 수만 검사한다.

**기술 스택:** Node.js 22+ · node:test · JSON Schema Draft 2020-12 · Codex CLI 0.147.0 · `gpt-5.6-sol` · Git worktree · 런타임 의존성 0 (루트)

## 전역 제약

- 기준 데이터 커밋은 `9bacde1c0ef8f503a0e92e1de7d5d8e4cd78ab32`다. 계획 작성 시 HEAD `c0148cf3c9fe4c166e23c5be754d22bd121dff29`와 기준 커밋 사이에서 `sources.json`, `wiki/`, `scripts/`, `test/`, `package.json`, `CLAUDE.md`의 diff가 없음을 확인했다.
- 계획 작성 시 저장소에서 다시 계산한 시작값은 `sources.json` 142건, id 중복 0건, A 68 / B 57 / C 17, 위인 36명, 10건 미만 31명, 부족분 116건, 위인별 부족분 1~6건이다. 이 수치는 baseline 생성 테스트가 다시 계산하며 손으로 복사한 숫자만 신뢰하지 않는다.
- 시작 게이트는 모두 green이다. `npm run lint:strict`는 오류 0·경고 0, `npm test`는 171/171 통과, `npm run sync:confidence -- --dry`는 갱신/제거/건너뜀 0/0/0, `npm run lint:answers`는 exit 0·위조급 0·기존 형식급 55, `npm run audit:citation-years`는 exit 0·후보 48·비교 불가 104, `git diff --check`는 출력 없음이다. 저장소를 쓰지 않도록 `/tmp`에 출력한 사이트 빌드도 페이지 220·출처 142·HTML 226으로 통과했다.
- 준비 과제에서 새 검증기의 실패 테스트와 `--complete` 미완료 진단만 의도적으로 red일 수 있다. 준비 커밋 자체는 새 기본 진행 모드와 기존 게이트가 모두 green인 상태로 끝낸다. 위인 트랜잭션은 모든 산출물 조립과 confidence 동기화 뒤 첫 gate를 실행하고, 전 gate가 green일 때만 커밋한다.
- 위인 데이터 조립 중 strict lint의 실패 목록을 작업 큐로 쓰거나 예상 FAIL 명령을 실행하지 않는다. 승인 패킷·레지스트리 다음 상태·source 페이지 초안·감사 초안은 `/tmp`에 준비하고, 본문과 함께 완결된 뒤 worktree에 반영해 confidence를 동기화한 다음 첫 gate를 실행한다.
- `CLAUDE.md:29-71`의 각주·tier·confidence 계약을 그대로 지킨다. 새 출처도 프론트매터 `sources`와 각주 정의 집합이 같고, 각주 서지는 레지스트리 제목을 포함하며, 꼬리는 같은 id·tier의 source 링크로 끝나야 한다.
- 기존 lint 규칙 10은 `tier_review` 경로·근거와 자료형 기본값을 검사한다(`scripts/lint-wiki.mjs:23-79`). 규칙 11은 각주 꼬리의 id·tier를 검사하고 규칙 12는 source 페이지 `## 티어`를 검사한다(`scripts/lint-wiki.mjs:229-290`). 새 검증기는 이 규칙들을 대체하지 않고 확장 전용 관계·중복·주장·트랜잭션 계약을 더한다.
- 후보 수집, 검증·등재, 본문 서술의 세 권한을 섞지 않는다. 후보 수집기는 최종 id·tier·`verified`를 결정하지 않는다. 본문 서술기는 레지스트리 행이나 source 페이지를 만들지 않는다. `curator`만 후보의 의미를 판정하고 레지스트리·source 페이지·감사 기록을 준비한다.
- 후보 수집은 반드시 `-s read-only`다. 설치된 Codex의 전역 설정이 `danger-full-access`이므로 `-s`를 생략하지 않는다. read-only Codex에게 파일 저장을 요구하거나 `-o`를 주지 않고, 최종 JSON stdout을 바깥 셸이 저장한다. 진행 로그는 stderr로 저장소 밖 임시 디렉터리에 보낸다.
- 본문 서술은 반드시 `-s workspace-write`다. 입력 패킷에는 현재 위인 페이지, 기존 각주, 존재·관계·tier·주장이 승인된 그 위인의 새 id만 넣는다. 전체 `sources.json`, 다른 위인의 승인 id, 보류·탈락 후보는 넣지 않는다. 명시적 `-s`와 `--skip-git-repo-check`가 없는 기존 `scripts/run-expansion.sh:25-26` 호출은 이 Phase에서 재사용하지 않는다.
- 정적 지시문·JSON 출력 스키마·실행 절차는 `.codex-tasks/source-expansion/`에 커밋한다. 후보 JSON, 원문 발췌, stderr 로그, 동적 입력 패킷은 `mktemp -d`로 만든 저장소 밖 디렉터리에만 둔다. `.gitignore:7`의 `*.log`에 기대어 저장소 안에 실행 흔적을 숨기지 않는다.
- 한 위인의 최초 후보 수는 부족분을 `n`이라고 할 때 `max(2n, n+3)`이다. 승인 수가 모자라면 남은 부족분에 같은 공식을 다시 적용한다. 수집 실행은 저장소를 쓰지 않으므로 최대 3개까지 병렬화할 수 있지만, 최신 main과의 중복 재검사·등재·본문 수정·커밋은 위인별로 순차 실행한다.
- 존재와 관계를 독립 판정한다. 두 축의 상태는 `verified`·`pending_manual`·`rejected`뿐이다. 어느 한 축이라도 `rejected`면 전체가 `rejected`, 두 축이 모두 `verified`이고 관계가 `authored_by`·`about`·`criticizes`면 등재 가능, 나머지는 `pending_manual`이다. `pending_manual`과 `rejected`는 감사 기록에는 남지만 `sources.json`과 승인 id에는 들어가지 않는다.
- 의미 판정을 가짜 TDD로 포장하지 않는다. URL이 열린다는 사실, Crossref 검색 결과, 후보 모델의 요약, 검증기 통과만으로 실재·관계·tier·주장을 승인하지 않는다. `curator`가 서지와 원문 위치를 읽고 판정하며, 검증기는 허용 상태·필수 근거·id 대응·중복·동명이인 식별 신호·판정 누락만 검사한다.
- `John Keller`, `Richard Clark`, `Allan Collins` 관계 후보는 고위험 동명이인이다. 정규 이름 외 두 식별 신호가 필요하고, 그중 하나는 공식 소속/CV 또는 ORCID·VIAF·도서관 인명 전거여야 한다. 다른 `authored_by` 후보도 적어도 한 독립 식별 신호를 갖는다.
- tier는 `CLAUDE.md:37-54`의 순서로 `curator`가 관계 검증 뒤 판정한다. 새 할당량에는 A·B만 들어가며 C와 `context_only`는 0건이다. `confidence` 목표값을 프롬프트에 주지 않고 본문 완료 뒤 기존 동기화기가 계산한 값을 받아들인다.
- 새 출처 한 건은 `sources.json` 행, `wiki/sources/${id}.md`, 대상 위인의 고유 주장과 각주 참조, 프론트매터/각주 정의의 같은 id, 감사 기록의 원문 위치가 함께 있어야 한다. 한 문장에 새 각주 여러 개를 몰아 달아 여러 할당량을 동시에 채우지 않는다.
- 후보의 `bibliography.authors` 배열은 승인 행에서 기존 레지스트리 형식의 세미콜론 구분 문자열로 직렬화한다. DOI는 정규화한 최상위 `doi`에도 두고, DOI·ISBN·ERIC·OpenLibrary edition·OCLC는 `identifiers` 객체에 보존해 다음 트랜잭션의 중복 색인으로 쓴다.
- 위인 한 명의 업무 파일은 `sources.json`, 그 위인에게 승인된 새 source 페이지, `wiki/pioneers/${slug}.md`, `docs/superpowers/audits/source-expansion/${slug}.json`뿐이다. 승인 수가 부족하거나 한 항목이라도 실패하면 부분 커밋하지 않는다. 보류 branch는 main에 반영하지 않으며 전체 완료를 선언하지 않는다.
- 새 출처는 한 위인 트랜잭션만 소유한다. 비교 문헌도 이번 116건 중 하나의 소유 위인과 하나의 고유 주장에만 배정한다. 다른 위인 페이지에서 재사용하는 작업은 이 계획 범위가 아니다.
- `audit:citation-years`는 계속 비차단이다(`scripts/audit-citation-years.mjs:56-125`). baseline의 48개 후보 key와 104개 비교 불가 key를 매번 다시 판정하지 않고, 대상 위인 파일에서 새로 생기거나 바뀐 key만 해당 위인 감사 기록에 `decision`·`reason`으로 판정한다. 후보가 남는다는 이유로 strict lint나 allowlist를 만들지 않는다.
- `wiki/KNOWN-ISSUES.md:57-99`의 세 감시 조건을 마지막에 다시 판정한다. 데일의 C 단독 절을 A/B 병행으로 해소하고, 새 tier A가 타인의 원저작인 사용 위치를 전수 검토하며, 새 연도 후보를 전수 판정한다. 저자 불일치 A를 자동 B로 강등하거나 연도 후보를 자동 실패시키지 않는다.
- 봇, 라우터, concept·debate·answer 본문, 기존 142행의 `source_review` 소급 감사, 이미 10건 이상인 다섯 위인의 추가 확장, confidence 공식은 변경하지 않는다.

---

### 과제 1: 확장 계약·출력 스키마·142건 baseline을 먼저 고정한다

**파일:**
- 수정: `CLAUDE.md:29-71,89-97`
- 생성: `scripts/source-expansion-contracts.mjs`
- 생성: `test/source-expansion-contracts.test.mjs`
- 생성: `.codex-tasks/source-expansion/candidate-output.schema.json`
- 생성: `.codex-tasks/source-expansion/writer-output.schema.json`
- 생성: `.codex-tasks/source-expansion/audit.schema.json`
- 생성: `docs/superpowers/audits/source-expansion/baseline.json`

**인터페이스:**
- 사용: `loadPages(wikiDir): Page[]`, `auditCitationYears({ wikiDir, sourcesPath }): { candidates, incomparable }`
- 제공: `candidateRequestCount(missing: number): number`, `deriveSourceReviewStatus(review): "verified" | "pending_manual" | "rejected"`, `validateCandidateEnvelope(value): string[]`, `buildSourceExpansionBaseline({ sources, pioneers, citationYears, commit }): Baseline`; JSON Schema `CandidateEnvelope`, `WriterEnvelope`, `SourceExpansionAudit`

- [ ] **1단계: 실패하는 계약·baseline 테스트를 쓴다**

`test/source-expansion-contracts.test.mjs`에 상태 조합, 후보 수 공식, 후보 필수 필드, 실제 저장소 baseline 집계를 먼저 고정한다. 자연어 근거의 진실 여부를 판정하는 테스트는 쓰지 않는다.

```javascript
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadPages } from "../scripts/wiki-parse.mjs";
import { auditCitationYears } from "../scripts/audit-citation-years.mjs";
import {
  buildSourceExpansionBaseline,
  candidateRequestCount,
  deriveSourceReviewStatus,
  validateCandidateEnvelope,
} from "../scripts/source-expansion-contracts.mjs";

test("후보 수는 max(2n, n+3)이다", () => {
  assert.equal(candidateRequestCount(1), 4);
  assert.equal(candidateRequestCount(6), 12);
});

test("존재와 관계가 모두 verified이고 허용 관계일 때만 verified다", () => {
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "verified", kind: "about" },
  }), "verified");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "pending_manual", kind: "about" },
  }), "pending_manual");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "rejected" },
    relation: { status: "verified", kind: "about" },
  }), "rejected");
  assert.equal(deriveSourceReviewStatus({
    existence: { status: "verified" },
    relation: { status: "verified", kind: "context_only" },
  }), "pending_manual");
});

test("실제 시작 상태를 142/36/31/116/1~6으로 고정한다", () => {
  const sources = JSON.parse(readFileSync("sources.json", "utf8"));
  const pioneers = loadPages("wiki").filter((page) => page.fm.type === "pioneer");
  const baseline = buildSourceExpansionBaseline({
    sources,
    pioneers,
    citationYears: auditCitationYears({ wikiDir: "wiki", sourcesPath: "sources.json" }),
    commit: "9bacde1c0ef8f503a0e92e1de7d5d8e4cd78ab32",
  });
  assert.equal(baseline.source_ids.length, 142);
  assert.equal(Object.keys(baseline.pioneers).length, 36);
  const targets = Object.values(baseline.pioneers).filter((item) => item.required_additions > 0);
  assert.equal(targets.length, 31);
  assert.equal(targets.reduce((sum, item) => sum + item.required_additions, 0), 116);
  assert.deepEqual([...new Set(targets.map((item) => item.required_additions))].sort(), [1, 2, 3, 4, 5, 6]);
  assert.equal(baseline.citation_year_keys.candidates.length, 48);
  assert.equal(baseline.citation_year_keys.incomparable.length, 104);
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/source-expansion-contracts.test.mjs"`

기대: FAIL — `scripts/source-expansion-contracts.mjs`가 아직 없어 모듈을 불러오지 못한다. 이 red는 준비 과제의 새 계약을 세우는 실패다.

- [ ] **3단계: 최소 계약 구현과 두 출력 스키마를 추가한다**

`scripts/source-expansion-contracts.mjs`의 상태 계산과 baseline 생성은 다음 이름과 반환 구조를 그대로 쓴다.

```javascript
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
```

`CandidateEnvelope`은 `slug`와 `candidates` 배열을 최상위 필수값으로 두고, 각 후보에 `candidate_key`, `bibliography.authors/title/year/publisher/url/identifiers`, `relation_proposal.kind/person_role/matched_name/locator/evidence_url/evidence`, `claim_seed.section/claim/locator/evidence_url`을 모두 요구한다. 후보 관계 enum에는 탐색 단계의 탈락 신호를 보존하기 위해 `context_only`도 포함하되 최종 승인 관계에는 포함하지 않는다. `WriterEnvelope`은 `slug`, `modified_file`, `claim_map`을 요구하고 각 claim 행에 `source_id`, `section`, `claim`, `evidence_locator`를 요구한다. `SourceExpansionAudit`은 `schema_version/slug/base_commit/initial_source_ids/required_additions/candidates/approved_ids/claim_map/citation_year_review`를 필수로 하고, 후보 decision은 `approved|pending_manual|rejected`, 승인 행의 두 검증 status는 `verified`, 관계 kind는 세 승인 관계로 제한한다. 세 스키마 모두 `additionalProperties: false`를 사용한다.

`CLAUDE.md`에는 baseline 밖 새 행만 `source_review`를 요구하며, 의미는 `curator`가 판정하고 검증기는 완결성만 확인한다는 확장 계약과 세 검증 모드를 추가한다.

```markdown
## 출처 확장 검증

기준 감사의 142개 id 밖에 추가되는 모든 출처는 `source_review.existence`와
`source_review.relation`을 각각 기록한다. 두 상태가 모두 `verified`이고 관계가
`authored_by`·`about`·`criticizes`일 때만 등재한다. `pending_manual`·`rejected`,
`context_only`, tier C는 확장 할당량에 넣지 않는다.

이 상태는 자동 진실 판정이 아니다. `curator`가 URL과 원문 위치를 대조해 판정하고,
`npm run verify:source-expansion`은 빈 근거·허용되지 않은 상태·id 불일치·중복·
동명이인 식별 신호 누락·주장 맵 누락을 검사한다.
```

- [ ] **4단계: baseline을 생성하고 계약 테스트와 기존 게이트를 green으로 확인한다**

아래 명령의 stdout을 검토한 뒤 `apply_patch`로 `docs/superpowers/audits/source-expansion/baseline.json`에 그대로 추가한다. 파일에는 정렬된 142개 id와 36명 각각의 시작 id 집합이 생략 없이 들어가야 한다.

```bash
node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";
import { loadPages } from "./scripts/wiki-parse.mjs";
import { auditCitationYears } from "./scripts/audit-citation-years.mjs";
import { buildSourceExpansionBaseline } from "./scripts/source-expansion-contracts.mjs";

const baseline = buildSourceExpansionBaseline({
  sources: JSON.parse(readFileSync("sources.json", "utf8")),
  pioneers: loadPages("wiki").filter((page) => page.fm.type === "pioneer"),
  citationYears: auditCitationYears({ wikiDir: "wiki", sourcesPath: "sources.json" }),
  commit: "9bacde1c0ef8f503a0e92e1de7d5d8e4cd78ab32",
});
console.log(`${JSON.stringify(baseline, null, 2)}\n`);
NODE
```

실행:

```bash
node --test "test/source-expansion-contracts.test.mjs"
npm run lint:strict
npm test
npm run sync:confidence -- --dry
git diff --check
```

기대: 모두 PASS이고 confidence는 0/0/0이다. baseline은 142/36/31/116과 연도 key 48/104를 다시 산출한다.

- [ ] **5단계: 커밋**

```bash
git add CLAUDE.md scripts/source-expansion-contracts.mjs test/source-expansion-contracts.test.mjs .codex-tasks/source-expansion/candidate-output.schema.json .codex-tasks/source-expansion/writer-output.schema.json .codex-tasks/source-expansion/audit.schema.json docs/superpowers/audits/source-expansion/baseline.json
git commit -m "feat: define source expansion contracts and baseline"
```

---

### 과제 2: 존재·관계 완결성과 중복 검사를 TDD로 구현한다

**파일:**
- 생성: `scripts/verify-source-expansion.mjs`
- 생성: `test/source-expansion.test.mjs`
- 수정: `test/source-expansion-contracts.test.mjs`

**인터페이스:**
- 사용: `deriveSourceReviewStatus(review)`, `validateSourceTiers(sources): Finding[]`
- 제공: `normalizePersistentIdentifier(kind, value): string | null`, `bibliographicFallbackKey(source): string | null`, `findSourceDuplicates(sources): Duplicate[]`, `validateSourceReview(source, { baselineIds }): string[]`

- [ ] **1단계: 실패하는 정규화·중복·검토 완결성 테스트를 쓴다**

다섯 영구 식별자, `(제목, 저자 집합, 연도)` fallback, 허용 상태, 관계별 필수값, 일반 `authored_by`와 관계 종류를 가리지 않는 고위험 동명이인 식별 신호를 각각 독립 테스트한다.

```javascript
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

test("제목·저자 순서·연도가 같으면 식별자 없는 중복 후보다", () => {
  const duplicates = findSourceDuplicates([
    { id: "first", title: "Learning, Design!", authors: "B Author; A Author", year: "1994" },
    { id: "second", title: "learning design", authors: "A Author; B Author", year: "1994" },
  ]);
  assert.deepEqual(duplicates.map((item) => item.ids), [["first", "second"]]);
});

test("John Keller authored_by는 두 신호와 강한 신호 하나가 필요하다", () => {
  const source = verifiedSource({
    pioneer: "john-keller",
    identity_signals: [{ kind: "coauthor", value: "Katsuaki Suzuki", evidence_url: "https://example.org/paper" }],
  });
  assert.ok(validateSourceReview(source, { baselineIds: new Set() })
    .some((message) => message.includes("고위험 동명이인")));
});

test("근거 문장이 그럴듯해도 검증기는 의미의 참을 판결하지 않는다", () => {
  const source = verifiedSource({
    pioneer: "edgar-dale",
    identity_signals: [{ kind: "library-authority", value: "authority-1", evidence_url: "https://example.org/authority" }],
  });
  assert.deepEqual(validateSourceReview(source, { baselineIds: new Set() }), []);
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/source-expansion.test.mjs"`

기대: FAIL — 정규화·중복·`source_review` 검사 함수가 아직 없다.

- [ ] **3단계: 최소 정규화와 구조 검사를 구현한다**

영구 식별자는 종류별로 정규화하고, fallback에는 저자 집합을 반드시 포함한다. `validateSourceReview`는 baseline id에는 `source_review`를 요구하지 않고 baseline 밖 행만 검사한다.

```javascript
const HIGH_RISK_PIONEERS = new Set(["john-keller", "richard-clark", "allan-collins"]);
const STRONG_IDENTITY_SIGNALS = new Set([
  "official-affiliation", "official-cv", "orcid", "viaf", "library-authority",
]);

const normalizeText = (value) => String(value ?? "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\p{P}\p{S}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

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
```

`validateSourceReview`는 다음을 모두 오류로 낸다.

- 두 상태가 `verified`가 아니거나 파생 상태가 `verified`가 아닌 새 행
- `context_only` 또는 허용되지 않은 relation kind
- `existence.method/record_id/evidence/matched_fields`의 빈칸
- `relation.pioneer/kind/evidence_url/locator/evidence`의 빈칸
- `authored_by`의 `person_role` 누락 또는 `author|editor|interviewee` 밖 값
- 일반 `authored_by`의 식별 신호 0개
- 관계 종류와 무관하게 고위험 세 slug의 식별 신호 2개 미만 또는 강한 신호 0개
- 새 행의 tier C, `tier_review` 누락, `changed_from` 존재

- [ ] **4단계: 단위 테스트와 기존 142행 무회귀를 확인한다**

실행:

```bash
node --test "test/source-expansion.test.mjs" "test/source-expansion-contracts.test.mjs"
node --input-type=module <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findSourceDuplicates, validateSourceReview } from "./scripts/verify-source-expansion.mjs";

const sources = JSON.parse(readFileSync("sources.json", "utf8"));
const baselineIds = new Set(sources.map((source) => source.id));
assert.deepEqual(findSourceDuplicates(sources), []);
assert.deepEqual(sources.flatMap((source) => validateSourceReview(source, { baselineIds })), []);
console.log("기존 142행: 확장 소급 검사 없음, 중복 0건");
NODE
npm run lint:strict
npm test
```

기대: 모두 PASS. 기존 142행은 `source_review`가 없어도 통과하고, 기존 id·서지 중복은 0건이다.

- [ ] **5단계: 커밋**

```bash
git add scripts/verify-source-expansion.mjs test/source-expansion.test.mjs test/source-expansion-contracts.test.mjs
git commit -m "feat: validate source identity and relation reviews"
```

---

### 과제 3: 위인별·진행·완료 검증기와 npm 게이트를 TDD로 세운다

**파일:**
- 수정: `scripts/verify-source-expansion.mjs`
- 수정: `test/source-expansion.test.mjs`
- 사용: `test/helpers.mjs:1-18`
- 수정: `package.json:9-23`

**인터페이스:**
- 사용: `loadPages`, `footnoteDefs`, `footnoteRefs`, `sections`, `auditCitationYears`, `validateSourceTiers`, `validateSourceReview`, baseline/위인 감사 JSON
- 제공: `verifyPioneerTransaction(input): string[]`, `verifySourceExpansion(input): string[]`, `findCSoloSections(pages, sourceById): SectionFinding[]`, `auditExpansionWatchpoints(input): WatchpointReport`, `validateCompletionReview(review, report): string[]`; CLI `npm run verify:source-expansion [-- --pioneer slug | --complete --review path]`

- [ ] **1단계: 실패하는 위인 트랜잭션·진행·완료 모드 테스트를 쓴다**

`test/helpers.mjs`의 임시 위키 관례를 재사용해 baseline 1건과 신규 1건인 작은 fixture를 만들고 다음 위반을 한 테스트씩 고정한다.

- 승인 id ≠ 새 프론트매터 id ≠ 새 각주 정의 id
- 새 각주 정의는 있으나 본문 참조가 없음
- claim 문자열이 대상 section에 없거나 같은 id 각주를 참조하지 않음
- 두 승인 id가 같은 claim 문자열을 공유함
- 기존 각주나 baseline 프론트매터 id 삭제
- 시작 9건·부족분 1건인데 최종 길이가 10이 아님
- 승인하지 않은 새 id 또는 다른 감사 기록이 소유한 id 사용
- source 페이지 누락 또는 감사 밖 새 레지스트리 행
- 대상 위인 파일에서 새로 생긴 연도 key의 판정 누락
- 허용 업무 파일 밖 변경
- 완료 모드의 116/258/36명 최소 10 미달
- `edgar-dale`의 「기억률 피라미드는 데일의 것이 아니다」가 여전히 C 단독

```javascript
test("승인·프론트매터·각주 정의·claim map은 같은 새 id 집합이어야 한다", () => {
  const fixture = expansionFixture();
  fixture.audit.approved_ids = ["new-source"];
  fixture.audit.claim_map[0].source_id = "different-source";
  assert.ok(verifyPioneerTransaction(fixture)
    .some((message) => message.includes("승인 id와 claim map")));
});

test("기본 진행 모드는 신규 행이 0개인 baseline에서 green이다", () => {
  const fixture = baselineFixture();
  assert.deepEqual(verifySourceExpansion({ ...fixture, mode: "progress" }), []);
});

test("완료 모드는 최종 258건이 아니면 실패한다", () => {
  const fixture = baselineFixture();
  assert.ok(verifySourceExpansion({ ...fixture, mode: "complete", completionReview: null })
    .some((message) => message.includes("sources.json은 258건")));
});
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/source-expansion.test.mjs"`

기대: FAIL — 트랜잭션/진행/완료 검증 함수가 아직 없다.

- [ ] **3단계: 집합 대응·주장 위치·파일 범위 검증을 구현한다**

`verifyPioneerTransaction`은 baseline의 `source_ids`를 기준으로 새 집합을 계산하고 집합 비교를 공통 함수로 한다. 문자열 개수만 같다고 통과시키지 않는다.

```javascript
const sameSet = (left, right) =>
  left.size === right.size && [...left].every((value) => right.has(value));

export function verifyPioneerTransaction({
  slug,
  sources,
  pages,
  baseline,
  audit,
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

  if (!sameSet(newPageIds, approvedIds)) errors.push(`${slug}: 승인 id와 새 프론트매터 id 불일치`);
  if (!sameSet(definitionIds, approvedIds)) errors.push(`${slug}: 승인 id와 새 각주 정의 id 불일치`);
  if (!sameSet(claimIds, approvedIds)) errors.push(`${slug}: 승인 id와 claim map id 불일치`);
  if (![...startIds].every((id) => pageIds.has(id))) errors.push(`${slug}: 기존 출처 id가 삭제됐다`);
  if (pageIds.size !== 10) errors.push(`${slug}: 최종 sources 길이는 10이어야 한다`);
  if (approvedIds.size !== start?.required_additions) {
    errors.push(`${slug}: 승인 수는 부족분 ${start?.required_additions}과 같아야 한다`);
  }

  const sourceById = new Map(sources.map((source) => [source.id, source]));
  for (const item of audit?.claim_map ?? []) {
    const section = sections(page?.body ?? "").find((entry) => entry.title === item.section);
    if (!section?.text.includes(item.claim) || !section.text.includes(`[^${item.source_id}]`)) {
      errors.push(`${slug}: ${item.source_id} claim 문자열과 각주가 같은 section에 없다`);
    }
    if (!item.evidence_locator?.trim()) errors.push(`${slug}: ${item.source_id} 근거 위치 누락`);
  }
  if (new Set((audit?.claim_map ?? []).map((item) => item.claim.trim())).size !== approvedIds.size) {
    errors.push(`${slug}: 새 주장 문자열은 출처별로 달라야 한다`);
  }

  for (const id of approvedIds) {
    const source = sourceById.get(id);
    if (!source || baselineIds.has(id)) errors.push(`${slug}: 승인 id ${id}가 신규 레지스트리 행이 아니다`);
  }
  return errors;
}
```

완성 구현은 이 핵심에 source 페이지 존재, `validateSourceReview`, `validateSourceTiers`, 감사 후보 결정, 새 연도 key 결정, 허용 파일 검사를 더한다. CLI 모드는 다음 계약으로 고정한다.

| 호출 | 의미 | 시작 상태 |
|---|---|---|
| `npm run verify:source-expansion` | 진행 모드. 현재까지 추가된 모든 새 행·감사·완료 위인을 검사 | 신규 0건 baseline도 PASS |
| `npm run verify:source-expansion -- --pioneer edgar-dale` | 위인 한 명의 정확한 부족분·10건·허용 파일·claim/연도 판정을 검사 | 그 위인 트랜잭션 완료 뒤 PASS |
| `npm run verify:source-expansion -- --complete --review docs/superpowers/audits/source-expansion/completion.json` | 116/258/36명 최소 10과 감시 조건 전수 판정을 검사 | 31명 완료 뒤만 PASS |

`package.json` scripts에는 다음 한 줄을 추가한다.

```json
"verify:source-expansion": "node scripts/verify-source-expansion.mjs"
```

- [ ] **4단계: 새 게이트가 green에서 시작하고 완료 진단만 정확히 red인지 확인한다**

실행:

```bash
node --test "test/source-expansion.test.mjs"
npm run verify:source-expansion
complete_log="$(mktemp /tmp/edtech-oracle-source-expansion-complete.XXXXXX)"
if npm run verify:source-expansion -- --complete > "$complete_log" 2>&1; then
  cat "$complete_log"
  exit 1
fi
rg "새 id 0/116|레지스트리 142/258|31명 미완료|completion review 누락" "$complete_log"
npm run lint:strict
npm test
npm run verify:source-expansion
```

기대: 단위 테스트와 기본 진행 모드, 기존 lint/test는 PASS다. `--complete`만 FAIL하며 이유는 정확히 “새 id 0/116, 레지스트리 142/258, 31명 미완료, completion review 누락”이다. 이 명령은 준비 단계에서 최종 게이트가 실제로 닫혀 있음을 한 번 확인하는 진단이며 커밋 전 상시 gate 목록에는 넣지 않는다.

- [ ] **5단계: 커밋**

```bash
git add scripts/verify-source-expansion.mjs test/source-expansion.test.mjs package.json
git commit -m "feat: add source expansion transaction gate"
```

---

### 과제 4: Codex 입력 패킷·추적 가능한 프롬프트·재사용 실행 절차를 만든다

**파일:**
- 생성: `scripts/source-expansion-packets.mjs`
- 생성: `test/source-expansion-packets.test.mjs`
- 생성: `.codex-tasks/source-expansion/collect.md`
- 생성: `.codex-tasks/source-expansion/write.md`
- 생성: `.codex-tasks/source-expansion/runbook.md`

**인터페이스:**
- 사용: `candidateRequestCount(missing)`, baseline, 위인 페이지, `sources.json`, 위인 감사 JSON
- 제공: `buildCollectorPacket({ slug, missing, page, sources }): CollectorPacket`, `buildWriterPacket({ slug, pageText, audit, sources, conceptIds }): WriterPacket`; CLI `node scripts/source-expansion-packets.mjs collect|write --pioneer slug [--missing n | --audit path --sources path]`

- [ ] **1단계: 실패하는 최소 권한 패킷 테스트를 쓴다**

수집 패킷은 기존 id·정규화 서지·영구 식별자를 중복 탐지용으로 포함하고, 작성 패킷은 승인 id만 포함하는지 검사한다.

```javascript
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
    fm: { slug: "edgar-dale", title: "에드거 데일", role: "교육학자", life: "1900—1985", sources: [] },
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
```

- [ ] **2단계: 실패를 확인한다**

실행: `node --test "test/source-expansion-packets.test.mjs"`

기대: FAIL — 패킷 빌더가 아직 없다.

- [ ] **3단계: stdout 전용 패킷 빌더와 두 프롬프트를 구현한다**

`buildCollectorPacket`은 위인의 정규 이름·생몰연도·역할·실질 section, 현재 그 위인의 출처, 전체 레지스트리의 중복 색인, 부족분과 후보 수를 반환한다. `buildWriterPacket`은 승인 id를 먼저 집합 검증한 뒤 그 행만 직렬화한다.

```javascript
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
```

`.codex-tasks/source-expansion/collect.md`는 다음 권한을 명시한다.

```markdown
# 출처 확장 후보 수집

너는 후보 수집자다. 저장소와 웹을 읽고 입력 패킷의 위인에게 직접 관계된 실재 문헌 후보를 찾는다.
저장소 파일을 만들거나 수정하지 않는다. 최종 응답은 주어진 JSON Schema와 일치하는 JSON 하나다.

- 입력의 `requested_candidates`만큼 후보를 낸다.
- 본인 원저작, 판본·후속 저작, 직접 검토·비판 문헌, 공식 기관 기록 순으로 찾는다.
- 기존 id·영구 식별자·정규화 서지와 중복인 후보는 내지 않는다.
- Crossref 검색 성공을 관계나 tier의 증거로 쓰지 않는다.
- 최종 id, tier, `verified` 상태를 정하지 않는다.
- 관계 제안에는 원문 위치와 URL을, 주장 씨앗에는 서로 구분되는 구체 주장과 위치를 쓴다.
- 실재나 관계를 확인하지 못한 내용은 추측하지 않는다.

이 지시문 뒤에 `## 입력 패킷` JSON이 이어진다.
```

`.codex-tasks/source-expansion/write.md`는 다음 권한을 명시한다.

```markdown
# 승인 출처로 위인 본문 보강

너는 본문 서술자다. 입력 패킷의 `target_file` 하나만 수정한다.
`sources.json`, `wiki/sources/`, 감사 JSON, 다른 위인·concept·debate·answer 파일은 읽거나 수정하지 않는다.
인용 가능한 새 출처는 `approved_sources`가 전부이며, 이 목록 밖 새 id를 만들거나 인용하지 않는다.

- 승인 id마다 서로 다른 실질 주장 한 개 이상을 쓰고 같은 문장에 새 각주 여러 개를 몰아 달지 않는다.
- 각 주장은 `approved_claim`의 원문 위치가 받치는 범위만 말한다.
- 기존 본문·각주·프론트매터 id를 근거 없이 삭제하지 않는다.
- 프론트매터 `updated`를 `2026-08-16`으로 바꾼다.
- 프론트매터 sources와 각주 정의 집합을 정확히 같게 하고 알파벳 순으로 정리한다.
- 각주 서지는 입력 패킷의 필드를 그대로 쓰고 `— tier X · [[sources/id]]`로 끝낸다.
- 링크는 `allowed_concept_links`만 사용하고 새 개념은 `proposed_concepts`로만 제안한다.
- confidence를 목표로 쓰지 않는다. 파생값은 바깥 오케스트레이터가 동기화한다.

수정 뒤 최종 응답은 `slug`, `modified_file`, 승인 id별 `source_id/section/claim/evidence_locator`를 담은 JSON 하나다.
이 지시문 뒤에 `## 입력 패킷` JSON이 이어진다.
```

- [ ] **4단계: 실제 Codex 호출 경계를 dry-run 입력으로 검증한다**

`runbook.md`에는 후보 수집과 본문 서술 명령을 아래 형태로 고정한다. `--search`는 `exec` 앞의 전역 플래그이고, 두 실행 모두 `-s`를 명시한다.

```bash
repo="$(pwd -P)"
slug="edgar-dale"
missing="6"
run_dir="$(mktemp -d /tmp/edtech-oracle-source-expansion.edgar-dale.XXXXXX)"
worktree="$repo"
audit_path="$run_dir/$slug.audit.json"
next_sources_path="$run_dir/$slug.sources.json"

{
  sed -n '1,$p' "$worktree/.codex-tasks/source-expansion/collect.md"
  printf '\n## 입력 패킷\n'
  node "$worktree/scripts/source-expansion-packets.mjs" collect --pioneer "$slug" --missing "$missing"
} | codex --search exec -m gpt-5.6-sol -s read-only --skip-git-repo-check \
  --ephemeral -C "$worktree" \
  --output-schema "$worktree/.codex-tasks/source-expansion/candidate-output.schema.json" - \
  > "$run_dir/$slug.candidates.json" \
  2> "$run_dir/$slug.collect.log"

{
  sed -n '1,$p' "$worktree/.codex-tasks/source-expansion/write.md"
  printf '\n## 입력 패킷\n'
  node "$worktree/scripts/source-expansion-packets.mjs" write \
    --pioneer "$slug" \
    --audit "$audit_path" \
    --sources "$next_sources_path"
} | codex exec -m gpt-5.6-sol -s workspace-write --skip-git-repo-check \
  --ephemeral -C "$worktree" \
  --output-schema "$worktree/.codex-tasks/source-expansion/writer-output.schema.json" - \
  > "$run_dir/$slug.writer.json" \
  2> "$run_dir/$slug.write.log"
```

후보 호출에서 JSON 파일을 만드는 주체는 stdout redirect를 수행한 바깥 셸이다. 본문 호출의 workspace-write는 target 파일을 쓸 수 있지만, 뒤의 `git status --short`와 위인 검증기가 대상 파일 하나 밖의 수정을 거부한다.

실행:

```bash
node --test "test/source-expansion-packets.test.mjs"
node scripts/source-expansion-packets.mjs collect --pioneer edgar-dale --missing 6 | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const p=JSON.parse(s);if(p.requested_candidates!==12)process.exit(1)})'
npm run verify:source-expansion
npm run lint:strict
npm test
```

기대: PASS. 이 단계에서는 실제 모델을 호출하거나 저장소 데이터를 늘리지 않는다.

- [ ] **5단계: 커밋**

```bash
git add scripts/source-expansion-packets.mjs test/source-expansion-packets.test.mjs .codex-tasks/source-expansion/collect.md .codex-tasks/source-expansion/write.md .codex-tasks/source-expansion/runbook.md
git commit -m "feat: add least-privilege source expansion workflow"
```

---

### 과제 5: `edgar-dale` 파일럿으로 한 위인 트랜잭션을 끝까지 검증한다

**파일:**
- 수정: `sources.json:1-2021`
- 생성: `wiki/sources/` — `edgar-dale` 감사 기록의 `approved_ids` 6개와 같은 파일명
- 수정: `wiki/pioneers/edgar-dale.md:1-72`
- 생성: `docs/superpowers/audits/source-expansion/edgar-dale.json`

**인터페이스:**
- 사용: 과제 4의 collector/writer 패킷과 Codex 명령, `verifyPioneerTransaction`, `auditCitationYears`
- 제공: 시작 4건 + 승인 6건 = 정확히 10건인 데일 페이지; C 단독 「기억률 피라미드는 데일의 것이 아니다」에 직접 관계가 검증된 A 또는 B; 원자적 파일럿 커밋

이 과제는 코드 TDD가 아니라 후보와 원문의 편집 판정이다. `curator`가 존재·관계·tier·주장을 책임지고, 검증기는 그 판정의 구조와 완료만 잠근다. 데일을 고른 이유는 부족분 6이 최대이고, 현재 유일한 `confidence: low`이며, `wiki/pioneers/edgar-dale.md:31-34`의 C 단독 절을 같은 확장으로 해소해야 “넓히기가 깊이를 함께 해결한다”는 전제를 가장 강하게 시험하기 때문이다.

- [ ] **1단계: green main에서 파일럿 worktree와 저장소 밖 실행 디렉터리를 만든다**

```bash
npm run verify:source-expansion
npm run lint:strict
npm test

repo="$(pwd -P)"
slug="edgar-dale"
missing="6"
run_dir="$(mktemp -d /tmp/edtech-oracle-source-expansion.edgar-dale.XXXXXX)"
worktree_parent="$(mktemp -d /tmp/edtech-oracle-worktree.edgar-dale.XXXXXX)"
worktree="$worktree_parent/repo"
git worktree add -b "source-expansion/$slug" "$worktree" main
```

기대: 시작 게이트 PASS, 새 branch는 최신 green main을 가리키고 `run_dir`은 저장소 밖이다.

- [ ] **2단계: read-only 후보 수집을 stdout으로 받아 구조를 검증한다**

과제 4의 후보 명령을 `worktree`에서 실행한다. 비정상 종료, 빈 stdout, JSON Schema 불일치면 실행 전체를 버리고 같은 round를 다시 실행한다. 첫 round는 정확히 12개 후보를 요청한다.

```bash
test -s "$run_dir/edgar-dale.candidates.json"
node --input-type=module - "$run_dir/edgar-dale.candidates.json" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCandidateEnvelope } from "./scripts/source-expansion-contracts.mjs";
const value = JSON.parse(readFileSync(process.argv[2], "utf8"));
assert.deepEqual(validateCandidateEnvelope(value), []);
assert.equal(value.slug, "edgar-dale");
assert.equal(value.candidates.length, 12);
NODE
git -C "$worktree" status --short
```

기대: 후보 JSON은 유효하고 worktree status는 비어 있다. read-only Codex가 파일을 쓴 흔적이 하나라도 있으면 후보 결과를 승인 단계로 넘기지 않는다.

- [ ] **3단계: `curator`가 후보 중복을 판정한다**

각 후보에서 DOI·ISBN·ERIC·OpenLibrary edition·OCLC와 fallback key를 최신 main의 전체 레지스트리와 다시 비교한다. 같은 영구 식별자 또는 같은 정규화 제목·저자 집합·연도인 후보는 `rejected`와 구체 이유를 감사 기록에 남긴다. 판본 차이나 저자 누락은 자동 승인하지 않고 원문 판정으로 보낸다.

- [ ] **4단계: `curator`가 문헌 존재를 판정한다**

식별자 레코드, 공식 권호 목차, 도서관 서지, 표제지·판권지 가운데 실제로 확인한 경로로 제목·저자·연도·발행처를 대조한다. `existence`에는 `status/method/record_id/evidence/matched_fields`를 채운다. Crossref 미검색만으로 탈락시키지 않고, 끝내 확인할 수 없으면 `pending_manual`로 둔다.

- [ ] **5단계: `curator`가 관계와 동일인을 판정한다**

존재 판정과 별개로 데일 본인, 경험의 원추, 기억률 피라미드 오귀속을 직접 다루는 원문 위치를 읽는다. `relation`에는 `status/pioneer/kind/evidence_url/locator/evidence`를 채우고 `authored_by`면 `person_role`과 독립 `identity_signals`를 기록한다. 일반 매체교육 배경이나 참고문헌의 이름 한 번은 `rejected`다.

- [ ] **6단계: `curator`가 tier와 고유 주장을 판정한다**

두 축이 모두 `verified`인 후보만 실제 근거 역할로 tier를 정하고 `tier_review`를 작성한다. 각 후보의 주장 씨앗을 원문 위치와 대조해 데일의 실질 질문에 답하는 서로 다른 주장인지 판정한다. 특히 승인 집합에는 `wiki/pioneers/edgar-dale.md:31-34`의 기억률 피라미드 절을 직접 받칠 A 또는 B가 적어도 하나 있어야 한다.

- [ ] **7단계: 정확히 6건을 승인하고 다음 상태를 `/tmp`에 준비한다**

승인 수가 6 미만이면 남은 수를 새 `missing`으로 두고 `candidateRequestCount`만큼 추가 수집해 같은 감사 배열에 round를 보존한다. 정확히 6개가 된 뒤 최종 id를 부여하고, 다음 `sources.json` 내용·`wiki/sources/${id}.md` 6개·감사 JSON을 `run_dir`에 초안으로 준비한다. 이 단계에서는 worktree 파일을 쓰지 않는다. 저자 배열은 세미콜론 구분 문자열로 직렬화하고, DOI는 최상위 `doi`로 정규화하며 DOI·ISBN·ERIC·OpenLibrary edition·OCLC는 `identifiers`에도 보존한다. 각 source 페이지는 현재 형식(`wiki/sources/molenda-2003-cone.md:1-15`)대로 `## 서지`, `## 티어`, 자기 각주를 갖는다.

최종적으로 커밋할 `docs/superpowers/audits/source-expansion/edgar-dale.json`에는 `schema_version`, `slug`, 아래 명령이 출력한 `base_commit`, 네 개의 `initial_source_ids`, `required_additions: 6`, 모든 round의 후보와 최종 decision/reason, `approved_ids` 6개, 빈칸 없는 `claim_map`, `citation_year_review`를 생략 없이 기록한다. writer 전 입력은 같은 내용을 가진 `audit_path="$run_dir/edgar-dale.audit.json"`이고, 다음 레지스트리는 `next_sources_path="$run_dir/edgar-dale.sources.json"`이다.

```bash
git -C "$worktree" rev-parse HEAD
```

- [ ] **8단계: 승인 패킷만으로 본문 Codex를 실행한다**

과제 4의 workspace-write 명령을 실행한다. `run_dir/edgar-dale.writer.json`의 claim map을 실제 page와 대조해 감사 초안에 확정한다. 서술자가 다른 파일을 건드렸거나 승인 id 밖 출처를 사용했으면 그 실행을 폐기하고 승인 패킷부터 다시 만든다. writer가 대상 page만 올바르게 고친 뒤 `curator`가 `/tmp`의 다음 `sources.json`, source 페이지 6개, 완성 감사 JSON을 `apply_patch`로 worktree에 한 번에 반영한다.

- [ ] **9단계: 새 연도 key를 판정한다**

현재 감사 출력과 baseline의 key를 비교해 `wiki/pioneers/edgar-dale.md`에서 새로 생기거나 바뀐 key만 `citation_year_review`에 기록한다. 각 항목은 기존 허용 decision `remove-citation`·`replace-citation`·`valid-context`·`metadata-corrected` 중 하나와 빈칸이 아닌 `reason`을 가진다.

```bash
cd "$worktree"
npm run audit:citation-years -- --json > "$run_dir/edgar-dale.citation-years.json"
```

- [ ] **10단계: confidence를 한 번 동기화한다**

```bash
npm run sync:confidence
npm run sync:confidence -- --dry
```

기대: 두 번째 confidence 실행은 0/0/0이다. 데일의 최종 값은 실제 section 근거로 계산된 값을 받아들이며 목표값을 손으로 정하지 않는다.

- [ ] **11단계: 고정 순서의 전 게이트와 허용 파일 집합을 통과시킨다**

```bash
npm run verify:source-expansion -- --pioneer edgar-dale
npm run sync:confidence -- --dry
npm run lint:strict
npm test
npm run lint:answers
npm run audit:citation-years
npm run build
git diff --check
git status --short
```

기대:

- 위인 검증 PASS, 정확히 승인 6개, 최종 10개, 고유 claim 6개
- 「기억률 피라미드는 데일의 것이 아니다」가 직접 관계 `verified`인 새 A/B를 포함해 C 단독이 아님
- lint 0/0, 테스트 전부 PASS, 답변 위조급 0, build PASS, whitespace 오류 0
- 변경 파일이 `sources.json`, `wiki/pioneers/edgar-dale.md`, 감사 JSON, 승인 id의 source 페이지 6개뿐임

- [ ] **12단계: 파일럿을 한 커밋으로 만들고 main에 순차 반영한다**

```bash
audit="docs/superpowers/audits/source-expansion/edgar-dale.json"
git add sources.json wiki/pioneers/edgar-dale.md "$audit"
while IFS= read -r id; do
  git add "wiki/sources/$id.md"
done < <(node --input-type=module - "$audit" <<'NODE'
import { readFileSync } from "node:fs";
const audit = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const id of audit.approved_ids) console.log(id);
NODE
)
git commit -m "data: expand sources for edgar-dale"
pilot_commit="$(git rev-parse HEAD)"

cd "$repo"
git cherry-pick "$pilot_commit"
npm run verify:source-expansion -- --pioneer edgar-dale
npm run lint:strict
git status --short
```

기대: cherry-pick과 두 검사가 PASS하고 main status가 비어 있다. `/tmp`의 초안·원문 발췌·실행 로그는 main에 들어오지 않는다.

---

### 과제 6: 파일럿 결과로 반복 절차를 동결한다

**파일:**
- 수정: `.codex-tasks/source-expansion/runbook.md`
- 수정: `.codex-tasks/source-expansion/collect.md`
- 수정: `.codex-tasks/source-expansion/write.md`
- 수정: `test/source-expansion-packets.test.mjs`

**인터페이스:**
- 사용: `docs/superpowers/audits/source-expansion/edgar-dale.json`, 파일럿의 collector/writer stderr와 JSON, `git show --stat`의 실제 변경 집합
- 제공: 데일에서 관측한 수집 round·탈락 이유·동명이인/판본/claim 문제·서술 수정·게이트 재시도 원인을 반영한 최종 runbook과 회귀 테스트

이 과제는 파일럿 데이터 커밋과 분리한다. 위인 트랜잭션의 네 업무 파일 계약을 깨지 않으면서, 파일럿에서 드러난 절차 문제를 다음 30명 전에 추적 가능한 지시문으로 고정한다.

- [ ] **1단계: 파일럿의 실제 실행 결과를 한 표로 정리한다**

`runbook.md`의 `## 에드거 데일 파일럿에서 동결한 절차`에 다음 실제값을 감사 JSON과 로그에서 옮긴다.

- 수집 round별 요청 수·반환 수
- `approved`·`pending_manual`·`rejected` 수와 가장 빈번한 탈락 이유
- 승인 6건의 관계 kind와 tier 분포
- writer가 처음 수정한 파일 집합과 최종 허용 파일 집합
- 새 연도 key 수와 판정 분포
- C 단독 해소와 최종 confidence
- 재시도한 단계와 재시도 원인; 재시도가 없으면 `재시도 0회`라고 명시

- [ ] **2단계: 파일럿에서 발견한 경계 문제를 프롬프트 문장으로 고친다**

후보가 중복/일반 배경/관계 약함/판본 혼동으로 탈락했다면 `collect.md`에 그 실제 패턴을 금지 예로 추가한다. writer가 claim 범위를 넓히거나 한 문장에 새 각주를 몰거나 다른 파일을 읽었다면 `write.md`에 그 실제 실패와 승인 범위를 추가한다. 문제가 없던 경계도 파일럿 결과가 0건임을 runbook에 기록하되 의미 없는 문구 변경은 만들지 않는다.

- [ ] **3단계: 관측된 문제를 가장 작은 fixture로 회귀 테스트한다**

`test/source-expansion-packets.test.mjs`에는 파일럿에서 실제로 발생한 입력을 서지 문자열과 id가 아닌 구조적 최소 fixture로 축소한다. 최소한 다음 두 경계는 파일럿 결과와 무관하게 고정한다.

```javascript
test("writer 패킷은 pending_manual과 rejected 후보를 직렬화하지 않는다", () => {
  const packet = buildWriterPacket({
    slug: "edgar-dale",
    pageText: "현재 데일 페이지",
    audit: {
      approved_ids: ["dale-approved"],
      candidates: [
        { source_id: "dale-approved", decision: "approved", claim_review: { claim: "승인 주장" } },
        { source_id: "dale-pending", decision: "pending_manual" },
        { source_id: "dale-rejected", decision: "rejected" },
      ],
    },
    sources: [
      { id: "dale-approved", title: "승인 출처" },
      { id: "dale-pending", title: "보류 출처" },
      { id: "dale-rejected", title: "탈락 출처" },
    ],
    conceptIds: [],
  });
  assert.deepEqual(packet.approved_sources.map((source) => source.id), ["dale-approved"]);
});

test("추가 수집은 최초 부족분이 아니라 남은 부족분으로 다시 계산한다", () => {
  assert.equal(candidateRequestCount(2), 5);
});
```

- [ ] **4단계: 동결한 절차와 전체 green을 확인한다**

```bash
node --test "test/source-expansion-packets.test.mjs" "test/source-expansion.test.mjs"
npm run verify:source-expansion
npm run lint:strict
npm test
git diff --check
```

기대: 모두 PASS. 진행 모드는 파일럿의 신규 6행과 감사 1개를 완결된 트랜잭션으로 인식한다.

- [ ] **5단계: 커밋**

```bash
git add .codex-tasks/source-expansion/runbook.md .codex-tasks/source-expansion/collect.md .codex-tasks/source-expansion/write.md test/source-expansion-packets.test.mjs
git commit -m "docs: lock source expansion runbook after pilot"
```

---

### 과제 7: 같은 위인 트랜잭션 절차를 31명 입력 목록에 적용한다

**파일:**
- 위인별 수정: `sources.json`
- 위인별 생성: 해당 감사 기록의 승인 id와 같은 `wiki/sources/${id}.md`
- 위인별 수정: 입력 slug와 같은 `wiki/pioneers/${slug}.md`
- 위인별 생성: 입력 slug와 같은 `docs/superpowers/audits/source-expansion/${slug}.json`

**인터페이스:**
- 입력: `(slug: string, required_additions: 1 | 2 | 3 | 4 | 5 | 6)`
- 사용: `.codex-tasks/source-expansion/runbook.md`의 동결 절차와 과제 5의 green 트랜잭션
- 제공: 호출마다 정확히 한 위인·한 감사·정확한 부족분·한 green 커밋; 31번째 호출 뒤 새 id 116개와 31명 각각 10건

31개 과제로 복제하지 않는다. 아래 절차 정의는 한 번뿐이며, 입력표의 행마다 `(slug, required_additions)`를 바꿔 호출한다. `edgar-dale` 호출은 과제 5에서 이미 끝났으므로 이 과제에서는 그 커밋을 확인하고 나머지 30행을 실행한다.

#### 직접 재확인한 입력 목록

계획 작성 시 `loadPages("wiki")`의 36개 pioneer 프론트매터를 다시 계산했다. 다음 표는 명세의 그룹과 현재 건수를 그대로 재확인한 결과다.

| 추가 수 | 대상 |
|---|---|
| +6 | `edgar-dale`(4), `barbara-seels`(4), `jeroen-van-merrienboer`(4), `ralph-tyler`(4), `sidney-pressey`(4) |
| +5 | `ann-brown`(5), `etienne-wenger-trayner`(5), `rita-richey`(5), `robert-glaser`(5), `robert-heinich`(5) |
| +4 | `allan-collins`(6), `charles-reigeluth`(6), `jean-piaget`(6), `john-sweller`(6), `joseph-novak`(6), `marlene-scardamalia`(6), `michael-g-moore`(6), `robert-mager`(6), `thomas-gilbert`(6) |
| +3 | `albert-bandura`(7), `david-jonassen`(7), `edward-thorndike`(7), `john-dewey`(7), `robert-kozma`(7) |
| +2 | `jean-lave`(8), `richard-clark`(8), `walter-dick`(8) |
| +1 | `bf-skinner`(9), `jerome-bruner`(9), `john-keller`(9), `lev-vygotsky`(9) |

합계는 31명·116건이고, 파일럿 뒤 실행 순서는 `barbara-seels` → `jeroen-van-merrienboer` → `ralph-tyler` → `sidney-pressey`, 이후 +5 → +4 → +3 → +2 → +1 그룹에서 slug 오름차순이다.

#### 재사용 절차 — 한 행마다 전부 실행

각 호출은 입력표의 현재 행을 두 positional argument로 바인딩한다. 첫 번째 남은 행은 아래처럼 시작하고, 다음 호출부터 표의 slug와 추가 수로 두 값만 바꾼다.

```bash
set -- barbara-seels 6
slug="$1"
missing="$2"
```

- [ ] **1단계: 최신 main이 green이고 입력 부족분이 baseline과 같은지 확인한다**

```bash
npm run verify:source-expansion
npm run lint:strict
npm test
node --input-type=module - "$slug" "$missing" <<'NODE'
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const baseline = JSON.parse(readFileSync("docs/superpowers/audits/source-expansion/baseline.json", "utf8"));
assert.equal(baseline.pioneers[process.argv[2]].required_additions, Number(process.argv[3]));
NODE
```

기대: 모두 PASS. 이전 위인의 커밋이 main에 반영되지 않았거나 status가 더러우면 새 worktree를 만들지 않는다.

- [ ] **2단계: 입력 slug 전용 worktree와 `/tmp` 실행 디렉터리를 만든다**

```bash
repo="$(pwd -P)"
run_dir="$(mktemp -d "/tmp/edtech-oracle-source-expansion.${slug}.XXXXXX")"
worktree_parent="$(mktemp -d "/tmp/edtech-oracle-worktree.${slug}.XXXXXX")"
worktree="$worktree_parent/repo"
git worktree add -b "source-expansion/$slug" "$worktree" main
cd "$worktree"
```

- [ ] **3단계: `max(2n, n+3)` 후보를 read-only Codex stdout으로 수집한다**

과제 4의 collect 명령에 현재 `slug`와 `missing`을 넣는다. 최대 3개 수집만 동시에 실행한다. 병렬 수집 결과라도 승인 직전 최신 main의 영구 식별자와 fallback key를 다시 계산한다.

- [ ] **4단계: `curator`가 중복을 판정한다**

영구 식별자 중 하나라도 같으면 같은 레코드 후보로 올리고, 식별자가 없을 때는 정규화 제목·저자 집합·연도가 모두 같을 때만 자동 중복 후보로 올린다. 저자 없음, 판본 차이, 같은 저작의 다른 판본은 원문을 읽고 판정한다. 중복은 `rejected`와 이유를 감사 기록에 남긴다.

- [ ] **5단계: `curator`가 존재를 판정한다**

DOI/Crossref, OpenLibrary edition, ERIC, 도서관 서지, 저널 공식 권호 목차, 출판사·대학·학회 공식 기록, 표제지·판권지 순으로 서지 정체를 대조한다. Crossref 미검색만으로 탈락시키지 않는다. 확인 불가는 `pending_manual`, 다른 문헌을 가리키는 식별자는 `rejected`다.

- [ ] **6단계: `curator`가 관계와 동일인을 독립 판정한다**

`authored_by`는 역할 표시와 독립 식별 신호를, `about`은 직접 분석 위치를, `criticizes`는 실제 비판·대조 명제와 위치를 기록한다. 일반 배경·참고문헌의 이름 한 번·동명이인은 승인하지 않는다. 고위험 세 slug는 두 신호와 강한 신호 하나를 채운다.

- [ ] **7단계: `curator`가 tier와 쓸 수 있는 고유 주장을 판정한다**

관계가 `verified`인 뒤 `CLAUDE.md` 판정 순서로 tier를 정한다. A/B만 승인하고 후보 모델의 추정 tier를 복사하지 않는다. 각 승인 출처는 서로 다른 실질 주장과 원문 위치를 가져야 한다. 제목·발행연도만 말하는 빈 연표 항목은 승인하지 않는다.

- [ ] **8단계: 정확한 부족분만 승인해 다음 상태를 `/tmp`에 준비한다**

승인 수가 `missing`보다 작으면 남은 수에 `candidateRequestCount`를 다시 적용해 3~7단계를 반복한다. 정확히 채운 뒤에만 최종 id를 부여한다. 다음 `sources.json`, source 페이지, 감사 JSON은 `run_dir`에 준비하고 아직 worktree에 쓰지 않는다. 저자 배열·DOI·나머지 영구 식별자는 전역 직렬화 계약대로 저장하고, 감사 기록에는 승인뿐 아니라 모든 `pending_manual`·`rejected`와 이유를 남긴다.

- [ ] **9단계: 승인 id만 든 패킷으로 workspace-write Codex가 대상 위인 한 파일을 쓴다**

과제 4의 write 명령을 `audit_path="$run_dir/$slug.audit.json"`, `next_sources_path="$run_dir/$slug.sources.json"`으로 실행한다. 패킷 빌더는 다음 레지스트리에서도 `approved_ids` 행만 골라 stdout 입력에 넣는다. writer JSON의 claim map을 실제 section·문장·각주와 대조하고 감사 기록에 확정한다. 승인 목록 밖 id, 기존 id 삭제, 다른 파일 수정, 한 문장 다중 신규 각주가 있으면 writer 결과를 폐기한다. target page가 맞으면 `curator`가 `/tmp`의 다음 레지스트리·source 페이지·완성 감사 JSON을 `apply_patch`로 worktree에 함께 반영한다.

- [ ] **10단계: 새 연도 key를 사람이 판정하고 confidence를 한 번 동기화한다**

대상 위인 파일의 새/변경 key만 감사 JSON에 판정한다. `npm run sync:confidence` 뒤 `--dry`가 0/0/0인지 확인한다.

- [ ] **11단계: 위인별 전체 gate와 허용 파일 계약을 통과시킨다**

```bash
npm run verify:source-expansion -- --pioneer "$slug"
npm run sync:confidence -- --dry
npm run lint:strict
npm test
npm run lint:answers
npm run audit:citation-years
npm run build
git diff --check
git status --short
```

기대: 위인 검증·lint·test·build 통과, confidence 0/0/0, 답변 위조급 0, 연도 감사 exit 0, 변경 파일은 네 업무 범위뿐이다. 하나라도 실패하면 해당 branch를 커밋하지 않는다.

- [ ] **12단계: 한 위인 커밋을 만들고 main에 cherry-pick한다**

```bash
audit="docs/superpowers/audits/source-expansion/$slug.json"
git add sources.json "wiki/pioneers/$slug.md" "$audit"
while IFS= read -r id; do
  git add "wiki/sources/$id.md"
done < <(node --input-type=module - "$audit" <<'NODE'
import { readFileSync } from "node:fs";
const audit = JSON.parse(readFileSync(process.argv[2], "utf8"));
for (const id of audit.approved_ids) console.log(id);
NODE
)
git commit -m "data: expand sources for $slug"
transaction_commit="$(git rev-parse HEAD)"

cd "$repo"
git cherry-pick "$transaction_commit"
npm run verify:source-expansion -- --pioneer "$slug"
npm run lint:strict
git status --short
```

기대: 각 호출이 정확히 한 green 커밋으로 끝난다. 보류 branch는 cherry-pick하지 않고 감사 초안과 실행 자료를 branch·`/tmp`에 유지하며, 그 위인이 10건이 될 때까지 전체 완료를 선언하지 않는다.

---

### 과제 8: 전체 완료 모드·확장 후 감사를 닫고 log와 KNOWN-ISSUES에 기록한다

**파일:**
- 생성: `docs/superpowers/audits/source-expansion/completion.json`
- 수정: `wiki/KNOWN-ISSUES.md:37-99`
- 수정: `wiki/log.md:208-249` 뒤 새 항목

**인터페이스:**
- 사용: `auditExpansionWatchpoints(input): WatchpointReport`, 31개 위인 감사 JSON, baseline, 최종 `sources.json`, `auditCitationYears`
- 제공: 모든 타인 A 사용 위치와 모든 새/변경 연도 key에 `decision`·`reason`이 있는 completion 감사; 116/258/36명 최소 10 완료 기록; 전체 green gate

이 과제도 자동 의미 판정이 아니다. 검증기가 감시 후보 전부를 출력하고 `curator`가 원문·문장 범위를 판정한 뒤, 완료 검증기가 후보 key와 판정 key의 정확한 일치만 확인한다.

- [ ] **1단계: 완료 전 기계 집계와 감시 후보를 JSON으로 출력한다**

```bash
node scripts/verify-source-expansion.mjs --report-json \
  > /tmp/edtech-oracle-source-expansion-completion-report.json
```

기대 집계:

- baseline 밖 새 id 116개, `sources.json` 258개, id 중복 0
- 위인 36명 모두 최소 10개, 대상 31명은 각각 정확히 10개
- 새 source 페이지 116개와 소유 감사 31개
- 새 C 0, `context_only` 0, 미완료·중복 소유 id 0
- C 단독 section 0, 특히 데일 대상 절 해소
- `foreign_tier_a`와 baseline 밖 `citation_year` 후보는 0개 이상일 수 있으며 이 단계에서 자동 정상 처리하지 않음

- [ ] **2단계: 타인의 새 tier A 사용 위치를 전수 판정한다**

`foreign_tier_a`는 새 A 가운데 관계가 `criticizes`·`about`이거나 저자가 페이지 주인과 다른 후보를 claim 위치와 함께 낸다. 각 항목을 실제 위인 section과 원문에 대조해 다음 decision 하나와 이유를 `completion.json.foreign_tier_a`에 기록한다.

- `valid-critique` — `당대의 비판`·`대립축`에서 타인의 주장 자체를 받치는 올바른 A
- `valid-analysis` — 직접 분석·비교를 해당 문헌의 원저작으로 받치는 올바른 A
- `citation-scope-corrected` — 생애·대표 저작·핵심 명제를 대신 받치던 각주 범위를 수정함
- `tier-corrected` — 전역 tier 판정 자체를 원문 근거로 수정함

자동 B 강등 decision은 만들지 않는다. 수정이 생기면 해당 소유 위인에 과제 7의 9~12단계를 다시 적용해 별도 green 교정 커밋을 main에 반영하고, 1단계 보고서를 다시 생성한 뒤 이 판정을 처음부터 반복한다.

- [ ] **3단계: 새·변경 연도 key를 전수 판정한다**

31개 감사의 `citation_year_review` 합집합이 baseline 48/104 밖 현재 key와 정확히 일치하는지 확인한다. 누락 key는 문장 범위와 판본을 읽고 기존 네 decision 중 하나로 판정한다. 인용 수정이 필요하면 해당 소유 위인에 과제 7의 9~12단계를 다시 적용해 green 교정 커밋을 반영하고 보고서를 재생성한다. 후보가 정상 혼합 인용이면 `valid-context`로 남기며, allowlist나 strict 차단 규칙은 만들지 않는다.

- [ ] **4단계: completion 감사의 판정 완결성을 기계적으로 잠근다**

`/tmp/edtech-oracle-source-expansion-completion-report.json`의 집계와 두 후보 배열을 `completion.json`에 복사하고, 후보마다 `decision`·`reason`을 채운다.

실행:

```bash
npm run verify:source-expansion -- --complete \
  --review docs/superpowers/audits/source-expansion/completion.json
```

기대: PASS — 116/258/36명 최소 10, 31개 감사, source 페이지·주장 1:1, 동명이인 신호, 타인 A/연도 후보 전수 판정이 모두 완결됐다. 자연어 판정의 참은 `curator` 책임으로 남는다.

- [ ] **5단계: KNOWN-ISSUES 5·6·7에 실제 결과를 기록한다**

`wiki/KNOWN-ISSUES.md`에는 다음을 실제 집계로 갱신한다.

- 5번: 데일의 대상 절에 붙은 새 A/B id와 관계 kind, 최종 C 단독 section 수
- 6번: 타인의 새 A 후보 수, decision별 수, 수정한 위치; 자동 상대 tier 모델은 계속 기각
- 7번: baseline 뒤 새/변경 연도 key 수, decision별 수, 실제 수정 수; 감사는 계속 비차단

- [ ] **6단계: log에 전체 확장 결과를 기록한다**

`wiki/log.md`의 `## 2026-08-16 — 위인별 출처 10건 확장` 항목에는 baseline과 최종값, 31명/116건, A/B 최종 분포, 관계 kind 분포, 후보 승인/보류/탈락 수, 수집 round 수, 데일 파일럿 결과, confidence 전후 분포, 타인 A·연도 감사 결과, 31개 커밋을 기록한다. 집계는 `sources.json`과 감사 JSON에서 생성하고 손으로 다시 세지 않는다.

- [ ] **7단계: 전체 gate와 clean worktree를 최종 확인한다**

```bash
npm run verify:source-expansion -- --complete \
  --review docs/superpowers/audits/source-expansion/completion.json
npm run sync:confidence -- --dry
npm run lint:strict
npm test
npm run lint:answers
npm run audit:citation-years
npm run build
git diff --check
git status --short
```

기대: 완료 검증 PASS, confidence 0/0/0, lint 0/0, 테스트 전부 PASS, 답변 위조급 0, 연도 감사 exit 0, build PASS, whitespace 오류 0이다. `git status --short`는 이 과제의 세 기록 파일만 보여야 한다. 보류 branch가 하나라도 있거나 위인 한 명이 10건 미만이면 이 단계는 PASS가 아니다.

- [ ] **8단계: 마무리 기록을 커밋한다**

```bash
git add docs/superpowers/audits/source-expansion/completion.json wiki/KNOWN-ISSUES.md wiki/log.md
git commit -m "docs: record completed source expansion audits"
git status --short
```

완료 상태에서 `git status --short`는 비어 있어야 한다. 그때만 새 고유 출처 116건, 레지스트리 258건, 위인 36명 최소 10건, 위인별 31개 green 데이터 커밋, 의미 판정 감사 완료를 선언한다.
