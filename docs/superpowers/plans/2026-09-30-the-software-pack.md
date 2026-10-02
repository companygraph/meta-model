# The software pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance can take the `software` pack with `init --pack software`, or later with `upgrade --pack software`, write bounded contexts, concept designs, aggregates, domain events and feature designs against five schemas vendored beside core, and be held to them by the same checks and parser that hold core, with a rule R20 keeping each unit to the types it may name.

**Architecture:** The checker learns that core is one unit of several. `lib/checks.mjs` gains a `PACKS` constant beside `TYPES` and a `vocabularyOf` helper that returns every type an instance takes with the path its schema is read from; `instanceChecks` reads schemas through it instead of `${core}/<type>-schema.md`. R20 is one new check; a second, citing R16, holds the labels an aggregate's invariants and a feature design's scenarios carry, on the rows `PACKS` states. The five schemas live in `packs/software/`, the repository's own check holds their shape as it holds core's, and a fixture test runs a small instance through them. The parser labels a pack schema `<unit>/<type>`. The CLI vendors a pack with `init` or with `upgrade`, records it in the manifest, walks it in `check` and moves it in `upgrade`.

**Tech Stack:** Node 22 ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-09-30-the-software-pack-design.md`, as amended on October 1, 2026 after beacon's reading (#224)

This plan covers meta-model only. `companygraph/mental-model` taking the pack, the MCP server's and the Obsidian plugin's reading of `<unit>/<type>` addresses, and beacon's instance each follow the release in work of their own.

## Global Constraints

- Precondition: meta-model #211, which adds R19, is merged into main, and this branch is rebased on it before Task 2. If it is not, stop and ask the owner; R20's number depends on it.
- Rule, verbatim, in `core/CONVENTIONS.md` directly after the R19 section: `### R20 — A unit names only what it may` followed by the paragraph `Core names only its own types. A pack names core's types and its own, and no other pack's. A type's name is unique across every unit an instance takes.`
- The pack's name is `software`. Its folder in the repository is `packs/software/`, in an instance `<units>/software/`, and the manifest lists it as `"packs": ["software"]`.
- The five types, their folders and owners, exactly: `feature-design` at `feature-designs`; `bounded-context` at `bounded-contexts/<bounded-context>`, owning `concept-design`, `aggregate`, `domain-event`; `concept-design` at `bounded-contexts/<bounded-context>/concept-designs`; `aggregate` at `bounded-contexts/<bounded-context>/aggregates`; `domain-event` at `bounded-contexts/<bounded-context>/domain-events`.
- Core's reference grammar does not change. A table reaching into another context has the columns `Type`, `Entity`, `Context`, and `Entity` is `ref → by Type in Context`.
- No core schema changes. Core's `TYPES` array is not edited.
- Every enum token and every borrowed section names its source in its description (Evans, Vernon, DDD Crew, Jackson, Gherkin), and each schema's `## References` lists those sources with an https address.
- A label is letters, digits and hyphens, matching `/^[A-Za-z0-9-]+$/`, and unique within its page. It sits in the `Label` column of an aggregate's `## Invariants` table and opens each `###` heading of a feature design's `## Scenarios` as `### <Label>: <title>`. The same label on two pages is allowed.
- Every pack schema's `## Writing rules` ends with the bullet on where a page drawn from code names that code, word for word as Task 3 gives it in each of the five schemas.
- No version bump in this plan. The release, its number and its notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- Since #197, `lib/` and `bin/` carry their types as JSDoc and `types/` holds the declarations built from it, committed. A row shape or a signature this plan changes changes its JSDoc too (`TypeEntry` in `lib/checks.mjs` is the row the plan calls `TypeRow`), and before each commit `npm run typecheck` passes and `npm run build` has rewritten `types/`, which `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Nothing pushed names the owner's multi-person instance or its organization.

## Review Focus

- A concept design named in a feature design's `## Uses` with the wrong context, a name that exists only in the other context, must fail as unresolvable rather than resolve to the first match anywhere. Pinned in Task 4.
- A label repeated on one page, or a scenario heading with no label, must fail naming the page and the label, while the same label on two pages passes. Pinned in Task 4.
- An instance whose manifest lists a pack this checker does not ship must be refused by name before anything is read, not reported as a pile of unknown folders. Pinned in Task 6.
- An upgrade of an instance that took the pack must move the pack's files with core's, and an edited pack schema must stop it as an edited core schema does; `upgrade --pack software` on an instance made without it must vendor the pack and list it. Pinned in Task 6.
- An instance that takes no pack must pass exactly as before: no new failure, no new line in the report beyond what it printed. Pinned in Task 1.

---

### Task 1: The checker reads every unit an instance takes

**Files:**

- Modify: `lib/checks.mjs` (after `TYPES`, `SINGULAR`, `PLURAL`; `typeOfPath`; `instanceChecks`; `checkInstance`)
- Create: `verify/packs.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/packs.test.mjs`)

**Interfaces:**

- Produces: `PACKS: { [name: string]: TypeRow[] }` (a `TypeRow` is the shape of a `TYPES` entry); `vocabularyOf({ core?: string, packs?: { name: string, dir: string, types?: TypeRow[] }[] }) → { types: (TypeRow & { unit: string, dir: string })[], schemaOf: (type: string) → string }`; `typeOfPath(rel, model, types = TYPES)`; `instanceChecks({ …, packs = [] })`; `checkInstance(files, { core, model, packs = [] })`.

- [ ] **Step 1: Write the failing tests**

A toy pack keeps this task free of the real schemas, which arrive in Task 3. Its one type, `widget`, is passed in `types`, so `PACKS` is not needed yet.

```js
// verify/packs.test.mjs
// A pack is a unit beside core: its schemas are read from its own folder, its types join core's,
// and an instance that takes none is checked exactly as before.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance, vocabularyOf, TYPES } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const read = (name) => fs.readFileSync(new URL(`../core/${name}`, import.meta.url), "utf8");
const page = (fm, body) => `---\nid: ${uuidv7()}\n${fm}---\n\n${body}`;

const WIDGET_SCHEMA = `---
id: ${uuidv7()}
---

# Widget Schema

> Required structure for widget files.

## File Location

\`model/widgets/*.md\`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| \`id\` | Yes | string | What identifies this entity for as long as it exists, in the format \`model/identifier.md\` declares (R18) |
| \`source\` | Yes | ref → source | Where this page's facts are mastered |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| \`# [Widget]\` | Yes | The canonical name of the widget |
| \`> [What it is]\` | Yes | One sentence |
| \`## References\` | No | Table. What a reader can open; its columns are declared below. |

\`## References\` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| \`What\` | Yes | string | The kind of document |
| \`URL\` | Yes | string | Where it is |
`;

const WIDGET = [{ type: "widget", folder: "widgets" }];
const base = () => new Map([
  ["meta/core/identifier-schema.md", read("identifier-schema.md")],
  ["meta/core/source-schema.md", read("source-schema.md")],
  ["model/identifier.md", page("source: Local\nformat: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", page("", "# Local\n\n> Here.\n")],
]);
const withWidget = () => new Map([
  ...base(),
  ["meta/toy/widget-schema.md", WIDGET_SCHEMA],
  ["model/widgets/sprocket.md", page("source: Local\n", "# Sprocket\n\n> A widget.\n")],
]);
const TOY = [{ name: "toy", dir: "meta/toy", types: WIDGET }];

test("the vocabulary is core's types, then each pack's, each read from its own folder", () => {
  const { types, schemaOf } = vocabularyOf({ core: "meta/core", packs: TOY });
  assert.equal(types.length, TYPES.length + 1);
  assert.deepEqual(types.at(-1), { type: "widget", folder: "widgets", unit: "toy", dir: "meta/toy" });
  assert.equal(schemaOf("widget"), "meta/toy/widget-schema.md");
  assert.equal(schemaOf("source"), "meta/core/source-schema.md");
});

test("an instance that takes the pack is checked against the pack's schema and passes", () => {
  const { failures } = checkInstance(withWidget(), { core: "meta/core", model: "model", packs: TOY });
  assert.deepEqual(failures, []);
});

test("the same tree without the pack fails on the folder no type claims", () => {
  const { failures } = checkInstance(withWidget(), { core: "meta/core", model: "model" });
  assert.ok(failures.some((f) => f.includes("widgets")), failures.join("\n"));
});

test("an instance that takes no pack is checked exactly as before", () => {
  const before = checkInstance(base(), { core: "meta/core", model: "model" });
  const after = checkInstance(base(), { core: "meta/core", model: "model", packs: [] });
  assert.deepEqual(after, before);
  assert.deepEqual(before.failures, []);
});

test("a pack type whose schema is absent is reported as skipped, as a core type is", () => {
  const files = base();
  const { skipped } = checkInstance(files, { core: "meta/core", model: "model", packs: TOY });
  assert.ok(skipped.includes("widget"));
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/packs.test.mjs`. Expected: FAIL, `vocabularyOf` is not exported.

- [ ] **Step 3: Add `PACKS` and `vocabularyOf`**

Directly after `export const PLURAL = TYPES.filter((t) => t.folder);` in `lib/checks.mjs`:

```js
// The packs this release ships, each stated as `TYPES` states core's: the folder, the owner and
// the filename form a check needs are written here and never derived from a schema, for the
// reason `TYPES` gives. A pack is a unit beside core (R13, R20), and an instance takes it by name.
export const PACKS = {};

// Every type an instance is held to: core's, then the types of each pack it takes, each carrying
// the unit it belongs to and the folder its schema is read from. `types` on a pack overrides
// `PACKS` for a test that brings a pack this release does not ship. A name two units both declare
// resolves to the later one here, and R20's check is what reports it.
export function vocabularyOf({ core = "core", packs = [] } = {}) {
  const types = [
    ...TYPES.map((t) => ({ ...t, unit: "core", dir: core })),
    ...packs.flatMap(({ name, dir, types = PACKS[name] ?? [] }) => types.map((t) => ({ ...t, unit: name, dir }))),
  ];
  const at = new Map(types.map((t) => [t.type, t.dir]));
  const schemaOf = (type) => `${at.get(type) ?? core}/${type}-schema.md`;
  return { types, schemaOf };
}
```

- [ ] **Step 4: Let `typeOfPath` take the vocabulary**

Change its signature and its two lookups, leaving the body otherwise as it is:

```js
export function typeOfPath(rel, model, types = TYPES) {
  // … the README guard and the path split stay as they are …
  if (dir.length === 0) {
    const singular = types.find((s) => s.file === base);
    return singular ? singular.type : null;
  }
  for (const { type, folder } of types.filter((t) => t.folder)) {
```

- [ ] **Step 5: Read every schema through the vocabulary in `instanceChecks`**

Change the signature to `export function instanceChecks({ files, core = "core", model = MODEL, fail, requireSchemaIds = false, packs = [] })` and put these as its first lines, so every later use of `TYPES`, `SINGULAR` and `PLURAL` inside it reads the instance's vocabulary and not core's alone:

```js
  // The vocabulary this instance takes: core's types and each pack's, shadowing the module's
  // core-only lists for every check below.
  const { types: TYPES, schemaOf } = vocabularyOf({ core, packs });
  const SINGULAR = TYPES.filter((t) => t.file);
  const PLURAL = TYPES.filter((t) => t.folder);
```

Change `const typeOfFile = (rel) => typeOfPath(rel, model);` to `const typeOfFile = (rel) => typeOfPath(rel, model, TYPES);`.

Then replace every schema path built from `core` inside `instanceChecks` with `schemaOf`. The forms in the file today are `${core}/${type}-schema.md`, `${core}/${t.type}-schema.md`, `${core}/${owner.type}-schema.md` and `${core}/${j.target}-schema.md`:

```bash
sed -i '' -E 's/`\$\{core\}\/\$\{([a-zA-Z.]+)\}-schema\.md`/schemaOf(\1)/g' lib/checks.mjs
grep -n '\${core}/\${' lib/checks.mjs
```

Expected: the `grep` prints nothing. Where the replacement lands inside a longer template literal, such as a failure message, `schemaOf(x)` is now outside backticks and the line no longer parses; `node --check lib/checks.mjs` names each one. Rewrite each as `${schemaOf(x)}` inside the template. The one call in `identifier` at `read(\`${core}/identifier-schema.md\`)` becomes `read(schemaOf("identifier"))`.

- [ ] **Step 6: Pass the packs through `checkInstance`**

```js
export function checkInstance(files, { core = "core", model = MODEL, packs = [] } = {}) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const { types, schemaOf } = vocabularyOf({ core, packs });
  const skipped = types.filter((t) => !files.has(schemaOf(t.type))).map((t) => t.type);
  for (const check of instanceChecks({ files, core, model, fail, packs })) check.run();
  return { failures, skipped };
}
```

- [ ] **Step 7: Run the new tests and every existing suite**

Run: `node --test verify/packs.test.mjs && npm run verify && npm run test:instance-checks && npm run test:instance && npm run test:plan && npm run test:cli`. Expected: PASS everywhere. The existing suites passing unchanged is the proof that an instance taking no pack is checked as before.

- [ ] **Step 8: Add the test file to its script and commit**

In `package.json`, append ` verify/packs.test.mjs` to the `test:instance-checks` command.

```bash
git add lib/checks.mjs verify/packs.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The checker reads every unit an instance takes

Every schema path in the instance checks was built from core's folder, and the list of types was core's alone, so a pack's schema could not be read however it was vendored. PACKS now states each pack's types beside TYPES, vocabularyOf returns core's types and each pack's with the folder its schema is read from, and every check reads a schema through it.

An instance that takes no pack gets the vocabulary it always had, and every existing suite passes unchanged.

Verified: node --test verify/packs.test.mjs, npm run verify, npm run test:instance-checks, test:instance, test:plan and test:cli pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: R20 keeps each unit to the types it may name

**Files:**

- Modify: `core/CONVENTIONS.md` (R20 after R19; R13's sentence on packs)
- Modify: `lib/checks.mjs` (one check, appended to the array `instanceChecks` returns)
- Modify: `verify/packs.test.mjs`

**Interfaces:**

- Consumes: `vocabularyOf`, `instanceChecks({ packs })` from Task 1.
- Produces: failures ending `(R20)` in three forms, asserted below.

- [ ] **Step 1: Write the failing tests**

Append to `verify/packs.test.mjs`:

```js
const r20 = (files, packs) => checkInstance(files, { core: "meta/core", model: "model", packs }).failures.filter((f) => f.endsWith("(R20)"));

test("a core schema that names a pack's type fails", () => {
  const files = withWidget();
  files.set("meta/core/source-schema.md", read("source-schema.md").replace("| `source-id` |", "| `widget` | No | ref → widget | A widget |\n| `source-id` |"));
  assert.deepEqual(r20(files, TOY), [
    "meta/core/source-schema.md: names widget, a type of the toy pack; core names only its own types (R20)",
  ]);
});

test("a pack type that takes a core type's name fails", () => {
  const files = withWidget();
  files.set("meta/toy/source-schema.md", read("source-schema.md"));
  const packs = [{ name: "toy", dir: "meta/toy", types: [...WIDGET, { type: "source", folder: "sources" }] }];
  assert.deepEqual(r20(files, packs), [
    "meta/toy/source-schema.md: source is a core type's name, and a type's name is unique across every unit an instance takes (R20)",
  ]);
});

test("a pack schema that names another pack's type fails", () => {
  const files = withWidget();
  files.set("meta/other/gadget-schema.md", WIDGET_SCHEMA.replaceAll("Widget", "Gadget").replaceAll("widgets", "gadgets"));
  files.set("meta/toy/widget-schema.md", WIDGET_SCHEMA.replace("| `source` |", "| `gadget` | No | ref → gadget | A gadget |\n| `source` |"));
  const packs = [...TOY, { name: "other", dir: "meta/other", types: [{ type: "gadget", folder: "gadgets" }] }];
  assert.deepEqual(r20(files, packs), [
    "meta/toy/widget-schema.md: names gadget, a type of the other pack; a pack names core's types and its own (R20)",
  ]);
});

test("a pack schema that names core's types and its own passes", () => {
  assert.deepEqual(r20(withWidget(), TOY), []);
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test verify/packs.test.mjs`. Expected: the three failing cases FAIL with an empty array; the passing case passes.

- [ ] **Step 3: Write the rule**

In `core/CONVENTIONS.md`, directly after the R19 section:

```markdown
### R20 — A unit names only what it may

Core names only its own types. A pack names core's types and its own, and no other pack's. A type's name is unique across every unit an instance takes.
```

In R13, the sentence `A folder directly under \`model/\` is a type's folder and is named by a schema — core's, or any pack the instance declares.` gains after it: `A pack is vendored as a unit beside core, under the folder the manifest names, and R20 says what each unit may name.`

- [ ] **Step 4: Write the check**

Append to the array `instanceChecks` returns:

```js
  {
    // R20: core is level 0 and a pack level 1, and a reference from core to a pack would leave
    // core pointing at nothing in an instance that does not take it. Read from the schemas'
    // tables, where every declared reference is written.
    name: "a unit names only what it may",
    rule: "R20",
    run() {
      // Core's rows come first in the vocabulary, so a name a pack reuses still reads as core's
      // here, and the reuse is reported once below rather than as core naming the pack.
      const unitOf = new Map();
      for (const t of TYPES) if (!unitOf.has(t.type)) unitOf.set(t.type, t.unit);
      const coreTypes = new Set(TYPES.filter((t) => t.unit === "core").map((t) => t.type));
      const named = (text) => {
        const s = sectionsOf(text ?? "");
        const tables = `${s.get("Frontmatter") ?? ""}\n${s.get("Sections") ?? ""}`;
        return [...tables.matchAll(/(?:array of ref|ref\??|qualifier) → ([a-z][a-z-]*)/g)].map((m) => m[1]);
      };
      // Each unit's own file, read by its own path: `schemaOf` gives a reused name's later unit.
      const seen = new Set();
      for (const t of TYPES) {
        const path = `${t.dir}/${t.type}-schema.md`;
        const text = read(path);
        if (text === null || seen.has(path)) continue;
        seen.add(path);
        if (t.unit !== "core" && coreTypes.has(t.type)) {
          fail(`${path}: ${t.type} is a core type's name, and a type's name is unique across every unit an instance takes (R20)`);
          continue;
        }
        for (const target of new Set(named(text))) {
          const unit = unitOf.get(target);
          if (!unit || unit === "core" || unit === t.unit) continue;
          if (t.unit === "core") fail(`${path}: names ${target}, a type of the ${unit} pack; core names only its own types (R20)`);
          else fail(`${path}: names ${target}, a type of the ${unit} pack; a pack names core's types and its own (R20)`);
        }
      }
    },
  },
```

- [ ] **Step 5: Run the tests**

Run: `node --test verify/packs.test.mjs && npm run test:rules && npm run verify`. Expected: PASS. `test:rules` holds every cited rule to a section of `core/CONVENTIONS.md`, so it fails if R20's heading is missing or misspelled.

- [ ] **Step 6: Commit**

```bash
git add core/CONVENTIONS.md lib/checks.mjs verify/packs.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
R20 keeps each unit to the types it may name

Core is level 0 and a pack level 1, and a reference from core to a pack would leave core pointing at nothing in an instance that takes no pack. R20 says core names only its own types, a pack names core's and its own, and a type's name is unique across every unit an instance takes. One check holds all three, reading the references each schema's tables declare.

R13 now says a pack is vendored as a unit beside core and points to R20.

Verified: node --test verify/packs.test.mjs, npm run test:rules and npm run verify pass; each of the three failing cases failed before the check was written.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: The five schemas, held to their shape

**Files:**

- Create: `packs/software/bounded-context-schema.md`, `concept-design-schema.md`, `aggregate-schema.md`, `domain-event-schema.md`, `feature-design-schema.md`, `manifest.json`, `README.md`
- Modify: `lib/checks.mjs` (`PACKS.software`)
- Modify: `verify/check.mjs` (every loop over `TYPES` that reads `core/<type>-schema.md`; a pack manifest check)
- Modify: `package.json` (`files` gains `"packs"`)

**Interfaces:**

- Consumes: `PACKS` from Task 1.
- Produces: `PACKS.software` with the five rows in Global Constraints, where the aggregate's row carries `labels: { section: "Invariants", column: "Label" }` and the feature design's `labels: { section: "Scenarios", heading: true }`; the five schema files at the paths above.

- [ ] **Step 1: State the pack's types**

Replace `export const PACKS = {};` with:

```js
export const PACKS = {
  software: [
    // A feature design uses the contexts it touches and owns none, so it sits in the container.
    // `labels` names where a page carries labels a test or a code comment cites from outside the
    // model; Task 4's check holds them. Stated here, as the folder is, and never read from prose.
    { type: "feature-design", folder: "feature-designs", labels: { section: "Scenarios", heading: true } },
    // R5, R6: a bounded context owns the terms of its language, its aggregates and its events,
    // and none of them means anything outside it, so it is a folder, as a process is.
    { type: "bounded-context", folder: "bounded-contexts/<bounded-context>", owns: ["concept-design", "aggregate", "domain-event"] },
    { type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context" },
    { type: "aggregate", folder: "bounded-contexts/<bounded-context>/aggregates", owner: "bounded-context", labels: { section: "Invariants", column: "Label" } },
    { type: "domain-event", folder: "bounded-contexts/<bounded-context>/domain-events", owner: "bounded-context" },
  ],
};
```

- [ ] **Step 2: Hold every unit's schemas in the repository's own check**

In `verify/check.mjs`, import `PACKS` beside `TYPES` and add after the imports:

```js
// Every schema this repository ships, core's and each pack's, with the path it is read from.
// The shape checks below hold them all alike: a pack schema is written to R9 as a core one is.
const SCHEMAS = [
  ...TYPES.map((t) => ({ ...t, path: `core/${t.type}-schema.md` })),
  ...Object.entries(PACKS).flatMap(([name, types]) => types.map((t) => ({ ...t, path: `packs/${name}/${t.type}-schema.md` }))),
];
```

In the checks "schemas exist", "schema fixed shape", "every schema declares References" and the one at the old line 456 that reads `core/${type}-schema.md`, change the loop `for (const { type, … } of TYPES)` to `for (const { type, …, path } of SCHEMAS)` and delete the line that built `path` from `core/`. Messages that print `core/${type}-schema.md` print `${path}`.

Add one check to `CHECKS`:

```js
  {
    // A pack is released under core's tag, so its manifest carries core's version and nothing else
    // may tell them apart.
    name: "a pack is released with core",
    rule: "R20",
    run() {
      const core = JSON.parse(read("core/manifest.json") ?? "{}");
      for (const name of Object.keys(PACKS)) {
        const raw = read(`packs/${name}/manifest.json`);
        if (raw === null) { fail(`packs/${name}/manifest.json is missing`); continue; }
        const m = JSON.parse(raw);
        if (m.name !== name) fail(`packs/${name}/manifest.json: name is ${JSON.stringify(m.name)}, and the folder says ${name}`);
        if (m.version !== core.version) fail(`packs/${name}/manifest.json says ${m.version}, and core/manifest.json ${core.version}; a pack is released with core`);
      }
    },
  },
```

- [ ] **Step 3: Run the check to see it fail**

Run: `npm run verify`. Expected: FAIL, `packs/software/bounded-context-schema.md is missing`, and the same for the other four and the manifest.

- [ ] **Step 4: Write the pack's manifest and README**

`packs/software/manifest.json`, with `version` copied from `core/manifest.json`:

```json
{ "name": "software", "version": "<core/manifest.json's version, copied>" }
```

`packs/software/README.md`:

```markdown
# CompanyGraph — the software pack

> Vocabulary for a company that builds software: how it designs what it builds, in the words of domain-driven design. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack software`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `bounded-context` | The boundary within which one model and one language hold | nothing |
| `concept-design` | A term of a context's language, an entity or a value object | its bounded context |
| `aggregate` | A cluster of concept designs kept consistent as one unit | its bounded context |
| `domain-event` | Something that happened that other parts of the domain care about | its bounded context |
| `feature-design` | How a feature is built across the contexts it touches | nothing |

## Sources

| What | URL |
| --- | --- |
| Eric Evans, Domain-Driven Design Reference | https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf |
| Vaughn Vernon, Domain-Driven Design Distilled | https://www.oreilly.com/library/view/domain-driven-design-distilled/9780134434964/ |
| DDD Crew, Bounded Context Canvas | https://github.com/ddd-crew/bounded-context-canvas |
| DDD Crew, Aggregate Design Canvas | https://github.com/ddd-crew/aggregate-design-canvas |
| DDD Crew, Context Mapping | https://github.com/ddd-crew/context-mapping |
| Daniel Jackson, The Essence of Software | https://essenceofsoftware.com/ |
| Cucumber, Gherkin reference | https://cucumber.io/docs/gherkin/reference/ |

## Where it departs from its sources

- The strategic classification sits on the bounded context, as the Bounded Context Canvas puts it, and not on the subdomain as Evans does, so core's `domain` stays untouched.
- A domain event is a type and a command a row, because other contexts name an event and nothing outside its aggregate names a command.
- An architecture decision is core's `decision`, which the pack's types name; there is no type of its own.

## Left for later

Services, repositories, factories and modules; C4's system, container and component; a type for a relationship between contexts; commands as a type; a subdomain type; a `level` field. Read models and policies as types, from Event Modeling: a policy is the `Reaction` on a Consumes row, and a read model waits for an instance that writes one.
```

- [ ] **Step 5: Write the five schemas**

Each opens with an id: run `node bin/companygraph.mjs id` five times and put one in each file's frontmatter. The frontmatter rows `id`, `source` and `source-id` are copied verbatim from `core/phase-schema.md`.

`packs/software/bounded-context-schema.md`:

```markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Bounded Context Schema

> Required structure for bounded context files.

## File Location

`model/bounded-contexts/<bounded-context>/<bounded-context>.md`

A bounded context owns the terms of its language, its aggregates and its events, so it is a folder and they nest inside it (R5, R6).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `classification` | Yes | enum | `core`, `supporting` or `generic`. How much it matters to build this well: where the company competes, what it needs and builds for itself, or what it could buy (DDD Crew, Bounded Context Canvas). |
| `realizes` | No | array of ref → domain | The domains this context serves, the H1s of files in `domains/`; a context may serve several and a domain be served by several (Vernon) |
| `decisions` | No | array of ref → decision | The decisions that shaped this context, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Bounded Context]` | Yes | The canonical name of the context |
| `> [Purpose]` | Yes | What the context is responsible for, and one thing it leaves to another context |
| `## Responsibilities` | Yes | Bulleted. One responsibility each, in business words |
| `## Relationships` | No | Table. One row per context this one depends on, written on the downstream side; its columns are declared below. |
| `## Consumes` | No | Table. One row per domain event this context takes from another; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the context; its columns are declared below. |

`## Relationships` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Context` | Yes | ref → bounded-context | The upstream context this one depends on, by its canonical name |
| `Pattern` | Yes | enum | `partnership`, `shared kernel`, `customer/supplier`, `conformist`, `anticorruption layer`, `open host service`, `published language`, `separate ways` or `big ball of mud`. How the two contexts relate (DDD Crew, Context Mapping). |

`## Consumes` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of what is consumed, as its schema is named: `domain-event` |
| `Entity` | Yes | ref → by Type in Context | What is consumed, by its canonical name |
| `Context` | Yes | string | The context that owns it, by its canonical name |
| `Reaction` | No | string | What this context does in response, naming the handled command in words; a command is a row on its aggregate, and nothing can reference it (Event Modeling, policy) |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a context canvas, a service's documentation |
| `URL` | Yes | string | Where it is |

## Purpose

A bounded context answers "within which boundary does one model, and one meaning of each word, hold?" It is Evans's bounded context and the solution side of core's domain: a domain says what area of the company something belongs to, and a context says where one model of it is built. It owns the terms of its language, so two contexts may mean different things by one word, which is the problem domain-driven design exists to solve. Its strategic classification departs from Evans, who puts it on the subdomain; it sits here, as the DDD Crew's canvas puts it, so that core's domain stays untouched.

## Writing rules

- The name is the business's, not a service's or a team's: "Billing", not "billing-service".
- The purpose names one thing the context leaves to another, so its boundary can be read from its first line.
- A relationship is written on the downstream context, the side that knows it depends. A symmetric pattern, a partnership or a shared kernel, is written once, on either side.
- The context map is drawn from the Relationships rows and never written as a page.
- An event is consumed where the Consumes table names it, and the Relationships table names the context it comes from.
- A reaction says what happens here, not in the context that emitted the event.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
```

`packs/software/concept-design-schema.md`:

```markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Concept Design Schema

> Required structure for concept design files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/concept-designs/*.md`

A concept design is a term of one context's language and means nothing outside it, so it nests inside its context (R5, R10), and its name is unique within that context (R2).

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `kind` | Yes | enum | `entity` or `value object`. An entity is defined by an identity that persists through changes to its attributes; a value object is defined only by its attributes and is replaced rather than changed (Evans). |
| `refines` | No | ref → concept | The enterprise concept this term narrows, the H1 of a file in `concepts/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Concept Design]` | Yes | The term, as the context's people say it |
| `> [Meaning]` | Yes | What the word means in this context, and nowhere else |
| `## Attributes` | No | Table. What the term carries; its columns are declared below. |
| `## Relations` | No | Table. Other terms of the same context this one is related to; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the term; its columns are declared below. |

`## Attributes` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Attribute` | Yes | string | The attribute's name, as the context's people say it |
| `Type` | Yes | string | A plain type such as `Money` or `date`, or the name of a value-object concept design in the same context |
| `Description` | No | string | What the attribute says |

`## Relations` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept-design | The related term in the same context, by its canonical name |
| `Cardinality` | Yes | enum | `one`, `maybe one`, `many` or `one to many`. How many of the target one of these has: exactly one, none or one, none or more, or one or more. |
| `As` | No | string | The role the target plays, required where two rows name the same concept |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a model diagram, a glossary |
| `URL` | Yes | string | Where it is |

## Purpose

A concept design answers "what does this word mean here?" It is one term of a bounded context's ubiquitous language (Evans), and an entity or a value object by its kind. It may refine an enterprise concept of core, which says what the thing is for the whole company; the concept design says what it is inside one context, which is narrower and may differ from another context's term of the same name.

## Writing rules

- The meaning says what the thing is in this context, not what a system does with it.
- The kind follows Evans's test: if every attribute changed, would it still be the same one? Then it is an entity.
- A relation is written on one side only, as core's concept relations are.
- An attribute whose type is a value object names that value object's concept design exactly.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
```

`packs/software/aggregate-schema.md`:

```markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Aggregate Schema

> Required structure for aggregate files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/aggregates/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `root` | Yes | ref → concept-design | The entity through which the aggregate is reached, a concept design of kind `entity` in the same context (Evans) |
| `members` | No | array of ref → concept-design | The other concept designs the aggregate holds, beside its root |
| `decisions` | No | array of ref → decision | The decisions that shaped this aggregate, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Aggregate]` | Yes | The aggregate's name, usually its root's |
| `> [Consistency]` | Yes | What the aggregate keeps consistent, in one sentence |
| `## Invariants` | Yes | Table. One rule per row that holds after every change, under a label a test or a code comment cites it by (DDD Crew, Aggregate Design Canvas); its columns are declared below. |
| `## Handled commands` | No | Table. What the aggregate is asked to do; its columns are declared below. |
| `## State transitions` | No | The states the aggregate moves through and what moves it (DDD Crew, Aggregate Design Canvas) |
| `## References` | No | Table. What a reader can open to learn more about the aggregate; its columns are declared below. |

`## Invariants` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Label` | Yes | string | What the invariant is cited by: letters, digits and hyphens, unique within the aggregate, such as `INV-T1` |
| `Invariant` | Yes | string | The rule, stated so a test could check it |

`## Handled commands` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Command` | Yes | string | The command, in the imperative: "Issue invoice" |
| `Description` | No | string | What it asks for, and what it refuses |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an aggregate canvas, a design note |
| `URL` | Yes | string | Where it is |

## Purpose

An aggregate answers "what has to stay consistent together, and through what is it changed?" It is Evans's aggregate: a cluster of concept designs changed only through its root. The invariants are a table and not a numbered list, because they are a set and not a sequence, and a position is no key anything outside can cite. A command is a row here and not a type, because nothing outside the aggregate names it. The events it emits are not written here: each event names its aggregate as `emitted-by`, and the edge is read from that end.

## Writing rules

- The root is an entity. A value object cannot be a root, since it has no identity to reach the rest through.
- An invariant is a rule that holds after every command, stated so a test could check it.
- A command is named in the imperative and an event in the past tense, so the two are never confused.
- A label stays when its invariant is reworded. A new rule takes a new label, and a removed rule's label is not used again.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
```

`packs/software/domain-event-schema.md`:

```markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Domain Event Schema

> Required structure for domain event files.

**Owner:** bounded-context

## File Location

`model/bounded-contexts/<bounded-context>/domain-events/*.md`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `emitted-by` | Yes | ref → aggregate | The aggregate whose change the event records, in the same context |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Domain Event]` | Yes | What happened, in the past tense: "Invoice issued" |
| `> [What happened]` | Yes | The event in business words, in one sentence |
| `## Payload` | No | Table. What the event carries; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the event; its columns are declared below. |

`## Payload` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Attribute` | Yes | string | The value's name, as the context's people say it |
| `Type` | Yes | string | A plain type such as `duration` or `timestamp`, or the name of a concept design in the same context |
| `Description` | No | string | What the value says |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a message schema, an event catalog |
| `URL` | Yes | string | Where it is |

## Purpose

A domain event answers "what happened that other parts of the domain care about?" It is Evans's and Vernon's domain event, named in the past tense. It is a type and not a row of its aggregate because other contexts consume it and feature designs name it, and a row cannot be named from outside its page.

## Writing rules

- The name is in the past tense and says what happened, not what should happen next.
- A payload type that names a term names one of the event's own context; a consumer translates it into its own language.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
```

`packs/software/feature-design-schema.md`:

```markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Feature Design Schema

> Required structure for feature design files.

## File Location

`model/feature-designs/*.md`

A feature design uses the contexts it touches and owns none, because a context outlives any one feature and serves many.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `refines` | No | ref → feature | The feature this design builds, the H1 of a file in `features/`; more than one design may refine one feature |
| `contexts` | Yes | array of ref → bounded-context | The contexts the design takes part in, at least one |
| `decisions` | No | array of ref → decision | The decisions that shaped this design, the H1s of files in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Feature Design]` | Yes | The design's name |
| `> [What it delivers]` | Yes | What the design delivers, in one sentence |
| `## Operational principle` | Yes | The one scenario that shows why the design exists (Jackson, The Essence of Software) |
| `## Scenarios` | No | One `###` per scenario, headed `<Label>: <title>` with the label unique within the design, each written Given, When, Then (Gherkin) |
| `## Uses` | No | Table. The terms and events of its contexts the design works with; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the design; its columns are declared below. |

`## Uses` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | `concept-design` or `domain-event`, as the schema is named |
| `Entity` | Yes | ref → by Type in Context | The term or event, by its canonical name |
| `Context` | Yes | string | The context that owns it, by its canonical name |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a prototype |
| `URL` | Yes | string | Where it is |

## Purpose

A feature design answers "how is this feature built, and across which contexts?" It is the solution side of what core's feature says it gives, and it refines that feature. Its operational principle is Jackson's: the one scenario that shows why the design exists. Its scenarios are written as Gherkin writes them.

## Writing rules

- The operational principle is one scenario, told as what happens, not a list of capabilities.
- A scenario says Given, When and Then, and each step is something a person or the system does or sees.
- Every term and event the scenarios mention has a row in `## Uses`, and no row names one they do not.
- A scenario's label is what the test that proves it cites. It stays when the title is reworded.
- A page drawn from code names that code as its `source`, the repository a sync reads, and the module or package as its `source-id`; a page written here that code then follows names the code in `## References` as `Implementation`.
```

- [ ] **Step 6: Run the repository check**

Run: `npm run verify`. Expected: PASS. Then, as a positive control, delete the `## References` row from `packs/software/domain-event-schema.md`, run `npm run verify`, see it fail naming that file, and put the row back.

- [ ] **Step 7: Ship the folder and commit**

In `package.json`, `"files"` becomes `["lib", "bin", "core", "packs", "agents"]`.

```bash
git add packs/software lib/checks.mjs verify/check.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The software pack ships five schemas, held as core's are

packs/software carries the bounded context, which owns its concept designs, aggregates and domain events, and the feature design that refines a core feature and uses the contexts it touches. Each term they define names its source where it is used, and the README lists the sources, where the pack departs from them and what it leaves for later.

The repository's own check now holds every schema it ships, core's and each pack's, to R9's shape, and a pack's manifest to core's version, since the two are released under one tag. The package ships the packs folder.

Verified: npm run verify passes, and failed naming the file when a pack schema's References row was removed.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 4: A small instance passes through the real schemas, its breakages fail, and its labels are held

**Files:**

- Create: `verify/software.test.mjs`
- Modify: `lib/checks.mjs` (`TypeEntry` gains `labels`; a `LABEL` pattern; one check in `instanceChecks`)
- Modify: `types/lib/checks.d.mts` (rewritten by `npm run build`)
- Modify: `package.json` (`test:instance-checks` gains `verify/software.test.mjs`)

**Interfaces:**

- Consumes: `checkInstance(files, { core, model, packs })`, `PACKS.software` and its `labels` rows, and the schemas from Tasks 1–3.
- Produces: `TypeEntry.labels?: { section: string, column?: string, heading?: boolean }`; the check "a label is a token, and no two on one page are the same", citing R16.

- [ ] **Step 1: Write the tests**

```js
// verify/software.test.mjs
// The software pack through its real schemas: packs/software/ and the core schemas it names are
// read from disk, so the test fails if a schema and the checks part.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/software/${n}-schema.md`, import.meta.url), "utf8");
const page = (fm, body) => `---\nid: ${uuidv7()}\nsource: Local\n${fm}---\n\n${body}`;
const PACKS = [{ name: "software", dir: "meta/software" }];
const BC = "model/bounded-contexts";
const AGG = `${BC}/billing/aggregates/invoice.md`;
const FD = "model/feature-designs/issue-an-invoice.md";

const tree = (change = (m) => m) => change(new Map([
  ...["source", "identifier", "domain", "concept", "product", "feature"].map((n) => [`meta/core/${n}-schema.md`, core(n)]),
  ...["bounded-context", "concept-design", "aggregate", "domain-event", "feature-design"].map((n) => [`meta/software/${n}-schema.md`, pack(n)]),
  ["model/identifier.md", page("format: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", `---\nid: ${uuidv7()}\n---\n\n# Local\n\n> Here.\n`],
  ["model/domains/invoicing.md", page("", "# Invoicing\n\n> What a customer is asked to pay. Pricing is left to Pricing.\n")],
  ["model/concepts/invoice.md", page("domain: Invoicing\n", "# Invoice\n\n> A request for payment.\n")],
  ["model/products/billing-console.md", page("domain: Invoicing\n", "# Billing Console\n\n> Where finance runs billing.\n")],
  ["model/features/billing-run.md", page("products:\n  - Billing Console\n", "# Billing run\n\n> A period is closed at once.\n\n## Description\n\nIt issues every invoice for a period and stops there.\n")],
  [`${BC}/billing/billing.md`, page("classification: core\nrealizes:\n  - Invoicing\n", "# Billing\n\n> Issues invoices. Telling the customer is left to Notification.\n\n## Responsibilities\n\n- Issue an invoice for a closed period\n")],
  [`${BC}/billing/concept-designs/invoice.md`, page("kind: entity\nrefines: Invoice\n", "# Invoice\n\n> The document a customer is asked to pay, once issued.\n\n## Attributes\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n| Total | Amount | What is owed |\n\n## Relations\n\n| Concept | Cardinality | As |\n| --- | --- | --- |\n| Amount | one | |\n")],
  [`${BC}/billing/concept-designs/amount.md`, page("kind: value object\n", "# Amount\n\n> A sum in one currency.\n")],
  [AGG, page("root: Invoice\nmembers:\n  - Amount\n", "# Invoice\n\n> An invoice and its total change together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| INV-B1 | An issued invoice's total never changes. |\n| INV-B2 | An invoice names one customer. |\n")],
  [`${BC}/billing/domain-events/invoice-issued.md`, page("emitted-by: Invoice\n", "# Invoice issued\n\n> An invoice was issued to a customer.\n\n## Payload\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n| Invoice | Invoice | The issued invoice |\n| Issued at | timestamp | When it was issued |\n")],
  [`${BC}/notification/notification.md`, page("classification: generic\n", "# Notification\n\n> Tells customers. Issuing is left to Billing.\n\n## Responsibilities\n\n- Tell a customer an invoice is ready\n\n## Relationships\n\n| Context | Pattern |\n| --- | --- |\n| Billing | customer/supplier |\n\n## Consumes\n\n| Type | Entity | Context | Reaction |\n| --- | --- | --- | --- |\n| domain-event | Invoice issued | Billing | Tells the customer the invoice is ready |\n")],
  [FD, page("refines: Billing run\ncontexts:\n  - Billing\n  - Notification\n", "# Issue an invoice\n\n> A closed period becomes invoices customers are told about.\n\n## Operational principle\n\nWhen finance closes a period, each customer's invoice is issued and the customer is told.\n\n## Scenarios\n\n### SC-B1: A period is closed\n\nGiven a customer with one billable order,\nWhen finance closes the period,\nThen one invoice is issued and the customer is told.\n\n### INV-B1: A label another page uses\n\nGiven the same label on an aggregate,\nWhen this page is checked,\nThen it passes, since a label is unique within its page.\n\n## Uses\n\n| Type | Entity | Context |\n| --- | --- | --- |\n| concept-design | Invoice | Billing |\n| domain-event | Invoice issued | Billing |\n")],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;

test("a small instance written in the pack passes, the same label on two pages included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a Uses row naming a term in the wrong context fails, and does not resolve elsewhere", () => {
  const f = failures(tree((m) => m.set(FD, m.get(FD).replace("| concept-design | Invoice | Billing |", "| concept-design | Invoice | Notification |"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /issue-an-invoice\.md: .*"Invoice".*Notification.*\(R4\)/);
});

test("a concept design filed outside any context fails as a folder no type claims", () => {
  const f = failures(tree((m) => m.set("model/concept-designs/stray.md", page("kind: entity\n", "# Stray\n\n> Nowhere.\n"))));
  assert.ok(f.some((x) => x.includes("concept-designs")), f.join("\n"));
});

test("a kind that is neither entity nor value object fails", () => {
  const f = failures(tree((m) => m.set(`${BC}/billing/concept-designs/amount.md`,
    m.get(`${BC}/billing/concept-designs/amount.md`).replace("kind: value object", "kind: service"))));
  assert.ok(f.some((x) => x.includes("amount.md") && x.includes("service")), f.join("\n"));
});

test("an event that names no aggregate fails", () => {
  const f = failures(tree((m) => m.set(`${BC}/billing/domain-events/invoice-issued.md`,
    m.get(`${BC}/billing/domain-events/invoice-issued.md`).replace("emitted-by: Invoice\n", ""))));
  assert.ok(f.some((x) => x.includes("invoice-issued.md") && x.includes("emitted-by")), f.join("\n"));
});

test("a Relationships row naming no context fails", () => {
  const f = failures(tree((m) => m.set(`${BC}/notification/notification.md`,
    m.get(`${BC}/notification/notification.md`).replace("| Billing | customer/supplier |", "| Invoicing | customer/supplier |"))));
  assert.ok(f.some((x) => x.includes("notification.md") && x.includes("Invoicing")), f.join("\n"));
});

test("an invariant label repeated on one page fails, naming the page and the label", () => {
  const f = failures(tree((m) => m.set(AGG, m.get(AGG).replace("| INV-B2 |", "| INV-B1 |"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /aggregates\/invoice\.md: "INV-B1" labels two items under ## Invariants.*\(R16\)$/);
});

test("a scenario label repeated on one page fails", () => {
  const f = failures(tree((m) => m.set(FD, m.get(FD).replace("### INV-B1:", "### SC-B1:"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /issue-an-invoice\.md: "SC-B1" labels two items under ## Scenarios/);
});

test("a scenario heading with no label fails", () => {
  const f = failures(tree((m) => m.set(FD, m.get(FD).replace("### SC-B1: A period is closed", "### A period is closed"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /issue-an-invoice\.md: "A period is closed" under ## Scenarios opens with no label.*\(R16\)$/);
});

test("a label that is not letters, digits and hyphens fails", () => {
  const f = failures(tree((m) => m.set(AGG, m.get(AGG).replace("| INV-B2 |", "| INV B2 |"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /aggregates\/invoice\.md: "INV B2" under ## Invariants is no label/);
});
```

- [ ] **Step 2: Run them to see the label tests fail**

Run: `node --test verify/software.test.mjs`. Expected: the four label tests FAIL with an empty list of failures, because nothing holds a label yet; every other test PASSES. A failure of the first test names what a schema requires that the fixture lacks, or a check that cannot read a pack type; fix the fixture where the schema is right, and the schema or Task 1's plumbing where it is not. The breakage tests assert the file and the offending value rather than a check's whole sentence, since those sentences are core's and not this plan's; the label tests assert this task's own sentences.

- [ ] **Step 3: State the rows and the pattern**

In `lib/checks.mjs`, the `TypeEntry` typedef gains, after `filename`:

```js
 * @property {{ section: string, column?: string, heading?: boolean }} [labels] Where a page of
 *   this type carries labels cited from outside the model: a table column, or the `###` headings
 *   of a section, each `<Label>: <title>`
```

and beside the other module-level patterns:

```js
// A label is what a test, a specification or a code comment cites an item by from outside the
// model, so it is one token: letters, digits and hyphens, as `INV-T1` and `SC-T1` are.
const LABEL = /^[A-Za-z0-9-]+$/;
```

- [ ] **Step 4: Add the check**

In `instanceChecks`, in the array it returns, directly after the check "two entities of a ranked type do not share a rank":

```js
  {
    // A label on an invariant or a scenario is what a test, a specification or a code comment
    // cites from outside the model, so it is a token, and no two on one page are the same. Where
    // a page carries labels is stated on the type's row, as its folder is, and never read from a
    // schema's prose. A label that changes still breaks whatever cites it, and nothing inside the
    // model can see that; a label is unique within its page and not across pages.
    name: "a label is a token, and no two on one page are the same",
    rule: "R16",
    run() {
      for (const { type, labels } of TYPES) {
        if (!labels) continue;
        walkMd(EX, (child, text) => {
          if (typeOfFile(child) !== type) return;
          const body = sectionsOf(text).get(labels.section);
          if (body === undefined) return;
          /** @type {string[]} */
          const found = [];
          if (labels.column) {
            const table = tableOf(body);
            const at = table ? table.columns.indexOf(labels.column) : -1;
            if (!table || at === -1) return;
            for (const row of table.rows) found.push(row[at] ?? "");
          } else {
            for (const line of body.split("\n")) {
              if (!line.startsWith("### ")) continue;
              const heading = line.slice(4).trim();
              const label = heading.match(/^([^:]+):\s+\S/)?.[1];
              if (label === undefined) {
                fail(`${child}: "${heading}" under ## ${labels.section} opens with no label; a heading there is "<Label>: <title>" (R16)`);
                continue;
              }
              found.push(label);
            }
          }
          /** @type {Set<string>} */
          const seen = new Set();
          for (const label of found) {
            if (!LABEL.test(label)) fail(`${child}: "${label}" under ## ${labels.section} is no label; a label is letters, digits and hyphens (R16)`);
            else if (seen.has(label)) fail(`${child}: "${label}" labels two items under ## ${labels.section}; a label names one, so what cites it finds it (R16)`);
            seen.add(label);
          }
        });
      }
    },
  },
```

A required `Label` column that is missing is already the column checks' to report, so this check passes over a table without one rather than saying it twice.

- [ ] **Step 5: Run everything**

Run: `node --test verify/software.test.mjs && npm run test:instance-checks && npm run test:rules && npm run typecheck && npm run build && npm run build:check`. Expected: PASS. `test:rules` holds the check's `R16` to a section of `core/CONVENTIONS.md`; `npm run build` rewrites `types/lib/checks.d.mts` with `labels`.

- [ ] **Step 6: Add the file to its script and commit**

Append ` verify/software.test.mjs` to `test:instance-checks` in `package.json`.

```bash
git add verify/software.test.mjs lib/checks.mjs types/lib/checks.d.mts package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A small instance in the software pack passes, its breakages fail, and its labels are held

Two contexts, an entity and a value object, an aggregate with labelled invariants, an event whose payload carries a term and a timestamp, a consumed event with its reaction and a feature design with labelled scenarios pass through the real schemas read from disk. A term named in the wrong context, a concept design filed outside any context, an unknown kind, an event with no aggregate and a relationship to no context each fail on the file that carries them.

An invariant or a scenario is cited from outside the model by its label, so a label is now one token, unique within its page: the rows that carry labels are stated on the aggregate's and the feature design's PACKS entries, and one check holds them, citing R16. The same label on two pages passes.

Verified: node --test verify/software.test.mjs, npm run test:instance-checks, test:rules, typecheck and build:check pass, and the four label tests failed before the check was written.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 5: The parser labels a pack schema by its unit

**Files:**

- Modify: `lib/instance.mjs` (`parseSchemas` and the seven places that slice `"core/".length`)
- Create: `verify/pack-parse.test.mjs`
- Modify: `package.json` (`test:instance` gains `verify/pack-parse.test.mjs`)

**Interfaces:**

- Consumes: the pack schemas from Task 3.
- Produces: `parseSchemas(files)` accepts keys `<type>-schema.md` (core) and `<unit>/<type>-schema.md` (a pack); a schema's `address` is `<unit>/<type>`; `typeOfAddress(address: string) → string`, exported.

- [ ] **Step 1: Write the failing tests**

```js
// verify/pack-parse.test.mjs
// A caller hands the parser one map of schemas: core's under their bare names, a pack's under its
// unit. The parser reads them as one vocabulary and labels each by the unit it came from.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSchemas, parseInstance, typeOfAddress } from "../lib/instance.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/software/${n}-schema.md`, import.meta.url), "utf8");
const schemas = () => new Map([
  ...["source", "identifier", "identity", "domain", "concept", "product", "feature"].map((n) => [`${n}-schema.md`, core(n)]),
  ...["bounded-context", "concept-design", "aggregate", "domain-event", "feature-design"].map((n) => [`software/${n}-schema.md`, pack(n)]),
]);

test("a core schema keeps its address, and a pack schema takes its unit's", () => {
  const { entities } = parseSchemas(schemas());
  const address = (t) => entities.find((e) => typeOfAddress(e.address) === t).address;
  assert.equal(address("feature"), "core/feature");
  assert.equal(address("bounded-context"), "software/bounded-context");
});

test("a Uses row resolves to the concept design inside the context it names", () => {
  // The parser reads an instance only with its identity (R6), so the fixture carries one.
  const files = new Map([
    ["identity.md", "---\nsource: Local\n---\n\n# Scratch\n\n> A company.\n"],
    ["sources/local.md", "# Local\n\n> Here.\n"],
    ["bounded-contexts/billing/billing.md", "---\nsource: Local\nclassification: core\n---\n\n# Billing\n\n> Issues invoices.\n\n## Responsibilities\n\n- Issue\n"],
    ["bounded-contexts/billing/concept-designs/invoice.md", "---\nsource: Local\nkind: entity\n---\n\n# Invoice\n\n> Billing's invoice.\n"],
    ["bounded-contexts/crm/crm.md", "---\nsource: Local\nclassification: supporting\n---\n\n# CRM\n\n> Keeps customers.\n\n## Responsibilities\n\n- Keep\n"],
    ["bounded-contexts/crm/concept-designs/invoice.md", "---\nsource: Local\nkind: value object\n---\n\n# Invoice\n\n> CRM's invoice.\n"],
    ["feature-designs/f.md", "---\nsource: Local\ncontexts:\n  - Billing\n---\n\n# F\n\n> F.\n\n## Operational principle\n\nIt runs.\n\n## Uses\n\n| Type | Entity | Context |\n| --- | --- | --- |\n| concept-design | Invoice | Billing |\n"],
  ]);
  const { entities, edges } = parseInstance(files, { schemas: schemas() });
  const f = entities.find((e) => e.name === "F");
  const billingInvoice = entities.find((e) => e.name === "Invoice" && e.address.startsWith("bounded-contexts/billing/"));
  assert.ok(edges.some((e) => e.from === f.id && e.to === billingInvoice.id), JSON.stringify(edges.filter((e) => e.from === f.id)));
});
```

- [ ] **Step 2: Run to see them fail**

Run: `node --test verify/pack-parse.test.mjs`. Expected: FAIL, `typeOfAddress` is not exported.

- [ ] **Step 3: Read the unit off the key, and the type off the address**

In `lib/instance.mjs`, above `parseSchemas`:

```js
// A schema's address is its unit and its type, `core/feature` or `software/bounded-context`.
// Everything that wants the type reads it here, rather than slicing a prefix only core carries.
export const typeOfAddress = (address) => address.slice(address.indexOf("/") + 1);
```

In `parseSchemas`, replace `const type = file.replace(/-schema\.md$/, "");` with:

```js
    // A bare key is core's, as every caller has always passed it; `<unit>/<type>-schema.md` is a
    // pack's (R20), passed in the same map so the parser reads one vocabulary.
    const slash = file.lastIndexOf("/");
    const unit = slash === -1 ? "core" : file.slice(0, slash);
    const type = file.slice(slash + 1).replace(/-schema\.md$/, "");
```

and replace every `"core/" + type` in the function with `` `${unit}/${type}` ``. Then replace each `e.address.slice("core/".length)` and `e.id.slice("core/".length)` in the file with `typeOfAddress(e.address)`:

```bash
grep -n '"core/".length' lib/instance.mjs
```

Expected after the change: no output. The comment at the sort, "Sorted while every id is still `core/<type>`", becomes "Sorted by address, so schemas keep their order by unit and type whatever stable ids they carry".

- [ ] **Step 4: Run the parser suites**

Run: `node --test verify/pack-parse.test.mjs && npm run test:instance && npm run test:instance-checks`. Expected: PASS.

- [ ] **Step 5: Add the file to its script and commit**

Append ` verify/pack-parse.test.mjs` to `test:instance` in `package.json`.

```bash
git add lib/instance.mjs verify/pack-parse.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The parser labels a pack schema by its unit

Every schema left the parse addressed core/<type>, and seven readers sliced that prefix off to get the type back, so a pack's schema would have been labelled core's. A caller now passes a pack's schemas in the same map under <unit>/<type>-schema.md, the parser addresses each by its unit, and typeOfAddress is the one reader of a type from an address.

Core's schemas, passed under their bare names as every caller does today, keep their addresses.

Verified: node --test verify/pack-parse.test.mjs, npm run test:instance and npm run test:instance-checks pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 6: The CLI vendors a pack, checks it and moves it

**Files:**

- Modify: `lib/instance-files.mjs` (`manifestOf` takes `packs`)
- Modify: `lib/plan.mjs` (`initPlan` and `upgradePlan` take `packs`)
- Modify: `bin/companygraph.mjs` (`init` and `upgrade` read `--pack`; `upgrade` passes the manifest's packs and the new ones; a `packOfThisRelease(name)` beside `coreOfThisRelease`)
- Modify: `bin/check-instance.mjs` (walk each pack, refuse an unknown one)
- Modify: `lib/untar.mjs` (`extractCore` also returns `packs/<name>/` files) — only if `--core` with a pack is supported; see Step 5
- Modify: `verify/plan.test.mjs`, `verify/check-script.test.mjs`

**Interfaces:**

- Consumes: `PACKS` from Task 1 (the names this release ships).
- Produces: `manifestOf({ tooling, core, units, packs = [], files })`; `initPlan({ …, packs = new Map() })` and `upgradePlan({ …, packs = new Map() })`, where `packs` maps a pack's name to its files as `core` maps core's; `packOfThisRelease(name) → Map<string, string>`.

- [ ] **Step 1: Write the failing plan tests**

Append to `verify/plan.test.mjs`, reusing the file's existing helpers for a core map and a manifest (read the top of the file for their names, `CORE` and the `initPlan` arguments the existing tests pass):

```js
test("init with a pack vendors it beside core and lists it in the manifest", () => {
  const packs = new Map([["software", new Map([["manifest.json", '{ "name": "software", "version": "0.0.1" }'], ["bounded-context-schema.md", "# Bounded Context Schema\n"]])]]);
  const { writes } = initPlan({ ...INIT_ARGS, packs });
  assert.equal(writes.get("meta/software/bounded-context-schema.md"), "# Bounded Context Schema\n");
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  assert.deepEqual(manifest.packs, ["software"]);
  assert.ok("meta/software/bounded-context-schema.md" in manifest.files);
});

test("an upgrade moves a pack's files with core's, and an edited pack schema stops it", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "new\n"]])]]);
  const manifest = { tooling: "0.0.1", core: { version: "0.0.1" }, units: "meta", packs: ["software"], files: { "meta/software/bounded-context-schema.md": hashOf("old\n") } };
  const moved = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map([["meta/software/bounded-context-schema.md", "old\n"]]) });
  assert.equal(moved.writes.get("meta/software/bounded-context-schema.md"), "new\n");
  const stopped = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map([["meta/software/bounded-context-schema.md", "edited\n"]]) });
  assert.match(stopped.refused, /meta\/software\/bounded-context-schema\.md/);
});

test("an upgrade given a pack the instance did not take vendors it and lists it", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "new\n"]])]]);
  const manifest = { tooling: "0.0.1", core: { version: "0.0.1" }, units: "meta", packs: [], files: {} };
  const { writes, refused } = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map() });
  assert.equal(refused, undefined);
  assert.equal(writes.get("meta/software/bounded-context-schema.md"), "new\n");
  assert.deepEqual(JSON.parse(writes.get(".companygraph/manifest.json")).packs, ["software"]);
});
```

Define `INIT_ARGS` and `UPGRADE_ARGS` at the top of the new block from the arguments the file's existing `initPlan` and `upgradePlan` tests already pass, so the two new tests differ from them only in `packs`, `manifest` and `held`.

- [ ] **Step 2: Run to see them fail**

Run: `node --test verify/plan.test.mjs`. Expected: the three new tests FAIL; nothing is written under `meta/software/`. If `upgradePlan` names its refusal something other than `refused`, use the file's own name in all three.

- [ ] **Step 3: Carry packs through the manifest and the plans**

`lib/instance-files.mjs`:

```js
export function manifestOf({ tooling, core, units, packs = [], files }) {
  return `${JSON.stringify({ tooling, core, units, packs, files }, null, 2)}\n`;
}
```

`lib/plan.mjs`, in `initPlan` (signature gains `packs = new Map()`), after the line that writes core's files:

```js
  // A pack is a unit beside core (R20): vendored the same way, hashed the same way, and moved by
  // the same upgrade.
  for (const [name, packFiles] of packs) for (const [path, text] of packFiles) writes.set(`${units}/${name}/${path}`, text);
```

and pass `packs: [...packs.keys()]` to `manifestOf`.

In `upgradePlan` (signature gains `packs = new Map()`):

```js
  const packPrefixes = [...packs.keys()].map((name) => `${units}/${name}/`);
  const owned = (path) => path.startsWith(prefix) || packPrefixes.some((p) => path.startsWith(p)) || (hasSkills && path.startsWith(SKILLS));
```

replacing the existing `owned`; after the loop that fills `release` from `core`:

```js
  for (const [name, packFiles] of packs) for (const [path, text] of packFiles) release.set(`${units}/${name}/${path}`, text);
```

and pass `packs: [...packs.keys()]` to `manifestOf`. The rogue-path refusal's last line becomes `An upgrade only ever moves ${[prefix, ...packPrefixes].join(", ")}, the skills it installed, .companygraph/manifest.json and the workflow's tag.`

- [ ] **Step 4: Run the plan tests**

Run: `node --test verify/plan.test.mjs`. Expected: PASS.

- [ ] **Step 5: Wire the CLI**

In `bin/companygraph.mjs`, beside `coreOfThisRelease`, a reader of a pack this package ships, built the same way as that function builds core's map but from `packs/<name>/`:

```js
// A pack this release ships, as a map of file to text, read the way core's is.
function packOfThisRelease(name) {
  const dir = join(HERE, "..", "packs", name);
  if (!existsSync(dir)) throw new Error(`this release ships no pack named ${name}; it ships ${Object.keys(PACKS).join(", ") || "none"}`);
  return new Map(readdirSync(dir).map((f) => [f, readFileSync(join(dir, f), "utf8")]));
}
```

In `init`, after `const core = …`:

```js
  // --pack takes the packs this release ships, comma-separated. With --core, a fetched core is
  // not paired with this release's packs, since a pack is released with its core.
  const packNames = given.pack ? given.pack.split(",").map((p) => p.trim()).filter(Boolean) : [];
  if (packNames.length && given.core) throw new Error("--pack takes this release's packs, and --core fetches another release's core; take them from one release");
  const packs = new Map(packNames.map((name) => [name, packOfThisRelease(name)]));
```

pass `packs` to `initPlan`, and after the `core …, vendored under` line print `  packs: ${packNames.join(", ")}, vendored beside it` when there are any. In `upgrade`, after the manifest is read:

```js
  // --pack takes a pack the instance did not have, so a company that started before a pack
  // shipped takes it without a second init. The packs it already lists move as before.
  const added = given.pack ? given.pack.split(",").map((p) => p.trim()).filter(Boolean) : [];
  if (added.length && given.core) throw new Error("--pack takes this release's packs, and --core fetches another release's core; take them from one release");
  const packNames = [...new Set([...(manifest.packs ?? []), ...added])];
```

and pass `packs: new Map(packNames.map((name) => [name, packOfThisRelease(name)]))` to `upgradePlan`; print `  packs: ${added.join(", ")}, vendored beside core` when `added` is not empty. Import `PACKS` from `../lib/checks.mjs` and add `--pack <names>` to both the `init` and the `upgrade` usage lines.

`lib/untar.mjs` is not changed: `--pack` with `--core` is refused above, so a fetched release never has to yield packs.

- [ ] **Step 6: Walk the packs in `check`, and refuse one the checker does not ship**

In `bin/check-instance.mjs`, import `PACKS` beside `checkInstance`, and after `const core = \`${units}/core\`;`:

```js
  // R20: each pack the instance took is a unit beside core. One this checker does not ship has
  // no types it could hold the instance to, so it is refused by name before anything is read.
  const packs = (manifest.packs ?? []).map((name) => {
    if (!PACKS[name]) die(`.companygraph/manifest.json takes the pack ${name}, and this checker ships ${Object.keys(PACKS).join(", ") || "none"}`);
    return { name, dir: `${units}/${name}` };
  });
  for (const rel of [MODEL, core, ...packs.map((p) => p.dir)])
    if (!existsSync(join(root, rel))) die(`${root} has no ${rel}/`);
```

replacing the existing `for (const rel of [MODEL, core])` line; walk each `p.dir` after `walk(core)`; pass `packs` to `checkInstance`; and add the packs to the report's `against` line: `` `${MODEL}/ against ${[core, ...packs.map((p) => p.dir)].join(", ")}/ at core …` ``.

Add to `verify/check-script.test.mjs`, following the file's existing pattern for an instance on disk in a temporary folder:

```js
test("a manifest that takes a pack this checker does not ship is refused by name", () => {
  // Build the instance the way the file's other tests do, then set manifest.packs = ["cooking"].
  const { status, stderr } = runCheckOn(instanceWith({ packs: ["cooking"] }));
  assert.equal(status, 1);
  assert.match(stderr, /takes the pack cooking, and this checker ships software/);
});
```

`runCheckOn` and `instanceWith` stand for the helpers the file already has for running `bin/check-instance.mjs` on a temporary instance; use those, and give the manifest-writing one a `packs` option.

- [ ] **Step 7: Run everything, and init a real instance**

Run: `npm run test:plan && npm run test:cli && node --test verify/check-script.test.mjs && npm run verify`. Expected: PASS.

Then, in a scratch folder outside the repository:

```bash
node <path to this worktree>/bin/companygraph.mjs init scratch-software --pack software --agent claude --name "Scratch"
ls scratch-software/meta/software
node <path to this worktree>/bin/check-instance.mjs scratch-software
```

Expected: the five schemas, the manifest and the README are listed, and the check passes with the report naming `meta/core, meta/software/`.

Then an instance made before the pack, as beacon's will be:

```bash
node <path to this worktree>/bin/companygraph.mjs init scratch-later --agent claude --name "Later"
node <path to this worktree>/bin/companygraph.mjs upgrade scratch-later --pack software
node <path to this worktree>/bin/check-instance.mjs scratch-later
```

Expected: the upgrade prints `packs: software, vendored beside core`, the manifest lists `"packs": ["software"]`, and the check passes naming `meta/core, meta/software/`. Delete both scratch folders.

- [ ] **Step 8: Commit**

```bash
git add lib/instance-files.mjs lib/plan.mjs bin/companygraph.mjs bin/check-instance.mjs verify/plan.test.mjs verify/check-script.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The CLI vendors a pack, checks it and moves it

init --pack software vendors the pack beside core under the units folder, hashes its files into the manifest and lists it in packs, which the manifest has carried empty since the tooling spec reserved it. check walks every pack the manifest lists and refuses one this checker does not ship by name, before reading anything. upgrade moves a pack's files with core's, and an edited pack schema stops it as an edited core schema does. upgrade --pack software takes the pack into an instance made without it, so a company can start before the pack ships.

A pack is released with its core, so --pack takes this release's packs and is refused beside --core.

Verified: npm run test:plan, test:cli, node --test verify/check-script.test.mjs and npm run verify pass, and init --pack software in one scratch folder, and init followed by upgrade --pack software in another, produced instances that check passed.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 7: The README says a pack ships

**Files:**

- Modify: `README.md` (the `## Packs` section and the layout line reserving `meta/<pack>/`)
- Modify: `AGENTS.md` (the sentence that `packs/` does not exist until a pack does)

- [ ] **Step 1: Rewrite the Packs section**

Replace the section's "No pack ships yet. The mechanism arrives when a second kind of company asks for it." with:

```markdown
One pack ships: `software`, for a company that builds software, with five types from domain-driven design. Its schemas are in `packs/software/`, and its README lists the sources each type draws on and where the pack departs from them. An instance takes it with `companygraph init --pack software`, or later with `companygraph upgrade --pack software`; it is vendored beside core under the units folder, listed in the manifest's `packs`, checked by `check` and moved by `upgrade`. Core is level 0 and a pack level 1: every edge from a pack to core is optional, and no core type names a pack's (R20).
```

In `AGENTS.md`, the sentence saying `packs/` does not exist until a pack does becomes: `\`packs/\` holds one folder per pack, released with core under one tag.`

- [ ] **Step 2: Check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && npm run verify`. Expected: PASS.

```bash
git add README.md AGENTS.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The README says a pack ships

The Packs section said no pack ships and the mechanism would arrive when a second kind of company asked. One has, and the section now names the software pack, where its schemas and sources are, how an instance takes it, and the rule that keeps core from naming it.

Verified: conventions-format, conventions-check and npm run verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

## After the owner's merge

The release is the owner's: its number, its tag and its notes, which name R20, the `software` pack, `init --pack` and `upgrade --pack`. Then, each in work of its own: `companygraph/mental-model` takes the pack and describes the parser's resolution as its first bounded context; the MCP server and the Obsidian plugin pass pack schemas under `<unit>/<type>-schema.md` and read addresses through `typeOfAddress`, and the spec's proof that they need nothing more is one `list_types` against Task 4's fixture, which lists the five pack types; beacon files its feature request and brings its model to its own instance.
