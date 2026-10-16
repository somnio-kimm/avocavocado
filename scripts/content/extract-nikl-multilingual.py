"""Prepare sense-aligned NIKL text records; raw XML remains outside the repository.
Usage: python SCRIPT CACHE
"""

import collections, html, json, re, sys, io
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile

cache = Path(sys.argv[1])


def clean(text):
    return re.sub(r"\s+", " ", html.unescape(html.unescape(text or ""))).strip()


def feats(node):
    return {x.get("att"): clean(x.get("val")) for x in node.findall("feat")}


with ZipFile(cache / "nikl-curriculum.xlsx") as z:
    strings = [
        "".join(node.itertext())
        for node in ET.fromstring(z.read("xl/sharedStrings.xml"))
    ]
    curriculum = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).findall(".//{*}row")[
        1:
    ]:
        cells = {
            re.sub(r"\d", "", c.get("r")): strings[int(c.findtext("{*}v"))]
            if c.get("t") == "s"
            else c.findtext("{*}v")
            for c in row
        }
        if not cells.get("D") or not re.fullmatch("[1-6]급", cells.get("C") or ""):
            continue
        word = re.sub(r"\d+$", "", cells["D"]).replace("^", " ").strip()
        curriculum.append(
            {
                "word": word,
                "printedWord": cells["D"],
                "grade": cells["C"][0],
                "partOfSpeech": cells.get("E"),
                "guide": cells.get("F"),
                "row": int(row.get("r")),
            }
        )
(cache / "nikl-curriculum.json").write_text(
    json.dumps(curriculum, ensure_ascii=False, indent=2) + "\n"
)
lang_names = {"영어": "en", "일본어": "ja", "프랑스어": "fr", "스페인어": "es", "중국어": "zh"}
records = []
dates = set()
pos_counts = collections.Counter()
for file in sorted(cache.glob("nikl-*.xml")):
    raw = file.read_bytes()
    safe = re.sub(rb"[\x00-\x08\x0b\x0c\x0e-\x1f]", b"", raw)
    if len(raw) != len(safe):
        print(
            file.name,
            "removed invalid XML control bytes",
            len(raw) - len(safe),
            flush=True,
        )
    for _, node in ET.iterparse(io.BytesIO(safe), events=["end"]):
        if node.tag == "GlobalInformation":
            dates.add(feats(node).get("creationDate"))
        if node.tag != "LexicalEntry":
            continue
        fields = feats(node)
        lemma = feats(node.find("Lemma")).get("writtenForm", "")
        if fields.get("lexicalUnit") not in ["단어", "구"]:
            node.clear()
            continue
        sounds = [
            feats(w).get("pronunciation")
            for w in node.findall("WordForm")
            if feats(w).get("pronunciation")
        ]
        for sense in node.findall("Sense"):
            sf = feats(sense)
            equivalents = {}
            for eq in sense.findall("Equivalent"):
                ef = feats(eq)
                language = lang_names.get(ef.get("language"))
                if language and ef.get("lemma") and ef.get("definition"):
                    equivalents[language] = {
                        "lemma": ef["lemma"],
                        "definition": ef["definition"],
                    }
            if not sf.get("definition") or "en" not in equivalents:
                continue
            examples = [
                feats(e)["example"]
                for e in sense.findall("SenseExample")
                if feats(e).get("type") == "문장" and feats(e).get("example")
            ]
            records.append(
                {
                    "id": node.get("val"),
                    "sense": sense.get("val"),
                    "word": lemma,
                    "pos": fields.get("partOfSpeech"),
                    "grade": fields.get("vocabularyLevel"),
                    "category": fields.get("semanticCategory"),
                    "topic": fields.get("subjectCategiory")
                    or fields.get("subjectCategory"),
                    "pronunciations": sounds,
                    "definition": sf["definition"],
                    "annotation": sf.get("annotation"),
                    "equivalents": equivalents,
                    "examples": examples,
                }
            )
            pos_counts[fields.get("partOfSpeech")] += 1
        node.clear()
(cache / "nikl-senses.json").write_text(json.dumps(records, ensure_ascii=False))
print(
    json.dumps(
        {
            "senses": len(records),
            "dates": list(dates),
            "parts": pos_counts,
            "curriculumRows": len(curriculum),
            "curriculumGrades": collections.Counter(r["grade"] for r in curriculum),
        },
        ensure_ascii=False,
        indent=2,
    )
)
