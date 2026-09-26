# Brand Schema

> Required structure for the brand file — what the company looks and sounds like.

## File Location

`model/brand.md`

A company has one brand, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be the name the brand goes by.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The name the brand goes by — the one the mark spells and the lockup carries |
| `> [Promise]` | Yes | One-paragraph statement of what carrying this name promises a reader |
| `## Mark` | Yes | Bulleted. What the mark is, in a sentence, then one rule per item: clear space, minimum size, what it sits on |
| `## Color` | Yes | Table. One row per color role; its columns are declared below. |
| `## Typography` | Yes | Table. One row per typeface; its columns are declared below. |
| `## Voice` | Yes | Table. One row per trait of the company's voice; its columns are declared below. |
| `## References` | Yes | Table. Where the values are: the tokens, the mark's file, the rulebook; its columns are declared below. |

`## Color` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Name` | Yes | string | The role's name as the place that masters its value spells it — a token, a swatch name |
| `Means` | Yes | string | What a thing painted in it is saying |
| `Never` | Yes | string | The one misuse it is most often put to |

`## Typography` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Face` | Yes | string | The typeface's name as its foundry writes it |
| `Job` | Yes | string | What it sets, and nothing about how |

`## Voice` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Trait` | Yes | string | One word for a way the company writes |
| `Means` | Yes | string | What a sentence with the trait does |
| `Never` | Yes | string | What a sentence without it does, specifically |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of file — the tokens, the mark, the rulebook |
| `URL` | Yes | string | Where it is |

## Purpose

The brand is what the company looks and sounds like wherever it appears, stated as meaning rather than measure, so that a person or an agent producing anything in the company's name reads one file, finds what each color, face, mark and trait is for, and follows a reference to the bytes. It answers "what does this look and sound like, and why?" for someone writing a post, cutting a tile or reviewing a draft. It is not the palette and not the stylesheet, which are built and kept where the References rows point, and it is not the positioning, which the identity's tagline, the vision and the values already hold.

## Writing rules

- No hex code, size, weight, line height or file dimension anywhere in the file. A value moves
  with a release, and a References row says where it is kept.
- A `## Color` row is named as the place that masters its value names it, so a reader can find
  it there by the same string.
- A `Means` cell says what a thing in that color, or a sentence with that trait, is saying; a
  `Never` cell names one specific misuse, not the absence of the trait. "Never decoration" can be
  checked; "never misused" cannot.
- A `Job` names what a face sets in the words the page uses for it — prose, the ledger, a section
  mark — and says nothing about how it is set.
- A trait is one a draft can fail. "Plain" fails a sentence with an adjective that sells;
  "professional" fails nothing.
- `## Voice` speaks in the company's first person, "I" for a company of one and "We" for a company
  of more, the same one the instance's values use.
- `## Mark` says where the shape is mastered and never carries a copy of it, so the mark has one
  source and every render is made from it.
- Positioning stays out: the promise is one paragraph, and what the company is, where it is going
  and what it holds to are the identity's, the vision's and the values' to say.
- Names and prose are American English (R14).
