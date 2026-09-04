# The instance checks move here, and read the instance's own core

`verify/check.mjs` enforces thirteen checks against `example/`. Seven of them are not about
`example/` at all — they are about *an instance*, any instance, and they are the only
mechanical enforcement R1-R15 has anywhere. They are bound to this repository by a constant.

The reference instance is published, pinned by a site, and has no CI, no branch protection
and no `package.json`. Its only check is an agent remembering to run a skill before
committing. This spec moves the seven checks into the package so an instance can run them,
and settles the one question that makes the move harder than the parser's: **which copy of
core they validate against.**

## Why here, and not into the design package

The instance parser answered this in `2026-09-02-instance-parser-design.md`, and the answer
carries without amendment:

> `@robertblust/design` was the expedient alternative — its release process, tag discipline
> and Dependabot tripwire already work, and both sites already pin it. It was rejected
> because that package is type, colour, chrome and shared checks. An instance parser is a
> different domain, and putting it there would make "design" mean "shared code", which
> dissolves the one boundary the whole shared-system programme rests on.

A conventions checker is nearer to that boundary than the parser was, not further. It cites
rule numbers by name; the rules are `core/CONVENTIONS.md`, in this repository. Rules in one
repository and their enforcement in another, connected by nothing, is the condition that
spec moved the parser to fix, and it holds here with one more repository in the gap.

## What moves, and what stays

`verify/check.mjs` runs thirteen named checks. They divide cleanly, and the division is not
a judgment call — it is whether the check reads `example/`.

**Move (seven).** `example structure`, `example references`, `frontmatter fields are
declared`, `list fields are block sequences`, `required frontmatter fields are present`,
`date fields carry a date in one of the three forms`, `filenames derive, or take the form
their schema states`. Each of these reads a content tree and the schemas describing it.
Neither is specific to this repository; both are supplied.

**Stay (six).** `schemas exist`, `schema fixed shape`, `type vocabulary`, `ownership
declared`, `release manifest`, `rules are written down`. These are assertions about *core
itself* — that its schema files hold the fixed shape R9 states, that no schema types a field
outside the vocabulary, that the manifest matches what ships, that every check names a rule
the prose still contains. An instance vendors core and does not edit it, so an instance
running them would be checking bytes it is forbidden to change. They stay, and they keep
running against `example/`'s schemas as they do today.

The moved seven keep running against `example/` too. That is the point of the split, not a
concession to it: `verify/check.mjs` becomes the first consumer of the exported checker,
called with this repository's own root, so the code an instance depends on is exercised on
every commit here rather than only downstream.

## The root is a parameter, and so is core

The parser spec states half of this and paid for it once:

> **`REPO_ROOT` belongs to the site, and `root` is always a parameter here.** A package
> module that works out where it is resolves inside `node_modules`; that shipped once
> already, as `SITE_ROOT` in `verify/design.mjs`, and cost a release to undo.

The checker takes the same treatment. `ROOT` and `EX` are computed from `import.meta.url`
today; both become arguments.

The other half is new and matters more. **The checker reads the schemas from the instance's
own vendored `meta/`, never from the package's `core/`.**

This looks like an implementation detail and is the central decision of this spec. An
instance sits on a version of core and stays there — `.companygraph/manifest.json` records
which release, and a hash per file. If the checker validated against the core bundled with
the package, then a package upgrade would silently re-validate an instance against rules it
never adopted: a field added in a later schema becomes "required" in a repository that
pinned the release before it, and a green instance turns red for a change it did not make.
Worse in the other direction, a rule *relaxed* upstream would stop being enforced in an
instance still claiming the stricter release.

So the package ships the algorithm. The instance supplies the content **and** the rules.
That inverts the usual expectation of a validator library and is the only arrangement under
which "an instance sits on a version of core" survives contact with tooling.

## Version skew, and the slot already reserved for it

The checker's code can still be newer than the core it reads. A check added to the package
for a rule introduced in core 0.14 will run against an instance vendoring 0.13, find the
rule's schema support absent, and either fail wrongly or pass vacuously — and vacuous is the
dangerous one.

`.companygraph/manifest.json` already carries the field this needs:

```jsonc
{
  "tooling": "0.0.0",        // never set by anything
  "core": { "version": "0.13.0", "shape": 1, "source": "fetched:v0.13.0" }
}
```

`tooling` is an empty slot in every instance today. The checker fills it, and reads
`core.version` before it runs. Where a check exists for a rule the vendored core predates,
it is **skipped and named** — not silently, and not as a failure. That is the same contract
the agent pass ends on: a report says what it did not check, so a clean report is never read
as more than it is.

## What this is not

- **It is not the validator the design defers.** `verify/check.mjs` says so in its own
  header, and the exported checker inherits the claim: it never reads a schema as truth
  about somebody's instance beyond the fixed shape R9 already guarantees. Spec §5's
  rejection stands — a validator that parses Markdown schemas as its source of truth makes
  prose load-bearing before anything enforces the prose's shape.
- **It does not replace the agent pass.** The `companygraph-validate` procedure ends by
  reading each schema's `## Writing rules` and judging every entity against them, and says
  of that step: *"Nothing mechanical reaches these."* A machine can check that an evidence
  cell's skill resolves. It cannot check that the cell states a fact rather than restating
  the level. CI covers the mechanical rules; the agent pass covers the rest; a green
  workflow must not be named or described as though it covered both.
- **It does not make an instance depend on this package at runtime.** An instance is
  Markdown served from a repository tree. The checker is a devDependency that CI and a
  developer run, which is the same rule the sites already apply to everything they import
  rather than vendor.

## What an instance gains

The reference instance has no `package.json`, no `node_modules` and no workflow. It gets
all three, and the addition is a real change to a repository that is currently pure Markdown
with no build step. The rule that decides it is the one the family already states: if only
CI runs it, it is imported from the package.

It also has **no ruleset and no branch protection** — `[]` from the rulesets API, 404 from
the protection endpoint — while this repository and all three sites carry `protect-main`.
That is the larger gap of the two, and a workflow without it is a check nothing requires.

One trap on the way, already documented in the family and worth restating because it is
silent: **a ruleset names the job id, not the workflow name.** The sites' job is `verify`;
this repository's is `test`. Rename the job and the branch still looks protected while
nothing ever reports again, which blocks every merge and hides the missing gate behind it.

## Success criteria

- The seven checks run unchanged against `example/` from the package, on every commit here.
- An instance runs the same seven against its own tree, reading its own vendored `meta/`.
- Pinning a package release newer than an instance's vendored core changes no verdict except
  to skip, by name, checks the vendored core predates.
- Editing a rule in `core/CONVENTIONS.md` and releasing turns an instance red only when that
  instance takes the new core, not when it takes the new package.
- A reader of a green workflow can tell from its name what it did not check.

## Open questions

- **Where does the instance's content root come from?** R13 says an instance's content lives
  in one container; the reference instance calls it `model/` and `example/` calls it
  `example/model/`. Whether the checker takes the container as a second argument or derives
  it from the manifest's `units` is not settled.
- **Does `tooling` get written by the checker or by a sync tool?** The field exists for a
  tooling version, and no tooling writes it today. This spec claims the slot without
  claiming which process fills it.
- **What runs the checks in an instance with no Node?** A pure-Markdown instance maintained
  by someone with no npm is the case this design makes hardest, and it is not addressed. A
  container image or a GitHub Action wrapping the package would answer it; neither is
  designed here.
