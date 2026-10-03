// What a pull request may do to a page, held between the base of its range and its head: a
// decision is kept as written and never deleted, and a label stays with its item and is never
// used again. The checks are pure functions of the pages a range changed, as `idChangesOf` is, so
// the cases are PageChange fixtures; the history a reuse is read from is handed in.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { keptChangesOf, labelChangesOf, labelsOf, PACKS, TYPES } from "../lib/checks.mjs";

const DECISION = "model/decisions/2026-vendored-core.md";
const list = (field, values) => (values.length ? `${field}:\n${values.map((v) => `  - ${v}\n`).join("")}` : "");
const call = ({ id = "id: 01a0dd35-9358-7f34-b9f9-9c998df35ff1\n", status = "Standing", by = "Owner", serves = [], upholds = [], why = "It holds still under every model.", consequences = "We keep a copy per instance.", bears = [] } = {}) =>
  `---\n${id}source: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: ${status}\nby: ${by}\n${list("serves", serves)}${list("upholds", upholds)}---\n\n# Core is vendored\n\n> We vendor core.\n\n## Why\n\n${why}\n\n## Consequences\n\n${consequences}\n` +
  (bears.length ? `\n## Bears on\n\n| Type | Entity | Owner | How |\n| --- | --- | --- | --- |\n${bears.map((r) => `| ${r.join(" | ")} |\n`).join("")}` : "");
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

test("a closing sentence with a common abbreviation in it is one sentence", () => {
  const base = call();
  for (const consequences of [
    "We keep a copy per instance. Dropped on Oct. 3, 2026.",
    "We keep a copy per instance. Dropped in 2026, i.e. the account closed.",
    "We keep a copy per instance. Dropped in 2026 for a reason outside the call, e.g. a vendor leaving.",
  ])
    assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences }))]), [], consequences);
});

test("a closing sentence that is not one dated sentence is told so, and not told to add one", () => {
  const base = call();
  assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences: "We keep a copy per instance. Dropped, with nothing to replace it." }))]), [
    `${DECISION}: what this change adds at the end of "## Consequences" is not one sentence carrying a year; a decision is kept as written, and the change that moves \`status\` adds one dated sentence there and nothing else (R16)`,
  ]);
  assert.deepEqual(kept([change(base, call({ consequences: "We keep a copy per instance. Dropped on 2026-10-03." }))]), [
    `${DECISION}: this change adds to the end of "## Consequences" and leaves \`status\` as it was; a decision is kept as written, and only the change that moves \`status\` may add one dated sentence there (R16)`,
  ]);
});

test("whitespace at a line's end and a final newline are not a rewrite, and a changed word still is", () => {
  assert.deepEqual(kept([change(call(), `${call()}\n`)]), []);
  assert.deepEqual(kept([change(call(), call().replace(/\n$/, ""))]), []);
  assert.deepEqual(kept([change(call(), call().replace("We vendor core.", "We vendor core.  "))]), []);
  assert.equal(kept([change(call(), `${call({ why: "It holds still under any model." })}\n`)]).length, 1);
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

test("a sentence ending in a capital letter or in No. is a sentence end, and the abbreviations a date meets are not", () => {
  const base = call();
  for (const consequences of [
    "We keep a copy per instance. Dropped in 2026 for plan B. Nothing replaced it.",
    "We keep a copy per instance. Dropped in 2026, and the answer was No. Nothing replaced it.",
  ])
    assert.equal(kept([change(base, call({ status: "Dropped", consequences }))]).length, 1, consequences);
  for (const consequences of [
    "We keep a copy per instance. Dropped on Sept. 3, 2026, i.e. with the account closed.",
    "We keep a copy per instance. Dropped in 2026 for vendors, cloud hosts etc. that left.",
  ])
    assert.deepEqual(kept([change(base, call({ status: "Dropped", consequences }))]), [], consequences);
});

test("a renamed decision whose content is the same passes", () => {
  assert.deepEqual(kept([{ before: DECISION, after: "model/decisions/2026-core-is-vendored-everywhere.md", beforeText: call(), afterText: call() }]), []);
});


// --- A name a decision carries follows the entity it names ---------------------------------

// A decision names entities by their canonical names, so renaming or deleting one would leave a
// stale name that R4 fails and the kept check refused to repair. A name may follow its entity: to
// the new name where the entity kept its id, or out where the entity is gone. What the decision
// declares a reference is read from its schema, and the trees at base and head are handed in.
const DECISION_SCHEMA = fs.readFileSync(new URL("../core/decision-schema.md", import.meta.url), "utf8");
const entity = (id, name) => `---\nid: ${id}\nsource: Local\n---\n\n# ${name}\n\n> A statement.\n`;
const O1 = "01a0dd35-0000-7000-8000-000000000001", O2 = "01a0dd35-0000-7000-8000-000000000002", P1 = "01a0dd35-0000-7000-8000-000000000003", V1 = "01a0dd35-0000-7000-8000-000000000004", V2 = "01a0dd35-0000-7000-8000-000000000005";
const followed = (changes, base, head) => keptChangesOf(changes, [], "main", {
  schemaOf: (type) => (type === "decision" ? DECISION_SCHEMA : null),
  treeOf: (side) => new Map(Object.entries(side === "base" ? base : head)),
});
const FIELD = (field) => `${DECISION}: \`${field}\` changed since main; a decision is kept as written, and \`status\` is the one field that moves (R16)`;
const TEXT = `${DECISION}: its text changed since main; a decision is kept as written, and only the change that moves \`status\` may add one dated sentence at the end of "## Consequences" (R16)`;

test("a name in a reference field follows its entity's rename, the id the same and the old name gone", () => {
  const base = { "model/strategic-objectives/old.md": entity(O1, "Old") };
  const head = { "model/strategic-objectives/new.md": entity(O1, "New") };
  assert.deepEqual(followed([change(call({ serves: ["Old"] }), call({ serves: ["New"] }))], base, head), []);
});

test("a name in a reference field leaves with its entity's deletion", () => {
  const base = { "model/values/candor.md": entity(V1, "Candor"), "model/values/rigor.md": entity(V2, "Rigor") };
  const head = { "model/values/rigor.md": entity(V2, "Rigor") };
  assert.deepEqual(followed([change(call({ upholds: ["Candor", "Rigor"] }), call({ upholds: ["Rigor"] }))], base, head), []);
  assert.deepEqual(followed([change(call({ upholds: ["Candor"] }), call())], base, head), []);
});

test("a reference moved to another entity, or a name dropped while its entity stands, still fails", () => {
  const both = { "model/strategic-objectives/old.md": entity(O1, "Old"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  assert.deepEqual(followed([change(call({ serves: ["Old"] }), call({ serves: ["Other"] }))], both, both), [FIELD("serves")]);
  assert.deepEqual(followed([change(call({ serves: ["Old", "Other"] }), call({ serves: ["Other"] }))], both, both), [FIELD("serves")]);
  const renamed = { "model/strategic-objectives/new.md": entity(O1, "New"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  assert.deepEqual(followed([change(call({ serves: ["Old"] }), call({ serves: ["Other"] }))], both, renamed), [FIELD("serves")]);
  assert.deepEqual(followed([change(call({ serves: ["Old"] }), call({ serves: ["New", "Other"] }))], both, renamed), [FIELD("serves")]);
});

test("a name in a Bears on row follows its entity's rename and deletion, and nothing else in the row moves", () => {
  const base = { "model/products/ledger.md": entity(P1, "Ledger"), "model/products/till.md": entity(O2, "Till") };
  const head = { "model/products/books.md": entity(P1, "Books") };
  const was = call({ bears: [["product", "Ledger", "", "Made it"], ["product", "Till", "", "Ended it"]] });
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Books", "", "Made it"], ["product", "Till", "", "Ended it"]] }))], base, head), []);
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Books", "", "Made it"]] }))], base, head), []);
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Books", "", "Changed it"]] }))], base, head), [TEXT]);
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Books", "", "Made it"], ["product", "Ledger", "", "Made it"]] }))], base, head), [TEXT]);
});

test("a name dropped while its entity was only renamed fails, in a field and in a Bears on row", () => {
  const base = { "model/strategic-objectives/old.md": entity(O1, "Old"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  const head = { "model/strategic-objectives/new.md": entity(O1, "New"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  assert.deepEqual(followed([change(call({ serves: ["Old", "Other"] }), call({ serves: ["Other"] }))], base, head), [FIELD("serves")]);
  const products = { "model/products/ledger.md": entity(P1, "Ledger"), "model/products/till.md": entity(V1, "Till") };
  const renamed = { "model/products/books.md": entity(P1, "Books"), "model/products/till.md": entity(V1, "Till") };
  const was = call({ bears: [["product", "Ledger", "", "Made it"], ["product", "Till", "", "Ended it"]] });
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Till", "", "Ended it"]] }))], products, renamed), [TEXT]);
});

test("a name dropped because its entity no longer exists at the head passes, in a field and in a Bears on row", () => {
  const base = { "model/strategic-objectives/old.md": entity(O1, "Old"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  const head = { "model/strategic-objectives/other.md": entity(O2, "Other") };
  assert.deepEqual(followed([change(call({ serves: ["Old", "Other"] }), call({ serves: ["Other"] }))], base, head), []);
  const products = { "model/products/ledger.md": entity(P1, "Ledger"), "model/products/till.md": entity(V1, "Till") };
  const was = call({ bears: [["product", "Ledger", "", "Made it"], ["product", "Till", "", "Ended it"]] });
  assert.deepEqual(followed([change(was, call({ bears: [["product", "Till", "", "Ended it"]] }))], products, { "model/products/till.md": entity(V1, "Till") }), []);
});

test("a reference field rewritten in another YAML shape is the same call, and a changed value is not", () => {
  const both = { "model/strategic-objectives/old.md": entity(O1, "Old"), "model/strategic-objectives/other.md": entity(O2, "Other") };
  const block = call({ serves: ["Old", "Other"] });
  const flow = block.replace("serves:\n  - Old\n  - Other\n", "serves: [Old, \"Other\"]\n");
  assert.notEqual(flow, block);
  assert.deepEqual(followed([change(block, flow)], both, both), []);
  assert.deepEqual(followed([change(block, flow.replace("Old", "Elder"))], both, both), [FIELD("serves")]);
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

test("three kept labels that rotate their texts fail, whatever the length of the cycle", () => {
  const a = "A total never changes.", b = "One customer.", c = "One currency.";
  const f = labels([change(invariants([["INV-1", a], ["INV-2", b], ["INV-3", c]]), invariants([["INV-1", b], ["INV-2", c], ["INV-3", a]]), AGG)]);
  assert.equal(f.length, 3, f.join("\n"));
  assert.match(f[0], /"INV-1" under ## Invariants carries what "INV-2" carried at main; a label stays with its item \(R16\)/);
});

test("labels whose base ends its lines in CRLF and whose head in LF, and whose words are the same, pass", () => {
  const rows = [["INV-1", "A total never changes."], ["INV-2", "One customer."]];
  assert.deepEqual(labels([change(invariants(rows).replace(/\n/g, "\r\n"), invariants(rows), AGG)]), []);
  const body = "Given a period,\nWhen it closes,\nThen invoices go out.";
  assert.deepEqual(labels([change(scenarios([["SC-1", "A period closes", body]]).replace(/\n/g, "\r\n"), scenarios([["SC-1", "A period closes", body]]), FD)]), []);
});
