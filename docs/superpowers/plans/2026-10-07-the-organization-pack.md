# The organization pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An instance can take the `organization` pack with `init --pack organization` or `upgrade --pack organization`, write groups and group kinds against two schemas vendored beside core, and be held by four instance checks: `part-of` never runs in a circle, a seat is in the `members` of one unit in the line at most, a seat is in the `guides` of one group at most, and a `## People` row seats a person only as a role they hold.

**Architecture:** A pack is already a unit beside core: `PACKS` in `lib/checks.mjs` states each pack's types, and the CLI, `bin/check-instance.mjs` and `verify/check.mjs` loop over it, so a second pack is a `PACKS` entry and a `packs/organization/` folder. The four norms are three new keys on a `TypeEntry` row — `acyclic`, `once` and `holds` — each read by one generic check inside `instanceChecks` that names no type, as `oneSided` and `refKind` already are. The parser's period stamp takes `kind` from an experience only, so a temporary group's kind is never read as an experience kind.

**Tech Stack:** Node 22 ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-10-07-the-organization-pack-design.md`, as amended on October 7, 2026 (a `## People` row is held by a check, not a join)

This plan covers meta-model only. An instance taking the pack, and any renderer drawing an org chart, follow the release in work of their own.

## Global Constraints

- The pack's name is `organization`. Its folder in the repository is `packs/organization/`, in an instance `<units>/organization/`, and the manifest lists it as `"packs": ["organization"]`.
- Two types, exactly: `group` at `groups`, and `group-kind` at `group-kinds`. Neither is owned; neither owns anything.
- `group` fields, exactly, in this order after `id`, `source`, `source-id`: `kind` (Yes, `ref → group-kind`), `part-of` (No, `ref → group`), `lead` (No, `ref → role`), `members` (No, `array of ref → role`), `guides` (No, `array of ref → role`), `start` (No, `date`), `end` (No, `date`).
- `group` sections, exactly: `# [Name]` (Yes), `> [Purpose]` (Yes), `## Responsibilities` (No, `Bulleted.`), `## People` (No, `Table.`, columns `Profile` Yes `ref → profile`, `Role` Yes `qualifier → role` with no `lists` join, `As` No `string`), `## References` (No, `Table.`, columns `What`, `URL`).
- `group-kind` fields after `id`, `source`, `source-id`: `in-line` (Yes, `enum`, `` `yes` or `no`. ``). Sections: `# [Label]` (Yes), `> [Summary]` (Yes), `## What it means` (Yes), `## References` (No).
- The four checks cite R16, name no type in their code, and read what they hold from the type's row in `PACKS`.
- No core schema changes, and core's `TYPES` array is not edited. R20 holds: the pack's schemas name `role`, `profile`, `source` and their own types only.
- Every schema id is a fresh UUID version 7 from `node bin/companygraph.mjs id`, lowercase, one per schema.
- `packs/organization/manifest.json` carries the same `version` as `core/manifest.json` at the time of the commit.
- Test fixtures name no company, team, seat or person from the owner's multi-person instance; use the names given in Task 1.
- No version bump in this plan. The release, its number and its notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- `lib/` carries its types as JSDoc and `types/` holds the declarations built from it, committed. A task that changes `TypeEntry` runs `npm run typecheck`, then `npm run build`, and commits `types/` with it; `npm run build:check` confirms.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in the worktree `../meta-model-the-organization-pack` on the branch `the-organization-pack`.

## Review Focus

- A group whose `part-of` names itself must fail once as a circle of one, and a circle of two or three must fail once, not once per page on it. Pinned in Task 2.
- A seat in the `members` of a unit and of a board, or of a unit and a team whose kind is `in-line: no`, must pass; a seat in two units of a kind in the line must fail once naming both. Pinned in Task 3.
- A group whose `kind` resolves to nothing, or whose `part-of` names no group, must fail as R4 alone, with no second finding from the new checks. Pinned in Tasks 2 and 3.
- A `## People` row whose `Role` resolves to nothing must fail as R4 alone, and two people sitting as the same seat must pass without an `As`. Pinned in Task 4.
- A temporary group with `start` must not carry its group kind in the parser's stamp, and an experience's stamp must be exactly what it was. Pinned in Task 2.

---

### Task 1: The pack ships two schemas, and a small instance written in it passes

**Files:**

- Create: `packs/organization/group-schema.md`
- Create: `packs/organization/group-kind-schema.md`
- Create: `packs/organization/manifest.json`
- Create: `packs/organization/README.md`
- Modify: `lib/checks.mjs` (`PACKS`: add `organization`)
- Create: `verify/organization.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/organization.test.mjs` at the end)

**Interfaces:**

- Produces: `PACKS.organization` with rows `{ type: "group", folder: "groups" }` and `{ type: "group-kind", folder: "group-kinds" }`; the fixture builder `tree(change)` and `failures(files)` in `verify/organization.test.mjs`, which Tasks 2–4 extend.

- [ ] **Step 1: Write the failing test**

```js
// verify/organization.test.mjs
// The organization pack through its real schemas: packs/organization/ and the core schemas it
// names are read from disk, so the test fails if a schema and the checks part.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/organization/${n}-schema.md`, import.meta.url), "utf8");
const page = (fm, body) => `---\nid: ${uuidv7()}\nsource: Local\n${fm}---\n\n${body}`;
const PACKS = [{ name: "organization", dir: "meta/organization" }];
const G = "model/groups";
const role = (name) => page("", `# ${name}\n\n> A seat.\n\n## What it takes\n\nA brief.\n\n## What it produces\n\nWork.\n\n## What it never does\n\n- Never merges unasked.\n`);
const kind = (name, inLine) => page(`in-line: ${inLine}\n`, `# ${name}\n\n> A kind of group.\n\n## What it means\n\nWhich groups are of this kind.\n`);
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}\n` : "";
const group = ({ kind: k, partOf, lead, members = [], guides = [], start, body = "" }) => page(
  `kind: ${k}\n${partOf ? `part-of: ${partOf}\n` : ""}${lead ? `lead: ${lead}\n` : ""}${list("members", members)}${list("guides", guides)}${start ? `start: ${start}\n` : ""}`,
  body,
);
const person = (name, roles) => page(`nature: human\n${list("roles", roles)}`, `# ${name}\n\n> A person.\n`);

const tree = (change = (m) => m) => change(new Map([
  ...["source", "identifier", "role", "profile", "experience"].map((n) => [`meta/core/${n}-schema.md`, core(n)]),
  ...["group", "group-kind"].map((n) => [`meta/organization/${n}-schema.md`, pack(n)]),
  ["model/identifier.md", page("format: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", `---\nid: ${uuidv7()}\n---\n\n# Local\n\n> Here.\n`],
  ...["Managing Director", "Engineering Lead", "Backend Engineer", "Designer"].map((n) => [`model/roles/${n.toLowerCase().replace(/ /g, "-")}.md`, role(n)]),
  ["model/group-kinds/department.md", kind("Department", "yes")],
  ["model/group-kinds/board.md", kind("Board", "no")],
  ["model/group-kinds/team.md", kind("Team", "no")],
  [`${G}/management.md`, group({ kind: "Department", lead: "Managing Director", members: ["Engineering Lead", "Designer"], body: "# Management\n\n> Sets the direction.\n" })],
  [`${G}/engineering.md`, group({ kind: "Department", partOf: "Management", lead: "Engineering Lead", members: ["Backend Engineer"], guides: ["Backend Engineer"], body: "# Engineering\n\n> Builds the product.\n\n## Responsibilities\n\n- Code quality\n" })],
  [`${G}/review-board.md`, group({ kind: "Board", lead: "Managing Director", members: ["Engineering Lead", "Designer"], body: "# Review Board\n\n> Approves risky changes.\n" })],
  [`${G}/checkout-team.md`, group({ kind: "Team", members: ["Backend Engineer", "Designer"], start: "2026-03", body: "# Checkout Team\n\n> Ships the new checkout.\n\n## People\n\n| Profile | Role | As |\n| --- | --- | --- |\n| Mira | Backend Engineer | Lead |\n| Jon | Designer | |\n| Ana | Backend Engineer | |\n" })],
  ["model/profiles/mira/mira.md", person("Mira", ["Backend Engineer"])],
  ["model/profiles/jon/jon.md", person("Jon", ["Designer"])],
  ["model/profiles/ana/ana.md", person("Ana", ["Backend Engineer"])],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));

test("a small instance written in the pack passes, a board and a team over seats already in units included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("an in-line value that is neither yes nor no fails", () => {
  const f = failures(tree(edit("model/group-kinds/team.md", "in-line: no", "in-line: maybe")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /team\.md.*maybe/);
});

test("a group without a kind fails", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "kind: Department\n", "")));
  assert.ok(f.some((x) => x.includes("engineering.md") && x.includes("kind")), f.join("\n"));
});

test("a group naming a seat no role is fails as R4", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "lead: Engineering Lead", "lead: Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Ghost.*\(R4\)/);
});
```

The fixture's profiles are folders without an `experiences/` folder. If the base test reports that a profile folder lacks one, add `["model/profiles/<slug>/experiences/README.md", "# Experiences\n\n> Nothing yet.\n"]` for each of the three profiles, as `verify/software.test.mjs` does for a context's empty folders, and keep the rest of the fixture as written.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test verify/organization.test.mjs`

Expected: FAIL, every test, with ENOENT reading `packs/organization/group-schema.md`.

- [ ] **Step 3: Generate two ids**

Run: `for i in 1 2; do node bin/companygraph.mjs id; done`

Use one id per schema in Step 4.

- [ ] **Step 4: Write the two schemas**

`packs/organization/group-schema.md`, with the first id:

```markdown
---
id: <first id>
---

# Group Schema

> Required structure for group files.

## File Location

`model/groups/*.md`

A group owns nothing and nothing owns it, so it is a file. Its place in the tree is its `part-of`, so a reorganization edits one field and moves no file, and a team drawn across units stands beside them.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `kind` | Yes | ref → group-kind | What kind of group this is, the H1 of a file in `group-kinds/`; its `in-line` says whether the group stands in the disciplinary line |
| `part-of` | No | ref → group | The unit this one sits in, one step up the disciplinary line. Absent at the top and for a group outside the line. |
| `lead` | No | ref → role | The seat that leads the group, the H1 of a file in `roles/` |
| `members` | No | array of ref → role | The seats that sit in the group. In a group whose kind is in the line, this is each seat's disciplinary unit. |
| `guides` | No | array of ref → role | The seats whose discipline this group sets wherever they sit: the professional line |
| `start` | No | date | When the group was formed, for a group that is not standing |
| `end` | No | date | When the group was disbanded. Absent while it exists. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The group's name. Every reference uses this exact string. |
| `> [Purpose]` | Yes | What the group is for, in one paragraph |
| `## Responsibilities` | No | Bulleted. What the group answers for, one item each |
| `## People` | No | Table. The named people who sit in the group, each with the seat they sit in it as; its columns are declared below. |
| `## References` | No | Table. What a reader can open to learn more about the group — a charter, a mandate; its columns are declared below. |

`## People` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Profile` | Yes | ref → profile | The person, the H1 of a profile |
| `Role` | Yes | qualifier → role | The seat the person sits in the group as, one their profile lists in `roles` |
| `As` | No | string | The person's place in the group, such as lead |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a charter, a mandate |
| `URL` | Yes | string | Where it is |

## Purpose

A group is a unit of the company, or a team drawn from its units, and answers "who sits together, under whom, and whose standard do they work to?" Its `members` and `part-of` are the disciplinary line: a seat answers to the lead of the unit that lists it, and that lead to the lead of the unit above, as Gabler's Einliniensystem has it. Its `guides` is the professional line, the fachliche Weisungsrecht of a matrix: the unit that sets a discipline's standard lists that discipline's seats wherever they sit. A person stands on either line only through the seat they hold, as in the W3C Organization Ontology's posts.

## Writing rules

- The H1 names the group as the company calls it, without its kind: `Engineering`, not `Engineering department`.
- The tagline says what the group is for, not who sits in it.
- `members` never names the seat in `lead`; the lead's own unit is the one whose `members` list its seat.
- `guides` names only seats whose discipline the group sets, not seats that merely work with it.
- `## People` is written only for a group made of named people; a unit of seats lists them in `members`.
- `end` is written once the group is disbanded, and the page is kept.
```

`packs/organization/group-kind-schema.md`, with the second id:

```markdown
---
id: <second id>
---

# Group Kind Schema

> Required structure for group kind files.

## File Location

`model/group-kinds/*.md`

A group kind owns nothing and nothing owns it, so it is a file. A company names its own kinds; the pack ships none.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `in-line` | Yes | enum | `yes` or `no`. Whether a group of this kind stands in the disciplinary line, and so whether a seat in its `members` has it as its unit. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every group references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which groups belong to this kind, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — an organization handbook, a framework |
| `URL` | Yes | string | Where it is |

## Purpose

A group kind says what kind of group a company has, and whether groups of it stand in the disciplinary line. A standing unit does; a board, a cross-functional team or an initiative team does not, and the seats it gathers keep the unit they already sit in. That one fact is what lets a board and a team list seats that are already in a unit without giving any seat a second disciplinary line.

## Writing rules

- The H1 is the kind's name, singular: `Department`, not `Departments`.
- `## What it means` names what a group of the kind is for and one kind of group it is not.
- `in-line` is `yes` only for a kind whose groups hire, appraise and set objectives for the seats in them.
```

- [ ] **Step 5: Write the manifest and the README, and register the pack**

`packs/organization/manifest.json`, with the version read from `core/manifest.json`:

```json
{ "name": "organization", "version": "<core/manifest.json version>" }
```

`packs/organization/README.md`:

```markdown
# CompanyGraph — the organization pack

> Vocabulary for a company of more than one person: its units, the teams it draws from them, and the two lines that run through them. Level 1, refining core's level 0 for that kind of company.

An instance takes it with `companygraph init --pack organization`. Every edge from these types to core's is optional, and no core type names one of these (R20).

| Type | What it is | Owned by |
| --- | --- | --- |
| `group` | A unit of the company, or a team drawn from its units | nothing |
| `group-kind` | What kind of group a company has, and whether it stands in the disciplinary line | nothing |

The disciplinary line is a group's `members` and `part-of`: a seat answers to the lead of the unit that lists it. The professional line is a group's `guides`: the unit that sets a discipline's standard lists that discipline's seats wherever they sit. A person stands on either line through the seat they hold.

## Sources

| What | URL |
| --- | --- |
| W3C, The Organization Ontology | https://www.w3.org/TR/vocab-org/ |
| schema.org, department | https://schema.org/department |
| SAP, Organizational Management in SAP HCM | https://learning.sap.com/courses/organizational-management-in-sap-hcm-for-s-4hana/finding-object-relationships |
| HR-XML 3.1, ReportsToPositionType | https://schemas.liquid-technologies.com/HR-XML/3.1/reportstopositiontype.html |
| Gabler Wirtschaftslexikon, Matrixorganisation | https://wirtschaftslexikon.gabler.de/definition/matrixorganisation-39659 |
| Gabler Wirtschaftslexikon, Stelle | https://wirtschaftslexikon.gabler.de/definition/stelle-42791 |
| Kliemt, Der Betrieb in der Matrix-Struktur | https://kliemt.blog/2016/07/06/der-betrieb-in-der-matrix-struktur/ |

## Where it departs from its sources

- The two lines are named by the right each carries, disciplinary and professional, and the phrase "functional line", which practice uses for both, is used for neither.
- Two lines where the Organization Ontology has one `reportsTo`, as SAP, HR-XML and German practice keep the primary line apart from the one beside it.
- The lines run between units and the seats they list, never between people, and a seat carries no field naming its superior.
- A temporary group has `start` and `end`, not a status.
- The type is `group` rather than organizational unit, because a team drawn across units is a group and not a unit; its kind tells the two apart.

## Left for later

A position or job type beside core's role; staff units beside a line; edges from a group to KPIs and processes; a transitive form of `part-of`; a rendered org chart.
```

In `lib/checks.mjs`, add to `PACKS` after the `software` entry's closing `],`:

```js
  organization: [
    // A group owns nothing: its place in the tree is its `part-of`, so a reorganization edits a
    // field and moves no file, and a team drawn across units stands beside them.
    { type: "group", folder: "groups" },
    { type: "group-kind", folder: "group-kinds" },
  ],
```

In `package.json`, append ` verify/organization.test.mjs` to the end of the `test:instance-checks` script string.

- [ ] **Step 6: Run the tests and the repository check**

Run: `node --test verify/organization.test.mjs && npm run verify`

Expected: 4 tests pass; `verify` passes, which holds both schemas to R9's shape, the manifest's version to core's, and R20.

If `verify` fails a writing rule's opening, reword only its first words so it opens with its subject as R9 says, and keep its meaning.

- [ ] **Step 7: Run the whole suite and commit**

Run: `npm run test:instance-checks && npm run test:instance && npm run test:cli && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: all pass. If `conventions-format` reports, run `sh conventions/conventions-format fix` and rerun.

```bash
git add packs/organization lib/checks.mjs verify/organization.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The organization pack ships groups and group kinds

A company of more than one person has units and the lines through them, and core can say neither. The pack adds two schemas beside core, a group and its kind, registered in PACKS so the CLI, the checker and the repository's own check take it as they take the software pack.

Verified: node --test verify/organization.test.mjs, npm run verify, npm run test:instance-checks, npm run test:instance, npm run test:cli, conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 2: A chain of one type never returns to where it starts, and a group's stamp carries no experience kind

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc; `PACKS.organization` group row; a new check after "a reference names an entity of the kind its schema says")
- Modify: `lib/instance.mjs:651` (the stamp)
- Modify: `verify/organization.test.mjs`
- Modify: `verify/instance.test.mjs` (after the stamp test at line 110)
- Modify: `types/lib/checks.d.mts` (built)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `G` from Task 1.
- Produces: `TypeEntry.acyclic?: string`; the failure text `` <path>: `<field>` runs in a circle, "<A>" → "<B>" → "<A>"; a line never returns to where it starts (R16) ``.

- [ ] **Step 1: Write the failing tests**

Append to `verify/organization.test.mjs`:

```js
// --- part-of never runs in a circle ---------------------------------------------------------

test("a group whose part-of names itself fails once, as a circle of one", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Engineering")));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` runs in a circle, "Engineering" → "Engineering"; a line never returns to where it starts (R16)`]);
});

test("a circle of two fails once, at the page whose path sorts first, naming both", () => {
  const f = failures(tree((m) => m.set(`${G}/management.md`, m.get(`${G}/management.md`).replace("kind: Department\n", "kind: Department\npart-of: Engineering\n"))));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` runs in a circle, "Engineering" → "Management" → "Engineering"; a line never returns to where it starts (R16)`]);
});

test("a group leading into a circle without being on it is not reported, and the circle is reported once", () => {
  const f = failures(tree((m) => {
    m.set(`${G}/management.md`, m.get(`${G}/management.md`).replace("kind: Department\n", "kind: Department\npart-of: Engineering\n"));
    return m.set(`${G}/platform.md`, group({ kind: "Department", partOf: "Engineering", body: "# Platform\n\n> Runs the platform.\n" }));
  }));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/groups\/engineering\.md: `part-of` runs in a circle/);
});

test("a part-of naming no group fails as R4 alone, and a chain three deep passes", () => {
  const ghost = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Ghost")));
  assert.equal(ghost.length, 1, ghost.join("\n"));
  assert.match(ghost[0], /\(R4\)/);
  assert.deepEqual(failures(tree((m) => m.set(`${G}/platform.md`, group({ kind: "Department", partOf: "Engineering", body: "# Platform\n\n> Runs the platform.\n" })))), []);
});
```

In `verify/instance.test.mjs`, after the test that ends with `assert.equal("stamp" in entities.find((e) => e.id === "skills/java-programming"), false);` and its closing `});`, add:

```js
// A temporary group carries a kind and a start too, and its kind is a group kind: a renderer
// that translates a stamp's kind against the experience kinds must never meet one.
test("a period stamp carries a kind only for an experience", () => {
  const s = new Map(schemas);
  s.set("group-kind-schema.md", schema("group-kind"));
  s.set("group-schema.md", schema("group", { fields: [["kind", "ref → group-kind"], ["start", "date"], ["end", "date"]] }));
  const files = new Map(valid);
  files.set("group-kinds/team.md", "# Team\n\n> A team.\n");
  files.set("groups/checkout.md", "---\nkind: Team\nstart: 2026-03\n---\n\n# Checkout\n\n> Ships the checkout.\n");
  const g = parseInstance(files, { schemas: s }).entities.find((e) => e.type === "group");
  assert.deepEqual(g.stamp, { kind: null, start: "2026-03", end: null });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/organization.test.mjs verify/instance.test.mjs`

Expected: FAIL — the four circle tests (the circle cases find `[]`; "part-of naming no group" may already pass), and the stamp test with `kind: "Team"` where `null` is expected.

- [ ] **Step 3: Declare the key**

In `lib/checks.mjs`, in the `TypeEntry` typedef, after the `@property` line for `refKind`, add:

```js
 * @property {string} [acyclic] A field naming an entity of the page's own type, `ref → <type>`, whose chain from any page never returns to a page already on it.
```

Change the `group` row in `PACKS.organization` to:

```js
    { type: "group", folder: "groups", acyclic: "part-of" },
```

- [ ] **Step 4: Write the check**

In `lib/checks.mjs`, directly before the comment line `// An entity that exists to gather others — a question kind — is named by at least as many of`, add this check object to the array:

```js
  {
    // A field that names an entity of its own type draws a chain — a group's `part-of` — and a
    // chain that returns to where it started draws no tree. Each circle fails once, at the page
    // on it whose path sorts first, naming every page on it in order; a page that only leads
    // into a circle is not on it. A name that resolves to nothing ends the chain and is R4's.
    // The field is stated on the type's row, so no type is named here.
    name: "a chain of one type never returns to where it starts",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.acyclic) continue;
        const field = t.acyclic;
        const pages = pagesOf(t.type);
        /** @type {Map<string, string | null>} */
        const next = new Map();
        for (const { path, text } of pages) {
          const value = fmScalar(frontmatterOf(text), field);
          next.set(path, value ? entityNamed(path, t.type, t, value)?.path ?? null : null);
        }
        const nameOf = new Map(pages.map((p) => [p.path, p.name ?? p.path]));
        /** @type {Set<string>} */
        const reported = new Set();
        for (const { path } of pages) {
          /** @type {string[]} */
          const seen = [];
          /** @type {string | null} */
          let at = path;
          while (at && !seen.includes(at)) { seen.push(at); at = next.get(at) ?? null; }
          if (!at) continue;
          const circle = seen.slice(seen.indexOf(at));
          const first = [...circle].sort()[0];
          if (reported.has(first)) continue;
          reported.add(first);
          const from = circle.indexOf(first);
          const order = [...circle.slice(from), ...circle.slice(0, from), first];
          fail(`${first}: \`${field}\` runs in a circle, ${order.map((p) => `"${nameOf.get(p)}"`).join(" → ")}; a line never returns to where it starts (R16)`);
        }
      }
    },
  },
```

- [ ] **Step 5: Keep a group kind out of the stamp**

In `lib/instance.mjs`, replace

```js
    const stamp = { kind: pick("kind"), start: pick("start"), end: pick("end") };
```

with

```js
    // The kind is an experience kind or nothing: a temporary group carries a `kind` and a
    // `start` too, and its kind is a group kind no renderer translates.
    const stamp = { kind: e.type === "experience" ? pick("kind") : null, start: pick("start"), end: pick("end") };
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `node --test verify/organization.test.mjs verify/instance.test.mjs`

Expected: PASS, all tests, the experience stamp tests unchanged.

- [ ] **Step 7: Build the types, run the suite and commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks && npm run test:instance && npm run test:rules`

Expected: all pass; `types/lib/checks.d.mts` gains `acyclic`.

```bash
git add lib/checks.mjs lib/instance.mjs verify/organization.test.mjs verify/instance.test.mjs types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A unit's part-of never runs in a circle

A disciplinary line draws a tree only if no unit sits inside itself, and no single page can show that. A type's row now names a field whose chain is held across pages, and each circle fails once, naming the pages on it. The parser's period stamp takes its kind from an experience alone, since a temporary group's kind is a group kind.

Verified: npm run typecheck, build, build:check, verify, test:instance-checks, test:instance and test:rules pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 3: A seat has one disciplinary unit and one guiding unit at most

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc; `PACKS.organization` group row; a new check after Task 2's)
- Modify: `verify/organization.test.mjs`
- Modify: `types/lib/checks.d.mts` (built)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `G`, `group` from Task 1.
- Produces: `TypeEntry.once?: { field: string, when?: { via: string, field: string, is: string } }[]`; the failure text `` "<name>" is in `<field>` of <path> and <path>; a <target> is in `<field>` of one <type>[ whose `<via>` carries `<field>: <is>`] at most (R16) ``.

- [ ] **Step 1: Write the failing tests**

Append to `verify/organization.test.mjs`:

```js
// --- one disciplinary unit and one guiding unit per seat -------------------------------------

test("a seat in the members of two units in the line fails once, naming both", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "  - Backend Engineer\nguides", "  - Backend Engineer\n  - Designer\nguides")));
  assert.deepEqual(f, [`"Designer" is in \`members\` of ${G}/engineering.md and ${G}/management.md; a role is in \`members\` of one group whose \`kind\` carries \`in-line: yes\` at most (R16)`]);
});

test("a seat in a unit and in a board or a team outside the line passes", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a seat listed twice in one group's members is in one group", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "  - Backend Engineer\nguides", "  - Backend Engineer\n  - Backend Engineer\nguides")));
  assert.ok(!f.some((x) => x.includes("is in `members` of")), f.join("\n"));
});

test("a group whose kind resolves to nothing fails as R4 and is not counted in the line", () => {
  const f = failures(tree((m) => m.set(`${G}/design.md`, group({ kind: "Ghost", members: ["Designer"], body: "# Design\n\n> Designs.\n" }))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /design\.md.*Ghost.*\(R4\)/);
});

test("a seat guided by two groups fails once, whatever their kind", () => {
  const f = failures(tree(edit(`${G}/review-board.md`, "kind: Board\n", "kind: Board\nguides:\n  - Backend Engineer\n")));
  assert.deepEqual(f, [`"Backend Engineer" is in \`guides\` of ${G}/engineering.md and ${G}/review-board.md; a role is in \`guides\` of one group at most (R16)`]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/organization.test.mjs`

Expected: FAIL — "two units in the line" and "guided by two groups" find `[]`.

- [ ] **Step 3: Declare the key**

In the `TypeEntry` typedef, after the `acyclic` line, add:

```js
 * @property {{ field: string, when?: { via: string, field: string, is: string } }[]} [once] List fields whose every entity is named by one page of the type at most; with `when`, only pages whose field `via` names an entity carrying `field` with the value `is` count.
```

Change the `group` row in `PACKS.organization` to:

```js
    // A seat has one disciplinary unit, among the groups of a kind in the line, and one unit
    // that guides its discipline; a board or a team outside the line gathers seats without
    // giving them a second line.
    {
      type: "group", folder: "groups", acyclic: "part-of",
      once: [{ field: "members", when: { via: "kind", field: "in-line", is: "yes" } }, { field: "guides" }],
    },
```

- [ ] **Step 4: Write the check**

Directly after Task 2's check object, add:

```js
  {
    // A list field whose every entity may be named by one page of the type at most — a seat in
    // the members of one unit in the line, a seat in the guides of one group — since a second
    // would be a second line. Where the row says `when`, only pages whose `via` names an entity
    // carrying `field: is` count, so a board's seats, already in a unit, are not counted twice.
    // A page naming one entity twice names it once; a value that resolves to nothing, and a
    // page whose `via` resolves to nothing, are R4's. Stated on the type's row; no type is named.
    name: "an entity is named in a field by one page at most",
    rule: "R16",
    run() {
      /** @param {string} type @param {string} field */
      const targetOf = (type, field) => TYPES.find((x) => x.type === refOf(fieldsOf(type).find((f) => f.field === field)?.declared ?? "")?.target);
      for (const t of TYPES) {
        for (const { field, when } of t.once ?? []) {
          const target = targetOf(t.type, field);
          const via = when ? targetOf(t.type, when.via) : null;
          if (!target || (when && !via)) continue;
          /** @type {Map<string, { name: string, by: string[] }>} */
          const named = new Map();
          for (const { path, text } of pagesOf(t.type)) {
            const fm = frontmatterOf(text);
            if (when && via) {
              const value = fmScalar(fm, when.via);
              const found = value ? entityNamed(path, t.type, via, value) : null;
              if (!found || fmScalar(frontmatterOf(found.text), when.field) !== when.is) continue;
            }
            for (const value of new Set(fieldValues(fm, field))) {
              const found = entityNamed(path, t.type, target, value);
              if (!found) continue;
              const entry = named.get(found.path) ?? { name: value, by: [] };
              if (!entry.by.includes(path)) entry.by.push(path);
              named.set(found.path, entry);
            }
          }
          const among = when ? ` whose \`${when.via}\` carries \`${when.field}: ${when.is}\`` : "";
          for (const { name, by } of named.values())
            if (by.length > 1)
              fail(`"${name}" is in \`${field}\` of ${[...by].sort().join(" and ")}; a ${target.type} is in \`${field}\` of one ${t.type}${among} at most (R16)`);
        }
      }
    },
  },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test verify/organization.test.mjs`

Expected: PASS, all tests.

- [ ] **Step 6: Build the types, run the suite and commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks && npm run test:rules`

Expected: all pass; `types/lib/checks.d.mts` gains `once`.

```bash
git add lib/checks.mjs verify/organization.test.mjs types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A seat has one disciplinary unit and one guiding unit

Two units of a kind in the line listing one seat give it two lines, and two groups guiding one seat give its discipline two standards; neither shows on one page. A type's row now names list fields held to one page per entity, optionally among the pages whose kind carries a value, so a board or a team outside the line gathers seats without counting.

Verified: npm run typecheck, build, build:check, verify, test:instance-checks and test:rules pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 4: A person sits in a group only as a seat they hold

**Files:**

- Modify: `lib/checks.mjs` (`TypeEntry` JSDoc; `PACKS.organization` group row; a new check after Task 3's)
- Modify: `verify/organization.test.mjs`
- Modify: `types/lib/checks.d.mts` (built)

**Interfaces:**

- Consumes: `tree`, `failures`, `edit`, `G` from Task 1.
- Produces: `TypeEntry.holds?: { section: string, column: string, qualifier: string, field: string }`; the failure text `` <path>: the "## <section>" row "<who>" sits as "<as>", and <who> does not list it in `<field>` (R16) ``.

- [ ] **Step 1: Write the failing tests**

Append to `verify/organization.test.mjs`:

```js
// --- a person sits in a group as a seat they hold -----------------------------------------------

const TEAM = `${G}/checkout-team.md`;

test("a People row seating a person as a seat they do not hold fails once", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | |", "| Jon | Backend Engineer | |")));
  assert.deepEqual(f, [`${TEAM}: the "## People" row "Jon" sits as "Backend Engineer", and Jon does not list it in \`roles\` (R16)`]);
});

test("a People row whose seat is no role fails as R4 alone", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | |", "| Jon | Ghost | |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*Ghost.*\(R4\)/);
});

test("two people sitting as one seat pass without an As", () => {
  assert.deepEqual(failures(tree()), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/organization.test.mjs`

Expected: FAIL — "a seat they do not hold" finds `[]`.

- [ ] **Step 3: Declare the key**

In the `TypeEntry` typedef, after the `once` line, add:

```js
 * @property {{ section: string, column: string, qualifier: string, field: string }} [holds] A table whose every row's `column` entity lists, in its own `field`, the entity the row's `qualifier` names.
```

Change the `group` row in `PACKS.organization` to:

```js
    // A seat has one disciplinary unit, among the groups of a kind in the line, and one unit
    // that guides its discipline; a board or a team outside the line gathers seats without
    // giving them a second line. A person sits in a group only as a seat they hold, which the
    // grammar's `lists` join cannot say, since it puts the field on the qualifier's entity.
    {
      type: "group", folder: "groups", acyclic: "part-of",
      once: [{ field: "members", when: { via: "kind", field: "in-line", is: "yes" } }, { field: "guides" }],
      holds: { section: "People", column: "Profile", qualifier: "Role", field: "roles" },
    },
```

- [ ] **Step 4: Write the check**

Directly after Task 3's check object, add:

```js
  {
    // A row that seats one entity as another — a person in a group as a seat — is true only
    // where the first lists the second in its own field: a group's People row names a profile
    // whose `roles` lists the row's role. The grammar's `lists` join puts the field on the
    // qualifier's entity, and a role lists no holders, so this is stated on the type's row.
    // Read only in a table whose columns are the schema's, and only where both cells resolve,
    // so a name that resolves to nothing is R4's alone.
    name: "a row seats an entity only as what it holds",
    rule: "R16",
    run() {
      for (const t of TYPES) {
        if (!t.holds) continue;
        const { section, column, qualifier, field } = t.holds;
        const declared = columnTablesOf().get(t.type)?.find((x) => x.section === section)?.columns;
        /** @param {string} name */
        const typeOf = (name) => TYPES.find((x) => x.type === refOf(declared?.find((c) => c.name === name)?.declared ?? "")?.target);
        const holder = typeOf(column), held = typeOf(qualifier);
        if (!declared || !holder || !held) continue;
        const header = declared.map((c) => c.name).join("|");
        for (const { path, text } of pagesOf(t.type)) {
          const table = tableOf(sectionsOf(text).get(section) ?? "");
          if (!table || table.columns.join("|") !== header) continue;
          const a = table.columns.indexOf(column), b = table.columns.indexOf(qualifier);
          for (const row of table.rows) {
            const who = (row[a] ?? "").replace(/`/g, "").trim(), as = (row[b] ?? "").replace(/`/g, "").trim();
            const found = who ? entityNamed(path, t.type, holder, who) : null;
            if (!found || !as || !entityNamed(path, t.type, held, as)) continue;
            if (!fieldValues(frontmatterOf(found.text), field).includes(as))
              fail(`${path}: the "## ${section}" row "${who}" sits as "${as}", and ${who} does not list it in \`${field}\` (R16)`);
          }
        }
      }
    },
  },
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test verify/organization.test.mjs`

Expected: PASS, all tests.

- [ ] **Step 6: Build the types, run the suite and commit**

Run: `npm run typecheck && npm run build && npm run build:check && npm run verify && npm run test:instance-checks && npm run test:rules`

Expected: all pass; `types/lib/checks.d.mts` gains `holds`.

```bash
git add lib/checks.mjs verify/organization.test.mjs types
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A person sits in a group only as a seat they hold

A People row names a person and the seat they sit in the group as, and the grammar's lists join cannot hold that the person holds the seat, because it puts the field on the qualifier's entity. A type's row now names a table whose rows are held to the holder's own field, and a row that seats a person as a seat their profile does not list fails.

Verified: npm run typecheck, build, build:check, verify, test:instance-checks and test:rules pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

---

### Task 5: The CLI takes the pack, and the README says two ship

**Files:**

- Modify: `verify/cli.test.mjs` (a test after the one at the line holding `test("upgrade --pack names only the packs the instance did not already list"`)
- Modify: `README.md` (the `## Packs` paragraph beginning `One pack ships:`)

**Interfaces:**

- Consumes: `run`, `temp`, `cli` from `verify/cli.test.mjs`; `PACKS.organization` from Task 1.

- [ ] **Step 1: Write the failing test**

Add after the test `upgrade --pack names only the packs the instance did not already list`, using the same `run` and `temp` helpers:

```js
test("init --pack organization vendors the pack, and the instance it writes passes check", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "organization"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  assert.deepEqual(manifest.packs, ["organization"]);
  for (const n of ["group", "group-kind"]) assert.ok(fs.existsSync(path.join(root, "meta/organization", `${n}-schema.md`)), n);
  assert.doesNotThrow(() => run(["check", root]));
});
```

- [ ] **Step 2: Run the test**

Run: `node --test --test-name-pattern "init --pack organization" verify/cli.test.mjs`

Expected: PASS, since the CLI reads `PACKS`. If it fails, the failure names what the CLI does not yet do for a second pack; fix that in `bin/companygraph.mjs` alone, with the software pack's behavior as the reference, and rerun.

- [ ] **Step 3: Update the README**

In `README.md`, replace the paragraph beginning `One pack ships:` with:

```markdown
Two packs ship. `software`, for a company that builds software, has five types from domain-driven design. `organization`, for a company of more than one person, has two: `group`, a unit or a team drawn from its units, and `group-kind`, which says whether a group stands in the disciplinary line; a group's `members` and `part-of` draw that line and its `guides` the professional one, both through seats, never through people. Each pack's schemas are in `packs/<pack>/`, and its README lists the sources each type draws on and where the pack departs from them. An instance takes a pack with `companygraph init --pack <pack>`, or later with `companygraph upgrade --pack <pack>`; it is vendored beside core under the units folder, listed in the manifest's `packs`, checked by `check` and moved by `upgrade`. Core is level 0 and a pack level 1: every edge from a pack to core is optional, and no core type names a pack's (R20).
```

- [ ] **Step 4: Run everything and commit**

Run: `npm run verify && npm run test:cli && npm run test:instance-checks && npm run test:instance && npm run build:check && sh conventions/conventions-format && sh conventions/conventions-check`

Expected: all pass.

```bash
git add verify/cli.test.mjs README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The CLI takes the organization pack, and the README names it

An instance takes the pack the way it takes the software pack, and a test now proves init vendors it and the instance it writes passes check. The README's Packs section says two packs ship and what the second one draws.

Verified: npm run verify, test:cli, test:instance-checks, test:instance and build:check pass, and conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

## After the owner's merge

The release, its number and its notes are the owner's. The notes say the pack is new, that it is a minor release, and that an instance takes it with `upgrade --pack organization`. Which members re-pin is the family resync's to compute.
