# A rule is asked of its subject — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `companygraph judge` leaves a writing rule out of a page's request when the rule opens by naming a section, or a column of a section's table, that the rule's schema declares and the page does not have, and the report counts those per rule.

**Architecture:** All of it lives in `lib/questions.mjs`, which stays pure. Two new exported readers, `subjectsOf` and `subjectOf`, read a schema's declared sections, table columns and frontmatter fields and tell which subject a rule opens with. `questionsOf` consults them per page and returns the rules it left out as `skipped` beside `asked` and `notAsked`. `reportOf` counts `skipped` on each rule's summary line. `bin/companygraph.mjs` and `tools/measure-judge.mjs` read only `asked` and need no change.

**Tech Stack:** Node 22 ESM, no runtime dependencies, `node --test`, JSDoc-typed `lib/` with committed declarations under `types/`.

**Spec:** `docs/superpowers/specs/2026-09-26-the-writing-rules-are-asked-design.md`, as amended for companygraph/meta-model#250 in the same pull request as this plan.

**Tried:** the code and tests below were run once in a scratch copy of `0b55ca9` before this plan was committed: `npm run verify`, `build:check` and every `test:*` script passed, the judge suite at 50 of 50.

## Global Constraints

- A rule names a subject only when its sentence opens with a backticked name. A name further into the sentence never counts.
- The subject is a section when the backticked name is `## <Heading>` and the schema's sections table declares `## <Heading>`. It is a column when the name is a column of a section's table the schema declares, and stands for every section whose table declares that column.
- A frontmatter field never counts, even where a column of the same name exists: the name is then read as the field, and the rule is asked.
- A rule whose opening name the schema does not declare is asked, as now.
- A page has a section subject when one of its `##` sections has that heading, and a column subject when one of the named sections is on the page and one of its tables has that column.
- A rule left out keeps its number: ids stay `r1`…`rn` in schema order whether asked or not.
- The questions still come from the schemas the instance vendored, never from this package's `core/`.
- `BAND`, `STATE_BUDGET`, the grouped choice, the measuring and `bin/judges/` do not change.
- No version bump, no tag and no release notes: the release is the owner's.
- American English (R14). Code comments follow the surrounding file: prose paragraphs saying why, no bullet lists. No numbers that move in prose: no count of rules or schemas in README or comments.
- Commits and PR bodies are prose in the git register: a subject under seventy characters with no type prefix, one to three paragraphs, then `Verified: …` naming what ran, then the trailers. Commits are authored `Implementer <implementer@companygraph.io>` with `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line naming the model that wrote the commit.
- Before any `node`, `npm` or `gh`: `export PATH="/opt/homebrew/bin:$PATH"`. Run `npm ci` once in the worktree before the first test.
- `tsconfig.json` checks `lib/` under `strict` and `exactOptionalPropertyTypes`. After any change there, `npm run typecheck` passes and `npm run build` rewrites `types/`; the rewritten files are committed in the same commit, and `npm run build:check` passes before each commit.

## Review Focus

- A column name declared in two sections' tables, as `What` is wherever a schema declares a References table beside another: a person expects the rule asked of a page that has either table with that column. Task 1 tests that `subjectOf` returns every declaring section; Task 2 tests the page with only one of them.
- A page that has the section but whose table lacks an optional column, as a concept's `## Relations` without `As`: a person expects the rule about `As` left out, since nothing on the page is what it is about. Task 2 tests it.
- A rule opening with a backticked name that matches both a frontmatter field and a column: a person expects it asked, because a field rule may judge an absent field. Task 1 tests it on a synthetic schema.
- A page every one of whose rules is left out and that has nothing grouped: a person expects it named under `not asked` with a reason that says so, not the old "its schema has no writing rules". Task 2 tests it on a synthetic schema.
- A pack's schema, read from `<units>/<pack>/`: a person expects its rules read the same way as core's. Task 1 sweeps every schema under `core/` and `packs/` and holds that no rule's subject is a frontmatter field.

---

### Task 1: The subject a rule opens with

**Files:**

- Modify: `lib/questions.mjs` (imports at the top; new readers after `purposeOf`)
- Modify: `types/lib/questions.d.mts` (rewritten by `npm run build`)
- Test: `verify/questions.test.mjs`

**Interfaces:**

- Consumes: `sectionsOf` and `blocksOf` from `lib/checks.mjs`, and `tableOf`, all already exported.
- Produces:
  - `export function subjectsOf(schemaText: string): Subjects`, where `Subjects` is `{ sections: Set<string>; columns: Map<string, string[]>; fields: Set<string> }`. `sections` holds headings without `## `, `columns` maps a column name to the headings of every section whose table declares it, `fields` holds frontmatter field names.
  - `export function subjectOf(rule: string, subjects: Subjects): Subject | null`, where `Subject` is `{ sections: string[]; column: string | null }`.
  - `@typedef` entries `Subjects` and `Subject` in the module's JSDoc block.

- [ ] **Step 1: Write the failing tests**

Add `subjectsOf, subjectOf` to the import from `../lib/questions.mjs`, and add after the test "a schema without writing rules gives none…":

```js
test("a rule's subject is the section or table column its opening names, never a field", () => {
  const rules = (n) => writingRulesOf(schema(n));
  const of = (n, i) => subjectOf(rules(n)[i - 1], subjectsOf(schema(n)));
  assert.deepEqual(of("experience", 14), { sections: ["Ending"], column: null });
  assert.deepEqual(of("concept", 4), { sections: ["Relations"], column: "As" });
  assert.equal(of("experience", 1), null, "`role` is a field, and r1 judges whether it is there");
  assert.equal(of("experience", 3), null, "a backticked name later in the sentence does not count");
  assert.equal(of("concept", 6), null, "a rule with no opening name is asked as now");
});

test("a column declared in two sections' tables stands for both", () => {
  const text = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `name` | Yes | string | Its name. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `## Sources` | No | Table. |\n| `## References` | No | Table. |\n\n`## Sources` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `What` | Yes | string | What it is. |\n\n`## References` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `What` | Yes | string | What it is. |\n| `name` | No | string | A name. |\n";
  const subjects = subjectsOf(text);
  assert.deepEqual(subjectOf("`What` names the kind of document.", subjects), { sections: ["Sources", "References"], column: "What" });
  assert.equal(subjectOf("`name` is the thing's own.", subjects), null, "a name that is a field as well as a column is read as the field");
  assert.equal(subjectOf("`## Missing` is written well.", subjects), null, "an opening name the schema does not declare is asked");
});

test("no writing rule in core or a pack opens with a subject that is also a frontmatter field", () => {
  const dirs = [new URL("../core/", import.meta.url), ...fs.readdirSync(new URL("../packs/", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => new URL(`../packs/${d.name}/`, import.meta.url))];
  for (const dir of dirs)
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("-schema.md"))) {
      const text = fs.readFileSync(new URL(f, dir), "utf8"), subjects = subjectsOf(text);
      for (const rule of writingRulesOf(text)) {
        const s = subjectOf(rule, subjects);
        if (s?.column) assert.ok(!subjects.fields.has(s.column), `${f}: "${rule.slice(0, 60)}"`);
      }
    }
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/questions.test.mjs` Expected: FAIL with `subjectsOf is not a function` (a SyntaxError on the import names, or a TypeError).

- [ ] **Step 3: Write the readers**

In `lib/questions.mjs`, change the first import to:

```js
import { sectionsOf, blocksOf, tableOf } from "./checks.mjs";
```

Add to the JSDoc typedef block at the top, after the `Questions` line (Task 2 changes that line):

```js
/**
 * @typedef {{ sections: Set<string>; columns: Map<string, string[]>; fields: Set<string> }} Subjects
 * @typedef {{ sections: string[]; column: string | null }} Subject
 */
```

Add after `purposeOf`:

```js
// What a schema declares that a rule can be about: its sections, by heading; each column of a
// section's table, with every section whose table declares it; and its frontmatter fields. A
// rule names one of the first two as its subject when its sentence opens with it in backticks,
// and a page without that subject gives the rule nothing to judge. A field is never a subject:
// a rule that opens with one, as the experience schema's first opens with `role`, may judge
// whether the field is there at all, so a page without the field is what that rule reads.
/**
 * @param {string} schemaText
 * @returns {Subjects}
 */
export function subjectsOf(schemaText) {
  /** @type {Set<string>} */
  const sections = new Set();
  /** @type {Set<string>} */
  const fields = new Set();
  /** @type {Map<string, string[]>} */
  const columns = new Map();
  const cell = (/** @type {string | undefined} */ c) => (c ?? "").replace(/`/g, "").trim();
  for (const b of blocksOf(sectionsOf(schemaText).get("Sections") ?? "")) {
    if (!b.table) continue;
    if (b.section) {
      for (const r of b.table.rows) {
        const name = cell(r[0]);
        if (name) columns.set(name, [...(columns.get(name) ?? []), b.section]);
      }
    } else if (!b.grouped) {
      for (const r of b.table.rows) {
        const m = (r[0] ?? "").trim().match(/^`##\s+(.+?)`$/);
        if (m?.[1]) sections.add(m[1].trim());
      }
    }
  }
  for (const r of tableOf(sectionsOf(schemaText).get("Frontmatter") ?? "")?.rows ?? []) {
    const name = cell(r[0]);
    if (name) fields.add(name);
  }
  return { sections, columns, fields };
}

/**
 * @param {string} rule
 * @param {Subjects} subjects
 * @returns {Subject | null}
 */
export function subjectOf(rule, subjects) {
  const name = rule.match(/^`([^`]+)`/)?.[1]?.trim();
  if (!name || subjects.fields.has(name)) return null;
  const heading = name.match(/^##\s+(.+)$/)?.[1]?.trim();
  if (heading) return subjects.sections.has(heading) ? { sections: [heading], column: null } : null;
  const within = subjects.columns.get(name);
  return within ? { sections: within, column: name } : null;
}
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/questions.test.mjs` Expected: PASS, every test. If the sweep test fails, the message names the schema and the rule: report it rather than editing core, since a core rule is not this plan's to change.

- [ ] **Step 5: Typecheck, build, commit**

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run typecheck && npm run build && npm run build:check
git add lib/questions.mjs types/lib/questions.d.mts verify/questions.test.mjs
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A rule's subject is read off its opening and its schema

subjectsOf reads what a schema declares that a rule can be about, its sections and each column of a section's table, and its frontmatter fields; subjectOf tells which of the first two a rule opens with in backticks. A field is never a subject, since a field rule may judge whether the field is there at all, and a name the schema does not declare names nothing.

Verified: node --test verify/questions.test.mjs passes, with every rule in core and the packs swept for a subject that is also a field; npm run typecheck and build:check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 2: A page is not asked a rule whose subject it lacks

**Files:**

- Modify: `lib/questions.mjs` (`Questions` typedef, a `Skipped` typedef, `questionsOf`)
- Modify: `types/lib/questions.d.mts` (rewritten by `npm run build`)
- Modify: `README.md` (the `judge [<folder>]` paragraph)
- Test: `verify/questions.test.mjs`

**Interfaces:**

- Consumes: `subjectsOf`, `subjectOf` and `Subject` from Task 1.
- Produces:
  - `Questions` becomes `{ asked: Request[]; notAsked: NotAsked[]; skipped: Skipped[] }`.
  - `Skipped` is `{ path: string; type: string; id: string; rule: string; without: string }`. `without` reads as the report prints it: ``without `## Ending` `` for a section, ``without an `As` column`` for a column.

- [ ] **Step 1: Write the failing tests and correct the one that asked every rule**

The example's Beacon entry has a References table and no `## Ending`; its Northwind entry has an `## Ending` and no References table. In `verify/questions.test.mjs`, replace the test "every page is asked every writing rule of its schema, verbatim, with the purpose and the page whole" with:

```js
const NORTHWIND = "profiles/mira-halvorsen/experiences/2018-northwind-atelier.md";

test("a page is asked every writing rule whose subject it has, verbatim, numbered as in its schema, with the purpose and the page whole", () => {
  const { asked } = questionsOf(example());
  const page = asked.find((r) => r.path === BEACON);
  const rules = writingRulesOf(schema("experience"));
  const ids = page.questions.filter((q) => q.kind === "rule").map((q) => q.id);
  assert.ok(!ids.includes("r14"), "Beacon has no `## Ending`");
  assert.ok(ids.includes("r12"), "Beacon has a References table with its `What` column");
  assert.deepEqual(page.questions.filter((q) => q.kind === "rule"), rules.map((rule, i) => ({ id: `r${i + 1}`, kind: "rule", rule })).filter((q) => q.id !== "r14"));
  assert.equal(page.state.entity, exampleFiles().get(BEACON));
  assert.equal(page.state.purpose, purposeOf(schema("experience")));
  assert.equal(page.type, "experience");
  assert.equal(page.name, "Splitting the billing domain");
});

test("a rule left out for want of its subject is named, with what the page lacks", () => {
  const { asked, skipped } = questionsOf(example());
  const ids = (p) => asked.find((r) => r.path === p).questions.map((q) => q.id);
  assert.ok(ids(NORTHWIND).includes("r14"), "Northwind has an `## Ending`");
  assert.ok(!ids(NORTHWIND).includes("r12"), "Northwind has no References table");
  assert.ok(ids(NORTHWIND).includes("r1") && ids(BEACON).includes("r1"), "a rule that opens with a field is asked either way");
  assert.deepEqual(skipped.find((s) => s.path === BEACON && s.id === "r14"),
    { path: BEACON, type: "experience", id: "r14", rule: writingRulesOf(schema("experience"))[13], without: "without `## Ending`" });
  assert.equal(skipped.find((s) => s.path === NORTHWIND && s.id === "r12")?.without, "without a `What` column");
});

test("a concept without a Relations table is not asked the rule about As, and one with it is", () => {
  const { asked, skipped } = questionsOf(example());
  const ids = (p) => asked.find((r) => r.path === p).questions.map((q) => q.id);
  assert.ok(ids("concepts/contract.md").includes("r4"));
  assert.ok(!ids("concepts/customer.md").includes("r4"));
  assert.equal(skipped.find((s) => s.path === "concepts/customer.md" && s.id === "r4")?.without, "without an `As` column");
});

test("a table without the optional column its rule is about leaves the rule unasked", () => {
  const files = exampleFiles(), schemas = coreSchemas();
  const text = files.get("concepts/contract.md")
    .replace("| Concept | Cardinality | As |\n| --- | --- | --- |", "| Concept | Cardinality |\n| --- | --- |")
    .replace(/^(\| [^|]+\| [^|]+\|) [^|]+\|$/gm, "$1");
  assert.ok(!text.includes("| As |") && text.includes("| Customer | one |\n"), text);
  files.set("concepts/contract.md", text);
  const { asked } = questionsOf({ graph: parseInstance(files, { schemas }), files, schemas });
  assert.ok(!asked.find((r) => r.path === "concepts/contract.md").questions.some((q) => q.id === "r4"));
});

test("a page whose every rule lacks its subject and that groups nothing is named, and says why", () => {
  const thing = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `id` | Yes | string | Its id. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Thing]` | Yes | Its name. |\n| `## Notes` | No | Prose. |\n\n## Writing rules\n\n- `## Notes` are written in full sentences.\n";
  const graph = { entities: [{ path: "things/a.md", type: "thing", name: "A", id: "x", owner: null, tagline: "", sections: [] }] };
  const { asked, notAsked, skipped } = questionsOf({ graph, files: new Map([["things/a.md", "# A\n"]]), schemas: new Map([["thing-schema.md", thing]]) });
  assert.deepEqual(asked, []);
  assert.deepEqual(notAsked, [{ path: "things/a.md", why: "it has nothing a writing rule of its schema is about, and nothing grouped" }]);
  assert.equal(skipped.length, 1);
});
```

The test "a table without the optional column…" rewrites the contract's Relations table without its `As` column and asserts the rewrite took before asking. The synthetic schema in the last test carries a Frontmatter table because `constraintsOf` refuses a schema without one.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/questions.test.mjs` Expected: FAIL. The rewritten first test fails because Beacon is still asked `r14`, and the others fail on `skipped` being undefined.

- [ ] **Step 3: Leave the rule out, and name it**

In the typedef block, change the `Questions` line and add `Skipped`:

```js
 * @typedef {{ path: string; type: string; id: string; rule: string; without: string }} Skipped
 * @typedef {{ asked: Request[]; notAsked: NotAsked[]; skipped: Skipped[] }} Questions
```

Add before `questionsOf`:

```js
// Whether a page has what a rule is about: the section, or a table in one of the sections that
// declare the column, with that column. What the report says the page is without.
/**
 * @param {Entity} e
 * @param {Subject} s
 */
const hasSubject = (e, s) =>
  e.sections.some((x) => s.sections.includes(x.heading) && (s.column === null || x.tables.some((t) => t.columns.some((c) => c.replace(/`/g, "").trim() === s.column))));
/** @param {Subject} s */
const without = (s) => (s.column === null ? `without \`## ${s.sections[0]}\`` : `without ${/^[aeiou]/i.test(s.column) ? "an" : "a"} \`${s.column}\` column`);
```

In `questionsOf`, declare `/** @type {Skipped[]} */ const skipped = [];` beside `notAsked`, and replace the two lines that build `questions` from the writing rules, the `/** @type {Question[]} */` annotation and the `writingRulesOf(schema).map(…)` under it, with the block below. Keep exactly one annotation, directly above `const questions`; leaving the old one above `const subjects` fails the typecheck.

```js
    const subjects = subjectsOf(schema);
    /** @type {Question[]} */
    const questions = [];
    let lacked = 0;
    writingRulesOf(schema).forEach((rule, i) => {
      const id = `r${i + 1}`, subject = subjectOf(rule, subjects);
      if (subject && !hasSubject(e, subject)) {
        skipped.push({ path: e.path, type: e.type, id, rule, without: without(subject) });
        lacked++;
      } else questions.push({ id, kind: /** @type {const} */ ("rule"), rule });
    });
```

Replace the `notAsked.push` for a page with no questions with:

```js
      notAsked.push({ path: e.path, why: lacked ? "it has nothing a writing rule of its schema is about, and nothing grouped" : "its schema has no writing rules and nothing grouped" });
```

and the return with `return { asked, notAsked, skipped };`. Update the comment above `questionsOf` to say a rule is left out of a page that lacks what it opens by naming, and keeps its number.

In `README.md`, in the paragraph that opens `` `judge [<folder>]` ``, after the sentence ending "…a choice among the entities its headings name.", add:

```
A rule that opens by naming a section, or a column of a section's table, is asked only of a page that has it, and the report counts the pages it was left out of.
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/questions.test.mjs verify/judge.test.mjs verify/judge-faults.test.mjs` Expected: PASS, every test. `verify/judge.test.mjs` drives the CLI against a fake service and must pass unchanged.

- [ ] **Step 5: Typecheck, build, commit**

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run typecheck && npm run build && npm run build:check
sh conventions/conventions-format && sh conventions/conventions-check
git add lib/questions.mjs types/lib/questions.d.mts verify/questions.test.mjs README.md
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
A page is not asked a rule about what it does not have

questionsOf leaves a writing rule out of a page's request when the rule opens by naming a section or a table column its schema declares and the page has none, and returns it under skipped with what the page is without; the rule keeps its number. An experience with no Ending is no longer asked how its Ending is written, and a concept with no Relations table is no longer asked about its As column. A page left with nothing to ask is named with that reason.

Verified: npm run test:judge passes; npm run typecheck and build:check pass; sh conventions/conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```

### Task 3: The report counts the pages a rule was left out of

**Files:**

- Modify: `lib/questions.mjs` (`reportOf` and its comment)
- Modify: `types/lib/questions.d.mts` (rewritten by `npm run build`, if the signature's types change)
- Test: `verify/questions.test.mjs`

**Interfaces:**

- Consumes: `Questions.skipped` and `Skipped` from Task 2.
- Produces: per-rule summary lines of the form `  experience r14: asked of 2, median 0.80, near even for 0; not asked of 3 without \`## Ending\`` and, for a rule asked of none, `  experience r14: asked of 0; not asked of 3 without \`## Ending\``. The " — cannot be judged as written; a finding against the schema" suffix stays last where it applies.

- [ ] **Step 1: Write the failing test**

Add after the test "measured, a verdict below the band is flagged and a rule near even for most pages cannot be judged". It reuses that file's `asked` and `answers` fixtures:

```js
test("a rule's summary counts the pages it was left out of, and a rule asked of none still has its line", () => {
  const skipped = [
    { path: "x.md", type: "experience", id: "r1", rule: "One.", without: "without `## Ending`" },
    { path: "y.md", type: "experience", id: "r9", rule: "Nine.", without: "without `## Ending`" },
    { path: "z.md", type: "experience", id: "r9", rule: "Nine.", without: "without `## Ending`" },
  ];
  const lines = reportOf({ ...asked, skipped }, answers, { band: { low: 0.4, high: 0.6, pick: 0.7 } });
  assert.match(lines.find((l) => /^ {2}experience r1:/.test(l)), /asked of 2, median 0\.\d\d, near even for 1; not asked of 1 without `## Ending`$/);
  assert.equal(lines.find((l) => /^ {2}experience r9:/.test(l)), "  experience r9: asked of 0; not asked of 2 without `## Ending`");
  assert.ok(!reportOf(asked, answers).some((l) => /not asked of/.test(l)), "a run that left nothing out says nothing of it");
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `node --test verify/questions.test.mjs` Expected: FAIL: the r1 line has no "not asked of" clause, and there is no r9 line.

- [ ] **Step 3: Count them on the rule's line**

Add to the typedef block at the top:

```js
 * @typedef {{ type: string; id: string; rule: string; ps: number[]; lacked: Map<string, number> }} Seen
```

In `reportOf`, change the destructuring to `{ asked, notAsked, skipped = [] }` and the map's annotation to `/** @type {Map<string, Seen>} */`. In the answer loop, annotate `seen` as `/** @type {Seen} */` and give the entry it creates `lacked: new Map()`; without the annotation `ps: []` is inferred as `never[]` and the typecheck fails. After that loop and before `lines.push("", "rules:")` add:

```js
  for (const s of skipped) {
    const key = `${s.type} ${s.id}`;
    /** @type {Seen} */
    const seen = rules.get(key) ?? { type: s.type, id: s.id, rule: s.rule, ps: [], lacked: new Map() };
    seen.lacked.set(s.without, (seen.lacked.get(s.without) ?? 0) + 1);
    rules.set(key, seen);
  }
```

Replace the body of the summary loop with:

```js
  for (const { type, id, ps, lacked } of byRule) {
    let line = `  ${type} ${id}: asked of ${ps.length}`;
    if (ps.length) line += `, median ${two(median(ps))}`;
    const near = band ? ps.filter((p) => p >= band.low && p <= band.high).length : 0;
    if (band && ps.length) line += `, near even for ${near}`;
    for (const [why, n] of lacked) line += `; not asked of ${n} ${why}`;
    if (band && ps.length && near * 2 > ps.length) line += " — cannot be judged as written; a finding against the schema";
    lines.push(line);
  }
```

Add one sentence to the comment above `reportOf`: a rule left out of pages that lack its subject is counted on its own line, so the near-even share is a share of the pages it was asked of.

- [ ] **Step 4: Run the tests to see them pass**

Run: `npm run test:judge` Expected: PASS, every test, the earlier report tests unchanged.

- [ ] **Step 5: Run the whole suite, typecheck, build, commit**

```bash
export PATH="/opt/homebrew/bin:$PATH"
npm run verify && for t in judge instance instance-checks instance-files form rules cli plan seats pins ids localization untar fetch-core obsidian; do npm run test:$t || exit 1; done
npm run typecheck && npm run build && npm run build:check
git add lib/questions.mjs types/lib/questions.d.mts verify/questions.test.mjs
git commit --author='Implementer <implementer@companygraph.io>' -F- <<'EOF'
The report counts the pages a rule was left out of

Each rule's summary line now says how many pages it was not asked of and what they lacked, and a rule asked of none still gets its line, so a reader sees that the Ending rule was left out rather than missing. The near-even share is read off the pages a rule was asked of, as the spec says.

Verified: npm run verify and every test:* script pass; npm run typecheck and build:check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote this commit>
EOF
git log -1 --format='[%s]'
```
