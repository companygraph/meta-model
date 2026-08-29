# Identity Schema

> Required structure for the identity file — who the company is.

## File Location

`model/identity.md`

A company has one identity, so the type is a file directly in the container rather than a
folder (R6, R13). The filesystem carries the cardinality: there is nowhere to put a second one.
The file is named for the type, not for the slug of its H1 (R12), which leaves the H1 free to
be the company's name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `email` | No | string | Where to reach the company |
| `location` | No | string | Where the company works from |
| `url` | No | string | The company's own address on the web |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The company's canonical name |
| `> [Tagline]` | Yes | Single-line statement of what the company is |
| `## What it is` | Yes | What the company does, and for whom |

## Purpose

Identity is the company itself: the entity every other file in the instance is about. It
answers "whose model is this?" — which nothing else does, because a repository folder's name is
a path, and R2 and R3 exist to keep a canonical name out of a path. Without it an instance
describes a company it never names.

It is the one entity nothing references. Everything else in the graph is a reference target;
identity is the root, and a reader arriving at a bare name searches for it rather than being
sent to it.

## Writing rules

- The H1 is the company's name as the company writes it, not a description of it. A company of
  one may name a person, and then a profile of the same person carries the same name — that is
  expected, not a collision to resolve: the types are different and nothing references identity.
- The tagline says what the company is, not what it aspires to. Where it is going is the
  vision's business.
- `## What it is` says what the company does and for whom, in the company's own voice. It is
  not a history and not a pitch; an achievement belongs to a profile's experience.
- A fact lives in one place. Where identity and a profile would state the same thing —
  an address, a mail address — identity holds it, and the profile carries its own only where it
  differs.
