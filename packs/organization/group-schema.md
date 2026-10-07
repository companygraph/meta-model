---
id: 01a114eb-b0a9-7c5a-b639-9033f599f5f9
---

# Group Schema

> Required structure for group files.

## File Location

`model/groups/*.md`

A group owns nothing and nothing owns it, so it is a file. Its place in the tree is its `part-of`, so a reorganization edits one field and moves no file, and a team drawn across units stands beside them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `kind` | Yes | ref → group-kind | What kind of group this is, the H1 of a file in `group-kinds/`; its `in-line` says whether the group stands in the disciplinary line |
| `part-of` | No | ref → group | The unit this one sits in, one step up the disciplinary line. Absent at the top and for a group outside the line. |
| `guides` | No | array of ref → role | The jobs whose discipline this group sets, wherever their holders sit: the professional line |
| `start` | No | date | When the group was formed, for a group that is not standing |
| `end` | No | date | When the group was disbanded: the last day it existed, as R9 reads an `end`. A person who moves to another unit is in the new one from the next day, so the old unit's `end` is the day before the move. Absent while it exists. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The group's name. Every reference uses this exact string. |
| `> [Purpose]` | Yes | What the group is for, in one paragraph |
| `## Responsibilities` | No | Bulleted. What the group answers for, one item each |
| `## People` | No | Table. The people who sit in the group, each with the job they do there and their place in it; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the group — a charter, a mandate; its columns are declared below. |

`## People` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Profile` | Yes | ref → profile | The person, the H1 of a profile |
| `Role` | Yes | qualifier → role | The job the person does in the group, one their profile lists in `roles`, or listed there while the group existed, for a group whose `end` has passed |
| `As` | Yes | enum | `Lead`, `Deputy` or `Member`. The person's place in the group: the one who leads it, one who stands in for the lead, or one who sits in it. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a charter, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A group is a unit of the company, or a team drawn from its units, and answers "who sits together, under whom, and whose standard do they work to?" Its `## People` rows are its positions, each one person doing one job in one place. In a group whose kind is in the line, a person answers to the row whose `As` is `Lead`, and that lead to the lead of the unit its `part-of` names, as Gabler's Einliniensystem has it. Its `guides` is the professional line, the professional right to direct of a matrix, the fachliches Weisungsrecht: the unit that sets a discipline's standard lists that discipline's jobs, and the standard holds wherever their holders sit.

## Writing rules

- The H1 names the group as the company calls it, without its kind: `Engineering`, not `Engineering department`.
- The tagline says what the group is for, not who sits in it.
- `guides` names only jobs whose discipline the group sets, not jobs that merely work with it.
- `end` is written once the group is disbanded, and the page is kept.
