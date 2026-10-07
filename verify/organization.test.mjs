// verify/organization.test.mjs
// The organization pack through its real schemas: packs/organization/ and the core schemas it
// names are read from disk, so the test fails if a schema and the checks part.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";
import { uuidv7 } from "../lib/ids.mjs";

const core = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");
const pack = (n) => fs.readFileSync(new URL(`../packs/organization/${n}-schema.md`, import.meta.url), "utf8");
const page = (fm, body) => `---\nid: ${uuidv7()}\nsource: Local\n${fm}---\n\n${body}`;
const PACKS = [{ name: "organization", dir: "meta/organization" }];
const G = "model/groups";
const role = (name) => page("", `# ${name}\n\n> A seat.\n\n## What it takes\n\nA brief.\n\n## What it produces\n\nWork.\n\n## What it never does\n\n- Never merges unasked.\n`);
const kind = (name, inLine) => page(`in-line: ${inLine}\n`, `# ${name}\n\n> A kind of group.\n\n## What it means\n\nWhich groups are of this kind.\n`);
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}\n` : "";
const group = ({ kind: k, partOf, lead, members = [], guides = [], start, body = "" }) => page(
  `kind: ${k}\n${partOf ? `part-of: ${partOf}\n` : ""}${lead ? `lead: ${lead}\n` : ""}${list("members", members)}${list("guides", guides)}${start ? `start: ${start}\n` : ""}`,
  body,
);
const person = (name, roles) => page(`nature: human\n${list("roles", roles)}`, `# ${name}\n\n> A person.\n`);

const tree = (change = (m) => m) => change(new Map([
  ...["source", "identifier", "role", "profile", "experience"].map((n) => [`meta/core/${n}-schema.md`, core(n)]),
  ...["group", "group-kind"].map((n) => [`meta/organization/${n}-schema.md`, pack(n)]),
  ["model/identifier.md", page("format: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", `---\nid: ${uuidv7()}\n---\n\n# Local\n\n> Here.\n`],
  ...["Managing Director", "Engineering Lead", "Backend Engineer", "Designer"].map((n) => [`model/roles/${n.toLowerCase().replace(/ /g, "-")}.md`, role(n)]),
  ["model/group-kinds/department.md", kind("Department", "yes")],
  ["model/group-kinds/board.md", kind("Board", "no")],
  ["model/group-kinds/team.md", kind("Team", "no")],
  [`${G}/management.md`, group({ kind: "Department", lead: "Managing Director", members: ["Engineering Lead", "Designer"], body: "# Management\n\n> Sets the direction.\n" })],
  [`${G}/engineering.md`, group({ kind: "Department", partOf: "Management", lead: "Engineering Lead", members: ["Backend Engineer"], guides: ["Backend Engineer"], body: "# Engineering\n\n> Builds the product.\n\n## Responsibilities\n\n- Code quality\n" })],
  [`${G}/review-board.md`, group({ kind: "Board", lead: "Managing Director", members: ["Engineering Lead", "Designer"], body: "# Review Board\n\n> Approves risky changes.\n" })],
  [`${G}/checkout-team.md`, group({ kind: "Team", members: ["Backend Engineer", "Designer"], start: "2026-03", body: "# Checkout Team\n\n> Ships the new checkout.\n\n## People\n\n| Profile | Role | As |\n| --- | --- | --- |\n| Mira | Backend Engineer | Lead |\n| Jon | Designer | |\n| Ana | Backend Engineer | |\n" })],
  ["model/profiles/mira/mira.md", person("Mira", ["Backend Engineer"])],
  ["model/profiles/mira/experiences/README.md", "# Experiences\n\n> Nothing yet.\n"],
  ["model/profiles/jon/jon.md", person("Jon", ["Designer"])],
  ["model/profiles/jon/experiences/README.md", "# Experiences\n\n> Nothing yet.\n"],
  ["model/profiles/ana/ana.md", person("Ana", ["Backend Engineer"])],
  ["model/profiles/ana/experiences/README.md", "# Experiences\n\n> Nothing yet.\n"],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));

test("a small instance written in the pack passes, a board and a team over seats already in units included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("an in-line value that is neither yes nor no fails", () => {
  const f = failures(tree(edit("model/group-kinds/team.md", "in-line: no", "in-line: maybe")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /team\.md.*maybe/);
});

test("a group without a kind fails", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "kind: Department\n", "")));
  assert.ok(f.some((x) => x.includes("engineering.md") && x.includes("kind")), f.join("\n"));
});

test("a group naming a seat no role is fails as R4", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "lead: Engineering Lead", "lead: Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Ghost.*\(R4\)/);
});

// --- part-of never runs in a circle ---------------------------------------------------------

test("a group whose part-of names itself fails once, as a circle of one", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Engineering")));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` runs in a circle, "Engineering" → "Engineering"; a line never returns to where it starts (R16)`]);
});

test("a circle of two fails once, at the page whose path sorts first, naming both", () => {
  const f = failures(tree((m) => m.set(`${G}/management.md`, m.get(`${G}/management.md`).replace("kind: Department\n", "kind: Department\npart-of: Engineering\n"))));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` runs in a circle, "Engineering" → "Management" → "Engineering"; a line never returns to where it starts (R16)`]);
});

test("a group leading into a circle without being on it is not reported, and the circle is reported once", () => {
  const f = failures(tree((m) => {
    m.set(`${G}/management.md`, m.get(`${G}/management.md`).replace("kind: Department\n", "kind: Department\npart-of: Engineering\n"));
    return m.set(`${G}/platform.md`, group({ kind: "Department", partOf: "Engineering", body: "# Platform\n\n> Runs the platform.\n" }));
  }));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/groups\/engineering\.md: `part-of` runs in a circle/);
});

test("a part-of naming no group fails as R4 alone, and a chain three deep passes", () => {
  const ghost = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Ghost")));
  assert.equal(ghost.length, 1, ghost.join("\n"));
  assert.match(ghost[0], /\(R4\)/);
  assert.deepEqual(failures(tree((m) => m.set(`${G}/platform.md`, group({ kind: "Department", partOf: "Engineering", body: "# Platform\n\n> Runs the platform.\n" })))), []);
});

// --- one disciplinary unit and one guiding unit per seat -------------------------------------

test("a seat in the members of two units in the line fails once, naming both", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "  - Backend Engineer\nguides", "  - Backend Engineer\n  - Designer\nguides")));
  assert.deepEqual(f, [`"Designer" is in \`members\` of ${G}/engineering.md and ${G}/management.md; a role is in \`members\` of one group whose \`kind\` carries \`in-line: yes\` at most (R16)`]);
});

test("a seat in a unit and in a board or a team outside the line passes", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a seat listed twice in one group's members is in one group", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "  - Backend Engineer\nguides", "  - Backend Engineer\n  - Backend Engineer\nguides")));
  assert.ok(!f.some((x) => x.includes("is in `members` of")), f.join("\n"));
});

test("a group whose kind resolves to nothing fails as R4 and is not counted in the line", () => {
  const f = failures(tree((m) => m.set(`${G}/design.md`, group({ kind: "Ghost", members: ["Designer"], body: "# Design\n\n> Designs.\n" }))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /design\.md.*Ghost.*\(R4\)/);
});

test("a seat guided by two groups fails once, whatever their kind", () => {
  const f = failures(tree(edit(`${G}/review-board.md`, "kind: Board\n", "kind: Board\nguides:\n  - Backend Engineer\n")));
  assert.deepEqual(f, [`"Backend Engineer" is in \`guides\` of ${G}/engineering.md and ${G}/review-board.md; a role is in \`guides\` of one group at most (R16)`]);
});
