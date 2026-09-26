// The decision type and its two companions, held by the instance checks through their real
// schemas: the three files are read from disk so the test fails if a schema and the checks part.
// The schemas they reference are bare, as ref-by.test.mjs has them, because only the decision
// file's own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, owner, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []), "## File Location", "", `\`${location}\``, ""];
const bare = (type, owner, location) => [...head(type, owner, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const ALTERNATIVES = ["| Option | Why not |", "| --- | --- |", "| Resolve core at read time | The vocabulary would move under every model at once. |"];
const decision = (name, fm, { sections = ["The question", "Why", "Consequences"], alternatives = ALTERNATIVES, bearsOn = null } = {}) => [
  "---", ...fm, "---", "", `# ${name}`, "", "> The call.", "",
  "## The question", "", "Prose.", "",
  "## Alternatives", "", ...alternatives, "",
  ...sections.filter((s) => s !== "The question").flatMap((s) => [`## ${s}`, "", "Prose.", ""]),
  ...(bearsOn ? ["## Bears on", "", "| Type | Entity | Owner | How |", "| --- | --- | --- | --- |", ...bearsOn.map((r) => `| ${r.join(" | ")} |`), ""] : []),
].join("\n");
const GOOD = ["source: Local", "decided: 2026-08-25", "kind: Architecture", "status: Standing", "by: Owner", "upholds:", "  - Craftsmanship", "serves:", "  - Every model is served", "supersedes:", "  - Core is a submodule"];

const tree = (fm, opts, filename = "2026-vendored-core.md") => new Map([
  ["meta/core/decision-schema.md", real("decision")],
  ["meta/core/decision-kind-schema.md", real("decision-kind")],
  ["meta/core/decision-status-schema.md", real("decision-status")],
  ["meta/core/source-schema.md", bare("source", null, "model/sources/*.md")],
  ["meta/core/role-schema.md", bare("role", null, "model/roles/*.md")],
  ["meta/core/value-schema.md", bare("value", null, "model/values/*.md")],
  ["meta/core/strategic-objective-schema.md", bare("strategic-objective", null, "model/strategic-objectives/*.md")],
  ["meta/core/concept-schema.md", bare("concept", null, "model/concepts/*.md")],
  ["meta/core/profile-schema.md", bare("profile", null, "model/profiles/<profile>/<profile>.md")],
  // An experience's filename begins with its `start`, so the fixture's declares and carries one:
  // the clean tree then reports nothing an `about()` filter would have to hide.
  ["meta/core/experience-schema.md", [...head("experience", "profile", "model/profiles/<profile>/experiences/*.md"),
    "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |",
    "| `start` | Yes | date | When it began. |", "",
    "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/roles/owner.md", "# Owner\n\n> The seat.\n"],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/strategic-objectives/every-model-is-served.md", "# Every model is served\n\n> What must become true.\n"],
  ["model/concepts/core.md", "# Core\n\n> The shipped unit.\n"],
  ["model/profiles/mira-halvorsen/mira-halvorsen.md", "# Mira Halvorsen\n\n> Engineer.\n"],
  ["model/profiles/mira-halvorsen/experiences/2022-beacon.md", "---\nstart: 2022-02\n---\n\n# Splitting the billing domain\n\n> A period.\n"],
  ["model/decision-kinds/architecture.md", "---\nsource: Local\n---\n\n# Architecture\n\n> How the tooling is built.\n\n## What it means\n\nProse.\n"],
  ["model/decision-statuses/standing.md", "---\nsource: Local\n---\n\n# Standing\n\n> Holds as written.\n\n## What it means\n\nProse.\n"],
  ["model/decisions/2026-submodule.md", decision("Core is a submodule", ["source: Local", "decided: 2026-08-20", "kind: Architecture", "status: Standing", "by: Owner"])],
  [`model/decisions/${filename}`, decision("Core is vendored at a named release", fm, opts)],
]);
const about = (fm, opts, filename, ...words) =>
  checkInstance(tree(fm, opts, filename), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("decisions/") && !f.includes("2026-submodule.md") && words.every((w) => f.includes(w)));

test("a decision with every required field and section, upholding a value and superseding another, passes", () => {
  assert.deepEqual(about(GOOD), []);
});

test("the clean fixture reports nothing about its experience, so the filter above hides no unrelated failure", () => {
  const all = checkInstance(tree(GOOD), { core: "meta/core", model: "model" }).failures;
  assert.deepEqual(all.filter((f) => f.includes("experiences/")), []);
});

test("a Bears on table naming a concept and an owned experience with its owner passes", () => {
  assert.deepEqual(about(GOOD, { bearsOn: [["concept", "Core", "", "changed it"], ["experience", "Splitting the billing domain", "Mira Halvorsen", "made it"]] }), []);
});

test("an Alternatives table written as its header row alone passes the mechanical checks; the writing rule refuses it", () => {
  assert.deepEqual(about(GOOD, { alternatives: ALTERNATIVES.slice(0, 2) }), []);
});

test("a filename whose year is not the year in decided fails naming both", () => {
  assert.equal(about(GOOD, undefined, "2025-vendored-core.md", "begins with 2025", "`decided` says 2026-08-25").length, 1);
});

test("a filename that is not <year>-<slug> fails", () => {
  assert.equal(about(GOOD, undefined, "vendored-core.md", "<year>-<slug>.md").length, 1);
});

test("a missing kind fails", () => {
  assert.equal(about(GOOD.filter((l) => !l.startsWith("kind")), undefined, undefined, "no `kind`").length, 1);
});

test("a kind naming no decision kind fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("kind: Architecture", "kind: Pricing")), undefined, undefined, "\"Pricing\"").length, 1);
});

test("a status naming no decision status fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("status: Standing", "status: Taken")), undefined, undefined, "\"Taken\"").length, 1);
});

test("a by naming no role fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("by: Owner", "by: Mira Halvorsen")), undefined, undefined, "\"Mira Halvorsen\"").length, 1);
});

test("a serves naming no strategic objective fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Every model is served", "  - Every model is sold")), undefined, undefined, "\"Every model is sold\"").length, 1);
});

test("a supersedes naming no decision fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Core is a submodule", "  - Core is fetched nightly")), undefined, undefined, "\"Core is fetched nightly\"").length, 1);
});

test("a Bears on row whose Type names no type fails", () => {
  assert.equal(about(GOOD, { bearsOn: [["widget", "Core", "", "changed it"]] }, undefined, "widget").length, 1);
});

test("a Bears on row naming an experience with no Owner fails as an owned type without its owner", () => {
  assert.equal(about(GOOD, { bearsOn: [["experience", "Splitting the billing domain", "", "made it"]] }, undefined, "experience").length, 1);
});

test("an Alternatives table with a column the schema does not declare fails naming the declared ones", () => {
  const alternatives = ["| Option | Cost | Why not |", "| --- | --- | --- |", "| Read time | High | Moves under every model. |"];
  assert.equal(about(GOOD, { alternatives }, undefined, "\"## Alternatives\" columns are Option|Cost|Why not", "declares Option|Why not").length, 1);
});

test("a missing Why fails", () => {
  assert.equal(about(GOOD, { sections: ["The question", "Consequences"] }, undefined, "no `## Why`").length, 1);
});
