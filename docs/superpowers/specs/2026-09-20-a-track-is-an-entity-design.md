# A track is an entity

R3 says every reference is by canonical name and R4 that one that resolves to nothing is an
error, and both are true only of an entity, because only an entity has a canonical name. A
track is referred to by name and is not one. A phase whose work differs by track writes
`### Code` under `## Activities`, the phase schema's writing rules say that heading “names a
track the owning process declares, spelled as that track's `Track` cell spells it”, and the
thing it names is a cell in a table of the process that the process design called data. So a
name is written in one file and referred to from others, and nothing a machine runs knows the
two are the same name.

Status: the direction was decided by the owner on September 20, 2026, against `main`. This note
is the specification of it and waits for his approval. Three questions were parked for him and
he answered them the same day; the last section holds them. It amends
`2026-09-16-process-design.md`, whose decisions stand where this note does not speak.

## What was wrong, measured

It surfaced in an editor. The owner renamed a track in the reference instance's process, in the
Obsidian plugin, which runs these checks as a file is edited, and expected the phases that still
carried the old name to be reported. Nothing was.

Repeated outside the editor, on a copy of the reference instance: the row `Code` of `## Tracks`
renamed, three phases still headed `### Code`, and the instance checks pass. On the same copy a
phase's `gate-to` pointed at a name no phase has, and the checks fail it twice, once as a
reference that does not resolve and once as an order the table and the chain disagree on, so the
run that passed was a run that could fail. The example passes this repository's own suite with
its track renamed the same way. Neither `lib/checks.mjs` nor `lib/instance.mjs` reads a track
anywhere.

The rule exists and is a writing rule, so only the agent pass holds it, and an editor has no
agent pass. That is the state `## Phases` was in before it became a table, for the same reason.

## Why it was data, and what that missed

The process design made `## Tracks` a table with no reference column and drew the conclusion
that follows: it draws nothing and is data, because “a track is defined by what it makes; which
seats make it is answered by the phases”. That is a statement about the edges that leave a
track, and it is still right. A track points at nothing.

What it did not weigh is the edges that arrive. The same design gave a phase a heading per
track, and a heading that must be spelled as another file spells a cell is a reference in
everything but its declaration. The vocabulary had no way to declare it, since R9's three shapes
all point at a type, so the rule went into prose.

## The decision

**`track` is a type, owned by `process`, and a phase's track headings are references to it.**

A track lives at `model/processes/<process>/tracks/*.md`, named by R12's default, and declares
`**Owner:** process` as a phase does. Its frontmatter is `source` and `source-id` and nothing
else. Its sections are the H1, which is the canonical name, and the tagline, which says what one
pass down the track leaves behind — what the `Produces` cell says today. It points at nothing, as
the process design said it would. The writing rule that a track is named for what it makes and
not for who makes it moves here from the process schema.

The process's `## Tracks` stays required and becomes a table of one column, `Track`, declared
`ref → track`, one row per track. It is then the same kind of section as `## Phases`, an owner's
table of what it owns. `Produces` leaves the table rather than staying beside the name: a fact
kept in the track and again in a cell of the process is two copies held in step by hand, which
is what the role matrix was dropped for. The rule that a process with one track says so and
names it stays on the process.

The phase schema declares `## Activities` grouped under a heading `Track`, not required, typed
`ref → track`. The writing rule that said so in prose goes, because the declaration says it; the
rule that a phase whose activities are the same for every track carries no track headings stays,
and the last section says how much of it a machine holds.

This is the move `achievement-kind` made. A set of heading words became a thin type so that a
heading could be a reference, and its schema gives the reason that applies here unchanged: the
value is that the answer is a reference rather than a word.

Considered and not taken: a fourth declared shape, a heading or a cell typed as naming a row of
a table of the owner. It would hold this rule and leave the track as data. It moves `shape` and
with it every parser, it would be used by one section of one schema and it makes a second way
of referring to something by name beside the one R3 already gives. Also not taken: a check
written for phases, activities and tracks by name. `lib/checks.mjs` names no type in any check
and reads what a schema declares, and one check that does otherwise is the first of several.

## What follows mechanically

Almost nothing is written, which is the argument for the decision. The parser learns its types
from each schema's `## File Location`, so a track is parsed once its schema exists; it resolves
an owned name within the owner the referring entity is or is owned by, so a phase's heading
finds the track of its own process and two processes may each have a track called `Code`; and it
draws an edge per grouped heading already. The checks hold a grouped heading to its declared
type under R16, and hold a name of an owned type to its owner's own folder under R5, for a
field, a column and a heading alike. The two checks of an owner's table read every type an owner
owns, so `## Tracks` is held to the `tracks/` folder as `## Phases` is to `phases/`: a row that
names no track of this process, a track no row names and a row written twice all fail. A track
has no field that names its successor, so no order is held.

What is written: a row for `track` in the checks' list of types and `track` beside `phase` in
what a process owns; the track schema; the two amended schemas; the example's two tracks as
files and its table rewritten; tests that pin each of the three failures above for a track, and
the renamed track that started this, since a behavior that arrives for free is one nobody
notices leaving; and the one change to a check that the last section decides.

The Obsidian plugin takes what it offers from the same declarations. Its rename of an entity
already rewrites the `###` headings of a section a schema declares grouped, so renaming a track
there changes the phases with it, and the heading it offers under `## Activities` comes from the
declaration. Whether making a new track from the editor needs anything of its own is checked
when the plugin takes the release, and is not part of this change.

## What it costs

Every instance with a process adds one file per track, moves each `Produces` cell into that
file's tagline and cuts `## Tracks` down to its names. It is a breaking change to core below
1.0 and so a minor. Until an instance does it the checks fail its `## Tracks`, because the
declared column now names entities the instance does not hold, which is the enforcement and not
a side effect.

A consumer that draws the graph meets a new kind of node and three new kinds of edge: the
ownership of a track by its process, a row of `## Tracks` and a heading of `## Activities`. One
that renders a process finds the `Produces` column gone and reads each track's tagline instead.
The reference instance's site and the MCP server both render a process and are checked against
this when they take the release.

A track file is short, and that was the case against. A kind of achievement is as short, and the
file is not there for its length; it is there so the name has one home.

The release notes gain a sentence: a track is an entity owned by its process, `## Tracks` is a
table of names, what a track produces is its tagline, and a phase's track headings are held to
the tracks of its own process.

## What the owner decided

A track's file carries its name and its tagline and nothing more. A section saying which work
belongs on the track, as a kind says what it covers, is left out because no instance has yet had
two readers disagree about a track. It can arrive later as an optional section and break
nothing.

A phase that names a track is not held to naming every track of its process. A check of it
would name no type — the headings of a grouped section whose type is owned by the same owner are
all of that owner's or none — and it is not written, because a track with nothing to do in a
phase is not an error a machine can tell from an omission. The phase schema's sentence about a
heading per track stays as it reads and stays the agent pass's.

An item above the first track heading fails, and a phase with no track heading passes. The
check that a grouped section's bullets stand under its headings applies to `## Activities` once
an instance holds a track. It reads `-` and `*` items only and activities are a numbered list,
so without a change a phase passes by its list marker and not by intent, headings or none. The
two halves of that check mean different things here. For achievements a section with items and
no heading is a failure; for activities it is the legal way to say the work is the same on every
track. An item standing before the first heading belongs to nothing in either section. So the
first half reads numbered items as well as bullets and says “item” where it said “bullet”, and
the second half is left as it is, reading bullets only, with a test that pins a numbered list
under no heading as passing so that the difference is on record as meant.

Considered and not taken for the last: leaving the check alone and pinning only that a numbered
list is not read, which keeps an activity above `### Code` green; and letting a heading table
say which of the two a section means, which is new vocabulary for one section.
