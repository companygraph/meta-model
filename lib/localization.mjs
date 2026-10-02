// lib/localization.mjs
// The language a model is written in (R14), read in one place. Pure and with no import, so the
// checks and the upgrade share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag as a heading or a cell carries one: `de-CH`, `en-US`, `pl-PL`, `fr`. No
// heading a schema declares is written so, since every declared heading opens with a capital.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
/** @param {string} text */
const withoutFrontmatter = (text) => text.replace(FRONTMATTER, "");

/**
 * What model/localization.md declares, or why it cannot be read.
 * @typedef {{ error: string; primary?: undefined; translated?: undefined }
 *   | { error?: undefined; primary: string; translated: string[] }} Localization
 */

// What model/localization.md declares: the primary language and the translated ones, in the
// order its `## Locales` table lists them. What cannot be read is an error naming why, and the
// caller reports it once, on the file.
/**
 * @param {string} text
 * @returns {Localization}
 */
export function localizationOf(text) {
  const lines = withoutFrontmatter(text).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return { error: "no `## Locales` table" };
  /** @type {string[][]} */
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (line.trim().startsWith("|")) rows.push(line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")));
  }
  const [head, sep, ...data] = rows;
  if (!head || head[0] !== "Locale" || head[1] !== "Role") return { error: "`## Locales` is not a table with the columns Locale | Role" };
  if (!sep || !sep.every((cell) => /^:?-+:?$/.test(cell)))
    return { error: "`## Locales` is not a table with the columns Locale | Role" };
  const primary = /** @type {string[]} */ ([]), translated = /** @type {string[]} */ ([]), seen = new Set();
  for (const [tag = "", role = ""] of data) {
    if (!LANGUAGE_TAG.test(tag)) return { error: `"${tag}" is no language tag, as \`de-CH\` or \`en-US\` is` };
    if (seen.has(tag)) return { error: `${tag} is written twice` };
    seen.add(tag);
    if (role === "primary") primary.push(tag);
    else if (role === "translated") translated.push(tag);
    else return { error: `${tag} has the role "${role}"; a role is \`primary\` or \`translated\`` };
  }
  if (primary.length !== 1) return { error: `${primary.length ? "more than one" : "no"} language is \`primary\`; exactly one is` };
  return { primary: /** @type {string} */ (primary[0]), translated };
}
