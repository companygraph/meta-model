// The data-processor, processing-activity and stored-item types, held by the instance checks
// through their real schemas: the three files are read from disk, and the passing case holds them
// to no failure the instance checks raise against a schema, such as an enum that lists no tokens.
// Their shape is verify's to hold. The schemas they reference are bare, as rule-risk-control.test.mjs
// has them, because only these three types' own failures are asserted.
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
const schemaFailures = () =>
  checkInstance(tree(), { core: "meta/core", model: "model" }).failures
    .filter((f) => /meta\/core\/(data-processor|processing-activity|stored-item)-schema\.md/.test(f));
const swap = (lines, from, to) => lines.map((l) => (l === from ? to : l));

test("a processor, an activity naming it and a stored item naming both, with every required field and section, pass", () => {
  assert.deepEqual(failuresOf(), []);
  assert.deepEqual(schemaFailures(), []);
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

test("a mechanism written as the code writes it fails, naming the value and the permitted ones", () => {
  const item = swap(ITEM_FM, "mechanism: session-storage", "mechanism: sessionStorage");
  assert.equal(failuresOf({ item }, "sessionStorage", "`local-storage`", "`session-storage`").length, 1);
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

test("a processor that may process in any country it chooses says processing any, and passes", () => {
  assert.deepEqual(failuresOf({ proc: [...PROC_FM, "processing: any"] }), []);
  assert.deepEqual(failuresOf({ proc: [...PROC_FM, "processing: fixed"] }), []);
});

test("a processing value outside fixed and any fails, naming the value and the permitted ones", () => {
  assert.equal(failuresOf({ proc: [...PROC_FM, "processing: global"] }, "global", "`fixed`", "`any`").length, 1);
});
