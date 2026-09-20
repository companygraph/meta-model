import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS, initPlan } from "../lib/plan.mjs";

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
