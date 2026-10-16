# Five shared study defaults

Word List, Flashcards, Cloze, Sentence Scramble and Dictation are the first five Study menus for every supported language. Dictation includes Word and Sentence modes and requires completed playback before submission. Existing optional vocabulary and language-specific exercises remain available after them. German and Chinese retain their established sentence views; Japanese, Korean, English, Spanish and French share the new sentence engine and renderer.

Cloze only uses complete translated examples with a valid headword span. Explicit `example.focus.text` may identify an inflected surface form; if `start` is supplied it must select exactly that text. Otherwise the engine locates a literal headword without matching inside unrelated words. Korean noun particles can follow the blank. Inflected forms without trustworthy spans are excluded rather than guessed. Distractors use the same part of speech; literal-lemma questions can use dictionary words without their own example, while inflected distractors need an attested example form. A narrow filter with no eligible alternatives shows no matching questions.

Sentence Scramble uses locale-aware word segmentation and separates punctuation into individual tiles. Correct grading compares the ordered text, so repeated identical words can exchange positions, but a tile cannot be reused twice. The completed question displays the exact original sentence. The English/Korean UI labels remain independent of the chosen explanation language.

Submit, Skip and Next stay at the end of the content. Feedback uses the shared transient check/cross effect and pastel borders. Cloze fills the correct word into the sentence after checking. Translation visibility can be toggled independently for Cloze and Scramble. Review supports both new modes, their original question context, filtered retests, mistake counts and the existing removal preference.

Source text, focus, translations and provenance remain package data. No executable exercise code is downloaded. Examples marked as incomplete or lacking an explanation translation are never converted into questions.
