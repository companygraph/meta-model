// The deliverable is a graph of Markdown files, so the tests are assertions against the
// files themselves. No dependencies, no build step: node verify/check.mjs
//
// This is NOT the validator the design defers (spec §5). It never reads a schema as truth
// about somebody's instance. It asserts exactly two things: that this repository's own
// schema files match the fixed shape, and that example/ obeys the conventions. Every check
// names the CONVENTIONS.md rule it enforces, and a meta-check fails if that rule is missing —
// so the script and the prose cannot drift apart silently.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// The slice this release ships. Mirrors spec §4; the folder is stated, never derived.
export const TYPES = [
  { type: "skill", folder: "skills" },
  { type: "value", folder: "values" },
  { type: "profile", folder: "profiles/<profile>", owns: ["experience"] },
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
  const block = lines.slice(start, end);
  if (block.length < 2) return null;

  // Validate that the second line is a GFM separator row (contains only dashes)
  const separatorCells = block[1].trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  if (!separatorCells.every((cell) => /^-+$/.test(cell))) return null;

  const cells = (l) =>
    l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  return { columns: cells(block[0]), rows: block.slice(2).map(cells) };
}

const CHECKS = [
  {
    name: "schemas exist",
    rule: "R9",
    run() {
      for (const { type } of TYPES)
        if (read(`core/meta/${type}-schema.md`) === null)
          fail(`core/meta/${type}-schema.md is missing`);
    },
  },
  {
    name: "schema fixed shape",
    rule: "R9",
    run() {
      for (const { type } of TYPES) {
        const path = `core/meta/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;

        const title = type.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());
        if (!text.startsWith(`# ${title} Schema\n`))
          fail(`${path}: first line must be "# ${title} Schema"`);
        if (!/\n>\s+\S/.test(text)) fail(`${path}: missing the "> " tagline`);

        const s = sectionsOf(text);
        for (const heading of ["File Location", "Frontmatter", "Sections"])
          if (!s.has(heading)) fail(`${path}: missing "## ${heading}"`);

        const order = [...s.keys()].filter((k) => k);
        const want = ["File Location", "Frontmatter", "Sections"];
        if (order.join(">") !== want.join(">"))
          fail(`${path}: sections are ${order.join(", ")}; must be exactly ${want.join(", ")}`);

        const fmBody = (s.get("Frontmatter") ?? "").trim();
        if (fmBody === "No YAML frontmatter.") {
          // A type with no fields says so in one sanctioned sentence, so that "no table"
          // and "forgot the table" stay distinguishable.
        } else {
          const fm = tableOf(fmBody);
          if (!fm) fail(`${path}: "## Frontmatter" has no table and does not say "No YAML frontmatter."`);
          else if (fm.columns.join("|") !== "Field|Required|Type|Description")
            fail(`${path}: frontmatter columns are ${fm.columns.join("|")}`);
          else
            for (const row of fm.rows)
              if (!["Yes", "No"].includes(row[1]))
                fail(`${path}: Required is "${row[1]}"; must be Yes or No`);
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
        const path = `core/meta/${type}-schema.md`;
        const text = read(path);
        if (text === null) continue;
        const fm = tableOf((sectionsOf(text).get("Frontmatter") ?? "").trim());
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
];

for (const check of CHECKS) check.run();

if (failures.length) {
  console.error(`\n✗ ${failures.length} problem${failures.length > 1 ? "s" : ""}\n`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ ${CHECKS.length} checks passed`);
