# Value Schema

> Required structure for value files in this repository.

## File Location

`values/*.md`

One file per value. Both source instances kept their values in a single document with a
heading per value, and a heading has no canonical name — so no strategy, role or process
could cite the value it serves, which is the one thing a company's values are for.

## Frontmatter

No YAML frontmatter.

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Value]` | Yes | The canonical name. Everything references the value by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the value |
| `## In practice` | Yes | What following this value looks like, and what breaking it looks like |
