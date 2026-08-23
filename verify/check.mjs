// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance, and it checks far less than CONVENTIONS.md states. It asserts
// that this repository's own schema files match the fixed shape, that example/ has the
// folder and filename shape the types imply, and that the `skill:` values under
// example/profiles/ resolve. It does not validate example/ against the schemas: no date is
// parsed, no file is checked for the sections its schema requires, an unknown frontmatter
// field passes, and no file under example/values/ is ever read. Every check names the
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
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
  { type: "experience", folder: "profiles/<profile>/experiences", owner: "profile" },
];

// Spec §5: closed for the first release. `ref → <type>` is checked separately because its
// target varies.
export const TYPE_VOCABULARY = new Set(["string", "date", "array", "object array", "enum"]);

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
// line after it. A section may hold more than one table — profile-schema's object-array keys
// sit under ## Frontmatter — and swallowing the second one's header as a data row is exactly
// the kind of silent nonsense this script exists to catch. Rejects tables missing a valid
// GFM separator row (the second line must contain only dashes and pipes).
export function tableOf(body) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim().startsWith("|"));
  if (start === -1) return null;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith("|")) end++;
  return parseTable(lines.slice(start, end));
}

// Parse EVERY contiguous pipe block in a chunk of text, in document order. `## Frontmatter`
// holds more than one whenever a field is typed `object array`: a second table describes
// that field's keys, and it carries the only `ref →` and `enum` this release ships. A block
// that is not a valid table comes back as `null` rather than being dropped, so "malformed"
// and "absent" stay distinguishable at the call site.
export function tablesOf(body) {
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
    out.push(parseTable(lines.slice(i, end)));
    i = end;
  }
  return out;
}

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
          // Every table under the heading, not just the first: the keys table that follows
          // an `object array` field is where the only `ref →` and `enum` live.
          const tables = tablesOf(fmBody);
          if (!tables.length)
            fail(`${path}: "## Frontmatter" has no table and does not say "No YAML frontmatter."`);
          tables.forEach((fm, n) => {
            if (!fm) return fail(`${path}: frontmatter table ${n + 1} is not a table`);
            const [first, ...rest] = fm.columns;
            if (!["Field", "Key"].includes(first) || rest.join("|") !== "Required|Type|Description")
              fail(
                `${path}: frontmatter table ${n + 1} columns are ${fm.columns.join("|")}; must be Field or Key, then Required|Type|Description`,
              );
            else
              for (const row of fm.rows)
                if (!["Yes", "No"].includes(row[1]))
                  fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
          });
        }

        const sec = tableOf(s.get("Sections") ?? "");
        if (!sec) fail(`${path}: "## Sections" has no table`);
        else if (sec.columns.join("|") !== "Section|Required|Description")
          fail(`${path}: sections columns are ${sec.columns.join("|")}`);

        for (const row of sec?.rows ?? [])
          if (!["Yes", "No"].includes(row[1]))
            fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
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
        // Every table under "## Frontmatter", because the keys table of an `object array`
        // field is the only place a `ref →` or an `enum` is declared.
        const tables = tablesOf((sectionsOf(text).get("Frontmatter") ?? "").trim());
        for (const fm of tables)
          for (const row of fm?.rows ?? []) {
            const declared = row[2].replace(/`/g, "").trim();
            const ref = declared.match(/^ref → (.+)$/);
            if (ref) {
              if (!known.has(ref[1]))
                fail(`${path}: ${row[0]} points at unknown type "${ref[1]}"`);
              if (ref[1].endsWith("s"))
                fail(`${path}: ${row[0]} is "ref → ${ref[1]}"; a reference names one entity`);
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
      const skillNames = new Set();
      const skillDir = join(ROOT, "example/skills");
      if (existsSync(skillDir))
        for (const f of readdirSync(skillDir)) {
          const name = h1(`example/skills/${f}`);
          if (!name) fail(`example/skills/${f} has no H1`);
          else if (skillNames.has(name)) fail(`two skills share the canonical name "${name}"`);
          else skillNames.add(name);
        }

      const LEVELS = new Set(["beginner", "medior", "senior"]);
      const walk = (rel) => {
        const p = join(ROOT, rel);
        if (!existsSync(p)) return;
        for (const entry of readdirSync(p)) {
          const child = `${rel}/${entry}`;
          if (statSync(join(ROOT, child)).isDirectory()) walk(child);
          else if (entry.endsWith(".md")) {
            const text = read(child) ?? "";
            for (const m of text.matchAll(/^\s*-\s+skill:\s*(.+?)\s*$/gm))
              if (!skillNames.has(m[1]))
                fail(`${child}: skill "${m[1]}" resolves to nothing in example/skills/`);
            for (const m of text.matchAll(/^\s*level:\s*(.+?)\s*$/gm))
              if (!LEVELS.has(m[1]))
                fail(`${child}: level "${m[1]}" is not beginner, medior or senior`);
            const bare = text.match(/^skills:\s*\[(.+?)\]\s*$/m);
            if (bare)
              for (const raw of bare[1].split(",")) {
                const name = raw.trim().replace(/^["']|["']$/g, "");
                if (!skillNames.has(name))
                  fail(`${child}: skill "${name}" resolves to nothing in example/skills/`);
              }
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
