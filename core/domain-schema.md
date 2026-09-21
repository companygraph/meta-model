# Domain Schema

> Required structure for domain files.

## File Location

`model/domains/*.md`

A domain owns nothing, so it is a file: its concepts name it rather than sit inside it, because a concept one domain owned could not be named by a concept of another.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Domain]` | Yes | The canonical name of the domain. A concept's `domain` references this exact string. |
| `> [Scope]` | Yes | One-paragraph statement of what this domain covers and what it leaves to another |

## Purpose

A domain is one area of the company's vocabulary, and it answers "where does this word live, and who decides what it means?" for a reader looking a term up and for a writer placing a new one. It holds no definitions: those are its concepts, and what a domain contains is read from the concepts naming it rather than listed here.

## Writing rules

- The tagline says what the domain covers and names at least one thing it deliberately leaves to another domain, because a boundary stated from one side only is not a boundary.
- A domain is named for the area, not for the team that owns it or the system that implements it.
- A domain carries no diagram and no list of its concepts. Both are second copies of what its concepts already say.
