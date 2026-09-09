# Surface Schema

> Required structure for surface files.

## File Location

`model/surfaces/*.md`

A surface is a place the company publishes that no script writes. One file per surface, so the
rules that turn the model into it are held by name rather than in whoever last rebuilt it.
Nothing owns a surface and a surface owns nothing. Where a build writes the surface, the build
is the projection and there is no file here: a rule that already executes does not want a
second copy.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a record key, an entry id. Absent when the source has none, as a repository does not. |
| `url` | No | string | Where the surface is published. Absent where it has no address, as a document does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Surface]` | Yes | The canonical name. Everything references the surface by this exact string. |
| `> [Description]` | Yes | Single-line description of what this surface is and who reaches it |
| `## What it shows` | Yes | One line per unit the surface presents, naming the unit and what fills it |
| `## Projection rules` | Yes | How the model becomes this surface: what is carried, what is left out, and why |
| `## Constraints` | No | What the published result must satisfy, each written so a reader can pass or fail it |

## Purpose

A surface is a place the company publishes that no script writes, and this file is what
somebody needs in order to write it: which of the model's facts reach it, in what shape, and
what the result has to satisfy. It answers "if I had to rebuild this from the model today, what
would I have to know?" — for a person, and for an agent producing the content. It is not a
record of what the surface currently shows, which is R17's business and belongs in a validation
report.

## Writing rules

- A line of `## What it shows` names a unit the surface itself has, in the words the surface
  uses for it, and then what fills it. A reader has to be able to find that unit by that name
  while looking at the surface.
- A projection rule states what the surface does with the model, not what the model contains. A
  rule that could be read off an entity is a fact restated, and the entity is where it lives.
- Every omission is a rule with a reason. Silence about something the model holds and the
  surface does not show cannot be told apart from drift, which is the one thing this type is
  for.
- A constraint is written as a check: something a reader looking at the published result can
  pass or fail. "Every unit that can appear alone pairs the name with a role or a domain" can
  be failed; "the tone is professional" cannot.
- Where the surface imposes a limit, the constraint names the number and where it was read. A
  limit quoted from memory is a claim like any other.
- The file never states what the surface currently shows. That is an observation, true on the
  day it was written and unfalsifiable here afterwards (R17).
- A surface a script writes has no file here. The script is the projection, and a second copy
  of a rule is what this model exists to end.
