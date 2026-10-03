// The writing rules, asked: what lib/questions.mjs reads out of a schema and a page, the
// questions it derives from an instance, and the report it makes of the answers. Nothing here
// reaches a judge; the module opens no socket, so its whole behavior is tested on files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { writingRulesOf, purposeOf, bulletsOf, questionsOf, STATE_BUDGET } from "../lib/questions.mjs";
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
