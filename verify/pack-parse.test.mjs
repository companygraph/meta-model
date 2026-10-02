// A caller hands the parser one map of schemas: core's under their bare names, a pack's under its
// unit. The parser reads them as one vocabulary and labels each by the unit it came from.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSchemas, parseInstance, typeOfAddress } from "../lib/instance.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/software/${n}-schema.md`, import.meta.url), "utf8");
const schemas = () => new Map([
  ...fs.readdirSync(new URL("../core/", import.meta.url)).filter((f) => f.endsWith("-schema.md")).map((f) => [f, core(f.replace(/-schema\.md$/, ""))]),
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
