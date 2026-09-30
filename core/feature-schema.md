---
id: 01a0c234-71a0-7313-94b7-15be3be5e2d3
---

# Feature Schema

> Required structure for feature files.

## File Location

`model/features/*.md`

A feature owns nothing, so it is a file. It is not owned by a product either: a feature is assembled into several, so the edge is written here, on the side that can hold more than one.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `products` | Yes | array of ref → product | The products this feature is assembled into |
| `concepts` | No | array of ref → concept | The concepts this feature operates on |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Feature]` | Yes | The canonical name of the feature |
| `> [What it gives]` | Yes | One-paragraph statement of what someone can do with this that they could not without it |
| `## Description` | Yes | What the feature does, and where it stops |
| `## References` | No | Table. What a reader can open to learn more about the feature; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — documentation, a demonstration, a place to use it |
| `URL` | Yes | string | Where it is |

## Purpose

A feature is one thing a product lets someone do, and it answers "what is this for, and which products have it?" for a reader deciding what to build, sell or document. It is the unit product documentation is organized along, so a feature nobody can name the user of is a component and belongs in neither this type nor this folder.

## Writing rules

- The tagline says what someone can now do, in their words, and never names a screen, a service or a vendor.
- `## Description` says where the feature stops as plainly as what it does, because the boundary is what tells two neighboring features apart.
- A feature is named for the capability, not for the vendor that supplies it. Where a vendor is what varies, the vendor is a concept the feature names and not a feature of its own.
- Nothing about a release, a ticket or a delivery date goes here: those move, and a feature outlives all three.
- `What` in `## References` names the kind of thing a row opens, never the surface, product or vendor by name.
