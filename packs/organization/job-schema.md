---
id: 01a1199f-28ad-7f8d-93b9-c9b71903339d
---

# Job Schema

> Required structure for job files.

## File Location

`model/jobs/*.md`

A job owns nothing and nothing owns it, so it is a file. A group names it in its `guides` and in its `## People` rows, and the job never names a group or a person.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `seats` | No | array of ref → seat | The seats in the company's processes that a person in this job usually holds, each the H1 of a file in `seats/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Job]` | Yes | The canonical name of the job. A group's `guides` and `## People` reference it by this exact string. |
| `> [Summary]` | Yes | One-paragraph statement of what the job is for |
| `## Responsibilities` | No | Bulleted. What the job answers for, one item each |
| `## References` | No | Table. What a reader can open to learn more about the job — a job description, a career framework; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a job description, a career framework |
| `URL` | Yes | string | Where it is |

## Purpose

A job is what a person is employed as and, in a group outside the line, the job someone does there, the same wherever they sit: one file, named once, done in as many groups as the company has. It answers "what does this job answer for, and which seats in the company's processes does a person in it usually take?" It is not a seat, core's own type: a responsibility in a process, taken by whoever the process hands it to whatever job they are employed in. It is not a position either, which is a job in a group, one person's row in the group's `## People`, and which no page holds.

## Writing rules

- The H1 names the job as the company titles it, singular and person-neutral: `Backend Engineer`, not `Backend Engineers` and not the name of anyone who does it.
- The tagline says what the job is for, not who holds it.
- `seats` names only seats a holder of the job takes in the company's processes, not seats that a person happens to hold beside the job.
