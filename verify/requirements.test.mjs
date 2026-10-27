// verify/requirements.test.mjs
// The requirements pack through its real schemas: packs/requirements/ is read from disk, so the
// test fails if the schemas and the checks part. The core types a use case and a requirement
// name are bare, as landscape.test.mjs has them, since the test is about the pack's edges and
// not their targets.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkInstance } from "../lib/checks.mjs";

const pack = (n) => fs.readFileSync(new URL(`../packs/requirements/${n}-schema.md`, import.meta.url), "utf8");
const head = (type, location) => [`# ${type[0].toUpperCase()}${type.slice(1)} Schema`, "", `> A ${type}.`, "", "## File Location", "", `\`${location}\``, ""];
const bare = (type, location) => [...head(type, location), "## Frontmatter", "", "No YAML frontmatter.", "",
  "## Sections", "", "| Section | Required | Description |", "| --- | --- | --- |", ""].join("\n");
const PACKS = [{ name: "requirements", dir: "meta/requirements" }];
const U = "model/use-cases";
const R = "model/requirements";
const RL = "model/requirement-realizations";
const UL = "model/use-case-realizations";
const list = (field, names) => names.length ? `${field}:\n${names.map((n) => `  - ${n}`).join("\n")}` : "";
const page = (h1, tagline) => `# ${h1}\n\n> ${tagline}\n`;
const table = (cols, rows) => `| ${cols.join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const bullets = (items) => `${items.map((i) => `- ${i}`).join("\n")}\n`;
const useCase = ({ level, scope, actor, features = [], includes = [], realization, realized, evidence, h1, tagline, stakeholders, steps, extensions = [], minimal, success }) => [
  "---", "source: Local", `level: ${level}`, ...(scope ? [`scope: ${scope}`] : []), `primary-actor: ${actor}`,
  ...(features.length ? [list("features", features)] : []), ...(includes.length ? [list("includes", includes)] : []),
  ...(realization ? [`realization: ${realization}`] : []),
  "---", "", `# ${h1}`, "", `> ${tagline}`, "",
  "## Stakeholders and interests", "", table(["Stakeholder", "Interest"], stakeholders),
  "## Main success scenario", "", table(["Step", "Actor", "Action"], steps),
  ...(extensions.length ? ["## Extensions", "", table(["Step", "Condition", "Handling"], extensions)] : []),
  "## Minimal guarantees", "", bullets(minimal),
  "## Success guarantees", "", bullets(success),
  ...(realized ? ["## Realization", "", realized, ""] : []),
  ...(evidence ? ["## Evidence", "", table(["What", "Shows", "URL"], evidence)] : []),
].join("\n");
const level = ({ h1, rank, evidence }) => [
  "---", "source: Local", `rank: ${rank}`, `evidence: ${evidence}`, "---", "", `# ${h1}`, "", `> ${h1}.`, "",
  "## What it means", "", "A page at this level has reached it, and a reader may rely on what its evidence shows.", "",
].join("\n");
const requirement = ({ kind, modality, follows = [], h1, statement, applies, realization, realized, evidence }) => [
  "---", "source: Local", `kind: ${kind}`, `modality: ${modality}`, ...(follows.length ? [list("follows", follows)] : []),
  ...(realization ? [`realization: ${realization}`] : []),
  "---", "", `# ${h1}`, "", `> ${statement}`, "",
  "## Why", "", "A guest who waits for an answer leaves before it comes.", "",
  "## Fit criterion", "", "Over a week of bookings, the answer a guest sees is measured from their confirming to its showing.", "",
  "## Applies to", "", table(["Type", "Entity"], applies),
  ...(realized ? ["## Realization", "", realized, ""] : []),
  ...(evidence ? ["## Evidence", "", table(["What", "Shows", "URL"], evidence)] : []),
].join("\n");

const tree = (change = (m) => m) => change(new Map([
  ["meta/requirements/use-case-schema.md", pack("use-case")],
  ["meta/requirements/requirement-schema.md", pack("requirement")],
  ["meta/requirements/requirement-realization-schema.md", pack("requirement-realization")],
  ["meta/requirements/use-case-realization-schema.md", pack("use-case-realization")],
  ["meta/core/source-schema.md", bare("source", "model/sources/*.md")],
  ["meta/core/feature-schema.md", bare("feature", "model/features/*.md")],
  ["meta/core/product-schema.md", bare("product", "model/products/*.md")],
  ["meta/core/seat-schema.md", bare("seat", "model/seats/*.md")],
  ["meta/core/rule-schema.md", bare("rule", "model/rules/*.md")],
  ["model/sources/local.md", page("Local", "Here.")],
  ["model/features/table-booking.md", page("Table booking", "A guest books a table for a time.")],
  ["model/products/booking-app.md", page("Booking App", "Where a guest books.")],
  ["model/seats/host.md", page("Host", "Seats the guests.")],
  ["model/rules/guest-data-stays-in-the-region.md", page("Guest data stays in the region", "No guest's data leaves the region it was given in.")],
  [`${U}/run-an-evening-of-service.md`, useCase({
    level: "summary", scope: "organization", actor: "Host", includes: ["Book a table"],
    h1: "Run an evening of service", tagline: "The host fills the room for an evening, and every guest who booked finds a table.",
    stakeholders: [["Host", "Every booked guest is seated near their time"], ["Kitchen", "Covers arrive spread over the evening"]],
    steps: [["1", "Host", "Opens the evening's tables for booking"], ["2", "Guest", "Books a table, as Book a table says"], ["3", "Host", "Seats each guest at the booked table"]],
    extensions: [["2a", "No table is free at the time asked", "The guest is offered the nearest free time"]],
    minimal: ["No table is promised twice."], success: ["Every guest who booked was seated."],
  })],
  [`${U}/book-a-table.md`, useCase({
    level: "user goal", scope: "system", actor: "Guest", features: ["Table booking"], includes: ["Find a free table"],
    realization: "Runs end to end", realized: "The main scenario and both extensions run against the booking app.",
    evidence: [["Run of the booking scenario", "verifies", "https://example.org/booking/blob/0a1b2c3/test/book.test.js"]],
    h1: "Book a table", tagline: "A guest books a table for a time and leaves with a confirmation.",
    stakeholders: [["Guest", "A confirmed table, and no booking they did not ask for"], ["Host", "A booking that names the guest, the time and the party size"]],
    steps: [["1", "Guest", "Asks for a table for a party size and a time"], ["2", "Booking system", "Finds a free table, as Find a free table says"], ["3", "Guest", "Confirms the table"], ["4", "Booking system", "Confirms the booking to the guest"]],
    extensions: [["2a", "No table is free at that time", "The app offers the nearest free times, and the guest picks one or leaves"], ["3a", "The guest does not confirm within ten minutes", "The table is released"]],
    minimal: ["No table is held for a guest who did not confirm."], success: ["The guest holds a booking the host can see."],
  })],
  [`${U}/find-a-free-table.md`, useCase({
    level: "subfunction", actor: "Guest", h1: "Find a free table", tagline: "The tables free for a party size at a time are found.",
    stakeholders: [["Guest", "Only tables that are really free"]],
    steps: [["1", "Booking system", "Reads the tables free at the time asked for the party size"]],
    minimal: ["Nothing is booked."], success: ["The guest sees the free tables."],
  })],
  [`${RL}/verified.md`, level({ h1: "Verified", rank: 30, evidence: "verifies" })],
  [`${RL}/built.md`, level({ h1: "Built", rank: 20, evidence: "satisfies" })],
  [`${RL}/not-started.md`, level({ h1: "Not started", rank: 10, evidence: "none" })],
  [`${UL}/runs-end-to-end.md`, level({ h1: "Runs end to end", rank: 20, evidence: "verifies" })],
  [`${UL}/not-started.md`, level({ h1: "Not started", rank: 10, evidence: "none" })],
  [`${R}/booking-confirmed-within-two-seconds.md`, requirement({
    realization: "Verified", realized: "The confirmation is timed against the fit criterion over a week of bookings.",
    evidence: [["Timing test of the booking confirmation", "verifies", "https://example.org/booking/blob/0a1b2c3/test/confirm.test.js"]],
    kind: "quality", modality: "must", h1: "Booking confirmed within two seconds",
    statement: "A guest who confirms a table sees the booking confirmed within two seconds.",
    applies: [["use-case", "Book a table"], ["product", "Booking App"]],
  })],
  [`${R}/bookings-are-stored-in-the-region.md`, requirement({
    kind: "constraint", modality: "must", follows: ["Guest data stays in the region"], h1: "Bookings are stored in the region",
    statement: "A booking is stored only in the region the guest booked in.",
    applies: [["product", "Booking App"]],
  })],
]));
const failures = (files) => checkInstance(files, { core: "meta/core", model: "model", packs: PACKS }).failures;
const edit = (path, from, to) => (m) => m.set(path, m.get(path).replace(from, to));
const only = (f, ...words) => f.filter((x) => words.every((w) => x.includes(w)));

test("a small instance written in the pack passes, actors that are no seat and a requirement on a use case included", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a primary actor or a stakeholder naming no seat stays a string and fails nothing", () => {
  const f = failures(tree((m) => {
    edit(`${U}/run-an-evening-of-service.md`, "primary-actor: Host", "primary-actor: Hostess")(m);
    edit(`${U}/book-a-table.md`, "| Host | A booking", "| Hostess | A booking")(m);
    return m;
  }));
  assert.deepEqual(f, []);
});

test("a level outside the four fails under R8", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: fish")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /find-a-free-table\.md: `level` is "fish", and use-case-schema\.md permits `very high summary`, `summary`, `user goal`, `subfunction` \(R8\)$/);
});

test("a scope outside the three fails under R8", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "scope: system", "scope: bounded-context")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /book-a-table\.md.*bounded-context.*\(R8\)/);
});

test("a modality and a kind outside their tokens each fail under R8", () => {
  const a = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "modality: must", "modality: shall")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /booking-confirmed-within-two-seconds\.md.*shall.*\(R8\)/);
  const b = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "kind: quality", "kind: non-functional")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /booking-confirmed-within-two-seconds\.md.*non-functional.*\(R8\)/);
});

test("a feature, an include and a followed rule that name nothing each fail as R4 alone", () => {
  const a = failures(tree(edit(`${U}/book-a-table.md`, "  - Table booking", "  - Table bookings")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /book-a-table\.md.*"Table bookings".*\(R4\)/);
  const b = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a table")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /book-a-table\.md.*"Find a table".*\(R4\)/);
  const c = failures(tree(edit(`${R}/bookings-are-stored-in-the-region.md`, "  - Guest data stays in the region", "  - Guest data stays home")));
  assert.equal(c.length, 1, c.join("\n"));
  assert.match(c[0], /bookings-are-stored-in-the-region\.md.*"Guest data stays home".*\(R4\)/);
});

test("an Applies to row naming nothing of its type fails as R4, and a type off the list is R8's alone", () => {
  const a = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "| use-case | Book a table |", "| use-case | Book a room |")));
  assert.equal(only(a, "booking-confirmed-within-two-seconds.md", "Book a room", "(R4)").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${R}/booking-confirmed-within-two-seconds.md`, "| product | Booking App |", "| screen | Booking App |")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /`Type` in "## Applies to" is "screen", and requirement-schema\.md permits `feature`, `product`, `use-case` \(R8\)$/);
});

test("an Applies to with no rows, and a use case without its success guarantees, each fail once", () => {
  const a = failures(tree(edit(`${R}/bookings-are-stored-in-the-region.md`, "| product | Booking App |\n", "")));
  assert.equal(only(a, "bookings-are-stored-in-the-region.md", "Applies to").length, 1, a.join("\n"));
  const b = failures(tree(edit(`${U}/find-a-free-table.md`, "## Success guarantees\n\n- The guest sees the free tables.\n", "")));
  assert.equal(only(b, "find-a-free-table.md", "Success guarantees").length, 1, b.join("\n"));
});

test("a step label repeated in the main success scenario fails, naming the page and the label", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 4 | Booking system |", "| 3 | Booking system |")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "3" labels two items under ## Main success scenario.*\(R16\)$/);
});

test("an extension label repeated fails under its own section", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 2a | The guest")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "2a" labels two items under ## Extensions/);
});

test("a label repeated across the two tables fails once, since a label is unique on its page", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 | The guest")));
  assert.equal(only(f, "labels two items").length, 1, f.join("\n"));
  assert.match(only(f, "labels two items")[0], /book-a-table\.md: "3" labels two items under ## Extensions/);
});

test("an extension label that is no token fails once, as no label", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /book-a-table\.md: "3 a" under ## Extensions is no label; a label is letters, digits and hyphens \(R16\)$/);
});

test("an includes circle of two fails once, naming both from the page whose path sorts first", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "primary-actor: Guest\n", "primary-actor: Guest\nincludes:\n  - Book a table\n")));
  const circle = only(f, "runs in a circle");
  assert.equal(circle.length, 1, f.join("\n"));
  assert.match(circle[0], /^model\/use-cases\/book-a-table\.md: `includes` runs in a circle, "Book a table" → "Find a free table" → "Book a table"; a line never returns to where it starts \(R16\)$/);
});

test("a use case that includes itself fails as a circle of one", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a free table\n  - Book a table")));
  assert.equal(only(f, "runs in a circle", "\"Book a table\" → \"Book a table\"").length, 1, f.join("\n"));
});

test("a use case included by two others is no circle and passes", () => {
  const f = failures(tree(edit(`${U}/run-an-evening-of-service.md`, "  - Book a table", "  - Book a table\n  - Find a free table")));
  assert.deepEqual(f, []);
});

test("a use case that includes one above its own level fails once, naming both levels", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: summary")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/use-cases\/book-a-table\.md: `includes` names "Find a free table", whose `level` is `summary`, above this page's `user goal`; what a page names there stands at its `level` or below \(R16\)$/);
});

test("a use case that includes one at its own level passes", () => {
  assert.deepEqual(failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: user goal"))), []);
});

test("a level off the list is R8's alone and is not compared", () => {
  const f = failures(tree(edit(`${U}/find-a-free-table.md`, "level: subfunction", "level: very high")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("an include naming nothing is R4's alone and is not compared", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "  - Find a free table", "  - Find a table")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R4\)/);
});

test("an extension whose label begins with no step fails once", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 7a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/use-cases\/book-a-table\.md: "7a" under ## Extensions begins with no Step of ## Main success scenario and a letter; a branch's label is the label it branches from and a letter, `2a` \(R16\)$/);
});

test("an extension labeled as a step with no letter fails, and a second branch of one step passes", () => {
  const f = failures(tree(edit(`${U}/run-an-evening-of-service.md`, "| 2a | No table", "| 7 | No table")));
  assert.equal(only(f, "begins with no Step").length, 1, f.join("\n"));
  const g = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 2b | The guest")));
  assert.deepEqual(g, []);
});

test("an extension labeled with two letters fails, since a branch takes one", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3ab | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /"3ab" under ## Extensions begins with no Step/);
});

test("an extension label that is no token is the label check's alone", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3a | The guest", "| 3 a | The guest")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /is no label/);
});

// A `ref? → seat` resolves against seats alone (R9), so an actor named like a product or a
// feature is a name, as a guest is, and draws no edge to either.
test("an actor named like another type's entity stays a name and fails nothing", () => {
  const a = failures(tree(edit(`${U}/book-a-table.md`, "| 2 | Booking system |", "| 2 | Booking App |")));
  assert.deepEqual(a, []);
  const b = failures(tree(edit(`${U}/book-a-table.md`, "primary-actor: Guest", "primary-actor: Table booking")));
  assert.deepEqual(b, []);
});

test("a blank Step in the main scenario is the required-column check's alone, and an extension citing it is no second finding", () => {
  const f = failures(tree(edit(`${U}/book-a-table.md`, "| 3 | Guest | Confirms", "|  | Guest | Confirms")));
  assert.equal(only(f, "begins with no Step").length, 0, f.join("\n"));
  assert.equal(only(f, "has no Step").length, 1, f.join("\n"));
});

const RQ = `${R}/booking-confirmed-within-two-seconds.md`;
const BK = `${U}/book-a-table.md`;

test("a requirement and a use case realized to a level pass", () => {
  assert.deepEqual(failures(tree()), []);
});

test("a realization naming no level fails once, by R4", () => {
  const f = failures(tree(edit(RQ, "realization: Verified", "realization: Shipped")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R4\)/);
});

test("a Shows off its tokens fails once, by R8", () => {
  const f = failures(tree(edit(RQ, "| verifies |", "| tests |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("an evidence level off its tokens fails once, by R8", () => {
  const f = failures(tree(edit(`${RL}/verified.md`, "evidence: verifies", "evidence: tested")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /\(R8\)/);
});

test("two levels sharing a rank fail", () => {
  const f = failures(tree(edit(`${RL}/built.md`, "rank: 20", "rank: 30")));
  assert.equal(only(f, "share rank").length, 1, f.join("\n"));
});

test("a page that names no realization and carries neither section passes", () => {
  const f = failures(tree((m) => {
    edit(RQ, "realization: Verified\n", "")(m);
    edit(RQ, /## Realization[\s\S]*$/, "")(m);
    edit(BK, "realization: Runs end to end\n", "")(m);
    edit(BK, /## Realization[\s\S]*$/, "")(m);
    return m;
  }));
  assert.deepEqual(f, []);
});

const dropEvidence = edit(RQ, /## Evidence[\s\S]*$/, "");
const row = (shows) => `| Timing test of the booking confirmation | ${shows} | https://example.org/booking/blob/0a1b2c3/test/confirm.test.js |`;

test("a page at a satisfies level with no evidence row fails once", () => {
  const f = failures(tree((m) => { edit(RQ, "realization: Verified", "realization: Built")(m); return dropEvidence(m); }));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/requirements\/booking-confirmed-within-two-seconds\.md: `realization` names "Built", whose `evidence` is `satisfies`, and ## Evidence has no row; a page shows what its level asks \(R16\)$/);
});

test("a page at a verifies level whose rows only satisfy fails once", () => {
  const f = failures(tree(edit(RQ, "| verifies |", "| satisfies |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /: `realization` names "Verified", whose `evidence` is `verifies`, and no ## Evidence row's `Shows` is `verifies`; a page shows what its level asks \(R16\)$/);
});

test("a page that names a realization and says nothing of it fails once", () => {
  const f = failures(tree(edit(RQ, /## Realization\n\n.*\n\n/, "")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /: names a `realization` and has no ## Realization; a realized page says what is realized and what is missing \(R16\)$/);
});

test("evidence on a page that names no realization fails once", () => {
  const a = failures(tree(edit(RQ, "realization: Verified\n", "")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /: has ## Evidence and names no `realization`; the sections belong to a realization \(R16\)$/);
  const b = failures(tree((m) => { edit(RQ, "realization: Verified\n", "")(m); return dropEvidence(m); }));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /: has ## Realization and names no `realization`; the sections belong to a realization \(R16\)$/);
});

test("a satisfies level is met by a verifying row, and a none level may list rows", () => {
  assert.deepEqual(failures(tree(edit(RQ, "realization: Verified", "realization: Built"))), []);
  assert.deepEqual(failures(tree(edit(RQ, "realization: Verified", "realization: Not started"))), []);
});

test("a use case is held as a requirement is", () => {
  const f = failures(tree(edit(BK, "| verifies |", "| satisfies |")));
  assert.equal(f.length, 1, f.join("\n"));
  assert.match(f[0], /^model\/use-cases\/book-a-table\.md: `realization` names "Runs end to end", whose `evidence` is `verifies`, and no ## Evidence row's `Shows` is `verifies`; a page shows what its level asks \(R16\)$/);
});

test("a fault another check owns is not judged again", () => {
  const a = failures(tree(edit(RQ, "realization: Verified", "realization: Shipped")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /\(R4\)$/);
  const b = failures(tree(edit(RQ, "| verifies |", "| tests |")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /\(R8\)$/);
  const c = failures(tree(edit(`${RL}/verified.md`, "evidence: verifies\n", "")));
  assert.equal(c.length, 1, c.join("\n"));
  assert.match(c[0], /verified\.md: no `evidence`, which requirement-realization-schema\.md requires — one of `none`, `satisfies`, `verifies`$/);
});

test("an Evidence table with other columns is not read as evidence", () => {
  const f = failures(tree(edit(RQ, "| What | Shows | URL |", "| What | Kind | URL |")));
  assert.ok(f.some((x) => /Shows/.test(x)), f.join("\n"));
  assert.equal(only(f, "no ## Evidence row").length, 0, f.join("\n"));
});

test("an Evidence section of prose alone counts as no rows", () => {
  const prose = (level) => (m) => { edit(RQ, "realization: Verified", `realization: ${level}`)(m); return edit(RQ, /## Evidence[\s\S]*$/, "## Evidence\n\nNone yet.\n")(m); };
  const a = failures(tree(prose("Built")));
  assert.equal(a.length, 1, a.join("\n"));
  assert.match(a[0], /^model\/requirements\/booking-confirmed-within-two-seconds\.md: `realization` names "Built", whose `evidence` is `satisfies`, and ## Evidence has no row; a page shows what its level asks \(R16\)$/);
  const b = failures(tree(prose("Verified")));
  assert.equal(b.length, 1, b.join("\n"));
  assert.match(b[0], /^model\/requirements\/booking-confirmed-within-two-seconds\.md: `realization` names "Verified", whose `evidence` is `verifies`, and no ## Evidence row's `Shows` is `verifies`; a page shows what its level asks \(R16\)$/);
});
