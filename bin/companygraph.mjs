#!/usr/bin/env node
// The CompanyGraph tooling: making an instance, and the checks over one. Subcommands, each
// exiting non-zero on any problem and writing nothing when its pre-flight fails:
//
//   companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--name <instance>] [--schemas <dir>] [--folders <a,b>]
//   companygraph check [<folder>]
//   companygraph upgrade [<folder>] [--core <tag>] [--force] [--dry-run]
//   companygraph obsidian [<vault>] [--release <tag>] [--from <dir>]
//
// Run with no command at a terminal, it opens a menu over the same four, which asks what the
// flags would say and calls the same code.
//
// `bin/check-instance.mjs` keeps its own path, because the reusable workflow and every
// instance's CI call it there; `check` is a second door to the same code.
import { createInterface } from "node:readline/promises";
import { readdirSync, readFileSync, existsSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, SKILLS, initPlan, upgradePlan } from "../lib/plan.mjs";
import { writePlan } from "../lib/write.mjs";
import { fetchCore } from "../lib/fetch-core.mjs";
import { download, installed, newestRelease, place, readLocal } from "../lib/obsidian.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

const USAGE = `companygraph [<command>]

  (none)              at a terminal, a menu over the four below
  init [<folder>]     write a new instance, or add one to this folder with --here
  check [<folder>]    the mechanical checks over an instance
  upgrade [<folder>]  move an instance's vendored core, skills, manifest and workflow tag together
  obsidian [<vault>]  install the Obsidian plugin's newest release in a vault, or update it there

init: --here  --agent <${AGENTS.join("|")}>  --core <tag>  --name <instance>  --schemas <dir>  --folders <a,b>
upgrade: --core <tag>  --force  --dry-run
obsidian: --release <tag>  --from <dir>
`;

// Every file under a folder of this release, keyed by its path inside that folder. Recursive, to
// match `extractCore`: `core/` is flat today, but a future subfolder must not be dropped from a
// bundled init while a fetched one keeps it. Not exported: importing this module runs the argv
// dispatcher at the foot of the file, so nothing outside it could ever call this anyway.
function filesOfThisRelease(folder) {
  const from = join(HERE, "..", folder);
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

// The core inside this release, which is what `init` vendors unless a tag says otherwise.
const coreOfThisRelease = () => filesOfThisRelease("core");

// The agent's skills always come from the release that runs, whatever core is vendored: they are
// the tooling's, and they read the rules from the instance's own core rather than carrying them.
const skillsFor = (agent) => filesOfThisRelease(`agents/${agent}/skills`);

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

// One reader over stdin for the whole run, and the lines it reads kept until a question takes
// them: a reader opened per question drops what the one before it had already buffered, which is
// every answer after the first when the answers are piped in. At the end of the input a question
// is answered with nothing, so a menu run from a pipe ends rather than waits.
let reader = null;
const lines = [];
const waiting = [];
function ask(question) {
  if (!reader) {
    reader = createInterface({ input: process.stdin });
    reader.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
    reader.on("close", () => { while (waiting.length) waiting.shift()(""); });
  }
  process.stdout.write(question);
  if (lines.length) return Promise.resolve(lines.shift().trim());
  if (reader.closed) return Promise.resolve("");
  return new Promise((done) => waiting.push(done)).then((line) => line.trim());
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
    skills: skillsFor(agent),
    tooling: PACKAGE.version,
    tag,
    name,
    agent,
    units: given.schemas ?? "meta",
    // A comma-separated list of root folders; absent means every one core declares.
    folders: given.folders?.split(",").map((f) => f.trim()).filter(Boolean),
    present: found,
    fetched: Boolean(given.core),
  });
  if (plan.refused) throw new Error(plan.refused);
  const written = writePlan(root, plan.writes);
  console.log(`${written.length} files written into ${root}`);
  console.log(`  written for ${agent}, with the companygraph-validate, -export and -surface skills; export and surface need Python 3`);
  console.log(`  core ${JSON.parse(core.get("manifest.json")).version}, vendored under ${given.schemas ?? "meta"}/core/`);
  const folders = [...plan.writes.keys()].filter((p) => /^model\/[^/]+\/README\.md$/.test(p)).map((p) => p.split("/")[1]);
  console.log(`  folders: ${folders.join(", ")}`);
  console.log(`  the model is empty but for its README files, its source and its two singular entities`);
  console.log(`  run "npx github:companygraph/meta-model#v${PACKAGE.version} check ${root}" whenever it changes`);
  console.log(`  and "npx github:companygraph/meta-model#v${PACKAGE.version} obsidian ${root}" to write it in Obsidian`);
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
  // The skills this release would write, read where they already exist, so the plan can tell a
  // file this tooling wrote from one the instance wrote under the same name.
  const skills = skillsFor("claude");
  for (const path of skills.keys()) {
    const at = `${SKILLS}${path}`;
    if (!held.has(at) && existsSync(join(root, at))) held.set(at, readFileSync(join(root, at), "utf8"));
  }
  const workflowPath = join(root, ".github/workflows/companygraph.yml");
  const workflow = existsSync(workflowPath) ? readFileSync(workflowPath, "utf8") : null;
  const tag = given.core ?? `v${PACKAGE.version}`;
  const core = given.core ? await fetchCore(given.core) : coreOfThisRelease();
  const plan = upgradePlan({
    core,
    skills,
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
    return "nothing";
  }
  if (given["dry-run"]) {
    console.log(`core ${plan.from} → ${plan.to}, if this runs:`);
    for (const path of plan.writes.keys()) console.log(`  write   ${path}`);
    for (const path of plan.removes) console.log(`  remove  ${path}`);
    return "planned";
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
  // Edited and missing are both --force taking a vendored file the instance no longer held as
  // this tooling wrote it, but only the first was a file to overwrite; the second was not there
  // to overwrite, so it is written fresh instead, and the two are named apart so neither claim is
  // said of a file it does not fit.
  if (plan.edited.length) console.log(`  overwritten, as --force asked: ${plan.edited.join(", ")}`);
  // A file the instance had deleted is written fresh only where the new core still ships it; one
  // the new core has dropped as well is not written at all, and saying so is the difference
  // between naming what happened and naming what was planned.
  const rewritten = plan.missing.filter((path) => plan.writes.has(path));
  const dropped = plan.missing.filter((path) => !plan.writes.has(path));
  if (rewritten.length) console.log(`  written fresh, as --force asked, though the instance no longer had them: ${rewritten.join(", ")}`);
  if (dropped.length) console.log(`  gone from the instance already, and gone from this core too: ${dropped.join(", ")}`);
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
  return "done";
}

// Installs or updates, which are one act: the three files written over whatever release was there,
// and the plugin switched on if it was not. A vault that is not an instance takes the plugin too,
// since the plugin's own `Make this vault an instance` is one way to make one.
async function obsidian(argv) {
  const given = flags(argv);
  const vault = given._[0] ?? ".";
  const now = installed(vault);
  let files;
  if (given.from) files = readLocal(given.from);
  else {
    const release = given.release ?? (await newestRelease());
    if (now.release === release && now.enabled) {
      console.log(`CompanyGraph ${release}, the ${given.release ? "release asked for" : "newest release"}, is installed and switched on in ${vault}; nothing to do.`);
      return;
    }
    files = await download(release);
  }
  const done = place(vault, files);
  const moved = done.from === null ? `CompanyGraph ${done.to} installed` : done.from === done.to ? `CompanyGraph ${done.to} written again` : `CompanyGraph ${done.from} → ${done.to}`;
  console.log(`${moved} in ${done.folder}${done.enabled ? ", and switched on" : ""}`);
  console.log("  open the vault in Obsidian and trust its author when asked; a vault Obsidian has open already takes it on Reload app without saving");
}

async function check(argv) {
  // A second door to the same code, so a guard failure must read exactly as it does through
  // check-instance.mjs's own direct run — the "✗ " prefix and all — not as a generic CLI error.
  const { checkPath } = await import("./check-instance.mjs");
  try {
    return checkPath(argv[0] ?? ".") > 0 ? 1 : 0;
  } catch (error) {
    console.error(`✗ ${error.message}`);
    return 1;
  }
}

// A path as a person types it at the prompt, where no shell expands `~` first.
const typed = (answer) => (answer === "~" || answer.startsWith("~/") ? join(homedir(), answer.slice(1)) : answer);
const yes = (answer) => /^y(es)?$/i.test(answer);

async function folder(question, fallback) {
  const answer = typed(await ask(fallback ? `${question} (Enter for ${fallback}) ` : `${question} `));
  if (answer) return answer;
  if (fallback) return fallback;
  throw new Error("no folder was given; nothing was done.");
}

async function menu() {
  const entries = [
    ["Make a model", async () => {
      const root = await folder("Which folder? A path; it is made if it is missing.");
      const args = [root];
      if (existsSync(root) && statSync(root).isDirectory() && readdirSync(root).some((entry) => entry !== ".git")) {
        if (!yes(await ask("It holds files already. Add the model beside them? (y/N) "))) return 0;
        args.push("--here");
      }
      await init(args);
      if (yes(await ask("Install the Obsidian plugin in it, to write it in Obsidian? (y/N) "))) await obsidian([root]);
      return 0;
    }],
    ["Check a model", async () => check([await folder("Which folder?", ".")])],
    [`Move a model to this release, ${PACKAGE.version}`, async () => {
      const root = await folder("Which folder?", ".");
      if ((await upgrade([root, "--dry-run"])) !== "planned") return 0;
      if (yes(await ask("Go ahead? (y/N) "))) await upgrade([root]);
      return 0;
    }],
    ["Install or update the Obsidian plugin in a vault", async () => {
      await obsidian([await folder("Which vault?", ".")]);
      return 0;
    }],
  ];
  console.log(`CompanyGraph tooling ${PACKAGE.version}\n`);
  entries.forEach(([label], i) => console.log(`  ${i + 1}  ${label}`));
  const pick = await ask(`\nWhich one? (1-${entries.length}, Enter to leave) `);
  if (!pick) return 0;
  const entry = entries[Number(pick) - 1];
  if (!entry || !/^\d+$/.test(pick)) throw new Error(`${pick} is not one of 1-${entries.length}; nothing was done.`);
  return entry[1]();
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "init") await init(rest);
  else if (command === "upgrade") await upgrade(rest);
  else if (command === "obsidian") await obsidian(rest);
  else if (command === "check") process.exitCode = await check(rest);
  // The menu is for a person at a terminal; a bare run anywhere else, a pipe or a CI step, prints
  // what the tooling can do, as it always did. `menu` asks for it by name, which is how the menu
  // is tested with its answers piped in.
  else if (command === "menu" || (command === undefined && process.stdin.isTTY && process.stdout.isTTY)) process.exitCode = await menu();
  else if (command === "--help" || command === "-h" || command === undefined) console.log(USAGE);
  else throw new Error(`${command} is no command of this tooling.\n\n${USAGE}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  reader?.close();
}
