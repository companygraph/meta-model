# Typed resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the instance parser resolve every reference by the type its schema declares, retire the three workarounds that existed because it did not, release the result as meta-model 0.22.0, and move the instance and the two sites onto it.

**Architecture:** `parseInstance` gains a required `schemas` map and reads it through the `parseSchemas` reader that already exists in the same file. It builds one name index per type (R2), resolves a declared `ref`, `ref?` or `qualifier` against its declared type only, and treats everything else as a fact (R16). A body table draws its edge from the one column its schema declares as a reference, wherever it stands. Two assertions in the instance checks that guarded the blind parser go; three rule passages that described it are rewritten. The two sites that import the parser pass the vendored core beside the model.

**Tech Stack:** Node 22, the built-in test runner, `npm run verify` and the three `npm run test:*` suites in `companygraph/meta-model`, `npm run model` in `robertblust.github.io`, `npm run build` in `companygraph.github.io`.

**Spec:** `docs/superpowers/specs/2026-09-15-typed-resolution-design.md`

## Global Constraints

- Core and the package are both at 0.21.0 and **both go to 0.22.0**. The version string lives in `core/manifest.json`, `package.json`, and twice in `.github/workflows/instance-check.yml` (the `ref:` on line 37 and the example `uses:` line in the comment on line 6). All four move together. `shape` in `core/manifest.json` stays **2**.
- **No fallback.** `parseInstance` without `schemas` throws. Nothing anywhere resolves by name alone.
- **No rule is added, renumbered or weakened.** R2's same-type uniqueness, R4's error on an unresolvable reference and every sentence of R16 stay. Only the passages that describe the untyped parser are rewritten, as §5 of the spec lists them.
- Core is company-generic. Nothing in `core/`, `lib/` or `example/` names Robert Blust, blust.ch or any real client. Test fixtures may use "Robert Blust" only in the company-of-one case that already exists in `verify/instance.test.mjs`.
- **The multi-person instance is never named**, in any file, commit message or pull request description.
- Prose follows `conventions/WRITING.md`: American English, spaced em-dashes, sentence case in headings, no serial comma, curly quotes. Run `sh conventions/conventions-check` before every commit. `docs/superpowers/` is excluded from that check, so plan and spec prose is held by the agent pass alone.
- Every commit runs the checks its task names and is made only when they pass. Check exit codes on their own; a pipe into `tail` hides one.
- Commit messages follow the git register: a subject under seventy characters with no type prefix and no trailing period, one to three short paragraphs with cause before mechanism, one line beginning `Verified:` naming what ran and passed, then the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Pull request descriptions are the commit body reread for a reviewer who has not seen the diff, plus links to sibling pull requests, and end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **No Summary/Test-plan template.**
- **Nothing is merged and nothing is tagged by an agent.** Each phase ends with a green pull request and stops. Merging, tagging and publishing the release are the owner's decisions.
- Phase 2 is blocked until the owner has merged Phase 1 and pushed the tag `v0.22.0`. Phase 3 is blocked until Phase 2 is merged. Phase 4 is blocked until Phase 1 is merged and tagged; it does not wait for Phase 2.

---

## Phase 1 — companygraph/meta-model

Repository: `/Users/rob/git/companygraph/meta-model`. Branch: `typed-resolution`, which already exists and carries the spec and this plan.

### Task 1: The parser tests carry schemas

**Files:**

- Modify: `verify/instance.test.mjs` (the file header comment, a new `schema` helper and `schemas` fixture after the `valid` fixture at lines 7-21, and every `parseInstance(` call)

**Interfaces:**

- Produces: `schema(type, { fields, tables })`, a helper returning one schema file's text in the R9 shape, and `schemas`, a `Map` of `<type>-schema.md` → text declaring every field and table the fixtures in this file use. Task 2 adds cases on top of both.

This task changes no behavior. The parser ignores the option until Task 2, so the suite stays green throughout, and the step that would otherwise mix "fixtures grow" with "resolution changes" in one diff is split off.

- [ ] **Step 1: Add the helper and the fixture**

Insert after the closing `]);` of the `valid` map (line 21):

```js
// A schema in the fixed shape R9 states, holding only the rows a fixture needs. `fields` is
// a list of [name, type] pairs for the Frontmatter table; `tables` maps a section heading to
// its [column, type] pairs, which become the captioned column table R9 requires.
const schema = (type, { fields = [], tables = {} } = {}) => {
  const title = type.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const lines = [
    `# ${title} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${type}s/*.md\``, "",
    "## Frontmatter", "",
  ];
  if (fields.length) {
    lines.push("| Field | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of fields) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  } else {
    lines.push("No YAML frontmatter.");
  }
  lines.push("", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
             "| `# [Name]` | Yes | The canonical name. |");
  for (const heading of Object.keys(tables)) lines.push(`| \`## ${heading}\` | No | Table. |`);
  for (const [heading, columns] of Object.entries(tables)) {
    lines.push("", `\`## ${heading}\` is a table with these columns:`, "",
               "| Column | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of columns) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  }
  return lines.join("\n") + "\n";
};

// What every fixture in this file is read against. One schema per type the fixtures use,
// declaring each field and table the way core does: a reference names its type, a qualifier
// resolves and draws nothing, and everything else is a fact.
const schemas = new Map([
  ["identity-schema.md", schema("identity", { tables: { "Also at": [["Where", "string"], ["URL", "string"]] } })],
  ["value-schema.md", schema("value")],
  ["skill-schema.md", schema("skill", { fields: [["source", "ref → source"], ["group", "string"]] })],
  ["proficiency-level-schema.md", schema("proficiency-level", { fields: [["rank", "number"]] })],
  ["experience-kind-schema.md", schema("experience-kind")],
  ["source-schema.md", schema("source", { fields: [["url", "string"]] })],
  ["profile-schema.md", schema("profile", {
    fields: [["email", "string"], ["location", "string"]],
    tables: {
      Skills: [["Skill", "ref → skill"], ["Level", "qualifier → proficiency-level"], ["Evidence", "string"]],
      "Also at": [["Where", "string"], ["URL", "string"]],
    },
  })],
  ["experience-schema.md", schema("experience", {
    fields: [["kind", "ref → experience-kind"], ["start", "date"], ["end", "date"],
             ["organization", "ref? → identity"], ["skills", "array of ref → skill"]],
    tables: { References: [["What", "string"], ["URL", "string"]] },
  })],
]);
```

- [ ] **Step 2: Pass the fixture on every call**

Every `parseInstance(x)` and `parseInstance(x, { sub })` in the file gains `schemas`. There are around twenty-five calls between lines 23 and 432; the two forms are:

```bash
cd /Users/rob/git/companygraph/meta-model
sed -i '' -E 's/parseInstance\(([A-Za-z]+)\)/parseInstance(\1, { schemas })/g; s/parseInstance\(([A-Za-z]+), \{ sub \}\)/parseInstance(\1, { sub, schemas })/g' verify/instance.test.mjs
grep -n "parseInstance(" verify/instance.test.mjs | grep -v schemas
```

Expected: the last line prints nothing except the `import` line. If any call remains, edit it by hand.

- [ ] **Step 3: Rewrite the file's header comment**

Replace lines 1-2:

```js
// The parser reads an instance by the fixed shape and resolves by what its schemas declare, so
// these fixtures are small maps of path → Markdown beside a map of the schemas they are read
// against, and every rule the spec names has a fixture that breaks it.
```

- [ ] **Step 4: Run the suite**

```bash
npm run test:instance; echo "exit: $?"
```

Expected: every test passes, exit 0. The parser does not read the option yet.

- [ ] **Step 5: Commit**

```bash
git add verify/instance.test.mjs
git commit -m "$(cat <<'MSG'
Every parser fixture is read beside the schemas that declare it

The parser is about to resolve by the type a schema declares, and a fixture with no schema
would then have nothing to be read against. So the fixtures grow first, while the parser still
ignores what they carry: one schema per type the tests use, generated in the shape R9 states,
handed to every call. The suite is green on both sides of this commit, which is the point of
making it on its own.

Verified: npm run test:instance passes.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
```

### Task 2: The parser resolves by declared type

**Files:**

- Modify: `lib/instance.mjs` (the header comment at lines 1-10; `parseInstance` at lines 157-283, replacing the resolution block at lines 175-256; a new `declarationsOf` helper placed after `parseSchemas`)
- Modify: `verify/instance.test.mjs` (four existing cases change, eight new cases arrive)

**Interfaces:**

- Consumes: `schema` and `schemas` from Task 1; `parseSchemas` and `parseBody`, already in `lib/instance.mjs`.
- Produces: `parseInstance(files, { sub = "", schemas })`. Without `schemas` it throws `R16: ...`. Output shape is unchanged: `{ commit, root, rootId, types, entities, edges }`, edges as `{ from, to, via, attrs }`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance.test.mjs`, before the company-of-one block that begins "// A company of one" (line 390):

```js
// R2 says a reference is a type and a name, and the parser reads the type from the schema
// that declares the field. Without the schemas there is nothing to read it from, and a
// fallback to name-only resolution is the mode this parser no longer has.
test("an instance handed no schemas is an error, not a name-only fallback", () => {
  assert.throws(() => parseInstance(valid), /^Error: R16: .*schemas/);
});

test("a page whose type no schema declares is an error", () => {
  const files = new Map(valid);
  files.set("surfaces/site.md", "# Site\n\n> A place.\n\n## Rules\n\nText.\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R13: .*surface/);
});

// R16: a field typed anything but a reference draws no edge whatever it says. The profile's
// `location` is a string, so a skill that happens to be called Bergen draws nothing from it
// and the value is kept as written.
test("a string field carrying a canonical name draws nothing", () => {
  const files = new Map(valid);
  files.set("skills/bergen.md", "# Bergen\n\n> A skill named like a city.\n\n## In practice\n\nText.\n");
  const { edges, entities } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via === "location").length, 0);
  assert.equal(entities.find((e) => e.name === "Mira Halvorsen").fields.location, "Bergen");
});

// `ref? → identity` resolves against identities and nothing else. A value that names a profile
// and no identity is a fact, not an edge to the profile.
test("a ref? that names an entity of another type stays a fact", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\norganization: Mira Halvorsen\n---\n\n# Freelance\n\n> Ongoing.\n");
  const { edges, entities } = parseInstance(files, { schemas });
  const exp = entities.find((e) => e.type === "experience");
  assert.equal(edges.filter((x) => x.from === exp.id && x.via === "organization").length, 0);
  assert.equal(exp.fields.organization, "Mira Halvorsen");
});

// R4: a `ref → skill` that names a source and no skill is unresolvable, and the message names
// the type that was searched so the reader sees it is a type mismatch rather than a typo.
test("a ref that names an entity of another type is an R4 error naming the type searched", () => {
  const files = new Map(valid);
  files.set("sources/local.md", "# Local\n\n> Kept here.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills:\n  - Local\n---\n\n# Splitting\n\n> x\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Local" in .* names no skill/);
});

// A body table draws from the column its schema declares as the reference, wherever that
// column stands. Here the qualifier comes first, and the edge still lands on the skill with
// the level in its attributes.
test("a table draws its edge from the declared reference column, not the first resolving cell", () => {
  const swapped = new Map(schemas);
  swapped.set("profile-schema.md", schema("profile", {
    fields: [["email", "string"], ["location", "string"]],
    tables: { Skills: [["Level", "qualifier → proficiency-level"], ["Skill", "ref → skill"], ["Evidence", "string"]] },
  }));
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Level | Skill | Evidence |\n| --- | --- | --- |\n| Proficient | Java Programming | Owned it. |\n");
  const { edges } = parseInstance(files, { schemas: swapped });
  assert.deepEqual(edges.find((x) => x.via === "Skills.Skill"), {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "proficiency-levels/proficient", Evidence: "Owned it." },
  });
});

// A table whose schema declares no reference is data even when a cell happens to match an H1.
test("a table declaring no reference draws nothing even when a cell names an entity", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Also at\n\n" +
    "| Where | URL |\n| --- | --- |\n| Java Programming | https://example.invalid/mira |\n");
  const { edges } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via.startsWith("Also at")).length, 0);
});

// A qualifier must resolve exactly as a reference must (R16), and its failure names its type.
test("a qualifier that names nothing of its type is an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming | Expert | Owned it. |\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Expert" in .* names no proficiency-level/);
});
```

Then change four existing cases:

The test at line 168, "a table row's first resolving cell is the edge; other cells are attrs, resolved where they can be": rename to `"a table row's declared reference is the edge; a qualifier resolves into its attrs"`. The assertion body stays as it is.

The test at line 226, "a table where something resolves keeps R4 on every row": replace its `assert.throws` line with

```js
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Jva Programming" in .* names no skill/);
```

and rewrite its name to `"a row whose reference column names nothing is an R4 error"`.

The test at line 253, "a scalar frontmatter value that names an entity becomes an edge; one that does not stays a fact": rename to `"a declared reference becomes an edge; a string stays a fact"`. Its body stays: `source` is declared `ref → source` and `group` is `string` in the fixture from Task 1.

The test at line 421, "a reference to a name carried by two types is an error where it is used", and the comment above it: replace both with

```js
// The parser reads the schema, so it resolves `organization` against identities and nothing
// else. The company of one is the case this exists for: the identity and the only profile
// carry the same name, and the experience draws its edge to the identity the schema named.
test("a reference resolves by its declared type when two types share the name", () => {
  const files = new Map([
    ["identity.md", "# Robert Blust\n\n> A company of one.\n\n## What it is\n\nOne person.\n"],
    ["profiles/robert-blust/robert-blust.md",
     "# Robert Blust\n\n> The person.\n\n## Summary\n\nText.\n"],
    ["profiles/robert-blust/experiences/2026-now.md",
     "---\nstart: 2026-06\norganization: Robert Blust\n---\n\n# Now\n\n> Ongoing.\n\n## Achievements\n\n- Text.\n"],
  ]);
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.filter((x) => x.via === "organization"), [{
    from: "profiles/robert-blust/experiences/2026-now", to: "identity", via: "organization", attrs: {},
  }]);
});
```

- [ ] **Step 2: Run the suite and watch the new cases fail**

```bash
npm run test:instance 2>&1 | grep -E "^(not ok|ok)" | head -50; echo
npm run test:instance >/dev/null 2>&1; echo "exit: $?"
```

Expected: exit 1. The failing cases are the eight new ones plus the company-of-one case (which now expects an edge and gets a throw). Every other case still passes.

- [ ] **Step 3: Replace the resolution block in the parser**

In `lib/instance.mjs`, replace the signature at line 157 and everything from the comment "// A canonical name identifies an entity within its type" (line 175) through `edges.sort(...)` (line 256) with:

```js
export function parseInstance(files, { sub = "", schemas } = {}) {
  // R16 makes the declared type the only thing that decides what a field is, so an instance is
  // read beside its schemas or not at all. Resolving by name alone is not a fallback here; it
  // is the mode this parser no longer has.
  if (!schemas) throw new Error("R16: an instance is read against its schemas, and none were given");
  const declared = declarationsOf(schemas);
```

(keep the existing entity walk from `const entities = [], typeMap = new Map();` through `entities.sort(...)` unchanged, then continue with)

```js
  // R2: a canonical name identifies an entity within its type, so the index is one map per
  // type and two entities of one type sharing a name is the error it always was. Two entities
  // of different types may share one — the company of one, where the identity and the only
  // profile are the same human — and the declared type is what chooses between them.
  const byType = new Map();
  for (const e of entities) {
    if (!byType.has(e.type)) byType.set(e.type, new Map());
    const names = byType.get(e.type);
    if (names.has(e.name)) throw new Error(`R2: two ${e.type} entities share the name "${e.name}"`);
    names.set(e.name, e.id);
  }

  // One written value against one declaration. A `ref` and a `qualifier` must resolve (R4,
  // R16); a `ref?` that names nothing of its type stays a fact and returns null. Nothing here
  // looks in any type but the declared one, which is why a name that exists under another
  // type reads as unresolvable rather than ambiguous.
  const resolve = (decl, value, where) => {
    const id = byType.get(decl.target)?.get(value) ?? null;
    if (id) return id;
    if (decl.form === "ref?") return null;
    throw new Error(`R4: "${value}" in ${where} names no ${decl.target}`);
  };

  const edges = [];
  for (const e of entities) {
    // R13: a folder under the container is named by a schema, so a page whose type has none is
    // not content and the parser has nothing to read it against.
    const schema = declared.get(e.type);
    if (!schema) throw new Error(`R13: ${e.path} is a ${e.type}, and no schema declares that type`);

    // R16: a declared reference draws an edge from every page that carries it, a list from
    // every entry, and a field declared anything else — or not declared at all — draws
    // nothing and keeps its value. A `location: Bergen` beside a skill called Bergen is a
    // fact, because the schema said string.
    for (const [key, value] of Object.entries(e.fields)) {
      const decl = schema.fields.get(key);
      if (!decl) continue;
      const values = Array.isArray(value) ? value : value === "" ? [] : [value];
      for (const v of values) {
        const to = resolve(decl, v, e.path);
        if (to) edges.push({ from: e.id, to, via: key, attrs: {} });
      }
    }

    // A body table draws from the one column its schema declares as a reference, wherever it
    // stands; the other declared columns are qualifiers and resolve into the edge's attributes
    // (R16). A table whose schema declares no reference — an Also at, a References — draws
    // nothing and is data, whatever its cells happen to say. A row whose `ref?` column names
    // nothing stays data too; a row whose `ref` column names nothing is the R4 it always was.
    for (const s of e.sections) {
      const columns = schema.tables.get(s.heading);
      if (!s.table || !columns) continue;
      const reference = [...columns.entries()].find(([, d]) => d.form !== "qualifier");
      if (!reference) continue;
      const [refName, refDecl] = reference;
      for (const row of s.table.rows) {
        const attrs = {};
        let to = null;
        s.table.columns.forEach((col, i) => {
          const cell = row[i] ?? "";
          if (col === refName) { to = resolve(refDecl, cell, e.path); return; }
          const d = columns.get(col);
          attrs[col] = d ? resolve(d, cell, e.path) ?? cell : cell;
        });
        if (!to) continue;
        edges.push({ from: e.id, to, via: `${s.heading}.${refName}`, attrs });
      }
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));
```

The rest of `parseInstance` (the `types` line, the stamp loop, the identity root and the `return`) stays as it is. Delete the `byId`, `byName`, `one` helpers and the old `resolve`; nothing else uses them.

- [ ] **Step 4: Add the declarations reader after `parseSchemas`**

Append to the end of `lib/instance.mjs`:

```js
// What every schema declares about the type it describes, read from the same two tables
// parseSchemas turns into type-level edges — a Frontmatter row and a captioned column table's
// row whose Type cell names a type — so there is one reader of a schema's tables here, not
// two. The result is per type: `fields` maps a frontmatter field to its declaration, `tables`
// maps a section heading to the declarations of its columns. A declaration is
// `{ form, target }` where `form` is `ref`, `ref?` or `qualifier`; a field declared any other
// way is absent, which is what makes it a fact (R16).
const DECLARATION = /^(?:array of )?(ref\??|qualifier) → (.+)$/;
function declarationsOf(schemas) {
  const declared = new Map();
  const bare = (cell) => (cell ?? "").replace(/`/g, "").trim();
  const readInto = (table, keyColumn, into) => {
    const k = table.columns.indexOf(keyColumn), t = table.columns.indexOf("Type");
    if (k < 0 || t < 0) return;
    for (const row of table.rows) {
      const m = bare(row[t]).match(DECLARATION);
      if (m) into.set(bare(row[k]), { form: m[1], target: m[2].trim() });
    }
  };
  for (const e of parseSchemas(schemas).entities) {
    const type = e.id.slice("core/".length);
    const fields = new Map(), tables = new Map();
    const frontmatter = e.sections.find((s) => s.heading === "Frontmatter");
    if (frontmatter?.table) readInto(frontmatter.table, "Field", fields);
    for (const t of e.sections.find((s) => s.heading === "Sections")?.tables ?? []) {
      const heading = t.caption?.match(/^`##\s*([^`]+)`/);
      if (!heading) continue;
      const columns = new Map();
      readInto(t, "Column", columns);
      tables.set(heading[1].trim(), columns);
    }
    declared.set(type, { fields, tables });
  }
  return declared;
}
```

`parseSchemas` is defined with `function`, so it is hoisted and the call from `parseInstance` above it resolves.

- [ ] **Step 5: Rewrite the parser's header comment**

Replace lines 1-10 of `lib/instance.mjs`:

```js
// Turns one instance — a map of path → Markdown, beside a map of the schemas it is written
// against — into the graph the example page draws.
//
// It reads the fixed shape: YAML frontmatter as key/scalar or key/list, the H1 as the canonical
// name, the `>` tagline, `##` sections as heading plus text, a table by its header row. Types
// are folder names singularised by R7, ownership is nesting on disk (R5, R6). The schema for a
// page's type is the one thing consulted beyond the shape, and it decides everything about
// edges (R16): a field or column it declares as a reference resolves against the type it
// names and draws an edge, a qualifier resolves and draws nothing, and anything else is a
// fact. A reference that resolves to nothing is an R4 error here, so the page can never draw a
// line to nowhere. CONVENTIONS.md in companygraph/meta-model is the source of the rule numbers.
//
// Pure: no filesystem, no network, so verify/instance.test.mjs can feed it fixture maps.
```

- [ ] **Step 6: Run every suite**

```bash
npm run test:instance; echo "exit: $?"
npm run test:rules; echo "exit: $?"
npm run verify; echo "exit: $?"
```

Expected: all three exit 0. `test:rules` reads the parser's comments and error messages for rule numbers; R2, R4, R13 and R16 all exist. If `test:instance` fails on the deep-equal in "an entity is its H1, tagline, fields, sections and path", the entity shape changed — it must not; the fix is in the parser, not the test.

- [ ] **Step 7: Prove the example still parses to the same graph**

The parser has no script that reads `example/` from disk, so read it inline and compare with the last commit's parser:

```bash
cat > /tmp/parse-example.mjs <<'EOF'
import { readdirSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseInstance } from "./lib/instance.mjs";
const walk = (rel, into) => { for (const n of readdirSync(rel)) { const p = join(rel, n); statSync(p).isDirectory() ? walk(p, into) : into.set(p, readFileSync(p, "utf8")); } return into; };
const strip = (m, prefix) => new Map([...m].map(([k, v]) => [k.slice(prefix.length), v]));
const files = strip(walk("example/model", new Map()), "example/model/");
const schemas = strip(walk("core", new Map()), "core/");
const g = parseInstance(files, { sub: "example/model/", ...(process.argv[2] === "typed" ? { schemas } : {}) });
console.log(JSON.stringify({ entities: g.entities.length, edges: g.edges.map((e) => `${e.from} -${e.via}-> ${e.to}`).sort() }, null, 1));
EOF
cp /tmp/parse-example.mjs ./parse-example.tmp.mjs
node parse-example.tmp.mjs typed > /tmp/typed.json; echo "exit: $?"
git stash push lib/instance.mjs -q && node parse-example.tmp.mjs > /tmp/blind.json; git stash pop -q
diff /tmp/blind.json /tmp/typed.json && echo "same graph"
rm parse-example.tmp.mjs
```

Expected: `same graph`. The example was written to satisfy the blind parser, so the typed one must produce identical entities and edges on it. A difference is a finding to report before committing, not a diff to accept.

- [ ] **Step 8: Commit**

```bash
git add lib/instance.mjs verify/instance.test.mjs
git commit -m "$(cat <<'MSG'
The parser resolves by the type its schema declares

R2 says a reference is a type and a name, and R16 says a field typed anything else draws no
edge. The parser read no schema, so it took any value that matched an H1 for a reference and
refused when two types carried one name. Now it reads the schema for the page's type, resolves
each declared reference against the type it names and nothing else, draws a table's edge from
the column the schema declares wherever it stands, and leaves every other value as the fact it
was written as.

An instance handed no schemas is an error rather than a fallback, because name-only resolution
is the mode this removes. On the example the graph is unchanged: same entities, same edges.

Verified: npm run test:instance, npm run test:rules and npm run verify pass; the example parses
to the same graph under both parsers.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
```

### Task 3: Two check assertions retire

**Files:**

- Modify: `lib/checks.mjs` (the comment block at lines 395-410, the `held` helper at lines 444-465, and the column-order branch at lines 515-519)

**Interfaces:**

- Consumes: nothing from earlier tasks; `checks.mjs` imports no parser.
- Produces: `checkInstance` with two fewer failure messages. `verify/instance-checks.test.mjs` asserts neither, so no test changes.

- [ ] **Step 1: Confirm no test names the retired messages**

```bash
cd /Users/rob/git/companygraph/meta-model
grep -n "names nothing\|comes first\|reference but lists" verify/instance-checks.test.mjs verify/check.mjs; echo "exit: $?"
```

Expected: exit 1 (no match). If a match appears, that test is deleted in this task too.

- [ ] **Step 2: Rewrite the equivalence comment**

Replace the paragraph in the comment block beginning "This script imports no parser, so it cannot observe an edge." (lines 397-403) with:

```js
    // This script imports no parser, so it cannot observe an edge. It does not have to. A
    // declared reference draws an edge exactly when its value is the H1 of an entity of the
    // declared type, and nothing else draws one — which is what R16 says and what the parser
    // does. Both are facts about files this script already reads, so "draws an edge" and
    // "matches an H1 of the declared type" are one question asked in two vocabularies.
```

- [ ] **Step 3: Retire the non-reference assertion**

In the `held` helper, replace

```js
        if (!ref) {
          // 2. Nothing else is drawn. A value that resolves becomes an edge whatever its
          // field is declared, so a non-reference carrying a canonical name is a declaration
          // and a graph that disagree — the finding this check was written for.
          if (found)
            fail(
              `${child}: ${where} is declared \`${declared}\` and says "${value}", which is the canonical name of an entity of type ${carriers(value)}; R16 draws an edge from a value that resolves, so declare it \`ref? → <type>\` or write something that names nothing`,
            );
          return;
        }
```

with

```js
        // 2. Nothing else is drawn. A field declared as anything but a reference resolves to
        // nothing whatever it says, so there is nothing to hold such a value to: a string that
        // happens to equal an H1 is a string.
        if (!ref) return;
```

- [ ] **Step 4: Retire the column-order assertion**

Replace the comment beginning "// 4. A column table declares at most one drawing reference, and it stands first." (lines 489-494) with:

```js
      // 4. A column table declares at most one drawing reference. A row is one fact and draws
      // one edge, so a second reference column would be a second claim no row makes. Where
      // the column stands is the schema author's choice: the parser draws from the declared
      // column wherever it is. A table declaring no reference draws nothing and is data, which
      // is a table's other legal shape.
```

and delete the branch

```js
          else if (columns[0] !== draws[0])
            fail(
              `${core}/${type}-schema.md: "## ${section}" declares \`${draws[0].name}\` as its reference but lists \`${columns[0].name}\` first; the parser takes the first cell that resolves, so the reference comes first`,
            );
```

The `if (draws.length > 1) fail(...)` above it stays.

- [ ] **Step 5: Run the suites**

```bash
npm run verify; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
```

Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add lib/checks.mjs
git commit -m "$(cat <<'MSG'
Two checks that guarded the blind parser retire

The instance checks forbade a string field from carrying a canonical name, and required a
schema's reference column to stand first. Both guarded a parser that drew an edge from any
resolving cell; the parser now draws from the declared column and from nothing else, so a
string that equals an H1 is a string and a column's position is the author's choice. What
stays is what a schema means: one reference per table, and a qualifier with nothing to
qualify is still a contradiction.

Verified: npm run verify, npm run test:instance-checks and npm run test:rules pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
```

### Task 4: The rules say what the parser now does

**Files:**

- Modify: `core/CONVENTIONS.md` (R2's fourth paragraph, R9's "So a column table declares" paragraph, R0's list of rules `test:instance` exercises)
- Modify: `README.md` (the import blurb at lines 44-47)

**Interfaces:**

- Consumes: nothing.
- Produces: rule prose that Task 5 ships as core 0.22.0.

- [ ] **Step 1: Rewrite R2's fourth paragraph**

In `core/CONVENTIONS.md`, replace

```
A tool that resolves by name alone — one that recognizes a reference by the value happening to
be a canonical name, rather than by reading the schema that declares it — cannot use the type
to choose between two entities sharing one. It refuses rather than guesses: such a name is an
error where it is used, naming the types it was found under. Resolving to the first match, or
to the one in the nearest folder, is the failure this makes impossible.
```

with

```
A tool resolves a reference by the type its schema declares and the name written, and looks in
no other type. A name that exists only under another type is therefore unresolvable, not
ambiguous, and the error says which type was searched. Resolving to the first match, or to the
one in the nearest folder, is the failure this makes impossible — and so is recognizing a
reference by its value happening to be a canonical name, which is how a string field ends up
drawing an edge nobody declared.
```

- [ ] **Step 2: Rewrite R9's ordering paragraph**

Replace

```
So a column table declares at most one reference, and it is the first column; a table that
qualifies anything declares the reference being qualified, because a qualifier with nothing to
qualify is a cell whose value the parser would draw the edge from. That is what
makes the edge a row draws a matter of the schema rather than of the order somebody typed the
columns in — a parser that takes the first cell to resolve takes the declared reference, and
a qualifier standing before it would quietly take its place. A table declaring no reference at
all draws nothing and is data, which is a table's other legal shape.
```

with

```
So a column table declares at most one reference, and a table that qualifies anything declares
the reference being qualified, because a qualifier with nothing to qualify is an attribute of
an edge that does not exist. Where the reference column stands is the author's choice: the edge
a row draws is a matter of the schema, never of the order somebody typed the columns in, and a
parser draws from the declared column wherever it is. A table declaring no reference at all
draws nothing and is data, which is a table's other legal shape.
```

- [ ] **Step 3: Add R16 to R0's list**

In R0, replace `R2, R3, R4, R5, R6, R7, R9 and R13` with `R2, R3, R4, R5, R6, R7, R9, R11, R13 and R16`. R11 was already cited by the parser and had been left off the list.

- [ ] **Step 4: Update the README's import blurb**

Replace, in `README.md`,

```
— `parseInstance` turns a map of path → Markdown into the graph and `parseSchemas` does the
same for the schemas, both pure: no filesystem, no network, nothing imported at all, which is
```

with

```
— `parseInstance` turns a map of path → Markdown into the graph, read beside a second map of
the schemas it is written against, and `parseSchemas` turns that second map into the graph of
the vocabulary itself. Both are pure: no filesystem, no network, nothing imported at all, which is
```

- [ ] **Step 5: Run the checks**

```bash
npm run verify; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. `verify` reads `core/CONVENTIONS.md` for its rule headings; none moved.

- [ ] **Step 6: Commit**

```bash
git add core/CONVENTIONS.md README.md
git commit -m "$(cat <<'MSG'
The rules describe the typed lookup the parser performs

R2 and R9 each carried a paragraph about a tool that resolves by name alone: what it must
refuse, and why a reference column had to stand first. Neither describes a tool that exists
any longer. R2 now says a reference resolves by declared type and name and looks nowhere else;
R9 keeps one reference per table and frees its position. R16 needed no change, having been
written for this lookup from the start, and R0 now lists it among the rules the parser's tests
exercise.

Verified: npm run verify, npm run test:rules and the conventions check pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
```

### Task 5: Versions, push, pull request

**Files:**

- Modify: `core/manifest.json`, `package.json`, `.github/workflows/instance-check.yml` (lines 6 and 37)

**Interfaces:**

- Produces: the branch `typed-resolution` at 0.22.0, and a pull request the owner merges and tags as `v0.22.0`.

- [ ] **Step 1: Move the four version strings**

```bash
cd /Users/rob/git/companygraph/meta-model
sed -i '' 's/"version": "0\.21\.0"/"version": "0.22.0"/' core/manifest.json package.json
sed -i '' 's/v0\.21\.0/v0.22.0/g' .github/workflows/instance-check.yml
grep -rn "0\.21\.0\|0\.22\.0" core/manifest.json package.json .github/workflows/instance-check.yml
```

Expected: four lines, all `0.22.0`, none `0.21.0`. `shape` still reads 2.

- [ ] **Step 2: Run everything**

```bash
npm run verify; echo "exit: $?"
npm run test:instance; echo "exit: $?"
npm run test:instance-checks; echo "exit: $?"
npm run test:rules; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. `verify` has a "release manifest" check that reads `core/manifest.json` against the tag; with no tag on this commit it passes.

- [ ] **Step 3: Commit**

```bash
git add core/manifest.json package.json .github/workflows/instance-check.yml
git commit -m "$(cat <<'MSG'
Core and the package go to 0.22.0

The parser's call changed and the conventions' prose changed, so both numbers move. A site
importing the parser must now pass the schemas beside the model; an instance re-vendors core
for the two rewritten rules and finds no schema changed.

Verified: npm run verify and the three test suites pass.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
```

- [ ] **Step 4: Push and open the pull request**

```bash
git push -u origin typed-resolution
gh pr create --title "The parser resolves by the type its schema declares" --body "$(cat <<'MSG'
R2 says a reference is a type and a name, and R16 says a field typed anything else draws no edge. The parser read no schema, so it took any value that matched an H1 for a reference and refused when two types carried one name. Three workarounds grew to hide the difference: the refusal on a shared name, a check forbidding a string field from equaling a name, and a rule that a reference column stands first.

`parseInstance` now takes the schemas beside the model and resolves each declared reference against the type it names and nothing else. The two checks retire, R2 and R9 say what the parser does, and R16 stays word for word. On the example the graph is unchanged.

This is 0.22.0 and it breaks the parser's call: a site passes `schemas` or the parser throws. Release notes to write at tagging: what changed for a site (one extra map, read from the core it already has), what breaks (no schemas, no parse), how to take it (the three-place pin an instance moves, and the parser pin plus the extra read a site moves).

Verified: `npm run verify`, `npm run test:instance`, `npm run test:instance-checks`, `npm run test:rules` and the conventions check pass; the example parses to the same graph under both parsers.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge and do not tag.** The owner merges, tags `v0.22.0` and publishes the release with notes in the prose register: what changed for a consumer, what breaks, how to take it.

---

## Phase 2 — robertblust/mental-model

Repository: `/Users/rob/git/robertblust/mental-model`. **Blocked until `v0.22.0` exists on `companygraph/meta-model`.**

### Task 6: Re-vendor core at 0.22.0

**Files:**

- Modify: `meta/core/CONVENTIONS.md`, `meta/core/manifest.json` (copied from the tag, never edited here)
- Modify: `.companygraph/manifest.json` (`tooling`, `core.version`, `core.source`, the `files` hashes)
- Modify: `.github/workflows/companygraph.yml` (`instance-check.yml@v0.21.0` → `@v0.22.0`)
- Modify: `AGENTS.md` if it names `core 0.21.0`

**Interfaces:**

- Consumes: the tag `v0.22.0` on `companygraph/meta-model`.
- Produces: the merge commit Phase 3 pins.

- [ ] **Step 1: Confirm the release exists**

```bash
cd /Users/rob/git/robertblust/mental-model
git checkout main && git pull
gh release view v0.22.0 --repo companygraph/meta-model --json tagName | cat; echo "exit: $?"
```

Expected: exit 0 and the tag name. If not, stop — this phase is blocked.

- [ ] **Step 2: Branch and copy core whole from the tag**

```bash
git checkout -b typed-resolution
rm -rf /tmp/cg-0220
git clone --depth 1 --branch v0.22.0 https://github.com/companygraph/meta-model /tmp/cg-0220
rm -rf meta/core && cp -R /tmp/cg-0220/core meta/core
git status --short meta/core
grep -n '"version"' meta/core/manifest.json
```

Expected: `CONVENTIONS.md` and `manifest.json` modified, no schema file changed, the manifest reads `0.22.0` and `"shape": 2`.

- [ ] **Step 3: Rewrite the instance manifest**

```bash
node -e '
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const m = JSON.parse(fs.readFileSync(".companygraph/manifest.json", "utf8"));
m.tooling = "0.22.0";
m.core = { version: "0.22.0", shape: 2, source: "fetched:v0.22.0" };
const files = {};
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)
  .forEach((e) => { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : (files[p] = "sha256:" + crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")); });
walk("meta/core");
m.files = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
fs.writeFileSync(".companygraph/manifest.json", JSON.stringify(m, null, 2) + "\n");
console.log(Object.keys(m.files).length, "files hashed");'
git diff --stat .companygraph/manifest.json
```

Expected: `15 files hashed`; the diff shows two changed hashes (`CONVENTIONS.md`, `manifest.json`), `tooling`, `core.version` and `core.source`.

- [ ] **Step 4: Move the workflow pin**

Anchor on the file name: `check.yml@` alone also matches the conventions workflow.

```bash
sed -i '' 's|meta-model/.github/workflows/instance-check.yml@v0\.21\.0|meta-model/.github/workflows/instance-check.yml@v0.22.0|' .github/workflows/companygraph.yml
grep -rn "@v" .github/workflows/
grep -n "core 0\.21\.0" AGENTS.md && sed -i '' 's/core 0\.21\.0/core 0.22.0/' AGENTS.md
```

Expected: `companygraph.yml` at `instance-check.yml@v0.22.0`; the conventions workflow untouched. The `grep` on `AGENTS.md` may find nothing, in which case the `sed` does not run and the file stays out of the commit.

- [ ] **Step 5: Run the checker at the new release**

```bash
node /tmp/cg-0220/bin/check-instance.mjs .; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: both exit 0. The R0 agent pass runs by hand against `meta/core/CONVENTIONS.md` (the validate skill does not load for a subagent); the commit's `Verified:` line says what actually ran.

- [ ] **Step 6: Commit, push, open the pull request, stop**

```bash
git add meta/core .companygraph/manifest.json .github/workflows/companygraph.yml
git diff --cached --name-only | grep -q AGENTS.md || true
git commit -m "$(cat <<'MSG'
Core 0.22.0, whose rules say a reference resolves by its declared type

No schema changed. What the release moves is two paragraphs of the conventions, which no longer
describe a tool that resolves by name alone, and the parser a site reads this instance with.
Nothing on any page moves; the instance was already written to the typed rule.

The workflow pin moves with the manifest because the checker refuses a pin it is not.

Verified: the instance checker at v0.22.0 and the prose check pass; the R0 pass was read by hand
against the vendored conventions.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
git push -u origin typed-resolution
gh pr create --title "Core 0.22.0" --body "$(cat <<'MSG'
Re-vendors core at v0.22.0 in the three places an instance takes a release: the vendored folder with fresh hashes, `tooling` in the manifest, and the workflow pin. No schema changed; the release rewrote two rule paragraphs and the parser's call, and this instance was already written to the typed rule, so no page moves.

Sibling: companygraph/meta-model pull request for 0.22.0 (merged and tagged before this).

Verified: the instance checker at v0.22.0 and the prose check pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

If `AGENTS.md` changed in Step 4, add it to the `git add` line. Report the pull request number and the check result. **Do not merge.**

---

## Phase 3 — robertblust.github.io

Repository: `/Users/rob/git/robertblust/robertblust.github.io`. **Blocked until Phase 2 is merged.**

### Task 7: The site passes the core and re-pins the parser

**Files:**

- Modify: `build/model.mjs` (lines 31-37)
- Modify: `source.json` (the `commit`)
- Modify: `package.json`, `package-lock.json` (the parser pin)
- Modify: `model.json` (regenerated; expected byte-identical)

**Interfaces:**

- Consumes: the merge commit of Phase 2 on `robertblust/mental-model`'s `main`; the tag `v0.22.0`.
- Produces: a site building on the typed parser.

- [ ] **Step 1: Branch and take the merge commit**

```bash
cd /Users/rob/git/robertblust/robertblust.github.io
git checkout main && git pull
git checkout -b typed-resolution
gh api repos/robertblust/mental-model/commits/main --jq .sha
```

Confirm the sha is Phase 2's merge commit. Then:

```bash
node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync("source.json", "utf8"));
s.commit = process.argv[1];
fs.writeFileSync("source.json", JSON.stringify(s) + "\n");
console.log(s);' <THE_SHA>
```

- [ ] **Step 2: Move the parser pin and prove the lockfile followed**

```bash
sed -i '' 's|meta-model#v0\.21\.0|meta-model#v0.22.0|' package.json
npm update companygraph-meta-model
grep -n "meta-model" package.json
grep -A3 '"node_modules/companygraph-meta-model"' package-lock.json
gh api repos/companygraph/meta-model/git/refs/tags/v0.22.0 --jq .object.sha
```

Expected: `package.json` names `v0.22.0`; the lockfile block shows `"version": "0.22.0"` and a `resolved` URL ending in the sha the last command prints. If the tag is annotated, the ref's sha points at a tag object; `gh api repos/companygraph/meta-model/git/tags/<sha> --jq .object.sha` gives the commit. A lockfile naming the new tag with the old sha is the hazard this step exists for.

- [ ] **Step 3: Read the core beside the model**

In `build/model.mjs`, replace

```js
const files = await readInstance({ repo, commit, sub: SUB });
```

with

```js
// The vendored core sits beside the container, and the parser reads the model against it:
// R16 makes the declared type the only thing that decides which fields are edges, so the
// schemas travel with the pages they declare.
const CORE = "meta/core/";

const [files, schemas] = await Promise.all([
  readInstance({ repo, commit, sub: SUB }),
  readInstance({ repo, commit, sub: CORE }),
]);
```

and replace

```js
const data = { ...parseInstance(files, { sub: SUB }), commit, repo };
```

with

```js
const data = { ...parseInstance(files, { sub: SUB, schemas }), commit, repo };
```

- [ ] **Step 4: Regenerate and compare**

```bash
npm ci
npm run model; echo "exit: $?"
git diff --stat model.json
```

Expected: exit 0 and **no diff on `model.json`** beyond the `commit` field. The reference instance carries no case the blind parser resolved wrongly, so the typed parser produces the same entities and edges. A changed entity or edge is a finding to report before committing.

- [ ] **Step 5: Run the site's checks**

```bash
npm run model:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. If `pages:check` fails, run `npm run pages` and commit the result with the rest.

- [ ] **Step 6: Commit, push, open the pull request, stop**

```bash
git add build/model.mjs source.json package.json package-lock.json model.json
git commit -m "$(cat <<'MSG'
The site reads the model beside the core it is written against

The parser at 0.22.0 resolves a reference by the type its schema declares, and takes the
schemas as a second map. The build reads the vendored core from the same commit it reads the
model from and hands both over. The model pin moves to the instance's own re-vendor of that
release, and the graph is unchanged: same entities, same edges.

Verified: npm run model:check, pages:check, og:check, verify and the conventions check pass;
the lockfile resolves the parser to the sha v0.22.0 points at.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
git push -u origin typed-resolution
gh pr create --title "The site reads the model beside its core" --body "$(cat <<'MSG'
Meta-model 0.22.0 changed the parser's call: it resolves by declared type and takes the schemas as a second map. The build reads `meta/core/` from the pinned commit alongside `model/` and passes both. The instance pin moves to the merge commit of the instance's re-vendor. `model.json` is unchanged apart from the commit, which is the expected result and was checked.

Siblings: companygraph/meta-model 0.22.0 and robertblust/mental-model "Core 0.22.0", both merged before this.

Verified: `npm run model:check`, `pages:check`, `og:check`, `verify` and the conventions check pass; the lockfile's resolved sha matches the tag.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.**

---

## Phase 4 — companygraph/companygraph.github.io

Repository: `/Users/rob/git/companygraph/companygraph.github.io`. **Blocked until Phase 1 is merged and tagged.** It does not wait for Phase 2.

### Task 8: The example target passes the core and re-pins

**Files:**

- Modify: `build/build.mjs` (the `TARGETS` array at lines 42-54 and the loop at line 100)
- Modify: `source.json` (the `commit`)
- Modify: `package.json`, `package-lock.json` (the parser pin)
- Modify: `example.json`, `model.json` (regenerated)

**Interfaces:**

- Consumes: the merge commit of Phase 1 on `companygraph/meta-model`'s `main`; the tag `v0.22.0`.

- [ ] **Step 1: Branch, take the merge commit, move both pins**

```bash
cd /Users/rob/git/companygraph/companygraph.github.io
git checkout main && git pull
git checkout -b typed-resolution
gh api repos/companygraph/meta-model/commits/main --jq .sha
```

Confirm it is Phase 1's merge commit. Then:

```bash
node -e '
const fs = require("fs");
const s = JSON.parse(fs.readFileSync("source.json", "utf8"));
s.commit = process.argv[1];
fs.writeFileSync("source.json", JSON.stringify(s) + "\n");
console.log(s);' <THE_SHA>
sed -i '' 's|meta-model#v0\.21\.0|meta-model#v0.22.0|' package.json
npm update companygraph-meta-model
grep -A3 '"node_modules/companygraph-meta-model"' package-lock.json
gh api repos/companygraph/meta-model/git/refs/tags/v0.22.0 --jq .object.sha
```

Expected: the lockfile's `resolved` sha is the one the tag points at.

- [ ] **Step 2: Give the example target its schemas**

In `build/build.mjs`, change the example entry of `TARGETS`:

```js
  { dir: "example", parse: parseInstance, sub: "example/model/", schemas: "core/" },
```

and in the loop, replace

```js
  const files = process.env.META_MODEL ? await readLocal(target.sub) : await readRemote(target.sub);
```

with

```js
  const read = process.env.META_MODEL ? readLocal : readRemote;
  const files = await read(target.sub);
  // The example is read beside the core it is written against: at 0.22.0 the parser resolves
  // a reference by the type its schema declares, so the schemas travel with the pages. The
  // model target parses the schemas themselves and names none.
  const schemas = target.schemas ? await read(target.schemas) : undefined;
```

and replace

```js
  const data = { ...target.parse(files, { sub: target.sub }), commit };
```

with

```js
  const data = { ...target.parse(files, { sub: target.sub, schemas }), commit };
```

`parseSchemas` ignores an option it does not read, so the model target is unaffected.

- [ ] **Step 3: Rebuild and read the diff**

```bash
npm ci
npm run build; echo "exit: $?"
git diff --stat example.json model.json
```

Expected: both files change only in `commit`. The model target reads `*-schema.md` files alone and no schema changed at 0.22.0, and the example carries no case the blind parser resolved wrongly. A changed entity or edge in either file is a finding to report before committing.

- [ ] **Step 4: Run the site's checks**

```bash
npm run build:check; echo "exit: $?"
npm run pages:check; echo "exit: $?"
npm run og:check; echo "exit: $?"
npm run verify; echo "exit: $?"
sh conventions/conventions-check; echo "exit: $?"
```

Expected: all exit 0. If `pages:check` fails, run `npm run pages` and commit the result with the rest.

- [ ] **Step 5: Commit, push, open the pull request, stop**

```bash
git add build/build.mjs source.json package.json package-lock.json example.json model.json
git commit -m "$(cat <<'MSG'
The example is read beside the core it is written against

The parser at 0.22.0 resolves a reference by the type its schema declares and takes the
schemas as a second map. The example target reads core/ from the same commit and passes it;
the model target parses the schemas themselves and needs nothing. Both pins move to the
release, and the example's graph is unchanged.

Verified: npm run build:check, pages:check, og:check, verify and the conventions check pass;
the lockfile resolves the parser to the sha v0.22.0 points at.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
MSG
)"
git push -u origin typed-resolution
gh pr create --title "The example is read beside its core" --body "$(cat <<'MSG'
Meta-model 0.22.0 changed the parser's call: it resolves by declared type and takes the schemas as a second map. The example target reads `core/` from the pinned commit alongside `example/model/` and passes both; the model target is unchanged. Both pins move to the release. `example.json` changes only in its commit, which was checked.

Sibling: companygraph/meta-model 0.22.0, merged and tagged before this.

Verified: `npm run build:check`, `pages:check`, `og:check`, `verify` and the conventions check pass; the lockfile's resolved sha matches the tag.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
MSG
)"
gh pr checks --watch; echo "exit: $?"
```

Report the pull request number and the check result. **Do not merge.**
