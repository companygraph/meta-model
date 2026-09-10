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
import { checkInstance } from "../lib/checks.mjs";

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
