"""Select German learner headwords. Usage: python SCRIPT CACHE ARCHIVE (from repo root)."""

import json, re, collections, sys
from pathlib import Path

cache = Path(sys.argv[1])
cache.mkdir(parents=True, exist_ok=True)
root = Path(sys.argv[2]) / "apps/german/web/data"
goethe = json.loads(
    Path("language-packages/sources/goethe-headword-evidence.json").read_text()
)["headwords"]
official = set().union(*(set(x) for x in goethe.values()))
old = []
for p in sorted(root.glob("cefr-*/*.json")):
    old += json.loads(p.read_text())
allrows = []
for p in sorted((root / "reference/entries").glob("*.json")):
    for row in json.loads(p.read_text()).values():
        if row.get("meaning_en") and (
            row["lemma"] in official
            or row.get("meaning_ko")
            or row.get("source_meanings_ko")
        ):
            allrows.append(row)


def clean(s):
    return re.sub(
        r"\s+", " ", re.sub(r"\s*\([^)]*(?:부록|동사 변화표|►)[^)]*\)", "", s)
    ).strip(" .;")


def key(s):
    return re.sub(
        r"^(?:to|a|an|the)\s+", "", re.sub(r"\([^)]*\)", "", clean(s)).lower()
    ).strip(" .;")


lookup = collections.defaultdict(dict)
for row in old + allrows:
    if row.get("source_pos") == "name":
        continue
    if row.get("meaning_ko"):
        for english in row.get("meaning_en", []):
            for term in re.split("[;,]", english):
                k = (row["pos"], key(term))
                ko = tuple(clean(s) for s in row["meaning_ko"])
                lookup[k][ko] = row["id"]


def ko_for(row):
    if row.get("meaning_ko"):
        return [clean(s) for s in row["meaning_ko"]], row.get("ko_status", "editorial")
    sources = [s for s in row.get("source_meanings_ko", []) if s.get("meaning_ko")]
    matches = [
        s
        for s in sources
        if set(key(t) for t in s.get("meaning_en", []))
        & set(key(t) for t in row["meaning_en"])
    ]
    if matches:
        return list(
            dict.fromkeys(clean(t) for s in matches for t in s["meaning_ko"])
        ), "source-gloss-aligned"
    if sources:
        return list(
            dict.fromkeys(clean(t) for s in sources for t in s["meaning_ko"])
        ), "source-headword-review-pending"
    matched = []
    for english in row["meaning_en"]:
        for gloss in [english, *re.split("[;,]", english)]:
            vals = lookup.get((row["pos"], key(gloss)), {})
            if len(vals) == 1:
                matched.extend(next(iter(vals)))
    if matched:
        return list(dict.fromkeys(matched)), "cross-gloss-draft"
    return [], "missing"


byword = collections.defaultdict(list)
for row in allrows:
    if row.get("source_pos") in ["suffix", "prefix", "abbrev"]:
        continue
    if row.get("source_pos") == "name" and row["lemma"] not in official:
        continue
    if (
        len(row["lemma"]) < 2
        or row["lemma"].startswith("-")
        or row["lemma"].endswith("-")
    ):
        continue
    if (
        set(row.get("register_tags", [])) & {"obsolete", "archaic", "dated", "outdated"}
        and row["lemma"] not in official
    ):
        continue
    ko, status = ko_for(row)
    row["_ko"] = ko
    row["_ko_status"] = status
    if row["lemma"] in official or ko:
        byword[row["lemma"]].append(row)
old.append(
    {
        "id": "de-functional-km-h-editorial-main",
        "lemma": "km/h",
        "pos": "functional",
        "subtype": "abbreviation",
        "meaning_en": ["kilometres per hour"],
        "meaning_ko": ["시속 킬로미터"],
        "source": "app-editorial",
        "provenance": {
            "kind": "app-editorial",
            "creator": "Learn Language contributors",
            "license": "CC-BY-SA-4.0",
        },
        "examples": [
            {
                "de": "Hier darf man höchstens 30 km/h fahren.",
                "en": "The speed limit here is 30 kilometres per hour.",
                "ko": "여기서는 시속 삼십 킬로미터 이하로 운전해야 해요.",
                "source": {
                    "kind": "app-generated",
                    "generation": "original-authored-context-v1",
                    "license": "CC-BY-SA-4.0",
                    "review": "editorial-review-pending",
                },
            }
        ],
    }
)
selected = old.copy()
seen = {r["lemma"] for r in old}
missing = []
for lemma, rows in sorted(byword.items()):
    if lemma in seen:
        continue
    rows.sort(
        key=lambda r: (
            r.get("source_pos") == "name",
            0
            if (lemma[:1].isupper() and r["pos"] == "noun")
            or (lemma[:1].islower() and lemma.endswith("en") and r["pos"] == "verb")
            else 1,
            tuple(int(n) for n in re.findall(r"\d+", r.get("sense_id", "0"))),
            not bool(r["_ko"]),
            r["_ko_status"] not in ["sourced", "source-gloss-aligned"],
            r["id"],
        )
    )
    row = rows[0]
    if not row["_ko"]:
        missing.append(
            {
                "lemma": lemma,
                "pos": row["pos"],
                "en": row["meaning_en"],
                "id": row["id"],
            }
        )
    selected.append(row)
(cache / "selected-reference.json").write_text(json.dumps(selected, ensure_ascii=False))
(cache / "missing-korean.json").write_text(
    json.dumps(missing, ensure_ascii=False, indent=2)
)
print(
    "selected",
    len(selected),
    "distinct",
    len({r["lemma"] for r in selected}),
    "without Korean",
    len(missing),
)
print("new POS", collections.Counter(r["pos"] for r in selected[len(old) :]))
print("missing", missing[:25])
print("Goethe omitted", sorted(official - {r["lemma"] for r in selected})[:100])
