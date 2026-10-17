---
id: 01a12c14-d5fb-7268-ae0c-299f194e8ffb
---

# Environment Schema

> Required structure for environment files.

## File Location

`model/environments/*.md`

An environment owns nothing and nothing owns it: every copy that runs there names it, and what the environment is for lives here rather than being restated on every copy. It sits beside `systems/` as `system-kinds/` does.

The set is the instance's own, in the company's words: `Production`, `UAT`, `Northflank Test`. An environment arriving later is one file here, not a change to this metamodel.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none. |
| `rank` | Yes | number | The environment's place on the path from a developer's machine to the customer, the order every list of copies sorts by. Spaced in tens so one can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Environment]` | Yes | The canonical name, as the people who deploy to it say it. Every system that runs there references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what runs here and for whom |
| `## What it means` | Yes | What is deployed here, who may deploy to it, what data it holds, real customers' or synthetic, and which environments are not it |
| `## References` | No | Table. What a reader can open to reach the environment; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a console, a runbook, the pipeline that deploys here |
| `URL` | Yes | string | Where it is |

## Purpose

An environment answers "where does this copy stand, and what may it touch?" in the company's words, and carries once the order every drawing and every list of copies sorts by. A copy of a software runs in exactly one environment, and a platform runs in one too, so an agent that reads a copy's page follows `environment` to what it may touch there. An environment no system names is vocabulary nobody uses, and leaves, once the instance holds a system.

## Writing rules

- `## What it means` says what data the environment holds and who may deploy to it, since that is what an agent asks before it acts, and which environments are not it.
- The H1 names the environment as its deployers say it, never its rank and never the platform under it.
- `## What it means` is the one place that says what data the environment holds, real customers' or synthetic: no field says it, until an instance needs it as a fact with a check.
- The page writes names and prose in the model's language (R14), as every page does.
