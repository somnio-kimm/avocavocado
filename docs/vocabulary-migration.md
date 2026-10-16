# Full archived vocabulary migration

Version 2.0.0 restores 2,000 German study entries and 11,000 Chinese study entries. English and Korean explanation packages each cover their entire study core. Existing archived IDs, grammar fields, level assignments, meaning lists, pronunciation, source records and all 13,003 examples are retained.

| Study language | Levels | Words | Examples |
| --- | --- | ---: | ---: |
| German | A1-C2 editorial study bands | 2,000 | 2,003 |
| Chinese | Archived HSK 1-6 and 7-9 bands | 11,000 | 11,000 |

The separate 143,457-entry German reference corpus is not part of this migration: its archive marks it not publication-ready. This is a format migration, not a new fluent-speaker review or syllabus audit. Archived review-status metadata remains present.

## Reproduction and verification

Run `node scripts/migrate-archived-vocabulary.mjs /path/to/learn_language_legacy_20261014`. The converter reads the archived app data, separates study facts from English/Korean explanations and regenerates the six packages plus their catalogues. Source-file SHA-256 values, counts and canonical full-content fingerprints are recorded in `vocabulary-migration.json`.

All entries can be reconstructed exactly from the core and the two explanation packs. Tests compare those reconstructed fingerprints, package sizes/hashes, all level counts, grammar, additional examples and Tatoeba attribution. Browser checks visit each level and verify the Word List total while retaining batched DOM rows.

## Licences and attribution

German editorial study content retains MIT notices. Chinese definitions, original examples and translations retain CC BY-SA 4.0. The 128 Tatoeba examples retain their individual CC BY 2.0 France credits, source sentence IDs, authors and modification notes. The original attribution inventory and licence texts are under `language-packages/credits/`; Chinese core metadata preserves the complete attribution record. The app Licence screen links to unrestricted content downloads and licence terms.

The app's MIT licence does not relicense learning content. The Creative Commons terms allow commercial reuse subject to their conditions, including attribution and ShareAlike where applicable: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), [CC BY 2.0 France](https://creativecommons.org/licenses/by/2.0/fr/).

## Using the full lists

Open Settings → Language Packages → German or Chinese. Choose Download, or Update if a starter explanation is already installed. The shared study content is handled automatically. Select the installed study and explanation languages in the Settings package card, then open Study → Word List. The default level shows only that level; choose a different level on Study to see the rest.

Version 1.0.0 starter files remain available for rollback/testing. The new IDs preserve archived full-list identities; starter IDs differ and are not silently remapped. Existing progress records are kept, not erased. Progress from the retired standalone apps has not been copied between app sandboxes.
