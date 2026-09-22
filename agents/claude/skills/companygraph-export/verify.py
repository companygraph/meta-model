#!/usr/bin/env python3
"""Assert that both export artifacts are the model, whole.

Coverage is the whole point of the second artifact, and it is checkable only because each
inlined entity keeps its `<!-- entity: <path> -->` marker: Gemini Notebook strips the comment, and
this script reads the file from disk where it survives. The zip is checkable the same way,
read straight from the archive with `zipfile`: two of its files, `model/identity.md` and
`model/vision.md`, are singular entities copied whole and carry no marker, so those are
claimed by name instead — `model/<basename>` for a `model/*.md` member the marker scan found
nothing in. A marker count cannot tell that file from one merely missing a marker, or tell a
literal `<!-- entity: ... -->` used as prose in a reading guide from a real one; comparing
paths can, because a path either belongs to the model or it does not.
"""
import json, re, sys, pathlib, zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent.parent
INSTANCE = ROOT.name
BUNDLE = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / f"dist/{INSTANCE}-gemini-notebook"
ZIP = ROOT / f"dist/{INSTANCE}-skill.zip"
SOURCE_CAP, WORD_CAP = 50, 500_000          # Gemini Notebook, free tier, per notebook and per source

# Two sources carry documents about the model rather than entities of it: the reading guide the
# bundle ships as `AGENTS.md` and the repository's own `README.md`. They count against the source
# cap like any other file and hold no marker, so they are not read for coverage — a stray
# `<!-- entity: ... -->` in either would otherwise be reported as an entity the model does not
# have.
DOCUMENTS = {"AGENTS.md", "README.md"}

def model_entities():
    """Every file the export walks: model entities, plus the vendored meta it carries.

    A README is excluded on both halves of the walk. `meta/` carries none today, so leaving it
    in matched nothing and the asymmetry was invisible — until a core release adds one, when
    the bundle would have to claim it to pass.

    Keyed with `/` as the bundle's entity markers are, which on Windows `str` of a path is not.
    """
    out = {p.relative_to(ROOT).as_posix() for p in (ROOT / "model").rglob("*.md") if p.name != "README.md"}
    units = json.loads((ROOT / ".companygraph/manifest.json").read_text(encoding="utf-8")).get("units", "meta")
    out |= {p.relative_to(ROOT).as_posix() for p in (ROOT / units).rglob("*.md") if p.name != "README.md"}
    return out

def bundle_entities(files):
    seen = {}
    for f in files:
        if f.name in DOCUMENTS:
            continue
        for m in re.finditer(r"<!--\s*entity:\s*(\S+?)\s*-->", f.read_text(encoding="utf-8")):
            seen.setdefault(m.group(1), []).append(f.name)
    return seen

def zip_entities(zip_path):
    """Every entity the zip carries, read straight from the archive.

    `<instance>/SKILL.md` is the bundle's own front matter, not an entity, and is skipped. Every
    other `.md` member is scanned for markers the same way a bundle source is; a member that
    holds none is an entity only when it sits directly under `<instance>/model/` — the singular
    entities the export copies whole — and its path is `model/<its basename>`, the name
    it would have carried had it kept its marker.
    """
    seen = {}
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            if info.is_dir() or not info.filename.endswith(".md"):
                continue
            parts = info.filename.split("/")
            if parts == [INSTANCE, "SKILL.md"]:
                continue
            text = zf.read(info.filename).decode("utf-8")
            matches = [m.group(1) for m in re.finditer(r"<!--\s*entity:\s*(\S+?)\s*-->", text)]
            if matches:
                for p in matches:
                    seen.setdefault(p, []).append(info.filename)
            elif len(parts) == 3 and parts[0] == INSTANCE and parts[1] == "model":
                seen.setdefault(f"model/{parts[2]}", []).append(info.filename)
    return seen

def report(seen, want, noun):
    """Print a FAIL line per path missing, extra or doubly claimed, against one artifact's
    entities. `noun` names the artifact in the message, "bundle" or "zip". Returns whether
    anything was wrong."""
    missing = sorted(want - set(seen))
    extra = sorted(set(seen) - want)
    twice = sorted(p for p, w in seen.items() if len(w) > 1)
    for p in missing: print(f"FAIL  not in the {noun}: {p}")
    for p in extra:   print(f"FAIL  in the {noun}, not in the model: {p}")
    for p in twice:   print(f"FAIL  claimed by {len(seen[p])} {noun} members: {p} — {', '.join(seen[p])}")
    return bool(missing or extra or twice)

def main():
    if not BUNDLE.is_dir():
        print(f"FAIL  no bundle at {BUNDLE}"); return 1
    files = sorted(BUNDLE.glob("*.md"))
    if not files:
        print(f"FAIL  {BUNDLE} holds no .md source"); return 1

    want, seen = model_entities(), bundle_entities(files)
    bundle_bad = report(seen, want, "bundle")
    bad = bundle_bad

    if len(files) > SOURCE_CAP:
        print(f"FAIL  {len(files)} sources, cap is {SOURCE_CAP}"); bad = True
    for f in files:
        n = len(f.read_text(encoding="utf-8").split())
        if n > WORD_CAP:
            print(f"FAIL  {f.name} is {n:,} words, cap is {WORD_CAP:,}"); bad = True

    # The zip is optional here: a bundle can be built and checked on its own, and only the
    # export procedure that builds both together ever needs this script to see both at once.
    if ZIP.exists():
        zip_bad = report(zip_entities(ZIP), want, "zip")
        bad = bad or zip_bad
        # Bundle and zip were each just checked against the same model set. Where neither
        # comparison found a missing, extra or doubly-claimed path, both sets equal the
        # model's set and so equal each other — which is the agreement this line reports,
        # without comparing the two sets directly.
        zip_clause = "zip agrees" if not bundle_bad and not zip_bad else "zip disagrees"
    else:
        print("--  zip not built")
        zip_clause = "zip not built"

    print(f"{'FAIL' if bad else 'PASS'}  {len(files)} sources, {len(want)} entities, "
          f"largest {max(len(f.read_text(encoding='utf-8').split()) for f in files):,} words; "
          f"{zip_clause}")
    return 1 if bad else 0

sys.exit(main())
