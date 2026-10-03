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
