# Surface Schema

> Required structure for surface files.

## File Location

`model/surfaces/*.md`

A surface is a place the company publishes from the model. A place is published when anyone can reach it without asking; a bundle handed to whoever requests it is not a surface. One file per surface, so every place the model reaches is named in the model, and a reader who finds no file for a place can take that as meaning the model does not reach it. Nothing owns a surface and a surface owns nothing.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a record key, an entry id. Absent when the source has none, as a repository does not. |
| `production` | Yes | enum | `built` or `written`. `built` means a script writes the surface and holds its rules; `written` means a person or an agent writes it from this file. |
| `built-by` | No | string | The repository whose build writes the surface. Present exactly when `production` is `built`. |
| `url` | No | string | Where the surface is published. Absent where it has no address, as a document does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Surface]` | Yes | The canonical name. Everything references the surface by this exact string. |
| `> [Description]` | Yes | One-paragraph description of what this surface is and who reaches it |
| `## What it shows` | Yes | Bulleted. One item per unit the surface presents, naming the unit and what fills it |
| `## Projection rules` | No | Bulleted. How the model becomes this surface: what is carried, what is left out and why. Required for a `written` surface, absent for a `built` one. |
| `## Constraints` | No | Bulleted. What the published result must satisfy, each written so a reader can pass or fail it |

## Purpose

A surface is a place the company publishes from the model. For a written surface, this file is what somebody needs in order to write it: which of the model's facts reach it, in what shape and what the result has to satisfy. For a built surface, it is what somebody needs in order to know the place exists, what it presents and which repository holds its rules. Either way it answers "if I had to rebuild this from the model today, what would I have to know, and where would I find it?" — for a person, and for an agent. It is not a record of what the surface currently shows, which is R17's business and belongs in a validation report.

## Writing rules

- `production` says who holds the rules. A `written` surface carries `## Projection rules`,
  because nothing re-runs a person. A `built` surface carries none and names the repository in
  `built-by`, because the script is the projection and a second copy of a rule is what this
  model exists to end.
- A surface is named for the page, never for the place that carries it. The place is what a
  profile's or an identity's `## Also at` lists, and a surface named for it would turn that
  table's `Where` column from data into references.
- A line of `## What it shows` names a unit the surface itself has, in the words the surface
  uses for it, and then what fills it. A reader has to be able to find that unit by that name
  while looking at the surface. It names the unit as the place a rule lands, never what that
  unit currently holds — not a count, not a sample, not its present wording.
- A projection rule states what the surface does with the model, not what the model contains. A
  rule that could be read off an entity is a fact restated, and the entity is where it lives.
- Every omission from a written surface is a rule with a reason. Silence about something the
  model holds and the surface does not show cannot be told apart from drift, which is the one
  thing this type is for.
- A constraint is written as a check: something a reader looking at the published result can
  pass or fail. "Every unit that can appear alone pairs the name with a role or a domain" can
  be failed; "the tone is professional" cannot.
- Where the surface imposes a limit, the constraint names the number and where it was read. A
  limit quoted from memory is a claim like any other.
- The file never states what the surface currently shows. That is an observation, true on the
  day it was written and unfalsifiable here afterwards (R17).
