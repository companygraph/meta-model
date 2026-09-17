// The checks an instance runs, fed fixture maps the way the parser's tests are fed. What is
// asserted here is what `example/` cannot assert: `example/` was written to pass these checks,
// so it proves they do not fire falsely and proves nothing about what they catch. Every case
// below is a tree that must fail, or a shape a real instance has and the example does not.
//
// The fixtures are minimal rather than complete: a case asserts that its failure is among the
// failures, never that it is the only one, so a fixture carries the files its own case needs
// and no scaffolding to keep the other checks quiet.
import test from "node:test";
import assert from "node:assert/strict";
import { blocksOf, checkInstance, isNewer } from "../lib/checks.mjs";

// A schema in the fixed shape R9 states, with only the rows a case needs.
const schema = (type, rows, { owner = null } = {}) =>
  [
    `# ${type[0].toUpperCase()}${type.slice(1)} Schema`,
    "",
    `> A ${type}.`,
    "",
    ...(owner ? [`**Owner:** ${owner}`, ""] : []),
    "## File Location",
    "",
    `\`${type}s/\``,
    "",
    "## Frontmatter",
    "",
    "| Field | Required | Type | Description |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Sections",
    "",
    "| Section | Required | Description |",
    "| --- | --- | --- |",
    "",
  ].join("\n");

const EXPERIENCE_SCHEMA = schema("experience", [
  "| `source` | Yes | ref → source | Where it came from. |",
  "| `organization` | No | ref? → identity | Where the period was spent. |",
]);

const IDENTITY_SCHEMA = schema("identity", []);

test("a reference lands on the type its schema declares, not on any entity of that name", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", EXPERIENCE_SCHEMA],
    ["meta/core/identity-schema.md", IDENTITY_SCHEMA],
    ["model/identity.md", "# Robert Blust\n\n> A person.\n"],
    [
      "model/profiles/robert-blust/experiences/2019-aroov-realestate.md",
      "---\norganization: Aroov\n---\n\n# Aroov\n\n> A rental platform.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2019-aroov-realestate.md"));
  assert.ok(hit, `no failure named the file; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /organization/);
  assert.match(hit, /identity/);
  assert.match(hit, /experience/);
});

test("a value that resolves to the declared type is not a failure", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", EXPERIENCE_SCHEMA],
    ["meta/core/identity-schema.md", IDENTITY_SCHEMA],
    ["model/identity.md", "# Robert Blust\n\n> A person.\n"],
    [
      "model/profiles/robert-blust/experiences/2015-3ap.md",
      "---\norganization: Robert Blust\n---\n\n# Co-Founder\n\n> A period.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(
    failures.filter((f) => f.includes("organization")),
    [],
  );
});

// R6: a README is never an entity. The example keeps one only at the container root and the
// reference instance keeps one in every type folder, so this shape reached these checks for the
// first time when they were pointed at a real tree — and every check that reads a file by its
// folder asked a README for the frontmatter of the type it sits among.
test("a README in a type folder is not an entity", () => {
  const files = new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"])],
    ["model/skills/README.md", "# Skills\n\n> What sits here.\n"],
    ["model/skills/java.md", "---\nsource: Local\n---\n\n# Java\n\n> A language.\n"],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("README")), []);
});

test("a README beside a folder entity is not a folder entity", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", schema("profile", [])],
    ["model/profiles/README.md", "# Profiles\n\n> The people.\n"],
    ["model/profiles/robert-blust/robert-blust.md", "# Robert Blust\n\n> A person.\n"],
    ["model/profiles/robert-blust/experiences/2015-3ap.md", "# Co-Founder\n\n> A period.\n"],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("README")), []);
});

// The spec's skew contract, in the one shape it takes today. An instance sits on the core it
// vendored, and a core older than a type carries no schema for it — so every check that reads
// that schema asks an empty table and passes on nothing at all. A vacuous pass is the dangerous
// direction, so what the core does not carry is named and the report says it was not checked.
test("a type the vendored core does not carry is named, not passed over in silence", () => {
  const files = new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"])],
    ["model/skills/java.md", "---\nsource: Local\n---\n\n# Java\n\n> A language.\n"],
  ]);

  const { skipped } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.ok(skipped.includes("surface"), `surface was not named as skipped; got: ${skipped.join(", ")}`);
  assert.ok(!skipped.includes("skill"), "skill has a schema here and must not be named as skipped");
});

// The only arithmetic in the checker's guards, and the one place a plain string compare would
// be silently wrong. 0.9.0 against 0.10.0 is the pair this project reaches next.
test("isNewer compares releases as releases, not as strings", () => {
  assert.equal(isNewer("0.21.0", "0.20.0"), true);
  assert.equal(isNewer("0.10.0", "0.9.0"), true);
  assert.equal(isNewer("0.9.0", "0.10.0"), false);
  assert.equal(isNewer("1.0.0", "0.99.99"), true);
  assert.equal(isNewer("0.21.0", "0.21.0"), false);
  assert.equal(isNewer("0.20.0", "0.21.0"), false);
});

// R8: an enum lists its values at the front of its Description, in backticks, and a written
// value is one of them. The first enum in core is profile's `nature`, so the fixture is a
// profile; the type folder form comes from TYPES, not from the fixture schema's File Location.
const PROFILE_SCHEMA = schema("profile", [
  "| `source` | Yes | ref → source | Where it came from. |",
  "| `nature` | Yes | enum | `human` or `agent`. What holds this profile. |",
]);

test("an enum value outside the listed tokens is an R8 failure naming the field", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", PROFILE_SCHEMA],
    ["model/profiles/mira/mira.md", "---\nsource: Local\nnature: robot\n---\n\n# Mira\n\n> A person.\n"],
  ]);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  const hit = failures.find((f) => f.includes("mira.md") && f.includes("nature"));
  assert.ok(hit, `no failure named the field; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /robot/);
  assert.match(hit, /human/);
  assert.match(hit, /agent/);
});

test("an enum value among the listed tokens is not a failure", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", PROFILE_SCHEMA],
    ["model/profiles/mira/mira.md", "---\nsource: Local\nnature: agent\n---\n\n# Mira\n\n> An agent.\n"],
  ]);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  assert.deepEqual(failures.filter((f) => f.includes("nature")), []);
});

test("an enum whose Description opens with prose lists nothing, and that is the schema's failure", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", schema("profile", [
      "| `nature` | Yes | enum | What holds this profile: human or agent. |",
    ])],
    ["model/profiles/mira/mira.md", "---\nnature: human\n---\n\n# Mira\n\n> A person.\n"],
  ]);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  const hit = failures.find((f) => f.includes("profile-schema.md") && f.includes("nature"));
  assert.ok(hit, `no failure named the schema; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /R8/);
});

test("an enum list broken by an unlisted separator fails at the schema, not at the page", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", schema("profile", [
      "| `nature` | Yes | enum | `human` and `agent`. What holds this profile. |",
    ])],
    ["model/profiles/mira/mira.md", "---\nnature: agent\n---\n\n# Mira\n\n> An agent.\n"],
  ]);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  assert.ok(failures.find((f) => f.includes("profile-schema.md") && f.includes("nature") && f.includes("R8")), `no schema failure; got: ${failures.join(" | ") || "none"}`);
  assert.deepEqual(failures.filter((f) => f.includes("mira.md") && f.includes("nature")), []);
});

test("a missing enum field is named with its permitted values", () => {
  const files = new Map([
    ["meta/core/profile-schema.md", schema("profile", [
      "| `nature` | Yes | enum | `human` or `agent`. What holds this profile. |",
    ])],
    ["model/profiles/mira/mira.md", "---\nsource: Local\n---\n\n# Mira\n\n> A profile.\n"],
  ]);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  const hit = failures.find((f) => f.includes("mira.md") && f.includes("nature"));
  assert.ok(hit, `no failure named the field; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /human/);
  assert.match(hit, /agent/);
});

test("a required list field with no items fails, and one with an item passes", () => {
  const PHASE_SCHEMA = schema("phase", [
    "| `gate-approvers` | Yes | array of ref → role | Who approves. |",
  ]);
  const ROLE_SCHEMA = schema("role", []);
  const files = new Map([
    ["core/phase-schema.md", PHASE_SCHEMA],
    ["core/role-schema.md", ROLE_SCHEMA],
    ["model/roles/owner.md", "# Owner\n"],
    ["model/processes/delivery/phases/empty.md", "---\ngate-approvers:\n---\n\n# Empty\n"],
    ["model/processes/delivery/phases/empty-flow.md", "---\ngate-approvers: []\n---\n\n# Empty Flow\n"],
    ["model/processes/delivery/phases/filled.md", "---\ngate-approvers:\n  - Owner\n---\n\n# Filled\n"],
  ]);
  const { failures } = checkInstance(files);
  assert.ok(
    failures.some((f) => f.includes("model/processes/delivery/phases/empty.md") && f.includes("gate-approvers")),
    `expected a failure for the empty list, got:\n${failures.join("\n")}`,
  );
  assert.ok(
    failures.some((f) => f.includes("model/processes/delivery/phases/empty-flow.md") && f.includes("gate-approvers")),
    `expected a failure for the empty flow sequence, got:\n${failures.join("\n")}`,
  );
  assert.ok(
    !failures.some((f) => f.includes("model/processes/delivery/phases/filled.md") && f.includes("carries no items")),
    `expected no empty-list failure for the filled list, got:\n${failures.join("\n")}`,
  );
});

test("an optional list field with no items is not held to the rule", () => {
  const ROLE_SCHEMA = schema("role", [
    "| `requires` | No | array of ref → skill | The skills the seat needs. |",
  ]);
  const files = new Map([
    ["core/role-schema.md", ROLE_SCHEMA],
    ["model/roles/owner.md", "---\nrequires:\n---\n\n# Owner\n"],
  ]);
  const { failures } = checkInstance(files);
  assert.ok(
    !failures.some((f) => f.includes("carries no items")),
    `expected no failure for an optional empty list, got:\n${failures.join("\n")}`,
  );
});

// R9 fixes two captions under "## Sections" and both open by naming a section in backticks, so
// what tells them apart is their words: a column table declares what a body table's columns
// are, a heading table what the `###` headings under one section name. Reading a heading table
// as an uncaptioned block is what the loose match would do, and that block is an error.
test("a heading table is addressed by its own caption, apart from the column tables", () => {
  const body = [
    "| Section | Required | Description |",
    "| --- | --- | --- |",
    "| `## Achievements` | No | Grouped. What was accomplished. |",
    "",
    "`## Achievements` is grouped under these headings:",
    "",
    "| Heading | Required | Type | Description |",
    "| --- | --- | --- | --- |",
    "| `Kind` | No | ref → achievement-kind | The kind. |",
  ].join("\n");
  const blocks = blocksOf(body);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].section, null);
  assert.equal(blocks[0].grouped, null);
  assert.equal(blocks[1].section, null, "a heading table is not a column table");
  assert.equal(blocks[1].grouped, "Achievements");
  assert.deepEqual(blocks[1].table.columns, ["Heading", "Required", "Type", "Description"]);
});
