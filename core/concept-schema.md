# Concept Schema

> Required structure for concept files.

## File Location

`model/concepts/*.md`

A concept owns nothing, so it is a file, and nothing owns a concept: it sits in the container rather than inside its domain so that a concept of one domain can be named by a concept of another, which an owned name cannot be.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `domain` | Yes | ref → domain | The area of the vocabulary this concept belongs to — the H1 of a file in `domains/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Concept]` | Yes | The canonical name of the concept. Every reference to it, from any domain, uses this exact string. |
| `> [Definition]` | Yes | One-paragraph definition of what the concept is |
| `## Also known as` | No | Table. The other names this concept goes by, none of which resolves. |
| `## Relations` | No | Table. What this concept points at. |

`## Also known as` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Term` | Yes | string | The other name |
| `Kind` | Yes | enum | `synonym`, `abbreviation`, `translation` or `deprecated`. What the other name is: a second word for the same thing, a short form of it, the same thing in another language, or a name this concept used to go by. |

`## Relations` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept | What this concept points at, by its canonical name |
| `Cardinality` | Yes | enum | `one`, `maybe one`, `many` or `one to many`. How many of the target one of these has: exactly one, none or one, none or more, or one or more. |
| `As` | No | string | The role the target plays in this relation. Required where two rows name the same concept, which is the only thing that tells them apart. |

## Purpose

A concept is one word the company means something exact by, and it answers "what do we mean when we say this, and what does it hang off?" for anyone reading a feature, a process or a role that names it. It is an entity rather than a heading in a glossary so that a file can cite it, a rename is caught everywhere at once, and the relations between the company's words are rows a check resolves instead of lines in a drawing.

## Writing rules

- The definition says what the thing is, not what a system does with it, and it is written so that someone outside the company could tell one of these from something adjacent.
- A concept this one hangs off belongs in `## Relations`, where it resolves, and never in the definition dressed as a link.
- A relation is written on one side only. Where it reads better the other way round, write it on the other concept and not here as well.
- `As` is the name the target goes by in this relation, written as the company says it: `booker`, `primary guest`, `included services`.
- An alias is never used as a reference anywhere in the model. It is there so a reader searching the wrong word finds the right page.
- A deprecated alias stays until nothing outside the model uses the old name, and then it goes; it is not a history of the name.
