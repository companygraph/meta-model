# Processors, processing activities and stored items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gains the types `data-processor`, `processing-activity` and `stored-item`, the example instance carries one of each so the checks and the parser meet them, and both READMEs list them.

**Architecture:** The three types are Markdown schemas in `core/` written in existing vocabulary: enums, `array`, `ref`, `ref?` and `array of ref` fields, and table sections with an enum column. The parser and the checker read them with no new code beyond three rows in the checker's `TYPES` table. Nothing owns any of them, so each is a flat folder. `countries` is the first plain `array` field in any core schema, so the tests pin R11 and R9 on it.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-10-03-processors-and-stored-items-design.md` (this branch).

## Global Constraints

- Type ids `data-processor`, `processing-activity`, `stored-item`; folders `model/data-processors/*.md`, `model/processing-activities/*.md`, `model/stored-items/*.md`; owned by nothing; schema files `core/data-processor-schema.md`, `core/processing-activity-schema.md`, `core/stored-item-schema.md`. Filenames follow R12's default, the slug of the H1.
- Data processor fields, exactly: `legal-name` (Yes, string), `countries` (Yes, array), `retention` (No, string), `sub-processor-authorization` (No, enum `general` or `specific`). Sections: `## Own purposes` (No, bulleted), `## Transfers` (No, table), `## References` (Yes, table).
- `## Transfers` columns, exactly: `Jurisdiction` (Yes, enum `eu`, `ch` or `uk`), `Safeguard` (Yes, string).
- Processing activity fields, exactly: `legal-basis` (Yes, enum `consent`, `contract`, `legal-obligation`, `vital-interests`, `public-task` or `legitimate-interests`), `retention` (No, string), `surfaces` (No, array of ref → surface). Sections: `## Data subjects` (Yes, bulleted), `## Personal data` (Yes, bulleted), `## Processors` (No, table), `## References` (No, table).
- `## Processors` columns, exactly: `Processor` (Yes, ref → data-processor), `Receives` (Yes, string).
- Stored item fields, exactly: `mechanism` (Yes, enum `local-storage`, `session-storage`, `cookie`, `indexeddb` or `cache`), `necessity` (Yes, enum `strictly-necessary` or `optional`), `duration` (No, string), `surfaces` (Yes, array of ref → surface), `set-by` (No, ref? → data-processor), `activity` (No, ref → processing-activity). Sections: `## References` (No, table). The H1 is the key exactly as the code writes it.
- Every relation is written once: no field on a processor names an activity or an item, and no core schema names any of the three (spec, "Edges written once"; R20).
- Every schema carries core's `id`, `source` and `source-id` rows, copied verbatim from `core/control-schema.md`, and its own `id` in frontmatter from `node bin/companygraph.mjs id`.
- Every borrowed term names its source in its description (GDPR, DSG, ePrivacy Directive, FMG, WHATWG).
- American English (R14). Commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers. No numbers that move in any prose (no count of types).
- No version bump and no tag in this plan: the release, its number and its notes are the owner's.
- Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`.
- `lib/` carries JSDoc types: this plan adds rows of the existing `TypeEntry` shape and should rewrite nothing under `types/`; `npm run typecheck` and `npm run build:check` pass before each commit.

## Review Focus

- A mechanism written as the code writes it, `localStorage` or `sessionStorage`: the enum is `local-storage` and `session-storage`, and an author expects the checker to refuse the camel case and name the permitted values, not to pass it. Task 1 tests it.
- A processor whose H1 is also a source's H1, as the example's `Google Workspace` is a source: R2 makes names unique within a type, so both pass, and an activity's `## Processors` row resolves to the processor and never to the source. Task 1 tests it.
- A `## Processors` row naming an entity of another type, such as a source: it fails as unresolvable under `data-processor`, and never resolves to the source by name. Task 1 tests it.
- `countries` written as a flow sequence `[CH, DE]` or present with no entries: the first plain `array` field in core, so R11 and R9's "a required list carries at least one entry" must reach it as they reach `array of ref`. Task 1 tests both.
- A key the slug changes, `__Host-session`: the H1 keeps it character for character, and the file is `host-session.md` by R12, which must pass. Task 1 tests it.

---

### Task 1: The three schemas and the checker's rows

**Files:**

- Create: `core/data-processor-schema.md`, `core/processing-activity-schema.md`, `core/stored-item-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, after the `control` row)
- Create: `verify/processors-and-stored-items.test.mjs`
- Modify: `package.json` (`test:instance-checks` script)

**Interfaces:**

- Produces: three `TYPES` rows, `{ type: "data-processor", folder: "data-processors" }`, `{ type: "processing-activity", folder: "processing-activities" }` and `{ type: "stored-item", folder: "stored-items" }`; the three schemas below, which Task 2 writes against.

- [ ] **Step 1: Write the failing test** — `verify/processors-and-stored-items.test.mjs`

```js
// The data-processor, processing-activity and stored-item types, held by the instance checks
// through their real schemas: the three files are read from disk so the test fails if a schema
// and the checks part. The schemas they reference are bare, as rule-risk-control.test.mjs has
// them, because only these three types' own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const bare = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  "## File Location", "", `\`${location}\``, "", "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const page = (fm, name, tagline, sections) => ["---", ...fm, "---", "", `# ${name}`, "", `> ${tagline}`, "",
  ...sections.flatMap(([heading, body]) => [`## ${heading}`, "", ...body, ""])].join("\n");
const table = (heading, columns, rows) => [heading,
  [`| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)]];

const PROC_FM = ["source: Local", "legal-name: Lantern Mail AG", "countries:", "  - CH", "  - DE",
  "retention: Thirty days after delivery", "sub-processor-authorization: general"];
const PROC_SECTIONS = [
  table("Transfers", ["Jurisdiction", "Safeguard"], [["eu", "Adequacy decision for Switzerland"]]),
  table("References", ["What", "URL"], [["Data processing agreement", "https://lantern.example/dpa"],
    ["Sub-processor list", "https://lantern.example/subprocessors"]]),
];
const ACT_FM = ["source: Local", "legal-basis: contract", "retention: Ten years after the invoice date", "surfaces:",
  "  - Beacon Systems website"];
const actSections = (processor) => [
  ["Data subjects", ["- Billing contacts at customers"]],
  ["Personal data", ["- Name and email address", "- Invoice amounts and lines"]],
  table("Processors", ["Processor", "Receives"], [[processor, "The email address and the invoice as a PDF"]]),
];
const ITEM_FM = ["source: Local", "mechanism: session-storage", "necessity: strictly-necessary", "surfaces:",
  "  - Beacon Systems website", "set-by: Lantern Mail", "activity: Invoice delivery"];

const tree = ({ proc = PROC_FM, procName = "Lantern Mail", procSections = PROC_SECTIONS, act = ACT_FM,
  actSections: actS, item = ITEM_FM, itemName = "invoice-draft" } = {}) => new Map([
  ["meta/core/data-processor-schema.md", real("data-processor")],
  ["meta/core/processing-activity-schema.md", real("processing-activity")],
  ["meta/core/stored-item-schema.md", real("stored-item")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/surface-schema.md", bare("surface", "model/surfaces/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/sources/google-workspace.md", "# Google Workspace\n\n> A directory.\n"],
  ["model/surfaces/beacon-systems-website.md", "# Beacon Systems website\n\n> The site.\n"],
  [`model/data-processors/${slug(procName)}.md`, page(proc, procName,
    "Sends the company's invoices to each customer's billing contact by email.", procSections)],
  ["model/processing-activities/invoice-delivery.md", page(act, "Invoice delivery",
    "Sending each customer the invoice its contract asks for.", actS ?? actSections(procName))],
  [`model/stored-items/${slug(itemName)}.md`, page(item, itemName,
    "The invoice a visitor is filling in, until the tab closes.", [])],
]);
const failuresOf = (opts, ...words) =>
  checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures
    .filter((f) => /\/(data-processors|processing-activities|stored-items)\//.test(f) && words.every((w) => f.includes(w)));
const swap = (lines, from, to) => lines.map((l) => (l === from ? to : l));

test("a processor, an activity naming it and a stored item naming both, with every required field and section, pass", () => {
  assert.deepEqual(failuresOf(), []);
});

test("a processor with no Transfers section passes", () => {
  assert.deepEqual(failuresOf({ procSections: [PROC_SECTIONS[1]] }), []);
});

test("a processor sharing its name with a source passes, and the activity's row resolves to the processor", () => {
  assert.deepEqual(failuresOf({ procName: "Google Workspace" }), []);
});

test("a processor without countries fails", () => {
  const proc = PROC_FM.filter((l) => !/^(countries:|  - )/.test(l));
  assert.equal(failuresOf({ proc }, "no `countries`").length, 1);
});

test("countries present with no entries fails as a required list carrying none", () => {
  const proc = PROC_FM.filter((l) => !l.startsWith("  - "));
  assert.equal(failuresOf({ proc }, "`countries`", "carries no items").length, 1);
});

test("countries written as a flow sequence fails under R11", () => {
  const proc = [...PROC_FM.filter((l) => !/^(countries:|  - )/.test(l)), "countries: [CH, DE]"];
  assert.equal(failuresOf({ proc }, "`countries`", "flow sequence").length, 1);
});

test("a sub-processor authorization outside general and specific fails", () => {
  const proc = swap(PROC_FM, "sub-processor-authorization: general", "sub-processor-authorization: prior");
  assert.equal(failuresOf({ proc }, "prior").length, 1);
});

test("a Transfers row whose jurisdiction is outside eu, ch and uk fails", () => {
  const procSections = [table("Transfers", ["Jurisdiction", "Safeguard"], [["switzerland", "Adequacy"]]), PROC_SECTIONS[1]];
  assert.equal(failuresOf({ procSections }, "switzerland").length, 1);
});

test("a processor without References fails", () => {
  assert.equal(failuresOf({ procSections: [PROC_SECTIONS[0]] }, "no `## References`").length, 1);
});

test("a processor whose References has no row fails", () => {
  const procSections = [PROC_SECTIONS[0], table("References", ["What", "URL"], [])];
  assert.equal(failuresOf({ procSections }, "## References", "has no row").length, 1);
});

test("a legal basis outside GDPR Art. 6(1)'s list fails", () => {
  const act = swap(ACT_FM, "legal-basis: contract", "legal-basis: legitimate-interest");
  assert.equal(failuresOf({ act }, "legitimate-interest").length, 1);
});

test("an activity without Data subjects fails", () => {
  const actSections = actSectionsWithout("Data subjects");
  assert.equal(failuresOf({ actSections }, "no `## Data subjects`").length, 1);
});

test("Data subjects written as prose, with no item, fails", () => {
  const actSections = [["Data subjects", ["Billing contacts at customers."]], ...actSectionsWithout("Data subjects")];
  assert.equal(failuresOf({ actSections }, "## Data subjects", "has no item").length, 1);
});

test("a Processors row naming no processor fails", () => {
  assert.equal(failuresOf({ actSections: actSections("Postbote") }, "\"Postbote\"").length, 1);
});

test("a Processors row naming a source fails, and does not resolve to the source", () => {
  assert.equal(failuresOf({ actSections: actSections("Local") }, "\"Local\"").length, 1);
});

test("a mechanism written as the code writes it fails, naming the value", () => {
  const item = swap(ITEM_FM, "mechanism: session-storage", "mechanism: sessionStorage");
  assert.equal(failuresOf({ item }, "sessionStorage").length, 1);
});

test("a stored item without necessity fails", () => {
  assert.equal(failuresOf({ item: ITEM_FM.filter((l) => !l.startsWith("necessity")) }, "no `necessity`").length, 1);
});

test("a stored item without surfaces fails", () => {
  const item = ITEM_FM.filter((l) => !/^(surfaces:|  - )/.test(l));
  assert.equal(failuresOf({ item }, "no `surfaces`").length, 1);
});

test("a stored item whose surfaces names no surface fails", () => {
  const item = swap(ITEM_FM, "  - Beacon Systems website", "  - Partner portal");
  assert.equal(failuresOf({ item }, "\"Partner portal\"").length, 1);
});

test("a set-by naming no processor stays a name and passes", () => {
  const item = swap(ITEM_FM, "set-by: Lantern Mail", "set-by: A widget vendor");
  assert.deepEqual(failuresOf({ item }), []);
});

test("an activity naming no processing activity fails", () => {
  const item = swap(ITEM_FM, "activity: Invoice delivery", "activity: Newsletter");
  assert.equal(failuresOf({ item }, "\"Newsletter\"").length, 1);
});

test("a key the slug changes keeps its H1 and passes in the slugged file", () => {
  assert.deepEqual(failuresOf({ itemName: "__Host-session" }), []);
});

function actSectionsWithout(heading) {
  return actSections("Lantern Mail").filter(([h]) => h !== heading);
}
```

The breakage tests assert the file and the offending value or section rather than a check's whole sentence, since those sentences are core's and not this plan's. If a failure's wording differs (for example the missing-section message quotes the heading differently), adjust the asserted words to what the checker actually says, keeping one failure per test, and say so in the report. The test "a key the slug changes" relies on `slug("__Host-session")` being `host-session`, R12's derivation.

- [ ] **Step 2: Add the test to the script and run it to see it fail**

In `package.json`, append ` verify/processors-and-stored-items.test.mjs` to the end of the `test:instance-checks` command.

Run: `node --test verify/processors-and-stored-items.test.mjs`. Expected: FAIL, `core/data-processor-schema.md` does not exist (ENOENT).

- [ ] **Step 3: Write `core/data-processor-schema.md`**

Run `node bin/companygraph.mjs id` three times, one id for each schema in Steps 3 to 5.

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Data Processor Schema

> Required structure for data processor files.

## File Location

`model/data-processors/*.md`

Nothing owns a data processor and a data processor owns nothing: one vendor serves several of the company's processing activities, and each activity names the processors it uses.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `legal-name` | Yes | string | The legal entity the company's contract is with, which may differ from the H1 |
| `countries` | Yes | array | Where the processor processes and stores the data, each an ISO 3166-1 alpha-2 code |
| `retention` | No | string | How long the processor keeps what it receives, under its own terms |
| `sub-processor-authorization` | No | enum | `general` or `specific`. Whether the contract lets the processor add sub-processors after notice, or only with the company's approval of each (GDPR Art. 28(2); DSG Art. 9(3)). |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Data processor]` | Yes | The name the company calls the processor by. Everything references the processor by this exact string. |
| `> [What it does for the company]` | Yes | What the processor does for the company, in one sentence |
| `## Own purposes` | No | Bulleted. What the vendor does with the data for purposes it decides itself, where for that processing it is a controller and not the company's processor (GDPR Art. 28(10)) |
| `## Transfers` | No | Table. What makes the disclosure abroad lawful, for each jurisdiction whose law asks; its columns are declared below. |
| `## References` | Yes | Table. The data processing agreement, the vendor's sub-processor list, its privacy policy and its retention terms; its columns are declared below. |

`## Transfers` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Jurisdiction` | Yes | enum | `eu`, `ch` or `uk`. The law that asks for a safeguard: the GDPR, the Swiss DSG or the UK GDPR. |
| `Safeguard` | Yes | string | The instrument as that law names it, an adequacy decision, standard contractual clauses and their module, binding corporate rules |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a data processing agreement, a sub-processor list, a privacy policy |
| `URL` | Yes | string | Where it is |

## Purpose

A data processor is a party that processes personal data on the company's behalf (GDPR Art. 4(8); DSG Art. 5 lit. k, «Auftragsbearbeiter»). It answers "who outside the company handles this data, where, under which contract, and how does it reach them lawfully?" for whoever writes the privacy page, answers a data subject or reviews a vendor. What the company does with the data, and why, is the processing activity's, which names the processor; the processor names no activity.

## Writing rules

- The tagline says what the processor does for the company, not what the vendor sells.
- `legal-name` is the entity the company's contract is with, as the contract writes it.
- `countries` lists where the data is processed and stored, not where the vendor is incorporated.
- `retention` is the vendor's period in the vendor's words; the company's own retention is the processing activity's.
- `## Own purposes` names each purpose the vendor decides for itself, in the words of its terms.
- `## Transfers` has a row for each jurisdiction whose law asks for a safeguard for one of `countries`, and names the instrument as that law names it.
- `## References` carries the vendor's sub-processor list as a row, and no sub-processor is a page of the model: the list is the vendor's to keep and to announce changes to (GDPR Art. 28(2)).
- The page writes names and prose in American English (R14).
````

- [ ] **Step 4: Write `core/processing-activity-schema.md`**

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Processing Activity Schema

> Required structure for processing activity files.

## File Location

`model/processing-activities/*.md`

Nothing owns a processing activity and a processing activity owns nothing: it names the processors it uses and the surfaces where a person meets it, and belongs to none of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `legal-basis` | Yes | enum | `consent`, `contract`, `legal-obligation`, `vital-interests`, `public-task` or `legitimate-interests`. The ground the processing rests on (GDPR Art. 6(1)). |
| `retention` | No | string | How long the company keeps the data, or the criterion that decides it |
| `surfaces` | No | array of ref → surface | Where a person whose data it is meets the activity, each the H1 of a file in `surfaces/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Processing activity]` | Yes | The activity's name. Everything references the activity by this exact string. |
| `> [Purpose]` | Yes | The purpose of the processing, in one sentence |
| `## Data subjects` | Yes | Bulleted. Whose personal data it is, one category of people per item |
| `## Personal data` | Yes | Bulleted. Which personal data it processes, one category per item |
| `## Processors` | No | Table. The processors the data goes to and what each receives; its columns are declared below. An activity the company does in-house has no rows. |
| `## References` | No | Table. The record of processing it belongs to, an impact assessment, the privacy page that discloses it; its columns are declared below. |

`## Processors` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Processor` | Yes | ref → data-processor | The processor the data goes to, the H1 of a file in `data-processors/` |
| `Receives` | Yes | string | What that processor gets, which may be less than the activity holds |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a record of processing, an impact assessment, a privacy notice |
| `URL` | Yes | string | Where it is |

## Purpose

A processing activity is one thing the company does with personal data, for one purpose (GDPR Art. 30(1); DSG Art. 12, «Bearbeitungstätigkeit»). It answers "what do we do with whose data, on what ground, for how long, and who else gets it?", which is what a record of processing keeps and what a privacy page discloses. The processors it names keep their own facts on their own pages: where they process, under which contract, for how long.

## Writing rules

- The tagline states one purpose, as the person whose data it is would understand it.
- `legal-basis` names one ground; an activity that rests on two is two activities.
- Each item of `## Data subjects` names a category of people, never a person.
- Each item of `## Personal data` names a category of data, not a field of a database, and says so where it is a special category (GDPR Art. 9; DSG Art. 5 lit. c).
- Each row of `## Processors` says in `Receives` what reaches that processor and nothing more, so a processor that sees part of the data is never listed as seeing all of it.
- `retention` states the company's own period or the criterion that decides it; a processor's own period is on the processor's page.
- The page writes names and prose in American English (R14).
````

- [ ] **Step 5: Write `core/stored-item-schema.md`**

````markdown
---
id: <an id from `node bin/companygraph.mjs id`>
---

# Stored Item Schema

> Required structure for stored item files.

## File Location

`model/stored-items/*.md`

Nothing owns a stored item and a stored item owns nothing: one key is set by several surfaces of an instance, and it names each of them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `mechanism` | Yes | enum | `local-storage`, `session-storage`, `cookie`, `indexeddb` or `cache`. How the browser keeps it: the two Web Storage areas, an HTTP cookie, an IndexedDB database or the Cache API (WHATWG HTML, Storage Standard). |
| `necessity` | Yes | enum | `strictly-necessary` or `optional`. Whether the service the visitor asked for needs it (ePrivacy Directive Art. 5(3)). What follows from it differs by jurisdiction and is the law's. |
| `duration` | No | string | How long it stays, where the mechanism does not decide it |
| `surfaces` | Yes | array of ref → surface | The surfaces that set it, each the H1 of a file in `surfaces/` |
| `set-by` | No | ref? → data-processor | The party that sets or reads it, where that is not the company. A name that resolves is a processor; one that does not stays a name. |
| `activity` | No | ref → processing-activity | The activity it serves, where what it holds is personal data, the H1 of a file in `processing-activities/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Key]` | Yes | The key or cookie name exactly as the code writes it. Everything references the item by this exact string. |
| `> [What it holds]` | Yes | What the item holds and why, in one sentence |
| `## References` | No | Table. The code that sets it, the provider's documentation; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a source file, a provider's documentation |
| `URL` | Yes | string | Where it is |

## Purpose

A stored item is one thing a surface keeps on a visitor's device under one name: a Web Storage key, a cookie, an IndexedDB database or a cache (ePrivacy Directive Art. 5(3); FMG Art. 45c). It answers "what does this page leave in the browser, for how long, and who reads it?", which is what a privacy page or a cookie policy discloses. Its H1 is the key, so what the code writes and what the model holds can be compared by name.

## Writing rules

- The H1 is the key as the code writes it, character for character.
- The tagline says what the item holds and why, in the words a privacy page would use.
- `duration` is absent for `session-storage`, which ends with the tab, and present for any other mechanism, as the code sets it or as "until the visitor clears it".
- `necessity` is `strictly-necessary` only where the service the visitor asked for fails without the item.
- `set-by` is absent for an item the company's own code sets.
- `activity` names a processing activity where what the item holds is personal data, and is absent otherwise.
- The page writes names and prose in American English (R14).
````

- [ ] **Step 6: Add the three rows**

In `lib/checks.mjs`, directly after the `control` row of `TYPES`:

```js
  // A data processor serves several processing activities, an activity uses several processors,
  // and one stored item is set by several surfaces, so nothing owns any of the three.
  { type: "data-processor", folder: "data-processors" },
  { type: "processing-activity", folder: "processing-activities" },
  { type: "stored-item", folder: "stored-items" },
```

- [ ] **Step 7: Run the new test and every suite**

Run: `node --test verify/processors-and-stored-items.test.mjs`. Expected: PASS. Then `npm run verify && npm run test:instance-checks && npm run test:instance && npm run test:rules && npm run test:plan && npm run test:cli && npm run typecheck && npm run build:check`. Expected: PASS everywhere. `npm run verify` holds the three schemas to R9's shape, each writing rule to opening with its subject, and R20, so a schema typo fails there naming the file. If an existing test counts the core's types or lists them, update it to include the three and say so in the report.

- [ ] **Step 8: Commit**

```bash
git add core/data-processor-schema.md core/processing-activity-schema.md core/stored-item-schema.md lib/checks.mjs verify/processors-and-stored-items.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
Core gains data-processor, processing-activity and stored-item

A company that holds personal data hands some of it to vendors, and one that runs a website keeps things on its visitors' devices, and core had no type for either. Three schemas now hold them in existing vocabulary: a processor with its legal name, its countries, its own retention and a table of transfer safeguards per jurisdiction; an activity with its purpose, legal basis, data subjects, personal data and a table of the processors it uses; and a stored item whose H1 is its key, with the mechanism, local or session storage among them, and whether it is strictly necessary. Nothing owns any of the three, so the checker's TYPES gains three flat rows.

Verified: node --test verify/processors-and-stored-items.test.mjs passes, having failed first; npm run verify, test:instance-checks, test:instance, test:rules, test:plan, test:cli, typecheck and build:check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

### Task 2: The example carries one of each

**Files:**

- Create: `example/model/data-processors/lantern-mail.md`
- Create: `example/model/processing-activities/invoice-delivery.md`
- Create: `example/model/stored-items/theme.md`
- Modify: `example/model/README.md` (the sentence listing every core type, and the tree)

**Interfaces:**

- Consumes: the three schemas and rows from Task 1; the example's existing source `Local` and surface `Beacon Systems website`. Read each file's H1 before writing, and use the exact strings. `Lantern Mail` is fictional, as the whole example is; no file in `example/` names it yet.

- [ ] **Step 1: Show the folders are read**

Create `example/model/data-processors/stray.md` holding only `# Stray\n` (no frontmatter, no tagline), run `npm run verify`, and see it fail naming `data-processors/stray.md`. Do the same for `processing-activities/` and `stored-items/`, one at a time. Delete each stray file after its failure is seen.

- [ ] **Step 2: Write the three pages**

Each opens with an id from `node bin/companygraph.mjs id` and `source: Local`.

`example/model/data-processors/lantern-mail.md`:

```markdown
---
id: <id>
source: Local
legal-name: Lantern Mail AG
countries:
  - CH
retention: Thirty days after delivery, then deleted
sub-processor-authorization: specific
---

# Lantern Mail

> Sends each customer's invoice to its billing contact by email.

## Transfers

| Jurisdiction | Safeguard |
| --- | --- |
| eu | Adequacy decision for Switzerland |

## References

| What | URL |
| --- | --- |
| Data processing agreement | https://lantern.example/legal/dpa |
| Sub-processor list | https://lantern.example/legal/subprocessors |
```

`example/model/processing-activities/invoice-delivery.md`:

```markdown
---
id: <id>
source: Local
legal-basis: contract
retention: Ten years after the invoice date, as business records
surfaces:
  - Beacon Systems website
---

# Invoice delivery

> Sending each customer the invoice its contract asks for, to the person who pays it.

## Data subjects

- Billing contacts at customers

## Personal data

- Name and email address of the billing contact
- The invoice: its lines, its amounts and the customer's address

## Processors

| Processor | Receives |
| --- | --- |
| Lantern Mail | The billing contact's email address and the invoice as a PDF |
```

`example/model/stored-items/theme.md`:

```markdown
---
id: <id>
source: Local
mechanism: local-storage
necessity: optional
duration: Until the visitor clears it
surfaces:
  - Beacon Systems website
---

# theme

> Whether the visitor chose the light or the dark look, so the next page opens in it.
```

- [ ] **Step 3: List them in the example's README**

In `example/model/README.md`, add `` `data-processor` ``, `` `processing-activity` `` and `` `stored-item` `` to the sentence "It uses every core type — …", after `` `control` ``. In the tree, add after the `controls/` line, in the same column layout:

```
data-processors/                 lantern-mail.md
processing-activities/           invoice-delivery.md
stored-items/                    theme.md
```

- [ ] **Step 4: Run everything**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && sh conventions/conventions-check && sh conventions/conventions-format check`. Expected: PASS. `test:instance` parses the example, so the edges activity → processor (via `Processors.Processor`), activity → surface and item → surface are drawn; read the parsed graph once (for example `node -e` over `parseInstance` as `verify/instance.test.mjs` calls it) and confirm those three edges exist with their `via`.

- [ ] **Step 5: Commit**

```bash
git add example/model
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example carries a processor, an activity and a stored item

The example instance is where the checks and the parser meet every core type, and the three new ones had no page there. A mail provider in Switzerland, with a transfer safeguard for the EU and its agreement and sub-processor list referenced, sends each customer's invoice; the invoice delivery names it with what it receives, rests on the contract and is met on the company's website; and the website keeps the visitor's theme in local storage.

Verified: npm run verify failed naming a stray file in each new folder before the pages were written, and passes now; test:instance and test:instance-checks pass, and the parsed graph holds the activity's and the item's edges; conventions-check and conventions-format check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

### Task 3: The README names the three types

**Files:**

- Modify: `README.md` (the `*-schema.md` block under "What is here", and the sentence that says "`core/` is the list")

- [ ] **Step 1: Add the types**

In the `*-schema.md` block, change the last line `rule, risk, control` to `rule, risk, control, data-processor,` and add a line `processing-activity, stored-item` aligned with the block's other continuation lines. In the sentence after "`core/` is the list:", change `rule, risk and control` to `rule, risk, control, data-processor, processing-activity and stored-item`, keeping the sentence's own punctuation (no serial comma).

- [ ] **Step 2: Check and commit**

Run: `sh conventions/conventions-check && sh conventions/conventions-format check && npm run verify`. Expected: PASS.

```bash
git add README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The README lists the processor, activity and stored item types

The README's two lists of core's types are where a reader learns what core holds, and they ended at control. Both now name data-processor, processing-activity and stored-item.

Verified: conventions-check, conventions-format check and npm run verify pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit> <noreply@anthropic.com>
EOF
```

## After the owner's merge

The release is the owner's: a core minor, because three new schemas make every vendored copy stale, and a package minor, with `instance-check.yml`'s `ref:` moved with `package.json`, and notes that name the three types and that an instance may leave them empty. Then, each in work of its own and on the owner's word: the family's instances take the release and write their processors, activities and stored items, which is where the undisclosed key and the unnamed host the spec's survey found get their pages; a privacy page built from them replaces the hand-written ones; and the family's glossary gains the German rows the spec's cost names.
