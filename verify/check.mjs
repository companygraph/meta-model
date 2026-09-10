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
// prevents such a file: "the container holds what the types imply" rejects an unknown folder at the top of example/
// and states what a profile's folder must contain, not what else may sit inside it, so
// example/profiles/<profile>/notes/x.md is reachable today and its frontmatter goes unread.
// Failing on it would invent a rule CONVENTIONS.md does not state. Every check names the
// CONVENTIONS.md rule it enforces, and a meta-check fails if that rule is missing — so the
// script and the prose cannot drift apart silently.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { TYPES, MODEL, TYPE_VOCABULARY, sectionsOf, tableOf, tablesOf, blocksOf, instanceChecks } from "../lib/checks.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EX = `example/${MODEL}`;

const failures = [];
export const fail = (msg) => failures.push(msg);

export const read = (rel) =>
  existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), "utf8") : null;

// The tree under these paths as the map the instance checks take: every file, not only the
// Markdown, because a stray file is one of their findings and a map that dropped it would hide
// what that check exists to see.
function filesUnder(...roots) {
  const files = new Map();
  const walk = (rel) => {
    const p = join(ROOT, rel);
    if (!existsSync(p)) return;
    for (const entry of readdirSync(p)) {
      const child = `${rel}/${entry}`;
      if (statSync(join(ROOT, child)).isDirectory()) walk(child);
      else files.set(child, readFileSync(join(ROOT, child), "utf8"));
    }
  };
  for (const root of roots) walk(root);
  return files;
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
        // is not marked fails. Neither degrades to silence, because "the instance is held to
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
            // it here is what makes the singular `ref → <type>` that "the instance is held to
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
    ...instanceChecks({ files: filesUnder(EX, `core`), core: `core`, model: EX, fail }),
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
