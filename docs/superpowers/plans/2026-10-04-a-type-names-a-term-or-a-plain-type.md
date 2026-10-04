# A type names a term or a plain type — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The software pack's `## Payload` and `## Attributes` write a value's type in `Term`, a reference to a concept design of the same context, or in `Type`, a closed list of fourteen plain types, exactly one per row, with `Many` for a list; a misspelt term then fails, draws no edge and is told the term it matches.

**Architecture:** Task 1 changes the two pack schemas, retires `typeCells` and adds a `oneOf` declaration and check, so R4, R5 and R8 hold the new columns as they hold any reference and enum column. Task 2 gives `refKind` a table form, which carries over "an attribute's term is a value object". Task 3 moves `loosely` to module level and lets R4's failure name the term a value that resolved to nothing matches, within the page's own owner. Task 4 runs the whole suite and the instances.

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-10-04-a-type-names-a-term-or-a-plain-type-design.md` (companygraph/meta-model#272), in the same pull request as this plan.

**Tried:** Every task's code and tests below were run once on a scratch clone of this branch at `a26bcb8` (package 0.77.0, core 0.57.0): each new test failed first where the plan says it does and passed after, `npm run typecheck`, `npm run verify` and every `test:*` script passed, and `npm run build:check` passed after `npm run build`. `node bin/check-instance.mjs` passed robertblust; guestgraph and companygraph are pinned at 0.76.0 and are refused by the version guard, and both passed the same change on a 0.76.0 base. A copy of the companygraph instance with the two new schemas vendored failed on its 53 Payload and Attributes tables, each as a column finding, and on the two hand-copied schema files, and on nothing else.

## Global Constraints

- The plain types are exactly, in this order: `string`, `number`, `boolean`, `date`, `timestamp`, `duration`, `version`, `hash`, `path`, `id`, `URL`, `file`, `language`, `map`.
- The columns of both tables are exactly, in this order: `Attribute`, `Term`, `Type`, `Many`, `Description`. `Term` is `ref → concept-design`, `Type` and `Many` are `enum`, all three not required; `Many`'s one value is `yes`.
- Each check is declared on the entry `TYPES` or `PACKS` keeps for the type it holds; no check names a type, a section or a column in its own code.
- A failure's message names the page and ends with the rule it cites: `(R16)` for the pairing and kind checks, `(R4)` for a reference that does not resolve.
- No version bump, no tag and no release notes: the release is the owner's.
- American English (R14). Code comments follow the surrounding file: prose paragraphs saying why, no bullet lists. No numbers that move in prose.
- Commits are prose in the git register: a subject under seventy characters with no type prefix, one to three paragraphs, then `Verified: …` naming what ran, then the trailers. Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in the worktree before the first test.
- After any change in `lib/` or `bin/`, `npm run typecheck` passes and `npm run build` rewrites `types/`; the rewritten files are committed in the same commit, and `npm run build:check` passes before each commit.
- Work in `/Users/rob/git/companygraph/meta-model-a-type-names-a-term`, on the branch `a-type-names-a-term`.

## Review Focus

- A page still written in the old three-column table, as every page of the companygraph instance is until it migrates: a person expects one finding per table, that its columns are not the schema's, and no pairing, kind or enum finding on top. Task 1 tests it.
- A context that holds a concept design `Date` and an attribute of plain type `date`: a person expects it to pass, since `date` is now written in `Type` and names nothing. The retired check failed it. Task 1 tests it.
- Two rows naming the same term, a payload's old and new `Pin`: a person expects them to pass, since the table has no `As` column and the Attribute already tells them apart. Task 1 tests it.
- A `Term` written in backticks, `` `Amount` ``, as some old Type cells were: a person expects it to fail and be told the term it matches, so the fix is plain. Task 3 tests it.
- A payload naming `Invoice` where the context holds both a concept design and an aggregate of that name: a person expects the edge to land on the concept design, the type `Term` declares. Task 1's parser test holds an aggregate `Invoice` beside the concept design.

---

### Task 1: Two columns in the schemas, and a row fills exactly one

**Files:**

- Modify: `packs/software/concept-design-schema.md` (the `## Attributes` columns table, `## Purpose`)
- Modify: `packs/software/domain-event-schema.md` (the `## Payload` columns table, `## Purpose`)
- Modify: `packs/software/README.md` (`## Where it departs from its sources`)
- Modify: `lib/checks.mjs` (the `TypeEntry` typedef, the `concept-design` and `domain-event` rows of `PACKS.software`, the check "a type cell names a term of its own owner exactly" replaced)
- Modify: `types/lib/checks.d.mts` (rewritten by `npm run build`)
- Test: `verify/software.test.mjs` (the shared fixture), `verify/checks-owed.test.mjs` (the type-cell block), `verify/pack-parse.test.mjs` (one new test)

**Interfaces:**

- Produces: `TypeEntry.oneOf?: { section: string, columns: string[] }`; the check named `"a row fills exactly one of the columns its schema pairs"`, failing `` `${path}: the "## ${section}" row "${first cell}" fills `Term` and `Type`; a row fills exactly one of them (R16)` `` or `` `… fills none of `Term` and `Type`; a row fills exactly one of them (R16)` ``. In `verify/checks-owed.test.mjs`: `table(section)(rows)`, `attributes(rows)`, `payload(rows)`, `event(ctx, name, rows)`, `typeCells(files)`, `billing(...entries)`, `line(rows)`, where a row is `[term = "", type = "", many = ""]`.

- [ ] **Step 1: Rewrite the shared fixture in `verify/software.test.mjs`**

In the `invoice.md` concept design, replace

```text
## Attributes\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n| Total | Amount | What is owed |\n
```

with

```text
## Attributes\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n| Total | Amount | | | What is owed |\n
```

and in the `invoice-issued.md` domain event, replace

```text
## Payload\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n| Invoice | Invoice | The issued invoice |\n| Issued at | timestamp | When it was issued |\n
```

with

```text
## Payload\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n| Invoice | Invoice | | | The issued invoice |\n| Issued at | | timestamp | | When it was issued |\n
```

- [ ] **Step 2: Replace the type-cell block in `verify/checks-owed.test.mjs`**

Replace everything from the line `// --- A type cell names a term of its own context exactly, and a root is an entity ------------` up to, not including, the line `const aggregate = (root) => …` with:

```js
// --- A row names a term or a plain type, and a root is an entity ------------------------------

// A row is [term, type, many]; a blank is "". Each row's Attribute is A0, A1, … in order.
const table = (section) => (rows) => `\n## ${section}\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n${rows.map(([term = "", type = "", many = ""], i) => `| A${i} | ${term} | ${type} | ${many} | |\n`).join("")}`;
const attributes = table("Attributes");
const payload = table("Payload");
const event = (ctx, name, rows) => [`${BC}/${ctx}/domain-events/${name.toLowerCase().replace(/ /g, "-")}.md`, page(["emitted-by: Invoice"], name, payload(rows))];
const typeCells = (files) => run(files).failures.filter((f) => /"## (Attributes|Payload)"/.test(f));
const billing = (...entries) => softwareTree(context("Billing"), context("Ledger"),
  design("billing", "Invoice", "entity"), design("billing", "Amount", "value object"), design("ledger", "Posting", "value object"), ...entries);
const line = (rows) => billing(design("billing", "Line", "value object", attributes(rows)));

test("an attribute naming a value object of its own context, a list of one, or a listed plain type passes", () => {
  assert.deepEqual(typeCells(line([["Amount"], ["Amount", "", "yes"], ["", "date"], ["", "string", "yes"], ["", "language"], ["", "map"]])), []);
});

test("a plain date passes beside a concept design named Date, since a plain type names nothing", () => {
  assert.deepEqual(typeCells(billing(design("billing", "Date", "value object"), design("billing", "Line", "value object", attributes([["", "date"]])))), []);
});

test("two rows naming the same term pass, since the table has no role column", () => {
  assert.deepEqual(typeCells(billing(event("billing", "Invoice issued", [["Amount"], ["Amount"]]))), []);
});

test("a table in the old three columns is one column finding and nothing more", () => {
  const old = "\n## Attributes\n\n| Attribute | Type | Description |\n| --- | --- | --- |\n| Total | Amount | |\n";
  assert.deepEqual(typeCells(billing(design("billing", "Line", "value object", old))), [
    `${BC}/billing/concept-designs/line.md: "## Attributes" columns are Attribute|Type|Description; the schema declares Attribute|Term|Type|Many|Description`,
  ]);
});

test("a row filling both Term and Type fails, and so does one filling neither", () => {
  assert.deepEqual(typeCells(line([["Amount", "string"]])), [
    `${BC}/billing/concept-designs/line.md: the "## Attributes" row "A0" fills \`Term\` and \`Type\`; a row fills exactly one of them (R16)`,
  ]);
  assert.deepEqual(typeCells(line([["", "", "yes"]])), [
    `${BC}/billing/concept-designs/line.md: the "## Attributes" row "A0" fills none of \`Term\` and \`Type\`; a row fills exactly one of them (R16)`,
  ]);
});

test("a Term naming no term at all fails as a reference that does not resolve", () => {
  const f = typeCells(line([["Amount2"]]));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /line\.md: `Term` in "## Attributes" is declared `ref → concept-design` and says "Amount2", which names no entity in model\/; a declared reference must resolve \(R4\)$/);
});

test("a Term naming a term of another context fails", () => {
  const f = typeCells(line([["Posting"]]));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /line\.md: `Term` in "## Attributes" says "Posting", which is not one of its bounded-context's own.*\(R5\)$/);
});

test("a Type off the list fails, and so does a Many other than yes", () => {
  assert.deepEqual(typeCells(line([["", "strng"]])), [
    `${BC}/billing/concept-designs/line.md: \`Type\` in "## Attributes" is "strng", and concept-design-schema.md permits \`string\`, \`number\`, \`boolean\`, \`date\`, \`timestamp\`, \`duration\`, \`version\`, \`hash\`, \`path\`, \`id\`, \`URL\`, \`file\`, \`language\`, \`map\` (R8)`,
  ]);
  const f = typeCells(line([["Amount", "", "no"]]));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /`Many` in "## Attributes" is "no", and concept-design-schema\.md permits `yes` \(R8\)$/);
});

test("a payload names a term of its own context of either kind or a plain type, and the same rules hold it", () => {
  assert.deepEqual(typeCells(billing(event("billing", "Invoice issued", [["Invoice"], ["Amount", "", "yes"], ["", "timestamp"], ["", "duration"]]))), []);
  assert.equal(typeCells(billing(event("billing", "Invoice issued", [["Posting"]]))).length, 1);
  assert.equal(typeCells(billing(event("billing", "Invoice issued", [["Invoice2"]]))).length, 1);
  assert.equal(typeCells(billing(event("billing", "Invoice issued", [["Invoice", "string"]]))).length, 1);
  assert.equal(typeCells(billing(event("billing", "Invoice issued", [["", "Money"]]))).length, 1);
});

```

The aggregate tests that follow (`const aggregate = …`, `const roots = …` and their test) stay as they are; they use `billing`, which the block above still defines.

- [ ] **Step 3: Add the parser test at the end of `verify/pack-parse.test.mjs`**

```js
test("a payload's Term draws an edge to the term of its own context, and a plain Type draws none", () => {
  const files = new Map([
    ["identity.md", "---\nsource: Local\n---\n\n# Scratch\n\n> A company.\n"],
    ["sources/local.md", "# Local\n\n> Here.\n"],
    ["bounded-contexts/billing/billing.md", "---\nsource: Local\nclassification: core\n---\n\n# Billing\n\n> Issues invoices.\n\n## Responsibilities\n\n- Issue\n"],
    ["bounded-contexts/billing/concept-designs/invoice.md", "---\nsource: Local\nkind: entity\n---\n\n# Invoice\n\n> Billing's invoice.\n"],
    ["bounded-contexts/billing/aggregates/invoice.md", "---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Kept whole.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| INV-1 | A total never changes. |\n"],
    ["bounded-contexts/billing/domain-events/invoice-issued.md", "---\nsource: Local\nemitted-by: Invoice\n---\n\n# Invoice issued\n\n> An invoice was issued.\n\n## Payload\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n| Invoice | Invoice | | | The issued invoice |\n| Issued at | | timestamp | | When |\n"],
    ["bounded-contexts/crm/crm.md", "---\nsource: Local\nclassification: supporting\n---\n\n# CRM\n\n> Keeps customers.\n\n## Responsibilities\n\n- Keep\n"],
    ["bounded-contexts/crm/concept-designs/invoice.md", "---\nsource: Local\nkind: value object\n---\n\n# Invoice\n\n> CRM's invoice.\n"],
  ]);
  const { entities, edges } = parseInstance(files, { schemas: schemas() });
  const issued = entities.find((e) => e.name === "Invoice issued");
  const billingInvoice = entities.find((e) => e.name === "Invoice" && e.address.startsWith("bounded-contexts/billing/concept-designs/"));
  const out = edges.filter((e) => e.from === issued.id && e.via === "Payload.Term");
  assert.deepEqual(out.map((e) => e.to), [billingInvoice.id], JSON.stringify(edges.filter((e) => e.from === issued.id)));
});
```

- [ ] **Step 4: Run the three files and see them fail**

Run: `node --test verify/software.test.mjs verify/checks-owed.test.mjs verify/pack-parse.test.mjs` Expected: FAIL. The software tests fail on the column finding, since the schemas still declare three columns, and so do most of the new checks-owed tests and the parser test.

- [ ] **Step 5: Change the two schemas and the README**

In `packs/software/concept-design-schema.md`, replace the `## Attributes` row

```markdown
| `Type` | Yes | string | A plain type such as `Money` or `date`, or the name of a value-object concept design in the same context |
```

with

```markdown
| `Term` | No | ref → concept-design | A value object of the same context, by its canonical name, where the attribute is one; an entity is a relation |
| `Type` | No | enum | `string`, `number`, `boolean`, `date`, `timestamp`, `duration`, `version`, `hash`, `path`, `id`, `URL`, `file`, `language` or `map`. A plain type, where the attribute is no term; its unit, or what it is of, goes in the Description. |
| `Many` | No | enum | `yes`. The attribute is a list of what `Term` or `Type` names; blank for one. |
```

and in its `## Purpose` replace the sentence "An attribute whose type is a value object names that value object's concept design exactly." with "An attribute names a value object of its own context in `Term` or a plain type in `Type`, exactly one of the two, and an entity it would name is a relation."

In `packs/software/domain-event-schema.md`, replace the `## Payload` row

```markdown
| `Type` | Yes | string | A plain type such as `duration` or `timestamp`, or the name of a concept design in the same context |
```

with

```markdown
| `Term` | No | ref → concept-design | A concept design of the same context, of either kind, by its canonical name, where the value is one |
| `Type` | No | enum | `string`, `number`, `boolean`, `date`, `timestamp`, `duration`, `version`, `hash`, `path`, `id`, `URL`, `file`, `language` or `map`. A plain type, where the value is no term; its unit, or what it is of, goes in the Description. |
| `Many` | No | enum | `yes`. The value is a list of what `Term` or `Type` names; blank for one. |
```

and in its `## Purpose` replace "A payload type that names a term names one of the event's own context, and a consumer translates it into its own language." with "A payload value names a term of the event's own context in `Term`, of either kind, or a plain type in `Type`, exactly one of the two, and a consumer translates a term into its own language."

In `packs/software/README.md`, under `## Where it departs from its sources`, add after the bullet about the architecture decision:

```markdown
- An attribute's or a payload value's type is written in one of two columns, `Term` for a term of the context and `Type` for a plain type from a closed list, because a term is a reference and a plain type names nothing.
```

- [ ] **Step 6: Declare `oneOf`, and replace the type-cell check, in `lib/checks.mjs`**

In the `TypeEntry` typedef, replace the `typeCells` property line with:

```js
 * @property {{ section: string, columns: string[] }} [oneOf] A table whose every row fills exactly one of `columns`.
```

In `PACKS.software`, replace the comment and the `concept-design` row

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
```

with

```js
    // An attribute and a payload value each name a term of the same context or a plain type, in
    // one of two columns and never both. An attribute's term is a value object, since an entity
    // is a relation; a payload's may be of either kind. An aggregate's root is an entity, since
    // a value object has no identity to reach the rest through.
    {
      type: "concept-design", folder: "bounded-contexts/<bounded-context>/concept-designs", owner: "bounded-context",
      oneSided: { section: "Relations", column: "Concept" },
      oneOf: { section: "Attributes", columns: ["Term", "Type"] },
    },
```

and in the `domain-event` row replace `typeCells: { section: "Payload", column: "Type", names: "concept-design" },` with `oneOf: { section: "Payload", columns: ["Term", "Type"] },`.

Replace the whole check object whose `name` is `"a type cell names a term of its own owner exactly"`, its leading comment included, up to the `{` of the check that opens "// A reference field whose target the schema says carries a kind", with:

```js
  {
    // A table whose rows each fill exactly one of some columns: an attribute's term or its plain
    // type, never both and never neither, since a row with both says two things of one value and
    // a row with neither says nothing of it. A row is named by its first cell. The section and
    // the columns are stated on the type's row, so no type is named here.
    name: "a row fills exactly one of the columns its schema pairs",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.oneOf) continue;
        const { section, columns } = t.oneOf;
        const listed = columns.map((c) => `\`${c}\``).join(" and ");
        for (const { path, text } of pagesOf(t.type)) {
          const table = tableOf(sectionsOf(text).get(section) ?? "");
          if (!table) continue;
          const at = columns.map((c) => table.columns.indexOf(c));
          // A table missing one of the columns is the column check's finding, not this one's.
          if (at.some((n) => n < 0)) continue;
          for (const row of table.rows) {
            const filled = columns.filter((_, i) => (row[at[i]] ?? "").replace(/`/g, "").trim());
            if (filled.length === 1) continue;
            const said = filled.length ? `fills ${filled.map((c) => `\`${c}\``).join(" and ")}` : `fills none of ${listed}`;
            fail(`${path}: the "## ${section}" row "${(row[0] ?? "").trim()}" ${said}; a row fills exactly one of them (R16)`);
          }
        }
      }
    },
  },
```

`loosely`, which lived inside the retired check, goes with it here; Task 3 brings it back at module level.

- [ ] **Step 7: Run the three files and see them pass**

Run: `node --test verify/software.test.mjs verify/checks-owed.test.mjs verify/pack-parse.test.mjs` Expected: PASS.

- [ ] **Step 8: Typecheck, build, run everything, commit**

```sh
npm run typecheck && npm run build && npm run build:check && npm run verify
for s in $(node -p 'Object.keys(require("./package.json").scripts).filter(k=>k.startsWith("test:")).join(" ")'); do npm run -s $s || echo "FAILED $s"; done
sh conventions/conventions-format check && sh conventions/conventions-check
git add packs/software lib/checks.mjs types verify/software.test.mjs verify/checks-owed.test.mjs verify/pack-parse.test.mjs
git commit --author="Implementer <implementer@companygraph.io>"
```

Commit message: subject "A type is a term or a plain type, in two columns", a paragraph saying the two schemas now write `Term`, `Type` and `Many`, that R4, R5 and R8 hold them as any reference and enum column, and that `typeCells` gives way to `oneOf`; `Verified:` naming what ran; the trailers.

---

### Task 2: An attribute's term is a value object

**Files:**

- Modify: `lib/checks.mjs` (the `TypeEntry` typedef's `refKind`, the `concept-design` row, the check "a reference names an entity of the kind its schema says")
- Modify: `types/lib/checks.d.mts` (rewritten by `npm run build`)
- Test: `verify/checks-owed.test.mjs`

**Interfaces:**

- Consumes: `line(rows)` and `typeCells(files)` from Task 1.
- Produces: `TypeEntry.refKind?: { field: string, kind: string } | { section: string, column: string, kind: string }`; a column-form failure reads `` `${path}: `${column}` in "## ${section}" names "${value}", a ${target} of kind `${is}`; it names one of kind `${kind}` (R16)` ``.

- [ ] **Step 1: Write the failing test**

Add after the test "a Term naming a term of another context fails" in `verify/checks-owed.test.mjs`:

```js
test("an attribute naming an entity of its own context fails, since an entity is a relation", () => {
  assert.deepEqual(typeCells(line([["Invoice"]])), [
    `${BC}/billing/concept-designs/line.md: \`Term\` in "## Attributes" names "Invoice", a concept-design of kind \`entity\`; it names one of kind \`value object\` (R16)`,
  ]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test --test-name-pattern="an entity is a relation" verify/checks-owed.test.mjs` Expected: FAIL, the actual list empty.

- [ ] **Step 3: Give `refKind` its table form**

In the `TypeEntry` typedef, replace the `refKind` line with:

```js
 * @property {{ field: string, kind: string } | { section: string, column: string, kind: string }} [refKind] A reference field, or a reference column of a section's table, whose target carries this value in its own `kind`.
```

In the `concept-design` row of `PACKS.software`, add after the `oneOf` line:

```js
      refKind: { section: "Attributes", column: "Term", kind: "value object" },
```

In the check named `"a reference names an entity of the kind its schema says"`, replace the body of `run()` with:

```js
      for (const t of TYPES) {
        if (!t.refKind) continue;
        const { kind } = t.refKind;
        // A field is read from the frontmatter and a column from its section's table; the two
        // differ only in where the values are and how the message says where.
        const column = "section" in t.refKind ? t.refKind : null;
        const field = "field" in t.refKind ? t.refKind.field : null;
        const declared = column
          ? columnTablesOf().get(t.type)?.find((x) => x.section === column.section)?.columns.find((c) => c.name === column.column)?.declared
          : fieldsOf(t.type).find((f) => f.field === field)?.declared;
        const target = TYPES.find((x) => x.type === (declared ? refOf(declared)?.target : null));
        if (!target) continue;
        const where = column ? `\`${column.column}\` in "## ${column.section}"` : `\`${field}\``;
        for (const { path, text } of pagesOf(t.type))
          for (const value of column ? cellsOf(text, column.section, column.column) : fieldValues(frontmatterOf(text), /** @type {string} */ (field))) {
            const found = entityNamed(path, t.type, target, value);
            if (!found) continue;
            const is = fmScalar(frontmatterOf(found.text), "kind");
            if (is !== kind)
              fail(`${path}: ${where} names "${value}", a ${target.type} of kind \`${is ?? "none"}\`; it names one of kind \`${kind}\` (R16)`);
          }
      }
```

Widen the check's leading comment by one sentence at its end: "A column of a table is held the same way, an attribute's `Term` naming a value object."

- [ ] **Step 4: Run it and see it pass, the aggregate root test included**

Run: `node --test verify/checks-owed.test.mjs` Expected: PASS, including "an aggregate whose root is an entity passes, …", which holds the field form unchanged.

- [ ] **Step 5: Typecheck, build, run everything, commit**

The same commands as Task 1's Step 8, adding `verify/checks-owed.test.mjs`, `lib/checks.mjs` and `types`. Commit message: subject "An attribute's term is a value object, held through refKind", a paragraph saying `refKind` reads a table column as it reads a field and carries over the failure `typeCells` gave; `Verified:`; the trailers.

---

### Task 3: A reference that resolves to nothing is told the term it matches

**Files:**

- Modify: `lib/checks.mjs` (a module-level `loosely` beside `slug`; `nearOf` and the unresolved message in "references resolve")
- Modify: `types/lib/checks.d.mts` (rewritten by `npm run build`; `loosely` is not exported, so expect no change)
- Test: `verify/checks-owed.test.mjs`

**Interfaces:**

- Consumes: `line(rows)`, `billing(...)`, `design(...)`, `attributes(rows)` and `typeCells(files)` from Task 1.
- Produces: R4's unresolved message gains `` `, and the ${target} it matches here is "${near}"` `` before ` (R4)` where a loose match exists in the page's own owner, or, for an unowned type, anywhere in the model.

- [ ] **Step 1: Write the failing tests**

Add after the test "a Term naming no term at all fails as a reference that does not resolve":

```js
test("a Term matching a term of its own context only by case, a plural or backticks is told the term it matches", () => {
  for (const cell of ["amount", "Amounts", "AMOUNT", "`Amount`"]) {
    const f = typeCells(line([[cell]]));
    assert.equal(f.length, 1, cell);
    assert.match(f[0], /which names no entity in model\/; a declared reference must resolve, and the concept-design it matches here is "Amount" \(R4\)$/, cell);
  }
  const ies = typeCells(billing(design("billing", "Policy", "value object"), design("billing", "Line", "value object", attributes([["Policies"]]))));
  assert.match(ies[0], /the concept-design it matches here is "Policy" \(R4\)$/);
});

test("a near miss is matched only within the page's own context", () => {
  const f = typeCells(line([["Postings"]]));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /says "Postings", which names no entity in model\/; a declared reference must resolve \(R4\)$/);
});
```

- [ ] **Step 2: Run them and see the first fail**

Run: `node --test --test-name-pattern="near miss|the term it matches" verify/checks-owed.test.mjs` Expected: the first FAILS, its message lacking the matched term; the second passes already, and is the guard that the hint stays inside the context.

- [ ] **Step 3: Put `loosely` at module level**

In `lib/checks.mjs`, directly after the `slug` definition, add:

```js
// Two names that differ only by case, by what R12's slug drops, or by a plural in -s, -es or -ies:
// what a writer means as the same name and the model does not. Read only to say which name a
// reference that resolved to nothing was likely meant to be.
/** @param {string} a @param {string} b @returns {boolean} */
const loosely = (a, b) => {
  const x = slug(a), y = slug(b);
  /** @param {string} s */
  const ies = (s) => s.replace(/y$/, "ies");
  return x === y || x === `${y}s` || y === `${x}s` || x === `${y}es` || y === `${x}es` || (x !== y && (x === ies(y) || y === ies(x)));
};
```

- [ ] **Step 4: Add `nearOf` and the hint to "references resolve"**

In the check named `"references resolve"`, directly after the line `const h1 = (rel) => read(rel)?.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;`, add:

```js

      // The name of the target type a value that resolved to nothing matches loosely, read where
      // the value would have resolved: within the page's own owner for an owned type, as R5
      // holds it, and across the model for any other. Null where there is none, or where the
      // page sits outside every owner of the type, which R5 reports on its own.
      /** @param {string} child @param {string} target @param {string} value @returns {string | null} */
      const nearOf = (child, target, value) => {
        const t = TYPES.find((x) => x.type === target);
        if (!t) return null;
        /** @type {string[]} */
        let names;
        if (t.owner) {
          const owner = TYPES.find((x) => x.type === t.owner);
          const pageType = typeOfFile(child);
          const rel = child.slice(EX.length + 1).split("/");
          const inside = (pageType === t.owner || TYPES.find((x) => x.type === pageType)?.owner === t.owner) &&
            owner?.folder && rel[0] === owner.folder.split("/")[0] && rel.length >= 3;
          if (!inside || !t.folder) return null;
          const folder = `${EX}/${rel[0]}/${rel[1]}/${t.folder.split("/").pop()}`;
          names = /** @type {string[]} */ ((ls(folder) ?? []).filter((f) => f.endsWith(".md")).map((f) => h1(`${folder}/${f}`)).filter(Boolean));
        } else names = [...typesByName].filter(([, types]) => types.has(target)).map(([name]) => name);
        return names.find((n) => loosely(n, value)) ?? null;
      };
```

In `held`, replace

```js
        if (!found) {
          if (!ref.optional)
            fail(`${child}: ${where} is declared \`${declared}\` and says "${value}", which names no entity in ${EX}/; ${ref.draws ? "a declared reference" : "a qualifier, like the reference it qualifies,"} must resolve (R4)`);
          return;
        }
```

with

```js
        if (!found) {
          const near = nearOf(child, /** @type {string} */ (ref.target), value);
          if (!ref.optional)
            fail(`${child}: ${where} is declared \`${declared}\` and says "${value}", which names no entity in ${EX}/; ${ref.draws ? "a declared reference" : "a qualifier, like the reference it qualifies,"} must resolve${near ? `, and the ${ref.target} it matches here is "${near}"` : ""} (R4)`);
          return;
        }
```

`held` is defined above `h1` and `nearOf` and is first called after both, in the `walkMd` below, so the order is safe.

- [ ] **Step 5: Run them and see them pass**

Run: `node --test verify/checks-owed.test.mjs` Expected: PASS.

- [ ] **Step 6: Typecheck, build, run everything, commit**

The same commands as Task 1's Step 8. The R4 message changes only where a loose match exists, so every other suite passes unchanged; a suite that fails here asserted an R4 message with a near name in it and is read before anything is changed. Commit message: subject "A reference that resolves to nothing names the term it matches", a paragraph saying the loose comparison moved from the retired check to R4, scoped to the page's own owner; `Verified:`; the trailers.

---

### Task 4: The whole run, the instances, and the pull request

**Files:**

- None changed, unless a step below fails.

- [ ] **Step 1: Bring the branch up to date with main**

```sh
git fetch origin
git log --oneline HEAD..origin/main
```

Where main has moved, merge it locally as the Implementer, with the trailers and a `Verified:` line; never with GitHub's update-branch, whose merge commit carries no trailers.

- [ ] **Step 2: Run everything**

```sh
npm ci && npm run typecheck && npm run build && npm run build:check && npm run verify
for s in $(node -p 'Object.keys(require("./package.json").scripts).filter(k=>k.startsWith("test:")).join(" ")'); do npm run -s $s || echo "FAILED $s"; done
sh conventions/conventions-format check && sh conventions/conventions-check
```

Expected: everything passes, and `git status --short` shows nothing.

- [ ] **Step 3: Run the instances**

```sh
for i in robertblust guestgraph companygraph; do node bin/check-instance.mjs /Users/rob/git/$i/mental-model; done
```

Expected: each instance whose manifest names this checker's version passes, since it still vendors the old schemas and the new declarations step aside on a table without the new columns. One that names another version is refused by the guard, and says so; that is not a failure of this change.

- [ ] **Step 4: Check the companygraph instance against the new schemas, in a scratch copy**

```sh
S=$(mktemp -d)
rsync -a --exclude .git /Users/rob/git/companygraph/mental-model/ "$S/cg/"
cp packs/software/concept-design-schema.md packs/software/domain-event-schema.md "$S/cg/meta/software/"
node -e 'const f=process.argv[1]+"/.companygraph/manifest.json",m=require(f);m.tooling=require("./package.json").version;require("fs").writeFileSync(f,JSON.stringify(m,null,2))' "$S/cg"
node bin/check-instance.mjs "$S/cg" 2>&1 | grep -v 'columns are Attribute|Type|Description; the schema declares Attribute|Term|Type|Many|Description'
```

Expected: what remains is the summary line, the two lines saying the hand-copied schemas are not as the tooling wrote them, and the not-checked line. Any other finding is read before the pull request is handed over. The migration of these rows is the instance's own pull request, after the release.

- [ ] **Step 5: Push and update the pull request**

```sh
git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push
```

Rewrite the body of companygraph/meta-model#272 to cover the build: the schemas, the three checks and what they cite, the tests, the instance runs and the companygraph scratch run, ending with a `Verified:` line naming what ran. The merge and the release are the owner's.
