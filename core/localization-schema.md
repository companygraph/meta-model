---
id: 01a0f254-34f0-709f-b36c-1c67dcc7ae30
---

# Localization Schema

> Required structure for the localization file: the one language an instance is written in.

## File Location

`model/localization.md`

An instance is written in one language, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `locale` | Yes | string | The language the model is written in, as a BCP 47 language tag: `en-US`, `de-CH` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its language |
| `> [Statement]` | Yes | One paragraph on who reads the model in that language |
| `## References` | No | Table. The standard the tag follows; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The localization file says which language the model is written in, so that a reader, an agent or a check knows the language every page's names and prose are in, and which language an answer grounded in the model is grounded in. A model is written in one language and is never translated inside itself; a reader in another language reads a rendering of it.

## Writing rules

- `locale` is one language tag. Which tags exist is the registry's, and the check holds only the shape.
- The statement names who reads the model in that language: the owner, a customer, an agent answering in it.
- The page writes names and prose in the language `locale` names (R14).
