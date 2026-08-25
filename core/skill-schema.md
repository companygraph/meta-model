# Skill Schema

> Required structure for skill files.

## File Location

`skills/*.md`

A skill owns nothing, so it is a file. Nothing owns a skill either: a profile claims one and
a role requires one, and it outlives both.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `group` | No | string | Free-text grouping, e.g. `Testing`. Whether a group becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Skill]` | Yes | The canonical name. Profiles and experiences reference this exact string. |
| `> [Definition]` | Yes | Single-line definition of what the skill is |
| `## In practice` | No | What someone using this skill actually does |
