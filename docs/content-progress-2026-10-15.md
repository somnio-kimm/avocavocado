# Content authoring checkpoint — 15 October 2026

This report describes staged source content at `ca07f5c13f20fa879a9d6df86406101696f69875`. It does not report a new downloadable release or completed native-speaker review. The full request remains open in issues #59 and #61.

| Study language | Entries | Entries with a primary example | Still missing an example |
| --- | ---: | ---: | ---: |
| German | 11,288 | 11,288 | 0 |
| English | 12,016 | 164 | 11,852 |
| Spanish | 9,092 | 2,320 | 6,772 |
| French | 8,936 | 2,438 | 6,498 |
| Japanese | 12,027 | 2,483 | 9,544 |
| Korean | 12,026 | 158 | 11,868 |
| Chinese | 11,000 | 11,000 | 0 |

Across 76,385 entries, 29,851 currently have a primary example. This is 1,496 more than the immutable package editions used as the starting point. **46,534 entries still need examples.**

The 43-pair audit also reports 299,714 missing meaning fields and 89,714 missing translations of examples already present. Examples not yet written will create further translation work. Licensed source candidates do not count as completed explanations. The machine-readable snapshot is [content-coverage-2026-10-15.json](content-coverage-2026-10-15.json).

## Completed source milestones

- Japanese: all current N5/N4-tier IDs have examples; 2,483 source rows have six meaning/translation maps. N3–N1 remain incomplete.
- French: all current A1/A2-tier IDs have examples; 2,438 rows have six meaning/translation maps. Higher tiers remain incomplete.
- Spanish: all 2,320 authored rows have six meaning/translation maps; 1,605 pending legacy meaning reviews finished, including an independent 405-entry segment. A1/A2 example tiers are covered, but 6,772 other entries still lack authored examples.
- Korean: 33 original examples and 35 checked reuses added; all 98 authored rows have six meaning/translation maps. Starter examples bring total primary-example coverage to 158.
- English: 25 examples added with seven meaning maps and six foreign-language translations. Three original replacements repair part-of-speech mismatches in reuse candidates. Total primary-example coverage is 164.

Exam tiers are editorial placements. Original sentences, stable IDs and licence chains are preserved, with explicit corrections where the selected sense, grammar or translation was wrong. Independent review findings for the new English and Korean batches were resolved. Further independent and native review remains pending for other staged material; structural tests do not establish linguistic accuracy.

## Review stack

- [#72](https://github.com/somnio-kimm/learn_language/pull/72): immutable authoring-input snapshots.
- [#74](https://github.com/somnio-kimm/learn_language/pull/74): complete-content release validation.
- [#76](https://github.com/somnio-kimm/learn_language/pull/76): Japanese source milestone (draft).
- [#79](https://github.com/somnio-kimm/learn_language/pull/79): French source milestone (draft).
- [#82](https://github.com/somnio-kimm/learn_language/pull/82): Spanish source milestone (draft).
- [#83](https://github.com/somnio-kimm/learn_language/pull/83): Korean source batch (draft).
- [#84](https://github.com/somnio-kimm/learn_language/pull/84): English source batch (draft).

## Validation and release state

The combined working branch passes 185 unit tests and `npm run check` on Node 26.11.1 / npm 12.2.0. Each isolated content PR branch passes 182 unit tests and project/shell checks. No UI code changed in this checkpoint, so no new simulator verification is claimed.

Released package files and the catalogue are unchanged. The catalogue still offers 13 eligible explanation pairs; the other 30 are not ready. No PRs were merged and no incomplete language pair was published. Local machine drafts that failed language-quality pilots were not admitted.

## Resume safely

Authoring worktrees, source caches, recovery scripts and review queues now live in the persistent `learn_language_worktrees` directory beside the primary repository, rather than temporary storage. The primary checkout's unrelated app changes were left intact.

Next queues: Japanese N3 at saved candidate index 456; French B1 at index 446; Spanish native examples beyond the existing 2,320; broad English/Korean examples; and missing explanation languages for German/Chinese. Keep processing on this Mac. Retain source licences and review selected sense/POS before reusing any cross-language example. Do not label the full corpus complete until every required entry and pair passes the release gate.
