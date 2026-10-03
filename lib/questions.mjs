// The writing rules, asked. Every schema in core ends in `## Writing rules`, one sentence each,
// written so that an agent reading a page can check it, and nothing mechanical reaches them: the
// agent pass of R0 reads them, in prose that differs from run to run. This module turns each rule
// into a yes-or-no question about one page, and each bullet of a grouped section into a choice
// among the entities its headings name, and turns the answers into a report. It opens no socket
// and names no judge; `bin/judges/` does both, so a second judge is a second file there and the
// questions do not change.
import { sectionsOf } from "./checks.mjs";
import { constraintsOf } from "./instance.mjs";
/** @import { Files, InstanceFiles, InstanceGraph, Entity } from "./instance.mjs" */

/**
 * @typedef {{ id: string; kind: "rule"; rule: string }} RuleQuestion
 * @typedef {{ id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }} GroupQuestion
 * @typedef {RuleQuestion | GroupQuestion} Question
 * @typedef {{ path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }} Request
 * @typedef {{ path: string; why: string }} NotAsked
 * @typedef {{ asked: Request[]; notAsked: NotAsked[] }} Questions
 */

// A rule is a bullet of `## Writing rules`, and a bullet wraps: its continuation lines are
// indented, and they are joined back with one space so the question is the rule's own sentence.
/**
 * @param {string} schemaText
 * @returns {string[]}
 */
export function writingRulesOf(schemaText) {
  const body = sectionsOf(schemaText).get("Writing rules");
  if (body === undefined) return [];
  /** @type {string[]} */
  const rules = [];
  for (const line of body.split("\n")) {
    if (/^[-*]\s+\S/.test(line)) rules.push(line.replace(/^[-*]\s+/, "").trim());
    else if (/^\s+\S/.test(line) && rules.length) rules[rules.length - 1] += ` ${line.trim()}`;
  }
  return rules;
}

// The purpose is what the rules serve, so a judge that reads a rule without it reads less than
// the agent does.
/**
 * @param {string} schemaText
 * @returns {string}
 */
export const purposeOf = (schemaText) => (sectionsOf(schemaText).get("Purpose") ?? "").trim();

// A grouped section's bullets, each with the `###` heading it stands under, or null for one
// written before any heading.
/**
 * @param {string} sectionText
 * @returns {{ heading: string | null; bullet: string }[]}
 */
export function bulletsOf(sectionText) {
  /** @type {{ heading: string | null; bullet: string }[]} */
  const out = [];
  /** @type {string | null} */
  let heading = null;
  for (const line of sectionText.split("\n")) {
    if (line.startsWith("### ")) heading = line.slice(4).trim();
    else if (/^[-*]\s+\S/.test(line)) out.push({ heading, bullet: line.replace(/^[-*]\s+/, "").trim() });
    else if (/^\s+\S/.test(line) && out.length) /** @type {{ bullet: string }} */ (out[out.length - 1]).bullet += ` ${line.trim()}`;
  }
  return out;
}

// Jev reads 32k tokens of state and longest question in one request. Counted in characters, at
// a conservative four to a token, a page past this is named rather than sent to be refused.
export const STATE_BUDGET = 100_000;

// The grouped sections of each type, read through constraintsOf as any consumer of the
// vocabulary reads them: a reference drawn by a section's heading is named `<Section>.<Name>`,
// and the section is one of the type's lists, which a table's section never is.
/**
 * @param {Files} schemas
 * @returns {Map<string, { section: string; target: string }[]>}
 */
function groupedOf(schemas) {
  /** @type {Map<string, { section: string; target: string }[]>} */
  const out = new Map();
  for (const [type, c] of Object.entries(constraintsOf(schemas))) {
    const lists = new Set(c.lists.map((l) => l.section));
    /** @type {{ section: string; target: string }[]} */
    const groups = [];
    for (const r of c.references) {
      const dot = r.via.indexOf(".");
      if (dot < 0 || !r.target || !lists.has(r.via.slice(0, dot))) continue;
      groups.push({ section: r.via.slice(0, dot), target: r.target });
    }
    out.set(type, groups);
  }
  return out;
}

// The options of a choice: the instance's entities of the target type by name, each described
// by its tagline and by every section of its own that holds no table — for an achievement kind,
// `## What it means`, which says what the kind covers and what it does not.
/**
 * @param {Entity[]} entities
 * @param {string} target
 * @returns {Record<string, Record<string, string>>}
 */
function optionsOf(entities, target) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  for (const e of entities) {
    if (e.type !== target || Object.hasOwn(out, e.name)) continue;
    /** @type {Record<string, string>} */
    const described = { summary: e.tagline };
    for (const s of e.sections) if (!s.tables.length && s.text.trim()) described[s.heading] = s.text.trim();
    out[e.name] = described;
  }
  return out;
}

// The questions an instance is asked, one request per page: every writing rule of the page's
// schema, then every bullet of each grouped section as a choice. The schemas are the instance's
// vendored ones, so a newer tooling never asks a rule the instance has not adopted.
/**
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {Questions}
 */
export function questionsOf({ graph, files, schemas }) {
  /** @type {Map<string, string>} */
  const schemaOf = new Map();
  for (const [key, text] of schemas)
    if (key.endsWith("-schema.md")) schemaOf.set(key.slice(key.lastIndexOf("/") + 1).replace(/-schema\.md$/, ""), text);
  const grouped = groupedOf(schemas);
  /** @type {Request[]} */
  const asked = [];
  /** @type {NotAsked[]} */
  const notAsked = [];
  for (const e of [...graph.entities].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const schema = schemaOf.get(e.type) ?? "";
    const text = files.get(e.path);
    /** @type {Question[]} */
    const questions = writingRulesOf(schema).map((rule, i) => ({ id: `r${i + 1}`, kind: /** @type {const} */ ("rule"), rule }));
    let g = 0;
    for (const { section, target } of grouped.get(e.type) ?? []) {
      const s = e.sections.find((x) => x.heading === section);
      const options = optionsOf(graph.entities, target);
      // An instance with none of the target's entities writes the section flat, as the
      // experience schema allows, and a flat list has no heading to set a pick against.
      if (!s || !Object.keys(options).length) continue;
      for (const { heading, bullet } of bulletsOf(s.text))
        questions.push({ id: `g${++g}`, kind: "group", section, heading, bullet, options });
    }
    if (typeof text !== "string" || !questions.length) {
      notAsked.push({ path: e.path, why: "its schema has no writing rules and nothing grouped" });
      continue;
    }
    const state = { purpose: purposeOf(schema), entity: text };
    const longest = Math.max(...questions.map((q) => JSON.stringify(q).length));
    if (state.purpose.length + text.length + longest > STATE_BUDGET) {
      notAsked.push({ path: e.path, why: "longer than the judge reads in one request" });
      continue;
    }
    asked.push({ path: e.path, type: e.type, name: e.name, state, questions });
  }
  return { asked, notAsked };
}
