// The Obsidian plugin put into a vault: lib/obsidian.mjs, with the network served by hand. That
// the files it writes are what Obsidian switches on is proven where Obsidian runs, by the plugin's
// own e2e suite, which installs its build through this module.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { download, graphOf, installed, newestRelease, openVault, place, PLUGINS, readLocal, settle, whereObsidian, workspaceOf } from "../lib/obsidian.mjs";

const vault = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-obsidian-"));
const release = (version, id = "companygraph") => new Map([
  ["main.js", Buffer.from("// main")],
  ["manifest.json", Buffer.from(JSON.stringify({ id, version }))],
  ["styles.css", Buffer.from("/* styles */")],
]);
const list = (root) => JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8"));

test("a vault Obsidian has never opened gets the three files and a list naming the plugin", () => {
  const root = vault();
  const done = place(root, release("1.0.0"));
  assert.deepEqual(fs.readdirSync(path.join(root, ".obsidian", "plugins", "companygraph")).sort(), ["main.js", "manifest.json", "styles.css"]);
  assert.deepEqual(list(root), ["companygraph"]);
  assert.deepEqual([done.from, done.to, done.enabled], [null, "1.0.0", true]);
  assert.deepEqual([installed(root).release, installed(root).enabled], ["1.0.0", true]);
});

test("the plugins a vault has switched on stay on, and the plugin is named once", () => {
  const root = vault();
  fs.mkdirSync(path.join(root, ".obsidian"));
  fs.writeFileSync(path.join(root, ".obsidian", "community-plugins.json"), '["dataview"]');
  place(root, release("1.0.0"));
  const again = place(root, release("1.0.0"));
  assert.deepEqual(list(root), ["dataview", "companygraph"]);
  assert.equal(again.enabled, false);
});

test("installing over an earlier release updates it and leaves the plugin's settings alone", () => {
  const root = vault();
  place(root, release("1.0.0"));
  const settings = path.join(root, ".obsidian", "plugins", "companygraph", "data.json");
  fs.writeFileSync(settings, '{"kept":true}');
  const done = place(root, release("1.1.0"));
  assert.deepEqual([done.from, done.to], ["1.0.0", "1.1.0"]);
  assert.equal(fs.readFileSync(settings, "utf8"), '{"kept":true}');
});

test("a list that is not a list of names is refused before anything is written", () => {
  const root = vault();
  fs.mkdirSync(path.join(root, ".obsidian"));
  fs.writeFileSync(path.join(root, ".obsidian", "community-plugins.json"), '{"dataview":true}');
  assert.throws(() => place(root, release("1.0.0")), /not a list of plugin names/);
  assert.equal(fs.existsSync(path.join(root, ".obsidian", "plugins")), false);
});

test("a vault that is not a folder is refused", () => {
  assert.throws(() => place(path.join(vault(), "missing"), release("1.0.0")), /is not a folder/);
});

const serving = (files, asked = []) => async (url) => {
  asked.push(url);
  const body = files.get(url.slice(url.lastIndexOf("/") + 1));
  return body ? new Response(new Uint8Array(body)) : new Response("", { status: 404 });
};

test("a download fetches the release its tag names and refuses a manifest of another plugin or release", async () => {
  const asked = [];
  const files = await download("1.0.0", serving(release("1.0.0"), asked));
  assert.equal(files.size, 3);
  assert.equal(asked[0], "https://github.com/companygraph/obsidian-plugin/releases/download/1.0.0/main.js");
  await assert.rejects(download("1.0.0", serving(release("0.9.0"))), /carries a manifest for 0\.9\.0/);
  await assert.rejects(download("1.0.0", serving(release("1.0.0", "other"))), /for other, not companygraph/);
  const partial = release("1.0.0");
  partial.delete("styles.css");
  await assert.rejects(download("1.0.0", serving(partial)), /styles\.css answered 404/);
});

test("the newest release is the tag GitHub names as latest, and an answer without one is refused", async () => {
  const answering = (status, body) => async () => new Response(JSON.stringify(body), { status });
  assert.equal(await newestRelease(answering(200, { tag_name: "0.7.1" })), "0.7.1");
  await assert.rejects(newestRelease(answering(200, {})), /named no release/);
  await assert.rejects(newestRelease(answering(403, {})), /answered 403/);
});

test("a folder of one's own build is read with the same checks, and a missing main.js says how to make it", () => {
  const dir = vault();
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  fs.writeFileSync(path.join(dir, "styles.css"), "");
  assert.throws(() => readLocal(dir), /main\.js is missing; the plugin's npm run build writes it/);
  fs.writeFileSync(path.join(dir, "main.js"), "");
  assert.equal(readLocal(dir).size, 3);
});

// The recommended plugins: the same three files, into a folder of their own id, from their own
// repository, switched on beside CompanyGraph. Each is in Obsidian's community directory, and is
// installed here so a vault is ready without a hunt through it.
test("the recommended plugins are Claudian and Terminal, each with its id and repository", () => {
  assert.deepEqual(
    PLUGINS.map((p) => [p.id, p.repo]),
    [["companygraph", "companygraph/obsidian-plugin"], ["realclaudian", "yishentu/claudian"], ["terminal", "polyipseity/obsidian-terminal"]],
  );
});

test("a recommended plugin lands in a folder of its own id and is switched on beside CompanyGraph", () => {
  const root = vault();
  place(root, release("1.0.0"));
  const terminal = PLUGINS.find((p) => p.id === "terminal");
  const done = place(root, release("3.27.2", "terminal"), terminal);
  assert.deepEqual(fs.readdirSync(path.join(root, ".obsidian", "plugins", "terminal")).sort(), ["main.js", "manifest.json", "styles.css"]);
  assert.deepEqual(list(root), ["companygraph", "terminal"]);
  assert.deepEqual([done.from, done.to, done.enabled], [null, "3.27.2", true]);
  assert.deepEqual([installed(root, terminal).release, installed(root).release], ["3.27.2", "1.0.0"]);
});

test("a recommended plugin is downloaded from its own repository and held to its own id", async () => {
  const asked = [];
  const claudian = PLUGINS.find((p) => p.id === "realclaudian");
  await download("2.3.2", serving(release("2.3.2", "realclaudian"), asked), claudian);
  assert.equal(asked[0], "https://github.com/yishentu/claudian/releases/download/2.3.2/main.js");
  await assert.rejects(download("2.3.2", serving(release("2.3.2")), claudian), /for companygraph, not realclaudian/);
  const latest = [];
  await newestRelease(async (url) => { latest.push(url); return new Response(JSON.stringify({ tag_name: "2.3.2" })); }, claudian);
  assert.equal(latest[0], "https://api.github.com/repos/yishentu/claudian/releases/latest");
});

// The graph view as Obsidian keeps it in `.obsidian/graph.json`: the model's entities without
// their READMEs and sources, and one color per root folder of the model, so a reader tells the
// types apart at a glance.
test("the graph filters to the model and colors each root folder of it, sources and READMEs left out", () => {
  const graph = JSON.parse(graphOf(["achievement-kinds", "profiles", "skills", "sources"]));
  assert.equal(graph.search, "path:model/ -file:README -path:model/sources");
  assert.deepEqual(
    graph.colorGroups.map((g) => g.query),
    ["path:model/achievement-kinds", "path:model/profiles", "path:model/skills"],
  );
  for (const group of graph.colorGroups) {
    assert.equal(group.color.a, 1);
    assert.ok(Number.isInteger(group.color.rgb) && group.color.rgb >= 0 && group.color.rgb <= 0xffffff);
  }
  const rgbs = graph.colorGroups.map((g) => g.color.rgb);
  assert.equal(new Set(rgbs).size, rgbs.length);
});

// The panes as Obsidian keeps them in `.obsidian/workspace.json`: files, search and bookmarks on
// the left; References, Outline, Checks and Brief on the right, with Claudian where it is
// installed; the identity open in the middle. Terminal's pane is the plugin's own to open.
const leaves = (node, out = []) => {
  if (node.type === "leaf") out.push(node.state.type);
  for (const child of node.children ?? []) leaves(child, out);
  return out;
};

test("the panes open the identity with the plugin's views, and a pane only where its plugin is installed", () => {
  const all = JSON.parse(workspaceOf({ file: "model/identity.md", plugins: ["companygraph", "realclaudian", "terminal"] }));
  assert.deepEqual(leaves(all.left), ["file-explorer", "search", "bookmarks"]);
  assert.deepEqual(leaves(all.right), ["companygraph-references", "outline", "companygraph-checks", "companygraph-brief", "claudian-view"]);
  assert.deepEqual(leaves(all.main), ["markdown"]);
  assert.equal(JSON.stringify(all).includes("terminal:terminal"), false);
  assert.equal(JSON.stringify(all).includes('"file":"model/identity.md"'), true);
  const own = JSON.parse(workspaceOf({ file: "model/identity.md", plugins: ["companygraph"] }));
  assert.deepEqual(leaves(own.right), ["companygraph-references", "outline", "companygraph-checks", "companygraph-brief"]);
  assert.deepEqual(leaves(own.main), ["markdown"]);
});

// Obsidian rewrites both files whenever a person changes the graph or moves a pane, so a file
// already there is theirs and is kept, unless the caller says to write over it.
test("a vault file is written where absent, kept where present, and written over on force", () => {
  const root = vault();
  assert.equal(settle(root, "graph.json", "one"), "written");
  assert.equal(fs.readFileSync(path.join(root, ".obsidian", "graph.json"), "utf8"), "one");
  assert.equal(settle(root, "graph.json", "two"), "kept");
  assert.equal(fs.readFileSync(path.join(root, ".obsidian", "graph.json"), "utf8"), "one");
  assert.equal(settle(root, "graph.json", "two", { force: true }), "written");
  assert.equal(fs.readFileSync(path.join(root, ".obsidian", "graph.json"), "utf8"), "two");
});

// Where Obsidian is, or how to get it, on each platform. The filesystem is handed in, so every
// platform is tried from this one.
const fsOf = (...present) => ({ exists: (p) => present.includes(p) });

test("on macOS Obsidian is found under /Applications, and Homebrew is the installer when it is there", () => {
  const env = { PATH: "/opt/homebrew/bin:/usr/bin" };
  const found = whereObsidian({ platform: "darwin", env, ...fsOf("/Applications/Obsidian.app") });
  assert.deepEqual([found.app, found.installer], ["/Applications/Obsidian.app", null]);
  const missing = whereObsidian({ platform: "darwin", env, ...fsOf("/opt/homebrew/bin/brew") });
  assert.equal(missing.app, null);
  assert.deepEqual(missing.installer, { name: "Homebrew", command: ["brew", "install", "--cask", "obsidian"] });
  assert.equal(whereObsidian({ platform: "darwin", env, ...fsOf() }).installer, null);
  assert.equal(missing.download, "https://obsidian.md/download");
});

test("on Windows Obsidian is found under LOCALAPPDATA, and winget is the installer when it is on the path", () => {
  const env = { LOCALAPPDATA: "C:\\Users\\rob\\AppData\\Local", PATH: "C:\\Users\\rob\\AppData\\Local\\Microsoft\\WindowsApps;C:\\Windows" };
  const exe = "C:\\Users\\rob\\AppData\\Local\\Obsidian\\Obsidian.exe";
  assert.equal(whereObsidian({ platform: "win32", env, ...fsOf(exe) }).app, exe);
  const missing = whereObsidian({ platform: "win32", env, ...fsOf("C:\\Users\\rob\\AppData\\Local\\Microsoft\\WindowsApps\\winget.exe") });
  assert.equal(missing.app, null);
  assert.deepEqual(missing.installer, { name: "winget", command: ["winget", "install", "--id", "Obsidian.Obsidian", "-e"] });
});

test("on Linux Obsidian is found on the path, as a Flatpak or a Snap, and nothing installs it", () => {
  const env = { PATH: "/usr/local/bin:/usr/bin", HOME: "/home/rob" };
  assert.equal(whereObsidian({ platform: "linux", env, ...fsOf("/usr/bin/obsidian") }).app, "/usr/bin/obsidian");
  assert.equal(whereObsidian({ platform: "linux", env, ...fsOf("/var/lib/flatpak/exports/bin/md.obsidian.Obsidian") }).app, "/var/lib/flatpak/exports/bin/md.obsidian.Obsidian");
  assert.equal(whereObsidian({ platform: "linux", env, ...fsOf("/snap/bin/obsidian") }).app, "/snap/bin/obsidian");
  const missing = whereObsidian({ platform: "linux", env, ...fsOf() });
  assert.deepEqual([missing.app, missing.installer], [null, null]);
});

// The vault opened in Obsidian through its own URL, which also registers the vault there, so
// "Open folder as vault" is no longer a step. The opener is each platform's own.
test("opening a vault hands each platform's opener the obsidian:// URL of the folder", () => {
  const ran = [];
  const run = (command, args) => (ran.push([command, ...args]), { status: 0 });
  // Resolved as the opener resolves it, since on Windows the folder gains a drive letter.
  const url = `obsidian://open?path=${encodeURIComponent(path.resolve("/Users/rob/Desktop/my vault"))}`;
  openVault("/Users/rob/Desktop/my vault", { platform: "darwin", run });
  openVault("/Users/rob/Desktop/my vault", { platform: "win32", run });
  openVault("/Users/rob/Desktop/my vault", { platform: "linux", run });
  assert.deepEqual(ran, [["open", url], ["cmd", "/c", "start", "", url], ["xdg-open", url]]);
  assert.throws(() => openVault("/v", { platform: "linux", run: () => ({ status: 1, error: new Error("ENOENT") }) }), /could not open/);
});
