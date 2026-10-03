---
id: 01a0fb19-9589-70e2-aa4e-923ff81c01a8
---

# Control Schema

> Required structure for control files.

## File Location

`model/controls/*.md`

Nothing owns a control and a control owns nothing: it reaches across the processes and phases it applies in and names the risks and rules it answers to.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `kind` | Yes | enum | `preventive`, `detective` or `corrective`. Whether it stops the event, finds it, or repairs what it did (COSO; ISO/IEC 27002 control type). |
| `mode` | Yes | enum | `automated` or `manual`. Whether a machine or a person carries it out (COSO). |
| `mitigates` | No | array of ref → risk | The risks it makes less likely or less harmful, each the H1 of a file in `risks/` |
| `enforces` | No | array of ref → rule | The rules it holds a change or an action to, each the H1 of a file in `rules/` |
| `performed-by` | No | ref → role | The seat that carries it out, for a manual control, the H1 of a file in `roles/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Control]` | Yes | The control's name. Everything references the control by this exact string. |
| `> [What it does]` | Yes | What the control does, in one sentence |
| `## How it is carried out` | Yes | What does the work and when, as a reader could check |
| `## Applies to` | No | Table. The seats, processes and phases it applies in; its columns are declared below. |
| `## References` | No | Table. The hook, the workflow, the command or the checklist, and where its results are kept; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `role`, `process` or `phase` |
| `Entity` | Yes | ref → by Type in Owner | The seat, process or phase, by its canonical name |
| `Owner` | No | string | For a phase, the process that owns it, by its canonical name; blank otherwise |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of thing, a hook, a workflow, a checklist, a test report |
| `URL` | Yes | string | Where it is |

## Purpose

A control is what the company does, or has a machine do, so that a risk is less likely or less harmful, or a rule is kept (ISO 31000: a measure that maintains or modifies risk; COSO's control activities). It answers "what actually stops this, finds it, or repairs it, and is it a machine or a person?" The control is the entity: a gate's criteria and a check's code stay where they are, and the control says in prose how it is carried out and points at the file that does it. How well it works is measured, where the company measures it, by a KPI that names it in `assesses`, never by a number on this page.

## Writing rules

- The H1 names a control that mitigates at least one risk or enforces at least one rule, and `mitigates` or `enforces` names that risk or rule. The grammar declares each field on its own, so this rule is the agent pass's to hold.
- `## How it is carried out` says what does the work and when, as a reader could check: "the seat check, run by the commit hook and again by the instance check on every pull request, refuses a commit whose seat the named phase does not list". The hook, the workflow or the command it names goes in `## References`.
- `## Applies to`, on a control that is a phase's gate, names that phase, and the gate's criteria stay the phase's bullets.
- `mode` decides `performed-by`: a manual control names a seat there, never a person, and an automated control names none.
- An `## Applies to` row names a role, a process or a phase; the grammar reads any type in the Type column, so this is the agent pass's to hold.
- The page writes names and prose in American English (R14).
