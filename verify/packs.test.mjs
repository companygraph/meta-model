// A pack is a unit beside core: its schemas are read from its own folder, its types join core's,
// and an instance that takes none is checked exactly as before.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance, vocabularyOf, TYPES } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const read = (name) => fs.readFileSync(new URL(`../core/${name}`, import.meta.url), "utf8");
const page = (fm, body) => `---\nid: ${uuidv7()}\n${fm}---\n\n${body}`;

const WIDGET_SCHEMA = `---
id: ${uuidv7()}
---

# Widget Schema

> Required structure for widget files.

## File Location

\`model/widgets/*.md\`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| \`id\` | Yes | string | What identifies this entity for as long as it exists, in the format \`model/identifier.md\` declares (R18) |
| \`source\` | Yes | ref → source | Where this page's facts are mastered |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| \`# [Widget]\` | Yes | The canonical name of the widget |
| \`> [What it is]\` | Yes | One sentence |
| \`## References\` | No | Table. What a reader can open; its columns are declared below. |

\`## References\` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| \`What\` | Yes | string | The kind of document |
| \`URL\` | Yes | string | Where it is |
`;

const WIDGET = [{ type: "widget", folder: "widgets" }];
const base = () => new Map([
  ["meta/core/identifier-schema.md", read("identifier-schema.md")],
  ["meta/core/source-schema.md", read("source-schema.md")],
  ["model/identifier.md", page("source: Local\nformat: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", page("", "# Local\n\n> Here.\n")],
]);
const withWidget = () => new Map([
  ...base(),
  ["meta/toy/widget-schema.md", WIDGET_SCHEMA],
  ["model/widgets/sprocket.md", page("source: Local\n", "# Sprocket\n\n> A widget.\n")],
]);
const TOY = [{ name: "toy", dir: "meta/toy", types: WIDGET }];

test("the vocabulary is core's types, then each pack's, each read from its own folder", () => {
  const { types, schemaOf } = vocabularyOf({ core: "meta/core", packs: TOY });
  assert.equal(types.length, TYPES.length + 1);
  assert.deepEqual(types.at(-1), { type: "widget", folder: "widgets", unit: "toy", dir: "meta/toy" });
  assert.equal(schemaOf("widget"), "meta/toy/widget-schema.md");
  assert.equal(schemaOf("source"), "meta/core/source-schema.md");
});

test("an instance that takes the pack is checked against the pack's schema and passes", () => {
  const { failures } = checkInstance(withWidget(), { core: "meta/core", model: "model", packs: TOY });
  assert.deepEqual(failures, []);
});

test("the same tree without the pack fails on the folder no type claims", () => {
  const { failures } = checkInstance(withWidget(), { core: "meta/core", model: "model" });
  assert.ok(failures.some((f) => f.includes("widgets")), failures.join("\n"));
});

test("an instance that takes no pack is checked exactly as before", () => {
  const before = checkInstance(base(), { core: "meta/core", model: "model" });
  const after = checkInstance(base(), { core: "meta/core", model: "model", packs: [] });
  assert.deepEqual(after, before);
  assert.deepEqual(before.failures, []);
});

test("a pack type whose schema is absent is reported as skipped, as a core type is", () => {
  const files = base();
  const { skipped } = checkInstance(files, { core: "meta/core", model: "model", packs: TOY });
  assert.ok(skipped.includes("widget"));
});
