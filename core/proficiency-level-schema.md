# Proficiency Level Schema

> Required structure for proficiency level files.

## File Location

`proficiency-levels/*.md`

A level owns nothing and nothing owns it: many profiles claim the same few, and the definition
of each lives here rather than being restated on every assessment. Changing what a level means
is then one edit, in one file.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | Position on the ladder. Spaced in tens so a rung can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every assessment references this exact string. |
| `> [Summary]` | Yes | Single-line summary of what the level claims |
| `## What it means` | Yes | What someone at this level can actually do |
