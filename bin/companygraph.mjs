#!/usr/bin/env node
// The CompanyGraph tooling: making an instance, and the checks over one. Subcommands, each
// exiting non-zero on any problem and writing nothing when its pre-flight fails:
//
//   companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--name <instance>] [--schemas <dir>]
//   companygraph check [<folder>]
//   companygraph upgrade [<folder>] [--core <tag>] [--force] [--dry-run]
//
// `bin/check-instance.mjs` keeps its own path, because the reusable workflow and every
// instance's CI call it there; `check` is a second door to the same code.
import { createInterface } from "node:readline/promises";
import { readdirSync, readFileSync, existsSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, initPlan, upgradePlan } from "../lib/plan.mjs";
import { writePlan } from "../lib/write.mjs";
import { fetchCore } from "../lib/fetch-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

const USAGE = `companygraph <command>

  init [<folder>]     write a new instance, or add one to this folder with --here
  check [<folder>]    the mechanical checks over an instance
  upgrade [<folder>]  move an instance's vendored core, manifest and workflow tag together

init: --here  --agent <${AGENTS.join("|")}>  --core <tag>  --name <instance>  --schemas <dir>
upgrade: --core <tag>  --force  --dry-run
`;

// The core inside this release, which is what `init` vendors unless a tag says otherwise.
// Recursive, to match `extractCore`: `core/` is flat today, but a future subfolder must not be
// dropped from a bundled init while a fetched one keeps it.
export function coreOfThisRelease() {
  const from = join(HERE, "..", "core");
  const files = new Map();
  const walk = (rel) => {
    for (const entry of readdirSync(join(from, rel || "."), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else files.set(child, readFileSync(join(from, child), "utf8"));
    }
  };
  walk("");
  return files;
}

// Toggles carry no value; `upgrade` also reads --force and --dry-run, so both are named here
// once rather than teaching this parser about them a second time. Everything else takes a value,
// and a value that is missing or looks like another flag is refused by name rather than silently
// eaten or handed to a prompt further down.
const TOGGLES = new Set(["here", "force", "dry-run"]);

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const name = arg.slice(2);
    if (TOGGLES.has(name)) { out[name] = true; continue; }
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    if (value.startsWith("--")) throw new Error(`--${name} needs a value, not ${value}`);
    out[name] = value;
    i++;
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
  // Walked once: the pre-flight guard and the plan's own conflict check both need it, and a
  // repository is not read twice for the price of one decision.
  const found = present(root);
  if (!given.here && found.size > 0)
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
    present: found,
    fetched: Boolean(given.core),
  });
  if (plan.refused) throw new Error(plan.refused);
  const written = writePlan(root, plan.writes);
  console.log(`${written.length} files written into ${root}`);
  console.log(`  core ${JSON.parse(core.get("manifest.json")).version}, vendored under ${given.schemas ?? "meta"}/core/`);
  console.log(`  the model is empty but for its README files, its source and its two singular entities`);
  console.log(`  run "npx companygraph-meta-model check ${root}" whenever it changes`);
}

async function upgrade(argv) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  const manifestPath = join(root, ".companygraph/manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`${root} is no instance: it has no .companygraph/manifest.json.`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`${manifestPath} could not be read as JSON: ${error.message}`);
  }
  const held = new Map();
  for (const path of Object.keys(manifest.files ?? {}))
    if (existsSync(join(root, path))) held.set(path, readFileSync(join(root, path), "utf8"));
  const workflowPath = join(root, ".github/workflows/companygraph.yml");
  const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : null;
  const tag = given.core ?? `v${PACKAGE.version}`;
  const core = given.core ? await fetchCore(given.core) : coreOfThisRelease();
  const plan = upgradePlan({
    core,
    tooling: PACKAGE.version,
    tag,
    manifest,
    held,
    workflow,
    fetched: Boolean(given.core),
    force: Boolean(given.force),
  });
  if (plan.refused) throw new Error(plan.refused);
  if (plan.writes.size === 0 && plan.removes.length === 0) {
    console.log(`already on core ${plan.to}; nothing to do.`);
    return;
  }
  if (given["dry-run"]) {
    console.log(`core ${plan.from} → ${plan.to}, if this runs:`);
    for (const path of plan.writes.keys()) console.log(`  write   ${path}`);
    for (const path of plan.removes) console.log(`  remove  ${path}`);
    return;
  }
  // Belt and braces, beside the plan's own refusal of anything a manifest names outside its own
  // core: a plan is data, a delete cannot be undone, and this is checked before a single file
  // moves rather than trusting that the refusal above can never have a gap of its own.
  const rootResolved = resolve(root);
  for (const path of plan.removes) {
    const target = resolve(root, path);
    if (target !== rootResolved && !target.startsWith(rootResolved + sep))
      throw new Error(`upgrade refuses to remove ${path}: it resolves outside ${root}, and nothing was written.`);
  }

  const written = writePlan(root, plan.writes);
  for (const path of plan.removes) rmSync(join(root, path), { force: true });
  console.log(`core ${plan.from} → ${plan.to}: ${written.length} written, ${plan.removes.length} removed`);
  if (plan.edited.length) console.log(`  overwritten, as --force asked: ${plan.edited.join(", ")}`);
  // A release can make a valid instance invalid, so the instance is checked where it now stands
  // and told what it owes; the upgrade is not undone by it, and neither is it reported as having
  // failed. The files are the release's; the work the check names is the owner's to do. checkPath
  // can itself throw — a fetched core newer than this checker is exactly the pin guard `check`
  // already refuses on, and an upgrade that lands one is not a reason to hide that the upgrade
  // stood: the throw is caught here, printed the way a guard failure always is, and does not
  // reach the top-level handler, which would print it bare and say nothing about the upgrade.
  const { checkPath } = await import("./check-instance.mjs");
  try {
    const owed = checkPath(root);
    if (owed > 0)
      console.log(`  the upgrade stands; ${owed} problem${owed === 1 ? "" : "s"} above ${owed === 1 ? "is" : "are"} the model's to fix`);
  } catch (error) {
    console.error(`✗ ${error.message}`);
    console.log("  the upgrade stands; the check above could not be run");
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "init") await init(rest);
  else if (command === "upgrade") await upgrade(rest);
  else if (command === "check") {
    // A second door to the same code, so a guard failure must read exactly as it does through
    // check-instance.mjs's own direct run — the "✗ " prefix and all — not as a generic CLI error.
    const { checkPath } = await import("./check-instance.mjs");
    try {
      if (checkPath(rest[0] ?? ".") > 0) process.exit(1);
    } catch (error) {
      console.error(`✗ ${error.message}`);
      process.exit(1);
    }
  } else if (command === "--help" || command === "-h" || command === undefined) console.log(USAGE);
  else throw new Error(`${command} is no command of this tooling.\n\n${USAGE}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
