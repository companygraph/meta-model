# A gate says where failure leads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A phase carries a required `## If not met` table of outcomes and the phase each leads to (back, the same phase, or none where the process stops), two generic checks hold it, all three instances write it in place of their Gate's closing sentence, and mcp-server's `process` picture draws each row as a dashed arrow, live on every host.

**Architecture:** The section is an ordinary `Table.` section in `core/phase-schema.md`, written in existing vocabulary (`string`, `ref → phase`), so the parser draws each row with a target as an edge `If not met.Leads to` carrying `Outcome` in `attrs` with no parser change. The checker gains two generic checks: a required table section carries at least one row (R16), and a table column referencing the page's own owned-and-ordered type never names a later entity. The instances upgrade and rewrite their sentences; mcp-server reads the edges for back arrows and the phase's table for stop rows, and draws one unlinked Stop node that stays out of `nodes` and `links`.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, Mermaid flowchart source, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-a-gate-says-where-failure-leads-design.md` (this branch).

## Global Constraints

- Section `## If not met`, `Required: Yes`, Description opening `Table.`, placed in `## Sections` and on every page directly after `## Gate`. Columns exactly `Outcome` (Yes, `string`) and `Leads to` (No, `ref → phase`).
- `## Gate` description becomes `Bulleted. The criteria that must be satisfied to leave the phase, one item each`; the gate's introductory line stays; the closing "Where they cannot be met…" sentence is removed from every phase.
- A stop is an empty `Leads to` cell, written `|  |` with nothing between the pipes. Never "—", "none" or "stop" in the cell.
- `Leads to` names the page's own phase or an earlier one in the owning process's `## Phases`; never a later one.
- Diagram: dashed arrow `-.->`, label `<escalation authority>: <outcome>, <outcome>` merged per (phase, target) in table order; stop node written `stop((Stop))` with `classDef stop fill:none,stroke-dasharray:3 3` and `class stop stop`; the stop node is never in `nodes` and its arrows never in `links`.
- Versions: meta-model v0.54.0 with core 0.46.0, if no other release lands first; otherwise the next minor of each. mcp-server the next minor after v0.36.0.
- American English everywhere (R14); commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers; no em-dash in any model file, schema or commit written here.
- Numbers that move are never written: no count of phases, rows, gates or checks in any prose.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag, a release and a re-pin each wait for Rob's explicit merge word; a "go" approves building, not merging. Each instance PR goes to Rob one question per turn, each with a proposal.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- A re-pin installs the package by name after removing it (`npm uninstall <name>` then `npm install "github:<repo>#vX"`), and is proved by reading `packages["node_modules/<name>"]` in `package-lock.json`, never by a grep. meta-model keeps no lockfile.
- Before tagging meta-model, `version` in `package.json` and the `ref:` in `.github/workflows/instance-check.yml` name the same release.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; PR bodies end `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

- A `Leads to` naming a phase of another process that has the same name (two processes each with `Review`): R4 already reports it unresolved, and the direction check must not add a second finding for it. Task 2 asserts exactly one finding.
- A required table section with a header and no rows on a type other than phase (a process's `## Phases`): the new rows check must report it once, and a `## Phases` holding prose and no table stays the owner-listing check's single finding. Task 1 asserts both counts.
- An instance still on the older core served by the new mcp-server (no `## If not met` on any phase): the process picture must be byte-for-byte today's, with no Stop node and no dashed line. Task 4 asserts it on a snapshot with the section stripped.
- An outcome holding Mermaid's own characters (`"`, `<`, `#`): the arrow label is escaped by `label()` and the `links` label stays raw. Task 4 asserts both on a fixture outcome `held "for now" <#1>`.
- A phase whose rows all stop and a process with no stop row at all: the Stop node appears once when any row stops and not at all otherwise. Task 4 asserts both.

---

## Phase A — meta-model (worktree `meta-model-a-gate-says-where-failure-leads`, branch `a-gate-says-where-failure-leads`, which already holds the spec and this plan)

### Task 1: A required table section carries at least one row

**Files:**

- Modify: `core/CONVENTIONS.md` (R16, the paragraph ending "as a required list field carries at least one entry.")
- Modify: `lib/checks.mjs` (a new entry in the returned checks array, placed directly after the check named `"a section holds the kind of list its schema declares"`)
- Create: `verify/required-table.test.mjs`

**Interfaces:**

- Consumes: `checkInstance(files, { core, model })` from `lib/checks.mjs`; inside `instanceChecks`: `TYPES`, `read`, `walkMd`, `typeOfFile`, `sectionsOf`, `blocksOf`, `tableOf`, `columnTablesOf`, `ownerListings`.
- Produces: a check named `"a required table section carries at least one row"`, rule `"R16"`, failure text containing `has no row` and `(R16)`.

- [ ] **Step 1: Write the failing tests** — `verify/required-table.test.mjs`:

```js
// A required section declared Table. carries at least one row, as a required list section carries
// at least one item (R16). Fed fixture maps: the schema is a role's only because a schema has to
// be of a type the checks know; what is declared is what is held, and no check names the type.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const roleSchema = (rows, tables = []) => ["# Role Schema", "", "> A seat.", "", "## File Location", "", "`model/roles/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ...rows, "", ...tables, ""].join("\n");

const columns = (section) => [`\`## ${section}\` is a table with these columns:`, "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Outcome` | Yes | string | What is decided. |", ""];

const SCHEMA = roleSchema(
  ["| `## If not met` | Yes | Table. What is decided. |", "| `## Notes` | No | Table. Anything. |"],
  [...columns("If not met"), ...columns("Notes")],
);

const role = (sections) => ["# Reviewer", "", "> Reads what was built.", "", ...Object.entries(sections).flatMap(([h, body]) => [`## ${h}`, "", body, ""])].join("\n");
const failuresOf = (page, schema = SCHEMA) =>
  checkInstance(new Map([["meta/core/role-schema.md", schema], ["model/roles/reviewer.md", page]]), { core: "meta/core", model: "model" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

const HEADER = "| Outcome |\n| --- |";

test("a required table section with one row reports nothing", () => {
  assert.deepEqual(about(failuresOf(role({ "If not met": `${HEADER}\n| dropped |` })), "has no row"), []);
});

test("a required table section with its header and no row fails once, naming the page, the section and R16", () => {
  const hit = about(failuresOf(role({ "If not met": HEADER })), "## If not met", "has no row");
  assert.equal(hit.length, 1, hit.join("\n"));
  assert.match(hit[0], /^model\/roles\/reviewer\.md: /);
  assert.match(hit[0], /\(R16\)/);
});

test("a required table section holding prose and no table fails the same way", () => {
  assert.equal(about(failuresOf(role({ "If not met": "The Owner decides." })), "## If not met", "has no row").length, 1);
});

test("an optional table section may be present with no row", () => {
  assert.deepEqual(about(failuresOf(role({ "If not met": `${HEADER}\n| dropped |`, Notes: HEADER })), "## Notes"), []);
});

test("an absent required section is the required-sections check's single finding, not this one's", () => {
  const failures = failuresOf(role({}));
  assert.deepEqual(about(failures, "has no row"), []);
  assert.equal(about(failures, "no `## If not met`").length, 1);
});
```

Add to the same file, for the owner-listing overlap (the listing check already reports a `## Phases` that holds no table; this check must not report it a second time, and must report a `## Phases` with a header and no row):

```js
const PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");
const PHASE_SCHEMA = ["# Phase Schema", "", "> A phase.", "", "**Owner:** process", "", "## File Location", "", "`model/processes/<process>/phases/*.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "| `gate-to` | No | ref → phase | Next. |", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", "| `# [Phase]` | Yes | The name. |", ""].join("\n");

const processFailures = (phasesBody) => checkInstance(new Map([
  ["meta/core/process-schema.md", PROCESS_SCHEMA],
  ["meta/core/phase-schema.md", PHASE_SCHEMA],
  ["model/processes/delivery/delivery.md", `# Delivery\n\n> A process.\n\n## Phases\n\n${phasesBody}\n`],
  ["model/processes/delivery/phases/build.md", "---\n---\n\n# Build\n\n> A phase.\n"],
]), { core: "meta/core" }).failures.filter((f) => f.includes('"## Phases"') || f.includes("## Phases"));

test("an owner's listing with a header and no row is this check's finding", () => {
  assert.equal(about(processFailures("| Phase |\n| --- |"), "has no row").length, 1);
});

test("an owner's listing holding no table stays the listing check's single finding", () => {
  const failures = processFailures("- Build");
  assert.deepEqual(about(failures, "has no row"), []);
  assert.equal(about(failures, "holds no table").length, 1);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test verify/required-table.test.mjs`

Expected: FAIL. The "header and no row", "prose and no table" and "listing with a header and no row" tests fail with length 0; the others pass.

- [ ] **Step 3: The rule** — in `core/CONVENTIONS.md` R16, after the sentence "A section that is required and declares a kind carries at least one item, as a required list field carries at least one entry." add: "A section that is required and declared `Table.` carries at least one row, for the same reason: a header alone says the section was written and holds nothing it was written for."

- [ ] **Step 4: The check** — in `lib/checks.mjs`, directly after the entry named `"a section holds the kind of list its schema declares"`:

```js
  {
    // R16 holds a required list section to one item, and a required table section to one row
    // for the same reason: a header alone is a section written and nothing written in it. The
    // schema says which sections are required and which are tables, and no type is named here.
    // Two absences are other checks' findings and stay single: a section not there at all is
    // "required sections are present"'s, and an owner's listing that holds no table is the
    // listing check's, which says what a table is. What is left is a table with no row, and a
    // required table section written as prose, which that check never reads.
    name: "a required table section carries at least one row",
    rule: "R16",
    run() {
      const tables = columnTablesOf();
      const listings = new Set(ownerListings().map((l) => `${l.file}\u0000${l.section}`));
      for (const t of TYPES) {
        const rows = blocksOf(sectionsOf(read(`${core}/${t.type}-schema.md`) ?? "").get("Sections") ?? "")
          .find((b) => !b.section && !b.grouped)?.table?.rows ?? [];
        const required = new Set(rows
          .filter((r) => (r[1] ?? "").replace(/`/g, "").trim() === "Yes")
          .map((r) => (r[0] ?? "").replace(/`/g, "").trim().match(/^##\s+(.+)$/)?.[1]?.trim())
          .filter(Boolean));
        const held = (tables.get(t.type) ?? []).map((x) => x.section).filter((s) => required.has(s));
        if (!held.length) continue;
        walkMd(EX, (child, text) => {
          if (typeOfFile(child) !== t.type) return;
          const sections = sectionsOf(text);
          for (const section of held) {
            const body = sections.get(section);
            if (body === undefined) continue;
            const table = tableOf(body);
            if (!table && listings.has(`${child}\u0000${section}`)) continue;
            if (!table || table.rows.length === 0)
              fail(`${child}: "## ${section}" has no row, and its schema requires the section and declares it Table.; a required table section carries at least one row (R16)`);
          }
        });
      }
    },
  },
```

- [ ] **Step 5: Run the new tests, then everything**

Run: `node --test verify/required-table.test.mjs && npm run verify && node --test verify/*.test.mjs`

Expected: PASS. `npm run verify` runs the checks over `example/`; if it reports any shipped page with a required table section and no row, fix that page in `example/` (the spec says fix, never exempt) and say which in the commit.

- [ ] **Step 6: Run the check against the three instances before anything depends on it** — for each of `/Users/rob/git/robertblust/mental-model`, `/Users/rob/git/companygraph/mental-model`, `/Users/rob/git/guestgraph/mental-model` (each on `main`, pulled):

```bash
node -e 'import("/Users/rob/git/companygraph/meta-model-a-gate-says-where-failure-leads/lib/checks.mjs").then(async ({ checkInstance }) => {
  const fs = await import("node:fs"); const path = await import("node:path");
  const root = process.argv[1]; const files = new Map();
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (p.endsWith(".md")) files.set(path.relative(root, p), fs.readFileSync(p, "utf8")); } };
  walk(path.join(root, "model")); walk(path.join(root, "meta/core"));
  console.log(checkInstance(files, { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("has no row")).join("\n") || "none");
})' "<instance root>"
```

Expected: `none` for each. Any page it names is reported to Rob as a finding for that instance's Task 6/7/8 PR, and is not fixed here.

- [ ] **Step 7: Commit**

```bash
git add core/CONVENTIONS.md lib/checks.mjs verify/required-table.test.mjs
git commit -F - <<'EOF'
A required table section carries at least one row

R16 held a required list section to one item and left a required table section free to hold a header and nothing, since the checks only read rows that are there and R9 only asks that the section be present. The rule now says the same of tables, and a generic check holds it, reading which sections are required and which are tables from the schema and naming no type. A section that is absent stays the required-sections check's finding, and an owner's listing that holds no table stays the listing check's, so each cause is reported once.

Verified: node --test verify/required-table.test.mjs failed before the check and passes after it; npm run verify and node --test verify/*.test.mjs pass; the check reports nothing on the three instances' main.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: A row never leads forward

**Files:**

- Modify: `lib/checks.mjs` (a new entry directly after the check named `"an owner's table of what it owns is a table, in the order the owned give"`)
- Create: `verify/leads-back.test.mjs`

**Interfaces:**

- Consumes: `ownerListings()` entries `{ file, folder, mine, ownedType, successor, rows }`; `columnTablesOf()`; `sectionsOf`, `tableOf`, `read`, `ls`.
- Produces: a check named `"a row that names its own kind of entity names this one or one before it"`, rule `"R16"`, failure text containing `comes after` and `(R16)`.

- [ ] **Step 1: Write the failing tests** — `verify/leads-back.test.mjs`:

```js
// A table on a page naming an entity of the page's own type, where that type is owned and
// ordered by a successor field, names the page's own entity or one before it in the owner's
// order. It hangs on what the schemas declare: an owned type with a field `ref → <itself>`, and a
// column of that type's own table declared `ref → <itself>`. No type is named.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");

const PHASE_SCHEMA = [
  "# Phase Schema", "", "> A phase.", "", "**Owner:** process", "",
  "## File Location", "", "`model/processes/<process>/phases/*.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `gate-to` | No | ref → phase | Next. |", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
  "| `# [Phase]` | Yes | The name. |",
  "| `## If not met` | Yes | Table. What is decided, and where the work goes. |", "",
  "`## If not met` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Outcome` | Yes | string | What is decided. |",
  "| `Leads to` | No | ref → phase | Where the work goes. |", "",
].join("\n");

const phase = (name, next, rows) => [
  "---", ...(next ? [`gate-to: ${next}`] : []), "---", "", `# ${name}`, "", "> A phase.", "",
  "## If not met", "", "| Outcome | Leads to |", "| --- | --- |", ...rows.map(([o, t]) => `| ${o} | ${t ?? ""} |`), "",
].join("\n");

const run = (phases, extra = []) => checkInstance(new Map([
  ["meta/core/process-schema.md", PROCESS_SCHEMA],
  ["meta/core/phase-schema.md", PHASE_SCHEMA],
  ["model/processes/delivery/delivery.md", "# Delivery\n\n> A process.\n\n## Phases\n\n| Phase |\n| --- |\n| Specify |\n| Build |\n| Release |\n"],
  ...phases.map(([file, name, next, rows]) => [`model/processes/delivery/phases/${file}.md`, phase(name, next, rows)]),
  ...extra,
]), { core: "meta/core" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

const OK = [
  ["specify", "Specify", "Build", [["reshaped", "Specify"], ["dropped"]]],
  ["build", "Build", "Release", [["reworked", "Build"], ["respecified", "Specify"]]],
  ["release", "Release", null, [["rolled back"]]],
];

test("rows that stay, go back or stop report nothing", () => {
  assert.deepEqual(about(run(OK), "comes after"), []);
});

test("a row naming a later phase fails once, naming the page, the row's target, its own phase and R16", () => {
  const phases = OK.map((p) => (p[1] === "Specify" ? [p[0], p[1], p[2], [["skipped", "Release"]]] : p));
  const hit = about(run(phases), "comes after");
  assert.equal(hit.length, 1, hit.join("\n"));
  assert.match(hit[0], /^model\/processes\/delivery\/phases\/specify\.md: /);
  assert.ok(hit[0].includes('"Release"') && hit[0].includes('"Specify"') && hit[0].includes("## If not met"), hit[0]);
  assert.match(hit[0], /\(R16\)/);
});

test("a row naming the very next phase fails too: the happy path is gate-to's", () => {
  const phases = OK.map((p) => (p[1] === "Build" ? [p[0], p[1], p[2], [["passed", "Release"]]] : p));
  assert.equal(about(run(phases), "comes after", '"Release"').length, 1);
});

test("a row naming another process's phase of the same name is R4's one finding, never this check's", () => {
  const phases = OK.map((p) => (p[1] === "Specify" ? [p[0], p[1], p[2], [["handed over", "Audit"]]] : p));
  const failures = run(phases, [
    ["model/processes/review/review.md", "# Review\n\n> A process.\n\n## Phases\n\n| Phase |\n| --- |\n| Audit |\n"],
    ["model/processes/review/phases/audit.md", phase("Audit", null, [["dropped"]])],
  ]);
  assert.deepEqual(about(failures, "comes after"), []);
  assert.ok(failures.some((f) => f.includes("specify.md") && f.includes('"Audit"')), failures.join("\n"));
});

test("a page its owner does not list is held to nothing here: the listing check names it", () => {
  const failures = run([...OK, ["audit", "Audit", null, [["skipped", "Release"]]]]);
  assert.deepEqual(about(failures, "comes after"), []);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test verify/leads-back.test.mjs`

Expected: FAIL on the two "fails" tests with length 0; the others pass.

- [ ] **Step 3: The check** — in `lib/checks.mjs`, directly after the order check:

```js
  {
    // The owner's order is what the successor field and the owner's table state together, and
    // a page's own table may name entities of its own type for another reason: a phase's
    // `## If not met` names where work goes when its gate fails. That is this phase or one
    // before it; a later one would be work skipped because a gate failed, which is a happy path
    // and the successor field's to state. Found as the order check is found, by what the
    // schemas declare, an owned type with a field `ref → <itself>` and a column of its own
    // table declared `ref → <itself>`, and no type is named. A name the owner does not list is
    // the listing check's finding, and a name that resolves to nothing in the owner is R4's.
    name: "a row that names its own kind of entity names this one or one before it",
    rule: "R16",
    run() {
      const tables = columnTablesOf();
      for (const { folder, mine, ownedType, successor, rows } of ownerListings()) {
        if (!successor || !rows) continue;
        const columns = (tables.get(ownedType) ?? []).flatMap((t) =>
          t.columns.filter((c) => /^ref\?? → /.test(c.declared) && c.declared.replace(/^ref\?? → /, "") === ownedType).map((c) => ({ section: t.section, column: c.name })));
        if (!columns.length) continue;
        const order = rows.filter((row, i) => mine.has(row) && rows.indexOf(row) === i);
        for (const f of (ls(folder) ?? []).filter((f) => f.endsWith(".md") && f !== "README.md")) {
          const page = `${folder}/${f}`;
          const text = read(page) ?? "";
          const own = text.match(/^#\s+(.+?)\s*$/m)?.[1];
          const at = order.indexOf(own);
          if (at < 0) continue;
          const sections = sectionsOf(text);
          for (const { section, column } of columns) {
            const table = tableOf(sections.get(section) ?? "");
            const i = table ? table.columns.indexOf(column) : -1;
            if (i < 0) continue;
            for (const row of table.rows) {
              const named = (row[i] ?? "").trim();
              const there = order.indexOf(named);
              if (there > at)
                fail(`${page}: a "## ${section}" row names "${named}" in \`${column}\`, which comes after "${own}" in its owner's order; a row names this ${ownedType} or one before it, and the way forward is \`${successor}\`'s (R16)`);
            }
          }
        }
      }
    },
  },
```

- [ ] **Step 4: Run the new tests, then everything**

Run: `node --test verify/leads-back.test.mjs && npm run verify && node --test verify/*.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/checks.mjs verify/leads-back.test.mjs
git commit -F - <<'EOF'
A row that names its own kind of entity names this one or one before it

A phase will name, in its own table, where work goes when its gate fails, and that is this phase or an earlier one: a later one would be work skipped because a gate failed, which is the happy path gate-to states. The check is found the way the order check is found, by an owned type with a field referencing itself and a column of its own table referencing itself, and names no type. A name another process owns stays R4's single finding, and a page its owner does not list stays the listing check's.

Verified: node --test verify/leads-back.test.mjs failed before the check and passes after it; npm run verify and node --test verify/*.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: The phase schema, the example, and the release

**Files:**

- Modify: `core/phase-schema.md`
- Modify: `example/model/processes/delivery/phases/specify.md`, `build.md`, `release.md`
- Modify: `verify/instance.test.mjs` (one parser test)
- Modify: `core/manifest.json` → `{ "version": "0.46.0", "shape": 3 }`
- Modify: `package.json` → `"version": "0.54.0"`
- Modify: `.github/workflows/instance-check.yml` → `ref: v0.54.0`

**Interfaces:**

- Consumes: the checks from Tasks 1 and 2.
- Produces: meta-model v0.54.0 (core 0.46.0), whose `example/` Tasks 4 and 5 read: Specify rows `reshaped` → Specify, `dropped` → stop; Build rows `reworked` → Build, `abandoned` → stop; Release row `rolled back` → stop; escalation authority `Reviewer` on all three.

- [ ] **Step 1: The negative control** — edit only `core/phase-schema.md` first (Steps 2 to 4), then run `npm run verify`. Expected: FAIL, three findings `no \`## If not met\``, one per example phase. That proves the section is read before the example is written.

- [ ] **Step 2: The sections row and the Gate description** — in `## Sections` of `core/phase-schema.md`, replace the `## Gate` row and add the new row after it:

```markdown
| `## Gate` | Yes | Bulleted. The criteria that must be satisfied to leave the phase, one item each |
| `## If not met` | Yes | Table. What the escalation authority may decide when the gate's criteria cannot be met, one row each, and where the work goes; its columns are declared below. A paragraph under the table may say what the rows cannot. |
```

- [ ] **Step 3: The column table** — after the `## What it produces` column table:

```markdown
`## If not met` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Outcome` | Yes | string | What the escalation authority may decide, in a few words: `reworked`, `dropped` |
| `Leads to` | No | ref → phase | The phase the work goes to: this one, or one before it in the owning process's `## Phases`. Empty where the process stops. |
```

- [ ] **Step 4: The writing rules** — in `## Writing rules`, replace "The last phase has no `gate-to`, and its gate is the one that releases the work." with "The last phase has no `gate-to`, and its gate is the one that releases the work; its `## If not met` still says what happens when it cannot." and append:

```markdown
- An outcome is what the escalation authority decides, in a word or a few, as a past participle
  where it can be: `reworked`, `narrowed`, `dropped`. It is not the gate criterion that failed.
- `Leads to` names this phase where the work stays in it, redone or waiting, and an earlier phase
  where the work goes back. It never names a later one: a failure that skips work is a happy
  path, and it belongs in `gate-to`. The instance checks say so.
- An empty `Leads to` stops the process. A hand-off to another process is a stop in this table,
  and the paragraph under it names the process the work goes to.
- Two rows may lead to the same phase; the outcome is what tells them apart.
- The paragraph under the table says only what the rows cannot, a reason or a hand-off, and a
  page whose rows say everything carries none.
```

- [ ] **Step 5: The example's phases** — in each file, delete the line starting "Where they cannot be met," and the blank line before it, and append after the Gate list:

`specify.md`:

```markdown

## If not met

| Outcome | Leads to |
| --- | --- |
| reshaped | Specify |
| dropped |  |
```

`build.md`:

```markdown

## If not met

| Outcome | Leads to |
| --- | --- |
| reworked | Build |
| abandoned |  |
```

`release.md`:

```markdown

## If not met

| Outcome | Leads to |
| --- | --- |
| rolled back |  |
```

- [ ] **Step 6: A parser test that the row draws its edge with its outcome** — at the end of `verify/instance.test.mjs` (add `import fs from "node:fs";` and `import path from "node:path";` to its imports if absent). `parseInstance` takes both the instance and `schemas` as maps of path to text:

```js
const mdFiles = (root) => {
  const m = new Map();
  const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (p.endsWith(".md")) m.set(path.relative(root, p).split(path.sep).join("/"), fs.readFileSync(p, "utf8")); } };
  walk(root);
  return m;
};

test("a phase's If not met row draws an edge to its phase with the outcome on it, and a stop row draws none", () => {
  const here = path.dirname(new URL(import.meta.url).pathname);
  const inst = parseInstance(mdFiles(path.join(here, "../example/model")), { schemas: mdFiles(path.join(here, "../core")) });
  const from = (id) => inst.edges.filter((x) => x.from === id && x.via === "If not met.Leads to");
  assert.deepEqual(from("processes/delivery/phases/build").map((x) => [x.to, x.attrs.Outcome]), [["processes/delivery/phases/build", "reworked"]]);
  assert.deepEqual(from("processes/delivery/phases/release"), []);
});
```

- [ ] **Step 7: Move the three version places together** — first `gh release list -R companygraph/meta-model -L 1`; Expected: `v0.53.0` is latest. If another release landed, take the next minor of core and the package and use those numbers everywhere in this plan.

- [ ] **Step 8: Run everything**

Run: `npm run verify && node --test verify/*.test.mjs && sh conventions/conventions-check && sh conventions/conventions-format check && npx markdownlint-cli2 core/phase-schema.md example/model/processes/delivery/phases/*.md`

Expected: PASS. If `verify/constraints.test.mjs`'s `c.phase.lists` assertion or a schema-shape test moves, it moves only because `## If not met` is a table and holds no list: read the diff of the failure before changing an expectation.

- [ ] **Step 9: Commit, push, open the PR, and stop**

```bash
git add core/phase-schema.md example/ verify/instance.test.mjs core/manifest.json package.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
A phase says where its failure leads

The phase schema gains a required If not met table after Gate: each row names what the escalation authority may decide and the phase the work goes to, this one or an earlier one, or none where the process stops. Gate loses the closing sentence that used to say it in prose, which no picture could draw. The example's three phases write their tables, and a parser test shows a row drawing its edge with the outcome on it and a stop row drawing none. Core moves to 0.46.0 and the package to 0.54.0, with the instance workflow's ref moved with it.

Verified: npm run verify failed on the three example phases before they were written and passes after; node --test verify/*.test.mjs, conventions-check, conventions-format check and markdownlint pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-gate-says-where-failure-leads
gh pr create --title "A gate says where failure leads" --body-file <(cat <<'EOF'
A process picture draws only the happy path, because a phase has one structured exit, gate-to, and says what happens when its gate fails in a closing sentence no picture can draw. This gives a phase a required If not met table after Gate, each row an outcome the escalation authority may decide and the phase the work goes to, this one or an earlier one, or none where the process stops; the sentence goes. Two generic checks come with it: a required table section carries at least one row, which R16 now says as it already did of lists, and a table naming the page's own ordered type never names a later entity. The parser now reads a blank cell in a table's reference column as naming nothing, so the row draws no edge where it used to be an R4; a stop row in If not met needs exactly that, and mcp-server, the sites and the plugin all inherit it. R16's new rows rule caught init's starting brand.md, which held four required Table. sections and no row in any of them, so it now carries one placeholder row per required table, worded so a reader cannot mistake it for real content, and Rob's to change; the two fixtures in verify/brand.test.mjs and verify/decision.test.mjs that asserted a header-only table passes now assert it fails instead. The example's phases write their tables. The spec and plan are in docs/superpowers. An instance that upgrades must write the table on every phase in the same change, or its checks fail. This is core 0.46.0 and the package at 0.54.0.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check, conventions-format check and markdownlint pass locally; each new check was shown failing on its fixture before it was written.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop. The merge waits for Rob's explicit merge word.

- [ ] **Step 10: After Rob merges, on his word, tag and release**

```bash
cd /Users/rob/git/companygraph/meta-model && git pull --ff-only
gh release create v0.54.0 --target main --title v0.54.0 --notes "Core 0.46.0: a phase carries a required \`## If not met\` table after \`## Gate\`, columns \`Outcome\` and \`Leads to\`, and \`## Gate\` no longer closes with a sentence on what happens when it cannot be met. An instance with processes that upgrades must, in the same change, write the table on every phase from that sentence and delete the sentence: each outcome a row, \`Leads to\` naming this phase or an earlier one, empty where the process stops, and a paragraph under the table for what the rows cannot say. Two checks are new: a required table section carries at least one row (R16), not only a phase's If not met, and a row naming its own kind of entity names this one or one before it. The parser now reads a blank cell in a table's reference column as naming nothing and draws no edge for that row, rather than the R4 it used to throw. init's starting brand.md carries a placeholder row in each of its required tables, since the first new check caught it holding none."
gh api repos/companygraph/meta-model/git/refs/tags/v0.54.0 --jq .object.sha
```

Then remove the worktree and the branch by name, per the merge-then-delete rule: `git worktree remove ../meta-model-a-gate-says-where-failure-leads && git branch -d a-gate-says-where-failure-leads && git push origin --delete a-gate-says-where-failure-leads`. If the remote delete is refused, hand Rob the command and do not retry.

---

## Phase B — mcp-server draws the rows

### Task 4: Dashed arrows and one Stop node

Worktree: `cd /Users/rob/git/companygraph/mcp-server && git pull --ff-only && git worktree add -b a-gate-says-where-failure-leads ../mcp-server-a-gate-says-where-failure-leads origin/main`. Starts once v0.54.0 is tagged.

**Files:**

- Modify: `package.json`, `package-lock.json` (re-pin `companygraph-meta-model` to `v0.54.0`)
- Modify: `lib/diagram.mjs` (`process()` and the header comment's "one process's phases in their order")
- Modify: `lib/tools.mjs` (the `diagram` description)
- Modify: `test/diagram.test.mjs`
- Modify: `package.json` version (the next minor after 0.36.0)

**Interfaces:**

- Consumes: edges `{ from: {id,name,type}, via: "If not met.Leads to", to: {id,name,type}, attrs: { Outcome } }` from `allEdges(s)`, since the parser puts only the non-reference columns in `attrs` and `Leads to`, the reference column, is not one of them; a phase entity's `sections`, where `sections.find((x) => x.heading === "If not met")?.tables?.[0]` is `{ columns: ["Outcome", "Leads to"], rows: [[outcome, target], …] }`; the phase's `fields["escalation-authority"]`.
- Produces: `diagram(s, { shape: "process", id })` whose `mermaid` adds, after the gate lines, the dashed lines and at most one Stop node; `links` gains one entry per dashed arrow between two phases; `edges` counts gate edges plus drawn If-not-met edges; `nodes` unchanged.

- [ ] **Step 1: Re-pin and see what moves**

```bash
export PATH=/opt/homebrew/bin:$PATH
npm uninstall companygraph-meta-model && npm install "github:companygraph/meta-model#v0.54.0"
node -e 'console.log(require("./package-lock.json").packages["node_modules/companygraph-meta-model"].resolved)'
npm test
```

Expected: the lock line names the v0.54.0 commit; `npm test` passes or fails only where the example's phase text is quoted. Record any failure and its cause; do not change an expectation yet.

- [ ] **Step 2: Write the failing tests** — in `test/diagram.test.mjs`, replace the body of the existing test "a process draws its phases in its table's order, who executes each, and each gate with its approvers" with the full picture, and add the others:

```js
test("a process draws its phases in its table's order, who executes each, and each gate with its approvers", () => {
  const d = diagram(s, { shape: "process", id: "processes/delivery" });
  assert.deepEqual([d.title, d.edges, d.omitted], ["Delivery", 4, 0]);
  assert.deepEqual(lines(d), [
    "flowchart LR",
    '  n0["<b>Specify</b><br/><small>Backend Engineer</small>"]', '  n1["<b>Build</b><br/><small>Backend Engineer, Reviewer</small>"]', '  n2["<b>Release</b><br/><small>Reviewer</small>"]',
    '  n0 -->|"Reviewer"| n1', '  n1 -->|"Reviewer"| n2',
    '  n0 -.->|"Reviewer: reshaped"| n0',
    '  n1 -.->|"Reviewer: reworked"| n1',
    "  stop((Stop))",
    '  n0 -.->|"Reviewer: dropped"| stop',
    '  n1 -.->|"Reviewer: abandoned"| stop',
    '  n2 -.->|"Reviewer: rolled back"| stop',
    "  classDef stop fill:none,stroke-dasharray:3 3",
    "  class stop stop",
  ]);
  assert.deepEqual(ids(d), [["n0", "processes/delivery/phases/specify"], ["n1", "processes/delivery/phases/build"], ["n2", "processes/delivery/phases/release"]]);
  assert.deepEqual(d.links, [
    { from: "n0", to: "n1", label: "Reviewer" }, { from: "n1", to: "n2", label: "Reviewer" },
    { from: "n0", to: "n0", label: "Reviewer: reshaped" }, { from: "n1", to: "n1", label: "Reviewer: reworked" },
  ]);
});
```

Add a fixture helper in `test/helpers.mjs` beside `withLoops`, named `withBackFlows`, that returns a copy of `exampleSnapshot()` edited as follows, so one snapshot exercises merging, going back, escaping and a process with no stop:

```js
// The example's Delivery, with Build's table rewritten to two rows leading back to Specify, one
// of them with Mermaid's own characters in its outcome, and Release's stop row made a stay, so
// Delivery holds merged back arrows and, with Specify's stop removed too, no stop at all.
export function withBackFlows() {
  const s = structuredClone(exampleSnapshot());
  const id = (p) => `processes/delivery/phases/${p}`;
  const table = (e) => e.sections.find((x) => x.heading === "If not met").tables[0];
  const byId = new Map(s.entities.map((e) => [e.id, e]));
  table(byId.get(id("specify"))).rows = [["reshaped", "Specify"]];
  table(byId.get(id("build"))).rows = [["respecified", "Specify"], ['held "for now" <#1>', "Specify"]];
  table(byId.get(id("release"))).rows = [["held", "Release"]];
  s.edges = s.edges.filter((x) => x.via !== "If not met.Leads to");
  s.edges.push(
    { from: id("specify"), via: "If not met.Leads to", to: id("specify"), attrs: { Outcome: "reshaped" } },
    { from: id("build"), via: "If not met.Leads to", to: id("specify"), attrs: { Outcome: "respecified" } },
    { from: id("build"), via: "If not met.Leads to", to: id("specify"), attrs: { Outcome: 'held "for now" <#1>' } },
    { from: id("release"), via: "If not met.Leads to", to: id("release"), attrs: { Outcome: "held" } },
  );
  return s;
}
```

Before writing it, read how `withLoops` builds its copy and whether `attrs["Leads to"]` in a snapshot holds the id or the name; match what `exampleSnapshot()` actually holds for a Build edge (print it once with `node -e`), and keep this helper's shape identical to it.

```js
test("rows to one phase merge into one arrow, in table order, escaped in the picture and raw in links; no stop row, no Stop node", () => {
  const d = diagram(withBackFlows(), { shape: "process", id: "processes/delivery" });
  assert.deepEqual(lines(d).slice(6), [
    '  n0 -.->|"Reviewer: reshaped"| n0',
    '  n1 -.->|"Reviewer: respecified, held #quot;for now#quot; #lt;#35;1#gt;"| n0',
    '  n2 -.->|"Reviewer: held"| n2',
  ]);
  assert.ok(!d.mermaid.includes("stop"), d.mermaid);
  assert.deepEqual(d.links.slice(2), [
    { from: "n0", to: "n0", label: "Reviewer: reshaped" },
    { from: "n1", to: "n0", label: 'Reviewer: respecified, held "for now" <#1>' },
    { from: "n2", to: "n2", label: "Reviewer: held" },
  ]);
  assert.equal(d.edges, 6);
});

test("the Stop node is never a node a client links, and its arrows are never links", () => {
  const d = diagram(s, { shape: "process", id: "processes/delivery" });
  assert.ok(d.nodes.every((n) => n.node !== "stop"));
  assert.ok(d.links.every((l) => l.to !== "stop" && l.from !== "stop"));
});

test("a phase with no If not met section, as on an older core, draws exactly today's picture", () => {
  const old = structuredClone(exampleSnapshot());
  for (const e of old.entities) if (e.type === "phase") e.sections = e.sections.filter((x) => x.heading !== "If not met");
  old.edges = old.edges.filter((x) => x.via !== "If not met.Leads to");
  const d = diagram(old, { shape: "process", id: "processes/delivery" });
  assert.deepEqual(lines(d), [
    "flowchart LR",
    '  n0["<b>Specify</b><br/><small>Backend Engineer</small>"]', '  n1["<b>Build</b><br/><small>Backend Engineer, Reviewer</small>"]', '  n2["<b>Release</b><br/><small>Reviewer</small>"]',
    '  n0 -->|"Reviewer"| n1', '  n1 -->|"Reviewer"| n2',
  ]);
  assert.equal(d.edges, 2);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `node --test test/diagram.test.mjs`

Expected: FAIL on the first three (no dashed lines yet); the older-core test passes.

- [ ] **Step 4: The drawing** — in `lib/diagram.mjs` `process()`, replace the final `return` with:

```js
  // What each phase says happens when its gate fails, after the way forward: one dashed arrow
  // per phase and target, its outcomes in table order after the seat that decides them, the
  // way a gate's arrow names the seats that approve it. An arrow between phases is an edge the
  // model draws, `If not met.Leads to`, and goes into `links`; a row leading nowhere draws no
  // edge, and is read from the phase's own table to an arrow into one Stop node, which is no
  // entity, so neither it nor its arrows are in `nodes` or `links` for a client to link.
  const back = allEdges(s).filter((x) => x.via === "If not met.Leads to" && drawnIds.has(x.from.id) && drawnIds.has(x.to.id));
  const stops = [];
  let drawnBack = 0;
  for (const e of phases) {
    const t = e.sections.find((x) => x.heading === "If not met")?.tables?.[0];
    if (!t) continue;
    const oc = t.columns.indexOf("Outcome"), lt = t.columns.indexOf("Leads to");
    if (oc < 0) continue;
    const who = names(e.fields["escalation-authority"]).map(plain).join(", ");
    const mine = back.filter((x) => x.from.id === e.id);
    const groups = new Map(); // target id, or "" for a stop, to its outcomes in table order
    for (const row of t.rows) {
      const outcome = plain(row[oc] ?? "").trim();
      const target = lt < 0 ? "" : String(row[lt] ?? "").trim();
      if (!outcome) continue;
      let to = "";
      if (target) {
        const edge = mine.find((x) => x.to.name === target && text(x.attrs?.Outcome) === outcome);
        if (!edge) continue; // a row whose target resolved to nothing draws nothing
        to = edge.to.id;
        drawnBack += 1;
      }
      if (!groups.has(to)) groups.set(to, []);
      groups.get(to).push(outcome);
    }
    for (const [to, outcomes] of groups) {
      const raw = `${who ? `${who}: ` : ""}${outcomes.join(", ")}`;
      if (to === "") { stops.push(`  ${of(e)} -.->|"${label(raw)}"| stop`); continue; }
      lines.push(`  ${of(e)} -.->|"${label(raw)}"| ${of(byId.get(to))}`);
      links.push({ from: of(e), to: of(byId.get(to)), label: raw });
    }
  }
  if (stops.length) lines.push("  stop((Stop))", ...stops, "  classDef stop fill:none,stroke-dasharray:3 3", "  class stop stop");
  return { title: p.name, mermaid: lines.join("\n"), nodes, links, edges: gates.length + drawnBack, omitted: 0 };
```

`byId` already maps phase ids to phase entities in `process()`, and `of()` returns an already-drawn phase's node name without adding a node.

- [ ] **Step 5: The words** — in `lib/diagram.mjs`'s header comment, "one process's phases in their order" becomes "one process's phases in their order with where each gate's failure leads"; in `lib/tools.mjs`'s `diagram` description, after "Use to show how things or types connect;" nothing changes, and "Returns `mermaid`, …" stays; add one sentence before "At most 50 nodes.": "A process draws each phase's way forward solid and what its gate's failure leads to dashed, to a phase or to one Stop node, which is not in `nodes`." If `test/descriptions.test.mjs` bounds a description's length, keep within it and say what was cut.

- [ ] **Step 6: Run everything**

Run: `node --test test/diagram.test.mjs && npm test`

Expected: PASS. If a test outside `diagram.test.mjs` moved in Step 1 because the example's phase text changed, update its expectation now, one test at a time, reading the diff.

- [ ] **Step 7: The preview Rob sees before the PR** — draw the reference instance's Delivery with the new code against a local checkout of robertblust/mental-model at the Task 5 branch head (or, before Task 5 exists, skip this step and do it after Task 5's PR is open):

```bash
node -e 'import("./lib/diagram.mjs").then(async ({ diagram }) => {
  const { instanceSnapshotAt } = await import("./test/helpers.mjs");
  console.log(diagram(instanceSnapshotAt("/Users/rob/git/robertblust/mental-model-a-gate-says-where-failure-leads"), { shape: "process", id: "processes/delivery" }).mermaid);
})'
```

If `test/helpers.mjs` has no `instanceSnapshotAt(root)`, add one beside `instanceSnapshot()` that takes the root instead of `instanceRoot`. Render the source to a PNG (`npx -y @mermaid-js/mermaid-cli -i delivery.mmd -o delivery.png`) and send it to Rob. Ask one question: "One Stop node, or a stop per phase?", proposing one node if no arrow crosses a phase box, a stop per phase otherwise. On "per phase", the stop node becomes `stop_n1((Stop))` per phase that stops, with the `class` line naming each; update the expected lines in Step 2 accordingly.

- [ ] **Step 8: Version, commit, push, PR, stop**

```bash
npm version minor --no-git-tag-version
git add package.json package-lock.json lib/diagram.mjs lib/tools.mjs test/diagram.test.mjs test/helpers.mjs
git commit -F - <<'EOF'
A process picture draws where each gate's failure leads

meta-model v0.54.0 gives every phase an If not met table, and the process picture now draws it after the way forward: one dashed arrow per phase and target, labeled with the escalation authority and the outcomes in table order, and one Stop node for the rows that lead nowhere. An arrow between phases is an If not met edge and goes into links; the Stop node is no entity, so it and its arrows stay out of nodes and links and no client links them. A phase without the table, as on an older core, draws exactly the picture it drew before.

Verified: node --test test/diagram.test.mjs failed before the change and passes after; npm test passes; the reference instance's Delivery was rendered and shown to Rob.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-gate-says-where-failure-leads
gh pr create --title "A process picture draws where each gate's failure leads" --body-file <(cat <<'EOF'
The process picture drew only the happy path because the model held nothing else as an edge; with meta-model v0.54.0 every phase has an If not met table, and this draws it. Each phase gets one dashed arrow per target after the solid gate arrows, labeled with its escalation authority and the outcomes that lead there, and rows that stop the process lead to one Stop node. Back arrows are If not met edges and go into links with their raw labels, so the chat's note can state them; the Stop node is no entity and stays out of nodes and links, so chat-server and the widget need nothing. A phase with no table draws exactly what it drew before. It re-pins meta-model to v0.54.0.

Verified: node --test test/diagram.test.mjs and npm test pass locally; the Delivery picture of the reference instance was rendered and reviewed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop. The merge and the release wait for Rob's explicit word; the release is `gh release create v<version> --target main --title v<version> --notes "The process diagram draws each phase's If not met rows: dashed arrows to a phase, labeled with the escalation authority and outcomes, and one Stop node outside nodes and links. Re-pins meta-model v0.54.0."`, then worktree and branch removed by name.

---

## Phase C — the instances

Each instance is its own worktree and PR, upgraded to v0.54.0 and rewritten in the same change. In every phase: delete the Gate's closing sentence (the paragraph starting "Where they cannot be met" or "Where a clip cannot"), and append the block named for the phase below directly after the Gate's list, as its own `## If not met` section. Each PR goes to Rob phase by phase, one question per turn, each quoting the old sentence and the new block.

The blocks, written once here and named by the tasks:

#### Delivery Shape

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| reshaped | Shape |
| dropped |  |
```

#### Delivery Spec

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| reshaped | Shape |
| narrowed | Spec |
| dropped |  |
```

#### Delivery Plan

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| recut | Plan |
| specification reopened | Spec |
```

#### Delivery Implement

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| reworked | Implement |
| abandoned |  |
```

#### Delivery Integrate

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| release held | Integrate |
| reverted |  |
```

#### Answering Answer

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| chat closed |  |

The rules or the model are corrected through Delivery, and the chat opens again; no answer is corrected after the fact, because none is kept.
```

#### Narrating Narrate

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| voice changes | Narrate |
| note changes |  |

A note that changes goes back through Delivery.
```

#### Contribution Propose

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| carried on | Propose |
| stopped |  |

Nothing here obliges anyone to finish what they started.
```

#### Contribution Consider

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| pull request closed |  |

The Owner says which of the criteria failed, with what would make a later pull request succeed.
```

#### Contribution Review

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| narrowed | Review |
| carried on by someone else | Review |
| declined |  |
```

#### Contribution Integrate

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| reverted |  |

The Owner reverts rather than leave the default branch in a state nobody chose.
```

#### Feature request Raise

(companygraph; guestgraph ends the paragraph at "a finding", as its sentence does today)

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| stated with help | Raise |

The Owner helps state it rather than closing it; a request nobody could phrase is still a finding about the vocabulary.
```

#### Feature request Understand

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| closed as not understood |  |

The Owner says so in the issue; not understood is an answer, and is not a refusal.
```

#### Feature request Triage

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| left open | Triage |

The Owner says what would settle it, rather than classifying it to be finished with it.
```

#### Feature request Answer

```markdown
## If not met

| Outcome | Leads to |
| --- | --- |
| left open | Answer |

An answer nobody can act on is not an answer, and closing the issue does not make it one.
```

### Task 5: robertblust/mental-model

**Files:** `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**` (by the upgrade); `model/processes/delivery/phases/{shape,spec,plan,implement,integrate}.md`; `model/processes/answering/phases/answer.md`; `model/processes/narrating/phases/narrate.md`.

**Interfaces:** Consumes meta-model v0.54.0. Produces the merge SHA the blust.ch host and site pin, and the worktree Task 4 Step 7 previews.

- [ ] **Step 1: Worktree and upgrade**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd /Users/rob/git/robertblust/mental-model && git pull --ff-only
git worktree add -b a-gate-says-where-failure-leads ../mental-model-a-gate-says-where-failure-leads origin/main
cd ../mental-model-a-gate-says-where-failure-leads
npx --yes "github:companygraph/meta-model#v0.54.0" upgrade .
```

Expected: the upgrade moves core to 0.46.0, then the checks FAIL with one `no \`## If not met\`` per phase. That is the negative control. Confirm `.companygraph/manifest.json` names 0.54.0 and 0.46.0.

- [ ] **Step 2: Write the blocks** — Delivery's five phases take the Delivery blocks, `answering/phases/answer.md` takes Answering Answer, `narrating/phases/narrate.md` takes Narrating Narrate. Delete each closing sentence.

- [ ] **Step 3: Validate** — run the instance's validation as its CLAUDE.md states it (the mechanical checks, then an agent reading each changed phase against the phase schema's writing rules), and `npx markdownlint-cli2 "model/processes/**/*.md"`. Expected: PASS, and no finding of "comes after" or "has no row".

- [ ] **Step 4: Rob, one phase per turn** — for each changed phase, show the deleted sentence and the new block, with the proposal "as settled in the spec"; apply any change he asks for before the next.

- [ ] **Step 5: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
Every phase says where its failure leads

The instance moves to meta-model v0.54.0, whose phases carry a required If not met table, and every phase's closing sentence on what happens when its gate cannot be met becomes that table: Delivery's reshapes, narrowings, recuts, reworks and reverts, Answering's closed chat and Narrating's changed voice or note, with a paragraph where a row cannot say the reason or the hand-off to Delivery.

Verified: the checks failed on every phase after the upgrade and pass after the tables were written; the agent pass read each phase against the writing rules; markdownlint passes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-gate-says-where-failure-leads
gh pr create --title "Every phase says where its failure leads" --body-file <(cat <<'EOF'
This moves the instance to meta-model v0.54.0 and writes each phase's If not met table from the sentence its Gate used to close with, so a process picture can draw where a failed gate sends the work. The rows are the ones settled in the spec on September 27, and each phase was reviewed with Rob one at a time. Where a row cannot say why, or where the work goes to another process, a short paragraph under the table says it.

Verified: the instance checks failed on every phase after the upgrade and pass now; the agent pass and markdownlint pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop for Rob's merge word; then delete worktree and branch by name.

### Task 6: companygraph/mental-model

**Files:** as Task 5, plus `model/processes/contribution/phases/{propose,consider,review,integrate}.md` and `model/processes/feature-request/phases/{raise,understand,triage,answer}.md`.

- [ ] **Step 1: Worktree and upgrade** — as Task 5 Step 1, in `/Users/rob/git/companygraph/mental-model`, worktree `../mental-model-a-gate-says-where-failure-leads`. Expected: the checks fail on every phase.

- [ ] **Step 2: Propose's escalation authority, Rob's first question** — `propose.md` names `escalation-authority: Owner` and its sentence says the Contributor decides whether to carry on or stop. Ask, proposing: "`escalation-authority` becomes Contributor, since the page says the decision is the Contributor's and the arrow's label would otherwise say Owner." On yes, change the field; on no, keep Owner and add to the Propose paragraph: "The Contributor may stop at any time."

- [ ] **Step 3: Write the blocks** — Delivery (five), Answering Answer, Narrating Narrate, Contribution (four), Feature request (four, Raise with "about the vocabulary").

- [ ] **Step 4: Validate, Rob phase by phase, commit, push, PR, stop** — as Task 5 Steps 3 to 5, the commit and PR naming Contribution and Feature request among what changed.

### Task 7: guestgraph/mental-model

- [ ] **Step 1 to 4** — as Task 6, in `/Users/rob/git/guestgraph/mental-model`, with Rob's Task 6 answer on Propose proposed again (not assumed), and Feature request Raise's paragraph ending "is still a finding." as the page says today.

---

## Phase D — the consumers re-pin

### Task 8: The three hosts and the three sites

Each is its own worktree, commit and PR, stopped for Rob's merge word; every package re-pin is proved from `package-lock.json`.

- [ ] **Step 1: The three hosts** — `robertblust/mcp-blust-ch`, `companygraph/mcp-companygraph-io`, `guestgraph/mcp-guestgraph-io`: re-pin `companygraph-mcp-server` to Task 4's release and `source.json`'s `commit` to the instance's merge commit from Task 5, 6 or 7 (the three-place instance pin in each host, per the repin-hazards memory); `npm test`. chat-server needs no re-pin: the note reads `links`, which the back arrows join.
- [ ] **Step 2: The three sites** — `robertblust/robertblust.github.io`, `companygraph/companygraph.github.io`, `guestgraph/guestgraph.github.io`: re-pin `companygraph-meta-model` to `v0.54.0` and `source.json` to the instance's merge commit; `npm run model && npm run build && npm run sitemap`; `model:check` and `build:check` pass. Confirm each site's model file carries the rows: `node -e 'const j=require("./model.json"); console.log(j.entities.filter(e=>e.type==="phase"&&!e.sections.some(x=>x.heading==="If not met")).length)'` prints `0` (the file is `company.json` on companygraph.io).
- [ ] **Step 2b: companygraph.io's example and vocabulary** — companygraph.io's `/example/` and `/model/` pages draw `example.json` and `model.json`, which `npm run build` builds from the meta-model commit in `source.json` under `"meta-model"`, not from the package pin. Move `source.json`'s `"meta-model".commit` to the commit the `v0.54.0` tag names (`gh api repos/companygraph/meta-model/git/refs/tags/v0.54.0 --jq .object.sha`), run `npm run build`, and `build:check` passes. Confirm the example carries the tables and not the old sentence: `node -e 'const j=require("./example.json"); const p=j.entities.filter(e=>e.type==="phase"); console.log(p.length, p.filter(e=>!e.sections.some(x=>x.heading==="If not met")).length, JSON.stringify(j).includes("cannot be met"))'` prints the phase count, `0` and `false`. Confirm `model.json` holds the phase schema's `## If not met` row. This goes in the same companygraph.io PR as Step 2.
- [ ] **Step 3: Live verification** — after the deploys, reported with the host and the model commit each names:
  - on companygraph.io, `/example/` shows each Delivery phase's If not met table and no Gate closing sentence, and `/model/` shows the phase schema's new section;
  - the instance checks are green on all three instances' `main`;
  - on each MCP host, `get_entity` on the Delivery phase Spec returns its three rows, and `diagram` with shape `process` on Delivery returns a dashed arrow for every row with a target and one `stop((Stop))`;
  - on each chat, "show me the Delivery process" draws the back arrows and the Stop node, and the answer names no back flow that `links` does not hold; asked in German too on chat.blust.ch;
  - a screenshot of the picture on blust.ch in both themes, sent to Rob.
