# Open positions, staff units and the order of groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The organization pack can say that a position is open, that a unit or a person serves a head from beside it, and in which order a company presents its units.

**Architecture:** Three schema changes in `packs/organization/` (an `## Openings` table and a `rank` field on `group`, a `staff` field on `group-kind`, a `Staff` token for `Place`), one new generic check form in `lib/checks.mjs` (`inherits`, stated on the `group` row of `PACKS.organization`), one generic gap closed (a `number` column's cells are digits), and `example/` showing each. No core schema changes; the existing rank check reaches `group` through the field's name.

**Tech Stack:** Node.js ES modules with JSDoc types (declarations built into `types/` by `npm run build`), `node:test`, Markdown schemas.

**Spec:** `docs/superpowers/specs/2026-10-09-open-positions-staff-and-order-design.md`

## Global Constraints

- Work in the worktree `/Users/rob/git/companygraph/meta-model-openings-staff-order`, branch `openings-staff-order`. Before Task 1, bring it up to date: `git fetch -q origin && git merge --no-ff origin/main` (the branch is pushed, so merge, never rebase), and amend that merge commit's author to `Implementer <implementer@companygraph.io>` before anything is pushed.
- Before any node or npm command: `export PATH="/opt/homebrew/bin:$PATH"`; run `npm ci` once if `node_modules` is missing.
- Every commit is authored `Implementer <implementer@companygraph.io>` (`git commit --author "Implementer <implementer@companygraph.io>"`), in the git register of `conventions/WRITING.md`: a plain subject, a why-first body, a `Verified:` line, then the trailers `Process: Delivery`, `Phase: Implement`, `Track: Code`, `Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>`. Never bypass the commit hook.
- A check never names a type or a kind: it reads what the type's row in `PACKS` states and what the schemas declare.
- A type change is made in the JSDoc and built with `npm run build`; a file in `types/` is never edited by hand, and `npm run build:check` passes.
- Schemas keep the fixed shape `verify` holds (same columns, same type vocabulary, same word for required); `npm run verify` passes.
- Nothing breaks an instance: every new field, column and section is optional, and `Place` only gains a token.
- No pack or core version moves in this plan; the release is a step of its own.
- `Place` tokens, written everywhere they appear: `Lead`, `Deputy`, `Member` or `Staff`.
- `staff` tokens: `yes` or `no`; blank is `no`.
- `## Openings` columns, in this order: `Job`, `Place`, `Count`, `Since`.

## Review Focus

- A group of a kind outside the line whose kind also says `staff: yes`, writing a `part-of`: the existing `within` check refuses it once, and the new check stays silent. Test in Task 2.
- A group under a staff unit whose own kind resolves to nothing: R4 alone, the new check stays silent. Test in Task 2.
- An `## Openings` table on a team outside the line: it passes; openings are not a line fact. Test in Task 1.
- A `Count` written as a word (`two`): it fails as R16's written form of a number, once. Test in Task 1.
- A group with no `rank` beside ranked groups passes, and two groups sharing a rank fail once. Test in Task 3.

---

### Task 1: Open positions, an `## Openings` table on a group

**Files:**
- Modify: `packs/organization/group-schema.md` (Sections table, a new column table, Purpose, Writing rules; `Place` in `## People` gains `Staff`)
- Modify: `lib/checks.mjs` (the per-cell table check, around lines 1330–1352: a `number` cell is digits)
- Test: `verify/organization.test.mjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: the `## Openings` section and the `Staff` token in `## People`'s `Place`, which Tasks 2 and 4 rely on.

- [ ] **Step 1: Write the failing tests**

Append to `verify/organization.test.mjs`:

```js
// ## Openings: what a group is looking for, one row per job and place.
const openings = (rows) => `\n## Openings\n\n| Job | Place | Count | Since |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const withOpenings = (path, rows) => (m) => m.set(path, m.get(path) + openings(rows));

test("a group with an opening passes, its job drawn as an edge", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Member", "2", "2026-11-01"]]))), []);
});

test("an opening with a blank Count and Since passes", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Designer", "Member", "", ""]]))), []);
});

test("an open Lead beside a held Lead passes, as a succession", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Lead", "", "2027-01-01"]]))), []);
});

test("an opening on a team outside the line passes", () => {
  assert.deepEqual(failures(tree(withOpenings(TEAM, [["Designer", "Member", "1", ""]]))), []);
});

test("an opening naming no job fails as R4 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Ghost", "Member", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Ghost.*\(R4\)/);
});

test("an opening naming a seat, which is not a job, fails as R4 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Reviewer", "Member", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Reviewer.*\(R4\)/);
});

test("an opening whose Place is outside the tokens fails as R8 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Boss", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Boss.*\(R8\)/);
});

test("an opening with a blank Place fails as the required column alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "", "", ""]])));
  assert.deepEqual(f, [`${G}/engineering.md: a "## Openings" row has no Place — one of \`Lead\`, \`Deputy\`, \`Member\`, \`Staff\``]);
});

test("a Count written as a word fails once, as R16's written form of a number", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Member", "two", ""]])));
  assert.deepEqual(f, [`${G}/engineering.md: \`Count\` in "## Openings" is declared \`number\` and says "two"; R16 wants it written as digits`]);
});

test("a Staff place in a People row passes for a human", () => {
  const f = failures(tree((m) => edit(TEAM, "| Jon | Designer | Member |", "| Jon | Designer | Staff |")(m)));
  assert.deepEqual(f, []);
});
```

In the existing test "a People row with a blank Place fails as the required column alone", the expected message gains the new token. Change its last line to:

```js
  assert.equal(f[0], `${TEAM}: a "## People" row has no Place — one of \`Lead\`, \`Deputy\`, \`Member\`, \`Staff\``);
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/organization.test.mjs`
Expected: FAIL. The opening tests fail with `"## Openings"` not declared (an undeclared section, or no edge drawn, depending on how the section check reports it), the Staff tests with an R8 finding for `Staff`, and the Count test because no check holds a `number` cell.

- [ ] **Step 3: Change the schema**

In `packs/organization/group-schema.md`:

In the `## Sections` table, after the `## People` row, add:

```markdown
| `## Openings` | No | Table. The positions the group is looking to fill, one row per job and place; its columns are declared below. |
```

Change the `Place` row of `## People`'s column table to:

```markdown
| `Place` | Yes | enum | `Lead`, `Deputy`, `Member` or `Staff`. The person's place in the group: the one who leads it, one who stands in for the lead, one who sits in it, or one who serves its lead from beside them, as an assistant does. |
```

After `## People`'s column table and before `## References`'s, add:

```markdown
`## Openings` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Job` | Yes | ref → job | The job that is open, the H1 of a file in `jobs/` |
| `Place` | Yes | enum | `Lead`, `Deputy`, `Member` or `Staff`. The place in the group that is open, as in `## People`. An open `Lead` beside a `Lead` in `## People` is the search for a successor while the present lead stays. |
| `Count` | No | number | How many openings the row stands for. Blank is one. |
| `Since` | No | date | From when the position is to be filled |
```

In `## Purpose`, after the sentence that ends "a position is a job in a group, and a row, not a page.", add:

```markdown
A position that is open is a row of `## Openings` until someone fills it, and the person then takes a row of `## People` in the same change.
```

In `## Writing rules`, add:

```markdown
- A job and place appear in one row of `## Openings`; `Count` says how many, a whole number above zero.
```

- [ ] **Step 4: Hold a `number` cell to digits**

In `lib/checks.mjs`, in the per-cell loop of the table check (the `columns.forEach((col, n) => {` block after `const cell = (row[n] ?? "").trim();`), after the blank-cell `if (!cell) { … return; }` block and before `if (col.declared === "enum") {`, add:

```js
              // A number is digits in a table as in frontmatter: R16 makes `number` a statement
              // about the written form, wherever the value is written.
              if (col.declared === "number") {
                if (!/^-?\d+$/.test(cell))
                  fail(`${child}: \`${col.name}\` in "## ${section}" is declared \`number\` and says "${cell}"; R16 wants it written as digits`);
                return;
              }
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `node --test verify/organization.test.mjs`
Expected: PASS, every test.

- [ ] **Step 6: Run the whole suite as CI does**

Run: `npm run build:check && npm run verify && for s in $(node -e "console.log(Object.keys(require('./package.json').scripts).filter(k=>k.startsWith('test:')).join(' '))"); do npm run -s $s || echo "FAIL $s"; done; sh conventions/conventions-format; sh conventions/conventions-check`
Expected: every command exits 0 and no `FAIL` line. If a test elsewhere asserts the old three-token `Place` message, update its expected string to the four tokens.

- [ ] **Step 7: Commit**

```bash
git add packs/organization/group-schema.md lib/checks.mjs verify/organization.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Subject: `A group says which positions it is looking to fill`. Body: why first (an org chart could not show an open position; a row needs a person), then the `## Openings` table, the `Staff` token, and that a `number` cell is now held to digits as a frontmatter number is.

---

### Task 2: Staff units and the check that only staff hangs below staff

**Files:**
- Modify: `packs/organization/group-kind-schema.md` (Frontmatter, Purpose, Writing rules)
- Modify: `lib/checks.mjs` (the `TypeEntry` JSDoc near line 55, the `group` row of `PACKS.organization` near line 245, and a new check after "a field that runs inside a set runs only from and to what is in it", near line 2948)
- Modify: `types/lib/checks.d.mts` (written by `npm run build`, never by hand)
- Test: `verify/organization.test.mjs`

**Interfaces:**
- Consumes: the `Staff` token from Task 1.
- Produces: `TypeEntry.inherits: { field: string, via: string, carries: string, is: string }`, read by the new check named `what a field names passes on what its kind carries`.

- [ ] **Step 1: Write the failing tests**

In `verify/organization.test.mjs`, change the `kind` helper so a kind can carry `staff`:

```js
const kind = (name, inLine, staff) => page(`in-line: ${inLine}\n${staff ? `staff: ${staff}\n` : ""}`, `# ${name}\n\n> A kind of group.\n\n## What it means\n\nWhich groups are of this kind.\n`);
```

Append:

```js
// A staff unit stays in the line; what hangs below it is staff too.
const withLegal = (m) => m
  .set("model/group-kinds/staff-unit.md", kind("Staff Unit", "yes", "yes"))
  .set(`${G}/legal.md`, group({ kind: "Staff Unit", partOf: "Management", body: "# Legal\n\n> Advises the top on the law.\n" }));
const below = (name, k) => (m) => m.set(`${G}/${name.toLowerCase()}.md`, group({ kind: k, partOf: "Legal", body: `# ${name}\n\n> Works below Legal.\n` }));

test("a staff unit under the top passes", () => {
  assert.deepEqual(failures(tree(withLegal)), []);
});

test("a staff unit under a staff unit passes", () => {
  assert.deepEqual(failures(tree((m) => below("Compliance", "Staff Unit")(withLegal(m)))), []);
});

test("a department under a staff unit fails once, at the page", () => {
  const f = failures(tree((m) => below("Sales", "Department")(withLegal(m))));
  assert.deepEqual(f, [`${G}/sales.md: \`part-of\` names "Legal", whose \`kind\` carries \`staff: yes\`, and this page's \`kind\` does not (R16)`]);
});

test("a kind with staff: no is not staff, and a department under its group passes", () => {
  const f = failures(tree((m) => below("Sales", "Department")(withLegal(m).set("model/group-kinds/staff-unit.md", kind("Staff Unit", "yes", "no")))));
  assert.deepEqual(f, []);
});

test("a staff value that is neither yes nor no fails as R8 alone, at the kind", () => {
  const f = failures(tree((m) => withLegal(m).set("model/group-kinds/staff-unit.md", kind("Staff Unit", "yes", "maybe"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /staff-unit\.md.*maybe/);
});

test("a group under a staff unit whose own kind resolves to nothing fails as R4 alone", () => {
  const f = failures(tree((m) => below("Sales", "Ghost Kind")(withLegal(m))));
  assert.ok(f.every((x) => !x.includes("carries `staff: yes`")), f.join("\n"));
  assert.ok(f.some((x) => x.includes("sales.md") && x.includes("Ghost Kind")), f.join("\n"));
});

test("a team whose kind says staff but stands outside the line, writing a part-of, fails once, as the line's", () => {
  const f = failures(tree((m) => m
    .set("model/group-kinds/team.md", kind("Team", "no", "yes"))
    .set(TEAM, m.get(TEAM).replace("kind: Team\n", "kind: Team\npart-of: Management\n"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*`part-of` is written on a page whose `kind` does not carry `in-line: yes`/);
});

test("an agent with a Staff place in a department fails once, as the line's", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, ANA, "| Bot | Designer | Staff |")(withBot(m))));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" row "Bot" names a profile that does not carry \`nature: human\`, in a group whose \`kind\` carries \`in-line: yes\` (R16)`]);
});
```

The agent test uses `withBot`, defined further down the file; place these tests after the `withBot` definition.

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/organization.test.mjs`
Expected: FAIL. `staff` is no declared field, so each kind carrying it fails as an undeclared field, and "a department under a staff unit" finds no failure of its own.

- [ ] **Step 3: Declare `staff` on the kind**

In `packs/organization/group-kind-schema.md`, add to the Frontmatter table after `in-line`:

```markdown
| `staff` | No | enum | `yes` or `no`. Whether a group of this kind serves the head of the group its `part-of` names, from beside it rather than below it, as a legal department serves the managing director. Blank is `no`. |
```

In `## Purpose`, after the paragraph's last sentence, add:

```markdown
A staff unit is in the line all the same: its people have it as their unit and its lead answers up through its `part-of`, and only how a chart draws it, beside the head it serves, and what may hang below it, only staff, set it apart.
```

In `## Writing rules`, add:

```markdown
- `staff` is `yes` only on a kind whose `in-line` is `yes`, since staff outside the line serves no head in it.
```

- [ ] **Step 4: Add the check form**

In `lib/checks.mjs`, add to the `TypeEntry` typedef, after the `within` property:

```js
 * @property {{ field: string, via: string, carries: string, is: string }} [inherits] A field naming an entity of the page's own type whose `via` entity carries `carries: is`, written only on a page whose own `via` entity carries it too; a blank `carries` is not `is`.
```

In `PACKS.organization`, on the `group` row, after the `within` line, add:

```js
      inherits: { field: "part-of", via: "kind", carries: "staff", is: "yes" },
```

and extend the comment above the row with one sentence:

```js
    // A staff unit commands nothing outside itself, so what hangs below one is staff too.
```

After the check named `"a field that runs inside a set runs only from and to what is in it"`, add:

```js
  {
    // What a page's field names passes on what its `via` entity carries: a group whose `part-of`
    // names a group of a staff kind is of a staff kind itself, since a staff unit commands
    // nothing outside itself. Only `is` passes on; a blank or another token does not. A `via`
    // that resolves to nothing is R4's, and a value off the field's tokens R8's, so neither is
    // judged here. Stated on the type's row; no type is named.
    name: "what a field names passes on what its kind carries",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.inherits) continue;
        const { field, via, carries, is } = t.inherits;
        const target = refTargetOf(t.type, field);
        const holder = refTargetOf(t.type, via);
        if (!target || !holder) continue;
        // `true` where the page's `via` entity carries `carries: is`, `false` where it resolves
        // and carries anything else, and `null` where it resolves to nothing.
        /** @param {string} path @param {string} text @returns {boolean | null} */
        const carriesIt = (path, text) => {
          const value = fmScalar(frontmatterOf(text), via);
          const found = value ? entityNamed(path, t.type, holder, value) : null;
          return found ? fmScalar(frontmatterOf(found.text), carries) === is : null;
        };
        for (const { path, text } of pagesOf(t.type)) {
          const value = fmScalar(frontmatterOf(text), field);
          if (!value) continue;
          const found = entityNamed(path, t.type, target, value);
          if (!found || carriesIt(found.path, found.text) !== true) continue;
          if (carriesIt(path, text) === false)
            fail(`${path}: \`${field}\` names "${value}", whose \`${via}\` carries \`${carries}: ${is}\`, and this page's \`${via}\` does not (R16)`);
        }
      }
    },
  },
```

- [ ] **Step 5: Build the declarations**

Run: `npm run build && npm run build:check`
Expected: `types/lib/checks.d.mts` gains the `inherits` property; `build:check` exits 0.

- [ ] **Step 6: Run the tests to see them pass**

Run: `node --test verify/organization.test.mjs`
Expected: PASS, every test.

- [ ] **Step 7: Run the whole suite as CI does**

Run the command of Task 1, Step 6.
Expected: every command exits 0 and no `FAIL` line.

- [ ] **Step 8: Commit**

```bash
git add packs/organization/group-kind-schema.md lib/checks.mjs types/lib/checks.d.mts verify/organization.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Subject: `A staff unit stands beside its head, and only staff hangs below it`. Body: why first (Gabler's and SAP's staff serves a head from beside it and commands nothing outside itself), then the `staff` field, the `inherits` form and its check, and that a staff unit stays in the line so no line check changes.

---

### Task 3: The order of groups, a `rank`

**Files:**
- Modify: `packs/organization/group-schema.md` (Frontmatter, Writing rules)
- Test: `verify/organization.test.mjs`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `rank` on `group`, which Task 4's example writes.

- [ ] **Step 1: Write the failing tests**

Append to `verify/organization.test.mjs`:

```js
// rank: the company's own order of its groups, unique across them all (R9).
const ranked = (path, n) => (m) => m.set(path, m.get(path).replace("kind: ", `rank: ${n}\nkind: `));

test("ranked groups beside unranked ones pass", () => {
  assert.deepEqual(failures(tree((m) => ranked(`${G}/management.md`, 10)(ranked(`${G}/engineering.md`, 20)(m)))), []);
});

test("two groups sharing a rank fail once, naming both", () => {
  const f = failures(tree((m) => ranked(`${G}/management.md`, 20)(ranked(`${G}/engineering.md`, 20)(m))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /two group entities share rank 20: .*"Engineering".*"Management"|two group entities share rank 20: .*"Management".*"Engineering"/);
});

test("a rank written as a word fails once", () => {
  const f = failures(tree(ranked(`${G}/engineering.md`, "twenty")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*`rank` is declared `number` and says "twenty"/);
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `node --test verify/organization.test.mjs`
Expected: FAIL. `rank` is no declared field of `group`, so each ranked page fails as an undeclared field.

- [ ] **Step 3: Declare `rank` on the group**

In `packs/organization/group-schema.md`, add to the Frontmatter table after `kind`:

```markdown
| `rank` | No | number | The group's place in the company's own order of its groups, spaced in tens. Unique across all groups (R9). Absent where the company does not order its groups, and a chart then sorts them by name. |
```

In `## Writing rules`, add:

```markdown
- A company that ranks its groups numbers them in a walk down the tree: a parent before its children, siblings in the order the company presents them.
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test verify/organization.test.mjs`
Expected: PASS. The existing rank check, "two entities of a ranked type do not share a rank", holds `group` the moment its schema declares the field.

- [ ] **Step 5: Run the whole suite as CI does**

Run the command of Task 1, Step 6.
Expected: every command exits 0 and no `FAIL` line.

- [ ] **Step 6: Commit**

```bash
git add packs/organization/group-schema.md verify/organization.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Subject: `A group can carry its place in the company's order`. Body: why first (a chart drawn from the model can only sort by name), then the optional `rank`, unique across all groups as R9 has it, held by the existing check.

---

### Task 4: The example shows each, and the pack's prose says so

**Files:**
- Create: `example/model/group-kinds/staff-unit.md`
- Create: `example/model/groups/legal.md`
- Create: `example/model/jobs/legal-counsel.md`
- Create: `example/model/jobs/executive-assistant.md`
- Modify: `example/model/groups/management.md`, `engineering.md`, `product.md`, `billing-run-team.md`
- Modify: `packs/organization/README.md`
- Modify: `README.md` (the `## Packs` paragraph)

**Interfaces:**
- Consumes: `## Openings` (Task 1), `staff` and `Staff` (Task 2), `rank` (Task 3).
- Produces: nothing other tasks read.

- [ ] **Step 1: Write the new example pages**

Read `example/model/jobs/backend-engineer.md` and `example/model/group-kinds/department.md` first and write each new page in the same shape. Every new page takes a fresh id: `node -e "import('./lib/ids.mjs').then((m) => console.log(m.uuidv7()))"`, one call per page.

`example/model/group-kinds/staff-unit.md`:

```markdown
---
id: <fresh uuidv7>
source: Local
in-line: yes
staff: yes
---

# Staff Unit

> A unit that serves a head from beside it, preparing and checking what the head decides, and commands nothing outside itself.

## What it means

A staff unit advises the head of the unit it is attached to, as Legal advises Beacon's managing director, and its people have it as their unit. A department that runs a part of the business is not one.
```

`example/model/jobs/legal-counsel.md` and `example/model/jobs/executive-assistant.md`: a job each, in the shape of `backend-engineer.md`, with a tagline saying what the person is employed as, and `## Responsibilities` with two or three items true to the job at a billing company. Neither names a seat.

`example/model/groups/legal.md`:

```markdown
---
id: <fresh uuidv7>
source: Local
rank: 15
kind: Staff Unit
part-of: Management
---

# Legal

> Advises Beacon's managing director on the law the billing platform is held to, from contracts to invoicing rules.

## Responsibilities

- Reviews every customer contract before it is signed.
- Keeps the invoice format within the invoicing rules of each country Beacon bills in.

## Openings

| Job | Place | Count | Since |
| --- | --- | --- | --- |
| Legal Counsel | Lead | | 2026-12-01 |
```

- [ ] **Step 2: Edit the example groups**

- `management.md`: add `rank: 10` to the frontmatter, and at the end of the page:

```markdown

## Openings

| Job | Place | Count | Since |
| --- | --- | --- | --- |
| Executive Assistant | Staff | | |
```

- `engineering.md`: add `rank: 20`, and after `## People`:

```markdown

## Openings

| Job | Place | Count | Since |
| --- | --- | --- | --- |
| Backend Engineer | Member | 2 | 2026-11-01 |
```

- `product.md`: add `rank: 30`, and after `## People` an opening for Tomas Reyes's successor:

```markdown

## Openings

| Job | Place | Count | Since |
| --- | --- | --- | --- |
| Head of Product | Lead | | 2027-01-01 |
```

- `billing-run-team.md`: add `rank: 90`.

Write `rank` directly after `source` in each frontmatter, as `legal.md` does.

- [ ] **Step 3: Check the example**

Run: `npm run verify`
Expected: exit 0. If a test elsewhere counts the example's groups, kinds or jobs, update its expected count to the example as it now stands and say so in the commit body.

- [ ] **Step 4: Update the pack's README**

In `packs/organization/README.md`:

- In the paragraph under the type table, add after its last sentence: `A group says which positions it is looking to fill in its `## Openings`, a staff unit is a group of a kind with `staff: yes` and stands in the line beside the head it serves, and a group's `rank` is its place in the company's own order.`
- In `## Sources`, add rows:

```markdown
| Gabler Wirtschaftslexikon, Stab | https://wirtschaftslexikon.gabler.de/definition/stab-45274 |
| Gabler Wirtschaftslexikon, Stab-Linienorganisation | https://wirtschaftslexikon.gabler.de/definition/stab-linienorganisation-45349 |
| SAP, Vacancy (infotype 1007) | https://help.sap.com/saphelp_em92/helpdata/en/4e/ebee1a11324e70e10000000a42189d/content.htm |
| SAP, Department/Staff (infotype 1003) | https://help.sap.com/saphelp_em92/helpdata/en/4e/ebef1a11394e6fe10000000a42189d/content.htm |
```

- In `## Where it departs from its sources`, add:

```markdown
- An open position is a row of `## Openings` while it is open, not a position object that outlives its holders as SAP's and Workday's do.
- The staff flag is on the group's kind, not on each unit as SAP sets it, and a staff person is one whose `Place` is `Staff`.
- Groups are ordered across the type, not among the children of one parent as SAP and Oracle order them.
```

- In `## Left for later`, remove "A position type, and with it a vacant position; staff units beside a line; " so the paragraph opens with "Edges from a group to KPIs and processes;", capitalized.

- [ ] **Step 5: Update the root README**

In `README.md`'s `## Packs` paragraph, after "its `guides` the professional one, which names jobs wherever the people who do them sit.", add: `A group also lists the positions it is looking to fill, a staff unit stands in the line beside the head it serves, and an optional `rank` orders the groups.`

- [ ] **Step 6: Run the whole suite as CI does**

Run the command of Task 1, Step 6.
Expected: every command exits 0 and no `FAIL` line.

- [ ] **Step 7: Commit**

```bash
git add example packs/organization/README.md README.md
git commit --author "Implementer <implementer@companygraph.io>"
```

Subject: `Beacon Systems shows its openings, its Legal and its order`. Body: why first (the example is what the site draws and what a reader copies), then what each page now shows.
