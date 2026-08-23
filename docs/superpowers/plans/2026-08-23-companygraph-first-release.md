# CompanyGraph First Release Implementation Plan

> **Historical record.** This is how the first release was built, not what shipped. Where this
> plan and the files in the repository disagree, the files are authoritative — read them, not
> the snippets quoted here. Three things moved after execution: the schemas live in `core/`,
> not `core/meta/`; `verify/check.mjs` gained checks the plan never names, and a fifth type,
> `proficiency-level`, that replaced an enum; and `CONVENTIONS.md` gained rule text — including
> R0 under a different heading and rules R10 and R11 — that the plan's version does not carry.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first release of the CompanyGraph meta-model — four core schemas
(`profile`, `experience`, `skill`, `value`), the portable conventions extracted from a source
instance's agent-instruction file, and a synthetic example instance that reads end to end.

**Architecture:** The deliverable is a graph of Markdown files, not code. Verification is a
zero-dependency Node script (`verify/check.mjs`) that asserts two things only: this
repository's own schema files match the fixed shape, and `example/` obeys the conventions. It
is deliberately **not** the validator the spec defers — it never reads a schema as truth about
somebody else's instance. Each task adds its check first (red), then the content that
satisfies it (green).

**Tech Stack:** Markdown. Node 18+ for `verify/check.mjs`, no dependencies, no build step.

**Spec:** [`docs/superpowers/specs/2026-08-23-companygraph-design.md`](../specs/2026-08-23-companygraph-design.md)
— read §4 (Types, Naming, Edges), §5 (Schemas), §6 (Splitting the agent instructions) and §9
(First release) before starting. The plan argues from the spec; where they disagree, the spec
wins and the plan is wrong.

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include this section.

- **Type names are singular; folders are the plural of the type.** No folder is shortened.
- **An entity is a file when it owns nothing, and a folder when it owns collections of its
  own.** Nothing in the model is a singleton.
- **An entity's file is named for the entity**, whether or not it nests:
  `skills/java-programming.md` flat, `profiles/mira-halvorsen/mira-halvorsen.md` nested.
- **Never `README.md` as an entity's file.** The repository's own `README.md` and
  `example/README.md` are genuine readmes and are exempt.
- **The canonical name of an entity is its H1.** No `name` frontmatter field duplicating it.
  No fallback chain.
- **Every reference is by canonical name, never by file path or filename.**
- **Ownership is carried by nesting and stated once** as an `**Owner:**` line in the owned
  type's schema.
- **Schema files are named for the type** (`skill-schema.md`) and carry, in this order: H1,
  `>` tagline, an `**Owner:**` line if owned, `## File Location`, `## Frontmatter`,
  `## Sections`.
- **Fixed table columns, no others.** Frontmatter: `Field | Required | Type | Description`.
  Sections: `Section | Required | Description`.
- **Type vocabulary, closed:** `string`, `date`, `array`, `object array`, `enum`,
  `ref → <type>`. A reference names one entity, so its target is singular: `ref → skill`.
- **Required is spelled `Yes` or `No`.** No other word.
- **Nothing instance-specific is published.** No company names, no issue tracker, no wiki, no
  chat tool, no email domain, no `slack_id` / `atlassian_id`, no Confluence `## Source` block.

## File Structure

```
package.json                        npm run verify, type: module, no dependencies
verify/check.mjs                    every check; each names the CONVENTIONS.md rule it enforces
CONVENTIONS.md                      the portable rules, R1–R10, each with an id
core/meta/skill-schema.md           plain file entity
core/meta/value-schema.md           plain file entity, no frontmatter
core/meta/profile-schema.md         folder entity, object array + enum
core/meta/experience-schema.md      owned entity, Owner: profile
example/README.md                   states outright that the company is fictional
example/values/*.md                 2 values
example/skills/*.md                 2 skills
example/profiles/<person>/          1 profile folder, its own file + experiences/
README.md                           modified: status, how to instantiate
```

`verify/check.mjs` stays one file. It is small, every check shares the same loaded-file
helpers, and splitting it by check type would separate things that change together.

---

### Task 1: Verify harness and the first schema

The simplest type first: `skill` owns nothing, has one optional frontmatter field, and
exercises the fixed shape without the owner or enum branches.

**Files:**
- Create: `package.json`
- Create: `verify/check.mjs`
- Create: `core/meta/skill-schema.md`

**Interfaces:**
- Consumes: nothing.
- Produces: `verify/check.mjs` exporting nothing but defining, for later tasks —
  `TYPES` (array of `{type, folder, owner?, owns?}`), `read(relPath)` → string,
  `fail(msg)` → void, `sectionsOf(text)` → `Map<string, string>` keyed by heading text,
  `tableOf(body)` → `{columns: string[], rows: string[][]}`, and a `CHECKS` array of
  `{name, rule, run}` where `run` takes no arguments and calls `fail` per problem.

- [ ] **Step 1: Write the failing test**

Create `package.json`:

```json
{
  "name": "companygraph-meta-model",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "verify": "node verify/check.mjs"
  }
}
```

Create `verify/check.mjs`:

```js
// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance. It asserts exactly two things: that this repository's own
// schema files match the fixed shape, and that example/ obeys the conventions. Every check
// names the CONVENTIONS.md rule it enforces, and a meta-check fails if that rule is missing —
// so the script and the prose cannot drift apart silently.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The slice this release ships. Mirrors spec §4; the folder is stated, never derived.
export const TYPES = [
  { type: "skill", folder: "skills" },
];

const failures = [];
export const fail = (msg) => failures.push(msg);

export const read = (rel) =>
  existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : null;

// Split a Markdown document into its "## Heading" sections, keyed by heading text.
// Everything before the first H2 is keyed "".
export function sectionsOf(text) {
  const out = new Map();
  let key = "";
  let buf = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      out.set(key, buf.join("\n"));
      key = m[1];
      buf = [];
    } else {
      buf.push(line);
    }
  }
  out.set(key, buf.join("\n"));
  return out;
}

// Parse the FIRST contiguous Markdown pipe table in a chunk of text, and stop at the blank
// line after it. A section may hold more than one table — profile-schema's object-array keys
// sit under ## Frontmatter — and swallowing the second one's header as a data row is exactly
// the kind of silent nonsense this script exists to catch.
export function tableOf(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start === -1) return null;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  const block = lines.slice(start, end);
  if (block.length < 2) return null;
  const cells = (l) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  return { columns: cells(block[0]), rows: block.slice(2).map(cells) };
}

const CHECKS = [
  {
    name: "schemas exist",
    rule: "R9",
    run() {
      for (const { type } of TYPES)
        if (read(`core/meta/${type}-schema.md`) === null)
          fail(`core/meta/${type}-schema.md is missing`);
    },
  },
  {
    name: "schema fixed shape",
    rule: "R9",
    run() {
      for (const { type } of TYPES) {
        const path = `core/meta/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;

        const title = type.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
        if (!text.startsWith(`# ${title} Schema\n`))
          fail(`${path}: first line must be "# ${title} Schema"`);
        if (!/\n>\s+\S/.test(text)) fail(`${path}: missing the "> " tagline`);

        const s = sectionsOf(text);
        for (const heading of ["File Location", "Frontmatter", "Sections"])
          if (!s.has(heading)) fail(`${path}: missing "## ${heading}"`);

        const order = [...s.keys()].filter((k) => k);
        const want = ["File Location", "Frontmatter", "Sections"];
        if (order.join(">") !== want.join(">"))
          fail(`${path}: sections are ${order.join(", ")}; must be exactly ${want.join(", ")}`);

        const fm = tableOf(s.get("Frontmatter") ?? "");
        if (!fm) fail(`${path}: "## Frontmatter" has no table`);
        else if (fm.columns.join("|") !== "Field|Required|Type|Description")
          fail(`${path}: frontmatter columns are ${fm.columns.join("|")}`);

        const sec = tableOf(s.get("Sections") ?? "");
        if (!sec) fail(`${path}: "## Sections" has no table`);
        else if (sec.columns.join("|") !== "Section|Required|Description")
          fail(`${path}: sections columns are ${sec.columns.join("|")}`);

        for (const t of [fm, sec])
          for (const row of t?.rows ?? [])
            if (!["Yes", "No"].includes(row[1]))
              fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
      }
    },
  },
];

for (const check of CHECKS) check.run();

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem${failures.length > 1 ? "s" : ""}\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ ${CHECKS.length} checks passed`);
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `core/meta/skill-schema.md is missing`, exit code 1.

- [ ] **Step 3: Write the schema**

Create `core/meta/skill-schema.md`:

```markdown
# Skill Schema

> Required structure for skill files in this repository.

## File Location

`skills/*.md`

A skill owns nothing, so it is a file. Nothing owns a skill either: a profile claims one and
a role requires one, and it outlives both.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `group` | No | string | Free-text grouping, e.g. `Testing`. Whether a group becomes an entity of its own is deliberately open. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Skill]` | Yes | The canonical name. Profiles and experiences reference this exact string. |
| `> [Definition]` | Yes | Single-line definition of what the skill is |
| `## In practice` | No | What someone using this skill actually does |
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 2 checks passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json verify/check.mjs core/meta/skill-schema.md
git commit -m "Check the repository's own shape, starting with one schema"
```

---

### Task 2: The value schema and the no-frontmatter branch

`value` has no frontmatter at all. The shape check currently demands a frontmatter table, so
it will reject a legitimate schema — that is the red.

**Files:**
- Modify: `verify/check.mjs` (the `TYPES` array, and the `Frontmatter` branch of
  `schema fixed shape`)
- Create: `core/meta/value-schema.md`

**Interfaces:**
- Consumes: `TYPES`, `read`, `fail`, `sectionsOf`, `tableOf` from Task 1.
- Produces: the literal string `No YAML frontmatter.` as the sanctioned contents of a
  `## Frontmatter` section that has no fields. Later schemas may use it.

- [ ] **Step 1: Write the failing test**

In `verify/check.mjs`, extend `TYPES`:

```js
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
];
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `core/meta/value-schema.md is missing`.

- [ ] **Step 3: Write the schema**

Create `core/meta/value-schema.md`:

```markdown
# Value Schema

> Required structure for value files in this repository.

## File Location

`values/*.md`

One file per value. Both source instances kept their values in a single document with a
heading per value, and a heading has no canonical name — so no strategy, role or process
could cite the value it serves, which is the one thing a company's values are for.

## Frontmatter

No YAML frontmatter.

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Value]` | Yes | The canonical name. Everything references the value by this exact string. |
| `> [Statement]` | Yes | Single-line statement of the value |
| `## In practice` | Yes | What following this value looks like, and what breaking it looks like |
```

- [ ] **Step 4: Run it to verify it still fails, for the right reason**

Run: `npm run verify`
Expected: FAIL with `core/meta/value-schema.md: "## Frontmatter" has no table`. This is the
check being wrong, not the schema.

- [ ] **Step 5: Fix the check**

In `verify/check.mjs`, replace the frontmatter branch inside `schema fixed shape`:

```js
        const fmBody = (s.get("Frontmatter") ?? "").trim();
        if (fmBody === "No YAML frontmatter.") {
          // A type with no fields says so in one sanctioned sentence, so that "no table"
          // and "forgot the table" stay distinguishable.
        } else {
          const fm = tableOf(fmBody);
          if (!fm) fail(`${path}: "## Frontmatter" has no table and does not say "No YAML frontmatter."`);
          else if (fm.columns.join("|") !== "Field|Required|Type|Description")
            fail(`${path}: frontmatter columns are ${fm.columns.join("|")}`);
          else
            for (const row of fm.rows)
              if (!["Yes", "No"].includes(row[1]))
                fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
        }
```

Then delete the old `const fm = tableOf(...)` block and remove `fm` from the trailing
`for (const t of [fm, sec])` loop, leaving:

```js
        for (const row of sec?.rows ?? [])
          if (!["Yes", "No"].includes(row[1]))
            fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
```

- [ ] **Step 6: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 2 checks passed`.

- [ ] **Step 7: Commit**

```bash
git add verify/check.mjs core/meta/value-schema.md
git commit -m "Give a value its own file, and the checker a way to say 'no fields'"
```

---

### Task 3: The profile schema, a folder entity

`profile` is the first type whose entities are folders, and the first with an `object array`
carrying an `enum`.

**Files:**
- Modify: `verify/check.mjs` (the `TYPES` array; add the `type vocabulary` check)
- Create: `core/meta/profile-schema.md`

**Interfaces:**
- Consumes: `TYPES`, `read`, `fail`, `sectionsOf`, `tableOf`.
- Produces: `TYPE_VOCABULARY`, an exported `Set` of the six permitted Type-column values,
  used by Task 4.

- [ ] **Step 1: Write the failing test**

In `verify/check.mjs`, extend `TYPES` and add the vocabulary set above `CHECKS`:

```js
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
];

// Spec §5: closed for the first release. `ref → <type>` is checked separately because its
// target varies.
export const TYPE_VOCABULARY = new Set(["string", "date", "array", "object array", "enum"]);
```

Add a third entry to `CHECKS`:

```js
  {
    name: "type vocabulary",
    rule: "R9",
    run() {
      const known = new Set(TYPES.map((t) => t.type));
      for (const { type } of TYPES) {
        const path = `core/meta/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        const fm = tableOf((sectionsOf(text).get("Frontmatter") ?? "").trim());
        for (const row of fm?.rows ?? []) {
          const declared = row[2].replace(/`/g, "").trim();
          const ref = declared.match(/^ref → (.+)$/);
          if (ref) {
            if (!known.has(ref[1]))
              fail(`${path}: ${row[0]} points at unknown type "${ref[1]}"`);
            if (ref[1].endsWith("s"))
              fail(`${path}: ${row[0]} is "ref → ${ref[1]}"; a reference names one entity`);
          } else if (!TYPE_VOCABULARY.has(declared)) {
            fail(`${path}: ${row[0]} has type "${declared}", which is outside the vocabulary`);
          }
        }
      }
    },
  },
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `core/meta/profile-schema.md is missing`.

- [ ] **Step 3: Write the schema**

Create `core/meta/profile-schema.md`:

```markdown
# Profile Schema

> Required structure for profile files in this repository.

## File Location

`profiles/<profile>/<profile>.md`

A profile owns experiences, so it is a folder rather than a file: `profiles/<profile>/` holds
the profile's own file and an `experiences/` folder beside it. Removing a person is then one
operation and an orphaned experience is unrepresentable.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `email` | No | string | Contact address |
| `location` | No | string | Where the person works from |
| `skills` | No | object array | One entry per skill claimed. Keys below. |

`skills` entries carry two keys:

| Key | Required | Type | Description |
| --- | --- | --- | --- |
| `skill` | Yes | ref → skill | Must match the H1 of a file in `skills/` exactly |
| `level` | Yes | enum | One of `beginner`, `medior`, `senior` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | The person's canonical name. Everything references the profile by this exact string. |
| `> [Tagline]` | Yes | Single-line summary of the person |
| `## Summary` | No | A paragraph of context |
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 3 checks passed`. The `skills` entries table is a second table in the
section; `tableOf` reads only the first, which is the frontmatter table, so `object array` is
what gets vocabulary-checked.

- [ ] **Step 5: Commit**

```bash
git add verify/check.mjs core/meta/profile-schema.md
git commit -m "Make a profile a folder, because it owns something"
```

---

### Task 4: The experience schema, an owned entity

The first owned type, and the first `**Owner:**` line.

**Files:**
- Modify: `verify/check.mjs` (the `TYPES` array; add the `ownership declared` check)
- Create: `core/meta/experience-schema.md`

**Interfaces:**
- Consumes: `TYPES`, `read`, `fail`, `sectionsOf`, `tableOf`, `TYPE_VOCABULARY`.
- Produces: the `**Owner:** <type>` line as the sole declaration of ownership; Task 6's
  example content relies on the `profiles/<profile>/experiences/` path it fixes.

- [ ] **Step 1: Write the failing test**

In `verify/check.mjs`, extend `TYPES`:

```js
  { type: "experience", folder: "profiles/<profile>/experiences", owner: "profile" },
```

Add a fourth entry to `CHECKS`:

```js
  {
    name: "ownership declared",
    rule: "R10",
    run() {
      const known = new Set(TYPES.map((t) => t.type));
      for (const { type, owner, folder } of TYPES) {
        const path = `core/meta/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        const stated = text.match(/^\*\*Owner:\*\*\s+(\S+)\s*$/m)?.[1];

        if (owner && stated !== owner)
          fail(`${path}: must declare "**Owner:** ${owner}"; found ${stated ?? "no Owner line"}`);
        if (!owner && stated)
          fail(`${path}: declares "**Owner:** ${stated}" but nothing owns a ${type}`);
        if (stated && !known.has(stated))
          fail(`${path}: Owner is "${stated}", which is not a type`);

        // The Owner line and the path must agree: an owned type nests inside its owner's
        // folder. The owner's folder is looked up, never derived by appending an "s" — that
        // derivation is the one CONVENTIONS.md R7 exists to forbid.
        const ownerFolder = owner && TYPES.find((t) => t.type === owner)?.folder;
        if (ownerFolder && !folder.startsWith(`${ownerFolder}/`))
          fail(`${path}: File Location "${folder}" does not nest inside ${ownerFolder}/`);
        // A placeholder naming the type itself is a folder entity — `profiles/<profile>/`
        // has one because a profile owns something, not because something owns it. Only a
        // placeholder naming a *different* type means this entity nests inside that one.
        const foreign = [...folder.matchAll(/<([\w-]+)>/g)]
          .map((m) => m[1])
          .filter((n) => n !== type);
        if (!owner && foreign.length)
          fail(`${path}: File Location "${folder}" nests inside <${foreign[0]}> but declares no Owner`);
      }
    },
  },
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `core/meta/experience-schema.md is missing`.

- [ ] **Step 3: Write the schema**

Create `core/meta/experience-schema.md`:

```markdown
# Experience Schema

> Required structure for experience files in this repository.

**Owner:** profile

## File Location

`profiles/<profile>/experiences/*.md`

An experience is owned by a profile and cannot exist without it, so it nests inside the
profile's folder rather than sitting at the root with a `profile:` field pointing back.
Filenames are prefixed with the start year so the folder sorts chronologically:
`2018-northwind-atelier.md`.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `start` | Yes | date | `YYYY-MM`, when the period began |
| `end` | No | date | `YYYY-MM`. Absent means the period is ongoing. |
| `organisation` | No | string | Where the period was spent |
| `skills` | No | array | Each entry is a `ref → skill`: the H1 of a file in `skills/` |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Title]` | Yes | The canonical name of this period |
| `> [Tagline]` | Yes | Single-line summary of the period |
| `## What changed` | No | What was different afterwards |
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 4 checks passed`.

- [ ] **Step 5: Commit**

```bash
git add verify/check.mjs core/meta/experience-schema.md
git commit -m "Nest an experience in its profile, and say so once"
```

---

### Task 5: CONVENTIONS.md, extracted rule by rule

The spec calls this the main work of the first release (§6) and the point where publishing
most easily goes wrong. Each rule gets an id, and the checker's `rule:` fields are verified
against them — so a check enforcing a rule nobody wrote down is a failure.

**Files:**
- Create: `CONVENTIONS.md`
- Modify: `verify/check.mjs` (add the `rules are written down` check)

**Interfaces:**
- Consumes: `read`, `fail`, and the `rule` field already present on every check.
- Produces: rule ids `R1`–`R10`, referenced by `rule:` in `verify/check.mjs`.

- [ ] **Step 1: Write the failing test**

In `verify/check.mjs`, add a fifth entry to `CHECKS`. It needs to see the `CHECKS` array, so
place it last and reference `CHECKS` lazily inside `run()`:

```js
  {
    name: "rules are written down",
    rule: "R0",
    run() {
      const text = read("CONVENTIONS.md");
      if (text === null) return fail("CONVENTIONS.md is missing");
      const defined = new Set([...text.matchAll(/^###\s+(R\d+)\s+—/gm)].map((m) => m[1]));
      for (const check of CHECKS)
        if (!defined.has(check.rule))
          fail(`check "${check.name}" enforces ${check.rule}, which CONVENTIONS.md does not define`);
    },
  },
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `CONVENTIONS.md is missing`.

- [ ] **Step 3: Write the conventions**

Create `CONVENTIONS.md`:

```markdown
# Conventions

> What makes a graph of Markdown files checkable. Portable across companies by design: a rule
> that names an issue tracker, a wiki, a chat tool or a mail domain belongs in the instance,
> not here.

Validation is agent-run. Invoke it in prose — *"check cross-references in this repository"* —
and the rules below are what is being checked. `npm run verify` covers the mechanical subset.

## Structure

### R1 — One entity per file

A file describes exactly one entity. A document with a heading per entity is not a
collection: a heading has no canonical name, so nothing can reference it.

### R2 — The canonical name of an entity is its H1

Not the filename, not a frontmatter field, and not the first of several fallbacks. A fallback
chain is what makes a reference unresolvable without running code.

### R3 — Every reference is by canonical name

Never by file path and never by filename. Paths move; a canonical name is the entity.

### R4 — An unresolvable reference is an error

Not a warning. A reference naming an entity that does not exist, or that exists under a
different type, fails the check.

### R5 — An owned collection nests inside its owner

A type that cannot exist without another lives inside that owner's folder and never appears
at the root. Removing the owner then removes what it owned, and an orphan cannot be
represented.

### R6 — An entity that owns collections is a folder

The folder is named for the entity, holds the entity's own file — also named for the entity —
and one folder per owned type beside it. An entity that owns nothing is a file. `README.md`
is never an entity's file.

### R7 — Folders are the plural of the type

The type is singular because it says what one entity is. No folder is shortened for
readability: an abbreviated folder is an exception to the one rule that makes the two names
predictable, bought with nothing.

## Schemas

### R8 — Enum values are listed in the schema

A field typed `enum` states its permitted values. Any other value is an error, which is the
whole reason to type it `enum` rather than `string`.

### R9 — Schema files have a fixed shape

Named for the type, singular. In order: `# <Type> Schema`, a `>` tagline, an `**Owner:**`
line if the type is owned, `## File Location`, `## Frontmatter`, `## Sections`. Frontmatter
columns are `Field | Required | Type | Description`; sections columns are
`Section | Required | Description`. Required is `Yes` or `No`. Types come from the closed
vocabulary: `string`, `date`, `array`, `object array`, `enum`, `ref → <type>`.

### R10 — An owned type declares its owner

One `**Owner:**` line in the owned type's schema, and the File Location nests inside that
owner. The declaration goes on the owned type because "what does this belong to?" is asked of
the owned thing.

## Working

### R0 — Cross-reference validation runs before committing

Every rule above is checkable. Run `npm run verify` for the mechanical subset and an agent
pass for the rest — whether a schema's prose is portable, and whether a rule that has crept in
is really about modelling rather than about one company's tooling.
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 5 checks passed`.

- [ ] **Step 5: Commit**

```bash
git add CONVENTIONS.md verify/check.mjs
git commit -m "Extract the portable rules, and make the checker cite them"
```

---

### Task 6: The example instance

A small fictional company that reads end to end, and the checks that prove the schemas
describe something real rather than something plausible.

**Files:**
- Create: `example/README.md`, `example/values/craftsmanship.md`,
  `example/values/say-the-hard-thing.md`, `example/skills/java-programming.md`,
  `example/skills/domain-driven-design.md`,
  `example/profiles/mira-halvorsen/mira-halvorsen.md`,
  `example/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`,
  `example/profiles/mira-halvorsen/experiences/2022-beacon-systems.md`
- Modify: `verify/check.mjs` (add `example structure` and `example references` checks)

**Interfaces:**
- Consumes: `TYPES`, `read`, `fail`.
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing test**

In `verify/check.mjs`, add `readdirSync` and `statSync` to the `node:fs` import, then add two
checks before the `rules are written down` entry:

```js
  {
    name: "example structure",
    rule: "R6",
    run() {
      const ls = (rel) => {
        const p = join(ROOT, rel);
        return existsSync(p) ? readdirSync(p) : null;
      };
      const top = ls("example");
      if (top === null) return fail("example/ is missing");

      const rootFolders = TYPES.filter((t) => !t.folder.includes("/")).map((t) => t.folder);
      const ownerFolders = TYPES.filter((t) => t.owns).map((t) => t.folder.split("/")[0]);
      const allowed = new Set([...rootFolders, ...ownerFolders, "README.md"]);
      for (const entry of top)
        if (!allowed.has(entry))
          fail(`example/${entry} is not a folder of any type (expected one of ${[...allowed].join(", ")})`);

      for (const { type, folder, owns } of TYPES) {
        if (folder.includes("/") && !owns) continue; // owned types are reached via their owner
        const base = folder.split("/")[0];
        for (const name of ls(`example/${base}`) ?? []) {
          if (!owns) {
            if (!name.endsWith(".md")) fail(`example/${base}/${name} should be a .md file`);
            continue;
          }
          // A folder entity: its own file is named for it, and it owns folders beside it.
          const inside = ls(`example/${base}/${name}`) ?? [];
          if (!inside.includes(`${name}.md`))
            fail(`example/${base}/${name}/ must contain ${name}.md, not ${inside.join(", ")}`);
          for (const owned of owns) {
            const ownedFolder = TYPES.find((t) => t.type === owned).folder.split("/").pop();
            if (!inside.includes(ownedFolder))
              fail(`example/${base}/${name}/ is missing ${ownedFolder}/`);
          }
          if (inside.includes("README.md"))
            fail(`example/${base}/${name}/README.md — an entity's file is named for the entity`);
        }
      }
    },
  },
  {
    name: "example references",
    rule: "R4",
    run() {
      const h1 = (rel) => read(rel)?.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;
      const skillNames = new Set();
      const skillDir = join(ROOT, "example/skills");
      if (existsSync(skillDir))
        for (const f of readdirSync(skillDir)) {
          const name = h1(`example/skills/${f}`);
          if (!name) fail(`example/skills/${f} has no H1`);
          else if (skillNames.has(name)) fail(`two skills share the canonical name "${name}"`);
          else skillNames.add(name);
        }

      const LEVELS = new Set(["beginner", "medior", "senior"]);
      const walk = (rel) => {
        const p = join(ROOT, rel);
        if (!existsSync(p)) return;
        for (const entry of readdirSync(p)) {
          const child = `${rel}/${entry}`;
          if (statSync(join(ROOT, child)).isDirectory()) walk(child);
          else if (entry.endsWith(".md")) {
            const text = read(child) ?? "";
            for (const m of text.matchAll(/^\s*-\s+skill:\s*(.+?)\s*$/gm))
              if (!skillNames.has(m[1]))
                fail(`${child}: skill "${m[1]}" resolves to nothing in example/skills/`);
            for (const m of text.matchAll(/^\s*level:\s*(.+?)\s*$/gm))
              if (!LEVELS.has(m[1]))
                fail(`${child}: level "${m[1]}" is not beginner, medior or senior`);
            const bare = text.match(/^skills:\s*\[(.+?)\]\s*$/m);
            if (bare)
              for (const raw of bare[1].split(",")) {
                const name = raw.trim().replace(/^["']|["']$/g, "");
                if (!skillNames.has(name))
                  fail(`${child}: skill "${name}" resolves to nothing in example/skills/`);
              }
          }
        }
      };
      walk("example/profiles");
    },
  },
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run verify`
Expected: FAIL with `example/ is missing`.

- [ ] **Step 3: Write the example instance**

Create `example/README.md`:

````markdown
# Example instance

> A fictional company, described in CompanyGraph. Nothing here is real.

Northwind Atelier and Beacon Systems do not exist, and neither does Mira Halvorsen. The
content is invented so the shape can be read end to end without anyone's actual client or
revenue data being published.

It uses four core types — `profile`, `experience`, `skill`, `value` — and declares no packs.
That is the first release of the model, not a claim that four types describe a company.

```
values/                          say-the-hard-thing.md, craftsmanship.md
skills/                          java-programming.md, domain-driven-design.md
profiles/mira-halvorsen/         mira-halvorsen.md
  experiences/                   2018-northwind-atelier.md, 2022-beacon-systems.md
```

`profiles/` is a folder of folders because a profile owns its experiences. `skills/` is a
folder of files because nothing owns a skill.
````

Create `example/values/craftsmanship.md`:

```markdown
# Craftsmanship

> We would rather ship one thing that holds up than three that need watching.

## In practice

Following it looks like refusing a deadline that can only be met by leaving something
half-built, and saying so early enough that the date can move.

Breaking it looks like shipping on time and privately knowing which part will be rewritten
within the quarter.
```

Create `example/values/say-the-hard-thing.md`:

```markdown
# Say The Hard Thing

> Disagreement that arrives after the decision is not disagreement, it is commentary.

## In practice

Following it looks like naming the objection in the room where the choice is being made, once
and plainly, and then committing to whatever is decided.

Breaking it looks like agreeing in the meeting and reopening the question in a side channel
afterwards.
```

Create `example/skills/java-programming.md`:

```markdown
---
group: Programming Languages
---

# Java Programming

> Building and maintaining server-side systems on the JVM.

## In practice

Writing services that other teams depend on, and being the person who reads the stack trace
when one of them stops.
```

Create `example/skills/domain-driven-design.md`:

```markdown
---
group: Software Design
---

# Domain-Driven Design

> Modelling software around the language the business already speaks.

## In practice

Refusing a name that only makes sense inside the codebase, and holding the boundary when a
second team wants to reach across it.
```

Create `example/profiles/mira-halvorsen/mira-halvorsen.md`:

```markdown
---
email: mira@example.invalid
location: Bergen
skills:
  - skill: Java Programming
    level: senior
  - skill: Domain-Driven Design
    level: medior
---

# Mira Halvorsen

> Backend engineer who ended up owning the parts nobody else wanted to.

## Summary

Eight years across two companies, both of them small enough that the boundary between
building a thing and running it never really existed.
```

Create `example/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md`:

```markdown
---
start: 2018-03
end: 2022-01
organisation: Northwind Atelier
skills: [Java Programming]
---

# Rebuilding the order pipeline

> Four years replacing a nightly batch with something that ran when the order did.

## What changed

Orders that used to be visible the next morning were visible in seconds, which turned out to
matter less than expected — and the reason it mattered less became the argument for the next
piece of work.
```

Create `example/profiles/mira-halvorsen/experiences/2022-beacon-systems.md`:

```markdown
---
start: 2022-02
organisation: Beacon Systems
skills: [Java Programming, Domain-Driven Design]
---

# Splitting the billing domain

> Ongoing. Taking one service that three teams edited and making it two that one team each
> owns.

## What changed

The second team stopped waiting on the first to merge. The third is still waiting, which is
the part that is not finished.
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run verify`
Expected: PASS — `✓ 7 checks passed`.

- [ ] **Step 5: Prove the checks bite**

Temporarily change `level: medior` to `level: expert` in
`example/profiles/mira-halvorsen/mira-halvorsen.md` and run `npm run verify`.
Expected: FAIL with `level "expert" is not beginner, medior or senior`.

Temporarily change `skills: [Java Programming]` to `skills: [Java]` in
`example/profiles/mira-halvorsen/experiences/2018-northwind-atelier.md` and run again.
Expected: FAIL with `skill "Java" resolves to nothing in example/skills/`.

Revert both edits and confirm `npm run verify` passes again. A check that has never failed is
not known to work.

- [ ] **Step 6: Commit**

```bash
git add example verify/check.mjs
git commit -m "Describe a fictional company, and prove the checks bite"
```

---

### Task 7: README

The repository's front door has said "design agreed, nothing built yet" since the first
commit. It is now wrong.

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Rewrite the status and add the contents**

Replace the `**Status:**` line at the end of `README.md` with:

````markdown
## What is here

```
core/meta/         one schema per type: profile, experience, skill, value
CONVENTIONS.md     the portable rules that make the graph checkable
example/           a fictional company, described in those four types
verify/check.mjs   npm run verify — asserts this repo's own shape
```

## Instantiating it

Copy `core/meta/` into a repository of your own, create the folders its schemas name, and
write one file per entity. The schemas are the contract; `CONVENTIONS.md` is what an agent
checks the result against. `example/` is there to be read, not copied.

## Packs

Core is the vocabulary any company can be described in. A **pack** adds vocabulary that only
some kinds of company need *at all* — types that are absent rather than optional. A company
that builds a product has features, architecture decisions and roadmaps; a consultancy has
none of those and should not carry empty folders implying it forgot.

That is the difference between a pack and an unused core type. Core defines a type without
obliging you to populate it: a company of one has no `group`, and the type stays in core,
unused. A pack is for vocabulary that would not belong at all.

No pack ships yet. The mechanism arrives when a second kind of company asks for it.

## Status

The first release describes **one person completely** rather than thirteen types partially —
`profile`, `experience`, `skill` and `value`, plus the conventions. The remaining core types
are named in the design and not yet written, no pack ships yet, and there is no validator
beyond `npm run verify`, which checks this repository rather than yours.

See [`docs/superpowers/specs/2026-08-23-companygraph-design.md`](docs/superpowers/specs/2026-08-23-companygraph-design.md).
````

- [ ] **Step 2: Run the checks one final time**

Run: `npm run verify`
Expected: PASS — `✓ 7 checks passed`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Say what is here, now that something is"
```

---

## Not in this plan

Per spec §9, deliberately excluded — do not add them:

- `packs/product/` and the pack declaration format (§8)
- The remaining eleven core types
- The validator as a product — `verify/check.mjs` checks this repository, never somebody
  else's instance
- `companygraph.github.io` and `talks/intro/`, which are stages 2 and 3 and get their own
  spec when the model exists
- The reference instance under `robertblust/company`
