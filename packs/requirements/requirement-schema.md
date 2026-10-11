---
id: 01a12af5-ba03-7c84-98a2-79c3c0928b4c
---

# Requirement Schema

> Required structure for requirement files.

## File Location

`model/requirements/*.md`

A requirement owns nothing and nothing owns it, so it is a file. What it is about is its `## Applies to`, a feature, a product or a use case, so a requirement that holds for a whole product is written once and not on each feature.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, the label a specification gives it: `FR-011`. Absent when the source has none. |
| `kind` | Yes | enum | `functional`, `quality` or `constraint`. A result or behavior a function of the product provides; a quality concern no functional requirement covers, how fast, how safe, how available; or a limit on the solution beyond what the other two need (IREB CPRE glossary). |
| `modality` | Yes | enum | `must`, `should` or `may`. Binding; binding unless a reason to depart is understood and stated; or permitted (RFC 2119). |
| `follows` | No | array of ref → rule | The company's rules this requirement carries into the product, each the H1 of a file in `rules/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Requirement]` | Yes | The requirement's short name. Everything references it, and a test or a code comment cites it, by this exact string. |
| `> [Statement]` | Yes | The requirement itself: one thing a product could be shown to meet or to miss |
| `## Why` | Yes | The need behind the statement, in a paragraph |
| `## Fit criterion` | Yes | How anyone can tell the requirement is met, measured where it can be (Volere) |
| `## Applies to` | Yes | Table. The features, products and use cases the requirement is about, at least one; its columns are declared below. |
| `## References` | No | Table. The specification it was drawn from, the standard behind it, the test that proves it; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `feature`, `product` or `use-case` |
| `Entity` | Yes | ref → by Type | The feature, product or use case, by its canonical name |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a standard, a test |
| `URL` | Yes | string | Where it is |

## Purpose

A requirement is one statement of what a product must do or be, written so that it can be shown met or missed (ISO/IEC/IEEE 29148), and it answers "what exactly is this held to, why, and how would anyone tell?" for whoever builds, tests or accepts it. It is a page so that a test, a code comment or a later specification can cite it by a name and an id no other requirement shares. It is not a rule, which binds the company's own conduct; a requirement that exists because of a rule names it in `follows`.

## Writing rules

- The tagline says one thing, so that a product could be shown to meet it or to miss it; a statement that joins two with "and" is two requirements.
- The tagline says what, not how: it names no component, library or vendor unless `kind` is `constraint`.
- `modality` is the strength the tagline states, and a tagline that says "must not" carries `must`.
- `## Fit criterion` names what is observed and what counts as met, with the measure and the conditions it is taken under where it is a quantity; "works well" is no criterion.
- `kind` is `quality` where `## Fit criterion` measures how well the product does something rather than whether it does it.
- `## Applies to` names the narrowest subject that carries the requirement: a feature where one feature does, a product where every feature of it does.
- `## Applies to` names a feature, a product or a use case in each row; the grammar reads any type in the Type column, so this is the agent pass's to hold.
- `follows` names a rule only where the requirement exists because of it.
- `## Why` says the need, not the solution.
- `source-id`, on a page drawn from a specification, is the label the specification gives it, so a test that cites the label still finds the page.
- The page holds no priority, status, release or date; each moves, and a References row says where they are kept.
- The page writes names and prose in American English (R14).
