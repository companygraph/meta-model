import test from "node:test";
import assert from "node:assert/strict";
import { AGENTS, adoptPlan, adoptedUpgradePlan, initPlan, upgradePlan, backfillPlan, schemaBackfillPlan } from "../lib/plan.mjs";
import { GATE_HOOK, hashOf, HOOK, INSTANCE_PINS, MERGE_HOOK } from "../lib/instance-files.mjs";
import { msOf, UUIDV7 } from "../lib/ids.mjs";
import { vocabularyOf } from "../lib/checks.mjs";

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
  assert.ok(paths.includes("model/brand.md") && paths.includes("model/identity.md") && paths.includes("model/vision.md") && paths.includes("model/sources/local.md"));
  assert.ok(paths.includes(".github/workflows/companygraph.yml"));
  assert.ok(paths.includes("AGENTS.md") && paths.includes("CLAUDE.md"));
  assert.equal(writes.get(".gitattributes"), "* text=auto eol=lf\n");
  assert.equal(writes.get(".gitignore"), "dist/\n.obsidian/\n");
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

test("init writes the commit-msg hook, and --no-hook leaves it out", () => {
  const withHook = initPlan(ask);
  assert.ok(withHook.writes.get(".companygraph/hooks/commit-msg").startsWith("#!/bin/sh\n"));
  const manifest = JSON.parse(withHook.writes.get(".companygraph/manifest.json"));
  assert.equal(".companygraph/hooks/commit-msg" in manifest.files, false);
  assert.equal(initPlan({ ...ask, hook: false }).writes.has(".companygraph/hooks/commit-msg"), false);
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

test("--here leaves a .gitignore already there alone, since what a repository ignores is its own", () => {
  const { writes, refused } = initPlan({ ...ask, present: new Set([".gitignore"]) });
  assert.equal(refused, undefined);
  assert.ok(!writes.has(".gitignore"));
  assert.ok(writes.has(".gitattributes"));
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

// What an older tooling did three times to an instance on a newer core: its own release's core
// written over the instance's, and the manifest and workflow tag moved back with it.
const ahead = () => {
  const { writes } = initPlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", name: "Acme", agent: "claude", units: "meta", present: new Set() });
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  const held = new Map([...writes].filter(([path]) => manifest.files[path]));
  return { manifest, held, workflow: writes.get(".github/workflows/companygraph.yml") };
};

test("an upgrade to a core older than the instance's is refused, --force or not", () => {
  const { manifest, held, workflow } = ahead();
  for (const force of [false, true]) {
    const plan = upgradePlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow, force });
    assert.equal(plan.writes, undefined);
    assert.ok(plan.refused.includes("0.32.0") && plan.refused.includes("0.31.1"), plan.refused);
  }
});

test("an upgrade from a tooling older than the instance's is refused on the same core", () => {
  const { manifest, held, workflow } = ahead();
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest: { ...manifest, tooling: "0.32.4" }, held, workflow, force: true });
  assert.equal(plan.writes, undefined);
  assert.ok(plan.refused.includes("0.32.4") && plan.refused.includes("0.32.0"), plan.refused);
});

test("an upgrade from the instance's own release is no move back, and passes", () => {
  const { manifest, held, workflow } = ahead();
  const plan = upgradePlan({ core: newer, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow });
  assert.equal(plan.refused, undefined);
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
  const same = upgradePlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow, present: new Set(["pins.json"]) });
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
test("init writes the export's inputs, unhashed, and --here leaves one already there alone", () => {
  const { writes } = initPlan(ask);
  assert.match(writes.get("export/gemini-notebook-AGENTS.md"), /^# Acme — the model\n/);
  assert.ok(writes.has("export/README.md"));
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  assert.ok(!Object.keys(manifest.files).some((p) => p.startsWith("export/")), "the instance's own, so never hashed");
  const here = initPlan({ ...ask, present: new Set(["export/gemini-notebook-AGENTS.md"]) });
  assert.ok(!here.refused, here.refused);
  assert.ok(!here.writes.has("export/gemini-notebook-AGENTS.md") && here.writes.has("export/README.md"));
});

test("an upgrade writes the export's inputs the instance lacks, never one it has, and leaves the manifest alone for them", () => {
  const { manifest, held, workflow } = instance();
  const plan = upgradePlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow, name: "Acme", present: new Set(["export/README.md", "pins.json"]) });
  assert.deepEqual(plan.given, ["export/gemini-notebook-AGENTS.md"]);
  assert.deepEqual([...plan.writes.keys()], ["export/gemini-notebook-AGENTS.md"]);
  const none = upgradePlan({ core: older, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow, present: new Set(["pins.json"]) });
  assert.equal(none.writes.size, 0, "no name, and nothing is given");
});

// Review fix 1: `upgrade` only ever wrote export files; a core that grows the localization
// schema left an instance upgraded from before it with no model/localization.md at all, and
// nothing later would write one. An upgrade now writes it, once, reading `source` from
// model/identity.md the way `backfillPlan` does, and never touches a page the instance has.
const withLocalizationSchema = new Map([...older, ["localization-schema.md", "# Localization Schema\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `locale` | Yes | string | The language |\n"]]);

test("an upgrade writes model/localization.md when the new core carries the schema and the instance has none, with source read from identity", () => {
  const { manifest, held, workflow } = instance();
  const withIdentity = new Map(held).set("model/identity.md", "---\nid: 0198\nsource: Acquired\n---\n\n# Acme\n");
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withIdentity, workflow });
  const page = plan.writes.get("model/localization.md");
  assert.ok(page, "model/localization.md is written");
  const id = page.match(/^---\nid: (\S+)\nsource: Acquired\nlocale: en-US\n---\n/)?.[1];
  assert.ok(id && UUIDV7.test(id), `expected a fresh UUIDv7, got ${id}`);
});

test("an upgrade defaults localization.md's source to Local when identity names none, and never overwrites one the instance already has", () => {
  const { manifest, held, workflow } = instance();
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow });
  assert.match(plan.writes.get("model/localization.md"), /\nsource: Local\n/);

  const already = "---\nid: existing\nsource: Local\nlocale: de-CH\n---\n\n# Language\n";
  const withOwn = new Map(held).set("model/localization.md", already);
  const kept = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withOwn, workflow });
  assert.ok(!kept.writes.has("model/localization.md"), "an existing file is never overwritten");
});

const OLD_LOCALIZATION = (rows) =>
  `---\nid: existing\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n${rows}\n`;

test("an upgrade rewrites a localization page in the earlier form into its locale field", () => {
  const { manifest, held, workflow } = instance();
  const withOld = new Map(held).set("model/localization.md", OLD_LOCALIZATION("| de-CH | primary |"));
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withOld, workflow });
  assert.equal(plan.writes.get("model/localization.md"), "---\nid: existing\nsource: Local\nlocale: de-CH\n---\n\n# Languages\n\n> Who reads it.\n");
  assert.deepEqual(plan.rewritten, ["model/localization.md"]);
});

test("an upgrade leaves a localization page that already names its locale alone", () => {
  const { manifest, held, workflow } = instance();
  const current = "---\nid: existing\nsource: Local\nlocale: en-US\n---\n\n# Language\n\n> Who reads it.\n";
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(held).set("model/localization.md", current), workflow });
  assert.ok(!plan.writes.has("model/localization.md"));
  assert.deepEqual(plan.rewritten, []);
});

test("an upgrade refuses a localization page that declares a translated language, writing nothing", () => {
  const { manifest, held, workflow } = instance();
  const withTranslated = new Map(held).set("model/localization.md", OLD_LOCALIZATION("| en-US | primary |\n| de-CH | translated |"));
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: withTranslated, workflow });
  assert.match(plan.refused, /^model\/localization\.md declares de-CH translated; a model is written in one language/);
  assert.equal(plan.writes, undefined);
});

// Final review: a page the migration cannot read does not stop the core from moving; the
// upgrade leaves it as it is, and the check afterward names what it owes.
test("an upgrade leaves a localization page it cannot read alone, and lands", () => {
  const { manifest, held, workflow } = instance();
  const unreadable = "---\nid: existing\nsource: Local\n---\n\n# Language\n\n> Who reads it.\n";
  const plan = upgradePlan({ core: withLocalizationSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(held).set("model/localization.md", unreadable), workflow });
  assert.equal(plan.refused, undefined);
  assert.ok(!plan.writes.has("model/localization.md"));
  assert.deepEqual(plan.rewritten, []);
});

// Final review, minors: `--core <old>` vendors a schema with the `## Locales` table, and the page
// written beside it is the one that schema reads.
test("init and upgrade write the localization page in the form the vendored core's schema declares", () => {
  const oldCore = new Map([...core, ["localization-schema.md", "# Locales schema\n"]]);
  const made = initPlan({ ...ask, core: oldCore }).writes.get("model/localization.md");
  assert.match(made, /## Locales\n\n\| Locale \| Role \|/);
  assert.doesNotMatch(made, /\nlocale:/);
  assert.match(initPlan(ask).writes.get("model/localization.md"), /\nlocale: en-US\n/);
  const { manifest, held, workflow } = instance();
  const olderSchema = new Map([...older, ["localization-schema.md", "# Locales schema\n"]]);
  const given = upgradePlan({ core: olderSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held, workflow }).writes.get("model/localization.md");
  assert.match(given, /## Locales\n/);
  assert.doesNotMatch(given, /\nlocale:/);
});

test("an upgrade toward a core whose schema declares no locale leaves the earlier form alone", () => {
  const { manifest, held, workflow } = instance();
  const olderSchema = new Map([...older, ["localization-schema.md", "# Locales schema\n"]]);
  const plan = upgradePlan({ core: olderSchema, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(held).set("model/localization.md", OLD_LOCALIZATION("| en-US | primary |")), workflow });
  assert.ok(!plan.writes.has("model/localization.md"));
});

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

const MS = Date.UTC(2026, 7, 29);
const tree = () => new Map([
  ["model/README.md", "# The model\n"],
  ["model/sources/local.md", "# Local\n\n> Here.\n"],
  ["model/identity.md", "---\nsource: Local\n---\n\n# Acme\n"],
  ["model/skills/java.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\n---\n\n# Java\n"],
]);

test("the backfill gives a page without an id one stamped with its first commit, and leaves a README alone", () => {
  const writes = backfillPlan(tree(), { firstCommitMs: () => MS });
  assert.equal(writes.has("model/README.md"), false);
  assert.equal(writes.has("model/skills/java.md"), false);
  const local = writes.get("model/sources/local.md");
  assert.match(local, /^---\nid: [0-9a-f-]{36}\n---\n\n# Local\n\n> Here\.\n$/);
  assert.equal(msOf(local.slice(8, 44)), MS);
});

test("a page with no commit takes the moment of the run", () => {
  const writes = backfillPlan(tree(), { firstCommitMs: () => null, now: MS + 5 });
  assert.equal(msOf(writes.get("model/identity.md").slice(8, 44)), MS + 5);
});

test("the backfill writes model/identifier.md where there is none, with the identity's source", () => {
  const page = backfillPlan(tree(), { firstCommitMs: () => MS }).get("model/identifier.md");
  assert.match(page, /^---\nid: [0-9a-f-]{36}\nsource: Local\nformat: uuidv7\n---\n\n# Entity id\n/);
  assert.match(page.slice(8, 44), UUIDV7);
});

test("run twice, the backfill writes nothing the second time", () => {
  const files = tree();
  for (const [path, text] of backfillPlan(files, { firstCommitMs: () => MS })) files.set(path, text);
  assert.equal(backfillPlan(files, { firstCommitMs: () => MS }).size, 0);
});

// The spec: under a pattern format, the instance makes its own ids, and the tooling only checks
// them. Stamping UUIDv7 ids anyway would give an instance two id formats at once, so the backfill
// refuses whole rather than writing over what it cannot itself make.
test("the backfill refuses whole when model/identifier.md declares a pattern, and writes nothing", () => {
  const files = tree();
  files.set("model/identifier.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\nformat: pattern\npattern: ^E-[0-9]{4,}$\n---\n\n# Entity id\n");
  const plan = backfillPlan(files, { firstCommitMs: () => MS });
  assert.match(plan.refused, /model\/identifier\.md declares a pattern; the tooling makes only UUID version 7 \(R18\)/);
  assert.equal(plan.writes, undefined);
});

test("the backfill refuses whole when model/identifier.md cannot be read as a format, and names why", () => {
  const files = tree();
  files.set("model/identifier.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\nformat: serial\n---\n\n# Entity id\n");
  const plan = backfillPlan(files, { firstCommitMs: () => MS });
  assert.match(plan.refused, /model\/identifier\.md: `format` is "serial"; it is `uuidv7` or `pattern` \(R18\)/);
});

const coreTree = () => new Map([
  ["core/CONVENTIONS.md", "# Conventions\n"],
  ["core/skill-schema.md", "# Skill Schema\n\n> A skill.\n"],
  ["core/source-schema.md", "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\n---\n\n# Source Schema\n"],
]);

test("the schema backfill stamps a schema without an id with its first commit, and nothing else", () => {
  const writes = schemaBackfillPlan(coreTree(), { firstCommitMs: () => MS });
  assert.deepEqual([...writes.keys()], ["core/skill-schema.md"]);
  const text = writes.get("core/skill-schema.md");
  assert.match(text, /^---\nid: [0-9a-f-]{36}\n---\n\n# Skill Schema\n\n> A skill\.\n$/);
  assert.equal(msOf(text.slice(8, 44)), MS);
});

test("run twice, the schema backfill writes nothing the second time", () => {
  const files = coreTree();
  for (const [path, text] of schemaBackfillPlan(files, { firstCommitMs: () => MS })) files.set(path, text);
  assert.equal(schemaBackfillPlan(files, { firstCommitMs: () => MS }).size, 0);
});

// R20: a pack is a unit beside core, vendored, hashed and moved the way core is.
const INIT_ARGS = ask;
const UPGRADE_ARGS = (() => {
  const { workflow } = instance();
  return { core: newer, tooling: "0.32.0", tag: "v0.32.0", workflow };
})();

test("init with a pack vendors it beside core and lists it in the manifest", () => {
  const packs = new Map([["software", new Map([["manifest.json", '{ "name": "software", "version": "0.0.1" }'], ["bounded-context-schema.md", "# Bounded Context Schema\n"]])]]);
  const { writes } = initPlan({ ...INIT_ARGS, packs });
  assert.equal(writes.get("meta/software/bounded-context-schema.md"), "# Bounded Context Schema\n");
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  assert.deepEqual(manifest.packs, ["software"]);
  assert.ok("meta/software/bounded-context-schema.md" in manifest.files);
});

test("an upgrade moves a pack's files with core's, and an edited pack schema stops it", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "new\n"]])]]);
  const manifest = { tooling: "0.0.1", core: { version: "0.0.1" }, units: "meta", packs: ["software"], files: { "meta/software/bounded-context-schema.md": hashOf("old\n") } };
  const moved = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map([["meta/software/bounded-context-schema.md", "old\n"]]) });
  assert.equal(moved.writes.get("meta/software/bounded-context-schema.md"), "new\n");
  const stopped = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map([["meta/software/bounded-context-schema.md", "edited\n"]]) });
  assert.match(stopped.refused, /meta\/software\/bounded-context-schema\.md/);
});

test("an upgrade given a pack the instance did not take vendors it and lists it", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "new\n"]])]]);
  const manifest = { tooling: "0.0.1", core: { version: "0.0.1" }, units: "meta", packs: [], files: {} };
  const { writes, refused } = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map() });
  assert.equal(refused, undefined);
  assert.equal(writes.get("meta/software/bounded-context-schema.md"), "new\n");
  assert.deepEqual(JSON.parse(writes.get(".companygraph/manifest.json")).packs, ["software"]);
});

test("the backfill gives a page of a pack's type an id when it is handed the pack's rows, and leaves it alone without them", () => {
  const files = tree();
  files.set("model/feature-designs/checkout.md", "---\nsource: Local\n---\n\n# Checkout\n");
  const { types } = vocabularyOf({ packs: [{ name: "software", dir: "meta/software" }] });
  assert.ok(backfillPlan(files, { firstCommitMs: () => MS, types }).has("model/feature-designs/checkout.md"));
  assert.equal(backfillPlan(files, { firstCommitMs: () => MS }).has("model/feature-designs/checkout.md"), false);
});

// A pack's root folders are folders of the instance that takes it: each gets the README every
// folder gets, naming the schema in the pack's unit, and --folders can name them.
test("init with a pack writes a README for each root folder the pack adds, naming the pack's schemas", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "# Bounded Context Schema\n"]])]]);
  const { writes } = initPlan({ ...INIT_ARGS, packs });
  assert.equal(writes.get("model/feature-designs/README.md"), "# Feature designs\n\nOne file per feature design, written against `meta/software/feature-design-schema.md`.\n");
  const contexts = writes.get("model/bounded-contexts/README.md");
  assert.match(contexts, /^# Bounded contexts\n\nOne folder per bounded context, written against `meta\/software\/bounded-context-schema\.md`/);
  assert.ok(contexts.includes("its concept designs in `concept-designs/` against `meta/software/concept-design-schema.md`"));
  assert.ok(writes.get("model/skills/README.md").includes("`meta/core/skill-schema.md`"));
});

test("--folders can name a pack's root folder, and without a pack it is still refused as before", () => {
  const packs = new Map([["software", new Map()]]);
  const { writes } = initPlan({ ...INIT_ARGS, packs, folders: ["bounded-contexts"] });
  assert.ok(writes.has("model/bounded-contexts/README.md") && !writes.has("model/feature-designs/README.md"));
  const refused = initPlan({ ...INIT_ARGS, folders: ["bounded-contexts"] });
  assert.match(refused.refused, /bounded-contexts is no folder of core; the folders are /);
});

test("an init without a pack writes no folder README of a pack", () => {
  const { writes } = initPlan(INIT_ARGS);
  assert.ok(![...writes.keys()].some((p) => p.includes("bounded-contexts") || p.includes("feature-designs")));
});

test("an upgrade that takes a pack writes its root folders' READMEs once, and names them as given", () => {
  const packs = new Map([["software", new Map([["bounded-context-schema.md", "new\n"]])]]);
  const manifest = { tooling: "0.0.1", core: { version: "0.0.1" }, units: "meta", packs: [], files: {} };
  const { writes, given } = upgradePlan({ ...UPGRADE_ARGS, manifest, packs, held: new Map() });
  assert.match(writes.get("model/feature-designs/README.md"), /meta\/software\/feature-design-schema\.md/);
  assert.ok(given.includes("model/bounded-contexts/README.md"));
  assert.ok(!writes.has("model/README.md"));
  const listed = upgradePlan({ ...UPGRADE_ARGS, manifest: { ...manifest, packs: ["software"] }, packs, held: new Map() });
  assert.ok(!listed.writes.has("model/bounded-contexts/README.md"));
});

test("init writes into the manifest that the form check leaves out dist and the units folder", () => {
  assert.deepEqual(JSON.parse(initPlan(ask).writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta"]);
  assert.deepEqual(JSON.parse(initPlan({ ...ask, units: "schemas" }).writes.get(".companygraph/manifest.json")).exclude, ["dist", "schemas"]);
});

test("init writes a pins.json that declares the instance's own core-release pin, with its move", () => {
  const pins = JSON.parse(initPlan(ask).writes.get("pins.json"));
  assert.deepEqual(pins, { pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model", move: "npx --yes 'github:companygraph/meta-model#v{version}' upgrade" }] });
});

test("--here leaves a pins.json already there alone, since a repository's pins are its own", () => {
  const { writes } = initPlan({ ...ask, present: new Set(["pins.json"]) });
  assert.equal(writes.has("pins.json"), false);
});

test("an upgrade writes pins.json where the instance has none, and never touches one it has", () => {
  const manifest = { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {} };
  const base = { core, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(), workflow: null };
  const given = upgradePlan({ ...base, present: new Set() });
  assert.ok(given.writes.has("pins.json"));
  assert.ok(given.given.includes("pins.json"));
  const kept = upgradePlan({ ...base, present: new Set(["pins.json"]) });
  assert.equal(kept.writes.has("pins.json"), false);
});

test("an upgrade asked without `present` writes no pins.json, for it has not said what the repository holds", () => {
  const manifest = { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {} };
  const plan = upgradePlan({ core, tooling: "0.31.2", tag: "v0.31.2", manifest, held: new Map(), workflow: null });
  assert.equal(plan.writes.has("pins.json"), false);
  assert.equal(plan.given.includes("pins.json"), false);
});

test("an upgrade keeps the instance's own exclude list and gives an older instance the default", () => {
  const base = { core, tooling: "0.31.2", tag: "v0.31.2", held: new Map(), workflow: null };
  const older = upgradePlan({ ...base, manifest: { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {} } });
  assert.deepEqual(JSON.parse(older.writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta"]);
  const own = upgradePlan({ ...base, manifest: { tooling: "0.31.1", units: "meta", core: { version: "0.31.0" }, files: {}, exclude: ["dist", "meta", "archive"] } });
  assert.deepEqual(JSON.parse(own.writes.get(".companygraph/manifest.json")).exclude, ["dist", "meta", "archive"]);
});

test("adopt writes a manifest with tooling and exclude and no core, the workflow, the hook and the instance pins.json", () => {
  const { writes } = adoptPlan({ tooling: "0.69.0", present: new Set() });
  assert.deepEqual([...writes.keys()].sort(), [".companygraph/hooks/commit-msg", ".companygraph/manifest.json", ".github/workflows/companygraph.yml", "pins.json"]);
  assert.deepEqual(JSON.parse(writes.get(".companygraph/manifest.json")), { tooling: "0.69.0", exclude: ["dist"] });
  assert.match(writes.get(".github/workflows/companygraph.yml"), /repository-check\.yml@v0\.69\.0/);
  assert.deepEqual(JSON.parse(writes.get("pins.json")), JSON.parse(INSTANCE_PINS));
});

test("adopt refuses an instance, and a repository that took the machinery already, by name, pointing at upgrade", () => {
  const refused = adoptPlan({ tooling: "0.69.0", present: new Set([".companygraph/manifest.json", "model/README.md"]) });
  assert.match(refused.refused, /upgrade/);
});

test("adopt keeps a pins.json already there, and refuses a workflow of the same name, naming it", () => {
  assert.equal(adoptPlan({ tooling: "0.69.0", present: new Set(["pins.json"]) }).writes.has("pins.json"), false);
  assert.match(adoptPlan({ tooling: "0.69.0", present: new Set([".github/workflows/companygraph.yml"]) }).refused, /companygraph\.yml/);
});

test("an upgrade of an adopted repository moves tooling and its workflow's ref, keeps its exclude, and vendors no core", () => {
  const workflow = "jobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/repository-check.yml@v0.68.0\n";
  const plan = adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.68.0", exclude: ["dist", "public"] }, workflow, present: new Set(["pins.json"]) });
  assert.deepEqual([...plan.writes.keys()].sort(), [".companygraph/manifest.json", ".github/workflows/companygraph.yml"]);
  assert.deepEqual(JSON.parse(plan.writes.get(".companygraph/manifest.json")), { tooling: "0.69.0", exclude: ["dist", "public"] });
  assert.match(plan.writes.get(".github/workflows/companygraph.yml"), /repository-check\.yml@v0\.69\.0/);
  assert.deepEqual(adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.69.0", exclude: ["dist"] }, workflow: null, present: new Set(["pins.json"]) }).writes.size, 0);
});

test("an upgrade of an adopted repository from an older tooling is refused, naming both", () => {
  const workflow = "jobs:\n  companygraph:\n    uses: companygraph/meta-model/.github/workflows/repository-check.yml@v0.70.0\n";
  const plan = adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.70.0", exclude: ["dist"] }, workflow, present: new Set() });
  assert.equal(plan.writes, undefined);
  assert.ok(plan.refused.includes("0.70.0") && plan.refused.includes("0.69.0"), plan.refused);
});

test("an upgrade of an adopted repository with no pins.json writes the instance pins and says it gave them", () => {
  const plan = adoptedUpgradePlan({ tooling: "0.69.0", manifest: { tooling: "0.69.0", exclude: ["dist"] }, workflow: null, present: new Set() });
  assert.deepEqual(JSON.parse(plan.writes.get("pins.json")), JSON.parse(INSTANCE_PINS));
  assert.deepEqual(plan.given, ["pins.json"]);
});

const GATE_PATHS = [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"];
const gateWrites = (writes) => GATE_PATHS.filter((p) => writes.has(p));

test("init writes what the gate names: the workflow for github, the hooks for git, neither for none", () => {
  assert.deepEqual(gateWrites(initPlan(ask).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  assert.deepEqual(gateWrites(initPlan({ ...ask, gate: "github" }).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  const git = initPlan({ ...ask, gate: "git" }).writes;
  assert.deepEqual(gateWrites(git), [".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.equal(git.get(".companygraph/hooks/pre-commit"), GATE_HOOK);
  assert.equal(git.get(".companygraph/hooks/pre-merge-commit"), MERGE_HOOK);
  assert.equal(JSON.parse(git.get(".companygraph/manifest.json")).gate, "git");
  assert.match(git.get("AGENTS.md"), /pre-commit hook/);
  const none = initPlan({ ...ask, gate: "none" }).writes;
  assert.deepEqual(gateWrites(none), []);
  assert.equal(JSON.parse(none.get(".companygraph/manifest.json")).gate, "none");
  assert.equal(JSON.parse(initPlan(ask).writes.get(".companygraph/manifest.json")).gate, undefined);
});

test("init refuses an unknown gate, the git gate without git, and the git gate without its hooks", () => {
  assert.match(initPlan({ ...ask, gate: "gitlab" }).refused, /gitlab is not a gate; the gates are github, git, none/);
  assert.match(initPlan({ ...ask, gate: "git", repository: false }).refused, /not a git repository/);
  assert.match(initPlan({ ...ask, gate: "git", hook: false }).refused, /--no-hook/);
  // Without --gate, a folder with no git is written as today, the seat hook included.
  assert.ok(initPlan({ ...ask, repository: false }).writes.has(".companygraph/hooks/commit-msg"));
});

test("adopt writes what the gate names, and refuses as init does", () => {
  const at = { tooling: "0.31.2", present: new Set() };
  assert.deepEqual(gateWrites(adoptPlan(at).writes), [".github/workflows/companygraph.yml", ".companygraph/hooks/commit-msg"]);
  const git = adoptPlan({ ...at, gate: "git" }).writes;
  assert.deepEqual(gateWrites(git), [".companygraph/hooks/commit-msg", ".companygraph/hooks/pre-commit", ".companygraph/hooks/pre-merge-commit"]);
  assert.equal(JSON.parse(git.get(".companygraph/manifest.json")).gate, "git");
  assert.deepEqual(gateWrites(adoptPlan({ ...at, gate: "none" }).writes), []);
  assert.match(adoptPlan({ ...at, gate: "git", repository: false }).refused, /not a git repository/);
  assert.match(adoptPlan({ ...at, gate: "gitlab" }).refused, /not a gate/);
});
