// The checks that are about an instance — any instance — rather than about this repository.
//
// Pure, and fed a map of path → text the way `instance.mjs` is: an instance's CI, a developer's
// shell and `verify/check.mjs` all build that map their own way, and none of them hands this
// file a directory to walk. That is not only symmetry with the parser. A check that reads the
// filesystem itself has to decide what to do when a path is a file where a folder was expected,
// and the honest answer is a failure naming the path — which is easy to write and easy to
// forget, and forgetting it raised `ENOTDIR` on the first real instance these checks met: a
// stack trace that cites no rule and names no file. A map has no such case to forget.
//
// The schemas come from the map too, under `core`, which is the point of shipping this at all:
// an instance sits on the version of core it vendored and is held to that one. Reading the
// schemas from this package would re-validate somebody's repository against rules it never
// adopted, the moment they took a newer release.


// The slice this release ships. Mirrors spec §4; the folder is stated, never derived.
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
  { type: "proficiency-level", folder: "proficiency-levels" },
  { type: "experience-kind", folder: "experience-kinds" },
  { type: "achievement-kind", folder: "achievement-kinds" },
  { type: "source", folder: "sources" },
  { type: "surface", folder: "surfaces" },
  { type: "strategic-objective", folder: "strategic-objectives" },
  { type: "strategy", folder: "strategies" },
  { type: "role", folder: "roles" },
  // R5, R6: a process owns its phases and cannot be read without them, so it is a folder,
  // as a profile is. R10 puts the owner declaration on `phase`, the owned side.
  { type: "process", folder: "processes/<process>", owns: ["phase"] },
  // No `filename` form: a phase derives by R12's default, the slug of its H1. Order is the
  // process's `## Phases` table and the `gate-to` chain, never a number on a file.
  { type: "phase", folder: "processes/<process>/phases", owner: "process" },
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


// R12's slug. One definition, used for a file, a folder and the collision test alike.
export const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Two release strings compared as releases rather than as text: "0.10.0" is newer than "0.9.0"
// and string order says the opposite. It is exported because `bin/check-instance.mjs` holds an
// instance's vendored core against the checker reading it, and a comparison that quietly gets
// that pair backwards is worse than no comparison at all. Both arguments are MAJOR.MINOR.PATCH;
// the caller checks the form, because a bad form here would compare NaN and return false.
export const isNewer = (a, b) => {
  const parts = (v) => v.split(".").map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// Spec §5: closed for the first release. `ref → <type>` and `array of ref → <type>` are
// checked separately because their target varies.
export const TYPE_VOCABULARY = new Set(["string", "number", "date", "array", "enum"]);


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


// The other sanctioned caption, for the other declared shape: a section whose content is
// grouped under `###` headings that name entities. Both captions name a section in backticks
// and the words after it are what separate them, so a reader of "## Sections" can say which of
// the two a table is without counting blocks or looking at its columns.
export const HEADING_CAPTION = /^`##\s+(.+?)`\s+is grouped under these headings:$/;


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
// A block carries `section` when a column table's caption addresses it and `grouped` when a
// heading table's does, never both. Two fields rather than one flag, so every caller that only
// knows about column tables keeps reading exactly what it read before: a heading table arrives
// with `section: null` and is skipped by the filters that select column tables.
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
    const line = above >= 0 ? lines[above].trim() : "";
    const caption = line.match(COLUMN_CAPTION);
    const heading = caption ? null : line.match(HEADING_CAPTION);
    out.push({
      section: caption ? caption[1].trim() : null,
      grouped: heading ? heading[1].trim() : null,
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

// Which type a file under the container is, by matching its folder against the File Location each
// type declares; `<placeholder>` matches one segment. A file that matches nothing has no
// schema, so nothing declares what it may reference or how its fields are shaped.
export function typeOfPath(rel, model) {
  // R6: a README is never an entity, so nothing declares what it may hold and no check that
  // reads a file by the type of its folder may ask it for one. The parser drops it on the same
  // rule. Stated once here rather than at each caller, which is how it came to be stated at
  // none: the example keeps a README only at the container root, and every check that walks a
  // type folder met its first one in a real instance.
  if (rel.split("/").pop() === "README.md") return null;
  // A path arrives with the container in front of it and every File Location is written from
  // the container down, so the container is what is stripped — a parameter, because the
  // container of an instance is `model/` and the container of the example is `example/model/`.
  const parts = rel.slice(model.length + 1).split("/");
  const dir = parts.slice(0, -1);
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


// R8: the backticked tokens an `enum` field's Description opens with — read once here so the
// R8 check and the required-field check, which both name an enum's permitted values, read the
// same run of tokens the same way. The run must end at a sentence boundary — a period or the
// end of the cell — not merely stop matching, so a separator R8 does not name (`and`, `/`) ends
// the match silently rather than reading as a complete list that happens to be short one value.
// Empty when the description opens with prose or no readable list, which is the caller's
// finding to make, not this function's.
export function enumTokensOf(description) {
  const leading = description.match(/^((?:`[^`]+`(?:\s*,\s*(?:or\s+)?|\s+or\s+))*`[^`]+`)(?:\.|$)/)?.[1] ?? "";
  return [...leading.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}


// Every check an instance runs, built against one tree and one copy of the rules. Returned
// rather than run, so a caller can splice them into a longer list and keep one report.
//
// `files` is path → text for everything under the container and under `core`, not only the
// Markdown: a stray file is a finding of "the container holds what the types imply", and a map that dropped it would
// hide the very thing that check exists to see.
export function instanceChecks({ files, core = "core", model = MODEL, fail }) {
  const EX = model;
  const read = (rel) => files.get(rel) ?? null;

  // The immediate children of a directory, as a directory listing would give them, derived
  // from the paths themselves. `null` where nothing sits under the path at all, which is what
  // separates a missing container from an empty one.
  const ls = (rel) => {
    const prefix = `${rel}/`;
    const out = new Set();
    for (const path of files.keys())
      if (path.startsWith(prefix)) out.add(path.slice(prefix.length).split("/")[0]);
    return out.size ? [...out].sort() : null;
  };

  // Every Markdown file under a path, in path order.
  const walkMd = (rel, visit) => {
    const prefix = `${rel}/`;
    for (const path of [...files.keys()].sort())
      if (path.startsWith(prefix) && path.endsWith(".md")) visit(path, read(path) ?? "");
  };

  const typeOfFile = (rel) => typeOfPath(rel, model);

  // What a schema declares grouped: the section, the name its heading table gives the
  // reference, and how that reference is typed. Addressed by the caption R9 fixes for it, so
  // no section is named in this file — a schema says which of its sections are grouped, and
  // these checks read whatever it says. "schema fixed shape" has already failed a heading
  // table with the wrong columns or with no row, so what reaches here can be read by position
  // the way `fieldsOf` reads the frontmatter table.
  const groupedOf = (type) =>
    blocksOf(sectionsOf(read(`${core}/${type}-schema.md`) ?? "").get("Sections") ?? "")
      .filter((b) => b.grouped && b.table?.rows.length)
      .map((b) => ({
        section: b.grouped,
        heading: b.table.rows[0][0].replace(/`/g, "").trim(),
        declared: (b.table.rows[0][2] ?? "").replace(/`/g, "").trim(),
      }));

  // The `###` headings of one section's text, in document order. `sectionsOf` splits on "## "
  // alone, so a section keeps its own headings and a `####` below one is not mistaken for one.
  const headingsIn = (body) =>
    (body ?? "")
      .split("\n")
      .map((l) => l.match(/^###\s+(.+?)\s*$/)?.[1])
      .filter(Boolean);

  // The type a declared reference points at, for the two checks below. `ref?` is read like
  // `ref` here: what they differ about is whether a value must resolve, and neither check asks
  // that question — the R16 check above does.
  const targetOf = (declared) => declared.match(/^ref\?? → (.+)$/)?.[1] ?? null;

  // The frontmatter fields a schema declares, as name, whether it is required and what it is
  // declared, in table order — read from the core the caller supplied and from no other.
  const fieldsOf = (type) => {
    const fm = tableOf((sectionsOf(read(`${core}/${type}-schema.md`) ?? "").get("Frontmatter") ?? "").trim());
    return (fm?.rows ?? []).map((r) => ({
      field: r[0].replace(/`/g, "").trim(),
      required: r[1].replace(/`/g, "").trim() === "Yes",
      declared: r[2].replace(/`/g, "").trim(),
      description: (r[3] ?? "").trim(),
    }));
  };

  // An owner that lists what it owns, read once for the two checks that hold such a listing.
  // No type is named: it hangs on what the schemas declare, a type that owns another and a
  // column table of the owner with a column declared `ref → <the owned type>`. One entry per
  // entity of such an owner: its file, the rows of that column as written (`null` where the
  // section holds no table the checks can read, or is not there), and its own entities of the
  // owned type by H1, each with what its successor field says, where the owned type declares a
  // field `ref → <itself>`.
  //
  // Read deliberately narrowly. Only `ref →` counts: a `ref?` column or successor is optional
  // by declaration and is held to nothing here, and a `qualifier` names something the row's
  // reference is about, not something the owner lists. The first such table of a schema is the
  // listing; a second would be a second claim to the same thing. And an owner is read one level
  // deep, `<folder>/<entity>/<entity>.md`, which is every owner R6 allows today. A table without
  // the declared column is the column check's finding, and yields no entry. The successor is
  // read with `fieldValues`, the reader every other check uses, so that what a field says is
  // one question with one answer: a value in quotes is the value.
  const ownerListings = () => {
    const out = [];
    for (const owner of TYPES.filter((t) => t.owns))
      for (const ownedType of owner.owns) {
        const owned = TYPES.find((t) => t.type === ownedType);
        if (!owned?.folder) continue;
        const listing = blocksOf(sectionsOf(read(`${core}/${owner.type}-schema.md`) ?? "").get("Sections") ?? "")
          .filter((b) => b.section && b.table)
          .flatMap((b) =>
            b.table.rows
              .filter((r) => (r[2] ?? "").replace(/`/g, "").trim() === `ref → ${ownedType}`)
              .map((r) => ({ section: b.section, column: r[0].replace(/`/g, "").trim() })),
          )[0];
        if (!listing) continue;
        const successor = fieldsOf(ownedType).find((f) => f.declared === `ref → ${ownedType}`)?.field ?? null;
        const base = `${EX}/${owner.folder.split("/")[0]}`;
        const ownedFolder = owned.folder.split("/").pop();
        for (const name of ls(base) ?? []) {
          const file = `${base}/${name}/${name}.md`;
          const text = read(file);
          if (text === null) continue; // no owner file: the container check's finding
          const table = tableOf(sectionsOf(text).get(listing.section) ?? "");
          const at = table ? table.columns.indexOf(listing.column) : -1;
          if (table && at < 0) continue;
          const folder = `${base}/${name}/${ownedFolder}`;
          const mine = new Map();
          for (const f of (ls(folder) ?? []).filter((f) => f.endsWith(".md") && f !== "README.md")) {
            const body = read(`${folder}/${f}`) ?? "";
            const h1 = body.match(/^#\s+(.+?)\s*$/m)?.[1];
            if (h1) mine.set(h1, successor ? fieldValues(frontmatterOf(body), successor)[0] ?? null : null);
          }
          out.push({
            file, folder, mine, ownedType, successor,
            section: listing.section,
            column: listing.column,
            where: `${file}: "## ${listing.section}"`,
            rows: table ? table.rows.map((r) => (r[at] ?? "").trim()).filter(Boolean) : null,
          });
        }
      }
    return out;
  };

  return [
  {
    name: "the container holds what the types imply",
    rule: "R6",
    run() {
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
          if (name === "README.md") continue; // R6, as above — and an owner's folder has one too
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
          // What an owner's folder may hold is its own file and the folders of what it owns (R5).
          // Anything else was passed here, and the parser reads an owned entity found in it as
          // sitting in no owner of its type.
          const ownedFolders = owns.map((o) => TYPES.find((t) => t.type === o).folder.split("/").pop());
          for (const entry of inside)
            if (entry !== `${name}.md` && entry !== "README.md" && !ownedFolders.includes(entry))
              fail(`${EX}/${base}/${name}/${entry} is not a folder a ${type} owns (expected ${ownedFolders.map((f) => `${f}/`).join(", ")}) (R5)`);
        }
      }
    },
  },
  {
    name: "references resolve",
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
        for (const f of ls(`${EX}/${folder}`) ?? []) {
          if (!f.endsWith(".md")) continue;
          const name = h1(`${EX}/${folder}/${f}`);
          if (!name) fail(`${EX}/${folder}/${f} has no H1`);
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
          fail(`${child}: ${type} "${value}" resolves to nothing in ${EX}/${folderOf(type)}/`);
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

      // A body table's columns are not read here. "the instance is held to what the schemas
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
    // R16. `core/` declares a type system and this check holds an instance to it, from the
    // side the parser cannot see: the parser reads a schema to decide which values are edges,
    // and this file reads the same schema to say whether the values written are the ones it
    // allows. Two assertions do that at the value: a declared reference is drawn on its
    // declared type, and a `number` is written as digits. Nothing else is drawn, and the
    // parser guarantees that, so nothing here has to.
    //
    // This script imports no parser, so it cannot observe an edge. It does not have to. A
    // declared reference draws an edge exactly when its value is the H1 of an entity of the
    // declared type, and nothing else draws one — which is what R16 says and what the parser
    // does. Both are facts about files this script already reads, so "draws an edge" and
    // "matches an H1 of the declared type" are one question asked in two vocabularies.
    //
    // Every table is addressed by the caption naming its section, never by counting, and no
    // section is named in this file: R9 makes the caption what says which section a column
    // table belongs to, so the schemas say which body tables exist and this check reads them
    // all. That is what retired the `columnsOf("profile", "Skills")` the R4 check carried —
    // the one body table this script knew how to look for, out of the four now read.
    name: "the instance is held to what the schemas declare",
    rule: "R16",
    run() {
      // Every canonical name in the example, and the types carrying it, so a declared
      // reference that lands on the wrong type can be told which type it did land on. A
      // file matching no File Location has no schema and so declares nothing to be held
      // to, the silence "references resolve" keeps and for the same reason; a file with
      // no H1 is "filenames derive"'s finding, not this one's.
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
      // was written in, so the assertions read the same for both.
      const held = (child, where, declared, value) => {
        const ref = refOf(declared);
        // A field declared as anything but a reference resolves to nothing whatever it
        // says, so there is nothing to hold such a value to: a string that happens to
        // equal an H1 is a string.
        if (!ref) return;
        const found = typesByName.get(value);
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
          blocksOf(sectionsOf(read(`${core}/${t.type}-schema.md`) ?? "").get("Sections") ?? "")
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

      // 3. A column table declares at most one drawing reference. A row is one fact and draws
      // one edge, so a second reference column would be a second claim no row makes. Where
      // the column stands is the schema author's choice: the parser draws from the declared
      // column wherever it is. A table declaring no reference draws nothing and is data, which
      // is a table's other legal shape.
      for (const [type, tables] of columnTables)
        for (const { section, columns } of tables) {
          const draws = columns.filter((c) => refOf(c.declared)?.draws);
          if (!draws.length) {
            // A qualifier with nothing to qualify is a contradiction in the schema itself: a
            // qualifier is an attribute of the edge its row draws, and a table declaring no
            // reference draws none, so the schema describes an attribute of nothing.
            const q = columns.filter((c) => refOf(c.declared) && !refOf(c.declared).draws);
            if (q.length)
              fail(
                `${core}/${type}-schema.md: "## ${section}" declares ${q.map((c) => "\`" + c.name + "\`").join(", ")} as ${q.length === 1 ? "a qualifier" : "qualifiers"} and no reference; a qualifier qualifies the edge its row draws, and this table draws none`,
              );
            continue;
          }
          if (draws.length > 1)
            fail(
              `${core}/${type}-schema.md: "## ${section}" declares ${draws.length} references (${draws.map((c) => c.name).join(", ")}); a row draws one edge, so one column names what it points at and the rest qualify it`,
            );
        }

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const fmText = frontmatterOf(text);

        for (const { field, declared } of fieldsOf(type)) {
          for (const value of fieldValues(fmText, field)) held(child, `\`${field}\``, declared, value);
          // 2. A number is digits. R16 makes `number` a statement about the written form and
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

        // A heading in a grouped section is a declared reference like a cell (R9, R16), so it
        // is held on the same terms. The parser throws R4 on one that names nothing; without
        // this the checker would report green over a file the parser refuses to read.
        for (const { section, declared } of groupedOf(type))
          for (const name of headingsIn(sections.get(section)))
            held(child, `\`### ${name}\` in "## ${section}"`, declared, name);
      });
    },
  },
  {
    // R3: every reference is by canonical name, never by file path and never by filename. It was
    // the agent pass's alone until a process's phases were found written as links to their files,
    // which the schema of the day asked for and no check read; the list sat in the reference
    // instance through every review, and a renamed phase would have rotted in it unseen. The
    // half of R3 a machine can read is this: a Markdown link inside an entity whose target is a
    // path into the container. Whatever its text says, it names something of the model by where
    // the file lies. A target that does not exist fails as well, since a rotten path is still a
    // path, and so does a folder.
    //
    // What is not read as one. An address with a scheme, a fragment of the same page and a path
    // that leaves the container name nothing of the model: a document or a place is no entity,
    // and its address is a fact, which is what a References table holds. An image is an embed and
    // not a reference. Code is not prose, fenced or inline, so a schema's example of a link is
    // not a link. A README is never an entity (R6), so its index of links is its own business.
    // A name written in double brackets is not read here either: it is a name, and where a
    // schema declares the position R16 already refuses the brackets as part of it.
    name: "an entity names another by its canonical name, never by a link to its file",
    rule: "R3",
    run() {
      const LINK = /(?<!!)\[([^\]]+)\]\(\s*(<[^>]*>|[^)\s]+)(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;
      walkMd(EX, (child, text) => {
        if (!typeOfFile(child)) return;
        const here = child.split("/").slice(0, -1);
        let fenced = false;
        for (const raw of text.split("\n")) {
          if (/^\s*(```|~~~)/.test(raw)) {
            fenced = !fenced;
            continue;
          }
          if (fenced) continue;
          for (const m of raw.replace(/`[^`]*`/g, "").matchAll(LINK)) {
            const target = m[2].replace(/^<|>$/g, "");
            if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#") || target.startsWith("//")) continue;
            let path = target.split("#")[0].split("?")[0];
            try {
              path = decodeURIComponent(path);
            } catch {
              // not percent-encoded after all; read it as written
            }
            // Resolved as a forge or an editor resolves it: from the file's own folder, or from
            // the repository's root where it opens with a slash.
            const parts = path.startsWith("/") ? [] : [...here];
            for (const seg of path.split("/")) {
              if (seg === "" || seg === ".") continue;
              if (seg === "..") parts.pop();
              else parts.push(seg);
            }
            const resolved = parts.join("/");
            if (resolved !== EX && !resolved.startsWith(`${EX}/`)) continue;
            fail(`${child}: links "${m[1]}" to ${target}, a path into ${EX}/; an entity names another by its canonical name and never by where its file lies (R3), so write the name, and leave making it a link to whatever shows the model`);
          }
        }
      });
    },
  },
  {
    // R2 for an owned type: a name identifies an entity within its owner. The check that finds two
    // files of a type sharing a name lists the type's own folder, and an owned type has none at
    // the top of the container, so within an owner nothing was checked, while the parser refused
    // one name across every owner. Now one name across owners is allowed, as the parser allows it,
    // and within one owner it is the failure it always was. No type is named.
    name: "a name of an owned type is unique within its owner",
    rule: "R2",
    run() {
      for (const owned of TYPES.filter((t) => t.owner && t.folder)) {
        const owner = TYPES.find((t) => t.type === owned.owner);
        if (!owner?.folder) continue;
        const base = `${EX}/${owner.folder.split("/")[0]}`;
        for (const name of ls(base) ?? []) {
          const folder = `${base}/${name}/${owned.folder.split("/").pop()}`;
          const seen = new Map();
          for (const f of (ls(folder) ?? []).filter((f) => f.endsWith(".md") && f !== "README.md")) {
            const h1 = (read(`${folder}/${f}`) ?? "").match(/^#\s+(.+?)\s*$/m)?.[1];
            if (!h1) continue; // no H1 is the filename check's finding
            if (seen.has(h1))
              fail(`${folder}/${f}: shares the name "${h1}" with ${folder}/${seen.get(h1)}; a name of an owned type is unique within its owner, ${base}/${name} (R2)`);
            else seen.set(h1, f);
          }
        }
      }
    },
  },
  {
    // R5 nests an owned collection inside its owner, and a name of an owned type is its owner's.
    // Every reference core makes to an owned type is written inside that owner's subtree: a
    // process names its phases, a phase the phase its gate leads to, a profile the experience a
    // fact comes from. Each schema says in prose that the name is one of the owner's own, and
    // R16 cannot hold that: it reads names by type across the instance, so one profile's
    // evidence naming another profile's experience finds that name and passes it. The parser
    // resolves an owned name within its owner (R4) and refuses it; this is the checks saying the
    // same, so the checker never passes what the parser refuses.
    //
    // No type is named. It is held wherever a schema declares a field, a column or a grouped
    // heading as `ref`, `array of ref` or `qualifier` to a type that is owned, in an entity that
    // is the owner or is owned by the same owner, which is where the scope is known: the owner's
    // own folder of the owned type. A `ref?` is optional by declaration and is held to nothing
    // here, as everywhere. A reference to an owned type written outside every owner of it has no
    // scope to be held to and is not read; core declares none, and whether one may exist at all
    // is a question of how far an owned name reaches, which the conventions do not yet answer.
    name: "a name of an owned type is one of its owner's own",
    rule: "R5",
    run() {
      const ownedTypes = new Map(TYPES.filter((t) => t.owner).map((t) => [t.type, t]));
      const clean = (cell) => (cell ?? "").replace(/`/g, "").trim();
      const targetOf = (declared) => declared.match(/^(?:array of )?(?:ref|qualifier) → (.+)$/)?.[1] ?? null;
      const declaredOf = (type) => {
        const out = [];
        for (const { field, declared } of fieldsOf(type))
          if (ownedTypes.has(targetOf(declared))) out.push({ kind: "field", field, target: targetOf(declared) });
        for (const b of blocksOf(sectionsOf(read(`${core}/${type}-schema.md`) ?? "").get("Sections") ?? "").filter((b) => b.section && b.table))
          for (const r of b.table.rows)
            if (ownedTypes.has(targetOf(clean(r[2])))) out.push({ kind: "column", section: b.section, column: clean(r[0]), target: targetOf(clean(r[2])) });
        for (const g of groupedOf(type))
          if (ownedTypes.has(targetOf(g.declared))) out.push({ kind: "heading", section: g.section, target: targetOf(g.declared) });
        return out;
      };
      const declared = new Map(TYPES.map((t) => [t.type, declaredOf(t.type)]));

      const ownOf = new Map();
      const own = (folder) => {
        if (!ownOf.has(folder))
          ownOf.set(
            folder,
            new Set(
              (ls(folder) ?? [])
                .filter((f) => f.endsWith(".md") && f !== "README.md")
                .map((f) => (read(`${folder}/${f}`) ?? "").match(/^#\s+(.+?)\s*$/m)?.[1])
                .filter(Boolean),
            ),
          );
        return ownOf.get(folder);
      };

      // Every H1 of an owned type, across all its owners.
      const everywhere = new Map();
      const anywhere = (ownedType) => {
        if (!everywhere.has(ownedType)) {
          const names = new Set();
          walkMd(EX, (path, body) => {
            if (typeOfFile(path) !== ownedType) return;
            const h1 = body.match(/^#\s+(.+?)\s*$/m)?.[1];
            if (h1) names.add(h1);
          });
          everywhere.set(ownedType, names);
        }
        return everywhere.get(ownedType);
      };

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        for (const decl of declared.get(type) ?? []) {
          const ownedSpec = ownedTypes.get(decl.target);
          const ownerType = ownedSpec.owner;
          const ownerSpec = TYPES.find((t) => t.type === ownerType);
          if (!ownerSpec?.folder) continue;
          // The scope is known where the entity is the owner, or is owned by the same owner. Written
          // anywhere else, a reference to an owned type has no owner to be resolved in and names
          // nothing (R4): the parser refuses it, and so does this.
          const rel = child.slice(EX.length + 1).split("/");
          const inside =
            (type === ownerType || TYPES.find((t) => t.type === type)?.owner === ownerType) &&
            rel[0] === ownerSpec.folder.split("/")[0] && rel.length >= 3;
          const folder = inside ? `${EX}/${rel[0]}/${rel[1]}/${ownedSpec.folder.split("/").pop()}` : null;

          const sections = decl.kind === "field" ? null : sectionsOf(text);
          let values, where;
          if (decl.kind === "field") {
            values = fieldValues(frontmatterOf(text), decl.field);
            where = () => `\`${decl.field}\``;
          } else if (decl.kind === "column") {
            const table = tableOf(sections.get(decl.section) ?? "");
            const at = table ? table.columns.indexOf(decl.column) : -1;
            values = at < 0 ? [] : table.rows.map((r) => (r[at] ?? "").trim()).filter(Boolean);
            where = () => `\`${decl.column}\` in "## ${decl.section}"`;
          } else {
            values = headingsIn(sections.get(decl.section));
            where = (v) => `\`### ${v}\` in "## ${decl.section}"`;
          }
          if (!folder) {
            for (const value of new Set(values))
              fail(`${child}: ${where(value)} says "${value}", written outside every ${ownerType}; ${decl.target} entities are named only within the ${ownerType} that owns them, so this names nothing (R4)`);
            continue;
          }
          const whose = type === ownerType ? "its own" : `its ${ownerType}'s own`;
          // A name that is no entity of the type anywhere is R16's to report, that it resolves
          // nowhere; this check speaks only of one that resolves and is another owner's, so one
          // cause is one finding.
          for (const value of new Set(values))
            if (anywhere(decl.target).has(value) && !own(folder).has(value))
              fail(`${child}: ${where(value)} says "${value}", which is not one of ${whose}: no ${decl.target} in ${folder}/ has that H1, and ${decl.target} entities are named only within the ${ownerType} that owns them (R5)`);
        }
      });
    },
  },
  {
    // R5 makes an owned collection nest inside its owner, so what an owner owns is a fact of
    // the tree, and a table in which the owner says so is held to the tree. R16 already holds
    // each cell to the declared type and cannot see this: it reads names by type across the
    // instance, so a row naming another owner's entity passes it; that half is the check above's,
    // which holds every such name to its owner as the parser does. What is
    // left here is what only a listing has: that it is complete, and says each thing once.
    // `ownerListings` above says what is read and what is not.
    name: "an owner's table of what it owns lists all of it, each once",
    rule: "R5",
    run() {
      for (const { where, rows, mine, ownedType, folder } of ownerListings()) {
        if (!rows) continue; // no table to read: the next check's finding, said once
        const seen = new Set();
        for (const row of rows) {
          if (seen.has(row)) fail(`${where} lists "${row}" twice; an owner lists each ${ownedType} it owns once`);
          seen.add(row);
          // A row that is not the owner's own is the finding of the check above, said once.
        }
        for (const h1 of mine.keys())
          if (!seen.has(h1)) fail(`${where} does not list "${h1}", which ${folder}/ holds; an owner lists every ${ownedType} it owns (R5)`);
      }
    },
  },
  {
    // R9 fixes what a schema may declare, a table-valued section among it, and makes a schema's
    // writing rules part of the type. Two of them are read here, because a machine can: that the
    // section a schema declares a table holds one, and that the order of its rows is the order
    // the owned entities give each other. The first matters more than it looks. The checks'
    // table reader refuses a separator row that is not plain dashes, and the parser reads such a
    // table all the same and draws its edges; and a section still written the way an older core
    // asked for, a list of links, holds no table at all. Either way the check above has no rows
    // and would say nothing, so an instance could take a release that rewrites the section,
    // rewrite nothing, and stay green. The second half hangs on a field of the owned type
    // declared `ref → <itself>`, a phase's `gate-to`: each entity names its successor, the
    // table says the same a second time, and the two are held to each other.
    name: "an owner's table of what it owns is a table, in the order the owned give",
    rule: "R9",
    run() {
      for (const { file, where, section, column, rows, mine, ownedType, successor } of ownerListings()) {
        if (!rows) {
          fail(`${file}: "## ${section}" holds no table the checks can read, and the ${typeOfFile(file)} schema declares it a table with the column \`${column}\`; a table opens with a header row and a separator row of plain dashes, without alignment colons, and a list or links to files are not one (R9)`);
          continue;
        }
        if (!successor) continue;
        // Order is held only between rows that are the owner's own, each once; a row that is
        // not has been named by the check above, and one finding per cause is enough.
        const ordered = rows.filter((row, i) => mine.has(row) && rows.indexOf(row) === i);
        ordered.forEach((row, i) => {
          const says = mine.get(row);
          const next = ordered[i + 1];
          if (next === undefined) {
            if (says) fail(`${where} ends on "${row}", whose \`${successor}\` says "${says}"; the last ${ownedType} leads nowhere, and only the last`);
          } else if (says !== next) {
            fail(`${where} puts "${next}" after "${row}", whose \`${successor}\` says ${says ? `"${says}"` : "nothing"}; the table and \`${successor}\` state one order`);
          }
        });
      }
    },
  },
  {
    // R9's writing rule for any ranked type, stated once in the vocabulary rather than per
    // type: `rank`, typed `number`, is an entity's order within its type, and two entities
    // claiming the same position leave nothing for a reader — or the check above — to order
    // them by. `achievement-kind`'s "two kinds never share a rank" is that rule read for one
    // type; `proficiency-level` needs it exactly as much and states it nowhere, which is what
    // makes this check generic rather than named for the type that first carried it: it keys
    // on the field a schema declares, `number` named `rank`, and holds every type that
    // declares one, not a list of type names kept in step with core by hand.
    name: "two entities of a ranked type do not share a rank",
    rule: "R9",
    run() {
      for (const { type } of TYPES) {
        if (!fieldsOf(type).some((f) => f.field === "rank" && f.declared === "number")) continue;
        const byRank = new Map();
        walkMd(EX, (child, text) => {
          if (typeOfFile(child) !== type) return;
          const name = text.match(/^#\s+(.+?)\s*$/m)?.[1];
          const rank = fmScalar(frontmatterOf(text), "rank");
          if (!name || rank === null || !/^-?\d+$/.test(rank)) return;
          const n = Number(rank);
          if (!byRank.has(n)) byRank.set(n, []);
          byRank.get(n).push(name);
        });
        for (const [rank, names] of byRank)
          if (names.length > 1)
            fail(
              `two ${type} entities share rank ${rank}: ${names.map((n) => `"${n}"`).join(", ")}; rank orders an entity within its type, and two cannot hold the same position`,
            );
      }
    },
  },
  {
    // R16, and the one part of a schema's grouping rules a machine can read. An instance that
    // orders its kinds says so in a `rank`, and an entry whose headings run against that order
    // makes a reader look in a different place in every entry, which is the whole reason the
    // headings exist. Which kind a bullet belongs under is a reading and stays the agent pass's.
    //
    // There is no general "order field" in the vocabulary, so this keys on the heading's target
    // type declaring one named `rank` — how `proficiency-level` and `achievement-kind` both
    // state an order. A grouped section pointing at a type with no `rank` has no order to hold
    // it to and is passed over, rather than this file naming a type of its own.
    name: "grouped headings follow the rank of what they name",
    rule: "R16",
    run() {
      const ranked = new Map();
      const ranksOf = (type) => {
        if (!ranked.has(type)) {
          const byName = new Map();
          walkMd(EX, (child, text) => {
            if (typeOfFile(child) !== type) return;
            const name = text.match(/^#\s+(.+?)\s*$/m)?.[1];
            const rank = fmScalar(frontmatterOf(text), "rank");
            if (name && rank !== null && /^-?\d+$/.test(rank)) byName.set(name, Number(rank));
          });
          ranked.set(type, byName);
        }
        return ranked.get(type);
      };

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const sections = sectionsOf(text);
        for (const { section, declared } of groupedOf(type)) {
          const target = targetOf(declared);
          if (!target || !fieldsOf(target).some((f) => f.field === "rank")) continue;
          const byName = ranksOf(target);
          let prev = null;
          for (const name of headingsIn(sections.get(section))) {
            // A heading naming nothing has no rank to compare; that it names nothing is the
            // R16 check's finding, and reporting it twice would be one defect under two names.
            if (!byName.has(name)) continue;
            if (prev !== null) {
              const rank = byName.get(name), prevRank = byName.get(prev);
              // Three shapes reach here, and only one of them is fixed by reversing two
              // headings. The same heading twice is a copy-paste in the entry, not an order —
              // there is nothing to put on the other side of it. Two different headings tied
              // at one rank are not an order either: reversing them swaps one violation for
              // its mirror, because the kinds themselves never said which comes first. Only a
              // real reversal — two different headings, two different ranks, out of order —
              // is what "headings follow the rank" can act on, so each of the three gets its
              // own message instead of one that reads as actionable and is not.
              if (name === prev)
                fail(
                  `${child}: "## ${section}" has "### ${name}" twice; a heading names its kind once per entry`,
                );
              else if (rank === prevRank)
                fail(
                  `${child}: "## ${section}" has "### ${name}" and "### ${prev}" both at rank ${rank}; two headings naming ${target} kinds that share a rank cannot be put in order — give them distinct ranks`,
                );
              else if (rank < prevRank)
                fail(
                  `${child}: "## ${section}" puts "### ${name}" (rank ${rank}) after "### ${prev}" (rank ${prevRank}); headings follow the rank of the ${target} they name`,
                );
            }
            prev = name;
          }
        }
      });
    },
  },
  {
    // R16. A bullet standing before the first heading belongs to no kind, and a reader looking
    // for one kind cannot tell that from a kind the entry has nothing under. Only where the
    // instance holds an entity of the heading's type: an instance that defines none writes a
    // flat list, which is why the section's heading table is `Required: No`.
    name: "a grouped section's bullets stand under its headings",
    rule: "R16",
    run() {
      const holds = new Map();
      const instanceHolds = (type) => {
        if (!holds.has(type)) {
          let any = false;
          walkMd(EX, (child) => {
            if (typeOfFile(child) === type) any = true;
          });
          holds.set(type, any);
        }
        return holds.get(type);
      };

      // R14's own vocabulary is American English, and so is the article in a message that
      // names a type: "a achievement-kind" reads as broken prose regardless of what it is
      // reporting. `target` is whatever a schema names, never a fixed list, so the article is
      // chosen from its first letter rather than hardcoded for the one type this branch ships.
      const article = (word) => (/^[aeiou]/i.test(word) ? "an" : "a");

      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const sections = sectionsOf(text);
        for (const { section, declared } of groupedOf(type)) {
          const body = sections.get(section);
          if (body === undefined) continue;
          const target = targetOf(declared);
          if (!target || !instanceHolds(target)) continue;
          const lines = body.split("\n");
          // A section with a bullet and a later heading, and a section with a bullet and no
          // heading at all, are different failures: the first names what stands before the
          // heading, and "before its first heading" is false of the second, which has none.
          const hasHeading = lines.some((line) => /^###\s+\S/.test(line));
          for (const line of lines) {
            if (/^###\s+\S/.test(line)) break;
            if (!/^\s*[-*]\s+\S/.test(line)) continue;
            fail(
              hasHeading
                ? `${child}: "## ${section}" has a bullet before its first \`###\` heading; where the instance holds ${article(target)} ${target}, every bullet stands under the heading of one`
                : `${child}: "## ${section}" has a bullet and no \`###\` heading at all; where the instance holds ${article(target)} ${target}, every bullet stands under the heading of one`,
            );
            break;
          }
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
    // resolving the entries is "references resolve" above, and this check exists so that
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
      walkMd(EX, (child, text) => {
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
          fieldsOf(t.type)
            .filter(({ required }) => required)
            .map(({ field, declared, description }) => ({ field, declared, description })),
        ]),
      );
      walkMd(EX, (child, text) => {
        const fields = requiredOf.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        for (const { field, declared, description } of fields) {
          const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (new RegExp(`^${name}:`, "m").test(fmText)) continue;
          const tokens = declared === "enum" ? enumTokensOf(description) : [];
          const named = tokens.length ? ` — one of ${tokens.map((v) => `\`${v}\``).join(", ")}` : "";
          fail(`${child}: no \`${field}\`, which ${typeOfFile(child)}-schema.md requires${named}`);
        }
      });
    },
  },
  {
    // R9: `## Frontmatter` says whether a field may be absent, and a list field that is
    // present but empty is absent in every sense that matters — nothing resolves, no edge is
    // drawn, and the page reads as though it answered a question it did not. The check above
    // reads the key and stops, which is the gap this closes. Only required fields are held: an
    // optional list written empty is an author's way of saying "none yet", and R9 gives it to
    // them by letting the field be absent in the first place.
    //
    // Presence and emptiness are tested separately, with `fieldValues` doing the emptiness
    // half: it already reads all three shapes a list may be written in — block sequence, flow
    // sequence and scalar — and ends in `.filter(Boolean)`, so a block list with no `-` lines,
    // an inline `[]`, and a key with nothing after it all correctly come back `[]`. But that
    // same `[]` is also what an absent field returns, and an absent required field is already
    // this array's other check's finding — reporting it again here as "no items" would be the
    // same defect under a different name. So presence is tested first, the same way the check
    // above tests it, and only a field that passes that test is asked whether it is empty.
    name: "required list fields carry at least one item",
    rule: "R9",
    run() {
      const listsOf = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type)
            .filter(({ required, declared }) => required && /^array\b/.test(declared))
            .map(({ field }) => field),
        ]),
      );
      walkMd(EX, (child, text) => {
        const fields = listsOf.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        for (const field of fields) {
          const name = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          if (!new RegExp(`^${name}:`, "m").test(fmText)) continue;
          if (fieldValues(fmText, field).length === 0)
            fail(`${child}: \`${field}\` carries no items, and ${typeOfFile(child)}-schema.md requires it (R9)`);
        }
      });
    },
  },
  {
    // R8: a field typed `enum` lists its values at the front of its Description as backticked
    // tokens, and a value written for it is one of them. Two assertions, one per half of the
    // rule. A schema whose enum opens with prose lists nothing, and that is the schema's
    // finding, because a value cannot be held to a list nobody can read; a value outside the
    // list is the error R8 names. The tokens are read from the front of the cell and nowhere
    // else, so a value mentioned later in the sentence is not a permitted value.
    //
    // The run of tokens must end at a sentence boundary — a period or the end of the cell —
    // not merely stop matching. A separator R8 does not name, such as "and" or "/", would
    // otherwise end the match silently after the tokens read so far, so the run reads as a
    // complete list that happens to be short one value, and a legal value then fails at the
    // page with a list the schema never meant to state. Ending at a sentence boundary makes
    // that the schema's failure instead, the same way an empty run already is.
    //
    // Only frontmatter fields are read here; a column declared `enum` in a body table is not
    // held, and none exists in core.
    name: "enum values are listed, and written values are among them",
    rule: "R8",
    run() {
      const enums = new Map();
      for (const t of TYPES) {
        const listed = [];
        for (const { field, declared, description } of fieldsOf(t.type)) {
          if (declared !== "enum") continue;
          const tokens = enumTokensOf(description);
          if (!tokens.length) {
            fail(`${core}/${t.type}-schema.md: \`${field}\` is typed enum and its Description opens with no readable list of backticked values — tokens separated by commas or "or", ending at a period; R8 lists the permitted values where a check can read them`);
            continue;
          }
          listed.push({ field, tokens });
        }
        enums.set(t.type, listed);
      }
      walkMd(EX, (child, text) => {
        const type = typeOfFile(child);
        if (!type) return;
        const fmText = frontmatterOf(text);
        for (const { field, tokens } of enums.get(type) ?? [])
          for (const value of fieldValues(fmText, field))
            if (!tokens.includes(value))
              fail(`${child}: \`${field}\` is "${value}", and ${type}-schema.md permits ${tokens.map((t) => `\`${t}\``).join(", ")} (R8)`);
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
    // matches no type has no derivation to check, the same silence "references resolve" keeps
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

        // A folder entity's own file is named for its folder, which "the container holds what the types imply"
        // already checks under R6; what this adds is that the folder itself derives.
        const own = child.split("/").slice(0, -1).pop();
        const named = base === `${own}.md` ? own : base.replace(/\.md$/, "");

        let want = null;
        if (spec.file) {
          // R12: a singular type's file is named for the type, which is what leaves its H1
          // free to be a company's name or a sentence. Nothing to derive — the name is the
          // one its schema states, and "the container holds what the types imply" has already found it.
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
  ];
}

// Every check above, run against one tree: what failed, and what was not checked at all. A
// caller that wants them beside checks of its own takes `instanceChecks` instead and keeps one
// report. The list is the count, and it is directly above; a number written here went stale
// twice while every test stayed green, because nothing in a suite reads a comment.
//
// `skipped` names every type the supplied core carries no schema for. An instance sits on the
// release it vendored, so a core older than a type is the design working — but every check that
// reads that type's schema then asks an empty table and reports green over nothing. Naming it
// is what keeps a clean report from being read as more than it is, which is the contract the
// agent pass already ends on.
export function checkInstance(files, { core = "core", model = MODEL } = {}) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const skipped = TYPES.filter((t) => !files.has(`${core}/${t.type}-schema.md`)).map((t) => t.type);
  for (const check of instanceChecks({ files, core, model, fail })) check.run();
  return { failures, skipped };
}
