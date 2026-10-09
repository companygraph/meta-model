// A test file runs only where a package script names it: CI runs the `test:*` scripts, not the
// folder, so a file no script names passes or fails where nobody looks. Every `*.test.mjs` in
// `verify/` is named by at least one script, and every file a script names exists.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const scripts = JSON.parse(fs.readFileSync(new URL("package.json", root), "utf8")).scripts;
const named = new Set(
  Object.entries(scripts)
    .filter(([name]) => name.startsWith("test:"))
    .flatMap(([, command]) => command.match(/verify\/[\w.-]+\.test\.mjs/g) ?? []),
);
const files = fs.readdirSync(new URL("verify/", root))
  .filter((name) => name.endsWith(".test.mjs"))
  .map((name) => `verify/${name}`);

test("every test file in verify/ is named by a test: script", () => {
  assert.deepEqual(files.filter((file) => !named.has(file)), []);
});

test("every test file a test: script names exists", () => {
  assert.deepEqual([...named].filter((file) => !files.includes(file)), []);
});
