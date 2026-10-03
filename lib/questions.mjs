// The writing rules, asked. Every schema in core ends in `## Writing rules`, one sentence each,
// written so that an agent reading a page can check it, and nothing mechanical reaches them: the
// agent pass of R0 reads them, in prose that differs from run to run. This module turns each rule
// into a yes-or-no question about one page, and each bullet of a grouped section into a choice
// among the entities its headings name, and turns the answers into a report. It opens no socket
// and names no judge; `bin/judges/` does both, so a second judge is a second file there and the
// questions do not change.
import { sectionsOf } from "./checks.mjs";

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
