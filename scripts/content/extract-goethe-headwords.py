"""Extract factual headword membership from official adult Goethe word lists.

Usage: python extract-goethe-headwords.py PDF_CACHE ARCHIVE
PDF_CACHE contains A1/A2/B1.pdf and matching pdftotext -bbox-layout HTML.
No example sentences or publication pages are redistributed by this script.
"""

import hashlib, json, re, sys, xml.etree.ElementTree as ET
from pathlib import Path

cache, archive = Path(sys.argv[1]), Path(sys.argv[2]) / "apps/german/web/data"
refs = json.loads((archive / "reference/catalog.json").read_text())
study = []
for path in archive.glob("cefr-*/*.json"):
    study.extend(json.loads(path.read_text()))
known = {row["lemma"] for row in refs + study}
casefold = {s.casefold(): s for s in sorted(known, reverse=True)}
forms = {}
for path in (archive / "reference/entries").glob("*.json"):
    for row in json.loads(path.read_text()).values():
        if row["pos"] == "verb":
            forms.setdefault(row["lemma"], set()).update(row.get("related_forms", []))
settings = {
    "A1": (8, 27, [(140, 158, 235)]),
    "A2": (7, 31, [(34, 42, 106), (303, 311, 375)]),
    "B1": (15, 102, [(34, 65, 131), (313, 335, 411)]),
}
stems = {
    "all-": ["alle", "alles"],
    "ander-": ["andere"],
    "dies-": ["dieser", "diese", "dieses"],
    "jed-": ["jeder", "jede", "jedes"],
    "welch-": ["welcher", "welche", "welches"],
    "letzt-": ["letzte"],
    "nächst-": ["nächste"],
    "best-": ["beste"],
}
result = {}
rejected = {}
for level, (start, end, columns) in settings.items():
    pages = ET.parse(cache / f"{level}.html").findall(".//{*}page")
    rows = []
    for index in range(start, end):
        page = pages[index]
        for col, (lo, hi, right) in enumerate(columns):
            lines = [
                line
                for line in page.findall(".//{*}line")
                if lo <= float(line.attrib["xMin"]) <= hi
                and 50 < float(line.attrib["yMin"])
                and float(line.attrib["yMax"]) < float(page.attrib["height"]) - 45
            ]
            last_y = -999
            for line in sorted(lines, key=lambda item: float(item.attrib["yMin"])):
                text = (
                    " ".join(
                        w.text or ""
                        for w in line
                        if float(w.attrib["xMax"]) <= right + 0.5
                    )
                    .replace("\u00ad", "-")
                    .replace("\x02", "")
                    .strip()
                )
                y = float(line.attrib["yMin"])
                if (
                    not text
                    or len(text) == 1
                    or text.startswith(("Alphabetischer", "ALPHABETISCHER"))
                ):
                    continue
                last = rows[-1] if rows else None
                if (
                    last
                    and last["page"] == index + 1
                    and last.get("column") == col
                    and re.search(r"\w-$", last["text"])
                    and last["text"].split()[-1] not in stems
                    and last["text"].split()[-1]
                    not in ["dein-", "ein-", "Feier-", "lieb-", "unser-", "Lieblings-"]
                    and y - last_y < 14
                    and text[0].islower()
                    and not re.match(r"(der|die|das)\b", text)
                ):
                    last["text"] = last["text"][:-1] + text
                else:
                    rows.append(
                        {
                            "page": index + 1,
                            "column": col,
                            "y": y,
                            "text": text,
                            "section": "alphabetical",
                        }
                    )
                last_y = y
    for index in {"A1": range(5, 8), "A2": range(4, 7), "B1": range(4, 15)}[level]:
        page = pages[index]
        for line in page.findall(".//{*}line"):
            if (
                float(line.attrib["yMin"]) < 65
                or float(line.attrib["yMax"]) > float(page.attrib["height"]) - 45
            ):
                continue
            text = " ".join(w.text or "" for w in line).strip()
            if re.match(r"^\d+\.\d*\s", text) or text.isupper() or text in ["nen"]:
                continue
            if re.match(r"^\d", text):
                text = re.sub(r"^[\d.,:%= /–-]+", "", text)
            if text:
                rows.append({"page": index + 1, "text": text, "section": "word-groups"})
    items = {}
    skipped = []
    contexts = {}
    for row in rows:
        raw = row["text"]
        context = contexts.get((row["page"], row.get("column")))
        plain = re.sub(r"\([^)]*\)", "", raw.split("→")[0]).strip()
        plain = re.sub(r"^(?:der/die|das/der|der|die|das)\s+", "", plain)
        plain = re.sub(r"^(?:sich|jdn\.|jmd\.)\s+", "", plain)
        plain = plain.split(",")[0].strip()
        plain = re.sub(r"\s+", " ", plain)
        if row["section"] == "alphabetical":
            if (
                level != "A1"
                and context
                and row["y"] - context[1] < 13.5
                and plain != context[0]
                and plain in forms.get(context[0], set())
            ):
                skipped.append(
                    {"page": row["page"], "form": plain, "parent": context[0]}
                )
                contexts[(row["page"], row.get("column"))] = (context[0], row["y"])
                continue
            if re.match(r"^(?:hat|ist|war|wird|wurde|wäre|hätte)(?:\s|$)", plain):
                if context:
                    contexts[(row["page"], row.get("column"))] = (context[0], row["y"])
                continue
            if plain in forms:
                contexts[(row["page"], row.get("column"))] = (plain, row["y"])
            elif context and row["y"] - context[1] > 13.5:
                contexts.pop((row["page"], row.get("column")), None)
        candidates = [plain]
        if "/" in plain:
            candidates.extend(plain.split("/"))
        if plain.endswith(" sein"):
            candidates.append(plain[:-5])
        candidates.extend(stems.get(plain, []))
        if " " in plain and plain not in known:
            candidates.append(plain.replace(" ", ""))
        if "(Kredit)-Karte" in raw:
            candidates.extend(["Karte", "Kreditkarte"])
        for candidate in candidates:
            lemma = (
                candidate
                if candidate in known
                else casefold.get(candidate.casefold())
                if candidate[:1].isupper()
                else None
            )
            if (
                not lemma
                or len(lemma) < 2
                or lemma.startswith("-")
                or lemma.endswith("-")
            ):
                continue
            evidence = {
                "page": row["page"],
                "section": row["section"],
                "printedHeadword": plain,
            }
            if evidence not in items.setdefault(lemma, []):
                items[lemma].append(evidence)
    result[level] = items
    rejected[level] = skipped
urls = {
    "A1": "https://www.goethe.de/pro/relaunch/prf/de/A1_SD1_Wortliste_02.pdf",
    "A2": "https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_A2_Wortliste.pdf",
    "B1": "https://www.goethe.de/pro/relaunch/prf/de/Goethe-Zertifikat_B1_Wortliste.pdf",
}
manifest = {
    "sources": {
        level: {
            "url": url,
            "sha256": hashlib.sha256((cache / f"{level}.pdf").read_bytes()).hexdigest(),
            "retrieved": "2026-10-14",
        }
        for level, url in urls.items()
    },
    "headwords": result,
    "excludedInflectedContinuations": rejected,
    "method": "Column-bounded lexical matches in alphabetical headwords and thematic word groups. Inflected continuation lines, affixes and single-letter headings are excluded. Overlaps use the earliest level. Productive word families and unlisted inflected forms are not claimed as an exhaustive lexical inventory. No Goethe example sentences or PDF pages are redistributed.",
}
Path("language-packages/sources/goethe-headword-evidence.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
)
for level in result:
    print(level, len(result[level]), "inflections excluded", len(rejected[level]))
