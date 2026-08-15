---
title: 알려진 결함
type: meta
updated: 2026-08-15
---

edtech-pantheon README가 공개한 P1 이슈를 그대로 물려받았다. 데이터는 스펙대로 이관했으나,
근거를 인용해 말하는 시스템에서 알려진 오류를 무표시로 두면 그대로 "근거 있는 주장"이 된다.

## 1. Ann L. Brown / John Seely Brown 혼동 — 해결됨 (2026-08-14)

`brown-collins` 관계 서술이 잘못된 저자에 귀속되어 있다는 지적이었다. `wiki/pioneers/allan-collins.md`와
`wiki/pioneers/ann-brown.md`를 직접 읽어 확인한 결과, 인지적 도제(1989)는 이미 Allan Collins,
John Seely Brown, Susan Newman에게 정확히 귀속되어 있고(`collins-1989` 각주), `ann-brown.md`는
앤 L. 브라운 본인의 연구(상호교수법, 설계실험)만 다루며 `related`가 빈 배열로 비어 있어 Collins와의
관계축을 걸지 않는다. 두 페이지 사이에 잘못된 혼동은 남아 있지 않다.

## 2. 관계 근거의 추적성 부족

관계가 내부 출처 ID만 갖고 페이지·DOI·접근일 메타데이터가 불완전하다.

## 3. 초상 이미지 권리

36장 중 명확한 퍼블릭 도메인·CC 근거가 확인된 것은 14장이다. 디스코드 프로필 이미지가
필요한 단계에서 나머지 22장은 이니셜 대체 이미지를 쓴다.

## 4. 서지·연표의 직접 근거 부족

일부 연도·제목이 DOI 메타데이터와 불일치한다. Bloom, Gagné, Bruner, Merrill, Keller,
Papert의 일부 연표 사건은 사건보다 오래된 자료만 연결되어 있다.

**2026-08-14 갱신**: Bloom·Gagné·Bruner·Merrill·Keller·Papert의 연표 오귀속 6건을 사건 당대의
1차·2차 문헌으로 교체했다(`anderson-krathwohl-2001`, `gagne-1974`, `bruner-1990`,
`merrill-twitchell-1994`, `keller-1983`, `papert-1993`). Papert 연표의 1967년 Logo turtle
사건은 당대 1차 문헌을 찾지 못해 여전히 미해결로 남는다.

## 5. 전기의 C 티어 의존

다수 인물의 생애 서술이 Wikipedia 등 C 티어 자료에 의존한다. A·B 티어 전거로 교체해야 한다.

**2026-08-14 갱신**: 듀이·손다이크·비고츠키·스키너·블룸·가녜·브루너·반두라·메릴·켈러·파퍼트·메이어
12명에 대해 학회 전기 회고록(National Academy of Sciences 등)·대학 공식 부고·피어리뷰 인터뷰
논문 등 tier B 전기 출처를 신규 등재하고 기존 `bio-wiki-*` 각주 옆에 병행 인용으로 추가했다.
그럼에도 이 12명 외 나머지 위인들의 생애 서술은 여전히 C 티어 단독 근거에 의존하며, 대체할
tier B 후보를 찾지 못한 `bio-dick-authority`, `bio-lave-authority`, `apa-ethics`,
`bio-collins-authority` 네 건도 tier C로 남아 있다(접근일만 `2026-08-14`로 보완).

**2026-08-15 갱신**: `confidence`를 섹션 최약 근거로 재정의하며 전 페이지를 다시 측정한 결과
**C 티어 단독 섹션이 0건**이었다. 위 12명 작업으로 C 티어가 전부 A·B와의 병행 인용이 되었고,
단독 근거로 남은 섹션은 없다. 남은 `bio-dick-authority`·`bio-lave-authority`·`apa-ethics`·
`bio-collins-authority` 네 건도 각 페이지에서 다른 A·B 출처와 함께 인용된다.

따라서 `confidence: low`인 페이지는 하나도 없다. 이전 서술("해당 페이지는 `confidence: low`로
표시되며")은 실제 데이터와 어긋나 있었으므로 삭제했다. 새 정의에서 `low`는 C 단독 섹션이
생기면 발화하는 경보등이다.
