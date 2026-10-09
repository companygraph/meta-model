# The landscape pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance can take the `landscape` pack with `init --pack landscape` or `upgrade --pack landscape`, write systems against one schema vendored beside core, and be held by two instance checks: `part-of` never runs in a circle, and a concept has one system that holds it as `master` at most. The example takes the pack with three systems, and the pack's README maps every field and row onto ArchiMate 3.2.

**Architecture:** A pack is a unit beside core: `PACKS` in `lib/checks.mjs` states its types and the CLI, `bin/check-instance.mjs` and `verify/check.mjs` loop over it, so a third pack is a `PACKS` entry and a `packs/landscape/` folder. The first check is the existing `acyclic` key. The second is the existing `once` key given a row filter, `where`, so that only `## Holds` rows whose `Access` is `master` count; the check keeps naming no type. Everything on a single page, the enums, every reference, `As` on a repeated system, is held by the grammar already.

**Tech Stack:** Node ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-10-09-the-landscape-pack-design.md`

This plan covers meta-model only. An instance taking the pack, and any generator writing its pages from an architecture tool's export, follow the release in work of their own.

## Global Constraints

- The pack's name is `landscape`. Its folder in the repository is `packs/landscape/`, in an instance `<units>/landscape/`, and a manifest lists it as `"packs": ["landscape"]` beside any other.
- One type, exactly: `system` at `systems`. Not owned; owns nothing.
- `system` fields, exactly, in this order: `id` (Yes, string), `source` (Yes, `ref → source`), `source-id` (No, string), `kind` (Yes, enum: `application`, `device`, `platform`, `network`), `vendor` (No, string), `lifecycle` (No, enum: `planned`, `active`, `retiring`, `retired`), `criticality` (No, enum: `high`, `medium`, `low`), `owner` (No, `ref → seat`), `operator` (No, `ref → seat`), `processor` (No, `ref → data-processor`), `part-of` (No, `ref → system`), `domain` (No, `ref → domain`), `realizes` (No, `array of ref → feature`), `serves` (No, `array of ref → process`).
- `system` sections, exactly: `# [System]` (Yes), `> [What it does]` (Yes), `## Connects to` (No, Table: `System` Yes `ref → system`, `As` No string, `Carries` No `qualifier → concept`, `Via` No string), `## Holds` (No, Table: `Concept` Yes `ref → concept`, `Access` Yes enum `master`, `writes`, `reads`), `## References` (No, Table: `What` Yes string, `URL` Yes string).
- Every enum's tokens are written in the Description as R8 reads them: backticked, comma-separated, the last after `or`, then a period.
- `PACKS.landscape` is one row: `{ type: "system", folder: "systems", acyclic: "part-of", once: [{ section: "Holds", column: "Concept", where: { column: "Access", is: "master" } }] }`. The checks name no type in their code and cite R16.
- No core schema changes; core's `TYPES` array is not edited. R20 holds: the pack's schema names `source`, `seat`, `data-processor`, `domain`, `feature`, `process`, `concept` and `system` only.
- The schema id is a fresh UUID version 7 from `node bin/companygraph.mjs id`, lowercase. Every new example page gets one the same way; no id is copied.
- `packs/landscape/manifest.json` carries the same `version` as `core/manifest.json` at the time of the commit, read from that file, never typed from memory.
- Test fixtures and example content name no real company, system, vendor or person. Fixtures use the names given in Task 1; the example's three systems are `Billing service`, `Beacon cluster` and `Invoice mailer`, and its fictional vendors are `Harbor Cloud` and `Lantern Mail`.
- No version bump in this plan. The release, its number and its notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- `lib/` carries its types as JSDoc and `types/` holds the declarations built from it, committed. The task that changes `TypeEntry` runs `npm run typecheck`, then `npm run build`, and commits `types/` with it; `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in the worktree `../meta-model-the-landscape-pack` on the branch `the-landscape-pack`, which carries the spec.
- Every Markdown file written or edited passes `sh conventions/conventions-format` and `sh conventions/conventions-check` before it is committed.

## Review Focus

- Two `## Connects to` rows naming one system with distinct `As` values must pass, two with the same `As` must fail once, and a second row with a blank `As` must fail, so two interfaces to one system, the common case, are told apart. Pinned in Task 1.
- A `Carries` cell naming no concept must fail as R4 alone, since a qualifier must resolve as a reference must; and a `part-of` naming no system must fail as R4 alone with no second finding from the circle check. Pinned in Task 1.
- Two systems holding one concept as `master` must fail once naming both; one master beside any number of `writes` and `reads` rows must pass; and a system holding two concepts as master must pass, since the rule is per concept. Pinned in Task 2.
- A `## Holds` row whose `Access` is off the list must fail under R8 and must not be counted as a master or a non-master, so an R8 fault produces one finding. Pinned in Task 2.
- The organization pack's `once` entries, which carry no `where`, must behave exactly as before: `npm run test:instance-checks` is the whole proof, and `verify/organization.test.mjs` is in it. Pinned in Task 2.

---

### Task 1: The pack ships its schema, and a small instance written in it passes

**Files:**

- Create: `packs/landscape/system-schema.md`
- Create: `packs/landscape/manifest.json`
- Create: `packs/landscape/README.md`
- Modify: `lib/checks.mjs` (`PACKS`: add `landscape`, with `acyclic` only in this task)
- Create: `verify/landscape.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/landscape.test.mjs` after `verify/organization.test.mjs`)

**Interfaces:**

- Produces: `PACKS.landscape` with the row `{ type: "system", folder: "systems", acyclic: "part-of" }`, which Task 2 extends with `once`; the fixture builder `tree(change)`, `failures(files)` and `edit(path, from, to)` in `verify/landscape.test.mjs`, which Task 2 extends.

- [ ] **Step 1: Write the failing test**

```js
// verify/landscape.test.mjs
// The landscape pack through its real schema: packs/landscape/ is read from disk, so the test
// fails if the schema and the checks part. The core types a system names are bare, as
// question-kind.test.mjs has them, since the test is about the pack's edges and not their targets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const pack = (n) => fs.readFileSync(new URL(`../packs/landscape/${n}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const PACKS = [{ name: "landscape", dir: "meta/landscape" }];
const S = "model/systems";
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}\n` : "";
const page = (h1, tagline) => `# ${h1}\n\n> ${tagline}\n`;
const system = ({ kind, vendor, lifecycle, criticality, owner, operator, processor, partOf, domain, realizes = [], serves = [], h1, tagline, body = "" }) => [
  "---", "source: Local", `kind: ${kind}`,
  ...(vendor ? [`vendor: ${vendor}`] : []), ...(lifecycle ? [`lifecycle: ${lifecycle}`] : []), ...(criticality ? [`criticality: ${criticality}`] : []),
  ...(owner ? [`owner: ${owner}`] : []), ...(operator ? [`operator: ${operator}`] : []), ...(processor ? [`processor: ${processor}`] : []),
  ...(partOf ? [`part-of: ${partOf}`] : []), ...(domain ? [`domain: ${domain}`] : []),
  ...(realizes.length ? [list("realizes", realizes).trimEnd()] : []), ...(serves.length ? [list("serves", serves).trimEnd()] : []),
  "---", "", page(h1, tagline) + body,
].join("\n");
const connects = (rows) => `\n## Connects to\n\n| System | As | Carries | Via |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const holds = (rows) => `\n## Holds\n\n| Concept | Access |\n| --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;

const tree = (change = (m) => m) => change(new Map([
  ["meta/landscape/system-schema.md", pack("system")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/domain-schema.md", bare("domain", "model/domains/*.md")],
  ["meta/core/feature-schema.md", bare("feature", "model/features/*.md")],
  ["meta/core/process-schema.md", bare("process", "model/processes/<process>/<process>.md")],
  ["meta/core/concept-schema.md", bare("concept", "model/concepts/*.md")],
  ["meta/core/seat-schema.md", bare("seat", "model/seats/*.md")],
  ["meta/core/data-processor-schema.md", bare("data-processor", "model/data-processors/*.md")],
  ["model/sources/local.md", page("Local", "Here.")],
  ["model/domains/retail.md", page("Retail", "Where a customer buys.")],
  ["model/features/ring-up-a-sale.md", page("Ring up a sale", "Take what a customer buys and total it.")],
  ["model/features/pay-by-card.md", page("Pay by card", "Settle a sale with a card.")],
  ["model/processes/close-the-day/close-the-day.md", page("Close the day", "What a store does after the last sale.")],
  ["model/concepts/sale.md", page("Sale", "One purchase at a till.")],
  ["model/concepts/article.md", page("Article", "One thing the company sells.")],
  ["model/concepts/customer.md", page("Customer", "Who buys.")],
  ["model/seats/store-manager.md", page("Store Manager", "Runs a store.")],
  ["model/seats/it-operations.md", page("IT Operations", "Keeps the systems running.")],
  ["model/data-processors/payline.md", page("Payline", "Settles card payments.")],
  [`${S}/point-of-sale.md`, system({ kind: "application", vendor: "Tillworks", lifecycle: "active", criticality: "high", owner: "Store Manager", operator: "IT Operations", partOf: "Store server", realizes: ["Ring up a sale", "Pay by card"], h1: "Point of sale", tagline: "The till software a sale is rung up on.",
    body: connects([["Payment terminal", "Card payment", "Sale", "USB"], ["Payment terminal", "Terminal status", "", "USB"]]) + holds([["Sale", "master"], ["Article", "reads"]]) })],
  [`${S}/payment-terminal.md`, system({ kind: "device", vendor: "Payline", processor: "Payline", lifecycle: "active", criticality: "high", h1: "Payment terminal", tagline: "The card reader beside each till." })],
  [`${S}/store-server.md`, system({ kind: "platform", lifecycle: "active", operator: "IT Operations", partOf: "Store network", serves: ["Close the day"], h1: "Store server", tagline: "The machine in the back office the store's applications run on." })],
  [`${S}/store-network.md`, system({ kind: "network", domain: "Retail", h1: "Store network", tagline: "The store's wired and wireless network." })],
  [`${S}/article-master.md`, system({ kind: "application", lifecycle: "active", domain: "Retail", h1: "Article master", tagline: "Where an article is created and priced.", body: holds([["Article", "master"], ["Customer", "master"]]) })],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));
const only = (f, ...words) => f.filter((x) => words.every((w) => x.includes(w)));

test("a small instance written in the pack passes, two interfaces to one system and a device under a processor included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a kind outside the four fails under R8", () => {
  const f = failures(tree(edit(`${S}/store-network.md`, "kind: network", "kind: cable")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /store-network\.md.*cable.*\(R8\)/);
});

test("a lifecycle outside its tokens fails under R8", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "lifecycle: active", "lifecycle: live")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*live.*\(R8\)/);
});

test("a part-of naming no system fails as R4 alone", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "part-of: Store server", "part-of: Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*"Ghost".*\(R4\)/);
});

test("a realizes naming no feature fails as R4, and a processor naming a seat fails as R4, since a reference resolves by its declared type", () => {
  const a = failures(tree(edit(`${S}/point-of-sale.md`, "  - Pay by card", "  - Pay by cheque")));
  assert.equal(only(a, "point-of-sale.md", "\"Pay by cheque\"", "(R4)").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${S}/payment-terminal.md`, "processor: Payline", "processor: IT Operations")));
  assert.equal(only(b, "payment-terminal.md", "\"IT Operations\"", "(R4)").length, 1, b.join("\n"));
});

test("an Access outside its tokens fails under R8", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | looks |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*looks.*\(R8\)/);
});

test("a Carries naming no concept fails as R4 alone, because a qualifier resolves as a reference does", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Card payment | Sale | USB |", "| Payment terminal | Card payment | Receipt | USB |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /point-of-sale\.md.*"Receipt".*\(R4\)/);
});

test("two rows naming one system with the same As fail once, and a second row with a blank As fails", () => {
  const same = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Terminal status |", "| Payment terminal | Card payment |")));
  assert.equal(only(same, "point-of-sale.md", "Card payment", "(R16)").length, 1, same.join("\n"));
  const blank = failures(tree(edit(`${S}/point-of-sale.md`, "| Payment terminal | Terminal status |", "| Payment terminal | |")));
  assert.equal(only(blank, "point-of-sale.md", "As", "(R16)").length, 1, blank.join("\n"));
});

test("a part-of circle of two fails once naming both", () => {
  const f = failures(tree(edit(`${S}/store-network.md`, "kind: network\n", "kind: network\npart-of: Store server\n")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /`part-of` runs in a circle.*"Store network".*"Store server".*\(R16\)/);
});
```

If the base test reports that `model/processes/close-the-day/` lacks a `phases/` or `tracks/` folder, add `["model/processes/close-the-day/phases/README.md", "# Phases\n\n> Nothing yet.\n"]` and the same for `tracks/` to the fixture, as `verify/organization.test.mjs` does for a profile's `experiences/`, and keep the rest as written.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test verify/landscape.test.mjs`

Expected: FAIL, every test, with ENOENT reading `packs/landscape/system-schema.md`.

- [ ] **Step 3: Generate the schema's id and read core's version**

Run: `node bin/companygraph.mjs id && node -p 'JSON.parse(require("fs").readFileSync("core/manifest.json","utf8")).version'`

The id goes into the schema, the version into the manifest.

- [ ] **Step 4: Write the schema**

`packs/landscape/system-schema.md`:

```markdown
---
id: <the id>
---

# System Schema

> Required structure for system files.

## File Location

`model/systems/*.md`

A system owns nothing and nothing owns it, so it is a file. What it runs on or in is its `part-of`, so a terminal moves from one node to another by editing a line and no file moves, and a device that holds no application is a page like any other.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source, an element's GUID in an architecture tool. Absent when the source has none. |
| `kind` | Yes | enum | `application`, `device`, `platform` or `network`. Software somebody uses or that serves other software; a physical thing that computes, prints, weighs or pays; what applications run on, a node, system software, a cloud service; or what connects systems (ArchiMate 3.2, chapters 9 and 10). |
| `vendor` | No | string | Who makes it. A name, not a reference: a vendor is an entity only when it processes personal data, which `processor` says. |
| `lifecycle` | No | enum | `planned`, `active`, `retiring` or `retired`. The stage the system is in, not a date (LeanIX, application lifecycle). |
| `criticality` | No | enum | `high`, `medium` or `low`. What stops when it stops. |
| `owner` | No | ref → seat | The seat accountable for what the system does for the business, the H1 of a file in `seats/` |
| `operator` | No | ref → seat | The seat that runs it, the H1 of a file in `seats/` |
| `processor` | No | ref → data-processor | The party outside the company that runs it where it handles personal data, the H1 of a file in `data-processors/`; the contract sits on that page |
| `part-of` | No | ref → system | The system this one runs on or in, the H1 of another file in `systems/`: the device a terminal is, the node an application runs on. Written on the part; the whole lists nothing. |
| `domain` | No | ref → domain | The area of the company the system belongs to where it realizes no feature, the H1 of a file in `domains/` |
| `realizes` | No | array of ref → feature | The features this system gives, each the H1 of a file in `features/` |
| `serves` | No | array of ref → process | The processes this system carries where no feature names it yet, each the H1 of a process's own file |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [System]` | Yes | The canonical name of the system, as the people who use or run it name it |
| `> [What it does]` | Yes | One-paragraph statement of what the system does and for whom |
| `## Connects to` | No | Table. One row per integration this system takes data over, written on the side that takes it; its columns are declared below. |
| `## Holds` | No | Table. One row per concept this system keeps data of; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the system; its columns are declared below. |

`## Connects to` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `System` | Yes | ref → system | The system the data comes from, by its canonical name |
| `As` | No | string | The interface the connection goes through, by its own name: `Paymentnetwork – Adyen`. Required where two rows name the same system (R16). |
| `Carries` | No | qualifier → concept | What the connection carries, by the concept's canonical name |
| `Via` | No | string | How it is carried: a protocol, a file, a message queue |

`## Holds` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept | What the system keeps data of, by its canonical name |
| `Access` | Yes | enum | `master`, `writes` or `reads`. The one system whose copy leads, a system that writes a copy, or one that only reads (ArchiMate 3.2, access relationship). |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an operations manual, a vendor's documentation, an architecture view |
| `URL` | Yes | string | Where it is |

## Purpose

A system answers "what does this run on, what does it carry, who owns it and what breaks when it stops?" for whoever plans a replacement, answers for an outage or asks which system masters a customer record. It is the layer below the feature: what IT buys, builds, runs and retires, whatever it is made of. It is not a product, which is what somebody uses on its own, and not a feature, which is what they do with it; a system that gives people something to do realizes a feature, and the feature says what.

## Writing rules

- The H1 names the system as staff name it, `POS Kassensystem`, `Filialsystem`, and never by its
  vendor or its product name alone; the vendor goes to `vendor`. An architecture tool's habit of
  writing both into one name, `POS Kassensystem – Comarch Retail`, splits into the H1 and the
  field.
- The tagline says what the system does and for whom, and claims nothing about how well.
- `kind` is what the system is made of, not what it is for: a payment terminal is a `device`
  whatever it runs, and the software on it, where that is a system of its own, is an
  `application` that is `part-of` the terminal.
- `realizes` names features of the products staff and customers open, in the words of those
  features; a system that gives nobody anything to do, a network, a camera, realizes nothing and
  names its `domain` instead.
- `## Connects to` is written on the system that takes the data. An exchange both ways is two
  rows, one on each page.
- `## Holds` names concepts, not tables or files, and one system holds a concept as `master`:
  the one whose copy the others are copies of.
- The page states no cost, no license count and no version. Those move, and a contract register
  or a configuration database holds them.
```

- [ ] **Step 5: Write the manifest and the README**

`packs/landscape/manifest.json`, with the version read in Step 3:

```json
{ "name": "landscape", "version": "<core's version>" }
```

`packs/landscape/README.md`:

```markdown
# CompanyGraph — the landscape pack

> Vocabulary for a company that runs systems: the applications it buys and builds, the devices they run on and in, the platforms under them and the networks between them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack landscape`. Every edge from this type to core's is optional, and no core type names it (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `system` | What IT buys, builds, runs and retires, whatever it is made of: an application, a device, a platform or a network, told apart by its `kind` | nothing |

A system realizes the features of the products staff and customers open, serves a process where no feature names it yet, runs on or in another system through `part-of`, is owned by one seat and run by another, and names the data processor behind it where it handles personal data. It takes data over the rows of its `## Connects to`, written on the side that takes it with the interface's name in `As`, and keeps concepts in `## Holds`, one system holding each concept as `master`.

## Sources

| What | URL |
| --- | --- |
| The Open Group, ArchiMate 3.2 Specification | https://pubs.opengroup.org/architecture/archimate32-doc/ |
| The Open Group, ArchiMate Model Exchange File Format | https://www.opengroup.org/xsd/archimate/ |
| LeanIX, Application lifecycle | https://docs-eam.leanix.net/ |

## Mapping to ArchiMate 3.2

The contract a generator reads in either direction: from an architecture tool's export into pages, with the element's GUID as `source-id`, and from pages back into the exchange format. What never comes back is exactly what this table says is dropped.

| ArchiMate 3.2 | Here |
| --- | --- |
| ApplicationComponent, ApplicationCollaboration | `system`, kind `application` |
| Node, SystemSoftware | `system`, kind `platform`; system software is `part-of` its node |
| Device, Equipment | `system`, kind `device` |
| CommunicationNetwork | `system`, kind `network` |
| ApplicationInterface, TechnologyInterface | the `As` of a `## Connects to` row |
| ApplicationService, BusinessService, Capability | core `feature`, where somebody uses it |
| DataObject, BusinessObject | core `concept` |
| BusinessProcess, BusinessActor, BusinessRole | core `process`, `seat`, `profile` |
| Realization, system to service | `realizes` |
| Serving, system to process | `serves` |
| Composition, Aggregation, Assignment between systems | `part-of`, inverse derived |
| Flow, Triggering between systems | a `## Connects to` row |
| Access, with its mode | a `## Holds` row, `Access` as `writes` or `reads`, the leading writer `master` |
| ApplicationFunction, TechnologyService, TechnologyFunction, Artifact | dropped: internal behavior nobody can name a user of |
| Location | not yet |
| Association, untyped | dropped: an edge that says nothing |
| Views | not held; a consumer draws the graph |

## Where it departs from its sources

- One type where ArchiMate has nine across its application and technology layers; the kind carries the layer.
- An interface is a row, not an element. Its name survives in `As`; its own composition into components and its appearance in views do not.
- Behavior nobody uses is dropped: application functions, technology services and artifacts have no page, because core's rule that a thing nobody can name a user of is not a feature is applied once more one level down.
- Capabilities and business services are not pack types; they are features of the products staff open.
- Access is three tokens, not four: ArchiMate's `readwrite` is `writes`, since a writer reads, and `master` is a claim ArchiMate does not make.
- Lifecycle has four stages where LeanIX has five; its phase-in and active are one `active`, since the model says what is, not when it will be.
- Criticality is three tokens where LeanIX names four by business impact.

## Left for later

Location, as a second type of this pack, for the first instance that writes one; an integration type, for an instance whose integrations need an owner, a lifecycle or references of their own; technology services and application functions; license and cost; a generator from an architecture tool's export, which is an instance's own.
```

Before committing, confirm each URL in `## Sources` answers: `for u in https://pubs.opengroup.org/architecture/archimate32-doc/ https://www.opengroup.org/xsd/archimate/ https://docs-eam.leanix.net/; do curl -s -o /dev/null -w "%{http_code} $u\n" -L "$u"; done`. Expected: three lines beginning `200`. One that does not is replaced by the vendor's page that does, found by searching the site, and the row's `What` is reworded to name that page.

- [ ] **Step 6: Register the pack**

In `lib/checks.mjs`, in `PACKS`, after the `organization` entry's closing `],`, add:

```js
  landscape: [
    // A system owns nothing: what it runs on or in is its `part-of`, so a terminal moves between
    // nodes by editing a line. The chain of `part-of` draws a tree, never a circle.
    { type: "system", folder: "systems", acyclic: "part-of" },
  ],
```

- [ ] **Step 7: Register the test**

In `package.json`, in `test:instance-checks`, insert `verify/landscape.test.mjs` directly after `verify/organization.test.mjs`.

- [ ] **Step 8: Run the test to verify it passes, and the neighbors still do**

Run: `node --test verify/landscape.test.mjs && npm run test:instance-checks && npm run test:rules && npm run test:judge && npm run verify`

Expected: PASS. `test:judge` proves every writing rule opens with its subject and no rule opens with a name that is both a field and a column; `npm run verify` proves the pack's schema has R9's shape and its manifest carries core's version. If `test:judge` fails on a rule, reword its opening; the subjects it accepts are a declared field, column or section, `The H1`, `The tagline` and `The page`.

- [ ] **Step 9: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Then:

```bash
git add packs/landscape lib/checks.mjs verify/landscape.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The landscape pack ships its one type

A third pack, landscape, with one type: system, across ArchiMate's application and technology layers, its kind one of four tokens, its governing fields lifecycle, criticality, an owner and an operator seat and a processor, and optional edges down to core's features, processes, domains and seats. Integrations are rows of Connects to, written on the side that takes the data with the interface's name in As; access to a concept is a row of Holds. The README maps every field and row onto ArchiMate 3.2 and says what is dropped. The chain of part-of is held to a tree by the check groups already use.

Verified: node --test verify/landscape.test.mjs, npm run test:instance-checks, test:rules, test:judge and verify pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 2: A concept has one master

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc for `once`; the check named `an entity is named in a field or a column by one page at most`; `PACKS.landscape`)
- Modify: `types/` (rebuilt)
- Modify: `verify/landscape.test.mjs` (four tests appended)

**Interfaces:**

- Consumes: `PACKS.landscape`, `tree`, `failures`, `edit`, `only`, `holds` and `S` from Task 1.
- Produces: the `once` entry form `{ section, column, where: { column, is } }`, read by the existing check; `PACKS.landscape[0].once`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/landscape.test.mjs`:

```js
test("two systems holding one concept as master fail once naming both", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | master |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"Article" is in the "## Holds" Concept of model\/systems\/article-master\.md and model\/systems\/point-of-sale\.md; a concept is in the "## Holds" Concept, in a row whose `Access` is `master`, of one system at most \(R16\)/);
});

test("one master beside writers and readers passes, and a system holding two concepts as master passes", () => {
  const f = failures(tree((m) => {
    edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | writes |")(m);
    edit(`${S}/store-server.md`, "> The machine in the back office the store's applications run on.\n", `> The machine in the back office the store's applications run on.\n${holds([["Article", "reads"], ["Sale", "reads"]])}`)(m);
    return m;
  }));
  assert.deepEqual(f, []);
});

test("an Access off the list is R8's alone and is not counted as a master", () => {
  const f = failures(tree(edit(`${S}/point-of-sale.md`, "| Article | reads |", "| Article | Master |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("a once entry without where still counts every row, so the organization pack is unchanged", () => {
  // Proved by npm run test:instance-checks, which runs verify/organization.test.mjs against the
  // same check; this test pins that a `where` whose column is absent from the table counts no
  // row, rather than every row.
  const f = failures(tree(edit(`${S}/article-master.md`, "| Concept | Access |\n| --- | --- |", "| Concept | Mode |\n| --- | --- |")));
  assert.equal(only(f, "in a row whose").length, 0, f.join("\n"));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/landscape.test.mjs`

Expected: the first new test FAILS, since nothing yet holds a concept to one master; the other three pass or fail incidentally. Read the first failure's message to confirm it says `deepEqual` or a count of 0.

- [ ] **Step 3: Extend the `once` entry's declaration**

In `lib/checks.mjs`, in the `TypeEntry` JSDoc, the `once` property's type gains `where?: { column: string, is: string }` on its column form, so the line reads:

```js
 * @property {({ field: string, when?: { via: string, field: string, is: string }, until?: string } | { section: string, column: string, where?: { column: string, is: string }, when?: { via: string, field: string, is: string }, until?: string })[]} [once] Where every entity is named by one page of the type at most: in a list field (`field`), or in the `column` of the `section` table, a reference column; with `where`, only rows whose `where.column` cell holds `where.is` count, so one system holds a concept as master while any number read it; with `when`, only pages whose field `via` names an entity carrying `field` with the value `is` count; with `until`, a page whose date field of that name has passed, read as R9 reads an `end`, is not counted.
```

- [ ] **Step 4: Read `where` in the check**

In the check named `an entity is named in a field or a column by one page at most`, replace

```js
          const { when, until } = entry;
```

with

```js
          const { when, until } = entry;
          const where = "where" in entry ? entry.where : undefined;
```

and replace the column branch

```js
            if (column) {
              const table = schemaTableOf(t.type, section, text);
              const at = table ? table.columns.indexOf(column) : -1;
              values = table ? table.rows.map((row) => (row[at] ?? "").replace(/`/g, "").trim()).filter(Boolean) : [];
            } else values = fieldValues(fm, field);
```

with

```js
            if (column) {
              const table = schemaTableOf(t.type, section, text);
              const at = table ? table.columns.indexOf(column) : -1;
              // With `where`, only a row whose `where.column` cell holds `where.is` counts; a
              // table without that column counts no row, since nothing in it says which rows.
              const whereAt = table && where ? table.columns.indexOf(where.column) : -1;
              const cell = (row, i) => (row[i] ?? "").replace(/`/g, "").trim();
              const rows = !table ? [] : !where ? table.rows : whereAt < 0 ? [] : table.rows.filter((row) => cell(row, whereAt) === where.is);
              values = rows.map((row) => cell(row, at)).filter(Boolean);
            } else values = fieldValues(fm, field);
```

and replace the two lines that build the message

```js
          const among = when ? ` whose \`${when.via}\` carries \`${when.field}: ${when.is}\`` : "";
          const where = column ? `the "## ${section}" ${column}` : `\`${field}\``;
```

with

```js
          const among = when ? ` whose \`${when.via}\` carries \`${when.field}: ${when.is}\`` : "";
          const onRows = where ? `, in a row whose \`${where.column}\` is \`${where.is}\`,` : "";
          const place = column ? `the "## ${section}" ${column}` : `\`${field}\``;
```

and in the `fail(...)` call that follows, replace `${where}` with `${place}` in both places and insert `${onRows}` after the second one, so it reads:

```js
              fail(`"${name}" is in ${place} of ${[...by].sort().join(" and ")}; a ${target.type} is in ${place}${onRows} of one ${t.type}${among} at most (R16)`);
```

Extend the check's comment with one sentence: "Where the entry says `where`, only rows whose cell in that column holds the value count, so one system holds a concept as master while any number read it."

- [ ] **Step 5: Give the pack its entry**

In `PACKS.landscape`, the row becomes:

```js
    // One system holds a concept as master: the copy the others are copies of. A reader and a
    // writer are any number; the check counts the master rows alone.
    { type: "system", folder: "systems", acyclic: "part-of", once: [{ section: "Holds", column: "Concept", where: { column: "Access", is: "master" } }] },
```

- [ ] **Step 6: Run the tests, the type build and the neighbors**

Run: `node --test verify/landscape.test.mjs && npm run test:instance-checks && npm run typecheck && npm run build && npm run build:check`

Expected: PASS; `git status --short types/` shows the rebuilt declaration that carries `where`.

- [ ] **Step 7: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Then:

```bash
git add lib/checks.mjs types verify/landscape.test.mjs
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A concept has one master

The check that holds an entity to one page gains a row filter: with where, only rows whose cell in a column holds a value count. The landscape pack uses it on Holds, so two systems holding one concept as master fail once naming both, while any number write and read it. A once entry without where counts every row as before.

Verified: node --test verify/landscape.test.mjs, npm run test:instance-checks, typecheck, build and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 3: The example takes the pack

**Files:**

- Modify: `verify/example.mjs` (`EXAMPLE_PACKS`)
- Create: `example/model/systems/README.md`
- Create: `example/model/systems/billing-service.md`
- Create: `example/model/systems/beacon-cluster.md`
- Create: `example/model/systems/invoice-mailer.md`
- Modify: `example/model/README.md` (the third paragraph; the tree; the last paragraph)

**Interfaces:**

- Consumes: the `system` type from Tasks 1 and 2; the example's existing features (`Billing run`, `Pricing rules`, `Credit notes`, `Charge explanation`), process (`Delivery`), seat (`Backend Engineer`), data processor (`Lantern Mail`), domain (`Invoicing`) and concepts (`Invoice`, `Invoice line`, `Credit note`, `Pricing rule`, `Customer`, `Usage record`).

- [ ] **Step 1: Declare the pack and see the example fail**

In `verify/example.mjs`:

```js
export const EXAMPLE_PACKS = ["organization", "landscape"];
```

Run: `npm run verify`

Expected: FAIL, because `example/model/systems/` does not exist for a type the example now takes, or PASS with the pack's folder reported as missing; either way, the next steps supply it.

- [ ] **Step 2: Generate three ids**

Run: `for i in 1 2 3; do node bin/companygraph.mjs id; done`

One per system page, in the order below.

- [ ] **Step 3: Write the folder's README and the three systems**

`example/model/systems/README.md`:

```markdown
# Systems

One file per system, written against `meta/landscape/system-schema.md`.
```

`example/model/systems/billing-service.md`:

```markdown
---
id: <first id>
source: Local
kind: application
lifecycle: active
criticality: high
owner: Backend Engineer
part-of: Beacon cluster
realizes:
  - Billing run
  - Pricing rules
  - Credit notes
  - Charge explanation
---

# Billing service

> The service that runs every billing run, prices each customer's usage against its contract, and writes the invoices and credit notes the Billing Console and the Invoice Page show.

## Holds

| Concept | Access |
| --- | --- |
| Invoice | master |
| Invoice line | master |
| Credit note | master |
| Pricing rule | master |
| Customer | reads |
| Usage record | reads |
```

`example/model/systems/beacon-cluster.md`:

```markdown
---
id: <second id>
source: Local
kind: platform
vendor: Harbor Cloud
lifecycle: active
criticality: high
operator: Backend Engineer
serves:
  - Delivery
---

# Beacon cluster

> The managed Kubernetes cluster every Beacon service is deployed to, where a release lands at the end of the delivery process.
```

`example/model/systems/invoice-mailer.md`:

```markdown
---
id: <third id>
source: Local
kind: application
vendor: Lantern Mail
lifecycle: active
criticality: medium
processor: Lantern Mail
domain: Invoicing
---

# Invoice mailer

> The hosted mailer that takes each finished invoice from the Billing service and delivers it to the customer's address.

## Connects to

| System | As | Carries | Via |
| --- | --- | --- | --- |
| Billing service | Invoice feed | Invoice | REST |

## Holds

| Concept | Access |
| --- | --- |
| Invoice | reads |
| Customer | reads |
```

- [ ] **Step 4: Update the example's README**

In `example/model/README.md`:

- In the third paragraph, `takes the `organization` pack, whose types are `group`, `group-kind` and `job`.` becomes `takes the `organization` pack, whose types are `group`, `group-kind` and `job`, and the `landscape` pack, whose type is `system`.`
- In the tree, directly after the line beginning `jobs/`, add, aligned with the lines around it:

```
systems/                         billing-service.md, beacon-cluster.md, invoice-mailer.md
```

- In the last paragraph, `read beside `core/` and `packs/organization/`` becomes `read beside `core/`, `packs/organization/` and `packs/landscape/``.

- [ ] **Step 5: Run the example's checks and the parser over it**

Run: `npm run verify && npm run test:instance && npm run test:consumer`

Expected: PASS, with no `noted:` line about a system. If `npm run verify` reports a feature, process, seat or concept name as unresolved, the H1 in the example differs from the one written above; read the example's page and use its H1 exactly, never a near name.

- [ ] **Step 6: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Then:

```bash
git add verify/example.mjs example/model/systems example/model/README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example runs on three systems

Beacon takes the landscape pack: the Billing service, which realizes four features, masters the invoice and reads the customer; the Beacon cluster it runs on, which serves the delivery process; and the Invoice mailer, run by Lantern Mail, which takes the invoice feed from the service. Every edge the pack draws to core is proven on content.

Verified: npm run verify, test:instance and test:consumer pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 4: The CLI takes the pack, the README says three ship, and everything runs

**Files:**

- Modify: `verify/cli.test.mjs` (one test, after the `init --pack organization` test)
- Modify: `README.md` (the paragraph beginning "The packs this release ships")

**Interfaces:**

- Consumes: everything above; produces nothing a later task reads.

- [ ] **Step 1: Write the failing test**

In `verify/cli.test.mjs`, directly after the test named `init --pack organization vendors the pack, and the instance it writes passes check`, add:

```js
test("init --pack landscape vendors the pack, and the instance it writes passes check", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "landscape"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  assert.deepEqual(manifest.packs, ["landscape"]);
  assert.ok(fs.existsSync(path.join(root, "meta/landscape", "system-schema.md")));
  assert.ok(fs.existsSync(path.join(root, "model/systems")), "the pack's folder is made");
  assert.doesNotThrow(() => run(["check", root]));
});
```

- [ ] **Step 2: Run the test**

Run: `node --test --test-name-pattern "init --pack landscape" verify/cli.test.mjs`

Expected: PASS, since `init` and `check` read `PACKS` and name no pack themselves. If it fails on `model/systems`, `init` makes a pack's root folders from `PACKS`, as the software pack's plan made it do; read `bin/companygraph.mjs` for where `--pack` folders are made and confirm the landscape row is reached, rather than adding a special case.

- [ ] **Step 3: Update the README**

In `README.md`, in the paragraph beginning "The packs this release ships are the folders under `packs/`.", after the sentence ending "and an optional `rank` orders the groups.", insert:

```
`landscape`, for a company that runs systems, has one type, `system`, across the application and technology layers, whose `kind` says whether it is an application, a device, a platform or a network; a system realizes features, serves processes, runs on another through `part-of`, takes data over the rows of its `## Connects to` and holds concepts in `## Holds`, one of them as master, and the pack's README maps every field and row onto ArchiMate 3.2.
```

- [ ] **Step 4: Run everything and commit**

Run: `npm run verify && npm run test:cli && npm run test:instance-checks && npm run test:instance && npm run test:rules && npm run test:judge && npm run test:consumer && npm run typecheck && npm run build:check && sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Expected: every suite PASS, both conventions scripts green.

Then:

```bash
git add verify/cli.test.mjs README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The CLI takes the landscape pack, and the README says three ship

init --pack landscape vendors the one schema, makes the systems folder and writes an instance that passes check, proved by a test beside the organization pack's. The README's paragraph on packs names the third.

Verified: npm run verify, test:cli, test:instance-checks, test:instance, test:rules, test:judge, test:consumer, typecheck and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

- [ ] **Step 5: Hand over**

The branch is ready for review. The release is the owner's, a minor since no instance that does not take the pack changes. After it: the MCP server and the plugin read packs generically since v0.68.0 and need a pin move only; the retailer's instance takes the pack with an `enterprise-architect` source and a generator over the README's mapping table, in its own repository.
