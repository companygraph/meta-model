// The writing rules, asked: what lib/questions.mjs reads out of a schema and a page, the
// questions it derives from an instance, and the report it makes of the answers. Nothing here
// reaches a judge; the module opens no socket, so its whole behavior is tested on files.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { instanceAt } from "../lib/history.mjs";
import { writingRulesOf, purposeOf, bulletsOf, questionsOf, subjectsOf, subjectOf, leftOutOf, STATE_BUDGET, reportOf, BAND, LOWEST } from "../lib/questions.mjs";
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

// A rule's number moves when a rule before it leaves, so the tests find a rule by its opening.
const idOf = (type, opening) => {
  const i = writingRulesOf(schema(type)).findIndex((r) => r.startsWith(opening));
  assert.ok(i >= 0, `no ${type} rule opens "${opening}"`);
  return `r${i + 1}`;
};
const ENDING = idOf("experience", "`## Ending`");
const WHAT = idOf("experience", "`What`");
const AS = idOf("concept", "`As`");

test("a rule's subject is the section or table column its opening names, never a field", () => {
  const rules = (n) => writingRulesOf(schema(n));
  const of = (n, i) => subjectOf(rules(n)[i - 1], subjectsOf(schema(n)));
  assert.deepEqual(of("experience", Number(ENDING.slice(1))), { sections: ["Ending"], column: null });
  assert.deepEqual(of("concept", Number(AS.slice(1))), { sections: ["Relations"], column: "As" });
  assert.equal(of("experience", 1), null, "`role` is a field, and r1 judges whether it is there");
  assert.equal(of("experience", 3), null, "a backticked name later in the sentence does not count");
  assert.equal(subjectOf("A rule that opens with no name.", subjectsOf(schema("concept"))), null, "a rule with no opening name is asked as now");
});

test("a column declared in two sections' tables stands for both", () => {
  const text = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `name` | Yes | string | Its name. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `## Sources` | No | Table. |\n| `## References` | No | Table. |\n\n`## Sources` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `What` | Yes | string | What it is. |\n\n`## References` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `What` | Yes | string | What it is. |\n| `name` | No | string | A name. |\n";
  const subjects = subjectsOf(text);
  assert.deepEqual(subjectOf("`What` names the kind of document.", subjects), { sections: ["Sources", "References"], column: "What" });
  assert.equal(subjectOf("`name` is the thing's own.", subjects), null, "a name that is a field as well as a column is read as the field");
  assert.equal(subjectOf("`## Missing` is written well.", subjects), null, "an opening name the schema does not declare is asked");
});

// The rules whose opening name a schema declares both as a frontmatter field and as a column:
// subjectOf reads such a name as the field and asks the rule always, so a column rule written
// that way would never be left out, and nothing else would say so.
const collisionsOf = (text) => {
  const subjects = subjectsOf(text);
  return writingRulesOf(text).filter((rule) => {
    const name = rule.match(/^`([^`]+)`/)?.[1]?.trim();
    return name !== undefined && subjects.fields.has(name) && subjects.columns.has(name);
  });
};

test("a rule opening with a name that is both a field and a column is found", () => {
  const text = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `name` | Yes | string | Its name. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `## References` | No | Table. |\n\n`## References` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `name` | No | string | A name. |\n\n## Writing rules\n\n- `name` is the thing's own.\n";
  assert.deepEqual(collisionsOf(text), ["`name` is the thing's own."]);
});

test("no writing rule in core or a pack opens with a name that is both a field and a column", () => {
  const dirs = [new URL("../core/", import.meta.url), ...fs.readdirSync(new URL("../packs/", import.meta.url), { withFileTypes: true })
    .filter((d) => d.isDirectory()).map((d) => new URL(`../packs/${d.name}/`, import.meta.url))];
  for (const dir of dirs)
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith("-schema.md")))
      assert.deepEqual(collisionsOf(fs.readFileSync(new URL(f, dir), "utf8")), [], f);
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

const NORTHWIND = "profiles/mira-halvorsen/experiences/2018-northwind-atelier.md";

test("a page is asked every writing rule whose subject it has, verbatim, numbered as in its schema, with the purpose and the page whole", () => {
  const { asked } = questionsOf(example());
  const page = asked.find((r) => r.path === BEACON);
  const rules = writingRulesOf(schema("experience"));
  const ids = page.questions.filter((q) => q.kind === "rule").map((q) => q.id);
  assert.ok(!ids.includes(ENDING), "Beacon has no `## Ending`");
  assert.ok(ids.includes(WHAT), "Beacon has a References table with its `What` column");
  assert.deepEqual(page.questions.filter((q) => q.kind === "rule"), rules.map((rule, i) => ({ id: `r${i + 1}`, kind: "rule", rule })).filter((q) => q.id !== ENDING));
  assert.equal(page.state.entity, exampleFiles().get(BEACON));
  assert.equal(page.state.purpose, purposeOf(schema("experience")));
  assert.equal(page.type, "experience");
  assert.equal(page.name, "Splitting the billing domain");
});

test("a rule left out for want of its subject is named, with what the page lacks", () => {
  const { asked, skipped } = questionsOf(example());
  const ids = (p) => asked.find((r) => r.path === p).questions.map((q) => q.id);
  assert.ok(ids(NORTHWIND).includes(ENDING), "Northwind has an `## Ending`");
  assert.ok(!ids(NORTHWIND).includes(WHAT), "Northwind has no References table");
  assert.ok(ids(NORTHWIND).includes("r1") && ids(BEACON).includes("r1"), "a rule that opens with a field is asked either way");
  assert.deepEqual(skipped.find((s) => s.path === BEACON && s.id === ENDING),
    { path: BEACON, type: "experience", id: ENDING, rule: writingRulesOf(schema("experience"))[Number(ENDING.slice(1)) - 1], without: "without `## Ending`" });
  assert.equal(skipped.find((s) => s.path === NORTHWIND && s.id === WHAT)?.without, "without a `What` column");
});

test("a concept without a Relations table is not asked the rule about As, and one with it is", () => {
  const { asked, skipped } = questionsOf(example());
  const ids = (p) => asked.find((r) => r.path === p).questions.map((q) => q.id);
  assert.ok(ids("concepts/contract.md").includes(AS));
  assert.ok(!ids("concepts/customer.md").includes(AS));
  assert.equal(skipped.find((s) => s.path === "concepts/customer.md" && s.id === AS)?.without, "without an `As` column");
});

test("a table without the optional column its rule is about leaves the rule unasked", () => {
  const files = exampleFiles(), schemas = coreSchemas();
  const text = files.get("concepts/contract.md")
    .replace("| Concept | Cardinality | As |\n| --- | --- | --- |", "| Concept | Cardinality |\n| --- | --- |")
    .replace(/^(\| [^|]+\| [^|]+\|) [^|]+\|$/gm, "$1");
  assert.ok(!text.includes("| As |") && text.includes("| Customer | one |\n"), text);
  files.set("concepts/contract.md", text);
  const { asked } = questionsOf({ graph: parseInstance(files, { schemas }), files, schemas });
  assert.ok(!asked.find((r) => r.path === "concepts/contract.md").questions.some((q) => q.id === AS));
});

test("a page whose every rule lacks its subject and that groups nothing is named, and says why", () => {
  const thing = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `id` | Yes | string | Its id. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Thing]` | Yes | Its name. |\n| `## Notes` | No | Prose. |\n\n## Writing rules\n\n- `## Notes` are written in full sentences.\n";
  const graph = { entities: [{ path: "things/a.md", type: "thing", name: "A", id: "x", owner: null, tagline: "", sections: [] }] };
  const { asked, notAsked, skipped } = questionsOf({ graph, files: new Map([["things/a.md", "# A\n"]]), schemas: new Map([["thing-schema.md", thing]]) });
  assert.deepEqual(asked, []);
  assert.deepEqual(notAsked, [{ path: "things/a.md", why: "it has nothing a writing rule of its schema is about, and nothing grouped" }]);
  assert.equal(skipped.length, 1);
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

test("the band is the one measured over the reference instance on October 3, 2026", () => {
  // Below 0.6 about four pages in five broke the rule; 0.6 to 0.7 was near even; a pick at 0.9
  // or above was right 97% of the time, and below it mostly wrong.
  assert.deepEqual(BAND, { low: 0.6, high: 0.7, pick: 0.9 });
});

test("measured, the report says where its band came from and flags by it", () => {
  const lines = reportOf(asked, answers);
  assert.ok(lines.some((l) => /^flagged: a rule verdict below 0\.60, and a pick of 0\.90 or above that differs from its heading — read off the measuring of October 3, 2026$/.test(l)));
  assert.ok(!lines.some((l) => /probabilities unmeasured/.test(l)));
  assert.ok(lines.some((l) => /^ {2}! 0\.20 {2}r2 /.test(l)));
  assert.ok(!lines.some((l) => /^ {2}! 0\.80 {2}g1 /.test(l)), "a pick below the pick threshold is not flagged");
});

test("unmeasured, the report flags nothing and lists each page's lowest verdicts, marked", () => {
  const lines = reportOf(asked, answers, { band: null });
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
  const lines = reportOf(asked, answers, { band: { low: 0.4, high: 0.6, pick: 0.7 } });
  assert.ok(lines.some((l) => /^ {2}! 0\.20 {2}r2 {2}Two\.$/.test(l)));
  assert.ok(lines.some((l) => /^ {2}! 0\.80 {2}g1 /.test(l)), "a pick that differs from its heading, at or above the pick threshold, is flagged");
  assert.ok(!lines.some((l) => /^ {2}! 0\.60 {2}g2 /.test(l)), "a pick below the pick threshold is not");
  const r1 = lines.find((l) => /^ {2}experience r1:/.test(l));
  assert.match(r1, /asked of 2, median 0\.\d\d, near even for 1$/);
  const r3 = lines.find((l) => /^ {2}experience r3:/.test(l));
  assert.match(r3, /asked of 1, median 0\.50, near even for 1 — cannot be judged as written; a finding against the schema$/);
});

test("a rule's summary counts the pages it was left out of, and a rule asked of none still has its line", () => {
  const skipped = [
    { path: "x.md", type: "experience", id: "r1", rule: "One.", without: "without `## Ending`" },
    { path: "y.md", type: "experience", id: "r9", rule: "Nine.", without: "without `## Ending`" },
    { path: "z.md", type: "experience", id: "r9", rule: "Nine.", without: "without `## Ending`" },
  ];
  const lines = reportOf({ ...asked, skipped }, answers, { band: { low: 0.4, high: 0.6, pick: 0.7 } });
  assert.match(lines.find((l) => /^ {2}experience r1:/.test(l)), /asked of 2, median 0\.\d\d, near even for 1; not asked of 1 without `## Ending`$/);
  assert.equal(lines.find((l) => /^ {2}experience r9:/.test(l)), "  experience r9: asked of 0; not asked of 2 without `## Ending`");
  assert.ok(!reportOf(asked, answers).some((l) => /not asked of/.test(l)), "a run that left nothing out says nothing of it");
});

test("what a page is without takes the article its column's name is said with", () => {
  const thing = "# Thing Schema\n\n> A thing.\n\n## Frontmatter\n\n| Field | Required | Type | Description |\n| --- | --- | --- | --- |\n| `id` | Yes | string | Its id. |\n\n## Sections\n\n| Section | Required | Description |\n| --- | --- | --- |\n| `# [Thing]` | Yes | Its name. |\n| `## References` | No | Table. |\n\n`## References` is a table with these columns:\n\n| Column | Required | Type | Description |\n| --- | --- | --- | --- |\n| `URL` | Yes | string | Where. |\n| `Owner` | No | string | Whose. |\n\n## Writing rules\n\n- `URL` is the page itself.\n- `Owner` is a seat.\n";
  const graph = { entities: [{ path: "things/a.md", type: "thing", name: "A", id: "x", owner: null, tagline: "", sections: [] }] };
  const { skipped } = questionsOf({ graph, files: new Map([["things/a.md", "# A\n"]]), schemas: new Map([["thing-schema.md", thing]]) });
  assert.deepEqual(skipped.map((s) => s.without), ["without a `URL` column", "without an `Owner` column"]);
});

test("the rules left out are listed per rule, for a run that sends nothing", () => {
  const skipped = [
    { path: "y.md", type: "experience", id: "r14", rule: "", without: "without `## Ending`" },
    { path: "c.md", type: "concept", id: "r4", rule: "", without: "without an `As` column" },
    { path: "z.md", type: "experience", id: "r14", rule: "", without: "without `## Ending`" },
  ];
  assert.deepEqual(leftOutOf(skipped), ["  concept r4: not asked of 1 without an `As` column", "  experience r14: not asked of 2 without `## Ending`"]);
  assert.deepEqual(leftOutOf([]), []);
});

test("the report never reads as a pass and ends naming what it did not ask, a failed page among them", () => {
  const lines = reportOf(asked, answers);
  assert.ok(!lines.some((l) => l.includes("✓")));
  const tail = lines.slice(lines.indexOf("not asked:"));
  assert.ok(tail.length > 1, lines.join("\n"));
  assert.deepEqual(tail.slice(1), ["  model/big.md: longer than the judge reads in one request", "  model/c.md: TypeSafe answered 500"]);
});
// fileURLToPath, not `.pathname`: on Windows a URL's pathname is `/C:/…`, which no process can run.
const cli = fileURLToPath(new URL("../bin/companygraph.mjs", import.meta.url));
const fresh = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-judge-"));
  execFileSync(process.execPath, [cli, "init", root, "--name", "Acme", "--agent", "claude", "--no-hook"], { encoding: "utf8" });
  return root;
};

test("an instance is read with its pages and its vendored schemas, and questions come from those", () => {
  const root = fresh();
  const instance = instanceAt(root);
  assert.ok(instance.files.has("identity.md"));
  assert.ok(instance.schemas.has("identity-schema.md"));
  assert.equal(instance.core, JSON.parse(fs.readFileSync(path.join(root, ".companygraph", "manifest.json"), "utf8")).core.version);
  // The vendored copy is what is asked: a rule added to it is asked, and core in this package is not read.
  const vendored = path.join(root, "meta", "core", "identity-schema.md");
  fs.writeFileSync(vendored, fs.readFileSync(vendored, "utf8").replace("## Writing rules\n\n", "## Writing rules\n\n- A rule only this instance has.\n"));
  const page = questionsOf(instanceAt(root)).asked.find((r) => r.path === "identity.md");
  assert.equal(page.questions[0].rule, "A rule only this instance has.");
});

test("a grouped section with more entities to choose among than one choice holds asks no choice, and says so", () => {
  const { graph, files, schemas } = example();
  const many = Array.from({ length: 256 }, (_, i) => ({ id: `k${i}`, address: `k${i}`, type: "achievement-kind", name: `Kind ${i}`, tagline: "A kind.", fields: {}, sections: [], owner: null, path: `achievement-kinds/k${i}.md` }));
  const { asked, notAsked } = questionsOf({ graph: { ...graph, entities: [...graph.entities, ...many] }, files, schemas });
  assert.ok(asked.find((r) => r.path === BEACON).questions.every((q) => q.kind === "rule"));
  assert.ok(notAsked.some((n) => n.path === BEACON && /"## Achievements" as a choice: more than 255 achievement-kind entities/.test(n.why)));
});

test("the state budget counts three characters to a token, which German pages come close to", () => {
  assert.ok(STATE_BUDGET <= 32_000 * 3);
});

test("a nested bullet is part of its rule, and an achievement of its own under the same heading", () => {
  assert.deepEqual(writingRulesOf("## Writing rules\n\n- Top rule.\n  - a sub point\n- Second.\n"), ["Top rule. a sub point", "Second."]);
  assert.deepEqual(bulletsOf("### Delivery\n\n- Top.\n  - Sub claim.\n"), [{ heading: "Delivery", bullet: "Top." }, { heading: "Delivery", bullet: "Sub claim." }]);
});

test("an owned target is chosen among the entities of the page's own owner", () => {
  const { graph, files, schemas } = example();
  const entities = graph.entities.map((e) => e.type === "phase" && e.name === "Build"
    ? { ...e, sections: e.sections.map((s) => (s.heading === "Activities" ? { ...s, text: "### Code\n\n- Write it." } : s)) }
    : e);
  entities.push({ id: "elsewhere", address: "elsewhere", type: "track", name: "Elsewhere", tagline: "Another process's track.", fields: {}, sections: [], owner: "another-process", path: "processes/other/tracks/elsewhere.md" });
  const page = questionsOf({ graph: { ...graph, entities }, files, schemas }).asked.find((r) => r.path === "processes/delivery/phases/build.md");
  const groups = page.questions.filter((q) => q.kind === "group");
  assert.equal(groups.length, 1);
  assert.deepEqual(Object.keys(groups[0].options).sort(), ["Code", "Docs"]);
});
