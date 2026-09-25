import test from "node:test";
import assert from "node:assert/strict";
import {
  agentFilesFor, hashOf, manifestOf, readmesFor, rootFolders, startingEntities, workflowFor,
} from "../lib/instance-files.mjs";

test("a hash is the sha256 of the bytes, as the manifest writes it", () => {
  assert.equal(hashOf(""), "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  assert.match(hashOf("# A\n"), /^sha256:[0-9a-f]{64}$/);
});

test("the manifest names the tooling, the core it vendored and every file's hash", () => {
  const text = manifestOf({
    tooling: "0.31.2",
    core: { version: "0.31.1", shape: 3, source: "bundled" },
    units: "meta",
    files: { "meta/core/CONVENTIONS.md": hashOf("x") },
  });
  const read = JSON.parse(text);
  assert.deepEqual(read.core, { version: "0.31.1", shape: 3, source: "bundled" });
  assert.deepEqual(read.packs, []);
  assert.equal(read.units, "meta");
  assert.equal(read.files["meta/core/CONVENTIONS.md"], hashOf("x"));
  assert.ok(text.endsWith("\n"));
});

test("the root folders are the types that have one, and no owned type", () => {
  const folders = rootFolders();
  assert.ok(folders.includes("skills") && folders.includes("profiles") && folders.includes("processes"));
  assert.ok(!folders.some((f) => f.includes("<") || f.includes("/")));
  assert.deepEqual(folders, [...folders].sort());
});

test("every folder gets a README, and so does the model, since an empty folder is no folder", () => {
  const files = readmesFor(["skills", "values"]);
  assert.deepEqual([...files.keys()].sort(), ["model/README.md", "model/skills/README.md", "model/values/README.md"]);
});

test("a folder's README names the schema its files are written against, in a sentence-case heading", () => {
  const files = readmesFor(["strategic-objectives", "skills"], "meta");
  assert.equal(
    files.get("model/strategic-objectives/README.md"),
    "# Strategic objectives\n\nOne file per strategic objective, written against `meta/core/strategic-objective-schema.md`.\n",
  );
  assert.match(files.get("model/skills/README.md"), /^# Skills\n/);
  // Another schemas folder is the one named.
  assert.ok(readmesFor(["skills"], "schemas").get("model/skills/README.md").includes("`schemas/core/skill-schema.md`"));
});

test("a folder whose type owns others names every schema it holds", () => {
  const files = readmesFor(["processes", "profiles"], "meta");
  const processes = files.get("model/processes/README.md");
  assert.match(processes, /^# Processes\n\nOne folder per process, written against `meta\/core\/process-schema\.md`/);
  assert.ok(processes.includes("its phases in `phases/` against `meta/core/phase-schema.md`"));
  assert.ok(processes.includes("its tracks in `tracks/` against `meta/core/track-schema.md`"));
  assert.ok(files.get("model/profiles/README.md").includes("its experiences in `experiences/` against `meta/core/experience-schema.md`"));
});

test("a type with a noun spells its folder README with it, and one without reads as before", () => {
  const files = readmesFor(["kpis", "strategic-objectives"], "meta");
  assert.equal(files.get("model/kpis/README.md"), "# KPIs\n\nOne file per KPI, written against `meta/core/kpi-schema.md`.\n");
  assert.equal(
    files.get("model/strategic-objectives/README.md"),
    "# Strategic objectives\n\nOne file per strategic objective, written against `meta/core/strategic-objective-schema.md`.\n",
  );
});

test("an instance starts with a source and its two singular entities, naming the instance", () => {
  const files = startingEntities({ name: "Acme" });
  assert.deepEqual([...files.keys()].sort(), ["model/identity.md", "model/sources/local.md", "model/vision.md"]);
  assert.match(files.get("model/identity.md"), /^---\nsource: Local\n---\n\n# Acme\n\n> /);
  assert.match(files.get("model/identity.md"), /\n## What it is\n/);
  assert.match(files.get("model/vision.md"), /\n## What it means\n/);
  assert.match(files.get("model/sources/local.md"), /^# Local\n/);
});

test("the workflow calls the reusable check at the release it is given", () => {
  const text = workflowFor("v0.31.2");
  assert.match(text, /uses: companygraph\/meta-model\/\.github\/workflows\/instance-check\.yml@v0\.31\.2\n/);
  assert.match(text, /^name: companygraph\n/);
});

test("Claude's files name the vendored core and the instance", () => {
  const files = agentFilesFor({ agent: "claude", name: "Acme", units: "meta" });
  assert.deepEqual([...files.keys()].sort(), ["AGENTS.md", "CLAUDE.md"]);
  assert.equal(files.get("CLAUDE.md").trim(), "@AGENTS.md");
  assert.ok(files.get("AGENTS.md").includes("meta/core/CONVENTIONS.md"));
  assert.ok(files.get("AGENTS.md").includes("Acme"));
});
