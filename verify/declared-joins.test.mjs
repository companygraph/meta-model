// The two joins a schema may declare in the opening of a Description, and the checks that hold
// an instance to them. Fed fixture maps as `instance-checks.test.mjs` is, and for its reason:
// `example/` was written to pass, so it shows the checks do not fire falsely and nothing of
// what they catch. Each case here is a tree that must fail, beside the one that must not.
//
// No check names a type, so the fixtures use core's own names only because a schema has to be
// of a type the checks know; what is declared is what is held, and the last cases move the
// declaration onto other sections and another field to show it.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance, IMAGE_FILE } from "../lib/checks.mjs";

const head = (type, owner) => [
  `# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "",
  ...(owner ? [`**Owner:** ${owner}`, ""] : []),
  "## File Location", "", `\`${type}s/\``, "",
];

const SKILL_SCHEMA = [...head("skill"), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

const experienceSchema = (field = "skills") => [...head("experience", "profile"),
  "## Frontmatter", "",
  "| Field | Required | Type | Description |", "| --- | --- | --- | --- |",
  `| \`${field}\` | No | array of ref → skill | What the period used. |`, "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");

// `under` and `lists` are the two openers as a schema would write them, or "" for a schema
// that declares neither — which is every core before this one, and must change nothing.
const profileSchema = ({ under = "Under `## Skills`. ", lists = "`skills` lists `Skill`. " } = {}) => [...head("profile"),
  "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Skills` | No | Table. One row per skill claimed. |",
  `| \`## Evidence\` | No | Table. ${under}One row per fact. |`, "",
  "`## Skills` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Skill` | Yes | ref → skill | The skill. |", "",
  "`## Evidence` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Skill` | Yes | ref → skill | The claim this row stands under. |",
  "| `What it shows` | Yes | string | The fact. |",
  `| \`Experience\` | No | qualifier → experience | ${lists}The period the fact comes from. |`, ""].join("\n");

const table = (columns, rows) => [`| ${columns.join(" | ")} |`, `| ${columns.map(() => "---").join(" | ")} |`,
  ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

const profile = ({ skills, evidence }) => ["# Ada Vance", "", "> An engineer.", "",
  ...(skills ? ["## Skills", "", table(["Skill"], skills.map((s) => [s])), ""] : []),
  ...(evidence ? ["## Evidence", "", table(["Skill", "What it shows", "Experience"], evidence), ""] : [])].join("\n");

const experience = (name, skills, field = "skills") =>
  `---\n${field}:\n${skills.map((s) => `  - ${s}`).join("\n")}\n---\n\n# ${name}\n\n> A period.\n`;

const tree = ({ schema = profileSchema(), page, experiences = { "2019-harbor": experience("Harbor Freight", ["Data modeling"]) }, expSchema = experienceSchema() }) =>
  new Map([
    ["meta/core/profile-schema.md", schema],
    ["meta/core/experience-schema.md", expSchema],
    ["meta/core/skill-schema.md", SKILL_SCHEMA],
    ["model/skills/data-modeling.md", "# Data modeling\n\n> Shaping data.\n"],
    ["model/skills/public-speaking.md", "# Public speaking\n\n> Talking.\n"],
    ["model/profiles/ada-vance/ada-vance.md", page],
    ...Object.entries(experiences).map(([f, text]) => [`model/profiles/ada-vance/experiences/${f}.md`, text]),
  ]);

const failuresOf = (files) => checkInstance(files, { core: "meta/core", model: "model" }).failures;
const about = (failures, ...words) => failures.filter((f) => words.every((w) => f.includes(w)));

const GOOD = profile({ skills: ["Data modeling"], evidence: [["Data modeling", "Modeled the freight ledger.", "Harbor Freight"]] });

test("a page whose joins hold reports nothing from either check", () => {
  const failures = failuresOf(tree({ page: GOOD }));
  assert.deepEqual(about(failures, "## Evidence"), []);
  assert.deepEqual(about(failures, "## Skills"), []);
});

test("an experience that does not list the row's skill fails, naming the row, the cell and the field", () => {
  const page = profile({ skills: ["Data modeling", "Public speaking"], evidence: [
    ["Data modeling", "Modeled the freight ledger.", "Harbor Freight"],
    ["Public speaking", "Presented the ledger.", "Harbor Freight"]] });
  const hit = about(failuresOf(tree({ page })), "Harbor Freight", "Public speaking", "`skills`");
  assert.equal(hit.length, 1, "one finding for the one row that disagrees");
  assert.match(hit[0], /ada-vance\.md/);
  assert.match(hit[0], /\(R16\)/);
  assert.equal(about(failuresOf(tree({ page })), "Harbor Freight", "\"Data modeling\"", "does not list").length, 0, "the row that agrees is left alone");
});

test("a blank cell names nothing and is held to nothing", () => {
  const page = profile({ skills: ["Data modeling"], evidence: [["Data modeling", "Sat beside the modeling work.", ""]] });
  assert.deepEqual(about(failuresOf(tree({ page })), "does not list"), []);
});

test("a cell that names no entity is left to the check that says so, and reported once", () => {
  const page = profile({ skills: ["Data modeling"], evidence: [["Data modeling", "Modeled it.", "Nowhere Ltd"]] });
  assert.deepEqual(about(failuresOf(tree({ page })), "Nowhere Ltd", "does not list"), []);
});

test("a claim with nothing under it fails, and so does a fact under a claim nobody made", () => {
  const page = profile({ skills: ["Data modeling", "Public speaking"], evidence: [["Data modeling", "Modeled it.", "Harbor Freight"]] });
  const bare = about(failuresOf(tree({ page })), "Public speaking", "## Skills", "## Evidence");
  assert.equal(bare.length, 1);
  assert.match(bare[0], /\(R16\)/);

  const stray = profile({ skills: ["Data modeling"], evidence: [
    ["Data modeling", "Modeled it.", "Harbor Freight"], ["Public speaking", "Presented it.", ""]] });
  const orphan = about(failuresOf(tree({ page: stray })), "Public speaking", "## Evidence", "## Skills");
  assert.equal(orphan.length, 1);
  // The two directions are different defects with different repairs, and read differently.
  assert.match(bare[0], /nothing in "## Evidence"/);
  assert.match(orphan[0], /stands under/);
});

test("claims with no Evidence section at all fail, each by name", () => {
  const page = profile({ skills: ["Data modeling", "Public speaking"] });
  const failures = failuresOf(tree({ page }));
  assert.equal(about(failures, "Data modeling", "## Evidence").length, 1);
  assert.equal(about(failures, "Public speaking", "## Evidence").length, 1);
});

test("a page with neither table has nothing to hold", () => {
  const failures = failuresOf(tree({ page: "# Relay\n\n> An agent.\n" }));
  assert.deepEqual(about(failures, "## Evidence"), []);
});

test("a schema that declares neither join is held to neither, as every core before this one", () => {
  const schema = profileSchema({ under: "", lists: "" });
  const page = profile({ skills: ["Data modeling", "Public speaking"], evidence: [["Public speaking", "Presented it.", "Harbor Freight"]] });
  const failures = failuresOf(tree({ schema, page }));
  assert.deepEqual(about(failures, "does not list"), []);
  assert.deepEqual(about(failures, "stands under"), []);
  assert.deepEqual(about(failures, "nothing in"), []);
});

test("the field is the one the schema names, not one the check knows", () => {
  const schema = profileSchema({ lists: "`used` lists `Skill`. " });
  const experiences = { "2019-harbor": experience("Harbor Freight", ["Data modeling"], "used") };
  assert.deepEqual(about(failuresOf(tree({ schema, page: GOOD, experiences, expSchema: experienceSchema("used") })), "does not list"), []);
  const wrong = { "2019-harbor": experience("Harbor Freight", ["Public speaking"], "used") };
  assert.equal(about(failuresOf(tree({ schema, page: GOOD, experiences: wrong, expSchema: experienceSchema("used") })), "does not list", "`used`").length, 1);
});

test("a declaration that names nothing fails by name, in the schema, and never in silence", () => {
  const noField = failuresOf(tree({ schema: profileSchema({ lists: "`tools` lists `Skill`. " }), page: GOOD }));
  assert.equal(about(noField, "profile-schema.md", "`tools`", "experience").length, 1);

  const noColumn = failuresOf(tree({ schema: profileSchema({ lists: "`skills` lists `Talent`. " }), page: GOOD }));
  assert.equal(about(noColumn, "profile-schema.md", "`Talent`").length, 1);

  const noSection = failuresOf(tree({ schema: profileSchema({ under: "Under `## Claims`. " }), page: GOOD }));
  assert.equal(about(noSection, "profile-schema.md", "## Claims").length, 1);
});

// Core's own declarations, end to end. A declaration misspelled is prose and switches nothing
// on, so nothing else would notice the profile schema losing one: this reads the schemas this
// repository ships and the example beside them, breaks the example both ways in memory, and
// expects both checks to say so. It is the positive control the green example cannot be.
test("core's profile schema declares both joins, and the example breaks them when broken", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = new URL("..", import.meta.url).pathname;
  const files = new Map();
  const walk = (dir, prefix) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true }))
      if (e.isDirectory()) walk(path.join(dir, e.name), `${prefix}${e.name}/`);
      else files.set(prefix + e.name, fs.readFileSync(path.join(dir, e.name), IMAGE_FILE.test(e.name) ? undefined : "utf8"));
  };
  walk(path.join(root, "core"), "core/");
  walk(path.join(root, "example", "model"), "model/");
  assert.deepEqual(checkInstance(files, { core: "core", model: "model" }).failures, [], "the example as shipped passes");

  const profile = [...files.keys()].find((k) => /^model\/profiles\/[^/]+\/[^/]+\.md$/.test(k) && files.get(k).includes("## Evidence"));
  const rows = files.get(profile).split("## Evidence")[1].split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Skill") && !l.startsWith("| ---"));
  const [skill, , period] = rows[0].split("|").slice(1).map((c) => c.trim());
  const owned = [...files.keys()].find((k) => k.startsWith(path.dirname(profile) + "/experiences/") && files.get(k).includes(`# ${period}`));

  const unlisted = new Map(files).set(owned, files.get(owned).replace(`  - ${skill}\n`, ""));
  assert.equal(about(checkInstance(unlisted, { core: "core", model: "model" }).failures, period, skill, "does not list").length > 0, true, "the experience no longer lists the skill");

  const unclaimed = new Map(files).set(profile, files.get(profile).split("\n").filter((l) => !(l.startsWith(`| ${skill} |`) && l.split("|").length > 4)).join("\n"));
  assert.equal(about(checkInstance(unclaimed, { core: "core", model: "model" }).failures, skill, "nothing in").length > 0, true, "the claim has no row under it");
});
