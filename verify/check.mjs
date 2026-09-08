// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance, and it checks far less than CONVENTIONS.md states. It asserts
// that this repository's own schema files match the fixed shape, that example/ has the
// folder and filename shape the types imply, and that the references under example/profiles/
// resolve — every frontmatter field a schema types `ref → <type>` or `array of ref → <type>`,
// that a list-valued field is written as a block sequence, and that every filename derives
// from the entity in it, or has the form its schema states. It also holds example/ to what
// core/ declares, field by field and column by column (R16): a declared reference resolves,
// a field declared anything else does not, and a `number` is written as digits. A body table
// is reached by the caption naming its section, so no table is named in this file — the
// hardcoded "## Skills" that used to be the one body table it knew to look for is gone. What
// is still not validated is a document's shape: no file is checked for the sections its
// schema requires. A
// date field's form is checked (R9), and an unknown frontmatter field is an error (R15) —
// which is also the first check to read example/values/, for its field names and nothing
// else. A file under example/profiles/ whose folder matches no type's File Location has its
// frontmatter left alone, because nothing declares what it may reference — and nothing
// prevents such a file: "example structure" rejects an unknown folder at the top of example/
// and states what a profile's folder must contain, not what else may sit inside it, so
// example/profiles/<profile>/notes/x.md is reachable today and its frontmatter goes unread.
// Failing on it would invent a rule CONVENTIONS.md does not state. Every check names the
// CONVENTIONS.md rule it enforces, and a meta-check fails if that rule is missing — so the
// script and the prose cannot drift apart silently.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The slice this release ships. Mirrors spec §4; the folder is stated, never derived.
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
  { type: "proficiency-level", folder: "proficiency-levels" },
  { type: "experience-kind", folder: "experience-kinds" },
  { type: "source", folder: "sources" },
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
  {
    type: "experience",
    folder: "profiles/<profile>/experiences",
    owner: "profile",
    // R12's default is the slug of the H1; a type named some other way says so in its own
    // schema, and this one does — the start year, then a slug the author chooses. Chosen, not
    // derived, so what is checkable is the form: the year prefix must be the year in `start`
    // and the rest must be a slug. Stated here for the same reason `folder` is.
    filename: { year: "start", rest: "chosen" },
  },
  // R6, R13: one entity, so a file in the container rather than a folder. `file` instead of
  // `folder` is what tells every check below which shape to expect.
  { type: "identity", file: "identity.md" },
  { type: "vision", file: "vision.md" },
];

export const SINGULAR = TYPES.filter((t) => t.file);
export const PLURAL = TYPES.filter((t) => t.folder);

// R13: every entity lives under the container and nothing else does. Stated once, so that
// every path this script builds goes through it.
export const MODEL = "model";
const EX = `example/${MODEL}`;

// R12's slug. One definition, used for a file, a folder and the collision test alike.
export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Spec §5: closed for the first release. `ref → <type>` and `array of ref → <type>` are
// checked separately because their target varies.
export const TYPE_VOCABULARY = new Set(["string", "number", "date", "array", "enum"]);

const failures = [];
export const fail = (msg) => failures.push(msg);

export const read = (rel) =>
  existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : null;

// Split a Markdown document into its "## Heading" sections, keyed by heading text.
// Everything before the first H2 is keyed "".
export function sectionsOf(text) {
  const out = new Map();
  let key = "";
  let buf = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      out.set(key, buf.join("\n"));
      key = m[1];
      buf = [];
    } else {
      buf.push(line);
    }
  }
  out.set(key, buf.join("\n"));
  return out;
}

// Parse the FIRST contiguous Markdown pipe table in a chunk of text, and stop at the blank
// line after it. A section may hold more than one table — `## Sections` holds a column table
// for every section whose content is itself a table — and swallowing the next one's header
// as a data row is exactly the kind of silent nonsense this script exists to catch. Rejects
// tables missing a valid GFM separator row (the second line must contain only dashes and
// pipes).
export function tableOf(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start === -1) return null;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  return parseTable(lines.slice(start, end));
}

// The one sanctioned way to introduce a column table: a line naming its section in
// backticks. R9 fixes this wording, and "schema fixed shape" enforces it both ways.
export const COLUMN_CAPTION = /^`##\s+(.+?)`\s+is a table with these columns:$/;

// Parse EVERY contiguous pipe block in a chunk of text, in document order, each tagged with
// the section named by the caption line directly above it (`null` when there is none).
// `## Sections` holds more than one block whenever a section's content is itself a table:
// the sections table comes first, uncaptioned, then one column table per such section, and
// those carry the only `ref →` fields this release ships.
//
// The caption is how a column table is ADDRESSED. Position is not, and cannot be: the
// sections table lists `## Skills` alongside rows for the H1 and the tagline, in whatever
// order the document reads best, so "the nth table" and "the nth section" line up only by
// accident. Reordering two rows used to hand back another section's columns, or none.
//
// A block that is not a valid table comes back as `table: null` rather than being dropped,
// so "malformed" and "absent" stay distinguishable at the call site.
export function blocksOf(body) {
  const lines = body.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].trim().startsWith("|")) {
      i++;
      continue;
    }
    let end = i;
    while (end < lines.length && lines[end].trim().startsWith("|")) end++;
    let above = i - 1;
    while (above >= 0 && lines[above].trim() === "") above--;
    const caption = above >= 0 ? lines[above].trim().match(COLUMN_CAPTION) : null;
    out.push({
      section: caption ? caption[1].trim() : null,
      table: parseTable(lines.slice(i, end)),
    });
    i = end;
  }
  return out;
}

// Every block's table, caption discarded — for callers that want coverage of all of them
// rather than one addressed by name.
export const tablesOf = (body) => blocksOf(body).map((b) => b.table);

// Turn one contiguous pipe block into columns and rows. Rejects a block missing a valid GFM
// separator row (the second line must contain only dashes and pipes).
function parseTable(block) {
  if (block.length < 2) return null;
  const cells = (l) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  if (!cells(block[1]).every((cell) => /^-+$/.test(cell))) return null;
  return { columns: cells(block[0]), rows: block.slice(2).map(cells) };
}

// Which type a file under example/ is, by matching its folder against the File Location each
// type declares; `<placeholder>` matches one segment. A file that matches nothing has no
// schema, so nothing declares what it may reference or how its fields are shaped.
function typeOfFile(rel) {
  // Paths arrive as example/model/<...>: the two leading segments are the example and the
  // container, and every File Location is written from the container down.
  const parts = rel.split("/");
  const dir = parts.slice(2, -1);
  const base = parts[parts.length - 1];
  if (dir.length === 0) {
    const singular = SINGULAR.find((s) => s.file === base);
    return singular ? singular.type : null;
  }
  for (const { type, folder } of PLURAL) {
    const want = folder.split("/");
    if (want.length !== dir.length) continue;
    if (want.every((seg, n) => (/^<.+>$/.test(seg) ? true : seg === dir[n]))) return type;
  }
  return null;
}

// The frontmatter block alone. Scoped so a line in the body that happens to read like a field
// is not mistaken for one.
const frontmatterOf = (text) => text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? "";

// One frontmatter scalar, by field name, anchored at column 0 so a nested key of the same name
// is not read as a field. A list-valued field is not this function's business.
const fmScalar = (fmText, field) =>
  fmText.match(new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:[ \\t]*(\\S.*?)[ \\t]*$`, "m"))?.[1] ?? null;

// Every Markdown file under a folder, depth first, with its text.
function walkMd(rel, visit) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return;
  for (const entry of readdirSync(p)) {
    const child = `${rel}/${entry}`;
    if (statSync(join(ROOT, child)).isDirectory()) walkMd(child, visit);
    else if (entry.endsWith(".md")) visit(child, read(child) ?? "");
  }
}

// The values a frontmatter field carries, in three YAML shapes: a scalar on the key's own
// line, a flow sequence `[A, B]` written on one line, and a block list of `- ` lines directly
// under the key. Read from the file rather than predicted from the declared type on purpose —
// a field written in a shape its type did not predict would otherwise go unread, which is the
// same silence the checks that call this exist to remove.
//
// Three shapes, not every shape. A blank line or a comment between the key and its items, a
// flow sequence wrapped across lines, and a trailing `# comment` are all legal YAML this drops
// silently. That is a real limit and it is stated here rather than implied away: nothing in
// `example/` uses those forms, and a full YAML parser is a dependency this script does not
// take. Whatever does come back is held to what the field's schema declares, singular and
// listed alike.
//
// `frontmatterOf` scopes the read to the frontmatter block; every pattern below is anchored at
// column 0, so a nested key of the same name is not read as a field either.
function fieldValues(fmText, field) {
  const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const out = [];
  for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*\\[(.*)\\][ \\t]*$`, "gm")))
    out.push(...m[1].split(","));
  for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*$\\n((?:[ \\t]*-[ \\t]*\\S.*(?:\\n|$))+)`, "gm")))
    out.push(...m[1].split("\n").map((l) => l.replace(/^[ \t]*-[ \t]*/, "")));
  for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*(?!\\[)(\\S.*?)[ \\t]*$`, "gm")))
    out.push(m[1]);
  return out.map((v) => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
}

// The frontmatter fields a schema declares, as name and declared type, in table order.
function fieldsOf(type) {
  const fm = tableOf((sectionsOf(read(`core/${type}-schema.md`) ?? "").get("Frontmatter") ?? "").trim());
  return (fm?.rows ?? []).map((r) => ({
    field: r[0].replace(/`/g, "").trim(),
    // The Required column was parsed nowhere and read nowhere, so a check written against it
    // filtered on `undefined` and asserted nothing while reporting green.
    required: r[1].replace(/`/g, "").trim() === "Yes",
    declared: r[2].replace(/`/g, "").trim(),
  }));
}

const CHECKS = [
  {
    name: "schemas exist",
    rule: "R9",
    run() {
      for (const { type } of TYPES)
        if (read(`core/${type}-schema.md`) === null)
          fail(`core/${type}-schema.md is missing`);
    },
  },
  {
    name: "schema fixed shape",
    rule: "R9",
    run() {
      for (const { type, owner, folder, file } of TYPES) {
        const path = `core/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;

        const title = type.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
        const s = sectionsOf(text);

        // The header region — everything before the first "## " heading — must contain,
        // in order: the H1, the "> " tagline (one or more lines), and, for an owned type
        // only, the "**Owner:**" line. Nothing else belongs there but blank lines. This is
        // the one check that validates POSITION; "ownership declared" validates the Owner
        // line's VALUE.
        const header = (s.get("") ?? "").split("\n");
        let i = 0;
        const skipBlank = () => {
          while (i < header.length && header[i].trim() === "") i++;
        };

        skipBlank();
        if (header[i] === `# ${title} Schema`) i++;
        else fail(`${path}: first line must be "# ${title} Schema"`);

        skipBlank();
        let sawTagline = false;
        while (i < header.length && /^>\s+\S/.test(header[i])) {
          sawTagline = true;
          i++;
        }
        if (!sawTagline)
          fail(`${path}: missing the "> " tagline between the title and what follows`);

        skipBlank();
        if (owner) {
          if (i < header.length && /^\*\*Owner:\*\*/.test(header[i])) i++;
          else fail(`${path}: missing "**Owner:**" line after the tagline`);
          skipBlank();
        }

        const stray = header.slice(i).find((l) => l.trim() !== "");
        if (stray) fail(`${path}: unexpected "${stray.trim()}" before the first "## " heading`);

        for (const heading of ["File Location", "Frontmatter", "Sections"])
          if (!s.has(heading)) fail(`${path}: missing "## ${heading}"`);

        // Three sections carry the shape, and two more carry the prose the shape cannot: they
        // come last, after every table, so a reader that stops at the tables is unaffected —
        // which is the whole reason they are allowed to exist in a fixed shape.
        //
        // R9 makes the pair optional in the shape and not optional in core, and this script
        // only ever reads core, so here it is required. Until every schema had them a missing
        // pair was work not yet done; all six carry them as of 0.3.0, and from here a schema
        // that loses one has lost it rather than not written it yet.
        const order = [...s.keys()].filter((k) => k);
        const want = ["File Location", "Frontmatter", "Sections", "Purpose", "Writing rules"];
        if (order.join(">") !== want.join(">"))
          fail(`${path}: sections are ${order.join(", ")}; must be exactly ${want.join(", ")}`);

        // What the rules say is an agent's business. That there are rules to read, and that
        // they are separable one from another, is this one's: a rule nothing can cite
        // separately is a paragraph wearing a heading.
        const rules = (s.get("Writing rules") ?? "").trim();
        if (rules && !rules.split("\n").some((l) => /^[-*]\s+\S/.test(l)))
          fail(`${path}: "## Writing rules" is not a list`);

        // The schema's own "## File Location" and the manifest's folder are two statements
        // of the same fact, and nothing else compares them. Without this, a schema could
        // name `skill/*.md` while TYPES says `skills` and every message quoting "the File
        // Location" would still be quoting TYPES.
        const stated = (s.get("File Location") ?? "").match(/`([^`]+)`/)?.[1];
        const wantPath = file ? `${MODEL}/${file}` : `${MODEL}/${folder}/`;
        if (!stated) fail(`${path}: "## File Location" states no path in backticks`);
        else if (file ? stated !== wantPath : !stated.startsWith(wantPath))
          fail(
            `${path}: "## File Location" says \`${stated}\`, which does not ${file ? "equal" : "start with"} "${wantPath}" — declared for ${type}`,
          );

        const fmBody = (s.get("Frontmatter") ?? "").trim();
        if (fmBody === "No YAML frontmatter.") {
          // A type with no fields says so in one sanctioned sentence, so that "no table"
          // and "forgot the table" stay distinguishable.
        } else {
          // Every table here, not just the first: R9 permits exactly one, so a second is
          // rejected for existing rather than validated. Reading only the first left one
          // with any columns it liked, and any word in its Required cells, unread.
          const fmTables = tablesOf(fmBody);
          const fm = fmTables[0];
          if (fmTables.length > 1)
            fail(
              `${path}: "## Frontmatter" holds ${fmTables.length} tables; R9 permits one — a field is a row in it`,
            );
          if (!fm)
            fail(`${path}: "## Frontmatter" has no table and does not say "No YAML frontmatter."`);
          else if (fm.columns.join("|") !== "Field|Required|Type|Description")
            fail(`${path}: frontmatter columns are ${fm.columns.join("|")}`);
          else
            for (const row of fm.rows)
              if (!["Yes", "No"].includes(row[1]))
                fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
        }

        // "## Sections" holds the sections table, and then one column table for every
        // section the sections table marks table-valued. That is where a qualified reference
        // now lives — a body table's columns need declaring exactly as a frontmatter field
        // does — so the two halves are checked against each other in both directions: a
        // marked section with no column table fails, and a column table for a section that
        // is not marked fails. Neither degrades to silence, because "the example is held to
        // what the schemas declare" reads a column table as the only statement of what the
        // body table under that heading must hold.
        const requiredYesNo = (tbl, where) => {
          for (const row of tbl.rows)
            if (!["Yes", "No"].includes(row[1]))
              fail(`${path}: Required is "${row[1]}" in ${where}; must be Yes or No`);
        };

        const blocks = blocksOf(s.get("Sections") ?? "");
        const [sections, ...columnTables] = blocks;
        if (!blocks.length) fail(`${path}: "## Sections" has no table`);
        else if (!sections.table) fail(`${path}: the first block under "## Sections" is not a table`);
        else if (sections.section)
          fail(
            `${path}: the sections table is captioned "\`## ${sections.section}\` is a table with these columns:"; that caption introduces a column table, and the sections table comes first`,
          );
        else if (sections.table.columns.join("|") !== "Section|Required|Description")
          fail(
            `${path}: sections table columns are ${sections.table.columns.join("|")}; must be Section|Required|Description`,
          );
        else requiredYesNo(sections.table, "the sections table");

        // A row declares itself table-valued by starting its Description with "Table." —
        // one fixed token, not prose about what the section contains. R9 states it, so a
        // schema cannot leave the column table implicit and nothing notice.
        const tableValued = new Set();
        for (const row of sections?.table?.rows ?? []) {
          if (!/^Table\./.test((row[2] ?? "").trim())) continue;
          const named = (row[0] ?? "").replace(/`/g, "").trim().match(/^##\s+(.+)$/)?.[1];
          if (!named)
            fail(`${path}: "${row[0]}" says "Table." but is not a "## " section, so it holds no table`);
          else tableValued.add(named);
        }

        const declared = new Set();
        for (const block of columnTables) {
          if (!block.section) {
            fail(
              `${path}: a table under "## Sections" has no caption; a column table is introduced by "\`## <Section>\` is a table with these columns:"`,
            );
            continue;
          }
          const where = `the column table for "## ${block.section}"`;
          if (!tableValued.has(block.section))
            fail(
              `${path}: ${where} declares columns, but the sections table does not mark "## ${block.section}" table-valued — its Description must begin "Table."`,
            );
          if (declared.has(block.section)) fail(`${path}: "## ${block.section}" has two column tables`);
          declared.add(block.section);
          if (!block.table) fail(`${path}: ${where} is not a table`);
          else if (block.table.columns.join("|") !== "Column|Required|Type|Description")
            fail(
              `${path}: ${where} has columns ${block.table.columns.join("|")}; must be Column|Required|Type|Description`,
            );
          else if (!block.table.rows.length) fail(`${path}: ${where} declares no columns`);
          else {
            requiredYesNo(block.table, where);
            // A cell holds one value, so a list type in a column table means nothing, and R9
            // leaves `array` and `array of ref → <type>` to the frontmatter table. Rejecting
            // it here is what makes the singular `ref → <type>` that "the example is held to
            // what the schemas declare" reads off a column complete rather than partial:
            // retyping a column
            // `array of ref → proficiency-level` was accepted, and then matched by nothing,
            // so the level column stopped being resolved and the run still said it passed.
            for (const row of block.table.rows) {
              const declared = (row[2] ?? "").replace(/`/g, "").trim();
              if (/^array\b/.test(declared))
                fail(
                  `${path}: ${row[0]} in ${where} is typed "${declared}"; a column holds one value, so a column's type is never a list — a list belongs in "## Frontmatter"`,
                );
            }
          }
        }
        for (const named of tableValued)
          if (!declared.has(named))
            fail(
              `${path}: "## ${named}" is marked table-valued, but no table under "## Sections" is captioned "\`## ${named}\` is a table with these columns:"`,
            );
      }
    },
  },
  {
    name: "type vocabulary",
    rule: "R9",
    run() {
      const known = new Set(TYPES.map((t) => t.type));
      for (const { type } of TYPES) {
        const path = `core/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        // Every typed table: the frontmatter fields, plus the column table of any section
        // whose content is a table. A qualified reference lives in the latter, so checking
        // only the former would leave the model's only `ref →` fields undeclared.
        //
        // A column table is the captioned block, and the sections table — which has no Type
        // column — is the uncaptioned one. Selecting by caption says that; dropping the first
        // block instead only worked because another check happens to enforce that the
        // sections table comes first, which is the coupling the caption exists to remove.
        const s = sectionsOf(text);
        const typed = [
          tableOf((s.get("Frontmatter") ?? "").trim()),
          ...blocksOf(s.get("Sections") ?? "").filter((b) => b.section).map((b) => b.table),
        ];
        for (const fm of typed)
          for (const row of fm?.rows ?? []) {
            const declared = row[2].replace(/`/g, "").trim();
            // `array of ref?` is rejected by its own message rather than left to fall through:
            // the `?` asks whether one value resolves, and a list has no single value to ask
            // it of, so the combination is never a form the regex below should accept.
            if (/^array of ref\? → /.test(declared)) {
              fail(`${path}: ${row[0]} is "${declared}"; \`array of ref?\` is not a form — the \`?\` is about one value`);
              continue;
            }
            // `array of qualifier` is refused for the same reason and separately, because a
            // qualifier is about the one cell it sits in: a column holds one value (R8), so a
            // list of qualifiers has nothing to qualify.
            if (/^array of qualifier → /.test(declared)) {
              fail(`${path}: ${row[0]} is "${declared}"; \`array of qualifier\` is not a form — a column holds one value`);
              continue;
            }
            const ref = declared.match(/^(array of )?(ref\??|qualifier) → (.+)$/);
            if (ref) {
              const [, many, form, target] = ref;
              if (many && form === "qualifier") continue;
              if (!known.has(target))
                fail(`${path}: ${row[0]} points at unknown type "${target}"`);
              if (target.endsWith("s"))
                fail(`${path}: ${row[0]} is "${many ?? ""}${form} → ${target}"; a reference names one entity`);
            } else if (!TYPE_VOCABULARY.has(declared)) {
              fail(`${path}: ${row[0]} has type "${declared}", which is outside the vocabulary`);
            }
          }
      }
    },
  },
  {
    name: "ownership declared",
    rule: "R10",
    run() {
      const known = new Set(TYPES.map((t) => t.type));
      for (const { type, owner, folder, file } of TYPES) {
        const path = `core/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        const stated = text.match(/^\*\*Owner:\*\*\s+(\S+)\s*$/m)?.[1];

        if (owner && stated !== owner)
          fail(`${path}: must declare "**Owner:** ${owner}"; found ${stated ?? "no Owner line"}`);
        if (!owner && stated)
          fail(`${path}: declares "**Owner:** ${stated}" but nothing owns a ${type}`);
        if (stated && !known.has(stated))
          fail(`${path}: Owner is "${stated}", which is not a type`);

        // The Owner line and the declared folder must agree: an owned type nests inside its
        // owner's folder. The owner's folder is looked up, never derived by appending an
        // "s" — that derivation is the one CONVENTIONS.md R7 exists to forbid. `folder`
        // comes from TYPES, not from the file, so the messages below blame TYPES; that the
        // file's own "## File Location" agrees with it is checked in "schema fixed shape".
        // A singular type is a file in the container (R6, R13): no folder to nest, and
        // nothing can own it, so the two folder-shaped checks below have nothing to read.
        if (file) continue;
        const ownerFolder = owner && TYPES.find((t) => t.type === owner)?.folder;
        if (ownerFolder && !folder.startsWith(`${ownerFolder}/`))
          fail(
            `TYPES: the folder declared for ${type}, "${folder}", does not nest inside ${ownerFolder}/, which ${path} names as its owner`,
          );
        // A placeholder naming the type itself is a folder entity — `profiles/<profile>/`
        // has one because a profile owns something, not because something owns it. Only a
        // placeholder naming a *different* type means this entity nests inside that one.
        const foreign = [...folder.matchAll(/<([\w-]+)>/g)]
          .map((m) => m[1])
          .filter((n) => n !== type);
        if (!owner && foreign.length)
          fail(
            `TYPES: the folder declared for ${type}, "${folder}", nests inside <${foreign[0]}>, but ${path} declares no "**Owner:**" — one of the two is wrong`,
          );
      }
    },
  },
  {
    name: "example structure",
    rule: "R6",
    run() {
      const ls = (rel) => {
        const p = join(ROOT, rel);
        return existsSync(p) ? readdirSync(p) : null;
      };
      const top = ls(EX);
      if (top === null) return fail(`${EX}/ is missing`);

      // R13: what may sit directly in the container is a type's folder, a singular type's
      // file, or the README that is never an entity (R6). Nothing else — which is the whole
      // point of the container: the list is derived from the types, never enumerated.
      const rootFolders = PLURAL.filter((t) => !t.folder.includes("/")).map((t) => t.folder);
      const ownerFolders = PLURAL.filter((t) => t.owns).map((t) => t.folder.split("/")[0]);
      const singularFiles = SINGULAR.map((t) => t.file);
      const allowed = new Set([...rootFolders, ...ownerFolders, ...singularFiles, "README.md"]);
      for (const entry of top)
        if (!allowed.has(entry))
          fail(`${EX}/${entry} is not a folder of any type (expected one of ${[...allowed].join(", ")})`);

      for (const { file } of SINGULAR)
        if (!top.includes(file)) fail(`${EX}/${file} is missing — a singular type's entity`);

      for (const { type, folder, owns } of PLURAL) {
        if (folder.includes("/") && !owns) continue; // owned types are reached via their owner
        const base = folder.split("/")[0];
        for (const name of ls(`${EX}/${base}`) ?? []) {
          if (!owns) {
            if (!name.endsWith(".md")) fail(`${EX}/${base}/${name} should be a .md file`);
            continue;
          }
          // A folder entity: its own file is named for it, and it owns folders beside it.
          const inside = ls(`${EX}/${base}/${name}`) ?? [];
          if (!inside.includes(`${name}.md`))
            fail(`${EX}/${base}/${name}/ must contain ${name}.md, not ${inside.join(", ")}`);
          for (const owned of owns) {
            const ownedFolder = TYPES.find((t) => t.type === owned).folder.split("/").pop();
            if (!inside.includes(ownedFolder))
              fail(`${EX}/${base}/${name}/ is missing ${ownedFolder}/`);
          }
          if (inside.includes("README.md"))
            fail(`${EX}/${base}/${name}/README.md — an entity's file is named for the entity`);
        }
      }
    },
  },
  {
    name: "example references",
    rule: "R4",
    run() {
      const h1 = (rel) => read(rel)?.match(/^#\s+(.+?)\s*$/m)?.[1] ?? null;

      // Canonical names per referenced type, read from the example instance. Every list this
      // check works from is derived: the legal names of a type are whatever its folder
      // contains, the columns of a body table come from the schema's column table, and the
      // frontmatter fields that hold references are the rows a schema types `ref → <type>` or
      // `array of ref → <type>`. What is written down below is which schema and which section
      // to read — never a level, a column or a field name, all of which live in the schema.
      const folderOf = (type) => TYPES.find((t) => t.type === type)?.folder ?? null;
      const namesOf = (type) => {
        const folder = folderOf(type);
        const names = new Set();
        const dir = join(ROOT, `${EX}/${folder}`);
        if (!existsSync(dir)) return names;
        for (const f of readdirSync(dir)) {
          if (!f.endsWith(".md")) continue;
          const name = h1(`${EX}/${folder}/${f}`);
          if (!name) fail(`example/${folder}/${f} has no H1`);
          else if (names.has(name)) fail(`two ${type} files share the canonical name "${name}"`);
          else names.add(name);
        }
        return names;
      };

      const cache = new Map();
      const namesFor = (type) => {
        if (!cache.has(type)) cache.set(type, namesOf(type));
        return cache.get(type);
      };
      // The target type comes out of schema text, so it can name something that is not a
      // type at all. That is a failure like any other: throwing would abandon every finding
      // already recorded and print a stack trace in their place.
      const resolve = (child, type, value) => {
        if (!folderOf(type))
          return fail(`${child}: reference to "${value}" targets "${type}", which is not a type`);
        if (!namesFor(type).has(value))
          fail(`${child}: ${type} "${value}" resolves to nothing in example/${folderOf(type)}/`);
      };

      // Frontmatter fields a schema types as a reference: the field name and what it points
      // at, both read from the schema. Both forms count — a frontmatter field may hold one
      // value (`ref → <type>`) or a list of them (`array of ref → <type>`, the one list
      // shape R8 leaves in frontmatter) — and this is what makes either machine-visible.
      // Matching only the list form left the commoner singular one inert.
      //
      // This selects the fields required to resolve, and `ref?` is deliberately not among
      // them: R16 draws an edge from a `ref?` field only when its value resolves, so a value
      // that does not is not an error. The regex below excludes `ref?` by not matching its
      // `?` — that is the correct behavior here, not an inconsistency to fix by widening it.
      const refFieldsOf = (type) =>
        fieldsOf(type).flatMap(({ field, declared }) => {
          const target = declared.match(/^(?:array of )?ref → (.+)$/)?.[1];
          return target ? [{ field, ref: target }] : [];
        });
      const refFields = new Map(TYPES.map((t) => [t.type, refFieldsOf(t.type)]));

      // A body table's columns are not read here. "the example is held to what the schemas
      // declare" reads every table-valued section of every type, addressed by the caption
      // naming it, which is what retired the `columnsOf("profile", "Skills")` this check used
      // to carry — one table, named in this file, out of the several the schemas declare.
      walkMd(`${EX}/profiles`, (child, text) => {
        const fmText = frontmatterOf(text);
        for (const { field, ref } of refFields.get(typeOfFile(child)) ?? [])
          for (const value of fieldValues(fmText, field)) resolve(child, ref, value);
      });
    },
  },
  {
    // R16. `core/` declares a type system and, until this check, nothing held an instance to
    // it. The parser says so in its own first lines — no schema is consulted — and this file
    // said it from the other side, so the declarations and the graph agreed only where the
    // parser's resolution rules happened to coincide with them. Three assertions close that:
    // a declared reference is drawn, nothing else is, and a `number` is written as digits.
    //
    // This script imports no parser, so it cannot observe an edge. It does not have to. A
    // scalar draws an edge exactly when it is the canonical name of some entity, and a table
    // cell draws one exactly when it resolves — every resolving cell of a row, not the first
    // alone, as of core 0.15.0. Both are facts about files this script already reads, so
    // "draws an edge" and "matches an H1" are one question asked in two vocabularies. That
    // equivalence is what these assertions rest on, and it holds only in that order: the
    // parser's rule had to change before a file-level check could stand in for it.
    //
    // Every table is addressed by the caption naming its section, never by counting, and no
    // section is named in this file: R9 makes the caption what says which section a column
    // table belongs to, so the schemas say which body tables exist and this check reads them
    // all. That is what retired the `columnsOf("profile", "Skills")` the R4 check carried —
    // the one body table this script knew how to look for, out of the four now read.
    name: "the example is held to what the schemas declare",
    rule: "R16",
    run() {
      // Every canonical name in the example, and the types carrying it — the same index the
      // parser builds, which refuses to resolve a name carried by more than one type rather
      // than guessing between them. A file matching no File Location has no schema and so
      // declares nothing to be held to, the silence "example references" keeps and for the
      // same reason; a file with no H1 is "filenames derive"'s finding, not this one's.
      const typesByName = new Map();
      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const name = text.match(/^#\s+(.+?)\s*$/m)?.[1];
        if (!name) return;
        if (!typesByName.has(name)) typesByName.set(name, new Set());
        typesByName.get(name).add(type);
      });
      const carriers = (value) => [...(typesByName.get(value) ?? [])].sort().join(", ");

      // `ref → <type>` requires the value to name a `<type>`, `array of ref → <type>` requires
      // it of every entry, and `ref? → <type>` requires nothing of a value that names nothing.
      // The `?` is about whether a value resolves, never about what it resolves to: an edge a
      // `ref?` does draw lands on the declared type like any other.
      // A qualifier resolves on the same terms and draws nothing: it qualifies the edge its
      // own row drew. So it is read here as a reference that must land on its declared type,
      // and `draws` is what separates the two everywhere the distinction matters.
      const refOf = (declared) => {
        const m = declared.match(/^(array of )?ref(\?)? → (.+)$/);
        if (m) return { optional: !!m[2], target: m[3], draws: true };
        const q = declared.match(/^qualifier → (.+)$/);
        return q ? { optional: false, target: q[1], draws: false } : null;
      };

      // One written value against one declaration. `where` names the field or the column it
      // was written in, so the three assertions read the same for both.
      const held = (child, where, declared, value) => {
        const found = typesByName.get(value);
        const ref = refOf(declared);
        if (!ref) {
          // 2. Nothing else is drawn. A value that resolves becomes an edge whatever its
          // field is declared, so a non-reference carrying a canonical name is a declaration
          // and a graph that disagree — the finding this check was written for.
          if (found)
            fail(
              `${child}: ${where} is declared \`${declared}\` and says "${value}", which is the canonical name of an entity of type ${carriers(value)}; R16 draws an edge from a value that resolves, so declare it \`ref? → <type>\` or write something that names nothing`,
            );
          return;
        }
        // 1. A declared reference is drawn.
        if (found?.has(ref.target)) return;
        if (!found) {
          if (!ref.optional)
            fail(`${child}: ${where} is declared \`${declared}\` and says "${value}", which names no entity in ${EX}/; R16 makes ${ref.draws ? "a declared reference an edge" : "a qualifier resolve like the reference it qualifies"}, so it must resolve`);
          return;
        }
        fail(
          `${child}: ${where} is declared \`${declared}\` and says "${value}", which names an entity of type ${carriers(value)}, not ${ref.target}; R16 lands a reference on the type it declares`,
        );
      };

      // What every type declares about its body tables: one entry per table-valued section,
      // addressed by the caption that names it. "schema fixed shape" has already failed a
      // marked section with no column table, a column table for an unmarked section and a
      // column table with no rows, so what reaches here is a schema that can say what its own
      // body tables hold.
      const columnTables = new Map(
        TYPES.map((t) => [
          t.type,
          blocksOf(sectionsOf(read(`core/${t.type}-schema.md`) ?? "").get("Sections") ?? "")
            .filter((b) => b.section && b.table)
            .map((b) => ({
              section: b.section,
              columns: b.table.rows.map((r) => ({
                name: r[0].replace(/`/g, "").trim(),
                required: r[1].replace(/`/g, "").trim() === "Yes",
                declared: r[2].replace(/`/g, "").trim(),
              })),
            })),
        ]),
      );

      // 4. A column table declares at most one drawing reference, and it stands first. The
      // parser reads no schema — it takes the first cell of a row that resolves — so the
      // declared reference is the edge only while nothing resolving precedes it. A qualifier
      // listed first would quietly take its place, and the schema would then describe an edge
      // the graph does not have. A table declaring no reference draws nothing and is data,
      // which is a table's other legal shape.
      for (const [type, tables] of columnTables)
        for (const { section, columns } of tables) {
          const draws = columns.filter((c) => refOf(c.declared)?.draws);
          if (!draws.length) continue;
          if (draws.length > 1)
            fail(
              `core/${type}-schema.md: "## ${section}" declares ${draws.length} references (${draws.map((c) => c.name).join(", ")}); a row draws one edge, so one column names what it points at and the rest qualify it`,
            );
          else if (columns[0] !== draws[0])
            fail(
              `core/${type}-schema.md: "## ${section}" declares \`${draws[0].name}\` as its reference but lists \`${columns[0].name}\` first; the parser takes the first cell that resolves, so the reference comes first`,
            );
        }

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const fmText = frontmatterOf(text);

        for (const { field, declared } of fieldsOf(type)) {
          for (const value of fieldValues(fmText, field)) held(child, `\`${field}\``, declared, value);
          // 3. A number is digits. R16 makes `number` a statement about the written form and
          // not a parsed type, because this is a model made of Markdown: every value in every
          // file is text, and what a serializer turns that text into is its own business.
          if (declared === "number") {
            const value = fmScalar(fmText, field);
            if (value !== null && !/^-?\d+$/.test(value))
              fail(`${child}: \`${field}\` is declared \`number\` and says "${value}"; R16 wants it written as digits`);
          }
        }

        const sections = sectionsOf(text);
        for (const { section, columns } of columnTables.get(type) ?? []) {
          // A table that is not there is the sections table's business — Required says whether
          // the section must exist, and nothing reads it yet. What is held here is a table
          // that IS there, against the columns declared for it.
          const table = tableOf(sections.get(section) ?? "");
          if (!table) continue;
          const want = columns.map((c) => c.name).join("|");
          if (table.columns.join("|") !== want) {
            fail(`${child}: "## ${section}" columns are ${table.columns.join("|")}; the schema declares ${want}`);
            continue;
          }
          for (const row of table.rows)
            columns.forEach((col, n) => {
              const cell = (row[n] ?? "").trim();
              if (!cell) {
                if (col.required) fail(`${child}: a "## ${section}" row has no ${col.name.toLowerCase()}`);
                return;
              }
              held(child, `\`${col.name}\` in "## ${section}"`, col.declared, cell);
            });
        }
      });
    },
  },
  {
    // R15. The failure this exists for is not an exotic one: a field left behind by a rename
    // renders on the page under the old name while every other check reports green, because
    // an undeclared field resolves nothing and is therefore asked nothing.
    //
    // It walks all of EX rather than example/profiles alone — every typed page has
    // frontmatter, and example/values/, which no check read until now, is as typed as any
    // other folder.
    name: "frontmatter fields are declared",
    rule: "R15",
    run() {
      const declared = new Map(
        TYPES.map((t) => [t.type, new Set(fieldsOf(t.type).map(({ field }) => field))]),
      );
      walkMd(EX, (child, text) => {
        // A file matching no File Location has no schema, so R15 does not bind it.
        const type = typeOfFile(child);
        if (!type) return;
        const known = declared.get(type);
        for (const line of frontmatterOf(text).split("\n")) {
          // Anchored at column 0, so a nested key and a block sequence's `- entry` are not
          // fields — the same read lib/instance.mjs does.
          const m = line.match(/^([\w-]+):/);
          if (m && !known.has(m[1]))
            fail(`${child}: frontmatter field \`${m[1]}\` is not declared by the ${type} schema`);
        }
      });
    },
  },
  {
    // R11 is mechanical in the one direction that matters: a flow sequence is visible as a
    // `[` where a list field's value begins. What a block sequence holds is not read here —
    // resolving the entries is "example references" above, and this check exists so that
    // check is never handed a line YAML has already split on a comma inside an entry.
    name: "list fields are block sequences",
    rule: "R11",
    run() {
      const listFields = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type)
            .filter(({ declared }) => declared === "array" || declared.startsWith("array of "))
            .map(({ field }) => field),
        ]),
      );
      walkMd(`${EX}/profiles`, (child, text) => {
        const fmText = frontmatterOf(text);
        for (const field of listFields.get(typeOfFile(child)) ?? []) {
          const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`^${name}:[ \\t]*\\[`, "m").test(fmText))
            fail(`${child}: \`${field}\` is a flow sequence; R11 wants one entry per line`);
        }
      });
    },
  },
  {
    // A schema's Required column said `Yes` and nothing read it. Every required field happens
    // to be present today, so this check starts green — but it started green the way a gate
    // does, not the way a passing test does: removing `start` from an experience failed only
    // because R12 derives that filename from it, and on any type whose filename does not, a
    // missing required field passed in silence.
    //
    // Presence is tested, never the value: `source: ` with nothing after it is a different
    // defect and R4 already has it. The match is on the key alone so that a field which later
    // becomes list-valued — none is today — does not quietly leave this check's reach.
    name: "required frontmatter fields are present",
    rule: "R9",
    run() {
      const requiredOf = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type).filter(({ required }) => required).map(({ field }) => field),
        ]),
      );
      walkMd(EX, (child, text) => {
        const fields = requiredOf.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        for (const field of fields) {
          const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (!new RegExp(`^${name}:`, "m").test(fmText))
            fail(`${child}: no \`${field}\`, which ${typeOfFile(child)}-schema.md requires`);
        }
      });
    },
  },
  {
    // R9 states one lexical form for `date`, so a field declared `date` can be checked against
    // it. What no script reaches is the half of the rule that matters — "never more precision
    // than its source states" is a fact about a document nobody here has, so a well-formed
    // invention passes this exactly as `2002-01` passed the `YYYY-MM` form it replaced. That
    // half is the agent pass's, and R0 says so.
    name: "date fields carry a date in one of the three forms",
    rule: "R9",
    run() {
      const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
      const dateFields = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type).filter(({ declared }) => declared === "date").map(({ field }) => field),
        ]),
      );
      walkMd(EX, (child, text) => {
        const fields = dateFields.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        for (const field of fields) {
          const value = fmScalar(fmText, field);
          if (value === null || value === undefined || value === "") continue;
          if (!DATE.test(value))
            fail(`${child}: \`${field}\` is "${value}"; R9 wants YYYY, YYYY-MM or YYYY-MM-DD`);
        }
        // R9 makes a shorter date an interval, so an order check compares intervals and not
        // strings: `end` is wrong only if the whole of it falls before the whole of `start`.
        // Taking `end`'s latest instant against `start`'s earliest is what keeps
        // `2002-03 .. 2002` legal — the year contains the month — while still catching a real
        // inversion. The upper bound uses day 31 rather than the month's true length: it can
        // only make this more lenient, which is the safe direction for a check whose false
        // positives would land on correct data.
        const from = (d) => (d.length === 4 ? `${d}-01-01` : d.length === 7 ? `${d}-01` : d);
        const to = (d) => (d.length === 4 ? `${d}-12-31` : d.length === 7 ? `${d}-31` : d);
        if (fields.includes("start") && fields.includes("end")) {
          const start = fmScalar(fmText, "start");
          const end = fmScalar(fmText, "end");
          if (start && end && DATE.test(start) && DATE.test(end) && to(end) < from(start))
            fail(`${child}: \`end\` is "${end}", which falls entirely before \`start\` "${start}"`);
        }
      });
    },
  },
  {
    // R12 in the one direction a script can take: derive the name and compare it. What it
    // cannot say is whether the H1 is the right name — that is R2's, and an agent's.
    //
    // `README.md` is never an entity (R6), so it is the one file skipped. A file whose folder
    // matches no type has no derivation to check, the same silence "example references" keeps
    // and for the same reason: nothing declares what it is.
    name: "filenames derive, or take the form their schema states",
    rule: "R12",
    run() {
      const seen = new Map();
      walkMd(EX, (child, text) => {
        const base = child.split("/").pop();
        if (base === "README.md") return;
        const type = typeOfFile(child);
        if (!type) return;
        const spec = TYPES.find((t) => t.type === type);
        const h1 = text.match(/^#\s+(.+?)\s*$/m)?.[1];
        if (!h1) return fail(`${child}: no H1, so nothing derives a filename (R2)`);

        // A folder entity's own file is named for its folder, which "example structure"
        // already checks under R6; what this adds is that the folder itself derives.
        const own = child.split("/").slice(0, -1).pop();
        const named = base === `${own}.md` ? own : base.replace(/\.md$/, "");

        let want = null;
        if (spec.file) {
          // R12: a singular type's file is named for the type, which is what leaves its H1
          // free to be a company's name or a sentence. Nothing to derive — the name is the
          // one its schema states, and "example structure" has already found it.
          want = spec.file.replace(/\.md$/, "");
        } else if (!spec.filename) {
          want = slug(h1);
          if (named !== want) fail(`${child}: derives to "${want}.md" from its H1 "${h1}"`);
        } else {
          // Chosen, not derived, so the name is checked against its stated form instead of
          // against a string. A rule that guesses the author's label would fail every file
          // whose label is the period rather than the place — which is most of them.
          const year = fmScalar(frontmatterOf(text), spec.filename.year);
          if (!year) return fail(`${child}: no \`${spec.filename.year}\`, which its filename begins with`);
          const m = named.match(/^(\d{4})-(.+)$/);
          if (!m) fail(`${child}: must be named "<year>-<slug>.md", per ${type}-schema.md`);
          else {
            if (m[1] !== year.slice(0, 4))
              fail(`${child}: begins with ${m[1]} but \`${spec.filename.year}\` says ${year}`);
            if (slug(m[2]) !== m[2]) fail(`${child}: "${m[2]}" is not a slug, per R12`);
          }
          want = named;
        }

        // Scoped to the folder, not the type: two profiles may each have an experience at
        // the same organization in the same year, and they do here. What cannot collide is
        // two files in one directory, which is also the only collision that loses a file.
        const key = `${child.split("/").slice(0, -1).join("/")}/${want}`;
        if (seen.has(key)) fail(`${child} and ${seen.get(key)} both derive to "${want}.md"`);
        else seen.set(key, child);
      });
    },
  },
  {
    // The tooling spec's §2 release contract, not a CONVENTIONS.md rule: the one file another
    // program reads. `version` must be the tag when there is one, so a tag can never point at
    // a commit that claims a different version. No tag is fine — every commit between
    // releases has none.
    name: "release manifest",
    rule: null,
    run() {
      const raw = read("core/manifest.json");
      if (raw === null) return fail("core/manifest.json is missing");
      let m;
      try { m = JSON.parse(raw); } catch (e) { return fail(`core/manifest.json: ${e.message}`); }
      if (typeof m.version !== "string" || !/^\d+\.\d+\.\d+$/.test(m.version))
        fail(`core/manifest.json: version must be MAJOR.MINOR.PATCH, got ${JSON.stringify(m.version)}`);
      if (!Number.isInteger(m.shape) || m.shape < 1)
        fail(`core/manifest.json: shape must be a positive integer, got ${JSON.stringify(m.shape)}`);
      const tags = execFileSync("git", ["tag", "--points-at", "HEAD", "v*"], { cwd: ROOT, encoding: "utf8" })
        .split("\n").filter(Boolean);
      for (const tag of tags)
        if (tag !== `v${m.version}`)
          fail(`tag ${tag} sits on HEAD but core/manifest.json says ${m.version}`);
    },
  },
  {
    name: "rules are written down",
    rule: "R0",
    run() {
      const text = read("core/CONVENTIONS.md");
      if (text === null) return fail("core/CONVENTIONS.md is missing");
      const defined = new Set([...text.matchAll(/^###\s+(R\d+)\s+—/gm)].map((m) => m[1]));
      for (const check of CHECKS)
        if (check.rule !== null && !defined.has(check.rule))
          fail(`check "${check.name}" enforces ${check.rule}, which CONVENTIONS.md does not define`);
    },
  },
];

for (const check of CHECKS) check.run();

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem${failures.length > 1 ? "s" : ""}\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ ${CHECKS.length} checks passed`);
