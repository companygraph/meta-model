// extractCore against a real tarball, built here with `tar -czf` over a temporary folder, so
// the fixture is a genuine gzip-tar and the suite never reaches the network for a release.
import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { gzipSync } from "node:zlib";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractCore } from "../lib/untar.mjs";

const BLOCK = 512;

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
  // extended attributes, and --format=ustar keeps it from wrapping every entry in a pax extended
  // header of its own — both are macOS/libarchive defaults, and neither is what a Linux-built
  // GitHub release tarball (or this test) is about.
  execFileSync("tar", ["--format=ustar", "-czf", tarball, "-C", stage, prefix], {
    env: { ...process.env, COPYFILE_DISABLE: "1" },
  });
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

// The one fixture in this file not built through `tar`: bsdtar and GNU tar disagree on what to
// call the GNU long-name format on the command line — bsdtar 3.5.3 accepts only
// `--format=gnutar` and rejects `--format=gnu`, GNU tar accepts only `--format=gnu` and rejects
// `--format=gnutar` — so no flag name runs the same fixture-building command on both a
// developer's Mac and this repository's ubuntu-latest CI. The archive is built by hand instead,
// which also proves the thing this test is actually about: that OUR parser refuses a typeflag
// it cannot honor, not that some particular tar binary can be persuaded to emit one.

// A tar octal field is ASCII digits, NUL-terminated, right-justified to `width` bytes of digits
// plus the NUL — tar predates binary integers being portable across machines.
function octal(n, width) {
  return `${n.toString(8).padStart(width, "0")}\0`;
}

// A 512-byte tar header with only the fields extractCore (or a real tar reader) looks at filled
// in; everything else stays zero, which is what an unused field holds in a real archive too.
// The checksum is the one field that must be computed last: fill it with eight spaces, sum
// every byte of the header including those spaces, then write the sum as six octal digits, a
// NUL, and a trailing space — the format tar itself has used since it had one.
function tarHeader({ name, size, typeFlag }) {
  const block = Buffer.alloc(BLOCK);
  block.write(name, 0, "utf8");
  block.write(octal(size, 11), 124, "ascii");
  block[156] = typeFlag.charCodeAt(0);
  block.fill(0x20, 148, 156);
  let sum = 0;
  for (const byte of block) sum += byte;
  block.write(`${sum.toString(8).padStart(6, "0")}\0 `, 148, "ascii");
  return block;
}

function padded(buffer) {
  return Buffer.concat([buffer, Buffer.alloc((BLOCK - (buffer.length % BLOCK)) % BLOCK)]);
}

test("a GNU long-name header refuses rather than mis-keying the entry it introduces", () => {
  const longPath = `meta-model-v0.31.0/core/${"a".repeat(90)}/deep.md`;
  const content = Buffer.from("# Deep\n", "utf8");

  // The long-name record: name is the fixed sentinel GNU tar writes, "././@LongLink", and size
  // is the long path's length including the NUL GNU tar terminates it with.
  const longLinkHeader = tarHeader({ name: "././@LongLink", size: longPath.length + 1, typeFlag: "L" });
  const longLinkBody = padded(Buffer.from(`${longPath}\0`, "utf8"));

  // The regular-file entry the long-name record introduces, carrying the truncated fallback
  // name a reader that skipped the "L" record would fall back to — the mis-keying extractCore
  // refuses rather than risks.
  const fileHeader = tarHeader({ name: longPath.slice(0, 100), size: content.length, typeFlag: "0" });
  const fileBody = padded(content);

  const archive = Buffer.concat([longLinkHeader, longLinkBody, fileHeader, fileBody, Buffer.alloc(BLOCK * 2)]);
  assert.throws(() => extractCore(new Uint8Array(gzipSync(archive))), /long-name/i);
});
