# Process Schema

> Required structure for process files.

## File Location

`model/processes/<process>/<process>.md`

A process owns its phases and its tracks and cannot be read without them, so it is a folder rather than a file, as a profile is. The folder is named for the process and holds its own file under that same name, plus the `phases/` and `tracks/` collections the phases and tracks nest in.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the process as a whole, the H1 of a file in `roles/` |
| `supported-by` | No | array of ref → role | The seats that keep the process working without being accountable for it |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Process]` | Yes | The canonical name of the process. Phases and readers reference it by this exact string. |
| `> [Purpose]` | Yes | One-paragraph statement of what the process is for |
| `## Tracks` | Yes | Table. The kinds of thing this process makes, one row each; its columns are declared below. |
| `## Phases` | Yes | Table. The phases of the process, one row each, in the order the work passes through them; its columns are declared below. |
| `## What it never does` | Yes | Bulleted. One sentence each, of what the process refuses in every phase |
| `## References` | No | Table. The rulebooks the process is run by; its columns are declared below. |

`## Tracks` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Track` | Yes | ref → track | The track, by its canonical name: the H1 of a file in this process's `tracks/` |

`## Phases` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Phase` | Yes | ref → phase | The phase, by its canonical name: the H1 of a file in this process's `phases/` |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a rulebook, a checklist, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A process is the path work takes through the company's seats — one folder, the phases in the order they are passed through, and the gate between each pair — and it answers "what happens next, who does it, and what has to be true before it moves on?" for someone doing the work or waiting on it. It is not a seat, which says what one role takes and produces whenever it acts, and it is not a record of work that happened, which is an experience.

## Writing rules

- Person-neutral, as a role is: a process names seats and never who holds them.
- Named for the work rather than for the tool that carries it: `Delivery`, not `The board`.
- Tracks run together in one pass rather than instead of one another. A change that is both
  code and prose runs down both, so a phase's `### [Track]` headings are strands of one step
  and never alternative routes through it, and a phase may produce a deliverable per track in
  the same pass.
- Each line under `## What it never does` is a sentence an agent can hold a change against.
  "Never merges without the Owner" can fail; "works carefully" cannot.
- `## Phases` lists every phase in the folder and nothing else, in the order the work passes
  through them. It is the authority on that order, and each phase's `gate-to` agrees with it;
  the instance checks hold both.
- A phase is named in `## Phases` by its canonical name and nothing beside it (R3). A path to
  the phase's file is not written there: a path moves, nothing resolves one, and whatever shows
  the model to a reader can make the name a link.
- `## Tracks` lists every track in the folder and nothing else, each by its canonical name and
  nothing beside it (R3); the instance checks hold it. What a track produces is said once, in
  the track's own file, and is not repeated here.
- A process with one track says so and names it; a track table is not omitted because there
  happens to be only one kind of work today.
