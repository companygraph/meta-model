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

test("a type matching a term only by a plural in -ies fails, and a leading list of is read in any case", () => {
  const terms = (cell) => typeCells(billing(design("billing", "Policy", "value object"), design("billing", "Category", "value object"),
    design("billing", "Line", "value object", attributes([cell]))));
  for (const [cell, near] of [["Policies", "Policy"], ["categories", "Category"], ["List of Amounts", "Amount"]]) {
    const f = terms(cell);
    assert.equal(f.length, 1, cell);
    assert.match(f[0], new RegExp(`the concept-design it matches here is "${near}"; a type names a term exactly`), cell);
  }
  assert.deepEqual(terms("List of Amount"), []);
  assert.equal(terms("LIST OF Invoice").length, 1);
});

test("an attribute matching an entity only loosely is told an entity is a relation, and a payload is told to name it exactly", () => {
  const f = typeCells(billing(design("billing", "Line", "value object", attributes(["invoice"]))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /line\.md: `Type` in "## Attributes" says "invoice", which matches "Invoice", a concept-design of kind `entity`; a type names one of kind `value object`, and any other is a relation \(R16\)/);
  const p = typeCells(billing(event("billing", "Invoice issued", ["invoice"])));
  assert.equal(p.length, 1, p.join("\n"));
  assert.match(p[0], /the concept-design it matches here is "Invoice"; a type names a term exactly/);
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

test("a rule naming one entity twice, its type written in another case, is still one entity, and fails", () => {
  assert.equal(binds(rules(["role | Reviewer | ", "Role | Reviewer | "])).length, 1);
});

test("two rows differing only by their owner name two entities, and pass", () => {
  assert.deepEqual(binds(rules(["phase | Review | Delivery", "phase | Review | Release"])), []);
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
const replaced = (files) => run(files).failures.filter((f) => f.includes("carries one") || f.includes("still "));

test("superseded calls sharing one status that no standing call carries pass, and so does an instance with no supersedes", () => {
  assert.deepEqual(replaced(decisions([["A", "Replaced"], ["B", "Replaced"], ["C", "Standing", ["A", "B"]]])), []);
  assert.deepEqual(replaced(decisions([["A", "Standing"], ["B", "Proposed"]])), []);
});

test("superseded calls carrying two statuses fail once, naming each status and its pages", () => {
  assert.deepEqual(replaced(decisions([["A", "Replaced"], ["B", "Dropped"], ["C", "Standing", ["A", "B"]]])), [
    'the decision entities another names in `supersedes` carry 2 values of `status`: "Replaced" (model/decisions/2026-d0.md); "Dropped" (model/decisions/2026-d1.md); a replaced decision carries one (R16)',
  ]);
});

test("a replaced call still carrying the status most calls not superseded carry fails on it alone", () => {
  assert.deepEqual(replaced(decisions([["A", "Standing"], ["B", "Standing", ["A"]], ["C", "Standing"], ["D", "Standing"]])), [
    'model/decisions/2026-d0.md: superseded by B and still carries "Standing", which most decisions not superseded carry; a replaced decision carries the status the instance keeps for one (R16)',
  ]);
});

test("dropped and replaced calls may share one status while most calls stand", () => {
  assert.deepEqual(replaced(decisions([["A", "Retired"], ["B", "Retired"], ["C", "Standing", ["A"]], ["D", "Standing"], ["E", "Standing"]])), []);
});

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

// Every person here carries identity's mail, so the person who claims every required skill and is
// never noted, in the case above, is the mail half of this one.
test("a person's mail equal to identity's is two facts and never noted, and an agent's page is not read", () => {
  assert.deepEqual(notesOf(people({ nature: "agent", location: "Rotterdam", urls: ["https://beacon.example"] })), []);
});
