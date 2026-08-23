// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance, and it checks far less than CONVENTIONS.md states. It asserts
// that this repository's own schema files match the fixed shape, that example/ has the
// folder and filename shape the types imply, and that the references under example/profiles/
// resolve — the `ref →` columns of a "## Skills" table, and every frontmatter field a schema
// types `array of ref → <type>`. "## Skills" is the one body table it knows to look for; a
// second table-valued section would need naming here. It does not validate example/ against
// the schemas: no date is parsed, no file is checked for the sections its schema requires,
// an unknown frontmatter field passes, and no file under example/values/ is ever read. A
// file under example/profiles/ whose path matches no type's File Location has its frontmatter
// left alone, because nothing declares what it may reference. Every check names the
// CONVENTIONS.md rule it enforces, and a meta-check fails if that rule is missing — so the
// script and the prose cannot drift apart silently.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The slice this release ships. Mirrors spec §4; the folder is stated, never derived.
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
  { type: "proficiency-level", folder: "proficiency-levels" },
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
  { type: "experience", folder: "profiles/<profile>/experiences", owner: "profile" },
];

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
      for (const { type, owner, folder } of TYPES) {
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

        const order = [...s.keys()].filter((k) => k);
        const want = ["File Location", "Frontmatter", "Sections"];
        if (order.join(">") !== want.join(">"))
          fail(`${path}: sections are ${order.join(", ")}; must be exactly ${want.join(", ")}`);

        // The schema's own "## File Location" and the manifest's folder are two statements
        // of the same fact, and nothing else compares them. Without this, a schema could
        // name `skill/*.md` while TYPES says `skills` and every message quoting "the File
        // Location" would still be quoting TYPES.
        const stated = (s.get("File Location") ?? "").match(/`([^`]+)`/)?.[1];
        if (!stated) fail(`${path}: "## File Location" states no path in backticks`);
        else if (!stated.startsWith(`${folder}/`))
          fail(
            `${path}: "## File Location" says \`${stated}\`, which does not start with "${folder}/" — the folder declared for ${type}`,
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
          else requiredYesNo(block.table, where);
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
        const s = sectionsOf(text);
        const typed = [
          tableOf((s.get("Frontmatter") ?? "").trim()),
          ...tablesOf(s.get("Sections") ?? "").slice(1),
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
      for (const { type, owner, folder } of TYPES) {
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
      const top = ls("example");
      if (top === null) return fail("example/ is missing");

      const rootFolders = TYPES.filter((t) => !t.folder.includes("/")).map((t) => t.folder);
      const ownerFolders = TYPES.filter((t) => t.owns).map((t) => t.folder.split("/")[0]);
      const allowed = new Set([...rootFolders, ...ownerFolders, "README.md"]);
      for (const entry of top)
        if (!allowed.has(entry))
          fail(`example/${entry} is not a folder of any type (expected one of ${[...allowed].join(", ")})`);

      for (const { type, folder, owns } of TYPES) {
        if (folder.includes("/") && !owns) continue; // owned types are reached via their owner
        const base = folder.split("/")[0];
        for (const name of ls(`example/${base}`) ?? []) {
          if (!owns) {
            if (!name.endsWith(".md")) fail(`example/${base}/${name} should be a .md file`);
            continue;
          }
          // A folder entity: its own file is named for it, and it owns folders beside it.
          const inside = ls(`example/${base}/${name}`) ?? [];
          if (!inside.includes(`${name}.md`))
            fail(`example/${base}/${name}/ must contain ${name}.md, not ${inside.join(", ")}`);
          for (const owned of owns) {
            const ownedFolder = TYPES.find((t) => t.type === owned).folder.split("/").pop();
            if (!inside.includes(ownedFolder))
              fail(`example/${base}/${name}/ is missing ${ownedFolder}/`);
          }
          if (inside.includes("README.md"))
            fail(`example/${base}/${name}/README.md — an entity's file is named for the entity`);
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
      // frontmatter fields that hold references are the rows a schema types
      // `array of ref → <type>`. What is written down below is which schema and which section
      // to read — never a level, a column or a field name, all of which live in the schema.
      const folderOf = (type) => TYPES.find((t) => t.type === type)?.folder ?? null;
      const namesOf = (type) => {
        const folder = folderOf(type);
        const names = new Set();
        const dir = join(ROOT, `example/${folder}`);
        if (!existsSync(dir)) return names;
        for (const f of readdirSync(dir)) {
          if (!f.endsWith(".md")) continue;
          const name = h1(`example/${folder}/${f}`);
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

      // Which type a file under example/ is, by matching its folder against the File
      // Location each type declares; `<placeholder>` matches one segment. A file that
      // matches nothing has no schema, so nothing declares what it may reference.
      const typeOfFile = (rel) => {
        const dir = rel.split("/").slice(1, -1);
        for (const { type, folder } of TYPES) {
          const want = folder.split("/");
          if (want.length !== dir.length) continue;
          if (want.every((seg, n) => (/^<.+>$/.test(seg) ? true : seg === dir[n]))) return type;
        }
        return null;
      };

      // Frontmatter fields a schema types `array of ref → <type>`: the field name and what
      // it points at, both read from the schema. A list of bare names is the one shape R8
      // leaves in frontmatter, and this is what makes it machine-visible.
      const listFieldsOf = (type) => {
        const fm = tableOf((sectionsOf(read(`core/${type}-schema.md`) ?? "").get("Frontmatter") ?? "").trim());
        return (fm?.rows ?? []).flatMap((r) => {
          const target = r[2].replace(/`/g, "").trim().match(/^array of ref → (.+)$/)?.[1];
          return target ? [{ field: r[0].replace(/`/g, "").trim(), ref: target }] : [];
        });
      };
      const listFields = new Map(TYPES.map((t) => [t.type, listFieldsOf(t.type)]));

      // Both YAML forms of a list, because the schema types the field `array` and says
      // nothing about which one an instance writes. Scoped to the frontmatter block, so a
      // line in the body that happens to read like a field is not mistaken for one.
      const frontmatterOf = (text) => text.match(/^---\n([\s\S]*?)\n---(?:\n|$)/)?.[1] ?? "";
      const listValues = (fmText, field) => {
        const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const out = [];
        for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*\\[(.*)\\][ \\t]*$`, "gm")))
          out.push(...m[1].split(","));
        for (const m of fmText.matchAll(new RegExp(`^${name}:[ \\t]*$\\n((?:[ \\t]*-[ \\t]*\\S.*(?:\\n|$))+)`, "gm")))
          out.push(...m[1].split("\n").map((l) => l.replace(/^[ \t]*-[ \t]*/, "")));
        return out.map((v) => v.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
      };

      const walk = (rel) => {
        const p = join(ROOT, rel);
        if (!existsSync(p)) return;
        for (const entry of readdirSync(p)) {
          const child = `${rel}/${entry}`;
          if (statSync(join(ROOT, child)).isDirectory()) walk(child);
          else if (entry.endsWith(".md")) {
            const text = read(child) ?? "";
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
            for (const { field, ref } of listFields.get(typeOfFile(child)) ?? [])
              for (const value of listValues(fmText, field)) resolve(child, ref, value);
          }
        }
      };
      walk("example/profiles");
    },
  },
  {
    name: "rules are written down",
    rule: "R0",
    run() {
      const text = read("CONVENTIONS.md");
      if (text === null) return fail("CONVENTIONS.md is missing");
      const defined = new Set([...text.matchAll(/^###\s+(R\d+)\s+—/gm)].map((m) => m[1]));
      for (const check of CHECKS)
        if (!defined.has(check.rule))
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
