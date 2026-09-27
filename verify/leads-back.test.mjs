// A table on a page naming an entity of the page's own type, where that type is owned and
// ordered by a successor field, names the page's own entity or one before it in the owner's
// order. It hangs on what the schemas declare: an owned type with a field `ref → <itself>`, and a
// column of that type's own table declared `ref → <itself>`. No type is named.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

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

const PHASE_SCHEMA = [
  "# Phase Schema", "", "> A phase.", "", "**Owner:** process", "",
  "## File Location", "", "`model/processes/<process>/phases/*.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `gate-to` | No | ref → phase | Next. |", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
  "| `# [Phase]` | Yes | The name. |",
  "| `## If not met` | Yes | Table. What is decided, and where the work goes. |", "",
  "`## If not met` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Outcome` | Yes | string | What is decided. |",
  "| `Leads to` | No | ref → phase | Where the work goes. |", "",
].join("\n");

const phase = (name, next, rows) => [
  "---", ...(next ? [`gate-to: ${next}`] : []), "---", "", `# ${name}`, "", "> A phase.", "",
  "## If not met", "", "| Outcome | Leads to |", "| --- | --- |", ...rows.map(([o, t]) => `| ${o} | ${t ?? ""} |`), "",
].join("\n");

const run = (phases, extra = [], phaseSchema = PHASE_SCHEMA) => checkInstance(new Map([
  ["meta/core/process-schema.md", PROCESS_SCHEMA],
  ["meta/core/phase-schema.md", phaseSchema],
  ["model/processes/delivery/delivery.md", "# Delivery\n\n> A process.\n\n## Phases\n\n| Phase |\n| --- |\n| Specify |\n| Build |\n| Release |\n"],
  ...phases.map(([file, name, next, rows]) => [`model/processes/delivery/phases/${file}.md`, phase(name, next, rows)]),
  ...extra,
]), { core: "meta/core" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

const OK = [
  ["specify", "Specify", "Build", [["reshaped", "Specify"], ["dropped"]]],
  ["build", "Build", "Release", [["reworked", "Build"], ["respecified", "Specify"]]],
  ["release", "Release", null, [["rolled back"]]],
];

test("rows that stay, go back or stop report nothing", () => {
  assert.deepEqual(about(run(OK), "comes after"), []);
});

test("a row naming a later phase fails once, naming the page, the row's target, its own phase and R16", () => {
  const phases = OK.map((p) => (p[1] === "Specify" ? [p[0], p[1], p[2], [["skipped", "Release"]]] : p));
  const hit = about(run(phases), "comes after");
  assert.equal(hit.length, 1, hit.join("\n"));
  assert.match(hit[0], /^model\/processes\/delivery\/phases\/specify\.md: /);
  assert.ok(hit[0].includes('"Release"') && hit[0].includes('"Specify"') && hit[0].includes("## If not met"), hit[0]);
  assert.match(hit[0], /\(R16\)/);
});

test("a row naming the very next phase fails too: the happy path is gate-to's", () => {
  const phases = OK.map((p) => (p[1] === "Build" ? [p[0], p[1], p[2], [["passed", "Release"]]] : p));
  assert.equal(about(run(phases), "comes after", '"Release"').length, 1);
});

test("a row naming another process's phase of the same name is R4's one finding, never this check's", () => {
  const phases = OK.map((p) => (p[1] === "Specify" ? [p[0], p[1], p[2], [["handed over", "Audit"]]] : p));
  const failures = run(phases, [
    ["model/processes/review/review.md", "# Review\n\n> A process.\n\n## Phases\n\n| Phase |\n| --- |\n| Audit |\n"],
    ["model/processes/review/phases/audit.md", phase("Audit", null, [["dropped"]])],
  ]);
  assert.deepEqual(about(failures, "comes after"), []);
  assert.ok(failures.some((f) => f.includes("specify.md") && f.includes('"Audit"')), failures.join("\n"));
});

test("a page its owner does not list is held to nothing here: the listing check names it", () => {
  const failures = run([...OK, ["audit", "Audit", null, [["skipped", "Release"]]]]);
  assert.deepEqual(about(failures, "comes after"), []);
});

test("a column declared ref? → phase is held to order too", () => {
  const OPTIONAL_LEADS_TO = PHASE_SCHEMA.replace(
    "| `Leads to` | No | ref → phase | Where the work goes. |",
    "| `Leads to` | No | ref? → phase | Where the work goes. |",
  );
  const phases = OK.map((p) => (p[1] === "Specify" ? [p[0], p[1], p[2], [["skipped", "Release"]]] : p));
  const hit = about(run(phases, [], OPTIONAL_LEADS_TO), "comes after");
  assert.equal(hit.length, 1, hit.join("\n"));
});
