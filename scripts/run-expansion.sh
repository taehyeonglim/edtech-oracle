#!/usr/bin/env bash
# 확장 배치를 codex에 병렬 위임한다.
#
# 배치는 서로 다른 위인 파일만 건드리므로 충돌하지 않는다.
# index.md 갱신은 전부 끝난 뒤 사람이 한다.
#
# 사용: ./scripts/run-expansion.sh 2 3 4 5 6
set -uo pipefail

MODEL="gpt-5.6-luna"
WAVE=3
mkdir -p .codex-tasks/logs

batches=("$@")
if [ ${#batches[@]} -eq 0 ]; then
  echo "사용: $0 <배치번호...>   예) $0 2 3 4 5 6" >&2
  exit 1
fi

running=0
for n in "${batches[@]}"; do
  f=".codex-tasks/batch-${n}.md"
  [ -f "$f" ] || { echo "✋ $f 없음" >&2; exit 1; }
  echo "▶ batch-${n} 시작"
  codex exec -m "$MODEL" --skip-git-repo-check "$(cat "$f")" \
    > ".codex-tasks/logs/batch-${n}.log" 2>&1 &
  running=$((running + 1))
  if [ "$running" -ge "$WAVE" ]; then
    wait
    running=0
  fi
done
wait

echo "▶ 전체 완료 — 게이트 실행"
npm run lint:strict
