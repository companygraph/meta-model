---
id: 01a0dd34-8da0-7615-9223-70458cc2b8b0
---

# Decision Kind Schema

> Required structure for decision kind files.

## File Location

`model/decision-kinds/*.md`

A kind owns nothing and nothing owns it: many decisions claim the same few, and what each kind means lives here rather than being restated on every call. It sits at the container root beside `experience-kinds/`, because every decision in the instance claims one of the same set.

The set is the instance's own, as an experience kind's is. Which sorts of call a company distinguishes, an architecture from a hire from a price, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which calls belong to this kind, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a governance framework, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A kind answers "what sort of call is this?", the question a reader cannot otherwise ask of a folder that holds a hire, a license and a data model side by side. Its value is that the answer is a reference rather than a word: two decisions of one kind mean the same sort of thing, the kinds are visible in the graph as nodes, and a page can draw the calls of one kind together.

## Writing rules

- `## What it means` says what the kind excludes as well as what it covers, since the boundary
  with the kind beside it is where every disagreement will be.
- `## What it means` is about the sort of call, never about how large it was, how it turned out
  or who made it. Those belong to the decision.
- The H1 names what the calls are, `Architecture`, `Career`, and never the section or the type
  they sit in.
