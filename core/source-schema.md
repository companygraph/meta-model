# Source Schema

> Required structure for source files.

## File Location

`model/sources/*.md`

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

## Purpose

A source is the answer to "if this page is wrong, where does it get fixed?" Every other core
type names one, so no page is of unknown origin, and naming it by canonical name means a
system's name and address are written once rather than on every page that came from it. A
source is where a fact is *mastered* — the place with the authority to change it — not merely
where it was seen.

## Writing rules

- The description says what the source holds and whether anything syncs from it. A reader
  deciding where to make a correction needs both halves, and the second one is what says
  whether an edit here would survive.
- Where the source issues identifiers, the description says what a `source-id` is in it — a
  record key, a directory id, an entry's `id` in a named folder. Without that sentence a
  `source-id` is an opaque string that only its author can resolve.
- `url` is set where the source has an address a person or a sync could open, and left absent
  where it has none. A repository with no remote has none, and the empty field says so.
- The source is the place with authority over the fact, not the place the fact was read. If
  correcting a page means editing somewhere else first, that somewhere else is the source.
