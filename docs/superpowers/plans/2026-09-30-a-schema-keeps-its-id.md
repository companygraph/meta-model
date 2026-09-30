# A schema keeps its id Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every core schema opens with an `id`, a lowercase UUID version 7 that R18 holds as it holds an entity's; every element of a schema has an address built from that id; the parser hands the id out and keeps `core/<type>` as the address; the checks and a pull-request range check hold it.

**Architecture:** `lib/ids.mjs` gains `addressOf` and `elementOf`. `parseSchemas` reads a schema's frontmatter `id`, builds everything on `core/<type>` as it does today, and swaps in the stable id at the end, the way `parseInstance` does since R18; its internal readers move from `id` to `address`. `lib/checks.mjs` gains one check that owns a schema's id whole, and it runs for this repository's `core/` and an instance's vendored core alike. `ids` in the CLI works on a folder that holds `core/` as it works on an instance, so the backfill and the range check reuse `withId`, `firstCommitMsOf`, `changedPagesOf` and `idChangesOf` unchanged.

**Tech Stack:** Node 22 ES modules with no dependencies, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-09-30-a-schema-keeps-its-id-design.md`

This plan covers meta-model only. The MCP server reads `x.id.slice("core/".length)` in `lib/model.mjs` and `lib/diagram.mjs`, which breaks on a stable id; its plan moves those reads to `address` and adds `describe_schema` and `list_types` taking the id, and it is written and shipped before the MCP server re-pins to the release this plan builds.

## Global Constraints

- R9 gains, verbatim, as its first sentence, before `Named for the type, singular.`: `A schema file opens with YAML frontmatter holding one field, `id`: a UUID version 7 (RFC 9562), in lowercase, that R18 holds as it holds an entity's.`
- R18 gains, verbatim, as its last sentence: `A schema keeps its id by the same rule, and an element of a schema — a field, a section, a column or an enum value — is addressed by its schema's id and the key the schema writes it under.`
- A schema's frontmatter holds `id` and nothing else. The format is always UUID version 7, lowercase: `UUIDV7` in `lib/ids.mjs`.
- An address is `<schema id>` alone, or `<schema id>/name`, `<schema id>/statement`, `<schema id>/field/<key>`, `<schema id>/section/<heading>`, `<schema id>/column/<section>/<column>`, `<schema id>/enum/<via>/<value>`. `<via>` is a field's key or `<Section>.<Column>`. No part holds a `/`.
- `parseSchemas` returns the stable id as `id` where the schema has one and `core/<type>` otherwise, and always `address: "core/<type>"`. Edges carry the same ids as the entities they join.
- A core in which no schema carries an id predates the rule and is not held to it; a core in which one does is held whole.
- A backfilled schema id carries the author time of the file's first commit, found with `git log --follow --diff-filter=A` through `firstCommitMsOf`.
- No version bump in this plan. The release number and notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line.
- Before any `node` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.

## Review Focus

- A consumer that reads a schema's type from its `id`, as the MCP server does, must still find it in `address` once the id is stable. Pinned in Task 2.
- An instance that vendored a core from before this rule must pass the new check untouched. Pinned in Task 3.
- `addressOf` handed the fallback id `core/skill`, or a key holding `/`, must throw rather than build an address `elementOf` would read back wrong. Pinned in Task 1.
- A schema that now opens with `---` must still pass `verify`'s fixed-shape check, which reads the lines before the first `##` and expects the H1 first. Pinned in Task 5, where `npm run verify` runs over the stamped core.
- The schema backfill run a second time must write nothing. Pinned in Task 4.

---

### Task 1: An element of a schema has an address

**Files:**

- Modify: `lib/ids.mjs` (append after `idFormatOf`)
- Test: `verify/ids.test.mjs`

**Interfaces:**

- Produces: `addressOf(schemaId: string, element: Element) → string` and `elementOf(address: string) → { schemaId: string, element: Element }`, where `Element` is one of `{ kind: "type" }`, `{ kind: "name" }`, `{ kind: "statement" }`, `{ kind: "field", key }`, `{ kind: "section", heading }`, `{ kind: "column", section, column }`, `{ kind: "enum", via, value }`, every value a string.

- [ ] **Step 1: Write the failing tests**

Add `addressOf, elementOf` to the existing import from `../lib/ids.mjs` at the top of `verify/ids.test.mjs`, and append:

```js
const SCHEMA = "0198f2a4-6c1e-7b3d-9a52-3e8f1c7d4b60";

test("every kind of schema element has an address, and the address reads back to it", () => {
  const cases = [
    [{ kind: "type" }, SCHEMA],
    [{ kind: "name" }, `${SCHEMA}/name`],
    [{ kind: "statement" }, `${SCHEMA}/statement`],
    [{ kind: "field", key: "products" }, `${SCHEMA}/field/products`],
    [{ kind: "section", heading: "Also at" }, `${SCHEMA}/section/Also at`],
    [{ kind: "column", section: "References", column: "What" }, `${SCHEMA}/column/References/What`],
    [{ kind: "enum", via: "format", value: "uuidv7" }, `${SCHEMA}/enum/format/uuidv7`],
    [{ kind: "enum", via: "Aliases.Kind", value: "translation" }, `${SCHEMA}/enum/Aliases.Kind/translation`],
  ];
  for (const [element, address] of cases) {
    assert.equal(addressOf(SCHEMA, element), address);
    assert.deepEqual(elementOf(address), { schemaId: SCHEMA, element });
  }
});

test("an address is built only from a stable id and keys with no slash", () => {
  assert.throws(() => addressOf("core/skill", { kind: "name" }), /"core\/skill" is no schema id/);
  assert.throws(() => addressOf(SCHEMA, { kind: "section", heading: "In/Out" }), /"In\/Out" cannot stand in an address/);
  assert.throws(() => addressOf(SCHEMA, { kind: "field", key: "" }), /cannot stand in an address/);
  assert.throws(() => addressOf(SCHEMA, { kind: "row" }), /"row" is no kind of schema element/);
});

test("an address that names no element is refused, naming it", () => {
  for (const bad of [`${SCHEMA}/field`, `${SCHEMA}/name/extra`, `${SCHEMA}/column/References`, `${SCHEMA}/row/x`, "core/skill/name"])
    assert.throws(() => elementOf(bad), /is no element address/, bad);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:ids` Expected: FAIL, `addressOf` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/ids.mjs`:

```js
// An element of a schema, addressed by its schema's id and the key the schema writes it under
// (R18): a field by its key, a section by its heading, a column by its section and its name, an
// enum value by the `via` that holds it. The H1 and the `>` line have no key of their own, so
// they are `name` and `statement`. Only a stable id makes an address: `core/<type>` holds a
// slash, and no key may, which is what lets an address be read back by splitting on one.
const PARTS = {
  type: () => [],
  name: () => ["name"],
  statement: () => ["statement"],
  field: (e) => ["field", e.key],
  section: (e) => ["section", e.heading],
  column: (e) => ["column", e.section, e.column],
  enum: (e) => ["enum", e.via, e.value],
};

export function addressOf(schemaId, element) {
  if (typeof schemaId !== "string" || !schemaId || schemaId.includes("/"))
    throw new Error(`"${schemaId}" is no schema id; an address is built from a schema's stable id (R18)`);
  const parts = PARTS[element?.kind];
  if (!parts) throw new Error(`"${element?.kind}" is no kind of schema element`);
  const path = parts(element);
  for (const key of path.slice(1))
    if (typeof key !== "string" || !key || key.includes("/"))
      throw new Error(`"${key}" cannot stand in an address: a key is a string, not empty, with no "/"`);
  return [schemaId, ...path].join("/");
}

const ARITY = { name: 0, statement: 0, field: 1, section: 1, column: 2, enum: 2 };

export function elementOf(address) {
  const [schemaId, kind, ...rest] = address.split("/");
  if (!schemaId) throw new Error(`"${address}" is no element address`);
  if (kind === undefined) return { schemaId, element: { kind: "type" } };
  if (!(kind in ARITY) || rest.length !== ARITY[kind] || rest.some((k) => !k))
    throw new Error(`"${address}" is no element address`);
  const element =
    kind === "field" ? { kind, key: rest[0] }
    : kind === "section" ? { kind, heading: rest[0] }
    : kind === "column" ? { kind, section: rest[0], column: rest[1] }
    : kind === "enum" ? { kind, via: rest[0], value: rest[1] }
    : { kind };
  return { schemaId, element };
}
```

`"core/skill/name"` fails `elementOf` because `skill` is no kind; the test pins that.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:ids` Expected: PASS, every test.

- [ ] **Step 5: Commit**

```bash
git add lib/ids.mjs verify/ids.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `An element of a schema has an address`; body says `addressOf` and `elementOf` build and read `<schema id>/<kind>/<key>`, and only from a stable id; `Verified: npm run test:ids passes.`; then the trailers.

---

### Task 2: The parser hands out a schema's id, and its type as address

**Files:**

- Modify: `lib/instance.mjs` — `parseSchemas` (around lines 476–585), and the readers of a schema's type at the lines that now read `e.id.slice("core/".length)` (around 36, 599, 779, 876, 905)
- Test: `verify/instance.test.mjs`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `parseSchemas(files).entities[i]` gains `address: "core/<type>"`; `id` is the frontmatter `id` where there is one, else `core/<type>`; `edges[i].from` and `.to` use the same ids.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance.test.mjs`, after the test `"a ref → cell in a column table is an edge via Section.Column; the Owner line is an edge via owner"`:

```js
const SKILL_ID = "0198f2a4-6c1e-7b3d-9a52-3e8f1c7d4b60";
const stamped = () => {
  const withId = new Map(core);
  withId.set("skill-schema.md", `---\nid: ${SKILL_ID}\n---\n\n${core.get("skill-schema.md")}`);
  return withId;
};

test("a schema that carries an id leaves the parse by it, and keeps core/<type> as its address", () => {
  const { entities, edges } = parseSchemas(stamped());
  const skill = entities.find((e) => e.address === "core/skill");
  assert.equal(skill.id, SKILL_ID);
  assert.equal(skill.name, "Skill Schema");
  const source = entities.find((e) => e.address === "core/source");
  assert.equal(source.id, "core/source", "a schema with no id keeps core/<type> as its id");
  assert.deepEqual(edges.find((x) => x.from === "core/experience" && x.via === "skills"),
    { from: "core/experience", to: SKILL_ID, via: "skills", attrs: { type: "array of ref → skill" } });
  assert.ok(entities.every((e) => e.address === `core/${e.path.replace(/-schema\.md$/, "")}`));
});

test("an instance parses against schemas that carry ids exactly as against ones that do not", () => {
  const plain = parseInstance(valid, { schemas });
  const withIds = new Map(schemas);
  let n = 10; // two hex digits, one per schema, so no two share an id
  for (const [file, text] of schemas)
    if (file.endsWith("-schema.md")) withIds.set(file, `---\nid: ${SKILL_ID.slice(0, -2)}${n++}\n---\n\n${text}`);
  const read = parseInstance(valid, { schemas: withIds });
  assert.deepEqual(read.entities, plain.entities);
  assert.deepEqual(read.edges, plain.edges);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:instance` Expected: FAIL. `skill.id` is `core/skill`, and `address` is undefined.

- [ ] **Step 3: Write the implementation**

In `parseSchemas`, replace

```js
    const [, body] = parseFrontmatter(lines); // core/ files carry no YAML frontmatter
```

with

```js
    // A schema's frontmatter holds its id and nothing else (R9, R18); a core from before the rule
    // has none, and its schemas leave the parse as `core/<type>`, as they always did.
    const [front, body] = parseFrontmatter(lines);
    if (typeof front.id === "string" && front.id) stable.set("core/" + type, front.id);
```

declare `const stable = new Map();` beside `const entities = [];` at the top of the function, and push each entity with its address:

```js
    entities.push({ id: "core/" + type, address: "core/" + type, type: "schema", name, tagline, fields, sections,
                    owner: null, path });
```

Leave `byType`, `resolveType` and the edge building as they are: they run on `core/<type>`. After the line that sorts the edges, and before the `return`, add:

```js
  // Everything above read a schema by its address; it leaves the parse by its stable id where it
  // has one, and every edge with it (R18). `address` keeps `core/<type>` for whatever reads a type.
  const stableOf = (id) => stable.get(id) ?? id;
  for (const e of entities) e.id = stableOf(e.id);
  for (const x of edges) {
    x.from = stableOf(x.from);
    x.to = stableOf(x.to);
  }
```

Then change every reader in `lib/instance.mjs` that takes a type from a schema entity's id — the lines matching `e.id.slice("core/".length)` and `schema.id.slice("core/".length)` outside `parseSchemas` — to read `address` instead, for example:

```js
    const type = e.address.slice("core/".length);
```

Find them with `grep -n 'id.slice("core/".length)' lib/instance.mjs`; the one inside `parseSchemas` that builds `byType` stays, since it runs before the swap.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:instance && npm run test:instance-checks && npm run verify` Expected: PASS. The existing tests' fixtures carry no ids, so every `core/<type>` they assert still holds.

- [ ] **Step 5: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `The parser hands out a schema's id, and its type as address`; `Verified: npm run test:instance, npm run test:instance-checks and npm run verify pass.`; then the trailers.

---

### Task 3: The check holds a schema's id

**Files:**

- Modify: `lib/checks.mjs` — the import from `./ids.mjs` (line 24), and a new entry in `instanceChecks` directly after the entry named `"every entity carries an id in the declared format, and no two share one"`
- Test: `verify/instance-checks.test.mjs`

**Interfaces:**

- Consumes: `UUIDV7` and `idOf` from `lib/ids.mjs`.
- Produces: a check named `"every schema carries an id, and no two share one"`, rule `R18`, whose failures begin with the schema's path.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance-checks.test.mjs`:

```js
const sid = (n) => `0198f2a4-6c1e-7b3d-9a52-3e8f1c7d4b${String(n).padStart(2, "0")}`;
const withSchemaId = (id, text) => `---\nid: ${id}\n---\n\n${text}`;
const schemaFailures = (entries) =>
  checkInstance(new Map(entries), { core: "meta/core", model: "model" }).failures.filter((f) => f.startsWith("meta/core/"));

test("a core where one schema carries an id fails every schema that does not", () => {
  const failures = schemaFailures([
    ["meta/core/skill-schema.md", withSchemaId(sid(1), schema("skill", []))],
    ["meta/core/source-schema.md", schema("source", [])],
  ]);
  assert.ok(failures.some((f) => f.startsWith("meta/core/source-schema.md: no `id`")), failures.join("\n"));
});

test("a core where no schema carries an id predates the rule and is not held to it", () => {
  const failures = schemaFailures([
    ["meta/core/skill-schema.md", schema("skill", [])],
    ["meta/core/source-schema.md", schema("source", [])],
  ]);
  assert.ok(!failures.some((f) => /`id`/.test(f)), failures.join("\n"));
});

test("two schemas with one id fail, naming the other", () => {
  const failures = schemaFailures([
    ["meta/core/skill-schema.md", withSchemaId(sid(1), schema("skill", []))],
    ["meta/core/source-schema.md", withSchemaId(sid(1), schema("source", []))],
  ]);
  assert.ok(failures.some((f) => f.startsWith("meta/core/source-schema.md:") && f.includes("is shared with meta/core/skill-schema.md")), failures.join("\n"));
});

test("an uppercase schema id fails as not a lowercase UUID version 7", () => {
  const failures = schemaFailures([["meta/core/skill-schema.md", withSchemaId(sid(1).toUpperCase(), schema("skill", []))]]);
  assert.ok(failures.some((f) => f.includes("which is not a lowercase UUID version 7")), failures.join("\n"));
});

test("a schema's frontmatter holding more than its id fails", () => {
  const failures = schemaFailures([["meta/core/skill-schema.md", `---\nid: ${sid(1)}\nsource: Local\n---\n\n${schema("skill", [])}`]]);
  assert.ok(failures.some((f) => f.includes('frontmatter holds "source: Local"')), failures.join("\n"));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:instance-checks` Expected: FAIL on the first, third, fourth and fifth; the second passes already.

- [ ] **Step 3: Write the implementation**

In `lib/checks.mjs`, change line 24 to:

```js
import { UUIDV7, idOf, idFormatOf } from "./ids.mjs";
```

and add after the entity-id entry in `instanceChecks`:

```js
  {
    // R9 and R18: a schema opens with its id, a lowercase UUID version 7, and no two share one.
    // A core from before the rule carries none, and an instance is held to the core it vendored,
    // so a core in which no schema has an id is left alone. One in which any has is held whole,
    // since a schema without one there is a schema the backfill missed or a new one nobody gave
    // an id. Whether an id changed is history, which is `companygraph ids --range`.
    name: "every schema carries an id, and no two share one",
    rule: "R18",
    run() {
      const schemas = [];
      walkMd(core, (child, text) => {
        if (child.endsWith("-schema.md")) schemas.push([child, text]);
      });
      if (!schemas.some(([, text]) => idOf(text) !== null)) return;
      const seen = new Map();
      for (const [child, text] of schemas) {
        const id = idOf(text);
        if (id === null) {
          fail(`${child}: no \`id\`; every schema opens with one, a UUID version 7 (R9, R18) — \`companygraph id\` prints a fresh one`);
          continue;
        }
        const front = text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)[1];
        const extra = front.split("\n").find((l) => l.trim() && !/^id:/.test(l));
        if (extra) fail(`${child}: frontmatter holds "${extra.trim()}"; a schema's frontmatter holds its \`id\` and nothing else (R9)`);
        if (!UUIDV7.test(id)) fail(`${child}: \`id\` is "${id}", which is not a lowercase UUID version 7 (R18)`);
        if (seen.has(id))
          fail(`${child}: \`id\` "${id}" is shared with ${seen.get(id)}; a schema copied to start another keeps the id it was copied with — give the new one a fresh id with \`companygraph id\` (R18)`);
        else seen.set(id, child);
      }
    },
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:instance-checks && npm run test:rules && npm run verify` Expected: PASS. `verify` passes because this repository's core carries no id yet, which the check reads as a core from before the rule.

- [ ] **Step 5: Commit**

```bash
git add lib/checks.mjs verify/instance-checks.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `The check holds a schema's id`; `Verified: npm run test:instance-checks, npm run test:rules and npm run verify pass.`; then the trailers.

---

### Task 4: `ids` works on a folder that holds core

**Files:**

- Modify: `lib/plan.mjs` (append `schemaBackfillPlan` after `backfillPlan`)
- Modify: `bin/companygraph.mjs` — the `ids` function, its comment, the usage lines 12 and 56
- Modify: `.github/workflows/ci.yml` — the `verify` job's checkout and a new step
- Test: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `uuidv7`, `idOf`, `withId` (already imported in `lib/plan.mjs`); `firstCommitMsOf`, `changedPagesOf` from `lib/history.mjs`; `idChangesOf` from `lib/checks.mjs`.
- Produces: `schemaBackfillPlan(files: Map<string,string>, { core = "core", firstCommitMs, now = Date.now(), random }) → Map<string,string>`; `companygraph ids <folder> --backfill | --range <a>..<b>` on a folder that holds `core/CONVENTIONS.md` and is not an instance.

The flag `--core` already takes a tag for `init` and `upgrade`, so the command tells core from an instance by what the folder holds rather than by a new flag.

- [ ] **Step 1: Write the failing tests**

Add `schemaBackfillPlan` to the import from `../lib/plan.mjs` in `verify/plan.test.mjs`, and append:

```js
const coreTree = () => new Map([
  ["core/CONVENTIONS.md", "# Conventions\n"],
  ["core/skill-schema.md", "# Skill Schema\n\n> A skill.\n"],
  ["core/source-schema.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\n---\n\n# Source Schema\n"],
]);

test("the schema backfill stamps a schema without an id with its first commit, and nothing else", () => {
  const writes = schemaBackfillPlan(coreTree(), { firstCommitMs: () => MS });
  assert.deepEqual([...writes.keys()], ["core/skill-schema.md"]);
  const text = writes.get("core/skill-schema.md");
  assert.match(text, /^---\nid: [0-9a-f-]{36}\n---\n\n# Skill Schema\n\n> A skill\.\n$/);
  assert.equal(msOf(text.slice(8, 44)), MS);
});

test("run twice, the schema backfill writes nothing the second time", () => {
  const files = coreTree();
  for (const [path, text] of schemaBackfillPlan(files, { firstCommitMs: () => MS })) files.set(path, text);
  assert.equal(schemaBackfillPlan(files, { firstCommitMs: () => MS }).size, 0);
});
```

Append to `verify/cli.test.mjs`:

```js
// A folder that holds core/ and is not an instance — this repository — is stamped and ranged over
// its schemas, as an instance is over its pages.
const coreFolder = () => {
  const root = temp();
  fs.mkdirSync(path.join(root, "core"));
  fs.writeFileSync(path.join(root, "core/CONVENTIONS.md"), "# Conventions\n");
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "# Skill Schema\n\n> A skill.\n");
  return root;
};

test("ids --backfill on a folder that holds core stamps its schemas with their first commit", () => {
  const root = coreFolder();
  const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...a], { cwd: root });
  g("init", "-q");
  g("add", "-A");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "commit", "-qm", "first", "--no-verify"], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-23T10:00:00+02:00" },
  });
  run(["ids", root, "--backfill"]);
  const text = fs.readFileSync(path.join(root, "core/skill-schema.md"), "utf8");
  const id = text.match(/^id: (.+)$/m)[1];
  assert.equal(parseInt(id.replace(/-/g, "").slice(0, 12), 16), Date.parse("2026-08-23T08:00:00Z"));
  assert.equal(fs.readFileSync(path.join(root, "core/CONVENTIONS.md"), "utf8"), "# Conventions\n");
});

test("ids --range on a folder that holds core refuses a commit that changed a schema's id", () => {
  const root = coreFolder();
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "---\nid: 0198f2a4-6c1e-7b3d-9a52-3e8f1c7d4b60\n---\n\n# Skill Schema\n");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\n---\n\n# Skill Schema\n");
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /core\/skill-schema\.md: `id` is "01a04c85-bc20-7092-a266-845d81173e9f"/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:plan && npm run test:cli` Expected: FAIL. `schemaBackfillPlan` is not exported, and `ids` refuses the folder as not an instance.

- [ ] **Step 3: Write the implementation**

Append to `lib/plan.mjs`, after `backfillPlan`:

```js
// R18 for core: every schema without an id gets one stamped with its file's first commit, in
// the frontmatter R9 gives it. Run once in the repository that makes core; a schema made later
// takes a fresh id from `companygraph id`. A schema that has one keeps it.
export function schemaBackfillPlan(files, { core = "core", firstCommitMs, now = Date.now(), random } = {}) {
  const make = (ms) => (random ? uuidv7(ms, random()) : uuidv7(ms));
  const writes = new Map();
  for (const [path, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (typeof text !== "string" || !path.startsWith(`${core}/`) || !path.endsWith("-schema.md")) continue;
    if (idOf(text) !== null) continue;
    writes.set(path, withId(text, make(firstCommitMs(path) ?? now)));
  }
  return writes;
}
```

In `bin/companygraph.mjs`, add `schemaBackfillPlan` to the import from `../lib/plan.mjs`, change usage line 12 to

```js
//   companygraph ids [<folder>] (--backfill | --range <a>..<b>)   — an instance's pages, or core's schemas
```

and rewrite the head of `ids` and the two branches:

```js
// R18. `--backfill` gives every page without an id one stamped with its first commit and writes
// model/identifier.md where there is none; `--range` fails a change to an id on the default
// branch. A folder that holds core/ and is not an instance is the repository that makes core,
// and both work on its schemas instead; `--core` already names a tag, so what the folder holds
// is what tells the two apart.
function ids(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  const onCore = !isInstance(root) && existsSync(join(root, "core", "CONVENTIONS.md"));
  if (!onCore && !isInstance(root)) {
    console.error(`✗ ${root} is not an instance: it has no .companygraph/manifest.json beside a model/ folder, and no core/CONVENTIONS.md`);
    return 1;
  }
  const folder = onCore ? "core" : "model";
  if (given.backfill) {
    const files = new Map();
    const walk = (rel) => {
      for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(child);
        else if (entry.name.endsWith(".md")) files.set(child, unixLines(readFileSync(join(root, child), "utf8")));
      }
    };
    walk(folder);
    const top = gitTop(root);
    const firstCommitMs = (rel) => (top ? firstCommitMsOf(root, rel) : null);
    const writes = onCore ? schemaBackfillPlan(files, { firstCommitMs }) : backfillPlan(files, { firstCommitMs });
    if (writes.refused) {
      console.error(`✗ ${writes.refused}`);
      return 1;
    }
    writePlan(root, writes);
    const what = onCore ? "schema" : "page";
    console.log(`✓ ${writes.size ? `wrote an id into ${writes.size === 1 ? `one ${what}` : `each ${what} listed`}` : `every ${what} already carries an id`}`);
    for (const path of writes.keys()) console.log(`  ${path}`);
    return 0;
  }
```

and in the `--range` branch change the one call to

```js
    const failures = idChangesOf(changedPagesOf(root, given.range, folder), base);
```

`changedPagesOf` already takes the folder as its third argument, and `idChangesOf` reads only `id`, so neither changes. A `core/CONVENTIONS.md` in the range has no id before or after, and `idChangesOf` skips it.

In `.github/workflows/ci.yml`, give the `verify` job's checkout full history, since the range needs its base:

```yaml
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
```

and add as the job's last step:

```yaml
      # R18: a schema's id on the default branch never changes. Only on a pull request, over its
      # own range, as an instance's workflow runs the same command over its pages.
      - name: No schema's id changed
        if: github.event_name == 'pull_request'
        run: node bin/companygraph.mjs ids . --range "${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}"
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:plan && npm run test:cli` Expected: PASS, including `"ids refuses a folder that is not an instance, and says so"`, whose pattern still matches the longer message.

- [ ] **Step 5: Commit**

```bash
git add lib/plan.mjs bin/companygraph.mjs .github/workflows/ci.yml verify/plan.test.mjs verify/cli.test.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `ids works on a folder that holds core`; `Verified: npm run test:plan and npm run test:cli pass.`; then the trailers.

---

### Task 5: Core states the rule, and every schema carries its id

**Files:**

- Modify: `core/CONVENTIONS.md` — R9's first sentence, R18's last
- Modify: `verify/check.mjs` — the `"schema fixed shape"` check's header read (around line 94)
- Modify: every `core/*-schema.md`, by the backfill

**Interfaces:**

- Consumes: `companygraph ids . --backfill` from Task 4; the check from Task 3; the parser from Task 2.

- [ ] **Step 1: Write the rule**

In `core/CONVENTIONS.md`, under `### R9 — Schema files have a fixed shape`, put before `Named for the type, singular.`:

```markdown
A schema file opens with YAML frontmatter holding one field, `id`: a UUID version 7 (RFC 9562), in lowercase, that R18 holds as it holds an entity's.
```

joined to the existing paragraph with one space, so the paragraph stays one line. Under `### R18 — An entity keeps its id`, append to its paragraph, after `because each of those can change and the id cannot.`:

```markdown
A schema keeps its id by the same rule, and an element of a schema — a field, a section, a column or an enum value — is addressed by its schema's id and the key the schema writes it under.
```

- [ ] **Step 2: Let the fixed-shape check read past the frontmatter**

In `verify/check.mjs`, in the `"schema fixed shape"` check, replace

```js
        const header = (s.get("") ?? "").split("\n");
```

with

```js
        // A schema opens with its id (R9, R18), before the H1; the id check reads the frontmatter,
        // and the header this check reads in order starts after it.
        let header = (s.get("") ?? "").split("\n");
        if (header[0] === "---") header = header.slice(header.indexOf("---", 1) + 1);
```

- [ ] **Step 3: Run the backfill**

Run from the worktree, which shares the clone's full history:

```bash
node bin/companygraph.mjs ids . --backfill
git diff --stat core/
```

Expected: `✓ wrote an id into each schema listed`, one line per `core/*-schema.md`, and `git diff --stat` showing four added lines per schema file and none elsewhere. Check one against its first commit:

```bash
node -e 'const t=require("fs").readFileSync("core/skill-schema.md","utf8");const id=t.match(/^id: (.+)$/m)[1];console.log(new Date(parseInt(id.replace(/-/g,"").slice(0,12),16)).toISOString())'
git log --follow --diff-filter=A --format=%aI -- core/skill-schema.md | tail -1
```

Expected: the same moment, the first in UTC and the second in local time.

- [ ] **Step 4: Run every suite**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:rules && npm run test:plan && npm run test:instance-files && npm run test:cli && npm run test:ids && npm run test:seats && npm run test:untar && npm run test:fetch-core && npm run test:obsidian` Expected: PASS everywhere. `verify` now runs the Task 3 check over a core that carries ids, and the fixed-shape check over schemas that open with `---`; `test:cli` inits instances from this core, so their vendored schemas carry ids and the export skill's scripts read them.

Then the positive control, so the pass means something: remove the `id` line from `core/skill-schema.md` by hand, run `npm run verify`, and expect `core/skill-schema.md: no \`id\``; restore the file with `git checkout -- core/skill-schema.md` and run `npm run verify` again to see it pass.

Also run `sh conventions/conventions-format && sh conventions/conventions-check`. Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add core/ verify/check.mjs
git commit --author "Implementer <implementer@companygraph.io>"
```

Message: subject `Every schema carries its id`; body says the rule is in R9 and R18, the ids were backfilled from each schema's first commit, and the fixed-shape check reads past the frontmatter; `Verified:` names every suite in Step 4, the positive control, and the two conventions scripts; then the trailers.
