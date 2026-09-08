# The schemas are normative — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hold `example/` to what `core/` declares, and fix the two places it does not: a table
row draws an edge for every reference it names, and a field that becomes an edge is declared
as one.

**Architecture:** Three assertions in `verify/check.mjs`, which reads the schema files and the
instance files rather than a parsed graph. That works because of the order the tasks run in:
once a table row draws an edge for every resolving cell, "produces an edge" and "resolves"
are the same statement, and resolution is a fact about files. `lib/instance.mjs` still consults
no schema; its one change is the table rule.

**Tech Stack:** Node 22 ESM, **no dependencies** anywhere in this repository. `node --test` for
`verify/instance.test.mjs`; `node verify/check.mjs` for the repository's own suite.

**Spec:** `docs/superpowers/specs/2026-09-08-schemas-are-normative-design.md`

## Global constraints

- Branch is `schemas-are-normative`, already created; the spec is committed as `60f4dad` and
  `1c39551`.
- **No dependencies.** Neither `lib/` nor `verify/` imports anything outside `node:`.
- **`verify/check.mjs` does not import the parser.** It asserts against files. Its header says
  so and the architecture above says why it can.
- **`lib/instance.mjs` consults no schema.** The parser change is a rule about tables, not a
  reading of declarations. A patch that has the parser open a schema is a failed task.
- **`parseSchemas` is unchanged** — spec §5. Its `refPattern` at `lib/instance.mjs:324` matches
  `ref → <type>` only, and stays that way, so declaring `organization` as `ref?` adds no edge
  to the core schema graph. That is deliberate, not an oversight; do not "fix" it.
- Nothing under `example/` is edited by this branch. Both mismatches are fixed in the schema
  and the parser, not in the data. Task 3 step 3 edits an example file only to prove a check,
  and reverts it.
- Every rule cited in code must exist in `core/CONVENTIONS.md` — the "rules are written down"
  check (R0) fails otherwise, which is why the conventions move first.
- Commit messages follow the git register: subject under seventy characters, no type prefix, no
  trailing period, one to three short paragraphs, a final line beginning `Verified:`, then the
  `Co-Authored-By` trailer.
- **Do not tag and do not merge.** The plan ends at a pull request.
- `node verify/check.mjs` and `node --test` must pass at the end of **every** task.

## File structure

```
core/CONVENTIONS.md          ref? in the closed vocabulary; R16
core/experience-schema.md    organization becomes ref? → identity
core/manifest.json           version 0.15.0, shape 2
package.json                 version 0.15.0
verify/check.mjs             ref? accepted in Task 1; the three assertions in Task 3
lib/instance.mjs             one edge per resolving cell in a table row
verify/instance.test.mjs     the test that encodes the old rule, and new ones
```

## Measured facts this plan relies on

Counted on 2026-09-08 against this repository at `schemas-are-normative`. Re-measure rather than
trust any of these if a step's output disagrees.

| Fact | Value |
|---|---|
| The suite today | `13 checks passed` |
| Rule headings are **not** in numeric order | R13/R14 sit between R7 and R8; **R0 is last**, at line 289 |
| Highest number used | R15, so R16 is free |
| The closed vocabulary, `core/CONVENTIONS.md:155` | `string`, `number`, `date`, `array`, `enum`, `ref → <type>`, `array of ref → <type>` |
| `TYPE_VOCABULARY`, `verify/check.mjs:69` | the same five non-ref names; ref forms matched separately |
| Every `ref →` column in `core/` | exactly two: `Skill` and `Level`, both in `profile-schema.md`'s Skills table |
| Every `ref →` frontmatter field | `source` on seven types, `kind`, and `skills` as `array of ref` |
| Existing resolution check | "example references" (R4), which hardcodes `columnsOf("profile", "Skills")` |
| `example/` today | 41 edges, **5 from tables**, 24 entities |
| `robertblust/mental-model` today | 520 edges, **70 from tables**, 124 entities |
| Every table-derived row is a Skills row | so each gains exactly one edge: 5 → 10 and 70 → 140 |
| `check.mjs` helpers already present | `sectionsOf`, `tableOf`, `blocksOf`, `parseTable`, `typeOfFile`, `frontmatterOf`, `fmScalar`, `walkMd`, `fieldsOf` |

---

### Task 1: The declarations move first

Nothing here changes what an instance parses to. It comes first because R16 must exist before
Task 3 cites it, and because `ref?` must be a legal type before a schema is allowed to use it —
without that, `core/experience-schema.md` fails the "type vocabulary" check and the task lands
red.

**Files:**
- Modify: `core/CONVENTIONS.md`, `core/experience-schema.md`, `verify/check.mjs`,
  `core/manifest.json`, `package.json`

**Interfaces:**
- Produces: `R16`, the `ref? → <type>` form, `organization` declared as one, and a
  `TYPE_VOCABULARY` check that accepts `ref?`.

- [ ] **Step 1: Add `ref?` to the closed vocabulary**

In `core/CONVENTIONS.md`, the sentence at line 155 reads:

```
Required is `Yes` or `No`. Types come from the closed vocabulary: `string`, `number`, `date`,
`array`, `enum`, `ref → <type>`, `array of ref → <type>`. A reference names one entity, so
the type it points at is singular: `ref → skill`, never `ref → skills`.
```

Add `ref? → <type>` to that list and define it in the prose that follows, in the file's voice.
What it must convey, cause before mechanism: some fields name a thing that is sometimes an
entity and sometimes not — an employer that is the company itself, a client that is nobody
here — and `ref?` is how a schema says so. A value that resolves becomes an edge; a value that
does not stays a string, and neither is an error.

It must also distinguish `?` from `Required`, because the two read as one thing: `Required`
says whether the field may be absent, `ref?` says whether a value that is present must resolve.
A field can be both, and `organization` is.

The paragraph further down beginning "Where each form is legal follows from one distinction"
sets out which types a frontmatter field may take and which a column may. Extend it: `ref?` is
legal in both, and `array of ref?` is not a form — the optionality is about one value.

- [ ] **Step 2: Write R16**

Add `### R16 — An instance is held to what its schema declares` **after R15 and before R0**.
The file is not in numeric order and R0 sits deliberately last, so "after R15" is a position,
not an arithmetic consequence. Use the shape the other rules use: the rule, then what it costs,
then what it buys.

What it must state: a field or column declared `ref → <type>` or `array of ref → <type>` draws
an edge from every page that carries it; one declared `ref? → <type>` draws one when its value
resolves; a field declared anything else draws none; and a field declared `number` is written
as digits.

Say why `number` is about the written form rather than a parsed type, because a reader will
otherwise take it for a bug: this is a model made of Markdown, every value in a file is text,
and what a serializer emits is its own business. The measured reason belongs here too — a rule
reading "digits become a number" would turn a year-only date into an integer, and dates written
`YYYY` are legal by R9.

- [ ] **Step 3: Teach the vocabulary check the new form**

In `verify/check.mjs`, the "type vocabulary" check (R9) reads a declared type and matches:

```js
            const ref = declared.match(/^(array of )?ref → (.+)$/);
```

A declared `ref? → identity` matches neither that nor `TYPE_VOCABULARY`, so it would fail as
"outside the vocabulary". Widen the match to accept an optional `?` after `ref`, while keeping
both existing failures working on it — an unknown target type, and a plural target. Reject
`array of ref?` explicitly with its own message rather than letting the regex accept it: the
`?` asks about one value, so the combination has no meaning.

Leave `refFieldsOf` (the `/^(?:array of )?ref → (.+)$/` in the "example references" check)
**alone**. It selects the fields that are required to resolve, and a `ref?` field is exactly
the one that is not. It already excludes `ref?` by not matching it, and that is the correct
behavior rather than an omission — say so in a comment beside it, because the next reader will
otherwise see an inconsistency and close it.

- [ ] **Step 4: Declare `organization`**

In `core/experience-schema.md`, line 31 reads:

```
| `organization` | No | string | Where the period was spent. What it names depends on the `kind` — an employer, a client, a host, an awarding body — and each kind says which. |
```

Change the type to `ref? → identity`, keep `Required` as `No`, and extend the description with
the fact the type now carries: it draws an edge when it names the company the instance
describes, and stays a fact when it names anyone else.

- [ ] **Step 5: Move the version and the shape**

`core/manifest.json` becomes `{ "version": "0.15.0", "shape": 2 }`. `package.json`'s `version`
becomes `0.15.0`. Both together — the "release manifest" check compares the manifest against
any tag on HEAD, and there is none, but the two files must not disagree with each other.

The spec's §2 says why a vocabulary change moves `shape` while the release stays a minor. Do
not re-litigate it; if the reasoning looks wrong, report rather than change the numbers.

- [ ] **Step 6: The repository still holds**

Run: `node verify/check.mjs`
Expected: `✓ 13 checks passed`. R16 is defined and not yet cited, which the R0 check permits —
it fails on a rule cited in code and missing from the prose, not the other way round.

Run: `node --test`
Expected: passes.

- [ ] **Step 7: Commit**

```bash
git add core/CONVENTIONS.md core/experience-schema.md verify/check.mjs core/manifest.json package.json
git commit -F - <<'MSG'
A schema can say a name is sometimes an entity

`organization` names where a period was spent — an employer, a client, a host. Sometimes that
is the company the instance describes and the parser draws an edge; usually it is somebody
outside the graph and the value stays a fact. The schema had no way to say that, so it said
`string`, and the graph disagreed with it on two pages.

The closed vocabulary gains `ref? → <type>` for exactly that, and R16 states what a schema's
types now bind: a declared reference draws an edge, anything else draws none, and a number is
written as digits. The last is about the written form, because this is a model made of
Markdown where every value in a file is text.

The shape moves with the vocabulary while the release stays a minor. The spec says why: a
version tier says what an instance must do, and with no tooling built the answer is nothing,
but the shape number states which vocabulary a core carries and that has changed.

Verified: node verify/check.mjs reports 13 checks passed and node --test passes.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 2: A row draws an edge for every reference it names

**Files:**
- Modify: `lib/instance.mjs`, `verify/instance.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: a graph where a table row yields one edge per resolving cell. Every consumer of
  `parseInstance` sees more edges once it re-pins. Task 3 depends on this: it is what makes
  "produces an edge" and "resolves" the same statement.

- [ ] **Step 1: Rewrite the test that encodes the old rule**

`verify/instance.test.mjs:168` is named "a table row's first resolving cell is the edge; other
cells are attrs, resolved where they can be". That name and its assertions are the rule this
task changes, so the test changes with it rather than being deleted: rename it to say a row
draws an edge for every cell that resolves, and assert that a row naming two entities produces
two edges, each carrying the row's other cells as `attrs`.

Keep what it already asserts about a cell that resolves being stored resolved in `attrs` — that
does not change for the cells which are not this edge.

- [ ] **Step 2: Add the cases the new rule needs**

Append to `verify/instance.test.mjs`:

- a row naming exactly one entity still produces one edge, with the other cells as `attrs`;
- a row naming none is still the R4 error it was, with the same message;
- each of the two edges from a two-reference row carries its own `via`, `<section>.<column>`,
  naming the column that produced it.

The existing test "a table whose rows resolve to nothing at all is data" already covers a table
that draws nothing. Confirm it still passes; do not duplicate it.

- [ ] **Step 3: Run them to make sure they fail**

Run: `node --test verify/instance.test.mjs`
Expected: FAIL on the rewritten test — one edge where two are asserted. The single-reference
and no-reference cases pass already, because the old rule agrees with the new one there.

- [ ] **Step 4: Change the rule**

In `lib/instance.mjs`, the loop reads:

```js
      for (const row of s.table.rows) {
        let to = null; const attrs = {}; let via = "";
        s.table.columns.forEach((col, i) => {
          const cell = row[i] ?? "";
          const resolved = one(cell, e.path);
          if (resolved && !to) { to = resolved; via = `${s.heading}.${col}`; }
          else attrs[col] = resolved ?? cell;
        });
        if (!to) throw new Error(`R4: row "${row[0]}" in ${e.path} names no entity`);
        edges.push({ from: e.id, to, via, attrs });
      }
```

Replace it with a pass that resolves every cell once, then emits one edge per resolving cell
with the row's other cells as that edge's `attrs`:

```js
      for (const row of s.table.rows) {
        const cells = s.table.columns.map((col, i) => {
          const cell = row[i] ?? "";
          return { col, cell, resolved: one(cell, e.path) };
        });
        const refs = cells.filter((c) => c.resolved);
        if (!refs.length) throw new Error(`R4: row "${row[0]}" in ${e.path} names no entity`);
        // A row draws an edge for every reference it names, not only the first (R16). A skill
        // rated at a level names two entities and was one edge, so the level a profile claims
        // was reachable only by reading a string out of the skill edge's attrs — declared,
        // required, and drawn nowhere. Each edge carries the row's other cells, so a reader
        // who had the level in attrs still has it.
        for (const ref of refs) {
          const attrs = {};
          for (const c of cells) if (c !== ref) attrs[c.col] = c.resolved ?? c.cell;
          edges.push({ from: e.id, to: ref.resolved, via: `${s.heading}.${ref.col}`, attrs });
        }
      }
```

The R4 error keeps its wording and its condition: a row errors when nothing in it resolves, so
a misspelled cell beside a correct one is still not an error, which is what the old rule was
protecting.

- [ ] **Step 5: Run the tests**

Run: `node --test`
Expected: every test passes.

Run: `node verify/check.mjs`
Expected: `✓ 13 checks passed`.

- [ ] **Step 6: Measure what the change does to both instances**

The spec claims 5 more edges here and 70 more in `robertblust/mental-model`. Prove it rather
than repeat it. Write this to a scratch file and run it:

```js
import { parseInstance } from "./lib/instance.mjs";
import fs from "node:fs"; import path from "node:path";
const read = (root) => {
  const files = new Map();
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.set(path.relative(root, p).split(path.sep).join("/"), fs.readFileSync(p, "utf8"));
  } };
  walk(root); return files;
};
for (const [label, root] of [
  ["example/", "./example/model"],
  ["mental-model", "/Users/rob/git/robertblust/mental-model/model"],
]) {
  if (!fs.existsSync(root)) { console.log(`${label}: not present`); continue; }
  const g = parseInstance(read(root), { sub: "model/" });
  const tbl = g.edges.filter((e) => e.via.includes("."));
  console.log(`${label}: ${g.edges.length} edges, ${tbl.length} from tables`);
}
```

Expected: `example/` reports **46 edges, 10 from tables** where it reported 41 and 5;
`mental-model` reports **590 edges, 140 from tables** where it reported 520 and 70.

`robertblust/mental-model` is outside this repository. `REPOSITORIES.md` scopes an agent to the
repository it works in, and this step reaches for one other, for one purpose: the spec makes a
number a claim about a drawing that is live today, and a claim like that is measured before it
ships. If that checkout is absent, say so and report the step unmeasured rather than passed.

- [ ] **Step 7: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs
git commit -F - <<'MSG'
A table row draws an edge for every reference it names

The first resolving cell of a row became the edge and the rest became its attrs. A skill rated
at a level names two entities, so the level a profile claims was reachable only by reading a
string out of the skill edge's attrs — declared `ref → proficiency-level`, required, and drawn
nowhere. Nothing walking the graph could get from a profile to a level.

Each resolving cell now draws its own edge, carrying the row's other cells. What the old rule
protected is untouched: a row errors only when nothing in it resolves, so a misspelled cell
beside a correct one is still not the R4 it never was.

Every consumer sees more edges when it re-pins, and that is the point rather than a side
effect: a drawing that could not show how a skill was rated now shows it.

Verified: node --test and node verify/check.mjs pass; table edges go from 5 to 10 in example/
and from 70 to 140 in robertblust/mental-model.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 3: The check

Read this preamble before writing code, because it decides what the assertions may look at.

`check.mjs` imports no parser, so it cannot observe an edge. It does not need to: after Task 2,
a cell draws an edge exactly when it resolves to some entity's H1, and resolution is a fact
about files that this script already reads. That equivalence is what the assertions rest on,
and it holds only in this order — which is why the check is last.

Be honest about what each one adds. Assertion 1 does **not** catch the `Level` mismatch; Task 2
did, and under the old rule `Level` resolved while drawing nothing, which no file-level check
could see. What assertion 1 adds is generality: the existing "example references" check reaches
body-table columns through a hardcoded `columnsOf("profile", "Skills")`, and the file header
admits it — "'## Skills' is the one body table it knows to look for; a second table-valued
section would need naming here." Assertion 1 replaces that hardcoding. Assertion 2 is new, and
is what found `organization`. Assertion 3 is new.

**Files:**
- Modify: `verify/check.mjs`

**Interfaces:**
- Consumes: R16 from Task 1, `ref?` being a legal type from Task 1, and the parser's new rule
  from Task 2.

- [ ] **Step 1: Write the assertions**

Add one entry to `CHECKS`, `rule: "R16"`, in the shape the others use. For every type, read its
declarations with the helpers already there — `fieldsOf(type)` for frontmatter, and `sectionsOf`
plus `blocksOf` for the column tables, selecting a column table **by its caption**, the way the
"type vocabulary" check does. `CONVENTIONS.md` states that "the caption, not the position, is
what says which section the columns belong to", so position must not be used. Then walk
`example/` with `walkMd` and, for each file whose `typeOfFile` names a type, assert:

1. **A declared reference is drawn.** A frontmatter field declared `ref → <t>` or `array of ref
   → <t>` and present in the file must name an entity of type `<t>`; every cell of a body-table
   column declared `ref → <t>` must too. A `ref? → <t>` is exempt — that is what the `?` says.
2. **Nothing else is drawn.** A frontmatter field declared something other than a reference
   must **not** match any entity's H1, because after Task 2 the parser would draw an edge from
   it. `ref?` is what a schema writes when it may.
3. **A number is digits.** A field declared `number` must match `/^-?\d+$/` in the frontmatter.

Assertion 1 supersedes the `SKILL_COLUMNS` half of the "example references" check. Remove that
hardcoding rather than leaving two definitions of one rule; keep `refFieldsOf` and the rest of
that check, which cover resolution of frontmatter references against a named target folder.
If removing it turns out to lose coverage assertion 1 does not have, keep it and report why.

- [ ] **Step 2: It passes**

Run: `node verify/check.mjs`
Expected: `✓ 14 checks passed`. This is the whole point of the ordering — the two mismatches
these assertions would report were fixed in Tasks 1 and 2, so the check lands green rather than
red. If the count is not 14, say what it is rather than reporting "passed".

If it fails, read what it says before changing anything. A failure here is either a real third
mismatch nobody has found, or an assertion that is wrong; both are worth reporting rather than
tuning away.

- [ ] **Step 3: Prove each assertion by breaking what it holds**

Each break must fail its own assertion and no other. Do them one at a time and revert each
before the next. Note that break 1 edits an example file — the only edit under `example/` this
branch makes, and it is reverted, not committed.

```bash
# 1. a declared reference that names nothing — break the instance, not the schema
sed -i '' 's/| Competent |/| Journeyman |/' example/model/profiles/*/README.md 2>/dev/null \
  || grep -rn 'Competent' example/model/profiles/
node verify/check.mjs; git checkout example/model/profiles/

# 2. a non-reference whose value resolves — the finding that started this work
sed -i '' 's/| `organization` | No | ref? → identity |/| `organization` | No | string |/' core/experience-schema.md
node verify/check.mjs; git checkout core/experience-schema.md

# 3. a number that is not digits
sed -i '' 's/^rank: 20$/rank: twenty/' example/model/proficiency-levels/competent.md
node verify/check.mjs; git checkout example/model/proficiency-levels/competent.md
```

Break 1's `sed` names a file whose path this plan did not verify — find the Skills table under
`example/model/profiles/` first and edit a `Level` cell to a name no proficiency level carries.
The requirement is the point, not the command: a declared `ref →` column whose value resolves to
nothing.

Expected: each run fails, naming R16 and the file, and reports exactly one failing check.
Report the three messages verbatim.

If any break passes, that assertion is asserting nothing — stop and report it. If a break fails
**two** checks, the assertions overlap something that still hardcodes the same rule; say which,
because step 1's removal of `SKILL_COLUMNS` was supposed to prevent exactly that.

- [ ] **Step 4: The repository still holds**

Run: `node verify/check.mjs && node --test && git status --porcelain`
Expected: 14 checks pass, the tests pass, and the tree is clean — every break reverted.

- [ ] **Step 5: Commit**

```bash
git add verify/check.mjs
git commit -F - <<'MSG'
The example is held to what the schemas declare

core/ declared a type system and nothing checked an instance against it. The parser says so in
its first lines — no schema is consulted — and this file said it from the other side. So the
declarations and the graph agreed only where the parser's resolution rules happened to coincide
with them, and a reader comparing the two by hand found two places they did not.

Three assertions close that: a declared reference is drawn, nothing else is, and a number is
written as digits. They read files rather than a parsed graph, which works because a cell now
draws an edge exactly when it resolves. Reaching a body table by its caption also retires the
hardcoded "## Skills", the one such table this script knew how to look for.

The check lands green because the two mismatches it would report were fixed first — one in the
vocabulary and one in the parser — which is why this commit is last rather than first.

Verified: node verify/check.mjs reports 14 checks passed and node --test passes; each assertion
was proved by breaking what it holds, and each break failed its own assertion and no other.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

- [ ] **Step 6: Open the pull request and stop**

```bash
git push -u origin schemas-are-normative
```

Then open a pull request against `main` describing the change in the git register — the commit
body reread for a reviewer who has not seen the diff. It must say that both instances gain
edges when they re-pin, and how many.

**Do not tag, do not merge, and do not touch either site.** Those are the owner's.

---

## What follows, for the owner

Not steps in this plan.

**The release is 0.15.0**, a minor with `shape` 2, for the reasons the spec's §2 records. The
tag sits on the commit where `manifest.json` says `0.15.0`, which the release-manifest check
enforces.

**Then two instances gain edges when they re-pin.** `companygraph.io` gains 5, and its
`/example/` drawing gains 5 lines. `robertblust/mental-model` gains 70, so `blust.ch`'s
`/model/` drawing gains 70 profile-to-level lines. Both sites' stage cards re-render, so
`npm run og` and a committed card belong in each re-pin. Neither site moves until its pin does.

## Self-review

**Spec coverage.** §2's three assertions are Task 3; its `number`-as-written-form reading is R16
in Task 1 step 2; its table rule is Task 2; its `ref?` form and `organization` are Task 1 steps
1 and 4; its release decision is Task 1 step 5. §5's deferred items are deliberately not tasks,
and `parseSchemas` staying put is a global constraint. §6's proof-by-breaking is Task 3 step 3
and its edge re-measurement is Task 2 step 6.

**Three defects found against the files and fixed here.** R16 was to go "after R15" as though the
file were ordered numerically; it is not, and R0 is last, so the step names a position. Task 1
originally left `check.mjs` untouched, which would have made `ref? → identity` fail the "type
vocabulary" check and landed the task red — step 3 now widens it. And Task 3's original proof of
assertion 1 broke a schema, which would have tripped the existing `SKILL_COLUMNS` check as well;
it now breaks an instance value, and step 1 removes the hardcoding that would otherwise double
up.

**Placeholders.** One deliberate: Task 3 step 3's break-1 `sed` names a path this plan did not
verify, and says so, giving the requirement instead. Everything else carries its literal text.

**Type consistency.** `parseInstance` and `parseSchemas` keep their signatures. The new loop
emits the same edge shape as before — `{ from, to, via, attrs }` — with `via` still
`` `${section}.${column}` ``.

**Two risks worth naming.** Task 2 changes what every consumer parses and no test here can see a
consumer; step 6 measures both instead. And Task 3's assertions are the kind that pass while
asserting nothing, which is why step 3 breaks each one rather than trusting a green run.
