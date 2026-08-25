# Profile Schema

> Required structure for profile files.

## File Location

`profiles/<profile>/<profile>.md`

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
