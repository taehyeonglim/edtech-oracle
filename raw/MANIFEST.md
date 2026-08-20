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

## 원문 확보 현황 (2026-08-20)

`npm run fetch:raw`이 **공개 경로만** 시도한 결과다. 유료 장벽은 우회하지 않는다.

| | 건수 |
|---|---:|
| **확보** | **49** |
| 미확보 | 209 |
| 합계 | 258 |

확보 경로별: ERIC 전문 18 · PDF 직링크 15 · 기관 공개 페이지 14 · archive.org 전문 2

미확보 사유별:

- 공개 경로가 알려져 있지 않다 (유료 저널·상용 출판사) — 172건
- 서버가 접근을 차단했다 (401·403) — 22건
- 공개 경로를 시도했으나 전문이 없다 (404) — 12건
- 본문으로 보기 어려운 응답 (로그인 페이지·빈약한 내용 등) — 3건

**`미확보`는 `없음`이 아니다.** 레지스트리와 아카이브 조회는 자주 실패하고, 한 번의 실패를
부재로 기록하면 실재하는 문헌을 버리게 된다. archive.org 19건 중 17건이 여기 해당한다 —
대출 전용 도서라 전문 텍스트가 공개되지 않을 뿐 자료 자체는 실재한다.

### 확보한 49건

| id | tier | 서지 | 보관 위치 | 경로 |
|---|---|---|---|---|
| bio-glaser-aps | B | Lauren B. Resnick; Drew Gitomer; Susanne Lajoie; Sigmund Tobias (2013) Remembering Robert  | `raw/books/bio-glaser-aps.html` | 기관 공개 페이지 |
| bio-heinich-iu | B | Indiana University School of Education (2020) Robert Heinich — In Memoriam | `raw/archives/bio-heinich-iu.pdf` | PDF 직링크 |
| bio-piaget-unige | B | Centre Jean Piaget Jean Piaget — Trajectory | `raw/books/bio-piaget-unige.html` | 기관 공개 페이지 |
| bio-reigeluth-author | A | Charles M. Reigeluth About Me | `raw/books/bio-reigeluth-author.html` | 기관 공개 페이지 |
| bio-richey-wayne | B | Academy of Scholars Rita C. Richey — Academy Member Profile | `raw/books/bio-richey-wayne.pdf` | PDF 직링크 |
| bio-scardamalia-ikit | B | Institute for Knowledge Innovation and Technology Marlene Scardamalia | `raw/books/bio-scardamalia-ikit.html` | 기관 공개 페이지 |
| bio-vygotsky-msu | B | Faculty of Psychology, Lomonosov Moscow State University Lev Semyonovich Vygotsky (Novembe | `raw/books/bio-vygotsky-msu.html` | 기관 공개 페이지 |
| bloom-1968 | B | Benjamin S. Bloom (1968) Learning for Mastery | `raw/books/bloom-1968.pdf` | ERIC 전문 |
| brown-1977-metacognition | A | Ann L. Brown (1977) Knowing When, Where, and How to Remember: A Problem of Metacognition | `raw/books/brown-1977-metacognition.pdf` | ERIC 전문 |
| brown-et-al-1982-learning | A | Ann L. Brown; John D. Bransford; Roberta A. Ferrara; Joseph C. Campione (1982) Learning, R | `raw/books/brown-et-al-1982-learning.pdf` | ERIC 전문 |
| brown-palincsar-1982-self-control | A | Ann L. Brown; Annemarie Sullivan Palincsar (1982) Inducing Strategic Learning from Texts b | `raw/books/brown-palincsar-1982-self-control.pdf` | ERIC 전문 |
| clark-salomon-1986-media-teaching | A | Richard E. Clark; Gavriel Salomon (1986) Media in Teaching | `raw/books/clark-salomon-1986-media-teaching.pdf` | PDF 직링크 |
| collins-1986-inquiry-goals | A | Allan Collins (1986) Different Goals of Inquiry Teaching | `raw/books/collins-1986-inquiry-goals.pdf` | PDF 직링크 |
| collins-1989 | A | Allan Collins; John Seely Brown; Susan E. Newman (1989) Cognitive Apprenticeship: Teaching | `raw/books/collins-1989.pdf` | ERIC 전문 |
| collins-grignetti-1975-intelligent-cai | A | Allan Collins; Mario C. Grignetti (1975) Intelligent CAI: Final Report (1 March 1971–31 Au | `raw/books/collins-grignetti-1975-intelligent-cai.pdf` | PDF 직링크 |
| dewey-1916 | A | John Dewey (1916) Democracy and Education | `raw/books/dewey-1916.txt` | archive.org 전문 |
| dick-1987-curriculum-development | A | Walter Dick (1987) Instructional Design and the Curriculum Development Process | `raw/papers/dick-1987-curriculum-development.pdf` | PDF 직링크 |
| gardner-bruner-2017 | B | Howard Gardner (2017) Jerome Seymour Bruner (Biographical Memoir) | `raw/books/gardner-bruner-2017.pdf` | PDF 직링크 |
| glaser-nitko-1970-measurement | A | Robert Glaser; Anthony J. Nitko (1970) Measurement in Learning and Instruction | `raw/books/glaser-nitko-1970-measurement.pdf` | ERIC 전문 |
| heinich-1967-changing-aspects | A | Robert Heinich (1967) The Changing Aspects of Instructional Technology | `raw/papers/heinich-1967-changing-aspects.pdf` | PDF 직링크 |
| heinich-1972-eclectic-definition | A | Robert Heinich (1972) Toward a Definition of Instructional Development: An Eclectic Approa | `raw/books/heinich-1972-eclectic-definition.pdf` | PDF 직링크 |
| heinich-1973-management-models | A | Robert Heinich (1973) Management Models and Instructional Productivity | `raw/books/heinich-1973-management-models.pdf` | ERIC 전문 |
| inhelder-piaget-1955-formal-operations | A | Bärbel Inhelder; Jean Piaget (1955) De la logique de l’enfant à la logique de l’adolescent | `raw/books/inhelder-piaget-1955-formal-operations.html` | 기관 공개 페이지 |
| mitnews-papert-2016 | B | MIT News Office (2016) Seymour Papert, pioneer of constructionist learning, dies at 88 | `raw/books/mitnews-papert-2016.html` | 기관 공개 페이지 |
| moore-1973 | A | Michael G. Moore (1973) Toward a Theory of Independent Learning and Teaching | `raw/papers/moore-1973.pdf` | ERIC 전문 |
| piaget-1937-construction-reality | A | Jean Piaget (1937) La construction du réel chez l’enfant | `raw/books/piaget-1937-construction-reality.html` | 기관 공개 페이지 |
| piaget-1945-symbol-formation | A | Jean Piaget (1945) La formation du symbole chez l’enfant: imitation, jeu et rêve, image et | `raw/books/piaget-1945-symbol-formation.html` | 기관 공개 페이지 |
| piaget-1969-psychology-pedagogy | A | Jean Piaget (1969) Psychologie et pédagogie | `raw/books/piaget-1969-psychology-pedagogy.html` | 기관 공개 페이지 |
| rachlin-skinner-1995 | B | Howard Rachlin (1995) B. F. Skinner (Biographical Memoirs, Vol. 67) | `raw/books/rachlin-skinner-1995.html` | 기관 공개 페이지 |
| reigeluth-frick-1999 | A | Charles M. Reigeluth; Theodore W. Frick (1999) Formative Research: A Methodology for Creat | `raw/books/reigeluth-frick-1999.html` | 기관 공개 페이지 |
| richey-1977-pact | A | Rita C. Richey (1977) The Design, Implementation, and Revision of Instructional Materials  | `raw/books/richey-1977-pact.pdf` | ERIC 전문 |
| richey-1988-competency-success | A | Rita C. Richey (1988) Instructional Technology Academic Preparation, Competency, and On-th | `raw/books/richey-1988-competency-success.pdf` | ERIC 전문 |
| richey-1994-developmental-research | A | Rita C. Richey (1994) Developmental Research: The Definition and Scope | `raw/books/richey-1994-developmental-research.pdf` | ERIC 전문 |
| rothkopf-gagne-2002 | B | Ernst Z. Rothkopf (2002) In Appreciation: Robert Mills Gagné (1916–2002) | `raw/books/rothkopf-gagne-2002.html` | 기관 공개 페이지 |
| scardamalia-2002-collective-cognitive-responsibility | A | Marlene Scardamalia (2002) Collective Cognitive Responsibility for the Advancement of Know | `raw/books/scardamalia-2002-collective-cognitive-responsibility.pdf` | PDF 직링크 |
| scardamalia-2003-knowledge-building | A | Marlene Scardamalia (2003) Knowledge Building | `raw/papers/scardamalia-2003-knowledge-building.pdf` | PDF 직링크 |
| seels-1993-evaluation-domain | A | Barbara Seels (1993) The Knowledge Base of the Evaluation Domain | `raw/papers/seels-1993-evaluation-domain.pdf` | ERIC 전문 |
| seels-1995-taxonomy | A | Barbara Seels (1995) Classification Theory, Taxonomic Issues, and the 1994 Definition of I | `raw/papers/seels-1995-taxonomy.pdf` | ERIC 전문 |
| seels-1997-cone | A | Barbara Seels (1997) The Relationship of Media and ISD Theory: The Unrealized Promise of D | `raw/papers/seels-1997-cone.pdf` | ERIC 전문 |
| seels-et-al-1996-message-design | A | Barbara Seels; Babs Mowery; Susan O'Rourke; Cathy J. Proviano; Mary C. Rothenberger; Norma | `raw/papers/seels-et-al-1996-message-design.pdf` | ERIC 전문 |
| seels-et-al-1996-television | A | Barbara Seels; Louis H. Berry; Karen Fullerton; Laura Horn (1996) Integrated Research on L | `raw/papers/seels-et-al-1996-television.pdf` | ERIC 전문 |
| seels-glasgow-1991 | A | Barbara Seels; Zita Glasgow (1991) Survey of Instructional Design Needs and Competencies | `raw/papers/seels-glasgow-1991.pdf` | ERIC 전문 |
| simsek-keller-2014 | A | Ali Şimşek; John M. Keller (2014) Interview with John M. Keller on Motivational Design of  | `raw/papers/simsek-keller-2014.pdf` | PDF 직링크 |
| simsek-merrill-2010 | A | Ali Şimşek; M. David Merrill (2010) Interview with M. David Merrill: Half a Century of Exp | `raw/papers/simsek-merrill-2010.pdf` | PDF 직링크 |
| skinner-1958-teaching-machines | A | B. F. Skinner (1958) Teaching Machines | `raw/papers/skinner-1958-teaching-machines.pdf` | PDF 직링크 |
| thorndike-1913 | A | Edward L. Thorndike (1913) Educational Psychology: The Original Nature of Man | `raw/books/thorndike-1913.txt` | archive.org 전문 |
| tyler-1973-affective-domain | A | Ralph W. Tyler (1973) Assessing Educational Achievement in the Affective Domain | `raw/papers/tyler-1973-affective-domain.pdf` | ERIC 전문 |
| tyler-eight-year | B | University of Chicago Library (1931–1942) Ralph W. Tyler Papers — Eight-Year Study records | `raw/archives/tyler-eight-year.pdf` | PDF 직링크 |
| uchicago-bloom-1999 | B | University of Chicago News Office (1999) Bloom, influential education researcher | `raw/books/uchicago-bloom-1999.html` | 기관 공개 페이지 |

## 등재 규칙

1. 논문·도서 전문을 `raw/papers/` · `raw/books/` · `raw/archives/`에 넣는다
2. `sources.json`에 서지를 등재한다 (id·tier·저자·제목·연도·URL·DOI)
3. 이 표에 한 줄 추가한다
4. `wiki/sources/<id>.md` 요약 페이지를 만든다
5. `npm run lint:strict`로 검증한다

`/ingest` 커맨드가 `curator` 에이전트를 통해 이 절차를 수행한다.

## 현재 상태

pantheon에서 이관한 출처 124건은 원자료 파일 없이 서지와 URL만 `sources.json`에 있다. 위키 본문은 직접 인용문이 아니라 편집 요약이므로 원문 사본 없이도 근거 추적이 성립한다. 원문 대조가 필요한 주장을 보강할 때 이 표가 채워진다.
