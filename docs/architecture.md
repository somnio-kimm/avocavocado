# One app, downloadable language data

The application owns navigation, presentation, progress, grading and language-specific exercise code. Chinese pinyin/tone logic and German inflection/case logic stay language-specific, but both run inside the same application.

A study core owns words, grammatical metadata and target-language examples. A separate pair package (such as de-ko or zh-en) owns meanings and example translations in exactly one explanation language. Each package retains its own license notices. Packages never contain executable JavaScript or native code. Package files live outside the app asset directory so native builds will not silently bundle every language.

Study language and explanation language are separate settings. The first core packages have separate English and Korean explanation packs. Catalog metadata advertises new pairs without hard-coded picker entries; interface translations remain bundled app code. The app offers only translations actually available in a selected package; it must not silently show a different language.

Downloaded bytes are bounded, checked against the catalog hash and schema, then installed in one storage transaction per package/version. Explanation entries must cover the stable IDs in their required core version before they can be stored and exposed as a study view. Core versions coexist when explanation packs update at different times. Failed downloads preserve the old installed version. Selecting an installed language works offline. Removing content must not remove separately stored progress. Progress keys use the target language and stable entry ID; changing explanation language does not create a new learner profile.

Initial browser storage uses IndexedDB behind a small storage interface. A native filesystem adapter can later use the same installation contract. The native wrapper will be one Capacitor project with one store identity, replacing the former separate-app distribution plan.

Automatic updates are a later stage: keep explicit user downloads separate from background updates, allow Wi-Fi-only update preferences, and respect platform scheduling limits. Until that stage is implemented, selection installs missing versions from the catalog and reuses already installed matching versions; there is no background updater. Production catalog rollout must preserve supported pair/core versions until update policy is implemented.

## Stages

1. Fresh repository and review/test conventions.
2. Versioned package contract, verification and atomic offline installation.
3. Study/explanation selectors and an offline starter-content screen.
4. Migrate audited full Chinese/German data and existing exercises without losing provenance.
5. One native wrapper, durable package storage, language-scoped progress migration and Wi-Fi update behavior.
