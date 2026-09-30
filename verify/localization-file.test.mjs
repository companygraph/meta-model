// The localization file through the real schema, read from disk, so the test fails if the schema
// and the checks part.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { startingEntities, LOCALIZATION_PAGE } from "../lib/instance-files.mjs";
import { localizationOf } from "../lib/localization.mjs";

const read = (name) => fs.readFileSync(new URL(`../core/${name}`, import.meta.url), "utf8");

test("an instance without model/localization.md fails as a missing singular file", () => {
  const files = new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["model/sources/local.md", "# Local\n"],
  ]);
  const all = checkInstance(files, { core: "meta/core", model: "model" }).failures;
  assert.ok(all.some((f) => f.startsWith("model/localization.md is missing")), all.join("\n"));
});

test("init writes a localization file whose one language is en-US, primary", () => {
  const page = startingEntities({ name: "Acme" }).get("model/localization.md");
  assert.ok(page, "init writes model/localization.md");
  assert.deepEqual(localizationOf(page), { primary: "en-US", translated: [] });
});

test("the localization page names its primary and nothing else", () => {
  assert.deepEqual(localizationOf(LOCALIZATION_PAGE({ id: "x", source: "Local", primary: "de-CH" })), { primary: "de-CH", translated: [] });
});

const LOC = (rows, extra = "") =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b047990\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n${rows}\n${extra}`;
const DE_LOC = LOC("| en-US | primary |\n| de-CH | translated |",
  "\n## de-CH\n\n### Name\n\nSprachen\n\n### Statement\n\n> Wer es liest.\n\n### Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n| de-CH | translated |\n");
const LOCAL = (de) => `---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n${de}`;
const DE_LOCAL = "\n## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n";

const r19 = (entries) =>
  checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ...entries,
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("an instance in one language holds no page to a translation", () => {
  assert.deepEqual(r19([["model/localization.md", LOC("| en-US | primary |")], ["model/sources/local.md", LOCAL("")]]), []);
});

test("a page carrying its declared translation in its own shape passes", () => {
  assert.deepEqual(r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL(DE_LOCAL)]]), []);
});

test("a page without a declared language's section fails, naming the language", () => {
  const f = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL("")]]);
  assert.ok(f.some((x) => x.startsWith("model/sources/local.md: no `## de-CH` section")), f.join("\n"));
});

test("a section for an undeclared language fails", () => {
  const f = r19([["model/localization.md", LOC("| en-US | primary |")], ["model/sources/local.md", LOCAL("\n## fr-CH\n\n### Name\n\nLocal\n")]]);
  assert.ok(f.some((x) => x.includes("`## fr-CH` is a language model/localization.md does not declare as translated")), f.join("\n"));
});

test("a language section missing an element or holding one the page lacks fails", () => {
  const missing = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL("\n## de-CH\n\n### Name\n\nLokal\n")]]);
  assert.ok(missing.some((x) => x.includes("`## de-CH` has no `### Statement`")), missing.join("\n"));
  const extra = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL(`${DE_LOCAL}\n### Description\n\nMehr.\n`)]]);
  assert.ok(extra.some((x) => x.includes("`## de-CH` has `### Description`, which the page does not")), extra.join("\n"));
});

test("a page without a statement is not asked for one", () => {
  const local = "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n## de-CH\n\n### Name\n\nLokal\n";
  assert.deepEqual(r19([["model/localization.md", DE_LOC], ["model/sources/local.md", local]]), []);
});

test("a schema section standing below a language section fails", () => {
  const f = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL(`${DE_LOCAL}\n## References\n\n| What | URL |\n| --- | --- |\n`)]]);
  assert.ok(f.some((x) => x.includes("`## References` stands below a language section")), f.join("\n"));
});

test("an empty name in a language section fails", () => {
  const f = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL("\n## de-CH\n\n### Name\n\n### Statement\n\n> Hier.\n")]]);
  assert.ok(f.some((x) => x.includes("`## de-CH` leaves `### Name` empty")), f.join("\n"));
});

test("an unreadable localization file is its own failure, once, and no page is held to it", () => {
  const f = r19([["model/localization.md", LOC("| en-US | translated |")], ["model/sources/local.md", LOCAL("")]]);
  assert.deepEqual(f, ["model/localization.md: no language is `primary`; exactly one is (R19)"]);
});

test("a core with no localization schema holds no page to R19", () => {
  const files = new Map([["meta/core/source-schema.md", read("source-schema.md")], ["model/sources/local.md", LOCAL("\n## de-CH\n")]]);
  const all = checkInstance(files, { core: "meta/core", model: "model" }).failures;
  assert.deepEqual(all.filter((f) => f.includes("(R19)") || f.includes("localization")), []);
});
