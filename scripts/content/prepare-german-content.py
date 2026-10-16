"""Prepare licensed examples and original gap examples. Usage: python SCRIPT CACHE."""

import json, re, hashlib, collections, sys
from pathlib import Path
from wordfreq import zipf_frequency

source = Path(sys.argv[1])
rows = json.loads((source / "selected-reference.json").read_text())
evidence = json.loads(
    Path("language-packages/sources/goethe-headword-evidence.json").read_text()
)
opens = json.loads(
    Path("language-packages/sources/german-licensed-examples.json").read_text()
)
tags = json.loads(
    Path("language-packages/sources/german-example-tags.json").read_text()
)


def tsv(path):
    return dict(
        line.split("\t", 1)
        for line in Path(path).read_text().splitlines()
        if "\t" in line
    )


ko_edits = tsv("language-packages/sources/german-korean-editorial.tsv")
verb_examples = tsv("language-packages/sources/german-original-verb-examples.tsv")
senses = json.loads(
    Path("language-packages/sources/german-learner-senses.json").read_text()
)
article_preferences = json.loads(
    Path("language-packages/sources/german-article-preferences.json").read_text()
)
manual = (
    tsv("language-packages/sources/german-original-examples.tsv")
    if Path("language-packages/sources/german-original-examples.tsv").exists()
    else {}
)
clean = lambda x: re.sub(
    r"\s+", " ", re.sub(r"\s*\([^)]*(?:부록|동사 변화표|►)[^)]*\)", "", str(x))
).strip(" .;")


def term(row, lang):
    text = (
        re.sub(r"\([^)]*\)", "", row["meaning_" + lang][0])
        .split(";")[0]
        .split(",")[0]
        .strip(" .;")
    )
    if lang == "en":
        text = re.sub(r"^(a|an|the)\s+", "", text)
    return text


def noun_phrase(row, case):
    value = (row.get("declension") or {}).get(case, [None, None])
    idx = 1 if row.get("number_restriction") == "plural" else 0
    phrase = value[idx] if len(value) > idx else None
    if phrase and re.match(r"^(der|die|das|den|dem|des)\s", phrase):
        return phrase.split(" / ")[0].split("/")[0].strip()
    article = row.get("article")
    word = row["lemma"]
    if article and " " in word and word.split()[0][:1].islower():
        bits = word.split()
        bits[0] = re.sub(r"(?:es|er|en|em|e)$", "", bits[0]) + (
            "en" if case == "dat" or (case == "acc" and article == "der") else "e"
        )
        word = " ".join(bits)
    if article:
        if case == "acc":
            article = {"der": "den", "die": "die", "das": "das"}.get(article, article)
        if case == "dat":
            article = {"der": "dem", "die": "der", "das": "dem"}.get(article, article)
        return article + " " + word
    return word


def noun_example(row):
    acc, dat = noun_phrase(row, "acc"), noun_phrase(row, "dat")
    en = "the " + term(row, "en")
    ko = term(row, "ko")
    slot = int(hashlib.sha256(row["id"].encode()).hexdigest()[:8], 16) % 8
    templates = [
        (
            f"Ich habe eine Frage zu {dat}.",
            f"I have a question about {en}.",
            f"{ko}에 대해 질문이 있어요.",
        ),
        (
            f"Heute sprechen wir über {acc}.",
            f"Today we are talking about {en}.",
            f"오늘은 {ko}에 대해 이야기해요.",
        ),
        (
            f"Wir möchten mehr über {acc} erfahren.",
            f"We would like to learn more about {en}.",
            f"{ko}에 대해 더 알고 싶어요.",
        ),
        (
            f"Sie hat mir von {dat} erzählt.",
            f"She told me about {en}.",
            f"그녀는 저에게 {ko}에 대해 이야기했어요.",
        ),
        (
            f"Ich lese gerade etwas über {acc}.",
            f"I am reading something about {en}.",
            f"저는 지금 {ko}에 관한 글을 읽고 있어요.",
        ),
        (
            f"In diesem Text geht es um {acc}.",
            f"This text is about {en}.",
            f"이 글은 {ko}에 관한 내용이에요.",
        ),
        (
            f"Er erklärt mir etwas über {acc}.",
            f"He is explaining something about {en} to me.",
            f"그는 저에게 {ko}에 대해 설명하고 있어요.",
        ),
        (
            f"Wir suchen Informationen über {acc}.",
            f"We are looking for information about {en}.",
            f"우리는 {ko}에 관한 정보를 찾고 있어요.",
        ),
    ]
    if (
        not all(
            (row.get("declension") or {}).get(case, [None])[0]
            for case in ["acc", "dat"]
        )
        or row.get("number_restriction") == "plural"
    ):
        # Unknown case paradigms must not produce guessed weak-noun or plural endings.
        nom = noun_phrase(row, "nom")
        de = f"Unser Thema lautet: {nom}."
        en = f"Our topic is {en}."
        ko = f"우리의 주제는 {ko}입니다."
    else:
        de, en, ko = templates[slot]
    return {
        "de": de,
        "en": en,
        "ko": ko,
        "source": {
            "kind": "app-generated",
            "license": "CC-BY-SA-4.0",
            "generation": "original-neutral-context-frame-v1",
            "review": "editorial-review-pending",
        },
    }


def adjective_example(row):
    lemma = row["lemma"]
    gloss = " ".join(row["meaning_en"]).lower()
    wordtags = set(tags.get(row["id"], []))
    if (
        re.fullmatch(
            r"(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|thirtieth|fortieth|fiftieth|sixtieth|seventieth|eightieth|ninetieth|hundredth|two-hundredth)",
            gloss,
        )
        or lemma == "siebente"
    ):
        text = (
            f"Das ist die {lemma} Frage."
            if lemma.endswith("e")
            else f"Das ist ein {lemma} Liter."
        )
    elif re.search(
        r"\b(?:angry|happy|tired|patient|intelligent|sick|pregnant|honest|friendly|loyal|nervous|sad|lonely|shy|generous|deaf|blind|hungry|thirsty|proud|polite|brave|absent|present|alive|dead|adult|grown|deceased|awake|married|divorced|unemployed|male|female|hard-working|enthusiastic|exhausted|amazed|ready|informed|talkative|poor|penniless|timid|paranoid|rebellious|lazy|cheerful|obedient|cisgender)\b",
        gloss,
    ):
        text = f"Sie ist {lemma}."
    elif re.search(r"\b(?:annual|weekly|monthly|daily|hourly|frequent)\b", gloss):
        text = f"Das Treffen findet {lemma} statt."
    elif re.search(
        r"\b(?:red|blue|green|yellow|black|white|smooth|rough|soft|hard|liquid|solid|wet|dry|elastic|transparent|metallic|sticky|waterproof|striped)\b",
        gloss,
    ):
        text = f"Das Material ist {lemma}."
    elif "attributive" in wordtags or lemma in ["einstig", "hiesig", "dortig"]:
        stem = (
            "hoh"
            if lemma == "hoch"
            else "teur"
            if lemma == "teuer"
            else lemma[:-2] + "l"
            if lemma.endswith("el")
            else lemma[:-1]
            if lemma.endswith("e")
            else lemma
        )
        text = f"Wir besprechen die {stem}e Aufgabe."
    else:
        text = f"Das ist wirklich {lemma}."
    return {
        "de": text,
        "source": {
            "kind": "app-generated",
            "license": "CC-BY-SA-4.0",
            "generation": "original-adjective-context-v1",
            "review": "editorial-review-pending",
        },
    }


correction_path = Path("language-packages/sources/german-example-corrections.json")
corrections = (
    json.loads(correction_path.read_text()) if correction_path.exists() else {}
)
prepared = []
pending = []
deferred = []
for original in rows:
    row = dict(original)
    lemma = row["lemma"]
    if (
        row.get("_ko_status") in ["cross-gloss-draft", "source-headword-review-pending"]
        and not any(
            lemma in evidence["headwords"][level] for level in ["A1", "A2", "B1"]
        )
        and lemma not in senses
    ):
        continue
    original_study = bool(row.get("examples")) and not row.get("reference_only", False)
    if not original_study:
        ko = row.get("_ko") or row.get("meaning_ko") or []
        if lemma in ko_edits:
            ko = [clean(s) for s in ko_edits[lemma].split(";")]
            row["_ko_status"] = "ai-edited-draft"
        row["meaning_ko"] = [x for x in ko if x.strip()]
        if lemma in senses:
            patch = senses[lemma]
            row["meaning_en"] = patch["en"]
            row["meaning_ko"] = patch["ko"]
            row["_ko_status"] = "ai-edited-draft"
            for key in [
                "display_lemma",
                "pos",
                "subtype",
                "article",
                "forms",
                "auxiliary",
                "prefix_type",
                "separable_prefix",
            ]:
                if key in patch:
                    row[key] = patch[key]
            if patch.get("article"):
                row["genders"] = [
                    {"der": "masculine", "die": "feminine", "das": "neuter"}[
                        patch["article"]
                    ]
                ]
        if not row["meaning_ko"]:
            pending.append((lemma, "Korean meaning"))
            continue
        if row["pos"] == "verb":
            first = (
                ((row.get("forms") or {}).get("praesens") or {})
                .get("ich", "")
                .split(" / ")
            )
            parts = first[0].split() if first else []
            if (
                len(parts) == 2
                and lemma.startswith(parts[1])
                and parts[1] + parts[0] in first
            ):
                row["prefix_type"] = "separable"
                row["separable_prefix"] = parts[1]
        if row["pos"] == "noun" and not row.get("proper_noun"):
            articles = [
                {"masculine": "der", "feminine": "die", "neuter": "das"}[gender]
                for gender in row.get("genders", [])
                if gender in ["masculine", "feminine", "neuter"]
            ]
            if row.get("number_restriction") == "plural":
                articles = ["die"]
            preferred = (
                article_preferences.get(lemma)
                or row.get("article")
                or (articles[0] if articles else None)
            )
            if preferred:
                row["article"] = preferred
                row["gender"] = {
                    "der": "masculine",
                    "die": "feminine",
                    "das": "neuter",
                }[preferred]
                row["accepted_articles"] = list(dict.fromkeys([preferred, *articles]))
        row["meaning_en"] = [clean(x) for x in row["meaning_en"]]
        row["meaning_ko"] = [clean(x) for x in row["meaning_ko"]]
        if lemma in manual:
            parts = manual[lemma].split("\t")
            ex = {
                "de": parts[0],
                "en": parts[1],
                "ko": parts[2],
                "source": {
                    "kind": "app-generated",
                    "license": "CC-BY-SA-4.0",
                    "generation": "original-authored-context-v1",
                    "review": "editorial-review-pending",
                },
            }
        elif row["pos"] == "noun":
            ex = noun_example(row)
        elif (
            row.get("subtype") == "expression"
            and re.search(r"\b[A-ZÄÖÜ]", lemma)
            and not re.search(r"\b(?:fahren|essen|kommen|sein|haben|tun)\b", lemma)
        ):
            en = term(row, "en")
            ko = term(row, "ko")
            ex = {
                "de": f"Unser Thema lautet: {lemma}.",
                "en": f"Our topic is {en}.",
                "ko": f"우리의 주제는 {ko}입니다.",
                "source": {
                    "kind": "app-generated",
                    "license": "CC-BY-SA-4.0",
                    "generation": "original-topic-context-v1",
                    "review": "editorial-review-pending",
                },
            }
        elif row.get("subtype") == "numeral":
            ex = {
                "de": f"Die Antwort lautet {lemma}.",
                "en": f"The answer is {term(row, 'en')}.",
                "ko": f"답은 {term(row, 'ko')}입니다.",
                "source": {
                    "kind": "app-generated",
                    "license": "CC-BY-SA-4.0",
                    "generation": "original-numeral-context-v1",
                    "review": "editorial-review-pending",
                },
            }
        elif row["id"] in opens and lemma not in senses:
            example = opens[row["id"]]
            source_locale = example["source"]
            ex = {
                "de": example["de"],
                "source": {
                    "kind": "wiktionary-example",
                    "license": "CC-BY-SA-4.0",
                    "edition": source_locale,
                    "url": example["url"],
                    "history_url": example["history_url"],
                    "review": "editorial-review-pending",
                },
            }
            if example.get("en"):
                ex["en"] = example["en"]
        elif lemma in verb_examples:
            ex = {
                "de": verb_examples[lemma],
                "source": {
                    "kind": "app-generated",
                    "license": "CC-BY-SA-4.0",
                    "generation": "original-authored-context-v1",
                    "review": "editorial-review-pending",
                },
            }
        elif row["pos"] == "adjective":
            ex = adjective_example(row)
        elif row.get("subtype") in ["expression"]:
            en = term(row, "en")
            ko = term(row, "ko")
            ex = {
                "de": f"Unser Thema lautet: {lemma}.",
                "en": f"Our topic is {en}.",
                "ko": f"우리의 주제는 {ko}입니다.",
                "source": {
                    "kind": "app-generated",
                    "license": "CC-BY-SA-4.0",
                    "generation": "original-topic-context-v1",
                    "review": "editorial-review-pending",
                },
            }
        else:
            pending.append((lemma, row["pos"] + ":" + str(row.get("subtype"))))
            continue
        # If an edited sentence exactly reuses a licensed example, retain its credit.
        candidate = opens.get(row["id"])
        if (
            candidate
            and re.sub(r"\s+", " ", candidate["de"]).strip() == ex["de"].strip()
        ):
            ex["source"] = {
                "kind": "wiktionary-example",
                "license": "CC-BY-SA-4.0",
                "edition": candidate["source"],
                "url": candidate["url"],
                "history_url": candidate["history_url"],
                "review": "editorial-review-pending",
            }
        correction = corrections.get(row["id"] + ":0")
        if correction and correction["text"] == ex["de"]:
            ex.update(
                en=correction["en"],
                ko=correction["ko"],
                translationProvenance=correction["provenance"],
            )
        row["examples"] = [ex]
        row["reference_only"] = False
        if row.get("_ko_status") in [
            "cross-gloss-draft",
            "source-headword-review-pending",
        ]:
            row["_ko_status"] = "ai-sense-alignment-checked; native-review-pending"
    matches = [
        level for level in ["A1", "A2", "B1"] if lemma in evidence["headwords"][level]
    ]
    frequency = zipf_frequency(lemma, "de")
    level = (
        matches[0]
        if matches
        else "B2"
        if frequency >= 4
        else "C1"
        if frequency >= 3
        else "C2"
    )
    row["previous_cefr"] = row.get("cefr")
    row["cefr"] = level
    row["cefr_basis"] = (
        "goethe-headword-match" if matches else "editorial-frequency-tier"
    )
    row["level_evidence"] = {
        "matchedLists": matches,
        "sourcePages": {key: evidence["headwords"][key][lemma] for key in matches},
        "frequency": frequency,
        "frequencySource": "wordfreq 3.1.1 (usage through 2021)",
        "editorialRule": None
        if matches
        else "B2: Zipf >= 4; C1: >= 3; C2: < 3. Frequency tiers are editorial, not official CEFR assessments.",
    }
    if (
        row["id"].startswith("de-ref-")
        and not matches
        and not all(ex.get("en") and ex.get("ko") for ex in row["examples"])
    ):
        deferred.append(
            {
                "id": row["id"],
                "lemma": lemma,
                "reason": "Advanced non-noun example needs an edited bilingual translation.",
            }
        )
        continue
    prepared.append(row)
(source / "prepared-rows.json").write_text(json.dumps(prepared, ensure_ascii=False))
(source / "pending-authoring.json").write_text(
    json.dumps(pending, ensure_ascii=False, indent=2)
)
(source / "deferred-examples.json").write_text(
    json.dumps(deferred, ensure_ascii=False, indent=2) + "\n"
)
print(
    "prepared",
    len(prepared),
    "pending",
    len(pending),
    "levels",
    collections.Counter(row["cefr"] for row in prepared),
)
print("pending:", pending)
