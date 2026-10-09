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
| `guides` | No | array of ref → job | The jobs whose discipline this group sets, wherever the people who do them sit, each the H1 of a file in `jobs/`: the professional line |
| `start` | No | date | When the group was formed, for a group that is not standing |
| `end` | No | date | When the group was disbanded: the last day it existed, as R9 reads an `end`. A person who moves to another unit is in the new one from the next day, so the old unit's `end` is the day before the move. Absent while it exists. A disbanded group keeps its page. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The group's name. Every reference uses this exact string. |
| `> [Purpose]` | Yes | What the group is for, in one paragraph |
| `## Responsibilities` | No | Bulleted. What the group answers for, one item each |
| `## People` | No | Table. The people who sit in the group, each with the job they do there and their place in it; its columns are declared below. |
| `## Openings` | No | Table. The positions the group is looking to fill, one row per job and place; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the group — a charter, a mandate; its columns are declared below. |

`## People` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Profile` | Yes | ref → profile | The person, the H1 of a profile |
| `Job` | No | qualifier → job | What the person does in the group, the H1 of a file in `jobs/`. In the person's unit in the line it is the job they are employed as; in a group outside the line, the job they do there. A person who does two jobs in a group has a row for each. Blank where the person is not employed in a job here, as an agent is not. |
| `Place` | Yes | enum | `Lead`, `Deputy`, `Member` or `Staff`. The person's place in the group: the one who leads it, one who stands in for the lead, one who sits in it, or one who serves its lead from beside them, as an assistant does. |

`## Openings` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Job` | Yes | ref → job | The job that is open, the H1 of a file in `jobs/` |
| `Place` | Yes | enum | `Lead`, `Deputy`, `Member` or `Staff`. The place in the group that is open, as in `## People`. An open `Lead` beside a `Lead` in `## People` is the search for a successor while the present lead stays. |
| `Count` | No | number | How many openings the row stands for. Blank is one. |
| `Since` | No | date | From when the position is to be filled |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a charter, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A group is a unit of the company, or a team drawn from its units, and answers "who sits together, under whom, and whose standard do they work to?" Its `## People` rows are its positions, each one person in one job in one place; a position is a job in a group, and a row, not a page. A position that is open is a row of `## Openings` until someone fills it, and the person then takes a row of `## People` in the same change. In a group whose kind is in the line, a person answers to the person whose `Place` is `Lead`, and that lead to the lead of the unit its `part-of` names, as Gabler's Einliniensystem has it. Its `guides` is the professional line, the professional right to direct of a matrix, the fachliches Weisungsrecht: the unit that sets a discipline's standard lists that discipline's jobs, and the standard holds wherever the people who do them sit. The checks hold the norms that follow from this: a person sits in at most one unit in the line, only a human sits in one, only a human leads or deputizes, a group has one lead, and a person has one place in a group.

## Writing rules

- The H1 names the group as the company calls it, without its kind: `Engineering`, not `Engineering department`.
- The tagline says what the group is for, not who sits in it.
- `guides` names only jobs whose discipline the group sets, not jobs that merely work with it.
- `## Openings` holds a job and place in one row; `Count` says how many, a whole number above zero.
