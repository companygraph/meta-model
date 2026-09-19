# A process names its phases in a table

R3 says every reference is by canonical name, never by file path and never by filename, because
paths move and a canonical name is the entity. One section of one schema did otherwise: a
process's `## Phases` was "an ordered list, one entry per phase, each linking the phase's file",
and the example and the reference instance wrote `1. [Specify](phases/specify.md)`. It was the
only place in core where an entity pointed at another by path.

Status: decided by the owner on September 19, 2026, against `main` after the evidence table was
merged and before the release that carries it was tagged. This change rides in that release, so
an instance rewrites once. It amends `2026-09-16-process-design.md`, whose decisions stand where
this note does not speak.

## What was wrong, measured

The schema knew. Its writing rules said the phase's name is the reference and the path beside it
a convenience for a reader clicking through, and that the list is the authority on order and
each phase's `gate-to` agrees with it. Both are writing rules, so only the agent pass held
them. Nothing mechanical read the list at all: neither `lib/instance.mjs` nor `lib/checks.mjs`
names the section outside a comment. A phase renamed left its old name and its old path in the
list with every check green; a phase added to the folder and not to the list was invisible; and
the order was stated twice, in the list and in the `gate-to` chain, with nothing comparing the
two.

It surfaced in an editor. The Obsidian plugin completes and marks what a schema declares, and
it had nothing to offer in the one section that was written as links, which the editor showed
as links while every other reference in the vault is a name.

## The decision

`## Phases` is a table with one column, `Phase`, declared `ref → phase`, one row per phase in
the order the work passes through them. A table and not a new shape: R9 has three declared
shapes, a field, a column and a grouped heading, and a list whose items are references would be
a fourth, which moves `shape` and with it every parser. The order a list states is stated as
well by the order of rows, and the cost is a table of one column.

Considered and not taken: dropping the section, since the `gate-to` chain already carries the
order. A fact would then live once, which is the model's own preference, but the process's file
would no longer say what the process consists of, and a reader of that file is who the section
is for.

A path is no longer written. Whatever shows the model to a reader can make a name a link: a
site does when it renders the page, and an editor can by resolving the name by its declared
type. That belongs to the surface and not to the model.

## What follows mechanically

R16 holds each cell to the declared type, as it holds every reference. The parser draws one
edge per row, `Phases.Phase`, beside the ownership the nesting already gives; edges are sorted
by name, so the order is read from the section's own rows, which the parser keeps as written.
Neither needed a change, and two parser tests now pin both.

One check is new, because two things R16 cannot see. A name resolves within its type, and an
owned type's names run across every owner, so a row naming another process's phase resolves and
is wrong. And R16 knows nothing of order. **An owner's table of what it owns lists exactly
that, in the order the owned give.** It names no type and hangs on what the schemas declare: a
type that owns another, a column table of the owner whose reference is the owned type, and, for
order, a field of the owned type declared `ref → <itself>`, which is what `gate-to` is. It fails
a row that is not the owner's own, an owned entity no row names, a row written twice, two
neighbors the successor field does not join, and a last row whose entity still leads somewhere.
An owner that declares no such table is held to nothing, which is every owner but a process
today; a profile does not list its experiences. It cites R5, the rule that makes what an owner
owns a fact of the tree.

## What it costs

Every instance with a process rewrites one section, a list of links into a table of names. It
is a breaking change to core below 1.0 and so a minor, and it is the same minor the evidence
table already is. A consumer that draws the graph meets a new edge kind from a process to each
of its phases, and one that selects edges without filtering on `via` now meets a phase once for
the ownership and once for the row. A reader of the file on a forge loses the click from the
list to a phase; the folder beside the file is one click away and lists them.

The release notes gain a sentence: a process's `## Phases` is a table of names, one row per
phase in order, no path beside a name, and the instance checks hold the rows to the folder and
to the `gate-to` chain.
