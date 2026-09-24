# A question rests on the model — Implementation Plan (meta-model)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship core type `question` and the reference form `ref → by <Column> in <Owner>` in meta-model, read by the parser, held by the checker, and exercised by the example instance.

**Architecture:** One reader of a Type cell, `declarationOf` in `lib/instance.mjs`, learns the new form and returns `{ form: "ref", target: null, by, in }`. The parser resolves a row's reference against the type its `by` cell names, within the owner its `in` cell names. `verify/check.mjs` admits the form in column tables only. `lib/checks.mjs` holds an instance's cells to it without naming any type. Core then gains `question-schema.md`, the conventions text, and three example questions.

**Tech Stack:** Node ≥ 20 ES modules, `node:test`, no dependencies. Markdown under the family's markdownlint config.

**Spec:** `docs/superpowers/specs/2026-09-24-a-question-rests-on-the-model-design.md`

This plan covers meta-model only. chat-server's question index gets its own plan in that repository. The instances' seeds are editorial and chosen one by one. Consumer re-pins follow the spec's order: every consumer takes this release before any instance it reads carries a question.

## Global Constraints

- The forms are exactly `ref → by <Column>` and `ref → by <Column> in <Owner>`, legal in a column table only. `<Column>` and `<Owner>` are `string` columns of the same table. A column name used in them may not contain the word ` in `.
- A `by` cell draws one edge via `<Section>.<Column>`, `Rests on.Entity`; the type and owner cells draw none and reach the edge as string attributes.
- Owned type: the owner cell is required and names an entity of the type R10 declares as owner; unowned type: the owner cell is blank.
- `question` is unowned, folder `model/questions/*.md`; the answer (`>` line) is required; `## Rests on` is optional.
- `shape` stays 3. The manifest version and `package.json` version each move by a minor.
- No check names the type `question` (the checker reads declarations, never type names), except the `TYPES` table that lists every type.
- Prose is American English, one paragraph per line (markdownlint `paragraph-on-one-line`), and no number that still moves.
- Commit messages: a plain sentence as the subject, no prefix, under seventy characters; a prose body; a `Verified:` line naming the commands actually run; then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- Work in `/Users/rob/git/companygraph/meta-model-a-question-rests-on-the-model` (branch `a-question-rests-on-the-model`). Export `/opt/homebrew/bin` first on PATH.

## Review Focus

- A `by` column whose type cell names an owned type from a page that is itself inside another owner (a question never is, but a future schema could put the form on an owned type). Resolution must use the row's owner cell, never the page's own owner. Pinned in Task 2 by resolving against Mira's experience from a question, and in Task 4 by the "entity of another owner" case.
- A type cell with surrounding spaces or backticks, `` `profile` ``, must read as `profile`, the way every other cell does. Pinned in Task 2 and Task 4 with a backticked cell.
- The form spelled with `ref?`, `array of` or `qualifier` must be refused by the vocabulary gate with its own message, not taken for a type named `by Type`. Pinned in Task 3.
- A question page with no `## Rests on` passes every check and draws no edges. Pinned in Task 2 and Task 4.
- The full check run over `example/` with three questions reports zero failures. That catches any regex in `lib/checks.mjs` still reading `ref → by …` as a type name. Pinned in Task 5.

---

### Task 1: The reader of a Type cell learns the form

**Files:**
- Modify: `lib/instance.mjs` — `declarationOf` (around line 394), the frontmatter and column-table loops of `parseSchemas` (around lines 456–503), and the `reference` helper inside `constraintsOf` (around line 618)
- Test: `verify/instance.test.mjs`

**Interfaces:**
- Produces: `declarationOf(cell)` returns `{ form: "ref", target: null, by: <string>, in: <string|null> }` for the new form, and the unchanged `{ form, target }` for every other form. `constraintsOf(...)[type].references[i]` carries `by` and `in` (both `null` for other forms) and `target: null` for the new form.

- [ ] **Step 1: Write the failing tests** — append to `verify/instance.test.mjs`:

```js
test("a Type cell reading `ref → by <Column> in <Owner>` is a reference whose type is its row's", () => {
  assert.deepEqual(declarationOf("ref → by Type in Owner"), { form: "ref", target: null, by: "Type", in: "Owner" });
  assert.deepEqual(declarationOf("`ref → by Type`"), { form: "ref", target: null, by: "Type", in: null });
  // Every other form keeps the shape it had, so nothing reading `{ form, target }` changes.
  assert.deepEqual(declarationOf("ref → skill"), { form: "ref", target: "skill" });
  assert.deepEqual(declarationOf("qualifier → proficiency-level"), { form: "qualifier", target: "proficiency-level" });
});

test("a schema declaring a `by` column is read, and the vocabulary graph draws no type edge for it", () => {
  const files = new Map([
    ["value-schema.md", schema("value")],
    ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"], ["For", "string"]] } })],
  ]);
  const { edges } = parseSchemas(files);
  assert.deepEqual(edges.filter((e) => e.from === "core/question"), []);
});
```

Also add `constraintsOf` to the import line at the top of the file (`import { parseInstance, parseSchemas, declarationOf, constraintsOf, CORE_LABEL } from "../lib/instance.mjs";`) and append:

```js
test("constraints name a `by` reference by its columns and no target", () => {
  const files = new Map([
    ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"]] } })],
  ]);
  const ref = constraintsOf(files).question.references.find((r) => r.via === "Rests on.Entity");
  assert.equal(ref.target, null);
  assert.equal(ref.by, "Type");
  assert.equal(ref.in, "Owner");
  assert.equal(ref.form, "ref");
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/instance.test.mjs`
Expected: the three new tests FAIL. `declarationOf` returns `target: "by Type in Owner"`, and `parseSchemas` throws `R4: "by Type in Owner" … names no schema`.

- [ ] **Step 3: Implement.** In `lib/instance.mjs`, replace `declarationOf` with:

```js
// `ref → by <Column>` and `ref → by <Column> in <Owner>` (R9): a reference whose type is read
// from its own row, and where that type is owned, whose owner is too. It is matched before the
// three forms that name their type, which would otherwise take `by Type in Owner` for a type.
const BY_DECLARATION = /^ref → by (.+?)(?: in (.+))?$/;
const DECLARATION = /^(?:array of )?(ref\??|qualifier) → (.+)$/;
export function declarationOf(cell) {
  const bare = (cell ?? "").replace(/`/g, "").trim();
  const by = bare.match(BY_DECLARATION);
  if (by) return { form: "ref", target: null, by: by[1].trim(), in: by[2]?.trim() ?? null };
  const m = bare.match(DECLARATION);
  return m ? { form: m[1], target: m[2].trim() } : null;
}
```

In `parseSchemas`, in both loops that call `resolveType(decl.target, e.path)`, skip a `by` declaration. The graph is the vocabulary, and a `by` column points at no one type:

```js
        const decl = declarationOf(cell);
        if (!decl || decl.by) continue;
```

In `constraintsOf`'s `reference` helper, carry the new keys:

```js
      references.push({ via, form: decl.form, target: decl.target, by: decl.by ?? null, in: decl.in ?? null, array, required,
                        min: ofPage && required ? 1 : 0, max: ofPage && !array ? 1 : null });
```

- [ ] **Step 4: Run the parser tests**

Run: `node --test verify/instance.test.mjs verify/constraints.test.mjs`
Expected: all PASS. If `constraints.test.mjs` compares whole reference objects with `deepEqual`, add `by: null, in: null` to its expected objects. That's the only allowed change to existing tests.

- [ ] **Step 5: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs verify/constraints.test.mjs
git commit -F - <<'EOF'
The reader of a Type cell reads a reference typed by its row

A question points at a profile in one row and a value in the next, which no declared type can say. declarationOf now reads `ref → by <Column> in <Owner>` as a reference with no target of its own, the vocabulary graph draws no type edge for it, and constraints carry the columns it reads.

Verified: node --test verify/instance.test.mjs verify/constraints.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

(Rewrite the `Verified:` line to name the commands you actually ran.)

---

### Task 2: The parser draws a row's edge on the type its row names

**Files:**
- Modify: `lib/instance.mjs` — `parseInstance`, beside `resolve` (around line 265) and in the body-table loop (around lines 313–333)
- Test: `verify/instance.test.mjs`

**Interfaces:**
- Consumes: `declarationOf` from Task 1.
- Produces: edges `{ from: "questions/<slug>", to: <id>, via: "Rests on.Entity", attrs: { Type, Owner, For } }`, and R4 errors whose messages contain the phrases asserted below.

- [ ] **Step 1: Write the failing tests** — append to `verify/instance.test.mjs`:

```js
// A question's rows name entities of any type, the type read from the row and, where the type
// is owned, the owner too (R4, R9). The fixtures reuse `valid` and `schemas` above.
const questionSchemas = new Map([...schemas,
  ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"], ["For", "string"]] } })]]);
const question = (rows) => ["# Who splits the billing domain?", "", "> Look at the period and the value behind it.", "",
  ...(rows ? ["## Rests on", "", "| Type | Entity | Owner | For |", "| --- | --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`), ""] : [])].join("\n");
const withQuestion = (rows) => new Map([...valid, ["questions/who-splits-billing.md", question(rows)]]);

test("a row typed by its own cells draws its edge, within the owner it names", () => {
  const { edges } = parseInstance(withQuestion([
    ["value", "Craftsmanship", "", "why"],
    ["`experience`", "Splitting the billing domain", "Mira Halvorsen", "the period"],
  ]), { schemas: questionSchemas });
  const drawn = edges.filter((e) => e.via === "Rests on.Entity");
  assert.deepEqual(drawn.map((e) => e.to).sort(), ["profiles/mira-halvorsen/experiences/2022-beacon-systems", "values/craftsmanship"]);
  const period = drawn.find((e) => e.to.startsWith("profiles/"));
  assert.equal(period.from, "questions/who-splits-billing");
  assert.equal(period.attrs.Owner, "Mira Halvorsen");
  assert.equal(period.attrs.For, "the period");
});

test("a question with no Rests on draws nothing and reads", () => {
  const { entities, edges } = parseInstance(withQuestion(null), { schemas: questionSchemas });
  assert.ok(entities.some((e) => e.id === "questions/who-splits-billing"));
  assert.deepEqual(edges.filter((e) => e.from === "questions/who-splits-billing"), []);
});

test("a type cell naming no type is R4", () => {
  assert.throws(() => parseInstance(withQuestion([["valu", "Craftsmanship", "", ""]]), { schemas: questionSchemas }), /R4: .*"valu", which no schema declares/);
});

test("an owned type with no owner cell is R4, naming the owner type", () => {
  assert.throws(() => parseInstance(withQuestion([["experience", "Splitting the billing domain", "", ""]]), { schemas: questionSchemas }), /R4: .*which a profile owns, and the row names no profile/);
});

test("an unowned type with an owner cell is R4", () => {
  assert.throws(() => parseInstance(withQuestion([["value", "Craftsmanship", "Mira Halvorsen", ""]]), { schemas: questionSchemas }), /R4: .*nothing owns/);
});

test("an owned name is looked for only within the owner the row names", () => {
  const files = withQuestion([["experience", "Splitting the billing domain", "Tomas Reyes", ""]]);
  files.set("profiles/tomas-reyes/tomas-reyes.md", "# Tomas Reyes\n\n> Designer.\n");
  assert.throws(() => parseInstance(files, { schemas: questionSchemas }), /R4: "Splitting the billing domain" .*names no experience of profiles\/tomas-reyes/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/instance.test.mjs`
Expected: the new tests FAIL. `resolve` reads `decl.target === null` and throws the wrong error.

- [ ] **Step 3: Implement.** In `parseInstance`, directly after `resolve`, add:

```js
  // `ref → by <Column> in <Owner>` (R4, R9): the row's own cells say what the name is. The type
  // cell names a type a schema declares; where that type is owned, the owner cell names the
  // owner the name is resolved within, and where it is not, the owner cell is blank. The page's
  // own place is never consulted: a row written outside every owner says which one it means.
  const resolveBy = (decl, row, columns, value, where) => {
    const cellOf = (name) => (name ? (row[columns.indexOf(name)] ?? "").replace(/`/g, "").trim() : "");
    const type = cellOf(decl.by), ownerName = cellOf(decl.in);
    if (!declared.has(type)) throw new Error(`R4: "${value}" in ${where} is of type "${type}", which no schema declares`);
    const ownerType = ownerTypeOf(type);
    if (!ownerType) {
      if (ownerName) throw new Error(`R4: "${value}" in ${where} is a ${type}, which nothing owns, and its row names "${ownerName}" as its owner`);
      const id = byScope.get(scopeKey(type, null))?.get(value);
      if (!id) throw new Error(`R4: "${value}" in ${where} names no ${type}`);
      return id;
    }
    if (!ownerName) throw new Error(`R4: "${value}" in ${where} is a ${type}, which a ${ownerType} owns, and the row names no ${ownerType}`);
    if (ownerTypeOf(ownerType)) throw new Error(`R4: "${value}" in ${where} is a ${type} of a ${ownerType}, which is itself owned; a row names one owner`);
    const owner = byScope.get(scopeKey(ownerType, null))?.get(ownerName);
    if (!owner) throw new Error(`R4: "${ownerName}" in ${where} names no ${ownerType}`);
    const id = byScope.get(scopeKey(type, owner))?.get(value);
    if (!id) throw new Error(`R4: "${value}" in ${where} names no ${type} of ${owner}`);
    return id;
  };
```

In the body-table loop, change the reference branch:

```js
          if (col === refName) { to = refDecl.by ? resolveBy(refDecl, row, s.table.columns, cell.replace(/`/g, "").trim(), where) : resolve(refDecl, cell, where, e); return; }
```

The type and owner columns are declared `string`, so `declarationOf` returns `null` for them. They are absent from `columns`, and the existing branch keeps them in `attrs` as written.

- [ ] **Step 4: Run the parser tests**

Run: `node --test verify/instance.test.mjs verify/constraints.test.mjs && node --test verify/rule-citations.test.mjs`
Expected: all PASS. The rule-citations test accepts the new `R4:` messages because R4 is defined.

- [ ] **Step 5: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs
git commit -F - <<'EOF'
A row typed by its own cells draws its edge within the owner it names

The parser resolves a `by` column against the type the row's type cell names, and an owned type within the owner its owner cell names, since a question sits outside every owner. A type no schema declares, an owned type with no owner and an unowned type with one are each R4.

Verified: node --test verify/instance.test.mjs verify/constraints.test.mjs verify/rule-citations.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 3: The vocabulary gate admits the form in column tables only

**Files:**
- Modify: `verify/check.mjs` — the `type vocabulary` check (around lines 330–390)
- Test: `verify/check-script.test.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks. The gate reads the cell text itself, as it does for every other form.
- Produces: failure messages containing the phrases asserted below.

- [ ] **Step 1: Write the failing tests** — append to `verify/check-script.test.mjs`. Each copies the tree, mutates one row of `core/profile-schema.md`, and runs the script, as the image test above it does:

```js
// `pairs` is one [from, to] row replacement or a list of them.
const mutated = (...pairs) => {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-check-"));
  try {
    for (const dir of ["core", "example", "lib"]) cpSync(join(ROOT, dir), join(tmp, dir), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    const schemaPath = join(tmp, "core", "profile-schema.md");
    let text = readFileSync(schemaPath, "utf8");
    for (const [from, to] of pairs) {
      assert.ok(text.includes(from), "core/profile-schema.md no longer carries the row this test mutates — update the fixture");
      text = text.replace(from, to);
    }
    writeFileSync(schemaPath, text);
    const result = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    return result.stdout + result.stderr;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

test("a frontmatter field typed by its row fails, since a field has no row", () => {
  const out = mutated(["| `location` | No | string | Where the person works from |", "| `location` | No | ref → by Kind | Where. |"]);
  assert.match(out, /`location` is "ref → by Kind"; a reference whose type is read from its row is a column, never a frontmatter field/);
});

test("a `by` naming a column that is not a string column of its table fails", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref → by Kind | The page. |"]);
  assert.match(out, /`URL` is "ref → by Kind", and `Kind` is not a string column of the same table \(R9\)/);
});

test("a required `by` column whose type column is optional fails", () => {
  const out = mutated(
    ["| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |", "| `Where` | No | string | The place. |"],
    ["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref → by Where | The page. |"]);
  assert.match(out, /`URL` is required and `Where`, which names its type, is not \(R9\)/);
});

test("the form spelled with `ref?` is refused by its own message", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref? → by Where | The page. |"]);
  assert.match(out, /`ref → by <Column>` and `ref → by <Column> in <Owner>` are the forms \(R9\)/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/check-script.test.mjs`
Expected: the four new tests FAIL. The script reports `points at unknown type "by Kind"` (or nothing) instead.

- [ ] **Step 3: Implement.** In the `type vocabulary` check, note which blocks are heading tables:

```js
        const blocks = blocksOf(s.get("Sections") ?? "");
        const headingTables = new Set(blocks.filter((b) => b.grouped).map((b) => b.table));
        const typed = [frontmatter, ...blocks.filter((b) => b.section || b.grouped).map((b) => b.table)];
```

(This replaces the existing `typed` construction, which called `blocksOf` inline.) Then, inside the row loop, directly after the `array of qualifier` refusal and before `const ref = declared.match(...)`:

```js
            // R9: a reference whose type is read from its row needs a row, so it is a column of a
            // column table, and the columns it reads are string columns of that same table.
            const by = declared.match(/^ref → by (.+?)(?: in (.+))?$/);
            if (by) {
              if (fm === frontmatter || headingTables.has(fm)) {
                fail(`${path}: ${row[0]} is "${declared}"; a reference whose type is read from its row is a column, never a frontmatter field or a heading`);
                continue;
              }
              for (const name of [by[1], by[2]].filter(Boolean)) {
                const named = fm.rows.find((r) => (r[0] ?? "").replace(/`/g, "").trim() === name.trim());
                if (!named || (named[2] ?? "").replace(/`/g, "").trim() !== "string")
                  fail(`${path}: ${row[0]} is "${declared}", and \`${name.trim()}\` is not a string column of the same table (R9)`);
              }
              // A name with no type cannot resolve, so the type column is required wherever the
              // reference is.
              const typeRow = fm.rows.find((r) => (r[0] ?? "").replace(/`/g, "").trim() === by[1].trim());
              if (typeRow && (row[1] ?? "").replace(/`/g, "").trim() === "Yes" && (typeRow[1] ?? "").replace(/`/g, "").trim() !== "Yes")
                fail(`${path}: ${row[0]} is required and \`${by[1].trim()}\`, which names its type, is not (R9)`);
              continue;
            }
            if (/→ by /.test(declared)) {
              fail(`${path}: ${row[0]} is "${declared}"; \`ref → by <Column>\` and \`ref → by <Column> in <Owner>\` are the forms (R9)`);
              continue;
            }
```

- [ ] **Step 4: Run the tests and the script**

Run: `node --test verify/check-script.test.mjs && node verify/check.mjs`
Expected: all PASS, and `verify/check.mjs` exits 0 on the unmodified tree.

- [ ] **Step 5: Commit**

```bash
git add verify/check.mjs verify/check-script.test.mjs
git commit -F - <<'EOF'
The vocabulary admits a reference typed by its row in column tables

R9's gate now reads `ref → by <Column> in <Owner>`: legal in a column table, refused in frontmatter and in a heading table, which have no row to read a type from, and held to naming string columns of its own table. The same form spelled with `ref?`, `array of` or `qualifier` is refused by name rather than read as a type called "by …".

Verified: node --test verify/check-script.test.mjs and node verify/check.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 4: The instance checks hold a row-typed cell

**Files:**
- Modify: `lib/checks.mjs` — the import from `./instance.mjs` (line 21), `TYPES` (add `question`), `refOf` (around line 406), and the R16 check `the instance is held to what the schemas declare` (around lines 740–890)
- Create: `verify/ref-by.test.mjs`
- Modify: `package.json` — add `verify/ref-by.test.mjs` to `test:instance-checks`

**Interfaces:**
- Consumes: `declarationOf` from Task 1.
- Produces: `checkInstance(files, { core, model }).failures` entries containing the phrases asserted below. `TYPES` gains `{ type: "question", folder: "questions" }`.

- [ ] **Step 1: Write the failing tests** — create `verify/ref-by.test.mjs`:

```js
// A reference whose type is read from its row (R9), held by the instance checks cell by cell:
// the type cell names a declared type, an owned type names its owner and an unowned one does
// not, and the name resolves within that owner. Fixture maps as declared-joins.test.mjs has
// them; the question type is used because a schema must be of a type the checks list, and no
// check names it.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance } from "../lib/checks.mjs";

const head = (type, owner, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []), "## File Location", "", `\`${location}\``, ""];
const bare = (type, owner, location) => [...head(type, owner, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const QUESTION_SCHEMA = [...head("question", null, "model/questions/*.md"), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Rests on` | No | Table. One row per entity. |", "",
  "`## Rests on` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Type` | Yes | string | The type. |",
  "| `Entity` | Yes | ref → by Type in Owner | The entity. |",
  "| `Owner` | No | string | The owner, where the type is owned. |",
  "| `For` | No | string | What it carries. |", ""].join("\n");

const question = (rows) => ["# Who splits the billing domain?", "", "> Look at the period.", "",
  ...(rows ? ["## Rests on", "", "| Type | Entity | Owner | For |", "| --- | --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`), ""] : [])].join("\n");

const tree = (rows) => new Map([
  ["meta/core/question-schema.md", QUESTION_SCHEMA],
  ["meta/core/value-schema.md", bare("value", null, "model/values/*.md")],
  ["meta/core/profile-schema.md", bare("profile", null, "model/profiles/<profile>/<profile>.md")],
  ["meta/core/experience-schema.md", bare("experience", "profile", "model/profiles/<profile>/experiences/*.md")],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/profiles/mira-halvorsen/mira-halvorsen.md", "# Mira Halvorsen\n\n> Engineer.\n"],
  ["model/profiles/mira-halvorsen/experiences/2022-beacon.md", "# Splitting the billing domain\n\n> A period.\n"],
  ["model/profiles/tomas-reyes/tomas-reyes.md", "# Tomas Reyes\n\n> Designer.\n"],
  ["model/questions/who-splits-the-billing-domain.md", question(rows)],
]);
const about = (rows, ...words) =>
  checkInstance(tree(rows), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("questions/who-splits-the-billing-domain.md") && words.every((w) => f.includes(w)));
const all = (rows) => about(rows);

test("rows that name a declared type, and an owner exactly where the type is owned, pass", () => {
  assert.deepEqual(all([["value", "Craftsmanship", "", "why"], ["`experience`", "Splitting the billing domain", "Mira Halvorsen", "the period"]]), []);
});

test("a question with no Rests on passes", () => {
  assert.deepEqual(all(null), []);
});

test("a type cell naming no declared type fails", () => {
  assert.equal(about([["valu", "Craftsmanship", "", ""]], "\"valu\"", "no schema").length, 1);
});

test("an unowned name that resolves to nothing fails", () => {
  assert.equal(about([["value", "Kindness", "", ""]], "\"Kindness\"", "names no value").length, 1);
});

test("an owned type with no owner fails, naming the owner type", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "", ""]], "which a profile owns").length, 1);
});

test("an unowned type with an owner fails", () => {
  assert.equal(about([["value", "Craftsmanship", "Mira Halvorsen", ""]], "nothing owns a value").length, 1);
});

test("an owner that names nothing fails", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "Ada Vance", ""]], "\"Ada Vance\"", "names no profile").length, 1);
});

test("an owned name is looked for only within the owner the row names", () => {
  assert.equal(about([["experience", "Splitting the billing domain", "Tomas Reyes", ""]], "names no experience of profile \"Tomas Reyes\"").length, 1);
});
```

In `package.json`, append ` verify/ref-by.test.mjs` to the `test:instance-checks` command.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/ref-by.test.mjs`
Expected: FAIL. The question folder is unknown to `TYPES`, and cells are read as `ref → by Type in Owner`.

- [ ] **Step 3: Implement.**

In `lib/checks.mjs`, extend the import on line 21 with `declarationOf`, and add to `TYPES` after `concept`:

```js
  // A question points at entities of every type and owner and belongs to none, so it sits in
  // the container, as a concept does.
  { type: "question", folder: "questions" },
```

In `refOf`, read the new form first:

```js
  const refOf = (declared) => {
    const by = declarationOf(declared);
    if (by?.by) return { optional: false, target: null, draws: true, by: by.by, in: by.in };
    const m = declared.match(/^(array of )?ref(\?)? → (.+)$/);
```

In the R16 check's `run()`, make `held` step aside for it (`if (!ref || ref.by) return;` in place of `if (!ref) return;`), and add beside `held`:

```js
      // `ref → by <Column> in <Owner>` (R4, R9): the row names the type, and where that type is
      // owned, the owner. Held here and not in `held`, which reads its type off the declaration.
      const h1 = (rel) => read(rel)?.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;
      const heldBy = (child, section, column, ref, cellOf, value) => {
        const where = `\`${column}\` in "## ${section}"`;
        const type = cellOf(ref.by), ownerName = ref.in ? cellOf(ref.in) : "";
        if (!type) return;
        const t = TYPES.find((x) => x.type === type);
        if (!t || read(`${core}/${type}-schema.md`) === null)
          return fail(`${child}: ${where} says "${value}" is a "${type}", and no schema in ${core}/ declares that type (R4)`);
        if (!t.owner) {
          if (ownerName) return fail(`${child}: ${where} names "${ownerName}" as the owner of ${type} "${value}", and nothing owns a ${type}; leave \`${ref.in}\` blank (R4)`);
          if (!typesByName.get(value)?.has(type)) fail(`${child}: ${where} says "${value}", which names no ${type} in ${EX}/ (R4)`);
          return;
        }
        if (!ownerName) return fail(`${child}: ${where} says "${value}" is a ${type}, which a ${t.owner} owns, and the row names no ${t.owner} (R4)`);
        const base = TYPES.find((x) => x.type === t.owner).folder.split("/")[0];
        const dir = (ls(`${EX}/${base}`) ?? []).find((d) => h1(`${EX}/${base}/${d}/${d}.md`) === ownerName);
        if (!dir) return fail(`${child}: ${where} names "${ownerName}" as its owner, which names no ${t.owner} in ${EX}/ (R4)`);
        const folder = `${EX}/${base}/${dir}/${t.folder.split("/").pop()}`;
        if (!(ls(folder) ?? []).some((f) => f.endsWith(".md") && h1(`${folder}/${f}`) === value))
          fail(`${child}: ${where} says "${value}", which names no ${type} of ${t.owner} "${ownerName}" (R4)`);
      };
```

In the row loop, just before the final `held(child, …, col.declared, cell);`:

```js
              const ref = refOf(col.declared);
              if (ref?.by) {
                const cellOf = (name) => (row[columns.findIndex((c) => c.name === name)] ?? "").replace(/`/g, "").trim();
                heldBy(child, section, col.name, ref, cellOf, cell.replace(/`/g, "").trim());
                return;
              }
```

Then list every other regex in `lib/checks.mjs` that reads a declared type with `→ (.+)`:

Run: `grep -n "→ (.+)" lib/checks.mjs`

For each hit (`targetOf`, `joinsOf`'s `pointsAt`, the owned-reference check near line 1063), confirm that a `by` declaration yields a target that matches no entry in `TYPES`, so it falls through harmlessly. Where one would treat `by Type in Owner` as a type and fail, return `null` for a string starting `ref → by `. Task 5's full run over `example/` is the proof.

- [ ] **Step 4: Run the instance-check tests**

Run: `npm run test:instance-checks && node --test verify/rule-citations.test.mjs`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/checks.mjs verify/ref-by.test.mjs package.json
git commit -F - <<'EOF'
The instance checks hold a reference typed by its row

A `by` cell is held to the type its row names and, where that type is owned, to the owner its row names, so a question's rows are checked the way every other reference is. question joins the list of types the checks know; no check names it.

Verified: npm run test:instance-checks and node --test verify/rule-citations.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 5: Core ships the question type

**Files:**
- Create: `core/question-schema.md`
- Modify: `core/CONVENTIONS.md` — R4 (the paragraph ending "that form is designed when it is."), R9 (the closed-vocabulary sentence and a paragraph after the `ref?` paragraphs), R16 (a paragraph after the qualifier paragraph)
- Modify: `core/manifest.json`, `package.json` — a minor version each
- Create: `example/model/questions/how-do-i-find-out-why-a-line-is-on-my-invoice.md`, `example/model/questions/who-split-billing-out-of-the-monolith.md`, `example/model/questions/does-beacon-systems-publish-its-revenue.md` (R12: each filename is the slug of its H1)
- Modify: `example/model/README.md` — the type list and the tree
- Modify: `README.md` — wherever it lists the core types or schema files (`grep -n "concept-schema\|concept" README.md`)

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: the released shape the other repositories re-pin.

- [ ] **Step 1: Write `core/question-schema.md`** exactly as the spec's block under "The type", followed by `## Purpose` and `## Writing rules` sections whose text is the spec's Purpose paragraph (including its last sentence on what is mastered on the question) and its six writing-rule bullets. Each paragraph goes on one line.

- [ ] **Step 2: Edit `core/CONVENTIONS.md`.**

In R4, replace the sentence `Should a reference from outside ever be wanted, it names the owner as well, and that form is designed when it is.` with:

```markdown
A reference from outside every owner names the owner as well, in its own cell and never folded into the name: `ref → by <Column> in <Owner>` (R9), where the row's owner cell names an entity of the type R10 declares as owner, and the name is resolved within it.
```

In R9, change the vocabulary sentence to list the new forms:

```markdown
Required is `Yes` or `No`. Types come from the closed vocabulary: `string`, `number`, `date`, `image`, `array`, `enum`, `ref → <type>`, `ref? → <type>`, `array of ref → <type>`, `qualifier → <type>`, `ref → by <Column>` and `ref → by <Column> in <Owner>`. A reference names one entity, so the type it points at is singular: `ref → skill`, never `ref → skills`.
```

and add after the paragraph on `ref?` and `Required`:

```markdown
Some tables name entities of more than one type, as a question names whatever its answer rests on. `ref → by <Column>` is how a schema says so: each cell names an entity of the type the same row's `<Column>` cell names, written as the type's schema file is named without `-schema.md`. Where that type may be owned, `ref → by <Column> in <Owner>` reads the owner from the row's `<Owner>` cell, filled exactly where the type is owned (R4, R10). The form is a column's only, because a frontmatter field and a heading have no row to read a type from, and the columns it names are `string` columns of the same table, whose names do not contain the word `in`.
```

In R16, after the paragraph beginning "The difference between a reference and a qualifier", add:

```markdown
A column typed `ref → by <Column>` draws one edge per row, as a `ref → <type>` column does, on the type its row names and within the owner its row names; the type and owner cells draw nothing and reach the edge as its attributes. A type cell naming no type a schema declares, an owned type with no owner, and an unowned type with one are each R4.
```

- [ ] **Step 3: Add the example questions.** Every H1 must be unique, every filename the R12 slug of its H1, and every name must resolve in `example/model/`. Check the exact H1s with `grep -m1 '^# ' example/model/features/charge-explanation.md example/model/profiles/mira-halvorsen/experiences/*.md`.

`example/model/questions/how-do-i-find-out-why-a-line-is-on-my-invoice.md`:

```markdown
---
source: Local
---

# How do I find out why a line is on my invoice?

> The charge explanation shows where each line comes from, and the pricing rules say what it costs.

## Rests on

| Type | Entity | Owner | For |
| --- | --- | --- | --- |
| feature | Charge explanation | | where a line comes from |
| feature | Pricing rules | | what it costs |
```

`example/model/questions/who-split-billing-out-of-the-monolith.md`:

```markdown
---
source: Local
---

# Who split billing out of the monolith?

> The period in which the billing domain was split is Mira Halvorsen's, and it says what was done.

## Rests on

| Type | Entity | Owner | For |
| --- | --- | --- | --- |
| experience | Splitting the billing domain | Mira Halvorsen | the period |
```

`example/model/questions/does-beacon-systems-publish-its-revenue.md` (it rests on nothing, so it is mastered here):

```markdown
---
source: Local
---

# Does Beacon Systems publish its revenue?

> No. The model makes no claim about revenue, and none is published.
```

Update `example/model/README.md`: add `question` to the type list after `concept`, and add a tree line `questions/                       how-do-i-find-out-why-a-line-is-on-my-invoice.md, who-split-billing-out-of-the-monolith.md, does-beacon-systems-publish-its-revenue.md` (wrap the line at the column the tree's other entries wrap at).

- [ ] **Step 4: Bump the versions.** In `core/manifest.json`, move `version` by a minor and keep `"shape": 3`. In `package.json`, move `version` by a minor. Read both files and write the next minor of what they say. Don't copy numbers from this plan.

- [ ] **Step 5: Run everything**

Run:

```bash
export PATH=/opt/homebrew/bin:$PATH
node verify/check.mjs && node --test verify/ && sh conventions/conventions-format && sh conventions/conventions-check
```

Expected: every command exits 0. In particular, `verify/check.mjs` reports no failure under `example/model/questions/`. If one appears, it's a regex from Task 4's grep that still reads `ref → by …` as a type: fix it there, add a case to `verify/ref-by.test.mjs` for it, and re-run.

- [ ] **Step 6: Commit**

```bash
git add core example README.md package.json
git commit -F - <<'EOF'
Core has a question, and a reference may name its owner

A visitor asks in their own words and the model is written in the company's, so core gains question: the question as asked, a short answer that routes, and an optional Rests on table naming the entities the answer comes from. R4's owner form is designed, R9 lists the two new forms and R16 says what they draw. The example carries three questions, one resting on unowned entities, one on an experience within its owner and one on nothing.

Verified: node verify/check.mjs, node --test verify/, sh conventions/conventions-format and sh conventions/conventions-check all exit 0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 6: Open the pull request and stop

**Files:** none.

- [ ] **Step 1: Read the register.** Run `gh pr list --state merged --limit 2 --json number` and `gh pr view <N> --json body` for both. The body copies their register: prose paragraphs, no headings, no bullets, no checkboxes.

- [ ] **Step 2: Push and open.**

```bash
export PATH=/opt/homebrew/bin:$PATH
git -c credential.helper='!gh auth git-credential' push -u origin a-question-rests-on-the-model
gh pr create --title "A question rests on the model" --body-file <body.md>
```

Write the body in the register:
- first paragraph: the gap (a visitor's words against the model's words);
- second paragraph: what changed (the type, the two reference forms, the R4 owner form, the checker and parser, the three example questions);
- third paragraph: what it costs downstream, and that consumers re-pin before any instance carries a question because an older parser throws on a question row;
- then the line `Release notes to write at tagging: …`, a one-sentence `Verified:` line naming the commands actually run, and `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 3: Check the body and CI, and stop.** Run `gh pr view --json body` to confirm the body reads as written, and `gh pr checks` until the checks finish. Report the PR's address and the result of its checks. Don't merge: a merge needs Rob's explicit go.
