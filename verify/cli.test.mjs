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
  // whole-folder check refuses by naming the units folder or .companygraph/, before the per-file
  // check ever runs.
  assert.throws(
    () => run(["init", root, "--here", "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }),
    /(meta|\.companygraph)\//,
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

test("the menu makes an instance from answers alone, and what it made passes the checks", () => {
  const root = path.join(temp(), "acme");
  const said = run(["menu"], { input: `1\n${root}\nAcme\nn\n`, stdio: "pipe" });
  assert.match(said, /1 {2}Make a model/);
  assert.match(said, /files written into/);
  const { failures } = checkInstance(filesOf(root), { core: "meta/core", model: "model" });
  assert.deepEqual(failures, []);
  assert.equal(fs.existsSync(path.join(root, ".obsidian")), false);
});

test("the menu asks before it adds to a folder that holds files, and a no writes nothing", () => {
  const root = temp();
  fs.writeFileSync(path.join(root, "notes.md"), "# Notes\n");
  run(["menu"], { input: `1\n${root}\nn\n`, stdio: "pipe" });
  assert.deepEqual(fs.readdirSync(root), ["notes.md"]);
});

test("the menu shows an upgrade before it runs one, and a pick it does not have is refused", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.match(run(["menu"], { input: `3\n${root}\n`, stdio: "pipe" }), /nothing to do/);
  assert.throws(() => run(["menu"], { input: "9\n", stdio: "pipe" }), /9 is not one of 1-4/);
});

test("obsidian --from puts a build into a vault and switches it on", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const said = run(["obsidian", root, "--from", build], { stdio: "pipe" });
  assert.match(said, /CompanyGraph 1\.0\.0 installed .*, and switched on/);
  // The switch no file sets: a vault browsed in restricted mode lists no community plugin at all.
  assert.match(said, /Settings → Community plugins → Turn on community plugins/);
  assert.doesNotMatch(said, /\x1b\[/, "no color where there is no terminal");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8")), ["companygraph"]);
});

test("upgrade moves an instance, says what it did, and leaves the model alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "model/skills/java.md"), "---\nsource: Local\n---\n\n# Java\n\n> A language.\n");
  const said = run(["upgrade", root]);
  assert.match(said, /already on core/i);
  assert.ok(fs.existsSync(path.join(root, "model/skills/java.md")));
});

const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

// Defect 6 (2026-09-20 review): the spec asks for "an upgrade between two real releases tested
// end to end … with the manifest, the hashes and the workflow line all moved, and the checks run
// after", but the only CLI-level upgrade test was the no-op "already on core" path above. This
// does the move for real without touching the network: init at the bundled (current) release,
// then doctor the instance to look like it is on an older one by rewriting one vendored file and
// the manifest and workflow around it to match, so `upgrade` has an actual move to make when it
// brings that instance forward to this release.
test("upgrade moves an instance between two real releases end to end: core, every hash, tooling, core.version and the workflow line all move, and the checks run after", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);

  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const conventionsPath = path.join(root, "meta/core/CONVENTIONS.md");
  const olderConventions = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(conventionsPath, olderConventions);
  manifest.core.version = "0.1.0";
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(olderConventions);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const workflowPath = path.join(root, ".github/workflows/companygraph.yml");
  fs.writeFileSync(
    workflowPath,
    fs.readFileSync(workflowPath, "utf8").replace(/instance-check\.yml@v[\d.]+/, "instance-check.yml@v0.1.0"),
  );

  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  const bundledConventions = fs.readFileSync(path.join(here, "..", "core/CONVENTIONS.md"), "utf8");
  const bundledCoreVersion = JSON.parse(fs.readFileSync(path.join(here, "..", "core/manifest.json"), "utf8")).version;

  const said = run(["upgrade", root]);
  assert.match(said, /^core 0\.1\.0 → /);
  assert.ok(!/already on core/i.test(said));
  assert.match(said, /mechanical checks pass/);

  assert.equal(fs.readFileSync(conventionsPath, "utf8"), bundledConventions);

  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(moved.tooling, version);
  assert.equal(moved.core.version, bundledCoreVersion);
  for (const [rel, hash] of Object.entries(moved.files))
    assert.equal(hash, sha256(fs.readFileSync(path.join(root, rel), "utf8")), rel);

  assert.ok(fs.readFileSync(workflowPath, "utf8").includes(`instance-check.yml@v${version}`));
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
  for (const part of ["bin", "lib", "core", "agents"]) fs.cpSync(path.join(here, "..", part), path.join(dir, part), { recursive: true });
  fs.cpSync(path.join(here, "..", "package.json"), path.join(dir, "package.json"));
  return dir;
}

// Found making companygraph/mental-model: a core newer than the tooling leaves an instance no
// released checker runs, so `upgrade` refuses it before writing, as `init` does. A private copy
// of the package stands in for a genuinely newer release, since nothing here may reach the
// network for one: only its bundled core/manifest.json's version is raised.
test("upgrade refuses a core newer than itself, and writes nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = filesOf(root);
  const pkg = tempPackage();
  const coreManifestPath = path.join(pkg, "core/manifest.json");
  const coreManifest = JSON.parse(fs.readFileSync(coreManifestPath, "utf8"));
  coreManifest.version = "99.99.99";
  fs.writeFileSync(coreManifestPath, `${JSON.stringify(coreManifest)}\n`);
  const result = spawnSync(process.execPath, [path.join(pkg, "bin/companygraph.mjs"), "upgrade", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /99\.99\.99[\s\S]*nothing was written/);
  assert.deepEqual(filesOf(root), before);
});

// Defect 5: checkPath can still throw after a real move — here because the model is gone — and
// an upgrade that stood is not to be hidden by it: the throw is printed with the "✗ " prefix
// `check` uses, and the upgrade is said to stand.
test("upgrade's own check prints a guard failure with its prefix and still says the upgrade stands", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.core.version = "0.1.0";
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, "model"), { recursive: true });
  const result = spawnSync(process.execPath, [cli, "upgrade", root], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /✗ .*has no model\//);
  assert.match(result.stdout, /the upgrade stands/);
});

test("init --folders writes the folders named and sources, and what it writes passes the checks", () => {
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude", "--folders", "values,processes"]);
  assert.match(said, /folders: processes, sources, values/);
  const folders = fs.readdirSync(path.join(root, "model"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(folders, ["processes", "sources", "values"]);
  assert.deepEqual(checkInstance(filesOf(root), { core: "meta/core", model: "model" }).failures, []);
});

// Found making companygraph/mental-model: nothing on the gate read the hashes, so a reflow of the
// vendored core passed every check and was met only by the next `upgrade`, which refused.
test("check fails on a vendored file that is not as the tooling wrote it, or is gone, naming it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);

  const conventions = path.join(root, "meta/core/CONVENTIONS.md");
  fs.writeFileSync(conventions, `${fs.readFileSync(conventions, "utf8")}\nedited\n`);
  fs.rmSync(path.join(root, "meta/core/LICENSE"));
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /meta\/core\/CONVENTIONS\.md: not as the tooling wrote it/);
  assert.match(result.stderr, /meta\/core\/LICENSE: named in \.companygraph\/manifest\.json and not in the instance/);

  // A manifest that recorded no hashes has nothing to be held to.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.files;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);
});

test("a core newer than the checker is refused naming both pins, the manifest's and the workflow's", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.core.version = "99.99.99";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /move the manifest's tooling and the workflow pin to v99\.99\.99 together/);
});

const SKILL_NAMES = ["companygraph-export", "companygraph-surface", "companygraph-validate"];

test("init writes the three skills, hashed into the manifest like the core, and tells how to run the checks", () => {
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  for (const file of ["companygraph-validate/SKILL.md", "companygraph-export/build.py", "companygraph-surface/facts.py"])
    assert.equal(manifest.files[`.claude/skills/${file}`], sha256(fs.readFileSync(path.join(root, ".claude/skills", file), "utf8")));
  assert.match(said, /npx github:companygraph\/meta-model#v\d+\.\d+\.\d+ check/);
  assert.match(said, /Python 3/);
  assert.ok(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").includes("npx github:companygraph/meta-model#v<tooling> check"));
});

test("check fails on a skill edited inside the instance, as on edited core", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.appendFileSync(path.join(root, ".claude/skills/companygraph-validate/SKILL.md"), "\nedited\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/skills\/companygraph-validate\/SKILL\.md: not as the tooling wrote it/);
});

test("upgrade gives no skills to an instance init did not give them to, and leaves its own alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // An instance made by hand: its manifest records core alone, and it keeps a skill of its own
  // under a name the tooling also uses.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const key of Object.keys(manifest.files)) if (key.startsWith(".claude/")) delete manifest.files[key];
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  manifest.core.version = "0.1.0";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, ".claude/skills/companygraph-export"), { recursive: true });
  const own = path.join(root, ".claude/skills/companygraph-validate/SKILL.md");
  fs.writeFileSync(own, "# The instance's own validate\n");

  run(["upgrade", root]);
  assert.equal(fs.readFileSync(own, "utf8"), "# The instance's own validate\n");
  assert.ok(!fs.existsSync(path.join(root, ".claude/skills/companygraph-export")));
  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(!Object.keys(moved.files).some((key) => key.startsWith(".claude/")));
});

// companygraph/mental-model is this case: made by init before the skills existed, its manifest
// records none and it holds none, and an upgrade gives it all three.
test("upgrade gives the skills to an instance that records none and holds none, and check passes after", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const key of Object.keys(manifest.files)) if (key.startsWith(".claude/")) delete manifest.files[key];
  manifest.tooling = "0.1.0";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, ".claude"), { recursive: true });

  const said = run(["upgrade", root]);
  assert.match(said, /mechanical checks pass/);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(moved.files[".claude/skills/companygraph-validate/SKILL.md"], sha256(fs.readFileSync(path.join(root, ".claude/skills/companygraph-validate/SKILL.md"), "utf8")));
});

test("upgrade refuses a skill of the instance's own under a name it would write, and --force takes it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // The release ships a skill file this instance's manifest never recorded, and the instance
  // holds a file of its own at that path.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.files[".claude/skills/companygraph-surface/facts.py"];
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const facts = path.join(root, ".claude/skills/companygraph-surface/facts.py");
  fs.writeFileSync(facts, "# the instance's own\n");

  assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /did not write them[\s\S]*companygraph-surface\/facts\.py/);
  assert.equal(fs.readFileSync(facts, "utf8"), "# the instance's own\n");
  const said = run(["upgrade", root, "--force"]);
  assert.match(said, /overwritten, as --force asked: .*facts\.py/);
  assert.equal(fs.readFileSync(facts, "utf8"), fs.readFileSync(path.join(here, "..", "agents/claude/skills/companygraph-surface/facts.py"), "utf8"));
});

// The export skill's scripts are ported from the reference instance, where they only ever ran
// over one model; here they run over the smallest instance `init` makes, with one entity added,
// and over an instance whose units sit somewhere other than meta/.
for (const schemas of ["meta", "schemas"])
  test(`the export skill builds and verifies an instance init made, its units under ${schemas}/`, () => {
    const root = path.join(temp(), "acme");
    run(["init", root, "--name", "Acme", "--agent", "claude", "--schemas", schemas]);
    fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\n> A company, described.\n");
    fs.writeFileSync(path.join(root, "model/values/candor.md"), "---\nsource: Local\n---\n\n# Candor\n\n> Say it.\n");
    const build = spawnSync("python3", [".claude/skills/companygraph-export/build.py"], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const verify = spawnSync("python3", [".claude/skills/companygraph-export/verify.py"], { cwd: root, encoding: "utf8" });
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    assert.match(verify.stdout, /PASS .*zip agrees/);
    const facts = spawnSync("python3", [".claude/skills/companygraph-surface/facts.py"], { cwd: root, encoding: "utf8" });
    assert.equal(facts.status, 0, facts.stdout + facts.stderr);
  });
