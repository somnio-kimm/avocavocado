import collections, json, re, sys, unicodedata
from pathlib import Path

cache = Path(sys.argv[1])
sources = json.loads((cache / "nikl-senses.json").read_text())
curriculum = collections.defaultdict(list)
for row in json.loads((cache / "nikl-curriculum.json").read_text()):
    curriculum[row["word"]].append(row)
posmap = {
    "명사": "noun",
    "동사": "verb",
    "형용사": "adjective",
    "부사": "adverb",
    "대명사": "pronoun",
    "수사": "numeral",
    "감탄사": "interjection",
    "관형사": "determiner",
}


def terms(value, language):
    value = re.sub(r"\([^)]*\)", "", value)
    if language == "ja":
        for part in re.split("[。；;]", value):
            match = re.fullmatch(r"([ぁ-ゖァ-ヺー]+)【([^】]+)】", part.strip())
            if match:
                reading, written = match.groups()
                for word in re.split("[・／/]", written):
                    if re.fullmatch(r"[一-龯々〆ヶぁ-ゖァ-ヺー]+", word):
                        yield word, reading
            elif re.fullmatch("[ぁ-ゖァ-ヺー]{2,}", part.strip()):
                yield part.strip(), part.strip()
    else:
        for part in re.split("[;,]", value):
            word = unicodedata.normalize("NFC", part.strip())
            if word.startswith("to "):
                word = word[3:]
            if len(word) < 2 or len(word) > 45 or word[:1].isupper():
                continue
            if re.fullmatch(r"[^\W\d_]+(?:[-’'][^\W\d_]+)*", word):
                yield word, ""


result = collections.defaultdict(list)
for source in sources:
    if source["pos"] not in posmap:
        continue
    pos = posmap[source["pos"]]
    korean = source["word"]
    english = []
    for phrase in re.split("[;,]", source["equivalents"]["en"]["lemma"]):
        phrase = re.sub(r"\([^)]*\)", "", phrase).strip()
        phrase = re.sub(r"^(?:a|an|the|to) ", "", phrase)
        if 1 <= len(phrase.split()) <= 6 and re.fullmatch(
            r"[A-Za-z][A-Za-z ’' -]*", phrase
        ):
            english.append(phrase)
    if not english:
        continue
    for lang in ["ko", "en", "ja", "es", "fr"]:
        candidates = (
            [(korean, source["pronunciations"][0] if source["pronunciations"] else "")]
            if lang == "ko"
            else list(terms(source["equivalents"].get(lang, {}).get("lemma", ""), lang))
        )
        for word, reading in candidates:
            if lang == "ko" and not re.fullmatch("[가-힣]+", word):
                continue
            result[lang].append(
                {
                    "word": word,
                    "reading": reading,
                    "pos": pos,
                    "korean": korean,
                    "english": english[0],
                    "en": source["equivalents"]["en"]["definition"],
                    "ko": source["definition"],
                    "targetDefinition": source["equivalents"]
                    .get(lang, {})
                    .get("definition", source["definition"]),
                    "niklId": source["id"],
                    "senseId": source["sense"],
                    "niklGrade": source["grade"],
                    "category": source["category"],
                    "topic": source["topic"],
                    "annotation": source["annotation"],
                    "curriculum": [
                        item
                        for item in curriculum.get(korean, [])
                        if source["pos"] in (item.get("partOfSpeech") or "")
                    ],
                }
            )
for lang, rows in result.items():
    (cache / f"{lang}-broad-candidates.json").write_text(
        json.dumps(rows, ensure_ascii=False)
    )
    print(lang, len(rows), len({x["word"] for x in rows}))
