# The machinery outside the family, phase 1: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance, and a repository that is not one, take the family's Markdown form check and a read-only pin report from meta-model, applied by `init`, `upgrade` and a new `adopt`, and moved by the one `tooling` pin.

**Architecture:** The form's two rule files move into a `form/` folder of the package, and `lib/form.mjs` walks a repository's Markdown and runs markdownlint-cli2 at the pinned version over it, from the package's own `node_modules` where a development checkout has one and through npx everywhere else. `lib/pins.mjs` ports the read half of the family's pin kinds and judges each pin against `git ls-remote`, which the command passes in, so the tests hand it a fake. `init`, `upgrade` and `adopt` decide what they write in `lib/plan.mjs` as today, and the command in `bin/companygraph.mjs` gains `form`, `pins` and `adopt`.

**Tech Stack:** Node 22, ES modules with JSDoc types checked by `tsc`, `node:test`, markdownlint-cli2 0.23.2, git.

**Spec:** `docs/superpowers/specs/2026-10-01-the-machinery-outside-the-family-design.md` (meta-model PR #223).

## Global Constraints

- The markdownlint-cli2 version is `0.23.2`, the version `conventions/conventions-format` pins as `VERSION`.
- The form is fixed: a repository can exclude paths and cannot turn a rule on or off.
- A form failure is a failure like any other, exit 1.
- `pins` exits 0 when a pin is behind; it exits 1 only when `pins.json` cannot be read or an entry names no line in the file it names. It moves nothing.
- `pins` reads every kind `conventions/PINS.md` names except `conventions` and `service-conventions`; a file that declares one of those is reported as such and not refused.
- `init` and `upgrade` write `exclude: ["dist", "<units>"]` into an instance's manifest (`["dist", "meta"]` with the default units); `adopt` writes `["dist"]`.
- `adopt` writes a manifest with `tooling` and `exclude` and no `core` and no `files`, the workflow, the seat hook and `{ "pins": [] }`, and in a folder that is already an instance it refuses by name and points at `upgrade`.
- `upgrade` runs the form check of the release it is moving to before it moves anything; when the Markdown fails it lists the failures and stops, and `--force` moves anyway.
- Core does not change: `core/manifest.json` stays where it is. The release is a minor release of the package, and it is cut on the owner's word, not by this plan.
- No test reaches the network.
- The menu keeps its numbers 1 to 5; the two new entries come after `Report by seat` and before `Quit`.
- Every commit is authored by its seat, `--author "Implementer <implementer@companygraph.io>"`, in the git register of `conventions/WRITING.md`: a plain-sentence subject under seventy characters with no type prefix, one to three paragraphs of prose, a `Verified:` line naming what actually ran, then the trailers `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- Every Markdown file this plan touches is in the family's form: a paragraph is one line, lists use `-`, tables use `| --- |`. `sh conventions/conventions-format` passes before every commit.

## Review Focus

- The reusable workflows check the checker out into `.companygraph-checker/` inside the repository, so a form check that walks the whole tree reads the checker's own Markdown. `markdownFilesOf` skips that folder by name; Task 1 pins it.
- An instance a family member made before this release already holds a `pins.json` with its own `move` and a `conventions` pin. `upgrade` writes `pins.json` only where there is none and never touches one that is there; Task 3 pins it.
- An adopted repository has a manifest and no `core`. `upgrade` and `check` would otherwise read it as an instance and vendor core into a site; Task 5 gives both a branch for it and pins each.
- A private or mistyped upstream makes `git ls-remote` ask for credentials and wait. `lsRemote` runs with `GIT_TERMINAL_PROMPT=0` and a timeout, and the report says `unknown`; Task 4 pins the status from a fake that answers nothing.
- A repository with no Markdown at all, such as a service, would fail `conventions-format`, which exits 1 when it finds no file. Here no file is no failure, and the check says it held none; Task 1 pins it.

## Decisions this plan makes that the spec leaves open

Each is small and stated where it is built; they are listed here so the reviewer reads them once.

- **A `form` command.** The spec has the form check run inside `check` and the workflow. A failure the check names needs a remedy, and markdownlint writes every rule of the form, so `companygraph form [<folder>] [--fix]` is the check on its own and its fix. `check` and both workflows call the same code. An upgrade that stops on the form names `form --fix`.
- **A second reusable workflow.** `instance-check.yml` runs `check-instance.mjs`, which refuses a folder with no `model/`, so an adopted repository calls `repository-check.yml`, which runs the form check alone. The release check and the release command in `pins.json` move its `ref` with `instance-check.yml`'s.
- **The written `core-release` pin carries `move`.** `PINS.md` says a `core-release` pin must give one, and the family's resync refuses a file without it, so the pin `init` and `upgrade` write is the spec's line with `"move": "npx --yes 'github:companygraph/meta-model#v{version}' upgrade"`, the command the family's instances already carry.
- **Newest is the highest version tag.** The family's report asks GitHub for the latest release; `git ls-remote` sees tags, so a tag pin's newest is the highest `vMAJOR.MINOR.PATCH` tag, and a commit pin's newest is the upstream's `HEAD`. `watch`, which needs history, is not read in phase 1, so a commit pin is behind whenever `HEAD` has moved.
- **The two copies of the form are held to each other.** Until phase 2, `conventions/markdown-rules.cjs` and the root `.markdownlint-cli2.jsonc` are vendored here by `conventions-sync`, and `form/` holds meta-model's copy. `npm run verify` fails when the two rule sets or the two custom-rule files differ, or when the `markdownlint-cli2` devDependency is not `FORM_VERSION`.
- **The failing fixture is a wrapped paragraph.** The spec's tests name an instance "with a heading out of order", and the form does not hold heading order (MD001 is off), so the fixture that fails is a paragraph written over two lines, which also proves the family's own rules are read.
- **An adopted repository's seat hook checks nothing yet.** `commits` reads the seats of an instance at the folder it is given, and an adopted repository has no model, so the hook says nothing and lets the commit through. Naming the instance that governs an adopted repository belongs with phase 2's list of repositories.

## Files

- Create `form/.markdownlint-cli2.jsonc`: the form's rule set, `conventions`' root file with `customRules` pointing beside it.
- Create `form/markdown-rules.cjs`: byte for byte `conventions/markdown-rules.cjs`.
- Create `lib/form.mjs`: `FORM_VERSION`, `FORM_CONFIG`, `markdownFilesOf`, `linterOf`, `formCheck`.
- Create `lib/pins.mjs`: `KINDS`, `FAMILY_KINDS`, `SCANNED`, `discover`, `validatePins`, `newestTag`, `pinReport`, `lsRemote`.
- Create `.github/workflows/repository-check.yml`: the reusable workflow for an adopted repository.
- Create `verify/form.test.mjs` and `verify/pins.test.mjs`.
- Modify `lib/instance-files.mjs`: `manifestOf` carries `exclude`; `excludeFor`, `INSTANCE_PINS`, `NO_PINS`, `adoptedManifestOf`, `repositoryWorkflowFor`.
- Modify `lib/plan.mjs`: `initPlan` writes `exclude` and `pins.json`; `upgradePlan` keeps or writes `exclude` and writes `pins.json` where absent; `adoptPlan` and `adoptedUpgradePlan` are new.
- Modify `bin/companygraph.mjs`: the commands `form`, `pins` and `adopt`; `check` runs the form; `upgrade` runs it first and moves an adopted repository; the menu, `USAGE` and the header comment.
- Modify `.github/workflows/instance-check.yml`: a form step.
- Modify `verify/check.mjs`: the release check reads both workflows; a check holds the two copies of the form together.
- Modify `package.json`, `package-lock.json`, `pins.json`, `.github/workflows/ci.yml`, `README.md`.
- Regenerate `types/lib/*.d.mts` and `types/bin/*.d.mts` with `npm run build` wherever `lib/` or `bin/` changes.

## Task 0: the worktree

- [ ] **Step 1: Make the worktree beside the clone**

The spec branch merges first. Then, from the clone:

```bash
cd ~/git/companygraph/meta-model
git fetch -q && git checkout -q main && git pull -q --ff-only
git worktree add ../meta-model-the-machinery-phase-1 -b the-machinery-phase-1 origin/main
cd ../meta-model-the-machinery-phase-1
npm ci
git config core.hooksPath conventions/hooks
```

- [ ] **Step 2: Confirm the suite is green before anything changes**

Run: `npm run verify && npm run test:plan && npm run test:instance-files && npm run test:cli`

Expected: every run ends with `# fail 0` or `✓ … checks passed`.

## Task 1: the form ships in the package

**Files:**

- Create: `form/.markdownlint-cli2.jsonc`, `form/markdown-rules.cjs`, `lib/form.mjs`, `verify/form.test.mjs`
- Modify: `package.json`, `package-lock.json`, `verify/check.mjs`, `.github/workflows/ci.yml`, `pins.json`

**Interfaces:**

- Produces: `FORM_VERSION: string` (`"0.23.2"`); `FORM_CONFIG: string` (absolute path of `form/.markdownlint-cli2.jsonc`); `markdownFilesOf(root: string, exclude?: string[]): string[]` (sorted, `/`-separated, relative to `root`); `formCheck(root: string, options?: { exclude?: string[]; fix?: boolean }): { files: number; hits: string[]; error?: string }`, where each hit reads `path.md:line: RULE`.

- [ ] **Step 1: Copy the rules and add the tool**

```bash
mkdir -p form
cp conventions/markdown-rules.cjs form/markdown-rules.cjs
npm install --save-dev --save-exact markdownlint-cli2@0.23.2
```

Write `form/.markdownlint-cli2.jsonc` as the root `.markdownlint-cli2.jsonc` with two changes: the header comment says what this copy is, and `customRules` points beside it. The `config` object is copied unchanged:

```jsonc
// The one Markdown form, as rules: the form robertblust/conventions holds the family to, shipped
// here so that any repository that takes CompanyGraph's tooling is held to it too. `companygraph
// form` runs markdownlint-cli2 at the version lib/form.mjs pins with this file as its
// configuration, and the two rules markdownlint does not ship are in markdown-rules.cjs beside it.
//
// The form is fixed: a repository excludes paths in its manifest's `exclude` and turns no rule on
// or off. Until the family takes this machinery from meta-model, robertblust/conventions keeps
// its own copy, and `npm run verify` fails when the two rule sets differ.
{
  "config": {
    // … the "config" object of the root .markdownlint-cli2.jsonc, copied with its comments …
  },
  "customRules": ["./markdown-rules.cjs"]
}
```

Add `"form"` to `files` in `package.json`, after `"core"`. The `--save-exact` install leaves `"markdownlint-cli2": "0.23.2"` in `devDependencies`.

- [ ] **Step 2: Write the failing tests**

Create `verify/form.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FORM_VERSION, markdownFilesOf, formCheck } from "../lib/form.mjs";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-form-"));
/** @param {string} root @param {Record<string, string>} files */
function tree(root, files) {
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const CLEAN = "# Title\n\nOne paragraph on one line.\n\n- one\n- two\n";
const WRAPPED = "# Title\n\nOne paragraph\nthat wraps.\n";

test("the form is markdownlint-cli2 at the version conventions-format pins", () => {
  assert.equal(FORM_VERSION, "0.23.2");
});

test("the walk finds every Markdown file but .git, node_modules, the checker's checkout and what is excluded", () => {
  const root = tree(temp(), {
    "README.md": CLEAN,
    "docs/a.md": CLEAN,
    "dist/out.md": WRAPPED,
    "meta/core/x.md": WRAPPED,
    "node_modules/p/README.md": WRAPPED,
    "deep/node_modules/q/README.md": WRAPPED,
    ".companygraph-checker/README.md": WRAPPED,
    "notes.txt": "not Markdown\n",
  });
  assert.deepEqual(markdownFilesOf(root, ["dist", "meta/"]), ["README.md", "docs/a.md"]);
});

test("the walk leaves out what git ignores, and a new file that is not ignored is read", () => {
  const root = tree(temp(), { ".gitignore": "scratch/\n", "scratch/a.md": WRAPPED, "new.md": CLEAN });
  execFileSync("git", ["init", "-q"], { cwd: root });
  assert.deepEqual(markdownFilesOf(root), ["new.md"]);
});

test("Markdown in the form passes", () => {
  const root = tree(temp(), { "README.md": CLEAN });
  assert.deepEqual(formCheck(root), { files: 1, hits: [] });
});

test("a wrapped paragraph fails on the family's own rule, which shows the custom rules are read", () => {
  const root = tree(temp(), { "README.md": WRAPPED });
  const { hits, error } = formCheck(root);
  assert.equal(error, undefined);
  assert.ok(hits.includes("README.md:3: paragraph-on-one-line"), hits.join("\n"));
});

test("a list marked with stars fails on markdownlint's own rule", () => {
  const root = tree(temp(), { "README.md": "# Title\n\n* one\n* two\n" });
  assert.ok(formCheck(root).hits.some((h) => /^README\.md:3: MD004/.test(h)));
});

test("an excluded folder is not held to the form", () => {
  const root = tree(temp(), { "README.md": CLEAN, "dist/out.md": WRAPPED });
  assert.deepEqual(formCheck(root, { exclude: ["dist"] }).hits, []);
});

test("fix rewrites a hit into the form, and the check then passes", () => {
  const root = tree(temp(), { "README.md": WRAPPED });
  assert.deepEqual(formCheck(root, { fix: true }).hits, []);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Title\n\nOne paragraph that wraps.\n");
});

test("a repository with no Markdown holds nothing to the form, and that is no failure", () => {
  const root = tree(temp(), { "index.js": "export {};\n" });
  assert.deepEqual(formCheck(root), { files: 0, hits: [] });
});

test("a file name with brackets is read as the file, not as a pattern", () => {
  const root = tree(temp(), { "notes [draft].md": WRAPPED });
  assert.ok(formCheck(root).hits.some((h) => h.startsWith("notes [draft].md:3:")));
});
```

Add to `package.json` `scripts`: `"test:form": "node --test verify/form.test.mjs"`.

- [ ] **Step 3: Run the tests to see them fail**

Run: `npm run test:form`

Expected: FAIL, `Cannot find module '…/lib/form.mjs'`.

- [ ] **Step 4: Write `lib/form.mjs`**

```js
// The one Markdown form, held by markdownlint-cli2 at the version below with the rules in form/,
// over every Markdown file of a repository. It is the family's form, taken out of
// robertblust/conventions so that a repository outside the family is held to it the same way:
// the same tool, the same version and the same rules give the same bytes, whoever wrote the file.
//
// The checker has had no dependencies, and this is the one place it takes one, on purpose: a
// form held by one tool in CI and another in the editor is two forms, and markdownlint is the
// library an editor plugin bundles. A development checkout has it in node_modules from `npm ci`,
// and a release run from a tag, which installs no devDependencies, fetches it with npx, so the
// first run needs the network and later ones use npx's cache.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const FORM_VERSION = "0.23.2";
export const FORM_CONFIG = join(HERE, "..", "form", ".markdownlint-cli2.jsonc");

// Never read: git's own folder, installed packages at any depth, and the checker the reusable
// workflows check out inside the repository, whose Markdown is meta-model's and held there.
const NEVER = new Set([".git", "node_modules", ".companygraph-checker"]);

/**
 * Every Markdown file under `root` the form holds, relative to it with `/`, sorted: all but the
 * folders above, the paths in `exclude`, and what git ignores, which is scratch and not the
 * repository's Markdown. A file that is new and not ignored is read, since it is on its way in.
 * @param {string} root
 * @param {string[]} [exclude]
 * @returns {string[]}
 */
export function markdownFilesOf(root, exclude = []) {
  const skip = new Set(exclude.map((path) => path.replace(/\/+$/, "")));
  /** @type {string[]} */
  const found = [];
  /** @param {string} rel */
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel || "."), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (skip.has(child)) continue;
      if (entry.isDirectory()) {
        if (!NEVER.has(entry.name)) walk(child);
      } else if (entry.isFile() && entry.name.endsWith(".md")) found.push(child);
    }
  };
  walk("");
  found.sort();
  const ignored = ignoredOf(root, found);
  return found.filter((path) => !ignored.has(path));
}

// What git ignores of `files`. Outside a repository, or with no git, nothing is: the walk is then
// the whole tree, so a plain folder is still held to the form. core.quotePath is off because git
// C-quotes a path with a non-ASCII byte, and a quoted path matches nothing in the list it came from.
/**
 * @param {string} root
 * @param {string[]} files
 * @returns {Set<string>}
 */
function ignoredOf(root, files) {
  if (!files.length) return new Set();
  const run = spawnSync("git", ["-c", "core.quotePath=false", "check-ignore", "--stdin"], { cwd: root, input: `${files.join("\n")}\n`, encoding: "utf8" });
  return run.status === 0 ? new Set(run.stdout.split("\n").filter(Boolean)) : new Set();
}

// How markdownlint-cli2 is run: from this checkout's node_modules when it holds the pinned
// version, else through npx at that version. npx is run as npm's own script beside the running
// Node where it is there, so Windows needs no shell to start `npx.cmd`; else by name.
/** @returns {{ command: string; args: string[] }} */
export function linterOf() {
  const local = join(HERE, "..", "node_modules", "markdownlint-cli2");
  if (existsSync(join(local, "package.json"))) {
    const pkg = JSON.parse(readFileSync(join(local, "package.json"), "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.["markdownlint-cli2"];
    if (pkg.version === FORM_VERSION && bin) return { command: process.execPath, args: [join(local, bin)] };
  }
  const npx = [
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
    join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ].find((path) => existsSync(path));
  const tool = ["--yes", `markdownlint-cli2@${FORM_VERSION}`];
  return npx ? { command: process.execPath, args: [npx, ...tool] } : { command: "npx", args: tool };
}

/**
 * The form over a repository: the files it held, one hit per rule and line as `path:line: RULE`,
 * and `error` when the tool could not be run or failed without naming a file. With `fix`, every
 * hit markdownlint can write is written first, in three passes at most, since two fixes on one
 * line are applied one per pass.
 * @param {string} root
 * @param {{ exclude?: string[]; fix?: boolean }} [options]
 * @returns {{ files: number; hits: string[]; error?: string }}
 */
export function formCheck(root, { exclude = [], fix = false } = {}) {
  const files = markdownFilesOf(root, exclude);
  if (!files.length) return { files: 0, hits: [] };
  const { command, args } = linterOf();
  // A leading colon makes each path literal, so a name with brackets is the file, not a glob.
  /** @param {string[]} extra */
  const lint = (extra) =>
    spawnSync(command, [...args, ...extra, "--config", FORM_CONFIG, ...files.map((path) => `:${path}`)], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (fix) for (let pass = 0; pass < 3; pass++) if (lint(["--fix"]).status === 0) break;
  const run = lint([]);
  if (run.error) return { files: files.length, hits: [], error: `markdownlint-cli2 ${FORM_VERSION} could not be run: ${run.error.message}` };
  if (run.status === 0) return { files: files.length, hits: [] };
  const said = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  // The tool reports a table once per pipe; a reader wants the line once per rule.
  const hits = [...new Set([...said.matchAll(/^(.*\.md:\d+)(?::\d+)? error ([A-Za-z0-9/-]+)/gm)].map((m) => `${m[1]}: ${m[2]}`))];
  if (!hits.length) return { files: files.length, hits: [], error: `markdownlint-cli2 ${FORM_VERSION} exited ${run.status} and named no file:\n${said.trim()}` };
  return { files: files.length, hits };
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:form`

Expected: PASS, `# fail 0`. If the custom-rule test fails while the MD004 test passes, markdownlint-cli2 did not resolve `./markdown-rules.cjs` against the config file's folder: check with `node node_modules/markdownlint-cli2/<bin> --config form/.markdownlint-cli2.jsonc :<a wrapped file>` and fix the path in `customRules`, not the test.

- [ ] **Step 6: Hold the two copies of the form together in `npm run verify`**

In `verify/check.mjs`, add this entry to `CHECKS`, after `"release manifest"`:

```js
  {
    // Until the family takes the machinery from meta-model, the form has two copies here: the one
    // conventions-sync vendors for this repository's own Markdown, and form/, which every
    // repository that takes the tooling is held to. Both run in phase 1, and they agree only while
    // they read the same rules at the same version, so a difference fails here rather than as two
    // checks that disagree about one file.
    name: "the form is the family's form",
    rule: null,
    run() {
      const jsonc = (rel) => JSON.parse((read(rel) ?? "{}").split("\n").filter((line) => !line.trim().startsWith("//")).join("\n"));
      if (read("form/markdown-rules.cjs") !== read("conventions/markdown-rules.cjs"))
        fail("form/markdown-rules.cjs is not conventions/markdown-rules.cjs; the form is the family's, rule for rule");
      if (JSON.stringify(jsonc("form/.markdownlint-cli2.jsonc").config) !== JSON.stringify(jsonc(".markdownlint-cli2.jsonc").config))
        fail("form/.markdownlint-cli2.jsonc turns on other rules than .markdownlint-cli2.jsonc; the form is the family's, rule for rule");
      const pkg = JSON.parse(read("package.json") ?? "{}");
      const version = /export const FORM_VERSION = "([^"]+)"/.exec(read("lib/form.mjs") ?? "")?.[1];
      if (pkg.devDependencies?.["markdownlint-cli2"] !== version)
        fail(`package.json takes markdownlint-cli2 ${pkg.devDependencies?.["markdownlint-cli2"]}, and lib/form.mjs pins ${version}; the tests run the version a release runs`);
    },
  },
```

Run: `npm run verify`

Expected: `✓ … checks passed`. Then prove the check can fail: append a space to a line of `form/markdown-rules.cjs`, run `npm run verify`, see `form/markdown-rules.cjs is not conventions/markdown-rules.cjs`, and undo the space.

- [ ] **Step 7: Run the tests in CI and in the release's verify list**

In `.github/workflows/ci.yml`, in `verify`, after the step `The files an instance starts with`:

```yaml
      - name: The Markdown form, held by the pinned markdownlint
        run: npm run test:form
```

In `windows`, change the step `The plan, the files an instance starts with, and the command over real folders` to run `npm run test:plan && npm run test:instance-files && npm run test:form && npm run test:cli && npm run test:ids && npm run test:localization && npm run test:seats`.

In `pins.json`, add `"npm run test:form"` to `verify` after `"npm run test:instance-files"`.

- [ ] **Step 8: Build the declarations, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck && npm run verify && npm run test:form
sh conventions/conventions-format
git add form lib/form.mjs types verify/form.test.mjs verify/check.mjs package.json package-lock.json pins.json .github/workflows/ci.yml
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The family's Markdown form ships in the package

An instance outside the family had no way to be held to the family's Markdown form, because the form lived in robertblust/conventions with the family's own content. Its two rule files are now in form/, and lib/form.mjs runs markdownlint-cli2 0.23.2 with them over every Markdown file of a repository but what git ignores, what is excluded, and the checker's own checkout.

A development checkout runs the tool from node_modules and a release fetches it with npx. npm run verify fails when the copy in form/ and the copy conventions vendors here turn on different rules, or when the devDependency is not the pinned version.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 2: `form` and `check` hold an instance to the form

**Files:**

- Modify: `lib/instance-files.mjs`, `lib/plan.mjs`, `bin/companygraph.mjs`, `.github/workflows/instance-check.yml`
- Test: `verify/instance-files.test.mjs`, `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `formCheck`, `FORM_VERSION` from Task 1.
- Produces: `excludeFor(units: string): string[]` (`["dist", units]`); `manifestOf({ tooling, core, units, packs?, exclude?, files })` writing `exclude` between `packs` and `files`; the command `companygraph form [<folder>] [--fix]` exiting 0 or 1; `check` exiting 1 on a form failure.

- [ ] **Step 1: Write the failing tests**

In `verify/instance-files.test.mjs`, import `excludeFor` and add:

```js
test("the manifest carries what the form check leaves out, and an instance leaves out dist and its units", () => {
  assert.deepEqual(excludeFor("meta"), ["dist", "meta"]);
  assert.deepEqual(excludeFor("schemas"), ["dist", "schemas"]);
  const read = JSON.parse(manifestOf({ tooling: "0.1.0", core: { version: "0.1.0", shape: 3, source: "bundled" }, units: "meta", exclude: ["dist", "meta"], files: {} }));
  assert.deepEqual(read.exclude, ["dist", "meta"]);
  assert.deepEqual(Object.keys(read), ["tooling", "core", "units", "packs", "exclude", "files"]);
});
```

In `verify/plan.test.mjs`, add:

```js
test("init writes into the manifest that the form check leaves out dist and the units folder", () => {
  assert.deepEqual(JSON.parse(initPlan(ask).writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta"]);
  assert.deepEqual(JSON.parse(initPlan({ ...ask, units: "schemas" }).writes.get(".companygraph/manifest.json")).exclude, ["dist", "schemas"]);
});
```

In `verify/cli.test.mjs`, add:

```js
test("an instance init writes is in the one form, and check says so", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.match(run(["form", root]), /in the one form/);
  assert.match(run(["check", root]), /in the one form/);
});

test("check fails on Markdown out of the form, names the line, and form --fix puts it right", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "NOTES.md"), "# Notes\n\nOne paragraph\nthat wraps.\n");
  const failed = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /NOTES\.md:3: paragraph-on-one-line/);
  assert.match(failed.stderr, /form .* --fix/);
  run(["form", root, "--fix"]);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);
});

test("the form check leaves out what the manifest excludes", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.mkdirSync(path.join(root, "dist"));
  fs.writeFileSync(path.join(root, "dist/out.md"), "# Out\n\nOne paragraph\nthat wraps.\n");
  assert.equal(spawnSync(process.execPath, [cli, "form", root], { encoding: "utf8" }).status, 0);
});

test("form refuses where the manifest names another release, as the checker does", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  const said = spawnSync(process.execPath, [cli, "form", root], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /names 0\.0\.1/);
});

test("the instance workflow holds the Markdown to the form with the checker it checked out", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/instance-check.yml"), "utf8");
  assert.match(yml, /run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:instance-files && npm run test:plan && npm run test:cli`

Expected: FAIL on the new tests: `excludeFor` is not exported, `exclude` is undefined, `form is no command of this tooling`.

- [ ] **Step 3: Carry `exclude` in the manifest**

In `lib/instance-files.mjs`, add `@property {string[]} [exclude]` to the `Manifest` typedef and replace `manifestOf`:

```js
// What the form check leaves out of an instance: dist/, where the skills write what they make,
// and the units folder, whose vendored core and packs are meta-model's and held to the form there.
/** @type {(units: string) => string[]} */
export const excludeFor = (units) => ["dist", units];

// `packs` lists the packs the instance took, empty when it took none, so that an agent can tell
// an intentionally absent type from a forgotten one; the older tooling design settled that.
// `exclude` lists the paths the form check leaves out, and is written only when it is given.
/**
 * @param {Omit<Manifest, "packs" | "exclude"> & { packs?: string[]; exclude?: string[] }} manifest
 * @returns {string}
 */
export function manifestOf({ tooling, core, units, packs = [], exclude, files }) {
  return `${JSON.stringify({ tooling, core, units, packs, ...(exclude ? { exclude } : {}), files }, null, 2)}\n`;
}
```

In `lib/plan.mjs`, import `excludeFor`, and in `initPlan` pass `exclude: excludeFor(units)` to `manifestOf`. In `upgradePlan`, add `exclude?: string[]` to the `manifest` property of the `UpgradeAsk` typedef and pass `exclude: manifest.exclude ?? excludeFor(units)` to `manifestOf`, so an instance's own list is kept and an older instance is given the default.

- [ ] **Step 4: Add the `form` command and run it from `check`**

In `bin/companygraph.mjs`, import `{ formCheck }` from `../lib/form.mjs` and `{ excludeFor }` beside `exportFilesFor`, add `"fix"` to `TOGGLES` and `fix?: boolean` to the `Flags` typedef, and add above `check`:

```js
// The manifest at a folder, or null where it has none. A manifest that is not JSON is said by name.
/** @param {string} root */
function manifestAt(root) {
  const at = join(root, ".companygraph/manifest.json");
  if (!existsSync(at)) return null;
  try {
    return JSON.parse(readFileSync(at, "utf8"));
  } catch (error) {
    throw new Error(`${at} could not be read as JSON: ${/** @type {Error} */ (error).message}`);
  }
}

// What the form leaves out of a folder: its manifest's own list, else an instance's default, else
// nothing, for a folder that took no tooling and is held whole.
/** @param {{ exclude?: string[]; units?: string; core?: unknown } | null} manifest */
const excludeOf = (manifest) => manifest?.exclude ?? (manifest?.core ? excludeFor(manifest.units ?? "meta") : []);

// The form over a folder, said: one line per hit and the command that writes them, or one line
// that it passed. It refuses a manifest naming another release, as the checker's own guard does,
// because the form is the release's too and a workflow pinned to one release runs this.
/**
 * @param {string[]} argv
 * @returns {number}
 */
function form(argv) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  const manifest = manifestAt(root);
  if (manifest?.tooling && manifest.tooling !== PACKAGE.version) {
    console.error(`✗ this checker is ${PACKAGE.version} and .companygraph/manifest.json names ${manifest.tooling} — move the pin and the workflow together, or call the release the manifest names`);
    return 1;
  }
  const { files, hits, error } = formCheck(root, { exclude: excludeOf(manifest), fix: Boolean(given.fix) });
  if (error) {
    console.error(`✗ ${error}`);
    return 1;
  }
  if (hits.length) {
    for (const hit of hits) console.error(`✗ ${hit}`);
    console.error(given.fix ? "✗ the hits above have no automatic fix; edit them by hand" : `✗ "companygraph form ${root} --fix" rewrites these into the form`);
    return 1;
  }
  if (!files) console.log("✓ no Markdown file to hold to the form");
  else console.log(`✓ ${files} Markdown file${files === 1 ? "" : "s"} in the one form${given.fix ? ", fixed where they were not" : ""}`);
  return 0;
}
```

Replace `check`:

```js
/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function check(argv) {
  const root = flags(argv)._[0] ?? ".";
  // A second door to the same code, so a guard failure must read exactly as it does through
  // check-instance.mjs's own direct run — the "✗ " prefix and all — not as a generic CLI error.
  const { checkPath } = await import("./check-instance.mjs");
  let model;
  try {
    model = checkPath(root) > 0 ? 1 : 0;
  } catch (error) {
    console.error(`✗ ${/** @type {Error} */ (error).message}`);
    return 1;
  }
  return Math.max(model, form([root]));
}
```

In the dispatch at the foot, after the `check` line: `else if (command === "form") process.exitCode = form(rest);`. In `USAGE`, after the `check` line: `  form [<folder>]     the one Markdown form over a repository, or --fix to write it`, and the flag line `form: --fix`. In the header comment, after the `check` line: `//   companygraph form [<folder>] [--fix]`.

- [ ] **Step 5: Run the form in the instance workflow**

In `.github/workflows/instance-check.yml`, after the step `the instance is held to the core it vendored`:

```yaml
      # The one Markdown form, with the rules and the markdownlint version this release pins. npx
      # fetches the tool, the one thing this workflow installs, because a form held by one tool in
      # CI and another in the editor is two forms.
      - name: every Markdown file is in the one form
        run: node .companygraph-checker/bin/companygraph.mjs form .
```

Change the header comment's sentence `Nothing is installed: the checker has no dependencies, so the release is checked out beside the caller and run from there.` to `The checker has no dependencies but the Markdown form's, markdownlint-cli2, which npx fetches at the version the release pins; the release is checked out beside the caller and run from there.`

- [ ] **Step 6: Run the tests to see them pass**

Run: `npm run test:instance-files && npm run test:plan && npm run test:cli`

Expected: PASS, `# fail 0`. A test that ran `check` before and now fails on the form has found Markdown that `init` writes out of the form: fix the text in `lib/instance-files.mjs`, never the test.

- [ ] **Step 7: Build, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck && npm run verify
sh conventions/conventions-format
git add lib bin types verify .github/workflows/instance-check.yml
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
check and the instance workflow hold an instance to the form

The form shipped without a door. companygraph form runs it over a repository, or writes it with --fix, and check runs it after the model's checks, so a form failure fails the same command and the same workflow as any other. The manifest gains exclude, which init writes as dist and the units folder, since the vendored core is held by meta-model and not by the instance a second time.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 3: `init` and `upgrade` write the pin, and `upgrade` asks the form first

**Files:**

- Modify: `lib/instance-files.mjs`, `lib/plan.mjs`, `bin/companygraph.mjs`
- Test: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `formCheck` (Task 1); `excludeFor`, `form`'s wording (Task 2).
- Produces: `INSTANCE_PINS: string`, the `pins.json` an instance starts with; `upgradePlan` writes `pins.json` where `present` and `held` have none, and names it in `given`.

- [ ] **Step 1: Write the failing tests**

In `verify/plan.test.mjs`, add:

```js
test("init writes a pins.json that declares the instance's own core-release pin, with its move", () => {
  const pins = JSON.parse(initPlan(ask).writes.get("pins.json"));
  assert.deepEqual(pins, { pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model", move: "npx --yes 'github:companygraph/meta-model#v{version}' upgrade" }] });
});

test("--here leaves a pins.json already there alone, since a repository's pins are its own", () => {
  const { writes } = initPlan({ ...ask, present: new Set(["pins.json"]) });
  assert.equal(writes.has("pins.json"), false);
});

test("an upgrade writes pins.json where the instance has none, and never touches one it has", () => {
  const manifest = { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {} };
  const base = { core, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(), workflow: null };
  const given = upgradePlan(base);
  assert.ok(given.writes.has("pins.json"));
  assert.ok(given.given.includes("pins.json"));
  const kept = upgradePlan({ ...base, present: new Set(["pins.json"]) });
  assert.equal(kept.writes.has("pins.json"), false);
});

test("an upgrade keeps the instance's own exclude list and gives an older instance the default", () => {
  const base = { core, tooling: "0.31.2", tag: "v0.31.2", held: new Map(), workflow: null };
  const older = upgradePlan({ ...base, manifest: { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {} } });
  assert.deepEqual(JSON.parse(older.writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta"]);
  const own = upgradePlan({ ...base, manifest: { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {}, exclude: ["dist", "meta", "archive"] } });
  assert.deepEqual(JSON.parse(own.writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta", "archive"]);
});
```

In `verify/cli.test.mjs`, add:

```js
test("upgrade stops on Markdown out of the form, naming it and moving nothing, and --force moves anyway", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  // An instance a release before this one made: an older tooling, no exclude, no pins.json.
  const older = { ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" };
  delete older.exclude;
  fs.writeFileSync(manifestPath, `${JSON.stringify(older, null, 2)}\n`);
  fs.rmSync(path.join(root, "pins.json"));
  fs.writeFileSync(path.join(root, "NOTES.md"), "# Notes\n\nOne paragraph\nthat wraps.\n");
  const stopped = spawnSync(process.execPath, [cli, "upgrade", root], { encoding: "utf8" });
  assert.equal(stopped.status, 1);
  assert.match(stopped.stderr, /NOTES\.md:3: paragraph-on-one-line/);
  assert.match(stopped.stderr, /--force/);
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, "0.0.1");
  assert.equal(fs.existsSync(path.join(root, "pins.json")), false);
  run(["upgrade", root, "--force"]);
  assert.notEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, "0.0.1");
  assert.ok(fs.existsSync(path.join(root, "pins.json")));
});

test("upgrade leaves a family instance's own pins.json as it is", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const own = `${JSON.stringify({ pins: [{ kind: "conventions", file: "conventions.json", repo: "robertblust/conventions" }], verify: ["npm test"] }, null, 2)}\n`;
  fs.writeFileSync(path.join(root, "pins.json"), own);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  run(["upgrade", root]);
  assert.equal(fs.readFileSync(path.join(root, "pins.json"), "utf8"), own);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:plan && npm run test:cli`

Expected: FAIL on the new tests: `pins.json` is not written, and the upgrade moves past the wrapped paragraph.

- [ ] **Step 3: Write the pin**

In `lib/instance-files.mjs`, add after `GITIGNORE`:

```js
// The pins an instance declares, in the shape conventions/PINS.md gives pins.json: the one it
// holds from the start is the meta-model release it took, `tooling` in its manifest. `move` is the
// command that moves it, which PINS.md asks of a core-release pin and the family's resync runs.
// The file is the instance's own once written: never hashed, never moved, never replaced.
export const INSTANCE_PINS = `${JSON.stringify({
  pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model", move: "npx --yes 'github:companygraph/meta-model#v{version}' upgrade" }],
}, null, 2)}\n`;
```

In `lib/plan.mjs`, import `INSTANCE_PINS`. In `initPlan`, after the `.gitignore` line:

```js
  // A repository's pins are its own, so a `pins.json` already there is left alone, as `.gitignore` is.
  if (!present.has("pins.json")) writes.set("pins.json", INSTANCE_PINS);
```

In `upgradePlan`, after the block that gives the export's inputs:

```js
  // pins.json is the instance's own once it exists, so it is written only where there is none:
  // an instance made before this release, outside the family. A family instance holds its own,
  // with the conventions pin and the commands the family's resync runs, and it is never read here.
  if (!present.has("pins.json") && held.get("pins.json") === undefined) {
    writes.set("pins.json", INSTANCE_PINS);
    given.push("pins.json");
  }
```

In `bin/companygraph.mjs`'s `upgrade`, change the `present` argument to `new Set([...exportPaths, "pins.json"].filter((path) => existsSync(join(root, path))))`.

- [ ] **Step 4: Ask the form before the upgrade moves anything**

In `bin/companygraph.mjs`, import `{ formCheck }` if Task 2 did not, and in `upgrade`, directly after the manifest is read:

```js
  // The form of the release this moves to, asked before anything moves: an instance made outside
  // the family before this release was never held to it, and an upgrade that left it failing its
  // own next check would hand the owner a red build for work the upgrade did. --force moves anyway.
  const formed = formCheck(root, { exclude: manifest.exclude ?? excludeFor(manifest.units ?? "meta") });
  const unformed = [...formed.hits, ...(formed.error ? [formed.error] : [])];
  if (unformed.length && !given.force)
    throw new Error(
      `The Markdown is not in the form ${PACKAGE.version} holds, so nothing was moved:\n${unformed.map((line) => `  ${line}`).join("\n")}\n` +
        `"companygraph form ${root} --fix" writes what it can into the form; pass --force to move anyway.`,
    );
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:plan && npm run test:cli`

Expected: PASS, `# fail 0`, the existing upgrade tests included. The end-to-end test between two real releases makes its instance with an older release's `init`; if it now stops on the form, read the hit: Markdown an older release wrote out of the form is a finding for the PR description, and the test passes `--force` with a comment naming the release and the file.

- [ ] **Step 6: Build, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck && npm run verify
sh conventions/conventions-format
git add lib bin types verify
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An instance declares its core pin, and upgrade asks the form first

An instance had no pins.json, so nothing could report its tooling pin as behind. init now writes one declaring the core-release pin with the move the family's instances already carry, and upgrade writes it where an instance has none and never touches one that is there.

upgrade runs the form check of the release it moves to before anything moves, lists what fails and stops, and --force moves anyway.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 4: the pin report

**Files:**

- Create: `lib/pins.mjs`, `verify/pins.test.mjs`
- Modify: `bin/companygraph.mjs`, `package.json`, `pins.json`, `.github/workflows/ci.yml`
- Test: `verify/pins.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Produces: `pinReport({ declared, texts, remote }): { lines: PinLine[]; failed: boolean }`, where `declared` is a parsed `pins.json`, `texts` maps a file path to its text, and `remote(repo: string): { tags: string[]; head: string | null } | null` answers null for an upstream that cannot be reached; `PinLine` is `{ status: "current" | "behind" | "unknown" | "unmanaged" | "family" | "missing"; kind: string; file: string; repo: string; pinned: string[]; newest?: string }`; `lsRemote(repo: string)` with the same return as `remote`; `validatePins(obj: unknown)` throwing on a file that cannot be read; the command `companygraph pins [<folder>]`.

- [ ] **Step 1: Write the failing tests**

Create `verify/pins.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { newestTag, pinReport, validatePins, discover } from "../lib/pins.mjs";

const SHA_OLD = "1111111111111111111111111111111111111111";
const SHA_NEW = "2222222222222222222222222222222222222222";
// A fake ls-remote: fixed tags and a fixed HEAD for each upstream, and nothing for one it does not know.
const remotes = {
  "companygraph/meta-model": { tags: ["v0.67.0", "v0.68.0", "v0.9.0", "not-a-version"], head: SHA_NEW },
  "acme/design": { tags: ["v1.2.0", "v1.10.0"], head: SHA_NEW },
  "acme/model": { tags: [], head: SHA_NEW },
};
const remote = (repo) => remotes[repo] ?? null;
const manifest = (tooling) => JSON.stringify({ tooling, core: { version: "0.50.0" } });

test("the newest tag is the highest version, not the last listed or the longest", () => {
  assert.equal(newestTag(["v0.9.0", "v0.10.0", "v0.2.0", "latest"]), "v0.10.0");
  assert.equal(newestTag(["latest"]), null);
});

test("a tag pin at the newest is current, and one before it is behind and names the newest", () => {
  const declared = { pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }, { kind: "npm-tag", file: "package.json", repo: "acme/design" }] };
  const texts = { ".companygraph/manifest.json": manifest("0.68.0"), "package.json": JSON.stringify({ dependencies: { design: "github:acme/design#v1.2.0" } }) };
  const { lines, failed } = pinReport({ declared, texts, remote });
  assert.equal(failed, false);
  assert.deepEqual(lines.map((l) => [l.status, l.newest ?? null]), [["current", "v0.68.0"], ["behind", "v1.10.0"]]);
});

test("a commit pin is current when it is the upstream's HEAD, short or long, and behind when HEAD moved", () => {
  const declared = { pins: [{ kind: "source-commit", file: "source.json", repo: "acme/model" }] };
  const at = (commit) => pinReport({ declared, texts: { "source.json": JSON.stringify({ repo: "acme/model", commit }) }, remote }).lines[0];
  assert.equal(at(SHA_NEW).status, "current");
  assert.equal(at(SHA_NEW.slice(0, 7)).status, "current");
  assert.deepEqual([at(SHA_OLD).status, at(SHA_OLD).newest], ["behind", SHA_NEW.slice(0, 7)]);
});

test("an upstream that cannot be reached is unknown, and that is no failure", () => {
  const declared = { pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/private" }] };
  const texts = { "package.json": JSON.stringify({ dependencies: { p: "github:acme/private#v1.0.0" } }) };
  const { lines, failed } = pinReport({ declared, texts, remote });
  assert.equal(lines[0].status, "unknown");
  assert.equal(failed, false);
});

test("an entry that names no line in its file is missing, and fails the report", () => {
  const declared = { pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/design" }] };
  const { lines, failed } = pinReport({ declared, texts: { "package.json": "{}" }, remote });
  assert.equal(lines[0].status, "missing");
  assert.equal(failed, true);
  assert.equal(pinReport({ declared, texts: {}, remote }).lines[0].status, "missing");
});

test("a pin line the repository holds and pins.json does not declare is unmanaged, and is not asked about", () => {
  let asked = 0;
  const counting = (repo) => (asked++, remote(repo));
  const texts = { "package.json": JSON.stringify({ dependencies: { design: "github:acme/design#v1.2.0" } }) };
  const { lines, failed } = pinReport({ declared: { pins: [] }, texts, remote: counting });
  assert.deepEqual(lines.map((l) => [l.status, l.kind, l.repo]), [["unmanaged", "npm-tag", "acme/design"]]);
  assert.equal(asked, 0);
  assert.equal(failed, false);
});

test("the family's own kinds are reported as the family's and not read or refused", () => {
  const declared = { pins: [{ kind: "conventions", file: "conventions.json", repo: "robertblust/conventions" }] };
  const { lines, failed } = pinReport({ declared, texts: { "conventions.json": JSON.stringify({ repo: "robertblust/conventions", tag: "v1.39.0" }) }, remote });
  assert.equal(lines[0].status, "family");
  assert.equal(failed, false);
});

test("a pins.json that cannot be read is refused by name", () => {
  assert.throws(() => validatePins({}), /no "pins" list/);
  assert.throws(() => validatePins({ pins: [{ kind: "tarball", file: "a", repo: "a/b" }] }), /unknown kind "tarball"/);
  assert.throws(() => validatePins({ pins: [{ kind: "npm-tag", file: "package.json" }] }), /"file" and "repo"/);
  assert.throws(() => validatePins({ pins: [{ kind: "npm-tag", file: "package.json", repo: "--upload-pack=x" }] }), /owner\/repository/);
  assert.doesNotThrow(() => validatePins({ pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }] }));
});

test("an instance's manifest is found as its core-release pin", () => {
  assert.deepEqual(discover(".companygraph/manifest.json", manifest("0.68.0")), [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }]);
});
```

Add to `package.json` `scripts`: `"test:pins": "node --test verify/pins.test.mjs"`.

In `verify/cli.test.mjs`, add:

```js
// The report asks each upstream with git ls-remote; COMPANYGRAPH_REMOTES names a file of fixed
// answers instead, so no test reaches the network.
test("pins reports each pin of a repository and exits 0 when one is behind", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  const remotes = path.join(temp(), "remotes.json");
  fs.writeFileSync(remotes, JSON.stringify({ "companygraph/meta-model": { tags: [`v${version}`, "v999.0.0"], head: null } }));
  const said = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env: { ...process.env, COMPANYGRAPH_REMOTES: remotes } });
  assert.equal(said.status, 0);
  assert.match(said.stdout, /behind\s+core-release companygraph\/meta-model in \.companygraph\/manifest\.json: .* → v999\.0\.0/);
});

test("pins exits 1 when pins.json cannot be read or an entry names no line, and moves nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const remotes = path.join(temp(), "remotes.json");
  fs.writeFileSync(remotes, "{}");
  const env = { ...process.env, COMPANYGRAPH_REMOTES: remotes };
  fs.writeFileSync(path.join(root, "pins.json"), JSON.stringify({ pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/design" }] }));
  const missing = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env });
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /missing\s+npm-tag acme\/design in package\.json/);
  fs.writeFileSync(path.join(root, "pins.json"), "{ not json");
  assert.equal(spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env }).status, 1);
  fs.rmSync(path.join(root, "pins.json"));
  const none = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /no pins\.json/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:pins`

Expected: FAIL, `Cannot find module '…/lib/pins.mjs'`.

- [ ] **Step 3: Write `lib/pins.mjs`**

```js
// The pins a repository declares in pins.json, each judged against what its upstream offers now,
// read and never moved. The kinds, and the files a pin is found in, are the ones
// conventions/PINS.md defines, ported from robertblust/conventions' family/pins.mjs without the
// half that writes: phase 1 of the machinery outside the family reports and moves nothing. The
// family's own kinds, `conventions` and `service-conventions`, are named and not read; the
// family's resync reads them, and phase 2 replaces them.
import { spawnSync } from "node:child_process";

/** @param {string} s */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** @param {string[]} xs */
const uniq = (xs) => [...new Set(xs)];

/**
 * @param {unknown} obj
 * @returns {{ repo: string; commit: string }[]}
 */
function sourceObjects(obj) {
  const one = /** @type {{ repo?: unknown; commit?: unknown }} */ (obj);
  if (one && typeof one === "object" && one.repo && one.commit) return [/** @type {{ repo: string; commit: string }} */ (one)];
  return Object.values(obj ?? {}).filter((v) => v && typeof v === "object" && v.repo && v.commit);
}

/**
 * How each kind reads the value its line pins, and whether that value is a tag or a commit.
 * @type {Record<string, { byTag: boolean; read: (text: string, repo: string) => string[] }>}
 */
export const KINDS = {
  conventions: { byTag: true, read: (text) => [JSON.parse(text).tag].filter(Boolean) },
  "service-conventions": { byTag: true, read: (text) => [JSON.parse(text).tag].filter(Boolean) },
  "npm-tag": { byTag: true, read: (text, repo) => uniq([...text.matchAll(new RegExp(`"github:${esc(repo)}#([^"]+)"`, "g"))].map((m) => /** @type {string} */ (m[1]))) },
  "source-commit": { byTag: false, read: (text, repo) => uniq(sourceObjects(JSON.parse(text)).filter((o) => o.repo === repo).map((o) => o.commit)) },
  "contract-commit": { byTag: false, read: (text, repo) => uniq([...text.matchAll(new RegExp(`${esc(repo)}@([0-9a-f]{7,40}):`, "g"))].map((m) => /** @type {string} */ (m[1]))) },
  "core-release": { byTag: true, read: (text) => [JSON.parse(text).tooling].filter(Boolean) },
};

// The kinds that are the family's own, reported by name and never read.
export const FAMILY_KINDS = new Set(["conventions", "service-conventions"]);

// The files a repository may hold a pin in, beside any its pins.json names.
export const SCANNED = [
  "conventions.json",
  "service-conventions.json",
  "package.json",
  "chat/package.json",
  "source.json",
  "api-sources.json",
  ".companygraph/manifest.json",
  "src/main/resources/api/sources.json",
];

/**
 * The pins a file holds, whether or not pins.json declares them.
 * @param {string} file
 * @param {string} text
 * @returns {{ kind: string; file: string; repo: string }[]}
 */
export function discover(file, text) {
  const base = file.split("/").pop();
  /** @param {string} kind @param {unknown[]} repos */
  const as = (kind, repos) => uniq(/** @type {string[]} */ (repos.filter(Boolean))).map((repo) => ({ kind, file, repo }));
  try {
    if (file === "conventions.json") return as("conventions", [JSON.parse(text).repo]);
    if (file === "service-conventions.json") return as("service-conventions", [JSON.parse(text).repo]);
    if (file.endsWith("api/sources.json")) return as("contract-commit", [...text.matchAll(/"([\w.-]+\/[\w.-]+)@[0-9a-f]{7,40}:/g)].map((m) => m[1]));
    if (base === "package.json") return as("npm-tag", [...text.matchAll(/"github:([\w.-]+\/[\w.-]+)#[^"]+"/g)].map((m) => m[1]));
    if (base === "source.json" || base === "api-sources.json") return as("source-commit", sourceObjects(JSON.parse(text)).map((o) => o.repo));
    if (file === ".companygraph/manifest.json") return JSON.parse(text).tooling ? as("core-release", ["companygraph/meta-model"]) : [];
  } catch {
    return [];
  }
  return [];
}

/**
 * A parsed pins.json, held to the shape PINS.md gives it; throws, naming the entry, where it is not.
 * `move`, `after`, `watch`, `verify` and `release` are the resync's and are not read here.
 * @param {unknown} obj
 * @returns {{ pins: { kind: string; file: string; repo: string }[] }}
 */
export function validatePins(obj) {
  const file = /** @type {{ pins?: unknown }} */ (obj);
  if (!file || !Array.isArray(file.pins)) throw new Error('pins.json has no "pins" list');
  for (const [i, p] of file.pins.entries()) {
    const at = `pins[${i}]`;
    if (!Object.hasOwn(KINDS, p?.kind)) throw new Error(`${at}: unknown kind "${p?.kind}"`);
    if (typeof p.file !== "string" || typeof p.repo !== "string") throw new Error(`${at}: needs "file" and "repo"`);
    if (!/^[\w.-]+\/[\w.-]+$/.test(p.repo) || p.repo.startsWith("-")) throw new Error(`${at}: "repo" is owner/repository, and ${JSON.stringify(p.repo)} is not`);
  }
  return /** @type {{ pins: { kind: string; file: string; repo: string }[] }} */ (file);
}

/** @param {string} tag */
const versionOf = (tag) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag)?.slice(1).map(Number) ?? null;

/**
 * The highest `vMAJOR.MINOR.PATCH` tag among `tags`, or null where there is none.
 * @param {string[]} tags
 * @returns {string | null}
 */
export function newestTag(tags) {
  /** @type {[string, number[]] | null} */
  let best = null;
  for (const tag of tags) {
    const v = versionOf(tag);
    if (!v) continue;
    const i = best ? v.findIndex((n, k) => n !== /** @type {number[]} */ (best)[1][k]) : 0;
    if (!best || (i !== -1 && /** @type {number} */ (v[i]) > /** @type {number} */ (best[1][i]))) best = [tag, v];
  }
  return best ? best[0] : null;
}

/**
 * @typedef {{ tags: string[]; head: string | null } | null} Remote
 * @typedef {{ status: "current" | "behind" | "unknown" | "unmanaged" | "family" | "missing"; kind: string; file: string; repo: string; pinned: string[]; newest?: string }} PinLine
 */

/**
 * Every pin declared, in pins.json's order, then every pin found and not declared. `remote` is asked
 * once per upstream, and only for a declared pin of a kind this reads.
 * @param {{ declared: { pins: { kind: string; file: string; repo: string }[] }; texts: Record<string, string>; remote: (repo: string) => Remote }} ask
 * @returns {{ lines: PinLine[]; failed: boolean }}
 */
export function pinReport({ declared, texts, remote }) {
  /** @type {Map<string, Remote>} */
  const asked = new Map();
  /** @param {string} repo */
  const offered = (repo) => {
    if (!asked.has(repo)) asked.set(repo, remote(repo));
    return /** @type {Remote} */ (asked.get(repo));
  };
  /** @type {PinLine[]} */
  const lines = [];
  for (const d of declared.pins) {
    const base = { kind: d.kind, file: d.file, repo: d.repo };
    const kind = /** @type {{ byTag: boolean; read: (text: string, repo: string) => string[] }} */ (KINDS[d.kind]);
    /** @type {string[]} */
    let pinned = [];
    try {
      pinned = texts[d.file] === undefined ? [] : kind.read(/** @type {string} */ (texts[d.file]), d.repo);
    } catch {
      pinned = [];
    }
    if (FAMILY_KINDS.has(d.kind)) { lines.push({ ...base, status: "family", pinned }); continue; }
    if (!pinned.length) { lines.push({ ...base, status: "missing", pinned }); continue; }
    const now = offered(d.repo);
    const newest = now === null ? null : kind.byTag ? newestTag(now.tags) : now.head;
    if (newest === null) { lines.push({ ...base, status: "unknown", pinned }); continue; }
    // An instance records `tooling` without its v, so tags are compared as versions, not as text.
    const current = kind.byTag
      ? pinned.every((p) => p.replace(/^v/, "") === newest.replace(/^v/, ""))
      : pinned.every((p) => newest.startsWith(p));
    lines.push({ ...base, status: current ? "current" : "behind", pinned, newest: kind.byTag ? newest : newest.slice(0, 7) });
  }
  const found = Object.entries(texts).flatMap(([file, text]) => discover(file, text));
  for (const f of found) {
    if (declared.pins.some((d) => d.kind === f.kind && d.file === f.file && d.repo === f.repo)) continue;
    /** @type {string[]} */
    let pinned = [];
    try {
      pinned = /** @type {{ read: (text: string, repo: string) => string[] }} */ (KINDS[f.kind]).read(/** @type {string} */ (texts[f.file]), f.repo);
    } catch {
      pinned = [];
    }
    lines.push({ ...f, status: "unmanaged", pinned });
  }
  return { lines, failed: lines.some((l) => l.status === "missing") };
}

/**
 * What an upstream on GitHub offers now: its tags and its HEAD, through `git ls-remote` without
 * cloning, or null where it cannot be reached. Git is told never to ask for credentials, since a
 * private or mistyped repository would otherwise wait at a prompt nobody sees.
 * @param {string} repo
 * @returns {Remote}
 */
export function lsRemote(repo) {
  const url = `https://github.com/${repo}.git`;
  const options = { encoding: /** @type {const} */ ("utf8"), timeout: 30_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } };
  const tags = spawnSync("git", ["ls-remote", "--tags", "--refs", url], options);
  const head = spawnSync("git", ["ls-remote", url, "HEAD"], options);
  if (tags.status !== 0 || head.status !== 0) return null;
  return {
    tags: tags.stdout.split("\n").filter(Boolean).map((line) => (line.split("\t")[1] ?? "").replace(/^refs\/tags\//, "")),
    head: head.stdout.split("\t")[0]?.trim() || null,
  };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:pins`

Expected: PASS, `# fail 0`.

- [ ] **Step 5: Add the `pins` command**

In `bin/companygraph.mjs`, import `{ pinReport, lsRemote, validatePins, SCANNED }` from `../lib/pins.mjs`, and add after `form`:

```js
// What each upstream offers, from git ls-remote, or from the file COMPANYGRAPH_REMOTES names, which
// is how the tests answer for the network: an object of repository → { tags, head }, and a
// repository it does not name cannot be reached.
/** @returns {(repo: string) => import("../lib/pins.mjs").Remote} */
function remotes() {
  const fixed = process.env.COMPANYGRAPH_REMOTES;
  if (!fixed) return lsRemote;
  const answers = JSON.parse(readFileSync(fixed, "utf8"));
  return (repo) => answers[repo] ?? null;
}

// The pins one repository declares, each against its upstream now. A pin behind is intent until
// its owner says it is drift, so the report exits 0 when one is, and 1 only when pins.json cannot
// be read or an entry names no line in the file it names. It moves nothing.
/**
 * @param {string[]} argv
 * @returns {number}
 */
function pins(argv) {
  const root = flags(argv)._[0] ?? ".";
  const at = join(root, "pins.json");
  if (!existsSync(at)) {
    console.error(`✗ ${shown(root)} has no pins.json; "companygraph upgrade" writes one into an instance, and "companygraph adopt" into any other repository`);
    return 1;
  }
  let declared;
  try {
    declared = validatePins(JSON.parse(readFileSync(at, "utf8")));
  } catch (error) {
    console.error(`✗ ${at}: ${/** @type {Error} */ (error).message}`);
    return 1;
  }
  /** @type {Record<string, string>} */
  const texts = {};
  for (const file of new Set([...SCANNED, ...declared.pins.map((p) => p.file)]))
    if (existsSync(join(root, file))) texts[file] = readFileSync(join(root, file), "utf8");
  const { lines, failed } = pinReport({ declared, texts, remote: remotes() });
  const width = Math.max(0, ...lines.map((l) => l.status.length));
  /** @type {Record<string, (text: string) => string>} */
  const tone = { current: good, behind: accent, missing: bad };
  console.log(`Pins of ${shown(resolve(root))}`);
  for (const l of lines) {
    const status = (tone[l.status] ?? dim)(l.status.padEnd(width));
    const value = l.status === "family" ? "the family's own; its resync reads it" : `${l.pinned.join(", ") || "no line"}${l.newest && l.status === "behind" ? ` → ${l.newest}` : ""}`;
    console.log(`  ${status}  ${l.kind} ${l.repo} in ${l.file}: ${value}`);
  }
  if (!lines.length) console.log("  no pin is declared or found");
  return failed ? 1 : 0;
}
```

In the dispatch: `else if (command === "pins") process.exitCode = pins(rest);`. In `USAGE`: `  pins [<folder>]     which pins a repository's pins.json declares are behind; moves nothing`. In the header comment: `//   companygraph pins [<folder>]`.

- [ ] **Step 6: Run the CLI tests to see them pass**

Run: `npm run test:pins && npm run test:cli`

Expected: PASS, `# fail 0`.

- [ ] **Step 7: Run the report's tests in CI and in the release's verify list**

In `.github/workflows/ci.yml`, in `verify`, after the step added in Task 1:

```yaml
      - name: The pin report, against a fake ls-remote
        run: npm run test:pins
```

In `windows`, add `&& npm run test:pins` after `npm run test:form`. In `pins.json`, add `"npm run test:pins"` after `"npm run test:form"`.

- [ ] **Step 8: Build, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck && npm run verify
sh conventions/conventions-format
git add lib bin types verify package.json pins.json .github/workflows/ci.yml
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
companygraph pins says which of a repository's pins are behind

A repository outside the family had no report of its pins. companygraph pins reads pins.json, asks each upstream for its newest tag or commit with git ls-remote without cloning, and prints current, behind, unknown, unmanaged or missing for each line, with the family's own kinds named and not read.

A behind pin exits 0, since it is intent until its owner says otherwise, and the report exits 1 only when pins.json cannot be read or an entry names no line. Nothing moves.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 5: `adopt` gives a repository that is not an instance the machinery

**Files:**

- Create: `.github/workflows/repository-check.yml`
- Modify: `lib/instance-files.mjs`, `lib/plan.mjs`, `bin/companygraph.mjs`, `verify/check.mjs`, `pins.json`
- Test: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `form` (Task 2), `INSTANCE_PINS` naming (Task 3), `HOOK`.
- Produces: `NO_PINS: string`; `adoptedManifestOf({ tooling, exclude }): string`; `repositoryWorkflowFor(tag: string): string`; `adoptPlan({ tooling: string; present: Set<string> }): InitPlan`; `adoptedUpgradePlan({ tooling: string; manifest: { tooling?: string; exclude?: string[] }; workflow: string | null; present: Set<string> }): { writes: Map<string, string>; given: string[]; from: string; to: string }`; the command `companygraph adopt [<folder>]`.

- [ ] **Step 1: Write the failing tests**

In `verify/plan.test.mjs`, import `adoptPlan` and `adoptedUpgradePlan`, and add:

```js
test("adopt writes a manifest with tooling and exclude and no core, the workflow, the hook and an empty pins.json", () => {
  const { writes } = adoptPlan({ tooling: "0.69.0", present: new Set() });
  assert.deepEqual([...writes.keys()].sort(), [".companygraph/hooks/commit-msg", ".companygraph/manifest.json", ".github/workflows/companygraph.yml", "pins.json"]);
  assert.deepEqual(JSON.parse(writes.get(".companygraph/manifest.json")), { tooling: "0.69.0", exclude: ["dist"] });
  assert.match(writes.get(".github/workflows/companygraph.yml"), /repository-check\.yml@v0\.69\.0/);
  assert.deepEqual(JSON.parse(writes.get("pins.json")), { pins: [] });
});

test("adopt refuses an instance, and a repository that took the machinery already, by name, pointing at upgrade", () => {
  const refused = adoptPlan({ tooling: "0.69.0", present: new Set([".companygraph/manifest.json", "model/README.md"]) });
  assert.match(refused.refused, /upgrade/);
});

test("adopt keeps a pins.json already there, and refuses a workflow of the same name, naming it", () => {
  assert.equal(adoptPlan({ tooling: "0.69.0", present: new Set(["pins.json"]) }).writes.has("pins.json"), false);
  assert.match(adoptPlan({ tooling: "0.69.0", present: new Set([".github/workflows/companygraph.yml"]) }).refused, /companygraph\.yml/);
});

test("an upgrade of an adopted repository moves tooling and its workflow's ref, keeps its exclude, and vendors no core", () => {
  const workflow = "jobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/repository-check.yml@v0.68.0\n";
  const plan = adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.68.0", exclude: ["dist", "public"] }, workflow, present: new Set(["pins.json"]) });
  assert.deepEqual([...plan.writes.keys()].sort(), [".companygraph/manifest.json", ".github/workflows/companygraph.yml"]);
  assert.deepEqual(JSON.parse(plan.writes.get(".companygraph/manifest.json")), { tooling: "0.69.0", exclude: ["dist", "public"] });
  assert.match(plan.writes.get(".github/workflows/companygraph.yml"), /repository-check\.yml@v0\.69\.0/);
  assert.deepEqual(adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.69.0", exclude: ["dist"] }, workflow: null, present: new Set(["pins.json"]) }).writes.size, 0);
});
```

In `verify/cli.test.mjs`, add:

```js
test("adopt into an empty folder writes the machinery, and check holds it to the form alone", () => {
  const root = temp();
  execFileSync("git", ["init", "-q"], { cwd: root });
  const said = run(["adopt", root]);
  assert.match(said, /adopted/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/commit-msg")));
  fs.writeFileSync(path.join(root, "README.md"), "# A site\n\nOne paragraph on one line.\n");
  assert.match(run(["check", root]), /in the one form/);
  fs.writeFileSync(path.join(root, "README.md"), "# A site\n\nOne paragraph\nthat wraps.\n");
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 1);
});

test("adopt refuses an instance by name and points at upgrade, writing nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = [...filesOf(root).keys()].sort();
  const refused = spawnSync(process.execPath, [cli, "adopt", root], { encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /upgrade/);
  assert.deepEqual([...filesOf(root).keys()].sort(), before);
});

test("upgrade moves an adopted repository's tooling and workflow, and vendors no core into it", () => {
  const root = temp();
  run(["adopt", root]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ tooling: "0.0.1", exclude: ["dist"] }));
  const workflowPath = path.join(root, ".github/workflows/companygraph.yml");
  fs.writeFileSync(workflowPath, fs.readFileSync(workflowPath, "utf8").replace(/@v[\d.]+/, "@v0.0.1"));
  run(["upgrade", root]);
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, version);
  assert.match(fs.readFileSync(workflowPath, "utf8"), new RegExp(`repository-check\\.yml@v${version}`));
  assert.equal(fs.existsSync(path.join(root, "meta")), false);
});

test("the repository workflow holds the Markdown to the form with the checker it checked out", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/repository-check.yml"), "utf8");
  assert.match(yml, /run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
  assert.doesNotMatch(yml, /check-instance/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:plan && npm run test:cli`

Expected: FAIL: `adoptPlan` is not exported, `adopt is no command of this tooling`.

- [ ] **Step 3: Write the reusable workflow**

Create `.github/workflows/repository-check.yml`, its `ref:` the version in `package.json` at this commit:

```yaml
# The Markdown form, for a repository that took CompanyGraph's tooling with `companygraph adopt`
# and holds no model of its own: a site, or a service that draws a model at a commit. It calls
# this at the release its `.companygraph/manifest.json` names:
#
#   jobs:
#     companygraph:
#       uses: companygraph/meta-model/.github/workflows/repository-check.yml@v0.69.0
#
# An instance calls instance-check.yml instead, which runs the same form after the model's checks.
# The ref below is this file's own release, for the reason instance-check.yml gives: the runner
# cannot see how the caller spelled the tag, so the form command compares its own version against
# the manifest's and refuses when they differ. Before tagging a release, set this ref, the one in
# instance-check.yml and `version` in package.json to that tag together.
name: companygraph
on:
  workflow_call:
jobs:
  companygraph:
    name: companygraph
    runs-on: ubuntu-latest
    timeout-minutes: 5
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: "22"
      - name: the checker, at the release this workflow is
        uses: actions/checkout@v7
        with:
          repository: companygraph/meta-model
          ref: v0.68.0
          path: .companygraph-checker
      - name: every Markdown file is in the one form
        run: node .companygraph-checker/bin/companygraph.mjs form .
```

- [ ] **Step 4: Hold both refs to the release**

In `verify/check.mjs`'s `"release manifest"` check, replace the block that reads `.github/workflows/instance-check.yml` with a loop over both files:

```js
      for (const file of [".github/workflows/instance-check.yml", ".github/workflows/repository-check.yml"]) {
        const workflow = read(file);
        if (workflow === null) { fail(`${file} is missing`); continue; }
        const refs = [...workflow.matchAll(/^\s+ref:\s*(\S+)\s*$/gm)].map((r) => r[1]);
        if (refs.length !== 1 || refs[0] !== `v${pkg.version}`)
          fail(`${file} checks the checker out at ${refs.join(", ") || "no ref"}, and package.json says ${pkg.version}; the ref is v${pkg.version}, or every repository on this release runs the one before`);
      }
```

In `pins.json`, replace the second `release` command so it moves both files:

```json
"node -e \"const fs=require('fs');for(const f of ['.github/workflows/instance-check.yml','.github/workflows/repository-check.yml'])fs.writeFileSync(f, fs.readFileSync(f,'utf8').replace(/ref: v[0-9.]+/, 'ref: v{version}'))\""
```

Run: `npm run verify`

Expected: `✓ … checks passed`. Change the new file's ref to `v0.0.1`, see `repository-check.yml checks the checker out at v0.0.1`, and put it back.

- [ ] **Step 5: Write what `adopt` writes**

In `lib/instance-files.mjs`, add after `INSTANCE_PINS`:

```js
// The pins.json a repository that is not an instance starts with: it pins nothing it was given.
export const NO_PINS = `${JSON.stringify({ pins: [] }, null, 2)}\n`;

// The manifest of a repository that took the tooling and holds no model: the release it runs and
// what the form leaves out. No `core` and no `files`, because nothing is vendored into it, and
// that absence is how `check` and `upgrade` tell it from an instance.
/** @type {(manifest: { tooling: string; exclude: string[] }) => string} */
export const adoptedManifestOf = ({ tooling, exclude }) => `${JSON.stringify({ tooling, exclude }, null, 2)}\n`;

// Its CI: the form alone, through the second reusable workflow, at the tooling's own release.
/** @type {(tag: string) => string} */
export const repositoryWorkflowFor = (tag) =>
  `name: companygraph\non:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/repository-check.yml@${tag}\n`;
```

In `lib/plan.mjs`, import `adoptedManifestOf`, `repositoryWorkflowFor`, `NO_PINS` and `HOOK` (already imported), and add after `upgradePlan`:

```js
// A repository that is not an instance takes the machinery and no model: a manifest naming the
// release and what the form leaves out, the workflow that runs the form, the seat hook, and an
// empty pins.json where it has none. One that holds a manifest already is an instance, or took
// the machinery before, and either way `upgrade` is what moves it.
/**
 * @param {{ tooling: string; present: Set<string> }} ask
 * @returns {InitPlan}
 */
export function adoptPlan({ tooling, present }) {
  if (present.has(".companygraph/manifest.json"))
    return { refused: `.companygraph/manifest.json is already there, so this is an instance or took the tooling before; "companygraph upgrade" moves it, and nothing was written.` };
  /** @type {Map<string, string>} */
  const writes = new Map([
    [".companygraph/manifest.json", adoptedManifestOf({ tooling, exclude: ["dist"] })],
    [".github/workflows/companygraph.yml", repositoryWorkflowFor(`v${tooling}`)],
    [".companygraph/hooks/commit-msg", HOOK],
  ]);
  if (!present.has("pins.json")) writes.set("pins.json", NO_PINS);
  const taken = [...writes.keys()].filter((path) => present.has(path)).sort();
  if (taken.length)
    return { refused: `These are there already, so nothing was written:\n${taken.map((p) => `  ${p}`).join("\n")}` };
  return { writes };
}

// Moving a repository that took the machinery: the manifest's `tooling`, its own `exclude` kept,
// and the workflow's ref, matched on the full reusable-workflow path as an instance's is. pins.json
// is written where it has none. No core is vendored into it.
/**
 * @param {{ tooling: string; manifest: { tooling?: string; exclude?: string[] }; workflow: string | null; present: Set<string> }} ask
 * @returns {{ writes: Map<string, string>; given: string[]; from: string; to: string }}
 */
export function adoptedUpgradePlan({ tooling, manifest, workflow, present }) {
  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {string[]} */
  const given = [];
  if (manifest.tooling !== tooling) {
    writes.set(".companygraph/manifest.json", adoptedManifestOf({ tooling, exclude: manifest.exclude ?? ["dist"] }));
    const PIN = /companygraph\/meta-model\/\.github\/workflows\/repository-check\.yml@[^\s"']+/g;
    const next = workflow?.replace(PIN, `companygraph/meta-model/.github/workflows/repository-check.yml@v${tooling}`);
    if (workflow && next !== workflow) writes.set(".github/workflows/companygraph.yml", /** @type {string} */ (next));
  }
  if (!present.has("pins.json")) {
    writes.set("pins.json", NO_PINS);
    given.push("pins.json");
  }
  return { writes, given, from: manifest.tooling ?? "unknown", to: tooling };
}
```

- [ ] **Step 6: Share the hook's setup between `init` and `adopt`**

In `bin/companygraph.mjs`, move the block in `init` that starts `if (/** @type {Map<string, string>} */ (plan.writes).has(".companygraph/hooks/commit-msg")) {` and ends at its closing brace into a function, unchanged inside, and call it from `init` in the same place:

```js
// The seat hook made executable and, where git and the repository let it, put in use; what was
// done or why not is said, as init always said it.
/** @param {string} root */
function useHook(root) {
  chmodSync(join(root, ".companygraph/hooks/commit-msg"), 0o755);
  // … the rest of the block, from `const top = gitTop(root);` to its last `else { … }`, unchanged …
}
```

```js
  if (/** @type {Map<string, string>} */ (plan.writes).has(".companygraph/hooks/commit-msg")) useHook(root);
```

Run: `npm run test:cli`

Expected: PASS for every hook test that passed before; this step changes no behavior.

- [ ] **Step 7: Add the `adopt` command and give `upgrade` and `check` their branch**

In `bin/companygraph.mjs`, import `adoptPlan` and `adoptedUpgradePlan` from `../lib/plan.mjs`, and add after `upgrade`:

```js
// The machinery for a repository that is not an instance: the form, its workflow, the seat hook
// and a pins.json. A folder that is not there yet is made, as init makes one.
/** @param {string[]} argv */
function adopt(argv) {
  const root = flags(argv)._[0] ?? ".";
  const plan = adoptPlan({ tooling: PACKAGE.version, present: present(root) });
  if (plan.refused) throw new Error(`${root}: ${plan.refused}`);
  const written = writePlan(root, /** @type {Map<string, string>} */ (plan.writes));
  console.log(`${good("✓")} ${shown(root)} adopted at ${PACKAGE.version}: ${written.join(", ")}`);
  console.log(`  its Markdown is held to the one form, leaving out dist/; list more paths under "exclude" in .companygraph/manifest.json`);
  console.log(`  the seat hook is written; with no model here it has no seats to judge commits against, so it lets every commit through`);
  useHook(root);
  console.log(`  run "npx github:companygraph/meta-model#v${PACKAGE.version} check ${root}" for the form, and "… pins ${root}" for the pins`);
}
```

In `upgrade`, directly after the form check added in Task 3, branch for an adopted repository:

```js
  // A manifest with no core is a repository that took the machinery and holds no model; its
  // upgrade moves the release it runs and its workflow, and vendors nothing into it.
  if (!manifest.core) {
    const workflowPath = join(root, ".github/workflows/companygraph.yml");
    const adopted = adoptedUpgradePlan({
      tooling: PACKAGE.version,
      manifest,
      workflow: existsSync(workflowPath) ? read(workflowPath) : null,
      present: new Set(["pins.json"].filter((path) => existsSync(join(root, path)))),
    });
    if (!adopted.writes.size) {
      console.log(`already on ${adopted.to}; nothing to do.`);
      return "nothing";
    }
    if (given["dry-run"]) {
      console.log(`tooling ${adopted.from} → ${adopted.to}, if this runs:`);
      for (const path of adopted.writes.keys()) console.log(`  write   ${path}`);
      return "planned";
    }
    const written = writePlan(root, adopted.writes);
    console.log(`tooling ${adopted.from} → ${adopted.to}: ${written.length} written`);
    if (adopted.given.length) console.log(`  written, since the repository had none, and its own from now on: ${adopted.given.join(", ")}`);
    return "done";
  }
```

`read` is defined further down in `upgrade`; move its two lines (`/** @param {string} path */` and `const read = …`) above the form check so both branches use it.

In `check`, before `checkPath` is imported:

```js
  // A repository that took the machinery and holds no model is held to the form alone.
  const manifest = manifestAt(root);
  if (manifest && !manifest.core) return form([root]);
```

In the dispatch: `else if (command === "adopt") adopt(rest);`. In `USAGE`: `  adopt [<folder>]    give a repository that is not an instance the form check, its workflow, the seat hook and a pins.json`. In the header comment: `//   companygraph adopt [<folder>]`.

- [ ] **Step 8: Run the tests to see them pass**

Run: `npm run test:plan && npm run test:cli && npm run verify`

Expected: PASS, `# fail 0`, and `✓ … checks passed`.

- [ ] **Step 9: Build, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck
sh conventions/conventions-format
git add lib bin types verify pins.json .github/workflows/repository-check.yml
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
companygraph adopt gives a repository with no model the machinery

A site or a service that draws a model at a commit is not an instance, and had no way to take the form or the pin report. adopt writes it a manifest with tooling and exclude and no core, a workflow calling the new repository-check.yml, the seat hook and an empty pins.json, and refuses an instance by name, pointing at upgrade.

check holds such a repository to the form alone, and upgrade moves its tooling and its workflow's ref without vendoring core into it. The release check holds both reusable workflows' refs to the package version, and the release command moves both.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 6: the menu and the README

**Files:**

- Modify: `bin/companygraph.mjs`, `README.md`
- Test: `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `adopt`, `pins` (Tasks 4 and 5).

- [ ] **Step 1: Write the failing test**

```js
test("the menu offers adopt and the pin report after the report by seat, and keeps the first five where they were", () => {
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  assert.match(listed, /1\S*\s+Make a model/);
  assert.match(listed, /5\S*\s+Report by seat/);
  assert.match(listed, /6\S*\s+Hold a repository/);
  assert.match(listed, /7\S*\s+Report pins/);
  const root = temp();
  const out = spawnSync(process.execPath, [cli, "menu"], { input: `6\n${root}\n`, encoding: "utf8" });
  assert.match(out.stdout, /adopted/);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm run test:cli`

Expected: FAIL on `Hold a repository`.

- [ ] **Step 3: Add the two entries**

In `menu`, after the `Report by seat` entry:

```js
    ["Hold a repository", "a site or service with no model: the form check, its workflow and the seat hook", async () => {
      adopt([await folder("Which folder?", ".")]);
      return 0;
    }],
    ["Report pins", "which of a repository's pins are behind; nothing moves", async () => pins([await folder("Which folder?", ".")])],
```

Change the menu's mention in `USAGE` and the header comment from `a menu over init, check, upgrade, obsidian and seats` to `a menu over init, check, upgrade, obsidian, seats, adopt and pins`.

- [ ] **Step 4: Run it to see it pass**

Run: `npm run test:cli`

Expected: PASS, `# fail 0`, the menu tests that read Quit's number off the screen included.

- [ ] **Step 5: Say it in the README**

In `README.md`: in the file table, the `bin/companygraph.mjs` row reads `the command: init, upgrade, check, form, pins, adopt, obsidian, commits and seats, with a menu over init, check, upgrade, obsidian, seats, adopt and pins`, and add the rows `form/                      the one Markdown form: markdownlint's rules and the two the family wrote` and `.github/workflows/repository-check.yml   the form, for a repository that adopted the tooling and holds no model`. In the paragraph that lists the commands, add `form`, `pins` and `adopt` to the list and the menu's. After the paragraph on `check`, add three paragraphs, each on one line:

```markdown
`form [<folder>]` holds every Markdown file of a repository to one form, the family's: markdownlint-cli2 at the version the release pins, with the rules in `form/`, over every file but what git ignores and the paths under `exclude` in the manifest, which an instance starts as `dist` and its units folder. The form is fixed; a repository can exclude paths and cannot turn a rule on or off. `--fix` writes every hit markdownlint can write. `check` runs it after the model's checks and both reusable workflows run it, so a form failure fails like any other. The first run fetches the tool with npx and later ones use its cache. `upgrade` runs the form of the release it moves to before it moves anything, and stops on a failure unless `--force`.

`pins [<folder>]` reads `pins.json`, in the shape robertblust/conventions' `PINS.md` gives it, and asks each pin's upstream for its newest version tag or its HEAD with `git ls-remote`, without cloning. Each line says `current`, `behind` with the newest, `unknown` when the upstream cannot be reached, `unmanaged` for a pin the repository's files hold and `pins.json` does not declare, or `missing` for an entry that names no line. A pin that is behind is intent until its owner says otherwise, so it exits 0, and 1 only when `pins.json` cannot be read or an entry is missing. It moves nothing. `init` writes a `pins.json` declaring the instance's own `core-release` pin, and `upgrade` writes one where an instance has none.

`adopt [<folder>]` gives a repository that is not an instance, a site or a service that draws a model at a commit, the same form and pins: a manifest with `tooling` and `exclude` and no core, a workflow calling `repository-check.yml`, the seat hook and an empty `pins.json`. `check` holds it to the form alone, and `upgrade` moves its tooling and its workflow without vendoring core. In an instance it refuses and points at `upgrade`.
```

- [ ] **Step 6: Build, check, commit**

```bash
npm run build && npm run build:check && npm run typecheck && npm run verify
sh conventions/conventions-format && sh conventions/conventions-check
git add bin types verify README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The menu and the README offer adopt and the pin report

The two new commands were reachable only by name. The menu offers them after the report by seat, so the first five keep their numbers, and the README says what form, pins and adopt do and what each leaves alone.

Verified: <the commands actually run and what they printed>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## Task 7: the whole suite, the family's instances, and the pull request

- [ ] **Step 1: Run everything the release's verify list runs**

```bash
npm run build:check && npm run typecheck && npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:form && npm run test:pins && npm run test:cli && npm run test:ids && npm run test:localization && npm run test:seats && npm run test:untar && npm run test:fetch-core && npm run test:obsidian
```

Expected: every run passes.

- [ ] **Step 2: Move the three instances in throwaway clones**

The spec says the family's three instances are already held to the same form, so an upgrade must find nothing to stop on. Clone each at its main commit into the scratch directory and run this checkout's CLI; never write into the clones under `~/git`:

```bash
for repo in robertblust/mental-model companygraph/mental-model guestgraph/mental-model; do
  dir=$(mktemp -d)/$(echo "$repo" | tr / -)
  git clone -q "https://github.com/$repo.git" "$dir"
  node bin/companygraph.mjs form "$dir"
  node bin/companygraph.mjs upgrade "$dir"
  node bin/companygraph.mjs pins "$dir"
done
```

Expected: `form` passes on all three with the default `exclude`; `upgrade` says nothing to do where the clone's `tooling` is already this checkout's version, and otherwise moves it and keeps its `pins.json` byte for byte (`git -C "$dir" diff --stat pins.json` is empty); `pins` names the `conventions` pin as the family's and the `core-release` pin as current or behind against meta-model's newest tag. A form hit in one of them is a finding: name it in the pull request and stop; do not fix an instance from this branch.

- [ ] **Step 3: Run `adopt` on a throwaway clone of a site**

```bash
dir=$(mktemp -d)/blust
git clone -q https://github.com/robertblust/robertblust.github.io.git "$dir"
node bin/companygraph.mjs adopt "$dir"
node bin/companygraph.mjs check "$dir"
node bin/companygraph.mjs pins "$dir"
```

Expected: `adopt` keeps the site's own `pins.json`, `check` holds its Markdown to the form, and `pins` reports its declared pins. A site whose own conventions job passes and whose `check` fails here has Markdown the default `exclude` reaches and its own `format-exclude` does not; say which paths in the pull request.

- [ ] **Step 4: Open the pull request and stop**

Read the last two merged pull requests first (`gh pr list --state merged --limit 2 --json number`, then `gh pr view <n> --json body`), and write the body in their register: prose paragraphs with no headings and no lists, opening with the gap the change closes, then what changed, then what it costs downstream; one line `Release notes to write at tagging: …` drafted for a minor release, saying that every instance now carries the form check and a `pins.json`, that `upgrade` stops on Markdown out of the form unless `--force`, and that `adopt` and `pins` are new; the decisions this plan made that the spec left open; the findings of Steps 2 and 3; then one `Verified:` sentence naming the commands that ran, and the `🤖 Generated with [Claude Code](https://claude.com/claude-code)` line.

```bash
git push -u origin the-machinery-phase-1
gh pr create --title "The machinery outside the family, phase 1" --body-file <the body>
```

Report the pull request's address and its checks to the owner and wait. Merging, the tag, the release and the re-pins of the three instances are the owner's word, each.

## After the release, on the owner's word

companygraph.io's `/cli/` page restates the menu, so it changes with the release that ships it: the two entries in the page's drawing of the menu, and a sentence each for `form`, `pins` and `adopt` in the walk-through. That is a pull request in companygraph/companygraph.github.io, opened once the release exists, so that the page never names a command no release has.
