# Source Schema

> Required structure for source files.

## File Location

`sources/*.md`

A source is where a page's facts come from: the repository itself, or a system the company
already runs that a sync writes from. One file per source, so a page can name where it was
mastered by canonical name rather than restating a system's name and address on every entry.
Nothing owns a source and a source owns nothing. Every other core type carries a required
`source` field naming one, so no page is of unknown origin, and an optional `source-id` —
the page's identifier inside that source — so a sync can find it again.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `url` | No | string | Where the source lives, for a person or a sync to open |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The canonical name. Everything references the source by this exact string. |
| `> [Description]` | No | Single-line description of what the source holds |
