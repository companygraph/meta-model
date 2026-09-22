#!/usr/bin/env node
// The CompanyGraph tooling: making an instance, and the checks over one. Subcommands, each
// exiting non-zero on any problem and writing nothing when its pre-flight fails:
//
//   companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--name <instance>] [--schemas <dir>] [--folders <a,b>]
//   companygraph check [<folder>]
//   companygraph upgrade [<folder>] [--core <tag>] [--force] [--dry-run]
//   companygraph obsidian [<vault>] [--release <tag>] [--from <dir>] [--plugins | --no-plugins] [--force] [--open]
//
// Run with no command at a terminal, it opens a menu over the same four, which asks what the
// flags would say and calls the same code, and stays open until Quit or Ctrl+C.
//
// `bin/check-instance.mjs` keeps its own path, because the reusable workflow and every
// instance's CI call it there; `check` is a second door to the same code.
import { createInterface } from "node:readline/promises";
import { readdirSync, readFileSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, SKILLS, initPlan, upgradePlan } from "../lib/plan.mjs";
import { writePlan } from "../lib/write.mjs";
import { unixLines } from "../lib/instance-files.mjs";
import { fetchCore } from "../lib/fetch-core.mjs";
import { download, graphOf, installed, knownVault, newestRelease, openVault, place, PLUGINS, readLocal, settle, vaultUrl, whereObsidian, workspaceOf } from "../lib/obsidian.mjs";
import { spawnSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

const USAGE = `companygraph [<command>]

  (none)              at a terminal, a menu over the four below, open until Quit or Ctrl+C
  init [<folder>]     write a new instance, or add one to this folder with --here
  check [<folder>]    the mechanical checks over an instance
  upgrade [<folder>]  move an instance's vendored core, skills, manifest and workflow tag together
  obsidian [<vault>]  make a vault of an instance: the plugins, the graph, the panes, and Obsidian itself

init: --here  --agent <${AGENTS.join("|")}>  --core <tag>  --name <instance>  --schemas <dir>  --folders <a,b>
upgrade: --core <tag>  --force  --dry-run
obsidian: --release <tag>  --from <dir>  --plugins  --no-plugins  --force  --open
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
      else files.set(child, unixLines(readFileSync(join(from, child), "utf8")));
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
const TOGGLES = new Set(["here", "force", "dry-run", "plugins", "no-plugins", "open"]);

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
// Keyed with `/` as the plan's paths are: on Windows `relative` answers with `\`, and a key that
// never matched the plan's let `init --here` see nothing already there.
function present(root) {
  const found = new Set();
  const walk = (base) => {
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      const full = join(base, entry.name);
      if (entry.name === ".git") continue;
      if (entry.isDirectory()) walk(full);
      else found.add(relative(root, full).split(sep).join("/"));
    }
  };
  if (existsSync(root)) walk(root);
  return found;
}

// Color only for a person at a terminal who has not asked for none, or where FORCE_COLOR asks for it; a pipe, a CI log and a test
// read the same words without it.
const COLOR = (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR)) && !process.env.NO_COLOR && process.env.TERM !== "dumb";
const paint = (code) => (text) => (COLOR ? `\x1b[${code}m${text}\x1b[0m` : String(text));
const accent = paint("38;2;90;139;200");
const bold = paint("1");
const dim = paint("2");
const good = paint("32");
const bad = paint("31");

// A path as a person reads it, with their home as `~`.
const shown = (path) => {
  const full = resolve(path);
  return full === homedir() || full.startsWith(homedir() + sep) ? `~${full.slice(homedir().length)}` : full;
};

// companygraph.io's mark: an outlined square holding a filled one, which is ownership, and a line
// out to a second filled square, which is a reference by name to something nothing owns.
const banner = () => [
  accent("  ╭─────────╮"),
  accent("  │  ▄▄▄▄▄  │   ▄▄▄▄▄"),
  `${accent("  │  █████  ├───█████")}     ${bold("Company")}${bold(accent("Graph"))}`,
  `${accent("  │  ▀▀▀▀▀  │   ▀▀▀▀▀")}     ${dim(`tooling ${PACKAGE.version} · companygraph.io`)}`,
  accent("  ╰─────────╯"),
].join("\n");

// One reader over stdin for the whole run, and the lines it reads kept until a question takes
// them: a reader opened per question drops what the one before it had already buffered, which is
// every answer after the first when the answers are piped in. At the end of the input a question
// is answered with nothing and `ended` is set, so a menu run from a pipe ends rather than waits.
let reader = null;
let ended = false;
const lines = [];
const waiting = [];
function ask(question) {
  if (!reader) {
    reader = createInterface({ input: process.stdin });
    reader.on("line", (line) => (waiting.length ? waiting.shift()(line) : lines.push(line)));
    reader.on("close", () => {
      ended = true;
      while (waiting.length) waiting.shift()("");
    });
  }
  process.stdout.write(question);
  const answered = lines.length ? Promise.resolve(lines.shift()) : reader.closed ? Promise.resolve("") : new Promise((done) => waiting.push(done));
  // The terminal echoes what is typed, so the menu's record of a pick keeps the answer itself.
  return answered.then((line) => {
    const answer = line.trim();
    record?.push(`${answer || dim("Enter")}\n`);
    return answer;
  });
}

// At a terminal the menu clears the screen before it draws, so what is on it is the latest pick
// and what that pick said, never the log of every one before it. `record` collects what a pick
// writes while it runs, which the next screen draws again as one panel.
const SCREEN = Boolean(process.stdout.isTTY);
let record = null;
function recorded(stream) {
  const write = stream.write.bind(stream);
  stream.write = (chunk, ...rest) => {
    record?.push(String(chunk));
    return write(chunk, ...rest);
  };
}
const clear = () => process.stdout.write("\x1b[H\x1b[2J\x1b[3J");

// The latest pick and what it said, behind a bar in green when it went through and red when not.
function panel(label, ok, text) {
  const bar = ok ? good : bad;
  const said = text.replace(/^\s*\n/, "").trimEnd().split("\n");
  return [
    `  ${bar("╭─")} ${bar(ok ? "✓" : "✗")} ${bold(label)}`,
    ...said.map((line) => `  ${bar("│")} ${line}`),
    `  ${bar("╰─")}`,
  ].join("\n");
}

// `menu` is set when the menu calls it, which says what comes next itself.
async function init(argv, { menu = false } = {}) {
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
  console.log(`${good("✓")} ${written.length} files written into ${shown(root)}`);
  console.log(`  written for ${agent}, with the companygraph-validate, -export, -surface and -profile skills; export and surface need Python 3`);
  console.log(`  core ${JSON.parse(core.get("manifest.json")).version}, vendored under ${given.schemas ?? "meta"}/core/`);
  const folders = [...plan.writes.keys()].filter((p) => /^model\/[^/]+\/README\.md$/.test(p)).map((p) => p.split("/")[1]);
  console.log(`  folders: ${folders.join(", ")}`);
  console.log(`  the model is empty but for its README files, its source and its two singular entities`);
  if (menu) return;
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
  // Read with `\n` line ends, as the hashes they are compared against were taken.
  const read = (path) => unixLines(readFileSync(path, "utf8"));
  const held = new Map();
  for (const path of Object.keys(manifest.files ?? {}))
    if (existsSync(join(root, path))) held.set(path, read(join(root, path)));
  // The skills this release would write, read where they already exist, so the plan can tell a
  // file this tooling wrote from one the instance wrote under the same name.
  const skills = skillsFor("claude");
  for (const path of skills.keys()) {
    const at = `${SKILLS}${path}`;
    if (!held.has(at) && existsSync(join(root, at))) held.set(at, read(join(root, at)));
  }
  const workflowPath = join(root, ".github/workflows/companygraph.yml");
  const workflow = existsSync(workflowPath) ? read(workflowPath) : null;
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

// A vault made of an instance, in five steps, each said as it happens: CompanyGraph's plugin, the
// two recommended beside it, each asked for by name unless --plugins or --no-plugins answers for
// them, the graph, the panes, and Obsidian itself. The questions are asked whether or not stdin is
// a terminal, as init asks for a name, since a pipe at its end answers no. Each plugin is read and
// refused before its own files are written, and installed again it is updated, the three files
// written over whatever release was there and the plugin switched on if it was not; the graph and
// the panes are written where the vault has none and kept where it has, since Obsidian rewrites
// both as a person works, unless --force. Obsidian is found or, where a package manager puts it
// there reliably, offered; a folder Obsidian already knows as a vault is then opened through
// Obsidian's own URL, on --open or on a yes at a terminal, and an opener that fails is said and
// does not stop what is left to say. A folder Obsidian does not know is told the one way in,
// Open folder as vault, since the URL opens only what Obsidian lists and that list is Obsidian's. A vault that is not an instance takes all of it too,
// since the plugin's own `Make this vault an instance` is one way to make one.
async function obsidian(argv) {
  const given = flags(argv);
  const vault = given._[0] ?? ".";
  const force = Boolean(given.force);
  const [own, ...recommended] = PLUGINS;

  // A folder not there yet is made, as Obsidian makes a vault of an empty one; a file in the way
  // is refused by `installed` below, as it always was.
  if (!existsSync(vault)) {
    mkdirSync(vault, { recursive: true });
    console.log(`${good("✓")} made the folder ${shown(vault)}`);
  }
  const now = installed(vault);
  let files;
  if (given.from) files = readLocal(given.from);
  else {
    const release = given.release ?? (await newestRelease());
    if (now.release === release && now.enabled)
      console.log(`${good("✓")} CompanyGraph ${release}, the ${given.release ? "release asked for" : "newest release"}, is installed and switched on in ${shown(vault)}`);
    else files = await download(release);
  }
  if (files) said(place(vault, files), own, vault);

  // One already there is updated unasked, as CompanyGraph's is; one not there is offered.
  if (!given["no-plugins"]) {
    for (const plugin of recommended) {
      const has = installed(vault, plugin);
      const wanted = has.release !== null || given.plugins || yes(await ask(prompt(`Install ${plugin.name}, ${plugin.what}?`, "y/N")));
      if (!wanted) {
        console.log(`  ${plugin.name} left out${plugin.needs ? `; ${plugin.needs.replace(/^It/, "it").replace(/\.$/, "")}` : ""}`);
        continue;
      }
      const release = await newestRelease(fetch, plugin);
      if (has.release === release && has.enabled) console.log(`${good("✓")} ${plugin.name} ${release}, the newest release, is installed and switched on`);
      else said(place(vault, await download(release, fetch, plugin), plugin), plugin);
      if (plugin.needs && has.release === null) console.log(dim(`  ${plugin.needs}`));
    }
  }

  const model = join(vault, "model");
  const folders = existsSync(model) ? readdirSync(model, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : [];
  const graph = settle(vault, "graph.json", graphOf(folders), { force });
  console.log(`${good("✓")} graph.json ${graph}${graph === "written" ? (folders.length ? ": the model, one color per folder" : ": the model, with no folder to color yet") : ", as Obsidian has it"}`);
  const file = existsSync(join(vault, "model", "identity.md")) ? "model/identity.md" : "README.md";
  const on = installed(vault).list;
  const panes = settle(vault, "workspace.json", workspaceOf({ file, plugins: on }), { force });
  console.log(`${good("✓")} workspace.json ${panes}${panes === "written" ? `: ${file} open, the plugin's views on the right` : ", as Obsidian has it"}`);

  const where = whereObsidian();
  let app = where.app;
  if (app) console.log(`${good("✓")} Obsidian is at ${shown(app)}`);
  else {
    console.log(`${bad("✗")} Obsidian was not found${process.platform === "linux" ? " on the path, as a Flatpak or as a Snap; an AppImage is wherever it was put" : ""}`);
    if (where.installer && yes(await ask(prompt(`Install it with ${where.installer.name}?`, "y/N")))) {
      const ran = spawnSync(where.installer.command[0], where.installer.command.slice(1), { stdio: "inherit" });
      if (ran.status === 0) {
        app = whereObsidian().app ?? where.installer.name;
        console.log(`${good("✓")} Obsidian is at ${shown(app)}`);
      } else console.log(`${bad("✗")} ${where.installer.command.join(" ")} did not go through`);
    } else if (where.installer) console.log(`  ${where.installer.name} installs it: ${dim(where.installer.command.join(" "))}`);
    else console.log(`  it is at ${dim(where.download)}`);
  }
  // The URL opens only a folder Obsidian lists as a vault, and the list is Obsidian's own. Where
  // it lists this one, --open is honored whether or not Obsidian was found, since on Linux not
  // found is not not installed and the opener answers for itself; an opener that fails is said,
  // with the URL to use by hand. Where it does not, the way in is Obsidian's own and is said.
  const known = knownVault(vault);
  const url = vaultUrl(vault);
  if (!known) console.log(`  Obsidian does not know this folder yet; once opened there, ${dim(url)} opens it`);
  else if (given.open || (app && yes(await ask(prompt("Open the vault in Obsidian?", "y/N"))))) {
    try {
      openVault(vault);
      console.log(`${good("✓")} opened ${shown(vault)} in Obsidian`);
    } catch (error) {
      console.log(`${bad("✗")} ${error.message}`);
      console.log(`  Obsidian opens it at ${dim(url)}`);
    }
  } else console.log(`  Obsidian opens it at ${dim(url)}`);
  // What no file in the vault can do. Obsidian keeps whether a vault's community plugins run, its
  // restricted mode, in its own storage, and a vault once browsed in restricted mode lists none.
  const steps = [
    ...(known ? [] : [`Open the folder as a vault: ${dim(`Open another vault → Open folder as vault → ${shown(vault)}`)}`]),
    "Trust the vault's author when Obsidian asks",
    `The plugins not under Installed plugins? ${dim("Settings → Community plugins → Turn on community plugins")}\n     ${dim("Obsidian keeps that switch itself, outside the vault, so no command can set it.")}`,
  ];
  console.log(`
${bold("Then, in Obsidian")}
${steps.map((step, i) => `  ${accent(String(i + 1))}  ${step}`).join("\n")}
  A vault Obsidian has open already takes the plugins on ${dim("Reload app without saving")}.`);
}

// One plugin's install, said: installed, written again, or moved between releases.
function said(done, plugin, vault) {
  const moved = done.from === null ? `${plugin.name} ${done.to} installed` : done.from === done.to ? `${plugin.name} ${done.to} written again` : `${plugin.name} ${done.from} → ${done.to}`;
  console.log(`${good("✓")} ${moved}${vault ? ` in ${shown(vault)}` : ""}${done.enabled ? ", and switched on" : ""}`);
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

const prompt = (question, hint) => `${accent("›")} ${bold(question)}${hint ? ` ${dim(`(${hint})`)}` : ""} `;

// A folder asked for, with `.` taken on Enter where there is a fallback and none asked for where a
// folder must be named.
async function folder(question, fallback) {
  const answer = typed(await ask(prompt(question, fallback ? "Enter for this folder" : "a path; it is made if it is missing")));
  if (answer) return answer;
  if (fallback) return fallback;
  throw new Error("no folder was given; nothing was done.");
}

async function menu() {
  const entries = [
    ["Make a model", "a new instance in a folder, or beside the files already in one", async () => {
      const root = await folder("Which folder?");
      const args = [root];
      if (existsSync(root) && statSync(root).isDirectory() && readdirSync(root).some((entry) => entry !== ".git")) {
        if (!yes(await ask(prompt("It holds files already. Add the model beside them?", "y/N")))) return 0;
        args.push("--here");
      }
      const name = await ask(prompt("What is the company called?"));
      if (!name) throw new Error("no name was given; nothing was written.");
      console.log();
      await init([...args, "--name", name], { menu: true });
      console.log();
      if (yes(await ask(prompt("Make it a vault, to write it in Obsidian?", "y/N")))) {
        console.log();
        await obsidian([root]);
      }
      return 0;
    }],
    ["Check a model", "the mechanical checks, as its CI runs them", async () => check([await folder("Which folder?", ".")])],
    [`Move a model to ${PACKAGE.version}`, "its vendored core, skills, manifest and workflow tag together", async () => {
      const root = await folder("Which folder?", ".");
      if ((await upgrade([root, "--dry-run"])) !== "planned") return 0;
      if (yes(await ask(prompt("Go ahead?", "y/N")))) await upgrade([root]);
      return 0;
    }],
    ["Obsidian", "make an instance a vault: the plugins, the graph, the panes, and Obsidian itself", async () => {
      await obsidian([await folder("Which vault?", ".")]);
      return 0;
    }],
  ];
  const width = Math.max(...entries.map(([label]) => label.length), "Quit".length);
  if (SCREEN) {
    recorded(process.stdout);
    recorded(process.stderr);
  }
  // The menu comes back after every pick, so one run does several things; it ends on Quit, on q,
  // on Ctrl+C, or at the end of piped input. Quit exits 0, since leaving is what was asked; the end
  // of piped input exits with the last pick's code, which is how a test reads what a pick did.
  let code = 0;
  let latest = null;
  for (;;) {
    if (SCREEN) clear();
    console.log(`\n${banner()}\n`);
    if (latest) console.log(`${panel(...latest)}\n`);
    entries.forEach(([label, what], i) => console.log(`  ${accent(i + 1)}  ${label.padEnd(width)}  ${dim(what)}`));
    console.log(`  ${accent(entries.length + 1)}  ${"Quit".padEnd(width)}  ${dim("or q, or Ctrl+C")}`);
    console.log();
    const pick = await ask(prompt(`Pick 1-${entries.length + 1}`));
    if (!pick && ended && !lines.length) return code;
    if (!pick) continue;
    if (/^q(uit)?$/i.test(pick) || pick === String(entries.length + 1)) {
      if (SCREEN) clear();
      return 0;
    }
    const entry = /^\d+$/.test(pick) ? entries[Number(pick) - 1] : undefined;
    const label = entry ? entry[0] : `Pick ${pick}`;
    if (SCREEN) {
      clear();
      console.log(`\n${banner()}\n\n  ${accent("›")} ${bold(label)}\n`);
    } else console.log();
    record = SCREEN ? [] : null;
    try {
      if (!entry) throw new Error(`${pick} is not one of 1-${entries.length + 1}; nothing was done.`);
      code = await entry[2]();
    } catch (error) {
      console.error(`${bad("✗")} ${error instanceof Error ? error.message : String(error)}`);
      code = 1;
    }
    if (record) latest = [label, code === 0, record.join("")];
    record = null;
    if (!SCREEN) console.log();
  }
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
