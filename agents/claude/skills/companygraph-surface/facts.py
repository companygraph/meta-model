#!/usr/bin/env python3
"""The facts a surface is produced from, resolved once and decided nowhere.

A surface's file says which of the model's facts reach it, in what shape and in what order.
None of that is here. What is here is the reading a machine can do the same way for any
surface — open every entity, take its frontmatter, its H1, its tagline and its sections — so
that the procedure beside this file spends its attention on the rules rather than on parsing
Markdown.

The test for anything added below: could two surfaces of the same model reasonably want it
different? If yes it belongs in the surface's file, and putting it here would make the file's
rule the second copy — the one nobody reads.
"""
import json
import pathlib

ROOT = pathlib.Path(".")
OUT = ROOT / "dist" / "surfaces" / "facts.json"


def read(path):
    """Frontmatter, H1, tagline and sections of one entity file.

    The frontmatter these files carry is two shapes and no more: `key: value`, and a key whose
    value is a block sequence one entry per line (R11). A YAML library would read both and
    bring a dependency for it; this repository's other script has none and neither does this.
    """
    text = path.read_text(encoding="utf-8")
    fields, body = {}, text
    if text.startswith("---\n"):
        raw, _, body = text[4:].partition("\n---\n")
        key = None
        for line in raw.splitlines():
            if line.startswith("  - ") and key:
                fields.setdefault(key, []).append(line[4:].strip())
            elif ":" in line:
                key, _, value = line.partition(":")
                key, value = key.strip(), value.strip()
                if value:
                    fields[key] = value
    name = tagline = ""
    sections, current = {}, None
    # The tagline is the first blockquote paragraph after the H1, as core's parser reads it: a
    # run of `>` lines joined with spaces, ended by a blank line or a bare `>`.
    in_tagline = False
    for line in body.splitlines():
        if in_tagline and line.startswith("> ") and line[2:].strip():
            tagline += " " + line[2:].strip()
            continue
        in_tagline = False
        if line.startswith("# ") and not name:
            name = line[2:].strip()
        elif line.startswith("> ") and name and not tagline and current is None:
            tagline = line[2:].strip()
            in_tagline = True
        elif line.startswith("## "):
            current = line[3:].strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    return {"name": name, "path": path.as_posix(), "tagline": tagline,
            "fields": fields,
            "sections": {k: "\n".join(v).strip() for k, v in sections.items()}}


def singular(folder):
    """R7: a type folder is the plural of its type."""
    if folder.endswith("ies"):
        return folder[:-3] + "y"
    return folder[:-1] if folder.endswith("s") else folder


def walk():
    """Every entity under `model/`, grouped by type, with the singular types the folders name.

    A folder's `README.md` describes the layout rather than a thing in the model and is not an
    entity, the same rule the export walks by. A file directly in the container is its own
    type — `identity.md` is the identity — because a type with one entity is a file (R6).

    The middle branch is R6's other half: an entity that owns collections is a folder holding a
    file named for itself, so `profiles/<profile>/<profile>.md` sits in a folder named for
    the entity and not for the type. Its type is the folder above that one. Taking the parent
    blindly would make a type named for the profile, with one member, and lose the profile.
    """
    types = {}
    for path in sorted((ROOT / "model").rglob("*.md")):
        if path.name == "README.md":
            continue
        rel = path.relative_to(ROOT / "model")
        if len(rel.parts) == 1:
            kind = rel.stem
        elif rel.stem == rel.parts[-2]:
            kind = singular(rel.parts[-3])
        else:
            kind = singular(rel.parts[-2])
        types.setdefault(kind, []).append(read(path))
    return types


MONTHS = ("Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")


def when(value):
    """One date in the family's register: `2012`, `Oct 2012`, `May 4, 2012`.

    The register is one every surface shares and not any single surface's, which is why it is
    resolved here rather than left to the surface's own file.
    """
    parts = value.split("-")
    if len(parts) == 1:
        return parts[0]
    month = MONTHS[int(parts[1]) - 1]
    if len(parts) == 2:
        return f"{month} {parts[0]}"
    return f"{month} {int(parts[2])}, {parts[0]}"


def span(fields):
    """A period as the register writes one: a closed en-dash, or the start alone when the
    period has no end.

    `fields` already carries whether the period is still running — `end` is present or it is
    not, and that absence is the fact a surface can read for itself. What a surface makes of an
    open period — a dash, the word "Present", nothing at all — is exactly the kind of choice two
    surfaces might reasonably make differently, so this hands back the formatted start alone and
    leaves that choice to the surface's file.
    """
    start = fields.get("start")
    if not start:
        return None
    end = fields.get("end")
    if not end:
        return when(start)
    return when(start) if end == start else f"{when(start)}–{when(end)}"


def where(fields, identity):
    """Who an entity was done for, and where that answer came from.

    An experience nobody commissioned or hosted carries no `organization`, and the model still
    answers: this instance describes a company, so the work was that company's own. Both halves
    are returned because a surface may want them apart — one that shows a person's name where a
    company goes is making a choice, and this only supplies what the model holds.
    """
    named = fields.get("organization")
    if named:
        return named, "field"
    return identity.get("name", ""), "identity"


def has_organization(entities):
    """Whether `organization` means anything for a type, decided from the type's own data.

    Only some entities carry `organization` in their frontmatter, and the fallback belongs
    beside them and nowhere else: handing every skill, value and vision an `organization` of
    the company's own name is not a fact about a skill, it is noise a surface's file would have to learn
    to ignore. The line is drawn from what the type's own entities carry rather than from the
    type's name, so the script stays free of any knowledge of what an experience is — a type
    added to the model that starts naming organizations picks up the fallback the same way,
    with nothing here changed for it.
    """
    return any(e["fields"].get("organization") for e in entities)


def main():
    types = walk()
    identity = types.get("identity", [{}])[0]
    for entities in types.values():
        for e in entities:
            e["dates"] = span(e["fields"])
        if has_organization(entities):
            for e in entities:
                e["organization"], e["organization_from"] = where(e["fields"], identity)
    identity = types.pop("identity", [{}])[0]
    data = {
        "instance": pathlib.Path.cwd().name,
        "identity": identity,
        "surfaces": [{"name": s["name"], "path": s["path"]} for s in types.get("surface", [])],
        "types": types,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts = ", ".join(f"{len(v)} {k}" for k, v in sorted(types.items()))
    print(f"  wrote {OUT}: {counts}")


if __name__ == "__main__":
    main()
