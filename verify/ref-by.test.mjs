// A reference whose type is read from its row (R9), held by the instance checks cell by cell:
// the type cell names a declared type, an owned type names its owner and an unowned one does
// not, and the name resolves within that owner. Fixture maps as declared-joins.test.mjs has
// them; the question type is used because a schema must be of a type the checks list, and no
// check names it.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const head = (type, owner, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []), "## File Location", "", `\`${location}\``, ""];
const bare = (type, owner, location) => [...head(type, owner, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const QUESTION_SCHEMA = [...head("question", null, "model/questions/*.md"), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Rests on` | No | Table. One row per entity. |", "",
  "`## Rests on` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Type` | Yes | string | The type. |",
  "| `Entity` | Yes | ref → by Type in Owner | The entity. |",
  "| `Owner` | No | string | The owner, where the type is owned. |",
  "| `For` | No | string | What it carries. |", ""].join("\n");

const question = (rows) => ["# Who splits the billing domain?", "", "> Look at the period.", "",
  ...(rows ? ["## Rests on", "", "| Type | Entity | Owner | For |", "| --- | --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`), ""] : [])].join("\n");

const tree = (rows) => new Map([
  ["meta/core/question-schema.md", QUESTION_SCHEMA],
  ["meta/core/value-schema.md", bare("value", null, "model/values/*.md")],
  ["meta/core/profile-schema.md", bare("profile", null, "model/profiles/<profile>/<profile>.md")],
  ["meta/core/experience-schema.md", bare("experience", "profile", "model/profiles/<profile>/experiences/*.md")],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/profiles/mira-halvorsen/mira-halvorsen.md", "# Mira Halvorsen\n\n> Engineer.\n"],
  ["model/profiles/mira-halvorsen/experiences/2022-beacon.md", "# Splitting the billing domain\n\n> A period.\n"],
  ["model/profiles/tomas-reyes/tomas-reyes.md", "# Tomas Reyes\n\n> Designer.\n"],
  ["model/questions/who-splits-the-billing-domain.md", question(rows)],
]);
const about = (rows, ...words) =>
  checkInstance(tree(rows), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("questions/who-splits-the-billing-domain.md") && words.every((w) => f.includes(w)));
const all = (rows) => about(rows);

test("rows that name a declared type, and an owner exactly where the type is owned, pass", () => {
  assert.deepEqual(all([["value", "Craftsmanship", "", "why"], ["`experience`", "Splitting the billing domain", "Mira Halvorsen", "the period"]]), []);
});

test("a question with no Rests on passes", () => {
  assert.deepEqual(all(null), []);
});

test("a type cell naming no declared type fails", () => {
  assert.equal(about([["valu", "Craftsmanship", "", ""]], "\"valu\"", "no schema").length, 1);
});

test("an unowned name that resolves to nothing fails", () => {
  assert.equal(about([["value", "Kindness", "", ""]], "\"Kindness\"", "names no value").length, 1);
});

test("an owned type with no owner fails, naming the owner type", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "", ""]], "which a profile owns").length, 1);
});

test("an unowned type with an owner fails", () => {
  assert.equal(about([["value", "Craftsmanship", "Mira Halvorsen", ""]], "nothing owns a value").length, 1);
});

test("an owner that names nothing fails", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "Ada Vance", ""]], "\"Ada Vance\"", "names no profile").length, 1);
});

test("an owned name is looked for only within the owner the row names", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "Tomas Reyes", ""]], "names no experience of profile \"Tomas Reyes\"").length, 1);
});
