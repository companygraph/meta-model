---
id: 01a0fb19-951b-79e6-aaf4-dfd05c5bdc60
---

# Rule Schema

> Required structure for rule files.

## File Location

`model/rules/*.md`

Nothing owns a rule and a rule owns nothing: a rule reaches across the seats, processes and phases it binds and belongs to none of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `modality` | Yes | enum | `must`, `must not` or `may`. What the statement does: obliges, forbids or permits (SBVR's obligation, prohibition and restricted permission). |
| `protects` | No | array of ref → value | The values the rule keeps from being broken, each the H1 of a file in `values/` |
| `serves` | No | array of ref → strategic-objective | The objectives the rule serves, each the H1 of a file in `strategic-objectives/` (BMM: a directive supports a goal) |
| `motivated-by` | No | array of ref → risk | The risks that are the reason for it, each the H1 of a file in `risks/` (BMM: a directive is motivated by a potential impact) |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Rule]` | Yes | The rule's name. Everything references the rule by this exact string. |
| `> [Statement]` | Yes | The rule itself, written so that it can be kept or broken |
| `## Why` | Yes | The reason for the rule, in a paragraph |
| `## Applies to` | No | Table. The seats the rule binds and the processes and phases it applies in; its columns are declared below. A rule with no rows applies everywhere. |
| `## References` | No | Table. The law, standard or document it complies with, or where it came from; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `role`, `process` or `phase` |
| `Entity` | Yes | ref → by Type in Owner | The seat, process or phase, by its canonical name |
| `Owner` | No | string | For a phase, the process that owns it, by its canonical name; blank otherwise |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a law, a standard, a policy |
| `URL` | Yes | string | Where it is |

## Purpose

A rule is a statement under the company's own authority that obliges, forbids or permits something (SBVR; BMM's directive). It answers "what must, must not or may happen here, and why?" for a person or an agent about to act. It is for what reaches across: a refusal only one seat, one process or one phase makes stays in that page's `## What it never does`. Whether a machine or a person holds a change to the rule is read from the controls that enforce it, which name the rule; the rule names none of them. A rule binds more than one seat, process or phase, or is what a control checks, and a refusal only one of them makes stays in that page's `## What it never does`.

## Writing rules

- The statement says one thing, as the people it binds would say it, and could be kept or broken. A statement nobody could tell was kept or broken is advice and is not written (SBVR: no business rule is an advice).
- `motivated-by` names a risk only where the rule exists because of it.
- An `## Applies to` row names a role, a process or a phase; the grammar reads any type in the Type column, so this is the agent pass's to hold.
- The page writes names and prose in American English (R14).
