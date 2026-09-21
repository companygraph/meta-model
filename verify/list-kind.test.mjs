// A section's declared list kind, and the check that holds a page to it. Fed fixture maps, as
// the other instance-check tests are, because `example/` was written to pass and shows nothing
// of what a check catches. The schema in these fixtures is a role's only because a schema has
// to be of a type the checks know: what is declared is what is held, and no check names it.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkInstance, sectionsOf, blocksOf, IMAGE_FILE } from "../lib/checks.mjs";

const roleSchema = (rows) => ["# Role Schema", "", "> A seat.", "", "## File Location", "", "`model/roles/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ...rows, ""].join("\n");

const SCHEMA = roleSchema([
  "| `## What it never does` | Yes | Bulleted. One sentence each, of what the seat refuses. |",
  "| `## Steps` | No | Numbered. What the seat does, in order. |",
  "| `## Notes` | No | Whatever the holder wants said. |",
]);

const role = (sections) => ["# Reviewer", "", "> Reads what was built.", "", ...Object.entries(sections).flatMap(([h, body]) => [`## ${h}`, "", body, ""])].join("\n");
const failuresOf = (page, schema = SCHEMA) =>
  checkInstance(new Map([["meta/core/role-schema.md", schema], ["model/roles/reviewer.md", page]]), { core: "meta/core", model: "model" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

test("a section written in its declared kind reports nothing", () => {
  const failures = failuresOf(role({ "What it never does": "- Never merges.\n- Never rewrites history.", Steps: "1. Read.\n2. Report." }));
  assert.deepEqual(about(failures, "reviewer.md", "list"), []);
});

test("a numbered item in a section declared Bulleted fails, naming the section and both kinds", () => {
  const hit = about(failuresOf(role({ "What it never does": "1. Never merges.\n2. Never rewrites history." })), "## What it never does", "numbered", "Bulleted");
  assert.equal(hit.length, 1, "one finding for the section, however many items");
  assert.match(hit[0], /reviewer\.md/);
  assert.match(hit[0], /\(R16\)/);
});

test("a bullet in a section declared Numbered fails the same way round", () => {
  const hit = about(failuresOf(role({ "What it never does": "- Never merges.", Steps: "- Read.\n- Report." })), "## Steps", "bullet", "Numbered");
  assert.equal(hit.length, 1);
});

test("one item of the wrong kind among right ones is enough", () => {
  assert.equal(about(failuresOf(role({ "What it never does": "- Never merges.\n1. Never rewrites history." })), "## What it never does", "Bulleted").length, 1);
});

test("the kind governs the list and not the section: paragraphs around it are free", () => {
  const gate = "To leave, all of these hold:\n\n- The checks pass.\n- The findings are resolved.\n\nWhere they cannot be met, the Owner decides.";
  assert.deepEqual(about(failuresOf(role({ "What it never does": gate })), "## What it never does"), []);
});

test("an indented item is a sub-point and may be of either kind, and a fenced block is not read", () => {
  const body = "- Never merges.\n  1. Not on Friday.\n  2. Not on any day.\n\n```text\n1. an example, not an item\n```";
  assert.deepEqual(about(failuresOf(role({ "What it never does": body })), "## What it never does"), []);
});

test("a required section that declares a kind carries at least one item", () => {
  const hit = about(failuresOf(role({ "What it never does": "It refuses a great deal." })), "## What it never does", "no item");
  assert.equal(hit.length, 1);
  assert.match(hit[0], /\(R16\)/);
});

test("an optional section that declares a kind may be absent, and present with prose alone is held to nothing more", () => {
  assert.deepEqual(about(failuresOf(role({ "What it never does": "- Never merges." })), "## Steps"), []);
  assert.deepEqual(about(failuresOf(role({ "What it never does": "- Never merges.", Steps: "Nothing in order yet." })), "## Steps"), []);
});

test("a section that declares no kind is held to nothing, whatever it holds", () => {
  assert.deepEqual(about(failuresOf(role({ "What it never does": "- Never merges.", Notes: "1. One.\n- Two.\n2. Three." })), "## Notes"), []);
  const undeclared = roleSchema(["| `## What it never does` | Yes | A list, one sentence each. |"]);
  assert.deepEqual(about(failuresOf(role({ "What it never does": "1. Never merges." }), undeclared), "list"), []);
});

test("a kind follows Grouped, and a table section that declares one is an error in the schema", () => {
  const grouped = roleSchema(["| `## What it never does` | Yes | Grouped. Bulleted. What the seat refuses. |", "",
    "`## What it never does` is grouped under these headings:", "", "| Heading | Required | Type | Description |", "| --- | --- | --- | --- |",
    "| `Kind` | No | ref → skill | The kind. |"]);
  assert.equal(about(failuresOf(role({ "What it never does": "1. Never merges." }), grouped), "## What it never does", "Bulleted").length, 1);

  const table = roleSchema(["| `## What it never does` | Yes | Table. Bulleted. What the seat refuses. |"]);
  assert.equal(about(failuresOf(role({ "What it never does": "- Never merges." }), table), "role-schema.md", "Table.", "Bulleted").length, 1);
});

// The two holes the declared kind was written to close, in the shapes the track review found
// them. Both lean on core's own schemas, so they read the ones this repository ships.
const root = new URL("..", import.meta.url).pathname;
const shipped = () => {
  const files = new Map();
  const walk = (dir, prefix) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory()) walk(path.join(dir, e.name), `${prefix}${e.name}/`);
      else files.set(prefix + e.name, fs.readFileSync(path.join(dir, e.name), IMAGE_FILE.test(e.name) ? undefined : "utf8"));
  };
  walk(path.join(root, "core"), "core/");
  walk(path.join(root, "example", "model"), "model/");
  return files;
};
const run = (files) => checkInstance(files, { core: "core", model: "model" }).failures;
const rewriteSection = (text, heading, fn) => {
  const parts = text.split(new RegExp(`^(## ${heading}\\n)`, "m"));
  const [body, ...rest] = parts[2].split(/^(?=## )/m);
  return parts[0] + parts[1] + fn(body) + rest.join("");
};

test("the example as shipped passes, and core declares a kind on every section that holds a list", () => {
  assert.deepEqual(run(shipped()), []);
  const declared = (type, section) => {
    const rows = blocksOf(sectionsOf(fs.readFileSync(path.join(root, "core", `${type}-schema.md`), "utf8")).get("Sections"))[0].table.rows;
    return rows.find((r) => r[0].includes(`## ${section}`))?.[2].match(/^(?:Grouped\.\s+)?(Bulleted|Numbered)\./)?.[1];
  };
  assert.equal(declared("phase", "Activities"), "Numbered");
  for (const [type, section] of [["experience", "Achievements"], ["phase", "What it never does"], ["phase", "Gate"], ["process", "What it never does"],
    ["role", "What it never does"], ["surface", "What it shows"], ["surface", "Projection rules"], ["surface", "Constraints"]])
    assert.equal(declared(type, section), "Bulleted", `${type} ## ${section}`);
});

test("an entry's achievements numbered under no kind fail, where the marker used to let them pass", () => {
  const files = shipped();
  const entry = [...files.keys()].find((k) => k.includes("/experiences/") && files.get(k).includes("## Achievements"));
  files.set(entry, rewriteSection(files.get(entry), "Achievements", () => "\n1. Did a thing.\n2. Did another.\n\n"));
  assert.equal(about(run(files), entry, "## Achievements", "Bulleted").length, 1);
});

test("a phase's bulleted activities are told to number them, once, and never to stand under a track", () => {
  const files = shipped();
  const phase = [...files.keys()].find((k) => k.includes("/phases/") && !/^###/m.test(files.get(k).split("## Activities")[1].split(/^## /m)[0]));
  assert.ok(phase, "the example has a phase with no track heading");
  files.set(phase, rewriteSection(files.get(phase), "Activities", (body) => body.replace(/^\d+\. /gm, "- ")));
  const failures = about(run(files), phase, "## Activities");
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.match(failures[0], /Numbered/);
  assert.doesNotMatch(failures[0], /stands under the heading/);
});
