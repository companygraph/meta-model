// The flags an instance's owner has already decided, in `judge/known.md`: one table, a row per
// rule on a page, `false` where the judge was wrong and `accepted` where the page breaks the rule
// and the owner keeps it. A run of the judge skill reads it before the flags, so a flag decided
// once is not read again, and `check` holds every row, so a row that names nothing fails on the
// commit that wrote it. The design is
// docs/superpowers/specs/2026-10-04-the-judge-knows-its-flags-design.md. Pure but for the hash:
// an instance as `instanceAt` returns it in, failures and notes out.
import { createHash } from "node:crypto";
import { tableOf } from "./checks.mjs";
import { resolveRow } from "./instance.mjs";
import { writingRulesOf } from "./questions.mjs";
/** @import { InstanceGraph, InstanceFiles, Files, Entity } from "./instance.mjs" */

export const KNOWN = "judge/known.md";
export const KNOWN_COLUMNS = ["Entity", "Owner", "Rule", "Verdict", "Why", "Seat", "Profile", "Date", "Hash"];

// What a row is keyed on: the page as it was read and the rule as it was worded. A page edit, a
// reworded rule and a rule inserted above, which moves `r<N>` onto other words, each change it,
// and a decision about a page holds only for the page and the rule it was made about. Line ends
// are the page's `\n` ones whatever the checkout wrote, so a row does not lapse by platform.
/**
 * @param {string} page
 * @param {string} rule
 * @returns {string}
 */
export const knownHashOf = (page, rule) =>
  createHash("sha256").update(`${page.replace(/\r\n/g, "\n")}\n${rule}`).digest("hex").slice(0, 16);

/** @param {string | undefined} cell */
const clean = (cell) => (cell ?? "").replace(/`/g, "").trim();

/** @param {string} date */
const isDay = (date) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;

// A type's schema among those the instance vendored, core's keyed `<type>-schema.md` and a
// pack's `<pack>/<type>-schema.md`, as `parseSchemas` reads them.
/**
 * @param {Files} schemas
 * @param {string} type
 * @returns {string | null}
 */
const schemaTextOf = (schemas, type) => {
  for (const [key, text] of schemas) if (key === `${type}-schema.md` || key.endsWith(`/${type}-schema.md`)) return text;
  return null;
};

// Every row against the instance: its page and owner resolve as any `ref → by Entity in Owner`
// row does, its rule is one the type's schema has at that position, its seat is one its
// profile holds, and its verdict, date and hash are well formed. A row whose hash no longer
// matches is not broken, it is a reason to read that flag again, so it is a note.
/**
 * @param {string} text
 * @param {{ graph: InstanceGraph; files: InstanceFiles; schemas: Files }} instance
 * @returns {{ failures: string[]; notes: string[] }}
 */
export function checkKnown(text, { graph, files, schemas }) {
  /** @type {string[]} */
  const failures = [];
  /** @type {string[]} */
  const notes = [];
  const table = tableOf(text);
  if (!table) return { failures: [`${KNOWN}: holds no table; it is one table with the columns ${KNOWN_COLUMNS.join(" | ")}`], notes };
  const columns = table.columns.map(clean);
  if (columns.join("|") !== KNOWN_COLUMNS.join("|"))
    return { failures: [`${KNOWN}: the table's columns are ${columns.join(" | ")}, and a known flag takes ${KNOWN_COLUMNS.join(" | ")}`], notes };
  /** @type {Map<string, number>} */
  const seen = new Map();
  table.rows.forEach((cells, i) => {
    const [entity, owner, rule, verdict, why, seat, profile, date, hash] = KNOWN_COLUMNS.map((_, c) => clean(cells[c]));
    const before = failures.length;
    /** @param {string} message */
    const fail = (message) => failures.push(`${KNOWN}: row ${i + 1}: ${message}`);
    const ruled = /^([a-z][a-z0-9-]*) r([1-9]\d*)$/.exec(rule);
    /** @type {Entity | null} */
    let page = null;
    /** @type {string | undefined} */
    let words;
    if (!ruled) fail(`Rule "${rule}" is not <type> r<N>`);
    else {
      const [, type, n] = ruled;
      const found = resolveRow(graph.entities, schemas, owner ? { type, name: entity, owner } : { type, name: entity });
      if (found.entity) page = found.entity;
      else fail(found.subject === "owner" ? `Owner "${owner}" ${found.error}` : `Entity "${entity}" ${found.error}`);
      const schema = schemaTextOf(schemas, type);
      words = schema === null ? undefined : writingRulesOf(schema)[Number(n) - 1];
      if (schema !== null && words === undefined) fail(`${type} has no writing rule r${n}`);
    }
    if (verdict !== "false" && verdict !== "accepted") fail(`Verdict "${verdict}" is neither false nor accepted`);
    if (!why) fail("Why is empty, and a row says why");
    const held = resolveRow(graph.entities, schemas, { type: "seat", name: seat });
    if (!held.entity) fail(`Seat "${seat}" ${held.error}`);
    const holder = resolveRow(graph.entities, schemas, { type: "profile", name: profile });
    if (!holder.entity) fail(`Profile "${profile}" ${holder.error}`);
    if (held.entity && holder.entity && ![holder.entity.fields.seats ?? []].flat().includes(held.entity.name))
      fail(`${profile} does not hold the seat ${seat}: its \`seats\` does not name it`);
    if (!isDay(date)) fail(`Date "${date}" is not a day, YYYY-MM-DD`);
    if (!/^[0-9a-f]{16}$/i.test(hash)) fail(`Hash "${hash}" is not sixteen hex characters`);
    if (page && ruled) {
      const key = `${page.id} ${rule}`;
      const first = seen.get(key);
      if (first) fail(`names ${entity} and ${rule} again, as row ${first} does`);
      else seen.set(key, i + 1);
    }
    if (failures.length === before && page && words !== undefined && knownHashOf(String(files.get(page.path)), words) !== hash.toLowerCase())
      notes.push(`${KNOWN}: ${entity}${owner ? ` in ${owner}` : ""} ${rule}: lapsed, the page or the rule changed since ${date}`);
  });
  return { failures, notes };
}
