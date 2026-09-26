# Decision Kind Schema

> Required structure for decision kind files.

## File Location

`model/decision-kinds/*.md`

A kind owns nothing and nothing owns it: many decisions claim the same few, and what each kind means lives here rather than being restated on every call. It sits at the container root beside `experience-kinds/`, because every decision in the instance claims one of the same set.

The set is the instance's own, as an experience kind's is. Which sorts of call a company distinguishes, an architecture from a hire from a price, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which calls belong to this kind, and which do not |

## Purpose

A kind answers "what sort of call is this?", the question a reader cannot otherwise ask of a folder that holds a hire, a license and a data model side by side. Its value is that the answer is a reference rather than a word: two decisions of one kind mean the same sort of thing, the kinds are visible in the graph as nodes, and a page can draw the calls of one kind together.

## Writing rules

- `## What it means` is written so that two readers filing the same call would file it under
  the same kind. A kind that cannot do that is not yet a kind.
- It says what the kind excludes as well as what it covers, since the boundary with the kind
  beside it is where every disagreement will be.
- A kind is about the sort of call, never about how large it was, how it turned out or who
  made it. Those belong to the decision.
- Name it for what the calls are, `Architecture`, `Career`, and never for the section or the
  type they sit in.
- No rank: kinds never order anything inside a page, and two kinds are told apart by what they
  cover, not by a number.
