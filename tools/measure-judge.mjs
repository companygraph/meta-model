// Whether the judge's probabilities mean what they say, measured before the report shows any of
// them as a finding. Run by hand, with a key, never in CI:
//
//   TYPESAFE_API_KEY=… node tools/measure-judge.mjs
//
// It asks about the example's entries, each with one fault from tools/judge-faults.mjs planted
// and again without it, only the rule the fault breaks; and every grouped bullet, with the
// heading it stands under as the truth. The clean entries are taken to keep their rules, which
// the example's own validate pass holds. It prints, per tenth of probability, how many answers
// fell there and how often they were right. Where that curve is near the diagonal, the band that
// counts as near even is read off it and written into lib/questions.mjs's BAND and the spec's
// Measuring section together; how few points a tenth holds is printed beside it, so a thin curve
// reads as thin.
import fs from "node:fs";
import { parseInstance } from "../lib/instance.mjs";
import { questionsOf } from "../lib/questions.mjs";
import { ask, SERVICE } from "../bin/judges/typesafe.mjs";
import { FAULTS } from "./judge-faults.mjs";

const key = process.env.TYPESAFE_API_KEY;
if (!key) {
  console.error("TYPESAFE_API_KEY is not set; nothing was measured.");
  process.exit(1);
}
const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const files = new Map();
const walk = (rel) => {
  for (const entry of fs.readdirSync(new URL(`../example/model/${rel}`, import.meta.url), { withFileTypes: true })) {
    const child = `${rel}${entry.name}`;
    if (entry.isDirectory()) walk(`${child}/`);
    else if (child.endsWith(".md")) files.set(child, read(`example/model/${child}`));
  }
};
walk("");
const schemas = new Map(fs.readdirSync(new URL("../core/", import.meta.url)).filter((f) => f.endsWith("-schema.md")).map((f) => [f, read(`core/${f}`)]));
const graph = parseInstance(files, { schemas });
const skills = graph.entities.filter((e) => e.type === "skill").map((e) => e.name);
const entries = questionsOf({ graph, files, schemas }).asked.filter((r) => r.type === "experience");

/** Yes-or-no answers: the probability the page keeps the rule, and whether it did. */
const rules = [];
/** Choices: the probability of the pick, and whether the pick was the truth. */
const choices = [];
for (const r of entries) {
  const groups = r.questions.filter((q) => q.kind === "group");
  for (const g of groups) {
    const a = await ask({ ...r, questions: [g] }, { key });
    choices.push({ p: a[g.id].probabilities[a[g.id].pick] ?? 0, right: a[g.id].pick === g.heading });
  }
  for (const f of FAULTS) {
    const planted = f.plant(r.state.entity, { skills });
    if (!planted) continue;
    const rule = r.questions.find((q) => q.kind === "rule" && q.rule.startsWith(f.rule));
    const clean = await ask({ ...r, questions: [rule] }, { key });
    const faulted = await ask({ ...r, state: { ...r.state, entity: planted.text }, questions: [rule] }, { key });
    rules.push({ p: clean[rule.id].p, kept: true }, { p: faulted[rule.id].p, kept: false });
    if (planted.moved && groups[0]) {
      const moved = { id: "g1", kind: "group", section: "Achievements", heading: planted.moved.to, bullet: planted.moved.bullet, options: groups[0].options };
      const a = await ask({ ...r, state: { ...r.state, entity: planted.text }, questions: [moved] }, { key });
      choices.push({ p: a.g1.probabilities[a.g1.pick] ?? 0, right: a.g1.pick === planted.moved.from });
    }
  }
}

const tenths = (points, right) => {
  for (let t = 0; t < 10; t++) {
    const inside = points.filter((x) => Math.min(9, Math.floor(x.p * 10)) === t);
    const share = inside.length ? (inside.filter(right).length / inside.length).toFixed(2) : "—";
    console.log(`  ${(t / 10).toFixed(1)}–${((t + 1) / 10).toFixed(1)}  n=${String(inside.length).padStart(3)}  right ${share}`);
  }
};
console.log(`${SERVICE.name} ${SERVICE.model}, over the example's entries\n`);
console.log("rules: the probability the page keeps the rule, by tenth; right is how often it did");
tenths(rules, (x) => x.kept);
console.log("\nchoices: the probability of the pick, by tenth; right is how often the pick was the heading the bullet belongs under");
tenths(choices, (x) => x.right);
