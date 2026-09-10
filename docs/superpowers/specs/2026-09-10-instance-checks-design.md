# The instance checks ship from here, and read the instance's own core

R16 is called *An instance is held to what its schema declares*. The check that enforces it is
called *the example is held to what the schemas declare*, and `example/` is the only tree it
has ever read. Eight of the fourteen checks in `verify/check.mjs` are that shape: written about
an instance, bound to this repository by a constant, run against twenty-six Markdown files that
were written to pass them.

The reference instance holds one hundred thirty-one Markdown files under `model/` and nothing
mechanical reads them. This spec ships the eight checks from the package so an instance can run
them, and settles the question that makes the move harder than the parser's: **which copy of
core they validate against.**

Status: proposed. Decided on 2026-09-10 against this repository at `main` at 0.19.0, and against
`robertblust/mental-model` at `main`. Every number below was counted. It replaces a draft of
2026-09-04 that was never merged and whose counts no longer hold.

---

## What is true today, measured

`npm run verify` reports fourteen checks. Eight of them read the content tree — `EX`, which
`verify/check.mjs:65` defines as `example/${MODEL}` — and six read only `core/`.

| Reads a content tree, and moves | Asserts about core itself, and stays |
|---|---|
| example structure | schemas exist |
| example references | schema fixed shape |
| the example is held to what the schemas declare | type vocabulary |
| frontmatter fields are declared | ownership declared |
| list fields are block sequences | release manifest |
| required frontmatter fields are present | rules are written down |
| date fields carry a date in one of the three forms | |
| filenames derive, or take the form their schema states | |

The split is not a judgment. A check moves if it reads a content tree, and the eighth mover
arrived on 2026-09-08 with R16 — which is the rule most obviously written about somebody else's
repository and the one most obviously checked only here.

The six that stay assert that this repository's schema files hold the shape R9 states, that no
schema types a field outside the vocabulary, that the manifest matches what ships, and that
every check names a rule the prose still contains. An instance vendors core and may not edit
it, so an instance running them would check bytes it is forbidden to change.

The moved eight keep running against `example/`, called from the package with this
repository's own root. That is the point of the split rather than a concession to it: the code
an instance depends on is exercised here on every commit, not only downstream.

## Where the checker lives

Two alternatives were already answered, and only one of the answers still stands.

**The design package stays rejected**, on the reasoning the instance parser spec gave on
2026-09-02: that package is "type, colour, chrome and shared checks", and a conventions checker
sits nearer that boundary than a parser does, not further. It cites rule numbers by name; the
rules are `core/CONVENTIONS.md`, in this repository.

**The tooling repository's claim is amended.** §6 of `2026-08-25-companygraph-tooling-design.md`
put the shared reader in `companygraph/tooling` and had this repository vendor it byte-identical
with a hash check, so that `tooling check` checked an instance and `verify/check.mjs` checked
this repository on top of the same file. **The flow reverses: the reader lives here, and
`tooling check` takes it from here when it is built.** Three facts decided that, all of them
later than the spec being amended. `companygraph/tooling` does not exist, while the instance is
published, pinned by a site and unchecked today. The parser settled the direction on 2026-09-02
by moving into this repository rather than waiting for tooling, and it has a consumer: blust.ch
carries `"companygraph-meta-model": "github:companygraph/meta-model#v0.19.0"` in
`devDependencies` and imports `parseInstance` from it. And a CLI is a way to run a check, not
the thing that decides what a rule means; nothing in §6's boundary — the three R9 tables read by
position, a schema off the fixed shape refused rather than read leniently, no value typed and no
judgment made — depends on which repository the reader ships from.

## The root is a parameter, and so is core

`ROOT` is computed from `import.meta.url` and `EX` from `ROOT`; `fieldsOf` reads
`core/<type>-schema.md` under the same root. All three become arguments, for the reason the
design package documents against itself: "`REPO_ROOT` belongs to the site, and `root` is always
a parameter here. A package module that works out where it is resolves inside `node_modules`;
that shipped once already, as `SITE_ROOT` in `verify/design.mjs`, and cost a release to undo."

The second half is new, and it is the central decision of this spec. **The checker reads the
schemas from the instance's own vendored `meta/`, never from the package's `core/`.**

An instance sits on a version of core and stays there; `.companygraph/manifest.json` records
which release, and a hash per file. If the checker validated against the core bundled with the
package, a package upgrade would silently re-validate an instance against rules it never
adopted — a field added upstream becoming required in a repository that pinned the release
before it, and a green instance turning red for a change it did not make. In the other
direction, a rule relaxed upstream would stop being enforced in an instance still claiming the
stricter release.

So the package ships the algorithm, and the instance supplies the content and the rules both.
That inverts what a validator library usually does, and it is the only arrangement under which
"an instance sits on a version of core" survives contact with tooling.

## Version skew, and the slot the manifest reserves

This repository has one version number: `package.json` and `core/manifest.json` both read
0.19.0, and they move together. Skew is therefore not between two release streams but between
two pins in the same instance — the core it vendored and the release its workflow calls.

Today those agree. `robertblust/mental-model` vendors core 0.19.0 at shape 2, which is this
repository's current release, so the skew is zero and every check would run. That is the
argument for settling the contract now rather than at the first upgrade that opens a gap.

The manifest already carries the slot:

```jsonc
{
  "tooling": "0.0.0",        // never written by anything, in any instance
  "core": { "version": "0.19.0", "shape": 2, "source": "fetched:v0.19.0" },
  "units": "meta"
}
```

The checker reads `core.version` before it runs. Where a check exists for a rule the vendored
core predates, it is **skipped and named** — never silently, and never as a failure. That is the
contract the agent pass already ends on: a report says what it did not check, so a clean report
is never read as more than it is.

`tooling` names the release the instance's workflow calls, and it is written by the same
editorial act that moves the workflow's tag line, because the family's rule is that everything
one repository takes from another is pinned by a visible line in the taking repository. Two
lines, one decision, and the workflow guards that they agree.

## What the instance side needs

Two of the three gaps a reader would expect are already closed, by work that landed after the
draft this replaces. `robertblust/mental-model` has carried `protect-main` since 2026-09-05 —
deletion, non-fast-forward, a pull request and one required status check — and a
`conventions.yml` calling `robertblust/conventions/.github/workflows/check.yml` at its pinned
tag. What that job holds is the vendored copy against its release and the repository's own
Markdown against `WRITING.md`: American spelling and the spaced em-dash. It reads no
frontmatter and resolves no reference. R0 through R17 are enforced there by an agent
remembering to run a skill.

What is still missing is only the check itself, and the instance has no `package.json`, no
lockfile and no build step to hang one on. **It gets a reusable workflow rather than a package
manifest.** This repository publishes `.github/workflows/instance-check.yml`; an instance calls
it at a tag, exactly as every member calls the conventions job, and holds one file and one pin.
Nothing is installed: the workflow checks out the caller, checks out this repository at the
release it declares, and runs the checker, which has no dependencies — the same reason the CI
here has no install step.

That also answers the question the draft left hardest. A maintainer with no Node still gets the
gate, because nothing runs locally; the local pass stays the agent's, which is what R0 asks for
anyway.

The guard is the conventions guard, and it is needed for the same mechanical reason: the runner
exposes nothing about the called workflow to its steps, so it cannot see how the caller spelled
the ref. The workflow declares its own release, compares it with `tooling` in the manifest, and
fails when they differ.

One trap, restated because it is silent: **a ruleset requires a status check by its job id, not
by the workflow's name.** The required contexts here are `verify` and `conventions /
conventions`; the instance's ruleset requires `conventions / conventions` alone and will require
the new job beside it. Rename a job and the branch still looks protected while nothing ever
reports again.

## What this is not

- **Not the validator §5 defers.** The exported checker inherits the claim `verify/check.mjs`
  makes in its own header: it never reads a schema as truth about somebody's instance beyond the
  fixed shape R9 guarantees. A validator that parses Markdown schemas as its source of truth
  makes prose load-bearing before anything enforces the prose's shape, and that rejection
  stands.
- **Not a replacement for the agent pass.** `companygraph-validate` ends by judging every entity
  against its schema's `## Writing rules`, and says of that step: *"Nothing mechanical reaches
  these."* A machine can check that an evidence cell's reference resolves; it cannot check that
  the cell states a fact rather than restating the level. A green workflow must not be named or
  described as though it covered both.
- **Not a runtime dependency.** An instance is Markdown served from a repository tree. The
  checker runs in CI and in a developer's shell, and an instance that takes it as a package
  rather than as a workflow takes it as a devDependency.

## Success criteria

- The eight checks run unchanged against `example/` from the package, on every commit here, and
  `npm run verify` still reports fourteen.
- `robertblust/mental-model` runs the same eight against its one hundred thirty-one files,
  reading its own vendored `meta/`, with no `package.json` added.
- Calling a release newer than an instance's vendored core changes no verdict except to skip, by
  name, the checks that core predates.
- Editing a rule in `core/CONVENTIONS.md` and releasing turns an instance red only when that
  instance takes the new core, not when it takes the new release.
- The workflow's guard is proven red by pointing a caller at a release its manifest does not
  name. A gate never seen to fail is not yet a gate.
- A reader of a green workflow can tell from its name what it did not check.

## Open questions

- **Packs.** `units` names `meta`, and `core` is the only unit any instance has. How the checker
  learns a pack's types, when the type list is a constant in this file, is not designed here and
  waits for the first pack.
- **Reproducing a red check.** The route above puts the only mechanical check in CI. A
  maintainer who cannot run Node reads a failure and cannot re-run it after a fix except by
  pushing again, which is a slow loop and may be the wrong trade.
- **What `tooling check` becomes.** The amendment says it takes the reader from here. Whether it
  wraps this checker, or is a different program with its own output, belongs to the tooling
  spec and is not settled by this one.
