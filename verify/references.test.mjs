// R9 has every schema declare `## References`, with the columns What and URL exactly. The
// check lives in verify/check.mjs, a script rather than a set of exported functions, so each
// case copies the tree it reads into a temporary directory, changes one schema in the copy
// and runs the script there, as check-script.test.mjs does. The schema changed is process's,
// whose declaration predates the rule and is the shape every other schema copies.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";


const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "process";
const ROW = "| `## References` | No | Table. The rulebooks the process is run by; its columns are declared below. |";
const WHAT = "| `What` | Yes | string | The kind of document — a rulebook, a checklist, a mandate |";
const URL_ROW = "| `URL` | Yes | string | Where it is |";
const CAPTION = "`## References` is a table with these columns:";

// The findings this check makes about the changed schema, from a run of check.mjs on a copy.
// No package.json is copied, so the release check fails in every run; only lines naming the
// schema and References are read.
function findings(change) {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-references-"));
  try {
    for (const dir of ["core", "example", "lib", "packs"]) cpSync(join(ROOT, dir), join(tmp, dir), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    cpSync(join(ROOT, "verify", "example.mjs"), join(tmp, "verify", "example.mjs"));
    const path = join(tmp, "core", `${SCHEMA}-schema.md`);
    const before = readFileSync(path, "utf8");
    for (const line of [ROW, WHAT, URL_ROW, CAPTION])
      assert.ok(before.includes(line), `core/${SCHEMA}-schema.md no longer carries "${line}" — update the fixture`);
    writeFileSync(path, change(before));
    const { stderr } = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    return stderr.split("\n").map((l) => l.trim())
      .filter((l) => l.startsWith(`core/${SCHEMA}-schema.md:`) && l.includes("R9 ") && l.includes("References"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

// The declaration removed whole: the row, the caption and the column table under it.
const withoutDeclaration = (text) => {
  const start = text.indexOf(CAPTION);
  const end = text.indexOf(URL_ROW, start) + URL_ROW.length;
  return (text.slice(0, start) + text.slice(end)).replace(`${ROW}\n`, "");
};

test("a schema that declares References with What and URL passes", () => {
  assert.deepEqual(findings((t) => t), []);
});

test("a schema with no References declaration fails once, naming R9", () => {
  const f = findings(withoutDeclaration);
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /declares no `## References` — R9 has every schema declare it/);
});

test("a third column fails once", () => {
  const f = findings((t) => t.replace(URL_ROW, `${URL_ROW}\n| \`Note\` | No | string | A note |`));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /R9 gives it exactly What \| Yes \| string and URL \| Yes \| string/);
});

test("an optional URL fails once", () => {
  const f = findings((t) => t.replace(URL_ROW, URL_ROW.replace("| Yes |", "| No |")));
  assert.equal(f.length, 1, f.join("\n"));
});

test("URL before What fails once", () => {
  const f = findings((t) => t.replace(`${WHAT}\n${URL_ROW}`, `${URL_ROW}\n${WHAT}`));
  assert.equal(f.length, 1, f.join("\n"));
});

test("a row with no column table fails once more than the shape check's own finding", () => {
  const f = findings((t) => {
    const start = t.indexOf(CAPTION);
    const end = t.indexOf(URL_ROW, start) + URL_ROW.length;
    return t.slice(0, start) + t.slice(end);
  });
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /declares no columns/);
});

// The instance checks hold a References table on a type that declares it newly, as they hold
// any declared table: through its real schema, read from disk, so the test fails if the schema
// and the checks part. Value stands for every type that gains the section; identity is the type
// that carries it beside `## Also at`.

const schema = (type) => fs.readFileSync(new URL(`../core/${type}-schema.md`, import.meta.url), "utf8");
const SOURCE_SCHEMA = ["# Source Schema", "", "> A source.", "", "## File Location", "", "`model/sources/*.md`", "",
  "## Frontmatter", "", "No YAML frontmatter.", "", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const refs = (header, rows) => ["## References", "", header, "| --- | --- |", ...rows, ""];
const value = (table) => ["---", "source: Local", "---", "", "# Candor", "", "> We say what happened.", "",
  "## In practice", "", "Saying it early.", "", ...table].join("\n");
const identity = (table) => ["---", "source: Local", "---", "", "# Acme", "", "> Billing software.", "",
  "## What it is", "", "Acme makes billing software for small firms.", "",
  "## Also at", "", "| Where | URL |", "| --- | --- |", "| GitHub | https://example.invalid/acme |", "", ...table].join("\n");
const failuresOf = (path, type, page) =>
  checkInstance(new Map([
    [`meta/core/${type}-schema.md`, schema(type)],
    ["meta/core/source-schema.md", SOURCE_SCHEMA],
    ["model/sources/local.md", "# Local\n\n> Here.\n"],
    [path, page],
  ]), { core: "meta/core", model: "model" }).failures.filter((f) => f.includes(path));

test("a value whose References row names its document passes", () => {
  assert.deepEqual(failuresOf("model/values/candor.md", "value",
    value(refs("| What | URL |", ["| Code of conduct | https://example.invalid/conduct |"]))), []);
});

test("a References row with no URL fails once", () => {
  const f = failuresOf("model/values/candor.md", "value", value(refs("| What | URL |", ["| Code of conduct |  |"])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"## References" row has no url/);
});

test("a References table with Also at's columns fails once, on the columns", () => {
  const f = failuresOf("model/values/candor.md", "value",
    value(refs("| Where | URL |", ["| GitHub | https://example.invalid/a |", "| LinkedIn |  |"])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /columns are Where\|URL; the schema declares What\|URL/);
});

test("an identity carrying Also at and References passes", () => {
  assert.deepEqual(failuresOf("model/identity.md", "identity",
    identity(refs("| What | URL |", ["| Register entry | https://example.invalid/register |"]))), []);
});
