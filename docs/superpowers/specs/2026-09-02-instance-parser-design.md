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
`verify/instance.test.mjs`. Three of those four exports survive the move; see *The root label
does not survive the move*.

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
  "version": "0.5.0",              // from 0.0.0 — see On the version number
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

**On the version number.** This said 0.1.0 while it was a plan, and 0.1.0 could not be
tagged: `v0.1.0` already exists here as core 0.1.0, *the person cluster*, on a commit with no
`lib/` in it. The `vX.Y.Z` line belongs to `core/manifest.json`, and `verify/check.mjs`
enforces that a `v*` tag on HEAD matches it — so the package joins that line rather than
opening a second one, and `core/manifest.json` goes to 0.5.0 with it. `core/` is unchanged in
content at this version: the same vocabulary as 0.4.1, `shape` still 1. A prefixed namespace
like `pkg-v0.1.0` would keep the two apart and was rejected because Dependabot's version
detection would have to be proven to read it first — which is the failure the tag-never-a-SHA
house rule exists to prevent.

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

## The root label does not survive the move

`ROOT_LABEL = "Fictional Company"` is a fallback: the root of an instance is its `identity`
entity's H1, and this string is what `parseInstance` returns when there is no such entity.

It is dead in both live instances. `mental-model/model/identity.md` has the H1 `Robert Blust`
and `example/model/identity.md` has `Beacon Systems`, so both generated pages already carry a
real name — `"root":"Robert Blust"` and `"root":"Beacon Systems"`. Nothing outside the parser
and its own test imports the constant in any of the three repositories.

**An instance without an identity is not a valid instance.** `identity` is a singular type:
its schema says a company has one, R6 says a type with exactly one entity is a file directly
in the container, and `verify/check.mjs` fails with `identity.md is missing — a singular
type's entity`. So the fallback exists for a shape the conventions do not permit.

The parser is deliberately not the validator, so it will be handed invalid instances. The
question is what it should do with one, and everywhere else in the file it already answers:
a name that resolves to nothing throws R4, a folder that is not a plural throws R7, a name
carried by two types throws rather than guessing. A missing container root is the one
malformation it papers over, and it papers over it with a plausible-looking company name.

That silence is reachable. `robertblust/mental-model` has no CI and no `verify/` — its
`meta/core/` is a vendored copy for reading, and nothing executes `check.mjs` against it —
and blust.ch's `ci.yml` does not run `model:check`. Renaming or deleting `model/identity.md`
would publish a graph whose root node reads **Fictional Company** over Robert Blust's mental
model, and no gate in any of the three repositories would notice.

So the fallback goes and the parser throws, in the register of the errors it already raises:

```js
const identity = entities.find((e) => e.type === "identity");
if (!identity) throw new Error("R6: the instance has no identity entity to be its root");
```

`ROOT_LABEL` is deleted rather than kept unexported — an unreachable branch's constant has no
reader. The published surface of `companygraph-meta-model/instance` becomes `parseInstance`,
`parseSchemas` and `CORE_LABEL`. `CORE_LABEL` stays exported and stays a constant: it is not
a fallback for a missing thing but the name of a thing that has no file, since nothing in
`core/` names the vocabulary itself.

Neither live instance changes: both resolve through `identity` today, so both pages are
byte-identical across this change. That is what makes it safe to do now rather than after the
sites adopt — and doing it now is what keeps a constant naming the fictional example out of
v0.5.0's published surface, where removing it later would be a breaking change.

The test moves with it. `the root label is the one invented string` asserted the literal
`"Fictional Company"`, which is the assertion that made the fallback look load-bearing; it is
replaced by one that asserts the behaviour — an instance with an identity roots at its H1, an
instance without one throws.

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

Each site pins an exact tag: `"companygraph-meta-model": "github:companygraph/meta-model#v0.5.0"`,
never a SHA, never a `#semver:` range. Each gains a Dependabot group for it, so a meta-model
bump arrives on its own and is read rather than merged on sight.

That rule is about **this npm dependency** and nothing else. The commit SHA each site carries
in `source.json` is a different mechanism answering a different question — see *Deliberate,
not deferred* below before touching it.

## Deliberate, not deferred

An earlier draft of this section called the model pins "the larger half of this gap" and put
them down for a later pass. That was wrong twice over, and the correction matters more than
the original claim, because a reader of a plan goes and fixes what the plan calls a gap.

**First, the fact.** Only one site pins *this repository's* data. `companygraph.io/source.json`
names `companygraph/meta-model` at a commit; `blust.ch/source.json` names
`robertblust/mental-model` at a commit. blust.ch's only reference to this repository is the
package pin above, and that one is a tag.

**Second, the intent. A SHA in `source.json` is a person's decision, not a stale pin.** It says
*this* state of the model is what the page publishes. Moving it is an editorial act — it
changes what a visitor reads — and it is made by someone who has looked at what changed, which
is exactly what happened when blust.ch's pin moved to pick up a corrected chronology. Handing
that to Dependabot would be a machine editing published content on a weekly schedule.

The house rule — *a tag, never a SHA, because Dependabot's version detection rejects a SHA* —
governs **npm dependencies**, where the goal is to be told that an upstream release exists.
These are not npm dependencies: they are API fetches, with no `package.json` line to bump even
if they were tagged. Applying the rule here reads the words and misses what the rule is for.

So `core/` does **not** join `files` on a later pass. It stays outside the tarball because the
sites read it over the API or vendor it, which is the same reason given above.

**And the vendored copy is a third case, also deliberate.** `robertblust/mental-model` carries
`meta/core/` and declares it in `.companygraph/manifest.json`:

```json
{ "tooling": "0.0.0",
  "core": { "version": "0.4.1", "shape": 1, "source": "fetched:v0.4.1" },
  "files": { "meta/core/CONVENTIONS.md": "sha256:8c2f34c7…", … } }
```

An instance is built on a **version** of core and sits on it. A version number behind this
repository's `core/` is the design working, not decay — and the copy is hash-pinned per file,
so what it holds is checkable today. The `tooling` slot is the open question, and it is an
open question on purpose: whether what reads this manifest ends up being an mjs check, a
GitHub mechanism or Dependabot is settled when that tooling is built, not now.

## Success criteria

1. **Both sites generate byte-identical output.** `npm run model:check` on blust.ch and
   `npm run example:check` on companygraph.io pass, and no generated page changes in either
   repository. Verified by `git status`, not by the check alone.
2. This repository publishes **v0.5.0** as a tag and a GitHub Release with notes.
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
9. **`ROOT_LABEL` is gone and an identity-less instance throws** — proven by parsing a fixture
   with no `identity.md` and seeing the R6 error, and by `grep` finding no `ROOT_LABEL` in
   any of the three repositories. The published surface is `parseInstance`, `parseSchemas`
   and `CORE_LABEL`.
10. **Both generated pages are byte-identical across this change**, which is what makes it a
    safe thing to do before the sites adopt rather than after.
