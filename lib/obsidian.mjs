// The Obsidian plugin in a vault: a release's three files put into `.obsidian/plugins/companygraph/`,
// and the plugin named in `.obsidian/community-plugins.json`, which is Obsidian's own list of the
// community plugins that are switched on. The plugin is not in Obsidian's community directory, and
// this is what stands in for it.
//
// No plugin release is pinned here. The plugin pins this package, so a pin the other way would
// make each release wait on the other; the newest release is asked for when it is installed, and
// the plugin itself refuses a vault whose core is newer than the checker it bundles.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const ID = "companygraph";
export const FILES = ["main.js", "manifest.json", "styles.css"];
const REPOSITORY = "companygraph/obsidian-plugin";

// The tag of the plugin's newest release. Its tags carry no `v`.
export async function newestRelease(fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${REPOSITORY}/releases/latest`;
  const response = await fetchImpl(url, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const { tag_name: tag } = await response.json();
  if (typeof tag !== "string") throw new Error(`${url} named no release`);
  return tag;
}

// The three files of one release, as it was published. All three are fetched before anything is
// written, so a release that lacks one leaves the vault as it was.
export async function download(release, fetchImpl = fetch) {
  const files = new Map();
  for (const name of FILES) {
    const url = `https://github.com/${REPOSITORY}/releases/download/${release}/${name}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    files.set(name, Buffer.from(await response.arrayBuffer()));
  }
  const manifest = manifestOf(files);
  if (manifest.version !== release) throw new Error(`release ${release} carries a manifest for ${manifest.version}`);
  return files;
}

// The same three files from a folder, which is how a build of one's own is installed: the plugin's
// repository after `npm run build`.
export function readLocal(dir) {
  const files = new Map();
  for (const name of FILES) {
    const path = join(dir, name);
    if (!existsSync(path)) throw new Error(`${path} is missing${name === "main.js" ? "; the plugin's npm run build writes it" : ""}`);
    files.set(name, readFileSync(path));
  }
  manifestOf(files);
  return files;
}

function manifestOf(files) {
  let manifest;
  try {
    manifest = JSON.parse(files.get("manifest.json").toString("utf8"));
  } catch {
    throw new Error("manifest.json is not JSON");
  }
  if (manifest.id !== ID) throw new Error(`manifest.json is for ${manifest.id}, not ${ID}`);
  return manifest;
}

const listPathOf = (vault) => join(resolve(vault), ".obsidian", "community-plugins.json");
const folderOf = (vault) => join(resolve(vault), ".obsidian", "plugins", ID);

// What a vault holds now: the release installed, or null, and whether the plugin is switched on.
// A list that is not a list of names is refused here, before anything is written over it.
export function installed(vault) {
  const root = resolve(vault);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`${root} is not a folder`);
  const listPath = listPathOf(vault);
  let list = [];
  if (existsSync(listPath)) {
    try {
      list = JSON.parse(readFileSync(listPath, "utf8"));
    } catch {
      list = null;
    }
    if (!Array.isArray(list) || !list.every((entry) => typeof entry === "string"))
      throw new Error(`${listPath} is not a list of plugin names; nothing was written`);
  }
  let release = null;
  try {
    release = JSON.parse(readFileSync(join(folderOf(vault), "manifest.json"), "utf8")).version ?? null;
  } catch {}
  return { release, enabled: list.includes(ID), list };
}

// Everything is read and refused before anything is written. The plugin's own settings, `data.json`
// beside the three files, are left as they are, so installing over an earlier release is how the
// plugin is updated.
export function place(vault, files) {
  const before = installed(vault);
  const folder = folderOf(vault);
  mkdirSync(folder, { recursive: true });
  for (const [name, content] of files) writeFileSync(join(folder, name), content);
  // Obsidian writes this file as two-space JSON, and so it is written here.
  if (!before.enabled) writeFileSync(listPathOf(vault), JSON.stringify([...before.list, ID], null, 2));
  return { folder, from: before.release, to: manifestOf(files).version, enabled: !before.enabled };
}
