// What a pull request may do to a page, held between the base of its range and its head: a
// decision is kept as written and never deleted, and a label stays with its item and is never
// used again. The checks are pure functions of the pages a range changed, as `idChangesOf` is, so
// the cases are PageChange fixtures; the history a reuse is read from is handed in.
import test from "node:test";
import assert from "node:assert/strict";
import { keptChangesOf, labelChangesOf, labelsOf, PACKS, TYPES } from "../lib/checks.mjs";

const DECISION = "model/decisions/2026-vendored-core.md";
const call = ({ id = "id: 01a0dd35-9358-7f34-b9f9-9c998df35ff1\n", status = "Standing", by = "Owner", why = "It holds still under every model.", consequences = "We keep a copy per instance." } = {}) =>
  `---\n${id}source: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: ${status}\nby: ${by}\n---\n\n# Core is vendored\n\n> We vendor core.\n\n## Why\n\n${why}\n\n## Consequences\n\n${consequences}\n`;
const change = (before, after, path = DECISION) => ({ before: path, after: path, beforeText: before, afterText: after });
const kept = (changes, deleted = []) => keptChangesOf(changes, deleted, "main");

test("a decision whose status moves and nothing else passes, and so does one gaining its first id", () => {
  assert.deepEqual(kept([change(call(), call({ status: "Revised" }))]), []);
  assert.deepEqual(kept([change(call({ id: "" }), call())]), []);
});

test("a decision whose other field changes fails, naming the field", () => {
  assert.deepEqual(kept([change(call(), call({ by: "Architect" }))]), [
    `${DECISION}: \`by\` changed since main; a decision is kept as written, and \`status\` is the one field that moves (R16)`,
  ]);
});

test("a decision whose body is reworded fails, with its status moved or not", () => {
  const msg = `${DECISION}: its text changed since main; a decision is kept as written, and only the change that moves \`status\` may add one dated sentence at the end of "## Consequences" (R16)`;
  assert.deepEqual(kept([change(call(), call({ why: "It holds still." }))]), [msg]);
  assert.deepEqual(kept([change(call(), call({ status: "Revised", why: "It holds still." }))]), [msg]);
});

test("the change that moves status may close Consequences with one dated sentence, in the paragraph or after it", () => {
  const base = call();
  assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences: "We keep a copy per instance. Dropped on October 3, 2026, with nothing to replace it." }))]), []);
  assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences: "We keep a copy per instance.\n\nDropped on 2026-10-03." }))]), []);
});

test("a closing sentence fails without the status moving, without a date, or as two sentences", () => {
  const base = call();
  for (const [status, consequences] of [
    ["Standing", "We keep a copy per instance. Dropped on 2026-10-03."],
    ["Dropped", "We keep a copy per instance. Dropped, with nothing to replace it."],
    ["Dropped", "We keep a copy per instance. Dropped on 2026-10-03. Nothing replaced it."],
  ])
    assert.equal(kept([change(base, call({ status, consequences }))]).length, 1, consequences);
});

test("a deleted decision fails, and a deleted page of another type does not", () => {
  assert.deepEqual(kept([], [{ before: DECISION, beforeText: call() }, { before: "model/skills/java.md", beforeText: "# Java\n" }]), [
    `${DECISION}: deleted in this change; a decision is kept for as long as the company exists, and one that no longer holds says so in \`status\` (R16)`,
  ]);
});

test("a page of a type not kept as written may change freely", () => {
  assert.deepEqual(kept([change("# Java\n\n> A language.\n", "# Java\n\n> A language on the JVM.\n", "model/skills/java.md")]), []);
});

test("a decision whose line ends differ between base and head and whose words do not passes", () => {
  assert.deepEqual(kept([change(call().replace(/\n/g, "\r\n"), call({ status: "Revised" }))]), []);
});

// --- Labels ----------------------------------------------------------------------------------

const TYPES_WITH_SOFTWARE = [...TYPES, ...PACKS.software];
const AGG = "model/bounded-contexts/billing/aggregates/invoice.md";
const FD = "model/feature-designs/issue-an-invoice.md";
const invariants = (rows) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n${rows.map(([l, t]) => `| ${l} | ${t} |\n`).join("")}`;
const scenarios = (items) => `---\nsource: Local\n---\n\n# Issue an invoice\n\n> Invoices go out.\n\n## Scenarios\n\n${items.map(([l, t, body]) => `### ${l}: ${t}\n\n${body}\n\n`).join("")}`;
const labels = (changes, historyOf) => labelChangesOf(changes, "main", { types: TYPES_WITH_SOFTWARE, historyOf });

test("a label kept with its text reworded passes, and a new label for a new rule passes", () => {
  const before = invariants([["INV-1", "A total never changes."]]);
  assert.deepEqual(labels([change(before, invariants([["INV-1", "An issued total never changes."], ["INV-2", "One customer."]]), AGG)]), []);
});

test("a rule carried under a new label while its old label is gone fails as a relabel", () => {
  const f = labels([change(invariants([["INV-1", "A total never changes."]]), invariants([["INV-9", "A total never changes."]]), AGG)]);
  assert.deepEqual(f, [`${AGG}: "INV-9" under ## Invariants carries what "INV-1" carried at main, and "INV-1" is gone; a label stays with its item, and a new item takes a new label (R16)`]);
});

test("two kept labels that swap their texts fail once", () => {
  const f = labels([change(invariants([["INV-1", "A total never changes."], ["INV-2", "One customer."]]), invariants([["INV-1", "One customer."], ["INV-2", "A total never changes."]]), AGG)]);
  assert.deepEqual(f, [`${AGG}: "INV-1" and "INV-2" under ## Invariants swapped what they carry since main; a label stays with its item (R16)`]);
});

test("a label the page carried at an earlier commit and removed is not used again", () => {
  const history = () => [invariants([["INV-1", "A total never changes."]]), invariants([["INV-1", "A total never changes."], ["INV-2", "A rule since removed."]])];
  const f = labels([change(invariants([["INV-1", "A total never changes."]]), invariants([["INV-1", "A total never changes."], ["INV-2", "A new rule."]]), AGG)], history);
  assert.deepEqual(f, [`${AGG}: "INV-2" under ## Invariants was carried by this page before and removed; a removed item's label is not used again (R16)`]);
});

test("a scenario's label is held the same way, its text read from its title and the lines under it", () => {
  const body = "Given a period,\nWhen it closes,\nThen invoices go out.";
  const f = labels([change(scenarios([["SC-1", "A period closes", body]]), scenarios([["SC-2", "A period closes", body]]), FD)]);
  assert.equal(f.length, 1);
  assert.match(f[0], /"SC-2" under ## Scenarios carries what "SC-1" carried at main/);
  assert.deepEqual([...labelsOf(scenarios([["SC-1", "A period closes", body]]), { section: "Scenarios", heading: true })],
    [["SC-1", "A period closes Given a period, When it closes, Then invoices go out."]]);
});

test("the history is not read where no label is new", () => {
  let read = 0;
  labels([change(invariants([["INV-1", "A."]]), invariants([["INV-1", "B."]]), AGG)], () => { read++; return []; });
  assert.equal(read, 0);
});
