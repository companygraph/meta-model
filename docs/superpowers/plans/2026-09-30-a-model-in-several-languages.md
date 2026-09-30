# A model in several languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance declares its primary language and its translated ones in a required singleton, `model/localization.md`; every page carries one `## <tag>` section per translated language that repeats the page's shape; the parser returns those sections as `translations`; the checks hold them complete, structurally the primary's and uniquely named; and a pull request that changes the primary without its translations fails unless a trailer releases it.

**Architecture:** A dependency-free `lib/localization.mjs` reads the singleton, cuts a page's body into its primary and its language sections, reads each into elements keyed by the paths of the schema-id spec (`name`, `statement`, `section/<heading>`), and finds stale translations in a range. Core gains R19, a reworded R14, pointers in R2, R3 and R4, and `core/localization-schema.md`; `init` writes the file. `parseInstance` reads language sections off each page into `translations`. Two instance checks own R19's tree half; `companygraph translations --range` owns its history half, and the reusable workflow runs it.

**Tech Stack:** Node 22 ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-09-30-a-model-in-several-languages-design.md`

This plan covers meta-model only. The MCP server's `locale` argument, the chat, each site's renderer and `conventions/TRANSLATOR.md` each take the release in a plan of their own, after it ships, and no family instance declares a translated language in this plan.

## Global Constraints

- R14's heading becomes `### R14 — Names are American English, and prose is in the primary locale`, and its first paragraph, verbatim: `Every name this vocabulary chooses is spelled in American English — a field, a type, a folder, a section heading a schema declares — and so is the prose of `core/`. An instance's content is written in the primary locale its `model/localization.md` declares, and translated into the locales it declares beside it, each in a section of the page it translates (R19).` Its later paragraphs stay.
- R19, verbatim, directly after the R18 section: the heading `### R19 — A translation is a section of the page it translates` and the paragraph the spec quotes after **R19 —**, from `A page carries one` to `by its primary name only.`
- The singleton is type `localization`, schema `core/localization-schema.md`, file `model/localization.md`, with a required `## Locales` table of columns `Locale` (string) and `Role` (enum, `primary` or `translated`). Exactly one `primary`; no tag twice.
- A language tag, as a heading or a cell: `/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/`. No heading a schema declares matches it, since every declared heading opens with a capital.
- A language section's headings: `### Name`, `### Statement` where the page has a `>` line, then one `###` per `##` section the page has, in the page's order; a grouped section's `###` items become `####`.
- A repeated table has the primary's columns and row count, and every cell of a column not declared `string` is the primary's, as is every cell whose primary value is a URL (`https://…`, `http://…` or `<http…>`). Free text in a `string` column may differ.
- A grouped `####` heading in a language section is that language's name of the entity the primary's `###` heading at the same place names.
- Free prose is not read by a script, in the primary or in a language (R3's agent pass).
- The release trailer is `Translation-unchanged: <file>#<path>`, `<file>` as the pull request's diff names it (`model/features/x.md`), `<path>` as above.
- A core without `core/localization-schema.md` holds no page to R19 and asks for no localization file, so an instance on an older core checks as it did.
- No version bump in this plan. The release is breaking in `WORKING.md`'s terms, and its number and notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line.
- Before any `node` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.

## Review Focus

- A heading inside a fenced code block that looks like `## de-CH` must not start a language section. Pinned in Task 1.
- A page on an instance that declares no translated language, which is every instance today, must parse and check exactly as before: no `translations` key, no R19 failure. Pinned in Tasks 3 and 4.
- A statement-less page (a source's `> ` line is optional in no schema, but a stub may lack it) must not be asked for `### Statement`. Pinned in Task 4.
- A URL in a References table that a translator "localized" (`/de/` inserted) must fail, while the `What` column's text may change. Pinned in Task 5.
- A pull request that adds a new section to the primary together with its translation must pass the range check. Pinned in Task 6.

---

### Task 1: Languages are read in one module

**Files:**

- Create: `lib/localization.mjs`
- Test: `verify/localization.test.mjs`
- Modify: `package.json` (a `test:localization` script), `.github/workflows/ci.yml` (run it in both jobs)

**Interfaces:**

- Produces:
  - `LANGUAGE_TAG: RegExp`
  - `localizationOf(text: string) → { primary: string, translated: string[] } | { error: string }`
  - `languageSectionsOf(body: string) → { primary: string, sections: Map<string, string>, order: string[], after: string[] }` — `body` is a page without its frontmatter
  - `asPage(section: string) → string` — `###`→`##`, `####`→`###`, outside fences
  - `primaryElementsOf(primary: string) → Map<string, string>` and `translationElementsOf(section: string) → Map<string, string>`, keyed `name`, `statement`, `section/<heading>`, values trimmed text
  - `withoutFrontmatter(text: string) → string`

- [ ] **Step 1: Write the failing tests**

```js
// verify/localization.test.mjs
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
```

In `package.json`, add `"test:localization": "node --test verify/localization.test.mjs",` after `test:ids`. In `.github/workflows/ci.yml`, add to the `verify` job after the step `An entity's id, made and read`:

```yaml
      - name: A model's languages, read
        run: npm run test:localization
```

and in the `windows` job append ` && npm run test:localization` to the step that runs `npm run test:ids`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:localization` Expected: FAIL, `Cannot find module '../lib/localization.mjs'`.

- [ ] **Step 3: Write the implementation**

```js
// lib/localization.mjs
// How a model is kept in more than one language (R14, R19), read in one place. Pure and with no
// import, so the parser, the checks and the CLI share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag as a heading or a cell carries one: `de-CH`, `en-US`, `pl-PL`, `fr`. No
// heading a schema declares is written so, since every declared heading opens with a capital.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
export const withoutFrontmatter = (text) => text.replace(FRONTMATTER, "");

const FENCE = /^\s*(```|~~~)/;

// What model/localization.md declares: the primary language and the translated ones, in the
// order its `## Locales` table lists them. What cannot be read is an error naming why, and the
// caller reports it once, on the file.
export function localizationOf(text) {
  const lines = withoutFrontmatter(text).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return { error: "no `## Locales` table" };
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (line.trim().startsWith("|")) rows.push(line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")));
  }
  const [head, , ...data] = rows;
  if (!head || head[0] !== "Locale" || head[1] !== "Role") return { error: "`## Locales` is not a table with the columns Locale | Role" };
  const primary = [], translated = [], seen = new Set();
  for (const [tag = "", role = ""] of data) {
    if (!LANGUAGE_TAG.test(tag)) return { error: `"${tag}" is no language tag, as \`de-CH\` or \`en-US\` is` };
    if (seen.has(tag)) return { error: `${tag} is written twice` };
    seen.add(tag);
    if (role === "primary") primary.push(tag);
    else if (role === "translated") translated.push(tag);
    else return { error: `${tag} has the role "${role}"; a role is \`primary\` or \`translated\`` };
  }
  if (primary.length !== 1) return { error: `${primary.length ? "more than one" : "no"} language is \`primary\`; exactly one is` };
  return { primary: primary[0], translated };
}

// A page's body, without its frontmatter, cut where its language sections begin: `primary` is
// everything before the first `## <tag>`, and each language section runs to the next `##`. A
// fenced block is never cut. `order` lists the language headings as written, twice where one is
// written twice, and `after` every other `##` heading that stands below one, which R19 does not
// allow; its lines go back to the primary, so nothing a page says is lost to a misplaced heading.
export function languageSectionsOf(body) {
  const primary = [], sections = new Map(), order = [], after = [];
  let current = null, fenced = false;
  for (const line of body.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading && LANGUAGE_TAG.test(heading[1])) {
      current = heading[1];
      order.push(current);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (heading && current !== null) {
      after.push(heading[1]);
      current = null;
    }
    (current === null ? primary : sections.get(current)).push(line);
  }
  return {
    primary: primary.join("\n"),
    sections: new Map([...sections].map(([tag, lines]) => [tag, lines.join("\n")])),
    order,
    after,
  };
}

// A language section read as a page is: its `###` headings become a page's `##`, and a grouped
// section's `####` items its `###`, so every reader of a page reads a translation too.
export function asPage(section) {
  let fenced = false;
  return section
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) fenced = !fenced;
      if (fenced || FENCE.test(line)) return line;
      return /^###\s/.test(line) ? line.slice(1) : line;
    })
    .join("\n");
}

// The `##` sections of a text, by heading, with "" for what stands before the first; fenced
// headings are text.
function splitSections(text) {
  const out = new Map([["", []]]);
  let key = "", fenced = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      key = heading[1];
      out.set(key, []);
    } else out.get(key).push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join("\n").trim()]));
}

// The primary's elements by the path a translation is keyed with: the H1 as `name`, the `>`
// lines as `statement` where there are any, and every `##` section as `section/<heading>`.
export function primaryElementsOf(primary) {
  const parts = splitSections(primary);
  const preamble = parts.get("").split("\n");
  const out = new Map();
  const name = preamble.find((l) => /^#\s/.test(l));
  if (name) out.set("name", name.replace(/^#\s+/, "").trim());
  const statement = preamble.filter((l) => l.startsWith(">")).join("\n").trim();
  if (statement) out.set("statement", statement);
  for (const [heading, text] of parts) if (heading) out.set(`section/${heading}`, text);
  return out;
}

// A language section's elements by the same paths: `### Name` is `name`, `### Statement` is
// `statement`, and every other `###` is the section it translates.
export function translationElementsOf(section) {
  const out = new Map();
  for (const [heading, text] of splitSections(asPage(section))) {
    if (!heading) continue;
    out.set(heading === "Name" ? "name" : heading === "Statement" ? "statement" : `section/${heading}`, text);
  }
  return out;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:localization` Expected: PASS, every test.

- [ ] **Step 5: Commit**

```bash
git add lib/localization.mjs verify/localization.test.mjs package.json .github/workflows/ci.yml
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `A model's languages are read in one module`; `Verified: npm run test:localization passes, after failing on the missing module.`; then the trailers.

---

### Task 2: Core declares the localization, and init writes it

**Files:**

- Modify: `core/CONVENTIONS.md` (R14, R19 after R18, a sentence in R2, R3 and R4, the rules `verify` reaches)
- Create: `core/localization-schema.md`
- Create: `example/model/localization.md`
- Modify: `lib/checks.mjs` (the `TYPES` row)
- Modify: `lib/instance-files.mjs` (`LOCALIZATION_PAGE`, and `startingEntities` writes it)
- Test: `verify/localization-file.test.mjs`; `package.json` (`test:instance-checks` gains the file)

**Interfaces:**

- Consumes: `localizationOf` from Task 1 (in the test only).
- Produces: `TYPES` row `{ type: "localization", file: "localization.md" }`; `LOCALIZATION_PAGE({ id, source, primary = "en-US" }) → string`.

- [ ] **Step 1: Write the failing tests**

```js
// verify/localization-file.test.mjs
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
```

In `package.json`, append ` verify/localization-file.test.mjs` to the `test:instance-checks` script's file list.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/localization-file.test.mjs` Expected: FAIL, `ENOENT` on `core/localization-schema.md`.

- [ ] **Step 3: Write the rules**

In `core/CONVENTIONS.md`:

- Replace the heading `### R14 — Names and prose are American English` with `### R14 — Names are American English, and prose is in the primary locale`, and its first paragraph with the Global Constraints' R14 paragraph.
- Directly after the R18 section, before `### R8`, add the R19 heading and paragraph from the Global Constraints.
- R2: append to its paragraph that begins `A name identifies an entity within its type` the sentence `A name in a translated locale is held the same way, within that locale (R19).`
- R3: append to `Never by file path and never by filename. Paths move; a canonical name is the entity.` the sentence `In a locale's section, the canonical name is the entity's name in that locale (R19).`
- R4: append to `Not a warning. A reference naming an entity that does not exist, or that exists under a different type, fails the check.` the sentence `A reference in a locale's section resolves among that locale's names (R19).`
- In the paragraph that lists what `npm run verify` checks, replace `R15, R16 and R18 against` with `R15, R16, R18 and R19 against`.

- [ ] **Step 4: Write the schema and the example's file**

Make two ids with `node bin/companygraph.mjs id`, one per file, and write `core/localization-schema.md`:

```markdown
---
id: <a fresh id>
---

# Localization Schema

> Required structure for the localization file: the language an instance is written in, and the ones it is translated into.

## File Location

`model/localization.md`

An instance has one set of languages, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its languages |
| `> [Statement]` | Yes | One paragraph on who reads the model in which language |
| `## Locales` | Yes | Table. The primary language and every translated one; its columns are declared below. |
| `## References` | No | Table. The standard the tags follow; its columns are declared below. |

`## Locales` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Locale` | Yes | string | A BCP 47 language tag, `de-CH` or `en-US` |
| `Role` | Yes | enum | `primary` or `translated`. The primary is the language the pages are written in; a translated locale is one every page carries a section for. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The localization file says which language the pages are written in and which ones each page is translated into, so that a reader, an agent or a check knows which sections a page carries and which language an answer can be grounded in. How a translation is written is R19's, not this page's.

## Writing rules

- Exactly one row is `primary`, and no tag is written twice.
- A locale is declared `translated` only once every page carries it; a translation that is not finished stays undeclared, since a reader would otherwise get two languages on one page.
- The statement names who reads the model in which language: the owner, a customer, an agent answering in it.
- Names and prose are in the primary locale (R14).
```

and `example/model/localization.md`:

```markdown
---
id: <a fresh id>
source: Local
---

# Languages

> Beacon Systems writes its model in American English for everyone who reads it, people and agents alike.

## Locales

| Locale | Role |
| --- | --- |
| en-US | primary |
```

Check that the example's other pages name their source `Local`: `grep -l '^source: Local' example/model/*.md` lists `identity.md`; if it names another, use that one.

- [ ] **Step 5: Wire the type and init**

In `lib/checks.mjs`, after the `identifier` row of `TYPES`, add:

```js
  // An instance has one set of languages (R14, R19), so its declaration is one file in the
  // container, as the identifier's is, named for the type.
  { type: "localization", file: "localization.md" },
```

In `lib/instance-files.mjs`, after `IDENTIFIER_PAGE`, add:

```js
// The localization file init writes: the one language an instance starts in, as its primary. An
// instance written in another language, or translated, edits the table before its first page.
export const LOCALIZATION_PAGE = ({ id, source, primary = "en-US" }) =>
  `---\nid: ${id}\nsource: ${source}\n---\n\n# Languages\n\n` +
  "> One paragraph saying who reads this model, in which language.\n\n" +
  `## Locales\n\n| Locale | Role |\n| --- | --- |\n| ${primary} | primary |\n`;
```

and in `startingEntities`, after the `model/identifier.md` entry:

```js
    ["model/localization.md", LOCALIZATION_PAGE({ id: id(), source: "Local" })],
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test:instance-checks && npm run test:instance-files && npm run test:cli && npm run test:rules && npm run verify` Expected: PASS. `verify` reads the new schema's shape and the example's new file; `test:cli` inits instances that now carry `model/localization.md`. If a CLI or instance-files test pins the exact list of files `init` writes, add `model/localization.md` to that list, and ledger it as a ruling.

- [ ] **Step 7: Commit**

```bash
git add core/ example/model/localization.md lib/checks.mjs lib/instance-files.mjs verify/localization-file.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `Core declares the localization, and init writes it`; `Verified:` names the Step 6 commands; then the trailers.

---

### Task 3: The parser returns an entity's translations

**Files:**

- Modify: `lib/instance.mjs` (`parseInstance`, where each page's body is read; the import)
- Modify: `README.md` (the paragraph that says what an entity carries)
- Test: `verify/instance.test.mjs`

**Interfaces:**

- Consumes: `localizationOf`, `languageSectionsOf`, `asPage` from Task 1.
- Produces: an entity carries `translations: { [tag]: { name, statement, sections } }` only where its instance declares a translated language and the page has that section; `sections` never holds a language section.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance.test.mjs`:

```js
// The localization schema joins the fixture's, since the parser places a page only by a schema.
const schemasWithLocalization = new Map(schemas).set(
  "localization-schema.md",
  fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../core/localization-schema.md"), "utf8"),
);
const LOCALIZED = (() => {
  const files = new Map(valid);
  files.set("localization.md", "---\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n| de-CH | translated |\n");
  const [path, text] = [...files].find(([p]) => p.startsWith("skills/"));
  files.set(path, `${text.trimEnd()}\n\n## de-CH\n\n### Name\n\nJava-Programmierung\n\n### Statement\n\n> Auf Deutsch.\n`);
  return { files, path };
})();

test("a page's language section leaves its sections and arrives as its translation", () => {
  const { entities } = parseInstance(LOCALIZED.files, { schemas: schemasWithLocalization });
  const skill = entities.find((e) => e.path === LOCALIZED.path);
  assert.deepEqual(skill.translations["de-CH"], { name: "Java-Programmierung", statement: "Auf Deutsch.", sections: [] });
  assert.ok(!skill.sections.some((s) => s.heading === "de-CH"));
});

test("an instance that declares no translated language parses exactly as before", () => {
  const { entities } = parseInstance(valid, { schemas });
  assert.ok(entities.every((e) => !("translations" in e)));
});
```

The fixture relies on `valid` holding at least one page under `skills/`; if it holds none, pick the first page of any plural type and ledger the ruling.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:instance` Expected: FAIL on the first test, `skill.translations` undefined.

- [ ] **Step 3: Write the implementation**

At the top of `lib/instance.mjs`, import:

```js
import { localizationOf, languageSectionsOf, asPage } from "./localization.mjs";
```

In `parseInstance`, before the loop over `files`, read the declared languages:

```js
  // R19: the languages every page is translated into, as `localization.md` declares them. None
  // where the file is absent or unreadable, which is an older core's instance or the check's
  // finding; a page's language sections are then read as nothing, and its sections as before.
  const declared = files.has("localization.md") ? localizationOf(files.get("localization.md")) : null;
  const translatedTags = declared?.translated ?? [];
```

and replace

```js
    const [fields, body] = parseFrontmatter(lines);
    const { name, tagline, sections } = parseBody(body);
    entities.push({ id: self.id, address: self.id, type, name, tagline, fields, sections,
                    owner: self.ownerId, path: sub + path });
```

with

```js
    const [fields, body] = parseFrontmatter(lines);
    // A page's language sections are not sections its schema declares: they come off the body
    // and arrive as `translations`, each read as a page one level up (R19).
    const cut = languageSectionsOf(body.join("\n"));
    const { name, tagline, sections } = parseBody(cut.primary.split("\n"));
    const entity = { id: self.id, address: self.id, type, name, tagline, fields, sections,
                     owner: self.ownerId, path: sub + path };
    const translations = {};
    for (const tag of translatedTags) {
      if (!cut.sections.has(tag)) continue;
      const read = parseBody(asPage(cut.sections.get(tag)).split("\n")).sections;
      const text = (heading) => read.find((s) => s.heading === heading)?.text ?? "";
      translations[tag] = {
        name: text("Name"),
        statement: text("Statement").split("\n").map((l) => l.replace(/^>\s?/, "")).join("\n").trim(),
        sections: read.filter((s) => s.heading !== "Name" && s.heading !== "Statement"),
      };
    }
    if (Object.keys(translations).length) entity.translations = translations;
    entities.push(entity);
```

In `README.md`, append to the sentence that ends `and \`address\`, its folder-and-slug path.` the sentence: `Where the instance's \`localization.md\` declares a translated language, an entity also carries \`translations\`, keyed by language tag, each with the \`name\`, \`statement\` and \`sections\` that language's section of the page gives (R19); its \`sections\` never hold one.`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:instance && npm run verify` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/instance.mjs README.md verify/instance.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `The parser returns an entity's translations`; `Verified: npm run test:instance and npm run verify pass, after the translation test failed.`; then the trailers.

---

### Task 4: The check holds every page to each translated language

**Files:**

- Modify: `lib/checks.mjs` (the import; a new entry in `instanceChecks` after the schema-id entry)
- Test: `verify/localization-file.test.mjs`

**Interfaces:**

- Consumes: `localizationOf`, `languageSectionsOf`, `primaryElementsOf`, `translationElementsOf`, `withoutFrontmatter` from Task 1; the `localization` type from Task 2.
- Produces: the check `"every page carries each translated language, in the page's own shape"`, rule `R19`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/localization-file.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/localization-file.test.mjs` Expected: FAIL on every new test but the first and the last.

- [ ] **Step 3: Write the implementation**

In `lib/checks.mjs`, beside the import from `./ids.mjs`, add:

```js
import { localizationOf, languageSectionsOf, primaryElementsOf, translationElementsOf, withoutFrontmatter } from "./localization.mjs";
```

At module level, after `fmScalar`, add:

```js
// A translation's element as R19's heading for it, for a failure a translator can act on.
const headingOfPath = (path) =>
  path === "name" ? "`### Name`" : path === "statement" ? "`### Statement`" : `\`### ${path.slice("section/".length)}\``;
```

and in `instanceChecks`, after the entry named `"every schema carries an id, and no two share one"`, add:

```js
  {
    // R19's completeness: a page carries a section for every language the localization file
    // declares translated, after the sections its schema declares and in the declared order, and
    // each repeats the page's elements under their English headings. What stands in a repeated
    // table, and the names a language gives, are the next check's. A core without the schema is
    // older than R19 and asks for none of it.
    name: "every page carries each translated language, in the page's own shape",
    rule: "R19",
    run() {
      if (read(`${core}/localization-schema.md`) === null) return;
      const file = `${EX}/localization.md`;
      const text = read(file);
      if (text === null) return; // a missing singular file is the container check's finding
      const declared = localizationOf(text);
      if (declared.error) return fail(`${file}: ${declared.error} (R19)`);
      const { translated } = declared;
      walkMd(EX, (child, page) => {
        if (!typeOfFile(child)) return;
        const { primary, sections, order, after } = languageSectionsOf(withoutFrontmatter(page));
        for (const heading of after)
          fail(`${child}: \`## ${heading}\` stands below a language section; every language section comes after the sections the page's schema declares (R19)`);
        const seen = new Set();
        for (const tag of order) {
          if (seen.has(tag)) fail(`${child}: \`## ${tag}\` is written twice (R19)`);
          seen.add(tag);
          if (!translated.includes(tag)) fail(`${child}: \`## ${tag}\` is a language ${file} does not declare as translated (R19)`);
        }
        const present = [...seen].filter((t) => translated.includes(t));
        const wanted = translated.filter((t) => seen.has(t));
        if (present.join() !== wanted.join())
          fail(`${child}: its language sections stand as ${present.join(", ")}, and ${file} declares them as ${wanted.join(", ")} (R19)`);
        const expected = [...primaryElementsOf(primary).keys()];
        for (const tag of translated) {
          if (!sections.has(tag)) {
            fail(`${child}: no \`## ${tag}\` section; ${file} declares ${tag}, and every page carries it (R19)`);
            continue;
          }
          const got = translationElementsOf(sections.get(tag));
          const missing = expected.filter((p) => !got.has(p));
          const extra = [...got.keys()].filter((p) => !expected.includes(p));
          for (const p of missing) fail(`${child}: \`## ${tag}\` has no ${headingOfPath(p)}, which the page has (R19)`);
          for (const p of extra) fail(`${child}: \`## ${tag}\` has ${headingOfPath(p)}, which the page does not (R19)`);
          if (!missing.length && !extra.length && [...got.keys()].join() !== expected.join())
            fail(`${child}: \`## ${tag}\` holds the page's elements in another order; it repeats them as the page has them (R19)`);
          for (const [p, t] of got) if (!t) fail(`${child}: \`## ${tag}\` leaves ${headingOfPath(p)} empty (R19)`);
        }
      });
    },
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:instance-checks && npm run test:rules && npm run verify` Expected: PASS. The example declares only `en-US`, so `verify` holds none of its pages to a translation.

- [ ] **Step 5: Commit**

```bash
git add lib/checks.mjs verify/localization-file.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `Every page carries each translated language, in its own shape`; `Verified:` names the Step 4 commands and that the new tests failed first; then the trailers.

---

### Task 5: A language keeps the page's structure, and its names are its own

**Files:**

- Modify: `lib/checks.mjs` (a new entry after Task 4's)
- Test: `verify/localization-file.test.mjs`

**Interfaces:**

- Consumes: Task 1's readers; `asPage`; the `instanceChecks` helpers `walkMd`, `typeOfFile`, `columnTablesOf`, `groupedOf`, `targetOf`, `headingsIn`; `sectionsOf`, `tablesOf`.
- Produces: the check `"a language keeps the page's structure, and names its entities in its own words"`, rule `R19`.

- [ ] **Step 1: Write the failing tests**

Append:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/localization-file.test.mjs` Expected: FAIL on every new test but the first.

- [ ] **Step 3: Write the implementation**

In `lib/checks.mjs`, extend the import from `./localization.mjs` with `asPage`, and add after Task 4's entry:

```js
  {
    // R19's structure and names. A repeated table has the primary's columns and rows, and every
    // cell but free text in a `string` column is the primary's: a reference, a date, an enum
    // value, a number, and a URL wherever it stands. A grouped section's `####` headings are the
    // language's names of the entities the primary's `###` headings name, in the same order, and
    // a language's names are unique as R2 holds the primary's. A page missing its language
    // section is the check above's; here it is skipped.
    name: "a language keeps the page's structure, and names its entities in its own words",
    rule: "R19",
    run() {
      if (read(`${core}/localization-schema.md`) === null) return;
      const file = `${EX}/localization.md`;
      const declared = read(file) === null ? null : localizationOf(read(file));
      if (!declared || declared.error) return;
      const { translated } = declared;
      const columns = columnTablesOf();
      const URL_CELL = /^<?https?:\/\//;

      // Every page's name in each language, by type and by the folder that scopes a name: a
      // plural type's folder, or an owner's, which R2 scopes an owned type's name to.
      const names = new Map(); // `${tag}|${type}` → Map(primary name → language name)
      const scoped = new Map(); // `${tag}|${type}|${folder}` → Map(language name → page)
      walkMd(EX, (child, page) => {
        const type = typeOfFile(child);
        if (!type) return;
        const { primary, sections } = languageSectionsOf(withoutFrontmatter(page));
        const english = primaryElementsOf(primary).get("name");
        for (const tag of translated) {
          if (!sections.has(tag)) continue;
          const local = translationElementsOf(sections.get(tag)).get("name");
          if (!english || !local) continue;
          const byType = `${tag}|${type}`;
          if (!names.has(byType)) names.set(byType, new Map());
          names.get(byType).set(english, local);
          const scope = `${byType}|${child.split("/").slice(0, -1).join("/")}`;
          if (!scoped.has(scope)) scoped.set(scope, new Map());
          const other = scoped.get(scope).get(local);
          if (other) fail(`${child}: its ${tag} name "${local}" is also ${other}'s; a name in a language is unique within its type as the primary's is (R19)`);
          else scoped.get(scope).set(local, child);
        }
      });

      walkMd(EX, (child, page) => {
        const type = typeOfFile(child);
        if (!type) return;
        const { primary, sections } = languageSectionsOf(withoutFrontmatter(page));
        const english = sectionsOf(primary);
        for (const tag of translated) {
          if (!sections.has(tag)) continue;
          const local = sectionsOf(asPage(sections.get(tag)));
          for (const [heading, body] of english) {
            if (!heading || !local.has(heading)) continue;
            const ours = tablesOf(body), theirs = tablesOf(local.get(heading));
            const declaredColumns = columns.get(type)?.find((c) => c.section === heading)?.columns ?? [];
            ours.forEach((table, n) => {
              const other = theirs[n];
              if (!table || !other) {
                if (table && !other) fail(`${child}: \`## ${tag}\` has no table ${n + 1} under \`### ${heading}\`, which the page has (R19)`);
                return;
              }
              if (other.columns.join("|") !== table.columns.join("|"))
                fail(`${child}: \`## ${tag}\` heads its table under \`### ${heading}\` ${other.columns.join(" | ")}; it keeps the page's columns, ${table.columns.join(" | ")} (R19)`);
              if (other.rows.length !== table.rows.length)
                return fail(`${child}: \`## ${tag}\` \`### ${heading}\` holds ${other.rows.length} rows, and the page's table ${table.rows.length}; a table is repeated whole (R19)`);
              table.rows.forEach((row, r) => {
                row.forEach((cell, c) => {
                  const column = table.columns[c];
                  const kind = declaredColumns.find((d) => d.name === column)?.declared ?? "string";
                  const free = kind === "string" && !URL_CELL.test(cell);
                  if (!free && other.rows[r][c] !== cell)
                    fail(`${child}: \`## ${tag}\` row ${r + 1} of \`### ${heading}\` column ${column} is "${other.rows[r][c]}"; the ${kind === "string" ? "URL" : kind} is the page's, "${cell}" (R19)`);
                });
              });
            });
          }
          for (const { section, declared: ref } of groupedOf(type)) {
            const target = targetOf(ref);
            if (!target || !english.has(section) || !local.has(section)) continue;
            const want = headingsIn(english.get(section));
            const got = headingsIn(local.get(section));
            want.forEach((name, n) => {
              const expected = names.get(`${tag}|${target}`)?.get(name);
              if (expected && got[n] !== expected)
                fail(`${child}: \`#### ${got[n] ?? "(none)"}\` under \`### ${section}\` is not "${expected}", the ${tag} name of ${name}, in \`## ${tag}\` (R19)`);
            });
          }
        }
      });
    },
  },
```

The failure text for a changed cell reads `row 1 of \`### References\` column URL is "…"`; the test matches on that fragment, so keep the words `row`, `of`, `column` and `is` in that order.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:instance-checks && npm run test:rules && npm run verify` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/checks.mjs verify/localization-file.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `A language keeps the page's structure, and its names are its own`; `Verified:` names the Step 4 commands and that the new tests failed first; then the trailers.

---

### Task 6: A pull request that changes the primary changes its translations

**Files:**

- Modify: `lib/localization.mjs` (append `staleTranslationsOf`)
- Modify: `lib/history.mjs` (append `trailerValuesOf`)
- Modify: `bin/companygraph.mjs` (the `translations` command, its usage lines, its dispatch)
- Modify: `.github/workflows/instance-check.yml` (a step)
- Test: `verify/localization.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `changedPagesOf` from `lib/history.mjs`; Task 1's readers.
- Produces: `staleTranslationsOf(changes, translated: string[], released: Set<string>) → string[]`; `trailerValuesOf(cwd, range, key) → string[]`; `companygraph translations [<folder>] --range <a>..<b>`.

- [ ] **Step 1: Write the failing tests**

Add `staleTranslationsOf` to the import in `verify/localization.test.mjs` and append:

```js
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
```

Append to `verify/cli.test.mjs`:

```js
test("translations --range refuses a change to the primary its translation did not follow, and a trailer releases it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(vision, `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(vision, fs.readFileSync(vision, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /model\/vision\.md#section\/What it means changed, and its de-CH translation did not/);
  g("commit", "-q", "--allow-empty", "-m", "third", "-m", "Translation-unchanged: model/vision.md#section/What it means", "--no-verify");
  const released = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(released.status, 0, released.stderr);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:localization && npm run test:cli` Expected: FAIL: `staleTranslationsOf` is not exported, and `translations` is an unknown command.

- [ ] **Step 3: Write the implementation**

Append to `lib/localization.mjs`:

```js
// R19's other half, which a tree cannot see: a pull request that changes an element of the
// primary changes its translation in every declared language. Handed the pages a range modified
// or renamed, it names every element whose primary text changed while a language's stayed as it
// was, unless `released` holds `<file>#<path>`, the value of a `Translation-unchanged` trailer.
// A language section missing at the head is the tree check's to report, and frontmatter is never
// translated, so neither is read here.
export function staleTranslationsOf(changes, translated, released) {
  const out = [];
  for (const { after, beforeText, afterText } of changes) {
    const was = languageSectionsOf(withoutFrontmatter(beforeText));
    const is = languageSectionsOf(withoutFrontmatter(afterText));
    const then = primaryElementsOf(was.primary), now = primaryElementsOf(is.primary);
    for (const [path, text] of now) {
      if (then.get(path) === text) continue;
      for (const tag of translated) {
        if (!is.sections.has(tag)) continue;
        const before = was.sections.has(tag) ? translationElementsOf(was.sections.get(tag)).get(path) : undefined;
        const current = translationElementsOf(is.sections.get(tag)).get(path);
        if (current === undefined || before !== current || released.has(`${after}#${path}`)) continue;
        out.push(`${after}#${path} changed, and its ${tag} translation did not; change it in the same pull request, or add the trailer \`Translation-unchanged: ${after}#${path}\` where the change does not touch what the translation says (R19)`);
      }
    }
  }
  return out;
}
```

Append to `lib/history.mjs`:

```js
// Every value a trailer takes across a range's commits, as git parses trailers.
export function trailerValuesOf(cwd, range, key) {
  return git(cwd, ["log", `--format=${TRAILER(key)}%x1e`, range])
    .split(/[\x1e\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}
```

In `bin/companygraph.mjs`:

- add `trailerValuesOf` to the import from `../lib/history.mjs`, and `import { localizationOf, staleTranslationsOf } from "../lib/localization.mjs";`;
- add the usage line `//   companygraph translations [<folder>] --range <a>..<b>` after the `ids` one, the help line `  translations [<folder>]  refuse a change to the primary its translations did not follow` after the `ids` help line, and `translations: --range <a>..<b>` after `ids: --backfill  --range <a>..<b>`;
- add the function after `ids`:

```js
// R19's history half: a pull request that changes an element of the primary changes it in every
// translated language, or names it in a `Translation-unchanged` trailer. The languages are the
// head's, read from the checkout the range ends at.
function translations(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  if (!isInstance(root)) {
    console.error(`✗ ${root} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
    return 1;
  }
  const ends = (given.range ?? "").split("..");
  if (!given.range || given.range.includes("...") || ends.length !== 2 || !ends[0] || !ends[1]) {
    console.error(`✗ translations takes --range <a>..<b>, two dots between two commits`);
    return 1;
  }
  const file = join(root, "model", "localization.md");
  const declared = existsSync(file) ? localizationOf(unixLines(readFileSync(file, "utf8"))) : { translated: [] };
  if (declared.error) {
    console.error(`✗ model/localization.md: ${declared.error} (R19)`);
    return 1;
  }
  if (!declared.translated.length) {
    console.log("✓ no translated language is declared");
    return 0;
  }
  const released = new Set(trailerValuesOf(root, given.range, "Translation-unchanged"));
  const failures = staleTranslationsOf(changedPagesOf(root, given.range), declared.translated, released);
  if (failures.length) {
    for (const f of failures) console.error(`✗ ${f}`);
    return 1;
  }
  console.log("✓ every change to the primary reached its translations");
  return 0;
}
```

- and in the dispatch, after the `ids` line: `  else if (command === "translations") process.exitCode = translations(rest);`

In `.github/workflows/instance-check.yml`, after the step `no id on the default branch changed`, add:

```yaml
      # R19: a change to the primary reaches every translation, or a trailer says it need not.
      # Only on a pull request, over the same range as the steps above.
      - name: every change to the primary reached its translations
        if: github.event_name == 'pull_request'
        run: node .companygraph-checker/bin/companygraph.mjs translations . --range "${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}"
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:localization && npm run test:cli` Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/localization.mjs lib/history.mjs bin/companygraph.mjs .github/workflows/instance-check.yml verify/localization.test.mjs verify/cli.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `A pull request that changes the primary changes its translations`; `Verified:` names the Step 4 commands and that the new tests failed first; then the trailers.

---

### Task 7: The skills write a page in every declared language

**Files:**

- Modify: `agents/claude/skills/companygraph-company/SKILL.md`, `agents/claude/skills/companygraph-profile/SKILL.md`, `agents/claude/skills/companygraph-validate/SKILL.md`

**Interfaces:**

- Consumes: R19 from Task 2.

- [ ] **Step 1: Find where each skill says a page gets its id**

Run: `grep -n "id" agents/claude/skills/companygraph-{company,profile,validate}/SKILL.md | grep -i "fresh\|companygraph id\|R18"` Expected: one line per skill, the sentence the entity-id build added.

- [ ] **Step 2: Add one sentence after it in each skill**

For `companygraph-company` and `companygraph-profile`, after the id sentence:

```markdown
Where `model/localization.md` declares a translated language, every page this makes carries a `## <tag>` section for each one, after the page's own sections, repeating its elements under their English headings as R19 describes; the page is written in the primary first, and each translation is written from it, since the check fails a page without one.
```

For `companygraph-validate`, after its id sentence:

```markdown
Where `model/localization.md` declares a translated language, the agent pass also reads each page's language sections: that a name in a language's prose is that language's name of the entity, and that the translation says what the primary says, which no script reads (R19).
```

- [ ] **Step 3: Run the checks the skills are held to**

Run: `npm run test:cli && sh conventions/conventions-format && sh conventions/conventions-check` Expected: PASS. `test:cli` runs the export skill's scripts over an instance whose skills are these files.

- [ ] **Step 4: Commit**

```bash
git add agents/claude/skills
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `The skills write a page in every declared language`; `Verified:` names the Step 3 commands; then the trailers.

---

### Task 8: Everything runs together

**Files:** none new.

- [ ] **Step 1: Run every suite**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:cli && npm run test:ids && npm run test:localization && npm run test:seats && npm run test:untar && npm run test:fetch-core && npm run test:obsidian && sh conventions/conventions-format && sh conventions/conventions-check` Expected: PASS everywhere.

- [ ] **Step 2: The positive control**

Declare `de-CH` translated in `example/model/localization.md` by adding the row `| de-CH | translated |`, run `npm run verify`, and expect a failure per example page naming `no \`## de-CH\` section`. Restore the file with `git checkout -- example/model/localization.md` — the file is committed in Task 2, so this restores the committed version — and run `npm run verify` again to see it pass.

- [ ] **Step 3: Record it**

No commit if nothing changed. The ledger line names both runs.
