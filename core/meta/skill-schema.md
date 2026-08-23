# Skill Schema

> Required structure for skill files in this repository.

## File Location

`skills/*.md`

A skill owns nothing, so it is a file. Nothing owns a skill either: a profile claims one and
a role requires one, and it outlives both.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `group` | No | string | Free-text grouping, e.g. `Testing`. Whether a group becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Skill]` | Yes | The canonical name. Profiles and experiences reference this exact string. |
| `> [Definition]` | Yes | Single-line definition of what the skill is |
| `## In practice` | No | What someone using this skill actually does |
