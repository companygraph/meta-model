---
id: 01a0f254-34f0-709f-b36c-1c67dcc7ae30
---

# Localization Schema

> Required structure for the localization file: the language an instance is written in, and the ones it is translated into.

## File Location

`model/localization.md`

An instance has one set of languages, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its languages |
| `> [Statement]` | Yes | One paragraph on who reads the model in which language |
| `## Locales` | Yes | Table. The primary language and every translated one; its columns are declared below. |
| `## References` | No | Table. The standard the tags follow; its columns are declared below. |

`## Locales` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Locale` | Yes | string | A BCP 47 language tag, `de-CH` or `en-US` |
| `Role` | Yes | enum | `primary` or `translated`. The primary is the language the pages are written in; a translated locale is one every page carries a section for. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The localization file says which language the pages are written in and which ones each page is translated into, so that a reader, an agent or a check knows which sections a page carries and which language an answer can be grounded in. How a translation is written is R19's, not this page's.

## Writing rules

- Exactly one row is `primary`, and no tag is written twice.
- A locale is declared `translated` only once every page carries it; a translation that is not finished stays undeclared, since a reader would otherwise get two languages on one page.
- The statement names who reads the model in which language: the owner, a customer, an agent answering in it.
- Names and prose are in the primary locale (R14).
