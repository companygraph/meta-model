# A required section is present, and the rest are the page's

Every schema's `## Sections` table marks each section `Yes` or `No` under `Required`. The owner
asked on September 19, 2026 how an editor could keep a page's mandatory sections from being
removed or renamed, taking for granted that the checks already fail a page that does either.
They did not.

Status: decided by the owner on September 19, 2026, and built in the change that carries this
note. It amends R9. The editor's half is designed in the Obsidian plugin's own repository, where
a tool is specified until it has run.

## What was wrong, measured

The checker's comment on the column tables said it outright: Required says whether the section
must exist, and nothing reads it yet. A copy of the reference instance was checked with its
Expert level's `## What it means` renamed to `## What it is`, and once with the section deleted.
Both passed every mechanical check. Only the agent pass could catch either, and nothing in an
editor could show a writer what the schema asks for, because nothing enforced it.

## The decision

**A section marked `Yes` is present on every page of its type, under its heading exactly as the
sections table writes it.** A renamed required section is therefore the missing one, and the
finding names the heading the schema expects. Exactly means character for character, because
that is how the parser addresses a section and how a column table's caption names one.
`## What It Means` is another section to both.

**A page may carry sections of its own.** The first proposal held every `##` heading to its
schema, the way R15 holds every frontmatter field. The owner turned it down: a heading of the
page's own relates to nothing in the model and breaks nothing, so there is no reason to forbid
it. That is the opposite of R15, and the difference is real. R15 closes fields because a field
left over by a rename still renders as though it were the field, and every check reports green.
A section of the page's own claims to be nothing the schema knows. It draws no edge, resolves
nothing, and is read as prose.

Not held either: the order of a page's sections. R9 fixes the order of a schema's own sections,
and says nothing of a page's. Measured before deciding, every entity of the reference instance
and of the example writes its declared sections in the order its schema lists them, so a later
rule could hold order without a rewrite. Nobody asked for it, and this change does not add it.

## What it costs

An optional section written with a typo, a `## Referencs` for a `## References`, reads as one of
the page's own. If the section is a table, its columns are then held to nothing. No script can
tell a typo from a heading chosen on purpose, and a rule that guessed from how close two
headings are would be a rule no writer can predict. R9 now states this cost beside the rule.

An editor that knows the schema can do what the checker cannot. The Obsidian plugin's design
makes every declared heading read-only, so that it cannot be turned into a typo. It marks a
heading of the page's own as such, and asks on hover whether a near miss meant the declared
section. It places a missing required section where it belongs, as a line that inserts it.
Renaming a heading of the schema is then always a failure. The one legitimate way a declared
heading changes is a core release that renames it, and that is a change across a whole instance,
made by an agent or in git.

## What follows mechanically

One check, "required sections are present", cites R9 as the check for required frontmatter
fields does. It reads the uncaptioned table of each schema's `## Sections` and holds only its
`##` rows. The H1 and tagline rows are R9's other business. A README is no entity and is held to
nothing. Both the example and the reference instance pass it without a change, so no instance has
work beyond re-vendoring `CONVENTIONS.md`.

It is a patch release, 0.31.1. The schemas already said which sections are required. The check
reads what they said and asks nothing new of a valid instance, as 0.30.1 held owned names to
their owner.
