# Product Schema

> Required structure for product files.

## File Location

`model/products/*.md`

A product owns nothing, so it is a file. Nothing owns a product either, and it lists no features: a feature names the products it is assembled into, and the edge is written once, on the side that can hold several. A product names the domain it belongs to, as a concept does, and sits in the container rather than inside that domain for the same reason.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `domain` | Yes | ref → domain | The area of the company this product belongs to — the H1 of a file in `domains/` |
| `audience` | No | string | Free-text grouping, e.g. `Staff`. Whether an audience becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Product]` | Yes | The canonical name of the product. A feature's `products` references this exact string. |
| `> [What it is]` | Yes | One-paragraph statement of what the product is and who opens it |

## Purpose

A product is something the company ships that somebody uses on its own, and it answers "what does this company actually put in front of people?" for a reader who has met its values, its strategy and its processes and still cannot name its output. It is not the market it serves, the project that built it or the revenue it earns.

## Writing rules

- The tagline names what the product is and who opens it, in that order, and claims nothing about how well it does either.
- A product is named as the people who use it name it, not as its repository or its internal project is named.
- Two names for one thing a user opens are one product, and the second name is not a second product; where a concept of the same name exists, the second name is recorded there as an alias.
- A product names one domain, the one whose concepts its users came to it for. A product that works across two still names one, and the concepts its features name show the rest.
- Nothing about a release, a version or a roadmap goes here: a product outlives all three.
