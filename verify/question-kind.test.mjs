// The question kind and the question's kind, held by the instance checks through their real
// schemas: both files are read from disk so the test fails if a schema and the checks part. The
// schemas they reference are bare, as ref-by.test.mjs has them, and a decision kind named like a
// question kind is there to prove the reference resolves by its declared type.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kind = (name, rank, { meaning = true } = {}) => ["---", "source: Local", `rank: ${rank}`, "---", "", `# ${name}`, "", "> What these questions are about.", "",
  ...(meaning ? ["## What it means", "", "Prose.", ""] : [])].join("\n");
const question = (name, fm) => ["---", ...fm, "---", "", `# ${name}`, "", "> Where the answer lies.", ""].join("\n");

const tree = ({ kinds = [["Product", 10], ["Company", 20]], fm = ["source: Local", "kind: Product"], missingMeaning = false } = {}) => new Map([
  ["meta/core/question-kind-schema.md", real("question-kind")],
  ["meta/core/question-schema.md", real("question")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/decision-kind-schema.md", bare("decision-kind", "model/decision-kinds/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/decision-kinds/architecture.md", "# Architecture\n\n> How it is built.\n"],
  ...kinds.map(([n, r], i) => [`model/question-kinds/${n.toLowerCase()}.md`, kind(n, r, { meaning: !(missingMeaning && i === 0) })]),
  ["model/questions/who-split-billing.md", question("Who split billing?", fm)],
  ["model/questions/does-beacon-publish-its-revenue.md", question("Does Beacon publish its revenue?", ["source: Local", "kind: Company"])],
]);
const failures = (opts) => checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures;
const about = (where, opts, ...words) => failures(opts).filter((f) => f.includes(where) && words.every((w) => f.includes(w)));

test("a question naming a kind, and kinds with distinct ranks and every section, pass", () => {
  assert.deepEqual(about("question", undefined), []);
});

test("a question with no kind fails", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local"] }, "no `kind`").length, 1);
});

test("a kind naming no question kind fails", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local", "kind: Pricing"] }, "\"Pricing\"").length, 1);
});

test("a kind naming a decision kind of that name fails, because the reference resolves by its declared type", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local", "kind: Architecture"] }, "\"Architecture\"").length, 1);
});

test("two question kinds sharing a rank fail naming both", () => {
  assert.equal(about("question-kind", { kinds: [["Product", 10], ["Company", 10]] }, "share rank 10", "\"Product\"", "\"Company\"").length, 1);
});

test("a rank that is not a number fails", () => {
  assert.equal(about("question-kinds/product.md", { kinds: [["Product", "first"], ["Company", 20]] }, "rank").length, 1);
});

test("a question kind with no What it means fails, so the folder is read", () => {
  assert.equal(about("question-kinds/product.md", { missingMeaning: true }, "no `## What it means`").length, 1);
});
