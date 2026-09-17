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
