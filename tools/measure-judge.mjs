// Whether the judge's probabilities mean what they say, measured before the report shows any of
// them as a finding. Run by hand, with a key, never in CI:
//
//   TYPESAFE_API_KEY=… node tools/measure-judge.mjs [<instance>…]
//
// With no instance named it reads the example; named, it reads each instance at its root, with
// the schemas it vendored, so a reference instance that passes its own validate pass adds its
// entries to the example's few. It asks about the entries, each with one fault from tools/judge-faults.mjs planted
// and again without it, in the shape `judge` asks in: a whole page per request, every rule and
// every grouped bullet together, since an answer read out of a different request shape might not
// carry over. From each answer it keeps the rule the fault breaks, and every grouped bullet with
// the heading it belongs under as the truth. The clean entries are taken to keep their rules,
// which the example's own validate pass holds. It prints, per tenth of probability, how many
// answers fell there and how often they were right, and how many requests failed. Where that
// curve is near the diagonal, the band that counts as near even is read off it and written into
// lib/questions.mjs's BAND and the spec's Measuring section together; how few points a tenth
// holds is printed beside it, so a thin curve reads as thin. Per fault, it prints how often the
// faulted page scored below its clean copy, which says which faults the judge sees at all.
import fs from "node:fs";
import { sectionsOf } from "../lib/checks.mjs";
import { parseInstance } from "../lib/instance.mjs";
import { questionsOf, bulletsOf, writingRulesOf } from "../lib/questions.mjs";
import { instanceAt } from "../lib/history.mjs";
import { exampleSchemas } from "../verify/example.mjs";
import { ask, SERVICE } from "../bin/judges/typesafe.mjs";
import { FAULTS } from "./judge-faults.mjs";

const key = process.env.TYPESAFE_API_KEY;
if (!key) {
  console.error("TYPESAFE_API_KEY is not set; nothing was measured.");
  process.exit(1);
}
const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
// The example, read as an instance is: its pages keyed relative to its model, beside core.
const example = () => {
  const files = new Map();
  const walk = (rel) => {
    for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
      const child = `${rel}${entry.name}`;
      if (entry.isDirectory()) walk(`${child}/`);
      else if (child.endsWith(".md")) files.set(child, read(`example/model/${child}`));
    }
  };
  walk("");
  const schemas = exampleSchemas();
  return { graph: parseInstance(files, { schemas }), files, schemas };
};
const sources = process.argv.slice(2);
const instances = sources.length ? sources.map((root) => ({ name: root, ...instanceAt(root) })) : [{ name: "the example", ...example() }];
const entries = instances.flatMap((instance) => {
  const skills = instance.graph.entities.filter((e) => e.type === "skill").map((e) => e.name);
  const schema = [...instance.schemas].find(([k]) => k.endsWith("experience-schema.md"))?.[1] ?? "";
  const all = writingRulesOf(schema);
  return questionsOf(instance).asked.filter((r) => r.type === "experience").map((request) => ({ request, skills, all }));
});

let failed = 0;
// One request, as `judge` sends it; a failure is counted and the measuring goes on.
const asked = async (request) => {
  try {
    return await ask(request, { key });
  } catch (error) {
    failed++;
    console.error(`  ${request.path}: ${error.message}`);
    return null;
  }
};

// The page's questions again, for a faulted copy: its rules as they were, and its grouped
// bullets read from the faulted text, so a moved bullet is asked under the heading it now has.
const questionsFor = (request, text) => {
  const rules = request.questions.filter((q) => q.kind === "rule");
  const options = request.questions.find((q) => q.kind === "group")?.options;
  const bullets = options ? bulletsOf(sectionsOf(text).get("Achievements") ?? "") : [];
  return [...rules, ...bullets.map(({ heading, bullet }, i) => ({ id: `g${i + 1}`, kind: "group", section: "Achievements", heading, bullet, options }))];
};

/** Yes-or-no answers: the probability the page keeps the rule, and whether it did. */
const rules = [];
/** Per fault: the clean and the faulted probability of each page it was planted on. */
const pairs = new Map(FAULTS.map((f) => [f.name, []]));
/** Choices: the probability of the pick, and whether the pick was the truth. */
const choices = [];
/** @param {any} answer @param {string} truth */
const choice = (answer, truth) => choices.push({ p: answer.probabilities[answer.pick] ?? 0, right: answer.pick === truth });

for (const { request: r, skills, all } of entries) {
  const clean = await asked(r);
  if (clean) for (const q of r.questions) if (q.kind === "group" && q.heading) choice(clean[q.id], q.heading);
  for (const f of FAULTS) {
    const planted = f.plant(r.state.entity, { skills });
    if (!planted) continue;
    // An instance whose vendored core words the rule differently is not asked about it.
    // A rule about a field the clean page does not carry was left out of its request, and the
    // fault may be what plants the field, as a skill planted on an entry with no `skills:` does:
    // the faulted copy is asked the rule, and the clean one has no verdict on it.
    const at = all.findIndex((x) => x.startsWith(f.rule));
    const rule = r.questions.find((q) => q.kind === "rule" && q.rule.startsWith(f.rule))
      ?? (at >= 0 ? { id: `r${at + 1}`, kind: /** @type {const} */ ("rule"), rule: /** @type {string} */ (all[at]) } : null);
    if (!rule) continue;
    const base = questionsFor(r, planted.text);
    const questions = base.some((q) => q.id === rule.id) ? base : [rule, ...base];
    const faulted = await asked({ ...r, state: { ...r.state, entity: planted.text }, questions });
    if (clean?.[rule.id]) rules.push({ p: clean[rule.id].p, kept: true });
    if (!faulted) continue;
    rules.push({ p: faulted[rule.id].p, kept: false });
    if (clean?.[rule.id]) pairs.get(f.name).push({ clean: clean[rule.id].p, faulted: faulted[rule.id].p });
    const moved = planted.moved && questions.find((q) => q.kind === "group" && q.bullet === planted.moved.bullet);
    if (moved) choice(faulted[moved.id], planted.moved.from);
  }
}

const tenths = (points, right) => {
  for (let t = 0; t < 10; t++) {
    const inside = points.filter((x) => Math.min(9, Math.floor(x.p * 10)) === t);
    const share = inside.length ? (inside.filter(right).length / inside.length).toFixed(2) : "—";
    console.log(`  ${(t / 10).toFixed(1)}–${((t + 1) / 10).toFixed(1)}  n=${String(inside.length).padStart(3)}  right ${share}`);
  }
};
console.log(`${SERVICE.name} ${SERVICE.model}, over ${instances.map((i) => i.name).join(", ")}: ${entries.length} entries, a whole page per request\n`);
console.log("rules: the probability the page keeps the rule, by tenth; right is how often it did");
tenths(rules, (x) => x.kept);
console.log("\nchoices: the probability of the pick, by tenth; right is how often the pick was the heading the bullet belongs under");
tenths(choices, (x) => x.right);
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0).toFixed(2);
console.log("\nfaults: on how many pages the faulted copy scored below its clean one");
for (const [name, ps] of pairs)
  console.log(`  ${name}: ${ps.length} pages, caught on ${ps.filter((x) => x.faulted < x.clean).length}, clean mean ${mean(ps.map((x) => x.clean))}, faulted mean ${mean(ps.map((x) => x.faulted))}`);
console.log(`\nfailed: ${failed} requests`);
