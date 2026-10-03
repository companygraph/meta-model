// lib/localization.mjs
// The language a model is written in (R14), read in one place. Pure and with no import, so the
// checks and the upgrade share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag: a two- or three-letter language, then optional subtags — `en`,
// `en-US`, `gsw-CH`, `sr-Latn-RS`. Which tags exist is the registry's; this holds the shape.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;

/**
 * The language model/localization.md names, or why it cannot be read.
 * @typedef {{ error: string; missing?: true; locale?: undefined } | { error?: undefined; missing?: undefined; locale: string }} Localization
 */
/**
 * A localization page in the earlier form, rewritten, or why it cannot be.
 * @typedef {{ error: string; text?: undefined } | { error?: undefined; text: string }} Migrated
 */

// The language model/localization.md names in its `locale` field, quotes taken off, or an error
// naming why it cannot be read. A missing field is said plainly so a caller that already reports
// a missing required field can leave it to that report, and marked `missing`, so that caller
// need not match the words. A blank `locale:` is missing too. CRLF line ends, as a vault edited on
// Windows hands them over, read as LF.
/**
 * @param {string} text
 * @returns {Localization}
 */
export function localizationOf(text) {
  const fm = text.replace(/\r\n/g, "\n").match(FRONTMATTER)?.[1] ?? "";
  const locale = fm.match(/^locale:[ \t]*(\S.*?)[ \t]*$/m)?.[1].replace(/^(["'])(.*)\1$/, "$2");
  if (!locale) return { error: "no `locale` field", missing: true };
  if (!LANGUAGE_TAG.test(locale)) return { error: `\`locale\` is "${locale}", which is no language tag, as \`en-US\` or \`de-CH\` is` };
  return { locale };
}

// A localization page as a core before one language per model wrote it — a `## Locales` table
// with one `primary` row — in the form that replaced it: the primary's tag as `locale`, written
// last in the frontmatter in place of a blank `locale:`, and the table gone, the gap closed where
// it stood and every other line kept as written. Null where the page already names its `locale`,
// so a second upgrade writes nothing; null where there is nothing to read one from, or the table
// section holds more than the table, so the upgrade lands, nothing the page says is dropped, and
// the check afterward names what it owes. An error only where a `## Locales` table, leftover or
// not, declares a `translated` language: dropping that row would drop the translations the pages
// carry without a word, so the owner takes them out first. CRLF reads as LF, and is written so.
/**
 * @param {string} text
 * @returns {Migrated | null}
 */
export function migratedLocalization(text) {
  text = text.replace(/\r\n/g, "\n");
  const fm = text.match(FRONTMATTER);
  if (!fm) return null;
  const named = /^locale:[ \t]*\S/m.test(fm[1]);
  const lines = text.slice(fm[0].length).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return null;
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  const inside = lines.slice(start + 1, end).filter((l) => l.trim());
  const rows = inside
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")))
    .slice(2);
  const translated = rows.filter(([, role]) => role === "translated").map(([tag]) => tag);
  if (translated.length)
    return { error: `declares ${translated.join(", ")} translated; a model is written in one language, so take those rows and every page's \`## ${translated[0]}\` section out first` };
  if (named || inside.some((l) => !l.trim().startsWith("|"))) return null;
  const primary = rows.filter(([, role]) => role === "primary").map(([tag]) => tag);
  if (primary.length !== 1 || !LANGUAGE_TAG.test(primary[0])) return null;
  const before = lines.slice(0, start), after = lines.slice(end);
  while (before.length && !before[before.length - 1].trim()) before.pop();
  while (after.length && !after[0].trim()) after.shift();
  const body = [...before, ...(after.length ? ["", ...after] : [])].join("\n").replace(/\n*$/, "\n");
  const front = fm[1].split("\n").filter((l) => !/^locale:[ \t]*$/.test(l));
  return { text: `---\n${[...front, `locale: ${primary[0]}`].join("\n")}\n---\n${body}` };
}
