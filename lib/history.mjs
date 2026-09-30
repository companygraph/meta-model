// What `commits` and `seats` read from outside themselves: git's own account of a commit and of
// its trailers, an instance from disk, and the family as conventions lists it. Everything that
// decides lives in lib/seats.mjs; this file only reads. Trailers are git's to parse, never a
// regular expression's, so a commit is judged on exactly what `git log` would show a person.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, sep } from "node:path";
import { parseInstance } from "./instance.mjs";
import { IMAGE_FILE } from "./checks.mjs";
import { unixLines } from "./instance-files.mjs";
/** @import { InstanceFiles, InstanceGraph } from "./instance.mjs" */
/** @import { Trailers } from "./seats.mjs" */

/**
 * A commit as `commits` and `seats` read it from git.
 * @typedef {object} Commit
 * @property {string} sha
 * @property {string} name
 * @property {string} email
 * @property {string} subject
 * @property {Trailers} trailers
 */
/**
 * A member of the family, and where its clone sits on this machine.
 * @typedef {object} Member
 * @property {string} repo
 * @property {string} path
 */

/** @param {string} cwd @param {string[]} args */
const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });

/**
 * @param {string} dir
 * @returns {string | null}
 */
export function gitTop(dir) {
  try {
    return git(dir, ["rev-parse", "--show-toplevel"]).trim() || null;
  } catch {
    return null;
  }
}

/** @type {(dir: string) => boolean} */
export const isInstance = (dir) => existsSync(join(dir, ".companygraph", "manifest.json")) && existsSync(join(dir, "model"));

/**
 * @param {string} base
 * @returns {InstanceFiles}
 */
function filesUnder(base) {
  /** @type {InstanceFiles} */
  const files = new Map();
  /** @param {string} dir */
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else files.set(relative(base, full).split(sep).join("/"), IMAGE_FILE.test(entry) ? readFileSync(full) : unixLines(readFileSync(full, "utf8")));
    }
  };
  walk(base);
  return files;
}

/**
 * @param {string} dir
 * @returns {InstanceGraph}
 */
export function readInstance(dir) {
  if (!isInstance(dir)) throw new Error(`${dir} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const manifest = JSON.parse(readFileSync(join(dir, ".companygraph", "manifest.json"), "utf8"));
  return parseInstance(filesUnder(join(dir, "model")), { schemas: /** @type {Map<string, string>} */ (filesUnder(join(dir, manifest.units ?? "meta", "core"))) });
}

/** @param {string} key */
const TRAILER = (key) => `%(trailers:key=${key},valueonly,unfold,separator=%x1e)`;
/** @param {string | undefined} value */
const split = (value) => (value ? value.split("\x1e").map((v) => v.trim()).filter(Boolean) : []);

// git's own date parser reads a bare `YYYY-MM-DD` that names *today* as "right now" rather than
// that day's midnight, which would silently drop every commit already made today; anchoring it
// at midnight makes `--since <date>` mean the whole day regardless of which day it is run on. A
// value that already carries a time, or is not a bare date at all, is passed through as given.
/** @param {string} value */
const atMidnight = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 00:00:00` : value);

/**
 * @param {string} cwd
 * @param {{ range?: string | undefined; since?: string | undefined }} [options]
 * @returns {Commit[]}
 */
export function logOf(cwd, { range, since } = {}) {
  // A repository with no commit yet has no HEAD, and `git log` fails on it; it has no history.
  if (!range) {
    try {
      git(cwd, ["rev-parse", "--verify", "-q", "HEAD"]);
    } catch {
      return [];
    }
  }
  const format = ["%H", "%an", "%ae", "%s", TRAILER("Process"), TRAILER("Phase"), TRAILER("Track")].join("%x1f");
  const args = ["log", "-z", `--format=${format}`];
  if (since) args.push(`--since=${atMidnight(since)}`);
  args.push(range ?? "HEAD");
  const out = git(cwd, args);
  return out.split("\0").filter((r) => r.trim()).map((record) => {
    const [sha, name, email, subject, process, phase, track] = record.replace(/^\n/, "").split("\x1f");
    return { sha, name, email, subject, trailers: { process: split(process), phase: split(phase), track: split(track) } };
  });
}

/**
 * @param {string} cwd
 * @param {string} messageFile
 * @returns {{ name: string; email: string; trailers: Trailers }}
 */
export function pendingOf(cwd, messageFile) {
  const ident = git(cwd, ["var", "GIT_AUTHOR_IDENT"]).trim();
  const m = ident.match(/^(.*) <([^>]*)>/);
  /** @type {Trailers} */
  const trailers = { process: [], phase: [], track: [] };
  for (const line of git(cwd, ["interpret-trailers", "--parse", messageFile]).split("\n")) {
    const t = line.match(/^([^:]+):\s*(.*)$/);
    const key = t?.[1].trim().toLowerCase();
    if (key && key in trailers && /** @type {RegExpMatchArray} */ (t)[2].trim()) trailers[/** @type {keyof Trailers} */ (key)].push(/** @type {RegExpMatchArray} */ (t)[2].trim());
  }
  return { name: m?.[1] ?? "", email: m?.[2] ?? "", trailers };
}

/**
 * @param {string} top
 * @returns {Member[] | null}
 */
export function familyOf(top) {
  const list = join(top, "conventions", "REPOSITORIES.md");
  if (!existsSync(join(top, "conventions.json")) || !existsSync(list)) return null;
  /** @type {Member[]} */
  const members = [];
  for (const line of readFileSync(list, "utf8").split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 5 || !/^[\w.-]+\/[\w.-]+$/.test(cells[0])) continue;
    const local = cells[cells.length - 1];
    members.push({ repo: cells[0], path: local.startsWith("~/") ? join(homedir(), local.slice(2)) : local });
  }
  return members;
}
