// The brand type, held by the instance checks through its real schema: core/brand-schema.md is
// read from disk so the test fails if the schema and the checks part. The source schema is bare,
// as ref-by.test.mjs has it, because only the brand file's own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const BRAND_SCHEMA = fs.readFileSync(new URL("../core/brand-schema.md", import.meta.url), "utf8");
const SOURCE_SCHEMA = ["# Source Schema", "", "> A source.", "", "## File Location", "", "`model/sources/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const TABLES = {
  Color: ["| Name | Means | Never |", "| --- | --- | --- |", "| `--c-mid` | Anything interactive | The resolved thing |"],
  Typography: ["| Face | Job |", "| --- | --- |", "| Instrument Sans | Prose |"],
  Voice: ["| Trait | Means | Never |", "| --- | --- | --- |", "| Plain | I say what happened | An adjective that sells |"],
  References: ["| What | URL |", "| --- | --- |", "| Design tokens | https://example.invalid/tokens.css |"],
};
const MARK = ["The mark is two letters, mastered in the site's favicon.", "", "- A tile is a full-bleed square."];

// A brand file from its sections: each is its heading and the lines given, in the order given.
const brand = (sections) => ["---", "source: Local", "---", "", "# Acme", "", "> What the name promises.", "",
  ...Object.entries(sections).flatMap(([h, lines]) => [`## ${h}`, "", ...lines, ""])].join("\n");
const GOOD = { Mark: MARK, ...TABLES };

const tree = (page) => new Map([
  ["meta/core/brand-schema.md", BRAND_SCHEMA],
  ["meta/core/source-schema.md", SOURCE_SCHEMA],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ...(page === null ? [] : [["model/brand.md", page]]),
]);
const about = (page, ...words) =>
  checkInstance(tree(page), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("brand.md") && words.every((w) => f.includes(w)));

test("a brand with every required section, each table with a row and the mark bulleted, passes", () => {
  assert.deepEqual(about(brand(GOOD)), []);
});

test("a required table section written as its header row alone passes the mechanical checks", () => {
  assert.deepEqual(about(brand({ ...GOOD, Color: TABLES.Color.slice(0, 2) })), []);
});

test("an instance with no brand.md fails, naming the file and the schema it is written against", () => {
  assert.equal(about(null, "model/brand.md is missing", "written against meta/core/brand-schema.md").length, 1);
});

test("a missing Voice fails", () => {
  const { Voice, ...rest } = GOOD;
  assert.equal(about(brand(rest), "no `## Voice`").length, 1);
});

test("a missing References fails, since the values live where it points", () => {
  const { References, ...rest } = GOOD;
  assert.equal(about(brand(rest), "no `## References`").length, 1);
});

test("a Color table with a column the schema does not declare fails naming the declared ones", () => {
  const color = ["| Name | Means | Hue |", "| --- | --- | --- |", "| `--c-mid` | Anything interactive | #7FA3D8 |"];
  assert.equal(about(brand({ ...GOOD, Color: color }), "\"## Color\" columns are Name|Means|Hue", "declares Name|Means|Never").length, 1);
});

test("a Mark written as a numbered list fails naming Bulleted", () => {
  const mark = ["The mark.", "", "1. A tile is a full-bleed square.", "2. The mark fills most of it."];
  assert.equal(about(brand({ ...GOOD, Mark: mark }), "## Mark", "numbered", "Bulleted").length, 1);
});

test("a Mark with no item fails, since a required list section carries at least one", () => {
  assert.equal(about(brand({ ...GOOD, Mark: ["The mark, described and never listed."] }), "## Mark", "no item").length, 1);
});
