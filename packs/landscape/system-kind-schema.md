---
id: 01a12230-c82d-71c9-9871-a01cbb55497e
---

# System Kind Schema

> Required structure for system kind files.

## File Location

`model/system-kinds/*.md`

A kind owns nothing and nothing owns it: every system claims one of the same few, and what each kind covers lives here rather than being restated on every system. It sits beside `systems/` as `product-kinds/` sits beside `products/`.

The set is the instance's own. A kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever systems are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |
| `element` | Yes | enum | `application-component`, `application-collaboration`, `node`, `system-software`, `device`, `equipment` or `communication-network`. The ArchiMate 3.2 element a system of this kind is, read by a generator in either direction (chapters 9 to 11). |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every system references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what sort of system this kind holds |
| `## What it means` | Yes | What a system of this kind is made of, who runs or holds it, and which systems are not of it |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a classification, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A kind answers "what sort of system is this?" in the company's words, `SaaS`, `Store device`, `Cloud platform`, and carries once the one fact a tool needs, which element it is, so the system page says what staff say and the element comes back exact from an architecture tool, and the kind where the tool carries a specialization. A kind holds at least one system; a kind no system names is vocabulary nobody uses, and leaves, once the instance holds a system.

## Writing rules

- `## What it means` says what a system of this kind is made of and who runs or holds it, since
  that is what tells a device in a store from the software on it, and it has nowhere else to live.
- `## What it means` says what the kind excludes as well as what it covers.
- `element` is the ArchiMate element and nothing more: two kinds may share one, `SaaS` and
  `Service` are both an application component, and the kind is what tells them apart.
- The H1 names what the system is, `SaaS`, `Store device`, and never the element,
  `Application component`, or the type, `System`.
- The page writes names and prose in the model's language (R14), as every page does.
