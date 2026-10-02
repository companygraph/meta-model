// The one Markdown form, held by markdownlint-cli2 at the version below with the rules in form/,
// over every Markdown file of a repository. It is the family's form, taken out of
// robertblust/conventions so that a repository outside the family is held to it the same way:
// the same tool, the same version and the same rules give the same bytes, whoever wrote the file.
//
// The checker has had no dependencies, and this is the one place it takes one, on purpose: a
// form held by one tool in CI and another in the editor is two forms, and markdownlint is the
// library an editor plugin bundles. A development checkout has it in node_modules from `npm ci`,
// and a release run from a tag, which installs no devDependencies, fetches it with npx, so the
// first run needs the network and later ones use npx's cache.
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const FORM_VERSION = "0.23.2";
export const FORM_CONFIG = join(HERE, "..", "form", ".markdownlint-cli2.jsonc");

// Never read: git's own folder, installed packages at any depth, and the checker the reusable
// workflows check out inside the repository, whose Markdown is meta-model's and held there.
const NEVER = new Set([".git", "node_modules", ".companygraph-checker"]);

/**
 * Every Markdown file under `root` the form holds, relative to it with `/`, sorted: all but the
 * folders above, the paths in `exclude`, and what git ignores, which is scratch and not the
 * repository's Markdown. A file that is new and not ignored is read, since it is on its way in.
 * @param {string} root
 * @param {string[]} [exclude]
 * @returns {string[]}
 */
export function markdownFilesOf(root, exclude = []) {
  const skip = new Set(exclude.map((path) => path.replace(/\/+$/, "")));
  /** @type {string[]} */
  const found = [];
  /** @param {string} rel */
  const walk = (rel) => {
    for (const entry of readdirSync(join(root, rel || "."), { withFileTypes: true })) {
      const child = rel ? `${rel}/${entry.name}` : entry.name;
      if (skip.has(child)) continue;
      if (entry.isDirectory()) {
        if (!NEVER.has(entry.name)) walk(child);
      } else if (entry.isFile() && entry.name.endsWith(".md")) found.push(child);
    }
  };
  walk("");
  found.sort();
  const ignored = ignoredOf(root, found);
  return found.filter((path) => !ignored.has(path));
}

// What git ignores of `files`. Outside a repository, or with no git, nothing is: the walk is then
// the whole tree, so a plain folder is still held to the form. core.quotePath is off because git
// C-quotes a path with a non-ASCII byte, and a quoted path matches nothing in the list it came from.
/**
 * @param {string} root
 * @param {string[]} files
 * @returns {Set<string>}
 */
function ignoredOf(root, files) {
  if (!files.length) return new Set();
  const run = spawnSync("git", ["-c", "core.quotePath=false", "check-ignore", "--stdin"], { cwd: root, input: `${files.join("\n")}\n`, encoding: "utf8" });
  return run.status === 0 ? new Set(run.stdout.split("\n").filter(Boolean)) : new Set();
}

// How markdownlint-cli2 is run: from this checkout's node_modules when it holds the pinned
// version, else through npx at that version. npx is run as npm's own script beside the running
// Node where it is there, so Windows needs no shell to start `npx.cmd`; else by name.
/** @returns {{ command: string; args: string[] }} */
export function linterOf() {
  const local = join(HERE, "..", "node_modules", "markdownlint-cli2");
  if (existsSync(join(local, "package.json"))) {
    const pkg = JSON.parse(readFileSync(join(local, "package.json"), "utf8"));
    const bin = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.["markdownlint-cli2"];
    if (pkg.version === FORM_VERSION && bin) return { command: process.execPath, args: [join(local, bin)] };
  }
  const npx = [
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js"),
    join(dirname(process.execPath), "..", "lib", "node_modules", "npm", "bin", "npx-cli.js"),
  ].find((path) => existsSync(path));
  const tool = ["--yes", `markdownlint-cli2@${FORM_VERSION}`];
  return npx ? { command: process.execPath, args: [npx, ...tool] } : { command: "npx", args: tool };
}

/**
 * The form over a repository: the files it held, one hit per rule and line as `path:line: RULE`,
 * and `error` when the tool could not be run or failed without naming a file. With `fix`, every
 * hit markdownlint can write is written first, in three passes at most, since two fixes on one
 * line are applied one per pass.
 * @param {string} root
 * @param {{ exclude?: string[]; fix?: boolean }} [options]
 * @returns {{ files: number; hits: string[]; error?: string }}
 */
export function formCheck(root, { exclude = [], fix = false } = {}) {
  const files = markdownFilesOf(root, exclude);
  if (!files.length) return { files: 0, hits: [] };
  // markdownlint-cli2 reads a configuration file in every folder that holds a file it lints and
  // in each folder above it up to where it runs, and merges what it finds over --config, and no
  // flag turns that off. A repository's own .markdownlint* files would then change the form, so
  // the tool runs over a copy of the Markdown alone in a fresh folder, where the only
  // configuration is the form's. Paths in the copy are the repository's, so hits read the same.
  const copy = mkdtempSync(join(tmpdir(), "companygraph-form-"));
  try {
    for (const path of files) {
      mkdirSync(dirname(join(copy, path)), { recursive: true });
      copyFileSync(join(root, path), join(copy, path));
    }
    const { command, args } = linterOf();
    // A leading colon makes each path literal, so a name with brackets is the file, not a glob.
    /** @param {string[]} extra */
    const lint = (extra) =>
      spawnSync(command, [...args, ...extra, "--config", FORM_CONFIG, ...files.map((path) => `:${path}`)], { cwd: copy, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (fix) {
      for (let pass = 0; pass < 3; pass++) if (lint(["--fix"]).status === 0) break;
      // Only a file the fix changed is written back, so the others keep their times.
      for (const path of files) {
        const fixed = readFileSync(join(copy, path));
        if (!fixed.equals(readFileSync(join(root, path)))) writeFileSync(join(root, path), fixed);
      }
    }
    return reportOf(files.length, lint([]));
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

/**
 * What one run of the tool says, as formCheck returns it.
 * @param {number} files
 * @param {import("node:child_process").SpawnSyncReturns<string>} run
 * @returns {{ files: number; hits: string[]; error?: string }}
 */
function reportOf(files, run) {
  if (run.error) return { files, hits: [], error: `markdownlint-cli2 ${FORM_VERSION} could not be run: ${run.error.message}` };
  if (run.status === 0) return { files, hits: [] };
  const said = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  // The tool reports a table once per pipe; a reader wants the line once per rule.
  const hits = [...new Set([...said.matchAll(/^(.*\.md:\d+)(?::\d+)? error ([A-Za-z0-9/-]+)/gm)].map((m) => `${m[1]}: ${m[2]}`))];
  if (!hits.length) return { files, hits: [], error: `markdownlint-cli2 ${FORM_VERSION} exited ${run.status} and named no file:\n${said.trim()}` };
  return { files, hits };
}
