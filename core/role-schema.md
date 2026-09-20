# Role Schema

> Required structure for role files.

## File Location

`model/roles/*.md`

A role owns nothing and nothing owns it, so it is a file. A profile holds one by listing it,
and the role never names its holder; what a role names is the skills it requires, and nothing
else.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `requires` | No | array of ref → skill | The skills the seat needs, each the H1 of a file in `skills/`. Absent while nobody has said what the seat needs. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Seat]` | Yes | The canonical name of the seat. Profiles reference the role by this exact string. |
| `> [Purpose]` | Yes | One-paragraph statement of what the seat is for |
| `## What it takes` | Yes | What the holder is handed, and what the seat refuses to start without |
| `## What it produces` | Yes | What leaves the seat, and in what form |
| `## What it never does` | Yes | A list, one sentence each, of what the seat refuses whoever holds it |
| `## References` | No | Table. The documents the seat works by — a rulebook, a mandate; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a rulebook, a glossary, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A role is a seat the company needs filled — one file, named once, held by whichever profile
lists it. It answers "what does this seat take, produce and refuse, and what must whoever holds
it be able to do?" for someone filling it, holding it or handing work to it. It is not a
person's history in the seat, which lives on the profile and in its experiences, and it is not
a process, which says when the seat acts.

## Writing rules

- Person-neutral: no name, employer, date or number from any profile, and never who holds
  the seat. Who holds it is the profile's fact.
- Named for the seat, so a second holder would still be called that: `Owner`, not
  `Entrepreneur`; `Reviewer`, not the reviewer's name.
- Each line under `## What it never does` is a sentence an agent can hold an output against.
  "Never merges" can fail; "acts responsibly" cannot.
- `requires` lists what the seat needs, not what its current holder happens to have.
- A skill the role requires that a person holding it does not claim is a gap the validation
  pass reports, never an error. It says what the holder has to learn or the company has to
  hire, which is information about the person and not a defect in the model. An agent claims
  nothing, so a seat held by one reports no gap and needs none: what the seat requires is
  answered by its rulebook.
