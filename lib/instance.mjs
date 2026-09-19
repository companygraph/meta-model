// Turns one instance — a map of path → Markdown, beside a map of the schemas it is written
// against — into the graph the example page draws.
//
// It reads the fixed shape: YAML frontmatter as key/scalar or key/list, the H1 as the canonical
// name, the `>` tagline, `##` sections as heading plus text, a table by its header row. Types
// are folder names singularized by R7, ownership is nesting on disk (R5, R6). The schema for a
// page's type is the one thing consulted beyond the shape, and it decides everything about
// edges (R16): a field, a column, or a grouped section's `###` heading it declares as a
// reference resolves against the type it names and draws an edge, a qualifier resolves and
// draws nothing, and anything else is a fact. `declarationsOf` reads a schema into that
// decision — `fields` for frontmatter, `tables` for a column, `headings` for a `###` heading —
// and this file resolves every one of the three against it the same way. A reference that
// resolves to nothing is an R4 error here, so the page can never draw a line to nowhere.
// CONVENTIONS.md in companygraph/meta-model is the source of the rule numbers.
//
// Pure: no filesystem, no network, so verify/instance.test.mjs can feed it fixture maps.

// The one invented string of the model page — nothing in core/ names the vocabulary itself.
export const CORE_LABEL = "Core";

// R7 says a folder is the plural of its type. Reading that backwards — stripping the plural's
// last letter — worked until two types sat one inside the other: `processes` is `process` plus
// `es` and `phases` is `phase` plus `s`, so no suffix rule separates them, and `processes` came
// back as `processe`. Nothing in this repository caught it, because `lib/checks.mjs` declares
// each folder as a literal string and only the parser ever guessed.
//
// So the parser stops guessing, the same way it stopped resolving references by name alone:
// every schema's `## File Location` names the folder its type lives in, and that declaration is
// read instead. R9 fixes where to look — for a type with many entities the last folder the path
// names is the type's own, and the `<placeholder>` segments before it are its owners.
const folderTypes = (schemas) => {
  const byFolder = new Map();
  byFolder.names = new Map();
  for (const e of parseSchemas(schemas).entities) {
    const type = e.id.slice("core/".length);
    const location = e.sections.find((s) => s.heading === "File Location");
    const cited = location?.text.match(/`([^`]+)`/)?.[1];
    if (!cited) continue;
    const dirs = cited.split("/").slice(0, -1).filter((d) => !/^<.+>$/.test(d));
    const folder = dirs[dirs.length - 1];
    if (folder) {
      byFolder.set(folder, type);
      // R7 wants the plural on disk. Keeping the singular too is what lets a folder named for
      // the type itself — `value/` where `values/` belongs — still be reported as the R7 it is,
      // rather than collapsing into "no schema declares this folder" with the others.
      byFolder.names.set(type, folder);
    }
  }
  return byFolder;
};

// R11: a list is a block sequence, one entry per line. This read only the bracketed form the
// rule forbids, so a conforming instance had every list silently dropped — the key matched
// with nothing after it and became the empty string, and each `- entry` line matched no key
// and was skipped. Twenty-three of twenty-four experiences in the instance this was extracted
// from carried no skills at all, and the published graph had not one `skills` edge.
//
// Nothing caught it because every fixture in this parser's own tests used the flow form: the
// one shape the parser could read was the one shape the conventions forbid. So the flow form
// is now the error R11 says it is, rather than the only thing that works — a rule this file
// can see is a rule it enforces, which is how R4 has always behaved here.
function parseFrontmatter(lines) {
  if (lines[0] !== "---") return [{}, lines];
  const end = lines.indexOf("---", 1);
  const fields = {};
  const body = lines.slice(1, end);
  for (let i = 0; i < body.length; i++) {
    const m = body[i].match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (raw.startsWith("[")) {
      throw new Error(`R11: \`${key}\` is a flow sequence; a list is one entry per line`);
    }
    if (raw === "") {
      // A key with nothing after it opens a block sequence — or is simply an empty value, in
      // which case no `- ` follows and it stays the empty string it was.
      const items = [];
      while (i + 1 < body.length && /^\s*-\s+/.test(body[i + 1])) {
        items.push(body[++i].replace(/^\s*-\s+/, "").trim());
      }
      fields[key] = items.length ? items : "";
      continue;
    }
    fields[key] = raw.trim();
  }
  return [fields, lines.slice(end + 1)];
}

function parseTable(lines) {
  const cells = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const columns = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  return { columns, rows };
}

function parseBody(lines) {
  let name = "", tagline = "";
  const sections = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    // Split the section's lines into alternating runs of table lines and non-table lines.
    // A non-table run whose last non-blank line ends with ":" and is immediately followed by
    // a table run is that table's caption; the caption line is pulled out of the text.
    const blocks = [];
    let i = 0;
    while (i < cur.lines.length) {
      const isTable = cur.lines[i].trim().startsWith("|");
      const start = i;
      while (i < cur.lines.length && cur.lines[i].trim().startsWith("|") === isTable) i++;
      blocks.push({ isTable, lines: cur.lines.slice(start, i) });
    }
    const tables = [];
    const textLines = [];
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi];
      if (block.isTable) {
        const { columns, rows } = parseTable(block.lines);
        tables.push({ caption: block.caption ?? null, columns, rows });
        continue;
      }
      let lines = block.lines;
      const next = blocks[bi + 1];
      if (next && next.isTable) {
        let idx = -1;
        for (let j = lines.length - 1; j >= 0; j--) {
          if (lines[j].trim() !== "") { idx = j; break; }
        }
        if (idx >= 0 && lines[idx].trim().endsWith(":")) {
          next.caption = lines[idx].trim();
          lines = lines.slice(0, idx).concat(lines.slice(idx + 1));
        }
      }
      textLines.push(...lines);
    }
    // A section always carries its `tables` array (empty when it holds none); `table` — the
    // first table — is a plain enumerable property added only when there is at least one, so
    // it deep-equals and serializes as a normal object either way.
    const section = { heading: cur.heading, text: textLines.join("\n").trim(), tables };
    if (tables.length) section.table = tables[0];
    sections.push(section);
  };
  // R9: the tagline is the first blockquote paragraph before any section, and Markdown reads a
  // run of `>` lines as one paragraph, so every line of the run is joined with a space. A blank
  // line or a bare `>` ends it, and nothing after that joins it.
  let inTagline = false;
  for (const line of lines) {
    if (inTagline && line.startsWith("> ") && line.slice(2).trim()) { tagline += " " + line.slice(2).trim(); continue; }
    inTagline = false;
    if (line.startsWith("# ") && !name) name = line.slice(2).trim();
    else if (line.startsWith("> ") && !tagline && !cur) { tagline = line.slice(2).trim(); inTagline = true; }
    else if (line.startsWith("## ")) { flush(); cur = { heading: line.slice(3).trim(), lines: [] }; }
    else if (cur) cur.lines.push(line);
  }
  flush();
  return { name, tagline, sections };
}

// A path is read pairwise: a folder, then the thing in it. `x.md` in a folder is an entity
// file; a directory `x` is an entity in folder form (its own file is `x/x.md`) and whatever
// follows it is a folder it owns.
function locate(path) {
  const parts = path.split("/");
  const chain = [];              // [{ folder, name, ownerId }]
  // A singular type is one file directly in the container (core 0.4.0, R6/R13): the type is
  // the filename, there is no folder to pluralise, and nothing owns it.
  if (parts.length === 1 && parts[0].endsWith(".md")) {
    const type = parts[0].slice(0, -3);
    const self = { folder: null, name: type, ownerId: null, id: type, isFile: true, type };
    return { chain: [self], self };
  }
  let ownerId = null;
  for (let i = 0; i + 1 < parts.length; i += 2) {
    const folder = parts[i], item = parts[i + 1];
    const isFile = item.endsWith(".md");
    const name = isFile ? item.slice(0, -3) : item;
    const id = (ownerId ? ownerId + "/" : "") + folder + "/" + name;
    chain.push({ folder, name, ownerId, id, isFile });
    if (isFile) return { chain, self: chain[chain.length - 1] };
    if (i + 2 === parts.length - 1 && parts[i + 2] === name + ".md") {
      return { chain, self: chain[chain.length - 1] };
    }
    ownerId = id;
  }
  return null;
}

// `sub` is where these files sit in the repository they came from — `model/` for a company's
// own instance, `example/model/` for the one shipped here. It is prefixed to every entity's
// `path`, which is what a page turns into a link to the file on GitHub. It used to be hardcoded
// to `example/model/`: true of this repository and false of every other instance, so every file
// link on a site whose model sits at `model/` was a 404. The caller knows this and always did —
// it is the same constant it walks the tree with.
export function parseInstance(files, { sub = "", schemas } = {}) {
  // R16 makes the declared type the only thing that decides what a field is, so an instance is
  // read beside its schemas or not at all. Resolving by name alone is not a fallback here; it
  // is the mode this parser no longer has.
  if (!schemas)
    throw new Error(
      "R16: an instance is read against its schemas, and none were given — pass `schemas`, keyed the way parseSchemas reads them (`<type>-schema.md`)",
    );
  const declared = declarationsOf(schemas);
  const typeOfFolder = folderTypes(schemas);
  const entities = [], typeMap = new Map();
  for (const [path, text] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!path.endsWith(".md") || path.split("/").pop() === "README.md") continue;
    const loc = locate(path);
    if (!loc) continue;
    const { self, chain } = loc;
    const type = self.type ?? typeOfFolder.get(self.folder);
    if (!type) {
      const plural = typeOfFolder.names.get(self.folder);
      if (plural) throw new Error(`R7: folder "${self.folder}" is a type's name; the folder is its plural, "${plural}" (${path})`);
      throw new Error(`R13: ${path} sits in "${self.folder}", and no schema declares that folder as its own — a schema's \`## File Location\` is what names it`);
    }
    const ownerType = self.ownerId ? typeOfFolder.get(chain[chain.length - 2].folder) ?? null : null;
    typeMap.set(type, { type, folder: self.folder, owner: ownerType, singular: !self.folder });
    const lines = text.split("\n");
    const [fields, body] = parseFrontmatter(lines);
    const { name, tagline, sections } = parseBody(body);
    entities.push({ id: self.id, type, name, tagline, fields, sections,
                    owner: self.ownerId, path: sub + path });
  }
  entities.sort((a, b) => (a.id < b.id ? -1 : 1));

  // R2: a canonical name identifies an entity within its type, and for an owned type within its
  // owner. So the index is one map per type, and for an owned type one per owner: two processes
  // may each have a phase called Review, two people each a period of one title, and two entities
  // of one name in one owner, or of an unowned type, are the error they always were. Two entities
  // of different types may share one — the company of one, where the identity and the only
  // profile are the same human — and the declared type is what chooses between them.
  const ownerTypeOf = (type) => typeMap.get(type)?.owner ?? null;
  const scopeKey = (type, owner) => (owner ? `${type}\u0000${owner}` : type);
  const byScope = new Map();
  for (const e of entities) {
    const key = scopeKey(e.type, ownerTypeOf(e.type) ? e.owner : null);
    if (!byScope.has(key)) byScope.set(key, new Map());
    const names = byScope.get(key);
    if (names.has(e.name))
      throw new Error(`R2: two ${e.type} entities share the name "${e.name}"${ownerTypeOf(e.type) ? ` in ${e.owner}` : ""}`);
    names.set(e.name, e.id);
  }
  const byId = new Map(entities.map((e) => [e.id, e]));

  // One written value against one declaration, from the entity it is written in. A `ref` and a
  // `qualifier` must resolve (R4, R16); a `ref?` that names nothing of its type stays a fact and
  // returns null. Nothing here looks in any type but the declared one, which is why a name that
  // exists under another type reads as unresolvable rather than ambiguous. A name of an owned type
  // is looked for within the owner the referring entity is, or is owned by (R4): that is where
  // every reference core makes to an owned type is written, so the scope is known and never
  // guessed. Written outside every owner of the type, it has no owner to be resolved in.
  const resolve = (decl, value, where, from) => {
    const ownerType = ownerTypeOf(decl.target);
    let scope = null;
    if (ownerType) {
      if (from.type === ownerType) scope = from.id;
      else if (from.owner && byId.get(from.owner)?.type === ownerType) scope = from.owner;
    }
    const id = ownerType && !scope ? null : byScope.get(scopeKey(decl.target, scope))?.get(value) ?? null;
    if (id) return id;
    if (decl.form === "ref?") return null;
    if (ownerType && !scope)
      throw new Error(`R4: "${value}" in ${where} names no ${decl.target}: a ${decl.target} is named only within the ${ownerType} that owns it`);
    throw new Error(`R4: "${value}" in ${where} names no ${decl.target}${scope ? ` of ${scope}` : ""}`);
  };

  const edges = [];
  for (const e of entities) {
    // R13: a folder under the container is named by a schema, so a page whose type has none is
    // not content and the parser has nothing to read it against.
    const schema = declared.get(e.type);
    if (!schema) throw new Error(`R13: ${e.path} has type ${e.type}, and no schema declares it — the schemas map is keyed \`<type>-schema.md\` with no folder`);

    // R16: a declared reference draws an edge from every page that carries it, a list from
    // every entry, and a field declared anything else — or not declared at all — draws
    // nothing and keeps its value. A `location: Bergen` beside a skill called Bergen is a
    // fact, because the schema said string. A qualifier declared in frontmatter — a shape R9
    // does not allow — still resolves, so a bad name is caught, and still draws nothing.
    for (const [key, value] of Object.entries(e.fields)) {
      const decl = schema.fields.get(key);
      if (!decl) continue;
      const values = Array.isArray(value) ? value : value === "" ? [] : [value];
      for (const v of values) {
        const to = resolve(decl, v, e.path, e);
        if (to && decl.form !== "qualifier") edges.push({ from: e.id, to, via: key, attrs: {} });
      }
    }

    // A body table draws from the one column its schema declares as a reference, wherever it
    // stands; the other declared columns are qualifiers and resolve into the edge's attributes
    // (R16). A table whose schema declares no reference — an Also at, a References — draws
    // nothing and is data, whatever its cells happen to say. A row whose `ref?` column names
    // nothing stays data too; a row whose `ref` column names nothing is the R4 it always was.
    // A cell with nothing in it names nothing, so a declared column that is empty is not
    // resolved and keeps its empty value — the rule frontmatter has always had, where an
    // empty field yields no value to resolve. Whether the cell was allowed to be empty is
    // the schema's Required column, which the checker reads; the parser holds only what it
    // was given. The reference column is not included: a blank there draws no edge anyway,
    // and the R4 says so where the row is.
    for (const s of e.sections) {
      const columns = schema.tables.get(s.heading);
      if (!s.table || !columns) continue;
      const reference = [...columns.entries()].find(([, d]) => d.form !== "qualifier");
      if (!reference) continue;
      const [refName, refDecl] = reference;
      const where = `${e.path} "## ${s.heading}"`;
      for (const row of s.table.rows) {
        const attrs = {};
        let to = null;
        s.table.columns.forEach((col, i) => {
          const cell = row[i] ?? "";
          if (col === refName) { to = resolve(refDecl, cell, where, e); return; }
          const d = columns.get(col);
          attrs[col] = d && cell ? resolve(d, cell, where, e) ?? cell : cell;
        });
        // A reference column the page's header lacks leaves `to` null on every row and
        // draws nothing; the header itself is the column check's business (checks.mjs),
        // not the parser's.
        if (!to) continue;
        edges.push({ from: e.id, to, via: `${s.heading}.${refName}`, attrs });
      }
    }

    // A grouped section draws from its `###` headings (R9, R16). A heading is not a field and
    // not a cell, so until a schema could declare one it drew nothing and R4 was not true of
    // it. The heading's text is the canonical name and resolves against the declared type like
    // any other reference; the section's text is left as written, headings and all, so every
    // consumer that renders it is unchanged. A heading carries nothing to qualify the edge
    // with, so `attrs` is empty.
    //
    // `grouping.decl.form !== "qualifier"` mirrors the frontmatter walk above for the same
    // reason: R9 gives a heading table's one row a Type of `ref → <type>`, but a schema is
    // prose an author can still mistype as `qualifier → <type>`, and a qualifier resolves and
    // draws nothing (R16) wherever it is declared. Without the guard a heading declared that
    // way drew an edge the row it qualifies does not exist to carry.
    for (const s of e.sections) {
      const grouping = schema.headings.get(s.heading);
      if (!grouping) continue;
      const where = `${e.path} "## ${s.heading}"`;
      for (const line of s.text.split("\n")) {
        if (!line.startsWith("### ")) continue;
        const to = resolve(grouping.decl, line.slice(4).trim(), where, e);
        if (to && grouping.decl.form !== "qualifier")
          edges.push({ from: e.id, to, via: `${s.heading}.${grouping.name}`, attrs: {} });
      }
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));

  const types = [...typeMap.values()].sort((a, b) => (a.type < b.type ? -1 : 1));
  // The root of an instance is the company, and core 0.4.0 has an entity for it: `identity`.
  // The page names the root after it and draws the two as one node, so `rootId` travels for
  // the stage to find — which keeps the type's name here, where core's vocabulary is already
  // known, rather than in a renderer that should not have to know it.
  //
  // R6: a company has one identity, so an instance carrying none has no root to name. This
  // returned the string "Fictional Company" before — a plausible-looking answer, and wrong on
  // every instance that is not the example. The parser is not the validator, so it is handed
  // invalid instances; it fails on this one the way it fails on an unresolvable name.
  // Core's vocabulary, resolved once for a renderer that should not have to know it — the
  // same reason `rootId` is computed here rather than in a drawing. `start` and `end` are
  // core's date fields and `kind` names an experience-kind; a renderer places this beside a
  // node and translates it, but has no business knowing which field names carry it. Attached
  // only where something is there to carry, so an entity with none keeps the shape it had.
  for (const e of entities) {
    const pick = (k) => (typeof e.fields[k] === "string" && e.fields[k] ? e.fields[k] : null);
    const stamp = { kind: pick("kind"), start: pick("start"), end: pick("end") };
    if (stamp.kind || stamp.start) e.stamp = stamp;
  }

  const identity = entities.find(e => e.type === "identity");
  if (!identity) throw new Error("R6: the instance has no identity entity to be its root");
  return { commit: null, root: identity.name, rootId: identity.id, types, entities, edges };
}

// A schema's Type cell names one of three forms — `ref → <type>`, `ref? → <type>`,
// `qualifier → <type>` — optionally preceded by `array of `, and may or may not carry
// backticks around the whole thing. Both parseSchemas (the vocabulary graph, below) and
// declarationsOf (what an instance resolves against, after it) read this same cell shape, so
// there is one reader of it: backticks stripped and trimmed before the pattern is tried, so a
// cell written `` `ref → skill` `` and one written `ref → skill` parse alike.
const DECLARATION = /^(?:array of )?(ref\??|qualifier) → (.+)$/;
export function declarationOf(cell) {
  const m = (cell ?? "").replace(/`/g, "").trim().match(DECLARATION);
  return m ? { form: m[1], target: m[2].trim() } : null;
}

// A captioned column table's caption names the section it declares columns for — `` `## Skills`
// is a table with these columns: `` — and both walks below match it the same way.
const SECTION_CAPTION = /^`##\s*([^`]+)`/;

// R9's third declared shape, the grouped section: a table saying what the `###` headings under
// one section name — `` `## Achievements` is grouped under these headings: ``. Both captions
// open by naming a section in backticks, so the words are what separate them and this one is
// matched first everywhere; SECTION_CAPTION is deliberately loose and would swallow it.
const HEADING_CAPTION = /^`##\s*([^`]+)`\s+is grouped under these headings:$/;

// Turns core/ — the vocabulary itself, one *-schema.md file per type — into the same shape.
// A schema file is read by the fixed shape an instance is read by: H1, tagline, `##` sections,
// a `**Owner:**` line before the first section. No schema is consulted to read a schema; R9
// is the floor every schema must clear (Frontmatter and Sections present) for the rest to make
// sense. Edges come only from the tables: a cell in Frontmatter or in a captioned column table
// under Sections that names a type — `ref`, `ref?` or `qualifier` — and the Owner line itself.
export function parseSchemas(files, { sub = "" } = {}) {
  const entities = [];
  for (const [file, text] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!file.endsWith("-schema.md")) continue;
    const type = file.replace(/-schema\.md$/, "");
    const path = sub + file;
    const lines = text.split("\n");
    const [, body] = parseFrontmatter(lines); // core/ files carry no YAML frontmatter
    // Only the preamble — before the first "## " heading — is searched for the Owner line, so
    // a later section's prose that merely mentions "**Owner:**" is never mistaken for one; it
    // stays untouched, ordinary text in that section.
    const headingIdx = body.findIndex(l => l.startsWith("## "));
    const preamble = headingIdx === -1 ? body : body.slice(0, headingIdx);
    const ownerLine = preamble.find(l => l.startsWith("**Owner:**"));
    const owner = ownerLine ? ownerLine.slice("**Owner:**".length).trim() : null;
    const { name, tagline, sections } = parseBody(body);
    const bySection = new Map(sections.map(s => [s.heading, s]));
    if (!bySection.has("Frontmatter") || !bySection.has("Sections")) {
      throw new Error(`R9: ${path} lacks ## Frontmatter or ## Sections`);
    }
    const fields = {};
    if (owner) fields.owner = owner;
    entities.push({ id: "core/" + type, type: "schema", name, tagline, fields, sections,
                    owner: null, path });
  }
  entities.sort((a, b) => (a.id < b.id ? -1 : 1));

  const byType = new Map(entities.map(e => [e.id.slice("core/".length), e.id]));
  const resolveType = (t, where) => {
    if (!byType.has(t)) throw new Error(`R4: "${t}" in ${where} names no schema`);
    return byType.get(t);
  };

  // Every form that names a type, not only the one that draws an edge in an instance. This
  // graph is the vocabulary, so what it shows is which type a declaration points at: a
  // `ref? → <type>` points at one whether or not a given page's value resolves, and a
  // `qualifier → <type>` points at one while drawing no edge of its own in an instance. The
  // declared form travels on the edge, so a reader sees which of the three it is; `attrs.type`
  // keeps the cell as written, backticks and all, since this graph is read by people as well.
  const edges = [];
  for (const e of entities) {
    const frontmatter = e.sections.find(s => s.heading === "Frontmatter");
    if (frontmatter?.table) {
      const { columns, rows } = frontmatter.table;
      const fieldIdx = columns.indexOf("Field"), typeIdx = columns.indexOf("Type");
      for (const row of rows) {
        const cell = row[typeIdx];
        const decl = declarationOf(cell);
        if (!decl) continue;
        const to = resolveType(decl.target, e.path);
        const via = row[fieldIdx].replace(/`/g, "");
        edges.push({ from: e.id, to, via, attrs: { type: cell } });
      }
    }
    const sectionsSection = e.sections.find(s => s.heading === "Sections");
    for (const t of sectionsSection?.tables ?? []) {
      if (!t.caption) continue; // the section's own index table, not a column or heading table
      // A heading table declares one reference for every `###` heading in its section, and a
      // column table one per column, so the two differ only in which column holds the name.
      const grouped = t.caption.match(HEADING_CAPTION);
      const heading = grouped ?? t.caption.match(SECTION_CAPTION);
      if (!heading) continue;
      const colIdx = t.columns.indexOf(grouped ? "Heading" : "Column"), typeIdx = t.columns.indexOf("Type");
      // The loose SECTION_CAPTION is what makes this reachable at all: a caption one word off
      // the grouped form — "is grouped under these heading:" for "headings:" — fails
      // HEADING_CAPTION and falls through to it, so this block sometimes reads a heading
      // table's rows as if they were a column table's. `colIdx` then names a column the
      // header does not have, and a row read at a missing index is `undefined` — reading
      // `.replace` off it threw a bare TypeError naming no path. Neither index found is a
      // caption this file cannot make sense of either way, so the block is skipped rather
      // than read; "schema fixed shape" (verify/check.mjs) is what tells the author the
      // caption is wrong.
      if (colIdx < 0 || typeIdx < 0) continue;
      // R9 gives a heading table exactly one row, because every heading in the section names
      // the same type — a second row would be a second reference a heading table cannot
      // declare. Reading every row here anyway drew a second `Section.Heading` edge for a
      // two-row table while `declarationsOf` below declared only the first row's reference, so
      // the vocabulary graph showed an edge the instance parser never draws. One reader of
      // "how many rows does a heading table have" is what keeps the two answering the same
      // question the same way.
      for (const row of grouped ? t.rows.slice(0, 1) : t.rows) {
        const cell = row[typeIdx];
        const decl = declarationOf(cell);
        if (!decl) continue;
        const to = resolveType(decl.target, e.path);
        const via = `${heading[1]}.${row[colIdx].replace(/`/g, "")}`;
        edges.push({ from: e.id, to, via, attrs: { type: cell } });
      }
    }
    if (e.fields.owner) {
      edges.push({ from: e.id, to: resolveType(e.fields.owner, e.path), via: "owner", attrs: {} });
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));

  return { commit: null, root: CORE_LABEL, rootId: null,
           types: [{ type: "schema", folder: "core", owner: null }], entities, edges };
}

// What every schema declares about the type it describes: per type, `fields` maps a
// frontmatter field to its declaration, `tables` maps a section heading to the declarations of
// its columns, and `headings` maps a grouped section's heading to the declaration of what its
// `###` headings name — `{ name, decl }`, the way a column's declaration carries the column's
// own name beside it. A declaration is `{ form, target }` where `form` is `ref`, `ref?` or
// `qualifier`; a field declared any other way is absent, which is what makes it a fact (R16).
// This walks the same Frontmatter and captioned Sections tables parseSchemas walks to build its
// edges — that walk is still its own, since one builds edges of a graph and the other builds
// declarations an instance resolves against — but every Type cell in both passes through the
// one declarationOf above, so the two readings of a cell can never disagree.
function declarationsOf(schemas) {
  const declared = new Map();
  const bare = (cell) => (cell ?? "").replace(/`/g, "").trim();
  const readInto = (table, keyColumn, into) => {
    const k = table.columns.indexOf(keyColumn), t = table.columns.indexOf("Type");
    if (k < 0 || t < 0) return;
    for (const row of table.rows) {
      const decl = declarationOf(row[t]);
      if (decl) into.set(bare(row[k]), decl);
    }
  };
  for (const e of parseSchemas(schemas).entities) {
    const type = e.id.slice("core/".length);
    const fields = new Map(), tables = new Map(), headings = new Map();
    const frontmatter = e.sections.find((s) => s.heading === "Frontmatter");
    if (frontmatter?.table) readInto(frontmatter.table, "Field", fields);
    for (const t of e.sections.find((s) => s.heading === "Sections")?.tables ?? []) {
      // A grouped section's heading table is read beside the column tables and told apart by
      // its caption. It declares one reference — R9 gives it one row — and the Heading cell is
      // what the edge is called, the way a column's name is.
      const grouped = t.caption?.match(HEADING_CAPTION);
      if (grouped) {
        const k = t.columns.indexOf("Heading"), i = t.columns.indexOf("Type");
        const row = t.rows[0];
        if (k < 0 || i < 0 || !row) continue;
        const decl = declarationOf(row[i]);
        if (decl) headings.set(grouped[1].trim(), { name: bare(row[k]), decl });
        continue;
      }
      const heading = t.caption?.match(SECTION_CAPTION);
      if (!heading) continue;
      const columns = new Map();
      readInto(t, "Column", columns);
      tables.set(heading[1].trim(), columns);
    }
    declared.set(type, { fields, tables, headings });
  }
  return declared;
}
