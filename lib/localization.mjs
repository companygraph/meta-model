// lib/localization.mjs
// How a model is kept in more than one language (R14, R19), read in one place. Pure and with no
// import, so the parser, the checks and the CLI share it, and it bundles for the Obsidian plugin.

// A BCP 47 language tag as a heading or a cell carries one: `de-CH`, `en-US`, `pl-PL`, `fr`. No
// heading a schema declares is written so, since every declared heading opens with a capital.
export const LANGUAGE_TAG = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;

const FRONTMATTER = /^---\n[\s\S]*?\n---(?:\n|$)/;
export const withoutFrontmatter = (text) => text.replace(FRONTMATTER, "");

const FENCE = /^\s*(```|~~~)/;

// What model/localization.md declares: the primary language and the translated ones, in the
// order its `## Locales` table lists them. What cannot be read is an error naming why, and the
// caller reports it once, on the file.
export function localizationOf(text) {
  const lines = withoutFrontmatter(text).split("\n");
  const start = lines.findIndex((l) => /^##\s+Locales\s*$/.test(l));
  if (start === -1) return { error: "no `## Locales` table" };
  const rows = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break;
    if (line.trim().startsWith("|")) rows.push(line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim().replace(/`/g, "")));
  }
  const [head, , ...data] = rows;
  if (!head || head[0] !== "Locale" || head[1] !== "Role") return { error: "`## Locales` is not a table with the columns Locale | Role" };
  const primary = [], translated = [], seen = new Set();
  for (const [tag = "", role = ""] of data) {
    if (!LANGUAGE_TAG.test(tag)) return { error: `"${tag}" is no language tag, as \`de-CH\` or \`en-US\` is` };
    if (seen.has(tag)) return { error: `${tag} is written twice` };
    seen.add(tag);
    if (role === "primary") primary.push(tag);
    else if (role === "translated") translated.push(tag);
    else return { error: `${tag} has the role "${role}"; a role is \`primary\` or \`translated\`` };
  }
  if (primary.length !== 1) return { error: `${primary.length ? "more than one" : "no"} language is \`primary\`; exactly one is` };
  return { primary: primary[0], translated };
}

// A page's body, without its frontmatter, cut where its language sections begin: `primary` is
// everything before the first `## <tag>`, and each language section runs to the next `##`. A
// fenced block is never cut. `order` lists the language headings as written, twice where one is
// written twice, and `after` every other `##` heading that stands below one, which R19 does not
// allow; its lines go back to the primary, so nothing a page says is lost to a misplaced heading.
export function languageSectionsOf(body) {
  const primary = [], sections = new Map(), order = [], after = [];
  let current = null, fenced = false;
  for (const line of body.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading && LANGUAGE_TAG.test(heading[1])) {
      current = heading[1];
      order.push(current);
      if (!sections.has(current)) sections.set(current, []);
      continue;
    }
    if (heading && current !== null) {
      after.push(heading[1]);
      current = null;
    }
    (current === null ? primary : sections.get(current)).push(line);
  }
  return {
    primary: primary.join("\n"),
    sections: new Map([...sections].map(([tag, lines]) => [tag, lines.join("\n")])),
    order,
    after,
  };
}

// A language section read as a page is: its `###` headings become a page's `##`, and a grouped
// section's `####` items its `###`, so every reader of a page reads a translation too.
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
function splitSections(text) {
  const out = new Map([["", []]]);
  let key = "", fenced = false;
  for (const line of text.split("\n")) {
    if (FENCE.test(line)) fenced = !fenced;
    const heading = !fenced && line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      key = heading[1];
      out.set(key, []);
    } else out.get(key).push(line);
  }
  return new Map([...out].map(([k, v]) => [k, v.join("\n").trim()]));
}

// The primary's elements by the path a translation is keyed with: the H1 as `name`, the `>`
// lines as `statement` where there are any, and every `##` section as `section/<heading>`.
export function primaryElementsOf(primary) {
  const parts = splitSections(primary);
  const preamble = parts.get("").split("\n");
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
export function translationElementsOf(section) {
  const out = new Map();
  for (const [heading, text] of splitSections(asPage(section))) {
    if (!heading) continue;
    out.set(heading === "Name" ? "name" : heading === "Statement" ? "statement" : `section/${heading}`, text);
  }
  return out;
}
