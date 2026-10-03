---
id: 01a0a8b4-7978-7d24-aac9-850b3c9a4d9c
---

# Phase Schema

> Required structure for phase files.

**Owner:** process

## File Location

`model/processes/<process>/phases/*.md`

A phase is owned by a process and cannot exist without it, so it nests inside the process's folder rather than sitting at the root with a `process:` field pointing back. The filename is R12's default, the slug of the H1. It carries no position prefix: the order is the owning process's `## Phases` table and the `gate-to` chain, and a third copy on the filename would have to be renamed through the whole folder whenever a phase was inserted.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the phase's outcome, the H1 of a file in `roles/`. Distinct from the **Owner:** line above, which names the type that owns a phase; this field names the seat. |
| `executed-by` | Yes | array of ref → role | The seats that do the phase's work |
| `supported-by` | No | array of ref → role | The seats consulted in the phase, producing nothing it is graded on |
| `gate-approvers` | Yes | array of ref → role | The seats that approve passage out of the phase. At least one; a phase nobody approves is an activity inside another phase. |
| `escalation-authority` | Yes | ref → role | The seat that decides when the gate's criteria cannot be met |
| `gate-to` | No | ref → phase | The phase this gate leads to. Absent on the last phase, and only there. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Phase]` | Yes | The canonical name of the phase. The owning process's `## Phases` table and the previous phase's `gate-to` reference it by this exact string. |
| `> [Goal]` | Yes | One-paragraph statement of what the phase is for |
| `## What it takes` | Yes | What enters the phase, and what it refuses to start without |
| `## Activities` | Yes | Grouped. Numbered. What is done, in the order it is done; where the work differs by track, one `### [Track]` heading per track, each with its own list |
| `## What it produces` | Yes | Table. What leaves the phase; its columns are declared below. |
| `## What it never does` | Yes | Bulleted. One sentence each, of what the phase refuses |
| `## Gate` | Yes | Bulleted. The criteria that must be satisfied to leave the phase, one item each |
| `## If not met` | Yes | Table. What the escalation authority may decide when the gate's criteria cannot be met, one row each, and where the work goes; its columns are declared below. A paragraph under the table may say what the rows cannot. |
| `## References` | No | Table. What a reader can open to learn more about the phase; its columns are declared below. |

`## Activities` is grouped under these headings:

| Heading | Required | Type | Description |
| --- | --- | --- | --- |
| `Track` | No | ref → track | The track the numbered list below it is the work of, by its canonical name: the H1 of a file in the owning process's `tracks/` |

`## What it produces` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Deliverable` | Yes | string | The thing that leaves the phase |
| `Description` | Yes | string | What it is, and what makes it finished |

`## If not met` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Outcome` | Yes | string | What the escalation authority may decide, in a few words: `reworked`, `dropped` |
| `Leads to` | No | ref → phase | The phase the work goes to: this one, or one before it in the owning process's `## Phases`. Empty where the process stops. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a rulebook, a checklist |
| `URL` | Yes | string | Where it is |

## Purpose

A phase is one step of a process and the gate at its end — what enters, what is done, what leaves, and what must be true for it to leave. It answers "am I done, and who says so?" for whoever is in it. The gate is the part the model enforces: the document a phase produces scales with the size of the change and may be a conversation rather than a file, and the approval at its end does not scale at all.

## Writing rules

- Each `## Gate` criterion is a sentence that can fail: "the checks pass on the branch" can,
  "quality is good" cannot.
- `executed-by` names the seats that do the work, never the seat that approves it; a seat that
  only signs belongs in `gate-approvers`.
- `Outcome` is what the escalation authority decides, in a word or a few, as a past participle
  where it can be: `reworked`, `narrowed`, `dropped`. It is not the gate criterion that failed.
- An empty `Leads to` stops the process. A hand-off to another process is a stop in this table,
  and the paragraph under it names the process the work goes to.
- `## If not met` carries a paragraph under the table only for what the rows cannot say, a
  reason or a hand-off, and a page whose rows say everything carries none.
- `## Activities` treats its `### [Track]` headings as strands of one step and never as
  alternative routes through it, since tracks run together in one pass rather than instead of
  one another, and a phase may produce a deliverable per track in the same pass.
