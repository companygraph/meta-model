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

// An instance as `judge` needs it: the parsed graph, the pages it was parsed from, keyed relative
// to `model/`, and the schemas the instance vendored, which is where its rules are read from.
/**
 * @param {string} dir
 * @returns {{ graph: InstanceGraph; files: InstanceFiles; schemas: Map<string, string>; core: string | null }}
 */
export function instanceAt(dir) {
  if (!isInstance(dir)) throw new Error(`${dir} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const manifest = JSON.parse(readFileSync(join(dir, ".companygraph", "manifest.json"), "utf8"));
  const units = manifest.units ?? "meta";
  const schemas = /** @type {Map<string, string>} */ (filesUnder(join(dir, units, "core")));
  // A pack the instance took is read beside core, its schemas keyed `<pack>/<type>-schema.md`
  // as `parseSchemas` reads them (R20); without them a pack's page meets R13.
  for (const pack of manifest.packs ?? [])
    for (const [file, text] of filesUnder(join(dir, units, pack))) schemas.set(`${pack}/${file}`, /** @type {string} */ (text));
  const files = filesUnder(join(dir, "model"));
  return { graph: parseInstance(files, { schemas }), files, schemas, core: manifest.core?.version ?? null };
}

/**
 * @param {string} dir
 * @returns {InstanceGraph}
 */
export const readInstance = (dir) => instanceAt(dir).graph;

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
 * A page a range modified or renamed: its path and text at the range's base and at its head.
 * @typedef {{ before: string; after: string; beforeText: string; afterText: string }} PageChange
 */

// The author time of a file's first commit, followed across renames, in milliseconds; null when
// the file has none, as a page not yet committed has not. A shallow clone answers with its own
// first commit, so the backfill is run in a full clone.
/**
 * @param {string} cwd
 * @param {string} rel
 * @returns {number | null}
 */
export function firstCommitMsOf(cwd, rel) {
  try {
    const out = git(cwd, ["log", "--follow", "--diff-filter=A", "--format=%at", "--", rel]).trim().split("\n").filter(Boolean);
    return out.length ? Number(out[out.length - 1]) * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * A page a range deleted: its path and text at the range's base.
 * @typedef {{ before: string; beforeText: string }} DeletedPage
 */

// What git says a range did to each file under the container, as status and paths: one path for
// a modification, an addition or a deletion, two for a rename or a copy.
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @param {string} model
 * @returns {{ status: string; paths: string[] }[]}
 */
function nameStatusOf(cwd, a, b, model) {
  const out = git(cwd, ["diff", "--name-status", "-z", "-M", a, b, "--", `${model}/`]).split("\0").filter(Boolean);
  /** @type {{ status: string; paths: string[] }[]} */
  const entries = [];
  for (let i = 0; i < out.length; ) {
    const status = out[i++];
    const two = status.startsWith("R") || status.startsWith("C");
    entries.push({ status, paths: two ? [out[i++], out[i++]] : [out[i++]] });
  }
  return entries;
}

// The pages under the container a range modified or renamed, each as it was at the range's base
// and as it is at its head. Git's rename detection pairs a renamed page with its old path, which
// is what lets a rename that also changed the id be seen as one entity changing its id.
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {PageChange[]}
 */
export function changedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  /** @type {PageChange[]} */
  const changes = [];
  for (const { status, paths } of nameStatusOf(cwd, a, b, model)) {
    if (status === "M" && paths[0].endsWith(".md"))
      changes.push({ before: paths[0], after: paths[0], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]), afterText: git(cwd, ["show", `${b}:${paths[0]}`]) });
    else if (status.startsWith("R") && paths[1].endsWith(".md"))
      changes.push({ before: paths[0], after: paths[1], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]), afterText: git(cwd, ["show", `${b}:${paths[1]}`]) });
  }
  return changes;
}

// The pages under the container a range deleted, each as it was at the range's base. A page a
// range renamed is a change, not a deletion, by the same rename detection.
/**
 * @param {string} cwd
 * @param {string} range
 * @param {string} [model]
 * @returns {DeletedPage[]}
 */
export function deletedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  return nameStatusOf(cwd, a, b, model)
    .filter(({ status, paths }) => status === "D" && paths[0].endsWith(".md"))
    .map(({ paths }) => ({ before: paths[0], beforeText: git(cwd, ["show", `${a}:${paths[0]}`]) }));
}

// Where `b` branched from `a`: the newest commit both histories hold. A pull request's range runs
// from its base branch's tip when the event fired, which on a branch behind its base is past
// where it branched, so what the branch did is read from here and not from that tip.
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @returns {string}
 */
export function mergeBaseOf(cwd, a, b) {
  return git(cwd, ["merge-base", a, b]).trim();
}

// Which of `paths` a range changed: the files git names between its two ends, a rename's either
// side included, relative to `cwd` as `paths` are. The range reads it for the vendored schemas
// that govern its checks of what a change may do to a page, since a release that changes one may
// reshape those pages with it.
/**
 * @param {string} cwd
 * @param {string} a
 * @param {string} b
 * @param {string[]} paths
 * @returns {Set<string>}
 */
export function changedFilesOf(cwd, a, b, paths) {
  if (!paths.length) return new Set();
  return new Set(git(cwd, ["-c", "core.quotePath=false", "diff", "--name-only", "--relative", a, b, "--", ...paths]).split("\n").filter(Boolean));
}

// Every Markdown page under the container at one commit, path to text, read in one `cat-file`
// pass rather than a `git show` a page: what a name a page carries is resolved against at that
// commit. Line ends are git's, `\n`.
/**
 * @param {string} cwd
 * @param {string} rev
 * @param {string} [model]
 * @returns {Map<string, string>}
 */
export function treeAt(cwd, rev, model = "model") {
  /** @type {Map<string, string>} */
  const tree = new Map();
  const listed = git(cwd, ["ls-tree", "-r", "-z", "--full-name", rev, "--", `${model}/`]).split("\0").filter(Boolean)
    .map((line) => line.match(/^\S+ blob (\S+)\t(.+)$/s))
    .filter((m) => m !== null && m[2].endsWith(".md"))
    .map((m) => ({ sha: /** @type {RegExpMatchArray} */ (m)[1], path: /** @type {RegExpMatchArray} */ (m)[2] }));
  if (!listed.length) return tree;
  const out = execFileSync("git", ["cat-file", "--batch"], { cwd, input: listed.map((e) => e.sha).join("\n") + "\n", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });
  let at = 0;
  for (const { path } of listed) {
    const eol = out.indexOf(0x0a, at);
    const size = Number(out.subarray(at, eol).toString("utf8").split(" ")[2]);
    tree.set(path, unixLines(out.subarray(eol + 1, eol + 1 + size).toString("utf8")));
    at = eol + 1 + size + 1;
  }
  return tree;
}

// Every earlier text of a page, from the history of `rev` and followed across renames: what it
// said at each commit that touched it, newest first. A commit that deleted it holds no text and is
// passed over. The instance workflow fetches the whole history; a shallow clone reads less.
/**
 * @param {string} cwd
 * @param {string} rev
 * @param {string} rel
 * @returns {string[]}
 */
export function pageHistoryOf(cwd, rev, rel) {
  let out;
  try {
    out = git(cwd, ["log", "--follow", "--format=%x00%H", "--name-only", rev, "--", rel]);
  } catch {
    return [];
  }
  /** @type {string[]} */
  const texts = [];
  for (const record of out.split("\0").filter((r) => r.trim())) {
    const [sha, ...paths] = record.split("\n").map((l) => l.trim()).filter(Boolean);
    const path = paths[paths.length - 1];
    if (!sha || !path) continue;
    try {
      texts.push(git(cwd, ["show", `${sha}:${path}`]));
    } catch {
      // deleted at this commit: no text to read
    }
  }
  return texts;
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
