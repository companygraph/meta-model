// A required section declared Table. carries at least one row, as a required list section carries
// at least one item (R16). Fed fixture maps: the schema is a seat's only because a schema has to
// be of a type the checks know; what is declared is what is held, and no check names the type.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const seatSchema = (rows, tables = []) => ["# Seat Schema", "", "> A seat.", "", "## File Location", "", "`model/seats/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ...rows, "", ...tables, ""].join("\n");

const columns = (section) => [`\`## ${section}\` is a table with these columns:`, "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Outcome` | Yes | string | What is decided. |", ""];

const SCHEMA = seatSchema(
  ["| `## If not met` | Yes | Table. What is decided. |", "| `## Notes` | No | Table. Anything. |"],
  [...columns("If not met"), ...columns("Notes")],
);

const seat = (sections) => ["# Reviewer", "", "> Reads what was built.", "", ...Object.entries(sections).flatMap(([h, body]) => [`## ${h}`, "", body, ""])].join("\n");
const failuresOf = (page, schema = SCHEMA) =>
  checkInstance(new Map([["meta/core/seat-schema.md", schema], ["model/seats/reviewer.md", page]]), { core: "meta/core", model: "model" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

const HEADER = "| Outcome |\n| --- |";

test("a required table section with one row reports nothing", () => {
  assert.deepEqual(about(failuresOf(seat({ "If not met": `${HEADER}\n| dropped |` })), "has no row"), []);
});

test("a required table section with its header and no row fails once, naming the page, the section and R16", () => {
  const hit = about(failuresOf(seat({ "If not met": HEADER })), "## If not met", "has no row");
  assert.equal(hit.length, 1, hit.join("\n"));
  assert.match(hit[0], /^model\/seats\/reviewer\.md: /);
  assert.match(hit[0], /\(R16\)/);
});

test("a required table section holding prose and no table fails the same way", () => {
  assert.equal(about(failuresOf(seat({ "If not met": "The Owner decides." })), "## If not met", "has no row").length, 1);
});

test("an optional table section may be present with no row", () => {
  assert.deepEqual(about(failuresOf(seat({ "If not met": `${HEADER}\n| dropped |`, Notes: HEADER })), "## Notes"), []);
});

test("an absent required section is the required-sections check's single finding, not this one's", () => {
  const failures = failuresOf(seat({}));
  assert.deepEqual(about(failures, "has no row"), []);
  assert.equal(about(failures, "no `## If not met`").length, 1);
});

const PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");
const PHASE_SCHEMA = ["# Phase Schema", "", "> A phase.", "", "**Owner:** process", "", "## File Location", "", "`model/processes/<process>/phases/*.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "| `gate-to` | No | ref → phase | Next. |", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", "| `# [Phase]` | Yes | The name. |", ""].join("\n");

const processFailures = (phasesBody) => checkInstance(new Map([
  ["meta/core/process-schema.md", PROCESS_SCHEMA],
  ["meta/core/phase-schema.md", PHASE_SCHEMA],
  ["model/processes/delivery/delivery.md", `# Delivery\n\n> A process.\n\n## Phases\n\n${phasesBody}\n`],
  ["model/processes/delivery/phases/build.md", "---\n---\n\n# Build\n\n> A phase.\n"],
]), { core: "meta/core" }).failures.filter((f) => f.includes('"## Phases"') || f.includes("## Phases"));

test("an owner's listing with a header and no row is this check's finding", () => {
  assert.equal(about(processFailures("| Phase |\n| --- |"), "has no row").length, 1);
});

test("an owner's listing holding no table stays the listing check's single finding", () => {
  const failures = processFailures("- Build");
  assert.deepEqual(about(failures, "has no row"), []);
  assert.equal(about(failures, "holds no table").length, 1);
});
