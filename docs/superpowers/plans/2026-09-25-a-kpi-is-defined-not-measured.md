# A KPI is defined, not measured — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gains a type `kpi`, the Obsidian plugin adopts it, and all three instances carry the five DORA metrics as KPIs, live on every site and MCP host.

**Architecture:** The type is a Markdown schema in `core/` written in existing vocabulary, so the parser and checker read it with no new code; the checker's `TYPES` table gains one row with a `noun` so `init` spells the folder README right. The reference instance is seeded first because the plugin's e2e vault is that instance at a pinned commit; the plugin then re-pins and proves the type; the other two instances follow; the sites and hosts re-pin last.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, TypeScript Obsidian plugin with a CDP-driven e2e suite, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-25-a-kpi-is-defined-not-measured-design.md` (this branch).

## Global Constraints

- Type id `kpi`, folder `model/kpis/*.md`, owned by nothing; schema file `core/kpi-schema.md`.
- `direction` tokens are exactly `lower`, `higher` or `target`.
- No target, threshold, baseline or measured value in any KPI file, ever.
- KPI H1s are dora.dev's current names in title case: Change Lead Time, Deployment Frequency, Failed Deployment Recovery Time, Change Fail Rate, Deployment Rework Rate.
- In the instances: `owner: Owner`, `measures: Delivery`, `source: Local`, no `serves`.
- American English everywhere (R14); commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag and a release each wait for Rob's explicit go.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- A re-pin installs the package by name after removing the lockfile entry, and is proved by reading `packages["node_modules/companygraph-meta-model"]` in `package-lock.json`, never by a grep.
- Before tagging meta-model, `version` in `package.json` and the `ref:` in `.github/workflows/instance-check.yml` name the same release.

## Review Focus

- A KPI whose `read-with` names itself: nothing forbids it and it means nothing; the checker passes it, and the writing rule is what catches it — Task 1 pins that it passes, so a future change that starts failing it is a decision, not an accident.
- A `direction` written in capitals, `Lower`: a reasonable author expects it to be refused like any other off-list token — Task 1 tests it.
- `unit` left empty (`unit:` with no value): expected to fail as a required field — Task 1 tests it.
- A `kpis/` folder the checks never read: every KPI would pass because none was looked at — Task 3 Step 1 shows verify failing on a stray file there before the real ones are written, the positive control that the folder is read at all.
- The plugin fixture pinned to a pre-KPI commit of the reference instance: the e2e suite would pass with no KPI to find — Task 6 asserts the fixture holds `model/kpis/change-lead-time.md` before any KPI test runs.

---

## Phase A — meta-model (worktree `meta-model-a-kpi-is-defined-not-measured`, branch `a-kpi-is-defined-not-measured`)

### Task 1: The schema and the checker's row

**Files:**

- Create: `core/kpi-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, after the `strategy` row)
- Create: `verify/kpi.test.mjs`
- Modify: `package.json` (`test:instance-checks` script)

**Interfaces:**

- Produces: `TYPES` row `{ type: "kpi", folder: "kpis", noun: "KPI" }` (the `noun` is read in Task 2); `core/kpi-schema.md` as below, which Tasks 3, 5, 6 and 7 write against.

- [ ] **Step 1: Write the failing test** — `verify/kpi.test.mjs`

```js
// The kpi type, held by the instance checks through its real schema: core/kpi-schema.md is read
// from disk so the test fails if the schema and the checks part. The schemas it references are
// bare, as ref-by.test.mjs has them, because only the kpi file's own failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const KPI_SCHEMA = fs.readFileSync(new URL("../core/kpi-schema.md", import.meta.url), "utf8");
const bare = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  "## File Location", "", `\`${location}\``, "", "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kpi = (name, fm, sections = ["How it is measured", "What it can hide"]) => [
  "---", ...fm, "---", "", `# ${name}`, "", "> What it measures.", "",
  ...sections.flatMap((s) => [`## ${s}`, "", "Prose.", ""])].join("\n");
const GOOD = ["source: Local", "owner: Owner", "measures: Delivery", "unit: hours", "direction: lower", "read-with:", "  - Change Fail Rate"];

const tree = (fm, sections) => new Map([
  ["meta/core/kpi-schema.md", KPI_SCHEMA],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/role-schema.md", bare("role", "model/roles/*.md")],
  ["meta/core/process-schema.md", bare("process", "model/processes/<process>/<process>.md")],
  ["meta/core/strategic-objective-schema.md", bare("strategic-objective", "model/strategic-objectives/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/roles/owner.md", "# Owner\n\n> The seat.\n"],
  ["model/processes/delivery/delivery.md", "# Delivery\n\n> How things ship.\n"],
  ["model/kpis/change-fail-rate.md", kpi("Change Fail Rate", ["source: Local", "owner: Owner", "unit: percent of deployments", "direction: lower"])],
  ["model/kpis/change-lead-time.md", kpi("Change Lead Time", fm, sections)],
]);
const about = (fm, sections, ...words) =>
  checkInstance(tree(fm, sections), { core: "meta/core", model: "model" }).failures
    .filter((f) => f.includes("kpis/") && words.every((w) => f.includes(w)));

test("a KPI with every required field and section, naming another in read-with, passes", () => {
  assert.deepEqual(about(GOOD), []);
});

test("a KPI whose read-with names itself passes; the writing rule, not the checker, refuses it", () => {
  assert.deepEqual(about(GOOD.slice(0, -1).concat("  - Change Lead Time")), []);
});

test("a direction outside its three tokens fails and names them", () => {
  assert.equal(about(GOOD.map((l) => l.replace("lower", "sideways")), undefined, "\"sideways\"", "`lower`, `higher`, `target`").length, 1);
});

test("a direction in capitals fails, as any other token outside the list", () => {
  assert.equal(about(GOOD.map((l) => l.replace("lower", "Lower")), undefined, "\"Lower\"").length, 1);
});

test("a missing owner fails", () => {
  assert.equal(about(GOOD.filter((l) => !l.startsWith("owner")), undefined, "no `owner`").length, 1);
});

test("an empty unit fails as a required field", () => {
  assert.equal(about(GOOD.map((l) => (l.startsWith("unit") ? "unit:" : l)), undefined, "`unit`").length, 1);
});

test("a read-with naming no KPI fails", () => {
  assert.equal(about(GOOD.slice(0, -1).concat("  - Uptime"), undefined, "\"Uptime\"").length, 1);
});

test("a missing What it can hide fails", () => {
  assert.equal(about(GOOD, ["How it is measured"], "no `## What it can hide`").length, 1);
});
```

- [ ] **Step 2: Add the test to the script and run it to see it fail**

In `package.json`, append ` verify/kpi.test.mjs` to the end of the `test:instance-checks` command.

Run: `node --test verify/kpi.test.mjs` Expected: FAIL — the file `core/kpi-schema.md` does not exist (ENOENT).

- [ ] **Step 3: Write `core/kpi-schema.md`**

```markdown
# KPI Schema

> Required structure for KPI files.

## File Location

`model/kpis/*.md`

One file per key performance indicator. Nothing owns a KPI and a KPI owns nothing, as with `strategic-objective`: it may name the process it measures, and many measure none.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `owner` | Yes | ref → role | The seat accountable for improving it, the H1 of a file in `roles/` |
| `measures` | No | ref → process | The process whose performance it measures, the H1 of a process file. Absent where it measures none. |
| `serves` | No | array of ref → strategic-objective | The objectives it indicates progress toward, the H1 of a file in `strategic-objectives/` |
| `unit` | Yes | string | What one value is counted in, with its period where it has one: `hours`, `deployments per week`, `percent of deployments` |
| `direction` | Yes | enum | `lower`, `higher` or `target`. Which way is better: down, up, or toward a band, where too high and too low are both worse. |
| `read-with` | No | array of ref → kpi | The KPIs it is read beside, because each can be moved alone at the other's cost — the H1 of a file in `kpis/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [KPI]` | Yes | The canonical name of the quantity. Everything references the KPI by this exact string. |
| `> [Definition]` | Yes | One sentence of what it measures |
| `## How it is measured` | Yes | The calculation, what counts as the event it counts, the window it is taken over, and where the data comes from |
| `## What it can hide` | Yes | How it can move while what it stands for does not, and what reading it beside `read-with` catches |
| `## References` | No | Table. Where the definition comes from, and where its targets and values are kept; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a standard's definition, a dashboard, a sheet of targets |
| `URL` | Yes | string | Where it is |

## Purpose

A KPI is a quantity the company has chosen to watch, defined once so that everyone who reads the number means the same thing by it. It answers "what exactly does this number count, who answers for it, and what could make it lie?" for someone reading a value, setting a target or deciding whether to trust either. It is not the value and not the target, which move and are kept where the References row points, and it is not a strategy's `## What would show it is working`, which says what to watch for one route; a KPI is watched whichever route is taken.

## Writing rules

- No target, threshold, baseline or measured value, ever. Each moves, and a number that moves
  goes stale in the model without a sound; a References row says where they are kept.
- Named for the quantity, not for the dashboard or tool that shows it: `Change Lead Time`, not
  `the lead-time chart`.
- Person-neutral, as a role is: the definition names seats and never who holds them.
- `## How it is measured` says what counts as the event in this company's terms — what a
  deployment is here, what a failure is — concretely enough that two people counting would get
  the same number. A definition that leaves the event open lets every reader count a different
  thing under one name.
- `## What it can hide` names a specific way the number improves while the work does not. "It
  can be misread" hides nothing a reader can check.
- `read-with` names a KPI that moves against this one when this one is gamed, never the KPI
  itself and not every KPI of the same process.
- `direction: target` is written only where both too high and too low are worse; an indicator
  that is better lower down to some floor is `lower`.
- `unit` names the period wherever the value is a rate: `deployments per week`, not `count`.
- `serves` names an objective only where the KPI moving would actually tell whether that
  objective holds. A KPI that indicates no objective has none, and is still a KPI the company
  watches.
- A KPI that nothing measures yet is a valid definition. It carries no References row for
  values until one exists, and it gains no invented one.
- Names and prose are American English (R14).
```

- [ ] **Step 4: Run the test to see the checker ignore the type**

Run: `node --test verify/kpi.test.mjs` Expected: FAIL — the four "fails" tests find zero failures, because `checkInstance` checks only types `TYPES` lists (the passing tests pass vacuously).

- [ ] **Step 5: Add the `TYPES` row** — in `lib/checks.mjs`, directly after `{ type: "strategy", folder: "strategies" },`:

```js
  // A KPI may name the process it measures, and many measure none, so nothing owns it and it
  // sits in the container. `noun` is how the type is written in prose where its id is not: an
  // abbreviation is spelled as it is read, and a folder README derived from `kpis` would not be.
  { type: "kpi", folder: "kpis", noun: "KPI" },
```

- [ ] **Step 6: Run the test to see it pass, then the whole suite**

Run: `node --test verify/kpi.test.mjs` Expected: PASS, 8 tests. If a "fails" test finds its failure under different words, read the failure the checker printed and match the test's words to the message in `lib/checks.mjs` (lines near "permits", "which … requires", "names no") — never loosen a test to an empty word list.

Run: `npm run verify && node --test verify/*.test.mjs` Expected: PASS. `verify/check.mjs` holds `core/kpi-schema.md` to the fixed shape; a failure there names the row to fix in the schema.

- [ ] **Step 7: Commit**

```bash
git add core/kpi-schema.md lib/checks.mjs verify/kpi.test.mjs package.json
git commit -F - <<'EOF'
Core gains a type kpi

A KPI is the stable definition of a quantity the company watches: the seat accountable for it, the process it measures, the objectives it indicates and the KPIs it is read beside, with no target or value, which move and are kept where its References row points. Every field is written in vocabulary the checker already reads, so the type needs one row in TYPES and no new check; the test reads the real schema from disk, so the schema and the checks cannot part silently.

Verified: node --test verify/kpi.test.mjs failed before the TYPES row and passes after it; npm run verify and node --test verify/*.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 2: The folder README spells the noun

**Files:**

- Modify: `lib/instance-files.mjs` (`readmesFor`)
- Modify: `verify/instance-files.test.mjs`

**Interfaces:**

- Consumes: `TYPES` row's optional `noun` (Task 1).
- Produces: `readmesFor(["kpis"])` writes `model/kpis/README.md` as `# KPIs\n\nOne file per KPI, written against \`meta/core/kpi-schema.md\`.\n`.

- [ ] **Step 1: Write the failing test** — append to `verify/instance-files.test.mjs`, beside the existing `readmesFor` test (reuse its imports):

```js
test("a type with a noun spells its folder README with it, and one without reads as before", () => {
  const files = readmesFor(["kpis", "strategic-objectives"], "meta");
  assert.equal(files.get("model/kpis/README.md"), "# KPIs\n\nOne file per KPI, written against `meta/core/kpi-schema.md`.\n");
  assert.equal(
    files.get("model/strategic-objectives/README.md"),
    "# Strategic objectives\n\nOne file per strategic objective, written against `meta/core/strategic-objective-schema.md`.\n",
  );
});
```

- [ ] **Step 2: Run to see it fail**

Run: `node --test verify/instance-files.test.mjs` Expected: FAIL — actual `# Kpis\n\nOne file per kpi, …`.

- [ ] **Step 3: Implement** — in `readmesFor`, replace the lines from `const { type } = TYPES.find(` through `const heading = …;` and the `: \`One file per ${words(type)}` branch so the function reads:

```js
  for (const folder of folders) {
    const { type, noun } = TYPES.find((t) => t.folder && !t.owner && t.folder.split("/")[0] === folder);
    const heading = noun ? `${noun}s` : words(folder).replace(/^./, (c) => c.toUpperCase());
    const one = noun ?? words(type);
    const owned = TYPES.filter((t) => t.owner === type).map((t) => {
      const sub = t.folder.split("/").at(-1);
      return `its ${words(sub)} in \`${sub}/\` against ${schema(t.type)}`;
    });
    const body = owned.length
      ? `One folder per ${one}, written against ${schema(type)}, with ${owned.join(" and ")}.`
      : `One file per ${one}, written against ${schema(type)}.`;
    files.set(`model/${folder}/README.md`, `# ${heading}\n\n${body}\n`);
  }
```

- [ ] **Step 4: Run to see it pass, then the suite**

Run: `node --test verify/instance-files.test.mjs verify/plan.test.mjs verify/cli.test.mjs` Expected: PASS (`init` writes the new folder; a CLI test that lists the folders `init` makes may need `kpis` added to its expected list — add it, alphabetically, and nothing else).

- [ ] **Step 5: Commit**

```bash
git add lib/instance-files.mjs verify/
git commit -F - <<'EOF'
A folder README spells a type the way it is read

init writes each folder's README from the folder's name, which would head the new one "Kpis" and call its files "kpi". A TYPES row may now carry a noun, and the README uses it for the heading and the sentence; a row without one reads exactly as before.

Verified: the new test failed on "# Kpis" and passes; node --test verify/instance-files.test.mjs verify/plan.test.mjs verify/cli.test.mjs pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 3: The example carries two KPIs

**Files:**

- Create: `example/model/kpis/change-lead-time.md`, `example/model/kpis/change-fail-rate.md`
- Modify: `example/model/README.md` (type list and tree)

**Interfaces:**

- Consumes: the schema (Task 1). The example's Delivery process is owned by `Backend Engineer`; its phases are Specify, Build, Release.

- [ ] **Step 1: See verify read the `kpis/` folder** — the positive control that the folder is checked at all: a stray file with nothing a KPI needs must fail.

```bash
mkdir -p example/model/kpis && printf '# Stray\n\n> x.\n' > example/model/kpis/stray.md
npm run verify
```

Expected: FAIL naming `example/model/kpis/stray.md` (missing `source`, `owner`, `unit`, `direction`, required sections). Then `rm example/model/kpis/stray.md`.

- [ ] **Step 2: Write `example/model/kpis/change-lead-time.md`**

```markdown
---
source: Local
owner: Backend Engineer
measures: Delivery
unit: hours
direction: lower
read-with:
  - Change Fail Rate
---

# Change Lead Time

> The time a change takes from its first commit to running in production.

## How it is measured

For each release the Release phase ships, the time from the earliest commit it carries that no earlier release carried to the moment the release is live for customers; the value is the median over the releases of a calendar month. The commits come from the repository's history and the live moment from the deployment log.

## What it can hide

It shortens when changes get smaller and when review gets thinner, and only the first is progress. Thinner review shows as a higher Change Fail Rate, which is why the two are read together. A median also hides the change that waited a week behind a release.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

- [ ] **Step 3: Write `example/model/kpis/change-fail-rate.md`**

```markdown
---
source: Local
owner: Backend Engineer
measures: Delivery
unit: percent of deployments
direction: lower
read-with:
  - Change Lead Time
---

# Change Fail Rate

> The share of releases that need immediate intervention once they are in production.

## How it is measured

The releases of a calendar month that were followed, before the next planned release, by a rollback or a hotfix made because of them, divided by all releases of that month. A failure is what a customer or a check against production met, not a build that failed before anything shipped.

## What it can hide

It falls when fewer releases ship, and when a failure is folded into the next planned release instead of being named as one. Change Lead Time rising beside it shows the first.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

- [ ] **Step 4: Update `example/model/README.md`**

In the "It uses every core type" sentence, add `` `kpi`, `` after `` `strategy`, ``. In the tree, after the `strategies/` line, add:

```
kpis/                            change-lead-time.md, change-fail-rate.md
```

- [ ] **Step 5: Run verify and the suite**

Run: `npm run verify && node --test verify/*.test.mjs && node bin/check-instance.mjs example` Expected: PASS; "the example parses with the parser this package ships" passes with the two KPIs among its entities. (If `bin/check-instance.mjs` takes a different argument form, run it as `.github/workflows/verify.yml` does.)

- [ ] **Step 6: Commit**

```bash
git add example/
git commit -F - <<'EOF'
The example carries two KPIs of its Delivery process

Change Lead Time and Change Fail Rate, each read with the other, so the instance checks exercise a type that references its own on a real tree as well as on the fixtures.

Verified: npm run verify failed on a stray file in example/model/kpis/ before these were written and passes with them; node --test verify/*.test.mjs passes.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

### Task 4: The release and its lists

**Files:**

- Modify: `README.md` (both type lists: the `*-schema.md` block and the "`core/` is the list" sentence)
- Modify: `core/manifest.json` → `{ "version": "0.41.0", "shape": 3 }`
- Modify: `package.json` → `"version": "0.47.0"`
- Modify: `.github/workflows/instance-check.yml` → `ref: v0.47.0`

- [ ] **Step 1: Edit the lists** — in `README.md`'s tree, the schema list becomes `…, strategic-objective, strategy, kpi, role, …` (re-wrap the block's lines to keep their width); in the "`core/` is the list" sentence, insert `kpi, ` after `strategy, `.

- [ ] **Step 2: Move the three version places together** — `core/manifest.json`, `package.json` and `instance-check.yml` as listed above. Then `npm install --package-lock-only` so `package-lock.json`'s own version follows.

- [ ] **Step 3: Run everything**

Run: `npm run verify && node --test verify/*.test.mjs && sh conventions/conventions-check && sh conventions/conventions-format check` Expected: PASS; the release check in `verify/check.mjs` passes because the ref and the version agree.

- [ ] **Step 4: Commit, push, open the PR, and stop**

```bash
git add README.md core/manifest.json package.json package-lock.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
Core 0.41.0 and the package at 0.47.0

The README names kpi among the schemas, core's manifest moves by a minor for the new type, and the package version and the instance workflow's ref move together to the release they will be tagged as.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push -u origin a-kpi-is-defined-not-measured
gh pr create --title "A KPI is defined, not measured" --body-file <(cat <<'EOF'
Core gains a type kpi: one file per key performance indicator holding its stable definition, the seat accountable for it, the process it measures, the objectives it indicates and the KPIs it is read beside. Targets and measured values stay out of the model and a References row says where they are kept. The spec and plan are in docs/superpowers; the type is written in existing vocabulary, so the checker gains one TYPES row, with a noun that lets init spell the folder README "KPIs", and the example carries two KPIs that name each other. This is core 0.41.0 and the package at 0.47.0, with the instance workflow's ref moved with it.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop. The merge waits for Rob's explicit go.

- [ ] **Step 5: After Rob merges — tag and release, on his go**

```bash
cd /Users/rob/git/companygraph/meta-model && git pull --ff-only
gh release create v0.47.0 --target main --title v0.47.0 --notes "Core gains a type kpi (core 0.41.0): the stable definition of a quantity a company watches, with its owner, the process it measures and the KPIs it is read beside, and no target or value. A TYPES row may carry a noun, which init uses to spell the folder README."
gh api repos/companygraph/meta-model/git/refs/tags/v0.47.0 --jq .object.sha
```

Then remove the worktree and the branch, by name: `git worktree remove ../meta-model-a-kpi-is-defined-not-measured && git branch -d a-kpi-is-defined-not-measured && git push origin --delete a-kpi-is-defined-not-measured`.

---

## The five DORA files

Tasks 5, 7 and 8 write these five files into `model/kpis/`, identical across the instances except the paragraph marked **DEPLOYMENT**, which each task gives in full. Replace the marker line with that paragraph exactly.

`change-lead-time.md`:

```markdown
---
source: Local
owner: Owner
measures: Delivery
unit: hours
direction: lower
read-with:
  - Change Fail Rate
---

# Change Lead Time

> The time a change takes from being committed to version control to running in production.

## How it is measured

DEPLOYMENT

For each deployment, the time from the earliest commit it carries that no earlier deployment carried to the moment it is live; a change to the model counts from its commit in the model's repository to the deployment of the re-pin that carries it. The value is the median over the deployments of a calendar month, read from the repositories' history and the runs of the workflows that publish.

## What it can hide

It shortens when changes get smaller and when review gets thinner, and only the first is progress. Thinner review shows as a higher Change Fail Rate, which is why the two are read together. A median also hides the change that waited a week behind a re-pin.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

`deployment-frequency.md`:

```markdown
---
source: Local
owner: Owner
measures: Delivery
unit: deployments per week
direction: higher
read-with:
  - Change Fail Rate
---

# Deployment Frequency

> How often a change reaches production.

## How it is measured

DEPLOYMENT

The number of deployments in a calendar week. A workflow run that failed and published nothing is not a deployment.

## What it can hide

It rises when one change is split into several deployments and when something ships that did not need to; the first is the point and the second is noise. A rise bought with rushed changes shows in Change Fail Rate. A week without deployments reads the same whether nothing was ready or nothing was worth shipping.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

`failed-deployment-recovery-time.md`:

```markdown
---
source: Local
owner: Owner
measures: Delivery
unit: hours
direction: lower
read-with:
  - Change Fail Rate
---

# Failed Deployment Recovery Time

> The time it takes to recover from a deployment that fails and needs immediate intervention.

## How it is measured

DEPLOYMENT

For each failed deployment, as Change Fail Rate counts them, the time from that deployment going live to the deployment that restores the surface going live, whether a revert, a fix or a re-pin to an earlier release. The value is the median over a calendar quarter. A failure no deployment caused, a provider's outage, is not counted.

## What it can hide

It shortens when every failure is reverted rather than fixed, which restores the surface and leaves the change undone, so the change comes back as rework. Failures are rare here, so a quarter's median can rest on one or two events, and one slow recovery moves it a long way.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

`change-fail-rate.md`:

```markdown
---
source: Local
owner: Owner
measures: Delivery
unit: percent of deployments
direction: lower
read-with:
  - Deployment Frequency
---

# Change Fail Rate

> The share of deployments that need immediate intervention once they are in production.

## How it is measured

DEPLOYMENT

The deployments of a calendar month that were followed, before the next planned change to the same surface, by a revert, a fix or a re-pin made because of them, divided by all deployments of that month. A failure is what a visitor, an agent or a check against the live surface met, not a workflow run that failed before publishing anything.

## What it can hide

It falls when fewer changes ship, and when a failure is folded into the next planned change instead of being named as one. Deployment Frequency, read beside it, shows the first; the second shows only if failures are named when they happen.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

`deployment-rework-rate.md`:

```markdown
---
source: Local
owner: Owner
measures: Delivery
unit: percent of deployments
direction: lower
read-with:
  - Deployment Frequency
---

# Deployment Rework Rate

> The share of deployments that were not planned and happened because of an incident in production.

## How it is measured

DEPLOYMENT

The deployments of a calendar month made because something in production was wrong, a revert, a hotfix or an emergency re-pin, divided by all deployments of that month. Whether a deployment is rework is read from why it was made, which its pull request says, not from its size.

## What it can hide

It falls when fixes are held back and shipped inside planned work, so the incident lasts longer and the rate looks better. Deployment Frequency, read beside it, shows whether planned deployments are still going out.

## References

| What | URL |
| --- | --- |
| DORA's definition | https://dora.dev/guides/dora-metrics/ |
```

And `model/kpis/README.md`, the same in every instance:

```markdown
# KPIs

One file per KPI, written against `meta/core/kpi-schema.md`.
```

---

## Phase B — the reference instance

### Task 5: robertblust/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/kpis/README.md` and the five files above

**DEPLOYMENT paragraph for this instance:**

> A deployment is a merge to `main` in a repository whose workflow publishes one of this model's surfaces: the blust.ch website, which GitHub Pages publishes, and the mcp.blust.ch MCP server and the chat.blust.ch chat, which the deploy workflow publishes.

- [ ] **Step 1: Worktree and upgrade**

```bash
cd /Users/rob/git/robertblust/mental-model && git pull --ff-only
git worktree add -b kpis-from-dora ../mental-model-kpis-from-dora origin/main
cd ../mental-model-kpis-from-dora
npx --yes "github:companygraph/meta-model#v0.47.0" upgrade .
```

Expected: the upgrade moves core to 0.41.0 and tooling to 0.47.0 in all three places, then runs the checks, which pass (no KPI yet). Confirm: `grep -n '"tooling"\|"version"' .companygraph/manifest.json` shows `0.47.0` and `0.41.0`; `grep -n instance-check .github/workflows/companygraph.yml` shows `@v0.47.0`; `ls meta/core/kpi-schema.md` exists.

- [ ] **Step 2: Write the six files** — `model/kpis/README.md` and the five DORA files, each with the DEPLOYMENT line replaced by the paragraph above.

- [ ] **Step 3: Check**

Run: `npx --yes "github:companygraph/meta-model#v0.47.0" check .` Expected: PASS. Then the negative control: change `direction: lower` to `direction: down` in `change-fail-rate.md`, run the check, see it fail naming `"down"`, and restore it.

- [ ] **Step 4: Validate the prose** — run the instance's `companygraph-validate` skill over the five files (the agent half of R0) and fix what it reports; then `sh conventions/conventions-check && sh conventions/conventions-format check`.

- [ ] **Step 5: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The five DORA metrics, as KPIs of Delivery

The instance takes core 0.41.0, which adds the kpi type, and defines the five software delivery metrics DORA defines today, each owned by the Owner seat, measuring Delivery and read beside the metric that moves against it, with what counts as a deployment here written out and no target or value, which nothing measures yet.

Verified: the instance checks pass at v0.47.0 and fail on a direction outside its tokens; the validate skill, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push -u origin kpis-from-dora
gh pr create --title "The five DORA metrics, as KPIs of Delivery" --body "…the commit body, ending with the Verified line and the Claude Code line…"
```

Stop for Rob's merge. After it, note the merge commit's SHA: Task 6 pins it.

---

## Phase C — the Obsidian plugin (worktree `obsidian-plugin-kpi`)

### Task 6: The plugin adopts the type

**Files:**

- Modify: `package.json`, `package-lock.json` (the `companygraph-meta-model` pin)
- Modify: `scripts/fixtures.mjs` (`INSTANCE_COMMIT`)
- Create: `e2e/kpi.e2e.ts`
- Modify: `README.md` (a paragraph on the type)
- Modify: `manifest.json`, `package.json`, `versions.json` (the minor release, as the plugin's last release commit did)

**Interfaces:**

- Consumes: meta-model v0.47.0 (Task 4) and the merge SHA of Task 5.
- Uses from the e2e harness: `start`, `available` from `./obsidian.ts`; `openNote`, `mentionsOf` from `./notes.ts`; `command`, `pick`, `waitForPrompt`, `promptItems`, `waitForModal`, `intoField`, `noModal`, `onDisk` from `./ui.ts` — as `e2e/entities.e2e.ts` uses them.

- [ ] **Step 1: Worktree and re-pin**

```bash
cd /Users/rob/git/companygraph/obsidian-plugin && git pull --ff-only
git worktree add -b kpi ../obsidian-plugin-kpi origin/main && cd ../obsidian-plugin-kpi
npm uninstall companygraph-meta-model && npm install "github:companygraph/meta-model#v0.47.0"
node -e 'const l=require("./package-lock.json").packages["node_modules/companygraph-meta-model"]; console.log(l.version, l.resolved)'
gh api repos/companygraph/meta-model/git/refs/tags/v0.47.0 --jq .object.sha
```

Expected: `0.47.0` and a `resolved` ending in the SHA the second command prints. `npm test` passes (the pin test holds it).

- [ ] **Step 2: Move the fixture** — in `scripts/fixtures.mjs`, set `INSTANCE_COMMIT` to Task 5's merge SHA. Run `node scripts/fixtures.mjs && ls test/fixtures/mental-model/model/kpis/change-lead-time.md test/fixtures/mental-model/meta/core/kpi-schema.md`. Expected: both exist.

- [ ] **Step 3: Write the failing e2e test** — `e2e/kpi.e2e.ts`

```ts
// The kpi type as a person writes it in the vault: New entity makes one, completion offers the
// direction tokens and the vault's KPIs, and the references pane lists a KPI under what it names.
import { after, afterEach, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { available, start } from "./obsidian.ts";
import type { Session } from "./obsidian.ts";
import { mentionsOf, openNote } from "./notes.ts";
import { command, intoField, noModal, onDisk, pick, promptItems, waitForModal, waitForPrompt } from "./ui.ts";

const skip = available() ? false : "Obsidian is not installed here; set OBSIDIAN_BIN to run this suite";
const LEAD = "model/kpis/change-lead-time.md";
const PROBE = "model/kpis/e2e-probe-kpi.md";
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

describe("the kpi type", { skip }, () => {
  let session: Session;
  before(async () => {
    // A fixture from before the instance was seeded would let every test below pass on nothing.
    assert.ok(fs.existsSync(path.join("test", "fixtures", "mental-model", LEAD)), "the fixture instance holds the DORA KPIs");
    session = await start();
  });
  afterEach(async (t) => { if (!(t as { passed?: boolean }).passed) await session.record((t as { name: string }).name); });
  after(async () => { await session?.stop(); });

  test("New entity offers kpi and writes one in kpis/ with its required sections", async () => {
    const { ui } = session;
    await openNote(ui, LEAD);
    await command(ui, "new-entity");
    await waitForPrompt(ui);
    assert.ok((await promptItems(ui)).some((item) => item.startsWith("kpi —")));
    await pick(ui, "kpi —");
    await waitForModal(ui, "New kpi");
    await intoField(ui, "Name");
    await ui.type("E2E Probe KPI");
    await ui.press("Enter");
    await noModal(ui);
    const text = (await onDisk(ui, PROBE))!;
    assert.match(text, /# E2E Probe KPI\n/);
    assert.match(text, /## How it is measured/);
    assert.match(text, /## What it can hide/);
  });

  test("direction completes to its three tokens, and read-with to the vault's KPIs", async () => {
    const { ui } = session;
    await openNote(ui, LEAD);
    await sourceMode(ui, true);
    // Clear the value on a line and read what the suggest offers, as names.e2e.ts does for source.
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
    assert.deepEqual([...(await offeredOn("direction: "))].sort(), ["higher", "lower", "target"]);
    assert.ok((await offeredOn("  - ")).includes("Change Fail Rate"));
    await sourceMode(ui, false);
    await session.restore([LEAD]);
  });

  test("the references pane lists a KPI under its process and under the KPI it is read with", async () => {
    const { ui } = session;
    const underDelivery = await mentionsOf(ui, "model/processes/delivery/delivery.md");
    assert.ok(underDelivery.some((m) => m.path === LEAD && m.declared === "measures"));
    const underFail = await mentionsOf(ui, "model/kpis/change-fail-rate.md");
    assert.ok(underFail.some((m) => m.path === LEAD && m.declared === "read-with"));
  });
});
```

The two helpers are copied from `e2e/names.e2e.ts`, which reads a frontmatter value's offers the same way; the test adds nothing to the plugin for its own sake. `session.restore` puts the note back as the fixture had it.

- [ ] **Step 4: Run it**

Run: `OBSIDIAN_BIN=… npm run e2e -- --test-name-pattern "the kpi type"` (or the full `npm run e2e`) Expected: PASS, with no source change. If a test fails, the failure is a real gap in the plugin's reading of the type: stop, report it, and write the fix under superpowers:systematic-debugging with its own unit test in `test/`.

- [ ] **Step 5: README paragraph** — after the question paragraph in `README.md`:

```markdown
A KPI, a type of core since 0.41.0, is written like any other entity: New entity offers it and creates it in `kpis/` with its required sections, `direction` completes to `lower`, `higher` and `target` and marks anything else, `owner`, `measures`, `serves` and `read-with` complete to the vault's roles, processes, objectives and KPIs, and the references pane lists a KPI under each entity it names.
```

- [ ] **Step 6: Full suites, then the release commit** — `npm test && npm run build && npm run e2e`, all green. Move the version by a minor in `manifest.json`, `package.json` and `versions.json` exactly as the last release commit in `git log --oneline -- versions.json` did.

- [ ] **Step 7: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The plugin writes a KPI

The package moves to meta-model v0.47.0, whose core adds the kpi type, and the e2e fixture to the reference instance's commit that seeds the five DORA metrics, so the new test finds real KPIs: New entity writes one, direction and read-with complete, and the references pane lists a KPI under its process and the KPI it is read with. No source change was needed; the type is read from its schema.

Verified: npm test, npm run build and npm run e2e pass; the pin test reads the lockfile at v0.47.0.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
git push -u origin kpi && gh pr create --title "The plugin writes a KPI" --body "…the commit body, the Verified line, the Claude Code line…"
```

Stop for Rob's merge and his go on the release; the release follows the plugin's own release steps (tag, GitHub release with `main.js`, `manifest.json`, `styles.css`). Rob installs it with `npx "github:companygraph/meta-model#v0.47.0" obsidian`.

---

## Phase D — the other two instances

### Task 7: companygraph/mental-model upgrades and is seeded

Exactly Task 5's steps in `/Users/rob/git/companygraph/mental-model`, worktree `../mental-model-kpis-from-dora`, with this DEPLOYMENT paragraph:

> A deployment is a merge to `main` in a repository whose workflow publishes one of this model's surfaces — the companygraph.io website, which GitHub Pages publishes, and the mcp.companygraph.io MCP server and the chat.companygraph.io chat, which the deploy workflow publishes — and a release of meta-model, mcp-server, chat-server or the Obsidian plugin, because a release is what someone adopting CompanyGraph installs.

Commit and PR title: "The five DORA metrics, as KPIs of Delivery"; body as Task 5's, with "we" where the instance writes in the first person. Stop for Rob's merge.

### Task 8: guestgraph/mental-model upgrades and is seeded

Exactly Task 5's steps in `/Users/rob/git/guestgraph/mental-model`, with this DEPLOYMENT paragraph:

> A deployment is a merge to `main` in a repository whose workflow publishes one of this model's surfaces: the guestgraph.io website, which GitHub Pages publishes, and the mcp.guestgraph.io MCP server and the chat.guestgraph.io chat, which the deploy workflow publishes.

Stop for Rob's merge.

---

## Phase E — the consumers re-pin

### Task 9: mcp-server, the three hosts and the three sites

Each is its own worktree, commit and PR, each stopped for Rob's merge; every package re-pin is proved from `package-lock.json` as in Task 6 Step 1.

- [ ] **Step 1: mcp-server** — re-pin `companygraph-meta-model` to `v0.47.0`; `npm test`; a patch release on Rob's go. Proof that the type is served: in its tests, the fixture instance parse lists `kpi` among the types (`list_types`).
- [ ] **Step 2: the three hosts** — `robertblust/mcp-blust-ch`, `companygraph/mcp-companygraph-io`, `guestgraph/mcp-guestgraph-io`: re-pin `companygraph-mcp-server` to the Step 1 release and `source.json`'s `commit` to the instance's merge commit from Task 5, 7 or 8; `npm test`. After the deploy: `get_entity` on Change Lead Time from each host returns edges `owner` → Owner, `measures` → Delivery and `read-with` → Change Fail Rate.
- [ ] **Step 3: the three sites** — `robertblust/robertblust.github.io`, `companygraph/companygraph.github.io`, `guestgraph/guestgraph.github.io`: re-pin `companygraph-meta-model` to `v0.47.0` and `source.json` to the instance's merge commit; `npm run model && npm run build` (and `npm run sitemap` where a page changed); `model:check` and `build:check` pass. On companygraph.io, confirm `/model/` gains its generated `kpi` term (`grep -c 'term-kpi' model/index.html` is 1).
- [ ] **Step 4: Live verification** — the instance checks are green on all three instances' `main`, and the `get_entity` calls of Step 2 answer from the live hosts. Report each result with the host and the model commit it names.
