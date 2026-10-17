import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { LANGUAGE_TAG, localizationOf, migratedLocalization } from "../lib/localization.mjs";

const repoRoot = new URL("..", import.meta.url);

const PAGE = (fm, body = "") => `---\nid: x\nsource: Local\n${fm}---\n\n# Language\n\n> Who reads this model.\n${body}`;
const OLD = (rows, after = "") =>
  `---\nid: x\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n${rows}\n${after}`;

test("a language tag is lowercase first, and a declared heading never is", () => {
  for (const tag of ["de-CH", "en-US", "pl-PL", "fr", "gsw-CH", "sr-Latn-RS"]) assert.ok(LANGUAGE_TAG.test(tag), tag);
  for (const word of ["References", "German", "DE-CH", "de_CH", "en US"]) assert.ok(!LANGUAGE_TAG.test(word), word);
});

test("the localization page names its locale", () => {
  assert.deepEqual(localizationOf(PAGE("locale: de-CH\n")), { locale: "de-CH" });
  assert.deepEqual(localizationOf(PAGE('locale: "de-CH"\n')), { locale: "de-CH" });
  assert.deepEqual(localizationOf(PAGE("locale: 'en-US'\n")), { locale: "en-US" });
});

test("a page with no locale, or a locale that is no tag, says why", () => {
  assert.equal(localizationOf(PAGE("")).error, "no `locale` field");
  assert.match(localizationOf(PAGE("locale: German\n")).error, /`locale` is "German", which is no language tag/);
  assert.equal(localizationOf("# Language\n").error, "no `locale` field");
});

test("an earlier page's primary row becomes its locale, and the table goes", () => {
  assert.deepEqual(migratedLocalization(OLD("| en-US | primary |")), {
    text: "---\nid: x\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n",
  });
});

test("a section below the table survives the migration", () => {
  const { text } = migratedLocalization(OLD("| de-CH | primary |", "\n## References\n\n| What | URL |\n| --- | --- |\n| BCP 47 | https://www.rfc-editor.org/info/bcp47 |\n"));
  assert.equal(text,
    "---\nid: x\nsource: Local\nlocale: de-CH\n---\n\n# Languages\n\n> Who reads it.\n\n## References\n\n| What | URL |\n| --- | --- |\n| BCP 47 | https://www.rfc-editor.org/info/bcp47 |\n");
  assert.deepEqual(localizationOf(text), { locale: "de-CH" });
});

test("a page that already names its locale is not migrated", () => {
  assert.equal(migratedLocalization(PAGE("locale: en-US\n")), null);
});

test("a page declaring a translated language is refused, naming it", () => {
  assert.match(migratedLocalization(OLD("| en-US | primary |\n| de-CH | translated |")).error, /declares de-CH translated; a model is written in one language/);
});

// Final review: only a translated language refuses an upgrade. A page the migration cannot read
// is left as it is, so the upgrade lands and the check afterward names what the page owes.
test("a page with neither a locale nor a table it can read is left as it is", () => {
  assert.equal(migratedLocalization("---\nid: x\n---\n\n# Languages\n"), null);
  assert.equal(migratedLocalization(OLD("| en-US | translated-ish |")), null);
  assert.equal(migratedLocalization("# Languages\n"), null);
});

// Final review: a vault edited on Windows holds CRLF line ends, and the Obsidian plugin hands
// the text over as it reads it. Both forms are read as their LF selves.
test("a page with CRLF line ends is read and migrated as its LF self", () => {
  const crlf = (text) => text.replace(/\n/g, "\r\n");
  assert.deepEqual(localizationOf(crlf(PAGE("locale: de-CH\n"))), { locale: "de-CH" });
  assert.equal(migratedLocalization(crlf(PAGE("locale: en-US\n"))), null);
  assert.deepEqual(migratedLocalization(crlf(OLD("| en-US | primary |"))), {
    text: "---\nid: x\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n",
  });
});

// Final review, minors: a blank `locale:` is no locale, so the table still gives one, written in
// the blank line's place rather than beside it.
test("a blank locale beside the earlier table is filled from the table, once", () => {
  const blank = OLD("| en-US | primary |").replace("source: Local\n", "source: Local\nlocale:\n");
  assert.deepEqual(migratedLocalization(blank), {
    text: "---\nid: x\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n",
  });
});

test("a page naming its locale beside a leftover table is refused if the table declares a translated language", () => {
  const leftover = (rows) => OLD(rows).replace("source: Local\n", "source: Local\nlocale: en-US\n");
  assert.match(migratedLocalization(leftover("| en-US | primary |\n| de-CH | translated |")).error, /declares de-CH translated/);
  assert.equal(migratedLocalization(leftover("| en-US | primary |")), null);
});

test("the rewrite closes the gap only where the table was, and keeps blank lines elsewhere", () => {
  const { text } = migratedLocalization(OLD("| en-US | primary |", "\n## References\n\n```\na\n\n\n\nb\n```\n"));
  assert.equal(text, "---\nid: x\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n\n## References\n\n```\na\n\n\n\nb\n```\n");
});

test("a table section holding more than the table is left as it is, so nothing it says is dropped", () => {
  const prose = OLD("| en-US | primary |").replace("## Locales\n\n", "## Locales\n\nWe also answer in French.\n\n");
  assert.equal(migratedLocalization(prose), null);
});

test("a missing or blank locale is said to be missing, and an invalid one is not", () => {
  assert.equal(localizationOf(PAGE("")).missing, true);
  assert.equal(localizationOf(PAGE("locale:\n")).missing, true);
  assert.equal(localizationOf(PAGE("locale: German\n")).missing, undefined);
});

test("companygraph-meta-model/localization resolves by the package's own name, the way a consumer imports it", () => {
  const script = `
    import { localizationOf } from "companygraph-meta-model/localization";
    const read = localizationOf("---\\nid: x\\nlocale: en-US\\n---\\n\\n# Language\\n");
    if (read.locale !== "en-US") throw new Error("did not resolve to lib/localization.mjs's own localizationOf");
    process.stdout.write("ok");
  `;
  const out = execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(out, "ok");
});
