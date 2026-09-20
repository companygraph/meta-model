// extractCore against a real tarball, built here with `tar -czf` over a temporary folder, so
// the fixture is a genuine gzip-tar and the suite never reaches the network for a release.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractCore } from "../lib/untar.mjs";

// A codeload tarball's one top-level folder, holding `core/` among the rest of the release —
// `lib/` is written too, so the test can prove it is left out.
function releaseTarball(prefix) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-tar-"));
  const root = path.join(stage, prefix);
  fs.mkdirSync(path.join(root, "core", "nested"), { recursive: true });
  fs.mkdirSync(path.join(root, "lib"), { recursive: true });
  fs.writeFileSync(path.join(root, "core", "CONVENTIONS.md"), "# Conventions\n");
  fs.writeFileSync(path.join(root, "core", "manifest.json"), '{"version":"0.31.0","shape":3}\n');
  fs.writeFileSync(path.join(root, "core", "nested", "deep.md"), "# Deep\n");
  fs.writeFileSync(path.join(root, "lib", "checks.mjs"), "// not the core\n");
  const tarball = path.join(stage, "release.tar.gz");
  // COPYFILE_DISABLE keeps macOS's bsdtar from writing AppleDouble `._name` sidecar entries for
  // extended attributes — noise no Linux-built release tarball carries, and not what this test
  // means to fix.
  execFileSync("tar", ["-czf", tarball, "-C", stage, prefix], { env: { ...process.env, COPYFILE_DISABLE: "1" } });
  return fs.readFileSync(tarball);
}

test("extractCore keeps only the regular files under <prefix>/core/, keyed relative to core/", () => {
  const core = extractCore(new Uint8Array(releaseTarball("meta-model-v0.31.0")));
  assert.deepEqual([...core.keys()].sort(), ["CONVENTIONS.md", "manifest.json", "nested/deep.md"]);
  assert.equal(core.get("CONVENTIONS.md"), "# Conventions\n");
  assert.equal(JSON.parse(core.get("manifest.json")).version, "0.31.0");
  assert.equal(core.get("nested/deep.md"), "# Deep\n");
});

test("nothing outside core/ comes back, whatever the release's top-level folder is called", () => {
  const core = extractCore(new Uint8Array(releaseTarball("meta-model-v0.30.0")));
  assert.ok(![...core.keys()].some((rel) => rel.startsWith("lib")));
});
