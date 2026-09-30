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

// An element of a schema, addressed by its schema's id and the key the schema writes it under
// (R18): a field by its key, a section by its heading, a column by its section and its name, an
// enum value by the `via` that holds it. The H1 and the `>` line have no key of their own, so
// they are `name` and `statement`. Only a stable id makes an address: `core/<type>` holds a
// slash, and no key may, which is what lets an address be read back by splitting on one.
const PARTS = {
  type: () => [],
  name: () => ["name"],
  statement: () => ["statement"],
  field: (e) => ["field", e.key],
  section: (e) => ["section", e.heading],
  column: (e) => ["column", e.section, e.column],
  enum: (e) => ["enum", e.via, e.value],
};

export function addressOf(schemaId, element) {
  if (typeof schemaId !== "string" || !schemaId || schemaId.includes("/"))
    throw new Error(`"${schemaId}" is no schema id; an address is built from a schema's stable id (R18)`);
  const parts = PARTS[element?.kind];
  if (!parts) throw new Error(`"${element?.kind}" is no kind of schema element`);
  const path = parts(element);
  for (const key of path.slice(1))
    if (typeof key !== "string" || !key || key.includes("/"))
      throw new Error(`"${key}" cannot stand in an address: a key is a string, not empty, with no "/"`);
  return [schemaId, ...path].join("/");
}

const ARITY = { name: 0, statement: 0, field: 1, section: 1, column: 2, enum: 2 };

export function elementOf(address) {
  const [schemaId, kind, ...rest] = address.split("/");
  if (!schemaId) throw new Error(`"${address}" is no element address`);
  if (kind === undefined) return { schemaId, element: { kind: "type" } };
  if (!(kind in ARITY) || rest.length !== ARITY[kind] || rest.some((k) => !k))
    throw new Error(`"${address}" is no element address`);
  const element =
    kind === "field" ? { kind, key: rest[0] }
    : kind === "section" ? { kind, heading: rest[0] }
    : kind === "column" ? { kind, section: rest[0], column: rest[1] }
    : kind === "enum" ? { kind, via: rest[0], value: rest[1] }
    : { kind };
  return { schemaId, element };
}
