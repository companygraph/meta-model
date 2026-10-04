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
  [`${BC}/billing/concept-designs/invoice.md`, page("kind: entity\nrefines: Invoice\n", "# Invoice\n\n> The document a customer is asked to pay, once issued.\n\n## Attributes\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n| Total | Amount | | | What is owed |\n\n## Relations\n\n| Concept | Cardinality | As |\n| --- | --- | --- |\n| Amount | one | |\n")],
  [`${BC}/billing/concept-designs/amount.md`, page("kind: value object\n", "# Amount\n\n> A sum in one currency.\n")],
  [AGG, page("root: Invoice\nmembers:\n  - Amount\n", "# Invoice\n\n> An invoice and its total change together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| INV-B1 | An issued invoice's total never changes. |\n| INV-B2 | An invoice names one customer. |\n")],
  [`${BC}/billing/domain-events/invoice-issued.md`, page("emitted-by: Invoice\n", "# Invoice issued\n\n> An invoice was issued to a customer.\n\n## Payload\n\n| Attribute | Term | Type | Many | Description |\n| --- | --- | --- | --- | --- |\n| Invoice | Invoice | | | The issued invoice |\n| Issued at | | timestamp | | When it was issued |\n")],
  ...["concept-designs", "aggregates", "domain-events"].map((f) => [`${BC}/notification/${f}/README.md`, `# ${f}\n\n> Nothing yet.\n`]),
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
