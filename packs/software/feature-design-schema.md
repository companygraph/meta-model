---
id: 01a0f94d-fada-7269-85c8-f21efe8fb99f
---

# Feature Design Schema

> Required structure for feature design files.

## File Location

`model/feature-designs/*.md`

A feature design uses the contexts it touches and owns none, because a context outlives any one feature and serves many.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `refines` | No | ref → feature | The feature this design builds, the H1 of a file in `features/`; more than one design may refine one feature |
| `contexts` | Yes | array of ref → bounded-context | The contexts the design takes part in, at least one |
| `decisions` | No | array of ref → decision | The decisions that shaped this design, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Feature Design]` | Yes | The design's name |
| `> [What it delivers]` | Yes | What the design delivers, in one sentence |
| `## Operational principle` | Yes | The one scenario that shows why the design exists (Jackson, The Essence of Software) |
| `## Scenarios` | No | One `###` per scenario, headed `<Label>: <title>` with the label unique within the design, each written Given, When, Then (Gherkin) |
| `## Uses` | No | Table. The terms and events of its contexts the design works with; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the design; its columns are declared below. |

`## Uses` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | `concept-design` or `domain-event`, as the schema is named |
| `Entity` | Yes | ref → by Type in Context | The term or event, by its canonical name |
| `Context` | Yes | string | The context that owns it, by its canonical name |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a prototype |
| `URL` | Yes | string | Where it is |

## Purpose

A feature design answers "how is this feature built, and across which contexts?" It is the solution side of what core's feature says it gives, and it refines that feature. Its operational principle is Jackson's: the one scenario that shows why the design exists. Its scenarios are written as Gherkin writes them.

## Writing rules

- The operational principle is one scenario, told as what happens, not a list of capabilities.
- A scenario says Given, When and Then, and each step is something a person or the system does or sees.
- Every term and event the scenarios mention has a row in `## Uses`, and no row names one they do not.
- A scenario's label is what the test that proves it cites. It stays when the title is reworded.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
