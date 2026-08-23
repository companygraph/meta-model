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
| `email` | No | string | Contact address |
| `location` | No | string | Where the person works from |
| `skills` | No | object array | One entry per skill claimed. Keys below. |

`skills` entries carry two keys:

| Key | Required | Type | Description |
| --- | --- | --- | --- |
| `skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `level` | Yes | enum | One of `beginner`, `medior`, `senior` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The person's canonical name. Everything references the profile by this exact string. |
| `> [Tagline]` | Yes | Single-line summary of the person |
| `## Summary` | No | A paragraph of context |
