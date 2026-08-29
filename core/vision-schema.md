# Vision Schema

> Required structure for the vision file — the future the company is working toward.

## File Location

`model/vision.md`

A company has one vision, so the type is a file directly in the container rather than a folder
(R6, R13), named for the type rather than for the slug of its H1 (R12).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | Short name for the vision, the thing people call it |
| `> [Statement]` | Yes | Single-line statement of the future being worked toward |
| `## What it means` | Yes | What is true when it holds, and what it excludes |

## Purpose

A vision is the future state the company is working toward, stated so that a decision can be
weighed against it. It is not a plan and not a strategy: it says where, never how, and it holds
still while the ways of getting there change.

It earns its place in the graph because values and vision answer different questions. A value
says what we hold to whatever happens; a vision says what we are trying to make happen. An
instance with values and no vision describes a company's character and not its direction.

## Writing rules

- The statement is one someone could work toward and could fail at. If no decision could
  contradict it, it is a slogan and not a vision.
- It says where, not how. A named tool, a named surface or a dated milestone is a plan, and
  plans move faster than a vision should.
- `## What it means` says what is true when it holds — concretely enough that a reader could
  tell whether it does — and what falls outside it. What is out of scope is stated, because a
  vision silent on its boundary is read as covering everything.
- Written in the company's own first person, as values are: "I" for a company of one, "we"
  otherwise.
