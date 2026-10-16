# Example authoring and explanation coverage

Keep released study cores and explanation files immutable. New example editions reuse stable word IDs so package updates preserve progress. Code stays bundled; these files contain data only.

Each language owns three sidecars in `language-packages/sources/examples/`: `LANG-authored.jsonl`, `LANG-corrections.jsonl` and `LANG-review-notes.json`. An authored row has a stable `id`, native `text`, English `en`, Korean `ko`, optional additional `translations`, optional `meaningDe`, a literal `focus` span and provenance. All seven language texts are useful for the requested matrix, even though non-English self-explanation downloads are excluded. A repeated focus needs an explicit zero-based start offset.

Original examples are specific usage sentences under CC BY 4.0. Corrections to licensed dictionary senses are marked as adaptations under CC BY-SA 4.0. Source-derived examples must carry their source URL, author and reusable licence. Raw model output remains outside published packages until editorial checking; native-speaker review is separately recorded and remains pending. A commercial-use licence does not establish translation quality or store-distribution compliance.

Run the coverage audit with an optional local NIKL sense export:

```sh
node scripts/audit-explanation-coverage.mjs /tmp/language-coverage /path/to/nikl-senses.json
```

The report covers all 43 eligible pairs. `packageComplete` means all word meanings and translations of the examples currently present are available. `fullExampleCoverage` additionally requires a primary example for every entry. Neither flag means native-speaker review. Licensed definitions found through source sense IDs are reported as candidates, never counted as finished extra-language translations. Corrections invalidate source-sense reuse until their replacement meanings are supplied.

Build a new preview edition outside the repository first:

```sh
node scripts/build-authored-examples.mjs /tmp/example-edition 3.0.0 ja es fr
```

The compiler rejects duplicate/unknown IDs, missing corrected meanings, incomplete explanation translations, unsupported licences and unreviewed machine records. It does not automatically create extra-language downloads from partial sidecars or source candidates. A corrected sense requires a matched replacement example. Previous source examples tied to that corrected sense are removed from the new edition, while the original immutable edition and provenance remain available.

Inspect the generated packages and build report, run schema and browser checks, then copy the new files and catalogue into a small content PR. Regenerate the shell manifest after changing the bundled catalogue. Retain the exact authoring/correction records whose hashes appear in the build report. Never replace a package file with different bytes under the same version.
