너는 edtech-oracle 저장소에서 `sources.json`의 **22행만** 판정한다.

작업 디렉터리는 `/Users/taehyeong/Documents/GitHub/edtech-oracle` 이다.

## 먼저 읽어라 (반드시)

1. `CLAUDE.md`의 `## 출처 티어` 절 — **판정 순서 정본. 이것만 따른다**
2. `docs/superpowers/specs/2026-08-16-tier-semantics-design.md` — 왜 이 규칙인지
3. `sources.json` — 이미 120행에 `tier_review`가 기록돼 있다. 형식을 그대로 따른다

## 수정해도 되는 파일 — 하나뿐이다

`sources.json`

## 절대 수정 금지

`wiki/` 전체, `answers/`, `CLAUDE.md`, `scripts/`, `test/`, `bot/`, `docs/`, `.codex-tasks/`.

**`sources.json`에서도 아래 22개 id 외의 행은 건드리지 마라.** 나머지 120행은
이미 판정이 끝났고 `tier_review`가 들어 있다. 그 행의 `tier`·`type`·`tier_review`를
바꾸면 끝난 판정을 되돌리는 것이다.

## 판정할 22행

```
bio-moore-author        A  당사자 공식 약력       Michael Grahame Moore
bio-wenger-author       A  당사자 공식 약력       Etienne Wenger-Trayner
bio-merrill-author      A  당사자 기록          M. David Merrill
bio-reigeluth-author    A  당사자 약력          Charles M. Reigeluth
bio-novak-ihmc          A  당사자 자서전·기관 기록   Joseph D. Novak; IHMC
sweller-2016-story      A  당사자 회고 논문       John Sweller
bio-vygotsky-msu        A  대학 공식 인물사       Faculty of Psychology, Lomonosov MSU
bio-gagne-open-text     B  대학 오픈 교재        John H. Curry 외
bio-clark-interview     B  동료평가 인터뷰        Daniel H. Robinson; Robert A. Bligh
gilbert-2019            B  역사적 재검토 논문      Marilyn Gilbert 외
molenda-2003-cone       B  연구 해설           Michael Molenda
collins-1989            A  원저서 수록 장        Allan Collins; John Seely Brown; Susan Newman
collins-1992            A  원저서 수록 장        Allan Collins
moore-1993              A  원저서 수록 장        Michael G. Moore
keller-1983             B  원저서 수록 장        John M. Keller
vygotsky-1978           B  편집 번역서          L. S. Vygotsky; ed. Michael Cole 외
reigeluth-1983          A  편집 원저서          Charles M. Reigeluth (ed.)
bloom-1956              A  편집서             Benjamin S. Bloom (ed.)
reiser-2017             B  편집서             Robert A. Reiser; John V. Dempsey (eds.)
simsek-merrill-2010     B  피어리뷰 인터뷰 논문     Ali Şimşek; M. David Merrill
simsek-keller-2014      B  피어리뷰 인터뷰 논문     Ali Şimşek; John M. Keller
vandeveer-valsiner-1991 B  학술 전기서          René van der Veer; Jaan Valsiner
```

## 왜 이 22건만 따로인가

나머지 120건은 자료형이 판정을 결정했다. 이 22건은 **자료형이 판정을 결정하지 못한다.**
현재 데이터에 이미 모순이 있다.

- `원저서 수록 장` 4건 중 셋은 A인데 `keller-1983`만 B다. 같은 자료형인데 티어가 갈린다
- `편집서` 2건도 갈린다. `bloom-1956`은 A, `reiser-2017`은 B다
- `bio-vygotsky-msu`는 **대학 심리학부가 쓴 인물 페이지**인데 `당사자 기록`으로 묶여 A다

**따라서 현재 tier를 정답으로 전제하지 마라.** 틀렸을 수 있다는 것이 이 과제의 출발점이다.

## 판정 기준 — `CLAUDE.md`의 판정 순서 그대로

1. **위인 본인이 자기 데이터·논증·이론·모형을 처음 제시한 저작이면 A.**
   형식(단행본/논문/장)을 가리지 않는다. 당사자의 회고·자서전·직접 기록,
   원문 아카이브도 A다.
2. **단행본과 수록 장은 실제 근거 역할을 본다.** 새 이론·모형을 제시하는
   원저작이면 A, 후대의 종합·편집·해설·교재·번역이면 B다.
   **본인이 공저자나 편집자라는 사실만으로 종합서를 A로 올리지 않는다.**
3. 타인이 쓴 학술 문헌과 학회·대학 등 기관의 공식 약력·부고·기록은 B.
4. 백과사전과 일반 참고 자료는 C.

특히 다음을 구분하라.

- **"당사자 기록"인가, "기관이 당사자에 대해 쓴 기록"인가.** 전자는 A(경로 1),
  후자는 B(경로 3)다. 저자가 누구인지, 1인칭인지 3인칭인지 실제로 확인하라.
- **수록 장이 새 이론을 제시하는가, 남의 책에 실린 해설인가.**
- **편집서에서 그 위인이 편집자인가 저자인가.** 편집이라도 그 책이 본인 이론의
  정초 텍스트면 A일 수 있다(예: 자기 분류학을 자기가 엮은 경우). 남이 엮은 교재에
  이름이 있는 것과 다르다.

## 각 행에 기록할 것

이미 기록된 120행과 같은 형식이다. `tier_review`를 `type` 바로 뒤에 둔다.

```json
"tier_review": {
  "rule": "1-original-work",
  "evidence": "확인한 근거를 한 문장으로. URL을 봤으면 URL을 적는다",
  "changed_from": "B"
}
```

- `rule`은 `1-original-work` · `2-book-or-chapter-role` ·
  `3-other-scholar-or-institution` · `4-general-reference` 중 하나
- `evidence`는 **자료형 이름을 되풀이하지 마라.** 무엇을 확인해서 그렇게 판정했는지
  적는다. 원문이나 서지 설명을 봤으면 그 URL을 적는다
- `changed_from`은 tier를 바꿀 때만 넣는다
- `type`이 실제 성격과 다르면 `type`도 고치고 `previous_type`에 옛 값을 남긴다

## 절대 규칙

1. **모르면 올리지 마라.** 근거 역할을 확인할 수 없으면 더 강한 tier를 추정하지 않고
   B 또는 C 중 확인 가능한 쪽을 택한다. 명세가 정한 원칙이다
2. **서지를 지어내지 마라.** 확인하지 않은 URL을 `evidence`에 적지 마라.
   확인하지 못했으면 "원문 미확인"이라고 쓰고 그에 맞게 보수적으로 판정하라
3. 22행 외의 행을 건드리지 마라
4. `git add`·`git commit`을 실행하지 마라

## 끝난 뒤

`node -e 'JSON.parse(require("fs").readFileSync("sources.json","utf8"))'`로
JSON이 깨지지 않았는지 확인하고, `npm run lint:strict`의 규칙 10 건수가
**22 → 0**이 되었는지 확인하라.

마지막에 22행 각각에 대해 다음을 표로 보고하라.

| id | 이전 tier | 최종 tier | rule | 판정 근거 요약 | 원문 확인 여부 |

tier를 바꾼 행은 왜 바꿨는지 한 문장씩 따로 설명하라.
