// Turns one instance — a map of path → Markdown — into the graph the example page draws.
//
// It reads the fixed shape and nothing else: YAML frontmatter as key/scalar or key/list, the
// H1 as the canonical name, the `>` tagline, `##` sections as heading plus text, a table by its
// header row. No schema is consulted. Types are folder names singularised by R7, ownership is
// nesting on disk (R5, R6), and every edge is a name in a file that resolves to another file's
// H1 — a name that resolves to nothing is an R4 error here, so the page can never draw a line
// to nowhere. CONVENTIONS.md in companygraph/meta-model is the source of the rule numbers.
//
// Pure: no filesystem, no network, so verify/instance.test.mjs can feed it fixture maps.

// The fallback when an instance names no company. Core 0.4.0 gave it a way to: `identity` is
// one entity in the container whose H1 is the company's name, so the root reads it and this
// string is used only by an instance that predates the type or leaves it out. Before that,
// nothing in an instance named the company — the name lived in a repository folder, which is
// what R2 and R3 exist to keep out of a path.
export const ROOT_LABEL = "Fictional Company";

// The one invented string of the model page — nothing in core/ names the vocabulary itself.
export const CORE_LABEL = "Core";

const singular = (folder) => {
  if (folder.endsWith("ies")) return folder.slice(0, -3) + "y";
  if (folder.endsWith("s")) return folder.slice(0, -1);
  return null;
};

function parseFrontmatter(lines) {
  if (lines[0] !== "---") return [{}, lines];
  const end = lines.indexOf("---", 1);
  const fields = {};
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, raw] = m;
    fields[key] = raw.startsWith("[")
      ? raw.slice(1, raw.lastIndexOf("]")).split(",").map(s => s.trim()).filter(Boolean)
      : raw.trim();
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
  for (const line of lines) {
    if (line.startsWith("# ") && !name) name = line.slice(2).trim();
    else if (line.startsWith("> ") && !tagline && !cur) tagline = line.slice(2).trim();
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

export function parseInstance(files) {
  const entities = [], typeMap = new Map();
  for (const [path, text] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!path.endsWith(".md") || path.split("/").pop() === "README.md") continue;
    const loc = locate(path);
    if (!loc) continue;
    const { self, chain } = loc;
    const type = self.type ?? singular(self.folder);
    if (!type) throw new Error(`R7: folder "${self.folder}" is not the plural of a type (${path})`);
    const ownerType = self.ownerId ? singular(chain[chain.length - 2].folder) : null;
    typeMap.set(type, { type, folder: self.folder, owner: ownerType, singular: !self.folder });
    const lines = text.split("\n");
    const [fields, body] = parseFrontmatter(lines);
    const { name, tagline, sections } = parseBody(body);
    entities.push({ id: self.id, type, name, tagline, fields, sections,
                    owner: self.ownerId, path: "example/model/" + path });
  }
  entities.sort((a, b) => (a.id < b.id ? -1 : 1));

  // A canonical name identifies an entity within its type, not across all of them. Every
  // schema declares its references as `ref → <type>`, so a reference always names a type as
  // well as a name; two entities of different types may therefore share one. This matters
  // for the case the fictional example cannot show: a company of one, where the company and
  // the only person in it are the same human and carry the same name.
  //
  // This parser does not read the schemas, so it cannot see the declared type of a field —
  // it recognises a reference by the value happening to be a canonical name. It therefore
  // cannot use the type to disambiguate, and instead refuses to guess: a name shared inside
  // one type is an error at parse time, and a reference to a name carried by more than one
  // type is an error where it is used. Nothing resolves to the wrong entity quietly.
  const byId = (list, id) => list.find((x) => x.id === id);
  const byName = new Map();
  for (const e of entities) {
    const same = byName.get(e.name);
    if (same) {
      const clash = same.find((id) => byId(entities, id).type === e.type);
      if (clash) throw new Error(`R2: two ${e.type} entities share the name "${e.name}"`);
      same.push(e.id);
    } else {
      byName.set(e.name, [e.id]);
    }
  }
  const one = (value, where) => {
    const ids = byName.get(value);
    if (!ids) return null;
    if (ids.length > 1) {
      const types = ids.map((id) => byId(entities, id).type).join(", ");
      throw new Error(`"${value}" in ${where} is carried by more than one type (${types}); ` +
                      `this parser resolves by name alone and will not guess between them`);
    }
    return ids[0];
  };
  const resolve = (value, where) => {
    const id = one(value, where);
    if (!id) throw new Error(`R4: "${value}" in ${where} names no entity`);
    return id;
  };

  const edges = [];
  for (const e of entities) {
    for (const [key, value] of Object.entries(e.fields)) {
      // A list names entities and every item must resolve (R4). A scalar is a reference only
      // when it happens to be a canonical name — `source: Local` is one, `location: Bergen` is
      // not — so it becomes an edge when it resolves and stays a fact when it does not.
      if (Array.isArray(value)) {
        for (const v of value) edges.push({ from: e.id, to: resolve(v, e.path), via: key, attrs: {} });
      } else {
        const to = one(value, e.path);
        if (to) edges.push({ from: e.id, to, via: key, attrs: {} });
      }
    }
    for (const s of e.sections) {
      if (!s.table) continue;
      for (const row of s.table.rows) {
        let to = null; const attrs = {}; let via = "";
        s.table.columns.forEach((col, i) => {
          const cell = row[i] ?? "";
          const resolved = one(cell, e.path);
          if (resolved && !to) { to = resolved; via = `${s.heading}.${col}`; }
          else attrs[col] = resolved ?? cell;
        });
        if (!to) throw new Error(`R4: row "${row[0]}" in ${e.path} names no entity`);
        edges.push({ from: e.id, to, via, attrs });
      }
    }
  }
  edges.sort((a, b) => (a.from + a.via + a.to < b.from + b.via + b.to ? -1 : 1));

  const types = [...typeMap.values()].sort((a, b) => (a.type < b.type ? -1 : 1));
  // The root of an instance is the company, and core 0.4.0 has an entity for it: `identity`.
  // The page names the root after it and draws the two as one node, so `rootId` travels for
  // the stage to find — which keeps the type's name here, where core's vocabulary is already
  // known, rather than in a renderer that should not have to know it.
  const identity = entities.find(e => e.type === "identity");
  return { commit: null, root: identity ? identity.name : ROOT_LABEL,
           rootId: identity ? identity.id : null, types, entities, edges };
}

// Turns core/ — the vocabulary itself, one *-schema.md file per type — into the same shape.
// A schema file is read by the fixed shape an instance is read by: H1, tagline, `##` sections,
// a `**Owner:**` line before the first section. No schema is consulted to read a schema; R9
// is the floor every schema must clear (Frontmatter and Sections present) for the rest to make
// sense. Edges come only from the tables: a ref → cell in Frontmatter, a ref → cell in a
// captioned column table under Sections, and the Owner line itself.
export function parseSchemas(files) {
  const entities = [];
  for (const [file, text] of [...files.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (!file.endsWith("-schema.md")) continue;
    const type = file.replace(/-schema\.md$/, "");
    const path = "core/" + file;
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

  const refPattern = /^(?:array of )?ref → (.+)$/;
  const edges = [];
  for (const e of entities) {
    const frontmatter = e.sections.find(s => s.heading === "Frontmatter");
    if (frontmatter?.table) {
      const { columns, rows } = frontmatter.table;
      const fieldIdx = columns.indexOf("Field"), typeIdx = columns.indexOf("Type");
      for (const row of rows) {
        const cell = row[typeIdx];
        const m = cell.match(refPattern);
        if (!m) continue;
        const to = resolveType(m[1], e.path);
        const via = row[fieldIdx].replace(/`/g, "");
        edges.push({ from: e.id, to, via, attrs: { type: cell } });
      }
    }
    const sectionsSection = e.sections.find(s => s.heading === "Sections");
    for (const t of sectionsSection?.tables ?? []) {
      if (!t.caption) continue; // the section's own index table, not a column table
      const heading = t.caption.match(/^`##\s*([^`]+)`/);
      if (!heading) continue;
      const colIdx = t.columns.indexOf("Column"), typeIdx = t.columns.indexOf("Type");
      for (const row of t.rows) {
        const cell = row[typeIdx];
        const m = cell.match(refPattern);
        if (!m) continue;
        const to = resolveType(m[1], e.path);
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
