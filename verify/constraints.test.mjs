// What a schema declares beyond its references, read once for every reader. The instance checks
// hold a page to a declared join and a declared list kind, and a consumer that serves or draws
// the vocabulary wants the same declarations as data. Both read them through the functions
// tested here, so a check and a diagram can never read one Description two ways.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { listsDeclarationOf, underDeclarationOf, listKindOf, constraintsOf } from "../lib/instance.mjs";

test("the three openers are read off the front of a Description, backticks and all", () => {
  assert.deepEqual(listsDeclarationOf("`skills` lists `Skill`. The period the fact comes from."), { field: "skills", by: "Skill" });
  assert.equal(listsDeclarationOf("The period; `skills` lists `Skill`."), null, "only an opener declares");
  assert.equal(listsDeclarationOf("`skills` list `Skill`. Misspelled, so prose."), null);

  assert.deepEqual(underDeclarationOf("Table. Under `## Skills`. One row per fact."), { under: "Skills" });
  assert.equal(underDeclarationOf("Table. One row per fact, under `## Skills`."), null);
  assert.equal(underDeclarationOf("Under `## Skills`. No Table opener before it."), null);

  assert.deepEqual(listKindOf("Bulleted. One sentence each."), { kind: "Bulleted", after: null });
  assert.deepEqual(listKindOf("Grouped. Numbered. What is done."), { kind: "Numbered", after: "Grouped" });
  assert.deepEqual(listKindOf("Table. Bulleted. A schema's mistake, read so it can be named."), { kind: "Bulleted", after: "Table" });
  assert.equal(listKindOf("A list, one sentence each."), null);
  assert.equal(listKindOf(undefined), null);
});

const core = new Map(fs.readdirSync(new URL("../core/", import.meta.url))
  .map((f) => [f, fs.readFileSync(new URL(`../core/${f}`, import.meta.url), "utf8")]));

test("constraintsOf gives every type its references with how many a page may hold", () => {
  const c = constraintsOf(core);
  const ref = (type, via) => c[type].references.find((r) => r.via === via);
  // A frontmatter field: required or not, one value or a list. R9 holds a required list to one entry.
  assert.deepEqual(ref("phase", "gate-approvers"), { via: "gate-approvers", form: "ref", target: "role", array: true, required: true, min: 1, max: null });
  assert.deepEqual(ref("phase", "owner"), { via: "owner", form: "ref", target: "role", array: false, required: true, min: 1, max: 1 });
  assert.deepEqual(ref("experience", "organization"), { via: "organization", form: "ref?", target: "identity", array: false, required: false, min: 0, max: 1 });
  assert.deepEqual(ref("role", "requires"), { via: "requires", form: "ref", target: "skill", array: true, required: false, min: 0, max: null });
  // A column or a grouped heading: `required` is of each row, and nothing bounds the rows.
  assert.deepEqual(ref("profile", "Skills.Level"), { via: "Skills.Level", form: "qualifier", target: "proficiency-level", array: false, required: true, min: 0, max: null });
  assert.deepEqual(ref("experience", "Achievements.Kind"), { via: "Achievements.Kind", form: "ref", target: "achievement-kind", array: false, required: false, min: 0, max: null });
});

test("constraintsOf gives the joins and the list kinds core declares", () => {
  const c = constraintsOf(core);
  assert.deepEqual(c.profile.joins, [
    { kind: "under", section: "Evidence", under: "Skills" },
    { kind: "lists", section: "Evidence", column: "Experience", field: "skills", by: "Skill" },
  ]);
  assert.deepEqual(c.skill.joins, []);
  assert.deepEqual(c.phase.lists, [
    { section: "Activities", kind: "Numbered", required: true, min: 1 },
    { section: "What it never does", kind: "Bulleted", required: true, min: 1 },
    { section: "Gate", kind: "Bulleted", required: true, min: 1 },
  ]);
  assert.deepEqual(c.experience.lists, [{ section: "Achievements", kind: "Bulleted", required: false, min: 0 }]);
  assert.deepEqual(c.vision.lists, []);
});

test("every type core declares is there, and the answer is plain data", () => {
  const c = constraintsOf(core);
  const types = [...core.keys()].filter((f) => f.endsWith("-schema.md")).map((f) => f.replace(/-schema\.md$/, "")).sort();
  assert.deepEqual(Object.keys(c).sort(), types);
  assert.deepEqual(JSON.parse(JSON.stringify(c)), c);
});

test("the checks read the declarations through the same functions, never through a pattern of their own", () => {
  const src = fs.readFileSync(new URL("../lib/checks.mjs", import.meta.url), "utf8");
  for (const name of ["listsDeclarationOf", "underDeclarationOf", "listKindOf"]) assert.ok(src.includes(name), name);
  // A pattern of the checks' own would match an opener's fixed word: a regular expression
  // holding `lists`, `Under`, `Bulleted` or `Numbered`. Prose and messages may say the words.
  const patterns = [...src.matchAll(/\/\^[^\n]*?\/[a-z]*/g)].map((m) => m[0]);
  assert.ok(patterns.length > 0, "the checks hold no regular expression at all — has this test gone blind?");
  assert.deepEqual(patterns.filter((p) => /lists|Under|Bulleted|Numbered/.test(p)), []);
});
