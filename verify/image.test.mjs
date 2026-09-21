// R9's `image`, held from the file's own bytes. The fixtures are headers, not pictures: the
// check reads a PNG's IHDR and a JPEG's start-of-frame and nothing past them, so a header padded
// to a length is all a case needs, and building it here keeps a binary file out of the tests.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkInstance, imageInfoOf, IMAGE_FILE } from "../lib/checks.mjs";
import { parseInstance, imagesOf } from "../lib/instance.mjs";

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
  // A PNG signature is not enough on its own: what follows it has to be IHDR, or the offsets
  // this reader trusts for width and height belong to some other chunk.
  const notIhdr = new Uint8Array(24);
  notIhdr.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x44, 0x41, 0x54]);
  assert.equal(imageInfoOf(notIhdr), null);
});

test("a .jpeg name with JPEG bytes passes", () => {
  assert.deepEqual(run("mira.jpeg", [["model/profiles/mira/mira.jpeg", jpeg(512, 512)]]), []);
});

test("the header reader steps over EXIF, fill bytes and a DHT segment to an SOF2 frame", () => {
  const b = [
    0xff, 0xd8, // SOI
    // APP1 (EXIF): marker, length (8, including itself), "Exif\0\0"
    0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    // FF fill bytes before the marker, then a DHT (C4) segment with no payload
    0xff, 0xff, 0xff, 0xc4, 0x00, 0x02,
    // SOF2 (C2): length, precision, height 768, width 1024
    0xff, 0xc2, 0x00, 0x11, 0x08, 0x03, 0x00, 0x04, 0x00,
  ];
  assert.deepEqual(imageInfoOf(new Uint8Array(b)), { format: "jpeg", width: 1024, height: 768 });
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

test("an image field written as a YAML list fails, and its listed name is not also reported as unnamed", () => {
  const text = "---\nimage:\n  - mira.png\n---\n\n# Mira\n\n> A person.\n";
  const got = checkInstance(
    new Map([
      ["meta/core/profile-schema.md", PROFILE_SCHEMA],
      ["model/profiles/mira/mira.md", text],
      ["model/profiles/mira/experiences/README.md", "# Experiences\n"],
      ["model/profiles/mira/mira.png", png(512, 512)],
    ]),
    { core: "meta/core", model: "model" },
  ).failures;
  assert.ok(got.some((f) => /mira\.md: `image` is a list; an image names one file \(R9\)/.test(f)), got.join(" | "));
  assert.ok(!got.some((f) => /no page's `image` names it/.test(f)), got.join(" | "));
});

const IDENTITY_IMAGE_SCHEMA = [
  "# Identity Schema", "", "> A company.", "",
  "## File Location", "", "`identity.md`", "",
  "## Frontmatter", "",
  "| Field | Required | Type | Description |",
  "| --- | --- | --- | --- |",
  "| `image` | No | image | The company's logo. |", "",
  "## Sections", "",
  "| Section | Required | Description |",
  "| --- | --- | --- |", "",
].join("\n");

const runIdentity = (image, extra = []) =>
  checkInstance(
    new Map([
      ["meta/core/identity-schema.md", IDENTITY_IMAGE_SCHEMA],
      ["model/identity.md", `${image === null ? "" : `---\nimage: ${image}\n---\n\n`}# Acme\n\n> A company.\n`],
      ...extra,
    ]),
    { core: "meta/core", model: "model" },
  ).failures;

test("an image field on a singular type: a named image at the container root passes", () => {
  const got = runIdentity("identity.png", [["model/identity.png", png(512, 512)]]);
  assert.ok(!got.some((f) => f.includes("identity.png")), got.join(" | "));
});

test("an image field on a singular type: an unnamed image at the container root fails only as unnamed", () => {
  const got = runIdentity(null, [["model/identity.png", png(512, 512)]]);
  assert.ok(got.some((f) => /identity\.png: no page's `image` names it/.test(f)), got.join(" | "));
  assert.ok(!got.some((f) => /identity\.png.*not a folder of any type/.test(f)), got.join(" | "));
});

// `imagesOf` is what a site calls after parsing: read the example the way a site reads its
// model, bytes for an image and text for the rest, and ask it what to publish.
const ROOT = new URL("..", import.meta.url).pathname;
const tree = (rel, { asText = false } = {}) => {
  const out = new Map();
  const walk = (d) => {
    for (const name of readdirSync(join(ROOT, rel, d))) {
      const child = d ? `${d}/${name}` : name;
      if (statSync(join(ROOT, rel, child)).isDirectory()) walk(child);
      else out.set(child, readFileSync(join(ROOT, rel, child), IMAGE_FILE.test(child) && !asText ? undefined : "utf8"));
    }
  };
  walk("");
  return out;
};

test("imagesOf names each image a page carries, where it came from and where a site puts it", () => {
  const files = tree("example/model");
  const schemas = tree("core");
  const data = parseInstance(files, { sub: "model/", schemas });
  const images = imagesOf(files, data, { sub: "model/", schemas });
  assert.deepEqual(images.map(({ bytes, ...rest }) => rest), [
    { id: "profiles/ai-agent", field: "image", from: "profiles/ai-agent/ai-agent.png", to: "profiles/ai-agent.png" },
  ]);
  assert.deepEqual(imageInfoOf(images[0].bytes), { format: "png", width: 256, height: 256 });
});

test("imagesOf refuses an image read as text, rather than publish a corrupted file", () => {
  const files = tree("example/model", { asText: true });
  const schemas = tree("core");
  const data = parseInstance(files, { sub: "model/", schemas });
  assert.throws(() => imagesOf(files, data, { sub: "model/", schemas }), /ai-agent\.png.*read as text/);
});

// The container's allowance is for a file. A directory listing names folders too, and a folder
// named like an image holds files the image check never sees, so letting the name through would
// open the container to anything put inside one.
test("a folder named like an image is still refused, wherever it stands", () => {
  const failures = checkInstance(
    new Map([
      ["meta/core/profile-schema.md", PROFILE_SCHEMA],
      ["model/profiles/mira/mira.md", page(null)],
      ["model/profiles/mira/experiences/README.md", "# Experiences\n"],
      ["model/junk.png/notes.txt", "x"],
      ["model/skills/shot.png/notes.md", "# Notes\n\n> x\n"],
      ["model/profiles/mira/old.jpg/notes.txt", "x"],
    ]),
    { core: "meta/core", model: "model" },
  ).failures;
  assert.ok(failures.some((f) => /model\/junk\.png is not a folder of any type/.test(f)), failures.join(" | "));
  assert.ok(failures.some((f) => /model\/skills\/shot\.png should be a \.md file/.test(f)), failures.join(" | "));
  assert.ok(failures.some((f) => /mira\/old\.jpg is not a folder a profile owns/.test(f)), failures.join(" | "));
});

// The bounds are inclusive, and a test at each edge is what holds `<` from becoming `<=`.
test("the bounds are inclusive at both ends, and the byte cap at its own value", () => {
  assert.deepEqual(run("mira.png", [["model/profiles/mira/mira.png", png(256, 256)]]), []);
  assert.deepEqual(run("mira.png", [["model/profiles/mira/mira.png", png(1024, 1024)]]), []);
  assert.deepEqual(run("mira.png", [["model/profiles/mira/mira.png", png(512, 512, 300 * 1024)]]), []);
  fails("mira.png", png(255, 255), /255×255; an image is 256 to 1024/);
  fails("mira.png", png(1025, 1025), /1025×1025; an image is 256 to 1024/);
});

// Bytes are a Uint8Array, which a Node Buffer is, or the ArrayBuffer a fetch hands back. Text is
// a reader's mistake and not the file's, and the message has to say whose it is.
test("an ArrayBuffer is bytes, and an image read as text is reported as the reader's mistake", () => {
  assert.deepEqual(run("mira.png", [["model/profiles/mira/mira.png", png(512, 512).buffer]]), []);
  const got = run("mira.png", [["model/profiles/mira/mira.png", "�PNG as text"]]);
  assert.ok(got.some((f) => /mira\.png: was read as text, not bytes/.test(f)), got.join(" | "));
  assert.ok(!got.some((f) => /is not a PNG/.test(f)), got.join(" | "));
});

test("imagesOf takes an ArrayBuffer, hands back a Uint8Array, and names a missing file as missing", () => {
  const files = tree("example/model");
  const schemas = tree("core");
  const data = parseInstance(files, { sub: "model/", schemas });
  const at = "profiles/ai-agent/ai-agent.png";
  const u8 = files.get(at);
  files.set(at, u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength));
  const [image] = imagesOf(files, data, { sub: "model/", schemas });
  assert.ok(image.bytes instanceof Uint8Array);
  assert.deepEqual(imageInfoOf(image.bytes), { format: "png", width: 256, height: 256 });
  files.delete(at);
  assert.throws(() => imagesOf(files, data, { sub: "model/", schemas }), /ai-agent\.png, named by .*ai-agent\.md, is not there/);
});

// Two image fields on one entity with one extension would publish under one name, and a site
// would overwrite the first with the second in silence.
test("imagesOf refuses two images that would publish under one name", () => {
  const schemas = new Map([
    ["identity-schema.md", IDENTITY_IMAGE_SCHEMA.replace("| `image` | No | image | The company's logo. |", "| `image` | No | image | The company's logo. |\n| `banner` | No | image | The banner. |")],
  ]);
  const files = new Map([
    ["identity.md", "---\nimage: mark.png\nbanner: banner.png\n---\n\n# Acme\n\n> A company.\n"],
    ["mark.png", png(512, 512)],
    ["banner.png", png(512, 512)],
  ]);
  const data = parseInstance(files, { schemas });
  assert.throws(() => imagesOf(files, data, { schemas }), /identity\.png.*both `image` and `banner`/);
});
