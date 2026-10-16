# Explanation generation priority

The saved full-corpus command uses
`--draft-only --examples-first --priority-locales en ko`.
Generation remains paused until the user explicitly requests a restart.
When resumed, it rotates across study languages within three ordered phases:

1. Missing native example sentences for every study language.
2. English/Korean meanings and example translations.
3. All remaining explanation languages.

Existing fields are retained. English-to-English meanings are eligible;
its native sentence is reused directly. Korean-to-Korean explanations are omitted.

Native examples are included because their translations cannot be drafted until
the source sentence exists. It does not interleave explanations with the first
native-example phase. After no ready jobs remain in a phase, the worker
continues the next phase automatically. This is a scheduling
phase transition, not a quality-completion claim: failed jobs and linguistic
reviews still require resolution. Restarting the worker checks native examples first.

`status.json` exposes `priority_locales` and `generation_phase` alongside the
current PID and saved-result count. Queue progress, source provenance and the final
Google Drive backup are unchanged. This option currently applies to drafting only;
review scheduling remains separate.

Estimate remaining drafting time from saved results over an observed interval,
including native examples and translations that have not yet been enqueued.
Each missing native example creates six cross-language translations. For the
English/Korean priority phase it creates two, except English and Korean study
entries, which each need one. Do not count an English sentence as needing an
English translation. Runtime estimates exclude semantic review and repairs.
