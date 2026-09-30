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
  assert.ok(f.some((x) => x.includes("column Role is \"übersetzt\"")), f.join("\n"));
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
