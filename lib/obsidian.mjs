// The Obsidian plugins in a vault: a release's three files put into `.obsidian/plugins/<id>/`, and
// the plugin named in `.obsidian/community-plugins.json`, which is Obsidian's own list of the
// community plugins that are switched on. CompanyGraph's own plugin is not in Obsidian's community
// directory, and this is what stands in for it; the two recommended beside it are, and are put in
// the same way so a vault is ready without a hunt through that directory.
//
// No plugin release is pinned here. The plugin pins this package, so a pin the other way would
// make each release wait on the other; the newest release is asked for when it is installed, and
// the plugin itself refuses a vault whose core is newer than the checker it bundles.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, posix, resolve, win32 } from "node:path";

export const ID = "companygraph";
export const FILES = ["main.js", "manifest.json", "styles.css"];

// Every plugin the command installs, CompanyGraph's own first. `id` is what Obsidian's list names
// and the folder the files go in; `repo` is where the releases are; `what` is how the command asks
// for one, since the two recommended are offered by name, never put in unasked.
export const PLUGINS = [
  { id: ID, name: "CompanyGraph", repo: "companygraph/obsidian-plugin" },
  { id: "realclaudian", name: "Claudian", repo: "yishentu/claudian", what: "Claude Code in a pane", needs: "It needs Claude Code on this machine." },
  { id: "terminal", name: "Terminal", repo: "polyipseity/obsidian-terminal", what: "a shell in a pane" },
];
const OWN = PLUGINS[0];

// The tag of a plugin's newest release. None of the three carries a `v`.
export async function newestRelease(fetchImpl = fetch, plugin = OWN) {
  const url = `https://api.github.com/repos/${plugin.repo}/releases/latest`;
  const response = await fetchImpl(url, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  const { tag_name: tag } = await response.json();
  if (typeof tag !== "string") throw new Error(`${url} named no release`);
  return tag;
}

// The three files of one release, as it was published. All three are fetched before anything is
// written, so a release that lacks one leaves the vault as it was.
export async function download(release, fetchImpl = fetch, plugin = OWN) {
  const files = new Map();
  for (const name of FILES) {
    const url = `https://github.com/${plugin.repo}/releases/download/${release}/${name}`;
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${url} answered ${response.status}`);
    files.set(name, Buffer.from(await response.arrayBuffer()));
  }
  const manifest = manifestOf(files, plugin);
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

function manifestOf(files, plugin = OWN) {
  let manifest;
  try {
    manifest = JSON.parse(files.get("manifest.json").toString("utf8"));
  } catch {
    throw new Error("manifest.json is not JSON");
  }
  if (manifest.id !== plugin.id) throw new Error(`manifest.json is for ${manifest.id}, not ${plugin.id}`);
  return manifest;
}

const listPathOf = (vault) => join(resolve(vault), ".obsidian", "community-plugins.json");
const folderOf = (vault, plugin) => join(resolve(vault), ".obsidian", "plugins", plugin.id);

// What a vault holds now: the release installed, or null, and whether the plugin is switched on.
// A list that is not a list of names is refused here, before anything is written over it.
export function installed(vault, plugin = OWN) {
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
    release = JSON.parse(readFileSync(join(folderOf(vault, plugin), "manifest.json"), "utf8")).version ?? null;
  } catch {}
  return { release, enabled: list.includes(plugin.id), list };
}

// Everything is read and refused before anything is written. The plugin's own settings, `data.json`
// beside the three files, are left as they are, so installing over an earlier release is how the
// plugin is updated.
export function place(vault, files, plugin = OWN) {
  const before = installed(vault, plugin);
  const folder = folderOf(vault, plugin);
  mkdirSync(folder, { recursive: true });
  for (const [name, content] of files) writeFileSync(join(folder, name), content);
  // Obsidian writes this file as two-space JSON, and so it is written here.
  if (!before.enabled) writeFileSync(listPathOf(vault), JSON.stringify([...before.list, plugin.id], null, 2));
  return { folder, from: before.release, to: manifestOf(files, plugin).version, enabled: !before.enabled };
}

// The graph view, as Obsidian keeps it in `.obsidian/graph.json`: the model's entities, without
// the READMEs that describe folders and the sources that stand behind facts, and one color per
// root folder so the types are told apart at a glance. The colors are Obsidian's own integer
// form of an RGB triple, from a palette that stays apart at nine folders and wraps after; the
// folders come sorted from the caller, so a folder keeps its color across instances.
const PALETTE = [0x5a8bc8, 0xe0a942, 0x52b788, 0xd9534f, 0x9b6bd1, 0x2aa198, 0xe07a5f, 0x8d99ae, 0xb5a642];
export function graphOf(folders) {
  const colorGroups = folders
    .filter((folder) => folder !== "sources")
    .map((folder, i) => ({ query: `path:model/${folder}`, color: { a: 1, rgb: PALETTE[i % PALETTE.length] } }));
  return `${JSON.stringify({
    "collapse-filter": true,
    search: "path:model/ -file:README -path:model/sources",
    showTags: false,
    showAttachments: false,
    hideUnresolved: false,
    showOrphans: false,
    "collapse-color-groups": false,
    colorGroups,
    "collapse-display": false,
    showArrow: false,
    textFadeMultiplier: 0,
    nodeSizeMultiplier: 1.5,
    lineSizeMultiplier: 1,
    "collapse-forces": false,
    centerStrength: 0.4,
    repelStrength: 12,
    linkStrength: 1,
    linkDistance: 400,
    scale: 1,
    close: true,
  }, null, 2)}\n`;
}

// The panes, as Obsidian keeps them in `.obsidian/workspace.json`: files, search and bookmarks on
// the left, the plugin's four views on the right with Claudian beside them where it is installed,
// and `file` open in the middle. No terminal pane, though Terminal is installed: its pane's state
// names the shell, its arguments and the platform, which is the plugin's to write, not this
// tooling's to guess, and its ribbon button opens one. Obsidian gives every pane an id of sixteen
// hex digits, and reads its own file back whatever the digits are.
export function workspaceOf({ file, plugins }) {
  let next = 0;
  const id = () => (0x1000000000000000n + BigInt(next++)).toString(16).padStart(16, "0");
  const leaf = (type, state, icon, title, extra = {}) => ({ id: id(), type: "leaf", ...extra, state: { type, state, icon, title } });
  const tabs = (children) => ({ id: id(), type: "tabs", children });
  const split = (direction, children, extra = {}) => ({ id: id(), type: "split", direction, ...extra, children });
  const has = (plugin) => plugins.includes(plugin);
  const name = file.split("/").pop().replace(/\.md$/, "");

  const main = [leaf("markdown", { file, mode: "source", source: false, backlinks: false }, "lucide-file", name)];
  const right = [
    leaf("companygraph-references", {}, "links-going-out", "References"),
    leaf("outline", { file, followCursor: false, showSearch: false, searchQuery: "" }, "lucide-list", "Outline"),
    leaf("companygraph-checks", {}, "list-checks", "Meta-model compliance"),
    leaf("companygraph-brief", {}, "book-open-text", "Brief"),
  ];
  if (has("realclaudian")) right.push(leaf("claudian-view", {}, "bot", "Claudian"));
  const left = [
    leaf("file-explorer", { sortOrder: "alphabetical", autoReveal: false, showSearch: false, searchQuery: "" }, "lucide-folder-closed", "Files"),
    leaf("search", { query: "", matchingCase: false, explainSearch: false, collapseAll: false, extraContext: false, sortOrder: "alphabetical" }, "lucide-search", "Search"),
    leaf("bookmarks", {}, "lucide-bookmark", "Bookmarks"),
  ];
  const workspace = {
    main: split("vertical", [tabs(main)]),
    left: split("horizontal", [tabs(left)], { width: 300 }),
    right: split("horizontal", [tabs(right)], { width: 450 }),
    active: main[0].id,
    lastOpenFiles: [file],
  };
  return `${JSON.stringify(workspace, null, 2)}\n`;
}

// A file of `.obsidian/`, written where the vault has none. Obsidian rewrites the graph and the
// panes whenever a person changes them, so a file already there is theirs and is kept unless the
// caller says to write over it.
export function settle(vault, name, text, { force = false } = {}) {
  const folder = join(resolve(vault), ".obsidian");
  const path = join(folder, name);
  if (existsSync(path) && !force) return "kept";
  mkdirSync(folder, { recursive: true });
  writeFileSync(path, text);
  return "written";
}

// Where Obsidian is on this machine, or how to get it. `app` is the application where it was
// found, or null; `installer` is a package manager that puts it there reliably, asked before it
// is run, and only where one is: Homebrew on macOS when it is present, winget on Windows when it
// is on the path, and nothing on Linux, where the distribution decides between a .deb, an
// AppImage, a Flatpak and a Snap. An AppImage is a file wherever its owner put it, so a Linux
// answer of null means not found, not not installed. The filesystem is handed in for the tests.
export const DOWNLOAD = "https://obsidian.md/download";
export function whereObsidian({ platform = process.platform, env = process.env, exists = existsSync } = {}) {
  // The platform asked about, not the one this runs on: the tests try all three from one.
  const { delimiter, join } = platform === "win32" ? win32 : posix;
  const onPath = (name) => (env.PATH ?? "").split(delimiter).filter(Boolean).map((dir) => join(dir, name)).find(exists) ?? null;
  const first = (...paths) => paths.find((path) => path && exists(path)) ?? null;
  let app = null;
  let installer = null;
  if (platform === "darwin") {
    app = first("/Applications/Obsidian.app", env.HOME && join(env.HOME, "Applications", "Obsidian.app"));
    if (!app && onPath("brew")) installer = { name: "Homebrew", command: ["brew", "install", "--cask", "obsidian"] };
  } else if (platform === "win32") {
    // The per-user install, which is the download's default, and the per-machine one. The y/N
    // the command asks is the consent winget's own agreement prompts would ask for again.
    app = first(
      env.LOCALAPPDATA && join(env.LOCALAPPDATA, "Obsidian", "Obsidian.exe"),
      env.ProgramFiles && join(env.ProgramFiles, "Obsidian", "Obsidian.exe"),
    );
    if (!app && onPath("winget.exe"))
      installer = { name: "winget", command: ["winget", "install", "--id", "Obsidian.Obsidian", "-e", "--accept-source-agreements", "--accept-package-agreements"] };
  } else {
    app = first(
      onPath("obsidian"),
      "/var/lib/flatpak/exports/bin/md.obsidian.Obsidian",
      env.HOME && join(env.HOME, ".local", "share", "flatpak", "exports", "bin", "md.obsidian.Obsidian"),
      "/snap/bin/obsidian",
    );
  }
  return { app, installer, download: DOWNLOAD };
}

// Whether Obsidian knows a folder as a vault. Obsidian keeps that list outside every vault, at
// its own place per platform, and opens by URL only a folder on it; a folder it does not know is
// opened once by hand, through Open folder as vault, which puts it there. The list is read and
// never written: it is Obsidian's, as the community-plugins switch is, and Obsidian holds it in
// memory while it runs, so a line written here would not be read until the next launch anyway.
// A list that cannot be read means not known, which is the answer that costs least when wrong.
export function knownVault(vault, { platform = process.platform, env = process.env, exists = existsSync, read = (p) => readFileSync(p, "utf8") } = {}) {
  const { join } = platform === "win32" ? win32 : posix;
  const places =
    platform === "darwin" ? [env.HOME && join(env.HOME, "Library", "Application Support", "obsidian")]
    : platform === "win32" ? [env.APPDATA && join(env.APPDATA, "obsidian")]
    : [env.HOME && join(env.HOME, ".config", "obsidian"), env.HOME && join(env.HOME, ".var", "app", "md.obsidian.Obsidian", "config", "obsidian")];
  const target = platform === process.platform ? resolve(vault) : vault;
  for (const place of places) {
    const path = place && join(place, "obsidian.json");
    if (!path || !exists(path)) continue;
    try {
      const { vaults } = JSON.parse(read(path));
      if (Object.values(vaults ?? {}).some((entry) => entry?.path === target)) return true;
    } catch {}
  }
  return false;
}

// Obsidian's own URL for a folder it knows as a vault, which opens it there.
export const vaultUrl = (vault) => `obsidian://open?path=${encodeURIComponent(resolve(vault))}`;

// A known vault opened through that URL. Each platform has its own opener, handed the URL as one
// argument and never through a shell: on Windows that is rundll32's URL handler rather than
// `cmd /c start`, which reads its line again and takes the `%3A%5C` of an encoded path for
// variables. rundll32 answers 0 whatever happened, so a failure there is Obsidian not opening,
// and the command prints the URL to use by hand either way.
export function openVault(vault, { platform = process.platform, run = spawnSync } = {}) {
  const url = vaultUrl(vault);
  const [command, ...args] = platform === "darwin" ? ["open", url] : platform === "win32" ? ["rundll32", "url.dll,FileProtocolHandler", url] : ["xdg-open", url];
  const result = run(command, args, { stdio: "ignore" });
  if (result.error || result.status !== 0) throw new Error(`could not open ${url} with ${command}${result.error ? `: ${result.error.message}` : ""}`);
  return url;
}
