// Core 0.63.0 renamed the type role to seat and experience's field role to capacity. An instance
// written before it holds its seats in model/roles/, a profile's `roles:`, an experience's
// `role:`, and the type's name in a Type cell. `upgrade` carries it across with this, as it
// carried the localization page into one language: every page keeps its id and its H1, so every
// reference keeps its value, and only a folder, two keys and a cell change. Every file under
// model/roles/ moves with it, a page rewritten and any other file, an image or an editor's
// leftover, as the bytes it is, while a page moves as the checks read it, with `\n` line ends
// (the caller normalizes a CRLF page when it reads); the folder's README is the owner's text and
// moves with three words changed. Pure: paths in, texts out, the caller reads and writes. The caller writes a
// fresh README for the new type only where the old folder had none.

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const PROFILE = /^model\/profiles\/([^/]+)\/\1\.md$/;
const EXPERIENCE = /^model\/profiles\/[^/]+\/experiences\/[^/]+\.md$/;
const DASHES = /^\s*:?-+:?\s*$/;

/** @param {string} text @param {string} key */
const hasKey = (text, key) => new RegExp(`^${key}:`, "m").test(text.match(FRONTMATTER)?.[1] ?? "");

// The key is renamed inside the frontmatter block only, so the body after it stays as it was given.
/** @param {string} text @param {string} from @param {string} to @returns {string} */
const renamedKey = (text, from, to) => {
  const fm = text.match(FRONTMATTER);
  if (!fm) return text;
  return fm[0].replace(new RegExp(`^${from}:`, "m"), `${to}:`) + text.slice(fm[0].length);
};

// A table's cell under a column headed Type that names the type role, with or without backticks,
// names seat; every other cell, and every table without a Type column, is left as written. The
// separator row is the one whose every cell is dashes, a table inside a fenced block is code and
// is left alone, and a rewritten row keeps the pipes it was written with.
/** @param {string} text @returns {string} */
const seatInTypeCells = (text) => {
  const lines = text.split("\n");
  let at = -1;
  let inTable = false;
  /** @type {string | null} */
  let fence = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const marker = trimmed.match(/^(`{3,}|~{3,})/)?.[1];
    if (fence !== null) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = null;
      continue;
    }
    if (marker) {
      fence = marker;
      inTable = false;
      at = -1;
      continue;
    }
    if (!trimmed.startsWith("|")) { inTable = false; at = -1; continue; }
    const [, lead, body, trail] = /** @type {RegExpMatchArray} */ (line.match(/^(\s*\|)(.*?)(\|?\s*)$/));
    const cells = body.split("|");
    if (!inTable) {
      inTable = true;
      at = cells.findIndex((c) => c.trim().replace(/`/g, "") === "Type");
      continue;
    }
    if (at < 0 || cells.every((c) => DASHES.test(c))) continue;
    const cell = cells[at];
    if (cell === undefined || cell.trim().replace(/`/g, "") !== "role") continue;
    cells[at] = cell.replace("role", "seat");
    lines[i] = `${lead}${cells.join("|")}${trail}`;
  }
  return lines.join("\n");
};

// The owner's own README for the folder, brought to the new type in the three places it names the
// old one: its H1 when that is `# Roles`, the folder `roles/` and the schema `role-schema.md`.
/** @param {string} text @returns {string} */
const readmeAsSeats = (text) => text.replace(/^# Roles$/m, "# Seats").replace(/\broles\//g, "seats/").replace(/\brole-schema\.md/g, "seat-schema.md");

/**
 * @param {Map<string, string | Uint8Array>} model every file under the instance's model/, keyed by its path from the instance root; a page as text, any other file as the bytes it is
 * @returns {null | { error: string } | { writes: Map<string, string | Uint8Array>; removes: string[]; moved: [string, string][]; rewritten: string[] }}
 */
export function migratedSeats(model) {
  const paths = [...model.keys()].sort();
  const inRoles = paths.filter((p) => p.startsWith("model/roles/"));
  const page = (/** @type {string} */ p) => p.endsWith(".md");
  if (inRoles.some(page) && paths.some((p) => p.startsWith("model/seats/") && page(p)))
    return { error: "model/seats/ already exists beside model/roles/; move one of them aside" };
  // A page is read with `\n` line ends, and the refusals ask it so: a page that carries both keys
  // does so whichever line ends it was written with.
  /** @type {Map<string, string>} */
  const texts = new Map();
  for (const p of paths) {
    const held = /** @type {string | Uint8Array} */ (model.get(p));
    if (page(p) && typeof held === "string") texts.set(p, held.replace(/\r\n/g, "\n"));
  }
  for (const [p, text] of texts) {
    if (PROFILE.test(p) && hasKey(text, "roles") && hasKey(text, "seats")) return { error: `${p} carries both \`roles\` and \`seats\`; keep one` };
    if (EXPERIENCE.test(p) && hasKey(text, "role") && hasKey(text, "capacity")) return { error: `${p} carries both \`role\` and \`capacity\`; keep one` };
  }
  /** @type {Map<string, string | Uint8Array>} */
  const writes = new Map();
  /** @type {string[]} */
  const removes = [];
  /** @type {[string, string][]} */
  const moved = [];
  /** @type {string[]} */
  const rewritten = [];
  for (const p of paths) {
    const inFolder = p.startsWith("model/roles/");
    const to = inFolder ? `model/seats/${p.slice("model/roles/".length)}` : p;
    const before = texts.get(p);
    if (before === undefined) {
      if (!inFolder) continue;
      writes.set(to, /** @type {string | Uint8Array} */ (model.get(p)));
    } else {
      let text = before;
      if (inFolder && p === "model/roles/README.md") text = readmeAsSeats(text);
      else {
        if (PROFILE.test(p) && hasKey(text, "roles")) text = renamedKey(text, "roles", "seats");
        if (EXPERIENCE.test(p) && hasKey(text, "role")) text = renamedKey(text, "role", "capacity");
        text = seatInTypeCells(text);
      }
      if (inFolder || text !== before) writes.set(to, text);
      if (text !== before) rewritten.push(to);
    }
    if (inFolder) {
      removes.push(p);
      moved.push([p, to]);
    }
  }
  return writes.size || removes.length ? { writes, removes, moved, rewritten } : null;
}

/**
 * Whether a path from the instance root is the owner's own to edit: not under the vendored units
 * folder, wherever its value nests it, and not under the installed packages or a build.
 * @param {string} path
 * @param {string} units
 * @returns {boolean}
 */
export const isInstancesOwn = (path, units) => ![units, "node_modules", "dist"].some((folder) => path.startsWith(`${folder}/`));

/**
 * After the roles moved to seats, the instance's own files that still say roles: the paths a text
 * names (`roles/`, `roles.md`) and the count a page draws (`{{count:Roles}}`), and the seats
 * README, which the owner wrote about roles, where it still uses the word. Pure: the caller
 * reads the texts and says which files to read (the command line reads the ones git lists, an
 * editor its vault's), and anything the units folder, installed packages or a build holds is
 * left out whatever it is given. Named and never rewritten, since each is the owner's own text.
 * @param {Map<string, string>} files the instance's files as text, keyed by their path from the instance root
 * @param {string} units the units folder the manifest names
 * @returns {string[]} the paths that still name roles, sorted
 */
export function stillNamingRoles(files, units) {
  /** @type {string[]} */
  const found = [];
  for (const [path, text] of files) {
    if (!isInstancesOwn(path, units)) continue;
    if (/roles\/|roles\.md|\{\{count:Roles\}\}/.test(text) || (path === "model/seats/README.md" && /\brole\b/i.test(text))) found.push(path);
  }
  return found.sort();
}
