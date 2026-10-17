# A decision is an entity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gains the types `decision`, `decision-kind` and `decision-status`, the Obsidian plugin adopts them, and all three instances carry their kinds, their four statuses and their first-round decisions, live on every site and MCP host.

**Architecture:** The three types are Markdown schemas in `core/` written in existing vocabulary, so the parser and checker read them with no new code beyond three rows in the checker's `TYPES` table, one of which reuses the experience's filename form with `decided` as the year field. The reference instance is seeded first because the plugin's e2e vault is that instance at a pinned commit; the plugin then re-pins and proves the type; the other two instances follow; the sites and hosts re-pin last.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, TypeScript Obsidian plugin with a CDP-driven e2e suite, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-a-decision-is-an-entity-design.md` (this branch).

## Global Constraints

- Type ids `decision`, `decision-kind`, `decision-status`; folders `model/decisions/*.md`, `model/decision-kinds/*.md`, `model/decision-statuses/*.md`; all owned by nothing; schema files `core/decision-schema.md`, `core/decision-kind-schema.md`, `core/decision-status-schema.md`.
- A decision file is named `<year of decided>-<chosen slug>.md`, the form `experience` states with `start`.
- On every decision: `by` names a role and never a person; `## Alternatives` carries at least one row and never the option taken; a decision is never rewritten to say something else.
- In the instances: `by: Owner`, `source: Local`, the four statuses Proposed, Standing, Revised and Dropped, and every first-round decision `status: Standing`.
- The first person is "I" in robertblust/mental-model and "we" in the other two, and the same throughout each instance.
- American English everywhere (R14); commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers; no em-dash in any model file, schema or commit written here.
- Numbers that move are never written: no count of decisions, types or releases in any prose. A number fixed by a closed period may stand.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag and a release each wait for Rob's explicit go. Each instance PR goes to Rob entry by entry.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- A re-pin installs the package by name after removing the lockfile entry, and is proved by reading `packages["node_modules/companygraph-meta-model"]` in `package-lock.json`, never by a grep. This repository keeps no lockfile.
- Before tagging meta-model, `version` in `package.json` and the `ref:` in `.github/workflows/instance-check.yml` name the same release.

## Review Focus

- A decision whose filename year is not the year in `decided`: an author who moves a proposed call's date expects the checker to say the file is misnamed; Task 1 tests it, since `experience` has been the form's only user until now.
- A `## Bears on` row naming an experience with a blank `Owner`: expected to fail as an owned type without its owner, not to resolve against the nearest profile; Task 1 tests it.
- An `## Alternatives` table written as its header row alone: it passes the mechanical checks, as every table does, and the writing rule is what refuses it; Task 1 pins that it passes, so a future change that starts failing it is a decision, not an accident.
- A `decision-kinds/` or `decisions/` folder the checks never read: every file in it would pass because none was looked at; Task 2 Step 1 shows verify failing on a stray file there before the real ones are written.
- The plugin fixture pinned to a pre-decision commit of the reference instance: the e2e suite would pass with no decision to find; Task 5 asserts the fixture holds `model/decisions/2026-architect-role.md` before any decision test runs.

---

## Phase A — meta-model (worktree `meta-model-decision`, branch `decision`, which already holds the spec)

### Task 1: The three schemas and the checker's rows

**Files:**

- Create: `core/decision-kind-schema.md`, `core/decision-status-schema.md`, `core/decision-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, after the `kpi` row)
- Create: `verify/decision.test.mjs`
- Modify: `package.json` (`test:instance-checks` script)

**Interfaces:**

- Produces: three `TYPES` rows, `{ type: "decision-kind", folder: "decision-kinds" }`, `{ type: "decision-status", folder: "decision-statuses" }` and `{ type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" } }`; the three schemas below, which Tasks 2, 4, 6 and 7 write against.

- [ ] **Step 1: Write the failing test** — `verify/decision.test.mjs`

```js
// The decision type and its two companions, held by the instance checks through their real
// schemas: the three files are read from disk so the test fails if a schema and the checks part.
// The schemas they reference are bare, as ref-by.test.mjs has them, because only the decision
// file's own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, owner, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []), "## File Location", "", `\`${location}\``, ""];
const bare = (type, owner, location) => [...head(type, owner, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const ALTERNATIVES = ["| Option | Why not |", "| --- | --- |", "| Resolve core at read time | The vocabulary would move under every model at once. |"];
const decision = (name, fm, { sections = ["The question", "Why", "Consequences"], alternatives = ALTERNATIVES, bearsOn = null } = {}) => [
  "---", ...fm, "---", "", `# ${name}`, "", "> The call.", "",
  "## The question", "", "Prose.", "",
  "## Alternatives", "", ...alternatives, "",
  ...sections.filter((s) => s !== "The question").flatMap((s) => [`## ${s}`, "", "Prose.", ""]),
  ...(bearsOn ? ["## Bears on", "", "| Type | Entity | Owner | How |", "| --- | --- | --- | --- |", ...bearsOn.map((r) => `| ${r.join(" | ")} |`), ""] : []),
].join("\n");
const GOOD = ["source: Local", "decided: 2026-08-25", "kind: Architecture", "status: Standing", "by: Owner", "upholds:", "  - Craftsmanship", "supersedes:", "  - Core is a submodule"];

const tree = (fm, opts, filename = "2026-vendored-core.md") => new Map([
  ["meta/core/decision-schema.md", real("decision")],
  ["meta/core/decision-kind-schema.md", real("decision-kind")],
  ["meta/core/decision-status-schema.md", real("decision-status")],
  ["meta/core/source-schema.md", bare("source", null, "model/sources/*.md")],
  ["meta/core/role-schema.md", bare("role", null, "model/roles/*.md")],
  ["meta/core/value-schema.md", bare("value", null, "model/values/*.md")],
  ["meta/core/concept-schema.md", bare("concept", null, "model/concepts/*.md")],
  ["meta/core/profile-schema.md", bare("profile", null, "model/profiles/<profile>/<profile>.md")],
  ["meta/core/experience-schema.md", bare("experience", "profile", "model/profiles/<profile>/experiences/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/roles/owner.md", "# Owner\n\n> The seat.\n"],
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
  ["model/concepts/core.md", "# Core\n\n> The shipped unit.\n"],
  ["model/profiles/mira-halvorsen/mira-halvorsen.md", "# Mira Halvorsen\n\n> Engineer.\n"],
  ["model/profiles/mira-halvorsen/experiences/2022-beacon.md", "# Splitting the billing domain\n\n> A period.\n"],
  ["model/decision-kinds/architecture.md", "---\nsource: Local\n---\n\n# Architecture\n\n> How the tooling is built.\n\n## What it means\n\nProse.\n"],
  ["model/decision-statuses/standing.md", "---\nsource: Local\n---\n\n# Standing\n\n> Holds as written.\n\n## What it means\n\nProse.\n"],
  ["model/decisions/2026-submodule.md", decision("Core is a submodule", ["source: Local", "decided: 2026-08-20", "kind: Architecture", "status: Standing", "by: Owner"])],
  [`model/decisions/${filename}`, decision("Core is vendored at a named release", fm, opts)],
]);
const about = (fm, opts, filename, ...words) =>
  checkInstance(tree(fm, opts, filename), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("decisions/") && !f.includes("2026-submodule.md") && words.every((w) => f.includes(w)));

test("a decision with every required field and section, upholding a value and superseding another, passes", () => {
  assert.deepEqual(about(GOOD), []);
});

test("a Bears on table naming a concept and an owned experience with its owner passes", () => {
  assert.deepEqual(about(GOOD, { bearsOn: [["concept", "Core", "", "changed it"], ["experience", "Splitting the billing domain", "Mira Halvorsen", "made it"]] }), []);
});

test("an Alternatives table written as its header row alone passes the mechanical checks; the writing rule refuses it", () => {
  assert.deepEqual(about(GOOD, { alternatives: ALTERNATIVES.slice(0, 2) }), []);
});

test("a filename whose year is not the year in decided fails naming both", () => {
  assert.equal(about(GOOD, undefined, "2025-vendored-core.md", "begins with 2025", "`decided` says 2026-08-25").length, 1);
});

test("a filename that is not <year>-<slug> fails", () => {
  assert.equal(about(GOOD, undefined, "vendored-core.md", "<year>-<slug>.md").length, 1);
});

test("a missing kind fails", () => {
  assert.equal(about(GOOD.filter((l) => !l.startsWith("kind")), undefined, undefined, "no `kind`").length, 1);
});

test("a kind naming no decision kind fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("kind: Architecture", "kind: Pricing")), undefined, undefined, "\"Pricing\"").length, 1);
});

test("a status naming no decision status fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("status: Standing", "status: Taken")), undefined, undefined, "\"Taken\"").length, 1);
});

test("a by naming no role fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("by: Owner", "by: Mira Halvorsen")), undefined, undefined, "\"Mira Halvorsen\"").length, 1);
});

test("a supersedes naming no decision fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Core is a submodule", "  - Core is fetched nightly")), undefined, undefined, "\"Core is fetched nightly\"").length, 1);
});

test("a Bears on row whose Type names no type fails", () => {
  assert.equal(about(GOOD, { bearsOn: [["widget", "Core", "", "changed it"]] }, undefined, "widget").length, 1);
});

test("a Bears on row naming an experience with no Owner fails as an owned type without its owner", () => {
  assert.equal(about(GOOD, { bearsOn: [["experience", "Splitting the billing domain", "", "made it"]] }, undefined, "experience").length, 1);
});

test("an Alternatives table with a column the schema does not declare fails naming the declared ones", () => {
  const alternatives = ["| Option | Cost | Why not |", "| --- | --- | --- |", "| Read time | High | Moves under every model. |"];
  assert.equal(about(GOOD, { alternatives }, undefined, "\"## Alternatives\" columns are Option|Cost|Why not", "declares Option|Why not").length, 1);
});

test("a missing Why fails", () => {
  assert.equal(about(GOOD, { sections: ["The question", "Consequences"] }, undefined, "no `## Why`").length, 1);
});
```

- [ ] **Step 2: Add the test to the script and run it to see it fail**

In `package.json`, append ` verify/decision.test.mjs` to the end of the `test:instance-checks` command.

Run: `node --test verify/decision.test.mjs` Expected: FAIL — `core/decision-schema.md` does not exist (ENOENT).

- [ ] **Step 3: Write `core/decision-kind-schema.md`**

```markdown
# Decision Kind Schema

> Required structure for decision kind files.

## File Location

`model/decision-kinds/*.md`

A kind owns nothing and nothing owns it: many decisions claim the same few, and what each kind means lives here rather than being restated on every call. It sits at the container root beside `experience-kinds/`, because every decision in the instance claims one of the same set.

The set is the instance's own, as an experience kind's is. Which sorts of call a company distinguishes, an architecture from a hire from a price, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which calls belong to this kind, and which do not |

## Purpose

A kind answers "what sort of call is this?", the question a reader cannot otherwise ask of a folder that holds a hire, a license and a data model side by side. Its value is that the answer is a reference rather than a word: two decisions of one kind mean the same sort of thing, the kinds are visible in the graph as nodes, and a page can draw the calls of one kind together.

## Writing rules

- `## What it means` is written so that two readers filing the same call would file it under
  the same kind. A kind that cannot do that is not yet a kind.
- It says what the kind excludes as well as what it covers, since the boundary with the kind
  beside it is where every disagreement will be.
- A kind is about the sort of call, never about how large it was, how it turned out or who
  made it. Those belong to the decision.
- Name it for what the calls are, `Architecture`, `Career`, and never for the section or the
  type they sit in.
- No rank: kinds never order anything inside a page, and two kinds are told apart by what they
  cover, not by a number.
```

- [ ] **Step 4: Write `core/decision-status-schema.md`**

```markdown
# Decision Status Schema

> Required structure for decision status files.

## File Location

`model/decision-statuses/*.md`

A status owns nothing and nothing owns it: every decision carries one, and what each state means lives here rather than in a token whose meaning every reader guesses. It sits at the container root beside `decision-kinds/`, because every decision in the instance is in one of the same set of states.

The set is the instance's own. Which states a company lets a call be in, whether a call can be proposed before it is made, whether a dropped call is told from a replaced one, is a fact about the company, and a state arriving later is one file here, not a change to this metamodel.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every decision references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the state means |
| `## What it means` | Yes | When a call is in this state, when it leaves it, and what a reader may rely on while it is |

## Purpose

A status answers "is this call made, and does it still hold?" for someone about to act on it. A decision file is never rewritten to say something else, so the status is the one thing on it that moves, and what each state licenses a reader to do is written once here rather than guessed from a word.

## Writing rules

- `## What it means` says what a reader may rely on: a proposed call is not acted on, a
  standing call is, a replaced one is read through the decision that replaced it.
- It says how a call leaves the state, which decision or event moves it on, so that a status
  is never changed by hand without a reason the model can show.
- An instance has exactly one status for a call that holds as written, and every other status
  says which decision or event moves a call into it.
- A status is about whether the call is made and holds, never about how well it went. What
  came of a call is the next decision's question or a period's result.
- Name it for the state of the call, `Standing`, `Revised`, and never for a verdict on it.
```

- [ ] **Step 5: Write `core/decision-schema.md`**

```markdown
# Decision Schema

> Required structure for decision files.

## File Location

`model/decisions/*.md`

Nothing owns a decision and a decision owns nothing: a call bears on entities of every type and belongs to none of them, as a question does. The filename is not the slug of the H1, which is what R12 does by default. It is the year in `decided`, then a `-`, then a slug naming the call, chosen as an experience's is: `2026-architect-role.md`, `2026-vendored-core.md`. The folder then sorts as a log and reads as one. The year must be the year in `decided`, the rest must be a slug by R12, and the two together must be unique in the folder.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `decided` | Yes | date | When the call was made, not when it was carried out. For a call still proposed, when it was put forward. |
| `kind` | Yes | ref → decision-kind | What sort of call this is, the H1 of a file in `decision-kinds/` |
| `status` | Yes | ref → decision-status | Whether the call is made and still holds, the H1 of a file in `decision-statuses/` |
| `by` | Yes | ref → role | The seat that made the call, the H1 of a file in `roles/`. Never the person: who held the seat on that date is the profile's. |
| `upholds` | No | array of ref → value | The values the call was weighed against, each the H1 of a file in `values/` |
| `supersedes` | No | array of ref → decision | Earlier calls this one replaces, each the H1 of a file in `decisions/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Decision]` | Yes | What was decided, stated as a call. Everything references the decision by this exact string. |
| `> [Statement]` | Yes | One paragraph: the call, in the company's own first person |
| `## The question` | Yes | What had to be decided, and why it had to be decided then |
| `## Alternatives` | Yes | Table. The options that lost, one row each; its columns are declared below. |
| `## Why` | Yes | What turned it: the reason the chosen option won, in the terms the call turned on |
| `## Consequences` | Yes | What the call committed the company to, what it gave up, and what has to stay true for the call to stay right |
| `## Bears on` | No | Table. The entities the call made, changed or ended; its columns are declared below. |
| `## References` | No | Table. What a reader can check the call against; its columns are declared below. |

`## Alternatives` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Option` | Yes | string | The option, stated as the call it would have been |
| `Why not` | Yes | string | What taking it would have cost, in one or two sentences |

`## Bears on` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Type` | Yes | string | The type of the entity this row names, as its schema is named: `product`, `experience` |
| `Entity` | Yes | ref → by Type in Owner | The entity the call bears on, by its canonical name |
| `Owner` | No | string | Where `Type` is an owned type, the entity that owns this one, by its canonical name; blank otherwise |
| `How` | No | string | What the call did to it: made it, changed it, ended it |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document, a specification, a contract, a pull request, a slide |
| `URL` | Yes | string | Where it is |

## Purpose

A decision is a call the company made on a date, written with the options that lost, so that whoever arrives after it can disagree with a reason rather than a rewrite. It answers "why is it this way and not the other way, who decided, and does it still hold?" for someone about to re-open a question that was already closed, or about to act on a call that no longer stands. It is not a strategy, which is the route currently taken and is deleted when replaced; a decision is kept as written for as long as the company exists, and its status says whether it holds.

## Writing rules

- The H1 states what was decided, never the topic: "Core is vendored at a named release", not
  "Core distribution". A reader who sees only the name knows the call.
- The statement is a call a reasonable company could have made differently. If no company
  would have chosen otherwise, it describes the work rather than deciding anything.
- `## The question` names what had to be decided and what made it have to be decided then, a
  deadline, an offer, a finding, and states no reason for the answer; the reasons are `## Why`.
- `## Alternatives` carries at least one row, and never the option taken. `Why not` names what
  the option would have cost, in the terms the call turned on, not that it was worse.
- `## Why` gives the reason the chosen option won, concretely enough that a reader could tell
  whether it would still win today. A reason that would equally support any of the
  alternatives supports none.
- `## Consequences` names what the company is now committed to and what it gave up, and states
  what has to stay true for the call to stay right, because that is what a reader watches for.
- `decided` is the date the call was made, at the precision the source states, never the date
  it was carried out. A call still proposed carries the date it was put forward, and takes the
  date of the call when its status leaves the proposed state, the file renamed where the year
  moved.
- `by` names the seat, never the person, as a role is person-neutral. In a company of one that
  is one seat; in a company of more it is the seat that answered for the call, and a call that
  several seats made names the one that would have had the last word.
- `upholds` names a value only where it actually turned the call. A value that would be cited
  by any call the company makes tells a reader nothing.
- Every row of `## Bears on` names an entity the call made, changed or ended. An entity the
  call merely mentions is not borne on.
- A decision is not rewritten to say something else. `status` is the one field that moves, and
  `decided` with it once when a proposed call is made; what replaced the call is read from the
  later decision's `supersedes`, and a call that another supersedes carries the status the
  instance keeps for a replaced call. Where a call is dropped and nothing replaced it, one
  dated sentence closing `## Consequences` says so.
- Written in the company's own first person, "I" for a company of one, "we" otherwise, and the
  same one throughout the instance.
- Names and prose are American English (R14).
```

- [ ] **Step 6: Run the test to see the checker ignore the types**

Run: `node --test verify/decision.test.mjs` Expected: FAIL — every "fails" test finds zero failures, because `checkInstance` checks only types `TYPES` lists (the passing tests pass vacuously).

- [ ] **Step 7: Add the three `TYPES` rows** — in `lib/checks.mjs`, directly after `{ type: "kpi", folder: "kpis", noun: "KPI" },`:

```js
  // A decision bears on entities of every type and owner and belongs to none, so it sits in
  // the container, as a question does; its kind and its status are the instance's own sets,
  // as experience kinds are. The decision's filename takes the form experience states, with
  // `decided` as the year: the folder then sorts as a log.
  { type: "decision-kind", folder: "decision-kinds" },
  { type: "decision-status", folder: "decision-statuses" },
  { type: "decision", folder: "decisions", filename: { year: "decided", rest: "chosen" } },
```

- [ ] **Step 8: Run the test to see it pass, then the whole suite**

Run: `node --test verify/decision.test.mjs` Expected: PASS, 14 tests. If a "fails" test finds its failure under different words, read the failure the checker printed and match the test's words to the message in `lib/checks.mjs` (the filename messages near "begins with", the ref-by messages near "names no type", the column messages near "columns are"); never loosen a test to an empty word list.

Run: `npm run verify && node --test verify/*.test.mjs` Expected: PASS. `verify/check.mjs` holds the three schemas to the fixed shape (R9); a failure there names the row to fix. The three new types have no example entities yet, so any check that requires the example to carry every type fails here and is satisfied in Task 2; if it does, commit Tasks 1 and 2 together rather than loosening the check.

- [ ] **Step 9: Commit**

```bash
git add core/decision-kind-schema.md core/decision-status-schema.md core/decision-schema.md lib/checks.mjs verify/decision.test.mjs package.json
git commit -F - <<'EOF'
Core gains the types decision, decision-kind and decision-status

A decision is a call the company made on a date: the question, the options that lost with why each lost, the reasons, the consequences, the seat that made it and the entities it bears on. Its kind and its status are types the instance defines, as experience kinds are, because a set whose members carry a definition is a type and not an enum. Every field is written in vocabulary the checker already reads, so the three types take three rows in TYPES and no new check; the decision's filename reuses the form experience states, with decided as the year field, and the test proves the checker reads that field from the row rather than assuming start. The tests read the real schemas from disk, so a schema and the checks cannot part silently.

Verified: node --test verify/decision.test.mjs failed before the TYPES rows and passes after them; npm run verify and node --test verify/*.test.mjs pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 2: The example carries a decision

**Files:**

- Create: `example/model/decision-kinds/architecture.md`, `example/model/decision-kinds/product.md`
- Create: `example/model/decision-statuses/standing.md`, `example/model/decision-statuses/revised.md`
- Create: `example/model/decisions/2022-billing-leaves-the-monolith.md`
- Modify: `example/model/questions/who-split-billing-out-of-the-monolith.md` (one `## Rests on` row)
- Modify: `example/model/README.md` (type list and tree)

**Interfaces:**

- Consumes: the three schemas (Task 1). The example's seats are `Backend Engineer` and `Reviewer`; Mira Halvorsen holds `Backend Engineer` and owns the experience `Splitting the billing domain`; the example writes "we".

- [ ] **Step 1: See verify read the new folders** — the positive control that they are checked at all: a stray file with nothing a decision needs must fail.

```bash
mkdir -p example/model/decisions example/model/decision-kinds example/model/decision-statuses
printf '# Stray\n\n> x.\n' > example/model/decisions/stray.md
printf '# Stray\n\n> x.\n' > example/model/decision-kinds/stray.md
npm run verify
```

Expected: FAIL naming both stray files (the decision: missing `source`, `decided`, `kind`, `status`, `by`, its required sections, and a filename that is not `<year>-<slug>.md`; the kind: missing `source` and `## What it means`). Then `rm example/model/decisions/stray.md example/model/decision-kinds/stray.md`.

- [ ] **Step 2: Write the two kinds**

`example/model/decision-kinds/architecture.md`:

```markdown
---
source: Local
---

# Architecture

> A call about how the product is built: what is one service and what is two, what is stored and what is derived, what talks to what.

## What it means

A decision whose subject is the shape of the system rather than what it does for a customer: a boundary drawn, a store chosen, a protocol fixed. It is this kind even when a customer feels the result, because what was decided is the structure.

A call about what the product does, which feature ships and for whom, is Product. A call that only picks a library inside a boundary already drawn is nobody's decision to record.
```

`example/model/decision-kinds/product.md`:

```markdown
---
source: Local
---

# Product

> A call about what the product does and for whom: which capability ships, which customer it is for, what it will not do.

## What it means

A decision whose subject is the customer's side of the product: a feature taken on or refused, a market chosen, a promise made on the invoice page. It is this kind even when it forces a change in the structure, because what was decided is the offer.

How the system that carries it is built is Architecture. Which of two ways to build the same offer is chosen is Architecture too.
```

- [ ] **Step 3: Write the two statuses**

`example/model/decision-statuses/standing.md`:

```markdown
---
source: Local
---

# Standing

> The call holds as written, and the work follows it.

## What it means

A decision is Standing from the day it was made until a later decision replaces it. While it stands, a reader acts on it as written and re-opens it only by making a decision that names it in `supersedes`. It leaves this state the day that later decision is made, and becomes Revised.
```

`example/model/decision-statuses/revised.md`:

```markdown
---
source: Local
---

# Revised

> A later decision replaced this call, and the call is read through that decision.

## What it means

A decision is Revised when another decision names it in `supersedes`. Its file stays as it was written, because what was decided on that date does not stop having happened; what holds now is the decision that replaced it, and a reader who arrives here follows the reference forward. A Revised decision never returns to Standing: a company that changes its mind again makes a third decision.
```

- [ ] **Step 4: Write the decision** — `example/model/decisions/2022-billing-leaves-the-monolith.md`

```markdown
---
source: Local
decided: 2022-01
kind: Architecture
status: Standing
by: Backend Engineer
upholds:
  - Craftsmanship
---

# Billing leaves the monolith

> We take billing out of the one service three teams edit and make it a service of its own, owned by one team, with the invoice as its boundary.

## The question

Three teams edited one service, and the second waited on the first to merge before the third could start. Invoice work queued behind pricing work that had nothing to do with it. The question was where to cut, and it had to be decided in January 2022 because the next quarter's invoice changes would otherwise be written into the same service and make the cut dearer.

## Alternatives

| Option | Why not |
| --- | --- |
| Keep one service and add a review rota | The wait moves from the merge to the review and stays a wait, and three teams still ship one thing. |
| Split by team rather than by domain | Three services that each hold part of billing would share the invoice, and every price change would cross all three. |

## Why

The invoice is where the teams already stopped understanding each other's code, so it is the boundary that costs the least to draw and the most to leave. A service owned by one team can be released when that team is ready, which is the whole of what the second team was waiting for.

## Consequences

Two services where there was one, each released by its own team, and a third split still owed to the third team. Every price change now crosses a boundary, which the pricing rules have to be written to survive. The call stays right as long as one team owns the whole invoice; the day two teams edit the billing service, the cut was in the wrong place.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | Splitting the billing domain | Mira Halvorsen | made it |
```

- [ ] **Step 5: The question rests on it** — in `example/model/questions/who-split-billing-out-of-the-monolith.md`, change the answer line to

```markdown
> The period in which the billing domain was split is Mira Halvorsen's, and it says what was done; the decision to split says why.
```

and add a row to the `## Rests on` table after the experience row:

```markdown
| decision | Billing leaves the monolith |  | why |
```

- [ ] **Step 6: Update `example/model/README.md`**

In the "It uses every core type" sentence, add `` `decision`, `decision-kind`, `decision-status`, `` after `` `question` ``. In the tree, after the `questions/` block, add:

```
decision-kinds/                  architecture.md, product.md
decision-statuses/               standing.md, revised.md
decisions/                       2022-billing-leaves-the-monolith.md
```

- [ ] **Step 7: Run verify and the suite**

Run: `npm run verify && node --test verify/*.test.mjs && node bin/check-instance.mjs example` Expected: PASS; "the example parses with the parser this package ships" passes with the decision among its entities. (If `bin/check-instance.mjs` takes a different argument form, run it as `.github/workflows/verify.yml` does.) Then `sh conventions/conventions-check && sh conventions/conventions-format check`.

- [ ] **Step 8: Commit**

```bash
git add example/
git commit -F - <<'EOF'
The example carries a decision

Beacon's decision that billing leaves the monolith, under an Architecture kind and a Standing status, made by the Backend Engineer seat and bearing on the period that carried it out, so the instance checks exercise a ref-by row pointing at a decision on a real tree; the question about who split billing now rests on it as well.

Verified: npm run verify failed on stray files in example/model/decisions/ and example/model/decision-kinds/ before these were written and passes with them; node --test verify/*.test.mjs passes.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 3: The release and its lists

**Files:**

- Modify: `README.md` (both type lists: the `*-schema.md` block and the "`core/` is the list" sentence)
- Modify: `core/manifest.json` → `{ "version": "0.43.0", "shape": 3 }`
- Modify: `package.json` → `"version": "0.49.0"`
- Modify: `.github/workflows/instance-check.yml` → `ref: v0.49.0`

- [ ] **Step 1: Edit the lists** — in `README.md`'s tree, the schema list gains `decision, decision-kind, decision-status` after `question` (re-wrap the block's lines to keep their width); in the "`core/` is the list" sentence, the list ends `…, concept, question, decision, decision-kind and decision-status`.

- [ ] **Step 2: Move the three version places together** — `core/manifest.json`, `package.json` and `instance-check.yml` as listed above. No lockfile is written; this repository keeps none.

- [ ] **Step 3: Run everything**

Run: `npm run verify && node --test verify/*.test.mjs && sh conventions/conventions-check && sh conventions/conventions-format check` Expected: PASS; the release check in `verify/check.mjs` passes because the ref and the version agree.

- [ ] **Step 4: Commit, push, open the PR, and stop**

```bash
git add README.md core/manifest.json package.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
Core 0.43.0 and the package at 0.49.0

The README names decision, decision-kind and decision-status among the schemas, core's manifest moves by a minor for the new types, and the package version and the instance workflow's ref move together to the release they will be tagged as.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -u origin decision
gh pr create --title "A decision is an entity" --body-file <(cat <<'EOF'
Core gains three types. A decision is one file per call the company made: what was decided, what the question was, the options that lost and why each lost, the reasons, the consequences, the seat that made it and the entities it bears on. Its kind and its status are types the instance defines, as experience kinds are, because a set whose members carry a definition is a type and not an enum; a later decision names what it supersedes and the earlier file stays as written. The spec and plan are in docs/superpowers; the spec records the owner's decisions, the seat as a required role and never a person, the status as an instance type with Proposed in every first round, and the filename as an experience's, by the year of the call. The types are written in existing vocabulary, so the checker gains three TYPES rows and the test proves the filename form reads decided from the row rather than assuming start; the example carries Beacon's decision that billing leaves the monolith, and its question about who split billing rests on it. This is core 0.43.0 and the package at 0.49.0, with the instance workflow's ref moved with it.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop. The merge waits for Rob's explicit go.

- [ ] **Step 5: After Rob merges — tag and release, on his go**

```bash
cd /Users/rob/git/companygraph/meta-model && git pull --ff-only
gh release create v0.49.0 --target main --title v0.49.0 --notes "Core gains the types decision, decision-kind and decision-status (core 0.43.0): a call the company made on a date, with the options that lost and why, under a kind and a status the instance defines. An instance that upgrades needs nothing until it writes a decision; then it defines its kinds and statuses first."
gh api repos/companygraph/meta-model/git/refs/tags/v0.49.0 --jq .object.sha
```

Then remove the worktree and the branch, by name: `git worktree remove ../meta-model-decision && git branch -d decision && git push origin --delete decision`.

---

## The four statuses

Tasks 4, 6 and 7 write these four files into `model/decision-statuses/`, the same in every instance, since the states are defined in terms of the model and not of the company.

`proposed.md`:

```markdown
---
source: Local
---

# Proposed

> The call is put forward with its alternatives and not yet made; nothing acts on it.

## What it means

A decision is Proposed from the day it is written until the seat named in `by` makes the call. It is written in full, the question, the alternatives and the reasons, so that it can be argued before it binds, and `decided` holds the date it was put forward. Nothing acts on a Proposed decision, and a reader treats the question as open. It leaves this state when the call is made, becoming Standing with `decided` set to the day of the call, or when it is declined, becoming Dropped.
```

`standing.md`:

```markdown
---
source: Local
---

# Standing

> The call holds as written, and the work follows it.

## What it means

A decision is Standing from the day it was made until a later decision replaces it or the call is given up. While it stands, a reader acts on it as written and re-opens it only by making a decision that names it in `supersedes`. It leaves this state the day that later decision is made, becoming Revised, or the day the call is given up with nothing in its place, becoming Dropped.
```

`revised.md`:

```markdown
---
source: Local
---

# Revised

> A later decision replaced this call, and the call is read through that decision.

## What it means

A decision is Revised when another decision names it in `supersedes`. Its file stays as it was written, because what was decided on that date does not stop having happened; what holds now is the decision that replaced it, and a reader who arrives here follows the reference forward. A Revised decision never returns to Standing: a change of mind is a third decision.
```

`dropped.md`:

```markdown
---
source: Local
---

# Dropped

> The call is no longer pursued, and nothing replaced it.

## What it means

A decision is Dropped when the call was given up without another decision taking its place: a proposed call declined, or a standing call abandoned because what it depended on went away. The file stays as written, and one dated sentence closing `## Consequences` says when and why it was dropped, since no later decision exists to say so. A reader treats the question as open again. A Dropped decision never returns to Standing: taking the call up again is a new decision.
```

And the three folder READMEs, the same in every instance, in the form `init` writes:

```markdown
# Decision kinds

One file per decision kind, written against `meta/core/decision-kind-schema.md`.
```

```markdown
# Decision statuses

One file per decision status, written against `meta/core/decision-status-schema.md`.
```

```markdown
# Decisions

One file per decision, written against `meta/core/decision-schema.md`.
```

---

## Phase B — the reference instance

### Task 4: robertblust/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/decision-kinds/README.md`, `career.md`, `portfolio.md`
- Create: `model/decision-statuses/README.md` and the four statuses above
- Create: `model/decisions/README.md`, `2026-four-months.md`, `2026-two-tracks.md`, `2026-in-the-open.md`, `2026-architect-role.md`
- Modify: `model/questions/why-is-there-a-career-break-and-what-happened-in-it.md` (one row)

**Interfaces:**

- Consumes: meta-model v0.49.0 (Task 3). The instance writes "I"; its seat is `Owner`; its values include `Decide well over build fast`; the experiences named below are Robert Blust's and their H1s are `Career break`, `CompanyGraph` and `GuestGraph`.
- The two `decided` months on the first three decisions are read from the career-break entry, which starts in June 2026; Rob confirms or corrects each in the entry-by-entry review, and a corrected month that moves the year renames the file.

- [ ] **Step 1: Worktree and upgrade**

```bash
cd /Users/rob/git/robertblust/mental-model && git pull --ff-only
git worktree add -b decisions ../mental-model-decisions origin/main
cd ../mental-model-decisions
npx --yes "github:companygraph/meta-model#v0.49.0" upgrade .
```

Expected: the upgrade moves core to 0.43.0 and tooling to 0.49.0 in all three places, then runs the checks, which pass (no decision yet). Confirm: `grep -n '"tooling"\|"version"' .companygraph/manifest.json` shows `0.49.0` and `0.43.0`; `grep -n instance-check .github/workflows/companygraph.yml` shows `@v0.49.0`; `ls meta/core/decision-schema.md` exists.

- [ ] **Step 2: Write the kinds** — `model/decision-kinds/README.md` as above, then:

`model/decision-kinds/career.md`:

```markdown
---
source: Local
---

# Career

> A call about my own path: what to do next, for whom, on what terms.

## What it means

A decision whose subject is the person the company is: which role to take or leave, which track to pursue, what a period of my life is for. It is this kind even when it decides what gets built, because what was decided is where I go.

A call about what I build and publish in my own name is Portfolio. A call made inside an engagement about a client's system belongs to the client and is not recorded here.
```

`model/decision-kinds/portfolio.md`:

```markdown
---
source: Local
---

# Portfolio

> A call about what I build and publish in my own name: which products, in what form, in the open or not.

## What it means

A decision whose subject is the work itself rather than my path through it: a product started or stopped, a form chosen for it, a way of building it. It is this kind even when it was made during a period a Career decision opened, because what was decided is the work.

A call about which role to take or which track to pursue is Career. How a product is built inside its own repositories is decided there, in its specs, and recorded in its own model.
```

- [ ] **Step 3: Write the statuses** — `model/decision-statuses/README.md` and the four files above, verbatim.

- [ ] **Step 4: Write the four decisions** — `model/decisions/README.md` as above, then:

`model/decisions/2026-four-months.md`:

```markdown
---
source: Local
decided: 2026-06
kind: Career
status: Standing
by: Owner
---

# Four months to find out what I want to do next

> I take a break of four months, June to September 2026, and give it one question: what I like doing, rather than what I am used to being hired for.

## The question

What to do next, after a career that had run through engineering, methodology, architecture and leadership, and whether to decide it at a desk or find it out. It had to be decided in June 2026, because a search that starts without the question answers whatever the first offer asks.

## Alternatives

| Option | Why not |
| --- | --- |
| Apply straight from the last role, without the question | I would have been hired for what I was used to being hired for, and the question would have come back in the next role with less time to answer it. |
| Consult while looking | Client work fills the hours the question needs, and a search run beside it is run half. |

## Why

The constraint moved. With the right guardrails an agent writes code faster than any team, so pure development will change, while deciding what gets built, and within which boundaries, will not. Which of those I like doing could only be found out by doing both for a while, on my own account, with nobody's brief but mine.

## Consequences

Four months without an employer, two products built in the open and a search run in parallel, with the answer stated in the model: the role that fits is an architect's. What has to stay true is that the answer was reached from the question and not from the offers, which the decision that closed the break records.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | Career break | Robert Blust | made it |

## References

| What | URL |
| --- | --- |
| The talk that closed the break | https://blust.ch/talks/deciding-well/ |
```

`model/decisions/2026-two-tracks.md`:

```markdown
---
source: Local
decided: 2026-06
kind: Career
status: Standing
by: Owner
---

# Two tracks at once, and the market answers

> I apply on two tracks at the same time, hands-on engineering and architecture, and let the market say which one fits, rather than deciding it at the desk.

## The question

Whether the next role is an engineer's or an architect's, and who gets to answer that. It had to be decided when the search began in June 2026, because the first applications fix the story every later one has to tell.

## Alternatives

| Option | Why not |
| --- | --- |
| Architect roles only | It would have decided the question before it was asked, and left the claim that I still write code untested. |
| Leadership roles only, where the last years were | It would have answered what I am used to being hired for, which was the question's premise and not its answer. |

## Why

A question held open by one person is answered by that person's habits. Held open across two tracks and put to employers, it gets answered by who calls back, what the rounds ask and which offer arrives, and that answer can be read afterward by track.

## Consequences

Twenty-five applications between June 9 and August 20, 2026, and an outcome that could be read by track: every leadership application led to an interview, fewer than half of the engineering ones did, two of the five architect ones did, and the offer taken was one of those two. What it cost was the story: a former CTO applying for an engineering role is read as a flight risk unless the stay is stated first, and going back near the code had to be told as a choice and not a step down.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | Career break | Robert Blust | changed it |
```

`model/decisions/2026-in-the-open.md`:

```markdown
---
source: Local
decided: 2026-07
kind: Portfolio
status: Standing
by: Owner
upholds:
  - Build the alternative before making the point
---

# The two products are built in the open

> I build CompanyGraph and GuestGraph in public repositories, every spec, commit and release visible, and publish what their validation finds as it arrives, a clean no included.

## The question

Whether to build the two ideas the break produced privately and show a result, or in public and show the work. It had to be decided before the first repository existed, in July 2026, because a repository that starts private carries its history into the open only by decision.

## Alternatives

| Option | Why not |
| --- | --- |
| Build privately and show a result | A result shown at the end cannot be checked by anyone, and the figures the closing talk rests on would not exist. |
| Apply only, and build nothing | The question of what I like doing would have been answered by whoever hired me. |

## Why

Naming what is broken is free, so a position is not a position until something works differently, and something that works differently is only an argument when someone else can read it. The validation had two questions, how much of an idea must exist before it can be validated and what a realistic outcome is, and both are answered in public or not at all, because a no is worth more than a polite yes.

## Consequences

Two products with their history in the open, three instances of one meta-model each served three ways, and a talk whose every figure was read from what git recorded. What it gave up was the option to be wrong quietly. It stays right for as long as the products keep their history public, which they do after the break.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | CompanyGraph | Robert Blust | made it |
| experience | GuestGraph | Robert Blust | made it |

## References

| What | URL |
| --- | --- |
| The talk that counts the work | https://blust.ch/talks/deciding-well/ |
```

`model/decisions/2026-architect-role.md`:

```markdown
---
source: Local
decided: 2026-09
kind: Career
status: Standing
by: Owner
upholds:
  - Decide well over build fast
---

# An 80% architect role in a product company, chosen over pay

> I take an IT Architect role at 80% from October 2026 in a product company outside finance, whose culture was the criterion, and keep the fifth day for formal education in how AI is led and governed in an organization.

## The question

Which offer to take, with one in hand and three processes in finance still open, and whether the answer the break had produced would hold against a higher salary range. It had to be decided in September 2026, because the offer had a date and the open processes had rounds that would not wait.

## Alternatives

| Option | Why not |
| --- | --- |
| Two senior engineering roles in finance, one past its second round and one a day from an offer | Hands-on work, in the industry most of my career was spent in, on the track agents change fastest; either would have been chosen for its range and not for the question. |
| A hands-on lead role at a higher salary range | Pay over values, and the role would have been the last one again under another name. |
| The pure development track | With the right guardrails an agent writes code faster than any team, so pure development will change, while deciding what gets built, and within which boundaries, will not. |

## Why

The break had answered its question: what I like doing is modeling, and AI used with responsibility inside a company rather than merely used, and the role that fits that is an architect's, the more lasting one. Of the offers, the architect role in a product company was the one where the interviews showed a culture I would choose, and choosing on values over pay is the whole of what deciding well means when the two disagree.

## Consequences

Three processes withdrawn, each at an interview stage, one the week before a final round of five people. Four days a week from October 2026 as an architect, the fifth kept for education that starts in 2027, and the two products staying published with their history. What has to stay true is that the company's culture is what the interviews showed; that is the one thing the decision rests on that only the role itself can confirm.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| experience | Career break | Robert Blust | ended it |
```

- [ ] **Step 5: The question rests on it** — in `model/questions/why-is-there-a-career-break-and-what-happened-in-it.md`, add to the `## Rests on` table after the last row:

```markdown
| decision | An 80% architect role in a product company, chosen over pay |  | the decision that ended it |
```

- [ ] **Step 6: Check**

Run: `npx --yes "github:companygraph/meta-model#v0.49.0" check .` Expected: PASS. Then the negative control: rename `2026-architect-role.md` to `2025-architect-role.md`, run the check, see it fail naming `begins with 2025` and `` `decided` says 2026-09 ``, and rename it back.

- [ ] **Step 7: Validate the prose** — run the instance's `companygraph-validate` skill over the new files (the agent half of R0), reading each decision against the schema's writing rules, in particular that no `## Alternatives` row is the option taken and no employer is named; fix what it reports. Then `sh conventions/conventions-check && sh conventions/conventions-format check`. Read the diff for digits: the counts in `2026-two-tracks.md` are fixed by a closed search and may stand; nothing else carries a number that moves.

- [ ] **Step 8: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The career break's decisions, as decisions

The instance takes core 0.43.0, which adds the decision, decision-kind and decision-status types, and defines two kinds, Career and Portfolio, and the four statuses Proposed, Standing, Revised and Dropped. Four decisions follow, each with the options that lost and why: four months to find out what I want to do next, two tracks at once with the market answering, the two products built in the open, and the architect role at 80% in a product company chosen over pay, which ended the break and which the question about the break now rests on.

Verified: the instance checks pass at v0.49.0 and fail on a decision whose filename year is not the year in decided; the validate skill, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -u origin decisions
gh pr create --title "The career break's decisions, as decisions" --body "…the commit body, ending with the Verified line and the Claude Code line…"
```

Stop for Rob's review, entry by entry, and his merge. After it, note the merge commit's SHA: Task 5 pins it.

---

## Phase C — the Obsidian plugin (worktree `obsidian-plugin-decision`)

### Task 5: The plugin adopts the type

**Files:**

- Modify: `package.json`, `package-lock.json` (the `companygraph-meta-model` pin)
- Modify: `scripts/fixtures.mjs` (`INSTANCE_COMMIT`)
- Create: `e2e/decision.e2e.ts`
- Modify: `README.md` (a paragraph on the type, after the KPI paragraph)
- Modify: `manifest.json`, `package.json` (the minor release, 0.13.0)

**Interfaces:**

- Consumes: meta-model v0.49.0 (Task 3) and the merge SHA of Task 4.
- Uses from the e2e harness: `start`, `available` from `./obsidian.ts`; `openNote`, `mentionsOf` from `./notes.ts`; `command`, `pick`, `waitForPrompt`, `promptItems`, `waitForModal`, `intoField`, `pressButton`, `noModal`, `onDisk` from `./ui.ts`, as `e2e/entities.e2e.ts` and `e2e/kpi.e2e.ts` use them.

- [ ] **Step 1: Worktree and re-pin**

```bash
cd /Users/rob/git/companygraph/obsidian-plugin && git pull --ff-only
git worktree add -b decision ../obsidian-plugin-decision origin/main && cd ../obsidian-plugin-decision
npm uninstall companygraph-meta-model && npm install "github:companygraph/meta-model#v0.49.0"
node -e 'const l=require("./package-lock.json").packages["node_modules/companygraph-meta-model"]; console.log(l.version, l.resolved)'
gh api repos/companygraph/meta-model/git/refs/tags/v0.49.0 --jq .object.sha
```

Expected: `0.49.0` and a `resolved` ending in the SHA the second command prints. `npm test` passes (the pin test holds it).

- [ ] **Step 2: Move the fixture** — in `scripts/fixtures.mjs`, set `INSTANCE_COMMIT` to Task 4's merge SHA. Run `node scripts/fixtures.mjs && ls test/fixtures/mental-model/model/decisions/2026-architect-role.md test/fixtures/mental-model/meta/core/decision-schema.md`. Expected: both exist.

- [ ] **Step 3: Write the failing e2e test** — `e2e/decision.e2e.ts`

```ts
// The decision type as a person writes it in the vault: New entity asks for decided and leads
// the filename with its year, completion offers the vault's kinds and statuses, and the
// references pane lists a decision under the seat that made it and the status it is in.
import { after, afterEach, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { available, start } from "./obsidian.ts";
import type { Session } from "./obsidian.ts";
import { mentionsOf, openNote } from "./notes.ts";
import { command, intoField, noModal, onDisk, pick, pressButton, promptItems, waitForModal, waitForPrompt } from "./ui.ts";

const skip = available() ? false : "Obsidian is not installed here; set OBSIDIAN_BIN to run this suite";
const ROLE = "model/decisions/2026-architect-role.md";
const offered = () => {
  const items = Array.from(document.querySelectorAll<HTMLElement>(".suggestion-container .suggestion-item")).map((el) => el.innerText.trim());
  return items.length ? items : null;
};
const sourceMode = async (ui: Session["ui"], on: boolean) => {
  await ui.evaluate(async (source: boolean) => {
    const view = app.workspace.getMostRecentLeaf(app.workspace.rootSplit).view;
    await view.setState({ ...view.getState(), mode: "source", source }, { history: false });
  }, [on]);
  await ui.waitFor(`the editor to be in ${on ? "Source mode" : "Live Preview"}`, (source: boolean) =>
    app.workspace.getMostRecentLeaf(app.workspace.rootSplit).view.getState().source === source, [on]);
};

describe("the decision type", { skip }, () => {
  let session: Session;
  before(async () => {
    // A fixture from before the instance was seeded would let every test below pass on nothing.
    assert.ok(fs.existsSync(path.join("test", "fixtures", "mental-model", ROLE)), "the fixture instance holds the career break's decisions");
    session = await start();
  });
  afterEach(async (t) => { if (!(t as { passed?: boolean }).passed) await session.record((t as { name: string }).name); });
  after(async () => { await session?.stop(); });

  test("New entity offers decision, asks for decided and leads the filename with its year", async () => {
    const { ui } = session;
    await openNote(ui, ROLE);
    await command(ui, "new-entity");
    await waitForPrompt(ui);
    assert.ok((await promptItems(ui)).some((item) => item.startsWith("decision —")));
    await pick(ui, "decision —");
    await waitForModal(ui, "New decision");
    await intoField(ui, "Name");
    await ui.type("E2E Probe Decision");
    await intoField(ui, "decided");
    await ui.type("2031-04");
    await pressButton(ui, "Create");
    await noModal(ui);
    const at = await ui.waitFor("the new decision to be in front", () => {
      const p = app.workspace.getActiveFile()?.path as string | undefined;
      return p?.startsWith("model/decisions/2031-") ? p : null;
    });
    const text = (await onDisk(ui, at))!;
    assert.match(text, /\ndecided: "?2031-04"?\n/);
    assert.match(text, /# E2E Probe Decision\n/);
    assert.match(text, /## The question/);
    assert.match(text, /## Alternatives/);
    assert.match(text, /## Why/);
    assert.match(text, /## Consequences/);
  });

  test("kind and status complete to the vault's decision kinds and statuses", async () => {
    const { ui } = session;
    await openNote(ui, ROLE);
    await sourceMode(ui, true);
    // Clear the value on a line and read what the suggest offers, as kpi.e2e.ts does.
    const offeredOn = async (prefix: string) => {
      await ui.evaluate((p: string) => {
        const editor = app.workspace.getMostRecentLeaf(app.workspace.rootSplit).view.editor;
        const line = (editor.getValue() as string).split("\n").findIndex((l) => l.startsWith(p));
        editor.setSelection({ line, ch: p.length }, { line, ch: (editor.getLine(line) as string).length });
        editor.focus();
      }, [prefix]);
      await ui.press("Backspace");
      const items = await ui.waitFor(`values to be offered after "${prefix}"`, offered);
      await ui.press("Escape");
      return items as string[];
    };
    assert.deepEqual([...(await offeredOn("kind: "))].sort(), ["Career", "Portfolio"]);
    assert.deepEqual([...(await offeredOn("status: "))].sort(), ["Dropped", "Proposed", "Revised", "Standing"]);
    await sourceMode(ui, false);
    await session.restore([ROLE]);
  });

  test("the references pane lists a decision under its seat, its status and the value it upholds", async () => {
    const { ui } = session;
    const underOwner = await mentionsOf(ui, "model/roles/owner.md");
    assert.ok(underOwner.some((m) => m.path === ROLE && m.declared === "by"));
    const underStanding = await mentionsOf(ui, "model/decision-statuses/standing.md");
    assert.ok(underStanding.some((m) => m.path === ROLE && m.declared === "status"));
    const underValue = await mentionsOf(ui, "model/values/decide-well-over-build-fast.md");
    assert.ok(underValue.some((m) => m.path === ROLE && m.declared === "upholds"));
  });
});
```

The helpers are copied from `e2e/kpi.e2e.ts`; the first test mirrors the experience test in `e2e/entities.e2e.ts`, which is the only other type whose filename leads with a year. `session.restore` puts the note back as the fixture had it.

- [ ] **Step 4: Run it**

Run: `OBSIDIAN_BIN=… npm run e2e -- --test-name-pattern "the decision type"` (or the full `npm run e2e`) Expected: PASS, with no source change, because `src/scaffold.ts` reads `filename.year` from the `TYPES` row and `src/newentity.ts` asks for it. If a test fails, the failure is a real gap in the plugin's reading of the type: stop, report it, and write the fix under superpowers:systematic-debugging with its own unit test in `test/`.

- [ ] **Step 5: README paragraph** — after the KPI paragraph in `README.md`:

```markdown
A decision, a type of core since 0.43.0, is written like any other entity: New entity offers it, asks for `decided` and leads the filename with its year, as it does for an experience, and creates it in `decisions/` with its required sections; `kind`, `status`, `by`, `upholds` and `supersedes` complete to the vault's decision kinds, statuses, roles, values and decisions; and the references pane lists a decision under each entity it names.
```

- [ ] **Step 6: Full suites, then the release commit** — `npm test && npm run build && npm run e2e`, all green. Move the version to 0.13.0 in `manifest.json` and `package.json` exactly as the last release commit in `git log --oneline -3 -- manifest.json` did.

- [ ] **Step 7: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The plugin writes a decision

The package moves to meta-model v0.49.0, whose core adds the decision, decision-kind and decision-status types, and the e2e fixture to the reference instance's commit that seeds the career break's decisions, so the new test finds real ones: New entity asks for decided and leads the filename with its year, kind and status complete to the vault's kinds and statuses, and the references pane lists a decision under its seat, its status and the value it upholds. No source change was needed; the types are read from their schemas and the filename form from the TYPES row.

Verified: npm test, npm run build and npm run e2e pass; the pin test reads the lockfile at v0.49.0.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
git push -u origin decision && gh pr create --title "The plugin writes a decision" --body "…the commit body, the Verified line, the Claude Code line…"
```

Stop for Rob's merge and his go on the release; the release follows the plugin's own release steps (tag, GitHub release with `main.js`, `manifest.json`, `styles.css`). Rob installs it with `npx "github:companygraph/meta-model#v0.49.0" obsidian`.

---

## Phase D — the other two instances

### Task 6: companygraph/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/decision-kinds/README.md`, `vocabulary.md`, `architecture.md`, `terms.md`
- Create: `model/decision-statuses/README.md` and the four statuses above
- Create: `model/decisions/README.md` and the six files below

**Interfaces:**

- Consumes: meta-model v0.49.0. The instance writes "we"; its seat is `Owner`; its values include `Run on what we publish` and `Adoption is not taxed`; its strategies include `Instance-Led Strategy` and `Read-Only Server Strategy`; its concepts include `Core`, `Pin`, `Instance`, `Schema`, `Check`, `Reference` and `Canonical name`.

- [ ] **Step 1: Worktree and upgrade** — exactly Task 4 Step 1 in `/Users/rob/git/companygraph/mental-model`, branch `decisions`, worktree `../mental-model-decisions`.

- [ ] **Step 2: Write the kinds** — `model/decision-kinds/README.md` as above, then:

`model/decision-kinds/vocabulary.md`:

```markdown
---
source: Local
---

# Vocabulary

> A call about what enters core and in what form: a type, a rule, a form of reference.

## What it means

A decision whose subject is the meta-model itself: whether a type exists, what a rule holds an instance to, how a reference resolves. It is this kind even when the tooling has to change to carry it, because what was decided is what a company can say.

How the tooling that reads a model is built is Architecture. What adopting the meta-model costs is Terms.
```

`model/decision-kinds/architecture.md`:

```markdown
---
source: Local
---

# Architecture

> A call about how the tooling that reads a model is built: the checker, the server, the plugin, the way core reaches an instance.

## What it means

A decision whose subject is a component and how it works: what a server may do, where core lives in an instance, what a checker reads. It is this kind even when it decides what a vocabulary rule can be enforced, because what was decided is the machinery.

What the vocabulary says is Vocabulary. What it costs to adopt is Terms.
```

`model/decision-kinds/terms.md`:

```markdown
---
source: Local
---

# Terms

> A call about what adopting the meta-model costs and under which license, and what we are paid for.

## What it means

A decision whose subject is the relationship between us and a company that adopts the meta-model: the license, the price of anything, what is published and what is not. It is this kind even when it shapes what gets built, because what was decided is what adoption costs.

What the vocabulary holds is Vocabulary; how the tooling is built is Architecture.
```

- [ ] **Step 3: Write the statuses** — `model/decision-statuses/README.md` and the four files above, verbatim.

- [ ] **Step 4: Write the six decisions** — `model/decisions/README.md` as above, then:

`model/decisions/2026-vendored-core.md`:

```markdown
---
source: Local
decided: 2026-08-25
kind: Architecture
status: Standing
by: Owner
upholds:
  - Run on what we publish
---

# Core is vendored into an instance at a release its manifest names

> An instance carries a copy of core at the release its manifest names, with a hash per file, and moves to a later release only when it decides to.

## The question

How the vocabulary reaches a company's model, and who decides when a change to it reaches theirs. It had to be decided when the tooling was designed, in August 2026, because `init`, `upgrade` and `check` all depend on the answer and the first instance was about to be written.

## Alternatives

| Option | Why not |
| --- | --- |
| Resolve core at read time, from the newest release | A change to the vocabulary would move under every model at once, and nobody could say which rules a page was written against. |
| A git submodule pointing at core | It pins a commit and not a release, carries no hash per file to tell drift from an edit, and asks every adopter to know submodules. |

## Why

The version number below 1.0 is doing work: the vocabulary is free to change, and an instance decides when to take a change because core is vendored at a release its manifest names rather than resolved at read time. A release can then say what an instance must do about it, and most say nothing, which is what lets the vocabulary keep moving without moving anyone's model underneath them.

## Consequences

`upgrade` owns the vendored files and nothing else; a checker that is not the release the manifest names refuses to run; a file edited inside `meta/` shows as drift. What it gave up is a single current vocabulary: three instances may be at three releases, and every consumer names the one it reads. It stays right for as long as a release says what an instance must do about it.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Core |  | changed it |
| concept | Pin |  | made it |
| concept | Instance |  | changed it |

## References

| What | URL |
| --- | --- |
| The tooling specification | https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-08-25-companygraph-tooling-design.md |
```

`model/decisions/2026-prose-schema.md`:

```markdown
---
source: Local
decided: 2026-08-23
kind: Vocabulary
status: Standing
by: Owner
---

# The schema written as prose is the only schema

> A type's schema is one Markdown file, read whole by an agent and in its fixed shape by a script, and no second schema exists for the script.

## The question

Whether the schemas are a stage on the way to a formal schema language or the working architecture of a model with hundreds of files. It had to be decided in the first specification, in August 2026, because every schema written after it would be written in one form or the other.

## Alternatives

| Option | Why not |
| --- | --- |
| A JSON Schema beside the prose | Two schemas drift, the one a script reads wins over the one a person reads, and the writing rules, which only a person can hold a page to, would live in neither. |
| A schema only a script reads | An agent reading a page would have nothing to hold it to but the script's output, and the thesis the model ships under, that with the right meta-model you describe the facts as Markdown, would be contradicted by its own schemas. |

## Why

The claim this model ships under is that a schema written as prose is the only schema, which an agent reads whole and a script reads where its shape is fixed. That holds only if the shape is checked, so the schema tables were written to one fixed shape and `verify` holds every schema to it; what a script cannot read, the writing rules, stays with the agent pass.

## Consequences

Every schema has the same columns, the same type vocabulary and the same word for required; a schema off the shape fails loudly; an instance is held to what its schema declares, and nothing beyond the schema decides which fields resolve. What it gave up is a machine-checkable schema for the prose half. It stays right for as long as the agent pass runs before every commit.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Schema |  | made it |
| concept | Check |  | changed it |

## References

| What | URL |
| --- | --- |
| The first specification | https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-08-23-companygraph-design.md |
| The schemas made normative | https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-09-08-schemas-are-normative-design.md |
```

`model/decisions/2026-open-sections.md`:

```markdown
---
source: Local
decided: 2026-09-19
kind: Vocabulary
status: Standing
by: Owner
---

# A section is open and a field is closed

> A page may carry sections its schema does not declare, which are read as prose, and may not carry a frontmatter field its schema does not declare, which is an error.

## The question

Whether an instance may add to a page beyond what its schema declares, and where. It had to be decided in September 2026, when required sections were being held by the checker for the first time, because the checker needed to know whether an undeclared heading is a finding.

## Alternatives

| Option | Why not |
| --- | --- |
| Both closed | An instance could not carry a section of its own, and every local need would be a release of core. |
| Both open | A field left behind by a rename would render under the old name while every check reported green, which is the failure a closed field exists to prevent. |

## Why

A field left over by a rename still renders as though it were the field, while a section of the page's own claims to be nothing the schema knows. The two failures are not alike, so the two rules are not: a field resolves references and satisfies requirements, and must be declared; a heading resolves nothing and draws no edge, and may be the page's own.

## Consequences

An undeclared field is an error and a rename cannot half-happen; an undeclared heading is prose; an optional section written with a typo reads as one of the page's own, and only an editor that knows the schema can tell. What it gave up is the local field: an instance cannot carry one.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Schema |  | changed it |

## References

| What | URL |
| --- | --- |
| The specification | https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-09-19-required-sections-design.md |
```

`model/decisions/2026-typed-resolution.md`:

```markdown
---
source: Local
decided: 2026-09-15
kind: Vocabulary
status: Standing
by: Owner
---

# A reference resolves by its declared type, never by name alone

> A tool resolves a reference by the type its schema declares and the name written, looks in no other type, and reports a name that exists only under another type as unresolvable.

## The question

What a tool does with a name that exists under two types, which a company of one forces, because the company and the only person in it are called the same thing. It had to be decided in September 2026, when the parser refused such a name as ambiguous and the reference instance could not be served.

## Alternatives

| Option | Why not |
| --- | --- |
| The first match across types | Which entity a reference reaches would depend on the order the folders were walked, and a string field whose value happened to be a canonical name would draw an edge nobody declared. |
| The nearest folder | It resolves by where a file happens to sit, which R3 forbids a reference to depend on, and moves the edge when the file moves. |

## Why

Every schema already declares its references as `ref → <type>`, so a reference carries a type as well as a name, and the pair is what resolves. A name unique across the whole instance would have forced the company or the person to be called something nobody calls it, and the graph would then describe a naming workaround rather than the company.

## Consequences

A name that exists only under another type is unresolvable, not ambiguous, and the error says which type was searched; the parser reads the type once and knows for every page which fields become edges. Every consumer re-pinned. What it gave up is the convenience of a bare name that means one thing everywhere.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Reference |  | changed it |
| concept | Canonical name |  | changed it |

## References

| What | URL |
| --- | --- |
| The specification | https://github.com/companygraph/meta-model/blob/main/docs/superpowers/specs/2026-09-15-typed-resolution-design.md |
```

`model/decisions/2026-read-only-server.md`:

```markdown
---
source: Local
decided: 2026-09-16
kind: Architecture
status: Standing
by: Owner
upholds:
  - Run on what we publish
  - Adoption is not taxed
---

# The server only reads, and answers at one named commit

> An agent reaches a company's model through a server that reads it, answers every question at the commit it was read at, and adds nothing of its own.

## The question

What an agent may do to a company's model through the server, and how an answer can be checked later. It had to be decided when the server was designed, in September 2026, because a write path or a retrieval index would have shaped every tool on it.

## Alternatives

| Option | Why not |
| --- | --- |
| A write path | A company would have to decide whether to trust an agent with its model, and no company should have to decide that to adopt one. |
| An embedding index as the way in | A retrieval layer answers with a paraphrase, and a paraphrase cannot be held to the evidence the model attached to the claim. |

## Why

Every answer names the commit it was read at, so an answer can be checked against the same bytes later and two answers a week apart can be told apart. The tools are the vocabulary's own questions, which types a company declares, what one entity says, what evidence a claim rests on, so an agent asks the model the way the model is shaped rather than searching its text and hoping.

## Consequences

No answer about a model's current state in general, no reasoning the server does that the model cannot show, and nothing summarized away: where a claim has no evidence the answer says so. A company runs the server in its own cloud project from the parts we publish. What has to stay true is that the same question put to the person who runs the company and to the agent gets the same answer, followable to the page.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| strategy | Read-Only Server Strategy |  | made it |

## References

| What | URL |
| --- | --- |
| The server | https://github.com/companygraph/mcp-server |
```

`model/decisions/2026-apache-2-0.md`:

```markdown
---
source: Local
decided: 2026-08-23
kind: Terms
status: Standing
by: Owner
upholds:
  - Adoption is not taxed
---

# Everything under Apache 2.0, and consulting billed by the day

> The vocabulary, the tooling and the talks are published under licenses that ask nothing back, and what costs money is our time by the day, never what a company does with the model.

## The question

How a project that publishes a meta-model earns, and whether any of it may cost a company that adopts it. It had to be decided in the first specification, in August 2026, because the license travels with the first release and a license that closes later is read as one that will.

## Alternatives

| Option | Why not |
| --- | --- |
| A per-seat license | It charges a company for being read, which a model meant for its people and its agents at once cannot bear. |
| A per-entry price | It charges a company for the completeness the model exists to produce. |
| A hosted-only edition | A company that must hand over its model to be served has been charged for adoption, and the read-only server exists so that it never has to. |

## Why

A meta-model is worth whatever gets adopted of it, so anything that makes adopting it cost more works against the one thing it was built to do. Doing it without us has to be the normal case, because a model most people need help to adopt has not been made adoptable.

## Consequences

No proprietary edition, no hosted service as the paid half of a free thing, no per-seat price, and no license change later. Consulting by the day is the whole income. What has to stay true is that a company can adopt everything without ever speaking to us.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| strategy | Instance-Led Strategy |  | changed it |

## References

| What | URL |
| --- | --- |
| The license | https://github.com/companygraph/meta-model/blob/main/LICENSE |
```

- [ ] **Step 5: Check, validate, commit, push, PR, stop** — exactly Task 4 Steps 6 to 8, with the negative control renaming `2026-read-only-server.md` to `2025-read-only-server.md`, and this commit:

```
CompanyGraph's own calls, as decisions

The instance takes core 0.43.0, which adds the decision, decision-kind and decision-status types, and defines three kinds, Vocabulary, Architecture and Terms, and the four statuses Proposed, Standing, Revised and Dropped. Six decisions follow, each read from the specification or strategy that records it and each with the options that lost and why: core vendored at a named release, the prose schema as the only schema, sections open and fields closed, resolution by declared type, the server that only reads, and everything under Apache 2.0 with consulting by the day.

Verified: the instance checks pass at v0.49.0 and fail on a decision whose filename year is not the year in decided; the validate skill, conventions-check and conventions-format check pass.
```

PR title: "CompanyGraph's own calls, as decisions". Stop for Rob's review, entry by entry, and his merge.

### Task 7: guestgraph/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/decision-kinds/README.md`, `architecture.md`, `product.md`, `business.md`
- Create: `model/decision-statuses/README.md` and the four statuses above
- Create: `model/decisions/README.md` and the six files below

**Interfaces:**

- Consumes: meta-model v0.49.0. The instance writes "we"; its seat is `Owner`; its values include `Store what happened, derive who it was`, `Every merge can be explained and undone`, `A match is not trusted until it is justified`, `Everything the engine does is on its API` and `The core stays open`; its strategies are `Open Core Strategy`, `Safety-First Strategy`, `One-Direction Connector Strategy` and `Per-Arrival Billing Strategy`; its products are `GuestGraph Engine` and `Apaleo Connector`; its concepts include `Source record`, `Golden profile` and `Matcher`; its features include `Review an uncertain match` and `Bring reservations and bookings into the graph`.

- [ ] **Step 1: Worktree and upgrade** — exactly Task 4 Step 1 in `/Users/rob/git/guestgraph/mental-model`, branch `decisions`, worktree `../mental-model-decisions`.

- [ ] **Step 2: Write the kinds** — `model/decision-kinds/README.md` as above, then:

`model/decision-kinds/architecture.md`:

```markdown
---
source: Local
---

# Architecture

> A call about how the engine and what runs beside it are built: what is stored and what is derived, what talks to what, what a matcher may do.

## What it means

A decision whose subject is the shape of the system: a record kept as it arrived, a connector outside the engine, a matcher admitted through a contract. It is this kind even when a hotel feels the result, because what was decided is the structure.

What is built first and for whom is Product. How the project earns is Business.
```

`model/decision-kinds/product.md`:

```markdown
---
source: Local
---

# Product

> A call about what is built first and for whom: which system is connected, which capability ships, which hotel it is for.

## What it means

A decision whose subject is the offer and its order: the first connector, the first feature a hotel sees, what the console does before anything else. It is this kind even when it forces a structural change, because what was decided is what a hotel gets.

How the thing is built is Architecture; what it costs a hotel is Business.
```

`model/decision-kinds/business.md`:

```markdown
---
source: Local
---

# Business

> A call about how the project earns and under which license: what is open, what is paid for, and what the meter counts.

## What it means

A decision whose subject is the relationship between us and a hotel or an integrator: the license on the core, what a hosted service charges for, what stays free. It is this kind even when it shapes the engine, because what was decided is the terms.

What the engine does is Architecture or Product.
```

- [ ] **Step 3: Write the statuses** — `model/decision-statuses/README.md` and the four files above, verbatim.

- [ ] **Step 4: Write the six decisions** — `model/decisions/README.md` as above, then:

`model/decisions/2026-source-record.md`:

```markdown
---
source: Local
decided: 2026-07-09
kind: Architecture
status: Standing
by: Owner
upholds:
  - Store what happened, derive who it was
---

# A source record is never edited, and the guest is derived from it

> A record enters exactly as its system sent it and is never changed or deleted by application code; a guest is a conclusion recomputed from the records, not a row anyone edits.

## The question

What the engine stores and what it computes, and whether a correction changes what was stored. It had to be decided before the first table existed, in July 2026, because a store that edits records in place cannot be turned into one that does not without losing what it already overwrote.

## Alternatives

| Option | Why not |
| --- | --- |
| A master record edited in place | Every correction would overwrite what a system actually sent, and no merge could be explained or undone from what was left. |
| A golden record kept as a CRM keeps one | A row someone edits is a claim nobody can recompute, and the survivorship that produced it is lost the moment it is saved. |

## Why

An explanation, an undo and a replay of resolution are possible only from records kept as they arrived. If the golden profile is computed from the records by survivorship rules, it can be recomputed at any time, which is what makes a wrong merge reversible and a right one explainable.

## Consequences

A correction arrives as a new record; the profile is derived and can be recomputed; lawful erasure under data protection law is the one exception and is named as one. What it gave up is the cheap fix: nobody can edit a profile to make it right. It stays right for as long as no code path writes to a record after it entered.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Source record |  | made it |
| concept | Golden profile |  | made it |
```

`model/decisions/2026-matcher-off.md`:

```markdown
---
source: Local
decided: 2026-07-09
kind: Architecture
status: Standing
by: Owner
upholds:
  - Every merge can be explained and undone
  - A match is not trusted until it is justified
---

# The probabilistic matcher ships switched off

> The machinery that makes a merge safe to allow, explanation, undo, the review queue and a confidence behind each decision, is built first, and the probabilistic matcher is admitted through it switched off, for a tenant to turn on under its own threshold.

## The question

Whether uncertain matching is allowed to merge before a hotel can see why and undo it, and in what order the safety machinery and the matchers are built. It had to be decided in July 2026, before any matcher beyond the deterministic one existed, because a safeguard added after the decisions it guards cannot reach the ones made before it.

## Alternatives

| Option | Why not |
| --- | --- |
| On by default under a threshold | A hotel would get merges it never chose to allow before it had seen one explained, and a wrong merge shows one guest another's stays and invoices. |
| No probabilistic matcher at all | Deterministic matching alone leaves the returning guest with a typo in the email as a stranger, and the review decisions that would train a better matcher would never accumulate. |

## Why

Every merge is recorded with its matcher, its confidence and its evidence, can be asked why and undone, and a suspicious match queues for review under a threshold each tenant sets, and all of that existed while matching was still deterministic. A new matcher is then one more implementation of the same contract, candidates in and scored decisions out, and an agent is treated as one more uncertain matcher behind it.

## Consequences

No matcher merges before it can be explained and undone; no agent path around the review queue; a split holds against new evidence through a do-not-merge rule; the review decisions accumulate with the feature vector each was scored on. What it gave up is a higher merge rate out of the box. It stays right for as long as a wrong merge is rarer than a missed one.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| concept | Matcher |  | changed it |
| strategy | Safety-First Strategy |  | made it |
| feature | Review an uncertain match |  | made it |
```

`model/decisions/2026-connectors.md`:

```markdown
---
source: Local
decided: 2026-09-10
kind: Architecture
status: Standing
by: Owner
upholds:
  - Everything the engine does is on its API
---

# Each source system gets its own one-direction connector

> A connector is a separate service that reads one external system and submits what it finds through the engine's API, so the engine calls nothing outward and runs with any number of connectors or none.

## The question

Where integration with a hotel's systems lives, inside the engine or beside it, and whether anything flows back. It had to be decided in September 2026, when the first connector was about to be built, because integration code inside the engine cannot be taken out once the engine depends on it.

## Alternatives

| Option | Why not |
| --- | --- |
| Integration code inside the engine | The engine would change with every system a hotel runs and would call out to systems it should never reach. |
| A bidirectional sync | Writing back into a hotel's PMS makes the graph a system of record it was never meant to be, and a wrong merge would then reach the desk through the hotel's own system. |

## Why

A connector is a client of the engine's REST API and nothing more: it submits one observation per person per version of a source object, keyed by the source's own clock so retries and full re-syncs are idempotent, and it holds the guest ids the engine answers. Everything the engine does is on its API, so a connector needs nothing else.

## Consequences

A connector owns a database schema of its own and connects as a role that sees nothing else; whether it shares the engine's database is a deployment choice; deliveries are retried rather than lost when either side is down. What it gave up is the shortcut of reading the engine's tables. It stays right for as long as a second connector, for a different kind of system, can be built against the same API without a change to the engine.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| strategy | One-Direction Connector Strategy |  | made it |
| product | Apaleo Connector |  | made it |
```

`model/decisions/2026-apaleo-first.md`:

```markdown
---
source: Local
decided: 2026-09-10
kind: Product
status: Standing
by: Owner
---

# Apaleo is the first connector

> The first source system connected to the graph is a real property management system, Apaleo, and the connector is built against its API rather than against a PMS in general.

## The question

Which system to connect first, and whether the first connector is for one system or for a class of them. It had to be decided in September 2026, when the engine could resolve records and had none to resolve.

## Alternatives

| Option | Why not |
| --- | --- |
| A generic PMS adapter | An adapter for every PMS fits none, and the rules a connector follows would be guessed instead of read from one real API. |
| A booking engine or the wifi first | A PMS is where the reservation and the check-in live, which is what decides whether any of this is usable for a hotel at all. |

## Why

A PMS is what decides whether any of this is usable, and Apaleo is a PMS with a public API that a connector can be built and tested against without a hotel's help. Every rule a connector follows is then decided in the engine's specification against something real, and a change taken while building is carried forward into the roadmap notes.

## Consequences

The connector's rules are decided once against a real API; the second connector, for a different kind of system, is what proves the API rather than the first. What it gave up is breadth on the first day. It stays right for as long as hotels that keep their stays in Apaleo are the ones asking.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| product | Apaleo Connector |  | made it |
| feature | Bring reservations and bookings into the graph |  | made it |
```

`model/decisions/2026-open-core.md`:

```markdown
---
source: Local
decided: 2026-07-09
kind: Business
status: Standing
by: Owner
upholds:
  - The core stays open
---

# Open core under Apache 2.0, with paid hosting later

> Everything that resolves a guest, the engine, the graph, the API and the connectors, is open source under Apache 2.0 for anyone to run, and what could ever be paid for is running it: managed hosting, a console and MCP access for agents.

## The question

What is open and what could be sold, and whether the license on the core can ever change. It had to be decided before the first public commit, in July 2026, because a license that closes later is read as one that will.

## Alternatives

| Option | Why not |
| --- | --- |
| A closed SaaS | A hotel could not read how a merge was decided before trusting one, and the people arguing with the engine in the open, who are the first signal the idea is right, would not exist. |
| A source-available license | It says open and means later, and integrators who would run the engine themselves would not build on a license that can close. |

## Why

A hotel or an integrator can read exactly how a merge was decided before trusting one, and can run it without us. The commercial layer is planned on top of the core and never inside it, so the hosted service runs the same engine anyone can run, and the pages can say plainly that there is no product for sale yet and ask where the idea is wrong.

## Consequences

No proprietary edition, no capability held back to make hosting worth buying, authentication beyond per-tenant API keys belongs to the commercial layer, and no license change on the core later. What has to stay true is that the core does not depend on commercial code.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| strategy | Open Core Strategy |  | made it |
| product | GuestGraph Engine |  | changed it |
```

`model/decisions/2026-per-arrival.md`:

```markdown
---
source: Local
decided: 2026-08-23
kind: Business
status: Standing
by: Owner
upholds:
  - The core stays open
---

# The hosted service bills per arrival

> The hosted service counts one thing, a reservation that checked in, as an annual allowance paid in twelve installments, and everything that makes the graph better is free.

## The question

What the meter counts, once there is a hosted service, and what it must never count. It had to be decided in August 2026, before the pages described a commercial layer, because a billing model shapes what a hotel is willing to feed into the graph.

## Alternatives

| Option | Why not |
| --- | --- |
| Per record ingested | It puts the largest invoice at the backfill, before a single profile is resolved. |
| Per connector | It taxes the fifth system, the one where identity resolution earns its keep. |
| Per stored profile | It makes a hotel delete records and the graph worse. |
| Prepaid credit wallets | They leave a hotel wondering in August whether the balance holds. |

## Why

An arrival is a number already on a hotel's own occupancy report every morning, so every invoice can be checked against a system we do not own, and a resolved profile is worth something at the moment someone is standing at the desk. Everything that makes the graph better, ingestion, the backfill, stored profiles, lookups and self-hosting, has to cost nothing or the hotel holds it back.

## Consequences

One meter, walk-ins included and cancellations and no-shows not; an allowance paid in twelve equal installments because hotels are seasonal; going over it never stops resolution; a group pools one allowance across its properties. What has to stay true is that a hotel can say what its bill would be from its own report, without asking us.

## Bears on

| Type | Entity | Owner | How |
| --- | --- | --- | --- |
| strategy | Per-Arrival Billing Strategy |  | made it |
```

- [ ] **Step 5: Check, validate, commit, push, PR, stop** — exactly Task 4 Steps 6 to 8, with the negative control renaming `2026-open-core.md` to `2025-open-core.md`, and this commit:

```
GuestGraph's calls, as decisions

The instance takes core 0.43.0, which adds the decision, decision-kind and decision-status types, and defines three kinds, Architecture, Product and Business, and the four statuses Proposed, Standing, Revised and Dropped. Six decisions follow, each read from the strategy or value that records it and each with the options that lost and why: a source record never edited, the probabilistic matcher shipped switched off, one connector per source system in one direction, Apaleo first, open core under Apache 2.0, and billing per arrival.

Verified: the instance checks pass at v0.49.0 and fail on a decision whose filename year is not the year in decided; the validate skill, conventions-check and conventions-format check pass.
```

PR title: "GuestGraph's calls, as decisions". Stop for Rob's review, entry by entry, and his merge.

---

## Phase E — the consumers re-pin

### Task 8: mcp-server, the three hosts and the three sites

Each is its own worktree, commit and PR, each stopped for Rob's merge; every package re-pin is proved from `package-lock.json` as in Task 5 Step 1.

- [ ] **Step 1: mcp-server** — in `/Users/rob/git/companygraph/mcp-server`, worktree `../mcp-server-meta-model-v0-49-0`, re-pin `companygraph-meta-model` from `v0.48.0` to `v0.49.0`; `npm test`; a patch release on Rob's go. Proof that the types are served: in its tests, the fixture instance parse lists `decision`, `decision-kind` and `decision-status` among the types (`list_types`).
- [ ] **Step 2: the three hosts** — `robertblust/mcp-blust-ch`, `companygraph/mcp-companygraph-io`, `guestgraph/mcp-guestgraph-io`: re-pin `companygraph-mcp-server` to the Step 1 release and `source.json`'s `commit` to the instance's merge commit from Task 4, 6 or 7; `npm test`. After the deploy: `get_entity` on the decision "An 80% architect role in a product company, chosen over pay" from mcp.blust.ch returns edges `kind` → Career, `status` → Standing, `by` → Owner and `upholds` → Decide well over build fast, with the `Bears on` row resolved to the experience Career break; the same call on "The server only reads, and answers at one named commit" from mcp.companygraph.io and on "Open core under Apache 2.0, with paid hosting later" from mcp.guestgraph.io returns their edges likewise.
- [ ] **Step 3: the three sites** — `robertblust/robertblust.github.io`, `companygraph/companygraph.github.io`, `guestgraph/guestgraph.github.io`: re-pin `companygraph-meta-model` to `v0.49.0` and `source.json` to the instance's merge commit; `npm run model && npm run build` (and `npm run sitemap` where a page changed); `model:check` and `build:check` pass. On companygraph.io, confirm `/model/` gains its three generated terms (`grep -c 'term-decision' model/index.html` is 3, one each for `term-decision`, `term-decision-kind` and `term-decision-status`; if the ids are formed otherwise, read one existing term id such as `term-kpi` and match its form). No site draws a decisions page, by the owner's decision the spec records.
- [ ] **Step 4: Live verification** — the instance checks are green on all three instances' `main`, and the `get_entity` calls of Step 2 answer from the live hosts. Report each result with the host and the model commit it names.
