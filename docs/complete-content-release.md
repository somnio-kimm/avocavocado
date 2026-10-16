# Complete-content release gate

The requested release covers all 76,385 stable entries across seven study languages and exactly 43 explanation pairs. Every entry requires at least one useful example in its study language, a meaning in every allowed explanation language, and a translation of each example into each allowed explanation language. Only English has a same-language explanation pair.

`prepare-content-review.mjs OUTPUT_DIRECTORY NIKL_SENSES_JSON [WIKTIONARY_FACTS_JSON]` exports one sense-review task per stable entry. Each task carries its input digest, current meanings and examples, known corrections, original source metadata, and separate source candidates. A candidate definition is not automatically promoted to accepted text. Corrected source concepts are not reused blindly. Source examples may be reused only with their attribution and licence; otherwise examples must be written specifically for the selected sense.

`compileCompleteMatrix` in `scripts/content/complete-matrix.mjs` checks the complete proposed corpus before producing package objects. It refuses missing entries, missing languages, missing translations, unsupported/restricted licences, invalid focus spans, unresolved findings, and stale review digests. It produces seven cores and 43 explanation packages only when the complete input satisfies the contract. It does not write a partial catalogue or substitute a different language for missing text.

Each entry's review must cover the selected sense, part of speech, native grammar, translated meaning, tense/negation/quantity, and explanation language. The reviewer must differ from the authoring agent. The digest binds the decision to the exact text, lexical facts and provenance checked. These are explicit AI editorial checks, not native-speaker certification. Unit tests of this contract do not prove that a corpus has passed its language review.

Released authoring/correction inputs are preserved under `language-packages/sources/examples/editions/VERSION/`. Mutable authoring sidecars can then grow without changing the source hashes of a released edition. The edition report records those immutable input paths. The example builder writes matching snapshots alongside proposed package files; copy those snapshots when reviewing a new edition. Released JSON payloads remain unchanged.

The task inventory is a work queue, not a completion report. Its missing sentence-translation count concerns examples already present; examples still to be written create further translation work. Re-run the inventory after a stable authoring checkpoint. No API credentials, model weights or raw source caches belong in the repository.

Once all independent review records are complete, run:

```sh
node scripts/build-complete-content.mjs REVIEWED_RECORD_DIRECTORY OUTPUT_DIRECTORY 4.0.0
```

The record directory must contain `de-reviewed.jsonl`, `en-reviewed.jsonl`, `es-reviewed.jsonl`, `fr-reviewed.jsonl`, `ja-reviewed.jsonl`, `ko-reviewed.jsonl` and `zh-reviewed.jsonl`. This command validates the entire corpus and package sizes before writing any payload; it writes the catalogue last. Its output directory is staging only. It cannot download models, spend API credits, install packages into the app or certify native review.

## Batch drafting

The resumable draft runner uses only an explicitly selected loopback endpoint, including a local SSH tunnel. It defaults to a 25-entry quality pilot, preserves input digests and model revisions, stops on errors, and cannot approve or publish its own output:

```sh
python3 scripts/content/run-content-drafts.py \
  --tasks /path/to/ja-review-tasks.jsonl --output /path/to/draft-cache \
  --endpoint http://127.0.0.1:8900/v1 --model MODEL_ID --revision PINNED_REVISION
```

Only use `--limit 0` after the pilot has been independently checked and the compute resource is authorised. The runner does not install or start a model server. Its output remains `unreviewed-machine-draft`; it is not accepted by the complete-release compiler. An independent reviewer must resolve the selected sense, attribution and translation findings before constructing reviewed records. The current small local translation model has shown meaning drift in probes, so raw machine output cannot be used as a shortcut to complete coverage.

`proposeExampleReuse` can prepare cross-language example candidates from complete translation maps. It requires the same original dictionary sense, matching part of speech and a valid target surface. Corrected or warning-tagged concepts are excluded. This is only a way to reduce duplicate authoring work: each receiving entry still needs independent semantic review, and the original authoring provenance must be retained.

## Persistent authoring and definition provenance

Use a persistent Git worktree for sidecars and a persistent sibling directory for source caches, review queues and model output. Do not keep the only copy of unfinished work in `/tmp`. Commit validated checkpoints separately by language. Model weights and source archives remain outside Git.

Authored rows may contain `meanings` and matching `meaningProvenance` maps keyed by explanation locale. Each value needs its own creator and licence; imported or adapted meanings also need the source URL. An original sentence’s licence does not replace the share-alike licence of an adapted dictionary definition. Explicit corrections take priority; uncorrected installed meanings retain their selected sense. New maps fill missing languages.

The draft runner supports separate `example` and `translation` tasks as well as complete-entry tasks. Input, model and prompt digests identify resumable drafts, and failed completions are retained. All current inference must stay on this Mac; remote machines and paid APIs are outside the authorised workflow. Structural validation and nonempty fields never establish translation accuracy.
