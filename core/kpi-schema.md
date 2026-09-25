# KPI Schema

> Required structure for KPI files.

## File Location

`model/kpis/*.md`

One file per key performance indicator. Nothing owns a KPI and a KPI owns nothing, as with `strategic-objective`: it may name the process it measures, and many measure none.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for improving it, the H1 of a file in `roles/` |
| `measures` | No | ref → process | The process whose performance it measures, the H1 of a process file. Absent where it measures none. |
| `serves` | No | array of ref → strategic-objective | The objectives it indicates progress toward, the H1 of a file in `strategic-objectives/` |
| `unit` | Yes | string | What one value is counted in, with its period where it has one: `hours`, `deployments per week`, `percent of deployments` |
| `direction` | Yes | enum | `lower`, `higher` or `target`. Which way is better: down, up, or toward a band, where too high and too low are both worse. |
| `read-with` | No | array of ref → kpi | The KPIs it is read beside, because each can be moved alone at the other's cost — the H1 of a file in `kpis/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [KPI]` | Yes | The canonical name of the quantity. Everything references the KPI by this exact string. |
| `> [Definition]` | Yes | One sentence of what it measures |
| `## How it is measured` | Yes | The calculation, what counts as the event it counts, the window it is taken over, and where the data comes from |
| `## What it can hide` | Yes | How it can move while what it stands for does not, and what reading it beside `read-with` catches |
| `## References` | No | Table. Where the definition comes from, and where its targets and values are kept; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard's definition, a dashboard, a sheet of targets |
| `URL` | Yes | string | Where it is |

## Purpose

A KPI is a quantity the company has chosen to watch, defined once so that everyone who reads the number means the same thing by it. It answers "what exactly does this number count, who answers for it, and what could make it lie?" for someone reading a value, setting a target or deciding whether to trust either. It is not the value and not the target, which move and are kept where the References row points, and it is not a strategy's `## What would show it is working`, which says what to watch for one route; a KPI is watched whichever route is taken.

## Writing rules

- No target, threshold, baseline or measured value, ever. Each moves, and a number that moves
  goes stale in the model without a sound; a References row says where they are kept.
- Named for the quantity, not for the dashboard or tool that shows it: `Change Lead Time`, not
  `the lead-time chart`.
- Person-neutral, as a role is: the definition names seats and never who holds them.
- `## How it is measured` says what counts as the event in this company's terms — what a
  deployment is here, what a failure is — concretely enough that two people counting would get
  the same number. A definition that leaves the event open lets every reader count a different
  thing under one name.
- `## What it can hide` names a specific way the number improves while the work does not. "It
  can be misread" hides nothing a reader can check.
- `read-with` names a KPI that moves against this one when this one is gamed, never the KPI
  itself and not every KPI of the same process.
- `direction: target` is written only where both too high and too low are worse; an indicator
  that is better lower down to some floor is `lower`.
- `unit` names the period wherever the value is a rate: `deployments per week`, not `count`.
- `serves` names an objective only where the KPI moving would actually tell whether that
  objective holds. A KPI that indicates no objective has none, and is still a KPI the company
  watches.
- A KPI that nothing measures yet is a valid definition. It carries no References row for
  values until one exists, and it gains no invented one.
- Names and prose are American English (R14).
