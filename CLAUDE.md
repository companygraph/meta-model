# CompanyGraph — working conventions

The meta-model for operating a company: core vocabulary, packs, and the conventions that
make a graph of Markdown files checkable. What it is and why lives in
`docs/superpowers/specs/2026-08-23-companygraph-design.md`. **Read that spec before
changing anything here** — it records what was decided and, more usefully, what was
rejected and why.

**Status: design agreed, nothing built.** The spec is the only substantive file.

## This is an extraction, not an invention

The first release generalises two models that already work: one describing a multi-person
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

## Process

- Commits happen when the user asks; suggest a message, don't auto-commit.
- **Merge a pull request with a merge commit — `gh pr merge --merge`, never `--squash`.**
  Squashing is not a history preference here. GitHub *re-authors* a squash commit to the
  account that pressed the button, so a commit made locally under the wrong `user.email`
  lands on the default branch looking correct. That is not hypothetical: it was found in
  `robertblust.github.io`, where the local commit was authored `rob@likemagic.tech` and the
  commit that reached `main` read `robert.blust@flatland.ch`, with nothing anywhere saying
  so. A merge commit preserves the author it was given, which is the point — a wrong
  identity surfaces instead of being laundered.
- **The author is `robert.blust@flatland.ch`, and nothing on GitHub enforces it.** The
  ruleset rule that would — `commit_author_email_pattern`, a metadata restriction — is
  rejected on this plan. Tested, not assumed: an otherwise identical ruleset carrying a
  `deletion` rule was accepted in the same breath. So the identity comes from
  `~/.gitconfig`, where three `includeIf` blocks key it to `~/git/robertblust/`,
  `~/git/guestgraph/` and `~/git/companygraph/` and point at `~/.gitconfig-flatland`. The
  global default stays `rob@likemagic.tech`, which is right for `~/git/likemagic-tech` and
  `~/git/3ap-ag`. A clone made outside those three directories gets the global default and
  no warning, so check `git config user.email` before the first commit in a fresh clone.
- Nothing here is built yet. Resist scaffolding folders the spec has not settled — §10 still
  lists seven open questions, and §9 deliberately limits the first release to four types.
