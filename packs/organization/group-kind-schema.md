---
id: 01a114eb-b0e2-7773-b742-d5556cadc57b
---

# Group Kind Schema

> Required structure for group kind files.

## File Location

`model/group-kinds/*.md`

A group kind owns nothing and nothing owns it, so it is a file. A company names its own kinds; the pack ships none.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `in-line` | Yes | enum | `yes` or `no`. Whether a group of this kind stands in the disciplinary line, and so whether a seat in its `members` has it as its unit. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every group references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which groups belong to this kind, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an organization handbook, a framework |
| `URL` | Yes | string | Where it is |

## Purpose

A group kind says what kind of group a company has, and whether groups of it stand in the disciplinary line. A standing unit does; a board, a cross-functional team or an initiative team does not, and the seats it gathers keep the unit they already sit in. That one fact is what lets a board and a team list seats that are already in a unit without giving any seat a second disciplinary line.

## Writing rules

- The H1 is the kind's name, singular: `Department`, not `Departments`.
- `## What it means` names what a group of the kind is for and one kind of group it is not.
- `in-line` is `yes` only for a kind whose groups hire, appraise and set objectives for the seats in them.
