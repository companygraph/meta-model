// judge/known.md, the flags an instance's owner has decided: the hash a row is keyed on and the
// check every row is held to. The fixture is the example instance, read as `judge` and `check`
// read an instance; the design is
// docs/superpowers/specs/2026-10-04-the-judge-knows-its-flags-design.md.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { modelAt } from "./seats-fixture.mjs";
import { EXAMPLE_PACKS } from "./example.mjs";
import { instanceAt } from "../lib/history.mjs";
import { writingRulesOf } from "../lib/questions.mjs";
import { KNOWN, KNOWN_COLUMNS, knownHashOf, checkKnown } from "../lib/known.mjs";

const fixture = () => modelAt(fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-known-")));
const DECISION = "decisions/2022-billing-leaves-the-monolith.md";
const EXPERIENCE = "profiles/mira-halvorsen/experiences/2018-northwind-atelier.md";
// The hash a row needs to be current, computed the way `judge` prints it.
const hashFor = (instance, page, type, n) =>
  knownHashOf(/** @type {string} */ (instance.files.get(page)), writingRulesOf(instance.schemas.get(`${type}-schema.md`))[n - 1]);
const header = `| ${KNOWN_COLUMNS.join(" | ")} |\n| ${KNOWN_COLUMNS.map(() => "---").join(" | ")} |`;
const fileOf = (...rows) => `# Known judge flags\n\n${header}\n${rows.map((r) => `| ${r.join(" | ")} |`).join("\n")}\n`;
const decisionRow = (instance, over = {}) => {
  const row = { Entity: "Billing leaves the monolith", Owner: "", Rule: "decision r3", Verdict: "false", Why: "The question states no reason.", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: hashFor(instance, DECISION, "decision", 3), ...over };
  return KNOWN_COLUMNS.map((c) => row[c]);
};

test("the hash is sixteen hex characters over the page and the rule's words, whatever the line ends", () => {
  const h = knownHashOf("# A\n\nText.\n", "The page says one thing.");
  assert.match(h, /^[0-9a-f]{16}$/);
  assert.equal(knownHashOf("# A\r\n\r\nText.\r\n", "The page says one thing."), h, "a Windows checkout keys the same row");
  assert.notEqual(knownHashOf("# A\n\nText!\n", "The page says one thing."), h, "a page edit changes it");
  assert.notEqual(knownHashOf("# A\n\nText.\n", "The page says another thing."), h, "a reworded rule changes it");
});

test("a current row passes, and an owned type's row resolves within its owner", () => {
  const instance = instanceAt(fixture());
  const experience = KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: "Mira Halvorsen", Rule: "experience r6", Verdict: "accepted", Why: "Kept as written.", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: hashFor(instance, EXPERIENCE, "experience", 6) })[c]);
  assert.deepEqual(checkKnown(fileOf(decisionRow(instance), experience), instance), { failures: [], notes: [] });
});

test("an empty table passes and notes nothing", () => {
  assert.deepEqual(checkKnown(`# Known judge flags\n\n${header}\n`, instanceAt(fixture())), { failures: [], notes: [] });
});

test("cells in backticks and a hash in capitals read as written bare", () => {
  const instance = instanceAt(fixture());
  const row = decisionRow(instance, { Rule: "`decision r3`", Seat: "`Backend Engineer`", Hash: hashFor(instance, DECISION, "decision", 3).toUpperCase() });
  assert.deepEqual(checkKnown(fileOf(row), instance), { failures: [], notes: [] });
});

test("a file with no table, or with other columns, fails once and names the nine", () => {
  const instance = instanceAt(fixture());
  assert.deepEqual(checkKnown("# Known judge flags\n\nNothing yet.\n", instance).failures,
    [`${KNOWN}: holds no table; it is one table with the columns Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash`]);
  const without = "# Known judge flags\n\n| Entity | Rule | Verdict | Why | Seat | Profile | Date | Hash |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| A | decision r3 | false | x | Backend Engineer | Mira Halvorsen | 2026-10-04 | 0123456789abcdef |\n| B | decision r4 | false | x | Backend Engineer | Mira Halvorsen | 2026-10-04 | 0123456789abcdef |\n";
  assert.deepEqual(checkKnown(without, instance).failures,
    [`${KNOWN}: the table's columns are Entity | Rule | Verdict | Why | Seat | Profile | Date | Hash, and a known flag takes Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash`]);
});

test("each broken cell fails with its own message, on its row", () => {
  const instance = instanceAt(fixture());
  const cases = [
    [{ Entity: "No such decision" }, `${KNOWN}: row 1: Entity "No such decision" names no decision`],
    [{ Owner: "Mira Halvorsen" }, `${KNOWN}: row 1: Entity "Billing leaves the monolith" is a decision, which nothing owns, and its row names "Mira Halvorsen" as its owner`],
    [{ Rule: "decision 3" }, `${KNOWN}: row 1: Rule "decision 3" is not <type> r<N>`],
    [{ Rule: "decision r99" }, `${KNOWN}: row 1: decision has no writing rule r99`],
    [{ Verdict: "wrong" }, `${KNOWN}: row 1: Verdict "wrong" is neither false nor accepted`],
    [{ Why: "" }, `${KNOWN}: row 1: Why is empty, and a row says why`],
    [{ Seat: "Nobody" }, `${KNOWN}: row 1: Seat "Nobody" names no seat`],
    [{ Profile: "Nobody" }, `${KNOWN}: row 1: Profile "Nobody" names no profile`],
    [{ Profile: "Tomas Reyes" }, `${KNOWN}: row 1: Tomas Reyes does not hold the seat Backend Engineer: its \`seats\` does not name it`],
    [{ Date: "2026-02-30" }, `${KNOWN}: row 1: Date "2026-02-30" is not a day, YYYY-MM-DD`],
    [{ Hash: "abc" }, `${KNOWN}: row 1: Hash "abc" is not sixteen hex characters`],
  ];
  for (const [over, message] of cases)
    assert.deepEqual(checkKnown(fileOf(decisionRow(instance, over)), instance).failures, [message], JSON.stringify(over));
});

test("an owned type's row without its owner, or with one that does not own it, fails", () => {
  const instance = instanceAt(fixture());
  const row = (owner) => KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: owner, Rule: "experience r6", Verdict: "false", Why: "x", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: "0123456789abcdef" })[c]);
  assert.deepEqual(checkKnown(fileOf(row("")), instance).failures,
    [`${KNOWN}: row 1: Entity "Rebuilding the order pipeline" is a experience, which a profile owns, and the row names no profile`]);
  assert.deepEqual(checkKnown(fileOf(row("Nobody")), instance).failures, [`${KNOWN}: row 1: Owner "Nobody" names no profile`]);
  assert.deepEqual(checkKnown(fileOf(row("Tomas Reyes")), instance).failures,
    [`${KNOWN}: row 1: Entity "Rebuilding the order pipeline" names no experience of profiles/tomas-reyes`]);
});

test("a second row for the same page and rule fails, naming the first", () => {
  const instance = instanceAt(fixture());
  assert.deepEqual(checkKnown(fileOf(decisionRow(instance), decisionRow(instance, { Verdict: "accepted" })), instance).failures,
    [`${KNOWN}: row 2: names Billing leaves the monolith and decision r3 again, as row 1 does`]);
});

test("a row whose page or rule changed is noted as lapsed and fails nothing", () => {
  const dir = fixture();
  const before = instanceAt(dir);
  const text = fileOf(decisionRow(before));
  fs.appendFileSync(path.join(dir, "model", DECISION), "\nOne more line.\n");
  assert.deepEqual(checkKnown(text, instanceAt(dir)), { failures: [], notes: [`${KNOWN}: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04`] });
  const reworded = instanceAt(fixture());
  reworded.schemas.set("decision-schema.md", /** @type {string} */ (reworded.schemas.get("decision-schema.md")).replace(/## Writing rules\n\n- /, "## Writing rules\n\n- A rule inserted above.\n- "));
  assert.deepEqual(checkKnown(text, reworded).notes, [`${KNOWN}: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04`],
    "a rule inserted above moves r3 onto other words");
});

test("a lapsed row of an owned type names its owner", () => {
  const instance = instanceAt(fixture());
  const row = KNOWN_COLUMNS.map((c) => ({ Entity: "Rebuilding the order pipeline", Owner: "Mira Halvorsen", Rule: "experience r6", Verdict: "false", Why: "x", Seat: "Backend Engineer", Profile: "Mira Halvorsen", Date: "2026-10-04", Hash: "0123456789abcdef" })[c]);
  assert.deepEqual(checkKnown(fileOf(row), instance).notes,
    [`${KNOWN}: Rebuilding the order pipeline in Mira Halvorsen experience r6: lapsed, the page or the rule changed since 2026-10-04`]);
});

// The checker as CI calls it, on the fixture with a manifest naming this release.
const checker = fileURLToPath(new URL("../bin/check-instance.mjs", import.meta.url));
const VERSION = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
const checkable = () => {
  const dir = fixture();
  fs.writeFileSync(path.join(dir, ".companygraph", "manifest.json"), JSON.stringify({ tooling: VERSION, units: "meta", packs: EXAMPLE_PACKS }));
  return dir;
};
const run = (dir) => spawnSync(process.execPath, [checker, dir], { encoding: "utf8" });
const write = (dir, text) => {
  fs.mkdirSync(path.join(dir, "judge"), { recursive: true });
  fs.writeFileSync(path.join(dir, KNOWN), text);
};

test("check passes an instance with no judge/known.md as before, and one whose rows are current", () => {
  const dir = checkable();
  const plain = run(dir);
  assert.equal(plain.status, 0, plain.stderr);
  assert.doesNotMatch(plain.stdout, /known\.md/);
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  const known = run(dir);
  assert.equal(known.status, 0, known.stderr);
  assert.doesNotMatch(known.stdout, /known\.md/);
});

test("check fails a broken row and notes a lapsed one", () => {
  const dir = checkable();
  write(dir, fileOf(decisionRow(instanceAt(dir), { Seat: "Nobody" })));
  const broken = run(dir);
  assert.equal(broken.status, 1);
  assert.match(broken.stderr, /judge\/known\.md: row 1: Seat "Nobody" names no seat/);
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  fs.appendFileSync(path.join(dir, "model", DECISION), "\nOne more line.\n");
  const lapsed = run(dir);
  assert.equal(lapsed.status, 0, lapsed.stderr);
  assert.match(lapsed.stdout, /^ {2}noted:$/m);
  assert.match(lapsed.stdout, /^ {4}judge\/known\.md: Billing leaves the monolith decision r3: lapsed, the page or the rule changed since 2026-10-04$/m);
});

test("a model that does not parse is the model's failure, and judge/known.md is noted as not read", () => {
  const dir = checkable();
  write(dir, fileOf(decisionRow(instanceAt(dir))));
  // Two decisions of one name: parseInstance throws on R2 before any row could be read.
  fs.copyFileSync(path.join(dir, "model", DECISION), path.join(dir, "model", "decisions", "2022-billing-leaves-the-monolith-again.md"));
  const result = run(dir);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /judge\/known\.md: not read, since the model does not parse: /);
  assert.doesNotMatch(result.stderr, /judge\/known\.md: row/);
});
