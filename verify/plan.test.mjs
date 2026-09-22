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
  assert.equal(writes.get(".gitattributes"), "* text=auto eol=lf\n");
  // The skills are the caller's to pass, read from this release's agents/; none given, none written.
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

// Blocking 1/2 (2026-09-20 review): the workflow pin names the release of this checker — this
// package's own `tooling` — never the tag whose core happened to be fetched. A core older than
// the checker is legal by design, so a fetched tag naming an older release must not land on the
// workflow line: pinning it there made an instance's own CI red on its first commit.
test("a fetched core is said to be fetched, and the workflow names the tooling's own release, not the fetched tag", () => {
  const { writes } = initPlan({ ...ask, tag: "v0.30.0", fetched: true });
  assert.equal(JSON.parse(writes.get(".companygraph/manifest.json")).core.source, "fetched:v0.30.0");
  const workflow = writes.get(".github/workflows/companygraph.yml");
  assert.ok(workflow.includes(`instance-check.yml@v${ask.tooling}`));
  assert.ok(!workflow.includes("v0.30.0"));
});

test("another schemas folder is written there and said in the manifest", () => {
  const { writes } = initPlan({ ...ask, units: "schemas" });
  assert.ok(writes.has("schemas/core/CONVENTIONS.md"));
  assert.equal(JSON.parse(writes.get(".companygraph/manifest.json")).units, "schemas");
  assert.ok(writes.get("AGENTS.md").includes("schemas/core/CONVENTIONS.md"));
});

test("a file already there outside the units and .companygraph folders refuses the whole plan, naming every conflict", () => {
  const taken = initPlan({ ...ask, present: new Set(["AGENTS.md", "model/identity.md"]) });
  assert.ok(taken.refused.includes("AGENTS.md"));
  assert.ok(taken.refused.includes("model/identity.md"));
  assert.equal(taken.writes, undefined);
  // A file the plan does not write is not a conflict: `--here` adds to a repository.
  assert.ok(initPlan({ ...ask, present: new Set(["README.md", ".git/config"]) }).writes);
});

// Defect 5 (2026-09-20 review): `--here` must refuse when the units folder or `.companygraph/`
// already exists at all, not merge into it one file at a time. A per-file check alone lets an
// unrelated `meta/notes.txt` in a foreign repository through, because the plan below never writes
// exactly that path.
test("--here refuses when the units folder or .companygraph/ is already there, named by itself", () => {
  const meta = initPlan({ ...ask, present: new Set(["meta/notes.txt"]) });
  assert.ok(meta.refused.includes("meta/"));
  assert.equal(meta.writes, undefined);

  const companygraph = initPlan({ ...ask, present: new Set([".companygraph/other.json"]) });
  assert.ok(companygraph.refused.includes(".companygraph/"));
  assert.equal(companygraph.writes, undefined);

  // The bare folder name itself is a claim too, not only a file found beneath it.
  const bare = initPlan({ ...ask, present: new Set(["meta"]) });
  assert.ok(bare.refused.includes("meta/"));

  // A different --schemas name is checked the same way, by its own name.
  const schemas = initPlan({ ...ask, units: "schemas", present: new Set(["schemas/notes.txt"]) });
  assert.ok(schemas.refused.includes("schemas/"));
});

test("--here leaves a .gitattributes already there alone, rather than refusing over it", () => {
  const { writes, refused } = initPlan({ ...ask, present: new Set([".gitattributes"]) });
  assert.equal(refused, undefined);
  assert.ok(!writes.has(".gitattributes"));
});

test("a name with nothing to write refuses", () => {
  assert.ok(initPlan({ ...ask, name: "  " }).refused.includes("name"));
});

// Found by running `init --core v0.35.0` from a 0.32.0 tree to make companygraph/mental-model:
// `tooling` can only name this release, which refuses a core newer than itself, and the release
// that could run that core refuses a manifest naming another. Nothing is written.
test("a core newer than this tooling is refused by init before anything is written, naming the release to run", () => {
  const ahead = new Map([...core, ["manifest.json", '{ "version": "0.34.0", "shape": 3 }\n']]);
  const refused = initPlan({ ...ask, core: ahead, tag: "v0.35.0", fetched: true });
  assert.equal(refused.writes, undefined);
  assert.ok(refused.refused.includes("0.34.0") && refused.refused.includes(ask.tooling) && refused.refused.includes("v0.35.0"));
  // A core at or behind the tooling is legal by design.
  assert.ok(initPlan({ ...ask, core: new Map([...core, ["manifest.json", '{ "version": "0.31.2", "shape": 3 }\n']]) }).writes);
});

test("--folders writes only the folders named, and sources always, since the starting source lives there", () => {
  const { writes } = initPlan({ ...ask, folders: ["values", "processes"] });
  const readmes = [...writes.keys()].filter((p) => /^model\/[^/]+\/README\.md$/.test(p)).sort();
  assert.deepEqual(readmes, ["model/processes/README.md", "model/sources/README.md", "model/values/README.md"]);
  assert.ok(writes.has("model/sources/local.md"));
  // Absent, every root folder is written.
  assert.ok(initPlan(ask).writes.has("model/skills/README.md"));
});

test("--folders naming a folder core has not is refused by name, listing the ones it has", () => {
  const refused = initPlan({ ...ask, folders: ["values", "people"] });
  assert.equal(refused.writes, undefined);
  assert.ok(refused.refused.includes("people") && refused.refused.includes("skills"));
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

test("an upgrade to a core newer than this tooling is refused before anything is written", () => {
  const { manifest, held, workflow } = instance();
  const plan = upgradePlan({ core: newer, tooling: "0.31.2", tag: "v0.33.0", manifest, held, workflow, fetched: true });
  assert.equal(plan.writes, undefined);
  assert.ok(plan.refused.includes("0.32.0") && plan.refused.includes("v0.33.0"));
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
  assert.deepEqual(forced.missing, []);
  assert.ok(forced.writes.has("meta/core/CONVENTIONS.md"));
});

// Defect 7 (2026-09-20 review): a file the instance no longer holds was never there to overwrite,
// so it must not be reported as edited — `--force` writes it fresh instead, and the two lists are
// kept apart so a report never calls a missing file "overwritten".
test("a vendored file the instance no longer has refuses the same as an edit, but --force writes it fresh, not 'overwritten'", () => {
  const { manifest, held, workflow } = instance();
  const goneFromDisk = new Map(held);
  goneFromDisk.delete("meta/core/gone-schema.md");
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: goneFromDisk, workflow });
  assert.ok(refused.refused.includes("meta/core/gone-schema.md"));
  const forced = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: goneFromDisk, workflow, force: true });
  assert.deepEqual(forced.missing, ["meta/core/gone-schema.md"]);
  assert.deepEqual(forced.edited, []);
  // And this one is not written fresh either: the new core no longer ships it, so it is removed.
  // Reporting every missing file as written fresh was the same false claim in another place,
  // which is why what a report says is read from the writes, not from this list.
  assert.ok(!forced.writes.has("meta/core/gone-schema.md"));
  assert.ok(forced.removes.includes("meta/core/gone-schema.md"));
});

// A file the instance deleted that the new core DOES still ship is the other half of that pair:
// this one really is written fresh, and a report may say so.
test("a vendored file the instance deleted that the new core still ships is written fresh", () => {
  const { manifest, held, workflow } = instance();
  const goneFromDisk = new Map(held);
  goneFromDisk.delete("meta/core/CONVENTIONS.md");
  const forced = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held: goneFromDisk, workflow, force: true });
  assert.ok(forced.missing.includes("meta/core/CONVENTIONS.md"));
  assert.equal(forced.writes.get("meta/core/CONVENTIONS.md"), newer.get("CONVENTIONS.md"));
  assert.ok(!forced.removes.includes("meta/core/CONVENTIONS.md"));
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
// On Windows `path.resolve` reads `\\` as a separator, so a key with no `..` segment between
// slashes can still climb out of the folder it claims to sit in, and the belt-and-braces guard in
// the command only holds it inside the instance, not inside core.
test("a manifest naming a key with a backslash refuses the whole upgrade, even with a correct hash", () => {
  const { writes: initial } = initPlan(ask);
  const manifest = JSON.parse(initial.get(".companygraph/manifest.json"));
  const key = "meta/core/..\\..\\model\\identity.md";
  manifest.files[key] = hashOf("# Acme\n");
  const held = new Map([[key, "# Acme\n"]]);
  for (const path of Object.keys(manifest.files)) if (initial.has(path)) held.set(path, initial.get(path));
  const { refused, writes } = upgradePlan({ core, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow: null });
  assert.ok(refused && refused.includes(key), refused);
  assert.equal(writes, undefined);
});

test("a manifest whose units escapes the instance refuses the whole upgrade", () => {
  const { manifest, held, workflow } = instance();
  const hostile = { ...manifest, units: "../escaped" };
  const refused = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest: hostile, held, workflow });
  assert.ok(refused.refused.includes("units"));
  assert.equal(refused.writes, undefined);
});

const skills = new Map([["companygraph-validate/SKILL.md", "# Validate\n"]]);

test("init writes the agent's skills under .claude/skills/ and hashes them like the core", () => {
  const { writes } = initPlan({ ...ask, skills });
  assert.equal(writes.get(".claude/skills/companygraph-validate/SKILL.md"), "# Validate\n");
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  assert.equal(manifest.files[".claude/skills/companygraph-validate/SKILL.md"], hashOf("# Validate\n"));
});

test("an upgrade moves the skills of an instance init gave them to, and edits refuse as core's do", () => {
  const { writes } = initPlan({ core: older, skills, tooling: "0.31.2", tag: "v0.31.2", name: "Acme", agent: "claude", present: new Set() });
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  const held = new Map([...writes].filter(([path]) => manifest.files[path]));
  const next = new Map([["companygraph-validate/SKILL.md", "# Validate, moved on\n"], ["companygraph-export/SKILL.md", "# Export\n"]]);
  const plan = upgradePlan({ core: newer, skills: next, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow: null });
  assert.equal(plan.writes.get(".claude/skills/companygraph-validate/SKILL.md"), "# Validate, moved on\n");
  assert.equal(plan.writes.get(".claude/skills/companygraph-export/SKILL.md"), "# Export\n");

  held.set(".claude/skills/companygraph-validate/SKILL.md", "# Validate, edited here\n");
  const refused = upgradePlan({ core: newer, skills: next, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow: null });
  assert.ok(refused.refused.includes(".claude/skills/companygraph-validate/SKILL.md"));
});

// An instance `init` made before the skills existed records none and holds none: it is given
// them. One that wrote skills of its own under the tooling's names keeps them, and the upgrade
// is not refused over them.
test("an instance whose manifest records no skills is given them where it holds none, and keeps its own where it holds any", () => {
  const { manifest, held, workflow } = instance();
  const given = upgradePlan({ core: newer, skills, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  assert.equal(given.writes.get(".claude/skills/companygraph-validate/SKILL.md"), "# Validate\n");
  assert.ok(Object.keys(JSON.parse(given.writes.get(".companygraph/manifest.json")).files).includes(".claude/skills/companygraph-validate/SKILL.md"));

  const own = new Map([...held, [".claude/skills/companygraph-validate/SKILL.md", "# Our own validate\n"]]);
  const kept = upgradePlan({ core: newer, skills, tooling: "0.32.0", tag: "v0.32.0", manifest, held: own, workflow });
  assert.equal(kept.refused, undefined);
  assert.ok(![...kept.writes.keys()].some((path) => path.startsWith(".claude/")));
  assert.ok(!Object.keys(JSON.parse(kept.writes.get(".companygraph/manifest.json")).files).some((path) => path.startsWith(".claude/")));
});
