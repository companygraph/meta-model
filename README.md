# CompanyGraph

> A meta-model for operating a company: a blueprint you instantiate, published open source.

CompanyGraph is the structure a company's own knowledge takes so that both people and
agents can rely on it — types, schemas, and the conventions that make a graph of Markdown
files checkable.

It is not invented. It is the generalisation of a model that already works in two places
that never knew about each other: a multi-person company, and a company of one. Both
arrived at the same shape — one Markdown file per entity, YAML frontmatter and a
Markdown body, in a folder named for its type, with a separate folder of schemas defining
the structure. This repository is that shape, extracted, with the company-specific parts
named as such.

**Status:** design agreed, nothing built yet.
See [`docs/superpowers/specs/2026-08-23-companygraph-design.md`](docs/superpowers/specs/2026-08-23-companygraph-design.md).
