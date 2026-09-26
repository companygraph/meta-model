# Question Kind Schema

> Required structure for question kind files.

## File Location

`model/question-kinds/*.md`

A kind owns nothing and nothing owns it: every question claims one of the same few, and what each kind covers lives here rather than being restated on every question. It sits at the container root beside `questions/`, because every question in the instance claims one of the same set.

The set is the instance's own, as an achievement kind's is. What a company's visitors ask about, a career, a product's fit, a hotel's guests, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever questions are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every question references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the questions of this kind are about |
| `## What it means` | Yes | Which questions belong to this kind, and which do not |

## Purpose

A kind answers "what is this question about?", the question a visitor asks of a list too long to read, when what they want is the part of it that concerns them. Its value is that the answer is a reference rather than a word: the kinds are nodes in the graph, a surface can draw the questions of one kind together or one from each, and the chat can say what the model answers about from the model rather than from its own reading.

## Writing rules

- `## What it means` is written so that two readers filing the same question would file it under
  the same kind, and it says what the kind excludes, since the boundary with the kind beside it
  is where every disagreement will be.
- A kind is about what the visitor has in mind when they ask, never about which entity the
  answer rests on.
- Name it as a visitor would read it above the questions it holds, `Career`, `Brand`, and never
  for the type or the section the answers sit in.
- `rank` orders kinds wherever questions are drawn grouped, and nothing else. The first kind is
  the one most visitors come for, and two kinds never share a rank.
- A kind holds at least two questions. One question alone is filed under the nearest kind until a
  second arrives, because a group of one is a heading over a single line.
- Names and prose are American English (R14).
