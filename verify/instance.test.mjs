// The parser reads an instance by the fixed shape alone — no schema — so these fixtures are
// small maps of path → Markdown, and every rule the spec names has a fixture that breaks it.
import test from "node:test";
import assert from "node:assert/strict";
import { parseInstance, parseSchemas, CORE_LABEL } from "../lib/instance.mjs";

const valid = new Map([
  ["README.md", "# Example instance\n\nIgnored: a README is never an entity.\n"],
  // R6, R13: the container's root, a singular type's file. It carries no frontmatter, so it
  // contributes no edges and leaves every assertion below about edges untouched — in
  // particular the scalar-vs-list test, which adds a `sources/` folder that a `source:` field
  // here would resolve into a second, alphabetically earlier edge.
  ["identity.md", "# Beacon Systems\n\n> Billing software.\n\n## What it is\n\nOne product.\n"],
  ["values/craftsmanship.md", "# Craftsmanship\n\n> We ship one thing.\n\n## In practice\n\nRefusing a deadline.\n"],
  ["skills/java-programming.md", "---\ngroup: Programming Languages\n---\n\n# Java Programming\n\n> JVM services.\n\n## In practice\n\nReading the stack trace.\n"],
  ["proficiency-levels/proficient.md", "---\nrank: 30\n---\n\n# Proficient\n\n> Exercises judgment.\n\n## What it means\n\nMakes calls.\n"],
  ["profiles/mira-halvorsen/mira-halvorsen.md",
   "---\nemail: mira@example.invalid\nlocation: Bergen\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming | Proficient | Owned the JVM services. |\n\n## Summary\n\nEight years.\n"],
  ["profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
   "---\nstart: 2022-02\norganisation: Beacon Systems\nskills:\n  - Java Programming\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## Achievements\n\n- Split one service.\n"],
]);

test("the root is the identity entity, by name and by id", () => {
  const { root, rootId } = parseInstance(valid);
  assert.equal(root, "Beacon Systems");
  assert.equal(rootId, "identity");
});

// The root used to fall back to the string "Fictional Company" when an instance carried no
// identity, and the test here asserted that literal — which is what made a dead branch look
// load-bearing. An instance without an identity is not a valid instance (R6: a company has
// one, and check.mjs fails when the file is missing), and this parser throws on the
// malformations it can see rather than naming the company after the example.
test("an instance with no identity has no root, and that is an R6 error", () => {
  const rootless = new Map(valid);
  rootless.delete("identity.md");
  assert.throws(() => parseInstance(rootless), /^Error: R6: .*identity/);
});

// The stamp exists so a renderer can place a period and a kind beside a node without knowing
// which field names carry them — the same reason `rootId` is resolved here. These assert the
// three shapes a period comes in, because a renderer draws each of them differently.
test("an entity carries a stamp of its kind and period, and one without either carries none", () => {
  const files = new Map(valid);
  files.set("experience-kinds/role.md", "# Role\n\n> A position held.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nkind: Role\nstart: 2022-02\nend: 2026-05\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n");
  const { entities } = parseInstance(files);
  const exp = entities.find((e) => e.type === "experience");
  assert.deepEqual(exp.stamp, { kind: "Role", start: "2022-02", end: "2026-05" });
  // A skill has neither, so it keeps exactly the shape it had before the stamp existed.
  assert.equal("stamp" in entities.find((e) => e.id === "skills/java-programming"), false);
});

test("an open period stamps a null end, and a one-off stamps end equal to start", () => {
  const files = new Map(valid);
  files.set("experience-kinds/role.md", "# Role\n\n> A position held.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nkind: Role\nstart: 2026-06\n---\n\n# Still running\n\n> Ongoing.\n");
  assert.deepEqual(parseInstance(files).entities.find((e) => e.type === "experience").stamp,
                   { kind: "Role", start: "2026-06", end: null });
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nkind: Role\nstart: 2012-05-04\nend: 2012-05-04\n---\n\n# A talk\n\n> One day.\n");
  assert.deepEqual(parseInstance(files).entities.find((e) => e.type === "experience").stamp,
                   { kind: "Role", start: "2012-05-04", end: "2012-05-04" });
});

test("types come from folders, singular by R7, with their owner", () => {
  const { types } = parseInstance(valid);
  assert.deepEqual(types, [
    { type: "experience", folder: "experiences", owner: "profile", singular: false },
    { type: "identity", folder: null, owner: null, singular: true },
    { type: "proficiency-level", folder: "proficiency-levels", owner: null, singular: false },
    { type: "profile", folder: "profiles", owner: null, singular: false },
    { type: "skill", folder: "skills", owner: null, singular: false },
    { type: "value", folder: "values", owner: null, singular: false },
  ]);
});

test("an entity is its H1, tagline, fields, sections and path; a README is not one", () => {
  const { entities } = parseInstance(valid);
  assert.equal(entities.length, 6);
  const java = entities.find(e => e.id === "skills/java-programming");
  assert.deepEqual(java, {
    id: "skills/java-programming", type: "skill", name: "Java Programming",
    tagline: "JVM services.", fields: { group: "Programming Languages" },
    sections: [{ heading: "In practice", text: "Reading the stack trace.", tables: [] }],
    owner: null, path: "skills/java-programming.md",
  });
});

// `path` is what the page turns into a link to the file on GitHub, so it has to be the path in
// the repository the files came from. It was hardcoded to "example/model/" — true of the
// repository this example lives in and false of every other instance, so every file link on a
// site whose model sits at `model/` was a 404. The caller knows the prefix; it already had it
// in a constant of its own.
test("an entity's path is its file's path in the repository it came from", () => {
  const at = (sub) => parseInstance(valid, { sub }).entities.find((e) => e.id === "skills/java-programming").path;
  assert.equal(at("model/"), "model/skills/java-programming.md");
  assert.equal(at("example/model/"), "example/model/skills/java-programming.md");
  // No prefix given: the path is the one the files were handed over with, and nothing is
  // invented on the caller's behalf.
  assert.equal(parseInstance(valid).entities.find((e) => e.id === "skills/java-programming").path,
               "skills/java-programming.md");
});

test("a schema's path takes the prefix its caller passes too", () => {
  assert.equal(parseSchemas(core, { sub: "core/" }).entities.find((e) => e.id === "core/skill").path,
               "core/skill-schema.md");
  assert.equal(parseSchemas(core).entities.find((e) => e.id === "core/skill").path, "skill-schema.md");
});

test("the folder form names the entity by its folder and owns what nests inside it", () => {
  const { entities } = parseInstance(valid);
  const mira = entities.find(e => e.name === "Mira Halvorsen");
  assert.equal(mira.id, "profiles/mira-halvorsen");
  assert.equal(mira.path, "profiles/mira-halvorsen/mira-halvorsen.md");
  const exp = entities.find(e => e.type === "experience");
  assert.equal(exp.owner, "profiles/mira-halvorsen");
  assert.equal(exp.id, "profiles/mira-halvorsen/experiences/2022-beacon-systems");
});

test("a table section is kept as rows, and its body text is empty", () => {
  const mira = parseInstance(valid).entities.find(e => e.name === "Mira Halvorsen");
  const skills = mira.sections.find(s => s.heading === "Skills");
  assert.deepEqual(skills.table, {
    caption: null,
    columns: ["Skill", "Level", "Evidence"],
    rows: [["Java Programming", "Proficient", "Owned the JVM services."]],
  });
  assert.equal(skills.text, "");
});

// R11: a list-valued field is a block sequence, one entry per line, never a flow sequence in
// brackets. The parser read only the bracketed form, so every conforming instance had its
// lists silently dropped — `skills` arrived as the empty string and the `- entry` lines were
// skipped as unparseable. Nothing caught it because every fixture in this file used the form
// R11 forbids, which is the one the parser could read.
test("a list is a block sequence, and each entry becomes an edge", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills:\n  - Java Programming\n---\n\n# Splitting\n\n> x\n");
  const { entities, edges } = parseInstance(files);
  const exp = entities.find((e) => e.type === "experience");
  assert.deepEqual(exp.fields.skills, ["Java Programming"]);
  assert.equal(edges.filter((x) => x.from === exp.id && x.via === "skills").length, 1);
});

// The parser threw on an unresolvable name from the day it was written, so a rule it can see
// is a rule it enforces. Had it enforced this one, the fixtures above could not have used the
// forbidden form and the dropped lists would have surfaced years earlier.
test("a flow sequence is an R11 error, not a silently different shape", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills: [Java Programming]\n---\n\n# Splitting\n\n> x\n");
  assert.throws(() => parseInstance(files), /^Error: R11: `skills`/);
});

test("a frontmatter list that names entities becomes edges", () => {
  const { edges } = parseInstance(valid);
  const e = edges.find(x => x.via === "skills");
  assert.deepEqual(e, {
    from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
    to: "skills/java-programming", via: "skills", attrs: {},
  });
});

test("a table row's first resolving cell is the edge; other cells are attrs, resolved where they can be", () => {
  const { edges } = parseInstance(valid);
  const e = edges.find(x => x.via === "Skills.Skill");
  assert.deepEqual(e, {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "proficiency-levels/proficient", Evidence: "Owned the JVM services." },
  });
});

// R4 makes an unresolvable row an error so the page can never draw a line to nowhere. A table
// of references to the outside world — a register entry, a recording — resolves to nothing at
// all, and under that rule it could not exist.
//
// The decision moves from the row to the table: a table where nothing resolves anywhere draws
// no edges and is data; a table where something resolves is a table of references, and there a
// row that resolves to nothing is still the error it was.
//
// Worth being exact about what that preserves, because it is narrower than it first looks. R4
// never caught a typo in one cell: the first *resolving* cell of a row becomes the edge, so a
// misspelled skill beside a correct Level still resolves — on the Level. What it catches is a
// row where nothing at all resolves, and that is what stays caught.
test("a table whose rows resolve to nothing at all is data, not an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## References\n\n" +
    "| What | URL |\n| --- | --- |\n| Commercial register entry | https://example.invalid/firm/1 |\n" +
    "| Recording | https://example.invalid/talk |\n");
  const { entities, edges } = parseInstance(files);
  const exp = entities.find((e) => e.type === "experience");
  const refs = exp.sections.find((s) => s.heading === "References");
  assert.equal(refs.table.rows.length, 2);
  assert.equal(edges.filter((x) => x.from === exp.id && x.via.startsWith("References")).length, 0);
});

test("a table where something resolves keeps R4 on every row", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming | Proficient | Owned it. |\n" +
    "| Jva Programming | Prficient | Nothing here resolves, so the row is an error. |\n");
  assert.throws(() => parseInstance(files), /^Error: R4: row "Jva Programming"/);
});

test("a name that resolves to nothing is an R4 error", () => {
  const broken = new Map(valid);
  broken.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills:\n  - Kotlin\n---\n\n# Splitting\n\n> x\n");
  assert.throws(() => parseInstance(broken), /^Error: R4: .*Kotlin/);
});

test("a root folder that is not a plural is an R7 error", () => {
  const broken = new Map(valid);
  broken.set("value/humility.md", "# Humility\n\n> x\n");
  assert.throws(() => parseInstance(broken), /^Error: R7: .*value/);
});

test("output is deterministic regardless of map order", () => {
  const shuffled = new Map([...valid.entries()].reverse());
  assert.deepEqual(parseInstance(shuffled), parseInstance(valid));
});

test("a scalar frontmatter value that names an entity becomes an edge; one that does not stays a fact", () => {
  const withSource = new Map(valid);
  withSource.set("sources/local.md", "# Local\n\n> Kept in this repository.\n");
  withSource.set("skills/java-programming.md", "---\nsource: Local\ngroup: Programming Languages\n---\n\n# Java Programming\n\n> JVM services.\n");
  const { edges, entities } = parseInstance(withSource);
  assert.deepEqual(edges.find(x => x.via === "source"),
    { from: "skills/java-programming", to: "sources/local", via: "source", attrs: {} });
  assert.equal(edges.filter(x => x.via === "group").length, 0);
  assert.equal(entities.find(e => e.id === "skills/java-programming").fields.group, "Programming Languages");
});

const core = new Map([
  ["profile-schema.md", `# Profile Schema

> Required structure for profile files.

## File Location

\`profiles/<profile>/<profile>.md\`

A profile owns experiences.

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| \`source\` | Yes | ref → source | Where mastered |
| \`email\` | No | string | Contact |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| \`# [Name]\` | Yes | The canonical name. |
| \`## Skills\` | No | Table. One row per skill. |

\`## Skills\` is a table with these columns:

| Column | Required | Type | Description |
| --- | --- | --- | --- |
| \`Skill\` | Yes | ref → skill | Must match |
| \`Level\` | Yes | ref → proficiency-level | Must match |
| \`Evidence\` | Yes | string | A fact |
`],
  ["experience-schema.md", `# Experience Schema

> Required structure for experience files.

**Owner:** profile

## File Location

\`profiles/<profile>/experiences/*.md\`

## Frontmatter

| Field | Required | Type | Description |
| --- | --- | --- | --- |
| \`source\` | Yes | ref → source | Where mastered |
| \`skills\` | No | array of ref → skill | Names |

## Sections

| Section | Required | Description |
| --- | --- | --- |
| \`# [Title]\` | Yes | The name |
`],
  ["skill-schema.md", "# Skill Schema\n\n> Skills.\n\n## File Location\n\n`skills/*.md`\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `source` | Yes | ref → source | Where |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Skill]` | Yes | Name |\n"],
  ["proficiency-level-schema.md", "# Proficiency Level Schema\n\n> Levels.\n\n## File Location\n\n`proficiency-levels/*.md`\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `source` | Yes | ref → source | Where |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Label]` | Yes | Name |\n"],
  ["source-schema.md", "# Source Schema\n\n> Sources.\n\n## File Location\n\n`sources/*.md`\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `url` | No | string | Where |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Name]` | Yes | Name |\n"],
]);

test("a section keeps every table it holds, each with the caption that addresses it", () => {
  const { entities } = parseSchemas(core);
  const profile = entities.find(e => e.id === "core/profile");
  const sections = profile.sections.find(s => s.heading === "Sections");
  assert.equal(sections.tables.length, 2);
  assert.equal(sections.tables[0].caption, null);
  assert.equal(sections.tables[1].caption, "`## Skills` is a table with these columns:");
  assert.deepEqual(sections.tables[1].columns, ["Column", "Required", "Type", "Description"]);
  assert.equal(sections.table, sections.tables[0]);
  assert.ok(!sections.text.includes("is a table with these columns"));
});

test("schemas become entities of one type in one folder, named by their H1", () => {
  const { root, types, entities } = parseSchemas(core);
  assert.equal(root, CORE_LABEL);
  assert.deepEqual(types, [{ type: "schema", folder: "core", owner: null }]);
  assert.deepEqual(entities.map(e => e.id), ["core/experience", "core/proficiency-level", "core/profile", "core/skill", "core/source"]);
  const exp = entities.find(e => e.id === "core/experience");
  assert.equal(exp.name, "Experience Schema");
  assert.equal(exp.fields.owner, "profile");
  assert.equal(exp.path, "experience-schema.md");
  assert.equal(exp.owner, null);
});

test("a ref → cell in a frontmatter table is an edge to that type's schema", () => {
  const { edges } = parseSchemas(core);
  assert.deepEqual(edges.find(x => x.from === "core/experience" && x.via === "skills"),
    { from: "core/experience", to: "core/skill", via: "skills", attrs: { type: "array of ref → skill" } });
  assert.deepEqual(edges.find(x => x.from === "core/skill" && x.via === "source"),
    { from: "core/skill", to: "core/source", via: "source", attrs: { type: "ref → source" } });
});

test("a ref → cell in a column table is an edge via Section.Column; the Owner line is an edge via owner", () => {
  const { edges } = parseSchemas(core);
  assert.deepEqual(edges.find(x => x.via === "Skills.Level"),
    { from: "core/profile", to: "core/proficiency-level", via: "Skills.Level", attrs: { type: "ref → proficiency-level" } });
  assert.deepEqual(edges.find(x => x.via === "owner"),
    { from: "core/experience", to: "core/profile", via: "owner", attrs: {} });
});

test("a ref → a type with no schema is an R4 error", () => {
  const broken = new Map(core);
  broken.set("skill-schema.md", broken.get("skill-schema.md").replace("ref → source", "ref → team"));
  assert.throws(() => parseSchemas(broken), /^Error: R4: .*team/);
});

test("an Owner-shaped line inside a section's prose is not the Owner line", () => {
  const withOwnerLookalike = new Map(core);
  withOwnerLookalike.set("skill-schema.md",
    "# Skill Schema\n\n> Skills.\n\n## File Location\n\n`skills/*.md`\n\nThe `**Owner:**` line says which type.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `source` | Yes | ref → source | Where |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Skill]` | Yes | Name |\n");
  const { entities, edges } = parseSchemas(withOwnerLookalike);
  const skill = entities.find(e => e.id === "core/skill");
  assert.equal(skill.fields.owner, undefined);
  assert.equal(edges.find(x => x.from === "core/skill" && x.via === "owner"), undefined);
  const location = skill.sections.find(s => s.heading === "File Location");
  assert.ok(location.text.includes("The `**Owner:**` line says which type."));
});

test("the example instance still parses with tables, one per section", () => {
  const mira = parseInstance(valid).entities.find(e => e.name === "Mira Halvorsen");
  const skills = mira.sections.find(s => s.heading === "Skills");
  assert.equal(skills.tables.length, 1);
  assert.equal(skills.tables[0].caption, null);
  assert.equal(skills.table, skills.tables[0]);
});

// A company of one: the company and the only person in it are the same human and carry the
// same name. The fictional example cannot show this — its company is Beacon Systems and its
// people are not — so the rule it exercises is the one that matters here: a canonical name
// identifies an entity within its type, because every schema declares its references as
// `ref → <type>` and so a reference always names a type as well as a name.
test("two entities of different types may share a name", () => {
  const files = new Map([
    ["identity.md", "# Robert Blust\n\n> A company of one.\n\n## What it is\n\nOne person.\n"],
    ["profiles/robert-blust/robert-blust.md",
     "# Robert Blust\n\n> The person.\n\n## Summary\n\nTwenty-five years.\n"],
  ]);
  const data = parseInstance(files);
  assert.equal(data.entities.filter((e) => e.name === "Robert Blust").length, 2);
  assert.deepEqual(
    data.entities.filter((e) => e.name === "Robert Blust").map((e) => e.type).sort(),
    ["identity", "profile"]);
});

test("two entities of the same type sharing a name is still an R2 error", () => {
  const files = new Map([
    ["identity.md", "# One\n\n> A company.\n\n## What it is\n\nText.\n"],
    ["skills/a.md", "# Same Name\n\n> A skill.\n\n## In practice\n\nText.\n"],
    ["skills/b.md", "# Same Name\n\n> Another skill.\n\n## In practice\n\nText.\n"],
  ]);
  assert.throws(() => parseInstance(files), /R2: two skill entities share the name "Same Name"/);
});

// The parser reads no schema, so it cannot use a declared type to choose between two
// entities that share a name. It refuses rather than guessing — the failure names both types
// and the file the reference sits in.
test("a reference to a name carried by two types is an error where it is used", () => {
  const files = new Map([
    ["identity.md", "# Robert Blust\n\n> A company of one.\n\n## What it is\n\nOne person.\n"],
    ["profiles/robert-blust/robert-blust.md",
     "# Robert Blust\n\n> The person.\n\n## Summary\n\nText.\n"],
    ["profiles/robert-blust/experiences/2026-now.md",
     "---\nstart: 2026-06\norganisation: Robert Blust\n---\n\n# Now\n\n> Ongoing.\n\n## Achievements\n\n- Text.\n"],
  ]);
  assert.throws(() => parseInstance(files), /carried by more than one type \(identity, profile\)/);
});
