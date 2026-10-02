// The pins a repository declares in pins.json, each judged against what its upstream offers now,
// read and never moved. The kinds, and the files a pin is found in, are the ones
// conventions/PINS.md defines, ported from robertblust/conventions' family/pins.mjs without the
// half that writes: phase 1 of the machinery outside the family reports and moves nothing. The
// family's own kinds, `conventions` and `service-conventions`, are named and not read; the
// family's resync reads them, and phase 2 replaces them.
import { spawnSync } from "node:child_process";

/** @param {string} s */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
/** @param {string[]} xs */
const uniq = (xs) => [...new Set(xs)];

/**
 * @param {unknown} obj
 * @returns {{ repo: string; commit: string }[]}
 */
function sourceObjects(obj) {
  const one = /** @type {{ repo?: unknown; commit?: unknown }} */ (obj);
  if (one && typeof one === "object" && one.repo && one.commit) return [/** @type {{ repo: string; commit: string }} */ (one)];
  return Object.values(obj ?? {}).filter((v) => v && typeof v === "object" && v.repo && v.commit);
}

/**
 * How each kind reads the value its line pins, and whether that value is a tag or a commit.
 * @type {Record<string, { byTag: boolean; read: (text: string, repo: string) => string[] }>}
 */
export const KINDS = {
  conventions: { byTag: true, read: (text) => [JSON.parse(text).tag].filter(Boolean) },
  "service-conventions": { byTag: true, read: (text) => [JSON.parse(text).tag].filter(Boolean) },
  "npm-tag": { byTag: true, read: (text, repo) => uniq([...text.matchAll(new RegExp(`"github:${esc(repo)}#([^"]+)"`, "g"))].map((m) => /** @type {string} */ (m[1]))) },
  "source-commit": { byTag: false, read: (text, repo) => uniq(sourceObjects(JSON.parse(text)).filter((o) => o.repo === repo).map((o) => o.commit)) },
  "contract-commit": { byTag: false, read: (text, repo) => uniq([...text.matchAll(new RegExp(`${esc(repo)}@([0-9a-f]{7,40}):`, "g"))].map((m) => /** @type {string} */ (m[1]))) },
  "core-release": { byTag: true, read: (text) => [JSON.parse(text).tooling].filter(Boolean) },
};

// The kinds that are the family's own, reported by name and never read.
export const FAMILY_KINDS = new Set(["conventions", "service-conventions"]);

// The files a repository may hold a pin in, beside any its pins.json names.
export const SCANNED = [
  "conventions.json",
  "service-conventions.json",
  "package.json",
  "chat/package.json",
  "source.json",
  "api-sources.json",
  ".companygraph/manifest.json",
  "src/main/resources/api/sources.json",
];

/**
 * The pins a file holds, whether or not pins.json declares them.
 * @param {string} file
 * @param {string} text
 * @returns {{ kind: string; file: string; repo: string }[]}
 */
export function discover(file, text) {
  const base = file.split("/").pop();
  /** @param {string} kind @param {unknown[]} repos */
  const as = (kind, repos) => uniq(/** @type {string[]} */ (repos.filter(Boolean))).map((repo) => ({ kind, file, repo }));
  try {
    if (file === "conventions.json") return as("conventions", [JSON.parse(text).repo]);
    if (file === "service-conventions.json") return as("service-conventions", [JSON.parse(text).repo]);
    if (file.endsWith("api/sources.json")) return as("contract-commit", [...text.matchAll(/"([\w.-]+\/[\w.-]+)@[0-9a-f]{7,40}:/g)].map((m) => m[1]));
    if (base === "package.json") return as("npm-tag", [...text.matchAll(/"github:([\w.-]+\/[\w.-]+)#[^"]+"/g)].map((m) => m[1]));
    if (base === "source.json" || base === "api-sources.json") return as("source-commit", sourceObjects(JSON.parse(text)).map((o) => o.repo));
    if (file === ".companygraph/manifest.json") return JSON.parse(text).tooling ? as("core-release", ["companygraph/meta-model"]) : [];
  } catch {
    return [];
  }
  return [];
}

/**
 * A parsed pins.json, held to the shape PINS.md gives it; throws, naming the entry, where it is not.
 * `move`, `after`, `watch`, `verify` and `release` are the resync's and are not read here.
 * @param {unknown} obj
 * @returns {{ pins: { kind: string; file: string; repo: string }[] }}
 */
export function validatePins(obj) {
  const file = /** @type {{ pins?: unknown }} */ (obj);
  if (!file || !Array.isArray(file.pins)) throw new Error('pins.json has no "pins" list');
  for (const [i, p] of file.pins.entries()) {
    const at = `pins[${i}]`;
    if (!Object.hasOwn(KINDS, p?.kind)) throw new Error(`${at}: unknown kind "${p?.kind}"`);
    if (typeof p.file !== "string" || typeof p.repo !== "string") throw new Error(`${at}: needs "file" and "repo"`);
    if (!/^[\w.-]+\/[\w.-]+$/.test(p.repo) || p.repo.startsWith("-")) throw new Error(`${at}: "repo" is owner/repository, and ${JSON.stringify(p.repo)} is not`);
  }
  return /** @type {{ pins: { kind: string; file: string; repo: string }[] }} */ (file);
}

/** @param {string} tag */
const versionOf = (tag) => /^v?(\d+)\.(\d+)\.(\d+)$/.exec(tag)?.slice(1).map(Number) ?? null;

/**
 * The highest `vMAJOR.MINOR.PATCH` tag among `tags`, or null where there is none.
 * @param {string[]} tags
 * @returns {string | null}
 */
export function newestTag(tags) {
  /** @type {string | null} */
  let bestTag = null;
  /** @type {number[]} */
  let bestVersion = [];
  for (const tag of tags) {
    const v = versionOf(tag);
    if (!v) continue;
    const i = bestTag === null ? 0 : v.findIndex((n, k) => n !== bestVersion[k]);
    if (bestTag === null || (i !== -1 && (v[i] ?? 0) > (bestVersion[i] ?? 0))) {
      bestTag = tag;
      bestVersion = v;
    }
  }
  return bestTag;
}

/**
 * @typedef {{ tags: string[]; head: string | null } | null} Remote
 * @typedef {{ status: "current" | "behind" | "unknown" | "unmanaged" | "family" | "missing"; kind: string; file: string; repo: string; pinned: string[]; newest?: string }} PinLine
 */

/**
 * Every pin declared, in pins.json's order, then every pin found and not declared. `remote` is asked
 * once per upstream, and only for a declared pin of a kind this reads.
 * @param {{ declared: { pins: { kind: string; file: string; repo: string }[] }; texts: Record<string, string>; remote: (repo: string) => Remote }} ask
 * @returns {{ lines: PinLine[]; failed: boolean }}
 */
export function pinReport({ declared, texts, remote }) {
  /** @type {Map<string, Remote>} */
  const asked = new Map();
  /** @param {string} repo */
  const offered = (repo) => {
    if (!asked.has(repo)) asked.set(repo, remote(repo));
    return /** @type {Remote} */ (asked.get(repo));
  };
  /** @type {PinLine[]} */
  const lines = [];
  for (const d of declared.pins) {
    const base = { kind: d.kind, file: d.file, repo: d.repo };
    const kind = /** @type {{ byTag: boolean; read: (text: string, repo: string) => string[] }} */ (KINDS[d.kind]);
    /** @type {string[]} */
    let pinned = [];
    try {
      pinned = texts[d.file] === undefined ? [] : kind.read(/** @type {string} */ (texts[d.file]), d.repo);
    } catch {
      pinned = [];
    }
    if (FAMILY_KINDS.has(d.kind)) { lines.push({ ...base, status: "family", pinned }); continue; }
    if (!pinned.length) { lines.push({ ...base, status: "missing", pinned }); continue; }
    const now = offered(d.repo);
    const newest = now === null ? null : kind.byTag ? newestTag(now.tags) : now.head;
    if (newest === null) { lines.push({ ...base, status: "unknown", pinned }); continue; }
    // An instance records `tooling` without its v, so tags are compared as versions, not as text.
    const current = kind.byTag
      ? pinned.every((p) => p.replace(/^v/, "") === newest.replace(/^v/, ""))
      : pinned.every((p) => newest.startsWith(p));
    lines.push({ ...base, status: current ? "current" : "behind", pinned, newest: kind.byTag ? newest : newest.slice(0, 7) });
  }
  const found = Object.entries(texts).flatMap(([file, text]) => discover(file, text));
  for (const f of found) {
    if (declared.pins.some((d) => d.kind === f.kind && d.file === f.file && d.repo === f.repo)) continue;
    /** @type {string[]} */
    let pinned = [];
    try {
      pinned = /** @type {{ read: (text: string, repo: string) => string[] }} */ (KINDS[f.kind]).read(/** @type {string} */ (texts[f.file]), f.repo);
    } catch {
      pinned = [];
    }
    lines.push({ ...f, status: "unmanaged", pinned });
  }
  return { lines, failed: lines.some((l) => l.status === "missing") };
}

/**
 * What an upstream on GitHub offers now: its tags and its HEAD, through `git ls-remote` without
 * cloning, or null where it cannot be reached. Git is told never to ask for credentials, since a
 * private or mistyped repository would otherwise wait at a prompt nobody sees.
 * @param {string} repo
 * @returns {Remote}
 */
export function lsRemote(repo) {
  const url = `https://github.com/${repo}.git`;
  const options = { encoding: /** @type {const} */ ("utf8"), timeout: 30_000, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } };
  const tags = spawnSync("git", ["ls-remote", "--tags", "--refs", url], options);
  const head = spawnSync("git", ["ls-remote", url, "HEAD"], options);
  if (tags.status !== 0 || head.status !== 0) return null;
  return {
    tags: tags.stdout.split("\n").filter(Boolean).map((line) => (line.split("\t")[1] ?? "").replace(/^refs\/tags\//, "")),
    head: head.stdout.split("\t")[0]?.trim() || null,
  };
}
