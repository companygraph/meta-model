import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FORM_VERSION, markdownFilesOf, formCheck, formattedOf, linterEnvOf } from "../lib/form.mjs";

// Each test's trees have a prefix of their own, apart from the copies formCheck makes, and are
// removed when the test ends, so a run leaves nothing in the temporary folder.
/** @type {string[]} */
const made = [];
const temp = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-form-test-"));
  made.push(root);
  return root;
};
afterEach(() => {
  for (const root of made.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
/** @param {string} root @param {Record<string, string>} files */
function tree(root, files) {
  for (const [rel, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
  }
  return root;
}
const CLEAN = "# Title\n\nOne paragraph on one line.\n\n- one\n- two\n";
const WRAPPED = "# Title\n\nOne paragraph\nthat wraps.\n";

test("the form is markdownlint-cli2 at the version conventions-format pins", () => {
  assert.equal(FORM_VERSION, "0.23.2");
});

test("the walk finds every Markdown file but .git, node_modules, the checker's checkout and what is excluded", () => {
  const root = tree(temp(), {
    "README.md": CLEAN,
    "docs/a.md": CLEAN,
    "dist/out.md": WRAPPED,
    "meta/core/x.md": WRAPPED,
    "node_modules/p/README.md": WRAPPED,
    "deep/node_modules/q/README.md": WRAPPED,
    ".companygraph-checker/README.md": WRAPPED,
    "notes.txt": "not Markdown\n",
  });
  assert.deepEqual(markdownFilesOf(root, ["dist", "meta/"]), ["README.md", "docs/a.md"]);
});

test("the walk leaves out what git ignores, and a new file that is not ignored is read", () => {
  const root = tree(temp(), { ".gitignore": "scratch/\n", "scratch/a.md": WRAPPED, "new.md": CLEAN });
  execFileSync("git", ["init", "-q"], { cwd: root });
  assert.deepEqual(markdownFilesOf(root), ["new.md"]);
});

test("Markdown in the form passes", () => {
  const root = tree(temp(), { "README.md": CLEAN });
  assert.deepEqual(formCheck(root), { files: 1, hits: [] });
});

test("a wrapped paragraph fails on the family's own rule, which shows the custom rules are read", () => {
  const root = tree(temp(), { "README.md": WRAPPED });
  const { hits, error } = formCheck(root);
  assert.equal(error, undefined);
  assert.ok(hits.includes("README.md:3: paragraph-on-one-line"), hits.join("\n"));
});

test("a list marked with stars fails on markdownlint's own rule", () => {
  const root = tree(temp(), { "README.md": "# Title\n\n* one\n* two\n" });
  assert.ok(formCheck(root).hits.some((h) => /^README\.md:3: MD004/.test(h)));
});

test("an excluded folder is not held to the form", () => {
  const root = tree(temp(), { "README.md": CLEAN, "dist/out.md": WRAPPED });
  assert.deepEqual(formCheck(root, { exclude: ["dist"] }).hits, []);
});

test("fix rewrites a hit into the form, and the check then passes", () => {
  const root = tree(temp(), { "README.md": WRAPPED });
  assert.deepEqual(formCheck(root, { fix: true }).hits, []);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Title\n\nOne paragraph that wraps.\n");
});

test("a repository with no Markdown holds nothing to the form, and that is no failure", () => {
  const root = tree(temp(), { "index.js": "export {};\n" });
  assert.deepEqual(formCheck(root), { files: 0, hits: [] });
});

test("a file in a dot-folder is held to the form, so .github/ is read", () => {
  const root = tree(temp(), { "README.md": CLEAN, ".github/x.md": WRAPPED });
  const { files, hits, error } = formCheck(root);
  assert.equal(error, undefined);
  assert.equal(files, 2);
  assert.ok(hits.includes(".github/x.md:3: paragraph-on-one-line"), hits.join("\n"));
});

test("fix writes back the file it changed and leaves the others as they were", () => {
  const root = tree(temp(), { "README.md": CLEAN, ".github/x.md": WRAPPED });
  const before = fs.statSync(path.join(root, "README.md")).mtimeMs;
  assert.deepEqual(formCheck(root, { fix: true }), { files: 2, hits: [] });
  assert.equal(fs.readFileSync(path.join(root, ".github/x.md"), "utf8"), "# Title\n\nOne paragraph that wraps.\n");
  assert.equal(fs.statSync(path.join(root, "README.md")).mtimeMs, before);
});

test("a file name with brackets is read as the file, not as a pattern", () => {
  const root = tree(temp(), { "notes [draft].md": WRAPPED });
  assert.ok(formCheck(root).hits.some((h) => h.startsWith("notes [draft].md:3:")));
});

// The form is fixed, so no configuration file of the repository's own is read, at its root or in
// a folder below. The family's root .markdownlint-cli2.jsonc names custom rules by a path that
// means nothing beside the package's form, which is how the defect was first seen.
const FAMILY_ROOT_CONFIG = '{ "customRules": ["./conventions/markdown-rules.cjs"] }\n';

test("a repository's own root configuration is not read: clean Markdown passes and a wrapped paragraph fails", () => {
  const clean = tree(temp(), { ".markdownlint-cli2.jsonc": FAMILY_ROOT_CONFIG, "README.md": CLEAN });
  assert.deepEqual(formCheck(clean), { files: 1, hits: [] });
  const wrapped = tree(temp(), { ".markdownlint-cli2.jsonc": FAMILY_ROOT_CONFIG, "README.md": WRAPPED });
  const { hits, error } = formCheck(wrapped);
  assert.equal(error, undefined);
  assert.ok(hits.includes("README.md:3: paragraph-on-one-line"), hits.join("\n"));
});

test("a nested configuration cannot turn a rule of the form off", () => {
  const root = tree(temp(), { "README.md": CLEAN, "docs/.markdownlint.json": '{ "MD004": false }\n', "docs/a.md": "# Title\n\n* one\n* two\n" });
  const { hits, error } = formCheck(root);
  assert.equal(error, undefined);
  assert.ok(hits.some((h) => /^docs\/a\.md:3: MD004/.test(h)), hits.join("\n"));
});

test("a root configuration cannot turn on a rule the form leaves off", () => {
  const root = tree(temp(), { ".markdownlint-cli2.jsonc": '{ "config": { "MD001": true } }\n', "README.md": "# Title\n\n### Skipped a level\n" });
  assert.deepEqual(formCheck(root), { files: 1, hits: [] });
});

test("fix rewrites a wrapped paragraph in a repository with its own root configuration", () => {
  const root = tree(temp(), { ".markdownlint-cli2.jsonc": FAMILY_ROOT_CONFIG, "README.md": WRAPPED });
  assert.deepEqual(formCheck(root, { fix: true }), { files: 1, hits: [] });
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Title\n\nOne paragraph that wraps.\n");
});

// The decision and label checks compare a page's two sides after the form, in one run of the
// tool over every text handed in; where the tool cannot run, the texts come back as they were,
// with the reason, so a caller compares them raw and says so.
test("formattedOf puts every text handed in into the form in one run and keeps its key", () => {
  const { formatted, error } = formattedOf(new Map([["base/model/a.md", "# A\n\n* one\n* two\n"], ["head/model/a.md", WRAPPED]]));
  assert.equal(error, undefined);
  assert.deepEqual([...formatted.keys()], ["base/model/a.md", "head/model/a.md"]);
  assert.equal(formatted.get("base/model/a.md"), "# A\n\n- one\n- two\n");
  assert.equal(formatted.get("head/model/a.md"), "# Title\n\nOne paragraph that wraps.\n");
});

test("formattedOf with no tool to run gives the texts back as they were, and says why", () => {
  const texts = new Map([["head/model/a.md", "# A\n\n* one\n"]]);
  const { formatted, error } = formattedOf(texts, { linter: { command: path.join(os.tmpdir(), "no-such-markdownlint"), args: [] } });
  assert.equal(formatted.get("head/model/a.md"), "# A\n\n* one\n");
  assert.match(error ?? "", /could not be run/);
});

test("formattedOf where the tool exits 1 with no hit line is a failure to run, and says why", () => {
  const texts = new Map([["head/model/a.md", "# A\n\n* one\n"]]);
  const { formatted, error } = formattedOf(texts, { linter: { command: process.execPath, args: ["-e", "console.error('npm error 404 not found'); process.exit(1)", "--"] } });
  assert.equal(formatted.get("head/model/a.md"), "# A\n\n* one\n");
  assert.match(error ?? "", /exited 1/);
});

test("formattedOf with nothing handed in runs nothing", () => {
  const { formatted, error } = formattedOf(new Map(), { linter: { command: path.join(os.tmpdir(), "no-such-markdownlint"), args: [] } });
  assert.equal(formatted.size, 0);
  assert.equal(error, undefined);
});

// The git gate's hooks start the tooling with `npx --package <meta-model> companygraph`, and npx
// hands the command it starts its own --package and -c; a nested npx that inherits them runs a
// command named markdownlint-cli2@<version> from meta-model and exits 127. The linter is started
// without them, and with the configuration the person set.
const OUTER = { npm_config_package: "github:companygraph/meta-model#v0.84.0", npm_config_call: "companygraph check .", npm_command: "exec" };

test("the linter's environment leaves out what an outer npm exec set for its own command", () => {
  const env = linterEnvOf({ ...OUTER, NPM_CONFIG_PACKAGE: "x", npm_config_prefer_offline: "true", npm_config_registry: "https://registry.example/", PATH: "/bin" });
  assert.deepEqual(env, { npm_config_prefer_offline: "true", npm_config_registry: "https://registry.example/", PATH: "/bin" });
});

test("the linter is started without the outer npm exec's package, call and command", () => {
  const saved = Object.fromEntries([...Object.keys(OUTER), "npm_config_prefer_offline"].map((name) => [name, process.env[name]]));
  Object.assign(process.env, OUTER, { npm_config_prefer_offline: "true" });
  try {
    // The stand-in linter says the npm variables it was given and exits 1 naming no file, which
    // formattedOf reports with what it said.
    const said = "console.error(JSON.stringify(Object.fromEntries(Object.entries(process.env).filter(([n]) => /^npm_(config_|command)/i.test(n))))); process.exit(1)";
    const { error } = formattedOf(new Map([["a.md", CLEAN]]), { linter: { command: process.execPath, args: ["-e", said, "--"] } });
    const given = JSON.parse(/** @type {string} */ (/\{.*\}/.exec(error ?? "")?.[0]));
    for (const name of Object.keys(OUTER)) assert.equal(given[name], undefined, `${name} was passed on`);
    assert.equal(given.npm_config_prefer_offline, "true");
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
