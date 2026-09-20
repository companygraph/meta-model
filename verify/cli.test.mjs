import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstance } from "../lib/checks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "bin", "companygraph.mjs");
const run = (args, options = {}) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", ...options });
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-"));

// Every file under a folder, as the checks read one: path relative to the root, text.
function filesOf(root, base = root, into = new Map()) {
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) filesOf(root, full, into);
    else into.set(path.relative(root, full), fs.readFileSync(full, "utf8"));
  }
  return into;
}

test("an instance init writes passes the mechanical checks on its first day", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const files = filesOf(root);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  assert.deepEqual(failures, []);
});

test("what it wrote is what its manifest says it wrote", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  assert.equal(manifest.tooling, version);
  assert.equal(manifest.core.source, "bundled");
  for (const [rel, hash] of Object.entries(manifest.files)) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.equal(hash, `sha256:${createHash("sha256").update(text).digest("hex")}`);
  }
  assert.ok(fs.readFileSync(path.join(root, ".github/workflows/companygraph.yml"), "utf8").includes(`instance-check.yml@v${version}`));
});

test("a folder that is not empty is refused, and told what would let it through", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = [...filesOf(root).keys()].sort();
  // Without --here the target must be a folder this tooling can have to itself.
  assert.throws(() => run(["init", root, "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }), /not empty[\s\S]*--here/);
  assert.deepEqual([...filesOf(root).keys()].sort(), before);
});

test("--here into a folder that already holds an instance is refused by name, and nothing is written", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = filesOf(root);
  // --here says "add to what is here", and the answer is that an instance is here already: the
  // plan names the files it would have written over, and writes none of them.
  assert.throws(
    () => run(["init", root, "--here", "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }),
    /\.companygraph\/manifest\.json/,
  );
  const after = filesOf(root);
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  for (const [path, text] of before) assert.equal(after.get(path), text, path);
});

test("it adds to a repository that is not an instance, and leaves what is there", () => {
  const root = temp();
  fs.writeFileSync(path.join(root, "README.md"), "# Mine\n");
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Mine\n");
  assert.ok(fs.existsSync(path.join(root, "meta/core/CONVENTIONS.md")));
});

test("an agent it cannot write for is refused by name, and nothing is written", () => {
  const root = temp();
  assert.throws(() => run(["init", root, "--name", "Acme", "--agent", "codex"], { stdio: "pipe" }), /codex/);
  assert.deepEqual([...filesOf(root).keys()], []);
});

test("a command it does not know, and no command at all, print what it can do", () => {
  assert.throws(() => run(["dance"], { stdio: "pipe" }), /init/);
  assert.match(run(["--help"]), /init/);
});

test("upgrade moves an instance, says what it did, and leaves the model alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "model/skills/java.md"), "---\nsource: Local\n---\n\n# Java\n\n> A language.\n");
  const said = run(["upgrade", root]);
  assert.match(said, /already on core/i);
  assert.ok(fs.existsSync(path.join(root, "model/skills/java.md")));
});

test("upgrade refuses when core was edited inside the instance, and --dry-run writes nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const conventions = path.join(root, "meta/core/CONVENTIONS.md");
  fs.writeFileSync(conventions, `${fs.readFileSync(conventions, "utf8")}\nedited\n`);
  assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /CONVENTIONS\.md/);
  const before = fs.readFileSync(conventions, "utf8");
  run(["upgrade", root, "--force", "--dry-run"]);
  assert.equal(fs.readFileSync(conventions, "utf8"), before);
});
