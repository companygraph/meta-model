---
id: 01a17b6e-5dff-7a17-99e4-333034d24b3d
---

# Requirement Realization Schema

> Required structure for requirement realization files.

## File Location

`model/requirement-realizations/*.md`

A requirement realization owns nothing and nothing owns it, so it is a file, and every requirement realized to it names it in `realization`. It sits at the container root beside `requirements/`, as `decision-statuses/` sits beside `decisions/`, because the levels belong to the instance and not to one page.

The set is the instance's own. Which levels a company tells apart, whether it separates built from shown, whether it has a level for part of a requirement, is a fact about the company, and a level arriving later is one file here, not a release of the meta-model.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The level's place on the scale, rising with how far a requirement at it is realized. Spaced in tens so a level can be added without renumbering the others. |
| `evidence` | Yes | enum | `none`, `satisfies` or `verifies`. What a requirement at this level must show in its `## Evidence`: nothing; at least one row, of either kind; or at least one row whose `Shows` is `verifies` (SysML's satisfy and verify). |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every requirement realized to this level references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the level means |
| `## What it means` | Yes | What a requirement at this level has realized, what moves it into the level and out of it, and what a reader may rely on while it is there |
| `## References` | No | Table. What a reader can open to learn more about the level; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a scale, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A level answers "how far is this realized, and what shows it?" for whoever relies on the product meeting a requirement, measured against its fit criterion. It isn't a status, and how far the specification answers the requirement is derived from the decisions and questions that name it. A page names the level it has reached, so what each level licenses a reader to rely on is written once here rather than guessed from a word.

## Writing rules

- `## What it means` says what a page at this level has realized, what moves a page into the level and out of it, and what a reader may rely on while it is there.
- `evidence` is the least a page at this level must show, and a level above another asks at least what the one below asks.
- The H1 names how far the page is realized, `Built`, `Verified`, and never a verdict on the work.
- The page writes names and prose in American English (R14).
