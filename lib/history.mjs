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

const git = (cwd, args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 256 * 1024 * 1024 });

export function gitTop(dir) {
  try {
    return git(dir, ["rev-parse", "--show-toplevel"]).trim() || null;
  } catch {
    return null;
  }
}

export const isInstance = (dir) => existsSync(join(dir, ".companygraph", "manifest.json")) && existsSync(join(dir, "model"));

function filesUnder(base) {
  const files = new Map();
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

export function readInstance(dir) {
  if (!isInstance(dir)) throw new Error(`${dir} is not an instance: it has no .companygraph/manifest.json beside a model/ folder`);
  const manifest = JSON.parse(readFileSync(join(dir, ".companygraph", "manifest.json"), "utf8"));
  return parseInstance(filesUnder(join(dir, "model")), { schemas: filesUnder(join(dir, manifest.units ?? "meta", "core")) });
}

const TRAILER = (key) => `%(trailers:key=${key},valueonly,unfold,separator=%x1e)`;
const split = (value) => (value ? value.split("\x1e").map((v) => v.trim()).filter(Boolean) : []);

// git's own date parser reads a bare `YYYY-MM-DD` that names *today* as "right now" rather than
// that day's midnight, which would silently drop every commit already made today; anchoring it
// at midnight makes `--since <date>` mean the whole day regardless of which day it is run on. A
// value that already carries a time, or is not a bare date at all, is passed through as given.
const atMidnight = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value} 00:00:00` : value);

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

export function pendingOf(cwd, messageFile) {
  const ident = git(cwd, ["var", "GIT_AUTHOR_IDENT"]).trim();
  const m = ident.match(/^(.*) <([^>]*)>/);
  const trailers = { process: [], phase: [], track: [] };
  for (const line of git(cwd, ["interpret-trailers", "--parse", messageFile]).split("\n")) {
    const t = line.match(/^([^:]+):\s*(.*)$/);
    const key = t?.[1].trim().toLowerCase();
    if (key && key in trailers && t[2].trim()) trailers[key].push(t[2].trim());
  }
  return { name: m?.[1] ?? "", email: m?.[2] ?? "", trailers };
}

// The author time of a file's first commit, followed across renames, in milliseconds; null when
// the file has none, as a page not yet committed has not. A shallow clone answers with its own
// first commit, so the backfill is run in a full clone.
export function firstCommitMsOf(cwd, rel) {
  try {
    const out = git(cwd, ["log", "--follow", "--diff-filter=A", "--format=%at", "--", rel]).trim().split("\n").filter(Boolean);
    return out.length ? Number(out[out.length - 1]) * 1000 : null;
  } catch {
    return null;
  }
}

// The pages under the container a range modified or renamed, each as it was at the range's base
// and as it is at its head. Git's rename detection pairs a renamed page with its old path, which
// is what lets a rename that also changed the id be seen as one entity changing its id.
export function changedPagesOf(cwd, range, model = "model") {
  const [a, b] = range.split("..");
  const out = git(cwd, ["diff", "--name-status", "-z", "-M", a, b, "--", `${model}/`]).split("\0").filter(Boolean);
  const changes = [];
  for (let i = 0; i < out.length; ) {
    const status = out[i++];
    if (status === "M") {
      const p = out[i++];
      if (p.endsWith(".md")) changes.push({ before: p, after: p, beforeText: git(cwd, ["show", `${a}:${p}`]), afterText: git(cwd, ["show", `${b}:${p}`]) });
    } else if (status.startsWith("R")) {
      const from = out[i++], to = out[i++];
      if (to.endsWith(".md")) changes.push({ before: from, after: to, beforeText: git(cwd, ["show", `${a}:${from}`]), afterText: git(cwd, ["show", `${b}:${to}`]) });
    } else if (status.startsWith("C")) i += 2;
    else i += 1;
  }
  return changes;
}

// A file as one revision holds it, `\n` line ends as every hash and check reads text; null when
// the revision has no such file, which for a range's head means the file was never added, or was
// removed since. `translations` (bin/companygraph.mjs) reads model/localization.md this way,
// because the languages that govern a range are the range's head's, not whatever happens to be
// checked out on disk when the command runs.
export function fileAt(cwd, rev, path) {
  try {
    return unixLines(git(cwd, ["show", `${rev}:${path}`]));
  } catch {
    return null;
  }
}

// Where two commits' histories part, or the one that is already an ancestor of the other, its
// own tip. `translations` (bin/companygraph.mjs) reads a page's change from here rather than from
// `a` itself: a PR that has not merged a later change to `a` would otherwise see `a`'s own diff
// against the PR's head, reversed, as if the PR had just undone it.
export function mergeBaseOf(cwd, a, b) {
  return git(cwd, ["merge-base", a, b]).trim();
}

// Every value a trailer takes across a range's commits, as git parses trailers.
export function trailerValuesOf(cwd, range, key) {
  return git(cwd, ["log", `--format=${TRAILER(key)}%x1e`, range])
    .split(/[\x1e\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function familyOf(top) {
  const list = join(top, "conventions", "REPOSITORIES.md");
  if (!existsSync(join(top, "conventions.json")) || !existsSync(list)) return null;
  const members = [];
  for (const line of readFileSync(list, "utf8").split("\n")) {
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length < 5 || !/^[\w.-]+\/[\w.-]+$/.test(cells[0])) continue;
    const local = cells[cells.length - 1];
    members.push({ repo: cells[0], path: local.startsWith("~/") ? join(homedir(), local.slice(2)) : local });
  }
  return members;
}
