import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, fileAt } from "../lib/history.mjs";
import { instanceAt } from "./seats-fixture.mjs";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-history-"));
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Robert", "-c", "user.email=hello@beacon.example", ...args], { cwd, encoding: "utf8" });
// A repository whose own config names the owner, so `git var` has an author on a runner with no
// global identity.
const repo = (dir) => {
  git(dir, "init", "-q");
  git(dir, "config", "user.name", "Robert");
  git(dir, "config", "user.email", "hello@beacon.example");
  return dir;
};

test("outside git there is no top, and inside it is the working tree's", () => {
  const dir = temp();
  assert.equal(gitTop(dir), null);
  git(dir, "init", "-q");
  assert.equal(fs.realpathSync.native(gitTop(dir)), fs.realpathSync.native(dir));
});

test("an instance is read against the core it vendors", () => {
  const dir = instanceAt(temp());
  assert.equal(isInstance(dir), true);
  assert.equal(isInstance(temp()), false);
  const { entities } = readInstance(dir);
  assert.ok(entities.some((e) => e.type === "phase" && e.name === "Build"));
  assert.throws(() => readInstance(temp()), /is not an instance/);
});

test("the log carries each commit's author and its trailers", () => {
  const dir = temp();
  git(dir, "init", "-q");
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>",
    "-m", "Split the service\n\nVerified: it ran.\n\nProcess: Delivery\nPhase: Build\nTrack: Code\nCo-Authored-By: A <a@b.c>");
  git(dir, "commit", "-q", "--allow-empty", "-m", "The owner's own");
  const [owner, seat] = logOf(dir, {});
  assert.deepEqual([seat.name, seat.email, seat.subject], ["Backend Engineer", "backend-engineer@beacon.example", "Split the service"]);
  assert.deepEqual(seat.trailers, { process: ["Delivery"], phase: ["Build"], track: ["Code"] });
  assert.deepEqual(owner.trailers, { process: [], phase: [], track: [] });
  assert.equal(logOf(dir, { range: `${seat.sha}..${owner.sha}` }).length, 1);
});

test("an empty repository has no commits, and says so without failing", () => {
  const dir = repo(temp());
  assert.deepEqual(logOf(dir, {}), []);
});

// git's own date parser reads a bare date naming *today* as "right now" rather than that day's
// midnight, so a commit made earlier today would otherwise vanish from `--since <today>` the
// moment any time passes between the commit and the read. today is computed here, not fixed, so
// the test still exercises the same-day case whenever it is run.
test("a commit made earlier today is not dropped by --since today", () => {
  const dir = repo(temp());
  git(dir, "commit", "-q", "--allow-empty", "-m", "Earlier today");
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(logOf(dir, { since: today }).length, 1);
});

test("a trailer separated from the last paragraph is no trailer", () => {
  const dir = temp();
  git(dir, "init", "-q");
  git(dir, "commit", "-q", "--allow-empty", "-m", "Subject\n\nProcess: Delivery\nPhase: Build\n\nCo-Authored-By: A <a@b.c>");
  assert.deepEqual(logOf(dir, {})[0].trailers, { process: [], phase: [], track: [] });
});

test("a pending message is read with git's comment block below its trailers", () => {
  const dir = repo(temp());
  const file = path.join(dir, "MSG");
  fs.writeFileSync(file, "Subject\n\nBody.\n\nProcess: Delivery\nPhase: Build\nTrack: Code\n\n# Please enter the commit message for your changes.\n# Lines starting with '#' will be ignored.\n");
  const pending = pendingOf(dir, file);
  assert.equal(pending.email, "hello@beacon.example");
  assert.deepEqual(pending.trailers, { process: ["Delivery"], phase: ["Build"], track: ["Code"] });
});

test("the family is the members REPOSITORIES.md lists, at their local paths", () => {
  const dir = temp();
  assert.equal(familyOf(dir), null);
  fs.writeFileSync(path.join(dir, "conventions.json"), "{}");
  fs.mkdirSync(path.join(dir, "conventions"));
  fs.writeFileSync(path.join(dir, "conventions", "REPOSITORIES.md"),
    "| Repository | Title | Purpose | Default branch | Local path |\n| --- | --- | --- | --- | --- |\n| acme/mental-model | Acme — Mental Model | the instance | main | ~/git/acme/mental-model |\n| acme/site | acme.io | the site | main | /srv/acme/site |\n");
  assert.deepEqual(familyOf(dir), [
    { repo: "acme/mental-model", path: path.join(os.homedir(), "git/acme/mental-model") },
    { repo: "acme/site", path: "/srv/acme/site" },
  ]);
});

// Review fix 5: `translations` needs a revision's file, not the working tree's, so the languages
// that govern a range are the range's head's rather than whatever happens to be checked out.
test("a file at a revision is read with \\n line ends, and a revision without it is null", () => {
  const dir = repo(temp());
  fs.writeFileSync(path.join(dir, "a.md"), "one\r\ntwo\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "first");
  const base = git(dir, "rev-parse", "HEAD").trim();
  fs.writeFileSync(path.join(dir, "b.md"), "new\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "second");
  assert.equal(fileAt(dir, base, "a.md"), "one\ntwo\n");
  assert.equal(fileAt(dir, base, "b.md"), null, "b.md was not added until after base");
  assert.equal(fileAt(dir, "HEAD", "no-such-file.md"), null);
});
