import test from "node:test";
import assert from "node:assert/strict";
import { newestTag, pinReport, validatePins, discover } from "../lib/pins.mjs";

const SHA_OLD = "1111111111111111111111111111111111111111";
const SHA_NEW = "2222222222222222222222222222222222222222";
// A fake ls-remote: fixed tags and a fixed HEAD for each upstream, and nothing for one it does not know.
const remotes = {
  "companygraph/meta-model": { tags: ["v0.67.0", "v0.68.0", "v0.9.0", "not-a-version"], head: SHA_NEW },
  "acme/design": { tags: ["v1.2.0", "v1.10.0"], head: SHA_NEW },
  "acme/model": { tags: [], head: SHA_NEW },
};
const remote = (repo) => remotes[repo] ?? null;
const manifest = (tooling) => JSON.stringify({ tooling, core: { version: "0.50.0" } });

test("the newest tag is the highest version, not the last listed or the longest", () => {
  assert.equal(newestTag(["v0.9.0", "v0.10.0", "v0.2.0", "latest"]), "v0.10.0");
  assert.equal(newestTag(["latest"]), null);
});

test("a tag pin at the newest is current, and one before it is behind and names the newest", () => {
  const declared = { pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }, { kind: "npm-tag", file: "package.json", repo: "acme/design" }] };
  const texts = { ".companygraph/manifest.json": manifest("0.68.0"), "package.json": JSON.stringify({ dependencies: { design: "github:acme/design#v1.2.0" } }) };
  const { lines, failed } = pinReport({ declared, texts, remote });
  assert.equal(failed, false);
  assert.deepEqual(lines.map((l) => [l.status, l.newest ?? null]), [["current", "v0.68.0"], ["behind", "v1.10.0"]]);
});

test("a commit pin is current when it is the upstream's HEAD, short or long, and behind when HEAD moved", () => {
  const declared = { pins: [{ kind: "source-commit", file: "source.json", repo: "acme/model" }] };
  const at = (commit) => pinReport({ declared, texts: { "source.json": JSON.stringify({ repo: "acme/model", commit }) }, remote }).lines[0];
  assert.equal(at(SHA_NEW).status, "current");
  assert.equal(at(SHA_NEW.slice(0, 7)).status, "current");
  assert.deepEqual([at(SHA_OLD).status, at(SHA_OLD).newest], ["behind", SHA_NEW.slice(0, 7)]);
});

test("an upstream that cannot be reached is unknown, and that is no failure", () => {
  const declared = { pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/private" }] };
  const texts = { "package.json": JSON.stringify({ dependencies: { p: "github:acme/private#v1.0.0" } }) };
  const { lines, failed } = pinReport({ declared, texts, remote });
  assert.equal(lines[0].status, "unknown");
  assert.equal(failed, false);
});

test("an entry that names no line in its file is missing, and fails the report", () => {
  const declared = { pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/design" }] };
  const { lines, failed } = pinReport({ declared, texts: { "package.json": "{}" }, remote });
  assert.equal(lines[0].status, "missing");
  assert.equal(failed, true);
  assert.equal(pinReport({ declared, texts: {}, remote }).lines[0].status, "missing");
});

test("a pin line the repository holds and pins.json does not declare is unmanaged, and is not asked about", () => {
  let asked = 0;
  const counting = (repo) => (asked++, remote(repo));
  const texts = { "package.json": JSON.stringify({ dependencies: { design: "github:acme/design#v1.2.0" } }) };
  const { lines, failed } = pinReport({ declared: { pins: [] }, texts, remote: counting });
  assert.deepEqual(lines.map((l) => [l.status, l.kind, l.repo]), [["unmanaged", "npm-tag", "acme/design"]]);
  assert.equal(asked, 0);
  assert.equal(failed, false);
});

test("the family's own kinds are reported as the family's and not read or refused", () => {
  const declared = { pins: [{ kind: "conventions", file: "conventions.json", repo: "robertblust/conventions" }] };
  const { lines, failed } = pinReport({ declared, texts: { "conventions.json": JSON.stringify({ repo: "robertblust/conventions", tag: "v1.39.0" }) }, remote });
  assert.equal(lines[0].status, "family");
  assert.equal(failed, false);
});

test("a pins.json that cannot be read is refused by name", () => {
  assert.throws(() => validatePins({}), /no "pins" list/);
  assert.throws(() => validatePins({ pins: [{ kind: "tarball", file: "a", repo: "a/b" }] }), /unknown kind "tarball"/);
  assert.throws(() => validatePins({ pins: [{ kind: "npm-tag", file: "package.json" }] }), /"file" and "repo"/);
  assert.throws(() => validatePins({ pins: [{ kind: "npm-tag", file: "package.json", repo: "--upload-pack=x" }] }), /owner\/repository/);
  assert.doesNotThrow(() => validatePins({ pins: [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }] }));
});

test("an instance's manifest is found as its core-release pin", () => {
  assert.deepEqual(discover(".companygraph/manifest.json", manifest("0.68.0")), [{ kind: "core-release", file: ".companygraph/manifest.json", repo: "companygraph/meta-model" }]);
});
