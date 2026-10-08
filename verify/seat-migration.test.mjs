// An instance written before core 0.63.0 holds its seats in model/roles/, a profile's roles: and
// an experience's role:, and names the type role in a Type cell. upgrade carries it across.
import test from "node:test";
import assert from "node:assert/strict";
import { migratedSeats } from "../lib/seat-migration.mjs";

const page = (fm, body) => `---\n${fm}---\n\n${body}`;
const old = () => new Map([
  ["model/roles/README.md", "# Roles\n\nOne file per role, against `meta/core/role-schema.md`.\n"],
  ["model/roles/reviewer.md", page("id: a1\nsource: Local\n", "# Reviewer\n\n> Reads a change.\n")],
  ["model/profiles/mira/mira.md", page("id: p1\nsource: Local\nnature: human\nroles:\n  - Reviewer\n", "# Mira\n\n> A person.\n")],
  ["model/profiles/mira/experiences/2020-x.md", page("id: e1\nsource: Local\nrole: Speaker\nstart: 2020\n", "# A talk\n\n> In this role she spoke.\n")],
  ["model/rules/review.md", page("id: r1\nsource: Local\n", "# Review\n\n> Every change is reviewed.\n\n## Applies to\n\n| Type | Entity |\n| --- | --- |\n| `role` | Reviewer |\n| process | Delivery |\n\n## Notes\n\n| Kind | Text |\n| --- | --- |\n| role | stays |\n")],
]);

test("an instance with no seats in the old form needs nothing", () => {
  assert.equal(migratedSeats(new Map([["model/identity.md", page("id: i\n", "# Acme\n\n> A company.\n")]])), null);
});

test("seats move with their ids, the folder README is left to the caller, and every key and cell is rewritten", () => {
  const m = migratedSeats(old());
  assert.ok(m && !("error" in m));
  assert.deepEqual(m.moved, [["model/roles/reviewer.md", "model/seats/reviewer.md"]]);
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
  assert.deepEqual(m.rewritten.sort(), ["model/profiles/mira/experiences/2020-x.md", "model/profiles/mira/mira.md", "model/rules/review.md"]);
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
