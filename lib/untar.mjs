// Turning a release tarball into the core it vendors, without a dependency to do it. A GitHub
// codeload archive is gzip wrapping a tar: 512-byte headers, each followed by the entry's
// content padded up to the next 512-byte boundary, ending in a run of zero bytes. Only regular
// files under the archive's single top-level folder's `core/` are wanted — not the folder
// entries, not `lib/` or the rest of the release — keyed by the path relative to `core/`, since
// that is the path `initPlan` writes under the instance's chosen units folder.
import { gunzipSync } from "node:zlib";

const BLOCK = 512;

// A pax extended header ("x") or a GNU long-name/long-link header ("L"/"K") holds the real path
// of the entry that follows it in a variable-length record this reader does not parse — reading
// past it and keying the next entry by its truncated fixed-width name field would silently
// mis-key a file rather than fail to find it. A pax *global* header ("g") carries no such
// entry-specific path and is skipped like any other non-regular record.
const LONG_NAME = { x: "a pax extended header", L: "a GNU long-name header", K: "a GNU long-link header" };

// A tar string field is fixed-width and null-terminated, or filled to the edge when the value
// is exactly that wide; ustar also splits a long path into a `prefix` field and a `name` field,
// joined with a slash, which is why callers pass either field alone.
function fieldString(bytes) {
  const end = bytes.indexOf(0);
  return Buffer.from(bytes.buffer, bytes.byteOffset, end === -1 ? bytes.length : end).toString("utf8");
}

// The size field is octal ASCII, not decimal — tar predates binary integers being portable.
function fieldOctal(bytes) {
  const text = fieldString(bytes).trim();
  return text ? parseInt(text, 8) : 0;
}

export function extractCore(gzipped) {
  const tar = gunzipSync(gzipped);
  const core = new Map();
  let offset = 0;

  while (offset + BLOCK <= tar.length) {
    const header = tar.subarray(offset, offset + BLOCK);
    // Two all-zero blocks mark the end of the archive; a real header never has one, because its
    // checksum field is never all zero.
    if (header.every((byte) => byte === 0)) break;

    const name = fieldString(header.subarray(0, 100));
    const size = fieldOctal(header.subarray(124, 136));
    const typeFlag = String.fromCharCode(header[156]);
    const prefix = fieldString(header.subarray(345, 500));
    const full = prefix ? `${prefix}/${name}` : name;

    const content = tar.subarray(offset + BLOCK, offset + BLOCK + size);
    offset += BLOCK + Math.ceil(size / BLOCK) * BLOCK;

    if (LONG_NAME[typeFlag])
      throw new Error(
        `untar: ${LONG_NAME[typeFlag]} means a path longer than this reader's fixed-width name field can hold; refusing rather than mis-keying the entry it introduces`,
      );
    if (typeFlag !== "0" && typeFlag !== "\0") continue; // directories, pax globals, links, and the rest.
    // The archive's one top-level folder is the release's own name and tag, not something a
    // caller should have to know; strip it, then keep only what sits under `core/`.
    const afterTop = full.replace(/^[^/]+\//, "");
    if (!afterTop.startsWith("core/")) continue;
    core.set(afterTop.slice("core/".length), Buffer.from(content).toString("utf8"));
  }
  return core;
}
