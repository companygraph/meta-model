# A section declares its list kind

A numbered list and a bulleted one mean different things in the model. A phase's activities are
numbered because their order is the order the work is done in; an entry's achievements, a
seat's refusals and a gate's criteria are bullets because they are a set. Every section that
holds a list holds one kind, and which kind is said only in the prose of a Description: “a
numbered list of what is done”, “as bullets under `###` headings”, “a list, one sentence each”.
No check reads that prose, and one check guesses at it.

Status: decided by the owner on September 20, 2026, one question at a time, and built on the
branch of the declared joins so that the two leave as one vocabulary release. The idea was
parked the same day, when the review of the track work found the two holes below, to ride with
the next release that changed R9's vocabulary anyway. The joins are that release.

## What was wrong

The check “a grouped section's items stand under its headings” has to tell two sections apart.
An entry's achievements must stand under a kind wherever the instance defines kinds, while a
phase's activities may stand under no track at all, which is how a phase says its work is the
same on every track. Nothing declares that difference, so the check reads the list marker as a
stand-in for it: with no `###` heading in the section it reports a bullet and lets a numbered
item pass. Two things fall through. An entry's achievements written as a numbered list under no
kind pass, though they stand under no kind. And a phase's activities written as bullets under
no heading are told to stand under a track, which the phase schema forbids; the schema's prose
was patched to say the answer is to number them, which is a sentence explaining a wrong message
and not a right one.

The survey behind the decision read every section of the reference instance and of the example.
Nine declared sections hold a list: a phase's `## Activities`, numbered, and eight that are
bullets, an experience's `## Achievements`, the `## What it never does` of a phase, a process
and a role, a phase's `## Gate`, and a surface's `## What it shows`, `## Projection rules` and
`## Constraints`. Every one of them holds exactly one kind on every page, and no page mixes the
two. The instances already comply with a rule nobody wrote.

## The decision

Two openers in a section's Description, read as `Table.` and `Grouped.` are: `Bulleted.` and
`Numbered.`. They follow `Grouped.` where a section is both, the way `Under` follows `Table.`:

```markdown
| `## Activities` | Yes | Grouped. Numbered. What is done, in the order it is done … |
| `## Achievements` | No | Grouped. Bulleted. What was accomplished in this period … |
| `## What it never does` | Yes | Bulleted. One sentence each, of what the seat refuses … |
```

**A section that declares neither is held to nothing.** This was the first open point, and the
owner decided against a default. R9 lets a page carry sections of its own and lets a prose
section hold what prose needs, numbered steps inside `## The approach` included. A default of
bullets would judge text no schema ever spoke about and fail older instances on it. Undeclared
means the schema has not spoken, exactly as a section that says neither `Table.` nor `Grouped.`
is prose today. Core declares a kind on all nine sections above.

**A kind governs the list, not the section.** This was the second open point. All eight gates
read alike: a sentence that opens, the criteria as bullets, and a paragraph saying what happens
when they cannot be met. So a declared kind says which marker the section's list items carry,
and the paragraphs around the list are free; `## Gate` declares `Bulleted.` and every gate
passes as written. The owner also decided that a required section which declares a kind
carries at least one item, as a required list field carries at least one entry: an
`## What it never does` with no refusal in it has answered nothing.

What is read is an item at the left margin, outside a fenced block. An indented item is a
sub-point of the one above it and may be of either kind, since a numbered activity with two
bulleted notes under it is a sequence whose third step has two remarks, not a mixed list.

One generic check holds it, citing R16 and naming no type and no section: “a section holds the
kind of list its schema declares”. A `Table.` section that declares a kind is an error in the
schema, because a table holds rows.

## What it closes

Both holes, and the marker stays where it is. An entry's numbered achievements under no kind
now fail, because `## Achievements` is declared `Bulleted.`. A phase's bulleted activities are
reported once and rightly, as bullets in a section declared `Numbered.`, and the grouped check
stays silent about them: it reads the declared kind first, and items of the wrong kind are the
other check's finding, so one cause is one finding. The phase schema's sentence explaining the
wrong message goes.

## What rides along

The other line parked from the same review: the track schema gains the writing rule that a
track carries its name and what it produces and nothing more. R9 allows a page sections of its
own, so no script can hold that, and the agent pass does.

## What it costs

The same as the joins cost. An opener misspelled is prose and switches nothing on, so a test
holds core's nine sections to declaring their kind, and breaks the example each way to see the
check fire. An instance whose pages mix markers in a declared section fails where it passed; a
rule that makes a valid entity invalid is a minor by the tooling spec's table, and neither the
reference instance nor the example has such a page. `shape` stays 3: every parser and checker
that reads `Table.` and `Grouped.` matches them at the front of the cell and reads what follows
as prose, so tooling that reads 0.33.0 reads this.
