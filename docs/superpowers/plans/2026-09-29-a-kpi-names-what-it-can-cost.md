# A KPI names what it can cost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The KPI schema gains an optional `can-cost` field, an array of references to values, held by the checks from the schema, shown in the example instance, released as core 0.48.0, and taken by the three instances.

**Architecture:** The field is existing vocabulary shape (`array of ref → value`), so the checker, the parser, the MCP server and the Obsidian plugin read it from `core/kpi-schema.md` without a code change. The work is the schema row and its writing rules, tests that show the checks and the parser hold it, one case in `example/`, the version bump, and after the owner's merge the release, the re-pins and a check that the tooling reads it.

**Tech Stack:** Markdown schemas, Node's own test runner (`node --test`), the `companygraph` CLI in this repository.

**Spec:** `docs/superpowers/specs/2026-09-29-a-kpi-names-what-it-can-cost-design.md`

## Global Constraints

- Field name: `can-cost`. Row, verbatim: `` | `can-cost` | No | array of ref → value | The values that pushing this number can wear down, each the H1 of a file in `values/` | ``, placed directly after the `read-with` row.
- Writing rules, verbatim, placed directly after the `read-with` rule: `` - `can-cost` names a value only where `## What it can hide` says how pushing the number wears it down. The field is the edge; the section is the reason, and a name with no reason under it is a claim nothing backs. `` and `- A value any KPI could cost tells a reader nothing, and is not named.`
- The KPI schema's Purpose paragraph is not changed.
- Core moves 0.47.0 → 0.48.0 in `core/manifest.json`; the package moves 0.63.0 → 0.64.0 in `package.json`, and `.github/workflows/instance-check.yml`'s `ref:` moves to `v0.64.0` in the same commit.
- No change under `lib/` or `bin/`. If a test shows one is needed, stop and report: the spec says none is.
- Every commit is authored by the seat that did the work, with trailers `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line; the message is prose in the git register and ends with a `Verified:` line naming the commands actually run, written after running them.
- Nothing is merged, tagged or released without the owner's word. Tasks 4 to 7 start only after it.
- Before any `node` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`. Push with `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push`.

## Review Focus

- A `can-cost` naming an entity that exists under another type, a KPI's name for instance, must fail as unresolvable: a reference resolves by its declared type only. Pinned in Task 1.
- `can-cost` written as a flow sequence, `[Craftsmanship]`, must fail under R11 as every frontmatter list does. Pinned in Task 1.
- Two values under `can-cost` must draw two edges, one each, both `via: "can-cost"`. Pinned in Task 2.
- The example instance must still pass `npm run verify` with the field in place, since `verify` checks `example/`. Held by Task 2's run.
- The three instances must pass their checks after an upgrade to the new core with no page changed. Held by Task 3's scratch upgrade and Task 5.

---

### Task 1: The schema declares `can-cost`, and the checks hold it

**Files:**

- Modify: `core/kpi-schema.md` (the `## Frontmatter` table after the `read-with` row; `## Writing rules` after the `read-with` rule)
- Test: `verify/kpi.test.mjs`

**Interfaces:**

- Consumes: `checkInstance(files, { core, model })` from `lib/checks.mjs`, as the file already uses.
- Produces: the declared field `can-cost` on the `kpi` type, which Task 2 relies on.

- [ ] **Step 1: Write the failing tests**

In `verify/kpi.test.mjs`, add the value schema and one value to `tree`, and give `GOOD` a `can-cost`. Replace the `GOOD` line with:

```js
const GOOD = ["source: Local", "owner: Owner", "measures: Delivery", "unit: hours", "direction: lower", "read-with:", "  - Change Fail Rate", "can-cost:", "  - Craftsmanship"];
```

In `tree`, after the `strategic-objective-schema.md` entry, add:

```js
  ["meta/core/value-schema.md", bare("value", "model/values/*.md")],
```

and after the `model/processes/delivery/delivery.md` entry, add:

```js
  ["model/values/craftsmanship.md", "# Craftsmanship\n\n> One thing that holds.\n"],
```

The two tests that edit `read-with` by slicing `GOOD` must now replace the `read-with` entry by value, since it is no longer last. Replace them with:

```js
test("a KPI whose read-with names itself passes; the writing rule, not the checker, refuses it", () => {
  assert.deepEqual(about(GOOD.map((l) => l.replace("  - Change Fail Rate", "  - Change Lead Time"))), []);
});
```

```js
test("a read-with naming no KPI fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Change Fail Rate", "  - Uptime")), undefined, "\"Uptime\"").length, 1);
});
```

Add at the end of the file:

```js
test("a can-cost naming no value fails", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Craftsmanship", "  - Speed")), undefined, "\"Speed\"").length, 1);
});

test("a can-cost naming a KPI, not a value, fails: a reference resolves by its declared type", () => {
  assert.equal(about(GOOD.map((l) => l.replace("  - Craftsmanship", "  - Change Fail Rate")), undefined, "\"Change Fail Rate\"").length, 1);
});

test("a can-cost written as a flow sequence fails under R11", () => {
  const fm = GOOD.filter((l) => l !== "  - Craftsmanship").map((l) => (l === "can-cost:" ? "can-cost: [Craftsmanship]" : l));
  assert.ok(about(fm, undefined, "can-cost").length >= 1);
});

test("a KPI without can-cost passes, since the field is optional", () => {
  assert.deepEqual(about(GOOD.filter((l) => l !== "can-cost:" && l !== "  - Craftsmanship")), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/kpi.test.mjs` Expected: FAIL. The passing-KPI test fails because `can-cost` is a frontmatter field the schema does not declare (R15), and the two naming tests fail on that same undeclared field rather than on the name. Copy the failure lines into the task report.

- [ ] **Step 3: Add the schema row and the writing rules**

In `core/kpi-schema.md`, directly after the row that begins `` | `read-with` | ``, add:

```markdown
| `can-cost` | No | array of ref → value | The values that pushing this number can wear down, each the H1 of a file in `values/` |
```

In `## Writing rules`, directly after the rule that begins `` - `read-with` names a KPI ``, add:

```markdown
- `can-cost` names a value only where `## What it can hide` says how pushing the number wears
  it down. The field is the edge; the section is the reason, and a name with no reason under it
  is a claim nothing backs.
- A value any KPI could cost tells a reader nothing, and is not named.
```

Wrap as the surrounding rules wrap, then run `sh conventions/conventions-format fix` and read the diff: it may only re-wrap.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test verify/kpi.test.mjs` Expected: PASS, every test. The checker's R11 failure reads `` `can-cost` is a flow sequence; R11 wants one entry per line ``, which the flow-sequence test matches on `can-cost`.

Then: `npm run verify` and `node --test verify/*.test.mjs`. Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add core/kpi-schema.md verify/kpi.test.mjs
git commit --author="Implementer <implementer@companygraph.io>" -F - <<'EOF'
A KPI names the values it can cost

<one paragraph: a KPI guarded its number against other numbers and linked to nothing the company holds that is not a number; the schema gains can-cost, optional, an array of references to values, with the two writing rules; the tests hold a name that resolves to nothing, a name of another type, a flow sequence and the field's absence.>

Verified: <the commands run in Steps 2 and 4 and what each reported, including that kpi.test.mjs failed before the schema row>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

Expected: the subject prints alone in brackets.

### Task 2: The example names what Change Lead Time can cost, and the parser draws the edge

**Files:**

- Modify: `example/model/kpis/change-lead-time.md` (frontmatter)
- Test: `verify/kpi.test.mjs`

**Interfaces:**

- Consumes: the `can-cost` field from Task 1; `parseInstance(files, { sub, schemas })` from `lib/instance.mjs`, where `files` maps paths under `example/model/` to text and `schemas` maps paths under `core/` to text, and which returns `{ entities, edges }` with each edge `{ from, to, via, attrs }`.
- Produces: an edge `{ from: "kpis/change-lead-time", to: "values/craftsmanship", via: "can-cost" }` in the example, which Task 6 reads through the MCP server and the plugin's parser.

- [ ] **Step 1: Write the failing tests**

At the top of `verify/kpi.test.mjs`, extend the imports:

```js
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseInstance } from "../lib/instance.mjs";
```

Add at the end of the file:

```js
// The example read the way a site reads it: every page under example/model and every schema
// under core, so the edge is drawn by the parser from the real schema and not by the test.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const folder = (rel) => {
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(join(ROOT, rel, d))) {
      const child = d ? `${d}/${name}` : name;
      if (statSync(join(ROOT, rel, child)).isDirectory()) walk(child);
      else if (child.endsWith(".md")) out.set(child, fs.readFileSync(join(ROOT, rel, child), "utf8"));
    }
  };
  walk("");
  return out;
};

test("the example's Change Lead Time names Craftsmanship, and the parser draws the edge", () => {
  const { edges } = parseInstance(folder("example/model"), { sub: "model/", schemas: folder("core") });
  const costs = edges.filter((e) => e.via === "can-cost").map(({ from, to }) => ({ from, to }));
  assert.deepEqual(costs, [{ from: "kpis/change-lead-time", to: "values/craftsmanship" }]);
});

test("two values under can-cost draw two edges", () => {
  const files = folder("example/model");
  const page = files.get("kpis/change-lead-time.md");
  files.set("kpis/change-lead-time.md", page.replace("  - Craftsmanship\n", "  - Craftsmanship\n  - Say The Hard Thing\n"));
  const { edges } = parseInstance(files, { sub: "model/", schemas: folder("core") });
  assert.deepEqual(edges.filter((e) => e.via === "can-cost").map((e) => e.to).sort(), ["values/craftsmanship", "values/say-the-hard-thing"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test verify/kpi.test.mjs` Expected: FAIL on both new tests: the example carries no `can-cost`, so the first finds no edge and the second finds no line to extend.

- [ ] **Step 3: Add the field to the example**

In `example/model/kpis/change-lead-time.md`, directly after the `read-with` list, add:

```yaml
can-cost:
  - Craftsmanship
```

The page's `## What it can hide` already says it "shortens when changes get smaller and when review gets thinner", which is the reason the writing rule asks for; the prose is not changed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test verify/kpi.test.mjs`, then `npm run verify` and `node --test verify/*.test.mjs`. Expected: all pass. `npm run verify` checks `example/`, so it also shows the example still passes with the field.

- [ ] **Step 5: Commit**

```bash
git add example/model/kpis/change-lead-time.md verify/kpi.test.mjs
git commit --author="Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example's Change Lead Time names Craftsmanship

<one paragraph: the example gains the field where its own prose already says how, review thinning to shorten lead time; a test reads the example as a site does and finds the edge the parser draws from the real schema, and a second finds two edges for two values.>

Verified: <the commands run in Steps 2 and 4 and what each reported>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git log -1 --format='[%s]'
```

### Task 3: Core 0.48.0 and the package at 0.64.0, and the pull request

**Files:**

- Modify: `core/manifest.json`, `package.json`, `.github/workflows/instance-check.yml`

**Interfaces:**

- Consumes: Tasks 1 and 2 committed.
- Produces: the branch the owner merges, and the release Task 4 tags.

- [ ] **Step 1: Move the three versions**

```bash
sed -i '' 's/"version": "0.47.0"/"version": "0.48.0"/' core/manifest.json
sed -i '' 's/"version": "0.63.0"/"version": "0.64.0"/' package.json
sed -i '' 's/          ref: v0.63.0/          ref: v0.64.0/' .github/workflows/instance-check.yml
git diff --stat
```

Expected: three files, one line each.

- [ ] **Step 2: Run every suite**

Run each and record the result: `npm run verify`, `npm run test:instance`, `npm run test:instance-checks`, `npm run test:instance-files`, `npm run test:plan`, `npm run test:rules`, `npm run test:cli`, `npm run test:untar`, `npm run test:fetch-core`, `npm run test:obsidian`, `npm run test:seats`, `sh conventions/conventions-check`, `sh conventions/conventions-format`. Expected: every one passes; `verify`'s release check passes only because the workflow's ref and the package version agree.

- [ ] **Step 3: Upgrade the three instances on scratch copies**

For each of `~/git/robertblust/mental-model`, `~/git/companygraph/mental-model`, `~/git/guestgraph/mental-model`, copy the instance's main to a scratch folder and run this branch's CLI against it. Without `--core`, `upgrade` takes the core of the checkout it runs from, so nothing is published to test it:

```bash
for r in robertblust companygraph guestgraph; do
  S=$(mktemp -d); git -C ~/git/$r/mental-model archive origin/main | tar -x -C "$S"
  echo "== $r"; node bin/companygraph.mjs upgrade "$S" 2>&1 | tail -3
done
```

Expected, for each: `core 0.47.0 → 0.48.0`, the kpi schema among the files written, and the checks passing with no page changed.

- [ ] **Step 4: Commit and open the pull request**

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml
git commit --author="Implementer <implementer@companygraph.io>" -F - <<'EOF'
Core 0.48.0 and the package at 0.64.0

A type gains an optional field and no page loses anything, so core moves a minor, and the package with it. The instance workflow's ref moves with the package, as the release check requires.

Verified: <Step 2's commands and results; Step 3's three scratch upgrades and what each reported>

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-kpi-names-what-it-can-cost
```

Open the pull request with a prose body in the family's register, no headings and no bullets: the gap, the field and its two rules, the example's case, the versions, what a consumer does (re-pin; no page changes), one line `Release notes to write at tagging: …`, a `Verified:` sentence naming what ran, and the `🤖 Generated with [Claude Code](https://claude.com/claude-code)` line. Report the URL and the check status, and stop.

### Task 4: Tag v0.64.0 (after the owner's merge word)

- [ ] **Step 1: Merge and release, on the owner's word only**

```bash
gh pr merge <number> --merge
git -C ~/git/companygraph/meta-model pull --ff-only
gh release create v0.64.0 --target <merge commit sha> --title v0.64.0 --notes-file -
```

The notes, as prose: a KPI can name the values pushing it can wear down, through the optional `can-cost` field and the reason its `## What it can hide` gives; core 0.48.0; an instance takes it with a re-pin and no page has to change. Then remove the worktree and delete the branch by name, locally and on the remote, each as its own command.

### Task 5: The three instances take v0.64.0

- [ ] **Step 1: Re-pin each instance**

For each of robertblust, companygraph and guestgraph, in a sibling worktree `mental-model-tooling-0-64-0` on branch `tooling-0-64-0` from `origin/main`:

```bash
npx -y github:companygraph/meta-model#v0.64.0 upgrade .
git status --short
```

Expected: `meta/core/kpi-schema.md`, `meta/core/manifest.json`, `.companygraph/manifest.json` and `.github/workflows/companygraph.yml` change, and the check passes. Run `sh conventions/conventions-check` and `sh conventions/conventions-format`, commit as `Implementer <implementer@<domain>>` (blust.ch, companygraph.io, guestgraph.io) with the Implement/Code trailers and a `Verified:` line, push, open one pull request each, report, and stop for the owner's merge.

### Task 6: The tooling reads the field

- [ ] **Step 1: The MCP server's snapshot carries the edge**

In `~/git/companygraph/mcp-server` (its installed parser, whatever it pins), run against the released example:

```bash
MM=~/git/companygraph/meta-model
node --input-type=module -e '
import { readDir } from "./lib/read.mjs";
import { buildSnapshot } from "./lib/snapshot.mjs";
const s = buildSnapshot({ files: readDir(process.env.MM + "/example/model"), schemas: readDir(process.env.MM + "/core"), sub: "" });
console.log(JSON.stringify(s.edges.filter((e) => e.via === "can-cost")));
console.log(JSON.stringify(s.schemaEdges.filter((e) => JSON.stringify(e).includes("can-cost"))));
'
```

Expected: one entity edge from `kpis/change-lead-time` to `values/craftsmanship`, and one schema edge `{"from":"core/kpi","to":"core/value","via":"can-cost",…}`, the shape `read-with` already has as `core/kpi` → `core/kpi`. An empty result is a finding to report, not a pass.

- [ ] **Step 2: The plugin's parser reads the field from the schema**

In `~/git/companygraph/obsidian-plugin`, with its installed parser:

```bash
node --input-type=module -e '
import fs from "node:fs";
import { parseSchemas } from "companygraph-meta-model/instance";
const dir = process.env.MM + "/core";
const files = new Map(fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => [f, fs.readFileSync(dir + "/" + f, "utf8")]));
const g = parseSchemas(files);
console.log(JSON.stringify(g.edges.filter((e) => JSON.stringify(e).includes("can-cost"))));
'
```

Expected: `{"from":"core/kpi","to":"core/value","via":"can-cost",…}`, which is what the plugin's reference completion reads. Report both outputs; no commit.

### Task 7: The first entries, one at a time

- [ ] **Step 1: Put each entry to the owner**

After Task 5's robertblust re-pin is merged: for Deployment Frequency, then Change Lead Time, show the owner in chat the frontmatter line `can-cost:` / `  - Decide well over build fast`, the sentence of `## What it can hide` that gives the reason, the case against, and the proposal. Write each only on the owner's word, commit as `Writer <writer@blust.ch>` with `Process: Delivery`, `Phase: Implement`, `Track: Prose`, validate with the instance's check, and open the pull request. Then read the KPIs of companygraph and guestgraph for a case, and propose none where their prose names no value.
