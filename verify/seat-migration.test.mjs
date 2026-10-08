// An instance written before core 0.63.0 holds its seats in model/roles/, a profile's roles: and
// an experience's role:, and names the type role in a Type cell. upgrade carries it across.
import test from "node:test";
import assert from "node:assert/strict";
import { migratedSeats, isInstancesOwn } from "../lib/seat-migration.mjs";
import { initPlan, upgradePlan } from "../lib/plan.mjs";

const page = (fm, body) => `---\n${fm}---\n\n${body}`;
const old = () => new Map([
  ["model/roles/README.md", "# Roles\n\nOne file per role, against `meta/core/role-schema.md`, kept in `model/roles/`.\n\nWe review every role twice a year.\n"],
  ["model/roles/reviewer.md", page("id: a1\nsource: Local\n", "# Reviewer\n\n> Reads a change.\n")],
  ["model/profiles/mira/mira.md", page("id: p1\nsource: Local\nnature: human\nroles:\n  - Reviewer\n", "# Mira\n\n> A person.\n")],
  ["model/profiles/mira/experiences/2020-x.md", page("id: e1\nsource: Local\nrole: Speaker\nstart: 2020\n", "# A talk\n\n> In this role she spoke.\n")],
  ["model/rules/review.md", page("id: r1\nsource: Local\n", "# Review\n\n> Every change is reviewed.\n\n## Applies to\n\n| Type | Entity |\n| --- | --- |\n| `role` | Reviewer |\n| process | Delivery |\n\n## Notes\n\n| Kind | Text |\n| --- | --- |\n| role | stays |\n")],
]);

test("an instance with no seats in the old form needs nothing", () => {
  assert.equal(migratedSeats(new Map([["model/identity.md", page("id: i\n", "# Acme\n\n> A company.\n")]])), null);
});

test("seats move with their ids, the owner's README moves with three words changed, and every key and cell is rewritten", () => {
  const m = migratedSeats(old());
  assert.ok(m && !("error" in m));
  assert.deepEqual(m.moved, [["model/roles/README.md", "model/seats/README.md"], ["model/roles/reviewer.md", "model/seats/reviewer.md"]]);
  assert.equal(
    m.writes.get("model/seats/README.md"),
    "# Seats\n\nOne file per role, against `meta/core/seat-schema.md`, kept in `model/seats/`.\n\nWe review every role twice a year.\n",
  );
  assert.deepEqual(m.removes.sort(), ["model/roles/README.md", "model/roles/reviewer.md"]);
  assert.match(m.writes.get("model/seats/reviewer.md"), /^---\nid: a1\n/);
  assert.match(m.writes.get("model/profiles/mira/mira.md"), /\nseats:\n  - Reviewer\n/);
  assert.doesNotMatch(m.writes.get("model/profiles/mira/mira.md"), /\nroles:/);
  const exp = m.writes.get("model/profiles/mira/experiences/2020-x.md");
  assert.match(exp, /\ncapacity: Speaker\n/);
  assert.match(exp, /In this role she spoke\./);
  const rule = m.writes.get("model/rules/review.md");
  assert.match(rule, /\| `seat` \| Reviewer \|/);
  assert.match(rule, /\| process \| Delivery \|/);
  assert.match(rule, /\| role \| stays \|/);
  assert.deepEqual(m.rewritten.sort(), ["model/profiles/mira/experiences/2020-x.md", "model/profiles/mira/mira.md", "model/rules/review.md", "model/seats/README.md"]);
});

test("a migrated instance needs nothing the second time", () => {
  const m = migratedSeats(old());
  const after = new Map([...old()].filter(([p]) => !m.removes.includes(p)));
  for (const [p, t] of m.writes) after.set(p, t);
  assert.equal(migratedSeats(after), null);
});

test("model/seats/ beside model/roles/ is refused", () => {
  const m = migratedSeats(old().set("model/seats/owner.md", page("id: s1\n", "# Owner\n\n> Decides.\n")));
  assert.match(m.error, /model\/seats\/ already exists beside model\/roles\//);
});

test("a profile carrying both roles: and seats: is refused, naming it", () => {
  const m = migratedSeats(old().set("model/profiles/mira/mira.md", page("id: p1\nroles:\n  - Reviewer\nseats:\n  - Owner\n", "# Mira\n")));
  assert.match(m.error, /model\/profiles\/mira\/mira\.md carries both `roles` and `seats`/);
});

test("an experience carrying both role: and capacity: is refused, naming it", () => {
  const m = migratedSeats(old().set("model/profiles/mira/experiences/2020-x.md", page("id: e1\nrole: Speaker\ncapacity: Author\n", "# A talk\n")));
  assert.match(m.error, /2020-x\.md carries both `role` and `capacity`/);
});

test("a file that is not a page moves as it is, and a .DS_Store alone does not stand in the way", () => {
  const bytes = Buffer.from([0, 1, 2, 255]);
  const m = migratedSeats(old().set("model/roles/shot.png", bytes).set("model/roles/.DS_Store", Buffer.from([9, 9])));
  assert.ok(m && !("error" in m));
  assert.equal(m.writes.get("model/seats/shot.png"), bytes);
  assert.deepEqual(m.writes.get("model/seats/.DS_Store"), Buffer.from([9, 9]));
  assert.ok(m.removes.includes("model/roles/shot.png") && m.removes.includes("model/roles/.DS_Store"));
  assert.ok(m.moved.some(([from, to]) => from === "model/roles/shot.png" && to === "model/seats/shot.png"));
  const beside = migratedSeats(new Map([["model/roles/.DS_Store", Buffer.from([1])], ["model/seats/.DS_Store", Buffer.from([2])]]));
  assert.ok(beside && !("error" in beside));
  const alone = migratedSeats(new Map([["model/roles/.DS_Store", Buffer.from([1])], ["model/seats/owner.md", page("id: s1\n", "# Owner\n\n> Decides.\n")]]));
  assert.ok(alone && !("error" in alone));
});

test("a README that names nothing old moves unchanged and is not reported as rewritten", () => {
  const m = migratedSeats(new Map([["model/roles/README.md", "# Our seats\n\nWho sits where.\n"]]));
  assert.ok(m && !("error" in m));
  assert.equal(m.writes.get("model/seats/README.md"), "# Our seats\n\nWho sits where.\n");
  assert.deepEqual(m.rewritten, []);
});

test("a profile written with CRLF line ends and both keys is refused", () => {
  const m = migratedSeats(old().set("model/profiles/mira/mira.md", "---\r\nid: p1\r\nroles:\r\n  - Reviewer\r\nseats:\r\n  - Owner\r\n---\r\n\r\n# Mira\r\n"));
  assert.match(m.error, /carries both `roles` and `seats`/);
});

const rule = (table) => new Map([["model/rules/r.md", page("id: r\n", `# R\n\n> S.\n\n${table}`)]]);

test("a data row whose first cell is a dash is a row, not the separator", () => {
  const m = migratedSeats(rule("| Type | Entity |\n| --- | --- |\n| - | x |\n| role | Reviewer |\n"));
  assert.match(m.writes.get("model/rules/r.md"), /\| - \| x \|\n\| seat \| Reviewer \|/);
  const dash = migratedSeats(rule("| Entity | Type |\n| --- | --- |\n| - | role |\n"));
  assert.match(dash.writes.get("model/rules/r.md"), /\| - \| seat \|/);
});

test("a table inside a fenced block is code and is left as written", () => {
  assert.equal(migratedSeats(rule("```\n| Type | Entity |\n| --- | --- |\n| role | Reviewer |\n```\n")), null);
  assert.equal(migratedSeats(rule("~~~md\n| Type | Entity |\n| --- | --- |\n| role | Reviewer |\n~~~\n")), null);
  const after = migratedSeats(rule("```\ncode\n```\n\n| Type | Entity |\n| --- | --- |\n| role | Reviewer |\n"));
  assert.match(after.writes.get("model/rules/r.md"), /\| seat \| Reviewer \|/);
});

test("a row keeps the pipes it was written with", () => {
  const m = migratedSeats(rule("| Type | Entity |\n| --- | --- |\n| role | Reviewer\n"));
  assert.match(m.writes.get("model/rules/r.md"), /\| seat \| Reviewer\n$/);
  const open = migratedSeats(rule("| Entity | Type\n| --- | ---\n| Reviewer | role\n"));
  assert.match(open.writes.get("model/rules/r.md"), /\| Reviewer \| seat\n$/);
});

// upgradePlan carries the roles across only from the model it is handed. A caller that omits it
// has not read the model, and an upgrade that says nothing about the roles it left would leave an
// instance half moved without a word.
const before = new Map([["CONVENTIONS.md", "# Conventions\n"], ["manifest.json", '{ "version": "0.31.1", "shape": 3 }\n']]);
const withSeats = new Map([["CONVENTIONS.md", "# Conventions, moved on\n"], ["manifest.json", '{ "version": "0.32.0", "shape": 3 }\n'], ["seat-schema.md", "# Seat Schema\n"]]);
const instanceBefore = () => {
  const { writes } = initPlan({ core: before, tooling: "0.31.2", tag: "v0.31.2", name: "Acme", agent: "claude", units: "meta", present: new Set() });
  const manifest = JSON.parse(writes.get(".companygraph/manifest.json"));
  return { manifest, held: new Map([...writes].filter(([p]) => manifest.files[p])), workflow: writes.get(".github/workflows/companygraph.yml") };
};

test("an upgrade to a core with seats and no model is refused, and an empty model proceeds", () => {
  const { manifest, held, workflow } = instanceBefore();
  const ask = { core: withSeats, tooling: "0.32.0", tag: "v0.32.0", manifest, held, workflow };
  const refused = upgradePlan(ask);
  assert.equal(refused.refused, "upgrade needs the instance's model/ to carry its roles across to seats; nothing was written.");
  assert.equal(refused.writes, undefined);
  const plan = upgradePlan({ ...ask, model: new Map() });
  assert.equal(plan.refused, undefined);
  assert.ok(plan.writes.has("meta/core/seat-schema.md"));
  // A core with no seat schema has nothing to carry, so it asks for no model.
  const older = upgradePlan({ ...ask, core: new Map([...withSeats].filter(([p]) => p !== "seat-schema.md")) });
  assert.equal(older.refused, undefined);
});

test("a path is the instance's own unless the units folder, dist or node_modules holds it, however the units folder is nested", () => {
  assert.equal(isInstancesOwn("README.md", "meta"), true);
  assert.equal(isInstancesOwn("meta/core/role-schema.md", "meta"), false);
  assert.equal(isInstancesOwn("meta-notes/a.md", "meta"), true);
  assert.equal(isInstancesOwn("vendor/meta/core/role-schema.md", "vendor/meta"), false);
  assert.equal(isInstancesOwn("vendor/other.md", "vendor/meta"), true);
  assert.equal(isInstancesOwn("dist/notes.md", "meta"), false);
  assert.equal(isInstancesOwn("node_modules/x/index.js", "meta"), false);
  assert.equal(isInstancesOwn("docs/dist/notes.md", "meta"), true);
});
