// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance, and it checks far less than CONVENTIONS.md states. It asserts
// that this repository's own schema files match the fixed shape, that example/ has the
// folder and filename shape the types imply, and that the references under example/profiles/
// resolve — the `ref →` columns of a "## Skills" table, and every frontmatter field a schema
// types `ref → <type>` or `array of ref → <type>`, that a list-valued field is written as a
// block sequence, and that every filename derives from the entity in it, or has the form its
// schema states. "## Skills" is the one body table it knows to look for; a second
// table-valued section would need naming here. It does not validate
// example/ against the schemas: no date is parsed, no file is checked for the sections its
// schema requires, an unknown frontmatter field passes, and no file under example/values/ is
// ever read. A file under example/profiles/ whose folder matches no type's File Location has
// its frontmatter left alone, because nothing declares what it may reference — and nothing
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

// The frontmatter fields a schema declares, as name and declared type, in table order.
function fieldsOf(type) {
  const fm = tableOf((sectionsOf(read(`core/${type}-schema.md`) ?? "").get("Frontmatter") ?? "").trim());
  return (fm?.rows ?? []).map((r) => ({
    field: r[0].replace(/`/g, "").trim(),
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
        // is not marked fails. Neither degrades to silence, because "example references"
        // reads the column table as its only statement of what a "## Skills" table must hold.
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
            // it here is what makes the singular `ref → <type>` that "example references"
            // reads off a column complete rather than partial: retyping a column
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
            const ref = declared.match(/^(array of )?ref → (.+)$/);
            if (ref) {
              const [, many, target] = ref;
              if (!known.has(target))
                fail(`${path}: ${row[0]} points at unknown type "${target}"`);
              if (target.endsWith("s"))
                fail(`${path}: ${row[0]} is "${many ?? ""}ref → ${target}"; a reference names one entity`);
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

      // The profile schema declares the columns of its "## Skills" table, so read them from
      // there rather than restating them here. The column table is addressed by the caption
      // naming its section — never by counting tables, which lined up with the sections
      // table's rows only by accident and handed back another section's columns, or none,
      // as soon as a row moved.
      const columnsOf = (type, section) => {
        const path = `core/${type}-schema.md`;
        const block = blocksOf(sectionsOf(read(path) ?? "").get("Sections") ?? "").find(
          (b) => b.section === section,
        );
        const rows = block?.table?.rows ?? [];
        // Every route to an empty list — no caption, a malformed table, a table with no
        // rows — is a schema that cannot say what its own body table must contain. Checking
        // nothing would then pass a "## ${section}" table holding anything at all.
        if (!rows.length)
          fail(`${path}: nothing declares the columns of "## ${section}", so no "## ${section}" table can be checked`);
        return rows.map((r) => ({
          name: r[0].replace(/`/g, "").trim(),
          required: r[1] === "Yes",
          ref: r[2].replace(/`/g, "").trim().match(/^ref → (.+)$/)?.[1] ?? null,
        }));
      };
      const SKILL_COLUMNS = columnsOf("profile", "Skills");

      // Frontmatter fields a schema types as a reference: the field name and what it points
      // at, both read from the schema. Both forms count — a frontmatter field may hold one
      // value (`ref → <type>`) or a list of them (`array of ref → <type>`, the one list
      // shape R8 leaves in frontmatter) — and this is what makes either machine-visible.
      // Matching only the list form left the commoner singular one inert.
      const refFieldsOf = (type) =>
        fieldsOf(type).flatMap(({ field, declared }) => {
          const target = declared.match(/^(?:array of )?ref → (.+)$/)?.[1];
          return target ? [{ field, ref: target }] : [];
        });
      const refFields = new Map(TYPES.map((t) => [t.type, refFieldsOf(t.type)]));

      // The values a field carries, in three YAML shapes: a scalar on the key's own line, a
      // flow sequence `[A, B]` written on one line, and a block list of `- ` lines directly
      // under the key. Read from the file rather than predicted from the declared type on
      // purpose — a field written in a shape its type did not predict would otherwise go
      // unread, which is the same silence this check exists to remove.
      //
      // Three shapes, not every shape. A blank line or a comment between the key and its
      // items, a flow sequence wrapped across lines, and a trailing `# comment` are all legal
      // YAML this drops silently. That is a real limit and it is stated here rather than
      // implied away: nothing in `example/` uses those forms, and a full YAML parser is a
      // dependency this script does not take. Whatever does come back must resolve, singular
      // and listed alike.
      // `frontmatterOf` scopes the read to the frontmatter block; every pattern below is
      // anchored at column 0, so a nested key of the same name is not read as a field either.
      const refValues = (fmText, field) => {
        const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const out = [];
        for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*\\[(.*)\\][ \\t]*$`, "gm")))
          out.push(...m[1].split(","));
        for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*$\\n((?:[ \\t]*-[ \\t]*\\S.*(?:\\n|$))+)`, "gm")))
          out.push(...m[1].split("\n").map((l) => l.replace(/^[ \t]*-[ \t]*/, "")));
        for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*(?!\\[)(\\S.*?)[ \\t]*$`, "gm")))
          out.push(m[1]);
        return out.map((v) => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      };

      walkMd(`${EX}/profiles`, (child, text) => {
            // A "## Skills" body table: one row per assessment. Which columns it must have,
            // which are required and which are references is read from the schema above. An
            // empty SKILL_COLUMNS is not a reason to skip — it has already failed, in
            // columnsOf, and the run cannot pass from here.
            const skills = tableOf(sectionsOf(text).get("Skills") ?? "");
            if (skills && SKILL_COLUMNS.length) {
              const want = SKILL_COLUMNS.map((c) => c.name).join("|");
              if (skills.columns.join("|") !== want)
                fail(`${child}: "## Skills" columns are ${skills.columns.join("|")}; the schema declares ${want}`);
              else
                for (const row of skills.rows)
                  SKILL_COLUMNS.forEach((col, n) => {
                    const cell = (row[n] ?? "").trim();
                    if (!cell) {
                      if (col.required)
                        fail(`${child}: a "## Skills" row has no ${col.name.toLowerCase()}`);
                    } else if (col.ref) {
                      resolve(child, col.ref, cell);
                    }
                  });
            }
        const fmText = frontmatterOf(text);
        for (const { field, ref } of refFields.get(typeOfFile(child)) ?? [])
          for (const value of refValues(fmText, field)) resolve(child, ref, value);
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
        // the same organisation in the same year, and they do here. What cannot collide is
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
