# Any page names its documents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every schema in `core/` declares an optional `## References` table with the columns `What | URL` (brand's stays required), R9 requires the declaration, `verify` fails a schema without it or with other columns, and the three instances, the MCP hosts and companygraph.io move to the release so every page of every type can carry the table.

**Architecture:** The section is an ordinary `Table.` section written into each schema, so the parser, the instance checks, the MCP server and the editor plugin read it with no code change. The one new code is a check in `verify/check.mjs` that holds every core schema to the declaration. The instances upgrade their vendored core; nothing in their pages changes. The consumers move only the commits they draw.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-28-any-page-names-its-documents-design.md` (this branch).

## Global Constraints

- Section `## References`, a `Table.` section. Columns exactly `What` (Yes, `string`) and `URL` (Yes, `string`), in that order, with nothing after them. The `Description` cells are the schema's own.
- Brand's declaration stays `Required: Yes` and unchanged. Decision, experience, kpi, process and role keep theirs unchanged. Every other core schema gains one, `Required: No`.
- The sections row reads `| \`## References\` | No | Table. <what this type's references are for>; its columns are declared below. |` and is the last row of the sections table. The column table is the last block under `## Sections`, captioned `` `## References` is a table with these columns: ``.
- `## Also at` on identity and profile is untouched; both schemas gain `## References` beside it.
- No parser change and no change in `lib/`. If a step seems to need one, stop and ask Rob.
- The new check reads the schemas `TYPES` lists, which is every schema in `core/`. No pack exists; a pack's check is written when one does (YAGNI).
- Versions: core 0.47.0 and the package at 0.59.0, if no other release lands first; otherwise the next minor of each. `version` in `package.json` and `ref:` in `.github/workflows/instance-check.yml` name the same release before tagging.
- American English (R14). Spaced em-dash is allowed; no serial comma. Commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers.
- Numbers that move are never written in prose: no count of schemas, types or findings in any schema, commit or PR body.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag, a release and a re-pin each wait for Rob's explicit merge word. A "go" approves building, not merging.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- A re-pin installs the package by name after removing it and is proved from `package-lock.json`, never by a grep.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; PR bodies end `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

- A schema declaring `## References` with the right columns in a different order (`URL` before `What`): a reader of the page would write the table in the declared order and the instance check would then hold every page to it, so the check must fail it. Task 1 asserts it.
- A schema whose `## References` row is present and whose column table is missing: the existing shape check already reports "marked table-valued, but no table"; the new check must add one finding of its own, not crash on the missing table. Task 1 asserts exactly one new finding.
- A page carrying `## References` with the old columns `Where | URL` (copied from an `## Also at`): the instance check must report the column mismatch once and not also a missing URL per row. Task 2 asserts one finding.
- A page on identity or profile carrying both `## Also at` and `## References`: both tables are held, neither draws an edge, and neither is reported. Task 2 asserts it on identity.
- An instance on the older core read by the new core's checks is not a case: the checks read the core the instance vendored. Task 4 still runs each instance's checks before and after its upgrade and reports both.

---

## Phase A — meta-model (worktree `meta-model-any-page-names-its-documents`, branch `any-page-names-its-documents`, which already holds the spec and this plan)

### Task 1: Every schema declares References

**Files:**

- Create: `verify/references.test.mjs`
- Modify: `verify/check.mjs` (a new entry in `CHECKS`, after "schema fixed shape")
- Modify: `package.json` (`test:instance-checks` gains `verify/references.test.mjs`)

**Interfaces:**

- Consumes: `TYPES`, `sectionsOf`, `blocksOf` from `lib/checks.mjs`; `read`, `fail` in `verify/check.mjs`.
- Produces: the findings `core/<type>-schema.md: declares no \`## References\` — R9 has every schema declare it` and `core/<type>-schema.md: \`## References\` declares <columns>; R9 gives it exactly What | Yes | string and URL | Yes | string`, which Task 2's negative control reads.

- [ ] **Step 1: Write the failing test**

Create `verify/references.test.mjs`:

```js
// R9 has every schema declare `## References`, with the columns What and URL exactly. The
// check lives in verify/check.mjs, a script rather than a set of exported functions, so each
// case copies the tree it reads into a temporary directory, changes one schema in the copy
// and runs the script there, as check-script.test.mjs does. The schema changed is process's,
// whose declaration predates the rule and is the shape every other schema copies.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "process";
const ROW = "| `## References` | No | Table. The rulebooks the process is run by; its columns are declared below. |";
const WHAT = "| `What` | Yes | string | The kind of document — a rulebook, a checklist, a mandate |";
const URL_ROW = "| `URL` | Yes | string | Where it is |";
const CAPTION = "`## References` is a table with these columns:";

// The findings this check makes about the changed schema, from a run of check.mjs on a copy.
// No package.json is copied, so the release check fails in every run; only lines naming the
// schema and References are read.
function findings(change) {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-references-"));
  try {
    for (const dir of ["core", "example", "lib"]) cpSync(join(ROOT, dir), join(tmp, dir), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    const path = join(tmp, "core", `${SCHEMA}-schema.md`);
    const before = readFileSync(path, "utf8");
    for (const line of [ROW, WHAT, URL_ROW, CAPTION])
      assert.ok(before.includes(line), `core/${SCHEMA}-schema.md no longer carries "${line}" — update the fixture`);
    writeFileSync(path, change(before));
    const { stderr } = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    return stderr.split("\n").map((l) => l.trim())
      .filter((l) => l.startsWith(`core/${SCHEMA}-schema.md:`) && l.includes("R9 ") && l.includes("References"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// The declaration removed whole: the row, the caption and the column table under it.
const withoutDeclaration = (text) => {
  const start = text.indexOf(CAPTION);
  const end = text.indexOf(URL_ROW, start) + URL_ROW.length;
  return (text.slice(0, start) + text.slice(end)).replace(`${ROW}\n`, "");
};

test("a schema that declares References with What and URL passes", () => {
  assert.deepEqual(findings((t) => t), []);
});

test("a schema with no References declaration fails once, naming R9", () => {
  const f = findings(withoutDeclaration);
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /declares no `## References` — R9 has every schema declare it/);
});

test("a third column fails once", () => {
  const f = findings((t) => t.replace(URL_ROW, `${URL_ROW}\n| \`Note\` | No | string | A note |`));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /R9 gives it exactly What \| Yes \| string and URL \| Yes \| string/);
});

test("an optional URL fails once", () => {
  const f = findings((t) => t.replace(URL_ROW, URL_ROW.replace("| Yes |", "| No |")));
  assert.equal(f.length, 1, f.join("\n"));
});

test("URL before What fails once", () => {
  const f = findings((t) => t.replace(`${WHAT}\n${URL_ROW}`, `${URL_ROW}\n${WHAT}`));
  assert.equal(f.length, 1, f.join("\n"));
});

test("a row with no column table fails once more than the shape check's own finding", () => {
  const f = findings((t) => {
    const start = t.indexOf(CAPTION);
    const end = t.indexOf(URL_ROW, start) + URL_ROW.length;
    return t.slice(0, start) + t.slice(end);
  });
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /declares no columns/);
});
```

In `package.json`, append ` verify/references.test.mjs` to the end of the `test:instance-checks` command.

- [ ] **Step 2: Run the test to see it fail**

Run: `export PATH=/opt/homebrew/bin:$PATH && node --test verify/references.test.mjs` Expected: the first test passes and the other five FAIL with `0 !== 1`, because nothing reads the declaration yet.

- [ ] **Step 3: Write the check**

In `verify/check.mjs`, add after the closing `},` of the "schema fixed shape" entry:

```js
  {
    // R9 has every schema declare `## References`, the table of documents a reader can check a
    // page against, with What and URL exactly. The declaration is written in each schema rather
    // than supplied by the parser, because a section the schema states is one every reader sees
    // there; this check is what keeps those copies from drifting apart. A schema chooses the
    // section's Required and its description, and nothing else.
    name: "every schema declares References",
    rule: "R9",
    run() {
      const want = "What | Yes | string; URL | Yes | string";
      for (const { type } of TYPES) {
        const path = `core/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        const [sections, ...captioned] = blocksOf(sectionsOf(text).get("Sections") ?? "");
        const row = (sections?.table?.rows ?? []).find(
          (r) => (r[0] ?? "").replace(/`/g, "").trim() === "## References",
        );
        if (!row) {
          fail(`${path}: declares no \`## References\` — R9 has every schema declare it`);
          continue;
        }
        const columns = captioned.find((b) => b.section === "References")?.table?.rows ?? [];
        const got = columns
          .map((r) => r.slice(0, 3).map((c) => (c ?? "").replace(/`/g, "").trim()).join(" | "))
          .join("; ");
        if (got !== want)
          fail(
            `${path}: \`## References\` declares ${got || "no columns"}; R9 gives it exactly What | Yes | string and URL | Yes | string`,
          );
      }
    },
  },
```

`blocksOf` and `sectionsOf` are already imported at the top of the file.

- [ ] **Step 4: Run the test to see it pass**

Run: `node --test verify/references.test.mjs` Expected: PASS, six tests.

- [ ] **Step 5: The negative control on the real schemas**

Run: `npm run verify` Expected: FAIL with one `declares no \`## References\`` finding for each schema other than brand, decision, experience, kpi, process and role, and no other new finding. Keep the list; Task 2 closes every line of it.

- [ ] **Step 6: Commit**

```bash
git add verify/check.mjs verify/references.test.mjs package.json
git commit -F - <<'EOF'
Every schema declares References: the check

R9 is to have every schema declare a References table with the columns What and URL, and this is the check that holds it: a schema without the section, with other columns, with them in another order or with URL optional fails, naming R9. Each case runs the verify script on a copy of the tree with the process schema changed, as the short-row regression does. The schemas themselves follow in the next commit, so verify fails on this one for every schema that has no declaration yet.

Verified: node --test verify/references.test.mjs failed on five cases before the check was written and passes after; npm run verify now fails only on schemas without the declaration.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: The rule in R9 and the declaration in every schema

**Files:**

- Modify: `core/CONVENTIONS.md` (R9, a paragraph and three bullets after the paragraph on joins)
- Modify: every `core/*-schema.md` that Task 1 Step 5 listed (the sections row and the column table)
- Modify: `core/feature-schema.md` (one more writing rule)
- Modify: `verify/references.test.mjs` (two instance-check tests)

**Interfaces:**

- Consumes: the check from Task 1.
- Produces: a core in which every schema declares `## References`, which Task 3 releases.

- [ ] **Step 1: Write the failing instance tests**

Append to `verify/references.test.mjs`:

```js
// The instance checks hold a References table on a type that declares it newly, as they hold
// any declared table: through its real schema, read from disk, so the test fails if the schema
// and the checks part. Value stands for every type that gains the section; identity is the type
// that carries it beside `## Also at`.
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const schema = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const SOURCE_SCHEMA = ["# Source Schema", "", "> A source.", "", "## File Location", "", "`model/sources/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const refs = (header, rows) => ["## References", "", header, "| --- | --- |", ...rows, ""];
const value = (table) => ["---", "source: Local", "---", "", "# Candor", "", "> We say what happened.", "",
  "## In practice", "", "Saying it early.", "", ...table].join("\n");
const identity = (table) => ["---", "source: Local", "---", "", "# Acme", "", "> Billing software.", "",
  "## What it is", "", "Acme makes billing software for small firms.", "",
  "## Also at", "", "| Where | URL |", "| --- | --- |", "| GitHub | https://example.invalid/acme |", "", ...table].join("\n");
const failuresOf = (path, type, page) =>
  checkInstance(new Map([
    [`meta/core/${type}-schema.md`, schema(type)],
    ["meta/core/source-schema.md", SOURCE_SCHEMA],
    ["model/sources/local.md", "# Local\n\n> Here.\n"],
    [path, page],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes(path));

test("a value whose References row names its document passes", () => {
  assert.deepEqual(failuresOf("model/values/candor.md", "value",
    value(refs("| What | URL |", ["| Code of conduct | https://example.invalid/conduct |"]))), []);
});

test("a References row with no URL fails once", () => {
  const f = failuresOf("model/values/candor.md", "value", value(refs("| What | URL |", ["| Code of conduct |  |"])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"## References" row has no url/);
});

test("a References table with Also at's columns fails once, on the columns", () => {
  const f = failuresOf("model/values/candor.md", "value",
    value(refs("| Where | URL |", ["| GitHub | https://example.invalid/a |", "| LinkedIn |  |"])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /columns are Where\|URL; the schema declares What\|URL/);
});

test("an identity carrying Also at and References passes", () => {
  assert.deepEqual(failuresOf("model/identity.md", "identity",
    identity(refs("| What | URL |", ["| Register entry | https://example.invalid/register |"]))), []);
});
```

Move the two new `import` lines to the top of the file with the others.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/references.test.mjs` Expected: the Task 1 tests pass; "a References row with no URL fails once" and "a References table with Also at's columns fails once" FAIL with `0 !== 1`, because value does not declare the section yet, so the table is the page's own and held to nothing. If "a value … passes" or "an identity … passes" fails, read the finding: a fixture page missing a required section is a fixture bug, fixed in the fixture.

- [ ] **Step 3: The rule in R9**

In `core/CONVENTIONS.md`, directly after the R9 paragraph that begins "A schema may declare two joins between what its tables hold", insert:

```markdown
Every schema declares `## References`, a table of the documents a reader can check the page against, with the columns `What`, a required `string` naming the kind of document — a specification, a recording, a listing — and `URL`, a required `string` saying where it is, written exactly so and in that order. It declares no reference and so draws nothing (R16). A schema chooses its `Required`, `No` unless the type cannot be applied without its documents, and says in the sentence after `Table.` what its references are for. A schema without the section, or with other columns, is an error. The section is written in every schema rather than assumed by whatever reads one, so that a reader of a schema sees all a page may hold in the schema itself. Three rules hold the table on every type:

- `What` names the kind of document in a few words, not its title and not an entity's canonical name: the table is data, and a cell that reads like a name invites a reader to look for the entity.
- `URL` is an absolute `https` address to the document itself, not to a search or a feed that happens to contain it.
- One row per document. Two documents of the same kind are two rows.
```

- [ ] **Step 4: The declaration in every schema Task 1 listed**

In each schema below, add the row as the last row of the sections table, and append the column table as the last block under `## Sections` (after any caption, table or paragraph already there, before `## Purpose`). The row and the column table for each:

```markdown
| `## References` | No | Table. <FOR>; its columns are declared below. |
```

```markdown
`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — <KINDS> |
| `URL` | Yes | string | Where it is |
```

| Schema | `<FOR>` | `<KINDS>` |
| --- | --- | --- |
| achievement-kind | Where the kind is defined outside the model | a framework, a standard |
| concept | Where the term is defined outside the model | a standard, a glossary |
| decision-kind | Where the kind is defined outside the model | a governance framework, a mandate |
| decision-status | Where the status is defined outside the model | a governance framework, a mandate |
| domain | Documents that describe the area outside the model | a charter, a map of the area |
| experience-kind | Where the kind is defined outside the model | a classification, a standard |
| feature | Where someone can use the feature | a chat, a listing, a command's page |
| identity | Documents a reader can check the company against | a register entry, articles of association |
| phase | The rulebooks and checklists the phase is run by | a rulebook, a checklist |
| product | Where the product is documented and obtained | its documentation, its release page |
| proficiency-level | Where the scale is defined outside the model | a competency framework, a standard |
| profile | Documents a reader can check the person against | a register entry, a published CV |
| question | Documents that answer the question beyond the model | a standard, a published post |
| question-kind | Where the kind is defined outside the model | a classification, a standard |
| skill | Where the skill is defined outside the model | a framework, a standard |
| source | Documents that describe the source | its documentation, an export's format |
| strategic-objective | Documents the objective is set and tracked in | a plan, a board paper |
| strategy | Documents the strategy is set out in | a plan, a board paper |
| surface | Documents the surface is held to | a platform's published limits, a style guide |
| track | The rulebooks the track's work is done by | a rulebook, a checklist |
| value | Documents the value is stated in outside the model | a code of conduct, a handbook |
| vision | Documents the vision is published in | a talk, an article |

If Task 1 Step 5 listed a schema this table does not, stop and ask Rob for its two cells. If this table lists one Task 1 did not, leave that schema as it is.

- [ ] **Step 5: The feature schema's writing rule**

In `core/feature-schema.md`, append to `## Writing rules`:

```markdown
- A References row says where someone can use the feature, and `What` names the kind of place, a chat, a listing, a command's page, never the surface, product or vendor by name.
```

- [ ] **Step 6: Run everything**

```bash
node --test verify/references.test.mjs
npm run verify
npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:cli && npm run test:untar && npm run test:fetch-core && npm run test:obsidian
sh conventions/conventions-check && sh conventions/conventions-format check
```

Expected: PASS. `npm run verify` fails at this point only on the release check if the version has not moved; Task 3 moves it. If a test elsewhere moves (a snapshot of a type's sections in `verify/constraints.test.mjs`, `verify/obsidian.test.mjs` or `verify/instance.test.mjs`), it moves only because a schema gained an optional table section: read the failure's diff, confirm that is all it says, and update the expectation to include `References`.

- [ ] **Step 7: Commit**

```bash
git add core/ verify/
git commit -F - <<'EOF'
Every schema declares References

R9 now says every schema declares a References table with the columns What and URL, and says what a row holds: the kind of document, never an entity's name, an absolute address to the document itself, and one row per document. Every schema that had no declaration gains an optional one whose description says what that type's references are for, and the feature schema says a row is where someone can use the feature. Brand, decision, experience, kpi, process and role keep theirs as they were. Two instance tests show a value's References row held by the checks, and an identity carrying the table beside Also at.

Verified: the instance tests failed on a missing URL and on Also at's columns before value declared the section and pass after; npm run verify's new check passes on every schema; the suites, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: The release

**Files:**

- Modify: `core/manifest.json` → `{ "version": "0.47.0", "shape": 3 }`
- Modify: `package.json` → `"version": "0.59.0"`
- Modify: `.github/workflows/instance-check.yml` → `ref: v0.59.0`

First `git fetch && git log --oneline HEAD..origin/main -- core/manifest.json package.json`: if a release landed on main since this branch was cut, merge main and take the next minor of each instead.

- [ ] **Step 1: Move the three and run the full suite** — edit the three files, then run Task 2 Step 6's commands. Expected: PASS, the release check included.

- [ ] **Step 2: Every instance still passes** — for each of `/Users/rob/git/robertblust/mental-model`, `/Users/rob/git/companygraph/mental-model` and `/Users/rob/git/guestgraph/mental-model`, copy it to a scratch directory, then from this worktree run `node bin/companygraph.mjs upgrade <copy>` (it writes this worktree's own core, not a fetched release) and `node bin/companygraph.mjs check <copy>`. Expected: the check passes on each, and `git -C <copy> status` shows changes only under `meta/core/`, `.companygraph/`, `.github/workflows/` and `.claude/skills/`. Report each result in the PR body.

- [ ] **Step 3: Commit, push, open the PR against the spec's PR, and stop** — the spec and plan are already on #180, so this branch's PR is #180.

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
Core 0.47.0 and the package at 0.59.0

Every schema declares References, so core moves a minor: no page loses anything and every type gains an optional section. The instance workflow's ref moves with the package, as the release check requires.

Verified: npm run verify passes, its release check included; the suites pass; the three instances pass their checks after an upgrade on a scratch copy.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push
gh pr edit 180 --title "Any page names its documents"
```

Rewrite #180's body in prose: the gap (a feature cannot say where someone uses it, six schemas declared the same table), what changed (R9's rule, the declaration in every schema, the check), what it costs downstream (each instance upgrades its core, no page changes, the hosts and companygraph.io move their commits), `Release notes to write at tagging: …` naming core 0.47.0 and that an instance upgrading needs no change of its own, then `Verified: …` with the instance results from Step 2. Stop for Rob's merge word.

- [ ] **Step 4: After Rob merges, on his word, tag and release**

```bash
cd /Users/rob/git/companygraph/meta-model && git pull --ff-only
gh release create v0.59.0 --target main --title v0.59.0 --notes "Core 0.47.0: every schema declares \`## References\`, a table of the documents a reader can check a page against, with the columns \`What\` and \`URL\`, and R9 requires the declaration with those columns exactly. The section is optional on every type but brand, where it was already required. An instance that upgrades needs no change of its own: every page stays valid, and any page may now carry the table. verify gains the check that holds every schema to the declaration."
gh api repos/companygraph/meta-model/git/refs/tags/v0.59.0 --jq .object.sha
```

Then remove the worktree and the branch by name, never chained after the merge: `git worktree remove ../meta-model-any-page-names-its-documents`, `git branch -d any-page-names-its-documents`, `git push origin --delete any-page-names-its-documents`. If the remote delete is refused, hand Rob the command and do not retry.

---

## Phase B — the instances

### Task 4: robertblust/mental-model, companygraph/mental-model, guestgraph/mental-model

One worktree, commit and PR per instance, each stopped for Rob's merge word. For each `<instance>` in `/Users/rob/git/robertblust/mental-model`, `/Users/rob/git/companygraph/mental-model` and `/Users/rob/git/guestgraph/mental-model`:

**Files:** `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`, as the upgrade writes them. No file under `model/`.

- [ ] **Step 1: Worktree, checks before, upgrade**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd <instance> && git pull --ff-only
git worktree add -b every-page-may-name-its-documents ../mental-model-every-page-may-name-its-documents origin/main
cd ../mental-model-every-page-may-name-its-documents
# the checks before, as the instance's CLAUDE.md states them (the checker refuses an instance pinned to another version, so v0.59.0 cannot check it yet)
npx --yes "github:companygraph/meta-model#v0.59.0" upgrade .
npx --yes "github:companygraph/meta-model#v0.59.0" check .
```

Expected: the checks pass on the old core; the upgrade moves core to 0.47.0 and `check` passes. Confirm `.companygraph/manifest.json` names 0.59.0 and 0.47.0, and that `git status` shows nothing under `model/`.

- [ ] **Step 2: Validate** — run the instance's validation as its `CLAUDE.md` states it. Expected: PASS.

- [ ] **Step 3: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The instance moves to core 0.47.0

Every schema in core now declares an optional References table, so any page of any type may name the documents a reader can check it against. Nothing in the model changes: the upgrade moves the vendored core, the manifest and the workflow's ref.

Verified: the instance checks pass before and after the upgrade; the validation CLAUDE.md states passes.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin every-page-may-name-its-documents
gh pr create --title "The instance moves to core 0.47.0" --body-file <(cat <<'EOF'
This moves the instance to meta-model v0.59.0, whose schemas each declare an optional References table with the columns What and URL. No page changes and none has to: the section is optional everywhere but on the brand, which already carried it. Filling it where it helps is later work, CompanyGraph's features first.

Verified: the instance checks pass before and after the upgrade, and the validation this repository's CLAUDE.md states passes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop for Rob's merge word; then delete the worktree and branch by name.

---

## Phase C — the consumers

### Task 5: The hosts, companygraph.io and the plugin

Each is its own worktree, commit and PR, stopped for Rob's merge word.

- [ ] **Step 1: The three MCP hosts** — `robertblust/mcp-blust-ch`, `companygraph/mcp-companygraph-io`, `guestgraph/mcp-guestgraph-io`: move `source.json`'s instance `commit` to the merge commit from Task 4 in each of the three places the host pins the instance. No package re-pin: `companygraph-mcp-server` reads the schemas the instance vendored. `npm test` passes. After the deploy, `describe_schema` with `type: feature` on each host lists `## References` with the two columns.
- [ ] **Step 2: companygraph.io** — `companygraph/companygraph.github.io`: move `source.json`'s instance commit to Task 4's companygraph merge commit and `"meta-model".commit` to the commit the `v0.59.0` tag names; `npm run model && npm run build && npm run sitemap`; `model:check` and `build:check` pass. Confirm `/model/` shows `## References` on the feature schema. The package pin stays: the parser did not change.
- [ ] **Step 3: blust.ch and guestgraph.io** — move `source.json`'s instance commit to Task 4's merge commits, rebuild as each site's README says, checks pass. No package re-pin.
- [ ] **Step 4: The plugin, checked not released** — in a scratch copy of Rob's vault after Task 4's robertblust upgrade, open a feature page with the plugin installed and confirm the section picker offers `## References` and that a References row with an empty URL shows the R16 finding. The plugin reads the vault's schemas and needs no release; if either fails, stop and report to Rob.

## After this plan

The first content is CompanyGraph's eight features, each with a References row written from the place itself, in its own pull request in companygraph/mental-model. It is not part of this plan, and waits for Rob to ask.
