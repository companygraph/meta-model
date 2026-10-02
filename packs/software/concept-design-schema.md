---
id: 01a0f94d-fa2a-7d34-ad48-bda5aa4a62c1
---

# Concept Design Schema

> Required structure for concept design files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/concept-designs/*.md`

A concept design is a term of one context's language and means nothing outside it, so it nests inside its context (R5, R10), and its name is unique within that context (R2).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `kind` | Yes | enum | `entity` or `value object`. An entity is defined by an identity that persists through changes to its attributes; a value object is defined only by its attributes and is replaced rather than changed (Evans). |
| `refines` | No | ref → concept | The enterprise concept this term narrows, the H1 of a file in `concepts/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Concept Design]` | Yes | The term, as the context's people say it |
| `> [Meaning]` | Yes | What the word means in this context, and nowhere else |
| `## Attributes` | No | Table. What the term carries; its columns are declared below. |
| `## Relations` | No | Table. Other terms of the same context this one is related to; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the term; its columns are declared below. |

`## Attributes` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Attribute` | Yes | string | The attribute's name, as the context's people say it |
| `Type` | Yes | string | A plain type such as `Money` or `date`, or the name of a value-object concept design in the same context |
| `Description` | No | string | What the attribute says |

`## Relations` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept-design | The related term in the same context, by its canonical name |
| `Cardinality` | Yes | enum | `one`, `maybe one`, `many` or `one to many`. How many of the target one of these has: exactly one, none or one, none or more, or one or more. |
| `As` | No | string | The role the target plays, required where two rows name the same concept |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a model diagram, a glossary |
| `URL` | Yes | string | Where it is |

## Purpose

A concept design answers "what does this word mean here?" It is one term of a bounded context's ubiquitous language (Evans), and an entity or a value object by its kind. It may refine an enterprise concept of core, which says what the thing is for the whole company; the concept design says what it is inside one context, which is narrower and may differ from another context's term of the same name.

## Writing rules

- The meaning says what the thing is in this context, not what a system does with it.
- The kind follows Evans's test: if every attribute changed, would it still be the same one? Then it is an entity.
- A relation is written on one side only, as core's concept relations are.
- An attribute whose type is a value object names that value object's concept design exactly.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
