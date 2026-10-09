---
id: 01a12186-4ca9-72e8-9e81-17ee888e32f6
---

# Product Kind Schema

> Required structure for product kind files.

## File Location

`model/product-kinds/*.md`

A kind owns nothing and nothing owns it: every product claims one of the same few, and what each kind covers lives here rather than being restated on every product. It sits at the container root beside `products/`, as `question-kinds/` sits beside `questions/`.

The set is the instance's own, as a question kind's is. What a company ships, chocolate, the channels it sells through, what its IT provides to its staff, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever products are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every product references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what sort of thing the products of this kind are |
| `## What it means` | Yes | Who opens a product of this kind, which products belong to it, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a classification, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A kind answers "what sort of thing does this company ship?", the question a reader cannot otherwise ask of a folder that holds a box of pralines, an online shop and the systems behind a store side by side. Its value is that the answer is a reference rather than a word: two products of one kind are the same sort of thing, a surface can draw the products of one kind together, and the chat can say what the company ships from the model rather than from its own reading. A kind holds at least one product; a kind no product names is vocabulary nobody uses, and leaves, once the instance holds a product.

## Writing rules

- `## What it means` says who opens a product of this kind, a customer, a franchisee, the
  company's own staff, since that is the one sentence that tells a channel from the systems
  behind it, and it has nowhere else to live.
- `## What it means` says what the kind excludes as well as what it covers. The boundary
  between a channel and the thing sold through it, or between what IT provides and what the
  business sells, is where every disagreement will be.
- `## What it means` is about the sort of thing, never about how well a product of it does,
  how many there are or what they earn. Those belong to the product, or to nothing in the
  model.
- The H1 names what a product of this kind is, `Channel`, `IT product`, and never the type,
  `Product`, a market or a business unit.
- The page writes names and prose in the model's language (R14), as every page does.
