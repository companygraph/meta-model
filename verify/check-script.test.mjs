// A regression test for verify/check.mjs itself. It is a script, not a set of exported
// functions — it calls process.exit and reads ROOT off its own file location — so the only way
// to exercise a fix in it without touching this repository's own files is to copy the tree it
// reads into a temporary directory, mutate one file in the copy, and run the script there as a
// subprocess.
//
// The case here is the short row: a table's data row can carry fewer cells than its header
// names — nothing enforces that a row and its header agree in length — and "type vocabulary"
// used to read a row's Type cell before checking it was there. On a short row that threw a bare
// TypeError, which is not this check's finding: it names no path, gives no rule, and aborts
// every check queued after it, so a run that hit it printed a stack trace where a report of
// what was wrong belonged.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

test("a short row in a heading table fails the run instead of crashing it", () => {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-check-"));
  try {
    cpSync(join(ROOT, "core"), join(tmp, "core"), { recursive: true });
    cpSync(join(ROOT, "example"), join(tmp, "example"), { recursive: true });
    cpSync(join(ROOT, "lib"), join(tmp, "lib"), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));

    // Drop every cell but the heading name from the one row `## Achievements` declares — the
    // shape a hand-edited table takes when a cell is deleted along with its pipes instead of
    // being left empty.
    const schemaPath = join(tmp, "core", "experience-schema.md");
    const before = readFileSync(schemaPath, "utf8");
    const target =
      "| `Kind` | No | ref → achievement-kind | The kind every bullet below it is chiefly evidence of |";
    assert.ok(
      before.includes(target),
      "core/experience-schema.md no longer carries the heading row this test mutates — update the fixture",
    );
    writeFileSync(schemaPath, before.replace(target, "| `Kind` |"));

    // No package.json: "release manifest" reads it, finds none, and fails without needing a
    // real git repository — which keeps this fixture to the four directories the bug touches.
    const result = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });

    assert.doesNotMatch(
      result.stderr,
      /TypeError/,
      `check.mjs crashed instead of reporting a failure:\n${result.stderr}`,
    );
    assert.match(
      result.stderr,
      /outside the vocabulary|✗ \d+ problem/,
      `expected a reported failure, got:\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
    );
    assert.equal(result.status, 1);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// R9 makes `image` a frontmatter type: a row of a table has no folder of its own for a file to
// sit in. The vocabulary check reads frontmatter and column tables in one loop, so this holds
// that it still tells them apart.
test("a column typed image fails the vocabulary check by name", () => {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-check-"));
  try {
    cpSync(join(ROOT, "core"), join(tmp, "core"), { recursive: true });
    cpSync(join(ROOT, "example"), join(tmp, "example"), { recursive: true });
    cpSync(join(ROOT, "lib"), join(tmp, "lib"), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    const schemaPath = join(tmp, "core", "profile-schema.md");
    const before = readFileSync(schemaPath, "utf8");
    const target = "| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |";
    assert.ok(before.includes(target), "core/profile-schema.md no longer carries the row this test mutates — update the fixture");
    writeFileSync(schemaPath, before.replace(target, "| `Where` | Yes | image | The place. |"));
    const result = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    assert.match(result.stdout + result.stderr, /profile-schema\.md: `Where` is "image"; an image is a frontmatter field, never a column/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});

// `pairs` is one [from, to] row replacement or a list of them, mutating core/profile-schema.md.
// A leading string argument names a different schema file to mutate instead, for a fixture that
// needs a row profile-schema.md does not carry — a heading table, say.
const mutated = (...args) => {
  const file = typeof args[0] === "string" ? args.shift() : "profile-schema.md";
  const pairs = args;
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-check-"));
  try {
    for (const dir of ["core", "example", "lib"]) cpSync(join(ROOT, dir), join(tmp, dir), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    const schemaPath = join(tmp, "core", file);
    let text = readFileSync(schemaPath, "utf8");
    for (const [from, to] of pairs) {
      assert.ok(text.includes(from), `core/${file} no longer carries the row this test mutates — update the fixture`);
      text = text.replace(from, to);
    }
    writeFileSync(schemaPath, text);
    const result = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    return result.stdout + result.stderr;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
};

test("a frontmatter field typed by its row fails, since a field has no row", () => {
  const out = mutated(["| `location` | No | string | Where the person works from |", "| `location` | No | ref → by Kind | Where. |"]);
  assert.match(out, /`location` is "ref → by Kind"; a reference whose type is read from its row is a column, never a frontmatter field/);
});

test("a `by` naming a column that is not a string column of its table fails", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref → by Kind | The page. |"]);
  assert.match(out, /`URL` is "ref → by Kind", and `Kind` is not a string column of the same table \(R9\)/);
});

test("an `in` naming a column that is not a string column of its table fails", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref → by Where in Kind | The page. |"]);
  assert.match(out, /`Kind` is not a string column of the same table \(R9\)/);
});

test("a required `by` column whose type column is optional fails", () => {
  const out = mutated(
    ["| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |", "| `Where` | No | string | The place. |"],
    ["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref → by Where | The page. |"]);
  assert.match(out, /`URL` is required and `Where`, which names its type, is not \(R9\)/);
});

test("the form spelled with `ref?` is refused by its own message", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | ref? → by Where | The page. |"]);
  assert.match(out, /`ref → by <Column>` and `ref → by <Column> in <Owner>` are the forms \(R9\)/);
});

test("the form spelled with `array of` is refused by its own message", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | array of ref → by Where | The page. |"]);
  assert.match(out, /`ref → by <Column>` and `ref → by <Column> in <Owner>` are the forms \(R9\)/);
});

test("the form spelled with `qualifier` is refused by its own message", () => {
  const out = mutated(["| `URL` | Yes | string | The person's own page there |", "| `URL` | Yes | qualifier → by Where | The page. |"]);
  assert.match(out, /`ref → by <Column>` and `ref → by <Column> in <Owner>` are the forms \(R9\)/);
});

test("a heading table declaring `ref → by …` fails, since a heading has no row either", () => {
  const out = mutated("experience-schema.md",
    ["| `Kind` | No | ref → achievement-kind | The kind every bullet below it is chiefly evidence of |",
     "| `Kind` | No | ref → by Kind | The kind. |"]);
  assert.match(out, /`Kind` is "ref → by Kind"; a reference whose type is read from its row is a column, never a frontmatter field or a heading/);
});
