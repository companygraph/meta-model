import test from "node:test";
import assert from "node:assert/strict";
import {
  LANGUAGE_TAG, localizationOf, languageSectionsOf, asPage, primaryElementsOf, translationElementsOf, withoutFrontmatter,
} from "../lib/localization.mjs";

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

const PAGE = [
  "# Invoice lines explained",
  "",
  "> Whoever receives an invoice sees what each line is made of.",
  "",
  "## Description",
  "",
  "The feature.",
  "",
  "```markdown",
  "## de-CH",
  "```",
  "",
  "## de-CH",
  "",
  "### Name",
  "",
  "Rechnungszeilen erklärt",
  "",
  "### Statement",
  "",
  "> Wer eine Rechnung erhält, sieht, woraus jede Zeile besteht.",
  "",
  "### Description",
  "",
  "Die Funktion.",
  "",
].join("\n");

test("a page is cut where its first language section begins, and a fenced heading cuts nothing", () => {
  const { primary, sections, order, after } = languageSectionsOf(PAGE);
  assert.deepEqual(order, ["de-CH"]);
  assert.deepEqual(after, []);
  assert.ok(primary.includes("```markdown\n## de-CH\n```"), "the fenced heading stays in the primary");
  assert.ok(sections.get("de-CH").includes("### Name"));
});

test("a schema section standing below a language section is named in after", () => {
  const { after } = languageSectionsOf(`${PAGE}\n## References\n\n| What | URL |\n| --- | --- |\n`);
  assert.deepEqual(after, ["References"]);
});

test("a language section reads as a page one level up", () => {
  assert.equal(asPage("### Name\n\nX\n\n#### Delivery\n\n- y\n\n```\n### kept\n```"), "## Name\n\nX\n\n### Delivery\n\n- y\n\n```\n### kept\n```");
});

test("the primary and a translation are read into the same element paths", () => {
  const { primary, sections } = languageSectionsOf(PAGE);
  assert.deepEqual([...primaryElementsOf(primary).keys()], ["name", "statement", "section/Description"]);
  assert.equal(primaryElementsOf(primary).get("name"), "Invoice lines explained");
  const de = translationElementsOf(sections.get("de-CH"));
  assert.deepEqual([...de.keys()], ["name", "statement", "section/Description"]);
  assert.equal(de.get("name"), "Rechnungszeilen erklärt");
  assert.equal(de.get("statement"), "> Wer eine Rechnung erhält, sieht, woraus jede Zeile besteht.");
});

test("a page without a statement has no statement element", () => {
  assert.deepEqual([...primaryElementsOf("# Local\n\n## Description\n\nHere.\n").keys()], ["name", "section/Description"]);
});

test("frontmatter is taken off before a body is read", () => {
  assert.equal(withoutFrontmatter("---\nid: x\n---\n\n# A\n"), "\n# A\n");
  assert.equal(withoutFrontmatter("# A\n"), "# A\n");
});
