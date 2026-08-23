# CompanyGraph — working conventions

The meta-model for operating a company: core vocabulary, packs, and the conventions that
make a graph of Markdown files checkable. What it is and why lives in
`docs/superpowers/specs/2026-08-23-companygraph-design.md`. **Read that spec before
changing anything here** — it records what was decided and, more usefully, what was
rejected and why.

**Status: design agreed, nothing built.** The spec is the only substantive file.

## The two source repositories are not in this workspace

The first release is an *extraction*, not an invention. Both sources are local, and neither
is reachable from this repo:

| where | what it is |
|---|---|
| `~/git/magic-mental-model` | The working model: a 26-person hospitality platform, 403 files, 225 commits. Has `meta/*-schema.md`, `AGENTS.md`, and ships itself as a loadable agent skill. |
| `~/git/rob-cv` | The second instance: a company of one, 142 commits. `content/profile.yaml`, `skills.yaml`, `experience/*.md`. |

**The core is the union of the two, not one extended to fit the other.** A 26-person
company never had to model a person's background; a company of one was forced to build the
richest one in either repository. Any proposal that reads only `magic-mental-model` will
miss half the vocabulary.

`~/git/magic-mental-model` is a **private company repository**. Its structure informs this
one; its content, file counts, internal rule wording and tooling choices are not ours to
publish. See **Disclosure** below.

## Decisions that are settled

- **Schemas are Markdown, enforced by agents.** Not a stage on the way to JSON Schema — it
  is the working architecture across 403 files, and it is what the talk this comes from
  argues: with the right meta-model you describe the facts as Markdown. A formal schema
  language would contradict the thesis the model ships under.
- **Write the schema tables to a fixed shape** — same columns, same type vocabulary, same
  word for "required" — so a validator can be built against them later without a rewrite.
- **Do not build a validator that parses the Markdown schemas as its source of truth.**
  Rejected in the spec, §5. It makes prose load-bearing before anything enforces the
  prose's shape.
- **Core defines a type; it does not oblige you to populate it.** A company of one has no
  `groups`; the type stays in core, unused.
- **A pack adds vocabulary only some kinds of company need at all** — types that are
  *absent*, not types that are optional.
- **The repo is `meta-model`; `core` is a folder inside it.** The repo says what the
  project is, folders say how it is divided — and `core/` sits beside `packs/`, so a repo
  named `core` would hold non-core things.

## Disclosure

This repository is intended to be open source. It is currently **private**, because the
spec quotes a private company repository — file counts, verbatim internal conventions, and
which issue tracker and MCP servers that company runs on.

**Before this goes public, the spec has to be sanitised**: keep the structural argument,
drop the specifics that belong to someone else. The design does not depend on them — that
two independent instances converged is the claim, and it survives without naming what is
inside either one.

## Process

- Commits happen when the user asks; suggest a message, don't auto-commit.
- Nothing here is built yet. Resist scaffolding folders the spec has not settled — §10
  lists five questions still open, including how skills and experience attach to a profile.
