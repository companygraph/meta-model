# The gate a repository runs — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `init`, `adopt` and `upgrade` take `--gate github|git|none`, the manifest records it, and the `git` gate writes `pre-commit` and `pre-merge-commit` hooks that run `check` and then `pins.json`'s `verify` commands.

**Architecture:** The texts a gate writes (hooks, the agent-file sentence, the manifest field) live in `lib/instance-files.mjs`. What a command writes and removes is decided by the pure plans in `lib/plan.mjs`: `initPlan` and `adoptPlan` take `gate`, and a new `gatePlan` decides a move from one gate to another, which `upgradePlan` and `adoptedUpgradePlan` call. `bin/companygraph.mjs` reads `--gate`, says whether the folder is a git repository, carries out the plan and points `core.hooksPath` at the hooks.

**Tech Stack:** Node 22, ES modules, `node:test`, POSIX `sh` for the hooks, JSDoc types checked by `tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-10-06-the-gate-a-repository-runs-design.md`

## Global Constraints

- The gate values are exactly `github`, `git` and `none`; an absent `gate` in a manifest means `github`, and `github` is the default of `init`, `adopt` and `upgrade`.
- A manifest records `gate` only when it is not `github`, so every manifest written before this release, and every default one after, reads byte for byte as before.
- `--gate git` is refused by name in a folder that is not a git repository, and beside `--no-hook`.
- Every hook is the repository's own once written: not in the manifest's `files`, never hashed, never replaced by `upgrade`.
- `upgrade` removes a gate hook only while its text equals the text this release writes; an edited one refuses the move by name, and `--force` removes it and says so. The workflow is the tooling's and is removed without that guard.
- No test reaches the network: the hooks honor `COMPANYGRAPH_CLI` as the seat hook does, and the tests point it at a stub.
- Exit codes are read on their own in every test and every shell step, never through a pipe.
- Commits on this branch are authored by the seat whose work they are, `Implementer <implementer@companygraph.io>` for a task, with `Process: Delivery`, `Phase: Implement`, `Track: Code` and a `Verified:` line, as `conventions/WORKING.md` and `conventions/WRITING.md` say.

## Review Focus

- A gate hook whose `check` cannot run at all (no `npx`, offline with an empty cache) must refuse the commit, unlike the seat hook, which lets a commit through because a pull request runs it again: on the `git` gate nothing runs it again. Pinned in Task 2.
- `git commit -a` and a commit in a worktree hand the hook an absolute `GIT_INDEX_FILE`; the clean-tree guard must read it before the hook unsets it, or `commit -a` is refused as leaving changes out. Pinned in Task 2.
- A `verify` command with spaces and quotes, `sh conventions/conventions-sync check`, must run as one command line, not split per word. Pinned in Task 2.
- `pins.json` that is not JSON must refuse the commit with a sentence, not pass it silently. Pinned in Task 2.
- `upgrade --gate git` on a repository whose `core.hooksPath` points at a folder of its own must leave the setting alone and say the tooling's hooks are not in use. Pinned in Task 5.

---

### Task 1: The gate in the manifest and in the agent file

**Files:**

- Modify: `lib/instance-files.mjs` (`adoptedManifestOf`, `manifestOf`, `agentFilesFor`; add `GATES`)
- Test: `verify/instance-files.test.mjs`

**Interfaces:**

- Produces: `export const GATES = ["github", "git", "none"]`; `manifestOf({ ..., gate })` and `adoptedManifestOf({ tooling, exclude, gate })`, each writing `gate` only when it is given and is not `"github"`; `agentFilesFor({ agent, name, units, gate = "github" })`.

- [ ] **Step 1: Write the failing tests**

Add to `verify/instance-files.test.mjs` (import `GATES`, `manifestOf`, `adoptedManifestOf`, `agentFilesFor` from `../lib/instance-files.mjs` beside what it imports already):

```js
test("the gates are github, git and none, and a manifest records one only when it is not github", () => {
  assert.deepEqual(GATES, ["github", "git", "none"]);
  const base = { tooling: "1.0.0", core: { version: "1.0.0", shape: 3, source: "bundled" }, units: "meta", files: {} };
  assert.equal(manifestOf(base), manifestOf({ ...base, gate: "github" }));
  assert.equal(JSON.parse(manifestOf({ ...base, gate: "git" })).gate, "git");
  assert.equal(JSON.parse(manifestOf({ ...base, gate: "none" })).gate, "none");
  assert.equal(adoptedManifestOf({ tooling: "1.0.0", exclude: ["dist"] }), adoptedManifestOf({ tooling: "1.0.0", exclude: ["dist"], gate: "github" }));
  assert.equal(JSON.parse(adoptedManifestOf({ tooling: "1.0.0", exclude: ["dist"], gate: "git" })).gate, "git");
});

test("the agent file says which gate holds the instance", () => {
  const said = (gate) => agentFilesFor({ agent: "claude", name: "Acme", units: "meta", gate }).get("AGENTS.md");
  assert.match(said(undefined), /checked by CI, and locally by/);
  assert.match(said("github"), /checked by CI, and locally by/);
  assert.match(said("git"), /checked on every commit by the pre-commit hook in `\.companygraph\/hooks\/`/);
  assert.match(said("git"), /`git commit --no-verify` skips it and is not used here/);
  assert.doesNotMatch(said("git"), /CI/);
  assert.match(said("none"), /nothing gates this folder/);
  assert.doesNotMatch(said("none"), /CI/);
  // The rest of the paragraph is the same whatever the gate.
  for (const gate of GATES) assert.match(said(gate), /What no check reads is each schema's `## Writing rules`/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:instance-files` Expected: FAIL, `GATES` is not exported.

- [ ] **Step 3: Implement**

In `lib/instance-files.mjs`, beside `INSTANCE_PINS`:

```js
// What gates a repository: the workflow on GitHub, the hooks in git, or nothing, for a folder
// with no git, which stays at the first level. A manifest with no `gate` is a github one.
export const GATES = ["github", "git", "none"];
// Only a gate other than the default is written, so a default manifest reads as it always has.
/** @type {(gate: string | undefined) => { gate?: string }} */
const gateField = (gate) => (gate && gate !== "github" ? { gate } : {});
```

Change `adoptedManifestOf` to:

```js
/** @type {(manifest: { tooling: string; exclude: string[]; gate?: string }) => string} */
export const adoptedManifestOf = ({ tooling, exclude, gate }) => `${JSON.stringify({ tooling, ...gateField(gate), exclude }, null, 2)}\n`;
```

Change `manifestOf`'s signature and body to carry `gate` after `tooling`:

```js
export function manifestOf({ tooling, gate, core, units, packs = [], exclude, files }) {
  return `${JSON.stringify({ tooling, ...gateField(gate), core, units, packs, ...(exclude ? { exclude } : {}), files }, null, 2)}\n`;
}
```

and add `gate?: string` to the JSDoc type its `@param` names (the `Manifest` typedef in the same file).

In `agentFilesFor`, take `gate = "github"` and replace the paragraph that begins "The mechanical half of those rules is checked by CI" with one built from the gate's sentence and the unchanged rest:

```js
  const checked = {
    github: "The mechanical half of those rules is checked by CI, and locally by `npx github:companygraph/meta-model#v<tooling> check`, where `<tooling>` is the release `.companygraph/manifest.json` names.",
    git: "The mechanical half of those rules is checked on every commit by the pre-commit hook in `.companygraph/hooks/`, which runs `npx github:companygraph/meta-model#v<tooling> check` and then the `verify` commands in `pins.json`, where `<tooling>` is the release `.companygraph/manifest.json` names; `git commit --no-verify` skips it and is not used here.",
    none: "The mechanical half of those rules is checked when someone runs `npx github:companygraph/meta-model#v<tooling> check`, where `<tooling>` is the release `.companygraph/manifest.json` names: nothing gates this folder, and the Obsidian plugin runs the checks while a page is edited.",
  }[gate];
```

The paragraph becomes `` `${checked} What no check reads is each schema's ...` `` with everything after "What no check reads" exactly as it is today.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:instance-files && npm run test:plan && npm run typecheck` Expected: PASS; `test:plan` is run because `initPlan` and `upgradePlan` call `manifestOf`, and none of their output may change yet.

- [ ] **Step 5: Commit**

```bash
git add lib/instance-files.mjs verify/instance-files.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A manifest names its gate, and the agent file says which

Verified: test:instance-files, test:plan and typecheck pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: The gate hooks, and what they refuse

**Files:**

- Modify: `lib/instance-files.mjs` (add `GATE_HOOK`, `MERGE_HOOK`)
- Create: `verify/gate.test.mjs`
- Modify: `package.json` (script `test:gate`), `.github/workflows/ci.yml` (a step that runs it, beside "A commit's seat")

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `export const GATE_HOOK` (the text of `.companygraph/hooks/pre-commit`) and `export const MERGE_HOOK` (the text of `.companygraph/hooks/pre-merge-commit`).

- [ ] **Step 1: Write the failing tests**

Create `verify/gate.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GATE_HOOK, MERGE_HOOK } from "../lib/instance-files.mjs";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-gate-"));
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Robert", "-c", "user.email=mira@example.invalid", ...args], { cwd, encoding: "utf8", stdio: "pipe" });
const commit = (cwd, env, ...args) => spawnSync("git", ["-c", "user.name=Robert", "-c", "user.email=mira@example.invalid", "commit", "-q", ...args], { cwd, encoding: "utf8", env: { ...process.env, ...env } });

// A stub for the checker the hook runs: it passes, or fails with a sentence, as STUB_CHECK says.
function stub(dir) {
  const file = path.join(dir, "stub.mjs");
  fs.writeFileSync(file, 'if (process.env.STUB_CHECK === "fail") { console.error("✗ stub: the model fails"); process.exit(1); }\n');
  return file;
}

// A repository on the git gate: the manifest, the two gate hooks, core.hooksPath at them, and
// a first commit made without the hooks so every test starts from a clean tree.
function gated({ verify } = {}) {
  const dir = temp();
  git(dir, "init", "-q");
  fs.mkdirSync(path.join(dir, ".companygraph/hooks"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph/manifest.json"), '{\n  "tooling": "0.0.0",\n  "gate": "git",\n  "exclude": ["dist"]\n}\n');
  fs.writeFileSync(path.join(dir, ".companygraph/hooks/pre-commit"), GATE_HOOK, { mode: 0o755 });
  fs.writeFileSync(path.join(dir, ".companygraph/hooks/pre-merge-commit"), MERGE_HOOK, { mode: 0o755 });
  if (verify !== undefined) fs.writeFileSync(path.join(dir, "pins.json"), typeof verify === "string" ? verify : JSON.stringify({ pins: [], verify }));
  git(dir, "add", "-A");
  git(dir, "commit", "-q", "-m", "start");
  git(dir, "config", "core.hooksPath", ".companygraph/hooks");
  return dir;
}

test("a clean commit whose check passes goes through", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub(dir) };
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, env, "-m", "a");
  assert.equal(r.status, 0, r.stderr);
});

test("a failing check refuses the commit and says what failed", () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(dir), STUB_CHECK: "fail" }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /the model fails/);
  assert.match(r.stderr, /nothing was committed/);
});

test("an unstaged change or an untracked file refuses the commit, since the checks read the tree", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub(dir) };
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  fs.writeFileSync(path.join(dir, "b.md"), "# B\n");
  const untracked = commit(dir, env, "-m", "a");
  assert.notEqual(untracked.status, 0);
  assert.match(untracked.stderr, /leaves out/);
  fs.rmSync(path.join(dir, "b.md"));
  fs.writeFileSync(path.join(dir, "a.md"), "# A, edited after staging\n");
  const unstaged = commit(dir, env, "-m", "a");
  assert.notEqual(unstaged.status, 0);
  assert.match(unstaged.stderr, /leaves out/);
});

test("commit -a takes every change, so it is not refused as leaving one out", () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, ".companygraph/manifest.json"), '{\n  "tooling": "0.0.0",\n  "gate": "git",\n  "exclude": ["dist", "x"]\n}\n');
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(dir) }, "-a", "-m", "all");
  assert.equal(r.status, 0, r.stderr);
});

test("each verify command runs as one command line, and a failing one refuses the commit", () => {
  const dir = gated({ verify: ["sh -c 'echo ran > verified.txt'", "sh -c 'exit 0'"] });
  fs.writeFileSync(path.join(dir, ".gitignore"), "verified.txt\n");
  git(dir, "add", ".gitignore");
  const passed = commit(dir, { COMPANYGRAPH_CLI: stub(dir) }, "-m", "ignore");
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(fs.readFileSync(path.join(dir, "verified.txt"), "utf8"), "ran\n");
  fs.writeFileSync(path.join(dir, "pins.json"), JSON.stringify({ pins: [], verify: ["sh -c 'echo nope >&2; exit 2'"] }));
  git(dir, "add", "pins.json");
  const failed = commit(dir, { COMPANYGRAPH_CLI: stub(dir) }, "-m", "fail");
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /nope/);
});

test("a pins.json that is not JSON refuses the commit with a sentence", () => {
  const dir = gated({ verify: "{ not json" });
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(dir) }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /pins\.json could not be read/);
});

test("a check that cannot run at all refuses the commit, since nothing runs it again", () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  // No COMPANYGRAPH_CLI, and a PATH with git and sh but no npx.
  const bin = temp();
  for (const tool of ["git", "sh", "sed", "head", "node"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
    if (found && tool !== "node") fs.symlinkSync(found, path.join(bin, tool));
  }
  const r = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "commit", "-q", "-m", "a"], { cwd: dir, encoding: "utf8", env: { PATH: bin, HOME: process.env.HOME } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /check could not run/);
});

test("a merge is gated as a commit is", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub(dir) };
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  git(dir, "checkout", "-q", "-");
  const refused = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "merge", "--no-ff", "-m", "merge", "side"], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env, STUB_CHECK: "fail" } });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /the model fails/);
});
```

Add to `package.json` scripts, beside `test:seats`: `"test:gate": "node --test verify/gate.test.mjs"`. Add to `.github/workflows/ci.yml`, after the step named "A commit's seat, judged against what governs it":

```yaml
      - name: A commit and a merge, gated on the machine
        run: npm run test:gate
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:gate` Expected: FAIL, `GATE_HOOK` is not exported.

- [ ] **Step 3: Implement**

Add to `lib/instance-files.mjs`, after `HOOK`. Backslashes and `${` are escaped as `HOOK` escapes them, because the text is a template literal:

```js
// The git gate's pre-commit hook, written once and the repository's own from then on. It runs
// `check` at the release the manifest's `tooling` names and then each command in pins.json's
// `verify`, read each time, so an upgrade moves what it runs without touching it. Unlike the seat
// hook, a check that cannot run refuses the commit: on this gate nothing runs it again.
export const GATE_HOOK = `#!/bin/sh
# Refuses a commit that does not pass this repository's checks: companygraph check, then each
# command in pins.json's verify. Written by companygraph for the git gate.
here=$(cd "$(dirname "$0")/../.." && pwd)
cd "$here" || exit 1
# The checks read the working tree, so the tree has to be what is being committed. Asked before
# the variables below are unset: commit -a hands this hook an index of its own in GIT_INDEX_FILE.
if ! git diff --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo "✗ pre-commit: the working tree holds changes this commit leaves out; stage them or set them aside, and commit again" >&2
  exit 1
fi
tooling=$(sed -n 's/.*"tooling" *: *"\\([^"]*\\)".*/\\1/p' "$here/.companygraph/manifest.json" | head -1)
# The clone npx makes of the tooling would inherit these and write its index over this one.
unset GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE GIT_PREFIX GIT_OBJECT_DIRECTORY GIT_ALTERNATE_OBJECT_DIRECTORIES
failed=0
run() {
  said=$("$@" 2>&1) || { printf '%s\\n' "$said" >&2; failed=1; }
}
if [ -n "\${COMPANYGRAPH_CLI:-}" ]; then
  run node "$COMPANYGRAPH_CLI" check "$here"
elif command -v npx > /dev/null 2>&1 && [ -n "$tooling" ]; then
  run npx --yes --prefer-offline --package "github:companygraph/meta-model#v$tooling" companygraph check "$here"
else
  echo "✗ pre-commit: check could not run here, no npx or no tooling in the manifest; nothing else runs it on this gate" >&2
  failed=1
fi
if [ -f pins.json ]; then
  if verify=$(node -e 'const v = JSON.parse(require("fs").readFileSync("pins.json", "utf8")).verify; for (const c of Array.isArray(v) ? v : []) console.log(c)' 2>/dev/null); then
    while IFS= read -r command; do
      [ -n "$command" ] && run sh -c "$command"
    done <<VERIFY
$verify
VERIFY
  else
    echo "✗ pre-commit: pins.json could not be read as JSON, so its verify commands did not run" >&2
    failed=1
  fi
fi
[ "$failed" -eq 0 ] && exit 0
echo "✗ pre-commit: a check failed, so nothing was committed" >&2
exit 1
`;

// The git gate's pre-merge-commit hook: a merge git makes alone is checked as a commit is. A
// merge with conflicts is finished with git commit, which runs pre-commit itself.
export const MERGE_HOOK = `#!/bin/sh
exec "$(dirname "$0")/pre-commit"
`;
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:gate && npm run typecheck` Expected: PASS. If "a check that cannot run at all" fails because `node` is missing from the reduced PATH, that is the expected refusal path; the assertion reads the sentence, not the cause.

- [ ] **Step 5: Commit**

```bash
git add lib/instance-files.mjs verify/gate.test.mjs package.json .github/workflows/ci.yml
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The git gate's hooks run check and the verify commands, and refuse what fails

Verified: test:gate and typecheck pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: init and adopt write what the gate names

**Files:**

- Modify: `lib/plan.mjs` (`InitAsk` typedef, `initPlan`, `adoptPlan`; import `GATES`, `GATE_HOOK`, `MERGE_HOOK`)
- Test: `verify/plan.test.mjs`

**Interfaces:**

- Consumes: `GATES`, `GATE_HOOK`, `MERGE_HOOK`, `manifestOf({ gate })`, `adoptedManifestOf({ gate })`, `agentFilesFor({ gate })` from Tasks 1 and 2.
- Produces: `initPlan({ ..., gate = "github", repository = true })` and `adoptPlan({ tooling, present, gate = "github", repository = true })`; both refuse an unknown gate, `git` where `repository` is false, and (`initPlan` only) `git` with `hook: false`. Paths: `.github/workflows/companygraph.yml`, `.companygraph/hooks/commit-msg`, `.companygraph/hooks/pre-commit`, `.companygraph/hooks/pre-merge-commit`.

- [ ] **Step 1: Write the failing tests**

Add to `verify/plan.test.mjs` (import `GATE_HOOK`, `MERGE_HOOK`, `HOOK` from `../lib/instance-files.mjs` beside what it imports already):

```js
const GATE_PATHS = [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"];
const gateWrites = (writes) => GATE_PATHS.filter((p) => writes.has(p));

test("init writes what the gate names: the workflow for github, the hooks for git, neither for none", () => {
  assert.deepEqual(gateWrites(initPlan(ask).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  assert.deepEqual(gateWrites(initPlan({ ...ask, gate: "github" }).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  const git = initPlan({ ...ask, gate: "git" }).writes;
  assert.deepEqual(gateWrites(git), [".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.equal(git.get(".companygraph/hooks/pre-commit"), GATE_HOOK);
  assert.equal(git.get(".companygraph/hooks/pre-merge-commit"), MERGE_HOOK);
  assert.equal(JSON.parse(git.get(".companygraph/manifest.json")).gate, "git");
  assert.match(git.get("AGENTS.md"), /pre-commit hook/);
  const none = initPlan({ ...ask, gate: "none" }).writes;
  assert.deepEqual(gateWrites(none), []);
  assert.equal(JSON.parse(none.get(".companygraph/manifest.json")).gate, "none");
  assert.equal(JSON.parse(initPlan(ask).writes.get(".companygraph/manifest.json")).gate, undefined);
});

test("init refuses an unknown gate, the git gate without git, and the git gate without its hooks", () => {
  assert.match(initPlan({ ...ask, gate: "gitlab" }).refused, /gitlab is not a gate; the gates are github, git, none/);
  assert.match(initPlan({ ...ask, gate: "git", repository: false }).refused, /not a git repository/);
  assert.match(initPlan({ ...ask, gate: "git", hook: false }).refused, /--no-hook/);
  // Without --gate, a folder with no git is written as today, the seat hook included.
  assert.ok(initPlan({ ...ask, repository: false }).writes.has(".companygraph/hooks/commit-msg"));
});

test("adopt writes what the gate names, and refuses as init does", () => {
  const at = { tooling: "0.31.2", present: new Set() };
  assert.deepEqual(gateWrites(adoptPlan(at).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  const git = adoptPlan({ ...at, gate: "git" }).writes;
  assert.deepEqual(gateWrites(git), [".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.equal(JSON.parse(git.get(".companygraph/manifest.json")).gate, "git");
  assert.deepEqual(gateWrites(adoptPlan({ ...at, gate: "none" }).writes), []);
  assert.match(adoptPlan({ ...at, gate: "git", repository: false }).refused, /not a git repository/);
  assert.match(adoptPlan({ ...at, gate: "gitlab" }).refused, /not a gate/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:plan` Expected: FAIL on the three new tests; every existing test still passes.

- [ ] **Step 3: Implement**

In `lib/plan.mjs`, extend the import from `./instance-files.mjs` with `GATES, GATE_HOOK, MERGE_HOOK`, and add `@property {string | undefined} [gate]` and `@property {boolean | undefined} [repository]` to `InitAsk`.

Add, above `initPlan`:

```js
// What a gate refuses before anything is written: a value that is no gate, and the git gate
// where git is not, since a gate without git is a promise nothing keeps.
/** @type {(gate: string, repository: boolean) => string | null} */
function gateRefusal(gate, repository) {
  if (!GATES.includes(gate)) return `${gate} is not a gate; the gates are ${GATES.join(", ")}.`;
  if (gate === "git" && !repository) return "--gate git needs git, and this folder is not a git repository; run git init first, or choose --gate none.";
  return null;
}

// The files a gate writes, beside the manifest: the workflow and the seat hook for github, the
// seat hook and the two gate hooks for git, and nothing for none. `hook` is --no-hook's opposite,
// and leaves the seat hook out of github alone.
/** @type {(gate: string, workflow: string, hook: boolean) => [string, string][]} */
const gateFilesOf = (gate, workflow, hook) =>
  gate === "git"
    ? [[".companygraph/hooks/commit-msg", HOOK], [".companygraph/hooks/pre-commit", GATE_HOOK], [".companygraph/hooks/pre-merge-commit", MERGE_HOOK]]
    : gate === "none"
      ? []
      : [[".github/workflows/companygraph.yml", workflow], ...(hook ? [/** @type {[string, string]} */ ([".companygraph/hooks/commit-msg", HOOK])] : [])];
```

In `initPlan`, add `gate = "github", repository = true` to the destructured parameters, and right after the agent and name refusals:

```js
  const refusedGate = gateRefusal(gate, repository);
  if (refusedGate) return { refused: refusedGate };
  if (gate === "git" && !hook) return { refused: "--gate git is the hooks, and --no-hook leaves them out; choose one." };
```

Pass `gate` into the `manifestOf({ ... })` call and into `agentFilesFor({ agent, name: called, units, gate })`. Replace the two lines that write the workflow and the seat hook (keep the long comments above them) with:

```js
  for (const [path, text] of gateFilesOf(gate, workflowFor(`v${tooling}`), hook)) writes.set(path, text);
```

In `adoptPlan`, take `{ tooling, present, gate = "github", repository = true }`, refuse with `gateRefusal` before anything else after the manifest check, and build `writes` as:

```js
  const writes = new Map([[".companygraph/manifest.json", adoptedManifestOf({ tooling, exclude: ["dist"], gate })], ...gateFilesOf(gate, repositoryWorkflowFor(`v${tooling}`), true)]);
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:plan && npm run test:instance-files && npm run typecheck` Expected: PASS, every existing test included.

- [ ] **Step 5: Commit**

```bash
git add lib/plan.mjs verify/plan.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
init and adopt write what the gate names, and refuse a git gate without git

Verified: test:plan, test:instance-files and typecheck pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 4: Moving from one gate to another

**Files:**

- Modify: `lib/plan.mjs` (add `gatePlan`; `UpgradeAsk`, `UpgradeWrites`, `upgradePlan`, `adoptedUpgradePlan`)
- Test: `verify/plan.test.mjs`

**Interfaces:**

- Consumes: `gateFilesOf`, `gateRefusal`, `GATE_HOOK`, `MERGE_HOOK` from Task 3.
- Produces:
  - `export function gatePlan({ from, to, workflow, held, force = false })` where `held: Map<string, string | undefined>` holds the texts at the four gate paths; returns `{ refused: string }` or `{ writes: Map<string, string>; removes: string[]; forced: string[] }`.
  - `upgradePlan({ ..., gate })` and `adoptedUpgradePlan({ ..., gate, held, force })`: `gate` is the target, absent meaning the manifest's own; both return `removes` and `forced` beside what they returned before, and write the manifest with the target gate.

- [ ] **Step 1: Write the failing tests**

Add to `verify/plan.test.mjs`:

```js
const WF = "the workflow\n";
const heldOf = (entries) => new Map(entries);

test("a move between gates writes what the new one names and removes what the old one wrote", () => {
  const toGit = gatePlan({ from: "github", to: "git", workflow: WF, held: heldOf([[".github/workflows/companygraph.yml", WF], [".companygraph/hooks/commit-msg", HOOK]]) });
  assert.deepEqual([...toGit.writes.keys()].sort(), [".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.deepEqual(toGit.removes, [".github/workflows/companygraph.yml"]);
  const toGithub = gatePlan({ from: "git", to: "github", workflow: WF, held: heldOf([[".companygraph/hooks/commit-msg", HOOK], [".companygraph/hooks/pre-commit", GATE_HOOK], [".companygraph/hooks/pre-merge-commit", MERGE_HOOK]]) });
  assert.deepEqual([...toGithub.writes.keys()], [".github/workflows/companygraph.yml"]);
  assert.deepEqual(toGithub.removes, [".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  const toNone = gatePlan({ from: "git", to: "none", workflow: WF, held: heldOf([[".companygraph/hooks/commit-msg", HOOK], [".companygraph/hooks/pre-commit", GATE_HOOK], [".companygraph/hooks/pre-merge-commit", MERGE_HOOK]]) });
  assert.deepEqual(toNone.writes.size, 0);
  assert.deepEqual(toNone.removes, [".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  const fromNone = gatePlan({ from: "none", to: "git", workflow: WF, held: new Map() });
  assert.deepEqual([...fromNone.writes.keys()].sort(), [".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.equal(gatePlan({ from: "git", to: "git", workflow: WF, held: new Map() }).writes.size, 0);
});

test("an edited gate hook stops the move by name, and --force removes it and says so", () => {
  const held = heldOf([[".companygraph/hooks/pre-commit", `${GATE_HOOK}# mine\n`], [".companygraph/hooks/pre-merge-commit", MERGE_HOOK]]);
  assert.match(gatePlan({ from: "git", to: "github", workflow: WF, held }).refused, /\.companygraph\/hooks\/pre-commit/);
  const forced = gatePlan({ from: "git", to: "github", workflow: WF, held, force: true });
  assert.deepEqual(forced.forced, [".companygraph/hooks/pre-commit"]);
  assert.ok(forced.removes.includes(".companygraph/hooks/pre-commit"));
});

test("an upgrade moves the gate when asked, records it, and keeps it when not asked", () => {
  const manifest = { tooling: "0.31.2", core: { version: "0.31.1" }, units: "meta", files: {} };
  const base = { core, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(), workflow: WF };
  const moved = upgradePlan({ ...base, gate: "git", held: heldOf([[".github/workflows/companygraph.yml", WF], [".companygraph/hooks/commit-msg", HOOK]]) });
  assert.equal(JSON.parse(moved.writes.get(".companygraph/manifest.json")).gate, "git");
  assert.ok(moved.writes.has(".companygraph/hooks/pre-commit"));
  assert.ok(moved.removes.includes(".github/workflows/companygraph.yml"));
  assert.ok(!moved.writes.has(".github/workflows/companygraph.yml"));
  const kept = upgradePlan({ ...base, manifest: { ...manifest, tooling: "0.31.0", gate: "git" }, workflow: null });
  assert.equal(JSON.parse(kept.writes.get(".companygraph/manifest.json")).gate, "git");
  assert.ok(!kept.removes.some((p) => p.startsWith(".companygraph/hooks/")));
});

test("an adopted repository moves its gate as an instance does", () => {
  const moved = adoptedUpgradePlan({ tooling: "0.31.2", manifest: { tooling: "0.31.2", exclude: ["dist"] }, workflow: WF, present: new Set(["pins.json"]), gate: "git", held: heldOf([[".github/workflows/companygraph.yml", WF], [".companygraph/hooks/commit-msg", HOOK]]) });
  assert.equal(JSON.parse(moved.writes.get(".companygraph/manifest.json")).gate, "git");
  assert.ok(moved.writes.has(".companygraph/hooks/pre-commit"));
  assert.deepEqual(moved.removes, [".github/workflows/companygraph.yml"]);
});
```

Add `gatePlan` to the import from `../lib/plan.mjs`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:plan` Expected: FAIL, `gatePlan` is not exported.

- [ ] **Step 3: Implement**

Add to `lib/plan.mjs`, after `adoptPlan`:

```js
// Moving a repository from one gate to another. The workflow is the tooling's, since an upgrade
// already moves its tag, so leaving github removes it. A gate hook is the repository's own once
// written, so leaving git removes one only while its text is still the text this release writes;
// an edited one stops the move by name, and --force removes it anyway. The seat hook stays on
// every move, since a folder that leaves a gate may still be a repository.
/**
 * @param {{ from: string; to: string; workflow: string; held: Map<string, string | undefined>; force?: boolean }} ask
 * @returns {{ refused: string; writes?: undefined } | { refused?: undefined; writes: Map<string, string>; removes: string[]; forced: string[] }}
 */
export function gatePlan({ from, to, workflow, held, force = false }) {
  if (!GATES.includes(to)) return { refused: `${to} is not a gate; the gates are ${GATES.join(", ")}.` };
  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {string[]} */
  const removes = [];
  /** @type {string[]} */
  const forced = [];
  if (from === to) return { writes, removes, forced };
  for (const [path, text] of gateFilesOf(to, workflow, true)) if (held.get(path) === undefined) writes.set(path, text);
  if (from === "github" && held.get(".github/workflows/companygraph.yml") !== undefined) removes.push(".github/workflows/companygraph.yml");
  if (from === "git") {
    const ours = new Map([[".companygraph/hooks/pre-commit", GATE_HOOK], [".companygraph/hooks/pre-merge-commit", MERGE_HOOK]]);
    const edited = [...ours].filter(([path, text]) => held.get(path) !== undefined && held.get(path) !== text).map(([path]) => path);
    if (edited.length && !force)
      return { refused: `These gate hooks were edited since this tooling wrote them, so the gate did not move:\n${edited.map((p) => `  ${p}`).join("\n")}\nPut them back, or pass --force to remove them.` };
    for (const [path] of ours) if (held.get(path) !== undefined) removes.push(path);
    forced.push(...edited);
  }
  return { writes, removes, forced };
}
```

In `upgradePlan`, add `gate` to the destructured parameters (and `@property {string | undefined} [gate]` to `UpgradeAsk`, `gate?: string` to its `manifest` type, and `@property {string[]} forced` to `UpgradeWrites`). After `const removes = ...` and before `manifestText` is built:

```js
  const current = manifest.gate ?? "github";
  const target = gate ?? current;
  const moving = gatePlan({ from: current, to: target, workflow: workflowFor(`v${tooling}`), held, force });
  if (moving.refused) return { refused: moving.refused };
```

Pass `gate: target` into `manifestOf({ ... })`. Change `moved` to `writes.size > 0 || removes.length > 0 || manifest.tooling !== tooling || target !== current`. After the workflow pin block, merge the move:

```js
  for (const [path, text] of moving.writes) writes.set(path, text);
  for (const path of moving.removes) {
    writes.delete(path);
    removes.push(path);
  }
```

and return `forced: moving.forced` beside the other fields.

In `adoptedUpgradePlan`, take `gate`, `held = new Map()` and `force = false`; compute `current`, `target` and `moving` the same way with `repositoryWorkflowFor(`v${tooling}`)`; write the manifest when `manifest.tooling !== tooling || target !== current`, as `adoptedManifestOf({ tooling, exclude: manifest.exclude ?? ["dist"], gate: target })`; merge `moving.writes` and `moving.removes` as above; return `{ writes, removes, forced: moving.forced, given, from, to }`, and widen its JSDoc return type to match.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:plan && npm run typecheck` Expected: PASS, every existing test included.

- [ ] **Step 5: Commit**

```bash
git add lib/plan.mjs verify/plan.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An upgrade moves a repository from one gate to another

Verified: test:plan and typecheck pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 5: The command line takes --gate

**Files:**

- Modify: `bin/companygraph.mjs` (help text, `useHook`, `init`, `adopt`, `upgrade`, `menu`)
- Test: `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `initPlan({ gate, repository })`, `adoptPlan({ gate, repository })`, `upgradePlan({ gate })`, `adoptedUpgradePlan({ gate, held, force })` and their `removes` and `forced`; `gitTop` from `../lib/history.mjs`.
- Produces: `companygraph init|adopt|upgrade --gate <github|git|none>`; `useHook(root, names)`.

- [ ] **Step 1: Write the failing tests**

Add to `verify/cli.test.mjs`:

```js
test("init --gate git writes the hooks, points git at them, and writes no workflow", () => {
  const root = temp();
  execFileSync("git", ["init", "-q"], { cwd: root });
  const said = run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  assert.match(said, /pre-commit/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.ok(!fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), ".companygraph/hooks");
  assert.equal(fs.statSync(path.join(root, ".companygraph/hooks/pre-commit")).mode & 0o111, 0o111);
});

test("init --gate git in a folder without git is refused, and --gate none says nothing gates it", () => {
  const refused = spawnSync(process.execPath, [cli, "init", temp(), "--name", "Acme", "--agent", "claude", "--gate", "git"], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /not a git repository/);
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude", "--gate", "none"]);
  assert.match(said, /nothing gates this folder/);
  assert.ok(!fs.existsSync(path.join(root, ".companygraph/hooks")));
  assert.ok(!fs.existsSync(path.join(root, ".github")));
});

test("upgrade --gate git moves an instance from the workflow to the hooks", () => {
  const root = temp();
  execFileSync("git", ["init", "-q"], { cwd: root });
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /remove\s+\.github\/workflows\/companygraph\.yml|removed/);
  assert.ok(!fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8")).gate, "git");
});

test("upgrade --gate git leaves a hooks folder of the repository's own in charge, and says so", () => {
  const root = temp();
  execFileSync("git", ["init", "-q"], { cwd: root });
  run(["adopt", root]);
  execFileSync("git", ["config", "core.hooksPath", "hooks"], { cwd: root });
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /core\.hooksPath is hooks here/);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), "hooks");
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
});
```

In the existing menu test that feeds `` `1\n${root}\nAcme\nn\n` ``, add an empty answer for the new gate prompt after the name: `` `1\n${root}\nAcme\n\nn\n` ``.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:cli` Expected: FAIL on the four new tests (`--gate` is not read), and the edited menu test fails until the prompt exists.

- [ ] **Step 3: Implement**

Help text: change the `init:` line to end with `--no-hook  --gate <github|git|none>`, the `upgrade:` line to end with `--dry-run  --gate <github|git|none>`, and add a line `adopt: --gate <github|git|none>` after it. Add `[--gate <github|git|none>]` to the usage comments at the top of the file for `init`, `adopt` and `upgrade`.

`useHook(root)` becomes `useHook(root, names = ["commit-msg"])`: chmod `0o755` each `.companygraph/hooks/<name>`, and in its messages say `the ${names.join(", ")} hook${names.length > 1 ? "s are" : " is"}` where it says "the commit-msg hook is" and "the seat check's hook is" today; the logic that decides whether to set `core.hooksPath` stays as it is.

In `init`, before `initPlan`:

```js
  const gate = given.gate ?? "github";
  const repository = existsSync(root) && Boolean(gitTop(root));
```

and pass `gate, repository` into `initPlan`. After writing, replace `if (plan.writes.has(".companygraph/hooks/commit-msg")) useHook(root);` with:

```js
  const hooks = ["commit-msg", "pre-commit", "pre-merge-commit"].filter((name) => /** @type {Map<string, string>} */ (plan.writes).has(`.companygraph/hooks/${name}`));
  if (hooks.length) useHook(root, hooks);
  if (gate === "git") console.log(`  every commit runs check and pins.json's verify first, in .companygraph/hooks/pre-commit; there is no workflow, since this repository is gated on this machine`);
  if (gate === "none") console.log(`  level 1: nothing gates this folder; run check by hand, or open it as a vault with the Obsidian plugin, which checks a page while it is edited`);
```

In `adopt`, read `const given = flags(argv); const root = given._[0] ?? ".";`, pass `gate: given.gate ?? "github", repository: existsSync(root) && Boolean(gitTop(root))` into `adoptPlan`, replace its fixed sentence about the seat hook and its `useHook(root)` call with the same `hooks` list and messages as `init`, and keep the seat-hook sentence for the `github` gate only.

In `upgrade`, read the four gate paths into a map before either branch:

```js
  const gatePaths = [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"];
  /** @type {Map<string, string>} */
  const gateHeld = new Map(gatePaths.filter((p) => existsSync(join(root, p))).map((p) => [p, read(join(root, p))]));
```

Adopted branch: pass `gate: given.gate, held: gateHeld, force: Boolean(given.force)` into `adoptedUpgradePlan`; treat it as nothing to do only when `writes.size === 0 && removes.length === 0`; in `--dry-run`, also print `  remove  ${path}` for each of `removes`; after `writePlan`, remove each of `removes` with the same inside-root guard the instance branch uses, and print `removed, as --force asked: …` when `forced` is not empty.

Instance branch: add every entry of `gateHeld` to `held` (they are not in the manifest's `files`, so `upgradePlan` treats them only as gate files), pass `gate: given.gate`, and print `forced` as the adopted branch does.

Both branches, after writing: when the manifest's gate is now `git`, call `useHook(root, ["commit-msg", "pre-commit", "pre-merge-commit"])`, which leaves a `core.hooksPath` of the repository's own alone and says so.

Menu, "Make a model": after the name is asked, ask

```js
      const gate = (await ask(prompt("How is every change checked? github: the workflow on GitHub; git: hooks on this machine; none: by hand", "github"))) || "github";
```

and pass `"--gate", gate` to `init`. "Hold a repository": ask the same and pass it to `adopt`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:cli && npm run test:plan && npm run test:gate && npm run typecheck` Expected: PASS, every existing test included. If another menu test feeds answers past the name prompt of "Make a model" or the folder prompt of "Hold a repository", add the empty gate answer to it the same way.

- [ ] **Step 5: Commit**

```bash
git add bin/companygraph.mjs verify/cli.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
init, adopt and upgrade take --gate, and the menu asks for it

Verified: test:cli, test:plan, test:gate and typecheck pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 6: The README says how a repository is gated

**Files:**

- Modify: `README.md` (the paragraphs on `init`, `upgrade` and `adopt`, near line 118, 120 and 132)

**Interfaces:**

- Consumes: the behavior of Tasks 1–5, as the README describes it to a reader.

- [ ] **Step 1: Write the change**

After the paragraph that opens `` `adopt [<folder>]` ``, add one paragraph in the prose register:

```markdown
`--gate` says what checks every change, on `init`, `adopt` and `upgrade`, and the manifest records it. `github`, the default, is the workflow, which the default branch requires once the repository is on GitHub. `git` is for a repository that never reaches GitHub: `pre-commit` and `pre-merge-commit` in `.companygraph/hooks/` run `check` at the release `tooling` names and then every command in `pins.json`'s `verify`, refuse a commit or a merge that fails one, and refuse while the working tree holds a change the commit leaves out; there is no workflow. `none` is a folder with no git, which nothing can gate: no workflow and no hook are written, and the instance stays at the first level. `upgrade --gate` moves a repository from one gate to another, removing the workflow it leaves and the gate hooks it leaves while they are still as this tooling wrote them; an edited one stops the move, and `--force` removes it. A hook is the repository's own once written and is never replaced by an upgrade, because it reads its release and its commands each time it runs.
```

In the `init` paragraph, where it lists what `init` writes ("a workflow pinned to the release of this checker …"), change "a workflow pinned to" to "the gate `--gate` names, by default a workflow pinned to".

- [ ] **Step 2: Check the form and the prose**

Run: `sh conventions/conventions-check && sh conventions/conventions-format` Expected: `✓ every Markdown file follows WRITING.md` and `✓ every Markdown file is in the family's form`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit --author "Writer <writer@companygraph.io>" -F - <<'EOF'
The README says how a repository is gated

Verified: conventions-check and conventions-format pass.

Process: Delivery
Phase: Implement
Track: Prose
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 7: The whole suite, on the branch

**Files:** none changed.

- [ ] **Step 1: Run every suite CI runs, each on its own**

Run, one at a time, and read each exit code: `npm run typecheck`, `npm run build:check`, `npm run verify`, and every `npm run test:*` script in `package.json`, `test:gate` included. Expected: each exits 0.

- [ ] **Step 2: Try the gate by hand**

```bash
d=$(mktemp -d) && cd "$d" && git init -q && node /Users/rob/git/companygraph/meta-model-git-gate/bin/companygraph.mjs init . --here --name Acme --agent claude --gate git
COMPANYGRAPH_CLI=/Users/rob/git/companygraph/meta-model-git-gate/bin/companygraph.mjs git add -A && COMPANYGRAPH_CLI=/Users/rob/git/companygraph/meta-model-git-gate/bin/companygraph.mjs git commit -q -m "first"; echo "exit $?"
```

Expected: `exit 0`, and `git log --oneline` shows the commit. Then add an untracked file and commit again: refused with "leaves out".

- [ ] **Step 3: Report**

Name what ran and passed for the `Verified:` line of the pull request, and stop: the pull request and companygraph.io's `/cli/` page and levels talk are the next steps, on the owner's word.
