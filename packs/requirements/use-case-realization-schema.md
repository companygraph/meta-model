---
id: 01a17b6e-5e35-7b41-9700-5a5d856ad527
---

# Use Case Realization Schema

> Required structure for use case realization files.

## File Location

`model/use-case-realizations/*.md`

A use case realization owns nothing and nothing owns it, so it is a file, and every use case realized to it names it in `realization`. It sits at the container root beside `use-cases/`, as `decision-statuses/` sits beside `decisions/`, because the levels belong to the instance and not to one page.

The set is the instance's own. Which levels a company tells apart, whether it separates built from shown, whether it tells a main scenario that runs from one whose extensions run too, is a fact about the company, and a level arriving later is one file here, not a release of the meta-model.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The level's place on the scale, rising with how far a use case at it is realized. Spaced in tens so a level can be added without renumbering the others. |
| `evidence` | Yes | enum | `none`, `satisfies` or `verifies`. What a use case at this level must show in its `## Evidence`: nothing; at least one row, of either kind; or at least one row whose `Shows` is `verifies` (SysML's satisfy and verify). |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every use case realized to this level references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the level means |
| `## What it means` | Yes | What a use case at this level has realized, what moves it into the level and out of it, and what a reader may rely on while it is there |
| `## References` | No | Table. What a reader can open to learn more about the level; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a scale, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A level answers "how far is this realized, and what shows it?" for whoever relies on the product meeting a use case, measured against its scenario, extensions and guarantees. It is not a status, and how far the specification answers the use case is derived from the decisions and questions that name it. A page names the level it has reached, so what each level licenses a reader to rely on is written once here rather than guessed from a word.

## Writing rules

- `## What it means` says what a page at this level has realized, what moves a page into the level and out of it, and what a reader may rely on while it is there.
- `evidence` is the least a page at this level must show.
- The H1 names how far a page at the level is realized, `Main scenario runs`, `Runs end to end`, and never a verdict on the work.
- The page writes names and prose in American English (R14).
