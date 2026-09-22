# achievement-kind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give core an `achievement-kind` type, teach R9 a third declared shape — the grouped section — so an experience's `## Achievements` can be grouped under `###` headings that name kinds, draw those headings as edges in the parser, hold an instance to their order and their completeness in the shipped checks, show it all in the example, and prepare release 0.28.0 without tagging.

**Architecture:** One new schema file, one new `TYPES` entry, and one new declared shape. R9 already has two shapes a schema can declare — a frontmatter field and a column table — and both are read by one caption-addressed walk in `lib/checks.mjs` (`blocksOf`) and one in `lib/instance.mjs` (`parseSchemas`, `declarationsOf`). The grouped section joins them as a third, told apart by the words of its caption: `` `## Achievements` is grouped under these headings: `` rather than `` `## Achievements` is a table with these columns: ``. The parser then reads each `### ` line of that section, resolves it against the declared type and pushes `{ from, to, via: "Achievements.Kind", attrs: {} }` — R4 where it resolves to nothing. The section's text keeps its headings, so every consumer that renders text is unchanged. Two instance checks are added, both generic over whatever a schema declares grouped: headings ascend by the target type's `rank`, and no bullet stands before the first heading where the instance holds an entity of that type.

**Tech Stack:** Markdown, Node 22's built-in test runner, no dependencies. `npm run verify` (`node verify/check.mjs`), `npm run test:instance`, `npm run test:instance-checks`, `npm run test:rules`, and `sh conventions/conventions-check` for prose.

**Spec:** `docs/superpowers/specs/2026-09-17-achievement-kind-design.md`

## Global Constraints

- **File location** `model/achievement-kinds/*.md`. Nothing owns a kind and it owns nothing; it sits at the container root beside `experience-kinds/`, because every profile's experiences group by the same set.
- **Frontmatter** `source` (required, `ref → source`), `source-id` (optional, `string`) and `rank` (required, `number`): the kind's position in an entry, spaced in tens.
- **Sections** `# [Label]`, the canonical name every heading references; `> [Summary]`, what the kind covers in one paragraph; `## What it means`, which achievements belong and which do not.
- A section whose content is grouped under `###` headings that name entities says so in the sections table: its Description begins with `Grouped.`
- A caption line naming its section follows the sections table, as a column table's does — `` `## Achievements` is grouped under these headings: `` — then a table with columns `Heading | Required | Type | Description` and one row. The row's `Type` is `ref → <type>`; `Heading` names the reference, and is what the edge is called.
- A section marked `Grouped.` with no heading table, and a heading table for a section not so marked, are both errors, as with `Table.`.
- **R16 gains one sentence**: a heading declared `ref → <type>` draws an edge from the page to the entity each `###` heading in that section names, via `<Section>.<Heading>`, and a heading that names nothing of its type is R4.
- `Required` is `No` because an instance that defines no kinds has no headings; the first rule is what makes grouping mandatory where kinds exist.
- **Instance checks** (`lib/checks.mjs`). Two additions, both mechanical: headings in a grouped section follow the rank order of the kinds they name, and where the instance holds any achievement kind, no bullet in `## Achievements` stands outside a heading. Whether a bullet is under the right kind stays the agent pass's, because that is a reading.
- **Release** core 0.28.0, a minor while core is below 1.0. The notes say an instance may define kinds and, if it does, groups every entry; one that does not is unaffected.
- Where prose about core lists its types, the new type is added there without a count.
- A set that differs from the reference instance's is the point: it shows the kinds are the instance's.
- Core and the example are company-generic: nothing in `core/` or `example/` names a real person, company or product, and the multi-person instance is never named.
- Prose follows `conventions/WRITING.md`: American English, sentence case, spaced em-dashes, no serial comma, no number that still moves. Run `sh conventions/conventions-check` before every commit.
- Commit messages are in the git register: a plain-sentence subject under seventy characters with no type prefix and no trailing period, one to three short paragraphs of prose with cause before mechanism, a final line beginning `Verified:` naming what ran, then `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Commits happen only when the Owner has said to commit.** An executor stages the files and drafts the message, then asks before committing if it has not been told to. Nothing is merged and nothing is tagged by an agent.
- Every task's `Verified:` line is rewritten from what the task's commands actually printed before the commit is made; it is re-checked at execution.

---

## File Structure

| File | Responsibility |
| --- | --- |
| Create `core/achievement-kind-schema.md` | The new type: file location, frontmatter with `rank`, the three sections, purpose and writing rules |
| Modify `lib/checks.mjs` | `TYPES` gains `achievement-kind`; `blocksOf` learns the heading caption; two new instance checks; the R16 check holds `###` headings |
| Modify `lib/instance.mjs` | `HEADING_CAPTION`; `parseSchemas` draws the schema-graph edge for a heading table; `declarationsOf` reads a `headings` map; the instance edge walk draws one edge per `###` heading |
| Modify `verify/check.mjs` | R9 accepts `Grouped.` and its heading table, fails both mismatches and a malformed heading table; the type vocabulary check reads the heading table's `Type` cell |
| Modify `core/CONVENTIONS.md` | R9 gains the grouped-section paragraph; R16 gains the heading sentence |
| Modify `core/experience-schema.md` | `## Achievements` becomes `Grouped.`, gains the caption and heading table, and four writing rules |
| Modify `verify/instance.test.mjs` | Fixture schemas gain `grouped`; five tests for the heading edge, the kept text, R4, the undeclared section and the schema graph |
| Modify `verify/instance-checks.test.mjs` | The fixture schema helper gains `grouped`; one `blocksOf` test and five check tests |
| Create `example/model/achievement-kinds/{decisions,delivery,sharing,results}.md` | The example instance's own set, ranked 10/20/30/40 |
| Modify `example/model/profiles/*/experiences/*.md` (5 files) | Every entry with achievements grouped under `###` headings |
| Modify `example/model/README.md` | The type sentence without a count, and the tree's `achievement-kinds/` line |
| Modify `README.md` | The two type lists in `core/`'s tree and in Status |
| Modify `package.json`, `core/manifest.json`, `.github/workflows/instance-check.yml` | 0.28.0 in all three, `shape` 3, the workflow ref on lines 6 and 37 |

---

## Task 1: The achievement-kind type

**Files:**

- Create: `core/achievement-kind-schema.md`
- Modify: `lib/checks.mjs` (the `TYPES` array, lines 18–49 — one line inserted after the `experience-kind` entry)
- Modify: `README.md` (lines 20–22 and lines 84–86)
- Test: `npm run verify` — `verify/check.mjs`'s "schemas exist", "schema fixed shape", "type vocabulary" and "ownership declared" checks all read `TYPES` and are the test for this task. `verify/check.mjs` has no fixtures of its own; the repository's own files are what it asserts against.

**Interfaces:**

- Produces: `TYPES` entry `{ type: "achievement-kind", folder: "achievement-kinds" }`, consumed by every check in `lib/checks.mjs` and `verify/check.mjs`.
- Produces: `core/achievement-kind-schema.md` declaring `## File Location` as `model/achievement-kinds/*.md`, which is what `folderTypes` in `lib/instance.mjs` reads to map the folder to the type, and `rank` typed `number`, which Task 4's order check keys on.

- [ ] **Step 1: Write the failing test — register the type first**

In `lib/checks.mjs`, find:

```js
  { type: "experience-kind", folder: "experience-kinds" },
```

and insert directly after it:

```js
  { type: "achievement-kind", folder: "achievement-kinds" },
```

- [ ] **Step 2: Run it, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
```

Expected: exit 1, with `core/achievement-kind-schema.md is missing` from the "schemas exist" check. If anything else fails, stop and report — the tree was not green before this edit.

- [ ] **Step 3: Implement — the schema file**

Create `core/achievement-kind-schema.md`:

```markdown
# Achievement Kind Schema

> Required structure for achievement kind files.

## File Location

`model/achievement-kinds/*.md`

A kind owns nothing and nothing owns it: many experiences group their achievements under the
same few, and what each kind covers lives here rather than being restated in every entry. It
sits at the container root beside `experience-kinds/` rather than inside a profile, because
every profile's experiences group by the same set.

The set is deliberately the instance's own. Which groups a career needs is a fact about that
career — a researcher's work falls by publication and grant, a salesperson's by territory and
account — and a kind arriving later is one file here, not a change to this metamodel and a
release of it.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `sources/` |
| `source-id` | No | string | The identifier this page has in its source — a directory id, a record key. Absent when the source has none, as a repository does not. |
| `rank` | Yes | number | The kind's position within an entry. Spaced in tens so a kind can be added without renumbering the others. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Label]` | Yes | The canonical name. Every heading that groups achievements references this exact string. |
| `> [Summary]` | Yes | One-paragraph summary of what the kind covers |
| `## What it means` | Yes | Which achievements belong to this kind, and which do not |

## Purpose

An achievement kind answers "what sort of claim is this bullet?" — the question a reader cannot
otherwise ask of a list that holds a decision, a delivery and an outcome side by side. Its value
is that the answer is a reference rather than a word: two bullets under the same kind mean the
same sort of thing across every entry, the kinds are visible in the graph as nodes, and changing
what a kind covers is one edit rather than a pass over every period.

## Writing rules

- `## What it means` is written so that two readers filing the same bullet would file it under
  the same kind. A kind that cannot do that is not yet a kind.
- It says what the kind excludes as well as what it covers, since the boundary with the kind
  beside it is where every disagreement will be. How to decide between two kinds is written
  here, in the instance, and nowhere else.
- A kind is about the sort of claim, never about how important it is. Importance is not an order
  the model can hold.
- Name it for what the claims are — `Architecture`, `Results` — and never for the section they
  sit in.
- `rank` orders kinds within an entry and nothing else, and two kinds never share one.
```

- [ ] **Step 4: Implement — the two type lists in `README.md`**

In `README.md`, find:

```
  *-schema.md      one per type: identity, vision, profile, experience,
                   experience-kind, skill, proficiency-level, value, source,
                   surface, strategic-objective, strategy, role, process, phase
```

and replace with:

```
  *-schema.md      one per type: identity, vision, profile, experience,
                   experience-kind, achievement-kind, skill, proficiency-level,
                   value, source, surface, strategic-objective, strategy, role,
                   process, phase
```

Then find:

```
it. Core holds one schema per type, and `core/` is the list: identity, vision, profile,
experience, experience-kind, skill, proficiency-level, value, source, surface,
strategic-objective, strategy, role, process and phase. The reference instance,
```

and replace with:

```
it. Core holds one schema per type, and `core/` is the list: identity, vision, profile,
experience, experience-kind, achievement-kind, skill, proficiency-level, value, source,
surface, strategic-objective, strategy, role, process and phase. The reference instance,
```

- [ ] **Step 5: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. `verify` prints `✓ <n> checks passed`. The example carries no `achievement-kinds/` folder yet and needs none: "the container holds what the types imply" checks what sits in the container against the types, not that every type's folder exists.

- [ ] **Step 6: Commit**

```bash
git add core/achievement-kind-schema.md lib/checks.mjs README.md
git commit -m "$(cat <<'MSG'
An achievement kind is an entity an instance defines

Which groups a career's achievements fall into is a fact about that career, not about the
meta-model: a researcher's work groups by publication and grant, a salesperson's by territory
and account. So the groups are entities, as experience kinds already are, and their order is a
`rank` spaced in tens, as a proficiency level's is.

The type is registered where the suite enumerates core's types and where the README lists them.
Nothing references a kind yet; the declaration an experience makes comes next.

Verified: npm run verify, npm run test:instance, npm run test:instance-checks, npm run
test:rules and sh conventions/conventions-check all pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 2: The parser reads a grouped section's headings

**Files:**

- Modify: `lib/instance.mjs` (the caption constant near line 339; the `parseSchemas` Sections loop, lines 401–415; `declarationsOf`, lines 434–459; the instance edge walk, after the body-table loop that ends at line 295)
- Test: `verify/instance.test.mjs` (the `schema` helper at lines 27–50, the `schemas` map at lines 55–74, and five new tests)

**Interfaces:**

- Consumes: `declarationOf(cell)` → `{ form, target } | null`, already in `lib/instance.mjs`.
- Produces: ``const HEADING_CAPTION = /^`##\s*([^`]+)`\s+is grouped under these headings:$/`` in `lib/instance.mjs`.
- Produces: `declarationsOf(schemas)` entries gain `headings`, a `Map<sectionHeading, { name, decl }>` where `name` is the Heading cell without backticks and `decl` is `{ form, target }`.
- Produces: instance edges `{ from, to, via: "<Section>.<Heading>", attrs: {} }`.
- Produces: schema-graph edges `{ from: "core/experience", to: "core/achievement-kind", via: "Achievements.Kind", attrs: { type: "ref → achievement-kind" } }`.

- [ ] **Step 1: Write the failing tests**

In `verify/instance.test.mjs`, first extend the fixture schema builder. Find:

```js
const schema = (type, { fields = [], tables = {}, location = null, owner = null } = {}) => {
```

and replace with:

```js
const schema = (type, { fields = [], tables = {}, grouped = {}, location = null, owner = null } = {}) => {
```

Then find:

```js
  for (const heading of Object.keys(tables)) lines.push(`| \`## ${heading}\` | No | Table. |`);
  for (const [heading, columns] of Object.entries(tables)) {
    lines.push("", `\`## ${heading}\` is a table with these columns:`, "",
               "| Column | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of columns) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  }
  return lines.join("\n") + "\n";
```

and replace with:

```js
  for (const heading of Object.keys(tables)) lines.push(`| \`## ${heading}\` | No | Table. |`);
  for (const heading of Object.keys(grouped)) lines.push(`| \`## ${heading}\` | No | Grouped. |`);
  for (const [heading, columns] of Object.entries(tables)) {
    lines.push("", `\`## ${heading}\` is a table with these columns:`, "",
               "| Column | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of columns) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  }
  // R9's third declared shape: a section grouped under `###` headings that name entities. One
  // row, because every heading in the section names the same type.
  for (const [heading, [name, t]] of Object.entries(grouped)) {
    lines.push("", `\`## ${heading}\` is grouped under these headings:`, "",
               "| Heading | Required | Type | Description |", "| --- | --- | --- | --- |",
               `| \`${name}\` | No | ${t} | The ${name}. |`);
  }
  return lines.join("\n") + "\n";
```

Then find, in the `schemas` map:

```js
  ["experience-kind-schema.md", schema("experience-kind")],
```

and replace with:

```js
  ["experience-kind-schema.md", schema("experience-kind")],
  ["achievement-kind-schema.md", schema("achievement-kind", { fields: [["rank", "number"]] })],
```

Then find:

```js
  ["experience-schema.md", schema("experience", {
    fields: [["kind", "ref → experience-kind"], ["start", "date"], ["end", "date"],
             ["organization", "ref? → identity"], ["skills", "array of ref → skill"]],
    tables: { References: [["What", "string"], ["URL", "string"]] },
  })],
```

and replace with:

```js
  ["experience-schema.md", schema("experience", {
    fields: [["kind", "ref → experience-kind"], ["start", "date"], ["end", "date"],
             ["organization", "ref? → identity"], ["skills", "array of ref → skill"]],
    tables: { References: [["What", "string"], ["URL", "string"]] },
    grouped: { Achievements: ["Kind", "ref → achievement-kind"] },
  })],
```

Now append these five tests at the end of `verify/instance.test.mjs`:

```js
// R9's grouped section. A `###` heading is not a field and not a table cell, so until a schema
// could declare one, a heading that named an entity drew nothing and R4 was not true of it. The
// declaration reads like a column's and the edge is named the same way — `<Section>.<Heading>`.
test("a `###` heading in a grouped section draws an edge via Section.Heading", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("achievement-kinds/results.md",
    "---\nrank: 40\n---\n\n# Results\n\n> What came of it.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Delivery\n\n- Split one service.\n\n### Results\n\n- The second team stopped waiting.\n");
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.filter((x) => x.via === "Achievements.Kind"), [
    { from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
      to: "achievement-kinds/delivery", via: "Achievements.Kind", attrs: {} },
    { from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
      to: "achievement-kinds/results", via: "Achievements.Kind", attrs: {} },
  ]);
});

// The headings stay in the text, unlike a caption, which is pulled out of it. A consumer that
// renders the section renders what the file says, and the edges are drawn beside it.
test("a grouped section keeps its headings in the text it hands on", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Delivery\n\n- Split one service.\n");
  const exp = parseInstance(files, { schemas }).entities.find((e) => e.type === "experience");
  const achievements = exp.sections.find((s) => s.heading === "Achievements");
  assert.equal(achievements.text, "### Delivery\n\n- Split one service.");
});

test("a heading that names nothing of its type is an R4 error", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Deliverly\n\n- Split one service.\n");
  assert.throws(() => parseInstance(files, { schemas }),
                /^Error: R4: "Deliverly" in .* names no achievement-kind/);
});

// The declaration is what makes a heading a reference, exactly as it is for a field and for a
// column: a `###` line in a section no schema declares grouped is prose with a hash in front.
test("a `###` heading in a section the schema does not group draws nothing", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Ending\n\n### Delivery\n\nText.\n");
  const { edges } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via.startsWith("Ending")).length, 0);
});

// The vocabulary graph draws a heading table's type the way it draws a column table's, so a
// reader of core sees that an experience points at an achievement kind.
test("a heading table's Type cell is an edge in the schema graph, via Section.Heading", () => {
  const withGrouped = new Map(core);
  withGrouped.set("achievement-kind-schema.md",
    "# Achievement Kind Schema\n\n> Kinds.\n\n## File Location\n\n`achievement-kinds/*.md`\n\n" +
    "## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `rank` | Yes | number | Position |\n\n## Sections\n\n| Section | Required | Description |\n" +
    "| --- | --- | --- |\n| `# [Label]` | Yes | Name |\n");
  withGrouped.set("experience-schema.md",
    withGrouped.get("experience-schema.md") +
    "| `## Achievements` | No | Grouped. What was accomplished. |\n\n" +
    "`## Achievements` is grouped under these headings:\n\n" +
    "| Heading | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `Kind` | No | ref → achievement-kind | The kind |\n");
  const { edges } = parseSchemas(withGrouped);
  assert.deepEqual(edges.find((x) => x.via === "Achievements.Kind"), {
    from: "core/experience", to: "core/achievement-kind", via: "Achievements.Kind",
    attrs: { type: "ref → achievement-kind" },
  });
});
```

- [ ] **Step 2: Run them, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance; echo "exit: $?"
```

Expected: exit 1. The first test fails with `AssertionError` comparing `[]` against the two expected edges; the third fails because no error is thrown; the fifth fails with a `TypeError` inside `parseSchemas` — the loose `SECTION_CAPTION` matches the heading caption, `t.columns.indexOf("Column")` is `-1`, and `row[-1].replace` is read of `undefined`. That crash is the reason the parser has to change before any core schema declares a grouped section.

- [ ] **Step 3: Implement — the caption, in `lib/instance.mjs`**

Find:

```js
// A captioned column table's caption names the section it declares columns for — `` `## Skills`
// is a table with these columns: `` — and both walks below match it the same way.
const SECTION_CAPTION = /^`##\s*([^`]+)`/;
```

and replace with:

```js
// A captioned column table's caption names the section it declares columns for — `` `## Skills`
// is a table with these columns: `` — and both walks below match it the same way.
const SECTION_CAPTION = /^`##\s*([^`]+)`/;

// R9's third declared shape, the grouped section: a table saying what the `###` headings under
// one section name — `` `## Achievements` is grouped under these headings: ``. Both captions
// open by naming a section in backticks, so the words are what separate them and this one is
// matched first everywhere; SECTION_CAPTION is deliberately loose and would swallow it.
const HEADING_CAPTION = /^`##\s*([^`]+)`\s+is grouped under these headings:$/;
```

- [ ] **Step 4: Implement — the schema graph, in `parseSchemas`**

Find:

```js
    const sectionsSection = e.sections.find(s => s.heading === "Sections");
    for (const t of sectionsSection?.tables ?? []) {
      if (!t.caption) continue; // the section's own index table, not a column table
      const heading = t.caption.match(SECTION_CAPTION);
      if (!heading) continue;
      const colIdx = t.columns.indexOf("Column"), typeIdx = t.columns.indexOf("Type");
```

and replace with:

```js
    const sectionsSection = e.sections.find(s => s.heading === "Sections");
    for (const t of sectionsSection?.tables ?? []) {
      if (!t.caption) continue; // the section's own index table, not a column or heading table
      // A heading table declares one reference for every `###` heading in its section, and a
      // column table one per column, so the two differ only in which column holds the name.
      const grouped = t.caption.match(HEADING_CAPTION);
      const heading = grouped ?? t.caption.match(SECTION_CAPTION);
      if (!heading) continue;
      const colIdx = t.columns.indexOf(grouped ? "Heading" : "Column"), typeIdx = t.columns.indexOf("Type");
```

The rest of that loop is unchanged: it already reads `row[typeIdx]` through `declarationOf`, resolves the target and pushes `` `${heading[1]}.${row[colIdx].replace(/`/g, "")}` ``.

- [ ] **Step 5: Implement — the declarations, in `declarationsOf`**

Find:

```js
  for (const e of parseSchemas(schemas).entities) {
    const type = e.id.slice("core/".length);
    const fields = new Map(), tables = new Map();
    const frontmatter = e.sections.find((s) => s.heading === "Frontmatter");
    if (frontmatter?.table) readInto(frontmatter.table, "Field", fields);
    for (const t of e.sections.find((s) => s.heading === "Sections")?.tables ?? []) {
      const heading = t.caption?.match(SECTION_CAPTION);
      if (!heading) continue;
      const columns = new Map();
      readInto(t, "Column", columns);
      tables.set(heading[1].trim(), columns);
    }
    declared.set(type, { fields, tables });
  }
```

and replace with:

```js
  for (const e of parseSchemas(schemas).entities) {
    const type = e.id.slice("core/".length);
    const fields = new Map(), tables = new Map(), headings = new Map();
    const frontmatter = e.sections.find((s) => s.heading === "Frontmatter");
    if (frontmatter?.table) readInto(frontmatter.table, "Field", fields);
    for (const t of e.sections.find((s) => s.heading === "Sections")?.tables ?? []) {
      // A grouped section's heading table is read beside the column tables and told apart by
      // its caption. It declares one reference — R9 gives it one row — and the Heading cell is
      // what the edge is called, the way a column's name is.
      const grouped = t.caption?.match(HEADING_CAPTION);
      if (grouped) {
        const k = t.columns.indexOf("Heading"), i = t.columns.indexOf("Type");
        const row = t.rows[0];
        if (k < 0 || i < 0 || !row) continue;
        const decl = declarationOf(row[i]);
        if (decl) headings.set(grouped[1].trim(), { name: bare(row[k]), decl });
        continue;
      }
      const heading = t.caption?.match(SECTION_CAPTION);
      if (!heading) continue;
      const columns = new Map();
      readInto(t, "Column", columns);
      tables.set(heading[1].trim(), columns);
    }
    declared.set(type, { fields, tables, headings });
  }
```

- [ ] **Step 6: Implement — the edge walk, in `parseInstance`**

Find the end of the body-table loop:

```js
        if (!to) continue;
        edges.push({ from: e.id, to, via: `${s.heading}.${refName}`, attrs });
      }
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));
```

and replace with:

```js
        if (!to) continue;
        edges.push({ from: e.id, to, via: `${s.heading}.${refName}`, attrs });
      }
    }

    // A grouped section draws from its `###` headings (R9, R16). A heading is not a field and
    // not a cell, so until a schema could declare one it drew nothing and R4 was not true of
    // it. The heading's text is the canonical name and resolves against the declared type like
    // any other reference; the section's text is left as written, headings and all, so every
    // consumer that renders it is unchanged. A heading carries nothing to qualify the edge
    // with, so `attrs` is empty.
    for (const s of e.sections) {
      const grouping = schema.headings.get(s.heading);
      if (!grouping) continue;
      const where = `${e.path} "## ${s.heading}"`;
      for (const line of s.text.split("\n")) {
        if (!line.startsWith("### ")) continue;
        const to = resolve(grouping.decl, line.slice(4).trim(), where);
        if (to) edges.push({ from: e.id, to, via: `${s.heading}.${grouping.name}`, attrs: {} });
      }
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));
```

- [ ] **Step 7: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance; echo "exit: $?"
npm run verify; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. No core schema declares a grouped section yet, so `verify` reads the same files it read before.

- [ ] **Step 8: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs
git commit -m "$(cat <<'MSG'
The parser resolves a `###` heading that names an entity

A schema could declare a reference in a field and in a table cell, and a heading that named an
entity was neither, so it drew no edge and an unresolvable one was nobody's error. A section
declared grouped now carries a heading table, and every `###` line under it resolves against the
type that table names.

The edge is called `<Section>.<Heading>`, as a column's is, and the section's text keeps its
headings, so anything that renders the text sees what the file says. A heading that names
nothing of its type is the R4 it should always have been.

Verified: npm run test:instance, npm run verify, npm run test:instance-checks, npm run
test:rules and sh conventions/conventions-check all pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 3: R9's grouped section, and the experience that declares one

**Files:**

- Modify: `lib/checks.mjs` (the caption constant at line 119, the `blocksOf` comment and body at lines 122–156)
- Modify: `verify/check.mjs` (the "schema fixed shape" block at lines 202–271, and the "type vocabulary" typed-table list at line 295)
- Modify: `core/CONVENTIONS.md` (R9, after the `Table.` paragraph ending "each half means nothing without the other."; R16, after the paragraph ending "it is written as digits.")
- Modify: `core/experience-schema.md` (the `## Achievements` sections row at line 42; a caption and table after the `## References` column table; four writing rules)
- Test: `verify/instance-checks.test.mjs` (one `blocksOf` test), plus `npm run verify` over the edited `core/experience-schema.md`

**Interfaces:**

- Consumes: `TYPES` (Task 1) — `achievement-kind` must be a known type or the vocabulary check rejects `ref → achievement-kind`.
- Consumes: `HEADING_CAPTION` semantics from Task 2; `lib/checks.mjs` keeps its own copy, as it already keeps its own `COLUMN_CAPTION`.
- Produces: ``export const HEADING_CAPTION = /^`##\s+(.+?)`\s+is grouped under these headings:$/`` in `lib/checks.mjs`.
- Produces: `blocksOf(body)` entries gain `grouped: string | null` beside the existing `section: string | null` and `table`. A block is never both.
- Produces: `core/experience-schema.md` declaring `## Achievements` grouped under `Kind`, `ref → achievement-kind`, consumed by Tasks 4 and 5.

- [ ] **Step 1: Write the failing test — the `blocksOf` unit test**

In `verify/instance-checks.test.mjs`, find:

```js
import { checkInstance, isNewer } from "../lib/checks.mjs";
```

and replace with:

```js
import { blocksOf, checkInstance, isNewer } from "../lib/checks.mjs";
```

Then append this test at the end of the file:

```js
// R9 fixes two captions under "## Sections" and both open by naming a section in backticks, so
// what tells them apart is their words: a column table declares what a body table's columns
// are, a heading table what the `###` headings under one section name. Reading a heading table
// as an uncaptioned block is what the loose match would do, and that block is an error.
test("a heading table is addressed by its own caption, apart from the column tables", () => {
  const body = [
    "| Section | Required | Description |",
    "| --- | --- | --- |",
    "| `## Achievements` | No | Grouped. What was accomplished. |",
    "",
    "`## Achievements` is grouped under these headings:",
    "",
    "| Heading | Required | Type | Description |",
    "| --- | --- | --- | --- |",
    "| `Kind` | No | ref → achievement-kind | The kind. |",
  ].join("\n");
  const blocks = blocksOf(body);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].section, null);
  assert.equal(blocks[0].grouped, null);
  assert.equal(blocks[1].section, null, "a heading table is not a column table");
  assert.equal(blocks[1].grouped, "Achievements");
  assert.deepEqual(blocks[1].table.columns, ["Heading", "Required", "Type", "Description"]);
});
```

- [ ] **Step 2: Run it, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance-checks; echo "exit: $?"
```

Expected: exit 1, `AssertionError` on `blocks[1].grouped` — `undefined` is not `"Achievements"`, because `blocksOf` has no such field.

- [ ] **Step 3: Implement — `blocksOf` in `lib/checks.mjs`**

Find:

```js
// The one sanctioned way to introduce a column table: a line naming its section in
// backticks. R9 fixes this wording, and "schema fixed shape" enforces it both ways.
export const COLUMN_CAPTION = /^`##\s+(.+?)`\s+is a table with these columns:$/;
```

and replace with:

```js
// The one sanctioned way to introduce a column table: a line naming its section in
// backticks. R9 fixes this wording, and "schema fixed shape" enforces it both ways.
export const COLUMN_CAPTION = /^`##\s+(.+?)`\s+is a table with these columns:$/;


// The other sanctioned caption, for the other declared shape: a section whose content is
// grouped under `###` headings that name entities. Both captions name a section in backticks
// and the words after it are what separate them, so a reader of "## Sections" can say which of
// the two a table is without counting blocks or looking at its columns.
export const HEADING_CAPTION = /^`##\s+(.+?)`\s+is grouped under these headings:$/;
```

Then find:

```js
    let above = i - 1;
    while (above >= 0 && lines[above].trim() === "") above--;
    const caption = above >= 0 ? lines[above].trim().match(COLUMN_CAPTION) : null;
    out.push({
      section: caption ? caption[1].trim() : null,
      table: parseTable(lines.slice(i, end)),
    });
```

and replace with:

```js
    let above = i - 1;
    while (above >= 0 && lines[above].trim() === "") above--;
    const line = above >= 0 ? lines[above].trim() : "";
    const caption = line.match(COLUMN_CAPTION);
    const heading = caption ? null : line.match(HEADING_CAPTION);
    out.push({
      section: caption ? caption[1].trim() : null,
      grouped: heading ? heading[1].trim() : null,
      table: parseTable(lines.slice(i, end)),
    });
```

And extend the function's comment. Find:

```js
// The caption is how a column table is ADDRESSED. Position is not, and cannot be: the
// sections table lists `## Skills` alongside rows for the H1 and the tagline, in whatever
// order the document reads best, so "the nth table" and "the nth section" line up only by
// accident. Reordering two rows used to hand back another section's columns, or none.
```

and replace with:

```js
// The caption is how a column table is ADDRESSED. Position is not, and cannot be: the
// sections table lists `## Skills` alongside rows for the H1 and the tagline, in whatever
// order the document reads best, so "the nth table" and "the nth section" line up only by
// accident. Reordering two rows used to hand back another section's columns, or none.
//
// A block carries `section` when a column table's caption addresses it and `grouped` when a
// heading table's does, never both. Two fields rather than one flag, so every caller that only
// knows about column tables keeps reading exactly what it read before: a heading table arrives
// with `section: null` and is skipped by the filters that select column tables.
```

- [ ] **Step 4: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance-checks; echo "exit: $?"
npm run verify; echo "exit: $?"
```

Expected: `test:instance-checks` exits 0. `verify` also exits 0 — no schema declares a grouped section yet.

- [ ] **Step 5: Write the second failing test — declare the grouped section in `core/experience-schema.md`**

Find:

```
| `## Achievements` | No | What was accomplished in this period |
```

and replace with:

```
| `## Achievements` | No | Grouped. What was accomplished in this period, as bullets under `###` headings that name achievement kinds |
```

Then find:

```
`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a register entry, a recording, a certificate, a product |
| `URL` | Yes | string | Where it is |
```

and replace with:

```
`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a register entry, a recording, a certificate, a product |
| `URL` | Yes | string | Where it is |

`## Achievements` is grouped under these headings:

| Heading | Required | Type | Description |
| --- | --- | --- | --- |
| `Kind` | No | ref → achievement-kind | The kind every bullet below it is chiefly evidence of |
```

- [ ] **Step 6: Run it, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
```

Expected: exit 1, with exactly one failure from "schema fixed shape":

```
core/experience-schema.md: a table under "## Sections" has no caption; a column table is introduced by "`## <Section>` is a table with these columns:"
```

That is the column-table loop failing every captioned block that is not a column table, which is what this task removes. If a `TypeError` appears instead, Task 2 was not applied.

- [ ] **Step 7: Implement — R9 in `verify/check.mjs`**

Find:

```js
        const blocks = blocksOf(s.get("Sections") ?? "");
        const [sections, ...columnTables] = blocks;
        if (!blocks.length) fail(`${path}: "## Sections" has no table`);
        else if (!sections.table) fail(`${path}: the first block under "## Sections" is not a table`);
        else if (sections.section)
          fail(
            `${path}: the sections table is captioned "\`## ${sections.section}\` is a table with these columns:"; that caption introduces a column table, and the sections table comes first`,
          );
```

and replace with:

```js
        const blocks = blocksOf(s.get("Sections") ?? "");
        const [sections, ...captioned] = blocks;
        if (!blocks.length) fail(`${path}: "## Sections" has no table`);
        else if (!sections.table) fail(`${path}: the first block under "## Sections" is not a table`);
        else if (sections.section)
          fail(
            `${path}: the sections table is captioned "\`## ${sections.section}\` is a table with these columns:"; that caption introduces a column table, and the sections table comes first`,
          );
        else if (sections.grouped)
          fail(
            `${path}: the sections table is captioned "\`## ${sections.grouped}\` is grouped under these headings:"; that caption introduces a heading table, and the sections table comes first`,
          );
```

Then find:

```js
        // A row declares itself table-valued by starting its Description with "Table." —
        // one fixed token, not prose about what the section contains. R9 states it, so a
        // schema cannot leave the column table implicit and nothing notice.
        const tableValued = new Set();
        for (const row of sections?.table?.rows ?? []) {
          if (!/^Table\./.test((row[2] ?? "").trim())) continue;
          const named = (row[0] ?? "").replace(/`/g, "").trim().match(/^##\s+(.+)$/)?.[1];
          if (!named)
            fail(`${path}: "${row[0]}" says "Table." but is not a "## " section, so it holds no table`);
          else tableValued.add(named);
        }
```

and replace with:

```js
        // A row declares itself table-valued by starting its Description with "Table." —
        // one fixed token, not prose about what the section contains. R9 states it, so a
        // schema cannot leave the column table implicit and nothing notice. "Grouped." is the
        // second such token and is read the same way: it says the section's content sits under
        // `###` headings that name entities, and that a heading table follows.
        const tableValued = new Set();
        const groupedSections = new Set();
        for (const row of sections?.table?.rows ?? []) {
          const token = (row[2] ?? "").trim().match(/^(Table|Grouped)\./)?.[1];
          if (!token) continue;
          const named = (row[0] ?? "").replace(/`/g, "").trim().match(/^##\s+(.+)$/)?.[1];
          if (!named)
            fail(`${path}: "${row[0]}" says "${token}." but is not a "## " section, so it holds no ${token === "Table" ? "table" : "headings"}`);
          else if (token === "Table") tableValued.add(named);
          else groupedSections.add(named);
        }
```

Then find:

```js
        const declared = new Set();
        for (const block of columnTables) {
          if (!block.section) {
```

and replace with:

```js
        const declared = new Set();
        const headingDeclared = new Set();
        for (const block of captioned) {
          // A heading table is the other half of a "Grouped." row, checked against it in both
          // directions exactly as a column table is checked against "Table.". One row, because
          // every `###` heading in the section names the same type, and `ref → <type>` because
          // a heading names one entity — there is no cell for a list and none for a qualifier,
          // since a heading has no row of its own to qualify.
          if (block.grouped) {
            const where = `the heading table for "## ${block.grouped}"`;
            if (!groupedSections.has(block.grouped))
              fail(
                `${path}: ${where} declares headings, but the sections table does not mark "## ${block.grouped}" grouped — its Description must begin "Grouped."`,
              );
            if (headingDeclared.has(block.grouped)) fail(`${path}: "## ${block.grouped}" has two heading tables`);
            headingDeclared.add(block.grouped);
            if (!block.table) fail(`${path}: ${where} is not a table`);
            else if (block.table.columns.join("|") !== "Heading|Required|Type|Description")
              fail(
                `${path}: ${where} has columns ${block.table.columns.join("|")}; must be Heading|Required|Type|Description`,
              );
            else if (block.table.rows.length !== 1)
              fail(
                `${path}: ${where} declares ${block.table.rows.length} headings; R9 gives a grouped section one, because every heading in it names the same type`,
              );
            else {
              requiredYesNo(block.table, where);
              const cell = (block.table.rows[0][2] ?? "").replace(/`/g, "").trim();
              if (!/^ref → \S/.test(cell))
                fail(
                  `${path}: ${block.table.rows[0][0]} in ${where} is typed "${cell}"; a heading names one entity, so a heading's type is \`ref → <type>\``,
                );
            }
            continue;
          }
          if (!block.section) {
```

Then find, at the end of that block's loop:

```js
        for (const named of tableValued)
          if (!declared.has(named))
            fail(
              `${path}: "## ${named}" is marked table-valued, but no table under "## Sections" is captioned "\`## ${named}\` is a table with these columns:"`,
            );
```

and replace with:

```js
        for (const named of tableValued)
          if (!declared.has(named))
            fail(
              `${path}: "## ${named}" is marked table-valued, but no table under "## Sections" is captioned "\`## ${named}\` is a table with these columns:"`,
            );
        for (const named of groupedSections)
          if (!headingDeclared.has(named))
            fail(
              `${path}: "## ${named}" is marked grouped, but no table under "## Sections" is captioned "\`## ${named}\` is grouped under these headings:"`,
            );
```

- [ ] **Step 8: Implement — the type vocabulary check reads the heading table too**

Find:

```js
        const s = sectionsOf(text);
        const typed = [
          tableOf((s.get("Frontmatter") ?? "").trim()),
          ...blocksOf(s.get("Sections") ?? "").filter((b) => b.section).map((b) => b.table),
        ];
```

and replace with:

```js
        const s = sectionsOf(text);
        const typed = [
          tableOf((s.get("Frontmatter") ?? "").trim()),
          ...blocksOf(s.get("Sections") ?? "")
            .filter((b) => b.section || b.grouped)
            .map((b) => b.table),
        ];
```

and extend the comment above it. Find:

```js
        // A column table is the captioned block, and the sections table — which has no Type
        // column — is the uncaptioned one. Selecting by caption says that; dropping the first
        // block instead only worked because another check happens to enforce that the
        // sections table comes first, which is the coupling the caption exists to remove.
```

and replace with:

```js
        // A column table is the captioned block, and the sections table — which has no Type
        // column — is the uncaptioned one. Selecting by caption says that; dropping the first
        // block instead only worked because another check happens to enforce that the
        // sections table comes first, which is the coupling the caption exists to remove.
        //
        // A grouped section's heading table carries a Type cell like any other declaration, so
        // it is read here with them: the type a heading points at is held to the vocabulary and
        // to the list of types, or a schema could group a section under a type nobody defines.
```

- [ ] **Step 9: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
```

Expected: all exit 0. `core/experience-schema.md` now declares a grouped section, the example's flat achievement lists are still legal — the section is optional and the example holds no kinds — and the parser draws no heading edges because no example file has a `###` heading there.

- [ ] **Step 10: Probe both mismatches, then restore**

`verify/check.mjs` has no fixtures: it asserts over this repository's own files, so the two mismatch errors are proved by breaking the schema and putting it back.

```bash
cd /Users/rob/git/companygraph/meta-model
cp core/experience-schema.md "${TMPDIR:-/tmp}/experience-schema.md.bak"

# 1. Grouped., with the heading table taken away.
perl -0pi -e 's/\n`## Achievements` is grouped under these headings:\n\n\| Heading \| Required \| Type \| Description \|\n\| --- \| --- \| --- \| --- \|\n\| `Kind` \| No \| ref → achievement-kind \| The kind every bullet below it is chiefly evidence of \|\n//' core/experience-schema.md
npm run verify; echo "exit: $?"
cp "${TMPDIR:-/tmp}/experience-schema.md.bak" core/experience-schema.md

# 2. The heading table, with the Grouped. token taken away.
perl -0pi -e 's/\| `## Achievements` \| No \| Grouped\. What/| `## Achievements` | No | What/' core/experience-schema.md
npm run verify; echo "exit: $?"
cp "${TMPDIR:-/tmp}/experience-schema.md.bak" core/experience-schema.md
npm run verify; echo "exit: $?"
```

Expected: the first run fails with `"## Achievements" is marked grouped, but no table under "## Sections" is captioned ...`; the second fails with `the heading table for "## Achievements" declares headings, but the sections table does not mark "## Achievements" grouped — its Description must begin "Grouped."`; the third exits 0 with the file restored. Confirm with `git diff --stat core/experience-schema.md` that only the intended lines differ.

- [ ] **Step 11: Implement — R9 and R16 in `core/CONVENTIONS.md`**

In R9, find:

```
section — `` `## Skills` is a table with these columns: `` — and the caption, not the
position, is what says which section the columns belong to. The sections table is then free
to list its rows in whatever order reads best. A section marked `Table.` with no column
table, and a column table for a section not marked `Table.`, are both errors: each half
means nothing without the other.
```

and replace with:

```
section — `` `## Skills` is a table with these columns: `` — and the caption, not the
position, is what says which section the columns belong to. The sections table is then free
to list its rows in whatever order reads best. A section marked `Table.` with no column
table, and a column table for a section not marked `Table.`, are both errors: each half
means nothing without the other.

A section whose content is grouped under `###` headings that name entities declares that the
same way: its Description begins with `Grouped.`, and a table naming what those headings
reference follows, with columns `Heading | Required | Type | Description` and one row. It is
introduced by a caption line naming its section — `` `## Achievements` is grouped under these
headings: `` — which is what tells it from a column table, since both open by naming a
section. The row's Type is `ref → <type>`, the one type every heading in the section names,
and `Heading` names the reference, which is what the edge is called. One row, because a
heading that named a second type would be a second section. A section marked `Grouped.` with
no heading table, and a heading table for a section not marked `Grouped.`, are both errors, as
with `Table.`.
```

In R16, find:

```
anything else, a field draws no edge and its value resolves to nothing — and typed `number`,
it is written as digits.
```

and replace with:

```
anything else, a field draws no edge and its value resolves to nothing — and typed `number`,
it is written as digits.

A heading declared `ref → <type>` draws an edge from the page to the entity each `###` heading
in that section names, via `<Section>.<Heading>`, and a heading that names nothing of its type
is R4.
```

- [ ] **Step 12: Implement — the four writing rules in `core/experience-schema.md`**

Find:

```
- An `## Achievements` bullet states an outcome, one idea each. "Responsible for the platform"
  is a job description; "held platform cost flat as volume grew to 89M events a year" is an
  achievement. Where a number, a system or a named result exists, it goes in the bullet.
```

and replace with:

```
- An `## Achievements` bullet states an outcome, one idea each. "Responsible for the platform"
  is a job description; "held platform cost flat as volume grew to 89M events a year" is an
  achievement. Where a number, a system or a named result exists, it goes in the bullet.
- Where an instance defines achievement kinds, every entry with achievements groups them: each
  bullet sits under the heading of the one kind it is chiefly evidence of, headings follow the
  kinds' `rank`, and a kind with nothing in the entry has no heading. An instance that defines
  none writes a flat list.
- Every entry with achievements carries the headings, even one bullet under one heading, so a
  reader finds a kind in the same place in every entry.
- Within a kind the broadest claim comes first, peers follow the order they happened in, and a
  bullet that points back comes directly after what it points to — or names it, where the
  grouping would part them.
- A list of tools or a stack is not an achievement: what was built with a tool says so in the
  bullet that built it.
```

- [ ] **Step 13: Run everything, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. `test:rules` stays green because the rules cited in `lib/` are still R2, R4, R5, R6, R7, R9, R11, R13 and R16, all of which `core/CONVENTIONS.md` defines under a `### R<n> —` heading.

- [ ] **Step 14: Commit**

```bash
git add core/CONVENTIONS.md core/experience-schema.md lib/checks.mjs verify/check.mjs verify/instance-checks.test.mjs
git commit -m "$(cat <<'MSG'
A schema can declare a section grouped under headings

A `###` heading that names an entity had no declaration of the same standing as a field or a
column, so R4 was not true of it and a schema could not say what its headings point at. R9 gains
a third declared shape: a section marked `Grouped.` carries a heading table naming the one type
its headings reference, told from a column table by its caption rather than by its position.

The suite holds both halves against each other, as it does for `Table.`, and the type vocabulary
check now reads a heading's Type cell with the others. An experience's achievements are the
first section to declare it, and its writing rules say what grouping an entry means.

Verified: npm run verify, npm run test:instance, npm run test:instance-checks, npm run
test:rules and sh conventions/conventions-check all pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 4: The two instance checks

**Files:**

- Modify: `lib/checks.mjs` (a `groupedOf`, `headingsIn` and `targetOf` helper beside `fieldsOf`, lines 286–294; one addition inside the "the instance is held to what the schemas declare" walk, after the column-table loop that ends at line 568; two new check objects after it)
- Test: `verify/instance-checks.test.mjs` (the fixture `schema` helper at lines 14–36, and five new tests)

**Interfaces:**

- Consumes: `blocksOf(body)` with `grouped` (Task 3); `sectionsOf`, `tableOf`, `fieldsOf`, `frontmatterOf`, `fmScalar`, `walkMd`, `typeOfFile`, `fail`, all already in `lib/checks.mjs`.
- Produces: `groupedOf(type)` → `[{ section, heading, declared }]`, read from the vendored core's schema.
- Produces: `headingsIn(body)` → `string[]`, the `###` headings of one section's text in document order.
- Produces: `targetOf(declared)` → `string | null`, the type a `ref`/`ref?` declaration points at.
- Produces: two checks, `"grouped headings follow the rank of what they name"` and `"a grouped section's bullets stand under its headings"`, both citing `R16`, both returned from `instanceChecks` so `verify/check.mjs` and `bin/check-instance.mjs` run them without changing either file.

**How the order field is known:** there is no generic "order field" in the vocabulary, so the check keys on the heading's target type declaring a frontmatter field named `rank` typed `number` — which is how `proficiency-level` and now `achievement-kind` both state an order. A grouped section pointing at a type with no `rank` has no order to check and is passed over. Nothing is hardcoded to `achievement-kind`.

**One addition beyond spec §5's two checks:** the R16 check also holds a `### ` heading to its declared type, so the shipped checker reports an unresolvable heading as the R4 the parser throws on. Without it the two readers of an instance disagree: `parseInstance` refuses the file and `bin/check-instance.mjs` reports green. It is three lines inside an existing walk; if the Owner would rather ship spec §5 exactly, drop Step 4 and its test.

- [ ] **Step 1: Write the failing tests**

In `verify/instance-checks.test.mjs`, find:

```js
// A schema in the fixed shape R9 states, with only the rows a case needs.
const schema = (type, rows, { owner = null } = {}) =>
  [
    `# ${type[0].toUpperCase()}${type.slice(1)} Schema`,
    "",
    `> A ${type}.`,
    "",
    ...(owner ? [`**Owner:** ${owner}`, ""] : []),
    "## File Location",
    "",
    `\`${type}s/\``,
    "",
    "## Frontmatter",
    "",
    "| Field | Required | Type | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Sections",
    "",
    "| Section | Required | Description |",
    "| --- | --- | --- |",
    "",
  ].join("\n");
```

and replace with:

```js
// A schema in the fixed shape R9 states, with only the rows a case needs. `grouped` adds R9's
// third declared shape: a section marked "Grouped." and the heading table that says what its
// `###` headings name.
const schema = (type, rows, { owner = null, grouped = null } = {}) =>
  [
    `# ${type[0].toUpperCase()}${type.slice(1)} Schema`,
    "",
    `> A ${type}.`,
    "",
    ...(owner ? [`**Owner:** ${owner}`, ""] : []),
    "## File Location",
    "",
    `\`${type}s/\``,
    "",
    "## Frontmatter",
    "",
    "| Field | Required | Type | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Sections",
    "",
    "| Section | Required | Description |",
    "| --- | --- | --- |",
    ...(grouped
      ? [
          `| \`## ${grouped.section}\` | No | Grouped. What was accomplished. |`,
          "",
          `\`## ${grouped.section}\` is grouped under these headings:`,
          "",
          "| Heading | Required | Type | Description |",
          "| --- | --- | --- | --- |",
          `| \`${grouped.heading}\` | No | ${grouped.type} | The kind. |`,
        ]
      : []),
    "",
  ].join("\n");
```

Then append at the end of the file:

```js
// The grouped section, from the checks' side. The parser refuses a heading that resolves to
// nothing; what a check can add is the order the headings take and whether any bullet stands
// outside them, which is the half of the schema's writing rules a machine can read. Whether a
// bullet sits under the right kind is a reading, and stays the agent pass's.
const GROUPED_EXPERIENCE_SCHEMA = schema("experience", [], {
  owner: "profile",
  grouped: { section: "Achievements", heading: "Kind", type: "ref → achievement-kind" },
});

const ACHIEVEMENT_KIND_SCHEMA = schema("achievement-kind", [
  "| `rank` | Yes | number | Position within an entry. |",
]);

const KIND_FILES = [
  ["model/achievement-kinds/delivery.md", "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n"],
  ["model/achievement-kinds/results.md", "---\nrank: 40\n---\n\n# Results\n\n> What came of it.\n"],
];

test("headings out of rank order are a failure naming both of them", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Results\n\n- What came of it.\n\n### Delivery\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /Delivery/);
  assert.match(hit, /Results/);
  assert.match(hit, /rank/);
});

test("headings in rank order are not a failure", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Delivery\n\n- What was built.\n\n### Results\n\n- What came of it.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("Achievements")), []);
});

test("a bullet before the first heading is a failure where the instance holds a kind", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- A bullet outside every heading.\n\n### Delivery\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /bullet/);
});

// An instance that defines no kinds writes a flat list, and the schema says so: `Required` is
// `No` precisely because the headings exist only where the kinds do.
test("a flat list is not a failure where the instance defines no kinds", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- One bullet.\n- Another.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("Achievements")), []);
});

// R16 makes a heading a declared reference, so the checker says what the parser throws on
// rather than reporting green over a file the parser refuses to read.
test("a heading that names nothing of its type is a failure naming the type", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Deliverly\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Deliverly"));
  assert.ok(hit, `no failure named the heading; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /achievement-kind/);
  assert.match(hit, /R16/);
});
```

- [ ] **Step 2: Run them, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance-checks; echo "exit: $?"
```

Expected: exit 1, with three failing tests — the out-of-order case, the bullet case and the unresolvable-heading case all report `no failure named the entry` / `no failure named the heading`, because no check reads a heading yet. The two "not a failure" tests pass already, vacuously; they are there so the next step cannot be written as "fail on everything".

- [ ] **Step 3: Implement — the three helpers in `lib/checks.mjs`**

Find:

```js
  // The frontmatter fields a schema declares, as name, whether it is required and what it is
  // declared, in table order — read from the core the caller supplied and from no other.
  const fieldsOf = (type) => {
```

and insert directly above it:

```js
  // What a schema declares grouped: the section, the name its heading table gives the
  // reference, and how that reference is typed. Addressed by the caption R9 fixes for it, so
  // no section is named in this file — a schema says which of its sections are grouped, and
  // these checks read whatever it says. "schema fixed shape" has already failed a heading
  // table with the wrong columns or with no row, so what reaches here can be read by position
  // the way `fieldsOf` reads the frontmatter table.
  const groupedOf = (type) =>
    blocksOf(sectionsOf(read(`${core}/${type}-schema.md`) ?? "").get("Sections") ?? "")
      .filter((b) => b.grouped && b.table?.rows.length)
      .map((b) => ({
        section: b.grouped,
        heading: b.table.rows[0][0].replace(/`/g, "").trim(),
        declared: (b.table.rows[0][2] ?? "").replace(/`/g, "").trim(),
      }));

  // The `###` headings of one section's text, in document order. `sectionsOf` splits on "## "
  // alone, so a section keeps its own headings and a `####` below one is not mistaken for one.
  const headingsIn = (body) =>
    (body ?? "")
      .split("\n")
      .map((l) => l.match(/^###\s+(.+?)\s*$/)?.[1])
      .filter(Boolean);

  // The type a declared reference points at, for the two checks below. `ref?` is read like
  // `ref` here: what they differ about is whether a value must resolve, and neither check asks
  // that question — the R16 check above does.
  const targetOf = (declared) => declared.match(/^ref\?? → (.+)$/)?.[1] ?? null;

  // The frontmatter fields a schema declares, as name, whether it is required and what it is
  // declared, in table order — read from the core the caller supplied and from no other.
  const fieldsOf = (type) => {
```

- [ ] **Step 4: Implement — hold a heading to its declared type**

In the check named `"the instance is held to what the schemas declare"`, find:

```js
          for (const row of table.rows)
            columns.forEach((col, n) => {
              const cell = (row[n] ?? "").trim();
              if (!cell) {
                if (col.required) fail(`${child}: a "## ${section}" row has no ${col.name.toLowerCase()}`);
                return;
              }
              held(child, `\`${col.name}\` in "## ${section}"`, col.declared, cell);
            });
        }
      });
```

and replace with:

```js
          for (const row of table.rows)
            columns.forEach((col, n) => {
              const cell = (row[n] ?? "").trim();
              if (!cell) {
                if (col.required) fail(`${child}: a "## ${section}" row has no ${col.name.toLowerCase()}`);
                return;
              }
              held(child, `\`${col.name}\` in "## ${section}"`, col.declared, cell);
            });
        }

        // A heading in a grouped section is a declared reference like a cell (R9, R16), so it
        // is held on the same terms. The parser throws R4 on one that names nothing; without
        // this the checker would report green over a file the parser refuses to read.
        for (const { section, declared } of groupedOf(type))
          for (const name of headingsIn(sections.get(section)))
            held(child, `\`### ${name}\` in "## ${section}"`, declared, name);
      });
```

- [ ] **Step 5: Implement — the two checks**

Immediately after the closing `},` of the `"the instance is held to what the schemas declare"` check object — that is, directly before the line `  {` that opens `name: "frontmatter fields are declared"` — insert:

```js
  {
    // R16, and the one part of a schema's grouping rules a machine can read. An instance that
    // orders its kinds says so in a `rank`, and an entry whose headings run against that order
    // makes a reader look in a different place in every entry, which is the whole reason the
    // headings exist. Which kind a bullet belongs under is a reading and stays the agent pass's.
    //
    // There is no general "order field" in the vocabulary, so this keys on the heading's target
    // type declaring one named `rank` — how `proficiency-level` and `achievement-kind` both
    // state an order. A grouped section pointing at a type with no `rank` has no order to hold
    // it to and is passed over, rather than this file naming a type of its own.
    name: "grouped headings follow the rank of what they name",
    rule: "R16",
    run() {
      const ranked = new Map();
      const ranksOf = (type) => {
        if (!ranked.has(type)) {
          const byName = new Map();
          walkMd(EX, (child, text) => {
            if (typeOfFile(child) !== type) return;
            const name = text.match(/^#\s+(.+?)\s*$/m)?.[1];
            const rank = fmScalar(frontmatterOf(text), "rank");
            if (name && rank !== null && /^-?\d+$/.test(rank)) byName.set(name, Number(rank));
          });
          ranked.set(type, byName);
        }
        return ranked.get(type);
      };

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const sections = sectionsOf(text);
        for (const { section, declared } of groupedOf(type)) {
          const target = targetOf(declared);
          if (!target || !fieldsOf(target).some((f) => f.field === "rank")) continue;
          const byName = ranksOf(target);
          let prev = null;
          for (const name of headingsIn(sections.get(section))) {
            // A heading naming nothing has no rank to compare; that it names nothing is the
            // R16 check's finding, and reporting it twice would be one defect under two names.
            if (!byName.has(name)) continue;
            if (prev !== null && byName.get(name) <= byName.get(prev))
              fail(
                `${child}: "## ${section}" puts "### ${name}" (rank ${byName.get(name)}) after "### ${prev}" (rank ${byName.get(prev)}); headings follow the rank of the ${target} they name`,
              );
            prev = name;
          }
        }
      });
    },
  },
  {
    // R16. A bullet standing before the first heading belongs to no kind, and a reader looking
    // for one kind cannot tell that from a kind the entry has nothing under. Only where the
    // instance holds an entity of the heading's type: an instance that defines none writes a
    // flat list, which is why the section's heading table is `Required: No`.
    name: "a grouped section's bullets stand under its headings",
    rule: "R16",
    run() {
      const holds = new Map();
      const instanceHolds = (type) => {
        if (!holds.has(type)) {
          let any = false;
          walkMd(EX, (child) => {
            if (typeOfFile(child) === type) any = true;
          });
          holds.set(type, any);
        }
        return holds.get(type);
      };

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const sections = sectionsOf(text);
        for (const { section, declared } of groupedOf(type)) {
          const body = sections.get(section);
          if (body === undefined) continue;
          const target = targetOf(declared);
          if (!target || !instanceHolds(target)) continue;
          for (const line of body.split("\n")) {
            if (/^###\s+\S/.test(line)) break;
            if (!/^\s*[-*]\s+\S/.test(line)) continue;
            fail(
              `${child}: "## ${section}" has a bullet before its first \`###\` heading; where the instance holds a ${target}, every bullet stands under the heading of one`,
            );
            break;
          }
        }
      });
    },
  },
```

- [ ] **Step 6: Run them, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run test:instance-checks; echo "exit: $?"
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. `verify` is still green over the example: it holds no `achievement-kind` yet, so both checks pass over it without reading a heading. `test:rules` stays green because both new checks cite R16, which `core/CONVENTIONS.md` defines.

- [ ] **Step 7: Commit**

```bash
git add lib/checks.mjs verify/instance-checks.test.mjs
git commit -m "$(cat <<'MSG'
An instance is held to the order its grouped headings take

Grouping achievements is worth nothing if the groups arrive in a different order in every entry,
and a bullet standing before the first heading belongs to no group at all. Both are visible
without reading a word of the bullet, so both are checks rather than rules an agent enforces.

The order comes from the heading's own target type: where that type declares a `rank`, the
headings ascend by it, and where it declares none there is no order to hold. Neither check names
a type of its own, so a schema that groups some other section is held the same way. Whether a
bullet sits under the right kind is a reading, and stays the agent pass's.

Verified: npm run test:instance-checks, npm run verify, npm run test:instance, npm run
test:rules and sh conventions/conventions-check all pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 5: The example instance defines its own kinds and groups its entries

**Files:**

- Create: `example/model/achievement-kinds/decisions.md`, `delivery.md`, `sharing.md`, `results.md`
- Modify: `example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`, `2022-beacon-systems.md`
- Modify: `example/model/profiles/tomas-reyes/experiences/2019-northwind-atelier.md`, `2021-orbit-conference.md`, `2022-beacon-systems.md`
- Modify: `example/model/README.md` (the type sentence at lines 9–12, the tree's `experience-kinds/` line)
- Test: `npm run verify` — the two checks from Task 4, over the example tree, are this task's test

**Interfaces:**

- Consumes: `core/achievement-kind-schema.md` (Task 1), the grouped declaration in `core/experience-schema.md` (Task 3), both checks (Task 4).
- Produces: eight `Achievements.Kind` edges in the example graph, drawn by `parseInstance`.

- [ ] **Step 1: Write the failing test — the kinds, before the entries are grouped**

Create `example/model/achievement-kinds/decisions.md`:

```markdown
---
source: Local
rank: 10
---

# Decisions

> A call that set what the work would be — what to build, in what order and what to stop.

## What it means

An achievement whose claim is the choice itself: a ranking agreed, a roadmap rewritten, a
feature retired, a direction someone had to be talked into. What makes it this kind is that
somebody else could have carried it out once the call was made.

Carrying it out is Delivery, even where the same person did both, and what came of it is
Results. A bullet that decided and built in one sentence is filed by whichever half the entry
would be poorer without.
```

Create `example/model/achievement-kinds/delivery.md`:

```markdown
---
source: Local
rank: 20
---

# Delivery

> Something built, changed or taken apart, and in the hands of the people it was for.

## What it means

An achievement whose claim is the work done: a system replaced, a service split, a migration
run, a process put in place. It names what changed and who has it now.

Choosing what to build is Decisions. What the change turned out to be worth — a measured
effect, a finding, an outcome still owed — is Results, and it goes there even where one
sentence could carry both.
```

Create `example/model/achievement-kinds/sharing.md`:

```markdown
---
source: Local
rank: 30
---

# Sharing

> What was learned, handed to people outside the work — a talk, a written case, a session
> taught.

## What it means

An achievement whose claim is that people outside the work now know something: a conference
talk, a published case, a workshop for another team. The audience is the point of the bullet
and the bullet names it.

Explaining a decision to the people who had to accept it is part of Decisions, not this. A
talk about work done elsewhere is this kind even when the entry exists only for the talk.
```

Create `example/model/achievement-kinds/results.md`:

```markdown
---
source: Local
rank: 40
---

# Results

> What came of the work — an effect measured, a finding established or an outcome still owed.

## What it means

An achievement whose claim is the consequence rather than the act: what changed because the
work was done, what it turned out to show, and what it has not delivered yet. An entry's honest
unfinished business is this kind, because it is an outcome like any other.

The work that produced the result is Delivery, and the call that aimed it is Decisions. The
result is filed apart from both, so a reader looking for what came of a period finds it in the
same place in every entry.
```

- [ ] **Step 2: Run it, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
```

Expected: exit 1 with five failures, one per entry that has achievements, all reading ``"## Achievements" has a bullet before its first `###` heading; where the instance holds a achievement-kind, every bullet stands under the heading of one``:

- `example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`
- `example/model/profiles/mira-halvorsen/experiences/2022-beacon-systems.md`
- `example/model/profiles/tomas-reyes/experiences/2019-northwind-atelier.md`
- `example/model/profiles/tomas-reyes/experiences/2021-orbit-conference.md`
- `example/model/profiles/tomas-reyes/experiences/2022-beacon-systems.md`

If fewer than five appear, a file's achievements were already grouped or the check is not reaching the tree; stop and report.

- [ ] **Step 3: Implement — group Mira's two entries**

In `example/model/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`, find:

```
## Achievements

- Replaced a nightly batch with a pipeline that ran when the order did, taking visibility from
  the next morning to seconds.
- Established that the speed-up mattered less than anyone expected, and why — which set the
  direction for the work that followed.
```

and replace with:

```
## Achievements

### Delivery

- Replaced a nightly batch with a pipeline that ran when the order did, taking visibility from
  the next morning to seconds.

### Results

- Established that the speed-up mattered less than anyone expected, and why — which set the
  direction for the work that followed.
```

In `example/model/profiles/mira-halvorsen/experiences/2022-beacon-systems.md`, find:

```
## Achievements

- Split one service that three teams edited into two that one team each owns, so the second
  team stopped waiting on the first to merge.
- Not finished: the third team is still waiting.
```

and replace with:

```
## Achievements

### Delivery

- Split one service that three teams edited into two that one team each owns, so the second
  team stopped waiting on the first to merge.

### Results

- Not finished: the third team is still waiting on the split.
```

- [ ] **Step 4: Implement — group Tomas's three entries**

In `example/model/profiles/tomas-reyes/experiences/2019-northwind-atelier.md`, find:

```
## Achievements

- Ran the conversations that showed visibility, not speed, was what the pipeline rebuild
  bought — and rewrote the roadmap around it.
- Retired a reporting feature with no users, which was harder than shipping one.
```

and replace with:

```
## Achievements

### Decisions

- Ran the conversations that showed visibility, not speed, was what the pipeline rebuild
  bought — and rewrote the roadmap around it.
- Retired a reporting feature with no users, which was harder than shipping one.
```

In `example/model/profiles/tomas-reyes/experiences/2021-orbit-conference.md`, find:

```
## Achievements

- Told a room that had funded the same kind of rebuild what the Northwind conversations
  found: that visibility, not speed, was what the pipeline bought.
```

and replace with:

```
## Achievements

### Sharing

- Told a room that had funded the same kind of rebuild what the Northwind conversations
  found: that visibility, not speed, was what the pipeline bought.
```

In `example/model/profiles/tomas-reyes/experiences/2022-beacon-systems.md`, find:

```
## Achievements

- Ranked the two contexts by what customers asked about in support, not by what was easier to
  split, and got the order accepted.
- Not finished: the third team's context has no customer voice yet, and no ranking.
```

and replace with:

```
## Achievements

### Decisions

- Ranked the two contexts by what customers asked about in support, not by what was easier to
  split, and got the order accepted.

### Results

- Not finished: the third team's context has no customer voice yet, and no ranking.
```

- [ ] **Step 5: Implement — the example's own README**

Find:

```
It uses fifteen core types — `identity`, `vision`, `profile`, `experience`, `experience-kind`,
`skill`, `proficiency-level`, `value`, `source`, `surface`, `strategic-objective`, `strategy`,
`role`, `process`, `phase` — and declares no packs. That is what core ships, not a claim that
fifteen types describe a company.
```

and replace with:

```
It uses every core type — `identity`, `vision`, `profile`, `experience`, `experience-kind`,
`achievement-kind`, `skill`, `proficiency-level`, `value`, `source`, `surface`,
`strategic-objective`, `strategy`, `role`, `process`, `phase` — and declares no packs. That is
what core ships, not a claim that these types describe a company.
```

Then find:

```
experience-kinds/                community.md, education.md, project.md, role.md
```

and replace with:

```
experience-kinds/                community.md, education.md, project.md, role.md
achievement-kinds/               decisions.md, delivery.md, sharing.md, results.md
```

- [ ] **Step 6: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0.

Then confirm the edges the example now draws:

```bash
node --input-type=module -e '
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { parseInstance } from "./lib/instance.mjs";
const walk = (dir, into, strip) => {
  for (const e of readdirSync(dir)) {
    const p = `${dir}/${e}`;
    if (statSync(p).isDirectory()) walk(p, into, strip);
    else if (p.endsWith(".md")) into.set(p.slice(strip), readFileSync(p, "utf8"));
  }
  return into;
};
const files = walk("example/model", new Map(), "example/model/".length);
const schemas = new Map();
for (const f of readdirSync("core")) if (f.endsWith("-schema.md")) schemas.set(f, readFileSync(`core/${f}`, "utf8"));
const { edges } = parseInstance(files, { sub: "example/model/", schemas });
const kind = edges.filter((e) => e.via === "Achievements.Kind");
console.log(kind.map((e) => `${e.from} → ${e.to}`).join("\n"));
assert.equal(kind.length, 8);
console.log("8 Achievements.Kind edges");
'; echo "exit: $?"
```

Expected: exit 0 and eight edges — Mira's Northwind entry to Delivery and Results, her Beacon entry to Delivery and Results, Tomas's Northwind entry to Decisions, his Orbit entry to Sharing, his Beacon entry to Decisions and Results. Tomas's Northwind entry has two bullets under one heading and so draws one edge, which is the shape to expect.

- [ ] **Step 7: Commit**

```bash
git add example/model/achievement-kinds example/model/profiles example/model/README.md
git commit -m "$(cat <<'MSG'
The example defines four achievement kinds and groups by them

An instance's kinds are its own, so the example needs a set that is visibly not anybody else's:
Decisions, Delivery, Sharing and Results, drawn from what its five entries actually claim and
ranked in tens. A reader comparing two entries now finds what was decided in the same place in
both, and what came of it last in both.

Every entry with achievements carries headings, including the one with a single bullet, because
a reader looking for a kind has to be able to tell "nothing here" from "somewhere else in this
entry".

Verified: npm run verify, npm run test:instance, npm run test:instance-checks, npm run
test:rules and sh conventions/conventions-check all pass, and the example draws eight
Achievements.Kind edges.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

---

## Task 6: Release preparation for 0.28.0, without tagging

**Files:**

- Modify: `package.json` (line 3, `"version": "0.27.0"`)
- Modify: `core/manifest.json` (the whole file, one line)
- Modify: `.github/workflows/instance-check.yml` (line 6 and line 37, both `v0.27.0`)
- Test: `npm run verify` — the "release manifest" check reads both versions and any `v*` tag on HEAD

**Interfaces:**

- Consumes: nothing new.
- Produces: the release number `0.28.0` and `shape` `3`, which the reference instance's `.companygraph/manifest.json` and its workflow pin take next.

**On `shape`:** `shape` is the version of the R9 fixed shape and the closed type vocabulary, and this release adds a third declared shape to R9. Precedent is 0.15.0, where adding `ref? → <type>` to the vocabulary moved `shape` from 1 to 2 while the release stayed a minor, on the argument that a reader built for the older shape would otherwise accept a core carrying a form it cannot read — and here that is literal: a parser at 0.27.0 handed a 0.28.0 `core/` crashes in `parseSchemas` on the heading table. So `shape` moves to 3 and the release stays a minor, 0.28.0. If the Owner decides otherwise, the only change is the one digit in `core/manifest.json`.

- [ ] **Step 1: Write the failing test — move `core/manifest.json` first**

Replace the whole of `core/manifest.json`:

```json
{ "version": "0.28.0", "shape": 3 }
```

- [ ] **Step 2: Run it, and state the expected failure**

```bash
cd /Users/rob/git/companygraph/meta-model
npm run verify; echo "exit: $?"
```

Expected: exit 1 with `core/manifest.json says 0.28.0, ahead of package.json's 0.27.0; core is released with the package or behind it, never before it`. That is the release contract asserting itself, and it is this task's red.

- [ ] **Step 3: Implement — the package and the workflow**

In `package.json`, find:

```json
  "version": "0.27.0",
```

and replace with:

```json
  "version": "0.28.0",
```

In `.github/workflows/instance-check.yml`, find:

```
#       uses: companygraph/meta-model/.github/workflows/instance-check.yml@v0.27.0
```

and replace with:

```
#       uses: companygraph/meta-model/.github/workflows/instance-check.yml@v0.28.0
```

Then find:

```
          ref: v0.27.0
```

and replace with:

```
          ref: v0.28.0
```

`AGENTS.md` says this ref and `version` in `package.json` are set to the release together before tagging, which is why all three move in one commit.

- [ ] **Step 4: Run it, and state the expected pass**

```bash
cd /Users/rob/git/companygraph/meta-model
grep -rn "0\.27\.0\|0\.28\.0" package.json core/manifest.json .github/workflows/instance-check.yml
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: four lines, all `0.28.0`; all five commands exit 0. No `v*` tag is created — `git tag --points-at HEAD` stays empty and the release-manifest check passes on that.

- [ ] **Step 5: Commit**

```bash
git add package.json core/manifest.json .github/workflows/instance-check.yml
git commit -m "$(cat <<'MSG'
Core 0.28.0, where an entry's achievements can be grouped

An instance may now define achievement kinds and, where it does, every entry with achievements
groups its bullets under headings naming them. An instance that defines none is unaffected: the
section stays optional and a flat list stays legal.

`shape` moves to 3 with it. R9 gained a declared shape, and a reader built against shape 2 does
not know the heading table's caption — the same argument that moved it to 2 when the vocabulary
gained `ref?`. The workflow ref moves with `package.json`, since an instance calls the workflow
at the release its own pin names.

Verified: npm run verify, npm run test:instance, npm run test:instance-checks, npm run
test:rules and sh conventions/conventions-check all pass.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 6: Stop, and hand the release notes to the Owner**

Do not tag, do not merge, do not publish a release. Report the branch and the suite results, with this draft for the release body:

```
Core 0.28.0 — an experience's achievements can be grouped

An experience's `## Achievements` was one flat list and nothing said what order it took, so the
same sort of claim sat first in one entry and last in the next, and a reader looking for what
someone decided, or what came of it, read every bullet of every entry to find it.

This release adds `achievement-kind`. An instance defines its own set — one file per kind in
`model/achievement-kinds/`, each with a `rank` spaced in tens — and an entry's bullets sit under
`###` headings that name them. Which groups a career needs is a fact about that career, which is
why the set is the instance's and not core's. The parser draws one edge per heading, via
`Achievements.Kind`, so a consumer that pins it sees a new edge kind on experiences and nothing
else changes for it.

Nothing breaks. `## Achievements` stays optional, and an instance that defines no kinds keeps
its flat list exactly as it is. Where kinds exist, the shipped checks hold two things: the
headings follow the kinds' rank, and no bullet stands before the first heading. Which kind a
bullet belongs under is a reading, and stays the agent pass's.

R9 gains a third declared shape behind this: a section whose Description begins `Grouped.`
carries a heading table beside the column tables, addressed by its own caption. `shape` moves to
3 for that reason — a reader built for shape 2 does not know the caption. R16 says what a
heading draws and that a heading naming nothing of its type is R4.

To take it: re-vendor `core/` at this tag, move `tooling` and `core` in
`.companygraph/manifest.json`, move the `instance-check.yml@v0.28.0` pin in your workflow, and
re-pin anything that imports the parser. Adding kinds is optional and can follow whenever the
entries are ready for them.
```

### Critical Files for Implementation

- /Users/rob/git/companygraph/meta-model/lib/instance.mjs
- /Users/rob/git/companygraph/meta-model/lib/checks.mjs
- /Users/rob/git/companygraph/meta-model/verify/check.mjs
- /Users/rob/git/companygraph/meta-model/core/CONVENTIONS.md
- /Users/rob/git/companygraph/meta-model/core/experience-schema.md
