# Profile Schema

> Required structure for profile files.

## File Location

`model/profiles/<profile>/<profile>.md`

A profile owns experiences, so it is a folder rather than a file: `profiles/<profile>/` holds
the profile's own file and an `experiences/` folder beside it. Removing a person is then one
operation and an orphaned experience is unrepresentable.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `email` | No | string | Contact address |
| `location` | No | string | Where the person works from |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The person's canonical name. Everything references the profile by this exact string. |
| `> [Tagline]` | Yes | Single-line summary of the person |
| `## Skills` | No | Table. One row per skill claimed; its columns are declared below. |
| `## Summary` | No | A paragraph of context |

`## Skills` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `Level` | Yes | ref → proficiency-level | Must match the H1 of a file in `proficiency-levels/` exactly |
| `Evidence` | Yes | string | A concrete fact the level can be weighed against. Required, because the adjective on its own measures confidence rather than skill. |

An assessment is a table row rather than a frontmatter field because it is a claim with prose
attached, not a short fact. A table renders where a reader looks, has no quoting hazard around
a colon or a wrapped line, and declares its columns here exactly as a frontmatter field does.

## Purpose

A profile is the one page that says who a person is and what they claim — the entity every
experience is owned by and every skill claim is made from. It answers "who is this, what can
they do, and what is that judgment resting on?" for someone deciding whether to work with
them. It is not a curriculum vitae: what happened, when and where lives in the experiences the
profile owns, and what a capability *is* lives in the skill. What only the profile can hold is
the claim — this person, this skill, at this level, on this evidence.

## Writing rules

- The tagline and `## Summary` are the person's own, in their own voice: what they do and what
  runs through it. Not their employer's description of the role, and not a job advertisement.
- An Evidence cell states a fact that can be checked — a system, an organization, a number, a
  named outcome. "Extensive experience" and "deep knowledge" are not evidence.
- Evidence never restates the level. If removing the Level column would lose nothing, the
  evidence is describing confidence rather than the work.
- A level is weighed against the evidence beside it and the rung's own definition, not against
  how long the person has done it. Evidence that names one engagement supports a lower rung
  than evidence that names three.
- One row per skill claimed. A skill the person can name but not evidence has no row: the
  table is the claim, and a claim needs something under it.
- The Skills table is where a person's history with a skill lives. The skill file stays
  person-neutral, so nothing here belongs there and nothing there belongs here.
