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
| `lead` | No | ref → role | The seat that leads the group, the H1 of a file in `roles/` |
| `members` | No | array of ref → role | The seats that sit in the group. In a group whose kind is in the line, this is each seat's disciplinary unit. |
| `guides` | No | array of ref → role | The seats whose discipline this group sets wherever they sit: the professional line |
| `start` | No | date | When the group was formed, for a group that is not standing |
| `end` | No | date | When the group was disbanded: the last day it existed, as R9 reads an `end`. A seat that moves to another unit is in the new one from the next day, so the old unit's `end` is the day before the move. Absent while it exists. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The group's name. Every reference uses this exact string. |
| `> [Purpose]` | Yes | What the group is for, in one paragraph |
| `## Responsibilities` | No | Bulleted. What the group answers for, one item each |
| `## People` | No | Table. The named people who sit in the group, each with the seat they sit in it as; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the group — a charter, a mandate; its columns are declared below. |

`## People` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Profile` | Yes | ref → profile | The person, the H1 of a profile |
| `Role` | Yes | qualifier → role | The seat the person sits in the group as, one their profile lists in `roles`, or listed there while the group existed, for a group whose `end` has passed |
| `As` | Yes | enum | `Lead`, `Deputy` or `Member`. The person's place in the group: the one who leads it, one who stands in for the lead, or one who sits in it. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a charter, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A group is a unit of the company, or a team drawn from its units, and answers "who sits together, under whom, and whose standard do they work to?" Its `members` and `part-of` are the disciplinary line: a seat answers to the lead of the unit that lists it, and that lead to the lead of the unit above, as Gabler's Einliniensystem has it. Its `guides` is the professional line, the professional right to direct of a matrix, the fachliches Weisungsrecht: the unit that sets a discipline's standard lists that discipline's seats wherever they sit. A person stands on either line only through the seat they hold, as in the W3C Organization Ontology's posts.

## Writing rules

- The H1 names the group as the company calls it, without its kind: `Engineering`, not `Engineering department`.
- The tagline says what the group is for, not who sits in it.
- `members` never names the seat in `lead`; the lead's own unit is the one whose `members` list its seat.
- `guides` names only seats whose discipline the group sets, not seats that merely work with it.
- `## People` is written only for a group made of named people; a unit of seats lists them in `members`.
- `## People` names the seat in `lead` as the `Role` of the row whose `As` is `Lead`, where `lead` is written.
- Each `## People` row's `Role` is one of the seats in `members`, where `members` is written.
- `end` is written once the group is disbanded, and the page is kept.
