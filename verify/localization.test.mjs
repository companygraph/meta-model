import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  LANGUAGE_TAG, localizationOf, languageSectionsOf, asPage, primaryElementsOf, translationElementsOf, withoutFrontmatter, staleTranslationsOf,
} from "../lib/localization.mjs";

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

test("every heading below a language section is named in after, even after another", () => {
  const { after } = languageSectionsOf(`${PAGE}\n## References\n\n| What | URL |\n| --- | --- |\n\n## Also at\n\nHere.\n`);
  assert.deepEqual(after, ["References", "Also at"]);
});

test("frontmatter is taken off before a body is read", () => {
  assert.equal(withoutFrontmatter("---\nid: x\n---\n\n# A\n"), "\n# A\n");
  assert.equal(withoutFrontmatter("# A\n"), "# A\n");
});

const page = (en, de, extra = "") =>
  `---\nid: x\n---\n\n# Billing\n\n> ${en}\n${extra}\n## de-CH\n\n### Name\n\nAbrechnung\n\n### Statement\n\n> ${de}\n`;
const change = (before, after) => [{ before: "model/features/billing.md", after: "model/features/billing.md", beforeText: before, afterText: after }];

test("a changed primary element whose translation stayed fails, naming the element", () => {
  const out = staleTranslationsOf(change(page("Old.", "Alt."), page("New.", "Alt.")), ["de-CH"], new Set());
  assert.equal(out.length, 1);
  assert.match(out[0], /^model\/features\/billing\.md#statement changed, and its de-CH translation did not/);
});

test("a changed primary element whose translation changed with it passes", () => {
  assert.deepEqual(staleTranslationsOf(change(page("Old.", "Alt."), page("New.", "Neu.")), ["de-CH"], new Set()), []);
});

test("a trailer naming the element releases it", () => {
  assert.deepEqual(staleTranslationsOf(change(page("Old.", "Alt."), page("New.", "Alt.")), ["de-CH"], new Set(["model/features/billing.md#statement"])), []);
});

test("a new section added with its translation passes", () => {
  const before = page("Same.", "Gleich.");
  const after = `---\nid: x\n---\n\n# Billing\n\n> Same.\n\n## Description\n\nNew.\n\n## de-CH\n\n### Name\n\nAbrechnung\n\n### Statement\n\n> Gleich.\n\n### Description\n\nNeu.\n`;
  assert.deepEqual(staleTranslationsOf(change(before, after), ["de-CH"], new Set()), []);
});

test("a frontmatter change asks nothing of a translation", () => {
  const before = page("Same.", "Gleich.");
  assert.deepEqual(staleTranslationsOf(change(before, before.replace("id: x", "id: x\nsource: Local")), ["de-CH"], new Set()), []);
});

// Review fix 7: a table re-padded and a paragraph re-wrapped change no word, but the comparison
// was raw text equality, so either read as the primary having changed and asked the unchanged
// translation to follow it — a formatting pass alone would have failed every translated instance
// it touched. Whitespace, including a soft line break inside a paragraph, is collapsed to one
// space before comparing; a table cell is trimmed the same way, so tight and wide padding around
// `|` read the same.
const tablePage = (notes, table, deNotes, deTable) =>
  `---\nid: x\n---\n\n# Billing\n\n> Same.\n\n## Notes\n\n${notes}\n\n## References\n\n${table}\n\n` +
  `## de-CH\n\n### Name\n\nAbrechnung\n\n### Statement\n\n> Same.\n\n### Notes\n\n${deNotes}\n\n### References\n\n${deTable}\n`;

test("a re-padded table and a re-wrapped paragraph in the primary, with the translation untouched, is not stale", () => {
  const before = tablePage(
    "Billed monthly,\nin advance.",
    "| What | URL |\n| --- | --- |\n| Terms | https://a.example |",
    "Monatlich abgerechnet,\nim Voraus.",
    "| Was | URL |\n| --- | --- |\n| Bedingungen | https://a.example |",
  );
  const after = tablePage(
    "Billed monthly, in\nadvance.",
    "| What  |URL|\n|---|---|\n|Terms   |https://a.example|",
    "Monatlich abgerechnet,\nim Voraus.",
    "| Was | URL |\n| --- | --- |\n| Bedingungen | https://a.example |",
  );
  assert.deepEqual(staleTranslationsOf(change(before, after), ["de-CH"], new Set()), []);
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

test("a real word change beside the same kind of re-padding and re-wrapping still fails", () => {
  const before = tablePage(
    "Billed monthly,\nin advance.",
    "| What | URL |\n| --- | --- |\n| Terms | https://a.example |",
    "Monatlich abgerechnet,\nim Voraus.",
    "| Was | URL |\n| --- | --- |\n| Bedingungen | https://a.example |",
  );
  const after = tablePage(
    "Billed monthly, in\nadvance.",
    "| What  |URL|\n|---|---|\n|Terms   |https://b.example|",
    "Monatlich abgerechnet,\nim Voraus.",
    "| Was | URL |\n| --- | --- |\n| Bedingungen | https://a.example |",
  );
  const out = staleTranslationsOf(change(before, after), ["de-CH"], new Set());
  assert.equal(out.length, 1);
  assert.match(out[0], /^model\/features\/billing\.md#section\/References changed, and its de-CH translation did not/);
});
