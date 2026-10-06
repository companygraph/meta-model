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

// A stub for the checker the hook runs. check passes, or fails with a sentence, as STUB_CHECK
// says; ids writes its arguments to STUB_IDS_ARGS when that is set, and refuses with exit 3 and a
// sentence on stdout when STUB_IDS says fail. It lives outside the repository, where an untracked
// file would be a change the commit leaves out.
function stub() {
  const file = path.join(temp(), "stub.mjs");
  fs.writeFileSync(file, [
    'import { writeFileSync } from "node:fs";',
    "const [command, ...args] = process.argv.slice(2);",
    'if (process.env.STUB_TRACE) writeFileSync(process.env.STUB_TRACE, "");',
    'if (command === "check" && process.env.STUB_CHECK === "fail") { console.error("✗ stub: the model fails"); process.exit(1); }',
    'if (command === "ids" && process.env.STUB_IDS_ARGS) writeFileSync(process.env.STUB_IDS_ARGS, JSON.stringify(args));',
    'if (command === "ids" && process.env.STUB_IDS === "fail") { console.log("✗ model/a.md: the id changed"); process.exit(3); }',
    "",
  ].join("\n"));
  return file;
}

// Git for Windows runs these hooks with its own sh, as it runs the seat hook commits.test.mjs drives,
// so the file runs there; the two tests that put a stub of their own on PATH do not, as cli.test.mjs
// says of the same case.
const pathStub = process.platform === "win32" && "a shebang script with no .exe/.cmd extension, or a tool linked by its POSIX path, is not reliably resolved via PATH by Git Bash's sh here; not verifiable without a Windows runner";

// A repository on the git gate: the manifest, a model folder unless `model` is false, the two
// gate hooks, core.hooksPath at them, and a first commit made without the hooks so every test
// starts from a clean tree. Its default branch is main, set in its own config, so the ids step
// finds it whatever the global config says.
function gated({ verify, model = true } = {}) {
  const dir = temp();
  git(dir, "init", "-q", "-b", "main");
  git(dir, "config", "init.defaultBranch", "main");
  if (model) {
    fs.mkdirSync(path.join(dir, "model"));
    fs.writeFileSync(path.join(dir, "model/README.md"), "# Model\n");
  }
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
  const env = { COMPANYGRAPH_CLI: stub() };
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, env, "-m", "a");
  assert.equal(r.status, 0, r.stderr);
});

test("a failing check refuses the commit and says what failed", () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_CHECK: "fail" }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /the model fails/);
  assert.match(r.stderr, /nothing was committed/);
});

test("an unstaged change or an untracked file refuses the commit, since the checks read the tree", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub() };
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
  const r = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-a", "-m", "all");
  assert.equal(r.status, 0, r.stderr);
});

test("each verify command runs as one command line, and a failing one refuses the commit", () => {
  const dir = gated({ verify: ["sh -c 'echo ran > verified.txt'", "sh -c 'exit 0'"] });
  fs.writeFileSync(path.join(dir, ".gitignore"), "verified.txt\n");
  git(dir, "add", ".gitignore");
  const passed = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "ignore");
  assert.equal(passed.status, 0, passed.stderr);
  assert.equal(fs.readFileSync(path.join(dir, "verified.txt"), "utf8"), "ran\n");
  fs.writeFileSync(path.join(dir, "pins.json"), JSON.stringify({ pins: [], verify: ["sh -c 'echo nope >&2; exit 2'"] }));
  git(dir, "add", "pins.json");
  const failed = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "fail");
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /nope/);
});

test("a pins.json that is not JSON refuses the commit with a sentence", () => {
  const dir = gated({ verify: "{ not json" });
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /pins\.json could not be read/);
});

test("a check that cannot run at all refuses the commit, since nothing runs it again", { skip: pathStub }, () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  // No COMPANYGRAPH_CLI, and a PATH with the tools the hook needs but no npx.
  const bin = temp();
  for (const tool of ["git", "sh", "sed", "head", "dirname"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  const r = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "commit", "-q", "-m", "a"], { cwd: dir, encoding: "utf8", env: { PATH: bin, HOME: process.env.HOME } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /check could not run/);
});

test("a merge is gated as a commit is", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub() };
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  git(dir, "checkout", "-q", "-");
  const refused = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "merge", "--no-ff", "-m", "merge", "side"], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env, STUB_CHECK: "fail" } });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /the model fails/);
});

test("a verify command that reads stdin does not eat the commands after it", () => {
  const dir = gated({ verify: ["cat > /dev/null; touch ran1", "touch ran2; exit 1"] });
  fs.writeFileSync(path.join(dir, ".gitignore"), "ran1\nran2\n");
  git(dir, "add", ".gitignore");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "ignore");
  assert.notEqual(r.status, 0);
  assert.ok(fs.existsSync(path.join(dir, "ran1")));
  assert.ok(fs.existsSync(path.join(dir, "ran2")), "the second command ran");
});

test("a verify that is not a list refuses the commit with a sentence", () => {
  const dir = gated({ verify: JSON.stringify({ pins: [], verify: "exit 1" }) });
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /pins\.json could not be read/);
});

test("a commit in a linked worktree is gated, and the main index stays untouched", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub() };
  const tree = path.join(temp(), "wt");
  git(dir, "worktree", "add", "-q", "-b", "wt", tree);
  const before = git(dir, "status", "--porcelain");
  fs.writeFileSync(path.join(tree, "a.md"), "# A\n");
  git(tree, "add", "a.md");
  fs.writeFileSync(path.join(tree, "b.md"), "# B\n");
  const refused = commit(tree, env, "-m", "a");
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /leaves out/);
  fs.rmSync(path.join(tree, "b.md"));
  const passed = commit(tree, env, "-m", "a");
  assert.equal(passed.status, 0, passed.stderr);
  fs.writeFileSync(path.join(tree, "c.md"), "# C\n");
  const all = commit(tree, env, "-a", "-m", "c");
  assert.notEqual(all.status, 0, "an untracked file is still left out");
  assert.equal(git(dir, "status", "--porcelain"), before);
  assert.equal(git(dir, "log", "--format=%s", "-1"), "start\n");
});

test("an npx that fails refuses the commit", { skip: pathStub }, () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const bin = temp();
  fs.writeFileSync(path.join(bin, "npx"), "#!/bin/sh\necho 'npx: offline, nothing in the cache' >&2\nexit 1\n", { mode: 0o755 });
  const r = commit(dir, { PATH: `${bin}${path.delimiter}${process.env.PATH}`, COMPANYGRAPH_CLI: "" }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /offline/);
  assert.match(r.stderr, /nothing was committed/);
});

test("a passing merge goes through pre-merge-commit and lands the merge commit", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub() };
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  git(dir, "checkout", "-q", "-");
  // The hook leaves a trace, so the merge is shown to have run it and not only to have passed.
  const trace = path.join(temp(), "ran");
  const merged = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "merge", "--no-ff", "-m", "merge side", "side"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, ...env, STUB_TRACE: trace } });
  assert.equal(merged.status, 0, merged.stderr);
  assert.ok(fs.existsSync(trace), "pre-merge-commit ran the check");
  assert.equal(git(dir, "log", "--format=%s", "-1"), "merge side\n");
  assert.equal(git(dir, "rev-list", "--parents", "-n", "1", "HEAD").trim().split(" ").length, 3, "HEAD is a merge commit");
});

test("pins.json without node on PATH refuses the commit with a sentence that names node", { skip: pathStub }, () => {
  const dir = gated({ verify: ["true"] });
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  // A PATH with the tools the hook needs and an npx that passes, but no node.
  const bin = temp();
  for (const tool of ["git", "sh", "sed", "head", "dirname"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  fs.writeFileSync(path.join(bin, "npx"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const r = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "commit", "-q", "-m", "a"], { cwd: dir, encoding: "utf8", env: { PATH: bin, HOME: process.env.HOME } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /node is not on PATH/);
  assert.doesNotMatch(r.stderr, /could not be read as JSON/);
});

test("a verify command holding a line break refuses the commit with a sentence, and runs none of it", () => {
  const dir = gated({ verify: ["touch first\ntouch second"] });
  fs.writeFileSync(path.join(dir, ".gitignore"), "first\nsecond\n");
  git(dir, "add", ".gitignore");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub() }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /holds a line break/);
  assert.ok(!fs.existsSync(path.join(dir, "first")));
  assert.ok(!fs.existsSync(path.join(dir, "second")));
});

// The range ids was given, its two ends, and the commit its head names, read back from the stub.
function idsRange(dir, argsFile) {
  const args = JSON.parse(fs.readFileSync(argsFile, "utf8"));
  assert.equal(args[0], fs.realpathSync(dir));
  assert.equal(args[1], "--range");
  const [base, head] = args[2].split("..");
  return { base, head };
}

test("ids runs over HEAD to a commit of the tree being committed", () => {
  const dir = gated();
  const argsFile = path.join(temp(), "ids.json");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const staged = git(dir, "write-tree").trim();
  const head = git(dir, "rev-parse", "HEAD").trim();
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile }, "-m", "a");
  assert.equal(r.status, 0, r.stderr);
  const range = idsRange(dir, argsFile);
  assert.equal(range.base, "HEAD");
  assert.equal(git(dir, "rev-parse", `${range.head}^{tree}`).trim(), staged);
  assert.equal(git(dir, "rev-parse", `${range.head}^`).trim(), head);
});

test("under commit -a, ids reads the tree commit -a commits, not the index on disk", () => {
  const dir = gated();
  const argsFile = path.join(temp(), "ids.json");
  fs.writeFileSync(path.join(dir, ".companygraph/manifest.json"), '{\n  "tooling": "0.0.0",\n  "gate": "git",\n  "exclude": ["dist", "x"]\n}\n');
  const before = git(dir, "write-tree").trim();
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile }, "-a", "-m", "all");
  assert.equal(r.status, 0, r.stderr);
  const range = idsRange(dir, argsFile);
  const tree = git(dir, "rev-parse", `${range.head}^{tree}`).trim();
  assert.notEqual(tree, before);
  assert.equal(tree, git(dir, "rev-parse", "HEAD^{tree}").trim());
});

test("an ids that refuses refuses the commit and shows what ids said", () => {
  const dir = gated();
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_IDS: "fail" }, "-m", "a");
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /the id changed/);
  assert.match(r.stderr, /nothing was committed/);
  assert.equal(git(dir, "log", "--format=%s", "-1"), "start\n");
});

test("the first commit has nothing to compare, so ids does not run and nothing is said of it", () => {
  const dir = temp();
  git(dir, "init", "-q");
  fs.mkdirSync(path.join(dir, "model"));
  fs.writeFileSync(path.join(dir, "model/README.md"), "# Model\n");
  fs.mkdirSync(path.join(dir, ".companygraph/hooks"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph/manifest.json"), '{\n  "tooling": "0.0.0",\n  "gate": "git"\n}\n');
  fs.writeFileSync(path.join(dir, ".companygraph/hooks/pre-commit"), GATE_HOOK, { mode: 0o755 });
  git(dir, "config", "core.hooksPath", ".companygraph/hooks");
  git(dir, "add", "-A");
  const argsFile = path.join(temp(), "ids.json");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile, STUB_IDS: "fail" }, "-m", "first");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  assert.ok(!fs.existsSync(argsFile), "ids did not run");
});

test("a repository with no model and no core, one that took the machinery alone, does not run ids", () => {
  const dir = gated({ model: false });
  const argsFile = path.join(temp(), "ids.json");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  const r = commit(dir, { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile, STUB_IDS: "fail" }, "-m", "a");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(!fs.existsSync(argsFile), "ids did not run");
});

test("on a branch that is not the default, ids compares from where the branch left it", () => {
  const dir = gated();
  const argsFile = path.join(temp(), "ids.json");
  const env = { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile };
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  // main moves on after the branch left it, so the merge base is neither tip.
  git(dir, "checkout", "-q", "main");
  fs.writeFileSync(path.join(dir, "m.md"), "# M\n");
  git(dir, "add", "m.md");
  assert.equal(commit(dir, env, "-m", "m").status, 0);
  git(dir, "checkout", "-q", "side");
  const fork = git(dir, "merge-base", "main", "side").trim();
  fs.writeFileSync(path.join(dir, "b.md"), "# B\n");
  git(dir, "add", "b.md");
  const head = git(dir, "rev-parse", "HEAD").trim();
  const r = commit(dir, env, "-m", "b");
  assert.equal(r.status, 0, r.stderr);
  const range = idsRange(dir, argsFile);
  assert.equal(range.base, fork);
  assert.equal(git(dir, "rev-parse", `${range.head}^`).trim(), head);
});

test("without init.defaultBranch, master is the default where there is no main", () => {
  const dir = temp();
  const global = path.join(temp(), "gitconfig");
  fs.writeFileSync(global, "");
  const env = { COMPANYGRAPH_CLI: stub(), GIT_CONFIG_GLOBAL: global, GIT_CONFIG_NOSYSTEM: "1" };
  const g = (...args) => execFileSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });
  g("init", "-q", "-b", "master");
  fs.mkdirSync(path.join(dir, "model"));
  fs.writeFileSync(path.join(dir, "model/README.md"), "# Model\n");
  fs.mkdirSync(path.join(dir, ".companygraph/hooks"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph/manifest.json"), '{\n  "tooling": "0.0.0",\n  "gate": "git"\n}\n');
  fs.writeFileSync(path.join(dir, ".companygraph/hooks/pre-commit"), GATE_HOOK, { mode: 0o755 });
  g("add", "-A");
  g("commit", "-q", "-m", "start");
  g("config", "core.hooksPath", ".companygraph/hooks");
  const start = g("rev-parse", "HEAD").trim();
  g("checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  g("add", "a.md");
  g("commit", "-q", "-m", "a");
  fs.writeFileSync(path.join(dir, "b.md"), "# B\n");
  g("add", "b.md");
  const argsFile = path.join(temp(), "ids.json");
  const r = commit(dir, { ...env, STUB_IDS_ARGS: argsFile }, "-m", "b");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(idsRange(dir, argsFile).base, start);
});

test("a commit in a linked worktree runs ids from where its branch left the default", () => {
  const dir = gated();
  const argsFile = path.join(temp(), "ids.json");
  const tree = path.join(temp(), "wt");
  git(dir, "worktree", "add", "-q", "-b", "wt", tree);
  const fork = git(dir, "rev-parse", "main").trim();
  fs.writeFileSync(path.join(tree, "a.md"), "# A\n");
  git(tree, "add", "a.md");
  const staged = git(tree, "write-tree").trim();
  const r = commit(tree, { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile }, "-m", "a");
  assert.equal(r.status, 0, r.stderr);
  const range = idsRange(tree, argsFile);
  assert.equal(range.base, fork);
  assert.equal(git(tree, "rev-parse", `${range.head}^{tree}`).trim(), staged);
  assert.equal(git(tree, "rev-parse", `${range.head}^`).trim(), fork);
});

test("a merge into the default branch runs ids from HEAD to the merge's tree", () => {
  const dir = gated();
  const env = { COMPANYGRAPH_CLI: stub() };
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  git(dir, "checkout", "-q", "main");
  fs.writeFileSync(path.join(dir, "m.md"), "# M\n");
  git(dir, "add", "m.md");
  assert.equal(commit(dir, env, "-m", "m").status, 0);
  const main = git(dir, "rev-parse", "HEAD").trim();
  const argsFile = path.join(temp(), "ids.json");
  const merged = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "merge", "--no-ff", "-m", "merge side", "side"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, ...env, STUB_IDS_ARGS: argsFile } });
  assert.equal(merged.status, 0, merged.stderr);
  const range = idsRange(dir, argsFile);
  assert.equal(range.base, "HEAD");
  assert.equal(git(dir, "rev-parse", `${range.head}^`).trim(), main);
  assert.equal(git(dir, "rev-parse", `${range.head}^{tree}`).trim(), git(dir, "rev-parse", "HEAD^{tree}").trim());
});

test("an init.defaultBranch that names no branch here falls through to main", () => {
  const dir = gated();
  git(dir, "config", "init.defaultBranch", "trunk");
  const argsFile = path.join(temp(), "ids.json");
  const env = { COMPANYGRAPH_CLI: stub(), STUB_IDS_ARGS: argsFile };
  const fork = git(dir, "rev-parse", "main").trim();
  git(dir, "checkout", "-q", "-b", "side");
  fs.writeFileSync(path.join(dir, "a.md"), "# A\n");
  git(dir, "add", "a.md");
  assert.equal(commit(dir, env, "-m", "a").status, 0);
  fs.writeFileSync(path.join(dir, "b.md"), "# B\n");
  git(dir, "add", "b.md");
  const r = commit(dir, env, "-m", "b");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(idsRange(dir, argsFile).base, fork);
});
