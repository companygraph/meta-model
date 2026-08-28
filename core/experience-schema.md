# Experience Schema

> Required structure for experience files.

**Owner:** profile

## File Location

`profiles/<profile>/experiences/*.md`

An experience is owned by a profile and cannot exist without it, so it nests inside the
profile's folder rather than sitting at the root with a `profile:` field pointing back.
Filenames are prefixed with the start year so the folder sorts chronologically:
`2018-northwind-atelier.md`.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `start` | Yes | date | `YYYY-MM`, when the period began |
| `end` | No | date | `YYYY-MM`. Absent means the period is ongoing. |
| `organisation` | No | string | Where the period was spent |
| `skills` | No | array of ref → skill | Each entry is the H1 of a file in `skills/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Title]` | Yes | The canonical name of this period |
| `> [Tagline]` | Yes | Single-line summary of the period |
| `## Achievements` | No | What was accomplished in this period |
| `## Ending` | No | Why the period ended, where a bare `end` date would otherwise be read into. One or two sentences. |

An `end` date with nothing beside it is read anyway: the reader supplies a reason, and usually a
worse one than the truth. The section is optional because most periods need none — a talk ends
when it has been given — and a required one would manufacture noise, or invent. It is only
meaningful where `end` is set; an ongoing period has not ended.

It is prose rather than a frontmatter field because a reason is a sentence: it wraps, it may
carry a colon, and R8 keeps frontmatter for short facts. It is deliberately not an enum either.
A closed set of endings — resigned, redundancy, contract end — flattens the one thing that
carries the meaning, does not survive the move between employment cultures, and would be the
most sensitive field in the model to filter on. What is worth recording here is a sentence
someone wrote on purpose, not a token someone selected.
