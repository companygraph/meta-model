---
id: 01a1226b-c58f-7a35-85fb-6ccaa493cc9f
---

# Data Object Schema

> Required structure for data object files.

## File Location

`model/data-objects/*.md`

A data object is owned by nothing: several systems hold one, so it is a file, and each system's `## Holds` row names it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, an element's GUID in an architecture tool. Absent when the source has none. |
| `realizes` | Yes | ref → concept | The concept whose data this is, the H1 of a file in `concepts/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Data object]` | Yes | The canonical name, as the people who keep it name it |
| `> [What it holds]` | Yes | One-paragraph statement of what it holds and in what form |
| `## References` | No | Table. What a reader can open to learn more about the data object; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a data dictionary, a schema, an architecture view |
| `URL` | Yes | string | Where it is |

## Purpose

A data object answers "in what form, and where, does the company keep this?" for whoever maps a concept to the systems that hold it, migrates one of them or answers for a record. It is the layer below the concept: what a system stores, not what the business means by it. Data whose meaning nobody can name has no page here, as a function nobody uses has none. A field list is left for later.

## Writing rules

- The H1 names the data as the people who keep it name it, `Invoice record`, `ARTICLE`, never as
  the concept it realizes, which has its own page.
- The tagline says what the data object holds and in what form, a table, a file, a message, and
  claims nothing about its quality.
- `realizes` names the one concept this is the data of; data that is the data of two concepts is two
  data objects.
- The page writes names and prose in the model's language (R14), as every page does.
