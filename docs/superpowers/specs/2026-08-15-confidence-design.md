# confidence 재정의 — 설계 명세

**날짜** 2026-08-15
**상태** 승인됨

## 문제

`confidence`는 변별하지 않는다. 위인 36명과 대립축 34건이 전원 `high`다. 필드가 상수면 정보량은 0이다.

원인은 순환이다. `import-pantheon.mts`의 `confidenceOf()`가 "A·B 티어가 하나라도 있으면 high"로
값을 계산했고, lint 규칙 8이 **같은 술어로** 그 값을 검증한다. 자기가 만든 값을 자기가 확인하므로
원리상 실패할 수 없다. 위인 페이지는 자기 대표 저작(tier A)을 인용하니 술어가 항상 참이다.

출처 페이지 140건의 `high` 125 / `low` 15도 판단이 아니다. 출처 페이지는 자기 자신만 인용하므로
`confidence`가 곧 그 출처 tier의 재진술이다.

`KNOWN-ISSUES.md` #5는 "해당 페이지는 `confidence: low`로 표시되며"라고 쓰지만
`low`인 위인 페이지는 하나도 없다. 선언된 정책과 데이터가 어긋나 있다.

## 정의

페이지의 `confidence`는 **모든 `##` 섹션의 "그 섹션 최강 티어" 중 가장 약한 것**이다.

```
섹션 최강 티어 = 그 섹션이 참조한 각주들의 tier 중 최강 (A > B > C)
각주가 없는 섹션 = 계산에서 제외
페이지 값 = 섹션 최강 티어들 중 최약
매핑: A → high · B → medium · C → low
```

`high`는 "모든 섹션이 원저작·당사자 기록으로 받쳐져 있다"는 뜻이다.
`medium`은 "어떤 섹션은 2차 문헌이 최선이다".
`low`는 "어떤 섹션은 백과사전류가 최선이다" — 현재 0건이지만 C 단독 섹션이 생기면 발화한다.

`sources.json`에 없는 각주 id는 계산에서 제외한다. 규칙 3이 이미 잡는 문제다.

### 재계산 시 예상 분포 (2026-08-15 측정)

| | high | medium | low |
|---|---|---|---|
| 위인 36 | 14 | 22 | 0 |
| 대립축 34 | 27 | 7 | 0 |
| 개념 3 | 3 | 0 | 0 |

C 티어 **단독** 섹션은 0건이다. 2026-08-14의 tier B 병행 인용 작업이 실제로 해소했으며,
`KNOWN-ISSUES.md` #5의 서술이 데이터보다 낡았다.

## 적용 범위

`pioneer` · `concept` · `debate` 세 타입에만 둔다.

**`source` 페이지에서는 필드를 제거한다.** 출처 페이지는 자기 자신만 인용하므로 `confidence`가
그 출처 tier의 재진술이고, tier는 이미 페이지에 표시된다. 지금 고치려는 결함과 같은 종류다.
lint 규칙 1은 `source`에 `sources`만 요구하고, `confidence`가 **있으면** 오류로 잡는다.

## 규칙 8 재정의

| 이전 | 이후 |
|---|---|
| `confidence: high`면 A·B 티어 출처가 1개 이상 있어야 한다 | 선언된 `confidence`가 섹션 최약 근거로 계산한 값과 같아야 한다 |

규칙 8이 처음으로 실패할 수 있게 된다. 섹션을 고치고 프론트매터를 안 고치면 잡힌다 —
규칙 4(`sources` ≡ 본문 각주)와 같은 구조다.

계산값이 `null`(각주 있는 섹션이 하나도 없음)이면 규칙 8을 건너뛴다. 규칙 6이 이미 잡는다.

## 구성요소

```
scripts/confidence.mjs       computeConfidence(page, sourceById) → "high"|"medium"|"low"|null
scripts/sync-confidence.mjs  선언값을 계산값으로 갱신 · npm run sync:confidence
test/confidence.test.mjs     계산 함수 단위 테스트

수정: scripts/lint-wiki.mjs        규칙 8 재작성 · source를 confidence 요구에서 제외
      web/assets/site.css          .conf--high · .conf--medium 추가
      scripts/import-pantheon.mts  confidenceOf() 제거 — sync가 채운다
      README.md · CLAUDE.md · .claude/commands/lint.md · wiki/KNOWN-ISSUES.md
```

`computeConfidence`는 순수 함수다. 페이지와 tier 맵을 받아 값을 돌려주고 파일을 쓰지 않는다.
`lint-wiki.mjs`와 `sync-confidence.mjs`가 같은 함수를 쓰므로 검증과 갱신이 어긋날 수 없다.

`confidence.mjs`를 별도 모듈로 두는 이유는 `wiki-parse.mjs`가 순수 파싱이기 때문이다.
티어 판정은 `sources.json` 지식을 요구하므로 파서에 넣지 않는다.

### 사이트

배지 렌더링(`confidenceBadge`)은 그대로 둔다. CSS에 `.conf--high`(tier-a 색)와
`.conf--medium`(tier-b 색)이 없어 medium이 high와 구별되지 않으므로 두 규칙을 추가한다.
`source` 페이지는 필드가 없어져 배지가 사라진다 — `confidenceBadge`가 빈 문자열을 반환하므로
렌더러 수정은 필요 없다.

## 마이그레이션

`npm run sync:confidence`가 `wiki/`를 훑어

1. `pioneer` · `concept` · `debate`의 `confidence`를 계산값으로 갱신한다
2. `source`에서 `confidence` 줄을 제거한다

예상 변경: 위인 22명과 대립축 7건이 `high → medium`, 출처 140건에서 필드 삭제.

프론트매터 구분자는 **들여쓰기 없이 줄 전체가 `---`일 때만**이다. 공백을 지우고 비교하면
블록 스칼라(`|`·`>`) 안의 `  ---`을 종료로 오인해 값 한가운데에 새 줄을 끼워 넣고 원래 줄은
남긴 채 YAML을 깨뜨린다. 값이 빈 `confidence:`도 같은 키로 인정한다 — 놓치면 줄이 중복된다.
CRLF 파일이면 새 줄도 CRLF로 쓴다. 편집하지 못한 파일은 `skipped`로 보고하고 손대지 않는다.

일회성이 아니라 재실행 가능한 도구로 둔다. 새 페이지를 쓰거나 섹션의 근거를 교체한 뒤에도 쓴다.
`import-pantheon.mts`는 `confidenceOf()`를 잃으므로 파이프라인 순서가
`import → sync:confidence → lint`가 된다. import 산출물은 sync 전까지 규칙 1 위반이며,
아직 값이 정해지지 않았으므로 그것이 맞다.

## 테스트

`test/confidence.test.mjs`

- 모든 섹션이 A → `high`
- 한 섹션이 B가 최선 → `medium`
- 한 섹션이 C가 최선 → `low`
- 섹션 안에 A와 C가 섞이면 그 섹션은 A로 친다 (최강 기준)
- 각주 없는 섹션은 무시한다
- 각주 있는 섹션이 하나도 없으면 `null`
- `sources.json`에 없는 각주 id는 제외한다

`test/lint-wiki.test.mjs`의 규칙 8 케이스를 새 정의로 교체하고, `source` 페이지에
`confidence`가 있으면 규칙 1이 잡는 케이스를 추가한다.

## 범위 밖

- 티어 자체의 재분류 — `sources.json`의 tier 값은 건드리지 않는다
- 귀속 정확성 — 여전히 기계 검사 밖이다
- `KNOWN-ISSUES` #5의 나머지(전기 서술의 C 티어 **병행** 인용)는 해소하지 않는다.
  단독 의존이 0건이라는 사실만 기록한다
