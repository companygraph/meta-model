// The parser reads an instance by the fixed shape and resolves by what its schemas declare, so
// these fixtures are small maps of path → Markdown beside a map of the schemas they are read
// against, and every rule the spec names has a fixture that breaks it.
import test from "node:test";
import assert from "node:assert/strict";
import { parseInstance, parseSchemas, declarationOf, constraintsOf, CORE_LABEL } from "../lib/instance.mjs";

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
   "---\nstart: 2022-02\norganization: Beacon Systems\nskills:\n  - Java Programming\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## Achievements\n\n- Split one service.\n"],
]);

// A schema in the fixed shape R9 states, holding only the rows a fixture needs. `fields` is
// a list of [name, type] pairs for the Frontmatter table; `tables` maps a section heading to
// its [column, type] pairs, which become the captioned column table R9 requires.
const schema = (type, { fields = [], tables = {}, grouped = {}, location = null, owner = null } = {}) => {
  const title = type.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  const lines = [
    `# ${title} Schema`, "", `> A ${type}.`, "",
    ...(owner ? [`**Owner:** ${owner}`, ""] : []),
    "## File Location", "", `\`${location ?? `${type}s/*.md`}\``, "",
    "## Frontmatter", "",
  ];
  if (fields.length) {
    lines.push("| Field | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of fields) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  } else {
    lines.push("No YAML frontmatter.");
  }
  lines.push("", "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |",
             "| `# [Name]` | Yes | The canonical name. |");
  for (const heading of Object.keys(tables)) lines.push(`| \`## ${heading}\` | No | Table. |`);
  for (const heading of Object.keys(grouped)) lines.push(`| \`## ${heading}\` | No | Grouped. |`);
  for (const [heading, columns] of Object.entries(tables)) {
    lines.push("", `\`## ${heading}\` is a table with these columns:`, "",
               "| Column | Required | Type | Description |", "| --- | --- | --- | --- |");
    for (const [name, t] of columns) lines.push(`| \`${name}\` | No | ${t} | A ${name}. |`);
  }
  // R9's third declared shape: a section grouped under `###` headings that name entities. One
  // row, because every heading in the section names the same type.
  for (const [heading, [name, t]] of Object.entries(grouped)) {
    lines.push("", `\`## ${heading}\` is grouped under these headings:`, "",
               "| Heading | Required | Type | Description |", "| --- | --- | --- | --- |",
               `| \`${name}\` | No | ${t} | The ${name}. |`);
  }
  return lines.join("\n") + "\n";
};

// What every fixture in this file is read against. One schema per type the fixtures use,
// declaring each field and table the way core does: a reference names its type, a qualifier
// resolves and draws nothing, and everything else is a fact.
const schemas = new Map([
  ["identity-schema.md", schema("identity", { tables: { "Also at": [["Where", "string"], ["URL", "string"]] } })],
  ["value-schema.md", schema("value")],
  ["skill-schema.md", schema("skill", { fields: [["source", "ref → source"], ["group", "string"]] })],
  ["proficiency-level-schema.md", schema("proficiency-level", { fields: [["rank", "number"]] })],
  ["experience-kind-schema.md", schema("experience-kind")],
  ["achievement-kind-schema.md", schema("achievement-kind", { fields: [["rank", "number"]] })],
  ["source-schema.md", schema("source", { fields: [["url", "string"]] })],
  ["profile-schema.md", schema("profile", {
    fields: [["email", "string"], ["location", "string"]],
    tables: {
      Skills: [["Skill", "ref → skill"], ["Level", "qualifier → proficiency-level"], ["Evidence", "string"]],
      "Also at": [["Where", "string"], ["URL", "string"]],
    },
  })],
  ["experience-schema.md", schema("experience", {
    fields: [["kind", "ref → experience-kind"], ["start", "date"], ["end", "date"],
             ["organization", "ref? → identity"], ["skills", "array of ref → skill"]],
    tables: { References: [["What", "string"], ["URL", "string"]] },
    grouped: { Achievements: ["Kind", "ref → achievement-kind"] },
    owner: "profile",
  })],
]);

test("the root is the identity entity, by name and by id", () => {
  const { root, rootId } = parseInstance(valid, { schemas });
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
  assert.throws(() => parseInstance(rootless, { schemas }), /^Error: R6: .*identity/);
});

// The stamp exists so a renderer can place a period and a kind beside a node without knowing
// which field names carry them — the same reason `rootId` is resolved here. These assert the
// three shapes a period comes in, because a renderer draws each of them differently.
test("an entity carries a stamp of its kind and period, and one without either carries none", () => {
  const files = new Map(valid);
  files.set("experience-kinds/role.md", "# Role\n\n> A position held.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nkind: Role\nstart: 2022-02\nend: 2026-05\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n");
  const { entities } = parseInstance(files, { schemas });
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
  assert.deepEqual(parseInstance(files, { schemas }).entities.find((e) => e.type === "experience").stamp,
                   { kind: "Role", start: "2026-06", end: null });
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nkind: Role\nstart: 2012-05-04\nend: 2012-05-04\n---\n\n# A talk\n\n> One day.\n");
  assert.deepEqual(parseInstance(files, { schemas }).entities.find((e) => e.type === "experience").stamp,
                   { kind: "Role", start: "2012-05-04", end: "2012-05-04" });
});

test("types come from folders, singular by R7, with their owner", () => {
  const { types } = parseInstance(valid, { schemas });
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
  const { entities } = parseInstance(valid, { schemas });
  assert.equal(entities.length, 6);
  const java = entities.find(e => e.id === "skills/java-programming");
  assert.deepEqual(java, {
    id: "skills/java-programming", type: "skill", name: "Java Programming",
    tagline: "JVM services.", fields: { group: "Programming Languages" },
    sections: [{ heading: "In practice", text: "Reading the stack trace.", tables: [] }],
    owner: null, path: "skills/java-programming.md",
  });
});

// R9: a tagline is one blockquote paragraph, and Markdown reads a run of `>` lines as one. The
// parser used to keep the first line only, so a tagline wrapped the way the family wraps prose
// reached every consumer as half a sentence while GitHub rendered it whole.
test("a tagline wrapped across `>` lines is one paragraph, joined with a space", () => {
  const files = new Map(valid);
  files.set("skills/java-programming.md",
    "---\ngroup: Programming Languages\n---\n\n# Java Programming\n\n> JVM services, built and run\n> on the virtual machine.\n\n## In practice\n\nReading the stack trace.\n");
  assert.equal(parseInstance(files, { schemas }).entities.find((e) => e.id === "skills/java-programming").tagline,
               "JVM services, built and run on the virtual machine.");
});

test("a tagline ends at a blank line or a bare `>`, and a later quote is not part of it", () => {
  const files = new Map(valid);
  files.set("skills/java-programming.md",
    "---\ngroup: Programming Languages\n---\n\n# Java Programming\n\n> JVM services.\n>\n> A second paragraph.\n\n> A quote after a blank line.\n\n## In practice\n\n> A quote in a section.\n");
  const java = parseInstance(files, { schemas }).entities.find((e) => e.id === "skills/java-programming");
  assert.equal(java.tagline, "JVM services.");
  assert.equal(java.sections[0].text, "> A quote in a section.");
});

// `path` is what the page turns into a link to the file on GitHub, so it has to be the path in
// the repository the files came from. It was hardcoded to "example/model/" — true of the
// repository this example lives in and false of every other instance, so every file link on a
// site whose model sits at `model/` was a 404. The caller knows the prefix; it already had it
// in a constant of its own.
test("an entity's path is its file's path in the repository it came from", () => {
  const at = (sub) => parseInstance(valid, { sub, schemas }).entities.find((e) => e.id === "skills/java-programming").path;
  assert.equal(at("model/"), "model/skills/java-programming.md");
  assert.equal(at("example/model/"), "example/model/skills/java-programming.md");
  // No prefix given: the path is the one the files were handed over with, and nothing is
  // invented on the caller's behalf.
  assert.equal(parseInstance(valid, { schemas }).entities.find((e) => e.id === "skills/java-programming").path,
               "skills/java-programming.md");
});

test("a schema's path takes the prefix its caller passes too", () => {
  assert.equal(parseSchemas(core, { sub: "core/" }).entities.find((e) => e.id === "core/skill").path,
               "core/skill-schema.md");
  assert.equal(parseSchemas(core).entities.find((e) => e.id === "core/skill").path, "skill-schema.md");
});

test("the folder form names the entity by its folder and owns what nests inside it", () => {
  const { entities } = parseInstance(valid, { schemas });
  const mira = entities.find(e => e.name === "Mira Halvorsen");
  assert.equal(mira.id, "profiles/mira-halvorsen");
  assert.equal(mira.path, "profiles/mira-halvorsen/mira-halvorsen.md");
  const exp = entities.find(e => e.type === "experience");
  assert.equal(exp.owner, "profiles/mira-halvorsen");
  assert.equal(exp.id, "profiles/mira-halvorsen/experiences/2022-beacon-systems");
});

test("a table section is kept as rows, and its body text is empty", () => {
  const mira = parseInstance(valid, { schemas }).entities.find(e => e.name === "Mira Halvorsen");
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
  const { entities, edges } = parseInstance(files, { schemas });
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
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R11: `skills`/);
});

test("a frontmatter list that names entities becomes edges", () => {
  const { edges } = parseInstance(valid, { schemas });
  const e = edges.find(x => x.via === "skills");
  assert.deepEqual(e, {
    from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
    to: "skills/java-programming", via: "skills", attrs: {},
  });
});

test("a table row's declared reference is the edge; a qualifier resolves into its attrs", () => {
  const { edges } = parseInstance(valid, { schemas });
  const e = edges.find(x => x.via === "Skills.Skill");
  assert.deepEqual(e, {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "proficiency-levels/proficient", Evidence: "Owned the JVM services." },
  });
});

// A table draws edges only where its schema declares a reference column. A table of references
// to the outside world — a register entry, a recording — is declared with string columns and so
// draws nothing, whatever its cells say; its rows are kept as data. The case below and the one
// named "a table declaring no reference draws nothing even when a cell names an entity" test
// the two halves of that: this one that the rows survive, that one that no edge appears.
test("a table whose schema declares no reference is data, and keeps its rows", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## References\n\n" +
    "| What | URL |\n| --- | --- |\n| Commercial register entry | https://example.invalid/firm/1 |\n" +
    "| Recording | https://example.invalid/talk |\n");
  const { entities, edges } = parseInstance(files, { schemas });
  const exp = entities.find((e) => e.type === "experience");
  const refs = exp.sections.find((s) => s.heading === "References");
  assert.equal(refs.table.rows.length, 2);
  assert.equal(edges.filter((x) => x.from === exp.id && x.via.startsWith("References")).length, 0);
});

// The spec for `## Also at` (docs/superpowers/specs/2026-09-06-also-at-design.md) leans on
// the per-table rule above: a table of presences elsewhere resolves to nothing, so it is
// data on both types that carry it. Pinned here so a later change to the rule is a red test
// and not a surprise on the first instance that lists a GitHub account.
test("an Also at table on the identity and on a profile is data: rows kept, no edge", () => {
  const files = new Map(valid);
  files.set("identity.md",
    "# Beacon Systems\n\n> Billing software.\n\n## What it is\n\nOne product.\n\n## Also at\n\n" +
    "| Where | URL |\n| --- | --- |\n| GitHub | https://github.example.invalid/beacon-systems |\n");
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Summary\n\nEight years.\n\n## Also at\n\n" +
    "| Where | URL |\n| --- | --- |\n| GitHub | https://github.example.invalid/mira |\n" +
    "| LinkedIn | https://linkedin.example.invalid/in/mira |\n");
  const { entities, edges } = parseInstance(files, { schemas });
  for (const name of ["Beacon Systems", "Mira Halvorsen"]) {
    const e = entities.find((x) => x.name === name);
    const also = e.sections.find((s) => s.heading === "Also at");
    assert.deepEqual(also.table.columns, ["Where", "URL"]);
    assert.ok(also.table.rows.length >= 1, `${name} keeps its rows`);
    assert.equal(also.text, "");
    assert.equal(edges.filter((x) => x.from === e.id && x.via.startsWith("Also at")).length, 0, `${name} draws no edge for it`);
  }
});

test("a row whose reference column names nothing is an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming | Proficient | Owned it. |\n" +
    "| Jva Programming | Prficient | Nothing here resolves, so the row is an error. |\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Jva Programming" in .* names no skill/);
});

test("a name that resolves to nothing is an R4 error", () => {
  const broken = new Map(valid);
  broken.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills:\n  - Kotlin\n---\n\n# Splitting\n\n> x\n");
  assert.throws(() => parseInstance(broken, { schemas }), /^Error: R4: .*Kotlin/);
});

test("a root folder that is not a plural is an R7 error", () => {
  const broken = new Map(valid);
  broken.set("value/humility.md", "# Humility\n\n> x\n");
  assert.throws(() => parseInstance(broken, { schemas }), /^Error: R7: .*value/);
});

test("output is deterministic regardless of map order", () => {
  const shuffled = new Map([...valid.entries()].reverse());
  assert.deepEqual(parseInstance(shuffled, { schemas }), parseInstance(valid, { schemas }));
});

test("a declared reference becomes an edge; a string stays a fact", () => {
  const withSource = new Map(valid);
  withSource.set("sources/local.md", "# Local\n\n> Kept in this repository.\n");
  withSource.set("skills/java-programming.md", "---\nsource: Local\ngroup: Programming Languages\n---\n\n# Java Programming\n\n> JVM services.\n");
  const { edges, entities } = parseInstance(withSource, { schemas });
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
  const mira = parseInstance(valid, { schemas }).entities.find(e => e.name === "Mira Halvorsen");
  const skills = mira.sections.find(s => s.heading === "Skills");
  assert.equal(skills.tables.length, 1);
  assert.equal(skills.tables[0].caption, null);
  assert.equal(skills.table, skills.tables[0]);
});

// R2 says a reference is a type and a name, and the parser reads the type from the schema
// that declares the field. Without the schemas there is nothing to read it from, and a
// fallback to name-only resolution is the mode this parser no longer has.
test("an instance handed no schemas is an error, not a name-only fallback", () => {
  assert.throws(() => parseInstance(valid), /^Error: R16: .*schemas/);
});

test("a page whose type no schema declares is an error", () => {
  const files = new Map(valid);
  files.set("surfaces/site.md", "# Site\n\n> A place.\n\n## Rules\n\nText.\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R13: .*surface/);
});

// R16: a field typed anything but a reference draws no edge whatever it says. The profile's
// `location` is a string, so a skill that happens to be called Bergen draws nothing from it
// and the value is kept as written.
test("a string field carrying a canonical name draws nothing", () => {
  const files = new Map(valid);
  files.set("skills/bergen.md", "# Bergen\n\n> A skill named like a city.\n\n## In practice\n\nText.\n");
  const { edges, entities } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via === "location").length, 0);
  assert.equal(entities.find((e) => e.name === "Mira Halvorsen").fields.location, "Bergen");
});

// `ref? → identity` resolves against identities and nothing else. A value that names a profile
// and no identity is a fact, not an edge to the profile.
test("a ref? that names an entity of another type stays a fact", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\norganization: Mira Halvorsen\n---\n\n# Freelance\n\n> Ongoing.\n");
  const { edges, entities } = parseInstance(files, { schemas });
  const exp = entities.find((e) => e.type === "experience");
  assert.equal(edges.filter((x) => x.from === exp.id && x.via === "organization").length, 0);
  assert.equal(exp.fields.organization, "Mira Halvorsen");
});

// R4: a `ref → skill` that names a source and no skill is unresolvable, and the message names
// the type that was searched so the reader sees it is a type mismatch rather than a typo.
test("a ref that names an entity of another type is an R4 error naming the type searched", () => {
  const files = new Map(valid);
  files.set("sources/local.md", "# Local\n\n> Kept here.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\nskills:\n  - Local\n---\n\n# Splitting\n\n> x\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Local" in .* names no skill/);
});

// A body table draws from the column its schema declares as the reference, wherever that
// column stands. Here the qualifier comes first, and the edge still lands on the skill with
// the level in its attributes.
test("a table draws its edge from the declared reference column, not the first resolving cell", () => {
  const swapped = new Map(schemas);
  swapped.set("profile-schema.md", schema("profile", {
    fields: [["email", "string"], ["location", "string"]],
    tables: { Skills: [["Level", "qualifier → proficiency-level"], ["Skill", "ref → skill"], ["Evidence", "string"]] },
  }));
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Level | Skill | Evidence |\n| --- | --- | --- |\n| Proficient | Java Programming | Owned it. |\n");
  const { edges } = parseInstance(files, { schemas: swapped });
  assert.deepEqual(edges.find((x) => x.via === "Skills.Skill"), {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "proficiency-levels/proficient", Evidence: "Owned it." },
  });
});

// A table whose schema declares no reference is data even when a cell happens to match an H1.
test("a table declaring no reference draws nothing even when a cell names an entity", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Also at\n\n" +
    "| Where | URL |\n| --- | --- |\n| Java Programming | https://example.invalid/mira |\n");
  const { edges } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via.startsWith("Also at")).length, 0);
});

// A qualifier must resolve exactly as a reference must (R16), and its failure names its type.
test("a qualifier that names nothing of its type is an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming | Expert | Owned it. |\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "Expert" in .* names no proficiency-level/);
});

// R9 makes `qualifier → <type>` a column type only, and R16 makes a qualifier draw nothing.
// A schema that declares one in frontmatter is wrong, and the checker's business; what the
// parser owes is to keep R16 true for it: the value resolves, and no edge appears.
test("a qualifier declared in frontmatter resolves and draws no edge", () => {
  const withQualifier = new Map(schemas);
  withQualifier.set("skill-schema.md", schema("skill", {
    fields: [["source", "ref → source"], ["group", "string"], ["level", "qualifier → proficiency-level"]],
  }));
  const files = new Map(valid);
  files.set("skills/java-programming.md",
    "---\nlevel: Proficient\n---\n\n# Java Programming\n\n> JVM services.\n\n## In practice\n\nText.\n");
  const { edges } = parseInstance(files, { schemas: withQualifier });
  assert.equal(edges.filter((x) => x.via === "level").length, 0);
  files.set("skills/java-programming.md",
    "---\nlevel: Expert\n---\n\n# Java Programming\n\n> JVM services.\n\n## In practice\n\nText.\n");
  assert.throws(() => parseInstance(files, { schemas: withQualifier }), /^Error: R4: "Expert" in .* names no proficiency-level/);
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
  const data = parseInstance(files, { schemas });
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
  assert.throws(() => parseInstance(files, { schemas }), /R2: two skill entities share the name "Same Name"/);
});

// The parser reads the schema, so it resolves `organization` against identities and nothing
// else. The company of one is the case this exists for: the identity and the only profile
// carry the same name, and the experience draws its edge to the identity the schema named.
test("a reference resolves by its declared type when two types share the name", () => {
  const files = new Map([
    ["identity.md", "# Robert Blust\n\n> A company of one.\n\n## What it is\n\nOne person.\n"],
    ["profiles/robert-blust/robert-blust.md",
     "# Robert Blust\n\n> The person.\n\n## Summary\n\nText.\n"],
    ["profiles/robert-blust/experiences/2026-now.md",
     "---\nstart: 2026-06\norganization: Robert Blust\n---\n\n# Now\n\n> Ongoing.\n\n## Achievements\n\n- Text.\n"],
  ]);
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.filter((x) => x.via === "organization"), [{
    from: "profiles/robert-blust/experiences/2026-now", to: "identity", via: "organization", attrs: {},
  }]);
});

// R7 says a folder is the plural of its type, and the parser read that backwards by stripping
// the plural's last letter. `processes` is the case that breaks it: it is `process` plus `es`,
// while `phases` directly beneath it is `phase` plus `s`, and no suffix rule tells those two
// apart. The type a folder holds is declared — every schema's `## File Location` names it — so
// the parser reads the mapping rather than guessing at it.
test("a type whose folder is not its name plus one s still resolves", () => {
  const files = new Map([
    ["identity.md", "# Beacon Systems\n\n> Billing software.\n\n## What it is\n\nOne product.\n"],
    ["processes/delivery/delivery.md", "# Delivery\n\n> How work moves.\n\n## Tracks\n\nOne.\n"],
    ["processes/delivery/phases/shape.md", "# Shape\n\n> Classify it.\n\n## What it takes\n\nA request.\n"],
  ]);
  const only = new Map([
    ["identity-schema.md", schema("identity", { location: "identity.md" })],
    ["process-schema.md", schema("process", { location: "processes/<process>/<process>.md" })],
    ["phase-schema.md", schema("phase", { location: "processes/<process>/phases/*.md", owner: "process" })],
  ]);
  const { entities } = parseInstance(files, { schemas: only });
  assert.deepEqual(entities.map((e) => e.type).sort(), ["identity", "phase", "process"]);
});

// R9's grouped section. A `###` heading is not a field and not a table cell, so until a schema
// could declare one, a heading that named an entity drew nothing and R4 was not true of it. The
// declaration reads like a column's and the edge is named the same way — `<Section>.<Heading>`.
test("a `###` heading in a grouped section draws an edge via Section.Heading", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("achievement-kinds/results.md",
    "---\nrank: 40\n---\n\n# Results\n\n> What came of it.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting the billing domain\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Delivery\n\n- Split one service.\n\n### Results\n\n- The second team stopped waiting.\n");
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.filter((x) => x.via === "Achievements.Kind"), [
    { from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
      to: "achievement-kinds/delivery", via: "Achievements.Kind", attrs: {} },
    { from: "profiles/mira-halvorsen/experiences/2022-beacon-systems",
      to: "achievement-kinds/results", via: "Achievements.Kind", attrs: {} },
  ]);
});

// The headings stay in the text, unlike a caption, which is pulled out of it. A consumer that
// renders the section renders what the file says, and the edges are drawn beside it.
test("a grouped section keeps its headings in the text it hands on", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Delivery\n\n- Split one service.\n");
  const exp = parseInstance(files, { schemas }).entities.find((e) => e.type === "experience");
  const achievements = exp.sections.find((s) => s.heading === "Achievements");
  assert.equal(achievements.text, "### Delivery\n\n- Split one service.");
});

test("a heading that names nothing of its type is an R4 error", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Deliverly\n\n- Split one service.\n");
  assert.throws(() => parseInstance(files, { schemas }),
                /^Error: R4: "Deliverly" in .* names no achievement-kind/);
});

// The declaration is what makes a heading a reference, exactly as it is for a field and for a
// column: a `###` line in a section no schema declares grouped is prose with a hash in front.
test("a `###` heading in a section the schema does not group draws nothing", () => {
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Ending\n\n### Delivery\n\nText.\n");
  const { edges } = parseInstance(files, { schemas });
  assert.equal(edges.filter((x) => x.via.startsWith("Ending")).length, 0);
});

// The vocabulary graph draws a heading table's type the way it draws a column table's, so a
// reader of core sees that an experience points at an achievement kind.
test("a heading table's Type cell is an edge in the schema graph, via Section.Heading", () => {
  const withGrouped = new Map(core);
  withGrouped.set("achievement-kind-schema.md",
    "# Achievement Kind Schema\n\n> Kinds.\n\n## File Location\n\n`achievement-kinds/*.md`\n\n" +
    "## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `rank` | Yes | number | Position |\n\n## Sections\n\n| Section | Required | Description |\n" +
    "| --- | --- | --- |\n| `# [Label]` | Yes | Name |\n");
  withGrouped.set("experience-schema.md",
    withGrouped.get("experience-schema.md") +
    "| `## Achievements` | No | Grouped. What was accomplished. |\n\n" +
    "`## Achievements` is grouped under these headings:\n\n" +
    "| Heading | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `Kind` | No | ref → achievement-kind | The kind |\n");
  const { edges } = parseSchemas(withGrouped);
  assert.deepEqual(edges.find((x) => x.via === "Achievements.Kind"), {
    from: "core/experience", to: "core/achievement-kind", via: "Achievements.Kind",
    attrs: { type: "ref → achievement-kind" },
  });
});

// HEADING_CAPTION is exact and SECTION_CAPTION is loose on purpose, so a caption one word off
// the grouped form — "heading:" for "headings:" — fails the first match and falls to the
// second, which reads the block as if it declared columns. `colIdx` then names "Column", which
// this table does not have, and reading a row at a missing index used to be a bare
// `row[-1].replace`, a TypeError naming no path. The fix is a skip, not a read: this block
// draws no edge, and "schema fixed shape" (verify/check.mjs) is what tells the author the
// caption itself is wrong.
test("a caption one word off the grouped form is skipped, not read, and throws nothing", () => {
  const nearMiss = new Map(core);
  nearMiss.set("achievement-kind-schema.md",
    "# Achievement Kind Schema\n\n> Kinds.\n\n## File Location\n\n`achievement-kinds/*.md`\n\n" +
    "## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `rank` | Yes | number | Position |\n\n## Sections\n\n| Section | Required | Description |\n" +
    "| --- | --- | --- |\n| `# [Label]` | Yes | Name |\n");
  nearMiss.set("experience-schema.md",
    nearMiss.get("experience-schema.md") +
    "| `## Achievements` | No | Grouped. What was accomplished. |\n\n" +
    "`## Achievements` is grouped under these heading:\n\n" +
    "| Heading | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `Kind` | No | ref → achievement-kind | The kind |\n");
  assert.doesNotThrow(() => parseSchemas(nearMiss));
  const { edges } = parseSchemas(nearMiss);
  assert.equal(edges.find((x) => x.via === "Achievements.Kind"), undefined);
});

// R9 gives a heading table exactly one row; a second is malformed. Before this, `parseSchemas`
// read every row of it while `declarationsOf` — what an instance actually resolves against —
// read only the first, so a two-row table drew two edges in the vocabulary graph and declared
// one reference for the parser. Both readers of "how many rows" must agree.
test("a two-row heading table draws one edge in the schema graph, matching declarationsOf", () => {
  const twoRows = new Map(core);
  twoRows.set("achievement-kind-schema.md",
    "# Achievement Kind Schema\n\n> Kinds.\n\n## File Location\n\n`achievement-kinds/*.md`\n\n" +
    "## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `rank` | Yes | number | Position |\n\n## Sections\n\n| Section | Required | Description |\n" +
    "| --- | --- | --- |\n| `# [Label]` | Yes | Name |\n");
  twoRows.set("experience-schema.md",
    twoRows.get("experience-schema.md") +
    "| `## Achievements` | No | Grouped. What was accomplished. |\n\n" +
    "`## Achievements` is grouped under these headings:\n\n" +
    "| Heading | Required | Type | Description |\n| --- | --- | --- | --- |\n" +
    "| `Kind` | No | ref → achievement-kind | The kind |\n" +
    "| `Other` | No | ref → skill | A stray second row |\n");
  const { edges } = parseSchemas(twoRows);
  const fromAchievements = edges.filter(
    (x) => x.from === "core/experience" && x.via.startsWith("Achievements."),
  );
  assert.equal(fromAchievements.length, 1);
  assert.equal(fromAchievements[0].via, "Achievements.Kind");
});

// R16 makes a heading declared `ref → <type>` draw an edge (core 0.28.0), but a schema is prose
// an author can still mistype as `qualifier → <type>` — a form R16 also allows there, and one
// that resolves and draws nothing wherever it appears. The frontmatter walk above already
// guards on `decl.form !== "qualifier"`; the heading walk did not, and drew an edge a qualifier
// is never supposed to carry.
test("a heading declared qualifier resolves and draws no edge", () => {
  const qualifierSchemas = new Map(schemas);
  qualifierSchemas.set("experience-schema.md", schema("experience", {
    fields: [["start", "date"]],
    grouped: { Achievements: ["Kind", "qualifier → achievement-kind"] },
  }));
  const files = new Map(valid);
  files.set("achievement-kinds/delivery.md",
    "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n\n## What it means\n\nText.\n");
  files.set("profiles/mira-halvorsen/experiences/2022-beacon-systems.md",
    "---\nstart: 2022-02\n---\n\n# Splitting\n\n> Ongoing.\n\n## Achievements\n\n" +
    "### Delivery\n\n- Split one service.\n");
  const { edges } = parseInstance(files, { schemas: qualifierSchemas });
  assert.equal(edges.filter((x) => x.via === "Achievements.Kind").length, 0);
});

// Exported for a consumer that offers what a schema declares — an editor's completion — so that
// it reads a Type cell through the one reader and never through a copy of DECLARATION.
test("declarationOf is the one reader of a Type cell, and a consumer may call it", () => {
  assert.deepEqual(declarationOf("ref → source"), { form: "ref", target: "source" });
  assert.deepEqual(declarationOf("`array of ref → role`"), { form: "ref", target: "role" });
  assert.deepEqual(declarationOf("ref? → identity"), { form: "ref?", target: "identity" });
  assert.deepEqual(declarationOf("qualifier → proficiency-level"), { form: "qualifier", target: "proficiency-level" });
  assert.equal(declarationOf("string"), null);
  assert.equal(declarationOf(undefined), null);
});

// A cell with nothing in it names nothing, so there is nothing to resolve. Frontmatter has
// always read an empty field that way; a table row did not, and the first optional qualifier
// column in a schema — `Experience` on a profile's Evidence table — met R4 against an empty
// string. Requiredness is the checker's, which reads the schema's Required column; the parser
// owes only that a value it was given resolves.
test("a blank qualifier cell is not resolved, and keeps its empty value", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n| Java Programming |  | Owned it. |\n");
  const { edges } = parseInstance(files, { schemas });
  assert.deepEqual(edges.find((x) => x.via === "Skills.Skill"), {
    from: "profiles/mira-halvorsen", to: "skills/java-programming", via: "Skills.Skill",
    attrs: { Level: "", Evidence: "Owned it." },
  });
});

// The reference column is not softened with it. A row that names no skill is the R4 it always
// was, because moving that error out of the parser would buy nothing: the row draws no edge
// and the page has said a thing it cannot mean.
test("a blank reference cell is still an R4 error", () => {
  const files = new Map(valid);
  files.set("profiles/mira-halvorsen/mira-halvorsen.md",
    "---\nemail: mira@example.invalid\n---\n\n# Mira Halvorsen\n\n> Backend engineer.\n\n## Skills\n\n" +
    "| Skill | Level | Evidence |\n| --- | --- | --- |\n|  | Proficient | Owned it. |\n");
  assert.throws(() => parseInstance(files, { schemas }), /^Error: R4: "" in .* names no skill/);
});

// A process names its phases in a table whose column is declared `ref → phase`, where it used
// to link their files by path in a list nothing read. The column draws like any other declared
// reference, one edge per row, beside the ownership the nesting already gives; and the order,
// which an edge list sorted by name cannot carry, stays readable from the section's own rows.
test("a process's Phases table draws an edge to each phase it names, and keeps their order in its rows", () => {
  const files = new Map([
    ["identity.md", "# Beacon Systems\n\n> Billing software.\n"],
    ["processes/delivery/delivery.md", "# Delivery\n\n> How a change ships.\n\n## Phases\n\n| Phase |\n| --- |\n| Specify |\n| Build |\n"],
    ["processes/delivery/phases/specify.md", "---\ngate-to: Build\n---\n\n# Specify\n\n> First.\n"],
    ["processes/delivery/phases/build.md", "# Build\n\n> Second.\n"],
  ]);
  const schemas = new Map([
    ["identity-schema.md", schema("identity", { location: "identity.md" })],
    ["process-schema.md", schema("process", { tables: { Phases: [["Phase", "ref → phase"]] }, location: "processes/<process>/<process>.md" })],
    ["phase-schema.md", schema("phase", { fields: [["gate-to", "ref → phase"]], location: "processes/<process>/phases/*.md", owner: "process" })],
  ]);
  const graph = parseInstance(files, { schemas });
  const drawn = graph.edges.filter((e) => e.via === "Phases.Phase").map((e) => [e.from, e.to]);
  assert.deepEqual(drawn, [
    ["processes/delivery", "processes/delivery/phases/build"],
    ["processes/delivery", "processes/delivery/phases/specify"],
  ]);
  const rows = graph.entities.find((e) => e.id === "processes/delivery").sections.find((s) => s.heading === "Phases").table.rows;
  assert.deepEqual(rows, [["Specify"], ["Build"]]);
});

test("a Phases row that names no phase is an R4, as any declared reference is", () => {
  const files = new Map([
    ["identity.md", "# Beacon Systems\n\n> Billing software.\n"],
    ["processes/delivery/delivery.md", "# Delivery\n\n> How a change ships.\n\n## Phases\n\n| Phase |\n| --- |\n| Specfy |\n"],
    ["processes/delivery/phases/specify.md", "# Specify\n\n> First.\n"],
  ]);
  const schemas = new Map([
    ["identity-schema.md", schema("identity", { location: "identity.md" })],
    ["process-schema.md", schema("process", { tables: { Phases: [["Phase", "ref → phase"]] }, location: "processes/<process>/<process>.md" })],
    ["phase-schema.md", schema("phase", { location: "processes/<process>/phases/*.md", owner: "process" })],
  ]);
  assert.throws(() => parseInstance(files, { schemas }), /R4: "Specfy"/);
});

test("a Type cell reading `ref → by <Column> in <Owner>` is a reference whose type is its row's", () => {
  assert.deepEqual(declarationOf("ref → by Type in Owner"), { form: "ref", target: null, by: "Type", in: "Owner" });
  assert.deepEqual(declarationOf("`ref → by Type`"), { form: "ref", target: null, by: "Type", in: null });
  // Every other form keeps the shape it had, so nothing reading `{ form, target }` changes.
  assert.deepEqual(declarationOf("ref → skill"), { form: "ref", target: "skill" });
  assert.deepEqual(declarationOf("qualifier → proficiency-level"), { form: "qualifier", target: "proficiency-level" });
});

test("a schema declaring a `by` column is read, and the vocabulary graph draws no type edge for it", () => {
  const files = new Map([
    ["value-schema.md", schema("value")],
    ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"], ["For", "string"]] } })],
  ]);
  const { edges } = parseSchemas(files);
  assert.deepEqual(edges.filter((e) => e.from === "core/question"), []);
});

test("constraints name a `by` reference by its columns and no target", () => {
  const files = new Map([
    ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"]] } })],
  ]);
  const ref = constraintsOf(files).question.references.find((r) => r.via === "Rests on.Entity");
  assert.equal(ref.target, null);
  assert.equal(ref.by, "Type");
  assert.equal(ref.in, "Owner");
  assert.equal(ref.form, "ref");
});

// A name of an owned type identifies an entity within its owner (R2), and a reference to one is
// resolved within the owner it is written in (R4). Every reference core makes to an owned type is
// written inside that owner, so the scope is known from where a name is written and never
// guessed. Two processes may each have a phase called Review, and two people periods of one title.
const scoped = () => new Map([
  ["identity-schema.md", schema("identity", { location: "identity.md" })],
  ["process-schema.md", schema("process", { tables: { Phases: [["Phase", "ref → phase"]] }, location: "processes/<process>/<process>.md" })],
  ["phase-schema.md", schema("phase", { fields: [["gate-to", "ref → phase"]], location: "processes/<process>/phases/*.md", owner: "process" })],
]);
const twoProcesses = (extra = []) => new Map([
  ["identity.md", "# Beacon Systems\n\n> Billing software.\n"],
  ["processes/delivery/delivery.md", "# Delivery\n\n> Ships.\n\n## Phases\n\n| Phase |\n| --- |\n| Build |\n| Review |\n"],
  ["processes/delivery/phases/build.md", "---\ngate-to: Review\n---\n\n# Build\n\n> First.\n"],
  ["processes/delivery/phases/review.md", "# Review\n\n> Second.\n"],
  ["processes/hiring/hiring.md", "# Hiring\n\n> Hires.\n\n## Phases\n\n| Phase |\n| --- |\n| Screen |\n| Review |\n"],
  ["processes/hiring/phases/screen.md", "---\ngate-to: Review\n---\n\n# Screen\n\n> First.\n"],
  ["processes/hiring/phases/review.md", "# Review\n\n> Second.\n"],
  ...extra,
]);

test("two owners may each own an entity of one name, and each reference lands on its own owner's", () => {
  const graph = parseInstance(twoProcesses(), { schemas: scoped() });
  const edge = (from, via) => graph.edges.filter((e) => e.from === from && e.via === via).map((e) => e.to).sort();
  assert.deepEqual(edge("processes/delivery", "Phases.Phase"), ["processes/delivery/phases/build", "processes/delivery/phases/review"]);
  assert.deepEqual(edge("processes/hiring", "Phases.Phase"), ["processes/hiring/phases/review", "processes/hiring/phases/screen"]);
  assert.deepEqual(edge("processes/delivery/phases/build", "gate-to"), ["processes/delivery/phases/review"]);
  assert.deepEqual(edge("processes/hiring/phases/screen", "gate-to"), ["processes/hiring/phases/review"]);
});

test("two entities of one name within one owner are still the R2 they always were", () => {
  const files = twoProcesses([["processes/delivery/phases/review-again.md", "# Review\n\n> Again.\n"]]);
  assert.throws(() => parseInstance(files, { schemas: scoped() }), /R2: two phase entities share the name "Review" in processes\/delivery/);
});

test("a name that is only another owner's is unresolvable from here, and the error says where it looked", () => {
  const files = twoProcesses();
  files.set("processes/delivery/phases/build.md", "---\ngate-to: Screen\n---\n\n# Build\n\n> First.\n");
  assert.throws(() => parseInstance(files, { schemas: scoped() }), /R4: "Screen" .* names no phase of processes\/delivery/);
});

test("a reference to an owned type written outside every owner of it names nothing", () => {
  const schemas = scoped();
  schemas.set("skill-schema.md", schema("skill", { fields: [["first-used", "ref → phase"]] }));
  const files = twoProcesses([["skills/java.md", "---\nfirst-used: Build\n---\n\n# Java\n\n> A language.\n"]]);
  assert.throws(() => parseInstance(files, { schemas }), /R4: "Build" .* names no phase: phase entities are named only within the process that owns them/);
});

// Review found that the parser took an owned type's owner from whichever file it read last, so
// one stray phase under a profile, read after the processes, made every correct process refuse.
// The owner is the schema's `**Owner:**` line (R10), and an entity of an owned type that sits in
// no owner of that type is an R5 error naming it, not a reason to read the others wrongly.
test("ownership comes from the schema, and a stray owned entity is named, not the correct ones", () => {
  const schemas = scoped();
  schemas.set("profile-schema.md", schema("profile", { location: "profiles/<profile>/<profile>.md" }));
  const files = twoProcesses([
    ["profiles/mira/mira.md", "# Mira\n\n> A person.\n"],
    ["profiles/mira/phases/stray.md", "# Stray\n\n> Lost.\n"],
  ]);
  assert.throws(() => parseInstance(files, { schemas }), /R5: profiles\/mira\/phases\/stray.md is a phase, and a phase is owned by a process; it sits in no process/);
});

// A track is a second type a process owns, and a phase's `### [Track]` heading is a declared
// reference to it. The parser was not changed for it: a type is read from its schema's File
// Location, an owned name resolves within the owner the referring entity is or is owned by, and a
// grouped heading draws an edge. These pin that, since nothing else would notice it going.
const tracking = () => new Map([
  ["identity-schema.md", schema("identity", { location: "identity.md" })],
  ["process-schema.md", schema("process", { tables: { Tracks: [["Track", "ref → track"]], Phases: [["Phase", "ref → phase"]] }, location: "processes/<process>/<process>.md" })],
  ["track-schema.md", schema("track", { location: "processes/<process>/tracks/*.md", owner: "process" })],
  ["phase-schema.md", schema("phase", { grouped: { Activities: ["Track", "ref → track"] }, location: "processes/<process>/phases/*.md", owner: "process" })],
]);
const twoTracked = (extra = []) => new Map([
  ["identity.md", "# Beacon Systems\n\n> Billing software.\n"],
  ["processes/delivery/delivery.md", "# Delivery\n\n> Ships.\n\n## Tracks\n\n| Track |\n| --- |\n| Code |\n| Docs |\n\n## Phases\n\n| Phase |\n| --- |\n| Build |\n"],
  ["processes/delivery/tracks/code.md", "# Code\n\n> A merged change.\n"],
  ["processes/delivery/tracks/docs.md", "# Docs\n\n> A published page.\n"],
  ["processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n### Code\n\n1. Write it.\n\n### Docs\n\n1. Draft it.\n"],
  ["processes/hiring/hiring.md", "# Hiring\n\n> Hires.\n\n## Tracks\n\n| Track |\n| --- |\n| Code |\n\n## Phases\n\n| Phase |\n| --- |\n| Screen |\n"],
  ["processes/hiring/tracks/code.md", "# Code\n\n> A reviewed exercise.\n"],
  ["processes/hiring/phases/screen.md", "# Screen\n\n> First.\n\n## Activities\n\n### Code\n\n1. Read it.\n"],
  ...extra,
]);

test("a track is an entity its process owns, named by its table and by a phase's headings", () => {
  const graph = parseInstance(twoTracked(), { schemas: tracking() });
  const code = graph.entities.find((e) => e.id === "processes/delivery/tracks/code");
  assert.equal(code.type, "track");
  assert.equal(code.owner, "processes/delivery");
  const edge = (from, via) => graph.edges.filter((e) => e.from === from && e.via === via).map((e) => e.to).sort();
  assert.deepEqual(edge("processes/delivery", "Tracks.Track"), ["processes/delivery/tracks/code", "processes/delivery/tracks/docs"]);
  assert.deepEqual(edge("processes/delivery/phases/build", "Activities.Track"), ["processes/delivery/tracks/code", "processes/delivery/tracks/docs"]);
});

test("two processes may each have a track of one name, and a phase's heading finds its own process's", () => {
  const graph = parseInstance(twoTracked(), { schemas: tracking() });
  const to = graph.edges.filter((e) => e.from === "processes/hiring/phases/screen" && e.via === "Activities.Track").map((e) => e.to);
  assert.deepEqual(to, ["processes/hiring/tracks/code"]);
});

test("a phase heading that names no track of its own process is an R4 that says where it looked", () => {
  const files = twoTracked();
  files.set("processes/hiring/phases/screen.md", "# Screen\n\n> First.\n\n## Activities\n\n### Docs\n\n1. Read it.\n");
  assert.throws(() => parseInstance(files, { schemas: tracking() }), /R4: "Docs" in .*screen\.md "## Activities" names no track of processes\/hiring/);
});

// A question's rows name entities of any type, the type read from the row and, where the type
// is owned, the owner too (R4, R9). The fixtures reuse `valid` and `schemas` above.
const questionSchemas = new Map([...schemas,
  ["question-schema.md", schema("question", { tables: { "Rests on": [["Type", "string"], ["Entity", "ref → by Type in Owner"], ["Owner", "string"], ["For", "string"]] } })]]);
const question = (rows) => ["# Who splits the billing domain?", "", "> Look at the period and the value behind it.", "",
  ...(rows ? ["## Rests on", "", "| Type | Entity | Owner | For |", "| --- | --- | --- | --- |", ...rows.map((r) => `| ${r.join(" | ")} |`), ""] : [])].join("\n");
const withQuestion = (rows) => new Map([...valid, ["questions/who-splits-billing.md", question(rows)]]);

test("a row typed by its own cells draws its edge, within the owner it names", () => {
  const { edges } = parseInstance(withQuestion([
    ["value", "Craftsmanship", "", "why"],
    ["`experience`", "Splitting the billing domain", "Mira Halvorsen", "the period"],
  ]), { schemas: questionSchemas });
  const drawn = edges.filter((e) => e.via === "Rests on.Entity");
  assert.deepEqual(drawn.map((e) => e.to).sort(), ["profiles/mira-halvorsen/experiences/2022-beacon-systems", "values/craftsmanship"]);
  const period = drawn.find((e) => e.to.startsWith("profiles/"));
  assert.equal(period.from, "questions/who-splits-billing");
  assert.equal(period.attrs.Owner, "Mira Halvorsen");
  assert.equal(period.attrs.For, "the period");
});

test("a question with no Rests on draws nothing and reads", () => {
  const { entities, edges } = parseInstance(withQuestion(null), { schemas: questionSchemas });
  assert.ok(entities.some((e) => e.id === "questions/who-splits-billing"));
  assert.deepEqual(edges.filter((e) => e.from === "questions/who-splits-billing"), []);
});

test("a type cell naming no type is R4", () => {
  assert.throws(() => parseInstance(withQuestion([["valu", "Craftsmanship", "", ""]]), { schemas: questionSchemas }), /R4: .*"valu", which no schema declares/);
});

test("an owned type with no owner cell is R4, naming the owner type", () => {
  assert.throws(() => parseInstance(withQuestion([["experience", "Splitting the billing domain", "", ""]]), { schemas: questionSchemas }), /R4: .*which a profile owns, and the row names no profile/);
});

test("an unowned type with an owner cell is R4", () => {
  assert.throws(() => parseInstance(withQuestion([["value", "Craftsmanship", "Mira Halvorsen", ""]]), { schemas: questionSchemas }), /R4: .*nothing owns/);
});

test("an owned name is looked for only within the owner the row names", () => {
  const files = withQuestion([["experience", "Splitting the billing domain", "Tomas Reyes", ""]]);
  files.set("profiles/tomas-reyes/tomas-reyes.md", "# Tomas Reyes\n\n> Designer.\n");
  assert.throws(() => parseInstance(files, { schemas: questionSchemas }), /R4: "Splitting the billing domain" .*names no experience of profiles\/tomas-reyes/);
});
