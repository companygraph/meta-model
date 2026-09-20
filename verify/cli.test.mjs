import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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

const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

// Defect 1: a manifest is a file inside the instance, and can name anything in `files` with a
// correct hash next to it. Unfiltered, that list became a delete list: this proves both halves —
// the whole upgrade refuses, and neither targeted file is touched, not just that the call throws.
test("upgrade refuses a manifest that names files outside its own core, and deletes neither", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const identityPath = path.join(root, "model/identity.md");
  const identity = fs.readFileSync(identityPath, "utf8");
  const victimPath = path.join(path.dirname(root), `${path.basename(root)}-victim.txt`);
  const victim = "do not delete me\n";
  fs.writeFileSync(victimPath, victim);
  try {
    manifest.files["model/identity.md"] = sha256(identity);
    manifest.files[`../${path.basename(victimPath)}`] = sha256(victim);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /model\/identity\.md/);
    assert.equal(fs.readFileSync(identityPath, "utf8"), identity);
    assert.ok(fs.existsSync(victimPath));
    assert.equal(fs.readFileSync(victimPath, "utf8"), victim);
  } finally {
    fs.rmSync(victimPath, { force: true });
  }
});

// Defect 2: `units` also comes from the manifest, and is interpolated straight into every write
// path. A relative escape must refuse the whole upgrade before anything is written, not just fail
// to create the escaped folder as a side effect of some other check.
test("upgrade refuses a manifest whose units escapes the instance, and writes nothing outside it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // Named after this run's own root, not a fixed "../escaped", so a run that failed to refuse
  // (the very bug under test) cannot leave a folder behind for a later run to find already there
  // and pass against.
  const folder = `${path.basename(root)}-escaped`;
  manifest.units = `../${folder}`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const escaped = path.join(path.dirname(root), folder);
  try {
    assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /units/);
    assert.ok(!fs.existsSync(escaped));
  } finally {
    fs.rmSync(escaped, { recursive: true, force: true });
  }
});

function tempPackage() {
  const dir = temp();
  for (const part of ["bin", "lib", "core"]) fs.cpSync(path.join(here, "..", part), path.join(dir, part), { recursive: true });
  fs.cpSync(path.join(here, "..", "package.json"), path.join(dir, "package.json"));
  return dir;
}

// Defect 5: checkPath's own pin guard can throw for the same reason `check` already prints with a
// "✗ " prefix — a vendored core newer than the checker — and an upgrade landing one is the real
// route there. A private copy of the package stands in for a genuinely newer release, since
// nothing here may reach the network for one: only its bundled core/manifest.json's version is
// raised, so the copy's own checker (built from the same, unmoved package.json) refuses it exactly
// as a real newer release would.
test("upgrade's own check prints a guard failure with its prefix and still says the upgrade stands", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const pkg = tempPackage();
  const coreManifestPath = path.join(pkg, "core/manifest.json");
  const coreManifest = JSON.parse(fs.readFileSync(coreManifestPath, "utf8"));
  coreManifest.version = "99.99.99";
  fs.writeFileSync(coreManifestPath, `${JSON.stringify(coreManifest)}\n`);
  const result = spawnSync(process.execPath, [path.join(pkg, "bin/companygraph.mjs"), "upgrade", root], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /✗/);
  assert.match(result.stdout, /the upgrade stands/);
});
