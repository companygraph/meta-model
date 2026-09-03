# Experience Kind Schema

> Required structure for experience kind files.

## File Location

`model/experience-kinds/*.md`

A kind owns nothing and nothing owns it: many experiences claim the same few, and what each
kind means lives here rather than being restated on every period. It sits at the container
root beside `skills/` rather than inside a profile, because the same kinds are claimed by
every profile in the instance.

The set is deliberately the instance's own. A career acquires categories — a self-directed
period, an advisory seat, a board — and a kind arriving later is one file here, not a change to
this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every experience references this exact string. |
| `> [Summary]` | Yes | Single-line summary of what the kind covers |
| `## What it means` | Yes | Which periods belong to this kind, and which do not |

## Purpose

A kind answers "what sort of period is this?" — the question a reader cannot otherwise ask of a
folder that holds a degree, a conference talk and a decade of employment side by side. Its
value is that the answer is a reference rather than a word: two experiences of the same kind
mean the same thing, the kinds are visible in the graph as nodes, and changing what a kind
covers is one edit rather than a scan of every period.

It carries no dates and governs none. A one-off period writes `end` equal to `start` whatever
kind it is, and an absent `end` means ongoing whatever kind it is. Letting a kind decide how to
read a date would make an absence mean two things and resolve it by a label.

## Writing rules

- `## What it means` is written so that two readers filing the same period would file it the
  same way. A kind that cannot do that is not yet a kind.
- It says what the kind excludes as well as what it covers. The boundary between a role and a
  project, or a project and a community entry, is where every disagreement will be.
- A kind is about the sort of period, never about how it went, how long it lasted or how
  senior it was. Those belong to the period.
- Name it for what the period *is*, not for the type it belongs to: `Role`, not `Experience`.
- `organization` means a different thing under each kind — an employer, a client, a host, an
  awarding body — and each kind says which one it means. That sentence has nowhere else to live.
