# Strategic Objective Schema

> Required structure for strategic objective files.

## File Location

`model/strategic-objectives/*.md`

One file per objective. Nothing owns an objective and an objective owns nothing, as with `value` — and a strategy cites the objective it serves by name, which a heading in a shared document could not offer.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `adopted` | Yes | date | When this objective began directing the work |
| `horizon` | No | date | By when it should hold. Absent where the objective is a standing one. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Objective]` | Yes | The canonical name, the objective stated as a phrase. Everything references the objective by this exact string. |
| `> [Statement]` | Yes | One-paragraph statement of what must become true |
| `## What it makes true` | Yes | What is concretely different when it holds, and what falls outside it |

## Purpose

A strategic objective is what must become true for the vision to be reached — the layer between a direction that holds still and the strategies that change under it. It answers "what are we trying to make true, that we are not sure of yet?" for someone weighing whether a piece of work is worth doing at all.

## Writing rules

- It says what must become true, never by what means. A means is a strategy, and an objective
  that names one has already chosen a route the model cannot then see being chosen.
- It names something the company could fail at. An objective no outcome could contradict is the
  vision restated in longer words.
- `## What it makes true` is concrete enough that a reader could tell whether it holds today,
  and it states what falls outside it, because an objective silent on its boundary is read as
  covering everything.
- `horizon` is written only where a real date exists. A standing objective leaves it absent
  rather than inventing one, and an invented horizon is a claim like any other.
- Written in the company's own first person — "I" for a company of one, "we" otherwise — and the
  same one throughout the instance.
- An objective that has been reached is deleted, as a replaced strategy is — the model states
  what the company is currently trying to make true, and git holds what it used to be.
- A `horizon` that passes with the objective unmet is a decision and not a fact: the objective
  is restated, re-dated or deleted, and leaving it to age is none of those.
