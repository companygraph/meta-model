import test from "node:test";
import assert from "node:assert/strict";
import {
  agentFilesFor, exportFilesFor, hashOf, manifestOf, readmesFor, rootFolders, startingEntities, workflowFor,
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

test("an instance starts with a source and its singular entities, naming the instance", () => {
  // Ids are handed out in order from a fixed list, so each page's id is known and the pages
  // are seen to take one each (R18), none shared.
  const ids = ["01a0f10b-0000-7000-8000-000000000001", "01a0f10b-0000-7000-8000-000000000002", "01a0f10b-0000-7000-8000-000000000003", "01a0f10b-0000-7000-8000-000000000004", "01a0f10b-0000-7000-8000-000000000005", "01a0f10b-0000-7000-8000-000000000006"];
  let next = 0;
  const files = startingEntities({ name: "Acme", id: () => ids[next++] });
  assert.deepEqual([...files.keys()].sort(), ["model/brand.md", "model/identifier.md", "model/identity.md", "model/localization.md", "model/sources/local.md", "model/vision.md"]);
  assert.equal(next, ids.length);
  assert.deepEqual(new Set([...files.values()].map((text) => text.match(/^---\nid: (\S+)\n/)[1])), new Set(ids));
  assert.match(files.get("model/identity.md"), /^---\nid: \S+\nsource: Local\n---\n\n# Acme\n\n> /);
  assert.match(files.get("model/identity.md"), /\n## What it is\n/);
  assert.match(files.get("model/vision.md"), /\n## What it means\n/);
  assert.match(files.get("model/brand.md"), /^---\nid: \S+\nsource: Local\n---\n\n# Acme\n\n> /);
  for (const section of ["Mark", "Color", "Typography", "Voice", "References"]) assert.match(files.get("model/brand.md"), new RegExp(`\n## ${section}\n`));
  // A required table section carries at least one row (R16), so the starting table holds a
  // placeholder row a reader cannot mistake for a real color, and the checks pass it.
  assert.match(files.get("model/brand.md"), /\n## Color\n\n\| Name \| Means \| Never \|\n\| --- \| --- \| --- \|\n\| .+ \|\n\n## Typography\n/);
  assert.match(files.get("model/sources/local.md"), /^---\nid: \S+\n---\n\n# Local\n/);
  assert.match(files.get("model/identifier.md"), /^---\nid: \S+\nsource: Local\nformat: uuidv7\n---\n\n# /);
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

test("the export's inputs name the instance and count nothing themselves, so they hold for any model", () => {
  const files = exportFilesFor({ name: "Acme" });
  assert.deepEqual([...files.keys()].sort(), ["export/README.md", "export/gemini-notebook-AGENTS.md"]);
  const guide = files.get("export/gemini-notebook-AGENTS.md");
  assert.match(guide, /^# Acme — the model\n/);
  assert.match(guide, /\{\{entities\}\}/);
  assert.match(guide, /References between entities are by name/);
  // A digit in the guide is a count nobody substitutes; only the build's tokens state numbers.
  assert.ok(!/\d/.test(guide), "the guide states no number of its own");
  assert.ok(!/\{\{count:/.test(guide), "the guide names no source a model may not have");
});
