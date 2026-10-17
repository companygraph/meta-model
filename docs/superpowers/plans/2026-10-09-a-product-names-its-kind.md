# A product names its kind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core ships `product-kind`, every product names one in a required `kind`, `audience` is gone, and an instance is held to it: a product without a kind fails, a kind no product names fails, and the example carries three kinds.

**Architecture:** A kind type is a row in `TYPES` in `lib/checks.mjs` and a schema in `core/`, as `question-kind` already is; the required reference, the rank and the sections are read from the schema by checks that name no type. The one check that knows a kind gathers products is the existing `gathers` key with `least: 1`, whose message gains a clause for a kind nobody names. Nothing else in the code reads `audience` or the type.

**Tech Stack:** Node ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-10-09-a-product-names-its-kind-design.md`

This plan covers meta-model only. The four instances write their kinds in their own re-pins after the release, and the glossary row is the conventions repository's.

## Global Constraints

- The type is `product-kind`, its schema `core/product-kind-schema.md`, its folder `model/product-kinds/`. Nothing owns it and it owns nothing.
- `product-kind` fields, exactly, in this order: `id` (Yes, string), `source` (Yes, `ref → source`), `source-id` (No, string), `rank` (Yes, number). Sections, exactly: `# [Label]` (Yes), `> [Summary]` (Yes), `## What it means` (Yes), `## References` (No, Table, columns `What` Yes string, `URL` Yes string).
- `product` loses the `audience` row and gains `kind` (Yes, `ref → product-kind`) as the last frontmatter row, after `domain`. Nothing else in the product schema's tables changes.
- `TYPES` gains `{ type: "product-kind", folder: "product-kinds", gathers: { by: "product", field: "kind", least: 1 } }` directly after the `product` row. No other `TYPES` row changes, and `PACKS` is untouched.
- The checks name no type in their code: what they hold is read from the type's row and from the schema.
- The schema id is a fresh UUID version 7 from `node bin/companygraph.mjs id`, lowercase. Every new example page gets one the same way; no id is copied.
- Test fixtures and example content name no real company, product or person. The example's kinds are `Application`, `Page` and `API`, in that order of rank, 10, 20, 30.
- No version bump in this plan. The release, its number and its notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line. After each commit, `git log -1 --format='[%s]'` shows the subject alone.
- Before any `node`, `npm` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.
- Work in the worktree `../meta-model-a-product-names-its-kind` on the branch `a-product-names-its-kind`, which carries the spec.
- Every Markdown file written or edited passes `sh conventions/conventions-format` and `sh conventions/conventions-check` before it is committed.

## Review Focus

- A product that still carries `audience` must fail under R15 as an undeclared field, with the key named, so an instance that used it is told what to remove. Pinned in Task 1.
- A product whose `kind` names a question kind or a decision kind of the same label must fail, because a reference resolves by its declared type and not by the word. Pinned in Task 1.
- A kind no product names must fail with a message that says it is unused, and not the question kind's "folded into the nearest", which is wrong for a `least` of one. Pinned in Task 1.
- An instance with no products at all must pass with any number of kinds, since `gathers` skips a type the instance holds fewer than `least` of; and an instance with products and no kinds folder must fail on every product's missing `kind` and nowhere else. Pinned in Task 1.
- The example must pass `npm run verify` with three kinds each named by exactly one product, proving `least: 1` on real content. Pinned in Task 2.

---

### Task 1: The schema, the field, the check and the test

**Files:**

- Create: `core/product-kind-schema.md`
- Modify: `core/product-schema.md` (frontmatter table, writing rules)
- Modify: `lib/checks.mjs` (`TYPES`, after the `product` row; the `gathers` check's message)
- Create: `verify/product-kind.test.mjs`
- Modify: `package.json` (`test:instance-checks` gains `verify/product-kind.test.mjs` after `verify/question-kind.test.mjs`)

**Interfaces:**

- Produces: the type `product-kind` in `TYPES`, read by every consumer of `vocabularyOf`; the field `kind` on `product`, which Task 2's example pages and every instance write.

- [ ] **Step 1: Write the failing test**

```js
// verify/product-kind.test.mjs
// The product kind and the product's kind, held by the instance checks through their real
// schemas: both files are read from disk so the test fails if a schema and the checks part. The
// schemas they reference are bare, as question-kind.test.mjs has them, and a question kind named
// like a product kind is there to prove the reference resolves by its declared type.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const real = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const kind = (name, rank, { meaning = true } = {}) => ["---", "source: Local", `rank: ${rank}`, "---", "", `# ${name}`, "", "> What sort of thing these products are.", "",
  ...(meaning ? ["## What it means", "", "Opened by a customer. A thing a developer connects is API.", ""] : [])].join("\n");
const product = (name, fm) => ["---", ...fm, "---", "", `# ${name}`, "", "> What it is, and who opens it.", ""].join("\n");

const tree = ({ kinds = [["Application", 10], ["API", 20]], fm = ["source: Local", "domain: Pricing", "kind: Application"], products = true, missingMeaning = false } = {}) => new Map([
  ["meta/core/product-kind-schema.md", real("product-kind")],
  ["meta/core/product-schema.md", real("product")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/domain-schema.md", bare("domain", "model/domains/*.md")],
  ["meta/core/question-kind-schema.md", bare("question-kind", "model/question-kinds/*.md")],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/domains/pricing.md", "# Pricing\n\n> What things cost.\n"],
  ["model/question-kinds/company.md", "# Company\n\n> Questions about the company.\n"],
  ...kinds.map(([n, r], i) => [`model/product-kinds/${n.toLowerCase()}.md`, kind(n, r, { meaning: !(missingMeaning && i === 0) })]),
  ...(products ? [
    ["model/products/billing-console.md", product("Billing Console", fm)],
    ["model/products/usage-api.md", product("Usage API", ["source: Local", "domain: Pricing", "kind: API"])],
  ] : []),
]);
const failures = (opts) => checkInstance(tree(opts), { core: "meta/core", model: "model" }).failures;
const about = (where, opts, ...words) => failures(opts).filter((f) => f.includes(where) && words.every((w) => f.includes(w)));

test("two products each naming a kind, and kinds with distinct ranks and every section, pass", () => {
  assert.deepEqual(failures(undefined), []);
});

test("a product with no kind fails", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing"] }, "no `kind`").length, 1);
});

test("a product still carrying audience fails as a field the schema does not declare", () => {
  const f = about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Application", "audience: Finance"] }, "audience");
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /R15/);
});

test("a kind naming no product kind fails", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Pricing"] }, "\"Pricing\"").length, 1);
});

test("a kind naming a question kind of that name fails, because the reference resolves by its declared type", () => {
  assert.equal(about("products/billing-console.md", { fm: ["source: Local", "domain: Pricing", "kind: Company"] }, "\"Company\"").length, 1);
});

test("two product kinds sharing a rank fail naming both", () => {
  assert.equal(about("product-kind", { kinds: [["Application", 10], ["API", 10]] }, "share rank 10", "\"Application\"", "\"API\"").length, 1);
});

test("a rank that is not a number fails", () => {
  assert.equal(about("product-kinds/application.md", { kinds: [["Application", "first"], ["API", 20]] }, "rank").length, 1);
});

test("a product kind with no What it means fails, so the folder is read", () => {
  assert.equal(about("product-kinds/application.md", { missingMeaning: true }, "no `## What it means`").length, 1);
});

test("a kind no product names fails, and the message says it is unused rather than folded", () => {
  const f = about("product-kinds/page.md", { kinds: [["Application", 10], ["API", 20], ["Page", 30]] }, "0 product pages name it in `kind`");
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /vocabulary nobody uses \(R16\)/);
  assert.doesNotMatch(f[0], /folded/);
});

test("an instance with kinds and no products passes, since there is nothing to gather yet", () => {
  assert.deepEqual(failures({ products: false }), []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test verify/product-kind.test.mjs`

Expected: FAIL, every test, with ENOENT reading `core/product-kind-schema.md`.

- [ ] **Step 3: Generate the schema's id**

Run: `node bin/companygraph.mjs id`

Use it in Step 4.

- [ ] **Step 4: Write the schema**

`core/product-kind-schema.md`:

```markdown
---
id: <the id>
---

# Product Kind Schema

> Required structure for product kind files.

## File Location

`model/product-kinds/*.md`

A kind owns nothing and nothing owns it: every product claims one of the same few, and what each kind covers lives here rather than being restated on every product. It sits at the container root beside `products/`, as `question-kinds/` sits beside `questions/`.

The set is the instance's own, as a question kind's is. What a company ships, chocolate, the channels it sells through, what its IT provides to its staff, is a fact about that company, and a kind arriving later is one file here, not a change to this metamodel and a release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered, the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position wherever products are drawn grouped. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every product references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what sort of thing the products of this kind are |
| `## What it means` | Yes | Who opens a product of this kind, which products belong to it, and which do not |
| `## References` | No | Table. What a reader can open to learn more about the kind; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a classification, a standard |
| `URL` | Yes | string | Where it is |

## Purpose

A kind answers "what sort of thing does this company ship?", the question a reader cannot otherwise ask of a folder that holds a box of pralines, an online shop and the systems behind a store side by side. Its value is that the answer is a reference rather than a word: two products of one kind are the same sort of thing, a surface can draw the products of one kind together, and the chat can say what the company ships from the model rather than from its own reading. A kind holds at least one product; a kind no product names is vocabulary nobody uses, and leaves.

## Writing rules

- `## What it means` says who opens a product of this kind, a customer, a franchisee, the
  company's own staff, since that is the one sentence that tells a channel from the systems
  behind it, and it has nowhere else to live.
- `## What it means` says what the kind excludes as well as what it covers. The boundary
  between a channel and the thing sold through it, or between what IT provides and what the
  business sells, is where every disagreement will be.
- `## What it means` is about the sort of thing, never about how well a product of it does,
  how many there are or what they earn. Those belong to the product, or to nothing in the
  model.
- The H1 names what the product *is*, `Channel`, `IT product`, not the type it belongs to,
  `Product`, and not a market or a business unit.
- The page writes names and prose in the model's language (R14), as every page does.
```

- [ ] **Step 5: Edit the product schema**

In `core/product-schema.md`, replace the frontmatter row

```markdown
| `audience` | No | string | Free-text grouping, e.g. `Staff`. Whether an audience becomes an entity of its own is deliberately open. |
```

with

```markdown
| `kind` | Yes | ref → product-kind | What sort of thing this product is, the H1 of a file in `product-kinds/` |
```

and add, as the last line of `## Writing rules`:

```markdown
- `kind` is the one a reader looking for this product would look under first; a product that
  seems to need two is two products, or sits where most readers would look for it.
```

- [ ] **Step 6: Register the type and adjust the gathers message**

In `lib/checks.mjs`, directly after the line

```js
  { type: "product", folder: "products" },
```

insert

```js
  // A product's kind is the instance's own set, as a question kind is, and every product claims
  // one; a kind no product names is vocabulary nobody uses, so it gathers at least one.
  { type: "product-kind", folder: "product-kinds", gathers: { by: "product", field: "kind", least: 1 } },
```

In the check named `an entity that gathers others gathers enough of them`, replace the `fail(...)` call

```js
            fail(`${path}: ${n} ${by} ${n === 1 ? "page names" : "pages name"} it in \`${field}\`; a ${t.type} gathers at least ${least}, and one with fewer is folded into the nearest (R16)`);
```

with

```js
            fail(`${path}: ${n} ${by} ${n === 1 ? "page names" : "pages name"} it in \`${field}\`; a ${t.type} gathers at least ${least}, and ${least === 1 ? "one no page names is vocabulary nobody uses" : "one with fewer is folded into the nearest"} (R16)`);
```

and extend the comment above the check so its last sentence reads: "an instance that holds fewer of them than that has nothing to gather yet, and passes; a type that gathers one is told a kind nobody names is unused, since nothing is folded into a neighbor it has."

- [ ] **Step 7: Register the test**

In `package.json`, in `test:instance-checks`, insert `verify/product-kind.test.mjs` directly after `verify/question-kind.test.mjs`.

- [ ] **Step 8: Run the test to verify it passes, and the neighbors still do**

Run: `node --test verify/product-kind.test.mjs && npm run test:instance-checks && npm run test:rules && npm run test:judge`

Expected: PASS. `test:rules` proves the new test file is run by a script and that the check still cites a rule; `test:judge` proves every writing rule in the new schema opens with its subject. If `test:judge` fails on a rule, the rule's first words are not a declared field, column, section, `The H1`, `The summary` or `The page`; reword the opening, not the schema's tables.

- [ ] **Step 9: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Then:

```bash
git add core/product-kind-schema.md core/product-schema.md lib/checks.mjs verify/product-kind.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
A product kind, and a product names one

Core gains product-kind, flat beside products as a question kind is beside questions: a rank, a label, a summary and What it means, which says who opens a product of this kind. The product's audience goes and a required kind comes. The kind gathers at least one product, and the gathers check now says that a kind nobody names is unused instead of folding it into a neighbor it has none of.

Verified: node --test verify/product-kind.test.mjs, npm run test:instance-checks, test:rules and test:judge pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 2: The example takes the kind

**Files:**

- Create: `example/model/product-kinds/README.md`
- Create: `example/model/product-kinds/application.md`
- Create: `example/model/product-kinds/page.md`
- Create: `example/model/product-kinds/api.md`
- Modify: `example/model/products/billing-console.md`, `example/model/products/invoice-page.md`, `example/model/products/usage-api.md` (frontmatter)
- Modify: `example/model/README.md` (the type list in the third paragraph; the tree)

**Interfaces:**

- Consumes: the `product-kind` type and the `kind` field from Task 1.

- [ ] **Step 1: Run the example's checks to see them fail**

Run: `npm run verify`

Expected: FAIL on each of the three products with `no \`kind\`` and on each with `audience` under R15.

- [ ] **Step 2: Generate three ids**

Run: `for i in 1 2 3; do node bin/companygraph.mjs id; done`

One per kind page, in the order below.

- [ ] **Step 3: Write the folder's README and the three kinds**

`example/model/product-kinds/README.md`:

```markdown
# Product kinds

One file per product kind, written against `meta/core/product-kind-schema.md`.
```

`example/model/product-kinds/application.md`:

```markdown
---
id: <first id>
source: Local
rank: 10
---

# Application

> Software a customer's own people sign in to and work in.

## What it means

A product of this kind is opened by the staff of a company billing through Beacon, signed in, as part of their work: the finance team in the Billing Console. It is this kind when the person opening it is on the customer's side and comes back to it.

A page somebody reaches once from a link, to read or pay, is Page. An interface another system calls is API.
```

`example/model/product-kinds/page.md`:

```markdown
---
id: <second id>
source: Local
rank: 20
---

# Page

> A page somebody reaches from a link, to read something or pay it, without an account.

## What it means

A product of this kind is opened by whoever an invoice or a notice is addressed to, following a link, with nothing to sign in to: the payer on the Invoice Page. It is this kind when the person opening it may never come back and needs no account.

Software a customer's own staff sign in to is Application. An interface a developer connects is API.
```

`example/model/product-kinds/api.md`:

```markdown
---
id: <third id>
source: Local
rank: 30
---

# API

> An interface the systems of a customer send to or read from, set up by a developer.

## What it means

A product of this kind is opened by a developer on the customer's side, once, to connect a system of theirs; after that the systems talk and no person looks at it. The Usage API is this kind.

What a person works in is Application, and what a person reads from a link is Page.
```

- [ ] **Step 4: Edit the three products**

In each product's frontmatter, replace the `audience:` line with a `kind:` line, keeping the field order `id`, `source`, `domain`, `kind`:

- `billing-console.md`: `audience: Finance` → `kind: Application`
- `invoice-page.md`: `audience: Payer` → `kind: Page`
- `usage-api.md`: `audience: Developer` → `kind: API`

- [ ] **Step 5: Update the example's README**

In `example/model/README.md`, in the third paragraph's list of core types, insert `` `product-kind`, `` directly after `` `product`, ``. In the tree, directly after the line beginning `products/`, add:

```
product-kinds/                   application.md, page.md, api.md
```

aligned with the lines around it (the file names begin in the same column as the others).

- [ ] **Step 6: Run the example's checks and the parser over it**

Run: `npm run verify && npm run test:instance && npm run test:consumer`

Expected: PASS, with no `noted:` line about a product kind. If `npm run verify` reports that `example/model/product-kinds/` is a folder no type implies, the `TYPES` row from Task 1 is missing or misspelled; fix it there, not by removing the folder.

- [ ] **Step 7: Format, check and commit**

Run: `sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Then:

```bash
git add example/model/product-kinds example/model/products example/model/README.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The example ships three kinds of product

Beacon's three products split by who opens them: Application for the finance team in the Billing Console, Page for the payer who follows a link to the Invoice Page, and API for the developer who connects the Usage API. Each kind says who opens it and which of the other two a near case is. The products name their kind and drop audience.

Verified: npm run verify, test:instance and test:consumer pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

### Task 3: The README and the skill say the type exists, and everything runs

**Files:**

- Modify: `README.md` (the `core/` tree's type list; the type list in `## Status`)
- Modify: `agents/claude/skills/companygraph-company/SKILL.md` (three sentences)

**Interfaces:**

- Consumes: everything above; produces nothing a later task reads.

- [ ] **Step 1: Edit the README's two type lists**

In `README.md`, in the `core/` tree near the top, the line

```
                   process, phase, track, product, feature, domain, concept,
```

becomes

```
                   process, phase, track, product, product-kind, feature,
                   domain, concept,
```

and the line that follows, beginning `question, question-kind,`, is joined so the block reads, in order and wrapped at the same width as before:

```
                   process, phase, track, product, product-kind, feature,
                   domain, concept, question, question-kind, decision,
                   decision-kind, decision-status, rule, risk, control,
                   data-processor, processing-activity, stored-item
```

In `## Status`, in the sentence beginning "Core holds one schema per type, and `core/` is the list:", insert `product-kind, ` directly after `product, `.

- [ ] **Step 2: Edit the company skill**

In `agents/claude/skills/companygraph-company/SKILL.md`:

- In the `description:` line of the frontmatter, `domains, products, features,` becomes `domains, product kinds, products, features,`.
- In the paragraph beginning "A company arrives as a web address", `its products and the domains they sit in` becomes `its products, the kinds they are and the domains they sit in`.
- The sentence `Domains before products and products before features, because each names the one before it.` becomes `Domains and product kinds before products, and products before features, because each names what comes before it; a kind says who opens a product of it, and a company's site usually has two or three.`

- [ ] **Step 3: Search for what else names the field**

Run: `grep -rn 'audience' core lib bin agents example verify --include='*.md' --include='*.mjs' --include='*.json' | grep -v 'conventions/' | grep -vi 'the audience\|an audience\|its audience\|audience is\|audience, the\|audience of'`

Expected: no line names the frontmatter field `audience` on a product. A line that does is a leftover; remove the field there and say so in the commit.

- [ ] **Step 4: Run everything and commit**

Run: `npm run verify && npm run test:instance-checks && npm run test:instance && npm run test:rules && npm run test:judge && npm run test:cli && npm run test:consumer && npm run typecheck && npm run build:check && sh conventions/conventions-format && sh conventions/conventions-check && git log -1 --format='[%s]'`

Expected: every suite PASS, both conventions scripts green.

Then:

```bash
git add README.md agents/claude/skills/companygraph-company/SKILL.md
git commit --author "Implementer <implementer@companygraph.io>" -F - <<'EOF'
The README and the company skill know the product kind

The two type lists name product-kind after product, and the skill that builds an instance from a company's site writes the kinds before the products, since each product names one.

Verified: npm run verify, test:instance-checks, test:instance, test:rules, test:judge, test:cli, test:consumer, typecheck and build:check pass; conventions-format and conventions-check pass.

Process: Delivery
Phase: Implement
Track: Code
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
```

- [ ] **Step 5: Hand over**

The branch is ready for review. The release and the instances' re-pins are the owner's, as the spec's order says: a minor release whose notes say every product now names a kind, then one re-pin per instance writing its kind pages and one `kind:` line per product.
