# A role is a seat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core's type `role` becomes `seat` wherever core and the packs declare it, experience's string field `role` becomes `capacity`, the parser's join kind `"roles"` becomes `"as"`, and `companygraph upgrade` migrates an instance's content across, so that after this branch no declaration of `role` remains.

**Architecture:** The rename is three mechanical tasks, each leaving the repository green: the seat type (schemas, pack, code, example, skills, tests), the experience field, and the parser's join kind. The migration is a new pure module, `lib/seat-migration.mjs`, that takes every file under an instance's `model/` and returns the moves and rewrites; `upgradePlan` calls it when the new core carries `seat-schema.md`, and the CLI reads `model/` into it and reports what moved. Release numbers are the owner's and are not in this plan.

**Tech Stack:** Node 22 ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-10-08-a-role-is-a-seat-design.md`

This plan covers meta-model only. robertblust/design (`render/processes`, `data-seat`, nav order), the three sites (the Processes page), the MCP server's and the Obsidian plugin's tests, and the family resync follow the release in work of their own, as the spec's "The order it ships in" lists.

## Global Constraints

- After this branch, no declaration of `role` remains in `core/`, `packs/`, `lib/`, `bin/`, `types/`, `agents/`, `example/` or `verify/`: no type, folder, schema file, field key, `ref → role`, `Type` token, join kind or exported property named `role` or `roles`. Ordinary English stays: a brand's "color role", a concept's `As` column ("the role the target plays"), "a role address such as `info@`", the example experience kind named Role, and old-form variable names inside `lib/localization.mjs`'s migration of the earlier localization form. Specs and plans under `docs/superpowers/` are history and are not edited.
- Exact names: type `seat`; schema file `core/seat-schema.md` (renamed with `git mv`, its `id` unchanged, R18); folder `model/seats/`; profile field `seats: array of ref → seat`; experience field `capacity: string`; `Type` token `seat`; parser join kind `"as"`; organization pack `job.seats: array of ref → seat`.
- Every entity keeps its id and its H1. Moved files keep their ids; no id is created for a moved page.
- Fields that reference a seat keep their names: `owner`, `supported-by`, `executed-by`, `gate-approvers`, `escalation-authority`, `performed-by`, `by`. Only their declared type changes.
- The migration refuses and writes nothing where it cannot be clean: `model/seats/` exists beside `model/roles/`; a page carries both `roles:` and `seats:`; an experience carries both `role:` and `capacity:`.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and a `Co-Authored-By` line naming the model that wrote it. The repository's commit-msg hook runs; never bypass it.
- `lib/` carries its types as JSDoc and `types/` holds the declarations built from it, committed. A task that changes a JSDoc type runs `npm run typecheck`, `npm run build`, commits `types/`, and `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in the worktree `../meta-model-role-becomes-seat` on the branch `role-becomes-seat`.
- The full gate for every task: `npm run typecheck && npm run build:check && npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:instance-files && npm run test:plan && npm run test:cli && npm run test:rules && npm run test:judge && npm run test:seats && npm run test:ids && npm run test:consumer`, then `sh conventions/conventions-format && sh conventions/conventions-check`. All exit 0.

## Review Focus

- A `Type` cell written with backticks, `` `role` ``, must become `` `seat` `` with its backticks; a cell holding `role` in any column other than `Type` must stay. Pinned in Task 4.
- An instance with no `model/roles/`, no `roles:` and no `role:` must pass through `upgrade` with the migration writing nothing. Pinned in Task 4.
- A second `upgrade` after the migration must find nothing to migrate. Pinned in Task 4.
- An experience's body text that says "role" must stay; only the frontmatter key moves. Pinned in Task 4.
- The commit-author check (`lib/seats.mjs`) must still find a seat by its address after the type is renamed: `reviewer@<domain>` resolves to the seat Reviewer. Pinned in Task 1.

---

### Task 1: The type is a seat

**Files:**

- Rename: `core/role-schema.md` → `core/seat-schema.md` (`git mv`), then edit
- Modify: `core/process-schema.md`, `core/phase-schema.md`, `core/kpi-schema.md`, `core/risk-schema.md`, `core/decision-schema.md`, `core/control-schema.md`, `core/rule-schema.md`, `core/profile-schema.md`, `core/skill-schema.md`, `core/value-schema.md`, `core/surface-schema.md`
- Modify: `packs/organization/job-schema.md`, `packs/organization/README.md`, any other `packs/` text naming the type
- Modify: `lib/checks.mjs` (`TYPES` row, the profile row's `claims.field`, comments), `lib/known.mjs`, `lib/seats.mjs`
- Rename: `example/model/roles/` → `example/model/seats/` (`git mv`), then edit `example/model/README.md`, the profiles' `roles:` keys, `example/model/rules/a-change-is-reviewed-before-it-ships.md`'s `Type` cell, and any other example page naming the folder or the type
- Rename: `verify/fixtures/beacon-graph/model/roles/` → `.../seats/`, and edit the fixture's README and pages
- Modify: every test under `verify/` that names the type, folder or field (today: `checks-owed`, `cli`, `commits`, `constraints`, `decision`, `duplicate-key`, `instance-checks`, `instance`, `known`, `kpi`, `list-kind`, `organization`, `questions`, `required-table`, `rule-risk-control`, `seats`)
- Modify: `agents/claude/skills/companygraph-profile/SKILL.md`, `companygraph-company/SKILL.md`, `companygraph-validate/SKILL.md`, `companygraph-export/SKILL.md` and `companygraph-export/build.py`
- Modify: `README.md` (the core type list)
- Modify: `types/` (built)

**Interfaces:**

- Produces: `TYPES` entry `{ type: "seat", folder: "seats" }`; the profile's `claims` reads field `seats`; `governingOf` (or whatever `lib/seats.mjs` exports today) returns a `seats: Map<string, string>` where it returned `roles`; its failure text "names no seat of". Later tasks read the example and fixtures in their seat form.

The work is a rename. Do it by rule, not by search-and-replace across the tree, because "role" is ordinary English in several places the Global Constraints keep.

- [ ] **Step 1: Make the tests speak of seats first**

Edit every test file listed above so it builds, names and expects the seat form: fixture schemas and pages under `seats/`, profile fields `seats:`, `ref → seat`, `Type` cells `seat`, `type: "seat"` in parser expectations, and in `verify/seats.test.mjs` the map and message of the seat form (`seats`, "names no seat of"). Add one test to `verify/seats.test.mjs`, in the file's own style, that a commit authored `Reviewer <reviewer@beacon.example>` (or the domain the file's fixture uses) resolves to the seat `Reviewer` of a model whose seat page lives in `model/seats/`.

- [ ] **Step 2: Run the suite to see it fail**

Run: `npm run test:instance-checks && npm run test:seats` Expected: FAIL, the core still declares `role`.

- [ ] **Step 3: Rename the schema and the references in core**

`git mv core/role-schema.md core/seat-schema.md`. In it: H1 `# Seat Schema`; tagline `> Required structure for seat files.`; File Location `` `model/seats/*.md` `` and its sentence ("A seat owns nothing and nothing owns it, so it is a file. A profile holds one by listing it, and the seat never names its holder; what a seat names is the skills it requires."); every other use of "role" in its prose and writing rules becomes "seat"; its `id` stays.

In the other core schemas: `ref → role` becomes `ref → seat`, `array of ref → role` becomes `array of ref → seat`, "the H1 of a file in `roles/`" becomes "the H1 of a file in `seats/`", "as a role is person-neutral" becomes "as a seat is person-neutral", "a role requires one" and "a role can require" become "a seat requires one" and "a seat can require", "a strategy, a role or a process" becomes "a strategy, a seat or a process", and in `rule` and `control` the `Type` description's `` `role`, `process` or `phase` `` becomes `` `seat`, `process` or `phase` `` and the writing rule "names a role, a process or a phase" becomes "names a seat, a process or a phase". In `core/profile-schema.md` the field `roles` becomes `` | `seats` | No | array of ref → seat | The seats this profile holds, each the H1 of a file in `seats/`. Absent for a profile without a seat. | ``, and its Purpose and writing rules say seats where they said roles. Leave `brand`, `concept`, `identity` and `experience-kind` as they are, and `experience`'s field for Task 2.

- [ ] **Step 4: The pack**

`packs/organization/job-schema.md`: `seats` becomes `array of ref → seat`, its description "each the H1 of a file in `seats/`", and its Purpose speaks of core's seat. `packs/organization/README.md`: "core's role is a seat" becomes "core's seat", and the "Left for later" item about renaming core's `role` is removed.

- [ ] **Step 5: The code**

`lib/checks.mjs`: the `TYPES` row becomes `{ type: "seat", folder: "seats" }` with its comment saying seat; the profile row's `claims.field` becomes `"seats"`; comments that name the type say seat. `lib/known.mjs`: it resolves `type: "seat"`, reads `holder.entity.fields.seats`, and its message reads `` `${profile} does not hold the seat ${seat}: its \`seats\` does not name it` ``. `lib/seats.mjs`: it filters `e.type === "seat"`, the returned property and its JSDoc are `seats` (rename the local variable too), its failure text reads `` `${address} is at ${governing.domain} and names no seat of ${governing.name}` ``, and its comments say seat. Search `bin/` for the type, folder or field and change any hit.

- [ ] **Step 6: The example, the fixture, the skills and the README**

`git mv example/model/roles example/model/seats`; rewrite `example/model/seats/README.md` (if there is one) to name `meta/core/seat-schema.md` and seats; in the example's profiles `roles:` becomes `seats:`; the rule's `## Applies to` `Type` cell `role` becomes `seat`; `example/model/README.md`'s listing and type sentence say `seats/` and `seat`. Do the same for `verify/fixtures/beacon-graph`. In the four skills and `build.py`, every instruction to read `model/roles/` or fill `roles:` says `model/seats/` and `seats:`, and the validate skill's gap line is `gap <profile>: <seat> requires <skill>`. Check `build.py`'s output file names: a file it writes per folder takes the folder's name, so `roles.md` becomes `seats.md` by itself; if the name is hard-coded, change it. `README.md`'s core type list names `seat` where it named `role`.

- [ ] **Step 7: Search for leftovers**

Run: `grep -rnw -e role -e roles core packs lib bin agents example verify README.md | grep -v -e "color role" -e "role the target plays" -e "role address" -e "^lib/localization.mjs" -e "experience-kinds/role.md" -e "kind: Role"` Expected: only experience's `role` field and its mentions, which Task 2 renames, and the parser's join kind, which Task 3 renames. Anything else is changed now.

- [ ] **Step 8: Build, run the full gate, commit**

Run: `npm run build`, then the full gate of the Global Constraints. Expected: all exit 0.

```bash
git add -A core packs lib bin agents example verify README.md types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
Core's role is a seat

The type was always a seat: its schema said so and every reference to it said the seat. The schema is now seat-schema.md, keeping its id; a seat lives in model/seats/, a profile holds seats, every reference to one is ref → seat, and a Type cell names seat. The commit-author check, the judge's seat check, the pack's job, the example, the fixtures and the skills say the same.

Verified: <the commands actually run>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>
EOF
```

---

### Task 2: Experience's field is its capacity

**Files:**

- Modify: `core/experience-schema.md`
- Modify: `example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`, `example/model/profiles/tomas-reyes/experiences/2021-orbit-conference.md`, and any other example experience with a `role:` key
- Modify: `lib/questions.mjs` (comments that name the field), any test under `verify/` that writes or expects an experience's `role:`
- Modify: `agents/claude/skills/*/SKILL.md` where they name the experience field
- Modify: `types/` if any JSDoc changes

**Interfaces:**

- Consumes: Task 1's seat form.
- Produces: experience field `capacity: string`.

- [ ] **Step 1: Tests first**

Change every test that writes an experience with `role:` to write `capacity:`, and any expectation of the field name. Add one test, in the style of the file that holds experience field tests, that an experience page carrying `role:` now fails as an undeclared field (R15), naming `role`.

- [ ] **Step 2: Run to see it fail**

Run: `npm run test:instance-checks` Expected: FAIL on the new test, since `role` is still declared.

- [ ] **Step 3: The schema**

`core/experience-schema.md`: the field row becomes `` | `capacity` | No | string | The capacity the subject served in, where the H1 does not already name it: a job title or a part such as speaker or author | ``. Its writing rules that name `role` name `capacity` ("The H1 names the part the subject played, or `capacity` carries it…", "`capacity` is the part, not the employer and not the client…").

- [ ] **Step 4: The example, the code comments and the skills**

Rename the key in the example's experiences; update `lib/questions.mjs`'s comments that cite the experience field; update any skill text that names the experience field.

- [ ] **Step 5: Gate and commit**

Run the full gate. Expected: all exit 0.

```bash
git add -A core example lib verify agents types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
An experience says the capacity the subject served in

The field held job titles and parts that are no job, a speaker or an author, and its name was the one declaration of role left in core once the type became a seat. It is now capacity, with the same meaning.

Verified: <the commands actually run>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>
EOF
```

---

### Task 3: The parser's join kind is named for its column

**Files:**

- Modify: `lib/instance.mjs` (the `JoinDecl` typedef near line 152, the comment near 1155, the push near 1236)
- Modify: `types/lib/instance.d.mts` (built)
- Modify: every test under `verify/` that expects `kind: "roles"` (search `"roles"` in `verify/constraints.test.mjs` and `verify/instance.test.mjs`)
- Modify: `README.md` or any document that names the join kind

**Interfaces:**

- Produces: the parser's constraints carry `{ kind: "as", section, column: "As", by }` where they carried `kind: "roles"`.

- [ ] **Step 1: Tests first**

Change every expectation of `kind: "roles"` to `kind: "as"`.

- [ ] **Step 2: Run to see it fail**

Run: `npm run test:instance` Expected: FAIL, the parser still emits `"roles"`.

- [ ] **Step 3: Rename**

In `lib/instance.mjs`, the typedef member becomes `{ kind: "as"; section: string; column: string; by: string }`, the push becomes `joins.push({ kind: "as", section, column: "As", by: bare(drawing[k]) })`, and the comment explains the join by R16's `As` column without the word roles.

- [ ] **Step 4: Build, gate, commit**

Run: `npm run build`, then the full gate. Expected: all exit 0.

```bash
git add lib/instance.mjs types verify README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The parser's As join is named for its column

The constraints a consumer reads named R16's join on a column called As by the word roles, which has nothing to do with seats and would carry the old word on after the type was renamed. It is now the as join.

Verified: <the commands actually run>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>
EOF
```

---

### Task 4: upgrade carries an instance across

**Files:**

- Create: `lib/seat-migration.mjs`
- Create: `verify/seat-migration.test.mjs`
- Modify: `package.json` (`test:plan` gains `verify/seat-migration.test.mjs`)
- Modify: `lib/plan.mjs` (`upgradePlan`: a `model` input, the call, the README, a `moved` result; its JSDoc)
- Modify: `bin/companygraph.mjs` (the upgrade command reads every file under `model/` into `model`, and reports moves and rewrites)
- Modify: `verify/cli.test.mjs` (one end-to-end test)
- Modify: `types/` (built)

**Interfaces:**

- Produces: `migratedSeats(model: Map<string, string>): null | { error: string } | { writes: Map<string, string>; removes: string[]; moved: [string, string][]; rewritten: string[] }`, keys being paths relative to the instance root (`model/...`); `upgradePlan({ ..., model })` returns `moved` beside `rewritten`.

- [ ] **Step 1: Write the failing tests**

```js
// verify/seat-migration.test.mjs
// An instance written before core 0.63.0 holds its seats in model/roles/, a profile's roles: and
// an experience's role:, and names the type role in a Type cell. upgrade carries it across.
import test from "node:test";
import assert from "node:assert/strict";
import { migratedSeats } from "../lib/seat-migration.mjs";

const page = (fm, body) => `---\n${fm}---\n\n${body}`;
const old = () => new Map([
  ["model/roles/README.md", "# Roles\n\nOne file per role, against `meta/core/role-schema.md`.\n"],
  ["model/roles/reviewer.md", page("id: a1\nsource: Local\n", "# Reviewer\n\n> Reads a change.\n")],
  ["model/profiles/mira/mira.md", page("id: p1\nsource: Local\nnature: human\nroles:\n  - Reviewer\n", "# Mira\n\n> A person.\n")],
  ["model/profiles/mira/experiences/2020-x.md", page("id: e1\nsource: Local\nrole: Speaker\nstart: 2020\n", "# A talk\n\n> In this role she spoke.\n")],
  ["model/rules/review.md", page("id: r1\nsource: Local\n", "# Review\n\n> Every change is reviewed.\n\n## Applies to\n\n| Type | Entity |\n| --- | --- |\n| `role` | Reviewer |\n| process | Delivery |\n\n## Notes\n\n| Kind | Text |\n| --- | --- |\n| role | stays |\n")],
]);

test("an instance with no seats in the old form needs nothing", () => {
  assert.equal(migratedSeats(new Map([["model/identity.md", page("id: i\n", "# Acme\n\n> A company.\n")]])), null);
});

test("seats move with their ids, the folder README is left to the caller, and every key and cell is rewritten", () => {
  const m = migratedSeats(old());
  assert.ok(m && !("error" in m));
  assert.deepEqual(m.moved, [["model/roles/reviewer.md", "model/seats/reviewer.md"]]);
  assert.deepEqual(m.removes.sort(), ["model/roles/README.md", "model/roles/reviewer.md"]);
  assert.match(m.writes.get("model/seats/reviewer.md"), /^---\nid: a1\n/);
  assert.match(m.writes.get("model/profiles/mira/mira.md"), /\nseats:\n  - Reviewer\n/);
  assert.doesNotMatch(m.writes.get("model/profiles/mira/mira.md"), /\nroles:/);
  const exp = m.writes.get("model/profiles/mira/experiences/2020-x.md");
  assert.match(exp, /\ncapacity: Speaker\n/);
  assert.match(exp, /In this role she spoke\./);
  const rule = m.writes.get("model/rules/review.md");
  assert.match(rule, /\| `seat` \| Reviewer \|/);
  assert.match(rule, /\| process \| Delivery \|/);
  assert.match(rule, /\| role \| stays \|/);
  assert.deepEqual(m.rewritten.sort(), ["model/profiles/mira/experiences/2020-x.md", "model/profiles/mira/mira.md", "model/rules/review.md"]);
});

test("a migrated instance needs nothing the second time", () => {
  const m = migratedSeats(old());
  const after = new Map([...old()].filter(([p]) => !m.removes.includes(p)));
  for (const [p, t] of m.writes) after.set(p, t);
  assert.equal(migratedSeats(after), null);
});

test("model/seats/ beside model/roles/ is refused", () => {
  const m = migratedSeats(old().set("model/seats/owner.md", page("id: s1\n", "# Owner\n\n> Decides.\n")));
  assert.match(m.error, /model\/seats\/ already exists beside model\/roles\//);
});

test("a profile carrying both roles: and seats: is refused, naming it", () => {
  const m = migratedSeats(old().set("model/profiles/mira/mira.md", page("id: p1\nroles:\n  - Reviewer\nseats:\n  - Owner\n", "# Mira\n")));
  assert.match(m.error, /model\/profiles\/mira\/mira\.md carries both `roles` and `seats`/);
});

test("an experience carrying both role: and capacity: is refused, naming it", () => {
  const m = migratedSeats(old().set("model/profiles/mira/experiences/2020-x.md", page("id: e1\nrole: Speaker\ncapacity: Author\n", "# A talk\n")));
  assert.match(m.error, /2020-x\.md carries both `role` and `capacity`/);
});
```

Add `verify/seat-migration.test.mjs` to the `test:plan` script in `package.json`.

- [ ] **Step 2: Run to see them fail**

Run: `node --test verify/seat-migration.test.mjs` Expected: FAIL, `lib/seat-migration.mjs` does not exist.

- [ ] **Step 3: Write the module**

```js
// lib/seat-migration.mjs
// Core 0.63.0 renamed the type role to seat and experience's field role to capacity. An instance
// written before it holds its seats in model/roles/, a profile's `roles:`, an experience's
// `role:`, and the type's name in a Type cell. `upgrade` carries it across with this, as it
// carried the localization page into one language: every page keeps its id and its H1, so every
// reference keeps its value, and only a folder, two keys and a cell change. Pure: paths in,
// texts out, the caller reads and writes. The folder's README is the caller's to write afresh
// for the new type, so it is only removed here.

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const PROFILE = /^model\/profiles\/([^/]+)\/\1\.md$/;
const EXPERIENCE = /^model\/profiles\/[^/]+\/experiences\/[^/]+\.md$/;

/** @param {string} text @param {string} key */
const hasKey = (text, key) => new RegExp(`^${key}:`, "m").test(text.match(FRONTMATTER)?.[1] ?? "");

// The key is renamed inside the frontmatter block only, so the body after it stays byte for byte.
/** @param {string} text @param {string} from @param {string} to @returns {string} */
const renamedKey = (text, from, to) => {
  const fm = text.match(FRONTMATTER);
  if (!fm) return text;
  return fm[0].replace(new RegExp(`^${from}:`, "m"), `${to}:`) + text.slice(fm[0].length);
};

// A table's cell under a column headed Type that names the type role, with or without backticks,
// names seat; every other cell, and every table without a Type column, is left as written.
/** @param {string} text @returns {string} */
const seatInTypeCells = (text) => {
  const lines = text.split("\n");
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) { at = -1; continue; }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|");
    if (at === -1 && (i === 0 || !lines[i - 1].trim().startsWith("|"))) {
      at = cells.findIndex((c) => c.trim().replace(/`/g, "") === "Type");
      continue;
    }
    if (at < 0 || /^\s*:?-+:?\s*$/.test(cells[0])) continue;
    const cell = cells[at];
    if (cell === undefined || cell.trim().replace(/`/g, "") !== "role") continue;
    cells[at] = cell.replace("role", "seat");
    lines[i] = `|${cells.join("|")}|`;
  }
  return lines.join("\n");
};

/**
 * @param {Map<string, string>} model every file under the instance's model/, keyed by its path from the instance root
 * @returns {null | { error: string } | { writes: Map<string, string>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export function migratedSeats(model) {
  const paths = [...model.keys()].sort();
  const inRoles = paths.filter((p) => p.startsWith("model/roles/"));
  if (inRoles.length && paths.some((p) => p.startsWith("model/seats/")))
    return { error: "model/seats/ already exists beside model/roles/; move one of them aside" };
  for (const p of paths) {
    const text = /** @type {string} */ (model.get(p));
    if (PROFILE.test(p) && hasKey(text, "roles") && hasKey(text, "seats")) return { error: `${p} carries both \`roles\` and \`seats\`; keep one` };
    if (EXPERIENCE.test(p) && hasKey(text, "role") && hasKey(text, "capacity")) return { error: `${p} carries both \`role\` and \`capacity\`; keep one` };
  }
  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {string[]} */
  const removes = [];
  /** @type {[string, string][]} */
  const moved = [];
  /** @type {string[]} */
  const rewritten = [];
  for (const p of paths) {
    if (!p.endsWith(".md")) continue;
    const before = /** @type {string} */ (model.get(p)).replace(/\r\n/g, "\n");
    let text = before;
    if (PROFILE.test(p) && hasKey(text, "roles")) text = renamedKey(text, "roles", "seats");
    if (EXPERIENCE.test(p) && hasKey(text, "role")) text = renamedKey(text, "role", "capacity");
    text = seatInTypeCells(text);
    if (p.startsWith("model/roles/")) {
      removes.push(p);
      if (p === "model/roles/README.md") continue;
      const to = `model/seats/${p.slice("model/roles/".length)}`;
      writes.set(to, text);
      moved.push([p, to]);
    } else if (text !== before) {
      writes.set(p, text);
      rewritten.push(p);
    }
  }
  return writes.size || removes.length ? { writes, removes, moved, rewritten } : null;
}
```

- [ ] **Step 4: Run to see them pass**

Run: `node --test verify/seat-migration.test.mjs` Expected: PASS, 6 tests.

- [ ] **Step 5: Wire it into upgrade**

In `lib/plan.mjs`, `upgradePlan` takes `model = new Map()` beside its other inputs (JSDoc: every file under the instance's `model/`, keyed by its path from the root). After the localization migration and before the `return`:

```js
  // Core 0.63.0 renamed the type role to seat. An instance still in the earlier form is carried
  // across here, keeping every id: model/roles/ moves to model/seats/, a profile's roles: and an
  // experience's role: are renamed, and a Type cell naming role names seat. The folder's README
  // is written afresh for the new type, as init writes it.
  /** @type {[string, string][]} */
  const movedSeats = [];
  if (core.has("seat-schema.md")) {
    const seats = migratedSeats(model);
    if (seats && "error" in seats) return { refused: `${seats.error}; nothing was written.` };
    if (seats) {
      for (const [p, t] of seats.writes) writes.set(p, t);
      removes.push(...seats.removes);
      rewritten.push(...seats.rewritten);
      movedSeats.push(...seats.moved);
      if (seats.removes.includes("model/roles/README.md"))
        for (const [p, t] of readmesFor(["seats"], units)) if (p === "model/seats/README.md") writes.set(p, t);
    }
  }
```

and the `return` gains `moved: movedSeats`. Import `migratedSeats` at the top. Add `moved` to the JSDoc of the result (and `moved?: undefined` to the refused branch, as the others have).

In `bin/companygraph.mjs`, the upgrade command reads every file under the instance's `model/` with `filesUnder` from `lib/history.mjs` (export it if it is not exported), keyed `model/<rest>` by prefixing each key it returns, and passes that map as `model`, and after the existing report lines prints `  moved   <from> → <to>` for each pair in `plan.moved`; a dry run lists the moves too. It applies `plan.removes` for model paths as it does for vendored files.

- [ ] **Step 6: The end-to-end test**

In `verify/cli.test.mjs`, beside the other upgrade tests, add a test that runs `init` on a temporary folder, writes into it, in the old form and from the example's current pages, a seat page under `model/roles/` (the example's `model/seats/reviewer.md` copied there), a profile listing it under `roles:` (the example's `ai-agent` profile with its key renamed back), and a rule whose `## Applies to` names it with `Type` `role`; runs `upgrade` on it; and asserts that `model/seats/reviewer.md` exists with the same `id`, `model/roles/` is gone, the profile carries `seats:`, the rule's cell reads `seat`, the output names the move, and `companygraph check` on the folder exits 0. A second `upgrade` prints that there is nothing to do.

- [ ] **Step 7: Build, gate, commit**

Run: `npm run build`, then the full gate. Expected: all exit 0.

```bash
git add lib/seat-migration.mjs lib/plan.mjs bin/companygraph.mjs verify/seat-migration.test.mjs verify/cli.test.mjs package.json types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
upgrade carries an instance's roles across to seats

Every instance holds its seats in model/roles/, a profile's roles: and an experience's role:, and names the type in Type cells, several hundred places in the family's three. upgrade now moves the folder, keeping every id, renames the two keys, rewrites the cells and writes the folder's README for the new type, as it carried the localization page before, and refuses with nothing written where the move cannot be clean.

Verified: <the commands actually run>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: <the model that wrote it> <noreply@anthropic.com>
EOF
```

## After the owner's merge

The release, its numbers (the spec names 0.87.0 and core 0.63.0) and its notes are the owner's. The notes say every instance breaks and that `upgrade` carries it, and that an instance's own `README.md`, `AGENTS.md` and `export/` texts, which `upgrade` never rewrites, may still say roles and are the instance's to update. The wave through design, the sites, the MCP server and the Obsidian plugin follows.
