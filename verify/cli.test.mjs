import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkInstance, IMAGE_FILE } from "../lib/checks.mjs";

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
  execFileSync("git", ["init", "-q"], { cwd: inGit });
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
  execFileSync("git", ["init", "-q"], { cwd: repo });
  const sub = path.join(repo, "sub");
  fs.mkdirSync(sub);
  const said = run(["init", sub, "--name", "Acme", "--agent", "claude"]);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: repo, encoding: "utf8" }).trim(), "sub/.companygraph/hooks");
  assert.match(said, /commit-msg hook is in use: git reads hooks from sub\/\.companygraph\/hooks/);
});

test("init leaves a hooks path already set, and says the seat hook is not in use", () => {
  const dir = temp();
  execFileSync("git", ["init", "-q"], { cwd: dir });
  execFileSync("git", ["config", "core.hooksPath", ".husky"], { cwd: dir });
  assert.match(run(["init", dir, "--name", "Acme", "--agent", "claude"]), /core\.hooksPath is \.husky here/);
  assert.equal(execFileSync("git", ["config", "core.hooksPath"], { cwd: dir, encoding: "utf8" }).trim(), ".husky");
});

test("init leaves an enclosing repository's own hooks folder alone, naming what is already there", () => {
  const dir = temp();
  execFileSync("git", ["init", "-q"], { cwd: dir });
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
  execFileSync("git", ["init", "-q"], { cwd: main });
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
  execFileSync("git", ["init", "-q"], { cwd: dir });
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
  // this keeps proving; a `--author` at the instance's own domain naming no role is what proves
  // the real CLI, reached through the hook's own `$here` resolution (also on the Windows job),
  // actually refuses.
  assert.equal(commit({ COMPANYGRAPH_CLI: cli }).status, 0);
  const identityPath = path.join(dir, "model/identity.md");
  fs.writeFileSync(identityPath, fs.readFileSync(identityPath, "utf8").replace("source: Local\n---", "source: Local\nurl: https://acme.example/\n---"));
  const refused = commit({ COMPANYGRAPH_CLI: cli }, ["--author", "Ghost <ghost@acme.example>"]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /ghost@acme\.example is at acme\.example and names no role of Acme/);
});

// The hook's other branch, taken with no COMPANYGRAPH_CLI set: `npx` at the manifest's own
// `tooling`, with no network reached. A fake `npx` first on PATH stands in for the real one and
// records what it was called with, which pins the hook's `sed` extraction of `tooling` from
// `.companygraph/manifest.json` and the exact companygraph invocation it hands npx.
test("the hook's npx branch, with COMPANYGRAPH_CLI unset, asks npx for the manifest's own tooling release",
  { skip: process.platform === "win32" && "a shebang script with no .exe/.cmd extension is not reliably resolved via PATH by Git Bash's sh here; not verifiable without a Windows runner" },
  () => {
    const dir = temp();
    execFileSync("git", ["init", "-q"], { cwd: dir });
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
    execFileSync("git", ["init", "-q"], { cwd: dir });
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

test("a command it does not know, and no command at all, print what it can do", () => {
  assert.throws(() => run(["dance"], { stdio: "pipe" }), /init/);
  assert.match(run(["--help"]), /init/);
});

test("the menu makes an instance from answers alone, and what it made passes the checks", () => {
  const root = path.join(temp(), "acme");
  const said = run(["menu"], { input: `1\n${root}\nAcme\nn\n`, stdio: "pipe" });
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

// Review fix 1: an instance made before R19's schema landed has no model/localization.md at
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
  assert.match(page, /\| en-US \| primary \|/);
  assert.doesNotThrow(() => run(["check", root]));
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
  for (const part of ["bin", "lib", "core", "agents"]) fs.cpSync(path.join(here, "..", part), path.join(dir, part), { recursive: true });
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
// package with that one schema file removed stands in for a release from before R19, which is
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

const SKILL_NAMES = ["companygraph-company", "companygraph-consent", "companygraph-export", "companygraph-profile", "companygraph-surface", "companygraph-validate"];

test("init writes the skills, hashed into the manifest like the core, and tells how to run the checks", () => {
  const root = temp();
  const said = run(["init", root, "--name", "Acme", "--agent", "claude"]);
  assert.deepEqual(fs.readdirSync(path.join(root, ".claude/skills")).sort(), SKILL_NAMES);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, ".companygraph/manifest.json"), "utf8"));
  for (const file of ["companygraph-validate/SKILL.md", "companygraph-export/build.py", "companygraph-surface/facts.py"])
    assert.equal(manifest.files[`.claude/skills/${file}`], sha256(fs.readFileSync(path.join(root, ".claude/skills", file), "utf8")));
  assert.match(said, /npx github:companygraph\/meta-model#v\d+\.\d+\.\d+ check/);
  assert.match(said, /Python 3/);
  assert.match(said, /-company and -consent/);
  const agents = fs.readFileSync(path.join(root, "AGENTS.md"), "utf8");
  assert.ok(agents.includes("`companygraph-company`"), "AGENTS.md names the company skill");
  assert.ok(agents.includes("`companygraph-consent`"), "AGENTS.md names the consent skill");
  assert.ok(fs.readFileSync(path.join(root, "AGENTS.md"), "utf8").includes("npx github:companygraph/meta-model#v<tooling> check"));
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
  git("init", "-q");
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
  execFileSync("git", ["init", "-q"], { cwd: dir });
  run(["init", dir, "--name", "Acme", "--agent", "claude"]);
  // The menu picks by number, and the report's entry is read off the menu rather than assumed.
  const listed = spawnSync(process.execPath, [cli, "menu"], { input: "", encoding: "utf8" }).stdout;
  const pick = listed.match(/(\d+)\S*\s+Report by seat/)[1];
  const out = spawnSync(process.execPath, [cli, "menu"], { input: `${pick}\n${dir}\n`, encoding: "utf8" });
  assert.match(out.stdout, /Commits by seat in /);
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
  g("init", "-q");
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
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
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
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
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
  g("init", "-q");
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
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(path.join(root, "core/skill-schema.md"), "---\nid: 01a04c85-bc20-7092-a266-845d81173e9f\n---\n\n# Skill Schema\n");
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "ids", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /core\/skill-schema\.md: `id` is "01a04c85-bc20-7092-a266-845d81173e9f"/);
});

test("translations --range refuses a change to the primary its translation did not follow, and a trailer releases it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(vision, `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(vision, fs.readFileSync(vision, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /model\/vision\.md#section\/What it means changed, and its de-CH translation did not/);
  g("commit", "-q", "--allow-empty", "-m", "third", "-m", "Translation-unchanged: model/vision.md#section/What it means", "--no-verify");
  const released = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(released.status, 0, released.stderr);
});

// `translations --range` compared `base..head` trees directly. A PR behind main sees main's own
// later, unrelated primary-only edit as part of that diff too, reversed — main has the new text
// and the PR still has the old, so the diff reads as though the PR's own head had just reverted
// it — and the `Translation-unchanged` trailer that released it lives on main's commit, which is
// never inside `base..head` (base is that very commit, so it is excluded as every range's own end
// is). The PR fails for an edit it never made. Comparing from `git merge-base base head` instead
// leaves that page out of the diff entirely, since the PR branch never touched it.
test("translations --range compares from the merge base, not the base tip, so a PR behind main is not held to main's own later edit", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(vision, `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const trunk = g("branch", "--show-current");
  // The PR forks here and never touches vision.md again.
  g("checkout", "-qb", "pr");
  const readme = path.join(root, "model/README.md");
  fs.writeFileSync(readme, `${fs.readFileSync(readme, "utf8").trimEnd()}\nUnrelated PR work.\n`);
  g("commit", "-qam", "pr work", "--no-verify");
  const prHead = g("rev-parse", "HEAD");
  // Main moves on without the PR: a primary-only edit, released by its own trailer.
  g("checkout", "-q", trunk);
  fs.writeFileSync(vision, fs.readFileSync(vision, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("commit", "-qam", "second", "-m", "Translation-unchanged: model/vision.md#section/What it means", "--no-verify");
  const mainTip = g("rev-parse", "HEAD");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${mainTip}..${prHead}`], { encoding: "utf8" });
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /✓ every change to the primary reached its translations/);
});

// Fix 11 (test only): `changedPagesOf` pairs a renamed page with its old path (git's own rename
// detection, `-M`), so a page that moved and changed in the same range is read as one entity
// changing, not as one deleted and another appearing from nowhere; the trailer that releases it
// names the entity's new path, since that is where R19 finds it from here on.
test("translations --range follows a rename, and a trailer naming the new path releases it", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(vision, `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  const renamed = path.join(root, "model/vision2.md");
  fs.renameSync(vision, renamed);
  fs.writeFileSync(renamed, fs.readFileSync(renamed, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("add", "-A"); g("commit", "-qm", "rename and reword", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /model\/vision2\.md#section\/What it means changed, and its de-CH translation did not/);
  g("commit", "-q", "--allow-empty", "-m", "release", "-m", "Translation-unchanged: model/vision2.md#section/What it means", "--no-verify");
  const released = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(released.status, 0, released.stderr);
});

test("translations --range reads Translation-unchanged trailers spread across two commits, releasing two elements", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const identity = path.join(root, "model/identity.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(identity, `${fs.readFileSync(identity, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nAcme\n\n### Statement\n\n> Ein Satz.\n\n### What it is\n\nWas es ist.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  let text = fs.readFileSync(identity, "utf8");
  text = text.replace("One paragraph saying what this company is.", "One paragraph now saying more.");
  text = text.replace("What the company does, and for whom.", "What the company does now, and for whom.");
  fs.writeFileSync(identity, text);
  g("commit", "-qam", "second", "--no-verify");
  g("commit", "-q", "--allow-empty", "-m", "release one", "-m", "Translation-unchanged: model/identity.md#statement", "--no-verify");
  g("commit", "-q", "--allow-empty", "-m", "release two", "-m", "Translation-unchanged: model/identity.md#section/What it is", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 0, said.stderr);
  assert.match(said.stdout, /✓ every change to the primary reached its translations/);
});

test("translations --range names only the stale language when one of two declared languages follows the change", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n| pl-PL | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(
    vision,
    `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n\n` +
      "## pl-PL\n\n### Name\n\nWizja\n\n### Statement\n\n> Jeden akapit.\n\n### What it means\n\nCo obowiazuje.\n",
  );
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  let text = fs.readFileSync(vision, "utf8");
  text = text.replace("What is true when it holds, and what it excludes.", "What is true when it holds.");
  text = text.replace("Co obowiazuje.", "Co teraz obowiazuje.");
  fs.writeFileSync(vision, text);
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3);
  assert.match(said.stderr, /model\/vision\.md#section\/What it means changed, and its de-CH translation did not/);
  assert.doesNotMatch(said.stderr, /pl-PL/);
});

// Review fix 5: `translations` read model/localization.md from the working tree, but the
// languages that govern a range are the range's head's, per the function's own header comment.
// A range whose head declares a language the checkout on disk does not judged by whatever
// happened to be checked out, not by the head — reachable in CI, which checks out a PR's merge
// commit, and locally, whenever a reviewer moves around history without re-running
// `git checkout <b>` first. Here de-CH is written at base already, undeclared, so the page has
// the section without yet being held to it; the head commit declares de-CH translated and
// changes the primary without touching the translation, which is R19's actual staleness. The
// working tree is then moved to base, which declares no language at all, so reading the file
// from disk would say "no translated language is declared" and let the stale translation
// through — the read from the head is what has to catch it.
test("translations --range judges by the head's declared languages, not whatever the working tree has checked out", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  fs.writeFileSync(
    vision,
    `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`,
  );
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  fs.writeFileSync(vision, fs.readFileSync(vision, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("commit", "-qam", "second", "--no-verify");
  const head = g("rev-parse", "HEAD");
  g("checkout", "-q", base);
  assert.doesNotMatch(fs.readFileSync(loc, "utf8"), /de-CH/, "the working tree is at base, which declares no de-CH");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${head}`], { encoding: "utf8" });
  assert.equal(said.status, 3, said.stdout + said.stderr);
  assert.match(said.stderr, /model\/vision\.md#section\/What it means changed, and its de-CH translation did not/);
});

// Re-review, Important: `fileAt` ran `git show <rev>:<path>` with `<path>` relative to the
// instance's own root, but git resolves a bare `rev:path` relative to the repository's top, not
// cwd — unlike a `--` pathspec, which git diff and git log resolve relative to cwd. An instance
// committed below its repository's top (here under `inst/`) had its own model/localization.md
// read as though it lived at the container's top, found nothing there, and declared no
// translated language whatever the instance's own file said — passing silently instead of
// catching the primary-only edit below.
test("translations --range reads localization.md from an instance nested below its repository's top", () => {
  const container = temp();
  const root = path.join(container, "inst");
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const vision = path.join(root, "model/vision.md");
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: container, env, encoding: "utf8" }).trim();
  fs.writeFileSync(vision, `${fs.readFileSync(vision, "utf8").trimEnd()}\n\n## de-CH\n\n### Name\n\nDie Vision\n\n### Statement\n\n> Ein Absatz.\n\n### What it means\n\nWas gilt.\n`);
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const base = g("rev-parse", "HEAD");
  fs.writeFileSync(vision, fs.readFileSync(vision, "utf8").replace("What is true when it holds, and what it excludes.", "What is true when it holds."));
  g("commit", "-qam", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", `${base}..${g("rev-parse", "HEAD")}`], { encoding: "utf8" });
  assert.equal(said.status, 3, said.stdout + said.stderr);
  assert.match(said.stderr, /inst\/model\/vision\.md#section\/What it means changed, and its de-CH translation did not/);
});

// Re-review, Important: `fileAt` caught every git error and returned null, which
// `translations` read the same as "no such file at the head" — no declared language, exit 0 —
// when the real story for a `<b>` that does not resolve at all (a typo, a rebased-away commit)
// is that the command could not run. README says translations "stays 1 where it could not run";
// this was silently exiting 0 instead. The head is confirmed to resolve before anything is read
// from it.
test("translations --range exits 1 when the head does not resolve, rather than reading no declared language", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const loc = path.join(root, "model/localization.md");
  fs.writeFileSync(loc, fs.readFileSync(loc, "utf8").replace("| en-US | primary |\n", "| en-US | primary |\n| de-CH | translated |\n"));
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  g("commit", "-q", "--allow-empty", "-m", "second", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", "HEAD~1..nosuchrev"], { encoding: "utf8" });
  assert.equal(said.status, 1, said.stdout + said.stderr);
  assert.match(said.stderr, /✗/);
  assert.doesNotMatch(said.stdout, /no translated language is declared/);
});

test("translations --range exits 1 in a folder that is not a git repository", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", "HEAD~1..HEAD"], { encoding: "utf8" });
  assert.equal(said.status, 1, said.stdout + said.stderr);
  assert.match(said.stderr, /✗/);
});

// Re-review, one more edge: only `<b>` was confirmed to resolve; `<a>` was left to mergeBaseOf,
// called after the "no translated language" short circuit. An instance with no translated
// language declared and a `<a>` that does not resolve never reached mergeBaseOf at all — it
// exited 0 on "no translated language is declared" before the bad start revision was ever
// noticed. `<a>` is now confirmed to resolve alongside `<b>`, before either is read.
test("translations --range exits 1 when the start revision does not resolve, even with no translated language declared", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  g("init", "-q"); g("add", "-A"); g("commit", "-qm", "first", "--no-verify");
  const said = spawnSync(process.execPath, [cli, "translations", root, "--range", "nosuchrev..HEAD"], { encoding: "utf8" });
  assert.equal(said.status, 1, said.stdout + said.stderr);
  assert.match(said.stderr, /✗/);
  assert.doesNotMatch(said.stdout, /no translated language is declared/);
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

// An instance that took a pack reads the pack's schemas wherever the history commands read the
// model: a bounded context's page sits in a folder only the pack's schema declares, and without
// them `commits` and `seats` met R13 on it, so the instance's own pull-request check went red.
test("commits and seats read an instance that took the software pack and wrote a bounded context", () => {
  const root = temp();
  run(["init", root, "--name", "Acme", "--agent", "claude", "--pack", "software"]);
  const env = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t.invalid" };
  const g = (...a) => execFileSync("git", a, { cwd: root, env, encoding: "utf8" }).trim();
  g("init", "-q");
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

test("the instance workflow holds the Markdown to the form with the checker it checked out", () => {
  const yml = fs.readFileSync(path.join(here, "..", ".github/workflows/instance-check.yml"), "utf8");
  assert.match(yml, /run: node \.companygraph-checker\/bin\/companygraph\.mjs form \.$/m);
});
