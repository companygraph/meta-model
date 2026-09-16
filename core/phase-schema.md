# Phase Schema

> Required structure for phase files.

**Owner:** process

## File Location

`model/processes/<process>/phases/*.md`

A phase is owned by a process and cannot exist without it, so it nests inside the process's
folder rather than sitting at the root with a `process:` field pointing back. The filename is
R12's default, the slug of the H1. It carries no position prefix: the order is the owning
process's `## Phases` list and the `gate-to` chain, and a third copy on the filename would have
to be renamed through the whole folder whenever a phase was inserted.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
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
| `# [Phase]` | Yes | The canonical name of the phase. The owning process's `## Phases` list and the previous phase's `gate-to` reference it by this exact string. |
| `> [Goal]` | Yes | Single-line statement of what the phase is for |
| `## What it takes` | Yes | What enters the phase, and what it refuses to start without |
| `## Activities` | Yes | A numbered list of what is done; where the work differs by track, one `### [Track]` heading per track, each with its own numbered list |
| `## What it produces` | Yes | Table. What leaves the phase; its columns are declared below. |
| `## What it never does` | Yes | A list, one sentence each, of what the phase refuses |
| `## Gate` | Yes | The criteria that must be satisfied to leave the phase, as a list, and what happens when they cannot be |

`## What it produces` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Deliverable` | Yes | string | The thing that leaves the phase |
| `Description` | Yes | string | What it is, and what makes it finished |

## Purpose

A phase is one step of a process and the gate at its end — what enters, what is done, what
leaves, and what must be true for it to leave. It answers "am I done, and who says so?" for
whoever is in it. The gate is the part the model enforces: the document a phase produces scales
with the size of the change and may be a conversation rather than a file, and the approval at
its end does not scale at all.

## Writing rules

- A gate criterion is a sentence that can fail: "the checks pass on the branch" can, "quality
  is good" cannot.
- A `### [Track]` heading under `## Activities` names a track the owning process declares, spelled
  as that track's `Track` cell spells it.
- A phase whose activities are the same for every track carries no track headings at all.
- `gate-to` names the next phase and the owning process's `## Phases` list says the same thing;
  where the two disagree the model is wrong, not the reader.
- The last phase has no `gate-to`, and its gate is the one that releases the work.
- A phase's name is unique across every phase in the instance, not merely within its process,
  because R2 scopes a name to its type rather than to its owner. Two processes cannot each call
  a phase `Review`; name a phase for what it does in the process it belongs to. A phase and a
  role may share a name, since a reference carries the type it resolves under.
- `executed-by` names the seats that do the work, never the seat that approves it; a seat that
  only signs belongs in `gate-approvers`.
