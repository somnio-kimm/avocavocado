import gzip, json, sys, time
from pathlib import Path

cache = Path(sys.argv[1])
wanted = {
    l: {
        r["word"]
        for r in json.loads((cache / f"{l}-broad-candidates.json").read_text())
    }
    for l in ["en", "fr", "es", "ja"]
}
facts = {l: {} for l in wanted}
start = time.time()
positions = {
    "noun": "noun",
    "verb": "verb",
    "adj": "adjective",
    "adv": "adverb",
    "pron": "pronoun",
    "num": "numeral",
    "intj": "interjection",
    "det": "determiner",
}
source = Path(sys.argv[2])
with gzip.open(source, "rt") as stream:
    for count, line in enumerate(stream, 1):
        row = json.loads(line)
        lang = row.get("lang_code")
        word = row.get("word")
        pos = positions.get(row.get("pos"))
        if lang not in wanted or word not in wanted[lang] or not pos:
            continue
        base = set(row.get("tags", []))
        for template in row.get("head_templates", []):
            for key, value in template.get("args", {}).items():
                if key in ["g", "g2", "g3", "1"]:
                    if value in ["m", "m-p"]:
                        base.add("masculine")
                    if value in ["f", "f-p"]:
                        base.add("feminine")
                    if value in ["m-p", "f-p", "p"]:
                        base.add("plural-only")
        for sense in row.get("senses", []):
            tags = base | set(sense.get("tags", []))
            if (
                sense.get("form_of")
                or sense.get("alt_of")
                or tags
                & {
                    "form-of",
                    "obsolete",
                    "archaic",
                    "misspelling",
                    "proper-noun",
                    "offensive",
                    "vulgar",
                    "derogatory",
                    "slur",
                }
            ):
                continue
            glosses = sense.get("glosses", [])
            if not glosses:
                continue
            examples = [
                {
                    "text": x["text"],
                    "translation": x.get("translation"),
                    "source": "Wiktionary usage example",
                }
                for x in sense.get("examples", [])
                if x.get("type") == "example"
                and x.get("text")
                and not x.get("ref")
                and len(x["text"]) <= 500
            ]
            entry = {
                "pos": pos,
                "genders": [g for g in ["masculine", "feminine"] if g in tags],
                "tags": sorted(tags),
                "glosses": glosses,
                "examples": examples[:3],
            }
            facts[lang].setdefault(word, []).append(entry)
        if count % 100000 == 0:
            print(count, {k: len(v) for k, v in facts.items()}, flush=True)
(cache / "multilingual-broad-facts.json").write_text(
    json.dumps(facts, ensure_ascii=False)
)
print(
    "done",
    round(time.time() - start),
    {k: len(v) for k, v in facts.items()},
    flush=True,
)
