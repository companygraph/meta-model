import test from "node:test";
import assert from "node:assert/strict";
import { UUIDV7, uuidv7, msOf, idOf, withId, idFormatOf } from "../lib/ids.mjs";

const ZERO = Buffer.alloc(10);

test("a UUID version 7 carries its moment in its first 48 bits, its version and its variant", () => {
  const id = uuidv7(Date.UTC(2026, 7, 29, 7, 57, 8), ZERO);
  assert.match(id, UUIDV7);
  assert.equal(msOf(id), Date.UTC(2026, 7, 29, 7, 57, 8));
  assert.equal(id[14], "7");
  assert.equal(id[19], "8");
});

test("two ids made in one millisecond differ by their random part", () => {
  const ms = Date.now();
  assert.notEqual(uuidv7(ms), uuidv7(ms));
});

test("a moment outside 48 bits is refused", () => {
  assert.throws(() => uuidv7(-1), RangeError);
  assert.throws(() => uuidv7(2 ** 48), RangeError);
});

test("idOf reads the id from the frontmatter only", () => {
  assert.equal(idOf("---\nid: abc\nsource: Local\n---\n\n# X\n"), "abc");
  assert.equal(idOf("# X\n\nid: abc\n"), null);
  assert.equal(idOf("---\nsource: Local\n---\n\n# X\n"), null);
});

test("withId puts the id first in an existing frontmatter and leaves the rest as it was", () => {
  const page = "---\nsource: Local\n---\n\n# X\n";
  assert.equal(withId(page, "abc"), "---\nid: abc\nsource: Local\n---\n\n# X\n");
});

test("withId gives a page with no frontmatter one that holds only the id", () => {
  assert.equal(withId("# Local\n\n> Here.\n", "abc"), "---\nid: abc\n---\n\n# Local\n\n> Here.\n");
});

test("withId refuses a page that already carries an id, since R18 never changes one", () => {
  assert.throws(() => withId("---\nid: a\n---\n\n# X\n", "b"), /R18/);
});

const identifier = (fm) => `---\nid: x\nsource: Local\n${fm}---\n\n# Entity id\n`;

test("uuidv7 accepts a lowercase UUID version 7 and refuses an uppercase one", () => {
  const f = idFormatOf(identifier("format: uuidv7\n"));
  assert.equal(f.format, "uuidv7");
  const id = uuidv7();
  assert.equal(f.test(id), true);
  assert.equal(f.test(id.toUpperCase()), false);
});

test("pattern holds ids to the pattern", () => {
  const f = idFormatOf(identifier("format: pattern\npattern: ^E-[0-9]{4,}$\n"));
  assert.equal(f.format, "pattern");
  assert.equal(f.test("E-0042"), true);
  assert.equal(f.test("E-42"), false);
});

test("a pattern with no anchors, a pattern that is no expression, and a pattern beside uuidv7 are each an error", () => {
  assert.match(idFormatOf(identifier("format: pattern\npattern: E-[0-9]+\n")).error, /anchored/);
  assert.match(idFormatOf(identifier("format: pattern\npattern: ^E-[0-9+$\n")).error, /no regular expression/);
  assert.match(idFormatOf(identifier("format: pattern\n")).error, /no `pattern`/);
  assert.match(idFormatOf(identifier("format: uuidv7\npattern: ^x$\n")).error, /only with `format: pattern`/);
  assert.match(idFormatOf(identifier("format: serial\n")).error, /`uuidv7` or `pattern`/);
});
