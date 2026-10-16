import collections, hashlib, json, math, re, sys
from pathlib import Path
from urllib.parse import quote
from wordfreq import get_frequency_dict

cache = Path(sys.argv[1])
facts = json.loads((cache / "multilingual-broad-facts.json").read_text())
reports = {}
stop = set(
    "a an the of to in and or with for that which is it as on by something someone one person thing act state quality trait being such way kind type place use used some make have be this can from into other more than very".split()
)


def tokens(text):
    return set(re.findall("[a-z]+", text.lower())) - stop


def match_fact(row, lang):
    options = [f for f in facts[lang].get(row["word"], []) if f["pos"] == row["pos"]]
    if lang in ["fr", "es"] and row["pos"] == "noun":
        options = [f for f in options if len(f["genders"]) == 1]

    def score(f):
        gloss = " ".join(f["glosses"])
        return (
            5
            if re.search(r"\b" + re.escape(row["english"]) + r"\b", gloss, re.I)
            else 0
        ) + len(tokens(row["en"]) & tokens(gloss))

    options = [f for f in options if lang == "en" or score(f) >= 2]
    options.sort(
        key=lambda f: (
            -score(f),
            bool(
                set(f["tags"])
                & {"rare", "dated", "historical", "dialectal", "regional", "slang"}
            ),
        )
    )
    if not options:
        return None
    if (
        len(options) > 1
        and row["pos"] == "noun"
        and lang in ["fr", "es"]
        and options[0]["genders"] != options[1]["genders"]
        and score(options[0]) == score(options[1])
    ):
        return None
    return {**options[0], "alignmentScore": score(options[0])}


aspirated = set(
    "hache haie haine hall halle hamburger hamac hameau hamster hanche handicap hangar hareng haricot harpe hasard hâte hauteur havre hérisson héros hibou hiérarchie hockey homard honte hors-bord hotte housse hublot huitième hurlement hutte".split()
)
mute = set(
    "habitant habitat habitation habitude harmonica harmonie hebdomadaire hectare hégémonie hélice hélicoptère hémisphère hémorragie héritage héritier héroïne hésitation heure hexagone hippopotame histoire hiver homme honneur hôpital horloge horizon hormone horreur hospitalité hôtel huile humanité humour humiliation hydrogène hygiène hyperbole hypertension hypnose hypothèse hystérie".split()
)
feminine_a = set(
    "agua águila ala alma arma aula área ave aura ánfora ánima arpa asma aspa hacha hada hambre habla haya".split()
)
spellings = {
    "color": "colour",
    "colors": "colours",
    "neighbor": "neighbour",
    "center": "centre",
    "organization": "organisation",
    "behavior": "behaviour",
    "catalog": "catalogue",
    "license": "licence",
    "honor": "honour",
    "flavor": "flavour",
    "humor": "humour",
    "rumor": "rumour",
    "liter": "litre",
    "traveler": "traveller",
}
ko_senses = {
    (r["id"], r["sense"]): r
    for r in json.loads((cache / "nikl-senses.json").read_text())
}
for lang in ["ja", "ko", "en", "es", "fr"]:
    frequency = get_frequency_dict(lang)
    groups = collections.defaultdict(list)
    excluded = collections.Counter()
    for row in json.loads((cache / f"{lang}-broad-candidates.json").read_text()):
        f = None if lang == "ko" else match_fact(row, lang)
        if lang != "ko" and not f:
            excluded["sense or grammar not aligned"] += 1
            continue
        if len(row["en"]) > 4000 or len(row["ko"]) > 4000:
            excluded["oversized definition"] += 1
            continue
        if (
            lang == "fr"
            and row["pos"] == "noun"
            and (
                (row["word"].startswith("h") and row["word"] not in aspirated | mute)
                or (
                    row["word"].startswith("y")
                    and row["word"] not in ["yoga", "yaourt", "yacht", "yéti", "yen"]
                )
            )
        ):
            excluded["aspiration or onset not established"] += 1
            continue
        row["facts"] = f
        row["originalWord"] = row["word"]
        if lang == "en":
            row["word"] = (
                "licence"
                if row["word"] == "license" and row["pos"] == "noun"
                else "license"
                if row["word"] == "license"
                else "practise"
                if row["word"] == "practice" and row["pos"] == "verb"
                else spellings.get(row["word"], row["word"])
            )
        row["frequency"] = frequency.get(
            row["word"], frequency.get(row["originalWord"], 0)
        )
        groups[(row["word"], row["pos"])].append(row)
    selected = []
    for key, rows in groups.items():
        rows.sort(
            key=lambda r: (
                min([int(x["grade"]) for x in r["curriculum"]] or [7]),
                {"초급": 0, "중급": 1, "고급": 2}.get(r["niklGrade"], 3),
                int(r["senseId"]),
                -(r["facts"] or {}).get("alignmentScore", 0),
                int(r["niklId"]),
            )
        )
        selected.append(rows[0])
    selected.sort(
        key=lambda r: (
            (
                min([int(x["grade"]) for x in r["curriculum"]] or [7]),
                {"초급": 0, "중급": 1, "고급": 2}.get(r["niklGrade"], 3),
                -r["frequency"],
                r["word"],
                r["pos"],
            )
            if lang == "ko"
            else (-r["frequency"], r["word"], r["pos"])
        )
    )
    selected = selected[:12000]
    output = []
    for rank, row in enumerate(selected, 1):
        word = row["word"]
        pos = row["pos"]
        f = row["facts"]
        grammar = {}
        article = None
        if lang == "ja":
            level = (
                "N5"
                if rank <= 600
                else "N4"
                if rank <= 1500
                else "N3"
                if rank <= 3000
                else "N2"
                if rank <= 6000
                else "N1"
            )
        elif lang == "ko":
            level = min([x["grade"] for x in row["curriculum"]] or ["6"])
        elif lang == "en":
            level = (
                "1.0"
                if rank <= 500
                else "3.0"
                if rank <= 2000
                else "5.0"
                if rank <= 4500
                else "6.5"
                if rank <= 7500
                else "8.0"
            )
            grammar["studyTier"] = {
                "1.0": "foundation",
                "3.0": "everyday",
                "5.0": "independent",
                "6.5": "advanced",
                "8.0": "precision",
            }[level]
        else:
            level = (
                "A1"
                if rank <= 600
                else "A2"
                if rank <= 1500
                else "B1"
                if rank <= 3000
                else "B2"
                if rank <= 5000
                else "C1"
                if rank <= 7000
                else "C2"
            )
        nikl = {
            "creator": "National Institute of Korean Language",
            "dictionary": "Korean Learners’ Dictionary",
            "entryId": row["niklId"],
            "senseId": row["senseId"],
            "sourceWord": row["korean"],
            "license": "CC-BY-SA-2.0-KR",
            "url": "https://krdict.korean.go.kr/kor/dicSearch/SearchView?ParaWordNo="
            + row["niklId"],
            "snapshot": "2026-06-19",
        }
        references = []
        if lang == "ko":
            for text in ko_senses[(row["niklId"], row["senseId"])]["examples"][:2]:
                references.append(
                    {"text": text, "source": nikl, "translationStatus": "pending"}
                )
        elif f:
            wiki = {
                "creator": "English Wiktionary contributors",
                "license": "CC-BY-SA-4.0",
                "url": "https://en.wiktionary.org/wiki/" + quote(row["originalWord"]),
                "history": "https://en.wiktionary.org/w/index.php?title="
                + quote(row["originalWord"])
                + "&action=history",
            }
            grammar["lexicalSource"] = wiki
            grammar["senseAlignment"] = {
                "method": "shared-definition-token-and-equivalent-match",
                "score": f["alignmentScore"],
                "review": "native-review-pending",
            }
            grammar["usageTags"] = [
                tag
                for tag in f["tags"]
                if tag
                in [
                    "rare",
                    "dated",
                    "historical",
                    "dialectal",
                    "regional",
                    "slang",
                    "formal",
                    "informal",
                ]
            ]
            for example in f["examples"][:2]:
                references.append(
                    {
                        "text": example["text"],
                        "source": wiki,
                        "translationStatus": "pending",
                        **(
                            {"sourceEnglishTranslation": example["translation"]}
                            if example.get("translation")
                            else {}
                        ),
                    }
                )
        if pos == "noun" and lang in ["es", "fr"]:
            gender = f["genders"][0]
            plural = "plural-only" in f["tags"]
            grammar.update(gender=gender, number="plural" if plural else "singular")
            if lang == "fr":
                article = (
                    "les"
                    if plural
                    else "l'"
                    if word[0] in "aàâæeéèêëiîïoôœuùûü" or word in mute
                    else "le"
                    if gender == "masculine"
                    else "la"
                )
            else:
                article = (
                    ("los" if gender == "masculine" else "las")
                    if plural
                    else "el"
                    if gender == "masculine" or word in feminine_a
                    else "la"
                )
        grammar["levelEvidence"] = {
            "basis": "nikl-headword-curriculum-match"
            if lang == "ko" and row["curriculum"]
            else "editorial-extension"
            if lang == "ko"
            else "editorial-frequency-tier",
            "rank": rank,
            "zipf": round(math.log10(row["frequency"] * 1e9), 2)
            if row["frequency"]
            else 0,
            "officialExamVocabulary": False,
        }
        if lang == "ko" and row["curriculum"]:
            grammar["levelEvidence"]["curriculumRows"] = row["curriculum"]
        pronunciation = row["reading"] if lang in ["ja", "ko"] else ""
        entry = {
            "id": lang
            + "-lex-"
            + hashlib.sha256((lang + "\0" + pos + "\0" + word).encode()).hexdigest()[
                :20
            ],
            "word": word,
            "partOfSpeech": pos,
            "level": level,
            "grammar": grammar,
            "provenance": {
                "kind": "licensed-headword"
                if lang == "ko"
                else "licensed-equivalent-adaptation",
                "source": nikl,
                "adaptationLicense": "CC-BY-SA-4.0",
                "review": "automated-sense-alignment; native-speaker-review-pending",
            },
            "exampleStatus": "bilingual-example-pending",
        }
        if pronunciation:
            entry["pronunciation"] = pronunciation
        if lang == "ja":
            entry["aliases"] = [pronunciation]
        if lang == "en" and row["originalWord"] != word:
            entry["aliases"] = [row["originalWord"]]
        if article:
            entry["article"] = article
        if references:
            entry["referenceExamples"] = references
        output.append(
            {
                "core": entry,
                "en": {"id": entry["id"], "meaning": row["en"], "provenance": nikl},
                "ko": {"id": entry["id"], "meaning": row["ko"], "provenance": nikl},
                "classification": {"category": row["category"], "topic": row["topic"]},
            }
        )
    (cache / f"{lang}-broad-prepared.jsonl").write_text(
        "\n".join(json.dumps(row, ensure_ascii=False) for row in output) + "\n"
    )
    reports[lang] = {
        "entries": len(output),
        "headwords": len({r["core"]["word"] for r in output}),
        "pos": dict(collections.Counter(r["core"]["partOfSpeech"] for r in output)),
        "levels": dict(collections.Counter(r["core"]["level"] for r in output)),
        "nativeExamples": sum(
            len(r["core"].get("referenceExamples", [])) for r in output
        ),
        "excluded": dict(excluded),
    }
(cache / "broad-report.json").write_text(
    json.dumps(reports, ensure_ascii=False, indent=2)
)
print(json.dumps(reports, ensure_ascii=False, indent=2))
