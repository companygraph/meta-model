// The instance fixture shared by history.test.mjs, seats.test.mjs and later tasks A3/A4: the
// example instance's files on disk, and the same files inside a fresh git repository with an
// identity of its own. modelAt writes only the model, the way a folder can be read without git;
// instanceAt is modelAt plus `git init` and the repository's own `user.name`/`user.email`, so
// `git var GIT_AUTHOR_IDENT` finds an author on a runner with no global config.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLE_PACKS } from "./example.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

// The example instance with the release's own core vendored beside it, as init would lay it out.
export function modelAt(dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.cpSync(path.join(here, "..", "example", "model"), path.join(dir, "model"), { recursive: true });
  fs.cpSync(path.join(here, "..", "core"), path.join(dir, "meta", "core"), { recursive: true });
  // The example takes packs, so the instance vendors them as init --pack would.
  for (const name of EXAMPLE_PACKS) fs.cpSync(path.join(here, "..", "packs", name), path.join(dir, "meta", name), { recursive: true });
  fs.mkdirSync(path.join(dir, ".companygraph"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".companygraph", "manifest.json"), JSON.stringify({ tooling: "0.0.0", units: "meta", packs: EXAMPLE_PACKS }));
  return dir;
}

export function instanceAt(dir) {
  modelAt(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir, encoding: "utf8" });
  execFileSync("git", ["config", "user.name", "Robert"], { cwd: dir, encoding: "utf8" });
  execFileSync("git", ["config", "user.email", "mira@example.invalid"], { cwd: dir, encoding: "utf8" });
  return dir;
}
