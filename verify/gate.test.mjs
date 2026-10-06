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
// It lives outside the repository, where an untracked file would be a change the commit leaves out.
function stub() {
  const file = path.join(temp(), "stub.mjs");
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

test("a check that cannot run at all refuses the commit, since nothing runs it again", () => {
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
