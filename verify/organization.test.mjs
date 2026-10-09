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
const TEAM = `${G}/checkout-team.md`;
const ANA = "| Ana | Backend Engineer | Member |";
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}\n` : "";
// A seat is held in a process; a job is what a person is employed as.
const seat = (name) => page("", `# ${name}\n\n> A seat.\n\n## What it takes\n\nA brief.\n\n## What it produces\n\nWork.\n\n## What it never does\n\n- Never merges unasked.\n`);
const job = (name, seats = []) => page(list("seats", seats), `# ${name}\n\n> A job.\n\n## Responsibilities\n\n- Does the work.\n`);
const kind = (name, inLine, staff) => page(`in-line: ${inLine}\n${staff ? `staff: ${staff}\n` : ""}`, `# ${name}\n\n> A kind of group.\n\n## What it means\n\nWhich groups are of this kind.\n`);
const group = ({ kind: k, partOf, guides = [], start, end, body = "" }) => page(
  `kind: ${k}\n${partOf ? `part-of: ${partOf}\n` : ""}${list("guides", guides)}${start ? `start: ${start}\n` : ""}${end ? `end: ${end}\n` : ""}`,
  body,
);
// A group's `## People`: one row per person, as the schema's columns have it.
const people = (rows) => `\n## People\n\n| Profile | Job | Place |\n| --- | --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const person = (name, seats = [], nature = "human") => page(`nature: ${nature}\n${list("seats", seats)}`, `# ${name}\n\n> A person.\n`);
const profile = (name, seats = [], nature) => [
  [`model/profiles/${name.toLowerCase()}/${name.toLowerCase()}.md`, person(name, seats, nature)],
  [`model/profiles/${name.toLowerCase()}/experiences/README.md`, "# Experiences\n\n> Nothing yet.\n"],
];

const tree = (change = (m) => m) => change(new Map([
  ...["source", "identifier", "seat", "profile", "experience"].map((n) => [`meta/core/${n}-schema.md`, core(n)]),
  ...["group", "group-kind", "job"].map((n) => [`meta/organization/${n}-schema.md`, pack(n)]),
  ["model/identifier.md", page("format: uuidv7\n", "# Entity id\n\n> What an id is for.\n")],
  ["model/sources/local.md", `---\nid: ${uuidv7()}\n---\n\n# Local\n\n> Here.\n`],
  ...["Backend Engineer", "Reviewer"].map((n) => [`model/seats/${n.toLowerCase().replace(/ /g, "-")}.md`, seat(n)]),
  ["model/jobs/backend-engineer.md", job("Backend Engineer", ["Backend Engineer"])],
  ["model/jobs/designer.md", job("Designer")],
  ["model/group-kinds/department.md", kind("Department", "yes")],
  ["model/group-kinds/board.md", kind("Board", "no")],
  ["model/group-kinds/team.md", kind("Team", "no")],
  [`${G}/management.md`, group({ kind: "Department", body: "# Management\n\n> Sets the direction.\n" })],
  [`${G}/engineering.md`, group({ kind: "Department", partOf: "Management", guides: ["Backend Engineer"], body: `# Engineering\n\n> Builds the product.\n\n## Responsibilities\n\n- Code quality\n${people([["Mira", "Backend Engineer", "Lead"], ["Ana", "Backend Engineer", "Member"]])}` })],
  [`${G}/design.md`, group({ kind: "Department", body: `# Design\n\n> Shapes how the product looks.\n${people([["Jon", "Designer", "Lead"]])}` })],
  [`${G}/review-board.md`, group({ kind: "Board", body: `# Review Board\n\n> Approves risky changes.\n${people([["Mira", "Backend Engineer", "Lead"], ["Jon", "Designer", "Member"]])}` })],
  [`${G}/checkout-team.md`, group({ kind: "Team", start: "2026-03", body: `# Checkout Team\n\n> Ships the new checkout.\n${people([["Mira", "Backend Engineer", "Lead"], ["Jon", "Designer", "Member"], ["Ana", "Backend Engineer", "Member"]])}` })],
  ...profile("Mira", ["Backend Engineer"]),
  ...profile("Jon"),
  ...profile("Ana"),
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));

test("a small instance written in the pack passes, a board and a team over people already in units included", () => {
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

test("a group guiding a job no job is fails as R4", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "guides:\n  - Backend Engineer", "guides:\n  - Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Ghost.*\(R4\)/);
});

test("a group guiding a seat, which is not a job, fails as R4 alone", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "guides:\n  - Backend Engineer", "guides:\n  - Reviewer")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Reviewer.*\(R4\)/);
});

test("a job whose seats name no seat fails as R4 alone, and one naming a seat passes", () => {
  assert.ok(tree().get("model/jobs/backend-engineer.md").includes("seats:"));
  assert.deepEqual(failures(tree()), []);
  const f = failures(tree(edit("model/jobs/designer.md", "---\n\n#", "seats:\n  - Ghost\n---\n\n#")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /designer\.md.*Ghost.*\(R4\)/);
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

test("a circle through a group outside the line is reported by within alone, once per page", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "part-of: Management", "part-of: Checkout Team")(edit(TEAM, "kind: Team\n", "kind: Team\npart-of: Engineering\n")(m))));
  assert.deepEqual(f, [
    `${G}/engineering.md: \`part-of\` names "Checkout Team", whose \`kind\` does not carry \`in-line: yes\` (R16)`,
    `${TEAM}: \`part-of\` is written on a page whose \`kind\` does not carry \`in-line: yes\` (R16)`,
  ].sort());
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

// --- one disciplinary unit per person, one guiding unit per job -------------------------------

test("a person in the People of two units in the line fails once, naming both", () => {
  const f = failures(tree(edit(`${G}/design.md`, "| Jon | Designer | Lead |", `| Jon | Designer | Lead |\n${ANA}`)));
  assert.deepEqual(f, [`"Ana" is in the "## People" Profile of ${G}/design.md and ${G}/engineering.md; a profile is in the "## People" Profile of one group whose \`kind\` carries \`in-line: yes\` at most (R16)`]);
});

test("a person in a department and in a team passes", () => {
  const t = tree();
  assert.ok(t.get(`${G}/engineering.md`).includes("| Mira |") && t.get(TEAM).includes("| Mira |"));
  assert.deepEqual(failures(t), []);
});

test("a person in a department and in a board outside the line passes", () => {
  const t = tree();
  assert.ok(t.get(`${G}/design.md`).includes("| Jon |") && t.get(`${G}/review-board.md`).includes("| Jon |"));
  assert.deepEqual(failures(t), []);
});

test("two departments holding the same job, with different people, pass", () => {
  const f = failures(tree((m) => edit(`${G}/design.md`, "| Jon | Designer | Lead |", "| Jon | Designer | Lead |\n| Kim | Backend Engineer | Member |")(profile("Kim").reduce((t, [path, text]) => t.set(path, text), m))));
  assert.deepEqual(f, []);
});

test("two departments each with their own Lead pass", () => {
  const t = tree();
  for (const d of ["engineering", "design"]) assert.equal((t.get(`${G}/${d}.md`).match(/\| Lead \|/g) ?? []).length, 1);
  assert.deepEqual(failures(t), []);
});

test("a person listed twice in one group's People is in one group", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "| Ana | Backend Engineer | Member |", "| Ana | Backend Engineer | Member |\n| Ana | Backend Engineer | Member |")));
  assert.ok(!f.some((x) => x.includes("is in the \"## People\"")), f.join("\n"));
});

test("a group whose kind resolves to nothing fails as R4 and is not counted in the line", () => {
  const f = failures(tree((m) => m.set(`${G}/support.md`, group({ kind: "Ghost", body: `# Support\n\n> Supports.\n${people([["Jon", "Designer", "Member"]])}` }))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /support\.md.*Ghost.*\(R4\)/);
});

test("a job guided by two groups fails once, whatever their kind", () => {
  const f = failures(tree(edit(`${G}/review-board.md`, "kind: Board\n", "kind: Board\nguides:\n  - Backend Engineer\n")));
  assert.deepEqual(f, [`"Backend Engineer" is in \`guides\` of ${G}/engineering.md and ${G}/review-board.md; a job is in \`guides\` of one group at most (R16)`]);
});

// --- a person sits in a group in a job -------------------------------------------------------

test("a People row whose job is no job fails as R4 alone", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | Member |", "| Jon | Ghost | Member |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*Ghost.*\(R4\)/);
});

test("a People row whose job is a seat, not a job, fails as R4 alone", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | Member |", "| Jon | Reviewer | Member |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*Reviewer.*\(R4\)/);
});

test("a person need not hold a seat to sit in a job", () => {
  const t = tree();
  assert.ok(!t.get("model/profiles/jon/jon.md").includes("seats:"));
  assert.deepEqual(failures(t), []);
});

test("a blank Job passes for a human too: the column is optional", () => {
  assert.deepEqual(failures(tree(edit(TEAM, "| Jon | Designer | Member |", "| Jon | | Member |"))), []);
});

// --- one person, two jobs, one place; one lead is one person -----------------------------------

test("one person with two rows in one group, two jobs and one Place, passes", () => {
  assert.deepEqual(failures(tree(edit(`${G}/engineering.md`, "| Ana | Backend Engineer | Member |", "| Ana | Backend Engineer | Member |\n| Ana | Designer | Member |"))), []);
});

test("the same person with two different places in one group fails once, naming the person", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "| Ana | Backend Engineer | Member |", "| Ana | Backend Engineer | Member |\n| Ana | Designer | Deputy |")));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" table gives "Ana" rows with different \`Place\` values, "Member" and "Deputy"; a profile's rows in one group carry one (R16)`]);
});

test("a person's different places in two different groups pass", () => {
  const t = tree();
  assert.ok(t.get(`${G}/engineering.md`).includes("| Mira | Backend Engineer | Lead |") && t.get(TEAM).includes("| Mira | Backend Engineer | Lead |"));
  assert.deepEqual(failures(edit(TEAM, "| Mira | Backend Engineer | Lead |", "| Mira | Backend Engineer | Member |")(t)), []);
});

test("two rows of one person, both Lead, are one lead and pass", () => {
  assert.deepEqual(failures(tree(edit(`${G}/engineering.md`, "| Mira | Backend Engineer | Lead |", "| Mira | Backend Engineer | Lead |\n| Mira | Designer | Lead |"))), []);
});

test("two different people as Lead fail once", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "| Ana | Backend Engineer | Member |", "| Ana | Backend Engineer | Lead |")));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" table names 2 different \`Profile\` entities whose \`Place\` is "Lead": "Mira" and "Ana"; a group has one (R16)`]);
});

test("two people doing one job in one group pass", () => {
  assert.deepEqual(failures(tree()), []);
});

// --- a disbanded group is not counted as a person's unit or a job's guide ---------------------------------

const PLATFORM = group({ kind: "Department", partOf: "Management", body: `# Platform\n\n> Runs the platform.\n${people([["Ana", "Backend Engineer", "Member"]])}` });

test("a person moved to a new unit passes once the old unit's end has passed", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "kind: Department\n", "kind: Department\nend: 2025-12\n")(m.set(`${G}/platform.md`, PLATFORM))));
  assert.deepEqual(f, []);
});

test("the same move fails while the old unit's end is still to come", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "kind: Department\n", "kind: Department\nend: 2999-12\n")(m.set(`${G}/platform.md`, PLATFORM))));
  assert.deepEqual(f, [`"Ana" is in the "## People" Profile of ${G}/engineering.md and ${G}/platform.md; a profile is in the "## People" Profile of one group whose \`kind\` carries \`in-line: yes\` at most (R16)`]);
});

test("a guides overlap passes once one of the groups has ended", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "kind: Department\n", "kind: Department\nend: 2025-12\n")(edit(`${G}/review-board.md`, "kind: Board\n", "kind: Board\nguides:\n  - Backend Engineer\n")(m))));
  assert.deepEqual(f, []);
});

// --- part-of runs only from and to a group in the line ------------------------------------------

test("a team outside the line naming a part-of fails once", () => {
  const f = failures(tree(edit(TEAM, "kind: Team\n", "kind: Team\npart-of: Engineering\n")));
  assert.deepEqual(f, [`${TEAM}: \`part-of\` is written on a page whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

test("a department naming a board as its part-of fails once", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Review Board")));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` names "Review Board", whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

test("a part-of whose kind is a ghost fails as R4 alone", () => {
  const f = failures(tree(edit(`${G}/engineering.md`, "part-of: Management", "part-of: Ghost")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R4\)/);
  const k = failures(tree(edit(`${G}/management.md`, "kind: Department", "kind: Ghost")));
  assert.equal(k.length, 1, k.join("\n"));
  assert.match(k[0], /\(R4\)/);
});

// --- a live group's part-of never names a group that has ended ---------------------------------

const ending = (path, end) => edit(path, "kind: ", `end: ${end}\nkind: `);

test("a part-of naming a group that has ended fails once", () => {
  const f = failures(tree(ending(`${G}/management.md`, "2025-12")));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` names "Management", which has ended (R16)`]);
});

test("a part-of naming a group whose end is still to come passes", () => {
  assert.deepEqual(failures(tree(ending(`${G}/management.md`, "2999-12"))), []);
});

test("a group that has itself ended keeps a part-of naming a group that has ended", () => {
  assert.deepEqual(failures(tree((m) => ending(`${G}/engineering.md`, "2025-06")(ending(`${G}/management.md`, "2025-12")(m)))), []);
});

test("a target both ended and outside the line is one finding", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "part-of: Management", "part-of: Review Board")(ending(`${G}/review-board.md`, "2025-12")(m))));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` names "Review Board", whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

test("a live group and a group that has ended naming each other is one finding, the ended target's", () => {
  const f = failures(tree((m) => edit(`${G}/management.md`, "kind: Department\n", "kind: Department\npart-of: Engineering\n")(ending(`${G}/management.md`, "2025-12")(m))));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` names "Management", which has ended (R16)`]);
});

test("a group that has ended is still held to the line: a team naming a part-of fails once, at the page", () => {
  const f = failures(tree((m) => edit(TEAM, "kind: Team\n", "kind: Team\npart-of: Engineering\n")(ending(TEAM, "2026-06")(m))));
  assert.deepEqual(f, [`${TEAM}: \`part-of\` is written on a page whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

test("a group that has ended naming a board fails once, at the target's kind", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, "part-of: Management", "part-of: Review Board")(ending(`${G}/engineering.md`, "2025-06")(m))));
  assert.deepEqual(f, [`${G}/engineering.md: \`part-of\` names "Review Board", whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

test("a department that has ended naming a department that has ended passes", () => {
  assert.deepEqual(failures(tree((m) => ending(`${G}/engineering.md`, "2025-06")(ending(`${G}/management.md`, "2025-12")(m)))), []);
});

test("a circle of groups that have ended is still a circle", () => {
  const f = failures(tree((m) => edit(`${G}/management.md`, "kind: Department\n", "kind: Department\npart-of: Engineering\n")(ending(`${G}/engineering.md`, "2025-06")(ending(`${G}/management.md`, "2025-12")(m)))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /`part-of` runs in a circle.*\(R16\)$/);
});

// --- a fault in the set's own field is reported at the kind, once ---------------------------------

const DEPARTMENT = "model/group-kinds/department.md";

test("a kind whose in-line is not an enum token fails once, at the kind", () => {
  const f = failures(tree(edit(DEPARTMENT, "in-line: yes", "in-line: maybe")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/group-kinds\/department\.md: .*\(R8\)/);
  assert.ok(!f.some((x) => x.startsWith(G)), f.join("\n"));
});

test("a kind whose in-line is missing fails once, at the kind", () => {
  const f = failures(tree(edit(DEPARTMENT, "in-line: yes\n", "")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/group-kinds\/department\.md: /);
  assert.ok(!f.some((x) => x.startsWith(G)), f.join("\n"));
});

test("a team naming a board as its part-of fails once, at the page", () => {
  const f = failures(tree(edit(TEAM, "kind: Team\n", "kind: Team\npart-of: Review Board\n")));
  assert.deepEqual(f, [`${TEAM}: \`part-of\` is written on a page whose \`kind\` does not carry \`in-line: yes\` (R16)`]);
});

// --- a person's place is an enum, and only a human leads ------------------------------------------

const withBot = (m) => m
  .set("model/profiles/bot/bot.md", person("Bot", ["Reviewer"], "agent"))
  .set("model/profiles/bot/experiences/README.md", "# Experiences\n\n> Nothing yet.\n");
const MIRA = "| Mira | Backend Engineer | Lead |";
const asBot = (as) => (m) => edit(TEAM, MIRA, `| Bot | Designer | ${as} |`)(withBot(m));

test("an agent as Lead fails once", () => {
  const f = failures(tree(asBot("Lead")));
  assert.deepEqual(f, [`${TEAM}: the "## People" row "Bot" has \`Place\` "Lead", and Bot's profile does not carry \`nature: human\` (R16)`]);
});

test("an agent as Deputy fails once", () => {
  const f = failures(tree(asBot("Deputy")));
  assert.deepEqual(f, [`${TEAM}: the "## People" row "Bot" has \`Place\` "Deputy", and Bot's profile does not carry \`nature: human\` (R16)`]);
});

test("an agent row with a blank Job passes in a team", () => {
  const f = failures(tree((m) => edit(TEAM, "| Jon | Designer | Member |", "| Bot | | Member |")(withBot(m))));
  assert.deepEqual(f, []);
});

test("an agent as a Member of a team passes", () => {
  assert.deepEqual(failures(tree((m) => edit(TEAM, "| Jon | Designer | Member |", "| Bot | Designer | Member |")(withBot(m)))), []);
});

test("an agent in the People of a department fails once", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, ANA, "| Bot | Designer | Member |")(withBot(m))));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" row "Bot" names a profile that does not carry \`nature: human\`, in a group whose \`kind\` carries \`in-line: yes\` (R16)`]);
});

test("an agent on two rows of a department, two jobs, fails once", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, ANA, "| Bot | Designer | Member |\n| Bot | Backend Engineer | Member |")(withBot(m))));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" row "Bot" names a profile that does not carry \`nature: human\`, in a group whose \`kind\` carries \`in-line: yes\` (R16)`]);
});

test("an agent as Lead on two rows of a team fails once", () => {
  const f = failures(tree((m) => edit(TEAM, MIRA, "| Bot | Designer | Lead |\n| Bot | Backend Engineer | Lead |")(withBot(m))));
  assert.deepEqual(f, [`${TEAM}: the "## People" row "Bot" has \`Place\` "Lead", and Bot's profile does not carry \`nature: human\` (R16)`]);
});

test("an agent as Lead in a department fails exactly once", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, MIRA, "| Bot | Designer | Lead |")(withBot(m))));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" row "Bot" has \`Place\` "Lead", and Bot's profile does not carry \`nature: human\` (R16)`]);
});

test("a human in the People of a department passes", () => {
  assert.ok(tree().get(`${G}/engineering.md`).includes("## People"));
  assert.deepEqual(failures(tree()), []);
});

test("two people as Lead fail once, naming the page", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | Member |", "| Jon | Designer | Lead |")));
  assert.deepEqual(f, [`${TEAM}: the "## People" table names 2 different \`Profile\` entities whose \`Place\` is "Lead": "Mira" and "Jon"; a group has one (R16)`]);
});

test("a Place outside the tokens fails as R8 alone", () => {
  const f = failures(tree(edit(TEAM, MIRA, "| Mira | Backend Engineer | Boss |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*Boss.*\(R8\)/);
});

test("a People row with a blank Place fails as the required column alone", () => {
  const f = failures(tree(edit(TEAM, "| Jon | Designer | Member |", "| Jon | Designer | |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.equal(f[0], `${TEAM}: a "## People" row has no Place — one of \`Lead\`, \`Deputy\`, \`Member\`, \`Staff\``);
});

test("a People profile that resolves to nothing fails as R4 alone", () => {
  const f = failures(tree(edit(TEAM, MIRA, "| Ghost | Backend Engineer | Lead |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*Ghost.*\(R4\)/);
});

// ## Openings: what a group is looking for, one row per job and place.
const openings = (rows) => `\n## Openings\n\n| Job | Place | Count | Since |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const withOpenings = (path, rows) => (m) => m.set(path, m.get(path) + openings(rows));

test("a group with an opening passes, its job drawn as an edge", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Member", "2", "2026-11-01"]]))), []);
});

test("an opening with a blank Count and Since passes", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Designer", "Member", "", ""]]))), []);
});

test("an open Lead beside a held Lead passes, as a succession", () => {
  assert.deepEqual(failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Lead", "", "2027-01-01"]]))), []);
});

test("an opening on a team outside the line passes", () => {
  assert.deepEqual(failures(tree(withOpenings(TEAM, [["Designer", "Member", "1", ""]]))), []);
});

test("an opening naming no job fails as R4 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Ghost", "Member", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Ghost.*\(R4\)/);
});

test("an opening naming a seat, which is not a job, fails as R4 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Reviewer", "Member", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Reviewer.*\(R4\)/);
});

test("an opening whose Place is outside the tokens fails as R8 alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Boss", "", ""]])));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*Boss.*\(R8\)/);
});

test("an opening with a blank Place fails as the required column alone", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "", "", ""]])));
  assert.deepEqual(f, [`${G}/engineering.md: a "## Openings" row has no Place — one of \`Lead\`, \`Deputy\`, \`Member\`, \`Staff\``]);
});

test("a Count written as a word fails once, as R16's written form of a number", () => {
  const f = failures(tree(withOpenings(`${G}/engineering.md`, [["Backend Engineer", "Member", "two", ""]])));
  assert.deepEqual(f, [`${G}/engineering.md: \`Count\` in "## Openings" is declared \`number\` and says "two"; R16 wants it written as digits`]);
});

test("a Staff place in a People row passes for a human", () => {
  const f = failures(tree((m) => edit(TEAM, "| Jon | Designer | Member |", "| Jon | Designer | Staff |")(m)));
  assert.deepEqual(f, []);
});

// A staff unit stays in the line; what hangs below it is staff too.
const withLegal = (m) => m
  .set("model/group-kinds/staff-unit.md", kind("Staff Unit", "yes", "yes"))
  .set(`${G}/legal.md`, group({ kind: "Staff Unit", partOf: "Management", body: "# Legal\n\n> Advises the top on the law.\n" }));
const below = (name, k) => (m) => m.set(`${G}/${name.toLowerCase()}.md`, group({ kind: k, partOf: "Legal", body: `# ${name}\n\n> Works below Legal.\n` }));

test("a staff unit under the top passes", () => {
  assert.deepEqual(failures(tree(withLegal)), []);
});

test("a staff unit under a staff unit passes", () => {
  assert.deepEqual(failures(tree((m) => below("Compliance", "Staff Unit")(withLegal(m)))), []);
});

test("a department under a staff unit fails once, at the page", () => {
  const f = failures(tree((m) => below("Sales", "Department")(withLegal(m))));
  assert.deepEqual(f, [`${G}/sales.md: \`part-of\` names "Legal", whose \`kind\` carries \`staff: yes\`, and this page's \`kind\` does not (R16)`]);
});

test("a kind with staff: no is not staff, and a department under its group passes", () => {
  const f = failures(tree((m) => below("Sales", "Department")(withLegal(m).set("model/group-kinds/staff-unit.md", kind("Staff Unit", "yes", "no")))));
  assert.deepEqual(f, []);
});

test("a staff value that is neither yes nor no fails as R8 alone, at the kind, with a group below it", () => {
  const f = failures(tree((m) => below("Sales", "Odd")(withLegal(m)).set("model/group-kinds/odd.md", kind("Odd", "yes", "maybe"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /odd\.md.*maybe/);
});

test("a group under a staff unit whose own kind resolves to nothing fails as R4 alone", () => {
  const f = failures(tree((m) => below("Sales", "Ghost Kind")(withLegal(m))));
  assert.ok(f.every((x) => !x.includes("carries `staff: yes`")), f.join("\n"));
  assert.ok(f.some((x) => x.includes("sales.md") && x.includes("Ghost Kind")), f.join("\n"));
});

test("a team writing a part-of naming a staff unit fails once, as the line's", () => {
  const f = failures(tree((m) => withLegal(m).set(TEAM, m.get(TEAM).replace("kind: Team\n", "kind: Team\npart-of: Legal\n"))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /checkout-team\.md.*`part-of` is written on a page whose `kind` does not carry `in-line: yes`/);
});

test("a department whose part-of names a group of a kind outside the line with staff: yes fails once, as the line's", () => {
  const f = failures(tree((m) => m
    .set("model/group-kinds/team.md", kind("Team", "no", "yes"))
    .set(`${G}/sales.md`, group({ kind: "Department", partOf: "Checkout Team", body: "# Sales\n\n> Sells.\n" }))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /sales\.md.*`part-of` names "Checkout Team", whose `kind` does not carry `in-line: yes`/);
});

test("a live staff unit under a staff unit that has ended fails once, as the line's", () => {
  const f = failures(tree((m) => below("Compliance", "Staff Unit")(ending(`${G}/legal.md`, "2025-12")(withLegal(m)))));
  assert.deepEqual(f, [`${G}/compliance.md: \`part-of\` names "Legal", which has ended (R16)`]);
});

test("a live department under a staff unit that has ended fails once, as the line's", () => {
  const f = failures(tree((m) => below("Sales", "Department")(ending(`${G}/legal.md`, "2025-12")(withLegal(m)))));
  assert.deepEqual(f, [`${G}/sales.md: \`part-of\` names "Legal", which has ended (R16)`]);
});

test("an agent with a Staff place in a department fails once, as the line's", () => {
  const f = failures(tree((m) => edit(`${G}/engineering.md`, ANA, "| Bot | Designer | Staff |")(withBot(m))));
  assert.deepEqual(f, [`${G}/engineering.md: the "## People" row "Bot" names a profile that does not carry \`nature: human\`, in a group whose \`kind\` carries \`in-line: yes\` (R16)`]);
});

// rank: the company's own order of its groups, unique across them all (R9).
const ranked = (path, n) => (m) => m.set(path, m.get(path).replace("kind: ", `rank: ${n}\nkind: `));

test("ranked groups beside unranked ones pass", () => {
  assert.deepEqual(failures(tree((m) => ranked(`${G}/management.md`, 10)(ranked(`${G}/engineering.md`, 20)(m)))), []);
});

test("two groups sharing a rank fail once, naming both", () => {
  const f = failures(tree((m) => ranked(`${G}/management.md`, 20)(ranked(`${G}/engineering.md`, 20)(m))));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /two group entities share rank 20: .*"Engineering".*"Management"|two group entities share rank 20: .*"Management".*"Engineering"/);
});

test("a rank written as a word fails once", () => {
  const f = failures(tree(ranked(`${G}/engineering.md`, "twenty")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /engineering\.md.*`rank` is declared `number` and says "twenty"/);
});
