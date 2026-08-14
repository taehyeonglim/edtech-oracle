# 원자료 목록

`raw/`의 파일은 저작권 때문에 커밋하지 않는다(`.gitignore`). 이 표가 근거 추적의 공개 지점이다 — 원문은 없어도 "무엇을 근거로 삼았는지"는 공개된다.

| id | tier | 서지 | 원문 위치 | 접근일 |
|---|---|---|---|---|
| pillsbury-dewey-1957 | B | Pillsbury (1957) John Dewey 1859–1952: A Biographical Memoir | 원문 미보관 — <https://www.nasonline.org/wp-content/uploads/2024/06/dewey-john.pdf> | 2026-08-14 |
| woodworth-thorndike-1952 | B | Woodworth (1952) Edward Lee Thorndike: A Biographical Memoir | 원문 미보관 — <https://www.nasonline.org/wp-content/uploads/2024/06/thorndike-edward-1.pdf> | 2026-08-14 |
| vandeveer-valsiner-1991 | B | van der Veer & Valsiner (1991) Understanding Vygotsky: A Quest for Synthesis | 원문 미보관 — <https://archive.org/details/understandingvyg0000veer> | 2026-08-14 |
| rachlin-skinner-1995 | B | Rachlin (1995) B. F. Skinner (Biographical Memoirs, Vol. 67) | 원문 미보관 — <https://www.nationalacademies.org/read/4894/chapter/19> | 2026-08-14 |
| uchicago-bloom-1999 | B | University of Chicago News Office (1999) Bloom, influential education researcher | 원문 미보관 — <https://chronicle.uchicago.edu/990923/bloom.shtml> | 2026-08-14 |
| rothkopf-gagne-2002 | B | Rothkopf (2002) In Appreciation: Robert Mills Gagné (1916–2002) | 원문 미보관 — <https://www.psychologicalscience.org/observer/in-appreciation-robert-mills-gagne-1916-2002> | 2026-08-14 |
| gardner-bruner-2017 | B | Gardner (2017) Jerome Seymour Bruner (Biographical Memoir) | 원문 미보관 — <https://www.amphilsoc.org/sites/default/files/2018-03/attachments/Bruner.pdf> | 2026-08-14 |
| ozer-bandura-2022 | B | Ozer (2022) Albert Bandura (1925–2021) | 원문 미보관 — <https://escholarship.org/uc/item/8pw310xd> | 2026-08-14 |
| simsek-merrill-2010 | B | Şimşek & Merrill (2010) Interview with M. David Merrill | 원문 미보관 — <https://files.eric.ed.gov/fulltext/ED542979.pdf> | 2026-08-14 |
| simsek-keller-2014 | B | Şimşek & Keller (2014) Interview with John M. Keller on Motivational Design of Instruction | 원문 미보관 — <https://files.eric.ed.gov/fulltext/EJ1105558.pdf> | 2026-08-14 |
| mitnews-papert-2016 | B | MIT News Office (2016) Seymour Papert, pioneer of constructionist learning, dies at 88 | 원문 미보관 — <https://news.mit.edu/2016/seymour-papert-pioneer-of-constructionist-learning-dies-0801> | 2026-08-14 |
| apa-mayer-2018 | B | American Psychological Association (2018) Richard E. Mayer, PhD, Awarded 2018 Presidential Citation | 원문 미보관 — <https://www.apa.org/about/governance/president/citation/richard-e-mayer> | 2026-08-14 |

## 등재 규칙

1. 논문·도서 전문을 `raw/papers/` · `raw/books/` · `raw/archives/`에 넣는다
2. `sources.json`에 서지를 등재한다 (id·tier·저자·제목·연도·URL·DOI)
3. 이 표에 한 줄 추가한다
4. `wiki/sources/<id>.md` 요약 페이지를 만든다
5. `npm run lint:strict`로 검증한다

`/ingest` 커맨드가 `curator` 에이전트를 통해 이 절차를 수행한다.

## 현재 상태

pantheon에서 이관한 출처 124건은 원자료 파일 없이 서지와 URL만 `sources.json`에 있다. 위키 본문은 직접 인용문이 아니라 편집 요약이므로 원문 사본 없이도 근거 추적이 성립한다. 원문 대조가 필요한 주장을 보강할 때 이 표가 채워진다.
