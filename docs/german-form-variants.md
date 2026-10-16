# German dictionary form variants

Imported dictionary entries can list more than one valid article or inflection. Word Input and Article questions accept `accepted_articles` in addition to the displayed article. Review snapshots retain those alternatives, so a re-test uses the same grading rules.

Case questions expand abbreviated variants such as `des Buches / Buchs` into `des Buches` and `des Buchs`. They display one answer and accept either complete phrase. The selected noun gender determines which case forms are suitable for adjective exercises.

Verb questions display one finite form and accept the documented alternatives, such as `backst` and `bäckst`. Compound tenses repeat the appropriate auxiliary for each participle. When a verb is marked separable, a main-clause prompt accepts `biege ab`, rather than the joined subordinate form `abbiege`. Missing or ambiguous auxiliary paradigms remain excluded from compound-tense generation.

Cloze recognises the same noun and verb alternatives as individual surface forms. It does not require learners to type a dictionary's slash notation. Coverage is in `tests/german-article-variants.test.mjs` and `tests/german-form-alternatives.test.mjs`.
