import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstance, IMAGE_FILE } from "../lib/checks.mjs";
import { GATE_HOOK, PAST_GATE_HOOKS } from "../lib/instance-files.mjs";
import { initRepository } from "./fixture-repository.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, "..", "bin", "companygraph.mjs");
const run = (args, options = {}) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", ...options });
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "companygraph-"));
// Quit's own number, read off a menu screen already captured: an entry added or removed moves
// it, and a test asserting around Quit should not need to change to match.
const quitOf = (said) => Number(said.match(/(\d+) {2}Quit/)[1]);

// Every file under a folder, as the checks read one: path relative to the root with `/` on every
// platform, text, and bytes for an image (R9).
function filesOf(root, base = root, into = new Map()) {
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) filesOf(root, full, into);
    else into.set(path.relative(root, full).split(path.sep).join("/"), fs.readFileSync(full, IMAGE_FILE.test(entry.name) ? undefined : "utf8"));
  }
  return into;
}

test("an instance init writes passes the mechanical checks on its first day", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const files = filesOf(root);
  const { failures } = checkInstance(files, { core: "meta/core", model: "model" });
  assert.deepEqual(failures, []);
});

test("init says what the model starts with without counting its singular entities, which the next type would make wrong", () => {
  const said = run(["init", temp(), "--name", "Acme", "--agent", "claude"]);
  assert.match(said, /its source and its singular entities/);
  assert.doesNotMatch(said, /\b(two|three|four) singular/);
});

test("what it wrote is what its manifest says it wrote", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  assert.equal(manifest.tooling, version);
  assert.equal(manifest.core.source, "bundled");
  for (const [rel, hash] of Object.entries(manifest.files)) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    assert.equal(hash, `sha256:${createHash("sha256").update(text).digest("hex")}`);
  }
  assert.ok(fs.readFileSync(path.join(root, ".github/workflows/companygraph.yml"), "utf8").includes(`instance-check.yml@v${version}`));
});

test("a folder that is not empty is refused, and told what would let it through", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = [...filesOf(root).keys()].sort();
  // Without --here the target must be a folder this tooling can have to itself.
  assert.throws(() => run(["init", root, "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }), /not empty[\s\S]*--here/);
  assert.deepEqual([...filesOf(root).keys()].sort(), before);
});

test("--here into a folder that already holds an instance is refused by name, and nothing is written", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = filesOf(root);
  // --here says "add to what is here", and the answer is that an instance is here already: the
  // whole-folder check refuses by naming the units folder or .companygraph/, before the per-file
  // check ever runs.
  assert.throws(
    () => run(["init", root, "--here", "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }),
    /(meta|\.companygraph)\//,
  );
  const after = filesOf(root);
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  for (const [path, text] of before) assert.equal(after.get(path), text, path);
});

test("it adds to a repository that is not an instance, and leaves what is there", () => {
  const root = temp();
  fs.writeFileSync(path.join(root, "README.md"), "# Mine\n");
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Mine\n");
  assert.ok(fs.existsSync(path.join(root, "meta/core/CONVENTIONS.md")));
});

test("--here names a file already there in a subfolder as a conflict, and writes nothing", () => {
  const root = temp();
  fs.mkdirSync(path.join(root, "model"));
  fs.writeFileSync(path.join(root, "model/README.md"), "# Mine\n");
  assert.throws(
    () => run(["init", root, "--here", "--name", "Acme", "--agent", "claude"], { stdio: "pipe" }),
    /model\/README\.md/,
  );
  assert.deepEqual([...filesOf(root).keys()], ["model/README.md"]);
});

test("an agent it cannot write for is refused by name, and nothing is written", () => {
  const root = temp();
  // The plan's own sentence, not a missing folder that happens to carry the name in its path.
  assert.throws(
    () => run(["init", root, "--name", "Acme", "--agent", "codex"], { stdio: "pipe" }),
    (error) => /codex is not an agent this release writes for; it writes for claude\./.test(error.stderr) && !/ENOENT/.test(error.stderr),
  );
  assert.deepEqual([...filesOf(root).keys()], []);
});

test("init in a git repository sets the hooks path; outside one it names the command", () => {
  const inGit = temp();
  initRepository(inGit);
  const said = run(["init", inGit, "--name", "Acme", "--agent", "claude"]);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: inGit, encoding: "utf8" }).trim(), ".companygraph/hooks");
  assert.match(said, /commit-msg hook is in use/);
  const bare = temp();
  assert.match(run(["init", bare, "--name", "Acme", "--agent", "claude"]), /git config core\.hooksPath \.companygraph\/hooks/);
  const none = temp();
  run(["init", none, "--name", "Acme", "--agent", "claude", "--no-hook"]);
  assert.equal(fs.existsSync(path.join(none, ".companygraph/hooks/commit-msg")), false);
});

// R1: the brief's own hooks-path computation breaks on macOS, where os.tmpdir() is /var/... but
// `git rev-parse --show-toplevel` answers /private/var/..., and on Windows' 8.3 short names.
// Reading the prefix from git itself, instead of computing a relative path by hand against a
// possibly-different rendering of the same folder, sidesteps both: an instance in a subfolder of
// a git repository gets a hooksPath under that subfolder, not the repository's own top.
test("init in a subfolder of a git repository names the hooks path relative to the repository's own root", () => {
  const repo = temp();
  initRepository(repo);
  const sub = path.join(repo, "sub");
  fs.mkdirSync(sub);
  const said = run(["init", sub, "--name", "Acme", "--agent", "claude"]);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: repo, encoding: "utf8" }).trim(), "sub/.companygraph/hooks");
  assert.match(said, /commit-msg hook is in use: git reads hooks from sub\/\.companygraph\/hooks/);
});

test("init leaves a hooks path already set, and says the seat hook is not in use", () => {
  const dir = temp();
  initRepository(dir);
  execFileSync("git", ["config", "core.hooksPath", ".husky"], { cwd: dir });
  assert.match(run(["init", dir, "--name", "Acme", "--agent", "claude"]), /core\.hooksPath is \.husky here/);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: dir, encoding: "utf8" }).trim(), ".husky");
});

test("init leaves an enclosing repository's own hooks folder alone, naming what is already there", () => {
  const dir = temp();
  initRepository(dir);
  const hooksDir = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: dir, encoding: "utf8" }).trim();
  // git init itself writes only `*.sample` templates there; a real file is what must stop init
  // from setting core.hooksPath and switching them off.
  fs.writeFileSync(path.join(dir, hooksDir, "pre-commit"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  const said = run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  assert.match(said, /pre-commit/);
  assert.match(said, /not in use/);
  const cfg = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: dir, encoding: "utf8" });
  assert.notEqual(cfg.status, 0, "core.hooksPath was left unset");
});

// Found in re-review: `git rev-parse --git-path hooks` answers absolute inside a worktree — the
// hooks live under the main checkout's own `.git/`, nowhere near the worktree's own folder — and
// `join(root, hooksDir)` had concatenated that absolute answer onto `root` into a path nothing
// ever wrote, so the guard above never found the real hook and set core.hooksPath anyway.
test("init in a git worktree leaves the main checkout's own hooks alone, naming the hook it found", () => {
  const main = temp();
  initRepository(main);
  const hooksDir = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: main, encoding: "utf8" }).trim();
  fs.writeFileSync(path.join(main, hooksDir, "pre-commit"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  execFileSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", "commit", "-q", "--allow-empty", "-m", "x"], { cwd: main });
  const worktree = path.join(temp(), "wt");
  execFileSync("git", ["worktree", "add", "-q", worktree, "-b", "wt-branch"], { cwd: main });
  const said = run(["init", worktree, "--name", "Acme", "--agent", "claude"]);
  assert.match(said, /pre-commit/);
  assert.match(said, /not in use/);
  const cfg = spawnSync("git", ["config", "--get", "core.hooksPath"], { cwd: worktree, encoding: "utf8" });
  assert.notEqual(cfg.status, 0, "core.hooksPath was left unset in the worktree");
});

test("the hook refuses only on the checker's refusal, and lets the commit through when it cannot run", () => {
  const dir = temp();
  initRepository(dir);
  run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  const commit = (env, extra = []) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", "commit", "-q", "--allow-empty", ...extra, "-m", "x"],
    { cwd: dir, encoding: "utf8", env: { ...process.env, ...env } });
  const stub = (code) => {
    const file = path.join(temp(), "stub.mjs");
    fs.writeFileSync(file, `process.exit(${code});\n`);
    return file;
  };
  assert.notEqual(commit({ COMPANYGRAPH_CLI: stub(3) }).status, 0);
  const through = commit({ COMPANYGRAPH_CLI: stub(1) });
  assert.equal(through.status, 0);
  assert.match(through.stderr, /seat check did not run/);
  // Run against the real CLI, not a stub, this passed vacuously without an identity `url`: with
  // no domain every author is outside the model (governingOf), so nothing the real checker could
  // ever refuse was exercised. An `r@x.io` commit stays outside once a `url` is there too, which
  // this keeps proving; a `--author` at the instance's own domain naming no seat is what proves
  // the real CLI, reached through the hook's own `$here` resolution (also on the Windows job),
  // actually refuses.
  assert.equal(commit({ COMPANYGRAPH_CLI: cli }).status, 0);
  const identityPath = path.join(dir, "model/identity.md");
  fs.writeFileSync(identityPath, fs.readFileSync(identityPath, "utf8").replace("source: Local\n---", "source: Local\nurl: https://acme.example/\n---"));
  const refused = commit({ COMPANYGRAPH_CLI: cli }, ["--author", "Ghost <ghost@acme.example>"]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /ghost@acme\.example is at acme\.example and names no seat of Acme/);
});

// The hook's other branch, taken with no COMPANYGRAPH_CLI set: `npx` at the manifest's own
// `tooling`, with no network reached. A fake `npx` first on PATH stands in for the real one and
// records what it was called with, which pins the hook's `sed` extraction of `tooling` from
// `.companygraph/manifest.json` and the exact companygraph invocation it hands npx.
test("the hook's npx branch, with COMPANYGRAPH_CLI unset, asks npx for the manifest's own tooling release",
  { skip: process.platform === "win32" && "a shebang script with no .exe/.cmd extension is not reliably resolved via PATH by Git Bash's sh here; not verifiable without a Windows runner" },
  () => {
    const dir = temp();
    initRepository(dir);
    run(["init", dir, "--name", "Acme", "--agent", "claude"]);
    const manifest = JSON.parse(fs.readFileSync(path.join(dir, ".companygraph/manifest.json"), "utf8"));
    const bin = temp();
    const record = path.join(bin, "npx-argv.txt");
    const fake = path.join(bin, "npx");
    fs.writeFileSync(fake, `#!/bin/sh\nfor a in "$@"; do printf '%s\\n' "$a" >> "${record}"; done\nexit 0\n`);
    fs.chmodSync(fake, 0o755);
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    delete env.COMPANYGRAPH_CLI;
    const result = spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", "commit", "-q", "--allow-empty", "-m", "x"],
      { cwd: dir, encoding: "utf8", env });
    assert.equal(result.status, 0, result.stderr);
    const argv = fs.readFileSync(record, "utf8").split("\n").filter(Boolean);
    assert.deepEqual(argv.slice(0, 5), ["--yes", "--prefer-offline", "--package", `github:companygraph/meta-model#v${manifest.tooling}`, "companygraph"]);
    const commitsAt = argv.indexOf("commits");
    assert.notEqual(commitsAt, -1);
    assert.equal(fs.realpathSync.native(argv[commitsAt + 1]), fs.realpathSync.native(dir));
    assert.equal(argv[commitsAt + 2], "--message");
    // The hook passes git's own "$1" through unchanged, which git hands it relative to the
    // repository root it runs the hook in, not to this process's own cwd.
    assert.ok(fs.existsSync(path.resolve(dir, argv[commitsAt + 3])), "the message file path handed to npx exists");
  });

// Found in review: `git commit` exports GIT_INDEX_FILE to its hooks — absolute in a linked
// worktree and for `commit -a` — and the `git clone` npx runs to fetch the tooling inherited it,
// writing the tooling's own index over the instance's. The hook now clears git's repository
// variables before the checker runs. This fake npx refuses (exit 3, a refusal the hook passes on)
// whenever one of them reaches it, so a leak refuses the commit outright; it prints a line on
// stdout the way a passing checker does, which a passing commit must not show.
test("the hook hands npx no repository of git's, in a worktree and on commit -a, and a passing commit prints nothing",
  { skip: process.platform === "win32" && "a shebang script with no .exe/.cmd extension is not reliably resolved via PATH by Git Bash's sh here; not verifiable without a Windows runner" },
  () => {
    const dir = temp();
    initRepository(dir);
    run(["init", dir, "--name", "Acme", "--agent", "claude"]);
    const bin = temp();
    const record = path.join(bin, "npx-argv.txt");
    const fake = path.join(bin, "npx");
    fs.writeFileSync(fake, [
      "#!/bin/sh",
      `printf '%s\\n' "$*" >> "${record}"`,
      'for v in GIT_INDEX_FILE GIT_DIR GIT_WORK_TREE; do',
      '  eval "set_=\\${$v+x}"',
      '  if [ -n "$set_" ]; then echo "npx was handed $v" >&2; exit 3; fi',
      "done",
      "echo 'the checker passed'",
      "exit 0",
      "",
    ].join("\n"));
    fs.chmodSync(fake, 0o755);
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    delete env.COMPANYGRAPH_CLI;
    const git = (cwd, args) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", ...args], { cwd, encoding: "utf8", env });
    const tracked = (cwd) => {
      const status = git(cwd, ["status", "--porcelain"]);
      assert.equal(status.status, 0, `git status works afterwards: ${status.stderr}`);
      assert.equal(status.stdout, "", "nothing is left staged or changed");
      const listed = git(cwd, ["ls-files"]).stdout;
      assert.equal(listed, git(cwd, ["ls-tree", "-r", "--name-only", "HEAD"]).stdout, "the index lists the commit's own files");
      assert.match(listed, /^\.companygraph\/manifest\.json$/m);
      assert.doesNotMatch(listed, /^verify\/cli\.test\.mjs$/m, "no file of the tooling's own is in the index");
    };
    assert.equal(git(dir, ["add", "-A"]).status, 0);
    assert.equal(git(dir, ["commit", "-q", "--no-verify", "-m", "the instance"]).status, 0);

    const worktree = path.join(temp(), "wt");
    assert.equal(git(dir, ["worktree", "add", "-q", worktree, "-b", "wt-branch"]).status, 0);
    fs.writeFileSync(path.join(worktree, "note.md"), "a note\n");
    assert.equal(git(worktree, ["add", "note.md"]).status, 0);
    const inWorktree = git(worktree, ["commit", "-q", "-m", "a note"]);
    assert.equal(inWorktree.status, 0, inWorktree.stderr);
    assert.equal(inWorktree.stdout + inWorktree.stderr, "", "a passing commit prints nothing");
    tracked(worktree);
    assert.match(git(worktree, ["ls-files"]).stdout, /^note\.md$/m);

    fs.appendFileSync(path.join(dir, "AGENTS.md"), "\nA line of the instance's own.\n");
    const all = git(dir, ["commit", "-q", "-a", "-m", "a line"]);
    assert.equal(all.status, 0, all.stderr);
    assert.equal(all.stdout + all.stderr, "", "a passing commit prints nothing");
    tracked(dir);

    const calls = fs.readFileSync(record, "utf8").split("\n").filter(Boolean);
    assert.equal(calls.length, 2, "npx ran once for each commit the hook checked");
    for (const call of calls) assert.match(call, /companygraph commits .* --message /);
  });

// Found on 2026-10-02 in the three MCP hosts, which take meta-model as a git dependency: git had
// the bin at 100644, npm sets a bin's mode only when it links one, and a release put back under a
// link already in node_modules kept 0644. npx in that repository runs the project's own copy, sh
// cannot (bash exits 126, Debian's dash 127), and the hook let every commit through as one the
// check did not run. This builds that layout — the package in the instance's node_modules, its
// bin not executable — and a fake
// npx that runs commands the way npm exec does there, the project's .bin first on PATH, through
// sh. A commit going through proves nothing, since a hook that cannot start lets it through too;
// the refusal of a seat only the real checker knows is what proves the checker ran.
test("the hook runs the checker in a git-dependency layout whose bin lost its execute bit, and refuses a bad seat",
  { skip: process.platform === "win32" && "a shebang script with no .exe/.cmd extension is not reliably resolved via PATH by Git Bash's sh here; and Windows has no execute bit to lose" },
  () => {
    const dir = temp();
    initRepository(dir);
    run(["init", dir, "--name", "Acme", "--agent", "claude"]);
    const identityPath = path.join(dir, "model/identity.md");
    fs.writeFileSync(identityPath, fs.readFileSync(identityPath, "utf8").replace("source: Local\n---", "source: Local\nurl: https://acme.example/\n---"));

    const repo = path.join(here, "..");
    const pkg = path.join(dir, "node_modules/companygraph-meta-model");
    fs.mkdirSync(path.join(pkg, "bin"), { recursive: true });
    for (const entry of ["package.json", "lib", "core", "form", "packs", "agents"])
      fs.symlinkSync(path.join(repo, entry), path.join(pkg, entry));
    // bin/ holds a folder, bin/judges/, so it is copied whole and every file in it loses its bit.
    fs.cpSync(path.join(repo, "bin"), path.join(pkg, "bin"), { recursive: true });
    for (const file of fs.readdirSync(path.join(pkg, "bin"), { recursive: true }))
      if (fs.statSync(path.join(pkg, "bin", file)).isFile()) fs.chmodSync(path.join(pkg, "bin", file), 0o644);
    fs.mkdirSync(path.join(dir, "node_modules/.bin"));
    fs.symlinkSync("../companygraph-meta-model/bin/companygraph.mjs", path.join(dir, "node_modules/.bin/companygraph"));
    assert.equal(fs.statSync(path.join(dir, "node_modules/.bin/companygraph")).mode & 0o111, 0, "the layout's bin is not executable");

    const bin = temp();
    const record = path.join(bin, "npx-argv.txt");
    const fake = path.join(bin, "npx");
    fs.writeFileSync(fake, [
      "#!/bin/sh",
      `printf '%s\\n' "$*" >> "${record}"`,
      `PATH="$PWD/node_modules/.bin:${path.dirname(process.execPath)}:/usr/bin:/bin"; export PATH`,
      "while :; do",
      '  case $1 in --yes|--prefer-offline) shift ;; --package) shift 2 ;; -c) exec sh -c "$2" ;; *) break ;; esac',
      "done",
      'exec sh -c \'"$@"\' sh "$@"',
      "",
    ].join("\n"));
    fs.chmodSync(fake, 0o755);
    const env = { ...process.env, PATH: `${bin}${path.delimiter}${process.env.PATH}` };
    delete env.COMPANYGRAPH_CLI;
    const commit = (extra = []) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@x.io", "commit", "-q", "--allow-empty", ...extra, "-m", "x"],
      { cwd: dir, encoding: "utf8", env });

    const refused = commit(["--author", "Ghost <ghost@acme.example>"]);
    assert.notEqual(refused.status, 0, refused.stderr);
    assert.match(refused.stderr, /ghost@acme\.example is at acme\.example and names no seat of Acme/);
    const through = commit();
    assert.equal(through.status, 0, through.stderr);
    assert.doesNotMatch(through.stderr, /seat check did not run/);
    const calls = fs.readFileSync(record, "utf8").split("\n").filter(Boolean);
    assert.equal(calls.length, 4, "each commit asked npx for the bin, then for node on it");
    assert.match(calls[1], / -c /);
  });

test("a command it does not know, and no command at all, print what it can do", () => {
  assert.throws(() => run(["dance"], { stdio: "pipe" }), /init/);
  assert.match(run(["--help"]), /init/);
});

test("the menu makes an instance from answers alone, and what it made passes the checks", () => {
  const root = path.join(temp(), "acme");
  const said = run(["menu"], { input: `1\n${root}\nAcme\n\nn\n`, stdio: "pipe" });
  assert.match(said, /1 {2}Make a model/);
  assert.match(said, /files written into/);
  const { failures } = checkInstance(filesOf(root), { core: "meta/core", model: "model" });
  assert.deepEqual(failures, []);
  assert.equal(fs.existsSync(path.join(root, ".obsidian")), false);
});

test("the menu asks before it adds to a folder that holds files, and a no writes nothing", () => {
  const root = temp();
  fs.writeFileSync(path.join(root, "notes.md"), "# Notes\n");
  run(["menu"], { input: `1\n${root}\nn\n`, stdio: "pipe" });
  assert.deepEqual(fs.readdirSync(root), ["notes.md"]);
});

test("the menu shows an upgrade before it runs one, and a pick it does not have is refused", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const said = run(["menu"], { input: `3\n${root}\n`, stdio: "pipe" });
  assert.match(said, /nothing to do/);
  const quit = quitOf(said);
  assert.throws(() => run(["menu"], { input: "9\n", stdio: "pipe" }), new RegExp(`9 is not one of 1-${quit}`));
});

test("the menu comes back after a pick and stays until Quit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const said = run(["menu"], { input: `\n2\n${root}\n9\nq\n1\n`, stdio: "pipe" });
  const quit = quitOf(said);
  assert.equal(said.match(new RegExp(`${quit} {2}Quit`, "g")).length, 4);
  assert.doesNotMatch(said, /Which folder\?.*\n.*Which folder\?/s);
  assert.match(run(["menu"], { input: `${quit}\n`, stdio: "pipe" }), new RegExp(`${quit} {2}Quit`));
});

// A question inside a pick is left with b, and the menu comes back with nothing more done: here
// the folder was named and the company was not, so nothing was written. What a pick had already
// written stays, and the menu says it went back rather than that the pick failed.
test("the menu comes back from any question on b, and says so without calling it a failure", () => {
  const root = path.join(temp(), "acme");
  const said = run(["menu"], { input: `1\n${root}\nb\nq\n`, stdio: "pipe" });
  assert.match(said, /What is the company called\?/);
  assert.match(said, /back to the menu/);
  assert.doesNotMatch(said, /✗/);
  assert.equal(fs.existsSync(root), false);
  assert.equal(said.match(new RegExp(`${quitOf(said)} {2}Quit`, "g")).length, 2);
  // Outside the menu a b is an answer like any other: a no to a y/N, here.
  const vault = temp();
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  assert.match(run(["obsidian", vault, "--from", build], { stdio: "pipe", input: "b\nb\n" }), /Claudian left out/);
});

// Ctrl+C while a pick is asking is the same way back, and only at the menu's own prompt does it
// end the run. The child is sent the signal itself while it waits at the question. Not on
// Windows: there `kill` ends a process rather than signalling it, and a console's Ctrl+C, which
// Node does hand to the same handler, cannot be sent through a pipe.
test("the menu comes back from a question on Ctrl+C, and ends on Ctrl+C at its own prompt", { skip: process.platform === "win32" && "no signal to send on Windows", timeout: 20000 }, async () => {
  const { spawn } = await import("node:child_process");
  const child = spawn(process.execPath, [cli, "menu"], { stdio: ["pipe", "pipe", "pipe"] });
  let said = "";
  const until = (text) => new Promise((done) => {
    const look = () => said.includes(text) && (child.stdout.off("data", look), done());
    child.stdout.on("data", (chunk) => { said += chunk; look(); });
    look();
  });
  await until("Pick 1-");
  const pick = `Pick 1-${said.match(/Pick 1-(\d+)/)[1]}`;
  child.stdin.write(`1\n${temp()}\n`);
  await until("What is the company called?");
  child.kill("SIGINT");
  await until("back to the menu");
  await until(pick);
  child.kill("SIGINT");
  const code = await new Promise((done) => child.on("exit", done));
  assert.equal(code, 130);
});

test("obsidian --from puts a build into a vault and switches it on", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const said = run(["obsidian", root, "--from", build, "--no-plugins"], { stdio: "pipe" });
  assert.match(said, /CompanyGraph 1\.0\.0 installed .*, and switched on/);
  // The switch no file sets: a vault browsed in restricted mode lists no community plugin at all.
  assert.match(said, /Settings → Community plugins → Turn on community plugins/);
  assert.doesNotMatch(said, /\x1b\[/, "no color where there is no terminal");
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8")), ["companygraph"]);
});

// The rest of what `obsidian` does to a vault, with the recommended plugins skipped because they
// come over the network: the graph colored per root folder of the model, the panes, and where
// Obsidian is. Both files are the person's once Obsidian has written them, so the second run keeps
// them and says so.
test("obsidian writes the graph and the panes for the model's folders, keeps them on a second run, and says how to open the vault", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--folders", "skills,values"]);
  const said = run(["obsidian", root, "--from", build, "--no-plugins"], { stdio: "pipe" });
  assert.match(said, /graph\.json written: the model, one color per folder/);
  assert.match(said, /workspace\.json written/);
  assert.match(said, /obsidian:\/\/open\?path=/);
  const graph = JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "graph.json"), "utf8"));
  assert.deepEqual(graph.colorGroups.map((g) => g.query), ["path:model/skills", "path:model/values"]);
  const workspace = fs.readFileSync(path.join(root, ".obsidian", "workspace.json"), "utf8");
  assert.ok(workspace.includes('"file": "model/identity.md"') && !workspace.includes("claudian-view"));
  fs.writeFileSync(path.join(root, ".obsidian", "graph.json"), "{}");
  const again = run(["obsidian", root, "--from", build, "--no-plugins"], { stdio: "pipe" });
  assert.match(again, /graph\.json kept/);
  assert.equal(fs.readFileSync(path.join(root, ".obsidian", "graph.json"), "utf8"), "{}");
  const forced = run(["obsidian", root, "--from", build, "--no-plugins", "--force"], { stdio: "pipe" });
  assert.match(forced, /graph\.json written/);
});

// Each recommended plugin is asked for by name, and a no leaves it out and says so; the answers
// come through the pipe as the menu's do. A yes would reach the network, so none is given here.
test("obsidian asks for each recommended plugin by name, and a no leaves it out", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const said = run(["obsidian", root, "--from", build], { stdio: "pipe", input: "n\nn\n" });
  assert.match(said, /Install Claudian, Claude Code in a pane\?/);
  assert.match(said, /Install Terminal, a shell in a pane\?/);
  assert.match(said, /Claudian left out/);
  assert.match(said, /Terminal left out/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8")), ["companygraph"]);
  const quiet = run(["obsidian", root, "--from", build, "--no-plugins"], { stdio: "pipe" });
  assert.doesNotMatch(quiet, /Install Claudian/);
});

// Obsidian switches a plugin off by taking its name out of the list and leaving its files, and
// a person's off is not the command's to undo: the files are neither updated nor switched on.
test("obsidian leaves a recommended plugin the person switched off as it is, and says so", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const off = path.join(root, ".obsidian", "plugins", "terminal");
  fs.mkdirSync(off, { recursive: true });
  fs.writeFileSync(path.join(off, "manifest.json"), JSON.stringify({ id: "terminal", version: "3.0.0" }));
  const said = run(["obsidian", root, "--from", build], { stdio: "pipe", input: "n\n" });
  assert.match(said, /Terminal is there but switched off; left as it is/);
  assert.doesNotMatch(said, /Install Terminal/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8")), ["companygraph"]);
});

// A folder that is not there yet is made, as Obsidian itself makes a vault of an empty folder;
// a file in the way is still refused.
test("obsidian makes the vault's folder when there is none, and refuses a file in its place", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = path.join(temp(), "new", "vault");
  const said = run(["obsidian", root, "--from", build, "--no-plugins"], { stdio: "pipe" });
  assert.match(said, /made the folder/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".obsidian", "community-plugins.json"), "utf8")), ["companygraph"]);
  const file = path.join(temp(), "a-file");
  fs.writeFileSync(file, "");
  assert.throws(() => run(["obsidian", file, "--from", build, "--no-plugins"], { stdio: "pipe" }), /is not a folder/);
});

// Obsidian opens by URL only a folder it already lists as a vault, so a folder it does not know
// is put on that list first, while Obsidian is not running, and the way in by hand stays among
// the steps for a vault put there this run, since the opener cannot say whether a vault opened.
test("obsidian puts a folder Obsidian does not know on its list when Obsidian is not running, then opens it", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const home = temp();
  // No process lister and no opener on the path: not running is the answer, and the open fails aloud.
  const said = run(["obsidian", root, "--from", build, "--no-plugins", "--open"], { stdio: "pipe", env: { ...process.env, HOME: home, APPDATA: home, PATH: temp() } });
  assert.match(said, /put on Obsidian's list of vaults/);
  assert.match(said, /could not open/);
  const list = path.join(home, process.platform === "darwin" ? "Library/Application Support/obsidian" : process.platform === "win32" ? "obsidian" : ".config/obsidian", "obsidian.json");
  assert.deepEqual(Object.values(JSON.parse(fs.readFileSync(list, "utf8")).vaults).map((v) => v.path), [fs.realpathSync.native(root)]);
  assert.match(said, /Did it not open\? Open the folder as a vault/);
  // Not asked to open: the list is left alone, and the way in is said.
  const other = temp();
  const quiet = run(["obsidian", other, "--from", build, "--no-plugins"], { stdio: "pipe", env: { ...process.env, HOME: home, APPDATA: home, PATH: temp() } });
  assert.match(quiet, /Open folder as vault/);
  assert.equal(Object.values(JSON.parse(fs.readFileSync(list, "utf8")).vaults).length, 1);
});

// --open with no opener on the path: the failure is said with the URL, and what is left to say
// in Obsidian is still said, since every file was written by then.
test("obsidian --open says an opener that fails and still says what is left to do", () => {
  const build = temp();
  fs.writeFileSync(path.join(build, "main.js"), "// main");
  fs.writeFileSync(path.join(build, "styles.css"), "");
  fs.writeFileSync(path.join(build, "manifest.json"), JSON.stringify({ id: "companygraph", version: "1.0.0" }));
  const root = temp();
  const home = temp();
  const list = path.join(home, process.platform === "darwin" ? "Library/Application Support/obsidian" : process.platform === "win32" ? "obsidian" : ".config/obsidian");
  fs.mkdirSync(list, { recursive: true });
  fs.writeFileSync(path.join(list, "obsidian.json"), JSON.stringify({ vaults: { aaaaaaaaaaaaaaaa: { path: fs.realpathSync.native(root), ts: 1 } } }));
  const said = run(["obsidian", root, "--from", build, "--no-plugins", "--open"], { stdio: "pipe", env: { ...process.env, HOME: home, APPDATA: home, PATH: temp() } });
  assert.match(said, /✗ could not open obsidian:\/\/open\?path=/);
  assert.match(said, /Then, in Obsidian/);
});

test("upgrade moves an instance, says what it did, and leaves the model alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "model/skills/java.md"), "---\nsource: Local\n---\n\n# Java\n\n> A language.\n");
  const said = run(["upgrade", root]);
  assert.match(said, /already on core/i);
  assert.ok(fs.existsSync(path.join(root, "model/skills/java.md")));
});

// An instance made before init wrote the export's inputs has none, and its bundle shipped no
// reading guide. The upgrade writes the one missing, names it, and leaves the one the instance has.
test("upgrade writes a reading guide the instance lacks, names it, and keeps the instance's own README", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.rmSync(path.join(root, "export/gemini-notebook-AGENTS.md"));
  fs.writeFileSync(path.join(root, "export/README.md"), "# the instance's own\n");
  const said = run(["upgrade", root]);
  assert.match(said, /written, since the instance had none.*export\/gemini-notebook-AGENTS\.md/);
  assert.match(fs.readFileSync(path.join(root, "export/gemini-notebook-AGENTS.md"), "utf8"), /^# Acme — the model\n/);
  assert.equal(fs.readFileSync(path.join(root, "export/README.md"), "utf8"), "# the instance's own\n");
  assert.match(run(["upgrade", root]), /already on core/i);
});

// Review fix 1: an instance made before the localization schema landed has no model/localization.md at
// all, and `init` alone never revisits an existing instance. `upgrade` now writes it once,
// reading `source` off model/identity.md, and the instance it lands on still passes `check`.
test("upgrade writes model/localization.md the instance lacks, with source read from identity, and the instance still checks clean", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.rmSync(path.join(root, "model/localization.md"));
  const said = run(["upgrade", root]);
  assert.match(said, /written, since the instance had none.*model\/localization\.md/);
  const page = fs.readFileSync(path.join(root, "model/localization.md"), "utf8");
  assert.match(page, /\nsource: Local\n/);
  assert.match(page, /\nlocale: en-US\n/);
  assert.doesNotThrow(() => run(["check", root]));
});

test("upgrade rewrites a localization page in the earlier form, says so, and a second upgrade leaves it be", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  const id = fs.readFileSync(loc, "utf8").match(/^id: (\S+)$/m)[1];
  fs.writeFileSync(loc, `---\nid: ${id}\nsource: Local\n---\n\n# Languages\n\n> Who reads it.\n\n## Locales\n\n| Locale | Role |\n| --- | --- |\n| en-US | primary |\n`);
  const said = run(["upgrade", root]);
  assert.match(said, /rewritten in this core's form: model\/localization\.md/);
  assert.equal(fs.readFileSync(loc, "utf8"), `---\nid: ${id}\nsource: Local\nlocale: en-US\n---\n\n# Languages\n\n> Who reads it.\n`);
  assert.doesNotThrow(() => run(["check", root]));
  // The page now names its locale, so the plan writes nothing and upgrade says it has nothing to do.
  assert.match(run(["upgrade", root]), /already on core/i);
});

// Core 0.63.0 renamed the type role to seat. An instance written before it holds its seats in
// model/roles/, a profile's roles: and a Type cell naming role. The earlier pages are built here
// from the example's current ones, put back into the earlier form, so the move is tested on
// pages the checks accept in either.
test("upgrade carries an instance's roles across to seats, keeping every id, and a second upgrade has nothing to do", () => {
  const example = path.join(here, "..", "example", "model");
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // The two seats without their skills, which this instance does not hold.
  const seat = (name) => fs.readFileSync(path.join(example, `seats/${name}.md`), "utf8").replace(/requires:\n {2}- .*\n/, "");
  const reviewer = seat("reviewer");
  const id = reviewer.match(/^id: (\S+)$/m)[1];
  // An instance made before the rename has no model/seats/; this release's init wrote one.
  fs.rmSync(path.join(root, "model/seats"), { recursive: true });
  fs.mkdirSync(path.join(root, "model/roles"));
  fs.writeFileSync(path.join(root, "model/roles/reviewer.md"), reviewer);
  fs.writeFileSync(path.join(root, "model/roles/backend-engineer.md"), seat("backend-engineer"));
  fs.writeFileSync(path.join(root, "model/roles/README.md"), "# Roles\n\nOne file per role, written against `meta/core/role-schema.md`.\n\nThe owner reads these on Mondays.\n");
  // Whatever else the folder holds moves with it, byte for byte: an image, an editor's leftover.
  const image = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 255, 13, 10, 26, 10]);
  fs.writeFileSync(path.join(root, "model/roles/reviewer.png"), image);
  fs.writeFileSync(path.join(root, "model/roles/.DS_Store"), Buffer.from([0, 0, 0, 1, 66, 117, 100, 49, 255]));
  const agent = path.join(root, "model/profiles/ai-agent");
  fs.cpSync(path.join(example, "profiles/ai-agent"), agent, { recursive: true });
  const profile = path.join(agent, "ai-agent.md");
  fs.writeFileSync(profile, fs.readFileSync(profile, "utf8").replace("\nseats:\n", "\nroles:\n"));
  fs.writeFileSync(
    path.join(root, "model/rules/a-change-is-reviewed.md"),
    "---\nid: 01a0fb1b-b4ff-7020-8a63-e80de5bbcc7f\nsource: Local\nmodality: must\n---\n\n# A change is reviewed\n\n> A change ships only after a second person has read it.\n\n## Why\n\nThe author is the person least able to see what they missed.\n\n## Applies to\n\n| Type | Entity | Owner |\n| --- | --- | --- |\n| role | Reviewer | |\n| `role` | Backend Engineer | |\n",
  );

  // The instance's own files that still say roles are named after the move and never rewritten;
  // what the vendored units folder, git and a build hold is not the instance's to edit.
  fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\nOur seats are kept in model/roles/.\n");
  fs.mkdirSync(path.join(root, "dist"));
  fs.writeFileSync(path.join(root, "dist/notes.md"), "see model/roles/\n");

  const planned = run(["upgrade", root, "--dry-run"]);
  assert.doesNotMatch(planned, /still name roles/);
  assert.match(planned, /moved {3}model\/roles\/reviewer\.md → model\/seats\/reviewer\.md/);
  assert.ok(fs.existsSync(path.join(root, "model/roles/reviewer.md")));

  const said = run(["upgrade", root]);
  assert.match(said, /moved {3}model\/roles\/reviewer\.md → model\/seats\/reviewer\.md/);
  assert.match(said, /moved {3}model\/roles\/backend-engineer\.md → model\/seats\/backend-engineer\.md/);
  assert.match(said, /rewritten in this core's form: .*model\/profiles\/ai-agent\/ai-agent\.md/);
  // The owner's README keeps its word role, so it is named beside the instance's README.md; the
  // build's folder and the vendored units are not looked in.
  assert.match(said, /\n {2}still name roles; yours to edit:\n {4}README\.md\n {4}model\/seats\/README\.md\n/);
  assert.doesNotMatch(said, /dist\/notes\.md/);
  assert.equal(fs.readFileSync(path.join(root, "README.md"), "utf8"), "# Acme\n\nOur seats are kept in model/roles/.\n");
  assert.equal(fs.readFileSync(path.join(root, "model/seats/reviewer.md"), "utf8").match(/^id: (\S+)$/m)[1], id);
  assert.ok(!fs.existsSync(path.join(root, "model/roles")));
  assert.equal(
    fs.readFileSync(path.join(root, "model/seats/README.md"), "utf8"),
    "# Seats\n\nOne file per role, written against `meta/core/seat-schema.md`.\n\nThe owner reads these on Mondays.\n",
  );
  assert.deepEqual(fs.readFileSync(path.join(root, "model/seats/reviewer.png")), image);
  assert.deepEqual(fs.readFileSync(path.join(root, "model/seats/.DS_Store")), Buffer.from([0, 0, 0, 1, 66, 117, 100, 49, 255]));
  assert.match(fs.readFileSync(profile, "utf8"), /\nseats:\n {2}- Reviewer\n/);
  assert.match(fs.readFileSync(path.join(root, "model/rules/a-change-is-reviewed.md"), "utf8"), /\| seat \| Reviewer \| \|\n\| `seat` \| Backend Engineer \| \|/);
  // The check holds them as it holds any such file in a seat's folder, and says so where they are
  // now, not that model/roles/ is no type's folder; with them gone the instance checks clean.
  const refused = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr + refused.stdout, /model\/seats\/\.DS_Store should be a \.md file/);
  assert.doesNotMatch(refused.stderr + refused.stdout, /model\/roles/);
  fs.rmSync(path.join(root, "model/seats/.DS_Store"));
  fs.rmSync(path.join(root, "model/seats/reviewer.png"));
  assert.doesNotThrow(() => run(["check", root]));
  assert.match(run(["upgrade", root]), /already on core/i);
});

test("upgrade writes a README for model/seats/ when the old model/roles/ had none", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.rmSync(path.join(root, "model/seats"), { recursive: true });
  fs.mkdirSync(path.join(root, "model/roles"));
  fs.writeFileSync(path.join(root, "model/roles/reviewer.md"), fs.readFileSync(path.join(here, "..", "example/model/seats/reviewer.md"), "utf8").replace(/requires:\n {2}- .*\n/, ""));
  const said = run(["upgrade", root]);
  assert.doesNotMatch(said, /still name roles/);
  assert.ok(!fs.existsSync(path.join(root, "model/roles")));
  assert.match(fs.readFileSync(path.join(root, "model/seats/README.md"), "utf8"), /^# Seats\n/);
  assert.doesNotThrow(() => run(["check", root]));
});

test("upgrade names only the owner's own files that still say roles, and never what git ignores", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.rmSync(path.join(root, "model/seats"), { recursive: true });
  fs.mkdirSync(path.join(root, "model/roles"));
  fs.writeFileSync(path.join(root, "model/roles/reviewer.md"), fs.readFileSync(path.join(here, "..", "example/model/seats/reviewer.md"), "utf8").replace(/requires:\n {2}- .*\n/, ""));
  initRepository(root);
  fs.writeFileSync(path.join(root, ".gitignore"), ".obsidian/\n.claudian/\n");
  fs.mkdirSync(path.join(root, ".obsidian"));
  fs.writeFileSync(path.join(root, ".obsidian/x.json"), '{"path": "model/roles/"}\n');
  fs.mkdirSync(path.join(root, ".claudian"));
  fs.writeFileSync(path.join(root, ".claudian/a.meta.json"), '{"path": "model/roles/"}\n');
  fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\nOur seats are kept in model/roles/.\n");
  fs.mkdirSync(path.join(root, "docs"));
  fs.writeFileSync(path.join(root, "docs/notes.md"), "see model/roles/\n");
  execFileSync("git", ["add", "docs/notes.md"], { cwd: root });
  const said = run(["upgrade", root]);
  assert.match(said, /\n {2}still name roles; yours to edit:\n {4}README\.md\n {4}docs\/notes\.md\n(?! {4})/);
  assert.doesNotMatch(said, /\.obsidian|\.claudian/);
});

test("upgrade outside a git repository skips dot-directories when it names the files that still say roles", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.rmSync(path.join(root, "model/seats"), { recursive: true });
  fs.mkdirSync(path.join(root, "model/roles"));
  fs.writeFileSync(path.join(root, "model/roles/reviewer.md"), fs.readFileSync(path.join(here, "..", "example/model/seats/reviewer.md"), "utf8").replace(/requires:\n {2}- .*\n/, ""));
  fs.mkdirSync(path.join(root, ".obsidian"));
  fs.writeFileSync(path.join(root, ".obsidian/x.json"), '{"path": "model/roles/"}\n');
  fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\nOur seats are kept in model/roles/.\n");
  const said = run(["upgrade", root]);
  assert.match(said, /\n {2}still name roles; yours to edit:\n {4}README\.md\n(?! {4})/);
  assert.doesNotMatch(said, /\.obsidian/);
});

const sha256 = (text) => `sha256:${createHash("sha256").update(text).digest("hex")}`;

// Defect 6 (2026-09-20 review): the spec asks for "an upgrade between two real releases tested
// end to end … with the manifest, the hashes and the workflow line all moved, and the checks run
// after", but the only CLI-level upgrade test was the no-op "already on core" path above. This
// does the move for real without touching the network: init at the bundled (current) release,
// then doctor the instance to look like it is on an older one by rewriting one vendored file and
// the manifest and workflow around it to match, so `upgrade` has an actual move to make when it
// brings that instance forward to this release.
test("upgrade moves an instance between two real releases end to end: core, every hash, tooling, core.version and the workflow line all move, and the checks run after", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);

  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const conventionsPath = path.join(root, "meta/core/CONVENTIONS.md");
  const olderConventions = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(conventionsPath, olderConventions);
  manifest.core.version = "0.1.0";
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(olderConventions);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const workflowPath = path.join(root, ".github/workflows/companygraph.yml");
  fs.writeFileSync(
    workflowPath,
    fs.readFileSync(workflowPath, "utf8").replace(/instance-check\.yml@v[\d.]+/, "instance-check.yml@v0.1.0"),
  );

  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  const bundledConventions = fs.readFileSync(path.join(here, "..", "core/CONVENTIONS.md"), "utf8");
  const bundledCoreVersion = JSON.parse(fs.readFileSync(path.join(here, "..", "core/manifest.json"), "utf8")).version;

  const said = run(["upgrade", root]);
  assert.match(said, /^core 0\.1\.0 → /);
  assert.ok(!/already on core/i.test(said));
  assert.match(said, /mechanical checks pass/);

  assert.equal(fs.readFileSync(conventionsPath, "utf8"), bundledConventions);

  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(moved.tooling, version);
  assert.equal(moved.core.version, bundledCoreVersion);
  for (const [rel, hash] of Object.entries(moved.files))
    assert.equal(hash, sha256(fs.readFileSync(path.join(root, rel), "utf8")), rel);

  assert.ok(fs.readFileSync(workflowPath, "utf8").includes(`instance-check.yml@v${version}`));
});

test("upgrade refuses when core was edited inside the instance, and --dry-run writes nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const conventions = path.join(root, "meta/core/CONVENTIONS.md");
  fs.writeFileSync(conventions, `${fs.readFileSync(conventions, "utf8")}\nedited\n`);
  assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /CONVENTIONS\.md/);
  const before = fs.readFileSync(conventions, "utf8");
  run(["upgrade", root, "--force", "--dry-run"]);
  assert.equal(fs.readFileSync(conventions, "utf8"), before);
});

// Defect 1: a manifest is a file inside the instance, and can name anything in `files` with a
// correct hash next to it. Unfiltered, that list became a delete list: this proves both halves —
// the whole upgrade refuses, and neither targeted file is touched, not just that the call throws.
test("upgrade refuses a manifest that names files outside its own core, and deletes neither", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const identityPath = path.join(root, "model/identity.md");
  const identity = fs.readFileSync(identityPath, "utf8");
  const victimPath = path.join(path.dirname(root), `${path.basename(root)}-victim.txt`);
  const victim = "do not delete me\n";
  fs.writeFileSync(victimPath, victim);
  try {
    manifest.files["model/identity.md"] = sha256(identity);
    manifest.files[`../${path.basename(victimPath)}`] = sha256(victim);
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /model\/identity\.md/);
    assert.equal(fs.readFileSync(identityPath, "utf8"), identity);
    assert.ok(fs.existsSync(victimPath));
    assert.equal(fs.readFileSync(victimPath, "utf8"), victim);
  } finally {
    fs.rmSync(victimPath, { force: true });
  }
});

// Defect 2: `units` also comes from the manifest, and is interpolated straight into every write
// path. A relative escape must refuse the whole upgrade before anything is written, not just fail
// to create the escaped folder as a side effect of some other check.
test("upgrade refuses a manifest whose units escapes the instance, and writes nothing outside it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  // Named after this run's own root, not a fixed "../escaped", so a run that failed to refuse
  // (the very bug under test) cannot leave a folder behind for a later run to find already there
  // and pass against.
  const folder = `${path.basename(root)}-escaped`;
  manifest.units = `../${folder}`;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const escaped = path.join(path.dirname(root), folder);
  try {
    assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /units/);
    assert.ok(!fs.existsSync(escaped));
  } finally {
    fs.rmSync(escaped, { recursive: true, force: true });
  }
});

function tempPackage() {
  const dir = temp();
  for (const part of ["bin", "lib", "core", "form", "agents"]) fs.cpSync(path.join(here, "..", part), path.join(dir, part), { recursive: true });
  fs.cpSync(path.join(here, "..", "package.json"), path.join(dir, "package.json"));
  return dir;
}

// Found making companygraph/mental-model: a core newer than the tooling leaves an instance no
// released checker runs, so `upgrade` refuses it before writing, as `init` does. A private copy
// of the package stands in for a genuinely newer release, since nothing here may reach the
// network for one: only its bundled core/manifest.json's version is raised.
test("upgrade refuses a core newer than itself, and writes nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = filesOf(root);
  const pkg = tempPackage();
  const coreManifestPath = path.join(pkg, "core/manifest.json");
  const coreManifest = JSON.parse(fs.readFileSync(coreManifestPath, "utf8"));
  coreManifest.version = "99.99.99";
  fs.writeFileSync(coreManifestPath, `${JSON.stringify(coreManifest)}\n`);
  const result = spawnSync(process.execPath, [path.join(pkg, "bin/companygraph.mjs"), "upgrade", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /99\.99\.99[\s\S]*nothing was written/);
  assert.deepEqual(filesOf(root), before);
});

// Defect 5: checkPath can still throw after a real move — here because the model is gone — and
// an upgrade that stood is not to be hidden by it: the throw is printed with the "✗ " prefix
// `check` uses, and the upgrade is said to stand.
//
// Review fix 1 made `upgrade` write model/localization.md where the instance lacks one and the
// core carries `localization-schema.md`, which every bundled core does from here on — so
// deleting model/ before an upgrade against this package's own core no longer leaves it empty
// afterward, and checkPath's "has no model/" guard would never fire. A private copy of the
// package with that one schema file removed stands in for a release from before the localization schema, which is
// what this defect actually needs: a target core that does not heal the folder back.
test("upgrade's own check prints a guard failure with its prefix and still says the upgrade stands", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const pkg = tempPackage();
  fs.rmSync(path.join(pkg, "core/localization-schema.md"));
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.core.version = "0.1.0";
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, "model"), { recursive: true });
  const result = spawnSync(process.execPath, [path.join(pkg, "bin/companygraph.mjs"), "upgrade", root], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stderr, /✗ .*has no model\//);
  assert.match(result.stdout, /the upgrade stands/);
});

test("init --folders writes the folders named and sources, and what it writes passes the checks", () => {
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude", "--folders", "values,processes"]);
  assert.match(said, /folders: processes, sources, values/);
  const folders = fs.readdirSync(path.join(root, "model"), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  assert.deepEqual(folders, ["processes", "sources", "values"]);
  assert.deepEqual(checkInstance(filesOf(root), { core: "meta/core", model: "model" }).failures, []);
});

// Found making companygraph/mental-model: nothing on the gate read the hashes, so a reflow of the
// vendored core passed every check and was met only by the next `upgrade`, which refused.
test("check fails on a vendored file that is not as the tooling wrote it, or is gone, naming it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);

  const conventions = path.join(root, "meta/core/CONVENTIONS.md");
  fs.writeFileSync(conventions, `${fs.readFileSync(conventions, "utf8")}\nedited\n`);
  fs.rmSync(path.join(root, "meta/core/LICENSE"));
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /meta\/core\/CONVENTIONS\.md: not as the tooling wrote it/);
  assert.match(result.stderr, /meta\/core\/LICENSE: named in \.companygraph\/manifest\.json and not in the instance/);

  // A manifest that recorded no hashes has nothing to be held to.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.files;
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);
});

// Git for Windows checks text out with \r\n line ends unless told otherwise. The checks, the
// hashes and the upgrade all read what the tooling wrote with \n, so the same instance with every
// line end turned into \r\n passes check and has nothing to upgrade.
test("an instance checked out with \\r\\n line ends passes check, and upgrade finds nothing edited", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  for (const [rel, text] of filesOf(root))
    if (typeof text === "string") fs.writeFileSync(path.join(root, rel), text.replace(/\n/g, "\r\n"));
  assert.match(fs.readFileSync(path.join(root, "model/identity.md"), "utf8"), /\r\n/);
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(run(["upgrade", root]), /already on core/i);
});

test("a core newer than the checker is refused naming both pins, the manifest's and the workflow's", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.core.version = "99.99.99";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /move the manifest's tooling and the workflow pin to v99\.99\.99 together/);
});

const SKILL_NAMES = ["companygraph-company", "companygraph-consent", "companygraph-export", "companygraph-judge", "companygraph-profile", "companygraph-surface", "companygraph-validate"];

test("init writes the skills, hashed into the manifest like the core, and tells how to run the checks", () => {
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  for (const file of ["companygraph-validate/SKILL.md", "companygraph-export/build.py", "companygraph-surface/facts.py"])
    assert.equal(manifest.files[`.claude/skills/${file}`], sha256(fs.readFileSync(path.join(root, ".claude/skills", file), "utf8")));
  assert.match(said, /npx github:companygraph\/meta-model#v\d+\.\d+\.\d+ check/);
  assert.match(said, /Python 3/);
  assert.match(said, /-company, -consent and -judge/);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.ok(agents.includes("`companygraph-company`"), "AGENTS.md names the company skill");
  assert.ok(agents.includes("`companygraph-consent`"), "AGENTS.md names the consent skill");
  assert.ok(agents.includes("`companygraph-judge`"), "AGENTS.md names the judge skill");
  assert.ok(agents.includes("`judge/known.md`"), "AGENTS.md names the file of known flags");
  assert.ok(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").includes("npx github:companygraph/meta-model#v<tooling> check"));
});

test("the judge skill writes its report and reading to dist/judge/, the reading as findings with a fix each", () => {
  const skill = fs.readFileSync(path.join(here, "..", "agents/claude/skills/companygraph-judge/SKILL.md"), "utf8");
  assert.match(skill, /dist\/judge\/judge-<YYYY-MM-DD-HHMM>\.txt/, "the raw report goes to dist/, where every skill writes what is not committed");
  assert.match(skill, /dist\/judge\/judge-<YYYY-MM-DD-HHMM>-read\.md/, "and the reading beside it");
  assert.match(skill, /git check-ignore -q dist\/judge\//, "it checks dist/ is ignored before anything is sent");
  assert.doesNotMatch(skill, /outside the repository|folder that holds the instance/, "nothing is written outside the repository");
  for (const part of ["## Findings", "## False flags", "## Not checked"]) assert.ok(skill.includes(part), `the report has ${part}`);
  assert.match(skill, /proposed fix/i);
  assert.match(skill, /Change no entry/);
  assert.match(skill, /forecast cost/, "the question names what a run will cost");
  assert.match(skill, /`sent:` line/, "the reading names what the run cost");
});

test("the judge skill reads judge/known.md before the flags and proposes rows only on the owner's word", () => {
  const skill = fs.readFileSync(path.join(here, "..", "agents/claude/skills/companygraph-judge/SKILL.md"), "utf8");
  assert.match(skill, /judge\/known\.md/);
  for (const part of ["## Known", "## Proposed for known"]) assert.ok(skill.includes(part), `the reading has ${part}`);
  assert.ok(skill.includes("| Entity | Owner | Rule | Verdict | Why | Seat | Profile | Date | Hash |"), "a proposed row has the file's columns");
  assert.match(skill, /one batch/, "the confirmed false flags are proposed as one batch");
  assert.match(skill, /superseding decision/, "a finding on a standing decision says how it is fixed");
  assert.match(skill, /never compute/i, "the hash is copied from the report, never computed");
  assert.match(skill, /on the owner's word/i);
  assert.match(skill, /one per flagged page/, "an accepted finding is proposed as one row per flagged page");
  assert.match(skill, /did not raise/, "a lapsed row whose flag did not come back is proposed for removal");
});

// A release walk ships what is in the package folder, and a package folder in the npx cache is
// not pristine: Python leaves __pycache__ beside a skill's script it compiled, macOS drops a
// .DS_Store, and the three instances took two .pyc files into their manifests at 0.50.0 that
// way. The walk skips what no release ships, so an instance never records a file it did not get.
test("init ships no __pycache__ or .DS_Store that sits beside the release's skills", () => {
  const skillDir = path.join(here, "..", "agents/claude/skills/companygraph-export");
  const cache = path.join(skillDir, "__pycache__");
  const store = path.join(skillDir, ".DS_Store");
  fs.mkdirSync(cache, { recursive: true });
  fs.writeFileSync(path.join(cache, "build.cpython-314.pyc"), "not python");
  fs.writeFileSync(store, "not a file a release ships");
  try {
    const root = temp();
    run(["init", root, "--name", "Acme", "--agent", "claude"]);
    assert.ok(!fs.existsSync(path.join(root, ".claude/skills/companygraph-export/__pycache__")), "no __pycache__ was written");
    assert.ok(!fs.existsSync(path.join(root, ".claude/skills/companygraph-export/.DS_Store")), "no .DS_Store was written");
    const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
    assert.ok(!Object.keys(manifest.files).some((key) => key.includes("__pycache__") || key.endsWith(".DS_Store")), "the manifest names neither");
    const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    fs.rmSync(cache, { recursive: true, force: true });
    fs.rmSync(store, { force: true });
  }
});

test("check fails on a skill edited inside the instance, as on edited core", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.appendFileSync(path.join(root, ".claude/skills/companygraph-validate/SKILL.md"), "\nedited\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/skills\/companygraph-validate\/SKILL\.md: not as the tooling wrote it/);
});

test("check fails on the company skill edited inside the instance, the one an operator is most tempted to edit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.appendFileSync(path.join(root, ".claude/skills/companygraph-company/SKILL.md"), "\n10. Also read the blog.\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/skills\/companygraph-company\/SKILL\.md: not as the tooling wrote it/);
});

test("upgrade gives no skills to an instance init did not give them to, and leaves its own alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // An instance made by hand: its manifest records core alone, and it keeps a skill of its own
  // under a name the tooling also uses.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const key of Object.keys(manifest.files)) if (key.startsWith(".claude/")) delete manifest.files[key];
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  manifest.core.version = "0.1.0";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, ".claude/skills/companygraph-export"), { recursive: true });
  const own = path.join(root, ".claude/skills/companygraph-validate/SKILL.md");
  fs.writeFileSync(own, "# The instance's own validate\n");

  run(["upgrade", root]);
  assert.equal(fs.readFileSync(own, "utf8"), "# The instance's own validate\n");
  assert.ok(!fs.existsSync(path.join(root, ".claude/skills/companygraph-export")));
  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(!Object.keys(moved.files).some((key) => key.startsWith(".claude/")));
});

// companygraph/mental-model is this case: made by init before the skills existed, its manifest
// records none and it holds none, and an upgrade gives it every one.
// The three live instances were this case at 0.50.0: a manifest recording the skills a release
// before this one wrote, and none of the folders a later release added. The upgrade fills them in.
test("upgrade gives an instance that records some skills the ones a later release added", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const gone of ["companygraph-company", "companygraph-consent"]) {
    fs.rmSync(path.join(root, ".claude/skills", gone), { recursive: true });
    for (const key of Object.keys(manifest.files)) if (key.startsWith(`.claude/skills/${gone}/`)) delete manifest.files[key];
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  assert.ok(Object.keys(manifest.files).some((key) => key.startsWith(".claude/skills/companygraph-validate/")), "the fixture still records the older skills");
  run(["upgrade", root]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.ok(moved.files[".claude/skills/companygraph-company/SKILL.md"], "the manifest records the added skill");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});

test("upgrade gives the skills to an instance that records none and holds none, and check passes after", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  for (const key of Object.keys(manifest.files)) if (key.startsWith(".claude/")) delete manifest.files[key];
  manifest.tooling = "0.1.0";
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.rmSync(path.join(root, ".claude"), { recursive: true });

  const said = run(["upgrade", root]);
  assert.match(said, /mechanical checks pass/);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const moved = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  assert.equal(moved.files[".claude/skills/companygraph-validate/SKILL.md"], sha256(fs.readFileSync(path.join(root, ".claude/skills/companygraph-validate/SKILL.md"), "utf8")));
});

test("upgrade refuses a skill of the instance's own under a name it would write, and --force takes it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // The release ships a skill file this instance's manifest never recorded, and the instance
  // holds a file of its own at that path.
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  delete manifest.files[".claude/skills/companygraph-surface/facts.py"];
  const older = "# Conventions\n\nAs an older release shipped it.\n";
  fs.writeFileSync(path.join(root, "meta/core/CONVENTIONS.md"), older);
  manifest.files["meta/core/CONVENTIONS.md"] = sha256(older);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const facts = path.join(root, ".claude/skills/companygraph-surface/facts.py");
  fs.writeFileSync(facts, "# the instance's own\n");

  assert.throws(() => run(["upgrade", root], { stdio: "pipe" }), /did not write them[\s\S]*companygraph-surface\/facts\.py/);
  assert.equal(fs.readFileSync(facts, "utf8"), "# the instance's own\n");
  const said = run(["upgrade", root, "--force"]);
  assert.match(said, /overwritten, as --force asked: .*facts\.py/);
  assert.equal(fs.readFileSync(facts, "utf8"), fs.readFileSync(path.join(here, "..", "agents/claude/skills/companygraph-surface/facts.py"), "utf8"));
});

// The export skill's scripts are ported from the reference instance, where they only ever ran
// over one model; here they run over the smallest instance `init` makes, with one entity added,
// and over an instance whose units sit somewhere other than meta/.
for (const schemas of ["meta", "schemas"])
  test(`the export skill builds and verifies an instance init made, its units under ${schemas}/`, () => {
    const root = path.join(temp(), "acme");
    run(["init", root, "--name", "Acme", "--agent", "claude", "--schemas", schemas]);
    fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\n> A company, described.\n");
    fs.writeFileSync(path.join(root, "model/values/candor.md"), "---\nsource: Local\n---\n\n# Candor\n\n> Say it.\n");
    const build = spawnSync("python3", [".claude/skills/companygraph-export/build.py"], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const verify = spawnSync("python3", [".claude/skills/companygraph-export/verify.py"], { cwd: root, encoding: "utf8" });
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    assert.match(verify.stdout, /PASS .*zip agrees/);
    assert.ok(fs.existsSync(path.join(root, "dist/acme-skill.zip")), "a folder that already names the identity is not said twice");
    assert.doesNotMatch(build.stdout, /missing/, "init gave the bundle its reading guide");
    const shipped = fs.readFileSync(path.join(root, "dist/acme-gemini-notebook/AGENTS.md"), "utf8");
    assert.match(shipped, /^# Acme — the model\n/);
    assert.doesNotMatch(shipped, /\{\{/, "every token was counted");
    const facts = spawnSync("python3", [".claude/skills/companygraph-surface/facts.py"], { cwd: root, encoding: "utf8" });
    assert.equal(facts.status, 0, facts.stdout + facts.stderr);
  });

// Every instance `init` writes for itself sits in a folder called mental-model, and an account
// holds one skill per name, so the skill is named for the identity first. The verifier makes the
// name a second time, and `zip agrees` is what says the two made the same one.
test("the exported skill is named for the identity and then the folder", () => {
  const root = path.join(temp(), "mental-model");
  run(["init", root, "--name", "Acme Zürich", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\n> A company, described.\n");
  const build = spawnSync("python3", [".claude/skills/companygraph-export/build.py"], { cwd: root, encoding: "utf8" });
  assert.equal(build.status, 0, build.stdout + build.stderr);
  assert.ok(fs.existsSync(path.join(root, "dist/mental-model-gemini-notebook")), "the bundle keeps the folder's name");
  const verify = spawnSync("python3", [".claude/skills/companygraph-export/verify.py"], { cwd: root, encoding: "utf8" });
  assert.equal(verify.status, 0, verify.stdout + verify.stderr);
  assert.match(verify.stdout, /PASS .*zip agrees/);
  // Bytes to stdout, since Windows' text-mode print would turn every newline into CRLF.
  const read = "import sys, zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('acme-zurich-mental-model/SKILL.md'))";
  const skill = spawnSync("python3", ["-c", read, "dist/acme-zurich-mental-model-skill.zip"], { cwd: root, encoding: "utf8" });
  assert.equal(skill.status, 0, skill.stderr);
  assert.match(skill.stdout, /^---\nname: acme-zurich-mental-model\n/);
  assert.match(skill.stdout, /\n# acme-zurich-mental-model\n/);
});

// An agent holding the skill and a server serving the same model can only tell which is older
// when both name a commit. Outside git there is none to name, and a build over uncommitted files
// says so rather than naming a commit that does not hold what it read.
test("the exported skill names the commit it was built from", () => {
  const root = path.join(temp(), "acme");
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "README.md"), "# Acme\n\n> A company, described.\n");
  const read = "import sys, zipfile; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('acme/SKILL.md'))";
  const skill = () => {
    const build = spawnSync("python3", [".claude/skills/companygraph-export/build.py"], { cwd: root, encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    return spawnSync("python3", ["-c", read, "dist/acme-skill.zip"], { cwd: root, encoding: "utf8" }).stdout;
  };
  assert.doesNotMatch(skill(), /Built from commit/, "outside git there is no commit to name");

  const git = (...args) => spawnSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd: root, encoding: "utf8" });
  initRepository(root);
  fs.writeFileSync(path.join(root, ".gitignore"), "dist/\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const sha = git("rev-parse", "HEAD").stdout.trim();
  assert.match(sha, /^[0-9a-f]{40}$/);
  assert.match(skill(), new RegExp(`Built from commit \`${sha}\`; a server`));

  fs.writeFileSync(path.join(root, "model/values/candor.md"), "---\nsource: Local\n---\n\n# Candor\n\n> Say it.\n");
  assert.match(skill(), new RegExp(`Built from commit \`${sha}\`, with changes not yet committed;`));
});

// The command is the reader every instance's CI runs, and it has a walker of its own. An image
// read there as text reaches the check corrupted, and no suite that feeds the check a map would
// see it, so this goes through the command: a real PNG beside the profile that names it.
test("check reads an image as bytes: a named PNG passes, and the same bytes named .jpg fail by name", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const png = fs.readFileSync(path.join(here, "..", "example/model/profiles/ai-agent/ai-agent.png"));
  const dir = path.join(root, "model/profiles/mira");
  fs.mkdirSync(path.join(dir, "experiences"), { recursive: true });
  const page = (image) => `---\nsource: Local\nnature: human\nimage: ${image}\n---\n\n# Mira\n\n> A person.\n`;
  fs.writeFileSync(path.join(dir, "mira.md"), page("mira.png"));
  fs.writeFileSync(path.join(dir, "mira.png"), png);
  const passing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.doesNotMatch(passing.stdout + passing.stderr, /mira\.png/);

  fs.renameSync(path.join(dir, "mira.png"), path.join(dir, "mira.jpg"));
  fs.writeFileSync(path.join(dir, "mira.md"), page("mira.jpg"));
  const failing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.match(failing.stdout + failing.stderr, /mira\.jpg: is a PNG named as a JPEG \(R9\)/);
  assert.equal(failing.status, 1);
});

test("the instance workflow checks a pull request's commits, over the whole history", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/instance-check.yml"), "utf8");
  assert.match(yml, /fetch-depth: 0/);
  assert.match(yml, /if: github\.event_name == 'pull_request'/);
  assert.match(yml, /companygraph\.mjs commits \. --range "\$\{\{ github\.event\.pull_request\.base\.sha \}\}\.\.\$\{\{ github\.event\.pull_request\.head\.sha \}\}"/);
});

test("the menu offers the report", () => {
  const dir = temp();
  initRepository(dir);
  run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  // The menu picks by number, and the report's entry is read off the menu rather than assumed.
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  const pick = listed.match(/(\d+)\S*\s+Report by seat/)[1];
  const out = spawnSync(process.execPath, [cli, "menu"], { input: `${pick}\n${dir}\n`, encoding: "utf8" });
  assert.match(out.stdout, /Commits by seat in /);
});

test("the menu offers adopt and the pin report after the report by seat, and keeps the first five where they were", () => {
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  assert.match(listed, /1\S*\s+Make a model/);
  assert.match(listed, /5\S*\s+Report by seat/);
  assert.match(listed, /6\S*\s+Hold a repository/);
  assert.match(listed, /7\S*\s+Report pins/);
  const root = temp();
  const out = spawnSync(process.execPath, [cli, "menu"], { input: `6\n${root}\n`, encoding: "utf8" });
  assert.match(out.stdout, /adopted/);
});

test("id prints one fresh UUID version 7", () => {
  assert.match(run(["id"]).trim(), /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("ids --backfill stamps an instance's pages with their first commit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  // init writes ids from Task 3 on; strip them so this test holds before and after it.
  for (const rel of ["model/identity.md", "model/vision.md", "model/brand.md", "model/sources/local.md"]) {
    const full = path.join(root, rel);
    fs.writeFileSync(full, fs.readFileSync(full, "utf8").replace(/^id: .*\n/m, "").replace(/^---\n---\n\n/, ""));
  }
  fs.rmSync(path.join(root, "model/identifier.md"), { force: true });
  const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...a], { cwd: root });
  initRepository(root);
  g("add", "-A");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "commit", "-qm", "first"], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-29T09:57:08+02:00" },
  });
  run(["ids", root, "--backfill"]);
  const id = fs.readFileSync(path.join(root, "model/identity.md"), "utf8").match(/^id: (.+)$/m)[1];
  assert.equal(parseInt(id.replace(/-/g, "").slice(0, 12), 16), Date.parse("2026-08-29T07:57:08Z"));
  assert.ok(fs.existsSync(path.join(root, "model/identifier.md")));
});

// The spec: under a pattern format, the instance makes its own ids, and the tooling only checks
// them. A backfill that stamped UUIDv7 ids over that declaration anyway would leave the instance
// with two id formats at once, so it refuses whole, and no page is touched.
test("ids --backfill refuses whole when model/identifier.md declares a pattern", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const identity = path.join(root, "model/identity.md");
  fs.writeFileSync(identity, fs.readFileSync(identity, "utf8").replace(/^id: .*\n/m, ""));
  const before = fs.readFileSync(identity, "utf8");
  fs.writeFileSync(
    path.join(root, "model/identifier.md"),
    "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\nformat: pattern\npattern: ^E-[0-9]{4,}$\n---\n\n# Entity id\n",
  );
  const said = spawnSync(process.execPath, [cli, "ids", root, "--backfill"], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/identifier\.md declares a pattern; the tooling makes only UUID version 7 \(R18\)/);
  assert.equal(fs.readFileSync(identity, "utf8"), before);
});

// A format neither `uuidv7` nor `pattern` is a declaration the tooling cannot read, refused the
// same way and for the same reason as a declared pattern: stamping ids past it could write ids
// no later check would accept, so the whole backfill refuses and no page is touched.
test("ids --backfill refuses whole when model/identifier.md declares an unreadable format", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const identity = path.join(root, "model/identity.md");
  fs.writeFileSync(identity, fs.readFileSync(identity, "utf8").replace(/^id: .*\n/m, ""));
  const before = fs.readFileSync(identity, "utf8");
  fs.writeFileSync(
    path.join(root, "model/identifier.md"),
    "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\nformat: serial\n---\n\n# Entity id\n",
  );
  const said = spawnSync(process.execPath, [cli, "ids", root, "--backfill"], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/identifier\.md: `format` is "serial"; it is `uuidv7` or `pattern` \(R18\)/);
  assert.equal(fs.readFileSync(identity, "utf8"), before);
});

test("ids --range refuses a commit that changed an id, across a rename", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  g("mv", "model/vision.md", "model/outlook.md");
  const renamed = path.join(root, "model/outlook.md");
  const text = fs.readFileSync(renamed, "utf8").replace(/^id: .*$/m, "id: 01a04c85-bc20-7092-a266-845d81173e9f");
  fs.writeFileSync(renamed, text);
  g("commit", "-qam", "second", "--no-verify");
  const head = g("rev-parse", "HEAD");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${head}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /model\/outlook\.md: `id` is "01a04c85-bc20-7092-a266-845d81173e9f"/);
  assert.match(said.stderr, /\(then model\/vision\.md\)/);
  assert.match(said.stderr, new RegExp(`before this change \\(${base.slice(0, 7)}\\)`), "the base is named short, as git names a commit to a reader");
});

// Not an instance is a run that could not happen at all, not a refusal, so it stays 1 where a
// `--range` or `--backfill` refusal is 3.
test("ids refuses a folder that is not an instance, and says so", () => {
  const said = spawnSync(process.execPath, [cli, "ids", temp(), "--backfill"], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /is not an instance: it has no \.companygraph\/manifest\.json beside a model\/ folder/);
});

// A missing flag is a run that could not happen, not a refusal, so it stays 1.
test("ids with neither --backfill nor --range refuses, naming both", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const said = spawnSync(process.execPath, [cli, "ids", root], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /✗ ids needs --backfill or --range <a>\.\.<b>/);
});

// A three-dot range asks git for the change since the merge base, and split on ".." it read its
// head as ".<head>", which git then failed on. It is refused by name, as is a range with no dots.
// A malformed range is a run that could not happen, not a refusal, so it stays 1.
test("ids --range refuses a three-dot range and a range without two dots", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  for (const range of ["main...HEAD", "HEAD"]) {
    const said = spawnSync(process.execPath, [cli, "ids", root, "--range", range], { encoding: "utf8" });
    assert.equal(said.status, 1, range);
    assert.match(said.stderr, /✗ --range takes <a>\.\.<b>, two dots between two commits/, range);
  }
});

// A range shaped like <a>..<b> but naming a commit git does not have is a git failure, not a
// refusal: it cannot run at all, so it exits 1, the same as a malformed range.
test("ids --range with a commit that does not exist exits 1", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const missing = "0000000000000000000000000000000000000000";
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${missing}..HEAD`], { encoding: "utf8" });
  assert.equal(said.status, 1);
});

// A folder that holds core/ and is not an instance — this repository — is stamped and ranged over
// its schemas, as an instance is over its pages.
const coreFolder = () => {
  const root = temp();
  fs.mkdirSync(path.join(root, "core"));
  fs.writeFileSync(path.join(root, "core/CONVENTIONS.md"), "# Conventions\n");
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "# Skill Schema\n\n> A skill.\n");
  return root;
};

test("ids --backfill on a folder that holds core stamps its schemas with their first commit", () => {
  const root = coreFolder();
  const g = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", ...a], { cwd: root });
  initRepository(root);
  g("add", "-A");
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t.invalid", "commit", "-qm", "first", "--no-verify"], {
    cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: "2026-08-23T10:00:00+02:00" },
  });
  run(["ids", root, "--backfill"]);
  const text = fs.readFileSync(path.join(root, "core/skill-schema.md"), "utf8");
  const id = text.match(/^id: (.+)$/m)[1];
  assert.equal(parseInt(id.replace(/-/g, "").slice(0, 12), 16), Date.parse("2026-08-23T08:00:00Z"));
  assert.equal(fs.readFileSync(path.join(root, "core/CONVENTIONS.md"), "utf8"), "# Conventions\n");
});

test("ids --range on a folder that holds core refuses a commit that changed a schema's id", () => {
  const root = coreFolder();
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "---\nid: 0198f2a4-6c1e-7b3d-9a52-3e8f1c7d4b60\n---\n\n# Skill Schema\n");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\n---\n\n# Skill Schema\n");
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /core\/skill-schema\.md: `id` is "01a04c85-bc20-7092-a266-845d81173e9f"/);
});

// R20: the manifest names the packs an instance took, and check refuses one it does not ship.
test("a manifest that takes a pack this checker does not ship is refused by name", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, packs: ["cooking"] }));
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /takes the pack cooking, and this checker ships software/);
});

test("an upgrade with --core is refused for an instance that lists a pack, and for --pack, before anything is fetched", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const listed = spawnSync(process.execPath, [cli, "upgrade", root, "--core", "v0.0.0-unreachable"], { encoding: "utf8" });
  assert.equal(listed.status, 1);
  assert.match(listed.stderr, /takes the pack software, and --core fetches another release's core without it/);
  const plain = temp();
  run(["init", plain, "--name", "Acme", "--agent", "claude"]);
  const added = spawnSync(process.execPath, [cli, "upgrade", plain, "--pack", "software", "--core", "v0.0.0-unreachable"], { encoding: "utf8" });
  assert.equal(added.status, 1);
  assert.match(added.stderr, /takes the pack software, and --core fetches another release's core without it/);
});

test("upgrade --pack names only the packs the instance did not already list", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  assert.doesNotMatch(run(["upgrade", root, "--pack", "software"]), /packs: software/);
});

test("init --pack organization vendors the pack, and the instance it writes passes check", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "organization"]);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  assert.deepEqual(manifest.packs, ["organization"]);
  for (const n of ["group", "group-kind", "job"]) assert.ok(fs.existsSync(path.join(root, "meta/organization", `${n}-schema.md`)), n);
  assert.doesNotThrow(() => run(["check", root]));
});

// An instance that took a pack reads the pack's schemas wherever the history commands read the
// model: a bounded context's page sits in a folder only the pack's schema declares, and without
// them `commits` and `seats` met R13 on it, so the instance's own pull-request check went red.
test("commits and seats read an instance that took the software pack and wrote a bounded context", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root);
  const page = path.join(root, "model/bounded-contexts/ordering/ordering.md");
  fs.mkdirSync(path.dirname(page), { recursive: true });
  fs.writeFileSync(
    page,
    "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\nsource: Local\nclassification: core\n---\n\n# Ordering\n\n> Takes an order and leaves payment to Billing.\n\n## Responsibilities\n\n- Accept an order\n",
  );
  g("add", "-A");
  g("commit", "-qm", "Add the ordering context", "--no-verify");
  const message = path.join(root, "message.txt");
  fs.writeFileSync(message, "Add a thing\n");
  const commits = spawnSync(process.execPath, [cli, "commits", root, "--message", message], { encoding: "utf8", env });
  assert.equal(commits.status, 0, commits.stdout + commits.stderr);
  const seats = spawnSync(process.execPath, [cli, "seats", root], { encoding: "utf8", env });
  assert.equal(seats.status, 0, seats.stdout + seats.stderr);
});

test("an instance init writes is in the one form, and check says so", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.match(run(["form", root]), /in the one form/);
  assert.match(run(["check", root]), /in the one form/);
});

test("check fails on Markdown out of the form, names the line, and form --fix puts it right", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.writeFileSync(path.join(root, "NOTES.md"), "# Notes\n\nOne paragraph\nthat wraps.\n");
  const failed = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /NOTES\.md:3: paragraph-on-one-line/);
  assert.match(failed.stderr, /form .* --fix/);
  run(["form", root, "--fix"]);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);
});

test("the form check leaves out what the manifest excludes", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  fs.mkdirSync(path.join(root, "dist"));
  fs.writeFileSync(path.join(root, "dist/out.md"), "# Out\n\nOne paragraph\nthat wraps.\n");
  assert.equal(spawnSync(process.execPath, [cli, "form", root], { encoding: "utf8" }).status, 0);
});

test("form refuses where the manifest names another release, as the checker does", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  const said = spawnSync(process.execPath, [cli, "form", root], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /names 0\.0\.1/);
});

test("form --fix writes the form where the manifest names another release, which is the remedy upgrade names", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  fs.writeFileSync(path.join(root, "NOTES.md"), "# Notes\n\nOne paragraph\nthat wraps.\n");
  const stopped = spawnSync(process.execPath, [cli, "upgrade", root], { encoding: "utf8" });
  assert.equal(stopped.status, 1);
  assert.match(stopped.stderr, /form .* --fix/);
  const fixed = spawnSync(process.execPath, [cli, "form", root, "--fix"], { encoding: "utf8" });
  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
  assert.equal(fs.readFileSync(path.join(root, "NOTES.md"), "utf8"), "# Notes\n\nOne paragraph that wraps.\n");
  const moved = spawnSync(process.execPath, [cli, "upgrade", root], { encoding: "utf8" });
  assert.equal(moved.status, 0, moved.stdout + moved.stderr);
  assert.notEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, "0.0.1");
});

test("check says a manifest naming another release once, and does not run the form after it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  const said = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.equal(said.stderr.match(/names 0\.0\.1/g)?.length, 1, said.stderr);
});

test("form and check say a manifest that is not JSON with the ✗ prefix, and exit 1", () => {
  for (const make of [(root) => run(["init", root, "--name", "Acme", "--agent", "claude"]), (root) => run(["adopt", root])]) {
    const root = temp();
    make(root);
    fs.writeFileSync(path.join(root, ".companygraph/manifest.json"), "{ not json");
    for (const command of ["form", "check"]) {
      const said = spawnSync(process.execPath, [cli, command, root], { encoding: "utf8" });
      assert.equal(said.status, 1, command);
      assert.match(said.stderr, /^✗ .*manifest\.json could not be read as JSON/, `${command}: ${said.stderr}`);
    }
  }
});

test("the instance workflow holds the Markdown to the form with the checker it checked out", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/instance-check.yml"), "utf8");
  assert.match(yml, /run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
  // A failing model check does not hide the form's hits.
  assert.match(yml, /if: \$\{\{ !cancelled\(\) \}\}\n\s+run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
});

test("upgrade stops on Markdown out of the form, naming it and moving nothing, and --force moves anyway", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  // An instance a release before this one made: an older tooling, no exclude, no pins.json.
  const older = { ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" };
  delete older.exclude;
  fs.writeFileSync(manifestPath, `${JSON.stringify(older, null, 2)}\n`);
  fs.rmSync(path.join(root, "pins.json"));
  fs.writeFileSync(path.join(root, "NOTES.md"), "# Notes\n\nOne paragraph\nthat wraps.\n");
  const stopped = spawnSync(process.execPath, [cli, "upgrade", root], { encoding: "utf8" });
  assert.equal(stopped.status, 1);
  assert.match(stopped.stderr, /NOTES\.md:3: paragraph-on-one-line/);
  assert.match(stopped.stderr, /--force/);
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, "0.0.1");
  assert.equal(fs.existsSync(path.join(root, "pins.json")), false);
  run(["upgrade", root, "--force"]);
  assert.notEqual(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, "0.0.1");
  assert.ok(fs.existsSync(path.join(root, "pins.json")));
});

test("upgrade leaves a family instance's own pins.json as it is", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const own = `${JSON.stringify({ pins: [{ kind: "conventions", file: "conventions.json", repo: "robertblust/conventions" }], verify: ["npm test"] }, null, 2)}\n`;
  fs.writeFileSync(path.join(root, "pins.json"), own);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), tooling: "0.0.1" }));
  run(["upgrade", root]);
  assert.equal(fs.readFileSync(path.join(root, "pins.json"), "utf8"), own);
});

// The report asks each upstream with git ls-remote; COMPANYGRAPH_REMOTES names a file of fixed
// answers instead, so no test reaches the network.
test("pins reports each pin of a repository and exits 0 when one is behind", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  const remotes = path.join(temp(), "remotes.json");
  fs.writeFileSync(remotes, JSON.stringify({ "companygraph/meta-model": { tags: [`v${version}`, "v999.0.0"], head: null } }));
  const said = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env: { ...process.env, COMPANYGRAPH_REMOTES: remotes } });
  assert.equal(said.status, 0);
  assert.match(said.stdout, /behind\s+core-release companygraph\/meta-model in \.companygraph\/manifest\.json: .* → v999\.0\.0/);
});

test("pins on an adopted repository reports its own tooling pin as current and nothing as unmanaged", () => {
  const root = temp();
  run(["adopt", root]);
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  const remotes = path.join(temp(), "remotes.json");
  fs.writeFileSync(remotes, JSON.stringify({ "companygraph/meta-model": { tags: [`v${version}`], head: null } }));
  const said = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env: { ...process.env, COMPANYGRAPH_REMOTES: remotes } });
  assert.equal(said.status, 0);
  assert.match(said.stdout, /current\s+core-release companygraph\/meta-model in \.companygraph\/manifest\.json/);
  assert.doesNotMatch(said.stdout, /unmanaged/);
});

test("pins exits 1 when pins.json cannot be read or an entry names no line, and moves nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const remotes = path.join(temp(), "remotes.json");
  fs.writeFileSync(remotes, "{}");
  const env = { ...process.env, COMPANYGRAPH_REMOTES: remotes };
  fs.writeFileSync(path.join(root, "pins.json"), JSON.stringify({ pins: [{ kind: "npm-tag", file: "package.json", repo: "acme/design" }] }));
  const missing = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env });
  assert.equal(missing.status, 1);
  assert.match(missing.stdout, /missing\s+npm-tag acme\/design in package\.json/);
  fs.writeFileSync(path.join(root, "pins.json"), "{ not json");
  assert.equal(spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env }).status, 1);
  fs.rmSync(path.join(root, "pins.json"));
  const none = spawnSync(process.execPath, [cli, "pins", root], { encoding: "utf8", env });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /no pins\.json/);
});

test("adopt into an empty folder writes the machinery, and check holds it to the form alone", () => {
  const root = temp();
  initRepository(root);
  const said = run(["adopt", root]);
  assert.match(said, /adopted/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/commit-msg")));
  fs.writeFileSync(path.join(root, "README.md"), "# A site\n\nOne paragraph on one line.\n");
  assert.match(run(["check", root]), /in the one form/);
  fs.writeFileSync(path.join(root, "README.md"), "# A site\n\nOne paragraph\nthat wraps.\n");
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 1);
});

test("adopt into a folder that does not exist yet makes it and writes the machinery", () => {
  const root = path.join(temp(), "a", "site");
  assert.match(run(["adopt", root]), /adopted/);
  for (const rel of [".companygraph/manifest.json", ".companygraph/hooks/commit-msg", ".github/workflows/companygraph.yml", "pins.json"])
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  assert.match(run(["check", root]), /no Markdown file to hold to the form/);
});

test("adopt refuses an instance by name and points at upgrade, writing nothing", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const before = [...filesOf(root).keys()].sort();
  const refused = spawnSync(process.execPath, [cli, "adopt", root], { encoding: "utf8" });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /upgrade/);
  assert.deepEqual([...filesOf(root).keys()].sort(), before);
});

test("upgrade moves an adopted repository's tooling and workflow, and vendors no core into it", () => {
  const root = temp();
  run(["adopt", root]);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ tooling: "0.0.1", exclude: ["dist"] }));
  const workflowPath = path.join(root, ".github/workflows/companygraph.yml");
  fs.writeFileSync(workflowPath, fs.readFileSync(workflowPath, "utf8").replace(/@v[\d.]+/, "@v0.0.1"));
  run(["upgrade", root]);
  const version = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")).version;
  assert.equal(JSON.parse(fs.readFileSync(manifestPath, "utf8")).tooling, version);
  assert.match(fs.readFileSync(workflowPath, "utf8"), new RegExp(`repository-check\\.yml@v${version}`));
  assert.equal(fs.existsSync(path.join(root, "meta")), false);
});

test("the repository workflow holds the Markdown to the form with the checker it checked out", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/repository-check.yml"), "utf8");
  assert.match(yml, /run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
  assert.doesNotMatch(yml, /check-instance/);
});

// A note is printed under `noted:` on a passing run and on a failing one, and never moves the
// exit code: a horizon passes on a date, and failing on it would turn a green default branch red
// overnight.
test("check prints a passed horizon under noted:, on a passing run and a failing one, and exits on the failures alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const dir = path.join(root, "model/strategic-objectives");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "invoices-explain-themselves.md"),
    `---\nid: ${run(["id"]).trim()}\nsource: Local\nadopted: 2020-01\nhorizon: 2020-06\n---\n\n# Invoices explain themselves\n\n> A customer reads why a line is on an invoice without asking.\n\n## What it makes true\n\nNobody calls to ask.\n`);
  const passing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(passing.status, 0, passing.stdout + passing.stderr);
  assert.match(passing.stdout, /^ {2}noted:\n {4}model\/strategic-objectives\/invoices-explain-themselves\.md: `horizon` is 2020-06, which has passed/m);

  fs.writeFileSync(path.join(root, "model/stray.md"), "# Stray\n\n> Nothing.\n");
  const failing = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(failing.status, 1);
  assert.match(failing.stdout, /^ {2}noted:\n {4}model\/strategic-objectives\/invoices-explain-themselves\.md/m);
});

// The range reads the manifest's packs, so a pack page's type is known: a decision rewritten and
// an invariant relabelled are refused beside the id check, and a status moved alone passes.
test("ids --range refuses a decision rewritten and an invariant relabelled, and passes a status moved alone", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const decision = (status, by) => `---\nsource: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: ${status}\nby: ${by}\n---\n\n# Core is vendored\n\n> We vendor core.\n`;
  const aggregate = (label) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| ${label} | A total never changes. |\n`;
  write("model/decisions/2026-core-is-vendored.md", decision("Standing", "Owner"));
  write("model/bounded-contexts/billing/aggregates/invoice.md", aggregate("INV-1"));
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");

  write("model/decisions/2026-core-is-vendored.md", decision("Revised", "Owner"));
  g("commit", "-qam", "second", "--no-verify");
  const moved = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(moved.status, 0, moved.stderr);
  assert.match(moved.stdout, /no page kept as written was rewritten or removed/);

  write("model/decisions/2026-core-is-vendored.md", decision("Revised", "Architect"));
  write("model/bounded-contexts/billing/aggregates/invoice.md", aggregate("INV-9"));
  g("commit", "-qam", "third", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: `by` changed since [0-9a-f]{7}/);
  assert.match(said.stderr, /✗ model\/bounded-contexts\/billing\/aggregates\/invoice\.md: "INV-9" under ## Invariants carries what "INV-1" carried/);
});

// A name a decision carries follows the entity it names: the range reads the decision schema the
// instance vendored and the model at both ends, so an objective renamed with its id kept, and the
// decision's `serves` moved to the new name, passes, while moving it to another objective fails.
test("ids --range passes a decision's reference following a rename, and refuses one moved elsewhere", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const objective = (id, name) => `---\nid: ${id}\nsource: Local\nadopted: 2026-01\n---\n\n# ${name}\n\n> A statement.\n`;
  const decision = (serves) => `---\nsource: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: Standing\nby: Owner\nserves:\n  - ${serves}\n---\n\n# Core is vendored\n\n> We vendor core.\n`;
  const [o1, o2] = [run(["id"]).trim(), run(["id"]).trim()];
  write("model/strategic-objectives/old.md", objective(o1, "Old"));
  write("model/strategic-objectives/other.md", objective(o2, "Other"));
  write("model/decisions/2026-core-is-vendored.md", decision("Old"));
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");

  g("mv", "model/strategic-objectives/old.md", "model/strategic-objectives/new.md");
  write("model/strategic-objectives/new.md", objective(o1, "New"));
  write("model/decisions/2026-core-is-vendored.md", decision("New"));
  g("add", "-A"); g("commit", "-qm", "rename", "--no-verify");
  const renamed = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(renamed.status, 0, renamed.stderr);

  write("model/decisions/2026-core-is-vendored.md", decision("Other"));
  g("commit", "-qam", "elsewhere", "--no-verify");
  const moved = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(moved.status, 3);
  assert.match(moved.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: `serves` changed since [0-9a-f]{7}/);
});

test("ids --range refuses a decision deleted in the range", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.mkdirSync(path.join(root, "model/decisions"), { recursive: true });
  fs.writeFileSync(path.join(root, "model/decisions/2026-core-is-vendored.md"), "---\nsource: Local\nstatus: Standing\n---\n\n# Core is vendored\n\n> We vendor core.\n");
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  g("rm", "-q", "model/decisions/2026-core-is-vendored.md"); g("commit", "-qm", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: deleted in this change/);
});

// A pull request's range runs from the base branch's tip when the event fired, which on a branch
// behind its base is not where it branched: a decision main added since is not one the branch
// deleted, and a decision the branch did delete still fails from there.
test("ids --range holds a branch behind its base to what the branch did, not to what main did since", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const decision = (title) => `---\nsource: Local\nstatus: Standing\n---\n\n# ${title}\n\n> We decided it.\n`;
  write("model/decisions/2026-core-is-vendored.md", decision("Core is vendored"));
  initRepository(root, ["-b", "main"]); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  g("checkout", "-q", "-b", "topic");
  write("model/notes.md", "# Notes\n");
  g("add", "-A"); g("commit", "-qm", "on the branch", "--no-verify");
  g("checkout", "-q", "main");
  write("model/decisions/2026-packs-are-units.md", decision("Packs are units"));
  g("add", "-A"); g("commit", "-qm", "on main", "--no-verify");
  const range = () => `${g("rev-parse", "main")}..${g("rev-parse", "topic")}`;
  const behind = spawnSync(process.execPath, [cli, "ids", root, "--range", range()], { encoding: "utf8" });
  assert.equal(behind.status, 0, behind.stderr);

  g("checkout", "-q", "topic");
  g("rm", "-q", "model/decisions/2026-core-is-vendored.md"); g("commit", "-qm", "delete", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", range()], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: deleted in this change/);
  assert.doesNotMatch(said.stderr, /packs-are-units/);
});

// A range that cannot run says why in one line and exits 1, as a malformed range does: a manifest
// that is not JSON, and two ends with no commit in common, which a shallow clone also shows.
test("ids --range with a manifest that is not JSON says so in one line and exits 1", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  fs.writeFileSync(path.join(root, ".companygraph/manifest.json"), "{ not json");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", "HEAD..HEAD"], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /^✗ .*\.companygraph[\\/]manifest\.json could not be read as JSON/);
  assert.equal(said.stderr.trim().split("\n").length, 1, said.stderr);
});

test("ids --range whose ends share no commit names the cause in one line and exits 1", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  initRepository(root, ["-b", "main"]); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  g("checkout", "-q", "--orphan", "other"); g("commit", "-qm", "unrelated", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${g("rev-parse", "main")}..${g("rev-parse", "other")}`], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /^✗ .*have no commit in common here.*fetch its full history/);
  assert.equal(said.stderr.trim().split("\n").length, 1, said.stderr);
});

// A decision and a label are compared after both sides are put in the family's Markdown form, so
// a change the form would make anyway is no rewrite. A release that reshapes what the decision
// schema or a label-declaring schema asks of a page makes the instance change those pages in the
// same range, so a range that changes the vendored schema governing a check is not held to that
// check, and says so in one line; any other upgrade, re-pin or resync is held as always.
const upgradeRepo = () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const decision = (by, list = "- one\n- two\n\nA consequence on one line.") => `---\nsource: Local\ndecided: 2026-08-25\nkind: Architecture\nstatus: Standing\nby: ${by}\n---\n\n# Core is vendored\n\n> We vendor core.\n\n## Consequences\n\n${list}\n`;
  const aggregate = (label) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n| ${label} | A total never changes. |\n`;
  write("model/decisions/2026-core-is-vendored.md", decision("Owner"));
  write("model/bounded-contexts/billing/aggregates/invoice.md", aggregate("INV-1"));
  write("conventions.json", "{}\n");
  initRepository(root, ["-b", "main"]); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  g("checkout", "-q", "-b", "topic");
  const commit = () => { g("add", "-A"); g("commit", "-qm", "change", "--no-verify"); };
  const ids = () => spawnSync(process.execPath, [cli, "ids", root, "--range", `${g("rev-parse", "main")}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  const DECISION = "model/decisions/2026-core-is-vendored.md", AGGREGATE = "model/bounded-contexts/billing/aggregates/invoice.md";
  return { root, g, write, decision, aggregate, commit, ids, DECISION, AGGREGATE };
};
// What a release does to a vendored unit: its schema changes and its manifest's version moves.
const release = (root, unit, schema) => {
  fs.appendFileSync(path.join(root, `meta/${unit}/${schema}-schema.md`), "\nA sentence a release added.\n");
  const at = path.join(root, `meta/${unit}/manifest.json`);
  fs.writeFileSync(at, JSON.stringify({ ...JSON.parse(fs.readFileSync(at, "utf8")), version: "99.0.0" }) + "\n");
};
const DECISION_LINE = /^ {2}the decision schema changed in this range: decision text not held$/m;
const LABEL_LINE = /^ {2}the aggregate schema changed in this range: aggregate label text not held$/m;

test("ids --range passes a decision whose two sides differ only where the Markdown form makes them one", () => {
  const { write, decision, commit, ids, DECISION } = upgradeRepo();
  // Another list marker, a paragraph wrapped over two lines: as written, each would read as a rewrite.
  write(DECISION, decision("Owner", "* one\n* two\n\nA consequence\non one line."));
  commit();
  const said = ids();
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /no page kept as written was rewritten or removed/);
  assert.doesNotMatch(said.stdout, /not held|could not be applied/);
});

test("ids --range still refuses a decision with a word changed, after the form", () => {
  const { write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Owner", "* one\n* three\n\nA consequence on one line."));
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: its text changed since [0-9a-f]{7}/);
});

test("ids --range over a change to the vendored decision schema does not hold a decision rewritten in it, and says so once", () => {
  const { root, write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  release(root, "core", "decision");
  commit();
  const said = ids();
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, DECISION_LINE);
  assert.equal(said.stdout.match(/not held/g)?.length, 1, said.stdout);
});

// A hand edit of the vendored schema is no release: with the unit's version where it was, the
// decision rewritten is refused as it would be anywhere.
test("ids --range over a hand edit of the vendored decision schema, its version unmoved, still refuses a decision rewritten in it", () => {
  const { root, write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  fs.appendFileSync(path.join(root, "meta/core/decision-schema.md"), "\nA sentence a hand added.\n");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /`by` changed since/);
  assert.doesNotMatch(said.stdout, /not held/);
});

test("ids --range over a version moved with the schema file untouched still refuses a decision rewritten in it", () => {
  const { root, write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  const at = path.join(root, "meta/core/manifest.json");
  fs.writeFileSync(at, JSON.stringify({ ...JSON.parse(fs.readFileSync(at, "utf8")), version: "99.0.0" }) + "\n");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
});

test("ids --range over a decision schema change still holds a label moved in the same range", () => {
  const { root, write, decision, aggregate, commit, ids, DECISION, AGGREGATE } = upgradeRepo();
  write(DECISION, decision("Architect"));
  write(AGGREGATE, aggregate("INV-9"));
  release(root, "core", "decision");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /"INV-9" under ## Invariants carries what "INV-1" carried/);
  assert.doesNotMatch(said.stderr, /2026-core-is-vendored/);
});

test("ids --range over a change to the aggregate schema does not hold a label moved in it", () => {
  const { root, write, aggregate, commit, ids, AGGREGATE } = upgradeRepo();
  write(AGGREGATE, aggregate("INV-9"));
  release(root, "software", "aggregate");
  commit();
  const said = ids();
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, LABEL_LINE);
  assert.doesNotMatch(said.stdout, DECISION_LINE);
});

test("ids --range over another change to the vendored core still refuses a decision rewritten in it", () => {
  const { root, write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  fs.appendFileSync(path.join(root, "meta/core/manifest.json"), "\n");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /✗ model\/decisions\/2026-core-is-vendored\.md: `by` changed since/);
  assert.doesNotMatch(said.stdout, /not held/);
});

test("ids --range over a conventions resync still refuses a decision rewritten in it", () => {
  const { write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  write("conventions.json", "{ \"version\": \"1.0.0\" }\n");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /`by` changed since/);
});

test("ids --range over a tooling re-pin in the manifest still refuses a decision rewritten in it", () => {
  const { root, write, decision, commit, ids, DECISION } = upgradeRepo();
  write(DECISION, decision("Architect"));
  const at = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(at, JSON.stringify({ ...JSON.parse(fs.readFileSync(at, "utf8")), tooling: "0.0.1" }, null, 2) + "\n");
  commit();
  const said = ids();
  assert.equal(said.status, 3, said.stdout);
  assert.match(said.stderr, /`by` changed since/);
});

// The decision and label checks compare from where the branch began, so their refusals name that
// commit, and not the base branch's tip the range was given.
test("ids --range on a branch behind main names the merge base in a decision's refusal", () => {
  const { g, write, decision, ids } = upgradeRepo();
  const fork = g("rev-parse", "--short=7", "main");
  write("model/decisions/2026-core-is-vendored.md", decision("Architect"));
  g("add", "-A"); g("commit", "-qm", "rewrite", "--no-verify");
  g("checkout", "-q", "main");
  write("model/notes.md", "# Notes\n");
  g("add", "-A"); g("commit", "-qm", "on main", "--no-verify");
  const tip = g("rev-parse", "--short=7", "main");
  g("checkout", "-q", "topic");
  const said = ids();
  assert.equal(said.status, 3);
  assert.match(said.stderr, new RegExp(`\`by\` changed since ${fork}`));
  assert.doesNotMatch(said.stderr, new RegExp(tip));
});

// A label's history is read across a rename of its page: a label the page carried under its old
// path, and removed, is not used again under its new one.
test("ids --range refuses a label reused after its page was renamed", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  const write = (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };
  const aggregate = (rows) => `---\nsource: Local\nroot: Invoice\n---\n\n# Invoice\n\n> Changed together.\n\n## Invariants\n\n| Label | Invariant |\n| --- | --- |\n${rows.map(([l, t]) => `| ${l} | ${t} |\n`).join("")}`;
  const AGG = "model/bounded-contexts/billing/aggregates";
  write(`${AGG}/invoice.md`, aggregate([["INV-1", "A total never changes."], ["INV-2", "A rule since removed."]]));
  initRepository(root); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  write(`${AGG}/invoice.md`, aggregate([["INV-1", "A total never changes."]]));
  g("commit", "-qam", "removed", "--no-verify");
  g("mv", `${AGG}/invoice.md`, `${AGG}/bill.md`);
  g("commit", "-qm", "renamed", "--no-verify");
  const base = g("rev-parse", "HEAD");
  write(`${AGG}/bill.md`, aggregate([["INV-1", "A total never changes."], ["INV-2", "A new rule."]]));
  g("commit", "-qam", "reused", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3, said.stdout + said.stderr);
  assert.match(said.stderr, /✗ model\/bounded-contexts\/billing\/aggregates\/bill\.md: "INV-2" under ## Invariants was carried by this page before and removed/);
});

test("init --gate git writes the hooks, points git at them, and writes no workflow", () => {
  const root = temp();
  initRepository(root);
  const said = run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  assert.match(said, /pre-commit/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.ok(!fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), ".companygraph/hooks");
  // Windows has no execute bit to set.
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(root, ".companygraph/hooks/pre-commit")).mode & 0o111, 0o111);
});

// The real hooks with the real CLI, end to end and offline: COMPANYGRAPH_CLI points the hooks at
// this checkout, so no npx is asked for the release the manifest names.
test("on the git gate a commit that changes an id is refused, and a commit that leaves ids alone goes through", () => {
  const root = temp();
  const git = (...args) => execFileSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  const commit = (message) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "commit", "-q", "-m", message],
    { cwd: root, encoding: "utf8", env: { ...process.env, COMPANYGRAPH_CLI: cli } });
  initRepository(root, ["-b", "main"]);
  git("config", "init.defaultBranch", "main");
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  git("add", "-A");
  const first = commit("The instance");
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const vision = path.join(root, "model/vision.md");
  const before = fs.readFileSync(vision, "utf8");
  const id = before.match(/^id: (\S+)$/m)[1];
  const moved = id.slice(0, -1) + (id.endsWith("0") ? "1" : "0");
  fs.writeFileSync(vision, before.replace(`id: ${id}`, `id: ${moved}`));
  git("add", "model/vision.md");
  const refused = commit("A new id");
  assert.notEqual(refused.status, 0, refused.stdout + refused.stderr);
  assert.match(refused.stderr, /model\/vision\.md/);
  assert.ok(refused.stderr.includes(id), refused.stderr);
  assert.match(refused.stderr, /nothing was committed/);
  assert.equal(git("log", "--format=%s", "-1"), "The instance\n");
  fs.writeFileSync(vision, before.replace("One paragraph stating", "A paragraph stating"));
  git("add", "model/vision.md");
  const passed = commit("A plainer vision");
  assert.equal(passed.status, 0, passed.stdout + passed.stderr);
  assert.equal(git("log", "--format=%s", "-1"), "A plainer vision\n");
});

// A repository on the git gate with the real hooks and the real CLI, offline: its default branch
// is main, set in its own config, and every commit runs the hooks through COMPANYGRAPH_CLI.
function gatedRepository(make) {
  const root = temp();
  const git = (...args) => execFileSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", ...args], { cwd: root, encoding: "utf8" });
  const commit = (message) => spawnSync("git", ["-c", "user.name=R", "-c", "user.email=r@example.invalid", "commit", "-q", "-m", message],
    { cwd: root, encoding: "utf8", env: { ...process.env, COMPANYGRAPH_CLI: cli } });
  initRepository(root, ["-b", "main"]);
  git("config", "init.defaultBranch", "main");
  run(make(root));
  git("add", "-A");
  const first = commit("The start");
  assert.equal(first.status, 0, first.stdout + first.stderr);
  return { root, git, commit };
}

test("an adopted repository on the git gate, with no model for ids to hold, commits a second time", () => {
  const { root, git, commit } = gatedRepository((root) => ["adopt", root, "--gate", "git"]);
  fs.writeFileSync(path.join(root, "notes.md"), "# Notes\n");
  git("add", "notes.md");
  const second = commit("Some notes");
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.equal(git("log", "--format=%s", "-1"), "Some notes\n");
});

test("adopt on the git gate does not say ids runs, and init does", () => {
  const adopted = temp();
  initRepository(adopted);
  const said = run(["adopt", adopted, "--gate", "git"]);
  assert.match(said, /every commit runs check and pins\.json's verify first/);
  const instance = temp();
  initRepository(instance);
  assert.match(run(["init", instance, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]), /every commit runs check, ids --range and pins\.json's verify first/);
});

test("on a feature branch an id the branch introduced can still be fixed, and on main a committed id cannot change", () => {
  const { root, git, commit } = gatedRepository((root) => ["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  const page = path.join(root, "model/values/candor.md");
  const value = (id) => `---\nid: ${id}\nsource: Local\n---\n\n# Candor\n\n> We say what we see.\n\n## In practice\n\nA review names the fault it found.\n`;
  const first = run(["id"]).trim(), second = run(["id"]).trim();
  git("checkout", "-q", "-b", "candor");
  fs.writeFileSync(page, value(first));
  git("add", "model/values/candor.md");
  const added = commit("Candor");
  assert.equal(added.status, 0, added.stdout + added.stderr);
  fs.writeFileSync(page, value(second));
  git("add", "model/values/candor.md");
  const fixed = commit("Candor's id fixed before it lands");
  assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
  git("checkout", "-q", "main");
  git("merge", "-q", "--ff-only", "candor");
  fs.writeFileSync(page, value(first));
  git("add", "model/values/candor.md");
  const refused = commit("Candor's id moved after it landed");
  assert.notEqual(refused.status, 0, refused.stdout + refused.stderr);
  assert.ok(refused.stderr.includes(second), refused.stderr);
  assert.match(refused.stderr, /nothing was committed/);
});

test("upgrade --dry-run names a gate hook it leaves because it was edited, for an instance and an adopted repository", () => {
  for (const make of [(root) => ["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"], (root) => ["adopt", root, "--gate", "git"]]) {
    const root = temp();
    initRepository(root);
    run(make(root));
    fs.appendFileSync(path.join(root, ".companygraph/hooks/pre-commit"), "# mine\n");
    // Something for the dry run to plan, so it does not stop at nothing to do.
    fs.rmSync(path.join(root, "pins.json"));
    const said = run(["upgrade", root, "--dry-run"]);
    assert.match(said, /write {3}pins\.json/);
    assert.match(said, /not replaced, since it was edited: \.companygraph\/hooks\/pre-commit/);
  }
});

test("a plain upgrade brings a pre-commit hook v0.83.0 wrote to this release", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  const hook = path.join(root, ".companygraph/hooks/pre-commit");
  fs.writeFileSync(hook, PAST_GATE_HOOKS[0]);
  const said = run(["upgrade", root]);
  assert.match(said, /brought to this release: \.companygraph\/hooks\/pre-commit/);
  assert.equal(fs.readFileSync(hook, "utf8"), GATE_HOOK);
  if (process.platform !== "win32") assert.equal(fs.statSync(hook).mode & 0o111, 0o111);
});

test("a plain upgrade leaves an edited pre-commit hook as it is, and says why", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  const hook = path.join(root, ".companygraph/hooks/pre-commit");
  fs.writeFileSync(hook, `${PAST_GATE_HOOKS[0]}# mine\n`);
  const said = run(["upgrade", root]);
  assert.match(said, /not replaced, since it was edited: \.companygraph\/hooks\/pre-commit/);
  assert.equal(fs.readFileSync(hook, "utf8"), `${PAST_GATE_HOOKS[0]}# mine\n`);
});

test("init --gate git in a folder without git is refused, and --gate none says nothing gates it", () => {
  const refused = spawnSync(process.execPath, [cli, "init", temp(), "--name", "Acme", "--agent", "claude", "--gate", "git"], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /not a git repository/);
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude", "--gate", "none"]);
  assert.match(said, /nothing gates this folder/);
  assert.ok(!fs.existsSync(path.join(root, ".companygraph/hooks")));
  assert.ok(!fs.existsSync(path.join(root, ".github")));
});

test("upgrade --gate git moves an instance from the workflow to the hooks", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /removed, since the gate moved: \.github\/workflows\/companygraph\.yml/);
  assert.ok(!fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8")).gate, "git");
});

test("upgrade --gate git leaves a hooks folder of the repository's own in charge, and says so", () => {
  const root = temp();
  initRepository(root);
  run(["adopt", root]);
  execFileSync("git", ["config", "core.hooksPath", "hooks"], { cwd: root });
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /core\.hooksPath is hooks here/);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), "hooks");
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
});

test("upgrade --gate moves an adopted repository to none and back to github, naming what it removed", () => {
  const root = temp();
  initRepository(root);
  run(["adopt", root, "--gate", "git"]);
  const none = run(["upgrade", root, "--gate", "none"]);
  assert.match(none, /removed, since the gate moved: \.companygraph\/hooks\/pre-commit, \.companygraph\/hooks\/pre-merge-commit/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/commit-msg")));
  assert.ok(!fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  run(["upgrade", root, "--gate", "github"]);
  assert.ok(fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
  if (process.platform !== "win32") assert.equal(fs.statSync(path.join(root, ".companygraph/hooks/commit-msg")).mode & 0o111, 0o111);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), ".companygraph/hooks");
  // github is the default, and a manifest on it carries no gate at all.
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8")).gate ?? "github", "github");
});

test("an edited gate hook stops a move by name, and --force removes it and says so", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  fs.appendFileSync(path.join(root, ".companygraph/hooks/pre-commit"), "# mine\n");
  const refused = spawnSync(process.execPath, [cli, "upgrade", root, "--gate", "github"], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /\.companygraph\/hooks\/pre-commit/);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  const said = run(["upgrade", root, "--gate", "github", "--force"]);
  assert.match(said, /removed, as --force asked: \.companygraph\/hooks\/pre-commit$/m);
  // A forced hook is named once, under --force, and not again as an ordinary removal.
  assert.match(said, /removed, since the gate moved: \.companygraph\/hooks\/pre-merge-commit$/m);
  assert.ok(!fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.ok(fs.existsSync(path.join(root, ".github/workflows/companygraph.yml")));
});

// A move onto github from none writes the seat hook, which git ignores until it is executable and
// core.hooksPath names its folder; the move does both, for an instance and an adopted repository.
for (const [kind, make] of [
  ["an instance", (root) => run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "none"])],
  ["an adopted repository", (root) => run(["adopt", root, "--gate", "none"])],
]) {
  test(`upgrade --gate github from none puts the seat hook in use, for ${kind}`, () => {
    const root = temp();
    initRepository(root);
    make(root);
    assert.ok(!fs.existsSync(path.join(root, ".companygraph/hooks/commit-msg")));
    const said = run(["upgrade", root, "--gate", "github"]);
    assert.match(said, /the commit-msg hook is in use/);
    if (process.platform !== "win32") assert.equal(fs.statSync(path.join(root, ".companygraph/hooks/commit-msg")).mode & 0o111, 0o111);
    assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: root, encoding: "utf8" }).trim(), ".companygraph/hooks");
  });
}

test("init --gate git of a folder not made yet is in git when the folder above it is, and refused where it is not", () => {
  const repository = temp();
  initRepository(repository);
  const root = path.join(repository, "acme");
  run(["init", root, "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: repository, encoding: "utf8" }).trim(), "acme/.companygraph/hooks");
  const outside = path.join(temp(), "acme");
  const refused = spawnSync(process.execPath, [cli, "init", outside, "--name", "Acme", "--agent", "claude", "--gate", "git"], { encoding: "utf8" });
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /not a git repository/);
  assert.ok(!fs.existsSync(outside));
});

// AGENTS.md is the instance's own and no upgrade rewrites it, so after a gate move its sentence
// about what checks the repository still names the old gate; the move says so, and quotes the
// sentence init writes for the new one, and a run that moves no gate says nothing of it.
test("upgrade --gate names AGENTS.md's sentence as the instance's to update, quoting the new gate's", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  const before = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /AGENTS\.md is this instance's own and was not rewritten/);
  assert.ok(said.includes("checked on every commit by the pre-commit hook in `.companygraph/hooks/`"), said);
  assert.ok(said.includes("then `ids --range` from where the branch left the default branch"), said);
  assert.equal(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"), before);
  const again = spawnSync(process.execPath, [cli, "upgrade", root, "--gate", "git"], { encoding: "utf8" });
  assert.doesNotMatch(again.stdout, /AGENTS\.md/);
});

test("init --gate git under a hooks folder of the repository's own does not claim every commit runs check", () => {
  const root = temp();
  initRepository(root);
  execFileSync("git", ["config", "core.hooksPath", "hooks"], { cwd: root });
  const said = run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  assert.match(said, /core\.hooksPath is hooks here/);
  assert.doesNotMatch(said, /every commit runs check/);
});

test("adopt says the seat hook lets every commit through on the git gate as on github, and not on none", () => {
  for (const gate of ["github", "git"]) {
    const root = temp();
    initRepository(root);
    assert.match(run(["adopt", root, "--gate", gate]), /lets every commit through/, gate);
  }
  const root = temp();
  initRepository(root);
  assert.doesNotMatch(run(["adopt", root, "--gate", "none"]), /lets every commit through/);
});

// A move to the git gate removes the workflow, so where git does not read the hooks it wrote
// nothing gates the repository at all, and saying only that the hooks are not in use undersells it.
const UNGATED = /nothing gates this repository until git reads these hooks: point core\.hooksPath at \.companygraph\/hooks, or call them from the repository's own hooks/;

test("init and adopt --gate git under a hooks folder of the repository's own warn that nothing gates it", () => {
  for (const make of [(root) => run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]), (root) => run(["adopt", root, "--gate", "git"])]) {
    const root = temp();
    initRepository(root);
    execFileSync("git", ["config", "core.hooksPath", "hooks"], { cwd: root });
    assert.match(make(root), UNGATED);
  }
  // Where git reads them, there is nothing to warn of.
  const read = temp();
  initRepository(read);
  assert.doesNotMatch(run(["init", read, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]), /nothing gates/);
});

test("upgrade --gate git under a hooks folder of the repository's own warns that nothing gates it, since the workflow is gone", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude"]);
  execFileSync("git", ["config", "core.hooksPath", "hooks"], { cwd: root });
  const said = run(["upgrade", root, "--gate", "git"]);
  assert.match(said, /removed, since the gate moved: \.github\/workflows\/companygraph\.yml/);
  assert.match(said, UNGATED);
  // Real hooks in the default folder keep git from reading these as well.
  const other = temp();
  initRepository(other);
  run(["adopt", other]);
  execFileSync("git", ["config", "--unset", "core.hooksPath"], { cwd: other });
  const hooksDir = execFileSync("git", ["rev-parse", "--git-path", "hooks"], { cwd: other, encoding: "utf8" }).trim();
  fs.writeFileSync(path.join(other, hooksDir, "pre-commit"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
  assert.match(run(["upgrade", other, "--gate", "git"]), UNGATED);
});

test("upgrade --dry-run --force names the edited gate hooks --force would remove anyway", () => {
  const root = temp();
  initRepository(root);
  run(["init", root, "--here", "--name", "Acme", "--agent", "claude", "--gate", "git"]);
  fs.appendFileSync(path.join(root, ".companygraph/hooks/pre-commit"), "# mine\n");
  const said = run(["upgrade", root, "--gate", "github", "--force", "--dry-run"]);
  assert.match(said, /^ {2}remove {2}\.companygraph\/hooks\/pre-commit, edited since this tooling wrote it, which --force removes anyway$/m);
  assert.match(said, /^ {2}remove {2}\.companygraph\/hooks\/pre-merge-commit$/m);
  assert.ok(fs.existsSync(path.join(root, ".companygraph/hooks/pre-commit")));
  const adopted = temp();
  initRepository(adopted);
  run(["adopt", adopted, "--gate", "git"]);
  fs.appendFileSync(path.join(adopted, ".companygraph/hooks/pre-merge-commit"), "# mine\n");
  assert.match(run(["upgrade", adopted, "--gate", "none", "--force", "--dry-run"]), /^ {2}remove {2}\.companygraph\/hooks\/pre-merge-commit, edited since this tooling wrote it, which --force removes anyway$/m);
});

test("upgrade's help says --force also removes edited gate hooks", () => {
  assert.match(run(["--help"]), /--force[^\n]*removes edited gate hooks/);
});

test("check fails on a manifest gate that is no gate, naming it and the three, for an instance and an adopted repository", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--gate", "none"]);
  assert.equal(spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" }).status, 0);
  const manifestPath = path.join(root, ".companygraph/manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify({ ...JSON.parse(fs.readFileSync(manifestPath, "utf8")), gate: "gti" }, null, 2) + "\n");
  const result = spawnSync(process.execPath, [cli, "check", root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.companygraph\/manifest\.json: names gti as its gate, and the gates are github, git and none/);
  const adopted = temp();
  initRepository(adopted);
  run(["adopt", adopted]);
  const at = path.join(adopted, ".companygraph/manifest.json");
  fs.writeFileSync(at, JSON.stringify({ ...JSON.parse(fs.readFileSync(at, "utf8")), gate: "gti" }, null, 2) + "\n");
  const said = spawnSync(process.execPath, [cli, "check", adopted], { encoding: "utf8" });
  assert.equal(said.status, 1);
  assert.match(said.stderr, /names gti as its gate/);
});

test("the menu says Hold a repository writes what the chosen gate writes", () => {
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  assert.match(listed, /Hold a repository\s+a site or service with no model: the form check, and the workflow or hooks the chosen gate writes/);
  assert.doesNotMatch(listed, /its workflow and the seat hook/);
});
