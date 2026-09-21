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
import { blocksOf, checkInstance, enumTokensOf, isNewer, sectionsOf } from "../lib/checks.mjs";

// A schema in the fixed shape R9 states, with only the rows a case needs. `grouped` adds R9's
// third declared shape: a section marked "Grouped." and the heading table that says what its
// `###` headings name. `sections` adds rows to the sections table as written.
const schema = (type, rows, { owner = null, grouped = null, sections = [] } = {}) =>
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
    ...sections,
    ...(grouped
      ? [
          `| \`## ${grouped.section}\` | No | Grouped. What was accomplished. |`,
          "",
          `\`## ${grouped.section}\` is grouped under these headings:`,
          "",
          "| Heading | Required | Type | Description |",
          "| --- | --- | --- | --- |",
          `| \`${grouped.heading}\` | No | ${grouped.type} | The kind. |`,
        ]
      : []),
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

test("a column typed enum is held to the values its schema lists", () => {
  const files = new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"], {
      sections: [
        "| `## Facts` | No | Table. What this states. |",
        "",
        "`## Facts` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Claim` | Yes | string | The claim |",
        "| `Confidence` | Yes | enum | `high` or `low`. How sure. |",
      ],
    })],
    ["model/skills/java.md", [
      "---", "source: Local", "---", "", "# Java", "", "> A language.", "",
      "## Facts", "",
      "| Claim | Confidence |", "| --- | --- |", "| It compiles | maybe |",
    ].join("\n")],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.ok(
    failures.some((f) => f.includes("Confidence") && f.includes("maybe") && f.includes("R8")),
    `expected a column enum failure, got: ${failures.join(" | ")}`,
  );
});

test("a column enum with no readable list fails once at the schema, not once per row", () => {
  const files = new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"], {
      sections: [
        "| `## Facts` | No | Table. What this states. |",
        "",
        "`## Facts` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Claim` | Yes | string | The claim |",
        "| `Confidence` | Yes | enum | How sure this is. |",
      ],
    })],
    ["model/skills/java.md", [
      "---", "source: Local", "---", "", "# Java", "", "> A language.", "",
      "## Facts", "",
      "| Claim | Confidence |", "| --- | --- |",
      "| It compiles | high |",
      "| It runs | low |",
    ].join("\n")],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hits = failures.filter(
    (f) => f.includes("skill-schema.md") && f.includes("Confidence") && f.includes("no readable list"),
  );
  assert.equal(hits.length, 1, `expected exactly one schema failure, got: ${failures.join(" | ")}`);
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

// The grouped section, from the checks' side. The parser refuses a heading that resolves to
// nothing; what a check can add is the order the headings take and whether any bullet stands
// outside them, which is the half of the schema's writing rules a machine can read. Whether a
// bullet sits under the right kind is a reading, and stays the agent pass's.
const GROUPED_EXPERIENCE_SCHEMA = schema("experience", [], {
  owner: "profile",
  grouped: { section: "Achievements", heading: "Kind", type: "ref → achievement-kind" },
});

const ACHIEVEMENT_KIND_SCHEMA = schema("achievement-kind", [
  "| `rank` | Yes | number | Position within an entry. |",
]);

const KIND_FILES = [
  ["model/achievement-kinds/delivery.md", "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n"],
  ["model/achievement-kinds/results.md", "---\nrank: 40\n---\n\n# Results\n\n> What came of it.\n"],
];

test("headings out of rank order are a failure naming both of them", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Results\n\n- What came of it.\n\n### Delivery\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /Delivery/);
  assert.match(hit, /Results/);
  assert.match(hit, /rank/);
});

test("headings in rank order are not a failure", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Delivery\n\n- What was built.\n\n### Results\n\n- What came of it.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("Achievements")), []);
});

test("a bullet before the first heading is a failure where the instance holds a kind", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- A bullet outside every heading.\n\n### Delivery\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /an item before its first/);
});

// An instance that defines no kinds writes a flat list, and the schema says so: `Required` is
// `No` precisely because the headings exist only where the kinds do.
test("a flat list is not a failure where the instance defines no kinds", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- One bullet.\n- Another.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("Achievements")), []);
});

// R16 makes a heading a declared reference, so the checker says what the parser throws on
// rather than reporting green over a file the parser refuses to read.
test("a heading that names nothing of its type is a failure naming the type", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Deliverly\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Deliverly"));
  assert.ok(hit, `no failure named the heading; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /achievement-kind/);
  assert.match(hit, /R16/);
});

// A tie in rank and the same heading twice used to fall through the same `<=` and be reported
// as an order that reversing two headings would fix — which is true of neither: nothing to
// reverse two headings into when they are the same heading, and no side to put a shared rank on
// either. Each gets its own message instead.
test("headings tied at the same rank are a failure naming the tie, not a reversal to make", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ["model/achievement-kinds/delivery.md", "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n"],
    ["model/achievement-kinds/sharing.md", "---\nrank: 20\n---\n\n# Sharing\n\n> What was shared.\n"],
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Delivery\n\n- What was built.\n\n### Sharing\n\n- What was shared.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /Delivery/);
  assert.match(hit, /Sharing/);
  assert.match(hit, /share a rank/);
  assert.doesNotMatch(hit, /\bafter\b/);
});

test("the same heading twice is a failure naming the duplicate, not a reversal to make", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n### Delivery\n\n- What was built.\n\n### Delivery\n\n- More.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /"### Delivery" twice/);
  assert.doesNotMatch(hit, /\bafter\b/);
});

// R9's writing rule that a ranked type never shares a rank had no check at all — the rank-order
// check above only reads a rank once it is already on a heading, so two achievement kinds
// sharing one passed it in silence as long as no entry's headings put them side by side. This
// check is generic over any type whose schema declares a `number` field named `rank`, not
// hardcoded to achievement-kind.
test("two entities of a ranked type sharing a rank is a failure naming both", () => {
  const files = new Map([
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ["model/achievement-kinds/delivery.md", "---\nrank: 20\n---\n\n# Delivery\n\n> What was built.\n"],
    ["model/achievement-kinds/sharing.md", "---\nrank: 20\n---\n\n# Sharing\n\n> What was shared.\n"],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("share rank"));
  assert.ok(hit, `no failure named the rank collision; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /Delivery/);
  assert.match(hit, /Sharing/);
});

test("two entities of a ranked type with distinct ranks are not a failure", () => {
  const files = new Map([
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("share rank")), []);
});

test("two entities of an unranked type sharing a name are not held to a rank rule that does not apply", () => {
  // proficiency-level carries no `rank` in this fixture, so the check has nothing to key on —
  // it must pass over the type rather than reading a field its schema never declared.
  const files = new Map([
    ["meta/core/proficiency-level-schema.md", schema("proficiency-level", [])],
    ["model/proficiency-levels/proficient.md", "# Proficient\n\n> Exercises judgment.\n"],
    ["model/proficiency-levels/expert.md", "# Expert\n\n> Sets the standard.\n"],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.deepEqual(failures.filter((f) => f.includes("share rank")), []);
});

// The message used to read "has a bullet before its first `###` heading" even when a section
// carried no heading at all, and "holds a achievement-kind" regardless of the type's first
// letter. Both are fixed generically: the wording depends on whether a heading exists anywhere
// in the section, and the article is chosen from the type name rather than fixed.
test("a bullet before a later heading names the type with the right article", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- A bullet outside every heading.\n\n### Delivery\n\n- What was built.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /before its first `###` heading/);
  assert.match(hit, /an achievement-kind/);
  assert.doesNotMatch(hit, /\ba achievement-kind\b/);
});

test("a section with a bullet and no heading at all names the absence, not a heading it does not have", () => {
  const files = new Map([
    ["meta/core/experience-schema.md", GROUPED_EXPERIENCE_SCHEMA],
    ["meta/core/achievement-kind-schema.md", ACHIEVEMENT_KIND_SCHEMA],
    ...KIND_FILES,
    [
      "model/profiles/mira/experiences/2022-beacon.md",
      "# Splitting\n\n> Ongoing.\n\n## Achievements\n\n- One bullet.\n- Another.\n",
    ],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  const hit = failures.find((f) => f.includes("2022-beacon.md") && f.includes("Achievements"));
  assert.ok(hit, `no failure named the entry; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /no `###` heading at all/);
  assert.doesNotMatch(hit, /before its first/);
});

// Exported for the same consumer: the values an enum permits are read from its Description by
// this function in the R8 check, and an editor that offered a list read any other way would
// offer a value the check then refuses.
test("enumTokensOf reads the run of backticked values a Description opens with", () => {
  assert.deepEqual(enumTokensOf("`human` or `agent`. What holds this profile."), ["human", "agent"]);
  assert.deepEqual(enumTokensOf("`a`, `b`, or `c`"), ["a", "b", "c"]);
  assert.deepEqual(enumTokensOf("One of several kinds."), []);
});

// An owner that lists what it owns. A process's `## Phases` was an ordered list of links by
// file path, which no check read: the names in it could rot, a phase could be left out, and
// the order it stated could disagree with the `gate-to` chain that states it a second time.
// As a table whose column is declared `ref → phase` the names are held by R16 like any other
// reference, and what is left for a check of its own is what R16 cannot see: that the rows are
// exactly the entities the owner owns, and that their order is the one the owned entities give
// each other. It hangs on what the schemas declare, an owned type referenced from a table of
// its owner and a field of the owned type that references its own type, and names no type.
const PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");

const PHASE_SCHEMA = schema("phase", ["| `gate-to` | No | ref → phase | The phase this gate leads to. |"], { owner: "process" });

const phase = (name, next) => `---\n${next ? `gate-to: ${next}\n` : ""}---\n\n${name ? `# ${name}\n\n` : ""}> A phase.\n`;
const processWith = (rows) => `# Delivery\n\n> A process.\n\n## Phases\n\n| Phase |\n| --- |\n${rows.map((r) => `| ${r} |`).join("\n")}\n`;

const owned = (rows, phases) =>
  checkInstance(
    new Map([
      ["meta/core/process-schema.md", PROCESS_SCHEMA],
      ["meta/core/phase-schema.md", PHASE_SCHEMA],
      ["model/processes/delivery/delivery.md", processWith(rows)],
      ...phases.map(([file, name, next]) => [`model/processes/delivery/phases/${file}.md`, phase(name, next)]),
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.includes('"## Phases"'));

const THREE = [["specify", "Specify", "Build"], ["build", "Build", "Release"], ["release", "Release", null]];

test("an owner's table that lists exactly what it owns, in the order the owned give, is not a failure", () => {
  assert.deepEqual(owned(["Specify", "Build", "Release"], THREE), []);
});

test("an owned entity the owner's table leaves out is a failure naming it", () => {
  const failures = owned(["Specify", "Build"], THREE);
  assert.ok(failures.some((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes('"Release"') && f.includes("does not list")), failures.join("\n"));
});

test("a row naming an entity the owner does not own is a failure, though the name resolves elsewhere", () => {
  const failures = checkInstance(
    new Map([
      ["meta/core/process-schema.md", PROCESS_SCHEMA],
      ["meta/core/phase-schema.md", PHASE_SCHEMA],
      ["model/processes/delivery/delivery.md", processWith(["Specify", "Audit"])],
      ["model/processes/delivery/phases/specify.md", phase("Specify", null)],
      ["model/processes/review/review.md", processWith(["Audit"])],
      ["model/processes/review/phases/audit.md", phase("Audit", null)],
    ]),
    { core: "meta/core" },
  ).failures;
  assert.ok(failures.some((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes('"Audit"') && f.includes("not one of its own")), failures.join("\n"));
});

test("a row written twice is a failure naming the duplicate", () => {
  const failures = owned(["Specify", "Build", "Build", "Release"], THREE);
  assert.ok(failures.some((f) => f.includes('"Build"') && f.includes("twice")), failures.join("\n"));
});

test("an order that disagrees with what the owned entities say of each other is a failure naming both", () => {
  const failures = owned(["Specify", "Release", "Build"], THREE);
  assert.ok(failures.some((f) => f.includes('"Release"') && f.includes('"Specify"') && f.includes("`gate-to`") && f.includes('"Build"')), failures.join("\n"));
});

test("a last row whose entity still leads somewhere is a failure", () => {
  const failures = owned(["Specify", "Build"], [["specify", "Specify", "Build"], ["build", "Build", "Release"], ["release", "Release", null]].slice(0, 2));
  assert.ok(failures.some((f) => f.includes('"Build"') && f.includes("last")), failures.join("\n"));
});

test("an owner whose schema declares no table of what it owns is held to nothing here", () => {
  const files = new Map([
    ["meta/core/process-schema.md", schema("process", [])],
    ["meta/core/phase-schema.md", PHASE_SCHEMA],
    ["model/processes/delivery/delivery.md", "# Delivery\n\n> A process.\n"],
    ["model/processes/delivery/phases/specify.md", phase("Specify", null)],
  ]);
  assert.deepEqual(checkInstance(files, { core: "meta/core" }).failures.filter((f) => f.includes("does not list") || f.includes("not one of its own")), []);
});

// What review found the first version silent on. The check ran only where the section already
// held a table the checks can read, so the two ways of not having one passed everything: the
// old list of links left in place, which is every instance that takes this release and does
// not rewrite the section, and a separator row with an alignment colon, which the checks' table
// reader refuses and the parser reads all the same, drawing edges nothing had held.
const ownedWith = (processText, phases = THREE) =>
  checkInstance(
    new Map([
      ["meta/core/process-schema.md", PROCESS_SCHEMA],
      ["meta/core/phase-schema.md", PHASE_SCHEMA],
      ["model/processes/delivery/delivery.md", processText],
      ...phases.map(([file, name, next]) => [`model/processes/delivery/phases/${file}.md`, phase(name, next)]),
    ]),
    { core: "meta/core" },
  ).failures;

test("a section the schema declares a table and the file still writes as a list of links is a failure", () => {
  const failures = ownedWith("# Delivery\n\n> A process.\n\n## Phases\n\n1. [Specify](phases/specify.md)\n2. [Build](phases/build.md)\n3. [Release](phases/release.md)\n");
  assert.ok(failures.some((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes('"## Phases"') && f.includes("holds no table")), failures.join("\n"));
});

test("a table whose separator row is not plain dashes is no table to the checks, and that is said", () => {
  const failures = ownedWith("# Delivery\n\n> A process.\n\n## Phases\n\n| Phase |\n| :--- |\n| Release |\n| Specify |\n");
  assert.ok(failures.some((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes("holds no table") && f.includes("dashes")), failures.join("\n"));
});

test("an owner with no such section at all is a failure naming the section", () => {
  const failures = ownedWith("# Delivery\n\n> A process.\n");
  assert.ok(failures.some((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes('"## Phases"')), failures.join("\n"));
});

test("a successor written in quotes is read as every other check reads a field, and is no disagreement", () => {
  const quoted = [["specify", "Specify", '"Build"'], ["build", "Build", "Release"], ["release", "Release", null]];
  const failures = ownedWith(processWith(["Specify", "Build", "Release"]), quoted).filter((f) => f.includes("one order") || f.includes("ends on"));
  assert.deepEqual(failures, []);
});

test("a row that matches no H1 is reported once, as a name that resolves nowhere, and not as another owner's", () => {
  // The phase file is there and has no H1, so "Build" names no phase anywhere: R16 says so, and
  // the owner check, which speaks only of a name that resolves to another owner's entity, does not.
  const failures = ownedWith(processWith(["Specify", "Build"]), [["specify", "Specify", "Build"], ["build", null, null]]);
  const about = failures.filter((f) => f.includes("delivery.md") && f.includes('"Build"') && !f.includes("gate-to"));
  assert.equal(about.length, 1, failures.join("\n"));
  assert.ok(about[0].includes("R16"), about[0]);
});

// R3, the half a machine can read. An entity names another by its canonical name and never by
// a path, and until a process's phases were found written as links to their files nothing
// looked: R3 was the agent pass's alone, and a list of five links sat in the reference instance
// through every review. A Markdown link inside an entity whose target is a file of the model
// is that, whatever the link's text says. An address outside the model is not: a document or a
// place is no entity, and its address is a fact.
const linked = (body, extra = []) =>
  checkInstance(
    new Map([
      ["meta/core/skill-schema.md", schema("skill", [])],
      ["model/skills/java.md", "# Java\n\n> A language.\n"],
      ["model/skills/kotlin.md", `# Kotlin\n\n> A language.\n\n## In practice\n\n${body}\n`],
      ...extra,
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.includes("(R3)"));

test("a link from one entity to another's file is a failure naming the link and what to write", () => {
  const failures = linked("Runs beside [Java](java.md) on the same machine.");
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.ok(failures[0].startsWith("model/skills/kotlin.md: "));
  assert.ok(failures[0].includes('"Java"') && failures[0].includes("java.md"), failures[0]);
});

test("the path is what fails, however it is written: up and down folders, a fragment, spaces, a target that is not there", () => {
  assert.equal(linked("See [a level](../proficiency-levels/expert.md#what-it-means).").length, 1);
  assert.equal(linked("See [it](<./java.md>) and [it again](./java.md \"Java\").").length, 2);
  assert.equal(linked("See [gone](../skills/gone.md).").length, 1, "a rotten path is still a path");
  assert.equal(linked("See [a folder](../profiles/).").length, 1);
});

test("an address outside the model is a fact and not a reference", () => {
  assert.deepEqual(linked("Documented at [the site](https://example.invalid/java.md), by [mail](mailto:a@example.invalid)."), []);
  assert.deepEqual(linked("See [below](#in-practice)."), []);
  assert.deepEqual(linked("See [the conventions](../../meta/core/CONVENTIONS.md) and [the readme](../../README.md)."), []);
});

test("what only looks like a link is none: code, an image, brackets without a target", () => {
  assert.deepEqual(linked("Written `[Java](java.md)` in a schema's example."), []);
  assert.deepEqual(linked("```\n[Java](java.md)\n```"), []);
  assert.deepEqual(linked("![a diagram](java.md)"), []);
  assert.deepEqual(linked("An array is [1, 2] and a call is f(java.md)."), []);
});

// The image rule is read from the character before a match rather than from a lookbehind, since
// a regex literal is parsed with the file and `(?<!!)` is a syntax error on an engine without it:
// Safari gained lookbehind in 16.4 and this file is bundled into an editor plugin that runs on a
// phone. These are the cases that separate reading the character from the obvious alternative,
// capturing it, which would eat the separator between two links and miss the second.
test("links that touch are each read, and only an image's own bracket is skipped", () => {
  assert.equal(linked("Two in a row: [Java](java.md)[again](java.md).").length, 2);
  // An image, then a link with nothing between them: the second is a link.
  assert.equal(linked("![a diagram](java.md)[Java](java.md)").length, 1);
  // A link that opens the line has no character before it and is still a link.
  assert.equal(linked("[Java](java.md) opens this line.").length, 1);
  // An image that opens the line is still an image.
  assert.deepEqual(linked("![a diagram](java.md) opens this line."), []);
});

test("a README is no entity, and its links are its own business", () => {
  assert.deepEqual(linked("Plain.", [["model/skills/README.md", "# Skills\n\n- [Java](java.md)\n"]]), []);
});

// A name of an owned type is its owner's. R5 nests an owned collection inside its owner, and
// every reference core makes to an owned type is written inside that owner's subtree: a process
// names its phases, a phase the phase its gate leads to, a profile the experience a fact comes
// from. Each schema says in prose that the name is one of the owner's own, and nothing held it:
// the checks read names by type across the instance, and one profile's evidence could name
// another profile's experience with every check green, where the parser, resolving within the
// owner since 0.31.0, refuses it. It is held
// wherever a schema declares a reference, a qualifier or a list of references to a type that is
// owned, from the owner itself or from an entity the same owner owns; no type is named.
const OWNING_PROFILE_SCHEMA = [
  "# Profile Schema", "", "> A profile.", "",
  "## File Location", "", "`profiles/<profile>/<profile>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Evidence` | No | Table. The facts. |", "",
  "`## Evidence` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Skill` | Yes | ref → skill | The skill. |",
  "| `Experience` | No | qualifier → experience | The period the fact comes from. |", "",
].join("\n");

const OWNED_EXPERIENCE_SCHEMA = schema("experience", [], { owner: "profile" });
const profileWith = (name, rows) => `# ${name}\n\n> A profile.\n\n## Evidence\n\n| Skill | Experience |\n| --- | --- |\n${rows.map((r) => `| Java | ${r} |`).join("\n")}\n`;

const evidence = (miraRows) =>
  checkInstance(
    new Map([
      ["meta/core/profile-schema.md", OWNING_PROFILE_SCHEMA],
      ["meta/core/experience-schema.md", OWNED_EXPERIENCE_SCHEMA],
      ["meta/core/skill-schema.md", schema("skill", [])],
      ["model/skills/java.md", "# Java\n\n> A language.\n"],
      ["model/profiles/mira/mira.md", profileWith("Mira", miraRows)],
      ["model/profiles/mira/experiences/2022-billing.md", "# Splitting the billing domain\n\n> A period.\n"],
      ["model/profiles/tomas/tomas.md", profileWith("Tomas", ["Finding the order pipeline"])],
      ["model/profiles/tomas/experiences/2021-orders.md", "# Finding the order pipeline\n\n> A period.\n"],
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.includes("owns them (R5)"));

test("an owner's qualifier that names one of its own is not a failure, and neither is a blank cell", () => {
  assert.deepEqual(evidence(["Splitting the billing domain", ""]), []);
});

test("an owner's qualifier that names another owner's entity is a failure, though the name resolves", () => {
  const failures = evidence(["Finding the order pipeline"]);
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.ok(failures[0].startsWith("model/profiles/mira/mira.md: "));
  assert.ok(failures[0].includes('"Finding the order pipeline"') && failures[0].includes("model/profiles/mira/experiences/"), failures[0]);
});

test("an owned entity that names a sibling is held to its own owner, and a foreign one is a failure", () => {
  const run = (next) =>
    checkInstance(
      new Map([
        ["meta/core/process-schema.md", PROCESS_SCHEMA],
        ["meta/core/phase-schema.md", PHASE_SCHEMA],
        ["model/processes/delivery/delivery.md", processWith(["Specify"])],
        ["model/processes/delivery/phases/specify.md", phase("Specify", next)],
        ["model/processes/delivery/phases/build.md", phase("Build", null)],
        ["model/processes/review/review.md", processWith(["Audit"])],
        ["model/processes/review/phases/audit.md", phase("Audit", null)],
      ]),
      { core: "meta/core" },
    ).failures.filter((f) => f.includes("owns them (R5)"));
  assert.deepEqual(run("Build"), []);
  const foreign = run("Audit");
  assert.equal(foreign.length, 1, foreign.join("\n"));
  assert.ok(foreign[0].startsWith("model/processes/delivery/phases/specify.md: ") && foreign[0].includes("`gate-to`"), foreign[0]);
});

test("a foreign row in an owner's listing is said once, by this check and not by the listing's as well", () => {
  const failures = checkInstance(
    new Map([
      ["meta/core/process-schema.md", PROCESS_SCHEMA],
      ["meta/core/phase-schema.md", PHASE_SCHEMA],
      ["model/processes/delivery/delivery.md", processWith(["Specify", "Audit"])],
      ["model/processes/delivery/phases/specify.md", phase("Specify", null)],
      ["model/processes/review/review.md", processWith(["Audit"])],
      ["model/processes/review/phases/audit.md", phase("Audit", null)],
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.startsWith("model/processes/delivery/delivery.md: ") && f.includes('"Audit"'));
  assert.equal(failures.length, 1, failures.join("\n"));
});

test("an optional reference is held to nothing, and a reference written outside every owner names nothing (R4)", () => {
  // R4 answers what an earlier version of this check left open: a reference to an owned type
  // written outside every owner of it has no owner to be resolved in, and names nothing. The
  // parser refuses it, so the checks say so too; one that is optional stays a fact.
  const run = (declared) =>
    checkInstance(
      new Map([
        ["meta/core/profile-schema.md", OWNING_PROFILE_SCHEMA.replace("qualifier → experience", "ref? → experience")],
        ["meta/core/experience-schema.md", OWNED_EXPERIENCE_SCHEMA],
        ["meta/core/skill-schema.md", schema("skill", [`| \`first-used\` | No | ${declared} | Where it was first used. |`])],
        ["model/skills/java.md", "---\nfirst-used: Finding the order pipeline\n---\n\n# Java\n\n> A language.\n"],
        ["model/profiles/mira/mira.md", profileWith("Mira", ["Finding the order pipeline"])],
        ["model/profiles/tomas/tomas.md", profileWith("Tomas", [""])],
        ["model/profiles/tomas/experiences/2021-orders.md", "# Finding the order pipeline\n\n> A period.\n"],
      ]),
      { core: "meta/core" },
    ).failures;
  const optional = run("ref? → experience");
  assert.deepEqual(optional.filter((f) => f.includes("(R5)") || f.includes("(R4)")), []);
  const outside = run("ref → experience").filter((f) => f.startsWith("model/skills/java.md: "));
  assert.equal(outside.length, 1, outside.join("\n"));
  assert.ok(outside[0].includes("outside") && outside[0].includes("(R4)"), outside[0]);
});

// An owned entity sits inside an owner of the type its schema declares as its owner (R5). A
// folder inside an owner's folder that is not one it owns was passed by every check, and the
// parser, which read ownership from whatever file came last, refused every correct process over
// one stray phase under a profile. The checks now name the folder.
test("a folder inside an owner's folder that it does not own is a failure", () => {
  const failures = checkInstance(
    new Map([
      ["meta/core/process-schema.md", PROCESS_SCHEMA],
      ["meta/core/phase-schema.md", PHASE_SCHEMA],
      ["meta/core/profile-schema.md", OWNING_PROFILE_SCHEMA],
      ["meta/core/experience-schema.md", OWNED_EXPERIENCE_SCHEMA],
      ["model/processes/delivery/delivery.md", processWith(["Specify"])],
      ["model/processes/delivery/phases/specify.md", phase("Specify", null)],
      ["model/profiles/mira/mira.md", profileWith("Mira", [""])],
      ["model/profiles/mira/experiences/2022-billing.md", "# Splitting the billing domain\n\n> A period.\n"],
      ["model/profiles/mira/phases/stray.md", phase("Stray", null)],
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.includes("mira/phases"));
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.ok(failures[0].includes("(R5)") || failures[0].includes("not a folder"), failures[0]);
});
// One cause is one finding. A qualifier or a reference that names no entity of its type at all is
// R16's to report, that it resolves nowhere; the owner check speaks only of a name that does
// resolve and belongs to another owner. Found in the plugin, where a blank-named period showed
// twice in the pane.
test("a name of an owned type that names nothing at all is reported once, by R16, and not by the owner check", () => {
  const failures = checkInstance(
    new Map([
      ["meta/core/profile-schema.md", OWNING_PROFILE_SCHEMA],
      ["meta/core/experience-schema.md", OWNED_EXPERIENCE_SCHEMA],
      ["meta/core/skill-schema.md", schema("skill", [])],
      ["model/skills/java.md", "# Java\n\n> A language.\n"],
      ["model/profiles/mira/mira.md", profileWith("Mira", ["A period that never was"])],
      ["model/profiles/mira/experiences/2022-billing.md", "# Splitting the billing domain\n\n> A period.\n"],
    ]),
    { core: "meta/core" },
  ).failures.filter((f) => f.includes("A period that never was"));
  assert.equal(failures.length, 1, failures.join("\n"));
  assert.ok(failures[0].includes("R16"), failures[0]);
});

// R2, for an owned type: a name is unique within its owner. The checks list a type's own folder
// and did not reach into an owner's, so two phases of one name in one process passed every check
// while the parser refused them; across owners one name is now allowed, within one it is not.
test("two entities of one name within one owner are a failure naming the owner, and across owners none", () => {
  const run = (extra) =>
    checkInstance(
      new Map([
        ["meta/core/process-schema.md", PROCESS_SCHEMA],
        ["meta/core/phase-schema.md", PHASE_SCHEMA],
        ["model/processes/delivery/delivery.md", processWith(["Build", "Review"])],
        ["model/processes/delivery/phases/build.md", phase("Build", "Review")],
        ["model/processes/delivery/phases/review.md", phase("Review", null)],
        ["model/processes/hiring/hiring.md", processWith(["Review"])],
        ["model/processes/hiring/phases/review.md", phase("Review", null)],
        ...extra,
      ]),
      { core: "meta/core" },
    ).failures.filter((f) => f.includes("unique within its owner"));
  assert.deepEqual(run([]), []);
  const within = run([["model/processes/delivery/phases/review-again.md", phase("Review", null)]]);
  assert.equal(within.length, 1, within.join("\n"));
  assert.ok(within[0].startsWith("model/processes/delivery/phases/") && within[0].includes('"Review"') && within[0].includes("(R2)"), within[0]);
});

// R9: the sections table says which sections a page must carry, and until this check nothing
// read it, so a required section renamed or deleted passed every check. What is held is the
// declared heading, written exactly: a heading the schema does not declare is the page's own
// and is no failure, which is what separates sections from frontmatter fields (R15).
const LEVEL_SCHEMA = schema("proficiency-level", [], {
  sections: [
    "| `# [Name]` | Yes | The level's name. |",
    "| `## What it means` | Yes | What someone at this level can do. |",
    "| `## References` | No | Where it is written down. |",
  ],
});
const levelFiles = (text) =>
  new Map([
    ["core/proficiency-level-schema.md", LEVEL_SCHEMA],
    ["model/proficiency-levels/expert.md", text],
  ]);
const missingSection = (failures) => failures.filter((f) => f.includes("which proficiency-level-schema.md requires"));

test("a required section that is missing is a failure naming the section", () => {
  const { failures } = checkInstance(levelFiles("# Expert\n\n> Leads it.\n"));
  assert.deepEqual(missingSection(failures), [
    "model/proficiency-levels/expert.md: no `## What it means`, which proficiency-level-schema.md requires",
  ]);
});

test("a required section renamed is missing under its declared heading, and the new heading is no failure of its own", () => {
  const { failures } = checkInstance(levelFiles("# Expert\n\n> Leads it.\n\n## What it is\n\nLeads it.\n"));
  assert.deepEqual(missingSection(failures), [
    "model/proficiency-levels/expert.md: no `## What it means`, which proficiency-level-schema.md requires",
  ]);
  assert.ok(!failures.some((f) => f.includes("What it is")), `expected the page's own heading to pass, got:\n${failures.join("\n")}`);
});

test("required sections present, an optional one absent and a heading of the page's own are not a failure", () => {
  const { failures } = checkInstance(
    levelFiles("# Expert\n\n> Leads it.\n\n## What it means\n\nLeads it.\n\n## Notes\n\nMine.\n"),
  );
  assert.deepEqual(missingSection(failures), []);
});

test("a required heading counts only as written: case and trailing words make it another heading", () => {
  const { failures } = checkInstance(
    levelFiles("# Expert\n\n> Leads it.\n\n## What It Means\n\nA.\n\n## What it means, roughly\n\nB.\n"),
  );
  assert.equal(missingSection(failures).length, 1);
});

test("a README in a type folder carries no required section", () => {
  const files = levelFiles("# Expert\n\n> Leads it.\n\n## What it means\n\nLeads it.\n");
  files.set("model/proficiency-levels/README.md", "# Proficiency levels\n");
  assert.deepEqual(missingSection(checkInstance(files).failures), []);
});

// The checks and the parser read a heading alike: a line that opens with `## `, below the
// frontmatter, whose fence is a line of exactly three dashes. A reader that also took a tab after
// the hashes, or a YAML comment inside the frontmatter, passed a required section the parser
// never saw, and an editor that reads as the parser does drew it missing.
test("a required section is present only where the parser reads a heading", () => {
  const cases = [
    ["a YAML comment in the frontmatter", "---\n## What it means\n---\n\n# Expert\n\n> Leads it.\n"],
    ["a tab after the hashes", "# Expert\n\n> Leads it.\n\n##\tWhat it means\n\nLeads it.\n"],
  ];
  for (const [what, text] of cases)
    assert.deepEqual(
      missingSection(checkInstance(levelFiles(text)).failures),
      ["model/proficiency-levels/expert.md: no `## What it means`, which proficiency-level-schema.md requires"],
      what,
    );
});

test("sectionsOf keys a page's sections as the parser heads them", () => {
  const text = "---\nsource: Local\n## a comment\n---\n\n# Expert\n\n> Leads it.\n\n## What it means\n\nA.\n\n##\tNot one\n\n## References  \n";
  assert.deepEqual([...sectionsOf(text).keys()], ["", "What it means", "References"]);
  // The frontmatter stays where it was, in the part before the first heading.
  assert.ok(sectionsOf(text).get("").includes("source: Local"));
});

// A track is an entity its process owns, so that a phase's `### [Track]` heading is a declared
// reference and not a word that happens to match a cell. Nothing below is a check written for
// tracks: the fixtures declare a second owned type, a listing of it and a grouped heading typed
// to it, and the checks that read declarations do the rest. They are pinned because a behavior
// that arrives for free is one nobody notices leaving.
const TRACKED_PROCESS_SCHEMA = [
  "# Process Schema", "", "> A process.", "",
  "## File Location", "", "`processes/<process>/<process>.md`", "",
  "## Frontmatter", "", "| Field | Required | Type | Description |", "| --- | --- | --- | --- |", "",
  "## Sections", "",
  "| Section | Required | Description |", "| --- | --- | --- |",
  "| `## Tracks` | Yes | Table. The tracks. |",
  "| `## Phases` | Yes | Table. The phases, in order. |", "",
  "`## Tracks` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Track` | Yes | ref → track | The track. |", "",
  "`## Phases` is a table with these columns:", "",
  "| Column | Required | Type | Description |", "| --- | --- | --- | --- |",
  "| `Phase` | Yes | ref → phase | The phase. |", "",
].join("\n");

const TRACK_SCHEMA = schema("track", [], { owner: "process" });

const TRACKED_PHASE_SCHEMA = schema("phase", [], {
  owner: "process",
  grouped: { section: "Activities", heading: "Track", type: "ref → track" },
});

const track = (name) => `# ${name}\n\n> What one pass leaves behind.\n`;
const tracked = (name, tracks, phases = ["Build"]) =>
  `# ${name}\n\n> A process.\n\n## Tracks\n\n| Track |\n| --- |\n${tracks.map((t) => `| ${t} |`).join("\n")}\n\n` +
  `## Phases\n\n| Phase |\n| --- |\n${phases.map((p) => `| ${p} |`).join("\n")}\n`;
const building = (headings) =>
  `# Build\n\n> Make it.\n\n## Activities\n\n${headings.map((h) => `### ${h}\n\n1. Do the work.\n`).join("\n")}`;

const withTracks = (files) =>
  checkInstance(
    new Map([
      ["meta/core/process-schema.md", TRACKED_PROCESS_SCHEMA],
      ["meta/core/track-schema.md", TRACK_SCHEMA],
      ["meta/core/phase-schema.md", TRACKED_PHASE_SCHEMA],
      ...files,
    ]),
    { core: "meta/core" },
  ).failures;

const DELIVERY = [
  ["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs"])],
  ["model/processes/delivery/tracks/code.md", track("Code")],
  ["model/processes/delivery/tracks/docs.md", track("Docs")],
  ["model/processes/delivery/phases/build.md", building(["Code", "Docs"])],
];

test("a phase's track headings that name tracks of its own process are not a failure", () => {
  assert.deepEqual(withTracks(DELIVERY).filter((f) => /Tracks|Activities|tracks\//.test(f)), []);
});

test("a track renamed leaves a phase's heading naming nothing, and that is a failure naming the heading", () => {
  const failures = withTracks([
    ["model/processes/delivery/delivery.md", tracked("Delivery", ["Code2", "Docs"])],
    ["model/processes/delivery/tracks/code2.md", track("Code2")],
    ["model/processes/delivery/tracks/docs.md", track("Docs")],
    ["model/processes/delivery/phases/build.md", building(["Code", "Docs"])],
  ]);
  const hit = failures.find((f) => f.startsWith("model/processes/delivery/phases/build.md: ") && f.includes("`### Code`"));
  assert.ok(hit, `no failure named the heading; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /"## Activities"/);
  assert.match(hit, /ref → track/);
});

test("a heading naming another process's track is a failure, though the name resolves", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", building(["Code", "Contract"])],
    ["model/processes/hiring/hiring.md", tracked("Hiring", ["Contract"], ["Screen"])],
    ["model/processes/hiring/tracks/contract.md", track("Contract")],
    ["model/processes/hiring/phases/screen.md", "# Screen\n\n> First.\n"],
  ]);
  const hit = failures.find((f) => f.includes("phases/build.md") && f.includes("Contract"));
  assert.ok(hit, `no failure named the foreign track; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /R5/);
});

test("a process's table of tracks is held to its tracks folder: one left out, one that is not there, one twice", () => {
  const leftOut = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code"])], ...DELIVERY.slice(1)]);
  assert.ok(leftOut.some((f) => f.includes('"## Tracks"') && f.includes('does not list "Docs"')), leftOut.join("\n"));

  const notThere = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs", "Video"])], ...DELIVERY.slice(1)]);
  assert.ok(notThere.some((f) => f.includes("delivery.md") && f.includes('"Video"') && f.includes("ref → track")), notThere.join("\n"));

  const twice = withTracks([["model/processes/delivery/delivery.md", tracked("Delivery", ["Code", "Docs", "Code"])], ...DELIVERY.slice(1)]);
  assert.ok(twice.some((f) => f.includes('"## Tracks"') && f.includes('lists "Code" twice')), twice.join("\n"));
});

// The two halves of "a grouped section's items stand under its headings" mean different things
// for a phase. An activity above the first track heading belongs to no track, as a bullet above
// the first kind belongs to none, so the first half reads a numbered item too. A phase with no
// track heading at all is the legal way to say the work is the same on every track, so the
// second half is left reading bullets only, and a numbered list under no heading passes on
// purpose and not by its list marker.
test("an activity above the first track heading is a failure, numbered though it is", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n1. Belongs to no track.\n\n### Code\n\n1. Do the work.\n"],
  ]);
  const hit = failures.find((f) => f.includes("phases/build.md") && f.includes("before its first `###` heading"));
  assert.ok(hit, `no failure named the item; got: ${failures.join(" | ") || "none"}`);
  assert.match(hit, /an item/);
  assert.match(hit, /a track/);
});

test("a phase with no track heading passes where the instance holds a track: its work is the same on every track", () => {
  const failures = withTracks([
    ...DELIVERY.slice(0, 3),
    ["model/processes/delivery/phases/build.md", "# Build\n\n> Make it.\n\n## Activities\n\n1. One thing.\n2. Another.\n"],
  ]);
  assert.deepEqual(failures.filter((f) => f.includes("Activities")), []);
});

test("a repeated reference in a table names the role each row plays", () => {
  const files = new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"], {
      sections: [
        "| `## Relations` | No | Table. What this points at. |",
        "",
        "`## Relations` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Skill` | Yes | ref → skill | What this points at |",
        "| `As` | No | string | The role it plays. Required where two rows name the same skill. |",
      ],
    })],
    ["model/skills/java.md", [
      "---", "source: Local", "---", "", "# Java", "", "> A language.", "",
      "## Relations", "",
      "| Skill | As |", "| --- | --- |", "| Maven | builds |", "| Maven | |",
    ].join("\n")],
    ["model/skills/maven.md", "---\nsource: Local\n---\n\n# Maven\n\n> A build tool.\n"],
  ]);

  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });

  assert.ok(
    failures.some((f) => f.includes("Maven") && f.includes("As")),
    `expected a repeated-reference failure, got: ${failures.join(" | ")}`,
  );
});

// The same schema as the test above, with the relation rows supplied per case, so each test
// below differs from it in the rows alone.
const relationsFiles = (rows) =>
  new Map([
    ["meta/core/skill-schema.md", schema("skill", ["| `source` | Yes | ref → source | Where it came from. |"], {
      sections: [
        "| `## Relations` | No | Table. What this points at. |",
        "",
        "`## Relations` is a table with these columns:",
        "",
        "| Column | Required | Type | Description |",
        "| --- | --- | --- | --- |",
        "| `Skill` | Yes | ref → skill | What this points at |",
        "| `As` | No | string | The role it plays. Required where two rows name the same skill. |",
      ],
    })],
    ["model/skills/java.md", [
      "---", "source: Local", "---", "", "# Java", "", "> A language.", "",
      "## Relations", "",
      "| Skill | As |", "| --- | --- |", ...rows,
    ].join("\n")],
    ["model/skills/maven.md", "---\nsource: Local\n---\n\n# Maven\n\n> A build tool.\n"],
  ]);

test("two rows naming one entity with the same role fail", () => {
  const { failures } = checkInstance(relationsFiles(["| Maven | builds |", "| Maven | builds |"]), {
    core: "meta/core",
    model: "model",
  });
  const hits = failures.filter((f) => f.includes('"Maven"'));
  assert.equal(hits.length, 1, `expected one shared-role failure, got: ${failures.join(" | ")}`);
  assert.match(hits[0], /java\.md/);
  assert.match(hits[0], /## Relations/);
  assert.match(hits[0], /more than one carries `As` "builds"/);
});

test("a repeated entity with one blank role is reported once, not once per row", () => {
  const { failures } = checkInstance(
    relationsFiles(["| Maven | builds |", "| Maven | tests |", "| Maven | |"]),
    { core: "meta/core", model: "model" },
  );
  const hits = failures.filter((f) => f.includes('"Maven"'));
  assert.equal(hits.length, 1, `expected exactly one failure for Maven, got: ${failures.join(" | ")}`);
  assert.match(hits[0], /in 3 rows and 1 of them leaves `As` blank/);
});

test("two rows naming one entity with distinct roles pass", () => {
  const { failures } = checkInstance(relationsFiles(["| Maven | builds |", "| Maven | tests |"]), {
    core: "meta/core",
    model: "model",
  });
  assert.deepEqual(failures.filter((f) => f.includes("Maven")), []);
});
