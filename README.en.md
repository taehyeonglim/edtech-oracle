# EdTech Oracle

[한국어](README.md) · **English**

**[Browse the evidence wiki → taehyeonglim.github.io/edtech-oracle](https://taehyeonglim.github.io/edtech-oracle/)**

Ask a question about educational technology and **36 pioneers of the field answer by citing scholarly
sources.** Sometimes one answers, sometimes several disagree, and sometimes they debate each other.

If the predecessor project [edtech-pantheon](https://github.com/taehyeonglim/edtech-pantheon) is an
archive for **reading** the field, Oracle is a system that **speaks** from the same evidence.

> **Status — working, with formal integrity enforced by machine**
>
> The evidence wiki for 36 pioneers and their subagents run, and there is a
> [browsable site](#the-browsable-site) that lets you follow every citation.
> The Discord bot ([`bot/`](bot/)) has been verified in production through `/ask` and all three
> rounds of `/debate`. On 2026-08-20 a run of [85 performance probes](#measurement--what-has-been-verified)
> confirmed **zero forgery, zero hallucination, and 100% pioneer isolation.**
>
> **What has *not* been verified matters more.** No machine decides whether *this footnote actually
> supports this sentence.* Please read [Known Issues](#known-issues) alongside this.

## What makes it different

This project has exactly one constraint — **every statement cites its evidence.**

So the pioneers speak with one of three markers attached:

```
[근거]     Grounded    — a claim found directly in my literature. Footnote required
[적용]     Applied     — inference from my principles to a modern situation.
                         Footnote for the originating principle + must state it is inference
[근거없음] No grounds   — my literature has no basis for this. Do not make things up
```

`[적용]` (Applied) exists because of the time gap. Users ask about generative AI, LMS platforms, and
microlearning, while the pioneers lived between roughly 1900 and 2000. Without the marker, a sentence
like *"Gagné said this about AI tutors"* circulates as if it were a grounded claim.

`[근거없음]` (No grounds) is not evasion — it is an honesty device. Without it, the pioneers invent
plausible answers.

> Markers stay in Korean in the source data because they are parsed literally by the gate
> (`scripts/check-answer.mjs`). English glosses are given here for readers.

## Architecture

Follows Karpathy's [LLM Wiki](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
pattern — three layers and three operations are fixed; the schema is designed for this domain.

```
raw/          Layer 1 · immutable primary sources (gitignored; only the index is public via MANIFEST.md)
wiki/         Layer 2 · markdown maintained by agents
CLAUDE.md     Layer 3 · the schema of record
```

```
wiki/
├── index.md · log.md · router-map.md · KNOWN-ISSUES.md   type: meta
├── pioneers/   36   each pioneer's identity and positions
├── debates/    34   axes of disagreement (e.g. the Clark–Kozma media-effects debate)
├── concepts/    6   canonical concept pages
└── sources/   256   source summaries
```

`sources.json` registers 258 sources with tiers (A 168 · B 73 · C 17). The difference of 2 is
explained in [Known Issue 7](#known-issues) — the site surfaces it rather than hiding it.

### How evidence is written

```markdown
Gagné divided learning outcomes into five categories and held that each
requires different internal and external conditions.[^gagne-1965]

[^gagne-1965]: Robert M. Gagné. (1965). The Conditions of Learning.
    Holt, Rinehart and Winston. <https://archive.org/details/conditionsoflear0000gagn>
    — tier A · [[sources/gagne-1965]]
```

The tier is embedded inline in the footnote. You should be able to judge the strength of the evidence
from the answer text alone, without opening `sources.json`.

| Tier | Definition | Constraint |
|---|---|---|
| **A** | **The pioneer's own original work** — book or research paper, format does not matter. Includes first-person records and primary archives | none |
| **B** | Later syntheses, edited volumes, textbooks, translations; scholarly work by others; official records of societies and universities | none |
| **C** | Encyclopedias and general references | **never the sole basis** |

The A/B boundary is *original work vs. later synthesis*, not *paper vs. book*. That correction
(2026-08-16) removed the need for a tier-exception mechanism entirely — **a proliferation of
exceptions was the signal that the rule itself was wrong.**

### confidence — the weakest section represents the page

A page's `confidence` is **the weakest among the "strongest tier in each `##` section."**
`high` means every section is backed by original work; `medium` means some section's best evidence is
secondary literature; `low` means some section's best is an encyclopedia.

Treating the page as one blob makes the field meaningless, because a pioneer always cites their own
major work (tier A). Right after the migration, **all 36 pioneers and all 34 debates were `high`** —
`import` computed "high if any A or B exists" and rule 8 verified it *with the same predicate*.
A value checking itself cannot fail.

Redefining it per section split pioneers into 14 `high` · 22 `medium` and debates into 27 · 7.
After the source expansion (2026-08-18) it became **pioneers 23 · 13, debates 34 · 0, concepts 6 · 0.**
The remaining 13 `medium` are life-and-career sections backed only by biographical memoirs (tier B),
and **that is not a target** — chasing A there means hunting for autobiographies that do not exist.
`low` is currently 0, but remains a warning light that fires if a C-only section appears.

The value is never set by hand. `npm run sync:confidence` computes and fills it, and rule 8 catches
mismatches — the same structure by which rule 4 validates the `sources` array.

`source` pages do not carry this field. A source page cites only itself, so `confidence` would just
restate that source's tier, which is already displayed on the page.

## The browsable site

Footnotes and wikilinks are dead text on GitHub. `[[sources/gagne-1965]]` is not clickable, so the
claim *"every statement cites its evidence"* cannot be followed by eye. Of 1,020 wikilinks,
**754 (74%) are source links inside footnotes** — so the loss is severe.

A static site opens that path — **<https://taehyeonglim.github.io/edtech-oracle/>**

```bash
npm run preview     # build locally + http://localhost:4173
```

- The round trip **body → footnote → source → citing pages** closes. Source pages have no `related`
  field, so without back-references there would be no way out of them
- Every footnote reference carries its tier (A/B/C), so evidence strength is visible where the claim sits
- Browse pioneers, debates, concepts and sources; full-text search; a network map of debate axes

The build runs `lint:strict` first, then checks every internal link in the generated HTML, and only
then writes files. If any step fails it aborts — so that broken evidence is never prettily packaged
and shipped.

Runtime dependencies: zero. `markdown-it` is a build-time devDependency and never reaches the browser.
Only the Discord bot uses `discord.js`, isolated in [`bot/package.json`](bot/package.json) — the wiki
tooling and site build work without `npm install`.

## Usage

```bash
npm install
npm run lint:strict     # wiki evidence integrity
npm run lint:answers    # answer evidence integrity
npm test                # parser · lint · renderer unit tests
npm run build           # build site → dist/

npm run baseline -- --out docs/baselines/YYYY-MM-DD.json   # freeze roster, knowledge level, gate zero
npm run perf -- --out perf-runs/YYYY-MM-DD                 # run performance probes
npm run perf:report perf-runs/YYYY-MM-DD                   # report against the baseline
npm run perf:rejudge perf-runs/YYYY-MM-DD                  # re-judge saved runs without calling the model
npm run fetch:raw                                          # fetch openly available originals → raw/
npm run manifest:raw                                       # record acquisition status in MANIFEST
```

Used as slash commands inside Claude Code:

| Command | What it does |
|---|---|
| `/ask <question>` | A router picks 1–3 pioneers and calls them in parallel. Answers are emitted verbatim, never summarized |
| `/debate <topic>` | Three rounds. Round 1 parallel (independent), round 2 sequential (rebuttal), round 3 issue framing |
| `/ingest <material>` | `curator` folds new material into the wiki. Rolls back if lint fails |
| `/lint` | The 9 rules, plus sampled human review of what machines cannot catch |

`/ask` and `/debate` carry the same names on Discord — [`bot/`](bot/) runs headless Claude Code inside
the repository, so they pass through the same commands and the same gates. `/ingest` and `/lint` are
wiki-write paths and are not exposed to chat.

## Three design decisions

**① Pioneers have no write access.** Pioneer agents hold only `Read, Grep, Glob`. If they could edit
the evidence database while answering, it would be contaminated. Only `curator` writes to the wiki,
and only through `/ingest`.

**② Pioneers do not read each other's pages.** Each reads its own page plus the sources and debate
axes linked from it. File access must be partitioned so they argue from their own evidence rather than
borrowing each other's logic. When a debate needs an opponent's statement, the orchestrator injects it
**through the prompt** — it never leaks in through the wiki.

**③ Agents are generated from the wiki.** `npm run gen-agents` reads the frontmatter of
`wiki/pioneers/*.md` and stamps out all 36. The wiki is the source of record and agents are derived,
so updating evidence and regenerating is the whole synchronization story.

## The 9 lint rules

Evidence integrity enforced by machine. This lint is what makes parallel expansion possible — mass
generation without a gate is generation without verification.

| # | Rule | Applies to |
|---|---|---|
| 1 | Required frontmatter fields present and valid | all |
| 2 | Every `[^id]` reference has a definition | all |
| 3 | Every footnote id exists in `sources.json` | all |
| 4 | Frontmatter `sources` ≡ the set of body footnotes | all |
| 5 | Every `[[wikilink]]` resolves to a real file | all |
| 6 | Every `##` section has ≥ 1 footnote | pioneer · concept · debate |
| 7 | Reachable from `index.md` (no orphans) | all |
| 8 | `confidence` ≡ the computed weakest-section value | pioneer · concept · debate |
| 9 | Footnote bibliography contains the title registered in `sources.json` | all |

`meta` pages (`index` · `log` · `router-map` · `KNOWN-ISSUES`) are exempt from the citation rules.

### What lint cannot catch

**Attribution accuracy is outside machine checking.** A footnote can be defined, exist in
`sources.json`, match the registered title, agree with the declaration, and resolve its links — and
*"is this footnote the basis for this claim?"* still falls through all nine rules. In the first
migration pass, a Kozma paper was attached to a Clark claim and passed lint. Tier misclassification
and evasion of `[근거없음]` are the same. That is why `/lint` also demands sampled review.

## The 11 answer-gate rules

The 9 lint rules only look at `wiki/`. But this system's output is the **answer** generated at runtime,
and the three markers do not even exist in `lint-wiki.mjs`. The evidence database was audited while
what was *said* from it was not. `answers/` and `lint:answers` fill that gap.

`/ask` and `/debate` save answers verbatim to `answers/` and run `check-answer.mjs`. Findings split
into **forgery-grade** and **format-grade** — forgery-grade triggers one re-call of that pioneer, and
if it survives, the answer is emitted with the violation stated. Format-grade is recorded only.

| Severity | Rules | Handling |
|---|---|---|
| Forgery | undefined footnote · source absent from `sources.json` · **citation-scope violation** · tier forgery · unknown speaker · `speakers` mismatch · moderator using footnotes | one re-call → deploy blocked |
| Format | footnote definition format · missing marker · `[근거]` without footnote · `[근거없음]` with footnote | recorded only |

**Citation-scope violation is the heart of this gate.** Because of design decision ② (pioneer
isolation), the set of sources each pioneer may cite is fixed by the `sources` array in their own
frontmatter. If Mayer's biography shows up in a Gagné answer, that is forgery. This check does not
exist in ordinary RAG, where the citable set is open.

The runtime check depends on the orchestrator complying. So `npm run lint:answers` re-checks all of
`answers/` as **CI gate 2**. Even if the runtime check is skipped, an answer containing forgery cannot
enter the repository. The stored `check:` block is a human-readable record only — the gate does not
trust it and recomputes from the body.

### What the answer gate cannot catch

**Attribution accuracy** is still outside. Rule 3 verifies only *"a source Gagné is allowed to cite"*;
*"is this footnote the basis for this sentence?"* remains the job of sampled review under `/lint`.
Marker checking also excludes quotes, lists and tables, so claims arranged as a list pass without
markers. That hole was accepted to reduce false positives — which is why those rules are format-grade.

## Measurement — what has been verified

`lint` and `lint:answers` only look at **artifacts already in the repository.** Nobody was measuring
*"if a pioneer is asked right now, does it answer accurately from within its own evidence?"*
[`scripts/perf/`](scripts/perf/) fills that gap.

First, [`scripts/baseline.mjs`](scripts/baseline.mjs) freezes the roster, each pioneer's knowledge
level, and current gate values, anchored to a commit hash. **Without a measurement zero, the word
"regression" has no meaning.**

### 2026-08-20 measurement (85 probes)

| Probe | Scope | Result |
|---|---|---|
| Common question | 36 pioneers | **36/36** — zero forgery |
| **Hallucination resistance** | **36 pioneers** | **36/36 — nobody made anything up** |
| Clarification | 4 pioneers | 4/4 — `NEEDS_CLARIFICATION` |
| Router | 5 items | 5/5 |
| **Pioneer isolation** | 44 invocations | **44/44** — all went through the `Agent` tool |

**Forgery is zero across all 85 runs.** No invented sources, no citation-scope violations, no tier forgery.

The hallucination probe demands specific numbers from a nonexistent study, maximizing the incentive to
invent. Of the 36, nineteen answered `[근거없음]` and seventeen asked for clarification — Dewey replied
*"I died in 1952, so I could not have conducted research in 1974."*

The Discord bot also completed a three-round `/debate` end to end, with **zero citation-scope
violations (rule 3) in the rebuttal round.** Attaching an opponent's source as your own footnote is an
immediate violation, and four pioneers referenced each other eight times without crossing it.

### Knowledge level does not predict formal discipline

| confidence | Pioneers | Mean format-grade findings |
|---|---:|---:|
| high | 23 | 4.9 |
| medium | 13 | 5.9 |

Mayer had 18 sources and 3 format findings; Ann Brown had 10 sources and 21.
**Adding more sources does not fix format problems** — that points at the prompt or the checker.
This is why the report puts source count and confidence on the same row as performance.

### The judge can be wrong too

The hallucination probe first reported 17 of 36 as failures. Opening the responses showed **the
pioneers were not wrong — the judge was.** The pass condition required the `[근거없음]` marker, but the
agent definition also permits asking for clarification. Counting clarification as failure yields
"didn't make anything up, but failed," and the metric lies.

So the judge was separated from the runner and given [tests](test/perf-judge.test.mjs).
**If you cannot test the judge, you cannot tell a system defect from a judge bug.**
`perf:rejudge` re-evaluates saved responses without calling the model again.

## Acquiring primary sources

For a long time the 258 entries in `sources.json` had only bibliography and URL. `npm run fetch:raw`
tries **openly available paths only** and retrieved **49** (ERIC full text 18 · direct PDF 15 ·
institutional pages 14 · archive.org 2). Paywalls are not circumvented.

The 209 not obtained are recorded with reasons in [`raw/MANIFEST.md`](raw/MANIFEST.md).
**"Not obtained" is not "does not exist"** — 17 of the 19 archive.org items are borrow-only, so the
full text is simply not public while the material itself is real. Originals are not committed for
copyright reasons; only the acquisition table is published.

This connects directly to the largest remaining hole. The gate verifies **"is this a source this
pioneer may cite?"** (scope) and does not verify **"does the source actually say that?"** (content).
Having originals in hand is what makes that comparison possible.

## Known issues

Inherited from the P1 issues published in the pantheon README. The full list lives in
[`wiki/KNOWN-ISSUES.md`](wiki/KNOWN-ISSUES.md).

1. ~~**Ann L. Brown / John Seely Brown confusion**~~ — resolved (2026-08-14). Cognitive apprenticeship
   was already correctly attributed to Collins, Brown and Newman
2. **Weak traceability of relationship evidence** — page, DOI and access-date metadata incomplete
3. **Portrait image rights** — of 36 portraits, 14 have clear provenance; the remaining 22 fall back
   to initials on Discord (**unresolved**)
4. **Thin direct evidence for bibliography and timelines** — partly resolved (2026-08-14). Six
   misattributions (Bloom, Gagné, Bruner, Merrill, Keller, Papert) were replaced with contemporaneous
   literature. Papert's 1967 Logo turtle event remains unresolved — no contemporaneous primary source found
5. **Biographies leaning on tier C** — largely resolved (2026-08-15). Tier B biographical sources were
   added as parallel citations for 12 pioneers, and measurement confirmed **zero C-only sections**.
   Tier C remains on several pages but always alongside A or B, never as sole basis. Hence no page is `low`
6. ~~**Expansion content unreviewed**~~ — resolved (2026-08-14). The "contemporary criticism" and
   "limitations" sections for 33 pioneers were generated by `gpt-5.6-luna` and had passed the lint gate.
   Six subagents audited all 33 in parallel (footnote–source consistency, contradictions against the
   counterpart's page, tier misclassification, unsupported assertions) and found no attribution errors.
   The generation instructions are committed in [`.codex-tasks/`](.codex-tasks/), so any sentence can be
   traced back to the instruction that produced it
7. **Two source rows without pages** — not a defect (confirmed 2026-08-20). `apa-ethics` and
   `bio-vygotsky-msu` are referenced by no footnote, so creating source pages for them would create
   orphan pages. The build surfaces this as a warning rather than hiding it. Cleanup was attempted and
   **two checkers refused it, correctly** — adding a source to a completed pioneer is a reviewed
   transaction (`verify:source-expansion`), and the 142-entry baseline audit is an immutable record

## Roadmap

**Production verification of the Discord bot is complete.** `/ask` and all three rounds of `/debate`
ran through to commit, and logs confirm that round-2 rebuttals also pass through pioneer subagents.
Details in [`bot/README.md`](bot/README.md).

Three things remain.

1. **Comparison against originals** — use the 49 acquired texts to sample-review *"is this footnote
   the basis for this sentence?"* It is the one axis machines cannot check, and it widens as the
   remaining 209 are filled in
2. **Rights for 22 portraits** — 14 of 36 have confirmed provenance; the rest default to initials
3. **Larger debates** — round 2 is sequential by design, so cost scales with participant count.
   Four participants took 22 minutes (76% of the 30-minute limit), so five approaches the limit and six
   exceeds it. The real fix is making the limit a function of participant count rather than a constant

## Documents

- [Design specification](docs/superpowers/specs/2026-08-14-edtech-oracle-design.md) (Korean)
- [Implementation plan](docs/superpowers/plans/2026-08-14-edtech-oracle.md) (Korean)
- [Site implementation plan](docs/superpowers/plans/2026-08-14-wiki-site.md) — 12 pitfalls found by
  measurement and the defenses against them (Korean)
- [Wiki schema](CLAUDE.md) (Korean)

The wiki content itself is written in Korean. This README and the repository structure are the
English-language entry points.

## Sources and license

Content was migrated from [edtech-pantheon](https://github.com/taehyeonglim/edtech-pantheon). Wiki
prose consists of editorial summaries written from the linked sources, not direct quotations. Primary
materials (`raw/`) are not committed for copyright reasons; only the index is published via
[`raw/MANIFEST.md`](raw/MANIFEST.md).
