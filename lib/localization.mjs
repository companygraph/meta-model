// lib/localization.mjs
// How a model is kept in more than one language (R14, R19), read in one place. Pure and with no
// import, so the parser, the checks and the CLI share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag as a heading or a cell carries one: `de-CH`, `en-US`, `pl-PL`, `fr`. No
// heading a schema declares is written so, since every declared heading opens with a capital.
/** @import { PageChange } from "./history.mjs" */

export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
/** @param {string} text */
export const withoutFrontmatter = (text) => text.replace(FRONTMATTER, "");

const FENCE = /^\s*(```|~~~)/;

/**
 * What model/localization.md declares, or why it cannot be read.
 * @typedef {{ error: string; primary?: undefined; translated?: undefined }
 *   | { error?: undefined; primary: string; translated: string[] }} Localization
 */
/**
 * A page's body cut at its language sections: see languageSectionsOf.
 * @typedef {object} LanguageSections
 * @property {string} primary
 * @property {Map<string, string>} sections
 * @property {string[]} order
 * @property {string[]} after
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

// A page's body, without its frontmatter, cut where its language sections begin: `primary` is
// everything before the first `## <tag>`, and each language section runs to the next `##`. A
// fenced block is never cut. `order` lists the language headings as written, twice where one is
// written twice, and `after` every other `##` heading that stands below one, which R19 does not
// allow; its lines go back to the primary, so nothing a page says is lost to a misplaced heading.
//
// `tags`, given, cuts only a heading whose tag is listed — the parser's own use (lib/instance.mjs),
// so a `## api` or `## faq` that no `model/localization.md` declares translated is never mistaken
// for one and dropped from the page's ordinary sections. Left out, every tag-shaped heading is
// cut, which is what the checks need (lib/checks.mjs) to find a section for a language the
// instance does not declare — this default is every existing caller's behaviour, unchanged.
/**
 * @param {string} body
 * @param {{ tags?: string[] }} [options]
 * @returns {LanguageSections}
 */
export function languageSectionsOf(body, { tags } = {}) {
  const primary = /** @type {string[]} */ ([]), sections = /** @type {Map<string, string[]>} */ (new Map()), order = /** @type {string[]} */ ([]), after = /** @type {string[]} */ ([]);
  /** @type {string | null} */
  let current = null, fenced = false, languageStarted = false;
  for (const line of body.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading && LANGUAGE_TAG.test(heading[1]) && (!tags || tags.includes(heading[1]))) {
      current = heading[1];
      order.push(current);
      languageStarted = true;
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (heading && languageStarted) {
      after.push(heading[1]);
      current = null;
    }
    (current === null ? primary : /** @type {string[]} */ (sections.get(current))).push(line);
  }
  return {
    primary: primary.join("\n"),
    sections: new Map([...sections].map(([tag, lines]) => [tag, lines.join("\n")])),
    order,
    after,
  };
}

// What a formatting pass changes and a translation does not need to follow: a table re-padded,
// or a paragraph re-wrapped at a different word. A table row is normalized cell by cell first —
// trimming each cell's own padding — since collapsing whitespace alone cannot close a gap where
// there was none, as `|b|` written tight beside `| b |` written wide; every run of whitespace
// left, including a soft line break inside a paragraph, then collapses to one space. `undefined`
// (no earlier translation to compare) passes through unchanged, so it never equals a string.
/** @param {string} line */
const normalizeRow = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|")
    ? `| ${trimmed.slice(1, -1).split("|").map((cell) => cell.trim()).join(" | ")} |`
    : line;
};
// A grouped section's `###` heading names another entity (an achievement's kind, e.g.), not
// anything the page itself says, so renaming that entity is not a change staleness should see:
// R19 (lib/checks.mjs) already holds a translated grouped heading to be that language's name of
// what the primary's heading names, so this comparison leaves the heading line out on both sides
// — the translation's own heading, read through `asPage` as `###` too, is meant to differ.
/** @type {(text: string | undefined) => string | undefined} */
const withoutGroupedHeadings = (text) => {
  if (typeof text !== "string") return text;
  let fenced = false;
  return text
    .split("\n")
    .filter((line) => {
      const isFence = FENCE.test(line);
      if (isFence) fenced = !fenced;
      return fenced || isFence || !/^###\s/.test(line);
    })
    .join("\n");
};
/** @type {(text: string | undefined) => string | undefined} */
const normalized = (text) =>
  (typeof text === "string" ? /** @type {string} */ (withoutGroupedHeadings(text)).split("\n").map(normalizeRow).join("\n").replace(/\s+/g, " ").trim() : text);

// R19's other half, which a tree cannot see: a pull request that changes an element of the
// primary changes its translation in every declared language. Handed the pages a range modified
// or renamed, it names every element whose primary text changed while a language's stayed as it
// was, unless `released` holds `<file>#<path>`, the value of a `Translation-unchanged` trailer.
// A language section missing at the head is the tree check's to report, and frontmatter is never
// translated, so neither is read here.
/**
 * @param {PageChange[]} changes
 * @param {string[]} translated
 * @param {Set<string>} released
 * @returns {string[]}
 */
export function staleTranslationsOf(changes, translated, released) {
  /** @type {string[]} */
  const out = [];
  for (const { after, beforeText, afterText } of changes) {
    const was = languageSectionsOf(withoutFrontmatter(beforeText));
    const is = languageSectionsOf(withoutFrontmatter(afterText));
    const then = primaryElementsOf(was.primary), now = primaryElementsOf(is.primary);
    for (const [path, text] of now) {
      if (normalized(then.get(path)) === normalized(text)) continue;
      for (const tag of translated) {
        if (!is.sections.has(tag)) continue;
        const before = was.sections.has(tag) ? translationElementsOf(/** @type {string} */ (was.sections.get(tag))).get(path) : undefined;
        const current = translationElementsOf(/** @type {string} */ (is.sections.get(tag))).get(path);
        if (current === undefined || normalized(before) !== normalized(current) || released.has(`${after}#${path}`)) continue;
        out.push(`${after}#${path} changed, and its ${tag} translation did not; change it in the same pull request, or add the trailer \`Translation-unchanged: ${after}#${path}\` where the change does not touch what the translation says (R19)`);
      }
    }
  }
  return out;
}

// A language section read as a page is: its `###` headings become a page's `##`, and a grouped
// section's `####` items its `###`, so every reader of a page reads a translation too.
/**
 * @param {string} section
 * @returns {string}
 */
export function asPage(section) {
  let fenced = false;
  return section
    .split("\n")
    .map((line) => {
      if (FENCE.test(line)) fenced = !fenced;
      if (fenced || FENCE.test(line)) return line;
      return /^#{3,}\s/.test(line) ? line.slice(1) : line;
    })
    .join("\n");
}

// The `##` sections of a text, by heading, with "" for what stands before the first; fenced
// headings are text.
/**
 * @param {string} text
 * @returns {Map<string, string>}
 */
function splitSections(text) {
  const out = /** @type {Map<string, string[]>} */ (new Map([["", []]]));
  let key = "", fenced = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      key = heading[1];
      out.set(key, []);
    } else /** @type {string[]} */ (out.get(key)).push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join("\n").trim()]));
}

// The primary's elements by the path a translation is keyed with: the H1 as `name`, the `>`
// lines as `statement` where there are any, and every `##` section as `section/<heading>`.
/**
 * @param {string} primary
 * @returns {Map<string, string>}
 */
export function primaryElementsOf(primary) {
  const parts = splitSections(primary);
  const preamble = /** @type {string} */ (parts.get("")).split("\n");
  const out = new Map();
  const name = preamble.find((l) => /^#\s/.test(l));
  if (name) out.set("name", name.replace(/^#\s+/, "").trim());
  const statement = preamble.filter((l) => l.startsWith(">")).join("\n").trim();
  if (statement) out.set("statement", statement);
  for (const [heading, text] of parts) if (heading) out.set(`section/${heading}`, text);
  return out;
}

// A language section's elements by the same paths: `### Name` is `name`, `### Statement` is
// `statement`, and every other `###` is the section it translates.
/**
 * @param {string} section
 * @returns {Map<string, string>}
 */
export function translationElementsOf(section) {
  /** @type {Map<string, string>} */
  const out = new Map();
  for (const [heading, text] of splitSections(asPage(section))) {
    if (!heading) continue;
    out.set(heading === "Name" ? "name" : heading === "Statement" ? "statement" : `section/${heading}`, text);
  }
  return out;
}
