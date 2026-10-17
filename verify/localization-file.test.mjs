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

test("init writes a localization file whose locale is en-US", () => {
  const page = startingEntities({ name: "Acme" }).get("model/localization.md");
  assert.ok(page, "init writes model/localization.md");
  assert.deepEqual(localizationOf(page), { locale: "en-US" });
});

const LOC = (fm) => `---\nid: 01a0f10d-64f0-71c7-8329-86453b047990\nsource: Local\n${fm}---\n\n# Language\n\n> Who reads it.\n`;
const LOCAL = "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n";
const failuresWith = (schema, localization) =>
  checkInstance(new Map([
    ["meta/core/localization-schema.md", schema],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ["model/localization.md", localization],
    ["model/sources/local.md", LOCAL],
  ]), { core: "meta/core", model: "model" }).failures;

const onLocalization = (failures) => failures.filter((x) => x.startsWith("model/localization.md"));

test("a localization page naming its locale passes", () => {
  assert.deepEqual(onLocalization(failuresWith(read("localization-schema.md"), LOC("locale: de-CH\n"))), []);
});

test("a locale that is no language tag fails under R14", () => {
  const f = failuresWith(read("localization-schema.md"), LOC("locale: German\n"));
  assert.ok(f.includes('model/localization.md: `locale` is "German", which is no language tag, as `en-US` or `de-CH` is (R14)'), f.join("\n"));
});

test("a missing locale is the required-field check's, said once", () => {
  const f = failuresWith(read("localization-schema.md"), LOC(""));
  assert.deepEqual(f.filter((x) => x.includes("locale")), ["model/localization.md: no `locale`, which localization-schema.md requires"]);
});

// An instance still on a core before one language per model vendors a localization schema with
// a `## Locales` table and no `locale` field; this release's checker holds it to that schema.
test("an instance on a core whose schema declares no locale is not held to one", () => {
  const older = read("localization-schema.md").replace(/^\| `locale` \|.*\n/m, "");
  const page = "---\nid: 01a0f10d-64f0-71c7-8329-86453b047990\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n";
  assert.deepEqual(onLocalization(failuresWith(older, page)), []);
});
