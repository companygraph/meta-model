# Products, features and the ontology implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `product`, `feature`, `domain` and `concept` to core, so that a company that builds something can name what it ships and the words it means something exact by, with the relations between those words held as rows a check resolves.

**Architecture:** Four new schemas in `core/`, four flat rows in the checks' `TYPES` list, and worked content in `example/`. All four types are files and none owns another: a feature names its products, a concept names its domain, and every inverse is derived. One existing check changes — R8's enum check reads frontmatter alone today and learns to read a column table — and one new check is added, that `As` is required where two relation rows name the same concept. The parser does not change.

**Tech Stack:** Node 22+, no dependencies. `node:test` for unit tests. Markdown schemas in `core/`, a worked instance in `example/`, a hand-written verification script in `verify/check.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-21-product-feature-and-ontology-design.md`

Every schema file and every example file below was written into this branch's worktree, run against `node --run verify`, and reverted before this plan was written. Where a step says the suite passes, it passed. The two code changes, Task 1 and Task 5, were **not** run: their insertion points were read and the surrounding code quoted, and their code is written from that reading. Treat those two as the tasks to be skeptical of.

## Global constraints

- **Scope is this repository only.** The reference instance, the Obsidian plugin, the MCP server and the sites take the release afterwards; Task 6 names them and does not touch them.
- **Branch:** `product-feature-and-ontology`, already created, already carrying the spec's three commits.
- **Worktree:** `~/git/companygraph/meta-model-product-feature-and-ontology`. The clone at `~/git/companygraph/meta-model` stays on `main` and must not be touched.
- **`export PATH=/opt/homebrew/bin:$PATH`** before any `node` or `gh` command; both live there and are not on the default path. A push needs the credential helper named: `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin product-feature-and-ontology`.
- **Never commit on the default branch.** Never chain a branch delete after a merge.
- **Run all four checks before every commit**, each exit code read on its own and never through a pipe: `sh conventions/conventions-format`, `sh conventions/conventions-check`, `sh conventions/conventions-sync check` and `node --run verify`.
- **Prose register** for every Markdown word, per `conventions/WRITING.md`: paragraphs by default, one line per paragraph, cause before mechanism, en-US spelling, curly quotes, no serial comma, spaced em-dash, sentence case headings, no adjective that sells, and no count or version of something that still moves.
- **Commit messages** follow the git register: a subject that is a sentence under seventy characters with no prefix and no trailing period, a body of one to three short paragraphs with no headers and no bullets, then one line beginning `Verified:` naming what ran and passed, then the trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **No check names any of the four types.** `lib/checks.mjs` reads what the schemas declare. The only lines naming them are their four rows in `TYPES`; Task 5's check reads a section by name from the concept schema's own declaration, not from a literal type name.
- **Do not edit anything under `docs/superpowers/` other than this plan.** The three spec commits on this branch are the record of the decisions.

---

### Task 1: A column enum is held

R8 says a field typed `enum` lists its values and a written value is one of them. R9 says a column table is read "on the same terms as the frontmatter table except for the list types". The check implements the first and not the second, and says so in its own comment at `lib/checks.mjs:1560`: "Only frontmatter fields are read here; a column declared `enum` in a body table is not held, and none exists in core." Task 4 writes the first two. This task makes the check ready for them, and it can break nothing written before it, because there are no column enums anywhere in core.

This was proven rather than assumed. With a prototype concept schema declaring `Cardinality` as an `enum` and an example file writing the illegal value `loads` into it, `node --run verify` exited **0**. With the same file's `Concept` cell changed to a name nothing defines, it exited **1** with two messages. The checker fires on a bad reference and not on a bad enum value.

**Files:**

- Modify: `lib/checks.mjs:734-738` — the per-type column reader, which drops the Description column
- Modify: `lib/checks.mjs:798-806` — the cell loop
- Modify: `lib/checks.mjs:1560-1561` — the comment that says columns are not held
- Test: `verify/instance-checks.test.mjs`

**Interfaces:**

- Consumes: `enumTokensOf(description)` from `lib/checks.mjs`, already exported and already used by the frontmatter half of this rule.
- Produces: nothing new is exported. A column typed `enum` whose cell is outside the schema's listed tokens fails with a message naming the file, the column, the section, the value and the permitted list.

- [ ] **Step 1: Read the current totals**

Run: `export PATH=/opt/homebrew/bin:$PATH && cd ~/git/companygraph/meta-model-product-feature-and-ontology && node --run verify && node --run test:instance-checks`

Write the two totals down. Every later step states its change as a delta, because another branch may land first.

- [ ] **Step 2: Write the failing test**

Add to `verify/instance-checks.test.mjs`, beside the other cases. It uses the file's own `schema` helper and its `checkInstance` fixture style.

```js
test("a column typed enum is held to the tokens its Description lists", () => {
  const files = {
    "core/thing-schema.md": schema("thing", ["| `source` | Yes | ref → source | Where. |"], {
      sections: [
        "| `## Facts` | No | Table. What this thing states. |",
        "",
        "`## Facts` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Claim` | Yes | string | The claim |",
        "| `Confidence` | Yes | enum | `high` or `low`. How sure. |",
      ],
    }),
    "model/things/one.md": [
      "---", "source: Local", "---", "", "# One", "", "> A thing.", "",
      "## Facts", "",
      "| Claim | Confidence |", "| --- | --- |", "| It rains | maybe |",
    ].join("\n"),
  };
  const problems = [];
  checkInstance({ files, fail: (m) => problems.push(m) });
  assert.ok(
    problems.some((m) => m.includes("Confidence") && m.includes("maybe") && m.includes("R8")),
    `expected a column enum failure, got: ${problems.join(" | ")}`,
  );
});
```

- [ ] **Step 3: Run it and watch it fail**

Run: `node --test verify/instance-checks.test.mjs`

Expected: FAIL. The assertion message prints the problems actually raised, and none of them mentions `Confidence`, because no check reads a column enum yet.

- [ ] **Step 4: Carry the Description through the column reader**

At `lib/checks.mjs:734-738`, the columns are mapped without their Description, so the tokens have nowhere to be read from. Add the fourth cell:

```js
columns: b.table.rows.map((r) => ({
  name: r[0].replace(/`/g, "").trim(),
  required: r[1].replace(/`/g, "").trim() === "Yes",
  declared: r[2].replace(/`/g, "").trim(),
  description: (r[3] ?? "").trim(),
})),
```

- [ ] **Step 5: Hold the cell**

In the cell loop at `lib/checks.mjs:798-806`, before the `held(...)` call that ends the callback:

```js
if (col.declared === "enum") {
  const tokens = enumTokensOf(col.description);
  if (!tokens.length)
    fail(`${core}/${type}-schema.md: \`${col.name}\` in "## ${section}" is typed enum and its Description opens with no readable list of backticked values — tokens separated by commas or "or", ending at a period; R8 lists the permitted values where a check can read them`);
  else if (!tokens.includes(cell))
    fail(`${child}: \`${col.name}\` in "## ${section}" is "${cell}", and ${type}-schema.md permits ${tokens.map((t) => "\`" + t + "\`").join(", ")} (R8)`);
  return;
}
held(child, `\`${col.name}\` in "## ${section}"`, col.declared, cell);
```

The `return` matters: `held` has no reading for `enum` and would either ignore the cell or treat it as a reference. The enum branch is the whole handling of the cell.

- [ ] **Step 6: Correct the comment that says this does not happen**

At `lib/checks.mjs:1560-1561`, replace the two lines reading "Only frontmatter fields are read here; a column declared `enum` in a body table is not held, and none exists in core." with:

```js
    // Only frontmatter fields are read here. A column declared `enum` is held where the rest
    // of a column table is, in "what the schemas declare", against the same tokens.
```

- [ ] **Step 7: Run the tests**

Run: `node --test verify/instance-checks.test.mjs` Expected: PASS, one test more than Step 1's total.

Run: `node --run verify` Expected: PASS, unchanged from Step 1's total. Core declares no column enum yet, so nothing existing is newly held.

- [ ] **Step 8: Commit**

```bash
git add lib/checks.mjs verify/instance-checks.test.mjs
git commit
```

Subject: `A column typed enum is held to the values its schema lists`

---

### Task 2: `product`

A type exists in two places that must agree before the suite is green: its row in `TYPES`, where the folder is a literal, and its schema in `core/`, which `schemas exist`, `schema fixed shape` and `ownership declared` read. Example content is not required — a type whose folder is empty passes, which was run — but this task writes two products anyway, because Task 3's features need something to name.

**Files:**

- Modify: `lib/checks.mjs:24` — the `TYPES` list, above the `skill` row
- Create: `core/product-schema.md`
- Create: `example/model/products/atlas.md`, `example/model/products/courier.md`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: the type name `product`, referenced by Task 3's `products` field as `array of ref → product`; and the two canonical names `Atlas` and `Courier`.

- [ ] **Step 1: Add the row to `TYPES`**

In `lib/checks.mjs`, immediately above `{ type: "skill", folder: "skills" },`:

```js
  { type: "product", folder: "products" },
```

- [ ] **Step 2: Run verify and watch it fail**

Run: `node --run verify` Expected: FAIL, exit 1, with `core/product-schema.md is missing`. That message was produced by this exact sequence.

- [ ] **Step 3: Write the schema**

Create `core/product-schema.md` with exactly this content:

```markdown
# Product Schema

> Required structure for product files.

## File Location

`model/products/*.md`

A product owns nothing, so it is a file. Nothing owns a product either, and it lists no features: a feature names the products it is assembled into, and the edge is written once, on the side that can hold several.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `audience` | No | string | Free-text grouping, e.g. `Staff`. Whether an audience becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Product]` | Yes | The canonical name of the product. A feature's `products` references this exact string. |
| `> [What it is]` | Yes | One-paragraph statement of what the product is and who opens it |

## Purpose

A product is something the company ships that somebody uses on its own, and it answers "what does this company actually put in front of people?" for a reader who has met its values, its strategy and its processes and still cannot name its output. It is not the market it serves, the project that built it or the revenue it earns.

## Writing rules

- The tagline names what the product is and who opens it, in that order, and claims nothing about how well it does either.
- A product is named as the people who use it name it, not as its repository or its internal project is named.
- Two names for one thing a user opens once are one product; the second name is an alias on the concept that defines it.
- Nothing about a release, a version or a roadmap goes here: a product outlives all three.
```

- [ ] **Step 4: Run verify**

Run: `node --run verify` Expected: PASS. A type with an empty folder is legal, and this was run.

- [ ] **Step 5: Write the two products**

Create `example/model/products/atlas.md`:

```markdown
---
source: Local
audience: Staff
---

# Atlas

> The web application a dispatcher opens to see every vehicle on the road and decide what happens next.
```

Create `example/model/products/courier.md`:

```markdown
---
source: Local
audience: Driver
---

# Courier

> The phone application a driver opens to see the day's stops and record what happened at each one.
```

- [ ] **Step 6: Run everything**

Run each, exit code read on its own: `node --run verify`, `sh conventions/conventions-format`, `sh conventions/conventions-check`, `sh conventions/conventions-sync check`. Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/checks.mjs core/product-schema.md example/model/products
git commit
```

Subject: `Core can name what a company ships`

---

### Task 3: `domain` and `concept`

These two land together because neither means anything alone: a concept's required `domain` field points at the other, and a domain with no concepts holds nothing. Both are flat. The spec's §5 says why at length, and the short version is that a name of an owned type is unique within its owner, so a nested concept could not name a concept of another domain — which was run, and failed with "concept entities are named only within the domain that owns them (R5)".

**Files:**

- Modify: `lib/checks.mjs` — the `TYPES` list, below the `feature` row
- Create: `core/domain-schema.md`, `core/concept-schema.md`
- Create: `example/model/domains/dispatch.md`, `example/model/domains/billing.md`
- Create: `example/model/concepts/job.md`, `example/model/concepts/stop.md`, `example/model/concepts/invoice.md`

**Interfaces:**

- Consumes: nothing from Tasks 1–2.
- Produces: the type names `domain` and `concept`; the canonical names `Dispatch`, `Billing`, `Job`, `Stop` and `Invoice`. Task 4's `concepts` field points at `concept`, and Task 5 reads the `## Relations` column table this task declares.

- [ ] **Step 1: Add the two rows to `TYPES`**

Immediately below the `product` row, in this order:

```js
  { type: "domain", folder: "domains" },
  { type: "concept", folder: "concepts" },
```

Neither row carries `owns` or `owner`. That is the decision, not an omission.

- [ ] **Step 2: Write the two schemas**

Create `core/domain-schema.md`:

```markdown
# Domain Schema

> Required structure for domain files.

## File Location

`model/domains/*.md`

A domain owns nothing, so it is a file: its concepts name it rather than sit inside it, because a concept one domain owned could not be named by a concept of another.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Domain]` | Yes | The canonical name of the domain. A concept's `domain` references this exact string. |
| `> [Scope]` | Yes | One-paragraph statement of what this domain covers and what it leaves to another |

## Purpose

A domain is one area of the company's vocabulary, and it answers "where does this word live, and who decides what it means?" for a reader looking a term up and for a writer placing a new one. It holds no definitions: those are its concepts, and what a domain contains is read from the concepts naming it rather than listed here.

## Writing rules

- The tagline says what the domain covers and names at least one thing it deliberately leaves to another domain, because a boundary stated from one side only is not a boundary.
- A domain is named for the area, not for the team that owns it or the system that implements it.
- A domain carries no diagram and no list of its concepts. Both are second copies of what its concepts already say.
```

Create `core/concept-schema.md`:

```markdown
# Concept Schema

> Required structure for concept files.

## File Location

`model/concepts/*.md`

A concept owns nothing, so it is a file, and nothing owns a concept: it sits in the container rather than inside its domain so that a concept of one domain can be named by a concept of another, which an owned name cannot be.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `domain` | Yes | ref → domain | The area of the vocabulary this concept belongs to — the H1 of a file in `domains/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Concept]` | Yes | The canonical name of the concept. Every reference to it, from any domain, uses this exact string. |
| `> [Definition]` | Yes | One-paragraph definition of what the concept is |
| `## Also known as` | No | Table. The other names this concept goes by, none of which resolves. |
| `## Relations` | No | Table. What this concept points at. |

`## Also known as` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Term` | Yes | string | The other name |
| `Kind` | Yes | enum | `synonym`, `abbreviation`, `translation` or `deprecated`. What the other name is: a second word for the same thing, a short form of it, the same thing in another language, or a name this concept used to go by. |

`## Relations` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `Concept` | Yes | ref → concept | What this concept points at, by its canonical name |
| `Cardinality` | Yes | enum | `one`, `maybe one`, `many` or `one to many`. How many of the target one of these has: exactly one, none or one, none or more, or one or more. |
| `As` | No | string | The role the target plays in this relation. Required where two rows name the same concept, which is the only thing that tells them apart. |

## Purpose

A concept is one word the company means something exact by, and it answers "what do we mean when we say this, and what does it hang off?" for anyone reading a feature, a process or a role that names it. It is an entity rather than a heading in a glossary so that a file can cite it, a rename is caught everywhere at once, and the relations between the company's words are rows a check resolves instead of lines in a drawing.

## Writing rules

- The definition says what the thing is, not what a system does with it, and it is written so that someone outside the company could tell one of these from something adjacent.
- A concept this one hangs off belongs in `## Relations`, where it resolves, and never in the definition dressed as a link.
- A relation is written on one side only. Where it reads better the other way round, write it on the other concept and not here as well.
- `As` is the name the target goes by in this relation, written as the company says it: `booker`, `primary guest`, `included services`.
- An alias is never used as a reference anywhere in the model. It is there so a reader searching the wrong word finds the right page.
- A deprecated alias stays until nothing outside the model uses the old name, and then it goes; it is not a history of the name.
```

- [ ] **Step 3: Run verify**

Run: `node --run verify` Expected: PASS. Both schemas with both column tables, and both column enums, passed the fixed-shape and declaration checks with no example content present.

- [ ] **Step 4: Write the two domains**

Create `example/model/domains/dispatch.md`:

```markdown
---
source: Local
---

# Dispatch

> What is being moved, by whom and when. What it costs and who is invoiced belongs to Billing.
```

Create `example/model/domains/billing.md`:

```markdown
---
source: Local
---

# Billing

> What a completed job costs and how it is settled. What was agreed to be moved belongs to Dispatch.
```

- [ ] **Step 5: Write the three concepts**

`Job` carries both optional tables, an alias of two kinds, a parallel edge naming `Stop` twice, and a relation crossing into Billing. It is the file that exercises everything this design added.

Create `example/model/concepts/job.md`:

```markdown
---
source: Local
domain: Dispatch
---

# Job

> One agreement to move something from one place to another on a given day, from the moment a customer confirms it until the last item is delivered or the agreement is cancelled.

## Also known as

| Term | Kind |
| --- | --- |
| Run | synonym |
| Consignment | deprecated |

## Relations

| Concept | Cardinality | As |
| --- | --- | --- |
| Stop | one | first stop |
| Stop | one to many | stops |
| Invoice | maybe one | invoice |
```

Create `example/model/concepts/stop.md`:

```markdown
---
source: Local
domain: Dispatch
---

# Stop

> One place a job calls at, in the order the job calls at it, where something is picked up or dropped off.
```

Create `example/model/concepts/invoice.md`:

```markdown
---
source: Local
domain: Billing
---

# Invoice

> What one customer is asked to pay for work already done, issued once the jobs it covers are complete.
```

`Stop` and `Invoice` carry no `## Relations` at all, which is what proves the section is genuinely optional.

- [ ] **Step 6: Run everything**

Run each, exit code read on its own: `node --run verify`, `sh conventions/conventions-format`, `sh conventions/conventions-check`, `sh conventions/conventions-sync check`. Expected: all PASS. This exact set of five files was run and passed, including `Job → Invoice` crossing from Dispatch to Billing.

- [ ] **Step 7: Prove the enum is now held**

This is the positive control for Task 1, and it must be run rather than assumed.

Temporarily change `Job`'s first relation row from `| Stop | one | first stop |` to `| Stop | loads | first stop |`, then run `node --run verify`. Expected: FAIL, exit 1, naming `Cardinality`, `loads` and R8. An edit of exactly this kind, on a prototype of this schema, exited **0** before Task 1 existed.

Change it back and run `node --run verify` again. Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/checks.mjs core/domain-schema.md core/concept-schema.md example/model/domains example/model/concepts
git commit
```

Subject: `A concept is an entity, and its relations are rows`

---

### Task 4: `feature`

A feature is the first type in core whose required frontmatter includes an `array of ref →` to a type added in the same release, so this task is where the many-to-many edge of the spec's §3 becomes real. The example feature names both products, which is the case the whole shape exists for.

**Files:**

- Modify: `lib/checks.mjs` — the `TYPES` list, below the `product` row
- Create: `core/feature-schema.md`
- Create: `example/model/features/live-tracking.md`

**Interfaces:**

- Consumes: `product` from Task 2, as `array of ref → product`, and `concept` from Task 3, as `array of ref → concept`. Both types exist before this task starts, which is why it comes after them.
- Produces: the type name `feature`, and the canonical name `Live tracking`.

- [ ] **Step 1: Add the row to `TYPES`**

Immediately below the `concept` row:

```js
  { type: "feature", folder: "features" },
```

- [ ] **Step 2: Write the schema**

Create `core/feature-schema.md` with exactly this content:

```markdown
# Feature Schema

> Required structure for feature files.

## File Location

`model/features/*.md`

A feature owns nothing, so it is a file. It is not owned by a product either: a feature is assembled into several, so the edge is written here, on the side that can hold more than one.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `products` | Yes | array of ref → product | The products this feature is assembled into |
| `concepts` | No | array of ref → concept | The concepts this feature operates on |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Feature]` | Yes | The canonical name of the feature |
| `> [What it gives]` | Yes | One-paragraph statement of what someone can do with this that they could not without it |
| `## Description` | Yes | What the feature does, and where it stops |

## Purpose

A feature is one thing a product lets someone do, and it answers "what is this for, and which products have it?" for a reader deciding what to build, sell or document. It is the unit product documentation is organized along, so a feature nobody can name the user of is a component and belongs in neither this type nor this folder.

## Writing rules

- The tagline says what someone can now do, in their words, and never names a screen, a service or a vendor.
- `## Description` says where the feature stops as plainly as what it does, because the boundary is what tells two neighboring features apart.
- A feature is named for the capability, not for the vendor that supplies it. Where a vendor is what varies, the vendor is a concept the feature names and not a feature of its own.
- Nothing about a release, a ticket or a delivery date goes here: those move, and a feature outlives all three.
```

- [ ] **Step 3: Run verify**

Run: `node --run verify` Expected: PASS. Both types the schema references, `product` and `concept`, already have schemas, and a type with an empty folder is legal.

- [ ] **Step 4: Write the feature**

Create `example/model/features/live-tracking.md`:

```markdown
---
source: Local
products:
  - Atlas
  - Courier
concepts:
  - Job
  - Stop
---

# Live tracking

> Anyone with a stake in a job can see where it has got to without calling the driver.

## Description

Every stop a driver records updates the job's position for everyone watching it, in both applications and within a few seconds. It stops at the vehicle: where a driver is between stops is not recorded and not shown.
```

- [ ] **Step 5: Run everything**

Run each, exit code read on its own: `node --run verify`, `sh conventions/conventions-format`, `sh conventions/conventions-check`, `sh conventions/conventions-sync check`. Expected: all PASS. This exact file, with these two products and these two concepts, was run and passed.

- [ ] **Step 6: Commit**

```bash
git add lib/checks.mjs core/feature-schema.md example/model/features
git commit
```

Subject: `A feature is assembled into many products`

---

### Task 5: `As` is required where two rows name the same concept

`As` is optional, because most relations need no role name. It stops being optional the moment two rows of one table name the same concept, because then it is the only thing telling the two edges apart — and the spec's §4 counts fourteen such pairs in the multi-person instance. The schema says so in the column's Description; this task makes it a check rather than a sentence.

The check names no type. It reads every column table every schema declares, finds one whose columns are a reference and a column called `As`, and holds any instance file's rows for that section. Written that way it would hold a second type that later declared the same shape, which is the point of not naming `concept` in `lib/checks.mjs`.

**Files:**

- Modify: `lib/checks.mjs` — a new entry in the `instanceChecks` array, after the column-table check it reuses the reader of
- Test: `verify/instance-checks.test.mjs`

**Interfaces:**

- Consumes: the `columnTables` reader from Task 1's Step 4, which now carries each column's Description, and the `## Relations` table Task 3 declares.
- Produces: nothing exported.

- [ ] **Step 1: Write the failing test**

```js
test("a repeated reference in a relations table needs its role named", () => {
  const files = {
    "core/thing-schema.md": schema("thing", ["| `source` | Yes | ref → source | Where. |"], {
      sections: [
        "| `## Relations` | No | Table. What this points at. |",
        "",
        "`## Relations` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Thing` | Yes | ref → thing | What this points at |",
        "| `As` | No | string | The role it plays. Required where two rows name the same thing. |",
      ],
    }),
    "model/things/one.md": [
      "---", "source: Local", "---", "", "# One", "", "> A thing.", "",
      "## Relations", "",
      "| Thing | As |", "| --- | --- |", "| Two | |", "| Two | |",
    ].join("\n"),
    "model/things/two.md": ["---", "source: Local", "---", "", "# Two", "", "> A thing."].join("\n"),
  };
  const problems = [];
  checkInstance({ files, fail: (m) => problems.push(m) });
  assert.ok(
    problems.some((m) => m.includes("Two") && m.includes("As")),
    `expected a repeated-reference failure, got: ${problems.join(" | ")}`,
  );
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test verify/instance-checks.test.mjs` Expected: FAIL, the assertion printing problems none of which mentions `As`.

- [ ] **Step 3: Write the check**

Add to the `instanceChecks` array:

```js
  {
    // A column table declares at most one reference, and a row is one edge. Two rows naming
    // the same entity are therefore two edges between the same pair, and what tells them
    // apart is the role column: without it the second row states the first one again, and a
    // reader cannot tell a duplicate from a distinction. So the role is optional in general
    // and required exactly where the pair repeats, which is a rule a check can hold and a
    // writer cannot be expected to remember. The section is found by its shape — a reference
    // column beside a column named `As` — and never by the type it belongs to.
    name: "a repeated reference in a table names the role each row plays",
    rule: "R9",
    run() {
      for (const [type, tables] of columnTablesOf()) {
        for (const { section, columns } of tables) {
          const ref = columns.findIndex((c) => refOf(c.declared)?.draws);
          const as = columns.findIndex((c) => c.name === "As");
          if (ref < 0 || as < 0) continue;
          walkMd(EX, (child, text) => {
            if (typeOfFile(child) !== type) return;
            const table = tableOf(sectionsOf(text).get(section) ?? "");
            if (!table) return;
            const seen = new Map();
            for (const row of table.rows) {
              const name = (row[ref] ?? "").trim();
              if (!name) continue;
              seen.set(name, (seen.get(name) ?? 0) + 1);
            }
            for (const row of table.rows) {
              const name = (row[ref] ?? "").trim();
              if (!name || seen.get(name) < 2) continue;
              if (!(row[as] ?? "").trim())
                fail(`${child}: "## ${section}" names "${name}" in more than one row and one of them leaves \`As\` empty; the role is what tells two edges between the same pair apart`);
            }
          });
        }
      }
    },
  },
```

`columnTablesOf()` does not exist yet. The reader built inline at `lib/checks.mjs:728` is local to that check's `run()`. Lift it to a function beside `fieldsOf` at `lib/checks.mjs:357`, have both checks call it, and keep its comment with it. Doing that is part of this step, not a later cleanup: two copies of the reader is the drift these conventions exist to prevent.

- [ ] **Step 4: Run the tests**

Run: `node --test verify/instance-checks.test.mjs` Expected: PASS, one test more than Task 1's total.

Run: `node --run verify` Expected: PASS. `Job` names `Stop` twice and gives both rows an `As`, so it is the case that must stay green.

- [ ] **Step 5: Prove it fires on the example**

Temporarily blank the `As` cell of `Job`'s `| Stop | one | first stop |` row and run `node --run verify`. Expected: FAIL, naming `Stop` and `As`.

Restore it and run again. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/checks.mjs verify/instance-checks.test.mjs
git commit
```

Subject: `Two edges between one pair say which is which`

---

### Task 6: The release

Core changes, so core and the package move together. They can move apart and did: `v0.35.0` went out as a package-only release with core left at 0.34.0, which is why this one is 0.36.0 and not 0.35.0.

**Files:**

- Modify: `core/manifest.json`
- Modify: `package.json`
- Modify: `.github/workflows/instance-check.yml:6` and `:37`
- Modify: `README.md:14` and `README.md:67`

**Interfaces:**

- Consumes: everything from Tasks 1–5.
- Produces: the tag `v0.36.0`.

- [ ] **Step 1: Set the two versions**

`core/manifest.json` becomes `{ "version": "0.36.0", "shape": 3 }`. `package.json`'s `version` becomes `0.36.0`. The `release manifest` check requires the manifest's version to be the tag when there is one, so these move before the tag and never after.

- [ ] **Step 2: Move the workflow's own ref**

In `.github/workflows/instance-check.yml`, line 6's comment and line 37's `ref:` both read `v0.35.0`. Both become `v0.36.0`.

- [ ] **Step 3: Add the four types to the README**

`README.md:14` lists the schemas inside the `core/` tree block; `README.md:67` lists them again in a sentence beginning "Core holds one schema per type, and `core/` is the list:". Add `product`, `feature`, `domain` and `concept` to both. Do not write how many there are: the sentence already says `core/` is the list, which is where the count is read.

- [ ] **Step 4: Run everything**

Run each, exit code read on its own: `node --run verify`, `node --run test:instance`, `node --run test:instance-checks`, `node --run test:rules`, `sh conventions/conventions-format`, `sh conventions/conventions-check`, `sh conventions/conventions-sync check`. Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml README.md
git commit
```

Subject: `Core and the package read 0.36.0, and the workflow's ref with them`

- [ ] **Step 6: Push and open the pull request**

```bash
git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin product-feature-and-ontology
gh pr create --fill
```

Report the check and **stop**. Merging is the owner's word and is not inferred from an earlier one.

- [ ] **Step 7: After the merge, and only then**

Tag `v0.36.0` and write the release notes in the prose register: what changed for a consumer, what breaks, how to take it. Nothing breaks — an instance that writes none of the four folders is as valid after this as before.

Then the consumers, each its own change in its own repository and none of them here: `robertblust/mental-model` re-syncs its vendored core in the three places a pin lives; `companygraph/mcp-server`, `companygraph/obsidian-plugin` and the two sites re-pin the parser if and when they want to draw any of this.

---

## Not done in this plan

`architecture-decision` and `roadmap`, which the first design's product pack named and this release still defers. The pack mechanism, which these four types went into core instead of. Any migration of `likemagic-tech/magic-mental-model`, which is not a CompanyGraph instance; the spec's §10 records what such a migration would hit, and none of it is work here. Any rendering, anywhere: no site, server or plugin draws a product, a feature or a relation until it takes the release and is asked to.
