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
import { instanceAt, modelAt } from "./seats-fixture.mjs";

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

// The family's conventions as a repository vendors them: conventions.json and the members' table.
function vendorFamily(dir, rows) {
  fs.writeFileSync(path.join(dir, "conventions.json"), "{}");
  fs.mkdirSync(path.join(dir, "conventions"));
  fs.writeFileSync(path.join(dir, "conventions", "REPOSITORIES.md"),
    `| Repository | Title | Purpose | Default branch | Local path |\n| --- | --- | --- | --- | --- |\n` +
    rows.map(([repo, local]) => `| ${repo} | T | p | main | ${local} |\n`).join(""));
}

test("the report refuses a folder outside git, and in a lone repository a folder that is no instance", () => {
  let r = run(temp(), "seats", modelAt(temp()));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not inside a git repository, so the model has no history to report on/);
  const plain = temp();
  git(plain, "init", "-q");
  r = run(plain, "seats", ".");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /is not an instance/);
});

test("without a family it reports this repository alone", () => {
  const dir = instanceAt(temp());
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", ok);
  git(dir, "commit", "-q", "--allow-empty", "-m", "The owner's own");
  const r = run(dir, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.scope, "repository");
  assert.deepEqual(report.seats.map((s) => [s.email, s.commits]), [["backend-engineer@beacon.example", 1]]);
  assert.equal(report.owner, 1);
});

test("with a family it reads every member on disk, judges each by its organization's instance, and names the missing", () => {
  const top = temp();
  const instance = instanceAt(path.join(top, "mental-model"));
  const site = path.join(top, "site");
  fs.mkdirSync(site);
  git(site, "init", "-q");
  git(site, "commit", "-q", "--allow-empty", "--author", "Reviewer <reviewer@beacon.example>", "-m", "Subject\n\nProcess: Delivery\nPhase: Build\nTrack: Code");
  git(instance, "commit", "-q", "--allow-empty", "-m", "The owner's own");
  vendorFamily(instance, [["beacon/mental-model", instance], ["beacon/site", site], ["beacon/gone", path.join(top, "gone")]]);
  const r = run(instance, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.scope, "family");
  assert.deepEqual(report.read, ["beacon/mental-model", "beacon/site"]);
  assert.deepEqual(report.unread.map((u) => u.repo), ["beacon/gone"]);
  assert.deepEqual(report.seats.map((s) => s.email), ["reviewer@beacon.example"]);
  assert.equal(report.owner, 1);
  assert.match(run(instance, "seats", ".").stdout, /across the family, 2 of 3 members read/);
});

test("a family is read from a member that is no instance, and a member whose organization has none on disk is not judged", () => {
  const top = temp();
  const instance = instanceAt(path.join(top, "mental-model"));
  const site = path.join(top, "site");
  const other = path.join(top, "other");
  for (const dir of [site, other]) {
    fs.mkdirSync(dir);
    git(dir, "init", "-q");
  }
  git(site, "commit", "-q", "--allow-empty", "--author", "Reviewer <reviewer@beacon.example>", "-m", "Subject\n\nProcess: Delivery\nPhase: Build\nTrack: Code");
  // At beacon's domain but in another organization's repository: judged against beacon's
  // instance it would be refused for its missing trailers; it must not be judged at all.
  git(other, "commit", "-q", "--allow-empty", "--author", "Stranger <stranger@beacon.example>", "-m", "No trailers");
  vendorFamily(site, [["beacon/mental-model", instance], ["beacon/site", site], ["acme/tools", other]]);
  const r = run(site, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.scope, "family");
  assert.deepEqual(report.read, ["beacon/mental-model", "beacon/site"]);
  assert.deepEqual(report.unread, [{ repo: "acme/tools", path: other, reason: "no instance of its organization on this disk" }]);
  assert.deepEqual(report.seats.map((s) => s.email), ["reviewer@beacon.example"]);
  assert.equal(report.refused, 0);
  assert.match(run(site, "seats", ".").stdout, /not read, no instance of its organization on this disk: acme\/tools/);
});

// The example instance's identity, renamed to a second organization's, so a family can hold a
// member governed by an instance other than the reporting one.
function acmeInstanceAt(dir) {
  instanceAt(dir);
  const identityPath = path.join(dir, "model", "identity.md");
  fs.writeFileSync(identityPath, fs.readFileSync(identityPath, "utf8")
    .replace("email: hello@beacon.example", "email: hello@acme.example")
    .replace("url: https://beacon.example", "url: https://acme.example")
    .replace("# Beacon Systems", "# Acme Tools"));
  return dir;
}

// Ruling: in a family, an author also counts as the owner's when their name or address matches
// the reporting instance's own identity — the instance the report is run from — even in a member
// of another organization, whose own governing instance judged the commit outside entirely. A
// stranger's commit in that same member stays outside.
test("in a family, a member of another organization's commit by the reporting identity's own name is the owner's, and a stranger stays outside", () => {
  const top = temp();
  const instance = instanceAt(path.join(top, "mental-model"));
  git(instance, "commit", "-q", "--allow-empty", "-m", "The owner's own");
  const acme = acmeInstanceAt(path.join(top, "acme-tools"));
  git(acme, "commit", "-q", "--allow-empty", "--author", "Beacon Systems <robert@personal.example>", "-m", "Not at acme's domain");
  git(acme, "commit", "-q", "--allow-empty", "--author", "Someone Else <stranger@other.example>", "-m", "A stranger");
  vendorFamily(instance, [["beacon/mental-model", instance], ["acme/tools", acme]]);
  const r = run(instance, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.scope, "family");
  assert.equal(report.seats.length, 0);
  assert.equal(report.owner, 2);
  assert.equal(report.outside, 1);
  assert.equal(report.refused, 0);
});

// End to end: a commit from before the rule, made under the identity's own name at an address
// that names no role and is outside the domain entirely, is reported as the owner's rather than
// outside the model — the report's own leniency, never judgeCommit's.
test("a commit authored by the identity's own name, whatever the address, is reported as the owner's", () => {
  const dir = instanceAt(temp());
  git(dir, "commit", "-q", "--allow-empty", "--author", "  Beacon SYSTEMS  <robert@personal.example>", "-m", "Before the rule");
  git(dir, "commit", "-q", "--allow-empty", "--author", "Backend Engineer <backend-engineer@beacon.example>", "-m", ok);
  const r = run(dir, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.owner, 1);
  assert.deepEqual(report.seats.map((s) => s.email), ["backend-engineer@beacon.example"]);
});

// A member's local path can be a plain folder nested inside another checkout (built there by
// accident, or copied), whose own git top is that enclosing checkout's. Reading it would report
// the enclosing checkout's whole history as the member's; it must instead be named as not read.
test("a member's local path that is a plain folder inside another checkout is not read as that checkout's own history", () => {
  const top = temp();
  const instance = instanceAt(path.join(top, "mental-model"));
  const outer = temp();
  git(outer, "init", "-q");
  git(outer, "commit", "-q", "--allow-empty", "--author", "Reviewer <reviewer@beacon.example>", "-m", "Not the member's own");
  const nested = path.join(outer, "member");
  fs.mkdirSync(nested);
  vendorFamily(instance, [["beacon/mental-model", instance], ["beacon/member", nested]]);
  const r = run(instance, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.deepEqual(report.read, ["beacon/mental-model"]);
  assert.deepEqual(report.unread, [{ repo: "beacon/member", path: nested }]);
  assert.equal(report.seats.length, 0);
  assert.match(run(instance, "seats", ".").stdout, new RegExp(`not read, no clone at ${nested.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: beacon/member`));
});

test("--since narrows the history", () => {
  const dir = instanceAt(temp());
  execFileSync("git", ["-c", "user.name=R", "-c", "user.email=hello@beacon.example", "commit", "-q", "--allow-empty", "-m", "old"],
    { cwd: dir, env: { ...process.env, GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z", GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z" } });
  git(dir, "commit", "-q", "--allow-empty", "-m", "new");
  const report = JSON.parse(run(dir, "seats", ".", "--json", "--since", "2021-01-01").stdout);
  assert.equal(report.owner, 1);
  assert.equal(report.since, "2021-01-01");
});
