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
  assert.equal(failuresOf({ rule }, "must-not", "must not").length, 1);
});

test("a modality of `must not`, with the space, passes", () => {
  const rule = RULE_FM.map((l) => l.replace("modality: must", "modality: must not"));
  assert.deepEqual(failuresOf({ rule }), []);
});

test("an Applies to row naming a value passes mechanically; the writing rule is the agent pass's to hold", () => {
  assert.deepEqual(failuresOf({ ruleSections: [["Why", ["Prose."]], appliesTo([["value", "Craftsmanship", ""]])] }), []);
  assert.deepEqual(failuresOf({ controlSections: [["How it is carried out", ["Prose."]], appliesTo([["value", "Craftsmanship", ""]])] }), []);
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
