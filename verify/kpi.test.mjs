// The kpi type, held by the instance checks through its real schema: core/kpi-schema.md is read
// from disk so the test fails if the schema and the checks part. The schemas it references are
// bare, as ref-by.test.mjs has them, because only the kpi file's own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInstance } from "../lib/instance.mjs";

const KPI_SCHEMA = fs.readFileSync(new URL("../core/kpi-schema.md", import.meta.url), "utf8");
const bare = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  "## File Location", "", `\`${location}\``, "", "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kpi = (name, fm, sections = ["How it is measured", "What it can hide"]) => [
  "---", ...fm, "---", "", `# ${name}`, "", "> What it measures.", "",
  ...sections.flatMap((s) => [`## ${s}`, "", "Prose.", ""])].join("\n");
const GOOD = ["source: Local", "owner: Owner", "measures: Delivery", "unit: hours", "direction: lower", "read-with:", "  - Change Fail Rate", "can-cost:", "  - Craftsmanship"];

const tree = (fm, sections) => new Map([
  ["meta/core/kpi-schema.md", KPI_SCHEMA],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/role-schema.md", bare("role", "model/roles/*.md")],
  ["meta/core/process-schema.md", bare("process", "model/processes/<process>/<process>.md")],
  ["meta/core/strategic-objective-schema.md", bare("strategic-objective", "model/strategic-objectives/*.md")],
  ["meta/core/value-schema.md", bare("value", "model/values/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/roles/owner.md", "# Owner\n\n> The seat.\n"],
  ["model/processes/delivery/delivery.md", "# Delivery\n\n> How things ship.\n"],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/kpis/change-fail-rate.md", kpi("Change Fail Rate", ["source: Local", "owner: Owner", "unit: percent of deployments", "direction: lower"])],
  ["model/kpis/change-lead-time.md", kpi("Change Lead Time", fm, sections)],
]);
const about = (fm, sections, ...words) =>
  checkInstance(tree(fm, sections), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("kpis/") && words.every((w) => f.includes(w)));

test("a KPI with every required field and section, naming another in read-with, passes", () => {
  assert.deepEqual(about(GOOD), []);
});

test("a KPI whose read-with names itself passes; the writing rule, not the checker, refuses it", () => {
  assert.deepEqual(about(GOOD.map((l) => l.replace("  - Change Fail Rate", "  - Change Lead Time"))), []);
});

test("a direction outside its three tokens fails and names them", () => {
  assert.equal(about(GOOD.map((l) => l.replace("lower", "sideways")), undefined, "\"sideways\"", "`lower`, `higher`, `target`").length, 1);
});

test("a direction in capitals fails, as any other token outside the list", () => {
  assert.equal(about(GOOD.map((l) => l.replace("lower", "Lower")), undefined, "\"Lower\"").length, 1);
});

test("a missing owner fails", () => {
  assert.equal(about(GOOD.filter((l) => !l.startsWith("owner")), undefined, "no `owner`").length, 1);
});

test("an empty unit fails as a required field", () => {
  assert.equal(about(GOOD.map((l) => (l.startsWith("unit") ? "unit:" : l)), undefined, "`unit`").length, 1);
});

test("a quoted empty unit fails the same way, whichever quote it is written in", () => {
  for (const quoted of ['unit: ""', "unit: ''"])
    assert.equal(about(GOOD.map((l) => (l.startsWith("unit") ? quoted : l)), undefined, "`unit`").length, 1);
});

test("a read-with naming no KPI fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Change Fail Rate", "  - Uptime")), undefined, "\"Uptime\"").length, 1);
});

test("a missing What it can hide fails", () => {
  assert.equal(about(GOOD, ["How it is measured"], "no `## What it can hide`").length, 1);
});

test("a can-cost naming no value fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Craftsmanship", "  - Speed")), undefined, "\"Speed\"").length, 1);
});

test("a can-cost naming a KPI, not a value, fails: a reference resolves by its declared type", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Craftsmanship", "  - Change Fail Rate")), undefined, "\"Change Fail Rate\"").length, 1);
});

test("a can-cost written as a flow sequence fails under R11", () => {
  const fm = GOOD.filter((l) => l !== "  - Craftsmanship").map((l) => (l === "can-cost:" ? "can-cost: [Craftsmanship]" : l));
  assert.equal(about(fm, undefined, "`can-cost` is a flow sequence").length, 1);
});

test("a KPI without can-cost passes, since the field is optional", () => {
  assert.deepEqual(about(GOOD.filter((l) => l !== "can-cost:" && l !== "  - Craftsmanship")), []);
});

// The example read the way a site reads it: every page under example/model and every schema
// under core, so the edge is drawn by the parser from the real schema and not by the test.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const folder = (rel) => {
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(join(ROOT, rel, d))) {
      const child = d ? `${d}/${name}` : name;
      if (statSync(join(ROOT, rel, child)).isDirectory()) walk(child);
      else if (child.endsWith(".md")) out.set(child, fs.readFileSync(join(ROOT, rel, child), "utf8"));
    }
  };
  walk("");
  return out;
};

test("the example's Change Lead Time names Craftsmanship, and the parser draws the edge", () => {
  const { entities, edges } = parseInstance(folder("example/model"), { sub: "model/", schemas: folder("core") });
  // The example's pages carry ids (R18), so an edge names its ends by them; found by address.
  const at = (address) => entities.find((e) => e.address === address).id;
  const costs = edges.filter((e) => e.via === "can-cost").map(({ from, to }) => ({ from, to }));
  assert.deepEqual(costs, [{ from: at("kpis/change-lead-time"), to: at("values/craftsmanship") }]);
});

test("two values under can-cost draw two edges", () => {
  const files = folder("example/model");
  const page = files.get("kpis/change-lead-time.md");
  files.set("kpis/change-lead-time.md", page.replace("  - Craftsmanship\n", "  - Craftsmanship\n  - Say The Hard Thing\n"));
  const { entities, edges } = parseInstance(files, { sub: "model/", schemas: folder("core") });
  const at = (address) => entities.find((e) => e.address === address).id;
  assert.deepEqual(edges.filter((e) => e.via === "can-cost").map((e) => e.to).sort(), [at("values/craftsmanship"), at("values/say-the-hard-thing")].sort());
});
