# Rules, risks and controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gains the types `rule`, `risk` and `control`, the example instance carries one of each so the checks and the parser meet them, the README lists them, and the MCP server's `list_rules` and `describe_rule` say they describe the vocabulary's conventions, not a company's rules.

**Architecture:** The three types are Markdown schemas in `core/` written in existing vocabulary: enums, `ref` and `array of ref` fields, and an `## Applies to` table in the `Type`, `Entity`, `Owner` shape `## Bears on` already has. The parser and the checker read them with no new code beyond three rows in the checker's `TYPES` table. Nothing is owned, so each is a flat folder. The MCP server change is two tool descriptions and their contract text, in its own repository.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-09-30-rules-risks-and-controls-design.md` (this branch, brought up to date on October 2, 2026).

## Global Constraints

- Type ids `rule`, `risk`, `control`; folders `model/rules/*.md`, `model/risks/*.md`, `model/controls/*.md`; owned by nothing; schema files `core/rule-schema.md`, `core/risk-schema.md`, `core/control-schema.md`. Filenames follow R12's default, the slug of the H1.
- Rule fields, exactly: `modality` (Yes, enum `must`, `must not` or `may`), `protects` (No, array of ref → value), `serves` (No, array of ref → strategic-objective), `motivated-by` (No, array of ref → risk). Sections: `## Why` (Yes), `## Applies to` (No, table), `## References` (No, table).
- Risk fields, exactly: `owner` (Yes, ref → role), `threatens` (No, array of ref → strategic-objective). Sections: `## Cause` (Yes), `## Consequence` (Yes), `## References` (No, table).
- Control fields, exactly: `kind` (Yes, enum `preventive`, `detective` or `corrective`), `mode` (Yes, enum `automated` or `manual`), `mitigates` (No, array of ref → risk), `enforces` (No, array of ref → rule), `performed-by` (No, ref → role). Sections: `## How it is carried out` (Yes), `## Applies to` (No, table), `## References` (No, table).
- `## Applies to` columns, exactly: `Type` (Yes, string: `role`, `process` or `phase`), `Entity` (Yes, `ref → by Type in Owner`), `Owner` (No, string: the process that owns a phase, blank otherwise).
- Every relation is written once, from the more specific page: no field on a rule names a control, and no field on a risk names a rule or a control (spec, "Each relation once").
- R20 holds: the three schemas name only core's types.
- Every schema carries core's `id`, `source` and `source-id` rows, copied verbatim from `core/decision-schema.md`, and its own `id` in frontmatter from `node bin/companygraph.mjs id`.
- Every enum token and every borrowed term names its source in its description (SBVR, BMM, ISO 31000, COSO, ISO/IEC 27002).
- American English (R14). Commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers. No numbers that move in any prose (no count of types).
- No version bump and no tag in this plan: the release, its number and its notes are the owner's.
- Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`.
- Since #197, `lib/` carries JSDoc types: a changed row shape or signature changes its JSDoc, and `npm run typecheck` and `npm run build:check` pass with `types/` rebuilt before each commit. This plan adds rows of the existing `TypeEntry` shape and should rewrite nothing under `types/`.

## Review Focus

- An `## Applies to` row naming a phase with a blank `Owner`: an author expects it to fail as an owned type without its owner, not to resolve against the first process holding a phase of that name. Task 1 tests it.
- A control that names neither a risk it mitigates nor a rule it enforces: it passes the mechanical checks, as the spec says, because the grammar declares each field on its own; the writing rule refuses it. Task 1 pins that it passes, so a future change that starts failing it is a decision, not an accident.
- A modality written as `must-not` or `Must not`: the enum is `must not` with a space; an author expects the checker to name the permitted values. Task 1 tests it.
- A `rules/`, `risks/` or `controls/` folder the checks never read: every file would pass because none was looked at. Task 2 Step 1 shows verify failing on a stray file in each before the real ones are written.
- An instance that takes none of the three types: it must pass exactly as before, with the three folders absent. Task 1's suite run over every existing fixture proves it.

---

### Task 1: The three schemas and the checker's rows

**Files:**

- Create: `core/rule-schema.md`, `core/risk-schema.md`, `core/control-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, after the `decision` row)
- Create: `verify/rule-risk-control.test.mjs`
- Modify: `package.json` (`test:instance-checks` script)

**Interfaces:**

- Produces: three `TYPES` rows, `{ type: "rule", folder: "rules" }`, `{ type: "risk", folder: "risks" }` and `{ type: "control", folder: "controls" }`; the three schemas below, which Task 2 writes against.

- [ ] **Step 1: Write the failing test** — `verify/rule-risk-control.test.mjs`

```js
// The rule, risk and control types, held by the instance checks through their real schemas: the
// three files are read from disk so the test fails if a schema and the checks part. The schemas
// they reference are bare, as decision.test.mjs has them, because only these three types' own
// failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, owner, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []), "## File Location", "", `\`${location}\``, ""];
const bare = (type, owner, location) => [...head(type, owner, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const page = (fm, name, statement, sections) => ["---", ...fm, "---", "", `# ${name}`, "", `> ${statement}`, "",
  ...sections.flatMap(([heading, body]) => [`## ${heading}`, "", ...body, ""])].join("\n");
const appliesTo = (rows) => ["Applies to", ["| Type | Entity | Owner |", "| --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`)]];

const RULE_FM = ["source: Local", "modality: must", "protects:", "  - Craftsmanship", "serves:", "  - Invoices are right", "motivated-by:", "  - An unreviewed change reaches customers"];
const RISK_FM = ["source: Local", "owner: Reviewer", "threatens:", "  - Invoices are right"];
const CONTROL_FM = ["source: Local", "kind: preventive", "mode: automated", "mitigates:", "  - An unreviewed change reaches customers", "enforces:", "  - A change is reviewed before it ships"];

const tree = ({ rule = RULE_FM, ruleSections, risk = RISK_FM, control = CONTROL_FM, controlSections } = {}) => new Map([
  ["meta/core/rule-schema.md", real("rule")],
  ["meta/core/risk-schema.md", real("risk")],
  ["meta/core/control-schema.md", real("control")],
  ["meta/core/source-schema.md", bare("source", null, "model/sources/*.md")],
  ["meta/core/role-schema.md", bare("role", null, "model/roles/*.md")],
  ["meta/core/value-schema.md", bare("value", null, "model/values/*.md")],
  ["meta/core/strategic-objective-schema.md", bare("strategic-objective", null, "model/strategic-objectives/*.md")],
  ["meta/core/process-schema.md", bare("process", null, "model/processes/<process>/<process>.md")],
  ["meta/core/phase-schema.md", bare("phase", "process", "model/processes/<process>/phases/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/roles/reviewer.md", "# Reviewer\n\n> The seat.\n"],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/strategic-objectives/invoices-are-right.md", "# Invoices are right\n\n> An objective.\n"],
  ["model/processes/delivery/delivery.md", "# Delivery\n\n> A process.\n"],
  ["model/processes/delivery/phases/release.md", "# Release\n\n> A phase.\n"],
  ["model/rules/a-change-is-reviewed-before-it-ships.md", page(rule, "A change is reviewed before it ships",
    "A change reaches customers only after a second person has read it.",
    ruleSections ?? [["Why", ["Prose."]], appliesTo([["role", "Reviewer", ""], ["phase", "Release", "Delivery"]])])],
  ["model/risks/an-unreviewed-change-reaches-customers.md", page(risk, "An unreviewed change reaches customers",
    "A change nobody else read goes out.", [["Cause", ["Prose."]], ["Consequence", ["Prose."]]])],
  ["model/controls/main-requires-a-review.md", page(control, "Main requires a review",
    "The default branch refuses a merge without an approving review.",
    controlSections ?? [["How it is carried out", ["Prose."]], appliesTo([["process", "Delivery", ""]])])],
]);
const failuresOf = (opts, ...words) =>
  checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures
    .filter((f) => /\/(rules|risks|controls)\//.test(f) && words.every((w) => f.includes(w)));

test("a rule, a risk and a control with every required field and section, each naming the others, pass", () => {
  assert.deepEqual(failuresOf(), []);
});

test("a control that names neither a risk nor a rule passes the mechanical checks; the writing rule refuses it", () => {
  assert.deepEqual(failuresOf({ control: ["source: Local", "kind: detective", "mode: manual", "performed-by: Reviewer"] }), []);
});

test("a rule with no Applies to rows applies everywhere and passes", () => {
  assert.deepEqual(failuresOf({ ruleSections: [["Why", ["Prose."]]] }), []);
});

test("a modality outside must, must not and may fails naming the permitted values", () => {
  const rule = RULE_FM.map((l) => l.replace("modality: must", "modality: must-not"));
  assert.equal(failuresOf({ rule }, "must-not").length, 1);
});

test("a missing modality fails", () => {
  assert.equal(failuresOf({ rule: RULE_FM.filter((l) => !l.startsWith("modality")) }, "no `modality`").length, 1);
});

test("a motivated-by naming no risk fails", () => {
  const rule = RULE_FM.map((l) => l.replace("  - An unreviewed change reaches customers", "  - A typo in an invoice"));
  assert.equal(failuresOf({ rule }, "\"A typo in an invoice\"").length, 1);
});

test("a rule without Why fails", () => {
  assert.equal(failuresOf({ ruleSections: [appliesTo([["role", "Reviewer", ""]])] }, "no `## Why`").length, 1);
});

test("an Applies to row naming a phase with no Owner fails as an owned type without its owner", () => {
  assert.equal(failuresOf({ ruleSections: [["Why", ["Prose."]], appliesTo([["phase", "Release", ""]])] }, "Release").length, 1);
});

test("an Applies to row whose Type names no type fails", () => {
  assert.equal(failuresOf({ ruleSections: [["Why", ["Prose."]], appliesTo([["team", "Platform", ""]])] }, "team").length, 1);
});

test("a risk with no owner fails", () => {
  assert.equal(failuresOf({ risk: RISK_FM.filter((l) => !l.startsWith("owner")) }, "no `owner`").length, 1);
});

test("a risk whose owner names no role fails", () => {
  const risk = RISK_FM.map((l) => l.replace("owner: Reviewer", "owner: Mira Halvorsen"));
  assert.equal(failuresOf({ risk }, "\"Mira Halvorsen\"").length, 1);
});

test("a control kind outside preventive, detective and corrective fails", () => {
  const control = CONTROL_FM.map((l) => l.replace("kind: preventive", "kind: directive"));
  assert.equal(failuresOf({ control }, "directive").length, 1);
});

test("a control mode outside automated and manual fails", () => {
  const control = CONTROL_FM.map((l) => l.replace("mode: automated", "mode: hybrid"));
  assert.equal(failuresOf({ control }, "hybrid").length, 1);
});

test("an enforces naming no rule fails", () => {
  const control = CONTROL_FM.map((l) => l.replace("  - A change is reviewed before it ships", "  - Ship on Fridays"));
  assert.equal(failuresOf({ control }, "\"Ship on Fridays\"").length, 1);
});

test("a control without How it is carried out fails", () => {
  assert.equal(failuresOf({ controlSections: [appliesTo([["process", "Delivery", ""]])] }, "no `## How it is carried out`").length, 1);
});
```

The breakage tests assert the file and the offending value or section rather than a check's whole sentence, since those sentences are core's and not this plan's. If a failure's wording differs (for example the enum message quotes the value differently), adjust the asserted words to what the checker actually says, keeping one failure per test.

- [ ] **Step 2: Add the test to the script and run it to see it fail**

In `package.json`, append ` verify/rule-risk-control.test.mjs` to the end of the `test:instance-checks` command.

Run: `node --test verify/rule-risk-control.test.mjs`. Expected: FAIL, `core/rule-schema.md` does not exist (ENOENT).

- [ ] **Step 3: Write `core/rule-schema.md`**

Run `node bin/companygraph.mjs id` three times, one id for each schema in Steps 3 to 5.

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Rule Schema

> Required structure for rule files.

## File Location

`model/rules/*.md`

Nothing owns a rule and a rule owns nothing: a rule reaches across the seats, processes and phases it binds and belongs to none of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `modality` | Yes | enum | `must`, `must not` or `may`. What the statement does: obliges, forbids or permits (SBVR's obligation, prohibition and restricted permission). |
| `protects` | No | array of ref → value | The values the rule keeps from being broken, each the H1 of a file in `values/` |
| `serves` | No | array of ref → strategic-objective | The objectives the rule serves, each the H1 of a file in `strategic-objectives/` (BMM: a directive supports a goal) |
| `motivated-by` | No | array of ref → risk | The risks that are the reason for it, each the H1 of a file in `risks/` (BMM: a directive is motivated by a potential impact) |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Rule]` | Yes | The rule's name. Everything references the rule by this exact string. |
| `> [Statement]` | Yes | The rule itself, written so that it can be kept or broken |
| `## Why` | Yes | The reason for the rule, in a paragraph |
| `## Applies to` | No | Table. The seats the rule binds and the processes and phases it applies in; its columns are declared below. A rule with no rows applies everywhere. |
| `## References` | No | Table. The law, standard or document it complies with, or where it came from; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `role`, `process` or `phase` |
| `Entity` | Yes | ref → by Type in Owner | The seat, process or phase, by its canonical name |
| `Owner` | No | string | For a phase, the process that owns it, by its canonical name; blank otherwise |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a law, a standard, a policy |
| `URL` | Yes | string | Where it is |

## Purpose

A rule is a statement under the company's own authority that obliges, forbids or permits something (SBVR; BMM's directive). It answers "what must, must not or may happen here, and why?" for a person or an agent about to act. It is for what reaches across: a refusal only one seat, one process or one phase makes stays in that page's `## What it never does`. Whether a machine or a person holds a change to the rule is read from the controls that enforce it, which name the rule; the rule names none of them.

## Writing rules

- The statement says one thing, as the people it binds would say it, and could be kept or broken. A statement nobody could tell was kept or broken is advice and is not written (SBVR: no business rule is an advice).
- A rule that no control enforces is still a rule, and one a person or a reviewer holds a change against.
- A refusal only one seat, one process or one phase makes stays in that page's `## What it never does`. A rule is for what binds more than one of them, or what a control checks, and where a rule replaces a refusal restated on several pages, those restatements are removed.
- A value's "We never …" is the value's own boundary and stays; a rule may protect it.
- `motivated-by` names a risk only where the rule exists because of it.
- Names and prose are American English (R14).
````

- [ ] **Step 4: Write `core/risk-schema.md`**

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Risk Schema

> Required structure for risk files.

## File Location

`model/risks/*.md`

Nothing owns a risk and a risk owns nothing: what could go wrong reaches across the company, and its owner is a seat it names, not a folder it sits in.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for the risk, the H1 of a file in `roles/` |
| `threatens` | No | array of ref → strategic-objective | The objectives it would affect, each the H1 of a file in `strategic-objectives/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Risk]` | Yes | The risk's name, stated as the event. Everything references the risk by this exact string. |
| `> [What could happen]` | Yes | What could happen, in one sentence |
| `## Cause` | Yes | What would bring it about (ISO 31000: risk source) |
| `## Consequence` | Yes | What it would do to the company's objectives (ISO 31000: consequence) |
| `## References` | No | Table. The register or tracker that keeps its current rating and its history; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a risk register, a tracker |
| `URL` | Yes | string | Where it is |

## Purpose

A risk is what could go wrong: an event that would affect the company's objectives, from a cause, with a consequence (ISO 31000's risk source, event and consequence; BMM's risk as a potential impact of loss). It answers "what are we guarding against, and who answers for it?" A downside only: an opportunity is what an objective or a strategy already pursues. The controls that mitigate it and the rules it motivates name it; it names none of them.

## Writing rules

- A risk is written as an event, not as a feeling or a gap: "a secret reaches a transcript", not "security".
- It carries no likelihood, impact or score. Those are assessments that move, and the model holds how things are made and not their state (R17), as a KPI holds its definition and none of its values. Where the company rates its risks, `## References` points at where it does.
- `owner` names the seat, never the person, as a role is person-neutral.
- Names and prose are American English (R14).
````

- [ ] **Step 5: Write `core/control-schema.md`**

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Control Schema

> Required structure for control files.

## File Location

`model/controls/*.md`

Nothing owns a control and a control owns nothing: it reaches across the processes and phases it applies in and names the risks and rules it answers to.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `kind` | Yes | enum | `preventive`, `detective` or `corrective`. Whether it stops the event, finds it, or repairs what it did (COSO; ISO/IEC 27002 control type). |
| `mode` | Yes | enum | `automated` or `manual`. Whether a machine or a person carries it out (COSO). |
| `mitigates` | No | array of ref → risk | The risks it makes less likely or less harmful, each the H1 of a file in `risks/` |
| `enforces` | No | array of ref → rule | The rules it holds a change or an action to, each the H1 of a file in `rules/` |
| `performed-by` | No | ref → role | The seat that carries it out, for a manual control, the H1 of a file in `roles/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Control]` | Yes | The control's name. Everything references the control by this exact string. |
| `> [What it does]` | Yes | What the control does, in one sentence |
| `## How it is carried out` | Yes | What does the work and when, as a reader could check |
| `## Applies to` | No | Table. The seats, processes and phases it applies in; its columns are declared below. |
| `## References` | No | Table. The hook, the workflow, the command or the checklist, and where its results are kept; its columns are declared below. |

`## Applies to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `role`, `process` or `phase` |
| `Entity` | Yes | ref → by Type in Owner | The seat, process or phase, by its canonical name |
| `Owner` | No | string | For a phase, the process that owns it, by its canonical name; blank otherwise |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of thing, a hook, a workflow, a checklist, a test report |
| `URL` | Yes | string | Where it is |

## Purpose

A control is what the company does, or has a machine do, so that a risk is less likely or less harmful, or a rule is kept (ISO 31000: a measure that maintains or modifies risk; COSO's control activities). It answers "what actually stops this, finds it, or repairs it, and is it a machine or a person?" The control is the entity: a gate's criteria and a check's code stay where they are, and the control says in prose how it is carried out and points at the file that does it. Its effectiveness is a KPI whose `measures` names it, never a number on this page.

## Writing rules

- A control names at least one risk it mitigates or one rule it enforces. The grammar declares each field on its own, so this rule is the agent pass's to hold.
- `## How it is carried out` says what does the work and when, as a reader could check: "the seat check, run by the commit hook and again by the instance check on every pull request, refuses a commit whose seat the named phase does not list". The hook, the workflow or the command it names goes in `## References`.
- A gate is a control where the phase's gate is one: the control names the phase in `## Applies to`, and the gate's criteria stay the phase's bullets.
- `performed-by` names a seat for a manual control, never a person; an automated control names none.
- Names and prose are American English (R14).
````

- [ ] **Step 6: Add the three rows**

In `lib/checks.mjs`, directly after the `decision` row of `TYPES`:

```js
  // A rule, a risk and a control each reach across seats, processes and phases and belong to
  // none of them, so nothing owns any of the three and each is a flat folder.
  { type: "rule", folder: "rules" },
  { type: "risk", folder: "risks" },
  { type: "control", folder: "controls" },
```

- [ ] **Step 7: Run the new test and every suite**

Run: `node --test verify/rule-risk-control.test.mjs`. Expected: PASS. Then `npm run verify && npm run test:instance-checks && npm run test:instance && npm run test:rules && npm run test:plan && npm run test:cli && npm run typecheck && npm run build:check`. Expected: PASS everywhere. `npm run verify` holds the three schemas to R9's shape and R20, so a schema typo fails there naming the file. If an existing test counts the core's types or lists them, update it to include the three and say so in the report.

- [ ] **Step 8: Commit**

```bash
git add core/rule-schema.md core/risk-schema.md core/control-schema.md lib/checks.mjs verify/rule-risk-control.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
Core gains rule, risk and control

Much of what a company knows is rules, and the risks and controls they come with, and core had no type for any of them: a rule that held across seats was restated on each page that refused it, and nothing said where it was checked. Three schemas now hold them, written in existing vocabulary: a rule obliges, forbids or permits and says why, a risk is an event with a cause, a consequence and an owner, and a control mitigates a risk, enforces a rule, or both, and says how it is carried out. Each relation is written once, from the more specific page, and an Applies to table names the seats, processes and phases in the shape Bears on already has. Nothing owns any of the three, so the checker's TYPES gains three flat rows.

Verified: node --test verify/rule-risk-control.test.mjs passes, having failed first; npm run verify, test:instance-checks, test:instance, test:rules, test:plan, test:cli, typecheck and build:check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

### Task 2: The example carries a rule, a risk and a control

**Files:**

- Create: `example/model/rules/a-change-is-reviewed-before-it-ships.md`
- Create: `example/model/risks/an-unreviewed-change-reaches-customers.md`
- Create: `example/model/controls/main-requires-a-review.md`
- Modify: `example/model/README.md` (the type list and the tree, where it lists decisions)

**Interfaces:**

- Consumes: the three schemas and rows from Task 1; the example's existing entities `Craftsmanship` (value), `Support stops explaining invoices` (strategic objective), `Reviewer` and `Backend Engineer` (roles), `Delivery` (process) and its phase `Release`, and the source `Local`. Read each file's H1 before writing, and use the exact strings.

- [ ] **Step 1: Show the folders are read**

Create `example/model/rules/stray.md` holding only `# Stray\n` (no frontmatter, no statement), run `npm run verify`, and see it fail naming `rules/stray.md`. Do the same for `risks/` and `controls/`, one at a time. Delete each stray file after its failure is seen.

- [ ] **Step 2: Write the three pages**

Each opens with an id from `node bin/companygraph.mjs id` and `source: Local`.

`example/model/risks/an-unreviewed-change-reaches-customers.md`:

```markdown
---
id: <id>
source: Local
owner: Reviewer
threatens:
  - Support stops explaining invoices
---

# An unreviewed change reaches customers

> A change that nobody but its author read goes out and alters what customers are billed.

## Cause

A merge to the default branch that no second person approved, under time pressure or because the change looked small.

## Consequence

Invoices go out wrong, and support explains them again, which is the opposite of what the objective asks for.
```

`example/model/rules/a-change-is-reviewed-before-it-ships.md`:

```markdown
---
id: <id>
source: Local
modality: must
protects:
  - Craftsmanship
serves:
  - Support stops explaining invoices
motivated-by:
  - An unreviewed change reaches customers
---

# A change is reviewed before it ships

> A change reaches the default branch only after a second person has read it and approved it.

## Why

A billing change is cheap to read and expensive to get wrong, and the author is the person least able to see what they missed.

## Applies to

| Type | Entity | Owner |
| --- | --- | --- |
| role | Reviewer | |
| phase | Release | Delivery |
```

`example/model/controls/main-requires-a-review.md`:

```markdown
---
id: <id>
source: Local
kind: preventive
mode: automated
mitigates:
  - An unreviewed change reaches customers
enforces:
  - A change is reviewed before it ships
---

# Main requires a review

> The default branch refuses a merge that carries no approving review from someone other than its author.

## How it is carried out

A branch protection rule on the default branch requires one approving review before any pull request merges, and dismisses an approval when new commits are pushed after it.

## Applies to

| Type | Entity | Owner |
| --- | --- | --- |
| process | Delivery | |
```

If the example's H1s differ from the names above (for example the phase is not `Release` or is owned by a differently named process), use the real names and say so in the report.

- [ ] **Step 3: List them in the example's README**

In `example/model/README.md`, add `rules/`, `risks/` and `controls/` wherever the README lists the example's types and its tree, in the same form the decisions entries have.

- [ ] **Step 4: Run everything**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && sh conventions/conventions-check && sh conventions/conventions-format check`. Expected: PASS. `test:instance` parses the example, so the three pages' edges (control → rule, control → risk, rule → risk, rule → value, rule → objective, risk → objective, risk → role, and the Applies to rows) are drawn; read the parsed graph once (for example `node -e` over `parseInstance` as `verify/instance.test.mjs` calls it) and confirm the edges exist with their `via`.

- [ ] **Step 5: Commit**

```bash
git add example/model
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example carries a rule, a risk and a control

The example instance is where the checks and the parser meet every core type, and the three new ones had no page there. A risk that an unreviewed change reaches customers, owned by the reviewer, threatens the objective that support stops explaining invoices; a rule that a change is reviewed before it ships answers it, protects craftsmanship and binds the reviewer and the Release phase; a branch protection control enforces the rule and mitigates the risk. Each relation is written once, from the more specific page.

Verified: npm run verify failed naming a stray file in each new folder before the pages were written, and passes now; test:instance and test:instance-checks pass, and the parsed graph holds the control's, the rule's and the risk's edges; conventions-check and conventions-format check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

### Task 3: The README names the three types

**Files:**

- Modify: `README.md` (the `*-schema.md` block near the top, and the sentence that says "`core/` is the list")

- [ ] **Step 1: Add the types**

In the `*-schema.md` block, add `rule`, `risk` and `control` after the decision types, in the block's own form. In the sentence that lists core's types after "`core/` is the list:", add `rule, risk and control` at the end, keeping the sentence's own punctuation (no serial comma). If the README names the design's roadmap of types still ahead and lists rule, risk or control there, remove them from what is ahead.

- [ ] **Step 2: Check and commit**

Run: `sh conventions/conventions-check && sh conventions/conventions-format check && npm run verify`. Expected: PASS.

```bash
git add README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The README lists rule, risk and control

The README's two lists of core's types are where a reader learns what core holds, and they ended at the decision types. Both now name rule, risk and control, and the roadmap no longer lists them as ahead.

Verified: conventions-check, conventions-format check and npm run verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

### Task 4: The MCP server's rule tools say they describe conventions

This task is in `companygraph/mcp-server`, in its own worktree `mcp-server-conventions-are-not-a-companys-rules` on a branch of that name, and its own pull request. It does not depend on Tasks 1 to 3 being merged: it changes text only.

**Files:**

- Modify: the files that define the `list_rules` and `describe_rule` tools' descriptions (find them with `grep -rn "list_rules\|describe_rule" lib/ bin/`)
- Modify: `docs/INTERFACE.md` (the two tools' entries), and whatever `npm run interface` regenerates

- [ ] **Step 1: Say what the tools describe**

Each tool's description says it lists, or describes, the vocabulary's conventions (R0 onwards, as `core/CONVENTIONS.md` numbers them) that the model is held to, and that a company's own rules are entities of type `rule`, listed with `list_entities` and read with `get_entity`. The tool names and their answers do not change.

- [ ] **Step 2: Test**

If the repository has a test that pins tool descriptions or the interface document, update it to the new text; otherwise add one assertion that `list_rules`'s description contains "convention" and names `list_entities`. Run the repository's full test suite and `npm run interface` (expected: no diff after the regenerated files are committed), and both conventions checks.

- [ ] **Step 3: Commit and open the pull request**

Commit as `Implementer <implementer@companygraph.io>` with the trailers above, a prose body that says why (core now has a `rule` type, and an agent asking for a company's rules must not be handed the vocabulary's conventions), and a `Verified:` line. Open the pull request and stop; the merge and any release are the owner's.

## After the owner's merge

The release is the owner's: a core minor (the three schemas make every vendored copy stale) and a package minor, with `instance-check.yml`'s `ref:` moved with `package.json`, and notes that name the three types and that an instance may leave them empty. Then, each in work of its own and on the owner's word: the family's instances take the release and move restated "never" bullets into rules page by page (the spec's Out of scope); beacon is told on Slack that `rule` exists; and the next content re-pin of any site or MCP host takes the current meta-model and mcp-server together, as the owner's rule of October 2 requires.
