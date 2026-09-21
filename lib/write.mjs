// The writer: a plan in, files on disk out. It makes the folders a path needs and writes every
// file, and it is the only part of `init` that touches a filesystem, which is why it holds no
// decisions at all.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function writePlan(root, writes) {
  const written = [];
  for (const [path, text] of writes) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, text);
    written.push(path);
  }
  return written;
}
