# A question has a kind — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core gains the type `question-kind` and a required `kind` on every question; the Obsidian plugin adopts it, all three instances carry their kinds, the chat's start chips offer one question from each of three kinds, and all of it is live on every site and MCP host.

**Architecture:** The type is a Markdown schema in `core/` written in existing vocabulary (`ref`, `number`), so the parser and checker read it with one row in the checker's `TYPES` table and no new check: the rank check is already generic over every type that declares `rank`. The reference instance is seeded first because the plugin's e2e vault is that instance at a pinned commit; the plugin then re-pins and proves the type; the other two instances follow; design's chips pick across kinds from the `fields.kind` the site's model file already carries; the servers, hosts and sites re-pin last.

**Tech Stack:** Node ESM (`node --test`), Markdown schemas, TypeScript Obsidian plugin with a CDP-driven e2e suite, plain browser JS in design, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-26-a-question-has-a-kind-design.md` (this branch).

## Global Constraints

- Type id `question-kind`; folder `model/question-kinds/*.md`; owned by nothing; schema file `core/question-kind-schema.md`; frontmatter `source` (required), `source-id` (optional), `rank` (required, `number`); sections `# [Label]`, `> [Summary]`, `## What it means`, all required.
- A question gains `kind` (Yes, `ref → question-kind`), written after `source-id` in the schema and after `source` (or `source-id` where present) in a file.
- `rank` is spaced in tens, and two kinds never share one; a kind holds at least two questions (a writing rule, not a check).
- Versions: meta-model v0.53.0 with core 0.45.0, if no other release lands first; otherwise the next minor of each. The Obsidian plugin 0.15.0, after #85 (0.14.0) is merged and released. mcp-server the next patch after v0.30.3. design the next minor.
- Prerequisites Rob merges first: obsidian-plugin #85 and its 0.14.0 release before Phase C; mcp-blust-ch #98, mcp-companygraph-io #64, mcp-guestgraph-io #25 before Phase F.
- American English everywhere (R14); commits and PR bodies are prose, no headings or bullets, ending `Verified: …` before the trailers; no em-dash in any model file, schema or commit written here.
- Numbers that move are never written: no count of questions, kinds or types in any prose. A rank is a value, not a count.
- Every branch lives in a sibling worktree named `<repo>-<branch>`; the clone stays on `main`.
- Every PR is opened and left: a merge, a tag and a release each wait for Rob's explicit go. Each instance PR goes to Rob kind by kind, one question per turn.
- Before any `node`/`npm`/`gh`: `export PATH=/opt/homebrew/bin:$PATH`.
- A re-pin installs the package by name after removing it (`npm uninstall` then `npm install "github:…#vX"`), and is proved by reading `packages["node_modules/<name>"]` in `package-lock.json`, never by a grep. meta-model keeps no lockfile.
- Before tagging meta-model, `version` in `package.json` and the `ref:` in `.github/workflows/instance-check.yml` name the same release.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; PR bodies end `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

## Review Focus

- A question-kind folder the checks never read: every file in it would pass because none was looked at. Task 1 includes a kind with no `## What it means` and asserts it fails, which only a read folder can.
- A `rank` written as text (`rank: first`): the generic check skips non-integers silently, so the type check on `number` must catch it. Task 1 asserts a non-numeric rank fails.
- A question whose `kind` names a decision kind of the same name (`Architecture` exists as a decision kind in the example): a name-only resolver would accept it. Task 1 asserts `kind: Architecture` on a question fails when only a decision kind carries that name.
- A site whose model file carries questions with no kind (a site that re-pins design before its model): the chips must behave exactly as today. Task 8 asserts `spread` with no kinds equals `pick` under the same random.
- The plugin's e2e fixture pinned to a pre-kind commit of the reference instance: the new suite would pass with no kind to find. Task 5 asserts the fixture holds `model/question-kinds/career.md` before any test runs.

---

## Phase A — meta-model (worktree `meta-model-a-question-has-a-kind`, branch `a-question-has-a-kind`, which already holds the spec and this plan)

### Task 1: The schema, the question's field and the checker's row

**Files:**

- Create: `core/question-kind-schema.md`
- Modify: `core/question-schema.md` (one frontmatter row, one writing rule)
- Modify: `lib/checks.mjs` (`TYPES`, after `{ type: "question", folder: "questions" }`)
- Create: `verify/question-kind.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/question-kind.test.mjs` at the end)

**Interfaces:**

- Produces: the `TYPES` row `{ type: "question-kind", folder: "question-kinds" }`; the two schemas below, which Tasks 2, 4, 6 and 7 write against.

- [ ] **Step 1: Write the failing test** — `verify/question-kind.test.mjs`

```js
// The question kind and the question's kind, held by the instance checks through their real
// schemas: both files are read from disk so the test fails if a schema and the checks part. The
// schemas they reference are bare, as ref-by.test.mjs has them, and a decision kind named like a
// question kind is there to prove the reference resolves by its declared type.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kind = (name, rank, { meaning = true } = {}) => ["---", "source: Local", `rank: ${rank}`, "---", "", `# ${name}`, "", "> What these questions are about.", "",
  ...(meaning ? ["## What it means", "", "Prose.", ""] : [])].join("\n");
const question = (name, fm) => ["---", ...fm, "---", "", `# ${name}`, "", "> Where the answer lies.", ""].join("\n");

const tree = ({ kinds = [["Product", 10], ["Company", 20]], fm = ["source: Local", "kind: Product"], missingMeaning = false } = {}) => new Map([
  ["meta/core/question-kind-schema.md", real("question-kind")],
  ["meta/core/question-schema.md", real("question")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/decision-kind-schema.md", bare("decision-kind", "model/decision-kinds/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/decision-kinds/architecture.md", "# Architecture\n\n> How it is built.\n"],
  ...kinds.map(([n, r], i) => [`model/question-kinds/${n.toLowerCase()}.md`, kind(n, r, { meaning: !(missingMeaning && i === 0) })]),
  ["model/questions/who-split-billing.md", question("Who split billing?", fm)],
  ["model/questions/does-beacon-publish-its-revenue.md", question("Does Beacon publish its revenue?", ["source: Local", "kind: Company"])],
]);
const failures = (opts) => checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures;
const about = (where, opts, ...words) => failures(opts).filter((f) => f.includes(where) && words.every((w) => f.includes(w)));

test("a question naming a kind, and kinds with distinct ranks and every section, pass", () => {
  assert.deepEqual(about("question", undefined), []);
});

test("a question with no kind fails", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local"] }, "no `kind`").length, 1);
});

test("a kind naming no question kind fails", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local", "kind: Pricing"] }, "\"Pricing\"").length, 1);
});

test("a kind naming a decision kind of that name fails, because the reference resolves by its declared type", () => {
  assert.equal(about("questions/who-split-billing.md", { fm: ["source: Local", "kind: Architecture"] }, "\"Architecture\"").length, 1);
});

test("two question kinds sharing a rank fail naming both", () => {
  assert.equal(about("question-kind", { kinds: [["Product", 10], ["Company", 10]] }, "share rank 10", "\"Product\"", "\"Company\"").length, 1);
});

test("a rank that is not a number fails", () => {
  assert.equal(about("question-kinds/product.md", { kinds: [["Product", "first"], ["Company", 20]] }, "rank").length, 1);
});

test("a question kind with no What it means fails, so the folder is read", () => {
  assert.equal(about("question-kinds/product.md", { missingMeaning: true }, "no `## What it means`").length, 1);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test verify/question-kind.test.mjs` Expected: FAIL, reading `core/question-kind-schema.md` throws ENOENT.

- [ ] **Step 3: Write the schema** — `core/question-kind-schema.md`

```markdown
# Question Kind Schema

> Required structure for question kind files.

## File Location

`model/question-kinds/*.md`

A kind owns nothing and nothing owns it: every question claims one of the same few, and what each kind covers lives here rather than being restated on every question. It sits at the container root beside `questions/`, because every question in the instance claims one of the same set.

The set is the instance's own, as an achievement kind's is. What a company's visitors ask about, a career, a product's fit, a hotel's guests, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever questions are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every question references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the questions of this kind are about |
| `## What it means` | Yes | Which questions belong to this kind, and which do not |

## Purpose

A kind answers "what is this question about?", the question a visitor asks of a list too long to read, when what they want is the part of it that concerns them. Its value is that the answer is a reference rather than a word: the kinds are nodes in the graph, a surface can draw the questions of one kind together or one from each, and the chat can say what the model answers about from the model rather than from its own reading.

## Writing rules

- `## What it means` is written so that two readers filing the same question would file it under
  the same kind, and it says what the kind excludes, since the boundary with the kind beside it
  is where every disagreement will be.
- A kind is about what the visitor has in mind when they ask, never about which entity the
  answer rests on.
- Name it as a visitor would read it above the questions it holds, `Career`, `Brand`, and never
  for the type or the section the answers sit in.
- `rank` orders kinds wherever questions are drawn grouped, and nothing else. The first kind is
  the one most visitors come for, and two kinds never share a rank.
- A kind holds at least two questions. One question alone is filed under the nearest kind until a
  second arrives, because a group of one is a heading over a single line.
- Names and prose are American English (R14).
```

- [ ] **Step 4: Give the question its kind** — in `core/question-schema.md`, the Frontmatter table gains, after the `source-id` row:

```markdown
| `kind` | Yes | ref → question-kind | What the question is about, the H1 of a file in `question-kinds/` |
```

and the Writing rules list gains, after "One question per thing asked. …":

```markdown
- A question has one kind, the one a visitor would look under first. A question that seems to need two is either two questions or is filed where most visitors would look for it.
```

- [ ] **Step 5: The checker's row** — in `lib/checks.mjs`, directly after `{ type: "question", folder: "questions" },`:

```js
  // A question's kind is the instance's own set, as an achievement kind is, and every question
  // claims one, so it sits in the container beside the questions it groups.
  { type: "question-kind", folder: "question-kinds" },
```

and in `package.json`, append ` verify/question-kind.test.mjs` inside the `test:instance-checks` script string.

- [ ] **Step 6: Run it and see it pass**

Run: `node --test verify/question-kind.test.mjs` Expected: PASS, 7 tests. If "a rank that is not a number fails" fails, the type check on `number` does not reach frontmatter here: read how `kpi.test.mjs` or `image.test.mjs` asserts a typed field, and report before changing `lib/checks.mjs`. If "fails naming both" fails only on its words, read the actual message and correct the test's words, never the check.

- [ ] **Step 7: Everything else still passes** — `npm run verify` fails now, because the example's questions have no kind; that is Task 2's. Run: `node --test verify/*.test.mjs` Expected: PASS except any test that runs the example tree (`check-script.test.mjs`); note which fail, and confirm each failure names a question and `kind`.

- [ ] **Step 8: Commit**

```bash
git add core/question-kind-schema.md core/question-schema.md lib/checks.mjs verify/question-kind.test.mjs package.json
git commit -F - <<'EOF'
Core gains the type question-kind, and a question names its kind

A question kind is the instance's own ranked set of what its questions are about, as achievement kinds are, and every question now names one in a required kind. The type is written in vocabulary the checker already reads, so it takes one TYPES row and no new check: the rank check is generic over every type that declares rank, and the test proves it reaches this one. The tests read both real schemas from disk, and one names a decision kind to prove a question's kind resolves by its declared type.

Verified: node --test verify/question-kind.test.mjs failed before the schema and passes after it.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 2: The example, and the company skill

**Files:**

- Create: `example/model/question-kinds/product.md`, `example/model/question-kinds/company.md`
- Create: `example/model/questions/what-is-it-like-to-work-at-beacon-systems.md`
- Modify: the three existing `example/model/questions/*.md` (one `kind:` line each)
- Modify: `example/model/README.md` (type list and tree)
- Modify: `agents/claude/skills/companygraph-company/SKILL.md` (step 8, Write)

**Interfaces:**

- Consumes: Task 1's schemas.
- Produces: the example's kinds `Product` (rank 10) and `Company` (rank 20), which the plugin's unit tests read from the package in Task 5.

- [ ] **Step 1: See verify fail on the example** — Run: `npm run verify` Expected: FAIL, three failures, each naming a file in `example/model/questions/` and `no \`kind\``.

- [ ] **Step 2: The kinds**

`example/model/question-kinds/product.md`:

```markdown
---
source: Local
rank: 10
---

# Product

> Questions about what the billing platform does and how it came to be built the way it is.

## What it means

A question a customer or an engineer asks about the product itself: what a line on an invoice means, which feature explains it, why a part of the platform stands where it does. It is this kind even when a decision or a period answers it, because the visitor is asking about the product.

A question about the company behind it, how it works, what it publishes about itself, what it is like inside, is Company.
```

`example/model/question-kinds/company.md`:

```markdown
---
source: Local
rank: 20
---

# Company

> Questions about Beacon Systems as a company: what it publishes about itself and what it is like to work there.

## What it means

A question about the company rather than what it sells: its figures, its ways of working, what it holds to. A candidate's questions are this kind.

A question about a feature, an invoice or why the platform is built as it is is Product, even when a value of the company's explains the answer.
```

- [ ] **Step 3: Each question names its kind** — insert one line after `source: Local` in the frontmatter:

| File | Line |
| --- | --- |
| `example/model/questions/how-do-i-find-out-why-a-line-is-on-my-invoice.md` | `kind: Product` |
| `example/model/questions/who-split-billing-out-of-the-monolith.md` | `kind: Product` |
| `example/model/questions/does-beacon-systems-publish-its-revenue.md` | `kind: Company` |

- [ ] **Step 4: The new question** — `example/model/questions/what-is-it-like-to-work-at-beacon-systems.md`:

```markdown
---
source: Local
kind: Company
---

# What is it like to work at Beacon Systems?

> The company's values say what it holds to in its daily work: how it treats a deadline and when disagreement is still worth saying.

## Rests on

| Type | Entity | Owner | For |
| --- | --- | --- | --- |
| value | Craftsmanship | | how it treats a deadline |
| value | Say The Hard Thing | | when disagreement is still worth saying |
```

The second value's H1 is `Say The Hard Thing`, capitalized as its file writes it; the Entity cell must match it exactly.

- [ ] **Step 5: The example's README** — in `example/model/README.md`, the type list gains `` `question-kind` `` after `` `question` ``; in the tree, `questions/` gains `what-is-it-like-to-work-at-beacon-systems.md` (re-wrap to the block's width), and a new line follows the `questions/` entry:

```
question-kinds/                  product.md, company.md
```

- [ ] **Step 6: The company skill writes kinds** — in `agents/claude/skills/companygraph-company/SKILL.md`, step 8, replace the sentence that begins "Questions last, since a question rests on entities that must exist;" with:

```markdown
Question kinds, then questions last, since a question rests on entities that must exist and names a kind that must too: where the FAQ groups its questions, each group is proposed as a kind in the ledger with the site's own heading as a draft name, and where it does not, the run proposes the fewest kinds that hold two questions each; the operator names, keeps or merges each, and the ranks follow the order the FAQ shows. A question's answer routes to the entity that holds the fact and never copies the site's answer, which is the fact the entity holds.
```

In the same skill's description line (frontmatter `description:`), `questions` becomes `question kinds and questions`.

- [ ] **Step 7: Run everything**

Run: `npm run verify && node --test verify/*.test.mjs && sh conventions/conventions-check && sh conventions/conventions-format check` Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add example agents/claude/skills/companygraph-company/SKILL.md
git commit -F - <<'EOF'
The example groups its questions, and the company skill writes kinds

Beacon's questions fall under two kinds, Product and Company, each holding two as the kind's own writing rule asks: the invoice line and the monolith are Product, and the revenue question is joined under Company by what it is like to work at Beacon, which rests on the two values the example already holds. The company skill now proposes kinds from the FAQ's own groups, or the fewest that hold two questions each, and writes them before the questions.

Verified: npm run verify and node --test verify/*.test.mjs pass, and failed on the three unkinded questions before this commit; conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
```

### Task 3: The release and its lists

**Files:**

- Modify: `README.md` (the `*-schema.md` block at line 18-19 and the "`core/` is the list" sentence)
- Modify: `core/manifest.json` → `{ "version": "0.45.0", "shape": 3 }`
- Modify: `package.json` → `"version": "0.53.0"`
- Modify: `.github/workflows/instance-check.yml` → `ref: v0.53.0`

- [ ] **Step 1: Check the numbers are still free** — `gh release list -R companygraph/meta-model -L 1` Expected: `v0.52.0` is latest. If another release has landed, take the next minor of both core and the package and use those numbers everywhere below.

- [ ] **Step 2: Edit the lists** — in `README.md`'s tree, `question` becomes `question, question-kind` (re-wrap the block's lines to keep their width); in the "`core/` is the list" sentence, `…, concept, question, decision, …` becomes `…, concept, question, question-kind, decision, …`.

- [ ] **Step 3: Move the three version places together** — as listed above. No lockfile is written.

- [ ] **Step 4: Run everything** — `npm run verify && node --test verify/*.test.mjs && sh conventions/conventions-check && sh conventions/conventions-format check` Expected: PASS; the release check in `verify/check.mjs` passes because the ref and the version agree.

- [ ] **Step 5: Commit, push, open the PR, and stop**

```bash
git add README.md core/manifest.json package.json .github/workflows/instance-check.yml
git commit -F - <<'EOF'
Core 0.45.0 and the package at 0.53.0

The README names question-kind among the schemas, core's manifest moves by a minor for the new type and the question's new field, and the package version and the instance workflow's ref move together to the release they will be tagged as.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-question-has-a-kind
gh pr create --title "A question has a kind" --body-file <(cat <<'EOF'
Core gains the type question-kind, the instance's own ranked set of what its questions are about, in the form achievement kinds take, and every question now names one in a required kind. A visitor asked the chat whether the model's questions could be grouped, and the chat could only offer its own reading; with this, the chat answers from the model through list_entities and list_references, and the start chips can offer one question from each of three kinds. The spec and plan are in docs/superpowers. The type is written in existing vocabulary, so the checker gains one TYPES row and no new check, the generic rank check reaching it as the test proves; the example groups its questions under Product and Company, gaining one question so each kind holds two; and the company skill proposes kinds from a FAQ's own groups. The field is required, so an instance that upgrades defines its kinds and gives every question one in the same change. This is core 0.45.0 and the package at 0.53.0, with the instance workflow's ref moved with it.

Verified: npm run verify, node --test verify/*.test.mjs, conventions-check and conventions-format check pass locally.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)
```

Stop. The merge waits for Rob's explicit go.

- [ ] **Step 6: After Rob merges, on his go, tag and release**

```bash
cd /Users/rob/git/companygraph/meta-model && git pull --ff-only
gh release create v0.53.0 --target main --title v0.53.0 --notes "Core gains the type question-kind (core 0.45.0): the instance's own ranked set of what its questions are about, and every question names one in a required kind. An instance with questions that upgrades must define its kinds and give each question its kind in the same change, or its checks fail; an instance with no questions needs nothing."
gh api repos/companygraph/meta-model/git/refs/tags/v0.53.0 --jq .object.sha
```

Then remove the worktree and the branch, by name: `git worktree remove ../meta-model-a-question-has-a-kind && git branch -d a-question-has-a-kind && git push origin --delete a-question-has-a-kind`.

---

## Phase B — the reference instance

### Task 4: robertblust/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/question-kinds/README.md`, `career.md`, `ideas.md`, `brand.md`, `model-and-chat.md`
- Modify: every file in `model/questions/` except `README.md` (one `kind:` line each)

**Interfaces:**

- Consumes: meta-model v0.53.0 (Task 3).
- Produces: the merge SHA Task 5 pins; the kinds `Career`, `Ideas`, `Brand`, `Model and chat`, which Task 5's e2e test expects by name.

- [ ] **Step 1: Worktree and upgrade**

```bash
cd /Users/rob/git/robertblust/mental-model && git pull --ff-only
git worktree add -b questions-have-kinds ../mental-model-questions-have-kinds origin/main
cd ../mental-model-questions-have-kinds
npx --yes "github:companygraph/meta-model#v0.53.0" upgrade .
```

Expected: the upgrade moves core to 0.45.0 and tooling to 0.53.0, then runs the checks, which FAIL: every question names no `kind`. That failure is the negative control. Confirm `ls meta/core/question-kind-schema.md` exists and `.companygraph/manifest.json` reads `0.53.0` and `0.45.0`.

- [ ] **Step 2: The folder README** — `model/question-kinds/README.md`:

```markdown
# Question kinds

One file per question kind, written against `meta/core/question-kind-schema.md`.
```

- [ ] **Step 3: The kinds**

`model/question-kinds/career.md`:

```markdown
---
source: Local
rank: 10
---

# Career

> Questions about what Robert has done: the roles and industries, what he led and studied, where he spoke, and the break between the last role and the next.

## What it means

A question whose answer is a period of his working life or what it showed: where he worked, what he led, what he is strongest at, how he measures delivery, whether he still writes code, and why there is a break. It is this kind even when the answer also rests on a skill or a KPI, because the visitor is asking about the career.

A question about what a line on the site means is Ideas, even where the line sums the career up. A question about this model or its chat is Model and chat.
```

`model/question-kinds/ideas.md`:

```markdown
---
source: Local
rank: 20
---

# Ideas

> Questions about what the lines on the site mean and the thinking behind the work.

## What it means

A question from a visitor who has read a line, a tagline, a title, a claim about modeling a company, and asks what it means or why it holds.

How a line looks or sounds is Brand. What Robert did is Career, even where the idea came out of that work.
```

`model/question-kinds/brand.md`:

```markdown
---
source: Local
rank: 30
---

# Brand

> Questions about how the site looks and how its texts sound, and what a visitor may reuse.

## What it means

A question about the colors, the faces, the mark and the voice, and whether a visitor may use them for their own site or text.

What a sentence says is Ideas; how it is set or how it sounds is Brand.
```

`model/question-kinds/model-and-chat.md`:

```markdown
---
source: Local
rank: 40
---

# Model and chat

> Questions about this model and the chat that answers from it: who answers, how well, what is kept, how a claim holds, and how to use or copy the model.

## What it means

A question about the tool rather than the person: the chat, its seat and its measure, what happens to what a visitor types, how a claim is evidenced, and how a person or an agent can use the model or build one like it.

A question about Robert that the chat happens to answer is the kind of what it asks about, not this one.
```

- [ ] **Step 4: Every question names its kind** — run from the worktree root:

```bash
python3 - <<'EOF'
import pathlib, re
KIND = {
  "Career": ["what-does-robert-do", "what-has-robert-led", "what-did-robert-study", "has-robert-worked-in-banking",
    "has-robert-worked-in-insurance", "has-robert-built-ai-into-a-real-business", "what-is-robert-strongest-at",
    "how-does-robert-measure-delivery", "can-robert-still-write-code-himself",
    "what-is-robert-s-history-with-eclipse-and-modeling", "where-has-robert-spoken",
    "why-is-there-a-career-break-and-what-happened-in-it"],
  "Ideas": ["what-problem-does-modeling-a-company-solve", "what-does-building-fast-is-solved-deciding-well-is-not-mean",
    "what-does-over-twenty-five-years-in-order-mean"],
  "Brand": ["what-do-the-colors-on-this-site-mean", "can-i-use-robert-s-colors-and-fonts-for-my-own-site",
    "how-should-a-text-in-robert-s-voice-sound"],
  "Model and chat": ["who-answers-this-chat", "how-well-does-this-chat-answer", "is-what-i-type-here-stored",
    "how-do-i-know-a-claim-here-is-true", "can-i-build-a-model-like-this-of-myself",
    "how-can-i-use-this-model-from-my-own-ai-agent"],
}
named = {slug: k for k, slugs in KIND.items() for slug in slugs}
files = sorted(p for p in pathlib.Path("model/questions").glob("*.md") if p.name != "README.md")
missing = [p.stem for p in files if p.stem not in named]
unknown = [s for s in named if not pathlib.Path(f"model/questions/{s}.md").exists()]
assert not missing and not unknown, (missing, unknown)
for p in files:
    t = p.read_text()
    fm, rest = t.split("\n---\n", 1)
    anchor = "source-id:" if "\nsource-id:" in fm else "source:"
    lines = fm.split("\n")
    at = max(i for i, l in enumerate(lines) if l.startswith(anchor))
    lines.insert(at + 1, f"kind: {named[p.stem]}")
    p.write_text("\n".join(lines) + "\n---\n" + rest)
print("ok", len(files))
EOF
```

Expected: `ok` and no assertion error. An assertion error lists a question the mapping does not name (a question added since this plan was written) or a slug with no file: stop, and ask Rob which kind the new question takes before going on.

- [ ] **Step 5: Check** — `npx --yes "github:companygraph/meta-model#v0.53.0" check .` Expected: PASS.

- [ ] **Step 6: Validate the prose** — run the instance's `companygraph-validate` skill over `model/question-kinds/`, reading each kind against the schema's writing rules (two readers file the same question alike; each says what it excludes; no kind holds fewer than two questions). Then `sh conventions/conventions-check && sh conventions/conventions-format check`. Read the diff for digits: only the ranks carry one.

- [ ] **Step 7: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The questions are grouped by what they are about

The instance takes core 0.45.0, which adds the question-kind type and a required kind on every question, and defines four kinds in the order a visitor comes for them: Career, Ideas, Brand, and Model and chat. Every question names one; the voice question sits under Brand, because the voice profile is the brand's.

Verified: the instance checks failed on every unkinded question after the upgrade and pass with the kinds; the validate skill, conventions-check and conventions-format check pass.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin questions-have-kinds
gh pr create --title "The questions are grouped by what they are about" --body "…the commit body, ending with the Verified line and the Claude Code line…"
```

Stop for Rob's review, one kind per turn with a proposal: first each kind's name, summary and boundary, then any question he would move, starting with the voice question. Each change he asks for is a commit on the branch. After his merge, note the merge commit's SHA: Task 5 pins it, and Task 9 re-pins to it.

---

## Phase C — the Obsidian plugin (worktree `obsidian-plugin-a-question-has-a-kind`)

Starts only once obsidian-plugin #85 is merged and 0.14.0 is released, so this branch is cut from a `main` that already holds it.

### Task 5: The plugin adopts the type

**Files:**

- Modify: `package.json`, `package-lock.json` (the `companygraph-meta-model` pin)
- Modify: `scripts/fixtures.mjs` (`INSTANCE_COMMIT`)
- Modify: `e2e/question.e2e.ts` (the vault's added question gains a kind)
- Create: `e2e/question-kind.e2e.ts`
- Modify: `test/links.test.ts` and any other unit test the re-pin moves (see Step 3)
- Modify: `README.md` (a paragraph after the decision paragraph)
- Modify: `NOTICE`, `manifest.json`, `package.json` (the release, 0.15.0)

**Interfaces:**

- Consumes: meta-model v0.53.0 (Task 3); Task 4's merge SHA; kinds `Career`, `Ideas`, `Brand`, `Model and chat` in the fixture.
- Uses from the e2e harness: `start`, `available` from `./obsidian.ts`; `openNote`, `mentionsOf` from `./notes.ts`; `command`, `pick`, `waitForPrompt`, `promptItems`, `waitForModal`, `intoField`, `pressButton`, `noModal`, `onDisk` from `./ui.ts`, as `e2e/decision.e2e.ts` uses them.

- [ ] **Step 1: Worktree and re-pin**

```bash
cd /Users/rob/git/companygraph/obsidian-plugin && git pull --ff-only
grep '"version"' manifest.json   # expect 0.14.0; stop if it is not, #85 is not in yet
git worktree add -b a-question-has-a-kind ../obsidian-plugin-a-question-has-a-kind origin/main && cd ../obsidian-plugin-a-question-has-a-kind
npm ci
npm uninstall companygraph-meta-model && npm install "github:companygraph/meta-model#v0.53.0"
node -e 'const l=require("./package-lock.json").packages["node_modules/companygraph-meta-model"]; console.log(l.version, l.resolved)'
gh api repos/companygraph/meta-model/git/refs/tags/v0.53.0 --jq .object.sha
```

Expected: `0.53.0` and a `resolved` ending in the SHA the last command prints.

- [ ] **Step 2: Move the fixture** — in `scripts/fixtures.mjs`, set `INSTANCE_COMMIT` to Task 4's merge SHA. Run `node scripts/fixtures.mjs && ls test/fixtures/mental-model/model/question-kinds/career.md test/fixtures/mental-model/meta/core/question-kind-schema.md` Expected: both exist.

- [ ] **Step 3: The unit tests the re-pin moves** — Run: `npm test`. The example now carries two question kinds, a kind on each question and a fourth question. Expected failures and their fixes, each the example's new shape and nothing else:
  - `test/links.test.ts`, the block reading `links["example/model/questions/who-split-billing-out-of-the-monolith.md"]`: the question now also links to `example/model/question-kinds/product.md`, once. Add `assert.equal(who?.["example/model/question-kinds/product.md"], 1, "a question links to its kind");` beside the existing assertions on `who`.
  - Any test asserting the exact set of a question's references or outgoing names (`test/references.test.ts`, `test/refs.test.ts`, `test/model.test.ts` on `WHO` or `HOW`): the set gains the `kind` reference to `Product`. Add it to the expected value.
  - Any test counting the example's questions or folders: the count moves by the new question and the new folder; replace the literal with the new one read from the example, and say so in the commit.

  A failure that is not one of these is a real gap in the plugin's reading of the type: stop, report it, and fix it under superpowers:systematic-debugging with its own unit test. Run `npm test` again. Expected: PASS.

- [ ] **Step 4: The existing question suite follows the schema** — in `e2e/question.e2e.ts`, the `TEXT` the suite adds to the vault gains a kind, since a question without one now fails the checks the "checks stay clean" test reads:

```ts
const TEXT = [
  "---", "source: Local", "kind: Career", "---", "",
```

(the rest of `TEXT` unchanged).

- [ ] **Step 5: Write the failing e2e test** — `e2e/question-kind.e2e.ts`

```ts
// The question kind as a person writes it in the vault: New entity offers it and creates it in
// question-kinds/ with its required section, a question's kind completes to the vault's kinds,
// and the references pane lists a question under the kind it names.
import { after, afterEach, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { available, start } from "./obsidian.ts";
import type { Session } from "./obsidian.ts";
import { mentionsOf, openNote } from "./notes.ts";
import { command, intoField, noModal, onDisk, pick, pressButton, promptItems, waitForModal, waitForPrompt } from "./ui.ts";

const skip = available() ? false : "Obsidian is not installed here; set OBSIDIAN_BIN to run this suite";
const CAREER = "model/question-kinds/career.md";
const QUESTION = "model/questions/what-did-robert-study.md";
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

describe("the question kind", { skip }, () => {
  let session: Session;
  before(async () => {
    // A fixture from before the instance was seeded would let every test below pass on nothing.
    assert.ok(fs.existsSync(path.join("test", "fixtures", "mental-model", CAREER)), "the fixture instance holds its question kinds");
    session = await start();
  });
  afterEach(async (t) => { if (!(t as { passed?: boolean }).passed) await session.record((t as { name: string }).name); });
  after(async () => { await session?.stop(); });

  test("New entity offers question-kind and creates it in question-kinds/ with What it means", async () => {
    const { ui } = session;
    await openNote(ui, CAREER);
    await command(ui, "new-entity");
    await waitForPrompt(ui);
    assert.ok((await promptItems(ui)).some((item) => item.startsWith("question-kind —")));
    await pick(ui, "question-kind —");
    await waitForModal(ui, "New question-kind");
    await intoField(ui, "Name");
    await ui.type("E2E Probe Kind");
    await pressButton(ui, "Create");
    await noModal(ui);
    const at = "model/question-kinds/e2e-probe-kind.md";
    await ui.waitFor("the new kind to be in front", (p: string) => app.workspace.getActiveFile()?.path === p, [at]);
    const text = (await onDisk(ui, at))!;
    assert.match(text, /# E2E Probe Kind\n/);
    assert.match(text, /## What it means/);
    await session.restore([at]);
  });

  test("a question's kind completes to the vault's question kinds and nothing else", async () => {
    const { ui } = session;
    await openNote(ui, QUESTION);
    await sourceMode(ui, true);
    await ui.evaluate(() => {
      const editor = app.workspace.getMostRecentLeaf(app.workspace.rootSplit).view.editor;
      const line = (editor.getValue() as string).split("\n").findIndex((l) => l.startsWith("kind: "));
      editor.setSelection({ line, ch: "kind: ".length }, { line, ch: (editor.getLine(line) as string).length });
      editor.focus();
    });
    await ui.press("Backspace");
    const items = (await ui.waitFor("kinds to be offered", offered)) as string[];
    await ui.press("Escape");
    assert.deepEqual([...items].sort(), ["Brand", "Career", "Ideas", "Model and chat"]);
    await sourceMode(ui, false);
    await session.restore([QUESTION]);
  });

  test("the references pane lists a question under its kind", async () => {
    const { ui } = session;
    const underCareer = await mentionsOf(ui, CAREER);
    assert.ok(underCareer.some((m) => m.path === QUESTION && m.declared === "kind"));
  });
});
```

The modal title and the created path follow what `e2e/decision.e2e.ts` and `e2e/entities.e2e.ts` observe for an unowned type; if the modal reads otherwise (for example `New question kind`), read the title `e2e/kpi.e2e.ts` waits for and match its form, and if `session.restore` does not remove a created file, delete it the way `e2e/entities.e2e.ts` cleans up its probe.

- [ ] **Step 6: Run it** — `npm run e2e -- --test-name-pattern "the question kind|question"` Expected: PASS with no source change, because the plugin reads types from `TYPES` and candidates from the schema. Then run it once against the old fixture (`INSTANCE_COMMIT` set back to its previous value, `node scripts/fixtures.mjs`) and see `before` fail on "the fixture instance holds its question kinds"; set the SHA forward again and re-fetch. If a test fails for another reason, the failure is a real gap: stop, report it, and fix it under superpowers:systematic-debugging with its own unit test in `test/`.

- [ ] **Step 7: README paragraph** — after the decision paragraph in `README.md`:

```markdown
A question kind, a type of core since 0.45.0, is written like any other entity: New entity offers it and creates it in `question-kinds/` with its required section, and a question's `kind`, required from the same release, completes to the vault's question kinds; the references pane lists each question under the kind it names.
```

- [ ] **Step 8: Full suites, then the release commit** — `npm test && npm run typecheck && npm run build && npm run e2e`, all green but for the clipboard compliance test that fails on this machine on `main` too (say so in the commit if it does). Update `NOTICE` as the last re-pin commit did (`git log -1 -p -- NOTICE`). Move the version to 0.15.0 in `manifest.json` and `package.json`, exactly as the last release commit in `git log --oneline -3 -- manifest.json` did.

- [ ] **Step 9: Commit, push, PR, stop**

```bash
git add -A
git commit -F - <<'EOF'
The plugin writes a question kind

The package moves to meta-model v0.53.0, whose core adds the question-kind type and a required kind on every question, and the e2e fixture to the reference instance's commit that groups its questions, so the new suite finds real kinds: New entity offers the type and creates it in question-kinds/, a question's kind completes to the vault's kinds, and the references pane lists a question under its kind. No source change was needed; the type is read from its schema. The question suite's own added question now names a kind, since the checks require one, and the unit tests follow the example's new kinds and its fourth question. NOTICE follows the re-pin, and this is 0.15.0.

Verified: npm test, npm run typecheck and the build pass; the question-kind and question e2e suites pass against Obsidian, and the new suite fails before it starts on the pre-kind fixture; the pin test reads the lockfile at v0.53.0.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin a-question-has-a-kind && gh pr create --title "The plugin writes a question kind" --body "…the commit body, the Verified line, the Claude Code line…"
```

Stop for Rob's merge and his go on the release; the release follows the plugin's own steps (tag without `v`, GitHub release with `main.js`, `manifest.json`, `styles.css` built from the merge commit after `npm ci`). After the release, install it in both vaults, `~/git/robertblust/mental-model` and `~/git/companygraph/mental-model`, with `npx "github:companygraph/meta-model#v0.53.0" obsidian`, once each instance has upgraded.

---

## Phase D — the other two instances

### Task 6: companygraph/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): `meta/core/**`, `.companygraph/manifest.json`, `.github/workflows/companygraph.yml`, `.claude/skills/**`
- Create: `model/question-kinds/README.md` (as Task 4 Step 2), `fit.md`, `getting-started.md`, `terms.md`, `brand.md`, `this-chat.md`
- Modify: every file in `model/questions/` except `README.md`

- [ ] **Step 1: Worktree and upgrade** — as Task 4 Step 1, in `/Users/rob/git/companygraph/mental-model`, branch and worktree `questions-have-kinds` / `../mental-model-questions-have-kinds`. Expected: the checks fail on every unkinded question.

- [ ] **Step 2: The kinds**

`model/question-kinds/fit.md`:

```markdown
---
source: Local
rank: 10
---

# Fit

> Questions a company asks before it decides CompanyGraph is for it: what problem it solves, how it differs from what the company already has, and whether it fits the company's own shape.

## What it means

A question about the problem and the match: why a model rather than a wiki, what a company's model looks like, whether the vocabulary fits, where targets and actual numbers go, how content stays current and who keeps it true.

How to begin is Getting started. What it costs, who is behind it and how it proves itself is Terms.
```

`model/question-kinds/getting-started.md`:

```markdown
---
source: Local
rank: 20
---

# Getting started

> Questions from someone who has decided to try it: where to begin, how to write a first profile, what reads the model, and where the data stays.

## What it means

A question about the first steps and what connects once the model exists: starting an instance, writing a profile, letting an agent read it, and whether the data leaves the company's hands when it runs.

Whether it fits at all is Fit. Price, license and the people behind it are Terms.
```

`model/question-kinds/terms.md`:

```markdown
---
source: Local
rank: 30
---

# Terms

> Questions about what adopting CompanyGraph costs, who stands behind it, who else uses it, and how it shows that it works.

## What it means

A question about the arrangement rather than the product: the license and the service, contributing, other adopters, whether it is a business, and the evidence that it works.

What it does for a company is Fit, even where a term is the reason it fits.
```

`model/question-kinds/brand.md`:

```markdown
---
source: Local
rank: 40
---

# Brand

> Questions about how companygraph.io looks and what a visitor may reuse.

## What it means

A question about the colors, the faces, the mark and the voice, and whether a visitor may use them. What a sentence on the site claims is the kind of the claim, not this one.
```

`model/question-kinds/this-chat.md`:

```markdown
---
source: Local
rank: 50
---

# This chat

> Questions about the chat on companygraph.io: who answers, and how far to trust what it says.

## What it means

A question about the chat itself, its seat and its measure. A question the chat is asked about CompanyGraph is the kind of what it asks about.
```

- [ ] **Step 3: Every question names its kind** — the script of Task 4 Step 4 with this mapping:

```python
KIND = {
  "Fit": ["what-problem-does-companygraph-solve", "isn-t-this-just-a-wiki-or-notion-with-rules",
    "what-if-the-vocabulary-doesn-t-fit-our-company", "what-does-a-company-s-model-actually-look-like",
    "where-do-our-targets-and-actual-numbers-go",
    "how-does-content-stay-current-when-it-comes-from-a-wiki-or-another-system",
    "who-keeps-the-model-true-when-the-company-changes"],
  "Getting started": ["how-do-i-start", "how-do-i-create-my-own-profile", "can-our-ai-agents-use-it",
    "does-our-data-leave-our-hands"],
  "Terms": ["do-i-need-your-service-to-run-companygraph-and-what-does-it-cost", "how-do-i-contribute-to-companygraph",
    "is-anyone-besides-you-using-companygraph", "is-companygraph-a-business-or-a-side-project",
    "how-do-you-know-companygraph-is-working"],
  "Brand": ["what-do-the-colors-on-companygraph-io-mean", "can-i-use-companygraph-s-colors-and-fonts-for-my-own-site"],
  "This chat": ["can-i-trust-what-this-chat-says", "who-answers-this-chat"],
}
```

- [ ] **Step 4: Check, validate, commit, push, PR, stop** — exactly Task 4 Steps 5 to 7, with this commit and PR title:

```
The questions are grouped by what they are about

The instance takes core 0.45.0, which adds the question-kind type and a required kind on every question, and defines five kinds in the order a visitor comes for them: Fit, Getting started, Terms, Brand, and This chat. Every question names one.

Verified: the instance checks failed on every unkinded question after the upgrade and pass with the kinds; the validate skill, conventions-check and conventions-format check pass.
```

Stop for Rob's review, one kind per turn, and his merge.

### Task 7: guestgraph/mental-model upgrades and is seeded

**Files:**

- Modify (by the upgrade): as Task 6
- Create: `model/question-kinds/README.md`, `the-problem.md`, `matching.md`, `data-and-privacy.md`, `connecting.md`, `terms.md`, `brand-and-chat.md`
- Modify: every file in `model/questions/` except `README.md`

- [ ] **Step 1: Worktree and upgrade** — as Task 4 Step 1, in `/Users/rob/git/guestgraph/mental-model`. Expected: the checks fail on every unkinded question.

- [ ] **Step 2: The kinds**

`model/question-kinds/the-problem.md`:

```markdown
---
source: Local
rank: 10
---

# The problem

> Questions from a hotel that sees the problem before it knows the product: why one guest appears many times, and whether one view of a guest is possible.

## What it means

A question about duplicates and the missing single view, asked in the hotel's own words. How GuestGraph decides two records are one guest is Matching.
```

`model/question-kinds/matching.md`:

```markdown
---
source: Local
rank: 20
---

# Matching

> Questions about how records are judged to be one guest, and what happens when a judgment is wrong or unsure.

## What it means

A question about the match itself: why two records were joined, who decides an unsure one, what a mistaken merge does, and what becomes of an id stored before a merge.

What happens to the original records and to guests' personal data is Data and privacy.
```

`model/question-kinds/data-and-privacy.md`:

```markdown
---
source: Local
rank: 30
---

# Data and privacy

> Questions about what happens to a hotel's data: the original records, the separation between hotels and brands, and the law on guests' personal data.

## What it means

A question about custody and the law: whether source records are changed, whether guests are kept apart between properties, and what the data protection law asks.

How a match is made is Matching, even where a privacy rule limits it.
```

`model/question-kinds/connecting.md`:

```markdown
---
source: Local
rank: 40
---

# Connecting

> Questions about how GuestGraph reads from a hotel's systems.

## What it means

A question about which systems it reads and how a system not yet connected is added. What is done with the data once read is Data and privacy.
```

`model/question-kinds/terms.md`:

```markdown
---
source: Local
rank: 50
---

# Terms

> Questions about what running GuestGraph costs and what kind of project it is.

## What it means

A question about the arrangement: running it yourself, the price, the license, and whether it is a business. What it does for a hotel is the kind of that question.
```

`model/question-kinds/brand-and-chat.md`:

```markdown
---
source: Local
rank: 60
---

# Brand and chat

> Questions about how guestgraph.io looks, what a visitor may reuse, and the chat that answers on it.

## What it means

A question about the site itself rather than the product: its colors and faces and whether they may be reused, and who answers in the chat and how well. They share a kind because each holds too few questions to stand alone.
```

- [ ] **Step 3: Every question names its kind** — the script of Task 4 Step 4 with this mapping:

```python
KIND = {
  "The problem": ["why-do-we-have-the-same-guest-five-times", "can-we-see-everything-a-guest-has-booked-in-one-place"],
  "Matching": ["can-i-see-why-it-thinks-two-records-are-the-same-person",
    "what-happens-if-two-different-guests-get-merged-by-mistake",
    "what-happens-to-a-guest-id-we-stored-when-guests-are-merged",
    "who-decides-a-match-the-system-isn-t-sure-about-a-person-or-ai"],
  "Data and privacy": ["what-about-gdpr-and-our-guests-privacy", "does-it-change-or-delete-our-original-records",
    "are-guests-kept-apart-between-our-hotels-or-brands"],
  "Connecting": ["how-do-i-connect-my-own-system", "which-of-our-systems-can-it-read-from"],
  "Terms": ["can-we-run-guestgraph-ourselves-and-what-does-it-cost", "is-guestgraph-a-business-or-an-open-source-project"],
  "Brand and chat": ["what-do-the-colors-on-guestgraph-io-mean", "can-i-use-guestgraph-s-colors-and-fonts-for-my-own-site",
    "how-well-does-this-chat-answer", "who-answers-this-chat"],
}
```

- [ ] **Step 4: Check, validate, commit, push, PR, stop** — exactly Task 4 Steps 5 to 7, with the commit body naming the six kinds in rank order: The problem, Matching, Data and privacy, Connecting, Terms, and Brand and chat. Stop for Rob's review, one kind per turn, and his merge.

---

## Phase E — design: the chips pick across kinds

### Task 8: One question from each of three kinds

**Files:**

- Modify: `assets/chat.js` (`questions()`, a new `spread()`, `offerQuestions()`, the `window.rbChat` export)
- Modify: `test/chat.test.mjs`
- Modify: `package.json` (version), and the release notes as the last release did

**Interfaces:**

- Produces: `spread(items, n, random)`, where `items` is `[{ title: string, kind: string | null }]`; returns up to `n` distinct titles. Exported on `window.rbChat` beside `pick` and `unasked`.

- [ ] **Step 1: Worktree** — `cd /Users/rob/git/robertblust/design && git pull --ff-only && git worktree add -b the-chips-span-the-kinds ../design-the-chips-span-the-kinds origin/main && cd ../design-the-chips-span-the-kinds && npm ci`

- [ ] **Step 2: Write the failing tests** — in `test/chat.test.mjs`, the destructuring at the top gains `spread`:

```js
const { md, readEvents, strings, link, refocus, nameLinks, when, refusalText, citeLine, iconOf, pick, unasked, spread } = globalThis.rbChat;
```

and after the `pick` tests:

```js
// spread() is what makes the three chips show the range of what the model answers: one
// question from each of three kinds, picked at random, where the model groups its questions.
const Q = (title, kind) => ({ title, kind });
const KINDED = [Q("a1", "A"), Q("a2", "A"), Q("a3", "A"), Q("b1", "B"), Q("b2", "B"), Q("c1", "C"), Q("d1", "D")];

test("spread names three different kinds wherever three exist, however the random falls", () => {
  const kindOf = Object.fromEntries(KINDED.map((q) => [q.title, q.kind]));
  for (let i = 0; i < 200; i++) {
    const got = spread(KINDED, 3);
    assert.equal(got.length, 3);
    assert.equal(new Set(got.map((t) => kindOf[t])).size, 3, `three kinds in ${got}`);
  }
});

test("spread fills from the rest when fewer kinds than chips exist, never repeating a title", () => {
  const two = [Q("a1", "A"), Q("a2", "A"), Q("a3", "A"), Q("b1", "B")];
  for (let i = 0; i < 100; i++) {
    const got = spread(two, 3);
    assert.equal(got.length, 3);
    assert.equal(new Set(got).size, 3);
    assert.ok(got.includes("b1"), "the smaller kind is always represented");
  }
});

test("spread with no kinds is pick under the same random, so a model without kinds is offered as before", () => {
  const plain = ["a", "b", "c", "d", "e"].map((t) => Q(t, null));
  const seq = () => { let s = 0; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); };
  assert.deepEqual(spread(plain, 3, seq()), pick(["a", "b", "c", "d", "e"], 3, seq()));
});

test("spread of an empty or missing list is empty", () => {
  assert.deepEqual(spread([], 3), []);
  assert.deepEqual(spread(undefined, 3), []);
});

test("the widget keeps each question's kind from the model file and offers through spread", () => {
  const fn = src.slice(src.indexOf("function questions(cb)"), src.indexOf("function offerQuestions()"));
  assert.match(fn, /e\.fields && typeof e\.fields\.kind === "string"/, "a question's kind is not read from fields.kind");
  const offer = src.slice(src.indexOf("function offerQuestions()"), src.indexOf("function hideQuestions()"));
  assert.match(offer, /spread\(/, "the chips are not picked across kinds");
});
```

Run: `npm test` Expected: FAIL, `spread` is not a function.

- [ ] **Step 3: Implement** — in `assets/chat.js`, after `function unasked(…){…}`:

```js
  // The chips as a span of what the model answers: where its questions name a kind, three kinds
  // are picked at random and one question from each, so a visitor sees three sorts of question
  // rather than three that may all be about one thing. Fewer kinds than chips fill from what is
  // left, and a model whose questions name no kind is offered exactly as pick() offers it, so a
  // site that takes this before its model groups anything loses nothing.
  function spread(items, n, random){
    var rnd = typeof random === "function" ? random : Math.random;
    var list = (items || []).filter(function(q){ return q && typeof q.title === "string"; });
    var kinded = list.filter(function(q){ return typeof q.kind === "string" && q.kind; });
    if (!kinded.length) return pick(list.map(function(q){ return q.title; }), n, rnd);
    var byKind = {}, kinds = [];
    kinded.forEach(function(q){ if (!byKind[q.kind]) { byKind[q.kind] = []; kinds.push(q.kind); } byKind[q.kind].push(q.title); });
    var chosen = pick(kinds, n, rnd).map(function(k){ return pick(byKind[k], 1, rnd)[0]; });
    var taken = {};
    chosen.forEach(function(t){ taken[t] = true; });
    var rest = list.map(function(q){ return q.title; }).filter(function(t){ return !taken[t]; });
    return chosen.concat(pick(rest, Math.max(0, (Number(n) || 0) - chosen.length), rnd));
  }
```

In `questions(cb)`, the `.map(function(e){ return e.name; })` and the length filter after it become:

```js
              .map(function(e){ return { title: e.name, kind: e.fields && typeof e.fields.kind === "string" ? e.fields.kind : null }; })
              .filter(function(q){ return q.title.length <= LIMIT; });
```

In `offerQuestions()`, `var picked = pick(unasked(list, messages), 3);` becomes:

```js
      var open = unasked(list.map(function(q){ return q.title; }), messages);
      var picked = spread(list.filter(function(q){ return open.indexOf(q.title) !== -1; }), 3);
```

and `window.rbChat` gains `spread: spread`. Search the file for any other reader of `qList` (`grep -n qList assets/chat.js`): each now receives `{ title, kind }` objects and takes `.title` where it used the string.

- [ ] **Step 4: Run** — `npm test` Expected: PASS, including the existing source-reading tests on `questions()`; if one of those matched the old `.map` text, update its pattern to the new line and say so in the commit.

- [ ] **Step 5: See it in a browser** — serve a site that carries `data-questions` against this build (the design repo's own demo page, or blust.ch's `model.json` copied beside it after Task 4 is merged and re-built), open the chat three times, and confirm the three chips each time name three different kinds, and that the network panel shows no request to the chat host before send. Start any server on a free port and stop only the PID you started.

- [ ] **Step 6: Version, commit, push, PR, stop** — read `package.json`'s version and `gh release list -R robertblust/design -L 1`: if the version is already ahead of the latest release, this change rides it; otherwise move to the next minor, as the last release commit did.

```bash
git add -A
git commit -F - <<'EOF'
The chips offer one question from each of three kinds

The widget now keeps each question's kind from the site's model file and picks its three chips across kinds: three kinds at random and one unasked question from each, filling from what is left where fewer kinds exist. A model whose questions name no kind is offered exactly as before, so a site may take this before its model groups anything.

Verified: npm test passes, and the spread tests failed before the function existed; in a browser the chips named three kinds on each of three opens, with no request to the chat host before send.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
EOF
git push -u origin the-chips-span-the-kinds && gh pr create --title "The chips offer one question from each of three kinds" --body "…the commit body, the Verified line, the Claude Code line…"
```

Stop for Rob's merge and his go on the tag and release.

---

## Phase F — the consumers re-pin

### Task 9: mcp-server, the three hosts and the three sites

Each is its own worktree, commit and PR, each stopped for Rob's merge; every package re-pin is proved from `package-lock.json` as in Task 5 Step 1. The hosts start only once #98, #64 and #25 are merged.

- [ ] **Step 1: mcp-server** — in `/Users/rob/git/companygraph/mcp-server`, worktree `../mcp-server-a-question-has-a-kind`, re-pin `companygraph-meta-model` to `v0.53.0`; `npm test`, following any test the example's fourth question or its kinds move, as in Task 5 Step 3. Proof the type is served: a test that parses the package's example and asserts `list_types` includes `question-kind` and that `get_entity` on the question "Who split billing out of the monolith?" carries an edge `kind` to `Product`. A patch release on Rob's go.
- [ ] **Step 2: the three hosts** — `robertblust/mcp-blust-ch`, `companygraph/mcp-companygraph-io`, `guestgraph/mcp-guestgraph-io`: re-pin `companygraph-mcp-server` to the Step 1 release and `source.json`'s `commit` to the instance's merge commit from Task 4, 6 or 7; `npm test`. The chat needs no re-pin: it reaches the kinds through `list_entities` and `list_references`.
- [ ] **Step 3: the three sites** — `robertblust/robertblust.github.io`, `companygraph/companygraph.github.io`, `guestgraph/guestgraph.github.io`: re-pin design to Task 8's release, `companygraph-meta-model` to `v0.53.0`, and `source.json` to the instance's merge commit; `npm run model && npm run build && npm run sitemap`; `model:check` and `build:check` pass. Confirm each site's model file carries the kinds: `node -e 'const j=require("./model.json"); console.log(j.entities.filter(e=>e.type==="question"&&!e.fields.kind).length, j.entities.filter(e=>e.type==="question-kind").map(e=>e.name))'` prints `0` and the instance's kinds (the file is `company.json` on companygraph.io). On companygraph.io, confirm `/model/` gains its generated term for `question-kind`, reading an existing term id such as the one for `decision-kind` to match its form.
- [ ] **Step 4: Live verification** — after the deploys, and reported with the host and the model commit each names:
  - the instance checks are green on all three instances' `main`;
  - from each MCP host, `list_entities` with type `question-kind` answers the instance's kinds, and `list_references` on one kind answers its questions;
  - on each chat, "Can these questions be grouped?" is answered with the model's kinds, named as the model's; asked in German too on chat.blust.ch;
  - on each site, a browser check of three opens shows three chips naming three different kinds, with no request to the chat host before send.
