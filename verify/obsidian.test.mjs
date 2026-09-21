// The Obsidian plugin put into a vault: lib/obsidian.mjs, with the network served by hand. That
// the files it writes are what Obsidian switches on is proven where Obsidian runs, by the plugin's
// own e2e suite, which installs its build through this module.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { download, installed, newestRelease, place, readLocal } from "../lib/obsidian.mjs";

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
