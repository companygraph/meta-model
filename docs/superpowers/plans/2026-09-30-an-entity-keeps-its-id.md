# An entity keeps its id Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page carries an `id` that is set once and never changed or reused, in the format a new required singleton `model/identifier.md` declares; the checks hold it, the CLI makes and backfills it, the parser returns it, and a pull request that changes one on the default branch fails.

**Architecture:** A dependency-free `lib/ids.mjs` makes and reads ids. Core gains R18, `core/identifier-schema.md` and an `id` row in every schema, and `lib/checks.mjs` gains one check that owns `id` whole: present, well formed, unique. `lib/plan.mjs` works out a backfill, `lib/history.mjs` reads first commits and changed pages from git, and `bin/companygraph.mjs` gains `id` and `ids`. The parser keeps resolving on paths internally and hands out the stable id as `id`, the path as `address`. The reusable workflow runs the change check on a pull request.

**Tech Stack:** Node 22 ES modules with no dependencies, `node:crypto`, `node --test`, git.

**Spec:** `docs/superpowers/specs/2026-09-30-an-entity-keeps-its-id-design.md`

This plan covers meta-model only. The MCP server, the Obsidian plugin, the sites' JSON-LD and page addresses, and the three instances each take the release in a plan of their own, after this one ships.

## Global Constraints

- Rule, verbatim, placed in `core/CONVENTIONS.md` directly after the R17 section: `### R18 — An entity keeps its id` followed by the paragraph in the spec's "The rule" section.
- The `id` row, verbatim, first in every schema's `## Frontmatter` table: `` | `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) | ``
- `format` is `uuidv7` or `pattern`. A UUID version 7 is written in lowercase: `/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`.
- No `formerly`, no counter, no type prefix. An old path resolves to nothing.
- The tooling generates only UUID version 7. Under `format: pattern` it checks ids and makes none.
- A backfilled id carries the author time of its file's first commit, found with `git log --follow --diff-filter=A`; a file with no commit takes the moment of the run.
- The parser's `id` is the page's `id` field where it has one and the path otherwise, so an instance on an older core parses as it did. The path is always `address`.
- No version bump in this plan. The release is breaking in `WORKING.md`'s terms, and its number and notes are the owner's.
- Every commit is authored `Implementer <implementer@companygraph.io>`, prose in the git register, ending with a `Verified:` line naming the commands actually run, then `Process: Delivery`, `Phase: Implement`, `Track: Code` and the `Co-Authored-By` line.
- Before any `node` or `gh` command: `export PATH="/opt/homebrew/bin:$PATH"`.

## Review Focus

- A page copied to start another carries the first page's id; the second must fail as a duplicate naming both files. Pinned in Task 3.
- A page with no frontmatter at all, as `sources/local.md` often is, must come out of the backfill with a frontmatter block holding only its id, and the rest of the file byte for byte as it was. Pinned in Task 2.
- A rename that also changes the id, in one pull request, must fail even though the path changed; git's rename detection is what pairs the two. Pinned in Task 6.
- An uppercase UUID, which many tools print, must fail the format check rather than pass as the same id. Pinned in Task 3.
- A consumer calling `rowScope` on the parser's output, whose owner now carries a stable id, must still find the owner's folder. Pinned in Task 4.

---

### Task 1: Ids are made and read in one module

**Files:**

- Create: `lib/ids.mjs`
- Test: `verify/ids.test.mjs`
- Modify: `package.json` (the `test:ids` script)

**Interfaces:**

- Produces: `UUIDV7: RegExp`; `uuidv7(ms?: number, random?: Buffer) → string`; `msOf(id: string) → number`; `idOf(text: string) → string | null`; `withId(text: string, id: string) → string`; `idFormatOf(text: string) → { format: "uuidv7" | "pattern", test: (v: string) → boolean } | { error: string }`.

- [ ] **Step 1: Write the failing tests**

```js
// verify/ids.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { UUIDV7, uuidv7, msOf, idOf, withId, idFormatOf } from "../lib/ids.mjs";

const ZERO = Buffer.alloc(10);

test("a UUID version 7 carries its moment in its first 48 bits, its version and its variant", () => {
  const id = uuidv7(Date.UTC(2026, 7, 29, 7, 57, 8), ZERO);
  assert.match(id, UUIDV7);
  assert.equal(msOf(id), Date.UTC(2026, 7, 29, 7, 57, 8));
  assert.equal(id[14], "7");
  assert.equal(id[19], "8");
});

test("two ids made in one millisecond differ by their random part", () => {
  const ms = Date.now();
  assert.notEqual(uuidv7(ms), uuidv7(ms));
});

test("a moment outside 48 bits is refused", () => {
  assert.throws(() => uuidv7(-1), RangeError);
  assert.throws(() => uuidv7(2 ** 48), RangeError);
});

test("idOf reads the id from the frontmatter only", () => {
  assert.equal(idOf("---\nid: abc\nsource: Local\n---\n\n# X\n"), "abc");
  assert.equal(idOf("# X\n\nid: abc\n"), null);
  assert.equal(idOf("---\nsource: Local\n---\n\n# X\n"), null);
});

test("withId puts the id first in an existing frontmatter and leaves the rest as it was", () => {
  const page = "---\nsource: Local\n---\n\n# X\n";
  assert.equal(withId(page, "abc"), "---\nid: abc\nsource: Local\n---\n\n# X\n");
});

test("withId gives a page with no frontmatter one that holds only the id", () => {
  assert.equal(withId("# Local\n\n> Here.\n", "abc"), "---\nid: abc\n---\n\n# Local\n\n> Here.\n");
});

test("withId refuses a page that already carries an id, since R18 never changes one", () => {
  assert.throws(() => withId("---\nid: a\n---\n\n# X\n", "b"), /R18/);
});

const identifier = (fm) => `---\nid: x\nsource: Local\n${fm}---\n\n# Entity id\n`;

test("uuidv7 accepts a lowercase UUID version 7 and refuses an uppercase one", () => {
  const f = idFormatOf(identifier("format: uuidv7\n"));
  assert.equal(f.format, "uuidv7");
  const id = uuidv7();
  assert.equal(f.test(id), true);
  assert.equal(f.test(id.toUpperCase()), false);
});

test("pattern holds ids to the pattern", () => {
  const f = idFormatOf(identifier("format: pattern\npattern: ^E-[0-9]{4,}$\n"));
  assert.equal(f.format, "pattern");
  assert.equal(f.test("E-0042"), true);
  assert.equal(f.test("E-42"), false);
});

test("a pattern with no anchors, a pattern that is no expression, and a pattern beside uuidv7 are each an error", () => {
  assert.match(idFormatOf(identifier("format: pattern\npattern: E-[0-9]+\n")).error, /anchored/);
  assert.match(idFormatOf(identifier("format: pattern\npattern: ^E-[0-9+$\n")).error, /no regular expression/);
  assert.match(idFormatOf(identifier("format: pattern\n")).error, /no `pattern`/);
  assert.match(idFormatOf(identifier("format: uuidv7\npattern: ^x$\n")).error, /only with `format: pattern`/);
  assert.match(idFormatOf(identifier("format: serial\n")).error, /`uuidv7` or `pattern`/);
});
```

- [ ] **Step 2: Add the script and run it to see it fail**

In `package.json`, add after `"test:instance-files"`: `"test:ids": "node --test verify/ids.test.mjs",`

Run: `npm run test:ids` Expected: FAIL, `Cannot find module '../lib/ids.mjs'`.

- [ ] **Step 3: Write the module**

```js
// lib/ids.mjs
// What an entity's id is (R18), made and read in one place. Pure apart from the random bytes a
// new id takes, which a caller may hand in, and free of every other module here, so the checks,
// the plan and the CLI all import it without importing each other.
import { randomBytes } from "node:crypto";

// A UUID version 7 (RFC 9562), in the lowercase R18 fixes. An uppercase one is a different
// string to every consumer that compares strings, so it is not the same id and fails.
export const UUIDV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// 48 bits of Unix milliseconds, the version, 12 random bits, the variant, 62 random bits.
export function uuidv7(ms = Date.now(), random = randomBytes(10)) {
  if (!Number.isInteger(ms) || ms < 0 || ms >= 2 ** 48) throw new RangeError(`${ms} is no moment a UUID version 7 can hold`);
  const b = Buffer.alloc(16);
  b.writeUIntBE(ms, 0, 6);
  b[6] = 0x70 | (random[0] & 0x0f);
  b[7] = random[1];
  b[8] = 0x80 | (random[2] & 0x3f);
  random.copy(b, 9, 3, 10);
  const h = b.toString("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// The moment an id was made, read back from its first 48 bits.
export const msOf = (id) => parseInt(id.replace(/-/g, "").slice(0, 12), 16);

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const scalar = (fm, field) => fm.match(new RegExp(`^${field}:[ \\t]*(\\S.*?)[ \\t]*$`, "m"))?.[1] ?? null;

export const idOf = (text) => scalar(text.match(FRONTMATTER)?.[1] ?? "", "id");

// The id goes first, where every schema declares it, and nothing else in the file moves. A page
// that has one keeps it: R18 never changes an id, and a writer asked to is refused.
export function withId(text, id) {
  if (idOf(text) !== null) throw new Error("the page already carries an id, and R18 never changes one");
  if (text.startsWith("---\n")) return `---\nid: ${id}\n${text.slice(4)}`;
  return `---\nid: ${id}\n---\n\n${text}`;
}

// What `model/identifier.md` declares, as a test an id either passes or fails. A declaration that
// cannot be read is an error naming why, and the caller reports it once, on the identifier file.
export function idFormatOf(text) {
  const fm = text.match(FRONTMATTER)?.[1] ?? "";
  const format = scalar(fm, "format");
  const pattern = scalar(fm, "pattern");
  if (format === "uuidv7") {
    if (pattern !== null) return { error: "`pattern` is written, and a pattern is written only with `format: pattern`" };
    return { format, test: (v) => UUIDV7.test(v) };
  }
  if (format === "pattern") {
    if (!pattern) return { error: "`format` is `pattern`, and no `pattern` is written" };
    if (!pattern.startsWith("^") || !pattern.endsWith("$")) return { error: "`pattern` is not anchored at both ends, `^` and `$`" };
    let re;
    try {
      re = new RegExp(pattern);
    } catch (e) {
      return { error: `\`pattern\` is no regular expression: ${e.message}` };
    }
    return { format, test: (v) => re.test(v) };
  }
  return { error: `\`format\` is ${format === null ? "missing" : `"${format}"`}; it is \`uuidv7\` or \`pattern\`` };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm run test:ids` Expected: PASS, every test.

- [ ] **Step 5: Commit**

```bash
git add lib/ids.mjs verify/ids.test.mjs package.json
git commit --author "Implementer <implementer@companygraph.io>"
```

Message subject: `Ids are made and read in one module`.

---

### Task 2: A backfill gives every page an id from its first commit

**Files:**

- Modify: `lib/plan.mjs` (add `backfillPlan`)
- Modify: `lib/instance-files.mjs` (add `IDENTIFIER_PAGE`)
- Modify: `lib/history.mjs` (add `firstCommitMsOf`)
- Modify: `bin/companygraph.mjs` (add the `id` and `ids --backfill` commands, the usage lines and the dispatch)
- Test: `verify/plan.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `uuidv7`, `idOf`, `withId` from Task 1; `typeOfPath` from `lib/checks.mjs`.
- Produces: `backfillPlan(files: Map<string,string>, { model = "model", firstCommitMs: (path) → number | null, now = Date.now(), random = () → Buffer }) → Map<string,string>` in `lib/plan.mjs`; `firstCommitMsOf(cwd: string, rel: string) → number | null` in `lib/history.mjs`; `IDENTIFIER_PAGE({ id, source }) → string` in `lib/instance-files.mjs`, which `init` needs in Task 3 and which `plan.mjs` already imports from.

- [ ] **Step 1: Write the failing tests**

Append to `verify/plan.test.mjs` (its imports gain `backfillPlan` from `../lib/plan.mjs`, and `msOf`, `UUIDV7` from `../lib/ids.mjs`):

```js
const MS = Date.UTC(2026, 7, 29);
const tree = () => new Map([
  ["model/README.md", "# The model\n"],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/identity.md", "---\nsource: Local\n---\n\n# Acme\n"],
  ["model/skills/java.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\n---\n\n# Java\n"],
]);

test("the backfill gives a page without an id one stamped with its first commit, and leaves a README alone", () => {
  const writes = backfillPlan(tree(), { firstCommitMs: () => MS });
  assert.equal(writes.has("model/README.md"), false);
  assert.equal(writes.has("model/skills/java.md"), false);
  const local = writes.get("model/sources/local.md");
  assert.match(local, /^---\nid: [0-9a-f-]{36}\n---\n\n# Local\n\n> Here\.\n$/);
  assert.equal(msOf(local.slice(8, 44)), MS);
});

test("a page with no commit takes the moment of the run", () => {
  const writes = backfillPlan(tree(), { firstCommitMs: () => null, now: MS + 5 });
  assert.equal(msOf(writes.get("model/identity.md").slice(8, 44)), MS + 5);
});

test("the backfill writes model/identifier.md where there is none, with the identity's source", () => {
  const page = backfillPlan(tree(), { firstCommitMs: () => MS }).get("model/identifier.md");
  assert.match(page, /^---\nid: [0-9a-f-]{36}\nsource: Local\nformat: uuidv7\n---\n\n# Entity id\n/);
  assert.match(page.slice(8, 44), UUIDV7);
});

test("run twice, the backfill writes nothing the second time", () => {
  const files = tree();
  for (const [path, text] of backfillPlan(files, { firstCommitMs: () => MS })) files.set(path, text);
  assert.equal(backfillPlan(files, { firstCommitMs: () => MS }).size, 0);
});
```

Append to `verify/cli.test.mjs`:

```js
test("id prints one fresh UUID version 7", () => {
  assert.match(run(["id"]).trim(), /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("ids --backfill stamps an instance's pages with their first commit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // init writes ids from Task 3 on; strip them so this test holds before and after it.
  for (const rel of ["model/identity.md", "model/vision.md", "model/brand.md", "model/sources/local.md"]) {
    const full = path.join(root, rel);
    fs.writeFileSync(full, fs.readFileSync(full, "utf8").replace(/^id: .*\n/m, "").replace(/^---\n---\n\n/, ""));
  }
  fs.rmSync(path.join(root, "model/identifier.md"), { force: true });
  const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...a], { cwd: root });
  g("init", "-q");
  g("add", "-A");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "commit", "-qm", "first"], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-29T09:57:08+02:00" },
  });
  run(["ids", root, "--backfill"]);
  const id = fs.readFileSync(path.join(root, "model/identity.md"), "utf8").match(/^id: (.+)$/m)[1];
  assert.equal(parseInt(id.replace(/-/g, "").slice(0, 12), 16), Date.parse("2026-08-29T07:57:08Z"));
  assert.ok(fs.existsSync(path.join(root, "model/identifier.md")));
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:plan && npm run test:cli` Expected: FAIL, `backfillPlan` is not exported, and `id` is an unknown command.

- [ ] **Step 3: Write `backfillPlan` and `IDENTIFIER_PAGE`**

In `lib/instance-files.mjs`, import `uuidv7` from `./ids.mjs` (Task 3 uses it there) and append:

```js
// The identifier file a backfill writes where an instance has none: UUID version 7, the format
// the tooling makes, with the source the identity names. An instance that means another format
// edits the file before its first new page.
export const IDENTIFIER_PAGE = ({ id, source }) =>
  `---\nid: ${id}\nsource: ${source}\nformat: uuidv7\n---\n\n# Entity id\n\n` +
  "> An entity keeps this id through every rename and every language it is written in, so whatever holds one outside the model still finds the entity.\n";
```

In `lib/plan.mjs`, extend the imports: `import { isNewer, typeOfPath } from "./checks.mjs";`, `import { uuidv7, idOf, withId } from "./ids.mjs";`, and add `IDENTIFIER_PAGE` to the existing import from `./instance-files.mjs`, then append:

```js
// R18 for an instance written before it: every entity page without an id gets one stamped with
// the moment its file was first committed, so the ids sort as the entities came into the model.
// A README and a file no type claims are not entities and are left alone; a page that has an id
// keeps it. Run twice, it writes nothing the second time.
export function backfillPlan(files, { model = "model", firstCommitMs, now = Date.now(), random } = {}) {
  const make = (ms) => (random ? uuidv7(ms, random()) : uuidv7(ms));
  const writes = new Map();
  for (const [path, text] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (typeof text !== "string" || !path.endsWith(".md") || !typeOfPath(path, model)) continue;
    if (idOf(text) !== null) continue;
    writes.set(path, withId(text, make(firstCommitMs(path) ?? now)));
  }
  const identifier = `${model}/identifier.md`;
  if (!files.has(identifier)) {
    const identity = files.get(`${model}/identity.md`) ?? "";
    const source = identity.match(/^source:[ \t]*(\S.*?)[ \t]*$/m)?.[1] ?? "Local";
    writes.set(identifier, IDENTIFIER_PAGE({ id: make(now), source }));
  }
  return writes;
}
```

`typeOfPath` returns a type for `identifier.md` only once Task 3 adds it to `TYPES`; until then the identifier page is written by the branch above, and a second run still writes nothing because `files.has(identifier)` is then true.

- [ ] **Step 4: Write `firstCommitMsOf`**

Append to `lib/history.mjs`:

```js
// The author time of a file's first commit, followed across renames, in milliseconds; null when
// the file has none, as a page not yet committed has not. A shallow clone answers with its own
// first commit, so the backfill is run in a full clone.
export function firstCommitMsOf(cwd, rel) {
  try {
    const out = git(cwd, ["log", "--follow", "--diff-filter=A", "--format=%at", "--", rel]).trim().split("\n").filter(Boolean);
    return out.length ? Number(out[out.length - 1]) * 1000 : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Add the commands**

In `bin/companygraph.mjs`:

- Imports: add `backfillPlan` to the `../lib/plan.mjs` import, `firstCommitMsOf` to the `../lib/history.mjs` import, and `import { uuidv7 } from "../lib/ids.mjs";`.
- Header comment, after the `seats` line: `//   companygraph id` and `//   companygraph ids [<folder>] (--backfill | --range <a>..<b>)`.
- `USAGE`, after the `seats` line: `  id                  print a fresh id, a UUID version 7` and `  ids [<folder>]      give every page an id from its first commit, or refuse an id a range changed`; and after `seats: --since <date>  --json`: `ids: --backfill  --range <a>..<b>`.
- Before `async function menu()`:

```js
// R18. `--backfill` gives every page without an id one stamped with its first commit and writes
// model/identifier.md where there is none; `--range` is Task 6's.
function ids(argv) {
  const { positional, options } = flags(argv);
  const root = resolve(positional[0] ?? ".");
  if (!isInstance(root)) {
    console.error(`✗ ${root} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
    return 1;
  }
  if (options.backfill) {
    const files = new Map();
    const walk = (rel) => {
      for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(child);
        else if (entry.name.endsWith(".md")) files.set(child, unixLines(readFileSync(join(root, child), "utf8")));
      }
    };
    walk("model");
    const top = gitTop(root);
    const writes = backfillPlan(files, { firstCommitMs: (rel) => (top ? firstCommitMsOf(root, rel) : null) });
    writePlan(root, writes);
    console.log(`✓ ${writes.size ? `wrote an id into ${writes.size === 1 ? "one page" : "each page listed"}` : "every page already carries an id"}`);
    for (const path of writes.keys()) console.log(`  ${path}`);
    return 0;
  }
  console.error("✗ ids needs --backfill or --range <a>..<b>");
  return 1;
}
```

- Dispatch, after the `seats` line: `else if (command === "id") console.log(uuidv7());` and `else if (command === "ids") process.exitCode = ids(rest);`.

Read `flags` at the top of the file before writing this: if it returns another shape than `{ positional, options }` with boolean flags as `true` and valued flags as strings, use its shape, and keep the command's behavior as above.

- [ ] **Step 6: Run the tests**

Run: `npm run test:plan && npm run test:cli` Expected: PASS, every test.

- [ ] **Step 7: Commit**

Subject: `A backfill gives every page an id from its first commit`. Files: `lib/plan.mjs lib/instance-files.mjs lib/history.mjs bin/companygraph.mjs verify/plan.test.mjs verify/cli.test.mjs`.

---

### Task 3: Core declares the id, and the checks hold it

**Files:**

- Modify: `core/CONVENTIONS.md` (R18 after R17)
- Create: `core/identifier-schema.md`
- Modify: every `core/*-schema.md` (the `id` row, first in `## Frontmatter`)
- Modify: `lib/checks.mjs` (the `TYPES` row, the singular-file guard, the required-field check, the new R18 check)
- Modify: `lib/instance-files.mjs` (`startingEntities` writes ids and `model/identifier.md`)
- Modify: `example/model/**` (by running the backfill)
- Test: `verify/identifier.test.mjs`; `package.json` (`test:instance-checks` gains the file)

**Interfaces:**

- Consumes: `idOf`, `idFormatOf`, `uuidv7` from Task 1; `backfillPlan`, `IDENTIFIER_PAGE` from Task 2; `firstCommitMsOf` from Task 2.
- Produces: the check named `"every entity carries an id in the declared format, and no two share one"`, rule `R18`, and its four failure texts, which Task 6 and the instances' plans quote:
  - `<path>: no \`id\`, which R18 gives every page — \`companygraph id\` prints a fresh one`
  - `<path>: \`id\` is "<value>", which is not the <format> <model>/identifier.md declares (R18)`
  - `<path>: \`id\` "<value>" is also <other path>'s; an id is unique within the instance (R18)`
  - `<model>/identifier.md: <idFormatOf error> (R18)`

- [ ] **Step 1: Write the failing tests**

```js
// verify/identifier.test.mjs
// R18 through the real identifier schema: core/identifier-schema.md is read from disk, so the
// test fails if the schema and the check part. Only R18's failures are asserted.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const read = (name) => fs.readFileSync(new URL(`../core/${name}`, import.meta.url), "utf8");
const A = uuidv7(), B = uuidv7(), C = uuidv7();
const IDENTIFIER = (fm = "format: uuidv7\n") => `---\nid: ${C}\nsource: Local\n${fm}---\n\n# Entity id\n\n> What an id is for.\n`;

const tree = ({ identifier = IDENTIFIER(), local = `---\nid: ${A}\n---\n\n# Local\n\n> Here.\n`, extra = [] } = {}) => new Map([
  ["meta/core/identifier-schema.md", read("identifier-schema.md")],
  ["meta/core/source-schema.md", read("source-schema.md")],
  ["model/sources/local.md", local],
  ...(identifier === null ? [] : [["model/identifier.md", identifier]]),
  ...extra,
]);
const r18 = (files) => checkInstance(files, { core: "meta/core", model: "model" }).failures.filter((f) => f.includes("R18"));

test("pages that each carry a UUID version 7 of their own pass", () => {
  assert.deepEqual(r18(tree()), []);
});

test("a page with no id fails, and says how to make one", () => {
  const f = r18(tree({ local: "# Local\n\n> Here.\n" }));
  assert.deepEqual(f, ["model/sources/local.md: no `id`, which R18 gives every page — `companygraph id` prints a fresh one"]);
});

test("an uppercase UUID fails the format", () => {
  const f = r18(tree({ local: `---\nid: ${A.toUpperCase()}\n---\n\n# Local\n` }));
  assert.equal(f.length, 1);
  assert.match(f[0], /is not the uuidv7 model\/identifier\.md declares/);
});

test("a page copied with its id fails as a duplicate, naming both files", () => {
  const f = r18(tree({ extra: [["model/sources/copy.md", `---\nid: ${A}\n---\n\n# Copy\n`]] }));
  assert.equal(f.length, 1);
  assert.match(f[0], /model\/sources\/copy\.md: `id` ".+" is also model\/sources\/local\.md's/);
});

test("the identifier's own id counts: a page sharing it fails", () => {
  const f = r18(tree({ local: `---\nid: ${C}\n---\n\n# Local\n` }));
  assert.equal(f.length, 1);
});

test("a pattern the identifier declares holds every id", () => {
  const identifier = `---\nid: E-0001\nsource: Local\nformat: pattern\npattern: ^E-[0-9]{4}$\n---\n\n# Entity id\n`;
  assert.deepEqual(r18(tree({ identifier, local: "---\nid: E-0002\n---\n\n# Local\n" })), []);
  assert.equal(r18(tree({ identifier, local: "---\nid: E-2\n---\n\n# Local\n" })).length, 1);
});

test("an unanchored pattern is the identifier's failure, once, and no page is held to it", () => {
  const f = r18(tree({ identifier: IDENTIFIER("format: pattern\npattern: E-[0-9]+\n") }));
  assert.deepEqual(f, ["model/identifier.md: `pattern` is not anchored at both ends, `^` and `$` (R18)"]);
});

test("an instance with no identifier file fails as a missing singular file", () => {
  const all = checkInstance(tree({ identifier: null }), { core: "meta/core", model: "model" }).failures;
  assert.ok(all.some((f) => f.startsWith("model/identifier.md is missing")));
});

test("a core with no identifier schema holds no page to R18, and asks for no identifier file", () => {
  const files = tree({ identifier: null, local: "# Local\n" });
  files.delete("meta/core/identifier-schema.md");
  const all = checkInstance(files, { core: "meta/core", model: "model" }).failures;
  assert.deepEqual(all.filter((f) => f.includes("R18") || f.includes("identifier")), []);
});
```

In `package.json`, append ` verify/identifier.test.mjs` to the `test:instance-checks` script's file list.

- [ ] **Step 2: Run it to see it fail**

Run: `node --test verify/identifier.test.mjs` Expected: FAIL, `ENOENT` on `core/identifier-schema.md`.

- [ ] **Step 3: Write R18**

In `core/CONVENTIONS.md`, directly after the R17 section and before `### R8`, add:

```markdown
### R18 — An entity keeps its id

Every page carries an `id` in its frontmatter, in the format the instance's identifier file declares. It is unique within the instance, it is set when the entity is made and never changed once it is on the default branch, and the id of a deleted entity is never used again. An id means nothing: it carries no name, type, language or owner, because each of those can change and the id cannot.

An id works like the key of a database row. A deleted row is gone, a consumer that holds its key finds nothing, and the key is never handed to another row. So an old name is not kept as a second way in: R3 and R4 hold every reference to the current name, and an id is what a reader outside the model holds instead.
```

In the paragraph that begins "Which rules those scripts reach is worth stating plainly", change "R15 and R16 against this repository's own files" to "R15, R16 and R18 against this repository's own files".

- [ ] **Step 4: Write the identifier schema**

Create `core/identifier-schema.md`:

````markdown
# Identifier Schema

> Required structure for the identifier file: what an entity's id looks like in this instance.

## File Location

`model/identifier.md`

An instance has one way of writing ids, so the type is a file directly in the container rather than a folder (R6, R13), named for the type rather than for the slug of its H1 (R12), which leaves the H1 free to be a name.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |
| `source` | Yes | ref → source | Where this page's facts are mastered — the H1 of a file in `model/sources/` |
| `format` | Yes | enum | `uuidv7` or `pattern`. `uuidv7` is a UUID version 7 (RFC 9562), written in lowercase; `pattern` is whatever the `pattern` field matches. |
| `pattern` | No | string | A regular expression every id matches in full, from `^` to `$`. Written when `format` is `pattern`, and absent otherwise. |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| `# [Name]` | Yes | What the instance calls its ids |
| `> [Statement]` | Yes | One paragraph on what an id here is for, and who holds on to one |
| `## References` | No | Table. The specification the format follows; its columns are declared below. |

`## References` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| `What` | Yes | string | The kind of document — a specification, a registry |
| `URL` | Yes | string | Where it is |

## Purpose

The identifier file says what shape the `id` on every page takes, so that a person, an agent or an outside system holding an id knows what it is, and so that the checks can hold every page to that shape. The rules an id obeys are the same in every instance and are R18's, not this page's: it is set once, never changed and never reused.

## Writing rules

- A `pattern` matches nothing taken from the entity: not its name, its type, its language or its owner, since each of those can change and the id cannot.
- The statement names who relies on the id: a tracker, a graph, a link somebody wrote down.
- An instance that declares `pattern` says in its own agent file how a new id is made, since the tooling makes only UUID version 7.
- Names and prose are American English (R14).
````

- [ ] **Step 5: Give every schema the `id` row**

Run from the repository root:

```bash
node -e '
const fs = require("fs");
const ROW = "| `id` | Yes | string | What identifies this entity for as long as it exists, in the format `model/identifier.md` declares (R18) |";
for (const f of fs.readdirSync("core").filter((n) => n.endsWith("-schema.md") && n !== "identifier-schema.md")) {
  const p = "core/" + f, t = fs.readFileSync(p, "utf8");
  const head = "## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n";
  if (!t.includes(head)) { console.error("no frontmatter table: " + p); process.exitCode = 1; continue; }
  if (t.includes(ROW)) continue;
  fs.writeFileSync(p, t.replace(head, head + ROW + "\n"));
}'
git diff --stat core/
```

Expected: every schema but the identifier's changes by one line, and nothing prints `no frontmatter table`. If one does, open it and add the row by hand in the same place.

- [ ] **Step 6: Declare the type and write the check**

In `lib/checks.mjs`:

1. Import: `import { idOf, idFormatOf } from "./ids.mjs";` below the existing import from `./instance.mjs`.
2. In `TYPES`, after the `brand` row:

```js
  // An instance has one way of writing ids (R18), so its declaration is one file in the
  // container, as the brand is, named for the type.
  { type: "identifier", file: "identifier.md" },
```

3. In "the container holds what the types imply", change the singular loop so a core without a type's schema asks for no file of it:

```js
      for (const { type, file } of SINGULAR)
        if (read(`${core}/${type}-schema.md`) !== null && !top.includes(file))
          fail(`${EX}/${file} is missing — a singular type's entity, written against ${core}/${type}-schema.md`);
```

4. In "required frontmatter fields are present", skip `id`, which the R18 check owns whole, so a missing id is one failure and not two: change the first line of the inner loop to `for (const { field, declared, description } of fields) { if (field === "id") continue;`, keeping the rest of the body as it is.
5. After the "required frontmatter fields are present" check, add:

```js
  {
    // R18: every page carries an id, in the format the identifier file declares, and no two share
    // one. It owns `id` whole, presence included, so the required-field check above leaves it be.
    // The duplicate it exists for is a page copied to start another, which brings its id along.
    // Whether an id changed on the default branch is history, which a tree cannot see; that is
    // `companygraph ids --range`, run on a pull request.
    name: "every entity carries an id in the declared format, and no two share one",
    rule: "R18",
    run() {
      if (read(`${core}/identifier-schema.md`) === null) return;
      const identifier = read(`${EX}/identifier.md`);
      let format = null;
      if (identifier !== null) {
        const declared = idFormatOf(identifier);
        if (declared.error) fail(`${EX}/identifier.md: ${declared.error} (R18)`);
        else format = declared;
      }
      const seen = new Map();
      walkMd(EX, (child, text) => {
        if (!typeOfFile(child)) return;
        const id = idOf(text);
        if (id === null) return fail(`${child}: no \`id\`, which R18 gives every page — \`companygraph id\` prints a fresh one`);
        if (format && !format.test(id))
          fail(`${child}: \`id\` is "${id}", which is not the ${format.format} ${EX}/identifier.md declares (R18)`);
        if (seen.has(id)) fail(`${child}: \`id\` "${id}" is also ${seen.get(id)}'s; an id is unique within the instance (R18)`);
        else seen.set(id, child);
      });
    },
  },
```

- [ ] **Step 7: Run the new test**

Run: `node --test verify/identifier.test.mjs` Expected: PASS, every test.

- [ ] **Step 8: Init writes ids**

In `lib/instance-files.mjs`, change `startingEntities` so every page it writes opens with its own id, and add the identifier file:

```js
export function startingEntities({ name, id = () => uuidv7() }) {
  return new Map([
    ["model/sources/local.md", `---\nid: ${id()}\n---\n\n# Local\n\n> Written here, in this repository, and mastered nowhere else.\n`],
    ["model/identity.md", `---\nid: ${id()}\nsource: Local\n---\n\n# ${name}\n\n> One paragraph saying what this company is.\n\n` +
      "## What it is\n\nWhat the company does, and for whom.\n"],
    // vision.md and brand.md: the same text as today, with `id: ${id()}\n` inserted directly after the opening `---\n`.
    ["model/identifier.md", IDENTIFIER_PAGE({ id: id(), source: "Local" })],
  ]);
}
```

Write the vision and brand entries out in full, with their existing text and the inserted id line; the comment above stands in for nothing in the real file.

- [ ] **Step 9: Backfill the example**

```bash
node --input-type=module -e '
import fs from "node:fs";
import path from "node:path";
import { backfillPlan } from "./lib/plan.mjs";
import { firstCommitMsOf } from "./lib/history.mjs";
import { unixLines } from "./lib/instance-files.mjs";
const files = new Map();
const walk = (rel) => { for (const e of fs.readdirSync(rel, { withFileTypes: true })) { const c = `${rel}/${e.name}`; e.isDirectory() ? walk(c) : c.endsWith(".md") && files.set(c, unixLines(fs.readFileSync(c, "utf8"))); } };
walk("example/model");
const writes = backfillPlan(files, { model: "example/model", firstCommitMs: (rel) => firstCommitMsOf(".", rel) });
for (const [p, t] of writes) fs.writeFileSync(p, t);
console.log(writes.size);'
git diff --stat example/
```

Expected: a count equal to the example's entity pages plus one for `example/model/identifier.md`, and each changed page gains one line (two more for a page that had no frontmatter).

- [ ] **Step 10: Run every suite and fix the fixtures that break**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:instance-files && npm run test:plan && npm run test:rules && npm run test:cli && npm run test:ids`

A fixture that reads a real schema from `core/` and asserts on failures by file name may now meet an R18 failure for its page, only where the fixture also carries `identifier-schema.md`. Fix such a fixture by adding `id: <a fixed UUID version 7>` as the first frontmatter line of each page it builds, never by loosening the assertion. A failure that is not about `id`, `identifier` or R18 is not this task's: stop and report it.

Expected once fixed: every suite passes, and `npm run verify` prints that its checks passed.

- [ ] **Step 11: Commit**

Subject: `Core declares an entity's id, and the checks hold it`. Files: `core/ lib/checks.mjs lib/instance-files.mjs example/ verify/ package.json`.

---

### Task 4: The parser hands out the stable id, and the path as `address`

**Files:**

- Modify: `lib/instance.mjs` (`parseInstance`, `scopeOf`)
- Test: `verify/instance.test.mjs`

**Interfaces:**

- Consumes: the `id` frontmatter field Task 3 declares.
- Produces: each entity carries `id` (the page's `id` field, or the path where it has none) and `address` (the folder-and-slug path, always); `owner`, every edge's `from` and `to`, every qualifier's resolved attribute and `rootId` are stable ids.

- [ ] **Step 1: Write the failing tests**

Append to `verify/instance.test.mjs`, reusing the fixture helpers the file already builds its `skills/java-programming` cases from (read the top of the file for their names; the `files` map and `schemas` below are those):

```js
test("an entity with an id is handed out by it, and keeps its path as address", () => {
  const id = "01a04c85-bc20-7092-a266-845d81173e9f";
  const withIdFiles = new Map([...files].map(([p, t]) => [p, p === "skills/java-programming.md" ? t.replace(/^---\n/, `---\nid: ${id}\n`) : t]));
  const { entities, edges } = parseInstance(withIdFiles, { schemas });
  const java = entities.find((e) => e.address === "skills/java-programming");
  assert.equal(java.id, id);
  assert.ok(edges.some((e) => e.to === id), "an edge to the skill lands on its stable id");
  assert.ok(!edges.some((e) => e.to === "skills/java-programming"), "no edge still names its path");
});

test("an entity without an id is handed out by its path, as before", () => {
  const java = parseInstance(files, { schemas }).entities.find((e) => e.address === "skills/java-programming");
  assert.equal(java.id, "skills/java-programming");
});
```

Add a test that parses a fixture with an owned type (a profile and one of its experiences), each carrying an id, and asserts that the experience's `owner` is the profile's stable id and that `rowScope(entities, schemas, { type: "experience", owner: <the profile's name> }).within` holds the experience. Build it from the owned-type fixture this file already has for R5.

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:instance` Expected: FAIL, `java` is undefined because no entity carries `address`.

- [ ] **Step 3: Remap at the edges of the parse**

In `parseInstance`:

1. Where an entity is pushed, add `address: self.id` beside `id: self.id`.
2. After `entities.sort(...)`, add:

```js
  // R18: an entity is handed out by the id its page carries, and resolved by its path, which is
  // where it sits and so what ownership reads. A page with no id — an instance on a core before
  // R18 — is handed out by its path as it always was.
  const stable = new Map(entities.map((e) => [e.id, typeof e.fields.id === "string" && e.fields.id ? e.fields.id : e.id]));
  const stableOf = (id) => (id == null ? id : stable.get(id) ?? id);
```

3. In `resolve`, change `if (id) return id;` to `if (id) return stableOf(id);`.
4. In `resolveBy`, change `return result.entity.id;` to `return stableOf(result.entity.id);`.
5. In the three `edges.push` calls, change `from: e.id` to `from: stableOf(e.id)`.
6. Directly before `const identity = entities.find(...)`, add:

```js
  for (const e of entities) {
    e.id = stableOf(e.id);
    e.owner = stableOf(e.owner);
  }
```

`rootId: identity.id` then carries the stable id without a change.

- [ ] **Step 4: Keep `scopeOf` reading the owner's folder**

In `scopeOf`, change `ownedDirOf(ownerEntity.path, ownerEntity.id ?? null)` to `ownedDirOf(ownerEntity.path, ownerEntity.address ?? ownerEntity.id ?? null)`, and `const ownerId = ownerEntity.id ?? ownedDir ?? ownerEntity.path;` to `const ownerId = ownerEntity.address ?? ownerEntity.id ?? ownedDir ?? ownerEntity.path;`, so the label an R4 message quotes stays a path a reader can find. Add one sentence to the comment above `ownedDirOf`: the parser's entities carry their path as `address` and a stable id as `id`, and the folder is read from `address`.

- [ ] **Step 5: Run the tests**

Run: `npm run test:instance && npm run verify && npm run test:instance-checks` Expected: PASS. A test elsewhere that finds an entity by `e.id === "<path>"` still passes, since its fixture carries no id; one that fails because its fixture does carry an id is changed to find by `e.address`.

- [ ] **Step 6: Commit**

Subject: `The parser hands out an entity's stable id, and its path as address`. Files: `lib/instance.mjs verify/instance.test.mjs` and any test changed in Step 5.

---

### Task 5: The skills write an id into every page they make

**Files:**

- Modify: `agents/claude/skills/companygraph-company/SKILL.md`, `agents/claude/skills/companygraph-profile/SKILL.md`, `agents/claude/skills/companygraph-validate/SKILL.md`

**Interfaces:**

- Consumes: `companygraph id` from Task 2; the R18 check's texts from Task 3.

- [ ] **Step 1: Find where each skill writes a page**

Run: `grep -n "frontmatter\|Write\|write" agents/claude/skills/companygraph-{company,profile}/SKILL.md` Read each numbered step that writes an entity page.

- [ ] **Step 2: Add one sentence to each writing skill**

In `companygraph-company` and `companygraph-profile`, in the step that writes pages, add: "Every page opens its frontmatter with `id`, a fresh one per page from `companygraph id` where the instance's `model/identifier.md` declares `uuidv7`, and made as the instance's agent file says where it declares a `pattern`; an id is never copied from another page, and a page that has one keeps it (R18)."

- [ ] **Step 3: Name R18 in the validate skill**

In `companygraph-validate`, where it lists what the mechanical checks cover, add R18 beside the other rules it names, and add to what it judges by reading: "A `pattern` in `model/identifier.md` that matches something taken from the entity, a name or a type, fails the identifier schema's first writing rule."

- [ ] **Step 4: Check the text**

Run: `sh conventions/conventions-check && sh conventions/conventions-format && npm run test:cli` Expected: all pass. The skills are hashed into instances' manifests, so `test:cli`'s init and upgrade tests are what show the new text still installs.

- [ ] **Step 5: Commit**

Subject: `The skills write an id into every page they make`. Author and trailers as above, `Track: Prose` since this task changes only prose.

---

### Task 6: A pull request that changes an id fails

**Files:**

- Modify: `lib/checks.mjs` (add `idChangesOf`)
- Modify: `lib/history.mjs` (add `changedPagesOf`)
- Modify: `bin/companygraph.mjs` (`ids --range`)
- Modify: `.github/workflows/instance-check.yml` (a step)
- Test: `verify/ids.test.mjs`, `verify/cli.test.mjs`

**Interfaces:**

- Consumes: `idOf` from Task 1; `ids` from Task 2.
- Produces: `idChangesOf(changes: Array<{ before: string, after: string, beforeText: string, afterText: string }>, base: string) → string[]`; `changedPagesOf(cwd: string, range: string, model = "model") → the same array`.

- [ ] **Step 1: Write the failing tests**

Append to `verify/ids.test.mjs` (import `idChangesOf` from `../lib/checks.mjs`):

```js
const page = (id) => `---\nid: ${id}\n---\n\n# X\n`;

test("an id that changed on a page fails, naming both", () => {
  const f = idChangesOf([{ before: "model/skills/a.md", after: "model/skills/a.md", beforeText: page("a1"), afterText: page("a2") }], "main");
  assert.deepEqual(f, ['model/skills/a.md: `id` is "a2", and on main this entity carries "a1"; an id never changes once it is on the default branch (R18)']);
});

test("a rename that changes the id fails, naming the old path too", () => {
  const f = idChangesOf([{ before: "model/skills/a.md", after: "model/skills/b.md", beforeText: page("a1"), afterText: page("b1") }], "main");
  assert.match(f[0], /^model\/skills\/b\.md: .* \(then model\/skills\/a\.md\)/);
});

test("a rename that keeps its id, and a page that gains its first id, pass", () => {
  assert.deepEqual(idChangesOf([
    { before: "model/skills/a.md", after: "model/skills/b.md", beforeText: page("a1"), afterText: page("a1") },
    { before: "model/skills/c.md", after: "model/skills/c.md", beforeText: "# C\n", afterText: page("c1") },
  ], "main"), []);
});
```

Append to `verify/cli.test.mjs`:

```js
test("ids --range refuses a commit that changed an id, across a rename", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  const old = path.join(root, "model/vision.md");
  const text = fs.readFileSync(old, "utf8").replace(/^id: .*$/m, "id: 01a04c85-bc20-7092-a266-845d81173e9f");
  fs.writeFileSync(old, text);
  g("commit", "-qam", "second", "--no-verify");
  const head = g("rev-parse", "HEAD");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${head}`], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /model\/vision\.md: `id` is "01a04c85-bc20-7092-a266-845d81173e9f"/);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npm run test:ids && npm run test:cli` Expected: FAIL, `idChangesOf` is not exported, and `ids --range` prints the "needs --backfill or --range" refusal.

- [ ] **Step 3: Write `idChangesOf`**

Append to `lib/checks.mjs`:

```js
// R18's other half, which a tree cannot see: an id on the default branch never changes. Handed
// the pages a range modified or renamed, each as it was at the base and as it is at the head, it
// fails every one whose id differs. A page with no id at the base is gaining its first, which is
// the backfill; one with none at the head is the tree check's to report.
export function idChangesOf(changes, base) {
  const out = [];
  for (const { before, after, beforeText, afterText } of changes) {
    const was = idOf(beforeText), is = idOf(afterText);
    if (was === null || is === null || was === is) continue;
    const then = before === after ? "" : ` (then ${before})`;
    out.push(`${after}: \`id\` is "${is}", and on ${base} this entity${then} carries "${was}"; an id never changes once it is on the default branch (R18)`);
  }
  return out;
}
```

- [ ] **Step 4: Write `changedPagesOf`**

Append to `lib/history.mjs`:

```js
// The pages under the container a range modified or renamed, each as it was at the range's base
// and as it is at its head. Git's rename detection pairs a renamed page with its old path, which
// is what lets a rename that also changed the id be seen as one entity changing its id.
export function changedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  const out = git(cwd, ["diff", "--name-status", "-z", "-M", a, b, "--", `${model}/`]).split("\0").filter(Boolean);
  const changes = [];
  for (let i = 0; i < out.length; ) {
    const status = out[i++];
    if (status === "M") {
      const p = out[i++];
      if (p.endsWith(".md")) changes.push({ before: p, after: p, beforeText: git(cwd, ["show", `${a}:${p}`]), afterText: git(cwd, ["show", `${b}:${p}`]) });
    } else if (status.startsWith("R")) {
      const from = out[i++], to = out[i++];
      if (to.endsWith(".md")) changes.push({ before: from, after: to, beforeText: git(cwd, ["show", `${a}:${from}`]), afterText: git(cwd, ["show", `${b}:${to}`]) });
    } else if (status.startsWith("C")) i += 2;
    else i += 1;
  }
  return changes;
}
```

- [ ] **Step 5: Wire `--range`**

In `bin/companygraph.mjs`, import `idChangesOf` from `../lib/checks.mjs` and `changedPagesOf` from `../lib/history.mjs`, and in `ids`, before the final refusal:

```js
  if (options.range) {
    const failures = idChangesOf(changedPagesOf(root, options.range), options.range.split("..")[0]);
    if (failures.length) {
      for (const f of failures) console.error(`✗ ${f}`);
      return 1;
    }
    console.log("✓ no id on the default branch changed");
    return 0;
  }
```

- [ ] **Step 6: Run the tests**

Run: `npm run test:ids && npm run test:cli` Expected: PASS.

- [ ] **Step 7: Run it on a pull request**

In `.github/workflows/instance-check.yml`, after the `every commit names a seat its phase lists` step, add:

```yaml
      # R18: an id on the default branch never changes. Only on a pull request, as the seat check,
      # and over the same range; checkout's full history is what lets git pair a rename.
      - name: no id on the default branch changed
        if: github.event_name == 'pull_request'
        run: node .companygraph-checker/bin/companygraph.mjs ids . --range "${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }}"
```

- [ ] **Step 8: Run everything and commit**

Run: `npm run verify && npm run test:instance && npm run test:instance-checks && npm run test:instance-files && npm run test:plan && npm run test:rules && npm run test:cli && npm run test:ids && npm run test:seats && sh conventions/conventions-check && sh conventions/conventions-format` Expected: all pass.

Subject: `A pull request that changes an id fails`. Files: `lib/checks.mjs lib/history.mjs bin/companygraph.mjs .github/workflows/instance-check.yml verify/ids.test.mjs verify/cli.test.mjs`.

---

## After the owner's merge

The release, its number and its notes are the owner's. The notes say that every page needs an `id` and every instance a `model/identifier.md`, that `companygraph ids --backfill` does both, and that the parser's `id` is now the stable id, with the path as `address`, so a consumer that builds an address from `id` must read `address` instead. The MCP server, the Obsidian plugin, the sites and the three instances each take it in a plan of their own.
