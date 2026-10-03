// Whether the judge's probabilities mean what they say, measured before the report shows any of
// them as a finding. Run by hand, with a key, never in CI:
//
//   TYPESAFE_API_KEY=… node tools/measure-judge.mjs
//
// It asks about the example's entries, each with one fault from tools/judge-faults.mjs planted
// and again without it, in the shape `judge` asks in: a whole page per request, every rule and
// every grouped bullet together, since an answer read out of a different request shape might not
// carry over. From each answer it keeps the rule the fault breaks, and every grouped bullet with
// the heading it belongs under as the truth. The clean entries are taken to keep their rules,
// which the example's own validate pass holds. It prints, per tenth of probability, how many
// answers fell there and how often they were right, and how many requests failed. Where that
// curve is near the diagonal, the band that counts as near even is read off it and written into
// lib/questions.mjs's BAND and the spec's Measuring section together; how few points a tenth
// holds is printed beside it, so a thin curve reads as thin.
import fs from "node:fs";
import { sectionsOf } from "../lib/checks.mjs";
import { parseInstance } from "../lib/instance.mjs";
import { questionsOf, bulletsOf } from "../lib/questions.mjs";
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
/** Choices: the probability of the pick, and whether the pick was the truth. */
const choices = [];
/** @param {any} answer @param {string} truth */
const choice = (answer, truth) => choices.push({ p: answer.probabilities[answer.pick] ?? 0, right: answer.pick === truth });

for (const r of entries) {
  const clean = await asked(r);
  if (clean) for (const q of r.questions) if (q.kind === "group" && q.heading) choice(clean[q.id], q.heading);
  for (const f of FAULTS) {
    const planted = f.plant(r.state.entity, { skills });
    if (!planted) continue;
    const rule = r.questions.find((q) => q.kind === "rule" && q.rule.startsWith(f.rule));
    const questions = questionsFor(r, planted.text);
    const faulted = await asked({ ...r, state: { ...r.state, entity: planted.text }, questions });
    if (clean) rules.push({ p: clean[rule.id].p, kept: true });
    if (!faulted) continue;
    rules.push({ p: faulted[rule.id].p, kept: false });
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
console.log(`${SERVICE.name} ${SERVICE.model}, over the example's entries, a whole page per request\n`);
console.log("rules: the probability the page keeps the rule, by tenth; right is how often it did");
tenths(rules, (x) => x.kept);
console.log("\nchoices: the probability of the pick, by tenth; right is how often the pick was the heading the bullet belongs under");
tenths(choices, (x) => x.right);
console.log(`\nfailed: ${failed} requests`);
