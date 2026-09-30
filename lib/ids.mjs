// What an entity's id is (R18), made and read in one place. Pure apart from the random bytes a
// new id takes, which a caller may hand in, and free of every other module here, so the checks,
// the plan and the CLI all import it without importing each other. No Node import: this module
// also bundles for a browser or the Obsidian plugin, which run outside Node.

// A UUID version 7 (RFC 9562), in the lowercase R18 fixes. An uppercase one is a different
// string to every consumer that compares strings, so it is not the same id and fails.
export const UUIDV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const toHex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

// 48 bits of Unix milliseconds, the version, 12 random bits, the variant, 62 random bits.
// `random` is any byte array of at least ten bytes — a `Uint8Array`, a `Buffer`, or anything
// else that indexes like one — so a caller outside Node can hand in its own.
export function uuidv7(ms = Date.now(), random = globalThis.crypto.getRandomValues(new Uint8Array(10))) {
  if (!Number.isInteger(ms) || ms < 0 || ms >= 2 ** 48) throw new RangeError(`${ms} is no moment a UUID version 7 can hold`);
  const b = new Uint8Array(16);
  let t = ms;
  for (let i = 5; i >= 0; i--) {
    b[i] = t % 256;
    t = Math.floor(t / 256);
  }
  b[6] = 0x70 | (random[0] & 0x0f);
  b[7] = random[1];
  b[8] = 0x80 | (random[2] & 0x3f);
  for (let i = 0; i < 7; i++) b[9 + i] = random[3 + i];
  const h = toHex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// The moment an id was made, read back from its first 48 bits.
export const msOf = (id) => parseInt(id.replace(/-/g, "").slice(0, 12), 16);

const FRONTMATTER = /^---\n([\s\S]*?)\n---(?:\n|$)/;
const scalar = (fm, field) => fm.match(new RegExp(`^${field}:[ \\t]*(\\S.*?)[ \\t]*$`, "m"))?.[1] ?? null;

export const idOf = (text) => scalar(text.match(FRONTMATTER)?.[1] ?? "", "id");

// The id goes first, where every schema declares it, and nothing else in the file moves. A page
// that has one keeps it: R18 never changes an id, and a writer asked to is refused.
export function withId(text, id) {
  if (idOf(text) !== null) throw new Error("the page already carries an id, and R18 never changes one");
  if (text.startsWith("---\n")) return `---\nid: ${id}\n${text.slice(4)}`;
  return `---\nid: ${id}\n---\n\n${text}`;
}

// What `model/identifier.md` declares, as a test an id either passes or fails. A declaration that
// cannot be read is an error naming why, and the caller reports it once, on the identifier file.
export function idFormatOf(text) {
  const fm = text.match(FRONTMATTER)?.[1] ?? "";
  const format = scalar(fm, "format");
  const pattern = scalar(fm, "pattern");
  if (format === "uuidv7") {
    if (pattern !== null) return { error: "`pattern` is written, and a pattern is written only with `format: pattern`" };
    return { format, test: (v) => UUIDV7.test(v) };
  }
  if (format === "pattern") {
    if (!pattern) return { error: "`format` is `pattern`, and no `pattern` is written" };
    if (!pattern.startsWith("^") || !pattern.endsWith("$")) return { error: "`pattern` is not anchored at both ends, `^` and `$`" };
    let re;
    try {
      re = new RegExp(pattern);
    } catch (e) {
      return { error: `\`pattern\` is no regular expression: ${e.message}` };
    }
    return { format, test: (v) => re.test(v) };
  }
  return { error: `\`format\` is ${format === null ? "missing" : `"${format}"`}; it is \`uuidv7\` or \`pattern\`` };
}
