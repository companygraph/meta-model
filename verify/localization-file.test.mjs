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

const KIND = (name, de) => `---\nid: 01a0f10d-64f0-71c7-8329-86453b04799${name.length}\nsource: Local\n---\n\n# ${name}\n\n> A kind.\n\n## de-CH\n\n### Name\n\n${de}\n\n### Statement\n\n> Eine Art.\n`;
const EXPERIENCE = (de) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b0479a0\nsource: Local\nstart: 2020\nkind: Employment\n---\n\n# Rebuilding billing\n\n> A period.\n\n" +
  "## Achievements\n\n### Delivery\n\n- Shipped it.\n\n## References\n\n| What | URL |\n| --- | --- |\n| A record | https://example.com/record |\n" +
  `\n## de-CH\n\n### Name\n\nAbrechnung neu gebaut\n\n### Statement\n\n> Eine Phase.\n\n${de}`;
const DE_EXPERIENCE = "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\n| What | URL |\n| --- | --- |\n| Ein Eintrag | https://example.com/record |\n";

const r19Deep = (experience, { kinds = [["delivery.md", KIND("Delivery", "Lieferung")]] } = {}) =>
  checkInstance(new Map([
    ...["localization", "source", "experience", "achievement-kind", "profile"].map((t) => [`meta/core/${t}-schema.md`, read(`${t}-schema.md`)]),
    ["model/localization.md", DE_LOC],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
    ...kinds.map(([f, text]) => [`model/achievement-kinds/${f}`, text]),
    ["model/profiles/ana/experiences/2020-billing.md", experience],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("a translation that keeps the page's structure and names its kinds in German passes", () => {
  assert.deepEqual(r19Deep(EXPERIENCE(DE_EXPERIENCE)), []);
});

test("a URL a translator changed fails, while the text beside it may change", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE.replace("https://example.com/record", "https://example.com/de/record")));
  assert.ok(f.some((x) => x.includes("row 1 of `### References` column URL is \"https://example.com/de/record\"")), f.join("\n"));
});

test("an enum cell of a repeated table is the primary's", () => {
  // The last `| de-CH | translated |` is the German section's repeated table.
  const loc = DE_LOC.replace(/(### Locales[\s\S]*)\| de-CH \| translated \|/, "$1| de-CH | übersetzt |");
  const f = checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ["model/localization.md", loc],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
  ]), { core: "meta/core", model: "model" }).failures.filter((x) => x.includes("(R19)"));
  // Fix 7: the failure names what kind of value is held in words a translator reads, not the
  // schema's own declared-type spelling.
  assert.ok(f.some((x) => x.includes("column Role is \"übersetzt\"") && x.includes("an enum value is the page's, \"translated\"")), f.join("\n"));
});

test("a repeated table with another row count fails", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE.replace("| Ein Eintrag | https://example.com/record |\n", "")));
  assert.ok(f.some((x) => x.includes("`### References` holds 0 rows, and the page's table 1")), f.join("\n"));
});

test("a grouped heading in German is the German name of the kind the English heading names", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE.replace("#### Lieferung", "#### Delivery")));
  assert.ok(f.some((x) => x.includes("`#### Delivery` under `### Achievements` is not \"Lieferung\"")), f.join("\n"));
});

test("two kinds with one German name fail", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE), { kinds: [["delivery.md", KIND("Delivery", "Lieferung")], ["results.md", KIND("Results", "Lieferung")]] });
  assert.ok(f.some((x) => x.includes("de-CH name \"Lieferung\" is also")), f.join("\n"));
});

// A name's scope is R2's: an owned type's owner, never the type alone. A process owns its
// tracks, so two processes may each name a track `Code`, translated differently, and a phase's
// grouped heading is held to the translation in its own process — never the other one's.
const PROCESS = (id, name, de) =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b0479${id}\nsource: Local\n---\n\n# ${name}\n\n> A path.\n\n## de-CH\n\n### Name\n\n${de}\n\n### Statement\n\n> Ein Pfad.\n`;
const TRACK = (id, de) =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b0479${id}\nsource: Local\n---\n\n# Code\n\n> Delivered.\n\n## de-CH\n\n### Name\n\n${de}\n\n### Statement\n\n> Geliefert.\n`;
const PHASE = (id, heading) =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b0479${id}\nsource: Local\n---\n\n# Build\n\n> What happens.\n\n## Activities\n\n### Code\n\n1. Write it.\n\n` +
  `## de-CH\n\n### Name\n\nBauen\n\n### Statement\n\n> Was passiert.\n\n### Activities\n\n#### ${heading}\n\n1. Geschrieben.\n`;

const r19Scoped = (files) =>
  checkInstance(new Map([
    ...["process", "phase", "track", "source", "localization"].map((t) => [`meta/core/${t}-schema.md`, read(`${t}-schema.md`)]),
    ["model/localization.md", DE_LOC],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
    ...files,
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("a grouped heading's target name is looked up in the page's own process, not another's", () => {
  const f = r19Scoped([
    ["model/processes/a/a.md", PROCESS("0c1", "Process A", "Ablauf A")],
    ["model/processes/a/tracks/code.md", TRACK("0c2", "Programmcode")],
    ["model/processes/a/phases/build.md", PHASE("0c3", "Programmcode")],
    ["model/processes/b/b.md", PROCESS("0c4", "Process B", "Ablauf B")],
    ["model/processes/b/tracks/code.md", TRACK("0c5", "Quelltext")],
  ]);
  assert.ok(!f.some((x) => x.includes("#### Programmcode") && x.includes("is not")), f.join("\n"));
});

test("two processes with the same German name fail, as R2 holds the primary's unique", () => {
  const f = r19Scoped([
    ["model/processes/a/a.md", PROCESS("0d1", "Process A", "Ablauf")],
    ["model/processes/b/b.md", PROCESS("0d2", "Process B", "Ablauf")],
  ]);
  assert.ok(f.some((x) => x.includes("de-CH name \"Ablauf\" is also")), f.join("\n"));
});

// Spec, "Concept aliases": an alias of kind `translation` stays for a language the instance does
// not declare. Where the locale IS declared, the concept's name in it is its `### Name`, and an
// alias that repeats it is not naming an undeclared language at all.
const DOMAIN = (de) => `---\nid: 01a0f10d-64f0-71c7-8329-86453b047992\nsource: Local\n---\n\n# Ops\n\n> The area.\n${de}`;
const DE_DOMAIN = "\n## de-CH\n\n### Name\n\nBetrieb\n\n### Statement\n\n> Der Bereich.\n";
const CONCEPT = (aliasRow, de) =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b047993\nsource: Local\ndomain: Ops\n---\n\n# Invoice line\n\n> One line on an invoice.\n\n` +
  `## Also known as\n\n| Term | Kind |\n| --- | --- |\n${aliasRow}\n${de}`;
const DE_CONCEPT = (name, term) =>
  `\n## de-CH\n\n### Name\n\n${name}\n\n### Statement\n\n> Eine Zeile auf einer Rechnung.\n\n` +
  `### Also known as\n\n| Term | Kind |\n| --- | --- |\n| ${term} | translation |\n`;

const r19Concept = (aliasRow, { deLoc = false, deConcept = "", deDomain = "" } = {}) =>
  checkInstance(new Map([
    ...["localization", "source", "domain", "concept"].map((t) => [`meta/core/${t}-schema.md`, read(`${t}-schema.md`)]),
    ["model/localization.md", deLoc ? DE_LOC : LOC("| en-US | primary |")],
    ["model/sources/local.md", LOCAL(deLoc ? DE_LOCAL : "")],
    ["model/domains/ops.md", DOMAIN(deDomain)],
    ["model/concepts/invoice-line.md", CONCEPT(aliasRow, deConcept)],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("a translation alias that repeats the concept's declared de-CH name fails", () => {
  const f = r19Concept("| Rechnungszeile | translation |", {
    deLoc: true, deConcept: DE_CONCEPT("Rechnungszeile", "Rechnungszeile"), deDomain: DE_DOMAIN,
  });
  assert.ok(
    f.some((x) => x.includes(
      'model/concepts/invoice-line.md: the alias "Rechnungszeile" of kind translation repeats the concept\'s de-CH name; a declared language\'s name is its `### Name`, and an alias is for a language the instance does not declare (R19)',
    )),
    f.join("\n"),
  );
});

test("the same alias passes where de-CH is not declared at all", () => {
  assert.deepEqual(r19Concept("| Rechnungszeile | translation |"), []);
});

test("a translation alias for a different name than the declared de-CH one passes", () => {
  const f = r19Concept("| Ligne de facture | translation |", {
    deLoc: true, deConcept: DE_CONCEPT("Rechnungszeile", "Rechnungszeile"), deDomain: DE_DOMAIN,
  });
  assert.deepEqual(f, []);
});

// Fix 1(a): a `ref → by <Column>`/`ref → by <Column> in <Owner>` column names the row's own
// Type/Owner cells (R4, R9), so those two are held to the primary though their own declared
// kind is `string`. `For` is ordinary free text and may still be translated.
const ROW = (typeCell, ownerCell, forCell) => `| ${typeCell} | \`Basic\` | ${ownerCell} | ${forCell} |`;
const QUESTION = (row, deRow) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047996\nsource: Local\nkind: Pricing\n---\n\n# Does pricing include support?\n\n" +
  `> See the plan page.\n\n## Rests on\n\n| Type | Entity | Owner | For |\n| --- | --- | --- | --- |\n${row}\n\n` +
  `## de-CH\n\n### Name\n\nDeckt der Preis Support ab?\n\n### Statement\n\n> Siehe die Planseite.\n\n` +
  `### Rests on\n\n| Type | Entity | Owner | For |\n| --- | --- | --- | --- |\n${deRow}\n`;

const r19Question = (files) =>
  checkInstance(new Map([
    ...["localization", "source", "question"].map((t) => [`meta/core/${t}-schema.md`, read(`${t}-schema.md`)]),
    ["model/localization.md", DE_LOC],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
    ...files,
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("a `Rests on` row keeps its Type and Owner, and its free-text For column may differ", () => {
  const f = r19Question([["model/questions/pricing.md", QUESTION(
    ROW("kpi", "", "the sequence"),
    ROW("kpi", "", "die Reihenfolge"),
  )]]);
  assert.deepEqual(f, []);
});

test("a `Rests on` row whose de-CH Type cell differs from the primary's fails, though Type is declared string", () => {
  const f = r19Question([["model/questions/pricing.md", QUESTION(
    ROW("kpi", "", "the sequence"),
    ROW("risiko", "", "die Reihenfolge"),
  )]]);
  assert.ok(f.some((x) => x.includes('column Type is "risiko"') && x.includes("a reference is the page's, \"kpi\"")), f.join("\n"));
});

test("a `Rests on` row whose de-CH Owner cell differs from the primary's fails", () => {
  const f = r19Question([["model/questions/pricing.md", QUESTION(
    ROW("track", "`Delivery`", "the sequence"),
    ROW("track", "`Auslieferung`", "die Reihenfolge"),
  )]]);
  assert.ok(f.some((x) => x.includes('column Owner is "`Auslieferung`"') && x.includes("a reference is the page's, \"`Delivery`\"")), f.join("\n"));
});

// Fix 1(b): a cell whose primary value is a language tag the localization file declares — the
// localization page's own `Locale` column above all — is held without the column being named.
test("a translated cell whose primary value is a declared language tag is held, without the column being named", () => {
  const loc = DE_LOC.replace(/(### Locales[\s\S]*)\| de-CH \| translated \|/, "$1| fr-CH | translated |");
  const f = checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ["model/localization.md", loc],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
  ]), { core: "meta/core", model: "model" }).failures.filter((x) => x.includes("(R19)"));
  assert.ok(f.some((x) => x.includes('column Locale is "fr-CH"') && x.includes("a language tag is the page's, \"de-CH\"")), f.join("\n"));
});

// Fix 2: a URL is held wherever it stands inside a free-text cell, not only where the whole cell
// is one; the words around it may still be translated.
const REF_EXPERIENCE = (refCell, deRefCell) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b0479a0\nsource: Local\nstart: 2020\nkind: Employment\n---\n\n# Rebuilding billing\n\n> A period.\n\n" +
  "## Achievements\n\n### Delivery\n\n- Shipped it.\n\n## References\n\n| What | URL |\n| --- | --- |\n" +
  `| A record | ${refCell} |\n\n## de-CH\n\n### Name\n\nAbrechnung neu gebaut\n\n### Statement\n\n> Eine Phase.\n\n` +
  "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\n| What | URL |\n| --- | --- |\n" +
  `| Ein Eintrag | ${deRefCell} |\n`;

test("a URL embedded in a free-text cell is held; the words around it may still change", () => {
  const failing = r19Deep(REF_EXPERIENCE("[Docs](https://x.example/en/a)", "[Doku](https://x.example/de/a)"));
  assert.ok(failing.some((x) => x.includes("column URL") && x.includes("a URL is the page's")), failing.join("\n"));
  const passing = r19Deep(REF_EXPERIENCE("[Docs](https://x.example/en/a)", "[Doku](https://x.example/en/a)"));
  assert.deepEqual(passing, []);
});

// Fix 4: an element the primary itself leaves empty may be left empty in its translation too —
// only an element the primary actually says something in must be said in the translation.
const FEATURE = (de) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047997\nsource: Local\n---\n\n# Invoice lines\n\n> One paragraph.\n\n## Description\n\n\n" + de;
const DE_FEATURE_EMPTY = "\n## de-CH\n\n### Name\n\nRechnungszeilen\n\n### Statement\n\n> Ein Absatz.\n\n### Description\n\n\n";

test("a primary section left empty passes when its translation is empty too", () => {
  const f = r19([
    ["meta/core/feature-schema.md", read("feature-schema.md")],
    ["model/localization.md", DE_LOC],
    ["model/features/invoice-lines.md", FEATURE(DE_FEATURE_EMPTY)],
  ]);
  assert.deepEqual(f, []);
});

// Fix 5: an empty repeated section is reported once — the completeness check reports it as
// empty, and the structure check's table comparison is skipped for it, not run again.
const DE_EXPERIENCE_EMPTY_REFS = "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\n";

test("an empty repeated section gives exactly one R19 failure for it", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE_EMPTY_REFS));
  const about = f.filter((x) => x.includes("References"));
  assert.equal(about.length, 1, f.join("\n"));
  assert.ok(about[0].includes("leaves `### References` empty"), about[0]);
});

// Fix 6: a changed table header is reported once, and never with "undefined" for a cell the
// mismatched shape left with nothing to compare — a shorter row prints "(none)" instead.
const DE_EXPERIENCE_BAD_HEADER = "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\n| Was |\n| --- |\n| Ein Eintrag |\n";

test("a changed table header gives the header failure and never prints undefined", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE_BAD_HEADER));
  assert.ok(f.some((x) => x.includes("heads its table under `### References` Was; it keeps the page's columns, What | URL")), f.join("\n"));
  assert.ok(!f.some((x) => x.includes("undefined")), f.join("\n"));
});

const DE_EXPERIENCE_SHORT_ROW = "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\n| What | URL |\n| --- | --- |\n| Ein Eintrag |\n";

test("a shorter translated row prints (none) rather than undefined", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE_SHORT_ROW));
  assert.ok(f.some((x) => x.includes('column URL is "(none)"')), f.join("\n"));
  assert.ok(!f.some((x) => x.includes("undefined")), f.join("\n"));
});

// Fix 10 (test only): coverage that should already be right. A translated language declared and
// missing from a page is "a page without a declared language's section fails, naming the
// language", above; the rest follow here.
const LOC2 =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047998\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n" +
  "## Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n| de-CH | translated |\n| pl-PL | translated |\n\n" +
  "## de-CH\n\n### Name\n\nSprachen\n\n### Statement\n\n> Wer es liest.\n\n### Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n| de-CH | translated |\n| pl-PL | translated |\n\n" +
  "## pl-PL\n\n### Name\n\nJęzyki\n\n### Statement\n\n> Kto to czyta.\n\n### Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n| de-CH | translated |\n| pl-PL | translated |\n";
const LOCAL2_OK =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n\n" +
  "## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n\n" +
  "## pl-PL\n\n### Name\n\nLokalny\n\n### Statement\n\n> Tutaj.\n";
const LOCAL2_BAD_ORDER =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n\n" +
  "## pl-PL\n\n### Name\n\nLokalny\n\n### Statement\n\n> Tutaj.\n\n" +
  "## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n";
const LOCAL2_TWICE =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n\n" +
  "## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n\n" +
  "## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n\n" +
  "## pl-PL\n\n### Name\n\nLokalny\n\n### Statement\n\n> Tutaj.\n";

const r19Two = (localPage) =>
  checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ["model/localization.md", LOC2],
    ["model/sources/local.md", localPage],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("(test only) two declared languages written in the declared order pass", () => {
  assert.deepEqual(r19Two(LOCAL2_OK), []);
});

test("(test only) a page writing two declared languages out of the declared order fails", () => {
  const f = r19Two(LOCAL2_BAD_ORDER);
  assert.ok(f.some((x) => x.includes("its language sections stand as pl-PL, de-CH") && x.includes("declares them as de-CH, pl-PL")), f.join("\n"));
});

test("(test only) a language section written twice fails", () => {
  const f = r19Two(LOCAL2_TWICE);
  assert.ok(f.some((x) => x.includes("`## de-CH` is written twice")), f.join("\n"));
});

const LOCAL_ELEMENTS_SWAPPED =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047991\n---\n\n# Local\n\n> Here.\n\n## de-CH\n\n### Statement\n\n> Hier.\n\n### Name\n\nLokal\n";

test("(test only) a language section with the page's elements in another order fails", () => {
  const f = r19([["model/localization.md", DE_LOC], ["model/sources/local.md", LOCAL_ELEMENTS_SWAPPED]]);
  assert.ok(f.some((x) => x.includes("holds the page's elements in another order")), f.join("\n"));
});

const DE_EXPERIENCE_NO_TABLE = "### Achievements\n\n#### Lieferung\n\n- Ausgeliefert.\n\n### References\n\nSiehe oben.\n";

test("(test only) a repeated table missing entirely fails", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE_NO_TABLE));
  assert.ok(f.some((x) => x.includes("has no table 1 under `### References`, which the page has")), f.join("\n"));
});

// A profile's Skills table's Level column is `qualifier → proficiency-level`; a changed cell in
// German should already fail, as every non-`string` declared kind already did before this pass.
const SKILL = "---\nid: 01a0f10d-64f0-71c7-8329-86453b0479b0\nsource: Local\n---\n\n# Delivery\n\n> Shipping the work.\n\n## de-CH\n\n### Name\n\nLieferung\n\n### Statement\n\n> Die Arbeit ausliefern.\n";
const LEVEL = (name, de, id) =>
  `---\nid: 01a0f10d-64f0-71c7-8329-86453b0479${id}\nsource: Local\nrank: ${id === "b1" ? 10 : 20}\n---\n\n# ${name}\n\n> A rung.\n\n## What it means\n\nWhat it means.\n\n## de-CH\n\n### Name\n\n${de}\n\n### Statement\n\n> Eine Sprosse.\n\n### What it means\n\nWas es bedeutet.\n`;
const PROFILE = (levelCell, deLevelCell) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b0479b3\nsource: Local\nnature: human\n---\n\n# Ana\n\n> Works on delivery.\n\n" +
  `## Skills\n\n| Skill | Level |\n| --- | --- |\n| Delivery | ${levelCell} |\n\n` +
  `## de-CH\n\n### Name\n\nAna\n\n### Statement\n\n> Arbeitet an der Lieferung.\n\n### Skills\n\n| Skill | Level |\n| --- | --- |\n| Delivery | ${deLevelCell} |\n`;

const r19Skills = (levelCell, deLevelCell) =>
  checkInstance(new Map([
    ...["localization", "source", "skill", "proficiency-level", "profile"].map((t) => [`meta/core/${t}-schema.md`, read(`${t}-schema.md`)]),
    ["model/localization.md", DE_LOC],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
    ["model/skills/delivery.md", SKILL],
    ["model/proficiency-levels/proficient.md", LEVEL("Proficient", "Kompetent", "b1")],
    ["model/proficiency-levels/expert.md", LEVEL("Expert", "Experte", "b2")],
    ["model/profiles/ana/ana.md", PROFILE(levelCell, deLevelCell)],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("(test only) a profile's de-CH Skills table keeps its Level cell and passes", () => {
  assert.deepEqual(r19Skills("Proficient", "Proficient"), []);
});

test("(test only) a profile's de-CH Skills table with a changed Level cell fails", () => {
  const f = r19Skills("Proficient", "Expert");
  assert.ok(f.some((x) => x.includes("column Level is \"Expert\"") && x.includes("a reference is the page's, \"Proficient\"")), f.join("\n"));
});

// Follow-up 1: `urlsOf` kept a URL match's trailing sentence punctuation, so an English sentence
// ending "...https://x.example/a, and more" (URL followed by a comma) and a German one ending
// "...https://x.example/a und mehr" (no comma) read as two different URLs and failed, though the
// address is the same and only the punctuation around it, which the sentence owns, differs.
test("(follow-up 1) a URL's trailing sentence punctuation is not part of the URL that is held", () => {
  const failing = r19Deep(REF_EXPERIENCE("See https://x.example/a, and more.", "Siehe https://x.example/a und mehr."));
  assert.deepEqual(failing, []);
});

// Follow-up 2: only `ref`/`ref?`/`qualifier`/`enum`/`date`/`number` were held; R9's closed type
// vocabulary also has `image` and `array`, and any of those was free before this fix (silently
// passed whatever the translator wrote, since it is not a URL either). No shipped core schema
// declares a body-table column of either kind, so this table's own schema is a fixture the test
// builds — the real `source-schema.md` with one synthetic captioned table appended.
const EXTRAS_TABLE =
  "\n`## Extras` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
  "| `Note` | Yes | array | A column of an uncommon declared kind, for this test only |\n\n";
const FAKE_SOURCE_SCHEMA = read("source-schema.md").replace("\n## Purpose\n", `${EXTRAS_TABLE}## Purpose\n`);
const FAKE_SOURCE = (noteCell, deNoteCell) =>
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b0479c1\n---\n\n# Local\n\n> Here.\n\n" +
  `## Extras\n\n| Note |\n| --- |\n| ${noteCell} |\n\n` +
  "## de-CH\n\n### Name\n\nLokal\n\n### Statement\n\n> Hier.\n\n" +
  `### Extras\n\n| Note |\n| --- |\n| ${deNoteCell} |\n`;

const r19ArrayKind = (noteCell, deNoteCell) =>
  checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", FAKE_SOURCE_SCHEMA],
    ["model/localization.md", DE_LOC],
    ["model/sources/local.md", FAKE_SOURCE(noteCell, deNoteCell)],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("(R19)"));

test("(follow-up 2) a declared kind besides ref/qualifier/enum/date/number — array — is held too", () => {
  assert.deepEqual(r19ArrayKind("alpha, beta", "alpha, beta"), []);
  const f = r19ArrayKind("alpha, beta", "gamma");
  assert.ok(f.some((x) => x.includes('column Note is "gamma"') && x.includes("a value is the page's, \"alpha, beta\"")), f.join("\n"));
});

// Follow-up 3: an empty translated grouped section (a `### Achievements` with no `####`
// headings under it) was reported by the completeness check as empty, and then again by the
// grouped-heading loop as "`#### (none)` ... is not ...", for every heading the primary has.
const DE_EXPERIENCE_EMPTY_ACHIEVEMENTS = "### Achievements\n\n### References\n\n| What | URL |\n| --- | --- |\n| Ein Eintrag | https://example.com/record |\n";

test("(follow-up 3) an empty translated grouped section gives exactly one R19 failure for it", () => {
  const f = r19Deep(EXPERIENCE(DE_EXPERIENCE_EMPTY_ACHIEVEMENTS));
  const about = f.filter((x) => x.includes("Achievements"));
  assert.equal(about.length, 1, f.join("\n"));
  assert.ok(about[0].includes("leaves `### Achievements` empty"), about[0]);
});

// Follow-up 4: `tablesOf` keeps a cell's backticks, but `localizationOf` strips them before
// building the declared tag set, so a Locale cell written backticked — `` `de-CH` `` — never
// matched a plain "de-CH" in that set and read as ordinary, unconstrained free text.
const LOC_BACKTICKED =
  "---\nid: 01a0f10d-64f0-71c7-8329-86453b047999\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n" +
  "## Locales\n\n| Locale | Role |\n| --- | --- |\n| `en-US` | primary |\n| `de-CH` | translated |\n\n" +
  "## de-CH\n\n### Name\n\nSprachen\n\n### Statement\n\n> Wer es liest.\n\n### Locales\n\n| Locale | Role |\n| --- | --- |\n| `en-US` | primary |\n| `de-CH` | translated |\n";

const r19Backticked = (loc) =>
  checkInstance(new Map([
    ["meta/core/localization-schema.md", read("localization-schema.md")],
    ["meta/core/source-schema.md", read("source-schema.md")],
    ["model/localization.md", loc],
    ["model/sources/local.md", LOCAL(DE_LOCAL)],
  ]), { core: "meta/core", model: "model" }).failures.filter((x) => x.includes("(R19)"));

test("(follow-up 4) a backticked Locale cell is held to the primary too", () => {
  assert.deepEqual(r19Backticked(LOC_BACKTICKED), []);
  const bad = LOC_BACKTICKED.replace(/(### Locales[\s\S]*)\| `de-CH` \| translated \|/, "$1| `fr-CH` | translated |");
  const f = r19Backticked(bad);
  assert.ok(f.some((x) => x.includes('column Locale is "`fr-CH`"') && x.includes("a language tag is the page's, \"`de-CH`\"")), f.join("\n"));
});
