# The instance parser moves here

`build/instance.mjs` — the parser that turns an instance into a graph — is copied byte for byte
into `blust.ch` and `companygraph.io`. It implements this repository's conventions, so it moves
into this repository, and the two sites import it from a released tag.

## Why here, and not into the design package

The parser reads the fixed shape and nothing else, and every judgement it makes cites a rule by
number: R2 and R3 keep a repository folder out of a path, R4 makes a name that resolves to
nothing an error, R5 and R6 make ownership nesting on disk, R7 singularises a folder into a
type, R9 and R13 govern the container. Those rules are defined in `core/CONVENTIONS.md`, in
this repository.

Today the rules live here and their implementation lives in two other repositories, connected
by nothing. A rule change here leaves both parsers quietly wrong; the parser cites eight rule
numbers it cannot see.

`@robertblust/design` was the expedient alternative — its release process, tag discipline and
Dependabot tripwire already work, and both sites already pin it. It was rejected because that
package is type, colour, chrome and shared checks. An instance parser is a different domain,
and putting it there would make "design" mean "shared code", which dissolves the one boundary
the whole shared-system programme rests on.

## What moves, and what does not

**Moves:** `build/instance.mjs` — 297 lines, four exports (`ROOT_LABEL`, `CORE_LABEL`,
`parseInstance`, `parseSchemas`), byte-identical in both sites — and 21 of the 22 tests in
`verify/instance.test.mjs`.

**Does not move: the 22nd test.** `verify/instance.test.mjs` is not purely the parser's tests.
Its last test asserts that the vendored `d3.v7.min.js` is byte-identical to
`node_modules/d3/dist/d3.min.js`. That is site infrastructure, not a claim about the parser,
and it must not follow the parser into this repository, which has no d3 and no stage.

The two copies of that test are byte-identical and **do different things**:

- On **companygraph.io** it is live and load-bearing. d3 is a real devDependency there and the
  vendored copy is the deliverable — the pages load `../d3.v7.min.js`, not the package — so a
  Dependabot d3 bump lands red on purpose, which is the correct signal.
- On **blust.ch** it is **permanently skipped**. That site declares no `d3` dependency, so
  `node_modules/d3` never exists and the test's own `t.skip` fires on every run, on every
  machine, forever. The suite reads 21 passed, 1 skipped.

blust.ch is not exposed by this: it takes the `stage` group, so `design:check` asserts its
vendored `d3.v7.min.js` against the package's `assets/d3.v7.min.js`. Its d3 is checked — by a
different mechanism, against a different reference. The skipped test adds nothing there.

So the test moves **into companygraph.io's own file** and is **deleted from blust.ch**. Keeping
an inert copy on blust.ch is how a test that cannot fail survives a consolidation, and this
family has already shipped three of those.

Note the two d3 assertions are genuinely different and both are wanted on companygraph:
`design:check` catches the vendored copy drifting from the **package's**; the test catches it
drifting from **`node_modules/d3`**, which is what a Dependabot bump moves.

## What this repository becomes

A consumable package, for the first time. It is already public and already carries a
`protect-main` ruleset, so the gap is small:

```jsonc
{
  "name": "companygraph-meta-model",
  "version": "0.1.0",              // from 0.0.0
  "type": "module",
  "engines": { "node": ">=22" },
  "files": ["lib"],
  "exports": { "./instance": "./lib/instance.mjs" },
  "scripts": {
    "verify": "node verify/check.mjs",
    "test:instance": "node --test verify/instance.test.mjs",
    "test:rules": "node --test verify/rule-citations.test.mjs"
  }
}
```

`"private": true` goes. It blocks nothing about a git install, but it states the opposite of
what this repository now is.

`files` ships `lib` and nothing else. `core/` is deliberately excluded: the sites read
`core/` and `example/` over the GitHub API, not from `node_modules`, and shipping bytes nobody
imports is how a package grows a surface it did not mean to have. `core/` joins `files` on the
day the data pin moves to the package — see *Deferred*.

**The name stays `companygraph-meta-model`, unscoped**, unlike `@robertblust/design`. Renaming
it is a separate change with its own blast radius, and the name is not load-bearing for a git
dependency.

CI here has no install step today, on the stated grounds that `verify/check.mjs` has no
dependencies and there is no lockfile — `npm ci` would fail rather than pass emptily. That
stays true: the parser is pure, no filesystem and no network, and its tests feed it fixture
maps. `test:instance` joins the workflow with no install step of its own.

## The tripwire that justifies the move

Once the rules and their implementation share a repository, the link between them can be
asserted instead of assumed:

**Every rule number the parser cites must be defined in `core/CONVENTIONS.md`.**

The parser cites R2, R3, R4, R5, R6, R7, R9 and R13. `CONVENTIONS.md` defines R0 through R13.
So the test passes the day it is written — and fails the day somebody renumbers a rule,
deletes one, or writes a citation for a rule that never existed. That failure is currently
unobservable in any repository.

This is the reason to move the parser here rather than anywhere else. Without it the move is
only deduplication; with it, the parser stops being able to drift from its own specification
in silence.

## What each site keeps

`build/instance.mjs` is deleted. `build/model.mjs` on blust.ch and `build/build.mjs` on
companygraph.io each change one import:

```js
import { parseInstance } from "companygraph-meta-model/instance";
```

`verify/instance.test.mjs` is deleted from blust.ch outright. On companygraph.io it is replaced
by a small file holding only the d3 vendoring test, under a name that says what it is —
`verify/d3-vendoring.test.mjs` — with its `test:example` script renamed to match. A file called
`instance.test.mjs` that tests d3 is how the Dependabot comment in that repository came to
describe the wrong file.

Each site pins an exact tag: `"companygraph-meta-model": "github:companygraph/meta-model#v0.1.0"`,
never a SHA, never a `#semver:` range. Each gains a Dependabot group for it, so a meta-model
bump arrives on its own and is read rather than merged on sight.

## Deferred, and recorded so it is not lost

**Both sites pin meta-model's *data* by commit SHA.** `build/model.mjs` and `build/build.mjs`
fetch `core/` and `example/` from the GitHub API at a pinned commit. The house rule is a tag
and never a SHA, precisely because Dependabot's version detection rejects a SHA — so a change
here reaches both sites today with **no tripwire at all**. That is the larger half of this gap
and it is out of scope: it changes how both sites *build their pages*, so a mistake shows up
as wrong page content rather than a failed import, and it needs its own proof that generated
output is byte-identical. It gets its own pass, and `core/` joins `files` when it happens.

## Success criteria

1. **Both sites generate byte-identical output.** `npm run model:check` on blust.ch and
   `npm run example:check` on companygraph.io pass, and no generated page changes in either
   repository. Verified by `git status`, not by the check alone.
2. This repository publishes **v0.1.0** as a tag and a GitHub Release with notes.
3. **The rule-number tripwire exists and is proven red** — by adding a citation for a rule that
   does not exist, and separately by removing a rule from `CONVENTIONS.md`. A gate never seen
   to fail is not yet a gate.
4. The 21 parser tests run in this repository's CI, with no install step added.
5. The d3 vendoring test still runs on companygraph.io and still fails when the vendored copy
   and `node_modules/d3` differ — proven by making them differ. It is gone from blust.ch.
6. `npm run dupes` reports **0 duplicated lines** for `build/instance.mjs` and
   `verify/instance.test.mjs`, from 550.
7. This repository still has zero dependencies, and `verify/check.mjs` is untouched.
8. Both sites pin an exact tag and carry a Dependabot group for it.
