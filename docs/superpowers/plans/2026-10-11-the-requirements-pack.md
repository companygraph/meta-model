# The requirements pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance can take the `requirements` pack with `init --pack requirements` or `upgrade --pack requirements`, write use cases and requirements against two schemas vendored beside core, and be held by four checks: step and extension labels are tokens unique on their page, `includes` never runs in a circle, what a use case includes stands at its level or below, and an extension's label begins with a step's. The example takes the pack with two use cases and one requirement.

**Architecture:** A pack is a unit beside core: `PACKS` in `lib/checks.mjs` states its types, and the CLI, `bin/check-instance.mjs` and `verify/check.mjs` loop over it, so a fourth pack is a `PACKS` entry and a `packs/requirements/` folder. Two existing checks stretch without naming a type: `labels` takes a list of places as well as one, and `acyclic` follows a list field as well as a scalar. Two keys are new, `descends` and `branches`, each a check that reads its fields from the type's row. Everything a single page says, the enums, every reference, `ref?` staying a string, a required table with no rows, is held by the grammar already.

**Tech Stack:** Node ES modules with no dependencies, `node --test`, TypeScript only for the JSDoc declarations in `types/`, git.

**Spec:** `docs/superpowers/specs/2026-10-11-the-requirements-pack-design.md`

This plan covers meta-model only. An instance taking the pack, and any instance moving use cases it keeps elsewhere into the pack's type, follow the release in work of their own.

## Global Constraints

- The pack's name is `requirements`. Its folder in the repository is `packs/requirements/`, in an instance `<units>/requirements/`, and a manifest lists it as `"packs": ["requirements"]` beside any other.
- Two types, exactly: `use-case` at `use-cases` and `requirement` at `requirements`. Neither is owned; neither owns anything.
- `use-case` fields, exactly, in this order: `id` (Yes, string), `source` (Yes, `ref → source`), `source-id` (No, string), `level` (Yes, enum: `very high summary`, `summary`, `user goal`, `subfunction`, in that order), `scope` (No, enum: `organization`, `system`, `component`), `primary-actor` (Yes, `ref? → seat`), `features` (No, `array of ref → feature`), `includes` (No, `array of ref → use-case`).
- `use-case` sections, exactly: `# [Use case]` (Yes), `> [Goal]` (Yes), `## Stakeholders and interests` (Yes, Table: `Stakeholder` Yes `ref? → seat`, `Interest` Yes string), `## Preconditions` (No, Bulleted.), `## Trigger` (No), `## Main success scenario` (Yes, Table: `Step` Yes string, `Actor` Yes `ref? → seat`, `Action` Yes string), `## Extensions` (No, Table: `Step` Yes string, `Condition` Yes string, `Handling` Yes string), `## Minimal guarantees` (Yes, Bulleted.), `## Success guarantees` (Yes, Bulleted.), `## References` (No, Table: `What` Yes string, `URL` Yes string).
- `requirement` fields, exactly, in this order: `id` (Yes, string), `source` (Yes, `ref → source`), `source-id` (No, string), `kind` (Yes, enum: `functional`, `quality`, `constraint`), `modality` (Yes, enum: `must`, `should`, `may`), `follows` (No, `array of ref → rule`).
- `requirement` sections, exactly: `# [Requirement]` (Yes), `> [Statement]` (Yes), `## Why` (Yes), `## Fit criterion` (Yes), `## Applies to` (Yes, Table: `Type` Yes string, `Entity` Yes `ref → by Type`), `## References` (No, Table: `What` Yes string, `URL` Yes string).
- Every enum's tokens are written in the Description as R8 reads them: backticked, comma-separated, the last after `or`, then a period.
- `PACKS.requirements` ends this plan as exactly these two rows, built up over Tasks 1 to 5:

  ```js
  { type: "use-case", folder: "use-cases", labels: [{ section: "Main success scenario", column: "Step" }, { section: "Extensions", column: "Step" }], acyclic: "includes", descends: { field: "includes", by: "level" }, branches: { section: "Extensions", column: "Step", from: { section: "Main success scenario", column: "Step" } } },
  { type: "requirement", folder: "requirements" },
  ```

- No check names a type in its code; each reads its fields from the type's row and cites R16.
- No core schema changes; core's `TYPES` array is not edited. R20 holds: the pack's schemas name `source`, `seat`, `feature`, `product`, `rule` and `use-case` only, and nothing from another pack.
- The software pack's single-place `labels`, and `acyclic: "part-of"` in the organization and landscape packs, behave exactly as before: `npm run test:instance-checks` and `npm run test:ids` are the proof and run in every task that touches either check.
- Each schema id is a fresh UUID version 7 from `node bin/companygraph.mjs id`, lowercase. Every new example page gets one the same way; no id is copied.
- `packs/requirements/manifest.json` carries the same `version` as `core/manifest.json` at the time of the commit, read from that file, never typed from memory.
- Test fixtures and example content name no real company, product or person. Fixtures use the restaurant names given in Task 1. The example's fictional company is Beacon Systems; the pages and commit messages this plan writes do not name it.
- No version bump in this plan. The release, its number and its notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- `lib/` carries its types as JSDoc and `types/` holds the declarations built from it, committed. A task that changes `TypeEntry` runs `npm run typecheck`, then `npm run build`, and commits `types/` with it; `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in a worktree `../meta-model-the-requirements-pack-build` on a branch `the-requirements-pack-build`, made from `the-requirements-pack-plan`, which carries the spec and this plan.
- Every Markdown file written or edited passes `sh conventions/conventions-format` and `sh conventions/conventions-check` before it is committed.

## Review Focus

- A primary actor, a stakeholder or a step's actor that names no seat stays a string and fails nothing, while one that names a seat resolves: `Guest`, `Kitchen` and `Booking App` in the fixture pass beside `Host`, and a misspelled seat, `Hostess`, passes too, because `ref?` asks nothing of a value that names nothing. Pinned in Task 1.
- A use case included by two superordinates, a diamond, is no circle and passes; only a chain that returns to where it started fails, once, naming every page on it. Pinned in Task 3.
- A fault in `level` or `includes` that R8 or R4 already reports gives one finding, not a second from `descends`: a level off the list, and an include naming nothing, are each one failure. Pinned in Task 4.
- An extension label that is no token gives one finding, the label check's, not a second from `branches`; and a label repeated across the two tables fails once, as a repeat within one does. Pinned in Tasks 2 and 5.
- A label renamed in either table between two commits is caught by `labelChangesOf` under the section it stands in, and a software pack aggregate's relabel is reported exactly as before. Pinned in Task 2.

---

### Task 1: The pack ships its two schemas, and a small instance written in them passes

**Files:**

- Create: `packs/requirements/use-case-schema.md`
- Create: `packs/requirements/requirement-schema.md`
- Create: `packs/requirements/manifest.json`
- Create: `packs/requirements/README.md`
- Modify: `lib/checks.mjs` (`PACKS`: add `requirements`, with the two bare rows only in this task)
- Create: `verify/requirements.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/requirements.test.mjs` directly after `verify/landscape.test.mjs`)

**Interfaces:**

- Produces: `PACKS.requirements` as `[{ type: "use-case", folder: "use-cases" }, { type: "requirement", folder: "requirements" }]`, which Tasks 2 to 5 extend; in `verify/requirements.test.mjs` the fixture builder `tree(change)`, and `failures(files)`, `edit(path, from, to)`, `only(f, ...words)`, `U` and `R`, which Tasks 2 to 5 append to.

- [ ] **Step 1: Write the failing test**

```js
// verify/requirements.test.mjs
// The requirements pack through its real schemas: packs/requirements/ is read from disk, so the
// test fails if the schemas and the checks part. The core types a use case and a requirement
// name are bare, as landscape.test.mjs has them, since the test is about the pack's edges and
// not their targets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const pack = (n) => fs.readFileSync(new URL(`../packs/requirements/${n}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const PACKS = [{ name: "requirements", dir: "meta/requirements" }];
const U = "model/use-cases";
const R = "model/requirements";
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}` : "";
const page = (h1, tagline) => `# ${h1}\n\n> ${tagline}\n`;
const table = (cols, rows) => `| ${cols.join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const bullets = (items) => `${items.map((i) => `- ${i}`).join("\n")}\n`;
const useCase = ({ level, scope, actor, features = [], includes = [], h1, tagline, stakeholders, steps, extensions = [], minimal, success }) => [
  "---", "source: Local", `level: ${level}`, ...(scope ? [`scope: ${scope}`] : []), `primary-actor: ${actor}`,
  ...(features.length ? [list("features", features)] : []), ...(includes.length ? [list("includes", includes)] : []),
  "---", "", `# ${h1}`, "", `> ${tagline}`, "",
  "## Stakeholders and interests", "", table(["Stakeholder", "Interest"], stakeholders),
  "## Main success scenario", "", table(["Step", "Actor", "Action"], steps),
  ...(extensions.length ? ["## Extensions", "", table(["Step", "Condition", "Handling"], extensions)] : []),
  "## Minimal guarantees", "", bullets(minimal),
  "## Success guarantees", "", bullets(success),
].join("\n");
const requirement = ({ kind, modality, follows = [], h1, statement, applies }) => [
  "---", "source: Local", `kind: ${kind}`, `modality: ${modality}`, ...(follows.length ? [list("follows", follows)] : []),
  "---", "", `# ${h1}`, "", `> ${statement}`, "",
  "## Why", "", "A guest who waits for an answer leaves before it comes.", "",
  "## Fit criterion", "", "Over a week of bookings, the answer a guest sees is measured from their confirming to its showing.", "",
  "## Applies to", "", table(["Type", "Entity"], applies),
].join("\n");

const tree = (change = (m) => m) => change(new Map([
  ["meta/requirements/use-case-schema.md", pack("use-case")],
  ["meta/requirements/requirement-schema.md", pack("requirement")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/feature-schema.md", bare("feature", "model/features/*.md")],
  ["meta/core/product-schema.md", bare("product", "model/products/*.md")],
  ["meta/core/seat-schema.md", bare("seat", "model/seats/*.md")],
  ["meta/core/rule-schema.md", bare("rule", "model/rules/*.md")],
  ["model/sources/local.md", page("Local", "Here.")],
  ["model/features/table-booking.md", page("Table booking", "A guest books a table for a time.")],
  ["model/products/booking-app.md", page("Booking App", "Where a guest books.")],
  ["model/seats/host.md", page("Host", "Seats the guests.")],
  ["model/rules/guest-data-stays-in-the-region.md", page("Guest data stays in the region", "No guest's data leaves the region it was given in.")],
  [`${U}/run-an-evening-of-service.md`, useCase({
    level: "summary", scope: "organization", actor: "Host", includes: ["Book a table"],
    h1: "Run an evening of service", tagline: "The host fills the room for an evening, and every guest who booked finds a table.",
    stakeholders: [["Host", "Every booked guest is seated near their time"], ["Kitchen", "Covers arrive spread over the evening"]],
    steps: [["1", "Host", "Opens the evening's tables for booking"], ["2", "Guest", "Books a table, as Book a table says"], ["3", "Host", "Seats each guest at the booked table"]],
    extensions: [["2a", "No table is free at the time asked", "The guest is offered the nearest free time"]],
    minimal: ["No table is promised twice."], success: ["Every guest who booked was seated."],
  })],
  [`${U}/book-a-table.md`, useCase({
    level: "user goal", scope: "system", actor: "Guest", features: ["Table booking"], includes: ["Find a free table"],
    h1: "Book a table", tagline: "A guest books a table for a time and leaves with a confirmation.",
    stakeholders: [["Guest", "A confirmed table, and no booking they did not ask for"], ["Host", "A booking that names the guest, the time and the party size"]],
    steps: [["1", "Guest", "Asks for a table for a party size and a time"], ["2", "Booking App", "Finds a free table, as Find a free table says"], ["3", "Guest", "Confirms the table"], ["4", "Booking App", "Confirms the booking to the guest"]],
    extensions: [["2a", "No table is free at that time", "The app offers the nearest free times, and the guest picks one or leaves"], ["3a", "The guest does not confirm within ten minutes", "The table is released"]],
    minimal: ["No table is held for a guest who did not confirm."], success: ["The guest holds a booking the host can see."],
  })],
  [`${U}/find-a-free-table.md`, useCase({
    level: "subfunction", actor: "Guest", h1: "Find a free table", tagline: "The tables free for a party size at a time are found.",
    stakeholders: [["Guest", "Only tables that are really free"]],
    steps: [["1", "Booking App", "Reads the tables free at the time asked for the party size"]],
    minimal: ["Nothing is booked."], success: ["The guest sees the free tables."],
  })],
  [`${R}/booking-confirmed-within-two-seconds.md`, requirement({
    kind: "quality", modality: "must", h1: "Booking confirmed within two seconds",
    statement: "A guest who confirms a table sees the booking confirmed within two seconds.",
    applies: [["use-case", "Book a table"], ["product", "Booking App"]],
  })],
  [`${R}/bookings-are-stored-in-the-region.md`, requirement({
    kind: "constraint", modality: "must", follows: ["Guest data stays in the region"], h1: "Bookings are stored in the region",
    statement: "A booking is stored only in the region the guest booked in.",
    applies: [["product", "Booking App"]],
  })],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));
const only = (f, ...words) => f.filter((x) => words.every((w) => x.includes(w)));

test("a small instance written in the pack passes, actors that are no seat and a requirement on a use case included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a primary actor or a stakeholder naming no seat stays a string and fails nothing", () => {
  const f = failures(tree((m) => {
    edit(`${U}/run-an-evening-of-service.md`, "primary-actor: Host", "primary-actor: Hostess")(m);
    edit(`${U}/book-a-table.md`, "| Host | A booking", "| Hostess | A booking")(m);
    return m;
  }));
  assert.deepEqual(f, []);
});

test("a level outside the four fails under R8", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: fish")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /find-a-free-table\.md.*fish.*\(R8\)/);
});

test("a scope outside the three fails under R8", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "scope: system", "scope: bounded-context")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /book-a-table\.md.*bounded-context.*\(R8\)/);
});

test("a modality and a kind outside their tokens each fail under R8", () => {
  const a = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "modality: must", "modality: shall")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /booking-confirmed-within-two-seconds\.md.*shall.*\(R8\)/);
  const b = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "kind: quality", "kind: non-functional")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /booking-confirmed-within-two-seconds\.md.*non-functional.*\(R8\)/);
});

test("a feature, an include and a followed rule that name nothing each fail as R4 alone", () => {
  const a = failures(tree(edit(`${U}/book-a-table.md`, "  - Table booking", "  - Table bookings")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /book-a-table\.md.*"Table bookings".*\(R4\)/);
  const b = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a table")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /book-a-table\.md.*"Find a table".*\(R4\)/);
  const c = failures(tree(edit(`${R}/bookings-are-stored-in-the-region.md`, "  - Guest data stays in the region", "  - Guest data stays home")));
  assert.equal(c.length, 1, c.join("\n"));
  assert.match(c[0], /bookings-are-stored-in-the-region\.md.*"Guest data stays home".*\(R4\)/);
});

test("an Applies to row naming nothing of its type, or a type no schema declares, fails as R4", () => {
  const a = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "| use-case | Book a table |", "| use-case | Book a room |")));
  assert.equal(only(a, "booking-confirmed-within-two-seconds.md", "Book a room", "(R4)").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "| product | Booking App |", "| screen | Booking App |")));
  assert.equal(only(b, "booking-confirmed-within-two-seconds.md", "screen", "(R4)").length, 1, b.join("\n"));
});

test("an Applies to with no rows, and a use case without its success guarantees, each fail once", () => {
  const a = failures(tree(edit(`${R}/bookings-are-stored-in-the-region.md`, "| product | Booking App |\n", "")));
  assert.equal(only(a, "bookings-are-stored-in-the-region.md", "Applies to").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${U}/find-a-free-table.md`, "## Success guarantees\n\n- The guest sees the free tables.\n", "")));
  assert.equal(only(b, "find-a-free-table.md", "Success guarantees").length, 1, b.join("\n"));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test verify/requirements.test.mjs`

Expected: FAIL, every test, with ENOENT reading `packs/requirements/use-case-schema.md`.

- [ ] **Step 3: Generate the two schema ids and read core's version**

Run: `node bin/companygraph.mjs id && node bin/companygraph.mjs id && node -p 'JSON.parse(require("fs").readFileSync("core/manifest.json","utf8")).version'`

The first id goes into the use case schema, the second into the requirement schema, the version into the manifest.

- [ ] **Step 4: Write the use case schema**

`packs/requirements/use-case-schema.md`:

```markdown
---
id: <the first id>
---

# Use Case Schema

> Required structure for use case files.

## File Location

`model/use-cases/*.md`

A use case owns nothing and nothing owns it, so it is a file. One use case may be called by several others, so the edge is written on the one that calls, in `includes`, and the called use case names none of its callers.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `level` | Yes | enum | `very high summary`, `summary`, `user goal` or `subfunction`. How high the goal stands against what a primary actor gets done in one sitting: well above it, above it, at it, or below it (Cockburn's goal levels, drawn as cloud, kite, waves at sea and fish). |
| `scope` | No | enum | `organization`, `system` or `component`. What the use case treats as the thing under design (Cockburn's design scope). |
| `primary-actor` | Yes | ref? → seat | Whoever has the goal: the H1 of a file in `seats/` where the company has the seat, otherwise the actor's name, which stays a string |
| `features` | No | array of ref → feature | The features the use case asks something of, each the H1 of a file in `features/` |
| `includes` | No | array of ref → use-case | The subordinate use cases its steps call, each the H1 of another file in `use-cases/` (UML include) |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Use case]` | Yes | The goal as a short active verb phrase. Everything references the use case by this exact string. |
| `> [Goal]` | Yes | One paragraph of what the primary actor wants and what they have when it is done |
| `## Stakeholders and interests` | Yes | Table. Every party with an interest in how the use case goes, and what each needs from it; its columns are declared below. |
| `## Preconditions` | No | Bulleted. What the system makes sure of before the use case may start, one item each |
| `## Trigger` | No | What starts the use case, which may be a time |
| `## Main success scenario` | Yes | Table. The steps from the trigger to the goal when nothing goes wrong, one row each, in order; its columns are declared below. |
| `## Extensions` | No | Table. Each condition under which a step goes another way, and what happens then; its columns are declared below. |
| `## Minimal guarantees` | Yes | Bulleted. What holds for every stakeholder however the use case ends, one item each |
| `## Success guarantees` | Yes | Bulleted. What holds when the goal is reached, one item each |
| `## References` | No | Table. What a reader can open to learn more about the use case; its columns are declared below. |

`## Stakeholders and interests` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Stakeholder` | Yes | ref? → seat | The party: the H1 of a file in `seats/` where it is a seat, otherwise its name, which stays a string |
| `Interest` | Yes | string | What the party needs from the use case, or needs protected while it runs |

`## Main success scenario` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Step` | Yes | string | The step's label, unique on the page, which an extension and a test cite: `1`, `2` |
| `Actor` | Yes | ref? → seat | Who acts in the step: the H1 of a file in `seats/` where it is a seat, otherwise its name, which stays a string |
| `Action` | Yes | string | What the actor does, in one sentence |

`## Extensions` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Step` | Yes | string | The label of the step it branches from and a letter: `2a` |
| `Condition` | Yes | string | What the system can detect that sends the step another way |
| `Handling` | Yes | string | What happens then, and where the scenario goes on |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a recording of the flow |
| `URL` | Yes | string | Where it is |

## Purpose

A use case is all the ways of using a system to achieve one goal for one actor (Cockburn and Jacobson), and it answers "who wants this, what do they get, who else has a stake, and what still holds when it goes wrong?" for whoever decides what a feature must do before anyone designs it. It is the problem side of a feature: core's feature says what someone can do, and the use case says what they want and what is guaranteed, at the level it names. It is not a design, which the software pack's feature design is, and not a requirement, which states one thing a product is held to and may apply to a use case.

## Writing rules

- The H1 is the primary actor's goal as a short active verb phrase, `Download an invoice`, and never a screen or a feature's name.
- The tagline says what the primary actor wants and what they have when it is done, in their words.
- `level` is `user goal` where the primary actor gets the goal done in one sitting and goes away content; a goal that gathers several of those is a summary, and one that no actor would stop after is a subfunction.
- `primary-actor` names a seat where the company has one for whoever has the goal, and otherwise the actor as the company calls them: `Customer`, `Payment provider`.
- `## Stakeholders and interests` names every party whose interest the use case must protect, the primary actor among them, and each Interest says what the party needs, not what it does.
- Each row of `## Main success scenario` is one actor doing one thing that moves toward the goal; a condition is an extension, never a step.
- `Action`, in a step that calls a subordinate use case, names that use case by its H1, and every use case in `includes` is named so in some step.
- `Condition`, in `## Extensions`, is something the system can detect, not something an actor feels.
- `## Minimal guarantees` hold however the use case ends, an extension that gives up included, and `## Success guarantees` only when the goal is reached.
- `Action` names an aggregate, an invariant or an event, where a step needs one, in words: they are another pack's types, and the page draws no edge to them.
- The page writes names and prose in American English (R14).
```

- [ ] **Step 5: Write the requirement schema**

`packs/requirements/requirement-schema.md`:

```markdown
---
id: <the second id>
---

# Requirement Schema

> Required structure for requirement files.

## File Location

`model/requirements/*.md`

A requirement owns nothing and nothing owns it, so it is a file. What it is about is its `## Applies to`, a feature, a product or a use case, so a requirement that holds for a whole product is written once and not on each feature.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, the label a specification gives it: `FR-011`. Absent when the source has none, as a repository does not. |
| `kind` | Yes | enum | `functional`, `quality` or `constraint`. A result or behavior a function of the product provides; a quality concern no functional requirement covers, how fast, how safe, how available; or a limit on the solution beyond what the other two need (IREB CPRE glossary). |
| `modality` | Yes | enum | `must`, `should` or `may`. Binding; binding unless a reason to depart is understood and stated; or permitted (RFC 2119). |
| `follows` | No | array of ref → rule | The company's rules this requirement carries into the product, each the H1 of a file in `rules/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Requirement]` | Yes | The requirement's short name. Everything references it, and a test or a code comment cites it, by this exact string. |
| `> [Statement]` | Yes | The requirement itself: one thing a product could be shown to meet or to miss |
| `## Why` | Yes | The need behind the statement, in a paragraph |
| `## Fit criterion` | Yes | How anyone can tell the requirement is met, measured where it can be (Volere) |
| `## Applies to` | Yes | Table. The features, products and use cases the requirement is about, at least one; its columns are declared below. |
| `## References` | No | Table. The specification it was drawn from, the standard behind it, the test that proves it; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `feature`, `product` or `use-case` |
| `Entity` | Yes | ref → by Type | The feature, product or use case, by its canonical name |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a standard, a test |
| `URL` | Yes | string | Where it is |

## Purpose

A requirement is one statement of what a product must do or be, written so that it can be shown met or missed (ISO/IEC/IEEE 29148), and it answers "what exactly is this held to, why, and how would anyone tell?" for whoever builds, tests or accepts it. It is a page so that a test, a code comment or a later specification can cite it by a name and an id no other requirement shares. It is not a rule, which binds the company's own conduct; a requirement that exists because of a rule names it in `follows`.

## Writing rules

- The tagline says one thing, so that a product could be shown to meet it or to miss it; a statement that joins two with "and" is two requirements.
- The tagline says what, not how: it names no component, library or vendor unless `kind` is `constraint`.
- `modality` is the strength the tagline states, and a tagline that says "must not" carries `must`.
- `## Fit criterion` names what is observed and what counts as met, with the measure and the conditions it is taken under where it is a quantity; "works well" is no criterion.
- `kind` is `quality` where `## Fit criterion` measures how well the product does something rather than whether it does it.
- `## Applies to` names the narrowest subject that carries the requirement: a feature where one feature does, a product where every feature of it does.
- `## Applies to` names a feature, a product or a use case in each row; the grammar reads any type in the Type column, so this is the agent pass's to hold.
- `follows` names a rule only where the requirement exists because of it.
- `## Why` says the need, not the solution.
- `source-id`, on a page drawn from a specification, is the label the specification gives it, so a test that cites the label still finds the page.
- The page holds no priority, status, release or date; each moves, and a References row says where they are kept.
- The page writes names and prose in American English (R14).
```

- [ ] **Step 6: Write the manifest and the README**

`packs/requirements/manifest.json`, with the version read in Step 3:

```json
{ "name": "requirements", "version": "<core's version>" }
```

`packs/requirements/README.md`:

```markdown
# CompanyGraph — the requirements pack

> Vocabulary for a company that says what its products must do before it builds them: the goals people bring to a system, and the statements a product is held to. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack requirements`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `use-case` | All the ways of using a system to achieve one goal for one actor, fully dressed: its stakeholders and their interests, its steps and extensions, and what is guaranteed | nothing |
| `requirement` | One statement a product is held to, functional, quality or constraint, with the measure that shows it met | nothing |

A use case names the features it asks something of and the subordinate use cases its steps call; its primary actor, its stakeholders and the actor of each step are seats where the company has them and names otherwise. A requirement applies to features, products or use cases, and names the company rules it carries into the product. The software pack's feature design refines the same features, so a company taking both packs reads the trace from a use case and its requirements, through the feature, to the designs that build it, and neither pack names the other.

## Sources

| What | URL |
| --- | --- |
| Alistair Cockburn and Ivar Jacobson, Use-Case Foundation | https://alistaircockburn.com/Use%20Case%20Foundation.pdf |
| Alistair Cockburn, Basic use case template | https://www.cs.otago.ac.nz/coursework/cosc461/uctempla.htm |
| Alistair Cockburn, Structuring use cases with goals | https://cs.otago.ac.nz/coursework/cosc461/usecases.htm |
| OMG, UML 2.5.1, clause 18 | https://www.omg.org/spec/UML/2.5.1/PDF |
| Ivar Jacobson, Ian Spence and Kurt Bittner, Use-Case 2.0 | https://www.ivarjacobson.com/publications/white-papers/use-case-20-e-book |
| ISO/IEC/IEEE 29148:2018 | https://www.iso.org/standard/72089.html |
| IREB, CPRE glossary | https://cockpit-v1.ireb.org/media/pages/downloads/cpre-glossary/510f672cfd-1760005471/ireb_cpre_glossary_en_2.2.pdf |
| Volere, requirement snow card | https://www.volere.org/wp-content/uploads/2018/12/snowcard.pdf |
| RFC 2119, key words for requirement levels | https://www.rfc-editor.org/rfc/rfc2119 |
| GitHub spec-kit, specification template | https://github.com/github/spec-kit/blob/main/templates/spec-template.md |

## Where it departs from its sources

- A requirement's modality is RFC 2119's `must`, `should` and `may`, not core's rule's `must`, `must not` and `may`: a requirement has a should, and must not is a negated must written in the statement.
- Cockburn's minimal and success guarantees are two bulleted sections under his own two headings, not one table with a kind column.
- Design scope drops Cockburn's black-box and white-box split; the steps show how much of the inside a scenario reaches.
- Goal levels are Cockburn's words, not his icons, and his fifth level, too low, is left out, since his advice for a goal that low is not to write it.
- A step's actor resolves, and the subordinate use case it calls is drawn from `includes` and named in the step's Action, where Cockburn underlines the step.
- A requirement carries no priority, customer satisfaction, conflicts or history, which Volere's card does; each moves or judges one requirement against another.
- A measurable success criterion of the spec-kit kind is a requirement, of kind `quality` where it measures a quality, with its measure as the fit criterion.

## Left for later

Cockburn's technology and data variations; secondary actors as a field; extend as a relation between use cases; user stories and use-case slices as types, which are backlog items and move; goals in KAOS's or iStar's sense; a stakeholder type beyond the seat; SysML's derive, satisfy and verify; a requirement's originator.
```

Before committing, confirm each URL in `## Sources` answers: `for u in $(grep -o 'https://[^ |]*' packs/requirements/README.md); do curl -s -o /dev/null -w "%{http_code} $u\n" -L "$u"; done`. Expected: every line beginning `200`. iso.org may answer `403` to a script while serving a browser; that row stays. Any other line that is not `200` is replaced by the publisher's page that does answer, found by searching its site, and the row's `What` is reworded to name that page.

- [ ] **Step 7: Register the pack**

In `lib/checks.mjs`, in `PACKS`, after the `landscape` entry's closing `],`, add:

```js
  requirements: [
    // A use case is called by several others, so it is a file and the edge is written on the
    // one that calls; a requirement applies to features, products and use cases and belongs to
    // none of them.
    { type: "use-case", folder: "use-cases" },
    { type: "requirement", folder: "requirements" },
  ],
```

- [ ] **Step 8: Register the test**

In `package.json`, in `test:instance-checks`, insert `verify/requirements.test.mjs` directly after `verify/landscape.test.mjs`.

- [ ] **Step 9: Run the test to verify it passes, and the neighbors still do**

Run: `node --test verify/requirements.test.mjs && npm run test:instance-checks && npm run test:rules && npm run test:judge && npm run verify`

Expected: PASS. `test:judge` proves every writing rule opens with its subject; `npm run verify` proves both schemas have R9's shape, R20 holds, and the manifest carries core's version. If `test:judge` fails on a rule, reword its opening; the subjects it accepts are a declared field, column or section, `The H1`, `The tagline` and `The page`, after at most a short lead-in. If a base-instance test fails on a `## Applies to` row naming `use-case`, the `ref → by Type` resolution is reading core's types alone; that is a defect in the vocabulary handed to the check, and the fix is to read the type from `vocabularyOf`, never to special-case the pack.

- [ ] **Step 10: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add packs/requirements lib/checks.mjs verify/requirements.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The requirements pack ships its two types

A fourth pack, requirements, with two types: a use case in Cockburn's fully dressed form, its goal level, scope, primary actor, stakeholders and interests, steps, extensions and guarantees, and a requirement as one statement in IREB's three kinds with an RFC 2119 modality, a fit criterion and what it applies to. Actors and stakeholders resolve to seats where they are one and stay names otherwise. Both meet core at the feature, and nothing in core names either.

Verified: node --test verify/requirements.test.mjs, npm run test:instance-checks, test:rules, test:judge and verify pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 2: A page carries labels in more than one table

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc for `labels`; a module-level `labelPlacesOf`; the check named `a label is a token, and no two on one page are the same`; `labelChangesOf`; `PACKS.requirements`)
- Modify: `types/` (rebuilt)
- Modify: `verify/requirements.test.mjs` (four tests appended)
- Modify: `verify/change-checks.test.mjs` (one test appended in the Labels section)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `only`, `U` from Task 1.
- Produces: `labels` accepting `LabelPlace | LabelPlace[]`, where `LabelPlace` is `{ section: string, column?: string, heading?: boolean }`; `labelPlacesOf(labels)` returning `LabelPlace[]`; `PACKS.requirements[0].labels`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/requirements.test.mjs`:

```js
test("a step label repeated in the main success scenario fails, naming the page and the label", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 4 | Booking App |", "| 3 | Booking App |")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "3" labels two items under ## Main success scenario.*\(R16\)$/);
});

test("an extension label repeated fails under its own section", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 2a | The guest")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "2a" labels two items under ## Extensions/);
});

test("a label repeated across the two tables fails once, since a label is unique on its page", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 | The guest")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "3" labels two items under ## Extensions/);
});

test("an extension label that is no token fails once, as no label", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /book-a-table\.md: "3 a" under ## Extensions is no label; a label is letters, digits and hyphens \(R16\)$/);
});
```

Append to `verify/change-checks.test.mjs`, at the end of the Labels section (after the last test whose name begins `a label`):

```js
test("a use case's labels are held in both its tables, each under its own section", () => {
  const UC = "model/use-cases/book-a-table.md";
  const useCase = (steps, extensions) => `---\nsource: Local\nlevel: user goal\nprimary-actor: Guest\n---\n\n# Book a table\n\n> A table.\n\n## Main success scenario\n\n| Step | Actor | Action |\n| --- | --- | --- |\n${steps.map(([l, t]) => `| ${l} | Guest | ${t} |\n`).join("")}\n## Extensions\n\n| Step | Condition | Handling |\n| --- | --- | --- |\n${extensions.map(([l, t]) => `| ${l} | ${t} | Leaves |\n`).join("")}`;
  const types = [...TYPES, ...PACKS.requirements];
  const was = useCase([["1", "Asks"], ["2", "Confirms"]], [["2a", "No table is free"]]);
  const f = labelChangesOf([change(was, useCase([["1", "Asks"], ["2", "Confirms"]], [["2b", "No table is free"]]), UC)], "main", { types });
  assert.deepEqual(f, [`${UC}: "2b" under ## Extensions carries what "2a" carried at main, and "2a" is gone; a label stays with its item, and a new item takes a new label (R16)`]);
  const g = labelChangesOf([change(was, useCase([["1", "Asks"], ["3", "Confirms"]], [["2a", "No table is free"]]), UC)], "main", { types });
  assert.deepEqual(g, [`${UC}: "3" under ## Main success scenario carries what "2" carried at main, and "2" is gone; a label stays with its item, and a new item takes a new label (R16)`]);
});
```

`change(before, after, path)` is the helper the Labels section's other tests already call; read its definition near the top of the file and use it as they do.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/requirements.test.mjs verify/change-checks.test.mjs`

Expected: the four new tests in `requirements.test.mjs` FAIL, since the use case's row carries no `labels`; the new test in `change-checks.test.mjs` FAILS with an empty array.

- [ ] **Step 3: Declare the list form**

In `lib/checks.mjs`, in the JSDoc above `TypeEntry`, add a typedef directly before `@typedef {object} TypeEntry`'s comment block:

```js
/**
 * One place a page carries labels cited from outside the model: the section, and the table
 * column or the `###` heading that holds them.
 * @typedef {{ section: string, column?: string, heading?: boolean }} LabelPlace
 */
```

and replace the `labels` property line with:

```js
 * @property {LabelPlace | LabelPlace[]} [labels] Where a page carries labels cited from outside the model: one place, or several, whose labels share the page and so are unique across all of them.
```

Directly after the definition of `LABEL` (`const LABEL = /^[A-Za-z0-9-]+$/;`), add:

```js
// The places a type's row says its pages carry labels: one written alone, or several written as
// a list. Read once here, so the label check and the change check agree on what a place is.
/** @param {LabelPlace | LabelPlace[] | undefined} labels @returns {LabelPlace[]} */
const labelPlacesOf = (labels) => (labels ? (Array.isArray(labels) ? labels : [labels]) : []);
```

- [ ] **Step 4: Read every place in the label check**

Replace the `run()` of the check named `a label is a token, and no two on one page are the same` with:

```js
    run() {
      for (const { type, labels } of TYPES) {
        const places = labelPlacesOf(labels);
        if (!places.length) continue;
        walkMd(EX, (child, text) => {
          if (typeOfFile(child) !== type) return;
          // One set per page across every place, so a label in two tables of one page is a repeat.
          /** @type {Set<string>} */
          const seen = new Set();
          for (const place of places) {
            const body = sectionsOf(text).get(place.section);
            if (body === undefined) continue;
            /** @type {string[]} */
            const found = [];
            if (place.column) {
              const table = tableOf(body);
              const at = table ? table.columns.indexOf(place.column) : -1;
              if (!table || at === -1) continue;
              for (const row of table.rows) found.push(row[at] ?? "");
            } else {
              for (const line of body.split("\n")) {
                if (!line.startsWith("### ")) continue;
                const heading = line.slice(4).trim();
                const label = heading.match(/^([^:]+):\s+\S/)?.[1];
                if (label === undefined) {
                  fail(`${child}: "${heading}" under ## ${place.section} opens with no label; a heading there is "<Label>: <title>" (R16)`);
                  continue;
                }
                found.push(label);
              }
            }
            for (const label of found) {
              if (!LABEL.test(label)) fail(`${child}: "${label}" under ## ${place.section} is no label; a label is letters, digits and hyphens (R16)`);
              else if (seen.has(label)) fail(`${child}: "${label}" labels two items under ## ${place.section}; a label names one, so what cites it finds it (R16)`);
              seen.add(label);
            }
          }
        });
      }
    },
```

Extend the check's comment with one sentence: "A row may name several places, and a label is unique across all of them, so an extension and a step never share one."

- [ ] **Step 5: Read every place in `labelChangesOf`**

In `labelChangesOf`, replace

```js
    const labels = types.find((t) => t.type === type)?.labels;
    if (!labels) continue;
    const { after } = change;
```

with

```js
    const { after } = change;
    for (const labels of labelPlacesOf(types.find((t) => t.type === type)?.labels)) {
```

and close that `for` with one `}` directly before the closing `}` of the `for (const change of changes)` loop, indenting the body by two spaces. Its JSDoc does not change, and the messages already name `labels.section`.

- [ ] **Step 6: Give the pack its labels**

In `PACKS.requirements`, the use case's row becomes:

```js
    // A step and an extension are cited by their labels from tests and from each other, so each
    // is a token and none is used twice on the page, across both tables.
    { type: "use-case", folder: "use-cases", labels: [{ section: "Main success scenario", column: "Step" }, { section: "Extensions", column: "Step" }] },
```

- [ ] **Step 7: Run the tests, the type build and the neighbors**

Run: `node --test verify/requirements.test.mjs && npm run test:instance-checks && npm run test:ids && npm run typecheck && npm run build && npm run build:check && npm run test:cli`

Expected: PASS. `test:ids` runs `change-checks.test.mjs`, where the software pack's relabel, swap and reuse tests prove the single-place form unchanged; `test:cli` proves `bin/companygraph.mjs`, which reads `t.labels` as a flag, still finds the governed types. `git status --short types/` shows the rebuilt declaration carrying `LabelPlace`.

- [ ] **Step 8: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add lib/checks.mjs types verify/requirements.test.mjs verify/change-checks.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A page carries labels in more than one table

A type's row may name several places its pages carry labels, and a label is then unique across all of them. The use case names two, its steps and its extensions, which tests and extensions cite; a label repeated in either table, or across them, fails once, and a relabel between commits is caught under the section it stands in. A row naming one place reads as before.

Verified: node --test verify/requirements.test.mjs, npm run test:instance-checks, test:ids, typecheck, build, build:check and test:cli pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 3: A chain of a list field never returns to where it starts

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc for `acyclic`; the check named `a chain of one type never returns to where it starts`; `PACKS.requirements`)
- Modify: `types/` (rebuilt)
- Modify: `verify/requirements.test.mjs` (three tests appended)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `only`, `U` from Task 1; `PACKS.requirements` from Task 2.
- Produces: `acyclic` reading a list field as well as a scalar; `PACKS.requirements[0].acyclic === "includes"`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/requirements.test.mjs`:

```js
test("an includes circle of two fails once, naming both from the page whose path sorts first", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "primary-actor: Guest\n", "primary-actor: Guest\nincludes:\n  - Book a table\n")));
  const circle = only(f, "runs in a circle");
  assert.equal(circle.length, 1, f.join("\n"));
  assert.match(circle[0], /^model\/use-cases\/book-a-table\.md: `includes` runs in a circle, "Book a table" → "Find a free table" → "Book a table"; a line never returns to where it starts \(R16\)$/);
});

test("a use case that includes itself fails as a circle of one", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a free table\n  - Book a table")));
  assert.equal(only(f, "runs in a circle", "\"Book a table\" → \"Book a table\"").length, 1, f.join("\n"));
});

test("a use case included by two others is no circle and passes", () => {
  const f = failures(tree(edit(`${U}/run-an-evening-of-service.md`, "  - Book a table", "  - Book a table\n  - Find a free table")));
  assert.deepEqual(f, []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/requirements.test.mjs`

Expected: the first two new tests FAIL, since nothing yet follows `includes`; the third passes.

- [ ] **Step 3: Declare the list form**

In the `TypeEntry` JSDoc, replace the `acyclic` property line with:

```js
 * @property {string} [acyclic] A field naming entities of the page's own type, `ref → <type>` or `array of ref → <type>`, whose chain from any page never returns to a page already on it; an edge the type's `within` does not admit is that check's and is not followed.
```

- [ ] **Step 4: Follow every value in the cycle check**

In the check named `a chain of one type never returns to where it starts`, replace everything from the line `const next = new Map();` (with the `/** @type {Map<string, string | null>} */` above it) to the closing `}` of the `for (const { path } of pages)` loop that calls `fail(...)` with:

```js
        // Each page's successors: one for a scalar field, as many as a list names. An edge the
        // type's `within` does not admit is that check's, and the walk does not follow it.
        /** @type {Map<string, string[]>} */
        const next = new Map();
        for (const { path, text } of pages) {
          /** @type {string[]} */
          const to = [];
          for (const value of fieldValues(frontmatterOf(text), field)) {
            const found = entityNamed(path, t.type, t, value);
            if (!found) continue;
            const admitted = !inSet || (
              inSet(path, text) !== false
              && inSet(found.path, found.text) !== false
              && (!until || ended(frontmatterOf(text), until) || !ended(frontmatterOf(found.text), until))
            );
            if (admitted) to.push(found.path);
          }
          next.set(path, to);
        }
        const nameOf = new Map(pages.map((p) => [p.path, p.name ?? p.path]));
        // A depth-first walk from each page in path order. A step onto a page still open on the
        // walk closes a circle: it is said once, by its members, from the one whose path sorts
        // first, so the same circle reached from two pages is one finding, and a page that only
        // leads into a circle is not on it. Where each page names one, this is the chain the walk
        // followed before a list was read.
        /** @type {Set<string>} */
        const reported = new Set();
        /** @type {Map<string, "open" | "done">} */
        const state = new Map();
        /** @param {string} at @param {string[]} stack */
        const visit = (at, stack) => {
          state.set(at, "open");
          stack.push(at);
          for (const to of next.get(at) ?? []) {
            if (state.get(to) === "open") {
              const circle = stack.slice(stack.indexOf(to));
              const key = [...circle].sort().join("\n");
              if (reported.has(key)) continue;
              reported.add(key);
              const first = [...circle].sort()[0];
              const from = circle.indexOf(first);
              const order = [...circle.slice(from), ...circle.slice(0, from), first];
              fail(`${first}: \`${field}\` runs in a circle, ${order.map((p) => `"${nameOf.get(p)}"`).join(" → ")}; a line never returns to where it starts (R16)`);
            } else if (!state.has(to)) visit(to, stack);
          }
          stack.pop();
          state.set(at, "done");
        };
        for (const { path } of pages) if (!state.has(path)) visit(path, []);
```

Keep the lines above it that define `field`, `pages`, `inSet` and `until` exactly as they are. `fieldValues` reads a scalar written on the key's line as a list of one, so `part-of` is read as before.

- [ ] **Step 5: Give the pack its circle check**

In `PACKS.requirements`, the use case's row gains `acyclic: "includes"` after `folder`, so it reads:

```js
    { type: "use-case", folder: "use-cases", labels: [{ section: "Main success scenario", column: "Step" }, { section: "Extensions", column: "Step" }], acyclic: "includes" },
```

Add to the comment above it: "A use case calls what is below it, so `includes` never runs in a circle."

- [ ] **Step 6: Run the tests, the type build and the neighbors**

Run: `node --test verify/requirements.test.mjs && npm run test:instance-checks && npm run typecheck && npm run build && npm run build:check`

Expected: PASS. `test:instance-checks` runs `organization.test.mjs` and `landscape.test.mjs`, whose `part-of` circle tests prove the scalar form says exactly what it said before, and whose `within` tests prove an edge a group's line does not admit is still not followed.

- [ ] **Step 7: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add lib/checks.mjs types verify/requirements.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A chain of a list field never returns to where it starts

The cycle check follows every name a list field holds, as it followed the one a scalar field holds, and says each circle once from the page whose path sorts first. A use case's includes is held to it: a use case that includes itself, or a pair that include each other, fails, and one called by two others passes. A group's and a system's part-of read as before.

Verified: node --test verify/requirements.test.mjs, npm run test:instance-checks, typecheck, build and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 4: What a use case includes stands at its level or below

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc gains `descends`; a new check directly after the cycle check; `PACKS.requirements`)
- Modify: `types/` (rebuilt)
- Modify: `verify/requirements.test.mjs` (four tests appended)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `only`, `U` from Task 1; `PACKS.requirements` from Task 3.
- Produces: the key `descends: { field: string, by: string }`; `PACKS.requirements[0].descends`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/requirements.test.mjs`:

```js
test("a use case that includes one above its own level fails once, naming both levels", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: summary")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/use-cases\/book-a-table\.md: `includes` names "Find a free table", whose `level` is `summary`, above this page's `user goal`; what a page names there stands at its `level` or below \(R16\)$/);
});

test("a use case that includes one at its own level passes", () => {
  assert.deepEqual(failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: user goal"))), []);
});

test("a level off the list is R8's alone and is not compared", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: very high")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("an include naming nothing is R4's alone and is not compared", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a table")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R4\)/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/requirements.test.mjs`

Expected: the first new test FAILS with an empty array; the other three pass.

- [ ] **Step 3: Declare the key**

In the `TypeEntry` JSDoc, directly after the `acyclic` property line, add:

```js
 * @property {{ field: string, by: string }} [descends] A field naming entities of the page's own type, each of which carries in the enum field `by` a token at the page's own place in its schema's list or after it, the list read from the top down. A value off the list is R8's, and a name that resolves to nothing R4's, and neither is compared.
```

- [ ] **Step 4: Write the check**

In `lib/checks.mjs`, directly after the check named `a chain of one type never returns to where it starts` (after its closing `},`), add:

```js
  {
    // A field that names pages of the page's own type, read against an enum whose tokens the
    // schema lists from the top down: what a page names stands at its own place in that list or
    // below it, so a summary use case calls a user goal and a subfunction calls no summary. A
    // token off the list, on either page, is R8's, and a name that resolves to nothing R4's, so
    // neither is compared. Stated on the type's row; no type is named.
    name: "what a page names in a field stands at its level or below",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.descends) continue;
        const { field, by } = t.descends;
        const tokens = enumTokensOf(fieldsOf(t.type).find((y) => y.field === by)?.description ?? "");
        if (!tokens.length) continue;
        for (const { path, text } of pagesOf(t.type)) {
          const own = fmScalar(frontmatterOf(text), by);
          const at = own ? tokens.indexOf(own) : -1;
          if (at < 0) continue;
          for (const value of fieldValues(frontmatterOf(text), field)) {
            const found = entityNamed(path, t.type, t, value);
            const theirs = found ? fmScalar(frontmatterOf(found.text), by) : null;
            const there = theirs ? tokens.indexOf(theirs) : -1;
            if (there >= 0 && there < at)
              fail(`${path}: \`${field}\` names "${value}", whose \`${by}\` is \`${theirs}\`, above this page's \`${own}\`; what a page names there stands at its \`${by}\` or below (R16)`);
          }
        }
      }
    },
  },
```

- [ ] **Step 5: Give the pack its entry**

In `PACKS.requirements`, the use case's row gains `descends: { field: "includes", by: "level" }` after `acyclic`. Add to the comment above it: "What it calls stands at its level or below, in the order `level` lists its tokens."

- [ ] **Step 6: Run the tests, the type build and the neighbors**

Run: `node --test verify/requirements.test.mjs && npm run test:instance-checks && npm run test:rules && npm run typecheck && npm run build && npm run build:check`

Expected: PASS. `test:rules` proves the new check cites a rule `core/CONVENTIONS.md` defines.

- [ ] **Step 7: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add lib/checks.mjs types verify/requirements.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
What a use case includes stands at its level or below

A new key on a type's row, descends, holds a field naming pages of the same type to an enum read from the top down: what a page names stands at its own place or below. The use case gives it includes and level, so a user goal may call a user goal or a subfunction and never a summary. A level off its list and an include naming nothing stay R8's and R4's alone.

Verified: node --test verify/requirements.test.mjs, npm run test:instance-checks, test:rules, typecheck, build and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 5: An extension branches from a step

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc gains `branches`; a new check directly after the label check; `PACKS.requirements`)
- Modify: `types/` (rebuilt)
- Modify: `verify/requirements.test.mjs` (three tests appended)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `only`, `U` from Task 1; `PACKS.requirements` from Task 4; the label check's `LABEL` from Task 2's neighborhood.
- Produces: the key `branches: { section: string, column: string, from: { section: string, column: string } }`; `PACKS.requirements[0].branches`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/requirements.test.mjs`:

```js
test("an extension whose label begins with no step fails once", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 7a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/use-cases\/book-a-table\.md: "7a" under ## Extensions begins with no Step of ## Main success scenario and a letter; a branch's label is the label it branches from and a letter, `2a` \(R16\)$/);
});

test("an extension labeled as a step with no letter fails, and a second branch of one step passes", () => {
  const f = failures(tree(edit(`${U}/run-an-evening-of-service.md`, "| 2a | No table", "| 7 | No table")));
  assert.equal(only(f, "begins with no Step").length, 1, f.join("\n"));
  const g = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 2b | The guest")));
  assert.deepEqual(g, []);
});

test("an extension label that is no token is the label check's alone", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /is no label/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/requirements.test.mjs`

Expected: the first two new tests FAIL; the third passes, as it did in Task 2.

- [ ] **Step 3: Declare the key**

In the `TypeEntry` JSDoc, directly after the `labels` property line, add:

```js
 * @property {{ section: string, column: string, from: { section: string, column: string } }} [branches] A table whose labels each begin with a label of the `from` table's column and go on with a lowercase letter: an extension `2a` branches from step `2`. A label that is no token is the label check's and is not read here.
```

- [ ] **Step 4: Write the check**

In `lib/checks.mjs`, directly after the check named `a label is a token, and no two on one page are the same` (after its closing `},`), add:

```js
  {
    // An extension branches from a step: its label is the step's label and a letter, so a reader
    // and a test find the step it alters. Both columns are read where the type's row says; a
    // label that is no token is the label check's and is not read here. Stated on the type's
    // row; no type is named.
    name: "a branch's label begins with the label it branches from",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.branches) continue;
        const { section, column, from } = t.branches;
        for (const { path, text } of pagesOf(t.type)) {
          const steps = cellsOf(text, from.section, from.column);
          for (const label of cellsOf(text, section, column)) {
            if (!LABEL.test(label)) continue;
            if (!steps.some((s) => label.startsWith(s) && /^[a-z]/.test(label.slice(s.length))))
              fail(`${path}: "${label}" under ## ${section} begins with no ${from.column} of ## ${from.section} and a letter; a branch's label is the label it branches from and a letter, \`2a\` (R16)`);
          }
        }
      }
    },
  },
```

- [ ] **Step 5: Give the pack its entry**

In `PACKS.requirements`, the use case's row gains `branches: { section: "Extensions", column: "Step", from: { section: "Main success scenario", column: "Step" } }` after `descends`, so the whole row is exactly the one Global Constraints gives. Add to the comment above it: "An extension's label is the label of the step it branches from and a letter."

- [ ] **Step 6: Run the tests, the type build and the neighbors**

Run: `node --test verify/requirements.test.mjs && npm run test:instance-checks && npm run test:rules && npm run typecheck && npm run build && npm run build:check`

Expected: PASS.

- [ ] **Step 7: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add lib/checks.mjs types verify/requirements.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An extension branches from a step

A new key on a type's row, branches, holds one table's labels to another's: each begins with a label there and goes on with a letter. The use case gives it its extensions and its main success scenario, so 2a branches from step 2 and an extension naming no step fails. A label that is no token stays the label check's alone.

Verified: node --test verify/requirements.test.mjs, npm run test:instance-checks, test:rules, typecheck, build and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 6: The example takes the pack

**Files:**

- Modify: `verify/example.mjs` (`EXAMPLE_PACKS`)
- Create: `example/model/use-cases/README.md`
- Create: `example/model/use-cases/download-an-invoice.md`
- Create: `example/model/use-cases/find-an-invoice.md`
- Create: `example/model/requirements/README.md`
- Create: `example/model/requirements/a-copy-is-the-invoice-as-issued.md`
- Modify: `example/model/README.md` (the paragraph listing the packs; the tree; the last paragraph)

**Interfaces:**

- Consumes: the two types and four checks from Tasks 1 to 5; the example's existing feature `Invoice download`, product `Invoice Page` and seat `Backend Engineer`.

- [ ] **Step 1: Declare the pack and see the example fail**

In `verify/example.mjs`:

```js
export const EXAMPLE_PACKS = ["organization", "landscape", "requirements"];
```

Run: `npm run verify`

Expected: FAIL or a report that `example/model/use-cases/` and `example/model/requirements/` are missing for types the example now takes; the next steps supply them.

- [ ] **Step 2: Generate three ids**

Run: `for i in 1 2 3; do node bin/companygraph.mjs id; done`

One per page, in the order below.

- [ ] **Step 3: Write the two folders' READMEs and the three pages**

`example/model/use-cases/README.md`:

```markdown
# Use cases

One file per use case, written against `meta/requirements/use-case-schema.md`.
```

`example/model/requirements/README.md`:

```markdown
# Requirements

One file per requirement, written against `meta/requirements/requirement-schema.md`.
```

`example/model/use-cases/download-an-invoice.md`:

```markdown
---
id: <first id>
source: Local
level: user goal
scope: system
primary-actor: Customer
features:
  - Invoice download
includes:
  - Find an invoice
---

# Download an invoice

> A customer keeps a copy of an invoice in their own books, exactly as it was issued.

## Stakeholders and interests

| Stakeholder | Interest |
| --- | --- |
| Customer | A copy that matches the invoice they were sent, line for line |
| Backend Engineer | A copy made from the issued invoice and never computed again |

## Trigger

The customer's bookkeeping asks for the invoice of a closed billing period.

## Main success scenario

| Step | Actor | Action |
| --- | --- | --- |
| 1 | Customer | Opens the Invoice Page and finds the invoice, as Find an invoice says |
| 2 | Customer | Asks for a copy |
| 3 | Invoice Page | Hands over the invoice as it was issued, every line and its explanation |

## Extensions

| Step | Condition | Handling |
| --- | --- | --- |
| 1a | The billing period is still open, so no invoice is issued yet | The page says when the period closes, and the customer comes back then |
| 3a | A credit note has been issued against the invoice since | The copy is still the invoice as issued, and the page names the credit note beside it |

## Minimal guarantees

- No copy differs from the invoice as it was issued.

## Success guarantees

- The customer holds a copy that matches what the Invoice Page showed on the day the invoice was issued.
```

`example/model/use-cases/find-an-invoice.md`:

```markdown
---
id: <second id>
source: Local
level: subfunction
primary-actor: Customer
---

# Find an invoice

> A customer has the invoice of the billing period they pick in front of them.

## Stakeholders and interests

| Stakeholder | Interest |
| --- | --- |
| Customer | Only their own invoices, and the one for the period they picked |

## Main success scenario

| Step | Actor | Action |
| --- | --- | --- |
| 1 | Customer | Picks a billing period |
| 2 | Invoice Page | Shows the invoice issued for that period |

## Minimal guarantees

- No customer sees another customer's invoice.

## Success guarantees

- The invoice of the period the customer picked is on the page.
```

`example/model/requirements/a-copy-is-the-invoice-as-issued.md`:

```markdown
---
id: <third id>
source: Local
kind: functional
modality: must
---

# A copy is the invoice as issued

> A downloaded invoice holds every line and its explanation exactly as they were on the day the invoice was issued.

## Why

A customer files the copy in their own books, and a copy that changes after the fact makes their books disagree with the company's without either side noticing.

## Fit criterion

An invoice downloaded on the day it is issued, and again after a credit note against it is issued, gives two copies identical to each other and to the invoice as issued.

## Applies to

| Type | Entity |
| --- | --- |
| feature | Invoice download |
| use-case | Download an invoice |
```

- [ ] **Step 4: Update the example's README**

In `example/model/README.md`:

- In the paragraph that lists the packs, `and the `landscape` pack, whose types are `system`, `system-kind`, `data-object` and `service`.` becomes `the `landscape` pack, whose types are `system`, `system-kind`, `data-object` and `service`, and the `requirements` pack, whose types are `use-case` and `requirement`.` Read the sentence first; where its wording has moved since this plan, make the same change to what is there.
- In the tree, directly after the line beginning `services/`, add, aligned with the lines around it:

```
use-cases/                       download-an-invoice.md, find-an-invoice.md
requirements/                    a-copy-is-the-invoice-as-issued.md
```

- In the last paragraph, `read beside `core/`, `packs/organization/` and `packs/landscape/`` becomes `read beside `core/`, `packs/organization/`, `packs/landscape/` and `packs/requirements/``.

- [ ] **Step 5: Run the example's checks and the parser over it**

Run: `npm run verify && npm run test:instance && npm run test:consumer`

Expected: PASS, with no `noted:` line about a use case or a requirement. If `npm run verify` reports `Invoice download`, `Invoice Page` or `Backend Engineer` as unresolved, the H1 in the example differs from the one written above; read the example's page and use its H1 exactly, never a near name. `Customer` and `Invoice Page` in a seat's place stay strings and are not findings.

- [ ] **Step 6: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check`

Then:

```bash
git add verify/example.mjs example/model/use-cases example/model/requirements example/model/README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example says what invoice download must give a customer

The example takes the requirements pack: a user-goal use case on the Invoice download feature, whose customer stays a name and whose engineer is a seat, including a subfunction that finds the invoice; and one requirement, that a copy is the invoice as issued, applying to both the feature and the use case. Every edge the pack draws to core but follows is proven on content.

Verified: npm run verify, test:instance and test:consumer pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 7: The CLI takes the pack, the README says four ship, and everything runs

**Files:**

- Modify: `verify/cli.test.mjs` (one test, directly after the test named `init --pack landscape vendors the pack, and the instance it writes passes check`)
- Modify: `README.md` (the paragraph beginning "The packs this release ships")

**Interfaces:**

- Consumes: everything above; produces nothing a later task reads.

- [ ] **Step 1: Write the test**

In `verify/cli.test.mjs`, directly after the test named `init --pack landscape vendors the pack, and the instance it writes passes check`, add:

```js
test("init --pack requirements vendors the pack, and the instance it writes passes check", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "requirements"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  assert.deepEqual(manifest.packs, ["requirements"]);
  for (const n of ["use-case", "requirement"]) assert.ok(fs.existsSync(path.join(root, "meta/requirements", `${n}-schema.md`)), n);
  assert.ok(fs.existsSync(path.join(root, "model/use-cases")), "the use case's folder is made");
  assert.ok(fs.existsSync(path.join(root, "model/requirements")), "the requirement's folder is made");
  assert.doesNotThrow(() => run(["check", root]));
});
```

- [ ] **Step 2: Run the test**

Run: `node --test --test-name-pattern "init --pack requirements" verify/cli.test.mjs`

Expected: PASS, since `init` and `check` read `PACKS` and name no pack themselves. If it fails on a folder, read `bin/companygraph.mjs` for where `--pack` folders are made from `PACKS` and confirm the `requirements` rows are reached, rather than adding a special case.

- [ ] **Step 3: Update the README**

In `README.md`, in the paragraph beginning "The packs this release ships are the folders under `packs/`.", the landscape sentence ends `and says what is dropped.2. Each pack's schemas`, with a stray `2.` left from an earlier edit. Replace `dropped.2. Each` with `dropped. Each`, and directly after `dropped.` insert a space and:

```
`requirements`, for a company that says what its products must do before it builds them, has two types: `use-case`, a goal brought to a system in Cockburn's fully dressed form, at a goal level, with its stakeholders and their interests, labeled steps and extensions, minimal and success guarantees, the features it asks something of and the use cases it `includes`; and `requirement`, one statement a product is held to, functional, quality or constraint, with an RFC 2119 `modality`, a `## Fit criterion`, the features, products or use cases it `## Applies to` and the rules it `follows`. Both meet core at the feature, which the software pack's feature design refines, so a company taking both reads the trace from what is wanted to how it is built.
```

- [ ] **Step 4: Run everything and commit**

Run: `npm run verify && npm run test:cli && npm run test:instance-checks && npm run test:instance && npm run test:ids && npm run test:rules && npm run test:judge && npm run test:consumer && npm run typecheck && npm run build:check && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: every suite PASS, both conventions scripts green. Check each command's exit code, not the tail of its output.

Then:

```bash
git add verify/cli.test.mjs README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The CLI takes the requirements pack, and the README says four ship

init --pack requirements vendors the two schemas, makes their folders and writes an instance that passes check, proved by a test beside the landscape pack's. The README's paragraph on packs names the fourth, and loses a stray 2. an earlier edit left after the landscape sentence.

Verified: npm run verify, test:cli, test:instance-checks, test:instance, test:ids, test:rules, test:judge, test:consumer, typecheck and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

- [ ] **Step 5: Hand over**

The branch is ready for review. The release is the owner's, a minor since no instance that does not take the pack changes. After it: the MCP server and the plugin read packs generically and need a pin move only; an instance that keeps use cases in feature designs or in sections of its own moves them into the pack's type in its own repository.
