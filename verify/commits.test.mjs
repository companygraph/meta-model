// companygraph commits: a range or a pending commit message, judged against the governing
// instance's seats. instanceAt is the shared fixture from A1/A2 (verify/seats-fixture.mjs), not
// redefined here.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { instanceAt } from "./seats-fixture.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "bin", "companygraph.mjs");
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-commits-"));
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Robert", "-c", "user.email=hello@beacon.example", ...args], { cwd, encoding: "utf8", stdio: "pipe" });
const run = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });

const ok = "Subject\n\nVerified: it ran.\n\nProcess: Delivery\nPhase: Build\nTrack: Code";
const wrong = "Subject\n\nVerified: it ran.\n\nProcess: Delivery\nPhase: Release\nTrack: Code";

test("a range whose seats the phases list passes; one that is not is refused with 3", () => {
  const dir = instanceAt(temp());
  git(dir, "commit", "-q", "--allow-empty", "-m", "Start");
  const base = git(dir, "rev-parse", "HEAD").trim();
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", ok);
  let r = run(dir, "commits", ".", "--range", `${base}..HEAD`);
  assert.equal(r.status, 0, r.stderr);
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", wrong);
  r = run(dir, "commits", ".", "--range", `${base}..HEAD`);
  assert.equal(r.status, 3);
  assert.match(r.stdout + r.stderr, /Backend Engineer does not execute Release in Delivery; its executed-by is Reviewer/);
});

test("the hook judges the seat --author names, not the configured user", () => {
  const dir = instanceAt(temp());
  const hooks = path.join(dir, "hooks");
  fs.mkdirSync(hooks);
  fs.writeFileSync(path.join(hooks, "commit-msg"),
    `#!/bin/sh\n"${process.execPath.replace(/\\/g, "/")}" "${cli.replace(/\\/g, "/")}" commits . --message "$1"\n[ $? -eq 3 ] && exit 1\nexit 0\n`, { mode: 0o755 });
  git(dir, "config", "core.hooksPath", "hooks");
  assert.throws(() => git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", wrong), /does not execute Release/);
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", ok);
  assert.equal(git(dir, "log", "-1", "--format=%ae").trim(), "backend-engineer@beacon.example");
  // The configured user is the owner, and passes with no trailers at all.
  git(dir, "commit", "-q", "--allow-empty", "-m", "The owner's own");
});

test("trailers kept apart from Co-Authored-By by a blank line are refused, and told why", () => {
  const dir = instanceAt(temp());
  const file = path.join(dir, "MSG");
  fs.writeFileSync(file, "Subject\n\nProcess: Delivery\nPhase: Build\nTrack: Code\n\nCo-Authored-By: A <a@b.c>\n");
  const r = spawnSync(process.execPath, [cli, "commits", ".", "--message", file], {
    cwd: dir, encoding: "utf8",
    env: { ...process.env, GIT_AUTHOR_NAME: "Backend Engineer", GIT_AUTHOR_EMAIL: "backend-engineer@beacon.example" },
  });
  assert.equal(r.status, 3);
  assert.match(r.stdout + r.stderr, /last paragraph/);
  // The judged subject comes from the message, not the literal words "this commit" repeated for
  // both the missing sha and the subject.
  assert.match(r.stdout + r.stderr, /this commit Subject:/);
});

test("a folder that is no instance governs nothing, and says so", () => {
  const dir = temp();
  git(dir, "init", "-q");
  git(dir, "commit", "-q", "--allow-empty", "-m", "x");
  const r = run(dir, "commits", ".", "--range", "HEAD~0");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /not an instance, so nothing governs these commits/);
});

test("without --range or --message, or outside git, it cannot run", () => {
  const dir = instanceAt(temp());
  assert.equal(run(dir, "commits", ".").status, 1);
  const bare = temp();
  fs.cpSync(dir, bare, { recursive: true, filter: (src) => !src.includes(`${path.sep}.git`) });
  assert.equal(run(bare, "commits", ".", "--range", "HEAD").status, 1);
});
