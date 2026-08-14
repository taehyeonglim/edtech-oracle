---
title: 변경 기록
type: meta
updated: 2026-08-14
---

## 2026-08-14 — pantheon 이관

edtech-pantheon에서 위인 36명, 대립축 34개, 공유 개념 3개, 인용 출처 122건을 이관했다. 출처 레지스트리는 124건 전체를 담았다.

## 2026-08-14 — 파일럿 3인 심화

가녜·파퍼트·메이어에 `## 당대의 비판`과 `## 한계`를 추가했다. 이관본은 pantheon의 편집 요약이라 각 이론의 약점을 담지 않는데, 근거 기반 시스템에서 한계를 말하지 못하면 `[근거없음]` 마커가 작동할 자리가 없다.

## 2026-08-14 — 위인 33인 확장

`gpt-5.6-luna`가 6배치로 나머지 33인에 같은 두 섹션을 추가했다. 배치는 대립축 상대가 같은 인스턴스에 들어가지 않게 나눴다 — 한 인스턴스가 양쪽을 쓰면 대립이 뭉개진다.

배치 1을 먼저 돌려 귀속 정확성을 검사한 뒤 나머지를 실행했다. 신규 인용 6건은 모두 기존 `sources.json` 범위 안이며 새 출처는 등재되지 않았다. 새 개념 제안(`proposed_concepts`)은 없었다.

생성 지시서는 `.codex-tasks/`에 커밋되어 있다. 전수 검토는 하지 않았고 표본(스웰러·클라크·앤 브라운·듀이)에서 귀속 오류는 발견되지 않았다.

## 2026-08-14 — 서지·연표 오귀속 수정

`KNOWN-ISSUES.md` #4가 지적한 6건을 고쳤다. 블룸·가녜·브루너·메릴·켈러·파퍼트 연표에서 사건 연도보다 오래되거나 다른 시기의 출처가 걸려 있던 각주를 사건 당대의 1차·2차 문헌으로 교체했다: `anderson-krathwohl-2001`(블룸 2001년 개정 분류학), `gagne-1974`(가녜 1974년 저작), `bruner-1990`(브루너 1990년 저작), `merrill-twitchell-1994`(메릴 1994년 Instructional Transaction Theory), `keller-1983`(켈러 1983년 ARCS 원논문), `papert-1993`(파퍼트 1993년 The Children's Machine). 6건 모두 `sources.json`에 신규 등재하고 `wiki/sources/`에 요약 페이지를 만들었다. 파퍼트 연표의 1967년 Logo turtle 항목은 당대 1차 문헌을 찾지 못해 그대로 두었다.

## 2026-08-14 — 전기 tier B 병행 인용 12건 추가

`KNOWN-ISSUES.md` #5(전기의 C 티어 의존)를 완화하기 위해 듀이·손다이크·비고츠키·스키너·블룸·가녜·브루너·반두라·메릴·켈러·파퍼트·메이어 12명 페이지에 학회 전기 회고록·대학 공식 부고·피어리뷰 인터뷰 논문 등 tier B 출처를 신규 등재하고, 기존 `bio-wiki-*`(tier C) 각주 옆에 병행 인용으로 추가했다. 기존 C 티어 각주는 삭제하지 않았다.

각 URL은 curl로 1차 확인했으나 nasonline.org(듀이·손다이크·스키너), escholarship.org(반두라), apa.org(메이어) 등은 봇 차단(Cloudflare/Incapsula/CloudFront)으로 직접 fetch가 막혀 있었다. 대부분은 r.jina.ai 리더 프록시로 재확인해 본문·메타데이터가 실제로 해당 인물의 전기 사실과 일치함을 검증했다(스키너 국립과학원 회고록은 chapter/19가 실제로 스키너 항목임을 본문 생몰년으로 재확인). eScholarship의 반두라 부고는 리더 프록시에서도 CAPTCHA로 막혀, DuckDuckGo 검색 스니펫에 노출된 초록(저자 Ozer, 반두라 1925–2021 부고임)으로 대신 확인했다. apa.org의 메이어 인용 페이지는 작업 지시서에 적힌 서지(2008년 APA 수상)와 실제 페이지 내용(2018년 Presidential Citation)이 달라, 실제 페이지 제목·연도로 정정해 등재했다(`apa-mayer-2018`).

신규 출처 12건은 `sources.json`에 등재하고 `wiki/sources/`에 요약 페이지를 만들었으며 `raw/MANIFEST.md`에도 등재했다. `sources.json`의 `bio-dick-authority`, `bio-lave-authority`, `apa-ethics`, `bio-collins-authority` 네 건은 대체할 tier B 후보를 찾지 못해 `accessed: 2026-08-14` 필드만 추가했다.

## 2026-08-14 — 확장 33인 `## 당대의 비판`·`## 한계` 전수 감사

`gpt-5.6-luna`가 생성한 확장 33인(로버트 가녜·시모어 파퍼트·리처드 메이어를 제외한 전원)의 `## 당대의 비판`과 `## 한계` 섹션을 6개 서브에이전트로 병렬 전수 감사했다. 이전 로그(2026-08-14 "위인 33인 확장" 항목)에서는 배치 1과 스웰러·클라크·앤 브라운·듀이 4인만 표본 검토했으나, 이번에는 33명 전원을 대상으로 (1) 각주가 출처 페이지의 실제 내용을 뒷받침하는지, (2) "당대의 비판"에서 인용된 상대 위인의 주장이 상대방 자신의 페이지 핵심 명제와 모순되지 않는지, (3) 티어 오분류(C 티어 단독 근거) 여부, (4) 각주 없는 단정 서술 여부를 대조했다.

감사 대상: albert-bandura, charles-reigeluth, jean-lave, john-sweller, richard-clark, sidney-pressey, allan-collins, david-jonassen, jean-piaget, joseph-novak, rita-richey, thomas-gilbert, ann-brown, barbara-seels, jeroen-van-merrienboer, lev-vygotsky, robert-glaser, walter-dick, david-merrill, edgar-dale, edward-thorndike, jerome-bruner, marlene-scardamalia, benjamin-bloom, john-dewey, michael-g-moore, robert-heinich, robert-kozma, bf-skinner, etienne-wenger-trayner, john-keller, ralph-tyler, robert-mager.

결과: 33명 전원 이상 없음. 각주-출처 불일치, 상대 위인 페이지와의 모순, 티어 오분류, 근거 없는 단정 서술이 하나도 발견되지 않았다.

비차단 관찰 사항 두 가지:

1. `## 당대의 비판` 섹션명은 문자 그대로는 "동시대 비판"을 암시하지만, 위키 전체에 걸쳐 실제로는 사후 학술 대조(후대 정리서·타 시대 인물과의 비교 등)로 일관되게 쓰인다. 오류가 아니라 명명 관행이다.
2. `ralph-tyler.md`는 `related: []`이고 `## 대립축` 섹션이 없어 해당 페이지의 "당대의 비판"이 별도 debate 페이지로 뒷받침되지 않는다. 다만 이는 다른 여러 페이지에서도 나타나는 기존 패턴으로, 이번 감사에서 새로 발견된 결함은 아니다.
