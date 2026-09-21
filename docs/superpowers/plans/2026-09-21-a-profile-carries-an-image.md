# A profile carries an image implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `image` to R9's closed type vocabulary, give the profile schema an optional `image` field, hold every image to its form from its own bytes, and export `imagesOf` so a site can publish what the model names.

**Architecture:** The vocabulary member is declared in `core/CONVENTIONS.md` and read by the checks like `date`: one generic check finds every field declared `image` in whatever schema declares one and holds the named file from its header — beside its page, a JPEG or PNG that is what its name says, square, 256–1024 pixels, at most 300 KB — and fails an image nothing names. Every reader that builds a file map from disk reads `.jpg`, `.jpeg` and `.png` as bytes and everything else as text, deciding by one regular expression, `IMAGE_FILE`, that lives in the parser's module and is re-exported from the checks. The parser is unchanged; `imagesOf(files, data, { sub, schemas })` beside it tells a site what to copy and where.

**Tech Stack:** Node 22+ (the repository runs on the Homebrew Node), no dependencies. `node:test` for unit tests. Markdown schemas in `core/`, a worked instance in `example/`, a hand-written verification script in `verify/check.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-21-a-profile-carries-an-image-design.md`

Every code block and every expected output below was run once, in a throwaway clone of `main` at 74668a3, before this plan was written. Where a step says a test passes on its first run, it did. The end-to-end run also took a scratch copy of the reference instance through the prototype's `upgrade`, added the owner's own 1000×1000, 156 KB JPEG, and read `✓ … the mechanical checks pass`; a 1122×1402 PNG renamed `.jpg` in its place failed as a PNG named as a JPEG and as not square.

## Global Constraints

- **Scope is this repository only.** The reference instance, design, the sites, the MCP server and its deployments and the Obsidian plugin take the release afterwards; the last section names them. Do not touch them here.
- **Branch and worktree:** `a-profile-carries-an-image`, in `~/git/companygraph/meta-model-a-profile-carries-an-image`, which already holds the spec and this plan. The clone at `~/git/companygraph/meta-model` stays on `main` and is not touched.
- **`export PATH=/opt/homebrew/bin:$PATH`** before any `node`, `npm` or `gh` command. A push names the credential helper: `git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin a-profile-carries-an-image`.
- **Never commit on the default branch.** Never chain a branch delete after a merge. Commit only because the owner asked for this plan to be executed; merging is a separate word of theirs.
- **The bounds are exact:** `.jpg`, `.jpeg` or `.png`, lowercase; square; 256 to 1024 pixels on a side inclusive; at most 307,200 bytes (300 × 1024). 512×512 is the size the schema recommends.
- **The published name is `<entity id>.<extension>`**, the id as the parser gives it (`profiles/ai-agent`), the extension as the page wrote it. A site puts it under `images/`.
- **`shape` stays 3.** Only this repository's `verify` holds a schema to the vocabulary; the parser reads an unknown Type cell as a fact, so tooling that reads the old core reads this one.
- **No check names `profile`.** `lib/checks.mjs` finds image fields by their declared type in whatever schema declares one, as R16 has every field read.
- **Prose register** for every Markdown word written here, per `conventions/WRITING.md`: paragraphs by default, cause before mechanism, en-US spelling, no serial comma, spaced em-dash, no adjective that sells, no count or version of something that still moves.
- **Commit messages** follow the git register: a subject that is a sentence under seventy characters with no prefix and no trailing period, a body of one to three short paragraphs with no headers and no bullets, one line beginning `Verified:` naming what ran and passed after the last edit (each exit code read on its own, never through a pipe), then the trailer `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`.
- **Test counts are written as changes**, because another branch may land first. Read the totals before starting, as Task 1's first step says.

---

### Task 1: An image's bytes say what it is

The check in Task 2 needs one thing it cannot get from the text of a page: what a file's header says about its format and its size. This task adds that reader, the regular expression every reader of an instance will decide by, the bounds, and `image` in the vocabulary set. Nothing yet declares an image, so no existing behavior moves.

**Files:**

- Modify: `lib/instance.mjs` (insert above the comment that opens `// What the schemas constrain, per type and as plain data,`, just after `enumTokensOf`)
- Modify: `lib/checks.mjs` (the import from `./instance.mjs` near line 20, the re-export under it, `TYPE_VOCABULARY` near line 95, and a block after `export const DATE` near line 100)
- Create: `verify/image.test.mjs`
- Modify: `package.json` (the `test:instance-checks` script)

**Interfaces:**

- Consumes: nothing new.
- Produces: `IMAGE_FILE` (`/\.(jpe?g|png)$/`), exported from `lib/instance.mjs` and re-exported from `lib/checks.mjs`; `IMAGE_BOUNDS` (`{ min: 256, max: 1024, bytes: 307200 }`) and `imageInfoOf(bytes) → { format: "png" | "jpeg", width, height } | null` from `lib/checks.mjs`; `TYPE_VOCABULARY` includes `"image"`. `verify/image.test.mjs` defines `png(w, h, length)` and `jpeg(w, h, length)`, which build a header padded to a length, and Tasks 2 and 4 reuse them.

- [ ] **Step 1: Read the totals**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git status --short && git log --oneline -1
node verify/check.mjs > /dev/null; echo "verify $?"
for f in verify/*.test.mjs; do node --test $f 2>&1 | grep -E "^ℹ (pass|fail)" | tr '\n' ' '; echo " $f"; done
```

Expected: `verify 0` and `fail 0` on every line. Note the `pass` totals of `instance-checks`, `check-script`, `declared-joins` and `list-kind`; at 74668a3 they were 73, 1, 11 and 13. `git status` shows only the spec and this plan as untracked, or nothing if they are committed.

- [ ] **Step 2: Write the failing test**

Create `verify/image.test.mjs`:

```js
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
```

In `package.json`, append ` verify/image.test.mjs` to the `test:instance-checks` script, so it reads `"node --test verify/instance-checks.test.mjs verify/declared-joins.test.mjs verify/list-kind.test.mjs verify/image.test.mjs"`. CI runs that script, and a test file no script names never runs there.

- [ ] **Step 3: Run it to see it fail**

Run: `node --test verify/image.test.mjs 2>&1 | grep -E "SyntaxError|^ℹ fail"`

Expected: `SyntaxError: The requested module '../lib/checks.mjs' does not provide an export named 'IMAGE_FILE'` and `ℹ fail 1`.

- [ ] **Step 4: Write the implementation**

In `lib/instance.mjs`, insert directly above `// What the schemas constrain, per type and as plain data,`:

```js
// R9's image: a file beside the page that names it, a JPEG or a PNG. Every reader of an instance
// reads a file this matches as bytes and everything else as text, because an image read as text
// is corrupted before anything sees it, and a reader that decided by a list of its own would be
// the second copy that drifts.
export const IMAGE_FILE = /\.(jpe?g|png)$/;

```

In `lib/checks.mjs`, replace the import and the re-export under it:

```js
import { listsDeclarationOf, underDeclarationOf, listKindOf, enumTokensOf, IMAGE_FILE } from "./instance.mjs";

// enumTokensOf is read in the parser's module, beside the other readers of a Description, and
// offered here too, where consumers already import it from. IMAGE_FILE is the parser's for the
// same reason: `imagesOf` beside it and every reader of an instance decide by it.
export { enumTokensOf, IMAGE_FILE };
```

Change `TYPE_VOCABULARY` to:

```js
export const TYPE_VOCABULARY = new Set(["string", "number", "date", "array", "enum", "image"]);
```

And insert after the line `export const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;` and its blank line:

```js
// R9's bounds for an image, one place for the check and for anything that tells a writer.
export const IMAGE_BOUNDS = { min: 256, max: 1024, bytes: 300 * 1024 };

// What an image's own bytes say it is: its format from the signature and its size from the
// header, a PNG's IHDR or a JPEG's first start-of-frame. Null when the bytes are neither, which
// is how a PNG renamed `.jpg` and a text file named `.png` are both caught. No dependency: both
// headers are a few bytes at known places.
export function imageInfoOf(bytes) {
  if (!(bytes instanceof Uint8Array)) return null;
  const b = bytes;
  const u16 = (i) => (b[i] << 8) | b[i + 1];
  const u32 = (i) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 24 && PNG.every((x, i) => b[i] === x))
    return { format: "png", width: u32(16), height: u32(20) };
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    let i = 2;
    while (i + 3 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; } // fill bytes before a marker
      // A start-of-frame carries the size; C4, C8 and CC share the range and are not frames.
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker))
        return i + 8 < b.length ? { format: "jpeg", width: u16(i + 7), height: u16(i + 5) } : null;
      // Markers that stand alone carry no length.
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) { i += 2; continue; }
      i += 2 + u16(i + 2);
    }
    return null;
  }
  return null;
}

```

- [ ] **Step 5: Run the test, and read two real files**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image
node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
node -e 'import("./lib/checks.mjs").then(m=>{const fs=require("fs");console.log(m.imageInfoOf(fs.readFileSync(process.env.HOME+"/Desktop/robert-blust.jpg")), m.imageInfoOf(fs.readFileSync(process.env.HOME+"/Desktop/images/Robert_Blust_Portrait.png")))})'
node verify/check.mjs > /dev/null; echo "verify $?"
```

Expected: `pass 1`, `fail 0`; then `{ format: 'jpeg', width: 1000, height: 1000 } { format: 'png', width: 1122, height: 1402 }`, which `sips -g pixelWidth -g pixelHeight` agrees with; then `verify 0`. The two real files are the owner's and are read, never copied into this repository.

- [ ] **Step 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git add lib/instance.mjs lib/checks.mjs verify/image.test.mjs package.json && git commit -F - <<'MSG'
An image's own bytes say what format and size it is

A profile is about to name a picture beside it, and the check that holds
one needs what no page can say: whether the file is the JPEG or PNG its
name claims, and how large it is. Both are a few bytes at known places, a
PNG's IHDR and a JPEG's first start-of-frame, so they are read here with
no dependency.

IMAGE_FILE lives in the parser's module and the checks re-export it, as
they already do enumTokensOf, because every reader of an instance will
decide by it and a second list would drift. image joins the vocabulary
set; nothing declares one yet.

Verified: node --test verify/image.test.mjs passes, the reader gives
1000×1000 and 1122×1402 for two real files as sips does, and node
verify/check.mjs exits 0.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 2: An image field is held to its form, and every image is named

This is the check. It reads which fields are declared `image` in each schema, holds the file each names from its bytes, and fails any image in the container no page names. The container check has to let an image stand beside a page, or every correct image would fail as a stray file before the image check could say anything; the tests hold that too.

**Files:**

- Modify: `lib/checks.mjs` (two lines in `the container holds what the types imply`, and a new check inserted before `filenames derive, or take the form their schema states`)
- Modify: `verify/image.test.mjs` (the import, and cases appended)

**Interfaces:**

- Consumes: `IMAGE_FILE`, `IMAGE_BOUNDS`, `imageInfoOf` from Task 1; inside `instanceChecks`, the existing `files`, `fieldsOf`, `walkMd`, `typeOfFile`, `frontmatterOf`, `fmScalar`, `fail`, `EX` and `TYPES`.
- Produces: a check named `an image field names a square picture beside its page, and every image is named`, citing R9. Its failure messages, which the plugin will later locate by: `` `<field>` is "<value>"; an image is a file in the page's own folder, named without a path (R9) ``; `` `<field>` is "<value>"; an image is .jpg, .jpeg or .png (R9) ``; `` `<field>` names <value>, and there is no <path> (R9) ``; `<path>: is not a <PNG|JPEG>, whatever its name says (R9)`; `<path>: is a <X> named as a <Y> (R9)`; `<path>: is <w>×<h>; an image is square (R9)`; `<path>: is <w>×<h>; an image is 256 to 1024 pixels on a side (R9)`; `<path>: is <n> bytes; an image is at most 307200 (R9)`; `` <path>: no page's `image` names it (R9) ``.

- [ ] **Step 1: Write the failing tests**

In `verify/image.test.mjs`, change the import from the checks to:

```js
import { checkInstance, imageInfoOf, IMAGE_FILE } from "../lib/checks.mjs";
```

And append:

```js
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
```

The fixture's `experiences/README.md` is there because a profile folder must hold the folder of what a profile owns, and the filter keeps each case to the failures about images, as the other suites' cases keep to their own.

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`

Expected: `pass 1`, `fail 11`: only the header reader's test passes, and the first case fails because the container check reports `mira.png` as a stray file.

- [ ] **Step 3: Let an image stand beside a page**

In `lib/checks.mjs`, in `the container holds what the types imply`, replace:

```js
          if (!owns) {
            if (!name.endsWith(".md")) fail(`${EX}/${base}/${name} should be a .md file`);
            continue;
          }
```

with:

```js
          if (!owns) {
            // An image sits beside the page that names it (R9); whether one does is the image
            // check's finding, not this one's.
            if (!name.endsWith(".md") && !IMAGE_FILE.test(name)) fail(`${EX}/${base}/${name} should be a .md file`);
            continue;
          }
```

and replace the condition in the owner-folder loop:

```js
            if (entry !== `${name}.md` && entry !== "README.md" && !ownedFolders.includes(entry))
```

with:

```js
            if (entry !== `${name}.md` && entry !== "README.md" && !ownedFolders.includes(entry) && !IMAGE_FILE.test(entry))
```

- [ ] **Step 4: Write the check**

In `lib/checks.mjs`, insert this element into the returned list directly before the element whose comment opens `// R12 in the one direction a script can take:`:

```js
  {
    // R9 fixes one form for `image`, so a field declared `image` can be held to it from the
    // file's own bytes: beside its page, a JPEG or a PNG that is what its name says, square, and
    // within the bounds. The other half is the container's: an image no page names is one no
    // build copies and no reader reaches, so it fails too. Whether the picture shows the person
    // is a writing rule, and the agent pass's.
    name: "an image field names a square picture beside its page, and every image is named",
    rule: "R9",
    run() {
      const named = new Set();
      const imageFields = new Map(
        TYPES.map((t) => [
          t.type,
          fieldsOf(t.type).filter(({ declared }) => declared === "image").map(({ field }) => field),
        ]),
      );
      const { min, max, bytes: cap } = IMAGE_BOUNDS;
      walkMd(EX, (child, text) => {
        const fields = imageFields.get(typeOfFile(child)) ?? [];
        if (!fields.length) return;
        const fmText = frontmatterOf(text);
        const dir = child.split("/").slice(0, -1).join("/");
        for (const field of fields) {
          const value = fmScalar(fmText, field);
          if (value === null || value === "") continue;
          if (value.includes("/")) {
            fail(`${child}: \`${field}\` is "${value}"; an image is a file in the page's own folder, named without a path (R9)`);
            continue;
          }
          if (!IMAGE_FILE.test(value)) {
            fail(`${child}: \`${field}\` is "${value}"; an image is .jpg, .jpeg or .png (R9)`);
            continue;
          }
          const at = `${dir}/${value}`;
          named.add(at);
          const bytes = files.get(at);
          if (bytes === undefined) {
            fail(`${child}: \`${field}\` names ${value}, and there is no ${at} (R9)`);
            continue;
          }
          const info = imageInfoOf(bytes);
          const said = /\.png$/.test(value) ? "png" : "jpeg";
          if (!info) {
            fail(`${at}: is not a ${said === "png" ? "PNG" : "JPEG"}, whatever its name says (R9)`);
            continue;
          }
          if (info.format !== said)
            fail(`${at}: is a ${info.format === "png" ? "PNG" : "JPEG"} named as a ${said === "png" ? "PNG" : "JPEG"} (R9)`);
          if (info.width !== info.height)
            fail(`${at}: is ${info.width}×${info.height}; an image is square (R9)`);
          else if (info.width < min || info.width > max)
            fail(`${at}: is ${info.width}×${info.height}; an image is ${min} to ${max} pixels on a side (R9)`);
          if (bytes.length > cap)
            fail(`${at}: is ${bytes.length} bytes; an image is at most ${cap} (R9)`);
        }
      });
      for (const path of [...files.keys()].sort())
        if (path.startsWith(`${EX}/`) && IMAGE_FILE.test(path) && !named.has(path))
          fail(`${path}: no page's \`image\` names it (R9)`);
    },
  },
```

- [ ] **Step 5: Run the tests, then the control**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image
node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
cp lib/checks.mjs /tmp/checks.mjs.kept
sed -i '' 's/ && !IMAGE_FILE.test(entry))/)/' lib/checks.mjs
node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
cp /tmp/checks.mjs.kept lib/checks.mjs && rm /tmp/checks.mjs.kept
node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
node verify/check.mjs > /dev/null; echo "verify $?"
npm run -s test:instance-checks > /dev/null 2>&1; echo "instance-checks $?"
```

Expected: `pass 12`, `fail 0`; then, with the owner-folder allowance taken out, `pass 10`, `fail 2` — the passing case and the unreferenced-image case — which is the evidence the allowance is what they hold; then `pass 12`, `fail 0` again; `verify 0`; `instance-checks 0`. `git diff --stat lib/checks.mjs` afterwards shows the same change as before the control.

- [ ] **Step 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git add lib/checks.mjs verify/image.test.mjs && git commit -F - <<'MSG'
An image field is held to its form, and every image is named

A field declared image names a file in its page's own folder, and the
check now holds that file from its bytes: a JPEG or PNG that is what its
name says, square, 256 to 1024 pixels on a side and at most 300 KB. An
image no page names fails too, because nothing copies it and no reader
reaches it. The fields are found by their declared type, so nothing here
names profile.

The container check lets an image stand beside a page. Without that every
correct image failed as a stray file before the image check could speak,
which the tests hold by passing a correct one and an unreferenced one.

Verified: node --test verify/image.test.mjs passes and fails two cases
with the allowance taken out, npm run test:instance-checks and node
verify/check.mjs exit 0.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 3: Core declares the image, the readers read bytes, and the example carries one

Core now says what `image` is, the profile schema declares the field, and the example's agent carries a picture so the example shows the field it declares. Putting a binary file in `example/` exposes every reader that builds a file map from disk as text: `verify/check.mjs` and `bin/check-instance.mjs`, and three test files that walk the example. Each reads an image as bytes from here on, and the prototype found the two example-walking tests failing until they did. The same task makes `verify` refuse a column typed `image`, because only this repository's own check holds core to the vocabulary.

**Files:**

- Modify: `core/CONVENTIONS.md` (R9's vocabulary sentence, and a paragraph after the one that opens `The form is stated here rather than in the description`)
- Modify: `core/profile-schema.md` (a frontmatter row after `location`, a writing rule before the one on `nature`)
- Modify: `bin/check-instance.mjs` (the import near line 35, the walk near line 88)
- Modify: `verify/check.mjs` (the import near line 32, `filesUnder` near line 55, `type vocabulary` near line 345)
- Modify: `verify/declared-joins.test.mjs`, `verify/list-kind.test.mjs`, `verify/cli.test.mjs` (their readers)
- Modify: `verify/check-script.test.mjs` (a test appended)
- Modify: `example/model/profiles/ai-agent/ai-agent.md`
- Create: `example/model/profiles/ai-agent/ai-agent.png`

**Interfaces:**

- Consumes: `IMAGE_FILE` and the check from Tasks 1 and 2.
- Produces: `core/profile-schema.md` declares `image` of type `image`; the example's `profiles/ai-agent` names `ai-agent.png`, a 256×256 PNG, which Task 4's test reads.

- [ ] **Step 1: Make the readers read an image as bytes**

In `bin/check-instance.mjs`, change the import to `import { checkInstance, isNewer, MODEL, IMAGE_FILE } from "../lib/checks.mjs";` and in the walk replace `else files.set(child, readFileSync(join(root, child), "utf8"));` with:

```js
      // An image is bytes, and read as text it is corrupted before the check that reads its
      // header sees it (R9).
      else files.set(child, readFileSync(join(root, child), IMAGE_FILE.test(child) ? undefined : "utf8"));
```

In `verify/check.mjs`, add `IMAGE_FILE` to the import from `../lib/checks.mjs` after `TYPE_VOCABULARY`, and in `filesUnder` replace the same `else files.set(...)` line with:

```js
      // An image is bytes, as the instance's own checker reads it (R9).
      else files.set(child, readFileSync(join(ROOT, child), IMAGE_FILE.test(child) ? undefined : "utf8"));
```

In `verify/declared-joins.test.mjs` change `import { checkInstance } from "../lib/checks.mjs";` to `import { checkInstance, IMAGE_FILE } from "../lib/checks.mjs";`; in `verify/list-kind.test.mjs` change `import { checkInstance, sectionsOf, blocksOf } from "../lib/checks.mjs";` to `import { checkInstance, sectionsOf, blocksOf, IMAGE_FILE } from "../lib/checks.mjs";`. In both, replace the walker's `else files.set(prefix + e.name, fs.readFileSync(path.join(dir, e.name), "utf8"));` with:

```js
      else files.set(prefix + e.name, fs.readFileSync(path.join(dir, e.name), IMAGE_FILE.test(e.name) ? undefined : "utf8"));
```

In `verify/cli.test.mjs`, change `import { checkInstance } from "../lib/checks.mjs";` to `import { checkInstance, IMAGE_FILE } from "../lib/checks.mjs";`, and replace `filesOf`'s comment and read:

```js
// Every file under a folder, as the checks read one: path relative to the root, text, and bytes
// for an image (R9).
```

```js
    else into.set(path.relative(root, full), fs.readFileSync(full, IMAGE_FILE.test(entry.name) ? undefined : "utf8"));
```

`bin/companygraph.mjs` reads only the release's own `core/` and skills and the manifest's tooling files, never `model/`, and is left as it is.

- [ ] **Step 2: Refuse a column typed image, test first**

Append to `verify/check-script.test.mjs`:

```js

// R9 makes `image` a frontmatter type: a row of a table has no folder of its own for a file to
// sit in. The vocabulary check reads frontmatter and column tables in one loop, so this holds
// that it still tells them apart.
test("a column typed image fails the vocabulary check by name", () => {
  const tmp = mkdtempSync(join(tmpdir(), "meta-model-check-"));
  try {
    cpSync(join(ROOT, "core"), join(tmp, "core"), { recursive: true });
    cpSync(join(ROOT, "example"), join(tmp, "example"), { recursive: true });
    cpSync(join(ROOT, "lib"), join(tmp, "lib"), { recursive: true });
    mkdirSync(join(tmp, "verify"));
    cpSync(join(ROOT, "verify", "check.mjs"), join(tmp, "verify", "check.mjs"));
    const schemaPath = join(tmp, "core", "profile-schema.md");
    const before = readFileSync(schemaPath, "utf8");
    const target = "| `Where` | Yes | string | The place, in plain words — GitHub, LinkedIn, Substack |";
    assert.ok(before.includes(target), "core/profile-schema.md no longer carries the row this test mutates — update the fixture");
    writeFileSync(schemaPath, before.replace(target, "| `Where` | Yes | image | The place. |"));
    const result = spawnSync(process.execPath, ["verify/check.mjs"], { cwd: tmp, encoding: "utf8" });
    assert.match(result.stdout + result.stderr, /profile-schema\.md: `Where` is "image"; an image is a frontmatter field, never a column/);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
```

Run: `node --test verify/check-script.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`

Expected: `pass 1`, `fail 1`. `image` is in the vocabulary since Task 1, so a column typed `image` passes today.

Then in `verify/check.mjs`, in the `type vocabulary` check, replace:

```js
        const typed = [
          tableOf((s.get("Frontmatter") ?? "").trim()),
```

with:

```js
        const frontmatter = tableOf((s.get("Frontmatter") ?? "").trim());
        const typed = [
          frontmatter,
```

and insert directly after `const declared = (row[2] ?? "").replace(/`/g, "").trim();` in the loop below it:

```js
            // R9: an image is a file beside its page, and a row of a table has no folder of its
            // own for one to sit in, so `image` is a frontmatter type only.
            if (declared === "image" && fm !== frontmatter) {
              fail(`${path}: ${row[0]} is "image"; an image is a frontmatter field, never a column`);
              continue;
            }
```

Run: `node --test verify/check-script.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"`

Expected: `pass 2`, `fail 0`.

- [ ] **Step 3: Core says what an image is**

In `core/CONVENTIONS.md`, R9, change `` Types come from the closed vocabulary: `string`, `number`, `date`, `array`, `enum`, `` to `` Types come from the closed vocabulary: `string`, `number`, `date`, `image`, `array`, `enum`, `` and leave the rest of that sentence as it is. Then insert a new paragraph directly after the paragraph that opens `The form is stated here rather than in the description of whichever field happens to use it,` (one blank line before and after it):

```markdown
`image` is a file name with no path, and the file sits in the folder of the page that names it: for a profile, `profiles/<profile>/` beside the profile's own file, so the picture goes with the person in the one operation R6 makes of removing them. A name with a `/` in it is a reference by location, which R3 forbids. The file is `.jpg`, `.jpeg` or `.png`, lowercase, and its first bytes are the signature of what the name says. **An image is square, 256 to 1024 pixels on a side and at most 300 KB (307,200 bytes).** Square because every place that draws one draws a circle, and a circle cut from a rectangle cuts whichever face is off-center; the floor is what a dense screen needs for a small avatar and the ceiling and the cap keep a page from loading a photograph. `image` is a frontmatter type: a row of a table has no folder of its own for a file to sit in. An image in the container that no page's `image` field names is an error, because it is a file nothing copies and no reader reaches.
```

In `core/profile-schema.md`, insert after the row `` | `location` | No | string | Where the person works from | ``:

```markdown
| `image` | No | image | The person's picture, a file in this profile's folder: square, 512×512 recommended, 256–1024 pixels on a side, at most 300 KB |
```

and insert before the writing rule that opens `` - `nature` says what holds the profile, never how well. ``:

```markdown
- The image is the person, recognizably, as the tagline is their own voice: not a logo, a team
  or an illustration standing in for them. A profile whose nature is `agent` may carry one, and
  then it shows what holds the profile.
```

- [ ] **Step 4: The example's agent carries a picture**

The example is Beacon Systems, and its people are invented, so no photograph of anyone belongs in it. The agent's profile is the one a mark may honestly stand for. Write the mark with this one-off script, which needs nothing but Node's zlib, and do not commit the script:

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image
cat > "${TMPDIR:-/tmp}/make-agent-png.mjs" <<'EOF'
// A 256×256 PNG: a ring on a dark ground, the example agent's mark.
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync } from "node:fs";
const N = 256, raw = Buffer.alloc(N * (1 + N * 3));
for (let y = 0; y < N; y++) {
  raw[y * (1 + N * 3)] = 0;
  for (let x = 0; x < N; x++) {
    const d = Math.hypot(x - 127.5, y - 127.5);
    raw.set(d > 70 && d < 96 ? [0xe8, 0xa8, 0x3c] : [0x1c, 0x22, 0x2b], y * (1 + N * 3) + 1 + x * 3);
  }
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(N, 0); ihdr.writeUInt32BE(N, 4); ihdr.set([8, 2, 0, 0, 0], 8);
writeFileSync(process.argv[2], Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0)),
]));
EOF
node "${TMPDIR:-/tmp}/make-agent-png.mjs" example/model/profiles/ai-agent/ai-agent.png && rm "${TMPDIR:-/tmp}/make-agent-png.mjs"
ls -l example/model/profiles/ai-agent/ai-agent.png
sips -g pixelWidth -g pixelHeight -g format example/model/profiles/ai-agent/ai-agent.png | tail -3
```

Expected: a file of 1,154 bytes, `pixelWidth: 256`, `pixelHeight: 256`, `format: png`. Open it and look: an amber ring on a dark slate ground.

In `example/model/profiles/ai-agent/ai-agent.md`, add `image: ai-agent.png` as the last frontmatter line, after the `roles` list:

```yaml
roles:
  - Reviewer
image: ai-agent.png
---
```

- [ ] **Step 5: Verify, with a control**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image
sed -i '' 's/^image: ai-agent.png/image: ai-agent.jpg/' example/model/profiles/ai-agent/ai-agent.md
node verify/check.mjs 2>&1 | grep "ai-agent"
sed -i '' 's/^image: ai-agent.jpg/image: ai-agent.png/' example/model/profiles/ai-agent/ai-agent.md
node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
for f in verify/*.test.mjs; do node --test $f 2>&1 | grep -E "^ℹ fail" | tr '\n' ' '; echo " $f"; done | grep -v "fail 0"; echo "none failing: $?"
sh conventions/conventions-format > /dev/null; echo "format $?"
sh conventions/conventions-check > /dev/null; echo "prose $?"
git diff --stat
```

Expected: the control prints two lines, `` …ai-agent.md: `image` names ai-agent.jpg, and there is no example/model/profiles/ai-agent/ai-agent.jpg (R9) `` and `` …ai-agent.png: no page's `image` names it (R9) ``, which proves `verify` reads the example's image through the check; then `verify 0`, `tests 0`, `none failing: 1` (grep found no failing file), `format 0`, `prose 0`. Without Step 1, `declared-joins` and `list-kind` each fail one test with `ai-agent.png: is not a PNG, whatever its name says`.

- [ ] **Step 6: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git add core/CONVENTIONS.md core/profile-schema.md bin/check-instance.mjs verify/check.mjs verify/declared-joins.test.mjs verify/list-kind.test.mjs verify/cli.test.mjs verify/check-script.test.mjs example/model/profiles/ai-agent/ai-agent.md example/model/profiles/ai-agent/ai-agent.png && git commit -F - <<'MSG'
A profile may carry an image, and core says what one is

R9's vocabulary gains image: a file name with no path, in the folder of
the page that names it, a JPEG or PNG that is square, 256 to 1024 pixels
on a side and at most 300 KB. It is a frontmatter type, and verify now
refuses a column typed image, since a row has no folder for a file. The
profile schema declares the field, recommends 512 by 512, and asks that
the picture be the person.

The example's agent carries a small mark, because Beacon's people are
invented and a photograph of anyone would not belong. A binary file in
the example showed every reader that took the model as text, so the
checker's command, verify and three test walkers read an image as bytes.

Verified: node verify/check.mjs, node --test verify/, sh
conventions/conventions-format and sh conventions/conventions-check all
exit 0, and naming a missing file in the example fails verify by name.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 4: A site can ask what to publish

A site builds `model.json` from the parser and serves its own copy of each image. `imagesOf` tells it which files those are and where each goes, reading which fields are images from the schemas it already passes to the parser, so no site learns the rule a second time.

**Files:**

- Modify: `lib/instance.mjs` (insert after `IMAGE_FILE` from Task 1)
- Modify: `verify/image.test.mjs` (imports, and two tests appended)

**Interfaces:**

- Consumes: `IMAGE_FILE` and `parseSchemas` in `lib/instance.mjs`; the example's `ai-agent.png` from Task 3.
- Produces: `imagesOf(files, data, { sub = "", schemas }) → Array<{ id, field, from, to, bytes }>`, exported from `lib/instance.mjs` (`companygraph-meta-model/instance`). `files` is keyed relative to the container as `parseInstance` takes it; `from` is such a key; `to` is `<entity id>.<extension>`; `bytes` is the `Uint8Array` from `files`. It throws `Error` beginning `R16:` without `schemas`, and `R9: <sub><from>, named by <page>, is not there` or `…, was read as text, not bytes`.

- [ ] **Step 1: Write the failing tests**

In `verify/image.test.mjs`, replace the import lines at the top with:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { checkInstance, imageInfoOf, IMAGE_FILE } from "../lib/checks.mjs";
import { parseInstance, imagesOf } from "../lib/instance.mjs";
```

And append:

```js

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
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test verify/image.test.mjs 2>&1 | grep -E "SyntaxError|^ℹ fail"`

Expected: `SyntaxError: The requested module '../lib/instance.mjs' does not provide an export named 'imagesOf'` and `ℹ fail 1`.

- [ ] **Step 3: Write `imagesOf`**

In `lib/instance.mjs`, insert directly after `export const IMAGE_FILE = /\.(jpe?g|png)$/;` and its blank line:

```js
// The images an instance's pages name, for a site that publishes them beside its model.json:
// each entity's id, the field, the path the file was read from (relative to the container, as
// `files` is keyed) and where a site puts it, `<entity id>.<extension>` — ids are unique across
// the model, file names only within a folder. Which fields are images is read from the schemas,
// as R16 has every field's meaning read, so nothing here names profile. A named file that is
// missing, or was read as text rather than bytes, throws: the checker has already reported it,
// and a build that went on would publish a page pointing at nothing.
export function imagesOf(files, data, { sub = "", schemas } = {}) {
  if (!schemas) throw new Error("R16: images are found by their declared type, and no schemas were given — pass `schemas`");
  const imageFields = new Map();
  for (const e of parseSchemas(schemas).entities) {
    const fm = e.sections.find((s) => s.heading === "Frontmatter")?.table;
    if (!fm) continue;
    const f = fm.columns.indexOf("Field"), t = fm.columns.indexOf("Type");
    const fields = fm.rows.filter((r) => (r[t] ?? "").replace(/`/g, "").trim() === "image").map((r) => r[f].replace(/`/g, "").trim());
    if (fields.length) imageFields.set(e.id.slice("core/".length), fields);
  }
  const out = [];
  for (const e of data.entities) {
    for (const field of imageFields.get(e.type) ?? []) {
      const name = e.fields?.[field];
      if (typeof name !== "string" || !name) continue;
      const dir = e.path.slice(sub.length).split("/").slice(0, -1).join("/");
      const from = dir ? `${dir}/${name}` : name;
      const bytes = files.get(from);
      if (!(bytes instanceof Uint8Array)) throw new Error(`R9: ${sub}${from}, named by ${e.path}, ${bytes === undefined ? "is not there" : "was read as text, not bytes"}`);
      out.push({ id: e.id, field, from, to: `${e.id}.${name.split(".").pop()}`, bytes });
    }
  }
  return out;
}

```

`parseSchemas` is defined later in the same module; a function declaration is hoisted, so the order is fine.

- [ ] **Step 4: Run everything**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image
node --test verify/image.test.mjs 2>&1 | grep -E "^ℹ (pass|fail)"
node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
npm run -s test:rules > /dev/null 2>&1; echo "rules $?"
```

Expected: `pass 14`, `fail 0`; `verify 0`; `tests 0`; `rules 0` (every rule the shipped files cite, R9 and R16 here, is defined in core).

- [ ] **Step 5: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git add lib/instance.mjs verify/image.test.mjs && git commit -F - <<'MSG'
A site can ask the package which images to publish and where

imagesOf reads which fields are images from the schemas a site already
passes the parser, and returns each named file with its entity's id, the
path it was read from and where a site puts it, the id and the extension.
Ids are unique across the model and file names only within a folder, so
the id is the published name.

It throws on a file that is missing or was read as text, because the
checker has already said so and a build that went on would publish a page
pointing at nothing.

Verified: node --test verify/ and node verify/check.mjs exit 0, and
imagesOf on the example returns the agent's 256 by 256 PNG.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

---

### Task 5: The release is prepared, and the pull request opened

A change to anything another repository vendors is at least a minor. This one asks nothing of a consumer beyond re-pinning: no existing page changes meaning, and a site that re-pins without copying images passes the card no `images` base and draws what it drew. Core's bytes changed, so `core/manifest.json` moves with `package.json`, and the reusable workflow's two mentions of the release move with them, because the checker compares its own version with an instance's pin and refuses when they differ. `shape` stays 3, as the constraints say.

**Files:**

- Modify: `core/manifest.json`
- Modify: `package.json` (line 3)
- Modify: `.github/workflows/instance-check.yml` (line 6 and line 37)

**Interfaces:**

- Consumes: Tasks 1 through 4, committed and green.
- Produces: a pull request, green, waiting for the owner. After the merge and only on the owner's word, a tag and a GitHub Release, which the follow-on work starts from.

- [ ] **Step 1: Read the numbers**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && cat core/manifest.json && sed -n '3p' package.json && grep -n "instance-check.yml@v\|ref: v" .github/workflows/instance-check.yml
```

When this plan was written the package read `0.40.0` and core `0.37.0`, which makes the package `0.41.0` and core `0.38.0`. If another release has landed since, take the next minor after each number as it reads now, and use those wherever this task writes `0.41.0`, `0.38.0`, `0.40.0` and `0.37.0`.

- [ ] **Step 2: Raise all four**

`core/manifest.json` becomes `{ "version": "0.38.0", "shape": 3 }`. `package.json` line 3 becomes `"version": "0.41.0",` at its indent. In `.github/workflows/instance-check.yml`, line 6's `instance-check.yml@v0.40.0` becomes `instance-check.yml@v0.41.0` and line 37's `ref: v0.40.0` becomes `ref: v0.41.0`.

- [ ] **Step 3: Verify**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && node verify/check.mjs > /dev/null; echo "verify $?"
node --test verify/ > /dev/null 2>&1; echo "tests $?"
sh conventions/conventions-format > /dev/null; echo "format $?"
sh conventions/conventions-check > /dev/null; echo "prose $?"
grep -n "0\.40\.0" package.json .github/workflows/instance-check.yml; grep -n '"0\.37\.0"' core/manifest.json; echo "left behind: $?"
```

Expected: four zeros, then `left behind: 1`, which is the second `grep` finding nothing, and no lines printed by the first. That is evidence only because Step 1 showed the same files carrying the old numbers.

- [ ] **Step 4: Commit**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git add core/manifest.json package.json .github/workflows/instance-check.yml && git commit -F - <<'MSG'
The package reads 0.41.0 and core 0.38.0, with the workflow's ref

A profile may carry an image, core says what one is, and the checker
holds it from its bytes. A consumer only re-pins: no page changes
meaning, and a site without a copy step draws the card it drew. Core's
bytes changed, so core moves with the package.

shape stays 3. The parser reads a Type cell it does not know as a fact,
and only this repository's verify holds core to the vocabulary.

Verified: node verify/check.mjs, node --test verify/, sh
conventions/conventions-format and sh conventions/conventions-check all
exit 0, and no line of the manifest, the package or the workflow still
names the release before.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
MSG
```

- [ ] **Step 5: Push and open the pull request, then stop**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push -u origin a-profile-carries-an-image
```

**Read the repository's last two merged pull request bodies first** — `gh pr list --state merged --limit 2 --json body` — and match their shape: the commit bodies reread for a reviewer who has not seen the diff, no headers, no bullets, ending with a `Verified:` line, then `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Name the spec and this plan by path. Open it with `gh pr create --base main`, watch `gh pr checks --watch` until `verify` and `conventions / conventions` report, and say what they reported. If no check suite appears at all, close and reopen the pull request to fire the event again.

Then stop. Merging is the owner's decision and the word for it is theirs. Do not chain a branch delete after a merge.

- [ ] **Step 6: Tag and release, after the merge and only on the owner's word**

```bash
export PATH=/opt/homebrew/bin:$PATH
cd ~/git/companygraph/meta-model-a-profile-carries-an-image && git fetch origin && git checkout --detach origin/main
node verify/check.mjs > /dev/null; echo "verify $?"
git tag v0.41.0 && git -c credential.helper='!/opt/homebrew/bin/gh auth git-credential' push origin v0.41.0
gh release create v0.41.0 --title "0.41.0" --notes "$(cat <<'NOTES'
A profile may carry an image. R9's vocabulary gains `image`: a file name with no path, the file in the folder of the page that names it, a `.jpg`, `.jpeg` or `.png` that is what its name says, square, 256 to 1024 pixels on a side and at most 300 KB. The profile schema declares an optional `image` field and recommends 512 by 512. The checker holds the file from its own bytes and fails an image no page names.

Nothing breaks. An instance that takes this release passes as it did; one that adds an image needs this checker, because an older one reports the file as something the profile does not own. `shape` stays 3: the parser reads a Type cell it does not know as a fact.

A reader that builds a file map from disk now reads `.jpg`, `.jpeg` and `.png` as bytes, by `IMAGE_FILE`, exported from both `companygraph-meta-model/instance` and `/checks`. A site that publishes images calls `imagesOf(files, data, { sub, schemas })` after `parseInstance` and copies each result's `bytes` to `images/<to>`; `to` is the entity's id and the image's extension. `imageInfoOf` and `IMAGE_BOUNDS` are exported from `/checks` for anything that tells a writer the limits.
NOTES
)"
node verify/check.mjs > /dev/null; echo "verify after tag $?"
```

The tag is made on a detached `origin/main`, so it cannot land on a commit the merge did not make, and the suite runs on that commit before the tag exists. It runs once more after tagging because `release manifest` fails a tag that disagrees with `package.json`, and that is the run that can see it.

---

## What this plan does not do

Each consumer takes the release in its own repository, on its own branch and worktree, with its own plan written once this release exists, and each merge waits for the owner's word. In order, because each later one reads the one before:

1. **`robertblust/mental-model`**, the reference instance. `companygraph upgrade` to the release, which re-vendors core and moves the pin in all its places; copy `~/Desktop/robert-blust.jpg` to `model/profiles/robert-blust/robert-blust.jpg` and add `image: robert-blust.jpg` to the profile's frontmatter. The photo is 1000×1000 and 156 KB and passed the prototype's checker unchanged.
2. **`robertblust/design`**. `rbCard.render` in `assets/card.js` draws a round 64-pixel `img` in a head row with the `h3` when `e.fields.image` is set and the caller passed `images` (the site's base for `images/`), with `alt` the entity's name, `loading="lazy"` and width and height set; `image` joins `source` and `skills` as fields the card does not list. Every caller of `rbCard.render` — the stage, the timeline, `blocks/model-card.js` — passes `images` only where the page declares it. A shared build helper that writes `images/` from `imagesOf` and checks it belongs here too, since all three sites would otherwise carry a copy. A release.
3. **The three sites.** Re-pin design and the parser. `build/read.mjs` reads an image as bytes locally and as an array buffer from GitHub (`res.arrayBuffer()`), by `IMAGE_FILE`; `npm run model` writes `images/` and `model:check` fails on a copy that differs or stands unnamed. blust.ch writes `image` on its `#person` JSON-LD node as `https://blust.ch/images/profiles/robert-blust.jpg`. companygraph.io and guestgraph.io add the copy step only once a profile of theirs carries an image. Run `npm run sitemap` with the page edits.
4. **`companygraph/mcp-server`** returns `image_url` beside the fields of an entity that names an image, built from a new `site` field in each deployment's `deployment.json`; then **`robertblust/mcp-blust-ch`** and **`companygraph/mcp-companygraph-io`** re-pin and set `site`, and mcp-blust-ch's `jsonld.json` gains `image` on its person node.
5. **`companygraph/obsidian-plugin`**. Re-pin the package by name with the lockfile. Its compliance checks read the vault through the same checks, so its reader must hand an image over as bytes (`vault.readBinary`, wrapped in a `Uint8Array`) or every image fails as not a PNG; `src/locate.ts` finds a failure in the editor by its wording, and the image messages are listed in Task 2's interfaces. It shows the avatar at the head of a profile's view.
