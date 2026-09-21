// R9's `image`, held from the file's own bytes. The fixtures are headers, not pictures: the
// check reads a PNG's IHDR and a JPEG's start-of-frame and nothing past them, so a header padded
// to a length is all a case needs, and building it here keeps a binary file out of the tests.
import test from "node:test";
import assert from "node:assert/strict";
import { checkInstance, imageInfoOf, IMAGE_FILE } from "../lib/checks.mjs";

const png = (w, h, length = 64) => {
  const b = new Uint8Array(Math.max(length, 24));
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(b.buffer).setUint32(16, w);
  new DataView(b.buffer).setUint32(20, h);
  return b;
};

// SOI, an APP0 segment to step over, then SOF0 with the size.
const jpeg = (w, h, length = 64) => {
  const b = new Uint8Array(Math.max(length, 32));
  b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  new DataView(b.buffer).setUint16(13, h);
  new DataView(b.buffer).setUint16(15, w);
  return b;
};

test("the header reader reads both formats and refuses anything else", () => {
  assert.deepEqual(imageInfoOf(png(512, 512)), { format: "png", width: 512, height: 512 });
  assert.deepEqual(imageInfoOf(jpeg(640, 480)), { format: "jpeg", width: 640, height: 480 });
  assert.equal(imageInfoOf(new TextEncoder().encode("not a picture")), null);
  assert.equal(imageInfoOf("a string, as a reader that read an image as text hands it"), null);
  assert.ok(IMAGE_FILE.test("a.jpeg") && IMAGE_FILE.test("a.jpg") && IMAGE_FILE.test("a.png"));
  assert.ok(!IMAGE_FILE.test("a.gif") && !IMAGE_FILE.test("a.JPG"));
});

const PROFILE_SCHEMA = [
  "# Profile Schema", "", "> A profile.", "",
  "## File Location", "", "`profiles/`", "",
  "## Frontmatter", "",
  "| Field | Required | Type | Description |",
  "| --- | --- | --- | --- |",
  "| `image` | No | image | The person's picture. |", "",
  "## Sections", "",
  "| Section | Required | Description |",
  "| --- | --- | --- |", "",
].join("\n");

const page = (image) => `${image === null ? "" : `---\nimage: ${image}\n---\n\n`}# Mira\n\n> A person.\n`;

const run = (image, extra = []) =>
  checkInstance(
    new Map([
      ["meta/core/profile-schema.md", PROFILE_SCHEMA],
      ["model/profiles/mira/mira.md", page(image)],
      ["model/profiles/mira/experiences/README.md", "# Experiences\n"],
      ...extra,
    ]),
    { core: "meta/core", model: "model" },
  ).failures.filter((f) => /R9|R5|should be a \.md/.test(f) && /mira|\.png|\.jpe?g/.test(f));

test("a square picture beside its page and within bounds passes, and so does no image at all", () => {
  assert.deepEqual(run("mira.png", [["model/profiles/mira/mira.png", png(512, 512)]]), []);
  assert.deepEqual(run("mira.jpg", [["model/profiles/mira/mira.jpg", jpeg(1000, 1000)]]), []);
  assert.deepEqual(run(null), []);
});

const fails = (image, bytes, pattern) => {
  const got = run(image, bytes ? [[`model/profiles/mira/${image}`, bytes]] : []);
  assert.ok(got.some((f) => pattern.test(f)), `expected ${pattern}; got: ${got.join(" | ") || "none"}`);
};

test("a rectangle fails", () => fails("mira.jpg", jpeg(800, 600), /800×600; an image is square/));
test("a picture under the floor fails", () => fails("mira.png", png(200, 200), /200×200; an image is 256 to 1024/));
test("a picture over the ceiling fails", () => fails("mira.png", png(2048, 2048), /2048×2048; an image is 256 to 1024/));
test("a file over the byte cap fails", () => fails("mira.png", png(512, 512, 300 * 1024 + 1), /307201 bytes; an image is at most 307200/));
test("a PNG named .jpg fails", () => fails("mira.jpg", png(512, 512), /is a PNG named as a JPEG/));
test("bytes that are neither format fail", () => fails("mira.png", new TextEncoder().encode("hello"), /is not a PNG/));
test("a name with a path fails", () => fails("../tomas/tomas.png", null, /named without a path/));
test("a name of another format fails", () => fails("mira.gif", null, /\.jpg, \.jpeg or \.png/));
test("a name with no file beside the page fails", () => fails("mira.png", null, /there is no model\/profiles\/mira\/mira\.png/));

test("an image no page names fails, and does not also fail the container", () => {
  const got = run(null, [["model/profiles/mira/old.png", png(512, 512)]]);
  assert.ok(got.some((f) => /old\.png: no page's `image` names it/.test(f)), got.join(" | "));
  assert.ok(!got.some((f) => /not a folder a profile owns/.test(f)), got.join(" | "));
});
