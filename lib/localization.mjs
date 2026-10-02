// lib/localization.mjs
// The language a model is written in (R14), read in one place. Pure and with no import, so the
// checks and the upgrade share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag: a two- or three-letter language, then optional subtags — `en`,
// `en-US`, `gsw-CH`, `sr-Latn-RS`. Which tags exist is the registry's; this holds the shape.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;

/**
 * The language model/localization.md names, or why it cannot be read.
 * @typedef {{ error: string; locale?: undefined } | { error?: undefined; locale: string }} Localization
 */
/**
 * A localization page in the earlier form, rewritten, or why it cannot be.
 * @typedef {{ error: string; text?: undefined } | { error?: undefined; text: string }} Migrated
 */

// The language model/localization.md names in its `locale` field, quotes taken off, or an error
// naming why it cannot be read. A missing field is said plainly so a caller that already reports
// a missing required field can leave it to that report.
/**
 * @param {string} text
 * @returns {Localization}
 */
export function localizationOf(text) {
  const fm = text.match(FRONTMATTER)?.[1] ?? "";
  const locale = fm.match(/^locale:[ \t]*(\S.*?)[ \t]*$/m)?.[1].replace(/^(["'])(.*)\1$/, "$2");
  if (!locale) return { error: "no `locale` field" };
  if (!LANGUAGE_TAG.test(locale)) return { error: `\`locale\` is "${locale}", which is no language tag, as \`en-US\` or \`de-CH\` is` };
  return { locale };
}

// A localization page as a core before one language per model wrote it — a `## Locales` table
// with one `primary` row — in the form that replaced it: the primary's tag as `locale`, written
// last in the frontmatter, and the table gone, every other section kept. Null where the page
// already names its `locale`, so a second upgrade writes nothing. An error where there is no
// table to read one from, or the table declares a `translated` language: dropping that row would
// drop the translations the pages carry without a word, so the owner takes them out first.
/**
 * @param {string} text
 * @returns {Migrated | null}
 */
export function migratedLocalization(text) {
  const fm = text.match(FRONTMATTER);
  if (!fm) return { error: "has no frontmatter to write `locale` into" };
  if (/^locale:/m.test(fm[1])) return null;
  const lines = text.slice(fm[0].length).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return { error: "names no `locale` and has no `## Locales` table to read one from" };
  let end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  if (end === -1) end = lines.length;
  const rows = lines
    .slice(start + 1, end)
    .filter((l) => l.trim().startsWith("|"))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")))
    .slice(2);
  const translated = rows.filter(([, role]) => role === "translated").map(([tag]) => tag);
  if (translated.length)
    return { error: `declares ${translated.join(", ")} translated; a model is written in one language, so take those rows and every page's \`## ${translated[0]}\` section out first` };
  const primary = rows.filter(([, role]) => role === "primary").map(([tag]) => tag);
  if (primary.length !== 1 || !LANGUAGE_TAG.test(primary[0]))
    return { error: "has no one `primary` language tag in its `## Locales` table to name as `locale`" };
  const body = [...lines.slice(0, start), ...lines.slice(end)].join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");
  return { text: `---\n${fm[1]}\nlocale: ${primary[0]}\n---\n${body}` };
}
