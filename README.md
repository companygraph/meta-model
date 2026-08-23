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

## What is here

```
core/              one schema per type: profile, experience, skill,
                   proficiency-level, value
CONVENTIONS.md     the portable rules that make the graph checkable
example/           a fictional company, described in those five types
verify/check.mjs   npm run verify — asserts this repo's own shape
```

## Instantiating it

Copy the schemas from `core/` into a `meta/` folder in a repository of your own and take
`CONVENTIONS.md` with them. Create the folders the schemas name, and write one file per entity.
The schemas are the contract; `CONVENTIONS.md` is what an agent checks the result against, so
the two travel together. `example/` is there to be read, not copied.

## Packs

Core is the vocabulary any company can be described in. A **pack** adds vocabulary that only
some kinds of company need *at all* — types that are absent rather than optional. A company
that builds a product has features, architecture decisions and roadmaps; a consultancy has
none of those and should not carry empty folders implying it forgot.

That is the difference between a pack and an unused core type. Core defines a type without
obliging you to populate it: a company of one has no `group`, and the type stays in core,
unused. A pack is for vocabulary that would not belong at all.

No pack ships yet. The mechanism arrives when a second kind of company asks for it.

## Status

The first release describes **one person completely** rather than thirteen types partially —
`profile`, `experience`, `skill`, `proficiency-level` and `value`, plus the conventions. The
remaining core types are named in the design and not yet written, no pack ships yet, and there
is no validator beyond `npm run verify`, which checks this repository rather than yours.

See [`docs/superpowers/specs/2026-08-23-companygraph-design.md`](docs/superpowers/specs/2026-08-23-companygraph-design.md).
