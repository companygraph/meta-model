// R18 through the real identifier schema: core/identifier-schema.md is read from disk, so the
// test fails if the schema and the check part. Only R18's failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const read = (name) => fs.readFileSync(new URL(`../core/${name}`, import.meta.url), "utf8");
const A = uuidv7(), B = uuidv7(), C = uuidv7();
const IDENTIFIER = (fm = "format: uuidv7\n") => `---\nid: ${C}\nsource: Local\n${fm}---\n\n# Entity id\n\n> What an id is for.\n`;

const tree = ({ identifier = IDENTIFIER(), local = `---\nid: ${A}\n---\n\n# Local\n\n> Here.\n`, extra = [] } = {}) => new Map([
  ["meta/core/identifier-schema.md", read("identifier-schema.md")],
  ["meta/core/source-schema.md", read("source-schema.md")],
  ["model/sources/local.md", local],
  ...(identifier === null ? [] : [["model/identifier.md", identifier]]),
  ...extra,
]);
const r18 = (files) => checkInstance(files, { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("R18"));

test("pages that each carry a UUID version 7 of their own pass", () => {
  assert.deepEqual(r18(tree()), []);
});

test("a page with no id fails, and says how to make one", () => {
  const f = r18(tree({ local: "# Local\n\n> Here.\n" }));
  assert.deepEqual(f, ["model/sources/local.md: no `id`, which R18 gives every page — `companygraph id` prints a fresh one"]);
});

test("an uppercase UUID fails the format", () => {
  const f = r18(tree({ local: `---\nid: ${A.toUpperCase()}\n---\n\n# Local\n` }));
  assert.equal(f.length, 1);
  assert.match(f[0], /is not the uuidv7 model\/identifier\.md declares/);
});

test("a quoted id fails once, saying it is quoted, whether the quotes are double or single", () => {
  for (const q of ['"', "'"]) {
    const f = r18(tree({ local: `---\nid: ${q}${A}${q}\n---\n\n# Local\n` }));
    assert.deepEqual(f, [`model/sources/local.md: \`id\` is written in quotes, ${q}${A}${q}; an id is written bare, as the parser reads every field as written (R18)`]);
  }
});

// The check walks in path order, so the page named the duplicate is the later path; the copy's
// name sorts after local.md so that the page this test calls the copy is the one reported.
test("a page copied with its id fails as a duplicate, naming both files", () => {
  const f = r18(tree({ extra: [["model/sources/the-copy.md", `---\nid: ${A}\n---\n\n# Copy\n`]] }));
  assert.equal(f.length, 1);
  assert.match(f[0], /model\/sources\/the-copy\.md: `id` ".+" is also model\/sources\/local\.md's/);
});

test("the identifier's own id counts: a page sharing it fails", () => {
  const f = r18(tree({ local: `---\nid: ${C}\n---\n\n# Local\n` }));
  assert.equal(f.length, 1);
});

test("a pattern the identifier declares holds every id", () => {
  const identifier = `---\nid: E-0001\nsource: Local\nformat: pattern\npattern: ^E-[0-9]{4}$\n---\n\n# Entity id\n`;
  assert.deepEqual(r18(tree({ identifier, local: "---\nid: E-0002\n---\n\n# Local\n" })), []);
  assert.equal(r18(tree({ identifier, local: "---\nid: E-2\n---\n\n# Local\n" })).length, 1);
});

test("an unanchored pattern is the identifier's failure, once, and no page is held to it", () => {
  const f = r18(tree({ identifier: IDENTIFIER("format: pattern\npattern: E-[0-9]+\n") }));
  assert.deepEqual(f, ["model/identifier.md: `pattern` is not anchored at both ends, `^` and `$` (R18)"]);
});

test("an instance with no identifier file fails as a missing singular file", () => {
  const all = checkInstance(tree({ identifier: null }), { core: "meta/core", model: "model" }).failures;
  assert.ok(all.some((f) => f.startsWith("model/identifier.md is missing")));
});

test("a core with no identifier schema holds no page to R18, and asks for no identifier file", () => {
  const files = tree({ identifier: null, local: "# Local\n" });
  files.delete("meta/core/identifier-schema.md");
  const all = checkInstance(files, { core: "meta/core", model: "model" }).failures;
  assert.deepEqual(all.filter((f) => f.includes("R18") || f.includes("identifier")), []);
});
