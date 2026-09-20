#!/usr/bin/env node
// The CompanyGraph tooling: making an instance, and the checks over one. Subcommands, each
// exiting non-zero on any problem and writing nothing when its pre-flight fails:
//
//   companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--name <instance>] [--schemas <dir>]
//   companygraph check [<folder>]
//
// `bin/check-instance.mjs` keeps its own path, because the reusable workflow and every
// instance's CI call it there; `check` is a second door to the same code.
import { createInterface } from "node:readline/promises";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, initPlan } from "../lib/plan.mjs";
import { writePlan } from "../lib/write.mjs";
import { fetchCore } from "../lib/fetch-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

const USAGE = `companygraph <command>

  init [<folder>]   write a new instance, or add one to this folder with --here
  check [<folder>]  the mechanical checks over an instance

init: --here  --agent <${AGENTS.join("|")}>  --core <tag>  --name <instance>  --schemas <dir>
`;

// The core inside this release, which is what `init` vendors unless a tag says otherwise.
export function coreOfThisRelease() {
  const from = join(HERE, "..", "core");
  const files = new Map();
  for (const name of readdirSync(from)) {
    const full = join(from, name);
    if (statSync(full).isFile()) files.set(name, readFileSync(full, "utf8"));
  }
  return files;
}

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const name = arg.slice(2);
    if (name === "here") out.here = true;
    else out[name] = argv[++i];
  }
  return out;
}

// Everything the target folder holds, for the plan's pre-flight; nothing is read of what it says.
function present(root) {
  const found = new Set();
  const walk = (base) => {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const full = join(base, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) walk(full);
      else found.add(relative(root, full));
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function init(argv) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  if (!given.here && existsSync(root) && present(root).size > 0)
    throw new Error(`${root} is not empty; pass --here to add an instance to it.`);
  const agent = given.agent ?? (AGENTS.length === 1 ? AGENTS[0] : await ask(`Which agent? (${AGENTS.join(", ")}) `));
  const name = given.name ?? (await ask("What is this instance called? "));
  const tag = given.core ?? `v${PACKAGE.version}`;
  const core = given.core ? await fetchCore(given.core) : coreOfThisRelease();
  const plan = initPlan({
    core,
    tooling: PACKAGE.version,
    tag,
    name,
    agent,
    units: given.schemas ?? "meta",
    present: present(root),
    fetched: Boolean(given.core),
  });
  if (plan.refused) throw new Error(plan.refused);
  const written = writePlan(root, plan.writes);
  console.log(`${written.length} files written into ${root}`);
  console.log(`  core ${JSON.parse(core.get("manifest.json")).version}, vendored under ${given.schemas ?? "meta"}/core/`);
  console.log(`  the model is empty but for its README files, its source and its two singular entities`);
  console.log(`  run "npx companygraph-meta-model check ${root}" whenever it changes`);
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "init") await init(rest);
  else if (command === "check") {
    const { checkPath } = await import("./check-instance.mjs");
    if (checkPath(rest[0] ?? ".") > 0) process.exit(1);
  } else if (command === "--help" || command === "-h" || command === undefined) console.log(USAGE);
  else throw new Error(`${command} is no command of this tooling.\n\n${USAGE}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
