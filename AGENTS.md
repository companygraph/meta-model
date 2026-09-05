<!-- conventions · v1.3.2 -->
Shared conventions of the robertblust, guestgraph and companygraph organizations live in
`conventions/`, vendored from robertblust/conventions at the release `conventions.json`
names. Read them before writing or committing anything here.

- `conventions/WRITING.md` — how we write: one voice, three registers, English and German.
- `conventions/WORKING.md` — how we work with git and GitHub.
- `conventions/REPOSITORIES.md` — the family: what each repository is and what pins what.

Everything below this block is this repository's own. `sh conventions/conventions-sync check`
says whether the copy matches the release, `sync` brings it to the release the pin names, and
`sh conventions/conventions-check` holds this repository's own Markdown to `WRITING.md`. Edit
a shared file in robertblust/conventions, never here.
<!-- end conventions -->

# CompanyGraph — working conventions

The meta-model for operating a company: core vocabulary, packs, and the conventions that
make a graph of Markdown files checkable. What it is and why lives in
`docs/superpowers/specs/2026-08-23-companygraph-design.md`. **Read that spec before
changing anything here** — it records what was decided and, more usefully, what was
rejected and why.

**Status: first release out** — the person cluster in `core/`, `CONVENTIONS.md`, `example/` and
`verify/check.mjs`. The README's roadmap says what comes next; the spec says why.

## This is an extraction, not an invention

The first release generalizes two models that already work: one describing a multi-person
company, one describing a company of one. Neither knew about the other; both arrived at the
same shape.

**The core is the union of the two, not one extended to fit the other.** A company with a
payroll never had to model a person's background — it keeps a thin file per person and puts
the rest on a website. A company of one was forced to model it properly, and that is where
`profile`, `skill` and `experience` come from. A proposal built by reading only the larger
model will miss half the vocabulary.

Both source repositories are local and **not in this workspace**. Their paths are in
`LOCAL.md`, which is deliberately untracked: one of them is a private company repository,
and this one is public.

## Nothing instance-specific gets published here

This repository is the vendor-neutral meta-model. It does not name the companies it was
extracted from, quote their internal conventions, or describe which issue tracker, wiki or
chat tool they run on.

That is not only confidentiality — it is the design. A meta-model that carries one
company's tooling in its conventions is not a meta-model. The structural claim stands on
its own: two independent instances converged on the same shape, and it survives without
naming what is inside either.

When writing here, describe the *pattern*. "The multi-person instance keeps a thin file per
person" is useful and portable. Naming the company, its file counts or its issue tracker is
neither.

## Decisions that are settled

- **Schemas are Markdown, enforced by agents.** Not a stage on the way to JSON Schema — it
  is the working architecture of a model with several hundred files, and it is what the
  talk this comes from argues: with the right meta-model you describe the facts as
  Markdown. A formal schema language would contradict the thesis the model ships under.
- **Write the schema tables to a fixed shape** — same columns, same type vocabulary, same
  word for "required" — so a validator can be built against them later without a rewrite.
- **Do not build a validator that parses the Markdown schemas as its source of truth.**
  Rejected in the spec, §5. It makes prose load-bearing before anything enforces the
  prose's shape, and it fails silently rather than loudly.
- **Core defines a type; it does not oblige you to populate it.** A company of one has no
  `group`; the type stays in core, unused.
- **A pack adds vocabulary only some kinds of company need at all** — types that are
  *absent*, not types that are optional.
- **The repo is `meta-model`; `core` is a folder inside it.** The repo says what the
  project is, folders say how it is divided — and `core/` sits beside `packs/`, so a repo
  named `core` would hold non-core things.
- Resist scaffolding folders the spec has not settled — §10 still lists open questions, and
  the roadmap adds types one slice at a time. `packs/` does not exist until a pack does.

## Checks

Two jobs, both required by the ruleset on `main`: `verify`, this repository's own suite, and
`conventions`, called from robertblust/conventions at the pinned tag and shown by GitHub as
`conventions / conventions`. The prose check leaves out `.superpowers`, tooling scratch, and
`docs/superpowers`, whose specs and plans quote the very words it scans for. Core's own rule
R14 says what the vocabulary's spelling is; `conventions/WRITING.md` says the same for every
word the family writes, and the two agree. Everything else about how to write and how to
work with git is in `conventions/`.
