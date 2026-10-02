---
id: 01a0fb19-9552-78c5-9105-3fa9c4659b23
---

# Risk Schema

> Required structure for risk files.

## File Location

`model/risks/*.md`

Nothing owns a risk and a risk owns nothing: what could go wrong reaches across the company, and its owner is a seat it names, not a folder it sits in.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the risk, the H1 of a file in `roles/` |
| `threatens` | No | array of ref → strategic-objective | The objectives it would affect, each the H1 of a file in `strategic-objectives/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Risk]` | Yes | The risk's name, stated as the event. Everything references the risk by this exact string. |
| `> [What could happen]` | Yes | What could happen, in one sentence |
| `## Cause` | Yes | What would bring it about (ISO 31000: risk source) |
| `## Consequence` | Yes | What it would do to the company's objectives (ISO 31000: consequence) |
| `## References` | No | Table. The register or tracker that keeps its current rating and its history; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a risk register, a tracker |
| `URL` | Yes | string | Where it is |

## Purpose

A risk is what could go wrong: an event that would affect the company's objectives, from a cause, with a consequence (ISO 31000's risk source, event and consequence; BMM's risk as a potential impact of loss). It answers "what are we guarding against, and who answers for it?" A downside only: an opportunity is what an objective or a strategy already pursues. The controls that mitigate it and the rules it motivates name it; it names none of them.

## Writing rules

- A risk is written as an event, not as a feeling or a gap: "a secret reaches a transcript", not "security".
- It carries no likelihood, impact or score. Those are assessments that move, and the model holds how things are made and not their state (R17), as a KPI holds its definition and none of its values. Where the company rates its risks, `## References` points at where it does.
- `owner` names the seat, never the person, as a role is person-neutral.
- Names and prose are American English (R14).
