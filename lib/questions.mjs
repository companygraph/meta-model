// The writing rules, asked. Every schema in core ends in `## Writing rules`, one sentence each,
// written so that an agent reading a page can check it, and nothing mechanical reaches them: the
// agent pass of R0 reads them, in prose that differs from run to run. This module turns each rule
// into a yes-or-no question about one page, and each bullet of a grouped section into a choice
// among the entities its headings name, and turns the answers into a report. It opens no socket
// and names no judge; `bin/judges/` does both, so a second judge is a second file there and the
// questions do not change.
import { sectionsOf, blocksOf, tableOf } from "./checks.mjs";
import { constraintsOf } from "./instance.mjs";
/** @import { Files, InstanceFiles, InstanceGraph, Entity } from "./instance.mjs" */

/**
 * @typedef {{ id: string; kind: "rule"; rule: string }} RuleQuestion
 * @typedef {{ id: string; kind: "group"; section: string; heading: string | null; bullet: string; options: Record<string, Record<string, string>> }} GroupQuestion
 * @typedef {RuleQuestion | GroupQuestion} Question
 * @typedef {{ path: string; type: string; name: string; state: { purpose: string; entity: string }; questions: Question[] }} Request
 * @typedef {{ path: string; why: string }} NotAsked
 * @typedef {{ path: string; type: string; id: string; rule: string; without: string }} Skipped
 * @typedef {{ asked: Request[]; notAsked: NotAsked[]; skipped: Skipped[] }} Questions
 * @typedef {{ sections: Set<string>; columns: Map<string, string[]>; fields: Set<string> }} Subjects
 * @typedef {{ sections: string[]; column: string | null }} Subject
 */
/**
 * @typedef {{ p: number }} RuleAnswer
 * @typedef {{ pick: string; probabilities: Record<string, number> }} GroupAnswer
 * @typedef {Record<string, RuleAnswer | GroupAnswer>} Answers
 * @typedef {{ error: string }} Failed
 * @typedef {{ low: number; high: number; pick: number }} Band
 */

// A rule is a bullet of `## Writing rules`, and a bullet wraps: its continuation lines are
// indented, and they are joined back with one space so the question is the rule's own sentence.
// A bullet nested under a rule is part of that rule, joined the same way without its marker.
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
    else if (/^\s+\S/.test(line) && rules.length) rules[rules.length - 1] += ` ${line.trim().replace(/^[-*]\s+/, "")}`;
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

// What a schema declares that a rule can be about: its sections, by heading; each column of a
// section's table, with every section whose table declares it; and its frontmatter fields. A
// rule names one of the first two as its subject when its sentence opens with it in backticks,
// and a page without that subject gives the rule nothing to judge. A field is never a subject:
// a rule that opens with one, as the experience schema's first opens with `role`, may judge
// whether the field is there at all, so a page without the field is what that rule reads.
/**
 * @param {string} schemaText
 * @returns {Subjects}
 */
export function subjectsOf(schemaText) {
  /** @type {Set<string>} */
  const sections = new Set();
  /** @type {Set<string>} */
  const fields = new Set();
  /** @type {Map<string, string[]>} */
  const columns = new Map();
  const cell = (/** @type {string | undefined} */ c) => (c ?? "").replace(/`/g, "").trim();
  for (const b of blocksOf(sectionsOf(schemaText).get("Sections") ?? "")) {
    if (!b.table) continue;
    if (b.section) {
      for (const r of b.table.rows) {
        const name = cell(r[0]);
        if (name) columns.set(name, [...(columns.get(name) ?? []), b.section]);
      }
    } else if (!b.grouped) {
      for (const r of b.table.rows) {
        const m = (r[0] ?? "").trim().match(/^`##\s+(.+?)`$/);
        if (m?.[1]) sections.add(m[1].trim());
      }
    }
  }
  for (const r of tableOf(sectionsOf(schemaText).get("Frontmatter") ?? "")?.rows ?? []) {
    const name = cell(r[0]);
    if (name) fields.add(name);
  }
  return { sections, columns, fields };
}

/**
 * @param {string} rule
 * @param {Subjects} subjects
 * @returns {Subject | null}
 */
export function subjectOf(rule, subjects) {
  const name = rule.match(/^`([^`]+)`/)?.[1]?.trim();
  if (!name || subjects.fields.has(name)) return null;
  const heading = name.match(/^##\s+(.+)$/)?.[1]?.trim();
  if (heading) return subjects.sections.has(heading) ? { sections: [heading], column: null } : null;
  const within = subjects.columns.get(name);
  return within ? { sections: within, column: name } : null;
}

// A grouped section's bullets, each with the `###` heading it stands under, or null for one
// written before any heading. A nested bullet is a claim of its own under the same heading. A
// numbered list is not read: the one grouped section that holds one, a phase's activities, is an
// order of work and asks no reader to place an item.
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
    else if (/^\s*[-*]\s+\S/.test(line)) out.push({ heading, bullet: line.trim().replace(/^[-*]\s+/, "") });
    else if (/^\s+\S/.test(line) && out.length) /** @type {{ bullet: string }} */ (out[out.length - 1]).bullet += ` ${line.trim()}`;
  }
  return out;
}

// Jev reads 32k tokens of state and longest question in one request. Counted in characters, at
// three to a token, which a German page comes close to, a page past this is named rather than
// sent to be refused.
export const STATE_BUDGET = 90_000;

// The most options one choice holds, as TypeSafe's API sets it.
const MAX_OPTIONS = 255;

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
// `## What it means`, which says what the kind covers and what it does not. An owned target is
// chosen among the entities of the page's own owner, or of the page where it is the owner, as a
// heading naming one resolves (R10): a phase's tracks are its process's, not every process's.
/**
 * @param {Entity[]} entities
 * @param {string} target
 * @param {Entity} page
 * @returns {Record<string, Record<string, string>>}
 */
function optionsOf(entities, target, page) {
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  const owned = entities.some((e) => e.type === target && e.owner);
  for (const e of entities) {
    if (e.type !== target || Object.hasOwn(out, e.name)) continue;
    if (owned && e.owner !== page.owner && e.owner !== page.id) continue;
    /** @type {Record<string, string>} */
    const described = { summary: e.tagline };
    for (const s of e.sections) if (!s.tables.length && s.text.trim()) described[s.heading] = s.text.trim();
    out[e.name] = described;
  }
  return out;
}

// Whether a page has what a rule is about: the section, or a table in one of the sections that
// declare the column, with that column. And what the report says the page is without.
/**
 * @param {Entity} e
 * @param {Subject} s
 */
const hasSubject = (e, s) =>
  e.sections.some((x) => s.sections.includes(x.heading) && (s.column === null || x.tables.some((t) => t.columns.some((c) => c.replace(/`/g, "").trim() === s.column))));
/** @param {Subject} s */
const without = (s) => (s.column === null ? `without \`## ${s.sections[0]}\`` : `without ${/^[aeiou]/i.test(s.column) ? "an" : "a"} \`${s.column}\` column`);

// The questions an instance is asked, one request per page: every writing rule of the page's
// schema whose subject the page has, then every bullet of each grouped section as a choice. A
// rule that opens by naming a section or a table column the page does not have is left out of
// its request and named under `skipped`, and keeps its number, so r14 is r14 asked or not. The schemas are the instance's
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
  /** @type {Skipped[]} */
  const skipped = [];
  for (const e of [...graph.entities].sort((a, b) => (a.path < b.path ? -1 : 1))) {
    const schema = schemaOf.get(e.type) ?? "";
    const text = files.get(e.path);
    const subjects = subjectsOf(schema);
    /** @type {Question[]} */
    const questions = [];
    let lacked = 0;
    writingRulesOf(schema).forEach((rule, i) => {
      const id = `r${i + 1}`, subject = subjectOf(rule, subjects);
      if (subject && !hasSubject(e, subject)) {
        skipped.push({ path: e.path, type: e.type, id, rule, without: without(subject) });
        lacked++;
      } else questions.push({ id, kind: /** @type {const} */ ("rule"), rule });
    });
    let g = 0;
    for (const { section, target } of grouped.get(e.type) ?? []) {
      const s = e.sections.find((x) => x.heading === section);
      const options = optionsOf(graph.entities, target, e);
      // An instance with none of the target's entities writes the section flat, as the
      // experience schema allows, and a flat list has no heading to set a pick against.
      if (!s || !Object.keys(options).length) continue;
      if (Object.keys(options).length > MAX_OPTIONS) {
        notAsked.push({ path: e.path, why: `"## ${section}" as a choice: more than ${MAX_OPTIONS} ${target} entities to choose among` });
        continue;
      }
      for (const { heading, bullet } of bulletsOf(s.text))
        questions.push({ id: `g${++g}`, kind: "group", section, heading, bullet, options });
    }
    if (typeof text !== "string" || !questions.length) {
      notAsked.push({ path: e.path, why: lacked ? "it has nothing a writing rule of its schema is about, and nothing grouped" : "its schema has no writing rules and nothing grouped" });
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
  return { asked, notAsked, skipped };
}

// The band of probability that counts as near even, read off the calibration curve the
// measuring prints (`node tools/measure-judge.mjs`) and written here and into the spec's
// Measuring section together, never by guess. Measured on October 3, 2026 over the reference
// instance with jev-1.13.0: below 0.6 about four pages in five broke the rule, 0.6 to 0.7 was
// near even, and the probabilities run high, so the band is where the answers proved near even
// and not where they read 0.5. A choice is its own curve: a pick at 0.9 or above was right 97%
// of the time and below it mostly wrong, so `pick` is the threshold a differing pick is flagged
// at. A newer model is measured again before its band is written.
export const BAND = /** @type {Band | null} */ ({ low: 0.6, high: 0.7, pick: 0.9 });

// When and over what the band was measured, said in the report beside the flags it decides.
const MEASURED = "the measuring of October 3, 2026";

// How many of a page's rule verdicts an unmeasured report lists, lowest first, for the agent
// pass to read first.
export const LOWEST = 3;

/** @param {number} p */
const two = (p) => p.toFixed(2);
/**
 * @param {string} s
 * @param {number} n
 */
const short = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
/** @param {number[]} xs */
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? /** @type {number} */ (s[m]) : (/** @type {number} */ (s[m - 1]) + /** @type {number} */ (s[m])) / 2;
};

// The report, as lines. It is advisory and says so first, never prints a line that reads as a
// pass, and ends as the validate skill's report ends, naming what it did not ask. A measured
// band flags a rule verdict below it and a pick that differs from its heading at or above its
// pick threshold, and names
// every rule that lands near even for most of the pages it was asked of: the judge had the same
// sentence and the same file as an agent, so that rule cannot be checked as written, and the
// answer is a rewritten rule in a release of core, never a band moved here.
/**
 * @param {Questions} questions
 * @param {Map<string, Answers | Failed>} answers
 * @param {{ band?: Band | null }} [options]
 * @returns {string[]}
 */
export function reportOf({ asked, notAsked }, answers, { band = BAND } = {}) {
  const lines = ["judge: advisory — it gates nothing and is no pass; the agent pass still reads every page against every rule"];
  if (band) lines.push(`flagged: a rule verdict below ${two(band.low)}, and a pick of ${two(band.pick)} or above that differs from its heading — read off ${MEASURED}`);
  else lines.push(`probabilities unmeasured: nothing is flagged; each page's ${LOWEST} lowest verdicts and every pick that differs from its heading are listed, marked ?, for the agent pass to read first`);
  /** @type {NotAsked[]} */
  const failed = [];
  /** @type {Map<string, { type: string; id: string; rule: string; ps: number[] }>} */
  const rules = new Map();
  for (const r of asked) {
    const a = answers.get(r.path);
    if (!a) continue;
    if ("error" in a && typeof a.error === "string") {
      failed.push({ path: r.path, why: a.error });
      continue;
    }
    const got = /** @type {Answers} */ (a);
    /** @type {{ p: number; line: string }[]} */
    const verdicts = [];
    /** @type {string[]} */
    const picks = [];
    for (const q of r.questions) {
      const answer = got[q.id];
      if (!answer) continue;
      if (q.kind === "rule" && "p" in answer) {
        const key = `${r.type} ${q.id}`;
        const seen = rules.get(key) ?? { type: r.type, id: q.id, rule: q.rule, ps: [] };
        seen.ps.push(answer.p);
        rules.set(key, seen);
        verdicts.push({ p: answer.p, line: `${two(answer.p)}  ${q.id}  ${short(q.rule, 100)}` });
      } else if (q.kind === "group" && "pick" in answer && answer.pick !== q.heading) {
        const p = answer.probabilities[answer.pick] ?? 0;
        if (band && p < band.pick) continue;
        const under = q.heading === null ? "no heading" : `### ${q.heading}`;
        picks.push(`  ${band ? "!" : "?"} ${two(p)}  ${q.id}  "${short(q.bullet, 60)}" stands under ${under}; the judge picks ${answer.pick}`);
      }
    }
    const listed = band
      ? verdicts.filter((v) => v.p < band.low).map((v) => `  ! ${v.line}`)
      : [...verdicts].sort((x, y) => x.p - y.p).slice(0, LOWEST).map((v) => `  ? ${v.line}`);
    if (listed.length || picks.length) lines.push("", `model/${r.path}`, ...listed, ...picks);
  }
  lines.push("", "rules:");
  const byRule = [...rules.values()].sort((a, b) => (a.type === b.type ? Number(a.id.slice(1)) - Number(b.id.slice(1)) : a.type < b.type ? -1 : 1));
  for (const { type, id, ps } of byRule) {
    let line = `  ${type} ${id}: asked of ${ps.length}, median ${two(median(ps))}`;
    if (band) {
      const near = ps.filter((p) => p >= band.low && p <= band.high).length;
      line += `, near even for ${near}`;
      if (near * 2 > ps.length) line += " — cannot be judged as written; a finding against the schema";
    }
    lines.push(line);
  }
  const unasked = [...notAsked, ...failed].sort((a, b) => (a.path < b.path ? -1 : 1));
  lines.push("", "not asked:", ...(unasked.length ? unasked.map((n) => `  model/${n.path}: ${n.why}`) : ["  none"]));
  return lines;
}
