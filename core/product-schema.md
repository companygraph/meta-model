---
id: 01a0c231-9ef8-7add-8875-3ed58850ec6e
---

# Product Schema

> Required structure for product files.

## File Location

`model/products/*.md`

A product owns nothing, so it is a file. Nothing owns a product either, and it lists no features: a feature names the products it is assembled into, and the edge is written once, on the side that can hold several. A product names the domain it belongs to, as a concept does, and sits in the container rather than inside that domain for the same reason.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `domain` | Yes | ref → domain | The area of the company this product belongs to — the H1 of a file in `domains/` |
| `kind` | Yes | ref → product-kind | What sort of thing this product is, the H1 of a file in `product-kinds/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Product]` | Yes | The canonical name of the product. A feature's `products` references this exact string. |
| `> [What it is]` | Yes | One-paragraph statement of what the product is and who opens it |
| `## References` | No | Table. What a reader can open to learn more about the product; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — documentation, a release page |
| `URL` | Yes | string | Where it is |

## Purpose

A product is something the company ships that somebody uses on its own, and it answers "what does this company actually put in front of people?" for a reader who has met its values, its strategy and its processes and still cannot name its output. It is not the market it serves, the project that built it or the revenue it earns.

## Writing rules

- The tagline names what the product is and who opens it, in that order, and claims nothing about how well it does either.
- The H1 names the product as the people who use it name it, not as its repository or its internal project is named.
- `domain` names the one domain whose concepts the product's users came to it for. A product that works across two still names one, and the concepts its features name show the rest.
- The page says nothing about a release, a version or a roadmap: a product outlives all three.
- `kind` is the one a reader looking for this product would look under first; a product that
  seems to need two is two products, or sits where most readers would look for it.
