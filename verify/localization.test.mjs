import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { LANGUAGE_TAG, localizationOf } from "../lib/localization.mjs";

const repoRoot = new URL("..", import.meta.url);

const LOCALIZATION = (rows) =>
  `---\nid: x\nsource: Local\n---\n\n# Languages\n\n> Who reads this model.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n${rows}\n`;

test("a language tag is lowercase first, and a declared heading never is", () => {
  for (const tag of ["de-CH", "en-US", "pl-PL", "fr", "sr-Latn-RS"]) assert.ok(LANGUAGE_TAG.test(tag), tag);
  for (const heading of ["References", "Also at", "Name", "DE-CH", "de_CH"]) assert.ok(!LANGUAGE_TAG.test(heading), heading);
});

test("the localization file gives one primary and the translated languages in order", () => {
  assert.deepEqual(localizationOf(LOCALIZATION("| en-US | primary |\n| de-CH | translated |\n| pl-PL | translated |")),
    { primary: "en-US", translated: ["de-CH", "pl-PL"] });
  assert.deepEqual(localizationOf(LOCALIZATION("| de-CH | primary |")), { primary: "de-CH", translated: [] });
});

test("a localization file that cannot be read says why", () => {
  assert.match(localizationOf(LOCALIZATION("| en-US | translated |")).error, /no language is `primary`/);
  assert.match(localizationOf(LOCALIZATION("| en-US | primary |\n| de-CH | primary |")).error, /more than one language is `primary`/);
  assert.match(localizationOf(LOCALIZATION("| en-US | primary |\n| en-US | translated |")).error, /en-US is written twice/);
  assert.match(localizationOf(LOCALIZATION("| en-US | primary |\n| German | translated |")).error, /"German" is no language tag/);
  assert.match(localizationOf(LOCALIZATION("| en-US | main |")).error, /the role "main"/);
  assert.match(localizationOf("---\nid: x\n---\n\n# Languages\n").error, /no `## Locales` table/);
});

// Fix 8: `localizationOf` assumed row 2 of `## Locales` is the separator row and destructured it
// away unread; a table missing one silently read its first data row as if it were the separator
// and dropped it.
test("a `## Locales` table without a separator row is refused", () => {
  const text = "---\nid: x\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| en-US | primary |\n";
  assert.match(localizationOf(text).error, /`## Locales` is not a table with the columns Locale \| Role/);
});

// Review fix 9: a consumer outside this repository — the MCP server, refusing a question asked
// in a locale the instance does not declare — reads `localizationOf` from
// `companygraph-meta-model/localization`, the same way `companygraph-meta-model/ids` already
// resolves by the package's own name.
test("companygraph-meta-model/localization resolves by the package's own name, the way a consumer imports it", () => {
  const script = `
    import { localizationOf } from "companygraph-meta-model/localization";
    const declared = localizationOf("---\\nid: x\\n---\\n\\n# Languages\\n\\n## Locales\\n\\n| Locale | Role |\\n| --- | --- |\\n| en-US | primary |\\n");
    if (declared.primary !== "en-US") throw new Error("did not resolve to lib/localization.mjs's own localizationOf");
    process.stdout.write("ok");
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(out, "ok");
});
