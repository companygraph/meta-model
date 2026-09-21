// R9's `image`, held from the file's own bytes. The fixtures are headers, not pictures: the
// check reads a PNG's IHDR and a JPEG's start-of-frame and nothing past them, so a header padded
// to a length is all a case needs, and building it here keeps a binary file out of the tests.
import test from "node:test";
import assert from "node:assert/strict";
import { imageInfoOf, IMAGE_FILE } from "../lib/checks.mjs";

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
