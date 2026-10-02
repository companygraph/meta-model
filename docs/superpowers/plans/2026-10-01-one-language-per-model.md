# One language per model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A model is written in one language: `model/localization.md` names it in a `locale` frontmatter field, R19 and everything that reads a page's language sections are gone, and `upgrade` rewrites an instance's localization page from the `## Locales` table into the field.

**Architecture:** Removal first, then the new form. Task 1 takes R19 out of the code — the three checks, the parser's `translations`, the `translations` command and its workflow step, the git helpers only it used — leaving `lib/localization.mjs` with the old reader alone. Task 2 gives the singleton its `locale` field: the schema, the reader, the page `init` writes, the example, a migration function and one R14 check that the field is a language tag. Task 3 has `upgrade` apply the migration. Task 4 takes R19 out of the rules and the prose.

**Tech Stack:** Node 22 ES modules with no runtime dependencies, `node --test`, git. Types are JSDoc in `lib/` and `bin/`; `tsc`, a dev dependency, checks them and writes the declarations a consumer reads into `types/`, which is committed.

**Spec:** `docs/superpowers/specs/2026-10-01-one-language-per-model-design.md`

This plan covers meta-model only. The conventions release that takes the model-German sentences out of `TRANSLATOR.md`, `WRITING.md`, `EDITOR.md` and `BACKREADER.md`, the Obsidian plugin's scaffold test, the re-pins of the MCP servers, the chat and the sites, the three family instances' re-pins and the answer on #195 each follow the release, in work of their own.

## Global Constraints

- R14's heading becomes `### R14 — Names are American English, and prose is in the model's language`, and its first paragraph, verbatim: ``Every name this vocabulary chooses is spelled in American English — a field, a type, a folder, a section heading a schema declares — and so is the prose of `core/`. An instance's content is written in the one language its `model/localization.md` names.`` Its later paragraphs stay.
- R19 is removed whole, and its number is not given to another rule. No file under `lib/`, `bin/`, `core/`, `agents/`, `verify/`, `types/` or `.github/` cites R19 when the plan is done; `npm run test:rules` fails a citation of a rule `core/CONVENTIONS.md` does not define, and is the guard.
- The singleton keeps type `localization`, schema `core/localization-schema.md`, file `model/localization.md`. Its frontmatter is `id`, `source` and `locale` (all required); its sections are the H1, the `>` statement and an optional `## References`. `## Locales` is gone.
- `locale` is a language tag matching `/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/` — `en`, `en-US`, `gsw-CH`, `sr-Latn-RS`. No list of known languages is held.
- The page `init` writes, verbatim for `en-US`: `---\nid: <id>\nsource: <source>\nlocale: en-US\n---\n\n# Language\n\n> Everyone who reads this model, people and agents alike, reads it in American English.\n`
- A core whose `localization-schema.md` declares no `locale` field is older than this release: the R14 check reads nothing, and `upgrade` does not rewrite toward it.
- `upgrade` refuses, writing nothing, a localization page that declares a `translated` row.
- The package export `./localization` stays, now serving `LANGUAGE_TAG`, `localizationOf` and `migratedLocalization`.
- Every function or value added or changed under `lib/` or `bin/` carries JSDoc types, as the code around it does; `tsconfig.json` is strict, and `npm run typecheck` is the guard. After every change under `lib/` or `bin/`, `npm run build` rewrites `types/`, and its diff is committed with the change: CI's `npm run build:check` fails a commit whose `types/` is not what the JSDoc builds.
- **The full run**, which every task ends with: `npm run typecheck && npm run build:check && npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:instance-files && npm run test:ids && npm run test:localization && npm run test:plan && npm run test:rules && npm run test:cli && npm run test:seats && npm run test:untar && npm run test:fetch-core && npm run test:obsidian`, expecting: `typecheck` prints nothing, `build:check` prints `✓ types/ is what the JSDoc in lib/ and bin/ declares`, `verify` prints `✓ … checks passed`, and every suite reports `fail 0`. It is CI's list, in CI's order.
- Code is found by the text quoted in each step, not by line number; the line numbers an earlier draft gave moved when the types written as JSDoc (#197) landed.
- No version bump in this plan. The release is breaking in `WORKING.md`'s terms, and its number and notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in a fresh worktree, so `tsc` is there.

## Review Focus

- An instance still on core 0.50.0 — its vendored `localization-schema.md` declares `## Locales`, not `locale` — checked by this release's checker must pass as it did. Pinned in Task 2.
- `upgrade` run a second time writes nothing to `model/localization.md`. Pinned in Task 3.
- A localization page with `## References` below `## Locales` keeps its references through the migration. Pinned in Task 2.
- `locale: "de-CH"`, quoted, is read as `de-CH`. Pinned in Task 2.
- A lowercase heading on a page, `## api`, stays an ordinary section once nothing cuts language sections. Pinned in Task 1 by the existing parser test, kept.

---

### Task 1: R19 leaves the code

**Files:**

- Modify: `lib/checks.mjs` (the `./localization.mjs` import and its comment, `headingOfPath`, the three checks whose `rule` is `"R19"`, the comment on the `localization` singular entry)
- Modify: `lib/instance.mjs` (the `./localization.mjs` import, the `Entity` typedef's `translations`, the `Translation` typedef, the parser's language-section block)
- Modify: `lib/localization.mjs` (everything below `localizationOf`, the `@import`, the `LanguageSections` typedef)
- Modify: `lib/history.mjs` (`isCommit`, `fileAt`, `mergeBaseOf`, `trailerValuesOf`)
- Modify: `lib/plan.mjs` (one comment)
- Modify: `bin/companygraph.mjs` (usage, help, imports, `translations`, its dispatch)
- Modify: `.github/workflows/instance-check.yml` (the `translations` step)
- Modify: `types/lib/history.d.mts`, `types/lib/instance.d.mts`, `types/lib/localization.d.mts` (written by `npm run build`)
- Test: `verify/localization.test.mjs`, `verify/localization-file.test.mjs`, `verify/instance.test.mjs`, `verify/history.test.mjs`, `verify/cli.test.mjs`, `verify/plan.test.mjs`

**Interfaces:**

- Produces: `lib/localization.mjs` exporting `LANGUAGE_TAG` and `localizationOf(text) → Localization`, the `{ primary, translated } | { error }` reader, unchanged, and nothing else. Task 2 replaces `localizationOf`.

- [ ] **Step 1: Delete the tests of what goes**

In `verify/cli.test.mjs`, delete from the blank line after the closing `});` of the test `ids --range on a folder that holds core refuses a commit that changed a schema's id` to the end of the file: every test named `translations --range …`.

In `verify/history.test.mjs`, delete the two tests from the comment ``// Review fix 5: `translations` needs a revision's file`` to the end of the file, and take `fileAt, isCommit` out of the import from `../lib/history.mjs`.

In `verify/instance.test.mjs`, delete from `// The localization schema joins the fixture's` through the end of the test `a page's language section leaves its sections and arrives as its translation`, and delete the test `the same tag-shaped heading stays a section where localization.md declares only the primary`. Keep `an instance that declares no translated language parses exactly as before`, renamed `no entity carries translations`, and keep `a tag-shaped heading the instance never declares as translated stays a section, with no localization.md at all`.

In `verify/localization-file.test.mjs`, delete from `const LOC = (rows, extra = "") =>` to the end of the file; the three tests above it stay.

In `verify/localization.test.mjs`, change the import to `import { LANGUAGE_TAG, localizationOf } from "../lib/localization.mjs";`, keep the `LOCALIZATION` helper, the four tests from `a language tag is lowercase first` through ``a `## Locales` table without a separator row is refused``, and the test `companygraph-meta-model/localization resolves by the package's own name` with its `// Review fix 9` comment, and delete every other test and helper.

Three comments outside the code that goes still name R19, and Task 1's own grep below finds them: in `verify/cli.test.mjs` change `an instance made before R19's schema landed` to `an instance made before the localization schema landed`, and `stands in for a release from before R19, which is` to `stands in for a release from before the localization schema, which is`; in `verify/plan.test.mjs` change `a core that grows R19's localization` to `a core that grows the localization`.

- [ ] **Step 2: Run the trimmed suites**

Run `npm run test:localization && npm run test:seats`, expecting: PASS. This is a removal, so no test fails first; the trimmed suites are the baseline the removal below must keep green.

- [ ] **Step 3: Remove the R19 checks**

In `lib/checks.mjs`, delete the three check objects from the `{` before `// R19's completeness: a page carries a section for every language` through the `},` that closes the check named `a language keeps the page's structure, and names its entities in its own words` — every object with `rule: "R19"`; the next object kept opens with ``// R9: `## Frontmatter` says whether a field may be absent``. Delete `headingOfPath` with its comment line and its `/** @param {string} path */` line. Delete the comment `// And the readers of a model's languages (R14, R19), which this file holds every page to.` and the `./localization.mjs` import below it. Change the comment on the `localization` singular entry to:

```js
  // An instance is written in one language (R14), so its declaration is one file in the
  // container, as the identifier's is, named for the type.
```

Run `grep -n "R19\|localization.mjs\|languageSectionsOf\|asPage" lib/checks.mjs`, expecting: no output.

- [ ] **Step 4: The parser reads a page's body whole**

In `lib/instance.mjs`, delete the `./localization.mjs` import; in the `Entity` typedef delete the line ` * @property {Record<string, Translation>} [translations]`; delete the whole `Translation` typedef block, from `/**` before ` * A page in one translated language (R19)` through its ` */`; delete the five lines from `// R19: the languages every page is translated into` through `const translatedTags = …`; and replace the block from `// A page's language sections are not sections its schema declares` through `if (Object.keys(translations).length) entity.translations = translations;` with:

```js
    const { name, tagline, sections } = parseBody(body);
    const entity = /** @type {Entity} */ ({ id: self.id, address: self.id, type, name, tagline, fields, sections,
                     owner: self.ownerId, path: sub + path });
```

Run `grep -n "R19\|translat\|localization" lib/instance.mjs`, expecting: two lines only, the comments on a period's kind that say a renderer `translates it` — nothing about a language.

- [ ] **Step 5: The `translations` command and its step go**

In `bin/companygraph.mjs`: delete the usage line `//   companygraph translations [<folder>] --range <a>..<b>`, the help lines `translations [<folder>]  refuse (exit 3) …` and `translations: --range <a>..<b>`, the whole `translations` function with its leading comment and JSDoc (`// R19's history half:` through its closing `}` and the blank line after it), and the dispatch `else if (command === "translations") process.exitCode = translations(rest);`. Delete the import `import { localizationOf, staleTranslationsOf } from "../lib/localization.mjs";`, and change the import from `../lib/history.mjs` to:

```js
import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, firstCommitMsOf, changedPagesOf } from "../lib/history.mjs";
```

In `lib/history.mjs`, delete `isCommit`, `fileAt`, `mergeBaseOf` and `trailerValuesOf` with their comments and JSDoc, from `// Whether a revision resolves to a commit, without throwing` to the JSDoc of `familyOf`. Keep `TRAILER`, which `logOf` uses, and the `unixLines` import, which `readInstance` uses.

In `lib/plan.mjs`, in the comment above the localization block, change ``// R19's own page, `model/localization.md`, is not vendored`` to ``// The localization page, `model/localization.md`, is not vendored``.

In `.github/workflows/instance-check.yml`, delete the five lines from `# R19: a change to the primary reaches every translation` through the `run:` of `every change to the primary reached its translations`.

Run `grep -rn "translations\|Translation-unchanged\|mergeBaseOf\|fileAt\|isCommit\|trailerValuesOf" bin lib .github`, expecting: no output.

- [ ] **Step 6: `lib/localization.mjs` keeps only its reader**

Replace the file's header comment with:

```js
// lib/localization.mjs
// The language a model is written in (R14), read in one place. Pure and with no import, so the
// checks and the upgrade share it, and it bundles for the Obsidian plugin.
```

Delete the line `/** @import { PageChange } from "./history.mjs" */`, the `LanguageSections` typedef block, and everything after the closing `}` of `localizationOf`: `languageSectionsOf`, `normalizeRow`, `withoutGroupedHeadings`, `normalized`, `staleTranslationsOf`, `asPage`, `splitSections`, `primaryElementsOf`, `translationElementsOf` and their comments and JSDoc. Delete `FENCE` too. Keep `LANGUAGE_TAG`, `FRONTMATTER`, `withoutFrontmatter` (no longer exported: drop its `export`, since only `localizationOf` uses it), the `Localization` typedef and `localizationOf`.

- [ ] **Step 7: Build the declarations, and run everything**

Run `npm run build`, expecting: `git status --short types` lists `types/lib/history.d.mts`, `types/lib/instance.d.mts` and `types/lib/localization.d.mts`, and nothing else.

Run the full run (Global Constraints), expecting: it passes.

Run `grep -rln "R19" lib bin agents .github types verify/*.mjs`, expecting: no output from `lib`, `bin`, `.github`, `types` or `verify`; `agents/` is Task 4's.

- [ ] **Step 8: Commit**

```bash
git add -A lib bin types verify .github
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
R19 leaves the checks, the parser and the CLI

A model is written in one language, so nothing reads a page's language sections any more: the three R19 checks, the parser's translations with their Translation type, the translations command with the workflow step that ran it, and the git helpers only that command used are removed with their tests, and the declarations in types/ are rebuilt to match. lib/localization.mjs keeps the reader of model/localization.md alone, in its current form, until the next commit gives the file its locale field.

Verified: npm run typecheck, build:check, verify and every test suite pass; grep finds no R19 under lib, bin, .github, types or verify.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

Run `git log -1 --format='[%s]'`, expecting the subject alone between the brackets.

---

### Task 2: The localization page names one locale

**Files:**

- Modify: `core/localization-schema.md`
- Modify: `lib/localization.mjs`
- Modify: `lib/instance-files.mjs` (`LOCALIZATION_PAGE`)
- Modify: `lib/checks.mjs` (a new R14 check where the R19 checks stood; an import)
- Modify: `example/model/localization.md`
- Modify: `types/lib/localization.d.mts`, `types/lib/instance-files.d.mts` (written by `npm run build`)
- Test: `verify/localization.test.mjs` (rewritten), `verify/localization-file.test.mjs`, `verify/instance-files.test.mjs`, `verify/cli.test.mjs`, `verify/plan.test.mjs`

**Interfaces:**

- Consumes: Task 1's `lib/localization.mjs`.
- Produces:
  - `LANGUAGE_TAG: RegExp` (unchanged)
  - `localizationOf(text: string) → { locale: string } | { error: string }` (the `Localization` typedef)
  - `migratedLocalization(text: string) → { text: string } | { error: string } | null` (the `Migrated` typedef, or null) — null where the page already names its `locale`
  - `LOCALIZATION_PAGE({ id, source, locale = "en-US" }) → string`

- [ ] **Step 1: Write the failing reader tests**

Replace `verify/localization.test.mjs` with:

```js
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

test("a page with neither a locale nor a table it can read is refused", () => {
  assert.match(migratedLocalization("---\nid: x\n---\n\n# Languages\n").error, /no `## Locales` table/);
  assert.match(migratedLocalization(OLD("| en-US | translated-ish |")).error, /no one `primary` language tag/);
  assert.match(migratedLocalization("# Languages\n").error, /no frontmatter/);
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
```

- [ ] **Step 2: Run them to see them fail**

Run `npm run test:localization`, expecting: FAIL — `migratedLocalization` is not exported, and `localizationOf` returns ``{ error: "no `## Locales` table" }``.

- [ ] **Step 3: Write the reader and the migration**

Replace `lib/localization.mjs` with:

```js
// lib/localization.mjs
// The language a model is written in (R14), read in one place. Pure and with no import, so the
// checks and the upgrade share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag: a two- or three-letter language, then optional subtags — `en`,
// `en-US`, `gsw-CH`, `sr-Latn-RS`. Which tags exist is the registry's; this holds the shape.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;

/**
 * The language model/localization.md names, or why it cannot be read.
 * @typedef {{ error: string; locale?: undefined } | { error?: undefined; locale: string }} Localization
 */
/**
 * A localization page in the earlier form, rewritten, or why it cannot be.
 * @typedef {{ error: string; text?: undefined } | { error?: undefined; text: string }} Migrated
 */

// The language model/localization.md names in its `locale` field, quotes taken off, or an error
// naming why it cannot be read. A missing field is said plainly so a caller that already reports
// a missing required field can leave it to that report.
/**
 * @param {string} text
 * @returns {Localization}
 */
export function localizationOf(text) {
  const fm = text.match(FRONTMATTER)?.[1] ?? "";
  const locale = fm.match(/^locale:[ \t]*(\S.*?)[ \t]*$/m)?.[1].replace(/^(["'])(.*)\1$/, "$2");
  if (!locale) return { error: "no `locale` field" };
  if (!LANGUAGE_TAG.test(locale)) return { error: `\`locale\` is "${locale}", which is no language tag, as \`en-US\` or \`de-CH\` is` };
  return { locale };
}

// A localization page as a core before one language per model wrote it — a `## Locales` table
// with one `primary` row — in the form that replaced it: the primary's tag as `locale`, written
// last in the frontmatter, and the table gone, every other section kept. Null where the page
// already names its `locale`, so a second upgrade writes nothing. An error where there is no
// table to read one from, or the table declares a `translated` language: dropping that row would
// drop the translations the pages carry without a word, so the owner takes them out first.
/**
 * @param {string} text
 * @returns {Migrated | null}
 */
export function migratedLocalization(text) {
  const fm = text.match(FRONTMATTER);
  if (!fm) return { error: "has no frontmatter to write `locale` into" };
  if (/^locale:/m.test(fm[1])) return null;
  const lines = text.slice(fm[0].length).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return { error: "names no `locale` and has no `## Locales` table to read one from" };
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  const rows = lines
    .slice(start + 1, end)
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")))
    .slice(2);
  const translated = rows.filter(([, role]) => role === "translated").map(([tag]) => tag);
  if (translated.length)
    return { error: `declares ${translated.join(", ")} translated; a model is written in one language, so take those rows and every page's \`## ${translated[0]}\` section out first` };
  const primary = rows.filter(([, role]) => role === "primary").map(([tag]) => tag);
  if (primary.length !== 1 || !LANGUAGE_TAG.test(primary[0]))
    return { error: "has no one `primary` language tag in its `## Locales` table to name as `locale`" };
  const body = [...lines.slice(0, start), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  return { text: `---\n${fm[1]}\nlocale: ${primary[0]}\n---\n${body}` };
}
```

- [ ] **Step 4: Run them to see them pass**

Run `npm run test:localization`, expecting: PASS, 9 tests. Run `npm run typecheck`, expecting: no output.

- [ ] **Step 5: Write the failing schema, stub and check tests**

In `verify/instance-files.test.mjs`, replace the test `the localization stub is a sentence naming the primary language`, with the two-line `// Fix 3:` comment above it, with:

```js
// One language per model: the stub names the model's language in `locale` and says who reads it.
test("the localization stub names its locale and says who reads the model in it", () => {
  assert.equal(
    LOCALIZATION_PAGE({ id: "x", source: "Local" }),
    "---\nid: x\nsource: Local\nlocale: en-US\n---\n\n# Language\n\n> Everyone who reads this model, people and agents alike, reads it in American English.\n",
  );
  assert.equal(
    LOCALIZATION_PAGE({ id: "x", source: "Local", locale: "de-CH" }),
    "---\nid: x\nsource: Local\nlocale: de-CH\n---\n\n# Language\n\n> Everyone who reads this model, people and agents alike, reads it in de-CH.\n",
  );
});
```

In `verify/localization-file.test.mjs`, replace the tests `init writes a localization file whose one language is en-US, primary` and `the localization page names its primary and nothing else` with the tests below, and append the R14 tests after them:

```js
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
```

The `older` schema is the real one with its `locale` row taken out, which is what a 0.50.0 core's schema amounts to for this check: no `locale` field declared. The page's `## Locales` section passes because sections a schema does not declare are open.

In `verify/cli.test.mjs`, in the test `upgrade writes model/localization.md the instance lacks, with source read from identity, and the instance still checks clean`, replace `assert.match(page, /\| en-US \| primary \|/);` with `assert.match(page, /\nlocale: en-US\n/);`.

In `verify/plan.test.mjs`, the test `an upgrade writes model/localization.md when the new core carries the schema and the instance has none, with source read from identity` reads the fresh page's id with a regex that runs up to the closing `---`, and the stub now writes `locale` before it: change `/^---\nid: (\S+)\nsource: Acquired\n---\n/` to `/^---\nid: (\S+)\nsource: Acquired\nlocale: en-US\n---\n/`.

- [ ] **Step 6: Run them to see them fail**

Run `npm run test:instance-files && npm run test:instance-checks && npm run test:plan`, expecting: FAIL — the stub still writes `## Locales`, the schema declares no `locale`, and no R14 check exists.

- [ ] **Step 7: The schema, the stub, the example and the check**

Replace `core/localization-schema.md` with (the `id` stays the file's own):

```markdown
---
id: 01a0f254-34f0-709f-b36c-1c67dcc7ae30
---

# Localization Schema

> Required structure for the localization file: the one language an instance is written in.

## File Location

`model/localization.md`

An instance is written in one language, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `locale` | Yes | string | The language the model is written in, as a BCP 47 language tag: `en-US`, `de-CH` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its language |
| `> [Statement]` | Yes | One paragraph on who reads the model in that language |
| `## References` | No | Table. The standard the tag follows; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The localization file says which language the model is written in, so that a reader, an agent or a check knows the language every page's names and prose are in, and which language an answer grounded in the model is grounded in. A model is written in one language and is never translated inside itself; a reader in another language reads a rendering of it.

## Writing rules

- `locale` is one language tag. Which tags exist is the registry's, and the check holds only the shape.
- The statement names who reads the model in that language: the owner, a customer, an agent answering in it.
- Names and prose are in the language `locale` names (R14).
```

In `lib/instance-files.mjs`, replace `LOCALIZATION_PAGE` with its comment and its `@type` line with:

```js
// The localization file init writes: the one language the model is written in. An instance
// written in another language edits `locale` and the statement before its first page.
/** @type {(page: { id: string; source: string; locale?: string }) => string} */
export const LOCALIZATION_PAGE = ({ id, source, locale = "en-US" }) =>
  `---\nid: ${id}\nsource: ${source}\nlocale: ${locale}\n---\n\n# Language\n\n` +
  `> Everyone who reads this model, people and agents alike, reads it in ${locale === "en-US" ? "American English" : locale}.\n`;
```

Replace `example/model/localization.md` with:

```markdown
---
id: 01a0f254-3527-78bd-9d78-ee022ef66188
source: Local
locale: en-US
---

# Language

> Beacon Systems writes its model in American English for everyone who reads it, people and agents alike.
```

In `lib/checks.mjs`, directly after the `./ids.mjs` import, add:

```js
// And the reader of the language a model is written in (R14), pure as the others are.
import { localizationOf } from "./localization.mjs";
```

and add this check where the three R19 checks stood (directly before the object opening with ``// R9: `## Frontmatter` says whether a field may be absent``):

```js
  {
    // R14: an instance's content is in the one language model/localization.md names, and the
    // name is a language tag. A missing field is the required-field check's, so it is said
    // once. A core whose localization schema declares no `locale` is older than one language per
    // model, and its file is held to that schema alone.
    name: "the model names its language as a language tag",
    rule: "R14",
    run() {
      const schema = read(`${core}/localization-schema.md`);
      if (schema === null || !/^\| `locale` \|/m.test(schema)) return;
      const file = `${EX}/localization.md`;
      const text = read(file);
      if (text === null) return;
      const got = localizationOf(text);
      if (got.error && got.error !== "no `locale` field") fail(`${file}: ${got.error} (R14)`);
    },
  },
```

- [ ] **Step 8: Build the declarations, and run everything**

Run `npm run build`, expecting: `git status --short types` lists `types/lib/localization.d.mts` and `types/lib/instance-files.d.mts`, and nothing else.

Run the full run (Global Constraints), expecting: it passes.

- [ ] **Step 9: Commit**

```bash
git add -A core lib types example verify
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The localization page names the model's one language in locale

A model is written in one language, so model/localization.md holds a value, not a table: the schema declares a required locale field and drops ## Locales, init writes locale: en-US under the H1 Language, and the example follows. localizationOf returns { locale }, and migratedLocalization rewrites a page in the earlier form, its primary row becoming the field, refusing a page that declares a translated language. One R14 check holds the field to the shape of a language tag where the vendored schema declares it, so an instance on an older core checks as it did.

Verified: npm run typecheck, build:check, verify and every test suite pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

Run `git log -1 --format='[%s]'`, expecting the subject alone between the brackets.

---

### Task 3: `upgrade` rewrites the earlier form

**Files:**

- Modify: `lib/plan.mjs` (an import; the `UpgradeWrites` typedef; a comment, a block and the return of `upgradePlan`)
- Modify: `bin/companygraph.mjs` (the `UpgradeRead` typedef; report the rewrite)
- Modify: `types/lib/plan.d.mts`, `types/bin/companygraph.d.mts` (written by `npm run build`)
- Test: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `migratedLocalization` and `LOCALIZATION_PAGE` from Task 2.
- Produces: `upgradePlan(...)` returns `rewritten: string[]` beside `given`, holding `"model/localization.md"` when it was rewritten, and returns `{ refused }` naming the file when the migration refuses.

- [ ] **Step 1: Write the failing tests**

In `verify/plan.test.mjs`, change `withLocalizationSchema` to carry the field the migration looks for, and add the helper and four tests below directly after the test `an upgrade defaults localization.md's source to Local …`:

```js
const withLocalizationSchema = new Map([...older, ["localization-schema.md", "# Localization Schema\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `locale` | Yes | string | The language |\n"]]);
const OLD_LOCALIZATION = (rows) =>
  `---\nid: existing\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n${rows}\n`;

test("an upgrade rewrites a localization page in the earlier form into its locale field", () => {
  const { manifest, held, workflow } = instance();
  const withOld = new Map(held).set("model/localization.md", OLD_LOCALIZATION("| de-CH | primary |"));
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withOld, workflow });
  assert.equal(plan.writes.get("model/localization.md"), "---\nid: existing\nsource: Local\nlocale: de-CH\n---\n\n# Languages\n\n> Who reads it.\n");
  assert.deepEqual(plan.rewritten, ["model/localization.md"]);
});

test("an upgrade leaves a localization page that already names its locale alone", () => {
  const { manifest, held, workflow } = instance();
  const current = "---\nid: existing\nsource: Local\nlocale: en-US\n---\n\n# Language\n\n> Who reads it.\n";
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(held).set("model/localization.md", current), workflow });
  assert.ok(!plan.writes.has("model/localization.md"));
  assert.deepEqual(plan.rewritten, []);
});

test("an upgrade refuses a localization page that declares a translated language, writing nothing", () => {
  const { manifest, held, workflow } = instance();
  const withTranslated = new Map(held).set("model/localization.md", OLD_LOCALIZATION("| en-US | primary |\n| de-CH | translated |"));
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withTranslated, workflow });
  assert.match(plan.refused, /^model\/localization\.md declares de-CH translated; a model is written in one language/);
  assert.equal(plan.writes, undefined);
});

test("an upgrade toward a core whose schema declares no locale leaves the earlier form alone", () => {
  const { manifest, held, workflow } = instance();
  const olderSchema = new Map([...older, ["localization-schema.md", "# Locales schema\n"]]);
  const plan = upgradePlan({ core: olderSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(held).set("model/localization.md", OLD_LOCALIZATION("| en-US | primary |")), workflow });
  assert.ok(!plan.writes.has("model/localization.md"));
});
```

The first line replaces the existing `const withLocalizationSchema = …` where it stands; the rest goes after the test named above. In that test, `an upgrade defaults localization.md's source to Local …`, the page the instance already holds is in the earlier form, which the migration would now rewrite; give it its locale so the test still holds what it says, that a page the instance has is never overwritten — replace its `const already = …` with:

```js
  const already = "---\nid: existing\nsource: Local\nlocale: de-CH\n---\n\n# Language\n";
```

In `verify/cli.test.mjs`, add after the test `upgrade writes model/localization.md the instance lacks, …`:

```js
test("upgrade rewrites a localization page in the earlier form, says so, and a second upgrade leaves it be", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  const id = fs.readFileSync(loc, "utf8").match(/^id: (\S+)$/m)[1];
  fs.writeFileSync(loc, `---\nid: ${id}\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n`);
  const said = run(["upgrade", root]);
  assert.match(said, /rewritten in this core's form: model\/localization\.md/);
  assert.equal(fs.readFileSync(loc, "utf8"), `---\nid: ${id}\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n`);
  assert.doesNotThrow(() => run(["check", root]));
  // The page now names its locale, so the plan writes nothing and upgrade says it has nothing to do.
  assert.match(run(["upgrade", root]), /already on core/i);
});
```

- [ ] **Step 2: Run them to see them fail**

Run `npm run test:plan`, expecting: FAIL — `plan.rewritten` is undefined, and the earlier form is not rewritten.

- [ ] **Step 3: Apply the migration in the plan**

In `lib/plan.mjs`, add `import { migratedLocalization } from "./localization.mjs";` directly after the `./ids.mjs` import. In the `UpgradeWrites` typedef, add ` * @property {string[]} rewritten` directly after ` * @property {string[]} given`. In the comment above the localization block (which Task 1 opened with `The localization page`), change `` `init`, or by hand — is never touched`` to `` `init`, or by hand — is never replaced``, since the block below now rewrites one in place.

After that block, before the `return`, add:

```js
  // One language per model: a core whose localization schema declares `locale` rewrites a page
  // still in the earlier form, a `## Locales` table, into the field, keeping its id, its H1, its
  // statement and every other section. A page that already names its locale is left as it is,
  // and one that declares a translated language refuses the whole upgrade rather than drop it.
  const rewritten = /** @type {string[]} */ ([]);
  const own = held.get("model/localization.md");
  if (own !== undefined && /^\| `locale` \|/m.test(core.get("localization-schema.md") ?? "")) {
    const migrated = migratedLocalization(own);
    if (migrated?.error !== undefined) return { refused: `model/localization.md ${migrated.error}; nothing was written.` };
    if (migrated) {
      writes.set("model/localization.md", migrated.text);
      rewritten.push("model/localization.md");
    }
  }
```

and change the return to `return { writes, removes, edited: [...edited, ...foreign].sort(), missing, given, rewritten, from, to };`. The test is `!== undefined`, not truthiness: it is what narrows `migrated` to the `text` branch for the type checker below it.

In `bin/companygraph.mjs`, in the `UpgradeRead` typedef's refusal branch, change `given?: undefined; from?: undefined;` to `given?: undefined; rewritten?: undefined; from?: undefined;`, and directly after the line printing `written, since the instance had none`, add, in that line's own form:

```js
  if (/** @type {string[]} */ (plan.rewritten).length) console.log(`  rewritten in this core's form: ${/** @type {string[]} */ (plan.rewritten).join(", ")}`);
```

- [ ] **Step 4: Run them to see them pass**

Run `npm run typecheck && npm run test:plan && npm run test:cli`, expecting: no type error, and PASS.

- [ ] **Step 5: Build the declarations, and run everything**

Run `npm run build`, expecting: `git status --short types` lists `types/lib/plan.d.mts` and `types/bin/companygraph.d.mts`, and nothing else.

Run the full run (Global Constraints), expecting: it passes.

- [ ] **Step 6: Commit**

```bash
git add -A lib bin types verify
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
upgrade rewrites a localization page into its locale field

Every instance on core 0.50.0 holds model/localization.md as a ## Locales table, and the new schema asks for a locale field, so upgrade rewrites the page once, keeping its id, H1, statement and every other section, and says so beside the files it gives. A page that already names its locale is left alone, a page declaring a translated language refuses the upgrade before anything is written, and an upgrade toward a core without the field leaves the earlier form as it is.

Verified: npm run typecheck, build:check, verify and every test suite pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

Run `git log -1 --format='[%s]'`, expecting the subject alone between the brackets.

---

### Task 4: R19 leaves the rules and the prose

**Files:**

- Modify: `core/CONVENTIONS.md` (R2, R3, R4, R14, R19, R0)
- Modify: `core/concept-schema.md` (one writing rule)
- Modify: `README.md` (four paragraphs)
- Modify: `agents/claude/skills/companygraph-company/SKILL.md`, `agents/claude/skills/companygraph-profile/SKILL.md`, `agents/claude/skills/companygraph-validate/SKILL.md`

**Interfaces:** none; prose only.

- [ ] **Step 1: The rules**

In `core/CONVENTIONS.md`:

- R2: delete the sentence, with the space before it, `A name in a translated locale is held the same way, within that locale (R19).`
- R3: delete the sentence, with the space before it, `In a locale's prose and its grouped headings, the canonical name is the entity's name in that locale (R19).`
- R4: delete the sentence, with the space before it, `A reference in a locale's prose or grouped headings resolves among that locale's names; a repeated table's references stay the primary's (R19).`
- R14: replace the heading with `### R14 — Names are American English, and prose is in the model's language`, and replace its first paragraph, the one beginning `Every name this vocabulary chooses`, whole with this one line:

  ```markdown
  Every name this vocabulary chooses is spelled in American English — a field, a type, a folder, a section heading a schema declares — and so is the prose of `core/`. An instance's content is written in the one language its `model/localization.md` names. `organization`, `modeling`, `license`, `recognize`.
  ```

- R19: delete the heading `### R19 — A translation is a section of the page it translates`, its paragraph and the blank line after it, so `## Schemas` follows R18's section.
- R0: in the paragraph beginning `Which rules those scripts reach`, change `R15, R16, R18 and R19 against` to `R15, R16 and R18 against`, and `R11, R13, R16 and R19 — against fixtures` to `R11, R13 and R16 — against fixtures`.

In `core/concept-schema.md`, replace the writing rule beginning ``- An alias of kind `translation` is for a language the instance does not declare`` with:

```markdown
- An alias of kind `translation` is the concept's name in a language other than the one the model is written in: what a French customer calls it, in a model kept in English.
```

Run `grep -n "R19\|translated locale\|primary locale" core/*.md`, expecting: no output.

- [ ] **Step 2: The README and the skills**

In `README.md`:

- In the paragraph beginning ``A site reads an instance with``, delete the two sentences from ``Where the instance's `localization.md` declares a translated language`` through ``rather than reading `undefined`.``
- Replace the paragraph beginning `A consumer that only needs an instance's declared languages` with: ``A consumer that only needs the language a model is written in, without parsing the whole graph, reads model/localization.md with `localizationOf` from `companygraph-meta-model/localization`, which returns `{ locale }` or an `error` naming why the file cannot be read — the same reader the checks and `upgrade` use.``
- In the paragraph beginning ``` `upgrade [<folder>]` moves the vendored core```, after the sentence ending `and never where the instance already has one.`, insert: ``Where the core's localization schema declares `locale` and the instance's page is still the earlier `## Locales` table, it rewrites the page into the field — the primary row's tag, the table gone, the id, the H1, the statement and every other section kept — and refuses, writing nothing, a page that declares a translated language.``
- Delete the paragraph beginning ``` `companygraph translations [<folder>] --range <a>..<b>` is R19's other half```.

In each of the three skills, delete the paragraph beginning ``Where `model/localization.md` declares a translated language``, with the blank line before it.

Run `grep -rn "R19\|Translation-unchanged\|translations" README.md agents core`, expecting: no output. (`translated language` stays in the README, in the sentence on `upgrade`'s refusal inserted above.)

- [ ] **Step 3: Run everything, and the family's checks**

Run the full run (Global Constraints), then `sh conventions/conventions-check && npx -y markdownlint-cli2 "core/*.md" README.md "agents/**/*.md"`, expecting: the full run passes; `conventions-check` prints `✓ every Markdown file follows WRITING.md`; markdownlint reports `0 issues`.

Run `grep -rln "R19" lib bin core agents types verify/*.mjs .github README.md`, expecting: no output.

- [ ] **Step 4: Commit**

```bash
git add -A core README.md agents
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
R19 leaves the rules, the README and the skills

R14 now says an instance's content is written in the one language model/localization.md names, R19 is removed with the pointers to it in R2, R3 and R4 and its place in R0's lists, and a concept's translation alias is again simply a name in another language. The README describes localizationOf's { locale } and the upgrade's rewrite, and loses the translations command; the company, profile and validate skills lose their paragraph on language sections.

Verified: npm run typecheck, build:check, verify and every test suite pass, conventions-check and markdownlint-cli2 pass, and grep finds no R19 anywhere outside docs/.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

Run `git log -1 --format='[%s]'`, expecting the subject alone between the brackets.
