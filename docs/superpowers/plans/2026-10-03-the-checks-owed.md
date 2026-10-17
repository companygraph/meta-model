# The checks owed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every norm #254 moved into a schema's Purpose is held by an instance check: eleven read the model as it stands, three of them through a new `noted:` channel that fails nothing, and three read what a pull request changed, through `companygraph ids --range`.

**Architecture:** Task 1 opens the second channel: `instanceChecks` takes `note` and `today`, `checkInstance` returns `notes`, `companygraph check` prints them under `noted:`, and the passed-horizon note is its first user. Tasks 2 to 5 add the state checks, each declared on the `TYPES` or `PACKS` entry of the type it holds, the way `labels` already is, so no check names a type. Task 6 adds the change checks as pure functions beside `idChangesOf`, with deleted pages and a page's history read in `lib/history.mjs`, and runs them from `ids --range`. Task 7 writes the two Purpose sentences, runs everything against the three real instances and opens the two follow-up issues.

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-10-03-the-checks-owed-design.md` (companygraph/meta-model#257), in the same pull request as this plan.

**Tried:** Every task's code and tests below were run once on a scratch clone of `6b5e5f4`: each new test passed, `npm run verify` and every `test:*` script passed, `npm run build:check` passed after `npm run build`, the family form passed, and `node bin/check-instance.mjs` against the three instances failed nothing, with the reference instance's profile noted twice and nothing else noted. Two existing fixtures had to change, `verify/decision.test.mjs` and `verify/question-kind.test.mjs`, because each was a tree the new checks rightly refuse; Task 4 makes those edits.

## Global Constraints

- Each check is declared on the entry `TYPES` or `PACKS` keeps for the type it holds, as `labels` and `rank` are; no check names a type, a section or a column in its own code.
- A failure's message names the page and ends with the rule it cites, `(R16)` for every check this plan adds; a note names the page and cites nothing, and the gap note takes exactly the form `gap <profile>: <role> requires <skill>`.
- `note` is optional on `instanceChecks` and a no-op where it is not passed, so `instanceChecks({ files: new Map(), fail() {} })`, the MCP server's call, keeps working unchanged.
- `companygraph check` prints notes under `noted:` on a passing and a failing run alike, and its exit code stays the failures' alone.
- `today` defaults to the UTC date, `new Date().toISOString().slice(0, 10)`; every test that reads the calendar passes one.
- The command stays `companygraph ids --range <a>..<b>`, so the instance workflow's step does not change; on the repository that makes core, the range runs the id check alone.
- No schema field is added: the replaced status is inferred, and "proposed" stays unmarked.
- No version bump, no tag and no release notes, core's version included: the release is the owner's.
- American English (R14). Code comments follow the surrounding file: prose paragraphs saying why, no bullet lists. No numbers that move in prose.
- Commits and PR bodies are prose in the git register: a subject under seventy characters with no type prefix, one to three paragraphs, then `Verified: …` naming what ran, then the trailers. Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in the worktree before the first test.
- After any change in `lib/` or `bin/`, `npm run typecheck` passes and `npm run build` rewrites `types/`; the rewritten files are committed in the same commit, and `npm run build:check` passes before each commit.

## Review Focus

- A concept design whose `## Relations` names itself, as companygraph.io's Procedure does: a person expects it to pass, since one page is not two entities naming each other. Task 2 tests the self row.
- A horizon of `2028-02` read on February 29, 2028: a person expects it still running, since a month ends on its real last day and not on the 28th or the 31st. Task 1 tests it.
- A rule whose `## Applies to` writes the same row twice: a person expects one entity, and the rule refused unless a control enforces it. Task 4 tests it.
- A profile URL differing from identity's only by a trailing slash or by case: a person expects it noted as the same address. Task 5 tests it.
- A decision whose base was checked out with CRLF line ends and whose head was written with LF, the words unchanged: a person expects no rewrite reported. Task 6 tests it.

---

### Task 1: The notes channel, and a passed horizon

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `strategic-objective` row of `TYPES`, two new module helpers above `instanceChecks`, `instanceChecks`' signature, one new check, `checkInstance`)
- Modify: `bin/check-instance.mjs` (print notes)
- Modify: `verify/check.mjs` (a note sink for the example)
- Modify: `package.json` (`test:instance-checks` takes the new file)
- Create: `verify/checks-owed.test.mjs`
- Modify: `verify/cli.test.mjs` (one test at the end)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `instanceChecks({ files, core?, model?, fail, note?, today?, requireSchemaIds?, packs? })` with `note: (message: string) => void` defaulting to a no-op and `today: string` defaulting to the UTC date; `checkInstance(files, { core?, model?, packs?, today? })` returning `{ failures: string[], skipped: string[], notes: string[] }`; exported `lastDayOf(date: string): string`; the `TypeEntry` property `expires?: string`; and in `verify/checks-owed.test.mjs` the helpers `core(name)`, `pack(name)`, `page(fm: string[], name, rest = "")`, `PACKS` and `run(files, today = "2026-10-03")` that every later task's tests use.

- [ ] **Step 1: Write the failing tests**

Create `verify/checks-owed.test.mjs`:

```js
// The checks a schema's Purpose is owed (companygraph/meta-model#257), held through the real
// schemas: core and the software pack are read from disk, so a test fails if a schema and its
// check part. A schema a case does not exercise is left out, and a case filters the failures to
// the check it is about, as decision.test.mjs does, so the scaffolding other checks would ask
// for is not written here.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance, instanceChecks } from "../lib/checks.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/software/${n}-schema.md`, import.meta.url), "utf8");
const page = (fm, name, rest = "") => `---\nsource: Local\n${fm.map((l) => `${l}\n`).join("")}---\n\n# ${name}\n\n> A statement.\n${rest}`;
const PACKS = [{ name: "software", dir: "meta/software" }];
const run = (files, today = "2026-10-03") => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS, today });

// --- Notes, and a passed horizon -----------------------------------------------------------

const objective = (horizon) => new Map([
  ["meta/core/strategic-objective-schema.md", core("strategic-objective")],
  ["model/strategic-objectives/invoices-explain-themselves.md",
    page(["adopted: 2026-01", ...(horizon ? [`horizon: ${horizon}`] : [])], "Invoices explain themselves")],
]);

test("a horizon is noted from the day after the period it names, at its own precision", () => {
  const cases = [
    ["2026", "2026-12-31", false], ["2026", "2027-01-01", true],
    ["2026-09", "2026-09-30", false], ["2026-09", "2026-10-01", true],
    ["2026-09-15", "2026-09-15", false], ["2026-09-15", "2026-09-16", true],
  ];
  for (const [horizon, today, noted] of cases)
    assert.equal(run(objective(horizon), today).notes.length, noted ? 1 : 0, `${horizon} on ${today}`);
});

test("a passed horizon is a note naming the page and the date, and never a failure", () => {
  const { notes, failures } = run(objective("2026-09"), "2026-10-03");
  assert.deepEqual(notes, ["model/strategic-objectives/invoices-explain-themselves.md: `horizon` is 2026-09, which has passed; the page is restated, re-dated or deleted rather than left to age"]);
  assert.deepEqual(failures.filter((f) => f.includes("horizon")), []);
});

test("a February horizon in a leap year holds through the 29th", () => {
  assert.equal(run(objective("2028-02"), "2028-02-29").notes.length, 0);
  assert.equal(run(objective("2028-02"), "2028-03-01").notes.length, 1);
});

test("an objective with no horizon is never noted", () => {
  assert.deepEqual(run(objective(null), "2099-01-01").notes, []);
});

test("a caller that passes no note runs every check without one", () => {
  assert.ok(instanceChecks({ files: new Map(), fail() {} }).length > 0);
  for (const check of instanceChecks({ files: objective("2020"), core: "meta/core", model: "model", fail() {} })) check.run();
});
```

Append to the end of `verify/cli.test.mjs`:

```js

// A note is printed under `noted:` on a passing run and on a failing one, and never moves the
// exit code: a horizon passes on a date, and failing on it would turn a green default branch red
// overnight.
test("check prints a passed horizon under noted:, on a passing run and a failing one, and exits on the failures alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const dir = path.join(root, "model/strategic-objectives");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "invoices-explain-themselves.md"),
    `---\nid: ${run(["id"]).trim()}\nsource: Local\nadopted: 2020-01\nhorizon: 2020-06\n---\n\n# Invoices explain themselves\n\n> A customer reads why a line is on an invoice without asking.\n\n## What it makes true\n\nNobody calls to ask.\n`);
  const passing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  assert.match(passing.stdout, /^ {2}noted:\n {4}model\/strategic-objectives\/invoices-explain-themselves\.md: `horizon` is 2020-06, which has passed/m);

  fs.writeFileSync(path.join(root, "model/stray.md"), "# Stray\n\n> Nothing.\n");
  const failing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(failing.status, 1);
  assert.match(failing.stdout, /^ {2}noted:\n {4}model\/strategic-objectives\/invoices-explain-themselves\.md/m);
});
```

In `package.json`, in the `test:instance-checks` script, change `verify/rule-risk-control.test.mjs"` to `verify/rule-risk-control.test.mjs verify/checks-owed.test.mjs"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/checks-owed.test.mjs` Expected: FAIL. The four horizon tests fail with `TypeError: Cannot read properties of undefined (reading 'length')` or a `deepEqual` against `undefined`, since `checkInstance` returns no `notes`; "a caller that passes no note runs every check without one" passes already.

Run: `node --test --test-name-pattern="noted:" verify/cli.test.mjs` Expected: FAIL, the `noted:` line is not in stdout.

- [ ] **Step 3: Declare the field that expires**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly below the line that begins ` * @property {{ section: string, column?: string, heading?: boolean }} [labels]`, add:

```js
 * @property {string} [expires] A date field whose passing is noted: once the period it names has ended, the page is reported without failing.
```

Replace the row `  { type: "strategic-objective", folder: "strategic-objectives" },` with:

```js
  // An objective's `horizon` passes on a date and not on a change anyone made, so a passed one
  // is noted rather than failed: failing it would break a green default branch overnight.
  { type: "strategic-objective", folder: "strategic-objectives", expires: "horizon" },
```

- [ ] **Step 4: Add today and the last day of a date**

In `lib/checks.mjs`, directly above the comment line `// Every check an instance runs, built against one tree and one copy of the rules. Returned`, add:

```js
// The date today in UTC, as R9 writes a full date. A runner's clock and a writer's agree on it
// to the day, which is the precision every date check here reads.
const todayUtc = () => new Date().toISOString().slice(0, 10);

// The last day a date in one of R9's three forms covers: a year's December 31, a month's last
// day, a full date itself. A shorter date is an interval (R9), and a check that asks whether it
// has passed asks whether all of it has.
/** @param {string} date @returns {string} */
export const lastDayOf = (date) =>
  date.length === 4 ? `${date}-12-31`
  : date.length === 7 ? new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 0)).toISOString().slice(0, 10)
  : date;

```

- [ ] **Step 5: Give instanceChecks a note and a date**

In `lib/checks.mjs`, replace:

```js
/**
 * @param {{ files: InstanceFiles, core?: string, model?: string, fail: (message: string) => void, requireSchemaIds?: boolean, packs?: PackRef[] }} options
 * @returns {Check[]}
 */
export function instanceChecks({ files, core = "core", model = MODEL, fail, requireSchemaIds = false, packs = [] }) {
```

with:

```js
//
// `note` is the second channel: a fact worth seeing that fails nothing, such as a gap a schema
// says is never an error or a date that has passed. A caller that runs the checks for their
// names alone, as the MCP server's snapshot does, passes none and loses nothing. `today` is the
// date a check that reads the calendar compares against, the UTC date where none is given, so a
// test can fix it.
/**
 * @param {{ files: InstanceFiles, core?: string, model?: string, fail: (message: string) => void, note?: (message: string) => void, today?: string, requireSchemaIds?: boolean, packs?: PackRef[] }} options
 * @returns {Check[]}
 */
export function instanceChecks({ files, core = "core", model = MODEL, fail, note = () => {}, today = todayUtc(), requireSchemaIds = false, packs = [] }) {
```

- [ ] **Step 6: Add the horizon check**

In `lib/checks.mjs`, at the end of the array `instanceChecks` returns, directly above the line `  ];` that closes it (after the check named "a unit names only what it may"), add:

```js
  {
    // A date that has passed is a fact about the calendar, not about the page, so it is noted and
    // never failed: a check that failed on it would turn a green default branch red overnight,
    // on a change nobody made. It is read at the date's own precision, so `2026` passes on the
    // first day of the next year and `2026-09` on the first of October. Which field is read is
    // stated on the type's row, as `labels` is, and a value in no date form is the date check's.
    name: "a date that expires is noted once it has passed",
    rule: "R16",
    run() {
      for (const { type, expires } of TYPES) {
        if (!expires) continue;
        walkMd(EX, (child, text) => {
          if (typeOfFile(child) !== type) return;
          const value = fmScalar(frontmatterOf(text), expires);
          if (value && DATE.test(value) && lastDayOf(value) < today)
            note(`${child}: \`${expires}\` is ${value}, which has passed; the page is restated, re-dated or deleted rather than left to age`);
        });
      }
    },
  },
```

Every later task inserts its checks directly above the `  {` that opens this one, so the notes stay last.

- [ ] **Step 7: Return the notes from checkInstance**

In `lib/checks.mjs`, replace the JSDoc and body of `checkInstance`:

```js
/**
 * @param {InstanceFiles} files
 * @param {{ core?: string, model?: string, packs?: PackRef[] }} [options]
 * @returns {{ failures: string[], skipped: string[] }}
 */
export function checkInstance(files, { core = "core", model = MODEL, packs = [] } = {}) {
  /** @type {string[]} */
  const failures = [];
  /** @param {string} message */
  const fail = (message) => failures.push(message);
  const { types, schemaOf } = vocabularyOf({ core, packs });
  const skipped = types.filter((t) => !files.has(schemaOf(t.type))).map((t) => t.type);
  for (const check of instanceChecks({ files, core, model, fail, packs })) check.run();
  return { failures, skipped };
}
```

with:

```js
/**
 * @param {InstanceFiles} files
 * @param {{ core?: string, model?: string, packs?: PackRef[], today?: string }} [options]
 * @returns {{ failures: string[], skipped: string[], notes: string[] }}
 */
export function checkInstance(files, { core = "core", model = MODEL, packs = [], today = todayUtc() } = {}) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const notes = [];
  /** @param {string} message */
  const fail = (message) => failures.push(message);
  /** @param {string} message */
  const note = (message) => notes.push(message);
  const { types, schemaOf } = vocabularyOf({ core, packs });
  const skipped = types.filter((t) => !files.has(schemaOf(t.type))).map((t) => t.type);
  for (const check of instanceChecks({ files, core, model, fail, note, today, packs })) check.run();
  return { failures, skipped, notes };
}
```

- [ ] **Step 8: Print the notes**

In `bin/check-instance.mjs`, replace `  const { failures, skipped } = checkInstance(files, { core, model: MODEL, packs });` with `  const { failures, skipped, notes } = checkInstance(files, { core, model: MODEL, packs });`, and directly above the line `  // Always, and on both paths: a report says what it did not check.` add:

```js
  // On both paths, and never counted: a note is a fact worth seeing that fails nothing, so the
  // exit code stays the failures' alone.
  if (notes.length) {
    console.log("  noted:");
    for (const n of notes) console.log(`    ${n}`);
  }

```

In `verify/check.mjs`, replace:

```js
const failures = [];
export const fail = (msg) => failures.push(msg);
```

with:

```js
const failures = [];
export const fail = (msg) => failures.push(msg);
// What the instance checks note about the example: printed, never counted.
const notes = [];
const note = (msg) => notes.push(msg);
```

replace `    ...instanceChecks({ files: filesUnder(EX, `core`), core: `core`, model: EX, fail, requireSchemaIds: true }),` with `    ...instanceChecks({ files: filesUnder(EX, `core`), core: `core`, model: EX, fail, note, requireSchemaIds: true }),`, and replace the line `for (const check of CHECKS) check.run();` with:

```js
for (const check of CHECKS) check.run();

if (notes.length) {
  console.log("noted:");
  for (const n of notes) console.log(`  ${n}`);
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `node --test verify/checks-owed.test.mjs && node --test --test-name-pattern="noted:" verify/cli.test.mjs` Expected: PASS.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks && npm run test:cli` Expected: each passes; `verify` ends `✓ … checks passed` and prints no `noted:` line, since the example's horizon has not passed.

- [ ] **Step 10: Commit**

```bash
git add lib/checks.mjs bin/check-instance.mjs verify/check.mjs verify/checks-owed.test.mjs verify/cli.test.mjs package.json types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A check can note a fact without failing on it

Three of the norms the checks owe are not errors, so the checker gains a second channel. instanceChecks takes an optional note callback and a today date, checkInstance returns notes beside failures and skipped, and companygraph check prints them under noted: on a passing and a failing run alike, its exit code still the failures' alone. The MCP server's snapshot, which passes no note, runs unchanged.

The first note is a strategic objective whose horizon has passed, read at the horizon's own precision and declared on the type's row as expires.

Verified: node --test verify/checks-owed.test.mjs and the noted: CLI test pass; npm run typecheck, build:check, verify, test:instance-checks and test:cli pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 2: A relation written on one side only

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `concept` row of `TYPES`, the `bounded-context` and `concept-design` rows of `PACKS.software`, two helpers inside `instanceChecks`, one new check)
- Modify: `verify/checks-owed.test.mjs` (append)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: `run`, `core`, `pack`, `page` from Task 1's test file; `instanceChecks`' internal `walkMd`, `typeOfFile`, `columnTablesOf`, `refOf`, `entityNamed`.
- Produces: inside `instanceChecks`, `pagesOf(type: string): { path: string, text: string, name: string | null }[]` and `cellsOf(text: string, section: string, column: string): string[]`, which Tasks 3 to 5 use; the `TypeEntry` property `oneSided?: { section: string, column: string }`; and in the test file `BC`, `design(ctx, name, kind, rest = "")`, `context(name, rest = "")`, `softwareTree(...entries)`, `relations(rows)`, which Task 3 uses.

- [ ] **Step 1: Write the failing tests**

Append to `verify/checks-owed.test.mjs`:

```js

// --- A relation written on one side only ---------------------------------------------------

const relations = (rows) => `\n## Relations\n\n| Concept | Cardinality | As |\n| --- | --- | --- |\n${rows.map((r) => `| ${r} | one | |\n`).join("")}`;
const concepts = (rowsByName) => new Map([
  ["meta/core/concept-schema.md", core("concept")],
  ...Object.entries(rowsByName).map(([name, rows]) =>
    [`model/concepts/${name.toLowerCase()}.md`, page(["domain: Billing"], name, rows.length ? relations(rows) : "")]),
]);
const mutual = (files) => run(files).failures.filter((f) => f.includes("each name the other"));

test("two concepts each naming the other fail once, naming both pages", () => {
  assert.deepEqual(mutual(concepts({ Invoice: ["Customer"], Customer: ["Invoice"] })), [
    'model/concepts/customer.md and model/concepts/invoice.md each name the other in "## Relations"; a relation is written on one side only (R16)',
  ]);
});

test("a relation written on one side passes", () => {
  assert.deepEqual(mutual(concepts({ Invoice: ["Customer"], Customer: [] })), []);
});

test("a row naming its own page passes, since it is not two entities naming each other", () => {
  assert.deepEqual(mutual(concepts({ Invoice: ["Invoice"] })), []);
});

test("several rows to one target are one edge, and the pair fails once", () => {
  const files = concepts({ Invoice: ["Customer", "Customer"], Customer: ["Invoice"] });
  assert.equal(mutual(files).length, 1);
});

test("a cell that names nothing is R4's finding and is skipped here", () => {
  assert.deepEqual(mutual(concepts({ Invoice: ["Ghost"], Customer: ["Invoice"] })), []);
});

const BC = "model/bounded-contexts";
const design = (ctx, name, kind, rest = "") => [`${BC}/${ctx}/concept-designs/${name.toLowerCase().replace(/ /g, "-")}.md`, page([`kind: ${kind}`], name, rest)];
const context = (name, rest = "") => [`${BC}/${name.toLowerCase()}/${name.toLowerCase()}.md`, page(["classification: core"], name, `\n## Responsibilities\n\n- Something\n${rest}`)];
const softwareTree = (...entries) => new Map([
  ...["bounded-context", "concept-design", "aggregate", "domain-event"].map((n) => [`meta/software/${n}-schema.md`, pack(n)]),
  ...entries,
]);

test("two concept designs of one context naming each other fail; the same names across two contexts do not", () => {
  const within = softwareTree(context("Billing"), design("billing", "Invoice", "entity", relations(["Amount"])), design("billing", "Amount", "value object", relations(["Invoice"])));
  assert.equal(mutual(within).length, 1);
  const across = softwareTree(context("Billing"), context("Ledger"),
    design("billing", "Invoice", "entity", relations(["Amount"])), design("billing", "Amount", "value object"),
    design("ledger", "Invoice", "entity"), design("ledger", "Amount", "value object", relations(["Invoice"])));
  assert.deepEqual(mutual(across), []);
});

test("a concept design naming itself passes", () => {
  assert.deepEqual(mutual(softwareTree(context("Billing"), design("billing", "Procedure", "entity", relations(["Procedure"])))), []);
});

test("two bounded contexts each naming the other in Relationships fail", () => {
  const rel = (to) => `\n## Relationships\n\n| Context | Pattern |\n| --- | --- |\n| ${to} | partnership |\n`;
  const files = softwareTree(context("Billing", rel("Ledger")), context("Ledger", rel("Billing")));
  assert.deepEqual(mutual(files), [
    `${BC}/billing/billing.md and ${BC}/ledger/ledger.md each name the other in "## Relationships"; a relation is written on one side only (R16)`,
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/checks-owed.test.mjs` Expected: FAIL in "two concepts each naming the other fail once, naming both pages", "several rows to one target are one edge, and the pair fails once", "two concept designs of one context naming each other fail; …" and "two bounded contexts each naming the other in Relationships fail", each finding no failure; the others pass.

- [ ] **Step 3: Declare the one-sided columns**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly above the line ` * @property {string} [expires]`, add:

```js
 * @property {{ section: string, column: string }} [oneSided] A reference column written on one side only: no two entities of the type each name the other in it.
```

Replace `  { type: "concept", folder: "concepts" },` with:

```js
  // A relation between two concepts is written on one side, so no two name each other.
  { type: "concept", folder: "concepts", oneSided: { section: "Relations", column: "Concept" } },
```

In `PACKS.software`, replace:

```js
    { type: "bounded-context", folder: "bounded-contexts/<bounded-context>", owns: ["concept-design", "aggregate", "domain-event"] },
    { type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context" },
```

with:

```js
    // A relationship is written on the downstream side and a symmetric one once, so no two
    // contexts name each other; a concept design's relation is written on one side, as core's are.
    { type: "bounded-context", folder: "bounded-contexts/<bounded-context>", owns: ["concept-design", "aggregate", "domain-event"], oneSided: { section: "Relationships", column: "Context" } },
    { type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context", oneSided: { section: "Relations", column: "Concept" } },
```

- [ ] **Step 4: Add the readers of a type's pages and of a column**

In `lib/checks.mjs`, inside `instanceChecks`, directly below:

```js
  /** @param {string} rel */
  const typeOfFile = (rel) => typeOfPath(rel, model, TYPES);
```

add:

```js

  // Every page of one type, in path order, with its text and its H1: what the checks that read
  // across pages of a type start from. A page with no H1 carries `null`, which is R12's finding.
  /** @param {string} type @returns {{ path: string, text: string, name: string | null }[]} */
  const pagesOf = (type) => {
    /** @type {{ path: string, text: string, name: string | null }[]} */
    const out = [];
    walkMd(EX, (path, text) => {
      if (typeOfFile(path) === type) out.push({ path, text, name: text.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null });
    });
    return out;
  };

  // The cells of one column of one section's table on a page, backticks stripped and blanks
  // dropped; empty where the page has no such table or the table no such column, which is the
  // column check's finding and not a reader's.
  /** @param {string} text @param {string} section @param {string} column @returns {string[]} */
  const cellsOf = (text, section, column) => {
    const table = tableOf(sectionsOf(text).get(section) ?? "");
    const at = table ? table.columns.indexOf(column) : -1;
    if (!table || at < 0) return [];
    return table.rows.map((r) => (r[at] ?? "").replace(/`/g, "").trim()).filter(Boolean);
  };
```

- [ ] **Step 5: Add the check**

In `lib/checks.mjs`, directly above the `  {` that opens the check named "a date that expires is noted once it has passed", add:

```js
  {
    // A relation a schema says is written on one side only — a concept's, a concept design's, a
    // bounded context's — is held across pages, since no single page can break it: two entities
    // each naming the other fail once, naming both. Several rows to one target are one edge, and
    // a row naming its own page names no other entity. A cell that resolves to nothing is R4's,
    // and is read within the page's own owner where the target type is owned, as R4 reads it.
    // Which column is held is stated on the type's row, so no type is named here.
    name: "a relation is written on one side only",
    rule: "R16",
    run() {
      const tables = columnTablesOf();
      for (const t of TYPES) {
        if (!t.oneSided) continue;
        const { section, column } = t.oneSided;
        const declared = (tables.get(t.type) ?? []).find((x) => x.section === section)?.columns.find((c) => c.name === column)?.declared;
        const target = TYPES.find((x) => x.type === (declared ? refOf(declared)?.target : null));
        if (!target) continue;
        /** @type {Map<string, Set<string>>} */
        const names = new Map();
        for (const { path, text } of pagesOf(t.type)) {
          /** @type {Set<string>} */
          const out = new Set();
          for (const cell of cellsOf(text, section, column)) {
            const found = entityNamed(path, t.type, target, cell);
            if (found && found.path !== path) out.add(found.path);
          }
          names.set(path, out);
        }
        for (const [a, out] of names)
          for (const b of out)
            if (a < b && names.get(b)?.has(a))
              fail(`${a} and ${b} each name the other in "## ${section}"; a relation is written on one side only (R16)`);
      }
    },
  },
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test verify/checks-owed.test.mjs` Expected: PASS.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks` Expected: each passes.

- [ ] **Step 7: Commit**

```bash
git add lib/checks.mjs verify/checks-owed.test.mjs types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A relation is written on one side only, and a check holds it

Concepts, concept designs and bounded contexts each say in their Purpose that a relation is written on one side, a norm no single page can break. A check now fails two entities each naming the other, once per pair and naming both pages. A row naming its own page passes, several rows to one target are one edge, a cell that resolves to nothing is left to R4, and a concept design's rows are read within its own context. The column held is declared on each type's row as oneSided.

Verified: node --test verify/checks-owed.test.mjs passes; npm run typecheck, build:check, verify and test:instance-checks pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 3: A type cell names a term of its own context exactly, and a root is an entity

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `concept-design`, `aggregate` and `domain-event` rows of `PACKS.software`, two new checks)
- Modify: `verify/checks-owed.test.mjs` (append)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: `pagesOf`, `cellsOf` from Task 2; `entityNamed`, `fieldsOf`, `refOf`, `fieldValues`, `fmScalar`, `frontmatterOf`, `slug`; in the test file `run`, `page`, `BC`, `design`, `context`, `softwareTree`.
- Produces: the `TypeEntry` properties `typeCells?: { section: string, column: string, names: string, kind?: string }` and `refKind?: { field: string, kind: string }`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/checks-owed.test.mjs`:

```js

// --- A type cell names a term of its own context exactly, and a root is an entity ------------

const attributes = (types) => `\n## Attributes\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n${types.map((t, i) => `| A${i} | ${t} | |\n`).join("")}`;
const payload = (types) => `\n## Payload\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n${types.map((t, i) => `| A${i} | ${t} | |\n`).join("")}`;
const event = (ctx, name, types) => [`${BC}/${ctx}/domain-events/${name.toLowerCase().replace(/ /g, "-")}.md`, page(["emitted-by: Invoice"], name, payload(types))];
const typeCells = (files) => run(files).failures.filter((f) => /`Type` in "## (Attributes|Payload)"/.test(f));
const billing = (...entries) => softwareTree(context("Billing"), context("Ledger"),
  design("billing", "Invoice", "entity"), design("billing", "Amount", "value object"), design("ledger", "Posting", "value object"), ...entries);

test("an attribute naming a value object of its own context, a list of one, or a plain type passes", () => {
  assert.deepEqual(typeCells(billing(design("billing", "Line", "value object", attributes(["Amount", "`list of Amount`", "date", "Money"])))), []);
});

test("an attribute naming an entity of its own context fails, since an entity is a relation", () => {
  const f = typeCells(billing(design("billing", "Line", "value object", attributes(["Invoice"]))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /line\.md: `Type` in "## Attributes" says "Invoice", a concept-design of kind `entity`; a type names one of kind `value object`/);
});

test("a type matching a term of its own context only by case, slug or plural fails", () => {
  for (const cell of ["amount", "Amounts", "AMOUNT"]) {
    const f = typeCells(billing(design("billing", "Line", "value object", attributes([cell]))));
    assert.equal(f.length, 1, cell);
    assert.match(f[0], /the concept-design it matches here is "Amount"; a type names a term exactly/, cell);
  }
});

test("a type naming a term of another context and of none in its own fails", () => {
  const f = typeCells(billing(design("billing", "Line", "value object", attributes(["Posting"]))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /says "Posting", which is a concept-design of bounded-contexts\/ledger and of none in bounded-contexts\/billing/);
});

test("a payload type names a term of its own context of either kind, and never another context's", () => {
  assert.deepEqual(typeCells(billing(event("billing", "Invoice issued", ["Invoice", "Amount", "timestamp"]))), []);
  assert.equal(typeCells(billing(event("billing", "Invoice issued", ["Posting"]))).length, 1);
});

const aggregate = (root) => [`${BC}/billing/aggregates/invoice.md`, page([`root: ${root}`], "Invoice",
  "\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| INV-1 | A total never changes. |\n")];
const roots = (files) => run(files).failures.filter((f) => f.includes("`root` names"));

test("an aggregate whose root is an entity passes, one whose root is a value object fails, and one naming nothing is R4's", () => {
  assert.deepEqual(roots(billing(aggregate("Invoice"))), []);
  assert.deepEqual(roots(billing(aggregate("Amount"))), [
    `${BC}/billing/aggregates/invoice.md: \`root\` names "Amount", a concept-design of kind \`value object\`; it names one of kind \`entity\` (R16)`,
  ]);
  assert.deepEqual(roots(billing(aggregate("Ghost"))), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/checks-owed.test.mjs` Expected: FAIL in "an attribute naming an entity of its own context fails, …", "a type matching a term of its own context only by case, slug or plural fails", "a type naming a term of another context and of none in its own fails", "a payload type names a term of its own context of either kind, …" and "an aggregate whose root is an entity passes, …", each finding no failure.

- [ ] **Step 3: Declare the type cells and the root's kind**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly above ` * @property {string} [expires]`, add:

```js
 * @property {{ section: string, column: string, names: string, kind?: string }} [typeCells] A string column whose cell may name an entity of the type `names`, owned by the page's own owner: a cell that names one names it exactly, of the `kind` given where one is, and never one of another owner's alone.
 * @property {{ field: string, kind: string }} [refKind] A reference field whose target carries this value in its own `kind`.
```

In `PACKS.software`, replace these three rows, as Task 2 left the first:

```js
    { type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context", oneSided: { section: "Relations", column: "Concept" } },
    { type: "aggregate", folder: "bounded-contexts/<bounded-context>/aggregates", owner: "bounded-context", labels: { section: "Invariants", column: "Label" } },
    { type: "domain-event", folder: "bounded-contexts/<bounded-context>/domain-events", owner: "bounded-context" },
```

with:

```js
    // An attribute's type that names a term names a value object of the same context exactly; an
    // entity is a relation. A payload's type that names a term names one of the event's own
    // context, of either kind. An aggregate's root is an entity, since a value object has no
    // identity to reach the rest through.
    {
      type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context",
      oneSided: { section: "Relations", column: "Concept" },
      typeCells: { section: "Attributes", column: "Type", names: "concept-design", kind: "value object" },
    },
    {
      type: "aggregate", folder: "bounded-contexts/<bounded-context>/aggregates", owner: "bounded-context",
      labels: { section: "Invariants", column: "Label" },
      refKind: { field: "root", kind: "entity" },
    },
    {
      type: "domain-event", folder: "bounded-contexts/<bounded-context>/domain-events", owner: "bounded-context",
      typeCells: { section: "Payload", column: "Type", names: "concept-design" },
    },
```

- [ ] **Step 4: Add the two checks**

In `lib/checks.mjs`, directly above the `  {` that opens the check named "a date that expires is noted once it has passed", add:

```js
  {
    // A string column that may name a term — an attribute's type, a payload's — is a string and
    // not a reference, because most of what it holds is a plain type such as `date` that names
    // nothing. Where it does name a term, the schema says the term is its own owner's and named
    // exactly, which no single page can break and this holds. A cell is read with backticks
    // stripped and a leading `list of ` removed. It fails where it matches a term of its own owner
    // only loosely, by case, slug or plural; where it names a term of another owner and of none in
    // its own; and, where the row declares a kind, where the term it names is of another kind. A
    // cell that names no term at all is a plain type and passes. The column and the kind are
    // stated on the type's row, so no type is named here.
    name: "a type cell names a term of its own owner exactly",
    rule: "R16",
    run() {
      /** @param {string} a @param {string} b */
      const loosely = (a, b) => {
        const x = slug(a), y = slug(b);
        return x === y || x === `${y}s` || y === `${x}s` || x === `${y}es` || y === `${x}es`;
      };
      // The folder of the owner a page of an owned type sits in, `<owner folder>/<owner>`.
      /** @param {string} path */
      const ownerOf = (path) => path.slice(EX.length + 1).split("/").slice(0, 2).join("/");
      for (const t of TYPES) {
        if (!t.typeCells) continue;
        const { section, column, names, kind } = t.typeCells;
        const terms = pagesOf(names).map((p) => ({ ...p, owner: ownerOf(p.path), kind: fmScalar(frontmatterOf(p.text), "kind") }));
        for (const { path, text } of pagesOf(t.type)) {
          const own = ownerOf(path);
          for (const raw of cellsOf(text, section, column)) {
            const cell = raw.replace(/^list of /, "");
            const where = `${path}: \`${column}\` in "## ${section}" says "${raw}"`;
            const exact = terms.find((x) => x.owner === own && x.name === cell);
            if (exact) {
              if (kind && exact.kind !== kind)
                fail(`${where}, a ${names} of kind \`${exact.kind ?? "none"}\`; a type names one of kind \`${kind}\`, and any other is a relation (R16)`);
              continue;
            }
            const near = terms.find((x) => x.owner === own && x.name && loosely(x.name, cell));
            if (near) {
              fail(`${where}, and the ${names} it matches here is "${near.name}"; a type names a term exactly (R16)`);
              continue;
            }
            const elsewhere = terms.find((x) => x.owner !== own && x.name === cell);
            if (elsewhere)
              fail(`${where}, which is a ${names} of ${elsewhere.owner} and of none in ${own}; a type names a term of its own (R16)`);
          }
        }
      }
    },
  },
  {
    // A reference field whose target the schema says carries a kind: an aggregate's `root` is a
    // concept design of kind `entity`. R4 holds that the value resolves, read within the page's
    // own owner where the target is owned; this holds what it resolves to. A value that resolves
    // to nothing is R4's. The field and the kind are stated on the type's row.
    name: "a reference names an entity of the kind its schema says",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.refKind) continue;
        const { field, kind } = t.refKind;
        const declared = fieldsOf(t.type).find((f) => f.field === field)?.declared;
        const target = TYPES.find((x) => x.type === (declared ? refOf(declared)?.target : null));
        if (!target) continue;
        for (const { path, text } of pagesOf(t.type))
          for (const value of fieldValues(frontmatterOf(text), field)) {
            const found = entityNamed(path, t.type, target, value);
            if (!found) continue;
            const is = fmScalar(frontmatterOf(found.text), "kind");
            if (is !== kind)
              fail(`${path}: \`${field}\` names "${value}", a ${target.type} of kind \`${is ?? "none"}\`; it names one of kind \`${kind}\` (R16)`);
          }
      }
    },
  },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test verify/checks-owed.test.mjs verify/software.test.mjs` Expected: PASS; "a small instance written in the pack passes, …" in `software.test.mjs` still reports no failure, since its `Total | Amount` names a value object and its payload names its own context's terms.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks` Expected: each passes.

- [ ] **Step 6: Commit**

```bash
git add lib/checks.mjs verify/checks-owed.test.mjs types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A type cell names its own context's term exactly, a root an entity

A concept design's attribute type and a domain event's payload type are strings that may name a concept design, and the software pack's Purpose sentences say the name is the context's own and exact. A check now fails a cell that matches a term of its own context only by case, slug or plural, one that names a term of another context and of none in its own, and an attribute naming an entity rather than a value object; a plain type passes. A second check fails an aggregate whose root resolves to a concept design not of kind entity. Both are declared on the pack's rows, as typeCells and refKind.

Verified: node --test verify/checks-owed.test.mjs verify/software.test.mjs passes; npm run typecheck, build:check, verify and test:instance-checks pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 4: A kind holds two, a rule binds more than one, a replaced call carries one status

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `question-kind`, `decision` and `rule` rows of `TYPES`, three new checks)
- Modify: `verify/checks-owed.test.mjs` (append)
- Modify: `verify/decision.test.mjs` (the fixture's superseded call takes a status of its own)
- Modify: `verify/question-kind.test.mjs` (a second question of each kind)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: `pagesOf` from Task 2; `fieldValues`, `fmScalar`, `frontmatterOf`, `tableOf`, `sectionsOf`; in the test file `run`, `core`, `page`.
- Produces: the `TypeEntry` properties `gathers?: { by: string, field: string, least: number }`, `binds?: { section: string, by: string, field: string }` and `replaced?: { field: string, status: string }`. Task 6 rewrites the `decision` row this task writes.

- [ ] **Step 1: Write the failing tests**

Append to `verify/checks-owed.test.mjs`:

```js

// --- A question kind holds two, a rule binds more than one, a replaced call carries one status --

const questions = (kinds, asked) => new Map([
  ["meta/core/question-kind-schema.md", core("question-kind")],
  ["meta/core/question-schema.md", core("question")],
  ...kinds.map((k, i) => [`model/question-kinds/${k.toLowerCase()}.md`, page([`rank: ${(i + 1) * 10}`], k)]),
  ...asked.map((k, i) => [`model/questions/q${i}.md`, page([`kind: ${k}`], `Question ${i}?`)]),
]);
const kinds = (files) => run(files).failures.filter((f) => f.includes("gathers at least"));

test("a question kind named by two questions passes, and one named by one or none fails", () => {
  assert.deepEqual(kinds(questions(["Product"], ["Product", "Product"])), []);
  assert.deepEqual(kinds(questions(["Product", "Company"], ["Product", "Product", "Company"])), [
    "model/question-kinds/company.md: 1 question page names it in `kind`; a question-kind gathers at least 2, and one with fewer is folded into the nearest (R16)",
  ]);
  assert.match(kinds(questions(["Product", "Company"], ["Product", "Product"]))[0], /company\.md: 0 question pages name it/);
});

test("an instance holding at most one question asks nothing of its kinds", () => {
  assert.deepEqual(kinds(questions(["Product", "Company"], ["Product"])), []);
  assert.deepEqual(kinds(questions(["Product"], [])), []);
});

const appliesTo = (rows) => rows.length ? `\n## Applies to\n\n| Type | Entity | Owner |\n| --- | --- | --- |\n${rows.map((r) => `| ${r} |\n`).join("")}` : "";
const rules = (rows, enforced = false) => new Map([
  ["meta/core/rule-schema.md", core("rule")],
  ["meta/core/control-schema.md", core("control")],
  ["model/rules/a-change-is-reviewed.md", page(["modality: must"], "A change is reviewed", `\n## Why\n\nProse.\n${appliesTo(rows)}`)],
  ["model/controls/main-requires-a-review.md", page(["kind: preventive", "mode: automated", ...(enforced ? ["enforces:", "  - A change is reviewed"] : [])], "Main requires a review", "\n## How it is carried out\n\nProse.\n")],
]);
const binds = (files) => run(files).failures.filter((f) => f.includes("binds more than one"));

test("a rule naming one entity and enforced by no control fails, naming the section and the control type", () => {
  assert.deepEqual(binds(rules(["role | Reviewer | "])), [
    'model/rules/a-change-is-reviewed.md: "## Applies to" names one entity and no control names this rule in `enforces`; a rule binds more than one or is enforced, and a refusal only one makes stays on that one\'s page (R16)',
  ]);
});

test("a rule naming one entity twice is still one entity, and fails", () => {
  assert.equal(binds(rules(["role | Reviewer | ", "role | Reviewer | "])).length, 1);
});

test("a rule naming two entities, one a control enforces, and one with no rows all pass", () => {
  assert.deepEqual(binds(rules(["role | Reviewer | ", "process | Delivery | "])), []);
  assert.deepEqual(binds(rules(["role | Reviewer | "], true)), []);
  assert.deepEqual(binds(rules([])), []);
});

const decisions = (calls) => new Map([
  ["meta/core/decision-schema.md", core("decision")],
  ...calls.map(([name, status, supersedes = []], i) => [`model/decisions/2026-d${i}.md`,
    page(["decided: 2026-01", "kind: Architecture", `status: ${status}`, "by: Owner", ...(supersedes.length ? ["supersedes:", ...supersedes.map((s) => `  - ${s}`)] : [])], name)]),
]);
const replaced = (files) => run(files).failures.filter((f) => f.includes("carries one") || f.includes("still standing"));

test("superseded calls sharing one status that no standing call carries pass, and so does an instance with no supersedes", () => {
  assert.deepEqual(replaced(decisions([["A", "Replaced"], ["B", "Replaced"], ["C", "Standing", ["A", "B"]]])), []);
  assert.deepEqual(replaced(decisions([["A", "Standing"], ["B", "Proposed"]])), []);
});

test("superseded calls carrying two statuses fail once, naming each status and its pages", () => {
  assert.deepEqual(replaced(decisions([["A", "Replaced"], ["B", "Dropped"], ["C", "Standing", ["A", "B"]]])), [
    'the decision entities another names in `supersedes` carry 2 values of `status`: "Replaced" (model/decisions/2026-d0.md); "Dropped" (model/decisions/2026-d1.md); a replaced decision carries one (R16)',
  ]);
});

test("a call nothing supersedes that carries the replaced status fails, naming it", () => {
  assert.deepEqual(replaced(decisions([["A", "Replaced"], ["B", "Replaced"], ["C", "Standing", ["A"]]])), [
    'model/decisions/2026-d1.md: `status` is "Replaced", which every decision named in another\'s `supersedes` carries, and none names this one there; a decision still standing does not carry it (R16)',
  ]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/checks-owed.test.mjs` Expected: FAIL in "a question kind named by two questions passes, and one named by one or none fails", "a rule naming one entity and enforced by no control fails, …", "a rule naming one entity twice is still one entity, and fails", "superseded calls carrying two statuses fail once, …" and "a call nothing supersedes that carries the replaced status fails, naming it"; the others pass.

- [ ] **Step 3: Declare the three norms**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly above ` * @property {string} [expires]`, add:

```js
 * @property {{ by: string, field: string, least: number }} [gathers] An entity named by at least `least` entities of the type `by` in their `field`, unless the instance holds fewer than `least` of them.
 * @property {{ section: string, by: string, field: string }} [binds] An entity whose table `section` names more than one distinct entity, has no rows, or is named by an entity of the type `by` in its `field`.
 * @property {{ field: string, status: string }} [replaced] The entities another names in `field` all carry one value in `status`, and no entity outside them carries it.
```

Replace `  { type: "question-kind", folder: "question-kinds" },` with:

```js
  { type: "question-kind", folder: "question-kinds", gathers: { by: "question", field: "kind", least: 2 } },
```

Replace `  { type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" } },` with:

```js
  // A call another supersedes carries the one status the instance keeps for a replaced call, and
  // no call still standing carries it; which status that is, is read from the calls superseded.
  { type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" }, replaced: { field: "supersedes", status: "status" } },
```

Replace `  { type: "rule", folder: "rules" },` with:

```js
  // A rule binds more than one seat, process or phase, or a control enforces it; a rule with no
  // rows applies everywhere.
  { type: "rule", folder: "rules", binds: { section: "Applies to", by: "control", field: "enforces" } },
```

- [ ] **Step 4: Add the three checks**

In `lib/checks.mjs`, directly above the `  {` that opens the check named "a date that expires is noted once it has passed", add:

```js
  {
    // An entity that exists to gather others — a question kind — is named by at least as many of
    // them as its type's row says, or it is a heading over one item. Counted over the entities
    // whose field names it, zero included; an instance that holds fewer of them than that has
    // nothing to gather yet, and passes.
    name: "an entity that gathers others gathers enough of them",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.gathers) continue;
        const { by, field, least } = t.gathers;
        const members = pagesOf(by);
        if (members.length < least) continue;
        /** @type {Map<string, number>} */
        const count = new Map();
        for (const { text } of members)
          for (const value of new Set(fieldValues(frontmatterOf(text), field))) count.set(value, (count.get(value) ?? 0) + 1);
        for (const { path, name } of pagesOf(t.type)) {
          const n = name ? count.get(name) ?? 0 : 0;
          if (n < least)
            fail(`${path}: ${n} ${by} ${n === 1 ? "page names" : "pages name"} it in \`${field}\`; a ${t.type} gathers at least ${least}, and one with fewer is folded into the nearest (R16)`);
        }
      }
    },
  },
  {
    // A rule binds more than one seat, process or phase, or a control checks it: a refusal one
    // seat makes stays on that seat's page. A rule whose table names exactly one distinct entity
    // and that no control enforces fails. One with no rows applies everywhere and binds them all,
    // and a row written twice is one entity. The table and the type that enforces are stated on
    // the type's row.
    name: "a rule binds more than one, or a control enforces it",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.binds) continue;
        const { section, by, field } = t.binds;
        /** @type {Set<string>} */
        const enforced = new Set(pagesOf(by).flatMap(({ text }) => fieldValues(frontmatterOf(text), field)));
        for (const { path, text, name } of pagesOf(t.type)) {
          const table = tableOf(sectionsOf(text).get(section) ?? "");
          if (!table) continue;
          const rows = new Set(table.rows.map((r) => r.map((c) => c.replace(/`/g, "").trim()).join("|")).filter((r) => r.replace(/\|/g, "")));
          if (rows.size === 1 && !(name && enforced.has(name)))
            fail(`${path}: "## ${section}" names one entity and no ${by} names this ${t.type} in \`${field}\`; a ${t.type} binds more than one or is enforced, and a refusal only one makes stays on that one's page (R16)`);
        }
      }
    },
  },
  {
    // With no field marking which status means "replaced", it is read from the calls replaced:
    // every entity another names in the declared field carries one status, and no entity outside
    // them carries it. Where the replaced carry more than one, that is said once and the rest is
    // not judged, since which of them is the replaced status is then the question. An instance
    // where nothing is replaced has nothing to check. A status that is missing is R16's.
    name: "a replaced entity carries one status, and only it does",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.replaced) continue;
        const { field, status } = t.replaced;
        const pages = pagesOf(t.type).map((p) => ({ ...p, status: fmScalar(frontmatterOf(p.text), status) }));
        const named = new Set(pages.flatMap(({ text }) => fieldValues(frontmatterOf(text), field)));
        const replaced = pages.filter((p) => p.name && named.has(p.name) && p.status);
        /** @type {Map<string, string[]>} */
        const by = new Map();
        for (const p of replaced) by.set(/** @type {string} */ (p.status), [...(by.get(/** @type {string} */ (p.status)) ?? []), p.path]);
        if (by.size > 1) {
          fail(`the ${t.type} entities another names in \`${field}\` carry ${by.size} values of \`${status}\`: ${[...by].map(([s, ps]) => `"${s}" (${ps.join(", ")})`).join("; ")}; a replaced ${t.type} carries one (R16)`);
          continue;
        }
        const [only] = by.keys();
        if (only === undefined) continue;
        for (const p of pages)
          if (p.status === only && !(p.name && named.has(p.name)))
            fail(`${p.path}: \`${status}\` is "${only}", which every ${t.type} named in another's \`${field}\` carries, and none names this one there; a ${t.type} still standing does not carry it (R16)`);
      }
    },
  },
```

- [ ] **Step 5: Move the two fixtures the new checks rightly refuse**

`verify/decision.test.mjs`'s tree has the call `GOOD` supersedes and `GOOD` itself both `Standing`, which the replaced-status check now refuses. In it, replace:

```js
  ["model/decisions/2026-submodule.md", decision("Core is a submodule", ["source: Local", "decided: 2026-08-20", "kind: Architecture", "status: Standing", "by: Owner"])],
```

with:

```js
  // The call GOOD supersedes carries the status kept for a replaced call, and no standing call
  // carries it, as the replaced-status check holds.
  ["model/decision-statuses/replaced.md", "---\nsource: Local\n---\n\n# Replaced\n\n> Read through the call that replaced it.\n\n## What it means\n\nProse.\n"],
  ["model/decisions/2026-submodule.md", decision("Core is a submodule", ["source: Local", "decided: 2026-08-20", "kind: Architecture", "status: Replaced", "by: Owner"])],
```

`verify/question-kind.test.mjs`'s tree has one question of each kind, which the gathers check now refuses. In it, replace:

```js
  ["model/questions/does-beacon-publish-its-revenue.md", question("Does Beacon publish its revenue?", ["source: Local", "kind: Company"])],
]);
```

with:

```js
  ["model/questions/does-beacon-publish-its-revenue.md", question("Does Beacon publish its revenue?", ["source: Local", "kind: Company"])],
  // A second question of each kind, since a kind holds at least two.
  ["model/questions/how-is-an-invoice-read.md", question("How is an invoice read?", ["source: Local", "kind: Product"])],
  ["model/questions/where-is-beacon.md", question("Where is Beacon?", ["source: Local", "kind: Company"])],
]);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test verify/checks-owed.test.mjs verify/decision.test.mjs verify/question-kind.test.mjs verify/rule-risk-control.test.mjs` Expected: PASS.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks` Expected: each passes; the example's two kinds each hold two questions, its rule names two entities, and none of its decisions supersedes another.

- [ ] **Step 7: Commit**

```bash
git add lib/checks.mjs verify/checks-owed.test.mjs verify/decision.test.mjs verify/question-kind.test.mjs types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
Kinds, rules and replaced calls are held across pages

Three Purpose norms read more than one page and now have checks. A question kind named by fewer than two questions fails, unless the instance holds at most one. A rule whose Applies to names exactly one distinct entity fails unless a control enforces it; a rule with no rows applies everywhere and passes. And with no field naming the replaced status, it is inferred: the decisions any supersedes names carry one status, and no decision outside them carries it. Each is declared on its type's row, as gathers, binds and replaced.

The decision and question-kind fixtures held a tree these checks rightly refuse, so the superseded call there takes a Replaced status and each kind gains a second question.

Verified: node --test verify/checks-owed.test.mjs, decision, question-kind and rule-risk-control tests pass; npm run typecheck, build:check, verify and test:instance-checks pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 5: A seat's skill a person does not claim, and the company's address repeated

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `profile` row of `TYPES`, two new note checks)
- Modify: `agents/claude/skills/companygraph-validate/SKILL.md` (the paragraph on the gap)
- Modify: `verify/checks-owed.test.mjs` (append)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: `note` from Task 1; `pagesOf`, `cellsOf` from Task 2; `entityNamed`, `fieldsOf`, `refOf`, `fieldValues`, `fmScalar`, `frontmatterOf`, `read`; in the test file `run`, `core`, `page`.
- Produces: the `TypeEntry` properties `claims?: { when: { field: string, is: string }, field: string, requires: string, section: string, column: string }` and `restates?: { when: { field: string, is: string }, of: string, fields: string[], section: string, column: string, url: string }`; the note `gap <profile H1>: <role> requires <skill>`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/checks-owed.test.mjs`:

```js

// --- A seat's required skill not claimed, and the company's address repeated: notes ---------

const skills = (names) => names.length ? `\n## Skills\n\n| Skill | Level |\n| --- | --- |\n${names.map((n) => `| ${n} | Proficient |\n`).join("")}` : "";
const alsoAt = (urls) => urls.length ? `\n## Also at\n\n| Where | URL |\n| --- | --- |\n${urls.map((u) => `| Somewhere | ${u} |\n`).join("")}` : "";
const people = ({ nature = "human", roles = ["Backend Engineer"], claims = [], location = null, urls = [] } = {}) => new Map([
  ["meta/core/profile-schema.md", core("profile")],
  ["meta/core/role-schema.md", core("role")],
  ["meta/core/identity-schema.md", core("identity")],
  ["model/identity.md", page(["email: hello@beacon.example", "location: Rotterdam", "url: https://beacon.example"], "Beacon Systems", alsoAt(["https://github.example/beacon"]))],
  ["model/roles/backend-engineer.md", page(["requires:", "  - Java", "  - Testing"], "Backend Engineer")],
  ["model/roles/reviewer.md", page(["requires:", "  - Testing"], "Reviewer")],
  ["model/profiles/mira/mira.md", page([`nature: ${nature}`, ...(roles.length ? ["roles:", ...roles.map((r) => `  - ${r}`)] : []),
    "email: hello@beacon.example", ...(location ? [`location: ${location}`] : [])], "Mira", skills(claims) + alsoAt(urls))],
]);
const notesOf = (files) => run(files).notes;

test("a person holding a seat is noted once per required skill they do not claim", () => {
  assert.deepEqual(notesOf(people({ claims: ["Java"] })), ["gap Mira: Backend Engineer requires Testing"]);
  assert.deepEqual(notesOf(people({ claims: [] })), ["gap Mira: Backend Engineer requires Java", "gap Mira: Backend Engineer requires Testing"]);
});

test("two seats requiring one skill are noted once each, and a seat listed twice once", () => {
  assert.deepEqual(notesOf(people({ roles: ["Backend Engineer", "Reviewer", "Reviewer"], claims: ["Java"] })),
    ["gap Mira: Backend Engineer requires Testing", "gap Mira: Reviewer requires Testing"]);
});

test("an agent, a person who claims every required skill and a seat naming nothing are never noted", () => {
  assert.deepEqual(notesOf(people({ nature: "agent" })), []);
  assert.deepEqual(notesOf(people({ claims: ["Java", "Testing"] })), []);
  assert.deepEqual(notesOf(people({ roles: ["Ghost"] })), []);
});

test("a person's location equal to identity's is noted, and one that differs is not", () => {
  const all = { claims: ["Java", "Testing"] };
  assert.deepEqual(notesOf(people({ ...all, location: "Rotterdam" })),
    ['model/profiles/mira/mira.md: `location` is "Rotterdam", as identity\'s is; identity holds it, and this page carries its own only where it differs']);
  assert.deepEqual(notesOf(people({ ...all, location: "Bergen" })), []);
});

test("a person's URL equal to identity's own or to one of its rows is noted, without a trailing slash or case", () => {
  const all = { claims: ["Java", "Testing"] };
  assert.deepEqual(notesOf(people({ ...all, urls: ["https://Beacon.example/", "https://github.example/beacon", "https://github.example/mira"] })), [
    'model/profiles/mira/mira.md: "## Also at" lists https://Beacon.example/, which identity holds as its `url`; identity holds it, and this page carries its own only where it differs',
    'model/profiles/mira/mira.md: "## Also at" lists https://github.example/beacon, which identity holds as a row of its "## Also at"; identity holds it, and this page carries its own only where it differs',
  ]);
});

test("a person's mail equal to identity's is two facts and never noted, and an agent's page is not read", () => {
  assert.deepEqual(notesOf(people({ claims: ["Java", "Testing"] })), []);
  assert.deepEqual(notesOf(people({ nature: "agent", location: "Rotterdam", urls: ["https://beacon.example"] })), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/checks-owed.test.mjs` Expected: FAIL in "a person holding a seat is noted once per required skill they do not claim", "two seats requiring one skill are noted once each, …", "a person's location equal to identity's is noted, …" and "a person's URL equal to identity's own or to one of its rows is noted, …", each finding no note; the others pass.

- [ ] **Step 3: Declare what a person claims and what they may repeat**

In `lib/checks.mjs`, in the `TypeEntry` typedef, directly above ` * @property {string} [expires]`, add:

```js
 * @property {{ when: { field: string, is: string }, field: string, requires: string, section: string, column: string }} [claims] What a page whose `when.field` is `when.is` claims: each entity its `field` names lists in its own `requires` what the page's `section` table names in `column`, and one it does not name is noted as a gap.
 * @property {{ when: { field: string, is: string }, of: string, fields: string[], section: string, column: string, url: string }} [restates] What a page whose `when.field` is `when.is` repeats of the singular type `of`: each of `fields` equal to its, and each URL of the `section` table's `column` equal to its `url` or one of its own rows, is noted.
```

Replace `  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },` with:

```js
  // A person who holds a seat claims the skills it requires, and where they do not the gap is a
  // note, never an error; an agent claims nothing. Where identity and a person's page would state
  // the same address, identity holds it, and a repeat is noted; a mail address is two facts.
  {
    type: "profile", folder: "profiles/<profile>", owns: ["experience"],
    claims: { when: { field: "nature", is: "human" }, field: "roles", requires: "requires", section: "Skills", column: "Skill" },
    restates: { when: { field: "nature", is: "human" }, of: "identity", fields: ["location"], section: "Also at", column: "URL", url: "url" },
  },
```

- [ ] **Step 4: Add the two note checks**

In `lib/checks.mjs`, directly above the `  {` that opens the check named "a date that expires is noted once it has passed", add:

```js
  {
    // A seat's required skill that the person holding it does not claim is a gap: what they have
    // to learn or the company has to hire. The profile schema says it is never an error, so it is
    // a note, once per seat and skill, in the form the validate skill reads. Only a page of the
    // nature the type's row names is read; an agent claims nothing, so a seat it holds reports no
    // gap. A seat that resolves to nothing is R4's.
    name: "a seat's required skill its holder does not claim is noted",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.claims) continue;
        const { when, field, requires, section, column } = t.claims;
        const declared = fieldsOf(t.type).find((f) => f.field === field)?.declared;
        const target = TYPES.find((x) => x.type === (declared ? refOf(declared)?.target : null));
        if (!target) continue;
        for (const { path, text, name } of pagesOf(t.type)) {
          const fm = frontmatterOf(text);
          if (fmScalar(fm, when.field) !== when.is) continue;
          const claimed = new Set(cellsOf(text, section, column));
          /** @type {Set<string>} */
          const seen = new Set();
          for (const held of fieldValues(fm, field)) {
            const seat = entityNamed(path, t.type, target, held);
            if (!seat) continue;
            for (const need of fieldValues(frontmatterOf(seat.text), requires)) {
              const key = `${held}\n${need}`;
              if (claimed.has(need) || seen.has(key)) continue;
              seen.add(key);
              note(`gap ${name ?? path}: ${held} requires ${need}`);
            }
          }
        }
      }
    },
  },
  {
    // A fact lives in one place: where identity and a person's page would state the same
    // address, identity holds it. A person's location equal to identity's, and a URL in their
    // table equal to identity's own address or to one of identity's rows, are noted, compared
    // without a trailing slash or case. Noted and not failed, since the repeat is worth seeing
    // and not worth blocking. Mail is not read: a mail address is two facts, the company's and
    // the person's own. Which fields and table are compared is stated on the type's row.
    name: "a page repeating the company's address is noted",
    rule: "R16",
    run() {
      /** @param {string} u */
      const plain = (u) => u.trim().replace(/^<|>$/g, "").replace(/\/+$/, "").toLowerCase();
      for (const t of TYPES) {
        if (!t.restates) continue;
        const { when, of, fields, section, column, url } = t.restates;
        const file = TYPES.find((x) => x.type === of)?.file;
        const ofText = file ? read(`${EX}/${file}`) : null;
        if (ofText === null) continue;
        const ofFm = frontmatterOf(ofText);
        const own = fmScalar(ofFm, url);
        /** @type {Map<string, string>} */
        const urls = new Map(cellsOf(ofText, section, column).map((u) => [plain(u), `a row of its "## ${section}"`]));
        if (own) urls.set(plain(own), `its \`${url}\``);
        for (const { path, text } of pagesOf(t.type)) {
          const fm = frontmatterOf(text);
          if (fmScalar(fm, when.field) !== when.is) continue;
          for (const f of fields) {
            const value = fmScalar(fm, f);
            if (value !== null && value === fmScalar(ofFm, f))
              note(`${path}: \`${f}\` is "${value}", as ${of}'s is; ${of} holds it, and this page carries its own only where it differs`);
          }
          for (const u of cellsOf(text, section, column)) {
            const as = urls.get(plain(u));
            if (as) note(`${path}: "## ${section}" lists ${u}, which ${of} holds as ${as}; ${of} holds it, and this page carries its own only where it differs`);
          }
        }
      }
    },
  },
```

- [ ] **Step 5: Let the validate skill read the note**

In `agents/claude/skills/companygraph-validate/SKILL.md`, replace the paragraph that begins `   One finding is a report line rather than a failure, and the profile schema's Purpose says so:` and ends `   agent wrote about itself.` with:

```markdown
   One finding is a note rather than a failure, and the profile schema's Purpose says so: for
   every profile whose nature is `human`, every skill a role it holds `requires` that has no row
   in its Skills table is a gap. `companygraph check` prints each one under `noted:` as
   `gap <profile>: <role> requires <skill>`, once per role and skill, and never counts it as a
   failure; carry those lines into the report as they stand rather than walking the roles by
   hand. A gap says what the holder has to learn or the company has to hire. A profile whose
   nature is `agent` claims no skill and carries no Skills table, so a seat it holds reports no
   gap: what that seat requires is answered by its rulebook, not by a row the agent wrote about
   itself.
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test verify/checks-owed.test.mjs` Expected: PASS.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks && npm run test:cli && npm run test:plan && sh conventions/conventions-format` Expected: each passes; `verify` prints no `noted:` line, since the example's one person holding a seat claims what it requires and no profile repeats Beacon's address; the form passes the edited skill.

- [ ] **Step 7: Commit**

```bash
git add lib/checks.mjs agents/claude/skills/companygraph-validate/SKILL.md verify/checks-owed.test.mjs types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
The checker notes a skill gap and an address a profile repeats

Two norms are facts worth seeing and not worth blocking, so they reach the noted: channel. A person holding a seat whose required skill their Skills table does not name is noted as gap <profile>: <role> requires <skill>, once per role and skill; an agent claims nothing and is never noted. A person's location equal to identity's, and an Also at URL equal to identity's url or to one of its rows, compared without a trailing slash or case, are noted too; mail is two facts and is not read. Both are declared on the profile row, as claims and restates.

The validate skill's paragraph on the gap now carries the checker's note into the report instead of walking the roles by hand.

Verified: node --test verify/checks-owed.test.mjs passes; npm run typecheck, build:check, verify, test:instance-checks, test:cli and test:plan pass; sh conventions/conventions-format passes.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 6: What a change may do to a decision and to a label

**Files:**

- Modify: `lib/history.mjs` (`changedPagesOf` reads through a shared helper; new `deletedPagesOf`, `pageHistoryOf`, typedef `DeletedPage`)
- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `decision` row of `TYPES`, new exported `keptChangesOf`, `labelsOf`, `labelChangesOf` and their private helpers at the end of the file)
- Modify: `bin/companygraph.mjs` (imports, the usage line for `ids`, the `ids` comment, the manifest read hoisted, the range branch)
- Modify: `package.json` (`test:ids` takes the new file)
- Create: `verify/change-checks.test.mjs`
- Modify: `verify/history.test.mjs` (two tests at the end)
- Modify: `verify/cli.test.mjs` (two tests at the end)
- Modify: `types/lib/checks.d.mts`, `types/lib/history.d.mts` (written by `npm run build`)

**Interfaces:**

- Consumes: `PageChange` from `lib/history.mjs`; `typeOfPath`, `sectionsOf`, `tableOf`, `frontmatterOf`, `TYPES`, `PACKS`, `MODEL`, `vocabularyOf` from `lib/checks.mjs`; the `decision` row as Task 4 left it.
- Produces: `deletedPagesOf(cwd: string, range: string, model = "model"): DeletedPage[]` with `DeletedPage = { before: string; beforeText: string }`; `pageHistoryOf(cwd: string, rev: string, rel: string): string[]`, newest first; `keptChangesOf(changes: PageChange[], deleted: DeletedPage[], base: string, { model?, types? }): string[]`; `labelsOf(text: string, labels): Map<string, string>`; `labelChangesOf(changes: PageChange[], base: string, { model?, types?, historyOf? }): string[]`; the `TypeEntry` property `kept?: { moves: string, closing: string }`.

- [ ] **Step 1: Write the failing tests**

Create `verify/change-checks.test.mjs`:

```js
// What a pull request may do to a page, held between the base of its range and its head: a
// decision is kept as written and never deleted, and a label stays with its item and is never
// used again. The checks are pure functions of the pages a range changed, as `idChangesOf` is, so
// the cases are PageChange fixtures; the history a reuse is read from is handed in.
import test from "node:test";
import assert from "node:assert/strict";
import { keptChangesOf, labelChangesOf, labelsOf, PACKS, TYPES } from "../lib/checks.mjs";

const DECISION = "model/decisions/2026-vendored-core.md";
const call = ({ id = "id: 01a0dd35-9358-7f34-b9f9-9c998df35ff1\n", status = "Standing", by = "Owner", why = "It holds still under every model.", consequences = "We keep a copy per instance." } = {}) =>
  `---\n${id}source: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: ${status}\nby: ${by}\n---\n\n# Core is vendored\n\n> We vendor core.\n\n## Why\n\n${why}\n\n## Consequences\n\n${consequences}\n`;
const change = (before, after, path = DECISION) => ({ before: path, after: path, beforeText: before, afterText: after });
const kept = (changes, deleted = []) => keptChangesOf(changes, deleted, "main");

test("a decision whose status moves and nothing else passes, and so does one gaining its first id", () => {
  assert.deepEqual(kept([change(call(), call({ status: "Revised" }))]), []);
  assert.deepEqual(kept([change(call({ id: "" }), call())]), []);
});

test("a decision whose other field changes fails, naming the field", () => {
  assert.deepEqual(kept([change(call(), call({ by: "Architect" }))]), [
    `${DECISION}: \`by\` changed since main; a decision is kept as written, and \`status\` is the one field that moves (R16)`,
  ]);
});

test("a decision whose body is reworded fails, with its status moved or not", () => {
  const msg = `${DECISION}: its text changed since main; a decision is kept as written, and only the change that moves \`status\` may add one dated sentence at the end of "## Consequences" (R16)`;
  assert.deepEqual(kept([change(call(), call({ why: "It holds still." }))]), [msg]);
  assert.deepEqual(kept([change(call(), call({ status: "Revised", why: "It holds still." }))]), [msg]);
});

test("the change that moves status may close Consequences with one dated sentence, in the paragraph or after it", () => {
  const base = call();
  assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences: "We keep a copy per instance. Dropped on October 3, 2026, with nothing to replace it." }))]), []);
  assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences: "We keep a copy per instance.\n\nDropped on 2026-10-03." }))]), []);
});

test("a closing sentence fails without the status moving, without a date, or as two sentences", () => {
  const base = call();
  for (const [status, consequences] of [
    ["Standing", "We keep a copy per instance. Dropped on 2026-10-03."],
    ["Dropped", "We keep a copy per instance. Dropped, with nothing to replace it."],
    ["Dropped", "We keep a copy per instance. Dropped on 2026-10-03. Nothing replaced it."],
  ])
    assert.equal(kept([change(base, call({ status, consequences }))]).length, 1, consequences);
});

test("a deleted decision fails, and a deleted page of another type does not", () => {
  assert.deepEqual(kept([], [{ before: DECISION, beforeText: call() }, { before: "model/skills/java.md", beforeText: "# Java\n" }]), [
    `${DECISION}: deleted in this change; a decision is kept for as long as the company exists, and one that no longer holds says so in \`status\` (R16)`,
  ]);
});

test("a page of a type not kept as written may change freely", () => {
  assert.deepEqual(kept([change("# Java\n\n> A language.\n", "# Java\n\n> A language on the JVM.\n", "model/skills/java.md")]), []);
});

test("a decision whose line ends differ between base and head and whose words do not passes", () => {
  assert.deepEqual(kept([change(call().replace(/\n/g, "\r\n"), call({ status: "Revised" }))]), []);
});

// --- Labels ----------------------------------------------------------------------------------

const TYPES_WITH_SOFTWARE = [...TYPES, ...PACKS.software];
const AGG = "model/bounded-contexts/billing/aggregates/invoice.md";
const FD = "model/feature-designs/issue-an-invoice.md";
const invariants = (rows) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n${rows.map(([l, t]) => `| ${l} | ${t} |\n`).join("")}`;
const scenarios = (items) => `---\nsource: Local\n---\n\n# Issue an invoice\n\n> Invoices go out.\n\n## Scenarios\n\n${items.map(([l, t, body]) => `### ${l}: ${t}\n\n${body}\n\n`).join("")}`;
const labels = (changes, historyOf) => labelChangesOf(changes, "main", { types: TYPES_WITH_SOFTWARE, historyOf });

test("a label kept with its text reworded passes, and a new label for a new rule passes", () => {
  const before = invariants([["INV-1", "A total never changes."]]);
  assert.deepEqual(labels([change(before, invariants([["INV-1", "An issued total never changes."], ["INV-2", "One customer."]]), AGG)]), []);
});

test("a rule carried under a new label while its old label is gone fails as a relabel", () => {
  const f = labels([change(invariants([["INV-1", "A total never changes."]]), invariants([["INV-9", "A total never changes."]]), AGG)]);
  assert.deepEqual(f, [`${AGG}: "INV-9" under ## Invariants carries what "INV-1" carried at main, and "INV-1" is gone; a label stays with its item, and a new item takes a new label (R16)`]);
});

test("two kept labels that swap their texts fail once", () => {
  const f = labels([change(invariants([["INV-1", "A total never changes."], ["INV-2", "One customer."]]), invariants([["INV-1", "One customer."], ["INV-2", "A total never changes."]]), AGG)]);
  assert.deepEqual(f, [`${AGG}: "INV-1" and "INV-2" under ## Invariants swapped what they carry since main; a label stays with its item (R16)`]);
});

test("a label the page carried at an earlier commit and removed is not used again", () => {
  const history = () => [invariants([["INV-1", "A total never changes."]]), invariants([["INV-1", "A total never changes."], ["INV-2", "A rule since removed."]])];
  const f = labels([change(invariants([["INV-1", "A total never changes."]]), invariants([["INV-1", "A total never changes."], ["INV-2", "A new rule."]]), AGG)], history);
  assert.deepEqual(f, [`${AGG}: "INV-2" under ## Invariants was carried by this page before and removed; a removed item's label is not used again (R16)`]);
});

test("a scenario's label is held the same way, its text read from its title and the lines under it", () => {
  const body = "Given a period,\nWhen it closes,\nThen invoices go out.";
  const f = labels([change(scenarios([["SC-1", "A period closes", body]]), scenarios([["SC-2", "A period closes", body]]), FD)]);
  assert.equal(f.length, 1);
  assert.match(f[0], /"SC-2" under ## Scenarios carries what "SC-1" carried at main/);
  assert.deepEqual([...labelsOf(scenarios([["SC-1", "A period closes", body]]), { section: "Scenarios", heading: true })],
    [["SC-1", "A period closes Given a period, When it closes, Then invoices go out."]]);
});

test("the history is not read where no label is new", () => {
  let read = 0;
  labels([change(invariants([["INV-1", "A."]]), invariants([["INV-1", "B."]]), AGG)], () => { read++; return []; });
  assert.equal(read, 0);
});
```

In `verify/history.test.mjs`, replace the import line `import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf } from "../lib/history.mjs";` with `import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, changedPagesOf, deletedPagesOf, pageHistoryOf } from "../lib/history.mjs";` and append at the end of the file:

```js

// A range's deleted pages are read beside its changed ones, each as it was at the base, so a
// check of what a change may do can see a page removed; a rename stays a change.
test("a range's deleted pages are read at its base, and a renamed page is a change and not a deletion", () => {
  const dir = repo(temp());
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), text); };
  write("model/decisions/2026-a.md", "# A\n\n> One call.\n");
  write("model/decisions/2026-b.md", "# B\n\n> Another call, long enough that a rename is detected as one.\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "first");
  const base = git(dir, "rev-parse", "HEAD").trim();
  git(dir, "rm", "-q", "model/decisions/2026-a.md");
  git(dir, "mv", "model/decisions/2026-b.md", "model/decisions/2026-c.md");
  git(dir, "commit", "-qm", "second");
  const range = `${base}..${git(dir, "rev-parse", "HEAD").trim()}`;
  assert.deepEqual(deletedPagesOf(dir, range), [{ before: "model/decisions/2026-a.md", beforeText: "# A\n\n> One call.\n" }]);
  assert.deepEqual(changedPagesOf(dir, range).map((c) => [c.before, c.after]), [["model/decisions/2026-b.md", "model/decisions/2026-c.md"]]);
});

// A label is never used again on its page, so what the page said at every earlier commit is read,
// followed across a rename, newest first.
test("a page's history is every earlier text of it, across a rename, newest first", () => {
  const dir = repo(temp());
  const at = (rel) => path.join(dir, rel);
  fs.mkdirSync(at("model/aggregates"), { recursive: true });
  fs.writeFileSync(at("model/aggregates/invoice.md"), "# Invoice\n\n| Label | Invariant |\n| --- | --- |\n| INV-1 | One. |\n");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "first");
  fs.writeFileSync(at("model/aggregates/invoice.md"), "# Invoice\n\n| Label | Invariant |\n| --- | --- |\n| INV-1 | One. |\n| INV-2 | Two. |\n");
  git(dir, "commit", "-qam", "second");
  git(dir, "mv", "model/aggregates/invoice.md", "model/aggregates/bill.md");
  git(dir, "commit", "-qm", "third");
  const texts = pageHistoryOf(dir, "HEAD", "model/aggregates/bill.md");
  assert.equal(texts.length, 3);
  assert.match(texts[1], /INV-2/);
  assert.doesNotMatch(texts[2], /INV-2/);
  assert.deepEqual(pageHistoryOf(dir, "HEAD", "model/aggregates/none.md"), []);
});
```

Append to the end of `verify/cli.test.mjs`:

```js

// The range reads the manifest's packs, so a pack page's type is known: a decision rewritten and
// an invariant relabelled are refused beside the id check, and a status moved alone passes.
test("ids --range refuses a decision rewritten and an invariant relabelled, and passes a status moved alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const decision = (status, by) => `---\nsource: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: ${status}\nby: ${by}\n---\n\n# Core is vendored\n\n> We vendor core.\n`;
  const aggregate = (label) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| ${label} | A total never changes. |\n`;
  write("model/decisions/2026-core-is-vendored.md", decision("Standing", "Owner"));
  write("model/bounded-contexts/billing/aggregates/invoice.md", aggregate("INV-1"));
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");

  write("model/decisions/2026-core-is-vendored.md", decision("Revised", "Owner"));
  g("commit", "-qam", "second", "--no-verify");
  const moved = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(moved.status, 0, moved.stderr);
  assert.match(moved.stdout, /no page kept as written was rewritten or removed/);

  write("model/decisions/2026-core-is-vendored.md", decision("Revised", "Architect"));
  write("model/bounded-contexts/billing/aggregates/invoice.md", aggregate("INV-9"));
  g("commit", "-qam", "third", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: `by` changed since [0-9a-f]{7}/);
  assert.match(said.stderr, /✗ model\/bounded-contexts\/billing\/aggregates\/invoice\.md: "INV-9" under ## Invariants carries what "INV-1" carried/);
});

test("ids --range refuses a decision deleted in the range", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.mkdirSync(path.join(root, "model/decisions"), { recursive: true });
  fs.writeFileSync(path.join(root, "model/decisions/2026-core-is-vendored.md"), "---\nsource: Local\nstatus: Standing\n---\n\n# Core is vendored\n\n> We vendor core.\n");
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  g("rm", "-q", "model/decisions/2026-core-is-vendored.md"); g("commit", "-qm", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: deleted in this change/);
});
```

In `package.json`, change the `test:ids` script to `"node --test verify/ids.test.mjs verify/change-checks.test.mjs"`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/change-checks.test.mjs` Expected: FAIL with `SyntaxError: The requested module '../lib/checks.mjs' does not provide an export named 'keptChangesOf'`.

Run: `node --test verify/history.test.mjs` Expected: FAIL with `SyntaxError: … does not provide an export named 'deletedPagesOf'`.

Run: `node --test --test-name-pattern="ids --range refuses a decision" verify/cli.test.mjs` Expected: FAIL; the first exits 0 on the rewrite where 3 was expected, and the second exits 0 on the deletion.

- [ ] **Step 3: Read deleted pages and a page's history**

In `lib/history.mjs`, replace the whole of `changedPagesOf`, from its comment `// The pages under the container a range modified or renamed, each as it was at the range's base` to its closing `}`, with:

```js
/**
 * A page a range deleted: its path and text at the range's base.
 * @typedef {{ before: string; beforeText: string }} DeletedPage
 */

// What git says a range did to each file under the container, as status and paths: one path for
// a modification, an addition or a deletion, two for a rename or a copy.
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @param {string} model
 * @returns {{ status: string; paths: string[] }[]}
 */
function nameStatusOf(cwd, a, b, model) {
  const out = git(cwd, ["diff", "--name-status", "-z", "-M", a, b, "--", `${model}/`]).split("\0").filter(Boolean);
  /** @type {{ status: string; paths: string[] }[]} */
  const entries = [];
  for (let i = 0; i < out.length; ) {
    const status = out[i++];
    const two = status.startsWith("R") || status.startsWith("C");
    entries.push({ status, paths: two ? [out[i++], out[i++]] : [out[i++]] });
  }
  return entries;
}

// The pages under the container a range modified or renamed, each as it was at the range's base
// and as it is at its head. Git's rename detection pairs a renamed page with its old path, which
// is what lets a rename that also changed the id be seen as one entity changing its id.
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {PageChange[]}
 */
export function changedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  /** @type {PageChange[]} */
  const changes = [];
  for (const { status, paths } of nameStatusOf(cwd, a, b, model)) {
    if (status === "M" && paths[0].endsWith(".md"))
      changes.push({ before: paths[0], after: paths[0], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]), afterText: git(cwd, ["show", `${b}:${paths[0]}`]) });
    else if (status.startsWith("R") && paths[1].endsWith(".md"))
      changes.push({ before: paths[0], after: paths[1], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]), afterText: git(cwd, ["show", `${b}:${paths[1]}`]) });
  }
  return changes;
}

// The pages under the container a range deleted, each as it was at the range's base. A page a
// range renamed is a change, not a deletion, by the same rename detection.
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {DeletedPage[]}
 */
export function deletedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  return nameStatusOf(cwd, a, b, model)
    .filter(({ status, paths }) => status === "D" && paths[0].endsWith(".md"))
    .map(({ paths }) => ({ before: paths[0], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]) }));
}

// Every earlier text of a page, from the history of `rev` and followed across renames: what it
// said at each commit that touched it, newest first. A commit that deleted it holds no text and is
// passed over. The instance workflow fetches the whole history; a shallow clone reads less.
/**
 * @param {string} cwd
 * @param {string} rev
 * @param {string} rel
 * @returns {string[]}
 */
export function pageHistoryOf(cwd, rev, rel) {
  let out;
  try {
    out = git(cwd, ["log", "--follow", "--format=%x00%H", "--name-only", rev, "--", rel]);
  } catch {
    return [];
  }
  /** @type {string[]} */
  const texts = [];
  for (const record of out.split("\0").filter((r) => r.trim())) {
    const [sha, ...paths] = record.split("\n").map((l) => l.trim()).filter(Boolean);
    const path = paths[paths.length - 1];
    if (!sha || !path) continue;
    try {
      texts.push(git(cwd, ["show", `${sha}:${path}`]));
    } catch {
      // deleted at this commit: no text to read
    }
  }
  return texts;
}
```

- [ ] **Step 4: Declare the decision kept as written**

In `lib/checks.mjs`, below the line `/** @typedef {import("./history.mjs").PageChange} PageChange */`, add:

```js
/** @typedef {import("./history.mjs").DeletedPage} DeletedPage */
```

In the `TypeEntry` typedef, directly above ` * @property {string} [expires]`, add:

```js
 * @property {{ moves: string, closing: string }} [kept] A page kept as written once it is on the default branch: the field `moves` is the one that changes, the change that moves it may add one dated sentence at the end of the section `closing`, and the page is never deleted.
```

Replace the `decision` row as Task 4 left it:

```js
  { type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" }, replaced: { field: "supersedes", status: "status" } },
```

with:

```js
  // A call is kept as written: its status is the one field that moves, and the change that drops
  // it may close its consequences with one dated sentence. `ids --range` holds that.
  {
    type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" },
    replaced: { field: "supersedes", status: "status" },
    kept: { moves: "status", closing: "Consequences" },
  },
```

- [ ] **Step 5: Add the change checks**

Append to the end of `lib/checks.mjs`, after `idChangesOf`:

```js

// Text as git gives it, with `\n` line ends whatever the checkout wrote, so a comparison between
// two commits compares what they say and not how a platform ended their lines.
/** @param {string} text @returns {string} */
const unix = (text) => text.replace(/\r\n/g, "\n");

// The frontmatter as each key and the lines that state it: a key at the left margin and every
// line under it that is not another key, which covers each shape `fieldValues` reads. Compared
// as text, so a value rewritten in another YAML shape is a change, which on a page kept as written
// it is.
/** @param {string} text @returns {Map<string, string>} */
function fieldBlocksOf(text) {
  /** @type {Map<string, string>} */
  const out = new Map();
  /** @type {string | null} */
  let key = null;
  for (const line of frontmatterOf(text).split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):/);
    if (m) {
      key = m[1];
      out.set(key, line.trimEnd());
    } else if (key !== null) out.set(key, `${out.get(key)}\n${line.trimEnd()}`);
  }
  return out;
}

// The page below its frontmatter.
/** @param {string} text @returns {string} */
const bodyOf = (text) => text.replace(/^---\n[\s\S]*?\n---(?:\n|$)/, "");

// Whether `after` is `before` with one dated sentence added at the end of the section `closing`
// and nothing else changed: every other section the same, in the same order, and the closing one
// the same up to where `before`'s ends. A sentence is dated when it carries a year, and it is one
// when no full stop falls inside it.
/** @param {string} before @param {string} after @param {string} closing @returns {boolean} */
function closesWithOneDatedSentence(before, after, closing) {
  const was = sectionsOf(before), is = sectionsOf(after);
  if ([...was.keys()].join("\n") !== [...is.keys()].join("\n") || !was.has(closing)) return false;
  for (const [key, text] of was) if (key !== closing && is.get(key) !== text) return false;
  const a = /** @type {string} */ (was.get(closing)).trimEnd(), b = /** @type {string} */ (is.get(closing)).trimEnd();
  if (!b.startsWith(a)) return false;
  const added = b.slice(a.length).replace(/\s+/g, " ").trim();
  return /\b\d{4}\b/.test(added) && /[.!?]$/.test(added) && !/[.!?]\s/.test(added);
}

// A page of a type kept as written (a decision) changes one field and nothing else, between the
// base of a range and its head: every other frontmatter key and the body compare equal, after an
// `id` added where the base had none, which is R18's backfill. The change that moves the field
// may add one dated sentence at the end of the section the type's row names, the schema's own
// rule for a call dropped with nothing to replace it. A page of the type deleted in the range
// fails too. Handed the pages `changedPagesOf` and `deletedPagesOf` read; pure, as
// `idChangesOf` is. `types` is the vocabulary the instance takes, so a pack's page is known.
/**
 * @param {PageChange[]} changes
 * @param {DeletedPage[]} deleted
 * @param {string} base
 * @param {{ model?: string, types?: TypeEntry[] }} [options]
 * @returns {string[]}
 */
export function keptChangesOf(changes, deleted, base, { model = MODEL, types = TYPES } = {}) {
  /** @param {string} path */
  const keptOf = (path) => {
    const type = typeOfPath(path, model, types);
    return types.find((t) => t.type === type && t.kept) ?? null;
  };
  /** @type {string[]} */
  const out = [];
  for (const { before, after, beforeText, afterText } of changes) {
    const entry = keptOf(after) ?? keptOf(before);
    if (!entry?.kept) continue;
    const { moves, closing } = entry.kept;
    const was = fieldBlocksOf(unix(beforeText)), is = fieldBlocksOf(unix(afterText));
    if (!was.has("id")) is.delete("id");
    const moved = was.get(moves) !== is.get(moves);
    for (const key of new Set([...was.keys(), ...is.keys()]))
      if (key !== moves && was.get(key) !== is.get(key))
        out.push(`${after}: \`${key}\` changed since ${base}; a ${entry.type} is kept as written, and \`${moves}\` is the one field that moves (R16)`);
    const b0 = bodyOf(unix(beforeText)), b1 = bodyOf(unix(afterText));
    if (b0 !== b1 && !(moved && closesWithOneDatedSentence(b0, b1, closing)))
      out.push(`${after}: its text changed since ${base}; a ${entry.type} is kept as written, and only the change that moves \`${moves}\` may add one dated sentence at the end of "## ${closing}" (R16)`);
  }
  for (const { before } of deleted) {
    const entry = keptOf(before);
    if (entry?.kept)
      out.push(`${before}: deleted in this change; a ${entry.type} is kept for as long as the company exists, and one that no longer holds says so in \`${entry.kept.moves}\` (R16)`);
  }
  return out;
}

// The labels a page carries where its type's row says, each with what it labels: a table row's
// other cells, or a heading's title and the text under it, whitespace collapsed so a reflowed
// line reads the same. A heading with no label, and a label written twice, are the label check's
// findings; here the first is left out and the second keeps its first text.
/**
 * @param {string} text
 * @param {{ section: string, column?: string, heading?: boolean }} labels
 * @returns {Map<string, string>}
 */
export function labelsOf(text, labels) {
  /** @type {Map<string, string>} */
  const out = new Map();
  const body = sectionsOf(text).get(labels.section);
  if (body === undefined) return out;
  /** @param {string} s */
  const flat = (s) => s.replace(/\s+/g, " ").trim();
  if (labels.column) {
    const table = tableOf(body);
    const at = table ? table.columns.indexOf(labels.column) : -1;
    if (!table || at < 0) return out;
    for (const row of table.rows) {
      const label = (row[at] ?? "").trim();
      if (label && !out.has(label)) out.set(label, flat(row.filter((_, i) => i !== at).join(" | ")));
    }
    return out;
  }
  /** @type {string | null} */
  let label = null;
  /** @type {string[]} */
  let lines = [];
  const close = () => {
    if (label !== null && !out.has(label)) out.set(label, flat(lines.join("\n")));
  };
  for (const line of body.split("\n")) {
    if (line.startsWith("### ")) {
      close();
      const m = line.slice(4).trim().match(/^([^:]+):\s+(\S.*)$/);
      label = m ? m[1] : null;
      lines = m ? [m[2]] : [];
    } else if (label !== null) lines.push(line);
  }
  close();
  return out;
}

// A label is what a test or a code comment cites an invariant or a scenario by from outside the
// model, so it stays with its item and is never used again. Between the base of a range and its
// head, a page fails where a label new at the head carries the text of a base item whose label is
// gone (a relabel), where two labels kept swap their texts, and where a label new at the head was
// carried by the page at any earlier commit (reuse), read through `historyOf`. A label kept with
// its text changed passes: that is the rewording the schema allows, and whether a reworded rule is
// still the same rule is a judgment no comparison makes. Pure, as `idChangesOf` is; the history
// is handed in.
/**
 * @param {PageChange[]} changes
 * @param {string} base
 * @param {{ model?: string, types?: TypeEntry[], historyOf?: (change: PageChange) => string[] }} [options]
 * @returns {string[]}
 */
export function labelChangesOf(changes, base, { model = MODEL, types = TYPES, historyOf = () => [] } = {}) {
  /** @type {string[]} */
  const out = [];
  for (const change of changes) {
    const type = typeOfPath(change.after, model, types);
    const labels = types.find((t) => t.type === type)?.labels;
    if (!labels) continue;
    const { after } = change;
    const was = labelsOf(unix(change.beforeText), labels), is = labelsOf(unix(change.afterText), labels);
    const added = [...is.keys()].filter((l) => !was.has(l));
    const gone = [...was.keys()].filter((l) => !is.has(l));
    const kept = [...is.keys()].filter((l) => was.has(l));
    for (const l of added) {
      const from = gone.find((g) => is.get(l) && was.get(g) === is.get(l));
      if (from)
        out.push(`${after}: "${l}" under ## ${labels.section} carries what "${from}" carried at ${base}, and "${from}" is gone; a label stays with its item, and a new item takes a new label (R16)`);
    }
    for (const a of kept)
      for (const b of kept)
        if (a < b && was.get(a) !== was.get(b) && is.get(a) === was.get(b) && is.get(b) === was.get(a))
          out.push(`${after}: "${a}" and "${b}" under ## ${labels.section} swapped what they carry since ${base}; a label stays with its item (R16)`);
    if (!added.length) continue;
    const earlier = new Set(historyOf(change).flatMap((text) => [...labelsOf(unix(text), labels).keys()]));
    for (const l of added)
      if (earlier.has(l))
        out.push(`${after}: "${l}" under ## ${labels.section} was carried by this page before and removed; a removed item's label is not used again (R16)`);
  }
  return out;
}
```

- [ ] **Step 6: Run the change checks from the range**

In `bin/companygraph.mjs`, replace the import line `import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, firstCommitMsOf, changedPagesOf } from "../lib/history.mjs";` with:

```js
import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, firstCommitMsOf, changedPagesOf, deletedPagesOf, pageHistoryOf } from "../lib/history.mjs";
```

and `import { idChangesOf, PACKS, vocabularyOf } from "../lib/checks.mjs";` with:

```js
import { idChangesOf, keptChangesOf, labelChangesOf, PACKS, vocabularyOf } from "../lib/checks.mjs";
```

In `USAGE`, replace the line that begins `  ids [<folder>]      give every page an id from its first commit` with:

```js
  ids [<folder>]      give every page an id from its first commit, or refuse (exit 3) under a pattern, or a range that changed an id, rewrote or removed a decision, or moved or reused a label
```

Replace the comment above `function ids(argv)`, from `// R18. \`--backfill\` gives every page` to `// neither flag, a malformed range, or a git failure, each of which is 1.`, with:

```js
// R18. `--backfill` gives every page without an id one stamped with its first commit and writes
// model/identifier.md where there is none; `--range` fails a change to an id on the default
// branch and, on an instance, a decision rewritten or deleted and a label moved or used again.
// A folder that holds core/ and is not an instance is the repository that makes core, and both
// work on its schemas instead; `--core` already names a tag, so what the folder holds is what
// tells the two apart.
//
// Refused is 3, not 1, so a caller such as a hook can tell a refusal — a `--range` that changed
// an id already on the default branch or a page it holds as written, or a `--backfill` that a
// declared `pattern` format or an unreadable identifier file refuses — from a run that could not
// happen at all: not an instance, neither flag, a malformed range, or a git failure, each of
// which is 1.
```

Inside `ids`, replace:

```js
  const folder = onCore ? "core" : "model";
  if (given.backfill) {
```

with:

```js
  const folder = onCore ? "core" : "model";
  // The packs the instance took, so a page of a pack's type is known as a core page is: given its
  // id by the backfill, and held by the range's checks of what a change may do to it.
  const manifestPath = join(root, ".companygraph/manifest.json");
  const manifest = !onCore && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
  const { types } = vocabularyOf({ packs: (manifest.packs ?? []).map((/** @type {string} */ name) => ({ name, dir: `${manifest.units ?? "meta"}/${name}` })) });
  if (given.backfill) {
```

and delete these four lines from the backfill branch, which the lines above now hold:

```js
    // The packs the instance took, so a page of a pack's type is given its id as a core page is.
    const manifestPath = join(root, ".companygraph/manifest.json");
    const manifest = !onCore && existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
    const { types } = vocabularyOf({ packs: (manifest.packs ?? []).map((/** @type {string} */ name) => ({ name, dir: `${manifest.units ?? "meta"}/${name}` })) });
```

In the range branch, replace:

```js
    const failures = idChangesOf(changedPagesOf(root, given.range, folder), base);
    if (failures.length) {
      for (const f of failures) console.error(`✗ ${f}`);
      return REFUSED;
    }
    console.log("✓ no id on the default branch changed");
    return 0;
```

with:

```js
    const changes = changedPagesOf(root, given.range, folder);
    const failures = idChangesOf(changes, base);
    // An instance's pages are held to what a change may do to them as well: a decision is kept
    // as written and never deleted, and a label stays with its item and is never used again. The
    // repository that makes core ranges over schemas, which carry neither.
    if (!onCore)
      failures.push(
        ...keptChangesOf(changes, deletedPagesOf(root, given.range, folder), base, { types }),
        ...labelChangesOf(changes, base, { types, historyOf: (c) => pageHistoryOf(root, ends[0], c.before) }),
      );
    if (failures.length) {
      for (const f of failures) console.error(`✗ ${f}`);
      return REFUSED;
    }
    console.log(onCore ? "✓ no id on the default branch changed" : "✓ no id on the default branch changed, no page kept as written was rewritten or removed, and no label moved or came back");
    return 0;
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `node --test verify/change-checks.test.mjs verify/history.test.mjs && node --test --test-name-pattern="ids" verify/cli.test.mjs` Expected: PASS, the existing `ids --range` tests included.

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:ids && npm run test:seats && npm run test:cli` Expected: each passes.

- [ ] **Step 8: Commit**

```bash
git add lib/history.mjs lib/checks.mjs bin/companygraph.mjs verify/change-checks.test.mjs verify/history.test.mjs verify/cli.test.mjs package.json types
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A pull request may not rewrite a decision or move a label

Two norms read what a change did, and join R18's id check in companygraph ids --range, which every instance's pull request already runs. A decision may change its status and nothing else: every other frontmatter key and the body compare equal after an id backfill, the change that moves status may close Consequences with one dated sentence, and a decision deleted in the range fails. A label on an aggregate's invariant or a feature design's scenario fails where it is relabelled, where two kept labels swap their texts, and where a label new at the head was carried by the page at any earlier commit, read from its history across renames.

The checks are pure functions beside idChangesOf, declared on the decision row as kept and on the labels rows already there. history.mjs gains deletedPagesOf and pageHistoryOf, and the range now reads the manifest's packs so a pack page's type is known. The command keeps its name, so the instance workflow's step is unchanged.

Verified: node --test verify/change-checks.test.mjs and verify/history.test.mjs pass; npm run typecheck, build:check, verify, test:ids, test:seats and test:cli pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 7: The Purpose sentences, the real instances, and the follow-up issues

**Files:**

- Modify: `core/decision-schema.md` (the last sentence of `## Purpose`)
- Modify: `core/rule-schema.md` (one sentence appended to `## Purpose`)

**Interfaces:**

- Consumes: every check of Tasks 1 to 6.
- Produces: the two Purpose sentences the spec's "What changes in core" gives, and the two follow-up issues.

- [ ] **Step 1: Write the decision's Purpose sentence**

In `core/decision-schema.md`, in `## Purpose`, replace the sentence:

```markdown
A decision is not rewritten to say something else: `status` is the one field that moves, and `decided` with it once when a proposed call is made, what replaced the call is read from the later decision's `supersedes`, and a call that another supersedes carries the status the instance keeps for a replaced call.
```

with:

```markdown
A decision is not rewritten and not removed: `status` is the one field that moves, what replaced the call is read from the later decision's `supersedes`, and every call another supersedes carries one status, which no call still standing carries.
```

- [ ] **Step 2: Write the rule's Purpose sentence**

In `core/rule-schema.md`, in `## Purpose`, replace the paragraph's last sentence:

```markdown
A rule binds more than one seat, process or phase, or is what a control checks, and a refusal only one of them makes stays in that page's `## What it never does`.
```

with the same sentence followed by one more, on the same line:

```markdown
A rule binds more than one seat, process or phase, or is what a control checks, and a refusal only one of them makes stays in that page's `## What it never does`. A rule with no `## Applies to` rows applies everywhere and so binds them all.
```

- [ ] **Step 3: Run everything**

Run: `sh conventions/conventions-format && sh conventions/conventions-check` Expected: both pass.

Run: `npm run typecheck && npm run build:check && npm run verify && for t in instance instance-checks instance-files form rules cli plan seats pins ids localization untar fetch-core obsidian judge; do npm run test:$t || exit 1; done` Expected: every run passes.

- [ ] **Step 4: Run every check against the three instances**

Run, from the worktree root, each on its own line:

```bash
node bin/check-instance.mjs /Users/rob/git/robertblust/mental-model
node bin/check-instance.mjs /Users/rob/git/companygraph/mental-model
node bin/check-instance.mjs /Users/rob/git/guestgraph/mental-model
```

Expected: each exits 0 with `✓ model/ against … at core 0.55.0: the mechanical checks pass`. The reference instance, and only it, prints:

```text
  noted:
    model/profiles/robert-blust/robert-blust.md: "## Also at" lists https://blust.ch, which identity holds as its `url`; identity holds it, and this page carries its own only where it differs
    model/profiles/robert-blust/robert-blust.md: "## Also at" lists https://github.com/robertblust, which identity holds as a row of its "## Also at"; identity holds it, and this page carries its own only where it differs
```

No other note is printed: no person lacks a required skill and no `horizon` has passed. If an instance's checkout is not on its `main`, run `git -C <instance> status` first and read the result against `main`; a failure that names a page the checkout changed is that branch's, not this plan's.

- [ ] **Step 5: Commit**

```bash
git add core/decision-schema.md core/rule-schema.md
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
Decision and rule Purposes say what their checks now hold

The decision schema's Purpose takes the owner's reading of #257: a decision is not rewritten and not removed, status is the one field that moves, and every call another supersedes carries one status that no standing call carries. decided no longer moves with it, since nothing marks a proposed status. The rule schema's Purpose adds that a rule with no Applies to rows applies everywhere and so binds them all. Both sentences are what the checks of this branch hold.

Verified: sh conventions/conventions-format and conventions-check pass; npm run verify and every test:* script pass; node bin/check-instance.mjs fails nothing on the three instances and notes the reference instance's profile twice.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

- [ ] **Step 6: Open the two follow-up issues**

Run:

```bash
gh issue create --repo companygraph/mcp-server --title "list_checks shows which checks note rather than fail" --body-file - <<'EOF'
meta-model#257 gives the instance checks a second channel. `instanceChecks` takes an optional `note` callback beside `fail`, and `checkInstance` returns `notes` beside `failures` and `skipped`. Three checks report only through it: a seat's required skill a person does not claim (`gap <profile>: <role> requires <skill>`), a profile repeating identity's address, and a strategic objective whose `horizon` has passed.

The snapshot calls `instanceChecks({ files: new Map(), fail() {} })` and keeps working unchanged, so `list_checks` lists the new checks by name today. What it does not say is that three of them never fail. This issue is for `list_checks` to say which checks note, so an agent reading the list does not take a note for a failure or a passing run for a run without findings.

It is taken in mcp-server's own release, after meta-model releases the checks.
EOF
gh issue create --repo companygraph/obsidian-plugin --title "The checks pane shows notes beside failures" --body-file - <<'EOF'
meta-model#257 gives the instance checks a second channel: `checkInstance` now returns `notes` beside `failures` and `skipped`. A note is a fact worth seeing that fails nothing: a seat's required skill a person does not claim (`gap <profile>: <role> requires <skill>`), a profile repeating identity's address, and a strategic objective whose `horizon` has passed. `companygraph check` prints them under `noted:` and keeps its exit code the failures' alone.

`src/model.ts` destructures `{ failures, skipped }` and keeps working, but the pane shows no notes. This issue is for the pane to show them, apart from failures and never counted as one.

It is taken in the plugin's own release, after meta-model releases the checks.
EOF
```

Expected: each prints the new issue's URL. Record both URLs in the pull request body.
