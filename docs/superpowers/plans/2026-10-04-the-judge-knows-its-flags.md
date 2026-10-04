# The judge knows its flags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance records the judge flags its owner has decided in `judge/known.md`; `companygraph check` holds every row of it, `judge` prints each flag's hash so a row can be matched and written by copying, and the `companygraph-judge` skill reads the file before it reads the flags and proposes new rows after.

**Architecture:** A new pure module, `lib/known.mjs`, owns the file: its columns, the hash over a page and a rule's words, and the check of every row against an instance as `instanceAt` returns it. `bin/check-instance.mjs` reads the file when it exists and adds the module's failures and notes to its own. `reportOf` in `lib/questions.mjs` takes an optional `hashOf` and prints its value between a verdict's rule number and its words; `judge` in `bin/companygraph.mjs` passes the module's hash, so `lib/questions.mjs` stays free of `node:crypto` and every other caller keeps today's lines. The skill is Markdown under `agents/claude/skills/`, which `init` and `upgrade` already ship.

**Tech Stack:** Node (ES modules, JSDoc types built into `types/` by `npm run build`), `node:test`, `node:crypto`.

**Spec:** `docs/superpowers/specs/2026-10-04-the-judge-knows-its-flags-design.md`

## Global Constraints

- The file is `judge/known.md` in a top-level `judge/` folder of the instance, instance-owned and committed; never in `.companygraph/`, `dist/` or `model/`.
- One Markdown table under an H1, columns in this order: `Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash`.
- `Entity` is the page's canonical name; `Owner` is filled only for an owned type and resolves the name within it as R4 requires, in the form `## Rests on` already has (`ref → by Entity in Owner`, R9).
- `Rule` is `<type> r<N>`, the position of the rule in its schema's `## Writing rules` as the report numbers it. Rows cover rule questions only, never a pick (`g<N>`).
- `Verdict` is `false` (the page keeps the rule, the judge was wrong) or `accepted` (the page breaks it and the owner keeps it).
- `Seat` is a role of the instance and `Profile` a profile that holds it in its `roles`; `Date` is `YYYY-MM-DD`.
- `Hash` is the first sixteen hex characters of a SHA-256 over the page's file with `\n` line ends, a newline, and the rule's words as `writingRulesOf` joins them. Only code computes it; `judge` prints it on each verdict line of its report.
- `check` reads the file only when it exists; an instance without it checks exactly as before. A broken row fails; a row whose hash no longer matches is reported under `noted:` as `judge/known.md: <Entity> <Rule>: lapsed, the page or the rule changed since <Date>` and fails nothing.
- `judge` still asks every question; nothing here changes what is sent or the digest.
- Rows are written only on the owner's word; the skill changes no entry.
- Commits: author `Implementer <implementer@companygraph.io>`, trailers `Process: Delivery`, `Phase: Implement`, `Track: Code`, then `Co-Authored-By`; the body is prose ending in a `Verified:` line naming what ran. Check `git log -1 --format='[%s]'` shows the subject alone after each commit. `npm run build` after any change to `lib/` or `bin/`, and its `types/` output is committed with the change.

## Review Focus

- A table written with its columns in another order, or without the `Owner` column a person might think optional: one failure naming the columns found and the nine expected, not a failure per row. Pinned in Task 1.
- Cells written with backticks, as the family writes names in tables (`` `Owner` ``, `` `decision r3` ``): read like bare text. Pinned in Task 1.
- A hash pasted in capitals, as a person copying it might: the same hash, neither a failure nor a lapse. Pinned in Task 1.
- A page checked out with Windows line ends: the same hash as on a Mac, so a row does not lapse by checkout. Pinned in Task 1.
- A model so broken it does not parse: `check` reports the model's own failures and notes that `judge/known.md` was not read, rather than crashing or failing every row. Pinned in Task 2.

---

### Task 1: `lib/known.mjs`, the file's columns, the hash and the check of every row

**Files:**

- Create: `lib/known.mjs`
- Create: `verify/known.test.mjs`
- Modify: `package.json` (the `test:judge` script)
- Create: `types/lib/known.d.mts` (written by `npm run build`, never by hand)

**Interfaces:**

- Consumes: `tableOf(body: string): PipeTable | null` from `lib/checks.mjs` (`{ columns: string[]; rows: string[][] }`); `resolveRow(entities, schemas, { type, name, owner }): { entity } | { error: string; subject: "value" | "owner" }` from `lib/instance.mjs`; `writingRulesOf(schemaText: string): string[]` from `lib/questions.mjs`; `instanceAt(dir)` from `lib/history.mjs` returning `{ graph, files, schemas, core }`, where `files` is keyed by path under `model/` and `schemas` by `<type>-schema.md` or `<pack>/<type>-schema.md`.
- Produces: `KNOWN = "judge/known.md"`; `KNOWN_COLUMNS: string[]`; `knownHashOf(page: string, rule: string): string`, sixteen lowercase hex characters; `checkKnown(text: string, instance: { graph: InstanceGraph; files: InstanceFiles; schemas: Files }): { failures: string[]; notes: string[] }`. Task 2 calls `checkKnown`; Task 3 calls `knownHashOf`.

The fixture is the example instance as `verify/seats-fixture.mjs`'s `modelAt` lays it out, read with `lib/history.mjs`'s `instanceAt`. In it the profile `Mira Halvorsen` holds the seat `Backend Engineer`, the profile `Tomas Reyes` holds none, the experience `Rebuilding the order pipeline` is owned by Mira Halvorsen, and the decision `Billing leaves the monolith` is owned by nothing. Probed on `b3985b7`: `resolveRow` answers `names no profile` (subject `owner`) for an unknown owner, `names no experience of profiles/tomas-reyes` for a name outside its owner, `is a experience, which a profile owns, and the row names no profile` for a missing owner, and `is a decision, which nothing owns, and its row names "…" as its owner` for an owner given to an unowned type.

- [ ] **Step 1: Write the failing tests**

Create `verify/known.test.mjs`:

```js
// judge/known.md, the flags an instance's owner has decided: the hash a row is keyed on and the
// check every row is held to. The fixture is the example instance, read as `judge` and `check`
// read an instance; the design is
// docs/superpowers/specs/2026-10-04-the-judge-knows-its-flags-design.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { modelAt } from "./seats-fixture.mjs";
import { instanceAt } from "../lib/history.mjs";
import { writingRulesOf } from "../lib/questions.mjs";
import { KNOWN, KNOWN_COLUMNS, knownHashOf, checkKnown } from "../lib/known.mjs";

const fixture = () => modelAt(fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-known-")));
const DECISION = "decisions/2022-billing-leaves-the-monolith.md";
const EXPERIENCE = "profiles/mira-halvorsen/experiences/2018-northwind-atelier.md";
// The hash a row needs to be current, computed the way `judge` prints it.
const hashFor = (instance, page, type, n) =>
  knownHashOf(/** @type {string} */ (instance.files.get(page)), writingRulesOf(instance.schemas.get(`${type}-schema.md`))[n - 1]);
const header = `| ${KNOWN_COLUMNS.join(" | ")} |\n| ${KNOWN_COLUMNS.map(() => "---").join(" | ")} |`;
const fileOf = (...rows) => `# Known judge flags\n\n${header}\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const decisionRow = (instance, over = {}) => {
  const row = { Entity: "Billing leaves the monolith", Owner: "", Rule: "decision r3", Verdict: "false", Why: "The question states no reason.", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: hashFor(instance, DECISION, "decision", 3), ...over };
  return KNOWN_COLUMNS.map((c) => row[c]);
};

test("the hash is sixteen hex characters over the page and the rule's words, whatever the line ends", () => {
  const h = knownHashOf("# A\n\nText.\n", "The page says one thing.");
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(knownHashOf("# A\r\n\r\nText.\r\n", "The page says one thing."), h, "a Windows checkout keys the same row");
  assert.notEqual(knownHashOf("# A\n\nText!\n", "The page says one thing."), h, "a page edit changes it");
  assert.notEqual(knownHashOf("# A\n\nText.\n", "The page says another thing."), h, "a reworded rule changes it");
});

test("a current row passes, and an owned type's row resolves within its owner", () => {
  const instance = instanceAt(fixture());
  const experience = KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: "Mira Halvorsen", Rule: "experience r6", Verdict: "accepted", Why: "Kept as written.", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: hashFor(instance, EXPERIENCE, "experience", 6) })[c]);
  assert.deepEqual(checkKnown(fileOf(decisionRow(instance), experience), instance), { failures: [], notes: [] });
});

test("an empty table passes and notes nothing", () => {
  assert.deepEqual(checkKnown(`# Known judge flags\n\n${header}\n`, instanceAt(fixture())), { failures: [], notes: [] });
});

test("cells in backticks and a hash in capitals read as written bare", () => {
  const instance = instanceAt(fixture());
  const row = decisionRow(instance, { Rule: "`decision r3`", Seat: "`Backend Engineer`", Hash: hashFor(instance, DECISION, "decision", 3).toUpperCase() });
  assert.deepEqual(checkKnown(fileOf(row), instance), { failures: [], notes: [] });
});

test("a file with no table, or with other columns, fails once and names the nine", () => {
  const instance = instanceAt(fixture());
  assert.deepEqual(checkKnown("# Known judge flags\n\nNothing yet.\n", instance).failures,
    [`${KNOWN}: holds no table; it is one table with the columns Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash`]);
  const without = "# Known judge flags\n\n| Entity | Rule | Verdict | Why | Seat | Profile | Date | Hash |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| A | decision r3 | false | x | Backend Engineer | Mira Halvorsen | 2026-10-04 | 0123456789abcdef |\n| B | decision r4 | false | x | Backend Engineer | Mira Halvorsen | 2026-10-04 | 0123456789abcdef |\n";
  assert.deepEqual(checkKnown(without, instance).failures,
    [`${KNOWN}: the table's columns are Entity | Rule | Verdict | Why | Seat | Profile | Date | Hash, and a known flag takes Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash`]);
});

test("each broken cell fails with its own message, on its row", () => {
  const instance = instanceAt(fixture());
  const cases = [
    [{ Entity: "No such decision" }, `${KNOWN}: row 1: Entity "No such decision" names no decision`],
    [{ Owner: "Mira Halvorsen" }, `${KNOWN}: row 1: Entity "Billing leaves the monolith" is a decision, which nothing owns, and its row names "Mira Halvorsen" as its owner`],
    [{ Rule: "decision 3" }, `${KNOWN}: row 1: Rule "decision 3" is not <type> r<N>`],
    [{ Rule: "decision r99" }, `${KNOWN}: row 1: decision has no writing rule r99`],
    [{ Verdict: "wrong" }, `${KNOWN}: row 1: Verdict "wrong" is neither false nor accepted`],
    [{ Why: "" }, `${KNOWN}: row 1: Why is empty, and a row says why`],
    [{ Seat: "Nobody" }, `${KNOWN}: row 1: Seat "Nobody" names no role`],
    [{ Profile: "Nobody" }, `${KNOWN}: row 1: Profile "Nobody" names no profile`],
    [{ Profile: "Tomas Reyes" }, `${KNOWN}: row 1: Tomas Reyes does not hold the seat Backend Engineer: its \`roles\` does not name it`],
    [{ Date: "2026-02-30" }, `${KNOWN}: row 1: Date "2026-02-30" is not a day, YYYY-MM-DD`],
    [{ Hash: "abc" }, `${KNOWN}: row 1: Hash "abc" is not sixteen hex characters`],
  ];
  for (const [over, message] of cases)
    assert.deepEqual(checkKnown(fileOf(decisionRow(instance, over)), instance).failures, [message], JSON.stringify(over));
});

test("an owned type's row without its owner, or with one that does not own it, fails", () => {
  const instance = instanceAt(fixture());
  const row = (owner) => KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: owner, Rule: "experience r6", Verdict: "false", Why: "x", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: "0123456789abcdef" })[c]);
  assert.deepEqual(checkKnown(fileOf(row("")), instance).failures,
    [`${KNOWN}: row 1: Entity "Rebuilding the order pipeline" is a experience, which a profile owns, and the row names no profile`]);
  assert.deepEqual(checkKnown(fileOf(row("Nobody")), instance).failures, [`${KNOWN}: row 1: Owner "Nobody" names no profile`]);
  assert.deepEqual(checkKnown(fileOf(row("Tomas Reyes")), instance).failures,
    [`${KNOWN}: row 1: Entity "Rebuilding the order pipeline" names no experience of profiles/tomas-reyes`]);
});

test("a second row for the same page and rule fails, naming the first", () => {
  const instance = instanceAt(fixture());
  assert.deepEqual(checkKnown(fileOf(decisionRow(instance), decisionRow(instance, { Verdict: "accepted" })), instance).failures,
    [`${KNOWN}: row 2: names Billing leaves the monolith and decision r3 again, as row 1 does`]);
});

test("a row whose page or rule changed is noted as lapsed and fails nothing", () => {
  const dir = fixture();
  const before = instanceAt(dir);
  const text = fileOf(decisionRow(before));
  fs.appendFileSync(path.join(dir, "model", DECISION), "\nOne more line.\n");
  assert.deepEqual(checkKnown(text, instanceAt(dir)), { failures: [], notes: [`${KNOWN}: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04`] });
  const reworded = instanceAt(fixture());
  reworded.schemas.set("decision-schema.md", /** @type {string} */ (reworded.schemas.get("decision-schema.md")).replace(/## Writing rules\n\n- /, "## Writing rules\n\n- A rule inserted above.\n- "));
  assert.deepEqual(checkKnown(text, reworded).notes, [`${KNOWN}: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04`],
    "a rule inserted above moves r3 onto other words");
});

test("a lapsed row of an owned type names its owner", () => {
  const instance = instanceAt(fixture());
  const row = KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: "Mira Halvorsen", Rule: "experience r6", Verdict: "false", Why: "x", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: "0123456789abcdef" })[c]);
  assert.deepEqual(checkKnown(fileOf(row), instance).notes,
    [`${KNOWN}: Rebuilding the order pipeline in Mira Halvorsen experience r6: lapsed, the page or the rule changed since 2026-10-04`]);
});
```

In `package.json`, change the `test:judge` script to:

```json
    "test:judge": "node --test verify/questions.test.mjs verify/judge.test.mjs verify/judge-faults.test.mjs verify/known.test.mjs",
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/known.test.mjs`

Expected: FAIL, every test, with `Cannot find module '…/lib/known.mjs'`.

- [ ] **Step 3: Write `lib/known.mjs`**

```js
// The flags an instance's owner has already decided, in `judge/known.md`: one table, a row per
// rule on a page, `false` where the judge was wrong and `accepted` where the page breaks the rule
// and the owner keeps it. A run of the judge skill reads it before the flags, so a flag decided
// once is not read again, and `check` holds every row, so a row that names nothing fails on the
// commit that wrote it. The design is
// docs/superpowers/specs/2026-10-04-the-judge-knows-its-flags-design.md. Pure but for the hash:
// an instance as `instanceAt` returns it in, failures and notes out.
import { createHash } from "node:crypto";
import { tableOf } from "./checks.mjs";
import { resolveRow } from "./instance.mjs";
import { writingRulesOf } from "./questions.mjs";
/** @import { InstanceGraph, InstanceFiles, Files, Entity } from "./instance.mjs" */

export const KNOWN = "judge/known.md";
export const KNOWN_COLUMNS = ["Entity", "Owner", "Rule", "Verdict", "Why", "Seat", "Profile", "Date", "Hash"];

// What a row is keyed on: the page as it was read and the rule as it was worded. A page edit, a
// reworded rule and a rule inserted above, which moves `r<N>` onto other words, each change it,
// and a decision about a page holds only for the page and the rule it was made about. Line ends
// are the page's `\n` ones whatever the checkout wrote, so a row does not lapse by platform.
/**
 * @param {string} page
 * @param {string} rule
 * @returns {string}
 */
export const knownHashOf = (page, rule) =>
  createHash("sha256").update(`${page.replace(/\r\n/g, "\n")}\n${rule}`).digest("hex").slice(0, 16);

/** @param {string | undefined} cell */
const clean = (cell) => (cell ?? "").replace(/`/g, "").trim();

/** @param {string} date */
const isDay = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

// A type's schema among those the instance vendored, core's keyed `<type>-schema.md` and a
// pack's `<pack>/<type>-schema.md`, as `parseSchemas` reads them.
/**
 * @param {Files} schemas
 * @param {string} type
 * @returns {string | null}
 */
const schemaTextOf = (schemas, type) => {
  for (const [key, text] of schemas) if (key === `${type}-schema.md` || key.endsWith(`/${type}-schema.md`)) return text;
  return null;
};

// Every row against the instance: its page and owner resolve as any `ref → by Entity in Owner`
// row does, its rule is one the type's schema has at that position, its seat is a role its
// profile holds, and its verdict, date and hash are well formed. A row whose hash no longer
// matches is not broken, it is a reason to read that flag again, so it is a note.
/**
 * @param {string} text
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {{ failures: string[]; notes: string[] }}
 */
export function checkKnown(text, { graph, files, schemas }) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const notes = [];
  const table = tableOf(text);
  if (!table) return { failures: [`${KNOWN}: holds no table; it is one table with the columns ${KNOWN_COLUMNS.join(" | ")}`], notes };
  const columns = table.columns.map(clean);
  if (columns.join("|") !== KNOWN_COLUMNS.join("|"))
    return { failures: [`${KNOWN}: the table's columns are ${columns.join(" | ")}, and a known flag takes ${KNOWN_COLUMNS.join(" | ")}`], notes };
  /** @type {Map<string, number>} */
  const seen = new Map();
  table.rows.forEach((cells, i) => {
    const [entity, owner, rule, verdict, why, seat, profile, date, hash] = KNOWN_COLUMNS.map((_, c) => clean(cells[c]));
    const before = failures.length;
    /** @param {string} message */
    const fail = (message) => failures.push(`${KNOWN}: row ${i + 1}: ${message}`);
    const ruled = /^([a-z][a-z0-9-]*) r([1-9]\d*)$/.exec(rule);
    /** @type {Entity | null} */
    let page = null;
    /** @type {string | undefined} */
    let words;
    if (!ruled) fail(`Rule "${rule}" is not <type> r<N>`);
    else {
      const [, type, n] = ruled;
      const found = resolveRow(graph.entities, schemas, { type, name: entity, owner: owner || undefined });
      if (found.entity) page = found.entity;
      else fail(found.subject === "owner" ? `Owner "${owner}" ${found.error}` : `Entity "${entity}" ${found.error}`);
      const schema = schemaTextOf(schemas, type);
      words = schema === null ? undefined : writingRulesOf(schema)[Number(n) - 1];
      if (schema !== null && words === undefined) fail(`${type} has no writing rule r${n}`);
    }
    if (verdict !== "false" && verdict !== "accepted") fail(`Verdict "${verdict}" is neither false nor accepted`);
    if (!why) fail("Why is empty, and a row says why");
    const role = resolveRow(graph.entities, schemas, { type: "role", name: seat });
    if (!role.entity) fail(`Seat "${seat}" ${role.error}`);
    const holder = resolveRow(graph.entities, schemas, { type: "profile", name: profile });
    if (!holder.entity) fail(`Profile "${profile}" ${holder.error}`);
    if (role.entity && holder.entity && ![holder.entity.fields.roles ?? []].flat().includes(role.entity.name))
      fail(`${profile} does not hold the seat ${seat}: its \`roles\` does not name it`);
    if (!isDay(date)) fail(`Date "${date}" is not a day, YYYY-MM-DD`);
    if (!/^[0-9a-f]{16}$/i.test(hash)) fail(`Hash "${hash}" is not sixteen hex characters`);
    if (page && ruled) {
      const key = `${page.id} ${rule}`;
      const first = seen.get(key);
      if (first) fail(`names ${entity} and ${rule} again, as row ${first} does`);
      else seen.set(key, i + 1);
    }
    if (failures.length === before && page && words !== undefined && knownHashOf(String(files.get(page.path)), words) !== hash.toLowerCase())
      notes.push(`${KNOWN}: ${entity}${owner ? ` in ${owner}` : ""} ${rule}: lapsed, the page or the rule changed since ${date}`);
  });
  return { failures, notes };
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/known.test.mjs`

Expected: PASS, 10 tests. If the failure for `Owner: "Mira Halvorsen"` on the decision row comes back with another wording, the wording is `resolveRow`'s: copy what it says into the test rather than rewording it in `lib/known.mjs`, since a `## Rests on` row reports the same sentence.

- [ ] **Step 5: Build the types and run the suites this touches**

Run: `npm run build && npm run build:check && npm run test:judge && npm run verify`

Expected: `types/lib/known.d.mts` is written; every command passes.

- [ ] **Step 6: Commit**

```bash
git add lib/known.mjs verify/known.test.mjs package.json types/lib/known.d.mts
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
judge/known.md has a reader that holds every row of it

An instance's owner decides the same judge flags over and over, because nothing records the
decision. lib/known.mjs reads judge/known.md, one table of Entity, Owner, Rule, Verdict, Why,
Seat, Profile, Date and Hash, and holds each row to the instance: the page and its owner
resolve as a `ref → by Entity in Owner` row does, the rule is one the type's schema has at that
position, the seat is a role the profile holds, and the verdict, date and hash are well formed.
A row whose hash, over the page and the rule's words, no longer matches is a note, not a
failure. Nothing calls it yet.

Verified: node --test verify/known.test.mjs (10 pass), npm run build, build:check, test:judge
and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

Write the `Verified:` line from what actually ran, with the counts the runs printed.

### Task 2: `check` reads `judge/known.md` when the instance has one

**Files:**

- Modify: `bin/check-instance.mjs` (imports near line 33; after the manifest's per-file hashes, before the `against` line near line 129)
- Test: `verify/known.test.mjs`

**Interfaces:**

- Consumes: `KNOWN`, `checkKnown` from Task 1; `instanceAt(dir)` from `lib/history.mjs`; `unixLines` from `lib/instance-files.mjs`, already imported.
- Produces: `check` output carrying the module's failures under `✗` and its notes under `noted:`, with the exit code the failures' alone.

- [ ] **Step 1: Write the failing end-to-end tests**

Append to `verify/known.test.mjs`, and add `import { spawnSync } from "node:child_process";` and `import { fileURLToPath } from "node:url";` to its imports:

```js
// The checker as CI calls it, on the fixture with a manifest naming this release.
const checker = fileURLToPath(new URL("../bin/check-instance.mjs", import.meta.url));
const VERSION = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const checkable = () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, ".companygraph", "manifest.json"), JSON.stringify({ tooling: VERSION, units: "meta" }));
  return dir;
};
const run = (dir) => spawnSync(process.execPath, [checker, dir], { encoding: "utf8" });
const write = (dir, text) => {
  fs.mkdirSync(path.join(dir, "judge"), { recursive: true });
  fs.writeFileSync(path.join(dir, KNOWN), text);
};

test("check passes an instance with no judge/known.md as before, and one whose rows are current", () => {
  const dir = checkable();
  const plain = run(dir);
  assert.equal(plain.status, 0, plain.stderr);
  assert.doesNotMatch(plain.stdout, /known\.md/);
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  const known = run(dir);
  assert.equal(known.status, 0, known.stderr);
  assert.doesNotMatch(known.stdout, /known\.md/);
});

test("check fails a broken row and notes a lapsed one", () => {
  const dir = checkable();
  write(dir, fileOf(decisionRow(instanceAt(dir), { Seat: "Nobody" })));
  const broken = run(dir);
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /judge\/known\.md: row 1: Seat "Nobody" names no role/);
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  fs.appendFileSync(path.join(dir, "model", DECISION), "\nOne more line.\n");
  const lapsed = run(dir);
  assert.equal(lapsed.status, 0, lapsed.stderr);
  assert.match(lapsed.stdout, /^ {2}noted:$/m);
  assert.match(lapsed.stdout, /^ {4}judge\/known\.md: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04$/m);
});

test("a model that does not parse is the model's failure, and judge/known.md is noted as not read", () => {
  const dir = checkable();
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  // Two decisions of one name: parseInstance throws on R2 before any row could be read.
  fs.copyFileSync(path.join(dir, "model", DECISION), path.join(dir, "model", "decisions", "2022-billing-leaves-the-monolith-again.md"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /judge\/known\.md: not read, since the model does not parse: /);
  assert.doesNotMatch(result.stderr, /judge\/known\.md: row/);
});
```

The last test copies a decision under a second file name, so two decisions share a name and an id, which `parseInstance` refuses by throwing (R2). If the copy's duplicate id is reported first, the parse still throws and the note is the same: the test is about the note, not about which fault.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/known.test.mjs`

Expected: the three new tests FAIL: the broken row exits 0, and no `known.md` line is printed.

- [ ] **Step 3: Read the file in `checkPath`**

In `bin/check-instance.mjs`, add to the imports:

```js
import { instanceAt } from "../lib/history.mjs";
import { KNOWN, checkKnown } from "../lib/known.mjs";
```

and insert, after the loop over `manifest.files` and before `const against = …`:

```js
  // judge/known.md, the flags the owner has decided about the judge's report, when the instance
  // keeps one: a row that names nothing fails here, on the commit that wrote it, and a row whose
  // page or rule has changed since is noted, since it is a reason to read that flag again rather
  // than a broken file. It is read as `judge` reads the instance, so the hash a row carries is
  // the one `judge` printed. A model that does not parse has said so above, and every row would
  // fail for that one reason, so the file is then left unread and noted.
  if (existsSync(join(root, KNOWN))) {
    let instance = null;
    try {
      instance = instanceAt(root);
    } catch (error) {
      notes.push(`${KNOWN}: not read, since the model does not parse: ${/** @type {Error} */ (error).message}`);
    }
    if (instance) {
      const known = checkKnown(unixLines(readFileSync(join(root, KNOWN), "utf8")), instance);
      failures.push(...known.failures);
      notes.push(...known.notes);
    }
  }
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test verify/known.test.mjs`

Expected: PASS, 13 tests.

- [ ] **Step 5: Build and run what the checker touches**

Run: `npm run build && npm run build:check && npm run test:judge && npm run test:cli && npm run test:instance-checks && npm run verify`

Expected: every command passes. `types/bin/check-instance.d.mts` may not change; commit it only if `npm run build` did.

- [ ] **Step 6: Commit**

```bash
git add bin/check-instance.mjs verify/known.test.mjs
git status --short types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
check holds judge/known.md when the instance keeps one

A row of judge/known.md that names nothing would otherwise be found only by the next judge run,
on whoever runs it. check now reads the file when it exists, with the instance read as judge
reads it, fails a broken row and notes a lapsed one; an instance without the file checks as
before, and a model that does not parse leaves the file unread and noted, since every row would
fail for that one reason.

Verified: node --test verify/known.test.mjs (13 pass), npm run build, build:check, test:judge,
test:cli, test:instance-checks and verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

Add any changed file under `types/` that `git status --short types/` lists before committing.

### Task 3: `judge` prints each verdict's hash

**Files:**

- Modify: `lib/questions.mjs` (`reportOf`, its JSDoc and the verdict line, near lines 375–405)
- Modify: `bin/companygraph.mjs` (the `reportOf` call near line 958)
- Modify: `README.md:123` (the `judge` paragraph)
- Modify: `types/lib/questions.d.mts` (written by `npm run build`)
- Test: `verify/questions.test.mjs`, `verify/judge.test.mjs`

**Interfaces:**

- Consumes: `knownHashOf(page, rule)` from Task 1; `Request` and `RuleQuestion` from `lib/questions.mjs`.
- Produces: `reportOf(questions, answers, { band?, hashOf?: (request: Request, question: RuleQuestion) => string })`; with `hashOf`, every verdict line reads `  ! 0.47  r3  <16 hex>  <rule>` (or `?` unmeasured). Task 4's skill reads the hash from that position.

- [ ] **Step 1: Write the failing tests**

In `verify/questions.test.mjs`, after the test "measured, a verdict below the band is flagged and a rule near even for most pages cannot be judged", add:

```js
test("given a hash, each verdict line carries it between the rule's number and its words, and a pick line does not", () => {
  const hashOf = (r, q) => `${r.path[0]}${q.id}`.padEnd(16, "0");
  const lines = reportOf(asked, answers, { band: { low: 0.4, high: 0.6, pick: 0.7 }, hashOf });
  assert.ok(lines.some((l) => /^ {2}! 0\.20 {2}r2 {2}ar20{13} {2}Two\.$/.test(l)));
  assert.ok(lines.some((l) => /^ {2}! 0\.80 {2}g1 {2}"Split a service\."/.test(l)), "a pick keeps its line, since no row covers a pick");
  const unmeasured = reportOf(asked, answers, { band: null, hashOf });
  assert.ok(unmeasured.some((l) => /^ {2}\? 0\.20 {2}r2 {2}ar20{13} {2}Two\.$/.test(l)));
  assert.ok(reportOf(asked, answers, { band: { low: 0.4, high: 0.6, pick: 0.7 } }).some((l) => /^ {2}! 0\.20 {2}r2 {2}Two\.$/.test(l)), "without a hash the line is as before");
});
```

In `verify/judge.test.mjs`, give the fake service the answer it gives every rule, so a test can have every rule flagged. Change `const service = async (status = 200) => {` to `const service = async (status = 200, noul = 0.9) => {`, and in its answers change `{ type: "noul", noul: 0.9 }` to `{ type: "noul", noul }`. Change the comment above it to `// A fake TypeSafe: every noul answered alike, 0.9 unless a test asks otherwise, every choice its first option.` Add to the imports:

```js
import { knownHashOf } from "../lib/known.mjs";
import { writingRulesOf } from "../lib/questions.mjs";
import { unixLines } from "../lib/instance-files.mjs";
```

and after the test "on a yes, judge sends one request per page with the key and prints the advisory report", add:

```js
test("a flagged line carries the hash check computes for that page and rule", async () => {
  const fake = await service(200, 0.1);
  try {
    const root = fresh();
    const { code, out } = await judge(root, { input: "y\n", env: { ...withoutKey(), TYPESAFE_API_KEY: "sk-secret", COMPANYGRAPH_TYPESAFE_URL: fake.url } });
    assert.equal(code, 0, out);
    const report = out.slice(out.indexOf("judge: advisory")).split("\n");
    const flag = report[report.indexOf("model/identity.md") + 1].match(/^ {2}! 0\.10 {2}r(\d+) {2}([0-9a-f]{16}) {2}/);
    assert.ok(flag, "identity's first flagged line carries a hash");
    const page = unixLines(fs.readFileSync(path.join(root, "model", "identity.md"), "utf8"));
    const rule = writingRulesOf(fs.readFileSync(path.join(root, "meta", "core", "identity-schema.md"), "utf8"))[Number(flag[1]) - 1];
    assert.equal(flag[2], knownHashOf(page, rule));
  } finally {
    fake.close();
  }
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/questions.test.mjs verify/judge.test.mjs`

Expected: the two new tests FAIL; every other test passes, the fake's default still being 0.9.

- [ ] **Step 3: Add `hashOf` to `reportOf` and pass it from `judge`**

In `lib/questions.mjs`, add to the comment above `reportOf`, after its last sentence:

```js
// Given `hashOf`, each verdict line carries the hash of its page and rule between the rule's
// number and its words, which is what a row of judge/known.md is keyed on; it is passed in, so
// this module computes no hash and a caller that wants none gets today's lines.
```

change the options in its JSDoc to:

```js
 * @param {{ band?: Band | null; hashOf?: (request: Request, question: RuleQuestion) => string }} [options]
```

the signature to:

```js
export function reportOf({ asked, notAsked, skipped = [] }, answers, { band = BAND, hashOf } = {}) {
```

and the verdict line to:

```js
        verdicts.push({ p: answer.p, line: `${two(answer.p)}  ${q.id}  ${hashOf ? `${hashOf(r, q)}  ` : ""}${short(q.rule, 100)}` });
```

In `bin/companygraph.mjs`, in `judge`, replace

```js
  for (const line of reportOf(questions, answers)) console.log(line);
```

with

```js
  // Each verdict carries the hash a row of judge/known.md is keyed on, from the function check
  // holds the rows with, so the judge skill matches and writes rows by copying it.
  const { knownHashOf } = await import("../lib/known.mjs");
  for (const line of reportOf(questions, answers, { hashOf: (r, q) => knownHashOf(r.state.entity, q.rule) })) console.log(line);
```

- [ ] **Step 4: Run them to see them pass**

Run: `node --test verify/questions.test.mjs verify/judge.test.mjs`

Expected: PASS.

- [ ] **Step 5: Say it in the README**

In `README.md`, in the `judge [<folder>]` paragraph (line 123), after the sentence ending `…which the validate skill reads before it reads the rest; it gates nothing and never prints a line that reads as a pass.`, insert:

```markdown
Each verdict line carries a hash of its page and its rule's words, which a row of `judge/known.md` is keyed on: that file is the instance's record of the flags its owner has decided, `false` where the judge was wrong and `accepted` where the page breaks the rule and the owner keeps it, and `check` fails a row that names nothing and notes one whose page or rule has changed since.
```

- [ ] **Step 6: Build and run the suites**

Run: `npm run build && npm run build:check && npm run test:judge && npm run verify && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: every command passes.

- [ ] **Step 7: Commit**

```bash
git add lib/questions.mjs bin/companygraph.mjs README.md verify/questions.test.mjs verify/judge.test.mjs types/lib/questions.d.mts
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
judge prints the hash a known flag is keyed on

A row of judge/known.md is keyed on a hash of its page and its rule's words, and an agent
cannot be trusted to compute a SHA-256 by hand. judge now prints that hash on every verdict
line, between the rule's number and its words, from the function check holds the rows with, so
the judge skill matches rows and writes new ones by copying. reportOf takes the hash as an
option, so lib/questions.mjs computes none and every other caller keeps its lines.

Verified: npm run build, build:check, test:judge (with the hash on a flagged line equal to the
one check computes) and verify pass, as do conventions-format and conventions-check.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 4: The judge skill reads `judge/known.md` and proposes rows

**Files:**

- Modify: `agents/claude/skills/companygraph-judge/SKILL.md` (step 5, the reading's template in step 6, a new step 7, the Report)
- Modify: `lib/instance-files.mjs:291` (the AGENTS.md sentence on `companygraph-judge`)
- Test: `verify/cli.test.mjs`

**Interfaces:**

- Consumes: the verdict line `  ! <p>  r<N>  <16 hex>  <rule>` from Task 3; `check`'s handling of the file from Task 2.
- Produces: nothing code reads.

- [ ] **Step 1: Write the failing tests**

In `verify/cli.test.mjs`, in the test "init writes the skills, hashed into the manifest like the core, and tells how to run the checks", after the line asserting `` "`companygraph-judge`" ``, add:

```js
  assert.ok(agents.includes("`judge/known.md`"), "AGENTS.md names the file of known flags");
```

and after the test "the judge skill writes its report and reading to dist/judge/, the reading as findings with a fix each", add:

```js
test("the judge skill reads judge/known.md before the flags and proposes rows only on the owner's word", () => {
  const skill = fs.readFileSync(path.join(here, "..", "agents/claude/skills/companygraph-judge/SKILL.md"), "utf8");
  assert.match(skill, /judge\/known\.md/);
  for (const part of ["## Known", "## Proposed for known"]) assert.ok(skill.includes(part), `the reading has ${part}`);
  assert.ok(skill.includes("| Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash |"), "a proposed row has the file's columns");
  assert.match(skill, /one batch/, "the confirmed false flags are proposed as one batch");
  assert.match(skill, /superseding decision/, "a finding on a standing decision says how it is fixed");
  assert.match(skill, /never compute/i, "the hash is copied from the report, never computed");
  assert.match(skill, /on the owner's word/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/cli.test.mjs`

Expected: the two changed tests FAIL.

- [ ] **Step 3: Change the skill**

In `agents/claude/skills/companygraph-judge/SKILL.md`, change the front-matter `description` to:

```yaml
description: Ask TypeSafe's Jev whether each page of this CompanyGraph instance keeps its schema's writing rules — show the owner what would leave the machine, send on their yes, write the report and its reading to dist/judge/, read its flags against the pages and judge/known.md, and propose rows for the flags the owner decides. Advisory; it changes no entry.
```

Replace the first sentence of step 5, `5. Read the report.`, with:

```markdown
5. Read `judge/known.md` from the instance root when it exists: the flags the owner has already decided, `false` where the judge was wrong and `accepted` where the page breaks the rule and the owner keeps it. Each verdict line of the report carries the flag's hash after its rule number, `! 0.47  r3  a1b2c3d4e5f60718  …`. A flag whose rule number and hash are a row's `Rule` number and `Hash` is known: it goes to **Known** in the reading and is not read again. A flag with a row for the same page and rule whose hash differs has lapsed, since the page or the rule changed after the owner decided, and is read like any other. Then read the report.
```

In step 6's template, between the `## False flags` block and the `## Not checked` block, insert:

```markdown
   ## Known

   - <type> r<N> on `<page>`: <false or accepted> since <date>.

   ## Proposed for known

   False flags confirmed above, as one batch the owner approves or rejects whole:

   | Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | <the page's H1> | <the owner's H1 for an owned type, else empty> | <type> r<N> | false | <how the page keeps the rule> | <seat> | <profile> | <YYYY-MM-DD> | <the hash on the flag's line> |

   Each accepted finding on its own: the finding's number and its row, `accepted`, with why the owner keeps it.

   Each lapsed row read again: the row with the new hash where its verdict still holds, or "remove" where the flag now stands.
```

After step 6's paragraph "Findings about the schema come first, …", add:

```markdown
   A finding on the text of a standing decision says that it is fixed only by a superseding decision, so that accepting it is a choice the owner sees. Copy every hash from its flag's line and never compute one.

7. On the owner's word, and only for the rows they approved, write the rows to `judge/known.md`: the false flags as the batch they approved or not at all, each accepted finding as they decided it, each lapsed row with its new hash or removed. Create the file when it is missing, an H1 `# Known judge flags` and the table's header row. `Seat` and `Profile` are the seat the person who gave the word holds for it and the profile that holds that seat, and `Date` is the day they gave it. Run `npx github:companygraph/meta-model#v<tooling> check` from the instance root; it holds every row, and a row it fails is fixed before anything else. The commit is the owner's to approve like any other change.
```

Replace the Report section's first paragraph with:

```markdown
In the conversation, keep it short: the counts, how many flags were known, each finding's title, the rows proposed for known, and the path of the reading. The owner decides the fixes and the rows from the file, one at a time.
```

- [ ] **Step 4: Change the AGENTS.md sentence**

In `lib/instance-files.mjs` line 291, replace

```text
writes the report and its reading to `dist/judge/`; `companygraph-validate` reads that report first.
```

with

```text
writes the report and its reading to `dist/judge/`, and on the owner's word records the flags they decide in `judge/known.md`, which `check` holds; `companygraph-validate` reads that report first.
```

- [ ] **Step 5: Run the tests and the family's checks**

Run: `node --test verify/cli.test.mjs && npm run build && npm run build:check && npm run verify && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: every command passes. If `conventions-format` names the skill's template table, fix it with `sh conventions/conventions-format fix` and read the diff before keeping it.

- [ ] **Step 6: Commit**

```bash
git add agents/claude/skills/companygraph-judge/SKILL.md lib/instance-files.mjs verify/cli.test.mjs
git status --short types/
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The judge skill reads judge/known.md and proposes rows for it

Every judge run read about 280 false flags again on robertblust/mental-model, and a finding the
owner had kept came back each time. The skill now reads judge/known.md before the flags, puts
each flag whose hash a row carries under Known without reading it again, reads a lapsed one
like any other, and ends its reading with the rows it proposes: the confirmed false flags as
one batch, each accepted finding on its own, each lapsed row re-hashed or removed. It writes
them only on the owner's word, copying every hash from the report, and runs check over them.
AGENTS.md says where the record lives.

Verified: node --test verify/cli.test.mjs, npm run build, build:check and verify pass, as do
conventions-format and conventions-check.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

Add any changed file under `types/` that `git status --short types/` lists before committing.

### Task 5: The whole suite, and the pull request

**Files:** none changed unless a step below finds something.

- [ ] **Step 1: Run every suite**

Run: `npm run verify && npm run build:check && for s in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(k=>k.startsWith("test:")).join(" "))'); do npm run -s $s || echo "FAILED $s"; done && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: no `FAILED` line; note each script's pass count for the pull request's `Verified:` line.

- [ ] **Step 2: Try it on a real instance, read-only**

In a scratch copy of `robertblust/mental-model` under the scratchpad (never the clone), set `.companygraph/manifest.json`'s `tooling` to this package's version, write `judge/known.md` with one row, decision r3 on `Agents write the model, and I approve every change to it`, `accepted`, Seat `Owner`, Profile `Robert Blust`, Date `2026-10-04`, and the hash `node -e` computes with `knownHashOf` over that page and `writingRulesOf` of its vendored `decision-schema.md`'s third rule. Run `node bin/check-instance.mjs <copy>`: it passes. Edit one word of the decision's page in the copy and run it again: it passes with the lapsed note. Delete the copy.

- [ ] **Step 3: Open the pull request**

Push the branch and open the pull request in the family's register: prose paragraphs, no headings or bullet lists, opening with the gap (about 280 false flags re-read a run, and a kept finding returning), then what changed in check, judge and the skill, then what it costs downstream (an instance takes it with `companygraph upgrade`; the first row is written in `robertblust/mental-model` after that). Add `Release notes to write at tagging: check holds judge/known.md; judge prints each verdict's hash; the companygraph-judge skill reads judge/known.md and proposes rows.` and end with the `Verified:` sentence from Steps 1 and 2 and the 🤖 line. Stop there: merging is the owner's word.

Not in this plan: the release that carries it, which waits for the owner's call and for v0.78.0 if that comes first, and the first row in `robertblust/mental-model`, written on the owner's word after that instance takes the release.
