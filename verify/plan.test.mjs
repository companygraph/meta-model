import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS, initPlan, upgradePlan } from "../lib/plan.mjs";
import { hashOf } from "../lib/instance-files.mjs";

const core = new Map([
  ["CONVENTIONS.md", "# Conventions\n"],
  ["manifest.json", '{ "version": "0.31.1", "shape": 3 }\n'],
  ["skill-schema.md", "# Skill Schema\n"],
]);
const ask = { core, tooling: "0.31.2", tag: "v0.31.2", name: "Acme", agent: "claude", units: "meta", present: new Set() };

test("claude is the one agent this release writes for, and it is named", () => {
  assert.deepEqual(AGENTS, ["claude"]);
  const refused = initPlan({ ...ask, agent: "codex" });
  assert.ok(refused.refused.includes("codex") && refused.refused.includes("claude"));
});

test("a plan writes the vendored core, the manifest, the folders, the entities, the workflow and the agent's files", () => {
  const { writes } = initPlan(ask);
  const paths = [...writes.keys()].sort();
  assert.ok(paths.includes("meta/core/CONVENTIONS.md") && paths.includes("meta/core/skill-schema.md"));
  assert.ok(paths.includes(".companygraph/manifest.json"));
  assert.ok(paths.includes("model/README.md") && paths.includes("model/skills/README.md"));
  assert.ok(paths.includes("model/identity.md") && paths.includes("model/vision.md") && paths.includes("model/sources/local.md"));
  assert.ok(paths.includes(".github/workflows/companygraph.yml"));
  assert.ok(paths.includes("AGENTS.md") && paths.includes("CLAUDE.md"));
  // Nothing of the skills, which are a release of their own.
  assert.ok(!paths.some((p) => p.includes(".claude/skills")));
});

test("the manifest it writes names the core's own version and shape, the tooling, and a hash per vendored file", () => {
  const { writes } = initPlan(ask);
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  assert.equal(manifest.tooling, "0.31.2");
  assert.deepEqual(manifest.core, { version: "0.31.1", shape: 3, source: "bundled" });
  assert.equal(manifest.units, "meta");
  assert.deepEqual(Object.keys(manifest.files).sort(), ["meta/core/CONVENTIONS.md", "meta/core/manifest.json", "meta/core/skill-schema.md"]);
  assert.match(manifest.files["meta/core/CONVENTIONS.md"], /^sha256:[0-9a-f]{64}$/);
});

test("a fetched core is said to be fetched, and the workflow names that tag", () => {
  const { writes } = initPlan({ ...ask, tag: "v0.30.0", fetched: true });
  assert.equal(JSON.parse(writes.get(".companygraph/manifest.json")).core.source, "fetched:v0.30.0");
  assert.ok(writes.get(".github/workflows/companygraph.yml").includes("instance-check.yml@v0.30.0"));
});

test("another schemas folder is written there and said in the manifest", () => {
  const { writes } = initPlan({ ...ask, units: "schemas" });
  assert.ok(writes.has("schemas/core/CONVENTIONS.md"));
  assert.equal(JSON.parse(writes.get(".companygraph/manifest.json")).units, "schemas");
  assert.ok(writes.get("AGENTS.md").includes("schemas/core/CONVENTIONS.md"));
});

test("anything already there refuses the whole plan, naming every conflict", () => {
  const taken = initPlan({ ...ask, present: new Set([".companygraph/manifest.json", "meta/core/CONVENTIONS.md"]) });
  assert.ok(taken.refused.includes(".companygraph/manifest.json"));
  assert.ok(taken.refused.includes("meta/core/CONVENTIONS.md"));
  assert.equal(taken.writes, undefined);
  // A file the plan does not write is not a conflict: `--here` adds to a repository.
  assert.ok(initPlan({ ...ask, present: new Set(["README.md", ".git/config"]) }).writes);
});

test("a name with nothing to write refuses", () => {
  assert.ok(initPlan({ ...ask, name: "  " }).refused.includes("name"));
});

const older = new Map([
  ["CONVENTIONS.md", "# Conventions\n"],
  ["manifest.json", '{ "version": "0.31.1", "shape": 3 }\n'],
  ["gone-schema.md", "# Gone Schema\n"],
]);
const newer = new Map([
  ["CONVENTIONS.md", "# Conventions, moved on\n"],
  ["manifest.json", '{ "version": "0.32.0", "shape": 3 }\n'],
  ["skill-schema.md", "# Skill Schema\n"],
]);
const instance = () => {
  const { writes } = initPlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", name: "Acme", agent: "claude", units: "meta", present: new Set() });
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  const held = new Map([...writes].filter(([path]) => manifest.files[path]));
  return { manifest, held, workflow: writes.get(".github/workflows/companygraph.yml") };
};

test("an upgrade writes what changed, removes what the new core dropped, and leaves the rest", () => {
  const { manifest, held, workflow } = instance();
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  assert.equal(plan.from, "0.31.1");
  assert.equal(plan.to, "0.32.0");
  assert.equal(plan.writes.get("meta/core/CONVENTIONS.md"), "# Conventions, moved on\n");
  assert.ok(plan.writes.has("meta/core/skill-schema.md"));
  assert.deepEqual(plan.removes, ["meta/core/gone-schema.md"]);
});

test("the manifest and the workflow move with the files", () => {
  const { manifest, held, workflow } = instance();
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  const moved = JSON.parse(plan.writes.get(".companygraph/manifest.json"));
  assert.equal(moved.tooling, "0.32.0");
  assert.deepEqual(moved.core, { version: "0.32.0", shape: 3, source: "bundled" });
  assert.deepEqual(Object.keys(moved.files).sort(), ["meta/core/CONVENTIONS.md", "meta/core/manifest.json", "meta/core/skill-schema.md"]);
  assert.ok(plan.writes.get(".github/workflows/companygraph.yml").includes("instance-check.yml@v0.32.0"));
});

test("a vendored file edited inside the instance refuses the whole upgrade, and --force takes it", () => {
  const { manifest, held, workflow } = instance();
  const changed = new Map(held).set("meta/core/CONVENTIONS.md", "# Conventions, edited here\n");
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: changed, workflow });
  assert.ok(refused.refused.includes("meta/core/CONVENTIONS.md"));
  assert.equal(refused.writes, undefined);
  const forced = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: changed, workflow, force: true });
  assert.deepEqual(forced.edited, ["meta/core/CONVENTIONS.md"]);
  assert.ok(forced.writes.has("meta/core/CONVENTIONS.md"));
});

test("a vendored file the instance no longer has is an edit of the same kind", () => {
  const { manifest, held, workflow } = instance();
  const missing = new Map(held);
  missing.delete("meta/core/gone-schema.md");
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: missing, workflow });
  assert.ok(refused.refused.includes("meta/core/gone-schema.md"));
});

test("an instance already on that core is said so, and nothing is written", () => {
  const { manifest, held, workflow } = instance();
  const same = upgradePlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow });
  assert.equal(same.writes.size, 0);
  assert.deepEqual(same.removes, []);
  assert.equal(same.from, "0.31.1");
  assert.equal(same.to, "0.31.1");
});

test("a workflow the instance does not have is not written by an upgrade", () => {
  const { manifest, held } = instance();
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow: null });
  assert.ok(!plan.writes.has(".github/workflows/companygraph.yml"));
});

// Defect 3: without a global match, a workflow pinning the reusable job twice — two jobs, or one
// left over from a copy-paste — only had its first occurrence moved, leaving the second pinned to
// the old tag and failing the pin guard with no upgrade left to run to fix it.
test("a workflow pinning the reusable job twice has both occurrences moved", () => {
  const { manifest, held } = instance();
  const workflow =
    "jobs:\n  a:\n    uses: companygraph/meta-model/.github/workflows/instance-check.yml@v0.31.1\n" +
    "  b:\n    uses: companygraph/meta-model/.github/workflows/instance-check.yml@v0.31.1\n";
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  const next = plan.writes.get(".github/workflows/companygraph.yml");
  assert.equal((next.match(/instance-check\.yml@v0\.32\.0/g) ?? []).length, 2);
  assert.ok(!next.includes("v0.31.1"));
});

// Defect 4: `\S+` runs straight through a closing quote, corrupting the YAML, and the shorter
// anchor "instance-check.yml@" also matches a differently named workflow's pin, moving a tag that
// upgrade has no business touching.
test("the workflow's tag is matched up to its closing quote, and a differently named workflow is left alone", () => {
  const { manifest, held } = instance();
  const workflow =
    'jobs:\n  a:\n    uses: "companygraph/meta-model/.github/workflows/instance-check.yml@v0.31.1"\n' +
    "  b:\n    uses: companygraph/meta-model/.github/workflows/model-instance-check.yml@v3\n";
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  const next = plan.writes.get(".github/workflows/companygraph.yml");
  assert.ok(next.includes('"companygraph/meta-model/.github/workflows/instance-check.yml@v0.32.0"'));
  assert.ok(next.includes("model-instance-check.yml@v3"));
});

// Defect 1: `manifest.files` is untrusted, and a correct hash next to a path outside the upgrade's
// own core is not a reason to trust it. The hash and the held text below are made to match on
// purpose: the pre-existing edited-file check would already refuse a hash mismatch or a missing
// file for the wrong reason, so this proves the new check catches it even when the hash is right.
test("a manifest naming a file outside its own core refuses the whole upgrade, hash and all", () => {
  const { manifest, held, workflow } = instance();
  const identity = "# Acme\n\n> One paragraph.\n";
  const hostileHeld = new Map(held).set("model/identity.md", identity);
  const hostile = { ...manifest, files: { ...manifest.files, "model/identity.md": hashOf(identity) } };
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest: hostile, held: hostileHeld, workflow });
  assert.ok(refused.refused.includes("model/identity.md"));
  assert.equal(refused.writes, undefined);
});

test("a manifest naming a `..` path in files refuses the whole upgrade even with a correct hash", () => {
  const { manifest, held, workflow } = instance();
  const victim = "do not delete me\n";
  const hostileHeld = new Map(held).set("../victim.txt", victim);
  const hostile = { ...manifest, files: { ...manifest.files, "../victim.txt": hashOf(victim) } };
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest: hostile, held: hostileHeld, workflow });
  assert.ok(refused.refused.includes("../victim.txt"));
  assert.equal(refused.writes, undefined);
});

// Defect 2: `units` is also untrusted, and an upgrade must refuse it rather than write core files
// through an escaping relative path.
test("a manifest whose units escapes the instance refuses the whole upgrade", () => {
  const { manifest, held, workflow } = instance();
  const hostile = { ...manifest, units: "../escaped" };
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest: hostile, held, workflow });
  assert.ok(refused.refused.includes("units"));
  assert.equal(refused.writes, undefined);
});
