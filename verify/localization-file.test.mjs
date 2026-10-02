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
