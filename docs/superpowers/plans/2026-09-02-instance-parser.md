# Instance Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `build/instance.mjs` and 21 of its 22 tests into `companygraph/meta-model`, make
that repository a consumable package, and bind the parser to the conventions it implements with
a test that fails when a cited rule stops existing.

**Architecture:** meta-model gains `lib/instance.mjs` and `verify/instance.test.mjs`, an
`exports` map and a `files` allowlist, and publishes v0.1.0 as a tag. Both sites delete their
copy and change one import. The 22nd test — a d3 vendoring check that is site infrastructure,
not a parser assertion — stays in companygraph.io under an honest name and is deleted from
blust.ch, where it can never run.

**Tech Stack:** Node 22+, ESM, `node:test` + `node:assert/strict`. No dependencies anywhere in
this plan — the parser is pure, and meta-model has no lockfile and no install step.

**Spec:** [`docs/superpowers/specs/2026-09-02-instance-parser-design.md`](../specs/2026-09-02-instance-parser-design.md)

## Global Constraints

- **The parser is pure** — no filesystem, no network. Its tests feed it fixture maps. This is
  what lets meta-model's CI keep running with no install step.
- **Zero dependencies in meta-model.** It has no lockfile; `npm ci` there would fail rather
  than pass emptily, which is why its workflow has no install step today.
- **No generated page may change.** `npm run model:check` on blust.ch and `npm run example:check`
  on companygraph.io must pass, and `git status` must show no generated page in either
  repository. This is the fixed point the whole plan is measured against.
- **Every new gate is proven red by mutation before it is trusted.** A test never seen to fail
  is not yet a gate. Assert behaviour, not source text: `Function.prototype.toString()` includes
  comments, and three tests in this family were defeated exactly that way.
- **Sites pin an exact tag**, never a commit SHA, never a `#semver:` range.
- **Merge with `gh pr merge --merge`, never `--squash`.** Author is
  `robert.blust@flatland.ch`. Stage by name; never `git add -A`.
- **Do not touch `verify/check.mjs` in meta-model.** It is a different program with a different
  job, and it is explicitly not the validator this parser is.

## File Structure

**In `companygraph/meta-model` (new):** `lib/instance.mjs` (the parser),
`verify/instance.test.mjs` (21 parser tests), `verify/rule-citations.test.mjs` (the tripwire).
**Modified:** `package.json`, `.github/workflows/ci.yml`.

**In `blust.ch`:** delete `build/instance.mjs` and `verify/instance.test.mjs`; one import in
`build/model.mjs`; `package.json` loses `test:instance` and gains the pin;
`.github/dependabot.yml` gains a group.

**In `companygraph.io`:** delete `build/instance.mjs`; `verify/instance.test.mjs` becomes
`verify/d3-vendoring.test.mjs` holding one test; one import in `build/build.mjs`;
`package.json` renames `test:example`; `.github/workflows/ci.yml` moves `example:check` after
`npm ci` and drops one duplicated step; `.github/dependabot.yml` gains a group.

## Interfaces

```js
// companygraph-meta-model/instance
export const ROOT_LABEL          // "Fictional Company"
export const CORE_LABEL          // "Core"
export function parseInstance(files)   // Map<path, markdown> -> the graph
export function parseSchemas(files)    // Map<path, markdown> -> the schemas
```

blust.ch imports `parseInstance` only. companygraph.io imports `parseInstance` and
`parseSchemas`. Both currently import from `"./instance.mjs"`.

---

### Task 1: meta-model gains the parser, its tests, and the tripwire

**Files:**
- Create: `lib/instance.mjs`, `verify/instance.test.mjs`, `verify/rule-citations.test.mjs`
- Modify: `package.json`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces: the four exports above, at specifier `companygraph-meta-model/instance`.

- [ ] **Step 1: Copy the parser verbatim**

Source: `/Users/rob/git/robertblust/robertblust.github.io/build/instance.mjs`. It is
byte-identical to `/Users/rob/git/companygraph/companygraph.github.io/build/instance.mjs` —
**verify that with `cmp` before copying, and stop if it is false.** Copy to `lib/instance.mjs`
with no edits at all. Not a comment, not a blank line.

- [ ] **Step 2: Copy 21 of the 22 tests**

Source: `/Users/rob/git/robertblust/robertblust.github.io/verify/instance.test.mjs`, also
byte-identical between the sites — verify with `cmp` first.

Copy everything **except** the test named `the vendored d3 is the pinned package's build, byte
for byte` and the comment block directly above it. That test reads `../d3.v7.min.js` and
`../node_modules/d3/dist/d3.min.js`; neither exists here and neither should. Fix the import to
`../lib/instance.mjs`. Drop any import left unused once that test is gone.

Run it: 21 tests, 21 pass, **0 skipped**. A skip here means the d3 test came along.

- [ ] **Step 3: Make the package consumable**

```json
{
  "name": "companygraph-meta-model",
  "version": "0.1.0",
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

`"private": true` is removed. `files` ships `lib` and nothing else — `core/` is excluded
deliberately, because the sites read it over the GitHub API rather than from `node_modules`.

- [ ] **Step 4: Write the tripwire**

`verify/rule-citations.test.mjs`. The parser cites rules by number in its comments; those rules
are defined in `core/CONVENTIONS.md`. Nothing has ever checked that the citations resolve.

```js
// The parser decides what an instance means by citing rules — R2 and R3 keep a repository
// folder out of a path, R4 makes an unresolvable name an error, R5 and R6 make ownership
// nesting on disk, R7 singularises a folder into a type. Those rules are defined in
// core/CONVENTIONS.md. While the two lived in different repositories nothing could check that
// a cited rule still existed, which is the reason the parser moved here rather than into the
// design package.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const src = fs.readFileSync(new URL("../lib/instance.mjs", import.meta.url), "utf8");
const conventions = fs.readFileSync(new URL("../core/CONVENTIONS.md", import.meta.url), "utf8");

const cited = [...new Set(src.match(/\bR\d+\b/g) || [])];
const defined = new Set(conventions.match(/\bR\d+\b/g) || []);

test("the parser cites at least one rule", () => {
  // Without this the test below passes vacuously if the citation pattern ever stops matching:
  // an empty `cited` makes `missing` empty too, and a green suite would mean nothing.
  assert.ok(cited.length > 0, "the parser cites no rules — has the citation pattern broken?");
});

test("every rule the parser cites is defined in core/CONVENTIONS.md", () => {
  const missing = cited.filter((r) => !defined.has(r));
  assert.deepEqual(missing, [], `cited but not defined: ${missing.join(", ")}`);
});
```

Expected on arrival: the parser cites R2, R3, R4, R5, R6, R7, R9, R13; `CONVENTIONS.md`
defines R0 through R13. Both tests pass.

- [ ] **Step 5: Prove the tripwire red, two ways**

Neither is optional, and each catches a different failure:

1. Add `// R99` to a comment in `lib/instance.mjs`. The second test must fail naming R99.
   Restore.
2. Remove every mention of `R7` from `core/CONVENTIONS.md`. The second test must fail naming
   R7. Restore, and confirm with `git diff` that the file came back exactly.

Then defeat the first test: make the citation regex match nothing (e.g. `/\bZ\d+\b/g`) and
confirm the first test fails rather than the suite passing on an empty list. Restore.

Record real pass/fail counts for all three.

- [ ] **Step 6: Add both suites to CI**

`.github/workflows/ci.yml` gains two steps after the existing `verify` step. **Add no install
step** — the comment in that file explains why there is none, and both new suites keep it true.

```yaml
      - name: The parser still parses
        run: npm run test:instance
      - name: Every rule the parser cites still exists
        run: npm run test:rules
```

- [ ] **Step 7: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs verify/rule-citations.test.mjs package.json .github/workflows/ci.yml
git commit -m "The instance parser moves here, and its rule citations become checkable"
```

---

### Task 2: Release v0.1.0

- [ ] **Step 1:** `npm run verify`, `npm run test:instance`, `npm run test:rules` — all green.
- [ ] **Step 2:** Confirm no dependencies and no lockfile were introduced.
- [ ] **Step 3:** Confirm `npm pack --dry-run` ships `lib/` and not `core/`, `example/` or
      `verify/`.
- [ ] **Step 4:** Open the PR, wait for green, merge with `--merge`.
- [ ] **Step 5:** Tag `v0.1.0` and create a GitHub Release with notes. Not ceremony:
      Dependabot renders the notes into the pull request in each site, and that pull request is
      the only thing telling a person in another repository what changed.

**This task needs the user's explicit go.** The standing merge-and-tag permission covers
`robertblust/design` only; this is a different repository. Stop here and ask.

---

### Task 3: blust.ch adopts

**Files:** delete `build/instance.mjs`, delete `verify/instance.test.mjs`; modify
`build/model.mjs`, `package.json`, `.github/dependabot.yml`

- [ ] **Step 1: Baseline.** `npm run model:check` and `git status --porcelain` (must be clean).
      Record the output; it is the fixed point.

- [ ] **Step 2: Pin the tag.**

```bash
npm install 'companygraph-meta-model@github:companygraph/meta-model#v0.1.0' --save-dev
```

Use this form, not `npm pkg set` followed by `npm install`. On this repository that reported
"up to date" and left the previous version installed, because the lockfile pinned the old
commit — three separate agents hit it during the card harness. Verify what is actually on disk
before trusting any green result:

```bash
node -e 'console.log(require("companygraph-meta-model/package.json").version)'
```

Keep it in `devDependencies`, where this site keeps `@robertblust/design`.

- [ ] **Step 3: One import.** In `build/model.mjs` line 22:

```js
import { parseInstance } from "companygraph-meta-model/instance";
```

The comment two lines above says the parser is *"copied from companygraph.io"*. That is no
longer true — rewrite it to say where the parser lives now and why.

- [ ] **Step 4: Delete both files.**

```bash
git rm build/instance.mjs verify/instance.test.mjs
```

`verify/instance.test.mjs` goes entirely. Its 21 parser tests now live with the parser, and its
22nd — the d3 vendoring check — has **never run on this site**: blust.ch declares no `d3`
devDependency, so `node_modules/d3` never exists and the test's own `t.skip` fires on every run
on every machine. This site's vendored `d3.v7.min.js` is covered by `design:check`, through the
`stage` group, against the package's `assets/d3.v7.min.js`. Confirm that before deleting:
`npm run design:check` must be green, and `design.config.json` must list `stage`.

- [ ] **Step 5:** Remove the `test:instance` script from `package.json`. It is referenced
      nowhere in `.github/workflows/ci.yml` — verify with `grep` before and after.

- [ ] **Step 6: Dependabot group.** In `.github/dependabot.yml`, add a group **before**
      `minor-and-patch`, as the file's own comment explains — Dependabot places a dependency in
      the first group it matches:

```yaml
      meta-model:
        patterns:
          - "companygraph-meta-model"
```

- [ ] **Step 7: Prove the fixed point.** `npm run model:check` output identical to Step 1, and
      `git status --porcelain` naming no file under `model/`. Then `npm run design:check`,
      `npm run verify`, `npm run og:check`, `npm run test:dupes` — all green.

- [ ] **Step 8: Commit, open a PR, stop.** Do not merge.

**Note, not a task:** neither `model:check` nor `test:instance` appears in this site's
`ci.yml`, so the parser and the page built from it are unchecked in CI here. Adding
`model:check` is a one-step change and out of scope for this plan. Record it in the PR body so
it is not lost.

---

### Task 4: companygraph.io adopts

**Files:** delete `build/instance.mjs`; rename `verify/instance.test.mjs` to
`verify/d3-vendoring.test.mjs` and cut it down; modify `build/build.mjs`, `package.json`,
`.github/workflows/ci.yml`, `.github/dependabot.yml`

- [ ] **Step 1: Baseline.** `npm run example:check` and `git status --porcelain`. Record both.

- [ ] **Step 2: Pin the tag**, exactly as Task 3 Step 2, including the on-disk version check.

- [ ] **Step 3: One import.** In `build/build.mjs` line 20:

```js
import { parseInstance, parseSchemas } from "companygraph-meta-model/instance";
```

This site imports **both** functions; blust.ch imports only `parseInstance`.

- [ ] **Step 4: Split the test file.**

```bash
git mv verify/instance.test.mjs verify/d3-vendoring.test.mjs
```

Then cut it down to the single test `the vendored d3 is the pinned package's build, byte for
byte`, its comment block, and the imports that test needs. Everything else is now in
meta-model. A file called `instance.test.mjs` that tests d3 is how this repository's own
`dependabot.yml` came to describe the wrong file — fix that comment too, which names
`verify/instance.test.mjs` twice.

Keep the test's `t.skip` when `node_modules/d3` is absent: it is correct here, where CI's step
order can put it either side of `npm ci`.

- [ ] **Step 5: Rename the script.** `test:example` becomes `test:d3`:

```json
"test:d3": "node --test verify/d3-vendoring.test.mjs"
```

- [ ] **Step 6: Fix the workflow — this is the step most likely to be got wrong.**

`ci.yml` today runs `npm run test:example` **twice**, deliberately: once at line 25 for the
parser tests, once at line 44 where `node_modules/d3` exists so the d3 test is live. After this
change there is one test and one step.

Three edits:

1. **Delete** the line-25 step, `The parsers still work`. Those tests now run in meta-model's CI.
2. **Rename** the line-44 step's command to `npm run test:d3`. Its name, `The vendored d3 is
   the pinned build`, is already correct.
3. **Move `example:check` to after `npm ci`.** `build/build.mjs` now imports
   `companygraph-meta-model`, which is not on disk until `npm ci` has run. Left where it is,
   every push fails with `ERR_MODULE_NOT_FOUND`. Put it beside the other post-`npm ci` checks
   and keep its `GITHUB_TOKEN` env block.

**A local run cannot catch this**, because `node_modules` exists on your machine. Reproduce
CI's view explicitly:

```bash
mv node_modules /tmp/nm-cg && npm run example:check; mv /tmp/nm-cg node_modules
```

That must **fail** before your workflow change is meaningful. This exact defect shipped into
the card-harness spec and was caught only by a whole-branch review.

- [ ] **Step 7: Dependabot group**, as Task 3 Step 6 — before `minor-and-patch`.

- [ ] **Step 8: Prove the fixed point.** `npm run example:check` output identical to Step 1,
      `git status --porcelain` naming no generated page. Then `npm run test:d3`,
      `npm run design:check`, `npm run og:check`, `npm run verify` — all green.

- [ ] **Step 9: Commit, open a PR, stop.** Do not merge.

---

## Final verification

- [ ] `npm run dupes` from blust.ch reports **0 duplicated lines** for `build/instance.mjs` and
      `verify/instance.test.mjs`, from 550.
- [ ] meta-model: `verify`, `test:instance` (21 tests, 0 skipped) and `test:rules` all green in
      CI, with no install step in the workflow.
- [ ] The tripwire has been seen red three ways: an undefined citation, a deleted rule, and a
      regex that matches nothing.
- [ ] Both sites: no generated page changed, every check green, exact tag pinned, Dependabot
      group present and declared before `minor-and-patch`.
- [ ] companygraph.io: `test:d3` still fails when the vendored copy and `node_modules/d3`
      differ — proven by making them differ.
- [ ] meta-model still has zero dependencies and no lockfile.
