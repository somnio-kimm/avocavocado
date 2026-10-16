# Explanation-language matrix

The seven study languages (German, English, Spanish, French, Japanese, Korean and Chinese) require 43 explanation pairs: each has the other six explanation languages, and English additionally has English explanations. Display Language remains a separate UI preference.

The shared pair policy controls new downloads and study selection. Old same-language packages such as Korean→Korean remain readable at the storage/schema level so they can be removed safely, but are not offered for download or selected for study. Settings marks an installed old pair as Legacy Package — Remove Only. No automatic data deletion occurs.

Pair eligibility does not imply that its content is ready. Only complete, hash-validated explanation packages appear as downloads. The content build must report missing meanings and example translations per pair and must not substitute English or Korean text while labelling it another language. Existing immutable package files remain available for provenance and migration. `explanationMatrix()` is the authoritative requested matrix; the catalogue lists actual available versions.

German/Chinese adapters and shared quizzes use `studyMeaning` / `studyTranslation` from the selected explanation package. Display text may still be English or Korean without changing those meanings. Listening questions accept valid explanation locale codes rather than a hard-coded two-language list.
