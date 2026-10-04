#!/usr/bin/env node
// The CompanyGraph tooling: making an instance, and the checks over one. Subcommands, each
// exiting non-zero on any problem and writing nothing when its pre-flight fails; commits and ids
// exit 3 to refuse, so a caller such as a hook can tell a refusal from a run that could not
// happen, and 1 for anything else:
//
//   companygraph init [<folder>] [--here] [--agent claude] [--core <tag>] [--name <instance>] [--schemas <dir>] [--folders <a,b>] [--pack <a,b>]
//   companygraph check [<folder>]
//   companygraph judge [<folder>]
//   companygraph form [<folder>] [--fix]
//   companygraph pins [<folder>]
//   companygraph adopt [<folder>]
//   companygraph upgrade [<folder>] [--core <tag>] [--pack <a,b>] [--force] [--dry-run]
//   companygraph obsidian [<vault>] [--release <tag>] [--from <dir>] [--plugins | --no-plugins] [--force] [--open]
//   companygraph commits [<folder>] (--range <a>..<b> | --message <file>)
//   companygraph seats [<folder>] [--since <date>] [--json]
//   companygraph id
//   companygraph ids [<folder>] (--backfill | --range <a>..<b>)   — an instance's pages, or core's schemas
//
// Run with no command at a terminal, it opens a menu over init, check, upgrade, obsidian,
// seats, adopt and pins, which asks what the flags would say and calls the same code, and stays open until Quit
// or Ctrl+C.
//
// `bin/check-instance.mjs` keeps its own path, because the reusable workflow and every
// instance's CI call it there; `check` is a second door to the same code.
import { createInterface } from "node:readline/promises";
import { readdirSync, readFileSync, existsSync, mkdirSync, rmSync, statSync, chmodSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS, SKILLS, adoptPlan, adoptedUpgradePlan, initPlan, upgradePlan, backfillPlan, schemaBackfillPlan } from "../lib/plan.mjs";
import { writePlan } from "../lib/write.mjs";
import { excludeFor, exportFilesFor, unixLines } from "../lib/instance-files.mjs";
import { formCheck, formattedOf } from "../lib/form.mjs";
import { pinReport, lsRemote, validatePins, SCANNED } from "../lib/pins.mjs";
import { fetchCore } from "../lib/fetch-core.mjs";
import { download, graphOf, installed, knownVault, newestRelease, obsidianRunning, openVault, place, PLUGINS, quitObsidian, readLocal, registerVault, settle, vaultUrl, whereObsidian, workspaceOf } from "../lib/obsidian.mjs";
import { spawnSync } from "node:child_process";
import { gitTop, isInstance, readInstance, logOf, pendingOf, familyOf, firstCommitMsOf, changedPagesOf, deletedPagesOf, pageHistoryOf, mergeBaseOf, treeAt, changedFilesOf, versionAt } from "../lib/history.mjs";
import { SEATS_SINCE, governingOf, judgeCommit, tally, renderReport } from "../lib/seats.mjs";
import { uuidv7 } from "../lib/ids.mjs";
import { idChangesOf, keptChangesOf, labelChangesOf, PACKS, typeOfPath, vocabularyOf } from "../lib/checks.mjs";
/** @import { CommunityPlugin } from "../lib/obsidian.mjs" */
/** @import { Governing } from "../lib/seats.mjs" */
/** @import { UpgradeWrites } from "../lib/plan.mjs" */

/**
 * An upgrade's plan as this command reads it once a refusal has thrown: a refusal has none of
 * the fields of a plan.
 * @typedef {UpgradeWrites | {
 *   refused: string; writes?: undefined; removes?: undefined; edited?: undefined; missing?: undefined;
 *   given?: undefined; rewritten?: undefined; from?: undefined; to?: undefined;
 * }} UpgradeRead
 */

/**
 * What `flags` reads off the command line: the positional arguments, every toggle as true, and
 * every other flag as the value after it.
 * @typedef {{
 *   _: string[];
 *   here?: boolean; force?: boolean; "dry-run"?: boolean; plugins?: boolean; "no-plugins"?: boolean;
 *   open?: boolean; json?: boolean; "no-hook"?: boolean; backfill?: boolean; fix?: boolean;
 *   agent?: string; name?: string; core?: string; schemas?: string; folders?: string; pack?: string; release?: string;
 *   from?: string; range?: string; message?: string; since?: string; consent?: string;
 * }} Flags
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));

const USAGE = `companygraph [<command>]

  (none)              at a terminal, a menu over init, check, upgrade, obsidian, seats, adopt and pins, open until Quit or Ctrl+C
  init [<folder>]     write a new instance, or add one to this folder with --here
  check [<folder>]    the mechanical checks over an instance
  judge [<folder>]    ask a decision model whether each page keeps its schema's writing rules; advisory, and it asks before sending anything
  form [<folder>]     the one Markdown form over a repository, or --fix to write it
  pins [<folder>]     which pins a repository's pins.json declares are behind; moves nothing
  adopt [<folder>]    give a repository that is not an instance the form check, its workflow, the seat hook and a pins.json declaring its tooling pin
  upgrade [<folder>]  move an instance's vendored core, skills, manifest and workflow tag together
  obsidian [<vault>]  make a vault of an instance: the plugins, the graph, the panes, and Obsidian itself
  commits [<folder>]  refuse (exit 3) a commit whose seat the phase in its trailers does not list
  seats [<folder>]    the history by seat: the family's where conventions lists one, else this repository's
  id                  print a fresh id, a UUID version 7
  ids [<folder>]      give every page an id from its first commit, or refuse (exit 3) under a pattern, or a range that changed an id, rewrote or removed a decision, or moved or reused a label

init: --here  --agent <${AGENTS.join("|")}>  --core <tag>  --name <instance>  --schemas <dir>  --folders <a,b>  --pack <a,b>  --no-hook
upgrade: --core <tag>  --pack <a,b>  --force  --dry-run
obsidian: --release <tag>  --from <dir>  --plugins  --no-plugins  --force  --open
commits: --range <a>..<b>  --message <file>
seats: --since <date>  --json
ids: --backfill  --range <a>..<b>
form: --fix
judge: --consent <digest>
`;

// Every file under a folder of this release, keyed by its path inside that folder. Recursive, to
// match `extractCore`: `core/` is flat today, but a future subfolder must not be dropped from a
// bundled init while a fetched one keeps it. Not exported: importing this module runs the argv
// dispatcher at the foot of the file, so nothing outside it could ever call this anyway.
// The folder walked is the package as installed, which is not pristine: Python leaves a
// `__pycache__` beside a script it compiled, and macOS drops a `.DS_Store`, and neither is a file
// a release ships. Three instances recorded two `.pyc` files in their manifests at 0.50.0 that
// way, and the checks then failed on files the instance never held. What no release ships is
// skipped by name, so a polluted install writes exactly what a clean one does.
/** @param {string} name */
const unshipped = (name) => name === "__pycache__" || name === ".DS_Store" || name.endsWith(".pyc");
/**
 * @param {string} folder
 * @returns {Map<string, string>}
 */
function filesOfThisRelease(folder) {
  const from = join(HERE, "..", folder);
  /** @type {Map<string, string>} */
  const files = new Map();
  /** @param {string} rel */
  const walk = (rel) => {
    for (const entry of readdirSync(join(from, rel || "."), { withFileTypes: true })) {
      if (unshipped(entry.name)) continue;
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

// A pack this release ships, as a map of file to text, read the way core's is.
/** @param {string} name */
function packOfThisRelease(name) {
  if (!Object.hasOwn(PACKS, name)) throw new Error(`this release ships no pack named ${name}; it ships ${Object.keys(PACKS).join(", ") || "none"}`);
  return filesOfThisRelease(`packs/${name}`);
}

// `--pack a,b` as a list of names.
/** @param {string | undefined} value */
const packNamesOf = (value) => (value ? value.split(",").map((p) => p.trim()).filter(Boolean) : []);

// The agent's skills always come from the release that runs, whatever core is vendored: they are
// the tooling's, and they read the rules from the instance's own core rather than carrying them.
/** @param {string} agent */
const skillsFor = (agent) => filesOfThisRelease(`agents/${agent}/skills`);

// Toggles carry no value; `upgrade` also reads --force and --dry-run, so both are named here
// once rather than teaching this parser about them a second time. Everything else takes a value,
// and a value that is missing or looks like another flag is refused by name rather than silently
// eaten or handed to a prompt further down.
const TOGGLES = new Set(["here", "force", "dry-run", "plugins", "no-plugins", "open", "json", "no-hook", "backfill", "fix"]);

/**
 * @param {string[]} argv
 * @returns {Flags}
 */
function flags(argv) {
  /** @type {Flags} */
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) { out._.push(arg); continue; }
    const name = arg.slice(2);
    if (TOGGLES.has(name)) { /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (out))[name] = true; continue; }
    const value = argv[i + 1];
    if (value === undefined) throw new Error(`--${name} needs a value`);
    if (value.startsWith("--")) throw new Error(`--${name} needs a value, not ${value}`);
    /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (out))[name] = value;
    i++;
  }
  return out;
}

// Everything the target folder holds, for the plan's pre-flight; nothing is read of what it says.
// Keyed with `/` as the plan's paths are: on Windows `relative` answers with `\`, and a key that
// never matched the plan's let `init --here` see nothing already there.
/**
 * @param {string} root
 * @returns {Set<string>}
 */
function present(root) {
  /** @type {Set<string>} */
  const found = new Set();
  /** @param {string} base */
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
const paint = (/** @type {string} */ code) => (/** @type {unknown} */ text) => (COLOR ? `\x1b[${code}m${text}\x1b[0m` : String(text));
const accent = paint("38;2;90;139;200");
const bold = paint("1");
const dim = paint("2");
const good = paint("32");
const bad = paint("31");

// A path as a person reads it, with their home as `~`.
/** @param {string} path */
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
/** @type {ReturnType<typeof createInterface> | null} */
let reader = null;
let ended = false;
/** @type {string[]} */
const lines = [];
/** @type {((line: string) => void)[]} */
const waiting = [];
// Inside a pick of the menu, a question is left with b or back, or with Ctrl+C, and the menu comes
// back: `Back` is thrown out of the pick and caught where the menu called it, and what the pick
// had written by then stays. Outside the menu neither means that: b is an answer like any other,
// and Ctrl+C ends the run as it always did.
class Back extends Error {}
let inPick = false;
/**
 * @param {string} question
 * @returns {Promise<string>}
 */
function ask(question) {
  if (!reader) {
    reader = createInterface({ input: process.stdin });
    reader.on("line", (line) => (waiting.length ? /** @type {(line: string) => void} */ (waiting.shift())(line) : lines.push(line)));
    reader.on("close", () => {
      ended = true;
      while (waiting.length) /** @type {(line: string) => void} */ (waiting.shift())("");
    });
  }
  process.stdout.write(question);
  const answered = lines.length ? Promise.resolve(/** @type {string} */ (lines.shift())) : /** @type {{ closed?: boolean }} */ (/** @type {unknown} */ (reader)).closed ? Promise.resolve("") : /** @type {Promise<string>} */ (new Promise((done) => waiting.push(done)));
  // The terminal echoes what is typed, so the menu's record of a pick keeps the answer itself.
  return answered.then((line) => {
    if (line === BACK) throw new Back();
    const answer = line.trim();
    record?.push(`${answer || dim("Enter")}\n`);
    if (inPick && /^b(ack)?$/i.test(answer)) throw new Back();
    return answer;
  });
}
// Ctrl+C while a pick is asking answers the question with this, and the menu comes back; at the
// menu's own prompt, or outside the menu, it ends the run. A line a person could never type.
const BACK = "\u0000back";
process.on("SIGINT", () => {
  if (inPick && waiting.length) {
    process.stdout.write("\n");
    /** @type {(line: string) => void} */ (waiting.shift())(BACK);
  } else process.exit(130);
});

// At a terminal the menu clears the screen before it draws, so what is on it is the latest pick
// and what that pick said, never the log of every one before it. `record` collects what a pick
// writes while it runs, which the next screen draws again as one panel.
const SCREEN = Boolean(process.stdout.isTTY);
/** @type {string[] | null} */
let record = null;
/** @param {NodeJS.WriteStream} stream */
function recorded(stream) {
  const write = /** @type {(...args: unknown[]) => boolean} */ (stream.write.bind(stream));
  /**
   * @param {string | Uint8Array} chunk
   * @param {unknown[]} rest
   */
  stream.write = (chunk, ...rest) => {
    record?.push(String(chunk));
    return write(chunk, ...rest);
  };
}
const clear = () => process.stdout.write("\x1b[H\x1b[2J\x1b[3J");

// The latest pick and what it said, behind a bar in green when it went through and red when not.
/**
 * @param {string} label
 * @param {boolean} ok
 * @param {string} text
 */
function panel(label, ok, text) {
  const bar = ok ? good : bad;
  const said = text.replace(/^\s*\n/, "").trimEnd().split("\n");
  return [
    `  ${bar("╭─")} ${bar(ok ? "✓" : "✗")} ${bold(label)}`,
    ...said.map((line) => `  ${bar("│")} ${line}`),
    `  ${bar("╰─")}`,
  ].join("\n");
}

// The seat hook made executable and, where git and the repository let it, put in use; what was
// done or why not is said, as init always said it.
/** @param {string} root */
function useHook(root) {
  chmodSync(join(root, ".companygraph/hooks/commit-msg"), 0o755);
  // The hooks path is asked of git itself, never computed by hand: `--show-prefix` gives the
  // instance's position under the repository's own top, whatever that top resolves to on this
  // machine (a symlinked temp dir on macOS, an 8.3 short name on Windows), and git then resolves
  // a relative core.hooksPath against that same top when a hook runs, from any cwd under it.
  const top = gitTop(root);
  const prefix = top ? spawnSync("git", ["rev-parse", "--show-prefix"], { cwd: root, encoding: "utf8" }).stdout.trim() : "";
  const hooks = prefix ? `${prefix.replace(/\/$/, "")}/.companygraph/hooks` : ".companygraph/hooks";
  const current = top ? spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: root, encoding: "utf8" }).stdout.trim() : "";
  // A repository that already keeps real hook files under its default hooks folder — placed
  // there directly, without ever setting core.hooksPath, as some tools still do — must not have
  // them silently switched off by a core.hooksPath this command sets. `git rev-parse --git-path
  // hooks` names that folder however git resolves it (relative to root, wherever `.git` really
  // is), asked only where core.hooksPath is not already set to something else, since that case
  // is already the husky one below. A file git itself ships as a template ends `.sample` and is
  // never in the way.
  // `--git-path` answers absolute in a worktree — its hooks live under the main checkout's own
  // `.git/`, nowhere near `root` — and relative otherwise; `resolve` takes either, where `join`
  // would concatenate an absolute answer onto `root` into a path nothing ever wrote.
  const hooksDir = top && !current ? spawnSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: root, encoding: "utf8" }).stdout.trim() : "";
  const hooksDirAbs = hooksDir ? resolve(root, hooksDir) : "";
  const already = hooksDirAbs && existsSync(hooksDirAbs)
    ? readdirSync(hooksDirAbs).filter((f) => !f.endsWith(".sample"))
    : [];
  if (!top) console.log(`  the commit-msg hook is written; once the folder is a git repository, run "git config core.hooksPath ${hooks}"`);
  else if (current && current !== hooks) console.log(`  core.hooksPath is ${current} here, so the seat check's hook is not in use; its file is ${hooks}/commit-msg`);
  else if (already.length) console.log(`  ${hooksDir} already holds ${already.join(", ")}, so the seat check's hook is not in use; its file is ${hooks}/commit-msg`);
  else {
    spawnSync("git", ["config", "core.hooksPath", hooks], { cwd: root });
    console.log(`  the commit-msg hook is in use: git reads hooks from ${hooks}; a fresh clone needs "git config core.hooksPath ${hooks}" again, since core.hooksPath is local config and is not cloned`);
  }
}

// `menu` is set when the menu calls it, which says what comes next itself.
/**
 * @param {string[]} argv
 * @param {{ menu?: boolean }} [options]
 */
async function init(argv, { menu = false } = {}) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  // Walked once: the pre-flight guard and the plan's own conflict check both need it, and a
  // repository is not read twice for the price of one decision.
  const found = present(root);
  if (!given.here && found.size > 0)
    throw new Error(`${root} is not empty; pass --here to add an instance to it.`);
  const agent = given.agent ?? (AGENTS.length === 1 ? /** @type {string} */ (AGENTS[0]) : await ask(`Which agent? (${AGENTS.join(", ")}) `));
  const name = given.name ?? (await ask("What is this instance called? "));
  const tag = given.core ?? `v${PACKAGE.version}`;
  const core = given.core ? await fetchCore(given.core) : coreOfThisRelease();
  // --pack takes the packs this release ships, comma-separated. With --core, a fetched core is
  // not paired with this release's packs, since a pack is released with its core.
  const packNames = packNamesOf(given.pack);
  if (packNames.length && given.core) throw new Error("--pack takes this release's packs, and --core fetches another release's core; take them from one release");
  const packs = new Map(packNames.map((name) => [name, packOfThisRelease(name)]));
  const plan = initPlan({
    core,
    packs,
    // An agent this release does not write for has no skills folder to read; the plan refuses it
    // by name, so the refusal is its sentence and not a missing folder's.
    skills: AGENTS.includes(agent) ? skillsFor(agent) : undefined,
    tooling: PACKAGE.version,
    tag,
    name,
    agent,
    units: given.schemas ?? "meta",
    // A comma-separated list of root folders; absent means every one core declares.
    folders: given.folders?.split(",").map((f) => f.trim()).filter(Boolean),
    present: found,
    fetched: Boolean(given.core),
    hook: !given["no-hook"],
  });
  if (plan.refused) throw new Error(plan.refused);
  const written = writePlan(root, /** @type {Map<string, string>} */ (plan.writes));
  console.log(`${good("✓")} ${written.length} files written into ${shown(root)}`);
  console.log(`  written for ${agent}, with the companygraph-validate, -export, -surface, -profile, -company, -consent and -judge skills; export and surface need Python 3`);
  console.log(`  core ${JSON.parse(/** @type {string} */ (core.get("manifest.json"))).version}, vendored under ${given.schemas ?? "meta"}/core/`);
  if (packNames.length) console.log(`  packs: ${packNames.join(", ")}, vendored beside it`);
  const folders = [.../** @type {Map<string, string>} */ (plan.writes).keys()].filter((p) => /^model\/[^/]+\/README\.md$/.test(p)).map((p) => p.split("/")[1]);
  console.log(`  folders: ${folders.join(", ")}`);
  console.log(`  the model is empty but for its README files, its source and its singular entities`);
  if (/** @type {Map<string, string>} */ (plan.writes).has(".companygraph/hooks/commit-msg")) useHook(root);
  if (menu) return;
  console.log(`  run "npx github:companygraph/meta-model#v${PACKAGE.version} check ${root}" whenever it changes`);
  console.log(`  and "npx github:companygraph/meta-model#v${PACKAGE.version} obsidian ${root}" to write it in Obsidian`);
}

/** @param {string[]} argv */
async function upgrade(argv) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  const manifestPath = join(root, ".companygraph/manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`${root} is no instance: it has no .companygraph/manifest.json.`);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`${manifestPath} could not be read as JSON: ${/** @type {Error} */ (error).message}`);
  }
  // Read with `\n` line ends, as the hashes they are compared against were taken.
  /** @param {string} path */
  const read = (path) => unixLines(readFileSync(path, "utf8"));
  // The form of the release this moves to, asked before anything moves: an instance made outside
  // the family before this release was never held to it, and an upgrade that left it failing its
  // own next check would hand the owner a red build for work the upgrade did. --force moves anyway.
  const formed = formCheck(root, { exclude: manifest.exclude ?? excludeFor(manifest.units ?? "meta") });
  const unformed = [...formed.hits, ...(formed.error ? [formed.error] : [])];
  if (unformed.length && !given.force)
    throw new Error(
      `The Markdown is not in the form ${PACKAGE.version} holds, so nothing was moved:\n${unformed.map((line) => `  ${line}`).join("\n")}\n` +
        `"companygraph form ${root} --fix" writes what it can into the form; pass --force to move anyway.`,
    );
  // A manifest with no core is a repository that took the machinery and holds no model; its
  // upgrade moves the release it runs and its workflow, and vendors nothing into it.
  if (!manifest.core) {
    const workflowPath = join(root, ".github/workflows/companygraph.yml");
    const adopted = adoptedUpgradePlan({
      tooling: PACKAGE.version,
      manifest,
      workflow: existsSync(workflowPath) ? read(workflowPath) : null,
      present: new Set(["pins.json"].filter((path) => existsSync(join(root, path)))),
    });
    if (!adopted.writes.size) {
      console.log(`already on ${adopted.to}; nothing to do.`);
      return "nothing";
    }
    if (given["dry-run"]) {
      console.log(`tooling ${adopted.from} → ${adopted.to}, if this runs:`);
      for (const path of adopted.writes.keys()) console.log(`  write   ${path}`);
      return "planned";
    }
    const written = writePlan(root, adopted.writes);
    console.log(`tooling ${adopted.from} → ${adopted.to}: ${written.length} written`);
    if (adopted.given.length) console.log(`  written, since the repository had none, and its own from now on: ${adopted.given.join(", ")}`);
    return "done";
  }
  /** @type {Map<string, string>} */
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
  // The export's inputs are the instance's own and only written where absent, so all the plan
  // needs is which of them are there, and the name its guide opens on: the identity's H1, or the
  // folder's name where the identity has none to read. The plan also reads model/identity.md's
  // `source` for a fresh model/localization.md, and needs to see model/localization.md itself to
  // know whether the instance already has one — both unhashed, so both are read into `held`
  // directly rather than through the manifest's tracked paths.
  const identityPath = join(root, "model/identity.md");
  const identityText = existsSync(identityPath) ? read(identityPath) : undefined;
  if (identityText !== undefined) held.set("model/identity.md", identityText);
  const identity = identityText?.match(/^# (.+)$/m)?.[1].trim();
  const name = identity || basename(resolve(root));
  const localizationPath = join(root, "model/localization.md");
  if (existsSync(localizationPath)) held.set("model/localization.md", read(localizationPath));
  const exportPaths = [...exportFilesFor({ name }).keys()];
  const tag = given.core ?? `v${PACKAGE.version}`;
  // --pack takes a pack the instance did not have, so a company that started before a pack
  // shipped takes it without a second init. The packs it already lists move as before. A pack is
  // released with its core, so any pack, listed or added, is refused beside --core, before
  // anything is fetched.
  const added = packNamesOf(given.pack).filter((name) => !(manifest.packs ?? []).includes(name));
  const packNames = [...new Set([...(manifest.packs ?? []), ...packNamesOf(given.pack)])];
  if (packNames.length && given.core)
    throw new Error(`this instance takes the pack ${packNames.join(", ")}, and --core fetches another release's core without it; a pack is released with its core, so upgrade without --core`);
  const core = given.core ? await fetchCore(given.core) : coreOfThisRelease();
  const packs = new Map(packNames.map((name) => [name, packOfThisRelease(name)]));
  // A pack file the instance holds that the manifest never recorded is read too, so the plan can
  // tell the tooling's file from the instance's own under the same name.
  for (const [name, packFiles] of packs)
    for (const path of packFiles.keys()) {
      const at = `${manifest.units ?? "meta"}/${name}/${path}`;
      if (!held.has(at) && existsSync(join(root, at))) held.set(at, read(join(root, at)));
    }
  /** @type {UpgradeRead} */
  const plan = upgradePlan({
    core,
    skills,
    packs,
    tooling: PACKAGE.version,
    tag,
    manifest,
    held,
    workflow,
    fetched: Boolean(given.core),
    force: Boolean(given.force),
    name,
    present: new Set([...exportPaths, "pins.json"].filter((path) => existsSync(join(root, path)))),
  });
  if (plan.refused) throw new Error(plan.refused);
  if (/** @type {Map<string, string>} */ (plan.writes).size === 0 && /** @type {string[]} */ (plan.removes).length === 0) {
    console.log(`already on core ${plan.to}; nothing to do.`);
    return "nothing";
  }
  if (given["dry-run"]) {
    console.log(`core ${plan.from} → ${plan.to}, if this runs:`);
    for (const path of /** @type {Map<string, string>} */ (plan.writes).keys()) console.log(`  write   ${path}`);
    for (const path of /** @type {string[]} */ (plan.removes)) console.log(`  remove  ${path}`);
    return "planned";
  }
  // Belt and braces, beside the plan's own refusal of anything a manifest names outside its own
  // core: a plan is data, a delete cannot be undone, and this is checked before a single file
  // moves rather than trusting that the refusal above can never have a gap of its own.
  const rootResolved = resolve(root);
  for (const path of /** @type {string[]} */ (plan.removes)) {
    const target = resolve(root, path);
    if (target !== rootResolved && !target.startsWith(rootResolved + sep))
      throw new Error(`upgrade refuses to remove ${path}: it resolves outside ${root}, and nothing was written.`);
  }

  const written = writePlan(root, /** @type {Map<string, string>} */ (plan.writes));
  for (const path of /** @type {string[]} */ (plan.removes)) rmSync(join(root, path), { force: true });
  console.log(`core ${plan.from} → ${plan.to}: ${written.length} written, ${/** @type {string[]} */ (plan.removes).length} removed`);
  if (added.length) console.log(`  packs: ${added.join(", ")}, vendored beside core`);
  if (/** @type {string[]} */ (plan.given).length) console.log(`  written, since the instance had none, and its own from now on: ${/** @type {string[]} */ (plan.given).join(", ")}`);
  if (/** @type {string[]} */ (plan.rewritten).length) console.log(`  rewritten in this core's form: ${/** @type {string[]} */ (plan.rewritten).join(", ")}`);
  // Edited and missing are both --force taking a vendored file the instance no longer held as
  // this tooling wrote it, but only the first was a file to overwrite; the second was not there
  // to overwrite, so it is written fresh instead, and the two are named apart so neither claim is
  // said of a file it does not fit.
  if (/** @type {string[]} */ (plan.edited).length) console.log(`  overwritten, as --force asked: ${/** @type {string[]} */ (plan.edited).join(", ")}`);
  // A file the instance had deleted is written fresh only where the new core still ships it; one
  // the new core has dropped as well is not written at all, and saying so is the difference
  // between naming what happened and naming what was planned.
  const rewritten = /** @type {string[]} */ (plan.missing).filter((path) => /** @type {Map<string, string>} */ (plan.writes).has(path));
  const dropped = /** @type {string[]} */ (plan.missing).filter((path) => !/** @type {Map<string, string>} */ (plan.writes).has(path));
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
    console.error(`✗ ${/** @type {Error} */ (error).message}`);
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
// does not stop what is left to say. A folder Obsidian does not know is put on Obsidian's own
// list first, which is the one write into a file of Obsidian's and is made only while Obsidian is
// not running, since it reads the list when it starts; under a running Obsidian the command
// offers to quit it the way its menu does and reopen it with the vault, and on a no the way in is
// Obsidian's own, Open folder as vault, and is said. A vault that is not an instance takes all of it too,
// since the plugin's own `Make this vault an instance` is one way to make one.
/** @param {string[]} argv */
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

  // One there and on is updated unasked, as CompanyGraph's is; one not there is offered; one there
  // and switched off was switched off by the person, which Obsidian records by taking its name out
  // of the list and leaving its files, and that is not the command's to undo.
  if (!given["no-plugins"]) {
    for (const plugin of recommended) {
      const has = installed(vault, plugin);
      if (has.release !== null && !has.enabled) {
        console.log(`  ${plugin.name} is there but switched off; left as it is`);
        continue;
      }
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
        console.log(app === where.installer.name ? `${good("✓")} installed with ${app}` : `${good("✓")} Obsidian is at ${shown(app)}`);
      } else console.log(`${bad("✗")} ${where.installer.command.join(" ")} did not go through`);
    } else if (where.installer) console.log(`  ${where.installer.name} installs it: ${dim(where.installer.command.join(" "))}`);
    else console.log(`  it is at ${dim(where.download)}`);
  }
  // The URL opens only a folder Obsidian lists as a vault. --open is honored whether or not
  // Obsidian was found, since on Linux not found is not not installed and the opener answers for
  // itself; an opener that fails is said, with the URL to use by hand. A folder not on the list is
  // put there first; a running Obsidian would not see it, so it is offered a quit and a reopen,
  // always asked, since a flag should not quit a person's application.
  let known = knownVault(vault);
  const url = vaultUrl(vault);
  let opened = false;
  let registered = false;
  if (given.open || (app && yes(await ask(prompt("Open the vault in Obsidian?", "y/N"))))) {
    let blocked = !known && obsidianRunning();
    if (blocked) {
      console.log(`  Obsidian is running, and reads its list of vaults only when it starts; it reopens what it has open now`);
      if (yes(await ask(prompt("Quit Obsidian and reopen it with the vault?", "y/N")))) {
        const asked = await quitObsidian();
        if (asked.quit) blocked = false;
        else console.log(`${bad("✗")} Obsidian did not quit${asked.reason ? `: ${asked.reason}` : " (a second Obsidian running?)"}; quit it yourself and run this again, or open the folder there`);
      } else console.log(`  left as it is; open the folder there`);
    }
    if (!blocked) {
      try {
        if (!known) {
          registerVault(vault);
          known = registered = true;
          console.log(`${good("✓")} put on Obsidian's list of vaults`);
        }
        // The opener answers that the URL was handed over, not that a vault opened, so that is
        // what is said, and the way in by hand stays in the steps below for a vault put on the
        // list this run.
        openVault(vault);
        opened = true;
        console.log(`${good("✓")} asked Obsidian to open ${shown(vault)}`);
      } catch (error) {
        console.log(`${bad("✗")} ${/** @type {Error} */ (error).message}`);
      }
    }
  }
  if (!opened) console.log(known ? `  Obsidian opens it at ${dim(url)}` : `  Obsidian does not know this folder yet; once opened there, ${dim(url)} opens it`);
  // What no file in the vault can do. Obsidian keeps whether a vault's community plugins run, its
  // restricted mode, in its own storage, and a vault once browsed in restricted mode lists none.
  const steps = [
    ...(known && !registered ? [] : [`${registered ? "Did it not open? " : ""}Open the folder as a vault: ${dim(`Open another vault → Open folder as vault → ${shown(vault)}`)}`]),
    "Trust the vault's author when Obsidian asks",
    `The plugins not under Installed plugins? ${dim("Settings → Community plugins → Turn on community plugins")}\n     ${dim("Obsidian keeps that switch itself, outside the vault, so no command can set it.")}`,
  ];
  console.log(`
${bold("Then, in Obsidian")}
${steps.map((step, i) => `  ${accent(String(i + 1))}  ${step}`).join("\n")}
  A vault Obsidian has open already takes the plugins on ${dim("Reload app without saving")}.`);
}

// One plugin's install, said: installed, written again, or moved between releases.
/**
 * @param {ReturnType<typeof place>} done
 * @param {CommunityPlugin} plugin
 * @param {string} [vault]
 */
function said(done, plugin, vault) {
  const moved = done.from === null ? `${plugin.name} ${done.to} installed` : done.from === done.to ? `${plugin.name} ${done.to} written again` : `${plugin.name} ${done.from} → ${done.to}`;
  console.log(`${good("✓")} ${moved}${vault ? ` in ${shown(vault)}` : ""}${done.enabled ? ", and switched on" : ""}`);
}

// The manifest at a folder, or null where it has none. A manifest that is not JSON is said by name.
/** @param {string} root */
function manifestAt(root) {
  const at = join(root, ".companygraph/manifest.json");
  if (!existsSync(at)) return null;
  try {
    return JSON.parse(readFileSync(at, "utf8"));
  } catch (error) {
    throw new Error(`${at} could not be read as JSON: ${/** @type {Error} */ (error).message}`);
  }
}

// What the form leaves out of a folder: its manifest's own list, else an instance's default, else
// nothing, for a folder that took no tooling and is held whole.
/** @param {{ exclude?: string[]; units?: string; core?: unknown } | null} manifest */
const excludeOf = (manifest) => manifest?.exclude ?? (manifest?.core ? excludeFor(manifest.units ?? "meta") : []);

// The machinery for a repository that is not an instance: the form, its workflow, the seat hook
// and a pins.json that declares its tooling pin. A folder that is not there yet is made, as init makes one.
/** @param {string[]} argv */
function adopt(argv) {
  const root = flags(argv)._[0] ?? ".";
  const plan = adoptPlan({ tooling: PACKAGE.version, present: present(root) });
  if (plan.refused) throw new Error(`${root}: ${plan.refused}`);
  const written = writePlan(root, /** @type {Map<string, string>} */ (plan.writes));
  console.log(`${good("✓")} ${shown(root)} adopted at ${PACKAGE.version}: ${written.join(", ")}`);
  console.log(`  its Markdown is held to the one form, leaving out dist/; list more paths under "exclude" in .companygraph/manifest.json`);
  console.log(`  the seat hook is written; with no model here it has no seats to judge commits against, so it lets every commit through`);
  useHook(root);
  console.log(`  run "npx github:companygraph/meta-model#v${PACKAGE.version} check ${root}" for the form, and "… pins ${root}" for the pins`);
}

// The manifest at a folder for a command that answers with an exit code, where one that is not
// JSON is said as every other refusal of the check is, with "✗ " before it.
/**
 * @param {string} root
 * @returns {{ manifest: any } | null}
 */
function manifestSaid(root) {
  try {
    return { manifest: manifestAt(root) };
  } catch (error) {
    console.error(`✗ ${/** @type {Error} */ (error).message}`);
    return null;
  }
}

// The form over a folder, said: one line per hit and the command that writes them, or one line
// that it passed. The check refuses a manifest naming another release, as the checker's own guard
// does, because the form is the release's too and a workflow pinned to one release runs this.
// --fix does not refuse it: it is a local rewrite no workflow runs, and the remedy upgrade names
// for an instance on an older release, which is what the manifest of one waiting to move says.
/**
 * @param {string[]} argv
 * @returns {number}
 */
function form(argv) {
  const given = flags(argv);
  const root = given._[0] ?? ".";
  const read = manifestSaid(root);
  if (!read) return 1;
  const { manifest } = read;
  if (!given.fix && manifest?.tooling && manifest.tooling !== PACKAGE.version) {
    console.error(`✗ this checker is ${PACKAGE.version} and .companygraph/manifest.json names ${manifest.tooling} — move the pin and the workflow together, or call the release the manifest names`);
    return 1;
  }
  const { files, hits, error } = formCheck(root, { exclude: excludeOf(manifest), fix: Boolean(given.fix) });
  if (error) {
    console.error(`✗ ${error}`);
    return 1;
  }
  if (hits.length) {
    for (const hit of hits) console.error(`✗ ${hit}`);
    console.error(given.fix ? "✗ the hits above have no automatic fix; edit them by hand" : `✗ "companygraph form ${root} --fix" rewrites these into the form`);
    return 1;
  }
  if (!files) console.log("✓ no Markdown file to hold to the form");
  else console.log(`✓ ${files} Markdown file${files === 1 ? "" : "s"} in the one form${given.fix ? ", fixed where they were not" : ""}`);
  return 0;
}

// What each upstream offers, from git ls-remote, or from the file COMPANYGRAPH_REMOTES names, which
// is how the tests answer for the network: an object of repository → { tags, head }, and a
// repository it does not name cannot be reached.
/** @returns {(repo: string) => import("../lib/pins.mjs").Remote} */
function remotes() {
  const fixed = process.env.COMPANYGRAPH_REMOTES;
  if (!fixed) return lsRemote;
  const answers = JSON.parse(readFileSync(fixed, "utf8"));
  return (repo) => answers[repo] ?? null;
}

// The pins one repository declares, each against its upstream now. A pin behind is intent until
// its owner says it is drift, so the report exits 0 when one is, and 1 only when pins.json cannot
// be read or an entry names no line in the file it names. It moves nothing.
/**
 * @param {string[]} argv
 * @returns {number}
 */
function pins(argv) {
  const root = flags(argv)._[0] ?? ".";
  const at = join(root, "pins.json");
  if (!existsSync(at)) {
    console.error(`✗ ${shown(root)} has no pins.json; "companygraph upgrade" writes one into an instance, and "companygraph adopt" into any other repository`);
    return 1;
  }
  let declared;
  try {
    declared = validatePins(JSON.parse(readFileSync(at, "utf8")));
  } catch (error) {
    console.error(`✗ ${at}: ${/** @type {Error} */ (error).message}`);
    return 1;
  }
  /** @type {Record<string, string>} */
  const texts = {};
  for (const file of new Set([...SCANNED, ...declared.pins.map((p) => p.file)]))
    if (existsSync(join(root, file))) texts[file] = readFileSync(join(root, file), "utf8");
  const { lines, failed } = pinReport({ declared, texts, remote: remotes() });
  const width = Math.max(0, ...lines.map((l) => l.status.length));
  /** @type {Record<string, (text: string) => string>} */
  const tone = { current: good, behind: accent, missing: bad };
  console.log(`Pins of ${shown(resolve(root))}`);
  for (const l of lines) {
    const status = (tone[l.status] ?? dim)(l.status.padEnd(width));
    const value = l.status === "family" ? "the family's own; its resync reads it" : `${l.pinned.join(", ") || "no line"}${l.newest && l.status === "behind" ? ` → ${l.newest}` : ""}`;
    console.log(`  ${status}  ${l.kind} ${l.repo} in ${l.file}: ${value}`);
  }
  if (!lines.length) console.log("  no pin is declared or found");
  return failed ? 1 : 0;
}

/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function check(argv) {
  const root = flags(argv)._[0] ?? ".";
  // A repository that took the machinery and holds no model is held to the form alone.
  const read = manifestSaid(root);
  if (!read) return 1;
  if (read.manifest && !read.manifest.core) return form([root]);
  // A second door to the same code, so a guard failure must read exactly as it does through
  // check-instance.mjs's own direct run — the "✗ " prefix and all — not as a generic CLI error.
  const { checkPath } = await import("./check-instance.mjs");
  let model;
  try {
    model = checkPath(root) > 0 ? 1 : 0;
  } catch (error) {
    console.error(`✗ ${/** @type {Error} */ (error).message}`);
    return 1;
  }
  // checkPath's guard has refused by here if it was going to, so the form, which holds the same
  // guard, runs only on a manifest that passed it and never says the same refusal twice.
  return Math.max(model, form([root]));
}

// The writing rules, asked of a judge. Advisory: it gates nothing and runs in no workflow, since
// a judge's answer can move between runs and a public repository's run cannot hold the key. It
// sends an instance's pages out of the machine, which for a private company is a decision about
// its data, so it names the service and every file, and sends only on a typed yes; nothing skips
// the question, and with no key it prints what it would ask and sends nothing.
/**
 * @param {string[]} argv
 * @returns {Promise<number>}
 */
async function judge(argv) {
  const options = flags(argv);
  const root = resolve(options._[0] ?? ".");
  const { instanceAt } = await import("../lib/history.mjs");
  const { questionsOf, reportOf, leftOutOf } = await import("../lib/questions.mjs");
  const judges = await import("./judges/typesafe.mjs");
  const instance = instanceAt(root);
  const questions = questionsOf(instance);
  const count = questions.asked.reduce((n, r) => n + r.questions.length, 0);
  console.log(`judge: ${count} questions about ${questions.asked.length} pages of ${root}, from the writing rules of its vendored core ${instance.core ?? "at an unnamed version"}`);
  const key = process.env.TYPESAFE_API_KEY;
  const digest = judges.digestOf(questions.asked);
  const size = questions.asked.reduce((n, r) => n + JSON.stringify(judges.toWire(r)).length, 0);
  /** @param {string} verb */
  const files = (verb) => {
    console.log(`\n${verb} these files of model/, whole, with the purposes of their schemas, to ${judges.SERVICE.name} (${judges.endpoint().host}, ${judges.SERVICE.model}), about ${Math.ceil(size / 4)} tokens in all:`);
    for (const r of questions.asked) console.log(`  model/${r.path}`);
    console.log(`digest: ${digest}`);
  };
  if (!key) {
    for (const r of questions.asked) {
      console.log(`\nmodel/${r.path}`);
      for (const q of r.questions)
        console.log(`  ${q.id}  ${q.kind === "rule" ? q.rule : `"${q.bullet}": one of ${Object.keys(q.options).join(", ")}`}`);
    }
    const left = leftOutOf(questions.skipped);
    if (left.length) console.log("\nleft out, for want of what they are about:\n" + left.join("\n"));
    files("This would send");
    console.log(`\nno TYPESAFE_API_KEY: nothing was sent. These are the questions a run with the key would send to ${judges.SERVICE.name}.`);
    return 0;
  }
  files("This sends");
  // The spec asks for a question every run and no setting that skips it. At a terminal the person
  // answers it there. Away from one, an agent may ask it in its own conversation and carry the
  // owner's yes here as the digest it showed them, which covers exactly these bytes, this model
  // and this endpoint; anything else piped in never sends a page to TypeSafe itself. Piped answers
  // count only where the tests point the tool at a fake service.
  if (options.consent !== undefined) {
    const given = options.consent.trim().toLowerCase();
    if (given !== digest) {
      console.error(`What would be sent has changed since the consent for ${given}: its digest is now ${digest}. Nothing was sent.`);
      return 1;
    }
  } else if (judges.isTypeSafe() && !process.stdin.isTTY) {
    console.log(`${judges.SERVICE.name} sends only on a yes typed at a terminal, and this is not one. Nothing was sent.`);
    console.log(`An agent that asked the owner passes their yes as --consent ${digest}.`);
    return 0;
  } else if (!yes(await ask(prompt("Send them?", "y/N")))) {
    console.log("Nothing was sent.");
    return 0;
  }
  /** @type {Map<string, import("../lib/questions.mjs").Answers | { error: string }>} */
  const answers = new Map();
  let refused = false;
  const queue = [...questions.asked];
  // Four at a time: well inside the service's request rate, and a few hundred pages in minutes.
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let r = queue.shift(); r && !refused; r = queue.shift()) {
      try {
        answers.set(r.path, await judges.ask(r, { key }));
      } catch (error) {
        if (error instanceof judges.KeyRefused) refused = true;
        answers.set(r.path, { error: /** @type {Error} */ (error).message });
      }
    }
  }));
  if (refused) {
    console.error(`${judges.SERVICE.name} refused the key in TYPESAFE_API_KEY; no report.`);
    return 1;
  }
  console.log("");
  for (const line of reportOf(questions, answers)) console.log(line);
  return 0;
}

// A path as a person types it at the prompt, where no shell expands `~` first.
/** @param {string} answer */
const typed = (answer) => (answer === "~" || answer.startsWith("~/") ? join(homedir(), answer.slice(1)) : answer);
/** @param {string} answer */
const yes = (answer) => /^y(es)?$/i.test(answer);

/**
 * @param {string} question
 * @param {string} [hint]
 */
const prompt = (question, hint) => `${accent("›")} ${bold(question)}${hint ? ` ${dim(`(${hint})`)}` : ""} `;

// A folder asked for, with `.` taken on Enter where there is a fallback and none asked for where a
// folder must be named.
/**
 * @param {string} question
 * @param {string} [fallback]
 * @returns {Promise<string>}
 */
async function folder(question, fallback) {
  const answer = typed(await ask(prompt(question, fallback ? "Enter for this folder" : "a path; it is made if it is missing")));
  if (answer) return answer;
  if (fallback) return fallback;
  throw new Error("no folder was given; nothing was done.");
}

// Refused is 3, not 1, so a hook can tell a refusal from a checker that could not run — offline,
// no npx, a release without this command — and let the second through with a sentence, since
// the pull request's check runs it again.
const REFUSED = 3;

// The first line of a pending commit's message that is neither blank nor a `#` comment git
// leaves below the trailers when an editor opened it; "" when the message has none. A literal
// "this commit" here would print twice over in the refusal below, once for the missing sha and
// once for the subject.
/** @param {string} messageFile */
function subjectOf(messageFile) {
  for (const line of readFileSync(messageFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) return trimmed;
  }
  return "";
}

/**
 * @param {string[]} argv
 * @returns {number}
 */
function commits(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  if (!given.range === !given.message) throw new Error("commits takes one of --range <a>..<b> or --message <file>");
  // Git is read from process.cwd(), the repository whose commit is being made or checked; the
  // instance is read from the folder argument, since a family repository with no model of its
  // own is governed by an instance that sits elsewhere.
  if (!gitTop(process.cwd())) throw new Error(`${process.cwd()} is not inside a git repository, so there is no commit to check`);
  if (!isInstance(root)) {
    console.log(`${shown(root)} is not an instance, so nothing governs these commits; nothing was checked`);
    return 0;
  }
  const governing = governingOf(readInstance(root));
  const found = given.message
    ? [{ sha: null, subject: subjectOf(given.message), ...pendingOf(process.cwd(), given.message) }]
    : logOf(process.cwd(), { range: given.range });
  let refused = 0;
  for (const c of found) {
    const { failures } = judgeCommit(governing, c);
    if (!failures.length) continue;
    refused++;
    for (const f of failures) console.error(`${bad("✗")} ${c.sha ? c.sha.slice(0, 7) : "this commit"} ${c.subject}: ${f}`);
  }
  if (refused) return REFUSED;
  console.log(`${good("✓")} commits: every seat names a phase of ${governing.name} that lists it`);
  return 0;
}

// Where the report looks is decided by what it finds, in the spec's order: a folder outside git
// has no history; a repository that vendors the family's conventions reads every member on this
// disk, and need not be an instance itself; any other reads itself, and must be one. It never
// clones: a member with no clone at its local path is named as not read.
const NO_ORG_INSTANCE = "no instance of its organization on this disk";

/**
 * @param {string[]} argv
 * @returns {number}
 */
function seats(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  const top = gitTop(root);
  if (!top) throw new Error(`${shown(root)} is not inside a git repository, so the model has no history to report on`);
  const since = given.since ?? SEATS_SINCE;
  const members = familyOf(top);
  if (!members && !isInstance(root)) throw new Error(`${shown(root)} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  // The instance the report is run from, when root is one — the reporting instance, whose
  // identity the tally also accepts as the owner's, distinct from a member's own governing
  // instance in a family. A family read from a folder that is no instance itself has none.
  const reportingIdentity = isInstance(root) ? governingOf(readInstance(root)) : null;
  /** @param {string} repo */
  const orgOf = (repo) => repo.split("/")[0];
  let /** @type {{ repo: string; path: string; governing: Governing }[]} */ targets, /** @type {{ repo: string; path: string; reason?: string }[]} */ unread;
  if (members) {
    // A member's local path is on disk only when it is itself a checkout's own top: a plain
    // folder sitting inside another checkout (nested by accident, or a build's own copy) has a
    // gitTop too, but it is that enclosing checkout's, and reporting by it would hand the member
    // history that never happened in its own path. realpath on both sides, since a symlinked temp
    // dir (macOS) or a short name (Windows) can render the same folder two ways.
    const onDisk = members.filter((m) => {
      const memberTop = gitTop(m.path);
      return Boolean(memberTop) && realpathSync.native(/** @type {string} */ (memberTop)) === realpathSync.native(m.path);
    });
    // A member is judged by the instance of its own organization, never by another's: the
    // member's own where it is one, else the first of its organization the table lists.
    const instances = onDisk.filter((m) => isInstance(m.path)).map((m) => ({ ...m, governing: governingOf(readInstance(m.path)) }));
    /** @param {{ repo: string }} m */
    const governs = (m) => (instances.find((i) => i.repo === m.repo) ?? instances.find((i) => orgOf(i.repo) === orgOf(m.repo)))?.governing;
    targets = onDisk.filter(governs).map((m) => ({ ...m, governing: /** @type {Governing} */ (governs(m)) }));
    unread = members.flatMap((m) =>
      !onDisk.includes(m) ? [{ repo: m.repo, path: m.path }] : governs(m) ? [] : [{ repo: m.repo, path: m.path, reason: NO_ORG_INSTANCE }]);
  } else {
    targets = [{ repo: basename(top), path: top, governing: governingOf(readInstance(root)) }];
    unread = [];
  }
  // name/ownerName are read here, not by judgeCommit: the report alone counts a pre-rule commit
  // whose author's name equals its own instance's identity as the owner's, and each commit is
  // read against its own repository's governing instance, since a family report can span more
  // than one.
  const judged = targets.flatMap((m) => logOf(m.path, { since }).map((c) => ({ repo: m.repo, email: c.email, name: c.name, ownerName: m.governing.name, judgement: judgeCommit(m.governing, c) })));
  /** @type {Parameters<typeof renderReport>[0]} */
  const report = { scope: members ? "family" : "repository", since, read: targets.map((m) => m.repo), unread, ...tally(judged, reportingIdentity) };
  console.log(given.json ? JSON.stringify(report, null, 2) : renderReport(report));
  return 0;
}

// R18. `--backfill` gives every page without an id one stamped with its first commit and writes
// model/identifier.md where there is none; `--range` fails a change to an id on the default
// branch and, on an instance, a decision rewritten or deleted and a label moved or used again,
// compared after the form, except where the range changes the vendored schema that governs the
// check, which it says in one line.
// A folder that holds core/ and is not an instance is the repository that makes core, and both
// work on its schemas instead; `--core` already names a tag, so what the folder holds is what
// tells the two apart.
//
// Refused is 3, not 1, so a caller such as a hook can tell a refusal — a `--range` that changed
// an id already on the default branch or a page it holds as written, or a `--backfill` that a
// declared `pattern` format or an unreadable identifier file refuses — from a run that could not
// happen at all: not an instance, neither flag, a malformed range, or a git failure, each of
// which is 1.
/**
 * @param {string[]} argv
 * @returns {number}
 */
function ids(argv) {
  const given = flags(argv);
  const root = resolve(given._[0] ?? ".");
  const onCore = !isInstance(root) && existsSync(join(root, "core", "CONVENTIONS.md"));
  if (!onCore && !isInstance(root)) {
    console.error(`✗ ${root} is not an instance: it has no .companygraph/manifest.json beside a model/ folder, and no core/CONVENTIONS.md`);
    return 1;
  }
  const folder = onCore ? "core" : "model";
  // The packs the instance took, so a page of a pack's type is known as a core page is: given its
  // id by the backfill, and held by the range's checks of what a change may do to it.
  /** @type {{ units?: string, packs?: string[] }} */
  let manifest = {};
  try {
    manifest = (!onCore && manifestAt(root)) || {};
  } catch (error) {
    console.error(`✗ ${/** @type {Error} */ (error).message}`);
    return 1;
  }
  const units = manifest.units ?? "meta";
  const { types, schemaOf } = vocabularyOf({ core: `${units}/core`, packs: (manifest.packs ?? []).map((/** @type {string} */ name) => ({ name, dir: `${units}/${name}` })) });
  if (given.backfill) {
    /** @type {Map<string, string>} */
    const files = new Map();
    /** @param {string} rel */
    const walk = (rel) => {
      for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
        const child = `${rel}/${entry.name}`;
        if (entry.isDirectory()) walk(child);
        else if (entry.name.endsWith(".md")) files.set(child, unixLines(readFileSync(join(root, child), "utf8")));
      }
    };
    walk(folder);
    const top = gitTop(root);
    /** @param {string} rel */
    const firstCommitMs = (rel) => (top ? firstCommitMsOf(root, rel) : null);
    const writes = /** @type {Map<string, string> & { refused?: string }} */ (onCore ? schemaBackfillPlan(files, { firstCommitMs }) : backfillPlan(files, { firstCommitMs, types }));
    if (writes.refused) {
      console.error(`✗ ${writes.refused}`);
      return REFUSED;
    }
    writePlan(root, writes);
    const what = onCore ? "schema" : "page";
    console.log(`✓ ${writes.size ? `wrote an id into ${writes.size === 1 ? `one ${what}` : `each ${what} listed`}` : `every ${what} already carries an id`}`);
    for (const path of writes.keys()) console.log(`  ${path}`);
    return 0;
  }
  if (given.range) {
    // Two dots between two commits and nothing else: a three-dot range asks git for the change
    // since the merge base, which is not the base whose ids this compares against, and split on
    // ".." it would read its head as ".<head>".
    const ends = given.range.split("..");
    if (given.range.includes("...") || ends.length !== 2 || !ends[0] || !ends[1]) {
      console.error(`✗ --range takes <a>..<b>, two dots between two commits; "${given.range}" is not that`);
      return 1;
    }
    // A full commit name is shortened to seven characters for a reader; a branch name is kept.
    const base = /^[0-9a-f]{40}$/.test(ends[0]) ? ends[0].slice(0, 7) : ends[0];
    const changes = changedPagesOf(root, given.range, folder);
    const failures = idChangesOf(changes, base);
    // An instance's pages are held to what a change may do to them as well: a decision is kept
    // as written and never deleted, and a label stays with its item and is never used again. The
    // repository that makes core ranges over schemas, which carry neither. These two read what
    // the branch did, from where it branched: from a base tip that moved on since, a decision main
    // added would read as one the branch deleted. The id check stays on the range as given, since
    // its base is the ids the default branch holds now.
    /** @type {string[]} */
    const notes = [];
    // A check every one of whose types stands aside is left out of the tick's line.
    let keptHeld = !onCore, labelsHeld = !onCore;
    if (!onCore) {
      // Where the two ends hold no commit in common there is no branch point to read from: in a
      // shallow clone because the history that holds it was not fetched, and otherwise because
      // the two are unrelated. Said in one line, as a git failure, and not as git's own message.
      let fork;
      try {
        fork = mergeBaseOf(root, ends[0], ends[1]);
      } catch {
        console.error(`✗ ${ends[0]} and ${ends[1]} have no commit in common here, so where the branch began cannot be read; in a shallow clone, fetch its full history (fetch-depth: 0) and run again`);
        return 1;
      }
      // A release that changes the vendored schema governing one of these checks, the decision
      // schema or a schema whose type declares labels, may reshape the pages that check holds in
      // the same range, which the check would refuse with no way through. Where the range changes
      // that schema and moves the version of the unit it is vendored from, core's or its pack's,
      // the check stands aside for that type and says so: a release is what changes a schema
      // here, and a hand edit of one with the version where it was is held like any page. Any
      // other upgrade, re-pin or resync is held as always, and the id check always runs.
      const governed = types.filter((t) => t.kept || t.labels);
      const changedSchemas = changedFilesOf(root, fork, ends[1], governed.map((t) => schemaOf(t.type)));
      const released = (/** @type {{ dir: string }} */ t) => {
        const at = `${t.dir}/manifest.json`;
        const before = versionAt(root, fork, at), after = versionAt(root, ends[1], at);
        return after !== null && before !== after;
      };
      /** @type {import("../lib/checks.mjs").TypeEntry[]} */
      const held = types.map((t) => {
        if (!(t.kept || t.labels) || !changedSchemas.has(schemaOf(t.type)) || !released(t)) return t;
        notes.push(`  the ${t.type} schema changed in this range: ${t.type}${t.kept ? "" : " label"} text not held`);
        const { kept, labels, ...rest } = t;
        return rest;
      });
      keptHeld = held.some((t) => t.kept) || !types.some((t) => t.kept);
      labelsHeld = held.some((t) => t.labels) || !types.some((t) => t.labels);
      const own = `${fork}..${ends[1]}`;
      // Where the base given is the branch point, by name or by commit, the pages already read are
      // the ones the branch changed, and are not read again.
      const givenBase = spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ends[0]}^{commit}`], { cwd: root, encoding: "utf8" }).stdout?.trim();
      const branched = givenBase === fork ? changes : changedPagesOf(root, own, folder);
      // Both sides of every page these two compare are put in the family's Markdown form first,
      // in one run of the tool, so a change the form makes anyway is not read as a rewrite or a
      // move. Where the tool cannot run, the pages are compared as written, and the command says so.
      const compared = branched.filter((c) => [c.before, c.after].some((p) => {
        const entry = held.find((t) => t.type === typeOfPath(p, folder, held));
        return Boolean(entry?.kept || entry?.labels);
      }));
      /** @type {Map<string, string>} */
      const texts = new Map(compared.flatMap((c) => [[`base/${c.before}`, c.beforeText], [`head/${c.after}`, c.afterText]]));
      const { formatted, error } = formattedOf(texts);
      if (error) notes.push(`  the Markdown form could not be applied, so decision and label text is compared as written: ${error.split("\n")[0]}`);
      const pages = branched.map((c) => (compared.includes(c) ? { ...c, beforeText: formatted.get(`base/${c.before}`) ?? c.beforeText, afterText: formatted.get(`head/${c.after}`) ?? c.afterText } : c));
      // Their refusals name the commit they compared from, the branch point, and not the base.
      const from = fork.slice(0, 7);
      failures.push(
        // A name a decision carries may follow the entity it names, read against the schema the
        // instance vendored and the model where the branch began and where it ends.
        ...keptChangesOf(pages, deletedPagesOf(root, own, folder), from, {
          types: held,
          schemaOf: (type) => (existsSync(join(root, schemaOf(type))) ? readFileSync(join(root, schemaOf(type)), "utf8") : null),
          treeOf: (side) => treeAt(root, side === "base" ? fork : ends[1], folder),
        }),
        ...labelChangesOf(pages, from, { types: held, historyOf: (c) => pageHistoryOf(root, fork, c.before) }),
      );
    }
    if (failures.length) {
      for (const f of failures) console.error(`✗ ${f}`);
      for (const n of notes) console.error(n);
      return REFUSED;
    }
    const clauses = ["no id on the default branch changed"];
    if (keptHeld) clauses.push("no page kept as written was rewritten or removed");
    if (labelsHeld) clauses.push("no label moved or came back");
    console.log(`✓ ${clauses.length > 2 ? `${clauses.slice(0, -1).join(", ")}, and ${clauses.at(-1)}` : clauses.join(" and ")}`);
    for (const n of notes) console.log(n);
    return 0;
  }
  console.error("✗ ids needs --backfill or --range <a>..<b>");
  return 1;
}

/** @returns {Promise<number>} */
async function menu() {
  /** @type {[string, string, () => Promise<number>][]} */
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
    ["Report by seat", "the history's commits, by the seat that made them", async () => {
      const root = await folder("Which model?", ".");
      return seats([root]);
    }],
    ["Hold a repository", "a site or service with no model: the form check, its workflow and the seat hook", async () => {
      adopt([await folder("Which folder?", ".")]);
      return 0;
    }],
    ["Report pins", "which of a repository's pins are behind; nothing moves", async () => pins([await folder("Which folder?", ".")])],
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
  /** @type {[string, boolean, string] | null} */
  let latest = null;
  for (;;) {
    if (SCREEN) clear();
    console.log(`\n${banner()}\n`);
    if (latest) console.log(`${panel(...latest)}\n`);
    entries.forEach(([label, what], i) => console.log(`  ${accent(i + 1)}  ${label.padEnd(width)}  ${dim(what)}`));
    console.log(`  ${accent(entries.length + 1)}  ${"Quit".padEnd(width)}  ${dim("or q, or Ctrl+C")}`);
    console.log();
    const pick = await ask(prompt(`Pick 1-${entries.length + 1}`, "b or Ctrl+C at any question comes back here"));
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
    let back = false;
    try {
      if (!entry) throw new Error(`${pick} is not one of 1-${entries.length + 1}; nothing was done.`);
      inPick = true;
      code = await entry[2]();
    } catch (error) {
      if (error instanceof Back) {
        back = true;
        code = 0;
        console.log(`\n  back to the menu; what was written before stays`);
      } else {
        console.error(`${bad("✗")} ${error instanceof Error ? error.message : String(error)}`);
        code = 1;
      }
    } finally {
      inPick = false;
    }
    if (record) latest = [back ? `${label} · back` : label, code === 0, record.join("")];
    record = null;
    if (!SCREEN) console.log();
  }
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "init") await init(rest);
  else if (command === "upgrade") await upgrade(rest);
  else if (command === "adopt") adopt(rest);
  else if (command === "obsidian") await obsidian(rest);
  else if (command === "check") process.exitCode = await check(rest);
  else if (command === "judge") process.exitCode = await judge(rest);
  else if (command === "form") process.exitCode = form(rest);
  else if (command === "pins") process.exitCode = pins(rest);
  else if (command === "commits") process.exitCode = commits(rest);
  else if (command === "seats") process.exitCode = seats(rest);
  else if (command === "id") console.log(uuidv7());
  else if (command === "ids") process.exitCode = ids(rest);
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
  /** @type {ReturnType<typeof createInterface> | null} */ (reader)?.close();
}
