# Achievement Kind Schema

> Required structure for achievement kind files.

## File Location

`model/achievement-kinds/*.md`

A kind owns nothing and nothing owns it: many experiences group their achievements under the
same few, and what each kind covers lives here rather than being restated in every entry. It
sits at the container root beside `experience-kinds/` rather than inside a profile, because
every profile's experiences group by the same set.

The set is deliberately the instance's own. Which groups a career needs is a fact about that
career — a researcher's work falls by publication and grant, a salesperson's by territory and
account — and a kind arriving later is one file here, not a change to this metamodel and a
release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position within an entry. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every heading that groups achievements references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which achievements belong to this kind, and which do not |

## Purpose

An achievement kind answers "what sort of claim is this bullet?" — the question a reader cannot
otherwise ask of a list that holds a decision, a delivery and an outcome side by side. Its value
is that the answer is a reference rather than a word: two bullets under the same kind mean the
same sort of thing across every entry, the kinds are visible in the graph as nodes, and changing
what a kind covers is one edit rather than a pass over every period.

## Writing rules

- `## What it means` is written so that two readers filing the same bullet would file it under
  the same kind. A kind that cannot do that is not yet a kind.
- It says what the kind excludes as well as what it covers, since the boundary with the kind
  beside it is where every disagreement will be. How to decide between two kinds is written
  here, in the instance, and nowhere else.
- A kind is about the sort of claim, never about how important it is. Importance is not an order
  the model can hold.
- Name it for what the claims are — `Architecture`, `Results` — and never for the section they
  sit in.
- `rank` orders kinds within an entry and nothing else, and two kinds never share one.
