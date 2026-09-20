# The evidence joins are declared

The reference instance opens on the sentence that no claim in it stands without its evidence,
and the two joins that sentence rests on are held by nobody's script. The profile schema states
both as writing rules and says so itself: that every claim in `## Skills` has a row under it in
`## Evidence`, and that the experience an Evidence row names lists the row's skill in its
`skills` field. The second “would be the first rule in the checker to name a type, and the
schemas drive every rule there today, so it is kept by whoever writes.” The reference instance
carries an agent skill of its own to keep them, which runs when someone remembers to run it.

Status: written on September 20, 2026, against `main` at core 0.33.0, as the first commit of the
pull request that builds it. The owner has seen the direction in one paragraph and not this
grammar. It is here so the grammar can be refused before the code is read.

## What was wrong

An agent asked to rate the reference instance through its MCP server named this first among
what to improve, and it is right about the cause: the joins are the evidence chain, and a chain
held by a writing rule is held by whoever wrote last. The schema's reason for leaving them
unwritten is also right. A check reading “the experience lists the skill” names three things
of one instance's vocabulary, and the day a second one like it is wanted, for a role's required
skills or a strategy's objectives, it is a second check with other names in it.

So the question is not whether to check the joins, it is where the names live. They live in
the schema already, in prose. This note moves them to where a check can read them and leaves
the checks naming nothing.

## The decision

Two declarations, both written as the opening of a Description cell, which is where R8 already
has a check read an enum's values and where R9 already reads `Table.` and `Grouped.`.

**A cell that agrees with its row.** A column typed `qualifier → <type>` may open its
Description with a field of that type and a column of its own table:

```markdown
| `Experience` | No | qualifier → experience | `skills` lists `Skill`. The period the fact comes from … |
```

It says: the entity this cell names carries, in its `skills` field, the entity the same row's
`Skill` column names. A blank cell names nothing and is held to nothing, as everywhere. The
sentence reads as what it means, in the order a reader would say it, and both names in it are
ones the schemas already declare: `skills` in the experience schema, `Skill` in this table.

**A table that stands under another.** A section marked `Table.` may go on to name a second
table section of the same schema:

```markdown
| `## Evidence` | No | Table. Under `## Skills`. One row per fact a claim rests on … |
```

It says: the two tables reference the same entities. Everything a row here references has a row
in `## Skills`, so no fact stands under a claim nobody made, and everything `## Skills`
references has a row here, so no claim stands on nothing. Which column is meant needs no
saying, because R9 gives a column table at most one reference.

Two generic checks hold them, citing R16, and neither names a type, a section or a field. A
page with neither section, as an agent's profile is, has nothing to hold.

## What was weighed and dropped

A form in the Type cell, `qualifier → experience listing Skill in skills` or a bracketed
variant, puts the declaration where the other declarations are. It was dropped for what it
breaks: every parser pinned anywhere in the family reads a Type cell with one pattern and takes
everything after the arrow as the type's name, so a core carrying the new form fails to parse on
every consumer until each has re-pinned. A Description is read by the checks alone. An older
parser reads a core with these openers exactly as it read the last one, so the release is taken
at each consumer's own pace, and only the checker has to be new to hold them.

A third captioned table, “`## Evidence` holds these joins:”, is the most regular shape and the
heaviest: a new table kind in R9, a new caption, a new block in the fixed-shape check, for two
sentences. If a third and a fourth kind of join arrive it is where this goes next, and the
openers translate into its rows one for one.

Writing the two checks with the names in them was the shortest path and is what the schema
already refused, for the reason given above.

## What it costs

A declaration written wrong is prose. `skills` list `Skill`, without the s, opens no
declaration, and the check it would have switched on stays off in silence. R8 has the same
weakness and an answer, since a field typed `enum` that lists nothing is an error; a qualifier
that declares no agreement is legal, so there is no such signal here. Two things stand in for
it. The repository's own suite holds core's profile schema to declaring both, so core cannot
lose them unnoticed, and a declaration that parses is held to naming things that exist: a field
the target type declares as a reference, a column this table declares, both pointing at one
type, and a section that is a table with a reference to the same type as this one's. A
declaration that names nothing fails by name.

The agent skill in the reference instance does not retire. Two of its five steps become the
checks'. The other three stay with it, because they are judgment: whether a year in a sentence
is a copy, and which rows with a blank cell were left blank on purpose.

This is new vocabulary in R9 and rides well with the declared list kind that is parked for the
next such release, which is also a Description opener. `shape` stays 3: nothing about how a
page or a schema is laid out changes, and a consumer that reads 0.33.0 reads this.

## What the owner decides

Whether the grammar stands, and the two words in it: `lists` and `Under`. Whether the checks
cite R16 or get a rule of their own. And whether this waits for the release that carries the
declared list kind or goes ahead of it.
