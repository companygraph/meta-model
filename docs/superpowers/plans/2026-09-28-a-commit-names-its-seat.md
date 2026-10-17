# A commit names its seat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An agent's commit is authored by its seat at the governing instance's domain and carries `Process`, `Phase` and `Track` trailers. `companygraph commits` refuses a seat the phase does not list, as a `commit-msg` hook and in CI, and `companygraph seats` reports the history by seat.

**Architecture:** meta-model gains a pure judge (`lib/seats.mjs`: domain, seat addresses, the governing instance's processes, one commit's judgement, the tally and its rendering) and a thin reader of git and disk (`lib/history.mjs`). Two subcommands in `bin/companygraph.mjs` call them, `init` writes a hook into a new instance, and the reusable instance workflow runs the check on a pull request. conventions then ships its own hook and a check-job step for members with no model. Both take the meta-model release from the governing instance's `.companygraph/manifest.json`, so conventions gains no pin on meta-model; a pin there would close a cycle, since meta-model pins conventions.

**Tech Stack:** Node ESM, `node --test`, git plumbing (`git log -z --format` with `%(trailers:…)`, `git interpret-trailers --parse`, `git var GIT_AUTHOR_IDENT`), POSIX sh, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-28-a-commit-names-its-seat-design.md` in companygraph/meta-model (merged in #179).

## Global Constraints

- Seat address: the role's canonical name, trimmed, lower-cased, each run of whitespace one hyphen, `@`, the domain. `Backend Engineer` at `beacon.example` is `backend-engineer@beacon.example`.
- Domain: the host of the identity's `url`, lower-cased, a leading `www.` dropped. An identity with no parseable `url` has no domain and so no seats: every author but the owner is outside the model. `init` writes an identity with no `url`, and its hook must not fail on that.
- The owner's address is the identity's `email`, compared case-insensitively. Its commits pass with or without trailers.
- An author whose domain is not the governing domain is outside the model and passes.
- Trailers `Process`, `Phase`, `Track`, each at most once, read by git's own trailer parser (last paragraph only). `Track` is required where the process has tracks and refused where it has none.
- `companygraph commits` exits 0 when every commit passes or nothing governs the folder, 3 when it refuses a commit, and 1 when it cannot run. A hook refuses only on 3; any other non-zero lets the commit through with a sentence saying the check did not run.
- `companygraph seats` exits 1 with a sentence when the folder is not an instance or not inside git; otherwise 0.
- The report never clones: a family member without a clone at its `Local path` is named as not read.
- No commit made before the rule is rewritten; no `owner@` address; no seat trailer; no /team/ section; no hook for one agent alone.
- American English in code comments and docs (R14); commits and PR bodies in the git register: prose, no headings or bullets, ending `Verified: …` before the trailers; after every commit, `git log -1 --format='[%s]'` shows the subject alone.
- Numbers that move are never written in prose: no count of seats, roles, checks or members in a README or doc.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag, a release and a re-pin each wait for Rob's explicit word.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`. Push with `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push`.
- Before tagging meta-model, `version` in `package.json` and the `ref:` in `.github/workflows/instance-check.yml` name the same release.
- Commits made while executing this plan are authored by the person, as today: the rule starts with the conventions release in Phase B, not before.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; PR bodies end `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

- A real `git commit --author "Backend Engineer <backend-engineer@beacon.example>"` through the hook: the check must judge the seat given by `--author`, not the configured `user.email`. Git exports `GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL` to the hook and `git var GIT_AUTHOR_IDENT` reads them. Task A3 pins this with a real commit, refused and accepted.
- Trailers written with a blank line between them and `Co-Authored-By`: git reads only the last paragraph, so `Process` and `Phase` are not trailers, and the refusal must say why. Task A1 asserts the sentence names the last paragraph, and Task A3 asserts the refusal from a real message.
- A message edited in an editor, with git's `#` comment block below the trailers: the trailers must still be read. Task A2 asserts `pendingOf` on a file with a comment block after them.
- An identity `url` of `https://www.Beacon.example/about` and an author `Backend-Engineer@BEACON.example`: the domain is `beacon.example` and the seat is found. Task A1 asserts both.
- The hook where the checker cannot run (offline, no `npx`, a release without `commits`): the commit goes through with a sentence, and only exit 3 refuses. Task A5 asserts both with a stand-in checker.

---

## Phase A — meta-model (worktree `meta-model-a-commit-names-its-seat`, branch `a-commit-names-its-seat`, which holds this plan)

### Task A1: The judge

**Files:**

- Create: `lib/seats.mjs`
- Create: `verify/seats.test.mjs`
- Modify: `package.json` (script `test:seats`), `.github/workflows/ci.yml` (run it on both jobs)

**Interfaces:**

- Produces:
  - `SEATS_SINCE: string | null` (null in this release)
  - `seatAddress(role: string, domain: string): string`
  - `domainOf(url: string): string | null`
  - `governingOf(instance: { entities }): { name, domain: string | null, ownerEmail: string | null, roles: Map<address, roleName>, processes: Map<processName, { phases: Map<phaseName, string[]>, tracks: Set<string> }> }`
  - `judgeCommit(governing, { email: string, trailers: { process: string[], phase: string[], track: string[] } }): { kind: "owner" | "outside" | "seat", seat?: string | null, process?, phase?, track?, failures: string[] }`
  - `tally(judged: Array<{ repo, email, judgement }>): { seats: Array<{ seat, email, commits, by: Array<{ where, commits }> }>, owner: number, outside: number, refused: number }`
  - `renderReport({ scope: "family" | "repository", since: string | null, read: string[], unread: Array<{ repo, path }>, ...tally }): string`

- [ ] **Step 1: Write the failing tests**

`verify/seats.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { seatAddress, domainOf, governingOf, judgeCommit, tally, renderReport } from "../lib/seats.mjs";

// The example instance's shape, as parseInstance returns it, holding only what the judge reads.
const entities = [
  { id: "identity", type: "identity", name: "Beacon Systems", fields: { url: "https://www.Beacon.example/about", email: "Hello@beacon.example" }, owner: null },
  { id: "roles/backend-engineer", type: "role", name: "Backend Engineer", fields: {}, owner: null },
  { id: "roles/reviewer", type: "role", name: "Reviewer", fields: {}, owner: null },
  { id: "processes/delivery", type: "process", name: "Delivery", fields: {}, owner: null },
  { id: "processes/delivery/phases/specify", type: "phase", name: "Specify", fields: { "executed-by": ["Backend Engineer"] }, owner: "processes/delivery" },
  { id: "processes/delivery/phases/build", type: "phase", name: "Build", fields: { "executed-by": ["Backend Engineer", "Reviewer"] }, owner: "processes/delivery" },
  { id: "processes/delivery/tracks/code", type: "track", name: "Code", fields: {}, owner: "processes/delivery" },
  { id: "processes/support", type: "process", name: "Support", fields: {}, owner: null },
  { id: "processes/support/phases/answer", type: "phase", name: "Answer", fields: { "executed-by": "Reviewer" }, owner: "processes/support" },
];
const governing = governingOf({ entities });
const t = (process, phase, track) => ({ process: process ? [process] : [], phase: phase ? [phase] : [], track: track ? [track] : [] });

test("a seat's address is its role in lower case, hyphenated, at the domain", () => {
  assert.equal(seatAddress("Backend Engineer", "beacon.example"), "backend-engineer@beacon.example");
  assert.equal(seatAddress("  Quality   Lead ", "x.io"), "quality-lead@x.io");
});

test("the domain is the url's host, lower-cased, without www", () => {
  assert.equal(domainOf("https://www.Beacon.example/about"), "beacon.example");
  assert.equal(domainOf("https://blust.ch"), "blust.ch");
  assert.equal(domainOf("not a url"), null);
  assert.equal(governing.domain, "beacon.example");
});

test("an identity with no url has no seats, and every author but the owner is outside", () => {
  const none = governingOf({ entities: [{ id: "identity", type: "identity", name: "X", fields: { email: "o@x.io" }, owner: null }] });
  assert.equal(none.domain, null);
  assert.equal(judgeCommit(none, { email: "implementer@x.io", trailers: t() }).kind, "outside");
  assert.equal(judgeCommit(none, { email: "o@x.io", trailers: t() }).kind, "owner");
});

test("a seat the phase lists passes, whatever the address's case", () => {
  const j = judgeCommit(governing, { email: "Backend-Engineer@BEACON.example", trailers: t("Delivery", "Build", "Code") });
  assert.deepEqual([j.kind, j.seat, j.failures], ["seat", "Backend Engineer", []]);
});

test("the owner passes without trailers, and so does any other domain", () => {
  assert.equal(judgeCommit(governing, { email: "hello@beacon.example", trailers: t() }).kind, "owner");
  const bot = judgeCommit(governing, { email: "49699333+dependabot[bot]@users.noreply.github.com", trailers: t() });
  assert.deepEqual([bot.kind, bot.failures], ["outside", []]);
});

test("a seat the phase does not list is refused, naming who does", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Specify", "Code") });
  assert.deepEqual(j.failures, ["Reviewer does not execute Specify in Delivery; its executed-by is Backend Engineer"]);
});

test("an address at the domain that is no role is refused", () => {
  assert.deepEqual(judgeCommit(governing, { email: "intern@beacon.example", trailers: t("Delivery", "Build", "Code") }).failures,
    ["intern@beacon.example is at beacon.example and names no role of Beacon Systems"]);
});

test("missing trailers are refused, and the refusal says where git reads them", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t() });
  assert.equal(j.failures.length, 2);
  for (const f of j.failures) assert.match(f, /last paragraph/);
});

test("an unknown process, phase or track is refused by name", () => {
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Shipping", "Build", "Code") }).failures, ["Process: Shipping is no process of Beacon Systems"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Deploy", "Code") }).failures, ["Phase: Deploy is no phase of Delivery"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Build", "Ops") }).failures, ["Track: Ops is no track of Delivery"]);
});

test("a track is required where the process has tracks and refused where it has none", () => {
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Delivery", "Build") }).failures, ["it has no Track trailer, and Delivery runs on Code"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Support", "Answer", "Code") }).failures, ["Track: Code is given, and Support has no tracks"]);
  assert.deepEqual(judgeCommit(governing, { email: "reviewer@beacon.example", trailers: t("Support", "Answer") }).failures, []);
});

test("a trailer given twice is refused", () => {
  const j = judgeCommit(governing, { email: "reviewer@beacon.example", trailers: { process: ["Delivery"], phase: ["Build", "Specify"], track: ["Code"] } });
  assert.deepEqual(j.failures, ["it names a Phase twice: Build, Specify"]);
});

test("the tally counts seats by where they worked, and the rest by kind", () => {
  const seat = (phase) => ({ kind: "seat", seat: "Backend Engineer", process: "Delivery", phase, track: "Code", failures: [] });
  const judged = [
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Build") },
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Build") },
    { repo: "a/b", email: "backend-engineer@beacon.example", judgement: seat("Specify") },
    { repo: "a/b", email: "hello@beacon.example", judgement: { kind: "owner", failures: [] } },
    { repo: "a/b", email: "x@y.z", judgement: { kind: "outside", failures: [] } },
    { repo: "a/b", email: "intern@beacon.example", judgement: { kind: "seat", seat: null, failures: ["no role"] } },
  ];
  const r = tally(judged);
  assert.deepEqual(r.seats, [{ seat: "Backend Engineer", email: "backend-engineer@beacon.example", commits: 3,
    by: [{ where: "Delivery · Build · Code", commits: 2 }, { where: "Delivery · Specify · Code", commits: 1 }] }]);
  assert.deepEqual([r.owner, r.outside, r.refused], [1, 1, 1]);
});

test("the rendered report says its scope, its start and what it did not read", () => {
  const text = renderReport({ scope: "family", since: null, read: ["a/b"], unread: [{ repo: "a/c", path: "/nowhere/c" }], ...tally([]) });
  assert.match(text, /across the family, 1 of 2 members read, since the first commit/);
  assert.match(text, /not read, no clone at \/nowhere\/c: a\/c/);
  assert.match(text, /no commit is authored by a seat yet/);
  assert.match(text, /counted as the owner's/);
  assert.match(renderReport({ scope: "repository", since: "2026-10-01", read: ["a/b"], unread: [], ...tally([]) }), /in a\/b, since 2026-10-01/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/seats.test.mjs` Expected: FAIL, `Cannot find module '…/lib/seats.mjs'`.

- [ ] **Step 3: Write `lib/seats.mjs`**

```js
// Which seat made a commit, as the governing instance says it may. The author's address names a
// role at the instance's domain, and the Process, Phase and Track trailers name where the work
// sat; the phase's `executed-by` says whether that seat may do it. Pure: an instance as
// parseInstance returns it in, judgements out, so verify/seats.test.mjs feeds it fixtures. The
// design is docs/superpowers/specs/2026-09-28-a-commit-names-its-seat-design.md.

// The date the rule began, which `seats` reports from by default. Null until the conventions
// release that ships the hook is tagged: until then the whole history is read, and the report
// says that commits before the rule are the person's.
export const SEATS_SINCE = null;

export const seatAddress = (role, domain) => `${role.trim().toLowerCase().replace(/\s+/g, "-")}@${domain}`;

// The host a seat's address sits at. `www.` is dropped because an identity's url is a web
// address and a seat's is a mail address, and no family domain receives mail at www.
export function domainOf(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return host.toLowerCase().replace(/^www\./, "") || null;
}

const listOf = (value) => (Array.isArray(value) ? value : typeof value === "string" && value ? [value] : []);

export function governingOf({ entities }) {
  const identity = entities.find((e) => e.type === "identity");
  if (!identity) throw new Error("the instance has no identity, so nothing says whose seats these are");
  // No url, no domain, and so no seat has an address: every author but the owner is outside.
  // init writes an identity without one, and its hook must pass a new instance's first commits.
  const domain = domainOf(identity.fields.url ?? "");
  const roles = new Map(domain ? entities.filter((e) => e.type === "role").map((r) => [seatAddress(r.name, domain), r.name]) : []);
  const processes = new Map();
  for (const p of entities.filter((e) => e.type === "process")) {
    const phases = new Map(entities.filter((e) => e.type === "phase" && e.owner === p.id).map((ph) => [ph.name, listOf(ph.fields["executed-by"])]));
    const tracks = new Set(entities.filter((e) => e.type === "track" && e.owner === p.id).map((t) => t.name));
    processes.set(p.name, { phases, tracks });
  }
  const email = typeof identity.fields.email === "string" && identity.fields.email.trim() ? identity.fields.email.trim().toLowerCase() : null;
  return { name: identity.name, domain, ownerEmail: email, roles, processes };
}

// Git reads trailers from the message's last paragraph alone, so a blank line between them and
// Co-Authored-By leaves them prose; every refusal for a missing trailer says so.
const LAST = "; git reads trailers only from the message's last paragraph";

export function judgeCommit(governing, { email, trailers }) {
  const address = (email ?? "").trim().toLowerCase();
  if (governing.ownerEmail && address === governing.ownerEmail) return { kind: "owner", failures: [] };
  if (!governing.domain || address.split("@").pop() !== governing.domain) return { kind: "outside", failures: [] };
  const seat = governing.roles.get(address);
  if (!seat) return { kind: "seat", seat: null, failures: [`${address} is at ${governing.domain} and names no role of ${governing.name}`] };
  const failures = [];
  const one = (key, label) => {
    const values = (trailers[key] ?? []).map((v) => v.trim()).filter(Boolean);
    if (values.length > 1) {
      failures.push(`it names a ${label} twice: ${values.join(", ")}`);
      return null;
    }
    return values[0] ?? null;
  };
  const processName = one("process", "Process");
  const phaseName = one("phase", "Phase");
  const trackName = one("track", "Track");
  const twice = failures.length > 0;
  if (!processName && !twice) failures.push(`it has no Process trailer${LAST}`);
  if (!phaseName && !twice) failures.push(`it has no Phase trailer${LAST}`);
  const proc = processName ? governing.processes.get(processName) : null;
  if (processName && !proc) failures.push(`Process: ${processName} is no process of ${governing.name}`);
  if (proc && phaseName) {
    const executedBy = proc.phases.get(phaseName);
    if (!executedBy) failures.push(`Phase: ${phaseName} is no phase of ${processName}`);
    else if (!executedBy.includes(seat)) failures.push(`${seat} does not execute ${phaseName} in ${processName}; its executed-by is ${executedBy.join(", ") || "empty"}`);
  }
  if (proc && !twice) {
    if (proc.tracks.size && !trackName) failures.push(`it has no Track trailer, and ${processName} runs on ${[...proc.tracks].join(", ")}`);
    if (trackName && !proc.tracks.has(trackName))
      failures.push(proc.tracks.size ? `Track: ${trackName} is no track of ${processName}` : `Track: ${trackName} is given, and ${processName} has no tracks`);
  }
  return { kind: "seat", seat, process: processName, phase: phaseName, track: trackName, failures };
}

export function tally(judged) {
  const seats = new Map();
  let owner = 0, outside = 0, refused = 0;
  for (const { email, judgement: j } of judged) {
    if (j.kind === "owner") owner++;
    else if (j.kind === "outside") outside++;
    else if (j.failures.length) refused++;
    else {
      const address = email.trim().toLowerCase();
      const s = seats.get(address) ?? { seat: j.seat, email: address, commits: 0, by: new Map() };
      s.commits++;
      const where = [j.process, j.phase, j.track].filter(Boolean).join(" · ");
      s.by.set(where, (s.by.get(where) ?? 0) + 1);
      seats.set(address, s);
    }
  }
  const rows = [...seats.values()]
    .sort((a, b) => b.commits - a.commits || a.email.localeCompare(b.email))
    .map((s) => ({
      seat: s.seat,
      email: s.email,
      commits: s.commits,
      by: [...s.by].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([where, commits]) => ({ where, commits })),
    }));
  return { seats: rows, owner, outside, refused };
}

export function renderReport({ scope, since, read, unread, seats, owner, outside, refused }) {
  const where = scope === "family" ? `across the family, ${read.length} of ${read.length + unread.length} members read` : `in ${read[0]}`;
  const lines = [`Commits by seat ${where}, ${since ? `since ${since}` : "since the first commit"}`];
  for (const u of unread) lines.push(`  not read, no clone at ${u.path}: ${u.repo}`);
  lines.push("");
  if (!seats.length) lines.push("  no commit is authored by a seat yet");
  for (const s of seats) {
    lines.push(`  ${s.seat} <${s.email}>  ${s.commits}`);
    for (const b of s.by) lines.push(`    ${b.where}  ${b.commits}`);
  }
  lines.push("", `  the owner's own  ${owner}`, `  outside the model  ${outside}`, `  at a seat's domain, refused by the check  ${refused}`);
  if (!since) lines.push("", "  commits made before the rule are authored by the person, and counted as the owner's where they carry the identity's address");
  return `${lines.join("\n")}\n`;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/seats.test.mjs` Expected: PASS, every test.

- [ ] **Step 5: Wire the suite**

In `package.json` `scripts`, add `"test:seats": "node --test verify/seats.test.mjs verify/history.test.mjs verify/commits.test.mjs"`. In `.github/workflows/ci.yml`, after the `npm run test:cli` step of the Linux job add a step `run: npm run test:seats`, and on the Windows job append ` && npm run test:seats` to the line running `test:cli`. Until Tasks A2 and A3 create their files, run the one file directly; the script is complete after A3.

- [ ] **Step 6: Commit**

```bash
git add lib/seats.mjs verify/seats.test.mjs package.json .github/workflows/ci.yml
git commit -F- <<'EOF'
A commit can be judged against the seats its instance declares

The model says which seat executes each phase, and nothing read a commit against it. The new
judge takes an instance as parseInstance returns it and says whether a commit's author is the
owner, outside the model, or a seat whose Process, Phase and Track trailers name a phase that
lists it, and it tallies and renders a history by seat.

Verified: node --test verify/seats.test.mjs passes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A2: Reading git and disk

**Files:**

- Create: `lib/history.mjs`
- Create: `verify/history.test.mjs`

**Interfaces:**

- Consumes: `parseInstance` from `lib/instance.mjs`; `IMAGE_FILE` from `lib/checks.mjs`; `unixLines` from `lib/instance-files.mjs`.
- Produces:
  - `gitTop(dir: string): string | null` — the working tree's top, or null outside git
  - `isInstance(dir: string): boolean` — `.companygraph/manifest.json` and `model/` both there
  - `readInstance(dir: string): { entities, … }` — parseInstance over `model/` against `<units>/core/`
  - `logOf(cwd: string, { range?: string, since?: string }): Array<{ sha, name, email, subject, trailers: { process: string[], phase: string[], track: string[] } }>`
  - `pendingOf(cwd: string, messageFile: string): { name, email, trailers }`
  - `familyOf(top: string): Array<{ repo: string, path: string }> | null`
  - `instanceAt(dir)` test helper stays inside the test files; it is not exported from lib.

- [ ] **Step 1: Write the failing tests**

`verify/history.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf } from "../lib/history.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
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

// The example instance with the release's own core vendored beside it, as init would lay it out.
function instanceAt(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(here, "..", "example", "model"), path.join(dir, "model"), { recursive: true });
  fs.cpSync(path.join(here, "..", "core"), path.join(dir, "meta", "core"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".companygraph"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph", "manifest.json"), JSON.stringify({ tooling: "0.0.0", units: "meta" }));
  return dir;
}

test("outside git there is no top, and inside it is the working tree's", () => {
  const dir = temp();
  assert.equal(gitTop(dir), null);
  git(dir, "init", "-q");
  assert.equal(fs.realpathSync(gitTop(dir)), fs.realpathSync(dir));
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/history.test.mjs` Expected: FAIL, `Cannot find module '…/lib/history.mjs'`.

- [ ] **Step 3: Write `lib/history.mjs`**

```js
// What `commits` and `seats` read from outside themselves: git's own account of a commit and of
// its trailers, an instance from disk, and the family as conventions lists it. Everything that
// decides lives in lib/seats.mjs; this file only reads. Trailers are git's to parse, never a
// regular expression's, so a commit is judged on exactly what `git log` would show a person.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { parseInstance } from "./instance.mjs";
import { IMAGE_FILE } from "./checks.mjs";
import { unixLines } from "./instance-files.mjs";

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });

export function gitTop(dir) {
  try {
    return git(dir, ["rev-parse", "--show-toplevel"]).trim() || null;
  } catch {
    return null;
  }
}

export const isInstance = (dir) => existsSync(join(dir, ".companygraph", "manifest.json")) && existsSync(join(dir, "model"));

function filesUnder(base) {
  const files = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.set(relative(base, full).split(sep).join("/"), IMAGE_FILE.test(entry) ? readFileSync(full) : unixLines(readFileSync(full, "utf8")));
    }
  };
  walk(base);
  return files;
}

export function readInstance(dir) {
  if (!isInstance(dir)) throw new Error(`${dir} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const manifest = JSON.parse(readFileSync(join(dir, ".companygraph", "manifest.json"), "utf8"));
  return parseInstance(filesUnder(join(dir, "model")), { schemas: filesUnder(join(dir, manifest.units ?? "meta", "core")) });
}

const TRAILER = (key) => `%(trailers:key=${key},valueonly,unfold,separator=%x1e)`;
const split = (value) => (value ? value.split("\x1e").map((v) => v.trim()).filter(Boolean) : []);

export function logOf(cwd, { range, since } = {}) {
  // A repository with no commit yet has no HEAD, and `git log` fails on it; it has no history.
  if (!range) {
    try {
      git(cwd, ["rev-parse", "--verify", "-q", "HEAD"]);
    } catch {
      return [];
    }
  }
  const format = ["%H", "%an", "%ae", "%s", TRAILER("Process"), TRAILER("Phase"), TRAILER("Track")].join("%x1f");
  const args = ["log", "-z", `--format=${format}`];
  if (since) args.push(`--since=${since}`);
  args.push(range ?? "HEAD");
  const out = git(cwd, args);
  return out.split("\0").filter((r) => r.trim()).map((record) => {
    const [sha, name, email, subject, process, phase, track] = record.replace(/^\n/, "").split("\x1f");
    return { sha, name, email, subject, trailers: { process: split(process), phase: split(phase), track: split(track) } };
  });
}

export function pendingOf(cwd, messageFile) {
  const ident = git(cwd, ["var", "GIT_AUTHOR_IDENT"]).trim();
  const m = ident.match(/^(.*) <([^>]*)>/);
  const trailers = { process: [], phase: [], track: [] };
  for (const line of git(cwd, ["interpret-trailers", "--parse", messageFile]).split("\n")) {
    const t = line.match(/^([^:]+):\s*(.*)$/);
    const key = t?.[1].trim().toLowerCase();
    if (key && key in trailers && t[2].trim()) trailers[key].push(t[2].trim());
  }
  return { name: m?.[1] ?? "", email: m?.[2] ?? "", trailers };
}

export function familyOf(top) {
  const list = join(top, "conventions", "REPOSITORIES.md");
  if (!existsSync(join(top, "conventions.json")) || !existsSync(list)) return null;
  const members = [];
  for (const line of readFileSync(list, "utf8").split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 5 || !/^[\w.-]+\/[\w.-]+$/.test(cells[0])) continue;
    const local = cells[cells.length - 1];
    members.push({ repo: cells[0], path: local.startsWith("~/") ? join(homedir(), local.slice(2)) : local });
  }
  return members;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/history.test.mjs` Expected: PASS. If `readInstance` throws on the example, read the error: it is an R-rule failure in the fixture layout, not in the example, since `npm run verify` already holds the example to core.

- [ ] **Step 5: Commit**

```bash
git add lib/history.mjs verify/history.test.mjs
git commit -F- <<'EOF'
The tooling reads commits, trailers and the family from git and disk

The judge needs what a commit says about itself as git reads it, and an instance and a family
as they lie on disk. The reader asks git for authors and trailers, so a trailer outside the
message's last paragraph is no trailer here either, reads an instance against the core it
vendors, and lists a family from conventions/REPOSITORIES.md with each member's local path.

Verified: node --test verify/history.test.mjs passes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A3: `companygraph commits`

**Files:**

- Modify: `bin/companygraph.mjs` (header comment, `USAGE`, a `commits` function, the dispatcher)
- Create: `verify/commits.test.mjs`

**Interfaces:**

- Consumes: `gitTop`, `isInstance`, `readInstance`, `logOf`, `pendingOf` (A2); `governingOf`, `judgeCommit` (A1).
- Produces: `companygraph commits [<folder>] (--range <a>..<b> | --message <file>)`; exit 0 pass or nothing governs, 3 refused, 1 cannot run. Output per refused commit: `✗ <short sha or "this commit"> <subject>: <failure>`, one line per failure; on pass `✓ commits: …`.

- [ ] **Step 1: Write the failing tests**

`verify/commits.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "bin", "companygraph.mjs");
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-commits-"));
const git = (cwd, ...args) => execFileSync("git", ["-c", "user.name=Robert", "-c", "user.email=hello@beacon.example", ...args], { cwd, encoding: "utf8", stdio: "pipe" });
const run = (cwd, ...args) => spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });

function instanceAt(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(here, "..", "example", "model"), path.join(dir, "model"), { recursive: true });
  fs.cpSync(path.join(here, "..", "core"), path.join(dir, "meta", "core"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".companygraph"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph", "manifest.json"), JSON.stringify({ tooling: "0.0.0", units: "meta" }));
  git(dir, "init", "-q");
  git(dir, "config", "user.name", "Robert");
  git(dir, "config", "user.email", "hello@beacon.example");
  return dir;
}
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/commits.test.mjs` Expected: FAIL; `commits is no command of this tooling`.

- [ ] **Step 3: Add the command**

In `bin/companygraph.mjs`:

1. Import beside the others: `import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf } from "../lib/history.mjs";` and `import { SEATS_SINCE, governingOf, judgeCommit, tally, renderReport } from "../lib/seats.mjs";`.
2. In the header comment's list of subcommands add `//   companygraph commits [<folder>] (--range <a>..<b> | --message <file>)` and `//   companygraph seats [<folder>] [--since <date>] [--json]`, and change "the four" in the menu sentence to "the commands below it" so the comment carries no count.
3. In `USAGE` add, after the `obsidian` line: `  commits [<folder>]  refuse a commit whose seat the phase in its trailers does not list` and `  seats [<folder>]    the history by seat: the family's where conventions lists one, else this repository's`, and flag lines `commits: --range <a>..<b>  --message <file>` and `seats: --since <date>  --json`. Change `(none)              at a terminal, a menu over the four below` to `… a menu over the commands below`.
4. Add `json` to `TOGGLES`.
5. Add the function before `menu`:

```js
// Refused is 3, not 1, so a hook can tell a refusal from a checker that could not run — offline,
// no npx, a release without this command — and let the second through with a sentence, since
// the pull request's check runs it again.
const REFUSED = 3;

function commits(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  if (!given.range === !given.message) throw new Error("commits takes one of --range <a>..<b> or --message <file>");
  if (!gitTop(process.cwd())) throw new Error(`${process.cwd()} is not inside a git repository, so there is no commit to check`);
  if (!isInstance(root)) {
    console.log(`${shown(root)} is not an instance, so nothing governs these commits; nothing was checked`);
    return 0;
  }
  const governing = governingOf(readInstance(root));
  const found = given.message
    ? [{ sha: null, subject: "this commit", ...pendingOf(process.cwd(), given.message) }]
    : logOf(process.cwd(), { range: given.range });
  let refused = 0;
  for (const c of found) {
    const { failures } = judgeCommit(governing, c);
    if (!failures.length) continue;
    refused++;
    for (const f of failures) console.error(`${bad("✗")} ${c.sha ? c.sha.slice(0, 7) : "this commit"} ${c.subject}: ${f}`);
  }
  if (refused) return REFUSED;
  console.log(`${good("✓")} commits: every seat names a phase of ${governing.name} that lists it`);
  return 0;
}
```

6. In the dispatcher, before the `menu` branch: `else if (command === "commits") process.exitCode = commits(rest);`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/commits.test.mjs && npm run test:cli` Expected: PASS, both. If the hook test fails on the refused commit, print the hook's stderr before changing anything: the claim under test is that git exports the `--author` identity to the hook.

- [ ] **Step 5: Commit**

```bash
git add bin/companygraph.mjs verify/commits.test.mjs
git commit -F- <<'EOF'
companygraph commits refuses a seat its phase does not list

A hook and a pull request's check both need one command that judges commits against the
governing instance. It reads a range or the commit about to be made, judges each author and
its trailers, and exits 3 on a refusal so a hook can tell a refusal from a checker that could
not run. A folder that is no instance governs nothing and says so.

Verified: node --test verify/commits.test.mjs and npm run test:cli pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A4: `companygraph seats`

**Files:**

- Modify: `bin/companygraph.mjs` (a `seats` function and the dispatcher)
- Modify: `verify/commits.test.mjs` (the report's tests sit beside the check's)

**Interfaces:**

- Consumes: A1 and A2 as above.
- Produces: `companygraph seats [<folder>] [--since <date>] [--json]`. With `--json` it writes `{ scope, since, read, unread, seats, owner, outside, refused }` as `renderReport` takes it.

- [ ] **Step 1: Write the failing tests** (append to `verify/commits.test.mjs`)

```js
test("the report refuses a folder outside git, and a folder that is no instance", () => {
  const bare = temp();
  fs.cpSync(path.join(here, "..", "example", "model"), path.join(bare, "model"), { recursive: true });
  fs.cpSync(path.join(here, "..", "core"), path.join(bare, "meta", "core"), { recursive: true });
  fs.mkdirSync(path.join(bare, ".companygraph"));
  fs.writeFileSync(path.join(bare, ".companygraph", "manifest.json"), JSON.stringify({ tooling: "0.0.0", units: "meta" }));
  let r = run(bare, "seats", ".");
  assert.equal(r.status, 1);
  assert.match(r.stderr, /not inside a git repository, so the model has no history to report on/);
  r = run(temp(), "seats", ".");
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
  fs.writeFileSync(path.join(instance, "conventions.json"), "{}");
  fs.mkdirSync(path.join(instance, "conventions"));
  fs.writeFileSync(path.join(instance, "conventions", "REPOSITORIES.md"),
    `| Repository | Title | Purpose | Default branch | Local path |\n| --- | --- | --- | --- | --- |\n` +
    `| beacon/mental-model | M | m | main | ${instance} |\n| beacon/site | S | s | main | ${site} |\n| beacon/gone | G | g | main | ${path.join(top, "gone")} |\n`);
  const r = run(instance, "seats", ".", "--json");
  assert.equal(r.status, 0, r.stderr);
  const report = JSON.parse(r.stdout);
  assert.equal(report.scope, "family");
  assert.deepEqual(report.read, ["beacon/mental-model", "beacon/site"]);
  assert.deepEqual(report.unread.map((u) => u.repo), ["beacon/gone"]);
  assert.deepEqual(report.seats.map((s) => s.email), ["reviewer@beacon.example"]);
  assert.match(run(instance, "seats", ".").stdout, /across the family, 2 of 3 members read/);
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
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/commits.test.mjs` Expected: the four new tests FAIL with `seats is no command of this tooling`.

- [ ] **Step 3: Add the command**

In `bin/companygraph.mjs`, before `menu`:

```js
// Where the report looks is decided by what it finds: a model outside git has no history, a
// repository that vendors the family's conventions reads every member on this disk, and any
// other reads itself. It never clones; a member with no clone at its local path is named.
function seats(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  if (!isInstance(root)) throw new Error(`${root} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const top = gitTop(root);
  if (!top) throw new Error(`${root} is not inside a git repository, so the model has no history to report on`);
  const since = given.since ?? SEATS_SINCE;
  const members = familyOf(top);
  const repoOf = (dir) => basename(dir);
  const targets = members ?? [{ repo: repoOf(top), path: top }];
  const onDisk = targets.filter((m) => gitTop(m.path));
  const unread = targets.filter((m) => !gitTop(m.path));
  // Each member is judged by the instance that governs it: its own where it is one, else the
  // first instance of its organization the family lists, else this folder's.
  const own = governingOf(readInstance(root));
  const instances = new Map(onDisk.filter((m) => isInstance(m.path)).map((m) => [m.repo, governingOf(readInstance(m.path))]));
  const governs = (m) => instances.get(m.repo) ?? [...instances].find(([repo]) => repo.split("/")[0] === m.repo.split("/")[0])?.[1] ?? own;
  const judged = onDisk.flatMap((m) => logOf(m.path, { since }).map((c) => ({ repo: m.repo, email: c.email, judgement: judgeCommit(governs(m), c) })));
  const report = { scope: members ? "family" : "repository", since, read: onDisk.map((m) => m.repo), unread, ...tally(judged) };
  console.log(given.json ? JSON.stringify(report, null, 2) : renderReport(report));
  return 0;
}
```

In the dispatcher: `else if (command === "seats") process.exitCode = seats(rest);`. `basename` is already imported from `node:path`.

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/commits.test.mjs && npm run test:cli` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add bin/companygraph.mjs verify/commits.test.mjs
git commit -F- <<'EOF'
companygraph seats reports the history by seat

The point of a commit naming its seat is to ask the history who did what, and nothing asked.
The report reads the family's members on this disk where the repository vendors the family's
conventions, and this repository alone otherwise; it refuses a model outside git, names every
member it could not read, and judges each by the instance that governs it.

Verified: node --test verify/commits.test.mjs and npm run test:cli pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A5: `init` writes the hook

**Files:**

- Modify: `lib/instance-files.mjs` (export `HOOK`, the hook's text)
- Modify: `lib/plan.mjs` (`initPlan` takes `hook = true` and writes `.companygraph/hooks/commit-msg`)
- Modify: `bin/companygraph.mjs` (`no-hook` toggle, `hook: !given["no-hook"]`, make the hook executable, set `core.hooksPath`, `USAGE` init line gains `--no-hook`)
- Modify: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `companygraph commits` (A3) and its exit 3.
- Produces: `.companygraph/hooks/commit-msg` in every new instance unless `--no-hook`. It is the instance's own once written: not recorded in the manifest's `files`, not moved by `upgrade`, and it reads the release from the manifest's `tooling` each time it runs. `COMPANYGRAPH_CLI`, when set, is the path of a `companygraph.mjs` the hook runs with `node` instead of `npx`; tests use it, and so can a maintainer working on the tooling.

- [ ] **Step 1: Write the failing tests**

In `verify/plan.test.mjs`, which already defines `ask`, the arguments every `initPlan` test there passes, add:

```js
test("init writes the commit-msg hook, and --no-hook leaves it out", () => {
  const withHook = initPlan(ask);
  assert.ok(withHook.writes.get(".companygraph/hooks/commit-msg").startsWith("#!/bin/sh\n"));
  const manifest = JSON.parse(withHook.writes.get(".companygraph/manifest.json"));
  assert.equal(".companygraph/hooks/commit-msg" in manifest.files, false);
  assert.equal(initPlan({ ...ask, hook: false }).writes.has(".companygraph/hooks/commit-msg"), false);
});
```

In `verify/cli.test.mjs`, add:

```js
test("init in a git repository sets the hooks path; outside one it names the command", () => {
  const inGit = temp();
  execFileSync("git", ["init", "-q"], { cwd: inGit });
  const said = run(["init", inGit, "--name", "Acme", "--agent", "claude"]);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: inGit, encoding: "utf8" }).trim(), ".companygraph/hooks");
  assert.match(said, /commit-msg hook is in use/);
  const bare = temp();
  assert.match(run(["init", bare, "--name", "Acme", "--agent", "claude"]), /git config core\.hooksPath \.companygraph\/hooks/);
  const none = temp();
  run(["init", none, "--name", "Acme", "--agent", "claude", "--no-hook"]);
  assert.equal(fs.existsSync(path.join(none, ".companygraph/hooks/commit-msg")), false);
});

test("init leaves a hooks path already set, and says the seat hook is not in use", () => {
  const dir = temp();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "core.hooksPath", ".husky"], { cwd: dir });
  assert.match(run(["init", dir, "--name", "Acme", "--agent", "claude"]), /core\.hooksPath is \.husky here/);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: dir, encoding: "utf8" }).trim(), ".husky");
});

test("the hook refuses only on the checker's refusal, and lets the commit through when it cannot run", () => {
  const dir = temp();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  const commit = (env) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", "commit", "-q", "--allow-empty", "-m", "x"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });
  const stub = (code) => {
    const file = path.join(temp(), "stub.mjs");
    fs.writeFileSync(file, `process.exit(${code});\n`);
    return file;
  };
  assert.notEqual(commit({ COMPANYGRAPH_CLI: stub(3) }).status, 0);
  const through = commit({ COMPANYGRAPH_CLI: stub(1) });
  assert.equal(through.status, 0);
  assert.match(through.stderr, /seat check did not run/);
  assert.equal(commit({ COMPANYGRAPH_CLI: cli }).status, 0);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm run test:plan && npm run test:cli` Expected: the new tests FAIL; the rest pass.

- [ ] **Step 3: Write the hook text**

In `lib/instance-files.mjs`, after `workflowFor`:

```js
// The instance's commit-msg hook, written once by init and the instance's own from then on. It
// runs `companygraph commits` at the release the manifest's `tooling` names, read each time, so
// an upgrade moves it without touching it. A refusal (exit 3) refuses the commit; any other
// failure is the checker not running — offline, no npx, an older release — and the commit goes
// through with a sentence, because the pull request's check runs it again.
export const HOOK = `#!/bin/sh
# Refuses a commit whose author is a seat of this instance that the phase named in its trailers
# does not list. Written by companygraph init; see \`companygraph commits\`.
here=$(cd "$(dirname "$0")/../.." && pwd)
tooling=$(sed -n 's/.*"tooling" *: *"\\([^"]*\\)".*/\\1/p' "$here/.companygraph/manifest.json" | head -1)
if [ -n "\${COMPANYGRAPH_CLI:-}" ]; then
  node "$COMPANYGRAPH_CLI" commits "$here" --message "$1"
elif command -v npx > /dev/null 2>&1 && [ -n "$tooling" ]; then
  npx --yes --prefer-offline --package "github:companygraph/meta-model#v$tooling" companygraph commits "$here" --message "$1"
else
  false
fi
status=$?
[ "$status" -eq 0 ] && exit 0
[ "$status" -eq 3 ] && exit 1
echo "commit-msg: the seat check did not run here (exit $status); the pull request's check will run it" >&2
exit 0
`;
```

- [ ] **Step 4: Write it from the plan**

In `lib/plan.mjs`, import `HOOK` beside the other `instance-files.mjs` imports; add `hook = true` to `initPlan`'s parameters; after the line writing `.github/workflows/companygraph.yml`, add:

```js
  // The hook is the instance's own once written, like the agent's files: not in `files`, so no
  // upgrade holds it to a hash or replaces it. It reads its release from the manifest instead.
  if (hook) writes.set(".companygraph/hooks/commit-msg", HOOK);
```

In `bin/companygraph.mjs`: add `"no-hook"` to `TOGGLES`; pass `hook: !given["no-hook"]` to `initPlan`; add `chmodSync` to the `node:fs` import and `execFileSync` to the `node:child_process` import; after `writePlan` in `init`:

```js
  if (plan.writes.has(".companygraph/hooks/commit-msg")) {
    chmodSync(join(root, ".companygraph/hooks/commit-msg"), 0o755);
    const top = (() => {
      try {
        return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      } catch {
        return null;
      }
    })();
    const hooks = relative(top ?? root, join(resolve(root), ".companygraph/hooks")).split(sep).join("/");
    const current = top ? spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" }).stdout.trim() : "";
    if (!top) console.log(`  the commit-msg hook is written; once the folder is a git repository, run "git config core.hooksPath ${hooks}"`);
    else if (current && current !== hooks) console.log(`  core.hooksPath is ${current} here, so the seat check's hook is not in use; its file is ${hooks}/commit-msg`);
    else {
      execFileSync("git", ["config", "core.hooksPath", hooks], { cwd: root });
      console.log(`  the commit-msg hook is in use: git reads hooks from ${hooks}`);
    }
  }
```

In `USAGE`, the `init:` flag line gains `  --no-hook`.

- [ ] **Step 5: Run the tests to see them pass**

Run: `npm run test:plan && npm run test:cli && npm run test:instance-files` Expected: PASS. The first-day test ("an instance init writes passes the mechanical checks") must still pass: the hook lies outside `model/` and the vendored core, which is all the checks read.

- [ ] **Step 6: Commit**

```bash
git add lib/instance-files.mjs lib/plan.mjs bin/companygraph.mjs verify/plan.test.mjs verify/cli.test.mjs
git commit -F- <<'EOF'
init writes a commit-msg hook that checks the seat

A repository outside the family takes no conventions, so nothing would ship it a hook, and a
wrong seat would first be refused on the pull request, where the fix is a force-push. init
now writes one into a new instance and points git at it where the folder is a repository,
leaving a hooks path someone else set alone. The hook reads its release from the manifest
and lets a commit through, with a sentence, when the checker cannot run.

Verified: npm run test:plan, npm run test:cli and npm run test:instance-files pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A6: CI, the menu and the README

**Files:**

- Modify: `.github/workflows/instance-check.yml`
- Modify: `bin/companygraph.mjs` (two menu entries)
- Modify: `README.md` (`## Instantiating it` names the two commands and the hook)
- Modify: `verify/cli.test.mjs`

**Interfaces:**

- Consumes: A3, A4, A5.
- Produces: an instance's pull request runs `companygraph commits . --range <base>..<head>` from the checker checkout.

- [ ] **Step 1: Write the failing tests** (append to `verify/cli.test.mjs`)

```js
test("the instance workflow checks a pull request's commits, over the whole history", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/instance-check.yml"), "utf8");
  assert.match(yml, /fetch-depth: 0/);
  assert.match(yml, /if: github\.event_name == 'pull_request'/);
  assert.match(yml, /companygraph\.mjs commits \. --range "\$\{\{ github\.event\.pull_request\.base\.sha \}\}\.\.\$\{\{ github\.event\.pull_request\.head\.sha \}\}"/);
});

test("the menu offers the report", () => {
  const dir = temp();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  // The menu picks by number, and the report's entry is read off the menu rather than assumed.
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  const pick = listed.match(/(\d+)\S*\s+Report by seat/)[1];
  const out = spawnSync(process.execPath, [cli, "menu"], { input: `${pick}\n${dir}\n`, encoding: "utf8" });
  assert.match(out.stdout, /Commits by seat in /);
});
```

The menu paints its numbers only at a terminal, so under a pipe the pattern reads plain text.

- [ ] **Step 2: Run to see them fail**

Run: `npm run test:cli` Expected: the two new tests FAIL.

- [ ] **Step 3: The workflow**

In `.github/workflows/instance-check.yml`, give the first checkout `with: fetch-depth: 0`, and add a last step:

```yaml
      # A pull request's commits, each judged against the seats this instance declares. Only on a
      # pull request: a push to main carries the owner's merge, which is the owner's.
      - name: every commit names a seat its phase lists
        if: github.event_name == 'pull_request'
        run: node .companygraph-checker/bin/companygraph.mjs commits . --range "${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}"
```

- [ ] **Step 4: The menu**

In `menu()`'s `entries`, after the `obsidian` entry, add:

```js
    ["Report by seat", "the history's commits, by the seat that made them", async () => {
      const root = await folder("Which model?");
      return seats([root]);
    }],
```

`commits` stays out of the menu: it is the hook's and CI's, and a person asks for the report.

- [ ] **Step 5: The README**

Under `## Instantiating it`, after the paragraph on `check`, add this paragraph as written:

```markdown
A commit an agent makes is authored by the seat it held, at the domain of the identity's `url`, and names where the work sat in `Process`, `Phase` and `Track` trailers. `companygraph commits` refuses a seat the named phase does not list as executing it; it runs from the `commit-msg` hook `init` writes, which `--no-hook` leaves out, and on every pull request through the instance workflow. `companygraph seats` reads the history back by seat: for every member on this disk where the repository vendors the family's conventions, and for the repository alone otherwise.
```

- [ ] **Step 6: Run everything**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:cli && npm run test:seats && sh conventions/conventions-check && sh conventions/conventions-format` Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/instance-check.yml bin/companygraph.mjs README.md verify/cli.test.mjs
git commit -F- <<'EOF'
An instance's pull request checks the seat of every commit

The hook refuses a wrong seat where it is installed, and a commit made where it is not reaches
the pull request unchecked. The reusable instance workflow now fetches the whole history and
runs companygraph commits over the pull request's range, the menu offers the report by seat,
and the README names both commands.

Verified: npm run verify, every npm test script, conventions-check and conventions-format pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task A7: The pull request

- [ ] **Step 1: Whole-branch review** against the spec, by a fresh reviewer, before the pull request.
- [ ] **Step 2: Prepare the release in the branch.** Set `version` in `package.json` to `0.59.0`, or the next minor if another release has landed first, and the checker `ref:` in `.github/workflows/instance-check.yml` to the same `v` tag. Commit in the git register with `Verified:`.
- [ ] **Step 3: Push and open the pull request.** Read the last two merged PR bodies first (`gh pr list --state merged --limit 2 --json number` then `gh pr view N --json body`). The body is prose, ends `Verified:` with the commands run, then the 🤖 line, and carries `Release notes to write at tagging: …`.
- [ ] **Step 4: Stop.** The merge, the tag and the three instances' re-pins are Rob's.

---

## Phase B — conventions (worktree `conventions-a-commit-names-its-seat`, branch `a-commit-names-its-seat`)

**Starts only when all of these hold:**

- The Phase A release is tagged, and all three instances' manifests name it as `tooling` or later, so the release every hook and check reads from a manifest has `commits`.
- Every seat address on every family domain receives mail, forwards to Rob, and is verified on Rob's GitHub account.
- Rob has said which address his own commits carry (see the question at the foot of this plan).

The spec keeps the hook off in an organization whose domain receives no mail. Phase B does that by waiting for all three domains before it releases, so no release has to switch a single organization on.

### Task B1: The hook and the sync

**Files:**

- Create: `conventions/hooks/commit-msg`
- Modify: `conventions/conventions-sync` (`FILES`, the fetch loop, `chmod`, `core.hooksPath`)
- Modify: `test/run.sh`

**Interfaces:**

- Produces: `conventions/hooks/commit-msg` in every member, held to the manifest like every other vendored file. The governing instance is the repository itself where it holds `.companygraph/manifest.json`, otherwise the `Local path` of `<org>/mental-model` in `conventions/REPOSITORIES.md`, with `<org>` read from the `origin` remote. `COMPANYGRAPH_CLI` as in Task A5.

- [ ] **Step 1: Write the failing tests** (append to `test/run.sh`, after the sync tests, in its `ok`/`bad` style; `$MEMBER` is the temporary member those tests synced)

```sh
# The seat hook: vendored, executable, in use where sync runs in a clone, and never over a
# hooks path a member set for itself.
if [ -x "$MEMBER/conventions/hooks/commit-msg" ]; then ok "sync writes the seat hook, executable"; else bad "sync did not write an executable seat hook"; fi
git -C "$MEMBER" init -q
( cd "$MEMBER" && sh conventions/conventions-sync sync > /dev/null )
if [ "$(git -C "$MEMBER" config core.hooksPath)" = "conventions/hooks" ]; then ok "sync points git at the hook"; else bad "sync did not set core.hooksPath"; fi
git -C "$MEMBER" config core.hooksPath .husky
out=$( cd "$MEMBER" && sh conventions/conventions-sync sync 2>&1 )
if [ "$(git -C "$MEMBER" config core.hooksPath)" = ".husky" ] && echo "$out" | grep -q 'core.hooksPath is .husky'; then ok "sync leaves a member's own hooks path, and says so"; else bad "sync overwrote or kept quiet about .husky: $out"; fi
git -C "$MEMBER" config core.hooksPath conventions/hooks

# The hook finds its organization's instance at the local path the list gives, and refuses only
# on the checker's refusal. A stand-in checker records its arguments and exits as told.
FAKEHOME=$(mktemp -d)
mkdir -p "$FAKEHOME/git/acme/mental-model/model" "$FAKEHOME/git/acme/mental-model/.companygraph"
echo '{"tooling":"0.0.0"}' > "$FAKEHOME/git/acme/mental-model/.companygraph/manifest.json"
printf '| Repository | Title | Purpose | Default branch | Local path |\n| --- | --- | --- | --- | --- |\n| acme/mental-model | M | m | main | ~/git/acme/mental-model |\n' > "$MEMBER/repositories.test.md"
STUB=$(mktemp -d)
printf 'require("fs").writeFileSync(process.env.STUB_ARGS, process.argv.slice(2).join(" ")); process.exit(Number(process.env.STUB_EXIT));\n' > "$STUB/cli.cjs"
git -C "$MEMBER" remote add origin https://github.com/acme/widget.git
try_commit() {
  ( cd "$MEMBER" && HOME=$FAKEHOME COMPANYGRAPH_CLI=$STUB/cli.cjs STUB_ARGS=$STUB/args STUB_EXIT=$1 \
      CONVENTIONS_REPOSITORIES=repositories.test.md git -c user.name=R -c user.email=r@x.io commit -q --allow-empty -m x 2>&1 )
}
if try_commit 0 > /dev/null && grep -q "commits $FAKEHOME/git/acme/mental-model --message" "$STUB/args"; then ok "the hook runs the check against its organization's instance"; else bad "the hook did not run the check against acme/mental-model: $(cat "$STUB/args" 2> /dev/null)"; fi
if ! try_commit 3 > /dev/null; then ok "the hook refuses on the checker's refusal"; else bad "the hook let a refused commit through"; fi
out=$(try_commit 1)
if echo "$out" | grep -q 'seat check did not run'; then ok "the hook lets a commit through when the checker cannot run, and says so"; else bad "the hook said nothing when the checker could not run: $out"; fi
rm -rf "$FAKEHOME/git/acme/mental-model"
out=$(try_commit 3)
if echo "$out" | grep -q 'no clone of acme/mental-model'; then ok "the hook names a missing instance clone and lets the commit through"; else bad "the hook did not name the missing clone: $out"; fi
rm -f "$MEMBER/repositories.test.md"
```

The stand-in is `.cjs` so `require` works whatever the member's `package.json` says about modules.

- [ ] **Step 2: Run to see them fail**

Run: `sh test/run.sh` Expected: the new lines print `✗`.

- [ ] **Step 3: Write `conventions/hooks/commit-msg`**

```sh
#!/bin/sh
# Refuses a commit whose author is a seat of the governing instance that the phase named in its
# trailers does not list, as WORKING.md says under Branches and commits. The governing instance
# is this repository where it is one, and otherwise its organization's mental-model at the
# local path REPOSITORIES.md gives. The check is companygraph commits, at the release that
# instance's manifest names, so this family pins no meta-model release of its own.
top=$(git rev-parse --show-toplevel) || exit 0
list=${CONVENTIONS_REPOSITORIES:-conventions/REPOSITORIES.md}
if [ -f "$top/.companygraph/manifest.json" ]; then
  instance=$top
else
  org=$(git -C "$top" remote get-url origin 2> /dev/null | sed -n 's#.*github\.com[:/]\([^/]*\)/.*#\1#p')
  path=$(awk -F'|' -v repo="$org/mental-model" '{ gsub(/^ +| +$/, "", $2) } $2 == repo { p = $(NF - 1); gsub(/^ +| +$/, "", p); print p; exit }' "$top/$list" 2> /dev/null)
  case $path in "~/"*) path=$HOME/${path#"~/"} ;; esac
  if [ -z "$org" ] || [ -z "$path" ] || [ ! -f "$path/.companygraph/manifest.json" ]; then
    echo "commit-msg: no clone of ${org:-this organization}/mental-model at ${path:-a path REPOSITORIES.md gives}; the seat check did not run, and the pull request's check will" >&2
    exit 0
  fi
  instance=$path
fi
tooling=$(sed -n 's/.*"tooling" *: *"\([^"]*\)".*/\1/p' "$instance/.companygraph/manifest.json" | head -1)
if [ -n "${COMPANYGRAPH_CLI:-}" ]; then
  node "$COMPANYGRAPH_CLI" commits "$instance" --message "$1"
elif command -v npx > /dev/null 2>&1 && [ -n "$tooling" ]; then
  npx --yes --prefer-offline --package "github:companygraph/meta-model#v$tooling" companygraph commits "$instance" --message "$1"
else
  false
fi
status=$?
[ "$status" -eq 0 ] && exit 0
[ "$status" -eq 3 ] && exit 1
echo "commit-msg: the seat check did not run here (exit $status); the pull request's check will run it" >&2
exit 0
```

- [ ] **Step 4: Teach the sync**

In `conventions/conventions-sync`:

1. Append ` hooks/commit-msg` to `FILES`.
2. In `sync()`'s fetch loop, before the `case`, add `d=${f%/*}; [ "$d" = "$f" ] || mkdir -p "$DIR/$d"`.
3. After `chmod +x "$DIR/conventions-format"`, add `chmod +x "$DIR/hooks/commit-msg"`.
4. Before `write_block`, add:

```sh
  # The seat hook is in use only where git reads hooks from it. A hooks path the member set for
  # itself is its own, and left alone with a sentence rather than replaced.
  if git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    current=$(git config --get core.hooksPath || true)
    if [ -z "$current" ]; then git config core.hooksPath "$DIR/hooks"
    elif [ "$current" != "$DIR/hooks" ]; then echo "! conventions: core.hooksPath is $current here, so the seat check's hook in $DIR/hooks is not in use" >&2
    fi
  fi
```

- [ ] **Step 5: Run to see them pass**

Run: `sh test/run.sh && sh conventions/conventions-check && sh conventions/conventions-format` Expected: PASS.

- [ ] **Step 6: Commit** in the git register, subject `Every member vendors a commit-msg hook that checks the seat`, `Verified:` naming the three commands.

### Task B2: The check job, for a member with no model

**Files:**

- Modify: `.github/workflows/check.yml`
- Modify: `test/run.sh`

- [ ] **Step 1: Write the failing test** (append to `test/run.sh`)

```sh
yml=$HERE/.github/workflows/check.yml
if grep -q 'fetch-depth: 0' "$yml" && grep -q 'repository: ${{ github.repository_owner }}/mental-model' "$yml" \
  && grep -q "hashFiles('.companygraph/manifest.json') == ''" "$yml" && grep -q 'companygraph commits .governing-instance --range' "$yml"
then ok "the check job judges a model-less member's commits against its organization's instance"; else bad "check.yml does not run the seat check for a member with no model"; fi
```

- [ ] **Step 2: Run to see it fail**, `sh test/run.sh`.

- [ ] **Step 3: Change the job**

Give the first `actions/checkout` `with: fetch-depth: 0`. After the last step, add:

```yaml
      # A member with no model of its own is governed by its organization's instance. A member
      # that is an instance runs the same check from the instance workflow, so it is skipped here.
      - name: the governing instance
        if: github.event_name == 'pull_request' && hashFiles('.companygraph/manifest.json') == ''
        uses: actions/checkout@v5
        with:
          repository: ${{ github.repository_owner }}/mental-model
          path: .governing-instance
      - name: every commit names a seat its phase lists
        if: github.event_name == 'pull_request' && hashFiles('.companygraph/manifest.json') == ''
        run: |
          tooling=$(sed -n 's/.*"tooling" *: *"\([^"]*\)".*/\1/p' .governing-instance/.companygraph/manifest.json | head -1)
          npx --yes --package "github:companygraph/meta-model#v$tooling" companygraph commits .governing-instance --range "${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}"
```

- [ ] **Step 4: Run to see it pass**, `sh test/run.sh && sh conventions/conventions-check`.

- [ ] **Step 5: Commit**, subject `A model-less member's pull request checks each commit's seat`.

### Task B3: The rule in WORKING.md and WRITING.md

**Files:**

- Modify: `conventions/WORKING.md` (Branches and commits, the paragraph beginning "An agent commits when the owner asks")
- Modify: `conventions/WRITING.md` (The git register)

- [ ] **Step 1: WORKING.md.** Replace the sentence "The author of the commit is the person." with:

"A commit the owner makes is authored by the owner. A commit an agent makes is authored by the seat it held, the role whose work the commit is, at the governing instance's domain — `git commit --author "Implementer <implementer@blust.ch>"` — and the person running the agent stays the committer. The governing instance is the repository's own where it is one, and otherwise its organization's. A specification is the Specifier's, a plan the Planner's, a task, a re-pin and a re-sync the Implementer's, English prose the Writer's, its German the Translator's and a narrated clip the Narrator's; the Controller writes nothing and authors no commit. `conventions/hooks/commit-msg` refuses a seat the phase in the trailers does not list, and the pull request's check refuses it again."

Replace the closing clause "it never commits, and the session that invoked it proposes the message." with "it never commits, and the session that invoked it proposes the message and commits it as that role's seat."

- [ ] **Step 2: WRITING.md.** Replace "It ends with one line beginning `Verified:` that names what ran and passed, then the trailers." with "It ends with one line beginning `Verified:` that names what ran and passed, then a blank line and the trailers. A commit an agent makes opens its trailers with `Process`, `Phase` and `Track`, named as the governing instance names them, and `Track` only where the process has tracks; git reads trailers only from the message's last paragraph, so no blank line falls between them and `Co-Authored-By`." In the example, after `Verified: the spelling tripwire passes.` add:

```text

Process: Delivery
Phase: Implement
Track: Prose
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
```

inside the same fence.

- [ ] **Step 3: Run** `sh conventions/conventions-check && sh conventions/conventions-format && sh test/run.sh`. Expected: PASS.

- [ ] **Step 4: Commit**, subject `An agent's commit is authored by its seat`.

### Task B4: The pull request

- [ ] **Step 1:** Whole-branch review against the spec by a fresh reviewer.
- [ ] **Step 2:** Push, open the pull request in the git register, carrying `Release notes to write at tagging: …`, and stop. The release, the family re-sync and the follow-up below are Rob's to start.

**Follow-up after the conventions release is tagged:** a meta-model change sets `SEATS_SINCE` in `lib/seats.mjs` to the tag's date, so the report starts where the rule did; its own branch, pull request and release.
