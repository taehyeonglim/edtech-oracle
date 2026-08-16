# 위인별 출처 확장 실행 절차

이 절차는 한 위인 트랜잭션을 처리한다. 저장소 루트에서 `slug`와 `missing`만 대상에 맞게 바꿔 반복한다. 실제 후보 JSON·감사 초안·다음 레지스트리·모델 출력·로그는 모두 `mktemp -d`가 만든 저장소 밖 디렉터리에 둔다.

## 1. 실행 변수

```bash
repo="$(pwd -P)"
slug="edgar-dale"
missing="6"
run_dir="$(mktemp -d /tmp/edtech-oracle-source-expansion.edgar-dale.XXXXXX)"
worktree="$repo"
candidates_path="$run_dir/$slug.candidates.json"
approvals_path="$run_dir/$slug.approvals.json"
writer_input_path="$run_dir/$slug.writer-input.json"
audit_path="$run_dir/$slug.audit.json"
next_sources_path="$run_dir/$slug.sources.json"
```

`repo`가 edtech-oracle 저장소 루트인지 확인한다. `run_dir` 아래 파일은 동적 산출물이며 최종 감사 외에는 저장소에 복사하거나 커밋하지 않는다.

## 2. read-only 후보 수집

```bash
{
  sed -n '1,$p' "$worktree/.codex-tasks/source-expansion/collect.md"
  printf '\n## 입력 패킷\n'
  node "$worktree/scripts/source-expansion-packets.mjs" collect --pioneer "$slug" --missing "$missing"
} | codex --search exec -m gpt-5.6-sol -s read-only --skip-git-repo-check \
  --ephemeral -C "$worktree" \
  --output-schema "$worktree/.codex-tasks/source-expansion/candidate-output.schema.json" - \
  > "$candidates_path" \
  2> "$run_dir/$slug.collect.log"
```

`-s read-only`를 생략하지 않는다. 후보 수집 Codex는 저장소에 파일을 쓰지 않으며, 바깥 셸이 최종 JSON stdout만 저장한다. 비정상 종료, 빈 stdout, 스키마 불일치가 있으면 그 실행 전체를 버리고 다시 수집한다.

## 3. curator 검증·등재

`curator`가 후보 JSON과 원문을 읽고 존재와 관계를 각각 판정한 뒤 tier·주장·최종 id를 결정한다. 승인 수는 `missing`과 같아야 한다. 보류·탈락 후보는 승인 id에 넣지 않는다. 승인된 다음 `sources.json` 작업용 사본을 `next_sources_path`에 두고, 작성 패킷에 필요한 `approved_ids`와 승인 후보의 `claim_seed`만 `writer_input_path`에 둔다. 최종 감사 JSON은 본문 작성 뒤 5단계의 생성기로 만든다. 원문 발췌와 검증 로그도 `run_dir`에만 둔다.

후보별 판정 원장은 `approvals_path`에 둔다. `approved`는 후보 key에서 최종 source id로 가는 매핑이고, `decisions`에는 승인되지 않은 **모든** 후보의 `decision`과 구체적인 `reason`을 적는다. 후보를 찾지 못했거나 레지스트리가 응답하지 않은 경우는 부재가 입증된 `rejected`가 아니라 `pending_manual`이다. 승인 후보에 서지 보정이 있으면 문자열 대신 `{ "source_id": "...", "corrections": [...] }`를 쓸 수 있다. 최종 연도 판정은 같은 파일의 `citation_year_review`에 둔다.

```json
{
  "approved": {
    "candidate-01": "dale-1933"
  },
  "decisions": {
    "candidate-05": {
      "decision": "pending_manual",
      "reason": "JSTOR가 봇 차단 페이지만 반환하고 Crossref에도 없어 확인하지 못했다."
    }
  },
  "citation_year_review": {
    "candidates": [],
    "incomparable": []
  }
}
```

승인 수가 부족하면 남은 부족분을 새 `missing`으로 두고 2단계를 다시 실행한다. 같은 공식으로 계산된 요청 수는 패킷 빌더가 넣는다. 레지스트리 행과 source 페이지를 만드는 권한은 `curator`에게만 있다.

웹 레지스트리는 한 번 실패했다고 문헌이 없는 것이 아니다. OpenLibrary 503 레이트리밋은 간격을 두고 재시도하고, JSTOR·Taylor & Francis 봇 차단은 Crossref·OpenLibrary·ERIC·도서관 전거 등 다른 레지스트리로 교차 확인한다. 모든 경로를 거쳐도 확인하지 못하면 실패 경로를 `reason`에 남기고 `pending_manual`로 보류한다.

## 4. workspace-write 본문 작성

```bash
{
  sed -n '1,$p' "$worktree/.codex-tasks/source-expansion/write.md"
  printf '\n## 입력 패킷\n'
  node "$worktree/scripts/source-expansion-packets.mjs" write \
    --pioneer "$slug" \
    --audit "$writer_input_path" \
    --sources "$next_sources_path"
} | codex exec -m gpt-5.6-sol -s workspace-write --skip-git-repo-check \
  --ephemeral -C "$worktree" \
  --output-schema "$worktree/.codex-tasks/source-expansion/writer-output.schema.json" - \
  > "$run_dir/$slug.writer.json" \
  2> "$run_dir/$slug.write.log"
```

`-s workspace-write`를 생략하지 않는다. 작성 패킷에는 현재 위인 페이지와 그 위인에게 승인된 새 id만 들어가며, 작성기는 대상 위인 파일 하나만 수정한다.

## 5. 최종 감사 생성과 `base_commit` 갱신

본문과 레지스트리·source 페이지가 모두 작업 트리에 반영되고 연도 판정 원장이 완성된 뒤 최종 감사를 생성한다. 생성기는 승인 source id의 `source_review`·tier를 `sources.json`에서 가져오고, 각주 마커가 실제로 받치는 문장만 위인 본문에서 잘라 `claim_map`을 만든다. 같은 줄이나 문단 전체를 주장으로 복사하지 않는다.

```bash
git rev-parse HEAD
npm run audit:source-expansion -- \
  --candidates "$candidates_path" \
  --pioneer "$slug" \
  --approvals "$approvals_path" \
  --baseline "$worktree/docs/superpowers/audits/source-expansion/baseline.json" \
  > "$audit_path"
```

`base_commit`은 생성기가 이 실행 시점의 현재 `HEAD`로 자동 갱신한다. 이 명령은 위인 커밋 직전에 다시 실행해야 한다. 감사 생성 뒤 도구 커밋이 하나라도 추가됐다면 이전 감사는 쓰지 말고 다시 생성한다. 생성된 파일은 `audit.schema.json` 검사를 통과한 뒤에만 `docs/superpowers/audits/source-expansion/$slug.json`에 반영한다.

## 6. 변경 범위와 게이트 확인

```bash
git status --short
node scripts/verify-source-expansion.mjs --pioneer "$slug"
npm run verify:source-expansion
npm run lint:strict
npm test
git diff --check
```

허용된 한 위인 트랜잭션 파일 밖 변경이 있거나 어느 게이트든 실패하면 커밋하지 않는다. 모든 게이트가 통과한 완결된 위인 트랜잭션만 커밋한다.

## 7. 도구 결함을 발견했을 때

검증기·패킷·감사 생성기·테스트·프롬프트를 고쳐야 하면 위인 트랜잭션을 그대로 커밋하지 않는다. 도구 수정과 그 회귀 테스트를 **별도 커밋으로 먼저** 처리하고 전체 gate를 통과시킨다. 그 도구 커밋이 현재 `HEAD`가 된 뒤 위인 트랜잭션을 다시 조립하고 5단계에서 감사를 재생성한다. 도구 파일을 위인 허용 업무 파일에 섞으면 `--pioneer` 검증의 변경 범위 계약을 깨뜨린다.

## 에드거 데일 파일럿에서 동결한 절차

| 항목 | 실측 결과 |
| --- | --- |
| 후보 수집 | 부족분 6건에 `max(2n, n+3)`을 적용해 12건 요청·12건 반환 |
| 존재 확인과 승인 | 존재 확인 9건, 승인 6건; 공식이 판본·관계 검증의 여유 6건을 실제로 만들었다 |
| 최종 판정 | `approved` 6, `pending_manual` 6, `rejected` 0 |
| 승인 관계·tier | `authored_by` 5 + `criticizes` 1, tier A 5 + B 1 |
| 보류의 핵심 예 | Dale–Chall 1948은 JSTOR 봇 차단과 Crossref 미발견 때문에 `pending_manual`; 부재 판정이 아님 |
| 본문 주장 경계 | 「교사와 영화평론가의 시선」 한 문단의 `dale-1933`·`dale-1935`는 각주 마커별 서로 다른 문장 |
| 최종 데이터 파일 | `sources.json`, 데일 위인 페이지, 새 source 페이지 6개, 데일 감사 1개로 총 9개 |
| 연도 판정 | 잘못된 1954년 문장 1건을 수정한 뒤 최종 신규 key 4건(후보 1·비교 불가 3), 모두 `valid-context` |
| 깊이 gate | C 단독 절 1건 해소, confidence `low` → `medium` |
| 도구 재시도 | `claim_review`/`claim_seed` 필드 불일치와 움직이는 baseline 테스트를 각각 별도 도구 커밋으로 먼저 수정 |
| `base_commit` 재시도 | 도구 커밋이 사이에 들어가 두 번 어긋났고 두 번 수동 갱신; 이후에는 위인 커밋 직전 생성기가 현재 `HEAD`를 기록 |

파일럿의 감사 JSON은 즉석 파이썬으로 조립됐고, 줄 단위 주장 추출 때문에 같은 문단 문자열이 두 출처에 배정됐다. 이제 `source-expansion-audit.mjs`가 후보를 하나도 버리지 않고 판정 원장과 결합하며, `extractFootnoteClaims`가 각주 마커별 문장 경계를 고정한다. Dale–Chall처럼 접근 실패로 확인하지 못한 후보는 재시도와 다른 레지스트리 조회 기록을 남긴 `pending_manual`이어야 하며, 단 한 번의 503·봇 차단·검색 미발견을 `rejected`의 근거로 삼지 않는다.
