// The git repository every test that needs one makes: `git init` plus the line-end rule a real
// instance has. An instance carries `* text=auto eol=lf` in its .gitattributes (init writes it),
// so a checkout of it has LF wherever core.autocrlf is set, as it is on a Windows runner. A bare
// `git init` has no such rule, so git warned that it would turn LF into CRLF on the files a test
// adds, and a hook it checked out there got CRLF and failed on `\r` in its shebang line. The rule
// goes into the repository's own .git/info/attributes rather than into a .gitattributes file, so
// the fixture's tree stays the files the test put there: no test counts, lists or diffs one more.
// Where a test needs a repository with no rule, it calls `git init` itself and says why.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { GITATTRIBUTES } from "../lib/instance-files.mjs";

// `args` are further `git init` arguments, such as `-b`, "main"; `env` is the environment git runs
// in when a test redirects its configuration. Returns dir, so a caller can write `initRepository(temp())`.
export function initRepository(dir, args = [], env = process.env) {
  execFileSync("git", ["init", "-q", ...args], { cwd: dir, encoding: "utf8", env });
  const info = path.join(dir, ".git", "info");
  fs.mkdirSync(info, { recursive: true });
  fs.writeFileSync(path.join(info, "attributes"), GITATTRIBUTES);
  return dir;
}
