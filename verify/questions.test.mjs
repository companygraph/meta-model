// The writing rules, asked: what lib/questions.mjs reads out of a schema and a page, the
// questions it derives from an instance, and the report it makes of the answers. Nothing here
// reaches a judge; the module opens no socket, so its whole behavior is tested on files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { writingRulesOf, purposeOf, bulletsOf, questionsOf, STATE_BUDGET, reportOf, BAND, LOWEST } from "../lib/questions.mjs";
import { parseInstance } from "../lib/instance.mjs";

const schema = (n) => fs.readFileSync(new URL(`../core/${n}-schema.md`, import.meta.url), "utf8");

test("a writing rule is one bullet, its wrapped lines joined with one space", () => {
  const rules = writingRulesOf(schema("experience"));
  const bullets = schema("experience").split("## Writing rules")[1].split("\n").filter((l) => /^- \S/.test(l)).length;
  assert.equal(rules.length, bullets);
  assert.ok(rules.includes("Every entry in `skills:` is one the body shows. A skill listed and not evidenced belongs in the profile's table or nowhere; here it is a claim with nothing under it."));
  assert.ok(rules.every((r) => !r.includes("\n") && !r.includes("  ")));
});

test("a schema without writing rules gives none, and one without a purpose gives an empty one", () => {
  const bare = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n";
  assert.deepEqual(writingRulesOf(bare), []);
  assert.equal(purposeOf(bare), "");
  assert.match(purposeOf(schema("experience")), /^An experience is one dated period/);
});

test("a bullet carries the heading it stands under, or none when it stands before every heading", () => {
  const text = "- Before any heading.\n\n### Delivery\n\n- Split one service into two, so the second\n  team stopped waiting.\n- Another.\n\n### Results\n\n- Measured.";
  assert.deepEqual(bulletsOf(text), [
    { heading: null, bullet: "Before any heading." },
    { heading: "Delivery", bullet: "Split one service into two, so the second team stopped waiting." },
    { heading: "Delivery", bullet: "Another." },
    { heading: "Results", bullet: "Measured." },
  ]);
});
// The example instance, read as `judge` reads one: its pages keyed relative to `model/`, and
// the schemas keyed as parseSchemas reads them.
const exampleFiles = () => {
  const files = new Map();
  const walk = (rel) => {
    for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
      const child = `${rel}${entry.name}`;
      if (entry.isDirectory()) walk(`${child}/`);
      else if (child.endsWith(".md")) files.set(child, fs.readFileSync(new URL(`../example/model/${child}`, import.meta.url), "utf8"));
    }
  };
  walk("");
  return files;
};
const coreSchemas = () => new Map(fs.readdirSync(new URL("../core/", import.meta.url))
  .filter((f) => f.endsWith("-schema.md") || f === "manifest.json")
  .map((f) => [f, fs.readFileSync(new URL(`../core/${f}`, import.meta.url), "utf8")]));
const example = () => {
  const files = exampleFiles(), schemas = coreSchemas();
  return { graph: parseInstance(files, { schemas }), files, schemas };
};
const BEACON = "profiles/mira-halvorsen/experiences/2022-beacon-systems.md";

test("every page is asked every writing rule of its schema, verbatim, with the purpose and the page whole", () => {
  const { asked } = questionsOf(example());
  const page = asked.find((r) => r.path === BEACON);
  const rules = writingRulesOf(schema("experience"));
  assert.deepEqual(page.questions.filter((q) => q.kind === "rule"), rules.map((rule, i) => ({ id: `r${i + 1}`, kind: "rule", rule })));
  assert.equal(page.state.entity, exampleFiles().get(BEACON));
  assert.equal(page.state.purpose, purposeOf(schema("experience")));
  assert.equal(page.type, "experience");
  assert.equal(page.name, "Splitting the billing domain");
});

test("a grouped bullet is a choice among the instance's kinds, each described by its own page", () => {
  const { asked } = questionsOf(example());
  const groups = asked.find((r) => r.path === BEACON).questions.filter((q) => q.kind === "group");
  assert.deepEqual(groups.map((q) => [q.id, q.section, q.heading]), [["g1", "Achievements", "Delivery"], ["g2", "Achievements", "Results"]]);
  assert.match(groups[0].bullet, /^Split one service that three teams edited into two that one team each owns, so the second team/);
  assert.deepEqual(Object.keys(groups[0].options).sort(), ["Decisions", "Delivery", "Results", "Sharing"]);
  assert.match(groups[0].options.Delivery.summary, /^Something built, changed or taken apart/);
  assert.match(groups[0].options.Delivery["What it means"], /^An achievement whose claim is the work done/);
});

test("a table's column is no grouped section, so a profile is asked its rules and nothing else", () => {
  const { asked } = questionsOf(example());
  const profile = asked.find((r) => r.type === "profile");
  assert.ok(profile.questions.length > 0);
  assert.ok(profile.questions.every((q) => q.kind === "rule"));
});

test("an instance with no entities of a grouped heading's type asks no choice for that section", () => {
  const { graph, files, schemas } = example();
  const kindless = { ...graph, entities: graph.entities.filter((e) => e.type !== "achievement-kind") };
  const page = questionsOf({ graph: kindless, files, schemas }).asked.find((r) => r.path === BEACON);
  assert.ok(page.questions.every((q) => q.kind === "rule"));
});

test("a page longer than the judge reads in one request is not asked, and is named", () => {
  const { graph, files, schemas } = example();
  files.set(BEACON, `${files.get(BEACON)}\n${"x".repeat(STATE_BUDGET)}\n`);
  const { asked, notAsked } = questionsOf({ graph, files, schemas });
  assert.ok(!asked.some((r) => r.path === BEACON));
  assert.deepEqual(notAsked.find((n) => n.path === BEACON), { path: BEACON, why: "longer than the judge reads in one request" });
});
// A small asked set, by hand, so each line of the report is pinned to the answer that made it.
const rule = (id, text) => ({ id, kind: "rule", rule: text });
const asked = {
  asked: [
    { path: "a.md", type: "experience", name: "A", state: { purpose: "", entity: "" },
      questions: [rule("r1", "One."), rule("r2", "Two."), rule("r3", "Three."), rule("r4", "Four."),
        { id: "g1", kind: "group", section: "Achievements", heading: "Delivery", bullet: "Split a service.", options: { Delivery: {}, Results: {} } },
        { id: "g2", kind: "group", section: "Achievements", heading: null, bullet: "Before any heading.", options: { Delivery: {}, Results: {} } }] },
    { path: "b.md", type: "experience", name: "B", state: { purpose: "", entity: "" }, questions: [rule("r1", "One."), rule("r2", "Two.")] },
    { path: "c.md", type: "experience", name: "C", state: { purpose: "", entity: "" }, questions: [rule("r1", "One.")] },
  ],
  notAsked: [{ path: "big.md", why: "longer than the judge reads in one request" }],
};
const answers = new Map([
  ["a.md", { r1: { p: 0.9 }, r2: { p: 0.2 }, r3: { p: 0.5 }, r4: { p: 0.45 },
             g1: { pick: "Results", probabilities: { Results: 0.8, Delivery: 0.2 } },
             g2: { pick: "Delivery", probabilities: { Delivery: 0.6, Results: 0.4 } } }],
  ["b.md", { r1: { p: 0.55 }, r2: { p: 0.95 } }],
  ["c.md", { error: "TypeSafe answered 500" }],
]);

test("unmeasured, the report flags nothing and lists each page's lowest verdicts, marked", () => {
  assert.equal(BAND, null);
  const lines = reportOf(asked, answers);
  assert.match(lines[0], /^judge: advisory/);
  assert.ok(lines.some((l) => /probabilities unmeasured/.test(l)));
  const a = lines.slice(lines.indexOf("model/a.md") + 1, lines.indexOf("model/b.md"));
  assert.deepEqual(a.filter((l) => /\br\d\b/.test(l)).map((l) => l.trim().split(/\s+/).slice(0, 3)),
    [["?", "0.20", "r2"], ["?", "0.45", "r4"], ["?", "0.50", "r3"]]);
  assert.equal(LOWEST, 3);
  assert.ok(a.some((l) => /\? 0\.80 {2}g1 {2}"Split a service\." stands under ### Delivery; the judge picks Results/.test(l)));
  assert.ok(a.some((l) => /g2 {2}"Before any heading\." stands under no heading; the judge picks Delivery/.test(l)));
  assert.ok(!lines.some((l) => l.includes("!")), "nothing is flagged unmeasured");
});

test("measured, a verdict below the band is flagged and a rule near even for most pages cannot be judged", () => {
  const lines = reportOf(asked, answers, { band: { low: 0.4, high: 0.6 } });
  assert.ok(lines.some((l) => /^ {2}! 0\.20 {2}r2 {2}Two\.$/.test(l)));
  assert.ok(lines.some((l) => /^ {2}! 0\.80 {2}g1 /.test(l)), "a pick that differs from its heading, above the band, is flagged");
  assert.ok(!lines.some((l) => /^ {2}! 0\.60 {2}g2 /.test(l)), "a pick inside the band is not");
  const r1 = lines.find((l) => /^ {2}experience r1:/.test(l));
  assert.match(r1, /asked of 2, median 0\.\d\d, near even for 1$/);
  const r3 = lines.find((l) => /^ {2}experience r3:/.test(l));
  assert.match(r3, /asked of 1, median 0\.50, near even for 1 — cannot be judged as written; a finding against the schema$/);
});

test("the report never reads as a pass and ends naming what it did not ask, a failed page among them", () => {
  const lines = reportOf(asked, answers);
  assert.ok(!lines.some((l) => l.includes("✓")));
  const tail = lines.slice(lines.indexOf("not asked:"));
  assert.ok(tail.length > 1, lines.join("\n"));
  assert.deepEqual(tail.slice(1), ["  model/big.md: longer than the judge reads in one request", "  model/c.md: TypeSafe answered 500"]);
});
