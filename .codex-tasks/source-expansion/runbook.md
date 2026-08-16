# 위인별 출처 확장 실행 절차

이 절차는 한 위인 트랜잭션을 처리한다. 저장소 루트에서 `slug`와 `missing`만 대상에 맞게 바꿔 반복한다. 실제 후보 JSON·감사 초안·다음 레지스트리·모델 출력·로그는 모두 `mktemp -d`가 만든 저장소 밖 디렉터리에 둔다.

## 1. 실행 변수

```bash
repo="$(pwd -P)"
slug="edgar-dale"
missing="6"
run_dir="$(mktemp -d /tmp/edtech-oracle-source-expansion.edgar-dale.XXXXXX)"
worktree="$repo"
audit_path="$run_dir/$slug.audit.json"
next_sources_path="$run_dir/$slug.sources.json"
```

`repo`가 edtech-oracle 저장소 루트인지 확인한다. `run_dir` 아래 파일은 동적 산출물이며 저장소에 복사하거나 커밋하지 않는다.

## 2. read-only 후보 수집

```bash
{
  sed -n '1,$p' "$worktree/.codex-tasks/source-expansion/collect.md"
  printf '\n## 입력 패킷\n'
  node "$worktree/scripts/source-expansion-packets.mjs" collect --pioneer "$slug" --missing "$missing"
} | codex --search exec -m gpt-5.6-sol -s read-only --skip-git-repo-check \
  --ephemeral -C "$worktree" \
  --output-schema "$worktree/.codex-tasks/source-expansion/candidate-output.schema.json" - \
  > "$run_dir/$slug.candidates.json" \
  2> "$run_dir/$slug.collect.log"
```

`-s read-only`를 생략하지 않는다. 후보 수집 Codex는 저장소에 파일을 쓰지 않으며, 바깥 셸이 최종 JSON stdout만 저장한다. 비정상 종료, 빈 stdout, 스키마 불일치가 있으면 그 실행 전체를 버리고 다시 수집한다.

## 3. curator 검증·등재

`curator`가 후보 JSON과 원문을 읽고 존재와 관계를 각각 판정한 뒤 tier·주장·최종 id를 결정한다. 승인 수는 `missing`과 같아야 한다. 보류·탈락 후보는 승인 id에 넣지 않는다. 승인된 다음 `sources.json`과 위인 감사 JSON의 작업용 사본을 각각 `next_sources_path`와 `audit_path`에 둔다. 원문 발췌와 검증 로그도 `run_dir`에만 둔다.

승인 수가 부족하면 남은 부족분을 새 `missing`으로 두고 2단계를 다시 실행한다. 같은 공식으로 계산된 요청 수는 패킷 빌더가 넣는다. 레지스트리 행과 source 페이지를 만드는 권한은 `curator`에게만 있다.

## 4. workspace-write 본문 작성

```bash
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

`-s workspace-write`를 생략하지 않는다. 작성 패킷에는 현재 위인 페이지와 그 위인에게 승인된 새 id만 들어가며, 작성기는 대상 위인 파일 하나만 수정한다.

## 5. 변경 범위와 게이트 확인

```bash
git status --short
node scripts/verify-source-expansion.mjs --pioneer "$slug"
npm run verify:source-expansion
npm run lint:strict
npm test
git diff --check
```

허용된 한 위인 트랜잭션 파일 밖 변경이 있거나 어느 게이트든 실패하면 커밋하지 않는다. 모든 게이트가 통과한 완결된 위인 트랜잭션만 커밋한다.
