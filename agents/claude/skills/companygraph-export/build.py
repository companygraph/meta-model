#!/usr/bin/env python3
"""Render a CompanyGraph instance into both of its export artifacts, from one walk of the model.

`dist/<instance>-skill.zip` is uploadable as an organization or personal skill: `SKILL.md` at
the root, `model/<type>.md` per root type folder, `model/meta.md`. `dist/<instance>-gemini-notebook/`
is a flat folder of Markdown sources, one per content area, because Gemini Notebook takes files and
no archive among them. Both carry the model's own pages verbatim: an entity keeps the
frontmatter, the H1 and the body it has on disk, so nothing a reader could be answered from is
rewritten on the way out.

One program writes both because two implementations of the same intent drift apart one rule at
a time: a rule lands in one of them, the other keeps the shape it had, and nothing anywhere says
the two now disagree. A hand-followed procedure is also a different program
each time somebody follows it, which is the other half of the same failure — the artifact
nobody can reproduce is the artifact nobody can tell has gone stale.

So the zip is written here rather than shelled out to `zip -r`, which embeds the current mtime
in every member and gives back an archive that differs from the last one whatever the model
did. Every member is added in sorted order with the same fixed `date_time`, `compress_type` and
`external_attr`, and nothing is staged on disk: two runs over an unchanged model produce two
byte-identical zips, so a difference between them is a difference in the model.

Run it from the instance root, or pass the root as the first argument.

Stdlib only. No third-party module is installed where this runs.
"""

import glob
import json
import os
import posixpath
import pathlib
import re
import shutil
import sys
import zipfile

# Two documents ship as sources of their own, beside the sources that carry entities: the
# reading guide the instance writes for this bundle, and the repository's own README. A
# reader who opens a notebook cold has no other way to learn that references between entities
# are by name, and a guide that lives outside the bundle is a guide that reader never sees.
# Neither is an entity and neither carries a marker; `verify.py` counts them as sources and
# looks for no coverage in them.
DOCUMENTS = (("AGENTS.md", "export/gemini-notebook-AGENTS.md"), ("README.md", "README.md"))

# A count a document states in prose is a count nothing checks: the guide would tell a reader
# one count of experiences while the bundle held one more, and the verifier would pass, because a document is
# not an entity and holds no marker. So a document writes `{{entities}}`, `{{sources}}` or
# `{{count:<source title>}}` / `{{count:<path under the root>}}` where a number goes, and the
# build substitutes what it counted on this run. A token that resolves to nothing is left
# standing and fails the build, because `{{count:Skils}}` shipped to a reader is worse than a
# build that stops.
TOKEN = re.compile(r"\{\{([a-z]+)(?::([^{}]+))?\}\}")

# The zip's every member takes this timestamp instead of the file's own mtime. It is the
# earliest the format can hold, which makes it obviously not a date anybody should read
# anything into, and a constant is what makes two runs byte-identical: a member's mtime is
# recorded in the archive, so an archive built from mtimes is new every time the model is
# merely re-checked out.
ZIP_DATE = (1980, 1, 1, 0, 0, 0)


def units():
    """The folder the vendored units sit in, as the manifest names it: `meta` unless `init` was
    told otherwise. Read when asked rather than at import, because the run changes into the
    instance root first. Whatever it is called on disk, the group it forms in both artifacts is
    `meta`, since that is what it is.
    """
    manifest = json.loads(pathlib.Path(".companygraph/manifest.json").read_text(encoding="utf-8"))
    return manifest.get("units", "meta")

# A code span in a README that names a file, and a link into the repository. Both are correct
# where the README lives and dangle where the zip puts it, so both are rewritten on the way in.
SPAN = re.compile(r"`([^`]+)`")
LINK = re.compile(r"\[([^\]]+)\]\((?!\w+:)[^)]*\)")

# Markdown emphasis, as it is taken out of the description the zip's SKILL.md carries. YAML
# holds a plain string; a reader of the skill list sees the marks and not the emphasis.
EMPHASIS = ((re.compile(r"\*\*(.+?)\*\*"), r"\1"), (re.compile(r"__(.+?)__"), r"\1"),
            (re.compile(r"\*(.+?)\*"), r"\1"), (re.compile(r"\b_(.+?)_\b"), r"\1"))


def entities():
    """Every file the export walks, shallowest first and then in path order.

    Shallowest first because a folder that owns another holds the entity the others belong to:
    `model/profiles/<profile>/<profile>.md` is the profile that owns everything under
    `experiences/`, and path order alone would open the source on the first experience and
    reach the profile only after every experience it owns.

    A folder's README.md describes the repository's layout rather than a thing in the model,
    so it is not an entity here and never carries an entity marker: claiming one would make
    the bundle disagree with the model by every README a pattern happened to match. Under
    `meta/` as much as under `model/` — the vendored core has no README today, and a rule that
    holds by accident is one a core release can break without anything saying so.

    This is the walk. Both artifacts are rendered from what it returns, so a root type added to
    the model reaches both of them or neither, and there is no second traversal to keep true.
    """
    found = [p for p in pathlib.Path("model").rglob("*.md") if p.name != "README.md"]
    found += [p for p in pathlib.Path(units()).rglob("*.md") if p.name != "README.md"]
    return sorted(found, key=order)


def order(path):
    """The order entities are written in: depth, then path."""
    return (len(path.parts), path.as_posix())


def declaration(path):
    """Read the instance's source declaration: title, opening paragraph and path globs."""
    sources, current = [], None
    for line in pathlib.Path(path).read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            current = {"title": line[3:].strip(), "prose": [], "globs": []}
            sources.append(current)
        elif current is None:
            continue
        elif line.lstrip().startswith("- "):
            found = re.search(r"`([^`]+)`", line)
            if found:
                current["globs"].append(found.group(1))
        else:
            current["prose"].append(line)
    for source in sources:
        source["prose"] = paragraphs(source["prose"])
    return sources


def paragraphs(lines):
    """Join wrapped lines back into paragraphs, so the prose travels as the writer meant it."""
    out, buffer = [], []
    for line in lines + [""]:
        if line.strip():
            buffer.append(line.strip())
        elif buffer:
            out.append(" ".join(buffer))
            buffer = []
    return "\n\n".join(out)


def root_type(path):
    """The type a path answers to at the root: `profiles`, `skills`, `meta`, `identity`.

    A singular entity is its own type, because `model/identity.md` is its own file in the
    agent bundle too and folding it under a source called `Model` names nothing a reader is
    looking for.
    """
    parts = path.parts
    if path.as_posix().startswith(f"{units()}/"):
        return "meta"
    if parts[0] != "model":
        return parts[0]
    return parts[1] if len(parts) > 2 else path.stem


def singular(path):
    """Whether a path is an entity that stands alone: `model/identity.md`, `model/vision.md`.

    It has no folder and so nothing to consolidate with. In the zip it is copied whole and
    carries no marker; `verify.py` knows that and claims a marker-less `model/*.md` member as
    the entity `model/<basename>`.
    """
    return path.parts[0] == "model" and len(path.parts) == 2


def title_of(name):
    """A folder name as a title, first letter raised and the rest left alone.

    Left alone because a title is what a citation carries: lowering it would turn a name the
    folder spells in capitals into one no reader recognizes.
    """
    text = name.replace("-", " ").replace("_", " ")
    return text[:1].upper() + text[1:]


def filename_of(title):
    """A source's title, as the name of the file it is written to.

    A title is what a citation carries and reads with its spaces and its capital; a file name
    is what a reader types, quotes in a shell and sees in a directory listing, where a space
    and a capital are both awkward there. So the file name is the title lowercased, with every
    run of whitespace collapsed to one dash — `Experience kinds` becomes
    `experience-kinds.md` — while the title itself, and the H1 the source opens with, keeps
    the space and the capital. A name the export invents this way is spelled the way the
    folder it came from spells it: `title_of` raises the folder name's first letter for the
    title, this lowers it back for the file name, and the file name and the folder are the
    same string again. The same rule holds for a title a declaration writes in
    `export/gemini-notebook-sources.md`, so the two paths that produce a title can never
    reintroduce a space or a capital into a file name.
    """
    return re.sub(r"\s+", "-", title.replace("/", "-").strip()).lower() + ".md"


def folder_of(paths, name=None):
    """The folder a source is named for, as a POSIX path.

    Its type folder where the source is one root type, because that is the folder whose README
    describes it and the path a reader would go to: `model/profiles/` and not
    `model/profiles/<profile>/`, which is only where one profile's entities happen to
    share a parent. Otherwise the folder the entities do share.
    """
    if name:
        found = pathlib.Path("model") / name
        if found.is_dir():
            return found.as_posix()
    return posixpath.commonpath([p.parent.as_posix() for p in paths])


def readme_of(paths, name=None):
    """The README that describes a source's folder, when there is one.

    It is context and never an entity: it says how the folder is laid out and what is written
    against which schema, which is what a reader needs before the first page and not a thing
    the model claims. So it carries no marker and is not counted.

    Only a folder under a root, never a root itself: `model/skills/README.md` describes the
    skills, where a README at `model/` would describe the whole model and say nothing about
    the one entity a source such as `Identity` holds.
    """
    folder = pathlib.Path(folder_of(paths, name))
    if len(folder.parts) < 2:
        return None
    found = folder / "README.md"
    return found if found.is_file() else None


def opening(name, paths):
    """One sentence: what the source holds and when a reader wants it.

    Written by the export rather than by the instance because this is the shape an instance
    gets before it has declared one, and a sentence the tool writes is a sentence that stays
    true as the model grows. An instance with a narrative to make writes its own, in
    `export/gemini-notebook-sources.md`.
    """
    topic = name.replace("-", " ").replace("_", " ")
    if len(paths) == 1:
        return (f"`{paths[0].as_posix()}`, reproduced whole — read this source when the "
                f"question is about {topic}.")
    return (f"The {len(paths)} entities under `{folder_of(paths, name)}/`, each reproduced "
            f"whole — read this source when the question is about {topic}.")


def assign(walked, sources):
    """Give every entity to the first heading that claims it, and the rest to a fallback.

    A source carries its entities in the order the declaration writes its globs, and inside one
    glob in the walk's own order, because the order a declaration writes is an argument. `How
    this model works` opens on the five kinds an experience can be and closes on the schema
    underneath them; path order alone would sort `meta/**` ahead of `model/**` and open it on
    the vendored schema instead, which is the reader meeting the appendix before the point.

    Where a declaration groups the model, a straggler goes to a source named for its own type
    folder — `experiences`, not `profiles` — because `model/profiles/` is the one folder the
    walk recurses into, so the root type there is not the entity's type.

    Where there is no declaration at all, which is the path an instance takes before it writes
    one and the path this instance stays on, the whole model is cut by root type instead: one
    source per type folder under `model/`, one for `meta/` and one for each singular entity.
    That is the cut the agent bundle already makes, so the two artifacts are grouped alike
    until the instance says otherwise — and it is the cut that survives a model growing,
    because it groups by what the instance has actually declared about every entity rather
    than by a pattern that happens to match some of them.

    A glob matching nothing on disk comes back as dead, with the source that wrote it, for the
    caller to fail on. A renamed folder would otherwise empty a whole source and drop it in
    silence, and the verifier would still pass: it holds the bundle against the model, and the
    model has no opinion about which heading an entity was meant to sit under.
    """
    left, dead = list(walked), []
    for source in sources:
        source["entities"] = []
        for pattern in source["globs"]:
            matched = {pathlib.Path(m) for m in glob.glob(pattern, recursive=True)}
            if not matched:
                dead.append((source["title"], pattern))
                continue
            source["entities"] += [p for p in left if p in matched]
            left = [p for p in left if p not in matched]
    if not left:
        return sources, dead

    declared = bool(sources)
    groups = {}
    for path in left:
        groups.setdefault(path.parent.name if declared else root_type(path), []).append(path)

    for name in sorted(groups):
        held = sorted(groups[name], key=order)
        if declared:
            prose = (f"The `{name}` entities that no heading in "
                     f"`export/gemini-notebook-sources.md` claims, gathered here so the bundle "
                     f"carries the model whole.")
        else:
            prose = opening(name, held)
        sources.append({
            "title": title_of(name),
            "prose": prose,
            "globs": [],
            "entities": held,
            "type": None if declared else name,
        })
    return sources, dead


def context(readme, title):
    """A folder README as it opens a source, less an H1 that only repeats the source's own.

    The source has already written `# Skills`, and `model/skills/README.md` opens by writing it
    again. A heading that differs is saying something and stays.
    """
    lines = readme.read_text(encoding="utf-8").strip("\n").splitlines()
    if lines and lines[0].strip() == f"# {title}":
        lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)
    return "\n".join(lines).strip("\n")


def counted(text, sources, walked, written):
    """A document with every `{{...}}` token replaced by the count this run measured.

    A token nothing resolves is left as it is: `count_of` gives back 0 for a source title or a
    path that names nothing, and a zero is a typo rather than a fact worth printing.
    """
    def found(match):
        number = count_of(match.group(1), match.group(2), sources, walked, written)
        return str(number) if number else match.group(0)
    return TOKEN.sub(found, text)


def count_of(kind, arg, sources, walked, written):
    """What a token asks for: every entity, every source, or the entities one name holds."""
    if kind == "entities" and not arg:
        return len(walked)
    if kind == "sources" and not arg:
        return written
    if kind == "count" and arg:
        if "/" in arg:
            head = arg.rstrip("/") + "/"
            return len([p for p in walked if p.as_posix().startswith(head)])
        return sum(len(s["entities"]) for s in sources if s["title"] == arg)
    return 0


def render(path):
    """One entity, ready to be inlined: its marker, then the page exactly as it is on disk.

    Verbatim because every rewriting loses something a reader could have been answered from,
    and the frontmatter loses the most: a role naming its skills carries them as a YAML list one
    entry per line, which is a list a reader can follow to the skills that hold each claim, and
    prose made from it is a thousand characters nobody reads to the end of. The reader here
    handles Markdown; it does not need the model translated for it.

    The marker stays. Gemini Notebook strips comments, so it costs the reader nothing, and it is an
    unambiguous boundary where a bare `---` is not: the source holding 69 skills holds 138 lines
    reading `---`, two per entity, and an entity whose body carries a horizontal rule adds one
    that nothing tells apart from a fence. A bare `---` also opens and closes every entity's own
    frontmatter, so a consolidated file of 69 skills holds no line that says which of its `---`
    are boundaries, and no program can split it at all. `<!--` collides with neither YAML nor
    Markdown's own rule, it does not render, and the path gives back the provenance
    consolidation throws away. It is also what `verify.py` reads coverage from.
    """
    return f"<!-- entity: {path.as_posix()} -->\n\n" + path.read_text(encoding="utf-8").strip("\n")


# --- the agent skill zip -------------------------------------------------------------------

def inlined(readme, carried):
    """A folder README as it travels inside the zip, with its references made true there.

    A README describes the repository's layout, and the zip has a different one: nine files
    where the repository has folders. The paths it names are correct where it lives and dangle
    where the zip puts it, so the copy that travels is rewritten and the source on disk is left
    alone. `meta/<unit>/<type>-schema.md` becomes `model/meta.md`, which is where the zip keeps
    the schema; `experiences/` becomes the plain word, because the zip carries no such folder
    and the sentence is about the thing rather than the path; and a reference to anything the
    zip holds no copy of is dropped rather than left pointing at nothing, on the argument that
    a reader who cannot follow a path is better served by a sentence that does not offer one.
    """
    out = []
    for line in readme.read_text(encoding="utf-8").strip("\n").splitlines():
        dropped = []

        def span(match):
            target = match.group(1)
            if re.fullmatch(rf"{re.escape(units())}/.+-schema\.md", target):
                return "`model/meta.md`"
            if target.rstrip("/") == "experiences":
                return "experiences"
            if ("/" in target or target.endswith(".md")) and target not in carried:
                dropped.append(target)
                return ""
            return match.group(0)

        new = SPAN.sub(span, LINK.sub(r"\1", line))
        if dropped:
            new = re.sub(r" {2,}", " ", new).rstrip()
            new = re.sub(r" ([,.;:)])", r"\1", new)
        out.append(new)
    return "\n".join(out)


def tagline():
    """The root README's opening blockquote, joined into the one sentence it wraps across.

    The description the zip's SKILL.md carries is what a reader of a skill list has to decide
    from, and the tagline is the sentence the repository already wrote for that job. Taking one
    wrapped line of it ends the description mid-clause.
    """
    lines = []
    for line in pathlib.Path("README.md").read_text(encoding="utf-8").splitlines():
        if line.startswith(">"):
            lines.append(line[1:].strip())
        elif lines:
            break
    return " ".join(line for line in lines if line)


def plain(text):
    """Markdown link and emphasis syntax as plain text: a link becomes its link text.

    The description is a YAML string a reader sees rendered by nothing, so `[CompanyGraph](url)`
    would reach them as its own source.
    """
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    for pattern, replacement in EMPHASIS:
        text = pattern.sub(replacement, text)
    return text


def zip_body(paths, readme, carried):
    """One consolidated `model/<type>.md`: its folder's README, then every entity it holds.

    The README opens the file rather than a title of the export's own, because it already
    carries the H1 the folder answers to and says which schema the pages under it are written
    against. Entities follow in path order, each behind its marker.
    """
    parts = [inlined(readme, carried)] if readme else []
    parts += [render(p) for p in paths]
    return "\n\n".join(parts).rstrip() + "\n"


def zip_skill(instance, table, version):
    """`<instance>/SKILL.md`: what the agent loading the skill reads before the model.

    Frontmatter it can be listed by, the instance's own intro when it wrote one, a table saying
    what each file holds so a wrong count is visible without opening anything, and the one
    paragraph that makes the consolidated files readable — where an entity begins, what its
    name is, and where the rules are.
    """
    description = plain(tagline()).replace('"', '\\"')
    parts = [f"---\nname: {instance}\ndescription: \"{description}\"\n---", f"# {instance}"]

    intro = pathlib.Path("export/SKILL-intro.md")
    if intro.is_file():
        parts.append(intro.read_text(encoding="utf-8").strip("\n"))

    rows = "\n".join(f"| `{name}` | {held} |" for name, held in table)
    parts.append(f"| File | Entities |\n|---|---|\n{rows}")
    parts.append(f"CompanyGraph core {version}.")
    parts.append(
        "Each entity begins at its `<!-- entity: … -->` line and its H1 is its name. References "
        "between\nentities are by name, so a skill an experience lists is the skill page of that "
        "name.\n`model/meta.md` holds the rules every page obeys.")
    return "\n\n".join(parts) + "\n"


def zip_members(walked, instance):
    """Every member of the skill zip, as `{path inside the archive: text}`.

    One `model/<folder>.md` per type folder under `model/`, with `model/profiles/` walked
    recursively so experiences travel with their profile; `model/meta.md` holding
    `meta/core/CONVENTIONS.md` and then every `*-schema.md` under `meta/`; and each singular
    entity copied whole into a file of its own, carrying no marker because there is nothing in
    it to bound.

    Built in memory. A staging directory is a second copy of the model on disk that has to be
    removed by whoever remembers to, and the zip is written from these strings instead.
    """
    groups = {}
    for path in walked:
        groups.setdefault(root_type(path), []).append(path)

    carried = {"SKILL.md", "model/meta.md"}
    carried |= {f"model/{name}.md" for name in groups}

    members, table = {f"{instance}/SKILL.md": None}, []
    for name in sorted(groups):
        held = groups[name]
        if len(held) == 1 and singular(held[0]):
            body = held[0].read_text(encoding="utf-8").strip("\n") + "\n"
        elif name == "meta":
            # CONVENTIONS.md first: it is the rules the schemas are read under, and path order
            # putting it first is an accident of a capital letter rather than a decision.
            held = sorted(held, key=lambda p: (p.name != "CONVENTIONS.md", p.as_posix()))
            body = zip_body(held, None, carried)
        else:
            # Path order, so a folder reads the way `ls` shows it. The Gemini Notebook rendering
            # sorts shallowest first instead, because a source is read front to back and a
            # profile has to lead the experiences it owns; a file an agent greps does not care.
            held = sorted(held, key=lambda p: p.as_posix())
            body = zip_body(held, readme_of(held, name), carried)
        members[f"{instance}/model/{name}.md"] = body
        table.append((f"model/{name}.md", len(held)))

    version = json.loads(
        pathlib.Path(".companygraph/manifest.json").read_text(encoding="utf-8"))["core"]["version"]
    members[f"{instance}/SKILL.md"] = zip_skill(instance, table, version)
    return members


def write_zip(path, members):
    """Write the archive so that two runs over an unchanged model are byte-identical.

    `zip -r` cannot be: it records each member's mtime, so a fresh clone or a re-run of the
    build gives back an archive that differs from the last one in every member while the model
    did not move at all, and nothing can then tell a real change from a rebuild. So every member
    takes the same fixed timestamp, mode and compression, and they are added in sorted order —
    the three things besides the bytes themselves that a zip records. No directory entries: the
    paths carry the folders, and a directory entry is one more thing with a timestamp on it.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path, "w") as archive:
        for name in sorted(members):
            info = zipfile.ZipInfo(name, date_time=ZIP_DATE)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3          # Unix, whatever this is built on
            info.external_attr = 0o644 << 16
            archive.writestr(info, members[name].encode("utf-8"))


# --- the run -------------------------------------------------------------------------------

def main():
    if len(sys.argv) > 1:
        os.chdir(sys.argv[1])
    root = pathlib.Path.cwd()
    instance = root.name
    out = root / "dist" / f"{instance}-gemini-notebook"
    archive = root / "dist" / f"{instance}-skill.zip"

    walked = entities()
    if not walked:
        print(f"FAIL  no entity under {root}/model")
        return 1

    declared = pathlib.Path("export/gemini-notebook-sources.md")
    sources, dead = assign(walked, declaration(declared) if declared.is_file() else [])

    # A pattern that matches nothing is a source about to go missing: the folder it named was
    # renamed, its entities fall to the fallback, the emptied source is dropped on the next
    # line, and the verifier still passes because it holds the bundle against the model rather
    # than against the declaration. So the build says which pattern died and writes nothing.
    for title, pattern in dead:
        print(f"FAIL  {title}: nothing matches `{pattern}` in export/gemini-notebook-sources.md")
    if dead:
        return 1
    sources = [s for s in sources if s["entities"]]

    # Two sources cannot share a file name. One would overwrite the other, the entities in the
    # loser would leave the bundle, and the run would still exit 0 — which is the exact way a
    # bundle goes quietly short. The check is against the file name rather than the title,
    # because the file name is what collides on disk: two titles differing only in whitespace,
    # `Experience kinds` and `Experience  kinds`, would still want one file and must fail here —
    # and so would two differing only in case, `Skills` and `SKILLS`, which the lowercasing in
    # `filename_of` collides on disk where the titles themselves did not. The document names
    # are taken first, so a declared source named `README` cannot quietly replace the
    # repository's own.
    names, clash = {name for name, _ in DOCUMENTS}, False
    for source in sources:
        name = filename_of(source["title"])
        if name in names:
            print(f"FAIL  two sources want {name}: give one a heading of its own in "
                  f"export/gemini-notebook-sources.md")
            clash = True
        names.add(name)
        source["file"] = name
    if clash:
        return 1

    # The documents are counted and checked before anything is written, so a token nobody
    # resolves stops the build with the old bundle still on disk rather than shipping a reader
    # a pair of braces.
    documents, stale = [], False
    for name, origin in DOCUMENTS:
        found = pathlib.Path(origin)
        if not found.is_file():
            print(f"{'':>4} {'missing':<8}  {name}: no {origin} in this instance")
            continue
        documents.append((name, origin, found.read_text(encoding="utf-8")))
    written = len(sources) + len(documents)
    for i, (name, origin, text) in enumerate(documents):
        text = counted(text, sources, walked, written)
        for match in TOKEN.finditer(text):
            print(f"FAIL  {origin}: nothing counts `{match.group(0)}`")
            stale = True
        documents[i] = (name, origin, text)
    if stale:
        return 1

    # Both renderings are built in memory before either lands, so a failure in one does not
    # leave the other half of the export newer than the model it was meant to agree with.
    members = zip_members(walked, instance)

    # Written from scratch every run: a renamed heading would otherwise leave its old file
    # behind, and a bundle claiming an entity twice is the failure the verifier reports.
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)

    for name, origin, text in documents:
        (out / name).write_text(text, encoding="utf-8", newline="\n")
        print(f"{'':>4} {'document':<8}  {name}")

    for source in sources:
        parts = [f"# {source['title']}"]
        if source["prose"]:
            parts.append(source["prose"])
        readme = readme_of(source["entities"], source.get("type"))
        if readme:
            parts.append(context(readme, source["title"]))
        parts += [render(p) for p in source["entities"]]
        (out / source["file"]).write_text("\n\n".join(parts).rstrip() + "\n", encoding="utf-8", newline="\n")
        held = len(source["entities"])
        print(f"{held:4d} {'entity' if held == 1 else 'entities':<8}  {source['file']}")

    print(f"{len(walked):4d} {'entity' if len(walked) == 1 else 'entities':<8}  in {written} "
          f"{'source' if written == 1 else 'sources'} under {out}")

    write_zip(archive, members)
    print(f"{len(members):4d} {'member' if len(members) == 1 else 'members':<8}  in {archive}")
    return 0


sys.exit(main())
