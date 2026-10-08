// Core 0.63.0 renamed the type role to seat and experience's field role to capacity. An instance
// written before it holds its seats in model/roles/, a profile's `roles:`, an experience's
// `role:`, and the type's name in a Type cell. `upgrade` carries it across with this, as it
// carried the localization page into one language: every page keeps its id and its H1, so every
// reference keeps its value, and only a folder, two keys and a cell change. Pure: paths in,
// texts out, the caller reads and writes. The folder's README is the caller's to write afresh
// for the new type, so it is only removed here.

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const PROFILE = /^model\/profiles\/([^/]+)\/\1\.md$/;
const EXPERIENCE = /^model\/profiles\/[^/]+\/experiences\/[^/]+\.md$/;

/** @param {string} text @param {string} key */
const hasKey = (text, key) => new RegExp(`^${key}:`, "m").test(text.match(FRONTMATTER)?.[1] ?? "");

// The key is renamed inside the frontmatter block only, so the body after it stays byte for byte.
/** @param {string} text @param {string} from @param {string} to @returns {string} */
const renamedKey = (text, from, to) => {
  const fm = text.match(FRONTMATTER);
  if (!fm) return text;
  return fm[0].replace(new RegExp(`^${from}:`, "m"), `${to}:`) + text.slice(fm[0].length);
};

// A table's cell under a column headed Type that names the type role, with or without backticks,
// names seat; every other cell, and every table without a Type column, is left as written.
/** @param {string} text @returns {string} */
const seatInTypeCells = (text) => {
  const lines = text.split("\n");
  let at = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim().startsWith("|")) { at = -1; continue; }
    const cells = line.trim().replace(/^\||\|$/g, "").split("|");
    if (at === -1 && (i === 0 || !lines[i - 1].trim().startsWith("|"))) {
      at = cells.findIndex((c) => c.trim().replace(/`/g, "") === "Type");
      continue;
    }
    if (at < 0 || /^\s*:?-+:?\s*$/.test(cells[0])) continue;
    const cell = cells[at];
    if (cell === undefined || cell.trim().replace(/`/g, "") !== "role") continue;
    cells[at] = cell.replace("role", "seat");
    lines[i] = `|${cells.join("|")}|`;
  }
  return lines.join("\n");
};

/**
 * @param {Map<string, string>} model every file under the instance's model/, keyed by its path from the instance root
 * @returns {null | { error: string } | { writes: Map<string, string>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export function migratedSeats(model) {
  const paths = [...model.keys()].sort();
  const inRoles = paths.filter((p) => p.startsWith("model/roles/"));
  if (inRoles.length && paths.some((p) => p.startsWith("model/seats/")))
    return { error: "model/seats/ already exists beside model/roles/; move one of them aside" };
  for (const p of paths) {
    const text = /** @type {string} */ (model.get(p));
    if (PROFILE.test(p) && hasKey(text, "roles") && hasKey(text, "seats")) return { error: `${p} carries both \`roles\` and \`seats\`; keep one` };
    if (EXPERIENCE.test(p) && hasKey(text, "role") && hasKey(text, "capacity")) return { error: `${p} carries both \`role\` and \`capacity\`; keep one` };
  }
  /** @type {Map<string, string>} */
  const writes = new Map();
  /** @type {string[]} */
  const removes = [];
  /** @type {[string, string][]} */
  const moved = [];
  /** @type {string[]} */
  const rewritten = [];
  for (const p of paths) {
    if (!p.endsWith(".md")) continue;
    const before = /** @type {string} */ (model.get(p)).replace(/\r\n/g, "\n");
    let text = before;
    if (PROFILE.test(p) && hasKey(text, "roles")) text = renamedKey(text, "roles", "seats");
    if (EXPERIENCE.test(p) && hasKey(text, "role")) text = renamedKey(text, "role", "capacity");
    text = seatInTypeCells(text);
    if (p.startsWith("model/roles/")) {
      removes.push(p);
      if (p === "model/roles/README.md") continue;
      const to = `model/seats/${p.slice("model/roles/".length)}`;
      writes.set(to, text);
      moved.push([p, to]);
    } else if (text !== before) {
      writes.set(p, text);
      rewritten.push(p);
    }
  }
  return writes.size || removes.length ? { writes, removes, moved, rewritten } : null;
}
