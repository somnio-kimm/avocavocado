# Original multilingual starter content

These five TSV files contain 281 independently authored, AI-assisted vocabulary entries with English/Korean meanings and original example sentences. Native-speaker review is pending. They are deliberately small starter lists, not complete official exam word lists.

Copyright 2026 Learn Language contributors. Content licence: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Retain the credit, licence link and changes notice when redistributing. Code remains covered by the repository MIT licence. No dictionary export, commercial exam question or external recording is incorporated in these files.

Fields (tab-separated, no header): `level`, `word`, `reading`, `part of speech[/article]`, `English meaning`, `Korean meaning`, `example`, `English example translation`, `Korean example translation`. A `-` reading means no supplied phonetic transcription. Japanese readings are supplied for every entry. Korean/English same-language meanings are explanatory definitions.

Use `node scripts/build-multilingual-packages.mjs` to validate and rebuild the fifteen data-only packages. See [the content guide](../../../docs/multilingual-vocabulary.md) for level caveats, editing and release rules.
