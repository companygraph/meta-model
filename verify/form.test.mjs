import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { FORM_VERSION, markdownFilesOf, formCheck } from "../lib/form.mjs";

const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-form-"));
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

test("a file name with brackets is read as the file, not as a pattern", () => {
  const root = tree(temp(), { "notes [draft].md": WRAPPED });
  assert.ok(formCheck(root).hits.some((h) => h.startsWith("notes [draft].md:3:")));
});
