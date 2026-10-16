# Language Packages

In Settings, the Study Language and Explanation Language selectors share a card with Language Packages. Selectors show only complete, installed pairs. Display Language is independent.

Language Packages opens a full page, with downloaded languages first. Open German or Chinese to download an explanation or remove an installed one. The first explanation includes the necessary shared study content; its displayed download size includes both. Further explanations reuse installed content. Core packages and obsolete versions are managed internally.

- Downloads and manual updates commit a complete compatible pair atomically. Failure or cancellation keeps the previous usable version.
- Removing one explanation keeps other explanations and the cores they need. Removing the last explanation reclaims unused shared content.
- Remove Language removes every package version for that language. Confirmation includes the storage recovered.
- Progress is stored separately and retained. Removing the active pair returns to Settings for an explicit replacement selection.
- Installation does not change Display Language. Selection and app restart never download missing content.

Current simulator content hosting is a pinned preview source. Automatic Wi-Fi update scheduling and release-catalogue hosting remain separate work; this screen supports explicit Update when the configured catalogue offers a newer compatible pair.
