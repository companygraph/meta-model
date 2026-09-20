// fetchCore against a fake `get`, since it is the only place this package reaches the network.
// The tarball it decodes is one this test builds for itself, exactly as untar.test.mjs does, so
// neither path here ever touches a URL.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fetchCore } from "../lib/fetch-core.mjs";

function releaseTarball(prefix) {
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-tar-"));
  const root = path.join(stage, prefix, "core");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "CONVENTIONS.md"), "# Conventions\n");
  const tarball = path.join(stage, "release.tar.gz");
  // COPYFILE_DISABLE and --format=ustar keep macOS's bsdtar from writing AppleDouble sidecar
  // entries and a pax extended header per file — see untar.test.mjs for why.
  execFileSync("tar", ["--format=ustar", "-czf", tarball, "-C", stage, prefix], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
  const bytes = fs.readFileSync(tarball);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

test("a successful fetch is decoded into the tag's core", async () => {
  const body = releaseTarball("meta-model-v0.31.0");
  const get = async (url) => {
    assert.equal(url, "https://codeload.github.com/companygraph/meta-model/tar.gz/refs/tags/v0.31.0");
    return { ok: true, arrayBuffer: async () => body };
  };
  const core = await fetchCore("v0.31.0", get);
  assert.equal(core.get("CONVENTIONS.md"), "# Conventions\n");
});

test("a fetch that answers not ok refuses, naming the tag and the status", async () => {
  const get = async () => ({ ok: false, status: 404 });
  await assert.rejects(() => fetchCore("v9.9.9", get), /v9\.9\.9.*404/s);
});
